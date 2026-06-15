# Deck Spec: Learning Help Words

## Identity

| Field | Value |
| --- | --- |
| Sort | 23 |
| Deck | Learning Help Words |
| `set_id` | `core_learning_help_words_a1_a2` |
| Content type | Vocabulary |
| Domain | Core Foundation |
| Area | Learning Help Words |
| Category / situation | Learner-facing words for cards, examples, questions, answers, hints and simple study feedback |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | closed_set, object_noun, adjective_state, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | learning_instruction_scope, study_feedback_words, classroom_test_scope_boundary, answer_question_noun_vs_verb, grammar_term_translation, example_scene_strict, article_gender_marker, regional_variant_quality, compound_multiword_learning_terms, source_backing_required |
| Example complexity default | very simple canonical learning scenes with one learner word plus one object/state/location slot; avoid school-admin, exam-scoring, technology account, and abstract grammar complexity unless the selected meaning requires it |

## Scope

One learner-facing grouping principle: Core Foundation words that help a learner understand a flashcard, a simple exercise, feedback on an answer and basic study support.

Include:

- short nouns used around learning cards and exercises: `word`, `phrase`, `sentence`, `meaning`, `translation`, `example`, `question`, `answer`, `hint`, `help`;
- simple study/task nouns: `lesson`, `practice`, `review`, `mistake`, `rule`, `grammar`, `pronunciation`, `spelling`, `letter`, `sound`, `voice`, `text`, `note`, `quiz`, `test`, `homework`, `class`, `level`, `list`, `choice`, `blank`;
- simple feedback/state words useful in learning: `correct`, `wrong`, `easy`, `hard`, `again`;
- examples that preserve the English canonical scene across all 54 active language variants: target word/form, learning object, simple state/action and location/context.

Exclude / move elsewhere:

- people and places of formal schooling such as `teacher`, `student`, `school`, `classroom` -> later school/classroom decks;
- office/study physical objects such as `book`, `pen`, `pencil`, `notebook`, `computer` -> existing or later Home Office / Reading / Technology decks;
- account/admin/contact words such as `form`, `password`, `email`, phone/contact fields -> Documents / Contact Details / Technology decks;
- grades, exams as formal assessment systems, certificates and course administration -> School / Exams / Documents decks;
- broad action verbs already covered in Basic Verbs, such as `read`, `write`, `listen`, `say`, `learn`, `remember`, `forget`, `start` -> keep as backup/reuse candidates only unless a later deck explicitly needs duplicate reuse.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A1 |
| `level_max` | A2 |
| `frequency_band` scope | survival/core |
| `priority_band` scope | survival/core |
| Target item range | 36-36 |

## Candidate Pool Rule

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/core_learning_help_words_a1_a2_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside learner-facing help words and must disambiguate English surfaces with competing senses, especially `answer`, `help`, `review`, `practice`, `rule`, `letter`, `sound`, `voice`, `class`, `test`, `blank`, `choice`, `hard` and `level`.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include useful instruction verbs or broader school words that may become later decks or explicit duplicate reuse. Excluded rows must state the target deck or reason. If the candidate pool reveals unresolved duplicate risk, school/admin leakage, weak grammar-term translation support, non-portable examples, or cross-language target examples that drift away from the English canonical scene, stop at `spec_ready` and ask for user confirmation instead of promoting the deck.

Pre-generation checks passed before approval:

```bash
node scripts/check-deck-candidate-pool.mjs core_learning_help_words_a1_a2
node scripts/check-word-selection-quality.mjs core_learning_help_words_a1_a2
node scripts/check-deck-specs.mjs
```

The user approved generation on 2026-05-21 by asking to continue with the next deck without another confirmation after checks pass. Generation must run through `scripts/run-deck-production.mjs`; no direct language batch imports are allowed outside the runner.

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck is completed: `Park & Playground` (Sort 24);
- related Core Foundation continuations: prepositions/connectors, frequency words, app/UI help words and object states/qualities;
- adjacent later decks: school/classroom basics, exams/tests, reading/books and technology/account words.

## QA Notes

- semantic_scene requirements: preserve the learner-facing target word, learning object or feedback state, simple location/context and usage. The English canonical example remains the scene source for every target language.
- language-specific risks: noun/adjective form, article/gender/case, abstract grammar-term translations, answer/question noun vs verb, `hard` meaning difficult rather than physically firm, `class` as lesson/session rather than social class, `letter` as alphabet character rather than postal mail.
- examples: keep English examples short and concrete, for example `The question is on the card.` or `The answer is correct.` Avoid generic templates like `The word is ...`, avoid school-admin examples and avoid examples that all target languages can match while drifting away from English.
- selected feedback words require state proof: `correct`, `wrong`, `easy`, `hard` and `again` must keep the feedback/study-use scene, not broad unrelated senses.
- transcription risks: IPA languages need source-backed pronunciation for the displayed form; native-copy languages repeat display word; `ZH` requires tone-marked pinyin; `TH`/`LO`/`MY`/`KM`/`HY` strict high-risk lookup/style gates apply.
- source-backed checks needed: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency, regional variant quality where applicable and final linguistic audit.
