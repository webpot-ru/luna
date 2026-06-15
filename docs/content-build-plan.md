# Content Build Plan

Этот документ является source of truth по плану набора основной базы слов/смыслов LunaCards.

Статус: planning v0. Массовую генерацию `5000 x 54` активных языковых вариантов не начинать до пилота и утверждения QA-процесса.

Текущие принятые решения и gate-план собраны в [Decision Log](decision-log.md). Если этот документ и Decision Log расходятся, нужно остановиться и привести документацию к одному состоянию перед продолжением работы.

## Главный принцип

Не переводить сразу 5000 слов на 54 активных языковых варианта одним проходом.

Сначала нужно:

1. Спроектировать core meaning base.
2. Собрать и проверить пилотный набор.
3. Утвердить структуру Google Sheets.
4. Утвердить QA-статусы и спорные языки.
5. Только потом масштабировать батчами.

Для перевода одной готовой колоды на оставшиеся языковые варианты верхний предел normal language batch: 3 языка. Реальный batch size теперь задается `deck_profile` / `risk_flags`: для grammar-risk профилей (`action_verb`, `adjective_state`, `number_quantity`, `time_calendar`, `food_countability`, `document_admin`, `health_safety`, `service_problem`), high-risk языков и weak-source языков рабочий default and executable enforcement: 1 язык за batch. Weak-source список v1: `KO`, `VI`, `TH`, `MS`, `SK`, `SL`, `LV`, `ET`, `IS`, `BN`, `TL`, `MY`, `KM`, `LO`, `NE`, `SI`, `TA`, `TE`, `KN`, `ML`, `UZ`, `KK`, `AZ`, `KA`, `HY`. Batch меньше 3 языков также использовать для естественного хвоста, проблемного языка, точечной перепроверки или исправления после failed QA. Для Pilot 1 первый batch зафиксирован как `ES, FR, ZH`; второй batch `DE, IT, PT, JA, KO, VI` уже создан как историческое исключение до фиксации нового default. Не переводить все оставшиеся языки одной операцией, если это не отдельный явно утвержденный dry-run/technical export.

Language generation now has a draft gate before DB import:

```text
language batch draft JSONL
-> node scripts/check-language-batch-source-preflight.mjs <draft>
-> repair draft until blockers=0
-> node scripts/import-language-batch.mjs <draft>
```

Production deck creation is controlled by the stage runner, not by the prompt text alone:

```bash
node scripts/run-deck-production.mjs <Sort|set_id> --stage=prepare --execute
node scripts/run-deck-production.mjs <Sort|set_id> --stage=base --base=<base.jsonl> --execute
node scripts/run-deck-production.mjs <Sort|set_id> --stage=draft-preflight --draft=<language-batch.jsonl> --execute
node scripts/run-deck-production.mjs <Sort|set_id> --stage=batch-import --draft=<language-batch.jsonl> --execute
```

Cross-chat rule: a new ordinary deck started in a different Codex chat/window still uses this same runner contour. The prompt may request the work, but it does not authorize direct imports or skipped gates. A deck is production-current only when the runner manifest proves the current spec/candidate pool, source-preflighted language drafts, hash-guarded imports, QA, export, Google Sheet delivery/readback, post-final audit and freshness. Manual use of lower-level scripts is allowed for narrow repair/diagnostics, but not as the normal production path.

The runner writes `outputs/runs/<set_id>/<run_id>.json` and records hashes for the spec, candidate pool, base file, every accepted draft batch, every accepted source-preflight report, every hash-guarded language import report, the final workbook and the delivery manifest. `artifacts.last_*` fields are only resume pointers; durable proof for multi-language decks is stored in `artifacts.draft_preflights[]` and `artifacts.language_imports[]`. A later stage must prove the earlier artifact is still current; if a draft changes after source preflight, import is blocked.

Optional Gemini review is now an explicit QA artifact, not an implicit prompt habit. When a deck needs a second AI opinion, run:

```bash
node scripts/run-ai-qa.mjs <set_id> --gemini-pack --checks=<families> --languages=<codes>
```

