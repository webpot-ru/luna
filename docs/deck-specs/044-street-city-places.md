# Deck Spec: Street & City Places

## Identity

| Field | Value |
| --- | --- |
| Sort | 44 |
| Deck | Street & City Places |
| `set_id` | `city_street_city_places_a1_a2` |
| Content type | Vocabulary |
| Domain | City & Transport |
| Area | Street & City Places |
| Category / situation | City and street places |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | city_place_scope, street_scene, public_place_boundary, regional_variant_heavy, article_gender_marker_consistency, transcription_source_backing |
| Example complexity default | controlled A1-A2 place examples; one visible city/street location per example |

## Scope

Retroactive backfill spec from the 2026-07-07 local DB/master-plan sync. Local Postgres shows this deck as `generated_checked` / `approved`, with 32 cards and 1,728 language rows.

Include common city/street places and public location words. Exclude transport vehicles, route/direction words, government-office detail, travel/accommodation and ready sentences.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A1 |
| `level_max` | A2 |
| `frequency_band` scope | core/common |
| `priority_band` scope | core/common |
| Target item range | 32-32 |

## Candidate Pool Rule

Original runner/candidate-pool artifacts were not present in this worktree's ignored `outputs/` tree during the 2026-07-07 sync. Backfill exact pool and delivery evidence before treating this file as complete generation history.

## Next Deck

- operational next by Sort: `City Transport Basics` (Sort 45), already generated in current local DB.

## QA Notes

- Keep examples anchored to visible city places.
- Avoid over-specific country services unless intentionally selected.
- Non-RU language rows remain generated_checked, not native-approved.
