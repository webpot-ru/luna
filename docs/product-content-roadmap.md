# Content Roadmap

Этот документ является source of truth по контентным принципам создания карточных наборов LunaCards: как раскладывать тему по уровням, как делать последовательность понятной для изучения и как не превращать широкие темы в mixed-bag колоды.

Он не задает точный порядок запуска колод. Exact operational order, integer `Sort`, deck statuses and generation readiness живут только в [Deck Master Plan](deck-master-plan.md).

Он объединяет:

- CEFR-уровни из [Content Build Plan](content-build-plan.md);
- domains / areas / categories из [Card Taxonomy](card-taxonomy.md);
- типы контента из [Content Architecture](content-architecture.md);
- правила Google Sheets delivery из [Data Delivery Pipeline](data-delivery-pipeline.md).

## Главная идея

Любая крупная тема не должна превращаться в один огромный набор слов.

Правильная модель:

```text
Theme -> quick-win deck -> next practical vocabulary deck -> situation words -> deeper expansion
```

Пользователь должен быстро пройти первый маленький полезный набор, почувствовать результат и естественно перейти к следующему.

Пример для кухни:

```text
Kitchenware Basics -> Cooking Actions -> Kitchen Storage & Cleaning -> Kitchen Small Tools & Supplies -> Recipes & Food Prep Words -> Restaurant / Grocery Words
```

Post-reset first route uses the same quick-win principle but keeps the early learner experience room-first: rebuild the kitchen path, then bathroom, bedroom, living room, dining room, entryway/furniture and nearby home-space decks before switching to Core Foundation decks such as numbers, colors and basic verbs. Exact `Sort` values remain in [Deck Master Plan](deck-master-plan.md).

## Уровни

В данных используются только официальные CEFR-уровни:

```text
A1, A2, B1, B2, C1, C2
```

`A0` и `A3` не используются.

CEFR - это учебная сложность, а не единственный принцип группировки карточек. В metadata можно использовать понятные названия вроде `Basics`, `Everyday Words`, `Restaurant Words`, `Problem Words`, но в данных item всё равно получает CEFR `level`.

## Универсальная лестница темы

Для каждой большой темы сначала проверяется, какие ступени реально нужны. Не нужно искусственно делать `B2/C1/C2` для каждой темы, если там нет полезного контента.

| Ступень | Обычно CEFR | Что внутри | Основной тип |
| --- | --- | --- | --- |
| Basics | A1 | Самые конкретные предметы, люди, места, простые признаки. | Vocabulary Topic Deck |
| Actions | A1-A2 | Частые действия, состояния, простые команды и бытовые глаголы. | Vocabulary Topic Deck |
| Everyday Use | A2 | Рутина, количества, места, бытовые сценарии как слова и короткие lexical items. | Vocabulary |
| Situations | B1 | Задачи, проблемы, выбор, причины как vocabulary-only problem/service words. | Vocabulary |
| Precision | B2 | Более точная лексика, сравнения, problem words, service words. | Vocabulary |
| Advanced Expansion | C1-C2 | Регистр, нюансы, идиомы, специализированная или редкая лексика. | Advanced Vocabulary Deck |

Обязательное правило: не каждая тема обязана пройти все ступени. Для большинства коммерчески полезных тем достаточно `Basics -> Actions/Everyday Use Words -> Situation Words`.

## Как применять к любой теме

Для новой темы порядок такой:

1. Найти domain / area / category в [Card Taxonomy](card-taxonomy.md).
2. Определить пользовательскую цель: зачем человеку эта тема.
3. Выбрать один понятный принцип группировки для первого vocabulary deck: часть речи, закрытая группа, предметная зона, действия внутри темы, people/places/items.
4. Создать первый quick-win vocabulary deck: обычно A1, 20-60 сильных items, без смешивания слов, проблем и длинных реплик.
5. Создать следующий естественный vocabulary deck: чаще всего отдельный actions, everyday use words, objects/options or problem words deck.
6. Готовые реплики и многострочные сценарии не генерировать; если ситуация важна, разложить ее на слова, опции и действия.
7. Решить, нужен ли B1/B2 expansion. Если нет - не создавать его искусственно.
8. Для каждого набора фиксировать target range, level_min/level_max, content type, title/description and quality status.

