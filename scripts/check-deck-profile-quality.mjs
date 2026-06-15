#!/usr/bin/env node
import { assertSafeSetId, psqlJson, sqlString } from "./lib/qa-utils.mjs";
import {
  buildDeckProfileQualityFindings,
  formatDeckProfileFinding,
  resolveDeckProfileContext,
} from "./lib/deck-profile-policy.mjs";
import { resolveDeckSpec } from "./lib/deck-spec-utils.mjs";

const setId = process.argv[2];

if (!setId) {
  throw new Error("Usage: node scripts/check-deck-profile-quality.mjs <set_id>");
}

assertSafeSetId(setId);

let spec = null;
try {
  spec = resolveDeckSpec(setId).spec;
} catch {
  spec = null;
}

const rows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
    msm.display_order,
    mu.meaning_id,
    mu.canonical_english,
    mu.english_with_article,
    mu.part_of_speech,
    mu.meaning_note,
    mu.default_domain as domain,
    mu.default_area as area,
    mu.default_category as category,
    e.example_id,
    e.canonical_example_en,
    e.semantic_scene,
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
  left join meaning_example_translations et on et.example_id = e.example_id
  left join meaning_language_entries le
    on le.meaning_id = msm.meaning_id
   and le.language_code = et.language_code
  where msm.set_id = ${sqlString(setId)}
    and msm.quality_status <> 'blocked'
  order by msm.display_order, et.language_code
) rows;
`);

const context = resolveDeckProfileContext({ spec, rows });
const findings = buildDeckProfileQualityFindings(rows, context);

if (findings.blockers.length > 0) {
  throw new Error(
    `Deck profile quality check failed for ${setId}: ${findings.blockers.length} blocker(s).\n${findings.blockers
      .slice(0, 100)
      .map(formatDeckProfileFinding)
      .join("\n")}`
  );
}

console.log(
  `Deck profile quality OK for ${setId}: rows=${rows.length}, deck_profile=${context.deck_profile.join(",") || "inferred-none"}, risk_flags=${context.risk_flags.join(",") || "none"}`
);
