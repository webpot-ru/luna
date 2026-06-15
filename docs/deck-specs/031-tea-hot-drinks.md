# Deck Spec: Tea & Hot Drinks

## Identity

| Field | Value |
| --- | --- |
| Sort | 31 |
| Deck | Tea & Hot Drinks |
| `set_id` | `food_tea_hot_drinks_a2` |
| Content type | Vocabulary |
| Domain | Food & Eating |
| Area | Beverages |
| Category / situation | Common tea types, tea-based drinks and simple hot drinks for everyday cafe, home and menu contexts |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, food_countability, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | food_countability, countability_mass_count, article_gender_marker_consistency, duplicate_reuse_review, compound_whole_meaning, scene_slot_strict, regional_variant_heavy, culturally_variable_food_terms, beverage_vs_container_sense, borrowed_menu_term_review, tea_drink_vs_leaf_or_meal_sense, hot_drink_temperature_scope |
| Example complexity default | controlled simple examples; one tea or hot drink, one cup/mug/glass/bowl/tray/table or temperature state, no ordering dialogs, prices, recipes, health claims, ceremonial preparation, alcohol context or unnecessary plural/case complexity |

## Scope

One learner-facing grouping principle: common A2 tea and hot-drink vocabulary a learner may see on a cafe menu, drink list or everyday home context, without expanding into coffee, cold drinks, alcohol, ingredients, equipment, tableware, restaurant service or detailed wellness/ceremony vocabulary.

Include:

- common tea types and tea-menu names such as `white tea`, `oolong tea`, `jasmine tea`, `Earl Grey tea`, `English breakfast tea`, `rooibos tea`, `hibiscus tea`, `rosehip tea`, `chai`, `masala chai`, `matcha` and `yerba mate`;
- simple tea option phrases that are short and portable, such as `milk tea`, `tea with milk`, `tea with lemon`, `tea with honey` and `decaf tea`;
- a small number of non-tea hot drinks that are useful, concrete and not already covered as exact Drink Basics meanings, such as `hot milk`, `hot apple cider`, `mulled cider` and `hot lemon drink`;
- already generated broad drink words such as `tea`, `green tea`, `black tea`, `herbal tea`, `hot chocolate` and `hot drink` may appear as backup context, but this selected cut avoids changing their existing Drink Basics meaning fingerprints.

Exclude / move elsewhere:

- detailed coffee-shop drinks such as `espresso`, `latte`, `cappuccino`, `americano`, `mocha`, `macchiato`, `black coffee` and `coffee with milk` -> `Coffee & Espresso Drinks`;
- cold drink expansion such as `iced tea`, `bubble tea`, `kombucha`, `juice`, `smoothie`, `soda`, `milkshake` and flavor-specific cold drinks -> `Juices, Smoothies & Cold Drinks` or `Cafe Drink Options`;
- alcoholic hot drinks such as `mulled wine`, `hot toddy` and spiked cider -> `Alcoholic Drinks Basics`;
- equipment, leaves and serving objects such as `teapot`, `kettle`, `tea bag`, `tea leaves`, `strainer`, `mug`, `cup`, `saucer` and `thermos` -> kitchen/tableware/cafe equipment decks;
- ingredients and extras such as `sugar`, `honey`, `lemon`, `cinnamon`, `ginger`, `milk` and `cocoa powder` unless used only as example context or inside a selected whole drink phrase;
- service, menu and payment words such as `order`, `refill`, `tea menu`, `price` and `bill` -> restaurant/cafe service decks.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A2 |
| `level_max` | A2 |
| `frequency_band` scope | common/useful |
| `priority_band` scope | common/useful |
| Target item range | 28-28 |

## Candidate Pool Rule

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/food_tea_hot_drinks_a2_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside tea/hot-drink vocabulary, disambiguate drink-vs-leaf/equipment/ingredient/service/alcohol senses, and avoid silently pulling in coffee, cold-drink expansion, cafe service, equipment, tableware, payment or health/wellness scope.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include valid in-scope tea/hot-drink candidates deferred because the selected cut stays A2 and portable across languages. Excluded rows must state the target deck or reason. If the candidate pool reveals unresolved scope leakage, duplicate risk, weak source support, non-portable examples, regional ambiguity or cross-language target examples that drift away from the English canonical scene, stop at `spec_ready` and ask for user confirmation instead of generating.

