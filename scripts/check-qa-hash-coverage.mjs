#!/usr/bin/env node
import { assertSafeSetId, psqlJson, sqlString } from "./lib/qa-utils.mjs";
import { requiredHashFamilies } from "./lib/qa-hash-coverage.mjs";

const setId = process.argv[2] ?? "";
if (!setId) {
  throw new Error("Usage: node scripts/check-qa-hash-coverage.mjs <set_id>");
}
assertSafeSetId(setId);

const sampleRows = await psqlJson(`
with first_item as (
  select
    msm.set_id,
    msm.meaning_id,
    e.example_id
  from meaning_set_memberships msm
  join meaning_examples e
    on e.set_id = msm.set_id
   and e.meaning_id = msm.meaning_id
   and e.example_role = 'context'
  where msm.set_id = ${sqlString(setId)}
    and msm.quality_status <> 'blocked'
  order by msm.display_order
  limit 1
)
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    set_id,
    meaning_id,
    example_id::text,
    set_id || '::' || meaning_id as card_key,
    set_id || '::' || meaning_id || '::' || example_id::text as context_example_key
  from first_item
) rows;
`);

if (sampleRows.length !== 1) {
  throw new Error(`No active sample row found for ${setId}`);
}

const sample = sampleRows[0];
const blockers = [];

for (const family of requiredHashFamilies) {
  const targetKey = sample[family.target_key_kind];
  const rows = await psqlJson(`
select json_agg(row_to_json(rows))
from (
  select qa_checked_value_hash(
    ${sqlString(family.target_type)},
    ${sqlString(targetKey)},
    ${sqlString(family.language_code)},
    ${sqlString(family.check_family)}
  ) as checked_value_hash
) rows;
`);
  const value = rows?.[0]?.checked_value_hash;
  if (typeof value !== "string" || value.trim() === "") {
    blockers.push(`${family.check_family} ${family.target_type} ${targetKey} ${family.language_code}`);
  }
}

if (blockers.length > 0) {
  console.error(`QA hash coverage check failed for ${setId}: ${blockers.length} missing hash target(s).`);
  for (const blocker of blockers) console.error(blocker);
  process.exit(1);
}

console.log(`QA hash coverage OK for ${setId}: ${requiredHashFamilies.length} required check family hash target(s).`);
