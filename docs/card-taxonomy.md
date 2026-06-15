# Card Taxonomy

Этот документ является source of truth по тематической taxonomy карточек LunaCards.

Общий контур типов контента описан отдельно в [Content Architecture](content-architecture.md). Этот документ отвечает именно за тематические domains, areas и categories.

Статус: content domains v0; Home, Personal Life, Food & Eating, City & Transport, Shopping & Services, Money & Banking, Documents & Administration, Work & Study, Technology & Internet, Nature & Weather, Health & Body, Travel, Leisure & Culture, Emergency taxonomy v0.

## Назначение

Taxonomy определяет, к какой теме относится слово и в каком контексте должны строиться примеры. Она нужна для:

- генерации тематических наборов слов;
- проверки, что слово не выпадает из темы;
- построения примеров с правильным контекстом;
- группировки карточек в наборах;
- spreadsheet-выдачи и контроля качества данных.

## Правила taxonomy

- Не создавать слишком мелкие категории, если они не дают самостоятельного полезного набора. Жесткого требования 50-100 слов нет: размер зависит от темы и фиксируется через target range.
- Не дублировать одну и ту же лексику в нескольких местах без явной причины.
- Пересечения между наборами допустимы, но один и тот же смысл должен ссылаться на один `meaning_id`.
- Если слово подходит в несколько категорий, выбирать категорию по основному учебному контексту.
- Примеры использования должны оставаться внутри выбранной темы.
- Новые категории добавлять только через этот документ и индекс [docs/README.md](README.md).

## Общий контур domains

Эти domains задают верхний уровень тематической карты. Подробные categories можно добавлять постепенно.

Operational order, integer `Sort` and deck statuses ведутся в [Deck Master Plan](deck-master-plan.md). Content ladder внутри каждой темы объясняется в [Content Roadmap](product-content-roadmap.md). Этот документ отвечает за taxonomy: какие domains/areas/categories существуют и как ситуации раскладываются на words/options/actions/problem words.

| Domain | Назначение |
| --- | --- |
| Core Foundation | База: числа, время, местоимения, вопросительные слова, базовые глаголы, вежливость. |
| Personal Life | Повседневные действия, рутина, сон, утро/вечер, личная организация. |
| Home | Дом, комнаты, мебель, бытовые предметы, ремонт, безопасность. |
| Food & Eating | Еда, напитки, продукты, готовка, ресторан, диеты. |
| City & Transport | Город, направления, общественный транспорт, такси, вождение, билеты. |
| Travel & Accommodation | Аэропорт, вокзал, отель, багаж, бронирование, граница. |
| Shopping & Services | Магазины, одежда, оплата, возврат, сервисы, почта, доставка. |
| Health & Body | Тело, симптомы, аптека, врач, экстренная помощь, гигиена. |
| Work & Study | Офис, школа, университет, встречи, задания, профессии. |
| People & Relationships | Семья, друзья, внешность, характер, эмоции, общение. |
| Time, Calendar & Events | Даты, расписание, праздники, планы, частотность. |
| Nature & Weather | Погода, природа, животные, растения, ландшафт. |
| Technology & Internet | Устройства, приложения, интернет, сообщения, настройки. |
| Money & Banking | Деньги, счета, карты, банк, цены, платежи. |
| Documents & Administration | Документы, формы, адреса, государственные и бытовые процедуры. |
| Leisure & Culture | Хобби, спорт, книги, музыка, кино, игры, события. |
| Emergency & Safety | Срочные ситуации, предупреждения, помощь, полиция, пожар, потеря вещей. |

## Situational Vocabulary Domains

Текущий production/export режим vocabulary-only. Ситуации не становятся готовыми репликами; если ситуация важна, ее нужно разложить на vocabulary-only categories: objects, places, options, actions, problem words.

Приоритетные situations для vocabulary-разложения:

