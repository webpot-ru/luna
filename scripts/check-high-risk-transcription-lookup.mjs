#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  assertSafeSetId,
  psqlJson,
  sqlLiteralList,
} from "./lib/qa-utils.mjs";
import {
  buildHighRiskTranscriptionLookupFindings,
  formatHighRiskTranscriptionLookupBlocker,
  highRiskTranscriptionLookupLanguageCodes,
} from "./lib/high-risk-transcription-lookup.mjs";
import {
  loadReferenceSourcesManifest,
  referenceSourcesManifestSha256,
  validateTranscriptionSourcePolicyCompleteness,
} from "./lib/transcription-source-policy.mjs";

const args = process.argv.slice(2);
const setIds = args.filter((arg) => !arg.startsWith("--"));
const outArg = args.find((arg) => arg.startsWith("--out="))?.slice("--out=".length);

if (setIds.length === 0) {
  throw new Error(
    "Usage: node scripts/check-high-risk-transcription-lookup.mjs <set_id> [<set_id> ...] [--out=path]"
  );
}

for (const setId of setIds) assertSafeSetId(setId);

function compactReportFinding(finding) {
  const { source_entry: _sourceEntry, ...compact } = finding;
  return compact;
}

const completeness = await validateTranscriptionSourcePolicyCompleteness();
if (completeness.blockers.length > 0) {
  console.error(`Transcription source policy is incomplete: ${completeness.blockers.length} blocker(s).`);
  for (const blocker of completeness.blockers) console.error(blocker);
  process.exit(1);
}

const manifest = await loadReferenceSourcesManifest();
const manifestSourceIds = new Set((manifest.sources ?? []).map((source) => source.id));
const manifestSha256 = await referenceSourcesManifestSha256();
const highRiskCodes = highRiskTranscriptionLookupLanguageCodes();

const rows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
    msm.display_order,
    mu.meaning_id,
    mu.canonical_english,
    mu.english_with_article,
    mu.part_of_speech,
    le.language_code,
    le.native_word,
    le.word_with_article_or_marker,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    le.transcription,
    le.romanization_system,
    le.pronunciation_status
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_language_entries le on le.meaning_id = msm.meaning_id
  join languages l on l.code = le.language_code
  where msm.set_id in (${sqlLiteralList(setIds)})
    and msm.quality_status <> 'blocked'
    and l.is_active
    and le.language_code in (${sqlLiteralList(highRiskCodes)})
  order by msm.set_id, msm.display_order, le.language_code
) rows;
`, 1024 * 1024 * 20);

const findings = await buildHighRiskTranscriptionLookupFindings(rows, {
  manifestSourceIds,
});

const report = {
  generated_at: new Date().toISOString(),
  set_ids: setIds,
  rows: rows.length,
  manifest_sha256: manifestSha256,
  strict_languages: highRiskCodes,
  summary_by_language: findings.byLanguage,
  blockers: findings.blockers.map(compactReportFinding),
};

if (outArg) {
  const outPath = path.resolve(outArg);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
}

if (findings.blockers.length > 0) {
  console.error(
    `High-risk transcription lookup failed for ${setIds.join(", ")}: ${findings.blockers.length} blocker(s).`
  );
  for (const blocker of findings.blockers.slice(0, 160)) {
    console.error(formatHighRiskTranscriptionLookupBlocker(blocker));
  }
  const hidden = findings.blockers.length - 160;
  if (hidden > 0) console.error(`... +${hidden} more`);
  process.exit(1);
}

console.log(`High-risk transcription lookup OK for ${setIds.join(", ")}: ${rows.length} row(s).`);
