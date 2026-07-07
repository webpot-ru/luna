# Deck Spec: Metro & Public Transport Words

## Identity

| Field | Value |
| --- | --- |
| Sort | 46 |
| Deck | Metro & Public Transport Words |
| `set_id` | `city_metro_public_transport_words_a2` |
| Content type | Vocabulary |
| Domain | City & Transport |
| Area | Transport |
| Category / situation | Metro and public transport navigation |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | metro_scope, public_transport_scope, station_platform_scene, navigation_boundary, regional_variant_heavy, article_gender_marker_consistency, transcription_source_backing |
| Example complexity default | controlled A2 public-transport examples; no long route instructions |

## Scope

Retroactive backfill spec from the 2026-07-07 local DB/master-plan sync. Local Postgres shows this deck as `generated_checked` / `approved`, with 32 cards and 1,728 language rows.

Include metro/public transport words for station, platform, line, route, ticket/turnstile and simple navigation objects. Exclude broad city transport basics, taxi/app vocabulary, car driving and full direction phrases.

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

- operational next by Sort: `Direction Words` (Sort 47), already generated in current local DB.

## QA Notes

- Preserve public-transport route/station semantics.
- Avoid long route sentences and country-specific fare systems unless explicitly selected.
- Non-RU language rows remain generated_checked, not native-approved.
