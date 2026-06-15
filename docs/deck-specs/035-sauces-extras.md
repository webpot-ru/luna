# Deck Spec: Sauces & Extras

## Identity

| Field | Value |
| --- | --- |
| Sort | 35 |
| Deck | Sauces & Extras |
| `set_id` | `food_sauces_extras_a2` |
| Content type | Vocabulary |
| Domain | Food & Eating |
| Area | Fast Food |
| Category / situation | Common sauces, condiments, toppings and small fast-food extras |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, food_countability, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | food_countability, countability_mass_count, article_gender_marker_consistency, duplicate_reuse_review, compound_whole_meaning, scene_slot_strict, regional_variant_heavy, culturally_variable_food_terms, sauce_condiment_scope, topping_extra_scope, borrowed_menu_term_review |
| Example complexity default | controlled simple examples; one sauce/condiment/topping/extra, one tray/cup/packet/bowl/burger/fries/plate scene, no ordering dialogues, prices, payment, brand names, dietary claims, recipes or unnecessary plural/case complexity |

## Scope

One learner-facing grouping principle: common A2 sauces, condiments, toppings and small extras a learner may see on a fast-food, casual restaurant or cafe counter/menu, without expanding into full menu items, takeaway service words, packaging/accessory objects, payment/admin vocabulary, cooking ingredients as a broad category or advanced regional sauces.

Include:

- core sauce/condiment words such as `sauce`, `ketchup`, `mustard`, `mayonnaise`, `barbecue sauce`, `hot sauce`, `chili sauce`, `garlic sauce`, `dipping sauce` and `cheese sauce`;
- common dressing/dip words such as `ranch dressing`, `salad dressing`, `salsa`, `guacamole`, `sour cream` and `tartar sauce` when they are useful in fast-food or casual-food settings;
- common food extra words such as `condiment`, `topping`, `extra cheese`, `pickle`, `jalapeño`, `olives`, `lettuce`, `tomato slice`, `onion`, `salt`, `pepper` and `sauce packet`;
- internationally common sauce words such as `soy sauce`, `teriyaki sauce` and `sweet and sour sauce`, while keeping examples concrete and avoiding cuisine lessons.

Exclude / move elsewhere:

- full fast-food menu items such as `burger`, `fries`, `chicken nuggets`, `cola`, `milkshake`, `pizza slice` and `hot dog` -> already generated or future reuse in `Fast Food Basics`, `Drink Basics` or cafe/drink decks;
- takeaway/service words such as `takeaway`, `dine-in`, `drive-through`, `order`, `menu`, `counter`, `cashier` and `receipt` -> `Takeaway & Dine-In Words`, `Restaurant Words` or `Money & Payment`;
- drink/table/packaging accessories such as `straw`, `lid`, `tray`, `napkin`, `fork`, `spoon`, `cup holder` and detailed packaging -> `Cafe Drink Options`, `Dining Room & Table Setup`, `Kitchenware Basics` or `Takeaway & Dine-In Words`;
- broad ingredient/spice expansion such as flour, oil, vinegar as a general ingredient, yeast, starch and detailed spices -> `Basic Ingredients & Spices`;
- rare, branded, highly regional or advanced sauce names such as `fry sauce`, `secret sauce`, `buffalo sauce`, `aioli` and restaurant-specific named sauces unless later promoted with stronger source and example evidence.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A2 |
| `level_max` | A2 |
| `frequency_band` scope | common/useful |
| `priority_band` scope | common/useful |
| Target item range | 32-32 |

## Candidate Pool Rule

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/food_sauces_extras_a2_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside common sauces, condiments, toppings and small extras, keep full menu items and service/payment/accessory words out of scope, and document any future ingredient/vegetable duplicate risk.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include valid adjacent sauce/extra candidates deferred because the selected cut stays compact, portable and A2. Excluded rows must state the target deck or reason. If the candidate pool reveals unresolved scope leakage, duplicate risk, weak source support, non-portable examples, regional ambiguity, brand/trademark ambiguity or cross-language target examples that drift away from the English canonical scene, stop at `spec_ready` and ask for user confirmation instead of generating.

