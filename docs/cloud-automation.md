# Cloud Automation

Этот документ является source of truth по переносу проекта LunaCards в облачный/удаленный runtime и по автоматизации генерации колод.

Scope остается прежним: проект создает карточки, проверяет их качество, хранит рабочие данные в Postgres и выдает Google Sheets/spreadsheet-ready файлы. Этот документ не проектирует сайт и не описывает поведение сервиса после импорта карточек.

## Что можно перенести в облако

Проект переносится в облако не одной кнопкой `Cloud`, а как воспроизводимый runtime:

1. Git repository: код, документация, migrations, seeds, scripts, checked QA evidence и финальные артефакты, которые решено версионировать.
2. Postgres: рабочая база карточек. Восстановление идет через migrations/seeds для базового состояния или через database dump для точного текущего состояния.
3. Outputs: финальные `.xlsx`, review files and checked QA JSONL остаются внутри `outputs/` по принятому `.gitignore` policy.
4. Environment variables: `DATABASE_URL` и другие секреты настраиваются отдельно и не коммитятся.
5. Google Sheets delivery: финальные файлы должны попадать в обязательную папку Drive, описанную в [Data Delivery Pipeline](data-delivery-pipeline.md). Для automated folder placement использовать `scripts/upload-spreadsheet-to-drive-folder.mjs` with `GOOGLE_DRIVE_FOLDER_ID` and OAuth Desktop client credentials.

## Что нельзя обещать

Нельзя считать, что переключатель `Cloud` автоматически:

- видит локальный Docker/Postgres на Mac;
- видит локальные незакоммиченные файлы;
- переносит `.env`;
- переносит Google Drive folder placement;
- запускает 180 колод без генератора, QA evidence и статусов готовности.

Если cloud runtime стартует без git remote, database restore и environment setup, он не является полноценным рабочим окружением LunaCards.

## Cloud-ready checklist

Перед запуском в облаке:

1. `git status --short` пустой или все нужные изменения осознанно закоммичены.
2. Есть remote repository, доступный cloud runtime.
3. `.env` не закоммичен; `.env.example` содержит пример `DATABASE_URL`.
4. В облаке доступен Postgres и выставлен `DATABASE_URL`.
5. База восстановлена одним из способов:
   - `scripts/db-apply.sh` для schema+seed state;
   - `scripts/db-restore.sh <dump.sql>` для точного dump текущей базы.
6. Проходят read-only/static checks:

```bash
node scripts/check-cloud-ready.mjs
node scripts/check-language-order.mjs
node scripts/check-deck-specs.mjs
node scripts/check-product-roadmap.mjs
bash scripts/db-qa-set.sh home_kitchen_cookware_pilot_01
```

7. Финальная Drive-папка проверяется через Drive metadata/folder listing после каждого Google Sheet upload, and the local `*_delivery.json` manifest is updated.

Для автоматической загрузки в обычную пользовательскую Drive-папку в local runtime нужны:

```text
GOOGLE_DRIVE_FOLDER_ID=1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei
GOOGLE_OAUTH_CLIENT_FILE=.secrets/google-oauth-client.json
GOOGLE_OAUTH_TOKEN_FILE=.secrets/google-oauth-token.json
```

One-time authorization:

```bash
node scripts/upload-spreadsheet-to-drive-folder.mjs \
  --authorize
```

Service-account fallback for Shared Drive / explicitly shared setups:

```text
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/google-service-account.json
```

Альтернатива для secret manager: `GOOGLE_SERVICE_ACCOUNT_JSON=<raw service account json>`. Для обычной My Drive папки не полагаться на service account; OAuth от пользователя - основной путь.

Текущий GitHub remote:

```text
https://github.com/lalishka/cards-ramil-ready
visibility: PRIVATE
branch: main
```

## Database backup / restore

Для переноса точного состояния локальной базы в облако использовать:

```bash
scripts/db-dump.sh
```

Скрипт пишет plain SQL dump в:

```text
outputs/db/lunacards_<timestamp>.sql
```

В облаке восстановление в пустую/подготовленную Postgres-базу:

```bash
DATABASE_URL=<cloud_database_url> scripts/db-restore.sh outputs/db/lunacards_<timestamp>.sql
```

`db-restore.sh` не делает `drop database`, не чистит схему и не удаляет данные. Если база не пустая, restore может остановиться на конфликтах. Это намеренно: destructive restore требует отдельного явного решения.

Если локальный `pg_dump` / `psql` не совпадает с версией Postgres или не может подключиться, dump/restore scripts пробуют Docker fallback через сервис `postgres` из `docker-compose.yml`. Поэтому локальный переносимый backup можно сделать даже когда Homebrew `pg_dump` старее контейнера Postgres.

Текущий backup для cloud-переноса создан локально:

```text
outputs/db/lunacards_20260427T103851Z.sql
```

Файлы `outputs/db/*.sql` не коммитятся в git, потому что это полные database dumps.

## Automation principle

Автоматизация должна запускать не все строки из `Deck Master Plan`, а только разрешенные к генерации колоды.

Обязательные gates для каждой колоды:

1. Колода есть в [Deck Master Plan](deck-master-plan.md).
2. Статус колоды: `approved_for_generation`.
3. Нет active runtime-lock в `deck_generation_runs` для этого `set_id`.
4. Есть registry row и spec-файл в `docs/deck-specs/`.
5. Проходит:

