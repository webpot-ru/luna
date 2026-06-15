# Course Source-Assisted Generation

Этот документ является source of truth по использованию локальных словарей, корпусов, open-source источников и optional MT sanity в будущих LunaCards course/release контурах.

Он не заменяет:

- [Reference Sources](reference-sources.md) - какие источники скачаны, зарегистрированы, индексируются и как работают adapters;
- [Rare Language Source Hunt](rare-language-source-hunt.md) - какие weak-source language leads найдены, но еще не активированы как manifest/cache source;
- [QA Process](qa-process.md) - какие проверки блокируют import/export;
- [Content Build Plan](content-build-plan.md) - как создаются обычные thematic decks;
- [Data Delivery Pipeline](data-delivery-pipeline.md) - как данные проходят до Google Sheets;
- [HSK Classic Release Plan](hsk-classic-release-plan.md) - отдельный контракт HSK workbook.

Этот документ отвечает на другой вопрос: как будущим курсам и отдельным release-линейкам правильно пользоваться уже скачанными источниками, чтобы они не лежали мертвым грузом и не превращались в ложную "правду".

## Core Rule

Истина в LunaCards - это не словарь и не Google Translate.

Истина для обычной колоды:

```text
set_id
meaning_id
canonical_english
meaning_note
semantic_scene
deck_profile / risk_flags
language-specific rules
transcription policy
QA evidence hash
```

Истина для course/exam release:

```text
release_id
course/exam source list
source_language item
course contract
row_id / source item id
meaning note / target sense
canonical example scene
language-specific rules
release QA evidence
```

External sources are candidate/reference evidence only. A dictionary, corpus, PanLex row, OPUS/Tatoeba sentence, Wikidata label, Hunspell hit or MT suggestion can:

- suggest candidate translations;
- expose fallback or wrong-script rows;
- show possible collocations;
- help repair examples;
- create an actionable warning when combined with a rule/profile risk.

It cannot automatically approve a row by itself.

## Mandatory Translation-Memory First Path

For every future LunaCards deck, course release or exam release, the default path is:

```text
existing LunaCards truth / approved artifacts as translation memory
-> strict reuse map
-> scene-specific generation only for gaps
-> deterministic/source QA gates
-> final workbook/export
-> Google Sheet readback
-> sample audit
```

A release may skip the translation-memory-first step only when its source-of-truth contract records why existing LunaCards data cannot be safely matched.

The reuse map is read-only by default. It may read current DB rows, current release artifacts, prior final workbooks, approved source packages and contract files as translation memory, but it must not write to ordinary Postgres tables, isolated course/Oxford/HSK tables, Google Sheets or final workbooks unless the user explicitly approves that release step.

Strict reuse identity must include the relevant contour and meaning fields:

```text
source contour / release or deck family
source item id or meaning_id
canonical source form
canonical English or pivot form when used
part_of_speech
meaning_note / target sense
semantic_scene or canonical example scene
language code mapped through config/language-order.json dbCode when needed
current value hash or artifact checksum when available
```

Reuse classes:

| Class | Meaning | Allowed use |
| --- | --- | --- |
| `display_reuse_allowed` | Exact sense/POS/current-value match for the target language display value. | May seed the display/translation draft for that language. |
| `example_reuse_allowed` | Exact source scene and target example scene are equivalent and documented. | May seed the example draft. This is intentionally rare. |
| `review_candidate` | Useful prior value exists, but the sense, POS, source contour, regional form or scene is not strict enough. | Review or repair input only. |
| `blocked_reuse` | No exact match, stale evidence, missing QA hash, ambiguous sense, code mismatch, source-contour mismatch or scene drift. | Must not be copied into the new release. |

Old examples must not be copied just because the word/display translation matches. Example reuse is allowed only when scene equivalence is proven. If the new release has its own source-side examples or canonical scenes, prior ordinary-deck examples are normally `blocked_reuse` or `review_candidate`, not final content.

Existing DB/cache/output reuse is an accelerator, not source truth and not approval. Gaps after reuse must be generated or repaired for the current release scene. The structured/local generation path is the default for ordinary support-language drafting; Gemini or another live model is reviewer/repair-only unless the user explicitly approves a bounded generation chunk and the quota/cost risk is stated.

Final delivery requires the release-specific gates plus:

