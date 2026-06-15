# HSK Classic Release Plan

Этот документ является source of truth для HSK vocabulary release-файлов LunaCards.

## Scope

HSK release-файлы отличаются от обычных тематических LunaCards deck exports:

- источник слов - китайский HSK syllabus/list, а не English canonical base;
- один workbook соответствует одному HSK-выпуску;
- строки workbook = китайские HSK vocabulary items;
- first sheet is buyer-facing and starts with Chinese source columns: `ZH`, `ZH transcription`, then target-language translations in the fixed order from `config/language-order.json` excluding `ZH`;
- карточки текстовые;
- озвучка не входит в scope;
- транскрипция переводов на другие языки не входит в scope.

HSK release workbook не заменяет обычный production deck contract `config/spreadsheet-contract-v1.json`. Для HSK используется отдельный contract:

```text
config/hsk-classic-release-contract-v1.json
```

HSK also follows the general source-assisted course rules in [Course Source-Assisted Generation](course-source-assisted-generation.md). The important difference is that Chinese HSK rows are the source of truth. English can be used as a pivot for dictionary/source candidate lookup, but English is not allowed to override the Chinese source item, pinyin, HSK sense or Chinese example scene.

## Chinese-Only Gate

HSK releases have a dedicated Chinese-only gate that is separate from ordinary deck, Oxford and Polyglot pipelines:

```text
node scripts/hsk/check-classic-hsk-chinese-gate.mjs <release_id>
```

Scope:

- reads only HSK release CSV, source snapshot, card overrides and examples;
- writes only HSK QA reports under `outputs/hsk/qa/`;
- does not mutate ordinary decks, Oxford/English Core files, Polyglot files or database pipelines.

The gate blocks:

- missing or mismatched source rows, card overrides or example rows;
- missing/invalid `simplified`, `traditional`, `pinyin`, `example_zh`, `example_pinyin` or `example_EN`;
- pinyin tone numbers such as `hao3`, `lv3` or `nv3`;
- Han characters in pinyin fields;
- raw pinyin source artifacts and HTML entities;
- placeholder Chinese examples such as `我今天学习“X”这个词。` and `这个词是“X”。`;
- Chinese examples that do not contain the exact simplified source item, with grammar-pattern rows such as `不但…而且…` checked by their required parts;
- raw dictionary/source artifacts in EN glosses or EN examples.

The gate warns, but does not block, pinyin forms without tone marks. This is expected for vetted neutral-tone particles such as `de`, `le`, `ma`, `ne`, `ba`, `zhe`, `ya`, `ma` and `wa`. Passing this gate is stronger than the generic release check. HSK Classic does not use a broad manual/native review as a required release gate; future quality increases should be expressed as executable gates or targeted source-backed repair checks.

Current 2026-05-17 gate results:

```text
hsk2_classic_level_1_150_v1: 150 rows, 150 curated examples, 0 placeholders, 0 blockers, 4 neutral-tone warnings
hsk2_classic_level_2_150_v1: 150 rows, 150 curated examples, 0 placeholders, 0 blockers, 4 neutral-tone warnings
hsk2_classic_level_3_300_v1: 300 rows, 300 curated examples, 0 placeholders, 0 blockers, 2 neutral-tone warnings
hsk2_classic_level_4_600_v1: 600 rows, 600 curated examples, 0 placeholders, 0 blockers, 1 neutral-tone warning
hsk2_classic_level_5_1300_v1: 1300 rows, 1300 curated examples, 0 placeholders, 0 blockers, 0 warnings
hsk2_classic_level_6_2500_v1: 2500 rows, 2500 curated examples, 0 placeholders, 0 blockers, 2 neutral-tone warnings
```

HSK1-HSK5 therefore do not need source/list regeneration from this gate. HSK6 must not start target-language packs until its Chinese-only gate has 0 blockers.

## Semantic Pinyin Gate

HSK releases also have a dedicated semantic pinyin gate:

```text
node scripts/hsk/check-classic-hsk-semantic-pinyin-gate.mjs <release_id>
```

Scope:

- reads only HSK release CSV, HSK source snapshots, card overrides and examples;
- writes only HSK QA reports under `outputs/hsk/qa/`;
- does not mutate ordinary decks, Oxford/English Core files, Polyglot files or database pipelines.

The gate checks whether card-facing pinyin is semantically supported by HSK candidate sources and row context. It separates:

- `blocker`: hard contradiction or invalid pinyin shape;
- `needs_review`: legitimate semantic pinyin risk, usually cross-level duplicate simplified forms with different readings or unsupported candidate-source readings;
- `warning`: source-supported polyphonic/tricky rows kept in audit history.

The gate understands common HSK pinyin realities:

- tone-sandhi display for `不` / `一` can be card-facing while source dictionary forms keep base tones;
- neutral aspect/particle pinyin such as `guo`, `de`, `le`, `zhe` can be valid;
- duplicated rows such as `长`, `得`, `喂` remain review-tracked instead of being silently flattened.

Current 2026-05-17 semantic pinyin gate results after source-metadata repair:

```text
hsk2_classic_level_1_150_v1: 150 rows, 150 source-supported pinyin rows, 0 blockers, 1 needs_review, 39 warnings
hsk2_classic_level_2_150_v1: 150 rows, 150 source-supported pinyin rows, 0 blockers, 2 needs_review, 46 warnings
hsk2_classic_level_3_300_v1: 300 rows, 300 source-supported pinyin rows, 0 blockers, 1 needs_review, 100 warnings
hsk2_classic_level_4_600_v1: 600 rows, 600 source-supported pinyin rows, 0 blockers, 1 needs_review, 129 warnings
hsk2_classic_level_5_1300_v1: 1300 rows, 1300 source-supported pinyin rows, 0 blockers, 0 needs_review, 192 warnings
hsk2_classic_level_6_2500_v1: 2500 rows, 2500 source-supported pinyin rows, 0 blockers, 1 needs_review, 385 warnings
```

The remaining `needs_review` rows are cross-level duplicate readings, not immediate blockers:

```text
喂: HSK1 `wéi` vs HSK6 `wèi`
长: HSK2 `cháng` vs HSK3 `zhǎng`
得: HSK2 `de` vs HSK4 `děi`
```

The first run found two hard source-metadata contradictions where the workbook/example layer was already semantically correct but the canonical source metadata still preserved a conflicting captured-source pinyin:

```text
HSK4 `倒`: workbook/example use `dǎo` for "to fall / knock down"; source metadata had `dào`.
HSK5 `划`: workbook/example use `huá` for `划船` / "to row"; source metadata had `huà`.
```

These were repaired in the canonical source snapshots and protected in the corresponding canonical-source builders:

```text
outputs/hsk/source/hsk2_classic_level_4_600_v1.source.json
outputs/hsk/source/hsk2_classic_level_5_1300_v1.source.json
scripts/hsk/build-classic-hsk4-canonical-source.mjs
scripts/hsk/build-classic-hsk5-canonical-source.mjs
```

2026-05-17 follow-up: after these two pinyin repairs, the HSK4/HSK5 workbooks and Google Sheets were already current by workbook hash and HSK Google Sheet readback, but the dedicated Docker/Postgres `hsk_classic_source_items` copy still had the two older source rows. Rerunning `node scripts/hsk/import-classic-hsk-source-to-db.mjs hsk2_classic_level_4_600_v1 hsk2_classic_level_5_1300_v1` updated exactly two source rows and reported 0 readback mismatches:

```text
HSK4 row 80 `倒`: pinyin `dǎo`, example `大风把树刮倒了。`, example pinyin `Dàfēng bǎ shù guā dǎo le.`
HSK5 row 415 `划`: pinyin `huá`, example `坐船时他负责划船。`, example pinyin `Zuò chuán shí tā fù zé huá chuán.`
```

Operational rule: after any HSK Chinese source, pinyin or Chinese example repair, the release is not fully synchronized until the workbook is rebuilt, Chinese gates pass, the dedicated HSK source import is rerun against Docker/Postgres, the same Google Sheet is updated if the workbook hash changed, and HSK Google Sheet readback verifies the final sheet. Google readback proves `workbook -> Google Sheet`; it does not by itself prove `workbook -> Docker`, so DB import/readback must be part of the closure step.

The executable closure gate for completed HSK releases is:

```bash
node scripts/hsk/check-classic-hsk-final-readiness.mjs
```

For HSK1-HSK5 this gate runs the release checker, Chinese-only gate, semantic pinyin gate, pinyin alignment gate, example complexity gate, polyphonic lock, source audit, dedicated HSK source DB sync/readback and live Google Sheet readback. It writes JSON and Markdown reports under `outputs/hsk/qa/` and fails if any layer has blockers, stale workbook hashes, missing Google readback or Docker/Postgres mismatches. It is the required high-confidence check for finished HSK Classic releases and does not require or schedule a broad manual/native review.

Additional executable Chinese-quality gates:

```bash
node scripts/hsk/check-classic-hsk-pinyin-alignment-gate.mjs <release_id>
node scripts/hsk/check-classic-hsk-example-complexity-gate.mjs <release_id>
node scripts/hsk/check-classic-hsk-polyphonic-lock.mjs
node scripts/hsk/check-hsk-measure-naturalness-gate.mjs
```

These gates are HSK-only and write reports under `outputs/hsk/qa/`. The pinyin alignment gate blocks example pinyin that does not align tone-insensitively with the card pinyin, Han/example syllable count mismatches, Han leakage in pinyin or tone-number pinyin. The example complexity gate blocks placeholder-like examples, Latin/digit artifacts, missing exact source anchors and level-inappropriate length/clause density. The polyphonic lock converts the known cross-level duplicate readings (`喂`, `长`, `得`) into an explicit controlled list; any new semantic-pinyin `needs_review` row becomes a blocker until repaired or deliberately locked with a release-specific reason. The measure naturalness gate scans HSK Classic 1-6 plus HSK3 Levels 1-3 for standalone Chinese `斤` source/example rows. Word translations may explain `斤` / jin / catty, but learner-facing target examples must use natural metric or half-kilo wording instead of calqued `jin/catty` phrasing.

Latest HSK1-HSK5 readiness run after the 2026-06-04 Course Metadata `Module`/`Category` refresh:

```text
status: ok
report: outputs/hsk/qa/hsk2_classic_levels_1_5_final_readiness_20260604.json
markdown: outputs/hsk/qa/hsk2_classic_levels_1_5_final_readiness_20260604.md
blockers: 0
warnings: 4 tracked semantic-pinyin needs_review rows, all controlled by polyphonic lock
pinyin alignment: HSK1-HSK5 2500/2500 rows pass, 0 blockers
example complexity: HSK1-HSK5 2500/2500 rows pass, 0 blockers
polyphonic lock: 5 controlled needs_review rows, 0 blockers
Google readback: HSK1-HSK5 live readback OK
DB sync: inserted 0, updated 0, unchanged 2500, readback mismatches 0
```

All five existing native Google Sheets were updated in place with the ordinary LunaCards five-row `Course Metadata` shape: `Title`, `Description`, localized `Module` for Chinese, and stable `Category` `HSK <level>`. The updated HSK1-HSK5 workbook/readback hashes match their current local `.xlsx` files.

2026-05-31 HSK4 repair from the new pinyin alignment gate: row 74 `大夫` had the correct card/source pinyin `dài fu` for the doctor sense, but `example_pinyin` still read `Lǐ dàfū...`, which is the different classical-official reading. The example pinyin was repaired to `Lǐ dài fu, nín míngtiān shàngwǔ zài yīyuàn ma?`, HSK4 was rebuilt, existing Google Sheet `hsk 4` (`1nxOzYH7BDVmy2KIRPmTjymZ7t99lnQnYwa1Aq3FqScg`) was updated in place, live readback verified 71,080 cells, and Docker/Postgres source readback is current.

2026-06-05 HSK4 measure-naturalness repair: row 333 `葡萄` has source example `葡萄五元一斤。`. Learner-facing examples were normalized away from calqued `jin/catty` phrasing across all target languages, e.g. `Виноград стоит пять юаней за полкило.`, while source/word semantics still preserve the Chinese `斤` concept where appropriate. `example_EN` is now `Grapes are five yuan for half a kilo.`. Repair report: `outputs/hsk/qa/hsk_jin_measure_naturalness_repair_20260605.json`. The HSK-only measure gate `outputs/hsk/qa/hsk_measure_naturalness_gate_20260605.json` passes across HSK Classic 1-6 and HSK3 Levels 1-3 with 2 standalone-`斤` source rows, 106 target example cells checked and 0 blockers. HSK4 was rebuilt, Docker/Postgres source import updated 1 row with 0 readback mismatches, Docker/Postgres translation import updated 151 rows with 0 readback mismatches, the existing Google Sheet `hsk 4` was updated in place, live readback verified 71,188 cells, and targeted HSK4 final readiness `outputs/hsk/qa/hsk2_classic_level_4_600_v1_final_readiness_20260605.json` reports `status: ok`, 0 blockers and 1 existing controlled semantic-pinyin warning.

## Current First Release

Первый подготовленный выпуск:

```text
release_id: hsk2_classic_level_1_150_v1
hsk_version: HSK 2.0 classic
hsk_level: 1
row_count: 150
workbook: outputs/hsk/hsk2_classic_level_1_150_v1.xlsx
csv: outputs/hsk/hsk2_classic_level_1_150_v1.csv
jsonl: outputs/hsk/hsk2_classic_level_1_150_v1.jsonl
```

Это classic HSK 1 на 150 слов, то есть старая/широко используемая система HSK 2.0. Новый HSK 3.0 не смешивается с этим выпуском.

## Next Level Source Reconciliation

Второй выпуск должен быть classic HSK 2.0 level 2. Source list decision is now closed for the next release contour:

```text
release_id: hsk2_classic_level_2_150_v1
hsk_version: HSK 2.0 classic
hsk_level: 2
row_count: 150
source: outputs/hsk/source/hsk2_classic_level_2_150_v1.source.json
reconciliation report: outputs/hsk/qa/hsk2_classic_level_2_150_v1_source_reconciliation_<YYYYMMDD>.json
```

2026-05-05 source check:

- MIT upstream `complete-hsk-vocabulary` path `wordlists/exclusive/old/2.json` currently contains 147 non-HSK1 rows, not 150;
- the matching upstream cumulative path `wordlists/inclusive/old/2.json` contains 297 rows: 150 HSK1 rows plus the same 147 level-2-only rows;
- no duplicates were found between the current HSK1 source snapshot and that 147-row upstream level-2-only snapshot;
- public learner references disagree with this upstream shape: HSK Academy and Hanzi Stroke present HSK2 as 150 items, while ChineseSkill also describes "150 New Words + 150 HSK 1 Words" but uses a partly different item set.

Decision:

```text
Use a curated 150-row HSK2 classic list derived as:
Hewgill HSK2 cumulative 300 - current LunaCards HSK1 150 - location variants 哪儿/那儿/这儿.
```

This produces exactly 150 non-duplicating rows for the second deck. Of these rows, 145 have matching entries in MIT `complete-hsk-vocabulary` old-2 exclusive. Five rows are cross-source curated because they are present in the cumulative/classroom HSK2 references but absent from the 147-row MIT old-2 exclusive snapshot:

```text
等
对
过
踢足球
为什么
```

Do not treat the 147-row MIT source as the final truth for HSK2 release membership. It remains source evidence and dictionary metadata. The canonical source list for this release is the generated 150-row snapshot above, with row-level provenance in `hsk_canonical_source`.

The next implementation step is card curation for HSK2:

- curated Chinese card-facing traditional/pinyin/EN glosses in `config/hsk-classic-hsk2-card-overrides.json`;
- curated Chinese examples, example pinyin and EN examples in `config/hsk-classic-hsk2-examples.json`;
- then language translation packs by the same article/no-transcription policy used for HSK1.

2026-05-05 HSK2 curation status:

- `config/hsk-classic-hsk2-card-overrides.json` exists and covers all 150 source rows;
- `config/hsk-classic-hsk2-examples.json` exists and covers all 150 source rows;
- each curated Chinese example contains the corresponding source word;
- Chinese word pinyin and example pinyin use tone marks / neutral-tone syllables, not tone numbers;
- `scripts/hsk/build-classic-hsk1-release.mjs` now supports `--level=2`, and `scripts/hsk/build-classic-hsk2-release.mjs` wraps it for the second release;
- generated preparation workbook/csv/jsonl:

```text
outputs/hsk/hsk2_classic_level_2_150_v1.xlsx
outputs/hsk/hsk2_classic_level_2_150_v1.csv
outputs/hsk/hsk2_classic_level_2_150_v1.jsonl
```

Current HSK2 workbook is a complete preparation workbook with all 53 target-language word and example columns filled: `EN`, `ES`, `FR`, `DE`, `IT`, `PT`, `RU`, `JA`, `KO`, `VI`, `TH`, `MS`, `ID`, `PL`, `NL`, `SV`, `NO`, `DA`, `FI`, `CS`, `SK`, `HU`, `RO`, `BG`, `HR`, `SR`, `SL`, `LT`, `LV`, `ET`, `IS`, `HI`, `BN`, `TL`, `MY`, `KM`, `LO`, `NE`, `SI`, `TA`, `TE`, `KN`, `ML`, `UZ`, `KK`, `AZ`, `KA`, `HY`, `TR`, `SW`, `PT-BR`, `ES-419` and `EN-GB`. The workbook has been rebuilt with `complete_53_languages_filled` status.

Translation packs are maintained in `config/hsk-classic-hsk2-translations-*.tsv`: Russian; British English regional overrides; Spanish/French/German; Italian/European Portuguese; Japanese/Korean/Vietnamese; Thai/Malay/Indonesian; Polish/Dutch/Swedish/Norwegian Bokmal; Danish/Finnish/Czech/Slovak; Hungarian/Romanian/Bulgarian/Croatian; Serbian/Slovenian/Lithuanian/Latvian; Estonian/Icelandic; Hindi/Bengali/Filipino; Burmese/Khmer/Lao; Nepali/Sinhala/Tamil; Telugu/Kannada/Malayalam; Uzbek/Kazakh/Azerbaijani; Georgian/Armenian/Turkish; and Swahili/Brazilian Portuguese/Latin American Spanish.

Per user request, the current HSK2 workbook is uploaded to Google Drive as `hsk 2` for review:

```text
google_sheet_id: 1eB0f9AIAD-UzWwxmfh-p1enDXxCvMxHoMn0J4vP9bn8
google_sheet_url: https://docs.google.com/spreadsheets/d/1eB0f9AIAD-UzWwxmfh-p1enDXxCvMxHoMn0J4vP9bn8/edit?usp=drivesdk
delivery_manifest: outputs/hsk/hsk2_classic_level_2_150_v1_delivery.json
```

This Drive file is uploaded/readback-verified, but it is still a partial preparation workbook, not complete 53-target-language HSK2 delivery.

## Third Level Source Reconciliation

The third release is now a complete 53-target-language workbook:

```text
release_id: hsk2_classic_level_3_300_v1
hsk_version: HSK 2.0 classic
hsk_level: 3
row_count: 300
source: outputs/hsk/source/hsk2_classic_level_3_300_v1.source.json
workbook: outputs/hsk/hsk2_classic_level_3_300_v1.xlsx
csv: outputs/hsk/hsk2_classic_level_3_300_v1.csv
jsonl: outputs/hsk/hsk2_classic_level_3_300_v1.jsonl
reconciliation report: outputs/hsk/qa/hsk2_classic_level_3_300_v1_source_reconciliation_20260505.json
delivery_manifest: outputs/hsk/hsk2_classic_level_3_300_v1_delivery.json
google_sheet_title: hsk 3
google_sheet_url: https://docs.google.com/spreadsheets/d/1BJdoOwjckwQCgf-xei6JxRG9m5BPn4vep1NjgGaYIHo/edit?usp=drivesdk
```

2026-05-05 HSK3 source check:

- MIT upstream `complete-hsk-vocabulary` path `wordlists/exclusive/old/3.json` currently contains 298 rows, not the expected 300;
- public HSK3 references present 300 rows and include compound rows such as `电子邮件`, `刮风` and `刷牙` where the MIT old-3 exclusive snapshot has raw character rows such as `电子`, `刮` and `刷`;
- public HSK3 references also include repeated simplified forms for distinct listed senses, currently `花` and `只`;
- the HSK builder and release checker now support internal `hsk_key` values such as `96:花`, `97:花`, `283:只` and `284:只` so future HSK levels can preserve repeated listed rows without breaking HSK1/HSK2 simplified-key packs.

Decision:

```text
Use the 300-row HSK Academy HSK3 reference order for HSK 2.0 classic level 3 membership,
enrich with MIT old-3 entries where exact simplified entries exist,
and use Hewgill cumulative 600 plus AllSet HSK3 exclusive as cross-source support.
```

Current HSK3 workbook status:

- `config/hsk-classic-hsk3-card-overrides.json` exists for all 300 rows;
- `config/hsk-classic-hsk3-examples.json` exists for all 300 rows;
- HSK3 Chinese word pinyin uses tone marks / neutral-tone syllables, not tone numbers; the source-reference `lv4` form for `绿` is normalized to `lǜ`;
- Chinese/English editorial QA found and removed raw English dictionary artifacts from `口`, `老`, `辆` and `张`;
- the source-reference `è a` pinyin artifact for `饿` is normalized to `è`;
- `config/hsk-classic-hsk3-examples.json` now contains 300 real short Chinese example sentences, checked English translations and example pinyin;
- the two repeated HSK3 rows are intentionally disambiguated in examples: `96:花` uses the spend/cost sense, `97:花` uses the flower sense, `283:只` uses the "only" adverb sense and `284:只` uses the measure-word sense;
- Chinese native-style QA corrected the `284:只` measure-word row to card-facing `zhī` and example `一只猫`, while keeping `283:只` as adverbial `zhǐ`;
- English native-style QA removed raw dictionary tails from the HSK3 EN glosses and normalized learner-facing senses such as `带`, `地`, `过`, `元`, `越`, `长`, `只`, and common nouns/adjectives before target-language translation starts;
- `scripts/hsk/build-classic-hsk3-canonical-source.mjs` generates the canonical source, draft overrides, draft examples and reconciliation report;
- `scripts/hsk/apply-hsk3-curated-examples.mjs` writes the curated HSK3 example layer after canonical source regeneration;
- `scripts/hsk/build-classic-hsk3-release.mjs` wraps the generic HSK release builder for `hsk2_classic_level_3_300_v1`;
- `config/hsk-classic-hsk3-translations-bg.tsv` fills `BG`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-bn.tsv` fills `BN`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-cs.tsv` fills `CS`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-da.tsv` fills `DA`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-fi.tsv` fills `FI`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-es-fr-de.tsv` fills the first HSK3 target-language batch: `ES`, `FR` and `DE`, including all 300 word cells and all 300 example translation cells per language;
- `config/hsk-classic-hsk3-translations-es-419.tsv` fills `ES-419` from the reviewed Spanish layer with Latin American normalization;
- `config/hsk-classic-hsk3-translations-hi.tsv` fills `HI`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-hr.tsv` fills `HR`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-hu.tsv` fills `HU`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-hy.tsv` fills `HY`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-id.tsv` fills `ID`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-it.tsv` fills `IT`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-ja.tsv` fills `JA`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-az.tsv` fills `AZ`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-ka.tsv` fills `KA`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-kk.tsv` fills `KK`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-km.tsv` fills `KM`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-kn-ml.tsv` fills `KN` and `ML`, including all 300 word cells and all 300 example translation cells per language;
- `config/hsk-classic-hsk3-translations-ko.tsv` fills `KO`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-lo.tsv` fills `LO`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-lt.tsv` fills `LT`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-lv.tsv` fills `LV`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-et.tsv` fills `ET`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-is.tsv` fills `IS`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-ms.tsv` fills `MS`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-my.tsv` fills `MY`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-ne.tsv` fills `NE`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-nl.tsv` fills `NL`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-no.tsv` fills `NO`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-pl.tsv` fills `PL`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-pt.tsv` fills `PT`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-pt-br.tsv` fills `PT-BR` from the reviewed Portuguese layer with Brazilian normalization;
- `config/hsk-classic-hsk3-translations-ro.tsv` fills `RO`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-ru.tsv` fills `RU`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-si.tsv` fills `SI`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-sk.tsv` fills `SK`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-sl.tsv` fills `SL`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-sr.tsv` fills `SR`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-sv.tsv` fills `SV`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-sw.tsv` fills `SW`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-ta.tsv` fills `TA`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-te.tsv` fills `TE`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-th.tsv` fills `TH`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-tl.tsv` fills `TL`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-tr.tsv` fills `TR`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-uz.tsv` fills `UZ`, including all 300 word cells and all 300 example translation cells;
- `config/hsk-classic-hsk3-translations-vi.tsv` fills `VI`, including all 300 word cells and all 300 example translation cells;
- `node scripts/hsk/check-classic-hsk-release.mjs hsk2_classic_level_3_300_v1` passes for workbook structure, row count, xlsx import and Course Metadata;
- `node scripts/hsk/check-classic-hsk-article-policy.mjs hsk2_classic_level_3_300_v1` reports 0 blockers;
- `node scripts/hsk/check-classic-hsk-source-audit.mjs hsk2_classic_level_3_300_v1` reports 0 blockers for all 53 target languages and writes `outputs/hsk/qa/hsk2_classic_level_3_300_v1_source_audit_20260506.json`;
- `node scripts/check-bulk-reference-source-smoke.mjs` passes against the existing candidate source indexes;
- `node scripts/hsk/check-classic-hsk-google-sheet-readback.mjs hsk2_classic_level_3_300_v1` verifies the uploaded Google Sheet `hsk 3` against the generated workbook: 301 rows, 118 columns and 35,680 checked cells;
- the 2026-05-06 native-style polish pass repaired `ES-419` agreement for `坏`, reduced `SV`/`NO` English-lookalike fallback risk for `聪明`, normalized `PT-BR` `坏` to Brazilian `quebrado`, and localized `TL` `computer`/`camera` spellings to `kompyuter`/`kamera`;
- all 53 HSK target-language columns are filled, and `translation_status` / `example_status` now use `complete_53_languages_filled`.

Current Chinese/English HSK3 QA status: the placeholder examples have been replaced and the example set has had a native-style naturalness pass. The workbook has 300 rows, 0 placeholder examples, 0 raw English dictionary-artifact hits, 0 suspicious EN dictionary-tail hits, 0 missing source-word/example inclusion hits and 0 Chinese pinyin tone-number hits. Chinese pinyin uses tone marks plus expected neutral-tone syllables; `啊` and particle `地` are the only word pinyin rows without a tone mark. HSK3 target-language filling is complete for all 53 target languages.

Current source-audit confidence notes: `SI` is source-supported from the existing weak Sinhala dictionary/example indexes; `TA` and `ML` are source-partial; `HY`, `TE` and `KN` keep only non-blocking no-source-candidate warnings because current indexed source coverage is absent. The latest source audit reports 0 blockers, 778 warnings, 3,721 source candidates and 3,200 example candidates; the warnings are Chinese example HSK-snapshot coverage, source-candidate coverage or loanword/cognate limits only, not release blockers.

## Fourth Level Source Reconciliation

The fourth release has started as a source-verified preparation workbook:

```text
release_id: hsk2_classic_level_4_600_v1
hsk_version: HSK 2.0 classic
hsk_level: 4
row_count: 600
source: outputs/hsk/source/hsk2_classic_level_4_600_v1.source.json
workbook: outputs/hsk/hsk2_classic_level_4_600_v1.xlsx
csv: outputs/hsk/hsk2_classic_level_4_600_v1.csv
jsonl: outputs/hsk/hsk2_classic_level_4_600_v1.jsonl
reconciliation report: outputs/hsk/qa/hsk2_classic_level_4_600_v1_source_reconciliation_20260506.json
delivery_manifest: outputs/hsk/hsk2_classic_level_4_600_v1_delivery.json
google_sheet_title: hsk 4
google_sheet_url: https://docs.google.com/spreadsheets/d/1nxOzYH7BDVmy2KIRPmTjymZ7t99lnQnYwa1Aq3FqScg/edit?usp=drivesdk
```

The HSK4 workbook is uploaded to the target Google Drive HSK delivery folder as a native Google Sheet named `hsk 4`. The local OAuth token was refreshed on 2026-05-08 after the previous `invalid_grant` failure, and the folder upload created the folder-verified Sheet `1nxOzYH7BDVmy2KIRPmTjymZ7t99lnQnYwa1Aq3FqScg`. HSK-specific readback verified the `HSK4 Classic` tab and `Course Metadata` sheet after upload: 601 rows, 118 columns and 71,080 checked cells. The older connector-created root Sheet `1sE9LRn4gemUPzZh42892psOsQpdGmD6Zouv9tnhr1FI` is superseded and is not the delivery file.

2026-05-06 HSK4 source check:

- HSK 2.0 classic HSK4 should add 600 new words, for 1,200 cumulative words;
- MIT upstream `complete-hsk-vocabulary` path `wordlists/exclusive/old/4.json` currently contains 598 rows;
- that MIT old-4 snapshot overlaps 18 current LunaCards HSK1-HSK3 source rows, so it is not treated as final membership truth;
- HSK Academy HSK4 presents exactly 600 internally unique rows;
- compared against the combined LunaCards HSK1+HSK2+HSK3 source/workbooks, HSK4 has two repeated simplified forms: `得` and `等`;
- these two rows are intentionally retained as separate HSK-listed senses/readings: HSK2 `得/de` is the degree-complement particle, HSK4 `得/děi` is "must / have to"; HSK2 `等/děng` is "to wait", HSK4 `等/děng` is "and so on / etc.";
- compared to HSK Academy, the MIT old-4 snapshot has 89 rows not used in this canonical HSK4 membership and lacks 91 HSK Academy rows;
- the generated HSK4 canonical source uses HSK Academy order/membership, enriches with MIT old-4 exact entries where present, and uses Hewgill cumulative 1200 and AllSet HSK4 as candidate support.

Current HSK4 preparation status:

- `scripts/hsk/build-classic-hsk4-canonical-source.mjs` generates the canonical 600-row source, draft card overrides, draft examples and reconciliation report;
- `scripts/hsk/build-classic-hsk4-release.mjs` wraps the generic HSK release builder for `hsk2_classic_level_4_600_v1`;
- `scripts/hsk/apply-hsk4-curated-examples.mjs` writes the source-assisted curated HSK4 example layer after canonical source regeneration;
- `config/hsk-classic-hsk4-card-overrides.json` exists for all 600 rows;
- `config/hsk-classic-hsk4-examples.json` exists for all 600 rows with real short Chinese example sentences, checked English translations and example pinyin;
- the current example layer uses 529 HSK Academy sentence candidates plus 71 manual overrides for missing/high-risk or unnatural candidate rows;
- the current Chinese/English example scan reports 600 rows, 0 placeholder examples, 0 missing source-word/example inclusion hits, 0 known bad HSK Academy candidate fragments and 0 Chinese pinyin tone-number hits;
- HSK4 Chinese word pinyin uses tone marks / expected neutral particles, not tone numbers; the only current word pinyin without a tone mark is `呀/ya`;
- Chinese/English source QA corrected HSK4 `得` to card-facing `děi` for the "must / have to" sense, repaired one raw dictionary-tail artifact for `从来`, now `always; never before`, and replaced the unnatural candidate example translation for `严重` with `His illness is serious.`;
- `config/hsk-classic-hsk4-translations-ru.tsv` fills `RU`, including all 600 word cells and all 600 example translation cells;
- HSK4 `RU` cells passed the local Cyrillic/no-Latin/no-Han scan and `check-classic-hsk-source-audit` reports 0 `RU` blockers and 0 `RU` warnings;
- `config/hsk-classic-hsk4-translations-es.tsv` fills `ES`, including all 600 word cells and all 600 example translation cells;
- HSK4 `ES` uses learner-facing Spanish articles for noun cells where useful, has been normalized away from obvious Latin American-only forms in the base `ES` layer, and `check-classic-hsk-source-audit` reports 0 `ES` blockers and 0 `ES` warnings;
- current fully completed target-language columns are `EN`, `EN-GB`, `RU`, `ES`, `ES-419`, `FR`, `DE`, `IT`, `PT`, `JA`, `KO`, `VI`, `TH`, `MS`, `ID`, `PL`, `NL`, `SV`, `NO`, `DA`, `FI`, `CS`, `SK`, `HU`, `RO`, `BG`, `HR`, `SR`, `SL`, `LT`, `LV`, `ET`, `IS`, `HI`, `BN`, `TL`, `MY`, `KM`, `LO`, `NE`, `SI`, `TA`, `TE`, `KN`, `ML`, `UZ`, `KK`, `AZ`, `KA`, `HY`, `TR`, `SW` and `PT-BR`; all 53 HSK4 target-language word/example columns are filled, but they still require any separate user-requested native review pass before being described as externally reviewed;
- the 2026-05-06 Chinese/English native-style repair pass removed Han leaks from English glosses for `俩`, `呀`, `之` and `直接`, repaired Chinese/English examples for `活动`, `活泼`, `森林`, `剩`, `随着`, `之` and `重`, and improved English example wording for `场`, `及时`, `来得及`, `师傅`, `顺便`, `随便` and `咱们`;
- the same repair pass updated the matching `RU` and `ES` example translations for changed Chinese example scenes, including `场`, `活动`, `活泼`, `来得及`, `森林`, `剩`, `师傅`, `顺便`, `随便`, `咱们`, `之` and `重`;
- the later 2026-05-06 HSK4 Chinese source/example audit repaired example drift for `火`, `假`, `节` and `举`, replacing compound/other-sense examples with direct examples for the listed HSK4 senses and syncing completed `RU`, `ES`, `ES-419`, `FR`, `DE`, `IT` and `PT` example translations;
- the same HSK4 Chinese source/example audit later repaired `空`, `苦`, `垃圾桶`, `留`, `满` and `毛`, improved English examples for `力气` and `零钱`, and corrected `困` to card-facing `sleepy; tired`; completed `RU`, `ES`, `ES-419`, `FR`, `DE`, `IT` and `PT` translations were synced for those changed scenes/senses;
- the next HSK4 Chinese source/example audit repaired `内`, `轻`, `取` and `扔`, replacing compound/other-reading examples and fixing `垃圾` pinyin in the `扔` example; completed `RU`, `ES`, `ES-419`, `FR`, `DE`, `IT` and `PT` translations were synced for changed scenes;
- the following HSK4 Chinese/English source audit repaired card-facing meanings for `敲`, `勺子`, `生意`, `省`, `受到` and `台`, improved `收拾` and `受到` English examples, and kept already-filled `RU`, `ES`, `ES-419`, `FR`, `DE`, `IT` and `PT` aligned with the corrected HSK scenes/senses;
- the next HSK4 Chinese/pinyin/English source audit repaired `弹钢琴`, `汤`, `糖`, `躺`, `提`, `推`, `现金` and `橡皮`, including direct `提` and `推` examples, corrected erhua/result-complement pinyin and more natural English examples; the already-filled `RU`, `ES`, `ES-419`, `FR`, `DE`, `IT` and `PT` translations were synced for the changed `提` scene;
- the next HSK4 Chinese/pinyin/English source audit repaired `行`, `醒`, `性格`, `许多`, `研究`, `以`, `与` and `原来`, including direct HSK-sense examples for `行`, `醒`, `研究` and `以`, corrected `垃圾/lājī`, `性格/de`, `原来的地方/de dìfang`, and synced completed `RU`, `ES`, `ES-419`, `FR`, `DE`, `IT` and `PT` translations for the changed scenes;
- the final HSK4 `JA`/`KO`/`VI` completion pass repaired `暂时`, `照`, `知识`, `赚` and `作用`, including corrected `暂时/zànshí`, `赚了/zhuàn le`, direct `照` example wording and card-facing EN cleanup for `知识/knowledge` and `作用/effect; function; role`; completed `RU`, `ES`, `ES-419`, `FR`, `DE`, `IT` and `PT` translations were synced for the changed `照` scene;
- the latest Chinese/pinyin/English scan after rebuilding reports 600 rows, 0 pinyin tone-number issues, 0 Han-in-pinyin issues, 0 missing-tone issues apart from expected neutral `呀/ya`, 0 placeholder examples, 0 missing source-word/example inclusion hits, 0 malformed Chinese example ASCII hits, 0 Han leaks in English gloss/example cells and 0 known bad English pattern hits;
- after this repair, `check-classic-hsk-source-audit` still exits nonzero because unfilled target languages are blockers, but the filled `ES` and `RU` summaries remain 600 word cells, 600 example cells, 0 blockers and 0 warnings;
- `config/hsk-classic-hsk4-translations-es-419.tsv` fills `ES-419` from the reviewed Spanish layer with Latin American normalization, including `zumo` -> `jugo`, `billete` -> `boleto`, `ordenador` -> `computadora`, `coche` -> `auto`, `aparcar` -> `estacionar`, `gasolinera` -> `estación de servicio` and `camarero` -> `mesero` where context requires it;
- after adding `ES-419`, `check-classic-hsk-source-audit` still exits nonzero because unfilled target languages are blockers, but filled `ES-419` shows 600 word cells, 600 example cells, 0 blockers and 0 warnings;
- `config/hsk-classic-hsk4-translations-it.tsv` fills `IT`, including all 600 word cells and all 600 example translation cells;
- after completing `IT`, `check-classic-hsk-source-audit` still exits nonzero because unfilled target languages are blockers, but filled `IT` shows 600 word cells, 600 example cells, 0 blockers and 0 warnings;
- `config/hsk-classic-hsk4-translations-pt.tsv` fills `PT`, including all 600 word cells and all 600 example translation cells;
- after completing `PT`, `check-classic-hsk-source-audit` still exits nonzero because unfilled target languages are blockers, but filled `PT` shows 600 word cells, 600 example cells, 0 blockers and one non-blocking source-coverage warning because indexed Portuguese HSK source candidates are sparse;
- `config/hsk-classic-hsk4-translations-fr-de.tsv` fills `FR` and `DE`, including all 600 word cells and all 600 example translation cells per language;
- after completing `FR`/`DE`, `check-classic-hsk-source-audit` still exits nonzero because unfilled target languages are blockers, but filled `FR` and `DE` each show 600 word cells, 600 example cells, 0 blockers and one non-blocking source-coverage warning;
- `config/hsk-classic-hsk4-translations-ja-ko-vi.tsv` fills `JA`, `KO` and `VI`, including all 600 word cells and all 600 example translation cells per language;
- after completing `JA`/`KO`/`VI`, `check-classic-hsk-source-audit` still exits nonzero because later target languages are blank, but filled `JA` and `KO` each show 600 word cells, 600 example cells, 0 blockers and 0 warnings; filled `VI` shows 600 word cells, 600 example cells, 0 blockers and one non-blocking source-coverage warning because indexed Vietnamese HSK source candidates are sparse;
- `config/hsk-classic-hsk4-translations-th-ms-id.tsv` fills `TH`, `MS` and `ID`, including all 600 word cells and all 600 example translation cells per language;
- the `TH`/`MS`/`ID` start pass also repaired additional HSK4 Chinese/pinyin/English source issues for `棒`, `不管`, `打扮`, `打印`, `大概`, `大夫`, `戴`, `当`, `导游`, `倒`, `底`, `地球`, `掉`, `父亲`, `负责`, `感谢`, `敢`, `干`, `光`, `海洋`, `互联网`, `怀疑`, `寄`, `交`, `教育`, `究竟`, `距离`, `可怜`, `可是`, `理发`, `厉害`, `连`, `流行`, `马虎`, `母亲`, `能力`, `排列`, `普通话`, `千万`, `签证`, `耐心`, `难受`, `其中`, `敲`, `桥`, `任何`, `师傅`, `十分`, `适合`, `适应`, `帅`, `顺便`, `硕士`, `死`, `失败`, `收`, `收入`, `首先`, `受不了`, `受到`, `数量`, `说明`, `台` and `态度`, including the direct `当/dāng` "to be/work as" example, `倒/dǎo` reading, direct `敢/gǎn` and `干/gàn` examples, direct `底/dǐ` bottom example, corrected pinyin spacing in multiple examples, full pinyin for the `地球`/`海洋` examples, better card-facing senses for `连`, `流行`, `千万`, `签证`, `适应`, `硕士` and `死`, and removal of the irrelevant "stick" sense from card-facing `棒`; already-filled target languages were synced for changed scenes when needed;
- the next `TH`/`MS`/`ID` slice repaired additional HSK4 source issues for `填空`, `挺`, `同情`, `同时`, `网站`, `危险`, `味道`, `无`, `无聊`, `吸引`, `香`, `详细`, `橡皮`, `信封`, `信息` and `辛苦`, including natural English examples, corrected pinyin spacing/tone marks and cleaner card-facing senses where raw dictionary tails had leaked into learner-facing glosses;
- the final `TH`/`MS`/`ID` completion slice also forced a 600-row Chinese mechanical freeze scan and repaired the remaining Chinese-layer mechanical defects: numeric Chinese/pinyin examples for `差不多`, `公里`, `推迟` and `至少`, and the unnatural English example for `正常`;
- after completing `TH`/`MS`/`ID`, `check-classic-hsk-source-audit` still exits nonzero because later target languages are blank, but filled `TH`, `MS` and `ID` each show 600 word cells, 600 example cells and 0 blockers; `TH` has one no-source warning, `MS` has seven non-blocking source-coverage warnings and `ID` has five non-blocking source-coverage warnings;
- `config/hsk-classic-hsk4-translations-pl-nl-sv-no.tsv` fills `PL`, `NL`, `SV` and `NO`, including all 600 word cells and all 600 example translation cells per language; `NL`, `SV` and `NO` use article-aware noun display where natural, while `PL` remains a no-article language;
- the 121-180 slice repaired one HSK4 card-facing EN gloss artifact for `汗`, removing the irrelevant `Khan` sense and keeping the learner-facing meaning as `sweat; perspiration`;
- the 301-360 slice repaired HSK4 card-facing EN gloss artifacts for `迷路`, `秒`, `篇`, `轻松` and `穷`, removing raw dictionary tails such as irrelevant labyrinth/angle/bamboo-slip senses and keeping learner-facing HSK meanings;
- the 361-600 completion pass repaired additional HSK4 card-facing EN gloss artifacts for `输`, `酸`, `汤`, `特点`, `文章`, `笑话`, `幸福`, `修理`, `页`, `赢`, `咱们`, `证明`, `植物`, `质量`, `周围`, `专门`, `自然` and `座`, keeping card-facing meanings aligned with the HSK sense and the Chinese examples;
- after completing `PL`/`NL`/`SV`/`NO`, `check-classic-hsk-source-audit` still exits nonzero because later target languages are blank, but `PL`, `NL`, `SV` and `NO` each show 600 filled word cells, 600 filled example cells and 0 blockers;
- `config/hsk-classic-hsk4-translations-da-fi-cs-sk.tsv` fills `DA`, `FI`, `CS` and `SK`, including all 600 word cells and all 600 example translation cells per language; Danish uses article-aware noun display where natural, while Finnish, Czech and Slovak do not add artificial articles;
- the first `DA`/`FI`/`CS`/`SK` slice repaired HSK4 card-facing EN gloss artifacts for `抱歉`, `遍`, `表演`, `博士`, `擦`, `材料`, `参观`, `餐厅`, `尝`, `长江`, `场`, `诚实` and `词语`, removing irrelevant raw dictionary tails while preserving the HSK sense;
- the 61-120 slice repaired HSK4 card-facing EN gloss artifacts for `存`, `打招呼`, `到底`, `得意`, `低`, `丢`, `堵车`, `对于`, `儿童`, `而`, `烦恼`, `方面` and `份`, again removing raw dictionary tails that did not match the HSK example scene;
- the 121-180 slice repaired HSK4 card-facing EN gloss artifacts for `符合`, `干杯`, `感觉`, `感情`, `赶`, `功夫`, `够`, `挂`, `观众`, `广播`, `规定`, `过程`, `害羞`, `航班`, `合格` and `厚`;
- the 181-240 slice repaired HSK4 card-facing EN gloss artifacts for `活动`, `激动`, `积极`, `坚持`, `交`, `交流`, `交通`, `教授`, `接着`, `节`, `节约`, `尽管`, `进行`, `经验`, `警察`, `竟然` and `举`;
- the 241-300 slice repaired HSK4 card-facing EN gloss artifacts for `距离`, `开玩笑`, `客厅`, `空`, `困难`, `拉`, `来自`, `理想`, `厉害`, `俩`, `联系`, `留`, `旅行`, `乱`, `麻烦` and `毛`;
- the 301-360 slice repaired HSK4 card-facing EN gloss artifacts for `密码`, `耐心`, `难受`, `内`, `弄`, `判断`, `骗`, `平时`, `破`, `气候`, `轻`, `区别`, `取`, `全部`, `缺少` and `确实`;
- the 361-420 slice repaired HSK4 card-facing EN gloss artifacts for `申请`, `生活`, `生命`, `失败`, `实际`, `实在`, `使`, `是否`, `收入`, `随着`, `所有`, `台`, `抬` and `态度`;
- the 421-480 slice repaired HSK4 card-facing EN gloss artifacts for `趟`, `讨厌`, `提`, `提供`, `提前`, `提醒`, `条件`, `停`, `通过`, `通知`, `同时`, `推迟`, `脱`, `完全`, `卫生间`, `味道`, `无`, `无论`, `误会`, `羡慕`, `效果`, `心情` and `信息`;
- the 481-540 slice repaired HSK4 card-facing EN gloss artifacts for `信心`, `醒`, `性别`, `许多`, `呀`, `严格`, `严重`, `研究`, `演出`, `演员`, `养成`, `样子`, `也许`, `以`, `以为`, `意见`, `因此`, `引起`, `赢`, `永远`, `优点`, `幽默`, `由`, `由于`, `友好`, `有趣`, `于是`, `与`, `预习` and `原来`;
- the 541-600 completion slice repaired HSK4 card-facing EN gloss artifacts for `原谅`, `原因`, `约会`, `咱们`, `暂时`, `责任`, `招聘`, `真正`, `整理`, `正常`, `正好`, `正确`, `之`, `支持`, `直接`, `职业`, `只好`, `只要`, `指`, `至少`, `重`, `重点`, `重视`, `主意`, `著名`, `专门`, `专业`, `转`, `准确`, `准时`, `仔细`, `自信`, `总结`, `租`, `最好`, `尊重`, `左右`, `作用`, `作者`, `座` and `座位`;
- after completing `DA`/`FI`/`CS`/`SK`, `check-classic-hsk-source-audit` still exits nonzero because later target languages are blank, but `DA`, `FI`, `CS` and `SK` each show 600 filled word cells, 600 filled example cells and 0 blockers; `DA` and `FI` are source-partial from sparse indexed candidate coverage, while `CS` and `SK` remain generated-checked/no-source because current indexed HSK source coverage is absent;
- `config/hsk-classic-hsk4-translations-hu-ro-bg-hr.tsv` fills `HU`, `RO`, `BG` and `HR`, including all 600 word cells and all 600 example translation cells per language; Romanian uses article-aware noun display where natural, while Hungarian, Bulgarian and Croatian do not add artificial articles;
- all 600 `HU`/`RO`/`BG`/`HR` rows passed local script checks: Hungarian/Romanian/Croatian target cells stay Latin-script, Bulgarian target cells stay Cyrillic-script, and no target cells contain Han characters;
- the second slice repaired one Bulgarian script blocker in `短信` by replacing Latin `SMS` with Bulgarian `есемес` in the word translation cell;
- the third slice repaired one local-script typo in the draft `HU` word translation for `功夫`, changing accidental Cyrillic `кунгфу` to Latin `kungfu`;
- the fourth slice repaired a local-script typo in draft `HU` for `交流`, a Croatian typo in the `接受` example, and a Romanian display-form typo for `竟然`;
- the fifth slice repaired one local-script typo in draft `HU` for `凉快`, changing accidental Bulgarian `приятно хладен` to Hungarian `kellemesen hűvös`;
- the sixth slice repaired a local-script typo in draft `HU` for `普通话`, a Hungarian word-order issue in the `全部` example and a Croatian naturalness issue in the `葡萄` example;
- the seventh slice removed an English tail from `RO` `日记`, normalized Croatian `是否`, improved the Hungarian `态度` example and tightened the Romanian `千万` display form;
- the eighth slice repaired Romanian examples for `脱`, `无聊` and `现金`, and normalized `网站` display/example wording in Romanian and Croatian;
- the ninth slice filled rows 481-540 (`信心` through `原来`) and then tightened native-style surfaces for `RO` `永远`, `RO`/`HR` `样子` and `HU` `由`; the English-like scan found only legitimate Romanian cognates `strict` and `actor`, not fallback values;
- the tenth completion slice filled rows 541-600 (`原谅` through `座位`) and then tightened native-style surfaces for `正确`, `专业`, `总结` and `左右`; the English-like scan found only legitimate Romanian cognates or non-English homographs such as `plantă`, `direct`, `magazine`, `special` and `natural`;
- after completing `HU`/`RO`/`BG`/`HR`, `check-classic-hsk-source-audit` still exits nonzero because later target languages are blank, but `HU`, `RO`, `BG` and `HR` each show 600 filled word cells, 600 filled example cells and 0 blockers;
- `config/hsk-classic-hsk4-translations-sr-sl-lt-lv.tsv` completes the `SR`, `SL`, `LT` and `LV` batch, filling all 600 HSK4 rows with 600 word cells and 600 example translation cells per language; Serbian is kept consistently Cyrillic, while Slovenian, Lithuanian and Latvian stay Latin-script and no-artificial-article;
- all 600 `SR`/`SL`/`LT`/`LV` rows passed local script checks: Serbian target cells stay Cyrillic-script, Slovenian/Lithuanian/Latvian target cells stay Latin-script, and no target cells contain Han characters;
- the first `SR`/`SL`/`LT`/`LV` slice tightened Latvian surfaces for `比如`, `厕所` and `传真`; the English-like scan found only legitimate Slovenian/Lithuanian cognates `standard` and `forma`, not fallback values;
- the second `SR`/`SL`/`LT`/`LV` slice filled rows 61-120 (`粗心` through `否则`), then tightened Slovenian `不得不`, Lithuanian `当` and the `儿童` height example in all four languages; the English-like scan found no fallback values in the second slice;
- the third `SR`/`SL`/`LT`/`LV` slice filled rows 121-180 (`符合` through `怀疑`), then tightened Serbian `付款`/`购物`, Latvian `好处` and Latvian `怀疑`; the English-like scan found no fallback values in the third slice;
- the fourth `SR`/`SL`/`LT`/`LV` slice filled rows 181-240 (`回忆` through `举`), then tightened Lithuanian `家具` and Serbian `交通`; the English-like scan found no fallback values in the fourth slice;
- the fifth `SR`/`SL`/`LT`/`LV` slice filled rows 241-300 (`举办` through `毛`); the English-like scan found only legitimate Slovenian forms `tiger` and `ideal`, not fallback values;
- the sixth `SR`/`SL`/`LT`/`LV` slice filled rows 301-360 (`毛巾` through `扔`), then tightened Lithuanian `其次`, Latvian `全部`, and Slovenian/Lithuanian `任务`; the English-like scan found only legitimate Slovenian/Lithuanian Mandarin/Putonghua forms and the Lithuanian word `visa`, not fallback values;
- the seventh `SR`/`SL`/`LT`/`LV` slice filled rows 361-420 (`仍然` through `态度`), then tightened Latvian `日记`, Serbian/Slovenian `沙发`, Slovenian `生命` and Slovenian `台`; the English-like scan found only legitimate sofa/province forms, not fallback values;
- the eighth `SR`/`SL`/`LT`/`LV` slice filled rows 421-480 (`弹钢琴` through `信息`), then tightened Serbian `味道`; the English-like scan found only legitimate Latvian `apbrīnot`, not fallback values;
- the ninth `SR`/`SL`/`LT`/`LV` slice filled rows 481-540 (`信心` through `原来`), then tightened Serbian `眼镜`, Lithuanian `邀请` and Latvian `邀请`; the English-like scan found only legitimate Slovenian `semester`/`badminton` and related badminton forms, not fallback values;
- the tenth completion slice filled rows 541-600 (`原谅` through `座位`); local script and English-like scans found no fallback values;
- after completing `SR`/`SL`/`LT`/`LV`, `check-classic-hsk-source-audit` still exits nonzero because later target-language packs are blank; `SR`, `SL`, `LT` and `LV` each show 600 filled word cells, 600 filled example cells and 0 blockers;
- `node scripts/hsk/check-classic-hsk-release.mjs hsk2_classic_level_4_600_v1` passes for workbook structure, row count, xlsx import and Course Metadata;
- `node scripts/hsk/check-classic-hsk-article-policy.mjs hsk2_classic_level_4_600_v1` reports 0 blockers;
- `config/hsk-classic-hsk4-translations-et-is.tsv` completed the `ET` and `IS` batch with rows 1-600 (`爱情` through `座位`) and 600 word cells plus 600 example translation cells per language; both languages stay Latin-script and no-artificial-article;
- the completed `ET`/`IS` pack passed local script checks: no target cells contain Han characters or Cyrillic-script leakage;
- the first `ET`/`IS` slice English-like scan found only legitimate local forms `standard` and `fax`, not fallback values;
- the second `ET`/`IS` slice filled rows 61-120 (`粗心` through `否则`); the English-like scan found only legitimate Icelandic `fax`, not a fallback value;
- the third `ET`/`IS` slice filled rows 121-180 (`符合` through `怀疑`); the English-like scan found only legitimate Estonian `number` and `internet`, not fallback values;
- the fourth `ET`/`IS` slice filled rows 181-240 (`回忆` through `举`), then tightened Icelandic `积极`, `饺子` and `教育`; the English-like scan found only legitimate Estonian `reporter` and `professor`, not fallback values;
- the fifth `ET`/`IS` slice filled rows 241-300 (`举办` through `毛`), then tightened Icelandic `矿泉水` and `例如`; local script and English-like scans found no fallback values;
- the sixth `ET`/`IS` slice filled rows 301-360 (`毛巾` through `扔`), then tightened Icelandic `年龄` and `平时`; the English-like scan found only the legitimate Icelandic compound `borðtennis`, not a fallback value;
- the seventh `ET`/`IS` slice filled rows 361-420 (`仍然` through `态度`); the English-like scan found only the legitimate Estonian `number`, not a fallback value;
- the eighth `ET`/`IS` slice filled rows 421-480 (`弹钢琴` through `信息`), then tightened Icelandic `同情` and `味道`, plus Estonian `小吃`; the English-like scan found only legitimate Estonian/Icelandic `tennis`, not fallback values;
- the ninth `ET`/`IS` slice filled rows 481-540 (`信心` through `原来`), then tightened Estonian `学期`, Estonian `意见` and Icelandic `演出`; the English-like scan found only legitimate `semester`, `salt` and `badminton` forms, not fallback values;
- the tenth completion slice filled rows 541-600 (`原谅` through `座位`); local script and English-like scans found no fallback values;
- after completing `ET`/`IS`, `check-classic-hsk-source-audit` still exits nonzero because remaining target-language packs are blank; `ET` and `IS` each show 600 filled word cells, 600 filled example cells and 0 blockers;
- `config/hsk-classic-hsk4-translations-hi-bn-tl.tsv` completes the `HI`, `BN` and `TL` batch with rows 1-600 (`爱情` through `座位`) filled: 600 word cells and 600 example translation cells per language; `HI` stays Devanagari-only, `BN` stays Bengali-script, and `TL` stays normal Filipino/Tagalog Latin orthography with no target-language transcription;
- the first `HI`/`BN`/`TL` slice repaired Bengali `不过` and Filipino fallback-risk wording for `标准`, `博士`, `超过`, `乘坐` and `出差`; local script and English-like scans found no remaining fallback values;
- the second `HI`/`BN`/`TL` slice filled rows 61-120 (`粗心` through `否则`), then tightened Filipino `打印`, `打折`, `大使馆`, `导游` and `放松`; local script and English-like scans found no remaining fallback values;
- the third `HI`/`BN`/`TL` slice filled rows 121-180 (`符合` through `怀疑`), then repaired Bengali `赶`, Bengali `光`, Filipino `共同`, Filipino `父亲` and Filipino `复印`; local script checks pass and the English-like scan finds only accepted Filipino `internet` / `kung fu` loan forms;
- the fourth `HI`/`BN`/`TL` slice filled rows 181-240 (`回忆` through `举`), then repaired Bengali `坚持`, Bengali `结果`, and Filipino `记者`, `加班`, `奖金`, `郊区`; local script checks pass and the English-like scan finds only accepted cultural `jiaozi`;
- the fifth `HI`/`BN`/`TL` slice filled rows 241-300 (`举办` through `毛`), then tightened Hindi `矿泉水` and Filipino `苦`, `老虎`, `冷静`, `理想`, `连`, `麻烦`; local script checks pass and the English-like scan finds only accepted Filipino `tubig mineral`;
- the sixth `HI`/`BN`/`TL` slice filled rows 301-360 (`毛巾` through `扔`), then tightened Hindi `毛巾`, Bengali `美丽`, Bengali `免费`, Filipino `密码` and Filipino `乒乓球`; local script checks pass and the English-like scan finds only accepted language-name `Mandarin` / `Putonghua`;
- the seventh `HI`/`BN`/`TL` slice filled rows 361-420 (`仍然` through `态度`), then repaired a Bengali `随着` script leak and a Filipino `说明` English fragment; local script checks pass and the English-like scan finds only accepted Filipino `sofa`;
- the eighth `HI`/`BN`/`TL` slice filled rows 421-480 (`弹钢琴` through `信息`); local script checks pass and the English-like scan found no fallback values;
- the ninth `HI`/`BN`/`TL` slice filled rows 481-540 (`信心` through `原来`), then repaired the Filipino `以为` TSV split; local script checks pass and the English-like scan finds only accepted Filipino `badminton`;
- the tenth completion slice filled rows 541-600 (`原谅` through `座位`), then repaired Bengali `原因`, `总结` and `左右`; local script checks pass and the English-like scan finds only accepted Filipino `pakikipag-date` and `normal`;
- after completing `HI`/`BN`/`TL`, `check-classic-hsk-source-audit` still exits nonzero because remaining target-language packs are blank; `HI`, `BN` and `TL` each show 600 filled word cells, 600 filled example cells and 0 blockers;
- `config/hsk-classic-hsk4-translations-my-km-lo.tsv` completes the `MY`, `KM` and `LO` batch with rows 1-600 (`爱情` through `座位`) and 600 word cells plus 600 example translation cells per language; `MY` stays Myanmar-script, `KM` stays Khmer-script, and `LO` stays Lao-script with no target-language transcription;
- the first `MY`/`KM`/`LO` slice passed local script checks with no Latin, Han or cross-script leakage;
- the second `MY`/`KM`/`LO` slice filled rows 61-120 (`粗心` through `否则`); local script checks again found no Latin, Han or cross-script leakage;
- the third `MY`/`KM`/`LO` slice filled rows 121-180 (`符合` through `怀疑`), then repaired a Khmer `逛` Chinese-particle leak; local script checks pass with no Latin, Han or cross-script leakage;
- the fourth `MY`/`KM`/`LO` slice filled rows 181-240 (`回忆` through `举`), then repaired a Khmer `坚持` Chinese-fragment leak; local script checks pass with no Latin, Han or cross-script leakage;
- the fifth `MY`/`KM`/`LO` slice filled rows 241-300 (`举办` through `毛`), then repaired a Burmese `看法` Chinese-fragment leak; local script checks pass with no Latin, Han or cross-script leakage;
- the sixth `MY`/`KM`/`LO` slice filled rows 301-360 (`毛巾` through `扔`); local script checks pass with no Latin, Han or cross-script leakage;
- the seventh `MY`/`KM`/`LO` slice filled rows 361-420 (`仍然` through `态度`), then repaired a Thai-script leak in Khmer `逛` and Burmese `孙子`; local script checks now include Thai block detection and pass with no Latin, Han or cross-script leakage;
- the eighth `MY`/`KM`/`LO` slice filled rows 421-480 (`弹钢琴` through `信息`), then repaired Malayalam-script leakage in Burmese `另外`/`谈` and Hangul leakage in Burmese `网站`; the expanded script scan now includes Thai, Hangul, Japanese, Indic, Cyrillic, Arabic, Hebrew and Georgian blocks and passes with no leakage;
- the ninth `MY`/`KM`/`LO` slice filled rows 481-540 (`信心` through `原来`); the expanded script scan passes with 540 unique rows and no Latin, Han or cross-script leakage;
- the tenth completion slice filled rows 541-600 (`原谅` through `座位`); the expanded script scan passes with 600 unique rows and no Latin, Han or cross-script leakage;
- after completing `MY`/`KM`/`LO`, `check-classic-hsk-source-audit` reports 25,200 expected preparation blockers because the remaining non-English target-language translation packs have not been created yet; `MY`, `KM` and `LO` each show 600 filled word cells, 600 filled example cells and 0 blockers.
- `config/hsk-classic-hsk4-translations-ne-si-ta.tsv` starts the `NE`, `SI` and `TA` batch; Nepali stays Devanagari-script, Sinhala stays Sinhala-script, Tamil stays Tamil-script, and target-language transcription remains out of scope;
- the first `NE`/`SI`/`TA` slice filled rows 1-60 (`爱情` through `从来`), then repaired Sinhala punctuation and the Sinhala `出现` word cell after local script checking;
- the second `NE`/`SI`/`TA` slice filled rows 61-120 (`粗心` through `否则`), then repaired a Sinhala Chinese-fragment leak in the `大使馆` example and a Tamil-script leak in the Sinhala `底` word cell;
- the third `NE`/`SI`/`TA` slice filled rows 121-180 (`符合` through `怀疑`), then repaired a Sinhala Chinese-fragment leak in the `富` example and a Tamil-script leak in the Sinhala `各` word cell;
- the fourth `NE`/`SI`/`TA` slice filled rows 181-240 (`回忆` through `举`), then repaired a Sinhala `加班` example after local script checking caught an accidental Cyrillic fragment;
- the fifth `NE`/`SI`/`TA` slice filled rows 241-300 (`举办` through `毛`), then repaired Sinhala `烤鸭`, `困难` and `礼貌` cells after local script checking caught Tamil/Devanagari fragments;
- the sixth `NE`/`SI`/`TA` slice filled rows 301-360 (`毛巾` through `扔`); local script and Latin scans found no fallback values or cross-script leakage in this slice;
- the seventh `NE`/`SI`/`TA` slice filled rows 361-420 (`仍然` through `态度`); local script and Latin scans found no fallback values or cross-script leakage in this slice;
- the eighth `NE`/`SI`/`TA` slice filled rows 421-480 (`弹钢琴` through `信息`); local script and Latin scans found no fallback values or cross-script leakage in this slice;
- the ninth `NE`/`SI`/`TA` slice filled rows 481-540 (`信心` through `原来`), then repaired Sinhala `醒`, `印象` and `勇敢` cells after local script checking caught Tamil/Han/Devanagari fragments;
- the tenth completion slice filled rows 541-600 (`原谅` through `座位`);
- local expanded script and Latin scans now pass for the completed `NE`/`SI`/`TA` file with 600 unique rows, 600 word cells and 600 example translation cells per language, and no Han, Latin or cross-script leakage;
- after completing `NE`/`SI`/`TA`, `check-classic-hsk-source-audit` reports 19,800 expected preparation blockers overall because later target-language packs are not complete; `NE`, `SI` and `TA` each show 600 filled word cells, 600 filled example cells and 0 blockers; `NE` and `TA` each have one non-blocking sparse-source warning, while `SI` is source-partial from indexed Sinhala example coverage.
- `config/hsk-classic-hsk4-translations-te-kn-ml.tsv` starts the `TE`, `KN` and `ML` batch; Telugu stays Telugu-script, Kannada stays Kannada-script, Malayalam stays Malayalam-script, and target-language transcription remains out of scope;
- the first `TE`/`KN`/`ML` slice filled rows 1-60 (`爱情` through `从来`);
- the second `TE`/`KN`/`ML` slice filled rows 61-120 (`粗心` through `否则`);
- the third `TE`/`KN`/`ML` slice filled rows 121-180 (`符合` through `怀疑`) and repaired a Malayalam `果汁` word/example after local script checking caught an accidental Tamil-script character;
- the fourth `TE`/`KN`/`ML` slice filled rows 181-240 (`回忆` through `举`) and repaired Chinese-fragment leaks in Telugu `坚持` and Malayalam `究竟` after local script checking;
- the fifth `TE`/`KN`/`ML` slice filled rows 241-300 (`举办` through `毛`) and repaired Kannada `来得及` after local script checking caught Tamil/Telugu-script leakage inside the Kannada example;
- the sixth `TE`/`KN`/`ML` slice filled rows 301-360 (`毛巾` through `扔`);
- the seventh `TE`/`KN`/`ML` slice filled rows 361-420 (`仍然` through `态度`) and repaired Malayalam `生命`, Telugu `首都` and Telugu `随着` after local script checking caught Tamil-script leakage and a Chinese fragment;
- the eighth `TE`/`KN`/`ML` slice filled rows 421-480 (`弹钢琴` through `信息`);
- the ninth `TE`/`KN`/`ML` slice filled rows 481-540 (`信心` through `原来`);
- the tenth completion slice filled rows 541-600 (`原谅` through `座位`) and repaired Malayalam `约会` after local script checking caught Kannada-script leakage in the example cell;
- local script and Latin scans pass for the completed `TE`/`KN`/`ML` file with 600 unique rows, 600 word cells and 600 example translation cells per language, and no Han, Latin or cross-script leakage;
- after the completed `TE`/`KN`/`ML` rebuild, `check-classic-hsk-release` and `check-classic-hsk-article-policy` pass; `check-classic-hsk-source-audit` still exits nonzero with 14,400 expected preparation blockers because later target-language packs remain blank; `TE`, `KN` and `ML` each show 600 filled word cells, 600 filled example cells and 0 blockers. `TE` keeps one non-blocking no-source warning, while `KN` and `ML` are source-partial from sparse indexed candidate coverage.
- `config/hsk-classic-hsk4-translations-uz-kk-az.tsv` starts the `UZ`, `KK` and `AZ` batch; Uzbek stays Latin-script, Kazakh stays Cyrillic-script, Azerbaijani stays Latin-script, and target-language transcription remains out of scope;
- the first `UZ`/`KK`/`AZ` slice filled rows 1-60 (`爱情` through `从来`);
- the second `UZ`/`KK`/`AZ` slice filled rows 61-120 (`粗心` through `否则`);
- the third `UZ`/`KK`/`AZ` slice filled rows 121-180 (`符合` through `怀疑`);
- the fourth `UZ`/`KK`/`AZ` slice filled rows 181-240 (`回忆` through `举`);
- the fifth `UZ`/`KK`/`AZ` slice filled rows 241-300 (`举办` through `毛`);
- the sixth `UZ`/`KK`/`AZ` slice filled rows 301-360 (`毛巾` through `扔`);
- the seventh `UZ`/`KK`/`AZ` slice filled rows 361-420 (`仍然` through `态度`);
- the eighth `UZ`/`KK`/`AZ` slice filled rows 421-480 (`弹钢琴` through `信息`);
- the ninth `UZ`/`KK`/`AZ` slice filled rows 481-540 (`信心` through `原来`) and repaired `呀` and `友好` after local checking caught a leading-space issue and a TSV column split issue;
- the tenth completion slice filled rows 541-600 (`原谅` through `座位`);
- local script checks pass for the completed `UZ`/`KK`/`AZ` file with 600 unique rows, 600 word cells and 600 example translation cells per language, and no Han or cross-script leakage;
- after completing `UZ`/`KK`/`AZ`, `check-classic-hsk-release` and `check-classic-hsk-article-policy` pass; `check-classic-hsk-source-audit` still exits nonzero with 9,000 expected preparation blockers because later target-language packs remain blank; `UZ`, `KK` and `AZ` each show 600 filled word cells, 600 filled example cells and 0 blockers. Current source-audit confidence for all three is generated-checked/no-source because indexed candidate coverage is absent.
- `config/hsk-classic-hsk4-translations-ka-hy.tsv` starts the `KA` and `HY` batch; Georgian stays Georgian-script, Armenian stays Armenian-script, and target-language transcription remains out of scope;
- the first `KA`/`HY` slice filled rows 1-60 (`爱情` through `从来`);
- the second `KA`/`HY` slice filled rows 61-120 (`粗心` through `否则`) and repaired a Georgian `发生` Latin-script leak caught by local checking;
- the third `KA`/`HY` slice filled rows 121-180 (`符合` through `怀疑`);
- the fourth `KA`/`HY` slice filled rows 181-240 (`回忆` through `举`) and repaired a Georgian `坚持` Chinese-script leak caught by local checking;
- the fifth `KA`/`HY` slice filled rows 241-300 (`举办` through `毛`);
- the sixth `KA`/`HY` slice filled rows 301-360 (`毛巾` through `扔`);
- the seventh `KA`/`HY` slice filled rows 361-420 (`仍然` through `态度`) and repaired an Armenian `随着` Chinese-script leak caught by local checking;
- the eighth `KA`/`HY` slice filled rows 421-480 (`弹钢琴` through `信息`);
- the ninth `KA`/`HY` slice filled rows 481-540 (`信心` through `原来`) and repaired an Armenian `优秀` Chinese-script leak caught by local checking;
- the tenth completion slice filled rows 541-600 (`原谅` through `座位`);
- local script checks pass for the completed `KA`/`HY` file with 600 unique rows, 600 word cells and 600 example translation cells per language, and no Han, Latin or cross-script leakage;
- after completing `KA`/`HY`, `check-classic-hsk-release` and `check-classic-hsk-article-policy` pass; `check-classic-hsk-source-audit` still exits nonzero with 5,400 expected preparation blockers because `TR`, `SW` and `PT-BR` remain blank. Current source-audit summaries show `KA` and `HY` each at 600 filled word cells, 600 filled example cells and 0 blockers; `KA` is source-partial from indexed Georgian candidate coverage, while `HY` is generated-checked/no-source because current indexed HSK candidate coverage is absent.
- `config/hsk-classic-hsk4-translations-tr-sw-pt-br.tsv` starts the final `TR`, `SW` and `PT-BR` batch; Turkish and Swahili stay no-artificial-article, Brazilian Portuguese uses natural article-aware noun display, and target-language transcription remains out of scope;
- the first `TR`/`SW`/`PT-BR` slice filled rows 1-60 (`爱情` through `从来`);
- the second `TR`/`SW`/`PT-BR` slice filled rows 61-120 (`粗心` through `否则`);
- the third `TR`/`SW`/`PT-BR` slice filled rows 121-180 (`符合` through `怀疑`);
- the fourth `TR`/`SW`/`PT-BR` slice filled rows 181-240 (`回忆` through `举`);
- the fifth `TR`/`SW`/`PT-BR` slice filled rows 241-300 (`举办` through `毛`);
- the sixth `TR`/`SW`/`PT-BR` slice filled rows 301-360 (`毛巾` through `扔`);
- the seventh `TR`/`SW`/`PT-BR` slice filled rows 361-420 (`仍然` through `态度`);
- the eighth `TR`/`SW`/`PT-BR` slice filled rows 421-480 (`弹钢琴` through `信息`);
- the ninth `TR`/`SW`/`PT-BR` slice filled rows 481-540 (`信心` through `原来`);
- the tenth completion `TR`/`SW`/`PT-BR` slice filled rows 541-600 (`原谅` through `座位`);
- local script checks pass for the completed `TR`/`SW`/`PT-BR` file with 600 unique rows, 600 word cells and 600 example translation cells per language, and no Han or cross-script leakage;
- after completing `TR`/`SW`/`PT-BR`, `check-classic-hsk-release`, `check-classic-hsk-article-policy` and `check-classic-hsk-source-audit` all pass. Current source-audit summaries show `TR`, `SW` and `PT-BR` each at 600 filled word cells, 600 filled example cells and 0 blockers; `TR` and `PT-BR` are generated-checked/no-source because indexed HSK candidate coverage is absent in the current source layer, while `SW` is source-partial from one indexed candidate.
- the 2026-05-08 sample29/native-style check audited all 600 Chinese rows for required fields, simplified/example inclusion, pinyin tone marks, tone-number leaks, Han-in-pinyin and malformed Chinese example ASCII; it also checked a deterministic sample of 29 rows across every one of the 53 target languages, covering 1,537 word cells and 1,537 example cells. This pass repaired HSK4 example pinyin for `不过`, `脾气` and `却`; the post-rebuild report `outputs/hsk/qa/hsk2_classic_level_4_600_v1_sample29_chinese_pinyin_audit_20260508.json` records 0 blockers and 0 warnings.

