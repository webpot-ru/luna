# Reference Sources

This document is the source of truth for local third-party lexical/reference sources used by LunaCards QA.

External sources are candidate/reference material. They do not replace LunaCards deck specs, `meaning_id`, `meaning_note`, `semantic_scene`, language-specific rules, transcription policy or structured QA evidence.

For future course/release contours where the source language may be Chinese, Japanese, Korean, Russian or any other LunaCards language rather than English, use [Course Source-Assisted Generation](course-source-assisted-generation.md) as the source of truth for how these same dictionaries, corpora, indexes and optional MT sanity signals are applied. This document owns source inventory and adapter behavior; the course-source document owns pivot/source-language rules.

For additional weak-source language leads that are not yet downloaded, registered or indexed, use [Rare Language Source Hunt](rare-language-source-hunt.md). That document is a research backlog only; it does not activate a source or change source confidence by itself.

## Local Cache

The local cache lives in:

```text
reference-sources/
```

Tracked files:

- `reference-sources/README.md`
- `reference-sources/sources.manifest.json`
- `reference-sources/optional-tool-source-targets.json`
- `reference-sources/tool-runtime-requirements.txt`
- current-value-locked manual/source decision registries under `reference-sources/manual-decisions/`

Ignored local cache:

- `reference-sources/raw/`
- `reference-sources/cache/`

The raw cache is intentionally not committed because it contains third-party dumps and can be refreshed from URLs in the manifest. Derived local indexes under `reference-sources/cache/` are also intentionally not committed; rebuild them from the tracked manifest and raw files when needed.

Machine-readable transcription source policy:

```text
config/transcription-source-policy.json
```

The policy has exactly one row per active DB language code and records the source ids that can support that language's final `transcription` evidence. `scripts/lib/transcription-source-policy.mjs` validates that all 54 active language variants have configured source ids and that every configured source id exists in `reference-sources/sources.manifest.json`.

Machine-readable translation source policy:

```text
config/translation-source-policy.json
```

This policy also has exactly one row per active DB language code. It separates entry-translation evidence from pronunciation/transcription evidence. Translation source coverage v1 is intentionally strict on obvious failures, but not strict enough to require exact dictionary proof for every row in all 54 languages: `source_exact` and `loan_decision` are final-ready, `conflict` and stale decisions are blockers, and uneven `source_partial`/`no_source` dictionary coverage is report-only unless the row is English-looking fallback, a known false friend or a source conflict. `scripts/check-translation-source-policy.mjs` validates the matrix and source ids.

Translation source priority is: curated/official bilingual dictionary, language-specific dictionary, Kaikki/Wiktionary structured data, FreeDict/DBnary, PanLex/OMW as supporting evidence, and Tatoeba only for examples/collocations. AI output is never final translation source truth by itself.

Source-backed confidence semantics:

| Confidence | Final-ready | Meaning |
| --- | --- | --- |
| `deterministic` | yes | The value can be checked from the current display/native form under the fixed project policy, for example native-copy languages or deterministic transliteration families. |
| `source_exact` | yes | The value passed policy shape and, for strict high-risk lookup languages, matched an exact local source headword romanization candidate, a delimiter-only normalized candidate, the `HY` CLDR BGN-style compiler, or a current-value-locked manual/component source decision. For non-strict source-lookup languages this still means the configured source family is available and the policy shape passed. |
| `source_partial` | no | A source/tool can help, but the current value still needs review, usually because the source is incomplete or the pronunciation evidence is weak. |
| `conflict` | no | The current value violates policy shape, pseudo-IPA/tone/fallback checks, or source-backed checks conflict. |
| `no_source` | no | No configured source family is available; final export must fail closed instead of guessing. |

Source priority is: official standard, curated dictionary, Wiktionary/Kaikki, DBnary/FreeDict, tool output, AI suggestion. AI suggestions are never final source evidence by themselves. `@gemini-tools` belongs to the AI-assisted QA/review layer documented in [QA Process](qa-process.md), not to lexical source truth. Gemini output can help identify issues or produce structured review evidence after import, but it is not a dictionary/source adapter and cannot turn `source_partial` into `source_exact`.

Translation source decisions use the same evidence principle as transcription decisions: sources are evidence, not automatic truth. A source-attested loanword can pass only when it is learner-friendly for the target language, matches the current `meaning_id`/`meaning_note`, and is locked to the exact current DB value.

## Tool-Source Layer

The manifest can also register optional tool adapters. These entries use `kind=tool_adapter` or `kind=deferred_tool_adapter` instead of `local_path`/`sha256` raw-file fields. Tool adapters are source-candidate generators, not final evidence by themselves.

Current optional adapters:

| Source id | Role | Final evidence rule |
| --- | --- | --- |
| `tool-epitran-g2p` | Optional Epitran IPA/G2P candidate generation. | Tool-only output is `source_partial`; it cannot write `source_exact` without dictionary/standard/manual backing. Pre-import use is policy-gated to source-lookup phonetic/IPA languages only, so copy-display or deterministic-transliteration languages do not get false Epitran mismatch warnings. |
| `tool-unimorph-morphology` | Optional UniMorph morphology checks for number/gender/case/form risks. | Blocks only when the row provides or local source lookup proves a concrete mismatch; missing local data is a warning. The adapter reads local TSV-style UniMorph tables under ignored `reference-sources/raw/unimorph/` when present. |
| `tool-apertium-dictionaries` | Optional Apertium bilingual dictionary candidate support. | Pair data is `source_partial` unless a per-pair licence/source decision promotes exact current value through the normal decision flow. The adapter reads local JSONL/TSV/CSV extracts under ignored `reference-sources/raw/apertium/` when present. |
| `official-nikl-korean-basic-dictionary` | Optional NIKL Korean Basic Dictionary / Korean-English Learners' Dictionary candidate support. | Strong `KO` dictionary signal when local cache/API-derived rows are available. Output remains `source_partial`; API/redistribution terms must be respected before packaging derived data. |
| `official-lexitron-thai-2` | Optional NECTEC LEXiTRON 2.0 Thai candidate support. | Strong `TH` dictionary signal when local cache rows are available. Licence restrictions must be recorded; restricted/NC data remains internal sanity only. |
| `sealang-dictionary-reference` | Optional SEAlang lookup/reference support for `TH`, `LO`, `MY` and `KM`. | Reference-only dictionary sanity unless source terms permit stronger use. It can create source candidates and review warnings, not final approval. |
| `ekilex-et-api-deferred` | Deferred Sõnaveeb/Ekilex Estonian source. | Useful `ET` dictionary/morphology candidate source, but API/download access needs key/account and terms review before it can enter production lookup. |
| `tool-pyiwn-indowordnet` | Deferred pyiwn / IndoWordNet concept source for Indic languages. | MIT Python package path; activate only after local runtime/export is pinned. IndoWordNet output is concept/sense sanity, not final translation approval. |
| `myordbok-my-github-deferred` | Deferred MyOrdbok GitHub source. | Repository is MIT, but inspected tracked assets look like mock DB files rather than clean dictionary data; not active until real data shape is verified. |
| `kazparc-kk-en-all-entries-deferred` | Deferred KazParC KK-EN corpus. | Useful for `KK` examples/collocations, but Hugging Face access returned gated `401` without authentication on 2026-05-07. Not active until HF access or an ungated mirror exists. |
| `tool-indictrans2-mt-sanity` | Optional IndicTrans2 local MT sanity signal for South Asian languages. | MT output is disagreement/triangulation signal only; it cannot approve translations and does not count as dictionary truth. |
| `dakshina-transliteration-dataset` | Optional Dakshina transliteration dataset. | Romanization/transliteration sanity for South Asian scripts; not entry-translation evidence and not a replacement for the project ISO 15919 policy. |
| `tool-external-mt-sanity` | Optional external MT sanity layer, including Google/DeepL/Amazon/NLLB-style suggestions when explicitly supplied/configured. | Report-only signal. MT disagreement alone is not a blocker, but on weak languages it becomes actionable when there is no strong dictionary candidate for the same row. |
| `freedict-database-index` | Targeted FreeDict bilingual dictionary candidate support. | The index is tracked as a source; targeted EN->target archives are optional ignored downloads. FreeDict candidates are `source_partial` until sense, licence and current value are reviewed. |
| `dbnary-en-20251001` | Parsed English-edition DBnary translation candidate support. | The pre-import adapter streams the local English DBnary archive and can emit EN->target candidates for DBnary-covered languages. These candidates remain `source_partial` because DBnary does not prove the LunaCards `meaning_id` sense by itself. |
| `tool-openphonemizer` | Optional permissive IPA candidate adapter if installed locally. | Installed/detected only in the current v1 preflight. It does not generate candidates or trigger model downloads during import. |
| `tool-phonemizer-espeak-ng-deferred` | Deferred phonemizer/eSpeak NG sanity tool. | Not a required dependency because of GPL/runtime risk; needs a separate decision before enforcement. |

2026-05-03 weak-language source uplift status:

