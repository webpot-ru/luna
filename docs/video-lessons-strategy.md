# Video Lessons Strategy & Specifications

Этот документ фиксирует архитектуру, спецификации генерации и стратегию дистрибуции видеоуроков FlashcardsLuna на YouTube для привлечения поискового трафика на [flashcardsluna.com](https://flashcardsluna.com/). Список всех сгенерированных уроков и ссылки на них ведутся в [Video Lessons Registry](video-lessons-registry.md).

Статус: **Source of Truth**. Любые изменения в дизайне, структуре звука или дистрибуции видео должны фиксироваться здесь.

---

## 1. Стратегия дистрибуции на YouTube (YouTube Distribution)

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

Do not put local paths, token paths, OAuth/client-secret strings, contact-email secrets, `.local` paths or `.secrets` paths into channel descriptions or the Google Sheet. Do not make Portuguese, Spanish or English descriptions region-only unless the channel is intentionally split later; current shared channels cover `PT/PT-BR`, `ES/ES-419` and `EN/EN-GB`.

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

Per-channel upload-token collection: `npm run plan:youtube-channel-tokens` builds the current 51-channel public support-language checklist from `config/language-order.json`, collapsing the 54 deck variants to 51 public channel paths (`EN-GB -> EN`, `ES-419 -> ES`, `PT-BR -> PT`). The token files required by future GitHub/YouTube upload automation are local secrets under `.local/youtube-oauth/tokens/<channel-key>.json` or the per-channel `oauthTokenFile` path recorded in `config/youtube-channels.json`; they must never be committed or printed. On 2026-06-20 the 12 configured priority support channels (`EN`, `RU`, `ES/ES-419`, `PT/PT-BR`, `HI`, `ID`, `FR`, `DE`, `JA`, `KO`, `TR`, `ZH`) had `channelId` values written to `config/youtube-channels.json` and matching local token files API-readback verified under `.local/youtube-oauth/tokens/`. The manual OAuth inventory loop recorded 39 additional Brand Channels, then `scripts/assign-youtube-channel-languages.mjs` assigned all 39 to the remaining public support-language slots and updated `config/youtube-channels.json`, `config/youtube-channel-inventory.json` and the assignment report. The temporary next OAuth slot `unassigned-048` was stopped because all 51 known channels were already recorded. The current token checklist readback is: 51 configured public support channels, 51 existing local token files or configured `oauthTokenFile` references, 39 assigned inventory channels and 0 unassigned inventory channels. Next work is channel profile finishing, not more OAuth inventory or language assignment unless new Brand Channels are created. Use `npm run plan:youtube-channel-branding` for dry-run validation. API branding writes for banner/description/watermark require explicit confirmation; channel name, handle, avatar, contact email and profile links remain manual YouTube Studio/browser fields. Record & Replay plus Computer Use can help with repeated browser picker/consent/Studio flows if new channels are created later; do not record passwords, 2FA codes, API keys, or token file contents.

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
- `.github/workflows/youtube-video-publish.yml` can generate thumbnails after video/metadata creation when `generate_thumbnails=true`, but requires explicit `confirm_thumbnail_spend=GENERATE_THUMBNAILS` because custom thumbnails spend VectorEngine image credits. As of 2026-06-26, the thumbnail path is fail-closed: `generate_thumbnails=true` does not mean "generate images for every channel"; image generation is skipped unless the channel has `customThumbnailUploadAllowed=true`, and skipped channels use YouTube automatic thumbnails. As of 2026-06-27, the confirmed custom-thumbnail allowlist in `config/youtube-channels.json` is `en`, `ru`, `es`, `pt`, `ja`, `tr`, `th`, `ne` and `sw`; other channels must stay `false` or unset until a successful `thumbnails.set` readback proves permission. The workflow builds `outputs/video-generator/youtube-thumbnail-review-github.{json,csv,html,svg}` after thumbnail validation and before metadata/SEO/publish gates when thumbnail processing is enabled. In `mode=apply`, publish planning allows candidates without custom thumbnails only when they are explicitly marked `thumbnailUploadMode=first_frame_auto`.
- `.github/workflows/youtube-thumbnail-set.yml` is the thumbnail-only repair/test workflow for already uploaded videos. It does not render or upload video and does not create playlists. It downloads an existing successful Actions `source_run_id`, locates the matching `youtube_metadata.json`, and either uses adjacent `youtube_thumbnail.jpg` or, when `generate_if_missing=true` and `confirm_thumbnail_spend=GENERATE_THUMBNAILS`, generates the missing thumbnail through VectorEngine on GitHub before calling only `youtube.thumbnails.set` through `npm run set:youtube-thumbnail`. GitHub repair generation installs `ffmpeg` before normalization and uploads evidence that includes the matched metadata, generated thumbnail, generation report, ledger and non-secret config snapshots, so a quota-failed repair can be inspected or retried without blind regeneration. Live use requires `confirm_youtube_write=SET_YOUTUBE_THUMBNAIL`, spends VectorEngine credits when generation is enabled, and still spends YouTube Data API quota for `thumbnails.set`.
- Source helper: `scripts/lib/vectorengine-image.mjs`. Generator: `scripts/generate-youtube-thumbnails.mjs`. Hard gate: `scripts/check-youtube-thumbnails.mjs`. Visual review bundle: `scripts/build-youtube-thumbnail-review-sheet.mjs`.

### 1.3. Playlist architecture

Status: **accepted implementation contract for YouTube playlist planning and upload automation**. New work should follow this path unless the user explicitly approves a revised strategy and this document plus [Decision Log](decision-log.md) are updated in the same cycle.

Playlist strategy must optimize for viewer clarity, channel growth and automation safety, not for mirroring every generated file. Current DB/readback on 2026-06-19 shows:

- `content_sets`: 42 ordinary thematic deck sets across `Home`, `Food & Eating`, `Core Foundation`, `Time`, `Shopping`, and adjacent domains;
- isolated course tables outside ordinary deck sets: `oxford_vocabulary_*` (1,197 source rows / 5 releases in current local DB), `hsk_classic_*` (5,000 rows / 6 releases), `hsk3_*` (6,800 rows / 7 releases), and `spanish_a1_*` (1,800 rows / 6 releases);
- active target/support language universe: 54 active language variants;
- localized course/deck titles, descriptions, modules and categories live in `content_set_localizations`, so playlist titles, thumbnail copy and descriptions must use localized metadata when available, not internal `content_sets.set_name`.

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
4. **Phase D - public publish.** Production uploads are public by default after the workflow gates pass. For paced channel rollout, use scheduled YouTube publication: upload as `private` with `status.publishAt`, then YouTube makes the video public at the scheduled time. `private`/`unlisted` without `publishAt` remain available only for explicit canaries, copyright checks or manual pre-publication review.

2026-06-20 implementation status:

- `config/youtube-playlists.json` is the structured playlist registry. It stores `playlist_key`, support/target language, course family, level/track, channel id, eventual YouTube playlist id, title/description and readback status. Do not prefill every possible language pair; add planned entries from real upload candidates.
- `scripts/lib/youtube-playlists.mjs` computes stable playlist assignments without importing the heavy video renderer. New `youtube_metadata.json` files generated through `scripts/generate-youtube-metadata.mjs` now include `playlist_key`, `playlistKey` and a `playlist` object.
- `npm run check:youtube-playlist-naming` is the cheap regression test for playlist naming and regional-variant routing. It blocks accidental collapse of `ES`/`ES-419`, `PT`/`PT-BR` and `EN`/`EN-GB` target playlists, verifies that their titles stay distinct, verifies that shared support variants resolve to one channel (`ES/ES-419 -> es`, `PT/PT-BR -> pt`, `EN/EN-GB -> en`), and checks the playlist registry for duplicate keys with conflicting meanings.
- `npm run check:youtube-metadata` warns on historical metadata without `playlist_key`, but blocks a present mismatched key.
- `npm run check:youtube-seo-metadata -- outputs/video-generator --output=outputs/video-generator/youtube-seo-metadata-report.json` is the SEO/readiness gate for fresh build and publish workflows. It blocks structural metadata risks and writes a non-secret report with quality warnings.
- `npm run generate:youtube-thumbnails -- outputs/video-generator --confirm-spend --concurrency=2` and `npm run check:youtube-thumbnails -- outputs/video-generator --output=outputs/video-generator/youtube-thumbnail-report.json` are now the custom thumbnail path before publish. Thumbnail generation spends VectorEngine image credits and must stay behind an explicit confirmation gate. VectorEngine image calls support controlled parallelism; default thumbnail concurrency is 2 unless overridden by `thumbnail_concurrency` in GitHub or `VECTORENGINE_IMAGE_CONCURRENCY`.
- `npm run plan:youtube-generation-targets -- --set <set_id> --support RU[,EN] [--targets ES,IT] --output=<file>` is the cheap pre-generation guard. It checks the durable publication registry before expensive video rendering, VectorEngine metadata or VectorEngine thumbnail generation. Active `setId + supportLang + targetLang` rows in `config/youtube-published-videos.json` are excluded unless `--allow-republish` is passed deliberately. This is why re-running `langs=ES,IT` for the first RU deck now produces `eligibleTargetCount=0` and should skip generation instead of uploading or regenerating duplicates.
- GitHub batch fan-out uses deterministic sharding, not ad hoc language splits. `.github/workflows/youtube-video-publish.yml` accepts `worker_count` (`1..20`) and `worker_index` (`0..worker_count-1`); `scripts/build-all-deck-videos.mjs` and `scripts/generate-youtube-metadata.mjs` sort the target-language list and assign targets by `index % worker_count`. Each worker writes shard manifests, and `npm run check:youtube-run-isolation -- outputs/video-generator --shard-count=<n> --shard-index=<i>` blocks duplicate `setId + supportLang + targetLang` rows or metadata that belongs to another shard before scheduling, thumbnail generation or YouTube upload. For the next safe capacity test, run five GitHub workers with `worker_count=5`, `worker_index=0..4`, `concurrency=2`, `metadata_concurrency=4`, `thumbnail_concurrency=2`, and `publish_mode=scheduled`; this gives 10 simultaneous video builds, not 10 public releases at once.
- `npm run plan:youtube-publish -- <metadata-file-or-dir> [--write-registry] [--allow-playlist-create]` produces a dry-run report under `outputs/youtube-publish-plan-*.json`, estimates quota, resolves channel/playlist assignment and can add missing planned playlist entries locally.
- `config/youtube-publish-schedule-policy.json` is the per-support-language publication policy, and `config/youtube-publish-calendar.json` is the durable global reservation calendar across all 51 configured public support-language channels. The policy assigns each channel an IANA timezone and six default local slots per channel (`08:30`, `11:30`, `14:30`, `17:30`, `20:30`, `23:30`). The calendar stores non-secret `setId + supportLang + targetLang + channelKey + publishAt` reservations so later runs continue from already planned slots instead of starting again at the first slot. Accepted starting cadence is therefore **6 public releases per channel per local day**, not immediate public release after upload. Therefore 50 videos for one ordinary support-language channel take about 9 local days, and the shared `en`/`es`/`pt` channels take about 18 local days for one full 54-variant deck because they receive two support variants. Since all 51 channels are already configured, the correct first production shape is one deck across all 51 channels, not one channel at a time. The safety limit is deck-wave depth and per-channel cadence: do not start many decks at once or bypass schedule/readback; run one-deck/all-channels waves, then watch 24h/72h/7d metrics plus policy health before adding the next deck wave or raising cadence. If the first waves stay healthy, the next review point may consider 8-12 public releases/day/channel, but that is not the starting plan.
- Scale reality: GitHub workers speed up generation/upload preparation, not YouTube policy or API limits. The deck layer has 54 language variants. For the full directed pair matrix, one deck is `54 * 53 = 2,862` possible `support -> target` videos before duplicate-family exclusions. Excluding the six regional duplicate directions `EN <-> EN-GB`, `ES <-> ES-419` and `PT <-> PT-BR` leaves `2,856` videos per deck. Across 180 decks this is `514,080` videos. The public YouTube channel layer still has 51 channels because `EN/EN-GB`, `ES/ES-419` and `PT/PT-BR` share channels, so the shared `en`, `es` and `pt` channels receive about 104 videos per deck while ordinary one-variant channels receive about 53. At 6 public releases/day/channel, one full deck clears ordinary channels in about 9 days and shared channels in about 18 days; a full 180-deck matrix would bottleneck on those shared channels at about 18,720 videos each, or roughly 3,120 local days. Treat this as staged one-deck/all-channels waves, not all decks at once. Use performance evidence to decide the next deck wave and whether to raise per-channel cadence.
- API quota reality: YouTube's Data API has a default `videos.insert` daily bucket, and YouTube Help also states channels have a daily upload limit across Studio, mobile and API. A 5-worker test for one support channel and one deck should stay below the default upload bucket, but multi-channel apply waves must count expected `videos.insert`, `thumbnails.set`, playlist and readback calls before launch.
- Four-project upload routing is documented in [YouTube API Project Routing](youtube-api-project-routing.md) and mirrored by `config/youtube-api-project-routing.json`. The route names are `youtube 1`, `youtube 2`, `youtube 3` and `youtube 4`; they assign the 51 public support channels / 54 support variants as `13/16`, `13/13`, `13/13` and `12/12` channel/variant groups with planned daily releases `96 + 78 + 78 + 72 = 324` at six releases per variant. This is a support-channel routing contract, not target-language routing and not a secret store. A live upload workflow must choose the route-specific OAuth bundle/GitHub environment from the support channel, verify token `channelId` by API readback, and stop the affected route on `quotaExceeded` rather than silently moving a channel to another project.
- `npm run plan:youtube-publish-schedule -- <metadata-file-or-dir> --start-date=YYYY-MM-DD [--limit=50] [--limit-per-channel=50] [--write-metadata] [--write-calendar]` plans scheduled upload times without YouTube writes. With `--write-metadata`, it writes `privacyStatus=private`, `publishAt`, `scheduledPublishAt` and `publishSchedule.analyticsCheckpointsAt` into each scheduled `youtube_metadata.json`; with `--write-calendar`, it also upserts reservations into `config/youtube-publish-calendar.json`. In GitHub scheduled mode the workflow passes `--target-plan=outputs/video-generator/youtube-generation-targets-github.json`, so parallel workers reserve deterministic Nth-free slots from the same global target order rather than all taking the first local slot.
- `npm run plan:youtube-analytics-readback` reads `config/youtube-published-videos.json` and produces a checkpoint plan for YouTube Analytics/Data API readback. Default checkpoints are 24h, 72h, 7d and 30d after `publishAt`/upload time. This is how publication-time statistics are tracked without treating fresh-zero analytics as final data.
- `npm run read:youtube-video-statistics -- --fetch --confirm-youtube-read --due-only` is the current read-only statistics collector. It calls YouTube Data API `videos.list` for due checkpoints, verifies the video channel id, and writes cumulative view/like/comment snapshots to `outputs/youtube-video-statistics-*.json` plus `outputs/youtube-video-statistics-ledger.jsonl`. This is enough to compare publication-time performance over 24h/72h/7d/30d. Watch-time and retention metrics require a later YouTube Analytics API `reports.query` scope/check if needed.
- `npm run apply:youtube-publish -- --metadata=<youtube_metadata.json> [--video=<mp4>] [--thumbnail=<image>] [--create-playlist]` is dry-run by default. Live YouTube writes require `--apply --confirm-youtube-write`. Production default is `--privacy=public`, and public writes are refused unless `--confirm-public` is also passed. Scheduled uploads require `privacy=private` plus a future `publishAt`.
- The uploader uses the official YouTube Data API only: pre-upload `channels.list(mine=true)` token/channel verification, resumable `videos.insert`, optional `thumbnails.set`, optional `playlists.insert`, `playlistItems.insert`, post-upload `videos.list` readback with `snippet.channelId` equality check, and JSONL append to `outputs/youtube-publish-ledger.jsonl`. Missing playlists are created as `public` for immediate public uploads and for scheduled uploads that will become public at `publishAt`; otherwise they are created as `unlisted`. For scheduled uploads, recoverable playlist write quota/rate failures on `playlists.insert` or `playlistItems.insert` must not force a duplicate-prone video retry: the uploader can continue with the video upload, persist `needsPlaylistCreate=true` and/or `needsPlaylistInsert=true`, and leave playlist repair to `.github/workflows/youtube-playlist-insert-repair.yml`, which can create the missing playlist and insert the existing video later without re-rendering or reuploading. Because YouTube has no separate API field for hashtags, the uploader appends the first 3 normalized `metadata.hashtags` to the upload description when they are not already present.
- `config/youtube-published-videos.json` is the committed durable publication/readback registry. GitHub artifacts and `outputs/youtube-publish-ledger.jsonl` are raw per-run evidence, but not long-term source of truth because `outputs/` is gitignored and workflow artifacts expire.
- `npm run update:youtube-visibility -- --video-id=<id> --support=<RU> [--playlist-id=<id>] --privacy=public --apply --confirm-youtube-write --confirm-public` updates an already uploaded video and optional playlist through the official YouTube Data API without re-rendering or uploading a duplicate.
- Smoke proof on 2026-06-20 used the historical EN->ES first-deck test metadata: `npm run check:youtube-metadata` passed with only the expected historical missing-`playlist_key` warning; `npm run plan:youtube-publish -- ... --write-registry --allow-playlist-create` added planned playlist `EN__ES__ordinary-vocabulary__a1-everyday`; uploader dry-run resolved channel `en`, video path and estimated 1700 quota units without live YouTube writes.
- 2026-06-21 GitHub upload workflow: `.github/workflows/youtube-video-publish.yml` is the manual GitHub Actions entrypoint for generation-target preflight + overlapped video build/metadata/schedule/thumbnail prep + playlist plan + optional YouTube upload. `mode=plan` builds/validates only and uploads non-secret artifacts without restoring OAuth or pushing state. Before any expensive work, `plan:youtube-generation-targets` writes `outputs/video-generator/youtube-generation-targets-github.json` and skips this worker when the requested pairs are already active publications. For eligible pairs, video rendering starts in the background while VectorEngine/Gemini metadata runs immediately; scheduled `publishAt` assignment, VectorEngine `gpt-image-2` thumbnail generation, thumbnail validation and thumbnail review bundle generation then run before the workflow waits for the background video builds. This reduces wall-clock time by overlapping VectorEngine calls with mp4 rendering, but final TTS/video checks, SEO gates, publish planning and upload still wait for the video build to finish. Metadata generation supports `metadata_concurrency` (default 4). Thumbnail generation supports `thumbnail_concurrency` (default 2) and still requires `confirm_thumbnail_spend=GENERATE_THUMBNAILS` for channels that allow custom thumbnails. If a support channel is marked `customThumbnailUploadAllowed=false`, thumbnail generation may record `thumbnailUploadMode=first_frame_auto`; scheduled-public `mode=apply` accepts that as a YouTube-selected automatic thumbnail fallback, not a guaranteed first frame. If the operator explicitly sets `generate_thumbnails=false`, `--allow-auto-thumbnail-fallback` is still only for explicit private/review paths unless a later user decision accepts automatic thumbnails for that wave. `worker_count`/`worker_index` split one support/target set across up to 20 GitHub workers and write shard manifests; `check:youtube-run-isolation` is a fail-closed gate before schedule, thumbnail or upload work. `mode=apply` restores `YOUTUBE_OAUTH_BUNDLE_TGZ_B64` from the route-selected environment, requires `confirm_youtube_write=APPLY_YOUTUBE_UPLOAD`, and blocks publish candidates only when they lack both a generated custom-thumbnail asset and an explicit accepted automatic-thumbnail fallback. It also passes `--require-ai-metadata` into SEO and publish-plan gates; `template` and `template-ai-fallback` metadata are plan-only diagnostics and cannot be uploaded by the workflow. Production immediate-publish default is `publish_mode=public_now`, `privacy=public`, and `confirm_public=PUBLISH_PUBLIC`; paced rollout uses `publish_mode=scheduled`, `schedule_start_date=YYYY-MM-DD`, `confirm_public=PUBLISH_PUBLIC`, and uploader privacy is forced to `private` while `publishAt` is written into metadata. The workflow refuses `support=ALL`; pass an explicit support list such as `RU` or `RU,EN,ES` to avoid accidental quota burn and cross-channel writes. `config/youtube-published-videos.json` is now an apply-time idempotency guard: an active existing `setId + supportLang + targetLang` publication blocks upload by default. Use `allow_republish=true` / `--allow-republish` only for an intentional duplicate/reupload after deciding how the old video will be superseded or deleted. Missing playlists are created as `public` for public or scheduled-public uploads and otherwise as `unlisted`; if an existing playlist is still `created_unlisted`, scheduled-public planning blocks until the playlist is promoted or replaced. If YouTube accepts the video/playlist write but a later post-upload step fails, the uploader must keep an active partial row in `config/youtube-published-videos.json` so future preflight blocks duplicate reupload; playlist failures use `needsPlaylistInsert=true`. If `thumbnails.set` returns `domain=youtube.thumbnail`, `reason=forbidden`, treat that as a recoverable channel-permission warning only for keeping the already uploaded video/playlist row: record `thumbnailSet=false`, `thumbnailUploadMode=first_frame_auto`, `thumbnailSource=youtube-auto-first-frame`, `needsThumbnailPermission=true` and `thumbnailSetError`, mark that support channel `customThumbnailUploadAllowed=false`, and keep the uploaded video/playlist row active. For the current accepted wave, this automatic fallback is allowed to remain scheduled; only hold it if the user explicitly asks for custom-thumbnail remediation or a later policy changes. After every `mode=apply` run, the workflow now runs a separate serialized `persist-publish-state` job. That job downloads the non-secret publish artifact, pulls the latest branch, runs `npm run merge:youtube-publish-state`, and commits only `config/youtube-channels.json`, `config/youtube-playlists.json`, `config/youtube-publish-calendar.json` and `config/youtube-published-videos.json` back to the dispatch branch. The video jobs can still run in parallel; the state commits are serialized by branch to avoid JSON overwrite races. If the persist job fails or cannot download the artifact, treat the artifact as the fallback source and manually merge it before launching dependent publish runs. Statistics readback is separate: `.github/workflows/youtube-video-statistics-readback.yml` restores the same OAuth bundle, requires `confirm_youtube_read=READ_YOUTUBE_STATS`, reads only due checkpoints, and uploads non-secret statistics artifacts without writing to YouTube.
- 2026-06-23 offline deck-data fallback: the workflow first checks `data/deck-sources.json` for a Google Drive file id and downloads it into `data/decks/<setId>.json`; if no mapping exists, it uses a committed/local offline deck JSON. The first-deck Drive update path is currently not usable (`appNotAuthorizedToFile` against the old Drive id), so `data/deck-sources.json` is intentionally empty and `data/decks/home_kitchen_cookware_pilot_01.json` is committed as the GitHub source for the next scheduled wave. Do not restore the Drive mapping until the Drive file update and readback are verified; otherwise GitHub can silently use stale card data.
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

- One reservation is keyed by `setId + supportLang + targetLang + channelKey`.
- `supportLang` and `targetLang` preserve regional variants such as `EN-GB`, `ES-419` and `PT-BR`.
- `channelKey` is the public support-channel key, so shared viewer channels (`en`, `es`, `pt`) use one combined calendar even when they serve multiple support variants.
- Shared viewer channels use explicit support-variant priority from `config/youtube-publish-schedule-policy.json`: `en` publishes `EN` before `EN-GB`, `es` publishes `ES-419` before `ES`, and `pt` publishes `PT-BR` before `PT`. This makes the first shared-channel wave prioritize US/base English, Latin American Spanish and Brazilian Portuguese while still preserving regional variants in playlists, metadata and course links.
- `publishAt` is the UTC YouTube API time; `localDate`, `localTime`, `timeZone`, `localSlotIndex` and `localDayOffset` are stored for human review.
- Calendar rows are not upload proof. Upload/readback proof remains `config/youtube-published-videos.json` plus YouTube API readback.

`scripts/plan-youtube-publish-schedule.mjs` must consider existing active calendar reservations, future scheduled publications in `config/youtube-published-videos.json`, and slots assigned earlier in the same run. If a reservation already exists for the same `setId/supportLang/targetLang/channelKey`, the planner reuses that slot and rewrites metadata to match it rather than silently moving the video.

For parallel GitHub workers, scheduled mode must pass the generation target preflight report as `--target-plan`. The planner applies the shared-channel `supportPriority` order first, then uses the target's global ordinal within the channel's eligible target list and chooses that Nth-free slot. This prevents worker 0, worker 1 and worker 2 from all reserving the first local slot when they run at the same time from the same committed calendar, and it keeps shared-channel first slots deterministic for `EN`, `ES-419` and `PT-BR`.

Operational rules:

- After any scheduled plan/apply run, review the artifact-updated `config/youtube-publish-calendar.json` and commit it before launching a later separate wave that relies on those slots.
- Do not run separate concurrent workflows for the same physical channel with different uncommitted calendars unless they share the same target-plan ordering and non-overlapping target sets.
- If a planned upload is intentionally cancelled, mark the calendar reservation inactive (`cancelled`, `deleted`, `failed` or `superseded`) instead of deleting rows; the planner ignores inactive rows.
- Do not put token paths, OAuth files, secrets, raw metadata prompts or private notes into the calendar.

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

- `EN` озвучивается как US English: `edge_en-US-GuyNeural`;
- `EN-GB` озвучивается как British English: `edge_en-GB-RyanNeural`;
- `ES` озвучивается как Spain Spanish: `edge_es-ES-AlvaroNeural`;
- `ES-419` озвучивается как broad LatAm Spanish через practical LatAm voice `edge_es-MX-JorgeNeural`;
- `PT` озвучивается как European Portuguese: `edge_pt-PT-DuarteNeural`;
- `PT-BR` озвучивается как Brazilian Portuguese: `edge_pt-BR-FranciscaNeural`;
- `NO` / `NB` озвучивается как Norwegian Bokmål: `edge_nb-NO-FinnNeural`; public/support code can be `NO`, but data lookup uses DB code `NB`;
- `SR` ordinary decks use Serbian Latin (Gaj) text and `edge_sr-RS-NicholasNeural`; Cyrillic is allowed only inside a separate documented course contract;
- `HY` remains the only documented non-Edge exception: it uses `ai33_elevenlabs_qJBO8ZmKp4te7NTtYgzz` because the free `edge-tts` backend does not currently expose Armenian `hy-AM` voices.

2026-06-22 voice audit result: Microsoft Azure Speech lists Armenian `hy-AM-AnahitNeural` and `hy-AM-HaykNeural`, but live `edge-tts` 7.2.8 readback returned 0 `hy-AM` voices and a direct `hy-AM-HaykNeural` synthesis smoke failed with `NoAudioReceived`. Therefore do not switch `HY` to Edge until a fresh live `edge-tts` readback proves `hy-AM` is available. The other 54 Edge voice ids in `defaultVoiceMap` were checked against live `edge-tts` voice listing and are present. Some languages have newer Azure `DragonHD` / multilingual variants in the Microsoft list, but the video pipeline intentionally uses standard Edge-compatible `*Neural` voice ids without `:DragonHD...` suffixes so GitHub/Windows generation remains free and predictable. This is a technical availability/locale check, not a native-listening certification that every selected voice is the most pleasant possible voice for every viewer.

2026-06-22 AI33/ElevenLabs API contract check: the attached AI33 documentation for "Create Speech" says to use `POST /v1/text-to-speech/{voice_id}?output_format=mp3_44100_128`, header `xi-api-key`, JSON body `{ text, model_id: "eleven_multilingual_v2", with_transcript: false }`, and async task polling that returns `status` plus `metadata.audio_url`. The official ElevenLabs "Create speech" contract uses the same `POST /v1/text-to-speech/{voice_id}` shape, but its normal success response is direct audio rather than an AI33 `task_id`. `scripts/lib/video-generator.mjs` therefore handles both success shapes: a direct audio response is saved immediately to the TTS cache, while an async JSON response with `task_id` is polled until `metadata.audio_url` is available. Live local readback with the gitignored AI33 key confirmed `/v1/models` includes `eleven_multilingual_v2`, `/v2/voices` can see the configured voice, and both v1 body variants reach AI33, but the v1 create endpoint currently returns `success=false` with message `please use api v3 for this endpoint`. Legacy `/v3/text-to-speech` variants returned `401 Unauthorized` with the same key in the tested header forms. Local development can read AI33 variables from gitignored `.local/access-imports/youtube2026new.env.local`; GitHub needs a real `AI33_API_KEY` secret before HY video generation can succeed.

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

This gate blocks missing/unknown language codes, wrong TTS voice mappings, missing card readback for the exact target/support pair, script mismatches such as Cyrillic inside ordinary `SR`, Latin fallback inside non-Latin scripts, wrong public support-language paths, and missing `?langs=<target>` study URLs. It emits warnings, not blockers, for dialect risk words that need review, for example Nynorsk markers in `NO`/`NB`, US-only terms in `EN-GB`, Spain-only terms in `ES-419`, and European Portuguese terms in `PT-BR`.

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

Название колоды и subtitle на intro берутся не из технического `content_sets.set_name`, а из localized Course Metadata:

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

### Outro QR destination

Outro CTA должен вести на учебные материалы сайта, а не на главную страницу:

```text
config/video-public-course-links.json
scripts/lib/video-public-url.mjs
qrcode npm package
```

Правило fail-closed:

- если `set_id` есть в `publishedCourseSlugBySetId` и известен `targetLang`, QR ведет сразу на localized study page, например `https://flashcardsluna.com/ru/courses/kitchenware-basic/study/standard?langs=es`;
- в таком URL первый path segment (`/ru/`) является языком интерфейса / носителя зрителя (`supportLang`), а `langs=es` является изучаемым языком видео (`targetLang`);
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
- Gemini используется только как AI-polish слой поверх фактов из Course Metadata, списка слов и public course URL;
- recoverable Gemini/VectorEngine polish failures (`non-JSON`, timeout, HTTP 429/5xx) must not block a valid `mode=plan` by default: the generator retries once with a stricter JSON-only prompt, then writes `source=template-ai-fallback` with bounded `aiMetadata` diagnostics. Live apply is fail-closed through `--require-ai-metadata`; set `YOUTUBE_METADATA_AI_STRICT=1` only when explicitly debugging AI output and willing to fail even plan runs;
- Gemini output не должен придумывать длительность, платные обещания, сертификаты, guaranteed fluency, teacher/native-speaker claims beyond the actual video facts;
- `description` должен содержать точный `courseUrl`;
- `tags` не должны содержать hashtags, а общий YouTube tag budget должен оставаться <= 500 chars;
- `scripts/check-youtube-metadata.mjs` является обязательным gate перед upload stage.
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

В GitHub Actions Gemini может идти двумя API-путями:

- direct Google Gemini API: secrets `GEMINI_API_KEY` или `GOOGLE_API_KEY`; для API mode default model задается `GEMINI_MODEL` / repository variable, иначе используется `gemini-3.5-flash`;
- VectorEngine Gemini proxy: secret `VECTORENGINE_API_KEY` (или legacy alias `VECTOR_ENGINE_API_KEY`), optional repository variables `VECTORENGINE_BASE_URL` and `VECTORENGINE_GEMINI_MODEL`; default base URL is `https://api.vectorengine.ai`, default model is `gemini-3.5-flash`.

GitHub metadata workflow выбирает VectorEngine, если задан ключ `VECTORENGINE_API_KEY` / `VECTOR_ENGINE_API_KEY`; иначе используется direct Google key, если он есть; иначе `mode=plan` остается успешным на template fallback. Recoverable AI-polish failures also fall back to template metadata after one JSON-only retry for plan diagnostics, while missing keys or auth errors remain hard failures when an AI backend is explicitly selected. `mode=apply` is stricter: SEO and publish-plan gates pass `--require-ai-metadata`, and the direct uploader also blocks `template` / `template-ai-fallback` before OAuth or YouTube writes. `VECTORENGINE_GEMINI_MODEL` нужен только для явного override модели. VectorEngine здесь используется только как Gemini text proxy для `youtube_metadata.json`; он не меняет видео-рендеринг, TTS, QR или slide templates. Because the VectorEngine compatibility layer can ignore or weaken JSON-mode behavior on longer prompts, `scripts/lib/youtube-metadata.mjs` uses a compact VectorEngine-specific metadata prompt, avoids character-count instructions that triggered prose/counting output, and gives that backend a larger `maxOutputTokens=3200` budget so Russian descriptions plus tags can finish with a closing JSON object.

2026-06-19 live smoke confirmed the working VectorEngine text path: `gemini-3.5-flash:generateContent`. Local smoke `npm run check:vectorengine-gemini -- --confirm-spend` wrote `outputs/tmp/vectorengine-gemini-smoke/vectorengine-gemini-smoke-20260619T072602Z.json` with `status=ok`. GitHub Actions smoke `build-test-single.yml` run `27813244643` passed on commit `5a11a44` in `3m20s`; downloaded artifact `outputs/github-vectorengine-test-27813244643/test-single-video-uz/home_kitchen_cookware_pilot_01_en_uz/youtube_metadata.json` has `source=gemini-vectorengine` and `model=gemini-3.5-flash`, and `npm run check:youtube-metadata -- outputs/github-vectorengine-test-27813244643` passed with 0 blockers/warnings. On 2026-06-20 `gh secret list --repo webpot-ru/luna` read back `VECTORENGINE_API_KEY` by name/update timestamp as updated at `2026-06-20T13:39:07Z`; the secret value was not read or printed. On 2026-06-21 local readback re-confirmed the key/endpoint with `npm run check:vectorengine-gemini -- --confirm-spend` and then generated RU->ES metadata with `source=gemini-vectorengine`. GitHub video-publish plan run `27899137609` on commit `9286549` then confirmed the fixed prompt in the full workflow: downloaded `youtube_metadata.json` for `home_kitchen_cookware_pilot_01` / `RU->ES` has `source=gemini-vectorengine`, `model=gemini-3.5-flash`; local strict gates over the downloaded artifact passed `check:youtube-metadata`, `check:youtube-seo-metadata --require-ai-metadata` with score 100, and `plan:youtube-publish --allow-playlist-create --require-ai-metadata` with `Publish-ready: 1`. Earlier failures were tied to other VectorEngine models/endpoints (`gemini-3-pro-preview` stream timeout, `gemini-3.1-pro-preview`/`gemini-2.5-flash`/`gemini-2.0-flash` 503, `gemma-7b-it` 429) or to the pre-fix long metadata prompt/output budget, and should not be used as the default path.

Локальный smoke-check VectorEngine Gemini:

```bash
npm run check:vectorengine-gemini -- --confirm-spend
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
