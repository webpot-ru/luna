# Data Delivery Pipeline

Этот документ является source of truth по рабочему хранению, генерации и выдаче карточек в Google Sheets/spreadsheet-ready формате.

## Принцип

Внутренний рабочий формат может быть любым, если он помогает качественно генерировать, проверять и дедуплицировать данные:

- structured JSON;
- CSV;
- Postgres as preferred working database when Docker is available;
- SQLite as lightweight fallback;
- локальные скрипты;
- временные рабочие таблицы;
- Docker-based workflow, если это понадобится.

Но финальный deliverable для пользователя должен быть в формате Google Sheets или совместимой spreadsheet-структуры, которую можно импортировать в Google Sheets.

Scope boundary: этот проект отвечает только за карточки, QA, рабочую базу и spreadsheet-deliverable. Всё после передачи файла пользователю не проектируется и не документируется здесь.

## Working preview vs final export

Есть два разных типа spreadsheet export, и их нельзя смешивать:

| Тип | Назначение | Разрешены пустые языки | Готовность файла |
| --- | --- | --- | --- |
| `working` / preview export | Проверка структуры, частично заполненных языковых batch, ручной review, демонстрация формата. | Да, если это явно видно в `_README` и `_qa_status`. | Не готов для загрузки как финальный файл. |
| `final` / final-ready export | Сборка финального workbook-кандидата перед Google Sheets delivery audit. | Нет. Все 54 языковых варианта должны иметь слово, пример и transcription. | Финальный workbook-кандидат после QA gates; production delivery считается complete/current final только после upload/folder verification и обязательного post-final linguistic audit. |

Любой export, где заполнены не все 54 языковых варианта, должен быть явно помечен как `working preview only` / `not final-ready`.

Final export должен работать fail-closed: если хотя бы по одному языку есть пустые words/examples/transcriptions или non-final status, скрипт обязан завершиться ошибкой и не создавать final-ready workbook-кандидат.

Final export also runs deterministic example-shape, surface grammar and target naturalness gates before a workbook can be treated as final-ready. This includes CJK/Thai/Southeast Asian spacing, Burmese action-surface rules, `example_surface_grammar`, which blocks unresolved template artifacts such as `A(z)` plus confirmed ET/FI locative/postposition calques and HR/SR case/agreement traps, and `example_naturalness`, which blocks confirmed target-language native-style failures such as RU static beverage locative calques, KK beverage additive calques, UZ beverage misspellings/collapsed senses and fixed beverage blend name drift such as literal translations or generic shortening of `English Breakfast tea`. These gates also run before import through source preflight/import guards, so future generated batches should fail before Postgres if the same error class reappears.

## Optional Gemini QA Artifact

Gemini Tools may be used as an optional second AI-review surface before final delivery, but it is not part of the final spreadsheet format and not a replacement for the runner. The supported project path is:

```bash
node scripts/run-ai-qa.mjs <set_id> --gemini-pack --checks=<families> --languages=<codes>
```

The command writes a minimized prompt pack to `outputs/qa/` for use with `mcp__gemini_tools__.gemini_extract_json`. During ordinary deck production, the QA stage can make this explicit and manifest-recorded with `node scripts/run-deck-production.mjs <set_id> --stage=qa --gemini-qa-pack --execute`. A live Gemini answer is useful only after it is converted to the normal `import-ai-qa-results.mjs` JSONL shape, imported as structured QA evidence, and then rechecked by the same final gates. Gemini review can add `generated_checked` evidence or create `needs_review`/repair candidates; it cannot make non-RU rows `approved`, cannot replace source-backed transcriptions/translations, and cannot make a stale workbook current without export/upload/readback/audit/freshness.

Course Metadata has a smaller native-style lane for the exact class of errors where a short UI label matches config but sounds wrong or has the wrong singular/plural/category form. Use `node scripts/export-course-metadata-native-style-review.mjs <set_id> --languages=all` or `--current-final` to write a Gemini/native-style review pack for `Title`, `Description`, `Module`, `Category` and `level_signal`; validate returned JSONL with `node scripts/check-course-metadata-native-style-results.mjs <results.jsonl>`. The runner emits this pack automatically when QA is run with `--gemini-qa-pack`. The pack does not mutate card data and is not a replacement for `check-course-metadata-localization`; it is the second-review layer for label naturalness.

Course Metadata repairs must still follow the normal delivery boundary. A DB/config repair is not visible to users until the affected final workbook is re-exported, the same existing Google Sheet is updated, readback passes and `check-delivery-freshness` passes. If a Course Metadata repair refreshes `metadata_review` evidence for many current decks, all affected delivery manifests become stale even when card words/examples did not change; do not call those Sheets current until the same-file refresh loop has completed. Do not bypass final export with direct Sheet edits unless the user explicitly approves a metadata-only emergency path and the readback/freshness evidence is recorded.

## Финальный формат выдачи

Пользовательский результат:

- Google Sheets workbook;
- один Google Sheets workbook на одну колоду / один учебный набор;
- внутри workbook: основной пользовательский лист с карточками, `Course Metadata`, `Deck Metadata`, `Card Metadata`, `_README`, `_qa_status`, `_languages` и при необходимости другие служебные листы;
- основной лист должен быть готов к ручной проверке и последующей загрузке пользователем;
- название Google Sheets документа должно отражать категорию/колоду, а не общий проектный pilot;
- названия листов должны быть стабильными и понятными;
- финальные листы для пользователя должны быть в широком grouped-column формате.

Примеры названий основных листов внутри отдельных workbook:

```text
Home - Kitchen - Cookware
Home - Bathroom - Hygiene
Core - Numbers
Core - Colors
Travel - Hotel Check-in Words
Food - Restaurant Words
Health - Pharmacy Words
```

## Рабочая база

Рабочая база должна хранить не только финальные строки для листов, но и нормализованные сущности:

```text
meaning_id
content_type
domain
area
category
canonical_english
canonical_meaning
semantic_scene
part_of_speech
priority_band
set_memberships[]
language_entries[]
quality_status
```

Это нужно, чтобы:

- не создавать дубли переводов;
- переиспользовать один смысл в разных наборах;
- сохранять context examples для разных тем;
- сохранять `semantic_scene`, чтобы примеры на 54 активных языковых вариантах не расходились по смыслу;
- быстро собирать новые Google Sheets листы.

Postgres schema v0 для этой рабочей базы описана в [Database Schema](database-schema.md) и подготовлена в:

```text
db/migrations/001_initial_schema.sql
db/migrations/002_official_cefr_levels.sql
db/migrations/003_content_priority_band.sql
db/migrations/004_single_display_transcription.sql
db/migrations/005_content_set_deck_metadata.sql
db/migrations/006_content_set_level_label.sql
db/migrations/007_content_set_localizations.sql
db/migrations/008_generated_checked_and_level_signal.sql
db/migrations/009_structured_qa_evidence.sql
db/migrations/010_language_spreadsheet_code.sql
db/migrations/011_vocabulary_only_contract.sql
db/migrations/012_deck_generation_runs.sql
db/migrations/013_checked_value_hash.sql
db/migrations/014_example_quality_hash.sql
db/migrations/015_word_selection_quality_hash.sql
db/migrations/016_tone_aware_transcription_policy.sql
db/migrations/017_target_example_naturalness_hash.sql
db/migrations/018_regional_variant_quality_hash.sql
db/migrations/019_v2_quality_hashes.sql
db/migrations/020_v3_quality_hashes.sql
db/migrations/021_transcription_source_backing_hash.sql
db/migrations/022_number_example_grammar_hash.sql
db/migrations/023_course_metadata_module_category.sql
db/migrations/024_course_metadata_module_category_hash_reapply.sql
db/migrations/025_hsk_classic_source_items.sql
db/migrations/026_hsk_classic_translation_items.sql
db/migrations/027_oxford_vocabulary_isolation.sql
db/seeds/001_languages.sql
db/seeds/002_pilot_home_kitchen_cookware_en.sql
db/seeds/003_pilot_home_kitchen_cookware_ru.sql
db/seeds/004_pilot_home_kitchen_cookware_en_ipa.sql
db/seeds/005_pilot_home_kitchen_cookware_course_metadata.sql
db/seeds/006_pilot_home_kitchen_cookware_es_fr_zh.sql
db/seeds/007_pilot_home_kitchen_cookware_de_it_pt_ja_ko_vi.sql
db/seeds/008_pilot_home_kitchen_cookware_th_ms_id.sql
db/seeds/009_pilot_home_kitchen_cookware_pl_nl_sv.sql
db/seeds/010_pilot_home_kitchen_cookware_nb_da_fi.sql
db/seeds/011_pilot_home_kitchen_cookware_cs_sk_hu.sql
db/seeds/012_pilot_home_kitchen_cookware_ro_bg_hr.sql
db/seeds/013_pilot_home_kitchen_cookware_sr_sl_lt.sql
db/seeds/014_pilot_home_kitchen_cookware_lv_et_is.sql
db/seeds/015_pilot_home_kitchen_cookware_hi_bn_tl.sql
db/seeds/016_pilot_home_kitchen_cookware_my_km_lo.sql
db/seeds/017_pilot_home_kitchen_cookware_ne_si_ta.sql
db/seeds/018_pilot_home_kitchen_cookware_te_kn_ml.sql
db/seeds/019_pilot_home_kitchen_cookware_uz_kk_az.sql
db/seeds/020_pilot_home_kitchen_cookware_ka_hy_tr.sql
db/seeds/021_pilot_home_kitchen_cookware_sw_ptbr_es419.sql
db/seeds/022_pilot_home_kitchen_cookware_engb.sql
db/seeds/023_pilot_home_kitchen_cookware_final_readiness_status.sql
db/seeds/024_pilot_home_kitchen_cookware_course_metadata_punctuation.sql
db/seeds/025_pilot_home_kitchen_cookware_base_example_alignment.sql
db/seeds/026_pilot_home_kitchen_cookware_ru_manual_placemat.sql
db/seeds/027_pilot_home_kitchen_cookware_sync_qa_statuses.sql
db/seeds/028_pilot_home_kitchen_cookware_checked_value_hash.sql
db/seeds/029_pilot_home_kitchen_cookware_example_quality.sql
db/seeds/030_pilot_home_kitchen_cookware_word_selection_quality.sql
db/seeds/031_pilot_home_kitchen_cookware_tone_transcription_repair.sql
db/seeds/032_pilot_home_kitchen_cookware_final_linguistic_audit.sql
docker-compose.yml
scripts/db-apply.sh
scripts/db-dump.sh
scripts/db-restore.sh
scripts/oxford/import-oxford-a1-to-db.mjs
scripts/db-check-pilot.sh
scripts/db-qa-set.sh
scripts/db-qa-pilot.sh
scripts/check-deck-specs.mjs
scripts/check-deck-ready.mjs
scripts/compile-deck-candidate-pool.mjs
scripts/check-deck-candidate-pool.mjs
scripts/check-qa-evidence.mjs
scripts/check-transcription-policy-shape.mjs
scripts/check-transcription-style-consistency.mjs
scripts/check-transcription-fallbacks.mjs
scripts/check-transcription-intra-language-collapse.mjs
scripts/check-transcription-cross-language-fallbacks.mjs
scripts/check-entry-cross-language-fallbacks.mjs
scripts/check-entry-source-backed-translations.mjs
scripts/check-translation-source-policy.mjs
scripts/check-translation-source-coverage.mjs
scripts/check-deck-profile-quality.mjs
scripts/check-script-language-identity.mjs
scripts/check-sibling-language-copy.mjs
scripts/check-meaning-contrast.mjs
scripts/check-semantic-granularity.mjs
scripts/check-semantic-scene-alignment.mjs
scripts/check-target-semantic-scene-alignment.mjs
scripts/check-example-naturalness.mjs
scripts/check-base-example-naturalness.mjs
scripts/check-example-template-diversity.mjs
scripts/check-target-example-lexical-anchor.mjs
scripts/check-article-gender-marker-consistency.mjs
scripts/check-qa-hash-coverage.mjs
scripts/check-delivery-freshness.mjs
scripts/sync-qa-statuses-from-evidence.mjs
scripts/run-ai-qa.mjs
scripts/import-ai-qa-results.mjs
scripts/import-example-translations.mjs
scripts/import-transcription-repair.mjs
scripts/import-entry-repair.mjs
scripts/import-entry-metadata-repair.mjs
scripts/import-base-example-repair.mjs
scripts/generate-meaning-reuse-plan.mjs
scripts/import-deck-base-data.mjs
scripts/import-language-batch.mjs
scripts/export-semantic-qa-batch.mjs
scripts/import-semantic-qa-results.mjs
scripts/export-review-decisions-template.mjs
scripts/import-review-decisions.mjs
scripts/export-pilot-review.mjs
scripts/export-final-linguistic-audit-batch.mjs
scripts/run-final-linguistic-audit.mjs
scripts/import-final-linguistic-audit-results.mjs
scripts/export-flashcards-working-sheet.mjs
config/spreadsheet-contract-v1.json
config/translation-source-policy.json
```

Cloud-ready перенос и правила automation-run описаны отдельно в [Cloud Automation](cloud-automation.md). Этот проект можно запускать в облаке только после git/database/env setup; локальный Docker/Postgres не переносится автоматически.

Текущий review-файл для pilot-набора:

```text
outputs/review/Home_Kitchen_Cookware_Pilot_01_review.xlsx
```

Это review deliverable, а не финальный spreadsheet-deliverable.

QA-gates и критерии перехода от review-файлов к переводу/экспорту описаны в [QA Process](qa-process.md).

Excel/Google Sheets не является рабочим source of truth. Пользователь может проверять export визуально, но решения из review-файла становятся частью базы только через явный import-review workflow: `export-review-decisions-template.mjs` -> ручная RU-проверка -> `import-review-decisions.mjs`.

## Google Sheets workbook на колоду

Каждая колода карточек передается отдельным Google Sheets документом. Внутри такого документа основной пользовательский лист представляет один текущий production-набор:

- thematic vocabulary deck;
- core foundation vocabulary block.

Current exports are vocabulary-only. Do not create Google Sheets workbooks for ready-phrase, multi-turn, functional-language, or mixed decks. Situational content must be converted into vocabulary-only decks or left out.

Один workbook не должен превращаться в общий склад всех будущих наборов. Если появляется новая колода, для нее создается отдельный Google Sheets документ с тем же внутренним контрактом листов.

Если один `meaning_id` входит в несколько наборов, он может появляться на нескольких листах. Это нормально для пользователя. Внутри рабочей базы при этом должен оставаться один canonical meaning.

## HSK exam vocabulary release workbooks

HSK vocabulary releases are a separate workbook contour from normal thematic LunaCards deck exports.

Source of truth:

```text
docs/hsk-classic-release-plan.md
config/hsk-classic-release-contract-v1.json
```

This contour exists because HSK release files are Chinese-source exam vocabulary lists, not ordinary English-canonical thematic decks. For HSK releases:

- one workbook = one HSK release, for example `hsk2_classic_level_1_150_v1.xlsx`;
- rows = Chinese HSK vocabulary items;
- fixed Chinese columns include `simplified`, `traditional`, `pinyin`, `example_zh`, `example_pinyin`;
- 54 active LunaCards languages are columns, in `config/language-order.json` order;
- target-language transcription/IPA/romanization columns are not part of the HSK contract;
- audio is not part of the HSK contract;
- pinyin is required only for Chinese word/example, because learners are studying Chinese.

The normal final export rule requiring words/examples/transcriptions for every active language applies to ordinary LunaCards deck exports under `config/spreadsheet-contract-v1.json`. It does not apply to HSK release workbooks, which use `config/hsk-classic-release-contract-v1.json`.

Course/exam releases and future non-English-source courses must also follow [Course Source-Assisted Generation](course-source-assisted-generation.md). The ordinary deck runner remains the controller for thematic decks; a course-specific release must have an equivalent contract/audit path that records source rows, source-language truth, pivot candidates, source-audit reports, workbook hashes, Google Sheet readback and freshness. Do not use the ordinary English-canonical source preflight as-is for HSK or another source-language course.

## Oxford DB Isolation

Oxford vocabulary releases have a dedicated Docker/Postgres isolation layer, separate from ordinary deck-card storage.

Source of truth:

```text
docs/oxford-vocabulary-release-plan.md
config/oxford-vocabulary-release-contract-v0.json
db/migrations/027_oxford_vocabulary_isolation.sql
```

Dedicated tables:

```text
oxford_vocabulary_source_items
oxford_vocabulary_edition_items
oxford_vocabulary_support_items
oxford_vocabulary_db_import_runs
```

These tables do not create ordinary `content_sets`, `meaning_units`, `meaning_set_memberships`, `meaning_examples`, `meaning_language_entries`, `exports` or `export_items` rows. The only shared reference table is `languages`, used to validate `db_code` for support-language rows.

Current Oxford A1 DB import command:

```bash
node scripts/oxford/import-oxford-a1-to-db.mjs
```

The importer applies only migration `027`, upserts by stable Oxford keys, records deterministic content hashes and writes an isolation/readback report. The current report is:

```text
outputs/oxford-vocabulary/qa/oxford_3000_core_a1_part_001_150_v1_db_isolation_import_20260517.json
```

Current stored counts for `oxford_3000_core_a1_part_001_150_v1`:

```text
source rows: 150
edition rows: 300
support rows: 7800
ordinary table leak count: 0
readback mismatches: 0
foreign-key blockers: 0
```

This DB isolation import is not ordinary deck-card delivery. For `oxford_3000_core_a1_part_001_150_v1`, final US/UK Google Sheets delivery is separately approved by the Oxford contract and readback manifests, while ordinary deck-table import remains false.

## Oxford final Google Sheets delivery

Oxford English-learning releases have a course-specific final delivery/readback path. They are not ordinary thematic LunaCards deck exports even when their final workbooks use the same wide spreadsheet shell.

Current final Oxford A1 delivery:

- release id: `oxford_3000_core_a1_part_001_150_v1`;
- US English Google Sheet: `https://docs.google.com/spreadsheets/d/1krmAB56Bg7xLVHhOVj7tyJU-nzTzF2lZl-NOXnc2D_Y/edit?usp=drivesdk`;
- British English Google Sheet: `https://docs.google.com/spreadsheets/d/18TYpNhaxHqMwvpuTNIIAyvNkRPq19mkK4FNtouBpAZU/edit?usp=drivesdk`;
- final local manifest: `outputs/oxford-vocabulary/final/oxford_3000_core_a1_part_001_150_v1_edition_exports_final_v1.json`;
- delivery manifests: `outputs/oxford-vocabulary/final/FlashcardsLuna_Oxford_3000_Core_A1_Part_001_US_English_delivery.json` and `outputs/oxford-vocabulary/final/FlashcardsLuna_Oxford_3000_Core_A1_Part_001_British_English_delivery.json`;
- translation sample review: `outputs/oxford-vocabulary/qa/oxford_3000_core_a1_part_001_150_v1_support_translation_sample_review_v1.json`;
- all-fields sample review: `outputs/oxford-vocabulary/qa/oxford_3000_core_a1_part_001_150_v1_all_fields_sample_review_v1.md`;
- source-backed support translation audit: `outputs/oxford-vocabulary/qa/oxford_3000_core_a1_part_001_150_v1_support_translation_source_backed_audit_v1.json`;
- support example quality audit: `outputs/oxford-vocabulary/qa/oxford_3000_core_a1_part_001_150_v1_support_example_quality_audit_v1.json`;
- readback checker: `scripts/oxford/check-oxford-edition-google-sheet-readback.mjs`;
- final gate checker: `scripts/oxford/check-oxford-english-learning-gates.py`.