| Source | Raw cache status | Active preflight use | Limit |
| --- | --- | --- | --- |
| NIKL Korean Basic Dictionary full JSON 20260419 | Downloaded as `reference-sources/raw/official-dictionaries/nikl/korean-basic-dictionary-json-20260419.zip` and registered in the manifest. | `KO` official dictionary candidates. Lookup matches exact English `Equivalent.lemma` values and returns Korean lemmas as `source_partial`. | English definitions are not used as match keys because they create false positives; NIKL does not prove the LunaCards sense by itself. |
| NECTEC LEXiTRON 2.0 | Downloaded as `etlex-utf8.csv`, `telex-utf8.csv` and `lexitron_2.0_csv.zip` under `reference-sources/raw/official-dictionaries/lexitron/`. | `TH` official dictionary candidates from exact English-to-Thai `etlex` rows as `source_partial`. | CKAN reports "License not specified"; keep it as internal sanity/source candidate only until terms are reviewed. |
| Dakshina v1.0 | Downloaded as `reference-sources/raw/dakshina/dakshina_dataset_v1.0.tar` and registered in the manifest. | Romanization sanity candidates for `BN`, `HI`, `KN`, `ML`, `SI`, `TA` and `TE` by exact native-form lookup in the lexicon TSV files. | Dakshina romanizations are attested Latin forms, not LunaCards ISO 15919 truth; they should not create mismatch blockers by themselves. |
| Hugging Face `lbourdois/panlex` vocabulary | Downloaded as `reference-sources/raw/panlex-hf/lbourdois-panlex/panlex.csv`, registered in the manifest and indexed to `reference-sources/cache/bulk-source-indexes/panlex_candidates.jsonl`. | Native vocabulary/display-form sanity for all 54 LunaCards language variants. | This dataset lists attested vocabulary forms; it is not a translation-pair graph and cannot prove `canonical_english -> target` meaning. |
| Hugging Face `cointegrated/panlex-meanings` TSV subset | Downloaded as 54 active PanLex code TSV files under `reference-sources/raw/panlex-meanings-hf/data/`, registered in the manifest as `panlex-meanings-hf-20240301`, and indexed to `reference-sources/cache/bulk-source-indexes/panlex_meanings_candidates.jsonl`. | PanLex meaning-id EN pivot candidates for all 54 LunaCards language variants. The index uses simple lowercase English forms and emits `panlex_meaning` `source_partial` translation candidates before import. | PanLex meanings still do not prove the LunaCards sense by themselves. Coverage is uneven by language and row, and candidates can be noisy or missing; use as triangulation/repair evidence only. |

2026-05-05 weak-language source uplift status:

| Source | Raw cache status | Active preflight use | Limit |
| --- | --- | --- | --- |
| Sinhala-English Parallel Word Dictionary filtered V2 | Downloaded as `reference-sources/raw/official-dictionaries/sinhala-para-dict/En-Si-dict-filtered-V2.tsv` and registered in the manifest. | `SI` EN->Sinhala `sinhala_para_dict` translation candidates through `weak_dictionary_candidates.jsonl`. | Candidate-only; sense still must match LunaCards `meaning_id`. |
| UzWordnet JSON 1.0 | Downloaded as `reference-sources/raw/official-dictionaries/uzwordnet/uzwordnet.json` and registered in the manifest. | `UZ` lemma/display-form and concept sanity candidates through `weak_dictionary_candidates.jsonl`. | UzWordnet is WordNet-derived Uzbek lexical data; it is not direct EN->UZ translation proof. |
| English-Myanmar mcfnlp dictionary parquet | Downloaded as `reference-sources/raw/official-dictionaries/myanmar-mcfnlp/train-00000-of-00001.parquet` and registered in the manifest. | `MY` English->Myanmar `myanmar_mcfnlp_dict` dictionary sanity candidates through `weak_dictionary_candidates.jsonl`. | HF metadata does not declare a clean licence; keep as internal source-partial sanity until terms are reviewed. |
| Darsala English-Georgian lexicon parquet | Downloaded as `reference-sources/raw/hf-corpora/darsala-english-georgian/lexicon.parquet` and registered in the manifest. | `KA` `darsala_en_ka_lexicon` dictionary and example/collocation candidates through weak indexes. | MIT metadata, but source/sense still needs review; no automatic approval. |
| ALT Parallel Corpus 20191206 | Downloaded as `reference-sources/raw/hf-corpora/alt/ALT-Parallel-Corpus-20191206.zip` and registered in the manifest. | `alt_parallel` example/collocation hints for `BN`, `TL`, `HI`, `ID`, `JA`, `KM`, `LO`, `MS`, `MY`, `TH`, `VI` and `ZH`. | Corpus matches are scene/collocation hints only; they do not prove word translation. |

2026-05-07 weak-language source uplift v2 status:

| Source | Raw cache status | Active preflight use | Limit |
| --- | --- | --- | --- |
| Alar Kannada-English | Downloaded as `reference-sources/raw/official-dictionaries/alar-kn/alar.yml`, 41,209,928 bytes, and registered in the manifest. | `KN` `alar_kn` dictionary candidates through `weak_dictionary_candidates.jsonl`; exact current-value matches count as strong source support for resolver priority, still `source_partial` in preflight. | OdBL source; definitions can be broad, so sense still must match LunaCards `meaning_id`. |
| Tēzaurs.lv 2020 | Downloaded as `reference-sources/raw/official-dictionaries/tezaurs-lv/tezaurs.zip`, 15,056,412 bytes, and registered in the manifest. | `LV` `tezaurs_lv` lemma/display-form sanity through `weak_dictionary_candidates.jsonl`; exact current-value matches count as strong source support for resolver priority. | Latvian monolingual dictionary/morphology source, not direct EN->LV proof. |
| Slovak WordNet 2013-01-23 | Downloaded as `reference-sources/raw/official-dictionaries/slovak-wordnet/sk-wn-2013-01-23.txt.gz`, 2,378,451 bytes, and registered in the manifest. | `SK` `slovak_wordnet` EN-linked WordNet/sense candidates through `weak_dictionary_candidates.jsonl`. | WordNet sense sanity only; corpus/WordNet hit alone cannot approve a row. |
| Sloleks 3.0 | Downloaded as `reference-sources/raw/official-dictionaries/sloleks/Sloleks.3.0.zip`, 251,391,521 bytes, and registered in the manifest. | `SL` `sloleks_sl` morphology/spelling/display-form hints through `weak_dictionary_candidates.jsonl`. | Morphology/spelling source only, not word-translation proof. |
| Sõnaveeb/Ekilex ET | Registered as `deferred_requires_key`. | Not active. | Needs API/download key/account and terms review before local indexing. |
| pyiwn / IndoWordNet | Registered as `deferred_requires_runtime`. | Not active. | Needs pinned local runtime/export before use. |
| MyOrdbok MY | Registered as `deferred_review`. | Not active. | Inspected GitHub assets looked like mock DBs, not clean dictionary data. |
| KazParC KK-EN | Registered as `deferred_requires_key`. | Not active. | HF dataset is gated; no local corpus index until access/mirror exists. |

2026-06-02 Azerbaijani weak-example source activation:

| Source | Raw cache status | Active preflight use | Limit |
| --- | --- | --- | --- |
| LocalDoc Azerbaijani-English parallel corpus, size-balanced split | Downloaded as `reference-sources/raw/hf-corpora/localdoc-azerbaijani-english-size-balanced/train-00000-of-00001.parquet` and registered in the manifest. | `AZ` `localdoc_az_en_size_balanced` example/collocation candidates through `weak_example_collocations.jsonl`. The 2026-06-02 rebuild wrote 508,071 weak-example rows total, including 121,448 `AZ` rows from this source. | CC-BY-4.0 Hugging Face metadata. This is corpus/example sanity only: it does not prove word translations, does not create `source_exact`, and does not repair HSK6 rows by itself. |

2026-06-02 Swahili weak-dictionary source activation:

| Source | Raw cache status | Active preflight use | Limit |
| --- | --- | --- | --- |
| Kalebu/kamusi Swahili dictionary CSV | Downloaded as `reference-sources/raw/official-dictionaries/kalebu-kamusi/words.csv` and registered in the manifest. | `SW` `kalebu_kamusi_sw` native lexicon/display-form candidates through `weak_dictionary_candidates.jsonl`. The 2026-06-02 rebuild wrote 929,819 weak-dictionary rows total, including 14,721 `SW` rows from this source. | MIT GitHub repo, but data is scraped from `kamusi.appsmata.com`; use as `source_partial` native lexicon sanity only. It is monolingual Swahili, not EN->SW translation truth, and cannot create `source_exact` without row-level sense review. |

2026-06-02 additional useful weak-source activations:

| Source | Raw cache status | Active preflight use | Limit |
| --- | --- | --- | --- |
| Zenodo Kazakh-English parallel corpora v1 | Downloaded as `reference-sources/raw/hf-corpora/kk-en-corpora/kk_en_corpora-v1.zip` and registered in the manifest as `kk-en-corpora-zenodo-v1`. | `KK` `kk_en_corpora_zenodo` example/collocation candidates through `weak_example_collocations.jsonl`. The 2026-06-02 full rebuild wrote 834,621 weak-example rows total, including 326,550 `KK` rows from this source. | Zenodo marks the record `other-open` and the GitHub archive carries a GPL-family license file. Use as corpus/example sanity only: it does not prove word translations and cannot create `source_exact`. |
| Hugging Face `seanghay/lexicon-kh` | Downloaded as `reference-sources/raw/official-dictionaries/seanghay-lexicon-kh/train-00000-of-00001.parquet` and registered in the manifest as `seanghay-lexicon-kh-parquet`. | `KM` `seanghay_lexicon_kh` EN->Khmer dictionary candidates through `weak_dictionary_candidates.jsonl`. The 2026-06-02 full rebuild wrote 995,519 weak-dictionary rows total, including 3,126 rows from this source. | HF metadata does not declare a clean license; keep as internal `source_partial` dictionary sanity until original terms are reviewed. |
| Myanmar Open Wordnet 0.1.3 | Downloaded as `reference-sources/raw/official-dictionaries/myanmar-open-wordnet/mow-0.1.3-mya_20171005165336.tab` and registered in the manifest as `myanmar-open-wordnet-013-tab`. | `MY` `myanmar_open_wordnet` semantic/native lexicon candidates through `weak_dictionary_candidates.jsonl`; the 2026-06-02 full rebuild indexed 1,227 rows from this source. | CC BY 4.0. WordNet synset hits are semantic/display sanity only, not EN->MY translation proof. |
| Nepali Brihat Sabdakosh structured JSON gzip | Downloaded as `reference-sources/raw/official-dictionaries/nepali-brihat-sabdakosh/sabdakosh.json.gz` and registered in the manifest as `nepali-brihat-sabdakosh-json-gz`. | `NE` `nepali_brihat_sabdakosh` native lexicon/display-form candidates through `weak_dictionary_candidates.jsonl`; the 2026-06-02 full rebuild indexed 81,347 rows from this source. | Repository code is MIT, but the README says the actual dictionary data license is unclear. Use as internal native lexicon sanity only. |

