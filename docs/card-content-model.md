# Card Content Model

Этот документ является source of truth по языковым карточкам LunaCards.

## Цель

LunaCards хранит карточки для изучения языков. Базовый язык для создания карточек - `EN`, то есть American English / US default. С него создаются переводы на активные языки и языковые варианты проекта; текущий scope - 54 активных варианта.

Карточки должны работать не только в паре `English -> target language`, но и между любыми языками: например, `German -> French`, `Uzbek -> English`, `Kazakh -> Swahili`.

Из-за этого карточка должна хранить не независимые попарные переводы, а одну общую смысловую единицу с языковыми реализациями.

## Смысловая карточка

Карточка должна иметь общий смысловой идентификатор.

Пример:

```text
meaning_id: kitchen_clean_01
topic: kitchen
canonical_meaning: The kitchen is clean.
```

Все языковые версии должны сохранять один и тот же смысл, объект, действие, признак, число и ситуацию.

Рабочая модель для vocabulary:

```text
meaning_id -> meaning_note -> semantic_scene -> language_entries + example_translations
```

`meaning_id` отвечает за смысл слова. `semantic_scene` отвечает за пример. Это разные уровни, но они должны быть согласованы.

Пример:

```text
meaning_id: table_kitchen_furniture
meaning_note: table as kitchen/home furniture, not a data table
semantic_scene:
  target_object: apples
  target_display: the apples
  subject_number: plural
  action_or_state: are on
  state_or_location: on the table
  tense_aspect: present state
  topic_context: kitchen/home
```

Такой подход нужен, чтобы карточки работали между любыми языками, а не только от английского.

If the same `meaning_id` appears in several decks, each deck-specific context example keeps its own `example_id`. QA for translated examples must be tied to that exact context example, not only to `meaning_id`, because another deck may use a different example for the same semantic word.

Общий контур типов контента описан в [Content Architecture](content-architecture.md). Текущий production/export режим: vocabulary-only. Карточка должна быть vocabulary item: слово, короткая устойчивая lexical item или словосочетание, но не готовая реплика.

HSK exam vocabulary release-файлы являются отдельным vocabulary-only контуром, описанным в [HSK Classic Release Plan](hsk-classic-release-plan.md). В этом контуре базовая строка идет от китайского HSK source list, а не от English canonical base. Для HSK release нужны `simplified`, `traditional`, `pinyin`, optional `example_zh` and `example_pinyin`, плюс переводы по 54 языкам. Target-language transcription/IPA/romanization and audio are out of scope for HSK release workbooks.

## Примеры использования

Пример использования является семантическим якорем карточки. Он должен быть одним и тем же по смыслу во всех языках.

Перед переводом примера нужно зафиксировать `semantic_scene`: кто действует, что делает, какой объект, где, когда, в каком числе, с каким признаком и в какой tense/aspect/situation. Пример на каждом языке переводится не свободно, а как естественная реализация этой сцены.

The English canonical example and its `semantic_scene` are the source scene for all target examples. Agreement among target languages is not evidence by itself: if ES/FR/DE/RU all use the same alternate meta-template or alternate situation, but EN says a concrete scene, the target examples are still wrong. To change the scene, repair the canonical English example / `semantic_scene` first, then regenerate or repair target examples and evidence against the new source scene.

Допустимо:

```text
en: The red cup is on the table.
ru: Красная чашка на столе.
es: La taza roja está sobre la mesa.
de: Die rote Tasse steht auf dem Tisch.
```

Недопустимо:

```text
en: The red cup is on the table.
es: Hay una taza bonita en la cocina.
```

Во втором варианте потеряны цвет, предмет, место и конкретная сцена.

Минимальные поля `semantic_scene` для простых vocabulary examples:

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

Заполняются только поля, которые реально нужны для сцены. Нельзя добавлять в перевод детали, которых нет в `semantic_scene`.

## Естественность против точности

Перевод примера не обязан копировать английскую грамматику. Он должен звучать естественно для носителя целевого языка, но не менять смысл.

Правило:

- сохранять смысл, объект, действие, признак, число и ситуацию;
- не заменять слова на более удобные, если меняется смысл;
- не добавлять культурные реалии, идиомы или детали, которых нет в каноническом примере;
- если английский пример сам по себе звучит странно, нужно изменить канонический пример, а не локально исправлять отдельные языки.

English context example quality is a separate requirement. Semantic preservation only proves that translated examples kept the same scene; it does not prove that the original English scene was good. Before translating a deck, the English example must be short, natural, concrete and useful as a card anchor for any language pair.