The Oxford readback checker exports each Google Sheet back to XLSX through Drive API and compares the local workbook values against the exported workbook across the main sheet and service sheets. Current readback status is `verified` for both sheets, with 22524 checked cells per workbook. The actual buyer-facing main sheet has 108 columns: 53 word columns, 53 example columns and 2 primary-English IPA columns. The readback range intentionally still covers the old 112-column area as a stale-column guard, so opposite-English leftovers would fail readback instead of silently remaining in Google Sheets. `Course Metadata`, `_qa_status` and `_languages` use the same 53 buyer-facing language variants as the main sheet; `Card Metadata` has 28 structural columns.

For this English-learning final, support-language word transcriptions are explicitly out of scope by `config/oxford-vocabulary-release-contract-v0.json`, and empty support-language transcription columns must not be generated. EN and EN-GB word pronunciation/transcription evidence and EN/EN-GB example transcription evidence are required in the source/QA artifacts, but each buyer-facing workbook shows only its primary English edition in the main sheet. US ends with `EN transcription` and `EN example transcription`; British ends with `EN-GB transcription` and `EN-GB example transcription`. This course-specific exception does not weaken the ordinary final export rule for ordinary LunaCards polyglot decks.

Oxford article/display rule: English source headwords stay Oxford-style lemmas without artificial `a/an/the`; support-language display translations may include natural articles, gender markers or classifier-like markers where the learner's native language normally uses them for nouns. This rule applies to future Oxford 3000/5000 parts in the same bundle unless the Oxford source-of-truth contract is changed. Current Oxford A1 delivery has `support_article_display_repair_v1` applied: 948 display cells changed across ES, FR, DE, IT, PT, NL, SV, NO, DA, RO, ES-419 and PT-BR; examples and support-language transcriptions were not changed.

Oxford translation sample review: `support_translation_sample_review_v1` checked 10 fixed A1 words for each of 54 unique language variants, for 540 unique display translations, and compared 1060 sampled display cells in the two final US/UK workbooks against the contract-backed source artifacts. Result: 0 blockers, 0 warnings. This is a documented semantic spot-check and final-workbook parity check, not native-speaker certification.

Oxford all-fields sample review: `all_fields_sample_review_v1` is now a formal Oxford gate. It checked 10 fixed A1 words for each of 54 unique language variants, for 540 language-row records and 12820 source-package fields. Result: 0 blockers and 528 non-blocking warning signals. This is a source-package field-shape/consistency gate, not native-speaker certification and not Google Sheet readback.

Oxford source-backed support translation audit: `support_translation_source_backed_audit_v1` checked all 7800 support-language display cells across 52 support languages against local indexed dictionary/concept candidates. Result: 4320 rows with source candidates, 3790 exact/normalized current matches, 530 source-candidate rows without a current exact match, 3480 rows with no local source candidate, 5746 warning signals and 0 blockers. This is a deterministic source-evidence gate for the Oxford support layer; local sources remain candidate evidence only and do not replace native-speaker review.

Oxford support example quality audit: `support_example_quality_audit_v1` checked all 7800 support-language example cells across 52 support languages. Result after repair: 0 blockers and 4665 warning signals. The repair changed 5 real support examples before final re-upload: 4 RU locative calques (`above`, `across`, `below`, `between`) and 1 TH spacing/example issue (`bye`). The warning signals are deterministic review cues such as lexical-anchor, weak-language and known validator false-positive categories; they are not native-speaker certification.

Current Oxford A1 Part 002 state:

- release id: `oxford_3000_core_a1_part_002_300_v1`;
- source-draft workbook: `outputs/oxford-vocabulary/final/FlashcardsLuna_Oxford_3000_Core_A1_Part_002_source_draft.xlsx`;
- final US English workbook: `outputs/oxford-vocabulary/final/FlashcardsLuna_Oxford_3000_Core_A1_Part_002_US_English.xlsx`;
- final British English workbook: `outputs/oxford-vocabulary/final/FlashcardsLuna_Oxford_3000_Core_A1_Part_002_British_English.xlsx`;
- final edition workbook manifest: `outputs/oxford-vocabulary/final/oxford_3000_core_a1_part_002_300_v1_edition_exports_final_v1.json`;
- final US English Google Sheet: `https://docs.google.com/spreadsheets/d/1i5k0H0SsK_fINLcdMWjijdzRWLA97Y0jY4jzJaztAAY/edit?usp=drivesdk`;
- final British English Google Sheet: `https://docs.google.com/spreadsheets/d/1gkV1Qoe6QdDfcNk41JoBG_Yl0SEVJqv_9NRjL9m_CV0/edit?usp=drivesdk`;
- contract: `config/oxford_3000_core_a1_part_002_300_v1_contract_v0.json`;
- gate report: `outputs/oxford-vocabulary/qa/oxford_3000_core_a1_part_002_300_v1_oxford_english_learning_gates_v1.md`;
- translation/example sample review: `outputs/oxford-vocabulary/qa/oxford_3000_core_a1_part_002_300_v1_support_translation_sample_review_v1.md`;
- all-fields sample review: `outputs/oxford-vocabulary/qa/oxford_3000_core_a1_part_002_300_v1_all_fields_sample_review_v1.md`;
- all-fields sample review Drive upload manifest: `outputs/oxford-vocabulary/qa/oxford_3000_core_a1_part_002_300_v1_all_fields_sample_review_v1_drive_upload.json`;
- row review: `outputs/oxford-vocabulary/row-reviews/oxford_3000_core_a1_part_002_300_v1_row_review_v1.jsonl`, 300 rows reviewed, including 50 broader level-span rows;
- English examples: `outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_002_300_v1_english_examples_v1.jsonl`, 300 LunaCards-authored rows, max 7 words;
- US/UK edition layer: `outputs/oxford-vocabulary/edition-layers/oxford_3000_core_a1_part_002_300_v1_us_uk_edition_layer_v1.jsonl`, 300 rows with 7 explicit US/UK spelling or lexical overrides;
- EN-US pronunciation: `outputs/oxford-vocabulary/pronunciations/oxford_3000_core_a1_part_002_300_v1_en_us_edition_pronunciations_v1.jsonl`, 300 CMUdict-backed rows;
- EN-GB pronunciation: `outputs/oxford-vocabulary/pronunciations/oxford_3000_core_a1_part_002_300_v1_en_gb_edition_pronunciations_v1.jsonl`, 300 Britfone-backed rows with one component-backed `grandparent` fallback from exact `GRAND` + `PARENT` components;
- RU support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_ru_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- ES support translation/article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_es_article_display_v2.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- FR support translation/article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_fr_article_display_v2.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- DE support translation/article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_de_article_display_v2.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- IT support translation/article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_it_article_display_v2.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- PT support translation/article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_pt_article_display_v2.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- ZH support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_zh_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- JA support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_ja_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- KO support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_ko_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- VI support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_vi_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- TH support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_th_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- MS support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_ms_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- ID support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_id_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- PL support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_pl_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- NL support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_nl_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- SV support translation/article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_sv_article_display_v2.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- NO support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_no_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- DA support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_da_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- FI support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_fi_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- CS support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_cs_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- SK support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_sk_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- HU support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_hu_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- RO support translation/article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_ro_article_display_v2.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- BG support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_bg_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- HR support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_hr_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- SR support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_sr_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- SL support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_sl_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- LT support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_lt_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- LV support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_lv_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- ET support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_et_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- IS support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_is_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- HI support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_hi_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- BN support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_bn_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- TL support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_tl_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- MY support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_my_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- KM support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_km_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- LO support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_lo_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- NE support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_ne_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- SI support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_si_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- TA support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_ta_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- TE support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_te_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- KN support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_kn_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- ML support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_ml_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- UZ support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_uz_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- KK support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_kk_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- AZ support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_az_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- KA support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_ka_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- HY support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_hy_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- TR support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_tr_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- SW support translation batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_sw_v1.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- PT-BR support translation/article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_pt_br_article_display_v2.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- ES-419 support translation/article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_002_300_v1_support_translation_batch_es_419_article_display_v2.jsonl`, 300 display cells and 300 example cells, no target-language transcription fields;
- status: final Google Sheets delivery is complete for the two English editions. Source package, row review, English examples and EN-US/EN-GB pronunciation are complete; support-language batching covers all 52 support languages through RU, ES, FR, DE, IT, PT, ZH, JA, KO, VI, TH, MS, ID, PL, NL, SV, NO, DA, FI, CS, SK, HU, RO, BG, HR, SR, SL, LT, LV, ET, IS, HI, BN, TL, MY, KM, LO, NE, SI, TA, TE, KN, ML, UZ, KK, AZ, KA, HY, TR, SW, PT-BR and ES-419; current support coverage is 15600/15600 display cells and 15600/15600 example cells; article-display repair changed 13 cells across 9 article-language batches; support QA is complete with weak-language review, 10-word-per-language translation/example sample review, all-fields sample review, source-backed display audit and support example quality audit all at 0 blockers; latest translation/example sample review checked 54 language variants x 10 sampled words, 540 display cells, 540 example cells, 1060 final-workbook display cells and 1060 final-workbook example cells with 0 blockers/0 warnings; all-fields sample review checked 540 language-row records and 12820 source-package fields; raw all-fields review artifacts were uploaded to the target Drive folder as `.md`, `.csv` and `.json` files; final US/UK workbooks were uploaded as native Google Sheets and readback verified with 43524 checked cells per edition; gate state is 29 passed gates, 0 warning gates and 0 blocked gates;
- no ordinary deck-table import is allowed, and no isolated Oxford DB import has been run for Part 002.

Current Oxford A1 Part 003 state:

- release id: `oxford_3000_core_a1_part_003_300_v1`;
- source-draft workbook: `outputs/oxford-vocabulary/final/FlashcardsLuna_Oxford_3000_Core_A1_Part_003_source_draft.xlsx`;
- final US English workbook: `outputs/oxford-vocabulary/final/FlashcardsLuna_Oxford_3000_Core_A1_Part_003_US_English.xlsx`;
- final British English workbook: `outputs/oxford-vocabulary/final/FlashcardsLuna_Oxford_3000_Core_A1_Part_003_British_English.xlsx`;
- final edition workbook manifest: `outputs/oxford-vocabulary/final/oxford_3000_core_a1_part_003_300_v1_edition_exports_final_v1.json`;
- final US English Google Sheet: `https://docs.google.com/spreadsheets/d/1WrmQST-fRxqBHndO6xtrdDMcfSRUGWA0l8-e_bnqkE0/edit?usp=drivesdk`;
- final British English Google Sheet: `https://docs.google.com/spreadsheets/d/1op77eIfGro53H-gCcOJkyZeDk_f9SFgvtiQToTqeEnY/edit?usp=drivesdk`;
- contract: `config/oxford_3000_core_a1_part_003_300_v1_contract_v0.json`;
- source snapshot manifest: `outputs/oxford-vocabulary/source/oxford_3000_core_a1_part_003_300_v1_source_snapshot_manifest.json`;
- candidate pool: `outputs/oxford-vocabulary/candidate-pools/oxford_3000_core_a1_part_003_300_v1_candidate_pool.jsonl`;
- row review: `outputs/oxford-vocabulary/row-reviews/oxford_3000_core_a1_part_003_300_v1_row_review_v1.jsonl`, 300 rows reviewed, including 48 broader level-span rows;
- English examples: `outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl`, 300 LunaCards-authored rows, max 6 words;
- US/UK edition layer: `outputs/oxford-vocabulary/edition-layers/oxford_3000_core_a1_part_003_300_v1_us_uk_edition_layer_v1.jsonl`, 300 rows, 5 US overrides and 6 British overrides;
- EN-US pronunciation: `outputs/oxford-vocabulary/pronunciations/oxford_3000_core_a1_part_003_300_v1_en_us_edition_pronunciations_v1.jsonl`, 300 CMUdict-backed rows;
- EN-GB pronunciation: `outputs/oxford-vocabulary/pronunciations/oxford_3000_core_a1_part_003_300_v1_en_gb_edition_pronunciations_v1.jsonl`, 300 Britfone-backed rows;
- RU support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_ru_v1.jsonl`, 300 display cells and 300 example cells;
- ES support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_es_article_display_v1.jsonl`, 300 display cells and 300 example cells;
- FR support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_fr_article_display_v1.jsonl`, 300 display cells and 300 example cells;
- DE support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_de_article_display_v1.jsonl`, 300 display cells and 300 example cells;
- IT support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_it_article_display_v1.jsonl`, 300 display cells and 300 example cells;
- PT support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_pt_article_display_v1.jsonl`, 300 display cells and 300 example cells;
- ZH support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_zh_v1.jsonl`, 300 display cells and 300 example cells;
- JA support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_ja_v1.jsonl`, 300 display cells and 300 example cells;
- KO support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_ko_v1.jsonl`, 300 display cells and 300 example cells;
- VI support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_vi_v1.jsonl`, 300 display cells and 300 example cells;
- TH support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_th_v1.jsonl`, 300 display cells and 300 example cells;
- MS support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_ms_v1.jsonl`, 300 display cells and 300 example cells;
- ID support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_id_v1.jsonl`, 300 display cells and 300 example cells;
- PL support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_pl_v1.jsonl`, 300 display cells and 300 example cells;
- NL support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_nl_v1.jsonl`, 300 display cells and 300 example cells;
- SV support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_sv_article_display_v1.jsonl`, 300 display cells and 300 example cells;
- NO support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_no_article_display_v1.jsonl`, 300 display cells and 300 example cells;
- DA support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_da_article_display_v1.jsonl`, 300 display cells and 300 example cells;
- FI support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_fi_v1.jsonl`, 300 display cells and 300 example cells;
- CS support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_cs_v1.jsonl`, 300 display cells and 300 example cells;
- SK support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_sk_v1.jsonl`, 300 display cells and 300 example cells;
- HU support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_hu_v1.jsonl`, 300 display cells and 300 example cells;
- RO support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_ro_article_display_v1.jsonl`, 300 display cells and 300 example cells;
- BG support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_bg_v1.jsonl`, 300 display cells and 300 example cells;
- HR support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_hr_v1.jsonl`, 300 display cells and 300 example cells;
- SR support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_sr_v1.jsonl`, 300 display cells and 300 example cells;
- SL support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_sl_v1.jsonl`, 300 display cells and 300 example cells;
- LT support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_lt_v1.jsonl`, 300 display cells and 300 example cells;
- LV support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_lv_v1.jsonl`, 300 display cells and 300 example cells;
- ET support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_et_v1.jsonl`, 300 display cells and 300 example cells;
- IS support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_is_v1.jsonl`, 300 display cells and 300 example cells;
- HI support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_hi_v1.jsonl`, 300 display cells and 300 example cells;
- BN support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_bn_v1.jsonl`, 300 display cells and 300 example cells;
- TL support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_tl_v1.jsonl`, 300 display cells and 300 example cells;
- MY support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_my_v1.jsonl`, 300 display cells and 300 example cells;
- KM support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_km_v1.jsonl`, 300 display cells and 300 example cells;
- LO support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_lo_v1.jsonl`, 300 display cells and 300 example cells;
- NE support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_ne_v1.jsonl`, 300 display cells and 300 example cells;
- SI support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_si_v1.jsonl`, 300 display cells and 300 example cells;
- TA support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_ta_v1.jsonl`, 300 display cells and 300 example cells;
- TE support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_te_v1.jsonl`, 300 display cells and 300 example cells;
- KN support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_kn_v1.jsonl`, 300 display cells and 300 example cells;
- ML support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_ml_v1.jsonl`, 300 display cells and 300 example cells;
- UZ support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_uz_v1.jsonl`, 300 display cells and 300 example cells;
- KK support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_kk_v1.jsonl`, 300 display cells and 300 example cells;
- AZ support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_az_v1.jsonl`, 300 display cells and 300 example cells;
- KA support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_ka_v1.jsonl`, 300 display cells and 300 example cells;
- HY support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_hy_v1.jsonl`, 300 display cells and 300 example cells;
- TR support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_tr_v1.jsonl`, 300 display cells and 300 example cells;
- SW support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_sw_v1.jsonl`, 300 display cells and 300 example cells;
- PT-BR support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_pt_br_article_display_v1.jsonl`, 300 display cells and 300 example cells;
- ES-419 support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_es_419_article_display_v1.jsonl`, 300 display cells and 300 example cells;
- weak-language targeted review: `outputs/oxford-vocabulary/qa/oxford_3000_core_a1_part_003_300_v1_weak_language_targeted_review_v1.md`, 15600 display cells and 15600 example cells checked, 0 blockers and 135 warnings;
- translation/example sample review: `outputs/oxford-vocabulary/qa/oxford_3000_core_a1_part_003_300_v1_support_translation_sample_review_v1.md`, 54 language variants x 10 sampled words, 540 display cells, 540 example cells, 1060 final-workbook display cells and 1060 final-workbook example cells checked, 0 blockers and 0 warnings;
- all-fields sample review: `outputs/oxford-vocabulary/qa/oxford_3000_core_a1_part_003_300_v1_all_fields_sample_review_v1.md`, 54 language variants x 10 sampled words, 540 language-row records and 12820 source-package fields checked, 0 blockers and 724 non-blocking warning signals;
- source-backed display audit: `outputs/oxford-vocabulary/qa/oxford_3000_core_a1_part_003_300_v1_support_translation_source_backed_audit_v1.json`, 15600 display cells checked, 0 blockers and 12669 warning signals;
- support example quality audit: `outputs/oxford-vocabulary/qa/oxford_3000_core_a1_part_003_300_v1_support_example_quality_audit_v1.json`, 15600 example cells checked, 0 blockers and 9049 warning signals;
- support article display repair/check: `outputs/oxford-vocabulary/qa/oxford_3000_core_a1_part_003_300_v1_support_article_display_repair_v1.md`, 12 article-language batches and 3600 display cells checked, 0 blockers and 0 forced changes because article display was already built into the Part 003 article-language batches;
- gate report: `outputs/oxford-vocabulary/qa/oxford_3000_core_a1_part_003_300_v1_oxford_english_learning_gates_v1.md`;
- status: final Google Sheets delivery is complete for the two English editions. The real Oxford 3000 A1 source-list slice is offset 450, limit 300, source range `machine` through `table`. Current support coverage is 15600/15600 display cells and 15600/15600 example cells across all 52 support languages through RU, ES, FR, DE, IT, PT, ZH, JA, KO, VI, TH, MS, ID, PL, NL, SV, NO, DA, FI, CS, SK, HU, RO, BG, HR, SR, SL, LT, LV, ET, IS, HI, BN, TL, MY, KM, LO, NE, SI, TA, TE, KN, ML, UZ, KK, AZ, KA, HY, TR, SW, PT-BR and ES-419. Source-package QA and final delivery QA are complete with weak-language review, translation/example sample review, all-fields sample review, source-backed display audit, support example quality audit and article-display repair/check all at 0 blockers. Final US/UK workbooks were uploaded as native Google Sheets and readback verified with 43524 checked cells per edition. Gate state is 29 passed gates, 0 warning gates and 0 blocked gates. No ordinary deck-table Postgres import or isolated Oxford DB import has been run for Part 003.

Current Oxford A1 Part 004 state:

- release id: `oxford_3000_core_a1_part_004_147_v1`;
- contract: `config/oxford_3000_core_a1_part_004_147_v1_contract_v0.json`;
- source snapshot manifest: `outputs/oxford-vocabulary/source/oxford_3000_core_a1_part_004_147_v1_source_snapshot_manifest.json`;
- candidate pool: `outputs/oxford-vocabulary/candidate-pools/oxford_3000_core_a1_part_004_147_v1_candidate_pool.jsonl`;
- source-draft workbook: `outputs/oxford-vocabulary/final/FlashcardsLuna_Oxford_3000_Core_A1_Part_004_source_draft.xlsx`;
- row review: `outputs/oxford-vocabulary/row-reviews/oxford_3000_core_a1_part_004_147_v1_row_review_v1.jsonl`, 147 rows reviewed, including 24 broader level-span rows;
- English examples: `outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_004_147_v1_english_examples_v1.jsonl`, 147 LunaCards-authored rows, max 6 words;
- US/UK edition layer: `outputs/oxford-vocabulary/edition-layers/oxford_3000_core_a1_part_004_147_v1_us_uk_edition_layer_v1.jsonl`, 147 rows, 2 US overrides and 2 British-retained overrides;
- EN-US pronunciation: `outputs/oxford-vocabulary/pronunciations/oxford_3000_core_a1_part_004_147_v1_en_us_edition_pronunciations_v1.jsonl`, 147 CMUdict-backed rows;
- EN-GB pronunciation: `outputs/oxford-vocabulary/pronunciations/oxford_3000_core_a1_part_004_147_v1_en_gb_edition_pronunciations_v1.jsonl`, 147 Britfone-backed rows;
- RU support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_ru_v1.jsonl`, 147 display cells and 147 example cells;
- ES support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_es_article_display_v1.jsonl`, 147 display cells and 147 example cells;
- FR support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_fr_article_display_v1.jsonl`, 147 display cells and 147 example cells;
- DE support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_de_article_display_v1.jsonl`, 147 display cells and 147 example cells;
- IT support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_it_article_display_v1.jsonl`, 147 display cells and 147 example cells;
- PT support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_pt_article_display_v1.jsonl`, 147 display cells and 147 example cells;
- ZH support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_zh_v1.jsonl`, 147 display cells and 147 example cells;
- JA support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_ja_v1.jsonl`, 147 display cells and 147 example cells;
- KO support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_ko_v1.jsonl`, 147 display cells and 147 example cells;
- VI support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_vi_v1.jsonl`, 147 display cells and 147 example cells;
- TH support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_th_v1.jsonl`, 147 display cells and 147 example cells;
- MS support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_ms_v1.jsonl`, 147 display cells and 147 example cells;
- ID support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_id_v1.jsonl`, 147 display cells and 147 example cells;
- PL support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_pl_v1.jsonl`, 147 display cells and 147 example cells;
- NL support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_nl_v1.jsonl`, 147 display cells and 147 example cells;
- SV support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_sv_article_display_v1.jsonl`, 147 display cells and 147 example cells;
- NO support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_no_article_display_v1.jsonl`, 147 display cells and 147 example cells;
- DA support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_da_article_display_v1.jsonl`, 147 display cells and 147 example cells;
- FI support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_fi_v1.jsonl`, 147 display cells and 147 example cells;
- CS support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_cs_v1.jsonl`, 147 display cells and 147 example cells;
- SK support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_sk_v1.jsonl`, 147 display cells and 147 example cells;
- HU support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_hu_v1.jsonl`, 147 display cells and 147 example cells;
- RO support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_ro_article_display_v1.jsonl`, 147 display cells and 147 example cells;
- BG support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_bg_v1.jsonl`, 147 display cells and 147 example cells;
- HR support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_hr_v1.jsonl`, 147 display cells and 147 example cells;
- SR support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_sr_v1.jsonl`, 147 display cells and 147 example cells;
- SL support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_sl_v1.jsonl`, 147 display cells and 147 example cells;
- LT support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_lt_v1.jsonl`, 147 display cells and 147 example cells;
- LV support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_lv_v1.jsonl`, 147 display cells and 147 example cells;
- ET support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_et_v1.jsonl`, 147 display cells and 147 example cells;
- IS support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_is_v1.jsonl`, 147 display cells and 147 example cells;
- HI support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_hi_v1.jsonl`, 147 display cells and 147 example cells;
- BN support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_bn_v1.jsonl`, 147 display cells and 147 example cells;
- TL support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_tl_v1.jsonl`, 147 display cells and 147 example cells;
- MY support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_my_v1.jsonl`, 147 display cells and 147 example cells;
- KM support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_km_v1.jsonl`, 147 display cells and 147 example cells;
- LO support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_lo_v1.jsonl`, 147 display cells and 147 example cells;
- NE support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_ne_v1.jsonl`, 147 display cells and 147 example cells;
- SI support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_si_v1.jsonl`, 147 display cells and 147 example cells;
- TA support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_ta_v1.jsonl`, 147 display cells and 147 example cells;
- TE support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_te_v1.jsonl`, 147 display cells and 147 example cells;
- KN support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_kn_v1.jsonl`, 147 display cells and 147 example cells;
- ML support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_ml_v1.jsonl`, 147 display cells and 147 example cells;
- UZ support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_uz_v1.jsonl`, 147 display cells and 147 example cells;
- KK support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_kk_v1.jsonl`, 147 display cells and 147 example cells;
- AZ support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_az_v1.jsonl`, 147 display cells and 147 example cells;
- KA support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_ka_v1.jsonl`, 147 display cells and 147 example cells;
- HY support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_hy_v1.jsonl`, 147 display cells and 147 example cells;
- TR support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_tr_v1.jsonl`, 147 display cells and 147 example cells;
- SW support-language batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_sw_v1.jsonl`, 147 display cells and 147 example cells;
- PT-BR support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_pt_br_article_display_v1.jsonl`, 147 display cells and 147 example cells;
- ES-419 support-language article-display batch: `outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_004_147_v1_support_translation_batch_es_419_article_display_v1.jsonl`, 147 display cells and 147 example cells;
- final US English workbook: `outputs/oxford-vocabulary/final/FlashcardsLuna_Oxford_3000_Core_A1_Part_004_US_English.xlsx`;
- final British English workbook: `outputs/oxford-vocabulary/final/FlashcardsLuna_Oxford_3000_Core_A1_Part_004_British_English.xlsx`;
- final US English Google Sheet: `https://docs.google.com/spreadsheets/d/14XF1U00sMLIVxUZZ55291CiQjWCMLFIWg4TbgUPcqtI/edit?usp=drivesdk`;
- final British English Google Sheet: `https://docs.google.com/spreadsheets/d/1yitsjJHc9ilcaOR3curPNuN9_xfAyOs8eaFohrRY_zs/edit?usp=drivesdk`;
- status: final Google Sheets delivery is complete for the two English editions. The remaining Oxford 3000 A1 source-list slice is offset 750, limit 147, source range `take` through `yourself`. Current support coverage is 7644/7644 display cells and 7644/7644 example cells across all 52 support languages through RU, ES, FR, DE, IT, PT, ZH, JA, KO, VI, TH, MS, ID, PL, NL, SV, NO, DA, FI, CS, SK, HU, RO, BG, HR, SR, SL, LT, LV, ET, IS, HI, BN, TL, MY, KM, LO, NE, SI, TA, TE, KN, ML, UZ, KK, AZ, KA, HY, TR, SW, PT-BR and ES-419. Source-package QA and final delivery QA are complete with weak-language review, translation/example sample review, all-fields sample review, source-backed display audit, support example quality audit and article-display repair/check all at 0 blockers. Final US/UK workbooks were uploaded as native Google Sheets and readback verified with 43524 checked cells per edition. Gate state is 29 passed gates, 0 warning gates and 0 blocked gates. No ordinary deck-table Postgres import or isolated Oxford DB import has been run for Part 004.

Обязательные листы workbook:

| Лист | Назначение |
| --- | --- |
| Main vocabulary sheet | Пользовательские карточки: переводы, примеры, транскрипции. |
| `Course Metadata` | Localized `Title` and `Description` для колоды. |
| `Deck Metadata` | Метаданные колоды: level, taxonomy, goal, status and next deck ids. |
| `Card Metadata` | Метаданные каждой строки: `card_key`, `set_id`, `meaning_id`, level, POS, priority, taxonomy and status. |
| `_README` | Статус workbook и spreadsheet contract. |
| `_qa_status` | Coverage/final-readiness по языкам. |
| `_languages` | Фиксированный порядок 54 языков и transcription policy. |

Spreadsheet contract v1:

- обязательные листы: main vocabulary sheet, `Course Metadata`, `Deck Metadata`, `Card Metadata`, `_README`, `_qa_status`, `_languages`;
- machine-readable spreadsheet contract lives in `config/spreadsheet-contract-v1.json`; prose in this document must match that file;
- stable row key in the workbook: `card_key = set_id + "::" + meaning_id`;
- `meaning_id` остается semantic key внутри рабочей базы, но в spreadsheet строку идентифицирует `card_key`, потому что один смысл может входить в несколько колод;
- spreadsheet language code is `spreadsheet_code`; database language code is `db_code`;
- Norwegian is `NO` in Google Sheets and `NB` in the database;
- final export must have zero empty words, examples and transcriptions for all 54 language variants;
- final export must have only final-ready statuses: content statuses `approved` or `generated_checked`; pronunciation statuses `approved`, `generated_checked` or `not_applicable`;
- final export must also validate deck-level, Course Metadata, meaning-level, context-example and set-membership statuses, not only per-language entry/example/pronunciation statuses;
- final export must run all-language entry source-backed translation, translation source coverage and deck-profile quality blockers; obvious English-looking fallback, source conflict, stale source decision, profile/POS mismatch, scope drift or weak profile-specific example anchor cannot reach a final workbook;
- weak-source language rows (`KO`, `VI`, `TH`, `MS`, `SK`, `SL`, `LV`, `ET`, `IS`, `BN`, `TL`, `MY`, `KM`, `LO`, `NE`, `SI`, `TA`, `TE`, `KN`, `ML`, `UZ`, `KK`, `AZ`, `KA`, `HY`) must have passed the one-language pre-import source preflight path; unresolved `low_resource_mt_dictionary_disagreement` warnings cannot be treated as delivery-ready evidence;
- final export manifest records a `translation_source_coverage` summary so delivery freshness can be tied back to the source-coverage contour;
- every `generated_checked` status in final export must have usable structured `qa_reviews` evidence with exact target identity, reviewer, reviewed_at, non-empty `check_family`, non-empty `result_summary`, and at least one of `pass_id` / `batch_id`;
- for text-bearing QA targets, evidence must also carry `checked_value_hash`; final export recomputes the current hash and blocks stale evidence after entry/example/transcription/Course Metadata edits;
- generated_checked set memberships require word-selection evidence keyed as `target_type=content_set`, `target_key=set_id::meaning_id`, `language_code=EN`, with `pass_id=word_selection_quality_...`;
- evidence/status drift is a blocker in both directions: target status without evidence blocks final export, and latest pass evidence not reflected in target status also blocks final export until `scripts/sync-qa-statuses-from-evidence.mjs` repairs it;
- if a latest required check is non-pass, older pass evidence no longer counts; a later `manual_review=approved` for the same target/language can override older AI `needs_review`;
- generated_checked context examples require base-example alignment evidence keyed as `target_type=meaning_example`, `target_key=example_id`, `language_code=EN`, with `pass_id=base_example_alignment_...`;
- generated_checked context examples also require example-quality evidence keyed as `target_type=meaning_example`, `target_key=example_id`, `language_code=EN`, with `pass_id=example_quality_...`;
- `example_quality` proves the English context example is natural, concrete, non-template and suitable as a multilingual card anchor; semantic preservation alone does not prove this;
- generated_checked example translations require semantic preservation evidence keyed as `target_type=meaning_example_translation`, `target_key=set_id::meaning_id::example_id`, `language_code=<DB code>`, with `pass_id=semantic_preservation_...`;
- generated_checked example translations also require target-example naturalness evidence keyed to the same target/language with `pass_id=target_example_naturalness_...`;
- generated_checked example translations also require target-example lexical-anchor evidence keyed to the same target/language with `pass_id=target_example_lexical_anchor_...`;
- generated_checked example translations also require target-example pedagogical-quality evidence keyed to the same target/language with `pass_id=target_example_pedagogical_quality_...`;
- dry-run or synthetic QA rows are not usable final evidence; a pass decision marked `dry-run`, `dry_run` or `synthetic` must not satisfy final export/readiness;
- final-ready regional-risk example translations for `EN-GB`, `ES-419` and `PT-BR` also require fresh `regional_variant_quality` evidence keyed to the same target/language when the canonical term is in the configured regional-risk list;
- generated_checked language entries require entry-form evidence keyed as `target_type=meaning_language_entry`, `target_key=meaning_id`, `language_code=<DB code>`, with `check_family=entry_form`;
- generated_checked language entries also require V2 auxiliary evidence keyed to the same target/language for `entry_form_register`, `semantic_granularity` and `article_gender_marker_consistency`;
- generated_checked pronunciation/transcription statuses require transcription-policy evidence keyed as `target_type=meaning_language_entry`, `target_key=meaning_id`, `language_code=<DB code>`, with `check_family=transcription_policy`;
- generated_checked IPA pronunciation/transcription statuses also require pronunciation-accuracy evidence keyed to the same target/language with `pass_id=pronunciation_accuracy_...`;
- entry-form evidence is not enough if current entry/display rows show systemic fallback: deterministic checks block high-risk non-English rows copied from canonical English and mass identical Latin entry/display surfaces across high-risk languages;
- entry-form evidence is not enough if current entry/display rows show script/language identity errors, broad/narrow semantic collapse, or article/gender/marker inconsistency;
- final export also blocks distinct meanings in the same deck/language when both the learner display and example collapse to identical text; display-only collisions among nearby meanings are review warnings;
- final export also blocks bad English context anchors before translation QA can preserve them: repeated `I need to...` templates, generic placeholders and confirmed tautological locatives such as `The shower head is in the shower.`;
- final export also blocks systemic example-template repetition, target examples that do not anchor the target lexical item, and hard pedagogical-anchor failures such as self-container examples (`The shower head is in the shower.`, `The kitchen shelf is in the kitchen.`);
- final export also verifies `qa_checked_value_hash(...)` coverage for required text-bearing check families so a new evidence family cannot be added without stale-evidence protection;
- transcription-policy evidence is not enough if the current `transcription` shape/content violates policy: deterministic checks block IPA without `/.../`, slash-wrapped display orthography or article words inside IPA, native-orthography mismatches, native-script copies in romanization, punctuation-normalized fallback to `canonical_english`, partial English-tail leaks in native-script romanization rows, one-language transcription collapse, mass cross-language pseudo-English fallback collapse in high-risk romanization languages, `EN`/`EN-GB` verb display without `to + base verb`, `ZH` pinyin without tone marks, old no-tone `TH`/`LO` forms and `MY` without practical tone/register notation; `scripts/check-transcription-fallbacks.mjs` is the compact smoke check for canonical-English fallback leaks, `scripts/check-transcription-intra-language-collapse.mjs` is the compact smoke check for per-language collapse, `scripts/check-transcription-cross-language-fallbacks.mjs` is the compact smoke check for cross-language collapse, and `scripts/check-ipa-transcription-sanity.mjs` is the compact smoke check for obvious pseudo-IPA;
- semantic-preservation evidence is not enough if current example/display casing violates policy: deterministic checks block lowercase-start examples in sentence-case languages and artificial initial-uppercase/title-case display words, while ignoring scripts/languages without sentence capitalization such as `KA` Georgian;
- semantic-preservation evidence is not enough if current `ZH`/`JA` examples contain artificial internal CJK token spaces: `scripts/check-cjk-example-spacing.mjs` blocks Chinese character spaces and Japanese kanji/kana token spaces such as `准备 蔬菜。` or `野菜を 準備する。`;
- semantic-preservation evidence is not enough if current `TH` examples contain generated word-segmentation spaces inside one Thai clause: `scripts/check-thai-example-spacing.mjs` blocks rows such as `เตรียม ผัก.`;
- semantic-preservation evidence is not enough if current `KM`/`LO` action examples contain generated word-segmentation spaces inside one short action clause: `scripts/check-southeast-asian-example-spacing.mjs` blocks rows such as `រៀបចំ បន្លែ។` or `ກຽມ ຜັກ.`;
- semantic-preservation evidence is not enough if current `MY` action examples for simple imperative scenes use a purpose/infinitive `ရန်` template instead of a natural action clause: `scripts/check-action-example-surface.mjs` blocks those rows;
- semantic-preservation evidence is not enough if the English context example and `semantic_scene` drift apart: `scripts/check-semantic-scene-alignment.mjs` blocks generic placeholders like `is shown` / `in a ... object scene` and mismatched location/state/action before final export;
- semantic-preservation evidence is not enough if a supported translated example drifts from the current scene marker: `scripts/check-target-semantic-scene-alignment.mjs` derives scene keys from `semantic_scene.state_or_location` and blocks target examples that no longer contain the configured marker for that language; initial scene keys are `on_the_counter`, `in_the_drawer` and `beside_the_bowl`;
- semantic-preservation evidence is not enough if the target example is an unnatural literal calque of `semantic_scene` helper wording or if a fixed beverage blend name was semantically translated/shortened instead of preserved as a named blend: `target_example_naturalness` evidence is required, and `scripts/check-example-naturalness.mjs` deterministically blocks confirmed language-specific naturalness/form errors, including RU state/adjective calques and static beverage locative calques, CS/SK locative case copies, HU literal `van` order, RO bare forms after locative prepositions, PT/PT-BR invalid `estáo/estao`, KK beverage additive calques, UZ beverage misspellings/collapsed senses and literal or generic-shortened `English Breakfast tea` drift;
- entry-form evidence is not enough if translation source coverage reports a blocker: `scripts/check-translation-source-coverage.mjs` blocks stale entry-source decisions, source conflicts and English-looking fallback while keeping uneven v1 dictionary coverage visible in reports;
- raw `generated` is allowed in working preview only and must block final export;
- `needs_review`, `blocked`, `draft` and `missing` must not silently enter final exports;
- working preview can contain blanks or review statuses, but must be labeled `not final-ready`.
- after final export and Google Sheet update, `scripts/check-google-sheet-readback.mjs <set_id>` and `scripts/check-delivery-freshness.mjs <set_id>` must pass before a delivery is called current; DB repairs, QA imports or audit imports make an older upload/readback stale until the same Google Sheet file id is refreshed.

## Финальный шаблон листа

Для vocabulary sheet порядок колонок должен быть таким:

1. Сначала блок переводов слов на активные языковые варианты.
2. Потом блок примеров использования на активные языковые варианты.
3. Потом блок единой транскрипции слов на активные языковые варианты.

Транскрипция создается только для слов, не для примеров.

В финальном пользовательском листе есть только один transcription-блок. Внутри него для каждого языка заполняется ровно одно значение по [Language Transcription Policy](language-transcription-policy.md). Пустых transcription-ячеек быть не должно.

Если policy языка = `native orthography`, то `transcription` повторяет отображаемое слово. Это сделано специально, чтобы spreadsheet имел один стабильный контракт колонок.

