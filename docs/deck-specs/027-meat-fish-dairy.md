# Deck Spec: Meat, Fish & Dairy

## Identity

| Field | Value |
| --- | --- |
| Sort | 27 |
| Deck | Meat, Fish & Dairy |
| `set_id` | `food_meat_fish_dairy_a2` |
| Content type | Vocabulary |
| Domain | Food & Eating |
| Area | Protein & Dairy |
| Category / situation | Common meat, fish, seafood, egg and dairy words for grocery and simple meal contexts |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, food_countability, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | food_countability, countability_mass_count, article_gender_marker_consistency, duplicate_reuse_review, compound_whole_meaning, scene_slot_strict, regional_variant_heavy, culturally_variable_food_terms, animal_vs_meat_sense, seafood_specificity |
| Example complexity default | controlled simple examples; one food item, one plate/bowl/package/container/place, no recipes, prices, ordering dialogs, taste claims or unnecessary plural/case complexity |

## Scope

One learner-facing grouping principle: common A2 food words for animal protein, fish/seafood, eggs and dairy that a learner can recognize, name or choose in a grocery, kitchen or simple meal context.

Include:

- high-frequency animal-protein food words such as `meat`, `chicken`, `beef`, `pork`, `lamb`, `turkey`, `duck`, `steak`, `sausage`, `ham`, `bacon`, `ground meat`, `ribs` and `chicken breast`;
- common fish/seafood words such as `fish`, `seafood`, `shrimp`, `salmon`, `tuna`, `cod` and `fish fillet`;
- common egg/dairy words such as `egg`, `milk`, `cheese`, `yogurt`, `butter`, `cream`, `sour cream`, `cream cheese` and `cottage cheese`;
- explicit duplicate decisions for words already selected in `Food Basics`, because this deck is useful as an independent study set even when learners do not study the broader Food Basics deck;
- simple food examples with concrete plate/bowl/package/container/location scenes that can be preserved across language pairs.

Exclude / move elsewhere:

- vegetables, legumes and plant-protein alternatives such as `beans`, `tofu`, `lentils`, `soy milk` and `plant milk` -> `Vegetable Basics`, `Plant Proteins` or diet/preference decks;
- prepared dishes and fast-food words such as `burger`, `hot dog`, `chicken nugget`, `fish and chips`, `sushi` and `kebab` -> fast-food, restaurant or cuisine-specific decks;
- sauces, condiments and cooking ingredients such as `fish sauce`, `mayonnaise`, `gelatin`, `whey`, `ghee` and `lard` -> ingredients/sauces decks;
- rare, specialist or advanced seafood such as `lobster`, `mussels`, `clams`, `oysters`, `squid` and `octopus` -> `Advanced Foods & Seafood`;
- live-animal, farming, recipe-step, nutrition, allergy, diet, price, grocery-service and restaurant-ordering senses.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A2 |
| `level_max` | A2 |
| `frequency_band` scope | common |
| `priority_band` scope | common |
| Target item range | 30-30 |

## Candidate Pool Rule

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/food_meat_fish_dairy_a2_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside common meat/fish/seafood/egg/dairy vocabulary, disambiguate animal-vs-food senses and avoid silently pulling in prepared dishes, fast food, ingredients, sauces, vegetarian substitutes or advanced seafood.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include valid in-scope candidates deferred because the selected cut stays strictly common A2. Excluded rows must state the target deck or reason. If the candidate pool reveals unresolved scope leakage, duplicate risk, animal-vs-meat ambiguity, seafood specificity, countability ambiguity, weak source support, non-portable examples or cross-language target examples that drift away from the English canonical scene, stop at `spec_ready` and ask for user confirmation instead of promoting the deck.

Preparation checks to run before approval:

```bash
node scripts/check-deck-candidate-pool.mjs food_meat_fish_dairy_a2
node scripts/check-word-selection-quality.mjs food_meat_fish_dairy_a2
node scripts/check-deck-specs.mjs
```

Preparation checks passed on 2026-05-24:

```bash
node scripts/check-deck-candidate-pool.mjs food_meat_fish_dairy_a2
node scripts/check-word-selection-quality.mjs food_meat_fish_dairy_a2
node scripts/check-deck-specs.mjs
```

The 65-row pool has 30 selected, 18 backup and 17 excluded/move rows. The only word-selection warning is expected checker noise: the generic category heuristic does not yet have a food/meat/dairy category and labels selected food rows as `other`. No unresolved scope, duplicate, weak-example, source-support or translation-risk blocker remains before approval.

Base-import compatibility note: repeated Food Basics surface words use new `food_meat_fish_dairy_*` meaning IDs instead of reusing existing `food_basics_*` IDs. The existing Food Basics meanings have `Core Food` taxonomy fingerprints, while this deck has the `Protein & Dairy` deck-domain fingerprint. Reusing the old IDs would fail the base-import fingerprint guard, so the duplicate decision here is independent deck-domain coverage, not same-`meaning_id` reuse.

The active goal continuation on 2026-05-24 approved continuing the next ordinary deck through the fail-closed production contour. The deck was generated through `scripts/run-deck-production.mjs` and completed on 2026-05-25.

Delivery evidence:

- runner manifest: `outputs/runs/food_meat_fish_dairy_a2/run_food_meat_fish_dairy_a2_20260524T134047351Z_2017ee0d.json`;
- final workbook: `outputs/google-sheets/FlashcardsLuna_food-meat-fish-dairy_final.xlsx`;
- Google Sheet: `FlashcardsLuna 027 of 180 - Meat, Fish & Dairy` / `1w2AxqDrBi2TRaG45wfQ_eY8p9gutNXTGQkMaqTJUcVY`;
- row count: 30 cards x 54 language variants = 1,620 language rows;
- final linguistic audit: `outputs/audit/final_linguistic_audit_food_meat_fish_dairy_a2_20260525T062702Z_results_summary.json`, 1,620/1,620 pass, 0 needs_review, 0 fail;
- sample audit: `outputs/qa/sample_card_quality_audit_food_meat_fish_dairy_a2_5_per_language_20260525.md`, 270 sampled rows, 0 blockers, 16 advisory scene-location warnings;
- Google Sheet readback and delivery freshness pass after the post-final audit re-export/re-upload;
- Gemini QA pack artifact: `outputs/qa/gemini_qa_pack_food_meat_fish_dairy_a2_20260525T062551Z.jsonl`.

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck is completed: `Meals & Taste` (Sort 28), if it receives its own spec/candidate pool and explicit approval;
- related later decks: `Basic Ingredients & Spices`, `Advanced Foods & Seafood`, `Fast Food Basics`, `Restaurant Words`, `Diets & Food Preferences`, `Plant Proteins` and `Sauces & Extras`.

## QA Notes

- semantic_scene requirements: preserve the target food item, food-vs-live-animal sense, countability/plural role and the simple plate/bowl/package/container/location scene. The English canonical example remains the scene source for every target language.
- duplicate policy: repeated core words from `Food Basics` are allowed as independent deck-domain rows because the runner's base-import fingerprint guard requires this deck's `Protein & Dairy` taxonomy. Do not reuse existing `Food Basics` meaning IDs unless the taxonomy fingerprint is compatible and the runner accepts the reuse.
- language-specific risks: animal-vs-meat senses (`chicken`, `duck`, `turkey`, `fish`), broad category terms (`meat`, `seafood`), regional variants (`shrimp`/`prawn`, `ground meat`/`minced meat`, `yogurt` spelling), dairy countability, classifier/counter use, article/gender markers and culturally variable food restrictions.
- examples: keep English examples short and concrete, for example `The beef is on the plate.` or `The milk is in the glass.` Avoid generic templates like `This is meat`, avoid shopping/price/order scenes and avoid examples that all target languages can match while drifting away from English.
- selected compounds require whole-meaning proof: `ground meat`, `chicken breast`, `fish fillet`, `sour cream`, `cream cheese` and `cottage cheese` must stay whole food terms, not literal component translations.
- source-backed checks needed after approval: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency, food-countability/profile gates, regional variant quality where applicable and final linguistic audit.