The latest weak-source index rebuild wrote 995,519 dictionary rows and 834,621 example/collocation rows under ignored `reference-sources/cache/bulk-source-indexes/`. These indexes are active in `check-language-batch-source-preflight`; they remain rebuildable performance/candidate artifacts, not final QA evidence. The 2026-05-07 smoke check confirmed v2 candidates for `alar_kn`, `tezaurs_lv`, `slovak_wordnet` and `sloleks_sl`; the 2026-06-02 rebuilds confirmed `localdoc_az_en_size_balanced` `AZ`, `kalebu_kamusi_sw` `SW`, `seanghay_lexicon_kh` `KM`, `myanmar_open_wordnet` `MY`, `nepali_brihat_sabdakosh` `NE` and `kk_en_corpora_zenodo` `KK` candidates. For current full weak-example coverage, rebuild with `node scripts/build-bulk-source-indexes.mjs --source=weak-examples --max-rows=1000000`. For current full weak-dictionary coverage, rebuild with `node scripts/build-bulk-source-indexes.mjs --source=weak-dictionaries --max-rows=1200000`.

Executable pre-import source preflight:

```bash
node scripts/check-language-batch-source-preflight.mjs <language-batch.jsonl|csv>
```

The checker writes `outputs/source-preflight/<set_id>_<language_codes>_<timestamp>.json` by default. It blocks obvious failures before Postgres import, but reports `source_partial`, `no_source` and missing optional tools as warnings/candidates. The report is repair guidance for the draft batch, not approval evidence. Each report includes `timing_ms` diagnostics and a `freshness_contract` over the draft hash, deck spec, source manifest, transcription/translation policies, warning-decision ledger and preflight rule version. `scripts/import-language-batch.mjs --expected-preflight-report=<report>` may reuse the report only when that contract is fresh, blocker count is zero and actionable warnings are resolved; stale reports fail closed and require a new preflight. Warning reports include stable `review_key` values and a `warning_review.review_rows` template. Actionable warnings can be decision-locked in `reference-sources/manual-decisions/source-preflight-warning-decisions.jsonl`; optional missing-tool/source and broad dictionary coverage warnings remain non-actionable unless another gate turns them into a concrete blocker. For profile-risk, high-risk grammar, number-heavy or weak-source languages, source preflight automatically requires one language per batch and treats unresolved actionable warning decisions as import blockers. Draft examples are also checked before import for obvious English fallback or number-deck meta-template drift such as `Number: zero` when the canonical scene is concrete. Reports include `deck_profile`, `risk_flags`, `profile_policy`, `hard_blockers`, `actionable_warnings`, `decision_required`, `translation_candidates`, `strong_dictionary_candidates`, `official_dictionary_candidates`, `panlex_candidates`, `example_scene_candidates`, `source_conflicts`, `scene_slot_proof`, `compound_whole_meaning`, `mt_agreement_score`, `low_resource_language_risk`, `license_restriction_note` and optional `external_mt_sanity`; profile-specific proof fields are draft evidence for repair, not final approval. Pre-import translation candidate lookup emits Kaikki/Wiktionary `source_partial` target-word candidates when local target-language entries have English gloss/link evidence, DBnary parsed EN->target candidates where the local English DBnary archive supports the language, targeted FreeDict candidates where optional local pair files exist, Apertium pair candidates where configured, and official/curated dictionary candidates for weak languages where local/API-derived cache rows are available. Current weak-language dictionary indexes include `sinhala_para_dict`, `uzwordnet`, `myanmar_mcfnlp_dict`, `darsala_en_ka_lexicon`, `alar_kn`, `tezaurs_lv`, `slovak_wordnet`, `sloleks_sl`, `kalebu_kamusi_sw`, `seanghay_lexicon_kh`, `myanmar_open_wordnet` and `nepali_brihat_sabdakosh`. These candidates are repair hints only: they do not produce `source_exact`, they do not prove the correct `meaning_id` sense by themselves, and they must not create blockers merely because another dictionary candidate differs from the draft value.

The currently active official-dictionary adapters are `KO` through NIKL and `TH` through LEXiTRON. NIKL lookup is intentionally strict and uses exact English equivalent lemmas, not broad English definitions, because definitions can match the wrong concept. LEXiTRON uses exact English-to-Thai `etlex` rows and carries a licence-restriction note. Dakshina is active only as a South Asian transcription/romanization sanity source; it is not translation evidence and must not override ISO 15919 policy by itself.

Generic official-dictionary and MT-sanity rows must carry an explicit `language_code` before they can be used for a language-specific preflight lookup. Two-column source/target files with no language code are ignored by the generic loader so one weak-language dictionary cannot leak into another language as a false SEAlang or official-dictionary candidate. Monolingual or semantic weak dictionaries such as `kalebu_kamusi_sw`, `myanmar_open_wordnet` and `nepali_brihat_sabdakosh` are native lexicon/display sanity only unless a separate policy and row-level sense review proves an EN/Chinese pivot.

PanLex currently uses two Hugging Face sources because the official `db.panlex.org` CSV dump is unavailable. The `lbourdois/panlex` vocabulary snapshot stores only active LunaCards language variants and emits `source_partial` native-vocabulary hints for spelling/display sanity and fallback detection. The `cointegrated/panlex-meanings` snapshot stores PanLex meaning ids and can emit EN-pivot target candidates as `panlex_meaning`; it is stronger than vocabulary-only PanLex but still remains `source_partial`, not final translation truth.

External machine translation, including Google Translate, is allowed only as optional sanity signal. If a draft row carries `external_mt_suggestion` / `google_translate_suggestion` / `mt_suggestion`, preflight records it in `external_mt_sanity` with agreement or disagreement. It is never final evidence and disagreement is report-only unless another deterministic/source rule already creates a blocker. For weak-source languages, MT disagreement plus no same-row strong dictionary candidate becomes `low_resource_mt_dictionary_disagreement`, an actionable warning that must be repaired or current-value-locked before strict import.

Executable warning-decision validation:

```bash
node scripts/check-source-preflight-warning-decisions.mjs
```

This validates the current-value-locked warning ledger shape, allowed `decision_type` values, review key format, duplicate rows and source ids against `reference-sources/sources.manifest.json`.

Executable local source-cache health check:

```bash
node scripts/check-reference-sources-cache.mjs
node scripts/check-reference-sources-cache.mjs --verify-hashes --strict-cache
```

The default mode validates manifest shape, source ids, tool-adapter metadata and local cache presence without failing merely because an optional local cache/tool is absent. `--strict-cache` promotes missing/mismatched raw cache files to blockers; `--verify-hashes` additionally verifies SHA-256 values for present raw files.

Executable optional source fetcher:

```bash
node scripts/fetch-optional-tool-sources.mjs --list
node scripts/fetch-optional-tool-sources.mjs --adapter=unimorph
node scripts/fetch-optional-tool-sources.mjs --adapter=freedict --languages=FR,IT,PT,DE,ES
node scripts/fetch-optional-tool-sources.mjs --group=weak-dictionaries
node scripts/fetch-optional-tool-sources.mjs --group=weak-dictionaries-v2
node scripts/fetch-optional-tool-sources.mjs --group=weak-examples
node scripts/fetch-optional-tool-sources.mjs --group=weak-examples-v2
node scripts/fetch-optional-tool-sources.mjs --languages=ES
```

This downloads configured optional targets into ignored `reference-sources/raw/` paths and writes a report under `outputs/source-preflight/`. It does not edit card data or Postgres and does not convert tool output into final approval evidence.

Executable bulk source target builder:

```bash
node scripts/build-bulk-reference-source-targets.mjs --groups=freedict-bulk,panlex-meanings,unimorph-bulk,tatoeba,wikidata-lexical,concepticon-cldf,panlex,hunspell,wikipron --out=/private/tmp/lunacards_bulk_targets_core.json
node scripts/build-bulk-reference-source-targets.mjs --groups=opus --out=/private/tmp/lunacards_bulk_targets_opus_all.json
node scripts/build-bulk-reference-source-targets.mjs --groups=opus --languages=ES,FR,DE,RU,JA --opus-corpora=Tatoeba,GlobalVoices,TED2020,WikiMatrix,Wikipedia,GNOME,KDE4,Mozilla-I10n,Ubuntu --out=/private/tmp/lunacards_bulk_targets_opus_smoke_no_subs.json
```

Bulk source groups live in `reference-sources/bulk-source-groups.json`. The builder emits reproducible target files for:

- `freedict-bulk`: active LunaCards EN->target pairs discoverable in the local FreeDict index;
- `panlex-meanings`: Hugging Face `cointegrated/panlex-meanings` TSV files for active LunaCards PanLex codes;
- `unimorph-bulk`: active LunaCards morphology targets where a UniMorph repository may exist;
- `tatoeba`: full text exports for sentence/link/list/tag metadata, excluding audio;
- `opus`: EN<->active-language text pairs from configured OPUS corpora;
- `wikidata-lexical`: Wikidata lexeme dump;
- `concepticon-cldf`: Concepticon, CLICS4 and NorthEuraLex CLDF datasets;
- `panlex`: broad PanLex lexical dump target, currently retryable/deferred until a fetch succeeds.
- `hunspell`: LibreOffice/Hunspell dictionaries for spelling and diacritic sanity;
- `wikipron`: WikiPron repository archive for pronunciation dataset/model support.

