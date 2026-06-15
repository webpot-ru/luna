# Course And Exam Release Roadmap

Этот документ является source of truth по стратегической карте course/exam release-линеек LunaCards.

Он отвечает за то, какие внешне узнаваемые учебные курсы, экзамены, wordlists and proficiency frameworks можно использовать как market benchmark, source candidate or release direction. Он не заменяет [Deck Master Plan](deck-master-plan.md), [HSK Classic Release Plan](hsk-classic-release-plan.md), [Reference Sources](reference-sources.md) или обычный production deck workflow.

## Scope

Course/exam releases отличаются от обычных тематических LunaCards deck exports:

- release-линейка строится вокруг узнаваемого учебного контура: English Core, IELTS, TOEFL, TOEIC, HSK, JLPT, TOPIK, CEFR A1-C2, Goethe, DELF/DALF, DELE and comparable frameworks;
- один workbook может соответствовать одному course/exam выпуску или уровню;
- строки workbook = vocabulary items or short lexical items for that release;
- языки LunaCards идут столбцами в фиксированном порядке из `config/language-order.json`;
- карточки остаются vocabulary-first; готовые многострочные сценарии не становятся отдельными карточками;
- target-language transcription/audio не входят в scope course/exam release unless a separate contract explicitly adds them.

Course/exam roadmap не задает `Sort` для обычных тематических колод. Operational order for normal decks stays only in [Deck Master Plan](deck-master-plan.md). HSK-specific workbook contract stays in [HSK Classic Release Plan](hsk-classic-release-plan.md).

## Source vs Benchmark

Project terms:

| Term | Meaning | Rule |
| --- | --- | --- |
| Source | Источник, из которого можно реально брать data into LunaCards after license/source review. | Must have explicit usable license, permission, public-domain status, or internal curation decision. |
| Benchmark | Ориентир для сравнения спроса, покрытия, уровней, тем and learner expectations. | Can guide product planning, but must not be copied as the release data source without permission. |
| Reference/QA source | Словарь, corpus, article, app page, community deck or exam page used for sanity checks. | Candidate evidence only unless promoted by documented license/source decision. |

Do not rename a restricted/proprietary list and treat it as original. If source composition, order, level labels, definitions or examples come from a protected list, changing the title does not remove source risk.

## Priority Roadmap

| Priority | Release line | Active languages / variants | Product reason | Source posture |
| --- | --- | --- | --- | --- |
| 1 | English Core 3000 | First release: `EN` / US English source with all 54 language columns; `EN-GB` included as text/example only, no British transcription | Universal foundation; also supports later IELTS/TOEFL/TOEIC and CEFR decks. | Prefer open/usable source list such as NGSL + CEFR-J cross-check + internal curation. Oxford 3000/5000 and Cambridge EVP are benchmark only unless permission is obtained. |
| 2 | HSK Chinese | `ZH` source with 54 translation columns | Already started; strong flashcard demand; clear levels and pinyin needs. | Current classic HSK source is documented separately as MIT-backed source. HSK 3.0 is a separate contour whose official ChineseTest/PDF source setup lives in [HSK 3.0 Release Plan](hsk-3-release-plan.md). |
| 3 | JLPT Japanese | `JA` source with 54 translation columns | Very high flashcard demand: N5-N1 vocabulary, kanji and grammar-adjacent study. | JLPT is benchmark; use JMdict/Kaikki/frequency/internal curation as source candidates because official JLPT does not publish a clean open vocabulary list for direct reuse. |
| 4 | TOPIK Korean | `KO` source with 54 translation columns | Strong demand for TOPIK I/II study; good learner-dictionary support. | TOPIK is benchmark; NIKL Korean Learners' Dictionary is a strong reference/source candidate subject to the documented licence rules. |
| 5 | English Exam Vocabulary | `EN`, `EN-GB`, all 54 translation columns | IELTS, TOEFL and TOEIC have high demand and clear user intent: academic, migration and workplace English. | Exams are benchmark; source should be NGSL/NAWL/academic/business open lists plus internal curation. Do not copy proprietary test-prep books or paid decks. |
| 6 | European CEFR Exam Lines | `DE`, `FR`, `ES`, `IT`, `PT`, `PT-BR`, `RU`, plus other European languages | A1-B2/C1 decks map well to learner expectations and local exams. | CEFR and exam pages are benchmark; source comes from open dictionaries, corpora, frequency lists and internal curation. Official exam PDFs require separate permission before direct reuse. |
| 7 | Core 1000/3000 For Remaining Languages | `VI`, `TH`, `MS`, `ID`, `HI`, `BN`, `TL`, `MY`, `KM`, `LO`, `NE`, `SI`, `TA`, `TE`, `KN`, `ML`, `UZ`, `KK`, `AZ`, `KA`, `HY`, `TR`, `SW`, etc. | Covers long-tail languages where strong exam frameworks may be absent or weak. | Use source stack from [Reference Sources](reference-sources.md), with stricter manual QA for weak-source languages. |