This produces a Gemini Tools prompt pack under `outputs/qa/` for `mcp__gemini_tools__.gemini_extract_json`. If `LUNACARDS_GEMINI_QA_PACK=1` is set during the runner `qa` stage, the runner also records this pack generation as a QA command. Live Gemini calls still require an explicit dry-run-first/cost-aware step and the returned decisions must be imported through `scripts/import-ai-qa-results.mjs`; Gemini output never bypasses source preflight, hash-guarded import, deterministic gates, final export, Google Sheet readback, post-final audit or delivery freshness.

For ordinary deck language drafting, the production default is now structured/local draft first, Gemini reviewer/repair second. This was confirmed during Sort 30 `Coffee & Espresso Drinks` after live Gemini generation proved too slow for 54-language deck completion. Agents may use local structured templates, project dictionaries, source indexes and controlled language-specific drafting to produce a draft JSONL, but the draft has no authority until the runner preflight passes with 0 blockers and 0 unresolved actionable warnings. Gemini may still be used for bounded spot-checks, native-style review packs, hard language repairs or conflict resolution, but not as the default mass generator and never as a bypass around source preflight/import/final QA.

For deck production runs, prefer the explicit runner flag so the optional Gemini artifact is visible in the command and run manifest:

```bash
node scripts/run-deck-production.mjs <set_id> --stage=qa --gemini-qa-pack --execute
```

The legacy `LUNACARDS_GEMINI_QA_PACK=1` environment toggle remains supported for automation compatibility, but new manual runs should use `--gemini-qa-pack`.

The preflight report is written under `outputs/source-preflight/` and may include dictionary/tool/corpus candidates from local sources and optional adapters. Tool-only, dictionary and corpus candidates are repair hints, not approval evidence. Translation candidates can come from Kaikki/Wiktionary target-language gloss/link evidence, parsed DBnary EN->target translations streamed from the local archive, targeted FreeDict EN->target dictionaries, configured Apertium pairs, official/curated weak-language dictionaries, PanLex vocabulary/display-form hints, PanLex meaning-id EN-pivot candidates, weak-language indexes (`sinhala_para_dict`, `uzwordnet`, `myanmar_mcfnlp_dict`, `darsala_en_ka_lexicon`) and bulk Wikidata/concept indexes when available; all remain `source_partial` until sense-matched against `meaning_id` / `meaning_note`. Current official-dictionary coverage is active for `KO` through NIKL and `TH` through LEXiTRON; Dakshina is active only as South Asian romanization sanity and not as entry translation evidence. Tatoeba/OPUS plus weak example indexes such as ALT, SI/MY corpora and Darsala EN-KA feed `example_collocation_candidates`, Concepticon/NorthEuraLex feed `concept_sanity`, and Hunspell feeds `spelling_sanity`. The report also exposes `deck_profile`, `risk_flags`, `profile_policy`, `hard_blockers`, `actionable_warnings`, `decision_required`, `translation_candidates`, `strong_dictionary_candidates`, `official_dictionary_candidates`, `panlex_candidates`, `example_scene_candidates`, `example_collocation_candidates`, `concept_sanity`, `spelling_sanity`, `source_conflicts`, `external_mt_sanity`, `mt_agreement_score`, `low_resource_language_risk`, `license_restriction_note`, `scene_slot_proof` and `compound_whole_meaning` so the draft can be repaired before import instead of after DB pollution.

This plan describes ordinary English-canonical thematic decks. For HSK, language-specific courses, exam releases or arbitrary bilingual courses where English is not necessarily the source of truth, follow [Course Source-Assisted Generation](course-source-assisted-generation.md) before drafting. In those contours, English can be a pivot candidate, but the course contract and source-language item define the truth.

