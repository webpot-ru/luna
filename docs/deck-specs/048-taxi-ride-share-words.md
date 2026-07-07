# Deck Spec: Taxi & Ride-share Words

## Identity

| Field | Value |
| --- | --- |
| Sort | 48 |
| Deck | Taxi & Ride-share Words |
| `set_id` | `city_taxi_ride_share_words_a2` |
| Content type | Vocabulary |
| Domain | City & Transport |
| Area | Taxi and ride-share services |
| Category / situation | Booking, pickup, drop-off and app-based ride service words |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, service_problem, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | taxi_scope, rideshare_app_scope, pickup_dropoff_scene, service_word_boundary, regional_variant_heavy, article_gender_marker_consistency, transcription_source_backing |
| Example complexity default | controlled A2 taxi/app examples; no complaint scripts or long booking dialogues |

## Scope

Retroactive backfill spec from the 2026-07-07 local DB/master-plan sync. Local Postgres shows this deck as `generated_checked` / `approved`, with 32 cards and 1,728 language rows.

Include taxi and ride-share vocabulary for driver, passenger, pickup, drop-off, app, ride, fare and simple service context. Exclude car parts, driving actions, detailed payment disputes, public transport and long request phrases.

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

- operational next by Sort: `Car & Driving Basics` (Sort 49), already generated in current local DB.

## QA Notes

- Keep examples lexical and service-scene anchored.
- Preserve app/taxi/ride-share distinctions across languages.
- Non-RU language rows remain generated_checked, not native-approved.
