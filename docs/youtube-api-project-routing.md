# YouTube API Project Routing

Status: **source of truth for local routing plan; `youtube 1`-`youtube 4` OAuth bundles uploaded; publish workflow selects route-specific GitHub environments**.

This document records how the 51 public YouTube support-language channels are assigned to four Google Cloud / YouTube API project routes named `youtube 1`, `youtube 2`, `youtube 3` and `youtube 4`.

It does **not** create Google Cloud projects, OAuth clients, GitHub secrets or YouTube quota. Those are external setup steps. The machine-readable mirror is `config/youtube-api-project-routing.json`; validate it with:

```bash
npm run check:youtube-api-project-routing
```

## Purpose

The publishing plan targets **54 de-jure support-language variants** but only **51 public support channels**:

- `EN` and `EN-GB` share channel `en`.
- `ES` and `ES-419` share channel `es`.
- `PT` and `PT-BR` share channel `pt`.

At the current publishing cadence of **6 scheduled public releases per support-language variant per day**, the total target is:

```text
54 variants * 6 releases/day = 324 scheduled public releases/day
```

The four-project route is an operational grouping for production upload automation. It is not a substitute for YouTube API audit/approval, quota extension, policy compliance, or channel daily upload limits.

## Project Summary

| API project route | Status | GitHub environment | Public channels | Support variants | Planned scheduled public releases/day |
| --- | --- | --- | ---: | ---: | ---: |
| `youtube 1` | GitHub OAuth bundle uploaded | `youtube-api-branding` | 12 | 15 | 90 |
| `youtube 2` | GitHub OAuth bundle uploaded | `youtube-api-youtube-2` | 13 | 13 | 78 |
| `youtube 3` | GitHub OAuth bundle uploaded | `youtube-api-youtube-3` | 13 | 13 | 78 |
| `youtube 4` | GitHub OAuth bundle uploaded | `youtube-api-youtube-4` | 13 | 13 | 78 |
| **Total** |  |  | **51** | **54** | **324** |

2026-06-22 route balancing update: `IT` moved from `youtube 1` to `youtube 4` after the primary route hit YouTube Data API quota during the Italian recovery run. The Italian channel was reauthorized through OAuth client `215536805171-...` into `.local/youtube-oauth/tokens/it-youtube-4.json`; read-only `channels.list(mine=true)` matched `UCOFZxCVdm4FqhFgMvKsAlOw` / `LunaCards Italiano` before the route config was changed.

OAuth note for `youtube 1`: browser readback on 2026-06-22 showed project `flashcardmate` / FlashCardMate is **In production** on Google Auth Platform Audience. This does not require creating a new OAuth client id/secret by itself. However, channel refresh tokens minted while the app was still in **Testing** should be re-authorized for the assigned `youtube 1` channels before relying on GitHub scheduled uploads, because Google's Testing publishing status issues refresh tokens that expire in 7 days for external apps with non-basic scopes.

2026-06-22 local reauthorization status: `youtube 1` has been reauthorized locally after the Production switch for its originally assigned channels using OAuth client `130628727588-...`; after the IT balancing move it is the active route for 12 public channels (`en`, `es`, `pt`, `ru`, `hi`, `id`, `fr`, `de`, `ja`, `ko`, `tr`, `zh`) / 15 support variants. Each token was verified with read-only YouTube `channels.list(mine=true)` and matched the expected configured `channelId`; each token metadata check showed a refresh token and no `refresh_token_expires_in` field. Token contents are local-only and must stay out of git. The `youtube 1` OAuth bundle was rebuilt with the expected client JSON and 13 original token files, then uploaded to GitHub repo `webpot-ru/luna`, environment `youtube-api-branding`, secret `YOUTUBE_OAUTH_BUNDLE_TGZ_B64`; readback via `gh secret list` shows update time `2026-06-22T04:52:30Z`. The old IT token in that historical bundle must not be used for new IT dispatches because routing now sends `IT` to `youtube-api-youtube-4`.

