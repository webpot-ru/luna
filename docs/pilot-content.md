# Pilot Content

Этот документ является source of truth по pilot-наборам LunaCards.

Цель pilot-наборов - проверить структуру meaning units, примеры, артикли, Postgres-хранение и дальнейший экспорт, не начиная массовый перевод `5000 x 54` активных языковых вариантов.

Pilot-size не задает правило, что все будущие наборы должны иметь 50 строк. Для production-наборов используется target range из [Content Build Plan](content-build-plan.md).

Перед Gate 3 текущий pilot нужно пересобрать через candidate pool и разделить результат на честный core/extended scope, если текущие 50 items окажутся не лучшим составом. Текущий pilot можно использовать как техническую проверку системы, но не как финальный top-50 набор без отбора.

## Pilot 1

| Поле | Значение |
| --- | --- |
| `set_id` | `home_kitchen_cookware_pilot_01` |
| Название | Home - Kitchen - Cookware, Utensils & Tableware - Pilot 01 |
| Content type | `vocabulary` |
| Domain | Home |
| Area | Kitchen |
| Category | Cookware, Utensils & Tableware |
| Объем | 50 meaning units; это pilot-size для проверки системы, не общий стандарт размера набора |
| Язык pilot content | `EN` / English (US) canonical base |
| Level policy | Official CEFR only; pilot items currently `A1` |
| Content priority | Pilot items have `priority_band`: core/common/useful |
| Seed file | `db/seeds/002_pilot_home_kitchen_cookware_en.sql` |
| Batch | `batch_pilot_home_kitchen_cookware_en_v1` |
| First target seed | `db/seeds/003_pilot_home_kitchen_cookware_ru.sql` |
| First target batch | `batch_pilot_home_kitchen_cookware_ru_v1` |
| EN IPA seed | `db/seeds/004_pilot_home_kitchen_cookware_en_ipa.sql` |
| EN IPA batch | `batch_pilot_home_kitchen_cookware_en_ipa_v1` |
| First multilingual seed | `db/seeds/006_pilot_home_kitchen_cookware_es_fr_zh.sql` |
| First multilingual batch | `batch_pilot_home_kitchen_cookware_es_fr_zh_v1` |
| Second multilingual seed | `db/seeds/007_pilot_home_kitchen_cookware_de_it_pt_ja_ko_vi.sql` |
| Second multilingual batch | `batch_pilot_home_kitchen_cookware_de_it_pt_ja_ko_vi_v1` |
| Third multilingual seed | `db/seeds/008_pilot_home_kitchen_cookware_th_ms_id.sql` |
| Third multilingual batch | `batch_pilot_home_kitchen_cookware_th_ms_id_v1` |
| Fourth multilingual seed | `db/seeds/009_pilot_home_kitchen_cookware_pl_nl_sv.sql` |
| Fourth multilingual batch | `batch_pilot_home_kitchen_cookware_pl_nl_sv_v1` |
| Fifth multilingual seed | `db/seeds/010_pilot_home_kitchen_cookware_nb_da_fi.sql` |
| Fifth multilingual batch | `batch_pilot_home_kitchen_cookware_nb_da_fi_v1` |
| Sixth multilingual seed | `db/seeds/011_pilot_home_kitchen_cookware_cs_sk_hu.sql` |
| Sixth multilingual batch | `batch_pilot_home_kitchen_cookware_cs_sk_hu_v1` |
| Seventh multilingual seed | `db/seeds/012_pilot_home_kitchen_cookware_ro_bg_hr.sql` |
| Seventh multilingual batch | `batch_pilot_home_kitchen_cookware_ro_bg_hr_v1` |
| Eighth multilingual seed | `db/seeds/013_pilot_home_kitchen_cookware_sr_sl_lt.sql` |
| Eighth multilingual batch | `batch_pilot_home_kitchen_cookware_sr_sl_lt_v1` |
| Ninth multilingual seed | `db/seeds/014_pilot_home_kitchen_cookware_lv_et_is.sql` |
| Ninth multilingual batch | `batch_pilot_home_kitchen_cookware_lv_et_is_v1` |
| Tenth multilingual seed | `db/seeds/015_pilot_home_kitchen_cookware_hi_bn_tl.sql` |
| Tenth multilingual batch | `batch_pilot_home_kitchen_cookware_hi_bn_tl_v1` |
| Eleventh multilingual seed | `db/seeds/016_pilot_home_kitchen_cookware_my_km_lo.sql` |
| Eleventh multilingual batch | `batch_pilot_home_kitchen_cookware_my_km_lo_v1` |
| Twelfth multilingual seed | `db/seeds/017_pilot_home_kitchen_cookware_ne_si_ta.sql` |
| Twelfth multilingual batch | `batch_pilot_home_kitchen_cookware_ne_si_ta_v1` |
| Thirteenth multilingual seed | `db/seeds/018_pilot_home_kitchen_cookware_te_kn_ml.sql` |
| Thirteenth multilingual batch | `batch_pilot_home_kitchen_cookware_te_kn_ml_v1` |
| Fourteenth multilingual seed | `db/seeds/019_pilot_home_kitchen_cookware_uz_kk_az.sql` |
| Fourteenth multilingual batch | `batch_pilot_home_kitchen_cookware_uz_kk_az_v1` |
| Fifteenth multilingual seed | `db/seeds/020_pilot_home_kitchen_cookware_ka_hy_tr.sql` |
| Fifteenth multilingual batch | `batch_pilot_home_kitchen_cookware_ka_hy_tr_v1` |
| Sixteenth multilingual seed | `db/seeds/021_pilot_home_kitchen_cookware_sw_ptbr_es419.sql` |
| Sixteenth multilingual batch | `batch_pilot_home_kitchen_cookware_sw_ptbr_es419_v1` |
| Tail multilingual seed | `db/seeds/022_pilot_home_kitchen_cookware_engb.sql` |
| Tail multilingual batch | `batch_pilot_home_kitchen_cookware_engb_v1` |
| Tone transcription repair seed | `db/seeds/031_pilot_home_kitchen_cookware_tone_transcription_repair.sql` |
| Tone transcription repair batch | `batch_pilot_home_kitchen_cookware_tone_transcription_repair_20260428` |
| Final linguistic audit seed | `db/seeds/032_pilot_home_kitchen_cookware_final_linguistic_audit.sql` |
| Final linguistic audit report | `outputs/audit/final_linguistic_audit_home_kitchen_cookware_pilot_01_20260429T111200Z_results.jsonl` |
| Статус | Active set has 50 cards. All 54 active language variants are populated in Postgres. Earlier tone-aware transcription, KA fallback, semantic-scene, target naturalness, SV pot and later current-row repairs remain in history. Current V3-current status after the 2026-05-26 refresh: DB QA passed, `check-qa-evidence` passed, final export passed, the same Google Sheet `1cHEa0ZCejUvLyLkCa_Fqy-3F9K3qspe7Rh3Ti401mos` was updated in the required Drive folder, readback passed, post-final linguistic audit `outputs/audit/final_linguistic_audit_home_kitchen_cookware_pilot_01_20260526T072555Z_results_summary.json` reports 2700/2700 pass, and delivery freshness passes. This is not native-speaker approval. |
| Review export | `outputs/review/Home_Kitchen_Cookware_Pilot_01_review.xlsx` |
| RU review export | `outputs/review/Home_Kitchen_Cookware_Pilot_01_RU_review.xlsx` |
| Working Google Sheets export | `outputs/google-sheets/FlashcardsLuna_home-kitchen-kitchenware-basics_working.xlsx` |
| Final Google Sheets export | `outputs/google-sheets/FlashcardsLuna_home-kitchen-kitchenware-basics_final.xlsx` |
| Working Google Sheet | `FlashcardsLuna - Home Kitchen: Cookware, Utensils & Tableware` / `https://docs.google.com/spreadsheets/d/1B7rlP-uKbrOBkHA3na4EnNuKkFE22QnWG7dD9ZfjD0s` |
| Final Google Sheet | `FlashcardsLuna 001 of 180 - Kitchenware Basics` / `https://docs.google.com/spreadsheets/d/1cHEa0ZCejUvLyLkCa_Fqy-3F9K3qspe7Rh3Ti401mos` |
| Review export script | `scripts/export-pilot-review.mjs` |
| RU review export script | `scripts/export-pilot-ru-review.mjs` |
| Working Google Sheets export script | `scripts/export-flashcards-working-sheet.mjs` |

