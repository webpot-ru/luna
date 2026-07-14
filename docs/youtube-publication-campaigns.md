# YouTube Publication Campaigns

Source of truth для повторяемых смешанных волн публикации: несколько следующих ordinary-видео плюс Polyglot на каждый из 51 физического support-канала, без повторного выбора уже опубликованного контента и без независимой гонки календарей.

## Пользовательский контракт

Запрос вида «для Deck #2 опубликуй по 5 следующих ordinary и по 1 следующему full Polyglot на каждый канал» означает одну кампанию:

- support-слой: ровно 51 физический канал; `EN-GB -> EN`, `ES -> ES-419`, `PT -> PT-BR` как support/native, но региональные варианты сохраняются как target;
- ordinary: первые 5 незанятых tail assignment на каждый канал;
- Polyglot: первый незанятый full bundle tail на каждый канал;
- календарь: только shared allocator из `config/youtube-publish-schedule-policy.json`, самая ранняя безопасная свободная ячейка, без пропуска более ранней пустой даты;
- publication mode: `scheduled`, upload privacy `private`, публичность наступает в `publishAt`;
- runtime image generation: запрещена;
- `customThumbnailUploadAllowed=false` или неизвестное значение: видео разрешено, используется YouTube automatic thumbnail, custom cover не создается и `thumbnails.set` не вызывается;
- `customThumbnailUploadAllowed=true`: apply требует точный approved Git-tracked JPG с совпадающим checksum;
- никакого watch, автоматического retry или повторного dispatch.

Для полного стандартного запроса размер волны равен `51 * (5 + 1) = 306`: 255 ordinary и 51 Polyglot. Текущая маршрутизация: `youtube-1=72`, `youtube-2=78`, `youtube-3=78`, `youtube-4=78`.

## Почему старый bulk-контур давал дубли и пропуски

Старые ordinary и Polyglot dispatchers выбирали «следующие» элементы и писали календарь независимо в каждом child run. Между планированием и durable merge не было единой транзакции:

1. несколько workers могли прочитать одинаковое старое состояние;
2. каждый вычислял следующий target/slot самостоятельно;
3. видео могло успешно загрузиться, а child persist-job не успевал записать registry;
4. следующий запуск видел старый ledger и снова выбирал уже загруженное видео;
5. отдельные ordinary/Polyglot allocator passes могли занять календарь в разном порядке и оставить дату пустой;
6. 51 ordinary плюс 51 Polyglot worker делали около 102 мелких Gemini-запросов вместо крупных batch.
7. пустой `youtube_playlist_id` поздно трактовался как разрешение на `playlists.insert`, хотя это мог быть уже существующий, но не записанный локально плейлист.

Количество видео или строк registry никогда не является доказательством полноты. Apply разрешается только после authenticated four-route live audit.

## Durable state

- `config/youtube-publication-snapshot.json`: свежий API readback, не apply token;
- `config/youtube-playlist-discovery-snapshot.json`: свежая полная route-authenticated инвентаризация owned playlists и их video IDs; не apply token;
- `config/youtube-publication-campaigns.json`: campaign state и receipts;
- `config/youtube-publication-campaign-plans/<campaignId>.json`: неизменяемый manifest;
- `config/youtube-publish-calendar.json`: shared physical-channel slots и campaign claims;
- `config/youtube-published-videos.json`: ordinary publications;
- `config/youtube-polyglot-published-videos.json`: Polyglot publications;
- `config/youtube-polyglot-progress.json`: Polyglot progress;
- `config/youtube-cover-assets.json`: approved cover manifests.

Campaign source deck тоже неизменяем: plan фиксирует SHA-256 локального Deck JSON. Apply допускает Git-tracked JSON, настроенный Drive file ID с той же локально проверенной копией либо подтвержденный исторический Git blob, чей object ID совпадает с локальным файлом. GitHub runner делает full-history checkout, восстанавливает exact blob при необходимости и сверяет фактический SHA до metadata phase. Deck #2 `home_kitchen_cooking_actions_a1_a2` сейчас подтвержден как historical blob `144f997ab79e4e99efaf18c0d7592fb904609dd1` из commit `0a4e6907`; повторно коммитить игнорируемый 37 MB JSON не требуется.

