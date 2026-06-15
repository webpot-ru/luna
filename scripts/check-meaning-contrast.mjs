#!/usr/bin/env node
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import {
  buildMeaningContrastFindings,
  formatMeaningContrastFinding,
} from "./lib/meaning-contrast.mjs";

const setIds = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-meaning-contrast.mjs <set_id> [<set_id> ...]");
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
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    et.example_text
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_examples e
    on e.set_id = msm.set_id
   and e.meaning_id = msm.meaning_id
   and e.example_role = 'context'
  join meaning_language_entries le on le.meaning_id = msm.meaning_id
  join meaning_example_translations et
    on et.example_id = e.example_id
   and et.language_code = le.language_code
  join languages l on l.code = le.language_code
  where msm.set_id in (${sqlLiteralList(setIds)})
    and msm.quality_status <> 'blocked'
    and l.is_active
  order by msm.set_id, le.language_code, msm.display_order
) rows;
`);

const { blockers, warnings } = buildMeaningContrastFindings(rows);

if (blockers.length > 0) {
  console.error(`Meaning contrast check failed for ${setIds.join(", ")}: ${blockers.length} blocker(s).`);
  for (const blocker of blockers.slice(0, 30)) console.error(formatMeaningContrastFinding(blocker));
  const hidden = blockers.length - 30;
  if (hidden > 0) console.error(`... +${hidden} more blocker(s)`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.error(`Meaning contrast warnings for ${setIds.join(", ")}: ${warnings.length} warning(s).`);
  for (const warning of warnings.slice(0, 30)) console.error(formatMeaningContrastFinding(warning));
  const hidden = warnings.length - 30;
  if (hidden > 0) console.error(`... +${hidden} more warning(s)`);
}

console.log(`Meaning contrast OK for ${setIds.join(", ")}: ${rows.length} row(s), ${warnings.length} warning(s).`);
