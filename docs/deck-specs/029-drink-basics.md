# Deck Spec: Drink Basics

## Identity

| Field | Value |
| --- | --- |
| Sort | 29 |
| Deck | Drink Basics |
| `set_id` | `food_drink_basics_a1` |
| Content type | Vocabulary |
| Domain | Food & Eating |
| Area | Beverages |
| Category / situation | Core A1 drink words and common beverage categories for everyday home, cafe and simple food contexts |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, food_countability, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | food_countability, countability_mass_count, article_gender_marker_consistency, duplicate_reuse_review, compound_whole_meaning, scene_slot_strict, regional_variant_heavy, culturally_variable_food_terms, beverage_vs_container_sense, drink_vs_verb_sense, brand_generic_risk, temperature_state_wording |
| Example complexity default | controlled simple examples; one drink item/category, one container/place or temperature state, no ordering dialogs, prices, recipes, alcohol context, brand-specific claims or unnecessary plural/case complexity |

## Scope

One learner-facing grouping principle: very common A1 beverage words that a learner can recognize, name or ask about in basic everyday contexts, without entering detailed cafe menus, alcohol, ingredients, restaurant-service or container/tableware scope.

Include:

- core drink nouns and categories such as `drink`, `water`, `milk`, `coffee`, `tea`, `juice`, `soda`, `cola` and `lemonade`;
- very common water and temperature/state drink phrases such as `tap water`, `still water`, `mineral water`, `sparkling water`, `cold drink` and `hot drink`;
- a small set of early learner-safe common drink compounds such as `orange juice`, `apple juice`, `hot chocolate`, `iced tea`, `iced coffee`, `smoothie`, `milkshake`, `soft drink`, `energy drink` and `sports drink`;
- high-frequency plant-milk and tea-category words only where they are short, portable and useful at A1-A2 boundary, such as `soy milk`, `oat milk`, `almond milk`, `herbal tea`, `green tea` and `black tea`;
- intentional surface duplicates from earlier food decks when the Drink Basics domain needs a self-contained beverage path and the selected meaning note keeps the drink sense explicit.

Exclude / move elsewhere:

- detailed coffee-shop drinks such as `espresso`, `latte`, `cappuccino`, `americano`, `mocha`, `macchiato`, `black coffee` and `coffee with milk` -> `Coffee & Espresso Drinks`;
- detailed tea or hot-drink words such as `chai`, `matcha`, `cocoa powder`, `mulled drink` and specialized herbal names -> `Tea & Hot Drinks`;
- detailed juice, smoothie and cold-drink expansion words such as `fruit juice`, `vegetable juice`, `grape juice`, `pineapple juice`, `tomato juice`, `protein shake`, `bubble tea` and flavor-specific drinks -> `Juices, Smoothies & Cold Drinks`;
- alcoholic drink words such as `beer`, `wine`, `cocktail`, `cider`, `vodka`, `whiskey` and `champagne` -> `Alcoholic Drinks Basics`;
- containers, serving objects and extras such as `bottle`, `glass`, `cup`, `straw`, `lid`, `ice`, `sugar` and `lemon` -> tableware, fast-food, cafe-options or ingredients decks unless used only as example context;
- service, payment and menu words such as `order`, `refill`, `menu`, `bill` and `price` -> restaurant/cafe service decks;
- brand-specific or trademark-like drink names such as `frappuccino` unless a later deck explicitly selects a generic learner-safe term.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Basic |
| `level_min` | A1 |
| `level_max` | A1 |
| `frequency_band` scope | core/common |
| `priority_band` scope | core/common |
| Target item range | 32-32 |

## Candidate Pool Rule

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/food_drink_basics_a1_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside core drink vocabulary, disambiguate beverage noun vs verb/container/brand senses, and avoid silently pulling in detailed cafe drinks, alcohol, service/menu/payment words, ingredients, containers or later cold-drink expansion words.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include valid beverage candidates deferred because the selected cut stays strictly A1 and portable across languages. Excluded rows must state the target deck or reason. If the candidate pool reveals unresolved scope leakage, duplicate risk, beverage/container ambiguity, weak source support, non-portable examples or cross-language target examples that drift away from the English canonical scene, stop at `spec_ready` and ask for user confirmation instead of promoting the deck.

