#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readdirSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import { loadDeckPlanningState } from "./lib/deck-spec-utils.mjs";
import { languageOrderRecords } from "./lib/language-order.mjs";
import {
  buildEntrySourceBackedTranslationFindings,
  allEntrySourceBackedTranslationLanguageCodes,
} from "./lib/entry-source-backed-translations.mjs";
import {
  buildTranslationSourceCoverageFindings,
} from "./lib/translation-source-coverage.mjs";
import {
  buildTranscriptionSourceBackingFindings,
} from "./lib/source-backed-transcriptions.mjs";
import { loadReferenceSourcesManifest } from "./lib/transcription-source-policy.mjs";
import {
  autoConfirmationRowKey,
  buildCurrentAutoConfirmationMap,
  loadAutoSourceConfirmations,
} from "./lib/forced-review-auto-confirmations.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const args = process.argv.slice(2);
const explicitSetIds = args.filter((arg) => !arg.startsWith("--"));
const currentGenerated = args.includes("--current-generated");
const includeAllSourcePartial = args.includes("--include-all-source-partial");
const outArg = args.find((arg) => arg.startsWith("--out="))?.slice("--out=".length);

if (!currentGenerated && explicitSetIds.length === 0) {
  throw new Error(
    "Usage: node scripts/export-forced-review-queue.mjs <set_id> [<set_id> ...] [--include-all-source-partial] [--out=path]\n" +
      "   or: node scripts/export-forced-review-queue.mjs --current-generated [--include-all-source-partial] [--out=path]"
  );
}

const weakSourceLanguages = new Set([
  "KO",
  "VI",
  "TH",
  "MS",
  "SK",
  "SL",
  "LV",
  "ET",
  "IS",
  "BN",
  "TL",
  "MY",
  "KM",
  "LO",
  "NE",
  "SI",
  "TA",
  "TE",
  "KN",
  "ML",
  "UZ",
  "KK",
  "AZ",
  "KA",
  "HY",
]);

function relativePath(filePath) {
  return path.relative(projectRoot, path.resolve(filePath));
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/u.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function csvRows(rows, headers) {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n") + "\n";
}

function listJsonFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(dir, file))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

