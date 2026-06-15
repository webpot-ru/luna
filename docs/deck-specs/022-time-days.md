# Deck Spec: Time & Days

## Identity

| Field | Value |
| --- | --- |
| Sort | 22 |
| Deck | Time & Days |
| `set_id` | `core_time_days_a1_a2` |
| Content type | Vocabulary |
| Domain | Time, Calendar & Events |
| Area | Time & Days |
| Category / situation | Core time words, day parts, weekdays and simple relative time expressions |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | time_calendar, closed_set, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | time_calendar_scope, weekday_closed_set, relative_time_reference, unit_vs_calendar_period, adverb_preposition_risk, compound_multiword_time_expression, example_scene_strict, article_gender_marker, regional_variant_quality |
| Example complexity default | controlled short time scenes with one time expression plus one simple event/action slot; avoid full dates, clock-reading complexity and schedule/admin wording unless the selected meaning requires it |

## Scope

One learner-facing grouping principle: a Core Foundation time vocabulary deck for common A1-A2 words learners need to understand days, parts of the day, simple time units, weekdays and basic relative time references.

Include:

- core time nouns and units: `time`, `day`, `week`, `month`, `year`, `hour`, `minute`, `second`;
- common parts of the day: `morning`, `afternoon`, `evening`, `night`, `noon`, `midnight`;
- relative day/time words: `today`, `tomorrow`, `yesterday`, `tonight`, `now`, `soon`, `later`, `early`, `late`;
- weekday closed set: `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`, `Saturday`, `Sunday`;
- short learner-friendly time expressions where the whole phrase is common and useful: `weekend`, `weekday`, `this week`, `next week`, `last week`, `every day`;
- examples that preserve the time expression, event/action slot, simple tense/reference point and no extra calendar/admin sense across all 54 active language variants.

Exclude / move elsewhere:

- month names, dates, birthdays, holidays, calendar pages and appointments -> `Calendar Dates & Scheduling Words`;
- clock objects, watches, alarms and timers as physical objects -> home/technology/object decks;
- clock-reading expressions like `half past`, `quarter to`, `a.m.`, `p.m.` and timezone vocabulary -> later `Clock Time & Scheduling`;
- broad sequence/preposition words such as `before`, `after`, `during`, `until`, `since` when they are grammar connectors rather than selected time vocabulary -> prepositions/connectors deck;
- frequency adverbs such as `always`, `usually`, `sometimes`, `never` -> frequency/grammar support deck;
- seasons and weather-cycle words -> `Weather & Nature Basics` or later `Seasons & Weather`.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A1 |
| `level_max` | A2 |
| `frequency_band` scope | core/common |
| `priority_band` scope | core/common |
| Target item range | 36-36 |

## Candidate Pool Rule

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/core_time_days_a1_a2_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside Time & Days and must disambiguate English words with competing senses, especially `second`, `date`, `late`, `early`, `night`, `this week`, `next week`, `last week`, `every day`, `weekday` and `weekend`.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include useful time expressions that are better handled in later calendar/clock/frequency decks; excluded rows must state the target deck or reason. If the candidate pool reveals unresolved duplicate risk, calendar/admin leakage, regional first-day-of-week assumptions, clock-reading ambiguity, weak examples or cross-language relative-time risk, stop at `spec_ready` and ask for user confirmation instead of promoting the deck.

Pre-generation checks passed before approval:

```bash
node scripts/check-deck-candidate-pool.mjs core_time_days_a1_a2
node scripts/check-word-selection-quality.mjs core_time_days_a1_a2
```

The user approved generation on 2026-05-20 after the candidate-pool, word-selection and deck-spec checks passed. Generation must run through `scripts/run-deck-production.mjs`; no direct language batch imports are allowed outside the runner.

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck is completed: `Learning Help Words` (Sort 23);
- related Core Foundation continuations: prepositions/connectors, frequency words and object states/qualities;
- adjacent later decks: `Calendar Dates & Scheduling Words`, `Clock Time & Scheduling`, `Weather & Nature Basics`.

## Delivery

Generated through `scripts/run-deck-production.mjs` on 2026-05-20.

Final delivery evidence:

- cards: 36;
- active language variants: 54;
- language rows: 1,944;
- runner run id: `run_core_time_days_a1_a2_20260520T101659378Z_2cda0a83`;
- final workbook: `outputs/google-sheets/FlashcardsLuna_time-days_final.xlsx`;
- Google Sheet: `FlashcardsLuna 022 of 180 - Time & Days` / `1vg7atpBUDHeNiRpPBhOjFVvuYlXIk5_9B-C6R-6qcak`;
- Drive folder: `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`;
- Google Sheet readback: pass, 504 sampled cells;
- post-final linguistic audit: 1,944/1,944 pass, 0 needs_review, 0 fail;
- sample audit: 270 rows, 0 blockers, 8 advisory warnings;
- release readiness: `ready_with_warnings` because of sample-audit advisory warnings only, with 0 blockers;
- delivery freshness: pass;
- non-RU language rows remain `generated_checked`, not native-approved.

## QA Notes

- semantic_scene requirements: preserve the time word/expression, event/action/state, simple reference point and tense/usage. The English canonical example remains the scene source.
- language-specific risks: weekday capitalization, articles/gender, case/time prepositions, relative-time deictics, all-day vs night-only words, locale/regional variants for weekend/weekday, and multiword time expressions.
- examples: keep English examples short and concrete, for example `The meeting is today.` or `We rest on Sunday.` Avoid generic templates like `The word is ...`, avoid full dates, and avoid schedule/admin fields unless the selected meaning is a calendar word.
- selected multiword rows require whole-meaning proof: `this week`, `next week`, `last week`, `every day` and `weekday` must be translated as normal time expressions, not literal component fragments.
- transcription risks: IPA languages need source-backed pronunciation for the displayed form; native-copy languages repeat display word; `ZH` requires tone-marked pinyin; `TH`/`LO`/`MY`/`KM`/`HY` strict high-risk lookup/style gates apply.
- source-backed checks needed: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, time-calendar profile checks, article/gender marker consistency, regional variant quality where applicable and final linguistic audit.
