# LunaCards Documentation

Этот файл является единым входом в документацию проекта LunaCards.

Перед любой нетривиальной задачей нужно начинать отсюда: проверить существующие документы, найти source of truth по теме, убедиться, что будущие изменения не создают дубль и не противоречат уже принятым решениям.

## Документы

| Документ | Статус | За что отвечает |
| --- | --- | --- |
| [Project Workflow](project-workflow.md) | Source of truth | Рабочий порядок, правила обновления документации, согласование изменений. |
| [Decision Log](decision-log.md) | Source of truth | Принятые решения, открытые вопросы, gate-план и правила "не переделывать по кругу". |
| [Product Development Roadmap](product-development-roadmap.md) | Source of truth, product direction map | Верхнеуровневая карта развития LunaCards: ordinary decks, course/exam releases, source-assisted quality, future non-language flashcards and links to профильные source-of-truth документы. |
| [Content Architecture](content-architecture.md) | Source of truth | Общий контур учебного контента: текущий production/export режим vocabulary-only и английский canonical base. |
| [Deck Master Plan](deck-master-plan.md) | Source of truth, deck planning v1 | Главный рабочий план колод, порядок, статусы, запрет mixed-bag колод и обязательный pre-generation checklist. |
| [Deck Specs Registry](deck-specs/README.md) | Source of truth, deck spec registry | Физический registry deck specs: перед генерацией `spec_ready` / `approved_for_generation` / `generated` колоды обязаны иметь spec-файл. |
| [Content Roadmap](product-content-roadmap.md) | Source of truth | Контентные принципы группировки карточек: level ladder, quick-win decks, дробление широких тем and domain-priority logic. Exact operational order lives in Deck Master Plan. |
| [Course And Exam Release Roadmap](course-exam-release-roadmap.md) | Source of truth, course/exam planning v1 | Стратегическая карта course/exam release-линеек: English Core 3000, IELTS/TOEFL/TOEIC, HSK, JLPT, TOPIK, CEFR exams; фиксирует source vs benchmark and priority order. |
| [Course Source-Assisted Generation](course-source-assisted-generation.md) | Source of truth, course source/reuse layer v1 | Как будущие ordinary decks, HSK/Chinese releases, language courses and exam releases должны использовать translation-memory-first reuse maps, скачанные словари, корпуса, индексы and optional MT sanity without treating them as truth. |
| [Spanish A1 Core Release Plan](spanish-a1-core-release-plan.md) | Source of truth, Spanish A1 Parts 001-005 final/readback verified; Part 006 source package gate pass with partial Gemini cache, quota-blocked until 2026-06-13 | Отдельный контур LunaCards Spanish A1 Course Prep: PCIC/DELE/SIELE benchmark-only posture, ES/ES-419 source fields, local Spanish source stack, isolated `spanish_a1_*` DB storage, separate Spanish (Spain) / Latin American Spanish workbook contract, Spanish A1 broad learner IPA override, Google Sheet delivery and QA gates. |
| [Rare Language Source Hunt](rare-language-source-hunt.md) | Research backlog, weak-source language candidates v1 | Поисковый backlog для дополнительных словарей, корпусов, CLDF/wordnet/parallel-corpus leads по weak-source языкам; не заменяет `reference-sources/sources.manifest.json`. |
| [English Core 3000 Source Plan](english-core-3000-source-plan.md) | Source of truth, source acquisition draft | Безопасный source-acquisition контур для первого English Core 3000 release: NGSL/CEFR-J/internal curation, Oxford benchmark-only, snapshot/candidate-pool gates. |
| [Oxford Vocabulary Release Plan](oxford-vocabulary-release-plan.md) | Source of truth, Oxford 3000 Core complete; Oxford 5000 Advanced Extension complete; 150-word final Google Sheets readback verified; 150-workbook quality audit pass | Контур Oxford 3000/5000 для English vocabulary course: licensing target, source packages, final US/UK Google Sheets, current/next source packages, contracts, slicing, workbook shape, source posture, gates and Oxford-specific storage boundaries. |
| [Content Coverage Map](content-coverage-map.md) | Derived status map | Визуальная карта: что уже в pilot, что зафиксировано следующим, что есть в backlog, а какие domains пока остаются слабыми местами. |
| [External Content Benchmark](external-content-benchmark.md) | Research snapshot | Внешний benchmark по CEFR/ACTFL, конкурентам, travel/topic lists, exam themes и learner communities; фиксирует найденные gaps и candidate additions. |
| [Content Build Plan](content-build-plan.md) | Source of truth, planning v0 | План набора core meaning base, батчи, metadata-поля, уровни, QA и правило не переводить 5000×54 активных языковых вариантов одним проходом. |
| [Pilot Content](pilot-content.md) | Source of truth, pilot v1 | Текущие pilot-наборы, их seed-файлы, статусы, счетчики и QA перед переводом. |
| [QA Process](qa-process.md) | Source of truth | QA gates, статусы, автоматические проверки, ручные review-решения и критерии перехода между gates. |
| [Card Content Model](card-content-model.md) | Source of truth | Модель языковых карточек, переводы, примеры, артикли, транскрипция и контроль качества. |
| [Language Specific Rules](language-specific-rules.md) | Source of truth, v0 guardrails | Языковые особенности 54 активных языковых вариантов: display form, артикли/род, глаголы, register, classifiers and QA traps. |
| [Data Delivery Pipeline](data-delivery-pipeline.md) | Source of truth | Рабочее хранение, генерация и финальная выдача карточек в Google Sheets/spreadsheet-формате. |
| [Reference Sources](reference-sources.md) | Source of truth | Локальный контур внешних lexical/reference sources: downloaded dictionaries, licences, manifest, and rule that sources are candidate evidence only. |
| [HSK Classic Release Plan](hsk-classic-release-plan.md) | Source of truth, HSK release v1 | Отдельный контур HSK vocabulary release-файлов: classic HSK 2.0, один workbook на выпуск, buyer-facing first sheet starts with `ZH` / Chinese pinyin, 53 target-language translations, Chinese pinyin only and no target-language transcription/audio. |
| [HSK 3.0 Release Plan](hsk-3-release-plan.md) | Source of truth, HSK 3.0 Levels 1-6 complete/readback verified; corrected Level 6 v2 supersedes the earlier 1400-row snapshot; Level 7-9 source initialized locally | Отдельный контур нового HSK 3.0: official ChineseTest/PDF source, separate release ids, no mixing with classic HSK 2.0, Chinese-first buyer-facing workbook shape, complete Level 1/2/3/4/5 delivery snapshots, corrected full Level 6 v2 delivery/readback, Level 7-9 advanced source/reuse prep, Chinese gates, Classic reuse maps, target-language layers, five-row Course Metadata, isolated Docker/Postgres tables and separate Google Sheet readbacks. |
| [Cloud Automation](cloud-automation.md) | Source of truth | Перенос проекта в cloud-ready runtime, database backup/restore и fail-closed автоматизация генерации колод. |
| [Database Schema](database-schema.md) | Source of truth, schema v0 | Postgres-схема рабочей базы: languages, meaning units, entries, examples, sets, QA, batches and exports. |
| [Language Transcription Policy](language-transcription-policy.md) | Source of truth, display policy v1 | Список языков, коды и единый формат `transcription`, который показывается в карточке. |
| [Card Taxonomy](card-taxonomy.md) | Source of truth | Тематические domains, vocabulary-only situational domains, Home, Personal Life, Food & Eating, City & Transport, Shopping & Services, Money & Banking, Documents, Work & Study, Technology, Nature, Health, Travel, Leisure, Emergency taxonomy v0 и proposed additions. |
| [Video Lessons Strategy](video-lessons-strategy.md) | Source of truth | Стратегия создания, технические спецификации и дистрибуция видеоуроков для YouTube. |
| [Video Lessons Registry](video-lessons-registry.md) | Source of truth | Реестр сгенерированных видеоуроков и ссылок на YouTube. |
| [Grammar & Textbook Roadmap](grammar-roadmap.md) | Source of truth | Стратегический план и правила интеграции учебников грамматики (включая юридические правила именования). |
| [Windows Handover & Setup Spec](windows-handover-spec.md) | Operations Guide | Руководство по развертыванию проекта и продолжению сборки видеоуроков на Windows. |
| [Multi-Device Management Spec](multi-device-management.md) | Operations Guide | Руководство по настройке окружения на нескольких компьютерах и удаленному управлению сборкой видеоуроков через GitHub Actions. |
| [Project Skills](../project-skills/README.md) | Project-local agent workflow helpers | Reusable Codex skills for deck delivery, QA evidence, final linguistic audit, and external lexical-source workflows. They do not replace source-of-truth docs. |


