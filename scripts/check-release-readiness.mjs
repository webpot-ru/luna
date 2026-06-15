#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readdirSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import { languageOrderRecords } from "./lib/language-order.mjs";
import { loadDeckPlanningState } from "./lib/deck-spec-utils.mjs";
import {
  buildTranslationSourceCoverageFindings,
} from "./lib/translation-source-coverage.mjs";
import { loadReferenceSourcesManifest } from "./lib/transcription-source-policy.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const args = process.argv.slice(2);
const explicitSetIds = args.filter((arg) => !arg.startsWith("--"));
const currentGenerated = args.includes("--current-generated");
const reportOnly = args.includes("--report-only");
const outArg = args.find((arg) => arg.startsWith("--out="))?.slice("--out=".length);
const sampleMaxAgeDays = Number(
  args.find((arg) => arg.startsWith("--sample-max-age-days="))?.slice("--sample-max-age-days=".length) ?? 14
);

if (!currentGenerated && explicitSetIds.length === 0) {
  throw new Error(
    "Usage: node scripts/check-release-readiness.mjs <set_id> [<set_id> ...] [--report-only] [--out=path]\n" +
      "   or: node scripts/check-release-readiness.mjs --current-generated [--report-only] [--out=path]"
  );
}

function relativePath(filePath) {
  return path.relative(projectRoot, path.resolve(filePath));
}

async function sha256File(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function listJsonFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(dir, file))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

async function resolveCurrentGeneratedSetIds() {
  const rows = await psqlJson(`
select coalesce(json_agg(set_id order by created_at, set_id), '[]'::json)
from (
  select cs.set_id, min(cs.created_at) as created_at
  from content_sets cs
  join meaning_set_memberships msm on msm.set_id = cs.set_id
  where msm.quality_status <> 'blocked'
  group by cs.set_id
) current_sets;
`);
  return rows;
}

const setIds = currentGenerated ? await resolveCurrentGeneratedSetIds() : explicitSetIds;
for (const setId of setIds) assertSafeSetId(setId);
if (setIds.length === 0) throw new Error("No content sets matched the readiness request.");

const planningState = loadDeckPlanningState();
const specBySetId = new Map(planningState.specIdentities.map((spec) => [spec.setId, spec]));
const activeLanguageCount = languageOrderRecords.length;

