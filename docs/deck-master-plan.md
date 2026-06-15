# Deck Master Plan

Этот документ является главным рабочим планом колод LunaCards.

Статус: source of truth, deck planning v1. Перед созданием, генерацией, переводом или экспортом любой новой колоды сначала читать этот документ. Если этот документ противоречит другим документам, нужно остановиться и привести документацию к одному состоянию перед работой.

## Core rule: no mixed bags

Нельзя превращать большую тему в одну смешанную колоду.

Плохо:

```text
Food = bread, milk, lobster, restaurant complaint, market bargaining, allergy phrase
```

Хорошо:

```text
Food Basics              -> common vocabulary
Fruit Basics             -> narrower basic fruit vocabulary
Vegetable Basics         -> narrower basic vegetable vocabulary
Herbs & Greens           -> narrower greens/herbs vocabulary
Bakery & Pastry          -> bakery shelf vocabulary
Sweets & Snacks          -> sweets/snacks shelf vocabulary
Advanced Foods & Seafood -> rare/specialized vocabulary
Restaurant Words         -> restaurant vocabulary
Diets & Food Preferences -> diet/preference vocabulary
```

Обычная vocabulary-колода должна иметь один ясный learner-facing принцип:

- часть речи: verbs, adjectives, prepositions;
- закрытая группа: numbers, colors, question words;
- предметная зона: kitchenware, bathroom, office desk;
- действия внутри темы: cooking actions, phone/app actions;
- people/places/items внутри одного понятного domain.

## Current execution mode: vocabulary-only

Current production work is vocabulary-only.

Rules:

- generate cards for words or short lexical items, not ready sentences;
- do not generate ready-phrase, multi-turn, or mixed decks;
- old ready-phrase ideas from research notes must be converted to vocabulary-only deck specs before generation or left out;
- examples for vocabulary cards still exist, but they are controlled usage examples, not separate cards;
- situational needs are handled as vocabulary decks: for example a fast-food situation becomes `Takeaway & Dine-In Words`, with words like `takeaway`, `dine-in`, `sauce`, `cutlery`, `straw`, `lid`.

## Place/object vocabulary decks

Place/object decks are allowed and encouraged when they are useful to learners. They group nouns and short noun phrases by a visible place, shelf, counter, room, vehicle, public area, or everyday category.

This is the correct pattern for many practical themes:

```text
Airport & Flight Objects -> ticket, gate, exit, escalator, travelator, airplane, boarding pass, baggage
School Supplies          -> notebook, pen, book, textbook
Fruit Basics             -> apple, grapes, mango, pineapple
Cinema Basics            -> theater, hall, screen, seat, ticket, popcorn, drink
```

Rules:

- keep the deck mostly one content type, usually nouns or short noun phrases;
- do not mix object vocabulary with requests, complaints, negotiations, or long scenario phrases;
- put actions into a separate action deck if the action set is strong enough;
- leave ready lines out; if the situation is important, convert it into a vocabulary-only deck of objects/options/actions;
- split broad shelves by frequency and level: `Fruit Basics` is not the same as rare tropical fruit or advanced food vocabulary.

## Mandatory pre-generation checklist

Перед генерацией любой колоды создать или обновить физический spec-файл в [Deck Specs Registry](deck-specs/README.md) и ответить письменно на checklist:

| Check | Required answer |
| --- | --- |
| Deck name | Human-readable name, not generic `Words`. |
| Deck spec file | Registry row and spec file in `docs/deck-specs/`. |
| Content type | Current generation: `Vocabulary` or `Core Foundation` only. Ready-phrase, multi-turn and mixed decks are out of scope. |
| One grouping principle | Part of speech, closed set, room/object zone, place/shelf/category, action set, problem words, options, or vocabulary-only situation scope. |
| Domain / area / category | From [Card Taxonomy](card-taxonomy.md), or explicitly proposed if missing. |
| Quality profile | `deck_profile` and `risk_flags`: drives strict batch size, pre-import profile blockers and required QA families. |
| Level | `level_label`, `level_min`, `level_max`. |
| Frequency scope | Expected `frequency_band`: core/common/useful/advanced. |
| Priority scope | Expected `priority_band`: survival/core/common/useful/advanced. |
| Include rules | What belongs in this deck. |
| Exclude / move rules | What must not be included and where it goes instead. |
| Candidate-pool evidence | `outputs/candidate-pools/<set_id>_candidate_pool.jsonl` must exist before `approved_for_generation`; pool rows record scope, level/frequency, duplicate risk, source support, translation coverage risk, example feasibility, `compound_multiword_risk`, `required_qa_profile`, score and selected/backup/excluded decision. |
| Target range | `target_item_count_min/max`; do not pad with rare words. |
| Course Metadata | `Title <= 25`; `Description <= 60` and contains exact DB-backed `level_signal`. |
| Next deck | The natural next deck if user wants to continue. |

If this checklist is missing, generation must not start.

`planned` in the queue is not enough to generate. A deck becomes generation-ready only after a deck spec exists with scope, include/exclude rules, `deck_profile`, `risk_flags`, target range, level, frequency/priority scope and next deck. If the spec is missing, the deck stays backlog-only even if it has a low `Sort` number.

Spec registry rule:

- `candidate` and `planned` may exist without a spec file;
- `spec_ready`, `approved_for_generation` and `generated` must have a registry row and spec file in `docs/deck-specs/`;
- before generation, run `node scripts/check-deck-specs.mjs` and `node scripts/check-deck-ready.mjs <Sort|set_id>`;
- `node scripts/check-deck-ready.mjs <Sort|set_id>` must fail unless the deck is `approved_for_generation` and has a complete spec with safe `set_id`, numeric target range, compatible `level_label`/CEFR range, valid `deck_profile`, non-placeholder `risk_flags`, non-placeholder include/exclude/candidate-pool and QA notes;
- for `approved_for_generation`, `check-deck-ready` also validates the machine-readable candidate pool at `outputs/candidate-pools/<set_id>_candidate_pool.jsonl`; missing, too-small, out-of-range, duplicate-conflicted, scope-conflicted or missing strict selected-row profile fields block generation;
- do not create all backlog specs in advance; create a spec only when the deck is being prepared for generation.

