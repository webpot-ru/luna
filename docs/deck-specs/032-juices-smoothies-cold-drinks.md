# Deck Spec: Juices, Smoothies & Cold Drinks

## Identity

| Field | Value |
| --- | --- |
| Sort | 32 |
| Deck | Juices, Smoothies & Cold Drinks |
| `set_id` | `food_juices_smoothies_cold_drinks_a2` |
| Content type | Vocabulary |
| Domain | Food & Eating |
| Area | Beverages |
| Category / situation | Common juice, smoothie and non-alcoholic cold-drink names for everyday cafe, menu and home contexts |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, food_countability, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | food_countability, countability_mass_count, article_gender_marker_consistency, duplicate_reuse_review, compound_whole_meaning, scene_slot_strict, regional_variant_heavy, culturally_variable_food_terms, beverage_vs_container_sense, borrowed_menu_term_review, juice_drink_vs_fruit_or_ingredient_sense, cold_drink_temperature_scope, brand_generic_risk |
| Example complexity default | controlled simple examples; one cold drink, one glass/bottle/cup/tray/table/counter or temperature/ice state, no ordering dialogs, prices, recipes, alcohol context, brand names, personal preferences or unnecessary plural/case complexity |

## Scope

One learner-facing grouping principle: common A2 cold beverage vocabulary a learner may see on a cafe menu, juice bar menu, shop label or simple home context, without expanding into coffee, tea, alcohol, ingredients, equipment, tableware, service/payment or full fast-food scope.

Include:

- common fruit and vegetable juice names not already selected as broad A1 Drink Basics meanings, such as `grape juice`, `pineapple juice`, `cranberry juice`, `pomegranate juice`, `tomato juice`, `vegetable juice`, `carrot juice` and `mixed fruit juice`;
- common smoothie and blended-drink names such as `mango smoothie`, `banana smoothie`, `strawberry smoothie`, `berry smoothie`, `green smoothie`, `protein shake` and `fruit shake`;
- common non-alcoholic cold soft-drink terms such as `ginger ale`, `root beer`, `tonic water`, `club soda`, `flavored water`, `cucumber water`, `fruit punch`, `limeade`, `sparkling lemonade`, `sparkling juice`, `slushie` and `frozen lemonade`;
- broad Drink Basics meanings such as `juice`, `orange juice`, `apple juice`, `lemonade`, `smoothie`, `milkshake`, `soda`, `cola`, `iced tea`, `iced coffee`, `cold drink`, `energy drink`, `sports drink` and `coconut water` may appear as backup/reuse context, but this selected cut avoids changing their existing Drink Basics meaning fingerprints.

Exclude / move elsewhere:

- coffee drinks such as `iced latte`, `iced americano`, `iced mocha`, `cold brew` and `frappuccino` -> `Coffee & Espresso Drinks` or cafe options;
- tea/cafe cold drinks such as `bubble tea`, `iced matcha latte`, `iced chai latte` and detailed tea options -> `Tea & Hot Drinks` or `Cafe Drink Options`;
- alcoholic drinks such as `beer`, `wine`, `cocktail`, `hard cider`, `spiked lemonade` and `alcopop` -> `Alcoholic Drinks Basics` / `Bar & Alcohol Words`;
- ingredients, fruits, vegetables and extras such as `orange`, `apple`, `lemon`, `lime`, `syrup`, `ice`, `sugar`, `yogurt` and `protein powder` unless used only as example context or inside a selected whole drink phrase;
- containers and serving objects such as `glass`, `bottle`, `cup`, `straw`, `lid`, `tray` and `pitcher` -> tableware, fast-food or cafe-service decks;
- equipment and process words such as `juicer`, `blender`, `juice bar`, `refill`, `price`, `menu` and `order` -> kitchen small tools or restaurant/cafe service decks.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A2 |
| `level_max` | A2 |
| `frequency_band` scope | common/useful |
| `priority_band` scope | common/useful |
| Target item range | 30-30 |

## Candidate Pool Rule

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/food_juices_smoothies_cold_drinks_a2_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside juice/smoothie/cold-drink vocabulary, disambiguate drink-vs-fruit/ingredient/equipment/container/brand/alcohol senses, and avoid silently pulling in coffee, tea, alcohol, cafe service, equipment, tableware, payment or fast-food scope.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include valid in-scope cold-drink candidates deferred because the selected cut stays A2 and portable across languages, including exact Drink Basics meanings retained only as backup/reuse context. Excluded rows must state the target deck or reason. If the candidate pool reveals unresolved scope leakage, duplicate risk, weak source support, non-portable examples, regional ambiguity, brand/trademark ambiguity or cross-language target examples that drift away from the English canonical scene, stop at `spec_ready` and ask for user confirmation instead of generating.