| Situation | Domain |
| --- | --- |
| First contact and greetings | Core Foundation |
| Asking for help | Core Foundation |
| Restaurant order | Food & Eating |
| Grocery shopping | Food & Eating |
| Asking for directions | City & Transport |
| Taxi or ride-share | City & Transport |
| Buying a ticket | City & Transport |
| Airport and baggage | Travel & Accommodation |
| Hotel check-in | Travel & Accommodation |
| Pharmacy visit | Health & Body |
| Doctor appointment | Health & Body |
| Emergency call | Emergency & Safety |
| Returning an item | Shopping & Services |
| Paying and asking about price | Money & Banking |
| Renting an apartment | Home |
| Work small talk | Work & Study |
| Phone call basics | Technology & Internet |

## Core Foundation taxonomy v0

Core Foundation не должен быть только списком существительных. Он обязан закрывать reusable verbs, states, qualities, prepositions, connectors and frequency words, иначе тематические карточки не дают языковой каркас.

| Domain | Area | Category |
| --- | --- | --- |
| Core Foundation | Verbs | Basic Verbs |
| Core Foundation | Verbs | Practical Action Verbs |
| Core Foundation | Qualities & States | Object States & Qualities |
| Core Foundation | Position & Movement | Position & Movement Words |
| Core Foundation | Frequency & Connectors | Frequency & Connector Words |

## Food & Eating taxonomy v0

Food & Eating must be split by shelf/category, level, and frequency. `Food Basics` is not the whole food universe. Common early items, cafe/restaurant objects, diet preferences, and rarer foods belong in separate decks.

Taxonomy category names must stay stable labels, not long word lists. Candidate examples belong in deck specs or generation notes.

| Domain | Area | Category |
| --- | --- | --- |
| Food & Eating | Core Food | Basic Foods & Essential Staples |
| Food & Eating | Beverages | Drink Basics |
| Food & Eating | Beverages | Coffee, Espresso & Iced Coffee Drinks |
| Food & Eating | Beverages | Tea & Hot Drinks |
| Food & Eating | Beverages | Juices, Smoothies & Cold Drinks |
| Food & Eating | Beverages | Alcoholic Drinks Basics |
| Food & Eating | Produce | Fruit Basics |
| Food & Eating | Produce | Vegetable Basics |
| Food & Eating | Produce | Herbs & Greens |
| Food & Eating | Bakery | Bakery & Pastry |
| Food & Eating | Sweets & Snacks | Sweets & Snacks |
| Food & Eating | Protein & Dairy | Common Protein & Dairy |
| Food & Eating | Meals & Taste | Meals & Taste |
| Food & Eating | Ingredients & Spices | Basic Ingredients & Spices |
| Food & Eating | Cafe & Restaurant | Cafe Food & Menu Words |
| Food & Eating | Cafe & Restaurant | Tableware & Serving Items |
| Food & Eating | Fast Food | Fast Food Basics |
| Food & Eating | Fast Food | Takeaway & Dine-In Words |
| Food & Eating | Diets & Preferences | Diets & Food Restrictions |
| Food & Eating | Grocery & Market | Grocery & Market Words |

## Home taxonomy v0

Базовые категории:

| Domain | Area | Category |
| --- | --- | --- |
| Home | Entryway | Entryway & Outerwear |
| Home | Furniture | Core Furniture Across Rooms |
| Home | Kitchen | Kitchen Appliances |
| Home | Kitchen | Cookware, Utensils & Tableware |
| Home | Kitchen | Storage & Cleaning |
| Home | Kitchen | Kitchen Small Tools |
| Home | Bathroom | Bathroom Fixtures |
| Home | Bathroom | Bathroom Toiletries |
| Home | Bathroom | Bathroom Comfort |
| Home | Bedroom | Furniture & Bedding |
| Home | Bedroom | Clothing Storage & Personal Items |
| Home | Living Room | Furniture & Decor |
| Home | Living Room | Electronics & Media |
| Home | Dining Room | Dining Room Setup |
| Home | Laundry & Cleaning | Laundry & Cleaning Supplies |
| Home | Laundry & Cleaning | Cleaning Problems |
| Home | Laundry & Cleaning | Clothes Care |
| Home | Storage & Organization | Containers, Shelves & Organizers |
| Home | Home Office | Furniture, Computer & Desk Items |
| Home | Home Structure | Rooms, Surfaces, Doors & Windows |
| Home | Building Exterior | Building Exterior |
| Home | Apartment Building | Apartment Common Areas |
| Home | Home Repairs & Tools | Tools, Hardware, Electrical & Plumbing Basics |
| Home | Utilities & Problems | Household Utilities & Problems |
| Home | Sewing & Small Repair | Sewing & Small Repair Basics |
| Home | Kids & Baby Care | Kids & Baby Care Basics |
| Home | Pets at Home | Pets at Home Basics |
| Home | Pest Control | Pest Control Basics |
| Home | Home Safety | Locks, Security & Emergency Items |
| Home | Outdoor Home | Balcony, Patio & Garden Items |

