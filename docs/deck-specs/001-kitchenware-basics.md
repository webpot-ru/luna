# Deck Spec: Kitchenware Basics

## Identity

| Field | Value |
| --- | --- |
| Sort | 1 |
| Deck | Kitchenware Basics |
| `set_id` | `home_kitchen_cookware_pilot_01` |
| Content type | Vocabulary |
| Domain | Home |
| Area | Kitchen |
| Category / situation | Cookware, Utensils & Tableware |
| Status | generated |

Reset note: this deck was rebuilt from the clean DB through the post-reset production runner on 2026-05-04. It is active/generated in local Postgres. On 2026-05-06 its Google Sheet title was normalized to `FlashcardsLuna 001 of 180 - Kitchenware Basics`; Google Sheet readback and `check-delivery-freshness` pass. Latest same-file repair refresh completed on 2026-05-25.

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, transcription_high_risk |
| `risk_flags` | compound_whole_meaning, scene_slot_strict |

## Scope

One learner-facing grouping principle: common kitchen objects used for cooking, serving and eating.

Include:

- common cookware and tableware nouns;
- utensils, basic containers and table-setting objects;
- concrete kitchen items that can take short controlled examples;
- learner-facing display forms with articles/markers where the language requires them.

Exclude / move elsewhere:

- appliances and furniture -> `Kitchen Appliances & Furniture`;
- storage/cleaning supplies -> `Kitchen Storage & Cleaning`;
- cooking verbs -> `Cooking Actions`;
- rare/specialized tools like butter churn -> advanced/specialized kitchen deck only if needed later;
- ready sentences and requests -> out of scope; convert to vocabulary-only words if needed.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Basic |
| `level_min` | A1 |
| `level_max` | A1 |
| `frequency_band` scope | core/common |
| `priority_band` scope | core/common |
| Target item range | 50-50 for the pilot only; future narrow decks may use 20-60. |

## Candidate Pool Rule

The candidate pool is collected from visible kitchenware, cookware, utensils and table-setting objects. Items are filtered by everyday usefulness, clarity of meaning, ability to support a short example, and translation stability across all active language variants.

Do not pad with rare tools. If the pool becomes too broad, split into storage/cleaning, appliances/furniture, cooking actions, restaurant table items, or specialized kitchen tools.

## Next Deck

Natural next deck(s):

- `home_kitchen_cooking_actions_a1_a2`;
- `home_kitchen_storage_cleaning_a2`.

## QA Notes

- Post-reset runner rebuild completed on 2026-05-04 under `run_home_kitchen_cookware_pilot_01_20260503T115357168Z_84db19d9`.
- Current local DB status: generated; all 54 language variants exist with structured QA evidence.
- Current delivery status: readback and delivery freshness pass as of 2026-06-03 after the Kitchenware repair/evidence refresh.
- Pre-reset and intermediate repair logs were removed from this current QA section to avoid confusing historical repair state with the post-reset runner state.
- Local final workbook: `outputs/google-sheets/FlashcardsLuna_home-kitchen-kitchenware-basics_final.xlsx`.
- Final Google Sheet: `FlashcardsLuna 001 of 180 - Kitchenware Basics` / `https://docs.google.com/spreadsheets/d/1cHEa0ZCejUvLyLkCa_Fqy-3F9K3qspe7Rh3Ti401mos`.
- 2026-05-14 repair refresh: restored Swahili `spatula` to `mwiko mpana`; refreshed high-risk `TH`/`LO`/`MY`/`KM`/`HY` transcriptions; repaired three intra-deck contrast rows (`JA` pan/frying pan, `NL` pot/pan, `SV` pot/saucepan); normalized legacy `semantic_scene.action_or_state` values to predicate-backed scene slots; refreshed QA evidence, post-final audit and the same Google Sheet. Verification: `check-qa-evidence` pass, final audit `outputs/audit/final_linguistic_audit_home_kitchen_cookware_pilot_01_20260514T084840Z_results_summary.json` reports 2700/2700 pass, sample audit `outputs/qa/sample_card_quality_audit_home_kitchen_cookware_pilot_01_6_per_language_after_contrast_scene_repair_v2_20260514.json` reports 324 rows with 0 blockers/0 warnings, release readiness `outputs/release-readiness/home_kitchen_cookware_pilot_01_release_readiness_after_20260514_repair_v2.json` reports ready.
- 2026-05-25 same-file repair refresh: re-applied the current narrow repairs after seed replay risk was detected, refreshed Course Metadata punctuation evidence, high-risk transcription evidence, meaning-contrast rows (`JA` shallow pan, `NL` cooking pot, `SV` pot), `SW` spatula, semantic-scene QA and final audit evidence. Verification: `bash scripts/db-qa-set.sh home_kitchen_cookware_pilot_01` passes with warning-only review notes, `node scripts/check-qa-evidence.mjs home_kitchen_cookware_pilot_01` passes, final audit `outputs/audit/final_linguistic_audit_home_kitchen_cookware_pilot_01_20260525T074615Z_results_summary.json` reports 2700/2700 pass, and the same Google Sheet id `1cHEa0ZCejUvLyLkCa_Fqy-3F9K3qspe7Rh3Ti401mos` readback/freshness pass with workbook hash `f9b6b3f0e8c678c041cee1a2b739e2cb5d44594df6b5d86f21bc6d9d9644d682`.
- 2026-06-03 same-file repair/evidence refresh: restored the local DB after accidental broad seed replay by re-applying only narrow current repairs and current-value evidence. The refresh closed meaning-contrast rows (`JA` shallow pan, `NL` cooking pot, `SV` pot), restored `SW` spatula, normalized semantic-scene metadata, wrote fresh `transcription_source_backing` evidence for 2700 rows, refreshed current scene-slot proof for four repaired target examples and re-synchronized the runner manifest. Verification: `bash scripts/db-qa-set.sh home_kitchen_cookware_pilot_01` passes with warning-only review notes, `node scripts/check-qa-evidence.mjs home_kitchen_cookware_pilot_01` passes, `node scripts/check-target-semantic-scene-alignment.mjs home_kitchen_cookware_pilot_01` reports 2700/2700 proof-backed rows with 0 skipped, final audit `outputs/audit/final_linguistic_audit_home_kitchen_cookware_pilot_01_20260603T113256Z_results_summary.json` reports 2700/2700 pass, and the same Google Sheet id `1cHEa0ZCejUvLyLkCa_Fqy-3F9K3qspe7Rh3Ti401mos` readback/freshness pass with workbook hash `996a555bec7ca0838bec786d2d0280daec83a7a2450dc00dc7061a1071a54aa3`.
- `generated_checked` still means AI/source-backed checked, not native-speaker approval for all languages.
- Active card memberships require `word_selection_quality` evidence: each item must be a common kitchenware/cookware/tableware object inside this exact deck scope, not an action, appliance/furniture item, storage/cleaning supply or rare padding word.
- Examples must preserve the same semantic scene across languages using schema v1 core fields: `target_object`, `target_display`, `subject_number`, `action_or_state`, `state_or_location`, `tense_aspect`, `topic_context`.
- `table`, `glass`, `pan`, `knife`, `cup` and similar words must stay tied to the kitchen/tableware meaning, not data/material/tool meanings.
