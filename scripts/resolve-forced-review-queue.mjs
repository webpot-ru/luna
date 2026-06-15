#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readdirSync, statSync } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSafeSetId, csvEscape, psqlJson, readRows, sqlLiteralList } from "./lib/qa-utils.mjs";
import { loadReferenceSourcesManifest } from "./lib/transcription-source-policy.mjs";
import { buildBulkSourceHintsForRows } from "./lib/bulk-source-indexes.mjs";
import {
  buildToolSourceBatchContext,
  buildToolSourceCandidatesForRow,
} from "./lib/tool-source-adapters.mjs";
import {
  autoConfirmationCurrentValueKey,
  autoConfirmationRowKey,
  autoSourceConfirmationPath,
  loadAutoSourceConfirmations,
} from "./lib/forced-review-auto-confirmations.mjs";
import { classifyForcedReviewResolution } from "./lib/forced-review-resolver.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const currentGenerated = args.includes("--current-generated");
const reportOnly = args.includes("--report-only");
const writeAutoConfirmations = args.includes("--write-auto-confirmations");
const queueArg = args.find((arg) => arg.startsWith("--queue="))?.slice("--queue=".length);
const outArg = args.find((arg) => arg.startsWith("--out="))?.slice("--out=".length);
const limitArg = args.find((arg) => arg.startsWith("--limit="))?.slice("--limit=".length);
const limit = limitArg ? Number(limitArg) : null;
const concurrency = Math.max(1, Number(process.env.FORCED_REVIEW_RESOLVER_CONCURRENCY ?? 4));
const progressEvery = Math.max(50, Number(process.env.FORCED_REVIEW_RESOLVER_PROGRESS_EVERY ?? 250));
const timingMs = {};

if (!currentGenerated && !queueArg) {
  throw new Error(
    "Usage: node scripts/resolve-forced-review-queue.mjs --current-generated [--report-only] [--write-auto-confirmations] [--out=path]\n" +
      "   or: node scripts/resolve-forced-review-queue.mjs --queue=outputs/review/forced_review_queue_*.jsonl [--report-only] [--write-auto-confirmations] [--out=path]"
  );
}
if (reportOnly && writeAutoConfirmations) {
  throw new Error("--report-only and --write-auto-confirmations cannot be used together.");
}
if (limit !== null && (!Number.isInteger(limit) || limit <= 0)) {
  throw new Error("--limit must be a positive integer.");
}

function relativePath(filePath) {
  return path.relative(projectRoot, path.resolve(filePath));
}

function listJsonlFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".jsonl"))
    .map((file) => path.join(dir, file))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

function latestCurrentGeneratedQueuePath() {
  return listJsonlFiles(path.join(projectRoot, "outputs", "review"))
    .find((file) => /^forced_review_queue_current_generated.*\.jsonl$/u.test(path.basename(file)));
}

async function sha256File(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

function keyFor(row) {
  return `${row.set_id}::${row.meaning_id}::${row.language_code}`;
}

async function mapLimit(items, limitValue, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limitValue, items.length) }, worker));
  return results;
}

async function timed(label, fn) {
  const startedAt = Date.now();
  console.error(`[forced-review-resolver] ${label}.start`);
  try {
    return await fn();
  } finally {
    const elapsed = Date.now() - startedAt;
    timingMs[label] = elapsed;
    console.error(`[forced-review-resolver] ${label}.done ${elapsed}ms`);
  }
}

function csvRows(rows, headers) {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n") + "\n";
}

function compactCandidate(candidate) {
  return {
    adapter: candidate.adapter ?? candidate.source ?? "",
    source_family: candidate.source_family ?? "",
    field: candidate.field ?? "native_word",
    value: candidate.value ?? "",
    confidence: candidate.confidence ?? "",
    source_ids: candidate.source_ids ?? [candidate.source_id].filter(Boolean),
    matches_current: Boolean(candidate.matches_current),
    strong_candidate: Boolean(candidate.strong_candidate),
    official_candidate: Boolean(candidate.official_candidate),
  };
}

const queuePath = path.resolve(queueArg ?? latestCurrentGeneratedQueuePath() ?? "");
if (!queuePath || !existsSync(queuePath)) {
  throw new Error("Forced review queue not found. Run export-forced-review-queue first or pass --queue=path.");
}

