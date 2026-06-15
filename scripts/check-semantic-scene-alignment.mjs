#!/usr/bin/env node
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import { buildSemanticSceneAlignmentBlockers } from "./lib/semantic-scene-alignment.mjs";

const setIds = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-semantic-scene-alignment.mjs <set_id> [<set_id> ...]");
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
    e.example_id,
    e.canonical_example_en,
    e.semantic_scene
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_examples e
    on e.set_id = msm.set_id
   and e.meaning_id = msm.meaning_id
   and e.example_role = 'context'
  where msm.set_id in (${sqlLiteralList(setIds)})
    and msm.quality_status <> 'blocked'
  order by msm.set_id, msm.display_order
) rows;
`);

const blockers = buildSemanticSceneAlignmentBlockers(rows);

if (blockers.length > 0) {
  console.error(
    `Semantic scene alignment check failed for ${setIds.join(", ")}: ${blockers.length} blocker(s).`
  );
  for (const blocker of blockers.slice(0, 160)) {
    console.error(
      `${blocker.set_id} #${blocker.display_order} ${blocker.meaning_id}: ${blocker.issue}; example="${blocker.canonical_example_en}"`
    );
  }
  const hidden = blockers.length - 160;
  if (hidden > 0) console.error(`... +${hidden} more`);
  process.exit(1);
}

console.log(`Semantic scene alignment OK for ${setIds.join(", ")}: ${rows.length} context example row(s).`);