## Текущий статус после reset

2026-05-02 пользователь выбрал начать заново. Локальная Postgres БД была предварительно сохранена в `outputs/db/lunacards_before_reset_20260502T211450_0700.sql`, затем очищена от рабочих content/QA/export/runtime данных. Схема, migrations, scripts, reference files, output artifacts and the `languages` reference table сохранены.

Текущее локальное состояние:

- активные/generated post-reset колоды в Postgres: `Kitchenware Basics` / `home_kitchen_cookware_pilot_01`, `Cooking Actions` / `home_kitchen_cooking_actions_a1_a2`, `Kitchen Storage & Cleaning` / `home_kitchen_storage_cleaning_a2`, `Kitchen Small Tools & Supplies` / `home_kitchen_small_tools_supplies_a2`, `Bathroom Essentials` / `home_bathroom_essentials_a1`, `Bedroom Basics` / `home_bedroom_basics_a1`, `Living Room Basics` / `home_living_room_basics_a1`, `Dining Room & Table Setup` / `home_dining_room_table_setup_a1_a2`, `Entryway & Outerwear` / `home_entryway_outerwear_a1`, `Furniture Basics` / `home_furniture_basics_a1`, `Laundry & Cleaning Basics` / `home_laundry_cleaning_basics_a1_a2`, `Home Office & Desk` / `home_office_desk_a1_a2`, `Home Structure & Exterior` / `home_structure_exterior_a1_a2`, `Apartment Building & Common Areas` / `home_apartment_common_areas_a2`, `Outdoor Home & Garden` / `home_outdoor_garden_a2`, `Numbers & Counting` / `core_numbers_counting_a1`, `Colors & Shapes` / `core_colors_shapes_a1`, `Pronouns & People Basics` / `core_pronouns_people_basics_a1`, `Question Words` / `core_question_words_a1`, `Basic Verbs` / `core_basic_verbs_a1_a2`, `Practical Action Verbs` / `core_practical_action_verbs_a1_a2`, `Time & Days` / `core_time_days_a1_a2`, `Learning Help Words` / `core_learning_help_words_a1_a2`, `Park & Playground` / `park_playground_a1_a2`, `Food Basics` / `food_basics_a1`, `Fruit Basics` / `food_fruit_basics_a1`, `Meat, Fish & Dairy` / `food_meat_fish_dairy_a2`, `Meals & Taste` / `food_meals_taste_a1_a2`, `Drink Basics` / `food_drink_basics_a1`, `Coffee & Espresso Drinks` / `food_coffee_espresso_drinks_a2`, `Tea & Hot Drinks` / `food_tea_hot_drinks_a2`, `Juices, Smoothies & Cold Drinks` / `food_juices_smoothies_cold_drinks_a2`, `Cafe Drink Options` / `food_cafe_drink_options_a2`, `Fast Food Basics` / `food_fast_food_basics_a1_a2`, `Sauces & Extras` / `food_sauces_extras_a2`, `Takeaway & Dine-In Words` / `food_takeaway_dine_in_words_a2`, `Alcoholic Drinks Basics` / `food_alcoholic_drinks_basics_a2_b1`, `Bar & Alcohol Words` / `food_bar_alcohol_words_a2_b1`;
- next deck state: Sort 39 `Basic Ingredients & Spices` is `planned`; it needs spec, candidate pool and user approval before generation;
- отсутствующие в Postgres и не считающиеся current coverage: no Sort 1-38 ordinary deck gaps after the 2026-06-12 `Bar & Alcohol Words` delivery;
- post-reset DB cleanup on 2026-05-06 removed the mistakenly retained historical `Kitchen Small Tools & Supplies` rows first; the deck was then rebuilt through the current runner and delivered as Google Sheet `1L4kOCdjAU0zkXieZgmaaGqtpy6fwi9A9bTnZZrNTVNw`, then retrofitted on 2026-05-13 to 32 cards by explicit Kitchenware meaning reuse;
- current Postgres row counts: Kitchenware Basics 50 cards / 2700 language rows, Cooking Actions 25 / 1350, Kitchen Storage & Cleaning 35 / 1890, Kitchen Small Tools & Supplies 32 / 1728, Bathroom Essentials 35 / 1890, Bedroom Basics 30 / 1620, Living Room Basics 30 / 1620, Dining Room & Table Setup 40 / 2160, Entryway & Outerwear 35 / 1890, Furniture Basics 30 / 1620, Laundry & Cleaning Basics 35 / 1890, Home Office & Desk 35 / 1890, Home Structure & Exterior 35 / 1890, Apartment Building & Common Areas 35 / 1890, Outdoor Home & Garden 35 / 1890, Numbers & Counting 44 / 2376, Colors & Shapes 34 / 1836, Pronouns & People Basics 34 / 1836, Question Words 18 / 972, Basic Verbs 36 / 1944, Practical Action Verbs 36 / 1944, Time & Days 36 / 1944, Learning Help Words 36 / 1944, Park & Playground 36 / 1944, Food Basics 36 / 1944, Fruit Basics 28 / 1512, Meat, Fish & Dairy 30 / 1620, Meals & Taste 36 / 1944, Drink Basics 32 / 1728, Coffee & Espresso Drinks 30 / 1620, Tea & Hot Drinks 28 / 1512, Juices, Smoothies & Cold Drinks 30 / 1620, Cafe Drink Options 30 / 1620, Fast Food Basics 32 / 1728, Sauces & Extras 32 / 1728, Takeaway & Dine-In Words 32 / 1728, Alcoholic Drinks Basics 32 / 1728, Bar & Alcohol Words 32 / 1728;
- current generated ordinary deck Google Sheets are title-normalized as `FlashcardsLuna 001 of 180 - ...` through `FlashcardsLuna 038 of 180 - Bar & Alcohol Words`;
- `languages = 54`;
- old pre-reset Google Sheets and output artifacts remain historical unless deliberately replaced;
- старые delivery notes и Sheet ids остаются историческими справками, а не текущим локальным delivery status.

