#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  summarizeCandidatePool,
  validateCandidatePoolRows,
  writeCandidatePoolOutputs,
} from "./lib/deck-candidate-pool.mjs";
import { resolveDeckSpec } from "./lib/deck-spec-utils.mjs";
import { buildTranslationSourceCoverageFindings } from "./lib/translation-source-coverage.mjs";
import { loadReferenceSourcesManifest } from "./lib/transcription-source-policy.mjs";
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";

const defaultSetIds = [
  "home_kitchen_cookware_pilot_01",
  "home_kitchen_cooking_actions_a1_a2",
  "home_kitchen_storage_cleaning_a2",
  "home_bathroom_essentials_a1",
  "home_kitchen_small_tools_supplies_a2",
];

const args = process.argv.slice(2);
const setIds = args.filter((arg) => !arg.startsWith("--"));
const requestedSetIds = setIds.length ? setIds : defaultSetIds;
const outArg = args.find((arg) => arg.startsWith("--out="))?.slice("--out=".length);
const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const reportPath = path.resolve(outArg ?? `outputs/qa/retrospective_candidate_pool_audit_${dateStamp}.json`);

for (const setId of requestedSetIds) assertSafeSetId(setId);

function compact(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function scoreFor(row) {
  const priorityScore = {
    survival: 95,
    core: 94,
    common: 90,
    useful: 84,
    advanced: 72,
  };
  const frequencyScore = {
    core: 3,
    common: 2,
    useful: 0,
    advanced: -8,
  };
  return Math.max(
    0,
    Math.min(
      100,
      (priorityScore[row.priority_band] ?? 82) + (frequencyScore[row.frequency_band] ?? 0)
    )
  );
}

function statusSummary(statuses) {
  const counts = {};
  for (const status of statuses) counts[status] = (counts[status] ?? 0) + 1;
  return Object.entries(counts)
    .map(([status, count]) => `${status}:${count}`)
    .join(", ");
}

const membershipRows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
    cs.set_name,
    cs.domain as set_domain,
    cs.area as set_area,
    cs.category as set_category,
    cs.level_min as set_level_min,
    cs.level_max as set_level_max,
    cs.target_item_count_min,
    cs.target_item_count_max,
    cs.quality_status as set_quality_status,
    msm.display_order,
    msm.quality_status as membership_quality_status,
    mu.meaning_id,
    mu.canonical_english,
    mu.english_with_article,
    mu.part_of_speech,
    mu.meaning_note,
    mu.level,
    mu.frequency_band,
    mu.priority_band,
    mu.default_domain,
    mu.default_area,
    mu.default_category,
    mu.quality_status as meaning_quality_status,
    e.example_id,
    e.canonical_example_en,
    coalesce(other_sets.other_set_ids, array[]::text[]) as other_set_ids,
    ws.review_status as word_selection_review_status,
    ws.result_summary as word_selection_result_summary,
    ws.reviewed_at as word_selection_reviewed_at
  from meaning_set_memberships msm
  join content_sets cs on cs.set_id = msm.set_id
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  left join meaning_examples e
    on e.set_id = msm.set_id
   and e.meaning_id = msm.meaning_id
   and e.example_role = 'context'
  left join lateral (
    select array_agg(msm2.set_id order by msm2.set_id) as other_set_ids
    from meaning_set_memberships msm2
    where msm2.meaning_id = msm.meaning_id
      and msm2.set_id <> msm.set_id
      and msm2.quality_status <> 'blocked'
  ) other_sets on true
  left join lateral (
    select qr.review_status, qr.result_summary, qr.reviewed_at
    from qa_reviews qr
    where qr.target_type = 'content_set'
      and qr.target_key = msm.set_id || '::' || msm.meaning_id
      and qr.language_code = 'EN'
      and qr.check_family = 'word_selection_quality'
    order by qr.created_at desc, qr.reviewed_at desc nulls last, qr.review_id desc
    limit 1
  ) ws on true
  where msm.set_id in (${sqlLiteralList(requestedSetIds)})
    and msm.quality_status <> 'blocked'
  order by msm.set_id, msm.display_order
) rows;
`);

const languageRows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
    msm.display_order,
    mu.meaning_id,
    mu.canonical_english,
    le.language_code,
    le.native_word,
    le.word_with_article_or_marker,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    le.transcription
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_language_entries le on le.meaning_id = msm.meaning_id
  join languages l on l.code = le.language_code
  where msm.set_id in (${sqlLiteralList(requestedSetIds)})
    and msm.quality_status <> 'blocked'
    and l.is_active
  order by msm.set_id, msm.display_order, le.language_code
) rows;
`);

