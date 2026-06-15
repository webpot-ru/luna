# English Core 3000 Source Plan

Этот документ является source of truth для безопасного source-acquisition и source-snapshot контура `English Core 3000`.

Статус: `first_release_google_sheet_delivered`. Пользователь разрешил двигаться в безопасном направлении 2026-05-05: Oxford 3000/5000 остается benchmark only, а production source list должен строиться из usable/open/internal sources. First-release Google Sheet delivery was approved and completed on 2026-05-05. Этот документ не разрешает импорт в Postgres.

2026-05-16 Oxford licensing update: пользователь подтвердил, что Oxford нужен для product/market positioning. Это не меняет source status уже доставленного English Core first release: текущие artifacts остаются NGSL/CEFR-J/internal-source based and must not be relabelled as Oxford. Permission request package lives in [Oxford Vocabulary Release Plan](oxford-vocabulary-release-plan.md) and `outputs/permission-requests/oxford-3000-5000-permission-request.md`; any Oxford-based release requires OUP permission/licence, a new source-list snapshot and a separate source decision.

Machine-readable draft contract: `config/english-core-3000-source-contract-v0.json`.

## Release Target

| Field | Value |
| --- | --- |
| `course_id` | `english_core_3000` |
| First release | `english_core_3000_a1_a2_part_001_150_v1` |
| Source language | `EN` as American English / US default |
| British variant | `EN-GB` included as a text/example regional column in the first release |
| Target row count | 150 selected rows |
| Candidate-pool target | at least 300 source candidates before selection |
| Workbook language columns | all 54 spreadsheet language columns from `config/language-order.json`, including `EN-GB` |
| Output shape | HSK-style course workbook, not ordinary deck export unless separately approved |
| Future Google Drive folder | Same delivery folder as other LunaCards decks: `Слова для FlashcarsLuna` |
| Transcription scope | US English source word + US English source example only |

## English Variant Decision

The first `English Core 3000` release uses `EN` / American English as the source/default English variant and includes `EN-GB` as a British English text/example column.

Decision:

- `EN` is the main course language.
- `EN-GB` is included in the first release for word/display and example text.
- `EN-GB` does not get transcription columns in the first release.
- British pronunciation remains out of scope unless separately approved.

Reason:

- learners can study the same course with either US or UK text variants where useful;
- the workbook still avoids the expensive pronunciation branch because transcription stays US-English-only;
- `EN-GB` text can reuse the same `meaning_id` rows while allowing deliberate spelling, word-choice and example wording differences.

The first release should not create a separate British pronunciation course. `EN-GB` must reuse the same `meaning_id` rows and add only deliberate differences in spelling, word choice and example wording. No `transcription_EN-GB` or `example_transcription_EN-GB` columns are part of this release.

## Level Slicing Model

The whole `English Core 3000` course is a multi-release line of roughly 3000 meaning rows, not one first workbook with 3000 rows.

Level order:

| Level slice | Release role | Default size |
| --- | --- | ---: |
| `A1/A2` | First foundation layer: highest-frequency everyday, concrete and learner-critical words. | first pilot 150 rows, later chunks up to 300 rows |
| `B1` | Middle core: common social, work, study, travel, media and abstract vocabulary. | 300 rows |
| `B2` | Upper core: argumentation, news, education, professional and more abstract meanings. | 300 rows |
| `B2/C1` | Later extension, closer to Core 5000 than Core 3000. | separate expansion after Core 3000 is stable |

Every release row must carry:

- `core_band`
- `level_min`
- `level_max`

The first file is deliberately small:

```text
English Core 3000 - A1/A2 Part 1
target_rows: 150
```

After the first pilot is proven, use 300-row chunks by level until the Core 3000 line is complete. Do not create one 3000-row Google Sheet as the first delivery.

## Source Stack

| Source | Role | Current decision |
| --- | --- | --- |
| NGSL 1.2 | Primary source-list candidate for high-frequency general English. | `candidate_source_needs_sharealike_review`: official site says NGSL 1.2 is downloadable and licensed CC BY-SA 4.0. Share-alike/attribution packaging impact must be accepted before production use. |
| CEFR-J Wordlist | CEFR level and POS cross-check. | `candidate_crosscheck_needs_snapshot_review`: official CEFR-J site publishes Wordlist Version 1.6; Open Language Profiles records CEFR-J vocabulary/grammar terms as research/commercial use with citation. Use for cross-check only until the exact snapshot and citation text are stored. |
| Oxford 3000/5000 | Coverage/market benchmark only. | `benchmark_only`: do not copy list/order/definitions/examples/level labels unless permission changes. |
| Kaikki/Wiktionary English | POS/sense support. | Candidate evidence only. |
| OMW/WordNet | Sense grouping and semantic disambiguation. | Candidate evidence only. |
| Wikidata/Concepticon | Concept labels and multilingual aliases. | Candidate evidence only. |
| Local translation source stack | Translation and example-source preflight across 54 languages. | Candidate evidence only; never auto-approval. |
| Internal curation | Final selection, `meaning_id`, `meaning_note`, `semantic_scene`, examples. | Required final layer. |

External source checks on 2026-05-05:

- NGSL official page lists NGSL 1.2 as a 2809-word downloadable list and states CC BY-SA 4.0 licensing.
- CEFR-J official site lists CEFR-J Wordlist Version 1.6 as a downloadable resource.
- Open Language Profiles records CEFR-J vocabulary/grammar datasets as usable for research and commercial purposes with proper citation, with copyright belonging to Tono Laboratory at TUFS.

References:

- https://www.newgeneralservicelist.com/new-general-service-list
- https://corpuscobo.net/
- https://github.com/openlanguageprofiles/olp-en-cefrj

## Current Source Snapshot

2026-05-05 source snapshot for the first release was created and checked.

Artifacts:

- raw NGSL CSV: `outputs/english-core-3000/source/raw/NGSL_1.2_stats.csv`
- raw CEFR-J zip: `outputs/english-core-3000/source/raw/CEFRJ_wordlist_ver1.6.zip`
- extracted CEFR-J XLSX: `outputs/english-core-3000/source/raw/CEFR-J Wordlist Ver1.6.xlsx`
- normalized CEFR-J ALL CSV: `outputs/english-core-3000/source/raw/CEFRJ_wordlist_ver1.6_ALL.csv`
- source snapshot manifest: `outputs/english-core-3000/source/english_core_3000_a1_a2_part_001_150_v1_source_snapshot_manifest.json`
- normalized NGSL JSONL: `outputs/english-core-3000/source/english_core_3000_a1_a2_part_001_150_v1.ngsl_1_2.normalized.jsonl`
- normalized CEFR-J JSONL: `outputs/english-core-3000/source/english_core_3000_a1_a2_part_001_150_v1.cefr_j_wordlist.normalized.jsonl`

Checked command:

```bash
node scripts/english-core/check-core-3000-source-snapshot.mjs english_core_3000_a1_a2_part_001_150_v1
```

Result:

```text
English Core 3000 source snapshot OK for english_core_3000_a1_a2_part_001_150_v1: sources=ngsl_1_2, cefr_j_wordlist warnings=0
```

Snapshot counts:

| Source | Normalized rows | Role |
| --- | ---: | --- |
| `ngsl_1_2` | 2809 | primary source-list candidate |
| `cefr_j_wordlist` | 7801 | level/POS cross-check |

This is not generation approval. The next gate is a candidate-pool builder for at least 300 candidate rows and 150 selected rows.

## Current Candidate Pool

2026-05-05 candidate pool for the first release was created and checked.

Artifacts:

- candidate pool JSONL: `outputs/english-core-3000/candidate-pools/english_core_3000_a1_a2_part_001_150_v1_candidate_pool.jsonl`
- candidate pool summary: `outputs/english-core-3000/candidate-pools/english_core_3000_a1_a2_part_001_150_v1_candidate_pool_summary.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-candidate-pool.mjs english_core_3000_a1_a2_part_001_150_v1
```

Result:

```text
English Core 3000 candidate pool OK for english_core_3000_a1_a2_part_001_150_v1: rows=300, selected=150, backup=144, warnings=0
```

Pool counts:

| Decision/profile | Rows |
| --- | ---: |
| all rows | 300 |
| selected | 150 |
| backup | 144 |
| needs_review | 6 |
| selected ordinary vocabulary | 120 |
| selected grammar-sensitive/function rows | 30 |

The first deterministic pass deliberately caps function/grammar-sensitive selected rows at 30. This avoids making the first English flashcard workbook mostly articles, pronouns, prepositions and auxiliaries. Function words remain important for the whole Core 3000 line, but many need special meaning notes and examples before generation.

This is still not generation approval. The next gate is row-level preparation: assign `meaning_id`, choose POS/sense, write `meaning_note`, define `semantic_scene`, draft US English example, and source-check English word/example transcription.

## Current Base Draft

2026-05-05 base draft for the first release was created and structurally checked.

Artifacts:

- base draft JSONL: `outputs/english-core-3000/base-drafts/english_core_3000_a1_a2_part_001_150_v1_base_draft.jsonl`
- base draft summary: `outputs/english-core-3000/base-drafts/english_core_3000_a1_a2_part_001_150_v1_base_draft_summary.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-base-draft.mjs english_core_3000_a1_a2_part_001_150_v1
```

Result:

```text
English Core 3000 base draft OK for english_core_3000_a1_a2_part_001_150_v1: rows=150, function_rows=30, generation_ready=0, file=outputs/english-core-3000/base-drafts/english_core_3000_a1_a2_part_001_150_v1_base_draft.jsonl
```

Base draft counts:

| Field | Rows |
| --- | ---: |
| all rows | 150 |
| `generation_ready` | 0 |
| `needs_review` | 150 |
| function/grammar-sensitive rows | 30 |
| POS/sense review rows | 64 |
| noun rows needing countability/article review | 24 |
| verb display rows with `to + base` draft | 25 |

This artifact is a row-level skeleton only. It has no final target-language translations, no final examples and no final transcriptions. It must remain `generation_ready=0` until every selected row has reviewed POS/sense, `meaning_id`, `meaning_note`, `semantic_scene`, US English example, US English word/example transcription evidence, duplicate/reuse review and article/countability decision where needed.

## Current Row Review

2026-05-05 row review v1 was created and checked for all 150 selected rows. It includes the earlier v0 high-risk function/grammar-sensitive review plus the v1 ordinary vocabulary review.

Artifacts:

- row review overrides: `config/english-core-3000-row-review-overrides-v0.json`
- v0 row review JSONL: `outputs/english-core-3000/row-reviews/english_core_3000_a1_a2_part_001_150_v1_row_review_v0.jsonl`
- v0 row review summary: `outputs/english-core-3000/row-reviews/english_core_3000_a1_a2_part_001_150_v1_row_review_v0_summary.md`
- v1 row review JSONL: `outputs/english-core-3000/row-reviews/english_core_3000_a1_a2_part_001_150_v1_row_review_v1.jsonl`
- v1 row review summary: `outputs/english-core-3000/row-reviews/english_core_3000_a1_a2_part_001_150_v1_row_review_v1_summary.md`
- native-style review note: `outputs/english-core-3000/row-reviews/english_core_3000_a1_a2_part_001_150_v1_native_style_review_v1.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-row-review.mjs english_core_3000_a1_a2_part_001_150_v1
```

Result:

```text
English Core 3000 row review OK for english_core_3000_a1_a2_part_001_150_v1: rows=150, reviewed=150, reviewed_function_rows=30, generation_ready=0, file=outputs/english-core-3000/row-reviews/english_core_3000_a1_a2_part_001_150_v1_row_review_v1.jsonl
```

Row review counts:

| Field | Rows |
| --- | ---: |
| all rows | 150 |
| reviewed rows | 150 |
| unreviewed rows | 0 |
| reviewed function/grammar-sensitive rows | 30 |
| `generation_ready` | 0 |

Exact `part_of_speech` counts after review:

| POS | Rows |
| --- | ---: |
| noun | 38 |
| verb | 46 |
| adjective | 14 |
| adverb | 22 |
| determiner | 5 |
| preposition | 9 |
| conjunction | 4 |
| pronoun | 7 |
| be-verb | 1 |
| have-verb | 1 |
| do-verb | 1 |
| infinitive-to | 1 |
| modal auxiliary | 1 |

All selected rows now have LunaCards-owned POS/sense, `meaning_id`, `meaning_note`, `semantic_scene`, article/countability decisions where applicable, and US English example proposals. A 2026-05-05 native-style pass repaired stiff English learner examples, changed the draft EN Course Metadata title from `US Core English.` to `US English Core.` and changed the EN description from `Daily core words.` to `Everyday core words.`. This is still not generation approval: every row still requires source-backed English word/example transcription, duplicate/reuse review, translation preflight and final QA before generation.

## Current EN Transcription

2026-05-05 EN transcription v1 was created and checked for all 150 selected rows.

Artifacts:

- EN transcription JSONL: `outputs/english-core-3000/en-transcriptions/english_core_3000_a1_a2_part_001_150_v1_en_transcriptions_v1.jsonl`
- EN transcription summary: `outputs/english-core-3000/en-transcriptions/english_core_3000_a1_a2_part_001_150_v1_en_transcriptions_v1_summary.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-en-transcriptions.mjs english_core_3000_a1_a2_part_001_150_v1
```

Result:

```text
English Core 3000 EN transcriptions OK for english_core_3000_a1_a2_part_001_150_v1: rows=150, transcription_EN=150, example_transcription_EN=150, generation_ready=0, file=outputs/english-core-3000/en-transcriptions/english_core_3000_a1_a2_part_001_150_v1_en_transcriptions_v1.jsonl
```

EN transcription scope:

| Field | Rows |
| --- | ---: |
| `transcription_EN` filled | 150 |
| `example_transcription_EN` filled | 150 |
| target-language transcription filled | 0 |
| `generation_ready` | 0 |

Source method: local CMUdict exact-token lookup plus deterministic ARPABET-to-IPA conversion, using the registered US English source files `ipa-focused-english-us-cmudict-dict`, `ipa-focused-english-us-cmudict-phones` and `ipa-focused-english-us-cmudict-symbols`. This fills only US English source word/display and US English example transcription. It does not create final QA evidence, target-language transcriptions, Postgres rows or a Google Sheet.

## Current EN-GB Text Layer

2026-05-05 EN-GB text/example layer v1 was created and checked for all 150 selected rows.

Artifacts:

- EN-GB text JSONL: `outputs/english-core-3000/en-gb/english_core_3000_a1_a2_part_001_150_v1_en_gb_text_v1.jsonl`
- EN-GB text summary: `outputs/english-core-3000/en-gb/english_core_3000_a1_a2_part_001_150_v1_en_gb_text_v1_summary.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-en-gb-layer.mjs english_core_3000_a1_a2_part_001_150_v1
```

Result:

```text
English Core 3000 EN-GB layer OK for english_core_3000_a1_a2_part_001_150_v1: rows=150, same_as_us=150, no_transcription_columns=true
```

All first-release EN-GB display/example rows currently match the US English row because these selected A1/A2 items do not require British spelling or everyday word-choice differences. This layer deliberately has no `transcription_EN-GB` or `example_transcription_EN-GB` fields.

## Current Translation Batch RU/ES/FR

2026-05-05 translation batch `ru_es_fr_v0` was created, language-QA repaired, native-style QA v2 repaired and structurally checked for all 150 selected rows.

Artifacts:

- translation batch JSONL: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_ru_es_fr_v0.jsonl`
- translation batch summary: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_ru_es_fr_v0_summary.md`
- language QA report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_ru_es_fr_language_qa_v1.md`
- native-style QA v2 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_ru_es_fr_native_style_qa_v2.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-translation-batch.mjs --batch=ru_es_fr_v0 --languages=RU,ES,FR
```

Result:

```text
English Core 3000 translation batch OK for english_core_3000_a1_a2_part_001_150_v1: batch=ru_es_fr_v0, rows=150, languages=RU,ES,FR, no_target_transcriptions=true
```

This batch fills only learner display and translated example fields for `RU`, `ES` and `FR`. It deliberately has no target-language transcription columns because English Core first-release transcription remains EN-only. Function words may use learner-facing glosses where a direct target-language word would be misleading, for example Russian article/function explanations.

Status: `draft_native_style_qa_v2_checked`. This batch does not import Postgres rows, does not create final QA evidence and does not create a Google Sheet. The native-style pass is an AI editorial check, not human native-speaker approval. Final source-assisted QA, semantic preservation evidence, target example naturalness evidence and final export checks are still required before delivery.

## Current Translation Batch DE/IT/PT

2026-05-05 translation batch `de_it_pt_v0` was created, native-style QA v1/v2 repaired and structurally checked for all 150 selected rows.

Artifacts:

- translation batch JSONL: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_de_it_pt_v0.jsonl`
- translation batch summary: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_de_it_pt_v0_summary.md`
- native-style QA v1 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_de_it_pt_native_style_qa_v1.md`
- native-style QA v2 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_de_it_pt_native_style_qa_v2.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-translation-batch.mjs --batch=de_it_pt_v0 --languages=DE,IT,PT
```

Result:

```text
English Core 3000 translation batch OK for english_core_3000_a1_a2_part_001_150_v1: batch=de_it_pt_v0, rows=150, languages=DE,IT,PT, no_target_transcriptions=true
```

This batch fills only learner display and translated example fields for `DE`, `IT` and `PT`. It deliberately has no target-language transcription columns because English Core first-release transcription remains EN-only. German, Italian and Portuguese noun displays include learner-visible articles where useful.

Status: `draft_native_style_qa_v2_checked`. This batch does not import Postgres rows, does not create final QA evidence and does not create a Google Sheet. The native-style pass is an AI editorial check, not human native-speaker approval. Final source-assisted QA, semantic preservation evidence, target example naturalness evidence and final export checks are still required before delivery.

## Current Translation Batch ZH/JA/KO

2026-05-05 translation batch `zh_ja_ko_v0` was created, native-style QA v1/v2 repaired and structurally checked for all 150 selected rows.

Artifacts:

- translation batch JSONL: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_zh_ja_ko_v0.jsonl`
- translation batch summary: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_zh_ja_ko_v0_summary.md`
- native-style QA v1 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_zh_ja_ko_native_style_qa_v1.md`
- native-style QA v2 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_zh_ja_ko_native_style_qa_v2.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-translation-batch.mjs --batch=zh_ja_ko_v0 --languages=ZH,JA,KO
```

Result:

```text
English Core 3000 translation batch OK for english_core_3000_a1_a2_part_001_150_v1: batch=zh_ja_ko_v0, rows=150, languages=ZH,JA,KO, no_target_transcriptions=true
```

This batch fills only learner display and translated example fields for `ZH`, `JA` and `KO`. It deliberately has no target-language transcription columns because English Core first-release transcription remains EN-only. The translation checker now also enforces basic CJK script identity for these languages.

Status: `draft_native_style_qa_v2_checked`. This batch does not import Postgres rows, does not create final QA evidence and does not create a Google Sheet. The native-style pass is an AI editorial check, not human native-speaker approval. Final source-assisted QA, semantic preservation evidence, target example naturalness evidence and final export checks are still required before delivery.

## Current Translation Batch VI/TH/MS/ID

2026-05-05 translation batch `vi_th_ms_id_v0` was created, native-style QA v1/v2 repaired and structurally checked for all 150 selected rows.

Artifacts:

- translation batch JSONL: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_vi_th_ms_id_v0.jsonl`
- translation batch summary: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_vi_th_ms_id_v0_summary.md`
- native-style QA v1 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_vi_th_ms_id_native_style_qa_v1.md`
- native-style QA v2 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_vi_th_ms_id_native_style_qa_v2.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-translation-batch.mjs --batch=vi_th_ms_id_v0 --languages=VI,TH,MS,ID
```

Result:

```text
English Core 3000 translation batch OK for english_core_3000_a1_a2_part_001_150_v1: batch=vi_th_ms_id_v0, rows=150, languages=VI,TH,MS,ID, no_target_transcriptions=true
```

This batch fills only learner display and translated example fields for `VI`, `TH`, `MS` and `ID`. It deliberately has no target-language transcription columns because English Core first-release transcription remains EN-only. The translation checker enforces Latin script for `VI`, `MS` and `ID`, and Thai script identity for `TH`.

Status: `draft_native_style_qa_v2_checked`. This batch does not import Postgres rows, does not create final QA evidence and does not create a Google Sheet. The native-style pass is an AI editorial check, not human native-speaker approval. Final source-assisted QA, semantic preservation evidence, target example naturalness evidence and final export checks are still required before delivery.

## Current Translation Batch PL/NL/SV/NO

2026-05-05 translation batch `pl_nl_sv_no_v0` was created, native-style QA v1/v2 repaired and structurally checked for all 150 selected rows.

Artifacts:

- translation batch JSONL: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_pl_nl_sv_no_v0.jsonl`
- translation batch summary: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_pl_nl_sv_no_v0_summary.md`
- native-style QA v1 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_pl_nl_sv_no_native_style_qa_v1.md`
- native-style QA v2 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_pl_nl_sv_no_native_style_qa_v2.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-translation-batch.mjs --batch=pl_nl_sv_no_v0 --languages=PL,NL,SV,NO
```

Result:

```text
English Core 3000 translation batch OK for english_core_3000_a1_a2_part_001_150_v1: batch=pl_nl_sv_no_v0, rows=150, languages=PL,NL,SV,NO, no_target_transcriptions=true
```

This batch fills only learner display and translated example fields for `PL`, `NL`, `SV` and `NO`. It deliberately has no target-language transcription columns because English Core first-release transcription remains EN-only. Polish has no artificial articles; Dutch and Swedish noun displays include learner-visible articles where useful; Norwegian Bokmål uses the documented `en/et` learner policy and does not use `ei` in base display. The translation checker enforces Latin-script display fields for these languages and allows the legitimate Dutch surface `in`.

Status: `draft_native_style_qa_v2_checked`. This batch does not import Postgres rows, does not create final QA evidence and does not create a Google Sheet. The native-style pass is an AI editorial check, not human native-speaker approval. Final source-assisted QA, semantic preservation evidence, target example naturalness evidence and final export checks are still required before delivery.

## Current Translation Batch DA/FI/CS/SK

2026-05-05 translation batch `da_fi_cs_sk_v0` was created, native-style QA v1/v2 repaired and structurally checked for all 150 selected rows.

Artifacts:

- translation batch JSONL: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_da_fi_cs_sk_v0.jsonl`
- translation batch summary: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_da_fi_cs_sk_v0_summary.md`
- native-style QA v1 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_da_fi_cs_sk_native_style_qa_v1.md`
- native-style QA v2 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_da_fi_cs_sk_native_style_qa_v2.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-translation-batch.mjs --batch=da_fi_cs_sk_v0 --languages=DA,FI,CS,SK
```

Result:

```text
English Core 3000 translation batch OK for english_core_3000_a1_a2_part_001_150_v1: batch=da_fi_cs_sk_v0, rows=150, languages=DA,FI,CS,SK, no_target_transcriptions=true
```

This batch fills only learner display and translated example fields for `DA`, `FI`, `CS` and `SK`. It deliberately has no target-language transcription columns because English Core first-release transcription remains EN-only. Danish noun displays include learner-visible `en/et`; Finnish, Czech and Slovak do not receive artificial articles. The translation checker enforces Latin-script display fields for these languages.

Status: `draft_native_style_qa_v2_checked`. This batch does not import Postgres rows, does not create final QA evidence and does not create a Google Sheet. The native-style pass is an AI editorial check, not human native-speaker approval. Final source-assisted QA, semantic preservation evidence, target example naturalness evidence and final export checks are still required before delivery.

## Current Translation Batch HU/RO/BG/HR

