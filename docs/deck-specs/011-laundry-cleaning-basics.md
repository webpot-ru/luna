# Deck Spec: Laundry & Cleaning Basics

## Identity

| Field | Value |
| --- | --- |
| Sort | 11 |
| Deck | Laundry & Cleaning Basics |
| `set_id` | `home_laundry_cleaning_basics_a1_a2` |
| Content type | Vocabulary |
| Domain | Home |
| Area | Laundry & Cleaning |
| Category / situation | Household Laundry And Cleaning Basics |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, service_problem, transcription_high_risk |
| `risk_flags` | compound_whole_meaning, scene_slot_strict, article_gender_marker_consistency, duplicate_reuse_review, regional_variant_heavy |
| Example complexity default | controlled simple examples; add complexity only when required by `meaning_note` / `deck_profile` |

## Scope

This deck covers household laundry and general cleaning vocabulary: common appliances, containers, cleaning tools, laundry supplies, surface cleaners and simple cleaning-problem nouns. It is not a verb/action deck.

One learner-facing grouping principle: everyday home objects and supplies used to wash clothes, dry clothes, iron clothes, clean floors/surfaces and handle household dirt or waste.

Include:

- laundry objects and appliances such as `laundry`, `washing machine`, `dryer`, `laundry basket`, `laundry detergent`, `drying rack`, `iron` and `ironing board`;
- general household cleaning tools such as `vacuum cleaner`, `mop`, `bucket`, `broom`, `dustpan`, `duster`, `cleaning cloth`, `sponge` and `rubber gloves`;
- basic cleaning products such as `cleaning spray`, `floor cleaner`, `window cleaner`, `disinfectant`, `bleach`, `stain remover` and `fabric softener`;
- household waste items when useful for cleaning basics, such as `trash can` and `trash bag`;
- simple cleaning-problem nouns such as `stain` and `dirt` when examples stay concrete and learner-safe.

Exclude / move elsewhere:

- action verbs such as `to wash`, `to dry`, `to clean`, `to iron`, `to sweep`, `to mop` and `to vacuum`; move to `Practical Action Verbs`;
- kitchen-only dishwashing items such as `dish soap`, `dish sponge`, `dish brush`, dishwasher-specific products and kitchen paper towels; keep them in `Kitchen Storage & Cleaning` unless a whole-home reuse is explicitly selected;
- bathroom/personal-care items such as `soap`, `shampoo`, `bath towel`, `toilet brush` and toiletries; keep them in `Bathroom Essentials`, `Bathroom Toiletries` or `Personal Care`;
- services and places such as `laundromat`, `dry cleaner`, `laundry service` and `cleaning service`; move to service/place decks;
- safety-heavy chemicals or pest-control products beyond common household cleaners; move to `Home Safety` or `Pest Control Basics` if the usage is not simple A1-A2 household cleaning.

## Selected Set Shape

The selected set is exactly 35 cards:

- 16 laundry/clothing-care rows;
- 12 general cleaning tools and supplies;
- 5 cleaning products or waste items;
- 2 simple problem nouns (`stain`, `dirt`).

The pool is wider than the final set and keeps backup/excluded rows with move reasons. Surface overlap with existing room-specific decks is allowed only as an intentional learner-path duplicate; this deck uses its own `meaning_id` values and simple cleaning/laundry scenes.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A1 |
| `level_max` | A2 |
| `frequency_band` scope | common/useful |
| `priority_band` scope | common/useful |
| Target item range | 35-35 |

## Candidate Pool Rule

Build a candidate pool of at least 70 laundry/cleaning-adjacent nouns and noun phrases, then filter to exactly 35 selected cards. Selected rows must be common/useful for a household learner and must not depend on long explanations. Excluded rows must name the target deck or reason for delay.

Every selected row must have:

- `scope_decision`, `duplicate_reuse_decision`, `compound_multiword_risk`, `translation_risk` and `required_qa_profile`;
- a duplicate/reuse decision, especially for surface words already seen in kitchen, bathroom or bedroom decks;
- a short English canonical example with one item, one simple state/location and no unnecessary tense, possession or clause complexity;
- source/preflight risk notes for compounds, regional variants and chemicals.

## Next Deck

Natural next deck(s):

- operational next by Deck Master Plan: `Home Office & Desk` (Sort 12);
- nearby home continuation: `Home Structure & Exterior`, `Apartment Building & Common Areas`, `Outdoor Home & Garden`;
- later related decks: `Practical Action Verbs`, `Clothes Basics`, `Home Safety`, `Pest Control Basics`.

## QA Notes

- semantic_scene requirements: target object/problem noun, display word, subject number, simple location/state, present simple usage and household laundry/cleaning context must be explicit;
- language-specific risks: articles/gender/case for tools and products, classifiers/counters where required, region-sensitive waste words (`trash can`, `trash bag`) and cleaner/product distinctions;
- examples: use short concrete scenes such as `The mop is by the bucket.` or `The laundry detergent is on the shelf.`; do not use generic templates like `I need to clean...`;
- examples must preserve the English canonical scene across all target languages; target-language examples may adapt naturally but must keep the same item, location/state and simple usage;
- transcription risks: follow `docs/language-transcription-policy.md`; transcriptions are for the main card word/display form only;
- source-backed checks needed: translation coverage, entry-source backing where available, article/gender marker consistency, target example lexical anchor, semantic scene alignment, target example naturalness, transcription policy/style consistency and final linguistic audit.

## Duplicate Notes

Some selected surface words intentionally overlap with already delivered room-specific decks (`hanger`, `broom`, `dustpan`, `cleaning cloth`, `rubber gloves`, `cleaning spray`, `trash can`, `trash bag`). This is allowed because a learner may study Laundry & Cleaning Basics without studying kitchen, bedroom or bathroom decks first.

For this deck, duplicates are not forced to reuse old `meaning_id` values. The selected candidate pool records them as intentional surface duplicates with cleaning/laundry context, so examples and QA evidence can remain deck-specific.

## Generation Notes

Generate only through `scripts/run-deck-production.mjs`. Base deck data must be created from the selected candidate pool and this spec only.

Preferred base example style:

- `The washing machine is in the laundry room.`
- `The mop is by the bucket.`
- `The stain is on the shirt.`
- `The trash bag is in the trash can.`

## Delivery Status

Generated on 2026-05-13 through runner `run_home_laundry_cleaning_basics_a1_a2_20260513T075707240Z_b2779692`.

Final delivery:

- generated rows: 35 cards x 54 active language variants = 1890 language rows;
- final workbook: `outputs/google-sheets/FlashcardsLuna_home-laundry-cleaning-basics_final.xlsx`;
- Google Sheet: `FlashcardsLuna 011 of 180 - Laundry & Cleaning Basics` / `1KlVTYlpyBjxNj9vjRZcWKXVrIRZO2W5PI8CKVswaoBc`;
- final QA: runner QA passed; `check-qa-evidence`, source-backed transcription, translation source coverage, entry source-backed translations, transcription/style/fallback, script identity, article/gender, scene alignment, target lexical anchor, target pedagogical quality and QA hash coverage passed;
- post-final linguistic audit: 1890/1890 pass, 0 needs_review, 0 fail;
- Google Sheet readback: passed before and after audit import;
- delivery freshness: passed;
- sample audit: 5 rows per language, 270 checked rows, 0 blockers, 0 warnings after location-alias gate tuning.

Non-RU language variants remain `generated_checked`, not native-approved.
