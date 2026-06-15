#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { psqlJson, toCsv } from "../lib/qa-utils.mjs";

const ROOT = process.cwd();
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const releaseOverride = args.get("release");
const date = args.get("date") ?? new Date().toISOString().slice(0, 10).replace(/-/g, "");
const contractPath = path.resolve(args.get("contract") ?? "config/spanish-a1-core-release-contract-v1.json");
const languageOrderPath = path.resolve(args.get("languages") ?? "config/language-order.json");
const candidatePoolOverride = args.get("candidate-pool");
const outputDir = path.resolve(args.get("out-dir") ?? "outputs/spanish-a1-core/support-generation");

function normalizeForKey(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeSpanishForKey(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(el|la|los|las|un|una|unos|unas)\s+/u, "");
}

function addIfUseful(set, value) {
  const key = normalizeForKey(value);
  if (key) set.add(key);
}

function splitOrAliases(value) {
  const text = String(value ?? "");
  return text
    .split(/\s+or\s+|,\s*/iu)
    .map((part) => part.trim())
    .filter(Boolean);
}

function englishKeysForCandidate(row) {
  const keys = new Set();
  addIfUseful(keys, row.meaning_note);
  for (const alias of splitOrAliases(row.meaning_note)) addIfUseful(keys, alias);
  return keys;
}

function englishKeysForMeaning(row) {
  const keys = new Set();
  addIfUseful(keys, row.canonical_english);
  addIfUseful(keys, row.english_with_article);
  addIfUseful(keys, row.canonical_meaning);
  addIfUseful(keys, row.meaning_note);
  for (const alias of splitOrAliases(row.canonical_english)) addIfUseful(keys, alias);
  for (const alias of splitOrAliases(row.english_with_article)) addIfUseful(keys, alias);
  return keys;
}

