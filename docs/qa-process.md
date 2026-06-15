# QA Process

Этот документ является source of truth по QA-процессу для карточек LunaCards.

Цель QA - не допустить, чтобы сгенерированные слова, переводы, примеры, транскрипции или экспортные таблицы получили финальный статус без проверки.

## Базовое правило

`generated` не равно `approved`.

Так как на старте нет ручной проверки носителями всех 54 активных языковых вариантов, QA строится как несколько автоматических/AI-assisted проходов плюс ручная проверка только тех языков, которые пользователь реально может проверить.

Практическая реальность проекта: живых проверяльщиков по всем языкам нет. Поэтому агент обязан делать несколько независимых QA-проходов сам: структурный проход, semantic-scene pass, grammar/register pass, transcription pass и export pass. Если по конкретному языку или форме есть сомнение, нужно точечно сверяться с проверенными источниками: официальные стандарты, словари, академические/образовательные ресурсы, авторитетные language references. Случайные сайты и догадки не считаются достаточным основанием.

Локальные third-party lexical/reference sources описаны в [Reference Sources](reference-sources.md) и `reference-sources/sources.manifest.json`. Эти источники являются candidate/reference material only: они могут подтвердить или опровергнуть спорную форму, но не заменяют meaning-first matching, language-specific rules, transcription policy or structured QA evidence.

`@gemini-tools` можно использовать как дополнительный AI-assisted review слой при создании ordinary decks, но только поверх fail-closed контура, а не вместо него. Gemini не является source of truth, не заменяет словари, `meaning_id`, `semantic_scene`, language-specific rules, transcription policy, deterministic gates, readback или post-final audit. Live Gemini-вызовы могут расходовать квоты/деньги, поэтому перед live-вызовом нужно сначала сделать dry run и использовать только минимальный QA payload без секретов, `.env`, DB dumps, cookies, tokens или лишних пользовательских данных. Для воспроизводимого использования проектный скрипт `node scripts/run-ai-qa.mjs <set_id> --gemini-pack --checks=<families> --languages=<codes>` создает `outputs/qa/gemini_qa_pack_<set_id>_<timestamp>.jsonl` с prompt-пакетом для `mcp__gemini_tools__.gemini_extract_json`; production runner can record the same artifact during QA with `node scripts/run-deck-production.mjs <set_id> --stage=qa --gemini-qa-pack --execute`. The same runner flag also emits a separate Course Metadata native-style pack through `scripts/export-course-metadata-native-style-review.mjs`, because short UI labels such as `Title`, `Description`, `Module` and `Category` need a native-style check beyond config equality. Результаты Gemini для normal card QA можно импортировать только через обычный `scripts/import-ai-qa-results.mjs` и только если они не dry-run/synthetic, совпадают с текущими identity fields and checked hashes, а deterministic/source gates остаются зелеными. Course Metadata native-style results are validated with `scripts/check-course-metadata-native-style-results.mjs`; any `fail` is a repair blocker and any `needs_review` must be resolved before treating that metadata row as native-style clean. Non-RU языки после такого AI review остаются максимум `generated_checked`, не `approved`.

Course Metadata has its own deterministic final gate in `scripts/check-course-metadata-localization.mjs` and the shared `scripts/lib/course-metadata-localization.mjs`. It checks localized `title`, `description`, `level_signal`, `module` and `category` for fallback, punctuation/length, taxonomy labels and script identity. The script-identity layer is fail-closed for metadata fields: languages whose UI metadata must be Cyrillic, Han, Japanese, Korean, Indic, Thai, Khmer, Lao, Georgian or Armenian cannot ship with Latin fallback or mixed-script labels; ordinary-deck Serbian `SR` must stay Serbian Latin (Gaj), while separate HSK/Oxford/course contracts may explicitly choose Cyrillic only inside their own documented contour. This gate is wired into `db-qa-set.sh`, `check-qa-evidence.mjs`, final export and post-final audit through the shared localization checker. Native-style or Gemini findings may start a repair, but the production proof is still current DB values plus current hash-scoped `metadata_review` evidence, final export, Google Sheet readback and delivery freshness.

Transcription QA for future deck deliveries must be source/tool-backed. AI batch output alone is not sufficient evidence for final pronunciation/transcription decisions, especially for IPA languages, regional variants, Indic/Cyrillic transliteration and high-risk learner romanization languages (`TH`, `LO`, `MY`, `KM`, `HY`). The current card product still works only with the existing fields: translation, example and transcription of the translated word; audio is not part of this repair loop. Executable gates fail closed on pseudo-IPA, missing tone marks where policy requires them, missing source availability, regional pronunciation mismatch, display-form/article mismatch, unsupported transliteration fallbacks and internally mixed romanization style. For `TH`/`LO`/`MY`/`KM`, the strict high-risk lookup gate also requires exact local source evidence before refreshed final delivery; for `HY`, it requires a CLDR BGN-style compiler match or a stale-safe source decision. `transcription_style_consistency` is the separate guard for cases where source-backed exact rows are individually plausible but collectively inconsistent inside one language/deck. As of 2026-05-04 it is profile-driven through `config/transcription-style-profiles.json`: profile rules define allowed symbols, punctuation spacing, case and tone-number bans for romanization/transliteration languages. This is why a source-backed value can still block if it uses the wrong project style, such as compact Burmese dictionary punctuation or mixed accent notation.

IPA display coverage is also deterministic now. `transcription_policy` fails closed when an IPA-language `display_word` includes a learner-facing article/function marker but `transcription` only covers the lexical head. This closes the regression where `FR l'assiette` could pass as `/a.sjɛt/`, `DE der Teller` as `/ˈtɛlɐ/`, or `EN-GB a cup` as `/kʌp/`. Correct final values must include the displayed marker phonetically, such as `/la.sjɛt/`, `/deːɐ̯ ˈtɛlɐ/` and `/ə kʌp/`.

Translation QA has a separate source-backed contour. `config/translation-source-policy.json` and `scripts/check-translation-source-coverage.mjs` do not make dictionaries the source of truth; they make source coverage and obvious fallback/conflict risk visible. Final delivery blocks English-looking native-copy fallback, source conflicts and stale source decisions. Uneven dictionary coverage across 54 languages remains report-only in v1 unless it is attached to a known fallback/conflict pattern.

Language-batch drafts now also have a pre-import source/profile preflight. `scripts/check-language-batch-source-preflight.mjs <batch.jsonl|csv>` runs before `scripts/import-language-batch.mjs` writes to Postgres. The report carries timing diagnostics and a freshness contract over the draft hash, deck spec, source manifest, transcription/translation policies, warning-decision ledger and preflight rule version. During `batch-import`, the importer may reuse that report only when the contract is still fresh, there are zero blockers and all actionable warnings are resolved; otherwise it fails closed and requires a new `draft-preflight`. Reuse does not skip safety checks: the importer still runs lightweight deterministic guards for JSON/set/language consistency, transcription shape, transcription style consistency, script identity, article/gender markers and fallback/collapse before any DB write. It writes its own `outputs/source-preflight/*_import_*.json` report with `preflight_reused=true|false`.

For future ordinary decks, including decks started by another chat, the production QA contract is runner-controlled. The current gate set is inherited automatically only when the deck uses `scripts/run-deck-production.mjs` stages: `prepare`, `base`, `draft-preflight`, `batch-import`, `qa`, `export`, `deliver` and `complete`. Direct DB imports, direct XLSX exports or manual Google Sheet updates outside that path do not count as production QA unless followed by the same deterministic/source gates, structured QA evidence, final export, Google Sheet readback, post-final audit, delivery freshness and release-readiness/sample-audit proof.

For all future decks, course releases and exam releases, QA also requires a translation-memory reuse proof before final support-language generation/import when prior LunaCards DB rows, final artifacts or approved source packages exist. The proof must be fail-closed: display reuse is allowed only for strict same-sense/POS/current-value matches, while example reuse is allowed only with documented scene equivalence. A gate must block or mark non-final any reuse map that copies old examples without scene proof, uses spreadsheet language codes where DB `dbCode` mapping is required, claims final generation from a report-only reuse map, or omits the current release/deck id from sample-audit targeting. This rule is defined in [Course Source-Assisted Generation](course-source-assisted-generation.md) and applies to ordinary decks, Oxford/English releases, HSK/Chinese releases and future non-English-source courses unless the release contract explicitly documents a narrower exception.

This preflight is the ordinary English-canonical deck gate. For HSK, exam releases and future non-English-source courses, use [Course Source-Assisted Generation](course-source-assisted-generation.md): the same source layer can be reused, but the course contract must define the source language, pivot behavior, output fields and release-specific audit proof.

The preflight blocks hard failures such as English fallback, pseudo-IPA, missing tone marks, wrong script, stale source decisions and source conflicts; it reports `source_partial`, `no_source`, optional tool absence and tool-only candidate mismatch as warnings. Tool, dictionary and corpus candidates from Epitran, UniMorph, Kaikki/Wiktionary, DBnary, FreeDict, Apertium, PanLex, Wikidata, Concepticon/NorthEuraLex, Tatoeba, OPUS, Hunspell, weak-language indexes or OpenPhonemizer are repair guidance only and cannot approve final rows. Pre-import translation candidates are emitted as `source_partial`: Kaikki/Wiktionary from local target-language entries with English gloss/link evidence, DBnary from parsed EN->target translation triples streamed from the local English DBnary archive, FreeDict from configured targeted EN->target dictionaries, Apertium from configured local bilingual pairs, PanLex vocabulary/display-form hints, PanLex meaning-id EN-pivot candidates, weak-language dictionary indexes (`sinhala_para_dict`, `uzwordnet`, `myanmar_mcfnlp_dict`, `darsala_en_ka_lexicon`, `alar_kn`, `tezaurs_lv`, `slovak_wordnet`, `sloleks_sl`) and bulk Wikidata/concept sources when available. Tatoeba/OPUS and weak example indexes such as ALT, SI/MY corpora and Darsala EN-KA appear only in `example_collocation_candidates`; Hunspell appears only in `spelling_sanity`; Concepticon/NorthEuraLex appear in `concept_sanity`. Missing exact dictionary evidence does not block a normal non-fallback row by itself; blockers come from fallback, source conflict, stale decisions, known false-friend risk or profile-rule violations. Epitran is limited to configured source-lookup phonetic/IPA languages so native-copy and deterministic-transliteration rows do not create false mismatch warnings; OpenPhonemizer is installed/detected but inactive for candidate generation in v1 to avoid model-cache/runtime side effects during import. Optional source targets are fetched with `scripts/fetch-optional-tool-sources.mjs`; downloaded raw files remain ignored local cache and derived indexes are rebuilt with `scripts/build-bulk-source-indexes.mjs`. The `weak-dictionaries-v2` group currently activates KN Alar, LV Tēzaurs, SK Slovak WordNet and SL Sloleks; ET Ekilex, IndoWordNet/pyiwn, MY MyOrdbok and KK KazParC are explicitly deferred until access/runtime/license/data-shape blockers are resolved. Optional Python tools are installed project-locally from `reference-sources/tool-runtime-requirements.txt` into ignored `.venv-source-tools/`; `pyarrow` is used only to read local Parquet source dumps into ignored weak-source indexes, and `SOURCE_PREFLIGHT_PYTHON` can override that runtime. Optional external MT fields (`external_mt_suggestion`, `google_translate_suggestion`, `mt_suggestion`) are report-only sanity signals in `external_mt_sanity`, not final evidence or automatic blockers. Actionable warnings carry stable `review_key` values; use `reference-sources/manual-decisions/source-preflight-warning-decisions.jsonl`; `scripts/check-source-preflight-warning-decisions.mjs` validates that ledger. Profile-risk or high-risk grammar batches automatically require one language per batch and unresolved actionable warning decisions block import even if `--require-warning-decisions` was omitted. The same preflight also checks draft examples for obvious scene drift before import: number-deck meta-templates such as `Number: zero`, generic word/meaning templates such as `Word: apple` or `Meaning: apple`, artificial `ZH`/`JA` CJK token spacing, artificial `TH`/`KM`/`LO` word-segmentation spaces in short clauses, and `MY` purpose/infinitive templates for simple imperative scenes are blockers when the English canonical example is a concrete scene. Its report includes `deck_profile`, `risk_flags`, `profile_policy`, `hard_blockers`, `actionable_warnings`, `decision_required`, `translation_candidates`, `example_scene_candidates`, `example_collocation_candidates`, `concept_sanity`, `spelling_sanity`, `source_conflicts`, `external_mt_sanity`, `scene_slot_proof` and `compound_whole_meaning`; profile-risk drafts must carry proof fields for whole-meaning compound entries, action grammar, time/calendar scope, food countability/container use, document/admin register and health/safety specificity before import.

Generic official-dictionary and MT-sanity lookup rows are language-specific evidence only when the row contains an explicit matching `language_code`. The generic loader ignores ambiguous two-column source/target rows for language-specific preflight so a weak-source file for one language cannot create false candidates or warnings for another language.

Performance note: source preflight is intentionally stricter than generation, but it is not allowed to become an invisible bottleneck. Batch lookup caches under ignored `reference-sources/cache/` are rebuildable and may speed repeated checks. Repeated imports now reuse a hash-proven fresh preflight report instead of recomputing the heavy source layer; timing fields identify whether remaining cost is DB metadata, tool-source context, per-row candidates, translation coverage, transcription backing, bulk hints or warning decisions. This is reuse of proof, not disabling the gate.

Weak-source languages have an additional pre-import policy. `KO`, `VI`, `TH`, `MS`, `SK`, `SL`, `LV`, `ET`, `IS`, `BN`, `TL`, `MY`, `KM`, `LO`, `NE`, `SI`, `TA`, `TE`, `KN`, `ML`, `UZ`, `KK`, `AZ`, `KA` and `HY` require one language per batch even when the deck profile is otherwise simple. The preflight report exposes `strong_dictionary_candidates`, `official_dictionary_candidates`, `panlex_candidates`, `mt_agreement_score`, `low_resource_language_risk` and `license_restriction_note`. NIKL, LEXiTRON, SEAlang, Sinhala dictionary, UzWordnet, English-Myanmar mcfnlp, Darsala EN-KA, Alar KN, Tēzaurs LV, Slovak WordNet, Sloleks, ALT, IndicTrans2, Dakshina and external MT are still candidate/sanity sources only. Current local NIKL and LEXiTRON caches are active: NIKL supports `KO` by exact English equivalent lemma lookup, and LEXiTRON supports `TH` by exact English-to-Thai `etlex` lookup. Weak-language indexes add SI/MY/KA/KN/LV/SK/SL dictionary candidates, UZ native-lemma sanity and ALT example/collocation hints for `BN`, `TL`, `HI`, `ID`, `JA`, `KM`, `LO`, `MS`, `MY`, `TH`, `VI` and `ZH`. Dakshina supports South Asian romanization sanity for `BN`, `HI`, `KN`, `ML`, `SI`, `TA` and `TE`; it cannot approve or replace the card transcription policy. For these weak-source languages, an MT disagreement with no same-row strong dictionary candidate becomes actionable and blocks strict import until the draft is repaired or a current-value-locked warning decision is recorded.