Single-use next-deck approval rule:

- The previous one-time approval for `Numbers & Counting` was used before the 2026-05-02 reset and is now historical only.
- After the clean-start reset, there is no blanket approval for the backlog. Every `spec_ready -> approved_for_generation` promotion again requires explicit user approval unless a new documented approval rule is added.
- If the next deck spec has scope ambiguity, duplicate risk, missing target range, missing QA notes, failed checks or any user-facing product choice, stop at `spec_ready` and ask the user.

## Metadata rule

Every deck must have:

```text
set_id
slug
content_type
domain
area
category or situation
roadmap_stage
level_label
level_min
level_max
target_item_count_min
target_item_count_max
learning_goal
next_recommended_set_ids
selection_status
quality_status
sheet_contract_version
```

Every vocabulary card must keep row-level:

```text
card_key
set_id
meaning_id
part_of_speech
level
frequency_band
priority_band
semantic_scene
set_memberships
```

`card_key = set_id::meaning_id` is the stable row key in the workbook. `meaning_id` remains the semantic key inside the working base, but the spreadsheet row must use `card_key` because one meaning can appear in multiple decks.

`Description` must include the exact DB-backed `level_signal`, for example:

```text
Cookware and utensils. Basic level
Посуда и приборы. Базовый уровень
```

## Planned deck queue

This table is the operational plan. `Sort` is a stable integer sequence for execution and spreadsheet sorting; do not use decimal insertion values. It can be extended, but do not generate a deck that is not listed here or explicitly approved and added here first.

Operational order lives here. Other roadmap documents may explain principles or group decks by content theme, but they do not override this table. Target range and generation readiness are not inferred from the queue row; they must be fixed in the deck spec before generation.

Current execution note after 2026-05-02 reset: only decks deliberately rebuilt from the clean DB through `scripts/run-deck-production.mjs` count as current generated decks. Current user-confirmed generated coverage exists for Sort 1 through Sort 38. On 2026-06-12 Sort 38 `Bar & Alcohol Words` completed runner QA/export/delivery/readback/post-final audit/freshness/complete and was delivered as `FlashcardsLuna 038 of 180 - Bar & Alcohol Words` in the required Drive folder (`1iVvIbY79lUX2-ajjlgzGKipsqJ7P08J9WTPYvFFqRik`). The next operational row is Sort 39 `Basic Ingredients & Spices`, currently `planned`; it still needs spec, candidate pool and approval before generation. The 180-deck table remains the operational backlog and order of work.

