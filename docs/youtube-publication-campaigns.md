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
- `longVideoUploadAllowed` независим от custom-thumbnail capability. Только явное `true` разрешает full Polyglot дольше 15 минут; это не следует выводить из отсутствия/наличия JPG. Если значение `false` или неизвестно, канал не исключается и не ждёт ручной проверки: campaign обязан заранее заменить Polyglot candidate на один `short_unverified` продукт с `maxDurationSeconds=895` (`14:55`). Значение `shortUnverifiedPolyglotCardLimit=0` означает динамический максимум: renderer один раз измеряет actual cached TTS для candidate deck + intro/outro, берёт максимальный непрерывный префикс, который укладывается, и использует те же дорожки для render. Такой short не закрывает будущий full bundle tail; short/full pair for one support channel + bundle is a hard preflight blocker, поэтому подтверждённый позднее full требует отдельного exact upgrade/replacement решения. До metadata/TTS/render scheduled apply требует complete playlist discovery: уже существующий playlist обязан быть `public`, а complete no-match остаётся create-eligible (новый playlist создаётся public).
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

Ordinary identity: `setId + canonical supportLang + targetLang`. Polyglot product identity: `setId + canonical supportLang + bundleKey`; `contentScope` и target hash являются атрибутами единственного продукта, не разрешением создать второй active video. Short не закрывает full tail, но active short/full pair в одном Polyglot product slot является blocker.

Legacy per-video planners may still emit a compatibility `polyglotKey` without the trailing `contentScope`. Campaign ownership resolves the reservation by the canonical unscoped `polyglotSlotKey` (`set + support + bundle`) and then separately requires the exact scope, canonical target set, campaign ID and manifest hash. A matching slot with target or scope drift remains visible but does not satisfy campaign ownership.

Активная campaign claim блокирует повторный выбор assignment и физического `channelKey + publishAt` slot до `finalized` или отдельной подтвержденной reconciliation-процедуры.

## Safe publish sequence

1. Один read-only `.github/workflows/youtube-publication-control.yml` по всем четырем routes, без watch и без публикации. Без campaign-плана он читает uploads pagination и `videos.list(status)` для всех IDs, строит свежий live snapshot и не обходит плейлисты. Для no-spend campaign-плана передать точные `campaign_supports`, `campaign_ordinary_per_channel` и `campaign_polyglot_per_channel`: workflow дополнительно читает только owned playlists этих support-каналов, а не все 51 канала. State drift сохраняется как evidence/snapshot with blockers instead of aborting the audit job; campaign planning/apply remains blocked until duplicates, registry and calendar blockers are zero. Live snapshot и выбранный playlist-discovery snapshot должны быть не старше 30 минут.
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
6. Один fire-and-forget `.github/workflows/youtube-publication-campaign.yml` в `mode=apply` с exact `campaign_id`, `campaign_manifest_hash` и `confirm_campaign_apply=APPLY_YOUTUBE_PUBLICATION_CAMPAIGN`. Apply preflight строит worker matrix только для video type, который запрошен в claimed campaign: ordinary-only и Polyglot-only recovery campaigns валидны; отсутствующий другой type не является blocker. Empty reusable matrix GitHub может отдать как `skipped` или `failure`, поэтому Polyglot worker опирается на точный preflight `ordinary_worker_count`: ноль разрешает следующий worker, любое требуемое ordinary failure блокирует его. Finalizer считает non-success допустимым только для типа с нулевым expected count.
7. Не смотреть child runs непрерывно. Один bounded readback позже. На failure после metadata/render/TTS/image остановиться и сообщить artifact/stage; не retry и не reupload.

`youtube-video-publish.yml` и `youtube-polyglot-video-publish.yml` являются только внутренними reusable workers: их ручной `workflow_dispatch mode=apply` намеренно запрещён. Это исключает независимые calendar claims, per-child live control и competing state commits; новые волны запускаются только через уже claimed campaign.

## Точный repair scheduled даты