## Personal Life taxonomy v0

Personal Life covers repeated daily vocabulary that is not tied to one room only. It overlaps with Home and Health & Body, but its learner context is daily routine.

| Domain | Area | Category |
| --- | --- | --- |
| Personal Life | Daily Routine | Daily Routine |
| Personal Life | Daily Actions | Daily Actions |
| Personal Life | Personal Organization | Personal Organization |
| Personal Life | Physical States | Physical States |

## City & Transport taxonomy v0

City & Transport покрывает не только поездки, но и повседневную городскую среду: улицы, парк, метро, остановки, билеты и ориентирование.

| Domain | Area | Category |
| --- | --- | --- |
| City & Transport | Street & Navigation | Street Navigation |
| City & Transport | Public Transport | Metro, Bus, Tram & Train Basics |
| City & Transport | Stations & Stops | Station Navigation |
| City & Transport | Stations & Stops | Bus Route Basics |
| City & Transport | Urban Places | Urban Places |
| City & Transport | Roads & Driving | Road & Traffic Basics |
| City & Transport | Roads & Driving | Car & Road Basics |
| City & Transport | Roads & Driving | Road Signs, Parking, Fuel & Car Service |
| City & Transport | Taxi & Ride-share | Taxi Basics |
| City & Transport | Public Life | Public Life Basics |

## Shopping & Services taxonomy v0

Shopping & Services covers common errands and service counters. Split object vocabulary from service words and problem words.

| Domain | Area | Category |
| --- | --- | --- |
| Shopping & Services | Shopping Basics | Shopping Basics |
| Shopping & Services | Shopping Basics | Checkout & Bags |
| Shopping & Services | Clothing | Clothing Basics |
| Shopping & Services | Clothing | Underwear & Layers |
| Shopping & Services | Personal Care | Personal Care Store |
| Shopping & Services | Personal Care | Beauty Products |
| Shopping & Services | Cosmetics & Makeup | Makeup Basics |
| Shopping & Services | Delivery & Mail | Delivery & Mail |
| Shopping & Services | Personal Services | Local Services |
| Shopping & Services | Personal Services | Haircare & Salon Services |
| Shopping & Services | Delivery & Mail | Mail Delivery Objects |
| Shopping & Services | Online Shopping | Online Shopping |

## Money & Banking taxonomy v0

Money & Banking must be split because basic payment words are early, but banking problems and accounts are later.

| Domain | Area | Category |
| --- | --- | --- |
| Money & Banking | Payments | Payment Basics |
| Money & Banking | Bank Basics | Bank Basics |
| Money & Banking | Bills & Subscriptions | Bills & Subscriptions |
| Money & Banking | Problems | Payment Problems |

## Documents & Administration taxonomy v0

Documents & Administration covers practical paperwork and public-office vocabulary.

| Domain | Area | Category |
| --- | --- | --- |
| Documents & Administration | Identity | Identity Documents |
| Documents & Administration | Forms | Forms & Contact Details |
| Documents & Administration | Public Office | Public Office Basics |
| Documents & Administration | Rental & Living Abroad | Rental Documents |

## Work & Study taxonomy v0