function posCompatible(candidatePos, meaningPos) {
  const a = normalizeForKey(candidatePos);
  const b = normalizeForKey(meaningPos);
  if (!a || !b) return true;
  if (a === b) return true;
  const groups = [
    new Set(["interjection", "particle", "phrase"]),
    new Set(["numeral", "ordinal", "number"]),
    new Set(["determiner", "pronoun"]),
  ];
  return groups.some((group) => group.has(a) && group.has(b));
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${path.relative(ROOT, filePath)}:${index + 1}: ${error.message}`);
      }
    });
}

function chooseAutoMatch(row, matches) {
  const compatible = matches.filter((match) => posCompatible(row.part_of_speech, match.part_of_speech));
  const uniqueIds = [...new Set(compatible.map((match) => match.meaning_id))];
  if (uniqueIds.length === 1) {
    return { status: "auto_exact_english", match: compatible.find((match) => match.meaning_id === uniqueIds[0]) };
  }
  if (uniqueIds.length > 1) return { status: "ambiguous_exact_english", match: null };
  return { status: "no_exact_english_match", match: null };
}

function displayForEntry(entry) {
  return entry?.word_with_article_or_marker || entry?.native_word || "";
}

function buildSupportDraft(row, match, supportLanguages) {
  const entriesByLanguage = new Map((match.entries ?? []).map((entry) => [entry.language_code, entry]));
  return supportLanguages.map((language) => {
    const entry = entriesByLanguage.get(language.dbCode);
    return {
      release_id: row.release_id,
      row_id: row.row_id,
      spanish_item_id: row.spanish_item_id,
      meaning_id: row.meaning_id,
      language_code: language.spreadsheetCode,
      db_language_code: language.dbCode,
      display: displayForEntry(entry),
      support_translation_status: entry ? "draft_from_exact_ordinary_db_meaning_match" : "missing_in_translation_memory",
      generation_source: entry ? `ordinary_db:${match.meaning_id}` : "translation_memory_gap",
      qa_notes: entry
        ? `Exact English/POS reuse candidate from ${match.meaning_id}; support example still requires Spanish A1 scene-specific generation.`
        : "No translation-memory entry for this language.",
    };
  });
}

await fs.mkdir(outputDir, { recursive: true });

const [contract, languageOrder] = await Promise.all([
  readJson(contractPath),
  readJson(languageOrderPath),
]);

if (!String(contract.contract_id ?? "").startsWith("spanish_a1_core_release_contract_v1")) {
  throw new Error(`Unexpected contract_id: ${contract.contract_id}`);
}

const releaseId = releaseOverride ?? contract.default_release.release_id;
const candidatePoolPath = path.resolve(
  candidatePoolOverride ?? `outputs/spanish-a1-core/candidate-pools/${releaseId}_candidate_pool.jsonl`
);
const candidateRows = await readJsonl(candidatePoolPath);

const selectedRows = candidateRows
  .filter((row) => row.selection_decision === "selected")
  .sort((a, b) => Number(a.selection_order) - Number(b.selection_order));
const expectedRows = Number(contract.default_release.expected_row_count);
if (selectedRows.length !== expectedRows) {
  throw new Error(`Expected ${expectedRows} selected rows, got ${selectedRows.length}.`);
}

const allLanguageCodes = languageOrder.map((language) => language.spreadsheetCode);
const sourceLanguageCodes = new Set(["ES", "ES-419"]);
const supportLanguages = languageOrder.filter((language) => !sourceLanguageCodes.has(language.spreadsheetCode));
if (supportLanguages.length !== 52) {
  throw new Error(`Expected 52 support language codes after excluding ES/ES-419, got ${supportLanguages.length}.`);
}

const dbRows = await psqlJson(`
with entry_rows as (
  select
    le.meaning_id,
    jsonb_agg(
      jsonb_build_object(
        'language_code', le.language_code,
        'native_word', le.native_word,
        'word_with_article_or_marker', le.word_with_article_or_marker,
        'transcription', le.transcription,
        'quality_status', le.quality_status,
        'source_note', le.source_note
      )
      order by le.language_code
    ) as entries
  from meaning_language_entries le
  group by le.meaning_id
),
example_rows as (
  select
    e.meaning_id,
    jsonb_agg(
      jsonb_build_object(
        'example_id', e.example_id,
        'set_id', e.set_id,
        'canonical_example_en', e.canonical_example_en,
        'semantic_scene', e.semantic_scene,
        'quality_status', e.quality_status
      )
      order by e.set_id, e.example_id
    ) as examples
  from meaning_examples e
  group by e.meaning_id
)
select coalesce(jsonb_agg(
  jsonb_build_object(
    'meaning_id', mu.meaning_id,
    'canonical_english', mu.canonical_english,
    'english_with_article', mu.english_with_article,
    'canonical_meaning', mu.canonical_meaning,
    'part_of_speech', mu.part_of_speech,
    'meaning_note', mu.meaning_note,
    'level', mu.level,
    'entries', coalesce(er.entries, '[]'::jsonb),
    'examples', coalesce(ex.examples, '[]'::jsonb)
  )
  order by mu.meaning_id
), '[]'::jsonb)
from meaning_units mu
join entry_rows er on er.meaning_id = mu.meaning_id
left join example_rows ex on ex.meaning_id = mu.meaning_id;
`, 1024 * 1024 * 80);

const dbMeanings = Array.isArray(dbRows) ? dbRows : [];
const englishIndex = new Map();
const spanishIndex = new Map();
for (const meaning of dbMeanings) {
  for (const key of englishKeysForMeaning(meaning)) {
    if (!englishIndex.has(key)) englishIndex.set(key, []);
    englishIndex.get(key).push(meaning);
  }
  for (const entry of meaning.entries ?? []) {
    if (entry.language_code !== "ES" && entry.language_code !== "ES-419") continue;
    const key = normalizeSpanishForKey(displayForEntry(entry));
    if (!key) continue;
    if (!spanishIndex.has(key)) spanishIndex.set(key, []);
    spanishIndex.get(key).push(meaning);
  }
}

const rowReports = [];
const supportDraftRows = [];
for (const row of selectedRows) {
  const candidateKeys = [...englishKeysForCandidate(row)];
  const exactMatches = candidateKeys.flatMap((key) => englishIndex.get(key) ?? []);
  const dedupedMatches = [...new Map(exactMatches.map((match) => [match.meaning_id, match])).values()];
  const auto = chooseAutoMatch(row, dedupedMatches);
  const spanishKey = normalizeSpanishForKey(row.display_ES);
  const spanishMatches = spanishKey ? [...new Map((spanishIndex.get(spanishKey) ?? []).map((match) => [match.meaning_id, match])).values()] : [];
  const matchedLanguageCount =
    auto.match?.entries?.filter(
      (entry) => supportLanguages.some((language) => language.dbCode === entry.language_code) && displayForEntry(entry)
    ).length ?? 0;
  const matchedExampleCount = auto.match?.examples?.length ?? 0;
  const missingLanguages =
    auto.match && matchedLanguageCount < supportLanguages.length
      ? supportLanguages
          .filter(
            (language) =>
              !(auto.match.entries ?? []).some((entry) => entry.language_code === language.dbCode && displayForEntry(entry))
          )
          .map((language) => language.spreadsheetCode)
      : [];

  if (auto.match) {
    supportDraftRows.push(...buildSupportDraft(row, auto.match, supportLanguages));
  }

  rowReports.push({
    selection_order: row.selection_order,
    row_id: row.row_id,
    spanish_item_id: row.spanish_item_id,
    spanish_display: row.display_ES,
    part_of_speech: row.part_of_speech,
    meaning_note: row.meaning_note,
    semantic_scene: row.semantic_scene,
    candidate_english_keys: candidateKeys,
    match_status: auto.status,
    matched_meaning_id: auto.match?.meaning_id ?? "",
    matched_canonical_english: auto.match?.canonical_english ?? "",
    matched_part_of_speech: auto.match?.part_of_speech ?? "",
    matched_language_count: matchedLanguageCount,
    matched_example_count: matchedExampleCount,
    reuse_display_safe: auto.status === "auto_exact_english" && matchedLanguageCount === supportLanguages.length,
    reuse_example_safe: false,
    example_policy: "Do not copy ordinary-deck examples unless a later scene-specific review proves semantic_scene equivalence.",
    spanish_exact_candidate_count: spanishMatches.length,
    spanish_exact_candidate_meaning_ids: spanishMatches.map((match) => match.meaning_id).slice(0, 10),
    missing_languages: missingLanguages,
  });
}

const autoRows = rowReports.filter((row) => row.match_status === "auto_exact_english");
const fullDisplayRows = rowReports.filter((row) => row.reuse_display_safe);
const ambiguousRows = rowReports.filter((row) => row.match_status === "ambiguous_exact_english");
const unmatchedRows = rowReports.filter((row) => row.match_status === "no_exact_english_match");
const spanishCandidateRows = rowReports.filter((row) => row.spanish_exact_candidate_count > 0);

const summary = {
  release_id: releaseId,
  status: "reuse_map_ready_not_final_generation",
  checked_at: date,
  source: "ordinary_db_read_only_translation_memory",
  db_meanings_with_entries: dbMeanings.length,
  rows: selectedRows.length,
  support_language_count: supportLanguages.length,
  auto_exact_english_rows: autoRows.length,
  full_display_reuse_rows: fullDisplayRows.length,
  ambiguous_exact_english_rows: ambiguousRows.length,
  no_exact_english_match_rows: unmatchedRows.length,
  spanish_exact_candidate_rows: spanishCandidateRows.length,
  display_cells_available_from_exact_reuse: autoRows.reduce((sum, row) => sum + Number(row.matched_language_count ?? 0), 0),
  display_cells_expected: selectedRows.length * supportLanguages.length,
  example_cells_safe_to_reuse: 0,
  example_cells_expected: selectedRows.length * supportLanguages.length,
  final_delivery_ready: false,
  notes: [
    "This report is read-only against ordinary deck tables.",
    "Exact English/POS matches can draft support display translations.",
    "Support examples are not auto-reused because Spanish A1 examples have their own source scenes.",
  ],
};

const jsonPath = path.join(outputDir, `${releaseId}_support_reuse_map_${date}.json`);
const csvPath = path.join(outputDir, `${releaseId}_support_reuse_map_${date}.csv`);
const draftJsonlPath = path.join(outputDir, `${releaseId}_support_display_draft_from_reuse_${date}.jsonl`);
const mdPath = path.join(outputDir, `${releaseId}_support_reuse_map_${date}.md`);

await fs.writeFile(
  jsonPath,
  `${JSON.stringify({ summary, rows: rowReports }, null, 2)}\n`,
  "utf8"
);
await fs.writeFile(
  csvPath,
  `${toCsv(
    rowReports.map((row) => ({
      ...row,
      candidate_english_keys: row.candidate_english_keys.join("; "),
      spanish_exact_candidate_meaning_ids: row.spanish_exact_candidate_meaning_ids.join("; "),
      missing_languages: row.missing_languages.join("; "),
    })),
    [
      "selection_order",
      "row_id",
      "spanish_display",
      "part_of_speech",
      "meaning_note",
      "semantic_scene",
      "match_status",
      "matched_meaning_id",
      "matched_canonical_english",
      "matched_part_of_speech",
      "matched_language_count",
      "matched_example_count",
      "reuse_display_safe",
      "reuse_example_safe",
      "spanish_exact_candidate_count",
      "spanish_exact_candidate_meaning_ids",
      "missing_languages",
    ]
  )}\n`,
  "utf8"
);
await fs.writeFile(
  draftJsonlPath,
  supportDraftRows.map((row) => JSON.stringify(row)).join("\n") + (supportDraftRows.length ? "\n" : ""),
  "utf8"
);
await fs.writeFile(
  mdPath,
  [
    `# Spanish A1 Support Reuse Map`,
    ``,
    `Release: \`${releaseId}\``,
    ``,
    `Status: \`${summary.status}\``,
    ``,
    `Read-only source: ordinary deck translation memory tables.`,
    ``,
    `## Summary`,
    ``,
    `- Rows: ${summary.rows}`,
    `- Support languages: ${summary.support_language_count}`,
    `- Auto exact English/POS rows: ${summary.auto_exact_english_rows}`,
    `- Full display reuse rows: ${summary.full_display_reuse_rows}`,
    `- Display cells available from exact reuse: ${summary.display_cells_available_from_exact_reuse}/${summary.display_cells_expected}`,
    `- Safe example reuse cells: ${summary.example_cells_safe_to_reuse}/${summary.example_cells_expected}`,
    `- Ambiguous exact English rows: ${summary.ambiguous_exact_english_rows}`,
    `- No exact English match rows: ${summary.no_exact_english_match_rows}`,
    `- Spanish exact candidate rows: ${summary.spanish_exact_candidate_rows}`,
    ``,
    `## Policy`,
    ``,
    `Exact English/POS matches may draft support display translations. Ordinary-deck target examples are not copied because the Spanish A1 source examples have their own scenes. Missing or ambiguous rows require structured/local generation or explicit reviewed repair.`,
    ``,
    `## Artifacts`,
    ``,
    `- JSON: \`${path.relative(ROOT, jsonPath)}\``,
    `- CSV: \`${path.relative(ROOT, csvPath)}\``,
    `- Display draft JSONL: \`${path.relative(ROOT, draftJsonlPath)}\``,
    ``,
  ].join("\n"),
  "utf8"
);

console.log(JSON.stringify({ summary, artifacts: { jsonPath, csvPath, draftJsonlPath, mdPath } }, null, 2));
