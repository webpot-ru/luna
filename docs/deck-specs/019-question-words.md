# Deck Spec: Question Words

## Identity

| Field | Value |
| --- | --- |
| Sort | 19 |
| Deck | Question Words |
| `set_id` | `core_question_words_a1` |
| Content type | Vocabulary |
| Domain | Core Foundation |
| Area | Question Words |
| Category / situation | Core A1 interrogative words and short interrogative expressions |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | closed_set, transcription_high_risk, regional_variant_heavy |
| `risk_flags` | question_word_scope, interrogative_function, wh_word_sense, compound_multiword, case_form_risk, classifier_quantity_risk, time_frequency_scope, politeness_formality, article_gender_marker, scene_slot_strict |
| Example complexity default | controlled short question examples; one interrogative anchor plus one simple object/person/place/time/quantity slot |

## Scope

One learner-facing grouping principle: a Core Foundation closed set of A1 question words and short interrogative lexical expressions needed before broader verbs, time and service decks.

Include:

- core single-word question words: `who`, `what`, `where`, `when`, `why`, `how`, `which`, `whose`;
- short A1 interrogative expressions that learners treat as question-word vocabulary: `how many`, `how much`, `how old`, `what time`, `what kind`, `which one`, `how long`, `how often`, `how far`, `where from`;
- only learner-friendly lexical items whose examples can preserve a short shared question scene across all 54 active language variants;
- simple examples that keep the question word visible and preserve the person/object/place/time/quantity/frequency/distance slot in the English canonical scene.

Exclude / move elsewhere:

- full ready questions such as `What is your name?`, `Where are you going?` and `How are you?` as standalone card items -> future polite/conversation or phrase-only contour, not current vocabulary decks;
- yes/no question particles and auxiliary grammar words such as `do`, `does`, `did`, `is`, `are`, `can` -> Basic Verbs / grammar-support decks only if they become vocabulary items;
- advanced indefinite compounds such as `whoever`, `whatever`, `whenever`, `wherever`, `however` -> later pronoun/reference or advanced grammar deck;
- date/calendar nouns, weekday/month words and scheduling vocabulary beyond the short expression `what time` -> `Time & Days` and later calendar decks;
- form/admin fields such as `name`, `address`, `phone number`, `email`, `date of birth` -> Documents / Contact Details;
- classroom/test nouns such as `question`, `answer`, `blank`, `choice` -> Learning Help Words or school/test vocabulary.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Basic |
| `level_min` | A1 |
| `level_max` | A1 |
| `frequency_band` scope | core |
| `priority_band` scope | core |
| Target item range | 18-18 |

## Candidate Pool Rule

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/core_question_words_a1_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside Core Foundation / Question Words and must disambiguate English surface forms that collapse several meanings, especially `what`, `which`, `whose`, `how many`, `how much`, `what time`, `what kind`, `which one`, `how long`, `how often`, `how far` and `where from`.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include related interrogative or classroom/test words; excluded rows must state the target deck or reason. The current 46-row pool passed candidate-pool and word-selection gates with 18 selected, 12 backup and 16 excluded/move decisions; no phrase-vs-vocabulary, time/calendar leakage, admin/form leakage, question-particle, duplicate-risk, source-support or example-feasibility blocker remains before generation.

Before moving to `approved_for_generation`, run:

```bash
node scripts/check-deck-candidate-pool.mjs core_question_words_a1
node scripts/check-word-selection-quality.mjs core_question_words_a1
```

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck is completed: `Basic Verbs` (Sort 20);
- related Core Foundation continuations: `Practical Action Verbs` (Sort 21), `Time & Days` (Sort 22);
- adjacent later decks: `Learning Help Words`, `Family & Relationships`, `Documents & Forms Basics`.

## QA Notes

- semantic_scene requirements: preserve target question word/expression, interrogative function, asked-about slot, object/person/place/time/quantity/frequency/distance slot and simple tense/usage in the English canonical example.
- language-specific risks: many languages use different forms for human/non-human `who/what`, case-marked or inflected interrogatives, formal/polite question particles, classifiers/counters for quantity questions, separate `how much` money vs amount distinctions and gender/number agreement for `which` / `what kind`.
- examples: keep every English canonical example short and controlled. Do not use meta templates such as `Question word: who`, do not let target languages switch to a shared alternate template, and do not turn vocabulary rows into long ready-phrase cards.
- selected multiword entries require whole-meaning proof: for example `how many`, `how much`, `what kind`, `which one`, `how often`, `how far` and `where from` must be translated as complete interrogative expressions, not word-by-word components.
- transcription risks: IPA languages need source-backed pronunciation for the displayed form; native-copy languages repeat display word; `ZH` requires tone-marked pinyin; `TH`/`LO`/`MY`/`KM`/`HY` strict high-risk lookup/style gates apply.
- source-backed checks needed: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency, regional variant quality where applicable and final linguistic audit.

## Final Delivery

2026-05-19 post-reset runner delivery completed:

- runner manifest: `outputs/runs/core_question_words_a1/run_core_question_words_a1_20260519T103133645Z_95cb132e.json`;
- final deck size: 18 cards x 54 active language variants = 972 localized entry/example rows;
- final workbook: `outputs/google-sheets/FlashcardsLuna_question-words_final.xlsx`;
- Google Sheet: `FlashcardsLuna 019 of 180 - Question Words` / `1A46O8Gv5FJdePgZkaHP5PecJlGwBrzk_GH_r1-S9fNI` in required Drive folder `1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei`;
- QA: runner `qa` passed; source-backed transcription evidence written for 972 rows; target semantic-scene alignment checked 972/972 supported rows with 0 unsupported skipped rows; sample audit checked 324 rows with 0 blockers/0 warnings; release-readiness passed with 0 blockers/0 warnings; post-final linguistic audit passed 972/972 with 0 `needs_review` and 0 `fail`;
- delivery: Google Sheet readback passed, post-audit re-export/re-upload completed and delivery freshness passed;
- status rule: non-RU language rows remain `generated_checked`, not native-approved.
