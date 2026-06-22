# Video Lessons Registry

Этот документ является реестром сгенерированных видеоуроков FlashcardsLuna. Он используется для отслеживания дат сборки, параметров компиляции и сохранения ссылок на опубликованные ролики на YouTube.

Статус: **Source of Truth для реестра видеоуроков**.

Важно: этот Markdown-документ является **человеческим реестром видео**, а не machine-readable ledger для YouTube upload/playlist automation. Историческая таблица ниже может содержать повторные pending-строки и рабочие записи по одному и тому же `set_id` / языковой паре; из нее нельзя напрямую создавать плейлисты, загружать видео или делать `playlistItems.insert`.

Accepted playlist/upload contract lives in [Video Lessons Strategy - Playlist architecture](video-lessons-strategy.md#13-playlist-architecture). Future automation must use structured files:

```text
config/youtube-channels.json
config/youtube-playlists.json
config/youtube-published-videos.json
config/youtube-publish-schedule-policy.json
outputs/youtube-publish-ledger.jsonl
```

The committed publication registry is `config/youtube-published-videos.json`; it is the durable machine-readable list of videos that have been uploaded/read back and should survive GitHub artifact expiration. The per-run structured ledger `outputs/youtube-publish-ledger.jsonl` must store stable `playlist_key`, `youtube_video_id`, `youtube_playlist_id`, `playlistItemId`, privacy/status, timestamp and readback result. This Markdown registry can summarize or link to those facts after readback, but it must not be the only state used for idempotent YouTube API writes.

Production publication policy from 2026-06-21: default video/playlist visibility is `public`. For paced rollout, use scheduled upload: metadata must have `privacyStatus=private` and future `publishAt`, and YouTube will make the video public at that time. `private` and `unlisted` without `publishAt` are allowed only as temporary test/pre-publication states or for copyright checks; they should be promoted to `public` or superseded before batch rollout.

Scheduling/statistics policy from 2026-06-21: `config/youtube-publish-schedule-policy.json` covers all 51 support-language channels with per-channel timezones and six default local publication slots: `08:30`, `11:30`, `14:30`, `17:30`, `20:30`, `23:30`. Accepted starting cadence is one deck wave across all 51 channels at 6 public releases per channel per local day; do not run multiple deck waves at once or raise cadence until 24h/72h/7d readback and policy health are acceptable. 50 videos on one ordinary channel therefore require about 9 local days. The schedule planner writes `publishAt` plus analytics checkpoints into metadata; `npm run plan:youtube-analytics-readback` later shows which 24h/72h/7d/30d performance checkpoints are due. `npm run read:youtube-video-statistics -- --fetch --confirm-youtube-read --due-only` and `.github/workflows/youtube-video-statistics-readback.yml` then read cumulative YouTube Data API view/like/comment snapshots for due checkpoints. Final analytics values should be appended here only after API readback, not inferred from fresh-publication zeros. Watch-time/retention metrics need a later YouTube Analytics API `reports.query` scope check if we decide to track them.

Parallel-run policy from 2026-06-21: GitHub video generation may be split across deterministic workers with `worker_count` and `worker_index`, but every shard must pass `npm run check:youtube-run-isolation` before scheduled upload or publication. The registry key remains `setId + supportLang + targetLang`; parallel runs must not create duplicate current rows for the same key unless `allow_republish=true` is intentionally used and the old video is marked superseded. Planned 5-server tests should use `worker_count=5`, `worker_index=0..4`, `concurrency=2`, `publish_mode=scheduled`, and the generated shard/isolation reports as evidence before scaling toward 20 workers.

Scale policy from 2026-06-21: do not interpret "20 GitHub workers x 2 video threads" as permission to publish everything at once. With 54 language variants, the full directed pair matrix is `54 * 53 = 2,862` possible videos per deck, or `2,856` after excluding the six regional duplicate directions `EN <-> EN-GB`, `ES <-> ES-419` and `PT <-> PT-BR`. Across 180 decks this is `514,080` videos. The shared public channels `en`, `es` and `pt` each receive two support variants and therefore about 104 videos per deck; ordinary public support channels receive about 53. This registry should summarize staged, readback-verified batches only; broad future rows must come from structured publication evidence, not estimates.

2026-06-19 fresh-run note: `home_kitchen_cookware_pilot_01` is being restarted as the first clean video batch. Existing rows below for this `set_id` from 2026-06-14 / 2026-06-15 and earlier GitHub/local video artifacts are historical working evidence only. Do not use them as current publish readiness, playlist membership, or upload state. The fresh rerun should append new current rows/readback instead of treating old `Pending` rows as active state.

---

## Current Published / Readback Rows

These rows are current YouTube upload/readback facts from the structured GitHub artifact/ledger, not historical planning rows.

| Set ID | Title | Target | Support | Built / Uploaded | GitHub run | Status | Video | Playlist | Readback |
|---|---|---|---|---|---|---|---|---|---|
| `home_kitchen_cookware_pilot_01` | रूसी भाषामा भान्साका सामानहरू \| Russian A1 Vocabulary: Kitchenware (50 Words) | RU | NE | 2026-06-22 | `27938028373` | `scheduled_uploaded`, `private` until `2026-06-23T02:45:00Z`, `thumbnailUploadMode=custom`, `thumbnailSet=true` | https://www.youtube.com/watch?v=2pj0DnZ-ftc | https://www.youtube.com/playlist?list=PLzHdIxZgrAa2T5sK1MdIOObs8haHWSPAU | channel `UCL1bQyM5VsxW8-n8KUqln2A` / `@lunacardsnepali`, playlist item `UEx6SGRJeFpnckFhMlQ1c0sxTWRJT09iczhoYUhXU1BBVS41NkI0NEY2RDEwNTU3Q0M2`, YouTube API readback `processed/private/scheduled`; description contains the full course URL `https://flashcardsluna.com/ne/courses/kitchenware-basic/study/standard?langs=ru`; follow-up `youtube.thumbnails.set` succeeded on `2026-06-22T09:05:12Z` with generated `vectorengine-gpt-image-2` thumbnail; durable row in `config/youtube-published-videos.json` |
| `home_kitchen_cookware_pilot_01` | Испанский язык для начинающих: Кухонная посуда (A1) \| 50 слов с произношением | ES | RU | 2026-06-21 | `27901311565` | `published_uploaded`, `public`, thumbnail set, logo overlay | https://www.youtube.com/watch?v=TMOdF3jl2wQ | https://www.youtube.com/playlist?list=PLx5nIeqMBQ7kjzCzItWOtLDCjmHJjYJXq | channel `UC1f5EyXEMejXIumH9104GMA`, playlist item `UEx4NW5JZXFNQlE3a2p6Q3pJdFdPdExEQ2ptSEpqWUpYcS4wMTcyMDhGQUE4NTIzM0Y5`, YouTube API readback `uploaded/public`, HTTP `200`; durable row in `config/youtube-published-videos.json`; supersedes duplicate `dWk3ncNgrFU` and old unlisted upload `xOh97WAt53k` |
| `home_kitchen_cookware_pilot_01` | Итальянский язык для начинающих: Кухонная посуда (A1) \| 50 слов с произношением | IT | RU | 2026-06-21 | `27901311565` | `published_uploaded`, `public`, thumbnail set, logo overlay | https://www.youtube.com/watch?v=TkHEdDbwqRg | https://www.youtube.com/playlist?list=PLx5nIeqMBQ7nErSrdTYvIuGmj1hsz1EBo | channel `UC1f5EyXEMejXIumH9104GMA`, playlist item `UEx4NW5JZXFNQlE3bkVyU3JkVFl2SXVHbWoxaHN6MUVCby41NkI0NEY2RDEwNTU3Q0M2`, YouTube API readback `uploaded/public`, HTTP `200`; durable row in `config/youtube-published-videos.json`; new playlist `RU__IT__ordinary-vocabulary__a1-everyday` |
| `home_kitchen_cookware_pilot_01` | Азербайджанский язык для начинающих: Кухонная посуда \| 50 слов с произношением (A1) | AZ | RU | 2026-06-21 | `27907980754` | `published_uploaded`, `public`, thumbnail set | https://www.youtube.com/watch?v=mealfhnUI6w | https://www.youtube.com/playlist?list=PLx5nIeqMBQ7kh2PdTCV63vqZ6gaDGqgo6 | channel `UC1f5EyXEMejXIumH9104GMA`, playlist item `UEx4NW5JZXFNQlE3a2gyUGRUQ1Y2M3ZxWjZnYURHcWdvNi41NkI0NEY2RDEwNTU3Q0M2`, YouTube API readback `uploaded/public`; durable row in `config/youtube-published-videos.json`; playlist `RU__AZ__ordinary-vocabulary__a1-everyday` |
| `home_kitchen_cookware_pilot_01` | Болгарский язык для начинающих: Кухонная посуда (A1) \| 50 слов с произношением | BG | RU | 2026-06-21 | `27907983785` | `published_uploaded`, `public`, thumbnail set | https://www.youtube.com/watch?v=3A8E4ehVUV8 | https://www.youtube.com/playlist?list=PLx5nIeqMBQ7lCEU1vGsqAlHAY4c1fmoeS | channel `UC1f5EyXEMejXIumH9104GMA`, playlist item `UEx4NW5JZXFNQlE3bENFVTF2R3NxQWxIQVk0YzFmbW9lUy41NkI0NEY2RDEwNTU3Q0M2`, YouTube API readback `uploaded/public`; durable row in `config/youtube-published-videos.json`; playlist `RU__BG__ordinary-vocabulary__a1-everyday` |
| `home_kitchen_cookware_pilot_01` | Бенгальский язык для начинающих: Кухонная посуда \| 50 слов с произношением (A1) | BN | RU | 2026-06-21 | `27907985841` | `published_uploaded`, `public`, thumbnail set | https://www.youtube.com/watch?v=wxs2_ky0NOQ | https://www.youtube.com/playlist?list=PLx5nIeqMBQ7njyLBd3AwP8U0RYQtIiH2B | channel `UC1f5EyXEMejXIumH9104GMA`, playlist item `UEx4NW5JZXFNQlE3bmp5TEJkM0F3UDhVMFJZUXRJaUgyQi41NkI0NEY2RDEwNTU3Q0M2`, YouTube API readback `uploaded/public`; durable row in `config/youtube-published-videos.json`; playlist `RU__BN__ordinary-vocabulary__a1-everyday` |
| `home_kitchen_cookware_pilot_01` | Датский язык для начинающих: Кухонная посуда (A1) \| 50 слов с произношением | DA | RU | 2026-06-21 | `27907990351` | `published_uploaded`, `public`, thumbnail set | https://www.youtube.com/watch?v=pjL2V_cw4J4 | https://www.youtube.com/playlist?list=PLx5nIeqMBQ7lVJeqjULrPYJEOxl6wiJxJ | channel `UC1f5EyXEMejXIumH9104GMA`, playlist item `UEx4NW5JZXFNQlE3bFZKZXFqVUxyUFlKRU94bDZ3aUp4Si41NkI0NEY2RDEwNTU3Q0M2`, YouTube API readback `uploaded/public`; durable row in `config/youtube-published-videos.json`; playlist `RU__DA__ordinary-vocabulary__a1-everyday` |
| `home_kitchen_cookware_pilot_01` | Немецкий язык A1: Кухонная посуда \| 50 немецких слов с произношением | DE | RU | 2026-06-21 | `27907993005` | `published_uploaded`, `public`, thumbnail set | https://www.youtube.com/watch?v=xhATYbPtMcw | https://www.youtube.com/playlist?list=PLx5nIeqMBQ7m3A7saOwbdnVplWjTD8SAT | channel `UC1f5EyXEMejXIumH9104GMA`, playlist item `UEx4NW5JZXFNQlE3bTNBN3NhT3diZG5WcGxXalREOFNBVC41NkI0NEY2RDEwNTU3Q0M2`, YouTube API readback `uploaded/public`; durable row in `config/youtube-published-videos.json`; playlist `RU__DE__ordinary-vocabulary__a1-everyday` |
| `home_kitchen_cookware_pilot_01` | Английский язык A1: Кухонная посуда. 50 базовых слов с произношением | EN-GB | RU | 2026-06-21 | `27907996216` | `uploaded_public_playlist_insert_pending_quota`, thumbnail set | https://www.youtube.com/watch?v=PUYdVmjGSjM | https://www.youtube.com/playlist?list=PLx5nIeqMBQ7m77gIX7FmDZoIjrhsX3MfF | GitHub ledger has video id `PUYdVmjGSjM` and playlist id `PLx5nIeqMBQ7m77gIX7FmDZoIjrhsX3MfF`; run failed on `playlistItems.insert` with `quotaExceeded`, so playlist membership is pending. Public oEmbed readback returned HTTP `200`, title and author `@LunaCardsRU`; durable row in `config/youtube-published-videos.json` blocks duplicate reupload and marks `needsPlaylistInsert=true` |
| `home_kitchen_cookware_pilot_01` | Испанский язык (Латинская Америка) A1: Кухонная посуда \| 50 слов с произношением | ES-419 | RU | 2026-06-21 | `27907997635` | `published_uploaded`, `public`, thumbnail set | https://www.youtube.com/watch?v=hIJfc6O3Sf8 | https://www.youtube.com/playlist?list=PLx5nIeqMBQ7lrJUJZBw6e5cVIU7Vfd9kU | channel `UC1f5EyXEMejXIumH9104GMA`, playlist item `UEx4NW5JZXFNQlE3bHJKVUpaQnc2ZTVjVklVN1ZmZDlrVS41NkI0NEY2RDEwNTU3Q0M2`, YouTube API readback `uploaded/public`; durable row in `config/youtube-published-videos.json`; playlist `RU__ES-419__ordinary-vocabulary__a1-everyday` |
| `home_kitchen_cookware_pilot_01` | Эстонский язык для начинающих: Кухонная посуда (A1) \| 50 слов с произношением | ET | RU | 2026-06-21 | `27908000085` | `published_uploaded`, `public`, thumbnail set | https://www.youtube.com/watch?v=2Zu3bMHTCVI | https://www.youtube.com/playlist?list=PLx5nIeqMBQ7mE1hZLLpMymDEUz1ylIbzy | channel `UC1f5EyXEMejXIumH9104GMA`, playlist item `UEx4NW5JZXFNQlE3bUUxaFpMTHBNeW1ERVV6MXlsSWJ6eS41NkI0NEY2RDEwNTU3Q0M2`, YouTube API readback `uploaded/public`; durable row in `config/youtube-published-videos.json`; playlist `RU__ET__ordinary-vocabulary__a1-everyday` |
| `home_kitchen_cookware_pilot_01` | Хорватский язык для начинающих: Кухонная посуда \| 50 слов с произношением | HR | RU | 2026-06-21 | `27908006833` | `published_uploaded`, `public`, thumbnail set | https://www.youtube.com/watch?v=KIBrN6sGm3s | https://www.youtube.com/playlist?list=PLx5nIeqMBQ7meu-q7s1z0YpLuMuSgxAEX | channel `UC1f5EyXEMejXIumH9104GMA`, playlist item `UEx4NW5JZXFNQlE3bWV1LXE3czF6MFlwTHVNdVNneEFFWC41NkI0NEY2RDEwNTU3Q0M2`, YouTube API readback `uploaded/public`; durable row in `config/youtube-published-videos.json`; playlist `RU__HR__ordinary-vocabulary__a1-everyday` |
| `home_kitchen_cookware_pilot_01` | Венгерский язык для начинающих A1: Кухонная посуда \| 50 слов с произношением | HU | RU | 2026-06-21 | `27908008396` | `published_uploaded`, `public`, thumbnail set | https://www.youtube.com/watch?v=ONpDMc5HQY0 | https://www.youtube.com/playlist?list=PLx5nIeqMBQ7ndFHY8nQ4mUU7jmyg5aB_r | channel `UC1f5EyXEMejXIumH9104GMA`, playlist item `UEx4NW5JZXFNQlE3bmRGSFk4blE0bVVVN2pteWc1YUJfci41NkI0NEY2RDEwNTU3Q0M2`, YouTube API readback `uploaded/public`; durable row in `config/youtube-published-videos.json`; playlist `RU__HU__ordinary-vocabulary__a1-everyday` |

2026-06-21 duplicate-guard note: GitHub run `27901311565` was started with `langs=ES,IT`, so it reuploaded ES before the workflow checked the durable publication registry. The old ES video `dWk3ncNgrFU` is now marked `superseded_by_reupload_pending_user_delete` in `config/youtube-published-videos.json`. The workflow was updated after this incident: `config/youtube-published-videos.json` is now an idempotency guard, and any active existing `setId + supportLang + targetLang` row blocks `mode=apply` unless the operator explicitly passes `allow_republish=true`.

2026-06-21 20-run immediate-public capacity test: GitHub runs `27907980754` through `27908018244` were dispatched as 20 deterministic workers for the single RU support channel (`support=RU`, `worker_count=20`, `worker_index=0..19`, `privacy=public`, `publish_mode=public_now`). This was the wrong shape for testing 20 different support-language channels: it split target languages inside the RU channel. Final result: 9 succeeded completely and are marked above plus in `config/youtube-published-videos.json` / `config/youtube-playlists.json` (`AZ`, `BG`, `BN`, `DA`, `DE`, `ES-419`, `ET`, `HR`, `HU`); 1 additional run (`EN-GB`) uploaded a public video and created a public playlist but failed on `playlistItems.insert` with `quotaExceeded`, so it is marked as partial/pending playlist insert; 7 failed before video upload with YouTube Data API `quotaExceeded`; 3 were cancelled during build/thumbnail work after quota exhaustion to stop further spend. Failed/cancelled targets (`CS`, `EN`, `FI`, `FR`, `HI`, `HY`, `ID`, `IS`, `JA`, `KA`) are not marked as published and remain eligible after quota reset. Next multi-channel test must use separate workflow dispatches with distinct `support` values and `publish_mode=scheduled`, not 20 `worker_index` shards under `support=RU`.

2026-06-22 EN scheduled upload quota probe: GitHub run `27922957687` was dispatched for `set=home_kitchen_cookware_pilot_01`, `support=EN`, `langs=RU`, `mode=apply`, `publish_mode=scheduled`, `privacy=public`, `worker_count=1`, `worker_index=0`, `generate_thumbnails=true`. Generation, AI metadata, schedule assignment, thumbnail generation, SEO metadata QA, playlist naming QA, TTS variant QA and publish planning all passed. The run built `lesson_ru_en.mp4` and `youtube_thumbnail.jpg`, planned playlist key `EN__RU__ordinary-vocabulary__a1-everyday`, estimated `1750` quota units and assigned `publishAt=2026-06-23T12:30:00.000Z`, but upload failed before `videos.insert`: `POST /youtube/v3/playlists` returned `403`, `domain=youtube.quota`, `reason=quotaExceeded`. No `youtubeVideoId` or `youtubePlaylistId` was created, so this is not a published/readback row and `EN -> RU` remains eligible after API quota reset.

2026-06-22 NE scheduled upload canary: GitHub run `27938028373` was dispatched for `support=NE`, `langs=RU`, `mode=apply`, `publish_mode=scheduled`, `youtube_environment=auto`; routing correctly selected environment `youtube-api-youtube-4`. Generation, VectorEngine/Gemini metadata, schedule assignment, thumbnail generation, SEO metadata QA, playlist naming QA, TTS variant QA and publish planning all passed. YouTube upload succeeded as `private` with future `publishAt=2026-06-23T02:45:00Z`; playlist `NE__RU__ordinary-vocabulary__a1-everyday` / `PLzHdIxZgrAa2T5sK1MdIOObs8haHWSPAU` exists and playlist item insertion was completed after failure readback. The original workflow failed only at `thumbnails.set` with `domain=youtube.thumbnail`, `reason=forbidden`; after the user confirmed the Nepali channel, the generated thumbnail from artifact `27938028373` was recovered and `npm run set:youtube-thumbnail` successfully called `youtube.thumbnails.set` for video `2pj0DnZ-ftc` at `2026-06-22T09:05:12Z`. The video and full description URL were verified by YouTube API; the visible `kitc...` in YouTube UI is display truncation, not an uploaded-description truncation. `config/youtube-channels.json` now marks `ne` with `customThumbnailUploadAllowed=true`, so future NE runs can use normal custom-thumbnail generation/upload.

2026-06-21 ES playlist visibility note: the active ES video `TMOdF3jl2wQ` is public, but the reused ES playlist registry entry was originally `created_unlisted`. Visibility-only workflow runs `27901693765` and `27901807080` attempted to promote video + playlist to `public` without rerendering, but failed before writing because YouTube API `videos.list` returned no items for the fresh video. Retry later with `.github/workflows/youtube-video-visibility.yml`; do not rerender/reupload ES for this.

---

## Реестр видеоуроков (Video Registry)

| № | Колода / Set ID | Название | Язык (Target) | Поддержка (Support) | Дата сборки | Параметры сборки | Статус публикации | Ссылка на YouTube |
|---|---|---|---|---|---|---|---|---|
| 1 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | ES | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 2 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | IT | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 3 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | BG | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 4 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | AZ | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 5 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | BN | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 6 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | CS | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 7 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | DA | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 8 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | DE | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 9 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | EN | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 10 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | EN-GB | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 11 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | ES-419 | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 12 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | ET | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 13 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | FI | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 14 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | FR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 15 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | HI | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 16 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | HR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 17 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | HU | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 18 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | HY | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 19 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | IS | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 20 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | ID | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 21 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | JA | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 22 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | KA | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 23 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | KK | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 24 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | KM | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 25 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | KN | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 26 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | KO | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 27 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | LO | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 28 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | LT | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 29 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | LV | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 30 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | ML | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 31 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | MY | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 32 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | MS | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 33 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | NE | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 34 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | NB | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 35 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | PL | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 36 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | NL | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 37 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | PT | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 38 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | PT-BR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 39 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | SI | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 40 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | RO | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 41 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | SK | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 42 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | SL | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 43 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | SR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 44 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | SV | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 45 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | SW | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 46 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | TA | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 47 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | TE | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 48 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | TH | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 49 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | TL | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 50 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | TR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 51 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | UZ | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 52 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | VI | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 53 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | ZH | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 54 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | AZ | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 55 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | BG | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 56 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | DA | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 57 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | DE | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 58 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ES-419 | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 59 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ET | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 60 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | FI | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 61 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | FR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 62 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HI | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 63 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 64 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HU | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 65 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ID | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 66 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | IS | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 67 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | IT | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 68 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | JA | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 69 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KK | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 70 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KM | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 71 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KN | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 72 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KO | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 73 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LO | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 74 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LT | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 75 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LV | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 76 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ML | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 77 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | MS | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 78 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | MY | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 79 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NB | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 80 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NE | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 81 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | AZ | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 82 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | BG | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 83 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | BN | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 84 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | AZ | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 85 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | AZ | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 86 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | BG | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 87 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | BN | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 88 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | CS | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 89 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | EN | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 90 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | EN-GB | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 91 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ES | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 92 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ES-419 | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 93 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ET | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 94 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | FR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 95 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HI | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 96 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 97 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HU | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 98 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HY | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 99 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ID | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 100 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | IS | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 101 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | IT | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 102 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | JA | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 103 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KK | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 104 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KN | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 105 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KO | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 106 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LO | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 107 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LT | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 108 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LV | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 109 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ML | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 110 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | MS | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 111 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | MY | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 112 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NB | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 113 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NE | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 114 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NL | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 115 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | PL | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 116 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | PT | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 117 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | PT-BR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 118 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | RO | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 119 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SI | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 120 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SK | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 121 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SL | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 122 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 123 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SV | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 124 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SW | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 125 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TA | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 126 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TE | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 127 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TH | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 128 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TL | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 129 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 130 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | UZ | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 131 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | VI | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 132 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ZH | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 133 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | AZ | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 134 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | BG | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 135 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | BN | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 136 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | CS | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 137 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | DA | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 138 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | DE | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 139 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | EN-GB | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 140 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ES | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 141 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ES-419 | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 142 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ET | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 143 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | FI | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 144 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | FR | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 145 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HI | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 146 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HR | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 147 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HU | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 148 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HY | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 149 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ID | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 150 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | IS | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 151 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | IT | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 152 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | JA | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 153 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KA | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 154 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KK | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 155 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KM | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 156 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KN | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 157 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KO | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 158 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LO | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 159 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LT | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 160 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LV | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 161 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ML | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 162 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | MS | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 163 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | MY | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 164 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NB | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 165 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NE | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 166 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NL | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 167 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | PL | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 168 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | PT | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 169 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | PT-BR | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 170 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | RO | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 171 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | RU | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 172 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SI | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 173 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SK | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 174 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SL | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 175 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SR | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 176 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SV | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 177 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SW | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 178 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TA | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 179 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TE | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 180 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TH | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 181 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TL | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 182 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TR | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 183 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | UZ | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 184 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | VI | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 185 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ZH | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 186 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | AZ | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 187 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | BG | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 188 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | BN | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 189 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | CS | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 190 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | DA | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 191 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | DE | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 192 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | EN | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 193 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | EN-GB | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 194 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ES-419 | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 195 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ET | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 196 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | FI | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 197 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | FR | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 198 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HI | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 199 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HR | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 200 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HU | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 201 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HY | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 202 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ID | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 203 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | IS | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 204 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | IT | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 205 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | JA | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 206 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KA | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 207 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KK | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 208 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KM | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 209 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KN | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 210 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KO | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 211 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LO | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 212 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LT | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 213 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LV | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 214 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ML | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 215 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | MS | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 216 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | MY | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 217 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NB | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 218 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NE | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 219 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NL | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 220 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | PL | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 221 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | PT | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 222 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | PT-BR | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 223 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | RO | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 224 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | RU | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 225 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SI | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 226 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SK | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 227 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SL | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 228 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SR | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 229 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SV | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 230 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SW | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 231 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TA | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 232 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TE | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 233 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TH | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 234 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TL | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 235 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TR | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 236 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | UZ | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 237 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | VI | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 238 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ZH | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 239 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | DA | RU | 2026-06-15 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 240 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | DE | RU | 2026-06-15 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 241 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | FI | RU | 2026-06-15 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 242 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KA | RU | 2026-06-15 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 243 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KM | RU | 2026-06-15 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |

---

## Инструкция по обновлению реестра

1. **После генерации видео**:
   * Разработчик (или AI-ассистент) добавляет новую запись в таблицу с датой сборки, параметрами компиляции и статусом `Pending`.
2. **После публикации на YouTube**:
   * Пользователь (или разработчик) меняет статус на `Published` и вставляет прямую ссылку на видео в колонку «Ссылка на YouTube».
3. **Для плейлистов и массовой публикации**:
   * Не использовать эту Markdown-таблицу как источник истины для API-действий.
   * Сначала выполнить dry-run playlist planner по правилам `docs/video-lessons-strategy.md#13-playlist-architecture`.
   * Для каждого видео должен быть stable `playlist_key` или explicit `playlist_excluded_reason`.
   * Создание плейлистов, загрузка видео, установка thumbnail и добавление в playlist должны писать machine-readable readback в `outputs/youtube-publish-ledger.jsonl`; durable publication/readback rows must also be committed to `config/youtube-published-videos.json`.
   * После readback можно вручную или автоматически обновить этот human registry краткой строкой статуса.