## Market Demand Map

| Demand tier | Languages / variants | High-demand course or exam signals | Recommended LunaCards releases |
| --- | --- | --- | --- |
| Tier 1 | `EN`, `EN-GB`, `ZH`, `JA`, `KO`, `ES`, `FR`, `DE` | IELTS/TOEFL/TOEIC/Cambridge; HSK; JLPT; TOPIK; DELE; DELF/DALF; Goethe/telc/TestDaF. | English Core 3000; English Exam Vocabulary; HSK Classic/3.0; JLPT N5/N4 first; TOPIK I; CEFR A1/A2 German/French/Spanish. |
| Tier 2 | `IT`, `PT`, `PT-BR`, `RU`, `NL`, `SV`, `NO`, `DA`, `FI`, `PL`, `CS`, `TR` | CILS/CELI/PLIDA; CAPLE/Celpe-Bras; TORFL/TRKI; NT2/CNaVT; SFI/TISUS; Norskprove; Prove i Dansk; YKI; local CEFR exams. | CEFR A1-B2 vocabulary releases and practical Core 1000/3000 decks. |
| Tier 3 | `VI`, `TH`, `ID`, `MS`, `HI`, `BN`, `TA`, `TE`, `KN`, `ML`, `NE`, `SI` | Demand exists, but internationally standardized vocab exams are less consistently reusable. | Core 1000/3000, travel, work, daily-life and high-utility thematic decks. |
| Tier 4 | `TL`, `MY`, `KM`, `LO`, `UZ`, `KK`, `AZ`, `KA`, `HY`, `SW`, `IS`, `ET`, `LV`, `LT`, `SL`, `SR`, `HR`, `BG`, `HU`, `RO`, `SK` | More niche demand or weaker open course-source ecosystem. | Core 1000/3000 plus domain decks; require stronger source tracking and manual QA. |

## Recommended First Release

Start with:

```text
release_id: english_core_3000_v1
working_title: LunaCards English Core 3000
source_language: EN
source_variant: American English / US default
regional_variant: EN-GB included as text/example column; no EN-GB transcription in first release
first_release_language_columns: 54
```

Reason:

- it is useful to every learner direction, not only English learners;
- it creates a reusable core meaning base for later exam and CEFR releases;
- it can be built from more usable sources than Oxford/Cambridge proprietary lists;
- it gives a stable benchmark layer for translation/source coverage across all 54 languages.

Recommended source posture:

| Layer | Role |
| --- | --- |
| NGSL | Primary candidate list for foundational English core vocabulary; source-acquisition rules live in [English Core 3000 Source Plan](english-core-3000-source-plan.md). |
| CEFR-J | CEFR-level cross-check and commercial-use-with-citation candidate, subject to source review and snapshot rules in [English Core 3000 Source Plan](english-core-3000-source-plan.md). |
| Wiktionary/Kaikki, FreeDict, DBnary, Wikidata, Tatoeba | Translation/reference/example candidate sources as documented in [Reference Sources](reference-sources.md). |
| Oxford 3000/5000, Cambridge English Vocabulary Profile | Benchmark/licensing target; local source-package work requires a documented permission state, and final learner-facing delivery requires stored evidence or an explicit project evidence decision. |
| Internal curation | Final source of LunaCards `meaning_id`, meaning notes, semantic scenes and learner-facing examples. |

## Candidate Release Lines

### English

| Release line | Suggested first slice | Source posture |
| --- | --- | --- |
| English Core 3000 | Level-sliced releases: first safe pilot `english_core_3000_a1_a2_part_001_150_v1`, then A1/A2, B1 and B2 chunks up to the Core 3000 line. | NGSL/CEFR-J/open sources + internal curation under [English Core 3000 Source Plan](english-core-3000-source-plan.md). |
| Oxford 3000/5000 Vocabulary | Current first source-draft is `oxford_3000_core_a1_part_001_150_v1`: 150 A1-only rows for `Oxford 3000 Core`. | User-reported OUP permission allows local source-package work; written evidence/final delivery gates live in [Oxford Vocabulary Release Plan](oxford-vocabulary-release-plan.md). |
| IELTS Vocabulary | Academic and general-training topic vocabulary. | Benchmark IELTS; source via NAWL/NGSL/open academic vocabulary and internal examples. |
| TOEFL Academic | Academic study, campus, lecture and research vocabulary. | Benchmark TOEFL; source via open academic lists and internal curation. |
| TOEIC Business | Workplace, office, meetings, hiring, travel and service vocabulary. | Benchmark TOEIC; source via business wordlists with usable licences and internal curation. |
| US vs UK English | Variant pairs and spelling/lexical differences. | Internal curation + dictionaries as reference. |

