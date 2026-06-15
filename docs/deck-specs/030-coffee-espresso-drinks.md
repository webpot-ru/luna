# Deck Spec: Coffee & Espresso Drinks

## Identity

| Field | Value |
| --- | --- |
| Sort | 30 |
| Deck | Coffee & Espresso Drinks |
| `set_id` | `food_coffee_espresso_drinks_a2` |
| Content type | Vocabulary |
| Domain | Food & Eating |
| Area | Beverages |
| Category / situation | Common coffee-shop drink names and espresso-based drinks for everyday cafe/menu contexts |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, food_countability, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | food_countability, countability_mass_count, article_gender_marker_consistency, duplicate_reuse_review, compound_whole_meaning, scene_slot_strict, regional_variant_heavy, culturally_variable_food_terms, beverage_vs_container_sense, coffee_drink_vs_bean_or_place_sense, borrowed_menu_term_review, brand_generic_risk, cafe_option_scope |
| Example complexity default | controlled simple examples; one coffee drink, one cup/glass/mug/tray/counter/table or temperature/foam state, no ordering dialogs, prices, branded drink names, recipes, personal preferences or unnecessary plural/case complexity |

## Scope

One learner-facing grouping principle: common A2 coffee and espresso drink vocabulary a learner may see on a cafe menu or use to identify a drink, without expanding into cafe service, equipment, payment, alcohol, tea, juice/smoothie or ingredient decks.

Include:

- common coffee and espresso drink names such as `espresso`, `double espresso`, `americano`, `latte`, `cappuccino`, `flat white`, `macchiato`, `mocha` and `cold brew`;
- basic coffee option phrases that are learner-useful and short, such as `black coffee`, `coffee with milk`, `decaf coffee`, `instant coffee`, `filter coffee` and `drip coffee`;
- a small number of common iced coffee-menu drinks such as `iced latte`, `iced americano` and `iced mocha`;
- already covered general coffee terms such as `coffee` and `iced coffee` may appear as backup context, but the selected Sort 30 cut avoids changing their existing Drink Basics meaning fingerprints;
- regional coffee-menu terms only where useful enough for A2 and marked as regional-variant risk.

Exclude / move elsewhere:

- non-coffee drinks such as `tea`, `hot chocolate`, `juice`, `smoothie`, `milkshake`, `bubble tea`, `beer` and `wine` -> beverage, tea, cold-drink or alcohol decks;
- coffee equipment and supplies such as `coffee machine`, `espresso machine`, `coffee grinder`, `milk frother`, `coffee pod` and `coffee cup` -> cafe equipment, kitchen small tools or tableware decks;
- beans/grounds/ingredients such as `coffee bean`, `ground coffee`, `coffee grounds`, `caffeine`, `foam`, `sugar`, `syrup` and `creamer` -> ingredients/cafe-options decks unless used only as example context;
- service, menu, place, job and payment words such as `order`, `price`, `coffee menu`, `barista` and `cafe` -> restaurant/cafe service decks;
- trademark-like or highly seasonal drinks such as `frappuccino` or `pumpkin spice latte` unless a later deck explicitly selects a generic learner-safe form.

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

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/food_coffee_espresso_drinks_a2_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside common coffee/espresso drink vocabulary, disambiguate drink-vs-bean/equipment/place/person/brand senses, and avoid silently pulling in tea, cold-drink expansion, cafe service, equipment, ingredients, payment or alcohol scope.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include valid in-scope coffee candidates deferred because the selected cut stays A2 and portable across languages. Excluded rows must state the target deck or reason. If the candidate pool reveals unresolved scope leakage, duplicate risk, weak source support, non-portable examples, brand/trademark ambiguity or cross-language target examples that drift away from the English canonical scene, stop at `spec_ready` and ask for user confirmation instead of generating.

Preparation checks to run before generation:

```bash
node scripts/check-deck-candidate-pool.mjs food_coffee_espresso_drinks_a2
node scripts/check-word-selection-quality.mjs food_coffee_espresso_drinks_a2
node scripts/check-deck-specs.mjs
node scripts/check-deck-ready.mjs food_coffee_espresso_drinks_a2
```

Preparation status on 2026-05-31: spec and candidate pool prepared for the next post-reset ordinary deck after Sort 29. Candidate pool: 78 rows with 30 selected, 20 backup and 28 excluded/move decisions. The selected cut deliberately keeps already generated `coffee` and `iced coffee` as backup context instead of reusing or mutating their Drink Basics meaning fingerprints.

Generation status on 2026-06-01: runner `prepare -> base -> draft-preflight -> batch-import -> qa -> export -> deliver -> complete` finished for all 54 active language variants. Final deck size is 30 cards x 54 languages = 1,620 language rows. Final workbook `outputs/google-sheets/FlashcardsLuna_coffee-espresso-drinks_final.xlsx` has sha256 `662b3e5d9584ec18b787d612c89106ea9a51eeee76d59ffd59a6c93c521e9aeb` after the 2026-06-03 delivery-resync pass; Google Sheet delivery is `FlashcardsLuna 030 of 180 - Coffee & Espresso Drinks` / `1iYKAPAKfOnzog7K9rXvowNCqsq6qZbObLoPcor2jgfY`. Readback, post-final audit 1,620/1,620 pass and delivery freshness all pass. Non-RU remains generated_checked, not native-approved.

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck: `Tea & Hot Drinks` (Sort 31), if it receives its own spec/candidate pool and approval;
- related later decks: `Juices, Smoothies & Cold Drinks`, `Cafe Drink Options`, `Takeaway & Dine-In Words`, `Alcoholic Drinks Basics`, `Bar & Alcohol Words`, `Basic Ingredients & Spices` and cafe equipment/service decks.

## QA Notes

- semantic_scene requirements: preserve the target coffee drink, drink style/option, cup/glass/mug/tray/counter/table or temperature/foam state, and the beverage noun sense. The English canonical example remains the scene source for every target language.
- duplicate policy: already generated Drink Basics meanings such as `coffee` and `iced coffee` are not selected in this cut, because their existing category fingerprint belongs to Drink Basics. The coffee deck covers more specific coffee/espresso menu terms instead of creating quiet duplicate meaning IDs.
- language-specific risks: borrowed coffee-menu terms, regional variants, article/gender markers, mass/count drink nouns, classifier/counter choices, coffee drink vs bean/equipment/place/person senses, and compounds that may be copied literally rather than treated as whole menu terms.
- examples: keep English examples short and concrete, for example `The latte is in the mug.` or `The cappuccino has foam.` Avoid generic templates like `This is an espresso`, ordering phrases, prices, first-person preferences and examples that target languages can match while drifting away from English.
- selected compounds require whole-meaning proof: `double espresso`, `espresso shot`, `flat white`, `latte macchiato`, `white mocha`, `black coffee`, `coffee with milk`, `decaf coffee`, `filter coffee`, `drip coffee`, `pour-over coffee`, `French press coffee`, `Turkish coffee`, `cold brew`, `iced latte`, `iced americano`, `iced mocha`, `oat milk latte` and `soy latte` must stay whole coffee-menu meanings, not literal component-only translations.
- source-backed checks needed after approval: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency, food-countability/profile gates, regional variant quality where applicable and final linguistic audit.
