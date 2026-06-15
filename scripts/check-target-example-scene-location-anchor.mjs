#!/usr/bin/env node
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import {
  buildTargetExampleSceneLocationAnchorFindings,
  formatTargetExampleSceneLocationAnchorFinding,
} from "./lib/target-example-scene-location-anchor.mjs";

const setIds = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (setIds.length === 0) {
  throw new Error("Usage: node scripts/check-target-example-scene-location-anchor.mjs <set_id> [<set_id> ...]");
}
for (const setId of setIds) assertSafeSetId(setId);

const rows = await psqlJson(`
with target_rows as (
  select
    msm.set_id,
    msm.display_order,
    mu.meaning_id,
    mu.canonical_english,
    e.example_id,
    e.canonical_example_en,
    e.semantic_scene,
    case
      when e.semantic_scene->>'state_or_location' ~* '^(next to|in front of|on top of|inside|outside|against|beside|behind|under|above|near|by|on|in|at) (the |a |an )?.+'
      then lower(regexp_replace(
        regexp_replace(
          regexp_replace(e.semantic_scene->>'state_or_location',
            '^(next to|in front of|on top of|inside|outside|against|beside|behind|under|above|near|by|on|in|at) (the |a |an )?',
            '',
            'i'
          ),
          '^(the |a |an )?',
          '',
          'i'
        ),
        '[^a-z0-9 ]+',
        ' ',
        'g'
      ))
      else null
    end as location_canonical_english,
    et.language_code,
    et.example_text
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_examples e
    on e.set_id = msm.set_id
   and e.meaning_id = msm.meaning_id
   and e.example_role = 'context'
  join meaning_example_translations et on et.example_id = e.example_id
  join languages l on l.code = et.language_code and l.is_active
  where msm.set_id in (${sqlLiteralList(setIds)})
    and msm.quality_status <> 'blocked'
),
location_entries as (
  select distinct on (tr.set_id, tr.meaning_id, tr.example_id, tr.language_code)
    tr.set_id,
    tr.meaning_id,
    tr.example_id,
    tr.language_code,
    tr.location_canonical_english,
    coalesce(le.word_with_article_or_marker, le.native_word) as location_display_word,
    le.native_word as location_native_word
  from target_rows tr
  join meaning_units loc_mu
    on lower(regexp_replace(loc_mu.canonical_english, '[^a-z0-9 ]+', ' ', 'g')) = tr.location_canonical_english
  join meaning_language_entries le
    on le.meaning_id = loc_mu.meaning_id
   and le.language_code = tr.language_code
  where nullif(trim(tr.location_canonical_english), '') is not null
  order by tr.set_id, tr.meaning_id, tr.example_id, tr.language_code, loc_mu.created_at desc nulls last, loc_mu.meaning_id
)
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    tr.set_id,
    tr.display_order,
    tr.meaning_id,
    tr.canonical_english,
    tr.example_id,
    tr.canonical_example_en,
    tr.semantic_scene,
    tr.language_code,
    tr.example_text,
    le.location_canonical_english,
    le.location_display_word,
    le.location_native_word
  from target_rows tr
  left join location_entries le
    on le.set_id = tr.set_id
   and le.meaning_id = tr.meaning_id
   and le.example_id = tr.example_id
   and le.language_code = tr.language_code
  order by tr.set_id, tr.display_order, tr.language_code
) rows;
`, 1024 * 1024 * 200);

const findings = buildTargetExampleSceneLocationAnchorFindings(rows);
if (findings.blockers.length > 0) {
  console.error(
    `Target-example scene location anchor failed for ${setIds.join(", ")}: ${findings.blockers.length} blocker(s).`
  );
  for (const blocker of findings.blockers.slice(0, 120)) {
    console.error(formatTargetExampleSceneLocationAnchorFinding(blocker));
  }
  const hidden = findings.blockers.length - 120;
  if (hidden > 0) console.error(`... +${hidden} more blocker(s)`);
  process.exit(1);
}

if (findings.warnings.length > 0) {
  console.error(
    `Target-example scene location anchor warnings for ${setIds.join(", ")}: ${findings.warnings.length} warning(s).`
  );
  for (const warning of findings.warnings.slice(0, 30)) {
    console.error(formatTargetExampleSceneLocationAnchorFinding(warning));
  }
  const hidden = findings.warnings.length - 30;
  if (hidden > 0) console.error(`... +${hidden} more warning(s)`);
}

console.log(
  `Target-example scene location anchor OK for ${setIds.join(", ")}: ${findings.checked} checked row(s), ${findings.skipped} skipped row(s), ${findings.warnings.length} warning(s).`
);