| Sort | Deck | Content type | Domain | Level label | CEFR | Frequency scope | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Kitchenware Basics | Vocabulary | Home / Kitchen | Basic | A1 | core/common | generated |
| 2 | Cooking Actions | Vocabulary | Home / Kitchen | Elementary | A1-A2 | core/common | generated |
| 3 | Kitchen Storage & Cleaning | Vocabulary | Home / Kitchen | Elementary | A2 | common/useful | generated |
| 4 | Kitchen Small Tools & Supplies | Vocabulary | Home / Kitchen | Elementary | A2 | common/useful | generated |
| 5 | Bathroom Essentials | Vocabulary | Home | Basic | A1 | core/common | generated |
| 6 | Bedroom Basics | Vocabulary | Home | Basic | A1 | core/common | generated |
| 7 | Living Room Basics | Vocabulary | Home | Basic | A1 | core/common | generated |
| 8 | Dining Room & Table Setup | Vocabulary | Home | Elementary | A1-A2 | common | generated |
| 9 | Entryway & Outerwear | Vocabulary | Home | Basic | A1 | core/common | generated |
| 10 | Furniture Basics | Vocabulary | Home | Basic | A1 | core/common | generated |
| 11 | Laundry & Cleaning Basics | Vocabulary | Home | Elementary | A1-A2 | common/useful | generated |
| 12 | Home Office & Desk | Vocabulary | Home | Elementary | A1-A2 | common | generated |
| 13 | Home Structure & Exterior | Vocabulary | Home | Elementary | A1-A2 | common | generated |
| 14 | Apartment Building & Common Areas | Vocabulary | Home | Elementary | A2 | common/useful | generated |
| 15 | Outdoor Home & Garden | Vocabulary | Home | Elementary | A2 | common/useful | generated |
| 16 | Numbers & Counting | Vocabulary | Core Foundation | Basic | A1 | core | generated |
| 17 | Colors & Shapes | Vocabulary | Core Foundation | Basic | A1 | core | generated |
| 18 | Pronouns & People Basics | Vocabulary | Core Foundation | Basic | A1 | core | generated |
| 19 | Question Words | Vocabulary | Core Foundation | Basic | A1 | core | generated |
| 20 | Basic Verbs | Vocabulary | Core Foundation | Elementary | A1-A2 | core/common | generated |
| 21 | Practical Action Verbs | Vocabulary | Core Foundation | Elementary | A1-A2 | core/common | generated |
| 22 | Time & Days | Vocabulary | Time, Calendar & Events | Elementary | A1-A2 | core/common | generated |
| 23 | Learning Help Words | Vocabulary | Core Foundation | Elementary | A1-A2 | survival/core | generated |
| 24 | Park & Playground | Vocabulary | Nature & Weather / City & Transport | Elementary | A1-A2 | common | generated |
| 25 | Food Basics | Vocabulary | Food & Eating | Basic | A1 | core | generated |
| 26 | Fruit Basics | Vocabulary | Food & Eating / Produce | Basic | A1 | core/common | generated |
| 27 | Meat, Fish & Dairy | Vocabulary | Food & Eating | Elementary | A2 | common | generated |
| 28 | Meals & Taste | Vocabulary | Food & Eating | Elementary | A1-A2 | common | generated |
| 29 | Drink Basics | Vocabulary | Food & Eating / Beverages | Basic | A1 | core/common | generated |
| 30 | Coffee & Espresso Drinks | Vocabulary | Food & Eating / Beverages | Elementary | A2 | common/useful | generated |
| 31 | Tea & Hot Drinks | Vocabulary | Food & Eating / Beverages | Elementary | A2 | common/useful | generated |
| 32 | Juices, Smoothies & Cold Drinks | Vocabulary | Food & Eating / Beverages | Elementary | A2 | common/useful | generated |
| 33 | Cafe Drink Options | Vocabulary | Food & Eating / Restaurant | Elementary | A2 | survival/common | generated |
| 34 | Fast Food Basics | Vocabulary | Food & Eating / Fast Food | Elementary | A1-A2 | common/useful | generated |
| 35 | Sauces & Extras | Vocabulary | Food & Eating / Fast Food | Elementary | A2 | common/useful | generated |
| 36 | Takeaway & Dine-In Words | Vocabulary | Food & Eating / Fast Food | Elementary | A2 | survival/common | generated |
| 37 | Alcoholic Drinks Basics | Vocabulary | Food & Eating / Beverages | Pre-Intermediate | A2-B1 | useful | generated |
| 38 | Bar & Alcohol Words | Vocabulary | Food & Eating / Beverages | Pre-Intermediate | A2-B1 | useful | generated |
| 39 | Basic Ingredients & Spices | Vocabulary | Food & Eating / Ingredients | Elementary | A1-A2 | core/common | approved_for_generation |
| 40 | Grocery Shopping Words | Vocabulary | Food & Eating | Elementary | A2 | common/useful | planned |
| 41 | Market Shopping Words | Vocabulary | Shopping & Services / Food | Elementary | A2 | common/useful | candidate |
| 42 | Restaurant Words | Vocabulary | Food & Eating | Elementary | A2 | survival/common | planned |
| 43 | Advanced Foods & Seafood | Vocabulary | Food & Eating | Intermediate | B1-B2 | useful/advanced | candidate |
| 44 | Street & City Places | Vocabulary | City & Transport | Elementary | A1-A2 | core/common | planned |
| 45 | City Transport Basics | Vocabulary | City & Transport | Elementary | A1-A2 | common | planned |
| 46 | Metro & Public Transport Words | Vocabulary | City & Transport | Elementary | A2 | common/useful | planned |
| 47 | Direction Words | Vocabulary | City & Transport | Elementary | A1-A2 | survival/common | planned |
| 48 | Taxi & Ride-share Words | Vocabulary | City & Transport | Elementary | A2 | common/useful | planned |
| 49 | Car & Driving Basics | Vocabulary | City & Transport | Elementary | A2 | common/useful | candidate |
| 50 | Travel Basics | Vocabulary | Travel & Accommodation | Basic | A1 | core/common | planned |
| 51 | Hotel Check-in Words | Vocabulary | Travel & Accommodation | Elementary | A2 | survival/common | planned |
| 52 | Airport & Baggage Words | Vocabulary | Travel & Accommodation | Pre-Intermediate | A2-B1 | common/useful | planned |
| 53 | Airplane & Flight Basics | Vocabulary | Travel & Accommodation | Elementary | A1-A2 | common | candidate |
| 54 | Shopping Basics | Vocabulary | Shopping & Services | Elementary | A1-A2 | common | planned |
| 55 | Clothes & Sizes | Vocabulary | Shopping & Services | Elementary | A2 | common/useful | candidate |
| 56 | Price & Payment Words | Vocabulary | Money & Banking | Elementary | A1-A2 | survival/common | planned |
| 57 | Bank & ATM Words | Vocabulary | Money & Banking | Elementary | A2 | common/useful | blocked |
| 58 | Return & Service Problem Words | Vocabulary | Shopping & Services | Intermediate | B1 | useful | planned |
| 59 | Body Basics | Vocabulary | Health & Body | Basic | A1 | core/common | planned |
| 60 | Pharmacy Basics | Vocabulary | Health & Body | Elementary | A2 | survival/common | candidate |
| 61 | Symptoms & Medicine | Vocabulary | Health & Body | Pre-Intermediate | A2-B1 | survival/common | planned |
| 62 | Pharmacy Words | Vocabulary | Health & Body | Pre-Intermediate | A2-B1 | survival/common | candidate |
| 63 | Hospital Basics | Vocabulary | Health & Body | Pre-Intermediate | A2-B1 | survival/common | candidate |
| 64 | Doctor Visit Words | Vocabulary | Health & Body | Intermediate | B1 | survival/useful | planned |
| 65 | Emergency Help Words | Vocabulary | Emergency & Safety | Pre-Intermediate | A2-B1 | survival | planned |
| 66 | Police & Lost Item Words | Vocabulary | Emergency & Safety | Pre-Intermediate | A2-B1 | survival/useful | candidate |
| 67 | Public Service Words | Vocabulary | Documents & Administration | Pre-Intermediate | A2-B1 | useful | candidate |
| 68 | Apartment Rental Words | Vocabulary | Home / Living Abroad | Pre-Intermediate | A2-B1 | useful | candidate |
| 69 | Office Desk & Supplies | Vocabulary | Work & Study | Elementary | A1-A2 | common | planned |
| 70 | Office Supplies & Printing | Vocabulary | Work & Study | Elementary | A2 | common/useful | planned |
| 71 | Office Rooms & Business Center | Vocabulary | Work & Study | Elementary | A2 | common/useful | planned |
| 72 | Meeting & Work Task Words | Vocabulary | Work & Study | Pre-Intermediate | A2-B1 | useful | planned |
| 73 | Work Social Words | Vocabulary | Work & Study | Pre-Intermediate | A2-B1 | useful | planned |
| 74 | School Basics | Vocabulary | Work & Study / Education | Elementary | A1-A2 | core/common | candidate |
| 75 | University Basics | Vocabulary | Work & Study / Education | Pre-Intermediate | A2-B1 | common/useful | candidate |
| 76 | Technology Basics | Vocabulary | Technology & Internet | Elementary | A1-A2 | common | planned |
| 77 | Device Charging & Accessories | Vocabulary | Technology & Internet | Elementary | A2 | common/useful | planned |
| 78 | Phone & App Actions | Vocabulary | Technology & Internet | Elementary | A2 | common/useful | planned |
| 79 | Mobile Plan & Internet Words | Vocabulary | Technology & Internet | Pre-Intermediate | A2-B1 | useful | candidate |
| 80 | Documents & Forms Basics | Vocabulary | Documents & Administration | Pre-Intermediate | A2-B1 | useful | planned |
| 81 | Family & Relationships | Vocabulary | People & Relationships | Elementary | A1-A2 | core/common | planned |
| 82 | Appearance Basics | Vocabulary | People & Relationships | Elementary | A2 | common | candidate |
| 83 | Feelings & Character | Vocabulary | People & Relationships | Pre-Intermediate | A2-B1 | common/useful | planned |
| 84 | Social Plan & Invitation Words | Vocabulary | People & Relationships | Pre-Intermediate | A2-B1 | useful | candidate |
| 85 | Leisure & Hobbies Basics | Vocabulary | Leisure & Culture | Elementary | A1-A2 | common | planned |
| 86 | Festivals & Customs | Vocabulary | Leisure & Culture | Pre-Intermediate | A2-B1 | useful | candidate |
| 87 | Weather & Nature Basics | Vocabulary | Nature & Weather | Elementary | A1-A2 | core/common | planned |
| 88 | Animals Basics | Vocabulary | Nature & Weather | Elementary | A1-A2 | common | candidate |
| 89 | Environment Basics | Vocabulary | Nature & Weather / Society | Pre-Intermediate | A2-B1 | useful | candidate |
| 90 | Airport & Flight Objects | Vocabulary | Travel & Accommodation / Air Travel | Elementary | A1-A2 | common | candidate |
| 91 | Transit Building Objects | Vocabulary | City & Transport / Stations & Stops | Elementary | A1-A2 | common | candidate |
| 92 | School Supplies | Vocabulary | Work & Study / Education | Basic | A1 | core/common | candidate |
| 93 | School Tasks & Exercises | Vocabulary | Work & Study / Education | Elementary | A1-A2 | common | candidate |
| 94 | Fruit Expansion | Vocabulary | Food & Eating / Produce | Elementary | A2 | common/useful | candidate |
| 95 | Vegetable Basics | Vocabulary | Food & Eating | Basic | A1 | core/common | candidate |
| 96 | Herbs & Greens | Vocabulary | Food & Eating | Elementary | A2 | common/useful | candidate |
| 97 | Bakery & Pastry | Vocabulary | Food & Eating | Elementary | A2 | common/useful | candidate |
| 98 | Sweets & Snacks | Vocabulary | Food & Eating | Elementary | A1-A2 | common/useful | candidate |
| 99 | Cinema Basics | Vocabulary | Leisure & Culture | Elementary | A1-A2 | common/useful | candidate |
| 100 | Cafe Food & Table Items | Vocabulary | Food & Eating / Restaurant | Elementary | A2 | common/useful | candidate |
| 101 | Tableware & Condiments | Vocabulary | Food & Eating / Restaurant | Elementary | A1-A2 | common | candidate |
| 102 | Diets & Food Preferences | Vocabulary | Food & Eating / Restaurant | Pre-Intermediate | A2-B1 | useful | candidate |
| 103 | Cafe Service Words | Vocabulary | Food & Eating / Restaurant | Elementary | A2 | survival/common | candidate |
| 104 | Common Prepositions | Vocabulary | Core Foundation | Basic | A1 | core | planned |
| 105 | Basic Adjectives | Vocabulary | Core Foundation | Basic | A1 | core/common | planned |
| 106 | Object States & Qualities | Vocabulary | Core Foundation | Elementary | A1-A2 | core/common | planned |
| 107 | Everyday Adverbs & Frequency | Vocabulary | Core Foundation | Elementary | A1-A2 | core/common | planned |
| 108 | Simple Connectors | Vocabulary | Core Foundation | Elementary | A1-A2 | core/common | planned |
| 109 | Daily Routine Verbs | Vocabulary | Core Foundation / Personal Life | Elementary | A1-A2 | core/common | planned |
| 110 | Position & Movement Words | Vocabulary | Core Foundation / City & Transport | Elementary | A1-A2 | core/common | planned |
| 111 | Clothes Basics | Vocabulary | Shopping & Services / Clothing | Basic | A1 | core/common | planned |
| 112 | Shoes & Accessories | Vocabulary | Shopping & Services / Clothing | Elementary | A1-A2 | common | planned |
| 113 | Personal Care & Hygiene | Vocabulary | Health & Body / Personal Care | Basic | A1 | core/common | planned |
| 114 | Bathroom Toiletries | Vocabulary | Home / Bathroom | Basic | A1 | core/common | planned |
| 115 | Daily Routine Actions | Vocabulary | Personal Life | Elementary | A1-A2 | core/common | planned |
| 116 | Sleep & Morning Routine | Vocabulary | Personal Life | Elementary | A1-A2 | common | planned |
| 117 | Basic Physical States | Vocabulary | Health & Body | Basic | A1 | core/common | planned |
| 118 | Lighting & Climate | Vocabulary | Home | Elementary | A1-A2 | common | planned |
| 119 | Utilities & Bills Objects | Vocabulary | Home / Living Abroad | Elementary | A2 | common/useful | planned |
| 120 | Household Utilities & Problems | Vocabulary | Home / Living Abroad | Pre-Intermediate | A2-B1 | survival/useful | planned |
| 121 | Waste & Recycling | Vocabulary | Home / City & Transport | Elementary | A2 | common/useful | planned |
| 122 | Decor & Textiles | Vocabulary | Home | Elementary | A2 | common | planned |
| 123 | Plants at Home | Vocabulary | Home / Nature & Weather | Elementary | A2 | common | candidate |
| 124 | Pest Control Basics | Vocabulary | Home | Elementary | A2 | useful | candidate |
| 125 | Pets at Home | Vocabulary | Home / Animals | Elementary | A2 | common | candidate |
| 126 | Kids Room & Baby Basics | Vocabulary | Home / Family | Elementary | A2 | useful | candidate |
| 127 | Kids & Baby Care | Vocabulary | Home / Family | Elementary | A2 | useful | candidate |
| 128 | Home Maintenance Supplies | Vocabulary | Home Repairs & Tools | Elementary | A2 | common/useful | planned |
| 129 | Sewing & Small Repair | Vocabulary | Home Repairs & Tools | Elementary | A2 | common/useful | candidate |
| 130 | Household Problem Words | Vocabulary | Home / Living Abroad | Pre-Intermediate | A2-B1 | survival/useful | planned |
| 131 | Clothing Store & Fitting Room Words | Vocabulary | Shopping & Services / Clothing | Elementary | A2 | common/useful | planned |
| 132 | Personal Care Store | Vocabulary | Shopping & Services / Personal Care | Elementary | A2 | common/useful | planned |
| 133 | Post Office & Delivery Words | Vocabulary | Shopping & Services / Public Services | Elementary | A2 | common/useful | planned |
| 134 | Mail & Delivery Objects | Vocabulary | Shopping & Services / Public Services | Elementary | A2 | common/useful | planned |
| 135 | Salon & Haircut Words | Vocabulary | Shopping & Services / Personal Services | Pre-Intermediate | A2-B1 | useful | candidate |
| 136 | Cosmetics & Makeup Basics | Vocabulary | Shopping & Services / Personal Care | Elementary | A2 | common/useful | candidate |
| 137 | Gym & Fitness Basics | Vocabulary | Health & Body / Leisure | Elementary | A2 | common/useful | candidate |
| 138 | Cash, Cards & Payments | Vocabulary | Money & Banking | Elementary | A1-A2 | survival/common | planned |
| 139 | Bank Accounts & Transfers | Vocabulary | Money & Banking | Pre-Intermediate | A2-B1 | common/useful | planned |
| 140 | Bills & Subscriptions | Vocabulary | Money & Banking / Living Abroad | Pre-Intermediate | A2-B1 | common/useful | planned |
| 141 | ATM & Card Problem Words | Vocabulary | Money & Banking | Pre-Intermediate | A2-B1 | survival/useful | planned |
| 142 | Passport, ID & Forms | Vocabulary | Documents & Administration | Elementary | A2 | survival/common | planned |
| 143 | Appointment & Queue Words | Vocabulary | Documents & Administration / Public Services | Pre-Intermediate | A2-B1 | useful | planned |
| 144 | Address & Contact Details | Vocabulary | Documents & Administration | Elementary | A1-A2 | core/common | planned |
| 145 | Bus & Train Station Objects | Vocabulary | City & Transport / Stations & Stops | Elementary | A1-A2 | common | planned |
| 146 | Train Travel Words | Vocabulary | City & Transport / Travel | Elementary | A2 | common/useful | planned |
| 147 | Bus Travel Words | Vocabulary | City & Transport | Elementary | A2 | common/useful | planned |
| 148 | Road Signs & Parking | Vocabulary | City & Transport / Roads & Driving | Elementary | A2 | common/useful | planned |
| 149 | Car Interior & Road Words | Vocabulary | City & Transport / Roads & Driving | Elementary | A2 | common/useful | planned |
| 150 | Fuel & Car Service Words | Vocabulary | City & Transport / Roads & Driving | Pre-Intermediate | A2-B1 | useful | candidate |
| 151 | Car Rental Words | Vocabulary | Travel & Accommodation / Roads & Driving | Pre-Intermediate | A2-B1 | useful | candidate |
| 152 | Travel Problem Words | Vocabulary | Travel & Accommodation | Intermediate | B1-B2 | useful | planned |
| 153 | Public Places & Buildings | Vocabulary | City & Transport / Public Life | Elementary | A1-A2 | common | planned |
| 154 | Neighborhood Services | Vocabulary | City & Transport / Public Services | Elementary | A2 | common/useful | planned |
| 155 | Public Toilets & Signs | Vocabulary | City & Transport / Public Life | Elementary | A2 | survival/common | planned |
| 156 | First Aid & Emergency Items | Vocabulary | Emergency & Safety / Health & Body | Elementary | A2 | survival/common | planned |
| 157 | Dental Care Words | Vocabulary | Health & Body | Pre-Intermediate | A2-B1 | useful | candidate |
| 158 | Eye Care & Pharmacy Items | Vocabulary | Health & Body | Pre-Intermediate | A2-B1 | useful | candidate |
| 159 | Classroom Words | Vocabulary | Work & Study / Education | Elementary | A1-A2 | survival/common | planned |
| 160 | School Subjects & Timetable | Vocabulary | Work & Study / Education | Elementary | A1-A2 | core/common | planned |
| 161 | University Campus & Exam Words | Vocabulary | Work & Study / Education | Pre-Intermediate | A2-B1 | common/useful | planned |
| 162 | Online Learning Words | Vocabulary | Work & Study / Technology | Elementary | A2 | common/useful | planned |
| 163 | Professions Basics | Vocabulary | Work & Study / Professions | Elementary | A1-A2 | core/common | planned |
| 164 | Computer & Internet Basics | Vocabulary | Technology & Internet | Elementary | A1-A2 | core/common | planned |
| 165 | Messages & Social Media Words | Vocabulary | Technology & Internet | Elementary | A2 | common/useful | planned |
| 166 | Accounts & Passwords Words | Vocabulary | Technology & Internet | Pre-Intermediate | A2-B1 | useful | planned |
| 167 | Online Shopping & Delivery Words | Vocabulary | Technology & Internet / Shopping & Services | Pre-Intermediate | A2-B1 | useful | planned |
| 168 | Books & Reading | Vocabulary | Leisure & Culture | Elementary | A1-A2 | common | planned |
| 169 | Music Basics | Vocabulary | Leisure & Culture | Elementary | A1-A2 | common | planned |
| 170 | Sports Basics | Vocabulary | Leisure & Culture / Health & Body | Elementary | A1-A2 | common | planned |
| 171 | Games & Toys | Vocabulary | Leisure & Culture / Family | Elementary | A1-A2 | common | candidate |
| 172 | Event & Holiday Words | Vocabulary | Time, Calendar & Events / Leisure & Culture | Elementary | A2 | common/useful | planned |
| 173 | Invitation & Social Plan Words | Vocabulary | People & Relationships | Pre-Intermediate | A2-B1 | useful | planned |
| 174 | Plants & Flowers | Vocabulary | Nature & Weather | Elementary | A1-A2 | common | planned |
| 175 | Domestic Animals | Vocabulary | Nature & Weather / Animals | Elementary | A1-A2 | common | planned |
| 176 | Wild Animals | Vocabulary | Nature & Weather / Animals | Elementary | A2 | common | candidate |
| 177 | Outdoor Activity Words | Vocabulary | Nature & Weather / Leisure | Elementary | A2 | common/useful | planned |
| 178 | Geography & Natural Places | Vocabulary | Nature & Weather | Elementary | A2 | common | planned |
| 179 | Calendar Dates & Scheduling Words | Vocabulary | Time, Calendar & Events | Elementary | A2 | core/common | planned |
| 180 | Frequencies & Habits | Vocabulary | Time, Calendar & Events | Elementary | A1-A2 | core/common | planned |

