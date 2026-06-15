# Deck Spec: Bedroom Basics

## Identity

| Field | Value |
| --- | --- |
| Sort | 6 |
| Deck | Bedroom Basics |
| `set_id` | `home_bedroom_basics_a1` |
| Content type | Vocabulary |
| Domain | Home |
| Area | Bedroom |
| Category / situation | Bedroom Objects & Basic Sleep Items |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, transcription_high_risk |
| `risk_flags` | compound_whole_meaning, scene_slot_strict, article_gender_marker_consistency |

## Scope

One learner-facing grouping principle: high-frequency visible bedroom objects, sleep items and simple bedroom storage items that a beginner can identify and use at home, in hotels or in everyday living situations.

Include:

- core bedroom and sleep objects such as bed, pillow, blanket, sheet, mattress, duvet, bed frame and headboard;
- basic bedroom furniture and storage when the room context is central, such as nightstand, dresser, wardrobe, closet, drawer and mirror;
- simple bedroom lighting and window items, such as lamp, bedside lamp, curtain and blinds;
- common small bedroom items, such as alarm clock, hanger, laundry basket, rug and slippers, when the item is clearly useful in a bedroom scene;
- short noun phrases with clear room-object meaning, stable display form and controlled examples.

Exclude / move elsewhere:

- broad furniture not bedroom-specific, such as table, chair, sofa, armchair, bookcase and TV stand -> `Furniture Basics` or `Living Room Basics`;
- clothes and outerwear words, such as shirt, jacket, coat, shoes and bag -> `Clothes & Sizes` or `Entryway & Outerwear`;
- cleaning actions and cleaning supplies, such as vacuum cleaner, broom, dustpan, floor cloth and laundry detergent -> `Laundry & Cleaning Basics`;
- bathroom hygiene objects and toiletries -> `Bathroom Essentials` or a later toiletries deck;
- ready phrases about sleeping, hotel complaints, room service or house rules -> out of current vocabulary-only scope unless converted into a later vocabulary deck;
- advanced bedding sizes, decor styles and repair/installation terms -> later specialized home decks only if added to the Deck Master Plan.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Basic |
| `level_min` | A1 |
| `level_max` | A1 |
| `frequency_band` scope | core/common |
| `priority_band` scope | core/common |
| Target item range | 30-30 |

## Candidate Pool Rule

Build a candidate pool of at least 60 bedroom-adjacent objects, then filter it to 30 selected A1 cards. The pool must be wider than the final deck and must record selected, backup and excluded/move decisions. Prioritize concrete, visible, common bedroom words with low scene ambiguity and simple example feasibility. Do not pad with rare decor words, furniture that belongs better to a general furniture deck, or hotel-service/problem vocabulary.

Every selected row must have:

- a clear bedroom object or sleep-item meaning;
- no unresolved duplicate/reuse conflict with generated Home/Kitchen/Bathroom decks;
- a short semantic scene that can be preserved across all 54 languages;
- `compound_multiword_risk`, `translation_risk` and `required_qa_profile` fields in the candidate pool.

## Delivery Evidence

2026-05-06 runner delivery:

- run id: `run_home_bedroom_basics_a1_20260506T072311078Z_7b12ab3b`;
- final count: 30 cards x 54 active languages = 1620 localized rows;
- final workbook: `outputs/google-sheets/FlashcardsLuna_home-bedroom-basics_final.xlsx`;
- Google Sheet title: `FlashcardsLuna 006 of 180 - Bedroom Basics`;
- Google Sheet id: `1LV2yQGx_pAUgjEG2NNS1aPKvXBW-7TmL8Y-z4aBmUMg`;
- Google Sheet folder: `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`;
- current English-scene verification: 30/30 DB canonical English examples match DB EN example translations and the exported XLSX `EN example` cells;
- readback, post-final linguistic audit 1620/1620 and delivery freshness passed;
- non-RU rows remain `generated_checked`, not native-approved.

## Next Deck

Natural next deck(s):

- operational next by the current Home Rooms First route: `Living Room Basics` (Sort 7), still `planned` until its spec and candidate pool are refreshed and approved;
- natural bedroom continuation if later added/approved: `Sleep & Bedroom Actions`;
- broader home continuation: `Furniture Basics` (Sort 10).

## QA Notes

- Keep this deck noun/object-focused; do not create sleep routine verbs or hotel request phrases.
- Distinguish bedroom-specific object meanings from broad furniture meanings. A `nightstand` belongs here; a generic `table` does not.
- English canonical examples should stay simple, concrete and scene-preserving: `The pillow is on the bed.`, `The lamp is on the nightstand.`, `The slippers are near the bed.`
- Target examples must preserve the canonical English scene slots: object, count/number where present, location/state, simple tense and bedroom context.
- Avoid examples that force unnecessary tense, case, gender or classifier complexity. Use simple locations such as `on the bed`, `near the bed`, `in the drawer`, `by the window`, `on the wall`.
- Compound and multiword risks: `bedside lamp`, `alarm clock`, `laundry basket`, `bed frame`, `fitted sheet` and `duvet cover` require whole-meaning review rather than component-by-component translation.
- Language-specific risks: article/gender markers for European languages, classifier/spacing/script rules for CJK and Southeast Asian languages, tone/romanization policy for ZH/TH/LO/MY, and native-copy rules for languages where transcription equals display form.
- Non-RU language rows must remain at most `generated_checked`; no non-RU row may be promoted to native-approved without separate native review.

## Approval

2026-05-06: user approved generation for this one deck after spec and candidate pool passed validation. Generation must use `scripts/run-deck-production.mjs`; direct DB import outside the runner is not allowed.