- reuse-map report registered in the release contract or QA report;
- no claimed safe example reuse without scene-equivalence proof;
- no spreadsheet-language-code / DB-language-code mismatch such as `NO` spreadsheet output vs `NB` DB storage;
- final workbook/export readback;
- Google Sheet readback when the release is published to Sheets;
- sample audit covering at least five rows per target language when requested by the release workflow, including translation/display, example native adequacy, source transcription/pronunciation fields in scope and source example fields in scope.

## Current Source Layer

Raw downloads live under ignored:

```text
reference-sources/raw/
```

Rebuildable indexes live under ignored:

```text
reference-sources/cache/
```

Tracked registry/config files:

```text
reference-sources/sources.manifest.json
reference-sources/bulk-source-groups.json
reference-sources/optional-tool-source-targets.json
reference-sources/manual-decisions/source-preflight-warning-decisions.jsonl
config/transcription-source-policy.json
config/translation-source-policy.json
config/transcription-style-profiles.json
```

Active source families and their role:

| Source family | Current role | Approval rule |
| --- | --- | --- |
| Kaikki/Wiktionary | lexical forms, glosses, pronunciations where available | `source_partial` unless sense/current value is separately locked |
| DBnary | EN->target translation candidates from local RDF archive | `source_partial`; can be noisy and phrase-heavy |
| FreeDict/Apertium | bilingual dictionary candidates for configured pairs | `source_partial`; useful for repair, not final truth |
| PanLex vocabulary / PanLex meanings | broad multilingual vocabulary and EN-pivot meaning candidates | `source_partial`; useful coverage, uneven/noisy sense matching |
| NIKL Korean Basic Dictionary | stronger KO learner-dictionary candidates | `source_partial`; official dictionary signal, not automatic approval |
| NECTEC LEXiTRON | stronger TH dictionary candidates | `source_partial`; licence restriction note required |
| Sinhala dictionary, UzWordnet, Myanmar mcfnlp, Darsala EN-KA | weak-language dictionary support | `source_partial`; language-specific sanity only |
| Tatoeba / OPUS / ALT / weak example corpora | example and collocation hints | never word-translation truth |
| Wikidata / Concepticon / CLICS / NorthEuraLex | concept and semantic-neighbor sanity | concept support only, not a translation decision |
| Hunspell / LibreOffice dictionaries | spelling, script and diacritic sanity | spelling signal only |
| UniMorph | morphology hints for number, gender, case and forms | blocks only source-proven/current-field mismatches |
| Epitran / IPA dictionaries / pronunciation caches | pronunciation and IPA candidate support for policy languages | source-assisted pronunciation evidence only |
| Dakshina | South Asian romanization sanity | sanity only; does not override ISO 15919 policy |
| OpenPhonemizer | installed/detected, inactive in v1 | no candidate generation during import |
| Google Translate / external MT | optional sanity field if supplied | never truth; disagreement alone does not block |

The executable smoke check for this layer is:

```bash
node scripts/check-bulk-reference-source-smoke.mjs
```

The executable pre-import gate for ordinary language batches is:

```bash
node scripts/check-language-batch-source-preflight.mjs <batch.jsonl|csv>
```

## Ordinary Thematic Decks

Ordinary LunaCards decks currently use English as the canonical base.

Required creation route:

```text
Deck Master Plan
-> deck spec
-> candidate pool with selected/backup/excluded decisions
-> approved_for_generation
-> runner prepare
-> base import
-> language draft JSONL
-> source preflight
-> repair draft
-> hash-guarded import
-> QA evidence
-> final export
-> Google Sheet upload/readback
-> post-final audit
-> delivery freshness
-> runner complete
```

The prompt is not the controller. The controller is:

```bash
node scripts/run-deck-production.mjs <Sort|set_id> --stage=<stage> --execute
```

For ordinary decks, source preflight uses English meaning data and the current deck profile to produce:

- `translation_candidates`;
- `strong_dictionary_candidates`;
- `official_dictionary_candidates`;
- `panlex_candidates`;
- `example_scene_candidates`;
- `example_collocation_candidates`;
- `concept_sanity`;
- `spelling_sanity`;
- `external_mt_sanity`;
- `scene_slot_proof`;
- `compound_whole_meaning`;
- `hard_blockers`;
- `actionable_warnings`.

For profile-risk or weak-source languages, generation should default to one language per batch. The current weak-source list is:

```text
KO, VI, TH, MS, SK, SL, LV, ET, IS, BN, TL, MY, KM, LO, NE, SI,
TA, TE, KN, ML, UZ, KK, AZ, KA, HY
```

## HSK / Chinese-Source Courses

