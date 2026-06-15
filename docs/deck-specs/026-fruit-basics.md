# Deck Spec: Fruit Basics

## Identity

| Field | Value |
| --- | --- |
| Sort | 26 |
| Deck | Fruit Basics |
| `set_id` | `food_fruit_basics_a1` |
| Content type | Vocabulary |
| Domain | Food & Eating |
| Area | Produce |
| Category / situation | Common basic fruit words for home, grocery and simple meal contexts |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, food_countability, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | food_countability, countability_mass_count, article_gender_marker_consistency, duplicate_reuse_review, compound_whole_meaning, scene_slot_strict, regional_variant_heavy, culturally_variable_food_terms, produce_classification |
| Example complexity default | controlled simple examples; one fruit item, one container/place, no recipes, prices, shopping dialogs, taste claims or unnecessary plural/case complexity |

## Scope

One learner-facing grouping principle: very common A1 fruit names that a learner can recognize, name or point to at home, in a grocery setting, or in a simple meal context.

Include:

- short, learner-friendly common fruit nouns such as `apple`, `banana`, `orange`, `grapes`, `lemon`, `lime`, `mango`, `pineapple`, `strawberry`, `watermelon`, `pear`, `peach`, `plum`, `cherry`, `melon`, `kiwi`, `coconut`, berries and similar common basic fruits;
- explicit duplicate/reuse decisions for early fruit already selected in `Food Basics`; Fruit Basics may keep an independent produce-context row when that is safer than reusing a prior meaning fingerprint from a broader food deck;
- fruit examples with a concrete object/container/location scene that can be preserved across language pairs;
- fruit senses only: `orange` is the fruit, not the color; `avocado` is the produce item, not a recipe or spread.

Exclude / move elsewhere:

- vegetables such as `potato`, `tomato`, `cucumber`, `carrot`, `broccoli`, `cabbage`, `pepper`, `onion` and `mushroom` -> `Vegetable Basics` or later vegetable decks;
- herbs and greens such as `lettuce`, `green onion`, `dill`, `coriander`, `parsley`, `basil` and `spinach` -> `Herbs & Greens`;
- drink words such as `juice`, `fruit juice`, `smoothie`, `lemonade` and `coconut water` -> beverage decks;
- desserts, preserves and prepared foods such as `jam`, `apple pie`, `fruit salad`, `dried fruit`, `prune` and `candied fruit` -> sweets/snacks, bakery, grocery or later prepared-food decks;
- rare, specialist, heavily regional or advanced fruit terms such as `durian`, `rambutan`, `star fruit`, `jackfruit`, `quince` and similar items -> `Fruit Expansion`;
- color, calendar/date, brand, idiom, botany-only or plant/tree senses.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Basic |
| `level_min` | A1 |
| `level_max` | A1 |
| `frequency_band` scope | core/common |
| `priority_band` scope | core/common |
| Target item range | 28-28 |

## Candidate Pool Rule

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/food_fruit_basics_a1_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside common basic fruit vocabulary, disambiguate fruit-vs-color/date/plant/recipe senses, and avoid silently pulling in vegetables, herbs, drinks, desserts, rare tropical fruit or grocery-service words.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include valid fruit candidates that are deferred because the selected cut stays strictly common/basic. Excluded rows must state the target deck or reason. If the candidate pool reveals unresolved produce classification, duplicate risk, countability ambiguity, weak source support, non-portable examples, or cross-language target examples that drift away from the English canonical scene, stop at `spec_ready` and ask for user confirmation instead of promoting the deck.

Before moving to `approved_for_generation`, run:

```bash
node scripts/check-deck-candidate-pool.mjs food_fruit_basics_a1
node scripts/check-word-selection-quality.mjs food_fruit_basics_a1
node scripts/check-deck-specs.mjs
```

Pre-generation preparation checks passed on 2026-05-24:

```bash
node scripts/check-deck-candidate-pool.mjs food_fruit_basics_a1
node scripts/check-word-selection-quality.mjs food_fruit_basics_a1
node scripts/check-deck-specs.mjs
```

The 71-row pool has 28 selected, 21 backup and 22 excluded/move rows. The selected set is intentionally narrow: common fruit only, with vegetables, herbs/greens, beverages, sweets/prepared foods and rare fruit moved to later decks. The only word-selection warning is expected checker noise: the generic category heuristic does not yet have a fruit/produce category and labels selected fruit words as `other`; no unresolved scope, duplicate, weak-example, source-support or translation-risk blocker remains before generation.

