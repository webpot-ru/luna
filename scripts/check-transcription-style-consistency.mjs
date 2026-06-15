#!/usr/bin/env node
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import {
  buildTranscriptionStyleConsistencyFindings,
  formatTranscriptionStyleConsistencyBlocker,
} from "./lib/transcription-style-consistency.mjs";

const setIds = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-transcription-style-consistency.mjs <set_id> [<set_id> ...]");
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
    and l.is_active
  order by msm.set_id, le.language_code, msm.display_order
) rows;
`);

const findings = buildTranscriptionStyleConsistencyFindings(rows);

if (findings.blockers.length > 0) {
  console.error(
    `Transcription style consistency failed for ${setIds.join(", ")}: ${findings.blockers.length} blocker(s).`
  );
  for (const blocker of findings.blockers.slice(0, 80)) {
    console.error(formatTranscriptionStyleConsistencyBlocker(blocker));
  }
  const hidden = findings.blockers.length - 80;
  if (hidden > 0) console.error(`... +${hidden} more`);
  process.exit(1);
}

console.log(
  `Transcription style consistency OK for ${setIds.join(", ")}: ${findings.checked_rows} high-risk style row(s), languages=${findings.checked_languages.join(",") || "none"}.`
);
