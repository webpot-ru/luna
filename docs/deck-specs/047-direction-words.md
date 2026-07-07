# Deck Spec: Direction Words

## Identity

| Field | Value |
| --- | --- |
| Sort | 47 |
| Deck | Direction Words |
| `set_id` | `city_direction_words_a1_a2` |
| Content type | Vocabulary |
| Domain | City & Transport |
| Area | Navigation |
| Category / situation | Simple city directions and orientation |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | closed_set, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | direction_orientation_scope, adverb_preposition_boundary, route_scene, regional_variant_heavy, article_gender_marker_consistency, transcription_source_backing |
| Example complexity default | controlled A1-A2 direction examples; short orientation scenes only |

## Scope

Retroactive backfill spec from the 2026-07-07 local DB/master-plan sync. Local Postgres shows this deck as `generated_checked` / `approved`, with 32 cards and 1,728 language rows.

Include short direction and orientation words such as left/right/straight/near/far/front/back style vocabulary. Exclude full route instructions, transportation objects, map-app UI strings and complex prepositional grammar lessons.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A1 |
| `level_max` | A2 |
| `frequency_band` scope | survival/common |
| `priority_band` scope | survival/common |
| Target item range | 32-32 |

## Candidate Pool Rule

Original runner/candidate-pool artifacts were not present in this worktree's ignored `outputs/` tree during the 2026-07-07 sync. Backfill exact pool and delivery evidence before treating this file as complete generation history.

## Next Deck

- operational next by Sort: `Taxi & Ride-share Words` (Sort 48), already generated in current local DB.

## QA Notes

- Preserve orientation meanings and avoid collapsing adverb/preposition senses without notes.
- Keep examples brief enough for stable cross-language alignment.
- Non-RU language rows remain generated_checked, not native-approved.
