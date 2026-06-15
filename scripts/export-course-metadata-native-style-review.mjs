#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { languageOrderRecords } from "./lib/language-order.mjs";
import { assertSafeSetId, psqlJson, sqlLiteralList, sqlString } from "./lib/qa-utils.mjs";

const args = process.argv.slice(2);

function usage() {
  return [
    "Usage:",
    "  node scripts/export-course-metadata-native-style-review.mjs <set_id> [<set_id> ...] [--languages=all|codes] [--out=path] [--gemini-model=model]",
    "  node scripts/export-course-metadata-native-style-review.mjs --current-final [--languages=all|codes] [--out=path] [--gemini-model=model]",
    "",
    "Writes a Gemini/native-style review JSONL pack for Course Metadata Title, Description, Module and Category.",
    "The pack is review input only; live AI results must be validated/imported through the normal repair/QA/export/readback loop.",
  ].join("\n");
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(usage());
  process.exit(0);
}

const currentFinal = args.includes("--current-final");
const setIdArgs = args.filter((arg) => !arg.startsWith("--"));
const languageArg = args.find((arg) => arg.startsWith("--languages="))?.split("=")[1] ?? "all";
const outputArg = args.find((arg) => arg.startsWith("--out="))?.split("=")[1] ?? "";
const geminiModel =
  args.find((arg) => arg.startsWith("--gemini-model="))?.split("=")[1] ?? "gemini-3.1-pro-preview";

const languageByAnyCode = new Map();
for (const record of languageOrderRecords) {
  languageByAnyCode.set(record.dbCode, record);
  languageByAnyCode.set(record.spreadsheetCode, record);
}

function timestampId() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function resolveLanguageCodes(value) {
  if (value === "all") return languageOrderRecords.map((record) => record.dbCode);
  const resolved = [];
  for (const rawCode of value.split(",").map((code) => code.trim()).filter(Boolean)) {
    const record = languageByAnyCode.get(rawCode);
    if (!record) throw new Error(`Unknown active language code: ${rawCode}`);
    if (!resolved.includes(record.dbCode)) resolved.push(record.dbCode);
  }
  if (resolved.length === 0) throw new Error("At least one language code is required.");
  return resolved;
}

async function currentFinalSetIds() {
  const dir = path.resolve("outputs/google-sheets");
  const files = await readdir(dir);
  const ids = [];
  for (const file of files) {
    if (!file.endsWith("_final_delivery.json")) continue;
    const manifest = JSON.parse(await readFile(path.join(dir, file), "utf8"));
    if (manifest.set_id && !ids.includes(manifest.set_id)) ids.push(manifest.set_id);
  }
  ids.sort();
  return ids;
}

if (!currentFinal && setIdArgs.length === 0) {
  throw new Error(usage());
}

const setIds = currentFinal ? await currentFinalSetIds() : setIdArgs;
for (const setId of setIds) assertSafeSetId(setId);
const languageCodes = resolveLanguageCodes(languageArg);
const languageRecordsByDbCode = new Map(languageOrderRecords.map((record) => [record.dbCode, record]));
const timestamp = timestampId();
const batchId = `course_metadata_native_style_${timestamp}`;
const outputPath =
  outputArg ||
  path.resolve("outputs/qa", `course_metadata_native_style_pack_${timestamp}.jsonl`);

const sql = `
select coalesce(json_agg(row_to_json(rows) order by set_id, language_code), '[]'::json)
from (
  select
    null::integer as sort,
    cs.set_id,
    cs.set_name,
    cs.domain,
    cs.area,
    cs.category,
    cs.situation,
    cs.level_label,
    cs.level_min,
    cs.level_max,
    null::integer as language_order,
    l.code as language_code,
    l.spreadsheet_code,
    l.name_en as language_name,
    csl.title,
    csl.description,
    csl.module,
    csl.category as metadata_category,
    csl.level_signal
  from content_sets cs
  join content_set_localizations csl on csl.set_id = cs.set_id
  join languages l on l.code = csl.language_code and l.is_active
  where cs.set_id in (${sqlLiteralList(setIds)})
    and l.code in (${sqlLiteralList(languageCodes)})
  order by cs.set_id, l.code
) rows;
`;

