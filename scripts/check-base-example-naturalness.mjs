#!/usr/bin/env node
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import {
  buildBaseExampleNaturalnessFindings,
  formatBaseExampleNaturalnessBlocker,
  formatBaseExampleNaturalnessWarning,
} from "./lib/base-example-naturalness.mjs";

const setIds = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-base-example-naturalness.mjs <set_id> [<set_id> ...]");
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

const { blockers, warnings } = buildBaseExampleNaturalnessFindings(rows);

if (blockers.length > 0) {
  console.error(`Base example naturalness check failed for ${setIds.join(", ")}: ${blockers.length} blocker(s).`);
  for (const blocker of blockers.slice(0, 30)) console.error(formatBaseExampleNaturalnessBlocker(blocker));
  const hidden = blockers.length - 30;
  if (hidden > 0) console.error(`... +${hidden} more blocker(s)`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.error(`Base example naturalness warnings for ${setIds.join(", ")}: ${warnings.length} warning(s).`);
  for (const warning of warnings.slice(0, 30)) console.error(formatBaseExampleNaturalnessWarning(warning));
  const hidden = warnings.length - 30;
  if (hidden > 0) console.error(`... +${hidden} more warning(s)`);
}

console.log(`Base example naturalness OK for ${setIds.join(", ")}: ${rows.length} context example row(s), ${warnings.length} warning(s).`);
