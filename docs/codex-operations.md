# Codex Operations

Status: **Source of truth** for Codex-specific project operation in this repository.

This document translates the current Codex app capabilities into the LunaCards/LUNA2 workflow. It does not replace [Project Workflow](project-workflow.md), [Video Lessons Strategy](video-lessons-strategy.md), [Multi-Device Management](multi-device-management.md), or `AGENTS.md`.

## Scope

Use these rules for Codex work inside this repository:

- video lesson generation, localization, YouTube metadata, thumbnails, playlists, and channel tooling;
- docs/data/QA changes that affect future agent work;
- Codex app features such as worktrees, handoff, Browser, Developer mode, hooks, Record & Replay, and automations.

Do not use this document as permission to access files outside the project, install plugins, change global Codex settings, authorize external apps, deploy, spend API credits, or perform YouTube writes. Those still need explicit user confirmation when they cross the project or cost/risk boundary.

## Local vs Worktree

Default split:

| Surface | Use for | Do not use for |
| --- | --- | --- |
| Local checkout | OAuth, `.local`, `.env.local`, YouTube Studio/account picker, Google token readback, local video artifacts, final integration checks | Parallel experiments that can dirty the same files |
| Codex worktree | docs-only work, dry-run planners, safety scripts, non-secret refactors, isolated PR-sized changes | workflows that need ignored local secrets or large ignored outputs unless manually prepared |
| Remote connection / mobile | monitoring active work, answering questions, reviewing diffs, approving scoped actions | starting secret-heavy OAuth flows without watching the selected account/channel |

Do not add a tracked `.worktreeinclude` that copies `.local`, `.env*`, `.secrets`, OAuth tokens, client secrets, database dumps, or generated video outputs into managed worktrees. If a worktree genuinely needs a local secret, treat it as a separate manual setup step and document the exact risk before doing it.

## Browser and Developer Mode

Use Browser or Chrome-based checks for visual/readback tasks:

- local preview of generated slides, thumbnails, banners, contact sheets, and pages;
- public YouTube `/about` readback;
- public site route and QR URL verification;
- performance or network diagnosis on local/public pages.

Use Developer mode only when normal browser inspection is insufficient, for example console/network/performance/CDP diagnosis. Do not enable or approve Developer mode for secret-bearing pages unless the user explicitly asks for that specific debugging session.

The in-app browser is not enough for signed-in YouTube Studio. Use the user's Chrome profile / Computer Use / Record & Replay only with explicit task scope and without exposing credentials.

## Record & Replay

Allowed uses:

- repeated YouTube Studio UI readback;
- repeated banner/watermark/profile-field workflow after the channel/account order is known;
- repeated account/channel picker navigation where the variable input is the target channel key.

Do not record:

- passwords, 2FA, recovery flows, cookies, API keys, OAuth token contents, `.env`, `.local`, `.secrets`, or contact email values;
- broad exploratory browsing that mixes unrelated accounts or projects;
- any flow that spends quota or writes public YouTube state without a separate explicit confirmation.

For per-channel YouTube token collection, Record & Replay may help only after the token-file order is fixed. The token files remain local secrets under `.local/youtube-oauth/tokens/<channel-key>.json`.

## Hooks and Safety Checks

This repository provides:

```bash
npm run check:codex-workflow
npm run check:codex-readonly
```

`check:codex-workflow` is intentionally lightweight. It inspects changed file paths and safe project config/docs, not secret file contents. It fails on obvious local secret paths entering Git-visible changes or dangerous `.worktreeinclude` content, and it warns when workflow-sensitive code changes appear without matching documentation updates.

`check:codex-readonly` is the default local drift-check bundle for Codex work. It runs the workflow safety check, public video URL mapping check, YouTube channel branding dry-run plan and YouTube token checklist with bounded per-command timeouts. The workflow safety check gets a wider timeout because it shells out to `git status --untracked-files=all`, which can be slow in a dirty multimedia worktree. The bundle also runs the video localization technical gate as an optional slow check; by default a timeout there is reported as a warning rather than blocking unrelated Codex operations. Use `npm run check:codex-readonly -- --strict` when video localization is part of the actual change and optional warnings should fail the run. Use `-- --skip-slow` only for quick handoff checks that do not touch video localization/generation.

