# Deck Spec: Bathroom Essentials

## Identity

| Field | Value |
| --- | --- |
| Sort | 5 |
| Deck | Bathroom Essentials |
| `set_id` | `home_bathroom_essentials_a1` |
| Content type | Vocabulary |
| Domain | Home |
| Area | Bathroom |
| Category / situation | Fixtures, Hygiene & Basic Items |
| Status | generated |

Reset note: this spec is retained as the source of truth after the 2026-05-02 clean-start reset. Historical generated rows and Google Sheet delivery exist outside the current local DB state under the old pre-reset Sort 15, but this deck is now Sort 5 in the Home Rooms First post-reset route. On 2026-05-05 it was refreshed from a 70-row candidate pool (35 selected, 20 backup, 15 excluded/moved), promoted to `approved_for_generation` for exactly one post-reset runner rebuild, and completed the runner delivery loop on 2026-05-06.

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | compound_whole_meaning, scene_slot_strict |

## Scope

One learner-facing grouping principle: high-frequency bathroom objects, fixtures and basic hygiene items that a beginner needs at home, in hotels or in everyday living situations.

Include:

- core bathroom fixtures and furniture;
- basic hygiene and washing objects;
- towels and simple bathroom textiles;
- everyday bathroom consumables that are common enough for A1;
- short noun phrases with clear bathroom context.

Exclude / move elsewhere:

- detailed dental treatment words like filling, cavity and toothache -> later `Dental Care Words`;
- cosmetics, hair dye, makeup tools and salon words -> `Beauty & Hair Care`;
- cleaning-only supplies such as heavy cleaners and floor cloths -> `Laundry & Cleaning Basics` or bathroom cleaning deck;
- rare plumbing or repair terms -> `Home Repairs & Tools`;
- long ready phrases about asking for a toilet or reporting a bathroom problem -> out of scope unless converted into vocabulary-only problem words.

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

The candidate pool is collected from visible, high-frequency bathroom items a beginner can identify and use: toilet, sink, shower, bath, towel, soap, toothbrush, toothpaste, mirror, shampoo, toilet paper, hair dryer and similar words. Candidates are filtered by practical daily usefulness, clear object meaning, simple article/gender handling, stable translations, and ability to support controlled examples without becoming medical, beauty-salon or repair vocabulary.

## Next Deck

Natural next deck(s):

- `home_bathroom_toiletries_a1`;
- `home_laundry_cleaning_basics_a1_a2`;
- `personal_beauty_hair_care_a2`.

## QA Notes

- Keep this deck noun/object-focused; do not create ready bathroom request phrases.
- Distinguish fixture/object meanings from actions: `shower` as a noun belongs here; `to shower` belongs in an action/personal routine deck.
- Watch regional variants for `bath`/`bathtub`, `tap`/`faucet`, and toilet-related terms; choose learner-friendly display form and preserve meaning.
- Examples should be short and neutral, usually with location/state: the towel is on a hook, the soap is near the sink, the toothbrush is in a cup.
- Semantic scene must preserve object, number, location/state, topic context and tense/aspect across translated examples.
- Do not promote generated content to `generated_checked` without structured QA evidence.
- Post-reset rebuild approval note (2026-05-05): `outputs/candidate-pools/home_bathroom_essentials_a1_candidate_pool.jsonl` is the current machine-readable pool. The selected 35 rows remain the historical final selection because scope, examples and QA risks are documented; backup/excluded rows now record the broader pool and move decisions required by the current contour.

## Generated Delivery

Post-reset generated delivery (current):

- runner manifest: `outputs/runs/home_bathroom_essentials_a1/run_home_bathroom_essentials_a1_20260505T141835707Z_54840d7f.json`, status `completed`;
- final workbook: `outputs/google-sheets/FlashcardsLuna_home-bathroom-essentials_final.xlsx`, workbook hash `36e9537b8dc36d5bac35759736f2dc86cde3931a3766b60b1aac98069dbd3272`;
- delivery manifest: `outputs/google-sheets/FlashcardsLuna_home-bathroom-essentials_final_delivery.json`;
- Google Sheet: `FlashcardsLuna 005 of 180 - Bathroom Essentials` / `https://docs.google.com/spreadsheets/d/1dUGgoVP2MLgPpRK03mSzh6DHaPWb0S6ryKr38OBMI5o/edit?usp=drivesdk`;
- Drive folder: `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`;
- final audit: `outputs/audit/final_linguistic_audit_home_bathroom_essentials_a1_20260506T142602Z_results_summary.json`, 1890/1890 pass, 0 `needs_review`, 0 `fail`;
- delivery readback verified 504 sampled cells and `node scripts/check-delivery-freshness.mjs home_bathroom_essentials_a1` passes.

Post-reset notes: the rebuild used one-language source-preflight/import batches, then repaired only confirmed current blockers. The `EN-GB` `shower head` example was repaired again to `The shower head is in the shower area.` before final export. On 2026-05-06, Bathroom was rechecked after a user report about possible EN/example drift; current DB shows the English examples preserve the canonical scenes, while confirmed target-language naturalness issues were in CS/HU/RO/SK locative examples. Those rows now use natural target-language case/order forms, fresh target-example evidence was imported, the same Google Sheet was refreshed and delivery freshness passes. Final statuses are `generated_checked` / `not_applicable`; no non-RU language variant is native-approved.

Historical pre-reset delivery and repair logs were removed from this spec to avoid confusing them with the current post-reset delivery. Pre-reset artifacts remain in `outputs/` only as historical regression material; the source of truth for this deck is the 2026-05-06 post-reset runner delivery above.
