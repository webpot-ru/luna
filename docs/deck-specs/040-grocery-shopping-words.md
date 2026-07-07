# Deck Spec: Grocery Shopping Words

## Identity

| Field | Value |
| --- | --- |
| Sort | 40 |
| Deck | Grocery Shopping Words |
| `set_id` | `food_grocery_shopping_words_a2` |
| Content type | Vocabulary |
| Domain | Food & Eating |
| Area | Grocery Shopping |
| Category / situation | Grocery-store words for aisles, baskets, checkout, packages and everyday shopping context |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, food_countability, service_problem, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | grocery_store_scope, package_label_scope, checkout_scene, service_word_boundary, food_countability, regional_variant_heavy, article_gender_marker_consistency, transcription_source_backing |
| Example complexity default | controlled A2 store examples; one grocery-store object/action scene, no long shopping dialogues |

## Scope

Retroactive backfill spec from the 2026-07-07 local DB/master-plan sync. Local Postgres shows this deck as `generated_checked` / `approved`, with 32 cards and 1,728 language rows.

Include grocery-store vocabulary for aisles, baskets/carts, shelves, checkout, receipts, labels, packages and simple store navigation. Exclude restaurant ordering, market bargaining, full price/payment systems, advanced food names and ready phrases.

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

Original runner/candidate-pool artifacts were not present in this worktree's ignored `outputs/` tree during the 2026-07-07 sync. Before using this spec as full pre-generation evidence, backfill the candidate-pool summary, selected/backup/excluded counts and exact QA/readback artifacts from the original run.

## Next Deck

- operational next by Sort: `Market Shopping Words` (Sort 41), already generated in current local DB.

## QA Notes

- Keep examples anchored to grocery-store scenes, not restaurant or street-market bargaining.
- Preserve package/countability distinctions and regional store terminology.
- Non-RU language rows remain generated_checked, not native-approved.