Example QA also checks complexity. `example_quality`, `base_example_alignment`, `target_example_naturalness` and `target_example_pedagogical_quality` should prefer controlled, concrete examples that are easy to preserve across languages. A row is weaker when it introduces grammar that the card does not teach: unnecessary plural/number, possession, stacked adjectives, avoidable gender/case pressure, tense/aspect shifts, classifiers/counters outside a quantity profile, idioms or cultural detail. Such complexity is acceptable only when it is required by the `meaning_note` / `deck_profile` and is backed by current scene/profile evidence; otherwise the example should be simplified or kept out of final delivery.

For Oxford releases, the English base example is the upstream anchor for all support-language examples. A support-language example can be structurally correct and still be wrong if it faithfully preserves a bad English anchor. Generic or semantically invalid English templates are hard blockers, including patterns such as `The AIDS changed the plan.`, `The decision was audio.`, `The decision was biological.`, article/countability errors such as `The report mentioned an agriculture.`, and generic verb-object templates such as `They absorb the issue carefully.`. Future Oxford parts must run an English-base semantic-fit/smell check before support-language generation and again before final workbook export; if it flags blockers, repair the English example map first, then regenerate derived support examples, rebuild affected pronunciation/example evidence, rerun source-package QA, re-export final workbooks, update existing Google Sheets in place and rerun readback. The Oxford gate checker now has hard `english_example_semantic_smell_check` for Oxford 5000 releases, so a known bad anchor report blocks the registered release gate instead of remaining report-only. Obsolete raw model cache logs are not active delivery evidence; if they contain stale pre-repair examples and are no longer referenced by the current source-hash cache/contract, they may be moved only through the project safe-trash workflow so active-artifact scans stay meaningful.

`cjk_example_spacing` is a deterministic ZH/JA example-shape gate. `scripts/check-cjk-example-spacing.mjs <set_id>` blocks artificial whitespace between Chinese characters and Japanese kanji/kana tokens. The same rule is wired into source preflight, import guards, `db-qa-set.sh`, sample audit, final export and post-final linguistic audit, so a generated row such as `准备 蔬菜。` or `野菜を 準備する。` cannot become a current final delivery row.

`thai_example_spacing` is the parallel deterministic TH example-shape gate. `scripts/check-thai-example-spacing.mjs <set_id>` blocks artificial whitespace between Thai script tokens in short card examples. The same rule is wired into source preflight, import guards, `db-qa-set.sh`, sample audit, final export and post-final linguistic audit, so generated rows such as `เตรียม ผัก.` cannot become final delivery rows.

`southeast_asian_example_spacing` is the parallel deterministic KM/LO action-example shape gate. `scripts/check-southeast-asian-example-spacing.mjs <set_id>` blocks artificial machine-token spacing inside short Khmer/Lao action clauses. The same rule is wired into source preflight, import guards, `db-qa-set.sh`, sample audit, final export and post-final linguistic audit, so generated rows such as `រៀបចំ បន្លែ។` or `ກຽມ ຜັກ.` cannot become final delivery rows.

`action_example_surface` is the deterministic MY action-surface gate for simple imperative/action scenes. `scripts/check-action-example-surface.mjs <set_id>` blocks Burmese target examples that turn an imperative scene into a purpose/infinitive `ရန်` template. The same rule is wired into source preflight, import guards, `db-qa-set.sh`, sample audit, final export and post-final linguistic audit, so a generated row must use a natural action clause for scenes such as `Prepare the vegetables.`.

`example_surface_grammar` is a deterministic example-surface guard for confirmed high-signal language traps. `scripts/check-example-surface-grammar.mjs <set_id>` blocks unresolved template artifacts such as Hungarian `A(z)`, obvious placeholder/TODO remnants, Estonian/Finnish English-order locative/postposition calques such as `Palsam on kõrval šampoon.` or `Suihkusaippua on päällä hylly.`, and Croatian/Serbian locative case or plural-agreement traps such as `Slavina je iznad umivaonik.` and `Gumene rukavice je ...`. The same rule is wired into source preflight, import guards, `db-qa-set.sh`, sample audit, final export and post-final linguistic audit. This gate is intentionally narrow: it catches known deterministic failure shapes and does not replace source-backed QA or AI/native-style review for general grammar.

`example_naturalness` is the deterministic target-example native-style guard for confirmed non-surface grammar traps. `scripts/check-example-naturalness.mjs <set_id>` blocks target examples that are semantically aligned but unnatural enough to fail learner-facing quality. Confirmed beverage-deck rules include Russian static beverage examples such as `Чай налит в чашку.` when the English scene is a simple location/state and the natural learner sentence should be `Чай в чашке.`, Kazakh additive calques such as `сүті/лимоны/балы бар шай` where `сүт/лимон/бал қосылған шай` is the project form, Kazakh peppermint literal `бұрышты жалбыз шайы`, Uzbek misspelled/unnatural `gibriskus` for hibiscus/karkade, Uzbek peppermint collapse to generic `yalpiz choyi` when the card meaning is specifically peppermint tea, and fixed beverage blend name drift such as translating `English Breakfast tea` as literal "English breakfast tea" wording or shortening it to generic "English tea" instead of preserving the named tea blend with a local tea noun. The gate is wired into source preflight/import guards, `db-qa-set.sh`, `check-qa-evidence.mjs`, final export and post-final linguistic audit through `scripts/lib/example-naturalness.mjs`; after any example text repair, refresh `semantic_preservation`, `target_example_naturalness`, `target_example_lexical_anchor` and `target_example_pedagogical_quality` evidence with current scene-slot proof before delivery.

`example_surface_grammar` also blocks transcription leakage into target examples. For non-Latin example languages (`BG`, `RU`, `ZH`, `JA`, `KO`, `TH`, `MY`, `KM`, `LO`, `HI`, `BN`, `NE`, `SI`, `TA`, `TE`, `KN`, `ML`, `KK`, `KA`, `HY`), learner romanization/transliteration must live only in the card `transcription` field, never inside `example_text` as a parenthetical note. Rows such as `एस्प्रेसो सानो कपमा छ। (espreso sāno kapamā cha.)` are hard blockers; the example must be `एस्प्रेसो सानो कपमा छ।` with `espreso` kept in the transcription field.

`target_example_scene_location_anchor` checks that target examples preserve the canonical scene location from the English source example. It is intentionally proof-oriented rather than word-for-word: inflected and diacritic-bearing forms of the same Latin-script location word must count as valid anchors. For example, Polish `sofa` may appear as `sofą` in a natural locative/instrumental phrase and must not be treated as scene drift. This gate should block missing or wrong locations, not correct morphology. It must not treat non-location state adjectives such as `blue` or `heavy` as location anchors.

The same rule applies to language-specific location aliases when the target example clearly keeps the same place but uses a natural synonym, inflection or possession/case-marked form. Current explicit aliases cover common household scene synonyms such as `closet` / wardrobe/cupboard/closet forms, `cabinet` / cupboard/storage-cabinet forms, `shelf` / rack/shelf forms, `laundry detergent` / detergent forms, earlier room aliases such as Polish and Georgian sofa-location forms (`sofy`, `sofie`, `sofą`, `დივნის`), deictic `this` forms such as DE `das`, FR `ce`, ES `este`, RU `это`, JA `これ`, ZH `这`, MY `ဒီ/ဒါ` and VI `đây`, office-scene aliases for `desk`, `monitor`, `cup`, `tray`, `drawer`, `mouse` and `notebook`, and beverage/menu-scene aliases for `menu` / drink-list forms and `glass` / cup/goblet/tumbler forms where a target language naturally uses a local equivalent such as ES `carta` / `copa`, DE `Karte`, or RU `бокал`. The alias list is a gate-noise reducer only; it must not hide a real change of scene location.

Historical generated-deck status before the 2026-05-02 reset: the five pre-reset generated decks had current `transcription_source_backing` evidence under the strict high-risk lookup layer, and later IPA-focused repair closed 235 additional IPA blockers in `Kitchen Storage & Cleaning` and `Bathroom Essentials`. Those reports and Google Sheets are historical evidence only after the clean-start reset. Current local Postgres delivery state is active only for decks deliberately rebuilt from the clean DB and passed through the full QA/export/readback/audit/freshness contour again; as of 2026-05-06 this current post-reset set is `Kitchenware Basics`, `Cooking Actions`, `Kitchen Storage & Cleaning`, `Kitchen Small Tools & Supplies`, `Bathroom Essentials` and `Bedroom Basics`.

Для переводов и export используем обязательный pre-final QA контур плюс обязательный post-final linguistic audit для production delivery каждой готовой колоды. Исторические QA-1..QA-8 остаются организационными зонами проверки; V2/V3 добавляют отдельные executable evidence families and deterministic gates inside the same contour:

1. Documentation and scope QA.
2. Content selection QA.
3. Structural DB QA.
4. Human-checkable language QA: EN/RU.
5. Translation coverage QA.
6. Semantic preservation QA.
7. Grammar/register/form QA.
8. Transcription/export QA.
9. V2/V3 systemic gates: cross-language fallback/copy, semantic granularity, lexical anchor, article/gender consistency, script identity, target-example pedagogical usefulness, IPA pronunciation accuracy and Google Sheet readback.

Language-specific grammar and display traps проверяются по [Language Specific Rules](language-specific-rules.md).

## QA statuses

В проекте используются статусы:

```text
draft
generated
generated_checked
needs_review
approved
blocked
```

Pronunciation-only fields may also use:

```text
not_applicable
```

Смысл статусов:

| Статус | Что означает |
| --- | --- |
| `draft` | Черновик, еще не готов к проверке. |
| `generated` | Сгенерировано или загружено, но не проверено человеком. |
| `generated_checked` | Сгенерировано и прошло обязательные AI/source-backed QA gates без найденных ошибок; это не native-speaker approval. |
| `needs_review` | Есть риск, вопрос или требуется ручная проверка. |
| `approved` | Проверено и разрешено для следующего gate / final export. |
| `blocked` | Нельзя использовать без переработки или отдельного решения. |

`approved` нельзя ставить автоматически для всех 54 активных языковых вариантов. На старте `approved` допустим только для языков, где была реальная человеческая проверка, практически EN/RU. Остальные языки после AI/source-backed QA могут получить `generated_checked`, если ошибок не найдено; сомнительные строки получают `needs_review`, явно плохие - `blocked`.

Final-ready candidate допускает content statuses только `approved` или `generated_checked`. Для pronunciation fields допускаются `approved`, `generated_checked` или `not_applicable`. Raw `generated`, `needs_review`, `blocked`, `draft` and missing statuses не должны молча попадать в final export.

Status ownership contract:

| Поле / документ | Что контролирует | Что не означает |
| --- | --- | --- |
| `Deck Master Plan.Status` | Готовность deck spec / очереди к генерации. | Не означает final-ready и не заменяет DB quality. |
| `content_sets.selection_status` | Композиция колоды выбрана для final export. Final требует `approved`. | Не означает, что все языковые строки качественные. |
| `quality_status` на deck/meaning/membership/example/entry rows | Качество конкретной сущности. Final допускает только `approved` / `generated_checked` с evidence. | Не задает порядок генерации. |
| `pronunciation_status` | Качество/применимость transcription/pronunciation поля. | Не утверждает перевод слова или примера. |
| `qa_reviews.review_status` | Audit evidence конкретной проверки. | Не должен использоваться как единственный content status без обновления целевой строки. |

`generated_checked` требует audit trail в `qa_reviews`. Минимальный evidence record:

```text
review_status = generated_checked or approved
target_type / target_key identify the exact entity
language_code is set for language-specific entries/examples/pronunciation
reviewer is non-empty
reviewed_at is non-empty
check_family is non-empty
result_summary is non-empty
pass_id or batch_id is non-empty
evidence JSON may store batch-specific details and source references
source-backed note is included for disputed language forms
checked_value_hash is stored for text-bearing checks
```

Text-only `notes` or `issue_type` patterns are not evidence. Final/export checks read the structured `qa_reviews` fields added in `db/migrations/009_structured_qa_evidence.sql` and intentionally fail closed if those fields are missing.

For text-bearing and deck-scoped card-selection checks, final/export checks also require a current `checked_value_hash` added by `db/migrations/013_checked_value_hash.sql`, extended for `example_quality` by `db/migrations/014_example_quality_hash.sql`, extended for `word_selection_quality` by `db/migrations/015_word_selection_quality_hash.sql`, extended for `target_example_naturalness` by `db/migrations/017_target_example_naturalness_hash.sql`, extended for `regional_variant_quality` by `db/migrations/018_regional_variant_quality_hash.sql`, extended for V2 quality layers by `db/migrations/019_v2_quality_hashes.sql`, and re-applied for V3 by `db/migrations/020_v3_quality_hashes.sql`. The hash is recomputed from the current Postgres value by `qa_checked_value_hash(...)`; stale evidence is blocked if the checked word, example, transcription, `semantic_scene`, language transcription policy, language-specific naturalness/regional rule version, V2/V3 lexical/register/granularity/article/pronunciation/pedagogical rule version, Course Metadata text or deck-scoped selection context changed after QA.

QA evidence uses latest-review semantics. For the same `target_type` / `target_key` / `language_code` / `check_family`, only the latest structured review counts. A newer non-pass review invalidates an older pass for that check family. A later `manual_review=approved` for the same target/language can override an older AI `needs_review`, but only when the target row status is also approved by the manual review flow.

Deck-scoped English checks may be stored either as language-neutral final-readiness evidence or as EN-scoped evidence, depending on the producer. Final gates must accept both `language_code is null` and `language_code='EN'` for set membership `word_selection_quality` and English context-example `base_example_alignment` / `example_quality`; language-specific entry/example evidence remains keyed to the exact target language.

Evidence and target statuses must be synchronized both ways:

- `generated_checked` / `approved` target rows without usable evidence block final export;
- usable latest pass evidence whose target row stayed raw `generated` or `needs_review` is also a blocker;
- `scripts/sync-qa-statuses-from-evidence.mjs <set_id> --dry-run|--apply` repairs evidence/status drift for active deck rows only;
- for base English `content_set` and `meaning_example` checks, legacy empty `language_code` evidence is treated as `EN` when picking the latest review, so old empty-language evidence cannot override a newer fresh `EN` pass;
- `scripts/check-qa-evidence.mjs <set_id>` blocks missing evidence, stale `checked_value_hash` evidence and deterministic semantic-scene alignment drift;
- the sync script never mass-promotes non-RU languages to `approved`; `approved` comes only from manual/native review flow.

V1 target keys:

| Entity | `qa_reviews.target_type` | `qa_reviews.target_key` | `language_code` |
| --- | --- | --- | --- |
| Deck content set | `content_set` | `set_id` | empty |
| Course Metadata localization | `content_set` | `set_id::course_metadata` | DB language code |
| Meaning unit | `meaning_unit` | `meaning_id` | empty |
| Set membership / card row final readiness | `content_set` | `set_id::meaning_id` | empty |
| Word selection for card row | `content_set` | `set_id::meaning_id` | `EN` |
| Context example final readiness | `meaning_example` | `example_id` | empty |
| English context/base alignment | `meaning_example` | `example_id` | `EN` |
| English context example quality | `meaning_example` | `example_id` | `EN` |
| Language entry / pronunciation | `meaning_language_entry` | `meaning_id` | DB language code |
| Example translation | `meaning_example_translation` | `set_id::meaning_id::example_id` | DB language code |
| Post-final linguistic audit row | `export` | `set_id::meaning_id::language_code` | DB language code |

Final export must block `generated_checked` rows that do not have matching usable `qa_reviews` evidence. It must also block final-ready rows when the latest required check family is non-pass and there is no later manual approval for that same target/language.

`metadata_review` is hash-scoped for all final-readiness metadata targets in this table: deck content set, Course Metadata localization, meaning unit, set membership/card row and context example. If the hash function gains new metadata fields, the corresponding metadata evidence must be refreshed before final export/readback can be considered current.

Dry-run or synthetic QA payloads are not usable pass evidence for final delivery. A `run-ai-qa.mjs --dry-run` file is only a review payload/export; pass rows explicitly marked `dry-run`, `dry_run` or `synthetic` must not be imported as real pass decisions and must not satisfy final/export evidence checks. Narrow deterministic repair helpers may write scoped repair evidence only for the field they directly validate; that evidence does not replace fresh non-dry QA for naturalness, lexical anchoring, pedagogical quality or other required families.

Если item нужно убрать из активного набора, его нельзя молча удалять из истории. Нужно пометить `blocked`, заменить другим item или изменить membership после явного решения по набору.

## Уровни QA

### QA-0: Documentation and Scope

Проверяется до генерации или изменения данных:

- есть source of truth документ по теме;
- gate и scope зафиксированы;
- набор не дублирует уже существующую тему;
- нет изменения принятого решения без подтверждения пользователя.

### QA-1: Structural DB QA

Автоматическая проверка структуры данных:

- существует `content_set`;
- в базе 54 активных языковых варианта;
- количество items соответствует target range набора;
- нет дублей `meaning_id` в наборе;
- display order не пустой и не конфликтует;
- action/verb decks не содержат очевидные nouns;
- object/item decks не содержат очевидные verbs;
- внутри одной колоды нет дубликатов `canonical_english + part_of_speech` под разными `meaning_id`;
- каждый item имеет `meaning_unit`;
- каждый vocabulary item имеет English language entry;
- каждый item имеет context example;
- context example status is final-ready before final export;
- каждый final-ready set membership имеет отдельный `word_selection_quality` QA pass;
- каждый base/context example, который будет переводиться или экспортироваться, имеет `semantic_scene`;
- каждый context example имеет English example translation;
- каждый final-ready English context example имеет отдельный `base_example_alignment` QA pass;
- каждый final-ready English context example имеет отдельный `example_quality` QA pass;
- уровни используют только официальные CEFR `A1`, `A2`, `B1`, `B2`, `C1`, `C2`;
- `A0` не используется;
- `priority_band` заполнен и не подменяет CEFR;
- taxonomy item совпадает с taxonomy набора;
- обязательные поля не пустые.

### QA-2: Content Selection QA

Проверяется до перевода:

- набор не добивается редкими словами ради числа;
- candidate pool шире финального набора;
- candidate pool exists as `outputs/candidate-pools/<set_id>_candidate_pool.jsonl` before `approved_for_generation`;
- selected candidate rows have include rule, source support, translation coverage risk, example feasibility, score and duplicate decision evidence;
- выбранные items соответствуют scope;
- редкие слова вроде `butter churn` / маслобойка или узкий `separator` не попадают в core/foundation без специальной темы;
- при избытке хороших слов набор делится на core/extended/specialized, а не режется случайно;
- пересечения между наборами оформлены через `set_memberships`, а не через дубли `meaning_id`.

Executable gate: `word_selection_quality`. It is deck-scoped, not global. Evidence is keyed as `target_type=content_set`, `target_key=set_id::meaning_id`, `language_code=EN`, with `pass_id=word_selection_quality_...`. It checks that the selected item belongs to this exact deck scope, fits the level/priority, is not rare padding, is not a mixed-bag item from another deck, is not a duplicate/near-duplicate without reason, and can support a short controlled example.

Executable candidate-pool gate: `scripts/check-deck-candidate-pool.mjs <Sort|set_id> [--file=path]`. `scripts/check-deck-ready.mjs` calls the same validation for `approved_for_generation` decks. The default pool path is `outputs/candidate-pools/<set_id>_candidate_pool.jsonl`; it must normally contain at least 2x target max candidates, final selected count within target range, selected rows without unresolved duplicate/scope conflicts, and excluded rows with a move target.

Executable word-selection pre-approval gate: `scripts/check-word-selection-quality.mjs <Sort|set_id> [--file=path]`. The production runner `prepare` stage and `check-deck-ready` both use it. It checks selected-row semantic quality before generation: exact scope fit, non-generic decision notes, concrete `meaning_note`, `english_with_article`, short canonical example, unresolved duplicate decisions, ambiguous surface-word disambiguation, multiword whole-meaning risk and low selected-score blockers. This is separate from later DB `word_selection_quality` QA evidence; it prevents weak selected words from entering the generation contour in the first place. Balance/diversity warnings are for broad thematic decks; `closed_set` / `number_quantity` decks may be intentionally dominated by one category when the spec says so.

### QA-3: English/Russian Human-Checkable QA

Ручная проверка английской canonical-базы до перевода:

- `meaning_id` описывает один смысл, а не несколько;
- `meaning_note` достаточно ясно снимает многозначность;
- `EN` использует American English / US default, а British English различия уходят в `EN-GB`;
- слово относится к заявленной теме;
- `part_of_speech`, `countability`, `plural_form_en` корректны;
- `priority_band` отражает практическую важность карточки, а не языковую сложность;
- `english_with_article` содержит нужный артикль или конструкцию; if `requires_article=false` is explicitly set for a time word, weekday, proper-name-like closed-set item or other intentional no-article display form, the article-shape warning must not fire only because the display form lacks `a/an/the`;
- пример простой, короткий и контролируемый;
- пример естественный, конкретный, не шаблонный и не построен на generic placeholder вроде `the food`, если это не реально лучший объект сцены;
- `semantic_scene` явно фиксирует schema v1 core fields: `target_object`, `target_display`, `subject_number`, `action_or_state`, `state_or_location`, `tense_aspect`, `topic_context`;
- `semantic_scene.target_object` хранит объект сцены, а не сам глагол/действие карточки;
- пример не меняет тему;
- пример пригоден для перевода на все языки без культурной подмены;
- нет слишком близких дублей внутри набора;
- спорные items помечены как `needs_review` или `blocked`.

Русский можно проверять вручную после генерации RU entries/examples. Остальные языки не получают `approved` только на основании auto-QA.

### QA-4: Translation Coverage QA

Проверяется после генерации переводов на активные языковые варианты:

- для каждого `meaning_id` есть language entry на каждый активный язык;
- нет пустых обязательных переводов;
- EN/RU не потеряны;
- используются правильные language codes;
- `NB` хранится как internal code для Norwegian Bokmål, `NO` используется как display code в Google Sheets;
- `TL`, `KK`, `PT`, `PT-BR`, `ES-419`, `EN-GB` соблюдают зафиксированные правила проекта.

### QA-5: Semantic Preservation QA

Проверяется после генерации переводов и примеров:

- translation semantic QA: перевод соответствует `meaning_note`, а не только английскому surface word;
- translated-example semantic QA: пример на каждом языке сохраняет `semantic_scene`;
- target object, displayed target form, number, action/state, state/location, attributes/time if present and tense/aspect не меняются без причины;
- пример звучит естественно, но не добавляет новые детали;
- спорные языки получают `needs_review`, а не `approved`.

Structural check "semantic_scene exists" is QA-1. It is not enough. QA-5 is the separate meaning-preservation gate for translated examples. This gate is executable through `scripts/run-ai-qa.mjs` and `scripts/import-ai-qa-results.mjs`; doubtful languages/forms require targeted verification in authoritative sources and must stay `needs_review`.

Semantic preservation не доказывает качество базового английского примера. Если английский пример шаблонный, неестественный или плохо выбран для карточки, переводы могут идеально сохранить плохую сцену. Поэтому final-ready context example требует отдельный `example_quality` gate до того, как переводы примеров считаются пригодными.

Base/context English example alignment is a separate gate before trusting translated examples. It checks that `canonical_example_en` actually matches `meaning_id`, English display form and `semantic_scene`. Evidence:

```text
target_type = meaning_example
target_key = example_id
language_code = EN
pass_id = base_example_alignment_...
check_family = base_example_alignment
result_summary = ...
```

Word selection quality is a separate deck-scoped gate before treating a card row as final-ready. It checks why this meaning belongs in this exact deck, not just whether the English surface word exists somewhere in the database. Evidence:

```text
target_type = content_set
target_key = set_id::meaning_id
language_code = EN
pass_id = word_selection_quality_...
check_family = word_selection_quality
result_summary = ...
```

English context example quality is a separate gate before trusting translated examples. It checks that the example is natural, concrete, short, non-template, topic-bound, not based on unnecessary `need/want/can`, and suitable as a multilingual semantic anchor. Evidence:

```text
target_type = meaning_example
target_key = example_id
language_code = EN
pass_id = example_quality_...
check_family = example_quality
result_summary = ...
```

For any `meaning_example_translation.quality_status = generated_checked`, QA evidence must be keyed to the exact context example:

```text
target_type = meaning_example_translation
target_key = set_id::meaning_id::example_id
language_code = DB language code
pass_id = semantic_preservation_...
check_family = semantic_preservation
result_summary = ...
```

Final-ready translated examples require semantic preservation, target-language naturalness and lexical anchoring evidence:

```text
target_type = meaning_example_translation
target_key = set_id::meaning_id::example_id
language_code = DB language code
pass_id = target_example_naturalness_...
check_family = target_example_naturalness
result_summary = ...

target_type = meaning_example_translation
target_key = set_id::meaning_id::example_id
language_code = DB language code
pass_id = target_example_lexical_anchor_...
check_family = target_example_lexical_anchor
result_summary = ...
```

`semantic_preservation` proves the target example preserves the scene. `target_example_naturalness` proves the target example is acceptable target-language surface text and does not literally copy helper words from `semantic_scene`. `target_example_lexical_anchor` proves the target example still visibly teaches the target lexical item, its normal inflected form or an allowed language-specific variant. The scene describes meaning, not words to insert into translation.

Lexical anchoring is a same-lemma / same-sense rule, not an exact-string rule. Normal definite forms, case forms, plural forms, article changes and conjugated forms are acceptable when they preserve the same lexical item and scene. Warnings caused only by normal inflection should be decision-locked, accepted, or encoded into the deterministic checker when the pattern is stable enough. For example, the lexical-anchor gate accepts Latvian singular locative forms such as `glāzē` for display `glāze` and `krūkā` for display `krūka`, Scandinavian definite suffix anchors such as `skål -> skålen`, `lokk -> lokket` and `mugg -> muggen`, stable Slavic/Baltic locative anchors such as `čaša -> čaši` and `ąsotis -> ąsotyje`, question-word inflection such as Russian display `чей` with example form `чья`, Bulgarian `кой -> коя/кое`, Latvian `kurš -> kura` and Slovak `ktorý -> ktorá/ktoré`, and natural split Chinese question expressions such as display `多久一次` anchored by `多久 ... 一次` in the example. For aspect-bearing languages such as Russian, a display verb and example verb should keep the same meaning-bearing aspect unless the `meaning_id` intentionally covers an aspect pair.

RU can be manually checked by the user. Other languages can reach `generated_checked` only after agent-run semantic, grammar/register and transcription passes; they must not be promoted to `approved` without real human/native review.

Executable AI QA check families:

| `check_family` | Target | Что проверяет | Pass может продвинуть |
| --- | --- | --- | --- |
| `word_selection_quality` | `content_set` keyed as `set_id::meaning_id`, `language_code=EN` | Card belongs in this exact deck scope, fits level/priority, is not rare padding/mixed-bag/unsafe surface reuse and can support a controlled example. | `meaning_set_memberships.quality_status -> generated_checked` |
| `base_example_alignment` | `meaning_example` keyed as `example_id`, `language_code=EN` | English context example matches `meaning_id`, display form and `semantic_scene`. | `meaning_examples.quality_status -> generated_checked` |
| `example_quality` | `meaning_example` keyed as `example_id`, `language_code=EN` | English context example is natural, concrete, non-template and suitable for any language pair. | Required evidence for final-ready context examples; does not replace translation QA |
| `semantic_preservation` | `meaning_example_translation` keyed as `set_id::meaning_id::example_id` | Сохранение `semantic_scene` в переводе примера. | `meaning_example_translations.quality_status -> generated_checked` |
| `target_example_naturalness` | `meaning_example_translation` keyed as `set_id::meaning_id::example_id` | Natural target-language example surface form; blocks literal calques of `semantic_scene` helper wording. | Required evidence for final-ready translated examples; auxiliary evidence does not override a non-pass semantic status |
| `target_example_lexical_anchor` | `meaning_example_translation` keyed as `set_id::meaning_id::example_id` | Target example includes the target word, normal inflected form or accepted language-specific lexical variant. | Required evidence for final-ready translated examples; blocks examples that teach a nearby word instead |
| `target_example_pedagogical_quality` | `meaning_example_translation` keyed as `set_id::meaning_id::example_id` | Target example is useful as a flashcard anchor, not only natural and semantically correct; blocks tautological/self-container examples such as `The shower head is in the shower.` | Required evidence for final-ready translated examples; auxiliary evidence does not override semantic/naturalness blockers |
| `number_example_grammar` | `meaning_example_translation` keyed as `set_id::meaning_id::example_id` | For number-heavy/quantity decks, target examples preserve the EN counted scene and prove number + noun agreement, classifier/counter/linker requirements and script consistency. | Required evidence for final-ready number/quantity translated examples; final export, audit and QA evidence checks fail closed without current proof |
| `regional_variant_quality` | `meaning_example_translation` keyed as `set_id::meaning_id::example_id` | Region-sensitive variants for `EN-GB`, `ES-419`, `PT-BR` when the row is in the configured regional-risk list. | Required only for final-ready regional-risk rows; auxiliary evidence does not override semantic/naturalness blockers |
| `entry_form` | `meaning_language_entry` keyed as `meaning_id` + `language_code` | Перевод слова, display form, article/gender/marker, POS and context. | `meaning_language_entries.quality_status -> generated_checked` |
| `entry_form_register` | `meaning_language_entry` keyed as `meaning_id` + `language_code` | Everyday household/register suitability; blocks technical, medical, salon, repair/plumbing or bookish drift when the deck scope is basic vocabulary. | Required evidence for final-ready entries; auxiliary evidence does not override a non-pass `entry_form` |
| `semantic_granularity` | `meaning_language_entry` keyed as `meaning_id` + `language_code` | Translation is not too broad or too narrow when a nearby meaning exists in the same deck. | Required evidence for final-ready entries |
| `article_gender_marker_consistency` | `meaning_language_entry` keyed as `meaning_id` + `language_code` | `native_word`, display word, article/gender/number/marker fields are internally consistent. | Required evidence for final-ready entries |
| `transcription_policy` | `meaning_language_entry` keyed as `meaning_id` + `language_code` | Единую `transcription` по language policy. | `meaning_language_entries.pronunciation_status -> generated_checked` or `not_applicable` |
| `pronunciation_accuracy` | `meaning_language_entry` keyed as `meaning_id` + `language_code` | IPA content accuracy for IPA languages; proves the transcription is phonetically plausible for the display/native word, not just slash-wrapped text. | Required evidence for final-ready IPA rows; does not promote pronunciation status by itself |

### Full Deterministic QA Contour

New deck generation and final delivery must also pass deterministic batch/deck gates that look for systemic errors invisible at single-row level.

Severity policy:

| Severity | Blocks final? | Examples |
| --- | --- | --- |
| `fail` | Yes | Mass English fallback in high-risk entry/display rows; mass transcription collapse; identical display and example for distinct meanings; missing/stale required evidence; invalid transcription/display shape; hard EN example tautology. |
| `needs_review` | Not as deterministic blocker in v1, but must be visible as review artifact | Sibling-language copy risk, regional drift, uncertain synonym collision. |
| `warning` | No | Isolated plausible loanwords, legitimate same-form international words, stylistic but not semantic issues. |

Mandatory deterministic gates:

| Gate | Script | Blocks |
| --- | --- | --- |
| Entry/display cross-language fallback | `scripts/check-entry-cross-language-fallbacks.mjs` | English or identical Latin fallback in high-risk non-English entry/display rows. |
| Script/language identity | `scripts/check-script-language-identity.mjs` | Language-code confusion and script mismatch, including `MY` as Malay instead of Burmese/Myanmar and Latin fallback in Cyrillic/Indic/CJK/Thai/Lao/Khmer/Georgian/Armenian rows. |
| Latin diacritic loss | `scripts/check-latin-diacritic-loss.mjs` | Confirmed ASCII/diacritic loss in Latin-script native-copy/display/example/transcription languages, including `DA`, `NB`, `SV`, `ES`, `ES-419`, `CS`, `SK`, `HU`, `RO`, `HR`, `SR`, `LT`, `LV` and `FI`. |
| Sibling-language copy | `scripts/check-sibling-language-copy.mjs` | Emits review warnings for `HI/NE`, `TA/TE`, `MS/ID`, `PT/PT-BR`, `ES/ES-419`, `EN/EN-GB`; v1 does not auto-fail regional or neighbor-language identity without stronger evidence. |
| Meaning contrast | `scripts/check-meaning-contrast.mjs` | Distinct meanings in the same deck/language sharing both display word and example; display-only collisions become review warnings for nearby meanings. |
| Semantic granularity | `scripts/check-semantic-granularity.mjs` | Too-broad or too-narrow entry forms against nearby deck meanings, such as `body wash -> soap` when `soap` exists separately. |
| Article/gender/marker consistency | `scripts/check-article-gender-marker-consistency.mjs` | Article/gender/number/marker mismatches for languages with learner-facing article or marker conventions. |
| EN base example naturalness | `scripts/check-base-example-naturalness.mjs` | `I need to...` templates, generic placeholders, confirmed tautological locatives such as `The shower head is in the shower.`. |
| Example template diversity | `scripts/check-example-template-diversity.mjs` | Deck-level overuse of one example template, even if each row looks locally valid. |
| Target example lexical anchor | `scripts/check-target-example-lexical-anchor.mjs` | Target examples that do not visibly contain the target lexical item or a plausible inflected/variant form. |
| Target example lemma/sense audit | `scripts/audit-target-example-lemma-sense.mjs` | Read-only audit that classifies lexical-anchor findings as accepted grammar forms, repair candidates or needs-review rows under the same-lemma / same-sense rule. |
| Target semantic scene alignment | `scripts/check-target-semantic-scene-alignment.mjs` | Supported translated examples whose target-language location/state markers drift from `semantic_scene.state_or_location`. |
| Target example naturalness | `scripts/check-example-naturalness.mjs` | Unnatural language-specific calques and confirmed form errors in target examples, including RU predicate calques/static beverage locatives, CS/SK locative case copies, HU literal `van` order, RO bare forms after locative prepositions, PT/PT-BR invalid `estáo/estao`, KK beverage additive calques, UZ beverage misspellings/collapsed senses, and fixed beverage blend name drift such as literal translations or generic shortening of `English Breakfast tea`. |
| Example surface grammar | `scripts/check-example-surface-grammar.mjs` | Unresolved template artifacts such as `A(z)`, placeholder/TODO remnants, confirmed ET/FI English-order locative/postposition calques, and confirmed HR/SR case/agreement traps. |
| Entry source-backed translation | `scripts/check-entry-source-backed-translations.mjs` | Native-copy language entry/display rows that look like exact English fallback or high English-token fallback without a current-value-locked source-backed loan/repair decision. Final delivery enforces the all-language native-copy gate; `--warn-only` is only for exploratory audits. |
| Translation source coverage | `scripts/check-translation-source-coverage.mjs` | All-language source coverage report for entries; blocks stale source decisions, conflicts and English-looking fallback while keeping uneven dictionary coverage visible as v1 report-only. |
| Deck profile quality | `scripts/check-deck-profile-quality.mjs` | Profile-specific guardrails: object decks cannot become verb decks, action decks cannot contain nouns, time/calendar must not drift into payment/contact/admin, food decks cannot use generic food placeholders, health/safety examples cannot hide specific meanings behind broad weak scenes. Mixed lexical decks may combine compatible noun/adjective/adverb profiles only when the spec explicitly carries the relevant risk flag and the row POS stays inside the allowed mixed-profile set. |
| IPA transcription sanity | `scripts/check-ipa-transcription-sanity.mjs` | Obvious pseudo-IPA such as `/pommeau douche/`, `/le recipient alimentaire/` or slash-wrapped display orthography in IPA languages. |
| IPA source lookup | `scripts/check-ipa-source-lookup.mjs` | Stronger local-source lookup for `EN`, `EN-GB`, `FR`, `SV`, `NB`, `DA` and `IS`; blocks slash-wrapped orthography like `/cling film/`, `/toilettet/` or `/lavabo/` when exact/component source evidence shows real IPA is required. |
| Source-backed transcription | `scripts/check-source-backed-transcriptions.mjs` | Fail-closed source-policy gate for final `transcription`: requires `deterministic` or `source_exact` confidence and current `transcription_source_backing` evidence. For strict high-risk rows where a whole-phrase local headword is unavailable, a current-value-locked source-preflight warning decision may bridge `source_partial` to `accepted_source_partial` only when the decision matches the current set/language/native/display/transcription values and cites usable source evidence. |
| High-risk transcription lookup | `scripts/check-high-risk-transcription-lookup.mjs` | Strict exact-source audit for `TH`, `LO`, `MY`, `KM` and `HY`; missing exact local headwords return `source_partial`, candidate or `HY` BGN mismatches return `conflict`. |
| Target example pedagogical quality | `scripts/check-target-example-pedagogical-quality.mjs` | Tautological/self-container examples and weak hard blockers such as `The shower head is in the shower.`; adjacent-location cases can remain warnings. |
| Number example grammar | `scripts/check-number-example-grammar.mjs` | Number-heavy/quantity decks where examples with numbers lack current proof for number + noun agreement, required classifier/counter/linker, script consistency or EN scene preservation. |
| QA hash coverage | `scripts/check-qa-hash-coverage.mjs` | Missing `qa_checked_value_hash(...)` support for required text-bearing check families. |
| Google Sheet readback | `scripts/check-google-sheet-readback.mjs` | The uploaded Google Sheet is read back and compared against the final manifest/DB sample: main headers, row count, card keys, language registry and sampled word/example/transcription cells. |
| Delivery freshness | `scripts/check-delivery-freshness.mjs` | Final workbook, manifest source hash, Google Sheet uploaded hash and readback verification no longer match current Postgres final export. |

These gates are called by the normal pipeline where they can prevent damage earliest: `import-deck-base-data.mjs --dry-run`, `import-language-batch.mjs` preflight, `db-qa-set.sh`, `check-qa-evidence.mjs`, `export-flashcards-working-sheet.mjs --final`, `run-final-linguistic-audit.mjs` and, after upload, `check-delivery-freshness.mjs`.

`check-qa-evidence.mjs` must be scoped to the requested `set_id` for both missing-evidence and stale-review checks. Stale evidence from another deck must not block an unrelated deck; if a scoping leak appears, treat it as a pipeline bug and fix the checker before using the result to change deck status.

### QA-6: Grammar/Register/Form QA

Проверяется после semantic QA:

- артикль, род или грамматический маркер заполнен только там, где он реально нужен;
- языки без артиклей не получают искусственные артикли;
- singular/plural не сломан;
- tense/aspect/person/number в глагольных примерах сохраняют тот же смысл между языками;
- native script не заменен romanization;
- vocabulary entries используют dictionary/base form;
- examples используют естественную learner-friendly форму;
- examples follow target-language sentence capitalization: sentence-case languages start examples with a capital first cased letter, while scripts/languages without sentence capitalization are not forced into capitals;
- vocabulary display words stay dictionary/base form and must not be artificial Title Case / initial-uppercase unless language rules, proper nouns, acronyms or standard dictionary form require it;
- language-specific display/register/classifier/case rules соответствуют [Language Specific Rules](language-specific-rules.md);
- `ZH` использует Simplified Chinese; Traditional characters не попадают в `ZH` entries;
- Japanese/Korean vocabulary entry form and example form follow fixed policy: dictionary/citation entry, learner-friendly polite neutral examples;
- Norwegian stays Bokmål and does not mix Nynorsk forms;
- если дружеская, вежливая или honorific форма сильно отличается от base form, она оформляется как usage note или отдельная vocabulary/lexical item только после явного решения, а не заменяет базовую vocabulary entry.

Executable deterministic gate: `scripts/check-example-casing.mjs <set_id> [<set_id> ...]`. It is called by `scripts/db-qa-set.sh <set_id>`, `scripts/check-qa-evidence.mjs` and `scripts/export-flashcards-working-sheet.mjs --final`; `scripts/run-final-linguistic-audit.mjs` also applies the same casing shape check. The gate is language-aware: it checks sentence-case languages and ignores no-sentence-capitalization scripts/languages such as `ZH`, `JA`, `KO`, `TH`, `LO`, `MY`, `KM`, South Asian scripts and `KA` Georgian.

Executable deterministic gate: `scripts/check-semantic-scene-alignment.mjs <set_id> [<set_id> ...]`. It is called by `scripts/db-qa-set.sh <set_id>`, `scripts/check-qa-evidence.mjs`, `scripts/export-flashcards-working-sheet.mjs --final` and `scripts/run-final-linguistic-audit.mjs`. The gate blocks generic or stale scenes such as `action_or_state="is shown"` and `state_or_location="in a ... object scene"` when the English context example says a specific location/state/action. For noun examples like `The sink is under the mirror.`, `semantic_scene.action_or_state` must express location (`is located` / `are located`) and `state_or_location` must preserve `under the mirror`; for state examples like `The soap dispenser is full.`, the scene must preserve `full`. Passing this gate does not prove every translated example is correct; it prevents final export when the base English example and the scene used for translation QA have drifted apart.

Executable deterministic gate: `scripts/check-target-semantic-scene-alignment.mjs <set_id> [<set_id> ...]`. It is called by `scripts/db-qa-set.sh <set_id>`, `scripts/check-qa-evidence.mjs`, `scripts/export-flashcards-working-sheet.mjs --final` and `scripts/run-final-linguistic-audit.mjs`. The gate derives a scene key from `semantic_scene.state_or_location` and checks target-language examples against configured per-language markers when a deterministic marker table exists. Supported marker keys currently include `on_the_counter`, `in_the_drawer` and `beside_the_bowl`; the marker table covers `Kitchen Small Tools & Supplies` and reused counter/drawer scenes found in older generated kitchen decks. Unsupported scenes are now fail-closed for final delivery: a row may pass only with current hash-scoped scene-slot proof in `semantic_preservation` evidence, bound to the current `canonical_example_en`, current target `example_text`, `meaning_id`, `language_code` and core `semantic_scene` fields. Do not add a marker or proof just to hide a real drift row: for example, Icelandic `á borðinu` is table/desk wording and must not satisfy `on_the_counter`; repair the target example to a counter/worktop marker instead. Passing this gate proves either a deterministic scene marker or current scene-slot proof is present; final delivery still requires fresh non-dry `semantic_preservation`, `target_example_naturalness`, `target_example_lexical_anchor` and `target_example_pedagogical_quality` evidence.

