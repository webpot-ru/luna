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

Визуально channel art должен быть продолжением сайта `flashcardsluna.com`: light `#f4f7f9` page background, white rounded library panels, soft blue-gray borders, real course-card thumbnail feel, blue CTA accents, restrained violet accent and deep navy typography. Первый broad site-style EN banner candidate: `outputs/youtube-channel-assets/en/lunacards-en-channel-banner-youtube-2560x1440-v8-site-ui-general-clean.png`; central safe-area check: `outputs/youtube-channel-assets/en/lunacards-en-channel-banner-safearea-preview-v8-site-ui-general-clean.png`. Narrower language-only alternative remains `outputs/youtube-channel-assets/en/lunacards-en-channel-banner-youtube-2560x1440-v6-site-ui-safe.png`.

2026-06-19 localized site-style banner batch for `ES`, `PT`, `RU`, `HI`, `ID`, `FR`, `DE`, `JA`, `KO`, `TR` and `ZH` is stored under `outputs/youtube-channel-assets/<support-code>/`. The production upload file pattern is `lunacards-<code>-channel-banner-youtube-2560x1440-v1-site-ui.png`; the central visual check pattern is `lunacards-<code>-channel-banner-safearea-preview-v1-site-ui.png`; batch safe-area overview is `outputs/youtube-channel-assets/localized-safearea-contact-sheet-v1.png`. The Google Sheet tracker row for each generated language points at the upload-ready banner and the shared site-logo avatar `outputs/youtube-channel-assets/en/flashcardsluna-site-avatar-512.png`.

Первый рабочий пакет для EN-канала создан в:

```text
outputs/youtube-channel-assets/en/channel-package.md
```

Он включает banner/avatar candidates, channel description, first playlists and the first two unlisted upload candidates from the GitHub EN support render test.

Операционный трекер каналов ведется в Google Sheet `Ютуб курсы FCL`, tab `YouTube каналы`:

```text
https://docs.google.com/spreadsheets/d/1Uw5mO7Xy1asF-WlbRkphUCftaGDP6uVtu6xGgXD00_I/edit#gid=202606190
```

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
4. **Regional target variants share a support-language channel but may split playlists only when the actual learning content differs.** `ES` vs `ES-419`, `PT` vs `PT-BR`, and `EN` vs `EN-GB` should not become separate channels; they can become separate playlists when audio/text/positioning differs enough for learners.
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
```

Initial playlist plan for the first channels:

| support channel | first playlist keys to prepare | Notes |
|---|---|---|
| `RU` | `RU__ES__spanish-a1-core__a1`, `RU__EN__oxford-3000-core__a1-a2`, `RU__ZH__hsk3__level-1__2025`, later `RU__ES__ordinary-vocabulary__a1-everyday` | Russian-native channel. Target English content belongs here; do not make `RU__RU` self-learning playlists. |
| `EN` | `EN__ES__spanish-a1-core__a1`, `EN__ZH__hsk3__level-1__2025`, `EN__RU__ordinary-vocabulary__a1-everyday`, later additional target-language ordinary tracks | English-native channel. Do not create `EN__EN` “learn English” playlists on the English-native channel; English-learning content belongs on non-English support channels. |
| future support channels | start with the same high-signal flagship families, not all possible pairs | Create channels only after support-language branding/channel ID is known and enough videos exist. |

Anti-rules:

- Do not pre-create all 54 x 53 language-pair playlists.
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

2026-06-19 live smoke confirmed the working VectorEngine text path: `gemini-3.5-flash:generateContent`. Local smoke `npm run check:vectorengine-gemini -- --confirm-spend` wrote `outputs/tmp/vectorengine-gemini-smoke/vectorengine-gemini-smoke-20260619T072602Z.json` with `status=ok`. GitHub Actions smoke `build-test-single.yml` run `27813244643` passed on commit `5a11a44` in `3m20s`; downloaded artifact `outputs/github-vectorengine-test-27813244643/test-single-video-uz/home_kitchen_cookware_pilot_01_en_uz/youtube_metadata.json` has `source=gemini-vectorengine` and `model=gemini-3.5-flash`, and `npm run check:youtube-metadata -- outputs/github-vectorengine-test-27813244643` passed with 0 blockers/warnings. Earlier failures were tied to other VectorEngine models/endpoints (`gemini-3-pro-preview` stream timeout, `gemini-3.1-pro-preview`/`gemini-2.5-flash`/`gemini-2.0-flash` 503, `gemma-7b-it` 429) and should not be used as the default path.

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
