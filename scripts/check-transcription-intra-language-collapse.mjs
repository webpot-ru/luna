#!/usr/bin/env node
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import { buildIntraLanguageTranscriptionCollapseFindings } from "./lib/transcription-shape.mjs";

const setIds = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-transcription-intra-language-collapse.mjs <set_id> [<set_id> ...]");
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
    and l.transcription_kind = 'romanization'
  order by msm.set_id, le.language_code, msm.display_order
) rows;
`);

const findings = buildIntraLanguageTranscriptionCollapseFindings(rows);

if (findings.length > 0) {
  console.error(
    `Intra-language transcription collapse check failed for ${setIds.join(", ")}: ${findings.length} blocker(s).`
  );
  for (const finding of findings.slice(0, 20)) {
    const sample = finding.affected_rows
      .slice(0, 8)
      .map((row) => `${row.meaning_id}/${row.canonical_english}="${row.transcription}"`)
      .join("; ");
    console.error(
      [
        finding.set_id,
        finding.language_code,
        `normalized="${finding.normalized_transcription}"`,
        `rows=${finding.row_count}/${finding.total_rows}`,
        sample,
      ].join(" ")
    );
  }
  const hidden = findings.length - 20;
  if (hidden > 0) console.error(`... +${hidden} more`);
  process.exit(1);
}

console.log(
  `Intra-language transcription collapse OK for ${setIds.join(", ")}: ${rows.length} romanization row(s).`
);
