# Deck Spec: Basic Ingredients & Spices

## Identity

| Field | Value |
| --- | --- |
| Sort | 39 |
| Deck | Basic Ingredients & Spices |
| `set_id` | `food_basic_ingredients_spices_a1_a2` |
| Content type | Vocabulary |
| Domain | Food & Eating |
| Area | Ingredients |
| Category / situation | Common pantry ingredients, baking ingredients and everyday spices |
| Status | approved_for_generation |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, food_countability, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | food_countability, countability_mass_count, article_gender_marker_consistency, duplicate_reuse_review, compound_whole_meaning, scene_slot_strict, regional_variant_heavy, culturally_variable_food_terms, ingredient_spice_scope, pantry_baking_scope, spice_vs_vegetable_sense, sauce_condiment_boundary, produce_boundary, recipe_words_boundary, borrowed_food_term_review |
| Example complexity default | controlled simple examples; one ingredient/spice, one jar/bag/bottle/packet/bowl/shelf/container scene, no recipes, prices, ordering dialogues, nutrition claims, allergy/medical claims or unnecessary plural/case complexity |

## Scope

One learner-facing grouping principle: common A1-A2 ingredient and spice vocabulary a learner can recognize in a kitchen, pantry, grocery label or simple cooking context, without turning the deck into sauces/extras, prepared foods, full recipes, vegetables, bakery items, diet labels or grocery-shopping service words.

Include:

- core pantry ingredients such as `salt`, `sugar`, `flour`, `oil`, `olive oil`, `vinegar`, `honey`, `yeast`, `starch` and `cornstarch`;
- basic baking or flavoring ingredients such as `baking powder`, `baking soda`, `vanilla`, `cocoa powder`, `breadcrumbs` and `sesame seeds`;
- everyday cooking aromatics and spices such as `garlic`, `onion`, `ginger`, `chili pepper`, `pepper`, `cinnamon`, `cumin`, `turmeric`, `paprika`, `curry powder`, `bay leaf`, `nutmeg`, `dried herbs`, `spices`, `seasoning` and `sesame oil`;
- simple ingredient examples with concrete jar/bag/bottle/packet/bowl/shelf/table scenes that can be preserved across all language pairs.

Exclude / move elsewhere:

- broad sauces/condiments and fast-food extras already covered by `Sauces & Extras`, such as `sauce`, `ketchup`, `mustard`, `mayonnaise`, `barbecue sauce`, `hot sauce`, `soy sauce`, `teriyaki sauce`, `salsa`, `ranch dressing`, `pickle`, `salt`/`pepper` as fast-food topping context and `sauce packet`, unless a future explicit duplicate-by-membership retrofit is approved;
- broad food staples and dairy already covered by `Food Basics` / `Meat, Fish & Dairy`, such as `bread`, `rice`, `pasta`, `egg`, `milk`, `butter`, `cream`, `cheese`, `yogurt` and prepared dishes;
- vegetables, fruit and greens whose primary deck is produce, such as `potato`, `tomato`, `cucumber`, `carrot`, `bell pepper`, `lettuce`, `basil`, `parsley`, `dill`, `coriander`, `green onion` and `spinach`;
- recipe/procedure words such as `recipe`, `ingredient` as an abstract recipe word, `step`, `mixture`, `batter`, `dough`, `to mix`, `to add` and `to season` -> `Recipes & Food Prep Words` / cooking-action decks;
- nutrition, diet, allergy, grocery-service, price, brand, package-size and advanced culinary terms unless a later specialized deck selects them.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A1 |
| `level_max` | A2 |
| `frequency_band` scope | core/common |
| `priority_band` scope | core/common |
| Target item range | 32-32 |

## Candidate Pool Rule

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/food_basic_ingredients_spices_a1_a2_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside common ingredient/spice vocabulary, disambiguate spice-vs-vegetable and ingredient-vs-sauce senses, and avoid silently pulling in prepared foods, broad dairy/staples, sauces/extras, herbs/greens, recipe procedure words, grocery-service words or advanced culinary terms.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include valid adjacent pantry/spice candidates deferred because they are more regional, advanced, duplicate-heavy, sauce-like, produce-like or better for a later specialized deck. Excluded rows must state the target deck or reason. If the candidate pool reveals unresolved scope leakage, duplicate risk, spice-vs-vegetable ambiguity, sauce/condiment boundary ambiguity, weak source support, non-portable examples, regional ambiguity or cross-language target examples that drift away from the English canonical scene, stop at `spec_ready` and ask for user confirmation instead of generating.

Preparation checks to run before approval:

```bash
node scripts/check-deck-candidate-pool.mjs food_basic_ingredients_spices_a1_a2
node scripts/check-word-selection-quality.mjs food_basic_ingredients_spices_a1_a2
node scripts/check-deck-specs.mjs
```

Preparation status on 2026-06-12: spec and candidate pool were prepared as the next ordinary Deck Master Plan row after Sort 38. Candidate pool `outputs/candidate-pools/food_basic_ingredients_spices_a1_a2_candidate_pool.jsonl` has 72 rows: 32 selected, 20 backup and 20 excluded/move decisions. `node scripts/check-deck-candidate-pool.mjs food_basic_ingredients_spices_a1_a2` passed, `node scripts/check-word-selection-quality.mjs food_basic_ingredients_spices_a1_a2` passed with one expected heuristic warning (`ingredients/spices` currently classify as `other`), and `node scripts/check-deck-specs.mjs` passed. User continuation approval in-thread moved this single deck to `approved_for_generation`. Generation is not current until the deck is completed through `scripts/run-deck-production.mjs`.

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck: `Grocery Shopping Words` (Sort 40), if it receives its own spec/candidate pool and approval;
- related later decks: `Vegetable Basics`, `Herbs & Greens`, `Bakery & Pastry`, `Sweets & Snacks`, `Recipes & Food Prep Words`, `Grocery Shopping Words`, `Restaurant Words`, diet/preference decks and advanced cuisine/ingredient decks.

## QA Notes

- semantic_scene requirements: preserve the target ingredient/spice, food/pantry sense, countability/mass role and the simple jar/bag/bottle/packet/bowl/shelf/table scene. The English canonical example remains the scene source for every target language.
- duplicate policy: repeated surfaces such as `salt`, `sugar`, `pepper`, `cinnamon`, `onion`, `soy sauce`, `butter` and `cream` must be explicit deck-domain decisions. This deck uses an ingredient/spice/pantry context; it must not silently duplicate a cafe-option, sauce-extra, broad food or dairy meaning with the wrong taxonomy fingerprint.
- language-specific risks: spice-vs-vegetable senses (`pepper`, `chili pepper`), oil as cooking oil not petroleum, vanilla as flavoring not plant/person name, starch/cornstarch regional naming, baking powder vs baking soda contrast, yeast as ingredient not infection, borrowed spice names, mass/count nouns, classifier/counter use, article/gender markers and culturally variable spice availability.
- examples: keep English examples short and concrete, for example `The flour is in the bag.`, `The cinnamon is in the jar.` or `The sesame seeds are in the bowl.` Avoid full recipe instructions, `I need...`, prices, nutrition claims, allergy/medical claims, brand names and examples that target languages can match while drifting away from English.
- selected compounds require whole-meaning proof: `olive oil`, `chili pepper`, `curry powder`, `baking powder`, `baking soda`, `cornstarch`, `cocoa powder`, `sesame seeds`, `dried herbs`, `bay leaf` and `sesame oil` must stay whole ingredient/spice meanings, not literal component-only translations.
- source-backed checks needed after approval: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency, food-countability/profile gates, regional variant quality where applicable and final linguistic audit.
