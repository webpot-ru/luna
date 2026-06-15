# Rare Language Source Hunt

Status: research backlog v1, created 2026-06-02; `AZ` LocalDoc, `SW` Kalebu/kamusi, `KK` Zenodo parallel corpus, `KM` seanghay/lexicon-kh, `MY` Myanmar Open Wordnet and `NE` Nepali Brihat Sabdakosh sources activated 2026-06-02.

This document is the source-of-truth checklist for finding additional lexical and corpus sources for LunaCards weak-source languages. It extends [Reference Sources](reference-sources.md) and [Course Source-Assisted Generation](course-source-assisted-generation.md), but it does not replace the current source manifest, source policies, preflight gates or HSK release contracts.

No files were downloaded, registered or activated during the first pass. The entries below are candidate leads for later review, except where the status explicitly says a source has since been activated.

## Scope

The goal is to improve source candidates for languages where LunaCards often has weak dictionary evidence, especially:

```text
AZ, KA, HY, KK, MY, KM, LO, NE, SI, TL, SW,
HI, BN, TA, TE, KN, ML, UZ
```

Priority is practical QA value, not academic completeness:

- direct bilingual dictionary or lexicon beats broad monolingual corpus;
- structured files beat PDF-only resources;
- EN/Chinese pivot pairs beat unrelated text dumps;
- reusable dataset/API/repository beats website-only search UI;
- candidate evidence must remain `source_partial` until matched to the LunaCards row meaning.

Sci-Hub is not a source target for this work. If it reveals the title of a paper or resource, use that title to find an official/open resource page, repository, dataset record or author project page. Do not add Sci-Hub URLs or paywalled PDFs to `reference-sources/sources.manifest.json`.

## Current Project Baseline

Already active or registered in the project source layer:

| Language | Current project source coverage | Gap |
| --- | --- | --- |
| `KO` | NIKL Korean Basic Dictionary. | Stronger than most weak-source languages; no urgent hunt. |
| `TH` | LEXiTRON plus SEAlang reference. | Useful but license/terms still require care before stronger use. |
| `MY` | Myanmar mcfnlp dictionary parquet, SEAlang, romanization standards. | Needs stronger EN->MY dictionary and example candidates. |
| `KM` | SEAlang, romanization standards, ALT example/collocation hints, seanghay/lexicon-kh EN->Khmer weak dictionary hints. | Still needs cleaner-licensed/official Khmer source review before any stronger confidence. |
| `LO` | SEAlang, romanization standards, ALT example/collocation hints. | Needs structured Lao lexicon/dictionary review. |
| `SI` | Sinhala-English Parallel Word Dictionary. | Good dictionary candidate; still source_partial. |
| `UZ` | UzWordnet. | Good semantic source; still not direct EN->UZ translation truth. |
| `KA` | Darsala EN-KA lexicon/corpus. | Needs a second independent dictionary/corpus source. |
| `KN` | Alar Kannada-English. | Useful dictionary candidate; still source_partial. |
| `KK` | Kaikki Kazakh plus Zenodo KK-EN parallel corpus example/collocation hints. | Needs direct dictionary support if source-audit should move beyond corpus/example sanity. |
| `NE` | Kaikki Nepali plus Nepali Brihat Sabdakosh native lexicon/display sanity. | Needs direct EN->NE dictionary support if source-audit should move beyond native lexicon sanity. |
| `LV`, `SK`, `SL` | Tezaurs.lv, Slovak WordNet, Sloleks. | Not primary current blockers. |
| all 54 active variants | PanLex vocabulary/meanings, Kaikki/DBnary/FreeDict where covered, Concepticon/Wikidata/Hunspell/corpus hints. | Uneven sense matching and weak-language gaps remain. |

Deferred or incomplete project candidates:

| Candidate | Current blocker |
| --- | --- |
| Ekilex/Sonaveeb for `ET` | Requires API/download key/account and terms review. |
| IndoWordNet / pyiwn | Needs pinned local runtime/export before use. |
| MyOrdbok `MY` GitHub source | Previously inspected assets looked like mock DB files, not clean dictionary data. |
| KazParC `KK` | Hugging Face access returned gated `401`; needs user-provided HF access or ungated mirror. |

