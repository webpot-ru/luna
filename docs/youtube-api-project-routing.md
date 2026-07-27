# YouTube API Project Routing

Status: **source of truth for the eight-route active/standby contract. All routes `youtube-1`–`youtube-8` are publication-ready. Routes `youtube-5`–`youtube-8` have production OAuth clients, verified active channel tokens, separate GitHub Environments and OAuth bundle secrets, and completed full GitHub Actions identity readback for every active channel**.

This document records how the 51 public YouTube support-language channels are assigned to eight Google Cloud / YouTube API routes named `youtube-1` through `youtube-8`. The eight routes exist for operational convenience and future reviewed rearrangement. They do **not** double the accepted aggregate publication allowance.

The machine-readable mirror is `config/youtube-api-project-routing.json`; validate it with:

```bash
npm run check:youtube-api-project-routing
```

## Purpose

The publishing plan targets **54 de-jure support-language variants** but only **51 public support channels**:

- `EN` and `EN-GB` share channel `en`.
- `ES` and `ES-419` share channel `es`.
- `PT` and `PT-BR` share channel `pt`.

At the current publishing cadence of **6 scheduled public releases per support-language variant per day**, the target is:

```text
54 variants * 6 releases/day = 324 scheduled public releases/day
```

All routes together are additionally bounded by **400 `videos.insert` calls per America/Los_Angeles quota day**. Standby authorization never raises this limit and must not be used as quota fallback.

Terminology rule: call routes `youtube-1` through `youtube-8` in plans and reports. Do not write only “Project 2” or “project 3”: those phrases are easily confused with Deck #2 / Deck #3. A deck must always be named by `Deck #N / set_id`; an API route must always be named by its route key.

## Project Summary

| API project route | Status | GitHub environment | Public channels | Support variants | Planned scheduled public releases/day |
| --- | --- | --- | ---: | ---: | ---: |
| `youtube-1` | Existing OAuth bundle; active split ready after code deployment | `youtube-api-branding` | 6 | 9 | 54 |
| `youtube-2` | Existing OAuth bundle; active split ready after code deployment | `youtube-api-youtube-2` | 7 | 7 | 42 |
| `youtube-3` | Existing OAuth bundle; active split ready after code deployment | `youtube-api-youtube-3` | 7 | 7 | 42 |
| `youtube-4` | Existing OAuth bundle; active split ready after code deployment | `youtube-api-youtube-4` | 7 | 7 | 42 |
| `youtube-5` | Six-channel GitHub Actions identity readback passed; publication-ready | `youtube-api-youtube-5` | 6 | 6 | 36 |
| `youtube-6` | Six-channel GitHub Actions identity readback passed; publication-ready | `youtube-api-youtube-6` | 6 | 6 | 36 |
| `youtube-7` | Six-channel GitHub Actions identity readback passed; publication-ready | `youtube-api-youtube-7` | 6 | 6 | 36 |
| `youtube-8` | Six-channel GitHub Actions identity readback passed; publication-ready | `youtube-api-youtube-8` | 6 | 6 | 36 |
| **Total** |  |  | **51** | **54** | **324** |

The standard 306-video campaign split is `36/42/42/42/36/36/36/36`. Per-route planned daily release counts are below 100, while the eight-route aggregate remains `324 <= 400`.

## Active assignments and standby pairs

| Active route | Active channel keys | Canonical support variants | Standby pair | Full planned authorization on each paired route |
| --- | --- | --- | --- | --- |
| `youtube-1` | `en, es, pt, ru, hi, id` | `EN, EN-GB, ES-419, ES, PT-BR, PT, RU, HI, ID` | `youtube-5` | 12 channels: union of routes 1 and 5 |
| `youtube-5` | `fr, de, ja, ko, tr, zh` | `FR, DE, JA, KO, TR, ZH` | `youtube-1` | 12 channels: union of routes 1 and 5 |
| `youtube-2` | `vi, th, ms, pl, nl, sv, no` | `VI, TH, MS, PL, NL, SV, NO` | `youtube-6` | 13 channels: union of routes 2 and 6 |
| `youtube-6` | `da, fi, cs, sk, hu, ro` | `DA, FI, CS, SK, HU, RO` | `youtube-2` | 13 channels: union of routes 2 and 6 |
| `youtube-3` | `bg, hr, sr, sl, lt, lv, et` | `BG, HR, SR, SL, LT, LV, ET` | `youtube-7` | 13 channels: union of routes 3 and 7 |
| `youtube-7` | `is, bn, tl, my, km, lo` | `IS, BN, TL, MY, KM, LO` | `youtube-3` | 13 channels: union of routes 3 and 7 |
| `youtube-4` | `ne, si, ta, te, kn, ml, uz` | `NE, SI, TA, TE, KN, ML, UZ` | `youtube-8` | 13 channels: union of routes 4 and 8 |
| `youtube-8` | `kk, az, ka, hy, sw, it` | `KK, AZ, KA, HY, SW, IT` | `youtube-4` | 13 channels: union of routes 4 and 8 |