HSK is not an English-canonical deck. The source item is Chinese.

Current source of truth:

```text
docs/hsk-classic-release-plan.md
config/hsk-classic-release-contract-v1.json
```

For HSK:

- `simplified`, `traditional`, `pinyin`, `example_zh` and `example_pinyin` are source-side fields;
- target language columns contain short translations of the Chinese word;
- `example_<LANG>` columns translate the Chinese example;
- target-language transcription, IPA, romanization and audio are out of scope in v1;
- pinyin is required only for Chinese word/example.

The ordinary deck preflight cannot be copied blindly to HSK because it assumes English canonical scenes. For HSK, English can be used as a pivot/sanity signal, but not as the truth over Chinese.

HSK source-assisted checking should use this logic:

```text
Chinese HSK item
-> Chinese meaning / example scene
-> EN gloss as pivot candidate only
-> target-language translation candidates
-> target example scene preservation
-> article/display policy
-> HSK workbook contract
```

Current HSK scripts validate workbook structure and article policy:

```bash
node scripts/hsk/check-classic-hsk-release.mjs hsk2_classic_level_1_150_v1
node scripts/hsk/check-classic-hsk-article-policy.mjs hsk2_classic_level_1_150_v1
```

Current gap: HSK still needs its own source-assisted audit script that reads the HSK release JSONL/TSV packs and reports source candidates, example-scene drift and weak-language warnings without requiring ordinary deck transcriptions.

Do not add target-language transcription columns to HSK unless the HSK contract changes explicitly.

## Future Language Courses

Future language courses may have a source language other than English or Chinese. Examples:

- Japanese course for Russian speakers;
- Korean course for English speakers;
- English course for Thai speakers;
- bilingual phrase/vocabulary course between any two LunaCards languages.

Each course must define a course contract before generation:

```text
course_id
source_language_code
target_language_codes
source item id
canonical source form
canonical target sense
meaning note
example scene
output columns
transcription/pronunciation scope
QA status fields
delivery format
```

Rules:

- Do not assume English is the truth unless the course contract says so.
- Do not assume the learner's language is the target side for all rows; LunaCards pairs can be arbitrary.
- Use English pivot only as triangulation when direct source->target evidence is weak.
- Preserve the canonical scene, not the exact word order.
- If a target language cannot express the source sentence naturally, use the closest simple natural scene and record why.

For non-English source courses, source candidates should be triangulated:

```text
source-language item
-> course meaning note
-> source example scene
-> optional EN pivot
-> target dictionary/corpus candidates
-> target example scene proof
```

## Example Policy

Examples should be simple on purpose.

Preferred example shape:

```text
one target word/form
one concrete object/action/state
one location or context only when useful
short present/simple tense where possible
no unnecessary subordinate clauses
no avoidable plural/case/classifier traps
```

This is not because natural language is simple, but because LunaCards examples must work across 54 languages and arbitrary language pairs.

The English or source-side example is the canonical scene, not a loose suggestion. Target examples may be adapted, but they must preserve:

- target word/form;
- object or referent;
- action/state;
- location/context if present;
- number/quantity if present;
- tense/aspect/usage at the simple functional level.

Known forbidden pattern:

```text
EN: Zero apples are in the basket.
Targets: Number: zero.
```

Even if all target languages agree with each other, this is wrong because they drifted away from the canonical source scene.

## Compound And Multiword Entries

Compound or multiword entries need whole-meaning checking.

The draft must not translate the pieces literally when the `meaning_note` defines a single lexical item. Examples:

```text
cutting board
bottle opener
washing machine
credit card
phone number
good morning
```

Preflight should treat suspected component-by-component translation as an actionable warning or blocker when:

- the deck profile is high risk;
- a dictionary/source candidate supports a different whole expression;
- the example scene shows the draft meaning is wrong;
- the row has a known false-friend or register risk.

## Transcription Scope

For ordinary LunaCards decks, `transcription` belongs to the main card word/display form only.

It does not transcribe full examples in v1.

Reason:

- example transcription for 54 languages would multiply QA risk and spreadsheet width;
- many languages already use native orthography as display/transcription;
- for tone/romanization languages, example-level transcription would require another full source and audit layer.

For HSK, pinyin is required for Chinese word/example because the learner is studying Chinese. Target-language transcriptions are still out of scope.

Tone languages must use the format in [Language Transcription Policy](language-transcription-policy.md). Chinese pinyin uses tone marks, not tone numbers. Vietnamese keeps native tone marks. Thai/Lao/Burmese use the project learner romanization policy where tone/register notation is required.