For profile-risk or high-risk grammar drafts, the preflight/importer automatically requires a one-language batch and current-value warning decisions for actionable source/tool warnings. It also blocks obvious draft example scene drift before DB import, for example a target example like `Number: zero` when the English canonical scene is `Zero apples are in the basket.`, or `Word: apple` when the English canonical scene is `The apple is in the bowl.` Agreement among target languages does not override the English canonical scene. For `ZH` and `JA`, draft examples also block on artificial CJK token spaces such as `准备 蔬菜。` or `野菜を 準備する。`; use normal target-script spacing before import. For `TH`, `KM` and `LO`, draft examples block on generated word-segmentation spaces in short clauses such as `เตรียม ผัก.`, `រៀបចំ បន្លែ។` or `ກຽມ ຜັກ.`; use natural clauses such as `เตรียมผัก.`, `រៀបចំបន្លែ។` and `ກຽມຜັກ.`. For `MY`, simple imperative/action scenes block if the example is changed into a `ရန်` purpose/infinitive template instead of a natural action clause. Profile-specific drafts must include proof fields when the deck needs them: compound whole-meaning proof, action aspect/transitivity proof, time/calendar scope proof, food countability/container proof, document/admin register proof or health/safety specificity proof.

Ускоренный рабочий режим для текущей колоды: после каждого accepted language batch обновлять Postgres и запускать QA, но не пересобирать `.xlsx` / Google Sheets после каждого batch без отдельной просьбы. Для number-heavy decks после каждого one-language batch дополнительно учитывать number/example grammar risk: number + noun agreement, classifier/counter/linker and script consistency. Spreadsheet export пересобирается в конце покрытия всех 54 языковых вариантов или когда пользователю нужен промежуточный просмотр.

## Что именно собираем

Собираем не просто английские слова, а `meaning units`.

Примеры:

```text
table_home_furniture_01 = table as furniture
table_data_01 = table as data/spreadsheet structure
glass_drinkware_01 = glass as a drinking vessel
glass_material_01 = glass as a material
plant_living_organism_01 = plant as a living organism
plant_factory_01 = plant as a factory
```

Один английский surface word может иметь несколько `meaning_id`, если значения разные.

Каждый пример, который переводится или экспортируется, должен иметь контролируемую `semantic_scene`. Это не отдельный перевод и не длинное объяснение для пользователя, а внутренний QA-якорь:

```text
meaning_id -> meaning_note -> semantic_scene -> examples in active language variants
```

`semantic_scene` фиксирует, что именно должно сохраниться во всех языках. Единая schema v1:

```text
target_object
target_display
subject_number
action_or_state
state_or_location
tense_aspect
topic_context

optional:
actor
attributes
time
```

## Размер базы

Ориентир `5000` является рабочей гипотезой, не жестким обязательством.

Реальный размер может быть:

- меньше, если база покрывает пользовательские сценарии;
- больше, если нужны дополнительные уровни, темы и контекстные vocabulary-блоки;
- разбит на версии: v0, v1, v2.

Рекомендуемый план:

| Этап | Объем | Цель |
| --- | --- | --- |
| Pilot | 30-50 items | Проверить структуру, перевод, примеры, транскрипции, Google Sheets export. Для pilot допустим фиксированный небольшой объем. |
| v0 Core | 500-800 items | Базовые слова и функции: числа, цвета, базовые глаголы, местоимения, вопросительные слова, вежливость. |
| v1 Foundation | 1500-2500 items | Основные бытовые и жизненные domains. |
| v2 Expansion | 3000-5000+ items | Расширение тем, контекстные слова и vocabulary-only ситуационные блоки. |

## Размеры наборов

Не задаем жесткое правило "каждый набор по 50 слов".

Размер набора определяется полезным покрытием темы, а не одинаковым количеством строк. Нельзя добивать набор редкими или спорными словами только ради числа.

Рабочие диапазоны:

| Тип набора | Обычно | Когда меньше нормально | Когда больше нормально |
| --- | --- | --- | --- |
| Narrow vocabulary category | 20-60 meaning units | Узкая тема реально содержит мало частотных слов. | Тема естественно широкая и все items полезны. |
| Broad vocabulary area | 60-150 meaning units | Area разбита на несколько narrow categories. | Area используется как обзорный набор. |
| Core foundation block | 25-100 items | Блок маленький: yes/no, colors, basic pronouns. | Блок широкий: verbs, time, prepositions. |