const referenceManifest = await loadReferenceSourcesManifest();
const manifestSourceIds = new Set((referenceManifest.sources ?? []).map((source) => source.id));
const translationCoverage = await buildTranslationSourceCoverageFindings(languageRows, { manifestSourceIds });
const translationRowsByMeaning = new Map();
for (const row of translationCoverage.rows) {
  const key = `${row.set_id}::${row.meaning_id}`;
  if (!translationRowsByMeaning.has(key)) translationRowsByMeaning.set(key, []);
  translationRowsByMeaning.get(key).push(row);
}
const translationBlockersByMeaning = new Map();
for (const blocker of translationCoverage.blockers) {
  const key = `${blocker.set_id}::${blocker.meaning_id}`;
  if (!translationBlockersByMeaning.has(key)) translationBlockersByMeaning.set(key, []);
  translationBlockersByMeaning.get(key).push(blocker);
}

const rowsBySet = new Map();
for (const row of membershipRows) {
  if (!rowsBySet.has(row.set_id)) rowsBySet.set(row.set_id, []);
  rowsBySet.get(row.set_id).push(row);
}

const decks = [];
const allBlockers = [];

for (const setId of requestedSetIds) {
  const { spec } = resolveDeckSpec(setId);
  if (!spec) throw new Error(`No deck spec found for ${setId}`);

  const rows = rowsBySet.get(setId) ?? [];
  const poolRows = rows.map((row) => {
    const key = `${row.set_id}::${row.meaning_id}`;
    const coverageRows = translationRowsByMeaning.get(key) ?? [];
    const coverageBlockers = translationBlockersByMeaning.get(key) ?? [];
    const coverageStatuses = statusSummary(coverageRows.map((coverageRow) => coverageRow.status));
    const otherSetIds = row.other_set_ids ?? [];
    const hasWordSelectionPass = ["approved", "generated_checked"].includes(row.word_selection_review_status);

    return {
      canonical_english: row.canonical_english,
      part_of_speech: row.part_of_speech,
      domain: row.default_domain || row.set_domain || spec.domain,
      level: row.level || spec.levelLabel,
      cefr: row.level || `${spec.levelMin}-${spec.levelMax}`,
      frequency_band: row.frequency_band || spec.frequencyScope,
      priority_band: row.priority_band || spec.priorityScope,
      include_rule_matched:
        `Retrospective selected row for ${spec.deck}; current word_selection_quality=${row.word_selection_review_status ?? "missing"}.`,
      exclude_rule_hit: "none",
      duplicate_risk: otherSetIds.length ? "explicit_reuse" : "none",
      existing_meaning_id: otherSetIds.length ? row.meaning_id : "",
      source_support: hasWordSelectionPass
        ? "Current V3 word_selection_quality evidence exists for this set_id::meaning_id."
        : "Missing current word_selection_quality pass evidence.",
      translation_coverage_risk: coverageBlockers.length
        ? `blocker:${coverageBlockers.length}`
        : `low; translation source coverage v1 statuses=${coverageStatuses || "none"}; blockers=0`,
      example_feasibility: row.canonical_example_en
        ? `Current controlled context example exists: ${row.canonical_example_en}`
        : "Missing context example.",
      score: scoreFor(row),
      decision: "selected",
      decision_note:
        "Selected-only retrospective audit of an already generated deck. Original rejected/backup candidate pool was not preserved; this row is accepted only as current selected-word audit evidence.",
      move_target: "",
      pool_size_exception_reason:
        "Retrospective audit for a generated deck: original 2x pre-generation candidate pool was not preserved, so this artifact validates selected rows and current evidence only.",
      retrospective_audit: true,
      selected_meaning_id: row.meaning_id,
      display_order: row.display_order,
      set_id: row.set_id,
      spec_file: spec.fileName,
      meaning_note: row.meaning_note,
      english_with_article: row.english_with_article,
      current_context_example_en: row.canonical_example_en,
      word_selection_review_status: row.word_selection_review_status ?? "missing",
      word_selection_result_summary: row.word_selection_result_summary ?? "",
      word_selection_reviewed_at: row.word_selection_reviewed_at ?? "",
      translation_source_coverage_statuses: coverageStatuses,
      translation_source_coverage_blockers: coverageBlockers.length,
      other_set_ids: otherSetIds,
    };
  });

  const summary = summarizeCandidatePool(poolRows, spec);
  const validationErrors = validateCandidatePoolRows(poolRows, spec);
  const auditBlockers = [];
  for (const row of poolRows) {
    if (!["approved", "generated_checked"].includes(row.word_selection_review_status)) {
      auditBlockers.push(`${row.selected_meaning_id}: missing final word_selection_quality evidence`);
    }
    if (row.translation_source_coverage_blockers > 0) {
      auditBlockers.push(`${row.selected_meaning_id}: translation source coverage blocker(s)`);
    }
    if (!row.current_context_example_en) {
      auditBlockers.push(`${row.selected_meaning_id}: missing context example`);
    }
  }
  const outputs = await writeCandidatePoolOutputs({ rows: poolRows, setId, summary });
  const deckResult = {
    set_id: setId,
    deck: spec.deck,
    spec_file: spec.fileName,
    rows: summary.rows,
    selected: summary.selected,
    backup: summary.backup,
    excluded: summary.excluded,
    target_range: summary.target_range,
    validation_errors: validationErrors,
    audit_blockers: auditBlockers,
    pool_path: path.relative(process.cwd(), outputs.poolPath),
    summary_path: path.relative(process.cwd(), outputs.summaryPath),
  };
  decks.push(deckResult);
  allBlockers.push(...validationErrors.map((error) => `${setId}: ${error}`));
  allBlockers.push(...auditBlockers.map((error) => `${setId}: ${error}`));
}