Preparation checks to run before approval:

```bash
node scripts/check-deck-candidate-pool.mjs food_drink_basics_a1
node scripts/check-word-selection-quality.mjs food_drink_basics_a1
node scripts/check-deck-specs.mjs
```

Preparation status on 2026-05-26: spec and candidate pool were prepared after Sort 28 completion and promoted to `approved_for_generation` after candidate-pool, word-selection and deck-spec checks passed. Candidate pool: 76 rows with 32 selected, 22 backup and 22 excluded/move decisions. The only word-selection warning is expected checker category noise for a beverage-dominated deck; no unresolved scope, duplicate, weak-example, source-support or translation-risk blocker remains before generation.

## Generation Status

Post-reset runner delivery completed on 2026-05-26.

- Runner manifest: `outputs/runs/food_drink_basics_a1/run_food_drink_basics_a1_20260526T055433050Z_c0e20eb5.json`.
- Generated shape: 32 selected cards across 54 active language variants = 1,728 language rows.
- Narrow final QA repairs: expanded legitimate `on_the_counter` marker aliases in `scripts/lib/target-semantic-scene-alignment.mjs`, imported 6 scene-location example repairs and refreshed current QA/final-readiness evidence.
- Final workbook: `outputs/google-sheets/FlashcardsLuna_food-drink-basics_final.xlsx`.
- Final Google Sheet: `FlashcardsLuna 029 of 180 - Drink Basics` / `1X12EgGiLYz8TsAJJQvLcufWZhd-jVBwcFpjMIcsi6xM` in the required Drive folder.
- Final linguistic audit: `outputs/audit/final_linguistic_audit_food_drink_basics_a1_20260526T151111Z_results_summary.json`, 1,728/1,728 pass, 0 needs_review, 0 fail.
- Runner QA, Google Sheet readback, post-final audit import, re-export/same-file upload and delivery freshness all pass.
- Non-RU languages remain at most `generated_checked`; they are not native-approved.

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck: `Coffee & Espresso Drinks` (Sort 30), if it receives its own spec/candidate pool and explicit approval;
- related later decks: `Tea & Hot Drinks`, `Juices, Smoothies & Cold Drinks`, `Cafe Drink Options`, `Alcoholic Drinks Basics`, `Bar & Alcohol Words`, `Fast Food Basics`, `Sauces & Extras`, `Takeaway & Dine-In Words` and `Basic Ingredients & Spices`.

## QA Notes

- semantic_scene requirements: preserve the target beverage word/category, the simple drink/container/location or drink/temperature state and the beverage noun sense. The English canonical example remains the scene source for every target language.
- duplicate policy: repeated surfaces from earlier food decks such as `water` and `milk` are allowed only as independent beverage-domain rows when the meaning note proves a drink sense and the runner accepts the new deck-domain meaning.
- language-specific risks: mass/count drink nouns, classifiers/counters, article/gender markers, beverage-vs-container words, generic vs regional `soda` / `soft drink`, `still water` vs `sparkling water`, tea-category compounds, plant-milk compounds and brand-like drink names.
- examples: keep English examples short and concrete, for example `The tea is in the mug.` or `The sparkling water is cold.` Avoid generic templates like `This is a drink`, avoid first-person preference examples and avoid examples that all target languages can match while drifting away from English.
- selected compounds require whole-meaning proof: `hot chocolate`, `sparkling water`, `soft drink`, `energy drink`, `sports drink`, plant-milk compounds and tea-category compounds must stay beverage terms, not literal component translations.
- source-backed checks needed after approval: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency, food-countability/profile gates, regional variant quality where applicable and final linguistic audit.
