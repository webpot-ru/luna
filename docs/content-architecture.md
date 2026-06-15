# Content Architecture

Этот документ является source of truth по общему контуру учебного контента LunaCards.

Он отвечает за то, какие типы наборов существуют, как они связаны между собой и почему английский используется как базовый язык для генерации.

## Базовый принцип

`EN` используется как canonical base для первичного создания контента. `EN` означает American English / US default:

- проще проектировать единый список смыслов;
- проще контролировать дубли;
- проще проверять, что 54 активных языковых варианта переводятся от одного и того же смысла;
- проще строить нейтральные примеры и ситуации.

После генерации карточки не должны быть привязаны только к паре `English -> target language`. В текущем vocabulary-only режиме все языковые версии относятся к одному `meaning_id`, поэтому их можно использовать между любыми языковыми парами.

## Meaning-first localization

LunaCards не строит отдельные попарные базы переводов между всеми языками и языковыми вариантами.

Рабочая модель:

```text
meaning_id -> canonical English meaning -> semantic_scene -> language-specific entry/example
```

Английский используется как проектный canonical base, но не как единственная ось карточек. Каждый язык локализуется к общей смысловой единице. После этого любые пары языков собираются через общий `meaning_id`.

Это означает:

- нельзя переводить только surface word без смысла;
- нельзя создавать отдельную независимую базу для каждой языковой пары;
- каждый `meaning_id` должен описывать один смысл;
- каждый пример должен опираться на общую `semantic_scene`;
- language-specific example может звучать естественно, но не должен менять сцену.

Пример:

```text
meaning_id: run_habit_exercise
canonical_english: run
semantic_scene:
  actor: female singular
  action: run as habit/exercise
  time: every morning
  tense_aspect: present habitual

EN: She runs every morning.
RU: Она бегает каждое утро.
DE: Sie läuft jeden Morgen.
FR: Elle court tous les matins.
```

Если другой язык требует другое базовое слово для другого смысла, это не вариант перевода той же строки, а отдельный `meaning_id`.

## Meaning-first reuse / translation memory

Переиспользование переводов строится только от смысла, а не от одинакового английского написания. Translation memory в LunaCards - это существующие `meaning_units` + `meaning_language_entries`, привязанные к конкретному `meaning_id`.

Правило:

- если `meaning_id` совпадает, проверенный перевод можно переиспользовать в новой membership/колоде с учетом нового context example;
- если совпадает только surface word, но значение другое, нужен отдельный `meaning_id`;
- если есть сомнение, сначала создается candidate decision, а не автоматический reuse;
- автоматический reuse не переносит translated examples между колодами, потому что context example имеет свой `example_id` и свой `semantic_scene`;
- `canonical_english` не является уникальным ключом; безопасный reuse работает только по exact fingerprint, который включает `canonical_english`, part of speech, `meaning_note` and taxonomy context;
- explicit `meaning_id` reuse безопасен только при полном совпадении fingerprint: `canonical_english`, POS, `meaning_note`, domain, area and category;
- если explicit `meaning_id` совпал только по `canonical_english` + POS, decision is `needs_review_explicit_partial_match`, not auto-apply;
- translated examples never copy between decks, even when the same `meaning_id` is reused; each deck/context example needs its own example translation and semantic QA.

Пример:

```text
table_furniture -> a table -> стол
table_data      -> a table -> таблица
```

Исполняемый fail-closed инструмент для этого слоя:

```bash
node scripts/generate-meaning-reuse-plan.mjs candidates.csv --set-id=<set_id>
node scripts/generate-meaning-reuse-plan.mjs candidates.csv --set-id=<set_id> --apply-safe
```

Без `--apply-safe` скрипт только создает report в `outputs/reuse/`. С `--apply-safe` он может добавить safe memberships в `meaning_set_memberships`, но только для explicit `meaning_id` with exact full fingerprint or exact fingerprint match. Explicit partial matches get `needs_review_explicit_partial_match`; surface-only matches получают `needs_review_surface_match` / `blocked_ambiguous_surface_word` and are not applied.

