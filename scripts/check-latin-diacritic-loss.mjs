#!/usr/bin/env node
import {
  buildLatinDiacriticLossFindings,
  formatLatinDiacriticLossFinding,
  latinDiacriticLossLanguageCodes,
} from "./lib/latin-diacritic-loss.mjs";
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";

const setIds = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-latin-diacritic-loss.mjs <set_id> [<set_id> ...]");
}
for (const setId of setIds) assertSafeSetId(setId);

const rows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
    msm.display_order,
    mu.meaning_id,
    le.language_code,
    le.native_word,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    le.word_with_article_or_marker,
    le.transcription,
    et.example_text
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_language_entries le on le.meaning_id = mu.meaning_id
  join meaning_examples e
    on e.set_id = msm.set_id
   and e.meaning_id = mu.meaning_id
   and e.example_role = 'context'
  join meaning_example_translations et
    on et.example_id = e.example_id
   and et.language_code = le.language_code
  where msm.set_id in (${sqlLiteralList(setIds)})
    and msm.quality_status <> 'blocked'
    and le.language_code in (${sqlLiteralList(latinDiacriticLossLanguageCodes)})
  order by msm.set_id, le.language_code, msm.display_order
) rows;
`);

const findings = buildLatinDiacriticLossFindings(rows);
if (findings.blockers.length > 0) {
  console.error(`Latin diacritic-loss check failed: ${findings.blockers.length} blocker(s).`);
  for (const blocker of findings.blockers.slice(0, 100)) {
    console.error(formatLatinDiacriticLossFinding(blocker));
  }
  if (findings.blockers.length > 100) console.error(`... +${findings.blockers.length - 100} more`);
  process.exit(1);
}

console.log(`Latin diacritic-loss OK: checked ${rows.length} row(s) for ${latinDiacriticLossLanguageCodes.join("/")}.`);