Project-local Codex hooks live in:

```text
.codex/hooks.json
```

Hooks are advisory until trusted in the Codex hook review UI or local Codex CLI hook review. On 2026-06-20 the hook review for `/Users/lali/Documents/LUNA2` was accepted through the local Codex CLI (`Trust all and continue`), and a repeat CLI start opened the normal LUNA2 screen without the hook review prompt. After hook trust, the configured checks should:

- block obvious destructive shell commands such as `rm`, `git reset --hard`, `git clean`, `find ... -delete`, `rsync --delete`, and direct truncation;
- warn at the end of a turn when changed files suggest missing docs or missing validation commands;
- avoid reading or printing secret-bearing files.

If the hook blocks a legitimate action, use the project's safe workflow instead of bypassing it. File removal goes through `scripts/move-to-trash.sh` only after the user approves the removal scope.

Note: the desktop `exec_command` tool used by some Codex app sessions may not be the same hook-aware Bash tool surface. Do not treat that as permission to skip the project rules. Run `npm run check:codex-workflow` or `npm run check:codex-readonly` explicitly when the hook surface is unclear.

## Automations

Allowed default automation class: **read-only drift check**.

Safe automation prompt:

```text
In /Users/lali/Documents/LUNA2 read docs/README.md, docs/PROJECT_STATE.md, docs/codex-operations.md and the relevant source-of-truth document.
Do not modify files. Do not read .local, .env, .secrets, OAuth token files, client secrets, cookies or private key material.
Check git status and run only read-only local checks that do not spend quota, authorize external apps, deploy or write to YouTube/Google:
npm run check:codex-readonly
Run npm run check:youtube-metadata only on existing generated metadata paths when there is a concrete path to check.
Report drift, blockers, and the next safe action. Stop before OAuth, YouTube writes, public publish, paid Gemini/VectorEngine calls, video generation, deploys or external-service mutations.
```

Do not schedule unattended automations for:

- YouTube upload, playlist creation, public publish, channel writes, or OAuth;
- paid VectorEngine/Gemini/image/video generation;
- local bulk video rendering;
- database migrations or Google Sheets writes;
- cleanup/removal.

## Safe YouTube Publish Protocol

For ordinary or Polyglot publication, first run the read-only publication-control workflow or an equivalent authenticated four-route audit. The preflight must prove complete uploads-playlist pagination and report every live video and URL, durable ordinary/Polyglot registry coverage, calendar reservations, ordinary tails, the four required long/full Polyglot bundle tails, `contentScope`, thumbnail state, duplicate blockers and empty calendar dates before any render, TTS, metadata, image or YouTube write is approved. One Polyglot slot is `set + canonical support + bundle + contentScope`; target-hash drift inside an occupied slot is a blocker, not permission to reupload.

