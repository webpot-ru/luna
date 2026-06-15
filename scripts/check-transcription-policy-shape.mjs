#!/usr/bin/env node
import { assertSafeSetId, psqlExec, psqlJson, sqlJson, sqlLiteralList, sqlString } from "./lib/qa-utils.mjs";
import {
  buildTranscriptionShapeBlockers,
  transcriptionPolicyShapeRuleVersion,
} from "./lib/transcription-shape.mjs";

const args = process.argv.slice(2);
const setIds = args.filter((arg) => !arg.startsWith("--"));
const writeEvidence = args.includes("--write-evidence");
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-transcription-policy-shape.mjs <set_id> [<set_id> ...] [--write-evidence]");
}
if (writeEvidence && setIds.length !== 1) {
  throw new Error("--write-evidence currently supports exactly one set_id");
}

for (const setId of setIds) assertSafeSetId(setId);

const rows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
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
`, 1024 * 1024 * 160);

const blockers = buildTranscriptionShapeBlockers(rows);

if (blockers.length > 0) {
  console.error(`Transcription policy shape check failed for ${setIds.join(", ")}: ${blockers.length} blocker(s).`);
  for (const blocker of blockers.slice(0, 120)) {
    console.error(
      `${blocker.language_code} ${blocker.meaning_id}: ${blocker.issue}; display="${blocker.display_word}"; transcription="${blocker.transcription}"`
    );
  }
  const hidden = blockers.length - 120;
  if (hidden > 0) console.error(`... +${hidden} more`);
  process.exit(1);
}

async function writeEvidenceRows(passRows) {
  if (passRows.length === 0) return;

  const timestamp = new Date().toISOString().replace(/[-:.]/g, "").replace(/Z$/, "Z");
  const setId = setIds[0];
  const batchId = `transcription_policy_shape_${setId}_${timestamp}`;
  const statements = ["begin;"];

  for (const row of passRows) {
    const evidence = {
      importer: "check-transcription-policy-shape",
      result: "pass",
      rule_version: transcriptionPolicyShapeRuleVersion,
      set_id: setId,
      meaning_id: row.meaning_id,
      language_code: row.language_code,
      checked_display_word: row.display_word,
      checked_native_word: row.native_word,
      checked_transcription: row.transcription,
      romanization_system: row.romanization_system,
      issues: [],
    };

    statements.push(`
insert into qa_reviews (
  target_type,
  target_key,
  language_code,
  review_status,
  issue_type,
  notes,
  reviewer,
  reviewed_at,
  pass_id,
  batch_id,
  check_family,
  result_summary,
  source_note,
  evidence,
  checked_value_hash
) values (
  'meaning_language_entry',
  ${sqlString(row.meaning_id)},
  ${sqlString(row.language_code)},
  'generated_checked',
  null,
  'Deterministic transcription policy shape pass',
  'transcription-policy-shape-checker',
  now(),
  ${sqlString(`transcription_policy_${batchId}`)},
  ${sqlString(batchId)},
  'transcription_policy',
  'deterministic transcription policy shape pass',
  'shape-only policy evidence; source truth is transcription_source_backing',
  ${sqlJson(evidence)},
  qa_checked_value_hash('meaning_language_entry', ${sqlString(row.meaning_id)}, ${sqlString(row.language_code)}, 'transcription_policy')
);
`);
  }

  statements.push("commit;");
  await psqlExec(statements.join("\n"), 1024 * 1024 * 80);
  console.log(`Transcription policy evidence written for ${setId}: ${passRows.length} row(s), batch_id=${batchId}`);
}

if (writeEvidence) {
  await writeEvidenceRows(rows);
}

console.log(`Transcription policy shape OK for ${setIds.join(", ")}: ${rows.length} language entry row(s).`);
