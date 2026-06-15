# Deck Spec: Apartment Building & Common Areas

## Identity

| Field | Value |
| --- | --- |
| Sort | 14 |
| Deck | Apartment Building & Common Areas |
| `set_id` | `home_apartment_common_areas_a2` |
| Content type | Vocabulary |
| Domain | Home |
| Area | Apartment Building |
| Category / situation | Common Areas, Shared Building Spaces And Resident Facilities |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | compound_whole_meaning, scene_slot_strict, article_gender_marker_consistency, duplicate_reuse_review, regional_variant_heavy |
| Example complexity default | controlled simple examples; one object/place, one state/location, no unnecessary clauses |

## Scope

This deck covers apartment-building shared spaces, common-area fixtures and simple resident facilities that a learner may see or ask about in an apartment building.

One learner-facing grouping principle: shared apartment-building places and resident-facing building objects, not private-room furniture, rent/admin paperwork or outdoor garden vocabulary.

Include:

- apartment-building place nouns and short noun phrases such as `apartment`, `apartment building`, `apartment unit`, `building entrance`, `lobby`, `shared hallway`, `stairwell`, `landing`, `floor`, `ground floor`, `top floor` and `basement level`;
- resident-facing common-area fixtures such as `elevator`, `elevator button`, `elevator door`, `intercom`, `buzzer`, `front desk`, `security desk` and `concierge`;
- shared facility nouns such as `common area`, `mailroom`, `mailbox area`, `package room`, `shared laundry room`, `bike room`, `storage room`, `trash room`, `garbage chute`, `recycling area`, `parking garage`, `parking space`, `courtyard`, `rooftop terrace` and `community room`;
- short learner-friendly lexical items only, with regional variants preserved through source preflight and QA.

Exclude / move elsewhere:

- private home structure and exterior words already covered such as `door`, `stairs`, `basement`, `garage`, `gate`, `balcony`, `porch`, `patio`, `mailbox` and `front door`; keep in `Home Structure & Exterior` / `Entryway & Outerwear` unless explicitly reused later;
- laundry appliances, cleaning tools and private laundry vocabulary such as `washing machine`, `dryer`, `detergent`, `laundry basket` and generic `laundry room`; keep in `Laundry & Cleaning Basics`;
- rent/admin/legal words such as `rent`, `lease`, `landlord`, `tenant`, `property manager`, `address`, `apartment number`, `unit number`, `maintenance request` and `utility bill`; move to future housing/admin/service decks;
- outdoor/garden words such as `garden`, `lawn`, `yard`, `flower bed`, `playground` and `sidewalk`; move to `Outdoor Home & Garden`, `Park & Playground` or City decks;
- advanced building-service words such as `boiler room`, `electric meter`, `water meter`, `sprinkler system`, `fire alarm panel`, `loading dock` and `service elevator`; move to later utilities/building-services decks.

## Selected Set Shape

The selected set is exactly 35 cards:

- 15 apartment-building shared-place or level nouns;
- 10 resident-facing common-area fixture/service nouns;
- 10 shared facility or resident amenity nouns.

The pool is wider than the selected set and keeps backup/excluded rows with move reasons. Exact old surface words are avoided unless this deck needs a clearly distinct apartment-building sense, such as `floor` meaning building level rather than room surface.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A2 |
| `level_max` | A2 |
| `frequency_band` scope | common/useful |
| `priority_band` scope | common/useful |
| Target item range | 35-35 |

## Candidate Pool Rule

Build a candidate pool of at least 70 apartment-building and common-area nouns and noun phrases, then filter to exactly 35 selected cards. Selected rows must be common/useful for a resident or visitor and must not require rent contracts, legal/admin context, building maintenance jargon or garden/outdoor scope.

Every selected row must have:

- `scope_decision`, `duplicate_reuse_decision`, `compound_multiword_risk`, `translation_risk` and `required_qa_profile`;
- a duplicate/reuse decision, especially for `floor`, `hallway`, `basement`, `mailbox`, `laundry room`, `garage`, `parking`, `front desk` and `concierge`;
- a short English canonical example with one object/place, one simple state/location and no unnecessary tense, possession or clause complexity;
- source/preflight risk notes for regional fixture names, shared-vs-private room boundaries and whole-meaning compounds.

Before generation, run:

```bash
node scripts/check-deck-candidate-pool.mjs home_apartment_common_areas_a2
node scripts/check-word-selection-quality.mjs home_apartment_common_areas_a2
node scripts/check-deck-ready.mjs home_apartment_common_areas_a2
```

## Next Deck

Natural next deck(s):

- operational next by Deck Master Plan: `Outdoor Home & Garden` (Sort 15);
- later related decks: housing/rental admin, household utilities and maintenance problem words, city/public-building navigation.

## QA Notes

- semantic_scene requirements: target object/place noun, display word, subject number, simple location/state and apartment-building/common-area context must be explicit;
- regional-variant risks: `apartment`, `elevator`, `ground floor`, `mailroom`, `package room`, `front desk`, `trash room`, `garbage chute`, `parking garage`, `parking space`, `courtyard` and `concierge` need source-preflight support and variant-aware examples;
- duplicate risks: do not accidentally reuse private-home `floor`, `basement`, `mailbox`, `garage`, `gate`, `stairs`, `door` or generic `laundry room` meanings without explicit apartment-building disambiguation;
- examples must preserve the English canonical scene across all target languages; target-language examples may adapt naturally but must keep the same item/place, location/state and simple usage;
- transcription risks: follow `docs/language-transcription-policy.md`; transcriptions are for the main card word/display form only;
- source-backed checks needed: translation coverage, entry-source backing where available, article/gender marker consistency, compound whole-meaning review, target example lexical anchor, semantic scene alignment, target example naturalness, transcription policy/style consistency and final linguistic audit.

## Generation Notes

Generate only through `scripts/run-deck-production.mjs`. Base deck data must be created from the selected candidate pool and this spec only.

Preferred base example style:

- `The elevator is in the lobby.`
- `The mailroom is next to the lobby.`
- `The parking garage is under the building.`
- `The rooftop terrace is above the top floor.`

## Delivery Status

Generated and delivered on 2026-05-15 through `scripts/run-deck-production.mjs`.

- runner run: `run_home_apartment_common_areas_a2_20260515T095337469Z_3ac2846d`;
- generated count: 35 cards x 54 active languages = 1,890 language rows;
- final workbook: `outputs/google-sheets/FlashcardsLuna_home-apartment-common-areas_final.xlsx`;
- Google Sheet: `FlashcardsLuna 014 of 180 - Apartment Building & Common Areas` / `1PVEyJf5va6g7iQ8PrcxW0jSDS7FAYtSvRK8433SUneg`;
- delivery folder: `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`;
- readback: pass, 504 sampled cells checked by `scripts/check-google-sheet-readback.mjs`;
- post-final audit: `outputs/audit/final_linguistic_audit_home_apartment_common_areas_a2_20260515T154911Z_results_summary.json`, 1,890 pass / 0 needs_review / 0 fail;
- delivery freshness: pass.

Non-RU languages remain `generated_checked`, not native-approved.
