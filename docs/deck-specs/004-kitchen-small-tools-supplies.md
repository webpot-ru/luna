# Deck Spec: Kitchen Small Tools & Supplies

## Identity

| Field | Value |
| --- | --- |
| Sort | 4 |
| Deck | Kitchen Small Tools & Supplies |
| `set_id` | `home_kitchen_small_tools_supplies_a2` |
| Content type | Vocabulary |
| Domain | Home |
| Area | Kitchen |
| Category / situation | Kitchen Small Tools & Supplies |
| Status | generated |

Current post-reset delivery note: this deck was rebuilt from the refreshed 48-row candidate pool through `scripts/run-deck-production.mjs` on 2026-05-06, then expanded by the 2026-05-13 duplicate-policy retrofit. Current generated count is 32 cards x 54 active language variants = 1728 language-entry/example rows. Final Google Sheet is `FlashcardsLuna 004 of 180 - Kitchen Small Tools & Supplies` / `1L4kOCdjAU0zkXieZgmaaGqtpy6fwi9A9bTnZZrNTVNw` in Drive folder `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`; after the 2026-06-03 Kitchenware repair/evidence refresh made dependent shared-meaning delivery stale, the same Sheet was refreshed in place again. Latest final audit `outputs/audit/final_linguistic_audit_home_kitchen_small_tools_supplies_a2_20260514_recheck_results_summary.json` reports 1728 pass / 0 needs_review / 0 fail, readback passes and delivery freshness passes with workbook hash `adb78d8365a5c25c9c9fa87ecd85cd0e9b677c0d77f8f632a89f9c275b29b4a7`.

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, transcription_high_risk |
| `risk_flags` | compound_whole_meaning, scene_slot_strict |

## Scope

One learner-facing grouping principle: small secondary kitchen prep tools and everyday prep supplies that are useful at A2 and are not already covered by the generated kitchenware, cooking-action or storage/cleaning decks.

Include:

- small manual prep/helper tools, such as kitchen scale, kitchen timer, kitchen thermometer, funnel, garlic press, citrus juicer, potato masher, pizza cutter and kitchen shears;
- explicit duplicate-policy reuse rows from `Kitchenware Basics` that make this deck self-contained for independent study: grater, whisk, rolling pin, measuring cup, measuring spoon, strainer, can opener and bottle opener. These rows must reuse the existing Kitchenware `meaning_id`, language entries and generated_checked example translations; do not create new duplicate meanings;
- baking and prep helper tools that stay concrete and common/useful, such as pastry brush, basting brush, cooling rack, trivet, jar opener, ice cube tray, dough scraper or sifter when they do not duplicate an existing strainer/colander meaning;
- consumable prep supplies that are not storage or cleaning supplies, such as parchment paper, baking cups, cupcake liners, toothpicks, wooden skewers, kitchen twine, cheesecloth and piping bags;
- short noun phrases with clear kitchen-prep context, simple `meaning_note`, stable article/gender handling and a controlled example;
- A2 everyday/useful items that can support examples about being in a drawer, on the counter, beside the stove, used for baking/prep or ready for a simple task.

Exclude / move elsewhere:

- generated `Kitchenware Basics` objects except the explicit reuse rows listed above: plates, bowls, cups, mugs, glasses, saucers, forks, spoons, knives, chopsticks, napkins, placemats, tablecloths, pots, pans, lids, kettle, teapot, pitcher, tray, serving bowl, serving spoon, cutting board, peeler, spatula, ladle, tongs, colander, baking sheet, baking dish, mixing bowl, oven mitt, apron, kitchen towel, salt shaker, pepper shaker and jar;
- generated `Cooking Actions` verbs and action lexical items, such as cut, chop, slice, peel, wash, rinse, dry, boil, fry, bake, stir, mix, pour, add, heat, cool, serve, taste, season, drain and cover;
- generated `Kitchen Storage & Cleaning` storage/cleaning words: food storage container, lunch box, food storage bag, freezer bag, plastic wrap, aluminum foil, pantry, kitchen cabinet, kitchen drawer, kitchen shelf, spice rack, bag clip, dish soap, dishwasher detergent, dishwasher, dish sponge, dish brush, scrub brush, scouring pad, dish rack, kitchen sink, sink strainer, paper towel, cleaning cloth, cleaning wipes, cleaning spray, spray bottle, rubber gloves, trash can, trash bag, recycling bin, compost bin, broom, dustpan and floor cloth;
- ingredients, spices and food words -> `Basic Ingredients & Spices`;
- table-service and restaurant items -> `Dining Room & Table Setup`, `Cafe Food & Table Items` or `Tableware & Condiments`;
- appliances, furniture, repair parts and specialized kitchen machines -> later appliance/repair/specialized kitchen decks only after they are added to Deck Master Plan;
- rare or advanced gadgets such as mandoline slicer, sous-vide cooker, kitchen torch, pressure canner, pasta machine or sugar thermometer -> advanced/specialized kitchen deck if needed later;
- ready instructions, requests, recipe steps or multi-turn cooking phrases -> out of current vocabulary-only scope.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A2 |
| `level_max` | A2 |
| `frequency_band` scope | common/useful |
| `priority_band` scope | common/useful |
| Target item range | 32-32 |

