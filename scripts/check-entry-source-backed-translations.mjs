#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import {
  buildEntrySourceBackedTranslationFindings,
  formatEntrySourceBackedTranslationFinding,
} from "./lib/entry-source-backed-translations.mjs";
import { loadReferenceSourcesManifest } from "./lib/transcription-source-policy.mjs";
import { languageOrderRecords } from "./lib/language-order.mjs";
import { validateTranslationSourcePolicyCompleteness } from "./lib/translation-source-policy.mjs";

const args = process.argv.slice(2);
const setIds = args.filter((arg) => !arg.startsWith("--"));
const outPath = args.find((arg) => arg.startsWith("--out="))?.split("=")[1];
const warnOnly = args.includes("--warn-only");
const allLanguages = args.includes("--all-languages");

if (setIds.length === 0) {
  throw new Error(
    "Usage: node scripts/check-entry-source-backed-translations.mjs <set_id> [<set_id> ...] [--all-languages] [--warn-only] [--out=path]"
  );
}

for (const setId of setIds) assertSafeSetId(setId);

const translationPolicy = await validateTranslationSourcePolicyCompleteness();
if (translationPolicy.blockers.length > 0) {
  console.error(`Translation source policy is incomplete: ${translationPolicy.blockers.length} blocker(s).`);
  for (const blocker of translationPolicy.blockers) console.error(blocker);
  process.exit(1);
}

const enforcedLanguageCodes = allLanguages
  ? new Set(languageOrderRecords.map((record) => record.dbCode).filter((code) => code !== "EN" && code !== "EN-GB"))
  : new Set(["TL"]);

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

const referenceManifest = await loadReferenceSourcesManifest();
const manifestSourceIds = new Set((referenceManifest.sources ?? []).map((source) => source.id));
const findings = await buildEntrySourceBackedTranslationFindings(rows, {
  manifestSourceIds,
  enforcedLanguageCodes,
});

const output = {
  checked_at: new Date().toISOString(),
  set_ids: setIds,
  mode: allLanguages ? "all_languages" : "tl_enforced",
  rows_checked: rows.length,
  blockers: findings.blockers,
  warnings: findings.warnings,
  reviewed: findings.reviewed,
  decision_count: findings.decision_count,
  summary: {
    blockers: findings.blockers.length,
    warnings: findings.warnings.length,
    reviewed: findings.reviewed.length,
  },
};

if (outPath) {
  await writeFile(path.resolve(outPath), JSON.stringify(output, null, 2) + "\n", "utf8");
}

if (findings.blockers.length > 0 && !warnOnly) {
  console.error(
    `Entry source-backed translation check failed for ${setIds.join(", ")}: ${findings.blockers.length} blocker(s).`
  );
  for (const blocker of findings.blockers.slice(0, 30)) {
    console.error(formatEntrySourceBackedTranslationFinding(blocker));
  }
  const hidden = findings.blockers.length - 30;
  if (hidden > 0) console.error(`... +${hidden} more blocker(s)`);
  process.exit(1);
}

if (findings.blockers.length > 0) {
  console.error(
    `Entry source-backed translation blockers for ${setIds.join(", ")}: ${findings.blockers.length} blocker(s), warn-only.`
  );
}

if (findings.warnings.length > 0) {
  console.error(
    `Entry source-backed translation warnings for ${setIds.join(", ")}: ${findings.warnings.length} warning(s).`
  );
  for (const warning of findings.warnings.slice(0, 20)) {
    console.error(formatEntrySourceBackedTranslationFinding(warning));
  }
  const hidden = findings.warnings.length - 20;
  if (hidden > 0) console.error(`... +${hidden} more warning(s)`);
}

console.log(
  `Entry source-backed translation OK for ${setIds.join(", ")}: rows=${rows.length}, blockers=${findings.blockers.length}, warnings=${findings.warnings.length}, reviewed=${findings.reviewed.length}.`
);