const report = {
  generated_at: new Date().toISOString(),
  mode: "selected_only_retrospective_candidate_pool_audit",
  limitation:
    "Original pre-generation backup/excluded candidate pools were not preserved for these generated decks. This report validates current selected rows, target ranges, duplicate/reuse shape, word_selection_quality evidence, context examples and translation source coverage blockers.",
  set_ids: requestedSetIds,
  decks,
  blocker_count: allBlockers.length,
  blockers: allBlockers,
  translation_source_coverage_summary: {
    rows_checked: translationCoverage.rows.length,
    blocker_count: translationCoverage.blockers.length,
    by_status: translationCoverage.byStatus,
  },
};

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");

const markdownPath = reportPath.replace(/\.json$/u, ".md");
await writeFile(
  markdownPath,
  [
    "# Retrospective Candidate-Pool Audit",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    report.limitation,
    "",
    "| Deck | Rows | Target range | Validation errors | Audit blockers | Pool |",
    "| --- | ---: | --- | ---: | ---: | --- |",
    ...decks.map(
      (deck) =>
        `| ${deck.deck} | ${deck.rows} | ${deck.target_range} | ${deck.validation_errors.length} | ${deck.audit_blockers.length} | \`${deck.pool_path}\` |`
    ),
    "",
    `Translation source coverage: ${translationCoverage.rows.length} rows, ${translationCoverage.blockers.length} blockers, statuses ${JSON.stringify(translationCoverage.byStatus)}.`,
    "",
  ].join("\n"),
  "utf8"
);

if (allBlockers.length > 0) {
  console.error(`Retrospective candidate-pool audit found ${allBlockers.length} blocker(s).`);
  for (const blocker of allBlockers.slice(0, 80)) console.error(blocker);
  const hidden = allBlockers.length - 80;
  if (hidden > 0) console.error(`... +${hidden} more blocker(s)`);
  process.exit(1);
}

console.log(`Retrospective candidate-pool audit OK: ${decks.length} deck(s), report=${path.relative(process.cwd(), reportPath)}`);