Work & Study разделяется на физическое рабочее место, офисные пространства, действия и учебные ситуации. Это позволяет отдельно делать простые предметные колоды, action decks и problem-word decks без смешивания в общий набор.

`Home / Home Office` - это домашнее рабочее место как часть дома. `Work & Study / Desk & Supplies` - рабочий или учебный контекст: офис, школа, университет, coworking, business center.

| Domain | Area | Category |
| --- | --- | --- |
| Work & Study | Desk & Supplies | Desk & Supplies |
| Work & Study | Desk & Supplies | Office Supplies & Printing |
| Work & Study | Office Spaces | Office Rooms, Business Center & Shared Areas |
| Work & Study | Meetings & Tasks | Meetings, Schedules & Basic Work Actions |
| Work & Study | School & Study | Classroom & Study Materials |
| Work & Study | School & Study | School Supplies |
| Work & Study | School & Study | Assignments, Exercises & Study Tasks |
| Work & Study | Professions | Jobs, Roles & Workplace People |

## Technology & Internet taxonomy v0

Technology & Internet covers device words, app actions, accounts, social media and online services.

| Domain | Area | Category |
| --- | --- | --- |
| Technology & Internet | Devices | Device Basics |
| Technology & Internet | Device Accessories | Device Accessories |
| Technology & Internet | App Actions | App Actions |
| Technology & Internet | Internet Basics | Internet Basics |
| Technology & Internet | Messages & Social Media | Messaging & Social Media |
| Technology & Internet | Accounts & Security | Accounts & Security |

## Nature & Weather taxonomy v0

Nature & Weather покрывает природную лексику отдельно от городской навигации. Парк может попадать в City & Transport, если контекст - городское место, или в Nature & Weather, если контекст - природа, прогулка, растения, погода.

| Domain | Area | Category |
| --- | --- | --- |
| Nature & Weather | Weather Basics | Weather Basics |
| Nature & Weather | Parks & Outdoors | Park, Playground & Outdoor Public Spaces |
| Nature & Weather | Plants & Landscape | Plants & Landscape |
| Nature & Weather | Animals Basics | Animals Basics |

## Health & Body taxonomy v0

Health & Body разделяется на тело, симптомы, лекарства, аптеку, врача и больницу. Не смешивать таблетки/сироп как vocabulary с фразами для разговора с фармацевтом.

| Domain | Area | Category |
| --- | --- | --- |
| Health & Body | Body Basics | Body Basics |
| Health & Body | Symptoms | Common Symptoms |
| Health & Body | Medicine | Medicine Basics |
| Health & Body | Pharmacy | Pharmacy Basics |
| Health & Body | Doctor Visit | Doctor Visit Words |
| Health & Body | Hospital | Hospital Basics |
| Health & Body | Personal Care | Personal Care |
| Health & Body | Dental & Eye Care | Dental & Eye Care |
| Health & Body | Fitness & Gym | Fitness & Gym |

## Travel & Accommodation taxonomy v0

Travel & Accommodation покрывает не только отель и багаж, но и самолет/перелет как отдельный vocabulary scope.

| Domain | Area | Category |
| --- | --- | --- |
| Travel & Accommodation | Travel Basics | Travel Basics |
| Travel & Accommodation | Air Travel | Air Travel |
| Travel & Accommodation | Airport | Airport Process |
| Travel & Accommodation | Hotel | Hotel Basics |

## Emergency & Safety taxonomy v0

Emergency & Safety включает urgent vocabulary, warnings and problem words for police/lost-item contexts. It does not create ready phrase cards in the current vocabulary-only mode.

| Domain | Area | Category |
| --- | --- | --- |
| Emergency & Safety | Emergency Help | Emergency Help Words |
| Emergency & Safety | Police | Police & Lost Item Words |
| Emergency & Safety | Warnings | Warning & Safety Words |

## Leisure & Culture taxonomy v0

Leisure & Culture must be split into clean learner-facing decks. Cinema object vocabulary is separate from buying tickets or discussing a movie.

