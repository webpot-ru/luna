#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import {
  buildTranslationSourceCoverageFindings,
  formatTranslationSourceCoverageBlocker,
} from "./lib/translation-source-coverage.mjs";
import { loadReferenceSourcesManifest } from "./lib/transcription-source-policy.mjs";
import { validateTranslationSourcePolicyCompleteness } from "./lib/translation-source-policy.mjs";

const args = process.argv.slice(2);
const setIds = args.filter((arg) => !arg.startsWith("--"));
const outArg = args.find((arg) => arg.startsWith("--out="))?.slice("--out=".length);
const reportOnly = args.includes("--report-only");

if (setIds.length === 0) {
  throw new Error(
    "Usage: node scripts/check-translation-source-coverage.mjs <set_id> [<set_id> ...] [--report-only] [--out=path]"
  );
}

for (const setId of setIds) assertSafeSetId(setId);

const completeness = await validateTranslationSourcePolicyCompleteness();
if (completeness.blockers.length > 0) {
  console.error(`Translation source policy is incomplete: ${completeness.blockers.length} blocker(s).`);
  for (const blocker of completeness.blockers) console.error(blocker);
  process.exit(1);
}

const referenceManifest = await loadReferenceSourcesManifest();
const manifestSourceIds = new Set((referenceManifest.sources ?? []).map((source) => source.id));

const rows = await psqlJson(`
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
  where msm.set_id in (${sqlLiteralList(setIds)})
    and msm.quality_status <> 'blocked'
    and l.is_active
  order by msm.set_id, msm.display_order, le.language_code
) rows;
`);

const findings = await buildTranslationSourceCoverageFindings(rows, {
  manifestSourceIds,
});

const report = {
  generated_at: new Date().toISOString(),
  set_ids: setIds,
  mode: reportOnly ? "report_only" : "enforced",
  rows_checked: rows.length,
  decision_count: findings.decisionCount,
  summary_by_status: findings.byStatus,
  summary_by_language: findings.byLanguage,
  blockers: findings.blockers,
  warnings: findings.warnings,
};

if (outArg) {
  const outPath = path.resolve(outArg);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
}

if (findings.blockers.length > 0 && !reportOnly) {
  console.error(`Translation source coverage failed for ${setIds.join(", ")}: ${findings.blockers.length} blocker(s).`);
  for (const blocker of findings.blockers.slice(0, 80)) {
    console.error(formatTranslationSourceCoverageBlocker(blocker));
  }
  const hidden = findings.blockers.length - 80;
  if (hidden > 0) console.error(`... +${hidden} more blocker(s)`);
  process.exit(1);
}

if (findings.blockers.length > 0) {
  console.error(
    `Translation source coverage blockers for ${setIds.join(", ")}: ${findings.blockers.length} blocker(s), report-only.`
  );
}

console.log(
  `Translation source coverage OK for ${setIds.join(", ")}: rows=${rows.length}, blockers=${findings.blockers.length}, statuses=${JSON.stringify(findings.byStatus)}`
);