Preparation checks to run before generation:

```bash
node scripts/check-deck-candidate-pool.mjs food_tea_hot_drinks_a2
node scripts/check-word-selection-quality.mjs food_tea_hot_drinks_a2
node scripts/check-deck-specs.mjs
node scripts/check-deck-ready.mjs food_tea_hot_drinks_a2
```

Preparation status on 2026-06-01: spec and candidate pool prepared for the next post-reset ordinary deck after Sort 30. Candidate pool: 73 rows with 28 selected, 25 backup and 20 excluded/move decisions. The selected cut deliberately keeps already generated broad Drink Basics meanings such as `tea`, `green tea`, `black tea`, `herbal tea`, `hot chocolate` and `hot drink` as backup context instead of reusing or mutating their Drink Basics meaning fingerprints.

Delivery status on 2026-06-02: runner `outputs/runs/food_tea_hot_drinks_a2/run_food_tea_hot_drinks_a2_20260601T132631227Z_c33313bd.json` completed `prepare -> base -> draft-preflight -> batch-import -> qa -> export -> deliver -> complete` for 28 cards x 54 languages = 1,512 language rows. Final workbook: `outputs/google-sheets/FlashcardsLuna_tea-hot-drinks_final.xlsx` with sha256 `9e15ae7b5a0b2d541699e1d7d2153f02b0cfe18d96e7f6e198b474962c6abc0e`. Google Sheet: `FlashcardsLuna 031 of 180 - Tea & Hot Drinks` / `19TT6vD16R9-lCiE7v2inwzi6Wrg50k3av34NtZnv_Cs` in Drive folder `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`. Readback, post-final audit `outputs/audit/final_linguistic_audit_food_tea_hot_drinks_a2_20260602T111037Z_results_summary.json` (1,512/1,512 pass, 0 needs_review, 0 fail) and delivery freshness pass. Non-RU remains generated_checked, not native-approved.

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck: `Juices, Smoothies & Cold Drinks` (Sort 32), if it receives its own spec/candidate pool and approval;
- related later decks: `Cafe Drink Options`, `Alcoholic Drinks Basics`, `Bar & Alcohol Words`, `Fast Food Basics`, `Sauces & Extras`, `Takeaway & Dine-In Words`, `Basic Ingredients & Spices` and cafe equipment/service decks.

## QA Notes

- semantic_scene requirements: preserve the target tea/hot drink, drink style/option, cup/mug/glass/bowl/tray/table or temperature state, and the beverage noun sense. The English canonical example remains the scene source for every target language.
- duplicate policy: already generated Drink Basics meanings such as `tea`, `green tea`, `black tea`, `herbal tea`, `hot chocolate` and `hot drink` are not selected in this cut, because their existing category fingerprint belongs to Drink Basics. The tea deck covers more specific tea and hot-drink menu terms instead of creating quiet duplicate meaning IDs.
- language-specific risks: borrowed tea-menu terms, regional variants, article/gender markers, mass/count drink nouns, classifiers/counters, tea drink vs leaf/meal/ceremony senses, hot-drink temperature scope, and compounds that may be copied literally rather than treated as whole menu terms.
- examples: keep English examples short and concrete, for example `The jasmine tea is in the mug.` or `The chamomile tea is warm.` Avoid generic templates like `This is tea`, ordering phrases, prices, first-person preferences, health claims and examples that target languages can match while drifting away from English.
- selected compounds require whole-meaning proof: `Earl Grey tea`, `English breakfast tea`, `milk tea`, `tea with milk`, `tea with lemon`, `tea with honey`, `decaf tea`, `masala chai`, `matcha latte`, `tea latte`, `rooibos tea`, `hibiscus tea`, `rosehip tea`, `yerba mate`, `hot apple cider`, `mulled cider` and `hot lemon drink` must stay whole drink/menu meanings, not literal component-only translations.
- source-backed checks needed after approval: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency, food-countability/profile gates, regional variant quality where applicable and final linguistic audit.
