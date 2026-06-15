# Deck Spec: Living Room Basics

## Identity

| Field | Value |
| --- | --- |
| Sort | 7 |
| Deck | Living Room Basics |
| `set_id` | `home_living_room_basics_a1` |
| Content type | Vocabulary |
| Domain | Home |
| Area | Living Room |
| Category / situation | Living Room Objects & Basic Seating Items |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, transcription_high_risk |
| `risk_flags` | compound_whole_meaning, scene_slot_strict, article_gender_marker_consistency |

## Scope

One learner-facing grouping principle: high-frequency visible living-room objects, seating items, media objects and simple decor that a beginner can identify in a home living room without drifting into broad furniture, bedroom textiles, home appliances or ready phrases.

Include:

- core living-room nouns such as living room, sofa, armchair, coffee table, side table, TV, remote control and TV stand;
- simple living-room storage or media objects such as bookshelf, wall shelf, speaker, soundbar and game console when the object is visible and common;
- simple decor objects such as cushion, throw blanket, picture, picture frame, painting, poster, vase, houseplant, plant pot, candle and candle holder;
- short noun phrases with a stable whole meaning and examples that preserve object, state/location and simple room context across all 54 languages.

Exclude / move elsewhere:

- broad generic furniture such as chair, table, shelf and cabinet -> `Furniture Basics` unless the selected form is clearly living-room-specific;
- bedroom/window textile duplicates such as blanket, rug, carpet, curtain, blinds and mirror -> already generated bedroom/bathroom coverage or later decor/textiles deck;
- dining objects and table-setting items such as dining chair, coaster, serving tray and table runner -> `Dining Room & Table Setup`;
- appliances, fixtures and home structure items such as air conditioner, fan, light switch, power outlet, radiator, window and door -> later appliance/structure decks;
- books, school/office objects and reading media unless the object is selected specifically as a living-room item with a simple scene;
- ready sentences, chores, repairs and TV-service phrases -> out of current vocabulary-only scope.

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

Build a candidate pool of at least 60 living-room-adjacent objects, then filter it to exactly 30 selected A1 cards. The pool must be wider than the final deck and must record selected, backup and excluded/move decisions. Prioritize visible common objects with low ambiguity, low duplicate risk against the six generated decks and simple scene-preserving examples. Do not pad with rare decor, broad furniture that belongs to `Furniture Basics`, already generated bedroom/bathroom/window-covering items or appliance/structure words.

Every selected row must have:

- a clear living-room object, seating, media or simple decor meaning;
- no unresolved duplicate/reuse conflict with generated Home/Kitchen/Bathroom/Bedroom decks;
- a short semantic scene that can be preserved across all 54 languages;
- `compound_multiword_risk`, `translation_risk` and `required_qa_profile` fields in the candidate pool.

## Next Deck

Natural next deck(s):

- operational next by Deck Master Plan: `Dining Room & Table Setup` (Sort 8);
- nearby home-room continuation: `Entryway & Outerwear` (Sort 9);
- broad furniture continuation: `Furniture Basics` (Sort 10).

## QA Notes

- Keep this deck noun/object-focused; do not create TV-watching actions, home repair phrases or service/problem sentences.
- English canonical examples must stay simple and scene-preserving: `The sofa is by the wall.`, `The remote control is on the sofa.`, `The vase is on the table.`
- Target examples must preserve the canonical English scene slots: object, location/state, simple tense and living-room context. Agreement among target languages does not override the English canonical scene.
- Avoid examples that force unnecessary tense, plural, classifier, case or gender complexity. Prefer simple locations such as `on the sofa`, `on the coffee table`, `beside the TV`, `on the wall`, `near the window`.
- Compound and multiword risks: `remote control`, `TV stand`, `wall shelf`, `picture frame`, `throw blanket`, `floor lamp`, `ceiling light`, `wall clock`, `game console`, `storage basket`, `candle holder` and `coffee table` require whole-meaning review rather than component-by-component translation.
- Language-specific risks: article/gender markers for European languages, classifier/spacing/script rules for CJK and Southeast Asian languages, tone/romanization policy for ZH/TH/LO/MY, and native-copy rules for languages where transcription equals display form.
- Non-RU language rows must remain at most `generated_checked`; no non-RU row may be promoted to native-approved without separate native review.

## Approval

2026-05-07: spec and candidate pool prepared for review. User then explicitly approved continuing with the next deck in this thread. This one deck is promoted to `approved_for_generation`; it may run only through `scripts/run-deck-production.mjs` and is not final/generated until QA/export/readback/post-final audit/delivery freshness pass.

## Final Delivery

2026-05-08: `Living Room Basics` completed the production runner path `prepare -> base -> draft-preflight -> batch-import -> qa -> export -> deliver -> complete` under run `run_home_living_room_basics_a1_20260507T125830418Z_1c4ac947`.

Final status:

- cards: 30 selected cards;
- language rows: 1,620 entries across 54 active language variants;
- translated examples: 1,620;
- Postgres content set status: `quality_status=generated_checked`, `selection_status=approved`;
- pronunciation statuses: 990 `generated_checked`, 630 `not_applicable`;
- final workbook: `outputs/google-sheets/FlashcardsLuna_home-living-room-basics_final.xlsx`;
- workbook SHA-256: `72571478378f5bbe9fbd82091f0642087e9bc51974794654f5096600de078dfe`;
- Google Sheet: `FlashcardsLuna 007 of 180 - Living Room Basics` / `https://docs.google.com/spreadsheets/d/146LfF_3P6Gf2f66pb3ddIhiptuxDr7H7umzSVjDNTtQ/edit?usp=drivesdk`;
- Drive folder id: `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`;
- readback: verified, 504 sampled cells;
- post-final linguistic audit: `outputs/audit/final_linguistic_audit_home_living_room_basics_a1_20260508T055527Z_results_summary.json`, 1,620 pass / 0 needs_review / 0 fail;
- delivery freshness: pass.

This is generated_checked machine/source-backed evidence, not native-speaker approval. Non-RU languages remain at most `generated_checked`.
