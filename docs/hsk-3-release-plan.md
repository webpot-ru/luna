# HSK 3.0 Release Plan

This document is the source of truth for the LunaCards HSK 3.0 release contour.

HSK 3.0 is separate from [HSK Classic Release Plan](hsk-classic-release-plan.md). Classic HSK 2.0 workbooks remain delivered products and must not be regenerated or renamed as HSK 3.0.

## Scope

HSK 3.0 releases are course/exam workbooks where:

- source rows come from the official new HSK syllabus, not from the classic HSK 2.0 source snapshots;
- one workbook should correspond to one HSK 3.0 level or a clearly documented slice of a level;
- Chinese source rows are the source of truth;
- English may be used as a pivot for translation/source-candidate lookup, but it must not override the Chinese source word, pinyin, level, part of speech or row order;
- first sheet is buyer-facing and starts with Chinese source columns: `ZH`, `ZH transcription`, then target-language translations in the fixed order from `config/language-order.json` excluding `ZH`;
- target-language columns are translations only; target-language transcription/audio stays out of scope unless a later contract explicitly changes this.

## Official Source

Current official source checked on 2026-06-03:

```text
ChineseTest HSK page: https://www.chinesetest.cn/hsk
Official syllabus PDF: https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B2%EF%BC%88%E8%AF%8D%E6%B1%87%E3%80%81%E6%B1%89%E5%AD%97%E3%80%81%E8%AF%AD%E6%B3%95%EF%BC%89.pdf
PDF title: HSK 考试大纲 / Syllabus for the Chinese Proficiency Test
Publisher shown in PDF: 中外语言交流合作中心
Publication / implementation shown in PDF: 2025-11 发布, 2026-07 实施
Local snapshot: outputs/hsk/source/hsk3_official_syllabus_vocab_chars_grammar_202511_202607.pdf
```

ChineseTest describes HSK 3.0 as a "Three Stages, Nine Levels" framework and states that the new syllabus covers tasks, topics, vocabulary, grammar and Chinese characters. The current local HSK 3.0 start uses the vocabulary/characters/grammar PDF linked from that official page as the source of truth for vocabulary rows.

2026-06-12 source-boundary audit:

- the current official local PDF vocabulary table ends Level 6 at row `5400`, not `5000`;
- combined advanced Levels 7-9 start at row `5401` and end at row `11000`;
- `hsk3_level_6_1400_v1` remains a published/readback-verified legacy snapshot for rows `3601-5000`, but it is superseded at the source-boundary layer and must not be treated as the full current official Level 6;
- corrected local source/reuse prep now uses `hsk3_level_6_1800_v2` for rows `3601-5400` and `hsk3_level_7_9_5600_v1` for rows `5401-11000`;
- corrected Level 6 v2 workbook, isolated Docker/Postgres import and Google Sheet update/readback are complete; the existing native Sheet id `1OKXj2Esw2XO1AKqK3aDcOMHOTjP2BOsFuGNMmaInm30` now points to the full 1800-row v2 delivery.

The first initialized source snapshot is:

```text
release_id: hsk3_level_1_300_v1
hsk_version: HSK 3.0
hsk_level: 1
row_count: 300
source: outputs/hsk/source/hsk3_level_1_300_v1.source.json
overlap_report: outputs/hsk/qa/hsk3_level_1_300_v1_classic_overlap_20260603.json
source_gate: outputs/hsk/qa/hsk3_level_1_300_v1_source_gate_20260603.json
reuse_map: outputs/hsk/qa/hsk3_level_1_300_v1_classic_reuse_map_20260604.json
contract: config/hsk3-release-contract-v1.json
examples: config/hsk3-level1-examples.json
en_glosses: config/hsk3-level1-en-glosses.json
classic_target_translation_layer: config/hsk3-level1-classic-reuse-target-translations.json
manual_target_translation_layer: config/hsk3-level1-manual-target-translations.json
course_metadata: config/hsk3-level1-course-metadata.json
workbook: outputs/hsk/hsk3_level_1_300_v1.xlsx
chinese_gate: outputs/hsk/qa/hsk3_level_1_300_v1_chinese_gate_20260604.json
workbook_gate: outputs/hsk/qa/hsk3_level_1_300_v1_workbook_gate_20260604.json
db_import_report: outputs/hsk/qa/hsk3_level_1_300_v1_db_import_20260604.json
google_sheet_delivery: outputs/hsk/hsk3_level_1_300_v1_delivery.json
```

The second initialized source/prep snapshot is:

```text
release_id: hsk3_level_2_200_v1
hsk_version: HSK 3.0
hsk_level: 2
official_source_order: 301-500
row_count: 200
source: outputs/hsk/source/hsk3_level_2_200_v1.source.json
overlap_report: outputs/hsk/qa/hsk3_level_2_200_v1_classic_overlap_20260604.json
source_gate: outputs/hsk/qa/hsk3_level_2_200_v1_source_gate_20260604.json
reuse_map: outputs/hsk/qa/hsk3_level_2_200_v1_classic_reuse_map_20260604.json
examples: config/hsk3-level2-examples.json
en_glosses: config/hsk3-level2-en-glosses.json
classic_target_translation_layer: config/hsk3-level2-classic-reuse-target-translations.json
manual_target_translation_layer: config/hsk3-level2-manual-target-translations.json
course_metadata: config/hsk3-level2-course-metadata.json
workbook: outputs/hsk/hsk3_level_2_200_v1.xlsx
workbook_gate: outputs/hsk/qa/hsk3_level_2_200_v1_workbook_gate_20260604.json
manual_target_gate: outputs/hsk/qa/hsk3_level_2_200_v1_manual_target_translation_gate_20260604.json
sample_quality_audit: outputs/hsk/qa/hsk3_level_2_200_v1_sample_10_per_language_quality_20260604.json
db_import_report: outputs/hsk/qa/hsk3_level_2_200_v1_db_import_20260604.json
google_sheet_delivery: outputs/hsk/hsk3_level_2_200_v1_delivery.json
```

The third initialized source/prep snapshot is:

```text
release_id: hsk3_level_3_500_v1
hsk_version: HSK 3.0
hsk_level: 3
official_source_order: 501-1000
row_count: 500
source: outputs/hsk/source/hsk3_level_3_500_v1.source.json
overlap_report: outputs/hsk/qa/hsk3_level_3_500_v1_classic_overlap_20260604.json
source_gate: outputs/hsk/qa/hsk3_level_3_500_v1_source_gate_20260604.json
reuse_map: outputs/hsk/qa/hsk3_level_3_500_v1_classic_reuse_map_20260604.json
examples: config/hsk3-level3-examples.json
en_glosses: config/hsk3-level3-en-glosses.json
classic_target_translation_layer: config/hsk3-level3-classic-reuse-target-translations.json
manual_target_translation_layer: config/hsk3-level3-manual-target-translations.json
course_metadata: config/hsk3-level3-course-metadata.json
workbook: outputs/hsk/hsk3_level_3_500_v1.xlsx
workbook_gate: outputs/hsk/qa/hsk3_level_3_500_v1_workbook_gate_20260604.json
manual_target_gate: outputs/hsk/qa/hsk3_level_3_500_v1_manual_target_translation_gate_20260604.json
sample_quality_audit: outputs/hsk/qa/hsk3_level_3_500_v1_sample_10_per_language_quality_20260604.json
native_style_sample_audit: outputs/hsk/qa/hsk3_level_3_500_v1_native_style_sample_5_per_language_20260605.json
db_import_report: outputs/hsk/qa/hsk3_level_3_500_v1_db_import_20260604.json
google_sheet_delivery: outputs/hsk/hsk3_level_3_500_v1_delivery.json
```

The fourth complete delivery snapshot is:

```text
release_id: hsk3_level_4_1000_v1
hsk_version: HSK 3.0
hsk_level: 4
official_source_order: 1001-2000
row_count: 1000
source: outputs/hsk/source/hsk3_level_4_1000_v1.source.json
overlap_report: outputs/hsk/qa/hsk3_level_4_1000_v1_classic_overlap_20260605.json
source_gate: outputs/hsk/qa/hsk3_level_4_1000_v1_source_gate_20260605.json
reuse_map: outputs/hsk/qa/hsk3_level_4_1000_v1_classic_reuse_map_20260605.json
examples: config/hsk3-level4-examples.json
en_glosses: config/hsk3-level4-en-glosses.json
manual_chinese_examples: config/hsk3-level4-manual-examples.tsv
chinese_gate: outputs/hsk/qa/hsk3_level_4_1000_v1_chinese_gate_20260605.json
classic_target_translation_layer: config/hsk3-level4-classic-reuse-target-translations.json (partial Classic-reuse only)
manual_target_batch_es_fr_de_it_pt_ru: config/hsk3-level4-manual-translations-es-fr-de-it-pt-ru.tsv (389/389 HSK3-only rows filled for ES/FR/DE/IT/PT/RU)
manual_target_batch_ja_ko_vi_th_ms_id: config/hsk3-level4-manual-translations-ja-ko-vi-th-ms-id.tsv (389/389 HSK3-only rows filled for JA/KO/VI/TH/MS/ID)
manual_target_batch_pl_nl_sv_no_da_fi: config/hsk3-level4-manual-translations-pl-nl-sv-no-da-fi.tsv (389/389 HSK3-only rows filled for PL/NL/SV/NO/DA/FI)
manual_target_batch_cs_sk_hu_ro_bg_hr: config/hsk3-level4-manual-translations-cs-sk-hu-ro-bg-hr.tsv (389/389 HSK3-only rows filled for CS/SK/HU/RO/BG/HR)
manual_target_batch_sr_sl_lt_lv_et_is: config/hsk3-level4-manual-translations-sr-sl-lt-lv-et-is.tsv (389/389 HSK3-only rows filled for SR/SL/LT/LV/ET/IS)
manual_target_batch_hi_bn_tl: config/hsk3-level4-manual-translations-hi-bn-tl.tsv (389/389 HSK3-only rows filled for HI/BN/TL)
manual_target_batch_my_km_lo_ne: config/hsk3-level4-manual-translations-my-km-lo-ne.tsv (389/389 HSK3-only rows filled for MY/KM/LO/NE)
manual_target_batch_si_ta: config/hsk3-level4-manual-translations-si-ta.tsv (389/389 HSK3-only rows filled for SI/TA)
manual_target_batch_te_kn: config/hsk3-level4-manual-translations-te-kn.tsv (389/389 HSK3-only rows filled for TE/KN)
manual_target_batch_ml_kk: config/hsk3-level4-manual-translations-ml-kk.tsv (389/389 HSK3-only rows filled for ML/KK)
manual_target_batch_ka_hy: config/hsk3-level4-manual-translations-ka-hy.tsv (389/389 HSK3-only rows filled for KA/HY)
manual_target_batch_ptbr_es419: config/hsk3-level4-manual-translations-ptbr-es419.tsv (389/389 HSK3-only rows filled for PT-BR/ES-419)
manual_target_batch_tr_sw_az_uz: config/hsk3-level4-manual-translations-tr-sw-az-uz.tsv (389/389 HSK3-only rows filled for TR/SW/AZ/UZ)
manual_target_translation_layer: config/hsk3-level4-manual-target-translations.json (complete: all 51 non-English target languages filled for all 389 manual rows)
manual_target_build_report: outputs/hsk/qa/hsk3_level_4_1000_v1_manual_target_translation_build_20260605.json
manual_target_gate: outputs/hsk/qa/hsk3_level_4_1000_v1_manual_target_translation_gate_20260605.json (strict --require-complete pass)
course_metadata: config/hsk3-level4-course-metadata.json
workbook: outputs/hsk/hsk3_level_4_1000_v1.xlsx
workbook_gate: outputs/hsk/qa/hsk3_level_4_1000_v1_workbook_gate_20260606.json
sample_quality_audit: outputs/hsk/qa/hsk3_level_4_1000_v1_sample_10_per_language_quality_20260606.json
native_style_sample_audit: outputs/hsk/qa/hsk3_level_4_1000_v1_native_style_sample_5_per_language_20260606.json
db_import_report: outputs/hsk/qa/hsk3_level_4_1000_v1_db_import_20260606.json
google_sheet_delivery: outputs/hsk/hsk3_level_4_1000_v1_delivery.json
status: complete 53-language delivery; isolated Docker/Postgres import and Google Sheet readback verified
```

