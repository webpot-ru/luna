# Deck Spec Template

Use this template before moving a deck from `planned` to `spec_ready`.

## Identity

| Field | Value |
| --- | --- |
| Sort |  |
| Deck |  |
| `set_id` |  |
| Content type | Vocabulary |
| Domain |  |
| Area |  |
| Category / situation |  |
| Status | candidate / planned / spec_ready / approved_for_generation / generated / blocked |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun / action_verb / adjective_state / closed_set / number_quantity / time_calendar / food_countability / document_admin / health_safety / service_problem / regional_variant_heavy / transcription_high_risk |
| `risk_flags` |  |
| Example complexity default | controlled simple examples; add complexity only when required by `meaning_note` / `deck_profile` |

## Scope

One learner-facing grouping principle:

```text
part of speech / closed set / room-object zone / place-object zone / action set / problem words / options
```

Include:

- 

Exclude / move elsewhere:

- 

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` |  |
| `level_min` |  |
| `level_max` |  |
| `frequency_band` scope |  |
| `priority_band` scope |  |
| Target item range |  |

## Candidate Pool Rule

Describe how the candidate pool is collected and filtered. The pool should be larger than the final deck; do not pad with rare or weak words.

Before moving to `approved_for_generation`, run:

```bash
node scripts/check-deck-candidate-pool.mjs <Sort|set_id>
node scripts/check-word-selection-quality.mjs <Sort|set_id>
```

Selected rows must include exact scope, duplicate/reuse, compound/multiword, translation-risk, source-support and example-feasibility decisions. Ambiguous English surface words must be sense-disambiguated in `meaning_note` and risk notes; multiword entries must preserve whole meaning; examples must be short canonical scenes, not generic templates.

## Next Deck

Natural next deck(s):

- 

## QA Notes

- semantic_scene requirements:
- language-specific risks:
- examples: controlled scene policy, allowed/forbidden grammar complexity, template-diversity risks
- transcription risks:
- source-backed checks needed:
