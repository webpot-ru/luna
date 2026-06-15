# Deck Spec: Food Basics

## Identity

| Field | Value |
| --- | --- |
| Sort | 25 |
| Deck | Food Basics |
| `set_id` | `food_basics_a1` |
| Content type | Vocabulary |
| Domain | Food & Eating |
| Area | Core Food |
| Category / situation | Early high-frequency food words, basic staples and learner-safe everyday foods |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, food_countability, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | food_countability, countability_mass_count, article_gender_marker_consistency, duplicate_reuse_review, compound_whole_meaning, scene_slot_strict, regional_variant_heavy, culturally_variable_food_terms |
| Example complexity default | controlled simple examples; one food item/category, one container/place, no recipes, prices, restaurant ordering, taste claims or unnecessary plural/case complexity |

## Scope

One learner-facing grouping principle: very common A1 food words that a learner can recognize, name or point to at home, in a simple meal, or in a basic food context.

Include:

- core generic food nouns such as `food`, `meal`, `snack` and `dessert`;
- early high-frequency staples such as `bread`, `rice`, `pasta`, `noodles`, `cereal`, `egg`, `milk`, `water`, `cheese`, `yogurt`, `butter`, `meat`, `chicken`, `fish` and `beans`;
- a small representative set of early fruit/vegetable words that are useful before the narrower produce decks, such as `apple`, `banana`, `orange`, `potato`, `tomato`, `carrot`, `cucumber`, `onion` and `lettuce`;
- simple prepared-food words that are frequent and learner-safe, such as `salad`, `soup`, `sandwich`, `pizza`, `ice cream` and `breakfast`;
- short learner-friendly lexical items only, with mass/count food grammar and article/gender markers handled per language.

Exclude / move elsewhere:

- broader fruit and vegetable expansion words such as grapes, mango, strawberry, watermelon, broccoli, cabbage and mushroom -> `Fruit Basics`, `Vegetable Basics` or later produce decks;
- spices, ingredients and cooking supplies such as salt, sugar, oil, flour, pepper, vinegar, yeast and starch -> `Basic Ingredients & Spices`;
- drinks beyond the two core starter words `water` and `milk`, such as coffee, tea, juice, soda, smoothie and lemonade -> beverage decks;
- bakery/pastry/sweets expansion words such as pastry, bun, cake, cookie, candy and chocolate -> `Bakery & Pastry` or `Sweets & Snacks`;
- fast-food/service words such as burger, fries, ketchup, tray, straw, takeaway, dine-in and menu -> fast-food/restaurant decks;
- rare or advanced foods such as lobster, octopus, mussels and specialized regional dishes -> `Advanced Foods & Seafood` or later cuisine-specific decks;
- allergy, diet, complaint, price, market, grocery, restaurant-ordering and recipe phrases.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Basic |
| `level_min` | A1 |
| `level_max` | A1 |
| `frequency_band` scope | core |
| `priority_band` scope | core |
| Target item range | 36-36 |

## Candidate Pool Rule

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/food_basics_a1_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside early high-frequency food vocabulary, disambiguate animal-vs-food and color-vs-fruit surfaces, and avoid silently pulling in drinks, ingredients, cafe/restaurant service, fast food, rare seafood or advanced cuisine words.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include valid food candidates that are deferred because the selected cut stays strictly A1 and small. Excluded rows must state the target deck or reason. If the candidate pool reveals unresolved scope leakage, duplicate risk, countability ambiguity, weak source support, non-portable examples, or cross-language target examples that drift away from the English canonical scene, stop at `spec_ready` and ask for user confirmation instead of promoting the deck.

Before moving to `approved_for_generation`, run:

```bash
node scripts/check-deck-candidate-pool.mjs food_basics_a1
node scripts/check-word-selection-quality.mjs food_basics_a1
node scripts/check-deck-specs.mjs
```

Pre-generation checks passed on 2026-05-22:

```bash
node scripts/check-deck-candidate-pool.mjs food_basics_a1
node scripts/check-word-selection-quality.mjs food_basics_a1
node scripts/check-deck-specs.mjs
```

The 85-row pool has 36 selected, 24 backup and 25 excluded/move rows. The only word-selection warning is expected checker noise: the generic category heuristic does not yet have a food category and labels selected food words as `other`; no unresolved scope, duplicate, weak-example, source-support or translation-risk blocker remains before generation.

The user approved continuing ordinary deck production on 2026-05-22 by asking to continue after Sort 24 completion. Generation ran through `scripts/run-deck-production.mjs`; no direct language batch imports are allowed outside the runner for future repairs or refreshes.

## Delivery Evidence

Post-reset generation completed on 2026-05-24:

- final set size: 36 cards, 54 language variants, 1,944 language rows;
- runner manifest: `outputs/runs/food_basics_a1/run_food_basics_a1_20260522T034344633Z_725756ec.json`;
- final workbook: `outputs/google-sheets/FlashcardsLuna_food-basics_final.xlsx`;
- Google Sheet: `FlashcardsLuna 025 of 180 - Food Basics` / `10kcu7l5Gf8u9XG9bulZcGEI3mKND7FHV6zdshuLGfIQ`;
- final linguistic audit: `outputs/audit/final_linguistic_audit_food_basics_a1_20260524T032956Z_results_summary.json`, 1,944/1,944 pass rows, 0 needs_review, 0 fail;
- Google Sheet readback and `check-delivery-freshness` passed after the post-final audit re-export/reupload loop;
- statuses: content set, meanings, memberships, entries and examples are `generated_checked`; non-RU language variants remain at most `generated_checked`, not native-approved.

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck is completed: `Fruit & Vegetables` (Sort 26) is currently blocked by the master plan split, so the next runnable row may be `Meat, Fish & Dairy` (Sort 27) if it receives its own spec/candidate pool and approval;
- related later decks: `Fruit Basics`, `Vegetable Basics`, `Basic Ingredients & Spices`, `Drink Basics`, `Bakery & Pastry`, `Sweets & Snacks`, `Meals & Taste`, `Cafe Food & Table Items`, `Fast Food Basics`, `Grocery Shopping Words` and `Restaurant Words`.

## QA Notes

- semantic_scene requirements: preserve the target food item/category, the simple food/container/location scene and mass/count role. The English canonical example remains the scene source for every target language.
- language-specific risks: count vs mass nouns, classifier/counter use, plural-only foods, article/gender markers, animal-vs-meat senses (`chicken`, `fish`), color-vs-fruit sense (`orange`), dairy/protein regional variants and culturally variable prepared-food terms.
- examples: keep English examples short and concrete, for example `The rice is in the bowl.` or `The apple is in the bowl.` Avoid generic templates like `This is food`, avoid restaurant/price/menu scenes and avoid examples that all target languages can match while drifting away from English.
- selected compounds require whole-meaning proof: `ice cream` must stay the food/dessert meaning, not separate ice + cream components.
- transcription risks: IPA languages need source-backed pronunciation for the displayed form; native-copy languages repeat display word; `ZH` requires tone-marked pinyin; `TH`/`LO`/`MY`/`KM`/`HY` strict high-risk lookup/style gates apply.
- source-backed checks needed: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency, food-countability/profile gates, regional variant quality where applicable and final linguistic audit.