const startedTotalAt = Date.now();
const queueRowsRaw = await timed("read_queue", () => readRows(queuePath));
const queueRows = limit ? queueRowsRaw.slice(0, limit) : queueRowsRaw;
if (queueRows.length === 0) throw new Error(`Forced review queue is empty: ${relativePath(queuePath)}`);

const setIds = [...new Set(queueRows.map((row) => row.set_id).filter(Boolean))].sort();
for (const setId of setIds) assertSafeSetId(setId);
const keys = new Set(queueRows.map(keyFor));

const dbRows = await timed("read_db_rows", () => psqlJson(`
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
  join meaning_example_translations et
    on et.example_id = e.example_id
   and et.language_code = le.language_code
  where msm.set_id in (${sqlLiteralList(setIds)})
    and msm.quality_status <> 'blocked'
  order by msm.set_id, msm.display_order, le.language_code
) rows;
`, 1024 * 1024 * 80));

const dbRowsByKey = new Map(dbRows.map((row) => [keyFor(row), row]));
const rowsToResolve = queueRows
  .map((queueItem) => ({ queueItem, row: dbRowsByKey.get(keyFor(queueItem)) }))
  .filter((item) => keys.has(keyFor(item.queueItem)));

const sourceRows = rowsToResolve.filter((item) => item.row).map((item) => item.row);
const referenceManifest = await timed("load_reference_manifest", () => loadReferenceSourcesManifest());
const sourceManifestSha256 = await timed("hash_source_manifest", () =>
  sha256File(path.join(projectRoot, "reference-sources", "sources.manifest.json"))
);
const toolContext = await timed("build_tool_source_batch_context", () =>
  buildToolSourceBatchContext({
    rows: sourceRows,
    features: {
      // The resolver classifies translation/source confidence. Pronunciation,
      // morphology and MT sanity adapters are handled by normal preflight gates
      // and make the forced-review noise reduction pass too slow at full scale.
      epitran: false,
      unimorph: false,
      mtSanity: false,
      dakshina: false,
    },
  })
);
const bulkHints = sourceRows.length
  ? await timed("build_bulk_source_hints", () => buildBulkSourceHintsForRows(sourceRows))
  : { translationCandidates: [] };

const bulkCandidatesByKey = new Map();
for (const candidate of bulkHints.translationCandidates ?? bulkHints.translation_candidates ?? []) {
  const key = `${candidate.set_id ?? ""}::${candidate.meaning_id ?? ""}::${candidate.language_code ?? ""}`;
  const rows = bulkCandidatesByKey.get(key) ?? [];
  rows.push(candidate);
  bulkCandidatesByKey.set(key, rows);
}

const toolCandidatesByKey = new Map();
let rowsCandidateChecked = 0;
await timed("build_tool_candidates", () => mapLimit(sourceRows, concurrency, async (row) => {
  const result = await buildToolSourceCandidatesForRow(row, toolContext);
  toolCandidatesByKey.set(keyFor(row), result.candidates ?? []);
  rowsCandidateChecked += 1;
  if (rowsCandidateChecked % progressEvery === 0 || rowsCandidateChecked === sourceRows.length) {
    console.error(`[forced-review-resolver] build_tool_candidates.progress ${rowsCandidateChecked}/${sourceRows.length}`);
  }
}));

const resolvedRows = [];
const byClass = {};
const byLanguage = {};
const byDeck = {};

