# Deck Spec: Pronouns & People Basics

## Identity

| Field | Value |
| --- | --- |
| Sort | 18 |
| Deck | Pronouns & People Basics |
| `set_id` | `core_pronouns_people_basics_a1` |
| Content type | Vocabulary |
| Domain | Core Foundation |
| Area | Pronouns & People |
| Category / situation | Basic personal pronouns, possessive determiners, demonstratives and core people nouns |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | closed_set, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | grammar_risk, pronoun_case_person_number, possessive_marker, demonstrative_distance, politeness_formality, clusivity_risk, article_gender_marker, scene_slot_strict |
| Example complexity default | controlled simple examples; add complexity only when required by `meaning_note` / `deck_profile` |

## Scope

One learner-facing grouping principle: a Core Foundation set for the most useful A1 reference words for people: basic personal pronouns, possessive determiners, demonstratives and core people nouns.

Include:

- basic personal pronouns with explicit scope notes: `I`, basic singular `you`, `he`, `she`, `it`, `we`, `they`, and common object forms such as `me`, `him`, `her`, `us`, `them`;
- basic possessive determiners: `my`, `your`, `his`, possessive `her`, `our`, `their`;
- basic demonstratives: `this`, `that`, `these`, `those`;
- core people nouns needed before family/school/job decks: `person`, `people`, `man`, `woman`, `child`, `baby`, `boy`, `girl`, `adult`, `friend`;
- short examples that keep the pronoun/person word visible and preserve person, number, gender/reference and simple location/state/action slots.

Exclude / move elsewhere:

- question words such as `who`, `what`, `where`, `when`, `why`, `how` -> `Question Words` (Sort 19);
- formal grammar-heavy pronoun variants, reflexive pronouns and possessive pronouns such as `mine`, `yours`, `hers`, `ours`, `theirs`, `myself` -> later pronoun/grammar expansion;
- family terms such as `mother`, `father`, `parent`, `brother`, `sister` -> `Family & Relationships`;
- school/work/service roles such as `teacher`, `student`, `classmate`, `customer`, `doctor`, `driver`, `waiter` -> the relevant school, work, service or health deck;
- age/appearance adjectives such as `young`, `old`, `tall`, `short` -> `Appearance Basics` or `Object States & Qualities`.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Basic |
| `level_min` | A1 |
| `level_max` | A1 |
| `frequency_band` scope | core |
| `priority_band` scope | core |
| Target item range | 34-34 |

## Candidate Pool Rule

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/core_pronouns_people_basics_a1_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside Core Foundation / Pronouns & People and must disambiguate English surface forms that collapse several meanings, especially `you`, `her`, `it`, `we`, `they`, `this`, `that`, `people` and `adult`.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include formal/plural pronoun variants, reflexives, indefinite pronouns and possessive pronouns; excluded rows must state the target deck or reason. If the candidate pool reveals unresolved politeness/formality, singular/plural, clusivity, gender/reference, duplicate risk or weak example feasibility, stop at `spec_ready` and ask for user confirmation instead of promoting the deck.

Before moving to `approved_for_generation`, run:

```bash
node scripts/check-deck-candidate-pool.mjs core_pronouns_people_basics_a1
node scripts/check-word-selection-quality.mjs core_pronouns_people_basics_a1
```

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck is completed: `Question Words` (Sort 19);
- related Core Foundation continuations: `Basic Verbs` (Sort 20), `Practical Action Verbs` (Sort 21), `Time & Days` (Sort 22);
- adjacent later decks: `Family & Relationships`, `Appearance Basics`, `School Basics`, `Work Social Words`.

## Final Delivery

Post-reset runner build completed on 2026-05-19.

| Field | Value |
| --- | --- |
| Final card count | 34 |
| Active language count | 54 |
| Localized entry rows | 1836 |
| Google Sheet | `FlashcardsLuna 018 of 180 - Pronouns & People Basics` |
| Google Sheet id | `1D1tbd0fFDgwjbS9BbsKT86PD33EPd9jm5lUViyLpuKw` |
| Final XLSX | `outputs/google-sheets/FlashcardsLuna_pronouns-people-basics_final.xlsx` |
| Delivery manifest | `outputs/google-sheets/FlashcardsLuna_pronouns-people-basics_final_delivery.json` |
| Runner manifest | `outputs/runs/core_pronouns_people_basics_a1/run_core_pronouns_people_basics_a1_20260519T035215792Z_a6f74c05.json` |
| Post-final audit | 1836/1836 pass, 0 needs_review, 0 fail |
| Delivery gates | Google Sheet readback and delivery freshness pass |
| Status policy | Non-RU languages remain `generated_checked`, not native-approved. |

## QA Notes

- semantic_scene requirements: preserve target pronoun/person word, person/reference, number, gender/reference where relevant, possessive relationship, demonstrative distance/number and the simple state/action/location in the English canonical example.
- language-specific risks: pro-drop languages may omit pronouns naturally, but card examples must keep the target lexical item visible; many languages distinguish singular/plural/formal `you`, inclusive/exclusive `we`, gendered third person, human/non-human `they`, case-marked object pronouns, possessive suffixes or demonstrative distance.
- examples: keep scenes short and concrete, with one pronoun/person word and one simple state/action/location. Do not use meta templates such as `Pronoun: I`, do not let all target languages switch to a different shared template, and do not hide the pronoun in pro-drop target examples.
- transcription risks: IPA languages need source-backed pronunciation for the displayed form; native-copy languages repeat display word; `ZH` requires tone-marked pinyin; `TH`/`LO`/`MY`/`KM`/`HY` strict high-risk lookup/style gates apply.
- source-backed checks needed: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency, regional variant quality where applicable and final linguistic audit.