2026-05-05 translation batch `hu_ro_bg_hr_v0` was created, native-style QA v1/v2/v3 repaired and structurally checked for all 150 selected rows.

Artifacts:

- translation batch JSONL: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_hu_ro_bg_hr_v0.jsonl`
- translation batch summary: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_hu_ro_bg_hr_v0_summary.md`
- native-style QA v1 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_hu_ro_bg_hr_native_style_qa_v1.md`
- native-style QA v2 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_hu_ro_bg_hr_native_style_qa_v2.md`
- native-style QA v3 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_hu_ro_bg_hr_native_style_qa_v3.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-translation-batch.mjs --batch=hu_ro_bg_hr_v0 --languages=HU,RO,BG,HR
```

Result:

```text
English Core 3000 translation batch OK for english_core_3000_a1_a2_part_001_150_v1: batch=hu_ro_bg_hr_v0, rows=150, languages=HU,RO,BG,HR, no_target_transcriptions=true
```

This batch fills only learner display and translated example fields for `HU`, `RO`, `BG` and `HR`. It deliberately has no target-language transcription columns because English Core first-release transcription remains EN-only. Hungarian, Bulgarian and Croatian do not receive artificial articles; Romanian noun displays include learner-visible `un/o` where useful. The translation checker enforces Latin-script display fields for `HU`, `RO` and `HR`, and Cyrillic-script display fields for `BG`; it also allows the legitimate Romanian surface `important`.

Status: `draft_native_style_qa_v3_checked`. This batch does not import Postgres rows, does not create final QA evidence and does not create a Google Sheet. The native-style pass is an AI editorial check, not human native-speaker approval. Final source-assisted QA, semantic preservation evidence, target example naturalness evidence and final export checks are still required before delivery.

## Current Translation Batch SR/SL/LT/LV

2026-05-05 translation batch `sr_sl_lt_lv_v0` was created, native-style QA v1/v2/v3 repaired and structurally checked for all 150 selected rows.

Artifacts:

- translation batch JSONL: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_sr_sl_lt_lv_v0.jsonl`
- translation batch summary: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_sr_sl_lt_lv_v0_summary.md`
- native-style QA v1 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_sr_sl_lt_lv_native_style_qa_v1.md`
- native-style QA v2 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_sr_sl_lt_lv_native_style_qa_v2.md`
- native-style QA v3 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_sr_sl_lt_lv_native_style_qa_v3.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-translation-batch.mjs --batch=sr_sl_lt_lv_v0 --languages=SR,SL,LT,LV
```

Result:

```text
English Core 3000 translation batch OK for english_core_3000_a1_a2_part_001_150_v1: batch=sr_sl_lt_lv_v0, rows=150, languages=SR,SL,LT,LV, no_target_transcriptions=true
```

This batch fills only learner display and translated example fields for `SR`, `SL`, `LT` and `LV`. It deliberately has no target-language transcription columns because English Core first-release transcription remains EN-only. Serbian word/example cells use Cyrillic consistently. Slovenian, Lithuanian and Latvian use native Latin orthography. These languages do not receive artificial articles. The translation checker now enforces Cyrillic-script display fields for `SR` and Latin-script display fields for `SL`, `LT` and `LV`.

Status: `draft_native_style_qa_v3_checked`. This batch does not import Postgres rows, does not create final QA evidence and does not create a Google Sheet. The native-style pass is an AI editorial check, not human native-speaker approval. Final source-assisted QA, semantic preservation evidence, target example naturalness evidence and final export checks are still required before delivery.

## Current Translation Batch ET/IS/HI/BN

2026-05-05 translation batch `et_is_hi_bn_v0` was created, native-style QA v1/v2 and all-language audit v2 repaired, then structurally checked for all 150 selected rows.

Artifacts:

- translation batch JSONL: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_et_is_hi_bn_v0.jsonl`
- translation batch summary: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_et_is_hi_bn_v0_summary.md`
- native-style QA v1 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_et_is_hi_bn_native_style_qa_v1.md`
- native-style QA v2 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_et_is_hi_bn_native_style_qa_v2.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-translation-batch.mjs --batch=et_is_hi_bn_v0 --languages=ET,IS,HI,BN
```

Result:

```text
English Core 3000 translation batch OK for english_core_3000_a1_a2_part_001_150_v1: batch=et_is_hi_bn_v0, rows=150, languages=ET,IS,HI,BN, no_target_transcriptions=true
```

This batch fills only learner display and translated example fields for `ET`, `IS`, `HI` and `BN`. It deliberately has no target-language transcription columns because English Core first-release transcription remains EN-only. Estonian and Icelandic use native Latin orthography. Hindi uses Devanagari. Bengali uses Bengali script. These languages do not receive artificial articles. The translation checker enforces Latin-script display fields for `ET` and `IS`, Devanagari display fields for `HI`, and Bengali display fields for `BN`.

Status: `draft_native_style_qa_v3_checked`. This batch does not import Postgres rows, does not create final QA evidence and does not create a Google Sheet. The native-style pass is an AI editorial check, not human native-speaker approval. Final source-assisted QA, semantic preservation evidence, target example naturalness evidence and final export checks are still required before delivery.
2026-05-05 all-language audit v2 updated this batch to `draft_native_style_qa_v3_checked` by repairing `HI` and `BN` examples for `core3000_0082` / `too` so they preserve excessive degree rather than plain "very".

## Current Translation Batch TL/MY/KM/LO

2026-05-05 translation batch `tl_my_km_lo_v0` was created, native-style QA v3 and all-language audit v2 repaired, then structurally checked for all 150 selected rows.

Artifacts:

- translation batch JSONL: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_tl_my_km_lo_v0.jsonl`
- translation batch summary: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_tl_my_km_lo_v0_summary.md`
- native-style QA v3 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_tl_my_km_lo_native_style_qa_v3.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-translation-batch.mjs --batch=tl_my_km_lo_v0 --languages=TL,MY,KM,LO
```

Result:

```text
English Core 3000 translation batch OK for english_core_3000_a1_a2_part_001_150_v1: batch=tl_my_km_lo_v0, rows=150, languages=TL,MY,KM,LO, no_target_transcriptions=true
```

This batch fills only learner display and translated example fields for `TL`, `MY`, `KM` and `LO`. It deliberately has no target-language transcription columns because English Core first-release transcription remains EN-only. Filipino uses native Latin orthography. Burmese uses Myanmar script. Khmer uses Khmer script. Lao uses Lao script. These languages do not receive artificial articles. The translation checker enforces Latin-script display fields for `TL`, Myanmar-script display fields for `MY`, Khmer-script display fields for `KM`, and Lao-script display fields for `LO`. Native-style QA v3 also normalizes Burmese example sentence endings away from literary final `သည်။` while leaving learner display forms intact.

Status: `draft_native_style_qa_v4_checked`. This batch does not import Postgres rows, does not create final QA evidence and does not create a Google Sheet. The native-style pass is an AI editorial check, not human native-speaker approval. Final source-assisted QA, semantic preservation evidence, target example naturalness evidence and final export checks are still required before delivery.
2026-05-05 all-language audit v2 updated this batch to `draft_native_style_qa_v4_checked` by repairing `MY` for `core3000_0082` / `too` so it preserves excessive degree rather than plain "very".

## Current Translation Batch NE/SI/TA

2026-05-05 translation batch `ne_si_ta_v0` was created, native-style QA v2 and all-language audit v2 repaired, then structurally checked for all 150 selected rows.

Artifacts:

- translation batch JSONL: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_ne_si_ta_v0.jsonl`
- translation batch summary: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_ne_si_ta_v0_summary.md`
- native-style QA v2 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_ne_si_ta_native_style_qa_v2.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-translation-batch.mjs --batch=ne_si_ta_v0 --languages=NE,SI,TA
```

Result:

```text
English Core 3000 translation batch OK for english_core_3000_a1_a2_part_001_150_v1: batch=ne_si_ta_v0, rows=150, languages=NE,SI,TA, no_target_transcriptions=true
```