Дополнительный guard: `--apply-safe` не применяет строки, если они создают `display_order` conflict внутри колоды.

## Типы карточных наборов

Текущий production-режим для Google Sheets/card export: vocabulary-only.

| Тип | Назначение | Основная единица |
| --- | --- | --- |
| Vocabulary Topic Deck | Тематические слова и короткие словосочетания. | `meaning_id` |
| Core Foundation Set | Базовая лексика, которая нужна почти во всех темах. | `meaning_id` |

Готовые реплики, многострочные сценарии и смешанные наборы не входят в текущий проект создания карточек.

## Как выбирать тип набора

Выбор типа контента должен быть явным до генерации:

- если пользователь должен запомнить отдельное слово, предмет, действие, признак или короткое устойчивое словосочетание, это `Vocabulary Topic Deck`;
- если элемент нужен почти во всех темах, он может входить в `Core Foundation Set` и одновременно появляться в тематических memberships;
- готовые реплики и многострочные сценарии не генерируются как карточки; если ситуация важна, из нее извлекаются отдельные слова и короткие lexical items.

Для vocabulary нельзя превращать пример в скрытую готовую реплику. Пример остается только примером использования слова.

## Content Progression

Типы контента собираются не изолированно, а в контентную лестницу внутри темы:

```text
quick-win Basics -> Actions / Everyday Use Words -> Problem/Service Words -> deeper expansion
```

Подробный source of truth по этой лестнице и приоритету тем ведется в [Content Roadmap](product-content-roadmap.md).

## Vocabulary Topic Decks

Это обычные карточки со словами: предметы, действия, признаки, места, люди, бытовые понятия.

Пример:

```text
content_type: vocabulary
meaning_id: kitchen_table_01
domain: Home
area: Kitchen
category: Cookware, Utensils & Tableware
canonical_english: table
```

Правила:

- одно значение должно иметь один canonical `meaning_id`;
- если слово встречается в нескольких наборах, не создавать новый перевод, а добавлять membership в другой набор;
- пересечения между наборами допустимы, если они полезны пользователю;
- примеры должны соответствовать выбранной теме.

Spreadsheet rows use deck-scoped `card_key = set_id::meaning_id`. The shared `meaning_id` remains available inside the working base as the semantic key. What happens inside the existing service after it receives the spreadsheet is outside this card-generation project.

## Learner-Facing Deck Grouping

Обычные flashcard-наборы должны быть психологически простыми для изучения. Для vocabulary это обычно значит один ясный принцип группировки на колоду:

- часть речи или функция: `Basic Verbs`, `Adverbs of Time`, `Prepositions`;
- закрытая учебная группа: `Numbers & Counting`, `Colors & Shapes`;
- предметная зона: `Kitchenware Basics`, `Bathroom Essentials`, `Office Desk & Supplies`;
- место/полка/витрина/транспортная зона: `Airport & Flight Objects`, `Fruit Basics`, `Cinema Basics`, `School Supplies`;
- действие внутри темы: `Cooking Actions`, `Phone & App Actions`;
- люди/места/предметы внутри одного понятного domain.

Нельзя превращать vocabulary deck в смесь всего, что относится к жизненной ситуации. Например, bank/ATM контент нужно раскладывать на vocabulary-only decks: `Cash, Cards & Payments`, `Bank Accounts & Transfers`, `ATM & Card Problem Words`. Готовые жалобы и вопросы к сотруднику сейчас не генерируются как отдельные карточки.

Правильное разделение:

```text
Bank & ATM Basics        -> vocabulary: bank, card, cash, ATM
ATM & Card Problem Words -> vocabulary: error, PIN, receipt, refund
Opening an Account Words -> vocabulary: account, document, signature
```

Такой же принцип для аренды, медицины, школы, машины, рынка, аэропорта, кафе, кино и других направлений. Benchmark задает важные жизненные domains, но не отменяет чистые learner-facing flashcard decks.

## Level And Frequency Split Inside Large Topics

Большая тема не означает одну огромную колоду. Если тема широкая, она обязательно разбивается на подколоды по:

- learner-facing scope;
- уровню `level_label`;
- CEFR `level_min` / `level_max`;
- `frequency_band`;
- `priority_band`.

Пример для еды:

```text
Food Basics            -> bread, milk, eggs, water, rice
Drink Basics           -> water, coffee, tea, juice, milk
Coffee & Espresso      -> espresso, latte, cappuccino, iced coffee
Juices & Smoothies     -> orange juice, smoothie, lemonade
Fast Food Basics       -> burger, fries, cola, tray, straw
Takeaway & Dine-In     -> takeaway, dine-in, counter, tray, receipt
Alcoholic Drinks       -> beer, wine, cocktail, cider
Fruit Basics           -> apple, banana, grapes, pineapple
Vegetable Basics       -> tomato, potato, cucumber, carrot
Meat & Seafood         -> chicken, beef, fish, shrimp
Advanced Seafood       -> lobster, octopus, mussels
Restaurant Words       -> restaurant vocabulary, not ready phrases
```

Редкие или менее частые слова не попадают в `Food Basics` только потому, что они относятся к food. Они переносятся в более позднюю, более узкую или более advanced колоду. В описании каждой колоды указывается localized level-сигнал, например `Basic level` / `Базовый уровень`; в `Deck Metadata` дополнительно фиксируется `level_label`, а в `Card Metadata` - row-level `level`, `frequency_band`, `priority_band`.

## Situational Vocabulary

Если ситуация важна, она превращается в vocabulary-only deck:

- restaurant situation -> restaurant words, table items, menu words, problem words;
- hotel situation -> reservation, passport, key, room, reception;
- pharmacy situation -> medicine, dose, prescription, pharmacist;
- fast-food situation -> takeaway, dine-in, sauce, cutlery, lid.

Многострочные сценарии и готовые реплики не создаются как карточки. Если такой материал указывает на полезную лексику, она выносится в обычную vocabulary-колоду.

## Core Foundation Set

Core Foundation Set должен покрывать слова и короткие lexical items, которые нужны почти везде:

- pronouns;
- question words;
- numbers;
- dates and time;
- colors;
- basic adjectives;
- common verbs;
- prepositions;
- people and family basics;
- yes/no/maybe;
- polite words;
- basic connectors.

Этот набор не заменяет тематические decks. Он нужен как быстрый старт и общий фундамент.

## Пересечения между наборами

Пересечения нормальны. Пользователь может встретить одно и то же слово в `Home`, `Travel`, `Shopping` и `Core Foundation`.

Но в данных нужно различать:

- саму смысловую единицу;
- членство этой единицы в наборах.

Рекомендуемая модель:

```text
meaning_id
set_memberships[]
tags[]
```

Нельзя создавать разные `meaning_id` только потому, что слово повторилось в другом наборе. Новый `meaning_id` нужен только при новом значении.

## Английский как база

Для генерации v0 базовым языком является `EN`: American English / US default.

Это значит:

- canonical word, phrase, intent and example проектируются сначала на английском;
- все языки переводятся от одного canonical meaning/intent;
- если английская фраза звучит странно, нужно менять canonical English, а не исправлять отдельные языки;
- после генерации карточки остаются language-pair agnostic.

## Минимальный набор документов

Общий контур:

- этот документ: типы контента и связи между ними;
- [Content Roadmap](product-content-roadmap.md): контентная последовательность наборов, level ladder and quick-win deck principles;
- [Content Build Plan](content-build-plan.md): план набора core meaning base, metadata and QA batching;
- [Card Taxonomy](card-taxonomy.md): тематические domains, areas и categories;
- [Card Content Model](card-content-model.md): структура карточек и языковых версий;
- [Language Specific Rules](language-specific-rules.md): display form, grammar/register/classifier traps and per-language QA guardrails;
- [Data Delivery Pipeline](data-delivery-pipeline.md): рабочее хранение и выдача в Google Sheets/spreadsheet-формате;
- [Database Schema](database-schema.md): Postgres-схема рабочей базы;
- [Language Transcription Policy](language-transcription-policy.md): языки, коды и единая card-facing `transcription` policy.