const deckRows = await psqlJson(`
with requested(set_id) as (
  values ${setIds.map((setId) => `('${setId.replace(/'/g, "''")}')`).join(", ")}
),
cards as (
  select
    r.set_id,
    count(distinct msm.meaning_id) filter (where msm.quality_status <> 'blocked') as card_count
  from requested r
  left join meaning_set_memberships msm on msm.set_id = r.set_id
  group by r.set_id
),
entry_rows as (
  select
    r.set_id,
    coalesce(sum(status_count), 0) as entry_count,
    jsonb_object_agg(status_key, status_count) as entry_status_counts
  from requested r
  left join lateral (
    select
      coalesce(le.quality_status, 'missing') as status_key,
      count(*) as status_count
    from meaning_set_memberships msm
    join meaning_language_entries le on le.meaning_id = msm.meaning_id
    join languages l on l.code = le.language_code and l.is_active
    where msm.set_id = r.set_id
      and msm.quality_status <> 'blocked'
    group by coalesce(le.quality_status, 'missing')
  ) status_rows on true
  group by r.set_id
),
pron_rows as (
  select
    r.set_id,
    jsonb_object_agg(status_key, status_count) as pronunciation_status_counts
  from requested r
  left join lateral (
    select
      coalesce(le.pronunciation_status, 'missing') as status_key,
      count(*) as status_count
    from meaning_set_memberships msm
    join meaning_language_entries le on le.meaning_id = msm.meaning_id
    join languages l on l.code = le.language_code and l.is_active
    where msm.set_id = r.set_id
      and msm.quality_status <> 'blocked'
    group by coalesce(le.pronunciation_status, 'missing')
  ) status_rows on true
  group by r.set_id
),
example_rows as (
  select
    r.set_id,
    coalesce(sum(status_count), 0) as example_translation_count,
    jsonb_object_agg(status_key, status_count) as example_status_counts
  from requested r
  left join lateral (
    select
      coalesce(et.quality_status, 'missing') as status_key,
      count(*) as status_count
    from meaning_set_memberships msm
    join meaning_examples e
      on e.set_id = msm.set_id
     and e.meaning_id = msm.meaning_id
     and e.example_role = 'context'
    join meaning_example_translations et on et.example_id = e.example_id
    join languages l on l.code = et.language_code and l.is_active
    where msm.set_id = r.set_id
      and msm.quality_status <> 'blocked'
    group by coalesce(et.quality_status, 'missing')
  ) status_rows on true
  group by r.set_id
),
scoped_reviews as (
  select
    r.set_id,
    max(qr.created_at) as latest_review_created_at,
    max(qr.reviewed_at) as latest_reviewed_at
  from requested r
  join qa_reviews qr
    on (
      qr.target_key = r.set_id
      or qr.target_key = r.set_id || '::course_metadata'
      or qr.target_key like r.set_id || '::%'
      or (
        qr.target_type = 'meaning_language_entry'
        and exists (
          select 1
          from meaning_set_memberships msm
          where msm.set_id = r.set_id
            and msm.meaning_id = qr.target_key
        )
      )
      or (
        qr.target_type = 'meaning_example'
        and exists (
          select 1
          from meaning_examples e
          where e.set_id = r.set_id
            and e.example_id::text = qr.target_key
        )
      )
    )
  group by r.set_id
),
row_updates as (
  select r.set_id, max(t.updated_at) as latest_updated_at
  from requested r
  join (
    select set_id, updated_at from content_sets
    union all
    select set_id, updated_at from content_set_localizations
    union all
    select set_id, updated_at from meaning_set_memberships
    union all
    select e.set_id, e.updated_at from meaning_examples e
    union all
    select msm.set_id, mu.updated_at
    from meaning_set_memberships msm
    join meaning_units mu on mu.meaning_id = msm.meaning_id
    union all
    select msm.set_id, le.updated_at
    from meaning_set_memberships msm
    join meaning_language_entries le on le.meaning_id = msm.meaning_id
    union all
    select e.set_id, et.updated_at
    from meaning_examples e
    join meaning_example_translations et on et.example_id = e.example_id
  ) t on t.set_id = r.set_id
  group by r.set_id
)
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    r.set_id,
    cs.set_name,
    cs.selection_status,
    cs.quality_status as content_set_quality_status,
    cs.updated_at as content_set_updated_at,
    coalesce(cards.card_count, 0) as card_count,
    coalesce(entry_rows.entry_count, 0) as entry_count,
    coalesce(example_rows.example_translation_count, 0) as example_translation_count,
    coalesce(entry_rows.entry_status_counts, '{}'::jsonb) as entry_status_counts,
    coalesce(pron_rows.pronunciation_status_counts, '{}'::jsonb) as pronunciation_status_counts,
    coalesce(example_rows.example_status_counts, '{}'::jsonb) as example_status_counts,
    greatest(
      coalesce(row_updates.latest_updated_at, '-infinity'::timestamptz),
      coalesce(scoped_reviews.latest_review_created_at, '-infinity'::timestamptz),
      coalesce(scoped_reviews.latest_reviewed_at, '-infinity'::timestamptz)
    ) as latest_db_change_at
  from requested r
  left join content_sets cs on cs.set_id = r.set_id
  left join cards on cards.set_id = r.set_id
  left join entry_rows on entry_rows.set_id = r.set_id
  left join pron_rows on pron_rows.set_id = r.set_id
  left join example_rows on example_rows.set_id = r.set_id
  left join row_updates on row_updates.set_id = r.set_id
  left join scoped_reviews on scoped_reviews.set_id = r.set_id
  order by cs.created_at, r.set_id
) rows;
`);

const translationRows = await psqlJson(`
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
  join languages l on l.code = le.language_code and l.is_active
  where msm.set_id in (${sqlLiteralList(setIds)})
    and msm.quality_status <> 'blocked'
  order by msm.set_id, msm.display_order, le.language_code
) rows;
`);

const referenceManifest = await loadReferenceSourcesManifest();
const manifestSourceIds = new Set((referenceManifest.sources ?? []).map((source) => source.id));
const translationCoverage = await buildTranslationSourceCoverageFindings(translationRows, { manifestSourceIds });

function statusCount(counts, allowed) {
  let total = 0;
  for (const status of allowed) total += Number(counts?.[status] ?? 0);
  return total;
}

function findLatestRunManifest(setId) {
  const dir = path.join(projectRoot, "outputs", "runs", setId);
  return listJsonFiles(dir)[0] ?? null;
}

async function runManifestSummary(setId) {
  const manifestPath = findLatestRunManifest(setId);
  if (!manifestPath) return { path: null, status: "missing", current_stage: null, blockers: ["missing runner manifest"], warnings: [] };
  const manifest = await readJson(manifestPath);
  const blockers = [];
  const warnings = [];
  if (manifest.status !== "completed") blockers.push(`runner status is ${manifest.status ?? "missing"}`);
  if (manifest.current_stage !== "complete") blockers.push(`runner current_stage is ${manifest.current_stage ?? "missing"}`);
  if (!manifest.stages?.complete?.passed) blockers.push("runner complete stage pass evidence missing");
  return {
    path: relativePath(manifestPath),
    run_id: manifest.run_id ?? null,
    status: manifest.status ?? null,
    current_stage: manifest.current_stage ?? null,
    completed_at: manifest.stages?.complete?.completed_at ?? null,
    blockers,
    warnings,
  };
}

async function deliverySummary(setId, latestDbChangeAt) {
  const dir = path.join(projectRoot, "outputs", "google-sheets");
  const matches = [];
  for (const file of listJsonFiles(dir).filter((file) => file.endsWith("_delivery.json"))) {
    const manifest = await readJson(file);
    if (manifest.set_id === setId && manifest.export_mode === "final") matches.push({ path: file, manifest });
  }
  const blockers = [];
  if (matches.length !== 1) {
    blockers.push(`expected exactly one final delivery manifest, got ${matches.length}`);
    return { path: matches[0] ? relativePath(matches[0].path) : null, blockers };
  }
  const { path: manifestPath, manifest } = matches[0];
  const workbookPath = manifest.workbook_path ? path.resolve(manifest.workbook_path) : null;
  const currentWorkbookSha = workbookPath && existsSync(workbookPath) ? await sha256File(workbookPath) : null;

  if (manifest.final_ready !== true) blockers.push("delivery manifest final_ready is not true");
  if (manifest.google_sheet_upload_status !== "uploaded") blockers.push(`upload status is ${manifest.google_sheet_upload_status ?? "missing"}`);
  if (manifest.google_sheet_verified_in_folder !== true) blockers.push("Google Sheet folder verification missing");
  if (manifest.google_sheet_readback_status !== "verified") blockers.push(`readback status is ${manifest.google_sheet_readback_status ?? "missing"}`);
  if (manifest.google_sheet_matches_current_workbook !== true) blockers.push("Google Sheet is marked stale vs workbook");
  if (!currentWorkbookSha) blockers.push("final workbook file is missing");
  if (currentWorkbookSha && manifest.workbook_sha256 !== currentWorkbookSha) blockers.push("manifest workbook hash differs from current workbook");
  if (currentWorkbookSha && manifest.google_sheet_uploaded_workbook_sha256 !== currentWorkbookSha) {
    blockers.push("uploaded workbook hash differs from current workbook");
  }
  if (currentWorkbookSha && manifest.google_sheet_readback_workbook_sha256 !== currentWorkbookSha) {
    blockers.push("readback workbook hash differs from current workbook");
  }
  const latestDbAt = Date.parse(latestDbChangeAt ?? "");
  const exportedAt = Date.parse(manifest.exported_at ?? "");
  const uploadedAt = Date.parse(manifest.google_sheet_uploaded_at ?? "");
  const readbackAt = Date.parse(manifest.google_sheet_readback_verified_at ?? "");
  if (Number.isFinite(latestDbAt) && Number.isFinite(exportedAt) && latestDbAt > exportedAt) {
    blockers.push(`DB/QA changed after final export (${latestDbChangeAt} > ${manifest.exported_at})`);
  }
  if (Number.isFinite(exportedAt) && Number.isFinite(uploadedAt) && exportedAt > uploadedAt) {
    blockers.push("final workbook was exported after Google Sheet upload");
  }
  if (Number.isFinite(uploadedAt) && Number.isFinite(readbackAt) && uploadedAt > readbackAt) {
    blockers.push("Google Sheet upload is newer than readback verification");
  }
  if (Number.isFinite(exportedAt) && Number.isFinite(readbackAt) && exportedAt > readbackAt) {
    blockers.push("final workbook was exported after Google Sheet readback");
  }

  return {
    path: relativePath(manifestPath),
    workbook_path: workbookPath ? relativePath(workbookPath) : null,
    google_sheet_id: manifest.google_sheet_id ?? null,
    google_sheet_title: manifest.google_sheet_title ?? null,
    google_sheet_url: manifest.google_sheet_url ?? null,
    exported_at: manifest.exported_at ?? null,
    uploaded_at: manifest.google_sheet_uploaded_at ?? null,
    readback_verified_at: manifest.google_sheet_readback_verified_at ?? null,
    readback_sample_count: manifest.google_sheet_readback_sample_count ?? null,
    latest_db_change_at: latestDbChangeAt ?? null,
    translation_source_coverage: manifest.translation_source_coverage ?? null,
    blockers,
  };
}

async function latestFinalAuditSummary(setId) {
  const files = listJsonFiles(path.join(projectRoot, "outputs", "audit")).filter((file) =>
    path.basename(file).startsWith(`final_linguistic_audit_${setId}_`) && file.endsWith("_summary.json")
  );
  for (const file of files) {
    const summary = await readJson(file);
    if (summary.set_id !== setId) continue;
    return {
      path: relativePath(file),
      rows: summary.rows ?? null,
      pass: summary.pass ?? null,
      needs_review: summary.needs_review ?? null,
      fail: summary.fail ?? null,
      blockers: Number(summary.needs_review ?? 0) || Number(summary.fail ?? 0)
        ? [`post-final audit has needs_review=${summary.needs_review ?? 0}, fail=${summary.fail ?? 0}`]
        : [],
    };
  }
  return { path: null, blockers: ["missing post-final linguistic audit summary"] };
}

async function latestSampleAudit(setId) {
  const maxAgeMs = Number.isFinite(sampleMaxAgeDays) ? sampleMaxAgeDays * 24 * 60 * 60 * 1000 : Infinity;
  const files = listJsonFiles(path.join(projectRoot, "outputs", "qa")).filter((file) =>
    path.basename(file).startsWith("sample_card_quality_audit_") && file.endsWith(".json")
  );
  const nowMs = Date.now();
  for (const file of files) {
    const report = await readJson(file);
    if (!Array.isArray(report.set_ids) || !report.set_ids.includes(setId)) continue;
    const generatedAtMs = Date.parse(report.generated_at ?? "");
    const ageOk = Number.isFinite(generatedAtMs) ? nowMs - generatedAtMs <= maxAgeMs : false;
    return {
      path: relativePath(file),
      generated_at: report.generated_at ?? null,
      mode: report.mode ?? null,
      sample_size_per_deck_language: report.sample_size_per_deck_language ?? null,
      blocker_count: report.blocker_count ?? null,
      warning_count: report.warning_count ?? null,
      rows_for_deck: report.by_deck?.[setId]?.sampled_rows ?? null,
      blockers: [
        ...(ageOk ? [] : [`sample audit is older than ${sampleMaxAgeDays} day(s) or missing timestamp`]),
        ...(Number(report.blocker_count ?? 0) > 0 ? [`sample audit has ${report.blocker_count} blocker(s)`] : []),
      ],
      warnings: Number(report.warning_count ?? 0) > 0 ? [`sample audit has ${report.warning_count} warning(s)`] : [],
    };
  }
  return { path: null, blockers: ["missing clean sample card quality audit"], warnings: [] };
}

const translationCoverageBySet = new Map();
for (const row of translationCoverage.rows) {
  const summary = translationCoverageBySet.get(row.set_id) ?? { by_status: {}, blocker_count: 0, warning_count: 0, rows_checked: 0 };
  summary.rows_checked += 1;
  summary.by_status[row.status] = (summary.by_status[row.status] ?? 0) + 1;
  translationCoverageBySet.set(row.set_id, summary);
}
for (const blocker of translationCoverage.blockers) {
  const summary = translationCoverageBySet.get(blocker.set_id) ?? { by_status: {}, blocker_count: 0, warning_count: 0, rows_checked: 0 };
  summary.blocker_count += 1;
  translationCoverageBySet.set(blocker.set_id, summary);
}
for (const warning of translationCoverage.warnings) {
  const summary = translationCoverageBySet.get(warning.set_id) ?? { by_status: {}, blocker_count: 0, warning_count: 0, rows_checked: 0 };
  summary.warning_count += 1;
  translationCoverageBySet.set(warning.set_id, summary);
}

const decks = [];
for (const deck of deckRows) {
  const blockers = [];
  const warnings = [];
  const spec = specBySetId.get(deck.set_id);
  const expectedLanguageRows = Number(deck.card_count) * activeLanguageCount;
  const finalEntryRows = statusCount(deck.entry_status_counts, ["approved", "generated_checked"]);
  const finalExampleRows = statusCount(deck.example_status_counts, ["approved", "generated_checked"]);
  const finalPronRows = statusCount(deck.pronunciation_status_counts, ["approved", "generated_checked", "not_applicable"]);

  if (!spec) warnings.push("deck spec not found in Deck Specs Registry");
  if (deck.selection_status !== "approved") blockers.push(`content_set selection_status is ${deck.selection_status ?? "missing"}`);
  if (Number(deck.entry_count) !== expectedLanguageRows) blockers.push(`entry rows ${deck.entry_count} != cards*54 ${expectedLanguageRows}`);
  if (Number(deck.example_translation_count) !== expectedLanguageRows) {
    blockers.push(`example rows ${deck.example_translation_count} != cards*54 ${expectedLanguageRows}`);
  }
  if (finalEntryRows !== expectedLanguageRows) blockers.push(`final-ready entry statuses ${finalEntryRows} != ${expectedLanguageRows}`);
  if (finalExampleRows !== expectedLanguageRows) blockers.push(`final-ready example statuses ${finalExampleRows} != ${expectedLanguageRows}`);
  if (finalPronRows !== expectedLanguageRows) blockers.push(`final-ready pronunciation statuses ${finalPronRows} != ${expectedLanguageRows}`);

  const runner = await runManifestSummary(deck.set_id);
  const delivery = await deliverySummary(deck.set_id, deck.latest_db_change_at);
  const finalAudit = await latestFinalAuditSummary(deck.set_id);
  const sampleAudit = await latestSampleAudit(deck.set_id);
  const sourceCoverage = translationCoverageBySet.get(deck.set_id) ?? {};
  if (Number(sourceCoverage.blocker_count ?? 0) > 0) blockers.push(`translation source coverage has ${sourceCoverage.blocker_count} blocker(s)`);
  if (Number(sourceCoverage.warning_count ?? 0) > 0) warnings.push(`translation source coverage has ${sourceCoverage.warning_count} warning(s)`);

  blockers.push(...runner.blockers.map((item) => `runner: ${item}`));
  blockers.push(...delivery.blockers.map((item) => `delivery: ${item}`));
  blockers.push(...finalAudit.blockers.map((item) => `final_audit: ${item}`));
  blockers.push(...sampleAudit.blockers.map((item) => `sample_audit: ${item}`));
  warnings.push(...(runner.warnings ?? []).map((item) => `runner: ${item}`));
  warnings.push(...(sampleAudit.warnings ?? []).map((item) => `sample_audit: ${item}`));

  decks.push({
    set_id: deck.set_id,
    sort: spec?.sort ?? null,
    deck_name: deck.set_name ?? spec?.deck ?? deck.set_id,
    status: blockers.length ? "blocked" : warnings.length ? "ready_with_warnings" : "ready",
    card_count: Number(deck.card_count),
    expected_language_rows: expectedLanguageRows,
    entry_count: Number(deck.entry_count),
    example_translation_count: Number(deck.example_translation_count),
    entry_status_counts: deck.entry_status_counts,
    example_status_counts: deck.example_status_counts,
    pronunciation_status_counts: deck.pronunciation_status_counts,
    translation_source_coverage: sourceCoverage,
    runner,
    delivery,
    final_audit: finalAudit,
    sample_audit: sampleAudit,
    blockers,
    warnings,
  });
}

const report = {
  generated_at: new Date().toISOString(),
  mode: currentGenerated ? "current_generated" : "explicit_set_ids",
  set_ids: setIds,
  active_language_count: activeLanguageCount,
  status: decks.some((deck) => deck.blockers.length) ? "blocked" : decks.some((deck) => deck.warnings.length) ? "ready_with_warnings" : "ready",
  summary: {
    deck_count: decks.length,
    ready: decks.filter((deck) => deck.status === "ready").length,
    ready_with_warnings: decks.filter((deck) => deck.status === "ready_with_warnings").length,
    blocked: decks.filter((deck) => deck.status === "blocked").length,
    total_cards: decks.reduce((sum, deck) => sum + deck.card_count, 0),
    total_language_rows: decks.reduce((sum, deck) => sum + deck.entry_count, 0),
    blockers: decks.reduce((sum, deck) => sum + deck.blockers.length, 0),
    warnings: decks.reduce((sum, deck) => sum + deck.warnings.length, 0),
  },
  decks,
};

const outPath = path.resolve(
  outArg ?? `outputs/release-readiness/release_readiness_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.json`
);
await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");

const markdownPath = outPath.replace(/\.json$/u, ".md");
await writeFile(
  markdownPath,
  [
    "# Release Readiness Report",
    "",
    `Generated at: ${report.generated_at}`,
    `Mode: \`${report.mode}\``,
    `Status: \`${report.status}\``,
    "",
    "| Deck | Status | Cards | Rows | Google Sheet | Blockers | Warnings |",
    "| --- | --- | ---: | ---: | --- | ---: | ---: |",
    ...decks.map((deck) => {
      const sheet = deck.delivery?.google_sheet_id ? `[${deck.delivery.google_sheet_id}](${deck.delivery.google_sheet_url ?? ""})` : "-";
      return `| ${deck.sort ? `${deck.sort}. ` : ""}${deck.deck_name} | ${deck.status} | ${deck.card_count} | ${deck.entry_count} | ${sheet} | ${deck.blockers.length} | ${deck.warnings.length} |`;
    }),
    "",
    "## Blockers",
    decks.some((deck) => deck.blockers.length)
      ? decks
          .flatMap((deck) => deck.blockers.map((blocker) => `- ${deck.set_id}: ${blocker}`))
          .join("\n")
      : "None.",
    "",
    "## Warnings",
    decks.some((deck) => deck.warnings.length)
      ? decks
          .flatMap((deck) => deck.warnings.map((warning) => `- ${deck.set_id}: ${warning}`))
          .join("\n")
      : "None.",
    "",
  ].join("\n"),
  "utf8"
);

console.log(
  `Release readiness ${report.status}: decks=${decks.length}, blockers=${report.summary.blockers}, warnings=${report.summary.warnings}, report=${relativePath(outPath)}`
);

if (report.status === "blocked" && !reportOnly) process.exit(1);