After explicit approval, dispatch each approved batch exactly once with `--no-watch`. Do not poll child runs continuously, retry failed uploads, or launch a replacement dispatch without separate approval. Perform one bounded status/readback pass later (normally after 10-15 minutes or on the user's next check). If a run fails after render, TTS, metadata or image generation, stop and report the exact stage and artifact; do not automatically repeat paid work or reupload a possibly accepted video.

Duplicate deletion is a separate irreversible write lane. It requires a user-reviewed tracked KEEP/DELETE manifest, one explicit OAuth route per job and `APPLY_YOUTUBE_DELETE`. Live apply without `--target-file` is forbidden. Before its first deletion, each route validates every pair on the configured channel and stops if popularity has reversed. It makes no deletion retries and preserves route reports for later durable registry/calendar merge.

An occupied Polyglot slot with a reviewed wrong target set is not a duplicate pair and must not be passed to the KEEP/DELETE runner. Use the tracked replacement plan plus `.github/workflows/youtube-delete-obsolete-polyglot.yml`. Its exact runner validates the old video ID against set, canonical support, bundle, content scope, current target set, configured route, live channel ID and API status before the first irreversible delete. It stops on the first error, never retries a delete and uploads the deletion report plus durable-state candidates. A fresh read-only publication audit must prove the slot is empty before the corrected upload is dispatched.

Current apply invariants are enforced in code: one workflow owns one physical support channel across branches, different channels may run in parallel, `worker_count=1`, `allow_republish=false`, scheduled publication is the default, direct `publish_at` is disabled, and the uploader requires a healthy strict live-control report no older than 30 minutes. `.github/workflows/youtube-publication-control.yml` is the canonical all-route read-only answer to “what is public, scheduled, private-unscheduled, missing or duplicated”; the same run also enumerates all owned playlists and playlist items for stable playlist-identity discovery.

For a mixed request such as “next 5 ordinary plus 1 full Polyglot per channel”, [YouTube Publication Campaigns](youtube-publication-campaigns.md) is the primary execution contract. Do not launch 102 independent selectors. Dispatch one no-watch publication-control run with `campaign_ordinary_per_channel=5`, `campaign_polyglot_per_channel=1` and `persist_snapshot=false`; it performs all four route readbacks and emits one immutable 51-channel no-spend manifest from the same evidence. Only after review/approval, claim every assignment and calendar slot in one fail-closed operation before apply, batch metadata by the four route environments, call campaign-owned child workflows, then run one finalizer. Child persistence is disabled automatically when `campaign_id` is present. A normal 306-video campaign uses 63 route-batched Gemini requests instead of 102 worker requests. Claims remain active on partial failure; recovery requires a new read-only audit and separate approval.

For a proven zero-upload campaign failure, do not keep repeating live audits when a complete pre-apply report and one complete post-failure report already have identical exact video-ID sets. Generate the replacement with `--replacement-campaign-id=<old-id>`, then use `npm run rearm:youtube-publication-campaign` in dry-run mode. Apply requires the exact zero-upload confirmation and may only supersede old campaign/calendar claims and write the new immutable manifest/claims; it must preserve all assignment keys, reallocate unsafe near-term slots and perform zero provider/YouTube calls. Commit/push the exact durable state before any separately approved publication dispatch.

Campaign metadata keeps up to 5 assignments in one request and uses the explicitly confirmed chain OpenAI Responses -> direct Google key 1 -> direct Google key 2 -> confirmed VectorEngine. OpenAI uses Structured Outputs, `store=false`, `OPENAI_SERVICE_TIER=auto` by default and records actual tier plus token usage; `flex` is opt-in, while OpenAI Batch remains outside this synchronous workflow because completion may take up to 24 hours. For `gemini-3.5-flash`, set `maxOutputTokens=60000` (below the model's `65536` output limit), use `600000 ms` for large structured responses and keep generated descriptions concise so the cap is reserve capacity rather than a target. Batch size `10` is forbidden in production after run `29323860280` returned `MAX_TOKENS` from both direct keys and truncated JSON from VectorEngine. The four route metadata matrix jobs must use `max-parallel: 1` because provider secrets are shared; queue routes instead of sending simultaneous bursts. An incomplete/refused/invalid OpenAI response advances once to Google without a same-provider retry. A non-`STOP` Google finish reason, invalid/truncated JSON, incomplete exact request-ID set, timeout, network failure or HTTP 5xx rotates once to the second direct key, then uses the explicitly confirmed VectorEngine backend. VectorEngine must split a logical batch into provider calls of at most two assignments (`2+2+1` for five), validate exact IDs per sub-batch and after the ordered merge, and remain the last fallback. Metadata failure still blocks every render/TTS/upload child. Each completed route batch must be checkpointed and the route artifact uploaded under `if: always()`. Reuse is opt-in only through exact `metadata_resume_run_id` on a separately approved recovery dispatch; ownership/checksum/batch mismatch fails before provider calls, and no recovery dispatch is automatic.

Quota preflight follows the June 2026 granular YouTube model. Report `videos.insert` as `estimatedVideoUploadCalls` in the separate upload bucket, and report playlist/thumbnail/delete operations as `estimatedGeneralQuotaUnits`; keep `estimatedQuotaUnits` only as the compatible arithmetic total. Do not use the historical `1600` general units per video. Current method costs used by the planner are: one upload call, `playlistItems.insert=50`, `playlists.insert=50`, `thumbnails.set=50`, and `videos.delete=50`.

The authenticated audit must call `videos.list(status)` for every scanned uploads-playlist ID, not only rows already matched to a registry assignment. A matched row with `uploadStatus=not_returned` is a blocker. A returned-status upload at or after the selected deck/channel audit window that cannot be classified by registry ID or course URL is also a blocker. A reviewed non-product video may be excluded only by exact YouTube ID in `config/youtube-live-audit-exclusions.json` with `status=reviewed_non_product` and a reason; title patterns and silent ignores are forbidden. All remaining unclassified IDs stay visible in the publication snapshot.

The only `not_returned` exception is an exact YouTube deletion tombstone proved by both signals in the same authenticated audit: uploads-playlist title exactly `Deleted video` and absence of that ID from `videos.list`. Record it as `youtubeDeletedTombstone`; do not count it as live coverage or as a transient status blocker. Reconcile the exact durable ID to `deleted_youtube_tombstone_confirmed`, then recompute tails. Never infer deletion from title alone, registry absence alone or an arbitrary `not_returned` response.

The control workflow always uploads `youtube-publication-snapshot.json`, `youtube-playlist-discovery-snapshot.json` and a compact Markdown map. Its optional `persist_snapshot=true` job commits only `config/youtube-publication-snapshot.json`, `config/youtube-playlist-discovery-snapshot.json` and `docs/youtube-publication-map.md` to the selected branch after the four-route audit; it performs no YouTube, metadata, render, TTS or image write. Keep the default `false` for a strictly read-only audit. Persisted snapshots are historical inventory, never apply tokens: live upload still requires a new per-support strict report with complete video and playlist pagination, no duplicate/registry/calendar blockers and age below 30 minutes.

When complete all-route reports prove the live state but the durable ordinary/Polyglot ledgers are stale, use `npm run reconcile:youtube-publication-registry-control -- --report=<deck1-all-routes.json> --report=<deck2-all-routes.json>`. It is dry-run by default; `--apply` changes only `config/youtube-published-videos.json`, `config/youtube-polyglot-published-videos.json` and `config/youtube-polyglot-progress.json`. The command refuses incomplete pagination/status evidence and live duplicates, restores observed live IDs as active durable rows, marks conflicting registry-only assignments inactive, migrates historical Polyglot rows out of the ordinary registry, and propagates exact confirmed deletion tombstones into matching Polyglot progress items so deleted slots can be planned again. Rebuild all route reports and the combined snapshot from the same audit artifacts after apply. This recovery never authorizes a GitHub dispatch, YouTube upload, deletion or schedule change.

Publication-control default ordinary completeness is resolved from the tracked 54-variant list in `config/language-order.json`, then filtered by the same-viewer regional-pair policy. GitHub audit runners must not fall through to local Postgres for this matrix; explicit workflow `targets` remain a supported narrower audit override.

Use `npm run reconcile:youtube-calendar-snapshot` to compare a complete persisted snapshot with `config/youtube-publish-calendar.json`. It is dry-run by default. `--apply` changes only the local calendar file and must skip every live duplicate group, ambiguous assignment, different-video assignment and occupied physical-channel slot. After apply, rebuild the route reports from the same audit artifacts and require zero assignment duplicates and slot collisions. This command never changes a YouTube schedule; any remote reschedule remains a separately approved YouTube write.

Custom cover preparation is also separate from publish apply. `.github/workflows/youtube-cover-assets-build.yml` and `npm run build:youtube-cover-assets` render deterministic overlays from the approved tracked bases and upload/build files only; they do not call Imagine, VectorEngine, Gemini image or YouTube. Use `--targets` and `--bundles` for an exact tail instead of generating unrelated assets. Apply may copy only exact JPGs present in `config/youtube-cover-assets.json` whose files are tracked by Git. A channel with `customThumbnailUploadAllowed=false` must receive no generated custom cover and no `thumbnails.set`; this flag does not block video generation/upload, which uses the accepted YouTube automatic thumbnail fallback. `true` permits a reviewed committed asset but is not permission to upload it without the normal YouTube-write approval.

The ordinary bulk dispatcher always sends `generate_thumbnails=false`; runtime image generation is forbidden. A combined cover manifest must be filtered by the cover row's own `setId` before any thumbnail plan/apply, so Deck #1 and Deck #2 assets cannot be cross-assigned.

Playlist registry recovery from the publication snapshot is local-only. `npm run reconcile:youtube-playlist-registry-snapshot` is dry-run by default; `--apply` may add only exact `support + target` rows backed by live ordinary video IDs, with blank `youtube_playlist_id`, status `planned_registry_from_live_snapshot` and `needsPlaylistDiscovery=true`. A blank ID never authorizes `playlists.insert`. Campaign planning consumes the fresh complete route-authenticated `config/youtube-playlist-discovery-snapshot.json`: exact registry ID, stable description marker, deterministic title or known source-video membership may resolve an existing playlist; complete no-match is the only state that can authorize one create. The uploader repeats owned-playlist discovery immediately before that create to close the plan/apply race and adds the stable key marker to new playlist descriptions. `scripts/youtube-upload-playlist-images.mjs` still fails on manifest/registry ID disagreement and refuses apply unless the exact cover file is tracked by Git. Playlist-image apply is a separately approved YouTube write; do not combine it with playlist creation.

## GitHub API Rate Limits and Direct CLI Dispatch

When orchestrating bulk publish waves across many channels, running `dispatch-youtube-bulk-publish.mjs` inside a GitHub Actions workflow can hit `HTTP 403: API rate limit exceeded for installation` because the runner's `GITHUB_TOKEN` is capped at 1,000 requests/hour for GitHub Apps/installations.

**Operational Rule & Fallback:**
If GitHub Actions dispatcher encounters rate limit errors, dispatch child workflows (`youtube-polyglot-video-publish.yml` or `youtube-video-publish.yml`) directly from the local terminal CLI via `gh workflow run ...` under the user's authenticated OAuth account (`lalishka`), which has a 5,000 requests/hour quota. The compute, rendering, TTS, and video upload tasks remain 100% in the cloud on GitHub Actions runners without straining the local machine.

## Branch Selection Safety (Ref Parameter)

When running dispatchers locally (`dispatch-youtube-bulk-publish.mjs` or `dispatch-youtube-polyglot-bulk-publish.mjs`), they automatically attempt to detect the current local Git branch and trigger remote GitHub workflows on it (falling back to `main` only if detection fails).

**Operational Rule:**
Always verify that the target branch in the console output is correct before confirming bulk operations. To force a specific branch target, pass the `--ref=<branch-name>` parameter explicitly. This prevents child workflows from executing on `main` using stale configurations or scripts before development branch changes are merged.

## Codex Access Tokens

Do not introduce Codex access tokens into this repository by default. They are for trusted non-interactive Codex local workflows in supported ChatGPT Business/Enterprise workspaces. If they are needed later, store them only in a secret manager or local ignored file, never in Git, docs, logs, or generated artifacts.

## Sites

Do not use Codex Sites for this project by default. LUNA2 is the video/YouTube pipeline, not the production host for `flashcardsluna.com`. Every Sites deployment URL is production-hosted; use it only for a deliberately separate preview/internal tool after the user approves the hosting boundary.

## Validation Before Close

For Codex-operations changes, at minimum run:

```bash
npm run check:codex-workflow
npm run check:codex-readonly
```

If the change touches YouTube/video code or config, also run the relevant existing project checks from `package.json`, for example:

```bash
npm run check:video-localization
npm run check:video-public-url
npm run plan:youtube-channel-branding
npm run plan:youtube-channel-tokens
```

Do not call work complete if only local files were checked but the requested outcome depends on Google Sheets, YouTube, GitHub Actions, public site routes, or another external readback.
