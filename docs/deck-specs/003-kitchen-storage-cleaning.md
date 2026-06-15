# Deck Spec: Kitchen Storage & Cleaning

## Identity

| Field | Value |
| --- | --- |
| Sort | 3 |
| Deck | Kitchen Storage & Cleaning |
| `set_id` | `home_kitchen_storage_cleaning_a2` |
| Content type | Vocabulary |
| Domain | Home |
| Area | Kitchen |
| Category / situation | Storage & Cleaning |
| Status | generated |

Reset note: this deck was rebuilt from the clean DB through the post-reset production runner on 2026-05-05. The pre-reset Google Sheet/history is no longer the source of truth; current status is the post-reset runner manifest and delivery artifacts listed below.

Post-reset approval note: on 2026-05-05 the fresh candidate pool was rebuilt as `outputs/candidate-pools/home_kitchen_storage_cleaning_a2_candidate_pool.jsonl` with 74 rows: 35 selected, 17 backup and 22 excluded/move decisions. This approval allows only a runner-controlled rebuild through the current source-preflight/QA/delivery contour.

Post-reset completion note: on 2026-05-05 the deck was rebuilt from the clean DB through `scripts/run-deck-production.mjs` run `run_home_kitchen_storage_cleaning_a2_20260505T074221082Z_03426d3f`. The final deck has 35 cards x 54 active languages = 1890 language rows. Runner QA, final XLSX export, new Google Sheet creation in Drive folder `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`, readback, post-final linguistic audit and delivery freshness all pass. The current Google Sheet is `FlashcardsLuna 003 of 180 - Kitchen Storage & Cleaning` / `11y_6d-Rmok12-dRE7MpCzEoBIkrqWSy7IvfUy8831EU`. Non-RU languages remain `generated_checked`, not native-approved.

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, transcription_high_risk |
| `risk_flags` | compound_whole_meaning, scene_slot_strict |

## Scope

One learner-facing grouping principle: common kitchen storage containers, cleaning supplies and basic cleanup words used around dishes, counters, food storage and kitchen trash.

Include:

- everyday kitchen storage nouns and short noun phrases;
- dishwashing and counter-cleaning objects;
- basic consumables used in kitchen cleanup or food storage;
- common kitchen trash/recycling words when they are tied to the kitchen context;
- beginner/elementary items that support short controlled examples.

Exclude / move elsewhere:

- plates, cups, forks, pans and serving dishes -> `Kitchenware Basics`;
- cooking verbs such as cut, boil, stir and fry -> `Cooking Actions`;
- laundry tools, ironing and clothes-cleaning vocabulary -> `Laundry & Cleaning Basics`;
- bathroom cleaning and toiletries -> `Bathroom Essentials` or `Bathroom Toiletries`;
- advanced cleaning chemicals, repair products or specialized appliance parts -> later useful/advanced household decks.

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

The candidate pool is collected from visible kitchen storage and cleanup items a learner would meet at home: container, jar, bottle, food bag, foil, sponge, dish soap, dishwasher, paper towel, trash bag, bin and similar words. The post-reset target is exactly 35 selected cards, matching the already reviewed V3-current scope. Fresh pre-generation evidence must still include backup and excluded/move rows rather than relying on the historical selected-only retrospective pool. Candidates are filtered by everyday frequency, clear kitchen context, stable translation across active language variants, and ability to produce short examples without turning the deck into laundry, bathroom or repair vocabulary.

## Next Deck

Natural next deck(s):

- `home_kitchen_small_tools_supplies_a2`;
- `home_laundry_cleaning_basics_a1_a2`;
- `home_bathroom_essentials_a1`.

## QA Notes

- Keep kitchen context explicit for ambiguous words like `container`, `bag`, `bin`, `soap`, `sponge` and `towel`.
- Do not duplicate dishware from `Kitchenware Basics` unless the meaning is storage/cleaning-specific and the `meaning_id` makes that clear.
- Use short controlled examples such as an item being in a cabinet, on a counter, under a sink, near a dishwasher or in a bin.
- Semantic scene must preserve object, number, location/state, action/state and kitchen topic context across translations.
- Watch article/gender/classifier requirements for storage containers and cleaning supplies.
- Transcription must follow `config/language-order.json`; native-orthography languages may use `not_applicable` when transcription equals display form under policy.

## Final Delivery

Post-reset generated delivery (current):

- kitchen storage: food storage container, lunch box, food storage bag, freezer bag, plastic wrap, aluminum foil, pantry, kitchen cabinet, kitchen drawer, kitchen shelf, spice rack, bag clip;
- dishwashing and cleanup: dish soap, dishwasher detergent, dishwasher, dish sponge, dish brush, scrub brush, scouring pad, dish rack, kitchen sink, sink strainer, paper towel, cleaning cloth, cleaning wipes, cleaning spray, spray bottle, rubber gloves;
- kitchen waste and floor cleanup: trash can, trash bag, recycling bin, compost bin, broom, dustpan, floor cloth.

- workbook: `outputs/google-sheets/FlashcardsLuna_home-kitchen-storage-cleaning_final.xlsx`;
- delivery manifest: `outputs/google-sheets/FlashcardsLuna_home-kitchen-storage-cleaning_final_delivery.json`;
- Google Sheet: `FlashcardsLuna 003 of 180 - Kitchen Storage & Cleaning` / `https://docs.google.com/spreadsheets/d/11y_6d-Rmok12-dRE7MpCzEoBIkrqWSy7IvfUy8831EU/edit?usp=drivesdk`;
- Drive folder: `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`, verified by upload manifest;
- current post-reset post-final audit: `outputs/audit/final_linguistic_audit_home_kitchen_storage_cleaning_a2_20260505T112345Z_results_summary.json`, 1890/1890 pass, 0 `needs_review`, 0 `fail`, after audit evidence import, final export refresh, new Google Sheet update, readback and delivery freshness verification.

Status note: rows are `generated_checked` with structured QA evidence and post-final linguistic audit evidence. This is not native-speaker approval; non-RU languages were not promoted above `generated_checked`. Pre-reset repair logs were removed from this current delivery section to avoid confusing historical repair state with the post-reset runner state.
