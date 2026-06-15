# Deck Spec: Entryway & Outerwear

## Identity

| Field | Value |
| --- | --- |
| Sort | 9 |
| Deck | Entryway & Outerwear |
| `set_id` | `home_entryway_outerwear_a1` |
| Content type | Vocabulary |
| Domain | Home |
| Area | Entryway |
| Category / situation | Entryway Objects & Outerwear |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, transcription_high_risk |
| `risk_flags` | compound_whole_meaning, scene_slot_strict, article_gender_marker_consistency |

## Scope

This deck covers learner-friendly words for the home entryway and outerwear items commonly kept by the door. It is meant to support everyday home scenes such as entering, leaving, hanging a coat, putting shoes on a rack, and finding keys.

One learner-facing grouping principle: visible inside-entryway objects, near-door storage and simple outerwear/go-out items that a learner can identify at home without entering broad clothing, travel or exterior-building vocabulary.

Include:

- entryway area words and objects near the front door;
- simple outerwear and go-out accessories commonly stored in an entryway;
- shoes/boots/accessories when the entryway storage scene is central;
- short concrete nouns and compact multiword nouns that have clear whole meanings.

Exclude / move elsewhere:

- broad clothing and sizing words unless they are entryway/outerwear-specific;
- laundry and garment-care words;
- travel/document/admin items such as passport, ticket, suitcase;
- exterior/building navigation words such as porch, elevator, stairs;
- advanced fashion, sports, safety, weather, or shopping vocabulary.

## Selected Set Shape

The selected set is 35 cards:

- entryway/place/storage objects;
- outerwear and shoe/accessory items;
- bag/key-storage/near-door utility items.

The candidate pool is intentionally wider than the selected set and includes backup and excluded rows with move reasons.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Basic |
| `level_min` | A1 |
| `level_max` | A1 |
| `frequency_band` scope | core/common |
| `priority_band` scope | core/common |
| Target item range | 35-35 |

## Candidate Pool Rule

Build a candidate pool of at least 70 entryway/outerwear-adjacent nouns and noun phrases, then filter it to exactly 35 selected cards. The pool must be wider than the final deck and must record selected, backup and excluded/move decisions.

Every selected row must have:

- a clear entryway, near-door storage, outerwear, shoe/accessory or go-out item meaning;
- no unresolved duplicate/reuse conflict with the eight current generated decks;
- a short semantic scene that can be preserved across all 54 languages;
- `scope_decision`, `duplicate_reuse_decision`, `compound_multiword_risk`, `translation_risk` and `required_qa_profile` in the candidate pool.

## QA Notes

- translation must preserve the whole item meaning, especially compounds such as `coat rack`, `shoe rack`, `umbrella stand`, `key holder`, `key hook`, and `wall hook`;
- target examples must preserve the EN canonical scene slots: object, state/location, and simple present usage;
- languages with article/gender/case/classifier behavior must show correct entry form and example form;
- transcriptions must follow `docs/language-transcription-policy.md`.

## Duplicate And Move Notes

- `slippers` is already covered in Bedroom Basics and is not selected here.
- `shirt`, `pants`, `dress`, `socks`, and `belt` belong to Clothes & Sizes.
- `passport`, `ticket`, and `suitcase` belong to Travel / Documents, not this Home deck.
- `front door`, `hallway`, and `entryway` are allowed here because the learner scene is the inside home entry area, not architectural exterior vocabulary.

## Next Deck

Natural next deck(s):

- operational next by Deck Master Plan after this deck: `Furniture Basics` (Sort 10);
- nearby home continuation: `Laundry & Clothing Care`, `Home Office`, `Home Exterior`;
- later related decks: `Clothes & Sizes`, `Shoes & Accessories`, `Weather Basics`, `Travel Basics`.

## Generation Notes

Status is `generated` after the 2026-05-12 runner-controlled rebuild completed every stage: prepare, base import, draft preflight, hash-guarded batch import, QA, final export, Google Sheet delivery, readback, post-final audit, audit refresh/freshness and complete.

Completed generation evidence:

1. final selected count: 35 cards x 54 languages = 1890 language rows;
2. candidate pool passed `node scripts/check-deck-candidate-pool.mjs home_entryway_outerwear_a1`;
3. deck specs passed `node scripts/check-deck-specs.mjs`;
4. deterministic QA passed through `bash scripts/db-qa-set.sh home_entryway_outerwear_a1`;
5. final Google Sheet: `FlashcardsLuna 009 of 180 - Entryway & Outerwear` / `12kQQ3qH_CdbbC0fac4Ap4j1lUyVw3VPxwoxaxJCZSb0`;
6. post-final audit passed 1890/1890 rows and delivery freshness passed.

2026-05-26 current-row QA refresh: after Course Metadata native-style changes, stale QA evidence was restored/refreshed for the current DB rows and the same Google Sheet was updated again. A false positive in `target-example-scene-location-anchor` was fixed so umbrella-stand scenes resolve `stand` as a location noun, not the verb `stand`, for hard-anchor languages. `bash scripts/db-qa-set.sh home_entryway_outerwear_a1`, `node scripts/check-qa-evidence.mjs home_entryway_outerwear_a1`, final export, Google Sheet readback, final audit `outputs/audit/final_linguistic_audit_home_entryway_outerwear_a1_20260526T033338Z_results_summary.json` (1890/1890 pass) and delivery freshness pass.

## Canonical Example Style

Examples must be short and scene-preserving. EN is the canonical scene source. Target-language examples can be natural adaptations, but they must preserve the same object, location/state, and simple usage.

Example scenes:

- `The key is on the hook.`
- `The coat rack is by the door.`
- `The umbrella is in the stand.`
- `The shoes are on the mat.`