## Quick-win правило

Первый набор в теме должен быть:

- коротким и завершабельным;
- понятным по названию;
- полезным сразу;
- без редких слов ради количества;
- с простыми примерами;
- с естественным следующим шагом.

Плохой контур:

```text
Kitchen 500 words
```

Хороший контур:

```text
Kitchenware Basics
Cooking Actions
Kitchen Storage & Cleaning
Recipes & Food Prep
Grocery Shopping
Restaurant Words
```

## Naming

Названия наборов не должны быть только техническими CEFR labels.

Допустимо:

```text
Kitchenware Basics
Cooking Actions
Grocery Shopping Words
Restaurant Words
Work Social Words
Doctor Visit Words
```

Неудачно:

```text
Kitchen A1
Kitchen A2
Kitchen B1
Vocabulary 1
Words 2
```

CEFR должен храниться в metadata, но пользователь в первую очередь видит тему и пользу.

## Current Mode: Vocabulary Only

Current production work creates vocabulary cards only.

Do not generate ready-phrase, multi-turn, or mixed decks. Old names from research notes must be converted into vocabulary-only specs before generation or left out.

Examples:

```text
fast-food situation -> Takeaway & Dine-In Words: takeaway, dine-in, tray, counter, receipt
restaurant situation -> Restaurant Words: menu, bill, waiter, table, reservation
Directions -> Direction Words: left, right, straight, corner, crossing
```

## Content Priority vs CEFR

CEFR отвечает за языковую сложность.

`priority_band` отвечает за то, насколько рано item нужен пользователю.

Например, emergency phrase может быть не идеальной A1-структурой, но всё равно попасть рано через `priority_band = survival`.

Нельзя понижать CEFR только потому, что слово важно. Для этого есть `priority_band`.

## Пересечения

Пересечения между наборами нормальны.

Один смысл хранится один раз:

```text
meaning_id
```

Разные наборы используют его через:

```text
set_memberships[]
```

Пример:

```text
knife_tool_kitchen_01
```

может входить в:

```text
Kitchenware Basics
Cooking Actions
Restaurant Table Items
```

Но если смысл другой, создается отдельный `meaning_id`.

## Content Priority Principles

Для практической пользы не надо начинать с полного энциклопедического покрытия языка. Сначала нужны темы, которые дают быстрый реальный результат в карточках.

Этот раздел объясняет content logic, но не задает operational order. Единственный исполняемый порядок колод, `Sort` values and deck statuses живут в [Deck Master Plan](deck-master-plan.md).

Content priorities for deck planning:

- Core Foundation для переиспользуемых слов: числа, цвета, вопросительные слова, базовые глаголы.
- High-utility everyday domains: home, food, city/transport, shopping, health, travel, money/documents.
- Practical service/problem words: pharmacy, hospital, police, bank, rental, returns, transport problems.
- Expansion domains: work/study, technology, leisure, social life, nature/weather.

Pilot по Home/Kitchen остается технической проверкой pipeline. After the clean-start reset, the first production route is Home Rooms First, and the exact next step still comes from [Deck Master Plan](deck-master-plan.md), not from this explanatory priority list.

## Применение с Deck Master Plan

Этот roadmap не содержит рабочую очередь, `Sort` и статусы. Если нужно понять, какую колоду делать следующей, читать [Deck Master Plan](deck-master-plan.md).

Здесь остаются только контентные принципы:

- широкую тему дробить на короткие vocabulary-only колоды;
- начинать с quick-win basics, затем добавлять actions / everyday use / situation words;
- не добивать набор редкими словами ради количества;
- не создавать B2/C1 expansion, если для темы нет сильного learner-useful content;
- перед генерацией любой колоды фиксировать deck spec в [Deck Specs Registry](deck-specs/README.md).

Если будущая таблица в этом документе начнет задавать numbered `Sort` / `Step` order, это считается ошибкой документации. Exact operational order must remain only in [Deck Master Plan](deck-master-plan.md).

## Пример: Kitchen contour

Kitchen не является одним набором. Это цепочка:

| Deck | Level | Type | Пользовательская польза |
| --- | --- | --- | --- |
| Kitchenware Basics | A1 | Vocabulary | Узнать базовую посуду, приборы и кухонные предметы. |
| Cooking Actions | A1-A2 | Vocabulary | Понимать и говорить простые действия: cut, wash, boil, fry. |
| Kitchen Storage & Cleaning | A2 | Vocabulary | Хранение, уборка, губка, средство, посудомойка. |
| Kitchen Small Tools & Supplies | A2 | Vocabulary | Небольшие инструменты и расходники для подготовки: scale, timer, thermometer, funnel, shears, skewers, parchment paper. |
| Recipes & Food Prep Words | B1 | Vocabulary | Понимать простые рецепты и последовательность действий через ключевые слова. |
| Kitchen Problem Words | B1-B2 | Vocabulary | Назвать проблему или нужный предмет: плита, поломка, нож, салфетка. |

Если тема не набирает сильный B2/C1 контент, она заканчивается на B1/B2 без искусственного продолжения.

## Пример: Food & Eating contour

| Deck | Level | Type | Пользовательская польза |
| --- | --- | --- | --- |
| Food Basics | A1 | Vocabulary | Основные продукты и базовая еда. |
| Drink Basics | A1 | Vocabulary | Вода, кофе, чай, сок, молоко и частые напитки. |
| Coffee & Espresso Drinks | A2 | Vocabulary | Espresso, latte, cappuccino, iced coffee and common cafe coffee drinks. |
| Tea & Hot Drinks | A2 | Vocabulary | Tea, herbal tea, hot chocolate and common hot drinks. |
| Juices, Smoothies & Cold Drinks | A2 | Vocabulary | Juice, smoothie, lemonade, soda and common cold drinks. |
| Fast Food Basics | A1-A2 | Vocabulary | Burger, fries, cola, tray, straw and common fast-food items. |
| Sauces & Extras | A2 | Vocabulary | Sauce, ketchup, mustard, mayo, napkin, lid, straw, extra cheese. |
| Takeaway & Dine-In Words | A2 | Vocabulary | Takeaway, dine-in, tray, counter, receipt, cutlery, lid. |
| Alcoholic Drinks Basics | A2-B1 | Vocabulary | Beer, wine, cocktail, cider and common adult drink words. |
| Bar & Alcohol Words | A2-B1 | Vocabulary | Bar, pub, glass, bottle, non-alcoholic, alcohol-free. |
| Basic Ingredients & Spices | A1-A2 | Vocabulary | Salt, sugar, oil, flour, pepper, vinegar, spices. |
| Fruit Basics | A1 | Vocabulary | Частые фрукты без редкой добивки. |
| Vegetable Basics | A1 | Vocabulary | Частые овощи без смешивания с зеленью и редкими продуктами. |
| Herbs & Greens | A2 | Vocabulary | Зелень и травы: lettuce, dill, coriander, green onion. |
| Bakery & Pastry | A2 | Vocabulary | Хлеб, булочки, выпечка, торт, крем. |
| Sweets & Snacks | A1-A2 | Vocabulary | Шоколад, конфеты, попкорн, сладкие закуски. |
| Meat, Fish & Dairy | A2 | Vocabulary | Мясо, рыба, молочные продукты и частые белковые продукты. |
| Meals & Taste | A1-A2 | Vocabulary | Завтрак, обед, вкус, горячее/холодное, сладкое/соленое. |
| Cafe Food & Table Items | A2 | Vocabulary | Еда и предметы в кафе: soup, meat, napkin, chopsticks. |
| Tableware & Condiments | A1-A2 | Vocabulary | Ложка, вилка, нож, соль, перец и предметы на столе. |
| Cafe Drink Options | A2 | Vocabulary | Size, ice, milk, sugar, straw, lid, takeaway. |
| Grocery Shopping Words | A2 | Vocabulary | Cart, basket, checkout, price, kilo, receipt. |
| Market Shopping Words | A2 | Vocabulary | Stall, scale, fresh, ripe, kilo, cash. |
| Restaurant Words | A2 | Vocabulary | Menu, bill, waiter, table, reservation, tip. |
| Diets & Food Preferences | A2-B1 | Vocabulary | Vegan, vegetarian, allergy, gluten-free, sugar-free. |
| Advanced Foods & Seafood | B1-B2 | Vocabulary | Более редкие продукты: lobster, octopus, mussels, specialty food. |

