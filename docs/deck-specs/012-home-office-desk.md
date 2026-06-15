# Deck Spec: Home Office & Desk

## Identity

| Field | Value |
| --- | --- |
| Sort | 12 |
| Deck | Home Office & Desk |
| `set_id` | `home_office_desk_a1_a2` |
| Content type | Vocabulary |
| Domain | Home |
| Area | Home Office |
| Category / situation | Desk Objects And Home Office Supplies |
| Status | generated |

## Quality Profile

| Field | Value |
| --- | --- |
| `deck_profile` | object_noun, document_admin, regional_variant_heavy, transcription_high_risk |
| `risk_flags` | compound_whole_meaning, scene_slot_strict, article_gender_marker_consistency, duplicate_reuse_review, document_register, regional_variant_heavy |
| Example complexity default | controlled simple examples; one object, one state/location, no unnecessary clauses |

## Scope

This deck covers everyday objects on or near a home desk: simple computer hardware, desk supplies, writing tools, paper organization objects and small desk accessories.

One learner-facing grouping principle: things a learner can point to on a desk or in a home office area.

Include:

- core desk objects such as `desk`, `office chair`, `desk lamp`, `desk organizer`, `document tray` and `clipboard`;
- simple computer hardware and accessories such as `laptop`, `desktop computer`, `monitor`, `keyboard`, `mouse`, `mouse pad`, `printer`, `scanner`, `webcam`, `headphones`, `microphone`, `speaker`, `charger`, `power cable` and `power strip`;
- common writing and marking tools such as `pen`, `pencil`, `marker`, `highlighter`, `ruler`, `scissors`, `tape`, `stapler` and `paper clip`;
- paper organization nouns such as `notebook`, `notepad`, `sticky note`, `binder` and `folder` when they stay physical, not digital.

Exclude / move elsewhere:

- software, internet and account words such as `email`, `password`, `browser`, `app`, `website` and digital `file` / digital `folder`; move to `Computer & Internet Basics`;
- action verbs such as `to print`, `to scan`, `to type`, `to save` and `to copy`; move to `Practical Action Verbs` or a technology action deck;
- admin/form words such as `form`, `signature`, `address field`, `phone number` and `ID number`; move to `Documents & Contact Details`;
- time and planning words such as `deadline`, `date`, `calendar` and `appointment`; move to `Time & Calendar` or scheduling decks unless a physical object is explicitly selected later;
- business/place words such as `office`, `meeting room`, `coworking space` and `reception desk`; move to workplace/place decks.

## Selected Set Shape

The selected set is exactly 35 cards:

- 8 desk/furniture or desk organization objects;
- 14 computer hardware and desk electronics/accessories;
- 9 writing, marking and fastening tools;
- 4 paper/physical document organization nouns.

The pool is wider than the selected set and keeps backup/excluded rows with move reasons. Intentional surface overlap with `Furniture Basics` is allowed for `desk` and `office chair` because a learner may study Home Office & Desk without studying Furniture Basics first.

## Level And Priority

| Field | Value |
| --- | --- |
| `level_label` | Elementary |
| `level_min` | A1 |
| `level_max` | A2 |
| `frequency_band` scope | common/useful |
| `priority_band` scope | common/useful |
| Target item range | 35-35 |

## Candidate Pool Rule

Build a candidate pool of at least 70 home-office and desk-adjacent nouns and noun phrases, then filter to exactly 35 selected cards. Selected rows must be common/useful for a household learner and must not require software, school-only, business-only or admin-form context.

Every selected row must have:

- `scope_decision`, `duplicate_reuse_decision`, `compound_multiword_risk`, `translation_risk` and `required_qa_profile`;
- a duplicate/reuse decision, especially for `desk`, `office chair`, `folder`, `clipboard`, paper objects and computer hardware;
- a short English canonical example with one object, one simple state/location and no unnecessary tense, possession or clause complexity;
- source/preflight risk notes for compounds, region-sensitive device names and physical-vs-digital distinctions.

## Next Deck

Natural next deck(s):

- operational next by Deck Master Plan: `Home Structure & Exterior` (Sort 13);
- nearby home continuation: `Apartment Building & Common Areas`, `Outdoor Home & Garden`;
- later related decks: `Computer & Internet Basics`, `Documents & Contact Details`, `Practical Action Verbs`, `Time & Calendar`.

## QA Notes

- semantic_scene requirements: target object noun, display word, subject number, simple location/state and home desk context must be explicit;
- physical-vs-digital requirements: `folder`, `document tray`, `clipboard`, `printer`, `scanner` and similar rows must not drift into software/action/admin meanings;
- language-specific risks: articles/gender/case for objects, classifiers/counters where required, regional variants for `power strip`, `charger`, `desktop computer`, `office chair`, `tape`, `stapler` and paper organization nouns;
- examples must preserve the English canonical scene across all target languages; target-language examples may adapt naturally but must keep the same item, location/state and simple usage;
- transcription risks: follow `docs/language-transcription-policy.md`; transcriptions are for the main card word/display form only;
- source-backed checks needed: translation coverage, entry-source backing where available, article/gender marker consistency, target example lexical anchor, semantic scene alignment, target example naturalness, transcription policy/style consistency and final linguistic audit.

## Duplicate Notes

`desk` and `office chair` intentionally overlap with `Furniture Basics` as surface words. This deck keeps separate `meaning_id` values and home-office scenes. The duplicate is allowed as learner-path redundancy, not as a reason to reuse old rows.

Physical `folder` is in scope here only as a paper/document holder. Digital `folder` is excluded to a technology deck.

## Generation Notes

Generate only through `scripts/run-deck-production.mjs`. Base deck data must be created from the selected candidate pool and this spec only.

Preferred base example style:

- `The laptop is on the desk.`
- `The keyboard is in front of the monitor.`
- `The sticky note is on the monitor.`
- `The folder is in the document tray.`

## Delivery Status

Generated and delivered on 2026-05-14 through `scripts/run-deck-production.mjs`.

- Runner manifest: `outputs/runs/home_office_desk_a1_a2/run_home_office_desk_a1_a2_20260514T010531245Z_14035027.json`
- Final workbook: `outputs/google-sheets/FlashcardsLuna_home-office-desk_final.xlsx`
- Google Sheet: `FlashcardsLuna 012 of 180 - Home Office & Desk` / `16MFcReeasVCe_ISX2KuGoiM7mvRFleABAA4XvQVqkLk`
- Final counts: 35 cards, 54 active languages, 1890 language rows
- Evidence: readback passed, post-final linguistic audit 1890/1890 passed, sample audit 324/324 passed with 0 blockers/0 warnings, release-readiness passed with 0 blockers/0 warnings and delivery freshness passed

Non-RU rows remain `generated_checked`, not native-approved.
