#!/usr/bin/env node
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import {
  buildEntryCrossLanguageFindings,
  formatEntryCrossLanguageBlocker,
  formatEntryCrossLanguageWarning,
} from "./lib/entry-cross-language-fallbacks.mjs";

const setIds = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-entry-cross-language-fallbacks.mjs <set_id> [<set_id> ...]");
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
    le.native_word,
    le.word_with_article_or_marker,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_language_entries le on le.meaning_id = msm.meaning_id
  join languages l on l.code = le.language_code
  where msm.set_id in (${sqlLiteralList(setIds)})
    and msm.quality_status <> 'blocked'
    and l.is_active
  order by msm.set_id, msm.display_order, le.language_code
) rows;
`);

const { blockers, warnings } = buildEntryCrossLanguageFindings(rows);

if (blockers.length > 0) {
  console.error(`Entry cross-language fallback check failed for ${setIds.join(", ")}: ${blockers.length} blocker(s).`);
  for (const blocker of blockers.slice(0, 20)) {
    console.error(`${blocker.set_id ?? "batch"}: ${formatEntryCrossLanguageBlocker(blocker)}`);
  }
  const hidden = blockers.length - 20;
  if (hidden > 0) console.error(`... +${hidden} more blocker(s)`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.error(`Entry cross-language fallback warnings for ${setIds.join(", ")}: ${warnings.length} warning(s).`);
  for (const warning of warnings.slice(0, 20)) console.error(formatEntryCrossLanguageWarning(warning));
  const hidden = warnings.length - 20;
  if (hidden > 0) console.error(`... +${hidden} more warning(s)`);
}

console.log(
  `Entry cross-language fallback OK for ${setIds.join(", ")}: ${rows.length} entry row(s), ${warnings.length} warning(s).`
);