Перед final export выполняется deterministic transcription shape gate. Старое QA evidence не спасает строку, если текущая форма нарушает policy: IPA должна быть в `/.../`, romanization для нелатинского display должна быть латиницей/диакритической латиницей and must not be a punctuation/article-normalized fallback to `canonical_english`, `EN` / `EN-GB` verb display должен быть `to + base verb`, `ZH` pinyin должен иметь tone marks, `TH` / `LO` используют learner romanization with tone diacritics instead of old RTGS/BGN no-tone forms, and `MY` uses practical romanization with tone/register notation instead of Burmese script or a bare copy. All deterministic callers must pass `canonical_english`; otherwise fallback comparison is incomplete.

Перед final export также выполняется deterministic cross-language transcription fallback gate. Он блокирует массовую ошибку, когда несколько high-risk romanization languages получают одну и ту же pseudo-English transcription: 60%+ identical rows in a 3-language batch, or 5+ of `BN`/`HI`/`NE`/`SI`/`TA`/`TE`/`KN`/`ML` sharing normalized transcription on at least 10 cards or 40% of a deck. Isolated loanword-like overlaps remain warnings and do not block final export.

Перед final export также выполняется deterministic example/display casing gate. `example_text` должен использовать норму целевого языка: sentence-case languages start examples with a capital first cased letter, while no-sentence-capitalization scripts/languages are ignored. `display_word` remains dictionary/base form and must not be artificial Title Case or initial-uppercase unless language rules, proper nouns, acronyms or standard learner display require it.

Перед final export также выполняется deterministic CJK example spacing gate. `ZH` examples must not contain spaces between Chinese characters, and `JA` examples must not contain artificial spaces between kanji/kana tokens, particles and verbs. This is a shape/naturalness guard, not a semantic rewrite: examples may use natural Chinese/Japanese syntax, but generated tokenization artifacts such as `准备 蔬菜。` and `野菜を 準備する。` block final export.

Перед final export также выполняется deterministic Thai example spacing gate. `TH` examples for short card clauses must not contain machine word-segmentation spaces between Thai script tokens. Natural Thai may use spaces between larger phrase/sentence units, but LunaCards examples should stay simple enough that generated fragments such as `เตรียม ผัก.` are repaired before import/export.

Перед final export также выполняется deterministic KM/LO Southeast Asian example spacing gate. `KM` and `LO` action examples for short card clauses must not contain machine word-segmentation spaces between script tokens inside one action clause. Generated fragments such as `រៀបចំ បន្លែ។` and `ກຽມ ຜັກ.` block final export.

Перед final export также выполняется deterministic MY action example surface gate. For simple imperative/action scenes, Burmese examples must use a natural action clause and must not replace the scene with a purpose/infinitive `ရန်` template.

Пример порядка колонок:

```text
EN
ES
FR
DE
IT
PT
RU
...
SW
PT-BR
ES-419
EN-GB
EN example
ES example
FR example
DE example
IT example
PT example
RU example
...
SW example
PT-BR example
ES-419 example
EN-GB example
EN transcription
ES transcription
FR transcription
DE transcription
IT transcription
PT transcription
RU transcription
...
SW transcription
PT-BR transcription
ES-419 transcription
EN-GB transcription
```

## Рабочий порядок 54 языков в wide sheet

Для пользовательского vocabulary-листа используется один фиксированный порядок языков. Этот порядок повторяется без изменений в трех блоках: translations, examples, transcriptions.

Машинный source of truth для порядка 54 языковых вариантов:

```text
config/language-order.json
```

Export scripts must import this file through `scripts/lib/language-order.mjs`; `scripts/check-language-order.mjs` is the read-only guard against script/doc drift and verifies that the transcription policy matrix has the same 54 language names, spreadsheet codes, DB codes, transcription formats, order and count.

Не редактировать порядок вручную в документах или скриптах. Для проверки и вывода текущего canonical order использовать:

```bash
node scripts/check-language-order.mjs
```

`NO` в пользовательском листе соответствует внутреннему коду базы `NB`.

## Лист Course Metadata

Для каждой колоды / учебного набора в пользовательском Google Sheets workbook должен быть отдельный лист:

```text
Course Metadata
```

Этот лист хранит пользовательские название и описание конкретной колоды на всех 54 активных языковых вариантах. Он не описывает язык обучения в целом и не заменяет тематический vocabulary-лист, а дополняет workbook метаданными колоды.

Формат листа фиксированный:

```text
        EN      ES      FR      ...     PT-BR   ES-419  EN-GB
Title   Kitchenware ...
Description ...
Module  Home ...
Category Kitchen ...
```

Правила:

- первая строка содержит language codes в том же порядке, что и vocabulary-листы;
- первый столбец содержит названия строк `Title`, `Description`, `Module` и `Category`;
- `Title` - короткое пользовательское название колоды;
- `Description` - короткое описание содержимого колоды с локализованным level-сигналом;
- `Module` - короткий локализованный mobile-app label широкого раздела колоды; по смыслу это localized `content_sets.domain` / deck-level `context_domain`, например `Home` / `Дом`;
- `Category` - короткий локализованный mobile-app label зоны/темы внутри module; обычно это localized `content_sets.area` / deck-level `context_area`, например `Kitchen` / `Кухня`; если конкретная колода намеренно уже parent-area, используется deck-specific override из `config/course-metadata-taxonomy-labels.json`;
- `Title` должен быть не длиннее 25 символов в каждом языке;
- `Description` должен быть не длиннее 60 символов в каждом языке;
- `Module` и `Category` должны быть не длиннее 25 символов в каждом языке;
- `Description` обязано содержать человеко-понятный локализованный level-сигнал колоды; точное значение хранится в DB-поле `content_set_localizations.level_signal`;
- `Title` и `Description` считаются sentence-like пользовательскими строками и должны завершаться настроенным sentence terminator для языка: `.`, `。`, `।`, `။`, `។`, `։` и т.п.;
- `Description` должно вводить exact `level_signal` как отдельное короткое предложение, а не приклеивать уровень к тематической фразе, например `Cooking verbs. Elementary level.` / `Глаголы для готовки. Начальный уровень.`;
- export validates fail-closed: `level_signal` must be non-empty, `Description` must contain exact `level_signal`, `Title` must end with sentence punctuation and `Description` must separate the level sentence;
- `level_signal` служебный DB/validation field and is not added as a visible row to the user-facing `Course Metadata` sheet;
- структурный уровень также хранится отдельно в `Deck Metadata.level_label`;
- длинное техническое значение `content_sets.category`, например `Cookware, Utensils & Tableware`, не должно подставляться в user-facing `Course Metadata.Category`; если этот смысл нужен, он остается в `Description`, `Deck Metadata` or `Card Metadata`;
- нельзя специально растягивать `Title` до 25 символов: он должен быть коротким, естественным и UI-readable;
- порядок языков не должен отличаться от основного wide sheet order;
- значения остаются `generated`, пока не прошли отдельную проверку.

Source of truth для этого листа - таблица `content_set_localizations`, а не hardcoded object в export script. Для каждого нового `content_set` нужно создать `Title`, `Description`, `Module`, `Category` and DB-backed `level_signal` на все 54 активных языковых варианта до сборки workbook.

`Module` / `Category` заполняются и проверяются через общий default-контур:

- localized taxonomy labels live in `config/course-metadata-taxonomy-labels.json`;
- `scripts/ensure-course-metadata-module-category.mjs <set_id>` fills/repairs `content_set_localizations.module` and `content_set_localizations.category` from `content_sets.domain` / `content_sets.area`, unless the set has an explicit `setCategoryOverrides` category in the same config;
- `scripts/check-course-metadata-localization.mjs <set_id>` validates the stored `Module` / `Category` against the same taxonomy-label config, including deck-specific category overrides, so stale labels cannot pass merely because they are non-empty and short;
- `scripts/run-deck-production.mjs --stage=qa --execute` runs that script before `db-qa-set`, so new ordinary deck runs cannot silently skip `Module` / `Category`;
- if a future deck uses a domain/area that has no localized labels yet, the runner fails closed until the label config is extended. It must not fall back to English for all languages.

`scripts/export-flashcards-working-sheet.mjs` должен быть `set_id`-driven:

- `set_id` передается аргументом скрипта или используется pilot default;
- `Course Metadata` читается из `content_set_localizations`;
- основной sheet name строится из taxonomy текущего `content_set`;
- output filename строится из `slug` / `set_id` и `export_mode`;
- количество строк проверяется по `target_item_count_min` / `target_item_count_max`, а не по жесткому числу 50.

### Правило качества Title/Description

`Title` и `Description` должны быть не просто короткими, а полезными для человека и пригодными для списка/каталога колод.

Обязательный принцип: сначала ясность для пользователя и точное описание колоды. Нельзя делать наборы ключевых слов, списки синонимов, рекламные слоганы или одинаковые boilerplate-описания для разных колод.

`Title`:

- должен сразу называть тему колоды;
- должен быть естественной короткой фразой на целевом языке;
- должен быть уникальным для конкретной колоды;
- не должен содержать бренд, "FlashcardsLuna", "курс", "карточки" или "словарь", если без этого тема и так понятна;
- не должен быть слишком общим, например `Words`, `Vocabulary`, `Kitchen`, если колода уже уже: `Kitchenware`, `Cookware`, `Utensils`.

`Description`:

- должно дополнять `Title`, а не механически повторять его;
- должно кратко объяснять, что именно внутри колоды и для кого она полезна;
- может включать количество слов только если оно действительно стабильно для этой колоды;
- должно включать localized level-сигнал, соответствующий `Deck Metadata.level_label`, например `Basic level`, `Базовый уровень`, localized equivalent;
- level-сигнал должен звучать естественно на целевом языке, а не быть сухой подстановкой CEFR-кода;
- должно содержать основной тематический keyword естественно, без повторов;
- должно быть page-specific: описание одной колоды не должно подходить без изменений к десяткам других колод;
- должно быть локализовано естественно, а не дословно скопировано с английского, при сохранении смысла колоды.

Export and DB QA also run `scripts/check-course-metadata-localization.mjs`. The checker compares non-English rows against the EN `Course Metadata` after normalizing punctuation, so strings such as `Kitchen Storage।` / `Storage and cleanup। Elementary level।` are blockers even though they use Indic sentence punctuation. It also compares visible `Module` / `Category` values with `config/course-metadata-taxonomy-labels.json`; for example, stale category labels must be repaired in the config and DB, then re-exported and re-delivered.

### Обязательный level label

CEFR-код (`A1`, `A2`, `B1`, `B2`, `C1`, `C2`) хранится в `Deck Metadata` и `Card Metadata`. Для единообразной разметки у каждой колоды также обязательно есть одно каноническое поле:

```text
level_label
```

`level_label` не локализуется внутри `Deck Metadata`: это стабильный label для файла и фильтрации колод. Localized `Description` при этом обязано показывать человеку уровень естественным локализованным текстом. Source of truth для машинной логики все равно `level_label`.

Фиксированная шкала уровней и совместимые CEFR ranges:

| `level_label` | Compatible CEFR range |
| --- | --- |
| `Basic` | `A1` |
| `Elementary` | `A1-A2` or `A2` |
| `Pre-Intermediate` | `A2-B1` or `B1` |
| `Intermediate` | `B1` or `B1-B2` |
| `Upper-Intermediate` | `B2` |
| `Advanced` | `B2-C1` or `C1` |
| `Proficiency` | `C2` |

Если колода переходная по уровню, `level_min` / `level_max` показывают точный CEFR range, а `level_label` выбирается как основной уровень для пользователя.

Для текущего контура:

| Metadata stage | User-facing signal |
| --- | --- |
| `Basics` / `A1` | `level_label = Basic`; localized `Description` содержит exact `level_signal`, например "Basic level" / "Базовый уровень" |
| `Actions` / `A1-A2` | `level_label = Elementary` or `Pre-Intermediate`, depending on actual CEFR range |
| `Everyday Use` / `A2-B1` | `level_label = Pre-Intermediate`; localized `Description` содержит соответствующий exact `level_signal` |
| `Situation Words` / `Problem Words` | `level_label` follows actual CEFR; localized `Description` names the practical word group |
| `Precision` / `B1-B2` | `level_label = Intermediate` or `Upper-Intermediate`, depending on actual CEFR range |
| `Advanced Expansion` / `B2+` | `level_label = Advanced` or `Proficiency` |

Примеры:

```text
Title: Kitchenware Basics
Description: Cookware and utensils. Basic level.

Title: Кухонная посуда
Description: Посуда и приборы. Базовый уровень.
```

Хорошая пара работает так:

```text
Title: Kitchenware Basics
Description: Cookware and utensils. Basic level.
```

Заголовок дает быстрый ярлык темы, описание добавляет scope и пользу для пользователя. Описание не обязано повторять заголовок, если тема уже понятна.

Плохие варианты:

```text
Title: Vocabulary
Description: Kitchen kitchenware cookware utensils tableware words

Title: FlashcardsLuna Kitchen Cards
Description: Best amazing kitchen flashcards for everyone
```

Проверка качества опирается на контентный критерий: коротко, точно, уникально, descriptive, без набора ключевых слов и повторяющегося boilerplate.

Обязательный контракт для каждой новой колоды:

```text
one deck = one Google Sheets workbook
workbook title = category/deck name
main sheet = card rows in wide grouped-column format
Course Metadata = Title/Description for the same deck, not for a language course
Deck Metadata = set-level deck fields
Card Metadata = row-level card metadata
_README = workbook status and import notes
_qa_status = coverage and import-readiness checks
_languages = fixed 54-language order and transcription policy
```

Нельзя использовать примерные placeholder-метаданные вроде "Chinese", если текущая колода не является колодой китайского языка. `Title` и `Description` должны описывать именно содержимое карточек текущей колоды.

Export scripts должны валидировать эти лимиты и падать с ошибкой, если хотя бы один localized `Title` или `Description` превышает допустимую длину.

Export scripts также должны валидировать обязательный `level_label`. Если в `content_sets` нет допустимого `level_label` или его CEFR range не совместим с принятой шкалой, workbook не должен собираться. Export scripts должны валидировать, что localized `Description` contains exact DB-backed `content_set_localizations.level_signal` for the current `level_label`.

## Лист Deck Metadata

Для каждой колоды в workbook должен быть отдельный лист:

```text
Deck Metadata
```

Этот лист нужен для человека, который размещает карточки. Он не заменяет `Course Metadata`: `Course Metadata` хранит localized user-facing title/description, а `Deck Metadata` хранит структурные поля колоды.

Минимальный набор строк:

```text
field                         value
set_id                        home_kitchen_cookware_pilot_01
slug                          home-kitchen-kitchenware-basics
content_type                  vocabulary
domain                        Home
area                          Kitchen
category_or_situation         Cookware, Utensils & Tableware
roadmap_stage                 Basics
level_label                   Basic
level_min                     A1
level_max                     A1
target_item_count_min         50
target_item_count_max         50
actual_item_count             50
title_en                      Kitchenware Basics
description_en                Cookware and utensils. Basic level
learning_goal                 Learn essential kitchen items for cooking, serving, and eating.
next_recommended_set_ids      home_kitchen_cooking_actions_a1_a2; home_kitchen_storage_cleaning_a2
selection_status              approved
quality_status                generated_checked
export_mode                   final
export_status                 final_candidate
language_count                54
language_variant_count        54
main_sheet                    Home Kitchen Cookware
column_contract               translations -> examples -> word transcriptions
card_key_policy               card_key = set_id::meaning_id
sheet_contract_version        v1.1
```

Правила:

- `level_min` / `level_max` передаются отдельными полями, а не прячутся в `Title`;
- `level_label` обязателен и должен быть одним из: `Basic`, `Elementary`, `Pre-Intermediate`, `Intermediate`, `Upper-Intermediate`, `Advanced`, `Proficiency`;
- `roadmap_stage` берется из [Content Roadmap](product-content-roadmap.md);
- `learning_goal` должен объяснять пользу колоды для пользователя;
- `next_recommended_set_ids` показывает следующий логичный набор карточек;
- `slug` должен быть стабильным для workbook/export;
- `export_status` вычисляется экспортом, чтобы working preview не выглядел как готовый final-ready набор.
- `language_count` and `language_variant_count` both mean the same current 54-language export size; both are kept in delivery metadata for readability/backward compatibility.
- current production export должен падать с ошибкой, если `content_type` не `vocabulary` или `core_foundation`;
- export script должен падать с ошибкой, если обязательные deck-level поля отсутствуют в `content_sets`;
- нельзя подставлять metadata одной старой колоды как fallback для новой колоды.

## Лист Card Metadata

Для каждой колоды в workbook должен быть отдельный лист:

```text
Card Metadata
```

Этот лист содержит одну строку на одну строку основного пользовательского листа. Он нужен для проверки и размещения карточек, но не должен засорять главный карточный лист.

Минимальные колонки:

```text
main_sheet_row
display_order
card_key
set_id
meaning_id
canonical_english
english_with_article
part_of_speech
level
frequency_band
priority_band
domain
area
category
context_domain
context_area
context_category
countability
plural_form_en
semantic_class
tags
meaning_note
context_note
context_example_id
context_example_key
context_example_quality_status
meaning_quality_status
membership_quality_status
```

Правила:

- `main_sheet_row` должен указывать строку той же карточки в основном листе;
- `card_key = set_id::meaning_id` является стабильным ключом строки в workbook;
- `set_id` and `meaning_id` передаются отдельно, чтобы можно было связать карточку с колодой и semantic meaning base;
- `context_example_id` and `context_example_key = set_id::meaning_id::example_id` identify the exact deck-specific example used by example translations and semantic QA;
- `level` передается на уровне карточки, потому что внутри одной колоды могут появиться разные уровни;
- `priority_band` нужен для сортировки и практической важности карточки;
- `meaning_id` обязателен, чтобы рабочая база могла связать повторяющиеся semantic meanings между наборами, но в spreadsheet строка идентифицируется через `card_key`;
- `Card Metadata` не заменяет основной лист и не меняет порядок колонок translations -> examples -> word transcriptions.

В ячейках перевода нужно писать слово с артиклем или грамматическим маркером, если он есть и нужен изучающему:

```text
EN: a table
DE: der Tisch
FR: la table
```

Language-specific display rules уточняются в [Language Specific Rules](language-specific-rules.md). Если правило языка спорное, строка не должна получать `approved` автоматически.

Для глаголов в английском использовать learner-facing форму `to + base verb`:

```text
EN: to run
DE: laufen
FR: courir
```

Примеры должны быть очень простыми и контролируемыми:

```text
EN example: The apples are on the table.
```

Каждый пример, который переводится или экспортируется, должен иметь `semantic_scene`. Финальный пользовательский лист показывает только готовые примеры по языкам, но QA и генерация опираются на сцену.

Пример внутренней сцены:

```text
semantic_scene:
  target_object: apples
  target_display: the apples
  subject_number: plural
  action_or_state: are on
  state_or_location: on the table
  tense_aspect: present state
  topic_context: home/kitchen
```

Для глаголов пример может использовать спрягаемую форму, но не менять tense/aspect/ситуацию между языками:

```text
EN word: to run
RU word: бегать
EN example: She runs every morning.
RU example: Она бегает каждое утро.
```

Если нужен смысл "бежит сейчас/куда-то", это отдельный `meaning_id`, а не тот же item:

```text
EN word: to run
RU word: бежать
EN example: The boy is running to the door.
RU example: Мальчик бежит к двери.
```

Semantic QA has two separate gates:

1. Structural semantic scene exists: every exported example has a populated `semantic_scene` with schema v1 core fields: `target_object`, `target_display`, `subject_number`, `action_or_state`, `state_or_location`, `tense_aspect`, `topic_context`.
2. Translated examples preserve semantic scene: target, display form, number, action/state, location/state, attributes/time if present and tense/aspect must stay aligned across languages.

English example quality is a separate final gate, not a subset of semantic preservation. A translated example can preserve a bad English scene perfectly; final export still blocks unless the English context example has `example_quality` evidence that the example is natural, concrete, non-template and suitable for any language pair.

Word selection quality is also a separate final gate. It checks that the selected `meaning_id` belongs in this exact deck, fits the level/priority, is not rare padding or a mixed-bag item, and was not reused only because the English surface word matched another meaning. It is keyed to `set_id::meaning_id`; the same English surface word can require a different decision in another deck.

Post-generation AI QA uses an executable runner/import contour:

```bash
node scripts/run-ai-qa.mjs <set_id> --languages=<codes|all> --checks=<all|word_selection,base,example_quality,semantic,naturalness,lexical_anchor,pedagogical_quality,entry,entry_register,semantic_granularity,article_gender_marker,transcription,pronunciation_accuracy,regional_variant_quality> --dry-run
# Codex reviews the batch and writes an import-compatible checked JSONL.
node scripts/import-ai-qa-results.mjs outputs/qa/ai_qa_<set_id>_<checked_timestamp>.jsonl
node scripts/check-qa-evidence.mjs <set_id>
node scripts/check-entry-cross-language-fallbacks.mjs <set_id>
node scripts/check-script-language-identity.mjs <set_id>
node scripts/check-sibling-language-copy.mjs <set_id>
node scripts/check-meaning-contrast.mjs <set_id>
node scripts/check-semantic-granularity.mjs <set_id>
node scripts/check-article-gender-marker-consistency.mjs <set_id>
node scripts/check-base-example-naturalness.mjs <set_id>
node scripts/check-example-template-diversity.mjs <set_id>
node scripts/check-target-example-lexical-anchor.mjs <set_id>
node scripts/check-target-example-pedagogical-quality.mjs <set_id>
node scripts/check-cjk-example-spacing.mjs <set_id>
node scripts/check-thai-example-spacing.mjs <set_id>
node scripts/check-southeast-asian-example-spacing.mjs <set_id>
node scripts/check-action-example-surface.mjs <set_id>
node scripts/check-qa-hash-coverage.mjs <set_id>
node scripts/check-transcription-fallbacks.mjs <set_id>
node scripts/check-transcription-intra-language-collapse.mjs <set_id>
node scripts/check-transcription-cross-language-fallbacks.mjs <set_id>
node scripts/check-ipa-transcription-sanity.mjs <set_id>
node scripts/check-ipa-source-lookup.mjs <set_id>
node scripts/check-semantic-scene-alignment.mjs <set_id>
node scripts/check-target-semantic-scene-alignment.mjs <set_id>
node scripts/check-translation-source-coverage.mjs <set_id>
bash scripts/db-qa-set.sh <set_id>
node scripts/export-flashcards-working-sheet.mjs <set_id> --final
```

`run-ai-qa.mjs --dry-run` only reads Postgres and writes a QA payload JSONL file. It does not create final exports, does not mutate statuses and the dry-run output itself cannot create usable pass evidence for final delivery. Normal deck delivery is agent-owned: Codex must inspect the payload, make the linguistic decisions itself, then write a separate import-compatible checked JSONL whose reviewer/source/evidence fields are not marked dry-run or synthetic. Do not ask the user to provide `AI_QA_PROVIDER`, `AI_QA_MODEL` or `OPENAI_API_KEY`, and do not block a deck just because optional non-dry provider credentials are absent. Non-dry provider QA is allowed only when the agent already has credentials in its runtime. `import-ai-qa-results.mjs` is the step that writes structured `qa_reviews` evidence, and it rejects pass rows explicitly marked dry-run/synthetic. Primary evidence families can promote rows to `generated_checked` / `not_applicable`; auxiliary V2/V3 evidence families are required by final gates but do not override a non-pass primary status. A translated example can become `generated_checked` only when `qa_reviews` has semantic preservation evidence for the exact `set_id::meaning_id::example_id` and language code; final export additionally requires current checked naturalness, lexical-anchor and pedagogical-quality evidence.

`import-example-translations.mjs` is an official narrow helper for repaired example translations when only examples are being overwritten. It writes allowed `generation_batches.batch_type='translation'`, exact semantic-preservation evidence and current checked hashes only after target semantic scene alignment passes. Marker-supported scenes must include `scene_key`, matched marker and expected marker proof. Unsupported scenes must provide current scene-slot proof bound to the current English example, current target example, `meaning_id`, `language_code` and core `semantic_scene` fields; otherwise import, `db-qa-set.sh`, `check-qa-evidence.mjs`, final export and final audit fail closed. It must use fresh reviewed repair input; historical failed batch artifacts are not valid restart sources. This scoped semantic evidence cannot make final delivery pass by itself; current target-example naturalness, lexical-anchor and pedagogical-quality evidence must be refreshed after example text changes. If a failed deck is rebuilt, regenerated batch files with the same filenames are valid only after they are recreated from the deck spec, imported, QA-checked and documented.

`export-example-casing-repair.mjs` / `import-example-casing-repair.mjs` are the narrow deterministic repair helpers for casing-only example fixes. The exporter reads Postgres and writes a JSONL repair artifact; the importer accepts at most 3 language codes per run and verifies that each row changes only the first cased letter before updating `meaning_example_translations` and semantic-preservation evidence. It must not be used for lexical, grammar or semantic edits.

`import-transcription-repair.mjs`, `import-entry-repair.mjs`, `import-entry-metadata-repair.mjs` and `import-base-example-repair.mjs` are narrow repair helpers. Use them instead of reimporting a full language batch when only one field family is wrong. Transcription repair refreshes only `transcription`/`romanization_system`, requires source-backed repair metadata with final-ready confidence, writes `transcription_source_backing` evidence and, for IPA rows, fresh `pronunciation_accuracy` evidence; it does not overwrite entry/source notes. Entry repair refreshes native/display/article/gender/marker fields; metadata repair refreshes only split-out `article_or_marker`, `gender` and `grammatical_number`; base example repair refreshes English context example and `semantic_scene` and intentionally makes the relevant example QA evidence stale by hash.

Language generation/export cadence for a deck: after EN/RU are checked, generate remaining language variants in batches of at most 3 languages. For profile-risk decks (`action_verb`, `adjective_state`, `number_quantity`, `time_calendar`, `food_countability`, `document_admin`, `health_safety`, `service_problem`) or high-risk grammar languages, the enforced default is 1 language per batch so the prompt can carry language-specific agreement, classifier/counter/linker, aspect, register and script rules while QA isolates failures. A smaller tail batch is allowed when fewer than 3 languages remain, or for targeted recheck/repair after failed QA. Every language batch is produced as a draft JSONL first, then checked with `scripts/check-language-batch-source-preflight.mjs`; only blocker-free drafts may be imported by `scripts/import-language-batch.mjs`. The source/profile preflight/importer blocks profile-risk or high-risk multi-language batches automatically, reports `hard_blockers`, `actionable_warnings`, `decision_required`, `translation_candidates`, `example_scene_candidates`, `example_collocation_candidates`, `concept_sanity`, `spelling_sanity`, `source_conflicts` and optional `external_mt_sanity`, and requires proof fields for compound whole-meaning, action grammar, time scope, food countability/container, document register or health/safety specificity when the `deck_profile` demands them. It also blocks artificial `ZH`/`JA` example token spacing, generated `TH`/`KM`/`LO` word-segmentation spaces in short clauses and `MY` purpose/infinitive templates for simple imperative scenes before import. Translation candidates may come from Kaikki/Wiktionary, parsed DBnary EN->target translations, targeted FreeDict dictionaries, configured Apertium pairs, PanLex vocabulary/display-form hints, PanLex meaning-id EN-pivot candidates and bulk Wikidata/concept indexes when available; Tatoeba/OPUS are example/collocation sanity only; Hunspell is spelling sanity only; external MT/Google Translate can only appear as a report-only sanity signal. The source-preflight report stores timing diagnostics plus a freshness contract over the draft, spec, source manifest, transcription/translation policies, warning-decision ledger and rule version. `batch-import` reuses a fresh proof report instead of recomputing the heavy source layer, but still runs deterministic import guards and fails closed if any freshness input changed. Current post-reset delivered ordinary decks are Sort 1-34 from `Kitchenware Basics` through `Fast Food Basics`; historical pre-reset batch lists are not the clean-start contour. To speed up a current deck, update Postgres and run QA after every accepted batch, but rebuild the working workbook / Google Sheets only at the end of 54-language coverage or when the user asks for an intermediate spreadsheet. Final export remains blocked until all 54 language variants are complete, checked, and final-readiness statuses have structured QA evidence.

Generation implementation default after the Sort 30 Coffee deck: use structured/local language drafts as the primary production path, then let runner preflight, source candidates, warning ledgers and deterministic gates decide whether the draft is importable. Gemini Tools is no longer the default mass language generator for ordinary decks because live generation was too slow for full 54-language throughput. Use Gemini only as a bounded second-review or repair surface for hard cases, native-style checks or source conflicts; any Gemini result must still be converted into normal draft/evidence artifacts and pass the same runner gates.

After final docs flip a deck spec from `approved_for_generation` to `generated`, rerun `scripts/run-deck-production.mjs <set_id> --stage=complete --execute`. The `complete` stage rechecks delivery freshness and refreshes the run manifest's spec/candidate-pool hashes so `scripts/check-deck-run-state.mjs` remains warning-free without manual manifest edits.

Operational performance note from the 2026-05-03 `ES` pilot: the stage-runner prevented skipped import steps and source preflight caught/forced review of Spanish dictionary mismatches, but repeated preflight remained slow even after adding rebuildable bulk-source lookup caches. The current fix is freshness-checked reuse of the already-passed preflight report during import, plus timing fields to show where a new `draft-preflight` spends time. This improves repeat-import latency without bypassing preflight, warning decisions or deterministic import guards.

Operational memory note from the 2026-05-03 `CS` pilot: some language preflight runs can exceed Node's default heap because the source layer loads broad dictionary/corpus candidates. `scripts/run-deck-production.mjs` runs the `draft-preflight` child process with `--max-old-space-size=8192`; this is a runner guardrail, not a QA bypass. A language still cannot import unless the resulting report has 0 blockers and 0 unresolved actionable warnings.

Parallel speed-up policy: run different decks in parallel, not oversized language batches inside one deck. Each worker must claim a deck with `deck_generation_runs` before doing work. A deck already claimed with `run_status = running` must be skipped by other workers. Google Sheets is not a batch journal: intermediate batch state stays in Postgres and QA files; the final workbook is created after full 54-language coverage and QA, or as an explicitly marked working preview when requested.

Production stage runner: prompts may request a deck, but the prompt is not the controller. `scripts/run-deck-production.mjs <Sort|set_id> --stage=<stage> [--execute]` is the executable controller for production creation. It writes `outputs/runs/<set_id>/<run_id>.json`, uses `deck_generation_runs` for the runtime lock, records artifact hashes, and refuses out-of-order stages. For language work, `artifacts.last_*` fields are only resume pointers; the complete proof journal is `artifacts.draft_preflights[]` plus `artifacts.language_imports[]`, with draft hash, report hash, language codes, blocker/warning counts and `preflight_reused=true` for imports. `scripts/check-deck-run-state.mjs <Sort|set_id>` is the read-only resume/status command after a pause, crash or context reset. A completed run can show the spec hash as a warning after final documentation changes the spec status from `approved_for_generation` to `generated`; before completion, spec staleness remains a blocker. Without `--execute`, mutating stages do not write the run manifest or mutate Postgres/Drive.

Cross-chat production contract: the same runner and shared gates apply no matter which chat starts the deck. A different chat must first inspect `docs/PROJECT_STATE.md`, `docs/deck-master-plan.md`, `docs/deck-specs/README.md`, this pipeline and the run state, then continue through runner stages. Direct lower-level imports/exports are not a valid production shortcut unless they are a narrow repair followed by fresh runner QA/export/deliver/complete or equivalent documented manifest/readback/freshness proof.

The `complete` stage must refresh final workbook and delivery-manifest hashes after `check-delivery-freshness`, because freshness/readback checks can update the delivery manifest metadata. A completed run may have a post-completion spec warning from documentation status changes, but it must not leave a stale delivery-manifest artifact.

Mandatory generation order for a new deck:

1. Run `node scripts/run-deck-production.mjs <Sort|set_id> --stage=prepare --execute`; this runs `git status`, spec/candidate/readiness gates and claims the runtime lock.
2. Run `node scripts/run-deck-production.mjs <Sort|set_id> --stage=base --base=<deck-base.jsonl|csv> --execute`; this dry-runs base import, imports base rows and runs base deterministic gates.
3. Run/import AI/source-backed base checks: `word_selection_quality`, `base_example_alignment`, `example_quality`.
4. Generate language batches as draft JSONL with at most 3 languages each; use 1-language batches by default whenever `deck_profile` / `risk_flags` marks grammar-risk scope or the language is high-risk.
5. For every draft batch, run `node scripts/run-deck-production.mjs <Sort|set_id> --stage=draft-preflight --draft=<language-batch.jsonl|csv> --execute`; repair until blockers and unresolved actionable warnings are 0.
6. Import only the same preflighted draft with `node scripts/run-deck-production.mjs <Sort|set_id> --stage=batch-import --draft=<language-batch.jsonl|csv> --execute`. The runner passes `--expected-preflight-report` into `import-language-batch.mjs`. Import blocks if the draft hash no longer matches, if the report has blockers/unresolved actionable warnings, or if the freshness contract is stale because the spec, source manifest, transcription/translation policies, warning-decision ledger or preflight rule version changed. When the contract is fresh, the importer writes an import report with `preflight_reused=true` and runs only lightweight deterministic guards before the DB write.

Optional source-cache setup for that gate is explicit and project-local:

```bash
node scripts/fetch-optional-tool-sources.mjs --list
node scripts/fetch-optional-tool-sources.mjs --adapter=unimorph
node scripts/fetch-optional-tool-sources.mjs --adapter=freedict --languages=ES,FR,IT,PT,DE
```

These downloads live under ignored `reference-sources/raw/`; they improve pre-import candidates/warnings but do not replace QA evidence.

7. Run/import language checks: `entry_form`, `entry_form_register`, `semantic_granularity`, `article_gender_marker_consistency`, `transcription_policy`, `pronunciation_accuracy` for IPA rows, `transcription_source_backing`, `semantic_preservation`, `target_example_naturalness`, `target_example_lexical_anchor`, `target_example_pedagogical_quality`, `number_example_grammar` for number-heavy/quantity decks, plus `regional_variant_quality` for configured regional-risk rows.
8. Sync statuses only from fresh evidence.
9. Run `node scripts/run-deck-production.mjs <Sort|set_id> --stage=qa --execute`; it runs `db-qa-set.sh <set_id>`, source-backed translation/transcription gates, QA evidence, hash coverage, scene/profile and example gates.
10. Run `node scripts/run-deck-production.mjs <Sort|set_id> --stage=export --execute`; it runs final export and records workbook/delivery-manifest hashes.
11. Run `node scripts/run-deck-production.mjs <Sort|set_id> --stage=deliver --execute`; it uploads/updates the Google Sheet, runs readback, exports/runs/imports post-final linguistic audit, re-exports/re-uploads after audit evidence, and runs delivery freshness.
12. Run `node scripts/run-deck-production.mjs <Sort|set_id> --stage=complete --execute`; it is allowed only after delivery freshness passes and closes the runtime lock.
13. Run `node scripts/check-release-readiness.mjs <set_id>` after `complete` when a deck is being called production-current. For multiple current decks, use `--current-generated`. This creates one release passport that ties runner state, DB counts/statuses, final workbook/Google Sheet/readback, post-final audit, latest sample audit and translation-source coverage together. Missing/stale sample audit evidence or sample blockers block release readiness; sample warnings stay warnings, not blockers.
14. Run `node scripts/export-forced-review-queue.mjs <set_id>` when quality needs to move beyond automatic `generated_checked`. This exports weak/source-disagreement rows for native or focused source review without blocking normal delivery by itself. Use `--include-all-source-partial` only when deliberately preparing a broad human review pass.
15. Optionally run `node scripts/resolve-forced-review-queue.mjs --current-generated --report-only` to split the forced queue into source-confirmed, multi-source-supported, conflict/repair, still-partial and not-checkable rows. This is a read-only confidence report. Use `--write-auto-confirmations` only after reviewing the report; the ledger is current-value locked, reduces future review noise and never mutates card data or Google Sheets.
16. Run sample-card audit separately when requested or when a repair profile requires a forced sample. Default and minimum sample is 6 rows per language; when rows were repaired, run forced sample audit for every repaired row.
17. If audit fails, repair only confirmed rows through a narrow helper/import, then repeat QA, export, upload, readback and audit.
18. Update docs, commit and push.

Language-batch safety: a normal batch may contain at most 3 active language variants. If a requested language already has final-ready entry/example/transcription coverage for the deck, it must not be regenerated in normal mode. A one-language repair/recheck is allowed only with an explicit repair flag. Import preflight now rejects source/shape/script/fallback blockers before they reach Postgres, rejects high-risk 3-language batches with mass identical transcriptions or mass identical Latin entry/display surfaces, and prints source/tool/sibling-copy warnings as review artifacts.

For Pilot 1, `db/seeds/023_pilot_home_kitchen_cookware_final_readiness_status.sql` is the explicit final-readiness promotion step after full 54-language coverage. For runner-built decks, the generated `outputs/import/<set_id>_current_final_readiness_*.sql` file is the equivalent final-readiness promotion step. Apply generated one-off final-readiness or repair SQL through the runner, the relevant narrow import helper, or a targeted `psqlExec` helper. Do not use `scripts/db-apply.sh` for generated one-off deck SQL: it is a bootstrap/migration path and replays migrations/seeds before extra SQL, which can unintentionally re-run historical seed content. Final-readiness SQL promotes deck/course/meaning/membership/context-example statuses to `generated_checked`, records structured QA evidence, and sets `selection_status=approved` only to mean selected composition for final spreadsheet export. It does not replace the source-backed transcription evidence writer: before final export, run `scripts/check-source-backed-transcriptions.mjs <set_id> --write-evidence` if the latest QA run checked source backing without writing `transcription_source_backing` rows.

Workbook row count is deck-scoped. The export reads active `meaning_set_memberships` for the requested `set_id`; extra language entries elsewhere in Postgres are ignored. If the active deck has more rows than `target_item_count_max`, export validation must fail until the deck target range or scope is corrected.

Meaning reuse before translation is handled by:

```bash
node scripts/generate-meaning-reuse-plan.mjs <candidate-file.csv|jsonl> --set-id=<set_id>
```

The script reports whether candidate rows can reuse existing `meaning_id` rows. It may apply safe `meaning_set_memberships` only with `--apply-safe`. The normal generation contour does not copy `meaning_example_translations` between decks, because translated examples are keyed to the exact `set_id::meaning_id::example_id` and must be generated or QA-checked for the deck context example. A deliberate duplicate-policy retrofit may reuse unchanged example translations only when the same `meaning_id` and same canonical example are intentionally carried into the new set, the membership has explicit duplicate-reuse context, fresh `semantic_preservation` scene-slot proof is imported for the new `set_id::meaning_id::example_id`, and the full QA/export/readback/audit/freshness loop passes again.

