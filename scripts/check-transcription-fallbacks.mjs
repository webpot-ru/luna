#!/usr/bin/env node
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import { findTranscriptionFallbackIssues } from "./lib/transcription-shape.mjs";

const setIds = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-transcription-fallbacks.mjs <set_id> [<set_id> ...]");
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
  where msm.set_id in (${sqlLiteralList(setIds)})
    and msm.quality_status <> 'blocked'
  order by msm.set_id, msm.display_order, le.language_code
) rows;
`);

const blockers = [];
for (const row of rows) {
  for (const issue of findTranscriptionFallbackIssues(row)) {
    blockers.push({
      set_id: row.set_id,
      meaning_id: row.meaning_id,
      language_code: row.language_code,
      display_word: row.display_word,
      canonical_english: row.canonical_english,
      transcription: row.transcription,
      reason: issue,
    });
  }
}

if (blockers.length > 0) {
  console.error(`Transcription fallback check failed for ${setIds.join(", ")}: ${blockers.length} blocker(s).`);
  for (const blocker of blockers.slice(0, 160)) {
    console.error(
      [
        blocker.set_id,
        blocker.language_code,
        blocker.meaning_id,
        `reason="${blocker.reason}"`,
        `display="${blocker.display_word}"`,
        `canonical="${blocker.canonical_english}"`,
        `transcription="${blocker.transcription}"`,
      ].join(" ")
    );
  }
  const hidden = blockers.length - 160;
  if (hidden > 0) console.error(`... +${hidden} more`);
  process.exit(1);
}

console.log(`Transcription fallback OK for ${setIds.join(", ")}: ${rows.length} language entry row(s).`);