## Что входит

Pilot 1 содержит 50 предметных `meaning_units`: посуда, приборы, кухонные инструменты и базовая tableware/cookware лексика.

В базе для каждого item есть:

- `meaning_id`;
- `canonical_english`;
- `english_with_article`;
- `part_of_speech = noun`;
- `meaning_note`;
- taxonomy: `Home / Kitchen / Cookware, Utensils & Tableware`;
- `level`;
- `frequency_band`;
- `priority_band`;
- `countability`;
- `plural_form_en`;
- English language entry;
- current checked language layers in Postgres: all 54 active language variants;
- controlled English context example.

Переводы на 54 активных языковых варианта в Gate 2 не создавались. Это сознательное ограничение: сначала нужно проверить английскую canonical-базу. Gate 3 начат с русского как первого целевого языка, чтобы проверить качество процесса на human-checkable языке до массового расширения.

## Проверка

Проверочный скрипт:

```bash
scripts/db-check-pilot.sh
```

QA-скрипт для структурной проверки Gate 2:

```bash
scripts/db-qa-set.sh home_kitchen_cookware_pilot_01
```

Проверка RU-слоя:

```bash
scripts/db-check-pilot-ru.sh
```

`db-qa-set.sh home_kitchen_cookware_pilot_01` не меняет данные. Он должен проходить без failed `ERROR` checks перед final export или новым batch. `db-qa-pilot.sh` остается legacy alias для этой же проверки. `WARNING` checks не блокируют запуск, но требуют ручного внимания.

