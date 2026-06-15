# Deck Spec: Cooking Actions

## Identity

| Field | Value |
| --- | --- |
| Sort | 2 |
| Deck | Cooking Actions |
| `set_id` | `home_kitchen_cooking_actions_a1_a2` |
| Content type | Vocabulary |
| Domain | Home |
| Area | Kitchen |
| Category / situation | Cooking Actions |
| Status | generated |

Reset note: this spec was retained as a planning reference after the 2026-05-02 clean-start reset. Historical generated rows and the old Google Sheet remain historical only. The user approved this post-reset rebuild on 2026-05-04, and the deck was rebuilt from the fresh candidate pool through the executable runner.

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | action_verb, transcription_high_risk |
| `risk_flags` | action_aspect_transitivity, grammar_risk, scene_slot_strict |

## Scope

One learner-facing grouping principle: common kitchen actions used while preparing, cooking, serving and basic handling of food or kitchen items.

Include:

- everyday cooking and food-preparation verbs;
- basic actions with kitchen objects from `Kitchenware Basics`;
- short verb lexical items that can use English display form `to + base verb`;
- actions that support simple controlled examples in a kitchen context;
- only actions useful for beginner/elementary learners.

Exclude / move elsewhere:

- kitchen objects and utensils -> `Kitchenware Basics`;
- containers, sponges, dish soap, trash bags and cleaning supplies -> `Kitchen Storage & Cleaning`;
- cleaning-only actions like deep cleaning, scrubbing stains or laundry actions -> `Kitchen Storage & Cleaning` or `Laundry & Cleaning Basics`;
- restaurant service/order actions -> `Restaurant Words`, `Cafe Service Words` or `Takeaway & Dine-In Words`;
- recipe procedure nouns like recipe, ingredient, step -> later `Recipes & Food Prep Words` if needed;
- advanced cooking techniques like blanch, braise, marinate, caramelize -> advanced/specialized cooking deck only if needed later.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A1 |
| `level_max` | A2 |
| `frequency_band` scope | core/common |
| `priority_band` scope | core/common |
| Target item range | 25-45 |

## Candidate Pool Rule

The candidate pool is collected from actions a beginner can physically do in a kitchen: cut, wash, boil, fry, bake, stir, pour, peel, chop, slice, mix, serve, open, close, heat, cool and similar high-utility actions. Candidate verbs are filtered by everyday usefulness, clarity of kitchen meaning, ability to support a short controlled example, translation stability across all active language variants, and avoidance of advanced recipe jargon. If an action is useful outside the kitchen too, keep the example kitchen-bound instead of changing the meaning.

## Next Deck

Natural next deck(s):

- `home_kitchen_storage_cleaning_a2`;
- `home_kitchen_small_tools_supplies_a2`;
- `core_practical_action_verbs_a1_a2`.

## QA Notes

- English display form must use `to + base verb`, for example `to cut`, `to boil`, `to stir`.
- Examples must stay in the kitchen or food-preparation context and remain very short.
- Do not create ready instructions or recipe paragraphs; examples are usage anchors only.
- Keep aspect/tense controlled across languages; default examples should use simple present where possible.
- Watch ambiguous verbs: `to wash` can mean dishes, vegetables, hands, clothes or a car; this deck uses kitchen/food or dish context only.
- Watch broad verbs: `to open`, `to close`, `to turn on`, `to turn off` may also belong to `Practical Action Verbs`; include only if the kitchen candidate pool needs them and the example is kitchen-bound.
- Semantic scene must preserve action, object, number, location/topic context and tense/aspect across translated examples.
- Active card memberships require `word_selection_quality` evidence: each item must be a common beginner kitchen action inside this exact deck scope, not a kitchen object, appliance, cleaning-only action, restaurant phrase or advanced recipe technique.
- English examples must pass `example_quality`: natural, concrete, non-template and suitable as multilingual anchors.
- Do not use mass templates like `I need to ...` for every verb.
- Do not use generic placeholder objects like `the food` when a concrete kitchen object is better, for example `the onion`, `the pasta`, `the milk`, `the pot`.
- `semantic_scene.target_object` must be an actual scene object, not the target verb.
- Do not promote generated content to `generated_checked` without structured QA evidence.
- Do not reuse historical pre-rebuild `home_kitchen_cooking_actions_a1_a2_lang_*.jsonl` files from the failed mechanical run as source material. Current 2026-04-28 rebuilt batch artifacts are generated from this deck spec and the current Language Transcription Policy.
- Transcription restart must follow the current tone-aware [Language Transcription Policy](../language-transcription-policy.md): `ZH` pinyin with tone marks, `TH` / `LO` learner romanization with tone diacritics, `MY` practical romanization with tone/register notation, and `EN` / `EN-GB` verb display as `to + base verb`.

## Delivery Status

