# Video Lessons Strategy & Specifications

Этот документ фиксирует архитектуру, спецификации генерации и стратегию дистрибуции видеоуроков LunaCards на YouTube для привлечения поискового трафика на [flashcardsluna.com](https://flashcardsluna.com/). Список всех сгенерированных уроков и ссылки на них ведутся в [Video Lessons Registry](video-lessons-registry.md).

Статус: **Source of Truth**. Любые изменения в дизайне, структуре звука или дистрибуции видео должны фиксироваться здесь.

---

## 1. Стратегия дистрибуции на YouTube (YouTube Distribution)

Для исключения «каши» из десятков языков поддержки на одном канале и предотвращения путаницы в алгоритмах рекомендаций YouTube принята **Стратегия разделения каналов по языку зрителя (Support Language / Market)**.

### Архитектура каналов:
1. **«LunaCards — Учим языки»** (Флагманский канал для русскоязычной аудитории):
   * **Язык поддержки**: Только Русский (`RU`). Все переводы и озвучка перевода делаются только на русском.
   * **Контент**: Плейлисты по изучаемым целевым языкам:
     * *Испанский с нуля (на базе Spanish A1 Core Course)*
     * *Английский для начинающих (на базе Oxford Core)*
     * *Китайский язык (на базе HSK 3.0)*
2. **«LunaCards — Learn Languages»** (Для англоязычной аудитории):
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

Правило баннера: не перечислять на главном channel art только 2-3 изучаемых языка, потому что это искусственно сужает канал при каталоге 50+ языков. Баннер должен продвигать всю систему: бренд LunaCards, broad flashcard-learning promise, место для будущего расширения за пределы языков и сайт `flashcardsluna.com`. Конкретные target languages живут в плейлистах, названиях видео, metadata и ссылках `?langs=<target>`. Если канал намеренно остается только языковым, допустим narrower promise вроде `Learn 50+ Languages`; для зонтичного LunaCards branding предпочтительнее `Learn with Flashcards` / `Languages and more`, чтобы не закрывать будущие неязыковые колоды.

Визуально channel art должен удерживать recognizable LunaCards reference style: clean flashcard panels, navy LunaCards wordmark, soft blue accents, readable site URL and enough visual material across the full desktop crop so the channel header does not look like a small centered image inside YouTube's gray header container.

2026-06-19 current EN fixed-reference banner: `outputs/youtube-channel-assets/en/lunacards-en-channel-banner-youtube-2560x1440-v8-center-v9-wide-reference-v1.jpg`; desktop crop preview: `outputs/youtube-channel-assets/en/lunacards-en-channel-banner-desktop-preview-v8-center-v9-wide-reference-v1.jpg`; safe-area preview: `outputs/youtube-channel-assets/en/lunacards-en-channel-banner-safearea-preview-v8-center-v9-wide-reference-v1.jpg`; metadata/readback: `outputs/youtube-channel-assets/en/lunacards-en-channel-banner-v8-center-v9-wide-reference-v1-metadata.json`. It is generated locally by `scripts/refit-channel-banner-reference.py` from the older `v8` center reference and the older `v9` wide side panels. YouTube geometry used for QA: upload `2560x1440`, desktop crop preview `2560x423`, central safe-area preview `1546x423`, file size below 6 MB. This banner was uploaded to `@flashcardsluna` on 2026-06-19 and visually read back on `https://www.youtube.com/@flashcardsluna/about`.

2026-06-20 current localized reference-style banner batch covers all 51 public support-language channels. `EN` uses the accepted fixed-reference upload `outputs/youtube-channel-assets/en/lunacards-en-channel-banner-youtube-2560x1440-v8-center-v9-wide-reference-v1.jpg`; the other 50 public codes use slug `v1-site-ui-center-v9-wide-reference-v1`. The current public-code set is stored in `config/youtube-channel-banner-copy.json`: `AZ`, `BG`, `BN`, `CS`, `DA`, `DE`, `EN`, `ES`, `ET`, `FI`, `FR`, `HI`, `HR`, `HU`, `HY`, `ID`, `IS`, `IT`, `JA`, `KA`, `KK`, `KM`, `KN`, `KO`, `LO`, `LT`, `LV`, `ML`, `MS`, `MY`, `NE`, `NL`, `NO`, `PL`, `PT`, `RO`, `RU`, `SI`, `SK`, `SL`, `SR`, `SV`, `SW`, `TA`, `TE`, `TH`, `TL`, `TR`, `UZ`, `VI`, `ZH`. This is the correct EN-style refit: each localized `v1-site-ui` banner is used as the center reference, and only the side fill is extended with the accepted `EN v9` wide side panels. Do not redraw localized text, do not replace the center with an English-derived text layer. The production upload file pattern is `outputs/youtube-channel-assets/<code>/lunacards-<code>-channel-banner-youtube-2560x1440-v1-site-ui-center-v9-wide-reference-v1.jpg`; desktop crop preview pattern is `lunacards-<code>-channel-banner-desktop-preview-v1-site-ui-center-v9-wide-reference-v1.jpg`; safe-area preview pattern is `lunacards-<code>-channel-banner-safearea-preview-v1-site-ui-center-v9-wide-reference-v1.jpg`; mobile strict preview pattern is `lunacards-<code>-channel-banner-mobile-strict-preview-v1-site-ui-center-v9-wide-reference-v1.jpg`; per-language metadata pattern is `lunacards-<code>-channel-banner-v1-site-ui-center-v9-wide-reference-v1-metadata.json`. Batch QA sheets are `outputs/youtube-channel-assets/channel-banner-v1-site-ui-center-v9-wide-reference-v1-desktop-contact-sheet.jpg` and `outputs/youtube-channel-assets/channel-banner-v1-site-ui-center-v9-wide-reference-v1-safe-contact-sheet.jpg`; machine-readable manifest is `outputs/youtube-channel-assets/channel-banner-v1-site-ui-center-v9-wide-reference-v1-manifest.json`. Local technical QA passed on 2026-06-20 for all 51 upload files: upload dimensions `2560x1440`, non-EN desktop previews `2560x423`, non-EN safe-area previews `1546x423`, non-EN mobile-strict previews `1235x338`, and all upload files below the YouTube 6 MB limit. Visual contact-sheet review was done locally; complex-script image text still needs human/native spot-check before treating every script as text-perfect.

The 38 remaining non-priority language centers were generated through the paid VectorEngine `gpt-image-2` image path and then normalized locally. Reproducible batch command: `npm run generate:youtube-channel-banners -- --confirm-spend`. The batch generator is `scripts/generate-vectorengine-channel-banners-batch.mjs`; it reads copy from `config/youtube-channel-banner-copy.json`, writes raw VectorEngine outputs with slug `v1-site-ui-vectorengine-full-v1`, fits them into the 2560 x 1440 source-center contract through `scripts/fit-vectorengine-channel-banner-source.py`, then calls `scripts/refit-localized-channel-banners-from-source.py`. Batch manifest: `outputs/youtube-channel-assets/channel-banner-vectorengine-v1-site-ui-batch-manifest.json`. Because this path spends external image-generation usage, keep the `--confirm-spend` gate and do not run it casually.

Future channel-art workflow:

1. Create or approve the localized source banner first. Current source pattern is `outputs/youtube-channel-assets/<code>/lunacards-<code>-channel-banner-youtube-2560x1440-v1-site-ui.png`.
2. For a single existing source, run `python3 scripts/refit-localized-channel-banners-from-source.py --codes <code>`. For all non-EN sources, run `python3 scripts/refit-localized-channel-banners-from-source.py` without `--codes`.
3. If the source center does not exist, run the paid generator only after explicit spend confirmation: `npm run generate:youtube-channel-banners -- --confirm-spend --codes=<code>`.
4. Check the generated desktop, safe-area and mobile-strict previews/contact sheets before upload; the banner is not considered ready if the accepted localized center is altered, localized text clips, or the full desktop crop looks like a small centered image in YouTube's gray header.
5. Upload the `youtube-2560x1440` JPG in YouTube Studio, accept the crop, publish, then visually read back the public channel page.
6. If a channel tracker row is maintained, record the upload path, avatar path and Studio/live-check status there after readback.

Other EN candidates remain historical/non-primary unless explicitly selected: the original too-centered light UI `v8`, the raw `v9` wide candidate, the live-site hero candidate `lunacards-en-channel-banner-youtube-2560x1440-site-hero-v1.jpg`, the `v10-premium-wide` generated candidate, and the paid VectorEngine/GPT Image 2 candidate `lunacards-en-channel-banner-youtube-2560x1440-vectorengine-gpt-image-2-youtube-spec-v1.jpg`.

The localized site-style banner source-center files are inputs for refit, not the YouTube upload target: `outputs/youtube-channel-assets/<support-code>/lunacards-<code>-channel-banner-youtube-2560x1440-v1-site-ui.png`. The first priority sources came from the 2026-06-19 localized site-style batch; the 38 later sources came from the VectorEngine `gpt-image-2` batch and local source fitting. The later text-overlay batch `v8-center-v9-wide-reference-v2-localized` is superseded and should not be uploaded.

Первый рабочий пакет для EN-канала создан в:

```text
outputs/youtube-channel-assets/en/channel-package.md
```

Он включает banner/avatar candidates, channel description, first playlists and the first two unlisted upload candidates from the GitHub EN support render test.

Операционный трекер каналов ведется в Google Sheet `Ютуб курсы FCL`, tab `YouTube каналы`:

```text
https://docs.google.com/spreadsheets/d/1Uw5mO7Xy1asF-WlbRkphUCftaGDP6uVtu6xGgXD00_I/edit#gid=202606190
```

#### Channel description copy contract

Channel descriptions are viewer-language profile copy, not target-language copy and not a narrow "language lessons only" promise. Each channel description must make clear that the channel is for native speakers of the support language who use LunaCards flashcards to learn:

- 50+ languages first;
- later, other subjects and topics using the same flashcard format.

Required content in every channel description:

- native-speaker audience in the support language;
- short LunaCards flashcard-video learning loop;
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

2026-06-20 completed channel-inventory and assignment sync note: the Google Sheet range `YouTube каналы!A2:P52` was updated and read back after OAuth/API channel verification and support-language assignment. Rows 2-13 carry the 12 configured priority support-language channels with real current handles, `UC...` channel ids, public URLs, support-language mapping and upload-ready banner paths. Rows 14-52 now carry the 39 remaining support-language assignments (`IT`, `VI`, `TH`, `MS`, `PL`, `NL`, `SV`, `NO`, `DA`, `FI`, `CS`, `SK`, `HU`, `RO`, `BG`, `HR`, `SR`, `SL`, `LT`, `LV`, `ET`, `IS`, `BN`, `TL`, `MY`, `KM`, `LO`, `NE`, `SI`, `TA`, `TE`, `KN`, `ML`, `UZ`, `KK`, `AZ`, `KA`, `HY`, `SW`) with target handles, localized descriptions, course URLs and banner/avatar paths, giving 51 recorded and assigned channels total. The local machine-readable sources are `config/youtube-channels.json`, `config/youtube-channel-inventory.json` and `outputs/youtube-channel-assets/youtube-channel-language-assignment-20260620.json`; the Google Sheet is the operational tracker for user-facing assignment, readiness and Studio/live-check notes. Token numbering intentionally has gaps because duplicate OAuth selections were skipped instead of writing duplicate channel rows. `unassigned-047` / `@cosmiclimitstv` / `UCZ0eMlkJpAQDkQQLAy0gTkw` is assigned to `SW` as the last remaining support-language slot, but it has an old non-Luna title/content risk and must be cleaned/reviewed before public launch. Future OAuth/API readbacks must be written to the Sheet in the same pattern before any additional language assignment is considered durable.

2026-06-20 channel description positioning update: channel descriptions are broad viewer-language profile copy, not language-only vocabulary copy. Each channel is positioned for native speakers of its support language who use LunaCards flashcards to learn 50+ languages first, with the same flashcard format later expanding into other subjects and topics. The durable copy source is `config/youtube-channel-positioning-copy.json`; apply it with `npm run apply:youtube-channel-positioning-copy`, which updates `config/youtube-channels.json` and the 39-row assignment report without reading or printing token contents. `scripts/assign-youtube-channel-languages.mjs` also reads this copy map so future re-assignment runs do not revert to old language-only wording. The Google Sheet tracker columns `K:L` (`Channel description`, `Short description`) were updated and read back for `YouTube каналы!K2:L52`: first/last-row samples matched the new broad positioning, and bounded searches over 51 rows found 0 matches for the old `vocabulary lessons across 50+ languages` wording and 0 `.local` strings.

2026-06-20 public channel profile readback:

| Support language | Public channel | Course link | Profile status |
| --- | --- | --- | --- |
| `EN` | `https://www.youtube.com/@flashcardsluna` | `https://flashcardsluna.com/en/courses` | Configured/read back. |
| `RU` | `https://www.youtube.com/@LunaCardsRU` | `https://flashcardsluna.com/ru/courses` | Configured/read back. |
| `ES` / `ES-419` | `https://www.youtube.com/@LunaCardsEspanol` | `https://flashcardsluna.com/es/courses` | Configured/read back. |
| `PT` / `PT-BR` | `https://www.youtube.com/@LunaCardsPortugues` | `https://flashcardsluna.com/pt/courses` | Configured/read back. |
| `HI` | `https://www.youtube.com/@LunaCardsHindi` | `https://flashcardsluna.com/hi/courses` | Configured/read back. |
| `ID` | `https://www.youtube.com/@LunaCardsIndonesia` | `https://flashcardsluna.com/id/courses` | Configured/read back. |
| `FR` | `https://www.youtube.com/@LunaCardsFrancais` | `https://flashcardsluna.com/fr/courses` | Needs link fix: name/handle/description read back, but the separate public channel link was not visible; the URL was only present in description text. |
| `DE` | `https://www.youtube.com/@LunaCardsDeutsch` | `https://flashcardsluna.com/de/courses` | Configured/read back. |
| `JA` | `https://www.youtube.com/@LunaCardsJapan` | `https://flashcardsluna.com/ja/courses` | Configured/read back. |
| `KO` | `https://www.youtube.com/@LunaCardsKorean` | `https://flashcardsluna.com/ko/courses` | Configured/read back. Actual live handle is `@LunaCardsKorean`. |
| `TR` | `https://www.youtube.com/@LunaCardsTurkce` | `https://flashcardsluna.com/tr/courses` | Configured/read back. |
| `ZH` | `https://www.youtube.com/@LunaCardsChinese` | `https://flashcardsluna.com/zh/courses` | Configured/read back. |

Treat `Configured/read back` as "do not re-run manual channel setup unless the user explicitly asks". Readback was a public YouTube `/about` text/link check in Chrome: channel name, handle and the relevant `flashcardsluna.com/<support>/courses` path were visible. It was not a full pixel-by-pixel banner/avatar crop audit and does not expose or store the contact email.

Operational channel profile fields should be consistent across support-language channels: banner, avatar, YouTube player watermark (`Логотип канала`), contact email, localized description and site links are all required before publishing a channel profile. Reuse the LunaCards site-logo avatar and 150 x 150 watermark. The real contact email is stored only in local, gitignored `.local/youtube-channel-defaults.json`; do not store that email value in committed repo files, docs or generated channel packages.

2026-06-20 API automation boundary: post-creation channel branding automation is tracked in `config/youtube-channels.json` and planned by `npm run plan:youtube-channel-branding`. Official YouTube Data API can update the channel banner via `channelBanners.insert` + `channels.update`, update `brandingSettings.channel.description` when a desired description is present, and set the player watermark via `watermarks.set`. Because `channels.update` overrides mutable properties inside the requested part, the local script must preserve only the allowed current mutable `brandingSettings.channel` fields and `brandingSettings.image.bannerExternalUrl`; it must not blindly resend deprecated/read-only image URLs from `channels.list`. Channel creation, channel title/name, handle, profile avatar/icon, contact email and public profile links remain manual YouTube Studio / browser-workflow fields. This boundary was confirmed by the 2026-06-20 `IT` title canary: the API call returned success but readback still showed `snippetTitle=New 25` and `brandingTitle=New 25`. Do not treat unofficial/private YouTube clients as production-safe for LunaCards channel ownership tasks unless the user explicitly accepts the account risk.

Browser/Studio finishing workflow:

```bash
npm run export:youtube-channel-studio-tasks -- --manual-needed
npm run export:youtube-channel-studio-tasks -- --all
```

The export writes non-secret JSON/CSV/Markdown task files under `outputs/youtube-channel-assets/youtube-channel-studio-tasks-*.{json,csv,md}`. Each task contains channel key, support languages, channel id, public URL, YouTube Studio customization URL, desired channel name/handle/site link, banner/avatar/watermark asset paths and a checklist for browser work. It intentionally stores only `.local/youtube-channel-defaults.json contactEmail` as the contact-email source, never the real email value, token path contents or OAuth secrets. Use these task files as the source for Computer Use or Record & Replay browser sessions: first verify the visible channel id/handle in Studio, then update name/handle/avatar/link/contact email, save in Studio, open the public `/about` page and update the Google Sheet tracker only after public readback.

2026-06-20 export proof: `npm run export:youtube-channel-studio-tasks -- --manual-needed` initially produced 40 manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T11-51-23-110Z.json`, `.csv` and `.md`. After the `IT` Studio canary public readback and Sheet sync, the same command produced 39 remaining manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T14-40-43-960Z.json`, `.csv` and `.md`. After the `VI` public readback and Sheet sync, the same command produced 38 remaining manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T15-12-36-146Z.json`, `.csv` and `.md`. After the `TH` public/API readback and Sheet sync, the same command produced 37 remaining manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T15-34-25-732Z.json`, `.csv` and `.md`. After the `MS` Studio/API readback and Sheet sync, the same command produced 36 remaining manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T15-48-37-755Z.json`, `.csv` and `.md`. After the `PL` Studio/API readback and Sheet sync, the same command produced 35 remaining manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T15-58-43-406Z.json`, `.csv` and `.md`. After the `NL` Studio/API readback and Sheet sync, the same command produced 34 remaining manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T16-05-26-406Z.json`, `.csv` and `.md`. After the `SV` Studio/API readback and Sheet sync, the same command produced 33 remaining manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T16-14-44-834Z.json`, `.csv` and `.md`. After the `NO` Studio/API readback and Sheet sync, the same command produced 32 remaining manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T16-28-52-107Z.json`, `.csv` and `.md`. After the `DA` Studio/API readback and Sheet sync, the same command produced 31 remaining manual-needed tasks at `outputs/youtube-channel-assets/youtube-channel-studio-tasks-2026-06-20T16-41-19-210Z.json`, `.csv` and `.md`. This did not print secrets.

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

2026-06-21 KM API readback: the `KM` manual task for channel id `UCVPNmzYNdmbolICROM6CJag` was completed for public fields at `https://www.youtube.com/@LunaCardsKhmer`. Studio fields applied: channel name `LunaCards ភាសាខ្មែរ`, target handle `@LunaCardsKhmer`, banner, shared LunaCards avatar, player watermark, localized Khmer description and external link `https://flashcardsluna.com/km/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-029.json` confirmed `snippetTitle=LunaCards ភាសាខ្មែរ`, `brandingTitle=LunaCards ភាសាខ្មែរ`, `customUrl=@lunacardskhmer`, desired Khmer description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 39 was updated/read back: `Current handle=@LunaCardsKhmer`, `Target handle=@LunaCardsKhmer`, `Live channel URL=https://www.youtube.com/@LunaCardsKhmer`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

2026-06-21 LO API readback: the `LO` manual task for channel id `UCbER-ysJ3PVsIRG6hgr_PHw` was completed for public fields at `https://www.youtube.com/@LunaCardsLao`. Studio fields applied: channel name `LunaCards ພາສາລາວ`, target handle `@LunaCardsLao`, banner, shared LunaCards avatar, player watermark, localized Lao description and external link `https://flashcardsluna.com/lo/courses`; contact email was intentionally not transmitted. Live API readback with `.local/youtube-oauth/tokens/unassigned-030.json` confirmed `snippetTitle=LunaCards ພາສາລາວ`, `brandingTitle=LunaCards ພາສາລາວ`, `customUrl=@lunacardslao`, desired Lao description and `hasBanner=true`. Public URL readback returned HTTP 200. Google Sheet `Ютуб курсы FCL` / `YouTube каналы` row 40 was updated/read back: `Current handle=@LunaCardsLao`, `Target handle=@LunaCardsLao`, `Live channel URL=https://www.youtube.com/@LunaCardsLao`, `Ready for Studio=Studio public fields readback OK; contact email intentionally skipped`, and `Studio updated / checked live=Studio name/handle/avatar/banner/watermark/description/link API readback OK 2026-06-21; contact email not transmitted; browser source must be Current handle, not Channel ID`. Google Sheet `Current handle` is the browser/account-switch source; `Channel ID / UC...` is only API/readback identity.

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

If linking directly to the course list, append `/courses` to the collapsed base path, for example `https://flashcardsluna.com/pt/courses`. Do not use `/gb`, `/uk`, `/us`, `/mx`, `/br`, `/en-gb`, `/es-419` or `/pt-br` as public site language paths for LunaCards channel/profile/video links unless the live site routing is intentionally changed and read back.

This collapse applies only to the public website language path. Do not remove or rewrite regional language variants in decks, data, video generation, playlist keys, titles or metadata. For example, Russian-native viewers learning Brazilian Portuguese should land on `https://flashcardsluna.com/ru/courses/kitchenware-basic/study/standard?langs=pt-br`, while Portuguese-native or Brazilian-Portuguese-native channel links both start from the public site path `https://flashcardsluna.com/pt`; `https://flashcardsluna.com/pt-br` is not a public language section.

### 1.2. Video thumbnails

Видео должны получать отдельную YouTube-обложку, а не полагаться только на первый intro slide. Thumbnail должен быть визуально из той же системы, что и channel art: light `#f4f7f9` background, white rounded card panels, soft blue accents, deep navy typography, restrained LunaCards branding and a clean premium flashcard feel. Он не должен быть темным, кричащим или кликбейтным; цель - быстро показать viewer language, target language/level and deck topic.

2026-06-19 VectorEngine GPT Image 2 smoke showed that `gpt-image-2` is available through the OpenAI-compatible `/v1/images/generations` endpoint and can render difficult multilingual text materially better than older image models. Stress-test artifacts:

```text
outputs/tmp/vectorengine-image-text-smoke/gpt-image-2-min-text-20260619T083029Z.png
outputs/tmp/vectorengine-image-text-smoke/gpt-image-2-hard-text-20260619T083215Z.png
```

The hard-text image visually preserved `LunaCards`, `日本語 A1`, `ქართული A1`, `العربية A1`, `தமிழ் A1` and `O‘zbek tili A1` well enough for thumbnail exploration. The earlier prompt with pipe separators produced an extra `|`, so thumbnail prompts must list exact text on separate lines and explicitly forbid separators/extra symbols. GPT Image 2 may be used for full thumbnail candidates, including rendered text, but mass generation still needs a readback gate: at minimum human visual spot-check for new scripts, and preferably OCR/vision validation before public upload at scale.

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
3. **Phase C - uploader.** Only after OAuth/channel ownership is configured, add upload/private-or-unlisted flow, thumbnail set, playlist resolve/create, playlist item insert and ledger write.
4. **Phase D - public publish.** Make videos public only after visual spot-check, description URL check, playlist membership readback and channel placement/readiness check.

2026-06-20 implementation status:

- `config/youtube-playlists.json` is the structured playlist registry. It stores `playlist_key`, support/target language, course family, level/track, channel id, eventual YouTube playlist id, title/description and readback status. Do not prefill every possible language pair; add planned entries from real upload candidates.
- `scripts/lib/youtube-playlists.mjs` computes stable playlist assignments without importing the heavy video renderer. New `youtube_metadata.json` files generated through `scripts/generate-youtube-metadata.mjs` now include `playlist_key`, `playlistKey` and a `playlist` object.
- `npm run check:youtube-metadata` warns on historical metadata without `playlist_key`, but blocks a present mismatched key.
- `npm run plan:youtube-publish -- <metadata-file-or-dir> [--write-registry] [--allow-playlist-create]` produces a dry-run report under `outputs/youtube-publish-plan-*.json`, estimates quota, resolves channel/playlist assignment and can add missing planned playlist entries locally.
- `npm run apply:youtube-publish -- --metadata=<youtube_metadata.json> [--video=<mp4>] [--thumbnail=<image>] [--create-playlist]` is dry-run by default. Live YouTube writes require `--apply --confirm-youtube-write`. `--privacy=public` is refused unless `--confirm-public` is also passed.
- The uploader uses the official YouTube Data API only: resumable `videos.insert`, optional `thumbnails.set`, optional unlisted `playlists.insert`, `playlistItems.insert`, `videos.list` readback and JSONL append to `outputs/youtube-publish-ledger.jsonl`.
- Smoke proof on 2026-06-20 used the historical EN->ES first-deck test metadata: `npm run check:youtube-metadata` passed with only the expected historical missing-`playlist_key` warning; `npm run plan:youtube-publish -- ... --write-registry --allow-playlist-create` added planned playlist `EN__ES__ordinary-vocabulary__a1-everyday`; uploader dry-run resolved channel `en`, video path and estimated 1700 quota units without live YouTube writes.
- 2026-06-21 GitHub upload workflow: `.github/workflows/youtube-video-publish.yml` is the manual GitHub Actions entrypoint for build + metadata + playlist plan + optional YouTube upload. `mode=plan` builds/validates and uploads non-secret artifacts without restoring OAuth. `mode=apply` restores `YOUTUBE_OAUTH_BUNDLE_TGZ_B64` from environment `youtube-api-branding` and requires `confirm_youtube_write=APPLY_YOUTUBE_UPLOAD`. `privacy=public` additionally requires `confirm_public=PUBLISH_PUBLIC`; default is `unlisted`. The workflow refuses `support=ALL`; pass an explicit support list such as `RU` or `RU,EN,ES` to avoid accidental quota burn and cross-channel writes. Missing playlists can be created as unlisted when `create_playlists=true`; the updated `config/youtube-playlists.json` and `outputs/youtube-publish-ledger.jsonl` are uploaded as artifacts and must be reviewed/committed before relying on created playlist IDs in later separate runs.

Recommended publication flow:

1. generate video, thumbnail and `youtube_metadata.json`;
2. validate metadata with `scripts/check-youtube-metadata.mjs`;
3. upload video as `private` or `unlisted` first;
4. set custom thumbnail only after image/OCR or human visual readback;
5. resolve or create playlist by `playlist_key`;
6. add the video to the playlist;
7. write `videoId`, `playlistId`, `playlistItemId`, status, privacy, and readback timestamp to a machine-readable ledger;
8. make public only after spot-checking the video, thumbnail, description URL, playlist membership and channel placement.

Acceptance gates before any automated YouTube playlist writes:

- dry-run report includes `supportLang`, `targetLang`, `setId` or course release id, `courseFamily`, `levelOrTrack`, computed `playlist_key`, localized playlist title/description and public course URL;
- no duplicate `playlist_key` values with conflicting meanings;
- every generated upload candidate has a playlist assignment or an explicit `playlist_excluded_reason`;
- playlist create/add calls are idempotent and read back the resulting `youtube_playlist_id` / `playlistItemId`;
- quota cost estimate is printed before a batch and the batch can stop before spending quota;
- failures leave a ledger row with status and error, not an ambiguous half-published state;
- `docs/video-lessons-strategy.md`, `docs/video-lessons-registry.md` and `docs/PROJECT_STATE.md` are updated when the workflow contract changes.

Do not rely on `docs/video-lessons-registry.md` alone for playlist automation. That markdown table is useful as a human-readable status ledger, but playlist upload/publish needs a structured JSON/JSONL registry to avoid duplicates and title/localization drift.

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
scripts/lib/youtube-metadata.mjs
```

Metadata включает `title`, `description`, `tags`, `hashtags`, `categoryId=27`, `privacyStatus`, `courseUrl`, `supportLang`, `targetLang`, `setId` и provenance (`source`, `model`, `generatedAt`). По умолчанию `privacyStatus=unlisted`, чтобы массовая автозагрузка сначала проходила human spot-check перед public publish.

Правило качества:

- template fallback всегда должен работать без AI и без внешней зависимости;
- Gemini используется только как AI-polish слой поверх фактов из Course Metadata, списка слов и public course URL;
- Gemini output не должен придумывать длительность, платные обещания, сертификаты, guaranteed fluency, teacher/native-speaker claims beyond the actual video facts;
- `description` должен содержать точный `courseUrl`;
- `tags` не должны содержать hashtags, а общий YouTube tag budget должен оставаться <= 500 chars;
- `scripts/check-youtube-metadata.mjs` является обязательным gate перед upload stage.

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

GitHub metadata workflow выбирает VectorEngine, если задан ключ `VECTORENGINE_API_KEY` / `VECTOR_ENGINE_API_KEY`; иначе используется direct Google key, если он есть; иначе workflow остается успешным на template fallback. `VECTORENGINE_GEMINI_MODEL` нужен только для явного override модели. VectorEngine здесь используется только как Gemini text proxy для `youtube_metadata.json`; он не меняет видео-рендеринг, TTS, QR или slide templates.

2026-06-19 live smoke confirmed the working VectorEngine text path: `gemini-3.5-flash:generateContent`. Local smoke `npm run check:vectorengine-gemini -- --confirm-spend` wrote `outputs/tmp/vectorengine-gemini-smoke/vectorengine-gemini-smoke-20260619T072602Z.json` with `status=ok`. GitHub Actions smoke `build-test-single.yml` run `27813244643` passed on commit `5a11a44` in `3m20s`; downloaded artifact `outputs/github-vectorengine-test-27813244643/test-single-video-uz/home_kitchen_cookware_pilot_01_en_uz/youtube_metadata.json` has `source=gemini-vectorengine` and `model=gemini-3.5-flash`, and `npm run check:youtube-metadata -- outputs/github-vectorengine-test-27813244643` passed with 0 blockers/warnings. On 2026-06-20 `gh secret list --repo webpot-ru/luna` read back `VECTORENGINE_API_KEY` by name/update timestamp as updated at `2026-06-20T13:39:07Z`; the secret value was not read or printed. No new live VectorEngine smoke was run on 2026-06-20 because it spends API usage. Earlier failures were tied to other VectorEngine models/endpoints (`gemini-3-pro-preview` stream timeout, `gemini-3.1-pro-preview`/`gemini-2.5-flash`/`gemini-2.0-flash` 503, `gemma-7b-it` 429) and should not be used as the default path.

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
* **Для русскоязычных видео:** *«LunaCards является независимым образовательным тренажером. Данные материалы разработаны независимо от авторов и издателей оригинального учебника [Название учебника] и не аффилированы с ними».*
* **Для англоязычных видео:** *«LunaCards is an independent educational tool. These practice materials are developed independently and are not affiliated with, sponsored by, or endorsed by the authors or publishers of [Textbook Name].»*

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