Текущая проверка:

```text
duplicate_canonical_english_in_set = 0
languages = 54
missing_english_articles = 0
missing_priority_band = 0
missing_semantic_scene = 0
missing_semantic_scene_core_fields = 0
pilot_batch_items = 50
pilot_context_examples = 50
pilot_en_entries = 50
pilot_en_example_translations = 50
pilot_meaning_units = 50
pilot_memberships = 50
```

Текущая RU-проверка:

```text
active_pilot_items = 50
ru_entries = 50
ru_example_translations = 50
ru_batch_entry_items = 50
ru_batch_example_items = 50
ru_missing_display_word = 0
ru_missing_entries = 0
ru_missing_examples = 0
ru_missing_romanization = 0
ru_missing_transcription = 0
ru_unexpected_article_marker = 0
```

## Review export

Создан и пересобран после добавления `priority_band` `.xlsx` для ручной проверки:

```text
outputs/review/Home_Kitchen_Cookware_Pilot_01_review.xlsx
```

Листы:

- `README`;
- `Review`;
- `QA Checklist`.

В `Review` есть 50 строк и поля для ручного решения:

```text
qa_decision
qa_comment
```

Разрешенные решения:

```text
approve
revise
move_category
remove
discuss
```

Файл пересобирается командой:

```bash
node scripts/export-pilot-review.mjs
```

RU review export:

```text
outputs/review/Home_Kitchen_Cookware_Pilot_01_RU_review.xlsx
```

Листы:

- `README`;
- `Review RU`;
- `QA Checklist`.

Файл пересобирается командой:

```bash
node scripts/export-pilot-ru-review.mjs
```

## Working Google Sheets export

Создан wide-format файл для работы и дальнейшей spreadsheet-выдачи:

```text
outputs/google-sheets/FlashcardsLuna_home-kitchen-kitchenware-basics_working.xlsx
```

Google Sheet:

```text
FlashcardsLuna - Home Kitchen: Cookware, Utensils & Tableware
https://docs.google.com/spreadsheets/d/1B7rlP-uKbrOBkHA3na4EnNuKkFE22QnWG7dD9ZfjD0s
```

Главный лист:

```text
Home Kitchen Cookware
```

Колонки идут в формате:

```text
54 translation columns -> 54 example columns -> 54 word transcription columns
```

В каждом блоке повторяется один и тот же порядок языков. Машинный source of truth:

```text
config/language-order.json
```

