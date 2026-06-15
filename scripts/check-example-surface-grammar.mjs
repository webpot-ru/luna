#!/usr/bin/env node
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import {
  buildExampleSurfaceGrammarFindings,
  formatExampleSurfaceGrammarFinding,
} from "./lib/example-surface-grammar.mjs";

const setIds = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-example-surface-grammar.mjs <set_id> [<set_id> ...]");
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
    e.canonical_example_en,
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
  order by msm.set_id, msm.display_order, et.language_code
) rows;
`);

const findings = buildExampleSurfaceGrammarFindings(rows);
if (findings.blockers.length > 0) {
  console.error(`Example surface grammar check failed for ${setIds.join(", ")}: ${findings.blockers.length} blocker(s).`);
  for (const blocker of findings.blockers.slice(0, 160)) {
    console.error(formatExampleSurfaceGrammarFinding(blocker));
  }
  const hidden = findings.blockers.length - 160;
  if (hidden > 0) console.error(`... +${hidden} more`);
  process.exit(1);
}

console.log(`Example surface grammar OK for ${setIds.join(", ")}: ${findings.checked} example row(s).`);