Executable bulk source index builder:

```bash
node scripts/build-bulk-source-indexes.mjs --source=tatoeba|opus|panlex|panlex-meanings|weak-dictionaries|weak-examples|wikidata|concepts|hunspell|all --max-rows=50000
```

Derived indexes are rebuildable and ignored under `reference-sources/cache/bulk-source-indexes/`. They are the active bridge between large raw archives and pre-import reports:

- `translation_candidates`: existing Kaikki/DBnary/FreeDict/Apertium plus PanLex vocabulary, PanLex meaning-id, weak-language dictionary indexes, Wikidata and concept indexes when available;
- `example_collocation_candidates`: Tatoeba/OPUS plus weak-language sentence/lexicon hints such as ALT, SI/MY corpora and KA lexicon rows;
- `concept_sanity`: Concepticon/NorthEuraLex semantic-control hints;
- `spelling_sanity`: Hunspell exact-form spelling/diacritic hints.

These new fields are repair signals only. A corpus hit, PanLex row, weak dictionary row, Wikidata label, Concepticon neighbor or Hunspell spelling result cannot approve a row by itself and cannot block a normal row unless another deterministic/source rule already proves fallback, wrong sense, stale decision, script/register violation, compound drift or scene drift.

Pre-import also writes rebuildable batch lookup caches under `reference-sources/cache/bulk-source-lookups/`, while DBnary, Kaikki and FreeDict maintain their own ignored lookup caches under `reference-sources/cache/dbnary/`, `reference-sources/cache/kaikki/` and `reference-sources/cache/freedict/`. These caches are performance artifacts only. The first post-reset `ES` pilot pass proved the quality gate works, but also showed that repeated preflight can still be slow because some tool-source lookups remain expensive. The importer now reuses a fresh hash-proven preflight report instead of running the heavy source layer twice; timing diagnostics show whether a new run is dominated by DB metadata, tool-source context, per-row candidates, translation coverage, transcription backing, bulk hints or warning decisions. Do not treat cache presence as final quality evidence or as proof that the full 54-language workflow is fast enough.

Executable bulk source smoke check:

```bash
node scripts/check-bulk-reference-source-smoke.mjs
```

The smoke check validates that broad raw files are present, readable enough to list, and that FreeDict can produce candidate rows through the same pre-import adapter path. It also reports OPUS temporary downloads and PanLex absence as warnings instead of pretending the layer is complete.

Executable HSK Classic source audit:

```bash
node scripts/hsk/check-classic-hsk-source-audit.mjs <release_id>
```

This checker reuses the same local source layer for HSK release QA, but with Chinese-source-aware rules instead of ordinary deck preflight/import rules. The HSK source item is the Chinese HSK word, not the English canonical base. `EN` and `example_EN` are used only as lookup pivots for indexed candidate search; they cannot override `simplified`, `pinyin`, `example_zh`, HSK sense or target-language values. The report writes to `outputs/hsk/qa/` and does not mutate workbook/export data.

HSK source audit consumes available bulk/indexed candidate evidence from PanLex/PanLex meanings, weak dictionaries, Wikidata/concept indexes, Tatoeba/OPUS/weak examples and Hunspell spelling sanity, plus the HSK source snapshot, card overrides and examples file. FreeDict, DBnary, Kaikki and Apertium remain part of the shared source layer and ordinary preflight adapter path; when their indexed/cache outputs are present they are candidate evidence only, never truth. Missing or uneven source coverage in HSK is a warning, not a blocker.

The stable Chinese HSK source layer for completed HSK Classic releases is stored separately in Postgres table `hsk_classic_source_items` by `scripts/hsk/import-classic-hsk-source-to-db.mjs`. This DB layer is a frozen source-row/readback layer for Chinese HSK words and examples, not candidate evidence and not a target-language source of truth. Indexed dictionaries and corpora still remain candidate/sanity evidence only.

Completed HSK target-language workbook translations are stored separately in Postgres table `hsk_classic_translation_items` by `scripts/hsk/import-classic-hsk-translations-to-db.mjs`. This is a release storage/readback layer for the HSK workbooks, not a normal deck import and not a new source candidate. Translation rows reference `hsk_classic_source_items`; they do not reference `meaning_units`, `meaning_language_entries` or `meaning_example_translations`.

FreeDict raw archives stay compressed under `reference-sources/raw/freedict/dictionaries/`. The adapter builds ignored derived lookup caches under `reference-sources/cache/freedict/` so production preflight does not depend on manual extraction. Large TEI archives are read with source-specific streaming lookup and cache; cache entries are rebuildable performance artifacts, not evidence stronger than the raw source.

Project-local optional Python tool runtime:

```bash
python3 -m venv .venv-source-tools
.venv-source-tools/bin/python -m pip install --upgrade pip setuptools wheel
.venv-source-tools/bin/python -m pip install -r reference-sources/tool-runtime-requirements.txt
```

`scripts/lib/tool-source-adapters.mjs` and parquet-backed weak-source index builders prefer `.venv-source-tools/bin/python` when it exists, or `SOURCE_PREFLIGHT_PYTHON` when explicitly set. The runtime is ignored by git and must not be treated as source data. `pyarrow` is used only to read local Parquet source dumps into rebuildable ignored indexes; if it is absent, those optional sources fail soft instead of approving or blocking card rows.

## Current Sources

Downloaded on 2026-04-30:

| Source | Local role | Primary use |
| --- | --- | --- |
| CC-CEDICT | Chinese dictionary with pinyin | `ZH` lexical and pinyin reference |
| JMdict_e | Japanese dictionary | `JA` headword/reading/gloss reference |
| Open Multilingual Wordnet 1.4 | Cross-language wordnet data | Semantic sanity checks and sense candidates |
| Kaikki/Wiktionary 50 local files | Postprocessed Wiktionary JSONL | Lexical, display, pronunciation and entry-form checks across LunaCards languages where available |
| WikiPron CUNY-CL archive | Wiktionary-derived pronunciation dataset/repository | Pronunciation-pair lookup and IPA cross-checks |
| open `ipa-dict` archive | IPA dictionary repository | Additional IPA candidate lookup and pseudo-IPA cross-checks |
| Unicode CLDR 48 core | Unicode locale/transliteration data | Transliteration standard/reference layer |
| Targeted DBnary 20251001 archives | RDF lexical data from Wiktionary editions | Sense/translation candidate lookup for LunaCards-overlapping language editions |
| FreeDict database index | Dictionary metadata | Discover targeted bilingual dictionary archives without downloading every dictionary blindly |
| Sinhala Wiktionary latest dumps | Wikimedia dump files | `SI` / Sinhala lexical source coverage after the Kaikki gap |
| Romanization/standard reference pages | ISO, NIKL, PyThaiNLP, thai-language.com, Wiktionary, SEAlang, Aksharamukha, LOC ALA-LC source documents | Source-backed support for weak romanization zones: `SI`, `KO`, `TH`, `LO`, `MY`, `KM`, `HY` and Indic scripts |

Downloaded on 2026-05-01 for the high-risk transcription repair work:

| Source | Local role | Primary use |
| --- | --- | --- |
| GOV.UK BGN/PCGN Burmese, Khmer and Lao romanization PDFs | Official romanization standards/comparison layer | `MY`, `KM`, `LO` source-backed comparison; tone-less `LO` standard output is not final card output by itself |
| SEAlang Burmese, Khmer and Lao dictionary/search pages and notation/help pages | Curated language-reference and dictionary provenance | Exact/component lookup support and notation comparison for `MY`, `KM`, `LO` |
| `lao2ipa` 1.0.0 source distribution | Lao rule-based candidate tool | `LO` IPA/MoH candidate generation; tool output is not final evidence alone |
| `python-myanmar` 1.10.0 and `mya2rom` repository archive | Burmese text/romanization candidate tools | `MY` candidate generation and comparison; tool output is not final evidence alone |

Downloaded on 2026-05-01 for the IPA warning/remediation layer:

| Source | Local role | Primary use |
| --- | --- | --- |
| Udtaleordbog.dk export plus license | Danish broad IPA pronunciation dictionary | `DA` exact/candidate IPA lookup and pseudo-IPA repair evidence |
| NST Danish pronunciation lexicon, conversion tables and documentation | Språkbanken CC0 Danish SAMPA lexicon | `DA` fallback pronunciation lookup and SAMPA-to-IPA comparison |
| NB Uttale lexicon and documentation | Språkbanken CC0 Bokmål pronunciation lexicon with IPA columns and dialect variants | `NB` primary IPA lookup; LunaCards remains Urban East Norwegian / Oslo-like |
| NLB Bokmål pronunciation lexicon and documentation | Språkbanken CC0 fullform Bokmål pronunciation lexicon | `NB` fallback pronunciation lookup |
| NST Swedish pronunciation lexicon, conversion tables and documentation | Språkbanken CC0 Swedish SAMPA lexicon | `SV` pronunciation lookup and SAMPA-to-IPA comparison |
| Icelandic Pronunciation Dictionary for Language Technology 1.1.1 | CLARIN-IS CC BY 4.0 Icelandic dictionary with manually revised IPA variants | `IS` exact/candidate IPA lookup |
| Lexique383 TSV and manual | French lexical database with orthographic and phonemic forms | `FR` phonemic lookup and pseudo-IPA repair evidence |
| CMUdict word, phone and symbol files plus license/readme | US English ARPABET pronunciation dictionary | `EN` source lookup; ARPABET must be deterministically converted before IPA comparison |
| Britfone main, symbols, expansions plus license/readme, plus `lunacards_britfone_supplement_v1.tsv` for reviewed local gaps | British English IPA pronunciation dictionary and narrow LunaCards-reviewed supplement rows when Britfone lacks an Oxford-course token | `EN-GB` regional IPA lookup and US/UK separation; supplement rows must not copy Oxford pronunciation |