Oxford product packaging decision lives in [Oxford Vocabulary Release Plan](oxford-vocabulary-release-plan.md). User-facing packaging should be `Oxford 3000 Core` plus `Oxford 5000 Advanced Extension`, with a `Complete Oxford 3000 + 5000 Vocabulary` bundle. Internal production can use 19 parts at roughly 250-300 rows each, but those parts should not become 19 unrelated products.

### Chinese

| Release line | Suggested first slice | Source posture |
| --- | --- | --- |
| HSK Classic 2.0 | Continue HSK1 -> HSK2 -> HSK3 etc. | Existing MIT-backed source contract for classic HSK work. |
| HSK 3.0 | Level 1 first (`hsk3_level_1_300_v1`). | Official ChineseTest new HSK syllabus PDF is the source-of-truth for source snapshots; keep separate from Classic HSK and build row-level Classic overlap before reuse. |

### Japanese

| Release line | Suggested first slice | Source posture |
| --- | --- | --- |
| JLPT | N5, then N4. | JLPT benchmark; JMdict/Kaikki/frequency/internal curation as source candidates. |
| Japanese Core | Core 1000/2000/3000. | JMdict + frequency/source stack + internal curation. |

### Korean

| Release line | Suggested first slice | Source posture |
| --- | --- | --- |
| TOPIK | TOPIK I beginner vocabulary. | TOPIK benchmark; NIKL Korean Learners' Dictionary and internal curation as source candidates. |
| Korean Core | Core 1000/2000/3000. | NIKL/Kaikki/Tatoeba/source stack + internal curation. |

### European CEFR Lines

| Language | Benchmark examples | Suggested first slice |
| --- | --- | --- |
| `DE` | Goethe, telc, TestDaF | German A1 Core Vocabulary |
| `FR` | DELF/DALF, TCF | French A1 Core Vocabulary |
| `ES`, `ES-419` | DELE, SIELE | Spanish A1 Core Vocabulary with regional variants |
| `IT` | CILS, CELI, PLIDA | Italian A1 Core Vocabulary |
| `PT`, `PT-BR` | CAPLE, Celpe-Bras | Portuguese A1 Core Vocabulary with regional variants |
| `RU` | TORFL/TRKI | Russian A1 Core Vocabulary |
| `NL` | NT2, CNaVT | Dutch A1 Core Vocabulary |
| `SV` | SFI, TISUS | Swedish A1 Core Vocabulary |
| `NO` | Norskprove | Norwegian Bokmal A1 Core Vocabulary |
| `DA` | Prove i Dansk | Danish A1 Core Vocabulary |
| `FI` | YKI | Finnish A1 Core Vocabulary |

## Guardrails

Spanish kickoff note: the first Spanish release line is now scoped in [Spanish A1 Core Release Plan](spanish-a1-core-release-plan.md) with machine-readable contract `config/spanish-a1-core-release-contract-v1.json`, source advisory reviewer `scripts/spanish-a1/review-spanish-a1-source-advisories.mjs`, support-generation planner `scripts/spanish-a1/prepare-spanish-a1-support-generation-plan.mjs` and executable release gate `scripts/spanish-a1/check-spanish-a1-release-gate.mjs`. It remains a special course workbook contour, not an ordinary Deck Master Plan `Sort`, until the user explicitly approves a different packaging decision.

- Do not copy proprietary course lists, paid decks, Quizlet/Anki user decks, commercial textbook vocabulary sections, or official exam PDFs into LunaCards without a documented permission/licence decision.
- Do not market benchmark-derived releases as official, certified, endorsed or approved by the benchmark owner.
- If a benchmark is not a source, workbook metadata must not imply source ownership or official alignment.
- If a release uses CC BY-SA, GPL, GFDL or comparable copyleft data, its attribution/share-alike impact must be reviewed before packaging.
- For weak-source languages, source-preflight warnings and manual QA are expected, not optional.
- Course/exam release scripts must preserve the 54-language column order from `config/language-order.json`.

## Documentation Rules

Before starting any new course/exam release:

1. Update this roadmap if the release line or priority is not already represented.
2. Create a release-specific source/contract document or extend an existing one if the release has a distinct workbook contract.
3. Record source/benchmark/license posture in [Reference Sources](reference-sources.md) or in the release contract.
4. If the release becomes an ordinary generated deck, add or update its row in [Deck Master Plan](deck-master-plan.md) and create a deck spec in [Deck Specs Registry](deck-specs/README.md).
5. If the release remains a special workbook like HSK, keep it outside normal deck `Sort` but document its contract and QA scripts.
