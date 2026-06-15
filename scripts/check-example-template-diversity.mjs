#!/usr/bin/env node
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import {
  buildExampleTemplateDiversityFindings,
  formatExampleTemplateDiversityFinding,
} from "./lib/example-template-diversity.mjs";

const setIds = process.argv.slice(2);
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-example-template-diversity.mjs <set_id> [<set_id> ...]");
}
for (const setId of setIds) assertSafeSetId(setId);

const rows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    e.set_id,
    msm.display_order,
    e.meaning_id,
    e.example_id,
    e.canonical_example_en,
    e.semantic_scene
  from meaning_examples e
  join meaning_set_memberships msm
    on msm.set_id = e.set_id
   and msm.meaning_id = e.meaning_id
  where e.set_id in (${sqlLiteralList(setIds)})
    and e.example_role = 'context'
    and msm.quality_status <> 'blocked'
  order by e.set_id, msm.display_order
) rows;
`);

const findings = buildExampleTemplateDiversityFindings(rows);
if (findings.blockers.length > 0) {
  console.error(`Example template diversity check failed for ${setIds.join(", ")}: ${findings.blockers.length} blocker(s).`);
  for (const blocker of findings.blockers) console.error(formatExampleTemplateDiversityFinding(blocker));
  process.exit(1);
}

if (findings.warnings.length > 0) {
  console.error(`Example template diversity warnings for ${setIds.join(", ")}: ${findings.warnings.length} warning(s).`);
  for (const warning of findings.warnings) console.error(formatExampleTemplateDiversityFinding(warning));
}

console.log(`Example template diversity OK for ${setIds.join(", ")}: ${rows.length} base example row(s), ${findings.warnings.length} warning(s).`);
