# Deck Spec: Alcoholic Drinks Basics

## Identity

| Field | Value |
| --- | --- |
| Sort | 37 |
| Deck | Alcoholic Drinks Basics |
| `set_id` | `food_alcoholic_drinks_basics_a2_b1` |
| Content type | Vocabulary |
| Domain | Food & Eating |
| Area | Beverages |
| Category / situation | Common adult alcoholic drink names and basic drink categories |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, food_countability, health_safety, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | food_countability, countability_mass_count, article_gender_marker_consistency, duplicate_reuse_review, compound_whole_meaning, scene_slot_strict, regional_variant_heavy, culturally_variable_food_terms, adult_alcohol_neutral_style, health_safety_specificity, borrowed_menu_term_review, drink_category_scope |
| Example complexity default | controlled simple examples; one drink, one bottle/glass/menu/table/counter scene, neutral adult wording, no encouragement to drink, no intoxication, no medical claims, no prices, no ID/legal checks and no ordering dialogues |

## Scope

One learner-facing grouping principle: common A2-B1 adult alcoholic drink vocabulary a learner may see on a menu, bottle label or drink list, focused on drink names and drink categories rather than bar service, containers, payment, legal/admin words, intoxication, nightlife or detailed production vocabulary.

Include:

- broad adult drink categories such as `alcoholic drink`, `beer`, `wine`, `spirits` and `cocktail`;
- common beer and cider types such as `lager`, `ale`, `stout` and `cider`;
- common wine categories such as `red wine`, `white wine`, `rosé wine`, `sparkling wine`, `champagne`, `prosecco`, `vermouth`, `aperitif` and `digestif`;
- common global/regional alcohol names useful on menus and labels, such as `sake`, `soju`, `vodka`, `gin`, `rum`, `tequila`, `whiskey`, `brandy`, `liqueur`, `martini`, `margarita`, `mojito`, `sangria` and `spritz`;
- only short learner-friendly lexical items with clear drink/category meanings and portable example scenes.

Exclude / move elsewhere:

- bar/place/job/service words such as `bar`, `pub`, `bartender`, `on tap`, `last call`, `happy hour` and `draft beer` -> `Bar & Alcohol Words` or later restaurant/service decks;
- containers and serving objects such as `bottle`, `glass`, `wine glass`, `shot glass` and `bar stool` -> bar/tableware/container decks;
- non-alcoholic option words such as `non-alcoholic beer`, `alcohol-free wine` and `mocktail` -> `Bar & Alcohol Words` unless a later non-alcoholic-options deck is split out;
- legal/admin/payment words such as `ID card`, `age limit`, `license`, `cash`, `receipt` and `tip` -> Documents, Money & Payment or service decks;
- intoxication/health/safety words such as `drunk`, `hangover`, `alcohol poisoning` and `addiction` -> Health/Safety decks;
- production/place words such as `brewery`, `winery`, `vineyard`, `distillery`, `fermentation` and detailed ingredient/process terms -> later food production, travel or advanced beverage decks;
- brand names and highly local rare drinks unless promoted later with source and example support.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Pre-Intermediate |
| `level_min` | A2 |
| `level_max` | B1 |
| `frequency_band` scope | useful |
| `priority_band` scope | useful |
| Target item range | 32-32 |

## Candidate Pool Rule

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/food_alcoholic_drinks_basics_a2_b1_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside common adult drink names and drink categories, keep wording neutral, and avoid silently pulling in bar service, containers, ID/legal/payment words, intoxication/health-problem words or production/place vocabulary.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include valid adjacent drink names deferred because they are too regional, too advanced, too cocktail-heavy or not needed in the compact A2-B1 cut. Excluded rows must state the target deck or reason. If the candidate pool reveals unresolved adult-safety, source-support, duplicate, scope or example-portability ambiguity, stop at `spec_ready` and ask for user confirmation instead of generating.

Preparation checks to run before approval:

```bash
node scripts/check-deck-candidate-pool.mjs food_alcoholic_drinks_basics_a2_b1
node scripts/check-word-selection-quality.mjs food_alcoholic_drinks_basics_a2_b1
node scripts/check-deck-specs.mjs
```

Preparation status on 2026-06-09: spec and candidate pool were prepared as the next ordinary Deck Master Plan row after Sort 36. Candidate pool `outputs/candidate-pools/food_alcoholic_drinks_basics_a2_b1_candidate_pool.jsonl` has 72 rows: 32 selected, 20 backup and 20 excluded/move decisions. `check-deck-candidate-pool`, `check-word-selection-quality` and `check-deck-specs` passed; the only word-selection warning was the expected generic `other` category dominance because the heuristic has no dedicated alcohol-drink category. The user explicitly approved this exact deck for generation on 2026-06-09.

Delivery status on 2026-06-11: generated and delivered through `scripts/run-deck-production.mjs` with runner manifest `outputs/runs/food_alcoholic_drinks_basics_a2_b1/run_food_alcoholic_drinks_basics_a2_b1_20260609T014246145Z_41790a9c.json`. Final deck has 32 cards x 54 languages = 1,728 language rows. Final workbook `outputs/google-sheets/FlashcardsLuna_alcoholic-drinks-basics_final.xlsx` has sha256 `7266218eb79523f4b09ebdc2b7e693fa8f025c456665e72ebd4c276b402b623d`. Delivered Google Sheet: `FlashcardsLuna 037 of 180 - Alcoholic Drinks Basics` / `18tsuVOPKaRWnnphDMjrAdTZQnGqxYYLQwXwPehrmeOk` in Drive folder `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`. Google Sheet readback sampled 504 cells and passed. Post-final linguistic audit `outputs/audit/final_linguistic_audit_food_alcoholic_drinks_basics_a2_b1_20260611T082346Z_results_summary.json` reports 1,728/1,728 pass rows with 0 needs_review and 0 fail. Post-delivery sample audit `outputs/qa/sample_card_quality_food_alcoholic_drinks_basics_a2_b1_5_per_language_20260611_final.json` checked 5 rows per language (270 rows) with 0 blockers and 0 warnings. Delivery freshness passes. Non-RU rows remain generated_checked, not native-approved.

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck: `Bar & Alcohol Words` (Sort 38), if it receives its own spec/candidate pool and approval;
- related later decks: `Restaurant Words`, `Money & Payment`, grocery shopping, travel/nightlife, health/safety and non-alcoholic-options decks.

## QA Notes

- semantic_scene requirements: preserve the target drink/category name, the adult beverage sense and the simple bottle/glass/menu/table/counter scene. The English canonical example remains the scene source for every target language.
- duplicate policy: broad non-alcohol drink words already generated elsewhere remain out of this deck. Do not reuse generic `drink`, `glass`, `bottle`, `bar`, `order`, `menu` or payment/service meanings as new alcohol-drink meanings.
- language-specific risks: borrowed alcohol terms, local legal/cultural substitutions, brand-like drink names, wine/beer category boundaries, spirits vs ghost/spiritual false sense, cider alcohol vs apple juice, cocktail/mocktail contrast, champagne/prosecco geographic names, article/gender markers, classifier/counter choices and transliteration consistency for drink names.
- examples: keep English examples short and neutral, for example `The beer is on the menu.`, `The red wine is in the glass.` or `The cocktail is on the table.` Avoid `I want...`, `Let's drink...`, party encouragement, health claims, ages, IDs, prices, payment, intoxication and long dialogues.
- selected compounds require whole-meaning proof: `alcoholic drink`, `red wine`, `white wine`, `rosé wine`, `sparkling wine` and fixed drink names such as `champagne`, `prosecco`, `sake`, `soju`, `margarita`, `mojito`, `sangria`, `spritz`, `aperitif` and `digestif` must stay whole drink/category meanings, not literal component-only translations.
- source-backed checks needed after approval: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency, food-countability/profile gates, health-safety neutral-style review, regional variant quality where applicable and final linguistic audit.