2026-05-31 Oxford B2 Part 001 added three reviewed EN-GB supplement rows to `reference-sources/raw/ipa-focused/english-gb/lunacards_britfone_supplement_v1.tsv`: `DISHONEST`, `HUMOROUS` and `IMPATIENT`. They are local LunaCards pronunciation evidence for Britfone gaps only and do not copy Oxford pronunciation.

2026-06-04 Oxford 5000 B2 Extension Part 002 added seven reviewed EN-GB supplement rows to `reference-sources/raw/ipa-focused/english-gb/lunacards_britfone_supplement_v1.tsv`: `NOVELIST`, `PROTESTER`, `SETTLER`, `SIBLING`, `SPECULATE`, `SPOKESPERSON` and `SPOKESWOMAN`. They are local LunaCards pronunciation evidence for Britfone gaps only and do not copy Oxford pronunciation.

2026-06-04 Oxford 5000 B2 Extension Part 003 added three reviewed EN-GB supplement rows to `reference-sources/raw/ipa-focused/english-gb/lunacards_britfone_supplement_v1.tsv`: `FIXABLE`, `TERRIFY` and `TRILLION`. They are local LunaCards pronunciation evidence for Britfone gaps only and do not copy Oxford pronunciation.

Recorded on 2026-05-01 for TL/Filipino translation fallback repair:

| Source | Local role | Primary use |
| --- | --- | --- |
| Kaikki/Wiktionary Tagalog | Local dictionary extract | Primary TL lexical candidate lookup and spelling/source evidence |
| Tagalog-Dictionary.com and TagalogLang source notes | Online Filipino/Tagalog dictionary references recorded as local notes | Disputed household TL entry lookup and source-attested repair/loan decisions |
| Drops Tagalog vocabulary source note | Learner-facing vocabulary reference recorded as local note | Supplemental learner-facing TL household vocabulary cross-check |
| Philippines household/product usage source notes: Glad Philippines, Alaska Nanay Club, Brabantia Philippines, Packaging Lab Philippines and Shopee Philippines | Local notes for current web source provenance | Supplemental evidence that product/household loanwords such as `cling wrap`, `piping bag` or baking supply terms are normal learner-facing Philippine usage; not dictionary truth by themselves |

Recorded on 2026-05-01 for the future translation source coverage layer:

| Source | Local role | Primary use |
| --- | --- | --- |
| PanLex license/source note | Wide multilingual lexical candidate source note | Broad supporting evidence and future dictionary discovery; PanLex-only matches are `source_partial`, not final truth |
| Tatoeba downloads/source note | Multilingual sentence/collocation source note | Example/collocation evidence only; it cannot satisfy entry translation truth |

Downloaded on 2026-05-02 for optional pre-import tool-source support:

| Source | Local role | Primary use |
| --- | --- | --- |
| UniMorph tables for `BG`, `DE`, `ES`, `FR`, shared `HR`/`SR`, `IS`, `LV`, `PT`/`PT-BR` and `RO`; optional target registry also lists `IT`, `PL` and `RU` for future fetch | Optional TSV-style morphology lookup under ignored `reference-sources/raw/unimorph/` | Number-heavy / high-risk morphology candidate support before language-batch import |
| Apertium English-Spanish `.dix` from Debian Sources | Optional bilingual dictionary XML under ignored `reference-sources/raw/apertium/` | `ES` candidate translation support before import; still `source_partial` only |
| FreeDict targeted EN->target entries in `reference-sources/optional-tool-source-targets.json` for `ES`, `FR`, `IT`, `PT` and `DE` | Optional bilingual source archives under ignored `reference-sources/raw/freedict/dictionaries/` when fetched | Candidate translation support before import; still `source_partial` only and not a regional or sense decision |
| Project-local Python runtime with `epitran 1.35.1`, `openphonemizer 0.1.2` and `pyarrow` | Optional ignored venv at `.venv-source-tools/` | Epitran IPA/G2P candidate support for policy-gated source-lookup languages; OpenPhonemizer install availability only; Parquet source dumps for weak-language indexes. OpenPhonemizer model execution remains inactive in v1 and must not auto-approve rows. |

Downloaded on 2026-05-03 for targeted pre-import translation/morphology support:

| Source | Local role | Primary use |
| --- | --- | --- |
| FreeDict EN->target source archives for `ES`, `FR`, `IT`, `PT` and `DE` | Optional bilingual source archives under ignored `reference-sources/raw/freedict/dictionaries/`; derived lookup cache under ignored `reference-sources/cache/freedict/` | Candidate translation support before import. Output remains `source_partial`; it can flag fallback/source conflicts but cannot approve final sense by itself. |
| UniMorph tables for `IT`, `PL` and `RU` | Optional TSV-style morphology lookup under ignored `reference-sources/raw/unimorph/` | Additional grammar-risk morphology hints for Romance/Slavic rows before language-batch import. Missing exact morphology still remains warning unless a concrete mismatch is proven. |

Downloaded/started on 2026-05-03 for the broad source layer:

| Source | Local role | Primary use |
| --- | --- | --- |
| FreeDict EN->target source archives for the remaining active local-index pairs: `BG`, `CS`, `DA`, `FI`, `HI`, `HR`, `HU`, `ID`, `JA`, `LT`, `NL`, `NB`, `PL`, `RO`, `RU`, `SR`, `SV`, `SW`, `TR`, `ZH` | Broad optional bilingual source archives under ignored `reference-sources/raw/freedict/dictionaries/` | Candidate translation support before import. This increases coverage but still emits `source_partial`, not final sense approval. |
| Tatoeba full text exports: sentences, detailed sentences, base sentences, links, tags, user lists, sentences in lists and CC0 sentences | Broad sentence/link metadata under ignored `reference-sources/raw/tatoeba/` | Example/collocation sanity and lexical anchor hints. Tatoeba is not entry-translation truth. |
| Wikidata latest lexeme dump | Broad lexeme/entity label source under ignored `reference-sources/raw/wikidata/` | Concept/entity label aliases and lexical form candidates after a derived index is built. |
| Concepticon, CLICS4 and NorthEuraLex CLDF zips | Small semantic-control datasets under ignored `reference-sources/raw/` | Concept/sense sanity, semantic granularity and false-friend review support. |
| OPUS EN<->active-language target matrix | Broad parallel corpus downloads under ignored `reference-sources/raw/opus/` | Example collocation/phrase sanity. High-signal corpora are stronger hints; OpenSubtitles is weak/noisy only. Corpus disagreement alone is never a blocker. |
| PanLex CSV dump target | Retryable broad lexical target under ignored `reference-sources/raw/panlex/` when fetch succeeds | Supporting lexical candidates only. Current fetch attempts failed at DNS/host lookup, so PanLex must remain unavailable until a successful report exists. |
| LibreOffice/Hunspell dictionaries archive | Broad spelling dictionaries under ignored `reference-sources/raw/hunspell/`; derived word index under `reference-sources/cache/bulk-source-indexes/` | Spelling/diacritic sanity for display/native forms. It is not translation evidence and per-dictionary licences vary. |
| WikiPron CUNY-CL repository archive | Pronunciation repository under ignored `reference-sources/raw/wikipron/` | Future IPA/source-assisted pronunciation candidate support. It does not change OpenPhonemizer status and does not auto-approve transcriptions. |

First OPUS staged fetch on 2026-05-03 used `ES`, `FR`, `DE`, `RU` and `JA` against `Tatoeba`, `GlobalVoices`, `TED2020`, `WikiMatrix`, `Wikipedia`, `GNOME`, `KDE4`, `Mozilla-I10n` and `Ubuntu`, excluding OpenSubtitles. It downloaded 30 zipped Moses pairs and received 15 HTTP 404 responses for unavailable corpus/pair combinations, including the selected `en-de` pairs in several corpora and all tested `Mozilla-I10n` pairs. This is expected corpus sparsity, not a card QA blocker. The full OPUS target matrix currently builds to 500 possible targets, but should be fetched corpus-by-corpus or language-batch-by-language-batch so missing pairs are recorded without blocking usable corpora.

Follow-up fetch/index status on 2026-05-03:

- The official `db.panlex.org` PanLex dump remained `deferred_retry` because the host did not resolve locally.
- Hugging Face PanLex fallback sources are active: `lbourdois/panlex` provides vocabulary/display-form sanity, and `cointegrated/panlex-meanings` provides 54-code PanLex meaning-id EN-pivot candidates.
- LibreOffice/Hunspell and WikiPron repository archives downloaded successfully.
- OPUS smoke rerun produced `already_present=30` and `unavailable_pair=15`, with no hard fetch failure.
- UniMorph active-language bulk targets produced `downloaded=23`, `already_present=12` and `unavailable_source=15`.
- Bulk indexes were built for Tatoeba, OPUS, PanLex vocabulary, PanLex meanings, Wikidata, Concepticon/NorthEuraLex and Hunspell.

Implemented on 2026-05-03 for weak-language source-assisted uplift:

