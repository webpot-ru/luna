# Deck Spec: Car & Driving Basics

## Identity

| Field | Value |
| --- | --- |
| Sort | 49 |
| Deck | Car & Driving Basics |
| `set_id` | `city_car_driving_basics_a2` |
| Content type | Vocabulary |
| Domain | City & Transport |
| Area | Car and driving |
| Category / situation | Private-car parts, simple driving actions, parking and fuel basics |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | car_driving_scope, vehicle_part_scope, parking_fuel_scene, road_safety_boundary, regional_variant_heavy, article_gender_marker_consistency, transcription_source_backing |
| Example complexity default | controlled A2 car/driving examples; no legal advice, accident reports or complex instructions |

## Scope

Retroactive backfill spec from the 2026-07-07 local DB/master-plan sync. Local Postgres shows this deck as `generated_checked` / `approved`, with 32 cards and 1,728 language rows.

Include basic private-car, driving, parking and fuel vocabulary that a learner meets in everyday city mobility. Exclude advanced car interior/road words, legal/insurance content, rental contracts, repair jargon and long driving instructions.

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

Original runner/candidate-pool artifacts were not present in this worktree's ignored `outputs/` tree during the 2026-07-07 sync. Backfill exact pool and delivery evidence before treating this file as complete generation history.

## Next Deck

- operational next by Sort: `Travel Basics` (Sort 50), currently `generated` / `candidate_pool` locally but not approved/generated_checked.

## QA Notes

- Keep examples in simple car, parking and fuel scenes.
- Avoid legal, accident, rental-contract and repair-jargon drift.
- Non-RU language rows remain generated_checked, not native-approved.