2026-06-22 local reauthorization status: `youtube 2` has been reauthorized locally for all 13 assigned channels (`vi`, `th`, `ms`, `pl`, `nl`, `sv`, `no`, `da`, `fi`, `cs`, `sk`, `hu`, `ro`) using OAuth client `327715936948-...`. Each token was verified with read-only YouTube `channels.list(mine=true)` and matched the expected configured `channelId`; each token metadata check showed a refresh token and no `refresh_token_expires_in` field. During setup, an initial `sk` attempt produced a token for `sv`; this was caught by channelId readback and corrected before continuing. Token contents remain local-only under `.local/youtube-oauth/tokens/` and must not be printed or committed. The route's GitHub environment `youtube-api-youtube-2` now exists; readback also shows `youtube-api-youtube-3` and `youtube-api-youtube-4`. After explicit user approval acknowledging the refresh-token storage risk, `YOUTUBE_OAUTH_BUNDLE_TGZ_B64` was uploaded to `webpot-ru/luna` environment `youtube-api-youtube-2`; `gh secret list --env youtube-api-youtube-2 --repo webpot-ru/luna` readback shows updated `2026-06-22T06:12:05Z`.

2026-06-22 local reauthorization status: `youtube 3` has been reauthorized locally for all 13 assigned channels (`bg`, `hr`, `sr`, `sl`, `lt`, `lv`, `et`, `is`, `bn`, `tl`, `my`, `km`, `lo`) using OAuth client `1076963270652-...`. Each token was verified with read-only YouTube `channels.list(mine=true)` and matched the expected configured `channelId`; each token metadata check showed a refresh token and no `refresh_token_expires_in` field. During setup, the first `my` attempts selected the `ml` / Malayalam channel; this was caught by channelId readback and corrected before continuing. Token contents remain local-only under `.local/youtube-oauth/tokens/` and must not be printed or committed. After explicit user approval acknowledging the refresh-token storage risk, `YOUTUBE_OAUTH_BUNDLE_TGZ_B64` was uploaded to `webpot-ru/luna` environment `youtube-api-youtube-3`; `gh secret list --env youtube-api-youtube-3 --repo webpot-ru/luna` readback shows updated `2026-06-22T06:58:15Z`.

2026-06-22 local reauthorization status: `youtube 4` has been reauthorized locally for its original 12 assigned channels (`ne`, `si`, `ta`, `te`, `kn`, `ml`, `uz`, `kk`, `az`, `ka`, `hy`, `sw`) plus moved `it`, using OAuth client `215536805171-...`. Each token was verified with read-only YouTube `channels.list(mine=true)` and matched the expected configured `channelId`; each token metadata check showed a refresh token and no `refresh_token_expires_in` field. Token contents remain local-only under `.local/youtube-oauth/tokens/` and must not be printed or committed. After explicit user approval acknowledging the refresh-token storage risk, `YOUTUBE_OAUTH_BUNDLE_TGZ_B64` was uploaded to `webpot-ru/luna` environment `youtube-api-youtube-4`; initial `gh secret list` readback showed updated `2026-06-22T07:35:20Z`. The moved IT token readback on 2026-06-22 matched `UCOFZxCVdm4FqhFgMvKsAlOw`; the route-4 bundle was rebuilt from the prior route-4 bundle plus `.local/youtube-oauth/tokens/it-youtube-4.json`, uploaded to `youtube-api-youtube-4`, and metadata-only `gh secret list` readback shows updated `2026-06-22T14:57:45Z`. GitHub Actions read-only run `27962244030` on commit `94c58ff` restored the route-4 bundle, validated `IT -> youtube-api-youtube-4`, and read back `IT ok channelId=ok banner=ok description=ok title-ok`; artifact `youtube-channel-branding-readback-2026-06-22T15-00-46-982Z.json` has `authorizedChannelCount=1`, `channelIdMatches=true` and `actualChannelId=UCOFZxCVdm4FqhFgMvKsAlOw`.