| Source/adapter | Local role | Primary use |
| --- | --- | --- |
| NIKL Korean Basic Dictionary / Korean-English Learners' Dictionary adapter | Optional local/API-derived cache under `reference-sources/raw/official-dictionaries/` when present | Strong `KO` candidate support before import; output remains `source_partial` and terms must be respected. |
| NECTEC LEXiTRON 2.0 adapter | Optional local cache under `reference-sources/raw/official-dictionaries/` when present | Strong `TH` candidate support before import; restricted licence notes must stay visible. |
| SEAlang dictionary/reference adapter | Optional local/API-derived cache under `reference-sources/raw/official-dictionaries/` when present | `TH`, `LO`, `MY` and `KM` reference/sanity support; reference-only unless terms allow stronger use. |
| IndicTrans2 / external MT sanity hooks | Optional local rows under `reference-sources/raw/mt-sanity/` or draft-supplied MT fields | Sanity/disagreement signal for weak languages, especially South Asian scripts; never final truth. |
| Dakshina dataset registry entry | Optional transliteration sanity source | South Asian romanization comparison only; not entry translation evidence. |

Implemented on 2026-05-05 for additional weak-language source-assisted uplift:

| Source/index | Local role | Primary use |
| --- | --- | --- |
| `weak_dictionary_candidates.jsonl` from Sinhala dictionary, UzWordnet, English-Myanmar mcfnlp parquet and Darsala EN-KA lexicon parquet | Ignored rebuildable index under `reference-sources/cache/bulk-source-indexes/` | SI/MY/KA translation candidates and UZ native lemma/display sanity before import; all rows are `source_partial`. |
| `weak_example_collocations.jsonl` from ALT, Sinhala-English-Singlish, EN-MY corpora and Darsala EN-KA lexicon | Ignored rebuildable index under `reference-sources/cache/bulk-source-indexes/` | Example/collocation sanity for `BN`, `TL`, `HI`, `ID`, `JA`, `KM`, `LO`, `MS`, `MY`, `TH`, `VI`, `ZH`, `SI` and `KA`. |
| Parquet runtime through `pyarrow` | Optional project-local `.venv-source-tools` dependency | Allows KA/MY Parquet sources to be indexed. Missing runtime is a warning/soft gap, not a reason to import unreviewed rows. |

Weak-source languages currently require one-language batches in source preflight: `KO`, `VI`, `TH`, `MS`, `SK`, `SL`, `LV`, `ET`, `IS`, `BN`, `TL`, `MY`, `KM`, `LO`, `NE`, `SI`, `TA`, `TE`, `KN`, `ML`, `UZ`, `KK`, `AZ`, `KA` and `HY`. The goal is to raise automatic source-assisted confidence above the 80% zone, not to claim native-level correctness. Rows with MT disagreement and no strong same-row dictionary candidate require repair or a current-value-locked decision before production import.

`scripts/check-translation-source-coverage.mjs <set_id> [<set_id> ...] [--report-only] [--out=path]` is the executable translation coverage layer. It reads `config/translation-source-policy.json`, `reference-sources/sources.manifest.json` and current-value-locked entry decisions, then reports `source_partial`, `loan_decision`, `not_checkable`, `conflict` or stale-decision blockers for every active row. V1 final behavior blocks English-looking fallback, high English-token fallback without source decision, source conflicts and stale decisions; no-source/source-partial rows without those failure modes remain visible review coverage, not automatic replacement instructions.

First all-generated-deck coverage report on 2026-05-01: `outputs/qa/translation_source_coverage_all_generated_report_20260501.json` checked 9126 rows across the five pre-reset generated decks and found 0 blockers. Status counts were 8745 `source_partial`, 338 `not_checkable` and 43 `loan_decision`. This is historical regression evidence after the 2026-05-02 reset; it means the obvious fallback/conflict queue was closed for those delivered rows, not that every future translation has exact dictionary proof.

The IPA-focused cache is source infrastructure only. Existing card values are not replaced merely because a stronger source exists. For `DA`, `NB`, `SV`, `IS`, `FR`, `EN` and `EN-GB`, future repair must still prove that the source row matches the current display/native word, article/marker form, regional policy and meaning. `DE`, `NL`, `PT`, `PT-BR` and `PL` still use the earlier Kaikki/WikiPron/ipa-dict/DBnary source families until a stronger open bulk source is selected.

`scripts/check-ipa-source-lookup.mjs` is the executable lookup layer for the IPA-focused cache. It builds ignored targeted indexes under `reference-sources/cache/ipa-source-lookup/` and currently supports `EN`, `EN-GB`, `FR`, `SV`, `NB`, `DA` and `IS`. The checker blocks slash-wrapped display orthography such as `/cling film/`, `/lavabo/`, `/toilettet/` or `/matboksen/` when exact/component source evidence shows a real IPA value is required, and it also fails closed when the current value looks orthographic but the local focused cache has no exact/component candidate. The lookup is wired into `scripts/check-source-backed-transcriptions.mjs` and `scripts/db-qa-set.sh`.

First all-generated-deck IPA lookup result on 2026-05-01: `outputs/qa/ipa_source_lookup_generated_decks_20260501.json` checked 2028 IPA rows and found 235 hard blockers in `Kitchen Storage & Cleaning` and `Bathroom Essentials`; `outputs/qa/source_backed_transcription_with_ipa_lookup_20260501.json` confirmed those rows as source-backed readiness blockers. The first confirmed repair pass imported 200 source-backed IPA repairs into Postgres, backed by `outputs/import/ipa-repair-20260501/` and `outputs/db/lunacards_20260501T094730Z.sql`. The follow-up source expansion/review pass imported the remaining 35 source-backed repairs from `outputs/import/ipa-repair-remaining-20260501/`, backed by `outputs/db/lunacards_before_remaining_ipa_repair_20260501.sql`. Current reports `outputs/qa/ipa_source_lookup_final_recheck_20260501.json` and `outputs/qa/source_backed_transcription_after_remaining_ipa_repairs_20260501.json` have 0 hard blockers for the two affected decks. The same Google Sheet file ids were refreshed in place after final export, readback passed, post-final audit passed and delivery freshness passed.

Kaikki coverage note: `SI` / Sinhala was not present in the downloaded Kaikki English-edition language index on 2026-04-30, so it is covered separately by `siwiktionary` dumps. `HR` and `SR` use the shared `Serbo-Croatian` extract, `SL` uses the `Slovene` extract, and `ZH` has both `Chinese` and `Mandarin` extracts plus CC-CEDICT. LunaCards policy remains `ZH` = Simplified Chinese with Hanyu Pinyin tone marks.

DBnary note: only LunaCards-overlapping DBnary language editions were downloaded (`bg`, `cs`, `da`, `de`, `en`, `es`, `fi`, `fr`, `id`, `it`, `ja`, `lt`, `nl`, `no`, `pl`, `pt`, `ru`, `sh`, `sv`, `tr`, `zh`). Non-overlapping DBnary archives were skipped. FreeDict dictionary archives were not downloaded globally because each dictionary has separate licence terms in its TEI header. Epitran is now registered as an optional tool adapter, not as a raw source dump or final truth source.

Unavailable/failed downloads are recorded in `reference-sources/sources.manifest.json` under `deferred_sources`. On 2026-04-30, `laoconverter.info` timed out over both HTTPS and HTTP, and the guessed `Wiktionary:Lao_romanization` page returned 404. On 2026-05-01, `Wiktionary:Lao_transliteration`, LOC ALA-LC source documents, GOV.UK BGN/PCGN PDFs, SEAlang dictionary/provenance pages and limited Lao/Burmese candidate tools were added as reference sources. ALA-LC/BGN/PCGN/tool output remains comparison evidence, not final learner-facing output by itself for tone-sensitive or learner-romanization languages.

## Transcription Source Decision Matrix

This matrix chooses the best learner-facing `transcription` format for all 54 LunaCards language variants and binds each language to primary/fallback source families. It does not approve any existing card value by itself.

`auto_safe` means the transcription can be deterministically produced or checked from the current display form without semantic ambiguity, usually by copying native orthography or applying a fixed transliteration standard. `source_assisted` means source lookup/tool evidence is required before a generated value can be trusted. `manual_review_required` means a row can still use source/tool evidence, but final confidence requires fail-closed review because of region, pronunciation, tone/register or source-conflict risk. In the matrix, rows with `auto_safe = no` are `source_assisted`; rows with `manual_review_required = yes` are source-assisted plus fail-closed review.

