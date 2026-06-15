# Product Development Roadmap

Этот документ является верхнеуровневой картой развития продукта LunaCards.

Он отвечает на вопрос: какие направления продукта развивать дальше и где лежит подробный source of truth по каждому направлению.

Он не заменяет:

- [Deck Master Plan](deck-master-plan.md) - единственный operational backlog, `Sort`, статусы and next deck order for ordinary thematic decks;
- [Content Roadmap](product-content-roadmap.md) - content grouping principles and vocabulary-only theme ladder;
- [Course And Exam Release Roadmap](course-exam-release-roadmap.md) - course/exam release lines such as English Core 3000, HSK, JLPT, TOPIK and IELTS/TOEFL/TOEIC;
- [Content Coverage Map](content-coverage-map.md) - current coverage and gaps;
- [QA Process](qa-process.md) and [Data Delivery Pipeline](data-delivery-pipeline.md) - executable creation, QA, export and Google Sheets delivery contour.

If this document conflicts with a source-specific document, stop and update the documentation before production work. This file should point to the right source of truth; it must not become a second hidden queue.

## Product Pillars

| Pillar | Product goal | Current source of truth | Current posture |
| --- | --- | --- | --- |
| Ordinary thematic vocabulary decks | Build practical 54-language flashcard decks for everyday domains. | [Deck Master Plan](deck-master-plan.md), [Deck Specs Registry](deck-specs/README.md), [Content Roadmap](product-content-roadmap.md) | Active production path. After reset, rebuilds go through the stage-runner and Google Sheets delivery. |
| Course and exam releases | Build recognizable workbook/course lines for English Core, HSK, JLPT, TOPIK, CEFR and exam vocabulary. | [Course And Exam Release Roadmap](course-exam-release-roadmap.md), [Course Source-Assisted Generation](course-source-assisted-generation.md), release-specific contracts | Planning and source-assisted draft work; each release needs its own contract before final delivery. |
| Source-assisted quality layer | Use local dictionaries, corpora, pronunciation sources and optional MT sanity to catch weak rows before import. | [Reference Sources](reference-sources.md), [Course Source-Assisted Generation](course-source-assisted-generation.md), [QA Process](qa-process.md) | Active in pre-import preflight. Sources are candidate evidence, not final truth. |
| Quality and delivery automation | Make creation reproducible, fail-closed and resumable without relying on prompt memory. | [QA Process](qa-process.md), [Data Delivery Pipeline](data-delivery-pipeline.md), [Cloud Automation](cloud-automation.md) | Active through `scripts/run-deck-production.mjs` and run manifests. |
| Future non-language flashcards | Explore cards for medicine, exams, school subjects, business, IT, kids learning and general knowledge. | This document for product direction; future dedicated docs if approved | Product opportunity only. Not in current production scope until a source/QA/content contract is created. |

## Current Product Phase

The current phase is:

```text
Post-reset ordinary thematic deck rebuild
-> source-assisted 54-language generation
-> Google Sheets delivery
-> one-deck-at-a-time scale-up across the 180-deck backlog
```

Current operating rules:

- post-reset generated status is valid only for decks rebuilt from the clean DB through the runner;
- old Google Sheets and pre-reset outputs are historical unless deliberately replaced;
- next ordinary deck comes from [Deck Master Plan](deck-master-plan.md), not from this document or chat memory;
- `planned` is not generation approval;
- every deck needs a spec, candidate pool, explicit `approved_for_generation`, pre-import source preflight, QA, final export, Drive upload/readback, post-final audit and freshness.

## Development Stages

| Stage | Meaning | Exit criteria | Source of truth |
| --- | --- | --- | --- |
| Stage 0: Foundation | Prove data model, 54-language policy, transcription formats and spreadsheet contract. | Core docs, DB schema, language table and export contract exist. | [Database Schema](database-schema.md), [Language Transcription Policy](language-transcription-policy.md), [Data Delivery Pipeline](data-delivery-pipeline.md) |
| Stage 1: Post-reset pilot and rebuild | Rebuild first ordinary decks after DB reset under current gates. | Delivered decks pass runner `complete`, readback, post-final audit and freshness. | [Deck Master Plan](deck-master-plan.md), [Content Coverage Map](content-coverage-map.md), [QA Process](qa-process.md) |
| Stage 2: 180-deck everyday coverage | Continue ordinary thematic decks in controlled order. | Each deck has current final Google Sheet delivery and QA evidence. | [Deck Master Plan](deck-master-plan.md), [Deck Specs Registry](deck-specs/README.md) |
| Stage 3: Course/exam releases | Add recognizable course workbooks such as English Core 3000, HSK, JLPT and TOPIK. | Release-specific source contract, workbook contract and QA path pass. | [Course And Exam Release Roadmap](course-exam-release-roadmap.md), [Course Source-Assisted Generation](course-source-assisted-generation.md) |
| Stage 4: Quality uplift | Add targeted weak-language sources, native review lanes and stronger gates where useful. | Weak-language blockers become reviewable source conflicts, not silent errors. | [Reference Sources](reference-sources.md), [QA Process](qa-process.md), [Language Specific Rules](language-specific-rules.md) |
| Stage 5: Delivery/product expansion | Decide whether LunaCards remains spreadsheet-first or expands to app/API/marketplace flows. | Separate approved product/delivery contract exists. | Future doc; current scope ends at spreadsheet delivery. |
| Stage 6: Non-language learning cards | Explore cards outside language learning. | Separate content model, source rules and QA contract exist. | Future doc if approved. |

