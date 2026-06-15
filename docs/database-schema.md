# Database Schema

Этот документ является source of truth по рабочей Postgres-схеме LunaCards.

Статус: Gate 1 schema v0 подготовлена и применена к локальному Docker/Postgres runtime.

Current data state after 2026-05-02 reset: local Postgres keeps schema/migrations and the 54-row `languages` reference table; ordinary generated deck state is tracked in [docs/README.md](README.md). The reset backup is `outputs/db/lunacards_before_reset_20260502T211450_0700.sql`. Do not run old pilot seeds as the source for a new clean-start deck unless the user explicitly chooses to restore historical content. Course-specific contours such as HSK Classic, HSK 3.0, Oxford and Spanish A1 may additionally store rows in dedicated tables (`hsk_classic_*`, `hsk3_*`, `oxford_vocabulary_*`, `spanish_a1_*`) without creating ordinary deck-card rows.

## Файлы схемы

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
db/migrations/028_qa_reviews_latest_lookup_index.sql
db/migrations/029_general_metadata_hash_reapply.sql
db/migrations/030_hsk3_release_items.sql
db/migrations/031_hsk3_manual_target_source_kind.sql
db/migrations/032_spanish_a1_release_items.sql
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
.env.example
scripts/db-apply.sh
scripts/db-dump.sh
scripts/db-restore.sh
scripts/oxford/import-oxford-a1-to-db.mjs
scripts/spanish-a1/import-spanish-a1-to-db.mjs
scripts/db-check-pilot.sh
scripts/db-check-pilot-ru.sh
scripts/db-qa-set.sh
scripts/db-qa-pilot.sh
scripts/check-deck-ready.mjs
scripts/check-qa-evidence.mjs
scripts/check-transcription-policy-shape.mjs
scripts/check-transcription-fallbacks.mjs
scripts/check-transcription-cross-language-fallbacks.mjs
scripts/check-entry-cross-language-fallbacks.mjs
scripts/check-script-language-identity.mjs
scripts/check-sibling-language-copy.mjs
scripts/check-meaning-contrast.mjs
scripts/check-base-example-naturalness.mjs
scripts/check-example-template-diversity.mjs
scripts/check-semantic-granularity.mjs
scripts/check-target-example-lexical-anchor.mjs
scripts/check-article-gender-marker-consistency.mjs
scripts/check-qa-hash-coverage.mjs
scripts/check-delivery-freshness.mjs
scripts/run-ai-qa.mjs
scripts/import-ai-qa-results.mjs
scripts/import-example-translations.mjs
scripts/import-transcription-repair.mjs
scripts/import-entry-repair.mjs
scripts/import-base-example-repair.mjs
scripts/generate-meaning-reuse-plan.mjs
scripts/import-deck-base-data.mjs
scripts/import-language-batch.mjs
scripts/export-semantic-qa-batch.mjs
scripts/import-semantic-qa-results.mjs
scripts/export-review-decisions-template.mjs
scripts/import-review-decisions.mjs
scripts/export-pilot-ru-review.mjs
scripts/export-final-linguistic-audit-batch.mjs
scripts/run-final-linguistic-audit.mjs
scripts/import-final-linguistic-audit-results.mjs
scripts/check-semantic-scene-alignment.mjs
scripts/export-flashcards-working-sheet.mjs
```

`001_initial_schema.sql` создает рабочую нормализованную схему. `001_languages.sql` заполняет 54 активных языковых варианта и фиксирует текущую политику кодов/транскрипции на уровне базы.

`002_official_cefr_levels.sql` переводит старые pilot-значения `A0` в `A1` и ограничивает поля уровня официальной CEFR-шкалой `A1`, `A2`, `B1`, `B2`, `C1`, `C2`.

`003_content_priority_band.sql` добавляет `priority_band` для карточных meaning units. Текущий production/export использует только vocabulary/card meaning units.

`004_single_display_transcription.sql` добавляет единое card-facing поле `transcription` в языковые таблицы. В финальный Google Sheets export уходит именно оно; `romanization` и `pronunciation_ipa` остаются служебными полями для генерации и QA.

`005_content_set_deck_metadata.sql` добавляет поля колоды к `content_sets`: `slug`, `roadmap_stage`, `learning_goal`, `next_recommended_set_ids`, `selection_status`, `sheet_contract_version`. Эти поля уходят в `Deck Metadata` при Google Sheets export.

`006_content_set_level_label.sql` добавляет обязательную шкалу `level_label` к `content_sets`. CEFR остается в `level_min` / `level_max`, а `level_label` принимает одно из значений: `Basic`, `Elementary`, `Pre-Intermediate`, `Intermediate`, `Upper-Intermediate`, `Advanced`, `Proficiency`.

`007_content_set_localizations.sql` создает `content_set_localizations` - source of truth для localized `Course Metadata` (`Title` / `Description`) на всех активных языковых вариантах. `Title` ограничен 25 символами, `Description` - 60 символами. Уровень колоды хранится структурно в `content_sets.level_label`; localized `Description` дополнительно содержит человеко-понятный level-сигнал.

`008_generated_checked_and_level_signal.sql` добавляет DB-backed `level_signal` в `content_set_localizations` и расширяет status constraints: `generated_checked` становится реальным статусом для content/review/export fields. Pronunciation status fields также допускают `not_applicable`.

`009_structured_qa_evidence.sql` расширяет `qa_reviews` structured evidence fields: `pass_id`, `batch_id`, `check_family`, `result_summary`, `source_note`, `evidence jsonb`. Для `review_status in ('approved', 'generated_checked')` constraint требует непустые `reviewer`, `reviewed_at`, `check_family`, `result_summary` и хотя бы один `pass_id` / `batch_id`.

`010_language_spreadsheet_code.sql` переименовывает старое поле `languages.site_code` в `languages.spreadsheet_code` в уже существующих локальных базах. В актуальной схеме используется только `spreadsheet_code`.

`011_vocabulary_only_contract.sql` закрепляет текущий scope проекта на уровне constraints: активные наборы и export items могут быть только vocabulary/core-foundation карточками, без non-vocabulary content types.

`012_deck_generation_runs.sql` добавляет runtime-lock таблицу `deck_generation_runs` для безопасных параллельных запусков разных колод. Это не контентный batch и не planning status: таблица отвечает только на вопрос "какая колода уже забрана worker-ом сейчас". Уникальный partial index запрещает второй active `running` run для того же `set_id`; DB constraint дополнительно запрещает `language_batch` больше 3 языков.

`013_checked_value_hash.sql` добавляет `qa_reviews.checked_value_hash` and function `qa_checked_value_hash(...)`. Для text-bearing and deck-scoped QA checks (`metadata_review`, `word_selection_quality`, `entry_form`, `transcription_policy`, `semantic_preservation`, `base_example_alignment`, `example_quality`, `manual_review`) final gates compare stored hash with the current Postgres value and block stale evidence after edits.

`014_example_quality_hash.sql` extends `qa_checked_value_hash(...)` for `example_quality` evidence on English context examples. The hash covers the current `canonical_example_en` and `semantic_scene`, so final export blocks stale example-quality evidence after an English example repair.

`015_word_selection_quality_hash.sql` extends `qa_checked_value_hash(...)` for `word_selection_quality` evidence on deck-scoped set memberships. The hash covers `set_id::meaning_id`, deck taxonomy/level fields, membership context fields and English meaning selection fields, so final export blocks stale selection evidence after scope, level, POS, meaning note or priority changes. The same function also hashes `romanization_system` for `transcription_policy`, so changing a learner romanization policy requires refreshed evidence.

`016_tone_aware_transcription_policy.sql` updates tone/register languages to the current learner-facing policy: `VI` native orthography with tone marks, `TH` Paiboon-style learner romanization with tone diacritics, `LO` Vientiane-based learner romanization with tone diacritics and `MY` practical romanization with tone/register notation.

`017_target_example_naturalness_hash.sql` extends `qa_checked_value_hash(...)` for `target_example_naturalness` evidence on translated examples. The hash covers the current `example_text`, current `semantic_scene`, DB language code and `language-specific-rules-v1-target-example-naturalness` rule version, so final export blocks stale naturalness evidence after example, scene or rule-version changes.

`018_regional_variant_quality_hash.sql` extends `qa_checked_value_hash(...)` for `regional_variant_quality` evidence on regional-risk translated examples. The hash covers the current regional entry/display form, example text, current `semantic_scene`, DB language code and `language-specific-rules-v1-regional-variant-quality` rule version, so final export blocks stale regional evidence after entry, example, scene or rule-version changes.

`019_v2_quality_hashes.sql` is the canonical checked-hash definition for V2/V3 quality layers: `entry_form_register`, `semantic_granularity`, `article_gender_marker_consistency`, `target_example_lexical_anchor`, `pronunciation_accuracy`, `target_example_pedagogical_quality`, `transcription_source_backing` and `number_example_grammar`. The hash covers current entry/display/article/gender fields, transcription/romanization policy fields, meaning context, current example text, `semantic_scene` and rule-version strings so old auxiliary evidence becomes stale after relevant repairs.

`020_v3_quality_hashes.sql` re-applies the canonical `qa_checked_value_hash(...)` definition after V3 gates are installed. It exists so incremental databases and fresh databases get the same hash behavior for pronunciation accuracy and pedagogical example quality.

`021_transcription_source_backing_hash.sql` re-applies the canonical checked-hash definition after source-backed transcription evidence is installed.

`022_number_example_grammar_hash.sql` re-applies the canonical checked-hash definition after the number-example grammar evidence family is installed. This makes `qa_reviews.check_family='number_example_grammar'` stale when target example text, current EN example, scene slots, entry/display form or rule-version inputs change.

`023_course_metadata_module_category.sql` adds localized `module` and `category` fields to `content_set_localizations` for mobile-app import. These are short user-facing labels for deck-level domain/area, not the long technical `content_sets.category`.

`024_course_metadata_module_category_hash_reapply.sql` re-applies the V2 checked-hash definition after `module` and `category` are added. It is retained for migration history, but newer databases must also apply `029_general_metadata_hash_reapply.sql` so final-readiness metadata/manual-review hash support stays complete.

`025_hsk_classic_source_items.sql` adds the HSK Classic Chinese source layer table `hsk_classic_source_items`. This table is separate from ordinary deck tables such as `meaning_units`, `meaning_language_entries` and `meaning_examples`: it stores the fixed Chinese HSK source row for a release (`simplified`, `traditional`, pinyin, Chinese example, example pinyin, English pivot/example, source snapshot payload and content hash). HSK source rows are imported by `scripts/hsk/import-classic-hsk-source-to-db.mjs`; target-language HSK workbook translations are not imported into ordinary deck cards by this migration.

`026_hsk_classic_translation_items.sql` adds the HSK Classic target-language translation table `hsk_classic_translation_items`. It stores one row per `(release_id, hsk_order, spreadsheet_code)` with the HSK word translation, translated example, source pack metadata and content hash. It references `hsk_classic_source_items`, explicitly excludes `ZH` target rows, and deliberately does not reference ordinary deck-card tables.

`027_oxford_vocabulary_isolation.sql` adds the Oxford source-package DB isolation layer: `oxford_vocabulary_source_items`, `oxford_vocabulary_edition_items`, `oxford_vocabulary_support_items` and `oxford_vocabulary_db_import_runs`. These tables are separate from ordinary deck-card tables such as `content_sets`, `meaning_units`, `meaning_language_entries`, `meaning_examples`, `exports` and `export_items`. The only non-Oxford foreign key is `oxford_vocabulary_support_items.db_code -> languages(code)` for reference-code validation. Current Oxford A1 import is handled by `scripts/oxford/import-oxford-a1-to-db.mjs`, which checks readback hashes, idempotency and that ordinary deck tables contain zero `oxford_*` rows.

`028_qa_reviews_latest_lookup_index.sql` adds partial indexes for latest-review lookup by target/check family. It is a performance migration for fail-closed QA gates on decks with many refreshed evidence rows and does not change QA semantics.

`029_general_metadata_hash_reapply.sql` re-applies the canonical checked-value hash function from `023_course_metadata_module_category.sql` after `024` has re-applied the older V2 function. This keeps final-readiness evidence usable for deck-level `content_set` metadata, `meaning_unit` metadata and `manual_review` evidence when `generated_checked` statuses require current `checked_value_hash` support.

`030_hsk3_release_items.sql` adds the HSK 3.0 DB isolation layer: `hsk3_source_items` and `hsk3_translation_items`. These tables are separate from HSK Classic, Oxford and ordinary deck-card tables. `hsk3_source_items` stores the fixed official HSK 3.0 Chinese source row, Chinese example/pinyin, English pivot fields, source snapshot payload and content hash. `hsk3_translation_items` stores one row per `(release_id, hsk_order, spreadsheet_code)` with current workbook word/example values, source-kind metadata and content hash; blank manual HSK3.0 target-language cells are represented explicitly as `pending_hsk3_manual` instead of being promoted to ready translations. Current HSK3.0 Level 1/2/3 imports are handled by `scripts/hsk/import-hsk3-level1-to-db.mjs`, `scripts/hsk/import-hsk3-level2-to-db.mjs` and `scripts/hsk/import-hsk3-level3-to-db.mjs`.

`031_hsk3_manual_target_source_kind.sql` updates the isolated HSK3 translation source-kind constraint to allow `hsk3_manual_target` for HSK3-only target-language translations. During partial language-batch work, a row can stay row-level `chinese_layer_ready_target_translation_pending` while individual filled target cells are imported as `hsk3_manual_target`; still-blank target cells remain `pending_hsk3_manual`. This remains separate from `classic_reuse_target`, HSK Classic tables, Oxford tables and ordinary deck-card tables.

`032_spanish_a1_release_items.sql` adds the Spanish A1 course-prep DB isolation layer: `spanish_a1_source_items`, `spanish_a1_support_items` and `spanish_a1_db_import_runs`. These tables are separate from ordinary deck-card tables and from Oxford/HSK course tables. `spanish_a1_source_items` stores the reviewed 300 Spanish source rows, ES/ES-419 display/example/transcription fields, source row payload and content hash. `spanish_a1_support_items` is reserved for final support-language display/example translations after all 52 support batches pass gates; it explicitly excludes `ES` and `ES-419`. Current source-only storage is handled by `scripts/spanish-a1/import-spanish-a1-to-db.mjs --source-only`, which applies the migration, imports 300 source rows, writes no support rows, checks readback hashes and verifies zero ordinary-table leaks. Final import without `--source-only` remains fail-closed until all 15,600 support rows are present.

`031_pilot_home_kitchen_cookware_tone_transcription_repair.sql` is the reproducible Pilot 1 repair seed for the current tone-aware policy. It updates only `ES-419`, `TH`, `LO`, `MY` transcription-facing fields, refreshes `transcription_policy` checked hashes and adds repair evidence for the current final workbook.

`032_pilot_home_kitchen_cookware_final_linguistic_audit.sql` records reproducible post-final audit evidence for Pilot 1 after the current final workbook passed a deterministic audit across all 54 active language variants. This is not native-speaker approval and does not promote any row to `approved`.

`docker-compose.yml` поднимает локальный Postgres на порту `55433`, чтобы не конфликтовать с другими проектами на стандартном `5432` и уже занятыми локальными портами.

`scripts/db-apply.sh` применяет schema+seed и проверяет, что в `languages` ровно 54 активных языковых варианта.

`scripts/db-dump.sh` создает plain SQL dump текущей Postgres-базы внутри `outputs/db/` для переноса точного рабочего состояния в cloud/runtime backup.

`scripts/db-restore.sh <dump.sql>` применяет plain SQL dump к `DATABASE_URL`. Скрипт не делает destructive reset/drop; восстановление рассчитано на пустую или заранее подготовленную базу.

`scripts/db-check-pilot.sh` проверяет текущий pilot-набор `home_kitchen_cookware_pilot_01`.

`003_pilot_home_kitchen_cookware_ru.sql` добавляет первый целевой языковой слой для pilot-набора: Russian `meaning_language_entries`, Russian `meaning_example_translations`, card-facing `transcription` и batch records.

`004_pilot_home_kitchen_cookware_en_ipa.sql` заполняет `EN transcription` / `pronunciation_ipa` для 50 English (US) entries в pilot-наборе. Сам seed пишет raw/generated pronunciation layer; текущий EN QA import повышает EN entries/examples/transcriptions до `generated_checked` with structured evidence.

`006_pilot_home_kitchen_cookware_es_fr_zh.sql` добавляет первый маленький многоязычный batch: `ES`, `FR`, `ZH` entries, example translations, card-facing transcriptions and batch records. После QA import эти строки получают `generated_checked` evidence; ES pronunciation becomes `not_applicable` because native-orthography transcription repeats display word.

`007_pilot_home_kitchen_cookware_de_it_pt_ja_ko_vi.sql` добавляет второй многоязычный batch максимум на 6 языков: `DE`, `IT`, `PT`, `JA`, `KO`, `VI` entries, example translations, card-facing transcriptions and batch records. После QA import эти строки получают `generated_checked` evidence; IT/VI pronunciation becomes `not_applicable` because native-orthography transcription repeats display word, while DE/PT/JA/KO pronunciation statuses become `generated_checked`.

`008_pilot_home_kitchen_cookware_th_ms_id.sql` добавляет третий многоязычный batch на 3 языка: `TH`, `MS`, `ID` entries, example translations, card-facing transcriptions and batch records. После QA import эти строки получают `generated_checked` evidence; MS/ID pronunciation becomes `not_applicable` because native-orthography transcription repeats display word. TH's historical RTGS transcription is superseded by repair seed `031`, which applies the current tone-aware learner romanization policy.

`009_pilot_home_kitchen_cookware_pl_nl_sv.sql` добавляет четвертый многоязычный batch на 3 языка: `PL`, `NL`, `SV` entries, example translations, card-facing transcriptions and batch records. После QA import эти строки получают `generated_checked` evidence; PL/NL/SV pronunciation statuses are `generated_checked` under IPA policy.

`010_pilot_home_kitchen_cookware_nb_da_fi.sql` добавляет пятый многоязычный batch на 3 языка: `NB`/`NO`, `DA`, `FI` entries, example translations, card-facing transcriptions and batch records. После QA import эти строки получают `generated_checked` evidence; FI pronunciation becomes `not_applicable`, while NB/DA pronunciation statuses become `generated_checked`.

`011_pilot_home_kitchen_cookware_cs_sk_hu.sql` добавляет шестой многоязычный batch на 3 языка: `CS`, `SK`, `HU` entries, example translations, card-facing transcriptions and batch records. После QA import эти строки получают `generated_checked` evidence; CS/SK/HU pronunciation becomes `not_applicable` because native-orthography transcription repeats display word.

`012_pilot_home_kitchen_cookware_ro_bg_hr.sql` добавляет седьмой многоязычный batch на 3 языка: `RO`, `BG`, `HR` entries, example translations, card-facing transcriptions and batch records. После QA import эти строки получают `generated_checked` evidence; RO/HR pronunciation becomes `not_applicable`, while BG pronunciation status becomes `generated_checked` under official Bulgarian streamlined transliteration.

`013_pilot_home_kitchen_cookware_sr_sl_lt.sql` добавляет восьмой многоязычный batch на 3 языка: `SR`, `SL`, `LT` entries, example translations, card-facing transcriptions and batch records. После QA import эти строки получают `generated_checked` evidence; SR/SL/LT pronunciation becomes `not_applicable` because transcription repeats display form under current policy.

`014_pilot_home_kitchen_cookware_lv_et_is.sql` добавляет девятый многоязычный batch на 3 языка: `LV`, `ET`, `IS` entries, example translations, card-facing transcriptions and batch records. После QA import эти строки получают `generated_checked` evidence; LV/ET pronunciation becomes `not_applicable`, while IS pronunciation status becomes `generated_checked` under broad IPA policy.

`015_pilot_home_kitchen_cookware_hi_bn_tl.sql` добавляет десятый многоязычный batch на 3 языка: `HI`, `BN`, `TL` entries, example translations, card-facing transcriptions and batch records. После QA import эти строки получают `generated_checked` evidence; HI/BN pronunciation statuses remain `generated_checked` under ISO 15919 policy, while TL pronunciation becomes `not_applicable`.

`016_pilot_home_kitchen_cookware_my_km_lo.sql` добавляет одиннадцатый многоязычный batch на 3 языка: `MY`, `KM`, `LO` entries, example translations, card-facing transcriptions and batch records. После QA import эти строки получают `generated_checked` evidence under the configured practical romanization policies.

`017_pilot_home_kitchen_cookware_ne_si_ta.sql` добавляет двенадцатый многоязычный batch на 3 языка: `NE`, `SI`, `TA` entries, example translations, card-facing transcriptions and batch records. После QA import эти строки получают `generated_checked` evidence under ISO 15919 policy.

`018_pilot_home_kitchen_cookware_te_kn_ml.sql` добавляет тринадцатый многоязычный batch на 3 языка: `TE`, `KN`, `ML` entries, example translations, card-facing transcriptions and batch records. После QA import эти строки получают `generated_checked` evidence under ISO 15919 policy.

`019_pilot_home_kitchen_cookware_uz_kk_az.sql` добавляет четырнадцатый многоязычный batch на 3 языка: `UZ`, `KK`, `AZ` entries, example translations, card-facing transcriptions and batch records. После QA import эти строки получают `generated_checked` evidence; UZ/AZ pronunciation becomes `not_applicable` because native-orthography transcription repeats display word, while KK transcription status remains `generated_checked` under practical Cyrillic-to-Latin policy.

`020_pilot_home_kitchen_cookware_ka_hy_tr.sql` добавляет пятнадцатый многоязычный batch на 3 языка: `KA`, `HY`, `TR` entries, example translations, card-facing transcriptions and batch records. После QA import эти строки получают `generated_checked` evidence; KA/HY transcription statuses remain `generated_checked` under configured romanization policies, while TR pronunciation becomes `not_applicable` because native-orthography transcription repeats display word.

`021_pilot_home_kitchen_cookware_sw_ptbr_es419.sql` добавляет шестнадцатый многоязычный batch на 3 языка: `SW`, `PT-BR`, `ES-419` entries, example translations, card-facing transcriptions and batch records. После QA import эти строки получают `generated_checked` evidence; SW and ES-419 pronunciation becomes `not_applicable` because native-orthography transcription repeats display word, while PT-BR transcription status remains `generated_checked` under IPA policy.

`022_pilot_home_kitchen_cookware_engb.sql` добавляет хвостовой batch на 1 язык: `EN-GB` entries, example translations, British English IPA transcriptions and batch records. Хвостовой batch разрешен, потому что после 3-language batches остался только один активный языковой вариант. После QA import эти строки получают `generated_checked` evidence.

`023_pilot_home_kitchen_cookware_final_readiness_status.sql` переводит deck/course/meaning/membership/context-example статусы в `generated_checked`, добавляет structured final-readiness `qa_reviews` evidence and sets `content_sets.selection_status = approved` only as composition selected for final spreadsheet export. Это не native/human approval языков.

`024_pilot_home_kitchen_cookware_course_metadata_punctuation.sql` был ранней нормализацией финальной пунктуации `Course Metadata.Description`. Текущий post-reset contract строже: `Course Metadata.Title` и `Description` завершаются локализованным sentence terminator, а `Description` вводит exact `level_signal` отдельным предложением.

`025_pilot_home_kitchen_cookware_base_example_alignment.sql` добавляет отдельное structured QA evidence `base_example_alignment` для 50 English context examples pilot-колоды. Это не заменяет semantic preservation для переводов примеров.

`026_pilot_home_kitchen_cookware_ru_manual_placemat.sql` фиксирует пользовательское ручное решение по RU `placemat`: `подставка под тарелку` and example are `approved`, with `manual_review` evidence.

`027_pilot_home_kitchen_cookware_sync_qa_statuses.sql` синхронизирует Pilot 1 language row statuses from structured QA evidence after all generated language seeds. Это защищает fresh `db-apply.sh` from returning to raw `generated` statuses.

`scripts/db-check-pilot-ru.sh` проверяет покрытие RU-слоя: 50 Russian entries, 50 Russian example translations, заполненные display words, romanization/transcription и отсутствие искусственных артиклей.

`028_pilot_home_kitchen_cookware_checked_value_hash.sql` backfills `checked_value_hash` for existing Pilot 1 structured QA evidence after final content state. Future imports write the hash at import time.

`029_pilot_home_kitchen_cookware_example_quality.sql` adds `example_quality` evidence for Pilot 1 English context examples. This closed the example-quality gate, but does not override later transcription-policy blockers.

`030_pilot_home_kitchen_cookware_word_selection_quality.sql` adds deck-scoped `word_selection_quality` evidence for Pilot 1 active card memberships. This closed the word-selection gate, but does not override later transcription-policy blockers.

`scripts/db-qa-set.sh <set_id>` выполняет generic read-only QA-проверки набора и завершает работу с ошибкой, если failed `ERROR` checks не равны нулю.

`scripts/db-qa-pilot.sh` остается legacy/compatibility entrypoint для pilot-набора; новые команды должны использовать `db-qa-set.sh <set_id>`.

`scripts/check-qa-evidence.mjs` проверяет, что final statuses имеют latest structured `qa_reviews` evidence, translated examples have semantic preservation evidence, context examples have base-example alignment evidence, and latest pass evidence is reflected in target row statuses.

`scripts/check-transcription-policy-shape.mjs <set_id>` is the deterministic transcription shape gate. It blocks final-ready IPA that is not `/.../`, romanization that copies native script, native-orthography rows where transcription does not repeat display word, missing Pinyin tone marks and tone-aware `TH`/`LO`/`MY` rows that fall back to old no-tone/native-script forms.

`scripts/check-transcription-cross-language-fallbacks.mjs <set_id> [<set_id> ...]` is the deterministic deck/batch-level transcription fallback gate. It catches mass pseudo-English romanization collapse across high-risk ISO/transliteration languages; isolated loanword-like overlaps are warnings, not DB blockers.

`scripts/check-ipa-transcription-sanity.mjs <set_id> [<set_id> ...]` is the V3 deterministic IPA sanity gate. It blocks obvious pseudo-IPA such as slash-wrapped display orthography or article words inside `/.../`; exact phonetic correctness still requires `pronunciation_accuracy` evidence.

`scripts/check-target-example-pedagogical-quality.mjs <set_id> [<set_id> ...]` is the V3 deterministic example-pedagogy gate. It blocks hard self-container examples such as `The shower head is in the shower.` while leaving weaker adjacent-location cases as warnings/review artifacts.

`scripts/check-entry-cross-language-fallbacks.mjs <set_id> [<set_id> ...]` is the deterministic deck/batch-level entry/display fallback gate. It catches high-risk non-English rows copied from canonical English and mass identical Latin entry/display surfaces across unrelated high-risk languages.

`scripts/check-script-language-identity.mjs <set_id> [<set_id> ...]` is the deterministic language-code/script identity gate. It blocks `MY` as Malay instead of Burmese/Myanmar and obvious Latin fallback in non-Latin display-script rows.

`scripts/check-sibling-language-copy.mjs <set_id> [<set_id> ...]` records warning/review artifacts for suspicious copying between sibling or regional language pairs. V1 warnings do not block final export by themselves.

`scripts/check-meaning-contrast.mjs <set_id> [<set_id> ...]` blocks distinct meanings in a deck/language when both display and example collapse to identical text; display-only collisions are warnings for nearby meanings.

`scripts/check-semantic-granularity.mjs <set_id> [<set_id> ...]` checks for too-broad or too-narrow entry forms against nearby meanings in the same deck.

`scripts/check-article-gender-marker-consistency.mjs <set_id> [<set_id> ...]` checks agreement between display word and article/gender/number/marker fields.

`scripts/check-base-example-naturalness.mjs <set_id> [<set_id> ...]` blocks English context examples that are too templated, generic or tautological to serve as multilingual anchors.

`scripts/check-example-template-diversity.mjs <set_id> [<set_id> ...]` checks deck-level repetition of example templates.

`scripts/check-target-example-lexical-anchor.mjs <set_id> [<set_id> ...]` checks that translated examples visibly anchor the target lexical item or a plausible inflected/variant form.

`scripts/check-qa-hash-coverage.mjs <set_id>` verifies that `qa_checked_value_hash(...)` supports all required text-bearing check families, including new evidence families. Migrations `021_transcription_source_backing_hash.sql` and `022_number_example_grammar_hash.sql` re-apply the canonical hash function with `transcription_source_backing` and `number_example_grammar` support.

`scripts/check-delivery-freshness.mjs <set_id>` verifies that the current final workbook hash, manifest source hash and Google Sheet uploaded workbook hash still match the current Postgres final export after repairs, QA imports or audit imports.

`scripts/sync-qa-statuses-from-evidence.mjs` repairs QA evidence/status drift for active deck rows. It promotes only to `generated_checked` / `not_applicable`, demotes latest non-pass to `needs_review`, and does not mass-promote `approved`. For base English reviews on `content_set` and `meaning_example` targets, legacy empty `language_code` evidence is normalized as `EN` when selecting the latest review so an older empty-language pass cannot demote a newer fresh `EN` pass.

`scripts/run-ai-qa.mjs` и `scripts/import-ai-qa-results.mjs` образуют основной исполняемый AI QA контур после генерации: word selection, base-example alignment, English example quality, semantic preservation, target-example naturalness, entry form, transcription policy and regional variant quality where applicable. `scripts/export-semantic-qa-batch.mjs` и `scripts/import-semantic-qa-results.mjs` остаются узким semantic-only контуром.

`scripts/import-example-translations.mjs` is an official narrow repair helper for example-only overwrites. It uses allowed `generation_batches.batch_type='translation'`, writes exact semantic-preservation `qa_reviews` evidence and checked hashes, and must not be fed by stale failed language-batch artifacts.

`scripts/check-number-example-grammar.mjs <set_id> [--write-evidence] [--out=path]` is the deterministic number/quantity example grammar gate. It checks target examples for current scene-preservation proof, number + noun agreement, classifier/counter/linker requirements and script consistency, then can write `qa_reviews.check_family='number_example_grammar'` evidence keyed to `set_id::meaning_id::example_id` and language code.

`scripts/import-transcription-repair.mjs` is an official narrow repair helper for transcription-only overwrites. It updates only `transcription` and optional `romanization_system`, requires source-backed repair metadata with `deterministic` or `source_exact` confidence, writes `transcription_source_backing` evidence, and requires fresh `transcription_policy` / `pronunciation_accuracy` evidence where applicable before final export.

`scripts/import-entry-repair.mjs` is an official narrow repair helper for entry/display-only overwrites. It updates only `native_word`, `word_with_article_or_marker`, article/gender/marker fields and resets entry quality to raw `generated`; examples and transcription are not changed.

`scripts/import-base-example-repair.mjs` is an official narrow repair helper for English context example and `semantic_scene` overwrites. It writes a translation batch record, updates the EN example translation, resets affected example/translation statuses to raw `generated`, and relies on fresh QA evidence/hashes before final export.

`scripts/import-deck-base-data.mjs` imports structured base deck rows into Postgres without hand-written SQL seeds. It creates/updates deck metadata, meaning units, set memberships, EN entries and EN context examples as raw `generated` data, and blocks conflicting `meaning_id` reuse when the fingerprint differs.

`scripts/import-language-batch.mjs` imports language entries/examples/transcriptions for at most 3 active language variants per batch. Imported rows stay raw `generated` until QA; already final-ready languages are blocked unless `--repair-language=<code>` is used. Its preflight also rejects high-risk 3-language batches where most comparable transcription rows or Latin entry/display surfaces are identical across all batch languages, and prints sibling-copy warnings as review artifacts.

`scripts/generate-meaning-reuse-plan.mjs` строит fail-closed reuse plan для candidate rows перед созданием новых `meaning_units`. Скрипт может добавить safe memberships через `--apply-safe`, но не копирует example translations: `meaning_language_entries` глобальны по `meaning_id`, а `meaning_example_translations` привязаны к `example_id`.

`scripts/export-review-decisions-template.mjs` и `scripts/import-review-decisions.mjs` возвращают ручные RU review-решения в Postgres и пишут audit trail в `qa_reviews`.

`scripts/check-semantic-scene-alignment.mjs` is the deterministic guard for English context example vs `meaning_examples.semantic_scene` drift. It reads Postgres only and is called by the current QA/final export contour.

`scripts/check-source-backed-transcriptions.mjs` is the source-backed transcription auditor. It reads active deck entries, applies `config/transcription-source-policy.json`, verifies the reference source manifest, and can write `qa_reviews` rows with `check_family=transcription_source_backing`.

`scripts/export-final-linguistic-audit-batch.mjs`, `scripts/run-final-linguistic-audit.mjs` и `scripts/import-final-linguistic-audit-results.mjs` form the post-final linguistic audit contour. The contour reads already final-ready card data, writes `outputs/audit/*_results.jsonl` plus summary, checks transcription shape/source backing/cross-language collapse, entry/display fallback, sibling-copy warnings, meaning contrast, base/target example naturalness, semantic-scene alignment and other deterministic sanity rules, and records `qa_reviews` evidence with `check_family=final_linguistic_audit`, `target_type=export`. It does not change card content and does not grant native approval.

`scripts/export-pilot-ru-review.mjs` собирает RU review workbook:

```text
outputs/review/Home_Kitchen_Cookware_Pilot_01_RU_review.xlsx
```

`scripts/export-flashcards-working-sheet.mjs` собирает текущий wide-format workbook для Google Sheets:

```text
outputs/google-sheets/FlashcardsLuna_home-kitchen-kitchenware-basics_working.xlsx
```

`scripts/upload-spreadsheet-to-drive-folder.mjs` загружает финальный `.xlsx` в Google Drive folder and converts it to native Google Sheets using the Drive API. Preferred auth for a normal user Drive folder is OAuth Desktop client stored locally as `.secrets/google-oauth-client.json` plus `.secrets/google-oauth-token.json`; both stay out of git. By default it creates a new Sheet in the target folder; with `--file-id=<existing_google_sheet_id>` it updates the existing Sheet instead of creating a duplicate. After upload/update, it verifies title and parent folder through Drive metadata and updates the local `*_delivery.json` manifest. Service-account credentials remain a fallback for Shared Drive / explicitly shared setups. The script does not change Postgres data.

Текущая локальная база:

```text
container: lunacards-postgres
host: 127.0.0.1
port: 55433
database: lunacards
user: lunacards
```

## Зачем нужна база

Postgres нужен как рабочий source of truth для подготовки карточек до экспорта в Google Sheets:

- хранить один `meaning_id` на один смысл;
- не плодить дубли переводов при пересечении наборов;
- хранить языковые версии в длинном формате;
- отделять слово, пример, транскрипцию/романизацию и QA-статус;
- собирать разные тематические листы из одной базы;
- фиксировать batch generation и review-статусы.

Google Sheets остается финальным deliverable, а не рабочей базой.

## Ключевые решения в схеме

### Languages

Таблица `languages` хранит язык как рабочую сущность, а не просто колонку в Google Sheets.

Важное различие:

- `code` - внутренний код базы;
- `spreadsheet_code` - код, который используется в Google Sheets/spreadsheet колонках.

Текущие специальные случаи:

| Язык | `code` | `spreadsheet_code` | Правило |
| --- | --- | --- | --- |
| English (US) | `EN` | `EN` | American English / US default and canonical base. |
| British English | `EN-GB` | `EN-GB` | Regional English variant for the United Kingdom; not the canonical base. |
| Spanish (Spain) | `ES` | `ES` | European Spanish / Spain. |
| Latin American Spanish | `ES-419` | `ES-419` | Broad Latin American Spanish. |
| Chinese (Simplified) | `ZH` | `ZH` | Simplified Chinese. Traditional Chinese / `ZH-HANT` is not active. |
| Norwegian Bokmål | `NB` | `NO` | Внутри базы Bokmål хранится как `NB`, но в Google Sheets экспортируется `NO`. |
| Filipino | `TL` | `TL` | `FIL/fil` не используется как основной код. |
| Kazakh | `KK` | `KK` | `native_word` хранится кириллицей, финальная `transcription` хранится латиницей. |
| Portuguese | `PT` | `PT` | European Portuguese для Португалии. |
| Brazilian Portuguese | `PT-BR` | `PT-BR` | Regional Portuguese variant for Brazil. |

В seed-файле сейчас 54 активных языковых варианта.

### Vocabulary

Для словарных карточек основной контур такой:

```text
meaning_units
meaning_set_memberships
meaning_examples
meaning_language_entries
meaning_example_translations
```

`meaning_units` хранит canonical English, часть речи, смысловую заметку, default taxonomy, уровень, частотность, практическую важность карточки, countability, POS-specific metadata, tags и общий QA-статус.

`meaning_language_entries` хранит языковую реализацию слова:

```text
native_word
word_with_article_or_marker
article_or_marker
gender
transcription
romanization
romanization_system
pronunciation_ipa
pronunciation_status
quality_status
```

`transcription` хранится на уровне слова, не на уровне примера. Это единственное значение транскрипции для карточки. Для языков с policy `native orthography` оно повторяет отображаемое слово.

### Examples

`meaning_examples` хранит английский semantic anchor:

- `base` example - общий пример для смысла;
- `context` example - пример внутри конкретного набора.
- `semantic_scene` - JSONB-описание сцены, которую должны сохранить все языки. Schema v1 core fields: `target_object`, `target_display`, `subject_number`, `action_or_state`, `state_or_location`, `tense_aspect`, `topic_context`; optional fields: `actor`, `attributes`, `time`.

`meaning_example_translations` хранит переводы примеров по языкам. Это нужно, чтобы контролировать, что пример сохраняет один и тот же объект, действие, число и ситуацию во всех языках.

`semantic_scene` не экспортируется как пользовательская колонка в финальный vocabulary sheet. Это внутренний QA-якорь для генерации и проверки примеров.

Final export validates `meaning_examples.quality_status` for the context example, not only the translated example rows. If a context example is `generated_checked`, it needs `qa_reviews` evidence with `target_type = meaning_example` and `target_key = example_id`.

For translated examples, QA evidence is deck/example-scoped:

```text
target_type = meaning_example_translation
target_key = set_id::meaning_id::example_id
language_code = DB language code
```

This prevents QA for one deck-specific example from being reused accidentally for another deck that shares the same `meaning_id`.

### Sets and Taxonomy

`content_sets` хранит учебные наборы. Текущий production/export использует только `vocabulary` и `core_foundation` vocabulary sets.

Для структуры колод `content_sets` также хранит:

```text
slug
roadmap_stage
level_label
learning_goal
next_recommended_set_ids
selection_status
sheet_contract_version
```

Эти поля экспортируются в Google Sheets на лист `Deck Metadata`. Они не заменяют localized `Course Metadata`, а дополняют его структурой колоды и следующими рекомендованными наборами.

`level_label` обязателен для каждого нового `content_set`. Он нужен как стабильный level label и не заменяет `level_min` / `level_max`.

`content_set_localizations` хранит localized metadata для листа `Course Metadata`:

```text
set_id
language_code
title
description
module
category
level_signal
quality_status
notes
```

Для каждого активного языка нужна одна строка. `module` и `category` - localized mobile-app labels для deck-level domain/area (`context_domain` / `context_area` по смыслу): например `Home` / `Kitchen`, `Дом` / `Кухня`. Они не заменяют техническое `content_sets.category`, где может оставаться длинный scope вроде `Cookware, Utensils & Tableware`. Localized source labels live in `config/course-metadata-taxonomy-labels.json` and are applied by `scripts/ensure-course-metadata-module-category.mjs`; the production runner calls this before `db-qa-set` during QA. Export script блокирует сборку, если для текущего `set_id` нет title/description/module/category/level_signal на все 54 активных языковых варианта, если нарушены лимиты 25/60/25/25 символов, если `Title`/`Description` не завершаются локализованной sentence punctuation, если `Description` не содержит exact `level_signal`, или если `level_signal` не введен отдельным предложением.

`taxonomy_nodes` хранит domain/area/category/situation как контролируемые узлы. Текущая source of truth по самим категориям остается в [Card Taxonomy](card-taxonomy.md); таблица нужна для рабочей базы и проверки spreadsheet-выдачи.

### Active Content Scope

Активная схема для генерации и spreadsheet-выдачи хранит только vocabulary/core-foundation карточки:

```text
meaning_units
meaning_set_memberships
meaning_examples
meaning_language_entries
meaning_example_translations
```

Готовые фразы, диалоги и смешанные наборы не являются частью текущего проекта создания карточек.

### Generation, QA and Exports

Служебные таблицы:

```text
generation_batches
generation_batch_items
qa_reviews
exports
export_items
```

Они нужны, чтобы не смешивать generated content и approved content, фиксировать спорные места и понимать, из какого batch появился набор.

`qa_reviews` is also the minimum audit trail for `generated_checked`. A usable evidence row must identify the exact target, have `review_status = generated_checked` or `approved`, non-empty `reviewer`, non-empty `reviewed_at`, non-empty `check_family`, non-empty `result_summary`, and non-empty `pass_id` or `batch_id`. Text-only `notes` / `issue_type` patterns are readable notes only; final/export checks do not accept them as evidence. For text-bearing checks, `checked_value_hash` must match the current value returned by `qa_checked_value_hash(...)`; stale evidence is not usable after content edits.

Current executable AI QA `check_family` values:

| `check_family` | Target type | Target key |
| --- | --- | --- |
| `word_selection_quality` | `content_set` | `set_id::meaning_id` + `language_code=EN` |
| `base_example_alignment` | `meaning_example` | `example_id` + `language_code=EN` |
| `example_quality` | `meaning_example` | `example_id` + `language_code=EN` |
| `semantic_preservation` | `meaning_example_translation` | `set_id::meaning_id::example_id` + `language_code` |
| `target_example_naturalness` | `meaning_example_translation` | `set_id::meaning_id::example_id` + `language_code` |
| `target_example_lexical_anchor` | `meaning_example_translation` | `set_id::meaning_id::example_id` + `language_code` |
| `target_example_pedagogical_quality` | `meaning_example_translation` | `set_id::meaning_id::example_id` + `language_code` |
| `regional_variant_quality` | `meaning_example_translation` | `set_id::meaning_id::example_id` + `language_code` |
| `entry_form` | `meaning_language_entry` | `meaning_id` + `language_code` |
| `entry_form_register` | `meaning_language_entry` | `meaning_id` + `language_code` |
| `semantic_granularity` | `meaning_language_entry` | `meaning_id` + `language_code` |
| `article_gender_marker_consistency` | `meaning_language_entry` | `meaning_id` + `language_code` |
| `transcription_policy` | `meaning_language_entry` | `meaning_id` + `language_code` |
| `pronunciation_accuracy` | `meaning_language_entry` | `meaning_id` + `language_code` |
| `transcription_source_backing` | `meaning_language_entry` | `meaning_id` + `language_code` |

## QA statuses

В схеме используются статусы:

```text
draft
generated
generated_checked
needs_review
approved
blocked
```

`generated` не означает `approved`. Перед final export нужно явно пройти review/QA.

`generated_checked` хранится как настоящий DB status после migration `008_generated_checked_and_level_signal.sql`. Он означает, что строка прошла обязательные AI/source-backed QA gates без найденных ошибок, но не является native-speaker approval. Для final export этот статус требует matching `qa_reviews` evidence.

Final export candidate не должен включать raw `generated`, `needs_review`, `blocked`, `draft` или missing status. Content fields are final-ready only as `approved` / `generated_checked`; pronunciation fields additionally allow `not_applicable`. Final export also validates deck-level, Course Metadata, meaning-level, context-example and set-membership statuses. Допустимые final-ready classes описаны в [Data Delivery Pipeline](data-delivery-pipeline.md).

Status ownership contract:

| Поле | Роль |
| --- | --- |
| `Deck Master Plan.Status` | Документирует planning/generation readiness вне Postgres; не является final-ready статусом. |
| `deck_generation_runs.run_status` | Runtime-lock для параллельных workers; `running` значит, что конкретный `set_id` уже забран в работу. |
| `content_sets.selection_status` | DB-сигнал, что composition selected for final export; final требует `approved`. |
| `quality_status` columns | DB-сигнал качества конкретной сущности; final требует `approved` или `generated_checked` с structured evidence. |
| `pronunciation_status` columns | DB-сигнал для transcription/pronunciation; final additionally allows `not_applicable`. |
| `qa_reviews.review_status` | Audit trail результата проверки; сам по себе не заменяет status целевой content row. |

## Как применять

Локальный вариант через Docker Compose:

```bash
docker compose up -d postgres
```

Затем:

```bash
scripts/db-apply.sh
```

Если нужен внешний Postgres, можно передать `DATABASE_URL`:

```bash
DATABASE_URL="postgresql://user:password@host:5432/dbname" scripts/db-apply.sh
```

`scripts/db-apply.sh <project-relative.sql>` also applies one or more extra project-relative `.sql` files after migrations and seeds. Use this for generated final-readiness SQL such as `outputs/import/<set_id>_current_final_readiness_*.sql`; the script rejects absolute paths, parent-directory traversal and non-SQL files so extra files cannot be silently ignored or applied outside the project tree.

Проверка после seed:

```sql
select count(*) from languages;
```

Ожидаемый результат: `54`.

Текущая проверка после применения schema v0:

```text
Database schema applied. languages=54 pilot_home_kitchen_cookware=50
```

Текущая EN transcription проверка в `scripts/db-check-pilot.sh`:

```text
pilot_en_transcriptions = 50
missing_english_transcription = 0
```

Текущая проверка RU-слоя:

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

Повторный запуск `scripts/db-apply.sh` также проходит успешно: миграция использует `create table if not exists` / `create index if not exists`, а seed языков использует upsert.

## Что пока не решено

| Вопрос | Текущий статус |
| --- | --- |
| Где именно будет жить Postgres runtime | Локальный Docker Compose принят как рабочий default для пилота; внешний `DATABASE_URL` возможен позже. |
| Export views для широкого Google Sheets формата | Делать на Gate 4, после пилота. |
| Применять ли схему прямо сейчас | Schema v0 уже применена к локальному контейнеру `lunacards-postgres`. |
| Risky transcription QA | Display-формат выбран, но для risky languages нужен `needs_review` и точечная проверка. |

## Следующий шаг

Следующий gate - продолжить pilot translation после RU-проверки: добавлять следующие языковые слои к `home_kitchen_cookware_pilot_01`, не переводя сразу весь `5000 x 54` объем.
