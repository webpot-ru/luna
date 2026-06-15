# Deck Spec: Dining Room & Table Setup

## Identity

| Field | Value |
| --- | --- |
| Sort | 8 |
| Deck | Dining Room & Table Setup |
| `set_id` | `home_dining_room_table_setup_a1_a2` |
| Content type | Vocabulary |
| Domain | Home |
| Area | Dining Room |
| Category / situation | Dining Room Objects & Table Setup Items |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, transcription_high_risk |
| `risk_flags` | compound_whole_meaning, scene_slot_strict, article_gender_marker_consistency |

## Scope

One learner-facing grouping principle: high-frequency visible dining-room furniture, table-layout objects and simple serving/setup items that a learner can identify in a home dining space. Under the independent-study duplicate policy, essential table-setting objects may repeat from Kitchenware Basics only as explicit existing-meaning reuse rows; do not create new duplicate meanings for the same sense.

Include:

- dining-room anchors such as dining room, dining table, dining chair, dining bench and dining set;
- common dining-room storage/furniture such as sideboard, buffet cabinet, china cabinet, bar cart and serving cart;
- table setup nouns such as table runner, centerpiece, place setting, table setting, place card, napkin ring, coaster and tea set;
- simple serving/setup objects that are not already selected in Kitchenware Basics, such as bread basket, fruit bowl, serving platter, serving dish and cake stand;
- core table-setting objects as explicit existing-meaning reuse rows from Kitchenware Basics: plate, bowl, cup, glass, fork, spoon, knife, napkin, placemat, tablecloth, tray, serving bowl, serving spoon, salt shaker and pepper shaker;
- short noun or noun-phrase entries with controlled, scene-preserving examples.

Exclude / move elsewhere:

- already generated core tableware and kitchenware outside the approved reuse list, or any duplicate row that cannot safely reuse an existing `meaning_id`;
- cooking, washing, serving and hosting actions -> Cooking Actions or later hospitality/action decks;
- broad generic furniture such as table, chair, cabinet and shelf unless selected as a dining-specific whole meaning;
- restaurant menu/order/payment words -> later Eating Out / Restaurants / Payments decks;
- decor-only objects already selected in Living Room Basics such as vase, candle and candle holder unless the meaning is table-setting-specific and not a duplicate;
- rare formal banquet terms that are hard to translate consistently across all 54 languages.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A1 |
| `level_max` | A2 |
| `frequency_band` scope | common |
| `priority_band` scope | common/useful |
| Target item range | 40-40 |

## Candidate Pool Rule

Build a candidate pool of at least 50 dining-room/table-setup-adjacent nouns and noun phrases, then filter it to exactly 40 selected cards. The pool must be wider than the final deck and must record selected, backup and excluded/move decisions.

Every selected row must have:

- a clear dining-room or table-setup object meaning;
- no unresolved duplicate/reuse conflict with the current generated decks;
- for reused core tableware rows, a concrete `duplicate_reuse_decision` naming the existing Kitchenware `meaning_id`;
- a short semantic scene that can be preserved across all 54 languages;
- `scope_decision`, `duplicate_reuse_decision`, `compound_multiword_risk`, `translation_risk` and `required_qa_profile` in the candidate pool.

## Next Deck

Natural next deck(s):

- operational next by Deck Master Plan: `Entryway & Outerwear` (Sort 9);
- nearby home continuation: `Furniture Basics` (Sort 10);
- later related decks: `Food Basics`, `Eating Out & Restaurants`, `Decor & Textiles`.

## QA Notes