| language_code | current_policy | best_user_facing_format | primary_source | fallback_source | auto_safe | manual_review_required | known_risks | decision_note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EN | IPA | US IPA for the full display form | CMUdict + Kaikki English | WikiPron, ipa-dict, DBnary en | no | yes | Phrase IPA, articles, US/UK split, ARPABET-to-IPA conversion | Source-assisted. Do not inherit `EN-GB` pronunciation. |
| ES | native orthography | Copy the displayed Spanish form | Kaikki Spanish | DBnary es | yes | no | Region overlap with `ES-419` | Transcription equals display word. |
| FR | IPA | French IPA for the full display form | Lexique383 + Kaikki French | WikiPron, ipa-dict, DBnary fr | no | yes | Elision, articles, phrase IPA | Source-assisted; slash-wrapped spelling is not enough. |
| DE | IPA | German IPA for article plus display form | Kaikki German | WikiPron, ipa-dict, DBnary de | no | yes | Compounds, article/gender, pseudo-IPA | Source-assisted; article must match display. |
| IT | native orthography | Copy the displayed Italian form | Kaikki Italian | DBnary it | yes | no | Spelling/display-form mismatch | Transcription equals display word. |
| PT | IPA | European Portuguese IPA | Kaikki Portuguese | WikiPron, ipa-dict, DBnary pt | no | yes | `PT` vs `PT-BR`, phrase IPA | Portugal variant only; do not inherit Brazilian IPA. |
| RU | practical Latin transliteration | Practical transliteration of the Russian display form | Kaikki Russian | CLDR/standards, DBnary ru | yes | no | Loanwords, soft signs, learner readability | Deterministic transliteration plus source spelling check. |
| ZH | Hanyu Pinyin with tone marks | Simplified Chinese plus Hanyu Pinyin tone marks | CC-CEDICT | Kaikki Chinese/Mandarin, Unihan/CLDR, DBnary zh | no | yes | Word segmentation, tone sandhi, simplified/traditional mix | `ZH` remains Simplified Chinese; tone numbers are not final output. |
| JA | Modified Hepburn with macrons | Hepburn reading with macrons | JMdict_e | Kaikki Japanese, DBnary ja | no | yes | Multiple readings, compounds | Source-assisted reading required. |
| KO | Revised Romanization | Revised Romanization | NIKL Revised Romanization | Kaikki Korean, CLDR | no | yes | Sound changes, spacing, loanwords | Official system; source/tool-assisted review. |
| VI | native orthography with tone marks | Copy the displayed Vietnamese form with tones | Kaikki Vietnamese | CLDR | yes | no | Missing tone marks | Transcription equals display word and must keep diacritics. |
| TH | Thai learner romanization with tone diacritics, Paiboon-style | Learner romanization with tone diacritics | thai-language.com / Kaikki exact lookup | PyThaiNLP, SEAlang ALA-LC Thai, LOC ALA-LC Thai | no | yes | RTGS has no tones, tone class, vowel length | High-risk manual-source-backed language. Official tone-less romanization is reference only; strict lookup requires exact local headword evidence. |
| MS | native orthography | Copy the displayed Malay form | Kaikki Malay | FreeDict index | yes | no | `MS` Malay vs `MY` Burmese confusion | Transcription equals display word. |
| ID | native orthography | Copy the displayed Indonesian form | Kaikki Indonesian | DBnary id | yes | no | Register/spelling | Transcription equals display word. |
| PL | IPA | Polish IPA | Kaikki Polish | WikiPron, ipa-dict, DBnary pl | no | yes | Phrase stress, pseudo-IPA | Source-assisted. |
| NL | IPA | Dutch IPA for article plus display form | Kaikki Dutch | WikiPron, ipa-dict, DBnary nl | no | yes | Article omission, slash-wrapped spelling | Source-assisted. |
| SV | IPA | Swedish IPA | NST Swedish + Kaikki Swedish | WikiPron, ipa-dict, DBnary sv | no | yes | Tonal accent, compounds, SAMPA conversion | Source-assisted. |
| NB | IPA | Bokmål IPA, Urban East Norwegian / Oslo-like | NB Uttale + Kaikki Norwegian Bokmål | NLB Bokmål, WikiPron, ipa-dict, DBnary no | no | yes | Dialect, tone, `NO`/`NB` code split | Source-assisted; Sheet code remains `NO`. |
| DA | IPA | Danish IPA | Udtaleordbog.dk + Kaikki Danish | NST Danish, WikiPron, ipa-dict, DBnary da | no | yes | Stød, pseudo-IPA, phrase IPA, SAMPA conversion | Source-assisted. |
| FI | native orthography | Copy the displayed Finnish form | Kaikki Finnish | DBnary fi | yes | no | Case/inflection in entry form | Transcription equals display word. |
| CS | native orthography | Copy the displayed Czech form | Kaikki Czech | DBnary cs | yes | no | Missing diacritics | Transcription equals display word. |
| SK | native orthography | Copy the displayed Slovak form | Kaikki Slovak | CLDR | yes | no | Missing diacritics | Transcription equals display word. |
| HU | native orthography | Copy the displayed Hungarian form | Kaikki Hungarian | CLDR | yes | no | Long vowels | Transcription equals display word. |
| RO | native orthography | Copy the displayed Romanian form | Kaikki Romanian | CLDR | yes | no | `s/t` with comma diacritics | Transcription equals display word. |
| BG | official Bulgarian streamlined transliteration | Bulgarian official streamlined transliteration | Kaikki Bulgarian | DBnary bg, CLDR/standards | yes | no | `х` must not become English `kh`, articles | Deterministic transliteration plus source spelling check. |
| HR | native orthography | Copy the displayed Croatian form | Kaikki Serbo-Croatian | DBnary sh | yes | no | Shared `HR`/`SR` source layer | Transcription equals Croatian display form. |
| SR | Serbian Latin (Gaj) when source is Cyrillic | Serbian Latin/Gaj for Cyrillic display | Kaikki Serbo-Croatian | DBnary sh, CLDR | yes | no | Cyrillic/Latin split, `HR`/`SR` overlap | Deterministic script rule. |
| SL | native orthography | Copy the displayed Slovenian form | Kaikki Slovene | FreeDict index | yes | no | Source label `Slovene` vs LunaCards `SL` | Transcription equals display word. |
| LT | native orthography | Copy the displayed Lithuanian form | Kaikki Lithuanian | DBnary lt | yes | no | Missing diacritics | Transcription equals display word. |
| LV | native orthography | Copy the displayed Latvian form | Kaikki Latvian | CLDR | yes | no | Missing diacritics | Transcription equals display word. |
| ET | native orthography | Copy the displayed Estonian form | Kaikki Estonian | CLDR | yes | no | Vowel-length spelling | Transcription equals display word. |
| IS | IPA | Icelandic IPA | IcePronDict + Kaikki Icelandic | WikiPron, ipa-dict | no | yes | Phrase IPA, orthography traps, pronunciation variants | Source-assisted. |
| HI | ISO 15919 | ISO 15919 from Devanagari display | Kaikki Hindi | ISO 15919, Aksharamukha, CLDR | yes | no | Schwa deletion vs transliteration, loanwords | Policy is transliteration, not pronunciation. |
| BN | ISO 15919 | ISO 15919 from Bengali display | Kaikki Bengali | ISO 15919, Aksharamukha, CLDR | yes | no | Inherent vowel, conjuncts | Source-backed transliteration. |
| TL | native orthography | Copy the displayed Filipino/Tagalog form | Kaikki Tagalog | FreeDict index | yes | no | Filipino vs Tagalog naming | Transcription equals display word. |
| MY | practical Burmese romanization with tone/register notation | Practical learner romanization with tone/register support | Kaikki Burmese exact lookup | Wiktionary Burmese romanization, SEAlang Burmese dictionary/IPA notes, LOC ALA-LC Burmese, BGN/PCGN Burmese, CLDR, `python-myanmar`, `mya2rom` | no | yes | MLCTS is not learner-facing, tone/register, English fallback risk | High-risk manual-source-backed language; do not use raw MLCTS/tool output alone; strict lookup requires exact local headword or current-value-locked component evidence. |
| KM | practical Khmer romanization | Geographic Department / UNGEGN-based practical romanization | Kaikki Khmer exact lookup | Wiktionary Khmer romanization, SEAlang Khmer dictionary/IPA notes, LOC ALA-LC Khmer, BGN/PCGN Khmer, CLDR | no | yes | Vowel ambiguity, source conflicts, no simple one-to-one pronunciation | Fail closed when sources conflict or exact/component lookup is missing/mismatched. |
| LO | Lao learner romanization with tone diacritics, Vientiane-based | Learner romanization with tone diacritics | Kaikki Lao exact lookup | Wiktionary Lao transliteration, SEAlang Lao IPA/dictionary notes, SEAlang ALA-LC Lao, LOC ALA-LC Lao, BGN/PCGN Lao, `lao2ipa` | no | yes | Tone class, dialect, official romanization lacks tones | High-risk manual-source-backed language; tone-less official/tool output is not final card output; strict lookup requires exact local headword or current-value-locked component evidence. |
| NE | ISO 15919 | ISO 15919 from Devanagari display | Kaikki Nepali | ISO 15919, Aksharamukha, CLDR | yes | no | Schwa deletion vs transliteration | Policy is transliteration, not pronunciation. |
| SI | ISO 15919 | ISO 15919 from Sinhala display | Sinhala Wiktionary dumps | ISO 15919, Aksharamukha, CLDR | yes | no | Kaikki gap, Sinhala-specific vowels | Covered via `siwiktionary`; transliteration source-backed. |
| TA | ISO 15919 | ISO 15919 from Tamil display | Kaikki Tamil | ISO 15919, Aksharamukha, CLDR | yes | no | Tamil transliteration conventions | Source-backed transliteration. |
| TE | ISO 15919 | ISO 15919 from Telugu display | Kaikki Telugu | ISO 15919, Aksharamukha, CLDR | yes | no | Vowel length, conjuncts | Source-backed transliteration. |
| KN | ISO 15919 | ISO 15919 from Kannada display | Kaikki Kannada | ISO 15919, Aksharamukha, CLDR | yes | no | Low dictionary coverage, loanwords | Source-backed transliteration. |
| ML | ISO 15919 | ISO 15919 from Malayalam display | Kaikki Malayalam | ISO 15919, Aksharamukha, CLDR | yes | no | Chillus, conjuncts | Source-backed transliteration. |
| UZ | native orthography | Copy modern Uzbek Latin display | Kaikki Uzbek | FreeDict index | yes | no | Cyrillic/Latin source confusion | Transcription equals display word. |
| KK | practical Cyrillic-to-Latin transliteration | Practical Cyrillic-to-Latin transliteration | Kaikki Kazakh | CLDR/standards | yes | no | Kazakh Latin reforms vs project policy | Deterministic current policy. |
| AZ | native orthography | Copy modern Azerbaijani Latin display | Kaikki Azerbaijani | FreeDict index | yes | no | Cyrillic/Latin source confusion | Transcription equals display word. |
| KA | Georgian national romanization | Georgian national romanization | Kaikki Georgian | CLDR/standards | yes | no | Aspirated/ejective consonants | Deterministic national romanization. |
| HY | practical BGN/PCGN-style romanization | Practical Armenian romanization | CLDR BGN-style compiler from current Armenian display | Kaikki Armenian exact lookup, LOC ALA-LC Armenian | yes | yes | Eastern/Western Armenian, loanwords, competing Wiktionary/Kaikki romanization conventions | Strict lookup uses the BGN compiler as the final card policy and treats Kaikki Armenian and LOC/ALA-LC romanization as comparison evidence. |
| TR | native orthography | Copy the displayed Turkish form | Kaikki Turkish | DBnary tr | yes | no | Dotted/dotless `i` | Transcription equals display word. |
| SW | native orthography | Copy the displayed Swahili form | Kaikki Swahili | FreeDict index | yes | no | Noun-class prefix is part of display | Transcription equals display word. |
| PT-BR | IPA | Brazilian Portuguese IPA | Kaikki Portuguese | WikiPron, ipa-dict, regional QA | no | yes | `PT` vs `PT-BR`, phrase IPA | Region-specific source-assisted review required. |
| ES-419 | native orthography | Copy broad Latin American Spanish display | Kaikki Spanish | DBnary es, regional QA | yes | yes | Broad regional term choice | Transcription copy is safe; term choice still needs regional QA when disputed. |
| EN-GB | IPA | British English IPA | Britfone + Kaikki English | WikiPron, ipa-dict, regional QA | no | yes | US/UK pronunciation split | Region-specific IPA; do not inherit `EN`. |