`youtube-repair-scheduled-publish-at.yml` обслуживает только committed plan `config/youtube-schedule-repair-plans/deck1-polyglot-calendar-conflicts-20260715.json`. Он не создаёт новую публикацию: перед единственным `videos.update(status)` сверяет владельца канала, `private` и прежний `publishAt`. После write workflow делает bounded propagation readback: ждёт 15 секунд, затем читает тот же ID максимум три раза с двумя дополнительными паузами по 10 секунд. Он никогда не повторяет `videos.update`; в failure evidence сохраняет `before`, ответ update и все post-update readback. В workflow нет render, TTS, metadata, thumbnails, playlist operations, uploads или deletes. Если первый ID даёт mismatch или API error, второй не пытается менять. Уже перенесённый на точную целевую дату ID остаётся read-only.

## Metadata batching

Campaign apply сначала выполняет отдельную metadata matrix по 4 OAuth routes. Route jobs стоят в очереди с `max-parallel: 1`, потому что используют общие provider secrets; GitHub runner queue сама по себе не считается ограничителем provider concurrency. Внутри route ordinary и Polyglot tasks смешиваются в synchronous batches до 5 независимых `requestId` на один запрос. Стандартная волна 306 видео требует 63 route-batched requests (`15 + 16 + 16 + 16`), а не 102 child-worker requests. Теоретический global minimum равен 62, но route split сохраняется, потому что route artifacts/checkpoints и GitHub Environments разделены. Batch size `5` является production maximum: run `29323860280` доказал, что batch `10` может трижды превысить output capacity (`MAX_TOKENS` на обоих direct keys, затем truncated VectorEngine JSON) до render/TTS/upload.

Production chain после отдельного `confirm_openai_metadata=USE_OPENAI_METADATA`: OpenAI Responses API, direct `GEMINI_API_KEY`/`GOOGLE_API_KEY`, затем `GEMINI_API_KEY_2`; VectorEngine допускается только с `USE_VECTORENGINE_METADATA`. OpenAI использует repository secret `OPENAI_API_KEY`, default model `gpt-5.4-mini-2026-03-17`, Structured Outputs, `store=false`, low reasoning/verbosity, до `5` задач и `max_output_tokens=12000`. `OPENAI_SERVICE_TIER` принимает только `auto`, `default` или `flex`; production default — `auto`, чтобы eligible traffic мог получить фактический `data_sharing_incentive` tier. Checkpoint записывает actual returned tier и input/output/reasoning/total token usage. Missing key, HTTP 429/5xx, timeout, incomplete status, refusal, invalid JSON или exact-ID mismatch переводят batch к Google без повторного OpenAI-вызова.

Если OpenAI и оба direct Google key не дали полный валидный ответ, только VectorEngine fallback делит этот логический batch на подбатчи максимум по `2` (`2+2+1` для пяти задач). Каждый подбатч отдельно обязан вернуть complete JSON с exact request-id set; затем результаты объединяются в исходном порядке и повторно валидируются целиком. Для `gemini-3.5-flash` каждый provider request передает `maxOutputTokens=60000` при модельном output limit `65536`; prompt ограничивает description 3-5 короткими предложениями / 900 Unicode characters и Polyglot playlist description 600 characters. Length gates count Unicode code points with `Array.from`; `ZH`, `JA` and `KO` require at least `150`, not the Latin-script minimum. Exact request-id set и language/SEO gates обязательны. Если metadata phase падает, TTS, render и YouTube upload jobs не стартуют.

OpenAI Batch API не используется в этом synchronous campaign workflow: он даёт 50% price reduction, но имеет completion window до 24 часов и требует upload JSONL -> create batch -> bounded completion readback -> output merge. Без отдельного двухфазного planner он может оставить уже claimed календарные слоты без готовых metadata. Flex можно включить через `OPENAI_SERVICE_TIER=flex`, но он предназначен для менее срочных задач и может быть медленнее/временно недоступен; при действующей бесплатной data-sharing квоте преимущество Flex не доказано, поэтому default остаётся `auto`.

