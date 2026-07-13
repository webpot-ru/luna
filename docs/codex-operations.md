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

Current apply invariants are enforced in code: one workflow owns one physical support channel across branches, different channels may run in parallel, `worker_count=1`, `allow_republish=false`, scheduled publication is the default, direct `publish_at` is disabled, and the uploader requires a healthy strict live-control report no older than 30 minutes. `.github/workflows/youtube-publication-control.yml` is the canonical all-route read-only answer to “what is public, scheduled, private-unscheduled, missing or duplicated”.

The authenticated audit must call `videos.list(status)` for every scanned uploads-playlist ID, not only rows already matched to a registry assignment. A matched row with `uploadStatus=not_returned` is a blocker. A returned-status upload at or after the selected deck/channel audit window that cannot be classified by registry ID or course URL is also a blocker. A reviewed non-product video may be excluded only by exact YouTube ID in `config/youtube-live-audit-exclusions.json` with `status=reviewed_non_product` and a reason; title patterns and silent ignores are forbidden. All remaining unclassified IDs stay visible in the publication snapshot.

The control workflow always uploads `youtube-publication-snapshot.json` plus a compact Markdown map. Its optional `persist_snapshot=true` job commits only `config/youtube-publication-snapshot.json` and `docs/youtube-publication-map.md` to the selected branch after the four-route audit; it performs no YouTube, metadata, render, TTS or image write. Keep the default `false` for a strictly read-only audit. A persisted snapshot is historical inventory, never an apply token: live upload still requires a new per-support strict report with `videos.list`, `paginationComplete=true`, no duplicate/registry/calendar blockers and age below 30 minutes.

Use `npm run reconcile:youtube-calendar-snapshot` to compare a complete persisted snapshot with `config/youtube-publish-calendar.json`. It is dry-run by default. `--apply` changes only the local calendar file and must skip every live duplicate group, ambiguous assignment, different-video assignment and occupied physical-channel slot. After apply, rebuild the route reports from the same audit artifacts and require zero assignment duplicates and slot collisions. This command never changes a YouTube schedule; any remote reschedule remains a separately approved YouTube write.

Custom cover preparation is also separate from publish apply. `.github/workflows/youtube-cover-assets-build.yml` and `npm run build:youtube-cover-assets` render deterministic overlays from the approved tracked bases and upload/build files only; they do not call Imagine, VectorEngine, Gemini image or YouTube. Apply may copy only exact JPGs present in `config/youtube-cover-assets.json` whose files are tracked by Git. A channel with `customThumbnailUploadAllowed=false` remains untouched; `true` permits a reviewed committed asset but is not permission to upload it without the normal YouTube-write approval.

Playlist registry recovery from the publication snapshot is local-only. `npm run reconcile:youtube-playlist-registry-snapshot` is dry-run by default; `--apply` may add only exact `support + target` rows backed by live ordinary video IDs, with blank `youtube_playlist_id`, status `planned_registry_from_live_snapshot` and `needsPlaylistDiscovery=true`. A blank ID never authorizes `playlists.insert`: first perform route-authenticated read-only playlist discovery and reconcile any existing playlist. `scripts/youtube-upload-playlist-images.mjs` may resolve a later-discovered durable ID, but fails on manifest/registry ID disagreement and refuses apply unless the exact cover file is tracked by Git. Playlist-image apply is a separately approved YouTube write and must use the channel's route OAuth; do not combine discovery, playlist creation and image upload into one blind recovery step.

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