Next HSK implementation step: HSK4 is complete under the current local release gates. HSK5 has completed its Chinese example layer and is now waiting for the 53 target-language translation packs. It is not a final learner delivery until those packs are completed and the full HSK release/source-audit gates pass.

## Fifth Level Source Reconciliation

The fifth release is currently a source-reconciled Chinese-prepared workbook, not a completed learner delivery:

```text
release_id: hsk2_classic_level_5_1300_v1
hsk_version: HSK 2.0 classic
hsk_level: 5
row_count: 1300
source: outputs/hsk/source/hsk2_classic_level_5_1300_v1.source.json
workbook: outputs/hsk/hsk2_classic_level_5_1300_v1.xlsx
csv: outputs/hsk/hsk2_classic_level_5_1300_v1.csv
jsonl: outputs/hsk/hsk2_classic_level_5_1300_v1.jsonl
reconciliation report: outputs/hsk/qa/hsk2_classic_level_5_1300_v1_source_reconciliation_20260508.json
source_audit_report: outputs/hsk/qa/hsk2_classic_level_5_1300_v1_source_audit_20260508.json
example_candidate_scan: outputs/hsk/qa/hsk2_classic_level_5_1300_v1_example_candidate_scan_20260508.json
chinese_native_audit: outputs/hsk/qa/hsk2_classic_level_5_1300_v1_chinese_native_audit_20260508.json
```

2026-05-08 HSK5 source check:

- HSK Academy HSK5 presents exactly 1300 rows, ids 1201-2500, and has 0 overlap with the current LunaCards HSK1-HSK4 source snapshots;
- MIT upstream `complete-hsk-vocabulary` `wordlists/exclusive/old/5.json` contains 1298 rows and differs materially from the HSK Academy 1300-row reference: 1124 HSK5 rows have exact MIT entries, 176 HSK Academy rows are not in MIT, and 174 MIT rows are not in HSK Academy;
- Hewgill cumulative HSK 2500 support was parsed as 2503 rows and supports 1181 of the 1300 HSK Academy HSK5 rows; 119 rows lack Hewgill support in this local snapshot;
- HSK Academy provides sparse usable sentence candidates for HSK5 in the captured page: 49 rows with candidate sentences and 1251 rows without usable candidate sentences;
- AllSet HSK5 was not used in this local source run because the site returned 403 during fetch.

Decision:

```text
Use HSK Academy's 1300-row HSK5 order/membership as the canonical HSK 2.0 classic level-5 list,
enrich rows with MIT complete-hsk-vocabulary old/5 entries where exact simplified matches exist,
and keep Hewgill cumulative 2500 as cross-source support evidence.
```

MIT, Hewgill and HSK Academy are not treated as automatic workbook truth. They are source evidence for membership, pinyin/gloss sanity and later QA. Row-level provenance is stored in `hsk_canonical_source`.

Current HSK5 preparation status:

- `scripts/hsk/build-classic-hsk5-canonical-source.mjs` generates the 1300-row canonical source, draft card overrides, structural example placeholders and reconciliation report;
- `scripts/hsk/build-classic-hsk5-release.mjs` wraps the generic HSK release builder for `hsk2_classic_level_5_1300_v1`;
- `config/hsk-classic-hsk5-card-overrides.json` exists for all 1300 rows with source-derived traditional forms, normalized card-facing pinyin and short EN glosses;
- `scripts/hsk/apply-hsk5-curated-examples.mjs` applies controlled curated Chinese example batches after source regeneration;
- `config/hsk-classic-hsk5-examples.json` now contains 1300 real short Chinese examples for rows 1-1300 (`哎` through `作文`) and 0 remaining structural placeholders;
- `config/hsk-classic-hsk5-translations-ru.tsv` completes the first HSK5 target-language pack and fills `RU` plus `example_RU` for rows 1-1300 (`哎` through `作文`);
- `config/hsk-classic-hsk5-translations-es.tsv` completes the Spanish HSK5 target-language pack and fills `ES` plus `example_ES` for rows 1-1300 (`哎` through `作文`);
- `config/hsk-classic-hsk5-translations-fr.tsv` completes the French HSK5 target-language pack and fills `FR` plus `example_FR` for rows 1-1300 (`哎` through `作文`);
- `config/hsk-classic-hsk5-translations-de.tsv` fills the complete German HSK5 target-language pack: all 1300 `DE` word cells and all 1300 `example_DE` cells (`哎` through `作文`);
- `config/hsk-classic-hsk5-translations-it.tsv` fills the complete Italian HSK5 target-language pack: all 1300 `IT` word cells and all 1300 `example_IT` cells (`哎` through `作文`);
- `config/hsk-classic-hsk5-translations-pt.tsv` fills the complete European Portuguese HSK5 target-language pack: all 1300 `PT` word cells and all 1300 `example_PT` cells (`哎` through `作文`);
- `config/hsk-classic-hsk5-translations-ja.tsv` fills the complete Japanese HSK5 target-language pack: all 1300 `JA` word cells and all 1300 `example_JA` cells (`哎` through `作文`); Japanese stays normal Japanese orthography with no target-language transcription;
- `config/hsk-classic-hsk5-translations-ko.tsv` fills the complete Korean HSK5 target-language pack: all 1300 `KO` word cells and all 1300 `example_KO` cells (`哎` through `作文`); Korean stays normal Hangul orthography with no target-language transcription;
- `config/hsk-classic-hsk5-translations-vi.tsv` fills the complete Vietnamese HSK5 target-language pack: all 1300 `VI` word cells and all 1300 `example_VI` cells (`哎` through `作文`); Vietnamese stays normal Vietnamese orthography with tone marks and no target-language transcription;
- `config/hsk-classic-hsk5-translations-th.tsv` completes the Thai HSK5 target-language pack and fills all 1300 `TH` word cells plus all 1300 `example_TH` cells (`哎` through `作文`); Thai stays Thai script only, with no target-language romanization and no machine word-segmentation spaces inside short clauses;
- `config/hsk-classic-hsk5-translations-ms.tsv` completes the Malay HSK5 target-language pack and fills all 1300 `MS` word cells plus all 1300 `example_MS` cells (`哎` through `作文`); Malay stays normal Latin-script Malay orthography with no target-language transcription;
- `config/hsk-classic-hsk5-translations-id.tsv` completes the Indonesian HSK5 target-language pack and fills all 1300 `ID` word cells plus all 1300 `example_ID` cells (`哎` through `作文`); Indonesian stays normal Latin-script Indonesian orthography with no target-language transcription;
- `config/hsk-classic-hsk5-translations-pl.tsv` completes the Polish HSK5 target-language pack and fills all 1300 `PL` word cells plus all 1300 `example_PL` cells (`哎` through `作文`); Polish stays normal Polish orthography with no target-language transcription and no artificial articles;
- `config/hsk-classic-hsk5-translations-nl.tsv` completes the Dutch HSK5 target-language pack and fills all 1300 `NL` word cells plus all 1300 `example_NL` cells (`哎` through `作文`); Dutch uses normal Dutch orthography with learner-useful `de`/`het` articles where natural and no target-language transcription;
- `config/hsk-classic-hsk5-translations-sv.tsv` completes the Swedish HSK5 target-language pack and fills all 1300 `SV` word cells plus all 1300 `example_SV` cells (`哎` through `作文`); Swedish uses normal Swedish orthography with learner-useful `en`/`ett` articles where natural and no target-language transcription;
- `config/hsk-classic-hsk5-translations-no.tsv` completes the Norwegian Bokmal HSK5 target-language pack and fills all 1300 `NO` word cells plus all 1300 `example_NO` cells (`哎` through `作文`); Norwegian uses normal Bokmal orthography with learner-useful `en`/`et` articles where natural and no target-language transcription;
- `config/hsk-classic-hsk5-translations-da.tsv` completes the Danish HSK5 target-language pack and fills all 1300 `DA` word cells plus all 1300 `example_DA` cells (`哎` through `作文`); Danish uses normal Danish orthography with learner-useful `en`/`et` articles where natural and no target-language transcription;
- `config/hsk-classic-hsk5-translations-fi.tsv` completes the Finnish HSK5 target-language pack and fills all 1300 `FI` word cells plus all 1300 `example_FI` cells (`哎` through `作文`); Finnish uses normal Finnish orthography and case forms, no artificial articles and no target-language transcription;
- `config/hsk-classic-hsk5-translations-cs.tsv` completes the Czech HSK5 target-language pack and fills all 1300 `CS` word cells plus all 1300 `example_CS` cells (`哎` through `作文`); Czech uses normal Czech orthography and case forms, no artificial articles and no target-language transcription;
- `config/hsk-classic-hsk5-translations-sk.tsv` completes the Slovak HSK5 target-language pack and fills all 1300 `SK` word cells plus all 1300 `example_SK` cells (`哎` through `作文`); Slovak uses normal Slovak orthography and case forms, no artificial articles and no target-language transcription;
- `config/hsk-classic-hsk5-translations-hu.tsv` completes the Hungarian HSK5 target-language pack and fills all 1300 `HU` word cells plus all 1300 `example_HU` cells (`哎` through `作文`); Hungarian uses normal Hungarian orthography and case/postposition forms, no artificial articles and no target-language transcription;
- `config/hsk-classic-hsk5-translations-ro.tsv` completes the Romanian HSK5 target-language pack and fills all 1300 `RO` word cells plus all 1300 `example_RO` cells (`哎` through `作文`); Romanian uses normal Romanian orthography with learner-useful articles where natural and no target-language transcription;
- `config/hsk-classic-hsk5-translations-bg.tsv` completes the Bulgarian HSK5 target-language pack and fills all 1300 `BG` word cells plus all 1300 `example_BG` cells (`哎` through `作文`); Bulgarian stays Cyrillic-script only, with no forced definite suffixes in the word column and no target-language transcription;
- `config/hsk-classic-hsk5-translations-hr.tsv` completes the Croatian HSK5 target-language pack and fills all 1300 `HR` word cells plus all 1300 `example_HR` cells (`哎` through `作文`); Croatian stays normal Latin-script Croatian orthography, with no artificial articles and no target-language transcription;
- `config/hsk-classic-hsk5-translations-sr.tsv` completes the Serbian HSK5 target-language pack and fills all 1300 `SR` word cells plus all 1300 `example_SR` cells (`哎` through `作文`); Serbian stays consistently Cyrillic-script, with no artificial articles and no target-language transcription;
- `config/hsk-classic-hsk5-translations-sl.tsv` completes the Slovenian HSK5 target-language pack and fills all 1300 `SL` word cells plus all 1300 `example_SL` cells (`哎` through `作文`); Slovenian stays normal Latin-script Slovenian orthography, with no artificial articles and no target-language transcription;
- `config/hsk-classic-hsk5-translations-lt.tsv` completes the Lithuanian HSK5 target-language pack and fills all 1300 `LT` word cells plus all 1300 `example_LT` cells (`哎` through `作文`); Lithuanian stays normal Latin-script Lithuanian orthography, with no artificial articles and no target-language transcription;
- `config/hsk-classic-hsk5-translations-lv.tsv` completes the Latvian HSK5 target-language pack and fills all 1300 `LV` word cells plus all 1300 `example_LV` cells (`哎` through `作文`); Latvian stays normal Latin-script Latvian orthography, with no artificial articles and no target-language transcription;
- `config/hsk-classic-hsk5-translations-et.tsv` completes the Estonian HSK5 target-language pack and fills all 1300 `ET` word cells plus all 1300 `example_ET` cells (`哎` through `作文`); Estonian stays normal Latin-script Estonian orthography, with no artificial articles and no target-language transcription;
- `config/hsk-classic-hsk5-translations-is.tsv` completes the Icelandic HSK5 target-language pack and fills all 1300 `IS` word cells plus all 1300 `example_IS` cells (`哎` through `作文`); Icelandic stays normal Latin-script Icelandic orthography, with no artificial articles and no target-language transcription;
- `config/hsk-classic-hsk5-translations-hi.tsv` completes the Hindi HSK5 target-language pack and fills all 1300 `HI` word cells plus all 1300 `example_HI` cells (`哎` through `作文`); Hindi stays Devanagari-script, with no target-language romanization, no Latin-script fallback and no Han-script leakage in target cells;
- `config/hsk-classic-hsk5-translations-bn.tsv` completes the Bengali HSK5 target-language pack and fills all 1300 `BN` word cells plus all 1300 `example_BN` cells (`哎` through `作文`); Bengali stays Bengali-script, with no target-language romanization, no Latin-script fallback and no Han-script leakage in target cells;
- `config/hsk-classic-hsk5-translations-tl.tsv` completes the Filipino/Tagalog HSK5 target-language pack and fills all 1300 `TL` word cells plus all 1300 `example_TL` cells (`哎` through `作文`); Filipino/Tagalog stays normal Latin-script Filipino orthography, with no artificial articles and no target-language transcription;
- `config/hsk-classic-hsk5-translations-my.tsv` completes the Burmese HSK5 target-language pack and fills all 1300 `MY` word cells plus all 1300 `example_MY` cells (`哎` through `作文`); Burmese stays Myanmar-script, with no target-language romanization, no Latin-script fallback and no Han-script leakage in target cells;
- `config/hsk-classic-hsk5-translations-km.tsv` completes the Khmer HSK5 target-language pack and fills all 1300 `KM` word cells plus all 1300 `example_KM` cells (`哎` through `作文`); Khmer stays Khmer-script, with no target-language romanization, no Latin-script fallback and no Han-script leakage in target cells;
- `config/hsk-classic-hsk5-translations-lo.tsv` completes the Lao HSK5 target-language pack and fills all 1300 `LO` word cells plus all 1300 `example_LO` cells (`哎` through `作文`); Lao stays Lao-script, with no target-language romanization, no Latin-script fallback and no Han-script leakage in target cells; the row `梨` was repaired to Lao pear `ໝາກສາລີ່` to avoid the homographic corn reading `ໝາກສາລີ`;
- `config/hsk-classic-hsk5-translations-ne.tsv` completes the Nepali HSK5 target-language pack and fills all 1300 `NE` word cells plus all 1300 `example_NE` cells (`哎` through `作文`); Nepali stays Devanagari-script, with no target-language romanization, no Latin-script fallback and no Han-script leakage in target cells;
- `config/hsk-classic-hsk5-translations-si.tsv` completes the Sinhala HSK5 target-language pack and fills all 1300 `SI` word cells plus all 1300 `example_SI` cells (`哎` through `作文`); Sinhala stays Sinhala-script, with no target-language romanization, no Latin-script fallback and no Han-script or cross-script leakage in target cells;
- `config/hsk-classic-hsk5-translations-ta.tsv` completes the Tamil HSK5 target-language pack and fills all 1300 `TA` word cells plus all 1300 `example_TA` cells (`哎` through `作文`); Tamil stays Tamil-script, with no target-language romanization, no Latin-script fallback and no Han-script or cross-script leakage in target cells;
- `config/hsk-classic-hsk5-translations-te.tsv` completes the Telugu HSK5 target-language pack and fills all 1300 `TE` word cells plus all 1300 `example_TE` cells (`哎` through `作文`); Telugu stays Telugu-script, with no target-language romanization, no Latin-script fallback and no Han-script or cross-script leakage in target cells;
- `config/hsk-classic-hsk5-translations-kn.tsv` completes the Kannada HSK5 target-language pack and fills all 1300 `KN` word cells plus all 1300 `example_KN` cells (`哎` through `作文`); Kannada stays Kannada-script, with no target-language romanization, no Latin-script fallback and no Han-script or cross-script leakage in target cells;
- `config/hsk-classic-hsk5-translations-ml.tsv` completes the Malayalam HSK5 target-language pack and fills all 1300 `ML` word cells plus all 1300 `example_ML` cells (`哎` through `作文`); Malayalam stays Malayalam-script, with no target-language romanization, no Latin-script fallback and no Han-script or cross-script leakage in target cells;
- `config/hsk-classic-hsk5-translations-uz.tsv` completes the Uzbek HSK5 target-language pack and fills all 1300 `UZ` word cells plus all 1300 `example_UZ` cells (`哎` through `作文`); Uzbek stays Latin-script Uzbek orthography, with no artificial articles, no target-language transcription, no Han-script or cross-script leakage in target cells and no targeted English fallback fragments after normalizing `病毒` to `kasallik qo'zg'atuvchi` and `网络` to `tarmoq aloqasi`;
- `config/hsk-classic-hsk5-translations-kk.tsv` completes the Kazakh HSK5 target-language pack and fills all 1300 `KK` word cells plus all 1300 `example_KK` cells (`哎` through `作文`); Kazakh stays Cyrillic-script, with no artificial articles, no target-language transcription, no Latin-script fallback and no Han-script or cross-script leakage in target cells;
- `config/hsk-classic-hsk5-translations-az.tsv` completes the Azerbaijani HSK5 target-language pack and fills all 1300 `AZ` word cells plus all 1300 `example_AZ` cells (`哎` through `作文`); Azerbaijani stays normal Latin-script Azerbaijani orthography, with no target-language transcription, no Han-script or cross-script leakage in target cells and no true targeted English fallback fragments after normalizing early loan/fallback-prone rows such as `鞭炮`, `超级`, `打工`, `兼职`, `简历`, `内部`, `搜索`, `网络`, `业务`, `硬件`, `用途` and `总裁`;
- `config/hsk-classic-hsk5-translations-ka.tsv` completes the Georgian HSK5 target-language pack and fills all 1300 `KA` word cells plus all 1300 `example_KA` cells (`哎` through `作文`); Georgian stays Georgian-script, with no target-language transcription, no Latin-script fallback and no Han-script or cross-script leakage in target cells;
- `config/hsk-classic-hsk5-translations-hy.tsv` completes the Armenian HSK5 target-language pack and fills all 1300 `HY` word cells plus all 1300 `example_HY` cells (`哎` through `作文`); Armenian stays Armenian-script, with no target-language transcription, no Latin-script fallback and no Han-script or cross-script leakage in target cells;
- `config/hsk-classic-hsk5-translations-tr.tsv` completes the Turkish HSK5 target-language pack and fills all 1300 `TR` word cells plus all 1300 `example_TR` cells (`哎` through `作文`); Turkish stays normal Latin-script Turkish orthography, with no artificial articles, no target-language transcription, no Han-script leakage and no cross-script leakage in target cells, and fallback-prone rows such as `豆腐`, `对象`, `风险`, `改革`, `酒吧`, `决赛`, `太极拳` and `网络` have been normalized away from English-lookalike forms where natural Turkish alternatives exist;
- `config/hsk-classic-hsk5-translations-sw.tsv` completes the Swahili HSK5 target-language pack and fills all 1300 `SW` word cells plus all 1300 `example_SW` cells (`哎` through `作文`); Swahili stays normal Latin-script Swahili orthography, with no artificial articles, no target-language transcription, no Han-script leakage and no cross-script leakage in target cells, and fallback-prone rows such as `唉`, `充电器`, `从前`, `豆腐`, `兑换`, `功能`, `关闭`, `高档`, `豪华`, `简历`, `键盘`, `教练`, `记录`, `酒吧`, `俱乐部`, `决赛`, `经典`, `课程`, `老板`, `麦克风`, `名牌`, `模特`, `牛仔裤`, `软件`, `日历`, `人民币`, `输入`, `鼠标`, `数据`, `数码`, `网络`, `文件`, `维修`, `太极拳`, `王子`, `下载`, `系统`, `信号`, `项目`, `业务`, `硬件`, `优惠`, `账户`, `哲学`, `总裁` and `总统` have been normalized away from English-lookalike forms where natural Swahili alternatives exist;
- `config/hsk-classic-hsk5-translations-pt-br.tsv` completes the Brazilian Portuguese HSK5 target-language pack and fills all 1300 `PT-BR` word cells plus all 1300 `example_PT-BR` cells (`哎` through `作文`); `PT-BR` is derived from the reviewed European Portuguese layer, then regionalized to Brazilian Portuguese with article-aware noun display where natural, no target-language transcription, no Han-script leakage and no Portugal-only fallback forms in the local regional scan (`telemóvel`, `autocarro`, `casa de banho`, `ficheiro`, `pequeno-almoço`, `relva`, `comboio`, `desporto`, `chávena`, `frigorífico`, `ecrã`, `está a`, `à espera`, `jardim zoológico` and related forms);
- `config/hsk-classic-hsk5-translations-es-419.tsv` completes the Latin American Spanish HSK5 target-language pack and fills all 1300 `ES-419` word cells plus all 1300 `example_ES-419` cells (`哎` through `作文`); `ES-419` is derived from the reviewed base Spanish layer, then regionalized away from Spain-only forms while keeping article-aware noun display and no target-language transcription, with no Han-script leakage and no local Spain-only fallback hits for `vosotros`, `vuestro`, `ordenador`, `móvil`, `billete`, `camarero`, `zumo`, `coger`, `aparcar`, `piso`, `vaqueros`, `gafas`, `jersey`, `bañador`, `césped`, `grifo` or `vale`;
- the local HSK5 pinyin normalization repaired source artifacts such as `nv3`, HTML entity apostrophes, separated erhua `r` in `干活儿`/`使劲儿`/`哪儿`/`一会儿` and the row `划` pinyin (`huá`, matching the rowing example `划船`); the rebuilt skeleton scan reports 0 pinyin tone-number rows, 0 HTML entity leaks, 0 Han-in-pinyin rows and 0 missing word-tone rows;
- the current curated example progress report `outputs/hsk/qa/hsk2_classic_level_5_1300_v1_curated_examples_batch1_20260508.json` records 1300 applied examples and 0 remaining placeholders; local batch QA found 0 missing source-word inclusions, 0 pinyin tone-number rows, 0 Han-in-pinyin rows and 0 placeholder examples in rows 1-1300;
- the Chinese native-style audit `outputs/hsk/qa/hsk2_classic_level_5_1300_v1_chinese_native_audit_20260508.json` reports 1300 checked rows, 0 blockers and 0 warnings after repairing four awkward Chinese example scenes: `公元`, `牙齿`, `亿` and `撞`;
- the 2026-05-15 post-delivery deterministic QA repaired five English gloss rows that still contained Chinese reference-tail text in `EN` / `EN-GB`: `甲`, `盆`, `县`, `乙` and `与其`;
- `outputs/hsk/qa/hsk2_classic_level_5_1300_v1_post_delivery_deterministic_qa_20260515.json` reports 0 hard blockers after the repair: 0 missing cells, 0 status mismatches, 0 edge-whitespace cells, 0 Han leaks outside Japanese, 0 pinyin tone-number rows, 0 Han-in-pinyin rows, 0 Chinese examples missing the exact simplified source item and 0 ASCII leakage in Chinese examples;
- `outputs/hsk/qa/hsk2_classic_level_5_1300_v1_sample_10_per_language_qa_20260515.json` samples 10 deterministic HSK rows per target language, checking both the word and translated example cells: 53 target languages, 530 sampled word cells, 530 sampled example cells, 0 blockers and 0 review candidates;
- `outputs/hsk/qa/hsk2_classic_level_5_1300_v1_sample_additional_7_per_language_qa_20260515.json` samples 7 additional deterministic HSK rows per target language, excluding the previous 10-row sample: 53 target languages, 371 additional sampled word cells, 371 additional sampled example cells, 0 blockers and 0 review candidates;
- `node scripts/hsk/check-classic-hsk-release.mjs hsk2_classic_level_5_1300_v1` passes for workbook structure, row count, XLSX import and Course Metadata;
- `node scripts/hsk/check-classic-hsk-article-policy.mjs hsk2_classic_level_5_1300_v1` reports 0 blockers;
- `node scripts/hsk/check-classic-hsk-source-audit.mjs hsk2_classic_level_5_1300_v1` now passes with 0 blockers for all 53 target-language columns. The final filled language summaries include `SW` and `PT-BR` as `generated_checked_no_source` with one non-blocking source-candidate warning each, and `ES-419` as `source_partial` with 1300 filled word cells, 1300 filled example cells, 0 blockers and 0 warnings.
- The HSK5 workbook is uploaded to the target Google Drive HSK delivery folder as a native Google Sheet named `hsk 5`: `1tovGQNa28Zgcvoz-pVx7T7D6iDhNuB84CAfRy6uD8co`. After the 2026-05-15 English gloss-tail repair, the same Sheet id was updated in place. HSK-specific readback verified the full `HSK5 Classic` tab and `Course Metadata` sheet after upload: 1301 rows, 118 columns and 153,680 checked cells. Delivery manifest: `outputs/hsk/hsk2_classic_level_5_1300_v1_delivery.json`.

Next HSK5 implementation step: HSK5 is complete under the current local release, post-delivery deterministic QA and Google Sheet readback gates. Keep Chinese examples, word pinyin and example pinyin stable unless a specific later executable/source-backed blocker proves a row is wrong.

## Sixth Level Source Reconciliation

The sixth release has started as a source-verified preparation workbook:

```text
release_id: hsk2_classic_level_6_2500_v1
hsk_version: HSK 2.0 classic
hsk_level: 6
row_count: 2500
source: outputs/hsk/source/hsk2_classic_level_6_2500_v1.source.json
workbook: outputs/hsk/hsk2_classic_level_6_2500_v1.xlsx
csv: outputs/hsk/hsk2_classic_level_6_2500_v1.csv
jsonl: outputs/hsk/hsk2_classic_level_6_2500_v1.jsonl
reconciliation report: outputs/hsk/qa/hsk2_classic_level_6_2500_v1_source_reconciliation_20260517.json
curated_example_report: outputs/hsk/qa/hsk2_classic_level_6_2500_v1_curated_examples_rows_1_2500_20260517.json
```

2026-05-15 HSK6 source check:

- HSK Academy HSK6 source snapshot was fetched from `https://www.hsk.academy/en/hsk_6` and contains exactly 2500 rows, ids 2501-5000;
- MIT upstream `complete-hsk-vocabulary` `wordlists/exclusive/old/6.json` contains exactly 2500 rows;
- Hewgill HSK6 cumulative snapshot was fetched from `https://hewgill.com/hsk/hsk6.html` and parsed as 5003 cumulative rows;
- compared against HSK Academy membership, MIT differs by 193 rows in each direction: 2307 HSK6 rows have exact MIT entries and 193 canonical rows are cross-source curated minimal entries;
- Hewgill supports 2384 of the 2500 HSK Academy HSK6 rows; 116 rows do not have exact Hewgill simplified-form support in this local snapshot;
- HSK6 has 0 duplicate simplified rows inside the HSK Academy 2500-row source snapshot;
- HSK6 has 1 simplified-form overlap with the current LunaCards HSK1-HSK5 source snapshots, recorded in row-level reconciliation evidence and kept candidate-only until a concrete row-level blocker proves a source conflict.

Decision:

```text
Use HSK Academy's 2500-row HSK6 order/membership as the canonical HSK 2.0 classic level-6 list,
enrich rows with MIT complete-hsk-vocabulary old/6 entries where exact simplified matches exist,
and keep Hewgill cumulative 5000 as cross-source support evidence.
```

Current HSK6 delivery status:

- `scripts/hsk/build-classic-hsk6-canonical-source.mjs` generates the 2500-row canonical source, card overrides, structural example placeholders and reconciliation report;
- `scripts/hsk/build-classic-hsk6-release.mjs` wraps the generic HSK release builder for `hsk2_classic_level_6_2500_v1`;
- `config/hsk-classic-hsk6-card-overrides.json` exists for all 2500 rows with source-derived traditional forms, normalized card-facing pinyin and short EN glosses;
- local HSK6 pinyin normalization repaired source `lv3` artifacts for `伴侣`, `屡次` and `履行`, plus `lvè`/`nvè` artifacts for `策略`, `忽略`, `掠夺`, `虐待`, `侵略` and `战略`; the current override scan reports 0 word-pinyin tone-number hits and 0 `v`-notation pinyin rows;
- local HSK6 English gloss cleanup protects `简体字` as `simplified Chinese character` and `兴隆` as `prosperous; thriving`, preventing raw source-tail artifacts from returning during source regeneration;
- `scripts/hsk/apply-hsk6-curated-examples.mjs` applies controlled curated Chinese example batches after source regeneration;
- `config/hsk-classic-hsk6-examples.json` currently contains 2500 curated Chinese examples for rows 1-2500 (`挨` through `座右铭`) and 0 remaining structural placeholders;
- `config/hsk-classic-hsk6-translations-ru.tsv` completes the Russian target-language pack with rows 1-2500 (`挨` through `座右铭`), filling all 2500 `RU` word cells and all 2500 `example_RU` cells; the pack is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-es.tsv` completes the Spanish target-language pack with rows 1-2500 (`挨` through `座右铭`), filling all 2500 `ES` word cells and all 2500 `example_ES` cells; the pack is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-fr.tsv` completes the French target-language pack with rows 1-2500 (`挨` through `座右铭`), filling all 2500 `FR` word cells and all 2500 `example_FR` cells; the pack is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-de.tsv` completes the German target-language pack with rows 1-2500 (`挨` through `座右铭`), filling all 2500 `DE` word cells and all 2500 `example_DE` cells; the pack is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-it.tsv` completes the Italian target-language pack with rows 1-2500 (`挨` through `座右铭`), filling all 2500 `IT` word cells and all 2500 `example_IT` cells; the pack is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-pt.tsv` completes the European Portuguese target-language pack with rows 1-2500 (`挨` through `座右铭`), filling all 2500 `PT` word cells and all 2500 `example_PT` cells; the pack is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-ja.tsv` completes the Japanese target-language pack with rows 1-2500 (`挨` through `座右铭`), filling all 2500 `JA` word cells and all 2500 `example_JA` cells; Japanese stays normal Japanese orthography with no target-language transcription; the pack is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-ko.tsv` completes the Korean target-language pack with rows 1-2500 (`挨` through `座右铭`), filling all 2500 `KO` word cells and all 2500 `example_KO` cells; Korean stays normal Hangul orthography with no target-language transcription; the pack is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-vi.tsv` completes the Vietnamese target-language pack with rows 1-2500 (`挨` through `座右铭`), filling all 2500 `VI` word cells and all 2500 `example_VI` cells; Vietnamese stays normal Vietnamese orthography with no target-language transcription; the pack is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-th.tsv` completes the Thai target-language pack with rows 1-2500 (`挨` through `座右铭`), filling all 2500 `TH` word cells and all 2500 `example_TH` cells; Thai stays normal Thai orthography with no target-language transcription; the pack is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-ms.tsv` completes the Malay target-language pack with rows 1-2500 (`挨` through `座右铭`), filling all 2500 `MS` word cells and all 2500 `example_MS` cells; Malay stays normal Malay orthography with no target-language transcription; the pack is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-id.tsv` completes the Indonesian target-language pack with rows 1-2500 (`挨` through `座右铭`), filling all 2500 `ID` word cells and all 2500 `example_ID` cells; Indonesian stays normal Indonesian orthography with no target-language transcription; the pack is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-pl.tsv` completes the Polish target-language pack with rows 1-2500 (`挨` through `座右铭`), filling all 2500 `PL` word cells and all 2500 `example_PL` cells; Polish stays normal Polish orthography with no target-language transcription; the pack is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-nl.tsv` completes the Dutch target-language pack with rows 1-2500 (`挨` through `座右铭`), filling all 2500 `NL` word cells and all 2500 `example_NL` cells; Dutch uses normal Dutch orthography with learner-useful `de`/`het` articles where natural and no target-language transcription; the pack is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-sv.tsv` completes the Swedish target-language pack with rows 1-2500 (`挨` through `座右铭`), filling all 2500 `SV` word cells and all 2500 `example_SV` cells; Swedish uses normal Swedish orthography with learner-useful `en`/`ett` articles where natural and no target-language transcription; the pack is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-no.tsv` completes the Norwegian Bokmal target-language pack with rows 1-2500 (`挨` through `座右铭`), filling all 2500 `NO` word cells and all 2500 `example_NO` cells; Norwegian uses normal Bokmal orthography with learner-useful `en`/`et` articles where natural and no target-language transcription; the pack is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-da.tsv` completes the Danish target-language pack through rows 1-2500 (`挨` through `座右铭`), filling 2500 `DA` word cells and 2500 `example_DA` cells; Danish uses normal Danish orthography with learner-useful `en`/`et` articles where natural and no target-language transcription; the pack is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-fi.tsv` completes the Finnish target-language pack through rows 1-2500 (`挨` through `座右铭`), filling 2500 `FI` word cells and 2500 `example_FI` cells; Finnish uses normal Finnish orthography and case forms, no artificial articles and no target-language transcription; the pack is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-cs.tsv` completes the Czech target-language pack through rows 1-2500 (`挨` through `座右铭`), filling 2500 `CS` word cells and 2500 `example_CS` cells; Czech uses normal Czech orthography, no target-language transcription/audio, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-sk.tsv` completes the Slovak target-language pack through rows 1-2500 (`挨` through `座右铭`), filling 2500 `SK` word cells and 2500 `example_SK` cells; Slovak uses normal Slovak orthography and case forms, no artificial articles and no target-language transcription/audio, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-hu.tsv` completes the Hungarian target-language pack through rows 1-2500 (`挨` through `座右铭`), filling 2500 `HU` word cells and 2500 `example_HU` cells; Hungarian uses normal Hungarian orthography and case/postposition forms, no artificial articles and no target-language transcription/audio, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-ro.tsv` completes the Romanian target-language pack through rows 1-2500 (`挨` through `座右铭`), filling 2500 `RO` word cells and 2500 `example_RO` cells; Romanian uses normal Romanian orthography with learner-useful `un`/`o` noun articles where natural and no target-language transcription/audio, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-bg.tsv` completes the Bulgarian target-language pack through rows 1-2500 (`挨` through `座右铭`), filling 2500 `BG` word cells and 2500 `example_BG` cells; Bulgarian uses normal Cyrillic Bulgarian orthography, no artificial articles, no target-language transcription/audio, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-hr.tsv` completes the Croatian target-language pack through rows 1-2500 (`挨` through `座右铭`), filling 2500 `HR` word cells and 2500 `example_HR` cells; Croatian uses normal Latin-script Croatian orthography, no artificial articles, no target-language transcription/audio, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-sr.tsv` completes the Serbian target-language pack through rows 1-2500 (`挨` through `座右铭`), filling 2500 `SR` word cells and 2500 `example_SR` cells; Serbian uses normal Cyrillic-script Serbian orthography, no artificial articles, no target-language transcription/audio, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-sl.tsv` completes the Slovenian target-language pack through rows 1-2500 (`挨` through `座右铭`), filling 2500 `SL` word cells and 2500 `example_SL` cells; Slovenian uses normal Latin-script Slovenian orthography, no artificial articles, no target-language transcription/audio, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-lt.tsv` completes the Lithuanian target-language pack through rows 1-2500 (`挨` through `座右铭`), filling 2500 `LT` word cells and 2500 `example_LT` cells; Lithuanian uses normal Latin-script Lithuanian orthography, no artificial articles, no target-language transcription/audio, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-lv.tsv` completes the Latvian target-language pack through rows 1-2500 (`挨` through `座右铭`), filling 2500 `LV` word cells and 2500 `example_LV` cells; Latvian uses normal Latin-script Latvian orthography, no artificial articles, no target-language transcription/audio, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-et.tsv` completes the Estonian target-language pack through rows 1-2500 (`挨` through `座右铭`), filling 2500 `ET` word cells and 2500 `example_ET` cells; Estonian uses normal Latin-script Estonian orthography, no artificial articles, no target-language transcription/audio, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-is.tsv` completes the Icelandic target-language pack through rows 1-2500 (`挨` through `座右铭`), filling 2500 `IS` word cells and 2500 `example_IS` cells; Icelandic uses normal Latin-script Icelandic orthography, no artificial articles, no target-language transcription/audio, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-hi.tsv` completes the Hindi target-language pack through rows 1-2500 (`挨` through `座右铭`), filling 2500 `HI` word cells and 2500 `example_HI` cells; Hindi uses normal Devanagari orthography and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-bn.tsv` completes the Bengali target-language pack through rows 1-2500 (`挨` through `座右铭`), filling 2500 `BN` word cells and 2500 `example_BN` cells; Bengali uses normal Bengali-script orthography and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-tl.tsv` completes the Filipino target-language pack through rows 1-2500 (`挨` through `座右铭`), filling all 2500 `TL` word cells and all 2500 `example_TL` cells; Filipino uses normal Filipino/Tagalog Latin-script orthography with accepted everyday loanwords and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-my.tsv` completes the Burmese target-language pack through rows 1-2500 (`挨` through `座右铭`), filling all 2500 `MY` word cells and all 2500 `example_MY` cells; Burmese uses Myanmar script only, no target-language romanization/transcription, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-km.tsv` completes the Khmer target-language pack through rows 1-2500 (`挨` through `座右铭`), filling all 2500 `KM` word cells and all 2500 `example_KM` cells; Khmer uses Khmer script only, no target-language romanization/transcription, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-lo.tsv` completes the Lao target-language pack through rows 1-2500 (`挨` through `座右铭`), filling all 2500 `LO` word cells and all 2500 `example_LO` cells; Lao uses Lao script only, no target-language romanization/transcription, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-ne.tsv` completes the Nepali target-language pack through rows 1-2500 (`挨` through `座右铭`), filling all 2500 `NE` word cells and all 2500 `example_NE` cells; Nepali uses Devanagari script only, no target-language romanization/transcription, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-si.tsv` completes the Sinhala target-language pack through rows 1-2500 (`挨` through `座右铭`), filling all 2500 `SI` word cells and all 2500 `example_SI` cells; Sinhala uses Sinhala script only, no target-language romanization/transcription, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-ta.tsv` completes the Tamil target-language pack through rows 1-2500 (`挨` through `座右铭`), filling all 2500 `TA` word cells and all 2500 `example_TA` cells; Tamil uses Tamil script only, no target-language romanization/transcription, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-te.tsv` completes the Telugu target-language pack through rows 1-2500 (`挨` through `座右铭`), filling all 2500 `TE` word cells and all 2500 `example_TE` cells; Telugu uses Telugu script only, no target-language romanization/transcription, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-kn.tsv` completes the Kannada target-language pack through rows 1-2500 (`挨` through `座右铭`), filling all 2500 `KN` word cells and all 2500 `example_KN` cells; Kannada uses Kannada script only, no target-language romanization/transcription, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-ml.tsv` completes the Malayalam target-language pack through rows 1-2500 (`挨` through `座右铭`), filling all 2500 `ML` word cells and all 2500 `example_ML` cells; Malayalam uses Malayalam script only, no target-language romanization/transcription, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-uz.tsv` completes the Uzbek target-language pack through rows 1-2500 (`挨` through `座右铭`), filling all 2500 `UZ` word cells and all 2500 `example_UZ` cells; Uzbek uses modern Latin-script Uzbek orthography, no artificial articles, no target-language romanization/transcription, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-kk.tsv` completes the Kazakh target-language pack through rows 1-2500 (`挨` through `座右铭`), filling all 2500 `KK` word cells and all 2500 `example_KK` cells; Kazakh uses Cyrillic-script Kazakh only, no artificial articles, no target-language romanization/transcription, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-az.tsv` completes the Azerbaijani target-language pack through rows 1-2500 (`挨` through `座右铭`), filling all 2500 `AZ` word cells and all 2500 `example_AZ` cells; Azerbaijani uses Latin-script Azerbaijani orthography, no artificial articles, no target-language romanization/transcription, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-ka.tsv` completes the Georgian target-language pack through rows 1-2500 (`挨` through `座右铭`), filling all 2500 `KA` word cells and all 2500 `example_KA` cells; Georgian uses Georgian script only, no target-language romanization/transcription, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-hy.tsv` completes the Armenian target-language pack through rows 1-2500 (`挨` through `座右铭`), filling all 2500 `HY` word cells and all 2500 `example_HY` cells; Armenian uses Armenian script only, no target-language romanization/transcription, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-tr.tsv` completes the Turkish target-language pack through rows 1-2500 (`挨` through `座右铭`), filling all 2500 `TR` word cells and all 2500 `example_TR` cells; Turkish uses Latin-script Turkish orthography, no artificial articles, no target-language romanization/transcription, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-sw.tsv` completes the Swahili target-language pack through rows 1-2500 (`挨` through `座右铭`), filling all 2500 `SW` word cells and all 2500 `example_SW` cells; Swahili uses Latin-script Swahili orthography, no artificial articles, no target-language romanization/transcription, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-pt-br.tsv` completes the Brazilian Portuguese target-language pack through rows 1-2500 (`挨` through `座右铭`), filling all 2500 `PT-BR` word cells and all 2500 `example_PT-BR` cells; Brazilian Portuguese is derived from the reviewed European Portuguese layer through deterministic Brazilian normalization, keeps article-aware noun display where natural, has no target-language romanization/transcription, and is included in the delivered/readback-verified HSK6 release;
- `config/hsk-classic-hsk6-translations-es-419.tsv` completes the Latin American Spanish target-language pack through rows 1-2500 (`挨` through `座右铭`), filling all 2500 `ES-419` word cells and all 2500 `example_ES-419` cells; Latin American Spanish is derived from the reviewed base Spanish layer through deterministic regional normalization, keeps article-aware noun display where natural, has no target-language romanization/transcription, and is included in the delivered/readback-verified HSK6 release;
- the current example scan reports 2500 example rows, 2500 curated rows, 0 placeholders, 0 example-pinyin tone-number hits and 0 Han-in-example-pinyin hits;
- `node scripts/hsk/check-classic-hsk-chinese-gate.mjs hsk2_classic_level_6_2500_v1` currently reports 0 blockers, 0 placeholders and 2 neutral-tone warnings for vetted particles;
- `node scripts/hsk/check-classic-hsk-semantic-pinyin-gate.mjs hsk2_classic_level_6_2500_v1` reports 0 blockers, 1 needs_review cross-level reading row and 385 source-supported warnings;
- `node scripts/hsk/check-classic-hsk-release.mjs hsk2_classic_level_6_2500_v1` passes for workbook structure, row count, XLSX import and Course Metadata;
- `node scripts/hsk/check-classic-hsk-article-policy.mjs hsk2_classic_level_6_2500_v1` reports 0 blockers;
- `node scripts/hsk/check-classic-hsk-pinyin-alignment-gate.mjs hsk2_classic_level_6_2500_v1` reports 2500/2500 word-pinyin aligned rows, 2500/2500 syllable-count matches, 0 blockers and 0 warnings;
- `node scripts/hsk/check-classic-hsk-example-complexity-gate.mjs hsk2_classic_level_6_2500_v1` reports 2500/2500 anchored examples, max 14 Han characters, max 1 internal punctuation mark, 0 blockers and 0 warnings;
- `node scripts/hsk/check-classic-hsk-polyphonic-lock.mjs hsk2_classic_level_6_2500_v1` controls the one HSK6 `喂` cross-level reading row and reports 0 blockers;
- `node scripts/hsk/check-classic-hsk-source-audit.mjs hsk2_classic_level_6_2500_v1` now passes after all 53 target-language packs are filled and the native-free polish repair is delivered. The fresh 20260603 run reports 0 blockers, 3759 warnings, 3800 word source candidates and 3200 example source candidates, and writes `outputs/hsk/qa/hsk2_classic_level_6_2500_v1_source_audit_20260603.json`. Completed full packs are 53/53 and each completed pack has 2500 filled word cells, 2500 filled example cells and 0 blockers. ES-419 is complete with 2500 filled word cells, 2500 filled example cells, 0 blockers, 9 warnings and estimated confidence `source_partial`; its generator report `outputs/hsk/qa/hsk2_classic_level_6_2500_v1_es_419_generation_20260603.json` has 2500 rows, 22 changed rows, 0 issues and 0 regional-risk hits. PT-BR is complete with 2500 filled word cells, 2500 filled example cells, 0 blockers, 14 warnings and estimated confidence `generated_checked_no_source`; its generator report `outputs/hsk/qa/hsk2_classic_level_6_2500_v1_pt_br_generation_20260603.json` has 2500 rows, 213 changed rows, 0 issues and 0 regional-risk hits.
- HSK6 was delivered on 2026-06-03 after explicit authorization. `node scripts/hsk/import-classic-hsk-source-to-db.mjs hsk2_classic_level_6_2500_v1` synced/read back 2500 HSK source rows in `hsk_classic_source_items` with 0 blockers and 0 readback mismatches. `node scripts/hsk/import-classic-hsk-translations-to-db.mjs hsk2_classic_level_6_2500_v1` synced/read back 132500 rows in `hsk_classic_translation_items` (2500 HSK rows x 53 target languages) with 0 blockers and 0 readback mismatches. A final aggregate DB readback verified 53 languages, 0 blank translation cells and 0 source-hash mismatches.
- The HSK6 workbook is uploaded as native Google Sheet `hsk 6`: `https://docs.google.com/spreadsheets/d/1LjtwHt0EGjBcjxdYo3txbUO3y4uVUBBuVt_dGWk7g3s/edit?usp=drivesdk`. Delivery manifest: `outputs/hsk/hsk2_classic_level_6_2500_v1_delivery.json`. After the 2026-06-04 Course Metadata `Module`/`Category` refresh, `node scripts/hsk/check-classic-hsk-google-sheet-readback.mjs hsk2_classic_level_6_2500_v1` verified the updated Sheet with 2501 rows, 118 columns and 295388 cells, including the five-row `Course Metadata` sheet, with workbook upload/readback hashes matching `outputs/hsk/hsk2_classic_level_6_2500_v1.xlsx`. Current workbook sha256 is `21d242e19a42916c98bce2d9c79ab98467b86ba14a19b6bcab84eba3bcb556a6`; upload time is `2026-06-04T04:46:14.611Z`, readback time is `2026-06-04T05:54:09.593Z`.
- `node scripts/hsk/check-classic-hsk-final-readiness.mjs hsk2_classic_level_6_2500_v1` now passes with `status: ok`, 0 blockers, 1 tracked semantic-pinyin warning, live Google readback enabled and DB source sync/readback enabled. Reports: `outputs/hsk/qa/hsk2_classic_level_6_2500_v1_final_readiness_20260604.json` and `.md`.
- Native-free polish repair `outputs/hsk/qa/hsk2_classic_level_6_2500_v1_native_free_polish_repair_20260603.json` and `.md` applied 31 targeted target-language word/example edits in `config/hsk-classic-hsk6-translations-cs.tsv`, `config/hsk-classic-hsk6-translations-hu.tsv`, `config/hsk-classic-hsk6-translations-kk.tsv` and `config/hsk-classic-hsk6-translations-tl.tsv`. The repair localized Czech/Hungarian/Filipino `公关`, Kazakh `股东`, `客户`, `使命`, and 25 additional Filipino exact-English/code-switch rows (`备份`, `被动`, `钙`, `嘿`, `口音`, `礼节`, `里程碑`, `埋伏`, `免疫`, `魔术`, `频率`, `屏幕`, `人质`, `儒家`, `天然气`, `亭子`, `通货膨胀`, `温带`, `氧气`, `元宵节`, `直径`, `指南针`, `中立`, `助理`, `专利`). The workbook, CSV and JSONL were rebuilt, HSK source/translation DB tables were synced/read back, and the same Google Sheet `hsk 6` was updated/read back in place.
- Post-delivery sample QA `outputs/hsk/qa/hsk2_classic_level_6_2500_v1_sample_5_per_language_qa_20260603.json` and `.md` checked 5 deterministic rows per target language from the delivered JSONL, covering 265 sampled word cells and 265 sampled example cells, plus 5 extra Kazakh focus rows and the one KK source-audit concept-sanity hint row. Current result after repair: 0 blockers and 0 review candidates. Kazakh focus rows `著作`, `从容`, `嚷`, `降临`, `丰收`, `计较`, `丰满`, `充实`, `驱逐`, `圈套` and hint row `卑鄙` have no automated findings and manually match their Chinese/English example scenes. This sample QA does not replace the executable final-readiness gates or native-speaker approval.
- Native-free full risk scan `outputs/hsk/qa/hsk2_classic_level_6_2500_v1_native_free_risk_scan_20260603.json` and `.md` checked all 132500 target word cells and all 132500 target example cells from the delivered JSONL after the polish repair. Current result: 0 blockers, 150 warning signals and 155 review signals, down from 336 total signals to 305. The scan found no exact-English example fallback, no Han leakage, no blank target cells and no KK/RU exact example copy.
- Native-free signal triage `outputs/hsk/qa/hsk2_classic_level_6_2500_v1_native_free_signal_triage_20260603.json` and `.md` replayed all 305 remaining deterministic risk-scan signals from the delivered JSONL and classified them as 0 `repair_required`, 0 `polish_candidate` and 305 accepted loanword/cognate/internationalism cases. Kazakh now has 54 signals, all accepted common loanword/internationalism cases. Filipino now has 11 exact-English/code-switch signals, all accepted common code-switch/loanword cases. This triage is native-free QA only, not native-speaker approval.

HSK6 gate handoff for parallel chats:

- Any chat continuing `hsk2_classic_level_6_2500_v1` must treat the gate set above as mandatory, not optional. A HSK6 continuation is current only if it reads this document plus `docs/PROJECT_STATE.md` and then reports fresh command outputs or preserved report paths for the required gates.
- During any future HSK6 repair, run and report at minimum: `check-classic-hsk-release`, `check-classic-hsk-chinese-gate`, `check-classic-hsk-semantic-pinyin-gate`, `check-classic-hsk-pinyin-alignment-gate`, `check-classic-hsk-example-complexity-gate`, `check-classic-hsk-polyphonic-lock`, `check-classic-hsk-article-policy` and `check-classic-hsk-source-audit` after each meaningful workbook rebuild. If the workbook changes after delivery, rerun HSK DB source/translation imports as applicable, update the same Google Sheet `hsk 6`, run HSK Google readback, and rerun final-readiness.
- The 2026-06-02 weak-source activations for `KK`, `KM`, `MY`, `NE`, `AZ` and `SW` are part of the current source-audit/preflight candidate layer through `reference-sources/cache/bulk-source-indexes/weak_dictionary_candidates.jsonl` and `reference-sources/cache/bulk-source-indexes/weak_example_collocations.jsonl`. They must be used for current and future HSK work as `source_partial` repair/sanity evidence, but they do not prove HSK translations by themselves and must not override Chinese source rows, pinyin, HSK sense or translated examples without row-level repair evidence.
- HSK6 is no longer in a target-language filling phase. Source-audit blockers from blank HSK6 target-language/example columns are not expected; any new blocker after a repair must be treated as a regression until fixed or deliberately locked with evidence.
- The final HSK6 closeout report is current at `outputs/hsk/qa/hsk2_classic_level_6_2500_v1_final_readiness_20260604.json`. Future repair closeout must rerun it after workbook, DB and Google Sheet refresh/readback.
- Already closed HSK1-HSK5 releases are not automatically reopened just because new weak sources were indexed. If stronger evidence is desired for old HSK weak-language rows, run a targeted source-audit/readback pass and repair only concrete blockers; do not rewrite ordinary deck cards, do not bulk-regenerate translated HSK rows, and do not change Google Sheets/DB unless a documented repair requires delivery refresh.
- Manual/native review is not part of the HSK6 closure path. If a quality issue is found, encode it as a deterministic gate, lock entry or targeted repair inside the HSK-only contour before declaring the deck ready.

Next HSK6 implementation step: none for delivery. HSK6 is delivered/readback verified. Future work should only be targeted repairs backed by a concrete gate/source finding; do not bulk-regenerate translated HSK rows or touch ordinary deck cards.

## Workbook Contract

Основной лист:

```text
HSK<N> Classic
```

Например `HSK1 Classic` для `hsk2_classic_level_1_150_v1` and `HSK2 Classic` для `hsk2_classic_level_2_150_v1`.

Buyer-facing first sheet:

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

`ZH` is the Chinese source word (`simplified`) and must be the first visible column. `ZH transcription` is Chinese pinyin. After them come the 53 user target-language word translation columns from `config/language-order.json`, in the same order as other LunaCards exports, excluding `ZH` as a target language:

```text
EN, ES, FR, DE, IT, PT, RU, JA, KO, VI, TH, MS, ID, PL, NL,
SV, NO, DA, FI, CS, SK, HU, RO, BG, HR, SR, SL, LT, LV, ET, IS,
HI, BN, TL, MY, KM, LO, NE, SI, TA, TE, KN, ML, UZ, KK, AZ, KA,
HY, TR, SW, PT-BR, ES-419, EN-GB
```

These 53 columns contain short translations of the Chinese word for the learner's language. `ZH` is visible on the buyer-facing sheet, but it is not a target-language translation column and must not create a `ZH` row in `hsk_classic_translation_items`.

After the word translations, `ZH example` displays the Chinese example and `ZH example transcription` displays Chinese example pinyin. Then 53 `<LANG> example` columns translate the Chinese example into the learner's language.

`<LANG> example` is a translation of `example_zh`. It is not target-language transcription or romanization. `ZH example` is source display, not a target-language example translation column.

Technical/internal fields are preserved outside the buyer-facing first sheet:

```text
Internal Data sheet
outputs/hsk/<release_id>.csv
outputs/hsk/<release_id>.jsonl

release_id
hsk_version
hsk_level
hsk_order
traditional
example_EN
translation_status
example_status
qa_notes
```

`translation_status` and `example_status` count the total non-empty target-language/example columns across the HSK workbook. During preparation they use `partial_<N>_languages_filled`; once all 53 target languages are filled they use `complete_53_languages_filled`. Per-language coverage and source files are audited in the `Translation QA` sheet.

## Course Metadata Sheet

HSK workbooks also include the same user-facing metadata sheet shape used by ordinary room/deck exports:

```text
Course Metadata
```

Format:

```text
        EN      ES      FR      ...     PT-BR   ES-419  EN-GB
Title   HSK 1.
Description ...
Module  Chinese
Category HSK 1
```

HSK-specific rules:

- the metadata language columns use the same 53 HSK target-language order as the main HSK sheet, excluding `ZH`;
- `Title` is `HSK <level>.` for every target language because HSK is a stable course/exam label;
- `Description` is localized for every target language and must describe the HSK level vocabulary as HSK 2.0 / 2010-2021 vocabulary, not with a literal "classic" wording;
- `Module` is the localized short mobile-app label for Chinese, for example `Chinese`, `Китайский`, `Қытай тілі`, `中文` is not used because `ZH` is excluded from HSK target-language columns;
- `Category` is the stable short mobile-app label `HSK <level>` for the release, for example `HSK 1`, `HSK 2`, ..., `HSK 6`;
- `Title` and `Description` must end with sentence punctuation;
- `Module` and `Category` are short labels and do not require sentence punctuation;
- this sheet is generated by `scripts/hsk/build-classic-hsk1-release.mjs`, so future HSK Classic levels inherit it automatically;
- `scripts/hsk/check-classic-hsk-release.mjs` validates that `Course Metadata` exists, has all 53 target-language columns, includes `Title`, `Description`, `Module` and `Category`, has no empty metadata cells, includes the HSK level where required, and uses the expected localized Chinese label plus `HSK <level>` for module/category.

## Chinese Fields

Обязательные китайские поля:

- `simplified` - китайское слово в simplified characters;
- `traditional` - traditional form, если есть;
- `pinyin` - Hanyu Pinyin with tone marks для слова;
- `example_zh` - китайский пример, может быть пустым в подготовительном шаблоне;
- `example_pinyin` - pinyin для китайского примера, обязателен когда заполнен `example_zh`;
- `example_<LANG>` - перевод китайского примера на язык пользователя, без транскрипции этого языка.

Для HSK release-файлов не нужны:

- IPA для переводов;
- romanization/transliteration для переводов;
- pronunciation/transcription columns для каждого языка;
- audio.

Пользователь учит китайский, поэтому pinyin нужен только для китайского слова и китайского примера.