Executable deterministic gate: `scripts/check-target-example-scene-location-anchor.mjs <set_id> [<set_id> ...]`. It is called by `scripts/db-qa-set.sh <set_id>`, `scripts/check-qa-evidence.mjs`, `scripts/export-flashcards-working-sheet.mjs --final`, `scripts/audit-sample-card-quality.mjs` and `scripts/run-final-linguistic-audit.mjs`. This is the guard for the confirmed failure class where target examples agree with each other but no longer preserve the English canonical scene. For locative object examples, the gate extracts the location object from explicit locative `semantic_scene.state_or_location` strings and, when that location object has a current target-language entry in the deck/export row set, verifies that the target example visibly anchors it. Plain state/color values such as `orange`, and abstract classroom/queue contexts such as `in class` / `in line`, are not treated as object-location anchors. `EN`, `RU`, `ES`, `FR` and `DE` are hard-blocking anchor languages; other languages use the same evidence as warning/review signal to avoid false blockers from ordinary case, definiteness or synonym variation. The alias table intentionally accepts current normal locative/synonym forms such as kitchen sink vs sink, TV stand vs furniture/cabinet/тумба, frying pan vs pan, matcha bowl as DE `Schale` and RU `чаша` forms, Finnish locative `pöydällä` for table, and common inflected forms in Slavic, Baltic, Nordic, Georgian, Japanese and Southeast Asian rows; those aliases must reduce false warnings only, not hide a real scene-location drift. A synthetic scene-slot proof alone is not enough to hide a target example that uses a different location object from the canonical English scene.

Executable deterministic gate: `scripts/check-example-naturalness.mjs <set_id> [<set_id> ...]`. It is called by `scripts/db-qa-set.sh <set_id>`, `scripts/check-qa-evidence.mjs`, `scripts/export-flashcards-working-sheet.mjs --final` and `scripts/run-final-linguistic-audit.mjs`; the same shared validator is also called by `scripts/check-language-batch-source-preflight.mjs` before language-batch import. V2 blocks confirmed machine-like locative/state templates while preserving the same semantic scene. Current hard blockers include RU overuse of generic `находится/находятся`, KO detached topic/subject particles such as `분무기 은`, HI copula-before-location and duplicate-copula state patterns such as `है साफ है`, SI `තිබේ` before the location predicate, HY literal `X է location/state է`, AZ/UZ/KK existential-after-subject order such as `X var/bor/бар location`, TL bare `X ay ...` without `Ang` in these noun-location examples, and KM/LO isolated locative markers with generated token spaces. This gate does not grant native approval; it blocks repeated proven calques so the target examples stay both scene-preserving and more natural for ordinary learner cards.

Executable deterministic gate: `scripts/check-number-example-grammar.mjs <set_id> [<set_id> ...] [--write-evidence] [--out=path]`. It is required for `Numbers & Counting` and future number-heavy/quantity decks. The gate is called by `scripts/db-qa-set.sh <set_id>`, `scripts/check-qa-evidence.mjs`, `scripts/export-flashcards-working-sheet.mjs --final` and `scripts/run-final-linguistic-audit.mjs`. It blocks confirmed risk patterns such as wrong number + noun agreement, missing Korean counters/spacing, missing Filipino linkers, Romanian missing `de` after 20+ quantity expressions, Serbian script mixing and stale or missing current proof. With `--write-evidence`, it writes `qa_reviews.check_family='number_example_grammar'` evidence for every current target example row; the evidence must include current EN example, current target example and scene slots, so generic “short/useful example” claims cannot satisfy final delivery.

Executable deterministic gate: `scripts/check-base-example-naturalness.mjs <set_id> [<set_id> ...]`. It runs before trusting translations and blocks bad English anchors that would otherwise be faithfully preserved by semantic QA. V1 hard-blocks repeated `I need to...` templates, generic placeholder examples and the confirmed tautology class where the target phrase is placed in its own head noun location, e.g. `The shower head is in the shower.`. Legitimate object-location examples such as `The toilet seat is on the toilet.` or `The freezer bag is in the freezer.` are not blocked by v1.

### QA-7: Transcription QA

Проверяется после генерации единой `transcription`:

- формат соответствует [Language Transcription Policy](language-transcription-policy.md);
- `transcription` хранится для слова, не для примера;
- для каждого языка есть ровно одно значение `transcription`;
- пустых `transcription` быть не должно;
- для языков с policy `native orthography` `transcription` повторяет отображаемое слово;
- romanization не заменяет native script, если язык должен храниться native script;
- для языков с повышенным риском `pronunciation_status` остается `needs_review`, пока нет проверки;
- `transcription` является вспомогательной learner-подсказкой в текущем карточном deliverable; audio не входит в этот repair/export loop, поэтому minor romanization/transliteration variants не блокируют карточку, если они не меняют слово, не вводят в заблуждение и имеют structured QA evidence;
- для RU practical Latin transliteration допустимо помечать `generated_checked`, когда кириллическое слово верное, латинизация понятна обычному ученику and no misleading reading is introduced.

Executable deterministic gate: `scripts/check-transcription-policy-shape.mjs <set_id> [--write-evidence]`. It is called by `scripts/db-qa-set.sh <set_id>`, `scripts/check-qa-evidence.mjs`, `scripts/import-language-batch.mjs` preflight and `scripts/export-flashcards-working-sheet.mjs --final`. With `--write-evidence`, it writes current `transcription_policy` evidence for rows that pass the deterministic policy shape; this is shape evidence only and does not replace `transcription_source_backing`. The dedicated smoke checker `scripts/check-transcription-fallbacks.mjs <set_id> [<set_id> ...]` uses the same fallback logic and prints only canonical-English fallback-risk rows.

This gate blocks gross shape errors even when old `qa_reviews` evidence exists:

- `native_orthography`: `transcription` must exactly repeat `word_with_article_or_marker` / display word;
- `IPA`: `transcription` must be wrapped in `/.../` and must not be the plain display word;
- `romanization`: if display/native word uses non-Latin script, `transcription` must be Latin-script / diacritic Latin, not native script, not a copy of display and not a fallback to `canonical_english` after punctuation/article normalization;
- partial English-tail leaks are also blocked for native-script romanization rows. A value such as `kuhnenski-kitcen-scale`, `khrua-citrus-juicer-ǎa` or `rannaghor-parchment-paper` fails even if it is not exactly equal to the full `canonical_english`;
- a narrow source-backed loanword allowlist can suppress false positives only when the native-script display word itself contains a loanword whose practical romanization legitimately equals the English token, such as `HY` `դիսպենսեր` -> `dispenser`, `HY` definite-suffix display forms like `մատչան` -> `matcha` / `յերբա մատեն` -> `yerba mate`, `SI` `සින්ක්` -> `sink`, or `KM` `ស្ព្រាយ` -> `spray`. This is not permission to copy English tails; every new allowlist token needs an explicit documented source decision;
- `EN` and `EN-GB` verb cards must display `to + base verb`;
- `ZH`: Hanyu Pinyin must include tone marks;
- `VI`: native orthography must keep Vietnamese tone marks by repeating display word;
- `TH` and `LO`: use learner romanization with vowel tone diacritics; no old RTGS/BGN no-tone forms and no parenthetical tone labels;
- `MY`: use practical romanization with tone/register notation; no Burmese script in `transcription`.

Executable deterministic gate: `scripts/check-transcription-cross-language-fallbacks.mjs <set_id> [<set_id> ...]`. It is called by `scripts/db-qa-set.sh <set_id>`, `scripts/check-qa-evidence.mjs`, `scripts/import-language-batch.mjs` preflight, `scripts/export-flashcards-working-sheet.mjs --final` and `scripts/run-final-linguistic-audit.mjs`. V1 blocks two confirmed mass-fallback patterns: a 3-language high-risk batch where 60%+ comparable rows have identical transcriptions across all batch languages, and a deck-level collapse where the same normalized transcription appears across 5+ of `BN`/`HI`/`NE`/`SI`/`TA`/`TE`/`KN`/`ML` on at least 10 cards or on at least 3 cards that are also 40%+ of active cards. Smaller 3-4 language overlaps and isolated loanword-like overlaps are warnings/review artifacts, not final blockers.

Executable deterministic gate: `scripts/check-transcription-intra-language-collapse.mjs <set_id> [<set_id> ...]`. It is called by `scripts/db-qa-set.sh <set_id>`. It fails a native-script romanization language when the same normalized `transcription` is reused across many different active meanings inside one deck, for example RU `kuhonnye` repeated for every card. This catches one-language collapse that cross-language fallback checks cannot see.

Executable source-backed gate: `scripts/check-source-backed-transcriptions.mjs <set_id> [<set_id> ...] [--write-evidence] [--verify-manifest-hashes] [--out=path]`. It loads `config/transcription-source-policy.json`, verifies the language/source matrix against `reference-sources/sources.manifest.json`, applies the transcription shape, pseudo-IPA/tone/fallback checks, strict high-risk lookup and the IPA source lookup layer, and classifies each row as `deterministic`, `source_exact`, `source_partial`, `conflict` or `no_source`. Only `deterministic` and `source_exact` can be final-ready. With `--write-evidence`, it writes `qa_reviews.check_family='transcription_source_backing'` evidence with method, confidence, source ids/path family, policy version, manifest hash, current display/native/transcription values and issues. This evidence is hash-scoped and is required by `check-qa-evidence.mjs`, `export-flashcards-working-sheet.mjs --final` and `run-final-linguistic-audit.mjs`.

Executable IPA source lookup gate: `scripts/check-ipa-source-lookup.mjs <set_id> [<set_id> ...] [--out=path] [--warn-only]`. It builds ignored targeted indexes under `reference-sources/cache/ipa-source-lookup/` from the local IPA-focused raw sources and checks `EN`, `EN-GB`, `FR`, `SV`, `NB/NO`, `DA` and `IS`. It blocks source-confirmed pseudo-IPA and source gaps where the current value is slash-wrapped display orthography. The checker is also wired into `scripts/db-qa-set.sh` and `scripts/lib/source-backed-transcriptions.mjs`, so final export, `check-qa-evidence.mjs` and post-final audit inherit the same blockers. The current implementation uses the corrected Swedish NST SAMPA column and Danish NST fallback source in addition to Udtaleordbog.dk.

2026-06-12 performance note: Kaikki/Wiktionary IPA fallback can be indexed into reusable ignored full-source caches under `reference-sources/cache/ipa-source-lookup/` before target-term filtering where that fallback is enabled. For `EN-GB`, production pre-import uses the dedicated Britfone source by default; the Kaikki English IPA fallback is opt-in via `ENABLE_KAIKKI_IPA_FALLBACK=1` for offline audit because cold-scanning the English dump is too expensive for ordinary deck production. This does not weaken the pseudo-IPA blocker: IPA shape sanity and Britfone exact/component lookup remain active.

The 2026-05-01 IPA-focused source cache adds stronger local evidence for `EN`, `EN-GB`, `FR`, `SV`, `NB/NO`, `DA` and `IS`: CMUdict, Britfone, Lexique383, NST Swedish/Danish, NB Uttale/NLB Bokmål, Udtaleordbog.dk and IcePronDict. These files are source-backed QA inputs only. A row still needs exact current display/native form matching, regional policy matching and current QA evidence before any transcription repair or final export can pass; source availability alone must not silently approve or overwrite IPA values. The first all-generated-deck IPA lookup report found 235 blockers in `Kitchen Storage & Cleaning` and `Bathroom Essentials`. The completed repair rollout fixed all 235 in Postgres, refreshed evidence, re-exported and updated the same Google Sheet file ids, and passed readback, post-final audit and delivery freshness. Future source-gap rows must still be closed by source-backed repair/review before export, not guessed.

Strict high-risk lookup: `scripts/check-high-risk-transcription-lookup.mjs <set_id> [<set_id> ...] [--out=path]` checks `TH`, `LO`, `MY`, `KM` and `HY` against local source indexes/rules under ignored `reference-sources/cache/`, with LOC/SEAlang/Wiktionary/thai-language.com references used as comparison/provenance. `TH`, `LO`, `MY` and `KM` require exact local Kaikki headword evidence unless a current-value-locked manual/component decision exists. `HY` uses a CLDR BGN-style compiler from the current Armenian display form, with LOC/ALA-LC as comparison provenance; competing Kaikki-style romanization is not final policy when it conflicts. These languages no longer pass final source backing only because a source family exists. Missing exact local headword evidence returns `source_partial`; mismatch with exact source candidates or the `HY` BGN compiler returns `conflict`. Delimiter-only source differences can pass only when letters, diacritics and tone marks still match. Component or phrase-level source decisions must be recorded in `reference-sources/manual-decisions/high-risk-transcription-decisions.jsonl`; stale current-value proof fails closed. The first 2026-05-01 strict audit of the five generated decks found 667 blockers and failed closed without mutating DB or Google Sheets. The completed repair-first rollout now has all five generated decks passing strict lookup and source-backed transcription evidence.

Fixture regression gate: `scripts/check-transcription-source-policy-fixtures.mjs` checks gold and negative examples from real failures: RU `kuhonnye` collapse, Thai/Bulgarian `kitcen` English-tail leaks, slash-wrapped pseudo-IPA, pinyin tone numbers, native-script romanization leaks and English fallback tails.

Executable deterministic gate: `scripts/check-entry-cross-language-fallbacks.mjs <set_id> [<set_id> ...]`. It is the entry/display analogue of transcription collapse detection. V1 fails high-risk non-English rows whose `native_word`/display form is a Latin-script copy of `canonical_english`, fails 3-language high-risk import batches where 60%+ comparable rows share one identical Latin entry/display surface, and fails deck-level mass collapse. Single plausible loanwords and isolated overlaps are warnings, not blockers.

Executable source-backed translation gate: `scripts/check-entry-source-backed-translations.mjs <set_id> [<set_id> ...] [--all-languages] [--warn-only] [--out=path]`. It catches the failure class where a native-copy language entry/display is English or Taglish fallback even though transcription QA is clean. Final delivery calls the checker with all active non-English language codes, so exact English fallback or high English-token fallback blocks unless a current-value-locked row exists in `reference-sources/manual-decisions/entry-source-decisions.jsonl`. A valid decision must match current `set_id`, `meaning_id`, `language_code`, `current_native_word`, `current_display_word` and `current_transcription`, use `decision_type` `source_attested_loan`, `source_exact_repair` or `component_source_repair`, and cite source ids that exist in `reference-sources/sources.manifest.json`. Stale, partial, conflict or missing decisions fail closed. `--warn-only` is for exploratory audits only; do not mass-repair legitimate source-attested loans.