Metadata generator пишет атомарный `index.json` checkpoint до provider call и после каждого полностью завершенного batch. Metadata artifact загружается с `if: always()` даже при последующем падении route. Автоматического retry нет. Только отдельно подтвержденный recovery dispatch может передать `metadata_resume_run_id=<prior-run-id>`: workflow скачивает exact route artifact, а generator повторно использует лишь batch, у которого совпадают campaign id, manifest hash, route, batch size, assignment count, destination, artifact SHA-256 и metadata ownership. Отсутствующий artifact означает обычную генерацию в рамках подтвержденного recovery; несовместимый, поврежденный или частичный checkpoint блокирует provider calls. Это не разрешение повторно запускать campaign без safe publish protocol.

## One finalizer

Campaign child workflows получают `campaign_id`, поэтому их standalone persist jobs автоматически отключены. Campaign-поля доступны только через внутренний `workflow_call` и не занимают ограниченный 25 inputs ручной формы. После всех workers один parent finalizer последовательно объединяет artifacts, сопоставляет publications с `campaignId + manifestHash`, обновляет registry/calendar/receipts и делает один exact state commit.

Перед `playlists.insert` campaign uploader повторно перечисляет все owned playlists и ищет stable key marker или exact deterministic title. Найденный один playlist используется без создания; несколько совпадений блокируют write; только complete no-match разрешает один create. Новый playlist получает marker `LunaCards playlist key: <stable-key>` в description.

`finalized` допустим только когда присутствуют все expected receipts, один YouTube ID не назначен двум assignments, `publishAt` совпадает с claimed slot, обязательная custom cover реально установлена, есть `youtubePlaylistId` и `playlistItemId`, resolved playlist ID совпадает с manifest и нет `postUploadError`. Любая неполнота или mismatch дает `reconciliation_required`; claims сохраняются, а автоматический повтор запрещен. Сначала нужен новый read-only live audit и exact reconciliation plan.

## Zero-upload re-arm

Если finalizer доказал `completedCount=0`, `observedCount=0`, `artifactCount=0`, а два complete all-route control reports до и после failure имеют идентичный YouTube video-ID set, допускается отдельный zero-upload re-arm. Planner получает `--replacement-campaign-id=<old-id>` и виртуально исключает только эту `reconciliation_required` campaign из assignment/slot claims; исходные registry/calendar остаются неизменными до apply. Новый manifest обязан содержать ровно тот же assignment-key set, новый campaign ID/hash и безопасные будущие слоты.

`npm run rearm:youtube-publication-campaign` по умолчанию является dry-run. Apply требует `--confirm=REARM_ZERO_UPLOAD_YOUTUBE_PUBLICATION_CAMPAIGN`; он fail-closed проверяет оба control reports, exact live-ID equality, zero campaign receipts/artifacts, exact assignment identity, old claim integrity, other-campaign conflicts, slot collisions, canonical identities и минимальный future buffer. Только после этого старые campaign/calendar rows становятся `superseded_zero_upload_recovery`, а новый immutable manifest и claims записываются вместе. Это локальная durable-state операция: provider calls и YouTube writes равны нулю, publication dispatch остаётся отдельным подтверждением.

Если exact before/after control reports уже доказывают zero-upload и равенство live-ID set, replacement planner может читать только snapshot и playlist-discovery artifact из этого after report с ограниченным evidence window. Это разрешено исключительно при `--replacement-campaign-id` перед немедленным `rearm`; manifest обязан сохранить exact assignment set, а `rearm` повторно валидирует оба reports. Такой artifact не является свежим общим разрешением на обычный publish plan и не отменяет строгий pre-upload readback.

Standalone ordinary/Polyglot workflows сохраняют собственный persist-job для одиночных legacy-запусков. Они не являются основным путем для смешанной 51-channel campaign.

## Current implementation state