## Candidate Pool Rule

Build a candidate pool of roughly 40-55 visible kitchen-drawer/counter items, then filter it down to 32 strong cards after a reuse/dedup pass against generated kitchen decks. The pool must start from small prep helpers and prep supplies, not from broad kitchenware or storage lists. Good candidate families are measuring/timing aids, small cutting/pressing/juicing helpers, baking/prep accessories and non-storage consumable supplies. Every candidate must be checked against existing generated meanings first; exact or near duplicates of `Kitchenware Basics`, `Cooking Actions` or `Kitchen Storage & Cleaning` are moved out unless the spec explicitly approves duplicate-policy reuse. Approved reuse must keep the existing `meaning_id`, language entries, examples and QA evidence lineage instead of regenerating a new duplicate meaning.

Do not pad the final deck with rare gadgets. If fewer than 24 strong non-duplicate or explicitly approved reuse A2 items remain after filtering, lower the target range or stop for a scope decision rather than pulling storage, cleaning, cookware or advanced equipment back into this deck.

## Next Deck

Natural next deck(s):

- operational next by the current Home Rooms First route: `Home Office & Desk` (Sort 12), still `planned` until its spec and candidate pool are prepared and explicitly approved;
- natural kitchen continuation after the current kitchen branch: `Basic Ingredients & Spices` (Sort 39);
- later kitchen continuation only if added/approved in Deck Master Plan: `Recipes & Food Prep Words`.

## QA Notes

- This deck is current generated coverage only for the latest 2026-05-14 dependent delivery refresh noted above. Older Google Sheets, runner manifests or output files remain historical.
- 2026-05-13 duplicate-policy retrofit: `grater`, `whisk`, `rolling pin`, `measuring cup`, `measuring spoon`, `strainer`, `can opener` and `bottle opener` are selected here as explicit reuse rows for independent-study completeness. They reuse real Kitchenware meaning IDs (`*_tool_01` where applicable), language entries and generated_checked examples; candidate-pool stale placeholder IDs without `_tool_01` were corrected before DB import.
- Future repairs must rerun the affected runner/QA/export/delivery freshness path before a new production-current claim.
- 2026-05-06 repair update: expanded the Latin-diacritic-loss gate to CS/SK/HU/RO/HR/SR/LT/LV/FI in addition to the earlier DA/NB/SV/ES variants; repaired confirmed diacritic-loss in native/display/transcription/example text and fixed 10 PT/PT-BR invalid `estáo` examples to valid `está` / `estão` forms.
- Non-RU language rows must remain at most `generated_checked`; this deck must not promote non-RU rows to native/human `approved`.
- Before creating any candidate import file, run meaning reuse planning against the current base and reject surface-only reuse. Existing generated `meaning_id` rows may be reused only when the semantic meaning and deck context match.
- `word_selection_quality` must hard-fail any card that belongs to generated cookware/tableware, cooking actions or kitchen storage/cleaning rather than this exact small-tools/supplies scope.
- English examples should be short, concrete and non-tautological: examples like `The kitchen timer is beside the stove.` or `The funnel is in the drawer.` are acceptable; examples like `The kitchen tool is in the kitchen.` are not.
- `semantic_scene` must preserve target object, display form, subject number, concrete location/state or simple prep use, tense/aspect and `Home / Kitchen / Small Tools & Supplies` topic context.
- Language-specific risks: compound tool names can become too broad or too narrow; `kitchen shears` versus ordinary scissors, `parchment paper` versus baking paper, and `sifter` versus strainer/colander require granularity review.
- Regional risks: check `EN`/`EN-GB`, `PT`/`PT-BR` and `ES`/`ES-419` for common kitchen-supply vocabulary differences where the term is regional.
- Transcription risks follow current V3 policy: IPA languages need current `pronunciation_accuracy`; tone-aware `ZH`, `TH`, `LO` and `MY` rules apply; high-risk romanization languages must not receive copied English fallback.
- Course Metadata should use a short title such as `Small Kitchen Tools` and a description that contains the exact localized `Elementary level` signal, for example `Prep tools and supplies. Elementary level.`