`supportChannelKeys` is the only active publication assignment. `plannedAuthorizationChannelKeys` may contain the full pair so the owner can swap channels later without repeating OAuth, but a token existing in the standby bundle does not make that route active. A swap requires one reviewed config/docs change that removes the channel from its old active route and adds it to the new one; validation must still prove exactly one active route per channel.

## Existing OAuth evidence

Historical 2026-06-22 evidence: `IT` moved from `youtube-1` to `youtube-4` after a route-1 quota failure. It was reauthorized through the route-4 OAuth client and `channels.list(mine=true)` matched the configured Italian channel. Under the new active split, `IT` is assigned to `youtube-8`; its route-8 bundle and exact active-channel identity were verified by the completed route-8 readback.

On 2026-06-22, route `youtube-1` was reauthorized after its Google Auth app moved to Production. Its local and GitHub bundle contains the 12-channel route-1/5 pair, and every token was checked against the configured channel ID.

On 2026-06-22, routes `youtube-2`, `youtube-3` and `youtube-4` were each authorized for their complete 13-channel future pair. Every token was checked against the configured channel ID before the corresponding GitHub environment bundle was uploaded. Token contents remain local-only.

Projects `flashcardsluna-5`, `flashcardsluna-6`, `flashcardsluna-7` and `flashcardsluna-8` were created on 2026-07-27. YouTube Data API v3 is enabled in all four. Each Google Auth Platform app is External and In production, and each has one desktop client named `LunaCards YouTube Route N Desktop`. Each route's six active tokens were read back through `channels.list(mine=true)` on 2026-07-27 and matched its configured public channel ID: route 5 `FR, DE, JA, KO, TR, ZH`; route 6 `DA, FI, CS, SK, HU, RO`; route 7 `IS, BN, TL, MY, KM, LO`; route 8 `KK, AZ, KA, HY, SW, IT`. GitHub account `webpot-ru` subsequently created Environments `youtube-api-youtube-5`–`youtube-api-youtube-8` and stored the matching `YOUTUBE_OAUTH_BUNDLE_TGZ_B64` secrets; the secret names were verified without reading values. The full six-channel GitHub Actions identity readbacks passed for route 5 ([30238235816](https://github.com/webpot-ru/luna/actions/runs/30238235816)), route 6 ([30238591503](https://github.com/webpot-ru/luna/actions/runs/30238591503)), route 7 ([30238592565](https://github.com/webpot-ru/luna/actions/runs/30238592565)) and route 8 ([30238593545](https://github.com/webpot-ru/luna/actions/runs/30238593545)): every expected active channel restored from the route secret and returned matching channel identity, banner and description evidence. These runs used the readback-only activation exception and made no branding, metadata, render, TTS, playlist or video-upload write. Routes 6–8 bundle their verified OAuth files under compatibility aliases for the historical configured token-file paths; future secret rebuilds must preserve that packaging mapping. Full-pair standby collection remains optional and does not block these active assignments.

Before collecting tokens for a new route, generate its exact active-plus-standby checklist:

```bash
npm run plan:youtube-channel-tokens -- --route=youtube-5
```

Use the same command for `youtube-6`, `youtube-7` and `youtube-8`. The planner derives the full pair from `plannedAuthorizationChannelKeys`, isolates each route under `.local/youtube-oauth-routes/<route>/.local/youtube-oauth/`, marks every row as active or standby, includes the expected public channel ID and prints explicit authorization/readback commands. `scripts/youtube-channel-branding.mjs --authorize --channel=<key>` now honors explicit `--oauth-client-file` and `--token-file` overrides so a standby token cannot silently land in the old route bundle.

## Historical four-route assignment before the 2026-07-27 split

