#!/usr/bin/env node
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import {
  buildTargetExamplePedagogicalQualityFindings,
  formatTargetExamplePedagogicalQualityFinding,
} from "./lib/target-example-pedagogical-quality.mjs";

const setIds = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-target-example-pedagogical-quality.mjs <set_id> [<set_id> ...]");
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
    e.example_id,
    e.canonical_example_en,
    e.semantic_scene,
    et.language_code,
    et.example_text,
    coalesce(le.word_with_article_or_marker, le.native_word) as target_display_word
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
`, 1024 * 1024 * 160);

const findings = buildTargetExamplePedagogicalQualityFindings(rows);

if (findings.blockers.length > 0) {
  console.error(`Target-example pedagogical quality check failed for ${setIds.join(", ")}: ${findings.blockers.length} blocker(s).`);
  for (const blocker of findings.blockers.slice(0, 80)) console.error(formatTargetExamplePedagogicalQualityFinding(blocker));
  const hidden = findings.blockers.length - 80;
  if (hidden > 0) console.error(`... +${hidden} more blocker(s)`);
  process.exit(1);
}

if (findings.warnings.length > 0) {
  console.error(`Target-example pedagogical quality warnings for ${setIds.join(", ")}: ${findings.warnings.length} warning(s).`);
  for (const warning of findings.warnings.slice(0, 40)) console.error(formatTargetExamplePedagogicalQualityFinding(warning));
  const hidden = findings.warnings.length - 40;
  if (hidden > 0) console.error(`... +${hidden} more warning(s)`);
}

console.log(`Target-example pedagogical quality OK for ${setIds.join(", ")}: ${rows.length} example row(s), ${findings.warnings.length} warning(s).`);