await timed("classify_rows", async () => {
for (const { queueItem, row } of rowsToResolve) {
  const rowKey = keyFor(queueItem);
  const candidates = row
    ? [...(toolCandidatesByKey.get(rowKey) ?? []), ...(bulkCandidatesByKey.get(rowKey) ?? [])]
    : [];
  const resolution = classifyForcedReviewResolution({ queueItem, row: row ?? {}, candidates });
  const compactCandidates = resolution.candidates
    .sort((left, right) => Number(right.matches_current) - Number(left.matches_current))
    .slice(0, 12)
    .map(compactCandidate);
  const resolved = {
    priority: queueItem.priority ?? "",
    resolution_class: resolution.resolution_class,
    auto_confirmable: resolution.auto_confirmable,
    confidence_reason: resolution.confidence_reason,
    review_focus: queueItem.review_focus ?? "",
    reason_code: queueItem.reason_code ?? "",
    set_id: queueItem.set_id,
    deck_name: queueItem.deck_name ?? row?.set_name ?? "",
    display_order: queueItem.display_order ?? row?.display_order ?? "",
    meaning_id: queueItem.meaning_id,
    canonical_english: queueItem.canonical_english ?? row?.canonical_english ?? "",
    meaning_note: queueItem.meaning_note ?? row?.meaning_note ?? "",
    language_code: queueItem.language_code,
    language: queueItem.language ?? "",
    native_word: row?.native_word ?? queueItem.native_word ?? "",
    display_word: row?.display_word ?? queueItem.display_word ?? "",
    transcription: row?.transcription ?? queueItem.transcription ?? "",
    example_en: row?.canonical_example_en ?? queueItem.example_en ?? "",
    example_text: row?.example_text ?? queueItem.example_text ?? "",
    source_status: queueItem.source_status ?? "",
    matched_source_families: resolution.matched_source_families,
    matched_source_ids: resolution.matched_source_ids,
    strong_source_ids: resolution.strong_source_ids,
    candidate_count: resolution.candidate_count,
    exact_match_count: resolution.exact_match_count,
    strong_candidate_count: resolution.strong_candidate_count,
    official_candidate_count: resolution.official_candidate_count,
    english_fallback_risk: resolution.english_fallback_risk,
    candidates: compactCandidates,
  };
  resolvedRows.push(resolved);
  byClass[resolved.resolution_class] = (byClass[resolved.resolution_class] ?? 0) + 1;
  byLanguage[resolved.language_code] ??= {};
  byLanguage[resolved.language_code][resolved.resolution_class] =
    (byLanguage[resolved.language_code][resolved.resolution_class] ?? 0) + 1;
  byDeck[resolved.set_id] ??= {};
  byDeck[resolved.set_id][resolved.resolution_class] = (byDeck[resolved.set_id][resolved.resolution_class] ?? 0) + 1;
}
});