The fifth complete delivery snapshot is:

```text
release_id: hsk3_level_5_1600_v1
hsk_version: HSK 3.0
hsk_level: 5
official_source_order: 2001-3600
row_count: 1600
source: outputs/hsk/source/hsk3_level_5_1600_v1.source.json
overlap_report: outputs/hsk/qa/hsk3_level_5_1600_v1_classic_overlap_20260606.json
source_gate: outputs/hsk/qa/hsk3_level_5_1600_v1_source_gate_20260606.json
reuse_map: outputs/hsk/qa/hsk3_level_5_1600_v1_classic_reuse_map_20260606.json
manual_chinese_examples_template: config/hsk3-level5-manual-examples.tsv
examples: config/hsk3-level5-examples.json
en_glosses: config/hsk3-level5-en-glosses.json
chinese_examples_build_report: outputs/hsk/qa/hsk3_level_5_1600_v1_chinese_examples_build_20260606.json
chinese_gate: outputs/hsk/qa/hsk3_level_5_1600_v1_chinese_gate_20260606.json
classic_target_translation_layer: config/hsk3-level5-classic-reuse-target-translations.json (partial Classic-reuse only)
classic_target_translation_build_report: outputs/hsk/qa/hsk3_level_5_1600_v1_classic_target_translation_build_20260606.json
manual_target_batch_es_fr_de_it_pt_ru: config/hsk3-level5-manual-translations-es-fr-de-it-pt-ru.tsv (complete: 584/584 HSK3-only rows filled for ES/FR/DE/IT/PT/RU)
manual_target_batch_ja_ko_vi_th_ms_id: config/hsk3-level5-manual-translations-ja-ko-vi-th-ms-id.tsv (complete: 584/584 HSK3-only rows filled for JA/KO/VI/TH/MS/ID)
manual_target_batch_pl_nl_sv_no_da_fi: config/hsk3-level5-manual-translations-pl-nl-sv-no-da-fi.tsv (complete: 584/584 HSK3-only rows filled for PL/NL/SV/NO/DA/FI)
manual_target_batch_cs_sk_hu_ro_bg_hr: config/hsk3-level5-manual-translations-cs-sk-hu-ro-bg-hr.tsv (complete: 584/584 HSK3-only rows filled for CS/SK/HU/RO/BG/HR)
manual_target_batch_sr_sl_lt_lv_et_is: config/hsk3-level5-manual-translations-sr-sl-lt-lv-et-is.tsv (complete: 584/584 HSK3-only rows filled for SR/SL/LT/LV/ET/IS)
manual_target_batch_hi_bn_tl: config/hsk3-level5-manual-translations-hi-bn-tl.tsv (complete: 584/584 HSK3-only rows filled for HI/BN/TL)
manual_target_batch_my_km_lo_ne: config/hsk3-level5-manual-translations-my-km-lo-ne.tsv (complete: rows 2002:哎呀 through 3600:作出 filled, 584/584 HSK3-only rows filled for MY/KM/LO/NE)
manual_target_batch_si_ta: config/hsk3-level5-manual-translations-si-ta.tsv (complete: rows 2002:哎呀 through 3600:作出 filled, 584/584 HSK3-only rows filled for SI/TA)
manual_target_batch_te_kn: config/hsk3-level5-manual-translations-te-kn.tsv (complete: rows 2002:哎呀 through 3600:作出 filled, 584/584 HSK3-only rows filled for TE/KN)
manual_target_batch_ml_kk: config/hsk3-level5-manual-translations-ml-kk.tsv (complete: rows 2002:哎呀 through 3600:作出 filled, 584/584 HSK3-only rows filled for ML/KK)
manual_target_batch_ka_hy: config/hsk3-level5-manual-translations-ka-hy.tsv (complete: rows 2002:哎呀 through 3600:作出 filled, 584/584 HSK3-only rows filled for KA/HY)
manual_target_batch_ptbr_es419: config/hsk3-level5-manual-translations-ptbr-es419.tsv (complete: rows 2002:哎呀 through 3600:作出 filled, 584/584 HSK3-only rows filled for PT-BR/ES-419)
manual_target_batch_tr_sw_az_uz: config/hsk3-level5-manual-translations-tr-sw-az-uz.tsv (complete: rows 2002:哎呀 through 3600:作出 filled, 584/584 HSK3-only rows filled for TR/SW/AZ/UZ)
manual_target_translation_layer: config/hsk3-level5-manual-target-translations.json (complete: 584 manual keys, 584 complete manual rows, 29,784 manual word cells, 29,784 manual example cells)
manual_target_build_report: outputs/hsk/qa/hsk3_level_5_1600_v1_manual_target_translation_build_20260606.json
manual_target_gate: outputs/hsk/qa/hsk3_level_5_1600_v1_manual_target_translation_gate_20260606.json (strict --require-complete pass: 0 blockers, 0 warnings)
course_metadata: config/hsk3-level5-course-metadata.json
workbook: outputs/hsk/hsk3_level_5_1600_v1.xlsx
workbook_gate: outputs/hsk/qa/hsk3_level_5_1600_v1_workbook_gate_20260608.json
sample_quality_audit: outputs/hsk/qa/hsk3_level_5_1600_v1_sample_10_per_language_quality_20260608.json
native_style_sample_audit: outputs/hsk/qa/hsk3_level_5_1600_v1_native_style_sample_5_per_language_20260608.json
db_import_report: outputs/hsk/qa/hsk3_level_5_1600_v1_db_import_20260608.json
google_sheet_delivery: outputs/hsk/hsk3_level_5_1600_v1_delivery.json
status: complete 53-language delivery; isolated Docker/Postgres import and Google Sheet readback verified
```

The sixth published legacy delivery snapshot is:

```text
release_id: hsk3_level_6_1400_v1
hsk_version: HSK 3.0
hsk_level: 6
official_source_order: 3601-5000
row_count: 1400
source: outputs/hsk/source/hsk3_level_6_1400_v1.source.json
overlap_report: outputs/hsk/qa/hsk3_level_6_1400_v1_classic_overlap_20260608.json
source_gate: outputs/hsk/qa/hsk3_level_6_1400_v1_source_gate_20260608.json
reuse_map: outputs/hsk/qa/hsk3_level_6_1400_v1_classic_reuse_map_20260608.json
manual_chinese_examples_template: config/hsk3-level6-manual-examples.tsv (complete: 664/664 manual rows filled through 4999:误)
examples: config/hsk3-level6-examples.json (complete: 736 Classic-reuse + 664 manual = 1400/1400)
en_glosses: config/hsk3-level6-en-glosses.json (complete: 736 Classic-reuse + 664 manual = 1400/1400)
chinese_examples_build_report: outputs/hsk/qa/hsk3_level_6_1400_v1_chinese_examples_build_20260608.json (status ok; 0 blockers)
chinese_gate: outputs/hsk/qa/hsk3_level_6_1400_v1_chinese_gate_20260608.json
classic_target_translation_layer: config/hsk3-level6-classic-reuse-target-translations.json (partial Classic-reuse only)
classic_target_translation_build_report: outputs/hsk/qa/hsk3_level_6_1400_v1_classic_target_translation_build_20260608.json
manual_target_batch_es_fr_de_it_pt_ru: config/hsk3-level6-manual-translations-es-fr-de-it-pt-ru.tsv (complete: 664/664 HSK3-only rows filled for ES/FR/DE/IT/PT/RU through 4999:误)
manual_target_batch_ja_ko_vi_th_ms_id: config/hsk3-level6-manual-translations-ja-ko-vi-th-ms-id.tsv (complete: 664/664 HSK3-only rows filled for JA/KO/VI/TH/MS/ID through 4999:误)
manual_target_batch_pl_nl_sv_no_da_fi: config/hsk3-level6-manual-translations-pl-nl-sv-no-da-fi.tsv (complete: 664/664 HSK3-only rows filled for PL/NL/SV/NO/DA/FI through 4999:误)
manual_target_batch_cs_sk_hu_ro_bg_hr: config/hsk3-level6-manual-translations-cs-sk-hu-ro-bg-hr.tsv (complete: 664/664 HSK3-only rows filled for CS/SK/HU/RO/BG/HR through 4999:误)
manual_target_batch_sr_sl_lt_lv_et_is: config/hsk3-level6-manual-translations-sr-sl-lt-lv-et-is.tsv (complete: 664/664 HSK3-only rows filled for SR/SL/LT/LV/ET/IS through 4999:误)
manual_target_batch_hi_bn_tl: config/hsk3-level6-manual-translations-hi-bn-tl.tsv (complete: 664/664 HSK3-only rows filled for HI/BN/TL through 4999:误)
manual_target_batch_my_km_lo_ne: config/hsk3-level6-manual-translations-my-km-lo-ne.tsv (complete: 664/664 HSK3-only rows filled for MY/KM/LO/NE through 4999:误)
manual_target_batch_si_ta: config/hsk3-level6-manual-translations-si-ta.tsv (complete: 664/664 HSK3-only rows filled for SI/TA through 4999:误)
manual_target_batch_te_kn: config/hsk3-level6-manual-translations-te-kn.tsv (complete: 664/664 HSK3-only rows filled for TE/KN through 4999:误)
manual_target_batch_ml_kk: config/hsk3-level6-manual-translations-ml-kk.tsv (complete: 664/664 HSK3-only rows filled for ML/KK through 4999:误)
manual_target_batch_ka_hy: config/hsk3-level6-manual-translations-ka-hy.tsv (complete: 664/664 HSK3-only rows filled for KA/HY through 4999:误)
manual_target_batch_ptbr_es419: config/hsk3-level6-manual-translations-ptbr-es419.tsv (complete: 664/664 HSK3-only rows filled for PT-BR/ES-419 through 4999:误)
manual_target_batch_tr_sw_az_uz: config/hsk3-level6-manual-translations-tr-sw-az-uz.tsv (complete: 664/664 HSK3-only rows filled for TR/SW/AZ/UZ through 4999:误)
manual_target_translation_layer: config/hsk3-level6-manual-target-translations.json (complete: 664 manual keys, 664 complete manual rows, 33,864 manual word cells, 33,864 manual example cells)
manual_target_build_report: outputs/hsk/qa/hsk3_level_6_1400_v1_manual_target_translation_build_20260608.json
manual_target_gate: outputs/hsk/qa/hsk3_level_6_1400_v1_manual_target_translation_gate_20260608.json (strict --require-complete pass: 0 blockers, 0 warnings)
course_metadata: config/hsk3-level6-course-metadata.json
workbook: outputs/hsk/hsk3_level_6_1400_v1.xlsx
workbook_gate: outputs/hsk/qa/hsk3_level_6_1400_v1_workbook_gate_20260608.json
sample_quality_audit: outputs/hsk/qa/hsk3_level_6_1400_v1_sample_10_per_language_quality_20260608.json
native_style_sample_audit: outputs/hsk/qa/hsk3_level_6_1400_v1_native_style_sample_5_per_language_20260608.json
db_import_report: outputs/hsk/qa/hsk3_level_6_1400_v1_db_import_20260612.json
google_sheet_delivery: outputs/hsk/hsk3_level_6_1400_v1_delivery.json
status: complete 53-language delivery for the earlier local 1400-row boundary; isolated Docker/Postgres import and Google Sheet readback verified, but superseded at source-boundary layer by `hsk3_level_6_1800_v2`
```

