#!/usr/bin/env node
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import { buildExampleCasingBlockers } from "./lib/example-casing.mjs";

const setIds = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-example-casing.mjs <set_id> [<set_id> ...]");
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
    e.example_id,
    et.language_code,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    le.native_word,
    le.word_with_article_or_marker,
    et.example_text
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_examples e
    on e.set_id = msm.set_id
   and e.meaning_id = msm.meaning_id
   and e.example_role = 'context'
  join meaning_example_translations et on et.example_id = e.example_id
  left join meaning_language_entries le
    on le.meaning_id = msm.meaning_id
   and le.language_code = et.language_code
  where msm.set_id in (${sqlLiteralList(setIds)})
    and msm.quality_status <> 'blocked'
  order by msm.set_id, msm.display_order, et.language_code
) rows;
`);

const blockers = buildExampleCasingBlockers(rows);

if (blockers.length > 0) {
  console.error(`Example casing check failed for ${setIds.join(", ")}: ${blockers.length} blocker(s).`);
  for (const blocker of blockers.slice(0, 160)) {
    console.error(
      `${blocker.set_id} ${blocker.language_code} ${blocker.meaning_id}: ${blocker.issue}; display="${blocker.display_word}"; example="${blocker.example_text}"`
    );
  }
  const hidden = blockers.length - 160;
  if (hidden > 0) console.error(`... +${hidden} more`);
  process.exit(1);
}

console.log(`Example casing OK for ${setIds.join(", ")}: ${rows.length} example row(s).`);