`import-ai-qa-results.mjs` may import hundreds or thousands of QA rows for one batch. The shared `psqlExec` helper uses a file-backed `psql -f` path for large SQL payloads so batch QA imports do not fail on shell argument-size limits. For large non-`transcription_policy` evidence files, use `--bulk`; this keeps target validation set-based and avoids one huge row-by-row transaction.

Если слово многозначное, перевод и пример должны соответствовать заданному контексту:

```text
table in kitchen/home context = a table
table in computer/spreadsheet context = a table / a data table / spreadsheet table depending on context
```

Технические поля можно держать во внутренней рабочей базе или на отдельном служебном листе, но пользовательский тематический лист должен оставаться удобным для проверки и последующей загрузки пользователем.

## Рабочие колонки внутренней базы

Минимальный набор полей для внутренней vocabulary base:

```text
set_name
content_type
meaning_id
domain
area
category
part_of_speech
canonical_english
english_with_article
canonical_meaning
priority_band
base_example_en
context_example_en
semantic_scene
target_language_code
target_language_name
target_word
target_word_with_article_or_marker
article_or_marker
gender
transcription
romanization
romanization_system
pronunciation_ipa
example_target
usage_note
quality_status
```

Ready-phrase, multi-turn and mixed sheets are not part of the current production/export contract.

## Широкий или длинный формат

Для внутренней рабочей базы предпочтителен длинный формат:

```text
one row = one content item + one language
```

Это проще проверять, фильтровать, валидировать и загружать дальше.

Для финального Google Sheets deliverable используется широкий grouped-column формат:

```text
one row = one content item, active language-variant columns
```

Порядок групп в финальном листе:

```text
translations -> examples -> word transcriptions
```

Внутренняя нормализованная база и финальный пользовательский лист могут отличаться. Это нормально: база нужна для качества, а Google Sheets deliverable - для ручной проверки и выдачи пользователю. Но финальный лист не должен показывать несколько вариантов произношения: только `transcription`.

## Google Drive folder

Обязательная пользовательская папка для финальных Google Sheets и spreadsheet-файлов:

```text
Слова для FlashcarsLuna
https://drive.google.com/drive/folders/1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei?usp=sharing
```

Правило доставки:

- каждый финальный workbook по колоде должен сохраняться/размещаться в этой папке;
- после создания Google Sheet нужно проверить целевую папку через Drive folder listing;
- файл считается размещенным в Drive-папке только если он виден в этой папке;
- preferred automated path: загрузить финальный `.xlsx` через `scripts/upload-spreadsheet-to-drive-folder.mjs`, потому что этот путь указывает `folderId` при создании файла;
- для Oxford 3000/5000 после закрытия source-package QA действует standing auto-publish rule: экспортировать две финальные US/UK `.xlsx`, загрузить их как native Google Sheets в целевую Drive-папку, выполнить Google Sheet readback, обновить release contract/docs и только потом считать delivery закрытой. Это Oxford-specific правило не разрешает ordinary deck-table Postgres import или isolated Oxford DB import без отдельной команды;
- non-final QA/report artifacts may be uploaded as raw source files through `scripts/upload-drive-file-to-folder.mjs`; this path must not be described as final Google Sheets delivery and must not convert CSV/Markdown/JSON into Google Workspace files;
- raw Drive upload для Oxford QA/report artifacts разрешен только если пользователь явно просит сохранить отчет/артефакты/evidence, а не `колоду`, `таблицу`, `как первую часть` или общий `Google Drive` deliverable;
- если доступный connector может импортировать `.xlsx`, но не может указать `parent/folder` или переместить файл, это не считается полноценным folder delivery;
- в таком случае deliverable остается: локальный `.xlsx` внутри проекта + ссылка на созданный Google Sheet + явная пометка `folder placement blocker`;
- blocker закрывается только после ручного перемещения пользователем или через Drive-инструмент, который поддерживает `parentId` / move.

Текущий доступный Google Drive connector умеет импортировать `.xlsx` как native Google Sheets, но не дает параметра `parent/folder` для размещения файла в указанной папке и не предоставляет move/update-file operation. Поэтому при импорте через connector файл может создаваться вне целевой папки; это нужно явно проверять и не называть файл размещенным в папке без подтверждения.

Автоматическая загрузка в целевую папку идет отдельным Drive API script. Для обычной папки в Google Drive preferred mode - OAuth Desktop client от Google-аккаунта пользователя. Локальный client secret хранится только в `.secrets/google-oauth-client.json`; эта папка игнорируется git.

```bash
node scripts/upload-spreadsheet-to-drive-folder.mjs \
  --authorize
```

После one-time authorization:

```bash
node scripts/upload-spreadsheet-to-drive-folder.mjs \
  outputs/google-sheets/FlashcardsLuna_home-kitchen-kitchenware-basics_final.xlsx \
  --title="FlashcardsLuna 001 of 180 - Kitchenware Basics"
```

For raw QA/report artifacts that must be saved in the same Drive folder without Google Sheets conversion:

```bash
node scripts/upload-drive-file-to-folder.mjs \
  outputs/oxford-vocabulary/qa/<report>.md \
  outputs/oxford-vocabulary/qa/<report>.csv \
  outputs/oxford-vocabulary/qa/<report>.json \
  --manifest=outputs/oxford-vocabulary/qa/<report>_drive_upload.json
```

Production Google Sheet title convention for ordinary 180-deck backlog decks:

```text
FlashcardsLuna <Sort padded to 3 digits> of 180 - <Deck Name>
```

Example:

```text
FlashcardsLuna 006 of 180 - Bedroom Basics
```

`scripts/run-deck-production.mjs --stage=deliver` is the controller for this naming. If no explicit `--title` is passed, it must use the Deck Master Plan `Sort` and deck name. Slug-only export names such as `FlashcardsLuna_home-bedroom-basics_final` and legacy no-progress titles such as `FlashcardsLuna - Bedroom Basics` must not be used as production Google Sheet titles for newly delivered ordinary decks.

Current post-reset ordinary generated deck titles after the 2026-05-24 Fruit Basics delivery:

| Sort | Deck | Google Sheet title | Google Sheet id |
| --- | --- | --- | --- |
| 1 | Kitchenware Basics | `FlashcardsLuna 001 of 180 - Kitchenware Basics` | `1cHEa0ZCejUvLyLkCa_Fqy-3F9K3qspe7Rh3Ti401mos` |
| 2 | Cooking Actions | `FlashcardsLuna 002 of 180 - Cooking Actions` | `1onq4cdGFLjPcPl9M1gxAnA9gtP4E2CPRr9g2mhA2Uw0` |
| 3 | Kitchen Storage & Cleaning | `FlashcardsLuna 003 of 180 - Kitchen Storage & Cleaning` | `11y_6d-Rmok12-dRE7MpCzEoBIkrqWSy7IvfUy8831EU` |
| 4 | Kitchen Small Tools & Supplies | `FlashcardsLuna 004 of 180 - Kitchen Small Tools & Supplies` | `1L4kOCdjAU0zkXieZgmaaGqtpy6fwi9A9bTnZZrNTVNw` |
| 5 | Bathroom Essentials | `FlashcardsLuna 005 of 180 - Bathroom Essentials` | `1dUGgoVP2MLgPpRK03mSzh6DHaPWb0S6ryKr38OBMI5o` |
| 6 | Bedroom Basics | `FlashcardsLuna 006 of 180 - Bedroom Basics` | `1LV2yQGx_pAUgjEG2NNS1aPKvXBW-7TmL8Y-z4aBmUMg` |
| 7 | Living Room Basics | `FlashcardsLuna 007 of 180 - Living Room Basics` | `146LfF_3P6Gf2f66pb3ddIhiptuxDr7H7umzSVjDNTtQ` |
| 8 | Dining Room & Table Setup | `FlashcardsLuna 008 of 180 - Dining Room & Table Setup` | `1WpphriRtOBeZo2WOU8bv1gCTx88IxMYGpSSPeVbjRX0` |
| 9 | Entryway & Outerwear | `FlashcardsLuna 009 of 180 - Entryway & Outerwear` | `12kQQ3qH_CdbbC0fac4Ap4j1lUyVw3VPxwoxaxJCZSb0` |
| 10 | Furniture Basics | `FlashcardsLuna 010 of 180 - Furniture Basics` | `1WGVMJIrn3jbTD7EZ3r_fRwtkJJn14hQ1ijsatx0rzco` |
| 11 | Laundry & Cleaning Basics | `FlashcardsLuna 011 of 180 - Laundry & Cleaning Basics` | `1KlVTYlpyBjxNj9vjRZcWKXVrIRZO2W5PI8CKVswaoBc` |
| 12 | Home Office & Desk | `FlashcardsLuna 012 of 180 - Home Office & Desk` | `16MFcReeasVCe_ISX2KuGoiM7mvRFleABAA4XvQVqkLk` |
| 13 | Home Structure & Exterior | `FlashcardsLuna 013 of 180 - Home Structure & Exterior` | `1j3KRz0-f84T8rMbi7-L89OlbPZgo9o3FwWhBWFhgyNw` |
| 14 | Apartment Building & Common Areas | `FlashcardsLuna 014 of 180 - Apartment Building & Common Areas` | `1PVEyJf5va6g7iQ8PrcxW0jSDS7FAYtSvRK8433SUneg` |
| 15 | Outdoor Home & Garden | `FlashcardsLuna 015 of 180 - Outdoor Home & Garden` | `12HwClX4N69LJbS2jvuNclSZolyPwR1i6RkceTbk4cvY` |
| 16 | Numbers & Counting | `FlashcardsLuna 016 of 180 - Numbers & Counting` | `1BWfmAdcRXOHfV8XLyUOuV5Z0GOwlnJLviFRg-GdPkJY` |
| 17 | Colors & Shapes | `FlashcardsLuna 017 of 180 - Colors & Shapes` | `14jMyxsNdT2wXr0vQB9hi4SV0qpDdrq_qJb7Rc_4kDmc` |
| 18 | Pronouns & People Basics | `FlashcardsLuna 018 of 180 - Pronouns & People Basics` | `1D1tbd0fFDgwjbS9BbsKT86PD33EPd9jm5lUViyLpuKw` |
| 19 | Question Words | `FlashcardsLuna 019 of 180 - Question Words` | `1A46O8Gv5FJdePgZkaHP5PecJlGwBrzk_GH_r1-S9fNI` |
| 20 | Basic Verbs | `FlashcardsLuna 020 of 180 - Basic Verbs` | `1dX5EG6beSKj3dP4fAjXcX9zWykl-Xhd3pchxWzMp_WI` |
| 21 | Practical Action Verbs | `FlashcardsLuna 021 of 180 - Practical Action Verbs` | `1ltPINZkvavEp0nz3Fhxu0lT0LPkJk5QFE6WzxmphPPw` |
| 22 | Time & Days | `FlashcardsLuna 022 of 180 - Time & Days` | `1vg7atpBUDHeNiRpPBhOjFVvuYlXIk5_9B-C6R-6qcak` |
| 23 | Learning Help Words | `FlashcardsLuna 023 of 180 - Learning Help Words` | `1gZdrr3YHEPsbfxLF750GbKqLhAOZGHov8X66G83FuUg` |
| 24 | Park & Playground | `FlashcardsLuna 024 of 180 - Park & Playground` | `1ZIy6OrpNgG3kbM1j4O9VEh6IJhG-heev9hcHJWi0DvI` |
| 25 | Food Basics | `FlashcardsLuna 025 of 180 - Food Basics` | `10kcu7l5Gf8u9XG9bulZcGEI3mKND7FHV6zdshuLGfIQ` |
| 26 | Fruit Basics | `FlashcardsLuna 026 of 180 - Fruit Basics` | `15Db4jqfy7IQ0m8BRGUPJgY4isycucEnvnY9rGRUIjMw` |

Для первой delivery новой колоды или когда прежний Google Sheet был удален/перемещен в Drive trash, нужно создавать новый файл в целевой папке:

```bash
node scripts/upload-spreadsheet-to-drive-folder.mjs \
  outputs/google-sheets/FlashcardsLuna_home-kitchen-kitchenware-basics_final.xlsx \
  --folder-id=1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei \
  --title="FlashcardsLuna 001 of 180 - Kitchenware Basics"
```

Для перезаливки уже существующей колоды без дубля нужно указать current existing Google Sheet id only if that file is still valid and not in Drive trash:

```bash
node scripts/upload-spreadsheet-to-drive-folder.mjs \
  outputs/google-sheets/FlashcardsLuna_home-kitchen-kitchenware-basics_final.xlsx \
  --file-id=<current-google-sheet-id> \
  --title="FlashcardsLuna 001 of 180 - Kitchenware Basics"
```

Скрипт по умолчанию конвертирует `.xlsx` в native Google Sheets and creates the file with `parents: [folderId]`. With `--file-id`, it updates the existing Google Sheet and verifies that it is still in the required folder. Existing native Google Sheet updates require Google Sheets API preflight before Drive media upload; if the API is disabled, the script refuses the update because Drive-only conversion can truncate the sheet while still returning a successful Drive response. После upload/update скрипт перечитывает Drive file metadata, проверяет title and parent folder, and updates the local delivery manifest next to the workbook:

```text
outputs/google-sheets/<final-workbook>_delivery.json
```

Manifest records `set_id`, workbook path, row count, language count, export time, Drive folder id, Google Sheet id/url/title, folder verification status and whether the uploaded Google Sheet matches the current local workbook. OAuth token сохраняется локально в `.secrets/google-oauth-token.json`, эта папка игнорируется git. Service-account mode остается fallback только для Shared Drive / explicitly shared setups через `GOOGLE_APPLICATION_CREDENTIALS` или `GOOGLE_SERVICE_ACCOUNT_JSON`. Без OAuth token или service-account credentials допустим только `--dry-run`; это проверяет локальный файл, `folderId` and intended title, но не создает Google Sheet.

After upload/update, run `node scripts/check-google-sheet-readback.mjs <set_id>`. The readback gate normally uses Google Sheets API and can fall back to Drive XLSX export for verification, but fallback is verification-only: it does not make Drive media upload safe when the Sheets API preflight is disabled. Delivery is current only after `check-google-sheet-readback.mjs` and `check-delivery-freshness.mjs` pass.

Reset status after 2026-05-02: local Postgres was cleared of content/QA/export/runtime rows. The Google Sheets below are historical delivered files that were not deleted or modified by the reset. They must not be treated as current local delivery state unless the corresponding deck is rebuilt from the clean DB, exported again, uploaded/read back and passes post-final audit/freshness.

Historical early working Google Sheet:

```text
FlashcardsLuna - Home Kitchen: Cookware, Utensils & Tableware
https://docs.google.com/spreadsheets/d/1B7rlP-uKbrOBkHA3na4EnNuKkFE22QnWG7dD9ZfjD0s
```

Historical production Google Sheets and pre-reset delivery status:

```text
FlashcardsLuna - Kitchenware Basics
https://docs.google.com/spreadsheets/d/1ua3NyyIL6YD1GczT06Q4yISdvnor9YYiLuiIU7qgIM4
created via scripts/upload-spreadsheet-to-drive-folder.mjs OAuth flow
Drive API parents = ["1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei"]
target folder listing check on 2026-04-27: file present
folder placement status = placed
latest update on 2026-04-28: same file id updated after fallback guardrail export refresh and clean post-final linguistic audit
latest update on 2026-04-29: same file id refreshed after semantic-scene alignment repair for context examples, clean QA evidence check and clean post-final linguistic audit
latest update on 2026-04-29: same file id refreshed after target-example naturalness QA evidence import, clean final export and clean post-final linguistic audit
latest update on 2026-04-29: same file id refreshed after cross-language transcription fallback rollout, clean final export and clean post-final linguistic audit
latest update on 2026-04-29: same file id refreshed after full QA contour rollout (`entry/display` fallback, sibling-copy warnings, meaning contrast, base-example naturalness, regional variant evidence, hash coverage), clean final export and clean post-final audit
latest update on 2026-04-30: same file id refreshed after source-backed transcription evidence (`transcription_source_backing`) was written for current rows, clean source-backed final audit `outputs/audit/final_linguistic_audit_home_kitchen_cookware_pilot_01_source_backed_20260430_results_summary.json`, readback and delivery freshness.
V3 status on 2026-05-01: Google Sheets API is enabled for OAuth project `130628727588`; the same file id was updated in place after the strict high-risk/source-backed refresh and again after the all-language native-copy translation repair. `check-google-sheet-readback` passed through Sheets API and `check-delivery-freshness` passed. The later IPA-focused source lookup report found no hard blockers for this deck. Latest audit: `outputs/audit/final_linguistic_audit_home_kitchen_cookware_pilot_01_non_tl_repair_20260501_results_summary.json`, 2700/2700 pass.

Current post-reset Kitchenware Basics delivery:

```text
FlashcardsLuna 001 of 180 - Kitchenware Basics
https://docs.google.com/spreadsheets/d/1cHEa0ZCejUvLyLkCa_Fqy-3F9K3qspe7Rh3Ti401mos
created as a new Google Sheet on 2026-05-04 because the previous Sheet was moved to Google Drive trash
Drive API parents = ["1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei"]
upload mode = create_new
readback status = verified
delivery freshness = pass
latest audit: `outputs/audit/final_linguistic_audit_home_kitchen_cookware_pilot_01_20260504T081517Z_results_summary.json`, 2700/2700 pass
latest stricter-contour update on 2026-05-04: narrow MY/KM transcription-style repair completed after `transcription_style_consistency` found mixed Burmese component/apostrophe style and Khmer IPA-like practical-romanization symbols. Repair artifact: `outputs/import/home_kitchen_cookware_pilot_01_transcription_style_repair_my_km_20260504.jsonl`. Repaired values were current-value-locked in `reference-sources/manual-decisions/high-risk-transcription-decisions.jsonl`, final export was rebuilt, the same Google Sheet id was updated, readback passed, post-final audit `outputs/audit/final_linguistic_audit_home_kitchen_cookware_pilot_01_style_repair_20260504_results_summary.json` reports 2700/2700 pass and delivery freshness passes.
latest style-profile update on 2026-05-04: `config/transcription-style-profiles.json` was added and `transcription_style_consistency` now checks profile-level symbol/punctuation consistency for 20 romanization/transliteration languages in the pilot. It caught remaining MY drift that the earlier hard-coded gate did not prove: `pan:kan`, `re-nwe:ou:`, `a.hpum:`, `laksutpa.wa`, `tú`, `hmwe tán`. Repair artifact: `outputs/import/home_kitchen_cookware_pilot_01_my_transcription_style_profile_repair_20260504.jsonl`; new MY values: `pan: kan`, `tu`, `le' thou pa. wa`, `a. hpoun:`, `jei nwei: ou:`, `hmwei tan`. Same Sheet id was updated again, readback passed, post-final audit `outputs/audit/final_linguistic_audit_home_kitchen_cookware_pilot_01_my_style_profile_repair_20260504_results_summary.json` reports 2700/2700 pass and delivery freshness passes.
latest repair refresh on 2026-05-14: same Sheet id `1cHEa0ZCejUvLyLkCa_Fqy-3F9K3qspe7Rh3Ti401mos` was updated in place after restoring Swahili `spatula` to `mwiko mpana`, refreshing high-risk `TH`/`LO`/`MY`/`KM`/`HY` transcriptions, repairing three intra-deck contrast rows (`JA` pan/frying pan, `NL` pot/pan, `SV` pot/saucepan) and normalizing legacy `semantic_scene.action_or_state` values. `check-qa-evidence`, Google Sheet readback, post-final audit `outputs/audit/final_linguistic_audit_home_kitchen_cookware_pilot_01_20260514T084840Z_results_summary.json`, `check-delivery-freshness` and release readiness `outputs/release-readiness/home_kitchen_cookware_pilot_01_release_readiness_after_20260514_repair_v2.json` all pass.
latest same-file repair refresh on 2026-05-25: same Sheet id `1cHEa0ZCejUvLyLkCa_Fqy-3F9K3qspe7Rh3Ti401mos` was updated in place after re-applying the confirmed narrow DB repairs and current QA evidence. The final workbook hash is `f9b6b3f0e8c678c041cee1a2b739e2cb5d44594df6b5d86f21bc6d9d9644d682`; `bash scripts/db-qa-set.sh home_kitchen_cookware_pilot_01`, `node scripts/check-qa-evidence.mjs home_kitchen_cookware_pilot_01`, Google Sheet readback, post-final audit `outputs/audit/final_linguistic_audit_home_kitchen_cookware_pilot_01_20260525T074615Z_results_summary.json` and `node scripts/check-delivery-freshness.mjs home_kitchen_cookware_pilot_01` all pass.
```

Current post-reset Cooking Actions delivery:

```text
FlashcardsLuna 002 of 180 - Cooking Actions
https://docs.google.com/spreadsheets/d/1onq4cdGFLjPcPl9M1gxAnA9gtP4E2CPRr9g2mhA2Uw0
created as a new Google Sheet on 2026-05-04 because the previous Sheet was moved to Google Drive trash
Drive API parents = ["1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei"]
upload mode = create_new, then same-file audit refresh
readback status = verified; sample cells = 504
delivery freshness = pass
workbook hash = 1589a7a36d1160dbab5f75f9a88ccef0f3f2d727937585139823c93e58ffda3a
latest audit: `outputs/audit/final_linguistic_audit_home_kitchen_cooking_actions_a1_a2_km_lo_my_repair_20260505_results_summary.json`, 1350/1350 pass
target scene gate: 1350 supported/proof-backed target examples, 0 unsupported final rows skipped
latest CJK example-spacing repair on 2026-05-05: repaired 50 `ZH`/`JA` examples that had generated tokenization spaces, repaired 3 Japanese entry choices for `boil`, `drain` and `cover`, added `scripts/check-cjk-example-spacing.mjs` and wired the same rule into preflight/import/final gates. Same Sheet id was updated again, readback passed, post-final audit `outputs/audit/final_linguistic_audit_home_kitchen_cooking_actions_a1_a2_cjk_repair_20260505_results_summary.json` reports 1350/1350 pass, final workbook hash `c8e57fe8e494c83d4a155fbd3c2091784975a615a265aff45d8e5db38b8bb55e`, and delivery freshness passes.
latest Thai example-spacing repair on 2026-05-05: repaired 25 `TH` examples that had generated word-segmentation spaces, added `scripts/check-thai-example-spacing.mjs` and wired the same rule into preflight/import/final gates. Same Sheet id was updated again, readback passed, post-final audit `outputs/audit/final_linguistic_audit_home_kitchen_cooking_actions_a1_a2_thai_repair_20260505_results_summary.json` reports 1350/1350 pass, final workbook hash `ab56c16d522f0041c862214dff04c35152e0df6e6fba72b0e77d74c97e182404`, and delivery freshness passes.
latest KM/LO/MY action-example repair on 2026-05-05: repaired 75 action examples, 25 each for `KM`, `LO` and `MY`, after the new `scripts/check-southeast-asian-example-spacing.mjs` and `scripts/check-action-example-surface.mjs` gates blocked artificial Khmer/Lao token spaces and Burmese `ရန်` purpose/infinitive templates. Same Sheet id was updated again, readback passed, post-final audit `outputs/audit/final_linguistic_audit_home_kitchen_cooking_actions_a1_a2_km_lo_my_repair_20260505_results_summary.json` reports 1350/1350 pass, final workbook hash `1589a7a36d1160dbab5f75f9a88ccef0f3f2d727937585139823c93e58ffda3a`, and delivery freshness passes.
```

Historical pre-reset Cooking Actions Sheet:

```text
FlashcardsLuna - Cooking Actions
https://docs.google.com/spreadsheets/d/1Yi1u6gxHn16KPz8g3uUS9mFulngE_XbVygvUjEi6eBU
created via scripts/upload-spreadsheet-to-drive-folder.mjs OAuth flow
Drive API parents = ["1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei"]
folder placement status = placed
latest update on 2026-04-28: same file id updated after fallback guardrail export refresh and clean post-final linguistic audit
latest update on 2026-04-29: same file id refreshed after target-example naturalness QA evidence import, clean final export and clean post-final linguistic audit
latest update on 2026-04-29: same file id refreshed after cross-language transcription fallback rollout, clean final export and clean post-final linguistic audit
latest update on 2026-04-29: same file id refreshed after full QA contour rollout (`entry/display` fallback, sibling-copy warnings, meaning contrast, base-example naturalness, regional variant evidence, hash coverage), clean final export and clean post-final audit
latest update on 2026-04-30: same file id refreshed after the source-backed transcription evidence refresh, final export rebuild, clean source-backed post-final audit `outputs/audit/final_linguistic_audit_home_kitchen_cooking_actions_a1_a2_source_backed_20260430_results_summary.json`, readback and delivery freshness.
V3 status on 2026-05-01: delivered under the strict high-risk/source-backed contour and enforced all-language native-copy translation gate. The TL repair changed one confirmed row, and the later all-language non-TL pass source-locked rows without changing this deck. The later IPA-focused source lookup report found no hard blockers for this deck. Latest audit: `outputs/audit/final_linguistic_audit_home_kitchen_cooking_actions_a1_a2_tl_repair_20260501_results_summary.json`, 1350/1350 pass.
```

FlashcardsLuna - Kitchen Storage & Cleaning
https://docs.google.com/spreadsheets/d/1LFKhL76JNWCf49wi3vdV6Y3dunYb6Bf049Y6LMncu3E
created via scripts/upload-spreadsheet-to-drive-folder.mjs OAuth flow
Drive API parents = ["1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei"]
folder placement status = placed
latest update on 2026-04-28: same file id refreshed after fallback guardrail final export and clean post-final linguistic audit
latest update on 2026-04-29: same file id refreshed after semantic-scene alignment repair for context examples, clean QA evidence check and clean post-final linguistic audit
latest update on 2026-04-29: RU example naturalness repaired (`Кухонная раковина находится чистая.` -> `Кухонная раковина чистая.`), target-example naturalness QA evidence imported, same file id refreshed and post-final linguistic audit passed
latest update on 2026-04-29: same file id refreshed after cross-language transcription fallback rollout, clean final export and clean post-final linguistic audit
latest update on 2026-04-29: same file id refreshed after full QA contour rollout (`entry/display` fallback, sibling-copy warnings, meaning contrast, base-example naturalness, regional variant evidence, hash coverage), clean final export and clean post-final audit
latest update on 2026-04-30: same file id refreshed after three confirmed `IS` target-scene example repairs, source-backed transcription evidence refresh, final export rebuild, clean source-backed post-final audit `outputs/audit/final_linguistic_audit_home_kitchen_storage_cleaning_a2_source_backed_20260430_results_summary.json`, readback and delivery freshness.
V3 status on 2026-05-01: delivered under the strict high-risk/source-backed contour after confirmed current-row repairs and stale-safe source decisions. A later IPA-focused source lookup gate found blockers; the completed IPA repair rollout imported 124 source-backed IPA fixes into Postgres for this deck, refreshed source-backed evidence, rebuilt the final workbook, updated the same Google Sheet file id in place, verified readback and passed delivery freshness. The all-language translation pass later repaired ID `pantry -> pantri`, refreshed the same file id and passed freshness again. Current audit: `outputs/audit/final_linguistic_audit_home_kitchen_storage_cleaning_a2_non_tl_repair_20260501_results_summary.json`, 1890/1890 pass. Current lookup report: `outputs/qa/ipa_source_lookup_final_recheck_20260501.json`.

FlashcardsLuna - Bathroom Essentials
https://docs.google.com/spreadsheets/d/13SZ_QZI5-cMzw31W3RaiHtsK4Ds9r6Jzf_weJHjtgiY
created via scripts/upload-spreadsheet-to-drive-folder.mjs OAuth flow
Drive API parents = ["1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei"]
folder placement status = placed
latest update on 2026-04-29: semantic_scene and translated examples repaired from concrete Bathroom location scenes, target-example naturalness evidence imported, final export passed, same file id refreshed and post-final linguistic audit passed
latest update on 2026-04-29: BN/HI/NE/SI/TA/TE/KN/ML transcriptions repaired from cross-language pseudo-English fallback to ISO 15919 from current display words; same file id refreshed and post-final linguistic audit passed
latest update on 2026-04-29: same file id refreshed after full QA contour rollout (`entry/display` fallback, sibling-copy warnings, meaning contrast, base-example naturalness, regional variant evidence, hash coverage), clean final export and clean post-final audit
latest update on 2026-04-30: same file id refreshed after the source-backed transcription evidence refresh, final export rebuild, clean source-backed post-final audit `outputs/audit/final_linguistic_audit_home_bathroom_essentials_a1_source_backed_20260430_results_summary.json`, readback and delivery freshness.
V3 status on 2026-05-01: delivered under the strict high-risk/source-backed contour after confirmed current-row repairs and stale-safe source decisions. The parity audit passed base word selection 35/35 and found no scope failure. A later IPA-focused source lookup gate found blockers; the completed IPA repair rollout imported 111 source-backed IPA fixes into Postgres for this deck, refreshed source-backed evidence, rebuilt the final workbook, updated the same Google Sheet file id in place, verified readback and passed delivery freshness. The all-language non-TL pass later source-locked rows without changing this deck; delivery freshness still passes. Current audit: `outputs/audit/final_linguistic_audit_home_bathroom_essentials_a1_ipa_repair_20260501_results_summary.json`, 1890/1890 pass. Current lookup report: `outputs/qa/ipa_source_lookup_final_recheck_20260501.json`.

FlashcardsLuna 004 of 180 - Kitchen Small Tools & Supplies
https://docs.google.com/spreadsheets/d/1L4kOCdjAU0zkXieZgmaaGqtpy6fwi9A9bTnZZrNTVNw
created via scripts/upload-spreadsheet-to-drive-folder.mjs OAuth flow
Drive API parents = ["1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei"]
folder placement status = placed
latest delivered update on 2026-05-13: same Sheet was refreshed after the duplicate-policy retrofit that expanded the deck from 24 to 32 cards by reusing 8 existing `Kitchenware Basics` meanings (`grater`, `whisk`, `rolling pin`, `measuring cup`, `measuring spoon`, `strainer`, `can opener`, `bottle opener`). Full QA, final export, same-file Google Sheet update/readback, post-final audit and delivery freshness pass. Latest audit: `outputs/audit/final_linguistic_audit_home_kitchen_small_tools_supplies_a2_20260513T150043Z_results_summary.json`, 1728/1728 pass. Delivery freshness passes with workbook hash `5e35700b0f074260ea45e37b64bc831e79ce192ea8269b7a32875194e2e110ab`.

FlashcardsLuna 006 of 180 - Bedroom Basics
https://docs.google.com/spreadsheets/d/1LV2yQGx_pAUgjEG2NNS1aPKvXBW-7TmL8Y-z4aBmUMg
created via scripts/upload-spreadsheet-to-drive-folder.mjs OAuth flow
Drive API parents = ["1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei"]
folder placement status = placed
latest delivered update on 2026-05-06: rebuilt from the post-reset clean DB through runner `run_home_bedroom_basics_a1_20260506T072311078Z_7b12ab3b`, then refreshed after English canonical-scene repair. The current final workbook has 30 cards x 54 languages = 1620 rows. Local DB canonical English examples, EN example translations and the exported XLSX EN examples match for 30/30 cards. Readback, post-final audit 1620/1620 and delivery freshness pass. The Google Sheet title was normalized from the technical slug title to the ordinary deck-title convention `FlashcardsLuna 006 of 180 - Bedroom Basics`.

FlashcardsLuna 016 of 180 - Numbers & Counting
https://docs.google.com/spreadsheets/d/1BWfmAdcRXOHfV8XLyUOuV5Z0GOwlnJLviFRg-GdPkJY
created via scripts/upload-spreadsheet-to-drive-folder.mjs OAuth flow
Drive API parents = ["1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei"]
folder placement status = placed
latest delivered update on 2026-05-17: rebuilt from the post-reset clean DB through runner `run_core_numbers_counting_a1_20260517T030122919Z_460b70fa` with 44 cards x 54 languages = 2,376 language rows. The deck preserves concrete EN canonical scenes, includes the nine approved compound-number rows and current `number_example_grammar` evidence, and keeps non-RU rows at generated_checked rather than native-approved. Final workbook hash `e71b485938e72085bf5bb1a03f48ce63cf6697aad2528ffb137272ff332d8c2b`; readback verified 504 sampled cells through Sheets API; latest audit `outputs/audit/final_linguistic_audit_core_numbers_counting_a1_20260517T093039Z_results_summary.json` reports 2376/2376 pass; delivery freshness passes. Historical pre-reset Sheet id `1tcvYQbP3nMEwOAZX6gciTm2ruH1RbL1wMYe5vCo3hZo` is not the current post-reset delivery.
```

Локальные final `.xlsx`:

```text
outputs/google-sheets/FlashcardsLuna_home-kitchen-kitchenware-basics_final.xlsx
outputs/google-sheets/FlashcardsLuna_home-kitchen-cooking-actions_final.xlsx
outputs/google-sheets/FlashcardsLuna_home-kitchen-storage-cleaning_final.xlsx
outputs/google-sheets/FlashcardsLuna_home-bathroom-essentials_final.xlsx
outputs/google-sheets/FlashcardsLuna_home-kitchen-small-tools-supplies_final.xlsx
outputs/google-sheets/FlashcardsLuna_home-bedroom-basics_final.xlsx
outputs/google-sheets/FlashcardsLuna_numbers-counting_final.xlsx
```

Локальные delivery manifests:

```text
outputs/google-sheets/FlashcardsLuna_home-kitchen-kitchenware-basics_final_delivery.json
outputs/google-sheets/FlashcardsLuna_home-kitchen-cooking-actions_final_delivery.json
outputs/google-sheets/FlashcardsLuna_home-kitchen-storage-cleaning_final_delivery.json
outputs/google-sheets/FlashcardsLuna_home-bathroom-essentials_final_delivery.json
outputs/google-sheets/FlashcardsLuna_home-kitchen-small-tools-supplies_final_delivery.json
outputs/google-sheets/FlashcardsLuna_home-bedroom-basics_final_delivery.json
outputs/google-sheets/FlashcardsLuna_numbers-counting_final_delivery.json
```

## Английский как base в таблицах

Английский `EN` должен присутствовать как canonical base. `EN` означает American English / US default:

- `canonical_english`;
- `canonical_meaning`;
- `base_example_en`;
- `context_example_en`, если пример зависит от набора.

Для английского также может быть отдельная language entry, если английский используется как изучаемый язык в парах.

## Quality statuses

Каждая строка или language entry должна иметь статус:

```text
draft
generated
generated_checked
needs_review
approved
blocked
```

Pronunciation-only fields may also use `not_applicable`.

`approved` означает реальную человеческую проверку, а не просто успешную AI-generation. Без носителей все 54 языковые варианты не становятся `approved` автоматически.

Status ownership contract:

| Поле / источник | Что контролирует | Final export rule |
| --- | --- | --- |
| `Deck Master Plan.Status` | Очередь, planning state and generation readiness. | Не используется как final-ready сигнал; generation requires `approved_for_generation`. |
| `content_sets.selection_status` | Выбрана ли композиция колоды для final export. | Must be `approved`. |
| `content_sets.quality_status` | Качество deck-level content. | Must be `approved` or `generated_checked` with structured evidence. |
| `content_set_localizations.quality_status` | Качество localized `Course Metadata`. | Must be `approved` or `generated_checked` with structured evidence. |
| `meaning_units` / `meaning_set_memberships` / `meaning_examples` quality | Качество meaning, card membership and context example. | Must be `approved` or `generated_checked` with structured evidence; generated_checked memberships additionally require `word_selection_quality`. |
| `meaning_language_entries.quality_status` / `meaning_example_translations.quality_status` | Качество words and examples per language. | Must be `approved` or `generated_checked`; context examples also need `base_example_alignment` and V3 `example_quality`, translated examples also need `semantic_preservation`, `target_example_naturalness`, `target_example_lexical_anchor` and `target_example_pedagogical_quality` evidence. |
| `meaning_language_entries.pronunciation_status` | Качество transcription/pronunciation per language. | Must be `approved`, `generated_checked` or `not_applicable`; IPA rows also need current `pronunciation_accuracy` evidence. |

Importability policy:

| Status/class | Можно в final candidate export | Комментарий |
| --- | --- | --- |
| `approved` | yes | Human-checked. |
| `generated` | no | Raw AI/output; working preview only. |
| `generated_checked` | yes | Real DB status after required AI/source-backed QA gates; still not native-approved. |
| `needs_review` | no | Requires explicit review/decision. |
| `blocked` | no | Must not enter final export. |
| `draft` | no | Not ready. |
| `missing` | no | Export/coverage error. |
| `not_applicable` | pronunciation only | Allowed only for pronunciation fields where transcription/pronunciation status is not applicable. |

`generated_checked` is final-ready only when it has matching usable structured `qa_reviews` evidence. Evidence v1 requires `review_status = generated_checked` or `approved`, exact target identity, `reviewer`, `reviewed_at`, non-empty `check_family`, non-empty `result_summary`, and non-empty `pass_id` or `batch_id`. Text-only `notes` / `issue_type` patterns are not enough. Example translations require semantic preservation, target-example naturalness, lexical-anchor and pedagogical-quality evidence keyed to `set_id::meaning_id::example_id`; IPA pronunciation rows require separate pronunciation-accuracy evidence.

For text-bearing checks, evidence v2 also requires `checked_value_hash`:

- `metadata_review`: current content set, meaning unit, deck membership, context example and localized `Course Metadata` title, description, module, category and level signal;
- `word_selection_quality`: current deck-scoped membership, deck taxonomy/level, English meaning fields, context taxonomy/note and priority/frequency fields;
- `entry_form`: current word/display form, article/marker, gender/number and usage note;
- `transcription_policy`: current `transcription` plus current language transcription policy fields;
- `semantic_preservation`: current translated example plus the current `semantic_scene`;
- `target_example_naturalness`: current translated example plus the current `semantic_scene`, language code and language-specific rule version;
- `target_example_pedagogical_quality`: current translated example plus the current `semantic_scene`, target word/display fields and V3 pedagogical rule version;
- `pronunciation_accuracy`: current native/display word, transcription, romanization system, language code and transcription-policy rule version;
- `transcription_source_backing`: current native/display word, transcription, romanization system, language code, source-backed policy version and reference manifest hash;
- `base_example_alignment`: current English context example plus the current `semantic_scene`;
- `example_quality`: current English context example plus the current `semantic_scene`;
- `manual_review`: current reviewed entry/example value after the manual correction is applied.

If the checked text changes after QA, the stored hash no longer matches and final export must fail until the row is rechecked.

The normal generated-to-checked path is:

```text
generated rows in Postgres
-> scripts/run-ai-qa.mjs --dry-run for review payload only, or optional non-dry provider QA only when agent-owned credentials already exist
-> Codex/model checks the payload and writes outputs/qa/ai_qa_<set_id>_<checked_timestamp>.jsonl
-> scripts/import-ai-qa-results.mjs
-> generated_checked / needs_review statuses with structured qa_reviews
```

Mass AI QA does not set `approved`. RU can become `approved` only through the manual review flow; other languages remain at most `generated_checked` unless a future native/human review process is explicitly added. Dry-run/synthetic pass rows are not usable final evidence. `target_example_naturalness` is a separate generated-to-checked layer from `semantic_preservation`: the first checks natural target-language surface form, the second checks scene preservation.

## Post-final linguistic audit

After a deck already passes final export, run a post-final linguistic audit before the production Google Sheet delivery is considered complete/current final:

```bash
node scripts/export-final-linguistic-audit-batch.mjs <set_id> --languages=all
node scripts/run-final-linguistic-audit.mjs outputs/audit/final_linguistic_audit_<set_id>_<timestamp>_batch.jsonl
node scripts/import-final-linguistic-audit-results.mjs outputs/audit/final_linguistic_audit_<set_id>_<timestamp>_results.jsonl
```

This audit reads Postgres, checks current card-facing `entry`, source-backed entry translation fallback blockers, `example`, target-example naturalness blockers, example/display casing shape, source-backed `transcription`, `semantic_scene`, semantic-scene alignment with the English context example, regional variants and current QA statuses across all 54 active language variants, then writes `outputs/audit/*_results.jsonl` and a summary. Imported evidence uses `qa_reviews.check_family=final_linguistic_audit`, `target_type=export`, `target_key=set_id::meaning_id::language_code`. It does not replace the normal final gates and does not make any language native-approved.

After a clean audit is imported, rerun final export and update the same Google Sheet file id whenever `check-delivery-freshness.mjs` reports that DB/QA changed after export. This is the normal delivery loop: audit evidence changes QA timestamps, so the same-file export/upload/readback/freshness refresh may be required even when no card text changed. It is not a new content generation pass and not a duplicate Google Sheet.

If the audit finds blockers, the current Google Sheet is stale/incomplete until confirmed wrong rows are repaired through a reproducible seed/import, normal QA gates pass again, final export is rebuilt, the same Google Sheet file id is updated and the post-final audit passes.

Final audit status notes:

- Current post-reset `Kitchenware Basics`: rebuilt through the runner and delivered as `FlashcardsLuna 001 of 180 - Kitchenware Basics`; latest current audit/readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Cooking Actions`: rebuilt through the runner and delivered as `FlashcardsLuna 002 of 180 - Cooking Actions`; latest current audit/readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Kitchen Storage & Cleaning`: rebuilt through the runner and delivered as `FlashcardsLuna 003 of 180 - Kitchen Storage & Cleaning`; latest current audit/readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Kitchen Small Tools & Supplies`: rebuilt again after reset on 2026-05-06, retrofitted on 2026-05-13 to 32 cards by explicit Kitchenware meaning reuse and refreshed in place on 2026-05-14 after shared Kitchenware meaning repairs made the prior export stale. Latest audit `outputs/audit/final_linguistic_audit_home_kitchen_small_tools_supplies_a2_20260514_recheck_results_summary.json` reports 1728/1728 pass rows after full QA/export/readback/audit/freshness.
- Current post-reset `Bathroom Essentials`: latest audit `outputs/audit/final_linguistic_audit_home_bathroom_essentials_a1_example_surface_repair_20260527_results_summary.json` reports 1890/1890 pass rows after the 2026-05-27 `example_surface_grammar` repair/evidence refresh and final same-file Sheet refresh.
- Current post-reset `Bedroom Basics`: rebuilt through the runner and delivered as `FlashcardsLuna 006 of 180 - Bedroom Basics`; latest current audit/readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Living Room Basics`: rebuilt through the runner and delivered as `FlashcardsLuna 007 of 180 - Living Room Basics`; latest audit `outputs/audit/final_linguistic_audit_home_living_room_basics_a1_20260508T055527Z_results_summary.json` reports 1620/1620 pass rows and latest readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Dining Room & Table Setup`: rebuilt through the runner and delivered as `FlashcardsLuna 008 of 180 - Dining Room & Table Setup`, retrofitted on 2026-05-13 to 40 cards by explicit Kitchenware meaning reuse and refreshed in place on 2026-05-14 after shared Kitchenware meaning repairs made the prior export stale; latest audit `outputs/audit/final_linguistic_audit_home_dining_room_table_setup_a1_a2_20260514_recheck_results_summary.json` reports 2160/2160 pass rows and latest readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Entryway & Outerwear`: rebuilt through the runner and delivered as `FlashcardsLuna 009 of 180 - Entryway & Outerwear`; latest audit `outputs/audit/final_linguistic_audit_home_entryway_outerwear_a1_20260512T090926Z_results_summary.json` reports 1890/1890 pass rows and latest readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Furniture Basics`: rebuilt through the runner and delivered as `FlashcardsLuna 010 of 180 - Furniture Basics`; latest audit `outputs/audit/final_linguistic_audit_home_furniture_basics_a1_20260513T071720Z_results_summary.json` reports 1620/1620 pass rows and latest readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Laundry & Cleaning Basics`: rebuilt through the runner and delivered as `FlashcardsLuna 011 of 180 - Laundry & Cleaning Basics`; latest audit `outputs/audit/final_linguistic_audit_home_laundry_cleaning_basics_a1_a2_example_surface_repair_20260527_results_summary.json` reports 1890/1890 pass rows after the 2026-05-27 `example_surface_grammar` repair/evidence refresh and latest readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Home Office & Desk`: rebuilt through the runner and delivered as `FlashcardsLuna 012 of 180 - Home Office & Desk`; latest audit `outputs/audit/final_linguistic_audit_home_office_desk_a1_a2_example_surface_repair_20260527_results_summary.json` reports 1890/1890 pass rows after the 2026-05-27 `example_surface_grammar` repair/evidence refresh, sample audit `outputs/qa/sample_card_quality_audit_home_office_desk_a1_a2_6_per_language_after_location_aliases_v2_20260514.json` reports 324/324 sampled rows with 0 blockers/0 warnings, release-readiness reports 0 blockers/0 warnings and latest readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Home Structure & Exterior`: rebuilt through the runner and delivered as `FlashcardsLuna 013 of 180 - Home Structure & Exterior`; latest current audit/readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Apartment Building & Common Areas`: rebuilt through the runner and delivered as `FlashcardsLuna 014 of 180 - Apartment Building & Common Areas`; latest current audit/readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Outdoor Home & Garden`: rebuilt through the runner and delivered as `FlashcardsLuna 015 of 180 - Outdoor Home & Garden`; latest current audit/readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Numbers & Counting`: rebuilt through the runner and delivered as `FlashcardsLuna 016 of 180 - Numbers & Counting`; latest audit `outputs/audit/final_linguistic_audit_core_numbers_counting_a1_20260517T093039Z_results_summary.json` reports 2376/2376 pass rows and latest readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Colors & Shapes`: rebuilt through the runner and delivered as `FlashcardsLuna 017 of 180 - Colors & Shapes`; latest current audit/readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Pronouns & People Basics`: rebuilt through the runner and delivered as `FlashcardsLuna 018 of 180 - Pronouns & People Basics`; latest current audit/readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Question Words`: rebuilt through the runner and delivered as `FlashcardsLuna 019 of 180 - Question Words`; latest audit `outputs/audit/final_linguistic_audit_core_question_words_a1_20260519T141025Z_results_summary.json` reports 972/972 pass rows and latest readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Basic Verbs`: rebuilt through the runner and delivered as `FlashcardsLuna 020 of 180 - Basic Verbs`; latest audit `outputs/audit/final_linguistic_audit_core_basic_verbs_a1_a2_20260519T193215Z_results_summary.json` reports 1944/1944 pass rows and latest readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Practical Action Verbs`: rebuilt through the runner and delivered as `FlashcardsLuna 021 of 180 - Practical Action Verbs`; latest current audit/readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Time & Days`: rebuilt through the runner and delivered as `FlashcardsLuna 022 of 180 - Time & Days`; latest current audit/readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Learning Help Words`: rebuilt through the runner and delivered as `FlashcardsLuna 023 of 180 - Learning Help Words`; latest current audit/readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Park & Playground`: rebuilt through the runner and delivered as `FlashcardsLuna 024 of 180 - Park & Playground`; latest audit `outputs/audit/final_linguistic_audit_park_playground_a1_a2_20260521T160644Z_results_summary.json` reports 1944/1944 pass rows and latest readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Food Basics`: rebuilt through the runner and delivered as `FlashcardsLuna 025 of 180 - Food Basics`; latest audit `outputs/audit/final_linguistic_audit_food_basics_a1_20260524T032956Z_results_summary.json` reports 1944/1944 pass rows and latest readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Fruit Basics`: rebuilt through the runner and delivered as `FlashcardsLuna 026 of 180 - Fruit Basics`; latest audit `outputs/audit/final_linguistic_audit_food_fruit_basics_a1_20260524T131622Z_results_summary.json` reports 1512/1512 pass rows and latest readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Meals & Taste`: rebuilt through the runner and delivered as `FlashcardsLuna 028 of 180 - Meals & Taste`; latest audit `outputs/audit/final_linguistic_audit_food_meals_taste_a1_a2_20260526T043952Z_results_summary.json` reports 1944/1944 pass rows and latest readback/freshness evidence is delivery-current in the Google Sheet manifest.
- Current post-reset `Drink Basics`: rebuilt through the runner and delivered as `FlashcardsLuna 029 of 180 - Drink Basics`; latest audit `outputs/audit/final_linguistic_audit_food_drink_basics_a1_20260526T151111Z_results_summary.json` reports 1728/1728 pass rows and latest readback/freshness evidence is delivery-current in the Google Sheet manifest.

Current post-reset delivery status on 2026-06-08: current generated coverage exists only for decks deliberately rebuilt/imported from the clean DB and verified through final export, Google Sheet upload/readback, post-final audit and delivery freshness. Current ordinary generated coverage is Sort 1-36: `Kitchenware Basics`, `Cooking Actions`, `Kitchen Storage & Cleaning`, `Kitchen Small Tools & Supplies`, `Bathroom Essentials`, `Bedroom Basics`, `Living Room Basics`, `Dining Room & Table Setup`, `Entryway & Outerwear`, `Furniture Basics`, `Laundry & Cleaning Basics`, `Home Office & Desk`, `Home Structure & Exterior`, `Apartment Building & Common Areas`, `Outdoor Home & Garden`, `Numbers & Counting`, `Colors & Shapes`, `Pronouns & People Basics`, `Question Words`, `Basic Verbs`, `Practical Action Verbs`, `Time & Days`, `Learning Help Words`, `Park & Playground`, `Food Basics`, `Fruit Basics`, `Meat, Fish & Dairy`, `Meals & Taste`, `Drink Basics`, `Coffee & Espresso Drinks`, `Tea & Hot Drinks`, `Juices, Smoothies & Cold Drinks`, `Cafe Drink Options`, `Fast Food Basics`, `Sauces & Extras` and `Takeaway & Dine-In Words`; pre-reset Google Sheets remain historical unless a row explicitly says it was rebuilt post-reset. Latest ordinary delivery: Sort 36 `Takeaway & Dine-In Words`, 32 cards x 54 languages, Google Sheet `1xLrGIFHcA_OIDqBBoehrNw0Zz9liFSiyqp1u0S1n27Y`, workbook sha256 `df6fbdb69b1215349da61401d8549a57c21329fab5cf44bff799c40088466668`, final audit `outputs/audit/final_linguistic_audit_food_takeaway_dine_in_words_a2_20260608T132433Z_results_summary.json` has 1,728/1,728 pass rows, readback and delivery freshness pass. Post-delivery 5-per-language sample audit found and repaired one confirmed KA example typo; the same Sheet was updated in place.

Repair delivery note on 2026-05-08: Kitchenware and Bedroom were refreshed after confirmed transcription/example/metadata repairs. The same Google Sheet file ids were updated in place, readback passed, post-final audit was imported, second export/upload refreshed the manifests after audit evidence, and `check-delivery-freshness` passed for both. The seven current generated ordinary decks then passed `check-release-readiness --current-generated` with 0 blockers and 0 warnings.

Dependent refresh note on 2026-05-14: after the current Kitchenware repair changed shared/reused meanings, `Kitchen Small Tools & Supplies` and `Dining Room & Table Setup` were no longer delivery-fresh even though their content still passed QA. Both decks were re-exported, the same Google Sheet file ids were updated in place, readback passed, post-final audits were reimported, the workbooks were re-exported/reuploaded after audit evidence changed, and `check-delivery-freshness` plus `check-release-readiness --current-generated` passed for all 12 then-current generated ordinary decks with 0 blockers and 0 warnings.

Sort 14 delivery note on 2026-05-15: `Apartment Building & Common Areas` (`home_apartment_common_areas_a2`) was generated through `scripts/run-deck-production.mjs` and delivered as new Google Sheet `FlashcardsLuna 014 of 180 - Apartment Building & Common Areas` / `1PVEyJf5va6g7iQ8PrcxW0jSDS7FAYtSvRK8433SUneg` in Drive folder `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`. Final export, readback, post-final audit 1890/1890, post-audit re-export/reupload and `check-delivery-freshness` all pass. Non-RU language rows remain at most `generated_checked`.

TL translation repair delivery status on 2026-05-01: `outputs/qa/tl_entry_source_backed_translation_initial_20260501.json` found 39 TL entry/display fallback blockers across the five generated decks. Confirmed rows were repaired through current-value-locked entry/transcription/example imports under `outputs/import/tl-translation-repair-20260501/`, accepted Filipino household loans were locked in `reference-sources/manual-decisions/entry-source-decisions.jsonl`, and a second-pass review converted weak Kitchenware `mug`/`chopsticks` loan decisions into repairs (`saro`, `sipit ng Intsik`). `outputs/qa/tl_entry_source_backed_translation_final_20260501.json` now has 0 TL blockers. Final exports were rebuilt after audit evidence import, the same five Google Sheet file ids were updated in place, readback passed, post-final audit summaries `outputs/audit/final_linguistic_audit_*_tl_repair_20260501_results_summary.json` have 0 `needs_review`/`fail`, and `check-delivery-freshness` passes for all five generated decks.

All-language native-copy translation status on 2026-05-01: `scripts/check-entry-source-backed-translations.mjs --all-languages` is now part of final delivery, not a TL-only gate. The earlier report `outputs/qa/entry_source_backed_translation_all_language_report_20260501.json` had 38 non-TL warnings across `ID`, `MS`, `TR`, `AZ`, `FI`, `IT`, `SW`, `CS`, `HR`, `HU`, `SK` and `VI`; the source-review pass resolved them with 32 keep/decision-lock rows, source-backed acceptance of AZ `spatula`, and 5 current-value-locked repairs. The final report `outputs/qa/entry_source_backed_translation_all_language_final_20260501.json` has 0 blockers and 0 warnings across all five generated decks. Do not repair future rows by English-token heuristics alone: keep rows require current-value-locked source decisions, and repair rows require current-value-locked entry/transcription/example imports.

Translation source coverage historical status on 2026-05-01: `scripts/check-translation-source-coverage.mjs` adds a broader report/gate on top of the fallback checker. The first report-only baseline `outputs/qa/translation_source_coverage_all_generated_report_20260501.json` checked the five pre-reset generated decks: 9126 rows, 0 blockers, 8745 `source_partial`, 338 `not_checkable`, 43 `loan_decision`. This is not a claim that every translation has exact dictionary proof; it is historical regression evidence for the hard blocker classes implemented by v1.

## Structured imports for new decks

New decks should not be built by hand-writing large SQL seed files. SQL seeds remain for reproducing Pilot 1, but production generation after Pilot 1 should enter Postgres through structured import scripts:

```bash
node scripts/import-deck-base-data.mjs <deck-base.csv|jsonl> --dry-run
node scripts/import-deck-base-data.mjs <deck-base.csv|jsonl>

node scripts/import-language-batch.mjs <language-batch.csv|jsonl> --dry-run
node scripts/import-language-batch.mjs <language-batch.csv|jsonl>
```

`import-deck-base-data.mjs` creates/updates the deck, `meaning_units`, set memberships, EN entries and EN context examples with raw `generated` statuses. It refuses conflicting `meaning_id` reuse when the existing meaning fingerprint differs.

`import-language-batch.mjs` imports translations/examples/transcriptions for at most 3 active language codes at a time. It also preserves optional pronunciation helper fields such as `romanization`, `romanization_system`, `pronunciation_ipa` and `learner_pronunciation`, because tone-aware `TH` / `LO` / `MY` checks depend on the current romanization policy. Imported rows stay raw `generated` until QA evidence is imported. If a language is already final-ready for the deck, the script blocks it unless `--repair-language=<code>` is used for an intentional repair. Preflight now also runs `check-language-batch-source-preflight`, writes `outputs/source-preflight/*_import_*.json`, rejects source/shape/script/fallback blockers, rejects number-heavy/high-risk multi-language batches, rejects obvious draft example scene drift including target-language meta-templates that agree with each other but not with the English canonical scene, rejects high-risk batches where 60%+ comparable rows have identical transcriptions or identical Latin entry/display surfaces across all batch languages, blocks script/language identity errors, article/gender/marker hard mismatches and obvious semantic-granularity collapse, and prints source/tool/sibling-copy warnings as review artifacts. `--require-warning-decisions`, `SOURCE_PREFLIGHT_REQUIRE_WARNING_DECISIONS=1`, or automatic high-risk/number-heavy profiling blocks import when actionable preflight warnings lack current-value warning decisions.

Final export validates global statuses too:

- `content_sets.quality_status`;
- `content_sets.selection_status` must be `approved`;
- `content_set_localizations.quality_status`;
- `meaning_units.quality_status`;
- `meaning_set_memberships.quality_status`.

Перед выдачей пользователю тематического набора нужно минимум:

- проверить дубли `meaning_id`;
- проверить, что лист соответствует taxonomy;
- проверить, что примеры не расходятся с `semantic_scene`;
- проверить, что `transcription` заполнена по единой policy для каждого языка;
- проверить, что спорные языки имеют `needs_review`, если сама транскрипция требует дополнительной проверки.

`transcription` в deliverable является вспомогательной подсказкой к слову. Текущий карточный delivery не добавляет audio и не требует audio-источников: проверяется именно текстовое поле `transcription` для перевода. Поэтому export/QA блокирует пустые, неверные и вводящие в заблуждение транскрипции, но не должен стопорить карточку из-за допустимых minor variants practical romanization/transliteration, если есть structured QA evidence и слово остается понятным.

Каждый workbook должен иметь служебный лист:

```text
_qa_status
```

Минимально он должен показывать:

- export mode: `working` или `final`;
- final readiness;
- количество строк;
- количество активных языковых вариантов;
- по каждому языку: missing words, missing examples, missing transcriptions;
- агрегированные `quality_status` / `pronunciation_status`, если они доступны.
- status issues that block final readiness.

Если `_qa_status` показывает missing values или non-final statuses, файл считается working preview, а не final export.

## Scope Boundary

Для текущей работы достаточно spreadsheet contract v1 выше: он нужен только для генерации карточек, QA gating и выдачи готового файла пользователю.
