# Deck Spec: Takeaway & Dine-In Words

## Identity

| Field | Value |
| --- | --- |
| Sort | 36 |
| Deck | Takeaway & Dine-In Words |
| `set_id` | `food_takeaway_dine_in_words_a2` |
| Content type | Vocabulary |
| Domain | Food & Eating |
| Area | Fast Food |
| Category / situation | Takeaway/dine-in service options, order-flow words and simple food-packaging terms |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, service_problem, food_countability, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | service_option_scope, order_flow_scope, takeaway_packaging_scope, food_countability, countability_mass_count, article_gender_marker_consistency, duplicate_reuse_review, compound_whole_meaning, scene_slot_strict, regional_variant_heavy, culturally_variable_service_terms, payment_admin_boundary, restaurant_words_boundary, borrowed_menu_term_review |
| Example complexity default | controlled simple examples; one service option, order identifier, counter/place or takeaway package, one concrete counter/bag/receipt/order/door scene, no full ordering dialogues, prices, payment-card data, personal contact details, booking/reservation scenes or unnecessary grammar complexity |

## Scope

One learner-facing grouping principle: A2 fast-food/casual-service vocabulary that helps a learner recognize takeaway, dine-in, pickup, delivery, order-status and simple food-packaging context, without expanding into menu items, sauces/extras, broad restaurant staff/service roles, payment vocabulary, contact/admin fields or full phrasebook dialogues.

Include:

- service option words and expressions such as `takeaway`, `dine-in`, `to go`, `delivery`, `pickup` and `drive-through`;
- order-flow and pickup words such as `food order`, `order number`, `pickup time`, `table number`, `pickup counter`, `collection point`, `mobile order`, `online order`, `order screen` and `service counter`;
- customer-place words such as `counter`, `queue`, `seating area` and `waiting area`;
- a compact set of takeaway packaging words such as `takeaway bag`, `takeaway box`, `food container`, `wrapper` and `paper bag`;
- small service words such as `receipt`, `cashier`, `kiosk`, `self-service`, `refill` and `table service` only when the meaning stays inside casual-food service and does not become a full payment, job or restaurant-management lesson.

Exclude / move elsewhere:

- full fast-food menu items such as `burger`, `fries`, `cola`, `milkshake`, `chicken nuggets` and `pizza slice` -> already generated or future reuse in `Fast Food Basics`, `Drink Basics` or cafe/drink decks;
- sauces, condiments and extras such as `ketchup`, `mustard`, `sauce packet`, `extra cheese`, `pickle` and `jalapeño` -> `Sauces & Extras`;
- already generated tableware/drink-accessory words such as generic `fork`, `spoon`, `knife`, `cup`, `tray`, `napkin`, `lid`, `straw` and `cup holder` unless a future explicit reuse retrofit is deliberately planned;
- payment/admin words such as `price`, `card payment`, `service charge`, `delivery fee`, full address/contact fields and detailed receipts -> `Money & Payment`, `Documents / Contact Details` or later admin decks;
- broad restaurant words such as `waiter`, `server`, `reservation`, `host`, `bill`, `kitchen`, `chef`, `restaurant table` and staff roles -> `Restaurant Words`, `Work & Jobs` or `Hotel Check-in Words`;
- diet/health/safety words such as `allergy`, `gluten-free`, `vegetarian`, `halal` and detailed dietary restrictions -> diet/health decks.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A2 |
| `level_max` | A2 |
| `frequency_band` scope | survival/common |
| `priority_band` scope | survival/common |
| Target item range | 32-32 |

## Candidate Pool Rule

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/food_takeaway_dine_in_words_a2_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside service options, order-flow words, simple pickup/delivery context and takeaway packaging. Do not silently pull in menu items, sauces/extras, payment/admin vocabulary, broad restaurant staff words or already generated tableware/drink accessories.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include regional variants or adjacent service/packaging words deferred because the selected cut stays compact and portable. Excluded rows must state the target deck or reason. If the candidate pool reveals unresolved scope leakage, duplicate risk, weak source support, non-portable examples, regional ambiguity, admin/payment leakage or cross-language target examples that drift away from the English canonical scene, stop at `spec_ready` and ask for user confirmation instead of generating.

Preparation checks to run before approval:

```bash
node scripts/check-deck-candidate-pool.mjs food_takeaway_dine_in_words_a2
node scripts/check-word-selection-quality.mjs food_takeaway_dine_in_words_a2
node scripts/check-deck-specs.mjs
```