Для финальных тематических листов предпочтительны проверяемые размеры: лучше 32 сильных item, чем 50 с добивкой слабой лексикой.

Количество строк в deck export определяется активными `meaning_set_memberships` конкретной колоды, а не общим количеством слов в базе по языку. Если в Postgres есть больше 50 language entries для языка, но их `meaning_id` не входят в текущий `set_id`, они не попадают в workbook. Если активная колода сама содержит больше строк, чем `target_item_count_max`, export/QA должен остановиться до изменения target range или scope.

Для каждого набора нужно фиксировать:

```text
target_item_count_min
target_item_count_max
actual_item_count
selection_status
```

`target_item_count_min/max` - ориентир, а не обязанность добрать любой ценой. Если качественных слов меньше, нужно уменьшить target range или объединить тему с соседней.

## Content selection policy

Порядок отбора meaning units в набор:

1. Определить точный scope: domain, area, category или situation.
2. Собрать candidate pool больше финального набора.
3. Исключить слова вне темы, слишком редкие, региональные, спорные или плохо переводимые без длинного пояснения.
4. Разделить многозначные слова на разные `meaning_id`.
5. Назначить `level`, `frequency_band`, `priority_band`.
6. Сбалансировать набор по полезности и естественности, не по фиксированному числу строк.
7. Проверить через QA и ручной review.

For future decks, candidate selection is no longer only prose in the deck spec. Before a deck can move to `approved_for_generation`, compile a machine-readable candidate pool:

```bash
node scripts/compile-deck-candidate-pool.mjs <Sort|set_id> <candidate-input.jsonl|csv>
node scripts/check-deck-candidate-pool.mjs <Sort|set_id>
node scripts/check-word-selection-quality.mjs <Sort|set_id>
node scripts/check-deck-ready.mjs <Sort|set_id>
```

The compiler writes `outputs/candidate-pools/<set_id>_candidate_pool.jsonl` and a short summary. Each row records `canonical_english`, POS, domain, level/CEFR, frequency/priority, include/exclude match, duplicate risk, existing `meaning_id` if any, source support, translation coverage risk, example feasibility, score and `decision=selected|backup|excluded`. The pool must normally be at least 2x the target max; exceptions need `pool_size_exception_reason`. Selected rows must fit the target range, selected generated-deck duplicates must be explicit `meaning_id` reuse, and excluded rows must say where they belong instead.

`check-word-selection-quality` is the semantic pre-approval gate for selected rows. It blocks selected items that are weak for the deck even if the JSONL shape is valid: unresolved duplicate/scope decisions, low selection score, missing or vague `meaning_note`, generic examples such as `This is...` / `I need to...` / `Number: ...`, ambiguous surfaces like `file`, `folder`, `mouse`, `tape`, `speaker`, `monitor`, `form` without explicit sense disambiguation, and multiword entries without non-low `compound_multiword_risk`. Warnings are allowed for non-blocking balance concerns; blockers must be fixed before `approved_for_generation`. Closed-set/profiled decks such as `number_quantity` are allowed to be intentionally category-dominant; they still must prove row-level scope, example feasibility, duplicate/reuse decisions and compound/whole-meaning risk.

Recommended prompt for collecting words for a new deck:

```text
Prepare a machine-readable candidate pool for Deck <deck name>, Sort <sort>, set_id <set_id>.
Use only the documented deck scope. Build a pool at least 2x the target max.
Return JSONL rows with selected/backup/excluded decisions.

For every selected row include:
- canonical_english, part_of_speech, domain, level, cefr, frequency_band, priority_band;
- include_rule_matched and exclude_rule_hit;
- duplicate_risk, existing_meaning_id if exact reuse is required, duplicate_reuse_decision;
- meaning_note with the exact intended sense;
- english_with_article;
- current_context_example_en: 4-14 words, one simple object/action/state/location, no generic template;
- source_support and translation_coverage_risk / translation_risk;
- scope_decision, compound_multiword_risk, required_qa_profile;
- selected_meaning_id and display_order.

Rules:
- do not pad the deck with rare words just to hit a round number;
- split ambiguous English surface words into exact senses or exclude them;
- mark compounds/multiword items with whole-meaning risk;
- excluded rows must include move_target and a reason;
- examples must be canonical scenes that all 54 languages can preserve naturally.
```

