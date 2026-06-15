# Deck Spec: Colors & Shapes

## Identity

| Field | Value |
| --- | --- |
| Sort | 17 |
| Deck | Colors & Shapes |
| `set_id` | `core_colors_shapes_a1` |
| Content type | Vocabulary |
| Domain | Core Foundation |
| Area | Colors & Shapes |
| Category / situation | Basic colors, visual patterns and simple shapes |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | closed_set, transcription_high_risk |
| `risk_flags` | grammar_risk, adjective_agreement, article_gender_marker, regional_spelling, scene_slot_strict, simple_visual_scene |
| Example complexity default | controlled simple examples; add complexity only when required by `meaning_note` / `deck_profile` |

## Scope

One learner-facing grouping principle: a closed Core Foundation visual vocabulary set for basic color words, shade words, simple visual pattern words and simple shape words.

Include:

- core A1 color adjectives and color nouns: color, red, blue, green, yellow, black, white, orange, purple, pink, brown, gray/grey, gold and silver as color words only;
- basic shade/visual adjectives when the meaning is explicitly visual: light as a pale color shade, dark as a deep color shade, colorful;
- simple shape nouns and visual marks: shape, circle, square, triangle, rectangle, oval, line, dot, star, heart, diamond shape, stripe and pattern;
- simple shape adjectives: round, straight, curved and flat;
- short controlled examples with one visible object and one color/shape property, avoiding metaphorical, fashion-specific, art-theory and formal geometry contexts.

Exclude / move elsewhere:

- fruit/material/value senses of ambiguous words: orange as fruit -> Food Basics; gold/silver as metal/value -> Materials or Money & Value; light as lamp -> Home Objects / Lighting;
- advanced or design/printing color terms: magenta, cyan, chartreuse, neon, transparent and opaque -> Design / Advanced Colors or Materials & Visual Qualities;
- formal geometry terms: hexagon, pentagon, octagon, parallelogram, trapezoid, angle, degree and symmetry -> Geometry Basics;
- size, measurement and spatial relation words such as big, small, wide, narrow, long, short, side, edge and corner -> Sizes & Measurements or Prepositions / Position;
- metaphorical uses of color and shape words, skin-tone descriptions, emotional color meanings and idioms.

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

Build a machine-readable candidate pool before generation at `outputs/candidate-pools/core_colors_shapes_a1_candidate_pool.jsonl`. The pool must be wider than the final selected set and must include selected, backup and excluded/move decisions. Selected rows must stay inside Core Foundation / Colors & Shapes and must disambiguate ambiguous English surface forms such as `orange`, `light`, `gold`, `silver`, `star`, `heart`, `diamond` and `flat`.

Selected rows must include scope decision, duplicate/reuse decision, compound/multiword risk, translation risk, source support, example feasibility and required QA profile. Backup rows can include lower-priority color shades, 3D shapes and orientation words; excluded rows must state the target deck or reason. If the candidate pool reveals weak visual examples, unresolved duplicate risk, unclear shade/material/food sense, or high source-backed translation/transcription risk, stop at `spec_ready` and ask for user confirmation instead of promoting the deck.

Before moving to `approved_for_generation`, run:

```bash
node scripts/check-deck-candidate-pool.mjs core_colors_shapes_a1
node scripts/check-word-selection-quality.mjs core_colors_shapes_a1
```

## Next Deck

Natural next deck(s):

- operational next by Sort after this deck is completed: `Pronouns & People Basics` (Sort 18);
- related Core Foundation continuations: `Question Words` (Sort 19), `Basic Verbs` (Sort 20), `Practical Action Verbs` (Sort 21);
- adjacent later decks: `Sizes & Measurements`, `Object States & Qualities`, `Geometry Basics`, `Design / Advanced Colors`.

## QA Notes

- semantic_scene requirements: preserve target visual word, visible object, color/shape property, object state/location when present, tense/aspect and `Core Foundation / Colors & Shapes` topic context.
- language-specific risks: color adjectives may require gender/number/case agreement; shape nouns may need articles, classifiers or gender markers; regional variants must distinguish US `gray` and EN-GB `grey` where appropriate.
- examples: keep scenes concrete and short, such as `The cup is red.` or `The circle is on the card.` Do not use generic templates such as `This is red`, meta examples such as `The word is red`, or examples that all collapse to one repeated sentence frame.
- transcription risks: IPA languages need source-backed pronunciation; native-copy languages repeat display word; `ZH` requires tone-marked pinyin; `TH`/`LO`/`MY`/`KM`/`HY` strict high-risk lookup/style gates apply.
- source-backed checks needed: pre-import source preflight, translation source coverage, entry source-backed translations, transcription source backing, semantic scene alignment, target example lexical anchor, target example naturalness, target example pedagogical quality, article/gender marker consistency and final linguistic audit.