## Explicit coverage notes

These examples are intentionally listed so future chats do not lose them:

| User concern | Covered by | Notes |
| --- | --- | --- |
| broad `Fruit & Vegetables` deck | `Fruit Basics` / `Vegetable Basics` / `Herbs & Greens` | The older combined deck was replaced at Sort 26 by narrower `Fruit Basics`; vegetables and greens remain separate later decks. |
| broad `Bank & ATM Basics` deck | `Cash, Cards & Payments` / `Bank Accounts & Transfers` / `ATM & Card Problem Words` | The older broad money deck is blocked to avoid mixing object vocabulary, account actions and problem words. |
| to open, to close, to turn on, to turn off, to plug in, to charge, to wash, to dry, to clean, to fix, to break, to lose, to find, to pay, to return | `Practical Action Verbs` | These verbs are mandatory because object decks alone do not let learners describe actions. English display form uses `to + base verb`. |
| clean, dirty, wet, dry, broken, full, empty, new, old, cheap, expensive, heavy, light, hot, cold, sharp, dull | `Object States & Qualities` / `Basic Adjectives` | States and qualities are core reusable vocabulary across home, shopping, transport and problems. |
| toilet, sink, shower, bath, towel | `Bathroom Essentials` | Basic bathroom vocabulary, not ready sentences. |
| tablets, syrup, medicine, prescription | `Pharmacy Basics` / `Symptoms & Medicine` / `Pharmacy Words` | Split objects, medicine words and pharmacy-service words. |
| pharmacy visit | `Pharmacy Words` | Use words/options like medicine, dose, prescription, pharmacist; no ready request phrases. |
| hospital, ward, nurse, appointment | `Hospital Basics` / `Doctor Visit Words` | Vocabulary and problem/service words separated. |
| police, lost item, theft, accident | `Police & Lost Item Words` / `Emergency Help Words` | Survival vocabulary/problem words, not ready phrase cards. |
| airplane, flight, boarding pass, seat | `Airplane & Flight Basics` / `Airport & Baggage Words` | Vocabulary separated from airport problem words. |
| ticket, gate, exit, escalator, travelator, boarding pass, baggage | `Airport & Flight Objects` / `Transit Building Objects` | Place/object vocabulary, not airport problem-word deck. |
| notebook, pen, book, textbook, assignment, exercise | `School Supplies` / `School Tasks & Exercises` | Study objects and task words split from classroom words. |
| grapes, mango, pineapple, apple | `Fruit Basics` | Sort 26 basic fruit deck; rare fruit can be later `Fruit Expansion`. |
| potato, tomato, cucumber, carrot | `Vegetable Basics` | Basic vegetable deck; rare/specialized vegetables move later. |
| lettuce, green onion, dill, coriander | `Herbs & Greens` | Greens/herbs are separate from general vegetables if the candidate pool is strong. |
| bread, pastry, bun, cake, cream | `Bakery & Pastry` | Bakery items split from `Food Basics`. |
| chocolate, candy, cotton candy, popcorn | `Sweets & Snacks` / `Cinema Basics` | Same meaning can have multiple memberships if useful. |
| movie theater, hall, screen, seat, ticket, popcorn, drink | `Cinema Basics` | Cinema object deck; ticket buying becomes vocabulary only if needed. |
| soup, meat, vegan dish, chopsticks, fork, knife, napkin, salt, pepper | `Cafe Food & Table Items` / `Tableware & Condiments` / `Diets & Food Preferences` | Cafe vocabulary split from service/order words. |
| coffee, espresso, latte, tea, juice, smoothie, iced drink | `Drink Basics` / `Coffee & Espresso Drinks` / `Tea & Hot Drinks` / `Juices, Smoothies & Cold Drinks` | Drinks are separate from food and cafe table items. |
| frappuccino / blended iced coffee | `Coffee & Espresso Drinks` / `Cafe Drink Options` | Treat branded/regional names carefully; prefer a generic learner-safe term unless the target language commonly uses the borrowed name. |
| burger, fries, cola, sauce, ketchup, tray, straw | `Fast Food Basics` / `Sauces & Extras` | Fast food is a separate practical vocabulary branch. Use generic `cola` unless a brand is intentionally needed. |
| takeaway, dine-in, sauce, ice, cutlery, straw, lid | `Takeaway & Dine-In Words` / `Cafe Drink Options` | Use vocabulary words/options, not ready phrases like `I will eat here`. |
| beer, wine, cocktail, cider | `Alcoholic Drinks Basics` | Adult/useful vocabulary, not a kids/basic deck. Keep neutral and non-promotional. |
| bar, pub, non-alcoholic, alcohol-free, glass, bottle | `Bar & Alcohol Words` | Adult/useful vocabulary; include non-alcoholic options. |
| dishwasher, plate, tray | `Kitchenware Basics` / `Kitchen Storage & Cleaning` / `Dining Room & Table Setup` | Dishware stays early; appliances and cleaning/storage can appear in the next kitchen deck. |
| kitchen scale, kitchen timer, kitchen thermometer, funnel, garlic press, citrus juicer, pizza cutter, kitchen shears, pastry brush, parchment paper, toothpicks, wooden skewers, kitchen twine, grater, whisk, rolling pin, measuring cup, measuring spoon, strainer, can opener, bottle opener | `Kitchen Small Tools & Supplies` | Sort 4 is current generated coverage after the 2026-05-06 runner rebuild and 2026-05-13 duplicate-policy retrofit. The added small-tool overlaps reuse existing `Kitchenware Basics` meaning IDs for independent-study completeness. Keep foil, storage bags, containers, paper towel and cleaning supplies in `Kitchen Storage & Cleaning`. |
| salt, sugar, oil, flour, pepper, vinegar, sauce, spices, yeast, starch | `Basic Ingredients & Spices` | Common ingredients/spices are separate from broad `Food Basics` and from prepared meals. |
| table, chair, armchair, sofa, bed, coffee table, nightstand, wardrobe, shelf | `Furniture Basics` / room-specific Home decks | Core furniture gets an early standalone deck and can also appear in bedroom, living room, dining room or home office memberships. |
| curtains, pillowcase, blanket, bedspread, mattress | `Bedroom Basics` / `Decor & Textiles` | Bedding stays in bedroom; curtains can also belong to decor/textiles. |
| stain, dirt, cleaning, broom, dustpan, floor cloth, dish sponge, kitchen towel, dish soap | `Kitchen Storage & Cleaning` / `Laundry & Cleaning Basics` | Cleaning words split by room/context; same meaning can have multiple set memberships if useful. |
| iron, ironing board | `Laundry & Cleaning Basics` | Laundry/ironing tools are household vocabulary, not kitchen vocabulary. |
| drying rack, heated towel rail, heating | `Laundry & Cleaning Basics` / `Bathroom Essentials` / `Lighting & Climate` | Clothes drying and bathroom heating are home vocabulary; keep `heated towel rail` in bathroom/heating context. |
| slippers, sneakers, boots, shoelaces | `Shoes & Accessories` / `Entryway & Outerwear` | Shoes can appear in clothing/shopping and entryway memberships. |
| socks, underwear, tank top, T-shirt, sweater, hoodie, shirt, tie, jeans, trousers, skirt, tights, stockings | `Clothes Basics` / `Clothes & Sizes` | Everyday clothing is basic vocabulary; underwear and hosiery stay learner-safe and neutral, not hidden or skipped. |
| receipt, checkout, bag, shopping cart, shopping basket | `Shopping Basics` / `Grocery Shopping Words` / `Market Shopping Words` | Store equipment and payment objects are shopping vocabulary; distinguish store cart/basket from online cart. |
| bus station, ticket, train, bus, driver, stop, station, direction, route | `Bus & Train Station Objects` / `City Transport Basics` / `Train Travel Words` / `Bus Travel Words` / `Direction Words` | Transport nouns and route words are split by station, vehicle and navigation context. |
| gym, exercise mat, machine, kettlebell, weight, membership, dumbbell, barbell | `Gym & Fitness Basics` / `Sports Basics` | Gym vocabulary is a practical A2 deck; keep equipment, membership and workout objects together unless the candidate pool becomes too large. |
| headphones, power bank, adapter, extension cord, charger, battery, charging cable | `Device Charging & Accessories` / `Technology Basics` | Daily tech accessories are a separate practical deck; distinguish `charger` from `charging cable` and `battery`. |
| mirror, sunscreen, hair salon, haircut, hair dye, blush, foundation, makeup brush, eye shadow, mascara, lipstick, hair conditioner, hair mask | `Personal Care Store` / `Cosmetics & Makeup Basics` / `Salon & Haircut Words` | Beauty and hair-care vocabulary is useful A2 everyday shopping/service vocabulary; keep products separate from service-place words when needed. |
| toothpaste, toothbrush, dental floss, dentist, filling, teeth cleaning, cavity, toothache | `Personal Care & Hygiene` / `Dental Care Words` | Daily dental objects can be early; dental conditions/procedures belong in `Dental Care Words`. |
| toilet brush, toilet paper, air freshener, hand soap | `Bathroom Toiletries` / `Bathroom Essentials` / `Laundry & Cleaning Basics` | Bathroom consumables and cleaning tools are basic household vocabulary. |
| hair dryer, curling iron, hairspray, hair mousse, hair wax | `Personal Care Store` / `Salon & Haircut Words` | Hair styling tools/products are personal-care vocabulary; salon service words stay in the salon deck. |
| thread, needle, scissors, nail scissors | `Sewing & Small Repair` / `Personal Care & Hygiene` | Sewing tools go to small repair; nail scissors also belongs to personal care. |
| knife, cutting board, jar, bottle, kettle | `Kitchenware Basics` / `Kitchen Storage & Cleaning` | Kitchen tools, storage containers and simple appliances remain in kitchen vocabulary; distinguish jar/bottle as containers. |
| diaper, stroller, crib, pacifier, baby bottle, toy, backpack, child seat, wet wipes | `Kids & Baby Care` / `Kids Room & Baby Basics` | Baby/child vocabulary is everyday useful and should not be hidden under generic family words. |
| leash, collar, bowl, pet food, litter box, litter, carrier, vet | `Pets at Home` | Pet objects and care words are a separate everyday household branch. |
| outlet, switch, bulb, wire, pipe, tap, meter, boiler, leak, clog, fuse | `Household Utilities & Problems` / `Utilities & Bills Objects` | Utilities and household problems need both object words and problem words. |
| mosquito, cockroach, ant, trap, insect spray, repellent | `Pest Control Basics` | Pest-control vocabulary is practical household vocabulary. |
| folder, file, stapler, paper clip, glue, tape, printer, laptop charger, calculator | `Office Supplies & Printing` / `Office Desk & Supplies` | Office/school supplies should not be limited to desk furniture. |
| package, mailbox, courier, pickup point, tracking number, delivery, return label | `Mail & Delivery Objects` / `Post Office & Delivery Words` | Delivery vocabulary is useful for daily errands and online shopping. |
| steering wheel, wheel, tire, trunk, gas, gas station, traffic light, crosswalk, license, fine | `Car Interior & Road Words` / `Road Signs & Parking` / `Car & Driving Basics` | Car and road vocabulary should cover vehicle parts, road objects and legal/payment words. |
| passport, visa, permit, contract, signature, copy, form, certificate, insurance | `Passport, ID & Forms` / `Documents & Forms Basics` | Documents/admin vocabulary is a core living-abroad branch. |

