# External Content Benchmark

Этот документ фиксирует внешний benchmark по тому, как языковые платформы, экзаменационные рамки, travel/topic lists и learner communities структурируют темы для изучения языка. Он используется только для выбора тем, уровней и границ карточных наборов; он не является стратегией сервиса и не описывает ничего кроме контента карточек.

Статус: research snapshot v0, created 2026-04-25. Это не source of truth для генерации колод. Source of truth остаются [Content Roadmap](product-content-roadmap.md), [Card Taxonomy](card-taxonomy.md) и [Content Coverage Map](content-coverage-map.md). Перед добавлением новых колод выводы из этого документа нужно превратить в конкретные vocabulary-only deck specs.

## Sources Checked

| Source | What it shows | Useful takeaway for LunaCards |
| --- | --- | --- |
| Council of Europe CEFR | CEFR описывает язык через activities, domains, competences; domains: public, personal, educational, professional. | Нельзя строить весь контур только по предметным темам. Нужны public services, education, professional/work and personal/social tracks. |
| ACTFL Can-Do Statements | Can-Do organized by communication modes and proficiency; examples are adaptable and not a fixed curriculum. | Помимо wordlists нужны functional/situational goals, but current production converts them into vocabulary-only objects, options, actions and problem-word decks. |
| AQA GCSE MFL themes | People/lifestyle, healthy living, education/work, popular culture, travel/tourism, media/technology, environment/where people live. | Наши gaps: healthy lifestyle, school/university, festivals/customs, media/social media, environment/social issues. |
| Wikivoyage travel phrase lists | Travel lists are organized around temporary-stay survival scenarios: basics, food, buying, help, transport, hotels, restaurants. | Использовать как источник ситуаций, но в текущем production режиме превращать их в vocabulary-only decks: objects, options, actions and problem words. |
| Babbel | Combines level progression with user goals and topics: travel, work, relationships, living abroad, culture; units have objectives like ordering food or talking about hobbies. | Add goal-based tracks: travel, living abroad, work, culture/social life. |
| Drops | Visual, vocabulary-heavy app with professionally curated 3000+ words and phrases. | We need visual-friendly concrete vocab categories and carefully split everyday vocabulary decks. |
| Memrise | Uses practical vocab, learner goals/reasons, native-speaker videos, popular/user-requested lists and real-life conversation. | Use practical relevance and popularity signals when prioritizing candidate pools. |
| Quizlet vocabulary topics | Broad topic taxonomy includes animals, appearance, body, fashion, arts, literature, music, media, health, architecture, games/sports, home/garden, and communication functions. | Keep broad learner-facing clusters, but generate vocabulary-only decks unless the content-type decision changes. |
| Reddit language-learning discussions | Learners often recommend pronunciation/script first, learner help language, high-frequency verbs, common objects/activities, and goal-based scenarios. | Add a Learner Toolkit track: pronunciation/script support and classroom/app vocabulary. Convert scenarios into vocabulary-only decks. |

## Main Conclusion

The current LunaCards plan is structurally sound but too object/topic-heavy. The external pattern is:

```text
levels + real-life domains + communicative tasks + thematic vocabulary
```

So the card plan should not be only:

```text
Home -> Kitchen -> Objects
```

It should also support:

```text
Public life -> Bank / clinic / police / rental office -> What can the learner do there?
```

and:

```text
Functional language -> ask, refuse, compare, complain, explain, choose, apologize
```

## Important Gaps Found

### P0/P1 gaps to add early

| Gap | Why it matters | Suggested deck direction |
| --- | --- | --- |
| Learner help words | Learners need to control learning while still weak. | `Learning Help Words`: repeat, slower, meaning, pronunciation, example, mistake, question. No ready phrase cards in current mode. |
| Pronunciation / script support | Reddit learners and major apps emphasize sounds/scripts early. | Not a normal vocabulary deck; add language-specific support metadata or starter decks where useful. |
| Functional vocabulary | Real language use needs more than nouns. | Convert functions into vocabulary-only sets: agreement words, preference words, choice words, problem words. |

### Public-life gaps

| Gap | Suggested deck direction |
| --- | --- |
| Bank and money beyond paying | Bank account, card, ATM, transfer, bill, problem with payment. |
| Public services / administration | Forms, appointment, ID/passport, address, office, queue, signature. |
| Police / authority | Lost item, theft, accident, document check, help request. |
| Post office / delivery | Package, mailbox, courier, address, return, tracking. |
| Mobile operator / internet | SIM card, data plan, Wi-Fi, password, subscription, support. |

### Living-abroad gaps

| Gap | Suggested deck direction |
| --- | --- |
| Apartment rental | Rent, deposit, landlord, contract, viewing, repair request. |
| Utilities | Electricity, water, gas, meter, bill, outage. |
| Neighborhood services | Pharmacy, clinic, laundromat, repair shop, salon, gym. |
| Household problems | Leak, broken appliance, locked out, noise complaint. |

### Education gaps