Historical all-language status before reset: the source-review queue `outputs/qa/entry_source_backed_translation_all_language_report_20260501.json` originally had 38 warnings in native-copy languages outside TL. The repair pass resolved that queue by adding current-value-locked source decisions for accepted loans/phrases, accepting AZ `spatula` only after Azerbaijani product usage evidence, and repairing 5 confirmed rows through narrow entry/transcription/example imports. `outputs/qa/entry_source_backed_translation_all_language_final_20260501.json` had 0 blockers and 0 warnings across all five pre-reset generated decks. The gate remains wired into `scripts/db-qa-set.sh`, `scripts/check-qa-evidence.mjs`, `scripts/export-flashcards-working-sheet.mjs --final` and `scripts/run-final-linguistic-audit.mjs`.

Executable translation source coverage gate: `scripts/check-translation-source-coverage.mjs <set_id> [<set_id> ...] [--report-only] [--out=path]`. It loads `config/translation-source-policy.json`, validates source ids against `reference-sources/sources.manifest.json`, applies the all-language entry source-backed fallback decisions and reports per-row source coverage status. In enforced mode it blocks stale decisions, source conflicts and English-looking fallback. In v1 it does not block every `source_partial` or `no_source` row, because open dictionary coverage is uneven across 54 languages; those rows remain coverage/risk evidence for review and future source expansion. `outputs/qa/translation_source_coverage_all_generated_report_20260501.json` is the first report-only baseline for the five generated decks and has 0 blockers.

Executable pre-import source preflight: `scripts/check-language-batch-source-preflight.mjs <language-batch.jsonl|csv> [--out=path] [--decisions=path] [--require-warning-decisions]`. It reads the draft batch, current deck meaning metadata when available, `config/transcription-source-policy.json`, `config/translation-source-policy.json`, `reference-sources/sources.manifest.json` and current source-decision files. It writes a source-candidate report under `outputs/source-preflight/` by default and records `input_sha256`. `scripts/import-language-batch.mjs` calls the same gate before import, writes an import preflight report, and refuses the batch if blockers remain. Production import should pass `--expected-preflight-report=<report.json>` so the importer can prove the draft hash, set_id and language set still match the preflighted file. `source_partial`, `no_source` and optional tool-adapter absence are visible warnings, not final approval and not automatic replacement instructions. Actionable warnings can be decision-locked by current values; unresolved warning decisions block when `--require-warning-decisions`, `SOURCE_PREFLIGHT_REQUIRE_WARNING_DECISIONS=1` or the automatic high-risk/number-heavy profile is active. Use `--no-auto-warning-decisions` only for a deliberate diagnostic dry run, not for production import.

Fixture regression gate: `scripts/check-entry-source-backed-translations-fixtures.mjs` checks confirmed fallback modes across TL and non-TL native-copy languages: exact English fallback like `aluminum foil`, `pantry` or `spatula` must fail under enforced all-language mode, repaired forms such as `tuwalyang papel`, `pantri`, `kertas cupcake` and source-attested loans such as `cling wrap` pass only with current values or current-value-locked decisions, and stale decisions fail closed.

Executable deterministic gate: `scripts/check-sibling-language-copy.mjs <set_id> [<set_id> ...]`. It emits warning/review artifacts when sibling or regional pairs have identical display/example surfaces. V1 intentionally does not hard-fail these rows because `PT/PT-BR`, `ES/ES-419`, `EN/EN-GB`, `MS/ID`, `HI/NE` and `TA/TE` can legitimately share short forms.

Transcription-only repairs use `scripts/import-transcription-repair.mjs <repair.jsonl|csv> [--dry-run]`. The helper changes only `transcription` and optional `romanization_system`, requires the current DB transcription to match the repair input, enforces at most 3 languages per import, and requires repair rows to carry source-backed metadata (`source_confidence`, `source_id`, `source_method`, `source_note`). Only `deterministic` and `source_exact` repair confidence is accepted. The import writes `transcription_source_backing` evidence for repaired rows; for IPA repair rows it also validates IPA sanity and writes fresh `pronunciation_accuracy` evidence. Stale or synthetic source metadata must fail before final export.

### QA-8: Export/Importer QA

Проверяется перед передачей spreadsheet-файла пользователю:

- workbook открывается как валидный `.xlsx`;
- листы имеют стабильные названия;
- один workbook описывает одну колоду / один учебный набор, а не общий склад разных наборов;
- название Google Sheets документа отражает категорию/колоду;
- в workbook есть лист `Course Metadata` со строками `Title`, `Description`, `Module` и `Category`;
- в workbook есть лист `Deck Metadata` с deck-level полями колоды;
- в workbook есть лист `Card Metadata` с row-level полями для каждой карточки;
- в workbook есть лист `_qa_status` с coverage/import-readiness проверками;
- `Course Metadata` описывает именно текущую колоду, а не язык обучения в целом и не placeholder-пример;
- `Course Metadata` использует тот же фиксированный порядок 54 языков, что и vocabulary-листы;
- каждый localized `Title` в `Course Metadata` не длиннее 25 символов;
- каждый localized `Description` в `Course Metadata` не длиннее 60 символов;
- каждый localized `Module` и `Category` в `Course Metadata` не длиннее 25 символов;
- `Module` / `Category` должны быть короткими localized labels для `content_sets.domain` / `content_sets.area` and must exactly match `config/course-metadata-taxonomy-labels.json`; if a deck has a narrower user-facing category than its parent `area`, the checker must use the deck-specific `setCategoryOverrides` entry; long technical `content_sets.category`, stale older labels and comma-separated scopes are blockers;
- `Description` содержит exact DB-backed `level_signal`, соответствующий `Deck Metadata.level_label`;
- `Title` и `Description` завершаются настроенным sentence terminator для языка;
- `Description` вводит `level_signal` как отдельное короткое предложение, а не приклеивает уровень к тематической фразе;
- non-English `Course Metadata` must not be an English fallback with localized punctuation; `scripts/check-course-metadata-localization.mjs` normalizes punctuation and blocks non-English `Title`/`Description`/`level_signal` rows that still match the English source text, and it also blocks `Module` / `Category` values that drift from the configured taxonomy labels or deck-specific category overrides;
- if a user-facing localized metadata label sounds doubtful even though it matches `config/course-metadata-taxonomy-labels.json`, run `scripts/export-course-metadata-native-style-review.mjs <set_id> --languages=<codes|all>` and review the resulting Gemini/native-style pack. This catches naturalness and singular/plural label issues such as a food-category label that is technically translated but not the best native UI label. Config equality alone is not native-style proof;
- CEFR-код не подставляется в user-facing `Title`/`Description` как механический заменитель нормального текста;
- `Title` сразу понятно называет тему колоды, без generic labels вроде `Vocabulary` / `Words`;
- `Description` дополняет `Title`, объясняет scope/пользу колоды и не является набором ключевых слов;
- localized `Title`/`Description` звучат естественно на целевом языке и сохраняют смысл колоды;
- metadata одной колоды не является boilerplate, который без изменений подходит к другим колодам;
- `Deck Metadata` содержит `set_id`, `slug`, `content_type`, taxonomy, `roadmap_stage`, `level_label`, `level_min`, `level_max`, `learning_goal`, `next_recommended_set_ids`, `selection_status`, `quality_status`, `sheet_contract_version`, `export_status`;
- `level_label` задан ровно одним допустимым значением: `Basic`, `Elementary`, `Pre-Intermediate`, `Intermediate`, `Upper-Intermediate`, `Advanced`, `Proficiency`;
- `level_label` соответствует совместимому CEFR range: `Basic=A1`, `Elementary=A1-A2/A2`, `Pre-Intermediate=A2-B1/B1`, `Intermediate=B1/B1-B2`, `Upper-Intermediate=B2`, `Advanced=B2-C1/C1`, `Proficiency=C2`;
- `Card Metadata` содержит `main_sheet_row`, `card_key`, `set_id`, `meaning_id`, `context_example_id`, `context_example_key`, `part_of_speech`, `level`, `frequency_band`, `priority_band`, taxonomy and row statuses;
- `card_key = set_id::meaning_id` and is the stable row key in the workbook;
- `main_sheet_row` в `Card Metadata` соответствует реальной строке карточки в основном листе;
- export script блокирует workbook, если обязательные `Deck Metadata` поля отсутствуют в базе;
- порядок колонок соответствует grouped-column формату: translations -> examples -> word transcriptions;
- транскрипция есть только для слов;
- в пользовательском листе нет отдельных вариантов `romanization`, `pronunciation_ipa` или `learner_pronunciation`;
- технические поля не ломают пользовательский лист;
- количество строк совпадает с набором;
- финальная user-facing `transcription` колонка не пустая и заполнена по language policy;
- final export должен падать с ошибкой, если хотя бы один активный язык имеет пустые words/examples/transcriptions или non-final statuses;
- raw `generated` is non-final in final mode; it is allowed only in working preview exports;
- working preview export должен быть явно помечен как `not final-ready`;
- Google Sheets / Excel не показывает формульные ошибки;
- файл помечен как review/export, а не как approved import, пока QA не закрыт.

### QA-9: Post-Final Linguistic Audit

Post-final linguistic audit is the required final sanity pass for a production-delivered deck after it already passes normal final export. It does not replace QA-1..QA-8 and it does not turn machine-checked languages into native-approved languages.

Run this pass for every deck before calling its Google Sheet delivery complete/current final:

```bash
node scripts/export-final-linguistic-audit-batch.mjs <set_id> --languages=all
node scripts/run-final-linguistic-audit.mjs outputs/audit/final_linguistic_audit_<set_id>_<timestamp>_batch.jsonl
node scripts/import-final-linguistic-audit-results.mjs outputs/audit/final_linguistic_audit_<set_id>_<timestamp>_results.jsonl
```

The audit checks current exported card data across all 54 active language variants: entry/display form, example presence/naturalness/lexical-anchor blockers, example/display casing shape, `semantic_scene` structure, supported target-scene marker alignment, number-example grammar where applicable, regional variants, current QA statuses, script/language identity and transcription shape. It records structured `qa_reviews` evidence with `check_family=final_linguistic_audit`, `target_type=export`, `target_key=set_id::meaning_id::language_code`. The evidence is historical post-final audit evidence; final export still depends on the normal gates (`word_selection_quality`, `base_example_alignment`, `example_quality`, `entry_form`, `entry_form_register`, `semantic_granularity`, `article_gender_marker_consistency`, `semantic_preservation`, `target_example_naturalness`, `target_example_lexical_anchor`, `number_example_grammar` for number-heavy/quantity decks, `regional_variant_quality` where applicable, `transcription_policy`) plus deterministic gates.

If the audit finds `needs_review` or `fail`, the Google Sheet delivery is stale/incomplete: fix only the confirmed wrong rows through a reproducible repair seed or approved repair import, rerun QA-1..QA-8, rerun final export/upload, rerun QA-9, then update the same Google Sheet file id. If the audit is clean, document the result as `final linguistic audit completed`; do not write `100% guaranteed` or `native-approved`. If workbook metadata or delivery manifest should include the clean audit evidence, refresh final export and update the same Google Sheet file id after importing audit evidence; do not create a duplicate.

## External Verification Policy

Сеть можно использовать только точечно:

- спорная romanization/transliteration system;
- спорное language-specific display/register/classifier/case rule;
- официальный стандарт языка или кода;
- явно подозрительный перевод;
- региональный вариант;
- грамматический маркер или register/formality, где нужен авторитетный источник.

Не использовать сеть как массовую ручную проверку `items x active language variants`. Предпочтительные источники: официальные стандарты, академические/словарные источники, авторитетные language resources. Случайные сайты не считаются достаточным основанием для `approved`.

## Ручные решения в review-файлах

В review XLSX используются решения:

```text
approve
revise
move_category
remove
discuss
```

Смысл решений:

| Решение | Что делать |
| --- | --- |
| `approve` | Item можно переводить или перевод можно двигать к следующему gate. |
| `revise` | Нужно исправить слово, пример, metadata или перевод. |
| `move_category` | Item годится, но находится не в той теме. |
| `remove` | Item не подходит для текущего набора; в базе не удалять молча, а блокировать или заменить. |
| `discuss` | Требуется отдельное решение пользователя. |

## Текущие инструменты

Текущие скрипты:

```text
scripts/db-check-pilot.sh
scripts/db-check-pilot-ru.sh
scripts/db-qa-set.sh
scripts/db-qa-pilot.sh
scripts/import-deck-base-data.mjs
scripts/import-language-batch.mjs
scripts/export-pilot-review.mjs
scripts/export-pilot-ru-review.mjs
scripts/export-flashcards-working-sheet.mjs
scripts/check-language-order.mjs
scripts/check-deck-specs.mjs
scripts/check-deck-ready.mjs
scripts/check-product-roadmap.mjs
scripts/check-qa-evidence.mjs
scripts/check-transcription-policy-shape.mjs
scripts/check-transcription-cross-language-fallbacks.mjs
scripts/check-entry-cross-language-fallbacks.mjs
scripts/check-entry-source-backed-translations.mjs
scripts/check-script-language-identity.mjs
scripts/check-sibling-language-copy.mjs
scripts/check-meaning-contrast.mjs
scripts/check-semantic-granularity.mjs
scripts/check-article-gender-marker-consistency.mjs
scripts/check-base-example-naturalness.mjs
scripts/check-example-template-diversity.mjs
scripts/check-target-example-lexical-anchor.mjs
scripts/check-qa-hash-coverage.mjs
scripts/check-delivery-freshness.mjs
scripts/check-semantic-scene-alignment.mjs
scripts/sync-qa-statuses-from-evidence.mjs
scripts/run-ai-qa.mjs
scripts/import-ai-qa-results.mjs
scripts/import-example-translations.mjs
scripts/import-transcription-repair.mjs
scripts/import-entry-repair.mjs
scripts/import-base-example-repair.mjs
scripts/export-semantic-qa-batch.mjs
scripts/import-semantic-qa-results.mjs
scripts/export-review-decisions-template.mjs
scripts/import-review-decisions.mjs
scripts/export-final-linguistic-audit-batch.mjs
scripts/run-final-linguistic-audit.mjs
scripts/import-final-linguistic-audit-results.mjs
```

`scripts/db-check-pilot.sh` - быстрые счетчики пилота.

`scripts/db-check-pilot-ru.sh` - read-only проверка первого RU-слоя: покрытие 50 entries/examples, заполненность display/transcription/romanization и отсутствие искусственных артиклей в русском.