The corrected Level 6 source/reuse snapshot is:

```text
release_id: hsk3_level_6_1800_v2
hsk_version: HSK 3.0
hsk_level: 6
official_source_order: 3601-5400
row_count: 1800
source: outputs/hsk/source/hsk3_level_6_1800_v2.source.json
overlap_report: outputs/hsk/qa/hsk3_level_6_1800_v2_classic_overlap_20260612.json
source_gate: outputs/hsk/qa/hsk3_level_6_1800_v2_source_gate_20260612.json
reuse_map: outputs/hsk/qa/hsk3_level_6_1800_v2_classic_reuse_map_20260612.json
chinese_examples: config/hsk3-level6-v2-examples.json
chinese_glosses: config/hsk3-level6-v2-en-glosses.json
chinese_gate: outputs/hsk/qa/hsk3_level_6_1800_v2_chinese_gate_20260612.json
reused_target_translations: config/hsk3-level6-v2-reused-target-translations.json
reused_target_gate: outputs/hsk/qa/hsk3_level_6_1800_v2_reused_target_translation_gate_20260612.json
manual_target_layer: config/hsk3-level6-v2-manual-target-translations.json
manual_target_gate: outputs/hsk/qa/hsk3_level_6_1800_v2_manual_target_translation_gate_20260612.json
manual_target_batches_completed: config/hsk3-level6-v2-manual-translations-es-fr-de-it-pt-ru.tsv, config/hsk3-level6-v2-manual-translations-ja-ko-vi-th-ms-id.tsv, config/hsk3-level6-v2-manual-translations-pl-nl-sv-no-da-fi.tsv, config/hsk3-level6-v2-manual-translations-cs-sk-hu-ro-bg-hr.tsv, config/hsk3-level6-v2-manual-translations-sr-sl-lt-lv-et-is.tsv, config/hsk3-level6-v2-manual-translations-hi-bn-tl.tsv, config/hsk3-level6-v2-manual-translations-my-km-lo-ne.tsv, config/hsk3-level6-v2-manual-translations-si-ta.tsv, config/hsk3-level6-v2-manual-translations-te-kn.tsv, config/hsk3-level6-v2-manual-translations-ml-kk.tsv, config/hsk3-level6-v2-manual-translations-ka-hy.tsv, config/hsk3-level6-v2-manual-translations-ptbr-es419.tsv and config/hsk3-level6-v2-manual-translations-tr-sw-az-uz.tsv through 5400:罪, each 181/181 keys
manual_target_batch_in_progress: none
workbook_xlsx: outputs/hsk/hsk3_level_6_1800_v2.xlsx
workbook_csv: outputs/hsk/hsk3_level_6_1800_v2.csv
workbook_jsonl: outputs/hsk/hsk3_level_6_1800_v2.jsonl
workbook_gate: outputs/hsk/qa/hsk3_level_6_1800_v2_workbook_gate_20260612.json
sample_quality_audit: outputs/hsk/qa/hsk3_level_6_1800_v2_sample_10_per_language_quality_20260612.json
sample_15_quality_audit: outputs/hsk/qa/hsk3_level_6_1800_v2_sample_15_per_language_quality_20260612.json
native_style_sample_audit: outputs/hsk/qa/hsk3_level_6_1800_v2_native_style_sample_5_per_language_20260612.json
pinyin_alignment_gate: outputs/hsk/qa/hsk3_level_6_1800_v2_pinyin_alignment_gate_20260612.json
xlsx_readback: outputs/hsk/qa/hsk3_level_6_1800_v2_xlsx_readback_20260612.json
xlsx_pinyin_readback: outputs/hsk/qa/hsk3_level_6_1800_v2_xlsx_pinyin_readback_20260612.json
db_import_report: outputs/hsk/qa/hsk3_level_6_1800_v2_db_import_20260612.json
google_sheet_delivery: outputs/hsk/hsk3_level_6_1800_v2_delivery.json
google_sheet_id: 1OKXj2Esw2XO1AKqK3aDcOMHOTjP2BOsFuGNMmaInm30
google_sheet_url: https://docs.google.com/spreadsheets/d/1OKXj2Esw2XO1AKqK3aDcOMHOTjP2BOsFuGNMmaInm30/edit?usp=drivesdk
next_manual_target_batch: none; corrected Level 6 v2 workbook, workbook gate, sample audits, XLSX readback, isolated Docker/Postgres import and Google Sheet readback are complete
source_builder: scripts/hsk/build-hsk3-source-from-pdf.py hsk3_level_6_1800_v2
source_gate_command: node scripts/hsk/check-hsk3-source-gate.mjs hsk3_level_6_1800_v2
reuse_map_command: node scripts/hsk/build-hsk3-classic-reuse-map.mjs hsk3_level_6_1800_v2
chinese_gate_command: node scripts/hsk/check-hsk3-level6-v2-chinese-gate.mjs
reused_target_gate_command: node scripts/hsk/check-hsk3-level6-v2-reused-target-translations.mjs
manual_target_gate_command: node scripts/hsk/check-hsk3-level6-v2-manual-target-translations.mjs
workbook_builder_command: node scripts/hsk/build-hsk3-level6-v2-workbook.mjs
xlsx_export_command: python3 scripts/hsk/export-hsk3-level6-v2-xlsx.py
workbook_gate_command: node scripts/hsk/check-hsk3-level6-v2-workbook-gate.mjs
sample_quality_audit_command: node scripts/hsk/audit-hsk3-level6-v2-sample-quality.mjs
sample_15_quality_audit_command: node scripts/hsk/audit-hsk3-level6-v2-sample-quality.mjs 15
native_style_sample_audit_command: node scripts/hsk/audit-hsk3-level6-v2-native-style-sample.mjs
pinyin_alignment_gate_command: node scripts/hsk/check-hsk3-level6-v2-pinyin-alignment-gate.mjs
xlsx_pinyin_readback_command: python3 scripts/hsk/check-hsk3-level6-v2-xlsx-pinyin-readback.py
db_import_command: node scripts/hsk/import-hsk3-level6-to-db.mjs hsk3_level_6_1800_v2
google_sheet_upload_command: node scripts/upload-spreadsheet-to-drive-folder.mjs outputs/hsk/hsk3_level_6_1800_v2.xlsx --file-id=1OKXj2Esw2XO1AKqK3aDcOMHOTjP2BOsFuGNMmaInm30 --title="hsk 3.0 level 6" --folder-id=1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei
google_sheet_readback_command: node scripts/hsk/check-hsk3-google-sheet-readback.mjs hsk3_level_6_1800_v2
status: complete 53-language delivery for the corrected full Level 6 boundary; source, Chinese layer, reused target, strict manual target, workbook gate, sample quality audit, sample-15 quality audit, native-style sample audit, pinyin alignment gate, XLSX pinyin readback, measure-naturalness gate, XLSX readback, isolated Docker/Postgres import and Google Sheet readback pass
```

The initialized advanced source/reuse snapshot is:

```text
release_id: hsk3_level_7_9_5600_v1
hsk_version: HSK 3.0
hsk_level: 7-9
official_source_order: 5401-11000
row_count: 5600
source: outputs/hsk/source/hsk3_level_7_9_5600_v1.source.json
overlap_report: outputs/hsk/qa/hsk3_level_7_9_5600_v1_classic_overlap_20260612.json
source_gate: outputs/hsk/qa/hsk3_level_7_9_5600_v1_source_gate_20260612.json
reuse_map: outputs/hsk/qa/hsk3_level_7_9_5600_v1_classic_reuse_map_20260612.json
source_builder: scripts/hsk/build-hsk3-source-from-pdf.py hsk3_level_7_9_5600_v1
source_gate_command: node scripts/hsk/check-hsk3-source-gate.mjs hsk3_level_7_9_5600_v1
reuse_map_command: node scripts/hsk/build-hsk3-classic-reuse-map.mjs hsk3_level_7_9_5600_v1
status: local source/reuse prep only; source gate passes with 0 blockers and 2 expected warnings; no workbook, DB import or Google Sheet upload yet
```

## Relationship To Classic HSK

Classic HSK and HSK 3.0 are not the same list with renamed groups.

Reuse rule:

- exact source-word matches may be reused only after row-level pinyin/sense check;
- compound-related rows such as a new simple word vs an old compound are evidence only, not automatic reuse;
- absent rows require fresh source/translation/example work;
- Classic target translations may be copied only for rows whose Chinese examples were actually sourced from row-level Classic reuse;
- if an HSK3.0 row uses a manual Chinese example, non-English target-language translations must stay pending until a matching HSK3.0 language pack is authored;
- Classic HSK DB tables and Google Sheets are not mutated by HSK 3.0 source setup.
- HSK 3.0 Docker/Postgres storage uses separate tables from Classic HSK and ordinary deck cards.
- HSK 3.0 releases that contain duplicate simplified forms must preserve an `hsk_key` based on the official row order and source word. Level 2 has official duplicate simplified rows `过` and `花`; they must not be keyed only by `simplified`.
- HSK 3.0 Level 3 has duplicate simplified row `得`, so Level 3 also must preserve `hsk_key` and must not key manual examples or target translations only by `simplified`.
- Exact simplified-word matches with different readings are blocked from Classic reuse. In Level 3, `得 dé` and `地 dì` are not copied from Classic particle rows `得 de` / `地 de`; they require fresh HSK3 examples and target-language packs.
- Exact simplified-word matches with different readings stay blocked from Classic reuse in later levels as well. In Level 4, `1086:重 chóng`, `1818:血 xiě` and `1924:着 zháo` are fresh HSK3 manual examples and must not copy Classic rows with different readings.
- Exact simplified-word matches with different readings stay blocked in Level 5 as well. `2467:行 háng` and `2539:系 jì` are fresh HSK3 manual examples and must not copy Classic rows with readings `xíng` or `xì`.

The first HSK3.0 Level 1 overlap report must classify each row against `outputs/hsk/hsk2_classic_level_1_150_v1.csv` through `outputs/hsk/hsk2_classic_level_6_2500_v1.csv`.

## Initial Workflow

1. Keep HSK 3.0 source acquisition file-first until the contract and gates are stable.
2. Build source snapshots under `outputs/hsk/source/`.
3. Build overlap and QA reports under `outputs/hsk/qa/`.
4. Do not generate 53 target-language packs until the Level 1 source snapshot, contract, Chinese gate shape and overlap/reuse policy are documented.
5. Do not import HSK 3.0 to Docker/Postgres or upload to Google Sheets until the HSK 3.0 workbook contract and readback gates exist.