## Ordinary Deck Roadmap

Ordinary decks are the current production path.

Summary:

- 180-deck backlog remains in [Deck Master Plan](deck-master-plan.md);
- Home Rooms First is the current post-reset route;
- Core Foundation follows after the early home path;
- Food, city, travel, services, money, health, work/study, technology, people, time, nature and leisure follow the documented order.

This document does not repeat the 180 rows. Repeating them here would create a second queue and a drift risk.

Operational links:

- exact next deck: [Deck Master Plan](deck-master-plan.md);
- physical specs and status registry: [Deck Specs Registry](deck-specs/README.md);
- coverage/gaps view: [Content Coverage Map](content-coverage-map.md);
- content split principles: [Content Roadmap](product-content-roadmap.md);
- taxonomy: [Card Taxonomy](card-taxonomy.md).

## Course And Exam Roadmap

Course/exam releases are a separate product line from ordinary thematic decks.

Priority direction:

1. `English Core 3000` as the safest first broad course line.
2. `HSK Classic` for Chinese-source vocabulary workbooks.
3. `JLPT` and Japanese Core after a JLPT/JMdict/source contract.
4. `TOPIK` and Korean Core with NIKL/source-backed support.
5. English exam vocabulary: IELTS, TOEFL, TOEIC.
6. European CEFR and exam-oriented vocabulary lines.
7. Core 1000/3000 releases for remaining languages where exam frameworks are weaker.

Operational links:

- strategic priority: [Course And Exam Release Roadmap](course-exam-release-roadmap.md);
- source-assisted rules for non-English-source courses: [Course Source-Assisted Generation](course-source-assisted-generation.md);
- English Core source plan: [English Core 3000 Source Plan](english-core-3000-source-plan.md);
- Oxford benchmark posture: [Oxford Vocabulary Release Plan](oxford-vocabulary-release-plan.md);
- HSK release contract: [HSK Classic Release Plan](hsk-classic-release-plan.md).

## Quality Roadmap

Quality development is not "make the prompt longer". It is:

```text
spec/candidate pool
-> source-assisted draft preflight
-> hash-guarded import
-> deterministic QA
-> sample/native-style audit
-> final export/readback/audit/freshness
```

Current quality posture:

- automatic gates are fail-closed for known structural problems;
- local dictionaries/corpora are active as source candidates;
- Google Translate or other MT can be optional sanity only, never truth;
- non-RU target languages remain at most `generated_checked` unless a native approval lane is explicitly added;
- weak-source languages need one-language batches and stronger review attention.

Future quality improvements:

- add targeted native review for weak languages and high-risk rows;
- keep expanding source adapters only when they feed pre-import reports and smoke tests;
- avoid bulk downloads that are not indexed or used by preflight;
- add product-level quality dashboards once several post-reset decks are complete.

Operational links:

- gates and evidence families: [QA Process](qa-process.md);
- source inventory and adapters: [Reference Sources](reference-sources.md);
- language-specific traps: [Language Specific Rules](language-specific-rules.md);
- transcription formats: [Language Transcription Policy](language-transcription-policy.md);
- spreadsheet delivery contract: [Data Delivery Pipeline](data-delivery-pipeline.md).

## Future Non-Language Flashcards

People also study many non-language topics through flashcards:

- medicine and anatomy;
- law and compliance;
- school and university subjects;
- exam prep;
- programming, cybersecurity and cloud tools;
- finance and business;
- music theory;
- kids learning;
- general knowledge.

These are not current LunaCards production scope. If approved later, each non-language line needs its own contract before any generation:

```text
content model
source/licence posture
QA criteria
card fields
review workflow
delivery format
```

Do not mix non-language cards into the 180 ordinary language deck backlog. They should become separate product lines only after a documented decision.

## What To Read For Common Decisions

| Question | Read first |
| --- | --- |
| What ordinary deck do we create next? | [Deck Master Plan](deck-master-plan.md) |
| Why is a theme split into smaller decks? | [Content Roadmap](product-content-roadmap.md) |
| What is already covered or still weak? | [Content Coverage Map](content-coverage-map.md) |
| How do we create a deck without skipping steps? | [Content Build Plan](content-build-plan.md), [QA Process](qa-process.md), [Data Delivery Pipeline](data-delivery-pipeline.md) |
| Which sources/dictionaries are active? | [Reference Sources](reference-sources.md) |
| How do HSK/Oxford/English Core courses work? | [Course And Exam Release Roadmap](course-exam-release-roadmap.md), [Course Source-Assisted Generation](course-source-assisted-generation.md) |
| Can we add non-language cards? | This document first; then create a dedicated source/QA/content contract if approved. |