Example casing follows the target language, not English-only habits. Languages with ordinary sentence case start learner-facing examples with a capital first cased letter. Scripts/languages without sentence capitalization, including `ZH`, `JA`, `KO`, `TH`, `LO`, `MY`, `KM`, South Asian scripts and Georgian `KA`, are not forced into capitalization. The vocabulary `display_word` remains dictionary/base form and must not be artificial Title Case or initial-uppercase unless the language, proper noun, acronym or standard dictionary form requires it.

The English example must also be a good learning anchor before it is translated. Avoid tautologies, repeated templates and generic placeholders. `The shower head is in the shower.` is a bad anchor because it repeats the head noun as its own location; `The shower head is in the shower area.` is acceptable. `I need to cut the food.` is bad because it uses a weak template and generic object; `Cut the carrot.` is acceptable.

Controlled example policy: by default, examples must be as simple as the target meaning allows. The example should test the lexical item, not create extra grammar risk. Preferred order is: preserve a clear scene, keep grammar low-risk, stay natural, then add limited variety. Do not add unnecessary plural, number, possession, adjective stacking, case-heavy phrases, subordinate clauses, tense/aspect changes, modality, idioms or cultural details just to make the sentence sound richer.

Profile defaults:

- object/noun decks: one target object, one simple action/state/location, singular by default, no numbers unless the deck profile is `number_quantity`;
- action decks: one clear actor and one concrete object when the verb needs one; avoid generic objects such as `the food` and avoid modal frames such as `I need to ...`;
- adjective/state decks: one target adjective/state attached to one concrete noun; avoid stacked adjectives;
- number/quantity decks: preserve the counted object scene and number grammar; never replace a concrete scene with a meta-template such as `Number: zero`;
- time, document, health, service and other risk profiles: use the simplest functional scene that proves the intended meaning and register, without importing unrelated grammar.

Complex examples are allowed only when the `meaning_note` or `deck_profile` requires that complexity. If a natural example needs extra grammar that may be hard to prove across languages, the row should carry explicit proof in `semantic_scene` / profile QA evidence or remain `needs_review`.

Meta-template examples such as `Word: apple`, `Meaning: apple`, `Translation: apple` or `Number: zero` are blocked when the canonical English example is a concrete scene. They are allowed only for rows whose own lexical meaning is actually `word`, `meaning`, `translation`, `number`, `name`, `label` or a comparable lexical/meta concept.

V3 extends this to target examples with `target_example_pedagogical_quality`: a translated example can be grammatically natural and semantically preserved but still be a poor learning card if it only says that an object is in its own category/location. Hard blockers include self-container scenes such as `freezer bag in the freezer`, `kitchen shelf in the kitchen` and `shower head in the shower`. Adjacent-location examples such as `oven mitt beside the oven` can remain warnings when the phrase is plausible but weak.

Недопустимо для action decks:

```text
I need to pour the food.
I need to drain the food.
```

Проблемы: шаблон `I need to ...`, generic object `the food`, неестественная verb-object пара.

Допустимо:

```text
She pours the milk.
I drain the pasta.
She chops the onion.
```

`semantic_scene.target_object` must name the actual object in the scene, not repeat the target verb. For `to chop`, `target_object = onion`, not `chop`.

## Тематика

Каждая карточка относится к конкретной теме. Слова, переводы и примеры должны оставаться внутри этой темы.

Если тема `kitchen`, пример должен использовать слово в кухонном или бытовом контексте. Если слово многозначное, нужно выбирать значение, соответствующее теме.

Source of truth по тематическим категориям ведется в [Card Taxonomy](card-taxonomy.md).

## Артикли, род и грамматические маркеры

Для английского нужно хранить слово с подходящим артиклем, если это уместно: `a`, `an`, `the`.

Для целевых языков нужно использовать артикли, род или близкие грамматические маркеры, если они реально существуют в языке и важны для изучающего. Общая политика ниже, а language-specific guardrails ведутся в [Language Specific Rules](language-specific-rules.md).

- немецкий: `der`, `die`, `das`;
- французский: `le`, `la`, `l'`;
- испанский: `el`, `la`;
- итальянский: `il`, `lo`, `la`, `l'`;
- другие языки - по их реальной грамматике.

Для языков без артиклей нельзя выдумывать искусственные артикли. В таких языках поле артикля или грамматического маркера должно оставаться пустым либо хранить только реально полезную грамматическую информацию.

## Display form by part of speech

Финальная ячейка перевода в vocabulary-листе должна показывать learner-friendly dictionary/base display form.

