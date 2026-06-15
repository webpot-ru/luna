# Deck Spec: Numbers & Counting

## Identity

| Field | Value |
| --- | --- |
| Sort | 16 |
| Deck | Numbers & Counting |
| `set_id` | `core_numbers_counting_a1` |
| Content type | Vocabulary |
| Domain | Core Foundation |
| Area | Numbers & Counting |
| Category / situation | Basic cardinal numbers and counting words |
| Status | generated |

Reset note: this spec was retained as a planning reference after the 2026-05-02 clean-start reset. Historical 44-card generated rows and Google Sheet delivery exist under the old pre-reset Sort 5, but this deck is now Sort 16 in the Home Rooms First post-reset route. On 2026-05-17 the candidate pool was refreshed to the current stricter word-selection contract, the deck was rebuilt through `scripts/run-deck-production.mjs`, and the fresh post-reset delivery now counts as current coverage.

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | closed_set, number_quantity, transcription_high_risk |
| `risk_flags` | number_grammar, compound_whole_meaning, scene_slot_strict |

## Scope

One learner-facing grouping principle: a closed Core Foundation set for A1 number words and the smallest reusable counting vocabulary.

Include:

- cardinal numbers needed for basic A1 counting: zero, one through twenty, the tens from thirty through ninety, one representative compound number per decade from the 20s through 90s, ninety-nine as the pre-100 boundary, one hundred and one thousand;
- basic counting lexical items that are short, reusable and not tied to money, dates, phone numbers or forms: number, to count and total only when the selected example stays pure counting;
- first and second as the only ordinal items because they are early, short and useful for simple ordering examples;
- English display forms without artificial articles for number words, with `to + base verb` for the verb `to count`;
- simple controlled examples with concrete countable objects or ordering scenes that can translate cleanly across all 54 active language variants.

Exclude / move elsewhere:

- math operations and school-math terms such as plus, minus, multiply, divide, equation, answer and calculator -> later learning/school or math-support deck only if approved;
- prices, payment, change, receipt, cash, card, discount and bill -> `Price & Payment Words`, `Cash, Cards & Payments` or shopping/money decks;
- dates, weekdays, months, times, clock words and scheduling words -> `Time & Days` or `Calendar Dates & Scheduling Words`;
- phone numbers, account numbers, form fields, postcode, address and contact-detail wording -> `Address & Contact Details` or Documents/Administration decks;
- advanced ordinals beyond first/second, fractions, decimals, percentages, score words and number ranges -> later sequence/math/quantity deck after separate approval;
- long learner phrases such as `What is your phone number?`, `I need two tickets` or `How much is it?` -> out of vocabulary-only scope or moved to the relevant vocabulary deck as individual lexical items.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Basic |
| `level_min` | A1 |
| `level_max` | A1 |
| `frequency_band` scope | core |
| `priority_band` scope | core |
| Target item range | 44-44 |

## Candidate Pool Rule

Build a machine-readable candidate pool from A1 number/counting candidates before generation. The pool must be wider than the final selected set and must include selected, backup and excluded decisions. Selected rows must stay inside Core Foundation / Numbers & Counting and avoid scenario-specific uses from money, time, phone/forms or school math. Backup rows can include compositional number words or simple quantity words that are valid but not needed in the first A1 deck. Excluded rows must state the target deck or reason, for example payment, calendar, contact details, math operations or advanced quantities.

The final selected set should cover the smallest complete learner-useful counting layer without padding: zero, one through twenty, tens through ninety, one representative compound number per decade from `twenty-one` through `ninety-eight`, `ninety-nine` as the pre-100 boundary, one hundred, one thousand, and only the basic counting words that pass source, duplicate and example feasibility checks. If the candidate pool reveals duplicate risk, unclear target range, weak example feasibility or source-backed translation/transcription blockers, stop at `spec_ready` and ask for user confirmation instead of promoting the deck.

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck is completed: `Colors & Shapes` (Sort 17);
- related Core Foundation continuations: `Pronouns & People Basics` (Sort 18), `Question Words` (Sort 19), `Basic Verbs` (Sort 20);
- later adjacent vocabulary, not part of this deck: `Time & Days` (Sort 22), `Price & Payment Words` (Sort 56), `Address & Contact Details` (Sort 144), `Calendar Dates & Scheduling Words` (Sort 179).

## QA Notes

Current post-reset final status on 2026-05-17: this deck is current/generated as `core_numbers_counting_a1` with 44 selected cards and 54 active language variants. It was rebuilt through runner `run_core_numbers_counting_a1_20260517T030122919Z_460b70fa` and completed `prepare -> base -> draft-preflight -> batch-import -> qa -> export -> deliver -> complete`. Postgres statuses are `generated_checked` for the content set, 54 Course Metadata rows, 44 memberships, 44 meaning units, 2,376 language entries and 2,376 translated examples; non-RU rows remain machine/source-backed `generated_checked`, not native-approved. The final workbook is `outputs/google-sheets/FlashcardsLuna_numbers-counting_final.xlsx`, workbook hash `e71b485938e72085bf5bb1a03f48ce63cf6697aad2528ffb137272ff332d8c2b`, and new final Sheet id is `1BWfmAdcRXOHfV8XLyUOuV5Z0GOwlnJLviFRg-GdPkJY` with title `FlashcardsLuna 016 of 180 - Numbers & Counting` in Drive folder `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`. Readback verified 504 sample cells through Sheets API, sample audit `outputs/qa/sample_card_quality_audit_core_numbers_counting_a1_6_per_language_20260517.json` checked 324 rows with 0 blockers, post-final linguistic audit `outputs/audit/final_linguistic_audit_core_numbers_counting_a1_20260517T093039Z_results_summary.json` reports 2,376 pass / 0 needs_review / 0 fail, and `node scripts/check-delivery-freshness.mjs core_numbers_counting_a1` passes.