## Current Status

2026-06-03:

- HSK3.0 source contour initialized.
- Official PDF downloaded to `outputs/hsk/source/hsk3_official_syllabus_vocab_chars_grammar_202511_202607.pdf`.
- Local PDF parser dependencies are not present (`pdftotext`, `pypdf`, `pdfplumber`, `mutool` unavailable), so the first Level 1 snapshot is seeded from the official PDF text extracted through the web tool and normalized by `scripts/hsk/build-hsk3-level1-source.mjs`.
- HSK3.0 Level 1 source snapshot is generated at `outputs/hsk/source/hsk3_level_1_300_v1.source.json`: 300 rows, HSK level 1 only, no duplicate simplified rows, no missing `source_word` / `simplified` / `pinyin` fields and row order 1-300.
- Classic exact-word overlap report is generated at `outputs/hsk/qa/hsk3_level_1_300_v1_classic_overlap_20260603.json` / `.md`: 209 exact simplified-word matches and 91 rows absent as exact Classic words. The report intentionally does not auto-reuse compound-related rows.
- 98 exact-word overlap rows have strict pinyin-string differences versus Classic rows, mostly spacing/style candidates such as reduplicated kinship words. They require a row-level pinyin/sense check before any Classic reuse.
- HSK3.0 Level 1 source gate passes: `node scripts/hsk/check-hsk3-level1-source-gate.mjs` writes `outputs/hsk/qa/hsk3_level_1_300_v1_source_gate_20260603.json` / `.md` with `status: ok`, 0 blockers and 1 expected warning for strict pinyin-string differences before Classic reuse.

2026-06-04:

- HSK3.0 Level 1 contract is created at `config/hsk3-release-contract-v1.json`. It defines a separate HSK3.0 workbook shape with no `ZH` target-language translation column or DB target row, no target-language transcription/audio and HSK3.0 official pinyin winning over Classic pinyin. The buyer-facing first sheet still starts with source-display columns `ZH` and `ZH transcription`.
- Classic reuse map is generated at `outputs/hsk/qa/hsk3_level_1_300_v1_classic_reuse_map_20260604.json` / `.md`: 209 reuse-allowed candidates and 91 blocked rows. Class counts: 114 `exact_same_pinyin`, 92 `style_only_pinyin`, 2 `tone_or_neutral_policy`, 1 `variant_ok` and 91 `absent_as_exact_classic_word`. The reuse map chooses the matching Classic reading among all exact-word matches, so polyphonic rows such as `还` and `只` are not falsely blocked when an HSK3.0-matching Classic reading exists.
- HSK3.0 Level 1 Chinese example layer is built by `node scripts/hsk/build-hsk3-level1-chinese-examples.mjs`: `config/hsk3-level1-examples.json`, `config/hsk3-level1-en-glosses.json` and report `outputs/hsk/qa/hsk3_level_1_300_v1_chinese_examples_build_20260604.json`. It has 300/300 examples and glosses, 95 manual HSK3.0 examples and 205 examples sourced from Classic reuse, with 0 blockers.
- Classic target translation layer is built by `node scripts/hsk/build-hsk3-level1-classic-target-translations.mjs`: `config/hsk3-level1-classic-reuse-target-translations.json` and report `outputs/hsk/qa/hsk3_level_1_300_v1_classic_target_translation_build_20260604.json`. It fills 205 Classic-reuse rows across 51 non-English target languages: 10,455 word cells and 10,455 example cells, with 0 blockers.
- HSK3.0 Level 1 manual target batches now use separate TSV files matching the HSK3 contour, not Classic TSV: `config/hsk3-level1-manual-translations-*.tsv` is merged by `node scripts/hsk/build-hsk3-level1-manual-target-translations.mjs` into `config/hsk3-level1-manual-target-translations.json`. Current manual batches cover all 51 non-English target languages across all 95 HSK3-only rows: `AZ BG BN CS DA DE ES ES-419 ET FI FR HI HR HU HY ID IS IT JA KA KK KM KN KO LO LT LV ML MS MY NE NL NO PL PT PT-BR RO RU SI SK SL SR SV SW TA TE TH TL TR UZ VI`. Manual target gate `node scripts/hsk/check-hsk3-level1-manual-target-translations.mjs --require-complete` passes with 95 complete manual rows, 4,845 manual word cells, 4,845 manual example cells, 0 blockers and 0 warnings.
- HSK3.0 Level 1 workbook is rebuilt by `node scripts/hsk/build-hsk3-level1-workbook.mjs` at `outputs/hsk/hsk3_level_1_300_v1.xlsx` plus `.csv` and `.jsonl`. It has 300 source rows, 53 target word columns and 53 target example columns. EN/EN-GB are filled for all 300 rows; 205 Classic-reuse rows are filled across all 51 non-English target languages; the 95 HSK3-only manual rows are filled across all 51 non-English target languages.
- HSK3.0 Level 1 Chinese gate passes: `node scripts/hsk/check-hsk3-level1-chinese-gate.mjs` writes `outputs/hsk/qa/hsk3_level_1_300_v1_chinese_gate_20260604.json` / `.md` with `status: ok`, 0 blockers and 0 warnings. It blocks placeholder-like examples, tone-number pinyin, Han leakage in pinyin, Han leakage in English translations and examples missing the source-word anchor.
- HSK3.0 Level 1 workbook gate passes: `node scripts/hsk/check-hsk3-level1-workbook-gate.mjs` writes `outputs/hsk/qa/hsk3_level_1_300_v1_workbook_gate_20260604.json` / `.md` with `status: ok`, 0 blockers and 0 warnings. Current workbook gate counts: 205 `classic_reuse_target_ready` rows, 95 `hsk3_manual_target_ready` rows, 0 target-pending rows, 15,300 non-English target word cells and 15,300 non-English target example cells.
- Sample quality audit passes: `node scripts/hsk/audit-hsk3-level1-sample-quality.mjs` writes `outputs/hsk/qa/hsk3_level_1_300_v1_sample_10_per_language_quality_20260604.json` / `.csv` / `.md` with `status: ok`, 0 blockers and 0 warnings. It checks 10 filled rows per target language (53 languages, 530 sampled target rows) for blanks, placeholder artifacts, exact Chinese copies and exact English fallback examples. It also checks all 300 Chinese source pinyin rows, all 300 Chinese example pinyin rows and 12 locked Chinese readings for Han leakage, tone-number notation and key pinyin/variant shape. Six neutral/modal source pinyin rows are accepted as no-tone source forms: `吧 ba`, `的 de`, `了 le`, `吗 ma`, `们 men`, `呢 ne`.
- HSK3.0 DB isolation migration `db/migrations/030_hsk3_release_items.sql` is added and applied to the local Docker/Postgres runtime. It creates separate tables `hsk3_source_items` and `hsk3_translation_items`; it does not write to `hsk_classic_*`, Oxford tables or ordinary deck-card tables.
- Current complete HSK3.0 Level 1 workbook snapshot was imported to Docker/Postgres by `node scripts/hsk/import-hsk3-level1-to-db.mjs`. Report `outputs/hsk/qa/hsk3_level_1_300_v1_db_import_20260604.json` has `status: ok`, 0 blockers, 0 warnings, 300 source rows and 15,900 translation rows. Source-kind counts are 600 `english_pivot`, 10,455 `classic_reuse_target` and 4,845 `hsk3_manual_target`; there are no `pending_hsk3_manual` rows. Import readback had 0 source mismatches and 0 translation mismatches.
- A separate native Google Sheet was created from the current workbook snapshot in the configured FlashcardsLuna Drive folder: title `hsk 3.0 level 1`, id `1MBFVoxYsTrlMAT3d1ZbC_hxfg0uuvN1p_0L70W0vHhw`, URL `https://docs.google.com/spreadsheets/d/1MBFVoxYsTrlMAT3d1ZbC_hxfg0uuvN1p_0L70W0vHhw/edit?usp=drivesdk`, folder id `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`.
- Google Sheet readback is verified by `node scripts/hsk/check-hsk3-google-sheet-readback.mjs hsk3_level_1_300_v1`: 301 rows, 121 columns and 36,691 cells checked through `sheets_values_hsk3_main_full_plus_course_metadata`, with 0 errors. Delivery manifest: `outputs/hsk/hsk3_level_1_300_v1_delivery.json`.
- HSK3.0 Level 1 is now a complete 53-language delivery snapshot: EN/EN-GB plus all 51 non-English target languages are present in the workbook, isolated Docker/Postgres tables and the existing Google Sheet. Final Google Sheet readback is verified with `node scripts/hsk/check-hsk3-google-sheet-readback.mjs hsk3_level_1_300_v1`: 301 rows, 121 columns and 36,691 checked cells, 0 errors.
- HSK3.0 Level 1 `Course Metadata` was repaired after the first Google Sheet snapshot exposed poor metadata localization, then aligned one-to-one with the Classic HSK five-row metadata shape. Course titles and categories use the learner-facing HSK level label `HSK 1` just like Classic uses `HSK 2`, `HSK 5`, etc.; the HSK version and source year live in the localized `Description` as `HSK 3.0 (2025)`. Localized descriptions and localized `Module` labels live in `config/hsk3-level1-course-metadata.json`. `scripts/hsk/build-hsk3-level1-workbook.mjs` reads all four metadata rows from that file, and `scripts/hsk/check-hsk3-level1-workbook-gate.mjs` blocks missing metadata, metadata mismatches and repeated English descriptions. The existing Google Sheet id `1MBFVoxYsTrlMAT3d1ZbC_hxfg0uuvN1p_0L70W0vHhw` was updated in place, not duplicated. Latest readback is verified with 36,691 checked cells.
- The separate manual HSK3 target layer is generated at `config/hsk3-level1-manual-target-translations.json` from HSK3-specific batch TSVs. Partial manual cells are allowed during batch work: filled manual cells are imported as `hsk3_manual_target`, while still-blank target languages remain `pending_hsk3_manual`. A row becomes `hsk3_manual_target_ready` only when all 51 non-English target languages have both word and example translations. This prevents new HSK3-only translations from being mislabeled as Classic reuse.
- Later on 2026-06-04 a metadata readback review found six HSK3 Level 1 `Course Metadata` descriptions (`FI`, `HU`, `ET`, `KA`, `HY`, `TR`) still referenced the old Classic HSK 2.0 date range. `config/hsk3-level1-course-metadata.json` was repaired, `outputs/hsk/hsk3_level_1_300_v1.xlsx` was rebuilt and `node scripts/hsk/check-hsk3-level1-workbook-gate.mjs` passes locally with 0 blockers. The existing Google Sheet has not yet been refreshed after this local metadata repair.
- HSK3.0 Level 2 source snapshot was initialized as `hsk3_level_2_200_v1`: official PDF rows 301-500, 200 rows total, `hsk_key` preserved for duplicate simplified forms, source gate `status: ok` with 0 blockers and 2 warnings (disambiguated duplicate simplified rows plus strict pinyin differences before reuse), Classic exact overlap 113 rows and 87 absent-as-exact rows. Reuse map class counts are 57 `exact_same_pinyin`, 50 `style_only_pinyin`, 5 `tone_or_neutral_policy`, 1 `variant_ok` and 87 `absent_as_exact_classic_word`. The `variant_ok` row is `花2`, which is forced to Classic row 97 `flower` rather than Classic row 96 `to spend; to cost`.
- HSK3.0 Level 2 Chinese layer is ready locally: `config/hsk3-level2-examples.json`, `config/hsk3-level2-en-glosses.json` and report `outputs/hsk/qa/hsk3_level_2_200_v1_chinese_examples_build_20260604.json` contain 200/200 examples and glosses, 87 manual HSK3 examples, 113 Classic-reuse examples and 0 blockers.
- HSK3.0 Level 2 Classic target translation layer is ready for the 113 Classic-reuse rows: `config/hsk3-level2-classic-reuse-target-translations.json` and report `outputs/hsk/qa/hsk3_level_2_200_v1_classic_target_translation_build_20260604.json` have 5,763 non-English word cells and 5,763 non-English example cells, with 0 blockers.
- HSK3.0 Level 2 manual target workflow is keyed by `hsk_key`, not `simplified`, through `scripts/hsk/build-hsk3-level2-manual-target-translations.mjs` and `scripts/hsk/check-hsk3-level2-manual-target-translations.mjs`. All nine Level 2 manual TSV batches are complete for all 51 non-English target languages: `config/hsk3-level2-manual-translations-es-fr-de-it-pt-ru.tsv`, `config/hsk3-level2-manual-translations-ja-ko-vi-th-ms-id.tsv`, `config/hsk3-level2-manual-translations-pl-nl-sv-no-da-fi.tsv`, `config/hsk3-level2-manual-translations-cs-sk-hu-ro-bg-hr.tsv`, `config/hsk3-level2-manual-translations-sr-sl-lt-lv-et-is.tsv`, `config/hsk3-level2-manual-translations-hi-bn-tl.tsv`, `config/hsk3-level2-manual-translations-my-km-lo-ne.tsv`, `config/hsk3-level2-manual-translations-si-ta-te-kn-ml-kk-ka-hy.tsv` and `config/hsk3-level2-manual-translations-tr-sw-ptbr-es419-az-uz.tsv`. They cover all 87 HSK3-only rows and build into `config/hsk3-level2-manual-target-translations.json` with 87 complete manual rows, 4,437 manual word cells and 4,437 manual example cells. Strict manual gate `node scripts/hsk/check-hsk3-level2-manual-target-translations.mjs --require-complete` passes with 0 blockers and 0 warnings. The MY/KM/LO/NE batch received targeted native-surface repairs for the `进去` and `下去` example sentences before the current gate pass.
- HSK3.0 Level 2 workbook is rebuilt at `outputs/hsk/hsk3_level_2_200_v1.xlsx` plus `.csv` and `.jsonl`. Workbook gate `outputs/hsk/qa/hsk3_level_2_200_v1_workbook_gate_20260604.json` passes with `status: ok`, 0 blockers and 0 warnings, readiness `complete_53_languages_filled`: 113 rows are `classic_reuse_target_ready`, 87 rows are `hsk3_manual_target_ready`, and there are 10,200 filled non-English word cells plus 10,200 filled non-English example cells. Sample quality audit `node scripts/hsk/audit-hsk3-level2-sample-quality.mjs` passes at `outputs/hsk/qa/hsk3_level_2_200_v1_sample_10_per_language_quality_20260604.json` with 530 sampled target rows, all 200 Chinese source pinyin rows, all 200 Chinese example pinyin rows, 0 blockers and 0 warnings. This is deterministic native-free QA, not live native-speaker certification.
- HSK3.0 Level 2 was imported to isolated Docker/Postgres HSK3 tables by `node scripts/hsk/import-hsk3-level2-to-db.mjs`. Report `outputs/hsk/qa/hsk3_level_2_200_v1_db_import_20260604.json` has `status: ok`, 0 blockers, 0 warnings, 200 source rows and 10,600 translation rows. Source-kind counts are 400 `english_pivot`, 5,763 `classic_reuse_target` and 4,437 `hsk3_manual_target`; there are no `pending_hsk3_manual` rows. Import readback had 0 source mismatches and 0 translation mismatches.
- A separate native Google Sheet was created from the current Level 2 workbook snapshot in the configured FlashcardsLuna Drive folder: title `hsk 3.0 level 2`, id `1mNC1B6F2mSiOBKK2yRHuChtscNXfPHNli51lgkYjRks`, URL `https://docs.google.com/spreadsheets/d/1mNC1B6F2mSiOBKK2yRHuChtscNXfPHNli51lgkYjRks/edit?usp=drivesdk`, folder id `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`. Google Sheet readback is verified by `node scripts/hsk/check-hsk3-google-sheet-readback.mjs hsk3_level_2_200_v1`: 201 rows, 122 columns and 24,792 cells checked through `sheets_values_hsk3_main_full_plus_course_metadata`, with 0 errors. Delivery manifest: `outputs/hsk/hsk3_level_2_200_v1_delivery.json`.
- HSK3.0 Level 3 source/reuse prep is initialized as `hsk3_level_3_500_v1`: official PDF rows 501-1000, 500 rows total. Source builder `scripts/hsk/build-hsk3-level3-source.py` extracts the rows from the local official PDF snapshot with bundled `pypdf`, preserving official row order, source words, pinyin, POS and `hsk_key`.
- HSK3.0 Level 3 source gate `node scripts/hsk/check-hsk3-level3-source-gate.mjs` passes with `status: ok`, 0 blockers and 2 warnings: one expected duplicate simplified row `得 x2` and strict pinyin differences before reuse. Exact Classic overlap is 300 rows; 200 rows are absent as exact Classic words.
- HSK3.0 Level 3 reuse map `node scripts/hsk/build-hsk3-level3-classic-reuse-map.mjs` is current at `outputs/hsk/qa/hsk3_level_3_500_v1_classic_reuse_map_20260604.json`: 298 reuse-allowed rows and 202 blocked rows. Class counts are 206 `style_only_pinyin`, 84 `exact_same_pinyin`, 8 `tone_or_neutral_policy`, 2 `reading_difference_review` and 200 `absent_as_exact_classic_word`. The two blocked reading-difference rows are `得 dé` and `地 dì`; they must be authored manually, not copied from Classic particle rows.
- HSK3.0 Level 3 Chinese layer is now complete locally: `config/hsk3-level3-manual-examples.tsv` supplies the 202 HSK3-only/manual Chinese examples, including the blocked reading-difference rows `583:得` (`dé`) and `589:地` (`dì`). `node scripts/hsk/build-hsk3-level3-chinese-examples.mjs` writes `config/hsk3-level3-examples.json`, `config/hsk3-level3-en-glosses.json` and report `outputs/hsk/qa/hsk3_level_3_500_v1_chinese_examples_build_20260604.json` with 500/500 examples and glosses, 202 manual examples, 298 Classic-reuse examples, 0 pending manual examples and 0 blockers. `node scripts/hsk/check-hsk3-level3-chinese-gate.mjs` passes at `outputs/hsk/qa/hsk3_level_3_500_v1_chinese_gate_20260604.json` with 500 rows checked, 0 blockers and 0 warnings.
- HSK3.0 Level 3 Classic target translation layer is ready for the 298 Classic-reuse rows: `config/hsk3-level3-classic-reuse-target-translations.json` and report `outputs/hsk/qa/hsk3_level_3_500_v1_classic_target_translation_build_20260604.json` have 15,198 non-English word cells and 15,198 non-English example cells, with 0 blockers.
- HSK3.0 Level 3 manual target-language workflow is complete through `scripts/hsk/build-hsk3-level3-manual-target-translations.mjs` and `scripts/hsk/check-hsk3-level3-manual-target-translations.mjs`, keyed by `hsk_key` rather than `simplified`. Completed batches `config/hsk3-level3-manual-translations-es-fr-de-it-pt-ru.tsv`, `config/hsk3-level3-manual-translations-ja-ko-vi-th-ms-id.tsv`, `config/hsk3-level3-manual-translations-pl-nl-sv-no-da-fi.tsv`, `config/hsk3-level3-manual-translations-cs-sk-hu-ro-bg-hr.tsv`, `config/hsk3-level3-manual-translations-sr-sl-lt-lv-et-is.tsv`, `config/hsk3-level3-manual-translations-hi-bn-tl.tsv`, `config/hsk3-level3-manual-translations-my-km-lo-ne.tsv`, `config/hsk3-level3-manual-translations-si-ta.tsv`, `config/hsk3-level3-manual-translations-te-kn.tsv`, `config/hsk3-level3-manual-translations-ml-kk.tsv`, `config/hsk3-level3-manual-translations-ka-hy.tsv`, `config/hsk3-level3-manual-translations-ptbr-es419.tsv` and `config/hsk3-level3-manual-translations-tr-sw-az-uz.tsv` cover all 202 HSK3-only rows for all 51 non-English target languages: `AZ`, `BG`, `BN`, `CS`, `DA`, `DE`, `ES`, `ES-419`, `ET`, `FI`, `FR`, `HI`, `HR`, `HU`, `HY`, `ID`, `IS`, `IT`, `JA`, `KA`, `KK`, `KM`, `KN`, `KO`, `LO`, `LT`, `LV`, `ML`, `MS`, `MY`, `NE`, `NL`, `NO`, `PL`, `PT`, `PT-BR`, `RO`, `RU`, `SI`, `SK`, `SL`, `SR`, `SV`, `SW`, `TA`, `TE`, `TH`, `TL`, `TR`, `UZ` and `VI`. Together they build into `config/hsk3-level3-manual-target-translations.json` with 202 complete manual rows, 10,302 manual word cells and 10,302 manual example cells. Strict manual target gate `node scripts/hsk/check-hsk3-level3-manual-target-translations.mjs --require-complete` passes with 0 blockers and 0 warnings.
- HSK3.0 Level 3 Course Metadata is initialized at `config/hsk3-level3-course-metadata.json` by `node scripts/hsk/build-hsk3-level3-course-metadata.mjs`: 53 target languages, `Title`/`Category` as `HSK 3`, localized `Module`, and localized descriptions using `HSK 3.0 (2025)`.
- HSK3.0 Level 3 workbook is rebuilt by `node scripts/hsk/build-hsk3-level3-workbook.mjs` at `outputs/hsk/hsk3_level_3_500_v1.xlsx` plus `.csv` and `.jsonl`. Workbook gate `node scripts/hsk/check-hsk3-level3-workbook-gate.mjs` writes `outputs/hsk/qa/hsk3_level_3_500_v1_workbook_gate_20260604.json` / `.md` with `status: ok`, readiness `complete_53_languages_filled`, 0 blockers and 0 warnings. Current workbook gate counts: 298 `classic_reuse_target_ready` rows, 202 `hsk3_manual_target_ready` rows, 0 target-pending rows, 25,500 non-English target word cells and 25,500 non-English target example cells.
- HSK3.0 Level 3 sample quality audit `node scripts/hsk/audit-hsk3-level3-sample-quality.mjs` passes at `outputs/hsk/qa/hsk3_level_3_500_v1_sample_10_per_language_quality_20260604.json` with 530 sampled target rows, all 500 Chinese source pinyin rows, all 500 Chinese example pinyin rows, 0 blockers and 0 warnings. This is deterministic native-free QA, not live native-speaker certification.
- HSK3.0 Level 3 native-style sample audit `node scripts/hsk/audit-hsk3-level3-native-style-sample.mjs` checks five deterministic target rows per target language plus forced high-risk row `716:斤` across all target languages. The initial run found one real Russian blocker: `Я купил два цзиня яблок.` sounded calqued for an ordinary learner-facing example. On 2026-06-05 this was expanded into an all-HSK measure-naturalness repair: learner-facing examples for `716:斤` now use natural approximately-one-kilo wording across all 53 target languages, while word translations may still explain `斤` / jin / catty as the Chinese half-kilogram unit. Repair report: `outputs/hsk/qa/hsk_jin_measure_naturalness_repair_20260605.json`. Current native-style audit `outputs/hsk/qa/hsk3_level_3_500_v1_native_style_sample_5_per_language_20260605.json` passes with 316 checked rows, 0 blockers and 0 warnings. The current all-HSK measure gate `node scripts/hsk/check-hsk-measure-naturalness-gate.mjs` passes at `outputs/hsk/qa/hsk_measure_naturalness_gate_20260605.json`: after Level 4 delivery it checks three standalone-`斤` source rows across HSK Classic 1-6 and HSK3 Levels 1-4, 159 target example cells, 0 blockers. This is deterministic native-style QA, not live native-speaker certification.
- HSK3.0 Level 3 was imported to isolated Docker/Postgres HSK3 tables by `node scripts/hsk/import-hsk3-level3-to-db.mjs`. Latest report `outputs/hsk/qa/hsk3_level_3_500_v1_db_import_20260604.json` was regenerated on 2026-06-05 with `status: ok`, 0 blockers, 0 warnings, 500 source rows and 26,500 translation rows. Source-kind counts are 1,000 `english_pivot`, 15,198 `classic_reuse_target` and 10,302 `hsk3_manual_target`; there are no `pending_hsk3_manual` rows. After the all-language `716:斤` measure-naturalness repair, DB readback had 0 source mismatches and 0 translation mismatches; the import updated 1 source row and 53 translation rows because the row content hash changed.
- A separate native Google Sheet exists for the current Level 3 workbook snapshot in the configured FlashcardsLuna Drive folder: title `hsk 3.0 level 3`, id `1s53Ltdi3zAr9HiWF_J5dER6c0S_EyYzn2KYQNHH2qkg`, URL `https://docs.google.com/spreadsheets/d/1s53Ltdi3zAr9HiWF_J5dER6c0S_EyYzn2KYQNHH2qkg/edit?usp=drivesdk`, folder id `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`. It was updated in place after the all-language `716:斤` repair, not duplicated. Google Sheet readback is verified by `node scripts/hsk/check-hsk3-google-sheet-readback.mjs hsk3_level_3_500_v1`: 501 rows, 122 columns and 61,392 cells checked through `sheets_values_hsk3_main_full_plus_course_metadata`, with 0 errors. Delivery manifest: `outputs/hsk/hsk3_level_3_500_v1_delivery.json`.