Preparation checks to run before approval:

```bash
node scripts/check-deck-candidate-pool.mjs food_juices_smoothies_cold_drinks_a2
node scripts/check-word-selection-quality.mjs food_juices_smoothies_cold_drinks_a2
node scripts/check-deck-specs.mjs
```

Preparation status on 2026-06-04: the user approved continuing with the next ordinary deck and asked to check the words before generation. `check-deck-candidate-pool`, `check-word-selection-quality` and `check-deck-specs` passed; the one word-selection warning is expected because this deck deliberately consists mostly of multiword beverage names. Candidate pool: 70 rows with 30 selected, 20 backup and 20 excluded/move decisions. The selected cut deliberately keeps broad Drink Basics meanings such as `juice`, `orange juice`, `apple juice`, `lemonade`, `smoothie`, `milkshake`, `soda`, `cola`, `iced tea`, `iced coffee`, `cold drink`, `energy drink`, `sports drink` and `coconut water` as backup/reuse context instead of reusing or mutating their Drink Basics meaning fingerprints.

Generation status on 2026-06-04: completed through `scripts/run-deck-production.mjs` with 30 cards and all 54 language variants. Final QA, source-backed transcription evidence, QA hash coverage, final export, Google Sheet upload/readback, post-final linguistic audit and delivery freshness passed. Delivery: Google Sheet `1GCK51IYOd2mmbwUyAaeWvxYjyV5h6HusWGJPRoNRV38`, title `FlashcardsLuna 032 of 180 - Juices, Smoothies & Cold Drinks`, workbook `outputs/google-sheets/FlashcardsLuna_juices-smoothies-cold-drinks_final.xlsx`, sha256 `cae71c62072eede9afe1909e93b1a2746d7845e6e6e2f74cabfc58266da8b652`, post-final audit 1620/1620 pass with 0 needs_review and 0 fail.

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck: `Cafe Drink Options` (Sort 33), if it receives its own spec/candidate pool and approval;
- related later decks: `Fast Food Basics`, `Sauces & Extras`, `Takeaway & Dine-In Words`, `Alcoholic Drinks Basics`, `Bar & Alcohol Words`, `Basic Ingredients & Spices`, `Grocery Shopping Words` and cafe equipment/service decks.

## QA Notes

- semantic_scene requirements: preserve the target juice/smoothie/cold drink, drink style/fruit/vegetable/base option, glass/bottle/cup/tray/table/counter or temperature/ice state, and the beverage noun sense. The English canonical example remains the scene source for every target language.
- duplicate policy: already generated Drink Basics meanings such as `juice`, `orange juice`, `apple juice`, `lemonade`, `smoothie`, `milkshake`, `soda`, `cola`, `iced tea`, `iced coffee`, `cold drink`, `energy drink`, `sports drink` and `coconut water` are not selected in this cut, because their existing category fingerprint belongs to Drink Basics. This deck covers more specific juice, smoothie and cold-drink menu terms instead of creating quiet duplicate meaning IDs.
- language-specific risks: borrowed menu terms, regional variants, article/gender markers, mass/count drink nouns, classifiers/counters, juice drink vs fruit/ingredient senses, cold drink vs temperature adjective scope, carbonated-water terms and compounds that may be copied literally rather than treated as whole drink/menu terms.
- examples: keep English examples short and concrete, for example `The grape juice is in the glass.` or `The green smoothie is cold.` Avoid generic templates like `This is juice`, ordering phrases, prices, first-person preferences, recipe instructions, health claims and examples that target languages can match while drifting away from English.
- selected compounds require whole-meaning proof: `grape juice`, `pineapple juice`, `cranberry juice`, `pomegranate juice`, `tomato juice`, `vegetable juice`, `carrot juice`, `beet juice`, `mixed fruit juice`, `fresh juice`, smoothie/shake names, `flavored water`, `cucumber water`, `ginger ale`, `root beer`, `tonic water`, `club soda`, `sparkling lemonade`, `sparkling juice`, `slushie` and `frozen lemonade` must stay whole beverage/menu meanings, not literal component-only translations.
- source-backed checks needed after approval: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency, food-countability/profile gates, regional variant quality where applicable and final linguistic audit.