- 2026-05-13 duplicate-policy retrofit: this deck expands from 25 to 40 cards by adding `plate`, `bowl`, `cup`, `glass`, `fork`, `spoon`, `knife`, `napkin`, `placemat`, `tablecloth`, `tray`, `serving bowl`, `serving spoon`, `salt shaker` and `pepper shaker` as explicit existing-meaning reuse rows from Kitchenware Basics. Do not create new `meaning_id` values for these senses. The updated 40-card deck is not final until the full QA/export/delivery loop passes again.
- Keep the deck noun/object-focused; do not add hosting phrases, restaurant/payment vocabulary or cooking actions.
- English canonical examples must stay simple and scene-preserving, for example `The dining table is clean.`, `The table runner is blue.`, `The coaster is under the glass.`
- Target examples must preserve the English canonical scene slots: target object, state/location, simple tense and dining/table context. Agreement among target languages does not override the English canonical scene.
- Avoid examples that force unnecessary plural, tense, case, classifier or register complexity. Prefer one visible object plus one simple location/state.
- Compound risks: `dining room`, `dining table`, `dining chair`, `dining bench`, `dining set`, `buffet cabinet`, `china cabinet`, `bar cart`, `serving cart`, `table runner`, `place setting`, `table setting`, `place card`, `napkin ring`, `bread basket`, `fruit bowl`, `serving platter`, `serving dish`, `cake stand` and `tea set` require whole-meaning review rather than component-by-component translation.
- Language-specific risks: article/gender markers for European languages, classifier/spacing/script rules for CJK and Southeast Asian languages, tone/romanization policy for ZH/TH/LO/MY, and native-copy rules for languages where transcription equals display form.
- Non-RU language rows must remain at most `generated_checked`; no non-RU row may be promoted to native-approved without separate native review.

## Approval

2026-05-08: spec and candidate pool prepared for review. User explicitly approved `Dining Room & Table Setup` for generation in this thread. This one deck is promoted to `approved_for_generation`; it may run only through `scripts/run-deck-production.mjs` and is not final/generated until QA/export/readback/post-final audit/delivery freshness pass.

2026-05-08: generated and delivered through `scripts/run-deck-production.mjs` run `run_home_dining_room_table_setup_a1_a2_20260508T094040407Z_071d0e35`. Final output had 25 cards x 54 language variants = 1350 language rows, target semantic scene alignment 1350/1350 proof-backed rows with 0 skipped, final linguistic audit 1350/1350 pass, Google Sheet readback pass and delivery freshness pass. Production Google Sheet: `FlashcardsLuna 008 of 180 - Dining Room & Table Setup` / `1WpphriRtOBeZo2WOU8bv1gCTx88IxMYGpSSPeVbjRX0`. Status was `generated`; non-RU rows remain `generated_checked`, not native-approved.

2026-05-13: user approved starting the duplicate-policy retrofit for this deck. Candidate pool target is now 40 selected cards. The existing Google Sheet must be updated only after DB retrofit, QA, final export, readback, post-final audit and delivery freshness pass for 40 cards x 54 language variants = 2160 language rows.

2026-05-13: duplicate-policy retrofit completed. The deck now has 40 cards x 54 language variants = 2160 language rows. The 15 added rows reuse existing Kitchenware `meaning_id` values, keep global entries unchanged, and carry Dining membership context plus current-value-locked QA evidence. `bash scripts/db-qa-set.sh home_dining_room_table_setup_a1_a2`, `node scripts/check-qa-evidence.mjs home_dining_room_table_setup_a1_a2`, final export, same-file Google Sheet update/readback, post-final linguistic audit 2160/2160 and delivery freshness all pass. Production Google Sheet remains `FlashcardsLuna 008 of 180 - Dining Room & Table Setup` / `1WpphriRtOBeZo2WOU8bv1gCTx88IxMYGpSSPeVbjRX0`; non-RU rows remain `generated_checked`, not native-approved.

2026-05-14: dependent delivery refresh completed after shared Kitchenware meaning repairs made the prior Dining export stale. The same Google Sheet `1WpphriRtOBeZo2WOU8bv1gCTx88IxMYGpSSPeVbjRX0` was updated in place; readback passed, final audit `outputs/audit/final_linguistic_audit_home_dining_room_table_setup_a1_a2_20260514_recheck_results_summary.json` reports 2160/2160 pass rows and delivery freshness passes with workbook hash `b3f5f6c5bd6c9193157ae6baabd97cb5b1478e65660fdaeb3c3469746d9d7e39`.

2026-06-03: dependent delivery resync completed after the current Kitchenware repair/evidence refresh made the prior Dining export stale again. No card text changed. The same Google Sheet `1WpphriRtOBeZo2WOU8bv1gCTx88IxMYGpSSPeVbjRX0` was updated in place; readback passed and delivery freshness passes with workbook hash `667919c955204ce2e815735ad756cfe9c090829b5f7cfdcb24b82f779ffb0de7`.
