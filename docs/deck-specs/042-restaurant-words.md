# Deck Spec: Restaurant Words

## Identity

| Field | Value |
| --- | --- |
| Sort | 42 |
| Deck | Restaurant Words |
| `set_id` | `food_restaurant_words_a2` |
| Content type | Vocabulary |
| Domain | Food & Eating |
| Area | Restaurant |
| Category / situation | Restaurant objects, roles, menu/order context and basic service vocabulary |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, food_countability, service_problem, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | restaurant_scope, menu_scene, service_word_boundary, order_context, food_countability, regional_variant_heavy, article_gender_marker_consistency, transcription_source_backing |
| Example complexity default | controlled A2 restaurant examples; no long ordering lines, complaints or multi-turn dialogues |

## Scope

Retroactive backfill spec from the 2026-07-07 local DB/master-plan sync. Local Postgres shows this deck as `generated_checked` / `approved`, with 32 cards and 1,728 language rows.

Include vocabulary for restaurant places, menus, tables, service roles, simple order context, reservations/checks where lexical and short. Exclude cafe drink options, fast-food packaging, bar/alcohol scope, full complaint phrases, payment systems and ready dialogues.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A2 |
| `level_max` | A2 |
| `frequency_band` scope | survival/common |
| `priority_band` scope | survival/common |
| Target item range | 32-32 |

## Candidate Pool Rule

Original runner/candidate-pool artifacts were not present in this worktree's ignored `outputs/` tree during the 2026-07-07 sync. Backfill exact pool and delivery evidence before treating this file as full pre-generation documentation.

## Next Deck

- operational next by Sort: `Advanced Foods & Seafood` (Sort 43), already generated in current local DB.

## QA Notes

- Keep examples in restaurant/menu/table scenes.
- Avoid phrase-card drift; card rows are lexical items, not ready orders.
- Non-RU language rows remain generated_checked, not native-approved.
