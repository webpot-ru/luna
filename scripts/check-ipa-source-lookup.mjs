#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import {
  buildIpaSourceLookupFindings,
  formatIpaSourceLookupFinding,
  ipaSourceLookupRuleVersion,
} from "./lib/ipa-source-lookup.mjs";

const args = process.argv.slice(2);
const setIds = args.filter((arg) => !arg.startsWith("--"));
const warnOnly = args.includes("--warn-only");
const outArg = args.find((arg) => arg.startsWith("--out="))?.slice("--out=".length);

if (setIds.length === 0) {
  throw new Error(
    "Usage: node scripts/check-ipa-source-lookup.mjs <set_id> [<set_id> ...] [--warn-only] [--out=path]"
  );
}

for (const setId of setIds) assertSafeSetId(setId);

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
    mu.meaning_note,
    le.language_code,
    le.native_word,
    le.word_with_article_or_marker,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    le.transcription,
    le.romanization_system
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_language_entries le on le.meaning_id = msm.meaning_id
  join languages l on l.code = le.language_code
  where msm.set_id in (${sqlLiteralList(setIds)})
    and msm.quality_status <> 'blocked'
    and l.transcription_format = 'IPA'
  order by msm.set_id, msm.display_order, le.language_code
) rows;
`);

const findings = await buildIpaSourceLookupFindings(rows);
const report = {
  generated_at: new Date().toISOString(),
  rule_version: ipaSourceLookupRuleVersion,
  set_ids: setIds,
  rows: rows.length,
  summary_by_language: findings.byLanguage,
  blocker_count: findings.blockers.length,
  warning_count: findings.warnings.length,
  blockers: findings.blockers,
  warnings: findings.warnings,
};

if (outArg) {
  const outPath = path.resolve(outArg);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
}

if (findings.blockers.length > 0) {
  const prefix = warnOnly ? "IPA source lookup blockers reported" : "IPA source lookup failed";
  console.error(`${prefix} for ${setIds.join(", ")}: ${findings.blockers.length} blocker(s).`);
  for (const blocker of findings.blockers.slice(0, 120)) console.error(formatIpaSourceLookupFinding(blocker));
  const hidden = findings.blockers.length - 120;
  if (hidden > 0) console.error(`... +${hidden} more blocker(s)`);
  if (!warnOnly) process.exit(1);
}

if (findings.warnings.length > 0) {
  console.error(`IPA source lookup warnings for ${setIds.join(", ")}: ${findings.warnings.length} warning(s).`);
  for (const warning of findings.warnings.slice(0, 40)) console.error(formatIpaSourceLookupFinding(warning));
  const hidden = findings.warnings.length - 40;
  if (hidden > 0) console.error(`... +${hidden} more warning(s)`);
}

console.log(
  `IPA source lookup OK for ${setIds.join(", ")}: rows=${rows.length}, blockers=${findings.blockers.length}, warnings=${findings.warnings.length}.`
);
