# Deck Spec: Outdoor Home & Garden

## Identity

| Field | Value |
| --- | --- |
| Sort | 15 |
| Deck | Outdoor Home & Garden |
| `set_id` | `home_outdoor_garden_a2` |
| Content type | Vocabulary |
| Domain | Home |
| Area | Outdoor Home |
| Category / situation | Garden, Yard And Outdoor Home Items |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | compound_whole_meaning, scene_slot_strict, article_gender_marker_consistency, duplicate_reuse_review, regional_variant_heavy |
| Example complexity default | controlled simple examples; one outdoor object/place, one state/location, no unnecessary clauses |

## Scope

This deck covers visible outdoor home and garden vocabulary: yard/garden areas, common plants/landscape nouns, simple garden tools, and basic outdoor home items.

One learner-facing grouping principle: nouns and short noun phrases a learner can point to around a house, yard or garden, not city parks, nature taxonomy, rental/admin terms or advanced landscaping.

Include:

- outdoor home areas and ground-cover nouns such as `garden`, `yard`, `front yard`, `backyard`, `lawn`, `grass`, `flower bed`, `garden path` and `garden fence`;
- common garden plant/landscape nouns such as `flower`, `tree`, `bush`, `hedge`, `soil`, `mulch` and `garden plant`;
- simple garden tool and watering nouns such as `watering can`, `garden hose`, `sprinkler`, `garden tools`, `rake`, `shovel`, `wheelbarrow` and `lawn mower`;
- outdoor home-use items such as `shed`, `outdoor light`, `barbecue grill`, `outdoor table`, `garden chair`, `patio umbrella`, `fire pit`, `bird feeder` and `compost pile`;
- short learner-friendly lexical items only, with whole-meaning compounds preserved in examples and translations.

Exclude / move elsewhere:

- structural home exterior words already covered such as `balcony`, `porch`, `patio`, `driveway`, `walkway`, `gate`, `fence`, `roof`, `wall`, `window`, `garage` and `mailbox`; only select a more specific garden/outdoor-home compound if the meaning is distinct and useful;
- apartment common-area words such as `courtyard`, `parking lot`, `parking garage`, `rooftop terrace` and `bike room`; keep in `Apartment Building & Common Areas` or transport/city decks;
- city/public outdoor vocabulary such as `sidewalk`, `street`, `park`, `playground`, `trail`, `bus stop` and `parking meter`; move to City, Transport, Park & Playground or Nature decks;
- advanced gardening and landscaping terms such as `perennial`, `annual`, `fertilizer spreader`, `pruning shears`, `trellis`, `irrigation system`, `topsoil`, `compost tea` and `landscape fabric`; move to later Gardening Advanced if needed;
- weather, animals, insects, outdoor sports and camping words unless they are ordinary home-garden objects in this deck.

## Selected Set Shape

The selected set is exactly 35 cards:

- 9 outdoor area / ground-cover nouns;
- 10 plant / landscape nouns;
- 8 simple tool / watering nouns;
- 8 outdoor home item nouns.

The pool is wider than the selected set and keeps backup/excluded rows with move reasons. Exact old surface words are avoided unless there is a clearly distinct garden/outdoor-home compound and an explicit duplicate/reuse decision.

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

Build a candidate pool of at least 70 outdoor-home and garden nouns or short noun phrases, then filter to exactly 35 selected cards. Selected rows must be common/useful for a resident, guest or learner describing the outside of a home and must not require city navigation, nature taxonomy, professional landscaping, rent/admin or repair-service context.

Every selected row must have:

- `scope_decision`, `duplicate_reuse_decision`, `compound_multiword_risk`, `translation_risk` and `required_qa_profile`;
- a duplicate/reuse decision for `yard`, `patio`, `porch`, `driveway`, `walkway`, `gate`, `fence`, `shed`, `plant pot`, `compost bin`, `clothesline`, `bench` and other words that overlap nearby Home decks;
- a short English canonical example with one outdoor object/place, one simple state/location and no unnecessary tense, possession or clause complexity;
- source/preflight risk notes for regional outdoor terms, garden-vs-public-park boundaries and whole-meaning compounds.

Before generation, run:

```bash
node scripts/check-deck-candidate-pool.mjs home_outdoor_garden_a2
node scripts/check-word-selection-quality.mjs home_outdoor_garden_a2
node scripts/check-deck-ready.mjs home_outdoor_garden_a2
```

## Next Deck

Natural next deck(s):

- operational next by Deck Master Plan: `Numbers & Counting` (Sort 16);
- later related decks: `Park & Playground`, `Plants & Flowers`, `Weather & Nature Basics`, `Animals Basics`, household utilities and maintenance problem words.

## QA Notes

- semantic_scene requirements: target outdoor object/place noun, display word, simple state/location and outdoor-home context must be explicit;
- regional-variant risks: `yard`, `garden`, `backyard`, `lawn`, `shed`, `barbecue grill`, `patio umbrella`, `fire pit`, `garden hose`, `lawn mower` and `outdoor light` need source-preflight support and variant-aware examples;
- duplicate risks: do not accidentally collapse `garden path` to generic `path`, `garden gate` to generic `gate`, `garden fence` to generic `fence`, or `outdoor light` to generic brightness/light unless the language naturally requires it and evidence preserves the scene;
- examples must preserve the English canonical scene across all target languages; target-language examples may adapt naturally but must keep the same item/place, location/state and simple usage;
- transcription risks: follow `docs/language-transcription-policy.md`; transcriptions are for the main card word/display form only;
- source-backed checks needed: translation coverage, entry-source backing where available, article/gender marker consistency, compound whole-meaning review, target example lexical anchor, semantic scene alignment, target example naturalness, transcription policy/style consistency and final linguistic audit.

## Generation Notes

Generate only through `scripts/run-deck-production.mjs`. Base deck data must be created from the selected candidate pool and this spec only.

Preferred base example style:

- `The garden is behind the house.`
- `The garden hose is by the wall.`
- `The shed is near the fence.`
- `The patio umbrella is over the table.`

## Delivery Record

Generated and delivered on 2026-05-16 through runner run `run_home_outdoor_garden_a2_20260516T064232544Z_853c168e`.

- Final shape: 35 cards, 54 active languages, 1,890 language rows.
- Final workbook: `outputs/google-sheets/FlashcardsLuna_outdoor-home-garden_final.xlsx`.
- Google Sheet: `FlashcardsLuna 015 of 180 - Outdoor Home & Garden` / `12HwClX4N69LJbS2jvuNclSZolyPwR1i6RkceTbk4cvY` in Drive folder `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`.
- QA: full runner QA passed; target semantic scene alignment checked 1,890/1,890 rows with 0 unsupported final rows; source-backed transcription evidence checked 1,890 rows; post-final linguistic audit passed 1,890 / 0 needs_review / 0 fail.
- Sample audit: `outputs/qa/sample_card_quality_audit_home_outdoor_garden_a2_5_per_language_20260516.json`, 270 sampled rows, 0 blockers, 0 warnings after scene-location alias tuning.
- Delivery: Google Sheet readback and `check-delivery-freshness` pass after final audit evidence re-export/re-upload.
- Approval posture: generated_checked, not native-speaker approved; non-RU languages remain at most `generated_checked`.
