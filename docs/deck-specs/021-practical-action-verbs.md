# Deck Spec: Practical Action Verbs

## Identity

| Field | Value |
| --- | --- |
| Sort | 21 |
| Deck | Practical Action Verbs |
| `set_id` | `core_practical_action_verbs_a1_a2` |
| Content type | Vocabulary |
| Domain | Core Foundation |
| Area | Practical Action Verbs |
| Category / situation | Common physical and practical everyday actions |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | action_verb, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | practical_action_scope, verb_transitivity, object_collocation, phrasal_verb_whole_meaning, motion_direction, aspect_pair_risk, imperative_scene_risk, article_gender_marker, example_scene_strict |
| Example complexity default | controlled short action scenes; one actor or imperative subject plus one simple object/place slot |

## Scope

One learner-facing grouping principle: a Core Foundation action-verb deck for high-frequency physical and practical actions learners need to describe simple everyday movement, handling, device-control and object-care scenes.

Include:

- common A1-A2 physical movement and body-position verbs: `walk`, `run`, `sit`, `stand`, `lie down`, `get up`, `enter`, `leave`;
- common handling/manipulation verbs: `hold`, `carry`, `bring`, `pick up`, `put down`, `move`, `push`, `pull`, `lift`, `drop`, `throw`, `catch`;
- common door/object/control actions: `open`, `close`, `turn`, `turn on`, `turn off`, `plug in`, `unplug`, `charge`;
- broad object-care/problem actions with a concrete everyday object scene: `wash`, `dry`, `clean`, `fix`, `break`, `lose`;
- short learner-friendly dictionary/base display forms, normally `to + base verb` for EN;
- examples that preserve action, object/place, simple direction/state and tense/usage across all 54 active language variants.

Exclude / move elsewhere:

- broad auxiliary/core mental/reporting verbs already covered by `Basic Verbs`, unless exact meaning reuse is deliberately selected;
- cooking-only actions such as `chop`, `slice`, `boil`, `bake`, `fry`, `stir`, `pour`, `drain`, `season` -> `Cooking Actions` / food-preparation decks;
- laundry/cleaning workflow-specific actions such as `fold`, `iron`, `sweep`, `mop`, `vacuum` -> Laundry/Cleaning or later household action decks;
- phone/app and computer actions such as `click`, `tap`, `log in`, `upload`, `download`, `save`, `print`, `scan`, `type` -> Phone/App Actions or Technology decks;
- payment/service/admin verbs such as `pay`, `return`, `exchange`, `book`, `rent`, `sign`, `fill in` -> money, shopping, travel, service or document decks;
- sports/game-specific actions, rare physical actions and phrasal verbs whose meaning is not needed for A1-A2 practical scenes.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A1 |
| `level_max` | A2 |
| `frequency_band` scope | core/common |
| `priority_band` scope | core/common |
| Target item range | 36-36 |

## Candidate Pool Rule

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/core_practical_action_verbs_a1_a2_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside Core Foundation / Practical Action Verbs and must disambiguate English phrasal verbs and broad surface verbs, especially `turn`, `turn on`, `turn off`, `pick up`, `put down`, `get up`, `lie down`, `wash`, `dry`, `clean`, `fix`, `break` and `lose`.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include useful physical/service verbs that are better handled in narrower later decks; excluded rows must state the target deck or reason. If the candidate pool reveals unresolved duplicate risk, phrasal-verb whole-meaning risk, domain leakage, weak examples or cross-language action-scene risk, stop at `spec_ready` and ask for user confirmation instead of promoting the deck.

Pre-generation checks that passed before promotion to `approved_for_generation`:

```bash
node scripts/check-deck-candidate-pool.mjs core_practical_action_verbs_a1_a2
node scripts/check-word-selection-quality.mjs core_practical_action_verbs_a1_a2
```

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck is completed: `Time & Days` (Sort 22);
- related Core Foundation continuations: `Learning Help Words` (Sort 23), object states/qualities and preposition/location decks;
- adjacent later decks: `Phone & App Actions`, `Cooking Actions`, `Laundry & Cleaning Basics`, `Shopping Basics`, `Device Charging & Accessories`.

## Delivery Status

Post-reset production runner delivery completed on 2026-05-20.

| Field | Value |
| --- | --- |
| Final item count | 36 cards |
| Language variants | 54 |
| Language-entry rows | 1944 |
| Final workbook | `outputs/google-sheets/FlashcardsLuna_practical-action-verbs_final.xlsx` |
| Google Sheet | `FlashcardsLuna 021 of 180 - Practical Action Verbs` / `1ltPINZkvavEp0nz3Fhxu0lT0LPkJk5QFE6WzxmphPPw` |
| Runner manifest | `outputs/runs/core_practical_action_verbs_a1_a2/run_core_practical_action_verbs_a1_a2_20260520T024719151Z_5dd7e833.json` |
| Delivery manifest | `outputs/google-sheets/FlashcardsLuna_practical-action-verbs_final_delivery.json` |
| Final audit | 1944/1944 pass, 0 needs_review, 0 fail |
| Readback/freshness | Google Sheet readback pass; delivery freshness pass |
| Sample audit | 270 sampled rows, 0 blockers, 110 non-blocking lexical-anchor/location-anchor warnings |

Non-RU languages remain `generated_checked`, not native-approved.

## QA Notes

- semantic_scene requirements: preserve the target action, actor/subject where relevant, object/place slot, direction or on/off/control state and tense/usage in the English canonical example.
- language-specific risks: many languages split English action verbs by transitivity, aspect, direction, object type, caused state, politeness/register or phrasal-verb whole meaning; examples must not force a different sense just to keep English word order.
- examples: keep every English canonical example short and concrete. Prefer simple visible scenes such as `Open the window.` or `Carry the box.` Avoid generic templates, service/payment contexts and repeated weak object choices.
- selected phrasal verbs require whole-meaning proof: `turn on`, `turn off`, `plug in`, `get up`, `lie down`, `pick up` and `put down` must be translated as the intended action, not as literal components.
- transcription risks: IPA languages need source-backed pronunciation for the displayed form; native-copy languages repeat display word; `ZH` requires tone-marked pinyin; `TH`/`LO`/`MY`/`KM`/`HY` strict high-risk lookup/style gates apply.
- source-backed checks needed: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, action verb profile checks, article/gender marker consistency, regional variant quality where applicable and final linguistic audit.