The active goal continuation on 2026-05-24 approved continuing this deck through the fail-closed production contour. Generation then completed through `scripts/run-deck-production.mjs`; no direct language batch imports outside the runner were used for production delivery.

## Generation And Delivery

Completed through the ordinary deck runner on 2026-05-24.

| Field | Value |
| --- | --- |
| Selected cards | 28 |
| Active language variants | 54 |
| Language rows | 1,512 |
| Runner manifest | `outputs/runs/food_fruit_basics_a1/run_food_fruit_basics_a1_20260524T041250942Z_2c8efc78.json` |
| Final workbook | `outputs/google-sheets/FlashcardsLuna_food-fruit-basics_final.xlsx` |
| Delivery manifest | `outputs/google-sheets/FlashcardsLuna_food-fruit-basics_final_delivery.json` |
| Google Sheet title | `FlashcardsLuna 026 of 180 - Fruit Basics` |
| Google Sheet id | `15Db4jqfy7IQ0m8BRGUPJgY4isycucEnvnY9rGRUIjMw` |
| Final linguistic audit | `outputs/audit/final_linguistic_audit_food_fruit_basics_a1_20260525T034243Z_results_summary.json` |

Verification:

- `scripts/run-deck-production.mjs food_fruit_basics_a1 --stage=qa --execute` passed the mandatory deterministic, source-backed, example, profile and QA-hash gates.
- `scripts/run-deck-production.mjs food_fruit_basics_a1 --stage=export --execute` produced the final XLSX and delivery manifest.
- `scripts/run-deck-production.mjs food_fruit_basics_a1 --stage=deliver --execute` uploaded/updated the Google Sheet, passed readback, ran/imported post-final audit, re-exported/reuploaded after audit evidence changed the manifest inputs, and passed delivery freshness.
- `scripts/run-deck-production.mjs food_fruit_basics_a1 --stage=complete --execute` closed the production run.
- Final linguistic audit reports 1,512/1,512 pass rows, 0 `needs_review` and 0 `fail`.
- Google Sheet readback and delivery freshness pass against the current workbook hash.
- 2026-05-25 repair update: `AZ` Course Metadata now uses plural `Meyvələr.` / `Meyvələr. Əsas səviyyə.` / `Meyvələr`; `NB` entries were repaired from definite suffix displays such as `eplet`, `bananen`, `druene` to Bokmål learner displays such as `et eple`, `en banan`, `druer`, with source-backed NB IPA article-prefix repairs. Post-repair `db-qa-set`, final export, Google Sheet update, readback, post-final audit 1,512/1,512 pass and delivery freshness all pass.

Status policy:

- content set, meanings, memberships, entries and examples are final-generated/current for this deck;
- non-RU languages remain at most `generated_checked`, not native-approved.

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck is completed: `Meat, Fish & Dairy` (Sort 27), if it receives its own spec/candidate pool and explicit approval;
- related produce continuation: `Vegetable Basics`, `Herbs & Greens` and later `Fruit Expansion`.

## QA Notes

- semantic_scene requirements: preserve the target fruit, countability/plural role and the simple container/location scene. The English canonical example remains the scene source for every target language.
- duplicate policy: common fruit surfaces already present in `Food Basics` are allowed as intentional independent Fruit Basics rows when reuse would collide with a different deck-domain fingerprint; this is not approval to duplicate ambiguous color/date/plant senses.
- language-specific risks: fruit-vs-color sense (`orange`), fruit-vs-calendar sense (`date` if promoted later), fruit-vs-vegetable food classification (`avocado`, `tomato`, `pepper`), classifier/counter use, plural-only or mass/count fruits, article/gender markers and regional fruit names.
- examples: keep English examples short and concrete, for example `The apple is in the basket.` or `The grapes are in the bowl.` Avoid generic templates like `This is a fruit`, avoid price/shopping/dialog scenes and avoid examples that all target languages can match while drifting away from English.
- selected compounds require whole-meaning proof if promoted later: `passion fruit`, `dragon fruit`, `star fruit` and similar names must stay whole fruit terms, not literal component translations.
- source-backed checks needed: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency, food-countability/profile gates, regional variant quality where applicable and final linguistic audit.
