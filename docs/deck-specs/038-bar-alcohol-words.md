# Deck Spec: Bar & Alcohol Words

## Identity

| Field | Value |
| --- | --- |
| Sort | 38 |
| Deck | Bar & Alcohol Words |
| `set_id` | `food_bar_alcohol_words_a2_b1` |
| Content type | Vocabulary |
| Domain | Food & Eating |
| Area | Beverages |
| Category / situation | Bar places, bar-service labels, non-alcoholic options and basic bar serving objects |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, food_countability, health_safety, service_problem, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | bar_service_scope, adult_alcohol_neutral_style, non_alcoholic_option_scope, food_countability, countability_mass_count, article_gender_marker_consistency, duplicate_reuse_review, compound_whole_meaning, scene_slot_strict, regional_variant_heavy, culturally_variable_food_terms, health_safety_specificity, payment_admin_boundary, legal_admin_boundary, restaurant_words_boundary, borrowed_menu_term_review, bar_place_vs_physical_bar_sense |
| Example complexity default | controlled simple examples; one bar/place/menu/label/object or service term, one concrete menu/counter/shelf/table/bar scene, neutral adult wording, no encouragement to drink, no intoxication, no medical claims, no prices, no payment-card data, no legal/ID checks and no long dialogues |

## Scope

One learner-facing grouping principle: common A2-B1 adult bar-context vocabulary that helps a learner recognize bar places, bar menus, serving styles, non-alcoholic alternatives and basic bar objects, without duplicating drink-name rows from `Alcoholic Drinks Basics` or drifting into payment, legal/admin, intoxication, health/safety or nightlife decks.

Include:

- bar/place and people words such as `bar`, `pub`, `wine bar`, `cocktail bar`, `beer garden`, `bartender`, `bar counter` and `bar stool`;
- bar menu/list/service labels such as `bar menu`, `drink menu`, `cocktail menu`, `wine list`, `beer list`, `happy hour`, `last call`, `on tap`, `draft beer` and `beer tap`;
- adult non-alcoholic option words such as `mocktail`, `non-alcoholic beer`, `alcohol-free wine` and `non-alcoholic drink`;
- basic mixer/garnish/bar-object words such as `mixer`, `garnish`, `cocktail shaker`, `ice bucket`, `wine glass`, `shot glass`, `beer glass`, `shot`, `wine bottle` and `corkscrew`;
- short learner-friendly lexical items and fixed phrases that can support simple scene-preserving examples.

Exclude / move elsewhere:

- alcoholic drink names already covered by `Alcoholic Drinks Basics`, such as `beer`, `wine`, `vodka`, `whiskey`, `champagne`, `mojito` and `margarita`, unless only used as example context;
- broad tableware/container words already covered elsewhere, such as generic `glass`, `bottle`, `cup`, `coaster`, `bar cart`, `bottle opener`, `pitcher` and `carafe`, unless a future explicit reuse retrofit is approved;
- payment/admin words such as `bar tab`, `bill`, `cover charge`, `tip`, `service charge`, `receipt` and card/payment vocabulary -> `Money & Payment` or restaurant/service decks;
- legal/admin words such as `ID card`, `age limit`, `license` and proof-of-age phrases -> documents/legal/admin decks;
- intoxication/health/safety words such as `drunk`, `hangover`, `alcohol poisoning`, `addiction` and `designated driver` -> health/safety decks;
- nightlife/venue and production/place words such as `nightclub`, `brewery`, `winery`, `vineyard`, `distillery` and `fermentation` -> leisure/travel/production decks;
- full ordering phrases, social invitations, encouragement to drink or safety advice -> out of current vocabulary-only scope.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Pre-Intermediate |
| `level_min` | A2 |
| `level_max` | B1 |
| `frequency_band` scope | useful |
| `priority_band` scope | useful |
| Target item range | 32-32 |