```bash
node scripts/check-deck-ready.mjs <Sort|set_id>
```

6. Перед фактической работой runner создает `deck_generation_runs.run_status = running`; это runtime-lock, а не markdown-status.
7. Генерация работает vocabulary-only и не создает ready-phrase/mixed/dialogue decks.
8. Языки генерируются batch по 3 языка, кроме естественного хвоста или repair/recheck.
9. После generation запускается AI/source-backed QA:

```bash
node scripts/run-ai-qa.mjs <set_id> --languages=<codes|all> --checks=all --dry-run
node scripts/import-ai-qa-results.mjs outputs/qa/<checked-file>.jsonl
node scripts/check-qa-evidence.mjs <set_id>
bash scripts/db-qa-set.sh <set_id>
```

10. Final export разрешен только после полного покрытия 54 языковых вариантов и final-ready statuses:

```bash
node scripts/export-flashcards-working-sheet.mjs <set_id> --final
```

11. Google Sheet создается/обновляется и проверяется в обязательной Drive-папке:

```bash
node scripts/upload-spreadsheet-to-drive-folder.mjs \
  outputs/google-sheets/<final-workbook>.xlsx \
  --title="<deck Google Sheet title>"
```

Если это повторная выдача уже существующей Google Sheet, нужно добавлять `--file-id=<existing_google_sheet_id>`, чтобы обновить файл в папке без создания дубля.

12. После final export/upload runner выполняет обязательный post-final linguistic audit:

```bash
node scripts/export-final-linguistic-audit-batch.mjs <set_id> --languages=all
node scripts/run-final-linguistic-audit.mjs outputs/audit/final_linguistic_audit_<set_id>_<timestamp>_batch.jsonl
node scripts/import-final-linguistic-audit-results.mjs outputs/audit/final_linguistic_audit_<set_id>_<timestamp>_results.jsonl
```

Если audit возвращает `needs_review` или `fail`, delivery считается incomplete/stale: runner не должен закрывать колоду как готовую, пока repairs, QA gates, final export, upload and audit не пройдут заново.

Если audit чистый, runner может пересобрать final workbook и обновить тот же Google Sheet `--file-id` только для актуализации `_qa_status`/delivery manifest с audit evidence. Это не новая генерация контента и не повод создавать дубль файла.

Параллельная работа разрешена по разным колодам: несколько workers могут брать разные `set_id`, если каждый сначала получил свой `deck_generation_runs` lock. Параллелить одну колоду без отдельного language-batch coordinator нельзя. Внутри одной колоды batch остается максимум 3 языка; ускорение достигается несколькими разными колодами и повторным использованием проверенных `meaning_id`, а не расширением одного batch до большого числа языков.

## 180 deck automation

Да, 180 колод можно довести до автоматизированного production-run, но не одним слепым запуском текущего состояния.

Текущий `Deck Master Plan` - это backlog/order. Он не означает, что все 180 колод уже готовы к генерации. `planned`, `candidate`, `blocked` и `spec_ready` не запускаются production automation.

Правильная схема:

```text
Deck Master Plan
  -> spec_ready
  -> approved_for_generation
  -> generate EN/core candidates
  -> generate RU and manual/AI check
  -> generate remaining variants in language batches (max 3; default 1 for number/quantity/high-risk grammar decks)
  -> AI/source-backed QA
  -> final export
  -> Google Sheets upload in target Drive folder
  -> local *_delivery.json manifest with verified Google Sheet id/url
```

Automation runner должен быть fail-closed:

- пропускать `generated`;
- пропускать `planned` / `candidate`;
- блокировать `blocked`;
- не запускать `spec_ready` без явного user approval;
- запускать только `approved_for_generation`;
- пропускать колоду с active `deck_generation_runs.run_status = running`;
- запрещать language batch больше 3 языков, кроме того что меньший хвост разрешен;
- запрещать повторный language batch для языка, который уже complete/final-ready, если не указан repair mode;
- останавливать весь run или deck-run при `needs_review`, missing QA evidence, неполном покрытии или folder placement blocker.

## Current executable state

В проект добавлен preflight/orchestration guard:

```bash
node scripts/run-deck-automation.mjs --dry-run
```

Он читает `Deck Master Plan`, показывает eligible/blocked decks and next actions. Для безопасного резервирования работы есть отдельный режим:

```bash
node scripts/run-deck-automation.mjs --claim-only --execute --max-decks=1 --languages=ES,FR,ZH
```

Этот режим только создает `deck_generation_runs` runtime-lock и не генерирует карточки. Завершение lock:

```bash
node scripts/run-deck-automation.mjs --complete-run=<run_id> --execute
node scripts/run-deck-automation.mjs --fail-run=<run_id> --execute --error-summary="reason"
```

Пока в проекте нет полноценного executable generator для создания новой колоды с нуля, обычный `--execute` без `--claim-only` / `--complete-run` / `--fail-run` обязан падать. Это защищает от ложного ощущения, что 180 колод уже можно произвести без дополнительной реализации.

Следующий обязательный engineering step для настоящего 180-deck automation: добавить генератор deck data, который создает `content_sets`, `meaning_units`, EN entries/examples, Course Metadata, затем запускает уже существующие language-batch, QA and export gates.