## HSK Chinese DB Source Layer

HSK Classic Chinese source rows are also stored in Postgres in a dedicated table:

```text
hsk_classic_source_items
```

This table is not the ordinary LunaCards deck-card model. It does not create `meaning_units`, ordinary `meaning_language_entries`, target-language transcription rows or ordinary room/deck cards. It stores the stable Chinese source layer for HSK releases so the Chinese word, pinyin, Chinese example, example pinyin and English pivot/example can be checked and reused without reconstructing them from workbook columns or chat history.

For completed HSK Classic releases, the DB source layer is populated from the generated release files:

```bash
node scripts/hsk/import-classic-hsk-source-to-db.mjs
```

The importer defaults to HSK1-HSK4 for the already delivered early batch:

```text
hsk2_classic_level_1_150_v1
hsk2_classic_level_2_150_v1
hsk2_classic_level_3_300_v1
hsk2_classic_level_4_600_v1
```

For HSK5 and later completed releases, pass the release id explicitly:

```bash
node scripts/hsk/import-classic-hsk-source-to-db.mjs hsk2_classic_level_5_1300_v1
```

It reads `outputs/hsk/<release_id>.jsonl` plus `outputs/hsk/source/<release_id>.source.json`, validates row count, required Chinese fields, simplified/example Han text, pinyin shape and absence of tone numbers, applies `db/migrations/025_hsk_classic_source_items.sql`, then upserts by `(release_id, hsk_order)`. Every row stores a deterministic `content_hash`; reruns are idempotent when the release row is unchanged. If a stored row differs, the importer records the change in its report and updates only the HSK source table.

The importer writes:

```text
outputs/hsk/qa/hsk2_classic_levels_1_4_db_source_import_<YYYYMMDD>.json
```

Current DB source import status:

```text
rows stored: 5000
HSK1 rows: 150
HSK2 rows: 150
HSK3 rows: 300
HSK4 rows: 600
HSK5 rows: 1300
HSK6 rows: 2500
blockers: 0
warnings: 0
readback mismatches: 0
latest HSK4/HSK5 repair sync: 2 updated, 1898 unchanged
latest HSK6 source import: 2500 inserted
latest HSK4/HSK5 repair report: outputs/hsk/qa/hsk2_classic_2_releases_db_source_import_20260517.json
latest HSK5 report: outputs/hsk/qa/hsk2_classic_level_5_1300_v1_db_source_import_20260515.json
latest HSK6 report: outputs/hsk/qa/hsk2_classic_level_6_2500_v1_db_source_import_20260517.json
```

## HSK Translation DB Layer

Completed HSK target-language word translations and translated examples are stored in a second dedicated table:

```text
hsk_classic_translation_items
```

This table is also separate from ordinary deck cards. It references `hsk_classic_source_items` by `(release_id, hsk_order)`, stores one row per target language, and explicitly excludes `ZH` because Chinese is the source layer rather than a target-language translation in HSK workbooks.

Import command for the completed HSK1-HSK4 translation layer:

```bash
node scripts/hsk/import-classic-hsk-translations-to-db.mjs
```

The importer defaults to HSK1-HSK4, reads `outputs/hsk/<release_id>.jsonl`, validates 53 HSK target languages, non-empty word/example translations, no `ZH` target rows, no accidental Han leakage outside Japanese/Korean target cells, and requires the Chinese source rows to already exist in `hsk_classic_source_items`. It stores the source translation-pack filenames where available and a deterministic `content_hash` for idempotent reruns.

For HSK5 and later completed releases, pass the release id explicitly:

```bash
node scripts/hsk/import-classic-hsk-translations-to-db.mjs hsk2_classic_level_5_1300_v1
```

Current DB translation import status for HSK1-HSK5:

```text
rows stored: 132500
target languages per release: 53
HSK1 rows: 7950
HSK2 rows: 7950
HSK3 rows: 15900
HSK4 rows: 31800
HSK5 rows: 68900
ZH target rows: 0
ordinary content_sets HSK rows: 0
ordinary meaning_units HSK rows: 0
blockers: 0
warnings: 0
readback mismatches: 0
latest HSK5 idempotency rerun: 68900 unchanged
latest HSK5 report: outputs/hsk/qa/hsk2_classic_level_5_1300_v1_db_translation_import_20260515.json
```

## Source-Assisted Audit

Downloaded LunaCards sources are useful for HSK, but they must be applied through an HSK-specific audit rather than the ordinary deck source-preflight unchanged.

Executable HSK source audit:

```bash
node scripts/hsk/check-classic-hsk-source-audit.mjs <release_id>
```

For the current release:

```bash
node scripts/hsk/check-classic-hsk-source-audit.mjs hsk2_classic_level_1_150_v1
```

The audit reads `outputs/hsk/<release_id>.jsonl` first and falls back to `outputs/hsk/<release_id>.csv`. It writes a read-only QA report to:

```text
outputs/hsk/qa/<release_id>_source_audit_<YYYYMMDD>.json
```

HSK source-assisted audit checks:

- Chinese source row identity: `simplified`, `traditional`, `pinyin`, `hsk_order`;
- buyer-facing `ZH` / `ZH example` source-display columns are allowed on the first sheet, but no duplicated `ZH` / `example_ZH` target-language translation columns or DB rows are allowed;
- pinyin tone marks for Chinese word and Chinese example, with tone numbers as blockers;
- target-language short word translation against indexed source candidates where available;
- target example translation against `example_EN` as pivot and `example_zh` / `example_pinyin` as the canonical Chinese scene;
- script consistency for non-Latin target languages;
- absence of target-language transcription, IPA, romanization and audio columns;
- stale/mismatched translation pack value versus workbook value;
- source-candidate coverage and warnings by language.

Hard blockers are limited to missing required HSK fields, wrong target script, English fallback in non-English translation cells, Chinese pinyin tone numbers, obvious target example drift, and stale/mismatched translation-pack values. `source_partial`, `no_source` and candidate mismatch are warnings only. MT/Google Translate is never source truth.

The source audit summary reports, for each language, filled word cells, filled example cells, blocker count, warning count, source candidate count, example candidate count and an estimated confidence bucket. Candidate counts are coverage/sanity diagnostics, not approval evidence.

Current implemented checks cover workbook structure, coverage, pinyin fields, article policy, Google Sheet readback and HSK source-assisted source candidate audit. The HSK audit does not add ordinary deck target-language transcription columns and does not mutate workbook/data.

## Translation Rules

Языковые колонки содержат только короткое значение слова на языке пользователя.

Правила:

- не добавлять грамматические объяснения;
- не добавлять длинные словарные статьи;
- не добавлять транскрипцию целевого языка;
- выбирать базовый learner-facing смысл, подходящий HSK 1;
- если китайское слово многозначное, фиксировать короткий набор основных значений через `;`;
- если источник по языку закрытый/app/deck, использовать его только как reference/QA, не как прямой import без отдельной license decision.

## HSK Word Display And Article Policy

Это правило действует для всех classic HSK release workbooks and levels, not only `hsk2_classic_level_1_150_v1`.

HSK word columns are not grammar lessons for the learner's own language. The learner already knows their language and is learning Chinese. Still, the target-language word cell should use the normal short learner/dictionary display form for that language. That means:

- include a noun article or gender-bearing article when it is normal learner-facing dictionary practice for that language;
- do not invent artificial articles for languages that do not use them;
- do not add target-language transcription, IPA or romanization;
- do not add long grammar notes; a short article/gender marker is allowed only as part of the word display;
- verbs, adjectives, adverbs, numbers, pronouns, particles and phrases stay in their normal base/citation form and do not receive artificial articles.

For HSK vocabulary, the article policy is:

| Policy | Languages | HSK word-column rule |
| --- | --- | --- |
| Use learner noun article/gender article for nouns | `ES`, `ES-419`, `FR`, `DE`, `IT`, `PT`, `PT-BR`, `NL`, `SV`, `NO`, `DA`, `RO` | Noun entries should show the normal short article/marker, for example `la taza`, `le thé`, `die Tasse`, `il film`, `o médico`, `de computer`, `en kopp`, `et glass`, `en kop`, Romanian `un/o` where useful. |
| English countability article optional in HSK glosses | `EN`, `EN-GB` | HSK glosses may stay bare (`cup; glass`) because English speakers do not need gender marking. If the same content is converted into the ordinary LunaCards deck model, countable singular nouns should follow that model's `a/an` display rule. |
| No article; base/citation form only | `RU`, `JA`, `KO`, `VI`, `TH`, `MS`, `ID`, `PL`, `FI`, `CS`, `SK`, `HU`, `BG`, `HR`, `SR`, `SL`, `LT`, `LV`, `ET`, `IS`, `HI`, `BN`, `TL`, `MY`, `KM`, `LO`, `NE`, `SI`, `TA`, `TE`, `KN`, `ML`, `UZ`, `KK`, `AZ`, `KA`, `HY`, `TR`, `SW` | Do not add artificial articles. Use the normal base/citation form in the native script/orthography. If a language needs a noun class, gender or classifier distinction, handle it through the natural lexical form or a future explicit metadata decision, not by ad hoc grammar notes in the word cell. |

Current HSK1 normalization status:

| Status | Languages | Action |
| --- | --- | --- |
| Article-normalized in current filled HSK1 pack | `ES`, `ES-419`, `FR`, `DE`, `IT`, `PT`, `PT-BR`, `NL`, `SV`, `NO`, `DA`, `RO` | Noun cells have been normalized to include normal learner-facing articles/markers where useful. Keep this policy in later edits and still require native-language QA before marking approved. |
| No article normalization needed | `RU`, `JA`, `KO`, `VI`, `TH`, `MS`, `ID`, `PL`, `FI`, `CS`, `SK`, `HU`, `BG`, `HR`, `SR`, `SL`, `LT`, `LV`, `ET`, `IS`, `HI`, `BN`, `TL`, `MY`, `KM`, `LO`, `NE`, `SI`, `TA`, `TE`, `KN`, `ML`, `UZ`, `KK`, `AZ`, `KA`, `HY`, `TR`, `SW` | Keep base forms; do not add artificial articles. |
| Future fill must follow this policy from first draft | none for current HSK1 release | Apply the policy above when future language variants or future HSK levels are created. |

2026-05-05 all-filled-language QA pass: the current 33 filled HSK1 languages were rechecked for script consistency, punctuation, article policy, demonstrative coverage and high-risk HSK example drift. This pass normalized `这` / `那` / `哪` display forms where a single masculine/singular form hid required gender or plural distinctions, expanded learner-facing gender pairs for selected human-role nouns in article/gender-sensitive languages, and repaired target examples for `听` where the "teacher speaks" part had been dropped.

2026-05-05 ET QA pass: after adding Estonian, the current 34 filled HSK1 languages include `ET`. ET was rechecked for native Estonian case usage, article/gender policy, spatial adverbs, phone-greeting wording and high-risk HSK example drift. The release was rebuilt, uploaded to the same Google Sheet and read back against all filled and empty language columns.

2026-05-05 IS QA pass: after adding Icelandic, the current 35 filled HSK1 languages include `IS`. IS was created as a no-article pack with Icelandic base/citation word forms, gender/number variants where the display form needs them, and natural Icelandic case usage in examples.

2026-05-05 IS refinement pass: IS was rechecked for literate native-style terminology and surface naturalness. The pass replaced calqued grammar labels with Icelandic `ögn` / `spurnarögn` / `mæliorð`, added needed adjective gender forms in word cells, and normalized selected question examples to standard written contractions such as `hefurðu`, `kemurðu` and `áttu`.

2026-05-05 HI QA pass: after adding Hindi, the current 36 filled HSK1 languages include `HI`. HI was created as a Devanagari-only no-article pack with dictionary/base word forms, gender variants where useful in word cells, natural Hindi postposition/case usage in examples, and no target-language romanization.

2026-05-05 HI grammar refinement pass: HI was rechecked specifically for Hindi grammar and native-style surface naturalness. The pass normalized quantity/duration wording, added `छात्रा` to the learner-facing student display, and made the `她` example mark a female referent naturally through `छात्रा`.

2026-05-05 BN QA pass: after adding Bengali, the current 37 filled HSK1 languages include `BN`. BN was created as a Bengali-script no-article pack with normal Bengali classifier/count forms in examples, natural postposition/location phrasing and no target-language romanization.

2026-05-05 BN refinement pass: BN was rechecked for native-style Bengali surface naturalness and HSK semantic contrast. The pass replaced overly literal or bookish choices, preserved the `太` excessive/too-much contrast, normalized simple like examples to natural `ভালো লাগে` phrasing, and repaired selected role/date examples with natural Bengali wording.

2026-05-05 TL QA pass: after adding Filipino, the current 38 filled HSK1 languages include `TL`. TL was created as a no-article Latin-script Filipino pack with normal Filipino/Tagalog citation forms, natural linker and number forms in examples, `kami/tayo` coverage for `我们`, and no target-language transcription.

2026-05-05 TL refinement pass: TL was rechecked for Filipino native-style surface naturalness. The pass expanded useful pronoun case forms (`ko`, `mo`, `niya`, `namin`, `natin`), replaced a literal `回家` rendering with natural `Umuuwi ako.`, and normalized direct-address examples for `先生` / `小姐` to common Filipino address forms.

2026-05-05 MY QA pass: after adding Burmese/Myanmar, the current 39 filled HSK1 languages include `MY`. MY was created as a Myanmar-script no-article pack with no target-language romanization, simple written Burmese examples, normal Burmese count/classifier forms, and full locative clauses for location examples.

2026-05-05 MY refinement pass: MY was rechecked for native-style written Burmese surface naturalness and HSK semantic contrast. The pass replaced over-literal grammar labels with Burmese `အမှုန်` wording, repaired `没` so the not-yet sense is not shown as standalone `မသေး`, removed the double intensifier in `太`, and normalized selected date, weekday, demonstrative and locative examples.

2026-05-05 KM QA pass: after adding Khmer, the current 40 filled HSK1 languages include `KM`. KM was created as a Khmer-script no-article pack with no target-language romanization, natural short Khmer clauses, count/classifier forms where they are normal, and location examples using full `នៅ...` predicate clauses.

2026-05-05 KM refinement pass: KM was rechecked for native-style Khmer surface naturalness. The pass normalized the `不客气` display variant, removed an over-literal `谢谢你` target example, repaired date spacing in `日` / `月`, and changed the teacher-goodbye example to a natural Khmer address order.

2026-05-05 LO QA pass: after adding Lao, the current 41 filled HSK1 languages include `LO`. LO was created as a Lao-script no-article pack with no target-language romanization, natural short Lao clauses without machine word-segmentation spaces, Lao count/classifier forms, and full location examples with `ຢູ່`.

2026-05-05 LO refinement pass: LO was rechecked for native-style Lao surface naturalness and source-backed high-risk lexical forms. The pass normalized apple to `ໝາກໂປມ`, changed `下` under-table wording to `ລຸ່ມ`, and kept Lao action clauses unsegmented.

2026-05-05 NE QA pass: after adding Nepali, the current 42 filled HSK1 languages include `NE`. NE was created as a Devanagari no-article pack with no target-language romanization, Nepali citation/base word forms, natural postposition examples, Nepali count/classifier forms such as `आठवटा किताब` and `एक जना साथी`, formality-aware examples, and an HI/NE sibling-copy sanity check.

2026-05-05 NE refinement pass: NE was rechecked for native-style Nepali surface naturalness. The pass normalized Nepali spelling (`चिज`), reduced Hindi-style or overly literal wording in `不客气` / `本`, made the `那` teacher example honorific, and kept locative examples in natural Nepali forms such as `कपमा`.

2026-05-05 SI QA pass: after adding Sinhala, the current 43 filled HSK1 languages include `SI`. SI was created as a Sinhala-script no-article pack with no target-language romanization, Sinhala citation/base word forms, natural SOV examples, locative constructions such as `බෙයිජිංවල`, `බෙයිජිංට`, `මේසය උඩ` and `මේසය යට`, and Sinhala count/classifier wording such as `පොත් අටක්`, `මිතුරෙක්`, `කෝප්ප තුනක්` and `ඇපල් ගෙඩි පහක්`.

2026-05-05 SI refinement pass: SI was rechecked for native-style Sinhala surface naturalness. The pass reduced formal/calc-like phrasing in `都`, `对不起`, `呢`, `里`, `喂`, `小`, `字` and `是`, then normalized Beijing locatives, table-position phrasing, apple counting, teacher forms, direct-address greetings, `回` return wording and the `太` excessive-degree example while keeping the no-article Sinhala-script policy and the `听` teacher-speaking scene.

2026-05-05 TA QA pass: after adding Tamil, the current 44 filled HSK1 languages include `TA`. TA was created as a Tamil-script no-article pack with no target-language romanization, Tamil citation/base word forms, natural case-marked examples such as `பெய்ஜிங்கில்`, `பெய்ஜிங்குக்கு`, `பள்ளிக்குச்`, `மேசையின் மேல்`, `கோப்பையில்`, and count wording such as `எட்டு புத்தகங்கள்`, `மூன்று கோப்பைகள்` and `ஐந்து ஆப்பிள்கள்`.

2026-05-05 TA refinement pass: TA was rechecked for native-style Tamil surface naturalness. The pass normalized `多少` as a natural price question, duration as `ஐந்து நிமிடங்கள்`, `去` display to `போகுதல்`, `能` permission as `செல்லலாமா`, front-location examples to `முன்னால்`, short predicate-noun examples to natural `ஒரு ...` forms, `少` to `குறைவாக`, `太` to `தேவைக்கு அதிகமாகப் பெரியது`, and `写` to `எழுத்துகளை எழுதுகிறேன்`.

2026-05-05 TE QA pass: after adding Telugu, the current 45 filled HSK1 languages include `TE`. TE was created as a Telugu-script no-article pack with no target-language romanization, Telugu base/citation word forms, Telugu-script learner loans where natural, case-marked examples such as `బీజింగ్‌లో`, `బీజింగ్‌కు`, `పాఠశాలకు`, `టాక్సీలో`, `విమానంలో`, `కప్పులో`, `మేజాపై` and `మేజా కింద`, and count wording such as `ఎనిమిది పుస్తకాలు`, `ఒక పుస్తకం`, `మూడు కప్పులు`, `నలుగురు స్నేహితులు` and `ఐదు ఆపిళ్లు`.

2026-05-05 TE refinement pass: TE was rechecked for native-style Telugu surface naturalness. The pass normalized Telugu verbal nouns from `-టం` variants to standard learner-facing `-డం` forms, repaired `看见` and `听` examples so they sound like natural Telugu clauses while preserving the HSK scenes, reduced over-honorific `ఆయన` in neutral `他` examples, and kept respectful address where the example explicitly involves a teacher.

2026-05-05 KN QA pass: after adding Kannada, the current 46 filled HSK1 languages include `KN`. KN was created as a Kannada-script no-article pack with no target-language romanization, Kannada base/citation word forms, Kannada-script learner loans where natural, case-marked examples such as `ಬೀಜಿಂಗ್‌ನಲ್ಲಿ`, `ಬೀಜಿಂಗ್‌ಗೆ`, `ಶಾಲೆಗೆ`, `ಟ್ಯಾಕ್ಸಿಯಲ್ಲಿ`, `ವಿಮಾನದಲ್ಲಿ`, `ಕಪ್‌ನಲ್ಲಿ`, `ಮೇಜಿನ ಮೇಲೆ` and `ಮೇಜಿನ ಕೆಳಗೆ`, and count wording such as `ಎಂಟು ಪುಸ್ತಕಗಳು`, `ಒಂದು ಪುಸ್ತಕ`, `ಮೂರು ಕಪ್‌ಗಳು`, `ನಾಲ್ವರು ಸ್ನೇಹಿತರು` and `ಐದು ಸೇಬುಗಳು`.

2026-05-05 KN refinement pass: KN was rechecked for native-style Kannada surface naturalness. The pass replaced a literal `ಧನ್ಯವಾದ ಬೇಡ` display for `不客气`, made the `块` example a natural price sentence, simplified the `呢` target example, normalized `下午` to learner-facing `ಮಧ್ಯಾಹ್ನ; ಅಪರಾಹ್ನ`, changed `学习` away from a `读`-like display, and added the feminine human form `ಒಬ್ಬಳು` to `一`.

2026-05-05 ML QA pass: after adding Malayalam, the current 47 filled HSK1 languages include `ML`. ML was created as a Malayalam-script no-article pack with no target-language romanization, Malayalam base/citation word forms, Malayalam-script learner loans where natural, case-marked examples such as `ബെയ്ജിംഗിൽ`, `ബെയ്ജിംഗിലേക്ക്`, `സ്കൂളിലേക്ക്`, `ടാക്സിയിൽ`, `വിമാനത്തിൽ`, `കപ്പിൽ`, `മേശപ്പുറത്ത്` and `മേശയുടെ താഴെ`, and count wording such as `എട്ട് പുസ്തകങ്ങൾ`, `ഒരു പുസ്തകം`, `മൂന്ന് കപ്പുകളുണ്ട്`, `നാല് സുഹൃത്തുക്കളുണ്ട്` and `അഞ്ച് ആപ്പിളുകളുണ്ട്`.

2026-05-05 ML refinement pass: ML was rechecked for native-style Malayalam surface naturalness. The pass replaced literal quantity calques with `ധാരാളം`, repaired the `看见` example into a direct Malayalam clause, normalized `വയസ്സ്`, compacted common possession/count examples with `-ഉണ്ട്` forms, simplified the `医生` display, and changed the `再见` teacher-address example to natural `സാറേ, വീണ്ടും കാണാം`.

