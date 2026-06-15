# Deck Spec: Meals & Taste

## Identity

| Field | Value |
| --- | --- |
| Sort | 28 |
| Deck | Meals & Taste |
| `set_id` | `food_meals_taste_a1_a2` |
| Content type | Vocabulary |
| Domain | Food & Eating |
| Area | Meals & Taste |
| Category / situation | Basic meal names, portions and simple taste/texture words for everyday food contexts |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, adjective_state, food_countability, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | mixed_lexical_profile, food_countability, countability_mass_count, article_gender_marker_consistency, duplicate_reuse_review, compound_whole_meaning, scene_slot_strict, regional_variant_heavy, culturally_variable_food_terms, taste_vs_texture_sense, temperature_vs_spice_sense |
| Example complexity default | controlled simple examples; one food or meal item, one taste/texture/temperature state, no recipes, prices, restaurant dialogs, opinions with first person, or unnecessary plural/case complexity |

## Scope

One learner-facing grouping principle: common A1-A2 meal nouns and basic taste/texture/temperature adjectives that help a learner describe simple food without entering restaurant-service, cooking-process, ingredient or advanced cuisine scope.

Include:

- common meal-event nouns such as `meal`, `breakfast`, `lunch`, `dinner`, `snack` and `dessert`;
- basic meal-structure/portion words such as `main course`, `side dish`, `appetizer`, `portion` and `serving`;
- basic food taste words such as `sweet`, `salty`, `sour`, `bitter`, `spicy`, `mild`, `plain`, `bland`, `delicious` and `flavor`;
- basic food temperature/texture/state adjectives such as `hot`, `cold`, `warm`, `fresh`, `stale`, `raw`, `cooked`, `soft`, `hard`, `crunchy`, `crispy`, `creamy`, `juicy` and `dry`;
- intentional surface duplicates from earlier food/core decks when the selected meaning is a different meal/taste sense and the deck-domain fingerprint should remain independent.

Exclude / move elsewhere:

- ingredients, spices and pantry words such as `salt`, `sugar`, `oil`, `flour`, `pepper`, `vinegar` and `spice` -> `Basic Ingredients & Spices`;
- beverage words such as `coffee`, `tea`, `juice`, `soda`, `smoothie` and `lemonade` -> beverage decks;
- restaurant-service and ordering words such as `menu`, `waiter`, `bill`, `tip`, `order`, `takeaway` and `dine-in` -> `Restaurant Words`, `Fast Food Basics` or `Takeaway & Dine-In Words`;
- prepared fast-food/dish names such as `burger`, `fries`, `hot dog`, `pizza slice`, `sushi` and `kebab` -> fast-food or cuisine-specific decks;
- cooking-process words such as `boiled`, `fried`, `grilled`, `baked`, `roasted`, `overcooked` and `undercooked` -> cooking-method or ingredients/preparation decks unless a later taste/state deck explicitly selects them;
- advanced sensory words such as `savory`, `umami`, `tangy`, `zesty`, `smoky`, `flaky`, `chewy`, `tender`, `aromatic`, `aftertaste` and `texture` -> later food-description expansion.

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

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/food_meals_taste_a1_a2_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside basic meal/taste/texture vocabulary, disambiguate taste-vs-texture, temperature-vs-spice and surface duplicates, and avoid silently pulling in restaurant-service, cooking-method, ingredient, beverage, fast-food or advanced sensory words.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include valid in-scope candidates deferred because the selected cut stays strictly A1-A2 and portable across languages. Excluded rows must state the target deck or reason. If the candidate pool reveals unresolved scope leakage, duplicate risk, taste/texture ambiguity, weak source support, non-portable examples or cross-language target examples that drift away from the English canonical scene, stop at `spec_ready` and ask for user confirmation instead of promoting the deck.

Preparation checks to run before approval:

```bash
node scripts/check-deck-candidate-pool.mjs food_meals_taste_a1_a2
node scripts/check-word-selection-quality.mjs food_meals_taste_a1_a2
node scripts/check-deck-specs.mjs
```

Preparation status on 2026-05-25: spec and candidate pool prepared, checked and explicitly approved by the user for generation. Production status on 2026-05-26: the deck completed `scripts/run-deck-production.mjs` through prepare/base/draft-preflight/batch-import/qa/export/deliver/complete, with 36 selected cards and 1,944 language rows. Final Google Sheet: `FlashcardsLuna 028 of 180 - Meals & Taste` / `1Sh2U_au-o7wTnR5nwXfsMEprfevVds_GrPYFJuzHX1E`; Google Sheet readback, post-final audit 1,944/1,944 and delivery freshness pass.

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck: `Drink Basics` (Sort 29), if it receives its own spec/candidate pool and explicit approval;
- related later decks: `Basic Ingredients & Spices`, `Drink Basics`, `Fast Food Basics`, `Restaurant Words`, `Sauces & Extras`, `Bakery & Pastry`, `Sweets & Snacks` and food-description expansion decks.

## QA Notes

- semantic_scene requirements: preserve the target meal/taste/texture word, the simple food item and the taste/temperature/texture state. The English canonical example remains the scene source for every target language.
- duplicate policy: repeated surfaces from earlier decks are allowed only as independent deck-domain rows when the meaning note proves a distinct meal/taste/texture sense. Do not reuse prior meaning IDs unless the taxonomy fingerprint is compatible and the runner accepts the reuse.
- language-specific risks: adjective position/agreement, predicative vs attributive adjective forms, taste-vs-texture collapse, temperature-vs-spice ambiguity for `hot` and `mild`, article/gender markers for meal nouns, mass/count portion wording and regional variants for `appetizer` / `starter`, `flavor` / `flavour` and meal names.
- examples: keep English examples short and concrete, for example `The soup tastes salty.` or `Lunch is in the box.` Avoid generic templates like `This is tasty`, avoid first-person opinions like `I like dinner`, and avoid examples that all target languages can match while drifting away from English.
- selected compounds require whole-meaning proof: `main course` and `side dish` must stay meal-course terms, not literal component translations.
- source-backed checks needed after approval: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency, food-countability/profile gates, regional variant quality where applicable and final linguistic audit.
