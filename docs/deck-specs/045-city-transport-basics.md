# Deck Spec: City Transport Basics

## Identity

| Field | Value |
| --- | --- |
| Sort | 45 |
| Deck | City Transport Basics |
| `set_id` | `city_transport_basics_a1_a2` |
| Content type | Vocabulary |
| Domain | City & Transport |
| Area | City Transport Basics |
| Category / situation | Basic city transport vocabulary |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | transport_scope, vehicle_place_boundary, ticket_station_scene, regional_variant_heavy, article_gender_marker_consistency, transcription_source_backing |
| Example complexity default | controlled A1-A2 transport examples; simple vehicle/stop/ticket scenes |

## Scope

Retroactive backfill spec from the 2026-07-07 local DB/master-plan sync. Local Postgres shows this deck as `generated_checked` / `approved`, with 32 cards and 1,728 language rows.

Include basic city transport words for vehicles, stops, stations, tickets and simple movement context. Exclude detailed metro navigation, taxi/ride-share app words, driving/car parts and ready route phrases.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A1 |
| `level_max` | A2 |
| `frequency_band` scope | common |
| `priority_band` scope | common |
| Target item range | 32-32 |

## Candidate Pool Rule

Original runner/candidate-pool artifacts were not present in this worktree's ignored `outputs/` tree during the 2026-07-07 sync. Backfill exact pool and delivery evidence before treating this file as complete generation history.

## Next Deck

- operational next by Sort: `Metro & Public Transport Words` (Sort 46), already generated in current local DB.

## QA Notes

- Preserve vehicle/place distinctions and regionally variable transport terms.
- Keep examples short and lexical rather than phrase-card routes.
- Non-RU language rows remain generated_checked, not native-approved.
