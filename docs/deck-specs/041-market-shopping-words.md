# Deck Spec: Market Shopping Words

## Identity

| Field | Value |
| --- | --- |
| Sort | 41 |
| Deck | Market Shopping Words |
| `set_id` | `shopping_market_shopping_words_a2` |
| Content type | Vocabulary |
| Domain | Shopping & Services / Food |
| Area | Market Shopping |
| Category / situation | Outdoor/local market vocabulary for stalls, fresh goods, quantities and simple buying context |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, food_countability, service_problem, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | market_stall_scope, fresh_goods_scope, quantity_scene, service_word_boundary, food_countability, regional_variant_heavy, article_gender_marker_consistency, transcription_source_backing |
| Example complexity default | controlled A2 market examples; no bargaining scripts or multi-turn dialogues |

## Scope

Retroactive backfill spec from the 2026-07-07 local DB/master-plan sync. Local Postgres shows this deck as `generated_checked` / `approved`, with 32 cards and 1,728 language rows.

Include local market words for stalls, vendors, fresh/ripe goods, quantities, scales, bags and simple market buying context. Exclude supermarket-only aisle/checkout terms, restaurant words, detailed bargaining phrases and advanced commerce/legal words.

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

Original runner/candidate-pool artifacts were not present in this worktree's ignored `outputs/` tree during the 2026-07-07 sync. Backfill the exact selected/backup/excluded evidence and readback artifacts before using this spec as full pre-generation proof.

## Next Deck

- operational next by Sort: `Restaurant Words` (Sort 42), already generated in current local DB.

## QA Notes

- Keep examples short and concrete: stall, bag, scale, kilo, fresh/ripe scene.
- Preserve regional market wording without turning examples into phrase cards.
- Non-RU language rows remain generated_checked, not native-approved.
