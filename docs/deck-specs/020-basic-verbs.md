# Deck Spec: Basic Verbs

## Identity

| Field | Value |
| --- | --- |
| Sort | 20 |
| Deck | Basic Verbs |
| `set_id` | `core_basic_verbs_a1_a2` |
| Content type | Vocabulary |
| Domain | Core Foundation |
| Area | Basic Verbs |
| Category / situation | High-frequency A1-A2 core verbs for simple everyday sentences |
| Status | generated |

## Post-Reset Delivery

Status: generated/delivery-fresh as of 2026-05-19.

- runner manifest: `outputs/runs/core_basic_verbs_a1_a2/run_core_basic_verbs_a1_a2_20260519T150119809Z_5759dd15.json`;
- final cards: 36 cards x 54 languages = 1944 language rows;
- final workbook: `outputs/google-sheets/FlashcardsLuna_basic-verbs_final.xlsx`;
- Google Sheet: `FlashcardsLuna 020 of 180 - Basic Verbs` / `1dX5EG6beSKj3dP4fAjXcX9zWykl-Xhd3pchxWzMp_WI`;
- runner QA, final export, Google Sheet readback, post-final linguistic audit 1944/1944 and delivery freshness all pass;
- non-RU language rows remain at most `generated_checked`, not native-approved.

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | action_verb, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | verb_scope, verb_transitivity, aspect_pair_risk, auxiliary_vs_lexical_sense, modal_scope_risk, case_frame_risk, politeness_formality, example_scene_strict, article_gender_marker |
| Example complexity default | controlled short examples; one verb anchor plus one simple actor/object/state/location slot |

## Scope

One learner-facing grouping principle: a Core Foundation verb deck for high-frequency lexical verbs learners need before broader practical-action, time, service and topic decks.

Include:

- core A1-A2 everyday verbs that support many future decks: `be`, `have`, `do`, `go`, `come`, `get`, `make`, `take`, `give`, `put`, `use`, `need`, `want`, `like`, `know`, `think`, `say`, `tell`, `ask`, `answer`, `see`, `look`, `hear`, `listen`, `speak`, `read`, `write`, `learn`, `understand`, `remember`, `forget`, `find`, `start`, `stop`, `help`, `wait`;
- only one clearly disambiguated lexical sense per card, especially for `be`, `have`, `do`, `get`, `make`, `take`, `put`, `say`, `tell`, `see`, `look`, `hear`, `listen`, `start` and `stop`;
- short learner-friendly dictionary/base display forms, normally `to + base verb` for EN;
- simple examples that preserve actor, verb, object/state/location and tense/usage across all 54 active language variants.

Exclude / move elsewhere:

- physical movement and manipulation actions such as `walk`, `run`, `sit`, `stand`, `hold`, `carry`, `bring`, `open`, `close`, `move`, `turn on`, `turn off` -> `Practical Action Verbs` (Sort 21) unless they are later reused by exact `meaning_id`;
- cooking and food-prep actions such as `cut`, `cook`, `boil`, `bake`, `fry`, `mix`, `slice`, `pour`, `drain` -> `Cooking Actions` / food preparation decks;
- cleaning/laundry actions such as `wash`, `clean`, `dry`, `fold`, `sweep`, `wipe` -> Laundry/Cleaning or room-specific action decks;
- tech/app actions such as `click`, `tap`, `charge`, `log in`, `upload`, `download`, `save` -> Phone/App Actions or Technology decks;
- modal/grammar-only items such as `can`, `must`, `should`, `may`, `would`, `could`, `will`, `did`, `does` when they are auxiliary grammar words rather than lexical vocabulary -> later grammar-support or modal deck;
- domain-specific service verbs such as `book`, `rent`, `pay`, `order`, `return`, `exchange`, `complain` -> travel, shopping, money or service/problem decks.

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

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/core_basic_verbs_a1_a2_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside Core Foundation / Basic Verbs and must disambiguate English surface verbs that collapse several meanings, especially `be`, `have`, `do`, `get`, `make`, `take`, `put`, `use`, `say`, `tell`, `see`, `look`, `hear`, `listen`, `start` and `stop`.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include related core verbs that are useful but better handled in Sort 21 or later grammar/action decks; excluded rows must state the target deck or reason. If the candidate pool reveals unresolved auxiliary-vs-lexical sense, aspect/transitivity, duplicate risk, modal scope, weak examples or cross-language lexical anchor risk, stop at `spec_ready` and ask for user confirmation instead of promoting the deck.

The 72-row pool passed candidate-pool and word-selection gates with 36 selected, 18 backup and 18 excluded/move decisions. The only word-selection warning is expected checker noise for a part-of-speech deck: all selected verbs are currently classified as `other` by the generic noun/category balance heuristic. No unresolved scope, duplicate, weak-example, source-support or translation-risk blocker remains before generation.

Pre-generation checks that passed before delivery:

```bash
node scripts/check-deck-candidate-pool.mjs core_basic_verbs_a1_a2
node scripts/check-word-selection-quality.mjs core_basic_verbs_a1_a2
```

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck is completed: `Practical Action Verbs` (Sort 21);
- related Core Foundation continuations: `Time & Days` (Sort 22), `Learning Help Words` (Sort 23);
- adjacent later decks: `Phone & App Actions`, `Cooking Actions`, `Laundry & Cleaning Basics`, `Shopping Basics`.

## QA Notes

- semantic_scene requirements: preserve the target verb, lexical sense, actor/subject where relevant, object/state/location slot and tense/aspect/usage in the English canonical example.
- language-specific risks: many languages split English verbs by aspect, transitivity, motion direction, object type, politeness/register or evidential/tense morphology; examples must not force a different sense just to keep English word order.
- examples: keep every English canonical example short and concrete. Avoid generic templates such as `I need to ...` for all rows, avoid generic objects such as `the food`, and avoid turning selected verbs into domain-specific cooking/tech/service actions.
- selected auxiliary-prone verbs require lexical-sense proof: `be`, `have`, `do` and similar rows must teach a useful dictionary/base verb sense, not only an English grammar helper.
- transcription risks: IPA languages need source-backed pronunciation for the displayed form; native-copy languages repeat display word; `ZH` requires tone-marked pinyin; `TH`/`LO`/`MY`/`KM`/`HY` strict high-risk lookup/style gates apply.
- source-backed checks needed: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, action verb profile checks, article/gender marker consistency, regional variant quality where applicable and final linguistic audit.
