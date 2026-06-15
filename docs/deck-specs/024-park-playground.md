# Deck Spec: Park & Playground

## Identity

| Field | Value |
| --- | --- |
| Sort | 24 |
| Deck | Park & Playground |
| `set_id` | `park_playground_a1_a2` |
| Content type | Vocabulary |
| Domain | Nature & Weather / City & Transport |
| Area | Park & Playground |
| Category / situation | Public park places, playground equipment, simple outdoor play items and park amenities |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | compound_whole_meaning, scene_slot_strict, article_gender_marker_consistency, duplicate_reuse_review, regional_variant_heavy, public_place_scope |
| Example complexity default | controlled simple examples; one public park/playground object or place, one state/location, no unnecessary possession, clauses, counts or tense complexity |

## Scope

One learner-facing grouping principle: words a learner can point to or use in a public park or playground, including places, common amenities, playground equipment and simple outdoor play items.

Include:

- public park/playground places such as `park`, `playground`, `park entrance`, `park path`, `walking trail`, `picnic area`, `open field` and `dog park`;
- common public park amenities such as `park bench`, `picnic table`, `picnic blanket`, `pond`, `fountain`, `bridge`, `public restroom`, `drinking fountain`, `park sign` and `park shelter`;
- playground equipment such as `slide`, `swing`, `seesaw`, `sandbox`, `climbing frame`, `monkey bars`, `merry-go-round`, `playhouse` and `climbing wall`;
- simple outdoor play or mobility items often used around parks and playgrounds, such as `ball`, `kite`, `frisbee`, `scooter`, `bicycle`, `helmet`, `stroller` and `skateboard`;
- short learner-friendly lexical items only, with whole-meaning compounds preserved in examples and translations.

Exclude / move elsewhere:

- outdoor home/garden words already covered or better scoped there, such as `garden`, `yard`, `lawn`, `flower`, `tree`, `bush`, `hedge`, `soil`, `garden hose` and `lawn mower`;
- city/transport street vocabulary such as `sidewalk`, `street`, `bus stop`, `parking lot`, `parking meter`, `car park` and `bike lane`;
- sports-specific courts and activities such as `basketball court`, `soccer field`, `tennis court`, `skate park`, `swimming pool` and team-sport words unless a later sports deck explicitly selects them;
- animals, pet-care words, weather words, injuries, emergency/help words, food/drink words and travel/camping words unless the item is a concrete park/playground object selected here;
- advanced landscaping, ecology, botanical taxonomy, playground construction materials and administrative rule/signage terms.

## Selected Set Shape

The selected set is exactly 36 cards:

- 8 public park/playground place nouns;
- 7 public park amenity nouns;
- 9 playground equipment nouns;
- 8 outdoor play or mobility object nouns;
- 4 park scene/support nouns.

The pool is wider than the selected set and keeps backup/excluded rows with move reasons. Exact old surface words are avoided unless the selected meaning is a distinct public-park or playground compound with an explicit duplicate/reuse decision.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A1 |
| `level_max` | A2 |
| `frequency_band` scope | common |
| `priority_band` scope | common |
| Target item range | 36-36 |

## Candidate Pool Rule

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/park_playground_a1_a2_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside public park/playground vocabulary and must disambiguate English surfaces with competing senses, especially `park`, `swing`, `slide`, `bridge`, `fountain`, `field`, `shelter`, `bicycle`, `helmet`, `stroller`, `merry-go-round` and `frisbee`.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include adjacent park, play, sports, pet or public-place words that may become later decks or explicit duplicate reuse. Excluded rows must state the target deck or reason. If the candidate pool reveals unresolved duplicate risk, sports/city/food/weather leakage, weak compound translation support, non-portable examples, or cross-language target examples that drift away from the English canonical scene, stop at `spec_ready` and ask for user confirmation instead of promoting the deck.

Pre-generation checks passed on 2026-05-21:

```bash
node scripts/check-deck-candidate-pool.mjs park_playground_a1_a2
node scripts/check-word-selection-quality.mjs park_playground_a1_a2
node scripts/check-deck-specs.mjs
```