## Assignments

### youtube 1

Existing primary project. Keep the high-priority shared channels here first.

| Channel key | Support variants | Notes |
| --- | --- | --- |
| `en` | `EN`, `EN-GB` | Shared English channel. |
| `es` | `ES-419`, `ES` | Shared Spanish channel; Latin American Spanish is first-wave priority. |
| `pt` | `PT-BR`, `PT` | Shared Portuguese channel; Brazilian Portuguese is first-wave priority. |
| `ru` | `RU` | Existing tested Russian channel. |
| `hi` | `HI` | Hindi. |
| `id` | `ID` | Indonesian. |
| `fr` | `FR` | French. |
| `de` | `DE` | German. |
| `ja` | `JA` | Japanese. |
| `ko` | `KO` | Korean. |
| `tr` | `TR` | Turkish. |
| `zh` | `ZH` | Chinese. |

### youtube 2

| Channel key | Support variants |
| --- | --- |
| `vi` | `VI` |
| `th` | `TH` |
| `ms` | `MS` |
| `pl` | `PL` |
| `nl` | `NL` |
| `sv` | `SV` |
| `no` | `NO` |
| `da` | `DA` |
| `fi` | `FI` |
| `cs` | `CS` |
| `sk` | `SK` |
| `hu` | `HU` |
| `ro` | `RO` |

### youtube 3

| Channel key | Support variants |
| --- | --- |
| `bg` | `BG` |
| `hr` | `HR` |
| `sr` | `SR` |
| `sl` | `SL` |
| `lt` | `LT` |
| `lv` | `LV` |
| `et` | `ET` |
| `is` | `IS` |
| `bn` | `BN` |
| `tl` | `TL` |
| `my` | `MY` |
| `km` | `KM` |
| `lo` | `LO` |

### youtube 4

| Channel key | Support variants |
| --- | --- |
| `ne` | `NE` |
| `si` | `SI` |
| `ta` | `TA` |
| `te` | `TE` |
| `kn` | `KN` |
| `ml` | `ML` |
| `uz` | `UZ` |
| `kk` | `KK` |
| `az` | `AZ` |
| `ka` | `KA` |
| `hy` | `HY` |
| `sw` | `SW` |
| `it` | `IT` |

## Operational Rules