## First-Pass External Leads

These leads were identified from live web search on 2026-06-02. They are not vetted enough for immediate pipeline activation.

| Priority | Language | Candidate | Why it matters | Next check |
| --- | --- | --- | --- | --- |
| P0 | `AZ` | [LLM.az Azerbaijani language technology resources](https://llm.az/) | Registry for Azerbaijani corpora, datasets, models, benchmarks and tools. | Inspect listed lexical/parallel resources and choose structured downloads. |
| P0 | `AZ` | [LocalDoc Azerbaijani-English parallel corpus on Hugging Face](https://huggingface.co/datasets/LocalDoc/azerbaijani-english-parallel-corpus/tree/main) | Large AZ-EN parallel corpus, useful for examples/collocation and MT sanity. | Activated 2026-06-02 through the smaller size-balanced parquet split as `localdoc-azerbaijani-english-parallel-size-balanced`; it provides `source_partial` AZ example/collocation candidates only. |
| P0 | `AZ` | [Azerbaijani lexical database article](https://dergipark.anas.az/index.php/turkology/article/view/3363) | Describes a national lexical database and large word lists; may point to better official resources. | Find whether the lexical database or word lists are downloadable. |
| P0 | `AZ` | [Kaikki Azerbaijani dictionary](https://kaikki.org/dictionary/Azerbaijani/index.html) | Postprocessed Wiktionary JSONL for Azerbaijani; likely useful for spelling/display and some gloss candidates. | Check whether current source policy already indexes `kaikki-azerbaijani`; add if missing. |
| P0 | `KK` | [Kazakh-English parallel corpora on Zenodo](https://zenodo.org/records/7115360) | Ungated-looking KK-EN parallel corpus lead, may partly replace gated KazParC for example/collocation sanity. | Activated 2026-06-02 as `kk-en-corpora-zenodo-v1`; provides `source_partial` KK example/collocation candidates only. |
| P0 | `KK` | [KazParC paper](https://arxiv.org/abs/2403.19399) | Confirms KazParC target value and language coverage. | Look for ungated mirrors or request HF access if needed. |
| P0 | `MY` | [Myanmar Open Wordnet](https://wordnet.burmese.sg/) | Freely available semantic dictionary for Burmese; can improve MY sense sanity. | Activated 2026-06-02 as `myanmar-open-wordnet-013-tab`; native/semantic sanity only, not EN->MY translation proof. |
| P0 | `MY` | [Hugging Face Burmese datasets listing](https://huggingface.co/datasets?other=burmese) | Shows Burmese Dictionary, lexicon and word-alignment leads. | Inspect `Rickaym/Burmese-Dictionary`, `freococo/myanmar-english-pali-dictionary`, and related lexicons. |
| P0 | `KM` | [khopilot Khmer lexicon](https://huggingface.co/datasets/khopilot/khmer-lexicon) | Structured Khmer lexicon with POS/domains/semantic relationships; no English translations but useful for display/POS sanity. | Inspect license and columns; decide whether monolingual Khmer helps current QA. |
| P0 | `KM` | [seanghay Khmer datasets](https://huggingface.co/seanghay/datasets) | Includes Khmer dictionary and Google Khmer lexicon style leads. | `seanghay/lexicon-kh` activated 2026-06-02 as `seanghay-lexicon-kh-parquet`; HF metadata lacks a clean license, so keep as internal `source_partial`. |
| P1 | `LO` | [Lao UKC Lexicon](https://datascientiafoundation.github.io/LiveLanguage/datasets/lao-ukc-lexicon-/) | Lexico-semantic network for Lao with GitHub backing. | Inspect GitHub export shape and English/concept links. |
| P1 | `NE` | [Nepali-Datasets registry](https://github.com/pemagrg1/Nepali-Datasets) | Curated registry points to Nepali Brihat Sabdakosh JSON and EN-NE resources. | Nepali Brihat Sabdakosh JSON activated 2026-06-02 as `nepali-brihat-sabdakosh-json-gz`; native lexicon sanity only because dictionary-data license is unclear and there is no EN pivot. |
| P1 | `SW` | [Kalebu/kamusi GitHub repo](https://github.com/Kalebu/kamusi) | JSON/CSV Swahili dictionary with meanings and related forms. | Activated 2026-06-02 as `kalebu-kamusi-swahili-dictionary`; provides `source_partial` SW native lexicon/display sanity only because meanings are monolingual Swahili, not EN->SW translations. |
| P1 | `SW` | [LingDy Swahili online lexical database](https://lingdy.aa-ken.jp/en/news/17326) | Rich Swahili lexical info, translations and examples from a six-volume dictionary. | Check whether export/API exists; if website-only, keep as manual review reference. |
| P1 | `SW` | [Swahili UKC Lexicon](https://datascientiafoundation.github.io/LiveLanguage/datasets/swa-ukc-lexicon-/) | Concept network lead for Swahili. | Inspect GitHub data and concept mapping. |
| P1 | `KA` | [Darsala English-Georgian corpora on Hugging Face](https://huggingface.co/datasets/Darsala/english_georgian_corpora/tree/main) | Already represented locally as Darsala EN-KA; confirms `lexicon.parquet` source family. | Use as baseline; hunt for second source before promoting confidence. |
| P1 | `KA` | [Georgian Corpus Dataset](https://huggingface.co/datasets/RichNachos/georgian-corpus) | Large Georgian monolingual corpus; can help spelling/register sanity but not direct translation. | Keep as low priority due GPL and monolingual shape. |
| P2 | `TL` | [Tagalog-English translation dataset](https://huggingface.co/datasets/rhyliieee/tagalog-filipino-english-translation/blob/main/README.md) | Parallel translation data, more useful for examples/MT sanity than dictionary truth. | Inspect source composition and duplicates before use. |
| P2 | `TL` | [Tagalog dictionary scraper repo](https://github.com/raymelon/tagalog-dictionary-scraper) | Dictionary-like scraped data. | Terms and source site risk likely high; inspect only as last resort. |
| P2 | `HY` | [Lexicala Armenian language data](https://lexicala.com/armenian-language-data/) | Commercial dictionary data exists, confirming availability but likely not useful without purchase/licence. | Continue open-source hunt: Armenian WordNet, Wiktionary/Kaikki, CLDF, parallel corpora. |
| P2 | Indic group | [IndicTrans2 GitHub](https://github.com/AI4Bharat/IndicTrans2) | Translation datasets/models for 22 scheduled Indian languages including `HI`, `BN`, `TA`, `TE`, `KN`, `ML`, `NE`. | Keep as MT sanity/corpus layer, not dictionary truth. |
| P2 | Indic group | [AI4Bharat IndicNLP catalog](https://github.com/AI4Bharat/indicnlp_catalog) | Catalog of Indic resources including Nepali-English and transliteration datasets. | Use as the next systematic registry for Indic languages. |
| P2 | Indic group | [Dakshina dataset](https://research.google/pubs/processing-south-asian-languages-written-in-the-latin-script-the-dakshina-dataset/) | Already useful for transliteration sanity across South Asian scripts. | Keep current role; do not treat as translation evidence. |
| P2 | Indic group | [IndoWordNet overview](https://en.wikipedia.org/wiki/IndoWordNet) | Linked wordnets for Hindi, Bangla, Nepali, Kannada, Malayalam, Tamil, Telugu and more. | Activate only through a pinned local export/runtime, not ad hoc calls. |
| P2 | Cross-language | [Lexibank](https://github.com/lexibank) / [Lexibank Scientific Data article](https://www.nature.com/articles/s41597-022-01432-0) | Standardized CLDF wordlists across many languages; useful for concept sanity and broad lexical coverage. | Check overlap with LunaCards languages and concept ids before indexing. |
| P2 | Cross-language | [NorthEuraLex via Zenodo target](https://zenodo.org/records/5121268) | Existing project target; broad concept wordlist candidate. | Verify local download/index status before new fetch. |

## Priority Plan

### P0 - Immediate research queue

1. `AZ`: focus on LLM.az, AZ-EN HF corpus, Kaikki Azerbaijani and official lexical database leads.
2. `KK`: find an ungated substitute or mirror for KazParC, starting with the Zenodo Kazakh-English parallel corpora.
3. `MY`: inspect Myanmar Open Wordnet and HF Burmese Dictionary/lexicon leads.
4. `KM`: inspect Khmer lexicon/dictionary HF leads and decide if monolingual Khmer can help display/POS sanity.

These are the highest value because HSK6 currently has incomplete `AZ`, `KA`, `HY`, `TR`, `SW`, `PT-BR` and `ES-419` packs, and `AZ` specifically reports no source candidates in the current HSK6 source audit.

### P1 - Next useful layer

1. `LO`: evaluate Lao UKC Lexicon against SEAlang coverage.
2. `NE`: inspect Nepali-Datasets registry and Nepali Brihat Sabdakosh JSON.
3. `SW`: inspect Kamusi, Swahili UKC and LingDy export options.
4. `KA`: find a second Georgian source beyond Darsala.

### P2 - Broad coverage

1. Indic group: use AI4Bharat catalog/IndicTrans2/IndoWordNet as registry-style leads.
2. `TL`: inspect translation and dictionary scraper leads only after higher blockers are handled.
3. `HY`: continue targeted open-source search; no strong open structured candidate found in this first pass beyond Kaikki-style coverage and commercial Lexicala.
4. Cross-language CLDF: evaluate Lexibank/Concepticon/NorthEuraLex as concept sanity, not row approval.

## Activation Workflow

For any candidate above:

1. Confirm it has a downloadable structured artifact or stable API.
2. Inspect columns, language code, script, dialect, direction, examples, POS and license/terms notes.
3. Add a candidate row to `reference-sources/optional-tool-source-targets.json` or `reference-sources/bulk-source-groups.json`; do not edit `sources.manifest.json` until the file is actually fetched or registered.
4. Fetch into ignored `reference-sources/raw/` only through `scripts/fetch-optional-tool-sources.mjs` or a documented source-specific helper.
5. Build/rebuild ignored `reference-sources/cache/` indexes.
6. Run the relevant smoke/preflight check:

```bash
node scripts/check-reference-sources-cache.mjs
node scripts/build-bulk-source-indexes.mjs --source=weak-dictionaries
node scripts/build-bulk-source-indexes.mjs --source=weak-examples
node scripts/check-language-batch-source-preflight.mjs <draft.jsonl>
```

7. Keep output as `source_partial` unless a separate current-value source decision or policy gate proves the exact LunaCards value and sense.

## Not Done

- `AZ` LocalDoc size-balanced parquet was downloaded, registered in `reference-sources/sources.manifest.json`, added to optional source targets and indexed into `weak_example_collocations.jsonl` on 2026-06-02.
- `SW` Kalebu/kamusi `words.csv` was downloaded, registered in `reference-sources/sources.manifest.json`, added to optional source targets and indexed into `weak_dictionary_candidates.jsonl` on 2026-06-02.
- `KK` Zenodo Kazakh-English parallel corpora v1 zip, `KM` seanghay/lexicon-kh parquet, `MY` Myanmar Open Wordnet tab and `NE` Nepali Brihat Sabdakosh JSON gzip were downloaded, registered in `reference-sources/sources.manifest.json`, added to optional source targets and indexed on 2026-06-02.
- `LO` Lao UKC and `SW` Swahili UKC were probed on 2026-06-02, but the public proxy returned HTML rather than zip content, so they were not activated.
- No source-policy edits.
- No Postgres import, Google Sheet update or HSK workbook mutation.
- No legal/terms approval beyond recording public candidate links and obvious risk notes.