`scripts/db-qa-set.sh <set_id>` - основной generic structural QA gate для любой колоды. Скрипт read-only: он не меняет данные и завершится с ошибкой, если есть failed `ERROR` checks.

`scripts/db-qa-pilot.sh` - compatibility wrapper/legacy name для текущего pilot-набора; новые инструкции должны использовать `db-qa-set.sh <set_id>`.

`scripts/import-deck-base-data.mjs` - structured import для новой base deck data: создает deck metadata, `meaning_units`, set memberships, EN entries and EN context examples with raw `generated` statuses.

`scripts/import-language-batch.mjs` - structured import для language batch максимум на 3 языка. Импортированные entries/examples/transcriptions остаются raw `generated` до QA. Preflight now runs the source-assisted draft gate before DB writes, blocks hard source/shape/script/fallback failures, blocks number-heavy/high-risk batches with more than one language, blocks obvious draft example scene drift, blocks mass identical transcription or Latin entry/display fallback in high-risk batches and prints source/tool/sibling-copy warnings as review artifacts.

`scripts/run-deck-production.mjs <Sort|set_id> --stage=<stage> [--execute]` - executable stage-runner for production deck creation. It is the controller for production order; prompts are only instructions to the agent. Stages are `prepare`, `base`, `draft-preflight`, `batch-import`, `qa`, `export`, `deliver` and `complete`. The runner writes `outputs/runs/<set_id>/<run_id>.json`, uses `deck_generation_runs` as the runtime lock, records hashes for stage artifacts and refuses stale or out-of-order stages.

`scripts/check-deck-run-state.mjs <Sort|set_id> [--run-id=<run_id>]` - read-only status/resume checker for the stage-runner. It reports the latest stage, active runtime lock, current input hashes and stale/missing artifacts. For a completed run, a later spec-file hash change caused only by documenting final `generated`/delivery status is reported as a warning, not as a resume blocker; pre-completion stages still fail closed on spec staleness.

`scripts/check-release-readiness.mjs <set_id> [<set_id> ...] [--current-generated] [--report-only] [--out=path]` - read-only release passport for one or more delivered decks. It does not replace the individual gates. It collects current Postgres row/status counts, latest runner completion evidence, final delivery manifest/readback state, latest post-final audit, latest sample-card audit and fresh translation-source coverage into one JSON/Markdown report under `outputs/release-readiness/`. A deck is blocked if runner completion, all-language final statuses, final delivery/readback/freshness-equivalent hashes, post-final audit or sample audit evidence are missing/stale, or if the sample audit has blockers. Sample-audit warnings remain warnings in the release passport because action-verb and inflected-language lexical-anchor heuristics can be useful review signals without proving a release blocker when semantic-scene proof and mandatory gates pass.

`scripts/audit-sample-card-quality.mjs <set_id> [<set_id> ...] --sample-size=<n> --seed=<stable-seed> --out=<report.json> [--exclude-rows=<prior-report.json|jsonl>]` - read-only broad sample audit for delivered/current decks. It samples `n` rows per deck/language and checks entry/display translation fields, example text, transcription, final statuses, current QA evidence, source-backed translation/transcription, casing, spacing/script shape, target-scene proof, lexical anchor, number grammar and known surface-grammar traps. `--exclude-rows` can point at a prior audit JSON with `sampled_rows_detail` or JSONL identities to force a genuinely new sample that excludes already checked `set_id` / `meaning_id` / `language_code` rows. It can run across all current ordinary decks in one invocation; large all-deck audits use an expanded Postgres output buffer but do not mutate card data or Google Sheets.

`scripts/export-forced-review-queue.mjs <set_id> [<set_id> ...] [--current-generated] [--include-all-source-partial] [--out=path]` - read-only forced/native review queue exporter. It writes JSONL/CSV/Markdown under `outputs/review/` for rows that are not necessarily delivery blockers but deserve human/native review: source-backed translation blockers/warnings, weak-language `source_partial` rows, `no_source` rows, transcription source blockers and any latest sample-audit issues. This queue improves confidence beyond `generated_checked`; it is not native approval and does not mutate Postgres.

`scripts/resolve-forced-review-queue.mjs --current-generated|--queue=outputs/review/*.jsonl [--report-only] [--write-auto-confirmations] [--out=path]` - read-only/source-ledger resolver for the forced review queue. It rereads current DB rows, gathers current source candidates from the same adapter/index layer used by pre-import, and classifies each queued row as `auto_confirmed_strong`, `auto_supported_multi_source`, `source_conflict_needs_repair`, `still_source_partial` or `not_checkable`. The default mode writes JSONL/CSV/Markdown reports only and never changes cards, statuses or Google Sheets. `--write-auto-confirmations` appends current-value-locked rows to `reference-sources/manual-decisions/auto-source-confirmations.jsonl`; those rows reduce future forced-review noise only when `set_id`, `meaning_id`, `language_code`, native/display word and transcription still match the DB. They are not native approval and they do not make non-RU rows `approved`.

`scripts/export-pilot-review.mjs` - создает review XLSX для ручной проверки.

`scripts/export-pilot-ru-review.mjs` - создает RU review XLSX для ручной проверки первого целевого языкового слоя.

`scripts/export-flashcards-working-sheet.mjs` - создает wide-format `.xlsx` для Google Sheets с порядком колонок `translations -> examples -> word transcriptions`.

`scripts/check-language-order.mjs` - read-only проверка, что export scripts and docs reference the single 54-language source `config/language-order.json` and that the transcription policy matrix matches language name, spreadsheet code, DB code, transcription format, order and count.

`scripts/check-deck-specs.mjs` - read-only проверка, что `generated`, `spec_ready` и `approved_for_generation` rows в Deck Master Plan имеют registry row and spec file in `docs/deck-specs/`.

`scripts/compile-deck-candidate-pool.mjs <Sort|set_id> <candidate-input.jsonl|csv>` - compiles a deck candidate pool from reviewed candidate rows, fills spec defaults, checks existing generated surfaces for duplicate risk and writes `outputs/candidate-pools/<set_id>_candidate_pool.jsonl` plus a short summary.

`scripts/check-deck-candidate-pool.mjs <Sort|set_id> [--file=path]` - read-only candidate-pool validation. It blocks too-small pools, selected counts outside target range, selected rows outside scope, unresolved duplicate risks and excluded rows without move targets.

`scripts/check-word-selection-quality.mjs <Sort|set_id> [--file=path]` - read-only semantic word-selection validation for selected candidate-pool rows. It blocks ambiguous words without sense notes, weak/generic examples, missing display/article fields, low selected scores, unresolved duplicate/scope decisions and multiword rows without whole-meaning risk.

`scripts/check-deck-ready.mjs <Sort|set_id>` - read-only проверка перед генерацией конкретной колоды. Должна падать для `planned` / `candidate` and any deck that is not `approved_for_generation` with a complete spec, safe `set_id`, numeric target range, compatible `level_label`/CEFR range, non-placeholder include/exclude/candidate-pool/QA notes. For `approved_for_generation`, it also requires the default candidate-pool JSONL to pass.

`scripts/check-product-roadmap.mjs` - read-only проверка, что Content Roadmap не содержит самостоятельный numbered operational backlog и не дублирует Deck Master Plan.

`scripts/check-qa-evidence.mjs <set_id>` - read-only проверка, что final statuses имеют latest structured `qa_reviews` evidence, checked hashes are current, latest non-pass не перекрывает final status, pass evidence is reflected back into target row statuses, dry-run/synthetic pass evidence is not counted, English context examples pass deterministic semantic-scene alignment and supported target examples preserve deterministic scene markers.

`scripts/check-transcription-policy-shape.mjs <set_id>` - read-only deterministic gate формы `transcription`. It catches IPA/romanization/native-orthography/tone-aware shape violations that AI evidence cannot override.

`scripts/check-transcription-fallbacks.mjs <set_id> [<set_id> ...]` - read-only smoke gate for canonical-English fallback leaks in romanization transcriptions. It normalizes case, punctuation, whitespace and English display prefixes, so values like `food storage container:` block even if old QA evidence exists. It also blocks partial English-tail leaks in native-script romanization rows, such as `kitcen-scale` or `parchment-paper`.

`scripts/check-transcription-intra-language-collapse.mjs <set_id> [<set_id> ...]` - read-only smoke gate for one-language transcription collapse. It blocks cases where one romanization value is reused for many different display words in the same language/deck.

`scripts/check-transcription-cross-language-fallbacks.mjs <set_id> [<set_id> ...]` - read-only smoke gate for mass cross-language transcription fallback leaks. It blocks deck/batch collapse in high-risk ISO/transliteration languages while leaving isolated loanword overlaps as warnings.

`scripts/check-ipa-transcription-sanity.mjs <set_id> [<set_id> ...]` - read-only V3 smoke gate for obvious pseudo-IPA in IPA languages. It blocks slash-wrapped orthography and article/display text inside `/.../`; ambiguous short loanword-like cases stay warnings/review.

`scripts/check-entry-cross-language-fallbacks.mjs <set_id> [<set_id> ...]` - read-only smoke gate for mass cross-language entry/display fallback leaks. It blocks English fallback or identical Latin surfaces in high-risk non-English rows at batch/deck level.

`scripts/check-entry-source-backed-translations.mjs <set_id> [<set_id> ...] [--all-languages] [--warn-only] [--out=path]` - read-only source-backed translation gate for native-copy language entries. Final delivery runs the all-language enforced mode and blocks English-looking fallback unless the current row is either repaired or has a current-value-locked source decision. `--warn-only` is only for exploratory broad audits.

`scripts/check-translation-source-policy.mjs` - read-only validation that `config/translation-source-policy.json` covers all 54 active DB language codes and that every configured source id resolves in `reference-sources/sources.manifest.json`.

`scripts/check-transcription-source-policy.mjs` - read-only validation that `config/transcription-source-policy.json` covers all 54 active DB language codes and every configured source id resolves in `reference-sources/sources.manifest.json`.

`scripts/check-reference-sources-cache.mjs [--verify-hashes] [--strict-cache]` - read-only validation of the tracked source manifest against the local ignored raw cache and optional tool adapters. Default mode reports missing optional tools/raw cache as warnings; strict mode turns missing/mismatched raw cache files into blockers.

`scripts/check-translation-source-coverage.mjs <set_id> [<set_id> ...] [--report-only] [--out=path]` - all-language entry translation source coverage report/gate. Enforced mode blocks stale source decisions, conflicts and English-looking fallback; v1 keeps uneven dictionary `source_partial`/`no_source` as coverage evidence instead of automatic blockers.

`scripts/check-script-language-identity.mjs <set_id> [<set_id> ...]` - read-only gate for language-code and script mismatch. It blocks examples such as `MY` populated as Malay Latin text instead of Burmese/Myanmar script, or Latin fallback in languages whose display form must be Cyrillic, Indic, CJK, Thai, Lao, Khmer, Georgian or Armenian.

`scripts/check-sibling-language-copy.mjs <set_id> [<set_id> ...]` - read-only warning gate for suspicious sibling/regional-language copying. It does not hard-fail v1 final export; findings are review artifacts.

`scripts/check-meaning-contrast.mjs <set_id> [<set_id> ...]` - read-only gate for distinct meanings that collapse to the same display and same example inside a deck/language, with warnings for display-only collisions among nearby meanings.

`scripts/check-semantic-granularity.mjs <set_id> [<set_id> ...]` - read-only gate for entries that are too broad or too narrow against nearby meanings in the same deck, for example `body wash -> soap` when `soap` is also in the deck.

`scripts/check-article-gender-marker-consistency.mjs <set_id> [<set_id> ...]` - read-only gate for internal agreement between display word and `article_or_marker`, `gender` and `grammatical_number` fields. Confirmed mismatches block; missing split-out article metadata while display still has an article is a warning artifact. `number_quantity` rows are exempt from the missing-article warning when the display surface itself is a number word that happens to equal an article form, such as Italian `uno`; the checker must not force artificial article metadata onto cardinal-number entries. Pronoun rows are also exempt from noun-style article expectations because surfaces such as `la`, `lo` or `los` can be pronouns rather than articles. Spanish `el` before feminine stressed-a nouns is treated as compatible with feminine gender for known forms such as `agua`, `aula` and `área`, so correct displays like `el área común` are not false blockers.

`scripts/check-base-example-naturalness.mjs <set_id> [<set_id> ...]` - read-only gate for English context examples that are too templated, generic or tautological to serve as multilingual anchors.

`scripts/audit-example-semantic-smells.mjs --sample-size=5 --seed=<stable-seed> --out=<path>.json` - report-only cross-contour audit for bad English/Oxford example anchors and sampled ordinary/HSK example-surface smells. It writes matching `.json`, `.md` and `.csv` files. For Oxford 5000 contracts, pair the current repaired report with `latest_semantic_smell_audit` in the contract; `scripts/oxford/check-oxford-english-learning-gates.py` reads that artifact and blocks hard through `english_example_semantic_smell_check` when the report is missing or has release blockers. After a repair, run the audit against active artifacts again and treat stale raw generation cache hits separately from TSV/JSONL/final workbook/readback evidence.

`scripts/check-example-template-diversity.mjs <set_id> [<set_id> ...]` - read-only deck-level gate for overused example templates. It catches systemic repetition such as a large share of a deck using the same `X is on the shelf` pattern.

`scripts/check-target-example-lexical-anchor.mjs <set_id> [<set_id> ...]` - read-only gate for target examples that do not visibly include the target lexical item, a normal inflected form or an allowed language-specific variant. Verb inflection mismatches and article/definite suffix changes are warnings unless the anchor is clearly absent. For pronoun and demonstrative decks, language-specific clitic, classifier, noun-class and case forms can be configured as anchor aliases, e.g. Filipino `ikaw` -> `ka`, Chinese `这个` -> `这`, Swahili possessive class changes and Georgian object-pronoun forms. `scripts/check-target-example-lexical-anchor-fixtures.mjs` covers stable regression fixtures such as Latvian locative anchors.

`scripts/check-target-example-pedagogical-quality.mjs <set_id> [<set_id> ...]` - read-only V3 gate for target examples that are natural but poor teaching anchors. Hard blockers include self-container examples like `The shower head is in the shower.` and base scenes such as `freezer bag in the freezer` or `kitchen shelf in the kitchen`; adjacent-location variants can be warning artifacts.

`scripts/check-qa-hash-coverage.mjs <set_id>` - read-only gate that verifies `qa_checked_value_hash(...)` returns hashes for all required check families and text-bearing target types.