- The Google Sheet `Ютуб курсы FCL` / tab `YouTube каналы` remains the human source of truth for channel identity, channel id, current handle and live status.
- `config/youtube-channels.json` remains the machine-readable channel registry.
- `config/youtube-api-project-routing.json` maps those channels to API project routes and must not contain secrets.
- Each public support channel must be assigned to exactly one API project route.
- Each support-language variant must be assigned to exactly one API project route.
- Regional variants are preserved in video metadata, playlist keys, titles, descriptions and target/support codes. Only public site support-language URL paths collapse (`EN/EN-GB -> /en`, `ES/ES-419 -> /es`, `PT/PT-BR -> /pt`).
- A live upload workflow must choose the OAuth bundle/GitHub environment from the channel's route, not from the target language.
- `.github/workflows/youtube-video-publish.yml` has `youtube_environment` input. Use `auto` for a single support channel; the workflow selects `youtube-api-branding`, `youtube-api-youtube-2`, `youtube-api-youtube-3` or `youtube-api-youtube-4` before restoring `YOUTUBE_OAUTH_BUNDLE_TGZ_B64`.
- `.github/workflows/youtube-channel-branding-api.yml` also accepts `youtube_environment` for read-only route-specific token/channel readback. When `channels` is provided, it validates that the selected channel keys belong to the chosen GitHub environment before restoring the OAuth bundle.
- `scripts/resolve-youtube-api-environment.mjs` / `npm run resolve:youtube-api-environment` validates that the requested support code(s) belong to the selected GitHub environment. If a support list spans multiple API routes, the workflow must fail and the work must be split into separate dispatches.
- Default production dispatch shape is one support channel per run with `youtube_environment=auto`. Use an explicit GitHub environment only for debugging or replacement work, and only when it matches the route in `config/youtube-api-project-routing.json`.
- If one API project hits quota or returns `quotaExceeded`, stop that route only. Do not blindly retry the same write against another project unless the channel has been deliberately re-authorized under that project and the docs/config are updated.
- Bulk dispatcher defaults must keep route failure observable before launching more same-route writes: `.github/workflows/youtube-bulk-publish-dispatcher.yml` defaults to `max_active_per_route=1`. Raising it is a deliberate quota-risk decision, not a normal speed setting.
- GitHub API watcher/dispatch limits (including secondary rate limits) are entirely separate from YouTube API quota. The bulk dispatcher retries workflow-dispatch GitHub API rate limits before starting more child runs. If a dispatcher run terminates due to GitHub throttling, any skipped targets (marked as `skippedDispatcherStoppedCount` or `skipped_dispatcher_stopped`) have not consumed any YouTube Data API quota. If logs show GitHub `API rate limit exceeded` or secondary rate-limit errors after bounded retries, stop new dispatches, keep already-started child runs running, and rely on child artifacts plus `persist-publish-state` for durable state.
- A parent bulk dispatcher run is not upload proof. If its report shows `successCount=0`, missing child run ids, or child `dispatch_error` rows such as GitHub HTTP 403 rate limit / HTTP 422 unexpected workflow inputs, record that as `0` YouTube uploads and fix the GitHub dispatch contract before retrying. Proof of remote upload wave execution comes from child `youtube-video-publish.yml` runs, their artifacts, YouTube API readbacks, and persisted configuration updates (`config/youtube-published-videos.json`, `config/youtube-publish-calendar.json`, `config/youtube-playlists.json`).
- Bounded continuation after GitHub API throttle:
  - Do not blindly retry the same broad 39-support batch.
  - Build the remaining target list by comparing the dispatcher report with current committed `config/youtube-published-videos.json` state.
  - Run smaller batches with a safe backoff configuration: `max_parallel` at `3-4` max, `max_active_per_route=1`, and dispatch spacing (`dispatch_spacing_seconds`) at `60-120` seconds.
  - Fix playlist errors in repair-only mode (without reuploading or re-rendering videos).
  - Limit thumbnail generation to the allowlist where `customThumbnailUploadAllowed=true` (other channels use automatic first-frame fallback).
- Before retrying uploads after a dispatcher/watch failure, run the read-only live-audit workflow `.github/workflows/youtube-live-publication-audit.yml` for the affected route and persist its rows if it finds `missingFromLocalRegistryCount > 0`. This workflow reads `channels.list` / `playlistItems.list` only, expands `route:youtube-N` with `scripts/resolve-youtube-support-list.mjs`, and merges live YouTube upload readback into `config/youtube-published-videos.json` without rendering, uploading, playlist writes or thumbnail generation.
- New Google Cloud projects must be production/audited with matching YouTube API disclosure, OAuth consent configuration and GitHub environment secrets before they are used for public scheduled uploads.
- Token files, refresh tokens, client secrets and `.local` contents must stay out of git and out of this document.

## Before Adding Or Replacing API Project Routes

For each future project route or route replacement:

1. Create or confirm the external Google Cloud project and YouTube Data API access.
2. Configure OAuth consent in production mode where required.
3. Create the OAuth client for the runner/browser flow.
4. Authorize only the assigned support channels for that route.
5. Store the matching OAuth bundle as a GitHub Environment secret for the route.
6. Add or verify workflow support for selecting the route-specific environment by `support` channel.
7. Run a read-only token/channel identity check: token `channels.list(mine=true)` must match the expected `channelId` in the Sheet and `config/youtube-channels.json`.
8. Run a dry-run publish plan with quota estimate before any `videos.insert`.
9. Update `docs/PROJECT_STATE.md` with the exact readback state.