Правила:

- English countable singular nouns: показывать с `a/an`, если нет причины использовать другой маркер: `a table`, `an apple`.
- English verbs: показывать как `to + base verb`: `to run`, `to eat`, `to open`.
- English adjectives, adverbs, numbers, pronouns, prepositions: показывать base form без искусственного артикля: `red`, `quickly`, `three`, `under`.
- German nouns: показывать с артиклем рода в nominative singular: `der Tisch`, `die Küche`, `das Messer`. Для plural-only или plural entry использовать `die`.
- German verbs: показывать инфинитив без искусственного `zu`: `laufen`, `essen`, `öffnen`.
- В остальных языках использовать обычную dictionary/base form и добавлять артикль, род или грамматический маркер только если это нормальная учебная практика для этого языка. Конкретные v0-правила по языкам описаны в [Language Specific Rules](language-specific-rules.md).

`native_word` может хранить чистую лемму, а `word_with_article_or_marker` хранит то, что реально идет в пользовательскую ячейку. Финальный `transcription` должен соответствовать именно пользовательской display form.

Entry/display fallback rule: a high-risk non-English row must not use an English fallback surface just because the generator was unsure. If `native_word` or learner display for `HI`, `BN`, `NE`, `SI`, `TA`, `TE`, `KN`, `ML`, `ZH`, `JA`, `KO`, `TH`, `LO`, `MY`, `KM`, `KA`, `HY`, `BG`, `RU` or `KK` is a Latin-script copy of `canonical_english`, the row is not final-ready. Short international loanwords can be valid, but mass identical Latin surfaces across unrelated languages are a deterministic blocker.

Meaning contrast rule: inside one deck/language, two different `meaning_id` rows must remain learnably distinct. If `shower` and `shower head`, `soap` and `body wash`, or `towel rack` and `towel hook` collapse to the same display word and the same example, final export must fail. If only the display word is shared for a plausible synonym or language-specific broad term, keep it as `needs_review`/warning evidence rather than silently changing the row.

Semantic granularity rule: a language entry must be neither too broad nor too narrow for the current `meaning_id` when the deck contains nearby meanings. `body wash -> soap`, `bath mat -> rug` or `washcloth -> towel` are blockers if the deck also contains the more exact neighbor. If a language normally uses one broad everyday term for two nearby objects, the row can stay only with explicit warning/review evidence and a distinct example that preserves the contrast.

Target example lexical anchor rule: a translated example must visibly teach the target lexical item. It may use a normal inflected/definite/case form, omit an article, or use a documented language-specific variant, but it must not drift to a nearby item. A `soap dispenser` card cannot use an example that only says "the soap is near the sink"; the example must anchor the dispenser.

Same-lemma / same-sense rule: the vocabulary entry keeps the learner-facing dictionary/base display form, while the example may use the natural form required by the target sentence. Do not force exact string repetition in examples: `en burk -> Burken ...`, `et lokk -> Lokket ...` and comparable definite/case/conjugated forms are valid when they preserve the same lexical item and semantic scene. For aspect-bearing languages, tense/aspect/person/number changes are allowed only when they preserve the same meaning. A Russian imperfective display verb such as `смешивать` should not be exemplified only by a perfective infinitive such as `Смешать тесто.` unless the card explicitly teaches an aspect-neutral pair; prefer a same-aspect form such as `Я смешиваю тесто.`.

Number/quantity example rule: for number-heavy decks, the target example may inflect the display number or use a natural counter/linker/classifier form, but it must preserve the same counted scene and satisfy target-language number grammar. `number_example_grammar` evidence is required for final-ready number/quantity rows; a generic “natural example” claim cannot replace proof of agreement, classifier/counter/linker, script consistency and scene preservation.

Target example pedagogical-quality rule: a translated example must be useful for learning the target word, not only correct. It should give a concrete state/action/location that contrasts the item from its category or nearby meanings. If the base English scene is weak, repair the base scene first and then refresh translated examples/evidence; do not patch only one target language to hide a bad canonical anchor.

Example template diversity rule: a deck should not teach every card through one repeated sentence frame. Even when each example is locally grammatical, mass repetition such as many rows of `X is on the shelf` weakens learning and can hide bad semantic scenes. The deterministic deck-level checker blocks systemic repetition and leaves smaller natural repetitions as warnings.

## Register and formality

Для vocabulary cards базовая языковая запись должна хранить dictionary/base form.

Примеры:

```text
Japanese vocabulary: 食べる
Korean vocabulary: 먹다
```