Ordinary identity: `setId + canonical supportLang + targetLang`. Polyglot identity: `setId + canonical supportLang + bundleKey + contentScope`; изменение target hash внутри занятого bundle slot является blocker.

Legacy per-video planners may still emit a compatibility `polyglotKey` without the trailing `contentScope`. Campaign ownership must never compare that raw string with a scoped durable key. It resolves the reservation by canonical `polyglotSlotKey` (`set + support + bundle + contentScope`) and then separately requires the exact canonical target set, campaign ID and manifest hash. A matching slot with target drift remains visible but does not satisfy campaign ownership.

Активная campaign claim блокирует повторный выбор assignment и физического `channelKey + publishAt` slot до `finalized` или отдельной подтвержденной reconciliation-процедуры.

## Safe publish sequence

1. Один read-only `.github/workflows/youtube-publication-control.yml` по всем четырем routes, без watch и без публикации. Для стандартного запроса передать `campaign_ordinary_per_channel=5`, `campaign_polyglot_per_channel=1`, `persist_snapshot=false`. Тот же run делает complete uploads pagination, `videos.list(status)` для всех IDs, complete `playlists.list(mine=true)` и `playlistItems.list` для каждого owned playlist, а затем строит один immutable no-spend campaign manifest из тех же свежих artifacts. Требуются zero live/registry/calendar duplicates и оба snapshot не старше 30 минут.
2. Локальный planner ниже остается эквивалентным fallback для уже скачанных exact snapshots; не запускать второй независимый selector поверх GitHub plan:

```bash
npm run plan:youtube-publication-campaign -- \
  --set=home_kitchen_cooking_actions_a1_a2 \
  --supports=ALL \
  --ordinary-per-channel=5 \
  --polyglot-per-channel=1 \
  --min-future-minutes=90 \
  --max-snapshot-age-minutes=30 \
  --require-apply-ready \
  --output=outputs/youtube-publication-campaign-plan.json
```

3. Показать exact assignments, schedule range, route counts, cover readiness, playlist readiness и cost/quota estimate. Для каждого assignment playlist может быть только `resolved_existing` с проверенным live ID либо `verified_absent` после полной channel inventory. Blank registry ID без discovery остается blocker. Остановиться до explicit approval.

Quota estimate разделяет `estimatedVideoUploadCalls` и general quota, включая `byRoute`. Для general quota план показывает `playlistItems.insert=50` на видео, `playlists.insert=50` только для `verified_absent`, и `thumbnails.set=50` только для разрешённой custom cover. Пока playlist discovery отсутствует, cost preflight fail-closed считает maximum create для всех assignments. Историческая оценка `100 units` за `videos.insert` здесь не используется. Стандартные route shards `72/78/78/78` остаются ниже default `100 videos.insert` calls на проект; route-level general maximum также должен быть не выше доступной квоты перед apply.

4. После approval записать одну атомарную claim и immutable manifest:

```bash
npm run claim:youtube-publication-campaign -- \
  --manifest=outputs/youtube-publication-campaign-plan.json \
  --apply \
  --confirm=CLAIM_YOUTUBE_PUBLICATION_CAMPAIGN
```

5. Commit/push только exact code/config/manifest/assets по проектным Git-правилам. Apply из незапушенной ветки запрещен.
6. Один fire-and-forget `.github/workflows/youtube-publication-campaign.yml` в `mode=apply` с exact `campaign_id`, `campaign_manifest_hash` и `confirm_campaign_apply=APPLY_YOUTUBE_PUBLICATION_CAMPAIGN`.
7. Не смотреть child runs непрерывно. Один bounded readback позже. На failure после metadata/render/TTS/image остановиться и сообщить artifact/stage; не retry и не reupload.

## Metadata batching

Campaign apply сначала выполняет отдельную metadata matrix по 4 OAuth routes. Внутри route ordinary и Polyglot tasks смешиваются в synchronous Gemini batches до 10 независимых `requestId` на один запрос. Стандартная волна 306 видео требует 32 route-batched requests (`8 + 8 + 8 + 8`), а не 102 child-worker requests. Теоретический global minimum равен 31, но route split сохраняется, потому что secrets и provider access принадлежат разным GitHub Environments.