This batch fills only learner display and translated example fields for `NE`, `SI` and `TA`. It deliberately has no target-language transcription columns because English Core first-release transcription remains EN-only. Nepali uses Devanagari. Sinhala uses Sinhala script. Tamil uses Tamil script. These languages do not receive artificial articles. The translation checker enforces Devanagari-script display fields for `NE`, Sinhala-script display fields for `SI`, and Tamil-script display fields for `TA`.

Status: `draft_native_style_qa_v3_checked`. This batch does not import Postgres rows, does not create final QA evidence and does not create a Google Sheet. The native-style pass is an AI editorial check, not human native-speaker approval. Final source-assisted QA, semantic preservation evidence, target example naturalness evidence and final export checks are still required before delivery.
2026-05-05 all-language audit v2 updated this batch to `draft_native_style_qa_v3_checked` by repairing `NE` and `TA` examples for `core3000_0082` / `too` so they preserve excessive degree rather than plain "very".

## Current Translation Batch TE/KN/ML

2026-05-05 translation batch `te_kn_ml_v0` was created, native-style QA v2 and all-language audit v2 repaired, then structurally checked for all 150 selected rows.

Artifacts:

- translation batch JSONL: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_te_kn_ml_v0.jsonl`
- translation batch summary: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_te_kn_ml_v0_summary.md`
- native-style QA v2 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_te_kn_ml_native_style_qa_v2.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-translation-batch.mjs --batch=te_kn_ml_v0 --languages=TE,KN,ML
```

Result:

```text
English Core 3000 translation batch OK for english_core_3000_a1_a2_part_001_150_v1: batch=te_kn_ml_v0, rows=150, languages=TE,KN,ML, no_target_transcriptions=true
```

This batch fills only learner display and translated example fields for `TE`, `KN` and `ML`. It deliberately has no target-language transcription columns because English Core first-release transcription remains EN-only. Telugu uses Telugu script. Kannada uses Kannada script. Malayalam uses Malayalam script. These languages do not receive artificial articles. The translation checker enforces Telugu-script display fields for `TE`, Kannada-script display fields for `KN`, and Malayalam-script display fields for `ML`.

Status: `draft_native_style_qa_v3_checked`. This batch does not import Postgres rows, does not create final QA evidence and does not create a Google Sheet. The native-style pass is an AI editorial check, not human native-speaker approval. Final source-assisted QA, semantic preservation evidence, target example naturalness evidence and final export checks are still required before delivery.
2026-05-05 all-language audit v2 updated this batch to `draft_native_style_qa_v3_checked` by repairing `TE`, `KN` and `ML` examples for `core3000_0082` / `too` so they preserve excessive degree rather than plain "very".

## Current Translation Batch UZ/KK/AZ

2026-05-05 translation batch `uz_kk_az_v0` was created, native-style QA v2 repaired and structurally checked for all 150 selected rows.

Artifacts:

- translation batch JSONL: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_uz_kk_az_v0.jsonl`
- translation batch summary: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_uz_kk_az_v0_summary.md`
- native-style QA v2 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_uz_kk_az_native_style_qa_v2.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-translation-batch.mjs --batch=uz_kk_az_v0 --languages=UZ,KK,AZ
```

Result:

```text
English Core 3000 translation batch OK for english_core_3000_a1_a2_part_001_150_v1: batch=uz_kk_az_v0, rows=150, languages=UZ,KK,AZ, no_target_transcriptions=true
```

This batch fills only learner display and translated example fields for `UZ`, `KK` and `AZ`. It deliberately has no target-language transcription columns because English Core first-release transcription remains EN-only. Uzbek uses modern Latin Uzbek. Kazakh uses Kazakh Cyrillic. Azerbaijani uses modern Latin Azerbaijani. These languages do not receive artificial articles. The translation checker enforces Latin-script display fields for `UZ` and `AZ`, and Cyrillic-script display fields for `KK`.

Status: `draft_native_style_qa_v2_checked`. This batch does not import Postgres rows, does not create final QA evidence and does not create a Google Sheet. The native-style pass is an AI editorial check, not human native-speaker approval. Final source-assisted QA, semantic preservation evidence, target example naturalness evidence and final export checks are still required before delivery.

## Current Translation Batch KA/HY/TR

2026-05-05 translation batch `ka_hy_tr_v0` was created, native-style QA v2 repaired and structurally checked for all 150 selected rows.

Artifacts:

- translation batch JSONL: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_ka_hy_tr_v0.jsonl`
- translation batch summary: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_ka_hy_tr_v0_summary.md`
- native-style QA v2 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_ka_hy_tr_native_style_qa_v2.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-translation-batch.mjs --batch=ka_hy_tr_v0 --languages=KA,HY,TR
```

Result:

```text
English Core 3000 translation batch OK for english_core_3000_a1_a2_part_001_150_v1: batch=ka_hy_tr_v0, rows=150, languages=KA,HY,TR, no_target_transcriptions=true
```

This batch fills only learner display and translated example fields for `KA`, `HY` and `TR`. It deliberately has no target-language transcription columns because English Core first-release transcription remains EN-only. Georgian uses Georgian script. Armenian uses Armenian script. Turkish uses modern Turkish Latin orthography. These languages do not receive artificial articles. The translation checker enforces Georgian-script display fields for `KA`, Armenian-script display fields for `HY`, and Latin-script display fields for `TR`.

Status: `draft_native_style_qa_v2_checked`. This batch does not import Postgres rows, does not create final QA evidence and does not create a Google Sheet. The native-style pass is an AI editorial check, not human native-speaker approval. Final source-assisted QA, semantic preservation evidence, target example naturalness evidence and final export checks are still required before delivery.

## Current Translation Batch SW/PT-BR/ES-419

2026-05-05 translation batch `sw_pt_br_es_419_v0` was created, native-style QA v2 repaired and structurally checked for all 150 selected rows.

Artifacts:

- translation batch JSONL: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_sw_pt_br_es_419_v0.jsonl`
- translation batch summary: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_sw_pt_br_es_419_v0_summary.md`
- native-style QA v2 report: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_translation_batch_sw_pt_br_es_419_native_style_qa_v2.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-translation-batch.mjs --batch=sw_pt_br_es_419_v0 --languages=SW,PT-BR,ES-419
```

Result:

```text
English Core 3000 translation batch OK for english_core_3000_a1_a2_part_001_150_v1: batch=sw_pt_br_es_419_v0, rows=150, languages=SW,PT-BR,ES-419, no_target_transcriptions=true
```

This batch fills only learner display and translated example fields for `SW`, `PT-BR` and `ES-419`. It deliberately has no target-language transcription columns because English Core first-release transcription remains EN-only. Swahili uses standard Latin-script Swahili with noun class forms where learner-useful and no artificial articles. `PT-BR` is a Brazilian Portuguese regional layer over the checked `PT` batch with Brazil-specific overrides such as `celular`, `xícara`, `café da manhã` and `você/seu` forms. `ES-419` is a Latin American Spanish regional layer over the checked `ES` batch and avoids Spain-only vocabulary such as `coger`.

Status: `draft_native_style_qa_v3_checked`. This batch completes the 54-language text/example draft coverage for the first English Core 3000 release. Native-style QA v2 repaired Swahili calques/nonstandard spelling, Brazilian Portuguese rows that inherited European Portuguese forms, and a few Latin American Spanish regional-neutrality issues. All-language audit v2 repaired `PT-BR` display/example alignment for `core3000_0028` / `will`. This batch does not import Postgres rows, does not create final QA evidence and does not create a Google Sheet. The native-style pass is an AI editorial check, not human native-speaker approval. Final source-assisted QA, semantic preservation evidence, target example naturalness evidence and final export checks are still required before delivery.

## Current All-Language Native-Style Audit

2026-05-05 all-language native-style audit v2 was run across the first-release 150-row x 54-language matrix.

Artifacts:

- audit JSON: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_all_language_native_style_audit_v2.json`
- audit summary: `outputs/english-core-3000/translation-batches/english_core_3000_a1_a2_part_001_150_v1_all_language_native_style_audit_v2.md`

Checked scope:

- 150 rows;
- 54 language columns from `config/language-order.json`;
- 16,200 display/example cells;
- all multilingual translation batches;
- `EN-GB` text layer;
- regional `PT`/`PT-BR` and `ES`/`ES-419` scans;
- exact English-fallback and comparable-cognate scans;
- non-Latin script leakage scan;
- high-risk semantic row spot check for function words and ambiguous English words.

Result:

```text
all_language_native_style_audit_v2: rows=150, language_columns=54, expected_cells=16200, blockers=0, warnings=0
```

Repairs made before the passing v2 audit:

- `core3000_0082` / `too`: repaired `HI`, `BN`, `MY`, `NE`, `TA`, `TE`, `KN` and `ML` examples so they preserve excessive degree rather than plain "very".
- `core3000_0028` / `will`: repaired `PT-BR` display to match the `vou + infinitivo` example.

Accepted cognates after review:

- `PL`, `HR`, `SL` `problem`;
- `RO` `a include`;
- `PL` `system`.

This audit is an AI editorial/native-style pass, not external native-speaker approval. It does not import Postgres rows, does not create final QA evidence and does not create a Google Sheet. Source-assisted readiness is tracked separately below.

## Current Source-Assisted Readiness

2026-05-05 source-assisted readiness v1 was run as a read-only release gate for `english_core_3000_a1_a2_part_001_150_v1`.

Artifacts:

- readiness JSON: `outputs/english-core-3000/readiness/english_core_3000_a1_a2_part_001_150_v1_source_assisted_readiness_v1.json`
- readiness summary: `outputs/english-core-3000/readiness/english_core_3000_a1_a2_part_001_150_v1_source_assisted_readiness_v1.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-source-assisted-readiness.mjs english_core_3000_a1_a2_part_001_150_v1
```

Result:

```text
English Core 3000 source-assisted readiness OK for english_core_3000_a1_a2_part_001_150_v1: rows=150, languages=54, cells=16200/16200, warnings=0
```

Readiness scope:

- source snapshot, candidate pool, base draft, row review, EN source transcriptions, duplicate/reuse review, EN-GB text layer and Course Metadata artifacts exist and match the contract;
- all 15 translation batches are present and checked;
- 150 rows x 54 language columns x word/example cells are filled, for 16,200 cells;
- only `transcription_EN` and `example_transcription_EN` are filled;
- target-language transcription rows are 0;
- `EN-GB` transcription rows are 0;
- all-language native-style audit v2 is clean with 0 blockers and 0 warnings;
- no Postgres changes and no Google Sheet creation.

Warnings before delivery:

- None. Final Google Sheet delivery still requires a separate delivery approval and export/readback run.

This gate means the first release is assembled as a coherent source-assisted course candidate. It is not delivery approval, not Postgres import approval and not Google Sheet approval.

## Current License Attribution Review

2026-05-05 license attribution review v1 was accepted for the first English Core release.

Artifacts:

- license attribution JSON: `outputs/english-core-3000/license/english_core_3000_a1_a2_part_001_150_v1_license_attribution_review_v1.json`
- license attribution summary: `outputs/english-core-3000/license/english_core_3000_a1_a2_part_001_150_v1_license_attribution_review_v1.md`

Checked command:

```bash
node scripts/english-core/build-core-3000-license-attribution-review.mjs english_core_3000_a1_a2_part_001_150_v1
```

Packaging decision:

- NGSL 1.2 remains the primary source-list candidate and must be attributed under CC BY-SA 4.0.
- The final release package must include the NGSL attribution, license URL, ShareAlike notice and change/original-content note.
- CEFR-J Wordlist Version 1.6 remains a level/POS crosscheck and must be acknowledged/cited.
- Oxford 3000/5000 remains benchmark only. Do not use Oxford source data or official/certified/endorsed claims.

Required final release notices:

- `New General Service List by Browne, C., Culligan, B., and Phillips, J. is licensed under CC BY-SA 4.0. Retrieved from https://www.newgeneralservicelist.com/new-general-service-list.`
- `The CEFR-J Wordlist Version 1.6. Compiled by Yukio Tono, Tokyo University of Foreign Studies. Retrieved from https://www.cefr-j.org/download.html.`

This is an operational packaging decision, not legal advice. It does not import Postgres rows and does not create a Google Sheet.

## Current Local Workbook Export

2026-05-05 the first-release local workbook package was exported and checked.

Artifacts:

- workbook XLSX: `outputs/english-core-3000/final/FlashcardsLuna_US_English_Core_3000_A1_A2_Part_001_final.xlsx`
- workbook manifest: `outputs/english-core-3000/final/FlashcardsLuna_US_English_Core_3000_A1_A2_Part_001_final_manifest.json`

Checked commands:

```bash
NODE_PATH=/Users/lali/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/lali/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/english-core/export-core-3000-workbook.mjs english_core_3000_a1_a2_part_001_150_v1
NODE_PATH=/Users/lali/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/lali/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/english-core/check-core-3000-workbook-export.mjs english_core_3000_a1_a2_part_001_150_v1
```

Result:

```text
English Core 3000 workbook export OK for english_core_3000_a1_a2_part_001_150_v1: rows=150, headers=130, languages=54, google_sheet_created=false
```

Workbook shape:

- main sheet: `English Core 3000`;
- 150 content rows;
- 130 columns;
- 54 word/display language columns, including `EN` and `EN-GB`;
- 54 `example_` language columns, including `example_EN` and `example_EN-GB`;
- `transcription_EN` and `example_transcription_EN` only;
- service sheets: `Course Metadata`, `_README`, `_languages`, `_source_contract`, `_source_snapshot`, `_benchmark_audit`, `_source_assisted_qa`, `_source_decisions`, `_release_metadata`.

Workbook SHA-256:

```text
178e1b75314f993789abbeae6a850c430230792dc97578e0b8eb77566d01e440
```

This is the current local XLSX export package after focused low-resource language polish. It was used to update the existing Google Sheet and does not import Postgres rows.

## Current Google Sheet Delivery

2026-05-05 the first-release local workbook was uploaded as a native Google Sheet and readback-verified. After focused low-resource language polish on the same date, the existing Google Sheet was updated in place and readback-verified again.

Google Sheet:

- title: `FlashcardsLuna_US_English_Core_3000_A1_A2_Part_001`
- file id: `1Sd7lSn-_elmyg0uS7opYvsyqSXsUnbLqLo9duKkVqag`
- URL: `https://docs.google.com/spreadsheets/d/1Sd7lSn-_elmyg0uS7opYvsyqSXsUnbLqLo9duKkVqag/edit?usp=drivesdk`
- Drive folder id: `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`
- verified in folder: `true`

Delivery manifest:

- `outputs/english-core-3000/final/FlashcardsLuna_US_English_Core_3000_A1_A2_Part_001_final_delivery.json`

Upload/readback commands:

```bash
node scripts/upload-spreadsheet-to-drive-folder.mjs outputs/english-core-3000/final/FlashcardsLuna_US_English_Core_3000_A1_A2_Part_001_final.xlsx --file-id=1Sd7lSn-_elmyg0uS7opYvsyqSXsUnbLqLo9duKkVqag --title=FlashcardsLuna_US_English_Core_3000_A1_A2_Part_001
NODE_PATH=/Users/lali/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/lali/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/english-core/check-core-3000-google-sheet-readback.mjs english_core_3000_a1_a2_part_001_150_v1
```

Result:

```text
English Core Google Sheet readback OK: release=english_core_3000_a1_a2_part_001_150_v1, main_rows=151, main_columns=130, cells=19795, method=sheets_values_english_core_main_full_plus_course_metadata
```

Readback scope:

- full main `English Core 3000` sheet: 151 rows including header x 130 columns;
- `Course Metadata`: 3 rows x 55 columns;
- checked cells: 19,795;
- readback status: `verified`;
- workbook SHA-256: `178e1b75314f993789abbeae6a850c430230792dc97578e0b8eb77566d01e440`;
- upload mode after polish: `update_existing`;
- Postgres changes: `false`.

