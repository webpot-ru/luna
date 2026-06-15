#!/usr/bin/env node
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import {
  buildIpaTranscriptionSanityFindings,
  formatIpaTranscriptionSanityFinding,
} from "./lib/ipa-transcription-sanity.mjs";

const setIds = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-ipa-transcription-sanity.mjs <set_id> [<set_id> ...]");
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
    mu.part_of_speech,
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

const findings = buildIpaTranscriptionSanityFindings(rows);

if (findings.blockers.length > 0) {
  console.error(`IPA transcription sanity check failed for ${setIds.join(", ")}: ${findings.blockers.length} blocker(s).`);
  for (const blocker of findings.blockers.slice(0, 80)) console.error(formatIpaTranscriptionSanityFinding(blocker));
  const hidden = findings.blockers.length - 80;
  if (hidden > 0) console.error(`... +${hidden} more blocker(s)`);
  process.exit(1);
}

if (findings.warnings.length > 0) {
  console.error(`IPA transcription sanity warnings for ${setIds.join(", ")}: ${findings.warnings.length} warning(s).`);
  for (const warning of findings.warnings.slice(0, 40)) console.error(formatIpaTranscriptionSanityFinding(warning));
  const hidden = findings.warnings.length - 40;
  if (hidden > 0) console.error(`... +${hidden} more warning(s)`);
}

console.log(`IPA transcription sanity OK for ${setIds.join(", ")}: ${rows.length} IPA row(s), ${findings.warnings.length} warning(s).`);
