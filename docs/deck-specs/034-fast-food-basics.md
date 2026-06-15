# Deck Spec: Fast Food Basics

## Identity

| Field | Value |
| --- | --- |
| Sort | 34 |
| Deck | Fast Food Basics |
| `set_id` | `food_fast_food_basics_a1_a2` |
| Content type | Vocabulary |
| Domain | Food & Eating |
| Area | Fast Food |
| Category / situation | Common fast-food menu items, sides, simple desserts and meal-set words |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, food_countability, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | food_countability, countability_mass_count, article_gender_marker_consistency, duplicate_reuse_review, compound_whole_meaning, scene_slot_strict, regional_variant_heavy, culturally_variable_food_terms, fast_food_menu_scope, borrowed_menu_term_review, service_option_scope |
| Example complexity default | controlled simple examples; one fast-food item or meal term, one tray/box/bag/plate/cup/wrapper scene, no ordering dialogues, prices, payment, brand names, diet claims, recipes or unnecessary plural/case complexity |

## Scope

One learner-facing grouping principle: common A1-A2 fast-food vocabulary a learner may see on a menu or recognize at a counter, without expanding into sauces/extras, payment/service words, restaurant jobs, detailed packaging, full ordering phrases, branded items or advanced cuisine-specific food.

Include:

- core fast-food category and menu-item words such as `fast food`, `burger`, `cheeseburger`, `chicken burger`, `veggie burger`, `fries`, `chicken nuggets`, `hot dog`, `fried chicken` and `onion rings`;
- learner-useful fast-food sandwich/pizza items such as `chicken sandwich`, `fish sandwich`, `breakfast sandwich` and `pizza slice`, without mutating broad existing `sandwich` or `pizza` meaning fingerprints;
- common global or semi-global fast-food items such as `taco`, `burrito`, `wrap`, `pizza slice`, `chicken wings` and `chicken strips`;
- fast-food menu-meal terms such as `combo meal`, `kids' meal`, `side order`, `small fries` and `large fries`;
- a very small number of common fast-food dessert/drink items when they are useful in this situation and do not collide with already generated broad beverage meanings.

Exclude / move elsewhere:

- sauces, condiments and extras such as `ketchup`, `mustard`, `mayonnaise`, `barbecue sauce`, `dipping sauce`, `extra cheese` and `pickle` -> `Sauces & Extras`;
- takeaway, dine-in, receipt, counter, cashier, drive-through, order/menu and payment/service words -> `Takeaway & Dine-In Words`, `Restaurant Words` or `Money & Payment`;
- drink accessories and packaging such as `straw`, `lid`, `takeaway cup`, `takeaway bag`, `cup holder` and detailed wrappers -> `Cafe Drink Options` or `Takeaway & Dine-In Words`;
- broad drinks already covered in beverage decks, such as `cola`, `soft drink` and `milkshake`, unless a future explicit reuse retrofit handles them outside the normal base importer;
- broad foods already covered in Food Basics, such as generic `sandwich` and `pizza`, unless a future explicit reuse retrofit handles them outside the normal base importer or the selected row is a distinct fast-food menu item;
- highly regional or advanced items such as `corn dog`, `shawarma`, `falafel wrap`, `slider`, `loaded fries` and `waffle fries` unless promoted later with stronger source and example evidence.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A1 |
| `level_max` | A2 |
| `frequency_band` scope | common/useful |
| `priority_band` scope | common/useful |
| Target item range | 32-32 |

## Candidate Pool Rule

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/food_fast_food_basics_a1_a2_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside common fast-food menu items, sides, simple dessert/icy drink items and meal-set vocabulary, keep broad already generated food/drink words as backup reuse context unless a future explicit reuse retrofit is deliberately planned, and avoid silently pulling in sauces/extras, takeaway/service/payment words, cafe drink options, packaging or highly regional cuisine terms.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include valid adjacent fast-food candidates deferred because the selected cut stays compact, portable and A1-A2. Excluded rows must state the target deck or reason. If the candidate pool reveals unresolved scope leakage, duplicate risk, weak source support, non-portable examples, regional ambiguity, brand/trademark ambiguity or cross-language target examples that drift away from the English canonical scene, stop at `spec_ready` and ask for user confirmation instead of generating.

Preparation checks to run before approval:

```bash
node scripts/check-deck-candidate-pool.mjs food_fast_food_basics_a1_a2
node scripts/check-word-selection-quality.mjs food_fast_food_basics_a1_a2
node scripts/check-deck-specs.mjs
```

Delivery status on 2026-06-06: generated and delivered through `scripts/run-deck-production.mjs` with runner manifest `outputs/runs/food_fast_food_basics_a1_a2/run_food_fast_food_basics_a1_a2_20260606T043223917Z_668edb1e.json`. Final set: 32 selected cards x 54 languages = 1,728 language rows. Candidate pool remains 72 rows with 32 selected, 20 backup and 20 excluded/move decisions. Final workbook `outputs/google-sheets/FlashcardsLuna_fast-food-basics_final.xlsx` was uploaded to the required Drive folder as Google Sheet `FlashcardsLuna 034 of 180 - Fast Food Basics` / `1tAMVwz2NtaKL1mG0zavgbaBxtj47Hvw01ILRZFkRBJM`; readback, post-final audit 1,728/1,728 pass rows and delivery freshness all pass. Narrow final repairs fixed counter-scene target examples, burger/hamburger example contrast, CJK Course Metadata spacing, fast-food bag/cup scene-location aliases and HY source-backed loanword transcription suffix handling without changing selected words. Non-RU remains generated_checked, not native-approved.

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck: `Sauces & Extras` (Sort 35), if it receives its own spec/candidate pool and approval;
- related later decks: `Takeaway & Dine-In Words`, `Restaurant Words`, `Cafe Food & Table Items`, `Basic Ingredients & Spices`, `Sweets & Snacks`, `Bakery & Pastry`, vegetable/side-food expansion decks and alcohol decks.

## QA Notes

- semantic_scene requirements: preserve the target fast-food item or meal term, the simple tray/box/bag/plate/cup/wrapper scene, and the menu/food sense. The English canonical example remains the scene source for every target language.
- duplicate policy: broad existing `sandwich`, `pizza`, `cola` and `milkshake` meanings remain backup/reuse context in this runner pass. Do not create new duplicate meaning IDs for those surfaces; only distinct fast-food menu items such as `chicken sandwich`, `pizza slice` and `breakfast sandwich` are selected.
- language-specific risks: burger/sandwich boundaries, fries/chips regional variants, hot dog literal-animal trap, tortilla/wrap/kebab regional names, menu-size phrases, kids' meal plural/possessive wording, article/gender markers, mass/count food grammar, classifier/counter choices and borrowed menu terms.
- examples: keep English examples short and concrete, for example `The burger is on the tray.`, `The fries are in the box.` or `The cola is in the cup.` Avoid full-ordering phrases like `I want...`, prices, payment/admin context, brand names and examples that target languages can match while drifting away from English.
- selected compounds require whole-meaning proof: `chicken burger`, `veggie burger`, `double burger`, `small fries`, `large fries`, `chicken nuggets`, `chicken strips`, `hot dog`, `chicken sandwich`, `fish sandwich`, `pizza slice`, `fried chicken`, `chicken wings`, `onion rings`, `combo meal`, `kids' meal`, `side order`, `mozzarella sticks`, `hash browns`, `ice cream cone` and `apple pie` must stay whole menu meanings, not literal component-only translations.
- source-backed checks needed after approval: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency, food-countability/profile gates, regional variant quality where applicable and final linguistic audit.