Historical repair note on 2026-05-02 before reset: user review found that the first delivered target examples preserved only a meta-template (`Number: zero.`, `Nombre: zéro.`, `Число: ноль.`) while EN examples used concrete scenes such as `Zero apples are in the basket.` The repair kept the EN examples and selected meanings unchanged, replaced all 1,890 target examples through `outputs/import/core_numbers_counting_a1_example_scene_repair_20260502.jsonl`, refreshed evidence and updated the same Google Sheet id. After the 2026-05-02 reset, those rows are no longer active in local Postgres.

Compound-number expansion note on 2026-05-02: user approved adding exactly nine compositional rows to show number formation by decade: `twenty-one`, `thirty-two`, `forty-three`, `fifty-four`, `sixty-five`, `seventy-six`, `eighty-seven`, `ninety-eight` and `ninety-nine`. The expansion keeps the first 35 selected meanings and EN examples unchanged, adds the nine rows at display orders 36-44, imports all 54 active language variants, repairs one confirmed PT agreement issue (`Trinta e duas chaves estão na caixa.`), refreshes structural/source-backed QA evidence, updates the same Google Sheet id, and final target-scene alignment reports 2,376 supported/proof-backed rows, 0 skipped rows and 0 blockers.

Number-example grammar repair note on 2026-05-02: user review found number + noun agreement / classifier / linker / script issues in risk languages after the compound expansion. The repair is limited to examples; selected words, transcriptions, candidate pool and spec scope remain unchanged. `outputs/import/core_numbers_counting_a1_number_grammar_example_repair_20260502.jsonl` repaired 147 confirmed target example rows across `BG`, `HR`, `SR`, `LV`, `PT-BR`, `RO`, `KO`, `TL` and `IS`. New fail-closed evidence family `number_example_grammar` is required for this deck; `node scripts/check-number-example-grammar.mjs core_numbers_counting_a1` reports 2,376 checked rows and 0 blockers. Sample audit reports `outputs/qa/sample_card_quality_core_numbers_counting_a1_20260502.json` (270 rows) and `outputs/qa/sample_card_quality_core_numbers_counting_a1_forced_number_grammar_repair_20260502.json` (147 forced repaired rows) both have 0 blockers.

- Historical note: this deck was approved for generation after user-confirmed current-value/component source decisions for the selected-row high-risk transcription lookup gaps, then generated and delivered before the 2026-05-02 reset. That old delivery is historical only; the current post-reset delivery is the 2026-05-17 runner rebuild and new Sheet id above.
- Candidate pool `outputs/candidate-pools/core_numbers_counting_a1_candidate_pool.jsonl` passes `node scripts/check-deck-candidate-pool.mjs core_numbers_counting_a1` and `node scripts/check-word-selection-quality.mjs core_numbers_counting_a1 --strict-warnings` as of 2026-05-17: 88 rows, 44 selected, 24 backup and 20 excluded/move decisions.
- Any future rebuild must pass `node scripts/check-deck-specs.mjs` and `node scripts/check-deck-ready.mjs core_numbers_counting_a1` only after the spec and candidate pool are current.
- Before creating base deck rows, run meaning reuse planning against the current base; surface-only matches are not enough to reuse existing `meaning_id`.
- English examples must be short, concrete, natural and varied. Avoid repeated weak templates such as many rows of `I need ...`, generic placeholders such as `things`, and scenario-specific examples about prices, dates, phone numbers or forms.
- `semantic_scene` must preserve the counted object or simple ordering scene, target number/word, subject number, action/state, location or simple usage context, tense/aspect and `Core Foundation / Numbers & Counting` topic context.
- `word_selection_quality` must fail any selected row that belongs better to money/payment, time/calendar, documents/contact details, school math or advanced quantity language.
- Language-specific risks: number systems can be irregular, gender/classifier-sensitive or compounding-heavy; examples must not force English number order where the target language uses a natural form. For this deck and future quantity decks, `number_example_grammar` evidence must prove number + noun agreement, classifier/counter/linker requirements, script consistency and scene preservation.
- Ordinal risk: first and second are allowed as early ordering words, but third and later ordinals stay out of this first deck unless a future scope change is explicitly approved.
- Transcription risks follow the current source-backed policy: IPA languages need current `pronunciation_accuracy`; `ZH` requires tone-marked Hanyu Pinyin; `TH`/`LO`/`MY`/`KM`/`HY` strict high-risk lookup applies; native-copy languages repeat display word exactly.
- Resolved source-decision gate: the high-risk probe artifact `outputs/tmp/core_numbers_high_risk_probe.jsonl` found exact lookup gaps for selected Numbers & Counting rows, and the compound expansion added further TH/KM/MY component-number gaps. User confirmed current-value/component source decisions on 2026-05-02. Final source-backed checks for this set use 48 high-risk transcription decisions in `reference-sources/manual-decisions/high-risk-transcription-decisions.jsonl`, 4 source-backed compound transcription repairs in `outputs/import/core_numbers_counting_a1_compound_transcription_repair_20260502.jsonl`, and 2 entry-source decisions for English-shaped zero rows in `reference-sources/manual-decisions/entry-source-decisions.jsonl`.
- Source-backed translation risks: English-looking native-copy forms such as international loans must be repaired or current-value source-decision locked; do not pass them by surface similarity.
- Course Metadata should use a short title such as `Numbers` and a description that contains the exact localized `Basic level` signal, for example `Count and order. Basic level.`