`Food Basics` не должен включать все возможные продукты. В него входят только частые и early-useful items: bread, milk, eggs, water, rice. Менее частые продукты уходят в отдельные narrower или advanced decks.

## Пример: Travel contour

| Deck | Level | Type | Пользовательская польза |
| --- | --- | --- | --- |
| Travel Basics | A1 | Vocabulary | Билет, паспорт, отель, багаж, поезд, самолет. |
| Direction Words | A1-A2 | Vocabulary | Left, right, straight, corner, crossing, near. |
| Bus & Train Station Objects | A1-A2 | Vocabulary | Ticket, bus station, stop, station, platform, route. |
| Hotel Check-in Words | A2 | Vocabulary | Reservation, passport, key, room, reception. |
| Airport & Flight Objects | A1-A2 | Vocabulary | Билет, гейт, выход, эскалатор, траволатор, посадочный талон, багаж. |
| Airport & Baggage Words | A2-B1 | Vocabulary | Check-in, baggage claim, delay, boarding, gate. |
| Travel Problem Words | B1-B2 | Vocabulary | Cancellation, delay, lost luggage, refund, change. |

## Пример: School and Cinema object decks

Для практических тем можно делать чистые noun/object колоды; готовые реплики не входят в текущий export.

| Theme | First deck | Level | What belongs here | What moves out |
| --- | --- | --- | --- | --- |
| School / Study | School Supplies | A1 | notebook, pen, book, textbook | classroom requests |
| School / Study | School Tasks & Exercises | A1-A2 | assignment, exercise, homework, lesson | long classroom scenarios |
| Cinema | Cinema Basics | A1-A2 | theater, hall, screen, seat, ticket, popcorn, drink | buying tickets, complaints, movie discussion |

## Что должно быть у каждого deck

Каждый deck должен иметь:

```text
set_id
content_type
domain
area
category_or_situation
level_min
level_max
level_label
target_item_count_min
target_item_count_max
actual_item_count
title
description
learning_goal
next_recommended_set_ids[]
selection_status
quality_status
```

Эти поля должны храниться в рабочей базе на уровне `content_sets` и передаваться в Google Sheets на лист `Deck Metadata`. Обязательные поля блокируют экспорт, если они не заполнены. Для optional/non-blocking metadata экспорт должен явно показывать пустое значение или draft/status, а не прятать отсутствие поля.

`level_label` - обязательный уровень колоды в metadata. CEFR остается точной методической разметкой (`level_min` / `level_max`), а `level_label` нужен как стабильная короткая шкала уровня в файлах колод.

Фиксированная шкала уровней и совместимые CEFR ranges:

| `level_label` | Compatible CEFR range |
| --- | --- |
| `Basic` | `A1` |
| `Elementary` | `A1-A2` or `A2` |
| `Pre-Intermediate` | `A2-B1` or `B1` |
| `Intermediate` | `B1` or `B1-B2` |
| `Upper-Intermediate` | `B2` |
| `Advanced` | `B2-C1` or `C1` |
| `Proficiency` | `C2` |

`title` / `description` в `Course Metadata` должны отражать тему и пользу колоды. `Description` обязано содержать exact DB-backed `level_signal`, соответствующий `level_label`, например `Basic level`, `Базовый уровень` или естественный equivalent на целевом языке. `level_label` при этом хранится отдельно в `Deck Metadata`; текст в `Description` нужен человеку.

## Внешняя опора

CEFR используется как общий ориентир для уровней и curriculum design:

- Council of Europe CEFR: <https://www.coe.int/en/web/common-european-framework-reference-languages/uses-and-objectives>

Внешние источники ниже используются только как ориентиры по уровню, темам и practical language. Они не задают механику сервиса и не заменяют наши правила карточек.

- Busuu methodology: <https://www.busuu.com/en/it-works/busuu-methodology>
- Memrise real-world language learning: <https://www.memrise.com/>