Historical generated decks whose original candidate pools were not preserved may have selected-only retrospective audit files. Those files are useful for confidence and documentation, but they do not weaken the rule for new decks: new `approved_for_generation` decks still need a real pre-generation candidate pool with selected/backup/excluded decision trail.

Перед созданием новых `meaning_units` нужно запускать reuse-plan against existing base:

```bash
node scripts/generate-meaning-reuse-plan.mjs <candidate-file.csv|jsonl> --set-id=<set_id>
```

Candidate file должен содержать минимум `canonical_english`, `part_of_speech`, `meaning_note`; для безопасного automatic membership apply нужен explicit existing `meaning_id` или exact fingerprint match. Surface-only совпадение английского слова не считается reuse. Это специально защищает пары вроде `table` = мебель / `table` = таблица.

Критерии включения:

- слово или фраза реально нужна в выбранной теме;
- значение можно объяснить коротким `meaning_note`;
- можно дать простой контролируемый пример;
- перевод на 54 активных языковых варианта не требует смены смысла;
- item не дублирует уже выбранный meaning unit внутри той же колоды без причины;
- cross-deck duplicate is allowed when it makes a deck self-contained for independent study, but it must reuse the existing `meaning_id` when the sense is identical and must record an explicit `duplicate_reuse_decision`;
- item имеет понятный `priority_band`.

Post-reset policy note: Sort 1-9 were originally selected under a stricter no-cross-deck-duplicate habit. The audit `outputs/review/duplicate_excluded_essentials_sort_1_9_20260513.md` records which old exclusions are harmless scope moves and which are useful retrofit candidates. Historical generated decks stay production-ready until a deliberate retrofit is run; expanding a generated deck changes card count and requires the full runner/QA/export/readback/audit/freshness loop. A retrofit may carry over unchanged examples/translations only for an explicit same-`meaning_id` reuse row and only after fresh target-keyed semantic scene proof is imported for the new deck.

Для place/object vocabulary decks candidate pool собирается по видимой учебной зоне: место, полка, витрина, комната, транспортная зона, учебная зона или everyday category. Например, `Airport & Flight Objects`, `School Supplies`, `Fruit Basics`, `Cinema Basics`, `Cafe Food & Table Items`. Нельзя добавлять туда фразы, жалобы или сценарии только потому, что они происходят в том же месте.

Критерии исключения или переноса:

- item относится к соседней категории;
- item слишком редкий для текущего уровня набора;
- item культурно или регионально узкий без причины;
- item требует длинного объяснения вместо простой карточки;
- item является готовой репликой, а не словом; такие items сейчас не генерируются и должны быть отложены или преобразованы в vocabulary-only item.

## Split broad topics by level and frequency

Широкие темы нельзя превращать в одну смешанную колоду.

Перед генерацией большой темы нужно решить, какие подколоды нужны:

```text
topic -> basic high-frequency deck -> narrower common decks -> situation vocabulary decks -> advanced/specialized decks
```

Например, `Food Basics` - это не вся еда. В него попадают high-frequency / core items вроде `bread`, `milk`, `eggs`, `water`, `rice`. Более редкие или специализированные items вроде `lobster`, `octopus`, `mussels` переносятся в `Advanced Foods & Seafood` или другую узкую колоду с более высоким `level_label` / `frequency_band`.

Для каждой подколоды обязательно:

- `level_min` / `level_max`;
- `level_label`;
- localized `Description` с exact DB-backed `level_signal`;
- правила включения и исключения;
- target range;
- ожидаемые `frequency_band` / `priority_band`.

## Порядок набора

Этот документ описывает принципы build process, но не задает исполняемую очередь колод. Единственный operational order, integer `Sort`, deck statuses and next backlog живут в [Deck Master Plan](deck-master-plan.md).