На 2026-07-14 run `29317134907` финализирован как zero-upload failure из-за малого local output cap. Следующий run `29320229328` использовал исправленный cap, но также завершился zero-upload failure: 4/4 route metadata jobs упали на жестком `120000 ms` provider timeout и последующем VectorEngine timeout/invalid JSON; ordinary/Polyglot были пропущены. Finalizer commit `94cbf801` записал `reconciliation_required`, `0` completed/observed/artifacts/receipt errors и `306` missing. Локальное исправление timeout/key rotation/checkpoint recovery проверено тестами.

Atomic zero-upload re-arm затем заменил campaign `yt-home_kitchen_cooking_actions_a1_a2-2026-07-14-51321f6fa942` на `yt-home_kitchen_cooking_actions_a1_a2-2026-07-14-4e154baec3a1`, manifest `20aa4f6773995b9895deca8ff075e058b4836039e4bc3c9a6073c00e7759bd5e`. Доказательство: complete all-route reports `29310491576` и `29313476327`, одинаковые `1230` live video IDs, added/removed `0`, finalizer `completed=0`, `observed=0`, `artifacts=0`. Старые `306` claims стали `superseded_zero_upload_recovery`, новые `306` claims имеют `campaign_claimed`, assignment sets совпадают точно, active channel/time collisions равны `0`; schedule `2026-07-14T15:00:00Z..2026-07-17T18:30:00Z`. Операция не вызвала providers и не писала в YouTube. Publication dispatch не запускался и остаётся отдельным подтверждаемым действием после commit/merge durable state.

Recovery run `29323860280` для этого campaign был остановлен после route-1 metadata failure: batch `10` трижды не поместился в provider output (`MAX_TOKENS` на обоих direct keys, затем truncated VectorEngine JSON). Ordinary/Polyglot upload jobs были skipped; finalizer `cf820e84` зафиксировал `0/306` uploads. Production batch теперь равен `5`, а новый zero-upload re-arm campaign — `yt-home_kitchen_cooking_actions_a1_a2-2026-07-14-e5e3790343d8`, manifest `744e5c5aefb8586cc29df7edcb2202bfec8eac190d5641524ebfa6aa5e4e8619`, schedule `2026-07-14T15:30:00Z..2026-07-17T18:30:00Z`. Он сохраняет exact `306` assignments и не переиспользует checkpoint старого campaign ID/hash.

Provider repair после run `29325505411` merged в `main` через PR `#20`, merge `2ba9aad7`: direct batch остаётся `5`, metadata routes идут с `max-parallel: 1`, а VectorEngine fallback ограничен двумя задачами на provider call. Production-shaped canary `2026-07-14T11:05:57Z..11:10:03Z` вернул обе тестовые metadata-задачи одним complete JSON, exact request IDs и `providerCallCount=1`; GitHub publication dispatch, render, TTS и YouTube writes в PR не выполнялись. Это доказывает рабочий размер `2`, но также показывает high latency около четырех минут, поэтому VectorEngine остается последним fallback, а не primary backend.

Post-failure all-route audit `29330360665` после run `29325505411` завершился healthy: complete pagination/status/playlist evidence, `0` blockers/duplicates/calendar gaps и exact live-ID equality с audit `29313476327` (`1230 -> 1230`, added/removed `0`). Subsequent run `29338018443` stopped at claimed-state preflight, so metadata, render, TTS and every YouTube operation remained skipped; finalization did not run. Its durable campaign `yt-home_kitchen_cooking_actions_a1_a2-2026-07-14-43a79edc0a68` was then zero-upload re-armed from the exact post-failure snapshot/playlist-discovery artifacts into claimed campaign `yt-home_kitchen_cooking_actions_a1_a2-2026-07-14-653a61b587f9`, manifest `13f458579b940446f0d960c78b087ac81aafe5ea7f60629372d1a040928663f4`. The scope remains exact `306` (`255` ordinary + `51` Polyglot), route split `72/78/78/78`, `90` custom + `216` automatic covers; schedule `2026-07-14T19:30:00Z..2026-07-17T18:30:00Z`. `231` playlists resolve to existing IDs and `75` are verified absent/create-eligible. Re-arm made `0` provider calls and `0` YouTube writes; publication dispatch remains separate.