2026-05-05 ML second refinement pass: ML was rechecked again for native-style Malayalam learner-card quality. The pass normalized eating scenes to neutral `കഴിക്കുക` / `കഴിക്കുന്നു`, replaced literal possession/count spacing with compact forms such as `പുസ്തകമുണ്ട്`, `സുഹൃത്തുണ്ട്`, `കപ്പുണ്ട്` and `പണമില്ല`, changed `和` away from the misleading `മറ്റും`, repaired `呢` as `നിനക്കോ?`, made `少` more idiomatic with `കുറച്ച് വിദ്യാർത്ഥികളേ ഉള്ളൂ`, and used natural location wording such as `കസേരപ്പുറത്താണ്` and `മേശക്കീഴിലാണ്`.

2026-05-05 UZ QA pass: after adding Uzbek, the current 48 filled HSK1 languages include `UZ`. UZ was created as a modern Latin Uzbek no-article pack with no target-language transcription, Uzbek base/citation word forms, ASCII apostrophe Uzbek orthography for `o'` / `g'`, natural case and postposition examples such as `Pekinda`, `Pekinga`, `maktabda`, `maktabga`, `stol ustida`, `stol ostida` and `restoran orqasida`, learner-friendly count wording such as `sakkizta kitob`, `bitta kitob`, `uchta stakan`, `to'rtta do'st` and `beshta olma`, and a `坐` example that preserves vehicle-riding meaning with `samolyotga minib`.

2026-05-05 UZ refinement pass: UZ was rechecked for native-style Uzbek learner-card quality. The pass changed the phone-call row toward natural `qo'ng'iroq qilmoq`, replaced the less common `tamaddixona` in the HSK restaurant row with learner-facing `oshxona`, repaired the `几` example to natural possessive `Senda nechta do'st bor?`, expanded human-role displays such as `o'g'il farzand`, `qiz farzand`, `odam; kishi; odamlar`, added `qayerga` to the `哪` display for direction examples, and made `小姐` less bare with `yosh ayol`.

2026-05-05 KK QA pass: after adding Kazakh, the current 49 filled HSK1 languages include `KK`. KK was created as a Kazakh Cyrillic no-article pack with no target-language romanization, Kazakh base/citation word forms, no Latin fallback in word/example cells, natural case and postposition examples such as `Бейжіңде`, `Бейжіңге`, `мектепте`, `мектепке`, `таксимен`, `ұшақпен`, `стақанда`, `үстелдің үстінде`, `үстелдің астында` and `мейрамхананың артында`, and learner-friendly count wording such as `сегіз кітап`, `бір кітап`, `үш стақан`, `төрт дос` and `бес алма`.

2026-05-05 KK refinement pass: KK was rechecked for native-style Kazakh learner-card quality. The pass changed generic preference examples from unnecessary plurals to natural singular/class readings such as `Маған кино ұнайды` and `Маған алма ұнайды`, made the fruit row learner-facing with `жеміс; жеміс-жидек`, changed `小姐` from bare `жас әйел` to `бойжеткен`, and normalized the `怎么样` example to natural `Бүгін қалайсың?`.

2026-05-05 AZ QA pass: after adding Azerbaijani, the current 50 filled HSK1 languages include `AZ`. AZ was created as a modern Latin Azerbaijani no-article pack with no target-language romanization, Azerbaijani base/citation word forms, no Cyrillic fallback in word/example cells, natural case and postposition examples such as `Pekində`, `Pekinə`, `Çinə`, `məktəbdə`, `məktəbə`, `taksi ilə`, `təyyarə ilə`, `stəkanda`, `stolun üstündə`, `stolun altındadır` and `restoranın arxasındadır`, and learner-friendly count wording such as `səkkiz kitab`, `bir kitab`, `üç stəkan`, `dörd dost` and `beş alma`.

2026-05-05 AZ refinement pass: AZ was rechecked for native-style Azerbaijani learner-card quality. The pass removed the calqued demonstrative `ana o` from `那`, removed an unnatural comma in `O mənim müəllimimdir`, expanded the copula display for `是` to the full vowel-harmony set `-dır/-dir/-dur/-dür`, and changed `小姐` from bare `gənc qadın` to the more learner-facing `gənc xanım`.

2026-05-05 KA QA pass: after adding Georgian, the current 51 filled HSK1 languages include `KA`. KA was created as a Georgian-script no-article pack with no target-language romanization, Georgian citation/base word forms, no Latin or Cyrillic fallback in word/example cells, natural case/postposition examples such as `პეკინში`, `ჩინეთში`, `სკოლაში`, `ტაქსით`, `თვითმფრინავით`, `ჭიქაში`, `მაგიდაზე`, `მაგიდის ქვეშ`, `სკოლის წინ` and `რესტორნის უკან`, and learner-friendly count wording such as `რვა წიგნი`, `ერთი წიგნი`, `სამი ჭიქა`, `ოთხი მეგობარი` and `ხუთი ვაშლი`.

2026-05-05 KA refinement pass: KA was rechecked for native-style Georgian learner-card quality. The pass normalized child-role displays to natural Georgian `ვაჟიშვილი` / `ქალიშვილი`, repaired the feminine-pronoun example to `მოსწავლე გოგონაა`, and changed the `坐` transport example to use explicit `ვმგზავრობ` so the vehicle-riding sense stays visible without adding target-language transcription or articles.

2026-05-05 HY QA pass: after adding Armenian, the current 52 filled HSK1 languages include `HY`. HY was created as an Armenian-script no-article pack with no target-language romanization, Armenian citation/base word forms in word columns, natural definite suffixes and case/postposition forms in examples where Armenian requires them, location and motion examples such as `Պեկինում`, `Չինաստան եմ գնում`, `դպրոցում`, `դպրոց եմ գնում`, `սեղանի վրա`, `սեղանի տակ`, `դպրոցի դիմաց` and `ռեստորանի հետևում`, and learner-friendly count wording such as `ութ գիրք`, `մեկ գիրք`, `երեք բաժակ`, `չորս ընկեր` and `հինգ խնձոր`.

2026-05-05 HY refinement pass: HY was rechecked for native-style Armenian learner-card quality. The pass removed a definite form from the `点` word cell (`ժամը` -> `ժամ`) while keeping natural definite wording in the time example, changed `东西` away from ambiguous `իր` toward `բան; առարկա`, normalized the `分钟` duration example to `հինգ րոպե եմ սովորում`, and replaced the formal `Ինչպե՞ս ես կոչվում` with the more natural `Քեզ ինչպե՞ս են կոչում`.

2026-05-05 TR QA pass: after adding Turkish, the current 53 filled HSK1 languages include `TR`. TR was created as a native Turkish orthography no-article pack with no target-language romanization, Turkish base/citation forms in word columns, natural vowel-harmony suffixes and case/possessive forms in examples, location and motion examples such as `Pekin'de`, `Çin'e`, `okulda`, `okula`, `taksiyle`, `uçakla`, `bardakta`, `masanın üzerinde`, `masanın altında`, `okulun önünde` and `restoranın arkasında`, and learner-friendly count wording such as `sekiz kitap`, `bir kitap`, `üç bardak`, `dört arkadaş` and `beş elma`.

2026-05-05 TR refinement pass: TR was rechecked for native-style Turkish learner-card quality. The pass normalized the `呢` example to `Ya sen?`, changed date examples to normal Turkish numeric-date phrasing (`Bugün 1 Mart`, `Bugün 4 Mayıs`), made the `太` example preserve excessive degree with `fazla büyük`, expanded the copula display to `-dır/-dir/-dur/-dür`, and reduced calqued examples such as bare `Öğrenci az` and `Karakter yazıyorum`.

2026-05-05 SW QA pass: after adding Swahili, the current HSK1 workbook has all target-language columns filled. SW was created as a native Swahili no-article pack with no target-language transcription, Swahili noun class prefixes preserved in word cells, natural subject/object agreement and class agreement in examples, location and motion examples such as `shuleni`, `nyumbani`, `dukani`, `juu ya meza`, `chini ya meza`, `mbele ya shule`, `nyuma ya mgahawa`, `kwa teksi` and `kwa ndege`, and learner-friendly count wording such as `vitabu nane`, `kitabu kimoja`, `vikombe vitatu`, `marafiki wanne` and `matufaha matano`.

2026-05-05 SW refinement pass: SW was rechecked for native-style Swahili learner-card quality. The pass expanded selected word cells to expose useful noun-class agreement variants, changing `这` to `hii; hiki; hizi`, `小` to `ndogo; kidogo`, and `哪` to `gani; wapi; kwenda wapi`, while keeping example sentences in natural Swahili agreement.

2026-05-05 SW second refinement pass: SW was rechecked again for Swahili learner-card quality. The pass removed possessive forms from parent word cells (`baba yangu` / `mama yangu`), replaced over-literal Chinese grammar labels from `kiambishi` to `partikeli`, normalized measure-word labels to `kihesabio`, changed date examples to `tarehe 1 Machi` / `tarehe 4 Mei`, and made the `坐` transport example use `Ninasafiri kwenda Beijing kwa ndege` so the travel-by-vehicle sense remains visible.

HSK workbook first sheet includes buyer-facing `ZH`, `ZH transcription`, `ZH example` and `ZH example transcription` columns. Chinese is still source data, not a translation target: internal CSV/JSONL and DB imports must not create `ZH` / `example_ZH` target-language translation rows.

`example_EN` заполняется curated English example translation. `EN-GB` / `example_EN-GB` могут совпадать с `EN` или иметь региональные overrides в translation pack. Остальные `example_<LANG>` заполняются во время переводческого прохода по языкам.

Translation packs are stored as tab-separated source files:

```text
config/hsk-classic-hsk1-translations-*.tsv
```

Each pack starts with:

```text
simplified    <LANG>    example_<LANG>
```

Current filled packs:

| Pack | Languages | Coverage | Status |
| --- | --- | --- | --- |
| `config/hsk-classic-hsk1-translations-en-gb.tsv` | `EN-GB`, `example_EN-GB` | regional corrections for British English where it differs from `EN` | seeded, local linguistic QA pass, pending native-language QA |
| `config/hsk-classic-hsk1-translations-es.tsv` | `ES`, `example_ES`, `ES-419`, `example_ES-419` | 150 word translations + 150 example translations per language | seeded, local linguistic QA pass, pending native-language QA |
| `config/hsk-classic-hsk1-translations-fr-de-it-pt.tsv` | `FR`, `example_FR`, `DE`, `example_DE`, `IT`, `example_IT`, `PT`, `example_PT`, `PT-BR`, `example_PT-BR` | 150 word translations + 150 example translations per language | seeded, local linguistic QA pass, pending native-language QA |
| `config/hsk-classic-hsk1-translations-ja-ko-vi-th-ms-id.tsv` | `JA`, `example_JA`, `KO`, `example_KO`, `VI`, `example_VI`, `TH`, `example_TH`, `MS`, `example_MS`, `ID`, `example_ID` | 150 word translations + 150 example translations per language | seeded, local linguistic QA pass, pending native-language QA |
| `config/hsk-classic-hsk1-translations-pl-nl-sv-no.tsv` | `PL`, `example_PL`, `NL`, `example_NL`, `SV`, `example_SV`, `NO`, `example_NO` | 150 word translations + 150 example translations per language | seeded, local linguistic QA pass, pending native-language QA |
| `config/hsk-classic-hsk1-translations-da-fi-cs-sk.tsv` | `DA`, `example_DA`, `FI`, `example_FI`, `CS`, `example_CS`, `SK`, `example_SK` | 150 word translations + 150 example translations per language | seeded, local linguistic QA pass, pending native-language QA |
| `config/hsk-classic-hsk1-translations-ru.tsv` | `RU`, `example_RU` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, pending native-language QA |
| `config/hsk-classic-hsk1-translations-hu-ro-bg-hr.tsv` | `HU`, `example_HU`, `RO`, `example_RO`, `BG`, `example_BG`, `HR`, `example_HR` | 150 word translations + 150 example translations per language | seeded, local linguistic QA pass, pending native-language QA |
| `config/hsk-classic-hsk1-translations-sr-sl-lt-lv.tsv` | `SR`, `example_SR`, `SL`, `example_SL`, `LT`, `example_LT`, `LV`, `example_LV` | 150 word translations + 150 example translations per language | seeded, local linguistic QA pass, pending native-language QA |
| `config/hsk-classic-hsk1-translations-et.tsv` | `ET`, `example_ET` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, ET native-style QA pass |
| `config/hsk-classic-hsk1-translations-is.tsv` | `IS`, `example_IS` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, IS native-style QA pass |
| `config/hsk-classic-hsk1-translations-hi.tsv` | `HI`, `example_HI` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, HI native-style QA pass |
| `config/hsk-classic-hsk1-translations-bn.tsv` | `BN`, `example_BN` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, BN native-style QA pass |
| `config/hsk-classic-hsk1-translations-tl.tsv` | `TL`, `example_TL` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, TL native-style QA pass |
| `config/hsk-classic-hsk1-translations-my.tsv` | `MY`, `example_MY` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, MY native-style QA pass |
| `config/hsk-classic-hsk1-translations-km.tsv` | `KM`, `example_KM` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, KM native-style QA pass |
| `config/hsk-classic-hsk1-translations-lo.tsv` | `LO`, `example_LO` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, LO native-style QA pass |
| `config/hsk-classic-hsk1-translations-ne.tsv` | `NE`, `example_NE` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, NE native-style QA pass |
| `config/hsk-classic-hsk1-translations-si.tsv` | `SI`, `example_SI` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, SI native-style QA pass |
| `config/hsk-classic-hsk1-translations-ta.tsv` | `TA`, `example_TA` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, TA native-style QA pass |
| `config/hsk-classic-hsk1-translations-te.tsv` | `TE`, `example_TE` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, TE native-style QA pass |
| `config/hsk-classic-hsk1-translations-kn.tsv` | `KN`, `example_KN` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, KN native-style QA pass |
| `config/hsk-classic-hsk1-translations-ml.tsv` | `ML`, `example_ML` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, ML native-style QA pass |
| `config/hsk-classic-hsk1-translations-uz.tsv` | `UZ`, `example_UZ` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, UZ native-style QA pass |
| `config/hsk-classic-hsk1-translations-kk.tsv` | `KK`, `example_KK` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, KK native-style QA pass |
| `config/hsk-classic-hsk1-translations-az.tsv` | `AZ`, `example_AZ` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, AZ native-style QA pass |
| `config/hsk-classic-hsk1-translations-ka.tsv` | `KA`, `example_KA` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, KA native-style QA pass |
| `config/hsk-classic-hsk1-translations-hy.tsv` | `HY`, `example_HY` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, HY native-style QA pass |
| `config/hsk-classic-hsk1-translations-tr.tsv` | `TR`, `example_TR` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, TR native-style QA pass |
| `config/hsk-classic-hsk1-translations-sw.tsv` | `SW`, `example_SW` | 150 word translations + 150 example translations | seeded, local linguistic QA pass, SW native-style QA pass |

## Source Policy

Chinese base source for the first release:

```text
drkameleon/complete-hsk-vocabulary
wordlists/exclusive/old/1.json
license: MIT
```

Source role:

- HSK 2.0 classic level membership;
- POS;
- classifiers;
- English source dictionary meanings for audit/reference only.

Card-facing HSK fields must not blindly use the first dictionary meaning/form from the source. Some HSK words are homographs or have surname/variant/archaic dictionary entries before the learner-facing HSK sense. For HSK 1, curated card overrides are maintained in:

```text
config/hsk-classic-hsk1-card-overrides.json
```

These overrides are the source of truth for:

- learner-facing `EN` meanings and fallback `EN-GB` meanings unless a regional `EN-GB` translation pack override exists;
- card-facing `traditional` forms;
- card-facing word `pinyin`.

Curated Chinese examples and their pinyin are maintained in:

```text
config/hsk-classic-hsk1-examples.json
```

This file is the source of truth for:

- `example_zh`;
- `example_pinyin`;
- `example_EN`;
- fallback `example_EN-GB` unless a regional `EN-GB` translation pack override exists.

Per-language word/example translations are not edited directly in the generated workbook. They are sourced from translation pack files matching:

```text
config/hsk-classic-hsk1-translations-*.tsv
```

The source is reference/base data. Final translations into all learner languages still require language QA.

Raw dictionary source fields are not shown in the main card sheet because they can contain surname, variant, archaic or grammar-heavy dictionary senses. They are kept for audit in the separate workbook tab:

```text
Source Audit
```

## Translation Source Plan

Source confidence groups for HSK 1 classic:

| Group | Languages | Use |
| --- | --- | --- |
| Strong/open or structured | `EN`, `RU`, `ID` | Can seed or strongly compare values after license/source review. |
| Good web/app/deck reference | `ES`, `FR`, `DE`, `IT`, `PT`, `PT-BR`, `JA`, `KO`, `VI`, `TH` | Use for cross-checking and manual/source-assisted fill. |
| App/reference only | `HI`, `BN`, `TL`, `KM`, `MS`, `PL`, `NL`, `SV`, `NO`, `DA`, `FI`, `CS`, `SK`, `HU`, `RO`, `HR` | Use as reference only; no blind import. |
| Filled by LunaCards translation + QA | `BG`, `SR`, `SL`, `LT`, `LV`, `ET`, `IS`, `MY`, `LO`, `NE`, `SI`, `TA`, `TE`, `KN`, `ML`, `UZ`, `KK`, `AZ`, `KA`, `HY`, `TR`, `SW` | Already filled through controlled translation and local QA; keep these packs under the same source-backed review model for future refinements. |
| Needs LunaCards translation + QA | none for current HSK1 release | All 53 HSK1 target-language columns are filled; future levels should still fill through controlled translation and QA. |

## QA Gates

Before a HSK release workbook can be treated as final:

1. `row_count` must match the expected HSK list count.
2. `hsk_order` must be unique and sequential.
3. `simplified` and `pinyin` must be non-empty for every row.
4. `example_zh` and `example_pinyin` must be non-empty for every row.
5. The buyer-facing first sheet must start with `ZH`, `ZH transcription`, then exactly the 53 active HSK target-language word translation columns in `config/language-order.json` order, excluding `ZH` as a target language.
6. The buyer-facing first sheet must then include `ZH example`, `ZH example transcription`, and exactly the 53 active HSK target-language example translation columns as `<LANG> example` in the same language order.
7. Every language word translation cell must be non-empty except deliberate blocked/not-applicable decisions.
8. Every language example translation cell must be non-empty except deliberate blocked/not-applicable decisions.
9. Translation cells must be short vocabulary meanings or sentence translations, not grammar notes.
10. HSK 1 Chinese examples should avoid Han characters outside the HSK 1 source list unless a deliberate exception is documented.
11. Generated workbook translations must match their `config/hsk-classic-hsk1-translations-*.tsv` source pack values.
12. No target-language transcription, IPA, romanization or audio requirement is allowed in this HSK contract.
13. Word translation cells must follow the HSK word display/article policy above before a release is called final.

The first generated workbook is a working preparation file, not a final all-target-language HSK delivery.

2026-05-05 all-language native-style HSK1 audit: all 53 target languages were rechecked against the HSK1 Chinese scene, script policy, article policy, pinyin policy, English fallback warnings and high-risk rows for particles, deixis, pronouns, dates, locatives, `太`, `少`, `不` / `没`, `看` / `看见`, `听`, `会` / `能` and polite/phone formulas. The audit found one confirmed content correction: Hindi `example_HI` for `太` was changed from a plain "very big" reading to `यह कप बहुत ज़्यादा बड़ा है।` so the example preserves `This cup is too big.` / `这个杯子太大了。`. After rebuild, structure, article policy and HSK source audit all pass with 0 blockers.

## Build Command

The prepared first release is generated by:

```bash
node scripts/hsk/build-classic-hsk1-release.mjs
```

The script reads `config/hsk-classic-hsk1-card-overrides.json`, `config/hsk-classic-hsk1-examples.json`, and any `config/hsk-classic-hsk1-translations-*.tsv` packs, and also writes a source snapshot and license file under `outputs/hsk/source/` for auditability.

For a clean rebuild before the source snapshot exists, fetch `wordlists/exclusive/old/1.json` from the MIT-licensed source and pass it explicitly:

```bash
node scripts/hsk/build-classic-hsk1-release.mjs --source=/path/to/hsk_old_1.json
```

Validation:

```bash
node scripts/hsk/check-classic-hsk-release.mjs hsk2_classic_level_1_150_v1
```

Google Sheet readback after upload/update:

```bash
node scripts/hsk/check-classic-hsk-google-sheet-readback.mjs hsk2_classic_level_1_150_v1
```

This HSK-specific readback compares the uploaded native Google Sheet `HSK1 Classic` buyer-facing tab against the generated local workbook first sheet, then compares `Course Metadata` and updates `outputs/hsk/hsk2_classic_level_1_150_v1_delivery.json`. The internal CSV/JSONL contract remains technical and is not the buyer-facing first-sheet column order.

Article-language validation:

```bash
node scripts/hsk/check-classic-hsk-article-policy.mjs hsk2_classic_level_1_150_v1
```

This check is required after every HSK article-language edit. It audits filled article languages (`ES`, `ES-419`, `FR`, `DE`, `IT`, `PT`, `PT-BR`, `NL`, `SV`, `NO`, `DA`, `RO`) against the HSK word display/article policy and blocks noun-like HSK entries such as classifier/particle labels when a required article or gender-bearing marker is missing. It intentionally allows documented bare forms such as kinship words, prepositions, short phrases, plurals and mass nouns where an article would be unnatural.