Текущее наполнение workbook: final workbook был пересобран из Postgres after the clean post-reset runner rebuild and находится в `outputs/google-sheets/FlashcardsLuna_home-kitchen-kitchenware-basics_final.xlsx`. Current final Google Sheet was created as a new file through `scripts/upload-spreadsheet-to-drive-folder.mjs` OAuth flow after the previous Sheet was moved to Google Drive trash: `https://docs.google.com/spreadsheets/d/1cHEa0ZCejUvLyLkCa_Fqy-3F9K3qspe7Rh3Ti401mos`. Целевая папка Drive: `https://drive.google.com/drive/folders/1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei?usp=sharing`. Drive API upload returned `parents = ["1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei"]`; folder placement, readback and delivery freshness passed.

Активный набор содержит 50 карточек. Старые замененные candidate items `home_kitchen_table_knife_utensil_01` and `home_kitchen_baking_tray_cookware_01` остаются в базе только как blocked legacy rows; они не входят в active export/translation scope.

Final workbook was V2-current again as of 2026-04-29, and later became V3-current after the 2026-05-01 strict high-risk/source-backed transcription refresh, IPA source lookup contour, TL source-backed translation repair and all-language native-copy translation gate rollout. Current final export/readback/audit/freshness passed after the non-TL repair/decision evidence import; latest audit summary for this deck is `outputs/audit/final_linguistic_audit_home_kitchen_cookware_pilot_01_non_tl_repair_20260501_results_summary.json` with 2700 pass, 0 needs_review, 0 fail. `working` workbook remains a preview artifact and may be stale relative to the current final output.

Post-final audit artifacts:

```text
outputs/audit/final_linguistic_audit_home_kitchen_cookware_pilot_01_20260429T022115Z_results.jsonl
outputs/audit/final_linguistic_audit_home_kitchen_cookware_pilot_01_20260429T022115Z_results_summary.json
```

Audit wording policy: this deck may be described as `final linguistic audit completed` / `no deterministic audit blockers found`; do not describe it as `100% guaranteed` or `native-approved` for all 54 language variants.

2026-04-27 drift fix: после проверки найдено, что `qa_reviews` уже содержал pass/evidence, но language row statuses в Postgres могли оставаться raw `generated` после restore/seed/import порядка. Для Pilot 1 применен `scripts/sync-qa-statuses-from-evidence.mjs home_kitchen_cookware_pilot_01 --apply`; итоговый dry-run после ремонта показывает `updates=0`, `conflicts=0`. Добавлены reproducible seeds `025` для `base_example_alignment`, `026` for RU manual `placemat` approval and `027` to keep fresh `db-apply.sh` synchronized with QA evidence.

`EN transcription` заполнен IPA для 50 строк и находится в колонке `EN transcription` главного листа. EN entries, examples and IPA transcriptions have AI-assisted `generated_checked` evidence.

В workbook добавлен лист:

```text
Course Metadata
```

Лист содержит строки `Title` и `Description` для колоды `Kitchenware Basics` / `Кухонная посуда` на всех 54 активных языковых вариантах. Все localized `Title` не длиннее 25 символов, все localized `Description` не длиннее 60 символов. Metadata должна быть human-readable и пригодной для списка колод: `Title` быстро называет тему, `Description` дополняет его scope/пользой и не превращается в набор ключевых слов. Для текущей A1/Basics колоды уровень зафиксирован отдельно как `level_label = Basic`; localized descriptions обязаны содержать exact DB-backed `level_signal` and final sentence punctuation where the localized line uses sentence punctuation. Колонки идут в том же фиксированном порядке, что и в главном wide vocabulary-листе, из `config/language-order.json`:

```text
config/language-order.json
```

Course metadata сейчас имеет статус `generated_checked` после structured QA. Текущий русский вариант: `Title = Кухонная посуда`, `Description = Посуда и приборы. Базовый уровень.`, `level_signal = Базовый уровень`.

В workbook добавлен лист:

```text
Deck Metadata
```

Он содержит set-level поля для структуры колоды: `set_id`, `slug`, `content_type`, taxonomy, `roadmap_stage`, `level_min`, `level_max`, target/actual item count, localized title/description shortcuts, `learning_goal`, `next_recommended_set_ids`, statuses, final readiness and sheet contract version.

Для текущего pilot:

```text
slug = home-kitchen-kitchenware-basics
roadmap_stage = Basics
level_label = Basic
level_min = A1
level_max = A1
learning_goal = Learn essential kitchen items for cooking, serving, and eating.
next_recommended_set_ids = home_kitchen_cooking_actions_a1_a2; home_kitchen_storage_cleaning_a2
selection_status = approved
quality_status = generated_checked
sheet_contract_version = v1.1
```