const languageOrderIndex = new Map(languageOrderRecords.map((record, index) => [record.dbCode, index]));
const setOrderIndex = new Map(setIds.map((setId, index) => [setId, index]));
const rows = (await psqlJson(sql)).sort((left, right) => {
  const setDelta = (setOrderIndex.get(left.set_id) ?? 0) - (setOrderIndex.get(right.set_id) ?? 0);
  if (setDelta !== 0) return setDelta;
  return (languageOrderIndex.get(left.language_code) ?? 0) - (languageOrderIndex.get(right.language_code) ?? 0);
});
const expectedRows = setIds.length * languageCodes.length;
if (rows.length !== expectedRows) {
  throw new Error(`Expected ${expectedRows} Course Metadata rows, got ${rows.length}`);
}

function promptForRow(row, index) {
  const languageRecord = languageRecordsByDbCode.get(row.language_code);
  const reviewKey = `${row.set_id}::course_metadata::${row.language_code}`;
  const targetHash = sha256(
    JSON.stringify({
      set_id: row.set_id,
      language_code: row.language_code,
      title: row.title,
      description: row.description,
      module: row.module,
      category: row.metadata_category,
      level_signal: row.level_signal,
    })
  );
  const payload = {
    task: "Review localized Course Metadata for native-style short mobile labels.",
    set_id: row.set_id,
    sort: row.sort,
    deck_name_en: row.set_name,
    deck_context: {
      domain: row.domain,
      area: row.area,
      category: row.category,
      situation: row.situation,
      level_label: row.level_label,
      level_min: row.level_min,
      level_max: row.level_max,
    },
    language: {
      db_code: row.language_code,
      spreadsheet_code: row.spreadsheet_code,
      name: row.language_name,
      transcription_format: languageRecord?.transcriptionFormat ?? "",
    },
    metadata: {
      title: row.title,
      description: row.description,
      module: row.module,
      category: row.metadata_category,
      level_signal: row.level_signal,
    },
    checks: [
      "Title must sound natural as a short course/deck title in this language.",
      "Description must be short, natural, and must include the level signal as a separate sentence.",
      "Module must be a natural broad mobile-app label for the domain.",
      "Category must be a natural short label for this deck/category, not a literal calque or wrong singular/plural.",
      "For category nouns, choose natural singular/plural/category form for the language and UI context.",
      "Do not require word-for-word matching to English if a natural local UI label differs.",
      "Fail if a field is clearly awkward, wrong scope, wrong number/plural, English fallback, or not native-sounding.",
      "Use needs_review if more context or a native speaker is needed.",
    ],
    target_hash: targetHash,
  };
  return [
    "You are a strict native-style QA reviewer for LunaCards Course Metadata.",
    "Return exactly one valid JSON object. Do not return markdown.",
    "If uncertain, use needs_review, not pass.",
    "This is not translation truth and not native approval; it is a second AI review layer for short metadata labels.",
    "",
    "Return this JSON shape:",
    JSON.stringify(
      {
        review_key: reviewKey,
        set_id: row.set_id,
        language_code: row.language_code,
        result: "pass | needs_review | fail",
        result_summary: "short concrete explanation",
        issues: ["array of issue labels"],
        suggested_repair: {
          title: "same current value or corrected title",
          description: "same current value or corrected description",
          module: "same current value or corrected module",
          category: "same current value or corrected category",
          level_signal: "same current value or corrected level signal",
        },
        confidence: "number from 0 to 1",
        target_hash: targetHash,
      },
      null,
      2
    ),
    "",
    "Review payload:",
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

const packRows = rows.map((row, index) => {
  const reviewKey = `${row.set_id}::course_metadata::${row.language_code}`;
  return {
    provider: "gemini-tools",
    tool: "mcp__gemini_tools__.gemini_extract_json",
    model: geminiModel,
    model_tier: "quality",
    dry_run_required_before_live_call: true,
    max_output_tokens: 1400,
    schema_description:
      "One JSON object with review_key, set_id, language_code, result, result_summary, issues, suggested_repair, confidence and target_hash.",
    review_key: reviewKey,
    set_id: row.set_id,
    sort: row.sort,
    language_code: row.language_code,
    spreadsheet_code: row.spreadsheet_code,
    target_hash: sha256(
      JSON.stringify({
        set_id: row.set_id,
        language_code: row.language_code,
        title: row.title,
        description: row.description,
        module: row.module,
        category: row.metadata_category,
        level_signal: row.level_signal,
      })
    ),
    row_index: index + 1,
    prompt: promptForRow(row, index),
  };
});

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, packRows.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");

console.log(outputPath);
console.log(
  `Course Metadata native-style review pack rows: ${packRows.length}; sets=${setIds.length}; languages=${languageCodes.length}; model=${geminiModel}`
);