Новый запуск колод идет по тому же documented pipeline, но с чистой БД:

1. выбрать следующую колоду из [Deck Master Plan](deck-master-plan.md);
2. подготовить/обновить spec в [Deck Specs Registry](deck-specs/README.md);
3. создать machine-readable candidate pool;
4. получить явное `approved_for_generation`;
5. проверить `deck_profile` / `risk_flags` and profile-aware source preflight for each draft language batch;
6. импортировать base deck data and language batches;
7. пройти QA gates, final export, same-file/new Sheet delivery, readback, post-final audit and freshness.

180-deck backlog остается в [Deck Master Plan](deck-master-plan.md) как operational backlog. Старые generated статусы после reset не являются активным состоянием; ранее доставленные Google Sheets считаются historical outputs until deliberately replaced by newly generated decks from the clean DB.

## Правила ведения документации

- Scope проекта: создавать карточки, хранить рабочие данные в Postgres, проверять качество и выдавать Google Sheets/spreadsheet-ready файлы по каждой колоде. Всё после передачи файла пользователю не входит в этот проект.
- Не создавать новый документ, если уже есть профильный документ по этой теме.
- Сначала обновлять существующий source of truth.
- Новый документ создавать только для новой темы или если текущий документ становится перегруженным.
- Каждый новый документ должен быть добавлен в этот индекс.
- Значимые изменения в коде, данных, структуре карточек, QA или правилах выдачи должны сопровождаться обновлением профильной документации.
- Если предлагается изменить уже зафиксированное решение, сначала нужно получить подтверждение пользователя, затем обновить документацию.