Domain-level priority is explanatory only:

- сначала reusable foundation и high-utility everyday domains;
- затем service/problem words for health, money, documents, shopping, travel and safety;
- затем work/study, technology, leisure, social life, nature/weather and advanced expansions;
- не создавать broad mixed-bag decks, даже если domain выглядит важным.

Ready-sentence and multi-turn blocks не добавлять в текущем production/export режиме. Если ситуация важна, делать vocabulary-only deck: объекты, опции, действия, признаки и короткие lexical items.

[Content Roadmap](product-content-roadmap.md) объясняет контентную лестницу внутри тем, а точная operational queue закреплена только в [Deck Master Plan](deck-master-plan.md). Для каждой большой темы применяется vocabulary-only лестница `Basics -> Actions / Everyday Use Words -> Situation Words -> Expansion`, но не нужно искусственно создавать все CEFR-ступени для каждой темы.

## Обязательные metadata-поля для meaning unit

Каждый meaning unit должен иметь:

```text
meaning_id
canonical_english
english_with_article
part_of_speech
meaning_note
default_domain
default_area
default_category
level
frequency_band
priority_band
concreteness
countability
plural_form_en
tags[]
set_memberships[]
base_example_en
context_examples[]
semantic_scene
quality_status
```

## Что означают metadata-поля

| Поле | Зачем нужно |
| --- | --- |
| `meaning_id` | Уникальный смысл, а не просто английское слово. |
| `canonical_english` | Базовое английское слово или фраза. |
| `english_with_article` | Английская learner-facing display form: для countable singular nouns `a/an + noun`, для verbs `to + base verb`, для других POS base form без искусственного артикля. |
| `part_of_speech` | noun, verb, adjective, adverb, preposition, phrase, etc. |
| `meaning_note` | Короткое уточнение смысла, чтобы не перепутать перевод. |
| `default_domain/area/category` | Основной учебный контекст. |
| `level` | Официальный CEFR-уровень: A1, A2, B1, B2, C1, C2. |
| `frequency_band` | core, common, useful, advanced. |
| `priority_band` | Продуктовая важность для очередности набора: survival, core, common, useful, advanced. |
| `concreteness` | concrete, abstract, functional. |
| `countability` | countable, uncountable, both, not_applicable. |
| `plural_form_en` | Нужен для существительных и примеров. |
| `tags[]` | Цвет, еда, действие, дом, техника, вежливость и т.д. |
| `set_memberships[]` | В какие наборы входит meaning unit. |
| `base_example_en` | Очень простой общий пример. |
| `context_examples[]` | Простые примеры для конкретных наборов. |
| `semantic_scene` | Внутренний смысловой якорь примера по schema v1: `target_object`, `target_display`, `subject_number`, `action_or_state`, `state_or_location`, `tense_aspect`, `topic_context`; optional `actor`, `attributes`, `time`. |
| `quality_status` | draft, generated, generated_checked, needs_review, approved, blocked. |

## Дополнительные поля по части речи

### Nouns

```text
countability
plural_form_en
requires_article
semantic_class
```

Примеры `semantic_class`: object, place, person, food, material, body_part.

### Verbs

```text
verb_pattern
transitivity
irregular_forms_en
```

Примеры:

```text
to open
open something
go to a place
look at something
```

### Adjectives

```text
gradable
opposite_meaning_id
semantic_scale
```

Примеры `semantic_scale`: size, color, temperature, quality, emotion.

### Adverbs

```text
adverb_type
position_note
```

Примеры `adverb_type`: time, frequency, manner, place, degree.

### Out-of-scope non-vocabulary fields

```text
canonical_intent
register
formality
situation
```

Эти поля не входят в текущую генерацию карточек. Если ситуация важна, нужно извлечь из нее vocabulary-only items.

## Уровни сложности

Используем официальную CEFR-шкалу:

| Level | Смысл |
| --- | --- |
| A1 | Бытовая база и простые повседневные действия. |
| A2 | Расширенный быт, путешествия, работа, здоровье. |
| B1 | Более точные, абстрактные или ситуационно сложные слова. |
| B2 | Уверенное самостоятельное использование, более точная лексика и ситуации. |
| C1 | Продвинутая точность, регистр, нюансы и специализированные темы. |
| C2 | Почти нативная точность, редкие значения, стилистика и сложные тексты. |

`A0` не используем в данных как уровень. Если позже понадобится отдельный "starter/pre-A1" слой карточек, его нужно вводить отдельным полем, а не смешивать с CEFR.

Уровень не должен быть единственным критерием. Редкое, но жизненно важное слово может попасть в ранний набор, если оно нужно в сценарии.

## Content Priority

`priority_band` отделяет практическую важность карточки от CEFR и частотности.

CEFR отвечает за языковую сложность. `frequency_band` отвечает за частотность/общую употребительность. `priority_band` отвечает за то, насколько рано item нужен в карточном плане.

Разрешенные значения:

| priority_band | Смысл |
| --- | --- |
| `survival` | Жизненно важные слова и фразы: помощь, боль, документы, безопасность, туалет, оплата, связь. Могут идти рано даже при неидеальном CEFR. |
| `core` | Фундаментальные слова и функции, нужные почти всем пользователям. |
| `common` | Частая бытовая и повседневная лексика. |
| `useful` | Практичная, но более тематическая или менее срочная лексика. |
| `advanced` | Нюансная, специализированная, редкая или поздняя лексика. |

Правило: нельзя повышать или понижать CEFR только из-за практической важности. Для этого используется `priority_band`.

## Примеры

Примеры должны быть:

- короткими;
- грамматически простыми;
- без идиом;
- без лишних деталей;
- одинаковыми по смыслу во всех языках;
- привязанными к нужному контексту.

Для одного meaning unit можно хранить:

```text
base_example_en
context_examples[]
semantic_scene
```

Пример:

```text
meaning_id: open_action_01
base_example_en: Open the box.
home_example_en: Open the door.
technology_example_en: Open the app.
travel_example_en: Open your suitcase.
```

`semantic_scene` обязателен для каждого base/context example перед переводом на активные языковые варианты. `base_example_en` может оставаться короткой рабочей подсказкой, но пример нельзя переводить или экспортировать, пока для него не зафиксирована сцена. Если пример нельзя описать короткой сценой, он слишком сложный для vocabulary card и должен быть упрощен или отложен, а не превращен в готовую фразу.

Default generation policy for examples: controlled simple examples first. A vocabulary example should prove the card meaning with the smallest natural scene, not showcase grammar. For normal noun/object decks use one object plus one simple state/action/location, singular by default. For action decks use one concrete object when the verb requires one. For number/quantity, time/calendar, document/admin, health/safety and other profile-risk decks, do not add extra grammar beyond what the profile needs. Variety is useful only after the scene remains easy to prove; repeated weak templates are still blocked, but "interesting" examples must not introduce avoidable gender, case, classifier, tense or countability ambiguity.

## QA-подход

Каждый batch должен проходить:

1. Проверку смысла и контекста.
2. Проверку дублей `meaning_id`.
3. Проверку части речи.
4. Проверку примеров.
5. Проверку артиклей/рода/грамматических маркеров.
6. Проверку единого поля `transcription`.
7. Отдельную маркировку спорных языков `needs_review`.

Подробный QA-контур, gate criteria, ручные review-решения и текущие автоматические проверки ведутся в [QA Process](qa-process.md). Language-specific display/register/classifier/case traps ведутся в [Language Specific Rules](language-specific-rules.md). Если список QA-gates или смысл статусов меняется, обновлять нужно оба документа и [Decision Log](decision-log.md).