Post-reset current final status on 2026-05-05: `Cooking Actions` completed the runner path `prepare -> base -> draft-preflight -> batch-import -> qa -> export -> deliver -> complete`, then received Course Metadata punctuation, CJK example-spacing, Thai example-spacing, KM/LO action-spacing and MY action-surface repairs. The deck has 25 active cards and 1350 language rows across all 54 active language variants. `bash scripts/db-qa-set.sh home_kitchen_cooking_actions_a1_a2`, `node scripts/check-qa-evidence.mjs home_kitchen_cooking_actions_a1_a2`, source-backed translation/transcription gates, transcription-style consistency, CJK example spacing, Thai example spacing, Southeast Asian example spacing, action example surface, target semantic scene alignment and final export all pass. Target-scene alignment checked 1350/1350 target examples with 0 unsupported final rows skipped. Post-final audit `outputs/audit/final_linguistic_audit_home_kitchen_cooking_actions_a1_a2_km_lo_my_repair_20260505_results_summary.json` reports 1350 pass / 0 needs_review / 0 fail. The final workbook is `outputs/google-sheets/FlashcardsLuna_home-kitchen-cooking-actions_final.xlsx`, workbook hash `1589a7a36d1160dbab5f75f9a88ccef0f3f2d727937585139823c93e58ffda3a`. The Google Sheet in Drive folder `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei` is `FlashcardsLuna 002 of 180 - Cooking Actions` / `https://docs.google.com/spreadsheets/d/1onq4cdGFLjPcPl9M1gxAnA9gtP4E2CPRr9g2mhA2Uw0/edit?usp=drivesdk`. Readback verified 504 sampled cells and `node scripts/check-delivery-freshness.mjs home_kitchen_cooking_actions_a1_a2` passes.

2026-05-26 current-row QA refresh: after Course Metadata native-style changes, stale QA evidence was restored/refreshed for the current DB rows and the same Google Sheet was updated again. `bash scripts/db-qa-set.sh home_kitchen_cooking_actions_a1_a2`, `node scripts/check-qa-evidence.mjs home_kitchen_cooking_actions_a1_a2`, final export, Google Sheet readback, final audit `outputs/audit/final_linguistic_audit_home_kitchen_cooking_actions_a1_a2_20260526T033338Z_results_summary.json` (1350/1350 pass) and delivery freshness pass.

2026-05-05 Course Metadata punctuation repair: all 54 `Course Metadata.Title` rows now end with localized sentence punctuation and every `Description` introduces the exact `level_signal` as a separate sentence. RU is now `Действия при готовке.` / `Глаголы для готовки. Начальный уровень.`. New DB QA and final export gates block missing title punctuation and glued level phrases. The same Google Sheet file id `1onq4cdGFLjPcPl9M1gxAnA9gtP4E2CPRr9g2mhA2Uw0` was updated, readback passed, post-final audit passed, and delivery freshness passed.

2026-05-05 CJK example-spacing repair: 50 `ZH`/`JA` translated examples were repaired to remove generated tokenization spaces while preserving the same action scenes. Examples now use normal target-script spacing such as `准备蔬菜。` and `野菜を準備する。`. Three Japanese entry choices were also repaired where the example review exposed a better kitchen-action lexical anchor: `boil -> 沸かす`, `drain -> 水気を切る`, `cover -> ふたをする`. The new global gate `scripts/check-cjk-example-spacing.mjs` is wired into preflight/import/QA/final export/audit. Verification: CJK spacing checked 50 `ZH`/`JA` rows in this deck with 0 blockers; the final audit summary above reports 1350/1350 pass.

2026-05-05 Thai example-spacing repair: 25 `TH` translated examples were repaired to remove generated word-segmentation spaces while preserving the same action/object scenes. Examples now use normal short Thai clauses such as `เตรียมผัก.`, `ต้มน้ำ.` and `ปิดฝาหม้อ.`. The new global gate `scripts/check-thai-example-spacing.mjs` is wired into preflight/import/QA/final export/audit. Verification: Thai spacing checked 25 `TH` rows in this deck and 75 `TH` rows across the two current post-reset decks with 0 blockers; the final audit summary above reports 1350/1350 pass.

2026-05-05 KM/LO/MY action-example repair: 75 translated examples were repaired only for confirmed current rows: 25 `KM`, 25 `LO` and 25 `MY`. Khmer and Lao examples now remove generated token spaces inside one action clause, for example `រៀបចំបន្លែ។` and `ກຽມຜັກ.`. Burmese examples now use natural action clauses such as `ဟင်းသီးဟင်းရွက်ကိုပြင်ဆင်ပါ။` instead of purpose/infinitive `ရန်` templates for simple imperative scenes. New global gates `scripts/check-southeast-asian-example-spacing.mjs` and `scripts/check-action-example-surface.mjs` are wired into preflight/import/QA/final export/audit. Verification: the new gates checked 50 `KM`/`LO` action rows and 25 `MY` action rows with 0 blockers; post-final audit `outputs/audit/final_linguistic_audit_home_kitchen_cooking_actions_a1_a2_km_lo_my_repair_20260505_results_summary.json` reports 1350/1350 pass.

Operational quality estimate artifacts: `outputs/qa/home_kitchen_cooking_actions_a1_a2_quality_estimate_final.json` and `.csv`. These estimate source-assisted confidence by language from QA blockers/warnings, source-preflight candidates, final audit and transcription/source reports; they are not native-speaker accuracy measurements. Current summary: average overall 92%, minimum 87%, maximum 95%.

Historical pre-reset delivery and repair logs were removed from this spec to avoid confusing them with the current post-reset delivery. Pre-reset artifacts remain in `outputs/` only as historical regression material; the source of truth for this deck is the 2026-05-05 post-reset runner delivery above. This is not native-speaker approval for all 54 language variants; correct wording is `generated_checked` / `final linguistic audit completed`, not `native-approved` or `100% guaranteed`.