## Current Per-Language Quality Assessment

2026-05-05 per-language quality scores v2 were generated after focused low-resource language polish and Google Sheet readback for the delivered first-release Google Sheet.

Artifacts:

- quality JSON: `outputs/english-core-3000/qa/english_core_3000_a1_a2_part_001_150_v1_per_language_quality_scores_v2.json`
- quality summary: `outputs/english-core-3000/qa/english_core_3000_a1_a2_part_001_150_v1_per_language_quality_scores_v2.md`

Checked command:

```bash
node scripts/english-core/audit-core-3000-per-language-quality-scores.mjs
```

Result:

```text
passed_ai_native_style_quality_assessment: languages=54, min=96%, max=99%, average=97.2%
```

Scoring basis:

- focused low-resource language polish repaired high-risk examples/display forms in `MY`, `KM`, `LO`, `SI`, `SR`, `SL`, `LT`, `LV`, `IS`, `TA`, `TE`, `KN`, `HY` and `SW`;
- all-language native-style audit v2: 150 rows, 54 language columns, 16,200 word/example cells, 0 blockers and 0 warnings;
- Course Metadata native-style QA v1: 0 blockers and 0 warnings;
- delivered Google Sheet readback: 19,795 checked cells, status `verified`;
- residual risk is higher for smaller-resource languages where external human native-speaker approval has not been collected.

This is not external native-speaker approval. It is a structured AI editorial/native-style confidence score for each language after deterministic QA, metadata QA and Google Sheet readback. It does not change the delivered Google Sheet, does not create a new Google Sheet and does not import Postgres rows.

## Current Duplicate/Reuse Review

2026-05-05 duplicate/reuse review v1 was created as a read-only Postgres comparison.

Artifacts:

- duplicate/reuse JSON report: `outputs/english-core-3000/reuse/english_core_3000_a1_a2_part_001_150_v1_duplicate_reuse_review_v1.json`
- duplicate/reuse summary: `outputs/english-core-3000/reuse/english_core_3000_a1_a2_part_001_150_v1_duplicate_reuse_review_v1_summary.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-duplicate-reuse.mjs
```

Result:

```text
English Core 3000 duplicate/reuse review written: outputs/english-core-3000/reuse/english_core_3000_a1_a2_part_001_150_v1_duplicate_reuse_review_v1.json rows=150 existing=110
```

Duplicate/reuse counts:

| Decision | Rows |
| --- | ---: |
| `new_meaning_candidate` | 150 |

The report compared all 150 English Core rows against 110 active existing Postgres `meaning_units`. It found no existing surface/POS/fingerprint reuse candidates. This is read-only evidence: it does not create content sets, memberships, meaning units, translations or Google Sheet output.

## Snapshot Contract

Before a first candidate pool can be built, create a versioned source snapshot under a future `outputs/english-core-3000/source/` path. The snapshot must include:

- downloaded source files or normalized extracts, if allowed;
- source URL, retrieval date and file hash for each source;
- licence/terms note for each source;
- attribution text required in release metadata;
- source field mapping;
- included/excluded source columns;
- normalized headword/POS/level rows;
- Oxford benchmark coverage audit as a separate comparison, not as source data.

The first source snapshot should not include Oxford definitions, examples, pronunciations, exact order or proprietary explanatory copy.

## Candidate Pool Shape

The first release candidate pool should be a JSONL artifact with at least 300 rows for 150 selected rows. Each row should record:

- `source_candidate_id`
- `source_headword`
- `normalized_headword`
- `part_of_speech`
- `ngsl_rank`
- `ngsl_band`
- `cefr_j_level`
- `oxford_benchmark_match`
- `source_support`
- `duplicate_risk`
- `sense_split_risk`
- `translation_coverage_risk`
- `example_feasibility`
- `selection_decision`: `selected`, `backup`, `excluded`, or `needs_review`
- `decision_note`

Selected rows must later get LunaCards-owned:

- `meaning_id`
- `meaning_note`
- `semantic_scene`
- source-language example
- QA evidence

## Future Google Sheet Naming

When the release is approved, generated, QA-passed and delivered, it should be saved to the same Google Drive folder as other final LunaCards workbooks: `Слова для FlashcarsLuna`.

Proposed first final Google Sheet title:

```text
FlashcardsLuna_US_English_Core_3000_A1_A2_Part_001
```

Human-facing workbook title:

```text
LunaCards US English Core 3000 - A1/A2 Part 1
```

Later files should keep the same naming pattern:

```text
FlashcardsLuna_US_English_Core_3000_<LEVEL>_Part_<NNN>
```

Do not use `Oxford` in the Google Sheet title unless Oxford permission is explicitly confirmed. Oxford remains a benchmark audit layer, not the product/source name.

## Course Metadata Sheet

The final workbook must include the same localized `Course Metadata` sheet pattern used by the room/deck workbooks.

Sheet name:

```text
Course Metadata
```

Shape:

| Cell / row | Meaning |
| --- | --- |
| `A1` | blank |
| row 1 from `B1` | spreadsheet language codes in the same order as the first-release workbook languages, including `EN-GB` |
| row 2 | `Title` values, one localized title per language |
| row 3 | `Description` values, one localized description per language |

Rules:

- the sheet is required before final Google Sheet delivery;
- the first release uses 54 metadata language columns from `config/language-order.json`, including `EN-GB`;
- every language column must have a localized `Title` and `Description`;
- `Title` and `Description` must end with the configured sentence terminator for the language, for example a period in English;
- `Description` must include the localized level signal as a separate sentence, matching the ordinary deck metadata rule;
- metadata must describe this release, not Oxford and not English learning in general;
- do not use `Oxford`, `official`, `certified` or `endorsed` in metadata unless permission changes.

Draft EN metadata pattern:

| Field | Draft value |
| --- | --- |
| `Title` | `US English Core.` |
| `Description` | `Everyday core words. Elementary level.` |
| `level_signal` | `Elementary level` |

Localized metadata v0 has been prepared and language-QA checked for all 54 first-release language columns.

Artifacts:

- metadata config: `config/english-core-3000-course-metadata-v0.json`
- metadata JSON: `outputs/english-core-3000/course-metadata/english_core_3000_a1_a2_part_001_150_v1_course_metadata_v0.json`
- sheet preview TSV: `outputs/english-core-3000/course-metadata/english_core_3000_a1_a2_part_001_150_v1_course_metadata_sheet_preview.tsv`
- metadata summary: `outputs/english-core-3000/course-metadata/english_core_3000_a1_a2_part_001_150_v1_course_metadata_v0_summary.md`
- metadata native-style QA JSON: `outputs/english-core-3000/course-metadata/english_core_3000_a1_a2_part_001_150_v1_course_metadata_native_style_qa_v1.json`
- metadata native-style QA summary: `outputs/english-core-3000/course-metadata/english_core_3000_a1_a2_part_001_150_v1_course_metadata_native_style_qa_v1.md`

Checked command:

```bash
node scripts/english-core/check-core-3000-course-metadata.mjs english_core_3000_a1_a2_part_001_150_v1
node scripts/english-core/audit-core-3000-course-metadata-native-style.mjs english_core_3000_a1_a2_part_001_150_v1
```

Result:

```text
English Core 3000 Course Metadata OK for english_core_3000_a1_a2_part_001_150_v1: rows=54, title_limit=25, description_limit=60
English Core 3000 Course Metadata native-style QA OK for english_core_3000_a1_a2_part_001_150_v1: rows=54, languages=54, blockers=0, warnings=0
```

Metadata v0 is `metadata_language_qa_v1_checked`. This is AI editorial/native-style QA, not external native-speaker approval. It does not generate vocabulary translations, import Postgres rows or create a Google Sheet.

## Workbook Columns

Main sheet name:

```text
English Core 3000
```

Fixed source/metadata columns:

- `release_id`
- `course_id`
- `row_id`
- `core_item_id`
- `meaning_id`
- `source_language`
- `source_variant`
- `source_headword`
- `part_of_speech`
- `sense_no`
- `core_band`
- `level_min`
- `level_max`
- `source_rank`
- `benchmark_membership`
- `source_status`
- `meaning_note`
- `semantic_scene`