`scripts/check-google-sheet-readback.mjs <set_id> [--dry-run] [--readback-mode=auto|sheets|drive-export]` - read-only delivery gate after upload. It reads the same Google Sheet file id from the delivery manifest and compares headers, row count, card keys, language rows and sampled cells against the final DB/export state. Default `auto` uses Google Sheets API first, then falls back to Drive XLSX export when Sheets API is disabled. On success it writes `google_sheet_readback_status=verified` into the manifest unless `--dry-run` is used.

`scripts/check-delivery-freshness.mjs <set_id>` - read-only delivery gate after upload/readback. It recomputes current final source/workbook hashes and verifies that the final workbook, delivery manifest, same-file Google Sheet upload hash and readback verification are current.

`scripts/check-example-casing.mjs <set_id> [<set_id> ...]` - read-only deterministic gate for example/display casing. It blocks lowercase-start examples in sentence-case languages and artificial initial-uppercase/title-case display words, while ignoring scripts/languages without sentence capitalization. English `I` is the only required-uppercase standalone pronoun exception: `I` must remain uppercase as display text and as a sentence-initial/example lexical anchor for `EN` and `EN-GB`.

`scripts/check-semantic-scene-alignment.mjs <set_id> [<set_id> ...]` - read-only deterministic gate for English context example vs `semantic_scene` drift. It blocks generic scene placeholders and mismatched action/state/location before final export or audit evidence can make stale examples look current.

`scripts/check-target-semantic-scene-alignment.mjs <set_id> [<set_id> ...]` - read-only deterministic gate for supported target-language example scene markers. It blocks translated examples that no longer preserve the current `semantic_scene.state_or_location`, such as a target example saying "near the lemons" when the canonical scene is `beside the bowl`. Its all-set query intentionally loads only the current scene-slot proof fields needed by the checker, not full AI evidence payloads, so the 29-deck recurrent audit can run without stdout buffer failures.

`scripts/sync-qa-statuses-from-evidence.mjs <set_id> --dry-run|--apply` - ремонтирует drift, когда latest structured QA evidence уже есть, но target statuses остались `generated` / `needs_review`. Работает только по active deck rows; `approved` автоматически не ставит.

`scripts/run-ai-qa.mjs <set_id> --languages=<codes|all> --checks=<all|word_selection,base,example_quality,semantic,naturalness,lexical_anchor,pedagogical_quality,entry,entry_register,semantic_granularity,article_gender_marker,transcription,pronunciation_accuracy,regional_variant_quality> --dry-run` - исполняемый QA batch runner после генерации. `--dry-run` only creates a review payload and cannot produce pass evidence for final delivery by itself. Normal delivery is agent-owned: Codex reviews the payload, makes the linguistic decisions, writes a separate checked JSONL, and imports it with `import-ai-qa-results.mjs`. Missing `AI_QA_PROVIDER`, `AI_QA_MODEL` or `OPENAI_API_KEY` is not a user blocker; non-dry provider QA is only an optional implementation path when credentials already exist in the agent runtime.

`scripts/export-course-metadata-native-style-review.mjs <set_id> [<set_id> ...] [--current-final] [--languages=<codes|all>] [--out=path]` - writes a minimized Gemini/native-style review pack for localized `Course Metadata` rows. It reviews exactly `Title`, `Description`, `Module`, `Category` and `level_signal` for native UI-label naturalness, scope fit and singular/plural/category form. It does not call Gemini by itself and does not change DB rows.

`scripts/check-course-metadata-native-style-results.mjs <gemini-results.jsonl>` - validates returned Course Metadata native-style review results. `fail` rows are blockers; `needs_review` rows remain explicit warnings until repaired or current-value-locked by a human/agent decision. This validator is for the metadata-native-style lane, not for importing ordinary card QA evidence.

`scripts/import-ai-qa-results.mjs <file> [--dry-run] [--bulk]` - imports AI QA decisions for the executable check families. Primary status-changing families are `word_selection_quality`, `base_example_alignment`, `example_quality`, `semantic_preservation`, `entry_form` and `transcription_policy`; auxiliary V2/V3 layers write evidence and final gates block missing/non-pass evidence, but they do not override a non-pass primary status. `--bulk` is allowed for non-transcription evidence; `transcription_policy`, `pronunciation_accuracy` and deterministic pedagogical blockers are row-validated on import. Pass rows marked dry-run/synthetic are rejected. This script never mass-promotes non-RU languages to `approved`.

`scripts/import-example-translations.mjs <rows.json|rows.jsonl|rows.csv> [--dry-run]` - official narrow helper for repaired example translations when only examples are overwritten. It writes `generation_batches.batch_type='translation'`, exact `semantic_preservation` evidence and current hashes only after target semantic scene alignment passes. For marker-supported scenes, the evidence stores the `scene_key`, matched marker and expected markers. For unsupported scenes, repair input must provide current `semantic_scene_proof` with scene slots bound to the current English and target examples; otherwise import and final gates fail closed. It is not a shortcut around `example_quality`, `target_example_naturalness`, `target_example_lexical_anchor`, `target_example_pedagogical_quality` or `transcription_policy`; after an example repair, those required example evidence families must be refreshed before final export.

`scripts/import-transcription-repair.mjs <repair.jsonl|repair.csv> [--dry-run]` - official narrow helper for transcription-only repairs. It updates only `transcription`, optional `romanization_system` and `pronunciation_status`; it records the repair note in the generation batch item and does not overwrite entry/source notes. Repair rows must include source-backed metadata and accepted confidence (`deterministic` or `source_exact`); the importer writes current `transcription_source_backing` evidence. For IPA rows it also validates the repaired value with the IPA sanity gate and writes current `pronunciation_accuracy` evidence; fresh `transcription_policy` evidence is still required before final export.

`scripts/check-source-backed-transcriptions.mjs <set_id> [<set_id> ...] [--write-evidence] [--verify-manifest-hashes] [--out=path]` - source-backed transcription auditor. It checks every active entry against `config/transcription-source-policy.json` and the reference-source manifest, fails closed on `source_partial`/`conflict`/`no_source`, and can write current `transcription_source_backing` QA evidence.

`scripts/check-ipa-source-lookup.mjs <set_id> [<set_id> ...] [--warn-only] [--out=path]` - read-only IPA source lookup auditor for the stronger local IPA source layer. It writes a JSON report when `--out` is provided and fails hard on slash-wrapped display orthography in `EN`, `EN-GB`, `FR`, `SV`, `NB`, `DA` and `IS`.

`scripts/check-transcription-source-policy-fixtures.mjs` - static regression corpus for transcription source policy. It must pass before delivery changes that touch transcription policy/gates.

`scripts/import-entry-repair.mjs <repair.jsonl|repair.csv> [--dry-run]` - official narrow helper for entry/display-only repairs. It changes only `native_word`, learner display/article/gender/marker fields and resets entry quality back to `generated`; it does not rewrite examples or transcription. If a display repair invalidates transcription, run a separate transcription repair. For source-backed translation repair, repair rows must be current-value locked in the import artifact and any accepted loanword/no-change decision must be recorded in `reference-sources/manual-decisions/entry-source-decisions.jsonl`.

`scripts/import-entry-metadata-repair.mjs <repair.jsonl|repair.csv> [--dry-run]` - official narrower helper for article/gender/number metadata-only repairs. It verifies exact current `native_word`, learner display and metadata values, accepts at most 3 language codes per import, changes only `article_or_marker`, `gender`, `grammatical_number` and resets entry quality back to `generated`.

`scripts/import-base-example-repair.mjs <repair.jsonl|repair.csv> [--dry-run]` - official narrow helper for English context example and `semantic_scene` repair. It resets the affected base/example translation statuses so `base_example_alignment`, `example_quality`, `semantic_preservation` and `target_example_naturalness` evidence must be refreshed by hash before final export.

`scripts/export-example-casing-repair.mjs <set_id> [--output=path]` and `scripts/import-example-casing-repair.mjs <repair.jsonl|repair.csv> [--languages=A,B,C] [--dry-run]` - official narrow helpers for casing-only example repairs. The importer enforces at most 3 languages per run and validates that the only text change is uppercasing the first cased letter under the target-language policy.

`scripts/export-semantic-qa-batch.mjs <set_id> --languages=<codes|all>` - read-only JSONL export для AI/source-backed semantic QA примеров. Каждая строка содержит `set_id`, `meaning_id`, `example_id`, `context_example_key`, `language_code`, source/target examples and `semantic_scene`.

`scripts/import-semantic-qa-results.mjs <file>` - legacy/narrow semantic-only importer for exact `set_id::meaning_id::example_id`. For normal post-generation QA use `import-ai-qa-results.mjs`.

`scripts/export-review-decisions-template.mjs <set_id> --language=RU` - creates a CSV template for manual RU review decisions.

`scripts/import-review-decisions.mjs <csv|jsonl> [--dry-run]` - imports manual/review decisions back into Postgres, updates corrected entries/examples/transcriptions only when a corrected value is present and writes structured `qa_reviews`. This script can mark only RU as `approved`; non-RU `approved` is blocked until explicitly allowed later. Use `--dry-run` before importing generated review-evidence artifacts.

`scripts/export-final-linguistic-audit-batch.mjs <set_id> --languages=all` - read-only JSONL export for a post-final linguistic sanity pass across all active language variants. It includes meaning notes, examples, semantic scenes, language policy and current statuses.

`scripts/run-final-linguistic-audit.mjs <audit-batch.jsonl>` - deterministic post-final audit runner. It writes import-compatible JSONL results and a summary under `outputs/audit/`; it checks transcription shape, example/display casing shape and semantic-scene alignment, does not call an external API and does not mutate Postgres.

`scripts/import-final-linguistic-audit-results.mjs <audit-results.jsonl> [--dry-run]` - records post-final audit evidence as `qa_reviews` rows with `check_family=final_linguistic_audit`. It does not promote language rows to `approved` and is not a substitute for normal final export gates.

По умолчанию `scripts/export-flashcards-working-sheet.mjs` создает working preview export. Режим `--final` предназначен для final-ready export и обязан падать с ошибкой, если нет полного покрытия 54 языков, есть non-final statuses, context example blockers, semantic-scene alignment blockers, entry source-backed translation blockers, translation source coverage blockers, missing mandatory QA evidence (`semantic_preservation`, `target_example_naturalness`, `target_example_lexical_anchor`, `entry_form_register`, `semantic_granularity`, `article_gender_marker_consistency`, `transcription_source_backing` and others), stale `checked_value_hash` или `generated_checked` не имеет usable `qa_reviews` evidence.

## Gate criteria

### Gate 2 -> Gate 3

Pilot `EN` / English (US) base можно переводить только если:

- QA-1 не имеет failed `ERROR` checks;
- review XLSX проверен вручную;
- все строки имеют понятное ручное решение;
- context examples имеют непустую `semantic_scene`;
- спорные items исправлены, заменены или помечены `blocked`;
- пользователь подтвердил старт перевода pilot на 54 активных языковых варианта.
- перевод новых языков идет языковыми batch по 3 языка. Batch в 1 язык использовать только для проблемного языка, точечной перепроверки или исправления после failed QA. Каждый batch проходит entry/example/transcription QA до следующего batch. Для Pilot 1 первый batch = `ES, FR, ZH`; второй batch на 6 языков уже создан как исключение до фиксации нового default.

### Gate 3 -> Gate 4

Pilot translations можно экспортировать только если:

- есть language entries для всех 54 активных языковых вариантов;
- есть example translations для всех 54 активных языковых вариантов;
- переводы примеров сохраняют `semantic_scene`;
- generated_checked context examples have `qa_reviews` base-example alignment evidence keyed to `example_id`, `language_code=EN`;
- generated_checked set memberships have `qa_reviews` word-selection evidence keyed to `set_id::meaning_id`, `language_code=EN`;
- generated_checked example translations have `qa_reviews` semantic preservation evidence keyed to `set_id::meaning_id::example_id`;
- generated_checked language entries have `qa_reviews` entry-form evidence keyed to `meaning_id` + language code;
- generated_checked pronunciation/transcription fields have `qa_reviews` transcription-policy evidence keyed to `meaning_id` + language code;
- `transcription` заполнена по политике языка для всех language entries;
- deterministic transcription shape gate проходит для всех language entries;
- enforced all-language entry source-backed translation gate has 0 blockers;
- проблемные языки явно помечены `needs_review`;
- нет строк, где перевод очевидно ушел в другой смысл.

### Gate 4 -> Gate 5

Spreadsheet можно считать готовым к пользовательской QA только если:

- `.xlsx` валиден;
- структура листов соответствует [Data Delivery Pipeline](data-delivery-pipeline.md);
- нет формульных ошибок;
- счетчики строк и языков совпадают с базой.

Post-final linguistic audit is mandatory after Gate 4 final export/upload for production delivery. If it finds no blockers, the deck may be documented as `linguistic audit completed`. If it finds blockers, the current Google Sheet is stale until repairs, QA gates, final export, upload and audit are rerun.

Existing native Google Sheet updates are fail-closed. `scripts/upload-spreadsheet-to-drive-folder.mjs --file-id=<existing>` refuses the Drive media update if Google Sheets API preflight fails, because Drive-only updates can be accepted while leaving a converted Google Sheet truncated and unreadable. If this happens, enable Google Sheets API for the OAuth project, then rerun same-file upload, `check-google-sheet-readback.mjs` and `check-delivery-freshness.mjs`; do not create a duplicate sheet as a workaround.

## Открытые QA-вопросы

Эти вопросы еще не закрыты:

| Вопрос | Текущий статус |
| --- | --- |
| Кто будет финально утверждать переводы на спорных языках | Не решено. До решения использовать `needs_review`. |
| Как переносить ручные решения из review-файла обратно в Postgres | Реализован CSV-flow: `export-review-decisions-template.mjs` -> ручная RU-проверка -> `import-review-decisions.mjs`. |
| Нужен ли отдельный native-speaker review для всех 54 активных языковых вариантов | На старте нет. `approved` для всех языков автоматически не ставить; использовать generated/needs_review/blocked. |
| Автоматическая проверка сохранения смысла примеров во всех языках | Реализован `run-ai-qa.mjs` + `import-ai-qa-results.mjs`; semantic judgment остается AI/source-backed, а не deterministic diff. |
| Evidence/status drift после restore/seed/import | Закрыто: `check-qa-evidence.mjs` ловит drift в обе стороны, `sync-qa-statuses-from-evidence.mjs` ремонтирует статусы из latest evidence. |