| Gap | Suggested deck direction |
| --- | --- |
| School basics | Subjects, timetable, classroom objects, rules. |
| University | Lecture, seminar, exam, assignment, campus, library. |
| Study actions | Read, write, submit, revise, explain, ask, answer. |
| Online learning | Login, lesson, file, link, upload, deadline. |

### Transport / car gaps

| Gap | Suggested deck direction |
| --- | --- |
| Car and driving | Car parts, fuel, parking, road signs, traffic, license. |
| Vehicle problems | Flat tire, repair, tow truck, accident, insurance. |
| Rental car | Booking, deposit, damage, return, mileage. |

### Shopping / market gaps

| Gap | Suggested deck direction |
| --- | --- |
| Market | Stall, price per kilo, fresh/ripe, bargaining, cash. |
| Clothes and sizes | Size, color, fitting room, shoes, return, receipt. |
| Beauty / personal care | Haircut, shampoo, cosmetics, hygiene products. |

### Culture / society gaps

| Gap | Suggested deck direction |
| --- | --- |
| Festivals and customs | Holiday, celebration, gift, invitation, tradition. |
| Social life | Meet, invite, date, party, visit, host, guest. |
| Media and social media | Post, like, message, photo, video, account, privacy. |
| Environment / social issues | Recycling, pollution, charity, volunteering, homelessness. |

## Recommended Card Structure

For each large domain, use four vocabulary-only layers. These layers are separate deck scopes, not one mixed deck:

1. `Vocabulary Basics`: concrete objects, people, places.
2. `Actions / Everyday Use`: verbs, states, quantities, routine actions.
3. `Situation Words`: options, service words, place words and short lexical items.
4. `Problem Words / Repair`: complaint nouns, missing-item words, emergency words, misunderstanding words.

Example:

```text
Bank Basics
Bank Actions
ATM & Card Problems
Opening an Account
```

This is better than one huge `Banking 100 words` deck because it keeps the card scope clear and prevents mixed-bag word lists.

Vocabulary cards should still be clean learner-facing groups. For example, verbs, colors, numbers, room objects and office desk items are valid standalone flashcard decks. Situational benchmark themes such as bank, clinic or apartment rental must be split into separate vocabulary, action, option/service-word and problem-word decks before generation.

## Candidate Additions To Roadmap

These are candidates, not approved generation tasks yet:

| Priority | Candidate deck | Domain | Type |
| --- | --- | --- | --- |
| High | Learning Help Words | Core Foundation | Vocabulary |
| High | Apartment Rental Words | Home / Living Abroad | Vocabulary |
| High | Bank & ATM Words | Money & Banking | Vocabulary |
| High | School Basics | Work & Study / Education | Vocabulary |
| High | Clothes & Sizes | Shopping & Services | Vocabulary |
| High | Market Shopping Words | Shopping & Services / Food | Vocabulary |
| Medium | Public Service Words | Documents & Administration | Vocabulary |
| Medium | Car & Driving Basics | City & Transport | Vocabulary |
| Medium | Mobile Plan & Internet Words | Technology & Internet | Vocabulary |
| Medium | Festivals & Customs | Leisure & Culture | Vocabulary |
| Medium | Social Plan & Invitation Words | People & Relationships | Vocabulary |
| Medium | Environment Basics | Nature & Weather / Society | Vocabulary |

## Sources

- Council of Europe CEFR overview: https://www.coe.int/en/web/portfolio/the-common-european-framework-of-reference-for-languages-learning-teaching-assessment-cefr-
- Council of Europe CEFR framework page: https://www.coe.int/en/web/common-european-framework-reference-languages/introduction-and-context
- ACTFL Can-Do Statements: https://www.actfl.org/educator-resources/ncssfl-actfl-can-do-statements
- AQA GCSE French 2024 themes: https://www.aqa.org.uk/subjects/french/gcse/french-8652/specification/subject-content/themes
- AQA legacy GCSE language themes: https://www.aqa.org.uk/subjects/french/gcse/french-8658/specification/subject-content/themes
- Wikivoyage travel phrase lists: https://en.wikivoyage.org/wiki/Phrasebooks
- Wikivoyage travel list template: https://en.wikivoyage.org/wiki/Wikivoyage:Phrasebook_article_template
- Babbel courses: https://support.babbel.com/hc/en-us/articles/205600448-Babbel-courses
- Babbel course selection: https://support.babbel.com/hc/en-gb/articles/360037498532-Finding-the-right-course
- Drops App Store listing: https://apps.apple.com/us/app/language-learning-games-drops/id939540371
- Memrise approved courses: https://www.memrise.com/blog/changes-to-the-memrise-app
- Memrise homepage: https://www.memrise.com/en-us/
- Quizlet vocabulary topics: https://quizlet.com/content/learn-vocabulary
- Reddit discussion on first language-learning priorities: https://www.reddit.com/r/languagelearning/comments/1e9p0k5
- Reddit discussion on first words to learn: https://www.reddit.com/r/languagelearning/comments/17l6p8u