The 81-row pool has 36 selected, 20 backup and 25 excluded/move rows. The only word-selection warning is expected checker noise: the generic category heuristic does not yet have a park/playground category and labels most selected public-park/playground nouns as `other`; no unresolved scope, duplicate, weak-example, source-support or translation-risk blocker remains before generation.

The user approved continuing ordinary deck production on 2026-05-21 by asking to proceed to the next deck after Sort 23 completion without another confirmation. Generation must run through `scripts/run-deck-production.mjs`; no direct language batch imports are allowed outside the runner.

## Final Status

Completed through `scripts/run-deck-production.mjs` on 2026-05-21.

- final selected count: 36 cards;
- language coverage: 54 active language variants / 1,944 language rows;
- final workbook: `outputs/google-sheets/FlashcardsLuna_park-playground_final.xlsx`;
- Google Sheet: `FlashcardsLuna 024 of 180 - Park & Playground` / `1ZIy6OrpNgG3kbM1j4O9VEh6IJhG-heev9hcHJWi0DvI`;
- final audit: `outputs/audit/final_linguistic_audit_park_playground_a1_a2_20260521T160644Z_results_summary.json`, 1,944 pass / 0 needs_review / 0 fail;
- delivery: Google Sheet readback and `check-delivery-freshness` pass after post-final audit import and same-file Sheet refresh;
- statuses: deck/content set and meaning units are `generated_checked`; non-RU languages remain at most `generated_checked`, not native-approved.

2026-05-26 current-row QA refresh: after Course Metadata native-style changes, stale QA evidence was restored/refreshed for the current DB rows and the same Google Sheet was updated again. `bash scripts/db-qa-set.sh park_playground_a1_a2`, `node scripts/check-qa-evidence.mjs park_playground_a1_a2`, final export, Google Sheet readback, final audit `outputs/audit/final_linguistic_audit_park_playground_a1_a2_20260526T033338Z_results_summary.json` (1944/1944 pass) and delivery freshness pass.

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck is completed: `Food Basics` (Sort 25);
- related later decks: `Street & City Places`, `City Transport Basics`, `Weather & Nature Basics`, `Plants & Flowers`, `Animals Basics`, `Sports Basics`, `Pets Basics` and safety/emergency words.

## QA Notes

- semantic_scene requirements: preserve the target park/playground object or place, public-park/playground context, simple state/location and singular/plural role where present. The English canonical example remains the scene source for every target language.
- language-specific risks: public park vs vehicle parking, playground vs schoolyard, `swing` as seat/equipment vs verb, `slide` as equipment vs movement, `field` as open grassy area vs data field, `fountain` decorative vs drinking fountain, `public restroom` vs private bathroom, `frisbee` brand/generic variants and `merry-go-round` regional variants.
- examples: keep English examples short and concrete, for example `The slide is beside the sandbox.` or `The park bench is near the path.` Avoid generic templates like `This is a park`, avoid sports/team scenes and avoid examples that all target languages can match while drifting away from English.
- selected compounds require whole-meaning proof: `park entrance`, `park path`, `walking trail`, `picnic area`, `picnic table`, `park bench`, `public restroom`, `drinking fountain`, `park sign`, `climbing frame`, `monkey bars`, `merry-go-round`, `dog park`, `open field` and `park shelter` must not be approved by literal component translation alone.
- transcription risks: IPA languages need source-backed pronunciation for the displayed form; native-copy languages repeat display word; `ZH` requires tone-marked pinyin; `TH`/`LO`/`MY`/`KM`/`HY` strict high-risk lookup/style gates apply.
- source-backed checks needed: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency, regional variant quality where applicable and final linguistic audit.

## Generation Notes

Generate only through `scripts/run-deck-production.mjs`. Base deck data must be created from the selected candidate pool and this spec only.

Preferred base example style:

- `The park is near the school.`
- `The park bench is near the path.`
- `The slide is beside the sandbox.`
- `The kite is above the field.`
