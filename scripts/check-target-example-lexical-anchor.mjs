#!/usr/bin/env node
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import {
  buildTargetExampleLexicalAnchorFindings,
  formatTargetExampleLexicalAnchorFinding,
} from "./lib/target-example-lexical-anchor.mjs";

const setIds = process.argv.slice(2);
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-target-example-lexical-anchor.mjs <set_id> [<set_id> ...]");
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
    et.language_code,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    le.native_word,
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

const findings = buildTargetExampleLexicalAnchorFindings(rows);
if (findings.blockers.length > 0) {
  console.error(`Target-example lexical anchor check failed for ${setIds.join(", ")}: ${findings.blockers.length} blocker(s).`);
  for (const blocker of findings.blockers) console.error(formatTargetExampleLexicalAnchorFinding(blocker));
  process.exit(1);
}

if (findings.warnings.length > 0) {
  console.error(`Target-example lexical anchor warnings for ${setIds.join(", ")}: ${findings.warnings.length} warning(s).`);
  for (const warning of findings.warnings.slice(0, 30)) console.error(formatTargetExampleLexicalAnchorFinding(warning));
  const hidden = findings.warnings.length - 30;
  if (hidden > 0) console.error(`... +${hidden} more warning(s)`);
}

console.log(`Target-example lexical anchor OK for ${setIds.join(", ")}: ${rows.length} example row(s), ${findings.warnings.length} warning(s).`);