Preparation checks to run before approval:

```bash
node scripts/check-deck-candidate-pool.mjs food_sauces_extras_a2
node scripts/check-word-selection-quality.mjs food_sauces_extras_a2
node scripts/check-deck-specs.mjs
```

Preparation and delivery status on 2026-06-07: spec and candidate pool were prepared for the next ordinary Deck Master Plan row after Sort 34. Candidate pool has 72 rows: 32 selected, 20 backup and 20 excluded/move decisions. `node scripts/check-deck-candidate-pool.mjs food_sauces_extras_a2` passed; `node scripts/check-word-selection-quality.mjs food_sauces_extras_a2` passed with one expected heuristic warning that the selected set is dominated by uncategorized sauce/extra items; `node scripts/check-deck-specs.mjs` passed. User approval promoted this deck to `approved_for_generation`, and the deck then completed runner `prepare`, `base`, `draft-preflight`, `batch-import`, `qa`, `export`, `deliver` and `complete`.

Final delivery:

- final workbook: `outputs/google-sheets/FlashcardsLuna_sauces-extras_final.xlsx`;
- Google Sheet: `FlashcardsLuna 035 of 180 - Sauces & Extras` / `1ELc9adsFJYp7O-hYKtdXaT4IuFKMvsb4-Ek5JMU_1M0`;
- final count: 32 cards x 54 languages = 1,728 language rows;
- final audit: `outputs/audit/final_linguistic_audit_food_sauces_extras_a2_20260607T161501Z_results_summary.json` reports 1,728/1,728 pass rows;
- readback and delivery freshness pass; runner manifest `outputs/runs/food_sauces_extras_a2/run_food_sauces_extras_a2_20260607T080458612Z_671b6674.json` is completed;
- DB quality statuses are `generated_checked` for the content set, 54 metadata localizations, 32 memberships, 32 base examples, 1,728 language entries and 1,728 target examples. Non-RU remains generated_checked, not native-approved.

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck: `Takeaway & Dine-In Words` (Sort 36), if it receives its own spec/candidate pool and approval;
- related later decks: `Restaurant Words`, `Cafe Food & Table Items`, `Basic Ingredients & Spices`, `Vegetable Basics`, `Herbs & Greens`, `Sweets & Snacks` and `Grocery Shopping Words`.

## QA Notes

- semantic_scene requirements: preserve the target sauce/condiment/topping/extra, its concrete food scene, and the food/menu sense. The English canonical example remains the scene source for every target language.
- duplicate policy: `salt`, `pepper`, `onion`, `lettuce`, `tomato slice`, `pickle`, `olives` and similar food surfaces may later belong to ingredient/vegetable decks; this deck uses them in fast-food extra/topping sense and future decks must make reuse/duplicate-by-membership decisions explicitly.
- language-specific risks: sauce/dressing/dip distinctions, condiment umbrella words, spicy/hot false sense, `pepper` seasoning vs vegetable/chili, `pickle` cucumber vs general pickled food, `sour cream` not spoiled cream, `ranch` not farm, `salsa` food not dance/music, `buffalo` animal false sense in backup rows, borrowed sauce names and article/gender markers.
- examples: keep English examples short and concrete, for example `The ketchup is in the packet.`, `The cheese sauce is on the fries.` or `The tomato slice is on the sandwich.` Avoid full-ordering phrases, prices, payment/admin context, brand names and examples that target languages can match while drifting away from English.
- selected compounds require whole-meaning proof: `barbecue sauce`, `hot sauce`, `chili sauce`, `garlic sauce`, `ranch dressing`, `salad dressing`, `soy sauce`, `teriyaki sauce`, `sweet and sour sauce`, `dipping sauce`, `cheese sauce`, `sour cream`, `tartar sauce`, `extra cheese`, `tomato slice` and `sauce packet` must stay whole sauce/extra meanings, not literal component-only translations.
- source-backed checks needed after approval: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency, food-countability/profile gates, regional variant quality where applicable and final linguistic audit.