Then translation columns. The first release keeps `EN` as the US English source/default column and includes `EN-GB` as a British English text/example regional column:

```text
EN, ES, FR, DE, IT, PT, RU, ZH, JA, KO, VI, TH, MS, ID, PL, NL, SV, NO, DA, FI, CS, SK, HU, RO, BG, HR, SR, SL, LT, LV, ET, IS, HI, BN, TL, MY, KM, LO, NE, SI, TA, TE, KN, ML, UZ, KK, AZ, KA, HY, TR, SW, PT-BR, ES-419, EN-GB
```

Then example columns in the same order, prefixed with `example_`:

```text
example_EN, example_ES, example_FR, example_DE, example_IT, example_PT, example_RU, example_ZH, example_JA, example_KO, example_VI, example_TH, example_MS, example_ID, example_PL, example_NL, example_SV, example_NO, example_DA, example_FI, example_CS, example_SK, example_HU, example_RO, example_BG, example_HR, example_SR, example_SL, example_LT, example_LV, example_ET, example_IS, example_HI, example_BN, example_TL, example_MY, example_KM, example_LO, example_NE, example_SI, example_TA, example_TE, example_KN, example_ML, example_UZ, example_KK, example_AZ, example_KA, example_HY, example_TR, example_SW, example_PT-BR, example_ES-419, example_EN-GB
```

Final status columns:

- `qa_status`
- `qa_notes`

US English-only transcription columns:

- `transcription_EN`: IPA or learner-safe US English pronunciation for the source word/display form.
- `example_transcription_EN`: pronunciation/transcription support for the US English source example.

## Article And Display Form Policy

This course uses the existing LunaCards article/display rules from [Card Content Model](card-content-model.md) and [Language Specific Rules](language-specific-rules.md).

For US English source rows:

- countable singular nouns use `a/an` in learner display form, for example `a book`, `an apple`;
- plural nouns do not take `a/an`;
- uncountable nouns do not get artificial `a/an`;
- verbs use `to + base verb`, for example `to go`;
- adjectives, adverbs, pronouns, prepositions and other function words use base learner form without artificial articles.

For translation columns:

- languages with learner-useful articles/gender markers show them where normal, for example Spanish `el/la`, French `le/la/l'`, German `der/die/das`;
- languages without articles do not receive artificial articles;
- classifier, gender, case or marker behavior follows the language-specific rules;
- the user-facing cell is the learner display form, equivalent to `word_with_article_or_marker` in ordinary deck exports.

Article/gender/marker consistency remains a QA gate before final delivery.

Service sheets:

- `_README`
- `_languages`
- `_source_contract`
- `_source_snapshot`
- `_benchmark_audit`
- `_source_assisted_qa`
- `_source_decisions`
- `_release_metadata`

No non-English target-language transcription columns are part of this course workbook. `EN-GB` word/example text is included, but `EN-GB` transcription is out of scope for the first release. The learner is studying English through the US source pronunciation first, so transcription support belongs to US English source word/example only. If we later decide to add British pronunciation support or pronunciation support for every target language, that requires a separate approval and a wider transcription QA contract.

## First Release Selection Rules

For `english_core_3000_a1_a2_part_001_150_v1`, prefer:

- high-frequency NGSL A1/A2-friendly words;
- concrete and high-utility function words only when they can become useful flashcard rows;
- clear POS/sense rows;
- words with strong multilingual translation-source support;
- words that can support short natural examples.

Defer or exclude:

- words that need grammar-course treatment rather than vocabulary cards;
- highly polysemous words where first-sense selection is unclear;
- words already covered in current ordinary decks unless explicit reuse is documented;
- terms whose first useful scene is domain-specific and belongs to a later topic deck;
- Oxford-only candidates until source permission changes.

## QA Gates Before Generation

Minimum gates before any card generation:

1. `source_snapshot_hashes`: every external source file/extract has a hash and retrieval metadata.
2. `license_attribution_review`: NGSL CC BY-SA impact and CEFR-J citation requirements are accepted or the source is downgraded to cross-check only.
3. `candidate_pool_min_size`: at least 300 candidate rows for the 150-row first release.
4. `selection_decision_coverage`: every candidate has selected/backup/excluded/needs_review with notes.
5. `sense_split_review`: selected rows have clear POS/sense boundaries.
6. `duplicate_reuse_review`: selected rows are checked against existing LunaCards meanings/decks.
7. `benchmark_audit`: Oxford coverage is measured without copying restricted Oxford content.
8. `english_transcription_source_review`: English word and English example transcription must be source-backed or explicitly reviewed.
9. `source_assisted_preflight_design`: local dictionaries/corpora are wired for 54-language translation-source checks.
10. `source_assisted_readiness`: release artifacts must merge into a complete 150-row x 54-language matrix with 0 blockers.

## Next Build Step

The row-level review, EN transcription, EN-GB layer, Course Metadata language QA, license attribution review, all translation batches, source-assisted readiness gate, local workbook export and Google Sheet delivery/readback are now complete for the first 150-row candidate. The next executable step is only post-delivery maintenance if issues are found, or planning the next English Core release.

Current check scripts:

```bash
node scripts/english-core/build-core-3000-source-snapshot.mjs --contract=config/english-core-3000-source-contract-v0.json --ngsl=/path/to/ngsl.csv --cefrj=/path/to/cefrj.csv
node scripts/english-core/check-core-3000-source-snapshot.mjs english_core_3000_a1_a2_part_001_150_v1
node scripts/english-core/build-core-3000-candidate-pool.mjs --contract=config/english-core-3000-source-contract-v0.json
node scripts/english-core/check-core-3000-candidate-pool.mjs english_core_3000_a1_a2_part_001_150_v1
node scripts/english-core/build-core-3000-base-draft.mjs --contract=config/english-core-3000-source-contract-v0.json
node scripts/english-core/check-core-3000-base-draft.mjs english_core_3000_a1_a2_part_001_150_v1
node scripts/english-core/apply-core-3000-row-review.mjs
node scripts/english-core/apply-core-3000-ordinary-row-review.mjs
node scripts/english-core/check-core-3000-row-review.mjs english_core_3000_a1_a2_part_001_150_v1
node scripts/english-core/apply-core-3000-en-transcriptions.mjs
node scripts/english-core/check-core-3000-en-transcriptions.mjs english_core_3000_a1_a2_part_001_150_v1
node scripts/english-core/check-core-3000-duplicate-reuse.mjs
node scripts/english-core/check-core-3000-course-metadata.mjs english_core_3000_a1_a2_part_001_150_v1
node scripts/english-core/audit-core-3000-course-metadata-native-style.mjs english_core_3000_a1_a2_part_001_150_v1
node scripts/english-core/build-core-3000-license-attribution-review.mjs english_core_3000_a1_a2_part_001_150_v1
node scripts/english-core/check-core-3000-source-assisted-readiness.mjs english_core_3000_a1_a2_part_001_150_v1
NODE_PATH=/Users/lali/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/lali/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/english-core/export-core-3000-workbook.mjs english_core_3000_a1_a2_part_001_150_v1
NODE_PATH=/Users/lali/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/lali/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/english-core/check-core-3000-workbook-export.mjs english_core_3000_a1_a2_part_001_150_v1
node scripts/upload-spreadsheet-to-drive-folder.mjs outputs/english-core-3000/final/FlashcardsLuna_US_English_Core_3000_A1_A2_Part_001_final.xlsx --folder-id=1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei --title=FlashcardsLuna_US_English_Core_3000_A1_A2_Part_001
NODE_PATH=/Users/lali/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/lali/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/english-core/check-core-3000-google-sheet-readback.mjs english_core_3000_a1_a2_part_001_150_v1
```

These scripts normalize/check source-list data, produce artifacts under `outputs/english-core-3000/`, export a local workbook and deliver the first release to Google Sheets after approval. They must not import into Postgres.