## Порядок чтения для задач по карточкам

Перед любой задачей по словам, переводам, транскрипции, taxonomy, базе данных, Google Sheets или spreadsheet-выдаче нужно читать:

1. [Decision Log](decision-log.md)
2. [Product Development Roadmap](product-development-roadmap.md)
3. [Deck Master Plan](deck-master-plan.md)
4. [Deck Specs Registry](deck-specs/README.md)
5. [Content Roadmap](product-content-roadmap.md)
6. [Course And Exam Release Roadmap](course-exam-release-roadmap.md)
7. [Course Source-Assisted Generation](course-source-assisted-generation.md)
8. [Spanish A1 Core Release Plan](spanish-a1-core-release-plan.md)
9. [Rare Language Source Hunt](rare-language-source-hunt.md)
10. [English Core 3000 Source Plan](english-core-3000-source-plan.md)
11. [Oxford Vocabulary Release Plan](oxford-vocabulary-release-plan.md)
12. [Content Coverage Map](content-coverage-map.md)
13. [External Content Benchmark](external-content-benchmark.md)
14. [Content Build Plan](content-build-plan.md)
15. [Pilot Content](pilot-content.md)
16. [QA Process](qa-process.md)
17. [Content Architecture](content-architecture.md)
18. [Card Content Model](card-content-model.md)
19. [Card Taxonomy](card-taxonomy.md)
20. [Language Specific Rules](language-specific-rules.md)
21. [Language Transcription Policy](language-transcription-policy.md)
22. [Reference Sources](reference-sources.md)
23. [HSK Classic Release Plan](hsk-classic-release-plan.md)
24. [HSK 3.0 Release Plan](hsk-3-release-plan.md)
25. [Data Delivery Pipeline](data-delivery-pipeline.md)
26. [Cloud Automation](cloud-automation.md)
27. [Database Schema](database-schema.md)
28. [Video Lessons Strategy](video-lessons-strategy.md)
29. [Video Lessons Registry](video-lessons-registry.md)
30. [Grammar & Textbook Roadmap](grammar-roadmap.md)
31. [Windows Handover & Setup Spec](windows-handover-spec.md)
32. [Multi-Device Management Spec](multi-device-management.md)


## Проверка перед завершением задачи

Перед завершением нетривиальной задачи нужно проверить:

- обновлен ли профильный документ;
- обновлен ли этот индекс, если изменился контур документации;
- нет ли противоречий между документами;
- можно ли восстановить текущее состояние проекта по документации без чтения переписки.

## Codex Handoff

- [../AGENTS.md](../AGENTS.md) — project-local Codex rules and operational guardrails.
- [PROJECT_STATE.md](PROJECT_STATE.md) — short current-state handoff for new chats and agents.

For non-trivial work, start with this index, then `PROJECT_STATE.md`, then the relevant source-of-truth document. Keep durable decisions and current state in docs, not only in chat.
