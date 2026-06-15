#!/usr/bin/env node
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import {
  buildArticleGenderMarkerFindings,
  formatArticleGenderMarkerFinding,
} from "./lib/article-gender-marker-consistency.mjs";

const setIds = process.argv.slice(2);
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-article-gender-marker-consistency.mjs <set_id> [<set_id> ...]");
}
for (const setId of setIds) assertSafeSetId(setId);

const rows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
    msm.display_order,
    le.meaning_id,
    le.language_code,
    le.native_word,
    le.word_with_article_or_marker,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    le.article_or_marker,
    le.gender,
    le.grammatical_number
  from meaning_set_memberships msm
  join meaning_language_entries le on le.meaning_id = msm.meaning_id
  where msm.set_id in (${sqlLiteralList(setIds)})
    and msm.quality_status <> 'blocked'
  order by msm.set_id, msm.display_order, le.language_code
) rows;
`);

const findings = buildArticleGenderMarkerFindings(rows);
if (findings.blockers.length > 0) {
  console.error(`Article/gender/marker consistency check failed for ${setIds.join(", ")}: ${findings.blockers.length} blocker(s).`);
  for (const blocker of findings.blockers) console.error(formatArticleGenderMarkerFinding(blocker));
  process.exit(1);
}

if (findings.warnings.length > 0) {
  console.error(`Article/gender/marker warnings for ${setIds.join(", ")}: ${findings.warnings.length} warning(s).`);
  for (const warning of findings.warnings.slice(0, 30)) console.error(formatArticleGenderMarkerFinding(warning));
  const hidden = findings.warnings.length - 30;
  if (hidden > 0) console.error(`... +${hidden} more warning(s)`);
}

console.log(`Article/gender/marker consistency OK for ${setIds.join(", ")}: ${rows.length} entry row(s), ${findings.warnings.length} warning(s).`);