Порядок: direct `GEMINI_API_KEY`/`GOOGLE_API_KEY`, затем `GEMINI_API_KEY_2`; VectorEngine допускается только с `USE_VECTORENGINE_METADATA`. Для `gemini-3.5-flash` campaign batch передает `maxOutputTokens=60000` при модельном output limit `65536`; это запас для полного JSON, а prompt ограничивает description 3-5 короткими предложениями / 900 Unicode characters и Polyglot playlist description 600 characters. `finishReason` кроме `STOP`, invalid/truncated JSON и неполный exact request-id set являются response-integrity failure: один переход на второй direct key, затем на подтвержденный VectorEngine, без слепого retry того же ключа. Exact request-id set и language/SEO gates обязательны. Если metadata phase падает, TTS, render и YouTube upload jobs не стартуют.

## One finalizer

Campaign child workflows получают `campaign_id`, поэтому их standalone persist jobs автоматически отключены. Campaign-поля доступны только через внутренний `workflow_call` и не занимают ограниченный 25 inputs ручной формы. После всех workers один parent finalizer последовательно объединяет artifacts, сопоставляет publications с `campaignId + manifestHash`, обновляет registry/calendar/receipts и делает один exact state commit.

Перед `playlists.insert` campaign uploader повторно перечисляет все owned playlists и ищет stable key marker или exact deterministic title. Найденный один playlist используется без создания; несколько совпадений блокируют write; только complete no-match разрешает один create. Новый playlist получает marker `LunaCards playlist key: <stable-key>` в description.

`finalized` допустим только когда присутствуют все expected receipts, один YouTube ID не назначен двум assignments, `publishAt` совпадает с claimed slot, обязательная custom cover реально установлена, есть `youtubePlaylistId` и `playlistItemId`, resolved playlist ID совпадает с manifest и нет `postUploadError`. Любая неполнота или mismatch дает `reconciliation_required`; claims сохраняются, а автоматический повтор запрещен. Сначала нужен новый read-only live audit и exact reconciliation plan.

## Zero-upload re-arm

Если finalizer доказал `completedCount=0`, `observedCount=0`, `artifactCount=0`, а два complete all-route control reports до и после failure имеют идентичный YouTube video-ID set, допускается отдельный zero-upload re-arm. Planner получает `--replacement-campaign-id=<old-id>` и виртуально исключает только эту `reconciliation_required` campaign из assignment/slot claims; исходные registry/calendar остаются неизменными до apply. Новый manifest обязан содержать ровно тот же assignment-key set, новый campaign ID/hash и безопасные будущие слоты.

`npm run rearm:youtube-publication-campaign` по умолчанию является dry-run. Apply требует `--confirm=REARM_ZERO_UPLOAD_YOUTUBE_PUBLICATION_CAMPAIGN`; он fail-closed проверяет оба control reports, exact live-ID equality, zero campaign receipts/artifacts, exact assignment identity, old claim integrity, other-campaign conflicts, slot collisions, canonical identities и минимальный future buffer. Только после этого старые campaign/calendar rows становятся `superseded_zero_upload_recovery`, а новый immutable manifest и claims записываются вместе. Это локальная durable-state операция: provider calls и YouTube writes равны нулю, publication dispatch остаётся отдельным подтверждением.

Standalone ordinary/Polyglot workflows сохраняют собственный persist-job для одиночных legacy-запусков. Они не являются основным путем для смешанной 51-channel campaign.

## Current implementation state

На 2026-07-14 run `29317134907` финализирован как второй zero-upload failure: 4/4 metadata routes получили обрезанный JSON из-за локального output cap, все 306 render/upload children были пропущены, finalizer зафиксировал `0` completed/observed/artifacts/receipt errors. Исправленная локальная recovery campaign `yt-home_kitchen_cooking_actions_a1_a2-2026-07-14-51321f6fa942` / manifest `e5a188973d684038cd0196795acb01761ebec314c37e9c6cf3ba4577d728819a` сохраняет те же `306/306` assignments, route split `72/78/78/78` и schedule `2026-07-14T11:45:00Z..2026-07-17T18:30:00Z`. До exact commit/push и нового dispatch provider/YouTube writes для этой recovery равны нулю.
