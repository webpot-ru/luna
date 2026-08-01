# Video Lessons Strategy & Specifications

Этот документ фиксирует архитектуру, спецификации генерации и стратегию дистрибуции видеоуроков FlashcardsLuna на YouTube для привлечения поискового трафика на [flashcardsluna.com](https://flashcardsluna.com/). Список всех сгенерированных уроков и ссылки на них ведутся в [Video Lessons Registry](video-lessons-registry.md).

Статус: **Source of Truth**. Любые изменения в дизайне, структуре звука или дистрибуции видео должны фиксироваться здесь.

---

## 1. Стратегия дистрибуции на YouTube (YouTube Distribution)

Exact duplicate deletion uses `.github/workflows/youtube-delete-duplicates.yml` with a tracked KEEP/DELETE manifest. Live apply without the manifest is rejected. Each OAuth route validates all listed IDs, channel ownership and current view counts before its first delete, performs no delete retries, and uploads evidence plus registry/calendar candidates instead of racing parallel pushes. Durable state is merged only after completed-run readback. The approved 2026-07-13 Deck #1/#2 plan is `config/youtube-duplicate-delete-plans/2026-07-13-decks-1-2-32.json`.

Merge completed route artifacts with `npm run merge:youtube-duplicate-deletions -- --report=<route1> --report=<route2> --report=<route3> --report=<route4> --apply`. The merger requires all four unique routes, rejects unapproved or incomplete IDs, canonicalizes historical support aliases by video ID, marks DELETE rows inactive and moves any existing calendar reference from DELETE to KEEP without changing `publishAt`. A fresh authenticated read-only audit remains the final live verification gate.

After a complete post-write audit, reconcile live publication truth into the durable ledgers with `npm run reconcile:youtube-publication-registry-control -- --report=<deck1-all-routes.json> --report=<deck2-all-routes.json>` and review the dry-run before adding `--apply`. This local-only recovery requires full pagination and all-ID status readback, refuses live duplicate assignments, writes ordinary and Polyglot rows to separate registries, reactivates exact observed live IDs, and inactivates registry-only conflicts. Always rebuild the four route reports plus `config/youtube-publication-snapshot.json`, `config/youtube-playlist-discovery-snapshot.json` and `docs/youtube-publication-map.md` from the same evidence afterward. It performs no YouTube API write.

A YouTube uploads-playlist row titled exactly `Deleted video` whose ID is simultaneously absent from authenticated `videos.list` is a confirmed deletion tombstone, not live product coverage and not a retryable status failure. The control report exposes the exact tombstone ID, and registry reconciliation marks only that ID inactive before recomputing product tails. Regional Polyglot target drift remains a separate replacement lane: use a reviewed tracked replacement plan, delete the occupied obsolete slot only after separate approval, re-audit, and only then schedule the corrected upload. Current Deck #1 regional plan: `config/youtube-polyglot-replacement-plans/2026-07-13-deck1-romance-regional-2.json`.

The regional replacement deletion runs through `.github/workflows/youtube-delete-obsolete-polyglot.yml`, not the duplicate KEEP/DELETE workflow. `scripts/youtube-delete-obsolete-polyglot-videos.mjs` accepts only the tracked replacement plan, one exact OAuth route and the live confirmation token; it validates registry identity and live channel ownership for every listed ID before deleting, stops after the first error and never retries. Its artifact is evidence for the mandatory post-delete read-only audit, not permission to upload a replacement blindly.

Для исключения «каши» из десятков языков поддержки на одном канале и предотвращения путаницы в алгоритмах рекомендаций YouTube принята **Стратегия разделения каналов по языку зрителя (Support Language / Market)**.

### Архитектура каналов:
1. **«LunaCards — Учим языки»** (целевое название флагманского канала для русскоязычной аудитории):
   * **Язык поддержки**: Только Русский (`RU`). Все переводы и озвучка перевода делаются только на русском.
   * **Контент**: Плейлисты по изучаемым целевым языкам:
     * *Испанский с нуля (на базе Spanish A1 Core Course)*
     * *Английский для начинающих (на базе Oxford Core)*
     * *Китайский язык (на базе HSK 3.0)*
2. **«LunaCards — Learn Languages»** (целевое название для англоязычной аудитории):
   * **Язык поддержки**: Только Английский (`EN`).
   * **Контент**: Плейлисты: *Learn Spanish*, *Learn Chinese (HSK)*, *Learn German* и т.д.
   * **Naming note**: если этот канал становится зонтичным English-native каналом для языков и будущих неязыковых колод, не использовать language-only name. Broad working name: **`LunaCards - Flashcard Lessons`**. `LunaCards - Learn Languages` остается корректным только для intentionally language-only канала.
3. **Другие региональные каналы**:
   * Создаются по мере необходимости по той же схеме (например, `LunaCards — Aprender Idiomas` для испаноязычной аудитории с поддержкой на `ES`).

> [!IMPORTANT]  
> **Региональные диалекты (США/Британия, Испания/Мексика)**:  
> **НЕ СОЗДАВАЙТЕ** отдельные YouTube-каналы для вариантов одного языка (например, "LunaCards для Американцев" и "LunaCards для Британцев"). Это размывает аудиторию и вредит алгоритмам YouTube.
> 
> * **Для языка поддержки (Support Language)**: Используйте один общий канал (например, Английский) с универсальным или самым массовым диалектом (US English).
> * **Для изучаемого языка (Target Language)**: Разные диалекты живут на **одном** канале, но в разных плейлистах (Например: плейлист "Learn Spanish (Spain)" и плейлист "Learn Spanish (Mexico)").

### 1.1. Channel branding packages

Для каждого support-language канала рабочие материалы оформления можно готовить в:

```text
outputs/youtube-channel-assets/<support-lang>/
```

2026-06-21 branding decision: public/video-facing brand is **`FlashcardsLuna`**, matching the real domain/search phrase `flashcardsluna.com`. New generated video intros/outros, video thumbnails, YouTube metadata, hashtags, playlist descriptions, desired channel descriptions and channel banner wordmarks must use `FlashcardsLuna`. Channel titles/handles can remain **`LunaCards ...`** until a separate channel-rename decision; do not infer title/handle changes from the visual wordmark change.

Правило баннера: не перечислять на главном channel art только 2-3 изучаемых языка, потому что это искусственно сужает канал при каталоге 50+ языков. Принятые баннеры остаются в текущем light FlashcardsLuna/LunaCards reference style: broad flashcard-learning promise, место для будущего расширения за пределы языков и сайт `flashcardsluna.com`. Конкретные target languages живут в плейлистах, названиях видео, metadata и ссылках `?langs=<target>`. Если канал намеренно остается только языковым, допустим narrower promise вроде `Learn 50+ Languages`; для зонтичной FlashcardsLuna channel identity предпочтительнее `Learn with Flashcards` / `Languages and more`, чтобы не закрывать будущие неязыковые колоды.

Визуально channel art должен удерживать recognizable site/channel reference style: clean flashcard panels, navy `Flashcards` + accent `Luna` wordmark, soft blue accents, readable site URL and enough visual material across the full desktop crop so the channel header does not look like a small centered image inside YouTube's gray header container.

2026-06-19 current EN fixed-reference banner: `outputs/youtube-channel-assets/en/lunacards-en-channel-banner-youtube-2560x1440-v8-center-v9-wide-reference-v1.jpg`; desktop crop preview: `outputs/youtube-channel-assets/en/lunacards-en-channel-banner-desktop-preview-v8-center-v9-wide-reference-v1.jpg`; safe-area preview: `outputs/youtube-channel-assets/en/lunacards-en-channel-banner-safearea-preview-v8-center-v9-wide-reference-v1.jpg`; metadata/readback: `outputs/youtube-channel-assets/en/lunacards-en-channel-banner-v8-center-v9-wide-reference-v1-metadata.json`. It is generated locally by `scripts/refit-channel-banner-reference.py` from the older `v8` center reference and the older `v9` wide side panels. YouTube geometry used for QA: upload `2560x1440`, desktop crop preview `2560x423`, central safe-area preview `1546x423`, file size below 6 MB. This banner was uploaded to `@flashcardsluna` on 2026-06-19 and visually read back on `https://www.youtube.com/@flashcardsluna/about`.

2026-06-20 current localized reference-style banner batch covers all 51 public support-language channels. `EN` uses the accepted fixed-reference upload `outputs/youtube-channel-assets/en/lunacards-en-channel-banner-youtube-2560x1440-v8-center-v9-wide-reference-v1.jpg`; the other 50 public codes use slug `v1-site-ui-center-v9-wide-reference-v1`. The current public-code set is stored in `config/youtube-channel-banner-copy.json`: `AZ`, `BG`, `BN`, `CS`, `DA`, `DE`, `EN`, `ES`, `ET`, `FI`, `FR`, `HI`, `HR`, `HU`, `HY`, `ID`, `IS`, `IT`, `JA`, `KA`, `KK`, `KM`, `KN`, `KO`, `LO`, `LT`, `LV`, `ML`, `MS`, `MY`, `NE`, `NL`, `NO`, `PL`, `PT`, `RO`, `RU`, `SI`, `SK`, `SL`, `SR`, `SV`, `SW`, `TA`, `TE`, `TH`, `TL`, `TR`, `UZ`, `VI`, `ZH`. This is the correct EN-style refit: each localized `v1-site-ui` banner is used as the center reference, and only the side fill is extended with the accepted `EN v9` wide side panels. Do not redraw localized text, do not replace the center with an English-derived text layer. The production upload file pattern is `outputs/youtube-channel-assets/<code>/lunacards-<code>-channel-banner-youtube-2560x1440-v1-site-ui-center-v9-wide-reference-v1.jpg`; desktop crop preview pattern is `lunacards-<code>-channel-banner-desktop-preview-v1-site-ui-center-v9-wide-reference-v1.jpg`; safe-area preview pattern is `lunacards-<code>-channel-banner-safearea-preview-v1-site-ui-center-v9-wide-reference-v1.jpg`; mobile strict preview pattern is `lunacards-<code>-channel-banner-mobile-strict-preview-v1-site-ui-center-v9-wide-reference-v1.jpg`; per-language metadata pattern is `lunacards-<code>-channel-banner-v1-site-ui-center-v9-wide-reference-v1-metadata.json`. Batch QA sheets are `outputs/youtube-channel-assets/channel-banner-v1-site-ui-center-v9-wide-reference-v1-desktop-contact-sheet.jpg` and `outputs/youtube-channel-assets/channel-banner-v1-site-ui-center-v9-wide-reference-v1-safe-contact-sheet.jpg`; machine-readable manifest is `outputs/youtube-channel-assets/channel-banner-v1-site-ui-center-v9-wide-reference-v1-manifest.json`. The 2026-06-21 local central wordmark patch attempt was rejected and must not be treated as final visual identity. The replacement path is VectorEngine `gpt-image-2` full-render source art with `FlashcardsLuna` already rendered inside the source image, exported directly without a local wordmark patch and without the older EN side-fill refit. All 51 public support-language channels now have source PNGs at `outputs/youtube-channel-assets/<code>/lunacards-<code>-channel-banner-youtube-2560x1440-v1-site-ui.png` and upload JPGs at `outputs/youtube-channel-assets/<code>/lunacards-<code>-channel-banner-youtube-2560x1440-v1-site-ui-vectorengine-direct-v1.jpg`; `config/youtube-channels.json` points `bannerAsset` to the direct JPGs and uses `bannerSlug=v1-site-ui-vectorengine-direct-v1`. Direct contact sheets are `outputs/youtube-channel-assets/channel-banner-v1-site-ui-vectorengine-direct-v1-desktop-contact-sheet.jpg` and `outputs/youtube-channel-assets/channel-banner-v1-site-ui-vectorengine-direct-v1-safe-contact-sheet.jpg`. Complex-script image text still needs human/native spot-check before treating every script as text-perfect.

2026-06-21 direct-set generation proof: after the first direct set, all 51 banner-copy strings in `config/youtube-channel-banner-copy.json` were rewritten to native-style, broad-positioning copy for viewer-language channels: learn with flashcards, languages first, later other subjects/topics. All 51 public support-language channels were then redrawn through VectorEngine `gpt-image-2` with `npm run generate:youtube-channel-banners -- --confirm-spend --codes=az,bg,bn,cs,da,de,en,es,et,fi,fr,hi,hr,hu,hy,id,is,it,ja,ka,kk,km,kn,ko,lo,lt,lv,ml,ms,my,ne,nl,no,pl,pt,ro,ru,si,sk,sl,sr,sv,sw,ta,te,th,tl,tr,uz,vi,zh --no-skip-existing --regenerate-raw --regenerate-source --skip-refit`; the batch manifest returned `status=ok`, `plannedCount=51`, `okCount=51`, `errorCount=0`. Direct upload JPGs/previews/contact sheets were produced with `python3 scripts/export-vectorengine-channel-banners-direct.py`, and the direct manifest now has 51 records under slug `v1-site-ui-vectorengine-direct-v1`. Local QA checked 51/51 direct upload files as `2560x1440`, under 6 MB, with matching `localizedCopy.brand=FlashcardsLuna`, headline/subline/url manifest values and asset mirrors; `node scripts/sync-youtube-channel-branding-assets.mjs --to-assets --verify` synced 53 public branding assets. Dry-run checks `npm run plan:youtube-channel-branding -- --channel=en`, `--channel=fr` and `--channel=zh` resolved the new direct banner paths. No live YouTube upload was performed by this local generation pass.

2026-06-21 native-style banner-copy screen: the current direct set is visually acceptable as channel art after the all-51 copy rewrite and redraw. Contact sheets checked locally: `outputs/youtube-channel-assets/channel-banner-v1-site-ui-vectorengine-direct-v1-desktop-contact-sheet.jpg` and `outputs/youtube-channel-assets/channel-banner-v1-site-ui-vectorengine-direct-v1-safe-contact-sheet.jpg`. Individual visual spot checks included `ZH`, `JA`, `KO`, `HI`, `BN`, `KM`, `RU`, `FR`, `ES`, `PT`, `TR` and `AZ`; the center artwork, `FlashcardsLuna` wordmark and `flashcardsluna.com` were visible and not clipped. This is not a native-speaker certification for all 51 languages. Remaining pre-upload risk is rendered-text fidelity, especially complex scripts that still require native or OCR/vision readback if exact text perfection is required: `KM`, `LO`, `MY`, `SI`, `ML`, `TA`, `TE`, `KN`, `KA`, `HY`, `BN`, `HI`.

2026-06-21 RU API upload canary: after the user asked to check the new direct banner on the Russian channel, `node scripts/youtube-channel-branding.mjs --apply --confirm-youtube-write --channel=ru --force-configured` re-uploaded API-manageable branding to `UC1f5EyXEMejXIumH9104GMA` / `@LunaCardsRU`: banner, `brandingSettings.channel.description` and player watermark. Readback `npm run check:youtube-channel-branding-readback -- --channels=ru --json` wrote `outputs/youtube-channel-assets/youtube-channel-branding-readback-2026-06-21T14-28-25-258Z.json` with `ok=1`, `failed=0`, `channelIdMatches=true`, `descriptionMatches=true` and `hasBanner=true`. `channels.list` still cannot expose watermark state, so the watermark evidence is the successful write response. The live title remains `LunaCards - Учимся по карточкам`; title/name/handle/avatar/contact/link fields were intentionally not touched by the API canary.

2026-06-21 all-channel API upload rollout: after the `RU` canary, `npm run apply:youtube-channel-branding-batch -- --apply --confirm-youtube-write --scope=all --force-configured` re-uploaded the direct native-style banner, desired channel description and player watermark to all 51 public support-language channels. Apply report `outputs/youtube-channel-assets/youtube-channel-branding-apply-2026-06-21T14-48-50-742Z.json` ended with `applied_ok=51`, `failed=0`. Full readback `npm run check:youtube-channel-branding-readback -- --scope=all --json` wrote `outputs/youtube-channel-assets/youtube-channel-branding-readback-2026-06-21T14-50-07-733Z.json` with `ok=51`, `failed=0`: every channel matched expected `channelId`, expected description and `hasBanner=true`. The readback reports 8 manual title mismatches for `RU`, `ES`, `PT`, `HI`, `JA`, `KO`, `TR` and `ZH`; those are title/name registry differences only, not banner/description failures, because titles/handles/avatar/contact/link fields are outside the API branding scope and were not changed.

The 38 remaining non-priority language centers were generated through the paid VectorEngine `gpt-image-2` image path and then normalized locally. Reproducible batch command: `npm run generate:youtube-channel-banners -- --confirm-spend`. The batch generator is `scripts/generate-vectorengine-channel-banners-batch.mjs`; it reads copy from `config/youtube-channel-banner-copy.json`, writes raw VectorEngine outputs with slug `v1-site-ui-vectorengine-full-v1`, fits them into the 2560 x 1440 source-center contract through `scripts/fit-vectorengine-channel-banner-source.py`, then calls `scripts/refit-localized-channel-banners-from-source.py`. Batch manifest: `outputs/youtube-channel-assets/channel-banner-vectorengine-v1-site-ui-batch-manifest.json`. Because this path spends external image-generation usage, keep the `--confirm-spend` gate and do not run it casually.

Future channel-art workflow:

1. Create or approve the localized source banner first. Current source pattern is `outputs/youtube-channel-assets/<code>/lunacards-<code>-channel-banner-youtube-2560x1440-v1-site-ui.png`.
2. If the source center does not exist or must be redrawn, run the paid generator only after explicit spend confirmation. For the current direct style use `npm run generate:youtube-channel-banners -- --confirm-spend --codes=<code> --no-skip-existing --regenerate-raw --regenerate-source --skip-refit`.
3. Export upload-ready direct files with `python3 scripts/export-vectorengine-channel-banners-direct.py --codes <code>`, or omit `--codes` for all 51 public support channels. Current upload pattern is `outputs/youtube-channel-assets/<code>/lunacards-<code>-channel-banner-youtube-2560x1440-v1-site-ui-vectorengine-direct-v1.jpg`.
4. Check the generated desktop, safe-area and mobile-strict previews/contact sheets before upload; the banner is not considered ready if localized text clips, the URL is unreadable, the `FlashcardsLuna` wordmark is malformed, or the full desktop crop looks like a small centered image in YouTube's gray header.
5. Update `config/youtube-channels.json` `bannerAsset` paths when the direct style becomes the accepted set, then sync committed/public assets for GitHub/API use with `node scripts/sync-youtube-channel-branding-assets.mjs --to-assets --verify`.
6. Upload the `youtube-2560x1440` JPG in YouTube Studio or through the confirmed YouTube API apply workflow, accept the crop, publish, then visually/API-read back the public channel page.
7. If a channel tracker row is maintained, record the upload path, avatar path and Studio/live-check status there after readback.

Historical refit tools remain available only when explicitly selecting the older reference-style layout: `python3 scripts/refit-channel-banner-reference.py` for the old EN reference banner and `python3 scripts/refit-localized-channel-banners-from-source.py` for the older center-v9-wide refit. These scripts must not add a local wordmark patch.

Other EN candidates remain historical/non-primary unless explicitly selected: the original too-centered light UI `v8`, the raw `v9` wide candidate, the live-site hero candidate `lunacards-en-channel-banner-youtube-2560x1440-site-hero-v1.jpg`, the `v10-premium-wide` generated candidate, and the paid VectorEngine/GPT Image 2 candidate `lunacards-en-channel-banner-youtube-2560x1440-vectorengine-gpt-image-2-youtube-spec-v1.jpg`.

The localized site-style banner source-center files are inputs for refit, not the YouTube upload target: `outputs/youtube-channel-assets/<support-code>/lunacards-<code>-channel-banner-youtube-2560x1440-v1-site-ui.png`. The first priority sources came from the 2026-06-19 localized site-style batch; the 38 later sources came from the VectorEngine `gpt-image-2` batch and local source fitting. The later text-overlay batch `v8-center-v9-wide-reference-v2-localized` is superseded and should not be uploaded.

Первый рабочий пакет для EN-канала создан в:

```text
outputs/youtube-channel-assets/en/channel-package.md
```

Он включает banner/avatar candidates, channel description, first playlists and the first two unlisted upload candidates from the GitHub EN support render test.

2026-06-21 user-confirmed decision: главный источник правды по YouTube-каналам ведется в Google Sheet `Ютуб курсы FCL`, tab `YouTube каналы`:

```text
https://docs.google.com/spreadsheets/d/1Uw5mO7Xy1asF-WlbRkphUCftaGDP6uVtu6xGgXD00_I/edit?gid=202606190#gid=202606190
```

This Sheet is canonical for channel identity and operational status: support code, current handle, target handle, `UC...` channel id, live channel URL, site courses URL, final channel name, localized description, assets and Studio/readback state. Local files such as `config/youtube-channels.json`, `config/youtube-channel-inventory.json` and generated reports are machine-readable mirrors for scripts/GitHub Actions and must be reconciled from Sheet/API/readback when they drift. If Sheet, local JSON, generated reports, GitHub artifacts or chat memory disagree, treat the live Sheet as the authority until a fresh API/Studio/readback deliberately updates it.

Required navigation rule: use Sheet `Current handle` / `Live channel URL` to choose the YouTube account/channel in the browser, then verify the `UC...` id through Studio/API before editing. Do not use local row order, OAuth token file names, temporary `New...` labels, stale local config order, or the `Channel ID / UC...` column as a browser URL source.

#### Channel description copy contract

Channel descriptions are viewer-language profile copy, not target-language copy and not a narrow "language lessons only" promise. Each channel description must make clear that the channel is for native speakers of the support language who use FlashcardsLuna flashcards to learn:

- 50+ languages first;
- later, other subjects and topics using the same flashcard format.

Required content in every channel description:

- native-speaker audience in the support language;
- short FlashcardsLuna flashcard-video learning loop;
- 50+ language catalog positioning;
- future expansion beyond languages into other subjects/topics;
- the public support-language course URL from `siteCoursesUrl`.

Do not put local paths, token paths, OAuth/client-secret strings, contact-email secrets, `.local` paths or `.secrets` paths into channel descriptions or the Google Sheet. Do not make Portuguese, Spanish or English descriptions region-only unless the channel is intentionally split later; current shared physical channels cover the Portuguese, Spanish and English viewer-language families, but support/native video dispatch is canonical only: `PT-BR`, `ES-419` and `EN`.

Durable copy source:

```text
config/youtube-channel-positioning-copy.json
```

Apply locally:

```bash
npm run apply:youtube-channel-positioning-copy
```

This updates `config/youtube-channels.json` and `outputs/youtube-channel-assets/youtube-channel-language-assignment-20260620.json`. It does not write to YouTube, does not read token contents and does not update Google Sheets by itself.

After local apply, update the Google Sheet tracker columns `K:L` (`Channel description`, `Short description`) for `YouTube каналы!K2:L52` from `config/youtube-channels.json`, using the live support-code row order in column `H`. Required readback:

1. read `YouTube каналы!K2:L52`;
2. spot-check first configured rows and last assigned rows;
3. bounded search over `K2:L52` must find 0 matches for the old English wording `vocabulary lessons across 50+ languages`;
4. bounded search over `K2:L52` must find 0 matches for `.local`;
5. run at least one configured-channel and one assigned-channel dry-run, for example `npm run plan:youtube-channel-branding -- --channel=en` and `npm run plan:youtube-channel-branding -- --channel=it`.

Publishing those descriptions to live YouTube channel profiles is a separate YouTube API write step and requires explicit confirmation. Official API scope remains description/banner/watermark only; channel name, handle, avatar, contact email and profile links remain manual YouTube Studio/browser fields.

Batch API publishing helper:

```bash
npm run apply:youtube-channel-branding-batch -- --apply --confirm-youtube-write --scope=assigned
npm run apply:youtube-channel-branding-batch -- --apply --confirm-youtube-write --scope=all --force-configured
npm run check:youtube-channel-branding-readback
```

`--scope=assigned` targets only the 39 channels with `profileStatus=assigned_needs_api_branding`. `--scope=all --force-configured` also re-publishes API-manageable branding to already readback-confirmed channels, which is useful after changing global descriptions but spends more quota and touches channels that were already live. The batch helper writes a non-secret report under `outputs/youtube-channel-assets/youtube-channel-branding-apply-*.json`. It still cannot set names, handles, avatar/icon, contact email or profile links; those remain manual/browser tasks. `watermarks.set` must be sent as a multipart upload with a `watermark` resource in the request body (`targetChannelId`, `timing` and `position`) plus the image media; media-only upload returns `400 No filter selected. Expected one of: resource`, and a zero `durationMs` returns `400 Invalid Value`. The current script uses `durationMs=3600000`. `channels.list` does not expose watermark state, so watermark verification is based on successful `watermarks.set` responses plus banner/description readback.

2026-06-20 live API branding publication: after fixing `watermarks.set` to use multipart resource upload, `EN` was applied as the canary (`outputs/youtube-channel-assets/youtube-channel-branding-apply-2026-06-20T10-03-40-358Z.json`, `applied_ok=1`, `failed=0`), then the remaining 50 channels were applied with `--scope=all --force-configured --exclude=en` (`outputs/youtube-channel-assets/youtube-channel-branding-apply-2026-06-20T10-14-21-643Z.json`, `applied_ok=50`, `failed=0`). Post-apply readback ran `npm run check:youtube-channel-branding-readback` across all 51 per-channel OAuth tokens and wrote `outputs/youtube-channel-assets/youtube-channel-branding-readback-2026-06-20T10-19-32-892Z.json`: 51/51 matched the configured `channelId`, 51/51 had a banner, 51/51 matched `desiredDescription`, and 0 readback failures were found. The same readback reported `manual_title_mismatches=48`, which is expected because title/name is not part of the accepted API automation boundary. A title-only API canary on `IT` returned a successful update response (`outputs/youtube-channel-assets/youtube-channel-branding-apply-2026-06-20T10-22-07-200Z.json`), but follow-up readback (`outputs/youtube-channel-assets/youtube-channel-branding-readback-2026-06-20T10-23-41-321Z.json`) still showed both `snippetTitle` and `brandingTitle` as `New 25`; therefore do not use API title updates for production channel naming. Use YouTube Studio/browser automation for names, handles, avatar/icon, contact email and public profile links.

The Google Sheet tracker `Ютуб курсы FCL` / `YouTube каналы` was also updated for the 39 newly assigned rows after the API publication. Only status columns `O:P` (`Ready for Studio`, `Studio updated / checked live`) were changed for `O14:P52`; IDs, links, descriptions and asset paths were not rewritten in this pass. Connector readback over `O14:P52` showed `API branding readback OK` / `API branding write/readback OK 2026-06-20` values, and bounded search over the same 39 x 2 range found 0 matches for stale `API branding pending`.

2026-06-20 completed channel-inventory and assignment sync note: the Google Sheet range `YouTube каналы!A2:P52` was updated and read back after OAuth/API channel verification and support-language assignment. Rows 2-13 carry the 12 configured priority support-language channels with real current handles, `UC...` channel ids, public URLs, support-language mapping and upload-ready banner paths. Rows 14-52 now carry the 39 remaining support-language assignments (`IT`, `VI`, `TH`, `MS`, `PL`, `NL`, `SV`, `NO`, `DA`, `FI`, `CS`, `SK`, `HU`, `RO`, `BG`, `HR`, `SR`, `SL`, `LT`, `LV`, `ET`, `IS`, `BN`, `TL`, `MY`, `KM`, `LO`, `NE`, `SI`, `TA`, `TE`, `KN`, `ML`, `UZ`, `KK`, `AZ`, `KA`, `HY`, `SW`) with target handles, localized descriptions, course URLs and banner/avatar paths, giving 51 recorded and assigned channels total. The local machine-readable mirrors are `config/youtube-channels.json`, `config/youtube-channel-inventory.json` and `outputs/youtube-channel-assets/youtube-channel-language-assignment-20260620.json`; the Google Sheet is the canonical operational tracker for assignment, readiness and Studio/live-check notes. Token numbering intentionally has gaps because duplicate OAuth selections were skipped instead of writing duplicate channel rows. `unassigned-047` / `UCZ0eMlkJpAQDkQQLAy0gTkw` is assigned to `SW`; on 2026-06-21 it was repurposed from the old `COSMIC LIMITS` channel to `LunaCards Kiswahili` / `@LunaCardsSwahili` and read back through API plus public handle URL. Existing old videos/content were not deleted by channel branding work and must be reviewed separately before uploading LunaCards videos to this repurposed channel. Future OAuth/API readbacks must be written to the Sheet in the same pattern before any additional language assignment is considered durable.

2026-06-21 final Studio finishing closeout: the last 7 previously `assigned_needs_api_branding` channels (`CS`, `SK`, `BN`, `UZ`, `KA`, `HY`, `SW`) were completed in YouTube Studio/browser using Sheet `Current handle` / account-switcher as the navigation source, not stale `Channel ID / UC...` browser URLs. Live API readback ran `npm run check:youtube-channel-branding-readback -- --channels=cs,sk,bn,uz,ka,hy,sw --json` and wrote `outputs/youtube-channel-assets/youtube-channel-branding-readback-2026-06-21T05-49-52-314Z.json` with `ok=7`, `failed=0`, `manualTitleMismatches=0`, channelId matches, desired descriptions and banners present for all 7. Public handle checks returned HTTP 200 for the last checked channels including `https://www.youtube.com/@lunacardsarmenian` and `https://www.youtube.com/@lunacardsswahili`. Google Sheet rows for the completed channels were updated/read back; row 52 now records `@LunaCardsSwahili`, `UCZ0eMlkJpAQDkQQLAy0gTkw`, `https://www.youtube.com/@lunacardsswahili` and the old-content note. Contact email was intentionally not transmitted on these channels.

2026-06-21 brand-copy update: `config/youtube-channel-positioning-copy.json` and local `config/youtube-channels.json` desired descriptions now use `FlashcardsLuna`. This is a local desired-copy update only; live YouTube channel descriptions and Sheet `K:L` still need a separate explicit API write/readback before they can be treated as published under the new copy. Channel names, handles and accepted banners intentionally remain `LunaCards` and are not part of this copy update.

2026-06-20 channel description positioning update: channel descriptions are broad viewer-language profile copy, not language-only vocabulary copy. Each channel is positioned for native speakers of its support language who use FlashcardsLuna flashcards to learn 50+ languages first, with the same flashcard format later expanding into other subjects and topics. The durable copy source is `config/youtube-channel-positioning-copy.json`; apply it with `npm run apply:youtube-channel-positioning-copy`, which updates `config/youtube-channels.json` and the 39-row assignment report without reading or printing token contents. `scripts/assign-youtube-channel-languages.mjs` also reads this copy map so future re-assignment runs do not revert to old language-only wording. The Google Sheet tracker columns `K:L` (`Channel description`, `Short description`) were updated and read back for `YouTube каналы!K2:L52`: first/last-row samples matched the new broad positioning, and bounded searches over 51 rows found 0 matches for the old `vocabulary lessons across 50+ languages` wording and 0 `.local` strings.

2026-06-20 public channel profile readback:

| Support language | Public channel | Course link | Profile status |
| --- | --- | --- | --- |
| `EN` | `https://www.youtube.com/@flashcardsluna` | `https://flashcardsluna.com/en/courses` | Configured/read back. |
| `RU` | `https://www.youtube.com/@LunaCardsRU` | `https://flashcardsluna.com/ru/courses` | Configured/read back. |
| `ES` / `ES-419` | `https://www.youtube.com/@LunaCardsEspanol` | `https://flashcardsluna.com/es/courses` | Configured/read back. |
| `PT` / `PT-BR` | `https://www.youtube.com/@LunaCardsPortugues` | `https://flashcardsluna.com/pt/courses` | Configured/read back. |
| `HI` | `https://www.youtube.com/@LunaCardsHindi` | `https://flashcardsluna.com/hi/courses` | Configured/read back. |
| `ID` | `https://www.youtube.com/@LunaCardsIndonesia` | `https://flashcardsluna.com/id/courses` | Configured/read back. |
| `FR` | `https://www.youtube.com/@LunaCardsFrancais` | `https://flashcardsluna.com/fr/courses` | Configured/read back; stale link-fix marker closed on 2026-06-21 with public URL HTTP 200 and Sheet row 8 status update. |
| `DE` | `https://www.youtube.com/@LunaCardsDeutsch` | `https://flashcardsluna.com/de/courses` | Configured/read back. |
| `JA` | `https://www.youtube.com/@LunaCardsJapan` | `https://flashcardsluna.com/ja/courses` | Configured/read back. |
| `KO` | `https://www.youtube.com/@LunaCardsKorean` | `https://flashcardsluna.com/ko/courses` | Configured/read back. Actual live handle is `@LunaCardsKorean`. |
| `TR` | `https://www.youtube.com/@LunaCardsTurkce` | `https://flashcardsluna.com/tr/courses` | Configured/read back. |
| `ZH` | `https://www.youtube.com/@LunaCardsChinese` | `https://flashcardsluna.com/zh/courses` | Configured/read back. |

Treat `Configured/read back` as "do not re-run manual channel setup unless the user explicitly asks". Readback was a public YouTube `/about` text/link check in Chrome: channel name, handle and the relevant `flashcardsluna.com/<support>/courses` path were visible. It was not a full pixel-by-pixel banner/avatar crop audit and does not expose or store the contact email.

Operational channel profile fields should be consistent across support-language channels: banner, avatar, YouTube player watermark (`Логотип канала`), contact email, localized description and site links are all required before publishing a channel profile. Reuse the existing LunaCards channel avatar and 150 x 150 watermark unless a separate visual-identity task explicitly replaces them. The real contact email is stored only in local, gitignored `.local/youtube-channel-defaults.json`; do not store that email value in committed repo files, docs or generated channel packages.

2026-06-20 API automation boundary: post-creation channel branding automation is tracked in `config/youtube-channels.json` and planned by `npm run plan:youtube-channel-branding`. Official YouTube Data API can update the channel banner via `channelBanners.insert` + `channels.update`, update `brandingSettings.channel.description` when a desired description is present, and set the player watermark via `watermarks.set`. Because `channels.update` overrides mutable properties inside the requested part, the local script must preserve only the allowed current mutable `brandingSettings.channel` fields and `brandingSettings.image.bannerExternalUrl`; it must not blindly resend deprecated/read-only image URLs from `channels.list`. Channel creation, channel title/name, handle, profile avatar/icon, contact email and public profile links remain manual YouTube Studio / browser-workflow fields. This boundary was confirmed by the 2026-06-20 `IT` title canary: the API call returned success but readback still showed `snippetTitle=New 25` and `brandingTitle=New 25`. Do not treat unofficial/private YouTube clients as production-safe for LunaCards channel ownership tasks unless the user explicitly accepts the account risk.

Browser/Studio finishing workflow:

```bash
npm run export:youtube-channel-studio-tasks -- --manual-needed
npm run export:youtube-channel-studio-tasks -- --all
```

The export writes non-secret JSON/CSV/Markdown task files under `outputs/youtube-channel-assets/youtube-channel-studio-tasks-*.{json,csv,md}`. Each task contains channel key, support languages, channel id, public URL, YouTube Studio customization URL, desired channel name/handle/site link, banner/avatar/watermark asset paths and a checklist for browser work. It intentionally stores only `.local/youtube-channel-defaults.json contactEmail` as the contact-email source, never the real email value, token path contents or OAuth secrets. Use these task files as the source for Computer Use or Record & Replay browser sessions: first verify the visible channel id/handle in Studio, then update name/handle/avatar/link/contact email, save in Studio, open the public `/about` page and update the Google Sheet tracker only after public readback.

2026-06-20 export proof: `npm run export:youtube-channel-studio-tasks -- --manual-needed` initially produced 40 manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T11-51-23-110Z.json`, `.csv` and `.md`. After the `IT` Studio canary public readback and Sheet sync, the same command produced 39 remaining manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T14-40-43-960Z.json`, `.csv` and `.md`. After the `VI` public readback and Sheet sync, the same command produced 38 remaining manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T15-12-36-146Z.json`, `.csv` and `.md`. After the `TH` public/API readback and Sheet sync, the same command produced 37 remaining manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T15-34-25-732Z.json`, `.csv` and `.md`. After the `MS` Studio/API readback and Sheet sync, the same command produced 36 remaining manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T15-48-37-755Z.json`, `.csv` and `.md`. After the `PL` Studio/API readback and Sheet sync, the same command produced 35 remaining manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T15-58-43-406Z.json`, `.csv` and `.md`. After the `NL` Studio/API readback and Sheet sync, the same command produced 34 remaining manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T16-05-26-406Z.json`, `.csv` and `.md`. After the `SV` Studio/API readback and Sheet sync, the same command produced 33 remaining manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T16-14-44-834Z.json`, `.csv` and `.md`. After the `NO` Studio/API readback and Sheet sync, the same command produced 32 remaining manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T16-28-52-107Z.json`, `.csv` and `.md`. After the `DA` Studio/API readback and Sheet sync, the same command produced 31 remaining manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T16-41-19-210Z.json`, `.csv` and `.md`. This did not print secrets.

2026-06-21 final export proof: after completing the last Studio/browser finishing pass and updating local `profileStatus` values, `npm run export:youtube-channel-studio-tasks -- --manual-needed` returned `count=0` and wrote `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-21T05-51-39-446Z.{json,csv,md}`. This means there are no remaining channel profile setup tasks in the local registry. Contact email remains intentionally not transmitted and is not part of the completion claim.

2026-06-20 Studio canary readback: the `IT` manual task for channel id `UCOFZxCVdm4FqhFgMvKsAlOw` was completed for public fields and read back at `https://www.youtube.com/@LunaCardsItaliano/about`. Public readback confirmed target name `LunaCards Italiano`, handle `@LunaCardsItaliano`, banner, shared LunaCards avatar, localized description and external link `https://flashcardsluna.com/it/courses`. Contact email was intentionally not set because it is sensitive data and requires explicit action-time approval before transmission to YouTube. `config/youtube-channels.json` and Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 14 were updated/read back for the new handle and public URL by matching `Support code=IT` plus the channel id. Do not infer future row updates from row order alone.

2026-06-20 VI public readback: the `VI` manual task for channel id `UCuDc2oBQPppV8Br78CAiKTA` was completed for public fields and read back at `https://www.youtube.com/@LunaCardsTiengViet`. Public Chrome readback confirmed target name `LunaCards Tiếng Việt`, handle `@LunaCardsTiengViet`, banner, shared LunaCards avatar, localized Vietnamese description excerpt and external link `https://flashcardsluna.com/vi/courses`. Contact email was intentionally not transmitted. `config/youtube-channels.json`, `config/youtube-channel-inventory.json` and Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 15 were updated/read back for the new handle and public URL by matching `Support code=VI` plus the channel id. Operational correction: for Studio browser work, use the Sheet `Current handle` as the navigation/account-switch source, then switch the active YouTube account/channel and confirm the Studio `UC...` id before editing; do not use `Channel ID / UC...` as a browser URL source and do not construct `studio.youtube.com/channel/@handle/...` URLs because Studio can open the currently selected channel instead of the intended one.

2026-06-20 TH public/API readback: the `TH` manual task for channel id `UCr6WU1cxr5S22hMEsYoRdWA` was completed for public fields at `https://www.youtube.com/@LunaCardsThai`. Studio fields applied: channel name `LunaCards ภาษาไทย`, target handle `@LunaCardsThai`, banner, shared LunaCards avatar, localized Thai description and external link `https://flashcardsluna.com/th/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-003.json` confirmed `snippetTitle=LunaCards ภาษาไทย`, `brandingTitle=LunaCards ภาษาไทย`, `customUrl=@lunacardsthai`, desired Thai description and `hasBanner=true`. Public YouTube UI may briefly cache the old visible `@New4-g7j` handle, so the durable readback is API plus the working public URL. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 16 was updated/read back: `Current handle=@LunaCardsThai`, `Target handle=@LunaCardsThai`, `Live channel URL=https://www.youtube.com/@LunaCardsThai`, `Ready for Studio=Studio public fields applied; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/description/link applied 2026-06-20; YouTube API readback OK customUrl=@lunacardsthai; browser source must be Current handle, not Channel ID`.

2026-06-20 MS API readback: the `MS` manual task for channel id `UCPINbpQTI50h-zjN6jGyy7Q` was completed for public fields at `https://www.youtube.com/@LunaCardsMalay`. Studio fields applied: channel name `LunaCards Bahasa Melayu`, target handle `@LunaCardsMalay`, banner, shared LunaCards avatar, localized Malay description and external link `https://flashcardsluna.com/ms/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-004.json` confirmed `snippetTitle=LunaCards Bahasa Melayu`, `brandingTitle=LunaCards Bahasa Melayu`, `customUrl=@lunacardsmalay`, desired Malay description and `hasBanner=true`. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 17 was updated/read back: `Current handle=@LunaCardsMalay`, `Target handle=@LunaCardsMalay`, `Live channel URL=https://www.youtube.com/@LunaCardsMalay`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/description/link API readback OK 2026-06-20; contact email not transmitted; browser source must be Current handle, not Channel ID`.

2026-06-20 PL API readback: the `PL` manual task for channel id `UCvwHEuWlEdVZ8YLVOJbigyw` was completed for public fields at `https://www.youtube.com/@LunaCardsPolski`. Studio fields applied: channel name `LunaCards Polski`, target handle `@LunaCardsPolski`, banner, shared LunaCards avatar, localized Polish description and external link `https://flashcardsluna.com/pl/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-005.json` confirmed `snippetTitle=LunaCards Polski`, `brandingTitle=LunaCards Polski`, `customUrl=@lunacardspolski`, desired Polish description and `hasBanner=true`. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 18 was updated/read back: `Current handle=@LunaCardsPolski`, `Target handle=@LunaCardsPolski`, `Live channel URL=https://www.youtube.com/@LunaCardsPolski`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/description/link API readback OK 2026-06-20; contact email not transmitted; browser source must be Current handle, not Channel ID`.

2026-06-20 NL API readback: the `NL` manual task for channel id `UCjinhTDSmgEvx0_4YNTo0Zg` was completed for public fields at `https://www.youtube.com/@LunaCardsNederlands`. Studio fields applied: channel name `LunaCards Nederlands`, target handle `@LunaCardsNederlands`, banner, shared LunaCards avatar, localized Dutch description and external link `https://flashcardsluna.com/nl/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-006.json` confirmed `snippetTitle=LunaCards Nederlands`, `brandingTitle=LunaCards Nederlands`, `customUrl=@lunacardsnederlands`, desired Dutch description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 19 was updated/read back: `Current handle=@LunaCardsNederlands`, `Target handle=@LunaCardsNederlands`, `Live channel URL=https://www.youtube.com/@LunaCardsNederlands`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/description/link API readback OK 2026-06-20; contact email not transmitted; browser source must be Current handle, not Channel ID`.

2026-06-20 SV API readback: the `SV` manual task for channel id `UC1JztX4RUpFZ-x8TxQjM-4w` was completed for public fields at `https://www.youtube.com/@LunaCardsSvenska`. Studio fields applied: channel name `LunaCards Svenska`, target handle `@LunaCardsSvenska`, banner, shared LunaCards avatar, localized Swedish description and external link `https://flashcardsluna.com/sv/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-008.json` confirmed `snippetTitle=LunaCards Svenska`, `brandingTitle=LunaCards Svenska`, `customUrl=@lunacardssvenska`, desired Swedish description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 20 was updated/read back: `Current handle=@LunaCardsSvenska`, `Target handle=@LunaCardsSvenska`, `Live channel URL=https://www.youtube.com/@LunaCardsSvenska`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/description/link API readback OK 2026-06-20; contact email not transmitted; browser source must be Current handle, not Channel ID`.

2026-06-20 NO API readback: the `NO` manual task for channel id `UCK2IIhxCoPUW3wI6xBPYkfA` was completed for public fields at `https://www.youtube.com/@LunaCardsNorsk`. Studio fields applied: channel name `LunaCards Norsk`, target handle `@LunaCardsNorsk`, banner, shared LunaCards avatar, localized Norwegian description and external link `https://flashcardsluna.com/no/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-009.json` confirmed `snippetTitle=LunaCards Norsk`, `brandingTitle=LunaCards Norsk`, `customUrl=@lunacardsnorsk`, desired Norwegian description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 21 was updated/read back: `Current handle=@LunaCardsNorsk`, `Target handle=@LunaCardsNorsk`, `Live channel URL=https://www.youtube.com/@LunaCardsNorsk`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/description/link API readback OK 2026-06-20; contact email not transmitted; browser source must be Current handle, not Channel ID`.

2026-06-20 DA API readback: the `DA` manual task for channel id `UCrnzx48mt-kLWGLymdTCsTw` was completed for public fields at `https://www.youtube.com/@LunaCardsDansk`. Studio fields applied: channel name `LunaCards Dansk`, target handle `@LunaCardsDansk`, banner, shared LunaCards avatar, localized Danish description and external link `https://flashcardsluna.com/da/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-010.json` confirmed `snippetTitle=LunaCards Dansk`, `brandingTitle=LunaCards Dansk`, `customUrl=@lunacardsdansk`, desired Danish description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 22 was updated/read back: `Current handle=@LunaCardsDansk`, `Target handle=@LunaCardsDansk`, `Live channel URL=https://www.youtube.com/@LunaCardsDansk`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/description/link API readback OK 2026-06-20; contact email not transmitted; browser source must be Current handle, not Channel ID`.

2026-06-21 FI API readback: the `FI` manual task for channel id `UCZkiQ6y2W8aCUuaiP3N665A` was completed for public fields at `https://www.youtube.com/@LunaCardsSuomi`. Studio fields applied: channel name `LunaCards Suomi`, target handle `@LunaCardsSuomi`, banner, shared LunaCards avatar, player watermark, localized Finnish description and external link `https://flashcardsluna.com/fi/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-011.json` confirmed `snippetTitle=LunaCards Suomi`, `brandingTitle=LunaCards Suomi`, `customUrl=@lunacardssuomi`, desired Finnish description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 23 was updated/read back: `Current handle=@LunaCardsSuomi`, `Target handle=@LunaCardsSuomi`, `Live channel URL=https://www.youtube.com/@LunaCardsSuomi`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 HU API readback: the `HU` manual task for channel id `UCTcNExukG4ceYxY7bs7l1iA` was completed for public fields at `https://www.youtube.com/@LunaCardsMagyar`. Studio fields applied: channel name `LunaCards Magyar`, target handle `@LunaCardsMagyar`, banner, shared LunaCards avatar, player watermark, localized Hungarian description and external link `https://flashcardsluna.com/hu/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-014.json` confirmed `snippetTitle=LunaCards Magyar`, `brandingTitle=LunaCards Magyar`, `customUrl=@lunacardsmagyar`, desired Hungarian description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 26 was updated/read back: `Current handle=@LunaCardsMagyar`, `Target handle=@LunaCardsMagyar`, `Live channel URL=https://www.youtube.com/@LunaCardsMagyar`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 RO API readback: the `RO` manual task for channel id `UCvc_hya6nn2z8Q2WzHCuBWw` was completed for public fields at `https://www.youtube.com/@LunaCardsRomana`. Studio fields applied: channel name `LunaCards Română`, target handle `@LunaCardsRomana`, banner, shared LunaCards avatar, player watermark, localized Romanian description and external link `https://flashcardsluna.com/ro/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-015.json` confirmed `snippetTitle=LunaCards Română`, `brandingTitle=LunaCards Română`, `customUrl=@lunacardsromana`, desired Romanian description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 27 was updated/read back: `Current handle=@LunaCardsRomana`, `Target handle=@LunaCardsRomana`, `Live channel URL=https://www.youtube.com/@LunaCardsRomana`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 BG API readback: the `BG` manual task for channel id `UC4SzVEpoXGu16igGcTyhu6g` was completed for public fields at `https://www.youtube.com/@LunaCardsBulgarski`. Studio fields applied: channel name `LunaCards Български`, target handle `@LunaCardsBulgarski`, banner, shared LunaCards avatar, player watermark, localized Bulgarian description and external link `https://flashcardsluna.com/bg/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-016.json` confirmed `snippetTitle=LunaCards Български`, `brandingTitle=LunaCards Български`, `customUrl=@lunacardsbulgarski`, desired Bulgarian description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 28 was updated/read back: `Current handle=@LunaCardsBulgarski`, `Target handle=@LunaCardsBulgarski`, `Live channel URL=https://www.youtube.com/@LunaCardsBulgarski`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 HR API readback: the `HR` manual task for channel id `UCYUDLf-qwJLx6Z8etHxhvfg` was completed for public fields at `https://www.youtube.com/@LunaCardsHrvatski`. Studio fields applied: channel name `LunaCards Hrvatski`, target handle `@LunaCardsHrvatski`, banner, shared LunaCards avatar, player watermark, localized Croatian description and external link `https://flashcardsluna.com/hr/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-017.json` confirmed `snippetTitle=LunaCards Hrvatski`, `brandingTitle=LunaCards Hrvatski`, `customUrl=@lunacardshrvatski`, desired Croatian description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 29 was updated/read back: `Current handle=@LunaCardsHrvatski`, `Target handle=@LunaCardsHrvatski`, `Live channel URL=https://www.youtube.com/@LunaCardsHrvatski`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 SR API readback: the `SR` manual task for channel id `UCdbuujAIwGoL-XqDhs2JOhw` was completed for public fields at `https://www.youtube.com/@LunaCardsSrpski`. Studio fields applied: channel name `LunaCards Srpski`, target handle `@LunaCardsSrpski`, banner, shared LunaCards avatar, player watermark, localized Serbian description and external link `https://flashcardsluna.com/sr/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-018.json` confirmed `snippetTitle=LunaCards Srpski`, `brandingTitle=LunaCards Srpski`, `customUrl=@lunacardssrpski`, desired Serbian description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 30 was updated/read back: `Current handle=@LunaCardsSrpski`, `Target handle=@LunaCardsSrpski`, `Live channel URL=https://www.youtube.com/@LunaCardsSrpski`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 SL API readback: the `SL` manual task for channel id `UCXhLXcLyGuV-hCVuTEIyQsA` was completed for public fields at `https://www.youtube.com/@LunaCardsSlovenscina`. Studio fields applied: channel name `LunaCards Slovenščina`, target handle `@LunaCardsSlovenscina`, banner, shared LunaCards avatar, player watermark, localized Slovenian description and external link `https://flashcardsluna.com/sl/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-019.json` confirmed `snippetTitle=LunaCards Slovenščina`, `brandingTitle=LunaCards Slovenščina`, `customUrl=@lunacardsslovenscina`, desired Slovenian description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 31 was updated/read back: `Current handle=@LunaCardsSlovenscina`, `Target handle=@LunaCardsSlovenscina`, `Live channel URL=https://www.youtube.com/@LunaCardsSlovenscina`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 LT API readback: the `LT` manual task for channel id `UCg5P8O4UQ8Uo7RL_OTHzukw` was completed for public fields at `https://www.youtube.com/@LunaCardsLietuviu`. Studio fields applied: channel name `LunaCards Lietuviškai`, target handle `@LunaCardsLietuviu`, banner, shared LunaCards avatar, player watermark, localized Lithuanian description and external link `https://flashcardsluna.com/lt/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-020.json` confirmed `snippetTitle=LunaCards Lietuviškai`, `brandingTitle=LunaCards Lietuviškai`, `customUrl=@lunacardslietuviu`, desired Lithuanian description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 32 was updated/read back: `Current handle=@LunaCardsLietuviu`, `Target handle=@LunaCardsLietuviu`, `Live channel URL=https://www.youtube.com/@LunaCardsLietuviu`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 LV API readback: the `LV` manual task for channel id `UCP01tFSt8NZ7cMfIQDRjQ4A` was completed for public fields at `https://www.youtube.com/@LunaCardsLatviesu`. Studio fields applied: channel name `LunaCards Latviski`, target handle `@LunaCardsLatviesu`, banner, shared LunaCards avatar, player watermark, localized Latvian description and external link `https://flashcardsluna.com/lv/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-021.json` confirmed `snippetTitle=LunaCards Latviski`, `brandingTitle=LunaCards Latviski`, `customUrl=@lunacardslatviesu`, desired Latvian description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 33 was updated/read back: `Current handle=@LunaCardsLatviesu`, `Target handle=@LunaCardsLatviesu`, `Live channel URL=https://www.youtube.com/@LunaCardsLatviesu`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 ET API readback: the `ET` manual task for channel id `UC2nA8gsivL__x6JKl-fs0uw` was completed for public fields at `https://www.youtube.com/@LunaCardsEesti`. Studio fields applied: channel name `LunaCards Eesti`, target handle `@LunaCardsEesti`, banner, shared LunaCards avatar, player watermark, localized Estonian description and external link `https://flashcardsluna.com/et/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-022.json` confirmed `snippetTitle=LunaCards Eesti`, `brandingTitle=LunaCards Eesti`, `customUrl=@lunacardseesti`, desired Estonian description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 34 was updated/read back: `Current handle=@LunaCardsEesti`, `Target handle=@LunaCardsEesti`, `Live channel URL=https://www.youtube.com/@LunaCardsEesti`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 IS API readback: the `IS` manual task for channel id `UCUyFKGP-CNiSpmdFcoms6QA` was completed for public fields at `https://www.youtube.com/@LunaCardsIslenska`. Studio fields applied: channel name `LunaCards Íslenska`, target handle `@LunaCardsIslenska`, banner, shared LunaCards avatar, player watermark, localized Icelandic description and external link `https://flashcardsluna.com/is/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-024.json` confirmed `snippetTitle=LunaCards Íslenska`, `brandingTitle=LunaCards Íslenska`, `customUrl=@lunacardsislenska`, desired Icelandic description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 35 was updated/read back: `Current handle=@LunaCardsIslenska`, `Target handle=@LunaCardsIslenska`, `Live channel URL=https://www.youtube.com/@LunaCardsIslenska`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 TL API readback: the `TL` manual task for channel id `UCL2Oj2QZ-f46Ud5rERoNTiQ` was completed for public fields at `https://www.youtube.com/@LunaCardsFilipino`. Studio fields applied: channel name `LunaCards Filipino`, target handle `@LunaCardsFilipino`, banner, shared LunaCards avatar, player watermark, localized Filipino description and external link `https://flashcardsluna.com/tl/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-027.json` confirmed `snippetTitle=LunaCards Filipino`, `brandingTitle=LunaCards Filipino`, `customUrl=@lunacardsfilipino`, desired Filipino description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 37 was updated/read back: `Current handle=@LunaCardsFilipino`, `Target handle=@LunaCardsFilipino`, `Live channel URL=https://www.youtube.com/@LunaCardsFilipino`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 MY API readback: the `MY` manual task for channel id `UCP7ua8Qn3qCjABUkMV5GICg` was completed for public fields at `https://www.youtube.com/@LunaCardsBurmese`. Studio fields applied: channel name `LunaCards မြန်မာ`, target handle `@LunaCardsBurmese`, banner, shared LunaCards avatar, player watermark, localized Burmese description and external link `https://flashcardsluna.com/my/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-028.json` confirmed `snippetTitle=LunaCards မြန်မာ`, `brandingTitle=LunaCards မြန်မာ`, `customUrl=@lunacardsburmese`, desired Burmese description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 38 was updated/read back: `Current handle=@LunaCardsBurmese`, `Target handle=@LunaCardsBurmese`, `Live channel URL=https://www.youtube.com/@LunaCardsBurmese`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 KM API readback: the `KM` manual task for channel id `UCVPNmzYNdmbolICROM6CJag` was completed for public fields at `https://www.youtube.com/@LunaCardsKhmer`. Studio fields applied: channel name `LunaCards ភាសាខ្មែរ`, target handle `@LunaCardsKhmer`, banner, shared LunaCards avatar, player watermark, localized Khmer description and external link `https://flashcardsluna.com/km/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-029.json` confirmed `snippetTitle=LunaCards ភាសាខ្មែរ`, `brandingTitle=LunaCards ភាសាខ្មែរ`, `customUrl=@lunacardskhmer`, desired Khmer description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 39 was updated/read back: `Current handle=@LunaCardsKhmer`, `Target handle=@LunaCardsKhmer`, `Live channel URL=https://www.youtube.com/@LunaCardsKhmer`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 LO API readback: the `LO` manual task for channel id `UCbER-ysJ3PVsIRG6hgr_PHw` was completed for public fields at `https://www.youtube.com/@LunaCardsLao`. Studio fields applied: channel name `LunaCards ພາສາລາວ`, target handle `@LunaCardsLao`, banner, shared LunaCards avatar, player watermark, localized Lao description and external link `https://flashcardsluna.com/lo/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-030.json` confirmed `snippetTitle=LunaCards ພາສາລາວ`, `brandingTitle=LunaCards ພາສາລາວ`, `customUrl=@lunacardslao`, desired Lao description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 40 was updated/read back: `Current handle=@LunaCardsLao`, `Target handle=@LunaCardsLao`, `Live channel URL=https://www.youtube.com/@LunaCardsLao`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 NE API readback: the `NE` manual task for channel id `UCL1bQyM5VsxW8-n8KUqln2A` was completed for public fields at `https://www.youtube.com/@LunaCardsNepali`. Studio fields applied: channel name `LunaCards नेपाली`, target handle `@LunaCardsNepali`, banner, shared LunaCards avatar, player watermark, localized Nepali description and external link `https://flashcardsluna.com/ne/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-031.json` confirmed `snippetTitle=LunaCards नेपाली`, `brandingTitle=LunaCards नेपाली`, `customUrl=@lunacardsnepali`, desired Nepali description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 41 was updated/read back: `Current handle=@LunaCardsNepali`, `Target handle=@LunaCardsNepali`, `Live channel URL=https://www.youtube.com/@LunaCardsNepali`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 SI API readback: the `SI` manual task for channel id `UCgGRZU3j02PQ58z5QcnhhMg` was completed for public fields at `https://www.youtube.com/@LunaCardsSinhala`. Studio fields applied: channel name `LunaCards සිංහල`, target handle `@LunaCardsSinhala`, banner, shared LunaCards avatar, player watermark, localized Sinhala description and external link `https://flashcardsluna.com/si/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-032.json` confirmed `snippetTitle=LunaCards සිංහල`, `brandingTitle=LunaCards සිංහල`, `customUrl=@lunacardssinhala`, desired Sinhala description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 42 was updated/read back: `Current handle=@LunaCardsSinhala`, `Target handle=@LunaCardsSinhala`, `Live channel URL=https://www.youtube.com/@LunaCardsSinhala`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 TA API readback: the `TA` manual task for channel id `UCc569J6C2XCvBnscVoMlwqg` was completed for public fields at `https://www.youtube.com/@LunaCardsTamil`. Studio fields applied: channel name `LunaCards தமிழ்`, target handle `@LunaCardsTamil`, banner, shared LunaCards avatar, player watermark, localized Tamil description and external link `https://flashcardsluna.com/ta/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-033.json` confirmed `snippetTitle=LunaCards தமிழ்`, `brandingTitle=LunaCards தமிழ்`, `customUrl=@lunacardstamil`, desired Tamil description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 43 was updated/read back: `Current handle=@LunaCardsTamil`, `Target handle=@LunaCardsTamil`, `Live channel URL=https://www.youtube.com/@LunaCardsTamil`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 TE API readback: the `TE` manual task for channel id `UCsfDK93oVkE6zxQT2FOfFtw` was completed for public fields at `https://www.youtube.com/@LunaCardsTelugu`. Studio fields applied: channel name `LunaCards తెలుగు`, target handle `@LunaCardsTelugu`, banner, shared LunaCards avatar, player watermark, localized Telugu description and external link `https://flashcardsluna.com/te/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-035.json` confirmed `snippetTitle=LunaCards తెలుగు`, `brandingTitle=LunaCards తెలుగు`, `customUrl=@lunacardstelugu`, desired Telugu description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 44 was updated/read back: `Current handle=@LunaCardsTelugu`, `Target handle=@LunaCardsTelugu`, `Live channel URL=https://www.youtube.com/@LunaCardsTelugu`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 KN API readback: the `KN` manual task for channel id `UCQwFwnfrYboBi5SzRM4hMdQ` was completed for public fields at `https://www.youtube.com/@lunacardskannada`. Studio fields applied: channel name `LunaCards ಕನ್ನಡ`, target handle `@LunaCardsKannada`, banner, shared LunaCards avatar, player watermark, localized Kannada description and external link `https://flashcardsluna.com/kn/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-036.json` confirmed `snippetTitle=LunaCards ಕನ್ನಡ`, `brandingTitle=LunaCards ಕನ್ನಡ`, `customUrl=@lunacardskannada`, desired Kannada description and `hasBanner=true`. Lowercase public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 45 was updated/read back: `Current handle=@LunaCardsKannada`, `Target handle=@LunaCardsKannada`, `Live channel URL=https://www.youtube.com/@lunacardskannada`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID; public handle URL readback OK lowercase`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 ML API readback: the `ML` manual task for channel id `UC9Y3EC5dqHPMqyYh4FkisXw` was completed for public fields at `https://www.youtube.com/@lunacardsmalayalam`. Studio fields applied: channel name `LunaCards മലയാളം`, target handle `@LunaCardsMalayalam`, banner, shared LunaCards avatar, player watermark, localized Malayalam description and external link `https://flashcardsluna.com/ml/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-037.json` confirmed `snippetTitle=LunaCards മലയാളം`, `brandingTitle=LunaCards മലയാളം`, `customUrl=@lunacardsmalayalam`, desired Malayalam description and `hasBanner=true`. Lowercase public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 46 was updated/read back: `Current handle=@LunaCardsMalayalam`, `Target handle=@LunaCardsMalayalam`, `Live channel URL=https://www.youtube.com/@lunacardsmalayalam`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID; public handle URL readback OK lowercase`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 KK API readback: the `KK` manual task for channel id `UCbTIdOTFdk0bVaytyx5v13Q` was completed at `https://www.youtube.com/@lunacardskazakh`. Studio fields applied: channel name `LunaCards Қазақша`, target handle `@LunaCardsKazakh`, shared LunaCards avatar, banner, localized Kazakh description and external link `https://flashcardsluna.com/kk/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-042.json` confirmed `snippetTitle=LunaCards Қазақша`, `brandingTitle=LunaCards Қазақша`, `customUrl=@lunacardskazakh`, desired Kazakh description and `hasBanner=true`. Lowercase public URL readback returned HTTP 200. Studio UI readback showed profile photo controls changed to `Изменить` / `Удалить` after avatar crop and publish. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 48 was updated/read back: `Current handle=@LunaCardsKazakh`, `Target handle=@LunaCardsKazakh`, `Live channel URL=https://www.youtube.com/@lunacardskazakh`, `Ready for Studio=Studio public fields and avatar readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/description/link API/UI readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID; public handle URL readback OK lowercase`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 AZ API readback: the `AZ` manual task for channel id `UC9nlXd20M3EoVj5eaNhCXcA` was completed at `https://www.youtube.com/@lunacardsazerbaycan`. Studio fields applied: channel name `LunaCards Azerbaycan`, target handle `@LunaCardsAzerbaycan`, shared LunaCards avatar, banner, localized Azerbaijani description and external link `https://flashcardsluna.com/az/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-043.json` confirmed `snippetTitle=LunaCards Azerbaycan`, `brandingTitle=LunaCards Azerbaycan`, `customUrl=@lunacardsazerbaycan`, desired Azerbaijani description and `hasBanner=true`. Lowercase public URL readback returned HTTP 200. Studio UI readback showed profile photo controls changed to `Изменить` / `Удалить` after avatar crop and publish. The published title is ASCII `LunaCards Azerbaycan` because the Studio/browser input path made the native Azerbaijani character unsafe during manual finishing; the localized description remains Azerbaijani. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 49 was updated/read back: `Current handle=@LunaCardsAzerbaycan`, `Target handle=@LunaCardsAzerbaycan`, `Live channel URL=https://www.youtube.com/@lunacardsazerbaycan`, `Ready for Studio=Studio public fields and avatar readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/description/link API/UI readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID; public handle URL readback OK lowercase; published title is ASCII LunaCards Azerbaycan.` Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 Studio task exporter status rule: `scripts/export-youtube-channel-studio-tasks.mjs --manual-needed` treats `configured_readback` and `studio_complete` as complete statuses, so already finished channels such as `FR` and `KK` do not reappear in the manual queue. `needs_public_link_fix`, empty current handles, temporary `new...` handles and other unfinished statuses remain manual-needed.

GitHub Actions safe API branding workflow:

```text
.github/workflows/youtube-channel-branding-api.yml
```

This workflow is for the official API-manageable channel branding subset only: banner upload, `brandingSettings.channel.description` and player watermark. It does not change channel title/name, handle, profile avatar/icon, contact email or public profile links. It is manual-only through `workflow_dispatch`, and apply mode requires the explicit input `confirm_youtube_write=APPLY_API_BRANDING`.

The workflow does not store OAuth files in Git. Runtime secrets are restored only on the runner from the GitHub Environment secret `YOUTUBE_OAUTH_BUNDLE_TGZ_B64` in environment `youtube-api-branding`, created from local gitignored OAuth files without printing contents:

```bash
tar -czf - .local/youtube-oauth/google-oauth-client.json .local/youtube-oauth/tokens \
  | base64 | tr -d '\n' \
  | gh secret set --env youtube-api-branding YOUTUBE_OAUTH_BUNDLE_TGZ_B64
```

In GitHub UI, configure the `youtube-api-branding` environment with required reviewers before running `mode=apply`; this keeps the long-lived YouTube refresh-token bundle out of normal repository-wide workflow execution.

The workflow uses committed public branding assets mirrored under `assets/youtube-channel-branding/`. That mirror is generated from the current `config/youtube-channels.json` references and the local `outputs/youtube-channel-assets/` files:

```bash
node scripts/sync-youtube-channel-branding-assets.mjs --to-assets --verify
```

On GitHub, the workflow materializes those files back into `outputs/youtube-channel-assets/` before running the existing API scripts:

```bash
node scripts/sync-youtube-channel-branding-assets.mjs --to-outputs --verify
```

Recommended usage:

1. `mode=readback`, `scope=assigned` to confirm API-visible state for unfinished channels.
2. `mode=apply`, `scope=assigned`, `confirm_youtube_write=APPLY_API_BRANDING` to re-apply banner, description and watermark.
3. `mode=readback`, same scope, to verify `channelId`, banner presence and description match.

Reports are uploaded as GitHub artifacts from `outputs/youtube-channel-assets/youtube-channel-branding-*.json` and are non-secret. Do not upload `.local/`, OAuth client JSON, token JSON, contact-email defaults or generated secret bundles as artifacts.

2026-06-20 GitHub readback status: the GitHub workflow exists and can now restore the YouTube OAuth bundle from environment secret `YOUTUBE_OAUTH_BUNDLE_TGZ_B64` in `youtube-api-branding` (secret readback by name/update timestamp only, not by value). A safe `mode=plan` dispatch run `27872492518` first failed because npm's command banner was redirected into the JSON report. Commit `281be58` fixed the workflow to call `node scripts/youtube-channel-branding.mjs --dry-run --json` directly, and pushed plan run `27872580979` succeeded with `planned_channels=51` plus a non-secret report artifact. After the environment secret was added, readback run `27872830271` succeeded for `scope=assigned` with `readback_ok=39`, `readback_failed=0`; full readback run `27872871371` succeeded for `scope=all` with `readback_ok=51`, `readback_failed=0`, `manual_title_mismatches=48`. `mode=apply` has not been run from GitHub after this readback; do not run it until the user explicitly confirms YouTube API writes with `APPLY_API_BRANDING`.

Pre-apply channel mapping guard: the live Google Sheet `Ютуб курсы FCL` / `YouTube каналы` is the source of truth for which support language belongs to which channel. Before any GitHub `mode=apply`, read `YouTube каналы!A1:I52` and compare `Support code`, `Channel ID / UC...`, live handle URL and site courses URL against `config/youtube-channels.json`. Do not rely on row order, token filenames, OAuth picker names or temporary `New...` labels. On 2026-06-20 the live Sheet range `A1:I52` was read back; its 51 support-code/channel-id mappings matched `config/youtube-channels.json` by support code and `UC...` id. The local config has a different order for some priority rows, so order must never be used as identity.

Local access import note: `/Users/lali/Desktop/Youtube2026NEW/.env.local` was copied into gitignored `.local/access-imports/youtube2026new.env.local` on 2026-06-20. Its variable names show NASA/AI33 access, not Google/YouTube OAuth. It is useful as a private imported env file, but it is not sufficient for YouTube channel branding automation. On 2026-06-20 the user-provided Google OAuth client JSON was copied to gitignored `.local/youtube-oauth/google-oauth-client.json`; the Google Cloud OAuth client must allow `http://127.0.0.1:53682/oauth2callback` for local authorization. `npm run auth:youtube-discovery` created `.local/youtube-oauth/tokens/discovery.json`; `npm run list:youtube-channels -- --json` returned only the selected authorized channel `@flashcardsluna` / `UCKdKPQXo5PZQqqD0PdMY-LQ`, not every Brand Channel under the Google account. Therefore API-based inventory should be treated as per-selected-channel unless a later OAuth flow proves broader account readback. New channel handles/ids can be captured either by authorizing each Brand Channel or by browser/Studio/account-switcher readback, then written into `config/youtube-channels.json` / the Google Sheet registry. YouTube API writes require per-channel token files under `.local/youtube-oauth/tokens/<channel-key>.json`, authorized for the specific Brand Channel. Use `npm run auth:youtube-channel -- --channel=<key>` to create one token file. During Google authorization, choose the exact Brand Channel in the account/channel picker. Do not commit or print those files.

Per-channel upload-token collection: `npm run plan:youtube-channel-tokens` builds the current 51-channel public support-language checklist from `config/language-order.json`, collapsing the 54 deck variants to 51 public channel paths (`EN-GB -> EN`, `ES-419 -> ES`, `PT-BR -> PT`). For video dispatch, the shared English/Spanish/Portuguese channels then narrow to canonical support/native codes only: `EN`, `ES-419` and `PT-BR`. The token files required by future GitHub/YouTube upload automation are local secrets under `.local/youtube-oauth/tokens/<channel-key>.json` or the per-channel `oauthTokenFile` path recorded in `config/youtube-channels.json`; they must never be committed or printed. On 2026-06-20 the 12 configured priority support channels (`EN`, `RU`, `ES-419`, `PT-BR`, `HI`, `ID`, `FR`, `DE`, `JA`, `KO`, `TR`, `ZH`) had `channelId` values written to `config/youtube-channels.json` and matching local token files API-readback verified under `.local/youtube-oauth/tokens/`. The manual OAuth inventory loop recorded 39 additional Brand Channels, then `scripts/assign-youtube-channel-languages.mjs` assigned all 39 to the remaining public support-language slots and updated `config/youtube-channels.json`, `config/youtube-channel-inventory.json` and the assignment report. The temporary next OAuth slot `unassigned-048` was stopped because all 51 known channels were already recorded. The current token checklist readback is: 51 configured public support channels, 51 existing local token files or configured `oauthTokenFile` references, 39 assigned inventory channels and 0 unassigned inventory channels. Next work is channel profile finishing, not more OAuth inventory or language assignment unless new Brand Channels are created. Use `npm run plan:youtube-channel-branding` for dry-run validation. API branding writes for banner/description/watermark require explicit confirmation; channel name, handle, avatar, contact email and profile links remain manual YouTube Studio/browser fields. Record & Replay plus Computer Use can help with repeated browser picker/consent/Studio flows if new channels are created later; do not record passwords, 2FA codes, API keys, or token file contents.

GitHub boundary for YouTube access: do not upload OAuth token JSON files, Google OAuth client secret JSON, `.local` contents or contact-email defaults to the repository. For channel API branding and video upload from GitHub, use only the encrypted environment secret `YOUTUBE_OAUTH_BUNDLE_TGZ_B64` in environment `youtube-api-branding`, restore it only inside the workflow runner, and keep repo files limited to non-secret channel IDs, handles, support-language mappings, public branding assets, playlist registry rows, upload ledgers and metadata templates. The same OAuth bundle is sufficient for upload only because the per-channel token files were authorized locally and bundled into the environment secret; never add token JSON files as normal repository files or artifacts.

Ambiguous new-channel inventory rule: if the Google OAuth picker shows temporary names such as `New 25`, `New11` or `NEW 8`, do not assign them to support languages by guess. Authorize each into an unassigned token path such as `.local/youtube-oauth/tokens/unassigned-001.json`, immediately run `npm run list:youtube-channels -- --token-file=.local/youtube-oauth/tokens/unassigned-001.json --json`, and store only non-secret readback fields in `config/youtube-channel-inventory.json`: tokenKey, channelId, currentTitle, currentHandle, publicUrl, uploadsPlaylistId, publishedAt and assignment status. After each OAuth/API readback and after each language assignment, also update Google Sheet `Ютуб курсы FCL`, tab `YouTube каналы`, with the support language, channel title, public handle/URL, `UC...` channel ID, assignment/readback status and notes; never write local token paths, token contents, secrets or contact-email secrets into the Sheet. Current known account inventory is assigned as of 2026-06-20: 39 formerly unassigned rows in `config/youtube-channel-inventory.json` and Google Sheet rows 14-52 are mapped to support languages. Token keys are not contiguous because duplicate selected channels were skipped; use the `UC...` channel id, not the temporary token number or picker title, as identity. Do not create or use `unassigned-048` unless the user creates or reveals an additional Brand Channel after this 51-channel inventory snapshot.

Support-language channels are broad viewer-language channels, not regional-variant channels. A Portuguese-speaking channel covers both European Portuguese (`PT`) and Brazilian Portuguese (`PT-BR`), a Spanish-speaking channel covers both Spain Spanish (`ES`) and Latin American Spanish (`ES-419`), and an English-speaking channel covers both general/US English (`EN`) and British English (`EN-GB`). Do not split channels or use region-only naming/handles for these shared viewer-language channels unless the user explicitly decides to create a separate region-only channel. Regional variants belong in internal data, playlists, video titles/descriptions, metadata and language-pair routing when the content differs.

Public site language URLs use the 51-language website routing layer, not the 54-variant deck/data layer. Channel profile links, video descriptions, QR entry links and public course links must collapse regional variants to the base public site language path:

| Data/support variants | Public site language path |
| --- | --- |
| `EN`, `EN-GB` | `https://flashcardsluna.com/en` |
| `ES`, `ES-419` | `https://flashcardsluna.com/es` |
| `PT`, `PT-BR` | `https://flashcardsluna.com/pt` |

If linking directly to the course list, append `/courses` to the collapsed base path, for example `https://flashcardsluna.com/pt/courses`. Do not use `/gb`, `/uk`, `/us`, `/mx`, `/br`, `/en-gb`, `/es-419` or `/pt-br` as public site language paths for FlashcardsLuna channel/profile/video links unless the live site routing is intentionally changed and read back.

This collapse applies only to the public website language path. Do not remove or rewrite regional language variants in decks, data, video generation, playlist keys, titles or metadata. For example, Russian-native viewers learning Brazilian Portuguese should land on `https://flashcardsluna.com/ru/courses/kitchenware-basic/study/standard?langs=pt-br`, while Portuguese-native or Brazilian-Portuguese-native channel links both start from the public site path `https://flashcardsluna.com/pt`; `https://flashcardsluna.com/pt-br` is not a public language section.

Norwegian has an additional public-link alias: data/workbook/DB code `NB` and support code `NO` both point to the public site/study code `no`. Video descriptions, QR links and `courseUrl` must use `?langs=no`, not `?langs=nb`, while playlist/data identities can still use their documented internal codes.

Already-uploaded YouTube descriptions are a separate external repair lane, because local metadata generation fixes do not rewrite live YouTube snippets. Use `npm run repair:youtube-course-url` for deterministic course URL repair. Default mode is registry-only planning and performs no YouTube API calls. `--live-audit` reads live `videos.list` snippets to prove whether the legacy URL is still present. `--apply --confirm-youtube-write` calls `videos.update(part=snippet)` only for exact legacy URL replacements such as `?langs=nb -> ?langs=no`, preserves the existing title/tags/category, performs readback unless `--skip-readback` is passed, and records successful rows in `config/youtube-published-videos.json` under `courseUrlRepair`. When the local machine does not have the route-specific OAuth client bundle, use `.github/workflows/youtube-course-url-repair.yml`; it restores the route environment secret, supports `plan` / `audit` / `apply`, and persists only trusted `courseUrlRepair` fields back into `config/youtube-published-videos.json`.

### 1.2. Video thumbnails

Видео должны получать отдельную YouTube-обложку, когда канал уже имеет право на custom thumbnails. Thumbnail должен быть визуально из той же системы, что и channel art: light `#f4f7f9` background, white rounded card panels, soft blue accents, deep navy typography, restrained FlashcardsLuna branding and a clean premium flashcard feel. Он не должен быть темным, кричащим или кликбейтным; цель - быстро показать viewer language, target language/level and deck topic.

If a channel does not yet have YouTube advanced features/custom thumbnail permission, `thumbnailUploadMode=first_frame_auto` means only "skip `thumbnails.set` and let YouTube choose an automatic thumbnail." The YouTube Data API does **not** let us select the first frame, and live readback on 2026-06-22 showed YouTube may choose an internal lesson slide instead of the intro slide. User decision after that readback: keep automatic thumbnails as-is for this scheduled wave instead of holding or reuploading videos. Record `thumbnailSet=false`, `thumbnailSource=youtube-auto-first-frame`, `thumbnailFallbackReason`, `needsThumbnailPermission=true` and the fact that the exact frame is YouTube-selected, not guaranteed by our pipeline.

If custom thumbnail permission is enabled after a video was already uploaded with the fallback, do not rerender or reupload the video. Use `npm run set:youtube-thumbnail -- --video-id=<id> --metadata=<youtube_metadata.json> --thumbnail=<youtube_thumbnail.jpg> --apply --confirm-youtube-write`; the helper verifies OAuth channel identity and video ownership before calling `youtube.thumbnails.set`, then updates `config/youtube-published-videos.json`, `config/youtube-channels.json` and `outputs/youtube-thumbnail-ledger.jsonl`.

2026-06-19 VectorEngine GPT Image 2 smoke showed that `gpt-image-2` is available through the OpenAI-compatible `/v1/images/generations` endpoint and can render difficult multilingual text materially better than older image models. Stress-test artifacts:

```text
outputs/tmp/vectorengine-image-text-smoke/gpt-image-2-min-text-20260619T083029Z.png
outputs/tmp/vectorengine-image-text-smoke/gpt-image-2-hard-text-20260619T083215Z.png
```

The hard-text image visually preserved `LunaCards`, `日本語 A1`, `ქართული A1`, `العربية A1`, `தமிழ் A1` and `O‘zbek tili A1` well enough for thumbnail exploration. The earlier prompt with pipe separators produced an extra `|`, so thumbnail prompts must list exact text on separate lines and explicitly forbid separators/extra symbols. GPT Image 2 may be used for full thumbnail candidates, including rendered text, but mass generation still needs a readback gate: at minimum human visual spot-check for new scripts, and preferably OCR/vision validation before public upload at scale.

2026-06-21 implementation status:

- `npm run generate:youtube-thumbnails -- <metadata-file-or-dir> --confirm-spend` creates a custom thumbnail through VectorEngine `gpt-image-2` (`/v1/images/generations`) only when the support channel is explicitly marked `customThumbnailUploadAllowed=true` in `config/youtube-channels.json`. The script writes `youtube_thumbnail_raw.png`, normalizes a 1280 x 720 JPEG `youtube_thumbnail.jpg` with `ffmpeg`, overlays the real repo logo asset `assets/youtube-channel-branding/en/flashcardsluna-site-avatar-512.png` when present, writes `youtube_thumbnail_metadata.json`, and updates the adjacent `youtube_metadata.json` with `thumbnailPath`, `thumbnailLogoOverlay` and `thumbnailLogoAsset`. If the channel is `false`, missing, or unknown, the script skips the paid VectorEngine image call and writes `thumbnailUploadMode=first_frame_auto` / `thumbnailSource=youtube-auto-first-frame` instead.
- The thumbnail prompt uses exact text lines only: `FlashcardsLuna`, target language + level and localized deck/topic title. Pronunciation/quiz meaning is conveyed through non-text icons, not extra text, so weak-script and low-resource support languages do not inherit an English fallback line. The prompt explicitly forbids pipe separators, URLs, random text and extra labels because text artifacts were observed in the earlier image test. The real logo is not delegated to the image model: it is overlaid from the committed PNG asset during normalization.
- `npm run check:youtube-thumbnails -- <metadata-file-or-dir>` is the hard thumbnail gate. It blocks missing thumbnails, files over the 2 MB YouTube thumbnail limit, images below 1280 x 720 and non-16:9 images. Pass `--allow-auto-first-frame` only for metadata that explicitly declares `thumbnailUploadMode=first_frame_auto`.
- `npm run build:youtube-thumbnail-review -- <metadata-file-or-dir> --output-prefix=<prefix>` builds the pre-upload review bundle: `<prefix>.json`, `<prefix>.csv`, `<prefix>.html` and `<prefix>.svg`. It maps every thumbnail or automatic-thumbnail fallback to `setId`, `supportLang`, `targetLang`, title, expected thumbnail text, `playlist_key`, `publishAt` and file paths, and blocks duplicate `setId + supportLang + targetLang` rows or missing thumbnails unless `--allow-auto-first-frame` is used with explicit fallback metadata. For scheduled runs, pass `--require-publish-at` so a thumbnail/fallback cannot reach upload without a visible planned public time in the manifest.
- `.github/workflows/youtube-video-publish.yml` can generate thumbnails after video/metadata creation when `generate_thumbnails=true`, but requires explicit `confirm_thumbnail_spend=GENERATE_THUMBNAILS` because custom thumbnails spend VectorEngine image credits. As of 2026-06-26, the thumbnail path is fail-closed: `generate_thumbnails=true` does not mean "generate images for every channel"; image generation is skipped unless the channel has `customThumbnailUploadAllowed=true`, and skipped channels use YouTube automatic thumbnails. The current custom-thumbnail allowlist in `config/youtube-channels.json` contains 16 physical channels: `en`, `ru`, `es`, `pt`, `ja`, `tr`, `zh`, `vi`, `th`, `sr`, `my`, `ne`, `si`, `uz`, `ka` and `sw`. This supersedes the earlier 15-channel note that still described ZH as unconfirmed; the 2026-07-16 user confirmation is recorded in the channel registry. Other channels stay `false` or unset. The workflow builds `outputs/video-generator/youtube-thumbnail-review-github.{json,csv,html,svg}` after thumbnail validation and before metadata/SEO/publish gates when thumbnail processing is enabled. In `mode=apply`, publish planning allows candidates without custom thumbnails only when they are explicitly marked `thumbnailUploadMode=first_frame_auto`.
- `longVideoUploadAllowed` is a separate per-channel capability in the same registry even though its current explicit true allowlist happens to contain the same 16 channels: `en`, `ru`, `es`, `pt`, `ja`, `tr`, `vi`, `th`, `sr`, `my`, `ne`, `si`, `uz`, `ka`, `sw` and `zh`. Future changes must update these fields independently: custom-thumbnail permission controls only `thumbnails.set`; long-video permission permits the full Polyglot product. For a false/unknown long-video capability, campaign planning converts a requested full product into measured `short_unverified` before claim, records the fallback reason, and never pays for a full render that will be rejected late. `shortUnverifiedPolyglotCardLimit=0` measures the whole candidate deck, retains the maximum contiguous prefix that fits `895` seconds (`14:55`) and writes `polyglot-duration-selection.json`; the cache is reused in final render, so this is not a second TTS pass. A blocked support `videoProductionReadiness` is instead deferred from the shared campaign with no claim or provider work. The short item never marks the required full Polyglot bundle as complete, and a full/short pair for the same support channel + bundle is a preflight blocker.
- 2026-07-01 artifact upload recovery for ordinary videos: if `.github/workflows/youtube-video-publish.yml` failed before YouTube upload during VectorEngine thumbnail generation, but the failed run artifact already contains valid MP4 files and `youtube_metadata.json`, do not rerender TTS/video and do not rerun VectorEngine. Dispatch the same workflow with `source_run_id=<failed_run_id>` plus the same `set_id`, `support`, `langs`, `mode=apply`, scheduled/public confirmations and `allow_republish=false`. This artifact mode downloads the source run artifact, extracts `youtube_thumbnail.jpg` from the first MP4 frame with ffmpeg, reschedules stale `publishAt` values through the normal calendar planner, validates thumbnails, uploads the existing videos with custom first-frame thumbnails, writes normal publication/playlists/calendar state, and lets the regular persist job commit the durable JSON files. Metadata entries without an adjacent MP4 are skipped and reported rather than treated as upload-ready; handle those targets later through a normal targeted render/upload. Use this only for pre-upload failures with no active publication row; if a video was already uploaded, repair playlist/thumbnail state instead of using artifact upload recovery.
- `.github/workflows/youtube-thumbnail-set.yml` is the thumbnail-only repair/test workflow for already uploaded videos. It does not render or upload video and does not create playlists. It downloads an existing successful Actions `source_run_id`, locates the matching `youtube_metadata.json`, and either uses adjacent `youtube_thumbnail.jpg` or, when `generate_if_missing=true` and `confirm_thumbnail_spend=GENERATE_THUMBNAILS`, generates the missing thumbnail through VectorEngine on GitHub before calling only `youtube.thumbnails.set` through `npm run set:youtube-thumbnail`. GitHub repair generation installs `ffmpeg` before normalization and uploads evidence that includes the matched metadata, generated thumbnail, generation report, ledger and non-secret config snapshots, so a quota-failed repair can be inspected or retried without blind regeneration. Live use requires `confirm_youtube_write=SET_YOUTUBE_THUMBNAIL`, spends VectorEngine credits when generation is enabled, and still spends YouTube Data API quota for `thumbnails.set`.
- 2026-07-03 local deterministic thumbnail-template experiments can use the installed renderer stack `satori@0.26.0`, `@resvg/resvg-js@2.6.2` and `sharp@0.35.3` from `package.json`. This is only a repo-owned HTML/SVG-to-1280x720 image rendering stack for prototype/template work; it is not wired into production thumbnail generation yet, does not replace the current VectorEngine `gpt-image-2` path, and does not remove the existing visual review and thumbnail gates. Use it when the desired output is a deterministic template render without Canva/Figma runtime dependency or paid VectorEngine image generation.
- 2026-07-03 accepted thumbnail-template style direction: channel thumbnails are for the native viewer channel, not for the language named by the channel code. Headline copy must name the studied target language plus level (for example `Испанский A1-A2` on the Russian channel, `Spanish A1-A2` on the English/US channel), while deck/topic copy is localized for the viewer/channel language. The accepted visual style is the soft imagegen composition reference with a large white left text panel, premium pale-blue background, richer hand-drawn food/flashcard/pronunciation icons on the right and large main text; exact language text should be overlaid deterministically after generation/reference selection. Current best local proof outputs: `outputs/design-prototypes/youtube-thumbnail-test-covers-imagegen-style-v3-large-text-clean-polyglot-20260703/`, covering ordinary RU/EN and Polyglot RU/EN samples. Polyglot thumbnails should keep the same system but swap the right-side visual theme toward globe, stacked flashcards, speech bubbles and audio/listening objects; do not use country flags as the primary language signal. The earlier `food-menu-v3` inline-SVG proof is too simplified/vector-like for this accepted style and must not be treated as the final visual direction.
- 2026-07-04 deck #1 RU-viewer target-language thumbnail proof exists at `outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-polyglot-ru-target-languages-proof-20260704/`; the later single-cover proof using the same Polyglot template exists at `outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-polyglot-template-single-cover-20260704/`, and a two-variant comparison of no Polyglot label vs small `Полиглот · 4 языка` badge exists at `outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-polyglot-label-variants-20260704/`. They use only the bitmap/imagegen references `polyglot-composition-reference.png` and `icon-sheet-reference.png`, with the accepted v3 proof/contact/manifest used for local comparison. Thumbnail copy comes from `outputs/video-generator/home_kitchen_cookware_pilot_01_polyglot_ru/youtube_metadata.json`: visible learned languages from `targetLanguagesDisplay` (`английский, испанский, французский, немецкий`) plus Course Metadata `deckTitle` / `deckDescription` (`Кухонная посуда`, `Посуда и приборы. Базовый уровень.`). The earlier 2026-07-03 local proof that used `Полиглот` as the main headline is superseded for this deck; current recommendation is to keep learned languages as the main headline and use `Полиглот · 4 языка` only as a small mode badge when needed. This is a local visual proof only, not production wiring and not a YouTube upload.
- 2026-07-04 ordinary RU-viewer learning Thai example proof exists at `outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-ordinary-ru-thai-example-20260704/`. It uses the ordinary bitmap/imagegen reference `composition-reference.png`, not the Polyglot globe base. The approved text hierarchy for ordinary covers is target language first (`Тайский A1`), then localized deck topic (`Кухонная посуда`), then Course Metadata subtitle (`Посуда и приборы. Базовый уровень.`). This is the preferred ordinary-cover information architecture. The current allowed ordinary bitmap base still contains a small unrelated crescent icon, so it is not a final universal art base for all target languages; production-ready art should remove unrelated cultural symbols while preserving the same large-text v3 layout.
- 2026-07-04 Course Metadata-first ordinary RU->Thai comparison proof exists at `outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-ordinary-ru-thai-course-metadata-first-20260704/`. It uses Course Metadata fields as the main readable cover text: `module/category` (`Дом · Кухня`), `title` (`Кухонная посуда`) and `description` (`Посуда и приборы. Базовый уровень.`), with target language kept as a compact context chip (`Тайский A1`). This hybrid is the preferred ordinary deck/topic cover direction after visual comparison: Course Metadata owns the main deck/topic copy, while the studied language must still remain visible on the thumbnail.
- 2026-07-04 first-deck confirmed-channel ordinary cover batch exists at `outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-confirmed-channel-covers-20260704/`. It contains `193` local deterministic JPG covers for active `home_kitchen_cookware_pilot_01` ordinary rows that still lacked a custom thumbnail or used `thumbnailUploadMode=first_frame_auto` under the then-local allowlist. Later on 2026-07-04 the user clarified that `KA` / `@LunaCardsGeorgian` and `SR` / `@LunaCardsSrpski` are not yet confirmed for custom thumbnails; those existing local proof images remain visual-only and are not upload-eligible until confirmation/readback. Upload scope must be recomputed from current `config/youtube-channels.json` before any YouTube write. No YouTube upload, no VectorEngine, no GPT Image and no legacy vector proof sources were used. The text hierarchy is Course Metadata first in the support/viewer language (`module/category/title/description`) plus a compact target-language `A1` chip. Manifest: `outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-confirmed-channel-covers-20260704/manifest.json`; contact sheet: `outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-confirmed-channel-covers-20260704/contact-sheet.jpg`.
- 2026-07-04 first-deck Polyglot published-cover proof batch exists at `outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-polyglot-published-covers-20260704/`. It contains `160` local deterministic JPG covers for all active `home_kitchen_cookware_pilot_01` rows in `config/youtube-polyglot-published-videos.json` (`51` full rows and `109` `short_unverified` rows), rendered from the accepted bitmap Polyglot visual base `polyglot-composition-reference.png` with the small Polyglot-mode badge layout. No YouTube upload, no VectorEngine, no GPT Image and no legacy vector proof sources were used. Manifest upload eligibility is intentionally narrower than local rendering: `24` rows are `uploadEligible=true`, while `136` are local-only because the channel custom-thumbnail permission is unconfirmed or the row is `short_unverified`. `KA` / `@LunaCardsGeorgian` and `SR` / `@LunaCardsSrpski` are included only as local visual proofs and remain not upload-eligible until confirmation/readback. Manifest: `outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-polyglot-published-covers-20260704/manifest.json`; contact sheet: `outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-polyglot-published-covers-20260704/contact-sheet.jpg`.
- 2026-07-04 first-deck upload-eligible combined cover batch exists at `outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-upload-eligible-covers-20260704/`. It contains exactly `493` local JPG covers: `469` ordinary covers for active uploaded first-deck ordinary rows whose support channel is currently `customThumbnailUploadAllowed=true`, plus `24` upload-eligible Polyglot covers copied from the prior Polyglot render batch into the same proof package. No YouTube upload, no VectorEngine, no GPT Image and no paid image generation were used. The ordinary dry-run report `outputs/review/youtube-thumbnail-batch-plan-upload-eligible-ordinary-469-20260704.json` reports `469 ready / 0 blocked`; the Polyglot dry-run report `outputs/review/youtube-thumbnail-batch-plan-upload-eligible-polyglot-24-20260704.json` reports `24 ready / 0 blocked`. Manifest: `outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-upload-eligible-covers-20260704/manifest.json`; contact sheet: `outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-upload-eligible-covers-20260704/contact-sheet.jpg`.
- 2026-07-04 first-deck ordinary manual-upload redraw exists at `outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-ordinary-target-language-large-pair-folders-20260704/`. It contains `468` current ordinary local JPG covers laid out for manual YouTube Studio reupload as `by-support/<support-language>/<support-target-pair>/youtube_thumbnail.jpg`, with one `video.json` sidecar per pair folder, per-support contact sheets, root `contact-sheet.jpg`, `manual-upload-index.csv` and `manifest.json`. This batch supersedes the ordinary part of the prior combined proof for manual upload because it uses the approved target-language-large hierarchy (`<localized target language> A1` as the headline, localized Course Metadata title/description below) and excludes rows whose `status` or `publicationStatus` contains `superseded`. The excluded row is an old `RU -> ES` duplicate with `publicationStatus=missing_video_api_readback_superseded`; current manual scope is therefore `468` unique support-target pairs, not `469`. Dry-run report `outputs/review/youtube-thumbnail-batch-plan-ordinary-target-large-pair-folders-468-20260704.json` reports `468 ready / 0 blocked`. Local visual review passed on the root contact sheet plus full-size `RU -> ES`, `MY -> EN`, `JA -> EN`, `TH -> JA` and `SW -> TH` samples. No YouTube upload, no VectorEngine, no GPT Image and no paid image generation were used.
- 2026-07-07 final first-deck ordinary approved covers live at `outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-approved-channel-pairs-target-language-first-20260707/manifest.json`. This manifest stores shared-channel metadata as `viewerSupportLang` plus `channelSupportLangs`; thumbnail-only planning must map shared channels to canonical support/native rows `EN`, `ES-419` and `PT-BR`, not target-only variants `EN-GB`, `ES` or `PT`. `scripts/plan-youtube-thumbnail-batch-from-manifest.mjs` understands that schema and remains dry-run only; `.github/workflows/youtube-thumbnail-batch-set.yml` is the apply path for `thumbnails.set` without render/TTS/video reupload or VectorEngine image generation. Thumbnail-only workflow concurrency is keyed by branch + route environment + support list so separate route groups do not cancel each other while the persist job still serializes registry writes.
- 2026-07-07 thumbnail-only recovery for the final approved first-deck covers: the approved ordinary manifest has `686` `by-channel` JPG covers and the approved Polyglot manifest has `46` `by-channel` JPG covers. Initial GitHub thumbnail apply runs could not see most of the local images because the JPG files were ignored/untracked on the runner; affected rows reported `missing_cover` even though the files existed locally. Commit `de1ad78d` on branch `codex/youtube-scheduled-batch-20260707` tracks the missing approved cover files exactly (`669` ordinary + `44` Polyglot new JPGs; `19` JPGs were already tracked). After that commit, local no-spend ordinary planning reported `98` ready rows still missing custom thumbnails. Four thumbnail-only apply runs were dispatched on `de1ad78d` with no render/TTS/video upload/VectorEngine work: `28867320731` for `youtube-api-branding` (`EN,ES-419,JA,PT-BR,RU,TR`), `28867322077` for `youtube-api-youtube-2` (`TH,VI`), `28867323357` for `youtube-api-youtube-3` (`KM,MY,SR`) and `28867324575` for `youtube-api-youtube-4` (`NE`). Readback result: `28867320731` and `28867322077` completed `success` with persisted state; `28867323357` failed on the first `KM -> EN` thumbnail write for video `ANoeDeLN-yI` with YouTube API `youtube.thumbnail/forbidden`, so `config/youtube-channels.json` marks `km.customThumbnailUploadAllowed=false` until Studio/advanced-feature confirmation; `28867324575` successfully set `NE -> NO` on video `c0GBP1kNY9Y`, but its persist job was cancelled, so `config/youtube-published-videos.json` was repaired locally from the verified apply log. After that local repair, the no-spend ordinary plan reports `502` ready rows, `184` blocked rows (`53` `KM` rows blocked as `custom_thumbnail_not_confirmed`, `131` rows blocked as `no_active_publication`) and `38` ready rows still without `thumbnailSet=true` / `thumbnailUploadMode=custom`. No retry or additional GitHub dispatch has been launched after the `KM` failure readback.
- 2026-07-03 first 10-deck ordinary thumbnail batch proof: `outputs/design-prototypes/youtube-thumbnail-next-10-decks-ru-viewer-v1-20260703/` renders Sort 39-48 for a Russian-native viewer learning Spanish, using one imagegen-style background per deck theme plus deterministic local text overlay. This is a local RU-viewer visual proof only, not production wiring and not a YouTube upload. The rendered order is `Basic Ingredients & Spices`, `Grocery Shopping Words`, `Market Shopping Words`, `Restaurant Words`, `Advanced Foods & Seafood`, `Street & City Places`, `City Transport Basics`, `Metro & Public Transport Words`, `Direction Words`, `Taxi & Ride-share Words`.
- Source helper: `scripts/lib/vectorengine-image.mjs`. Generator: `scripts/generate-youtube-thumbnails.mjs`. Hard gate: `scripts/check-youtube-thumbnails.mjs`. Visual review bundle: `scripts/build-youtube-thumbnail-review-sheet.mjs`.
- **2026-07-05/07 thumbnail source rule: all ordinary covers for `home_kitchen_cookware_pilot_01` are fully pre-rendered as deterministic local JPEGs and committed to the repository. VectorEngine / GPT Image generation is permanently disabled for this deck. Do not call `generate:youtube-thumbnails` with `--confirm-spend` for this deck. Do not set `generate_thumbnails=true` in GitHub workflows for this deck.** The correct pipeline is: (1) video-generator creates `outputs/video-generator/<pair>/youtube_metadata.json`; (2) with `generate_thumbnails=false`, `.github/workflows/youtube-video-publish.yml` runs `node scripts/copy-pre-rendered-thumbnails.mjs --strict-custom` before the publish gate; (3) the script reads the final approved manifests, copies the matching pre-rendered JPEG into `outputs/video-generator/<pair>/youtube_thumbnail.jpg` and sets `thumbnailUploadMode=custom` / `thumbnailSource=pre-rendered-design-prototype` in metadata; (4) if the support channel does not have custom-thumbnail permission, the script writes explicit `thumbnailUploadMode=first_frame_auto` / `thumbnailSource=youtube-auto-first-frame` instead; (5) the workflow always runs thumbnail validation/review with `--allow-auto-first-frame` before upload. The script is fail-closed for custom-eligible channels: if a custom-eligible channel has no approved cover match in the final manifests, the workflow fails before YouTube upload instead of silently falling back to VectorEngine or auto thumbnail.
- 2026-07-13 approved-template cover automation: `config/youtube-cover-templates.json`, `config/youtube-cover-assets.json`, `npm run build:youtube-cover-assets` and `.github/workflows/youtube-cover-assets-build.yml` provide the GitHub-compatible no-provider build path. The accepted bitmap base is created/reviewed once; ordinary and Polyglot language/deck text is then overlaid deterministically without Imagine, VectorEngine or Gemini image calls. `--targets` and `--bundles` constrain a recovery build to the exact approved assignments. User-confirmed custom-thumbnail permission is now `true` for UZ, SI and KA. Their current local output contains `342` Deck #1/#2 video JPGs (`318` ordinary, `24` Polyglot) under `data/youtube-cover-assets/approved-template-overlay-uz-si-ka-20260713/` and `134` square playlist JPGs under `data/youtube-playlist-covers/20260713-uz-si-ka-approved-template/`. The Deck #1 final-tail manifests additionally contain exactly four reviewed JPGs: `SR -> NO`, `JA / east_asia_core`, `ES-419 / romance_core`, `PT-BR / romance_core`. A Sinhala-specific font fallback is mandatory for correct complex-script rendering. GitHub publish workflows accept only manifest-listed JPGs that are already tracked by Git; local existence alone is not enough. Asset generation never grants YouTube upload permission.
- 2026-07-20 Deck #3 production handoff: the user-approved deterministic package for `home_kitchen_storage_cleaning_a2` contains `852` manifest-listed video covers under `data/youtube-cover-assets/deck3-storage-cleaning-approved-20260720/`: `792` ordinary covers and `60` full Polyglot covers for the `15` canonical channels where `customThumbnailUploadAllowed=true`. Each eligible support has four production Polyglot bundles. The matched offline deck contains 35 cards for all 51 canonical support channels and 54 target variants. The package was checksum-verified before Git tracking; cover rendering made zero provider calls and zero YouTube writes. Publication remains a separately approved campaign apply.
- 2026-07-24 Deck #3 Chinese completion: the `ZH` channel package is `data/youtube-cover-assets/deck3-zh-complete-20260724/` and contains `57` approved, Git-tracked video covers rendered from the separately approved Deck #3 bases: `53` ordinary target-language pairs (excluding the same-viewer `ZH -> ZH` pair) and `4` full Polyglot bundles. The source deck SHA-256 is `1b32d508834b8f200eb4a056d9d9547e14f255f119b518747c6b15f1cc3c0021`; each JPG is 1280x720, under YouTube's 2 MB limit, has a sidecar checksum and appears in the contact sheets. Rendering made zero provider calls and zero YouTube writes. The package enables future Chinese campaign assignments only after a fresh live-control preflight and separately approved parent apply.
- 2026-08-01 Deck #4 production handoff: the user approved separate ordinary and Polyglot bases for `home_kitchen_small_tools_supplies_a2`. The deterministic package `data/youtube-cover-assets/deck4-small-tools-supplies-approved-20260801/` contains `909` manifest-listed covers for all `16` channels where `customThumbnailUploadAllowed=true`: `845` ordinary target-language pairs and `64` full Polyglot covers, four canonical bundles per channel. The current local source has 32 cards, 54 language variants and complete localized Course Metadata; its local-only export SHA-256 is `7a520e3b1c1d55140e5c8670e247506a9d57c2026f91179186e5d5021149e909`. `scripts/export-and-upload-deck.mjs <set-id> --local-only` is the safe no-Drive mode used for this build: it writes the ignored offline JSON and stops before OAuth or Google Drive access. Rendering made zero provider calls and zero YouTube writes. Publication remains a separately approved parent campaign apply.
- 2026-07-28 Deck #3 Chinese explicit Polyglot expansion: the user approved one additional `ZH / southeast_asia_core` full bundle (`TH, VI, ID, MS`) outside the four canonical core bundles. The deterministic asset package `data/youtube-cover-assets/deck3-zh-southeast-asia-expansion-20260728/` adds exactly one Git-tracked 1280×720 custom cover plus checksum sidecar and contact sheet; its cover SHA-256 is `e8079e36cbc23ae1f25149f86b36e931a83f655213d57e309b99a89b85da1d6b`. The bundle is an explicit approved exception, not an automatic expansion rule for other channels or bundles. Rendering used the existing approved base and made zero image-provider, provider or YouTube calls. The later campaign may create its verified-absent `POLYGLOT__ZH__southeast-asia-core__81d0b0623103` playlist only through its separately approved parent apply.


### 1.3. Playlist architecture

Status: **accepted implementation contract for YouTube playlist planning and upload automation**. New work should follow this path unless the user explicitly approves a revised strategy and this document plus [Decision Log](decision-log.md) are updated in the same cycle.

Playlist strategy must optimize for viewer clarity, channel growth and automation safety, not for mirroring every generated file. Current DB/readback on 2026-06-19 shows:

- `content_sets`: 42 ordinary thematic deck sets across `Home`, `Food & Eating`, `Core Foundation`, `Time`, `Shopping`, and adjacent domains;
- isolated course tables outside ordinary deck sets: `oxford_vocabulary_*` (1,197 source rows / 5 releases in current local DB), `hsk_classic_*` (5,000 rows / 6 releases), `hsk3_*` (6,800 rows / 7 releases), and `spanish_a1_*` (1,800 rows / 6 releases);
- active target/support language universe: 54 active language variants;
- localized course/deck titles, descriptions, modules and categories live in `content_set_localizations`, so playlist titles, thumbnail copy and descriptions must use localized metadata when available, not internal `content_sets.set_name`.
- YouTube video metadata must treat Course Metadata as canonical for the deck/topic name. `scripts/lib/video-generator.mjs` resolves metadata in this order: current Docker/Postgres `content_set_localizations` when available, then the GitHub offline deck JSON `courseMetadata`, then legacy offline `titles`, then English Course Metadata and only finally internal `content_sets` fallback. Generated `youtube_metadata.json` includes `deckMetadataSource` so a run artifact shows whether the title came from DB/offline Course Metadata or from a fallback. After editing Course Metadata in Docker/Postgres or Google Sheets, refresh the public offline deck JSON with `scripts/export-and-upload-deck.mjs` before the next GitHub publishing run; GitHub does not start Docker/Postgres and therefore cannot see local DB edits unless the Drive JSON was refreshed.

Therefore do **not** create a playlist per `(supportLang, targetLang, setId)` or per single small ordinary deck. That would create thousands of thin playlists, make channel pages unreadable, and waste YouTube API quota. Official YouTube constraints also push toward a compact playlist registry: `playlists.insert` and `playlistItems.insert` each cost 50 quota units, public playlist creation has daily channel limits, `playlists.insert` can fail with `maxPlaylistExceeded`, and a channel can feature at most 10 homepage shelves through `channelSections`.

Official API/readback references used for this decision:

- YouTube Data API `playlists.insert`: <https://developers.google.com/youtube/v3/docs/playlists/insert>
- YouTube Data API `playlistItems.insert`: <https://developers.google.com/youtube/v3/docs/playlistItems/insert>
- YouTube Data API `videos.insert`: <https://developers.google.com/youtube/v3/docs/videos/insert>
- YouTube Data API `thumbnails.set`: <https://developers.google.com/youtube/v3/docs/thumbnails/set>
- YouTube Data API `channelSections.insert`: <https://developers.google.com/youtube/v3/docs/channelSections/insert>
- YouTube Help playlist basics and public playlist daily limit note: <https://support.google.com/youtube/answer/57792>

Accepted grouping:

1. **Channel = support/viewer language.** A Russian-native channel contains Russian explanations/translations; an English-native channel contains English explanations/translations.
2. **Playlist = target language + course family + level/track.** Examples for the RU channel:
   - `Испанский A1: базовый курс` for Spanish A1 Core videos;
   - `Английский: Oxford 3000 Core` for Oxford Core English vocabulary videos;
   - `Китайский HSK 3.0: Уровень 1` for HSK 3.0 Level 1;
   - `Испанский A1: еда и дом` or `Испанский A1: бытовой словарь` for ordinary thematic decks once there is enough volume.
3. **Course families stay separate when learner intent differs.** HSK Classic 2.0 and HSK 3.0 are separate playlists. Oxford 3000 Core and Oxford 5000 Advanced Extension are separate playlists. Spanish A1 Core is separate from ordinary Spanish thematic vocabulary.
4. **Regional or duplicate target variants share a support-language channel but may split playlists when the learner-facing content differs.** `ES` vs `ES-419`, `PT` vs `PT-BR`, and `EN` vs `EN-GB` should not become separate channels. They can live on the same viewer-language channel as separate playlists, for example a Russian-native channel can have both `Португальский A1` and `Бразильский португальский A1` playlists if the videos/text/audio are region-specific. This is not considered duplicate channel content; the distinction belongs to playlist identity, title, description, thumbnail copy and metadata.
5. **Ordinary decks should be grouped by macro learner journey, not by exact deck title.** Start with target-language playlists like `Spanish A1 Everyday Vocabulary`, then split into `Food`, `Home`, `Travel`, `Core Verbs`, etc. only after a playlist has enough videos to justify a shelf.
6. **Lazy-create playlists.** Create a playlist only when a flagship course exists or when at least 3-5 videos are ready for that playlist. Do not pre-create empty playlists for every possible language pair.

Course family taxonomy for playlist keys:

| `courseFamily` | Use for | Split rule |
|---|---|---|
| `ordinary-vocabulary` | ordinary thematic `content_sets` videos | Group by target language and macro learner journey such as `a1-everyday`, `a1-food`, `a1-home`; do not make one playlist per small deck. |
| `spanish-a1-core` | isolated Spanish A1 Core course videos | Keep separate from ordinary Spanish vocabulary; split `ES` / `ES-419` only when the video content or positioning differs. |
| `oxford-3000-core` | Oxford 3000 Core English vocabulary videos | Target is English; belongs on non-English support channels. Keep US/UK edition differences in track/variant only when content differs. |
| `oxford-5000-advanced` | Oxford 5000 Advanced Extension videos | Separate from Oxford 3000 Core because learner intent and level differ. |
| `hsk-classic` | HSK Classic 2.0 videos | Separate from HSK 3.0. Track by official level. |
| `hsk3` | HSK 3.0 videos | Separate from HSK Classic. Include level and, if needed, curriculum/year variant. |
| `english-core-3000` | future LunaCards-owned English Core 3000 videos | Separate from Oxford-branded benchmark/source-package work. |
| `jlpt`, `topik`, `dele`, `goethe` | future exam/course families | Add only after source-of-truth course docs exist. |

Automation must use a stable machine key, not localized playlist titles:

```text
playlist_key = <supportLang>__<targetLang>__<courseFamily>__<levelOrTrack>[__<variantOrYear>]
```

Examples:

```text
RU__ES__spanish-a1-core__a1
RU__EN__oxford-3000-core__a1-a2
RU__ZH__hsk3__level-1__2025
EN__ES__ordinary-vocabulary__a1-everyday
EN__ES-419__ordinary-vocabulary__a1-everyday
RU__PT__ordinary-vocabulary__a1-everyday
RU__PT-BR__ordinary-vocabulary__a1-everyday
```

Initial playlist plan for the first channels:

| support channel | first playlist keys to prepare | Notes |
|---|---|---|
| `RU` | `RU__ES__spanish-a1-core__a1`, `RU__EN__oxford-3000-core__a1-a2`, `RU__ZH__hsk3__level-1__2025`, later `RU__ES__ordinary-vocabulary__a1-everyday`, `RU__ES-419__ordinary-vocabulary__a1-everyday`, `RU__PT__ordinary-vocabulary__a1-everyday`, `RU__PT-BR__ordinary-vocabulary__a1-everyday` | Russian-native channel. Target English content belongs here; do not make `RU__RU` self-learning playlists. Spain/LatAm Spanish and Portugal/Brazil Portuguese can be adjacent playlists on the same RU channel when they are distinct learner products. |
| `EN` | `EN__ES__spanish-a1-core__a1`, `EN__ES-419__ordinary-vocabulary__a1-everyday`, `EN__ZH__hsk3__level-1__2025`, `EN__RU__ordinary-vocabulary__a1-everyday`, later additional target-language ordinary tracks | English-native channel. Do not create `EN__EN` “learn English” playlists on the English-native channel; English-learning content belongs on non-English support channels. Spain/LatAm Spanish can be separate playlists on the same EN channel if content differs. |
| future support channels | start with the same high-signal flagship families, not all possible pairs | Create channels only after support-language branding/channel ID is known and enough videos exist. |

Anti-rules:

- Do not pre-create all 54 x 53 language-pair playlists.
- Do not create separate viewer-language channels only because a target language has a regional duplicate. Put regional target variants on the same support/viewer-language channel and split by playlist only when content differs.
- Do not create empty playlists.
- Do not create a playlist solely because one video file exists.
- Do not use localized playlist title as identity; titles can change and localize, `playlist_key` must stay stable.
- Do not infer public course URL from internal DB slug without site-route readback.
- Do not rely on YouTube homepage shelves for the whole catalog; only 10 sections can be featured, so playlists must also work through search, video end screens/descriptions and channel playlist tab.
- Do not let duplicate historical rows in `docs/video-lessons-registry.md` create duplicate playlist API calls.

Future upload automation should add a machine-readable playlist registry before writing to YouTube:

```text
config/youtube-channels.json
config/youtube-playlists.json
outputs/youtube-publish-ledger.jsonl
```

The registry should store `playlist_key`, support channel key, target language, course family, level/track, localized title/description, `youtube_playlist_id` after creation, creation status, and last readback. `youtube_metadata.json` should carry the computed `playlist_key` so the uploader can create the playlist if missing and then call `playlistItems.insert` with the uploaded `videoId`.

Implementation sequence:

1. **Phase A - planner/dry-run only.** Add playlist-key computation and dry-run reports. No YouTube writes. Every video candidate must show `playlist_key`, localized playlist title, source evidence and either `publish_ready=true` or an explicit exclusion reason.
2. **Phase B - manual channel/playlist registry.** Add `config/youtube-channels.json` and `config/youtube-playlists.json`; allow manual `youtube_channel_id` / `youtube_playlist_id` fill from YouTube Studio/API readback.
3. **Phase C - uploader.** Only after OAuth/channel ownership is configured, add upload flow, thumbnail set, playlist resolve/create, playlist item insert, ledger write and channel/readback verification.
4. **Phase D - scheduled public publish.** Production uploads are scheduled by default: upload as `private` with the shared calendar's `status.publishAt`, then YouTube makes the video public at the reserved time. Immediate `public_now` and `private`/`unlisted` without `publishAt` remain explicit exceptional modes for approved launches, canaries, copyright checks or manual pre-publication review.

> **Current override (2026-07-13):** the anti-duplicate and continuous-calendar rules in [Publication schedule and global calendar](#publication-schedule-and-global-calendar) supersede older dated launch examples below wherever they conflict. In apply mode, `allow_republish` is disabled, one workflow owns one physical channel with `worker_count=1`, scheduled mode is the default, `schedule_start_date` is optional, and only the shared allocator may set `publishAt`.

2026-06-20 implementation status:

- `config/youtube-playlists.json` is the structured playlist registry. It stores `playlist_key`, support/target language, course family, level/track, channel id, eventual YouTube playlist id, title/description and readback status. Do not prefill every possible language pair; add planned entries from real upload candidates.
- `scripts/lib/youtube-playlists.mjs` computes stable playlist assignments without importing the heavy video renderer. New `youtube_metadata.json` files generated through `scripts/generate-youtube-metadata.mjs` now include `playlist_key`, `playlistKey` and a `playlist` object.
- `npm run check:youtube-playlist-naming` is the cheap regression test for playlist naming and regional-variant routing. It blocks accidental collapse of `ES`/`ES-419`, `PT`/`PT-BR` and `EN`/`EN-GB` target playlists, verifies that their titles stay distinct, verifies that shared target-language families resolve to one physical channel path (`ES/ES-419 -> es`, `PT/PT-BR -> pt`, `EN/EN-GB -> en`), and checks the playlist registry for duplicate keys with conflicting meanings. This path sharing is not permission to dispatch duplicate support/native rows; support/native rows remain canonicalized to `ES-419`, `PT-BR` and `EN`.
- `npm run check:youtube-metadata` warns on historical metadata without `playlist_key`, but blocks a present mismatched key.
- `npm run check:youtube-seo-metadata -- outputs/video-generator --output=outputs/video-generator/youtube-seo-metadata-report.json` is the SEO/readiness gate for fresh build and publish workflows. It blocks structural metadata risks and writes a non-secret report with quality warnings.
- `npm run generate:youtube-thumbnails -- outputs/video-generator --confirm-spend --concurrency=2` and `npm run check:youtube-thumbnails -- outputs/video-generator --output=outputs/video-generator/youtube-thumbnail-report.json` are now the custom thumbnail path before publish. Thumbnail generation spends VectorEngine image credits and must stay behind an explicit confirmation gate. VectorEngine image calls support controlled parallelism; default thumbnail concurrency is 2 unless overridden by `thumbnail_concurrency` in GitHub or `VECTORENGINE_IMAGE_CONCURRENCY`.
- `npm run plan:youtube-generation-targets -- --set <set_id> --support RU[,EN] [--targets ES,IT] --output=<file>` is the cheap pre-generation guard. It checks the durable publication registry before expensive video rendering, metadata or thumbnail generation. Active `setId + supportLang + targetLang` rows are excluded. `--allow-republish` remains available only for non-apply diagnostics/render planning; every live apply path rejects it.
- Deterministic sharding remains available for plan/render-only work. Live apply requires `worker_count=1`, `worker_index=0` and exactly one support channel per run; scale comes from up to 20 different support channels in parallel. `npm run check:youtube-run-isolation` remains a fail-closed metadata ownership check before scheduling, thumbnail work or upload.
- `npm run plan:youtube-publish -- <metadata-file-or-dir> [--write-registry] [--allow-playlist-create]` produces a dry-run report under `outputs/youtube-publish-plan-*.json`, estimates quota, resolves channel/playlist assignment and can add missing planned playlist entries locally.
- `config/youtube-publish-schedule-policy.json` is the per-support-language publication policy, and `config/youtube-publish-calendar.json` is the durable global reservation calendar across all 51 configured public support/native channels. The policy assigns each channel an IANA timezone and six default local slots per channel (`08:30`, `11:30`, `14:30`, `17:30`, `20:30`, `23:30`). The calendar stores non-secret `setId + supportLang + targetLang + channelKey + publishAt` reservations so later runs continue from already planned slots instead of starting again at the first slot. Accepted starting cadence is therefore **6 public releases per channel per local day**, not immediate public release after upload. A single ordinary support/native channel receives about 53 target videos per full 54-variant deck and clears in about 9 local days at 6/day. Shared `en`/`es`/`pt` channels do not receive a second regional support backlog; their secondary regional variants remain target/studied only. Since all 51 channels are already configured, the correct first production shape is one deck across all 51 canonical support/native channels, not one channel at a time. The safety limit is deck-wave depth and per-channel cadence: do not start many decks at once or bypass schedule/readback; run one-deck/all-channels waves, then watch 24h/72h/7d metrics plus policy health before adding the next deck wave or raising cadence. If the first waves stay healthy, the next review point may consider 8-12 public releases/day/channel, but that is not the starting plan.
- Scale reality: GitHub workers speed up generation/upload preparation, not YouTube policy or API limits. The deck layer has 54 language variants, but the YouTube support/native layer has 51 canonical support codes because `EN-GB`, `ES` and `PT` are target/studied only. For one full ordinary deck wave, the support/native matrix is `51 * 53 = 2,703` possible `support -> target` videos. Across 180 decks this is `486,540` videos. At 6 public releases/day/channel, one full deck clears each channel in about 9 days. Treat this as staged one-deck/all-channels waves, not all decks at once. Use performance evidence to decide the next deck wave and whether to raise per-channel cadence.
- API quota reality: YouTube's Data API has a default `videos.insert` daily bucket, and YouTube Help also states channels have a daily upload limit across Studio, mobile and API. A 5-worker test for one support channel and one deck should stay below the default upload bucket, but multi-channel apply waves must count expected `videos.insert`, `thumbnails.set`, playlist and readback calls before launch.
- Four-project upload routing is documented in [YouTube API Project Routing](youtube-api-project-routing.md) and mirrored by `config/youtube-api-project-routing.json`. The route names are `youtube 1`, `youtube 2`, `youtube 3` and `youtube 4`; they assign the 51 public support/native channels as `12`, `13`, `13` and `13` canonical support-code route groups with planned daily releases `72 + 78 + 78 + 78 = 306` at six releases per channel. This is a support-channel routing contract, not target-language routing and not a secret store. A live upload workflow must choose the route-specific OAuth bundle/GitHub environment from the support channel, verify token `channelId` by API readback, and stop the affected route on `quotaExceeded` rather than silently moving a channel to another project. Bulk GitHub dispatch must filter shared regional support duplicates before launch and should keep at most one active child run per API route by default (`max_active_per_route=1`) so a route quota failure is detected before more same-route uploads are launched.
- `npm run plan:youtube-publish-schedule -- <metadata-file-or-dir> [--start-date=YYYY-MM-DD] [--limit=50] [--limit-per-channel=50] [--write-metadata] [--write-calendar]` is the shared ordinary/Polyglot slot allocator and performs no YouTube writes. With `--write-metadata`, it writes `privacyStatus=private`, `publishAt`, `scheduledPublishAt` and analytics checkpoints; with `--write-calendar`, it upserts the typed reservation. Apply uses one channel worker and passes `--fill-earliest --reschedule-past-reservations --min-future-minutes=90`; target-plan ordering remains useful for deterministic plan/render output but is not a concurrency substitute.
- `npm run plan:youtube-analytics-readback` reads `config/youtube-published-videos.json` and produces a checkpoint plan for YouTube Analytics/Data API readback. Default checkpoints are 24h, 72h, 7d and 30d after `publishAt`/upload time. This is how publication-time statistics are tracked without treating fresh-zero analytics as final data.
- `npm run read:youtube-video-statistics -- --fetch --confirm-youtube-read --due-only` is the current read-only statistics collector. It calls YouTube Data API `videos.list` for due checkpoints, verifies the video channel id, and writes cumulative view/like/comment snapshots to `outputs/youtube-video-statistics-*.json` plus `outputs/youtube-video-statistics-ledger.jsonl`. This is enough to compare publication-time performance over 24h/72h/7d/30d. Watch-time and retention metrics require a later YouTube Analytics API `reports.query` scope/check if needed.
- `npm run apply:youtube-publish -- --metadata=<youtube_metadata.json> [--video=<mp4>] [--thumbnail=<image>] [--create-playlist]` is dry-run by default. Live YouTube writes require `--apply --confirm-youtube-write` plus `--publication-control-report=<file>` from a healthy strict authenticated readback no older than 30 minutes for the same set/support. Public writes additionally require `--confirm-public`; scheduled uploads use `privacy=private` plus the shared planner's future `publishAt`.
- The uploader uses the official YouTube Data API only: pre-upload `channels.list(mine=true)` token/channel verification, resumable `videos.insert`, optional `thumbnails.set`, optional `playlists.insert`, `playlistItems.insert`, post-upload `videos.list` readback with `snippet.channelId` equality check, and JSONL append to `outputs/youtube-publish-ledger.jsonl`. Missing playlists are created as `public` for immediate public uploads and for scheduled uploads that will become public at `publishAt`; otherwise they are created as `unlisted`. Because YouTube has no separate API field for hashtags, the uploader appends the first 3 normalized `metadata.hashtags` to the upload description when they are not already present.
- `config/youtube-published-videos.json` is the committed durable publication/readback registry. GitHub artifacts and `outputs/youtube-publish-ledger.jsonl` are raw per-run evidence, but not long-term source of truth because `outputs/` is gitignored and workflow artifacts expire.
- GitHub apply runs must persist both direct upload ledger/config state and live-audit duplicate-guard rows. `outputs/youtube-live-publications-github.json` is included in the publish artifact, and `scripts/merge-youtube-publish-state.mjs` merges its registry-compatible `live_youtube_upload_detected` rows into `config/youtube-published-videos.json`. This is required when a previous run uploaded a video but failed before durable state was committed; do not reupload those pairs blindly. If a dispatcher dry-run still selects videos known from live readback, run `.github/workflows/youtube-live-publication-audit.yml` before any new upload wave. That workflow scans support-channel uploads playlists, writes `outputs/youtube-live-publications-github.json`, and can persist the missing live rows without rendering, uploading, playlist writes or thumbnail generation. The merge path accepts both the historical `outputs/...` artifact layout and the root-level layout produced by `actions/download-artifact`, so `mode=persist` must not silently skip a valid audit artifact.
- 2026-06-30 ordinary live-audit safety rule: the uploads-playlist audit treats top-level `publications` as the only persist-safe blocklist. `supportReports[].matchedPublications` may include diagnostic matches that must not be merged automatically, including multi-target `langs=...` URLs from Polyglot/bundle videos, ambiguous rows on shared physical channels (`EN/EN-GB`, `ES/ES-419`, `PT/PT-BR`) when the public support path is collapsed to `/en`, `/es` or `/pt`, and duplicate live videos for an assignment that already has a different active local `youtubeVideoId`. If a live video id already exists in `config/youtube-published-videos.json`, the audit preserves that registry support/target assignment; otherwise ambiguous or duplicate assignment rows require manual artifact/history review before durable persistence.
- `npm run update:youtube-visibility -- --video-id=<id> --support=<RU> [--playlist-id=<id>] --privacy=public --apply --confirm-youtube-write --confirm-public` updates an already uploaded video and optional playlist through the official YouTube Data API without re-rendering or uploading a duplicate.
- Smoke proof on 2026-06-20 used the historical EN->ES first-deck test metadata: `npm run check:youtube-metadata` passed with only the expected historical missing-`playlist_key` warning; `npm run plan:youtube-publish -- ... --write-registry --allow-playlist-create` added planned playlist `EN__ES__ordinary-vocabulary__a1-everyday`; uploader dry-run resolved channel `en`, video path and estimated 1700 quota units without live YouTube writes.
- 2026-06-21 GitHub upload workflow: `.github/workflows/youtube-video-publish.yml` is the manual GitHub Actions entrypoint for generation-target preflight + metadata/video/schedule/thumbnail prep + playlist plan + optional YouTube upload. `mode=plan` builds/validates only and uploads non-secret artifacts without restoring OAuth or pushing state. Before expensive work, `plan:youtube-generation-targets` writes `outputs/video-generator/youtube-generation-targets-github.json` and skips pairs already covered by active publications. For eligible pairs, AI metadata is generated and validated first; only a valid complete batch allows render/TTS to start. Scheduled assignment and thumbnail handling then run before SEO, publication-plan and upload gates. Ordinary AI metadata is sequential by batch rather than per-target concurrency: up to 10 target-video tasks share one `generateContent` request, with a 15-second pause only when another batch is required. Thumbnail generation remains independently bounded and requires its explicit spend confirmation. All duplicate, schedule, AI-metadata, TTS/video, SEO and publication-plan gates must pass before YouTube upload. Apply restores route OAuth, requires explicit YouTube/public confirmations, uses the shared calendar for scheduled uploads and persists non-secret state through the artifact-backed job. A child failure after upload must keep partial durable state; a failure before upload must not be described as a YouTube upload.
- 2026-06-28 bulk ordinary dispatch contour: `.github/workflows/youtube-bulk-publish-dispatcher.yml` and `npm run dispatch:youtube-bulk-publish` are the source of truth for launching a broad ordinary-video wave through the existing `.github/workflows/youtube-video-publish.yml` workflow. The dispatcher is dry-run by default and writes `outputs/youtube-bulk-publish-dispatcher-report.json`; live dispatch requires `mode=dispatch`, `confirm_dispatch=DISPATCH_YOUTUBE_BULK`, `confirm_youtube_write=APPLY_YOUTUBE_UPLOAD`, `--schedule-start-date=YYYY-MM-DD`, and, when thumbnails are enabled, `confirm_thumbnail_spend=GENERATE_THUMBNAILS`. It selects the next `targets_per_support` eligible target languages per support channel from the current publication registry with `allow_republish=false`, so already active `setId + supportLang + targetLang` rows are skipped before any expensive render, metadata, thumbnail or upload workflow is started. Before live dispatch, the support list must be canonicalized to one support/native variant per viewer language: use `EN`, `ES-419`, `PT-BR`, and the one-code channels; never launch `EN-GB`, `ES` or `PT` as support rows. Route selectors or explicit comma-separated support codes must be reviewed for this before `mode=apply`. Since 2026-07-08, ordinary planners also skip same-viewer-language regional target pairs on canonical support channels: `EN -> EN-GB`, `ES-419 -> ES`, `PT-BR -> PT`, plus exact self-target pairs. Regional target variants remain valid for other support languages, for example `PL -> EN-GB`, `RU -> ES`, `RU -> ES-419`, `RU -> PT` and `RU -> PT-BR`. `max_parallel` may be up to 20; dispatch id assignment is serialized internally so concurrent GitHub runs are not mis-attributed, while run watching remains parallel. After watching a child run, the dispatcher always performs final `gh run view` readback and records `actualConclusion`, so a transient `gh run watch` failure is not counted as a failed upload when GitHub later concludes `success`. If the ordinary workflow succeeds but its preflight selects zero targets (`eligibleTargetCount=0` / `shardSelectedTargetCount=0`), the dispatcher reports `skipped_no_eligible` instead of counting it as an uploaded video. On `quotaExceeded`, `uploadLimitExceeded`, metadata language/URL gates or OAuth channel mismatch, the affected route is stopped. On playlist-classified transient failures, the dispatcher never retries a full video upload; if `confirm_playlist_repair=APPLY_YOUTUBE_PLAYLIST_INSERT` is set, it waits `playlist_retry_delay_seconds` and dispatches `.github/workflows/youtube-playlist-insert-repair.yml` for the affected targets only, with per-target repair errors recorded without overwriting the original upload run result. Durable publication state is still produced by the ordinary workflow persist job; the dispatcher report is operational evidence, not the publication registry.
- 2026-07-07 ordinary scheduled-batch recovery note: if child runs upload successfully but `persist-publish-state` cannot push because sibling child runs changed the branch, recover the `youtube-video-publish-apply-...` artifacts with `scripts/merge-youtube-publish-state.mjs` before dispatching dependent batches. The 2026-07-07 branch recovery merged 8 post-upload rows without reuploading. `PL->EN-GB` in that batch was a true pre-upload render/TTS failure (`edge-tts NoAudioReceived` on removed voice `pl-PL-AgnieszkaNeural`), not a state recovery case. On 2026-07-08 live `edge-tts 7.2.8` readback showed only `pl-PL-ZofiaNeural` and `pl-PL-MarekNeural`; `Zofia` and `Marek` synthesis smoke passed, and `scripts/lib/tts-voice-map.mjs` now maps `PL` to `edge_pl-PL-ZofiaNeural`. Retrying the failed PL targets still needs explicit publish approval.
- 2026-07-07 route-1 partial retry audit: the approved retry of 20 missing pairs for `EN`, `ES-419`, `PT-BR` and `ZH` launched without watch and all 8 child runs completed `failure`. Three child runs uploaded exactly one video each before `youtube.quota/quotaExceeded` stopped post-upload thumbnail/playlist work and persisted active partial rows: `EN->ES-419` (`Hnf-H2z-Zd4`, thumbnail missing), `ES-419->ET` (`rBlcS77TkOM`, playlist insert pending and thumbnail missing) and `PT-BR->HI` (`3p5h4JCo4Oc`, thumbnail missing). Do not retry these three as video uploads; use `.github/workflows/youtube-thumbnail-batch-set.yml` for thumbnails and `.github/workflows/youtube-playlist-insert-repair.yml` for `ES-419->ET` playlist insertion after explicit approval. `scripts/youtube-repair-playlist-insert.mjs` ignores inactive `deleted_duplicate` rows when selecting repair candidates, because old deleted rows may lack `playlistItemId` and must not make the active pending row ambiguous. The other 17 requested pairs remain missing active publications; HR pairs are render failures (`lesson_hr_*.mp4` missing/too small), and ZH grouped/isolated retries are SEO-title blockers. Any live repair still spends YouTube API quota and needs explicit approval.
- 2026-07-07 scheduled-batch preflight failure: the follow-up ordinary dispatcher run was launched with `publish_mode=scheduled` but without `schedule_start_date`, so GitHub created 17 child `youtube-video-publish.yml` runs and every run failed at the initial `Refuse unsafe broad publish inputs` guard before checkout/build/render/TTS/thumbnail/upload. No external generation or YouTube write quotas were spent. The dispatcher now refuses scheduled dry-run/apply locally unless `--schedule-start-date=YYYY-MM-DD` is provided. Fresh local dry-run after registry advancement and the pre-rendered-cover workflow fix uses `--schedule-start-date=2026-07-08`, `--no-generate-thumbnails`, canonical support rows and no watch/dispatch. It selects `13` scheduled videos: `EN->CS`, `ES-419->CS`, `JA->SW`, `NO->TH`, `PT-BR->ES-419`, `RO->TE`, `RU->TE`, `SK->SW`, `SV->SW`, `TH->SW`, `TR->TA`, `VI->PT`, `ZH->SV`. `8` selected pairs have approved custom covers (`EN`, `ES-419`, `JA`, `PT-BR`, `RU`, `TH`, `TR`, `VI`); `5` pairs are on channels whose `customThumbnailUploadAllowed=false` and will use explicit YouTube auto thumbnail fallback (`NO`, `RO`, `SK`, `SV`, `ZH`). Estimated maximum YouTube quota is `22,300` units: `12,050` on route `youtube-1` and `10,250` on route `youtube-2`. This remains preflight only until the user explicitly approves apply.
- The `22,300` estimate above is historical evidence produced by the pre-June-2026 `1600 units/videos.insert` model. Current preflights must use the granular quota model: count video upload calls separately and count playlist/thumbnail/delete writes in the general unit pool.
- 2026-07-08 second-deck pre-rendered cover handoff: `scripts/copy-pre-rendered-thumbnails.mjs` now loads the approved ordinary manifest for `home_kitchen_cooking_actions_a1_a2` by default, in addition to the first-deck ordinary and Polyglot manifests. GitHub publish runs for the second deck can therefore copy committed pre-rendered JPGs for custom-thumbnail-enabled channels without VectorEngine image generation when `generate_thumbnails=false`. The manifest alone is not enough: the exact planned JPG/sidecar files must also be tracked in git before dispatch, because GitHub runners cannot see local-only thumbnail files.
- 2026-07-08 second-deck offline-data requirement: the first route-2/3/4 apply dispatch for `home_kitchen_cooking_actions_a1_a2` failed before YouTube upload because clean GitHub runners do not run the local Postgres database at `127.0.0.1:55433`. `scripts/export-deck-data.mjs` now exports the current all-language offline deck JSON shape locally, including `courseMetadata`, `titles`, `descriptions`, `levelSignals` and all support/target card combinations. Commit `data/decks/home_kitchen_cooking_actions_a1_a2.json` before any GitHub render/upload dispatch for the second deck unless `data/deck-sources.json` has a verified Drive file id for the same JSON. A dry-run with `DATABASE_URL=postgresql://bad` must still select the expected route targets from the offline JSON.
- 2026-07-08 second-deck thumbnail fallback correction: `copy-pre-rendered-thumbnails` treats only explicit `customThumbnailUploadAllowed=true` channels as strict-custom channels. Missing/undefined custom-thumbnail status must fall back to `thumbnailUploadMode=first_frame_auto`, matching the operating rule "upload custom covers where they exist"; it must not fail an upload solely because no pre-rendered cover exists for a non-confirmed custom-thumbnail channel.
- 2026-07-09 playlist-cover local proof batch: square `1:1` playlist cover bases are separate from 16:9 video thumbnails. The accepted universal no-text base is `outputs/design-prototypes/youtube-playlist-cover-universal-language-learning-base-ai-20260709/base-no-text-universal-v1-1024.jpg`. Deterministic localized overlay generation uses `scripts/generate-youtube-playlist-covers.swift` because macOS CoreText handles Thai/Myanmar/Devanagari shaping more reliably than the fallback PIL prototype `scripts/generate-youtube-playlist-covers.py`. The current local batch is `outputs/design-prototypes/youtube-playlist-covers-upload-eligible-20260709-coretext/`: `594` rendered playlist covers across the currently custom-thumbnail-confirmed channel keys `en`, `es`, `ja`, `my`, `ne`, `pt`, `ru`, `sr`, `sw`, `th`, `tr` and `vi`; `562` records have a `youtube_playlist_id` and are upload-ready from a data-shape perspective, while `32` are local-only until the registry receives a YouTube playlist id. No YouTube API writes, playlist image uploads, VectorEngine calls or paid image generation were performed by this local proof batch. Root manifest: `outputs/design-prototypes/youtube-playlist-covers-upload-eligible-20260709-coretext/manifest.json`; root visual review sheet: `outputs/design-prototypes/youtube-playlist-covers-upload-eligible-20260709-coretext/contact-sheet.jpg`.
- 2026-07-13 UZ/SI/KA deterministic cover batch: the approved bases and local overlay renderer produced `342` video JPGs for both active decks (`318` ordinary + `24` full Polyglot) and `162` square playlist JPGs (`54` per support). The publication snapshot reports `134` playlist rows with a durable playlist ID (`UZ 45`, `SI 46`, `KA 43`) and `28` prepared rows that still require read-only playlist discovery (`UZ 9`, `SI 8`, `KA 11`). `scripts/reconcile-youtube-playlist-registry-from-snapshot.mjs` records those missing pairs as planned rows backed by exact live source video IDs; it does not call YouTube or authorize playlist creation. `scripts/youtube-upload-playlist-images.mjs` can use a playlist ID discovered later in the durable registry, but apply fails on ID disagreement or an untracked JPG. The exact playlist payload is now `162/162` Git-tracked in this change; no GitHub apply or YouTube image upload was dispatched, and every future write still needs separate approval.
- 2026-07-14 metadata batching correction: future bulk ordinary dispatch uses `metadata_gemini_backend=openai,api,vectorengine`, sequential metadata batches, `metadata_batch_size=5` and `metadata_rate_limit_ms=15000`; mixed campaign metadata uses the same chain. OpenAI requires `USE_OPENAI_METADATA`, sends up to 5 tasks through Responses Structured Outputs and records actual service tier plus token usage. The four campaign metadata routes use `max-parallel: 1` so shared provider secrets receive no simultaneous route bursts; upload concurrency remains separate and unchanged. After OpenAI, direct Google order is primary `GEMINI_API_KEY` (or legacy `GOOGLE_API_KEY` alias), then `GEMINI_API_KEY_2` for quota/permission, response-integrity, timeout, network or HTTP 5xx failure. Only after both direct keys fail may the explicitly confirmed VectorEngine fallback run; it splits the logical batch into provider sub-batches of at most `2` (`2+2+1` for five), validates exact IDs after every call and after the ordered merge. Response-integrity includes non-`STOP` finish reason, malformed/truncated JSON and an incomplete exact request-ID set. Google ordinary and mixed-campaign batch requests use `maxOutputTokens=60000` under the `gemini-3.5-flash` model limit `65536`; large structured responses receive `600000 ms`, while prompt-level copy limits prevent intentional verbosity. Production batch size `10` is disabled because run `29323860280` exhausted the output limit on both direct keys and then received truncated VectorEngine JSON. A production-shaped live canary on 2026-07-14 proved one complete VectorEngine call for two metadata tasks, with exact IDs and no retry, but took about four minutes; VectorEngine therefore remains fallback-only. The configured chain can never fall through to Gemini CLI; no provider receives a blind same-key retry. Campaign batches write atomic checkpoints and upload route artifacts even after later failure. A separately approved recovery can reuse exact validated completed batches only when campaign/hash/route/batch ownership matches; no retry or dispatch is automatic. Polyglot uses the same provider order for its single metadata task. Apply remains fail-closed before render/TTS/upload if the chain or per-item language/SEO gates fail.
- The OpenAI-first order is enforced in mixed campaigns and future ordinary/Polyglot bulk publish. Legacy compile/test and playlist-repair workflows retain their existing Google-first behavior until they receive a separate tested OpenAI migration; every VectorEngine path still requires `confirm_vectorengine_metadata=USE_VECTORENGINE_METADATA`.
- 2026-07-10 GitHub `workflow_dispatch` input limit: `youtube-video-publish.yml` must declare no more than 25 inputs. Metadata concurrency is fixed at `1`, thumbnail concurrency at `2`, and the schedule policy/calendar paths are fixed to their canonical `config/youtube-*` files inside the workflow. The bulk dispatcher must not send removed or empty optional inputs. An HTTP 422 workflow-parse rejection means no workflow run was created and no provider or YouTube quota was spent.
- 2026-07-09 playlist-image upload canary: `scripts/youtube-upload-playlist-images.mjs` is the local fail-closed helper for YouTube Data API `playlistImages` writes. Dry-run is default; live writes require `--apply --confirm-youtube-write`. The API list filter is `parent=<youtube_playlist_id>`, and the upload resource must include `snippet.type="hero"` plus `snippet.playlistId`. Canary uploads succeeded on route `youtube-4` for `NE__AZ__ordinary-vocabulary__a1-everyday` (`PLzHdIxZgrAa3rcwxxUDcc4SlZY8lOmIYR`, playlist image id `PLzHdIxZgrAa3rcwxxUDcc4SlZY8lOmIYR.1`) and `SW__AZ__ordinary-vocabulary__a1-everyday` (`PL-Si0pQz2zY3sw6Ist9A0AwWja926ner6`, playlist image id `PL-Si0pQz2zY3sw6Ist9A0AwWja926ner6.1`). Reports are under `outputs/youtube-playlist-image-upload-canary-20260709/`, and successful readback wrote `playlistImage` metadata into `config/youtube-playlists.json`. Route `youtube-3` canaries for `MY` and `SR` did not reach a YouTube playlist-image write locally because the available `.local/youtube-oauth/google-oauth-client.json` is the route-4 client `215536805171-...`; route-3 tokens require the route-3 OAuth client `1076963270652-...` or a GitHub runner that restores the `youtube-api-youtube-3` environment bundle. Do not retry `MY`/`SR` locally with the route-4 client; it fails at token refresh with `unauthorized_client` before any write.
- 2026-07-09 playlist-image route-4 follow-up batch: after adding `--skip-uploaded`, local dry-run for all currently playlist-cover-enabled channels (`en`, `es`, `pt`, `ru`, `ja`, `tr`, `th`, `vi`, `my`, `sr`, `ne`, `sw`) selected `60` not-yet-uploaded playlist-image candidates at `5` per channel, estimated `3120` quota units with readback. Only route `youtube-4` could be applied locally with the currently present OAuth client; live apply uploaded `10` more playlist images: `NE__BG`, `NE__BN`, `NE__CS`, `NE__DA`, `NE__DE`, `SW__BG`, `SW__BN`, `SW__CS`, `SW__DA` and `SW__DE` ordinary A1 playlist covers. Report: `outputs/youtube-playlist-image-upload-batch-20260709/playlist-image-upload-apply-2026-07-09T02-48-24-390Z.json`. Routes `youtube-1`, `youtube-2` and `youtube-3` still need their matching OAuth clients locally, or a committed GitHub workflow that restores the matching route environment bundle, before playlist-image upload can be applied safely there. Extra local probes for `EN` (`youtube-1`), `TH` (`youtube-2`) and `MY` (`youtube-3`) all stopped at OAuth refresh with `unauthorized_client` before any playlist-image write, confirming that the current local route-4 client cannot be reused for those routes.
- 2026-07-09 playlist-image route-4 quota tail: user-approved route-4 continuation ran until YouTube returned `youtube.quota/quotaExceeded`. Current playlist-image registry state is `NE 45/45` uploaded and `SW 16/44` uploaded; the failing row was `SW__IT__ordinary-vocabulary__a1-everyday`, and `28` SW playlist covers remain planned for the next quota window. Reports: `outputs/youtube-playlist-image-upload-route4-20260709/playlist-image-upload-apply-2026-07-09T02-56-23-419Z.json` (first partial, stopped on delayed readback), `outputs/youtube-playlist-image-upload-route4-20260709/playlist-image-upload-apply-2026-07-09T02-59-23-975Z.json` (reconciled delayed `NE__FI` as existing readback), and `outputs/youtube-playlist-image-upload-route4-20260709/playlist-image-upload-apply-2026-07-09T02-59-42-872Z.json` (43 additional uploaded, then quota stop). `scripts/youtube-upload-playlist-images.mjs` now retries playlist-image readback and records an already-visible existing playlist image as `method=existing_readback` instead of attempting an unsupported media update.
- 2026-07-09 GitHub playlist-image upload contour: `.github/workflows/youtube-playlist-image-upload.yml` restores the route-specific `YOUTUBE_OAUTH_BUNDLE_TGZ_B64`, validates that the requested supports belong to one route, runs `scripts/youtube-upload-playlist-images.mjs`, uploads non-secret reports and commits `config/youtube-playlists.json` after successful apply. The first tracked GitHub payload for routes `youtube-1`, `youtube-2` and `youtube-3` is `data/youtube-playlist-covers/20260709-routes-1-2-3-five-per-channel/manifest.json` plus 50 JPGs (`5` per channel for `en`, `es`, `pt`, `ru`, `ja`, `tr`, `th`, `vi`, `my`, `sr`, about `19M`). Local dry-run against this manifest selected `50` planned uploads, estimated `2600` quota units. Dispatch apply runs separately by route with `confirm_youtube_write=APPLY_YOUTUBE_PLAYLIST_IMAGES`: `youtube-1` supports `en,es,pt,ru,ja,tr`; `youtube-2` supports `th,vi`; `youtube-3` supports `my,sr`. Do not include `ne,sw` in this GitHub payload; route `youtube-4` is quota-stopped locally until the next quota window and has a separate 28-cover SW tail.
- 2026-07-09 GitHub playlist-image apply status: the new workflow file itself is not dispatchable until it exists on the default branch, so the branch temporarily routes playlist-image uploads through the existing default-visible `.github/workflows/youtube-playlist-metadata-repair.yml` carrier when `confirm_youtube_write=APPLY_YOUTUBE_PLAYLIST_IMAGES`. GitHub run `28991665621` (`youtube-3`, `my,sr`) succeeded and committed `3b468c3e`, adding `5` playlist images each for `MY` and `SR`. GitHub run `28991737175` (`youtube-2`, `th,vi`) succeeded and committed `8fe56ff0`, adding `5` playlist images each for `TH` and `VI`. GitHub run `28992146152` (`youtube-1`, `en,es,pt,ru,ja,tr`) failed before any playlist-image state commit with `youtube.quota/quotaExceeded`; those `30` route-1 playlist covers remain planned, estimated `1560` quota units after quota reset.
- 2026-07-09 GitHub playlist-image second route-2/3 batch: tracked payload `data/youtube-playlist-covers/20260709-routes-2-3-second-five-per-channel/manifest.json` added the next `5` not-yet-uploaded covers per channel for `TH`, `VI`, `MY` and `SR`: `DE`, `EN`, `EN-GB`, `ES` and `ES-419`. GitHub run `28993306289` (`youtube-2`, `th,vi`) succeeded and committed `1aa1e9c`, adding `10` playlist images. GitHub run `28993306032` (`youtube-3`, `my,sr`) successfully uploaded `10` playlist images, then failed only at `git push` because the route-2 commit had advanced the branch; the non-secret artifact state was merged manually and committed as `73ace250`. Current durable playlist-image counts are `TH 10`, `VI 10`, `MY 10`, `SR 10`.
- 2026-07-09 GitHub playlist-image third route-2/3 batch: tracked payload `data/youtube-playlist-covers/20260709-routes-2-3-third-five-per-channel/manifest.json` added the next `5` covers per channel for `TH`, `VI`, `MY` and `SR`: `ET`, `FI`, `FR`, `HI` and `HR`. GitHub run `28993847296` (`youtube-2`, `th,vi`) succeeded after waiting in the GitHub queue and committed `1b0dcbac`, adding `10` playlist images. GitHub run `28994320956` (`youtube-3`, `my,sr`) succeeded and committed `d219576d`, adding `10` playlist images. Current durable playlist-image counts are `TH 15/46`, `VI 15/46`, `MY 15/43`, `SR 15/45`. A post-batch dry-run still selects the next `20` route-2/3 candidates, estimated `1040` quota units.
- 2026-07-09 GitHub playlist-image fourth route-2/3 batch: tracked payload `data/youtube-playlist-covers/20260709-routes-2-3-fourth-five-per-channel/manifest.json` added the next `5` covers per channel for `TH`, `VI`, `MY` and `SR`: `TH/VI/SR` received `HU`, `HY`, `ID`, `IS`, `IT`; `MY` received `HU`, `ID`, `IS`, `IT`, `JA` because `MY__HY` is not upload-ready in the current playlist-cover manifest. GitHub run `28995466084` (`youtube-2`, `th,vi`) succeeded and committed `1334aa19`, adding `10` playlist images. GitHub run `28995957332` (`youtube-3`, `my,sr`) succeeded and committed `1f09a33a`, adding `10` playlist images. Current durable playlist-image counts are `TH 20/46`, `VI 20/46`, `MY 20/43`, `SR 20/45`. A post-batch dry-run still selects the next `20` route-2/3 candidates, estimated `1040` quota units.
- 2026-07-09 GitHub playlist-image fifth route-2/3 batch: tracked payload `data/youtube-playlist-covers/20260709-routes-2-3-fifth-five-per-channel/manifest.json` added the next `5` covers per channel for `TH`, `VI`, `MY` and `SR`: `TH/VI` received `JA`, `KA`, `KK`, `KM`, `KN`; `SR` received `JA`, `KA`, `KK`, `KM`, `KN`; `MY` received `KA`, `KN`, `KO`, `LO`, `LT`. GitHub run `28996743129` (`youtube-2`, `th,vi`) succeeded and committed `10e108b6`, adding `10` playlist images. GitHub run `28996866620` (`youtube-3`, `my,sr`) succeeded and committed `1a9c367b`, adding `10` playlist images. Current durable playlist-image counts are `TH 25/46`, `VI 25/46`, `MY 25/43`, `SR 25/45`. A post-batch dry-run still selects the next `20` route-2/3 candidates, estimated `1040` quota units.
- 2026-07-09 GitHub playlist-image sixth/seventh route-safe batches: tracked payloads `data/youtube-playlist-covers/20260709-route-safe-sixth-ten-per-channel/manifest.json` and `data/youtube-playlist-covers/20260709-route-safe-seventh-ten-per-channel/manifest.json` moved playlist-image uploads onto all currently upload-enabled routes. Sixth-batch runs uploaded `90` total images: `29004051247` (`youtube-1`, `40`), `29005005551` (`youtube-2`, `20`, state recovered from artifact after commit/push race), `29005418430` (`youtube-3`, `20`, state recovered from artifact after commit/push race), and `29005736129` (`youtube-4`, `10`). Seventh-batch runs uploaded `88` total images: `29006066323` (`youtube-1`, `40`), `29007714705` (`youtube-2`, `20`), `29008225942` (`youtube-3`, `18`, state recovered from artifact after commit/push race), and `29009080408` (`youtube-4`, `10`). Durable counts after seventh were `EN 20/46`, `RU 20/44`, `JA 20/45`, `TR 20/42`, `TH 45/46`, `VI 45/46`, `MY 43/43`, `SR 45/45`, `NE 45/45`, `SW 36/44`.
- 2026-07-09 GitHub playlist-image eighth route-safe batch: tracked payload `data/youtube-playlist-covers/20260709-route-safe-eighth-ten-per-channel/manifest.json` uploaded all remaining non-route-1 playlist covers plus another route-1 slice. GitHub run `29009640291` (`youtube-1`, `en,ru,ja,tr`) uploaded `40`; run `29010561152` (`youtube-2`, `th,vi`) uploaded the final `2`; run `29011669051` (`youtube-4`, `ne,sw`) uploaded the final `8`. Durable counts after eighth were `EN 30/46`, `RU 30/44`, `JA 30/45`, `TR 30/42`, `TH 46/46`, `VI 46/46`, `MY 43/43`, `SR 45/45`, `NE 45/45`, `SW 44/44`; routes `youtube-2`, `youtube-3` and `youtube-4` were fully closed for this playlist-cover batch.
- 2026-07-09 GitHub playlist-image ninth route-1 quota stop: tracked payload `data/youtube-playlist-covers/20260709-route-safe-ninth-ten-per-channel/manifest.json` planned `40` more route-1 uploads (`10` each for `EN`, `JA`, `RU`, `TR`). GitHub run `29012089103` uploaded `33` images (`EN 10`, `JA 10`, `RU 10`, `TR 3`) and then stopped on `youtube.quota/quotaExceeded` while reading `TR__SV__ordinary-vocabulary__a1-everyday`; the successful partial state was recovered from artifact `youtube-playlist-image-upload-youtube-1-29012089103` and committed as `a1530050`. Current durable playlist-image counts are `EN 40/46`, `RU 40/44`, `JA 40/45`, `TR 33/42`, `TH 46/46`, `VI 46/46`, `MY 43/43`, `SR 45/45`, `NE 45/45`, `SW 44/44`. Post-recovery dry-run `outputs/youtube-playlist-image-upload-route-safe-all-after-ninth-recovery/playlist-image-upload-plan-2026-07-09T10-42-04-752Z.json` still selects `35` route-1 candidates, estimated `1820` quota units; do not retry route `youtube-1` until its YouTube quota resets. The current carrier workflow `.github/workflows/youtube-playlist-metadata-repair.yml` is still pointed at the ninth payload and must be repointed before the next new payload.
- 2026-07-07 canonical support guard: `scripts/plan-youtube-generation-targets.mjs`, `scripts/plan-polyglot-youtube-publish.mjs`, `scripts/dispatch-youtube-bulk-publish.mjs` and `scripts/dispatch-youtube-polyglot-bulk-publish.mjs` fail before render/TTS/thumbnail/upload if a new publish plan tries to use `EN-GB`, `ES` or `PT` as support/native rows. Those codes remain target/studied only.

> [!TIP]
> **Local Developer CLI Dispatcher Hack (Bypassing HTTP 403 API Rate Limit)**:
> Running the dispatcher workflow inside GitHub Actions uses the system `GITHUB_TOKEN` (installation token), which has a strict limit of 1,000 API requests/hour per repository. High-frequency watching and multi-run dispatching can trigger `HTTP 403: API rate limit exceeded for installation`.
> **Solution**: Execute `node scripts/dispatch-youtube-bulk-publish.mjs` directly from the local developer terminal under `gh auth status` (OAuth user token). Developer tokens have a 5,000 requests/hour limit (5x higher). Child workflows (`youtube-video-publish.yml`) are still dispatched to and executed 100% inside GitHub Actions cloud runners, leaving local computer resources completely unburdened while preventing parent dispatcher rate-limit crashes.
- 2026-06-28 offline deck-data fallback: the workflow first checks `data/deck-sources.json` for a Google Drive file id and downloads it into `data/decks/<setId>.json`; if no mapping exists, it uses a committed/local offline deck JSON. The campaign read-only control preflight uses the same Drive resolution before its historical-Git fallback, so its immutable plan and parent apply validate the same downloaded source. The first-deck Drive override is restored after Drive API upload/readback verified `home_kitchen_cookware_pilot_01.json` in folder `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei` as file `1W9tKVQPzvn8ZxZXtVEPPx0VcDaUzfRCF`, with source size `80075842`, Drive size `80075842`, source sha256 `164bd8d1f085b453db6bf3b487da1d4ebb38e7db50fefea1380a6ca34c26b5bc` and manifest `outputs/drive-uploads/home_kitchen_cookware_pilot_01_drive_upload_20260628.json`. Keep the committed JSON as a fallback, but future GitHub runs should now download this verified Drive JSON first.
- 2026-08-02 Deck #4 Drive source handoff: `home_kitchen_small_tools_supplies_a2.json` is verified in the same FlashcardsLuna folder as file `1QWVEcXk9YICokiydzxw3qptky3ChFLBc`; the downloaded file is `55,943,826` bytes with SHA-256 `7a520e3b1c1d55140e5c8670e247506a9d57c2026f91179186e5d5021149e909`. Its exact id is recorded in `data/deck-sources.json`; do not substitute the similarly named Google Sheet `FlashcardsLuna 004 of 180 - Kitchen Small Tools & Supplies`, because the publication workflows require the offline all-language JSON shape.
- 2026-08-02 Deck #4 runner fallback: the same SHA-verified JSON is tracked at `data/decks/home_kitchen_small_tools_supplies_a2.json`, so GitHub uses the exact tracked bytes before attempting the private Drive mapping. This avoids a unauthenticated Drive download and keeps the immutable campaign fingerprint reproducible.
- 2026-06-21 first-deck GitHub canary/apply: plan run `27899137609` on pushed commit `9286549` for `home_kitchen_cookware_pilot_01`, `support=RU`, `langs=ES`, `mode=plan`, `privacy=unlisted`, `create_playlists=true`, `generate_thumbnails=true` and `confirm_thumbnail_spend=GENERATE_THUMBNAILS` passed in `5m22s`; local strict checks over the downloaded artifact passed `check:youtube-thumbnails`, `check:youtube-metadata`, `check:youtube-seo-metadata --require-ai-metadata` with score 100, and `plan:youtube-publish --allow-playlist-create --require-ai-metadata` reported `Publish-ready: 1`. Apply run `27899494910` then passed in `6m28s` with `confirm_youtube_write=APPLY_YOUTUBE_UPLOAD`: OAuth restored, all gates passed, playlist `RU__ES__ordinary-vocabulary__a1-everyday` / `Испанский A1: бытовой словарь` was created as unlisted with id `PLx5nIeqMBQ7kjzCzItWOtLDCjmHJjYJXq`, video `xOh97WAt53k` was uploaded as unlisted to channel `UC1f5EyXEMejXIumH9104GMA` / `@lunacardsru`, thumbnail was set, and playlist item `UEx4NW5JZXFNQlE3a2p6Q3pJdFdPdExEQ2ptSEpqWUpYcS41NkI0NEY2RDEwNTU3Q0M2` was inserted. Artifact/readback path: `outputs/review/youtube-apply-27899494910/`. Public URL probes returned HTTP 200 for `https://www.youtube.com/watch?v=xOh97WAt53k` and `https://www.youtube.com/playlist?list=PLx5nIeqMBQ7kjzCzItWOtLDCjmHJjYJXq`. The local `config/youtube-playlists.json` must be committed/pushed with the new playlist id before later separate runs rely on this playlist. Earlier run `27897570929` on commit `9f9d319` remains historical plumbing evidence only because its metadata fell back to `source=template-ai-fallback`.
- 2026-06-21 first-deck FlashcardsLuna upload state: after the user decided to keep channel names/handles/banners as `LunaCards` but use `FlashcardsLuna` in video-facing copy, GitHub workflow run `27900462868` uploaded RU->ES as `dWk3ncNgrFU` and the user manually made it public. Later run `27901311565` was incorrectly started with `langs=ES,IT` instead of only missing `IT`; because the old workflow did not use `config/youtube-published-videos.json` as a pre-upload idempotency gate, it reuploaded ES as `TMOdF3jl2wQ` and uploaded IT as `TkHEdDbwqRg`. Run `27901311565` passed in `7m25s`, used `privacy=public`, set thumbnails, inserted ES into existing playlist `PLx5nIeqMBQ7kjzCzItWOtLDCjmHJjYJXq`, created IT playlist `PLx5nIeqMBQ7nErSrdTYvIuGmj1hsz1EBo`, and YouTube API readback confirmed both videos `uploaded/public` on channel `UC1f5EyXEMejXIumH9104GMA`. Public URL probes returned HTTP 200 for both videos and the IT playlist. The old ES `dWk3ncNgrFU` is now marked `superseded_by_reupload_pending_user_delete`; the user should delete or hide it manually if it should not remain visible.
- 2026-06-21 ES playlist visibility follow-up: because the ES playlist was reused from an earlier unlisted run, `config/youtube-playlists.json` keeps it as `created_unlisted` with desired privacy `public` and retry-needed status. Visibility-only workflow runs `27901693765` and `27901807080` failed before writing with `YouTube video readback returned no items` for fresh video `TMOdF3jl2wQ`; retry that workflow later instead of rerendering/reuploading ES.

Recommended publication flow:

1. generate video, thumbnail and `youtube_metadata.json`;
2. validate metadata with `scripts/check-youtube-metadata.mjs`;
3. validate language/voice/script/URL with `scripts/check-video-tts-variant-contract.mjs`;
4. validate SEO/readiness with `scripts/check-youtube-seo-metadata.mjs`;
5. upload production video as `public` by default, or as `private` with future `publishAt` when `publish_mode=scheduled` is used; use `private`/`unlisted` without `publishAt` only for explicit canaries, copyright checks or manual pre-publication review;
6. resolve or create playlist by `playlist_key`;
7. add the video to the playlist and read back the uploaded video channel/status;
8. set custom thumbnail only after image/OCR or human visual readback; if the channel returns `youtube.thumbnail/forbidden`, keep the upload/playlist record and mark `needsThumbnailPermission=true` instead of treating the whole publication as missing;
9. write `videoId`, `playlistId`, `playlistItemId`, status, privacy, `publishAt` if scheduled, thumbnail status and readback timestamp to `outputs/youtube-publish-ledger.jsonl`;
10. commit durable readback to `config/youtube-published-videos.json` and summarize it in [Video Lessons Registry](video-lessons-registry.md).

Acceptance gates before any automated YouTube playlist writes:

- dry-run report includes `supportLang`, `targetLang`, `setId` or course release id, `courseFamily`, `levelOrTrack`, computed `playlist_key`, localized playlist title/description and public course URL;
- no duplicate `playlist_key` values with conflicting meanings;
- every generated upload candidate has a playlist assignment or an explicit `playlist_excluded_reason`;
- playlist create/add calls are idempotent and read back the resulting `youtube_playlist_id` / `playlistItemId`;
- quota cost estimate is printed before a batch and the batch can stop before spending quota;
- failures leave a ledger row with status and error, not an ambiguous half-published state;
- `docs/video-lessons-strategy.md`, `docs/video-lessons-registry.md` and `docs/PROJECT_STATE.md` are updated when the workflow contract changes.

Do not rely on `docs/video-lessons-registry.md` alone for playlist automation. That markdown table is useful as a human-readable status ledger, but playlist upload/publish needs a structured JSON/JSONL registry to avoid duplicates and title/localization drift.

### Publication schedule and global calendar

`config/youtube-publish-schedule-policy.json` answers **when a channel is allowed to publish**. `config/youtube-publish-calendar.json` answers **which exact future slots are already reserved**. Both are committed, non-secret files and are part of the YouTube publication source of truth.

Calendar contract:

- Ordinary reservations are keyed by `setId + supportLang + targetLang + channelKey`; Polyglot reservations are keyed by `polyglotKey + channelKey`.
- `supportLang` must use exactly one native/viewer variant per language. For the shared English, Spanish and Portuguese channels, the only allowed support/native variants are `EN` (US/default English), `ES-419` (Latin American Spanish) and `PT-BR` (Brazilian Portuguese). Do not schedule or dispatch `EN-GB`, `ES` or `PT` as support/native publications.
- `targetLang` may still preserve regional variants such as `EN-GB`, `ES-419` and `PT-BR`, because learners can choose which dialect/accent to study.
- `channelKey` is the public support-channel key. Shared viewer channels (`en`, `es`, `pt`) use one combined calendar, but future planned support rows should only use the canonical support variants above.
- [2026-07-07 Decision]: To minimize duplicate native publications, video rendering load, TTS voice costs and YouTube API quota, paired dialects are single-support only: US/default English (`EN`) on `en`, Latin American Spanish (`ES-419`) on `es`, and Brazilian Portuguese (`PT-BR`) on `pt`. Secondary regional variants British English `EN-GB`, Spain Spanish `ES` and European Portuguese `PT` are completely excluded as support/native languages. They remain valid only as target/studied languages in playlists, metadata and `langs=...`.
- `publishAt` is the UTC YouTube API time; `localDate`, `localTime`, `timeZone`, `localSlotIndex` and `localDayOffset` are stored for human review.
- Calendar rows are not upload proof. Upload/readback proof remains `config/youtube-published-videos.json` for ordinary, `config/youtube-polyglot-published-videos.json` for Polyglot, plus YouTube API readback.

`scripts/plan-youtube-publish-schedule.mjs` is the only scheduled-slot allocator for ordinary and Polyglot. It must consider active calendar reservations, future scheduled publications in both publication registries, and slots assigned earlier in the same run. If a matching ordinary or Polyglot reservation already exists, the planner reuses that slot and rewrites metadata to match it rather than silently moving the video.

Ordinary dry-run/render sharding may pass the generation target preflight report as `--target-plan` to preserve deterministic target order. Apply is stricter: one run owns one physical support channel and one worker, while up to 20 different channels may run in parallel. Any bulk-dispatch support list must be filtered to canonical support variants before this point: `EN`, `ES-419`, `PT-BR`, and the one-code channels.

Operational rules:

- Anti-duplicate identity is an active publication assignment, not a title, hash or run id. Ordinary identity is `setId + canonical supportLang + targetLang`. A Polyglot product slot is `setId + canonical supportLang + bundle`; `contentScope` and `targetsHash` are content attributes, never permission for a second active video. A short row never satisfies one of the four required long/full slots, and an active full/short pair for the same support channel + bundle is a hard cross-scope blocker. Legacy rows without a current `polyglotKey` are matched by an order-independent target set. Historical support rows collapse as `EN-GB -> EN`, `ES -> ES-419` and `PT -> PT-BR`. An apply workflow must never use `allow_republish=true`: repair, supersede or delete the prior publication before creating a replacement.
- Ordinary and Polyglot apply workflows share the same repository-wide, cross-branch concurrency group `youtube-publish-channel-<support>-apply`. Exactly one apply run may own a physical support channel at a time, including its final durable-state persist job. Parallelism is across different support channels, up to the available 20 runners; one-channel worker fan-out is prohibited for apply.
- Every apply run performs an authenticated uploads-playlist audit with `videos.list(status)` before metadata generation, render, TTS, thumbnails or upload. Status is fetched for every scanned upload ID, including rows that do not yet match a known assignment. The audit must prove `paginationComplete=true`; reaching `max_pages` while a `nextPageToken` remains is a hard blocker, never an exact-tail result. `npm run check:youtube-publication-control` then compares the live readback with ordinary/Polyglot registries and the shared calendar. Duplicate live assignments, two active videos in one Polyglot product slot, a changed target set inside an occupied bundle slot, duplicate future calendar assignments, same-channel `publishAt` collisions, live videos missing from both durable ledgers, matched IDs with `uploadStatus=not_returned`, recent returned-status uploads that cannot be classified, and live future schedules missing from the calendar are hard blockers. Exact reviewed non-product uploads may be excluded only through `config/youtube-live-audit-exclusions.json`; no title-pattern or implicit exclusion is allowed. Polyglot target resolution uses the same viewer-language guard as ordinary pairs, including `ES-419 -> ES` and `PT-BR -> PT`, and fills the bundle with its configured fallback instead.
- Because render/TTS can outlive the 30-minute evidence window, apply performs one second read-only live audit immediately before the first YouTube write. The uploader refuses a missing, stale, non-strict or unhealthy control report; do not bypass this with direct local apply.
- `.github/workflows/youtube-publication-control.yml` is the standard read-only all-route reconciliation entrypoint. It audits all 51 canonical support channels through the four OAuth environments in parallel and produces one JSON and Markdown artifact with every active video and URL, public/scheduled/private-unscheduled state, custom/automatic thumbnail state, Polyglot `contentScope`, ordinary tails, the four required long/full Polyglot tails, duplicate blockers, durable-registry mismatches and whole-day calendar gaps. It never renders, generates metadata/images/audio, uploads, reschedules or deletes.
- The same workflow builds `youtube-publication-snapshot.json`, `youtube-playlist-discovery-snapshot.json` and a compact generated publication map. Optional `persist_snapshot=true` may commit only those three generated state files to the selected branch after a complete audit; default `false` keeps the run fully read-only. The publication snapshot keeps live-readback counts separate from durable-only rows and live duplicate groups separate from registry-only conflicts; the playlist snapshot proves complete owned-playlist/item pagination for stable identity resolution. Public/scheduled/private state is evaluated at each route's API-audit timestamp so a later report build cannot relabel an earlier readback. Neither snapshot substitutes for the fresh strict per-support control report required by apply.
- `config/youtube-publish-schedule-policy.json.default.fillEarliestAvailable=true` is the no-gap rule. Before adding extra slots to already occupied dates, the planner gives one slot to each completely empty date before the last existing reservation; it then fills the remaining slots chronologically. A later manually supplied `schedule_start_date` is recorded as requested but cannot create empty days. Omit the date for normal automatic planning.
- Both ordinary and Polyglot dispatchers default to `publish_mode=scheduled`. Direct `publish_at` is rejected for apply, because bypassing the shared allocator can recreate slot collisions and gaps. `public_now` remains an explicit exceptional mode.
- Both bulk dispatchers are fire-and-forget by default and their GitHub wrappers always pass `--no-watch`. They may dispatch up to the approved cross-channel parallelism, then stop; status is read once later through a bounded readback. `--watch` is diagnostic-only and requires separate explicit approval.
- Ordinary and Polyglot state persistence use unique pending groups plus fresh-clone merge/push retries. This avoids GitHub's one-pending-job cancellation behavior and merges every successful channel artifact against the latest branch calendar instead of losing rows from a large parallel wave.

2026-07-13 live all-route baseline: Deck #1 and Deck #2 were read once through all four GitHub OAuth projects in runs `29233315716`, `29233347846`, `29233396360`, `29233413736`, `29233424862`, `29233438150`, `29233447499`, `29233462502`. The uploads playlists returned `4363` unique IDs. `config/youtube-publication-snapshot.json` classifies `4170` as product videos: `3995` API-confirmed public, `168` API-confirmed scheduled, and `7` Deck #1 Polyglot registry-ID matches whose uploads-playlist presence is confirmed but whose status is explicitly unknown because these legacy artifacts fetched `videos.list(status)` only for then-matched rows. The remaining `193` IDs stay in a separate unclassified inventory. The map also records `31` live duplicate assignment groups and `6` registry-only conflicts; `docs/youtube-publication-map.md` is the compact human view. The older artifacts do not contain the new explicit pagination-complete and all-ID status fields, so they are inventory evidence only and cannot authorize apply. No YouTube write occurred during this audit.

`npm run reconcile:youtube-calendar-snapshot` compares scheduled live rows in that snapshot with the shared durable calendar and reports changes without writing by default. `--apply` is local-calendar-only and refuses live duplicate IDs, ambiguous semantic matches, assignments pointing to another video and occupied `channelKey + publishAt` slots. The 2026-07-13 local reconciliation added `42` unique Deck #2 ordinary reservations, left `98` matching rows unchanged and skipped `28` duplicate-video rows. Post-reconciliation route reports show `0` assignment duplicates, `0` slot collisions and only `12` missing-calendar rows, all belonging to the `12` known Deck #2 live duplicate assignments. No YouTube schedule was changed.

For a campaign already marked `reconciliation_required` solely because accepted receipts have moved `publishAt`, use `npm run reconcile:youtube-campaign-schedule` only after its complete all-route control report and same-run publication snapshot pass the exact schedule-only gate. It is dry-run first; its confirmed local apply finalizes the campaign and calendar receipts but never changes a schedule on YouTube or reuploads a video. The immutable manifest remains historical evidence of the originally claimed slots. Full contract: [YouTube Publication Campaigns](youtube-publication-campaigns.md#post-upload-schedule-reconciliation).

- After any scheduled plan/apply run, review the artifact-updated `config/youtube-publish-calendar.json` and commit it before launching a later separate wave that relies on those slots.
- Calendar reconciliation must use both publication registry arrays. Active publication/calendar checks ignore statuses containing `cancelled`, `deleted`, `failed` or `superseded`, not only exact status names.
- Backfill/reactivation is valid only for current non-superseded ordinary publication rows that have `publishAt` or `scheduledPublishAt`. Do not add active calendar rows for read-only live-audit rows (`live_youtube_upload_detected`) or immediate public uploads (`published_uploaded`) when they do not have a scheduled publish time.
- If a matching inactive reservation already exists for `setId + supportLang + targetLang + channelKey`, reactivate and sync that existing row from the publication registry instead of adding a second reservation row for the same assignment.
- Do not bypass the shared same-channel apply lock with a different workflow or ref. Persist the resulting calendar/registry artifact before a later wave depends on those slots.
- If a planned upload is intentionally cancelled, mark the calendar reservation inactive (`cancelled`, `deleted`, `failed` or `superseded`) instead of deleting rows; the planner ignores inactive rows.
- Do not put token paths, OAuth files, secrets, raw metadata prompts or private notes into the calendar.

2026-06-30 ordinary calendar reconciliation snapshot for `home_kitchen_cookware_pilot_01`: `137` existing inactive reservations were reactivated and synced to the publication registry. After the sync, all current non-superseded ordinary publication rows with `publishAt` / `scheduledPublishAt` have active calendar reservations (`missingWithPublishAt=0`) and active assignment duplicates are `0`. The remaining `288` current rows outside the active calendar are intentionally non-scheduled rows: `276` `live_youtube_upload_detected` readback rows and `12` `published_uploaded` public-now rows. The only active same-channel same-`publishAt` collisions are the preexisting shared-channel slot collisions on `pt` (`PT-BR`/`PT`) and `es` (`ES-419`/`ES`); they are not duplicate assignment keys.

### 1.4. Background music and Content ID safety

Status: **cancelled / not implementing**. 2026-06-19 business decision: do **not** add background music to LunaCards video lessons. The expected direct music-rights revenue is too low relative to the Content ID/self-claim risk, audio-mix complexity and possible harm to TTS intelligibility. The second video deck is no longer a music pilot; keep it silent as well.

Default rule:

- Do not add background music to generated videos.
- Do not create `config/youtube-background-music.json`.
- Do not add `musicTrackId` fields to `youtube_metadata.json` or the publish ledger.
- Do not spend render time, API quota or YouTube test uploads on music A/B checks.
- Keep the video audio focused on target-language TTS, support-language TTS, pauses and quiz audio.
- If this decision is reconsidered later, the user must explicitly approve a new music rollout decision and this section must be updated before code changes.

Archived fallback only:

The project could technically use the user's original music as quiet background audio, but only through an explicit owned-music workflow. Because the tracks are managed through Content ID / a distributor, the operational risk is not ordinary copyright ownership; the risk is **self-claiming**: the distributor or Content ID asset may claim, monetize, block, or track the channel's own uploads unless the exact channel/video use is cleared.

Before enabling background music at scale, each track must have a local manifest entry:

```text
assets/audio/background-music/original/
config/youtube-background-music.json
```

Required manifest fields:

- stable `musicTrackId`;
- local file path and checksum;
- display title;
- composer/owner confirmation;
- distributor name;
- Content ID asset id if available;
- ISRC/UPC if available;
- rights territory / exclusivity notes;
- allowed YouTube channel ids or handles;
- whitelist/allowlist status at the distributor;
- intended Content ID policy for LunaCards-owned videos: `allow_no_claim`, `track_only`, `monetize_owner_channel`, or `blocked_until_resolved`;
- safe usage notes such as instrumental-only, no vocals, no uncleared samples, no third-party loops unless licensed for YouTube monetization.

If music is ever reconsidered:

- Do not upload videos with background music to public status until at least one private/unlisted test upload has been checked in YouTube Studio for copyright/Content ID status.
- Prefer `allow_no_claim` or explicit channel allowlisting for LunaCards channels. If the distributor must claim the videos, this must be understood and documented before public release.
- Do not use tracks that contain uncleared samples, vocals competing with TTS, aggressive bass, sudden stingers, or copyrighted third-party loops.
- Do not choose music randomly without provenance. Use deterministic seeded rotation by `setId + supportLang + targetLang`, then write the selected `musicTrackId` to `youtube_metadata.json` and the future publish ledger.
- Keep music off by default in CI/GitHub generation until `config/youtube-background-music.json` exists, test upload readback passes, and the user explicitly approves batch use.

Mixing rule:

- Background music must be quiet and subordinate to TTS. Target practical level is around `-30` to `-36 LUFS` under speech, with fade in/out and ducking during spoken parts.
- The renderer should mix music as a post-process audio step when possible, not force a full video re-render. Expected overhead target is roughly `+10-60s` per video depending on duration and host speed; actual timing must be measured with a small A/B batch before enabling mass generation.
- Each output should record `musicTrackId`, source file checksum, mix level, ducking setting and generation duration in metadata/readback.

Acceptance gate before mass use:

1. Add 3-5 original instrumental tracks plus manifest entries.
2. Generate a small A/B batch with and without music.
3. Check speech intelligibility and loudness by listening/readback.
4. Upload at least one private/unlisted test video to the intended channel.
5. Check YouTube Studio copyright status after processing.
6. Confirm distributor whitelist/allowlist behavior.
7. Only then enable seeded rotation for batch generation.

---

## 2. Спецификации видео и анимации (Video Specs)

### Формат и разрешение:
* **Разрешение**: Widescreen 16:9 (1920x1080).
* **Стиль**: Премиальный веб-дизайн, соответствующий визуальному стилю сайта *flashcardsluna.com* (светло-голубой фон `#f4f7f9`, белая карточка с закругленными углами `rounded-3xl` и мягкой тенью, темно-синий цвет шрифта `#0e224e`, прогресс-бар в верхней части экрана).
* **Адаптация под экраны**: Все тексты и элементы увеличены (шрифты от 52px до 80px), чтобы контент легко читался на экранах мобильных телефонов и телевизоров.
* **Транскрипция**: Текстовое отображение транскрипции целевого слова на слайдах **отсутствует** (удалено для чистоты дизайна согласно скриншотам сайта).
* **Intro / карточки / quiz visual polish**: production renderer keeps the same LunaCards light-blue / white-card system, but intro uses a denser premium glass panel with a brand pill, localized deck title, localized subtitle pill and framed instruction text. Static and quiz cards use a slightly richer white-card background, larger word hierarchy, stronger chip styling, and a clearer quiz placeholder/answer hierarchy. Visual regression preview is kept at `outputs/tmp/visual-check-intro-card-templates-v2/contact-sheet.jpg`; generated screenshots should show no visible text clipping or overlap.

---

## 3. Спецификации аудио-бурения (Audio & Pause Specifications)

Аудиодорожка строится по методу **Pimsleur (Слушай и повторяй)**. Вся озвучка синтезируется с помощью бесплатного локального движка `edge-tts`.

### TTS variant contract

Видео обязано сохранять тот же языковой вариант, который пришел из LunaCards card/data layer. Нельзя схлопывать региональные варианты внутри видео, плейлистов, titles, metadata или `?langs=`:

- `EN` озвучивается как US English: `edge_en-US-JennyNeural` (женский);
- `EN-GB` озвучивается как British English: `edge_en-GB-SoniaNeural` (женский);
- `ES` озвучивается как Spain Spanish: `edge_es-ES-ElviraNeural` (женский);
- `ES-419` озвучивается как LatAm Spanish: `edge_es-MX-DaliaNeural` (женский);
- `PT` озвучивается как European Portuguese: `edge_pt-PT-RaquelNeural` (женский);
- `PT-BR` озвучивается как Brazilian Portuguese: `edge_pt-BR-FranciscaNeural` (женский);
- `NO` / `NB` озвучивается как Norwegian Bokmål: `edge_nb-NO-PernilleNeural` (женский); public/support code can be `NO`, but data lookup uses DB code `NB`; public study links must use `?langs=no`, not `?langs=nb`;
- `SR` ordinary decks use Serbian Latin (Gaj) text and `edge_sr-RS-SophieNeural`; Cyrillic is allowed only inside a separate documented course contract;
- `HY` remains the only documented non-Edge exception: it uses `ai33_elevenlabs_qJBO8ZmKp4te7NTtYgzz` because the free `edge-tts` backend does not currently expose Armenian `hy-AM` voices.

#### Полная карта голосов TTS (Source of Truth)

Ниже представлена полная таблица голосов для всех поддерживаемых языков, разделенная по уровням (Tiers) качества:

##### Tier 1: Идеальное качество (Премиум-класс)
| Код | Язык | Голос | Статус |
| --- | --- | --- | --- |
| **EN** | Английский (США) | `edge_en-US-JennyNeural` | 🌟 Обновлен (женский) |
| **EN-GB** | Английский (Великобритания) | `edge_en-GB-SoniaNeural` | 🌟 Обновлен (женский) |
| **ZH** | Китайский | `edge_zh-CN-XiaoxiaoNeural` | 🌟 Обновлен (женский) |
| **JA** | Японский | `edge_ja-JP-NanamiNeural` | 🌟 Обновлен (женский) |
| **FR** | Французский | `edge_fr-FR-DeniseNeural` | 🌟 Обновлен (женский) |
| **ES** | Испанский (Испания) | `edge_es-ES-ElviraNeural` | 2026-07-08 same-locale female refresh |
| **ES-419** | Испанский (Латинская Америка) | `edge_es-MX-DaliaNeural` | 2026-07-08 same-locale female refresh |
| **DE** | Немецкий | `edge_de-DE-KatjaNeural` | 2026-07-08 same-locale female refresh |
| **IT** | Итальянский | `edge_it-IT-IsabellaNeural` | 2026-07-08 same-locale female refresh |
| **PT** | Португальский (Португалия) | `edge_pt-PT-RaquelNeural` | 2026-07-08 same-locale female refresh |
| **PT-BR** | Португальский (Бразилия) | `edge_pt-BR-FranciscaNeural` | Без изменений (женский) |

##### Tier 2: Очень хорошее качество
| Код | Язык | Голос | Статус |
| --- | --- | --- | --- |
| **RU** | Русский | `edge_ru-RU-SvetlanaNeural` | 🌟 Обновлен (женский) |
| **KO** | Корейский | `edge_ko-KR-SunHiNeural` | 🌟 Обновлен (женский) |
| **VI** | Вьетнамский | `edge_vi-VN-HoaiMyNeural` | 🌟 Обновлен (женский) |
| **TH** | Тайский | `edge_th-TH-PremwadeeNeural` | 🌟 Обновлен (женский) |
| **SV** | Шведский | `edge_sv-SE-SofieNeural` | 🌟 Обновлен (женский) |
| **NO** / **NB** | Норвежский | `edge_nb-NO-PernilleNeural` | 🌟 Обновлен (женский) |
| **DA** | Датский | `edge_da-DK-ChristelNeural` | 🌟 Обновлен (женский) |
| **FI** | Финский | `edge_fi-FI-NooraNeural` | 🌟 Обновлен (женский) |
| **PL** | Польский | `edge_pl-PL-ZofiaNeural` | 2026-07-08 live fix; `Agnieszka` removed |
| **TR** | Турецкий | `edge_tr-TR-EmelNeural` | 2026-07-08 same-locale female refresh |
| **NL** | Нидерландский | `edge_nl-NL-ColetteNeural` | Без изменений (женский) |
| **HI** | Хинди | `edge_hi-IN-SwaraNeural` | 2026-07-08 same-locale female refresh |
| **ID** | Индонезийский | `edge_id-ID-GadisNeural` | Без изменений (женский) |

##### Tier 3: Хорощее / Удовлетворительное качество
| Код | Язык | Голос | Статус |
| --- | --- | --- | --- |
| **HU** | Венгерский | `edge_hu-HU-NoemiNeural` | 🌟 Обновлен (женский) |
| **RO** | Румынский | `edge_ro-RO-AlinaNeural` | 🌟 Обновлен (женский) |
| **BG** | Болгарский | `edge_bg-BG-KalinaNeural` | 🌟 Обновлен (женский) |
| **HR** | Хорватский | `edge_hr-HR-GabrijelaNeural` | 2026-07-08 live fix; `Jasmina` removed |
| **SL** | Словенский | `edge_sl-SI-PetraNeural` | 🌟 Обновлен (женский) |
| **TL** | Тагальский | `edge_fil-PH-BlessicaNeural` | 🌟 Обновлен (женский) |
| **KK** | Казахский | `edge_kk-KZ-AigulNeural` | 🌟 Обновлен (женский) |
| **AZ** | Азербайджанский | `edge_az-AZ-BanuNeural` | 🌟 Обновлен (женский) |
| **KA** | Грузинский | `edge_ka-GE-EkaNeural` | 🌟 Обновлен (женский) |
| **CS** | Чешский | `edge_cs-CZ-VlastaNeural` | 2026-07-08 same-locale female refresh |
| **SK** | Словацкий | `edge_sk-SK-ViktoriaNeural` | 2026-07-08 same-locale female refresh |
| **SR** | Сербский | `edge_sr-RS-SophieNeural` | 2026-07-08 same-locale female refresh |
| **MS** | Малайский | `edge_ms-MY-YasminNeural` | Без изменений (женский) |
| **UZ** | Узбекский | `edge_uz-UZ-MadinaNeural` | Без изменений (женский) |

##### Tier 4: Сложное качество
| Код | Язык | Голос | Статус |
| --- | --- | --- | --- |
| **ET** | Эстонский | `edge_et-EE-AnuNeural` | 🌟 Обновлен (женский) |
| **LV** | Латышский | `edge_lv-LV-EveritaNeural` | 🌟 Обновлен (женский) |
| **LT** | Литовский | `edge_lt-LT-OnaNeural` | 🌟 Обновлен (женский) |
| **IS** | Исландский | `edge_is-IS-GudrunNeural` | 🌟 Обновлен (женский) |
| **TA** | Тамильский | `edge_ta-IN-PallaviNeural` | 🌟 Обновлен (женский) |
| **TE** | Телугу | `edge_te-IN-ShrutiNeural` | 🌟 Обновлен (женский) |
| **KN** | Каннада | `edge_kn-IN-SapnaNeural` | 🌟 Обновлен (женский) |
| **ML** | Малаялам | `edge_ml-IN-SobhanaNeural` | 🌟 Обновлен (женский) |
| **KM** | Кхмерский | `edge_km-KH-SreymomNeural` | 🌟 Обновлен (женский) |
| **LO** | Лаосский | `edge_lo-LA-KeomanyNeural` | 🌟 Обновлен (женский) |
| **MY** | Бирманский | `edge_my-MM-NilarNeural` | 🌟 Обновлен (женский) |
| **SW** | Суахили | `edge_sw-KE-ZuriNeural` | 🌟 Обновлен (женский) |
| **NE** | Непальский | `edge_ne-NP-HemkalaNeural` | 🌟 Обновлен (женский) |
| **SI** | Сингальский | `edge_si-LK-ThiliniNeural` | 🌟 Обновлен (женский) |
| **BN** | Бенгальский | `edge_bn-IN-TanishaaNeural` | 2026-07-08 same-locale female refresh |
| **HY** | Армянский | `ai33_elevenlabs_qJBO8ZmKp4te7NTtYgzz` | Без изменений (ElevenLabs) |

2026-06-22 voice audit result: Microsoft Azure Speech lists Armenian `hy-AM-AnahitNeural` and `hy-AM-HaykNeural`, but live `edge-tts` 7.2.8 readback returned 0 `hy-AM` voices and a direct `hy-AM-HaykNeural` synthesis smoke failed with `NoAudioReceived`. Therefore do not switch `HY` to Edge until a fresh live `edge-tts` readback proves `hy-AM` is available. The other 54 Edge voice ids in `defaultVoiceMap` were checked against live `edge-tts` voice listing and were present at that time. Some languages have newer Azure `DragonHD` / multilingual variants in the Microsoft list, but the video pipeline intentionally uses standard Edge-compatible `*Neural` voice ids without `:DragonHD...` suffixes so GitHub/Windows generation remains free and predictable. This is a technical availability/locale check, not a native-listening certification that every selected voice is the most pleasant possible voice for every viewer.

2026-07-08 live Edge voice refresh: live `edge-tts --list-voices` for `pl-PL` now returns only `pl-PL-ZofiaNeural` and `pl-PL-MarekNeural`. Direct synthesis with the old `pl-PL-AgnieszkaNeural` fails with `NoAudioReceived`; direct synthesis with `pl-PL-ZofiaNeural` and `pl-PL-MarekNeural` succeeds. `PL` therefore uses `edge_pl-PL-ZofiaNeural` from this point forward. The same live map check found `hr-HR-JasminaNeural` removed; direct synthesis fails with `NoAudioReceived`, while `hr-HR-GabrijelaNeural` and `hr-HR-SreckoNeural` succeed. `HR` therefore uses `edge_hr-HR-GabrijelaNeural` from this point forward.

2026-07-08 same-locale voice quality refresh: after the live availability check, the standard Edge map was refreshed from older male same-locale voices to available female same-locale voices for `ES`, `ES-419`, `DE`, `IT`, `TR`, `HI`, `BN`, `CS`, `SK`, `SR` and `PT`. This intentionally avoids DragonHD, multilingual voices and cross-region substitutions so GitHub rendering stays on ordinary free Edge-compatible `*Neural` voices.

2026-06-22 AI33/ElevenLabs API contract check: the attached AI33 documentation for "Create Speech" says to use `POST /v1/text-to-speech/{voice_id}?output_format=mp3_44100_128`, header `xi-api-key`, JSON body `{ text, model_id: "eleven_multilingual_v2", with_transcript: false }`, and async task polling that returns `status` plus `metadata.audio_url`. The official ElevenLabs "Create speech" contract uses the same `POST /v1/text-to-speech/{voice_id}` shape, but its normal success response is direct audio rather than an AI33 `task_id`. `scripts/lib/video-generator.mjs` therefore handles both success shapes: a direct audio response is saved immediately to the TTS cache, while an async JSON response with `task_id` is polled until `metadata.audio_url` is available. Live local readback with the gitignored AI33 key confirmed `/v1/models` includes `eleven_multilingual_v2`, `/v2/voices` can see the configured voice, and both v1 body variants reach AI33, but the v1 create endpoint currently returns `success=false` with message `please use api v3 for this endpoint`. Legacy `/v3/text-to-speech` variants returned `401 Unauthorized` with the same key in the tested header forms. Local development can read AI33 variables from gitignored `.local/access-imports/youtube2026new.env.local`; GitHub needs a real `AI33_API_KEY` secret before HY video generation can succeed.

2026-07-26 GitHub AI33 readiness check: `.github/workflows/ai33-tts-smoke.yml` runs exactly one fixed short Armenian phrase through the same `getTtsAudio` provider path as production. It requires `confirm_ai33_tts=CHECK_AI33_TTS`, receives only `AI33_API_KEY`, and has no video render, metadata, playlist, OAuth or YouTube write path. Its artifact contains only non-secret readiness evidence (provider, voice, byte count and audio checksum). Normally a successful `status=ready` artifact is required before changing `HY.videoProductionReadiness`. For the current HY tail the user explicitly confirmed successful AI33 audio generation on 2026-07-26, so the channel is re-enabled for one exact campaign preflight; smoke run `30200194901` returned temporary `HTTP 503` and does not count as an audio success. A temporary `server_busy` during polling is not treated as a failed synthesis: the runner keeps polling the same persisted provider task through the bounded overall polling window. Polyglot artifacts retain non-secret `ai33-task-ledger.jsonl` rows (task id and cache filename only) for exact recovery evidence; they never contain text, download URLs or credentials. Any later terminal provider failure still stops the HY lane before a YouTube write and never authorizes an automatic retry.

Source files:

```text
scripts/lib/tts-voice-map.mjs
scripts/lib/video-language-codes.mjs
scripts/lib/video-generator.mjs
```

Before bulk generation or after metadata generation, run the variant gate:

```bash
npm run check:video-tts-variant-contract -- --set home_kitchen_cookware_pilot_01 --support RU --target PT-BR
npm run check:video-tts-variant-contract -- --metadata outputs/video-generator --output=outputs/video-generator/video-tts-variant-contract-report.json
```

This gate blocks missing/unknown language codes, wrong TTS voice mappings, missing card readback for the exact target/support pair, script mismatches such as Cyrillic inside ordinary `SR`, Latin fallback inside non-Latin scripts, wrong public support-language paths, and missing/wrong `?langs=<public-study-code>` study URLs. It emits warnings, not blockers, for dialect risk words that need review, for example Nynorsk markers in `NO`/`NB`, US-only terms in `EN-GB`, Spain-only terms in `ES-419`, and European Portuguese terms in `PT-BR`.

The gate is a technical contract check, not native-speaker certification. It guarantees that the video pipeline did not lose the language variant or script contract before TTS; it does not prove every regional lexical choice is perfect.

### Структура таймингов одной карточки:
1. **Озвучка целевого слова (Target Word)**: Звучит слово на изучаемом языке (например, испанский: *la ducha*). На экране видно только испанское слово.
2. **Пауза для повторения (Listen & Repeat)**: Фиксированная пауза **2.0 секунды**. В это время ученик должен повторить слово вслух.
3. **Озвучка перевода (Support Translation)**: Звучит перевод на родной язык ученика (например, русский: *душ*). На экране видно испанское слово + русский перевод.
4. **Пауза для осознания**: Фиксированная пауза **2.5 секунды** перед переходом к следующей карточке.

> [!NOTE]  
> Предложения-примеры были полностью удалены из видео по соображениям педагогики (снижение когнитивной нагрузки на уровне А1) и динамики. Цикл состоит только из `Слово -> Пауза -> Перевод -> Пауза`.

---

## 4. Интерактивный Квиз (Interactive Quiz Segment)

В конце каждого урока добавляется игровой проверочный сегмент:
1. **Экран вопроса**: На экране появляется перевод слова на родной язык (например: *душ*).
2. **Таймер**: Запускается визуальный обратный отсчет (3... 2... 1...) длительностью **3.0 секунды**.
3. **Экран ответа**: По истечении таймера показывается правильное слово на изучаемом языке (*la ducha*) и воспроизводится его аудиозапись.
4. **Пауза перед следующим вопросом**: Фиксированная пауза **2.5 секунды**.

---

## 4.1. Локализация Intro / Outro / Quiz

Тексты intro, outro, quiz labels, feature badges и QR-подписи берутся из:

```text
config/video-localization.json
scripts/generate-video-localization.mjs
```

Outro feature badges use generated premium line-icon PNGs instead of emoji:

```text
assets/video/outro-icons/premium-outro-icons-light-transparent.png
assets/video/outro-icons/split/*.png
scripts/lib/video-outro-icons.mjs
```

Outro feature grid keeps all 8 badges, but the visual hierarchy should stay conversion-focused: subtle glass feature cards, icon wells, a lighter URL pill, and a clean white QR card. Do not turn the feature grid back into heavy button-like cards or emoji badges.

Название колоды и subtitle на intro берутся не из технического `content_sets.set_name`, а из localized Course Metadata. Это же правило обязательно для Polyglot-видео: cover/title/subtitle должны быть на языке носителя (`supportLang`) и должны использовать `Course Metadata` из Docker/Postgres/export layer, а не hardcoded English deck title.

```text
content_set_localizations.title
content_set_localizations.description
scripts/lib/video-generator.mjs#fetchDeckTitle
scripts/lib/video-generator.mjs#fetchDeckMetadata
```

Для слайда `Title` очищается от финальной точки, потому что `Course Metadata.Title` хранится с sentence punctuation для Google Sheets, а на видео эта точка выглядит как лишний UI-знак. `Description` используется для intro subtitle после удаления повторяющегося `Title`, например `Ингредиенты. Начальный уровень.` превращается в `Начальный уровень · 32 слова`; count label может иметь language-specific форму, например RU `слово` / `слова` / `слов`. Если localized metadata отсутствует, fallback идет в таком порядке: English Course Metadata, затем internal `content_sets.set_name`, затем slug-derived title.

`scripts/generate-video-localization.mjs` является генератором для `config/video-localization.json`. Если меняется локализация, нужно обновлять генератор и затем пересобирать JSON:

```bash
node scripts/generate-video-localization.mjs
```

Перед массовой сборкой видео нужно запускать gate:

```bash
npm run check:video-localization
```

Gate проверяет:

- все support-language entries имеют одинаковый набор ключей;
- `intro_speech_template` содержит `{target_lang}` и `{deck_title}`;
- `quiz_question_label_template` содержит `{current}` и `{total}`;
- `qr_scan_label` заполнен, чтобы QR-подпись не оставалась hardcoded English;
- outro QR не откатывается на homepage: для опубликованных курсов используется `/lang/courses/<site-slug>`, для неопубликованных или неизвестных `set_id` используется `/lang/courses`;
- в локалях с отдельной письменностью нет очевидных чужих Unicode-блоков, например Thai inside Lao/Khmer, Devanagari inside Bengali/Tamil, Cyrillic inside Georgian, Burmese inside Armenian.

Этот gate не заменяет native-speaker review. Он блокирует видимые технические и script-level ошибки, которые напрямую попадают на YouTube-слайды и в TTS.

2026-07-07 native-style rewrite pass: ordinary horizontal-video intro/outro copy was rewritten through `nativeStyleOverrides` in `scripts/generate-video-localization.mjs` and regenerated into `config/video-localization.json` for all 54 active language contours. The localization JSON currently exposes 55 technical keys because `NB` is kept as a data/internal alias of the same Norwegian Bokmål contour as `NO`; do not describe this as 55 separate project languages. The rewrite covers `intro_desc`, `intro_speech_template`, `outro_title`, `outro_subtitle` and `outro_speech`, keeps `{target_lang}` / `{deck_title}` placeholders, keeps the ordinary QR/description CTA, and avoids the old P1 markers from the 2026-06-15 audit such as EN `in pauses` / `Learn these words forever`, PL `native speakerów`, KK `жаттықтырыңыз`, SK Czech `Procvičujte`, TL malformed CTA and NO/NB `kortstokker`. Polyglot long-video intro/outro copy was separately naturalized in `config/polyglot-video-localization.json` for the same 54 language contours while preserving the required 180+ themed-decks language-mix CTA and avoiding pricing/free wording. Verification commands:

```bash
npm run check:video-localization
npm run check:polyglot-video-localization
```

This is a broad native-style rewrite by the agent and technical gates, not human native-speaker certification. If exact marketing nuance is high-risk for a channel, still run a real native review for that support language before treating it as `approved`.

### Outro QR destination

Outro CTA должен вести на учебные материалы сайта, а не на главную страницу:

```text
config/video-public-course-links.json
scripts/lib/video-public-url.mjs
qrcode npm package
```

Правило fail-closed:

- если `set_id` есть в `publishedCourseSlugBySetId` и известен `targetLang`, QR ведет сразу на localized study page, например `https://flashcardsluna.com/ru/courses/kitchenware-basic/study/standard?langs=es`;
- для Polyglot-видео с несколькими target languages используется тот же study route, но `langs` содержит весь список target-языков через запятую и URL-encoding, например `https://flashcardsluna.com/ru/courses/kitchenware-basic/study/standard?langs=en%2Ces%2Cfr%2Cde`;
- в таком URL первый path segment (`/ru/`) является языком интерфейса / носителя зрителя (`supportLang`), а `langs=es` является изучаемым языком видео (`targetLang`);
- `langs` использует public study-code mapping из `config/video-public-course-links.json`, а не обязательно сырой internal/data code. Для Norwegian/Bokmål `NO` и `NB` оба должны давать `langs=no`; `langs=nb` считается ошибкой.
- если `targetLang` неизвестен, но `set_id` опубликован, URL остается localized course page, например `https://flashcardsluna.com/ru/courses/kitchenware-basic`;
- если `set_id` еще не опубликован на сайте или slug не проверен, QR ведет на localized courses page, например `https://flashcardsluna.com/ru/courses`;
- не выводить URL из `content_sets.slug` автоматически: DB slug и public site slug могут отличаться, а несуществующий dynamic route может выглядеть как HTTP 200 из-за Next.js fallback.
- QR генерируется локально как SVG data URI через `qrcode`; production renderer не должен зависеть от `api.qrserver.com` или заранее сохраненных QR-файлов.

### YouTube metadata generation

Каждый собранный `.mp4` должен получать соседний `youtube_metadata.json` для будущей загрузки на YouTube. Source of truth скрипты:

```text
scripts/generate-youtube-metadata.mjs
scripts/check-youtube-metadata.mjs
scripts/check-youtube-seo-metadata.mjs
scripts/lib/youtube-metadata.mjs
```

Metadata включает `title`, `description`, `tags`, `hashtags`, `categoryId=27`, `privacyStatus`, `courseUrl`, `supportLang`, `targetLang`, `setId` и provenance (`source`, `model`, `generatedAt`). С 2026-06-21 production default is `privacyStatus=public`; `private`/`unlisted` are explicit test/pre-publication states only.

Правило качества:

- template fallback always works without AI/external dependency for local diagnostics and `mode=plan`, but it is not publish-ready metadata;
- primary template fallbacks (`EN`, `RU`, `ES` / `ES-419`) should stay useful enough for review, but quality fallback must not be treated as a substitute for AI-polished or human-curated upload metadata;
- non-English support-language fallback metadata must never use English playlist/video templates such as `Everyday Flashcards`, `A1: Everyday: ...`, English target-language names where localized names are available, `words with pronunciation`, `videos for native ... speakers`, `flashcards, pronunciation, repeat pauses`, `Playlist key:` or lesson-topic fallbacks where `FlashcardsLuna` is treated as the deck/topic title. If AI polish is unavailable, `scripts/lib/youtube-metadata.mjs` and `scripts/lib/youtube-playlists.mjs` must use localized `config/video-localization.json` strings and localized target-language names for the support language; the shared fallback may use `Intl.DisplayNames` before the explicit English fallback. `npm run check:youtube-metadata-language` must fail closed on these markers before any YouTube write;
- AI-polished metadata for non-English support channels is checked against the same English-template markers before it leaves `scripts/lib/youtube-metadata.mjs`. If Gemini/VectorEngine returns an English-template title, description, playlist text or too many English-template tags, the generator discards that AI text and writes the localized deterministic metadata as `source=gemini-<backend>-localized-fallback` with bounded `aiMetadata.languageGate` diagnostics. This source is allowed through live planning because an AI call was attempted and the unsafe AI output was rejected before upload;
- Gemini используется только как AI-polish слой поверх фактов из Course Metadata, списка слов и public course URL;
- recoverable Gemini/VectorEngine polish failures (`non-JSON`, timeout, HTTP 429/5xx) do not trigger a same-provider retry. The ordered provider chain advances once when configured; if the full chain fails, `mode=plan` may write `source=template-ai-fallback` with bounded diagnostics, while live apply remains fail-closed through strict AI metadata gates;
- Gemini output не должен придумывать длительность, платные обещания, сертификаты, guaranteed fluency, teacher/native-speaker claims beyond the actual video facts;
- `description` должен содержать точный `courseUrl`;
- `tags` не должны содержать hashtags, а общий YouTube tag budget должен оставаться <= 500 chars;
- `scripts/check-youtube-metadata.mjs` является обязательным gate перед upload stage.
- `npm run check:youtube-metadata-language` is mandatory in GitHub upload workflows after metadata generation and before YouTube writes. It blocks obvious English-template titles/descriptions/tags on non-English support-language channels, including playlist title/description fields in `youtube_metadata.json`.
- `scripts/check-youtube-seo-metadata.mjs` является обязательным SEO gate перед publish/upload workflows: он проверяет search/usefulness contract, точный `courseUrl`, target/deck intent, vocabulary/pronunciation/repeat-mini-test signals, tag/hashtag hygiene, computed course URL equality and playlist-key mismatch checks.

SEO gate разделяет blockers and warnings:

- Blockers: missing/mismatched `courseUrl`, description without the exact URL, upload-length violations, tag spam, invalid hashtags, unsupported guarantee/certificate/native-teacher claims and present mismatched playlist keys.
- Warnings: short but valid descriptions, missing exact inflected target-language name, missing sibling thumbnail/cover/poster file, any `template` / `template-ai-fallback` source in normal plan mode, and historical metadata without `playlist_key`. With `--require-ai-metadata`, template sources become blockers.
- The gate is title/description/URL/thumbnail-focused. YouTube's own help says title, thumbnail and description are the main discovery metadata, while tags play only a minimal role except for common misspellings; therefore do not overfit this pipeline to hidden tag lists.
- YouTube hashtags are not a separate API field. Generated `hashtags` are metadata intent; the uploader appends the first 3 normalized hashtags to the upload description if they are not already present, matching YouTube's hashtag behavior and avoiding description tag spam.
- Google Search can surface the YouTube video page itself in normal search/video results; this is the primary Google objective for the first publishing phase. The controllable inputs are still YouTube title, thumbnail, description, chapters/timestamps, transcript/captions, language/channel relevance and early engagement/retention signals. A separate `flashcardsluna.com` watch-page layer is optional later if we want our own site pages to rank too.

SEO targets for FlashcardsLuna videos:

- YouTube Search: support-language queries for beginner vocabulary, for example `Spanish A1 vocabulary`, `learn Spanish words`, `Spanish kitchen vocabulary`, `Spanish words with pronunciation`, plus localized equivalents such as `испанский для начинающих`, `испанские слова`, `слова с произношением`.
- YouTube browse/session clustering: consistent playlist keys by viewer/support language + target language + course family + level/track.
- Conversion: the first description link and QR must point to the exact target-specific FlashcardsLuna study URL, not the homepage.
- Google Search: target Google results that show the YouTube video directly for support-language searches such as `испанский посуда слова`, `испанский A1 кухонная посуда`, `испанские слова с произношением`, plus the same query families in every support language.

Google results contract for YouTube-hosted videos:

- lead with the support-language query in the title: target language + level + deck/topic + vocabulary/pronunciation intent;
- keep the thumbnail readable and aligned with the title/topic; YouTube's own guidance treats title, thumbnail and description as the main discovery metadata, while tags are only a minor misspelling/help signal;
- put the strongest exact-match phrase and the specific deck/topic in the first description paragraph;
- include the exact FlashcardsLuna course URL once, but do not make the description a link dump;
- add 3-5 concrete sample words from the deck in the description when it sounds natural; this helps long-tail query matching without tag spam;
- add YouTube description timestamps/chapters for intro, vocabulary practice, mini-test and outro after the video timeline is stable, because Google can use YouTube description timestamps for key moments;
- keep hashtags few and directly relevant; do not use ordinary tag lists or repetitive keyword sentences in the description;
- after publishing, compare Google/YouTube search impressions, CTR and retention before changing the prompt at scale.

Optional later website layer for `flashcardsluna.com`:

- create one dedicated, indexable watch page per uploaded YouTube video when practical; the single video must be the main purpose of that page, not a minor element inside a broad course/listing page;
- make the embedded YouTube iframe visible in rendered HTML without requiring a click, swipe, login, paywall or client-only action before Google can discover it;
- keep a unique page `<title>` and meta description per video, aligned with the YouTube title/description but not duplicated mechanically across every language pair;
- expose JSON-LD `VideoObject` on each watch page with at least `name`, `description`, `thumbnailUrl`, `uploadDate` and `embedUrl`; add `duration` when available from the render/publish artifact;
- use stable absolute thumbnail URLs on `flashcardsluna.com` rather than expiring runner artifact URLs; the image should be crawlable and match the YouTube thumbnail;
- add uploaded videos to a video sitemap or to the existing sitemap with video extension tags: watch-page `<loc>`, `video:thumbnail_loc`, `video:title`, `video:description` and YouTube `video:player_loc`;
- after the first few uploads, verify in Google Search Console URL Inspection and Video indexing reports before scaling to hundreds of pages;

External SEO references for this contract:

- YouTube Help, tags: <https://support.google.com/youtube/answer/146402>
- YouTube Help, hashtags: <https://support.google.com/youtube/answer/6390658>
- Google Search Central, video SEO best practices: <https://developers.google.com/search/docs/appearance/video>
- Google Search Central, VideoObject structured data: <https://developers.google.com/search/docs/appearance/structured-data/video>
- Google Search Central, video sitemaps: <https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps>

Локальный Gemini smoke можно запускать через subscription-backed Gemini CLI:

```bash
node scripts/generate-youtube-metadata.mjs \
  --set home_kitchen_cookware_pilot_01 \
  --support RU \
  --target ES \
  --with-gemini \
  --gemini-backend cli \
  --model gemini-3.1-pro-preview
```

В GitHub Actions metadata может идти тремя API-путями:

- OpenAI Responses API: repository secret `OPENAI_API_KEY`, repository variables `OPENAI_METADATA_MODEL` (default `gpt-5.4-mini-2026-03-17`) и `OPENAI_SERVICE_TIER` (`auto`, `default` или `flex`; default `auto`); Structured Outputs, `store=false`, no tools;
- direct Google Gemini API: secrets `GEMINI_API_KEY`, `GEMINI_API_KEY_2` или `GOOGLE_API_KEY`; для API mode default model задается `GEMINI_MODEL` / repository variable, иначе используется `gemini-3.5-flash`;
- VectorEngine Gemini proxy: secret `VECTORENGINE_API_KEY` (или legacy alias `VECTOR_ENGINE_API_KEY`), optional repository variables `VECTORENGINE_BASE_URL` and `VECTORENGINE_GEMINI_MODEL`; default base URL is `https://api.vectorengine.ai`, default model is `gemini-3.5-flash`.

Mixed campaign metadata и future ordinary/Polyglot bulk publish используют подтверждаемый chain `openai,api,vectorengine`. OpenAI требует `confirm_openai_metadata=USE_OPENAI_METADATA`; direct keys затем пробуются в порядке `GEMINI_API_KEY`/legacy `GOOGLE_API_KEY`, `GEMINI_API_KEY_2`; VectorEngine требует `confirm_vectorengine_metadata=USE_VECTORENGINE_METADATA`. Один provider не получает blind same-request retry. Если полный chain не дал валидные metadata для каждого `requestId`, workflow падает до video render/TTS/upload. Template fallback разрешён только для plan diagnostics; apply остаётся fail-closed.

OpenAI `auto` выбран вместо Flex/Batch для scheduled публикации. `auto` сохраняет право проекта на фактический complimentary `data_sharing_incentive` tier и немедленный synchronous response; checkpoint фиксирует actual tier и usage. Flex остаётся opt-in переменной для дешёвой несрочной обработки после исчерпания бесплатной квоты. Batch API с completion window до 24 часов требует отдельного двухфазного metadata lifecycle и не должен запускаться после claim календарных слотов; он не встроен в publication campaign.

2026-07-14 direct key-order clarification: primary is `GEMINI_API_KEY` or its legacy `GOOGLE_API_KEY` alias; secondary is `GEMINI_API_KEY_2`, used after quota/permission or response-integrity failure on primary; VectorEngine is the final explicitly confirmed fallback. Response-integrity failures include non-`STOP` finish reason, malformed/truncated JSON and incomplete exact request-ID coverage. The same direct key is never retried blindly.

2026-07-14 direct Gemini batching policy: standalone ordinary metadata groups up to 5 target-video tasks per direct request (`metadata_batch_size=5`). The mixed 51-channel campaign goes further: `.github/workflows/youtube-publication-campaign.yml` groups ordinary and Polyglot tasks by the four GitHub route environments, then sends up to 5 stable `requestId` tasks in each synchronous request before any render/TTS starts. A standard 306-video `5 ordinary + 1 Polyglot` wave therefore uses 63 route-batched requests instead of 102 worker requests. Direct Google calls use `POST /v1beta/models/{model}:generateContent`, JSON response schema, `maxOutputTokens=60000` and exact request-id completeness. Structured output is not semantic proof: every item still passes support-language, metadata and SEO gates. A non-recoverable request/schema error stops before render; Google Batch API is not used.

2026-06-19 live smoke confirmed the working VectorEngine text path: `gemini-3.5-flash:generateContent`. Local smoke `npm run check:vectorengine-gemini -- --confirm-spend` wrote `outputs/tmp/vectorengine-gemini-smoke/vectorengine-gemini-smoke-20260619T072602Z.json` with `status=ok`. GitHub Actions smoke `build-test-single.yml` run `27813244643` passed on commit `5a11a44` in `3m20s`; downloaded artifact `outputs/github-vectorengine-test-27813244643/test-single-video-uz/home_kitchen_cookware_pilot_01_en_uz/youtube_metadata.json` has `source=gemini-vectorengine` and `model=gemini-3.5-flash`, and `npm run check:youtube-metadata -- outputs/github-vectorengine-test-27813244643` passed with 0 blockers/warnings. On 2026-06-20 `gh secret list --repo webpot-ru/luna` read back `VECTORENGINE_API_KEY` by name/update timestamp as updated at `2026-06-20T13:39:07Z`; the secret value was not read or printed. On 2026-06-21 local readback re-confirmed the key/endpoint with `npm run check:vectorengine-gemini -- --confirm-spend` and then generated RU->ES metadata with `source=gemini-vectorengine`. GitHub video-publish plan run `27899137609` on commit `9286549` then confirmed the fixed prompt in the full workflow: downloaded `youtube_metadata.json` for `home_kitchen_cookware_pilot_01` / `RU->ES` has `source=gemini-vectorengine`, `model=gemini-3.5-flash`; local strict gates over the downloaded artifact passed `check:youtube-metadata`, `check:youtube-seo-metadata --require-ai-metadata` with score 100, and `plan:youtube-publish --allow-playlist-create --require-ai-metadata` with `Publish-ready: 1`. Earlier failures were tied to other VectorEngine models/endpoints (`gemini-3-pro-preview` stream timeout, `gemini-3.1-pro-preview`/`gemini-2.5-flash`/`gemini-2.0-flash` 503, `gemma-7b-it` 429) or to the pre-fix long metadata prompt/output budget, and should not be used as the default path.

Локальный smoke-check VectorEngine Gemini:

```bash
npm run check:vectorengine-gemini -- --confirm-spend
```

Direct Google Gemini API smoke uses the manual GitHub workflow `.github/workflows/gemini-direct-api-smoke.yml` or the local command below when keys are present in the environment. It is intentionally tiny and sequential: one `generateContent` JSON-MIME request for `GEMINI_API_KEY` and one for `GEMINI_API_KEY_2`, no retries and no production metadata fan-out. Use it only with explicit spend confirmation:

```bash
npm run check:direct-gemini-api -- --key-names GEMINI_API_KEY,GEMINI_API_KEY_2 --model gemini-3.5-flash --confirm-spend
```

Если ключ лежит во внешнем env-файле, можно явно указать его без печати секрета:

```bash
npm run check:vectorengine-gemini -- --env-file /path/to/.env --confirm-spend
```

Скрипт требует `--confirm-spend`, потому даже короткий health-check тратит API usage. Он пишет безопасный readback в `outputs/tmp/vectorengine-gemini-smoke/` and prints only the env key name, never the key value.

VectorEngine helper keeps the Gemini REST payload shape aligned with the official Gemini API text-generation docs: `contents[].parts[].text`, optional `systemInstruction` / `system_instruction`, `generationConfig`, and JSON parsing from `generateContent`. SSE parsing for `streamGenerateContent?alt=sse` remains available behind `VECTORENGINE_GEMINI_METHOD=streamGenerateContent`, but production defaults to `generateContent` because that is the tested stable VectorEngine path for `gemini-3.5-flash`. The project code uses `systemInstruction` because that is the shape shown in the JavaScript/App Script examples and accepted by the VectorEngine compatibility layer. Calls have a bounded timeout (`VECTORENGINE_TIMEOUT_MS`, default 120000ms) so GitHub jobs do not hang indefinitely on a saturated upstream stream.

VectorEngine image generation for thumbnails is intentionally bounded too: `VECTORENGINE_IMAGE_TIMEOUT_MS` defaults to 180000ms per attempt, and `VECTORENGINE_IMAGE_RETRIES` defaults to 2 recoverable retries for `fetch failed`, timeout, HTTP 429 and HTTP 5xx cases. Missing keys, auth failures and non-recoverable 4xx responses remain hard failures. This keeps flaky `gpt-image-2` calls from hanging a GitHub job for a long time while still allowing a transient upstream/network failure to recover.

---

## 5. Техническая реализация и оптимизация производительности (Tech Pipeline & Speed Optimizations)

* **Скрипты сборки**:
  - Главный скрипт сборщика: [build-deck-video.mjs](file:///c:/Users/ramil/Desktop/luna/scripts/build-deck-video.mjs)
  - Хелпер синтеза аудио: [video-generator.mjs](file:///c:/Users/ramil/Desktop/luna/scripts/lib/video-generator.mjs)
  - Пакетный генератор скриншотов: [screenshot-batch.mjs](file:///c:/Users/ramil/Desktop/luna/scripts/lib/screenshot-batch.mjs)

Для ускорения генерации одного видеоурока из 50 карточек (563 кадра для анимации 3D-переворота) с ~10 минут до **1–2 минут** внедрен комплекс оптимизаций:

### А. Параллельная предзагрузка озвучки (Parallel TTS Prefetching)
- Перед началом рендеринга видео скрипт парсит всю колоду, вычленяет уникальные тексты для озвучки (целевое слово, перевод, Outro) и отсекает дубликаты.
- Синтез аудио через бесплатный `edge-tts` (обращение к Azure) запускается в параллельном пуле с лимитом конкурентности (8 одновременных запросов). Это нивелирует накладные расходы Windows на запуск процессов Python и ожидания сети.
- Все сгенерированные файлы сохраняются в локальный кэш: [outputs/video-generator/cache/](file:///c:/Users/ramil/Desktop/luna/outputs/video-generator/cache/). Повторные запуски уроков используют 100% локальный кэш (0 секунд на фазу TTS).

### Б. Пакетный рендеринг скриншотов в Playwright
- Вместо поочередного открытия страниц, скрипт запускает Playwright-пул из параллельных виртуальных страниц-воркеров (`screenshot-batch.mjs`). Лимит воркеров ограничен до **4** для предотвращения перегрузки процессора (CPU thrashing) при одновременной сборке двух колод.
- Слайды рендерятся одновременно, что позволяет завершить создание 563 скриншотов высокого разрешения за **~35–45 секунд**.
- Для экономии дисковых операций и ускорения чтения скриншоты сохраняются в формате **JPEG с качеством 98%** (вместо тяжелого PNG), сохраняя идеальную четкость текста.

### В. Аппаратное кодирование видео (Intel QSV Hardware Muxing)
- Сборка видео в FFmpeg переведена с программного кодека `libx264` на аппаратный кодек **Intel QSV** (`-c:v h264_qsv` с пиксельным форматом `nv12` и пресетом `fast`).
- Кодирование полностью переложено на встроенное видеоядро процессора (Intel Iris), снижая нагрузку на CPU до минимума и сокращая время склейки до **10–15 секунд**.

### Г. Особенности производительности на Windows (Фоновый vs Интерактивный режим)
* **Приоритет процессов Windows (CPU & GPU Throttling)**:
  - При запуске сборки вручную в активном окне терминала (Foreground/Interactive) холодная сборка занимает **~2 минуты 15 секунд**.
  - При запуске в качестве фоновой задачи (Background Task/Service) время сборки возрастает до **4–5 минут**. Операционная система Windows автоматически понижает приоритет фоновых процессов для безголовых окон Chromium (Playwright) и кодировщика FFmpeg (Intel QSV), искусственно ограничивая выделяемые им CPU и GPU ресурсы.
* **Накладные расходы на запуск процессов (Process Spawning)**:
  - Скрипт сборщика запускает `ffmpeg` по 2 раза на каждую карточку (всего 100 запусков последовательно) для конвертации скачанных MP3 в WAV (необходимо для получения посемпловой точности длительности аудио).
  - На Windows операция `CreateProcess` является ресурсоемкой и добавляет ~15–20 секунд «чистого» ожидания инициализации исполняемых файлов FFmpeg, в то время как на Linux-системах запуск происходит практически мгновенно.

---

## 6. Визуальные переходы карточек (Card Transition Modes)

Для анимации перехода между показом слова и раскрытием перевода поддерживаются два режима (задаются флагом `--transition`):

### 1. Статический режим (`--transition static` — по умолчанию)
* **Поведение**: Мгновенное переключение состояния карточки.
* **Кадры**:
  1. *Кадр 1*: Карточка по центру показывает только целевое слово.
  2. *Кадр 2*: Карточка мгновенно переключается на состояние с переводом по центру и целевым словом в верхней плашке-теге.

### 2. Режим 3D-переворота (`--transition flip`)
* **Поведение**: Плавный 3D-переворот карточки по оси Y на 180° в стиле реального флип-эффекта.
* **Реализация**:
  * Переворот длится **0.44 секунды** (11 кадров при 25 FPS).
  * Карточка рендерится как двухсторонняя 3D-модель в CSS (`perspective: 1000px`, `backface-visibility: hidden`).
  * Для каждого из 11 кадров скрипт передает конкретный угол поворота (от 0° до 180°), исключая рассинхронизацию времени рендеринга.
  * На отметке 90° (когда карточка расположена ребром к зрителю) происходит невидимая смена содержимого с фронтального (целевое слово) на заднее (перевод + тег целевого слова).

---

## 7. Интеграция с учебниками и правила именования (Textbook Alignment & Naming Rules)

При создании видеоуроков, которые структурированы в соответствии с популярными учебниками для привлечения органического SEO-трафика (например, *Murphy, Genki, Носков*), необходимо соблюдать правила бренда и юридической безопасности:

### А. Формат названий видео
Запрещено использовать прямые утверждения о том, что видео является "официальным курсом" учебника. Названия должны строиться так, чтобы было понятно, что это независимый тренажер:
* **Неправильно:** *«Официальный курс по учебнику Genki Lesson 1»*, *«Английский по Мерфи: Унит 5»*.
* **Правильно:** *«Тренажер к учебнику Genki (Lesson 1) / Грамматика は и です»*, *«Английская грамматика: Present Continuous (в стиле Murphy, Unit 5)»*.

### Б. Обязательный дисклеймер в описании видео
В описание каждого такого видео на YouTube обязательно добавляется сноска:
* **Для русскоязычных видео:** *«FlashcardsLuna является независимым образовательным тренажером. Данные материалы разработаны независимо от авторов и издателей оригинального учебника [Название учебника] и не аффилированы с ними».*
* **Для англоязычных видео:** *«FlashcardsLuna is an independent educational tool. These practice materials are developed independently and are not affiliated with, sponsored by, or endorsed by the authors or publishers of [Textbook Name].»*

Полные правила и дорожная карта интеграции учебников находятся в [Grammar & Textbook Roadmap](grammar-roadmap.md).

---

## 8. Руководство по самостоятельному запуску пакетной сборки (Bulk Build Guide)

Для удобного пакетного запуска генерации видеоуроков по всем целевым языкам без ручной настройки отдельных процессов разработан автоматический CLI-скрипт: [build-all-deck-videos.mjs](file:///c:/Users/ramil/Desktop/luna/scripts/build-all-deck-videos.mjs).

Скрипт автоматически опрашивает базу данных Prisma для выявления активных языков в системе, запускает рендеринг видеопотоков в параллельном режиме (с заданным лимитом concurrency) и самостоятельно заносит успешные результаты в [Video Lessons Registry](video-lessons-registry.md).

### Fresh rerun of the first deck

2026-06-19 rollout decision: the first video deck batch will be started again as a fresh run, as if the video pipeline is just beginning. The first deck is:

```text
home_kitchen_cookware_pilot_01
```

Rules for this rerun:

- Treat older local/GitHub video outputs, downloaded artifacts and registry rows for `home_kitchen_cookware_pilot_01` as historical evidence only.
- Do not infer current publish readiness from old `Pending` rows in [Video Lessons Registry](video-lessons-registry.md).
- Start the first deck again with the current renderer, localized intro/outro, QR course URL, YouTube metadata, thumbnail direction and playlist strategy.
- Run both metadata gates on the fresh artifacts: `npm run check:youtube-metadata -- outputs/video-generator` and `npm run check:youtube-seo-metadata -- outputs/video-generator --output=outputs/video-generator/youtube-seo-metadata-report.json`.
- Keep background music disabled for this first fresh batch. Music is deferred to the second video deck pilot.
- Use new output artifacts and metadata generated by the fresh run as the current evidence.
- After the fresh run, update the human registry and future machine-readable ledger from readback, not from old rows.

### Требования для запуска:
- Установленный Node.js (версии 18 и выше).
- Наличие файлов ffmpeg в системном PATH (или в папке проекта).
- Настроенное окружение Prisma (`schema.prisma` и подключение к БД).

### Шаги для самостоятельного запуска:
1. Откройте терминал в папке проекта:
   `c:\Users\ramil\Desktop\luna`
2. Выполните команду запуска через Node.js с нужными аргументами.

### Примеры команд:

* **Стандартный запуск для всех активных языков** (колода `home_kitchen_cookware_pilot_01` с поддержкой `RU` в 2 параллельных потока):
  ```bash
  node scripts/build-all-deck-videos.mjs
  ```

* **Ограничение сборки только списком конкретных языков** (полезно, если нужно дорендерить или обновить конкретные видео):
  ```bash
  node scripts/build-all-deck-videos.mjs --targets ES,DE,FR,IT
  ```

* **Настройка параллелизма (concurrency)**:
  - `--concurrency 1` — рендерить языки строго по очереди (минимальная нагрузка на CPU).
  - `--concurrency 2` — рендерить по 2 языка одновременно (оптимально для 8-ядерного CPU на Windows).
  ```bash
  node scripts/build-all-deck-videos.mjs --concurrency 2
  ```

* **Сборка видеоуроков для другой колоды** (через `--set`):
  ```bash
  node scripts/build-all-deck-videos.mjs --set <идентификатор_колоды>
  ```

### Доступные флаги CLI:
| Флаг | Значение по умолчанию | Описание |
|---|---|---|
| `--set` | `home_kitchen_cookware_pilot_01` | Идентификатор колоды в БД. |
| `--support` | `RU` | Язык поддержки (на котором озвучивается перевод). |
| `--concurrency` | `2` | Количество параллельных процессов генерации. |
| `--transition` | `flip` | Анимационный переход (`flip` для 3D-переворота, `static` без анимации). |
| `--quiz-limit` | `3` | Количество карточек в проверочном квизе в конце видео. |
| `--targets` | *нет* | Список целевых языков через запятую. Если опущен — берутся все активные языки из БД. |

### Polyglot Mode (Multilingual Decks)

Режим **Polyglot** предназначен для YouTube-видеоуроков, в которых зритель учит несколько иностранных языков одновременно на базе одного языка поддержки. Формат должен выглядеть как FlashcardsLuna video lesson, а не как интерактивный веб-экран: без кнопок `Знаю` / `Не знаю`, без quiz/timer UI and without in-video instructions such as "переведите опорное слово".

#### Схема воспроизведения и recall логика
Для каждого слова из колоды воспроизводится следующая цепочка:
1. **Опорная карточка:** сверху или рядом остается слово на языке поддержки (например, `RU: кухонные весы`). Она нужна как recall anchor и не должна исчезать между целевыми языками.
2. **Карточка целевого языка:** сначала показывается language prompt с флагом и названием языка на языке поддержки или в native label (`English`, `Español`, `Français`). Это короткая пауза, чтобы зритель сам вспомнил перевод.
3. **Flip / reveal:** та же карточка переворачивается или раскрывается и показывает ответ на целевом языке. Транскрипция показывается только по обычной video/export policy: если для языка она learner-facing and non-redundant, а не как обязательный второй ряд для всех языков.
4. **Следующий целевой язык:** для того же опорного слова повторяется prompt -> reveal. После всех языков видео переходит к следующему слову из той же колоды.

Пример цепочки для одной карточки:
`RU support card -> EN prompt -> EN answer -> ES prompt -> ES answer -> DE prompt -> DE answer -> FR prompt -> FR answer`.

#### Стартовые Polyglot-связки
Polyglot-видео не должны строиться как случайные наборы из 54 языковых вариантов. Рабочий план ниже является стартовым source of truth: новые Polyglot-ролики выбирают один bundle из таблицы, а не произвольную ручную комбинацию. По умолчанию используем 3-4 target languages на одно видео; 5 языков допустимы только после отдельной визуальной проверки темпа и читаемости.

| Bundle key | Назначение | Target languages |
| --- | --- | --- |
| `global_europe_core` | Самый массовый стартовый набор для широкой аудитории | `EN, ES, FR, DE` |
| `romance_core` | Романские языки для сравнения похожих слов и форм | `ES, FR, IT, PT` |
| `germanic_core` | Коммерчески понятный германский набор | `EN, DE, NL, SV` |
| `nordic_core` | Северные языки отдельным видео, без смешивания с Балтикой | `SV, NO, DA, FI` |
| `baltic_core` | Балтийские языки отдельным 3-язычным видео | `LT, LV, ET` |
| `east_asia_core` | Восточная Азия | `ZH, JA, KO` |
| `southeast_asia_core` | Юго-Восточная Азия / travel-useful set | `TH, VI, ID, MS` |
| `slavic_core` | Славянские языки, первый компактный набор | `RU, PL, CS, SK` |
| `balkan_slavic_core` | Южнославянский / Балканский набор | `BG, HR, SR, SL` |
| `south_asia_indo_aryan_core` | Южная Азия, индоарийские/соседние языки | `HI, BN, NE, SI` |
| `south_asia_dravidian_core` | Южная Индия, дравидийские языки | `TA, TE, KN, ML` |
| `turkic_core` | Тюркские языки | `TR, AZ, UZ, KK` |
| `caucasus_bridge_core` | Кавказ + соседний bridge-language контекст | `KA, HY, AZ, TR` |

Regional variants (`EN-GB`, `ES-419`, `PT-BR`) сохраняются как отдельные target variants in playlists, metadata and `langs=...`, but they are not default members of the broad starter bundles to avoid teaching near-duplicate regional variants inside the same Polyglot lesson. Use them for region-specific or comparison videos, for example `EN + EN-GB`, `ES + ES-419`, `PT + PT-BR`, or swap `ES -> ES-419` / `PT -> PT-BR` when the support channel's audience is better served by the regional target.

If `supportLang` is already present in a bundle, remove it from `targets` and fill the gap with the nearest fallback from the same family. Examples: for `support=DE` and `global_europe_core`, use `EN, ES, FR, IT`; for `support=RU` and `slavic_core`, use `PL, CS, SK, BG`; for `support=EN` and `germanic_core`, use `DE, NL, SV, NO`.

2026-07-02 accepted `romance_core` fallback policy: keep `ES, FR, IT, PT` as the visible Romance set, and use `RO` as the configured same-family fallback when the support language is already one of those targets. Under the 2026-07-07 support/native rule, new shared-channel launches must use `support=ES-419` and `support=PT-BR` instead of `support=ES` or `support=PT`; do not use `EN` or `DE` as the default fallback for this bundle.

2026-07-01 accepted `east_asia_core` fallback policy: keep `ZH, JA, KO` as the bundle targets, but use `VI` before `EN` as fallback. This makes `support=JA` resolve to `ZH, KO, VI` for the next eligible-channel `home_kitchen_cookware_pilot_01` wave, avoiding a Japanese-to-Japanese target and avoiding the less coherent `EN` fallback.

**Current production completeness contract (2026-07-13):** every selected long-video deck has exactly four required Polyglot slots per canonical support channel: `global_europe_core`, `romance_core`, `east_asia_core` and `slavic_core`. This ordered list is machine-readable as `config/polyglot-video-bundles.json.defaults.productionBundleKeys`. Other catalog bundles remain optional expansion and are not counted as publication tails until the product policy is explicitly changed.

Recommended rollout order:

1. **Wave 1 / flagship:** `global_europe_core`, `romance_core`, `east_asia_core`, `slavic_core`, `southeast_asia_core`.
2. **Wave 2 / family expansion:** `germanic_core`, `nordic_core`, `balkan_slavic_core`, `south_asia_indo_aryan_core`, `south_asia_dravidian_core`.
3. **Wave 3 / niche but coherent:** `turkic_core`, `caucasus_bridge_core`, `baltic_core`.

Do not generate every bundle for every support language at once. Start with one visually approved no-audio pilot on `global_europe_core`, then produce the same deck for the first priority support channels before expanding to Wave 2/3.

#### Production scope: decks, support languages and bundles
Polyglot is an additional YouTube campaign layer, not a replacement for the existing ordinary single-target video pipeline.

Do **not** start by generating `all decks x all support languages x all Polyglot bundles`. With 180 ordinary decks, 51 public support channels and 13 starter bundles, that would create an uncontrolled backlog before performance is proven. The accepted rollout shape is:

1. **Per selected deck, prove one bundle first.** Start with `global_europe_core` on one visually approved support language and no-audio preview, then render with audio only after visual/timing approval.
2. **Per selected deck, expand by support channel.** After the pilot is approved, create the same Wave 1 flagship bundle for the first priority support channels. Treat this as one Polyglot video per support channel, not all bundles per support channel.
3. **Per selected deck, expand by bundle wave.** Add the other Wave 1 bundles only after the first bundle is stable. Wave 2/3 bundles are campaign expansions, not the default first pass.
4. **Across decks, follow ordinary deck priority.** Do not jump to all 180 decks. Use the same deck priority as the normal video pipeline: first current/fresh YouTube deck batches, then next ordinary deck waves.
5. **Long-term target.** Once retention/click/readback is healthy, each priority deck can have Polyglot coverage for every public support channel, but the first production unit remains `deck + support channel + one selected bundle`.

#### Intro/outro site CTA
Every Polyglot video must advertise that the viewer can change the language combination on the site. This is part of the format, not optional copy.

Intro CTA requirements:

- show a short localized line in the support language near the beginning, after the title/first visual beat;
- communicate the feature, not instructions-heavy UI text;
- keep it short enough not to delay the first card.

Default English source copy for localization:

```text
Learn several languages at once. On FlashcardsLuna, you can choose your own language mix.
```

Outro CTA requirements:

- show `flashcardsluna.com` and, when QR is available, a QR/link to the same deck/study route;
- say that the viewer can add/remove languages and continue the same deck on the site;
- localize the line to the support language;
- do not imply that the YouTube video contains every possible combination.

Default English source copy for localization:

```text
Want another language mix? Open this deck on FlashcardsLuna and choose the languages you want to study together.
```

#### Запуск генерации
Для генерации видео в режиме Polyglot разработан скрипт [build-polyglot-video.mjs](file:///Users/lali/Documents/LUNA2/scripts/build-polyglot-video.mjs), использующий специализированный HTML-шаблон [polyglot-slide-template.mjs](file:///Users/lali/Documents/LUNA2/scripts/lib/polyglot-slide-template.mjs).

Пример команды запуска:
```bash
node scripts/build-polyglot-video.mjs --set home_kitchen_cookware_pilot_01 --support RU --targets EN,ES,DE,FR
```

#### GitHub Actions publish contour
Polyglot publishing must stay separate from the ordinary single-target YouTube workflow.

Target source-of-truth workflows; the mixed campaign remains local until its exact branch is committed, pushed and integrated:

- `.github/workflows/youtube-polyglot-video-publish.yml` - one Polyglot video for one `set_id + support + bundle`.
- `.github/workflows/youtube-publication-campaign.yml` - primary mixed ordinary + Polyglot 51-channel campaign; all assignments/slots are claimed first, campaign identity automatically disables child persistence, and one parent finalizer persists receipts.
- `.github/workflows/youtube-polyglot-bulk-publish-dispatcher.yml` - legacy/specialized Polyglot-only launcher; do not use it for a mixed campaign that must be globally atomic.
- `.github/workflows/youtube-polyglot-playlist-insert-repair.yml` - playlist-only repair for an already uploaded Polyglot video.

Do not use `.github/workflows/youtube-video-publish.yml` for Polyglot. Ordinary videos use `config/youtube-published-videos.json`; Polyglot uses separate publication ledgers:

- `config/youtube-polyglot-published-videos.json`
- `config/youtube-polyglot-progress.json`
- `config/youtube-polyglot-playlists.json`
- shared physical calendar: `config/youtube-publish-calendar.json`

The Polyglot idempotency key is:

```text
polyglot:{setId}:{supportLang}:{bundleKey}:{targetsHash}
```

Dispatcher reports and GitHub artifacts are operational evidence, not the durable source of truth. Standalone workflows keep their own persist jobs. The mixed campaign instead merges every child artifact once in one finalizer and requires all receipts before `finalized`. If a later bounded readback proves an accepted upload missing from durable state, the correct separately approved action is artifact/API reconciliation, not a second upload.

The mixed campaign also owns playlist idempotency. The four-route read-only control workflow builds `config/youtube-playlist-discovery-snapshot.json` from complete `playlists.list(mine=true)` plus `playlistItems.list` pagination. Each campaign assignment must resolve to one live playlist ID through durable ID, stable key marker, exact deterministic title or known source-video membership, or be `verified_absent` under the complete identity inventory. A blank local ID alone never permits create. Immediately before any approved `playlists.insert`, the uploader repeats the owned-playlist readback; one match is reused, multiple matches block, and only complete no-match creates a playlist with a stable key marker. Campaign finalization additionally requires both `youtubePlaylistId` and `playlistItemId` for every uploaded video.

`npm run check:youtube-polyglot-state` is the local fail-closed registry gate for Polyglot state. It verifies that active Polyglot publication rows have `videoType=polyglot`, a valid `polyglotKey`, bundle/target hash fields, `POLYGLOT__...` playlist keys, matching Polyglot playlist rows and matching progress items. Run it after state recovery and before launching a dependent bundle wave:

```bash
npm run check:youtube-polyglot-state -- --set=home_kitchen_cookware_pilot_01 --bundle=global_europe_core
```

2026-06-30 repair note: successful `SW`, `TR`, `TH` and `PT` uploads for `home_kitchen_cookware_pilot_01` + `global_europe_core` were originally stored with ordinary playlist keys by the shared uploader. The current uploader is `videoType=polyglot` aware and writes Polyglot playlist/progress/publication state; the merge helper can also fill/repair Polyglot identity fields from future artifacts. Do not treat an ordinary playlist key inside `config/youtube-polyglot-playlists.json` or `config/youtube-polyglot-published-videos.json` as acceptable state.

2026-06-30 user-confirmed completed first eligible-channel `global_europe_core` subset for `home_kitchen_cookware_pilot_01`:

| Support channel | Viewer learns | Video |
| --- | --- | --- |
| `RU` | `EN`, `ES`, `FR`, `DE` | https://www.youtube.com/watch?v=LPqJjLfNoJk |
| `EN` | `ES`, `FR`, `DE`, `IT` | https://www.youtube.com/watch?v=Vb8Q1ryU4iE |
| `ES` | `EN`, `FR`, `DE`, `IT` | https://www.youtube.com/watch?v=k5lNuHEVD1c |
| `PT` | `EN`, `ES`, `FR`, `DE` | https://www.youtube.com/watch?v=W9YogLcE9y4 |
| `JA` | `EN`, `ES`, `FR`, `DE` | https://www.youtube.com/watch?v=1kLbszU-80w |
| `TR` | `EN`, `ES`, `FR`, `DE` | https://www.youtube.com/watch?v=-sRdCfoQOxk |
| `TH` | `EN`, `ES`, `FR`, `DE` | https://www.youtube.com/watch?v=h0WZwIlstZI |
| `NE` | `EN`, `ES`, `FR`, `DE` | https://www.youtube.com/watch?v=kdiwJhOtAGw |
| `SW` | `EN`, `ES`, `FR`, `DE` | https://www.youtube.com/watch?v=oOy7NcwDQEY |

Single-video safe plan from GitHub UI:

```text
Workflow: YouTube Polyglot Video Publish
Branch: main
mode: plan
set_id: home_kitchen_cookware_pilot_01
support: RU
bundle: global_europe_core
limit: 3
allow_republish: false
```

Single-video full public apply requires all explicit confirmations:

```text
Workflow: YouTube Polyglot Video Publish
Branch: main
mode: apply
set_id: home_kitchen_cookware_pilot_01
support: RU
bundle: global_europe_core
limit: 0
allow_republish: false
privacy: public
create_playlists: true
generate_thumbnails: true
confirm_render: RENDER_POLYGLOT_VIDEO
confirm_tts: GENERATE_TTS_AUDIO
confirm_metadata_spend: GENERATE_POLYGLOT_METADATA
confirm_thumbnail_spend: GENERATE_THUMBNAILS
confirm_youtube_write: APPLY_POLYGLOT_YOUTUBE_UPLOAD
confirm_public: PUBLISH_PUBLIC
```

`mode=apply` spends real resources: TTS/provider usage, VectorEngine/Gemini metadata, optional VectorEngine thumbnails and YouTube Data API quota.

Current rule (superseding the historical proxy below): custom-thumbnail permission and full-video permission are independent. `customThumbnailUploadAllowed=false` forbids custom-cover generation/upload only; it does not decide the support's Polyglot scope. The workflow uses `generate_thumbnails=false` and YouTube automatic thumbnail fallback when custom covers are unavailable.

Full-scope Polyglot planning includes canonical supports only when both `longVideoUploadAllowed=true` and no-spend video-production readiness are present. For false/unknown `longVideoUploadAllowed`, the planner changes requested `full` to measured `short_unverified` before claim; it does not render a known-impossible full product. For a blocked production provider, the support is recorded as a visible deferred tail without calendar claim, metadata, TTS or render. Custom-thumbnail permission never creates either exception.

2026-07-13 update: the user explicitly confirmed advanced features/custom video and playlist thumbnails for `UZ` / `@lunacardsuzbek`, `SI` / `@LunaCardsSinhala`, and `KA` / `@lunacardsgeorgian`. These three channels now use `customThumbnailUploadAllowed=true` and `thumbnailFallbackMode=custom_when_available`. This supersedes the historical `thumbnails.set forbidden` and 2026-07-05 Georgian-pending notes. The confirmation permits future thumbnail upload only; it is not evidence that a specific existing video or playlist already has a custom image.

For every other support channel, `customThumbnailUploadAllowed=false` or an unknown value disables custom-cover creation/upload only. The workflow uses YouTube automatic thumbnail fallback and must not call `thumbnails.set`. `longVideoUploadAllowed=true` permits full videos longer than `895s`; false/unknown plans the same bundle as measured `short_unverified` with the `895s` cap before claim.

Short rule: `content_scope=short_unverified` is used either by an explicit deliberately truncated request or by the recorded pre-claim fallback for a support without long-video permission. It stays under YouTube's default 15-minute limit for accounts/channels that may not have advanced features. Historical first-deck short rows remain valid publication history but do not satisfy a full slot. All future short campaigns use `shortUnverifiedPolyglotCardLimit=0`, which measures the full candidate deck and selects the largest contiguous prefix that fits `max_duration_seconds=895` (`14:55`). The workflow runs `npm run check:polyglot-video-duration` after rendering as a defence-in-depth gate: legacy/manual full claims on unconfirmed channels are blocked above `895s`, confirmed channels may exceed it, and short videos are always blocked above the cap. Short videos use separate progress/playlist keys, but an active full row is a hard preflight blocker for a short and an active short is a hard preflight blocker for a full. Short unverified uploads use YouTube automatic thumbnail fallback and must not call `thumbnails.set`.

Current short_unverified completed state for `home_kitchen_cookware_pilot_01` + `global_europe_core`:

| Support channel | Viewer learns | Words | Duration | Thumbnail | Video | GitHub run |
| --- | --- | ---: | ---: | --- | --- | --- |
| `AZ` | `EN`, `ES`, `FR`, `DE` | `30` | `862.52s` (`14:22.52`) | `first_frame_auto` | https://www.youtube.com/watch?v=9Et4FZ4kL8k | `28451476837` |
| `BG` | `EN`, `ES`, `FR`, `DE` | `30` | `860.48s` (`14:20.48`) | `first_frame_auto` | https://www.youtube.com/watch?v=OyScukpJbx4 | `28449980062` |
| `BN` | `EN`, `ES`, `FR`, `DE` | `30` | `858.48s` (`14:18.48`) | `first_frame_auto` | https://www.youtube.com/watch?v=QrQLnx3OhTM | `28452608879` |
| `CS` | `EN`, `ES`, `FR`, `DE` | `30` | `861.20s` (`14:21.20`) | `first_frame_auto` | https://www.youtube.com/watch?v=R9G8UfoiIFo | `28451403524` |
| `DA` | `EN`, `ES`, `FR`, `DE` | `30` | `862.96s` (`14:22.96`) | `first_frame_auto` | https://www.youtube.com/watch?v=I1IjSfwca9w | `28451386879` |
| `DE` | `EN`, `ES`, `FR`, `IT` | `30` | `871.40s` (`14:31.40`) | `first_frame_auto` | https://www.youtube.com/watch?v=UI3o1n2siyc | `28449909823` |
| `ET` | `EN`, `ES`, `FR`, `DE` | `30` | `855.04s` (`14:15.04`) | `first_frame_auto` | https://www.youtube.com/watch?v=QqG-zOmT1Fk | `28451433822` |
| `FI` | `EN`, `ES`, `FR`, `DE` | `30` | `866.80s` (`14:26.80`) | `first_frame_auto` | https://www.youtube.com/watch?v=dMbpOucVFZE | `28451395045` |
| `FR` | `EN`, `ES`, `DE`, `IT` | `30` | `869.12s` (`14:29.12`) | `first_frame_auto` | https://www.youtube.com/watch?v=HKk2f0h3QqU | `28449918196` |
| `HI` | `EN`, `ES`, `FR`, `DE` | `30` | `864.44s` (`14:24.44`) | `first_frame_auto` | https://www.youtube.com/watch?v=4_d417ux95Q | `28449925808` |
| `HR` | `EN`, `ES`, `FR`, `DE` | `30` | `860.52s` (`14:20.52`) | `first_frame_auto` | https://www.youtube.com/watch?v=qrihrFI8qqg | `28449988276` |
| `HU` | `EN`, `ES`, `FR`, `DE` | `30` | `860.36s` (`14:20.36`) | `first_frame_auto` | https://www.youtube.com/watch?v=AwluQyQ8M7Q | `28452591356` |
| `HY` | `EN`, `ES`, `FR`, `DE` | `30` | `843.64s` (`14:03.64`) | `first_frame_auto` | https://www.youtube.com/watch?v=gdLcuwyNEu0 | `28452659078` |
| `ID` | `EN`, `ES`, `FR`, `DE` | `30` | `872.52s` (`14:32.52`) | `first_frame_auto` | https://www.youtube.com/watch?v=ynLZY1X6Lqg | `28449933479` |
| `IS` | `EN`, `ES`, `FR`, `DE` | `30` | `854.92s` (`14:14.92`) | `first_frame_auto` | https://www.youtube.com/watch?v=dllen8elefE | `28451442387` |
| `IT` | `EN`, `ES`, `FR`, `DE` | `30` | `872.76s` (`14:32.76`) | `first_frame_auto` | https://www.youtube.com/watch?v=iWHpatyCszU | `28452667311` |
| `KA` | `EN`, `ES`, `FR`, `DE` | `30` | `864.32s` (`14:24.32`) | `first_frame_auto` | https://www.youtube.com/watch?v=5FDrn10zFVI | `28452651110` |
| `KK` | `EN`, `ES`, `FR`, `DE` | `30` | `856.80s` (`14:16.80`) | `first_frame_auto` | https://www.youtube.com/watch?v=Pn3beNb8aX0 | `28451468025` |
| `KM` | `EN`, `ES`, `FR`, `DE` | `30` | `855.76s` (`14:15.76`) | `first_frame_auto` | https://www.youtube.com/watch?v=NCncHyx2DgI | `28452632555` |
| `KN` | `EN`, `ES`, `FR`, `DE` | `30` | `861.00s` (`14:21.00`) | `first_frame_auto` | https://www.youtube.com/watch?v=nUSUmP3VnCU | `28450037559` |
| `KO` | `EN`, `ES`, `FR`, `DE` | `30` | `871.80s` (`14:31.80`) | `first_frame_auto` | https://www.youtube.com/watch?v=qPn-Fl-osNE | `28451363203` |
| `LO` | `EN`, `ES`, `FR`, `DE` | `30` | `856.20s` (`14:16.20`) | `first_frame_auto` | https://www.youtube.com/watch?v=A7sRDRHFxA0 | `28453930946` |
| `LT` | `EN`, `ES`, `FR`, `DE` | `30` | `873.84s` (`14:33.84`) | `first_frame_auto` | https://www.youtube.com/watch?v=F2giOB-J4N0 | `28451412686` |
| `LV` | `EN`, `ES`, `FR`, `DE` | `30` | `863.44s` (`14:23.44`) | `first_frame_auto` | https://www.youtube.com/watch?v=byoSnCVMayc | `28451421508` |
| `ML` | `EN`, `ES`, `FR`, `DE` | `30` | `856.60s` (`14:16.60`) | `first_frame_auto` | https://www.youtube.com/watch?v=sdtE0erlbgw | `28451452153` |
| `MS` | `EN`, `ES`, `FR`, `DE` | `30` | `868.72s` (`14:28.72`) | `first_frame_auto` | https://www.youtube.com/watch?v=S5-PhbQXzqU | `28449949569` |
| `MY` | `EN`, `ES`, `FR`, `DE` | `30` | `854.68s` (`14:14.68`) | `first_frame_auto` | https://www.youtube.com/watch?v=M7kl3T-lzZk | `28452624678` |
| `NL` | `EN`, `ES`, `FR`, `DE` | `30` | `864.68s` (`14:24.68`) | `first_frame_auto` | https://www.youtube.com/watch?v=BLY1lDMs3O4 | `28449958457` |
| `NO` | `EN`, `ES`, `FR`, `DE` | `30` | `866.48s` (`14:26.48`) | `first_frame_auto` | https://www.youtube.com/watch?v=3BZaKclFS9Q | `28451378967` |
| `PL` | `EN`, `ES`, `FR`, `DE` | `30` | `865.44s` (`14:25.44`) | `first_frame_auto` | https://www.youtube.com/watch?v=NohlWuNRoqU | `28448071203` |
| `RO` | `EN`, `ES`, `FR`, `DE` | `30` | `867.60s` (`14:27.60`) | `first_frame_auto` | https://www.youtube.com/watch?v=rZvle25gdk8 | `28452599188` |
| `SI` | `EN`, `ES`, `FR`, `DE` | `30` | `856.16s` (`14:16.16`) | `first_frame_auto` | https://www.youtube.com/watch?v=z8aI7yDvoDI | `28450013699` |
| `SK` | `EN`, `ES`, `FR`, `DE` | `30` | `859.72s` (`14:19.72`) | `first_frame_auto` | https://www.youtube.com/watch?v=o88-dJK0r5k | `28452582614` |
| `SL` | `EN`, `ES`, `FR`, `DE` | `30` | `865.84s` (`14:25.84`) | `first_frame_auto` | https://www.youtube.com/watch?v=eWRZJMaRROo | `28450005359` |
| `SR` | `EN`, `ES`, `FR`, `DE` | `30` | `869.80s` (`14:29.80`) | `first_frame_auto` | https://www.youtube.com/watch?v=hSwe2oR0-KE | `28449997013` |
| `SV` | `EN`, `ES`, `FR`, `DE` | `30` | `878.48s` (`14:38.48`) | `first_frame_auto` | https://www.youtube.com/watch?v=dIvMGHfRbdo | `28449968305` |
| `TA` | `EN`, `ES`, `FR`, `DE` | `30` | `845.48s` (`14:05.48`) | `first_frame_auto` | https://www.youtube.com/watch?v=QwjEQzSYMTg | `28450021787` |
| `TE` | `EN`, `ES`, `FR`, `DE` | `30` | `839.88s` (`13:59.88`) | `first_frame_auto` | https://www.youtube.com/watch?v=PAvoNVtCsu4 | `28450029529` |
| `TL` | `EN`, `ES`, `FR`, `DE` | `30` | `856.84s` (`14:16.84`) | `first_frame_auto` | https://www.youtube.com/watch?v=DAhTVVB2XiE | `28452616355` |
| `UZ` | `EN`, `ES`, `FR`, `DE` | `30` | `861.80s` (`14:21.80`) | `first_frame_auto` | https://www.youtube.com/watch?v=FPuntSbNNMo | `28451459940` |
| `VI` | `EN`, `ES`, `FR`, `DE` | `30` | `859.16s` (`14:19.16`) | `first_frame_auto` | https://www.youtube.com/watch?v=_FuvQtu6aRM | `28449941859` |
| `ZH` | `EN`, `ES`, `FR`, `DE` | `30` | `855.24s` (`14:15.24`) | `first_frame_auto` | https://www.youtube.com/watch?v=VNHUmL-Sx8c | `28451370832` |

Short_unverified wave progress: `42/42` complete, `0/42` remaining. This table must be updated from durable state after each successful short_unverified publish, not from planned or in-progress GitHub runs.

Bulk safe plan from GitHub UI:

```text
Workflow: YouTube Polyglot Bulk Publish Dispatcher
Branch: main
set_id: home_kitchen_cookware_pilot_01
mode: dry_run
supports: ALL
support_source: channel-keys
bundle: global_europe_core
english_bundle: same_as_bundle
bundle_overrides: NONE
max_parallel: 4
exclude_supports: NONE
privacy: public
dispatch_spacing_seconds: 5
playlist_retry_delay_seconds: 180
```

Bulk apply must be used conservatively. Default `max_parallel=4` is intentional: higher values can overload GitHub Actions/API readback, TTS and YouTube quota accounting. Do not set `max_parallel=20` for Polyglot unless a previous wave completed cleanly and the run owner explicitly accepts the risk.

Bulk public apply requires:

```text
mode: dispatch
confirm_dispatch: DISPATCH_YOUTUBE_POLYGLOT_BULK
confirm_render: RENDER_POLYGLOT_VIDEO
confirm_tts: GENERATE_TTS_AUDIO
confirm_metadata_spend: GENERATE_POLYGLOT_METADATA
confirm_youtube_write: APPLY_POLYGLOT_YOUTUBE_UPLOAD
confirm_thumbnail_spend: GENERATE_THUMBNAILS
confirm_public: PUBLISH_PUBLIC
confirm_playlist_repair: APPLY_YOUTUBE_PLAYLIST_INSERT
```

`english_bundle=same_as_bundle` is the safe default: `--bundle=romance_core` must also plan `romance_core` for `EN`. Choose a concrete `english_bundle` only for an intentional, explicit EN exception. For `support=EN`, `global_europe_core` resolves visible targets to `ES,FR,DE,IT` after removing English. `EN-GB` is a target/studied variant only and must not be dispatched as a support/native row. For Russian canary with `bundle=global_europe_core`, expected targets are `EN,ES,FR,DE`.

Local dry-run equivalent before a broad GitHub launch:

```bash
npm run dispatch:youtube-polyglot-bulk-publish -- \
  --set=home_kitchen_cookware_pilot_01 \
  --supports=RU,EN \
  --support-source=variants \
  --bundle=global_europe_core \
  --english-bundle=same_as_bundle \
  --max-parallel=4 \
  --planner-timeout-ms=120000 \
  --dry-run \
  --output=outputs/youtube-polyglot-bulk-plan.json
```

Mandatory recovery rules:

- `state_persist_failed` means the upload job may have succeeded but Git state did not persist. Do not rerun `apply` for that support/bundle. Recover the exact child artifacts with `npm run recover:youtube-polyglot-state -- --run-ids=<run_id>` only after readback confirms the upload identity.
- `uploaded_public_playlist_insert_pending`, `playlist item readback pending` or similar `playlistItems` propagation errors are playlist-only repair candidates. Use `youtube-polyglot-playlist-insert-repair.yml`; do not re-render or reupload the video.
- Edge TTS `NoAudioReceived` / `edge-tts failed` before upload is a render failure. Stop and report it; a rerun requires separate approval and proof that no YouTube video id exists.
- For Armenian HY AI33 TTS, a temporary status-API error is not proof that the provider task was lost: renderer retries transient status readback and persists a non-secret task ledger beside the hash-addressed audio cache. An exact recovery resumes that task/cache only after matching immutable set/support and a target subset of the original shard; it never reuses MP4, metadata, schedule or YouTube receipts and does not bypass the usual preflight/apply gate.
- For a temporary YouTube playlist write error, do not re-upload the video: `playlistItems.insert` first checks whether that exact `playlistId + videoId` has already appeared, then performs bounded retry only when it is absent. Campaign workers keep bounded API retry enabled; an exhausted repair is recorded as playlist-pending rather than becoming a duplicate video upload.
- An exact recovery may use an explicit route plus support-scoped read-only control (for example `youtube-4` + `HY`) when an unrelated channel on the same route has stale provider state. This is evidence only for the selected assignments: it cannot persist a global snapshot or authorize a new broad campaign.
- `quotaExceeded`, OAuth channel mismatch, metadata language gates, URL completeness gates and support/target separation gates are hard stops for the affected route/support until the root cause is fixed. `customThumbnailUploadAllowed !== true` is only a hard stop for custom-thumbnail generation/upload; the video may continue with the accepted automatic-thumbnail fallback.
- Each successful child owns its artifact-backed durable-state merge. The bulk parent must not perform immediate child recovery or infer upload failure from a still-running child; use one later bounded readback and recover only exact completed artifacts when needed.

Minimum post-run readback:

```bash
gh run view <dispatcher_run_id> --repo webpot-ru/luna --json status,conclusion,jobs,url,headSha
npm run check:polyglot-video-localization
npm run check:youtube-polyglot-state
npm run plan:youtube-polyglot -- --set home_kitchen_cookware_pilot_01 --support RU --bundle global_europe_core --require-offline-deck
```

For completed upload waves, inspect `config/youtube-polyglot-published-videos.json` and `config/youtube-polyglot-progress.json` first. Do not infer completion from the dispatcher summary alone if child persist jobs or recovery commits were still running.

Before launching `romance_core` for the first-deck eligible-channel wave, use the approved fallback policy already recorded in `config/polyglot-video-bundles.json`: `romance_core.fallbackLangs = ["RO"]`. Apply the 2026-07-07 support/native rule before dispatch: canonical shared-channel support rows are `ES-419` and `PT-BR`, while `ES` and `PT` remain target/studied variants.

#### Дополнительные флаги CLI
Скрипт `build-polyglot-video.mjs` поддерживает следующие флаги:
* `--set <set_id>` — идентификатор колоды (по умолчанию `home_kitchen_cookware_pilot_01`).
* `--support <lang_code>` — язык поддержки (по умолчанию `RU`).
* `--targets <langs>` — изучаемые языки через запятую (например, `EN,ES,DE,FR`).
* `--limit <number>` — ограничение количества обрабатываемых карточек только для preview/review-сборок; production default is full deck (`--limit 0`).
* `--no-audio` — режим быстрой сборки без обращения к генератору TTS (все озвучки заменяются файлами тишины, полезно для визуального тестирования верстки).

#### Длина видео и полный состав колоды
Для обычных тематических колод на ~30-40 слов Polyglot-видео должно включать все слова из колоды, как и single-target deck video pipeline. Для `global_europe_core` на 4 target languages это может давать ролик длиннее 20 минут с озвучкой и паузами, поэтому Polyglot publish разрешен только на каналах с подтвержденными advanced features / custom thumbnails.

Для больших курсовых выпусков на 150/300 слов не делать одно Polyglot-видео на весь файл: разбивать на части по 25-40 слов или использовать уже существующую part/lesson структуру. Иначе 4-язычный Polyglot превращается в 60+ минут пассивного видео, хуже удерживает внимание и сложнее проверяется перед публикацией.

Сгенерированное видео и кэш-файлы сохраняются в директории `outputs/video-generator/home_kitchen_cookware_pilot_01_polyglot_ru/`.