2026-06-05:

- HSK3.0 Level 4 source/reuse prep is initialized as `hsk3_level_4_1000_v1`: official PDF rows 1001-2000, 1000 rows total. Source builder `scripts/hsk/build-hsk3-level4-source.py` extracts the rows from the local official PDF snapshot with bundled `pypdf`, preserving official row order, source words, pinyin, POS and `hsk_key`.
- HSK3.0 Level 4 source gate `node scripts/hsk/check-hsk3-level4-source-gate.mjs` passes with `status: ok`, 0 blockers and 2 warnings: official duplicate simplified forms `重 x2`, `空 x2`, `生 x2`, and strict pinyin differences before reuse. Exact Classic overlap is 614 rows; 386 rows are absent as exact Classic words.
- HSK3.0 Level 4 reuse map `node scripts/hsk/build-hsk3-level4-classic-reuse-map.mjs` is current at `outputs/hsk/qa/hsk3_level_4_1000_v1_classic_reuse_map_20260605.json`: 611 reuse-allowed rows and 389 blocked rows. Class counts are 443 `style_only_pinyin`, 150 `exact_same_pinyin`, 18 `tone_or_neutral_policy`, 3 `reading_difference_review` and 386 `absent_as_exact_classic_word`. The three blocked reading-difference rows are `1086:重 chóng`, `1818:血 xiě` and `1924:着 zháo`; they must be authored manually, not copied from Classic rows with different readings.
- HSK3.0 Level 4 Chinese layer is complete locally. `config/hsk3-level4-manual-examples.tsv` supplies all 389 HSK3-only/manual Chinese examples, including the blocked reading-difference rows `1086:重 chóng`, `1818:血 xiě` and `1924:着 zháo`. `node scripts/hsk/build-hsk3-level4-chinese-examples.mjs` writes `config/hsk3-level4-examples.json`, `config/hsk3-level4-en-glosses.json` and report `outputs/hsk/qa/hsk3_level_4_1000_v1_chinese_examples_build_20260605.json` with 1000/1000 examples and glosses, 389 manual examples, 611 Classic-reuse examples, 0 pending manual examples and 0 blockers. `node scripts/hsk/check-hsk3-level4-chinese-gate.mjs` passes at `outputs/hsk/qa/hsk3_level_4_1000_v1_chinese_gate_20260605.json` with 1000 rows checked, 0 blockers and 0 warnings.
- HSK3.0 Level 4 Classic target translation layer is ready only for the 611 Classic-reuse rows: `config/hsk3-level4-classic-reuse-target-translations.json` and report `outputs/hsk/qa/hsk3_level_4_1000_v1_classic_target_translation_build_20260605.json` have 31,161 non-English word cells and 31,161 non-English example cells, with 0 blockers.
- HSK3.0 Level 4 manual target-language workflow is complete through `scripts/hsk/build-hsk3-level4-manual-target-translations.mjs` and `scripts/hsk/check-hsk3-level4-manual-target-translations.mjs --require-complete`. Thirteen batch files cover all 389 HSK3-only/manual rows for all 51 non-English target languages: `ES/FR/DE/IT/PT/RU`, `JA/KO/VI/TH/MS/ID`, `PL/NL/SV/NO/DA/FI`, `CS/SK/HU/RO/BG/HR`, `SR/SL/LT/LV/ET/IS`, `HI/BN/TL`, `MY/KM/LO/NE`, `SI/TA`, `TE/KN`, `ML/KK`, `KA/HY`, `PT-BR/ES-419` and `TR/SW/AZ/UZ`. Current build report `outputs/hsk/qa/hsk3_level_4_1000_v1_manual_target_translation_build_20260605.json` has 389 manual keys, 19,839 manual word cells, 19,839 manual example cells and 0 blockers. Strict manual target gate `outputs/hsk/qa/hsk3_level_4_1000_v1_manual_target_translation_gate_20260605.json` passes with 389 complete manual rows, 0 missing rows, 0 blockers and 0 warnings.
- HSK3.0 Level 4 Course Metadata is generated at `config/hsk3-level4-course-metadata.json` with the five-row Classic-compatible shape (`Title`, `Description`, `Module`, `Category`) and HSK 3.0 source wording.
- HSK3.0 Level 4 workbook is final/readback verified. Builder `node scripts/hsk/build-hsk3-level4-workbook.mjs` writes `outputs/hsk/hsk3_level_4_1000_v1.xlsx`, `.csv` and `.jsonl`; workbook gate `outputs/hsk/qa/hsk3_level_4_1000_v1_workbook_gate_20260606.json` passes with 1000 rows, 611 `classic_reuse_target_ready` rows, 389 `hsk3_manual_target_ready` rows, 0 pending rows, 51,000 non-English word cells, 51,000 non-English example cells, 0 blockers and 0 warnings.
- HSK3.0 Level 4 sample quality audit `node scripts/hsk/audit-hsk3-level4-sample-quality.mjs` passes at `outputs/hsk/qa/hsk3_level_4_1000_v1_sample_10_per_language_quality_20260606.json` with 530 sampled target rows, all 1000 Chinese source pinyin rows, all 1000 Chinese example pinyin rows, 0 blockers and 0 warnings. Level 4 native-style sample audit `node scripts/hsk/audit-hsk3-level4-native-style-sample.mjs` passes at `outputs/hsk/qa/hsk3_level_4_1000_v1_native_style_sample_5_per_language_20260606.json` with 318 checked rows, 0 blockers and 0 warnings. The Level 4 sample gate explicitly allows valid Japanese exact-kanji word matches such as `地球` while still blocking exact copied Chinese example sentences, and uses Unicode-aware placeholder token matching so words such as Spanish `método` are not false-positive `todo` artifacts.
- HSK3.0 Level 4 was imported to isolated Docker/Postgres HSK3 tables by `node scripts/hsk/import-hsk3-level4-to-db.mjs`. Latest report `outputs/hsk/qa/hsk3_level_4_1000_v1_db_import_20260606.json` has `status: ok`, 0 blockers, 0 warnings, 1000 source rows and 53,000 translation rows. Source-kind counts are 2,000 `english_pivot`, 31,161 `classic_reuse_target` and 19,839 `hsk3_manual_target`; DB readback mismatches are 0.
- A separate native Google Sheet exists for the current Level 4 workbook snapshot in the configured FlashcardsLuna Drive folder: title `hsk 3.0 level 4`, id `1hFH3wcFUIZdAjGmMysiNyLEeHs9bf08FAslYjzGtZjI`, URL `https://docs.google.com/spreadsheets/d/1hFH3wcFUIZdAjGmMysiNyLEeHs9bf08FAslYjzGtZjI/edit?usp=drivesdk`, folder id `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`. Google Sheet readback is verified by `node scripts/hsk/check-hsk3-google-sheet-readback.mjs hsk3_level_4_1000_v1`: 1001 rows, 122 columns and 122,392 cells checked through `sheets_values_hsk3_main_full_plus_course_metadata`, with 0 errors. Delivery manifest: `outputs/hsk/hsk3_level_4_1000_v1_delivery.json`.

2026-06-06:

- HSK3.0 Level 5 source/reuse prep is initialized as `hsk3_level_5_1600_v1`: official PDF rows 2001-3600, 1600 rows total. Source builder `scripts/hsk/build-hsk3-level5-source.py` extracts the rows from the local official PDF snapshot with bundled `pypdf`, preserving official row order, source words, pinyin, POS and `hsk_key`.
- HSK3.0 Level 5 source gate `node scripts/hsk/check-hsk3-level5-source-gate.mjs` passes with `status: ok`, 0 blockers and 2 expected warnings: official duplicate simplified forms `称 x2`, `处 x2`, `调 x2`, `系 x2`, `批 x2`, and strict pinyin differences before reuse. Exact Classic overlap is 1018 rows; 582 rows are absent as exact Classic words.
- HSK3.0 Level 5 reuse map `node scripts/hsk/build-hsk3-level5-classic-reuse-map.mjs` is current at `outputs/hsk/qa/hsk3_level_5_1600_v1_classic_reuse_map_20260606.json`: 1016 reuse-allowed rows and 584 blocked rows. Class counts are 865 `style_only_pinyin`, 135 `exact_same_pinyin`, 16 `tone_or_neutral_policy`, 2 `reading_difference_review` and 582 `absent_as_exact_classic_word`. The two blocked reading-difference rows are `2467:行 háng` and `2539:系 jì`; they must be authored manually, not copied from Classic rows with different readings.
- HSK3.0 Level 5 Chinese layer is complete locally. `config/hsk3-level5-manual-examples.tsv` supplies all 584 HSK3-only/manual Chinese examples, including reading-difference rows `2467:行 háng` and `2539:系 jì`. `node scripts/hsk/build-hsk3-level5-chinese-examples.mjs` writes `config/hsk3-level5-examples.json`, `config/hsk3-level5-en-glosses.json` and report `outputs/hsk/qa/hsk3_level_5_1600_v1_chinese_examples_build_20260606.json` with 1600/1600 examples and glosses, 584 manual examples, 1016 Classic-reuse examples, 0 pending manual examples and 0 blockers. `node scripts/hsk/check-hsk3-level5-chinese-gate.mjs` passes at `outputs/hsk/qa/hsk3_level_5_1600_v1_chinese_gate_20260606.json` / `.md` with 1600 rows checked, 0 blockers and 0 warnings.
- HSK3.0 Level 5 Classic target translation layer is ready only for the 1016 Classic-reuse rows: `config/hsk3-level5-classic-reuse-target-translations.json` and report `outputs/hsk/qa/hsk3_level_5_1600_v1_classic_target_translation_build_20260606.json` have 51,816 non-English word cells and 51,816 non-English example cells, with 0 blockers.
- HSK3.0 Level 5 Course Metadata is generated at `config/hsk3-level5-course-metadata.json` with the same five-row Classic-compatible shape (`Title`, `Description`, `Module`, `Category`) and localized HSK 3.0 (2025) wording for all 53 target languages.
- HSK3.0 Level 5 manual target-language workflow is complete with the same HSK3-specific `hsk_key` pattern as earlier HSK3 levels. Builder `node scripts/hsk/build-hsk3-level5-manual-target-translations.mjs` merges thirteen `config/hsk3-level5-manual-translations-*.tsv` batches into `config/hsk3-level5-manual-target-translations.json`; strict gate `node scripts/hsk/check-hsk3-level5-manual-target-translations.mjs --require-complete` passes with 584 complete manual rows, 29,784 manual word cells, 29,784 manual example cells, 0 blockers and 0 warnings.
  - Complete 584/584 HSK3-only/manual batches: `ES/FR/DE/IT/PT/RU`, `JA/KO/VI/TH/MS/ID`, `PL/NL/SV/NO/DA/FI`, `CS/SK/HU/RO/BG/HR`, `SR/SL/LT/LV/ET/IS`, `HI/BN/TL`, `MY/KM/LO/NE`, `SI/TA`, `TE/KN`, `ML/KK`, `KA/HY`, `PT-BR/ES-419` and `TR/SW/AZ/UZ`.
  - `config/hsk3-level5-manual-translations-tr-sw-az-uz.tsv` is complete for `TR`, `SW`, `AZ` and `UZ`: rows `2002:哎呀` through `3600:作出` are filled, 584/584 rows, 2,336 manual word cells and 2,336 manual example cells.
  - Additional TSV sanity checks confirm the current Level 5 manual target batches have expected column counts, no leading/trailing cell whitespace, no Han leakage outside Japanese, no unexpected cross-script leakage in the rare-script batches, and no target-cell placeholders.
- HSK3.0 Level 5 workbook is final/readback verified. Builder `node scripts/hsk/build-hsk3-level5-workbook.mjs` writes `outputs/hsk/hsk3_level_5_1600_v1.xlsx`, `.csv` and `.jsonl`; workbook gate `outputs/hsk/qa/hsk3_level_5_1600_v1_workbook_gate_20260608.json` passes with 1600 rows, 1016 `classic_reuse_target_ready` rows, 584 `hsk3_manual_target_ready` rows, 0 pending rows, 81,600 non-English word cells, 81,600 non-English example cells, 0 blockers and 0 warnings.
- HSK3.0 Level 5 sample quality audit `node scripts/hsk/audit-hsk3-level5-sample-quality.mjs` passes at `outputs/hsk/qa/hsk3_level_5_1600_v1_sample_10_per_language_quality_20260608.json` with 530 sampled target rows, all 1600 Chinese source pinyin rows, all 1600 Chinese example pinyin rows, 0 blockers and 0 warnings. It accepts official neutral/source pinyin `3149:头 tou` because the row is POS `后缀` and the example uses `里头` as `lǐ tou`.
- HSK3.0 Level 5 native-style sample audit `node scripts/hsk/audit-hsk3-level5-native-style-sample.mjs` passes at `outputs/hsk/qa/hsk3_level_5_1600_v1_native_style_sample_5_per_language_20260608.json` with five deterministic target rows per target language plus forced high-risk rows `2467:行`, `2539:系` and `3149:头`, 424 checked rows total, 0 blockers and 0 warnings.
- HSK3.0 Level 5 was imported to isolated Docker/Postgres HSK3 tables by `node scripts/hsk/import-hsk3-level5-to-db.mjs`. Report `outputs/hsk/qa/hsk3_level_5_1600_v1_db_import_20260608.json` has `status: ok`, 0 blockers, 0 warnings, 1600 source rows and 84,800 translation rows. Source-kind counts are 3,200 `english_pivot`, 51,816 `classic_reuse_target` and 29,784 `hsk3_manual_target`; DB readback mismatches are 0.
- A separate native Google Sheet exists for the current Level 5 workbook snapshot in the configured FlashcardsLuna Drive folder: title `hsk 3.0 level 5`, id `1pwpLNLwIOJ5xi3CMuwVMLDC7ys42XNSPljTu2MMl1EM`, URL `https://docs.google.com/spreadsheets/d/1pwpLNLwIOJ5xi3CMuwVMLDC7ys42XNSPljTu2MMl1EM/edit?usp=drivesdk`, folder id `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`. Google Sheet readback is verified by `node scripts/hsk/check-hsk3-google-sheet-readback.mjs hsk3_level_5_1600_v1`: 1601 rows, 110 columns and 176,380 cells checked through `sheets_values_hsk3_buyer_facing_main_full_plus_course_metadata`, with 0 errors. Delivery manifest: `outputs/hsk/hsk3_level_5_1600_v1_delivery.json`.

2026-06-08:

