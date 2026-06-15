# Deck Spec: Cafe Drink Options

## Identity

| Field | Value |
| --- | --- |
| Sort | 33 |
| Deck | Cafe Drink Options |
| `set_id` | `food_cafe_drink_options_a2` |
| Content type | Vocabulary |
| Domain | Food & Eating |
| Area | Restaurant / Cafe |
| Category / situation | Short cafe menu options, add-ins, sizes and takeaway drink accessories for everyday cafe ordering and drink labels |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, adjective_state, food_countability, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | food_countability, countability_mass_count, article_gender_marker_consistency, duplicate_reuse_review, compound_whole_meaning, scene_slot_strict, regional_variant_heavy, culturally_variable_food_terms, beverage_vs_container_sense, cafe_option_scope, service_option_scope, borrowed_menu_term_review, dietary_option_wording, size_option_wording, takeaway_accessory_scope |
| Example complexity default | controlled simple examples; one cafe option/add-in/size/accessory, one menu/label/cup/drink/counter scene, no full ordering dialogues, prices, payment, personal preferences, recipes, alcohol context or unnecessary plural/case complexity |

## Scope

One learner-facing grouping principle: common A2 cafe drink-option vocabulary a learner may see on a cafe menu, cup label or takeaway counter, without expanding into full drink names, restaurant service phrases, payment/admin words, equipment, food items, alcohol or broad ingredients outside the cafe drink-option sense.

Include:

- short cafe drink options and labels such as `ice`, `extra ice`, `light ice`, `no ice`, `no sugar`, `decaf`, `caffeine-free`, `dairy-free`, `lactose-free`, `hot` and `iced`;
- common drink add-ins and toppings such as `sugar`, `sweetener`, `syrup`, `vanilla syrup`, `caramel syrup`, `chocolate syrup`, `whipped cream`, `milk foam`, `foam`, `topping`, `lemon slice` and `cinnamon`;
- common size and takeaway/accessory vocabulary such as `small size`, `medium size`, `large size`, `takeaway cup`, `lid`, `straw` and `cup holder`;
- related broad meanings already generated elsewhere, such as `milk`, `soy milk`, `oat milk`, `almond milk`, `cream`, `lemon`, `cup`, `coffee`, `tea` and drink names, may appear as backup/reuse or excluded context, but the selected cut avoids changing their existing meaning fingerprints.

Exclude / move elsewhere:

- full drink names such as `coffee`, `tea`, `latte`, `cappuccino`, `espresso`, `juice`, `smoothie`, `milkshake`, `bubble tea`, `kombucha`, `frappuccino` and seasonal drink names -> drink-name decks;
- alcoholic drinks such as `beer` and `wine` -> alcohol decks;
- service/payment/place/job words such as `barista`, `cafe`, `order`, `price`, `menu` and `receipt` -> restaurant/service/payment decks;
- equipment such as `espresso machine`, `coffee grinder`, `milk frother` and detailed cafe tools -> cafe equipment or kitchen small tools;
- broad ingredients or food items not used as cafe drink options -> Basic Ingredients & Spices or later food decks.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A2 |
| `level_max` | A2 |
| `frequency_band` scope | survival/common |
| `priority_band` scope | survival/common |
| Target item range | 30-30 |

## Candidate Pool Rule

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/food_cafe_drink_options_a2_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside short cafe drink-option vocabulary and disambiguate option/add-in/accessory senses from full drink names, ingredients, equipment, service phrases, payment, place/job words and alcohol scope.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include valid adjacent cafe option/accessory candidates deferred because the selected cut stays A2, portable and not too equipment/service-heavy. Excluded rows must state the target deck or reason. If the candidate pool reveals unresolved scope leakage, duplicate risk, weak source support, non-portable examples, regional ambiguity, brand/trademark ambiguity or cross-language target examples that drift away from the English canonical scene, stop at `spec_ready` and ask for user confirmation instead of generating.

Preparation checks to run before approval:

```bash
node scripts/check-deck-candidate-pool.mjs food_cafe_drink_options_a2
node scripts/check-word-selection-quality.mjs food_cafe_drink_options_a2
node scripts/check-deck-specs.mjs
```

Preparation and delivery status on 2026-06-05: spec and machine-readable candidate pool were prepared for the next ordinary Deck Master Plan row after Sort 32. Candidate pool: 70 rows with 30 selected, 20 backup and 20 excluded/move decisions. `check-deck-candidate-pool`, `check-word-selection-quality` and `check-deck-specs` pass; the only word-selection warning is expected checker noise because the generic category heuristic does not yet classify cafe-option rows and labels 29/30 selected rows as `other`. After user approval, generation completed through `scripts/run-deck-production.mjs`: 30 cards x 54 languages, final Google Sheet `FlashcardsLuna 033 of 180 - Cafe Drink Options` / `11SRlihU-xsVgc0ovk1ox4KM3ATPYcfX7c5fFK1t2jTk`, readback, post-final audit 1620/1620 and delivery freshness pass. Non-RU remains generated_checked, not native-approved.

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck: `Fast Food Basics` (Sort 34), if it receives its own spec/candidate pool and approval;
- related later decks: `Sauces & Extras`, `Takeaway & Dine-In Words`, `Restaurant Words`, `Cafe Food & Table Items`, `Cafe Service Words`, `Basic Ingredients & Spices`, cafe equipment decks and alcohol decks.

## QA Notes

- semantic_scene requirements: preserve the target cafe option/add-in/size/accessory, the menu/label/cup/drink/counter scene, and the option sense. The English canonical example remains the scene source for every target language.
- duplicate policy: broad drink, dairy, fruit, tableware and ingredient words already generated elsewhere are not silently duplicated as ordinary meanings. If selected here, they must be selected only as a cafe-option sense with a distinct meaning note and simple option scene; otherwise keep as backup/excluded.
- language-specific risks: borrowed cafe terms, regional labels for sizes and takeaway items, article/gender markers, mass/count add-ins, classifier/counter choices, straw vs plant straw, lid vs pot lid, ice vs ice cream/weather, syrup vs medicine syrup, and option phrases that may be copied literally rather than treated as menu labels.
- examples: keep English examples short and concrete, for example `The label says no ice.`, `The small size is on the menu.` or `The straw is beside the drink.` Avoid full-ordering phrases like `I want...`, prices, customer dialogue, payment/admin context and examples that target languages can match while drifting away from English.
- selected compounds require whole-meaning proof: `extra ice`, `light ice`, `no ice`, `no sugar`, `vanilla syrup`, `caramel syrup`, `chocolate syrup`, `whipped cream`, `milk foam`, `lemon slice`, `caffeine-free`, `dairy-free`, `lactose-free`, `small size`, `medium size`, `large size`, `takeaway cup` and `cup holder` must stay whole cafe/menu meanings, not literal component-only translations.
- source-backed checks needed after approval: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency, food-countability/profile gates, regional variant quality where applicable and final linguistic audit.