| Domain | Area | Category |
| --- | --- | --- |
| Leisure & Culture | Hobbies | Hobbies |
| Leisure & Culture | Books & Reading | Books & Reading |
| Leisure & Culture | Music | Music Basics |
| Leisure & Culture | Cinema | Cinema Basics |
| Leisure & Culture | Sports & Games | Sports & Games |
| Leisure & Culture | Fitness | Fitness Basics |
| Leisure & Culture | Events | Events & Holidays |

## People & Relationships taxonomy v0

People & Relationships covers personal/social vocabulary and social situations.

| Domain | Area | Category |
| --- | --- | --- |
| People & Relationships | Family & Friends | Family & Friends |
| People & Relationships | Appearance | Appearance Basics |
| People & Relationships | Feelings & Character | Feelings & Character |
| People & Relationships | Social Plans | Social Plan Words |

## Time, Calendar & Events taxonomy v0

Time, Calendar & Events covers basic time words and practical scheduling.

| Domain | Area | Category |
| --- | --- | --- |
| Time, Calendar & Events | Time Basics | Time Basics |
| Time, Calendar & Events | Frequency & Habits | Frequency & Habits |
| Time, Calendar & Events | Scheduling | Scheduling Words |
| Time, Calendar & Events | Events & Holidays | Events & Holidays |

## Home expansion status

Эти категории расширяют Home taxonomy. Часть уже добавлена в [Deck Master Plan](deck-master-plan.md) как `planned` или `candidate`; перед генерацией нужен deck spec и target range, но не повторное утверждение самой идеи.

| Domain | Area | Category | Зачем нужна |
| --- | --- | --- | --- |
| Home | Lighting & Climate | Lighting & Climate | Частая бытовая лексика: lamp, bulb, switch, heater, fan, air conditioner, humidifier. |
| Home | Utilities | Home Utilities | Нужна для дома и аренды: electricity, outlet, pipe, tap, meter, bill. |
| Home | Waste & Recycling | Waste & Recycling | Повседневная лексика: trash can, garbage bag, recycling bin, compost. |
| Home | Decor & Textiles | Decor & Textiles | Предметы декора не только в living room: rug, curtain, mirror, frame, cushion. |
| Home | Plants & Indoor Garden | Indoor Plants | Отдельный бытовой пласт: plant, pot, soil, watering can. |
| Home | Pets at Home | Pets at Home | Домашняя лексика для питомцев: bowl, litter box, leash, pet bed. |
| Home | Kids Room / Nursery | Kids Room & Nursery | Детская комната и базовые детские предметы. |
| Home | Garage & Workshop | Garage & Workshop | Для домов с гаражом/мастерской: workbench, shelf, tire, toolbox. |
| Home | Home Maintenance Supplies | Home Maintenance Supplies | Расходники для ремонта и обслуживания: paint, glue, tape, battery. |
| Home | Pest Control | Pest Control | Практичная бытовая тема: insect, trap, repellent, spray. |
| Home | Mail & Delivery | Home Mail & Delivery | Почта и доставка: mailbox, package, courier, doorbell. |

## Текущий статус расширения

Уже включены в v1 deck plan или explicit candidate coverage:

1. Lighting & Climate.
2. Utilities.
3. Waste & Recycling.
4. Decor & Textiles.
5. Plants & Indoor Garden.
6. Pets at Home.
7. Kids Room / Nursery and Kids & Baby Care.
8. Pest Control.
9. Mail & Delivery.

Garage & Workshop остается более поздним candidate: добавлять только если candidate pool набирает достаточно полезной повседневной лексики и не дублирует Home Repairs, Car, Storage or Tools.

## Контроль качества

Для каждой категории перед генерацией карточек нужно проверить:

- можно ли собрать самостоятельный полезный набор без добивки редкими словами;
- не пересекается ли категория слишком сильно с уже существующей;
- понятна ли категория пользователю;
- можно ли строить естественные примеры в рамках категории;
- не содержит ли категория слишком узкие или редкие предметы.