Preparation status on 2026-06-08: spec and candidate pool were prepared for the next ordinary Deck Master Plan row after Sort 35. Candidate pool has 72 rows: 32 selected, 20 backup and 20 excluded/move decisions. `node scripts/check-deck-candidate-pool.mjs food_takeaway_dine_in_words_a2` passes; `node scripts/check-word-selection-quality.mjs food_takeaway_dine_in_words_a2` passes with one expected heuristic warning that the selected service-flow set is dominated by `other`; `node scripts/check-deck-specs.mjs` passes. User follow-up approval promoted this deck to `approved_for_generation`. Because this deck has real scope and duplicate risk against `Fast Food Basics`, `Sauces & Extras`, `Cafe Drink Options`, `Dining Room & Table Setup`, `Money & Payment` and future `Restaurant Words`, generation had to proceed only through the production runner with normal source preflight, QA, export, Google Sheet readback and delivery freshness gates.

Delivery status on 2026-06-08: generated and delivered through `scripts/run-deck-production.mjs` stages `prepare`, `base`, `draft-preflight`, `batch-import`, `qa`, `export`, `deliver` and `complete`. Final workbook: `outputs/google-sheets/FlashcardsLuna_takeaway-dine-in-words_final.xlsx`, sha256 `df6fbdb69b1215349da61401d8549a57c21329fab5cf44bff799c40088466668`. Google Sheet: `FlashcardsLuna 036 of 180 - Takeaway & Dine-In Words` / `1xLrGIFHcA_OIDqBBoehrNw0Zz9liFSiyqp1u0S1n27Y` in Drive folder `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`. Runner manifest: `outputs/runs/food_takeaway_dine_in_words_a2/run_food_takeaway_dine_in_words_a2_20260608T044316409Z_f059ec1e.json`, status `completed`.

Post-delivery sample audit on 2026-06-08: `outputs/qa/sample_card_quality_food_takeaway_dine_in_words_a2_5_per_language_20260608_after_ka_repair.json` checked 5 rows per language (270 sampled rows), found 0 blockers and 23 advisory warnings after the confirmed KA cashier example typo was repaired from `მოლირე დახლთან არის.` to `მოლარე დახლთან არის.`. The same Google Sheet was updated in place after the repair.

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck: `Alcoholic Drinks Basics` (Sort 37), if it receives its own spec/candidate pool and approval, or skip to Sort 39 if beverage alcohol remains deferred;
- related later decks: `Restaurant Words`, `Money & Payment`, `Grocery Shopping Words`, `Basic Ingredients & Spices`, `Cafe Food & Table Items`, `Hotel Check-in Words` and `Documents / Contact Details`.

## QA Notes

- semantic_scene requirements: preserve the target service option, order-flow identifier, counter/place or packaging object, plus the concrete counter/bag/receipt/order/door scene. The English canonical example remains the scene source for every target language.
- duplicate policy: generic `tray`, `napkin`, `lid`, `straw`, `cup holder`, `fork`, `spoon`, `knife` and `cup` are already covered or better placed elsewhere. Keep them backup/excluded unless a future explicit reuse retrofit selects existing meaning IDs.
- language-specific risks: regional variants for takeaway/takeout/to-go/dine-in, delivery/pickup false senses, drive-through loanwords, order/command/sequence ambiguity, counter as surface vs service point, receipt vs recipe/ticket, refill as ink/medicine vs drink, cashier/job vs payment role, queue/line regional terms, and article/gender markers.
- examples: keep English examples short and concrete, for example `The food order is ready.`, `The pickup counter is busy.` or `The takeaway bag is on the counter.` Avoid `I want...`, prices, payment-card details, phone/address data, long dialogues and examples that target languages can match while drifting away from English.
- selected compounds require whole-meaning proof: `to go`, `drive-through`, `food order`, `order number`, `pickup time`, `table number`, `seating area`, `pickup counter`, `takeaway bag`, `takeaway box`, `food container`, `paper bag`, `self-service`, `mobile order`, `online order`, `table service`, `collection point`, `waiting area`, `order screen` and `service counter` must stay whole service/packaging meanings, not literal component-only translations.
- source-backed checks needed after approval: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency, food-countability/profile gates, regional variant quality where applicable and final linguistic audit.
- final QA evidence: 32 cards x 54 active languages = 1,728 language rows; runner QA passed with no failed ERROR checks; target semantic scene alignment checked 1,728 proof-backed rows with 0 unsupported/skipped rows; final linguistic audit `outputs/audit/final_linguistic_audit_food_takeaway_dine_in_words_a2_20260608T132433Z_results_summary.json` reports 1,728/1,728 pass rows, 0 needs_review and 0 fail; Google Sheet readback sampled 504 cells and `check-delivery-freshness` passes.