## Food split example

`Food Basics` includes only high-frequency, early-useful items.

Include:

```text
bread, milk, eggs, water, rice, apple, banana, potato
```

Move out:

```text
lobster -> Advanced Foods & Seafood
octopus -> Advanced Foods & Seafood
mussels -> Advanced Foods & Seafood
restaurant complaint -> Restaurant Words / Restaurant Problem Words
market bargaining -> Market Shopping
allergy phrase -> do not generate as phrase; use allergy/diet vocabulary if useful
espresso drink -> Coffee & Espresso Drinks
smoothie -> Juices, Smoothies & Cold Drinks
takeaway phrase -> do not generate as phrase; use `takeaway` / `dine-in` vocabulary if useful
```

## Kitchen split example

`Kitchenware Basics` stays valid as a deck structure and should not be treated as a failed grouping approach. Its final spreadsheet is current again after the affected `ES-419`, `TH`, `LO`, `MY` transcription rows plus the later `KA` Georgian `spatula` fallback were repaired/rechecked, semantic-scene alignment, target-example naturalness and cross-language transcription fallback gates passed, and the same Google Sheet file id was reuploaded on 2026-04-29.

```text
Kitchenware Basics          -> vocabulary: spoon, plate, cup
Cooking Actions             -> vocabulary/actions: cut, wash, boil
Kitchen Storage & Cleaning  -> vocabulary: container, sponge, trash bag
Kitchen Small Tools & Supplies -> vocabulary: kitchen scale, timer, funnel
Recipes & Food Prep Words   -> vocabulary: recipe, step, ingredient
Kitchen Problem Words       -> vocabulary: leak, broken, repair, smoke
```

## Status meanings

| Status | Meaning |
| --- | --- |
| candidate | Important idea found through benchmark or discussion; not accepted into the operational build yet. |
| planned | Accepted backlog item with stable Sort order, but not generation-ready by itself. |
| spec_ready | Deck spec is complete: scope, include/exclude, target range, level, frequency, priority and next deck are fixed. |
| approved_for_generation | User has approved the spec for generation. This means the deck may be claimed by automation; it does not mean the deck is already running or final-delivery ready. |
| generated | Deck data exists as working/generated content. This is not the same as native-speaker approval. |
| blocked | Do not generate until the blocking decision changes. |

Runtime execution status is not tracked by editing this markdown table. If automation claims a deck, the active lock lives in Postgres table `deck_generation_runs`. A deck with an active `running` lock must not be claimed by a second worker even if this table still says `approved_for_generation`.

## Before final answer on any generation task

Before finishing a task that creates or changes content, verify:

- this document was read;
- required deck spec exists in [Deck Specs Registry](deck-specs/README.md);
- the deck appears in the table, or was added with approval;
- the pre-generation checklist was answered;
- no broad mixed bag was created;
- `Description` contains exact DB-backed `level_signal`;
- broad topic split rules were followed;
- source docs were updated if the plan changed.
