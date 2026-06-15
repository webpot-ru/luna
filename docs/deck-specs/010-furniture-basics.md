# Deck Spec: Furniture Basics

## Identity

| Field | Value |
| --- | --- |
| Sort | 10 |
| Deck | Furniture Basics |
| `set_id` | `home_furniture_basics_a1` |
| Content type | Vocabulary |
| Domain | Home |
| Area | Furniture |
| Category / situation | Core Home Furniture |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, transcription_high_risk |
| `risk_flags` | compound_whole_meaning, scene_slot_strict, article_gender_marker_consistency, duplicate_reuse_review |

## Scope

This deck covers common furniture vocabulary that a learner should recognize across rooms. It is an index-style Home deck: words may intentionally repeat across room-specific decks because a learner may study Furniture Basics without studying Bedroom, Living Room or Dining Room first.

One learner-facing grouping principle: visible furniture objects used for sitting, sleeping, placing items, storage, display or room setup across the home.

Include:

- broad core furniture words such as `furniture`, `chair`, `table`, `cabinet`, `shelf`, `bench` and `stool`;
- room-specific furniture that is already useful enough for an A1 learner, while keeping translations consistent with existing room-specific rows where appropriate;
- compact compound furniture nouns whose whole meaning is clear and concrete;
- short concrete examples with one visible object and one simple location/state.

Exclude / move elsewhere:

- appliances, utensils, cleaning tools, textiles, decoration-only objects and room fixtures;
- office-only equipment unless the word is selected as broad furniture;
- baby, outdoor, repair, luxury, antique or specialized furniture unless retained as backup;
- broad room/place words such as `bedroom`, `living room`, `entryway` and `dining room`;
- unrelated duplicate senses such as data `table`, restaurant `table service`, shelf as a verb, or cabinet as government body.

## Selected Set Shape

The selected set is 30 cards:

- broad furniture category and generic furniture nouns;
- core furniture words that may intentionally duplicate room-specific decks for learner path flexibility;
- simple seating, table, storage and shelf items.

The candidate pool is intentionally wider than the selected set and includes backup and excluded rows with move reasons.

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

Build a candidate pool of at least 60 furniture-adjacent nouns and noun phrases, then filter it to exactly 30 selected cards. The selected set must include core learner furniture vocabulary and may intentionally duplicate already generated room-specific surface words when the Furniture Basics deck needs them for standalone usefulness.

Every selected row must have:

- `scope_decision`, `duplicate_reuse_decision`, `compound_multiword_risk`, `translation_risk` and `required_qa_profile`;
- a duplicate/reuse decision explaining whether the row is a new Furniture Basics meaning, an intentional surface duplicate, backup or moved elsewhere;
- a controlled EN scene that can be preserved across all 54 languages.

## QA Notes

- semantic_scene requirements: target object, display word, simple state/location, topic context and tense/aspect must be explicit;
- duplicate handling: intentional surface duplicates are allowed for standalone learner paths, but every selected row must preserve one clear furniture sense and must not drift into unrelated senses;
- language-specific risks: articles/gender/case/classifiers for furniture nouns, compound whole-meaning preservation, and avoiding generic collapses such as `armchair` -> `chair`;
- examples: use simple location/state scenes such as `The chair is by the table.` or `The cabinet is against the wall.`; avoid decorative or overly specific scenes;
- transcription risks: follow `docs/language-transcription-policy.md`; transcriptions are for the main card word/display form only;
- source-backed checks needed: translation coverage, entry-source backing where available, article/gender marker consistency, target example lexical anchor, semantic scene alignment and final linguistic audit.

## Duplicate Notes

This spec moved from `approved_for_generation` to `generated` on 2026-05-13 after the full production runner completed QA, final export, Google Sheet delivery, readback, post-final linguistic audit and delivery freshness. The DB rows for this deck use Furniture Basics-specific `meaning_id` values so the deck can carry its own examples and spreadsheet order. Existing room-specific rows remain consistency references for translations and transcriptions, not forced shared memberships.

Current intentional duplicate-reference families:

- Bedroom Basics: `bed`, `bed frame`, `nightstand`, `wardrobe`, `closet`, `dresser`, `drawer`;
- Living Room Basics: `sofa`, `armchair`, `coffee table`, `side table`, `TV stand`, `bookshelf`, `wall shelf`;
- Dining Room & Table Setup: `dining table`, `dining chair`, `sideboard`.

The first selected cut intentionally moved `recliner`, `headboard`, `dining bench` and `buffet cabinet` back to backup because they are less universal for a Basic/A1 furniture deck. It promoted `office chair`, `bookcase`, `folding chair` and `filing cabinet` instead.

## Next Deck

Natural next deck(s):

- operational next by Deck Master Plan after this deck: `Laundry & Clothing Care` (Sort 11);
- nearby home continuation: `Home Office`, `Home Exterior`, `Decor & Textiles`;
- later related decks: `Kids & Baby Care`, `Outdoor Home`, `Office Desk & Supplies`.

## Generation Notes

Generate only through `scripts/run-deck-production.mjs`. The base deck data must use the selected candidate pool and Furniture Basics-specific `meaning_id` values.

Final delivery evidence:

- run manifest: `outputs/runs/home_furniture_basics_a1/run_home_furniture_basics_a1_20260513T042858129Z_41d5db21.json`;
- workbook: `outputs/google-sheets/FlashcardsLuna_home-furniture-basics_final.xlsx`;
- delivery manifest: `outputs/google-sheets/FlashcardsLuna_home-furniture-basics_final_delivery.json`;
- Google Sheet: `FlashcardsLuna 010 of 180 - Furniture Basics` / `1WGVMJIrn3jbTD7EZ3r_fRwtkJJn14hQ1ijsatx0rzco`;
- post-final audit: `outputs/audit/final_linguistic_audit_home_furniture_basics_a1_20260513T071720Z_results_summary.json`, 1620 pass / 0 needs_review / 0 fail;
- sample audit: `outputs/qa/sample_card_quality_audit_home_furniture_basics_a1_5_per_language_20260513.md`, 270 sampled rows, 0 blockers and 2 non-blocking location-anchor warnings.

## Canonical Example Style

Examples must be short and scene-preserving. EN is the canonical scene source. Target-language examples can be natural adaptations, but they must preserve the same object, location/state, and simple usage.

Example scenes:

- `The chair is by the table.`
- `The cabinet is against the wall.`
- `The sofa is in the room.`
- `The shelf is above the desk.`
