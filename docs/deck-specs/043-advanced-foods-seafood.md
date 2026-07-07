# Deck Spec: Advanced Foods & Seafood

## Identity

| Field | Value |
| --- | --- |
| Sort | 43 |
| Deck | Advanced Foods & Seafood |
| `set_id` | `food_advanced_foods_seafood_b1_b2` |
| Content type | Vocabulary |
| Domain | Food & Eating |
| Area | Advanced Foods & Seafood |
| Category / situation | Less basic food, seafood and specialized everyday menu vocabulary |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, food_countability, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | advanced_food_scope, seafood_specificity, food_countability, culturally_variable_food_terms, regional_variant_heavy, article_gender_marker_consistency, transcription_source_backing |
| Example complexity default | controlled B1-B2 food examples; no recipes, allergy/medical claims or specialist culinary prose |

## Scope

Retroactive backfill spec from the 2026-07-07 local DB/master-plan sync. Local Postgres shows this deck as `generated_checked` / `approved`, with 32 cards and 1,728 language rows.

Include useful higher-level food and seafood vocabulary that does not fit the basic food, drink, fast-food, ingredients or restaurant service decks. Exclude rare gourmet terms, recipes, diet labels, restaurant service phrases and country-specific dishes unless they were explicitly selected as portable learner vocabulary.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Intermediate |
| `level_min` | B1 |
| `level_max` | B2 |
| `frequency_band` scope | useful/advanced |
| `priority_band` scope | useful/advanced |
| Target item range | 32-32 |

## Candidate Pool Rule

Original runner/candidate-pool artifacts were not present in this worktree's ignored `outputs/` tree during the 2026-07-07 sync. Backfill exact selected/backup/excluded evidence before using this spec as complete generation history.

## Next Deck

- operational next by Sort: `Street & City Places` (Sort 44), already generated in current local DB.

## QA Notes

- Preserve seafood/food specificity and avoid unsafe broad substitutions.
- Watch regional food names, loanwords, countability and article/gender markers.
- Non-RU language rows remain generated_checked, not native-approved.