В workbook добавлен лист:

```text
Card Metadata
```

Он содержит row-level поля для 50 карточек: `main_sheet_row`, `display_order`, `card_key`, `set_id`, `meaning_id`, canonical English fields, `part_of_speech`, `level`, `frequency_band`, `priority_band`, taxonomy, countability, tags, notes and row statuses. `card_key = set_id::meaning_id` является стабильным ключом строки в workbook. Для текущего pilot все active items имеют `level = A1`, но уровень передается на уровне строки, чтобы будущие mixed-level колоды не теряли metadata.

В workbook добавляется служебный лист:

```text
_qa_status
```

Он показывает export mode, final readiness и coverage по 54 языкам: missing words, missing examples, missing transcriptions and status summaries.

## QA перед Gate 3

Перед переводом pilot на 54 активных языковых варианта нужно пройти QA-контур из [QA Process](qa-process.md).

Минимально нужно вручную проверить:

- нет ли слишком близких дублей, которые лучше объединить;
- все ли items действительно принадлежат выбранной категории;
- не нужно ли часть items перенести в `Storage & Cleaning` или `Appliances & Furniture`;
- достаточно ли простые English examples;
- корректны ли `a/an/a pair of` для English entries;
- нет ли слов, которые плохо переводятся без дополнительного context note.

Полный Gate 3 на все активные языковые варианты нельзя делать только на основании статуса `generated`: нужен автоматический QA без failed `ERROR` checks and source-backed semantic/form/transcription passes. Raw `generated` не является final-ready. RU first target language допустим как ограниченная проверка процесса на human-checkable языке; статус RU остается `generated`, пока пользователь не проверит строки или пока отдельный QA pass не переведет строки в `generated_checked`.

## Current EN review status

Текущий pilot прошел structural QA, word-selection QA and semantic_scene QA: каждый active set membership имеет `word_selection_quality` evidence, а у каждого context example есть не только непустая сцена, но и core fields для перевода (`target_object`, `target_display`, `subject_number`, `action_or_state`, `state_or_location`, `tense_aspect`, `topic_context`).

Content-selection правки выполнены в seed и применены к базе:

| Item | Риск | Рекомендация |
| --- | --- | --- |
| `table knife` | Слишком узко для core; в learner-наборе обычно первым нужен общий `knife`. | Replaced in active pilot by `knife`. Old `table knife` membership is `blocked` and retained for history. |
| `baking tray` | `EN` зафиксирован как American English; `baking tray` звучит более British/Commonwealth, а `EN-GB` уже отдельный вариант. | Replaced in active pilot by `baking sheet`. Old `baking tray` membership is `blocked` and retained for history. |
| `pan`, `frying pan`, `saucepan` | Близкие cookware meanings; часть языков может слить переводы без четких notes. | Kept as separate active meanings with distinct notes/examples. Watch during translation QA. |
| `saucer`, `placemat`, `butter knife`, `salt shaker`, `pepper shaker` | Полезные, но не все должны быть `core`. | Kept active, but no longer `core` priority. |
| `apron`, `kitchen towel` | Скорее kitchen textile / cleaning-adjacent, чем strict cookware/tableware. | Kept active for pilot as `useful`; consider moving to a future kitchen textile/cleaning set before production scale. |
| `mixing bowl` | Был случайно классифицирован как `useful`, хотя это обычный kitchen item. | Fixed to `common` priority in seed before RU layer. |

Active pilot still has 50 items. Historical blocked rows are not counted by QA/export scripts.

## RU first target language

Русский слой создан как первый целевой язык:

```text
seed: db/seeds/003_pilot_home_kitchen_cookware_ru.sql
batch: batch_pilot_home_kitchen_cookware_ru_v1
language: RU / Russian
entries: 50
example translations: 50
review export: outputs/review/Home_Kitchen_Cookware_Pilot_01_RU_review.xlsx
transcription policy: practical Latin transliteration
status: QA checked; one manually corrected/approved RU item, remaining RU entries/examples and all RU transcriptions are `generated_checked`
```

Правила RU-слоя:

- `native_word` хранится кириллицей;
- `word_with_article_or_marker` совпадает с display form, искусственные артикли не добавляются;
- `article_or_marker` остается пустым;
- `gender` и `grammatical_number` заполнены как learner/QA metadata;
- `transcription` заполнена латиницей для слова, не для примера;
- примеры короткие и сохраняют `semantic_scene`.

Первый маленький многоязычный batch создан и проверен:

```text
seed: db/seeds/006_pilot_home_kitchen_cookware_es_fr_zh.sql
batch: batch_pilot_home_kitchen_cookware_es_fr_zh_v1
languages: ES / Spanish (Spain), FR / French, ZH / Simplified Chinese
entries: 50 per language
example translations: 50 per language
transcriptions: 50 per language
QA result: 450 pass rows, 0 needs_review/fail
status: generated_checked for entries/examples; ES pronunciation not_applicable, FR/ZH pronunciation generated_checked
```

Второй многоязычный batch создан и проверен:

```text
seed: db/seeds/007_pilot_home_kitchen_cookware_de_it_pt_ja_ko_vi.sql
batch: batch_pilot_home_kitchen_cookware_de_it_pt_ja_ko_vi_v1
languages: DE / German, IT / Italian, PT / Portuguese (Portugal), JA / Japanese, KO / Korean, VI / Vietnamese
entries: 50 per language
example translations: 50 per language
transcriptions: 50 per language
QA result: 900 pass rows, 0 needs_review/fail
status: generated_checked for entries/examples; IT/VI pronunciation not_applicable, DE/PT/JA/KO pronunciation generated_checked
notes: JA `tablespoon` fixed to `大さじ`; JA `pan` uses natural `フライパン`, so it can match `frying pan` in this language.
```

Третий многоязычный batch создан и проверен:

```text
seed: db/seeds/008_pilot_home_kitchen_cookware_th_ms_id.sql
batch: batch_pilot_home_kitchen_cookware_th_ms_id_v1
languages: TH / Thai, MS / Malay, ID / Indonesian
entries: 50 per language
example translations: 50 per language
transcriptions: 50 per language
QA result: 450 pass rows, 0 needs_review/fail
status: generated_checked for entries/examples; MS/ID pronunciation not_applicable. TH transcription was repaired by `db/seeds/031_pilot_home_kitchen_cookware_tone_transcription_repair.sql`.
notes: historical batch used RTGS transcription for TH. Current final-ready output uses project Paiboon-style learner romanization with tone diacritics from the 2026-04-28 repair seed.
```

Четвертый многоязычный batch создан и проверен:

```text
seed: db/seeds/009_pilot_home_kitchen_cookware_pl_nl_sv.sql
batch: batch_pilot_home_kitchen_cookware_pl_nl_sv_v1
languages: PL / Polish, NL / Dutch, SV / Swedish
entries: 50 per language
example translations: 50 per language
transcriptions: 50 per language
QA result: 450 pass rows, 0 needs_review/fail
status: generated_checked for entries/examples/pronunciations; PL/NL/SV use IPA transcription.
```

Пятый многоязычный batch создан и проверен:

```text
seed: db/seeds/010_pilot_home_kitchen_cookware_nb_da_fi.sql
batch: batch_pilot_home_kitchen_cookware_nb_da_fi_v1
languages: NO / Norwegian Bokmål (DB: NB), DA / Danish, FI / Finnish
entries: 50 per language
example translations: 50 per language
transcriptions: 50 per language
QA result: 450 pass rows, 0 needs_review/fail
status: generated_checked for entries/examples; FI pronunciation not_applicable, NB/DA pronunciation generated_checked
notes: NO is the spreadsheet code; NB is the database code.
```

Шестой многоязычный batch создан и проверен:

```text
seed: db/seeds/011_pilot_home_kitchen_cookware_cs_sk_hu.sql
batch: batch_pilot_home_kitchen_cookware_cs_sk_hu_v1
languages: CS / Czech, SK / Slovak, HU / Hungarian
entries: 50 per language
example translations: 50 per language
transcriptions: 50 per language
QA result: 450 pass rows, 0 needs_review/fail
status: generated_checked for entries/examples; CS/SK/HU pronunciation not_applicable under native-orthography transcription policy
```

Седьмой многоязычный batch создан и проверен:

```text
seed: db/seeds/012_pilot_home_kitchen_cookware_ro_bg_hr.sql
batch: batch_pilot_home_kitchen_cookware_ro_bg_hr_v1
languages: RO / Romanian, BG / Bulgarian, HR / Croatian
entries: 50 per language
example translations: 50 per language
transcriptions: 50 per language
QA result: 450 pass rows, 0 needs_review/fail
status: generated_checked for entries/examples; RO/HR pronunciation not_applicable under native-orthography transcription policy, BG pronunciation generated_checked under official Bulgarian streamlined transliteration
notes: RO `kettle` uses `ibric` and `teapot` uses `ceainic` to avoid a duplicate display form; HR `kettle` uses `čajnik`, while `teapot` uses `čajnik za čaj`.
```

Восьмой многоязычный batch создан и проверен:

```text
seed: db/seeds/013_pilot_home_kitchen_cookware_sr_sl_lt.sql
batch: batch_pilot_home_kitchen_cookware_sr_sl_lt_v1
languages: SR / Serbian, SL / Slovenian, LT / Lithuanian
entries: 50 per language
example translations: 50 per language
transcriptions: 50 per language
QA result: 450 pass rows, 0 needs_review/fail
status: generated_checked for entries/examples; SR/SL/LT pronunciation not_applicable because transcription repeats display form under current policy
notes: SR uses Serbian Latin Gaj display, not Cyrillic. SL `vilice` is plural-form vocabulary for fork and is accepted as natural language-specific number behavior.
```

Девятый многоязычный batch создан и проверен:

```text
seed: db/seeds/014_pilot_home_kitchen_cookware_lv_et_is.sql
batch: batch_pilot_home_kitchen_cookware_lv_et_is_v1
languages: LV / Latvian, ET / Estonian, IS / Icelandic
entries: 50 per language
example translations: 50 per language
transcriptions: 50 per language
QA result: 450 pass rows, 0 needs_review/fail
status: generated_checked for entries/examples; LV/ET pronunciation not_applicable under native-orthography policy, IS pronunciation generated_checked under broad IPA policy
notes: IS IPA remains generated_checked only and not native-approved; confidence is lower than native-orthography batches.
```

Десятый многоязычный batch создан и проверен:

```text
seed: db/seeds/015_pilot_home_kitchen_cookware_hi_bn_tl.sql
batch: batch_pilot_home_kitchen_cookware_hi_bn_tl_v1
languages: HI / Hindi, BN / Bengali, TL / Filipino
entries: 50 per language
example translations: 50 per language
transcriptions: 50 per language
QA result: 450 pass rows, 0 needs_review/fail
status: generated_checked for entries/examples; HI/BN pronunciation generated_checked under ISO 15919 policy, TL pronunciation not_applicable under native-orthography policy
notes: HI/BN romanization remains generated_checked only and not native-approved. TL uses common Filipino learner display, including accepted loanwords where that is normal usage.
```

Одиннадцатый многоязычный batch создан и проверен:

```text
seed: db/seeds/016_pilot_home_kitchen_cookware_my_km_lo.sql
batch: batch_pilot_home_kitchen_cookware_my_km_lo_v1
languages: MY / Burmese, KM / Khmer, LO / Lao
entries: 50 per language
example translations: 50 per language
transcriptions: 50 per language
QA result: 450 pass rows, 0 needs_review/fail
status: generated_checked for entries/examples. MY/LO transcription was repaired by `db/seeds/031_pilot_home_kitchen_cookware_tone_transcription_repair.sql`; KM remains under the existing practical Khmer romanization policy.
notes: historical MY/LO no-tone/no-register romanization was replaced in the 2026-04-28 repair seed before the current final Google Sheet reupload.
```

Двенадцатый многоязычный batch создан и проверен:

```text
seed: db/seeds/017_pilot_home_kitchen_cookware_ne_si_ta.sql
batch: batch_pilot_home_kitchen_cookware_ne_si_ta_v1
languages: NE / Nepali, SI / Sinhala, TA / Tamil
entries: 50 per language
example translations: 50 per language
transcriptions: 50 per language
QA result: 450 pass rows, 0 needs_review/fail
status: generated_checked for entries/examples/transcriptions under ISO 15919 policy
notes: This batch follows the accelerated mode: Postgres and QA are updated, but workbook/Google Sheets is not rebuilt until final coverage or explicit intermediate export request.
```

Тринадцатый многоязычный batch создан и проверен:

```text
seed: db/seeds/018_pilot_home_kitchen_cookware_te_kn_ml.sql
batch: batch_pilot_home_kitchen_cookware_te_kn_ml_v1
languages: TE / Telugu, KN / Kannada, ML / Malayalam
entries: 50 per language
example translations: 50 per language
transcriptions: 50 per language
QA result: 450 pass rows, 0 needs_review/fail
status: generated_checked for entries/examples/transcriptions under ISO 15919 policy
notes: This batch follows the accelerated mode: Postgres and QA are updated, but workbook/Google Sheets is not rebuilt until final coverage or explicit intermediate export request.
```

Четырнадцатый многоязычный batch создан и проверен:

```text
seed: db/seeds/019_pilot_home_kitchen_cookware_uz_kk_az.sql
batch: batch_pilot_home_kitchen_cookware_uz_kk_az_v1
languages: UZ / Uzbek, KK / Kazakh, AZ / Azerbaijani
entries: 50 per language
example translations: 50 per language
transcriptions: 50 per language
QA result: 450 pass rows, 0 needs_review/fail
status: generated_checked for entries/examples; UZ/AZ pronunciation not_applicable under native-orthography policy, KK transcription generated_checked under practical Cyrillic-to-Latin policy
notes: This batch follows the accelerated mode: Postgres and QA are updated, but workbook/Google Sheets is not rebuilt until final coverage or explicit intermediate export request.
```

Пятнадцатый многоязычный batch создан и проверен:

```text
seed: db/seeds/020_pilot_home_kitchen_cookware_ka_hy_tr.sql
batch: batch_pilot_home_kitchen_cookware_ka_hy_tr_v1
languages: KA / Georgian, HY / Armenian, TR / Turkish
entries: 50 per language
example translations: 50 per language
transcriptions: 50 per language
QA result: 450 pass rows, 0 needs_review/fail
status: generated_checked for entries/examples; KA/HY transcription generated_checked under configured romanization policies, TR pronunciation not_applicable under native-orthography policy. KA `home_kitchen_spatula_tool_01` was repaired on 2026-04-28 from English fallback `spatula` to Georgian romanization `sp'at'ula`.
notes: This batch follows the accelerated mode: Postgres and QA are updated, but workbook/Google Sheets is not rebuilt until final coverage or explicit intermediate export request.
```

Шестнадцатый многоязычный batch создан и проверен:

```text
seed: db/seeds/021_pilot_home_kitchen_cookware_sw_ptbr_es419.sql
batch: batch_pilot_home_kitchen_cookware_sw_ptbr_es419_v1
languages: SW / Swahili, PT-BR / Brazilian Portuguese, ES-419 / Latin American Spanish
entries: 50 per language
example translations: 50 per language
transcriptions: 50 per language
QA result: 450 pass rows, 0 needs_review/fail
status: generated_checked for entries/examples; SW pronunciation not_applicable under native-orthography policy, PT-BR transcription generated_checked under IPA policy. ES-419 transcription was repaired by `db/seeds/031_pilot_home_kitchen_cookware_tone_transcription_repair.sql`.
notes: ES-419 final transcription now repeats the displayed word with article/marker, matching the native-orthography policy.
```

Хвостовой batch создан и проверен:

```text
seed: db/seeds/022_pilot_home_kitchen_cookware_engb.sql
batch: batch_pilot_home_kitchen_cookware_engb_v1
languages: EN-GB / British English
entries: 50
example translations: 50
transcriptions: 50
QA result: 150 pass rows, 0 needs_review/fail
status: generated_checked for entries/examples/transcriptions under British English IPA policy
notes: This is a tail batch because fewer than 3 languages remained after the default 3-language batches.
```

## Следующий шаг

Следующий шаг - использовать `scripts/upload-spreadsheet-to-drive-folder.mjs` для следующих финальных workbook после полного покрытия 54 языковых вариантов и QA. Текущий final workbook уже загружен в целевую Drive-папку.

V3 QA note: the 2026-04-29 gap is historical. The pilot deck is V3-current after the 2026-05-01 strict high-risk/source-backed transcription refresh, IPA source lookup contour, TL source-backed translation repair and all-language native-copy translation gate rollout. `oven mitt beside oven` remains a documented warning only, not a blocker.