This section is evidence only and is superseded by the active assignment table above.

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
- Each public support channel must be assigned to exactly one active API project route. Standby authorization does not count as an active assignment.
- Each support-language variant must be assigned to exactly one API project route.
- Regional variants are preserved in video metadata, playlist keys, titles, descriptions and target/support codes. Only public site support-language URL paths collapse (`EN/EN-GB -> /en`, `ES/ES-419 -> /es`, `PT/PT-BR -> /pt`).
- A live upload workflow must choose the OAuth bundle/GitHub environment from the channel's route, not from the target language.
- `.github/workflows/youtube-video-publish.yml` has `youtube_environment` input. Use `auto` for a single support channel; the workflow selects the matching environment from `youtube-api-branding` and `youtube-api-youtube-2` through `youtube-api-youtube-8` before restoring `YOUTUBE_OAUTH_BUNDLE_TGZ_B64`.
- `.github/workflows/youtube-channel-branding-api.yml` also accepts `youtube_environment` for read-only route-specific token/channel readback. When `channels` is provided, it validates that the selected channel keys belong to the chosen GitHub environment before restoring the OAuth bundle.
- Before a blocked route can become publication-ready, the same workflow has one narrow activation exception: `mode=readback`, `activation_readback=true`, an explicit matching environment and the route's complete active six-channel list. It passes `--activation-readback` only to the environment resolver, which rejects `auto`, partial/mixed support lists and already-ready routes. This exception restores the route's secret and runs the existing readback only; it cannot reach branding apply, metadata, render, TTS, playlist or video-upload code. No other workflow passes this flag. A successful six-channel identity readback is evidence to update `publicationReady`; the exception itself never changes routing state.
- `scripts/resolve-youtube-api-environment.mjs` / `npm run resolve:youtube-api-environment` validates that the requested support code(s) belong to the selected GitHub environment and that the route has `publicationReady=true`. If a support list spans multiple API routes, the workflow must fail and the work must be split into separate dispatches.
- Default production dispatch shape is one support channel per run with `youtube_environment=auto`. Use an explicit GitHub environment only for debugging or replacement work, and only when it matches the route in `config/youtube-api-project-routing.json`.
- If one API project hits quota or returns `quotaExceeded`, stop that route only. Do not retry through its paired standby route. A later route swap is a reviewed config/docs change, never automatic failover.
- All publication plans and manual batches together must remain at or below 400 video upload calls per America/Los_Angeles quota day. The projects' separate technical quota counters do not expand this owner-imposed aggregate allowance.
- Bulk dispatcher defaults must keep route failure observable before launching more same-route writes: `.github/workflows/youtube-bulk-publish-dispatcher.yml` defaults to `max_active_per_route=1`. Raising it is a deliberate quota-risk decision, not a normal speed setting.
- GitHub API watcher/dispatch limits (including secondary rate limits) are entirely separate from YouTube API quota. The bulk dispatcher retries workflow-dispatch GitHub API rate limits before starting more child runs. If a dispatcher run terminates due to GitHub throttling, any skipped targets (marked as `skippedDispatcherStoppedCount` or `skipped_dispatcher_stopped`) have not consumed any YouTube Data API quota. If logs show GitHub `API rate limit exceeded` or secondary rate-limit errors after bounded retries, stop new dispatches, keep already-started child runs running, and rely on child artifacts plus `persist-publish-state` for durable state.
- A parent bulk dispatcher run is not upload proof. If its report shows `successCount=0`, missing child run ids, or child `dispatch_error` rows such as GitHub HTTP 403 rate limit / HTTP 422 unexpected workflow inputs, record that as `0` YouTube uploads and fix the GitHub dispatch contract before retrying. Proof of remote upload wave execution comes from child `youtube-video-publish.yml` runs, their artifacts, YouTube API readbacks, and persisted configuration updates (`config/youtube-published-videos.json`, `config/youtube-publish-calendar.json`, `config/youtube-playlists.json`).
- Bounded continuation after GitHub API throttle:
  - Do not blindly retry the same broad 39-support batch.
  - Build the remaining target list by comparing the dispatcher report with current committed `config/youtube-published-videos.json` state.
  - Run smaller batches with a safe backoff configuration: no more than one active child per route, bounded global parallelism, and dispatch spacing (`dispatch_spacing_seconds`) at `60-120` seconds.
  - Fix playlist errors in repair-only mode (without reuploading or re-rendering videos).
  - Limit thumbnail generation to the allowlist where `customThumbnailUploadAllowed=true` (other channels use automatic first-frame fallback).
- Before retrying uploads after a dispatcher/watch failure, run the read-only live-audit workflow `.github/workflows/youtube-live-publication-audit.yml` for the affected route and persist its rows if it finds `missingFromLocalRegistryCount > 0`. This workflow reads `channels.list` / `playlistItems.list` only, expands `route:youtube-N` with `scripts/resolve-youtube-support-list.mjs`, and merges live YouTube upload readback into `config/youtube-published-videos.json` without rendering, uploading, playlist writes or thumbnail generation.
- New Google Cloud projects must be production/audited with matching YouTube API disclosure, OAuth consent configuration and GitHub environment secrets before they are used for public scheduled uploads.
- Routes `youtube-5`–`youtube-8` are publication-ready after their route-specific GitHub Actions identity readbacks proved that each `YOUTUBE_OAUTH_BUNDLE_TGZ_B64` secret restores all six expected active channel tokens. The activation exception is no longer accepted for these ready routes; future blocked routes remain fail-closed before metadata, render, TTS or YouTube writes.
- Token files, refresh tokens, client secrets and `.local` contents must stay out of git and out of this document.

## Before Adding Or Replacing API Project Routes

For each future project route or route replacement:

1. Create or confirm the external Google Cloud project and YouTube Data API access.
2. Configure OAuth consent in production mode where required.
3. Create the OAuth client for the runner/browser flow.
4. Authorize at least the route's active `supportChannelKeys`. Full `plannedAuthorizationChannelKeys` collection is optional standby preparation, not an activation requirement.
5. Store the matching OAuth bundle as a GitHub Environment secret for the route.
6. Add or verify workflow support for selecting the route-specific environment by `support` channel.
7. Run a read-only token/channel identity check: token `channels.list(mine=true)` must match the expected `channelId` in the Sheet and `config/youtube-channels.json`.
8. Run a dry-run publish plan with quota estimate before any `videos.insert`.
9. Update `docs/PROJECT_STATE.md` and the route status in `config/youtube-api-project-routing.json` with the exact readback state.