## External MT Sanity

Google Translate, DeepL, Amazon Translate, NLLB or other MT can be used only as optional sanity signal.

Allowed:

- compare draft value with MT suggestion;
- record agreement/disagreement in `external_mt_sanity`;
- use disagreement as triage signal;
- combine MT disagreement with source conflict/no dictionary support to create an actionable warning for weak languages.

Not allowed:

- use MT as final source truth;
- auto-replace a row from MT;
- approve a row because MT agrees;
- block a normal row only because MT disagrees.

## Review Decisions

Manual/source warning decisions must be current-value locked.

A decision becomes stale if any of these change:

```text
set_id / release_id
language_code
native_word / display value
example
transcription
meaning_id / source row id
meaning_note / course sense
semantic scene
```

Do not pre-fill empty allowlists. A decision exists only after a concrete warning/source conflict has been reviewed.

## Required Gates By Contour

Ordinary deck:

```bash
node scripts/check-deck-specs.mjs
node scripts/check-deck-candidate-pool.mjs <set_id>
node scripts/check-deck-ready.mjs <set_id>
node scripts/run-deck-production.mjs <set_id> --stage=prepare --execute
node scripts/check-language-batch-source-preflight.mjs <draft.jsonl>
node scripts/import-language-batch.mjs <draft.jsonl> --expected-preflight-report=<report.json>
bash scripts/db-qa-set.sh <set_id>
node scripts/check-qa-evidence.mjs <set_id>
node scripts/export-flashcards-working-sheet.mjs <set_id> --final
node scripts/check-google-sheet-readback.mjs <set_id>
node scripts/run-final-linguistic-audit.mjs <set_id>
node scripts/check-delivery-freshness.mjs <set_id>
```

HSK current release:

```bash
node scripts/hsk/build-classic-hsk1-release.mjs
node scripts/hsk/check-classic-hsk-release.mjs hsk2_classic_level_1_150_v1
node scripts/hsk/check-classic-hsk-article-policy.mjs hsk2_classic_level_1_150_v1
node scripts/hsk/check-classic-hsk-google-sheet-readback.mjs hsk2_classic_level_1_150_v1
```

Source layer health:

```bash
node scripts/check-reference-sources-cache.mjs --verify-hashes --strict-cache
node scripts/check-bulk-reference-source-smoke.mjs
node scripts/check-transcription-source-policy.mjs
node scripts/check-translation-source-policy.mjs
node scripts/check-source-preflight-warning-decisions.mjs
```

## Current Status As Of 2026-05-05

Current active post-reset ordinary decks:

| Set | Cards | Language rows | Status |
| --- | ---: | ---: | --- |
| `home_kitchen_cookware_pilot_01` | 50 | 2700 | delivered/readback/freshness passed |
| `home_kitchen_cooking_actions_a1_a2` | 25 | 1350 | delivered/readback/freshness passed |

Latest all-language current-row source preflight audit for these two decks:

```text
reports: 108
rows: 4050
blockers: 0
actionable warnings: 0
summary: outputs/qa/current_db_all_language_preflight_audit_summary_20260505_final.json
```

This proves the currently downloaded and indexed source layer is active in the ordinary deck preflight path. It does not prove native-level correctness and does not automatically cover HSK/source-language courses.

Current HSK release contour:

```text
release_id: hsk2_classic_level_1_150_v1
row_count: 150
source: classic HSK 2.0 level 1
contract: config/hsk-classic-release-contract-v1.json
source of truth: docs/hsk-classic-release-plan.md
```

Current known gaps:

- HSK needs a source-assisted audit script tailored to Chinese-source rows.
- Future non-English courses need their own course contracts before generation.
- Weak languages can be improved with source candidates, but 90-95% confidence requires native/linguist review for disagreement rows.
- Some heavy source checks can require more Node heap, for example `NODE_OPTIONS=--max-old-space-size=8192`.

## Do Not

- Do not use Google Translate as truth.
- Do not import a language batch without preflight.
- Do not treat a source archive as useful until it has an index/adapter and appears in preflight reports.
- Do not use ordinary deck rules blindly for HSK or non-English-source courses.
- Do not add target-language example transcription unless a course contract explicitly requires it.
- Do not allow target examples to agree with each other while drifting from the source/canonical scene.
- Do not approve non-RU generated rows as native-approved without a separate native review lane.