Так как живых проверяльщиков по всем языкам нет, массовые переводы нельзя помечать `approved` только потому, что они прошли генерацию. Агент делает несколько QA-проходов сам и при сомнениях сверяется с проверенными источниками. Raw output остается `generated`; после обязательных AI/source-backed QA gates без найденных ошибок строка может стать `generated_checked` только с matching structured `qa_reviews` evidence: exact target identity, `reviewer`, `reviewed_at`, `check_family`, `result_summary` and `pass_id` or `batch_id`. Для set memberships требуется deck-scoped `word_selection_quality` evidence keyed to `set_id::meaning_id`; для translated examples evidence must be keyed to the exact `set_id::meaning_id::example_id` and include both `check_family=semantic_preservation` with `pass_id=semantic_preservation_...` and `check_family=target_example_naturalness` with `pass_id=target_example_naturalness_...`; сомнительные строки получают `needs_review`.

## Рабочая база

Так как Docker доступен, предпочтительный рабочий вариант - Postgres.

Postgres использовать как внутреннюю рабочую базу для:

- core meaning units;
- language entries;
- set memberships;
- examples;
- QA statuses;
- exports to Google Sheets.

Google Sheets остается финальным deliverable, а не единственным source of truth.

Текущая schema v0 подготовлена в:

```text
db/migrations/001_initial_schema.sql
db/migrations/002_official_cefr_levels.sql
db/migrations/003_content_priority_band.sql
db/migrations/004_single_display_transcription.sql
db/migrations/005_content_set_deck_metadata.sql
db/migrations/006_content_set_level_label.sql
db/migrations/007_content_set_localizations.sql
db/migrations/008_generated_checked_and_level_signal.sql
db/migrations/009_structured_qa_evidence.sql
db/migrations/010_language_spreadsheet_code.sql
db/migrations/011_vocabulary_only_contract.sql
db/seeds/001_languages.sql
db/seeds/002_pilot_home_kitchen_cookware_en.sql
db/seeds/003_pilot_home_kitchen_cookware_ru.sql
db/seeds/004_pilot_home_kitchen_cookware_en_ipa.sql
db/seeds/005_pilot_home_kitchen_cookware_course_metadata.sql
docker-compose.yml
scripts/db-apply.sh
scripts/db-check-pilot.sh
scripts/db-check-pilot-ru.sh
scripts/db-qa-set.sh
scripts/db-qa-pilot.sh
scripts/check-deck-specs.mjs
scripts/check-deck-ready.mjs
scripts/check-qa-evidence.mjs
scripts/run-ai-qa.mjs
scripts/import-ai-qa-results.mjs
scripts/import-deck-base-data.mjs
scripts/import-language-batch.mjs
scripts/export-semantic-qa-batch.mjs
scripts/import-semantic-qa-results.mjs
scripts/export-review-decisions-template.mjs
scripts/import-review-decisions.mjs
scripts/export-pilot-ru-review.mjs
scripts/export-flashcards-working-sheet.mjs
```

Подробности ведутся в [Database Schema](database-schema.md). Локальный Docker/Postgres workflow добавлен; внешний `DATABASE_URL` остается возможным.

## Текущий pilot

Pilot 1 описан в [Pilot Content](pilot-content.md).

Кратко:

```text
set_id: home_kitchen_cookware_pilot_01
scope: Home / Kitchen / Cookware, Utensils & Tableware
count: 50 meaning units
language scope: `EN` / English (US) canonical base with IPA + active target language layers
language progress: all 54 active language variants populated and checked in Postgres
status: full active-language translation complete in Postgres; final workbook export generated
```

Gate 2 не включает массовые переводы. Gate 3 идет языковыми batch: RU first target language, затем `ES/FR/ZH`, затем `DE/IT/PT/JA/KO/VI`; следующие языки добавлять batch по 3 языка с QA после каждого batch. Для скорости текущей колоды workbook/Google Sheets не пересобирать после каждого batch; пересобрать в конце или по отдельной просьбе.

## Не делать

- Не начинать массовый перевод 5000 слов на 54 активных языковых варианта без пилота.
- Не собирать просто список английских слов без `meaning_note`.
- Не создавать отдельный `meaning_id` для повторения слова в другой теме.
- Не смешивать разные значения одного английского слова.
- Не считать машинно сгенерированный перевод `approved`.