## Candidate Pool Rule

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/food_bar_alcohol_words_a2_b1_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside bar place/service labels, non-alcoholic options and basic bar-serving objects, while keeping alcohol wording neutral and adult-context only.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include valid adjacent bar/service or container candidates deferred because they are duplicate-heavy, too regional, too payment/legal-heavy or better suited to a later restaurant/nightlife deck. Excluded rows must state the target deck or reason. If the candidate pool reveals unresolved adult-safety, duplicate/reuse, source-support, scope, regional or example-portability ambiguity, stop at `spec_ready` and ask for user confirmation instead of generating.

Preparation checks to run before approval:

```bash
node scripts/check-deck-candidate-pool.mjs food_bar_alcohol_words_a2_b1
node scripts/check-word-selection-quality.mjs food_bar_alcohol_words_a2_b1
node scripts/check-deck-specs.mjs
```

Preparation status on 2026-06-11: spec and candidate pool were prepared as the next ordinary Deck Master Plan row after Sort 37. Candidate pool `outputs/candidate-pools/food_bar_alcohol_words_a2_b1_candidate_pool.jsonl` has 72 rows: 32 selected, 20 backup and 20 excluded/move decisions. User approval in-thread moved this deck to `approved_for_generation`.

Generation status on 2026-06-12: completed through `scripts/run-deck-production.mjs` prepare/base/draft-preflight/batch-import/QA/export/deliver/complete. Final delivery has 32 cards x 54 language variants = 1,728 language rows. Final workbook `outputs/google-sheets/FlashcardsLuna_bar-alcohol-words_final.xlsx` has sha256 `67c8c364c49456d6860342ce7ba08939def86f3955d384c542e9aeb8f15264be`; Google Sheet `FlashcardsLuna 038 of 180 - Bar & Alcohol Words` is `1iVvIbY79lUX2-ajjlgzGKipsqJ7P08J9WTPYvFFqRik`. Google Sheet readback, post-final linguistic audit `outputs/audit/final_linguistic_audit_food_bar_alcohol_words_a2_b1_20260612T113836Z_results_summary.json` (1,728/1,728 pass) and delivery freshness pass. Non-RU rows remain `generated_checked`, not native-approved.

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck: `Basic Ingredients & Spices` (Sort 39), if it receives its own spec/candidate pool and approval;
- related later decks: `Restaurant Words`, `Money & Payment`, `Cafe Service Words`, nightlife/travel, health/safety and food-production decks.

## QA Notes

- semantic_scene requirements: preserve the target bar word, place/service/menu/object/option sense and the simple menu/counter/shelf/table/bar scene. The English canonical example remains the scene source for every target language.
- duplicate policy: do not silently duplicate `Alcoholic Drinks Basics` drink-name rows or generated tableware/kitchen meanings. Generic `glass`, `bottle`, `menu`, `counter`, `receipt`, `bottle opener`, `bar cart`, `coaster`, `pitcher` and `carafe` are backup/excluded unless a future explicit reuse retrofit names a current `meaning_id`.
- language-specific risks: bar as place vs physical bar/rod/counter, pub/cocktail/wine bar cultural substitutes, bartender gender/register, draft/draught regional wording, happy hour/last call localization, non-alcoholic vs alcohol-free wording, mocktail borrowings, mixer/garnish broad senses, shot as serving vs firearm, wine bottle/glass object compounds, article/gender markers, classifier/counter choices and borrowed menu terms.
- examples: keep English examples short and concrete, for example `The bar menu is on the counter.`, `The mocktail is on the menu.` or `The shot glass is on the shelf.` Avoid `I want...`, party encouragement, intoxication, health claims, ages, IDs, prices, payment and long dialogues.
- selected compounds require whole-meaning proof: `wine bar`, `cocktail bar`, `beer garden`, `bar counter`, `bar stool`, `bar menu`, `drink menu`, `cocktail menu`, `wine list`, `beer list`, `happy hour`, `last call`, `on tap`, `draft beer`, `beer tap`, `non-alcoholic beer`, `alcohol-free wine`, `non-alcoholic drink`, `cocktail shaker`, `ice bucket`, `wine glass`, `shot glass`, `beer glass` and `wine bottle` must stay whole bar/menu/object meanings, not literal component-only translations.
- source-backed checks needed after approval: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency, food-countability/profile gates, health-safety neutral-style review, regional variant quality where applicable and final linguistic audit.