- HSK3.0 Level 6 was first published as `hsk3_level_6_1400_v1`: official PDF rows 3601-5000, 1400 rows total. On 2026-06-12 this was found to be an incomplete source boundary for the current official local PDF; the corrected local source boundary is `hsk3_level_6_1800_v2`, rows 3601-5400.
- HSK3.0 Level 6 source gate `node scripts/hsk/check-hsk3-level6-source-gate.mjs` passes with `status: ok`, 0 blockers and 2 expected warnings: official duplicate simplified forms `局 x2`, `卷 x2`, `料 x2`, `露 x2`, `散 x2`, `吐 x2`, and strict pinyin differences before reuse. Exact Classic overlap is 736 rows; 664 rows are absent as exact Classic words.
- HSK3.0 Level 6 reuse map `node scripts/hsk/build-hsk3-level6-classic-reuse-map.mjs` is current at `outputs/hsk/qa/hsk3_level_6_1400_v1_classic_reuse_map_20260608.json`: 736 reuse-allowed rows and 664 blocked rows. Class counts are 640 `style_only_pinyin`, 77 `exact_same_pinyin`, 19 `tone_or_neutral_policy` and 664 `absent_as_exact_classic_word`; no `reading_difference_review` rows are currently present.
- HSK3.0 Level 6 Chinese layer is complete locally. `config/hsk3-level6-manual-examples.tsv` supplies all 664 blocked HSK3-only/manual rows keyed by `hsk_key`, through final key `4999:误`. `node scripts/hsk/build-hsk3-level6-chinese-examples.mjs` writes `config/hsk3-level6-examples.json`, `config/hsk3-level6-en-glosses.json` and report `outputs/hsk/qa/hsk3_level_6_1400_v1_chinese_examples_build_20260608.json` with 1400/1400 examples and glosses, 664 manual examples, 736 Classic-reuse examples, 0 pending manual examples and 0 blockers.
- HSK3.0 Level 6 Chinese gate now exists at `scripts/hsk/check-hsk3-level6-chinese-gate.mjs` and passes at `outputs/hsk/qa/hsk3_level_6_1400_v1_chinese_gate_20260608.json` / `.md` with 1400 rows checked, 1400 examples checked, 1400 glosses checked, 664 manual examples, 736 Classic-reuse examples, 0 blockers and 0 warnings.
- HSK3.0 Level 6 Classic target translation layer is ready only for the 736 Classic-reuse rows: `config/hsk3-level6-classic-reuse-target-translations.json` and report `outputs/hsk/qa/hsk3_level_6_1400_v1_classic_target_translation_build_20260608.json` have 37,536 non-English word cells and 37,536 non-English example cells, with 0 blockers.
- HSK3.0 Level 6 manual target-language workflow is complete. All thirteen manual target TSV batches are filled through `4999:误`: `ES/FR/DE/IT/PT/RU`, `JA/KO/VI/TH/MS/ID`, `PL/NL/SV/NO/DA/FI`, `CS/SK/HU/RO/BG/HR`, `SR/SL/LT/LV/ET/IS`, `HI/BN/TL`, `MY/KM/LO/NE`, `SI/TA`, `TE/KN`, `ML/KK`, `KA/HY`, `PT-BR/ES-419` and `TR/SW/AZ/UZ`, each at 664/664 HSK3-only rows. `node scripts/hsk/build-hsk3-level6-manual-target-translations.mjs` writes complete `config/hsk3-level6-manual-target-translations.json`; strict gate `node scripts/hsk/check-hsk3-level6-manual-target-translations.mjs --require-complete` passes with 664 complete manual rows, 33,864 manual word cells, 33,864 manual example cells, 0 blockers and 0 warnings.
- HSK3.0 Level 6 Course Metadata is generated at `config/hsk3-level6-course-metadata.json` with the same five-row Classic-compatible shape (`Title`, `Description`, `Module`, `Category`) and localized HSK 3.0 (2025) wording for all 53 target languages.
- HSK3.0 Level 6 legacy 1400-row workbook is locally/readback verified as a historical snapshot. Builder `node scripts/hsk/build-hsk3-level6-workbook.mjs` writes `outputs/hsk/hsk3_level_6_1400_v1.xlsx`, `.csv` and `.jsonl`; workbook gate `outputs/hsk/qa/hsk3_level_6_1400_v1_workbook_gate_20260608.json` passes with 1400 rows, 736 `classic_reuse_target_ready` rows, 664 `hsk3_manual_target_ready` rows, 0 pending rows, 71,400 non-English word cells, 71,400 non-English example cells, 0 blockers and 0 warnings.
- HSK3.0 Level 6 sample quality audit `node scripts/hsk/audit-hsk3-level6-sample-quality.mjs` passes at `outputs/hsk/qa/hsk3_level_6_1400_v1_sample_10_per_language_quality_20260608.json` with 530 sampled target rows, all 1400 Chinese source pinyin rows, all 1400 Chinese example pinyin rows, 0 blockers and 0 warnings. It explicitly accepts official neutral/source pinyin `4412:啦 la` and `4486:嘛 ma`.
- HSK3.0 Level 6 native-style sample audit `node scripts/hsk/audit-hsk3-level6-native-style-sample.mjs` passes at `outputs/hsk/qa/hsk3_level_6_1400_v1_native_style_sample_5_per_language_20260608.json` with five deterministic target rows per target language plus forced high-risk duplicate/source-homonym rows `4341:局1`, `4342:局2`, `4450:料1`, `4451:料2`, `4461:露`, `4463:露1`, `4726:散` and `4728:散`, 688 checked rows total, 0 blockers and 0 warnings. The Level 6 artifact regex was corrected so normal Spanish/Portuguese lower-case `todo` in sentences such as `por todo el suelo` is not treated as a placeholder; explicit `TODO`/`TBD`/`FIXME`, null/undefined, translation/example placeholders, triple question marks and repeated ellipses remain blocked.
- HSK3.0 Level 6 legacy 1400-row snapshot was imported to isolated Docker/Postgres HSK3 tables by `node scripts/hsk/import-hsk3-level6-to-db.mjs`. Report `outputs/hsk/qa/hsk3_level_6_1400_v1_db_import_20260612.json` has `status: ok`, 0 blockers, 0 warnings, 1400 source rows and 74,200 translation rows. Source-kind counts are 2,800 `english_pivot`, 37,536 `classic_reuse_target` and 33,864 `hsk3_manual_target`; DB readback mismatches are 0.
- The earlier native Google Sheet for the 1400-row Level 6 workbook snapshot used title `hsk 3.0 level 6`, id `1OKXj2Esw2XO1AKqK3aDcOMHOTjP2BOsFuGNMmaInm30`, URL `https://docs.google.com/spreadsheets/d/1OKXj2Esw2XO1AKqK3aDcOMHOTjP2BOsFuGNMmaInm30/edit?usp=drivesdk`, folder id `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`. Its 1400-row readback in `outputs/hsk/hsk3_level_6_1400_v1_delivery.json` is now historical because the same Sheet id was updated in place to the corrected 1800-row v2 delivery.
- Corrected HSK3.0 Level 6 source/reuse prep now exists as `hsk3_level_6_1800_v2`: official PDF rows 3601-5400, 1800 rows total. `scripts/hsk/build-hsk3-source-from-pdf.py hsk3_level_6_1800_v2` writes `outputs/hsk/source/hsk3_level_6_1800_v2.source.json` and exact Classic overlap `outputs/hsk/qa/hsk3_level_6_1800_v2_classic_overlap_20260612.json`: 956 exact Classic rows and 844 absent exact rows. Source gate `node scripts/hsk/check-hsk3-source-gate.mjs hsk3_level_6_1800_v2` passes with 0 blockers and 2 expected warnings: official disambiguated duplicate simplified forms plus strict pinyin-string differences before reuse. Reuse map `node scripts/hsk/build-hsk3-classic-reuse-map.mjs hsk3_level_6_1800_v2` allows 955 reuse candidates and blocks 845 rows, including one `reading_difference_review` row (`5164:一帆风顺`) that should stay manual unless reviewed.
- Corrected HSK3.0 Level 6 v2 local content layers are complete. Chinese gate `outputs/hsk/qa/hsk3_level_6_1800_v2_chinese_gate_20260612.json` has 1800/1800 rows, 1400 legacy examples, 219 Classic-reuse examples, 181 v2 manual Chinese examples, 0 blockers and 0 warnings. Reused target gate `outputs/hsk/qa/hsk3_level_6_1800_v2_reused_target_translation_gate_20260612.json` has 1619 reused rows and 82,569 non-English word/example cells each with 0 blockers; Japanese exact-Han matches remain review warnings. All thirteen v2 manual target batches are complete through `5400:罪`, including final `config/hsk3-level6-v2-manual-translations-tr-sw-az-uz.tsv`. Strict manual target gate `outputs/hsk/qa/hsk3_level_6_1800_v2_manual_target_translation_gate_20260612.json` passes with 181 manual rows present, 181 complete manual rows, 0 partial rows, 0 missing rows, 9231 word cells, 9231 example cells, 0 blockers and 0 warnings.
- Corrected HSK3.0 Level 6 v2 workbook artifacts are `outputs/hsk/hsk3_level_6_1800_v2.xlsx`, `.csv` and `.jsonl`. `node scripts/hsk/build-hsk3-level6-v2-workbook.mjs` writes the CSV/JSONL; its artifact-tool XLSX export hung locally, so the verified XLSX was produced by `python3 scripts/hsk/export-hsk3-level6-v2-xlsx.py` with `openpyxl`. Workbook gate `outputs/hsk/qa/hsk3_level_6_1800_v2_workbook_gate_20260612.json` passes with 1800 rows, 1619 `reused_target_ready` rows, 181 `hsk3_manual_target_ready` rows, 0 pending rows, 91,800 non-English word cells, 91,800 non-English example cells, 0 blockers and 0 warnings. Sample quality audit `outputs/hsk/qa/hsk3_level_6_1800_v2_sample_10_per_language_quality_20260612.json` checks 530 target samples plus all 1800 Chinese source/example pinyin rows and passes with 0 blockers and 0 warnings. Expanded sample audit `outputs/hsk/qa/hsk3_level_6_1800_v2_sample_15_per_language_quality_20260612.json` checks 795 target samples (15 rows x 53 target-language columns) plus all 1800 Chinese source/example pinyin rows and passes with 0 blockers and 0 warnings. Native-style sample audit `outputs/hsk/qa/hsk3_level_6_1800_v2_native_style_sample_5_per_language_20260612.json` checks 1007 rows, including forced high-risk rows `5164:一帆风顺`, `5328:中`, `5330:中毒`, `5331:中奖`, `5333:中暑` and `5399:钻`, and passes with 0 blockers and 0 warnings. Pinyin alignment gate `outputs/hsk/qa/hsk3_level_6_1800_v2_pinyin_alignment_gate_20260612.json` passes with 1800 source-pinyin exact rows, 1800 example-pinyin exact rows, 1800 word-pinyin aligned rows, 1800 syllable-count match rows, 0 blockers and 0 warnings; it explicitly handles standard Hanyu Pinyin erhua (`-r`) and Latin acronyms such as `PDF`. XLSX pinyin readback `outputs/hsk/qa/hsk3_level_6_1800_v2_xlsx_pinyin_readback_20260612.json` passes with all 1800 buyer-facing `ZH transcription` cells and all 1800 `ZH example transcription` cells matching source/config, 0 blockers and 0 warnings. XLSX readback `outputs/hsk/qa/hsk3_level_6_1800_v2_xlsx_readback_20260612.json` passes with SHA-256 `666fb09266bdc7c6c4c24469a257d3c7b7270cfb9a4d9ec2786001064914f2ce`, main sheet 1801x110, internal data 1801x122 and course metadata 5x54. Isolated Docker/Postgres import `outputs/hsk/qa/hsk3_level_6_1800_v2_db_import_20260612.json` passes with 1800 source rows, 95,400 translation rows, source-kind counts 3,600 `english_pivot`, 82,569 `classic_reuse_target`, 9,231 `hsk3_manual_target`, and 0 readback mismatches. The existing native Sheet `hsk 3.0 level 6` / `1OKXj2Esw2XO1AKqK3aDcOMHOTjP2BOsFuGNMmaInm30` was updated in place from `outputs/hsk/hsk3_level_6_1800_v2.xlsx`; delivery manifest `outputs/hsk/hsk3_level_6_1800_v2_delivery.json` has upload mode `update_existing`, workbook SHA-256 `666fb09266bdc7c6c4c24469a257d3c7b7270cfb9a4d9ec2786001064914f2ce`, Google readback status `verified`, 198,380 checked cells and 0 errors.
- HSK3.0 advanced Levels 7-9 source/reuse prep is initialized as `hsk3_level_7_9_5600_v1`: official PDF rows 5401-11000, 5600 rows total. `scripts/hsk/build-hsk3-source-from-pdf.py hsk3_level_7_9_5600_v1` writes `outputs/hsk/source/hsk3_level_7_9_5600_v1.source.json` and exact Classic overlap `outputs/hsk/qa/hsk3_level_7_9_5600_v1_classic_overlap_20260612.json`: 1694 exact Classic rows and 3906 absent exact rows. Source gate `node scripts/hsk/check-hsk3-source-gate.mjs hsk3_level_7_9_5600_v1` passes with 0 blockers and 2 expected warnings: official disambiguated duplicate simplified forms plus strict pinyin-string differences before reuse. Reuse map `node scripts/hsk/build-hsk3-classic-reuse-map.mjs hsk3_level_7_9_5600_v1` allows 1611 reuse candidates and blocks 3989 rows, including 83 `reading_difference_review` rows that should stay manual unless reviewed.

## Workbook Contract

HSK 3.0 uses the same buyer-facing main-sheet shape as HSK Classic:

```text
ZH
ZH transcription
EN, ES, FR, DE, IT, PT, RU, JA, KO, VI, TH, MS, ID, PL, NL,
SV, NO, DA, FI, CS, SK, HU, RO, BG, HR, SR, SL, LT, LV, ET, IS,
HI, BN, TL, MY, KM, LO, NE, SI, TA, TE, KN, ML, UZ, KK, AZ, KA,
HY, TR, SW, PT-BR, ES-419, EN-GB
ZH example
ZH example transcription
EN example, ES example, FR example, ... EN-GB example
```

`ZH` and `ZH example` are Chinese source-display columns on the first sheet, not target-language translation columns. Internal technical fields remain in CSV/JSONL and the workbook `Internal Data` sheet. Isolated Docker/Postgres imports must continue to store Chinese source rows separately and must not create `ZH` target translation rows in `hsk3_translation_items`.

## Course Metadata Sheet

HSK 3.0 workbooks use the same user-facing five-row `Course Metadata` shape as Classic HSK:

```text
        EN                 ES      FR      ...     PT-BR   ES-419  EN-GB
Title   HSK 1.
Description HSK 1 vocabulary from HSK 3.0 (2025).
Module  Chinese            Chino   Chinois ...
Category HSK 1
```

HSK3-specific rules:

- the metadata language columns use the same 53 HSK target-language order as the main HSK3 sheet, excluding `ZH`;
- `Title` is the stable learner-facing HSK level label such as `HSK 1.` or `HSK 2.` for every target language;
- `Description` is localized for every target language and must identify the HSK level vocabulary from HSK 3.0 (2025);
- `Module` is the localized short mobile-app label for Chinese, matching the Classic HSK module localization for the same language code;
- `Category` is the stable short mobile-app label such as `HSK 1` or `HSK 2`, matching the Classic HSK category shape;
- `Title` and `Description` must end with sentence punctuation;
- `Module` and `Category` are short labels and do not require sentence punctuation;
- `scripts/hsk/check-hsk3-level1-workbook-gate.mjs` validates all four Level 1 metadata rows against `config/hsk3-level1-course-metadata.json`;
- `scripts/hsk/check-hsk3-level2-workbook-gate.mjs` validates Level 2 metadata against `config/hsk3-level2-course-metadata.json` and blocks old Classic HSK 2.0 source/date references;
- `scripts/hsk/check-hsk3-level3-workbook-gate.mjs` validates Level 3 metadata against `config/hsk3-level3-course-metadata.json`, blocks old Classic HSK 2.0 source/date references and keeps the same five-row shape;
- `scripts/hsk/check-hsk3-google-sheet-readback.mjs` compares the five-row local `Course Metadata` sheet against the existing native Google Sheet after upload.

## Guardrails

- Do not mix HSK 3.0 release ids, source snapshots, QA reports, DB rows or Google Sheets with `hsk2_classic_*`.
- Do not bulk-regenerate Classic HSK rows for HSK 3.0.
- Do not treat unofficial third-party wordlists as source-of-truth while the official PDF is available.
- Do not copy textbook/example content into LunaCards unless a separate license decision allows it.
- Manual/native review is not a required closure step; quality issues should become deterministic gates, source-backed locks or targeted repairs.
