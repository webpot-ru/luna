# Deck Spec: Home Structure & Exterior

## Identity

| Field | Value |
| --- | --- |
| Sort | 13 |
| Deck | Home Structure & Exterior |
| `set_id` | `home_structure_exterior_a1_a2` |
| Content type | Vocabulary |
| Domain | Home |
| Area | Home Structure & Exterior |
| Category / situation | Structural Parts, Exterior Features And Basic Home Fixtures |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | compound_whole_meaning, scene_slot_strict, article_gender_marker_consistency, duplicate_reuse_review, regional_variant_heavy |
| Example complexity default | controlled simple examples; one object, one state/location, no unnecessary clauses |

## Scope

This deck covers visible structural parts of a home, basic exterior features and simple fixed home fixtures.

One learner-facing grouping principle: things a learner can point to on or around a house or apartment home, without entering garden, apartment-building common area or furniture scope.

Include:

- core structural nouns such as `house`, `building`, `room`, `wall`, `floor`, `ceiling`, `roof`, `window`, `door`, `stairs`, `step`, `basement` and `attic`;
- common exterior or attached-home features such as `garage`, `garage door`, `balcony`, `porch`, `patio`, `driveway`, `walkway`, `fence`, `gate`, `chimney`, `mailbox` and `gutter`;
- simple fixed parts and fixtures such as `door handle`, `door lock`, `door frame`, `light switch`, `power outlet`, `ceiling fan`, `air conditioner`, `heater` and `smoke alarm`;
- short learner-friendly lexical items only, with regional variants preserved through source preflight and QA.

Exclude / move elsewhere:

- garden and yard words such as `garden`, `lawn`, `flower bed`, `tree`, `bush`, `front yard` and `backyard`; move to `Outdoor Home & Garden`;
- apartment-building common area words such as `elevator`, `lobby`, `stairwell`, `mail room`, `parking space` and `shared hallway`; move to `Apartment Building & Common Areas`;
- entryway and outerwear duplicates such as `front door`, `doorbell`, `doormat`, `coat hook`, `key`, `key holder` and `shoe rack`; keep as existing generated coverage unless an explicit reuse deck later needs them;
- movable furniture, decor and lamps such as `wall shelf`, `floor lamp`, `ceiling light`, `plant pot`, `picture frame`, `rug` and `cabinet`; keep in their room/furniture decks;
- technical utility/admin words such as `electric meter`, `water meter`, `fuse box`, `security system`, `mortgage`, `rent`, `address` and `house number`; move to utilities/admin/contact-detail decks.

## Selected Set Shape

The selected set is exactly 35 cards:

- 14 core structure/part nouns;
- 12 exterior or attached-home feature nouns;
- 9 fixed parts and simple fixture nouns.

The pool is wider than the selected set and keeps backup/excluded rows with move reasons. Exact duplicates from the current generated decks are excluded or kept as backup unless this deck needs a distinct structural meaning.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A1 |
| `level_max` | A2 |
| `frequency_band` scope | common/useful |
| `priority_band` scope | common/useful |
| Target item range | 35-35 |

## Candidate Pool Rule

Build a candidate pool of at least 70 home-structure and exterior-adjacent nouns and noun phrases, then filter to exactly 35 selected cards. Selected rows must be common/useful for a household learner and must not require gardening, apartment management, legal/admin or technical utility context.

Every selected row must have:

- `scope_decision`, `duplicate_reuse_decision`, `compound_multiword_risk`, `translation_risk` and `required_qa_profile`;
- a duplicate/reuse decision, especially for `door`, `front door`, `wall shelf`, `ceiling light`, `hallway`, `entryway` and existing room/furniture rows;
- a short English canonical example with one object, one simple state/location and no unnecessary tense, possession or clause complexity;
- source/preflight risk notes for regional fixture names, structural-vs-garden boundaries and whole-meaning compounds.

Before generation, run:

```bash
node scripts/check-deck-candidate-pool.mjs home_structure_exterior_a1_a2
node scripts/check-word-selection-quality.mjs home_structure_exterior_a1_a2
node scripts/check-deck-ready.mjs home_structure_exterior_a1_a2
```

## Next Deck

Natural next deck(s):

- operational next by Deck Master Plan: `Apartment Building & Common Areas` (Sort 14);
- nearby home continuation: `Outdoor Home & Garden`;
- later related decks: utilities/maintenance, contact details and home services/problem decks.

## QA Notes

- semantic_scene requirements: target object noun, display word, subject number, simple location/state and home structure/exterior context must be explicit;
- regional-variant risks: `power outlet`, `garage`, `driveway`, `patio`, `porch`, `gutter`, `air conditioner`, `heater`, `mailbox` and similar rows need source-preflight support and variant-aware examples;
- duplicate risks: do not accidentally reuse `front door`, `doorbell`, `doormat`, `hallway`, `wall shelf`, `ceiling light` or existing room/furniture meanings unless explicitly selected as reuse;
- examples must preserve the English canonical scene across all target languages; target-language examples may adapt naturally but must keep the same item, location/state and simple usage;
- transcription risks: follow `docs/language-transcription-policy.md`; transcriptions are for the main card word/display form only;
- source-backed checks needed: translation coverage, entry-source backing where available, article/gender marker consistency, compound whole-meaning review, target example lexical anchor, semantic scene alignment, target example naturalness, transcription policy/style consistency and final linguistic audit.

## Generation Notes

Generate only through `scripts/run-deck-production.mjs`. Base deck data must be created from the selected candidate pool and this spec only.

Preferred base example style:

- `The wall is white.`
- `The garage is next to the house.`
- `The light switch is by the door.`
- `The gutter is along the roof edge.`

## Delivery Status

Generated and delivered on 2026-05-15 through `scripts/run-deck-production.mjs`.

- Run id: `run_home_structure_exterior_a1_a2_20260515T022639450Z_2a3ca6fd`.
- Final set shape: 35 cards, 54 languages, 1890 language entries and 1890 translated examples.
- Final XLSX: `outputs/google-sheets/FlashcardsLuna_home-structure-exterior_final.xlsx`.
- Google Sheet: `FlashcardsLuna 013 of 180 - Home Structure & Exterior` / `1j3KRz0-f84T8rMbi7-L89OlbPZgo9o3FwWhBWFhgyNw` in Drive folder `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`.
- Google Sheet readback: pass, sample count 504.
- Post-final linguistic audit: 1890/1890 pass, 0 `needs_review`, 0 `fail`.
- Sample card quality audit: `outputs/qa/sample_card_quality_audit_home_structure_exterior_a1_a2_8_per_language_20260515.json` checked 432 rows (8 per language), 0 blockers, 9 non-blocking inflection/casing anchor warnings.
- Delivery freshness: pass.

Non-RU language rows remain `generated_checked`, not native-approved.