async function sha256File(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function resolveCurrentGeneratedSetIds() {
  return psqlJson(`
select coalesce(json_agg(set_id order by created_at, set_id), '[]'::json)
from (
  select cs.set_id, min(cs.created_at) as created_at
  from content_sets cs
  join meaning_set_memberships msm on msm.set_id = cs.set_id
  where msm.quality_status <> 'blocked'
  group by cs.set_id
) current_sets;
`);
}

function latestRunManifestPath(setId) {
  const dir = path.join(projectRoot, "outputs", "runs", setId);
  const files = listJsonFiles(dir);
  return files[0] ?? null;
}

async function latestSampleAuditRows(setIds) {
  const wanted = new Set(setIds);
  const rows = [];
  for (const file of listJsonFiles(path.join(projectRoot, "outputs", "qa"))) {
    if (!path.basename(file).startsWith("sample_card_quality_audit_")) continue;
    const report = await readJson(file);
    if (!Array.isArray(report.set_ids) || !report.set_ids.some((setId) => wanted.has(setId))) continue;
    for (const issue of [...(report.blockers ?? []), ...(report.warnings ?? [])]) {
      if (!wanted.has(issue.set_id)) continue;
      rows.push({
        set_id: issue.set_id,
        meaning_id: issue.meaning_id,
        language_code: issue.language_code,
        reason_code: issue.blocker_type ?? issue.warning_type ?? "sample_audit_issue",
        review_focus: String(issue.blocker_type ?? issue.warning_type ?? "").includes("transcription")
          ? "transcription"
          : String(issue.blocker_type ?? issue.warning_type ?? "").includes("example")
            ? "example"
            : "translation",
        priority: issue.blocker_type ? "P0" : "P1",
        reason: issue.reason ?? "",
        source_report: relativePath(file),
      });
    }
    break;
  }
  return rows;
}

const setIds = currentGenerated ? await resolveCurrentGeneratedSetIds() : explicitSetIds;
for (const setId of setIds) assertSafeSetId(setId);
if (setIds.length === 0) throw new Error("No content sets matched the forced-review request.");

const planningState = loadDeckPlanningState();
const specBySetId = new Map(planningState.specIdentities.map((spec) => [spec.setId, spec]));
const languageNameByCode = new Map(languageOrderRecords.map((record) => [record.dbCode, record.language]));

const rows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
    cs.set_name,
    msm.display_order,
    mu.meaning_id,
    mu.canonical_english,
    mu.meaning_note,
    mu.part_of_speech,
    mu.level,
    e.example_id,
    e.canonical_example_en,
    e.semantic_scene,
    le.language_code,
    le.native_word,
    le.word_with_article_or_marker,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    le.transcription,
    le.romanization_system,
    le.quality_status as entry_quality_status,
    le.pronunciation_status,
    et.example_text,
    et.quality_status as example_translation_quality_status
  from meaning_set_memberships msm
  join content_sets cs on cs.set_id = msm.set_id
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_examples e
    on e.set_id = msm.set_id
   and e.meaning_id = msm.meaning_id
   and e.example_role = 'context'
  join meaning_language_entries le on le.meaning_id = msm.meaning_id
  join languages l on l.code = le.language_code and l.is_active
  join meaning_example_translations et
    on et.example_id = e.example_id
   and et.language_code = le.language_code
  where msm.set_id in (${sqlLiteralList(setIds)})
    and msm.quality_status <> 'blocked'
  order by msm.set_id, msm.display_order, le.language_code
) rows;
`, 1024 * 1024 * 80);

const rowByKey = new Map(rows.map((row) => [`${row.set_id}::${row.meaning_id}::${row.language_code}`, row]));
const referenceManifest = await loadReferenceSourcesManifest();
const manifestSourceIds = new Set((referenceManifest.sources ?? []).map((source) => source.id));
const sourceManifestSha256 = await sha256File(path.join(projectRoot, "reference-sources", "sources.manifest.json"));
const autoConfirmations = await loadAutoSourceConfirmations();
const { validByKey: autoConfirmationByKey, stale: staleAutoConfirmations } = buildCurrentAutoConfirmationMap(
  autoConfirmations,
  rows,
  manifestSourceIds
);

const entryFindings = await buildEntrySourceBackedTranslationFindings(rows, {
  manifestSourceIds,
  enforcedLanguageCodes: allEntrySourceBackedTranslationLanguageCodes,
});
const translationCoverage = await buildTranslationSourceCoverageFindings(rows, { manifestSourceIds });
const transcriptionBacking = await buildTranscriptionSourceBackingFindings(rows, { manifestSourceIds });
const sampleIssues = await latestSampleAuditRows(setIds);

const queueByKey = new Map();
let autoConfirmedSourcePartialSkipped = 0;

function addQueueItem(item) {
  const key = `${item.set_id}::${item.meaning_id}::${item.language_code}::${item.review_focus}::${item.reason_code}`;
  if (queueByKey.has(key)) return;
  const row = rowByKey.get(`${item.set_id}::${item.meaning_id}::${item.language_code}`) ?? {};
  const spec = specBySetId.get(item.set_id);
  queueByKey.set(key, {
    priority: item.priority,
    review_focus: item.review_focus,
    reason_code: item.reason_code,
    reason: item.reason,
    set_id: item.set_id,
    sort: spec?.sort ?? "",
    deck_name: row.set_name ?? spec?.deck ?? item.set_id,
    display_order: row.display_order ?? "",
    meaning_id: item.meaning_id,
    canonical_english: row.canonical_english ?? "",
    meaning_note: row.meaning_note ?? "",
    language_code: item.language_code,
    language: languageNameByCode.get(item.language_code) ?? "",
    display_word: row.display_word ?? "",
    native_word: row.native_word ?? "",
    transcription: row.transcription ?? "",
    example_en: row.canonical_example_en ?? "",
    example_text: row.example_text ?? "",
    source_status: item.source_status ?? "",
    transcription_confidence: item.transcription_confidence ?? "",
    source_report: item.source_report ?? "",
    suggested_action: item.suggested_action ?? "native/source review current value; repair only confirmed rows",
  });
}

for (const blocker of entryFindings.blockers) {
  addQueueItem({
    priority: "P0",
    review_focus: "translation",
    reason_code: "entry_source_backed_translation_blocker",
    reason: blocker.reason,
    set_id: blocker.set_id,
    meaning_id: blocker.meaning_id,
    language_code: blocker.language_code,
    source_status: "conflict",
  });
}
for (const warning of entryFindings.warnings) {
  addQueueItem({
    priority: "P1",
    review_focus: "translation",
    reason_code: "entry_source_backed_translation_warning",
    reason: warning.reason,
    set_id: warning.set_id,
    meaning_id: warning.meaning_id,
    language_code: warning.language_code,
    source_status: "warning",
  });
}

for (const coverage of translationCoverage.rows) {
  const isEnglish = coverage.language_code === "EN" || coverage.language_code === "EN-GB";
  if (isEnglish) continue;
  if (coverage.status === "conflict" || coverage.status === "stale_decision" || coverage.status === "source_mismatch") {
    addQueueItem({
      priority: "P0",
      review_focus: "translation",
      reason_code: `translation_source_${coverage.status}`,
      reason: coverage.reason,
      set_id: coverage.set_id,
      meaning_id: coverage.meaning_id,
      language_code: coverage.language_code,
      source_status: coverage.status,
    });
    continue;
  }
  const weakLanguage = weakSourceLanguages.has(coverage.language_code);
  const shouldQueueSourcePartial = includeAllSourcePartial
    ? coverage.status === "source_partial"
    : weakLanguage && coverage.status === "source_partial";
  if (coverage.status === "no_source" || shouldQueueSourcePartial) {
    const currentRow = rowByKey.get(`${coverage.set_id}::${coverage.meaning_id}::${coverage.language_code}`);
    if (coverage.status === "source_partial" && currentRow && autoConfirmationByKey.has(autoConfirmationRowKey(currentRow))) {
      autoConfirmedSourcePartialSkipped += 1;
      continue;
    }
    addQueueItem({
      priority: coverage.status === "no_source" ? "P1" : weakLanguage ? "P2" : "P3",
      review_focus: "translation",
      reason_code: coverage.status === "no_source" ? "translation_no_source" : "weak_language_source_partial",
      reason: coverage.reason,
      set_id: coverage.set_id,
      meaning_id: coverage.meaning_id,
      language_code: coverage.language_code,
      source_status: coverage.status,
    });
  }
}

for (const blocker of transcriptionBacking.blockers) {
  addQueueItem({
    priority: "P0",
    review_focus: "transcription",
    reason_code: `transcription_${blocker.confidence}`,
    reason: (blocker.issues ?? []).map((issue) => `${issue.code}: ${issue.detail}`).join("; ") || "transcription source backing is not final-ready",
    set_id: blocker.set_id,
    meaning_id: blocker.meaning_id,
    language_code: blocker.language_code,
    transcription_confidence: blocker.confidence,
  });
}

for (const sampleIssue of sampleIssues) addQueueItem(sampleIssue);

const queue = [...queueByKey.values()].sort((left, right) => {
  const priority = left.priority.localeCompare(right.priority);
  if (priority) return priority;
  const setCmp = String(left.sort).localeCompare(String(right.sort), undefined, { numeric: true });
  if (setCmp) return setCmp;
  const orderCmp = Number(left.display_order || 0) - Number(right.display_order || 0);
  if (orderCmp) return orderCmp;
  return left.language_code.localeCompare(right.language_code);
});

const byPriority = {};
const byLanguage = {};
const byDeck = {};
const byReason = {};
for (const item of queue) {
  byPriority[item.priority] = (byPriority[item.priority] ?? 0) + 1;
  byLanguage[item.language_code] = (byLanguage[item.language_code] ?? 0) + 1;
  byDeck[item.set_id] = (byDeck[item.set_id] ?? 0) + 1;
  byReason[item.reason_code] = (byReason[item.reason_code] ?? 0) + 1;
}

const baseOutPath = path.resolve(
  outArg ?? `outputs/review/forced_review_queue_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.jsonl`
);
await mkdir(path.dirname(baseOutPath), { recursive: true });
await writeFile(baseOutPath, queue.map((item) => JSON.stringify(item)).join("\n") + (queue.length ? "\n" : ""), "utf8");

const csvPath = baseOutPath.replace(/\.jsonl$/u, ".csv");
const headers = [
  "priority",
  "review_focus",
  "reason_code",
  "reason",
  "sort",
  "deck_name",
  "set_id",
  "display_order",
  "meaning_id",
  "canonical_english",
  "meaning_note",
  "language_code",
  "language",
  "display_word",
  "native_word",
  "transcription",
  "example_en",
  "example_text",
  "source_status",
  "transcription_confidence",
  "suggested_action",
];
await writeFile(csvPath, csvRows(queue, headers), "utf8");

const summaryPath = baseOutPath.replace(/\.jsonl$/u, "_summary.md");
const runManifests = {};
for (const setId of setIds) {
  const manifestPath = latestRunManifestPath(setId);
  runManifests[setId] = manifestPath ? relativePath(manifestPath) : null;
}
await writeFile(
  summaryPath,
  [
    "# Forced Review Queue",
    "",
    `Generated at: ${new Date().toISOString()}`,
    `Set ids: ${setIds.map((setId) => `\`${setId}\``).join(", ")}`,
    `Rows in queue: ${queue.length}`,
    `Source manifest sha256: \`${sourceManifestSha256}\``,
    `Auto-confirmed source-partial rows skipped: ${autoConfirmedSourcePartialSkipped}`,
    `Stale auto-confirmations ignored: ${staleAutoConfirmations.length}`,
    "",
    "This queue is not a blocker by itself. It identifies rows where native/source review would improve confidence beyond automatic generated_checked QA.",
    "",
    "## Summary",
    "",
    `By priority: ${JSON.stringify(byPriority)}`,
    `By reason: ${JSON.stringify(byReason)}`,
    "",
    "| Language | Rows |",
    "| --- | ---: |",
    ...Object.entries(byLanguage)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([languageCode, count]) => `| ${languageCode} | ${count} |`),
    "",
    "## Decks",
    "",
    "| Deck | Rows | Latest runner manifest |",
    "| --- | ---: | --- |",
    ...Object.entries(byDeck)
      .sort(([left], [right]) => String(specBySetId.get(left)?.sort ?? left).localeCompare(String(specBySetId.get(right)?.sort ?? right), undefined, { numeric: true }))
      .map(([setId, count]) => `| ${setId} | ${count} | ${runManifests[setId] ? `\`${runManifests[setId]}\`` : "-"} |`),
    "",
  ].join("\n"),
  "utf8"
);

const metadataPath = baseOutPath.replace(/\.jsonl$/u, "_metadata.json");
await writeFile(
  metadataPath,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      set_ids: setIds,
      row_count: queue.length,
      include_all_source_partial: includeAllSourcePartial,
      source_manifest_sha256: sourceManifestSha256,
      auto_confirmed_source_partial_skipped: autoConfirmedSourcePartialSkipped,
      stale_auto_confirmations_ignored: staleAutoConfirmations.length,
      by_priority: byPriority,
      by_language: byLanguage,
      by_deck: byDeck,
      by_reason: byReason,
      paths: {
        jsonl: relativePath(baseOutPath),
        csv: relativePath(csvPath),
        summary: relativePath(summaryPath),
      },
    },
    null,
    2
  ) + "\n",
  "utf8"
);

console.log(
  `Forced review queue exported: rows=${queue.length}, P0=${byPriority.P0 ?? 0}, report=${relativePath(summaryPath)}`
);