const runStamp = new Date().toISOString().replace(/[-:.]/g, "").replace(/Z$/u, "Z");
const baseOutPath = path.resolve(
  outArg ?? `outputs/review/forced_review_resolution_${currentGenerated ? "current_generated_" : ""}${runStamp}.jsonl`
);
let csvPath = baseOutPath.replace(/\.jsonl$/u, ".csv");
let summaryPath = baseOutPath.replace(/\.jsonl$/u, "_summary.md");
await timed("write_reports", async () => {
await mkdir(path.dirname(baseOutPath), { recursive: true });
await writeFile(baseOutPath, resolvedRows.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");

await writeFile(
  csvPath,
  csvRows(resolvedRows, [
    "priority",
    "resolution_class",
    "auto_confirmable",
    "confidence_reason",
    "review_focus",
    "reason_code",
    "set_id",
    "deck_name",
    "display_order",
    "meaning_id",
    "canonical_english",
    "language_code",
    "language",
    "native_word",
    "display_word",
    "transcription",
    "source_status",
    "candidate_count",
    "exact_match_count",
    "strong_candidate_count",
    "official_candidate_count",
    "english_fallback_risk",
  ]),
  "utf8"
);

let confirmationsWritten = 0;
let confirmationsSkippedExisting = 0;
if (writeAutoConfirmations) {
  const existing = await loadAutoSourceConfirmations();
  const existingCurrentKeys = new Set(existing.map(autoConfirmationCurrentValueKey));
  const confirmationRows = [];
  for (const row of resolvedRows.filter((item) => item.auto_confirmable)) {
    const decision = {
      set_id: row.set_id,
      meaning_id: row.meaning_id,
      language_code: row.language_code,
      current_native_word: row.native_word,
      current_display_word: row.display_word,
      current_transcription: row.transcription,
      decision_type: row.resolution_class,
      source_confidence: "auto_source_supported",
      source_ids: row.matched_source_ids,
      source_families: row.matched_source_families,
      resolver_run_id: path.basename(baseOutPath, ".jsonl"),
      reviewed_at: new Date().toISOString(),
      source_note: `${row.confidence_reason}; automatic resolver confirmation, not native approval.`,
    };
    const currentKey = autoConfirmationCurrentValueKey(decision);
    if (existingCurrentKeys.has(currentKey)) {
      confirmationsSkippedExisting += 1;
      continue;
    }
    existingCurrentKeys.add(currentKey);
    confirmationRows.push(decision);
  }
  if (confirmationRows.length) {
    await mkdir(path.dirname(autoSourceConfirmationPath), { recursive: true });
    await appendFile(
      autoSourceConfirmationPath,
      confirmationRows.map((row) => JSON.stringify(row)).join("\n") + "\n",
      "utf8"
    );
    confirmationsWritten = confirmationRows.length;
  }
}

const classOrder = [
  "auto_confirmed_strong",
  "auto_supported_multi_source",
  "source_conflict_needs_repair",
  "still_source_partial",
  "not_checkable",
];
timingMs.total = Date.now() - startedTotalAt;
await writeFile(
  summaryPath,
  [
    "# Forced Review Resolution",
    "",
    `Generated at: ${new Date().toISOString()}`,
    `Queue: \`${relativePath(queuePath)}\``,
    `Rows resolved: ${resolvedRows.length}`,
    `Source manifest sha256: \`${sourceManifestSha256}\``,
    `Ledger write: ${writeAutoConfirmations ? "enabled" : "disabled"}`,
    `Confirmations written: ${confirmationsWritten}`,
    `Confirmations skipped existing: ${confirmationsSkippedExisting}`,
    "",
    "This report raises or lowers automatic confidence only. It does not approve non-RU rows and does not mutate card text.",
    "",
    "## Summary",
    "",
    "| Resolution class | Rows |",
    "| --- | ---: |",
    ...classOrder.map((key) => `| ${key} | ${byClass[key] ?? 0} |`),
    "",
    "## Languages",
    "",
    "| Language | auto_confirmed_strong | auto_supported_multi_source | source_conflict_needs_repair | still_source_partial | not_checkable |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...Object.entries(byLanguage)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([languageCode, counts]) => `| ${languageCode} | ${counts.auto_confirmed_strong ?? 0} | ${counts.auto_supported_multi_source ?? 0} | ${counts.source_conflict_needs_repair ?? 0} | ${counts.still_source_partial ?? 0} | ${counts.not_checkable ?? 0} |`),
    "",
    "## Decks",
    "",
    "| Deck | auto_confirmed_strong | auto_supported_multi_source | source_conflict_needs_repair | still_source_partial | not_checkable |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...Object.entries(byDeck)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([setId, counts]) => `| ${setId} | ${counts.auto_confirmed_strong ?? 0} | ${counts.auto_supported_multi_source ?? 0} | ${counts.source_conflict_needs_repair ?? 0} | ${counts.still_source_partial ?? 0} | ${counts.not_checkable ?? 0} |`),
    "",
    "## Timing",
    "",
    "| Stage | ms |",
    "| --- | ---: |",
    ...Object.entries(timingMs).map(([stage, elapsed]) => `| ${stage} | ${elapsed} |`),
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
      queue_path: relativePath(queuePath),
      row_count: resolvedRows.length,
      source_manifest_sha256: sourceManifestSha256,
      by_class: byClass,
      by_language: byLanguage,
      by_deck: byDeck,
      report_only: reportOnly || !writeAutoConfirmations,
      write_auto_confirmations: writeAutoConfirmations,
      confirmations_written: confirmationsWritten,
      confirmations_skipped_existing: confirmationsSkippedExisting,
      reference_source_count: referenceManifest.sources?.length ?? 0,
      timing_ms: timingMs,
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
});

console.log(
  `Forced review resolution complete: rows=${resolvedRows.length}, auto_confirmed_strong=${byClass.auto_confirmed_strong ?? 0}, auto_supported_multi_source=${byClass.auto_supported_multi_source ?? 0}, conflicts=${byClass.source_conflict_needs_repair ?? 0}, report=${relativePath(summaryPath)}`
);
