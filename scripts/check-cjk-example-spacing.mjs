#!/usr/bin/env node
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import {
  buildCjkExampleSpacingFindings,
  formatCjkExampleSpacingFinding,
} from "./lib/cjk-example-spacing.mjs";

const setIds = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-cjk-example-spacing.mjs <set_id> [<set_id> ...]");
}

for (const setId of setIds) assertSafeSetId(setId);

const rows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
    msm.display_order,
    mu.meaning_id,
    e.example_id,
    et.language_code,
    et.example_text
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_examples e
    on e.set_id = msm.set_id
   and e.meaning_id = msm.meaning_id
   and e.example_role = 'context'
  join meaning_example_translations et on et.example_id = e.example_id
  where msm.set_id in (${sqlLiteralList(setIds)})
    and msm.quality_status <> 'blocked'
    and et.language_code in ('ZH', 'JA')
  order by msm.set_id, msm.display_order, et.language_code
) rows;
`);

const findings = buildCjkExampleSpacingFindings(rows);
if (findings.blockers.length > 0) {
  console.error(`CJK example spacing check failed for ${setIds.join(", ")}: ${findings.blockers.length} blocker(s).`);
  for (const blocker of findings.blockers.slice(0, 160)) {
    console.error(formatCjkExampleSpacingFinding(blocker));
  }
  const hidden = findings.blockers.length - 160;
  if (hidden > 0) console.error(`... +${hidden} more`);
  process.exit(1);
}

console.log(`CJK example spacing OK for ${setIds.join(", ")}: ${findings.checked} ZH/JA example row(s).`);