Пример использования не обязан повторять dictionary form. Он должен быть естественным для learner-friendly контекста.

Для глаголов это означает:

- vocabulary entry хранит базовую форму: `to run`, `бегать`, `laufen`;
- пример хранит естественную спрягаемую форму: `She runs every day.`, `Она бегает каждый день.`;
- время, аспект, лицо, число и ситуация должны совпадать по смыслу во всех языках;
- нельзя переводить present/habitual пример прошедшим временем или другой ситуацией.

Недопустимо:

```text
EN example: He runs every day.
RU example: Он бежал вчера.
```

Здесь изменены tense, time reference и ситуация.

Для языков, где английский глагол распадается на разные базовые значения, нужно создавать разные `meaning_id`.

Пример для Russian:

```text
meaning_id: run_habit_exercise
EN word: to run
RU word: бегать
EN example: She runs every morning.
RU example: Она бегает каждое утро.

meaning_id: run_move_now
EN word: to run
RU word: бежать
EN example: The boy is running to the door.
RU example: Мальчик бежит к двери.
```

Если дружеская, вежливая, formal или honorific форма сильно отличается от базовой формы, это не заменяет vocabulary entry. Правило:

- `native_word` / базовая карточка хранит dictionary/base form;
- пример хранит естественную surface form;
- `usage_note` объясняет важное отличие, если оно нужно ученику;
- отдельная форма создается как vocabulary/lexical item только если сама форма является учебной целью.

Это особенно важно для Japanese, Korean, Thai, Vietnamese, Hindi/Nepali/Bengali and other languages with strong politeness/register systems.

Если для языка есть отдельное правило в [Language Specific Rules](language-specific-rules.md), оно уточняет этот общий принцип. Если правило спорное или не покрывает конкретный item, language entry получает `needs_review`.

## Транскрипция

Транскрипция нужна для карточки как одно пользовательское значение, а не как набор вариантов.

Финальное поле для карточки:

```text
transcription
```

Для каждого языка формат `transcription` зафиксирован в [Language Transcription Policy](language-transcription-policy.md). В карточке нельзя отдавать несколько вариантов транскрипции или оставлять выбор на этапе spreadsheet-выдачи.

Если слово в карточке показывается с артиклем, родом или грамматическим маркером, `transcription` должна соответствовать этому отображаемому слову целиком.

Пример:

```text
EN word: a table
EN transcription: /ə ˈteɪbəl/
DE word: der Tisch
DE transcription: /deːɐ̯ tɪʃ/
```

Внутренние поля `romanization`, `romanization_system` и `pronunciation_ipa` могут использоваться только как служебные источники и QA-поля. Они не являются отдельными пользовательскими колонками, если spreadsheet contract ожидает одну транскрипцию.

## Рекомендуемая структура данных

Минимальная структура смысловой карточки:

```text
content_type
meaning_id
domain
area
category
topic
canonical_meaning
semantic_scene
source_language
source_word
source_word_with_article
part_of_speech
register
formality
priority_band
set_memberships[]
tags[]
language_entries[]
```

Non-vocabulary identifiers and intent fields are not part of the current vocabulary card export and must not appear as active requirements for generation.

Минимальная структура языковой версии:

```text
language_code
language_name
word
word_with_article_or_marker
article_or_marker
gender
transcription
romanization
romanization_system
pronunciation_ipa
pronunciation_status
example
usage_note
quality_status
```

## Контроль качества

Полный QA-контур, gate criteria и review-решения описаны в [QA Process](qa-process.md). Этот раздел фиксирует предметные требования к содержанию карточки.

Перед final export карточек нужно проверять:

- слово относится к заявленной теме;
- выбранное слово прошло deck-scoped `word_selection_quality`, то есть подходит именно этой колоде, уровню, priority and scope;
- перевод сохраняет нужное значение;
- пример сохраняет общий смысл во всех языках;
- English context example прошел `base_example_alignment` and `example_quality`;
- English context example also passes deterministic base-example naturalness checks for tautology, repeated templates and generic placeholders;
- артикль, род или грамматический маркер корректны;
- entry/display rows are not English fallback or mass cross-language copied surfaces;
- nearby meanings keep learnable contrast in display/examples;
- `transcription` заполнена по единой политике языка;
- служебные `romanization` и `pronunciation_ipa`, если используются, не противоречат финальной `transcription`;
- пример звучит естественно;
- не используется слишком редкое, книжное или региональное слово без причины;
- нет машинной кальки, которая меняет смысл или звучит неестественно.