## QA Contract

When using these sources:

- match by sense, not by surface English;
- confirm regional variant boundaries before using a source row;
- do not use source values that conflict with `docs/language-transcription-policy.md`;
- keep uncertain rows as `needs_review`;
- record the source URL/file and decision in repair artifacts or `qa_reviews.evidence`;
- never promote a row to `approved` only because a source exists.

Source-backed evidence can support `generated_checked` only when the normal required QA family passes for the exact target row and current value hash.

For entry/display translation fallback repair, current-value-locked decisions live in `reference-sources/manual-decisions/entry-source-decisions.jsonl`. A row is accepted only when the current DB `set_id`, `meaning_id`, `language_code`, native word, display word and transcription still match exactly, the decision type is `source_attested_loan`, `source_exact_repair` or `component_source_repair`, every cited source id exists in `reference-sources/sources.manifest.json`, and the source note explains why the current learner-facing translation is acceptable. Stale, partial, conflict or no-source rows fail closed.

For forced-review noise reduction, automatic source confirmations may live in `reference-sources/manual-decisions/auto-source-confirmations.jsonl`. These rows are created only by `scripts/resolve-forced-review-queue.mjs --write-auto-confirmations`; the default resolver mode is report-only. A valid auto-confirmation must be current-value locked to `set_id`, `meaning_id`, `language_code`, `current_native_word`, `current_display_word` and `current_transcription`, cite manifest source ids and use `decision_type` `auto_confirmed_strong` or `auto_supported_multi_source`. It lowers future review priority for a row that still has the same value, but it is not `source_exact`, is not native approval and does not change card data.

## Strict High-Risk Lookup

As of 2026-05-01, `TH`, `LO`, `MY`, `KM` and `HY` have a second source-backed layer implemented in `scripts/lib/high-risk-transcription-lookup.mjs` and exposed by `scripts/check-high-risk-transcription-lookup.mjs`. These languages cannot receive final `source_exact` evidence merely because the source family exists. For `TH`, `LO`, `MY` and `KM`, the checker must find the current native/display word as an exact local Kaikki headword and match the current `transcription` to a local romanization candidate. For `HY`, the checker derives the final-policy value with a CLDR BGN-style compiler and blocks competing Kaikki-style romanization when it conflicts with that policy. Delimiter-only differences such as Thai hyphen versus space can pass only when letters, tone marks and diacritics still match after separator normalization. Missing exact headwords return `source_partial`; candidate mismatches or `HY` BGN mismatches return `conflict`.

Component/phrase decisions that cannot be proven by a whole-phrase headword live in `reference-sources/manual-decisions/high-risk-transcription-decisions.jsonl`. A decision row is accepted only when `set_id`, `meaning_id`, `language_code`, `current_native_word`, `current_display_word` and `current_transcription` still match the current DB row exactly, `source_confidence` is `source_exact`, every `source_id` exists in the manifest and `source_note` explains the evidence. Stale or partial decisions fail closed.

For strict high-risk rows where the pre-import source layer proves useful but cannot promote a whole phrase to `source_exact`, current-value-locked source-preflight warning decisions live in `reference-sources/manual-decisions/source-preflight-warning-decisions.jsonl`. `scripts/check-source-backed-transcriptions.mjs` may accept these rows as `accepted_source_partial` only when the decision still matches the current DB row and the warning was an actionable source-partial transcription warning, not a conflict, fallback or missing-source blocker. The 2026-05-19 `Pronouns & People Basics` delivery used this bridge for Lao pronoun/person compounds and kept a separate high-risk decision for `LO adult` (`ຜູ້ໃຫຍ່` / `phū nyai`) because local tool output truncated the learner-facing value.

The strict high-risk audit of the five generated decks on 2026-05-01 initially did not repair DB rows or Google Sheets. It checked 845 high-risk rows and found 667 blockers after the `HY` BGN compiler pass: 526 exact-headword gaps and 141 source-candidate/BGN mismatches. `Kitchen Small Tools & Supplies` was the first completed pilot. The repair pass backed up Postgres, repaired confirmed `TH`, `KM` and `MY` rows through `scripts/import-transcription-repair.mjs`, repaired `MY/toothpicks` to an exact Kaikki Burmese headword candidate, and added current-value-locked component/manual decisions for remaining phrase rows. The refreshed strict report is `outputs/qa/high_risk_transcription_lookup_small_tools_after_remaining_decisions_20260501.json`: 120/120 high-risk rows now pass. The remaining four generated decks were then repaired/refreshed the same way without card regeneration: `outputs/qa/high_risk_transcription_lookup_remaining_decks_final_20260501.json` passes 725/725 high-risk rows and `outputs/qa/source_backed_transcription_remaining_decks_final_20260501.json` passed 7830/7830 source-backed rows under the then-current high-risk gate. The later IPA source lookup gate found and then closed additional blockers for `Kitchen Storage & Cleaning` and `Bathroom Essentials`; current IPA status is recorded in `outputs/qa/ipa_source_lookup_final_recheck_20260501.json`. Reports:

- `outputs/qa/high_risk_transcription_lookup_audit_20260501.json`
- `outputs/qa/source_backed_transcription_strict_audit_20260501.json`
- `outputs/qa/high_risk_transcription_small_tools_classification_20260501.json`
- `outputs/qa/high_risk_transcription_small_tools_component_review_20260501.json`
- `outputs/qa/high_risk_transcription_lookup_small_tools_after_th_km_repairs_20260501.json`
- `outputs/qa/source_backed_transcription_small_tools_after_th_km_repairs_20260501.json`
- `outputs/qa/high_risk_transcription_lookup_small_tools_after_remaining_decisions_20260501.json`
- `outputs/qa/high_risk_transcription_lookup_remaining_decks_final_20260501.json`
- `outputs/qa/source_backed_transcription_remaining_decks_final_20260501.json`

The 2026-05-01 strict high-risk rollout is delivered for all five generated decks and was followed by IPA and all-language translation repair passes. Latest current audit summaries are `outputs/audit/final_linguistic_audit_home_kitchen_cookware_pilot_01_non_tl_repair_20260501_results_summary.json` (2700/2700), `outputs/audit/final_linguistic_audit_home_kitchen_cooking_actions_a1_a2_tl_repair_20260501_results_summary.json` (1350/1350), `outputs/audit/final_linguistic_audit_home_kitchen_storage_cleaning_a2_non_tl_repair_20260501_results_summary.json` (1890/1890), `outputs/audit/final_linguistic_audit_home_bathroom_essentials_a1_ipa_repair_20260501_results_summary.json` (1890/1890) and `outputs/audit/final_linguistic_audit_home_kitchen_small_tools_supplies_a2_non_tl_repair_20260501_results_summary.json` (1296/1296). The same Google Sheet file ids were updated in place where content changed, readback passed and `check-delivery-freshness` passed.

IPA lookup repair note: the focused IPA lookup now reads the corrected Swedish NST SAMPA column, uses Danish NST as fallback after Udtaleordbog.dk, uses NLB as a Bokmål fallback, expands IcePronDict coverage with the standard-clear train/dev/test files, and can produce compound/component candidates for the focused IPA languages. The first repair classification report is `outputs/qa/ipa_source_lookup_repair_classification_20260501.json`. The completed repair imports fixed 235 rows in Postgres. The final recheck `outputs/qa/ipa_source_lookup_final_recheck_20260501.json` has 0 hard blockers; future source-gap rows must still not be guessed or mass-filled from AI output.

## Common Failure Modes These Sources Should Catch

- slash-wrapped spelling used as IPA, for example `/kosten/` when the source shows a nonliteral Danish pronunciation;
- missing article/marker in IPA when the displayed word includes it;
- wrong regional IPA, especially `PT` vs `PT-BR` and `EN` vs `EN-GB`;
- native orthography with missing diacritics, such as Czech words stored without required marks;
- semantic drift such as a room/restroom word used for a fixture card;
- native-copy translation fallback where `native_word`/display is just English or Taglish without source-backed learner usage, such as TL `aluminum foil` or `paper towel` before repair;
- non-TL native-copy loan/fallback ambiguity. The 2026-05-01 all-language pass resolved the 38 warnings from `outputs/qa/entry_source_backed_translation_all_language_report_20260501.json`: accepted values are current-value locked in `reference-sources/manual-decisions/entry-source-decisions.jsonl`, the source notes for web-reviewed rows live under `reference-sources/raw/non-tl-web/`, and `outputs/qa/entry_source_backed_translation_all_language_final_20260501.json` has 0 blockers / 0 warnings. Future English-looking native-copy rows are final blockers until repaired or source-decision locked.
