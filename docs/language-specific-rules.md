# Language Specific Rules

Этот документ является source of truth по языковым особенностям, которые влияют на генерацию и QA карточек LunaCards.

Статус: v1 guardrails. Это не полная грамматика 54 активных языковых вариантов и не native-speaker approval. Это практическая матрица, чтобы не повторять типовые ошибки при переводе `meaning_id`, примеров и display form.

## Назначение

Этот документ отвечает за вопросы:

- какую форму слова показывать в карточке;
- где нужны артикли, род, классификаторы или другие учебные маркеры;
- как вести глаголы и формы в примерах;
- какие английские значения нужно разделять на разные `meaning_id`;
- какие языки или правила требуют `needs_review`;
- какие ошибки нужно ловить в QA.

Не дублировать здесь [Language Transcription Policy](language-transcription-policy.md). Транскрипция фиксируется там. Здесь фиксируются грамматика, display form, пример и language-specific traps.

## Главный принцип

Каждый язык локализуется к общей смысловой базе:

```text
meaning_id -> meaning_note -> semantic_scene -> language-specific word/example
```

Нельзя строить отдельные независимые базы для пар языков. Пары собираются через общий `meaning_id`.

Если один English surface word требует разных слов или разных грамматических решений в другом языке, нужно:

1. проверить `meaning_note`;
2. проверить `semantic_scene`;
3. при необходимости создать отдельный `meaning_id`;
4. не заставлять один translation entry покрывать разные смыслы.

## Universal Rules

- Vocabulary entry хранит dictionary/base display form.
- Example хранит естественную surface form.
- Example обязан сохранять `semantic_scene`, даже если грамматика языка перестраивает фразу.
- `semantic_scene` describes meaning, not literal helper words. Locative/state fields such as `action_or_state` and `state_or_location` must not be copied word-for-word into target examples when the target language has a more natural construction.
- Example casing follows target-language sentence norms. Languages with sentence case start examples with a capital first cased letter; scripts/languages without sentence capitalization are not forced into capitalization. `KA` Georgian is treated as no sentence capitalization for this project rule.
- CJK examples must use normal target-script spacing. `ZH` must not insert artificial spaces between Chinese characters, and `JA` must not insert artificial spaces between kanji/kana tokens, particles and verbs. Examples such as `准备 蔬菜。` or `野菜を 準備する。` are blockers; use `准备蔬菜。` and `野菜を準備する。`.
- TH examples for simple cards must not use generated word-segmentation spaces inside one Thai clause. A tokenized action example such as `เตรียม ผัก.` is a blocker; use a natural Thai clause such as `เตรียมผัก.`. Spaces in Thai are reserved for normal phrase/sentence boundaries, not for machine word segmentation in these short examples.
- KM and LO action examples for simple cards must not use generated word-segmentation spaces inside one short action clause. Tokenized examples such as `រៀបចំ បន្លែ។` or `ກຽມ ຜັກ.` are blockers; use natural short clauses such as `រៀបចំបន្លែ។` and `ກຽມຜັກ.`.
- KM and LO short locative examples must not isolate the locative marker with machine-token spaces. For simple noun-location cards, use a normal compact clause such as `ប្រអប់ផ្ទុកអាហារនៅក្នុងទូផ្ទះបាយ។` or `ກ່ອງເກັບອາຫານຢູ່ໃນຕູ້ຄົວ.`, not `X នៅ Y` / `X ຢູ່ Y` with generated token spaces around the marker.
- MY examples for simple imperative/action scenes must not turn the card into a purpose/infinitive template with `ရန်`. For a scene like `Prepare the vegetables.`, use a natural action clause such as `ဟင်းသီးဟင်းရွက်ကိုပြင်ဆင်ပါ။`, not an infinitive-purpose phrase.
- Vocabulary display form must not be artificial Title Case. Keep dictionary/base casing, except where language rules, proper nouns, acronyms or standard learner display require capitalization.
- Language code identity is part of language quality: a row must use the script and language expected for the DB code. `MY` means Burmese/Myanmar script and language in this project, not Malay. Latin fallback is blocked for languages whose learner display must be Cyrillic, Indic, CJK, Thai, Lao, Khmer, Georgian or Armenian.
- Артикль, род, classifier, case marker или politeness marker добавляется только если это нормальная учебная практика или нужно для смысла.
- Языкам без артиклей нельзя добавлять искусственные артикли.
- Если polite/honorific/friendly form сильно меняет слово или фразу, это usage note или отдельный vocabulary/lexical item только после явного решения, а не замена базовой vocabulary entry.
- Если язык требует другую лексему из-за aspect/direction/classifier/register, это `needs_review` или отдельный `meaning_id`.
- Auto-QA не делает language entry `approved` для всех 54 активных языковых вариантов.

## Target Example Naturalness

This section is the source of truth for the `target_example_naturalness` QA layer.

The target-language example must preserve the `semantic_scene`, but it should use the target language's normal grammar. Do not force English helper wording from the scene into the translation. This matters especially for languages with zero copula, case/postposition location marking, adjective predicates, locative predicates, classifiers or flexible word order.

For Russian locative and state/adjective examples:

- good: `Тарелка на столе.`
- good controlled locative: `Губка лежит рядом с раковиной.`, `Мусорное ведро стоит под столешницей.`, `Средство хранится под раковиной.`
- avoid in generated decks: repeating `находится/находятся` for most noun-location rows when a concrete verb such as `лежит`, `стоит` or `хранится` is more natural.
- bad state/adjective calque: `Кухонная раковина находится чистая.`

If the scene says an object is clean, full, closed, dry, white or another state/adjective, Russian normally uses an adjective predicate such as `Кухонная раковина чистая.`. `находится` is grammatically possible for real location predicates, but the production contour should not use it as the default template for every object-location card.

Confirmed naturalness blockers for simple noun-location/state examples:

- `KO`: topic/subject particles must attach directly to the preceding word and use the natural particle form: `도시락통은 ...`, not `도시락통 은 ...`.
- `HI`: put the postposition/location phrase before the copula and do not duplicate `है`: `लंच बॉक्स काउंटर पर है।`, not `लंच बॉक्स है काउंटर पर।`; `रसोई सिंक साफ है।`, not `रसोई सिंक है साफ है।`.
- `SI`: put the location/state predicate before `තිබේ`: `... කවුන්ටරය මත තිබේ.`, not `... තිබේ කවුන්ටරය මත.`.
- `HY`: do not use literal `X է location/state է` word order. Use a natural existential/state construction such as `Սննդի տարա կա խոհանոցի պահարանում։` or `Խոհանոցի լվացարանը մաքուր է։`.
- `AZ`, `UZ`, `KK`: for this controlled profile, prefer location-before-existential order, e.g. `Mətbəx şkafında qida qabı var.`, `Oshxona shkafida oziq-ovqat idishi bor.`, `Ас үй шкафында азық-түлік контейнері бар.`.
- `TL`: when using `ay` predicate order in these noun-location examples, include the normal learner-facing `Ang` marker: `Ang baunan ay nasa ibabaw ng counter.`, not `Baunan ay ...`.
- `CS` and `SK`: locative/prepositional examples must use the required case/prepositional form, not a bare nominative dictionary copy after `u`, `pri`, `pod`, `nad`, `vedle` / `vedľa`, `v` or `na`.
- `HU`: locative examples should use natural location-phrase-before-`van` order for these controlled noun-location cards, not literal `van közel/mellett/alatt/felett ...` English-order calques.
- `HU`: never ship `A(z)` in examples or display text. It is only a generation helper; choose `A` before consonants and `Az` before vowels.
- `ET` and `FI`: controlled locative examples must use native case/postposition structure, not English preposition order. Good shapes include ET `šampooni kõrval`, `kraanikausi lähedal` and FI `hyllyllä`, `kupissa`, `shampoon vieressä`; bad shapes include `on kõrval šampoon`, `on lähedal kraanikauss`, `on päällä hylly`, `on sisällä kuppi`.
- `HR` and ordinary-deck `SR`: locative prepositions require the target case and plural subjects require plural verbs. Examples such as `iznad umivaonik`, `pokraj toalet`, `na kukica` and `Gumene rukavice je ...` are blockers; use forms such as `iznad umivaonika`, `pokraj toaleta`, `na kukici`, `Gumene rukavice su ...`.
- `RO`: locative examples must use the correct definite/case form after prepositions such as `lângă`, `deasupra`, `pe` and `în`; bare dictionary forms such as `lângă chiuveta` are blockers.
- `PT` / `PT-BR`: examples must use valid verb forms and diacritics such as `está` or `estão`; hybrid spellings such as `estáo` or ASCII-loss `estao` are blockers.

## Number And Quantity Examples

This section is the source of truth for the `number_example_grammar` QA layer.

For number-heavy and quantity decks, target examples must preserve the EN scene and also use target-language number grammar. Natural adaptation is allowed; scene drift is not. A passing row must preserve the target number or number word, counted object, action/state, location/context and simple tense/usage, while satisfying language-specific agreement, classifier/counter/linker and script rules.

Examples of blocked patterns from the 2026-05-02 Numbers repair:

- wrong number + noun agreement: Bulgarian `две ключа` for masculine `ключ`, Latvian masculine forms before feminine plural nouns, Icelandic `þrír bækur`;
- missing quantity linker/counter/classifier: Romanian 20+ noun phrases without `de`, Filipino bare number + noun where a linker is required, Korean fused number+counter strings;
- script inconsistency: Serbian ordinary-deck examples or Course Metadata using Cyrillic or mixing Latin and Cyrillic when the ordinary LunaCards route expects Serbian Latin (Gaj);
- scene drift: a target example that says only `Number: X` when EN says `X apples are in the basket`.

`number_example_grammar` evidence must include current scene slots and concrete proof. A generic claim that the example is short, useful or natural is not enough for final delivery.

## Regional And Sibling-Language QA

Regional variants and sibling/neighbor languages can legitimately share short words, but shared surface forms are no longer silent. The deterministic sibling-copy gate emits review artifacts for:

- `HI/NE`;
- `TA/TE`;
- `MS/ID`;
- `PT/PT-BR`;
- `ES/ES-419`;
- `EN/EN-GB`.

V1 policy: these findings are warnings/needs-review artifacts, not automatic hard fails, unless another gate proves a real fallback/collapse. Examples:

- `EN faucet` should be checked against `EN-GB tap` when the term is region-sensitive.
- `PT` and `PT-BR` may share `a caneca`, but bathroom/kitchen fixtures such as sink/faucet/trash terms need regional attention.
- `MS` and `ID` may share common Malay/Indonesian roots, but identical examples across many rows should be reviewed for copied-language fallback.
- `HI` and `NE` may share Devanagari loanwords, but mass identical entries/examples across a deck should not be treated as proof of correctness.

The optional `regional_variant_quality` evidence layer is required for final-ready `EN-GB`, `ES-419` and `PT-BR` rows only when the canonical term is in the configured regional-risk list. This does not make regional rows native-approved; it records a fresh source-backed/AI-assisted check for the current text.

## V2 Register, Granularity And Marker QA

`entry_form_register` is a mandatory auxiliary evidence layer for final-ready language entries. It checks whether the chosen word is ordinary everyday vocabulary for the deck scope. For household A1/A2 decks, technical plumbing, medical/dental treatment, salon/cosmetics, repair-only or bookish variants are blockers unless the deck spec explicitly asks for them.

`semantic_granularity` is a mandatory auxiliary evidence layer for final-ready language entries. It checks that the translation is not too broad or too narrow when the same deck contains a nearby meaning. Examples of blockers: `body wash -> soap` when `soap` is also in the deck, `bath mat -> rug`, or `washcloth -> towel`. Plausible language-specific broad terms are warning/review artifacts only when the example and surrounding entries preserve the contrast.

`article_gender_marker_consistency` is a mandatory auxiliary evidence layer for final-ready language entries. It checks that `native_word`, `word_with_article_or_marker`, `article_or_marker`, `gender` and `grammatical_number` agree with the language's learner-facing display convention. Confirmed mismatches block. A display word containing an article while the split-out `article_or_marker` field is empty is a warning in V2 unless the display/article contradiction can mislead the learner. Spanish keeps normal learner-facing exceptions such as feminine `el agua` before stressed `a`; this must not be treated as a masculine-gender contradiction.

These auxiliary layers do not override `entry_form`. A row with a non-pass latest `entry_form` remains non-final even if register, granularity or article/gender evidence passes.

## Rule Status

| Статус | Что означает |
| --- | --- |
| `stable_v0` | Правило можно применять в генерации, но generated не равно approved. |
| `needs_review` | Правило или массовая генерация может ошибаться; нужна точечная проверка. |
| `high_risk` | Высокий риск неправильной формы/естественности; без проверки не повышать статус. |

## Language Matrix

| Код | Язык | Display form | Main traps for examples | QA status |
| --- | --- | --- | --- | --- |
| EN | English (US) | American English / US default and canonical base. Countable singular nouns with `a/an`; verbs as `to + base verb`; other POS base form. | Tense/aspect must match `semantic_scene`; irregular plurals and verbs need metadata. Do not silently switch to British-only spelling/vocabulary here. | stable_v0 |
| EN-GB | British English | Same learner display rules as `EN`, but British spelling/vocabulary where it differs. | Usually same as `EN`; watch vocabulary differences such as faucet/tap, trash/bin, apartment/flat. Not the canonical source language. | needs_review |
| ES | Spanish (Spain) | Nouns normally with gender article `el/la`; verbs infinitive. | European Spanish / Spain default. Gender/number agreement; `ser/estar`; prepositions and natural word order. Do not mix Latin American vocabulary where it differs. | stable_v0 |
| ES-419 | Latin American Spanish | Nouns normally with gender article `el/la`; verbs infinitive. | Broad neutral Latin American Spanish. Avoid Spain-only vocabulary/register; keep examples simple enough to work across Latin America. | needs_review |
| FR | French | Nouns with `le/la/l'`; verbs infinitive. | Elision, gender/number agreement, partitive articles, adjective position. | stable_v0 |
| DE | German | Nouns with `der/die/das`; plural-only/plural entries with `die`; verbs infinitive without `zu`. | Case changes in examples, separable verbs, plural forms, gender. | stable_v0 |
| IT | Italian | Nouns with `il/lo/la/l'`; verbs infinitive. | Gender/number agreement, elision, prepositions/articles. | stable_v0 |
| PT | Portuguese (Portugal) | European Portuguese; nouns with `o/a`; verbs infinitive. | Do not mix Brazilian usage; contractions, gender/number agreement, natural European examples. | needs_review |
| PT-BR | Brazilian Portuguese | Brazilian Portuguese; nouns with `o/a`; verbs infinitive. | Do not mix European Portuguese vocabulary/pronunciation/register where it differs; gender/number agreement and natural Brazilian examples. | needs_review |
| RU | Russian | No articles; nouns nominative singular; verbs dictionary infinitive or clear aspect pair if needed. | Aspect and motion verbs: `бегать` vs `бежать`, `идти` vs `ходить`; cases in examples. Do not calque `semantic_scene` helper words: `Тарелка на столе.` is good, `Тарелка находится на столе.` is acceptable for location, but `Кухонная раковина находится чистая.` is bad; use `Кухонная раковина чистая.` for state/adjective predicates. | stable_v0 for RU human-checkable |
| ZH | Chinese (Simplified) | Simplified Chinese characters as word; pinyin only in `transcription`. | Classifiers/measure words in examples, no tense inflection, avoid adding English-style pronouns if unnatural. Do not mix Traditional characters into `ZH`. Do not add artificial internal spaces in examples. | needs_review |
| JA | Japanese | Native script dictionary form; verbs plain dictionary form. | Default vocabulary entry is dictionary/plain form. Default examples use learner-friendly neutral polite `です/ます` style. This is not a contradiction: entry form and example surface form are different fields. Do not add artificial spaces between particles, objects and verbs in examples. | high_risk |
| KO | Korean | Hangul dictionary/citation form; verbs/adjectives normally citation form ending in `-다`. | Default vocabulary entry is citation form. Default examples use learner-friendly polite `해요체` / `-요` endings. This is not a contradiction: entry form and example surface form are different fields. | high_risk |
| VI | Vietnamese | Native orthography with tone marks; no artificial articles. | Classifiers can appear with counted nouns; pronouns depend relationship/register; word order. | needs_review |
| TH | Thai | Thai script base form; no artificial articles. | No inflection; classifiers, particles and politeness can change natural examples; spacing/tokenization risk. Short examples must be natural unsegmented Thai clauses, not word-tokenized strings. Object-specific cooking collocations may be required, for example `หุงข้าว` for a cook-rice scene even when the broad display entry is `ทำอาหาร`. | high_risk |
| MS | Malay | Native orthography; no artificial articles. | Affixes can change voice/register; reduplication/plural meaning; examples should stay simple. | stable_v0 |
| ID | Indonesian | Native orthography; no artificial articles. | Affixes can change voice/register; reduplication/plural meaning; examples should stay simple. | stable_v0 |
| PL | Polish | No articles; nouns nominative singular; verbs infinitive. | Case, gender, aspect pairs, plural and animacy. | needs_review |
| NL | Dutch | Nouns with `de/het` where useful; verbs infinitive. | `de/het`, plural, separable verbs, word order in examples. | needs_review |
| SV | Swedish | Nouns with `en/ett`; verbs infinitive. | Definite suffixes in examples, verb particles, word order. | needs_review |
| NO | Norwegian Bokmål | Spreadsheet code `NO`, database `NB`; nouns with Bokmål `en/et` learner article when useful; verbs infinitive, often with `å` in learner display if needed. | Do not mix Nynorsk. Use a consistent Bokmål learner policy: `en` for common/masculine display, `et` for neuter; avoid `ei` in base display unless explicitly approved. Transcription basis is fixed in Language Transcription Policy. | needs_review |
| DA | Danish | Nouns with `en/et`; verbs infinitive, often with `at` in learner display if needed. | Definite suffixes, word order, difficult pronunciation separate from grammar. | needs_review |
| FI | Finnish | No articles/gender; nouns base nominative; verbs dictionary infinitive. | Cases, consonant gradation, possessive/case endings in examples. | needs_review |
| CS | Czech | No articles; nouns nominative singular; verbs infinitive. | Case, gender, aspect pairs, animacy. | needs_review |
| SK | Slovak | No articles; nouns nominative singular; verbs infinitive. | Case, gender, aspect pairs, animacy. | needs_review |
| HU | Hungarian | No grammatical gender; nouns base singular; verbs dictionary form. | Definite/indefinite conjugation, case suffixes, vowel harmony, word order. | needs_review |
| RO | Romanian | Use learner-useful gender/article marker, often `un/o` for nouns; verbs infinitive. | Definite article suffixes, gender/number agreement, case/prepositions. | needs_review |
| BG | Bulgarian | Base noun; do not force definite suffix unless scene is definite; store gender if useful. | Definite suffixes, gender/number agreement, verb aspect. | needs_review |
| HR | Croatian | No articles; nouns nominative singular; verbs infinitive. | Case, gender, aspect pairs, clitics. | needs_review |
| SR | Serbian | Ordinary LunaCards decks use Serbian Latin (Gaj) for words, examples and Course Metadata. If a separate course contract explicitly uses Cyrillic, transcription uses Latin Gaj. Nouns nominative singular; verbs infinitive. | Case, gender, aspect pairs, script consistency; do not mix ordinary Latin with HSK/Oxford Cyrillic contracts. | needs_review |
| SL | Slovenian | No articles; nouns nominative singular; verbs infinitive. | Case, gender, dual number, aspect. | needs_review |
| LT | Lithuanian | No articles; nouns nominative singular; verbs infinitive. | Case, gender, stress/length not obvious, adjective agreement. | needs_review |
| LV | Latvian | No articles; nouns nominative singular; verbs infinitive. | Case, gender, adjective agreement. | needs_review |
| ET | Estonian | No articles/gender; nouns base singular; verbs dictionary form. | Cases, partitive/genitive choices, quantity distinctions. | needs_review |
| IS | Icelandic | Nouns base nominative with gender metadata if useful; verbs infinitive. | Cases, gender, strong/weak declension, definite suffix. | high_risk |
| HI | Hindi | Devanagari base form; nouns with gender metadata if useful; verbs infinitive/citation form. | Gender agreement, postpositions causing oblique forms, honorific/register. | high_risk |
| BN | Bengali | Bengali script citation form; no grammatical gender. | Classifiers, honorific/register, verb forms, postpositions. | high_risk |
| TL | Filipino | Native orthography; no artificial articles; use common citation/base form. `transcription` copies the final display form. | Focus/voice and aspect can change verb form; examples must preserve semantic role. English/Taglish household loans are allowed only when source-attested and learner-friendly; otherwise use a Filipino/Tagalog form and repair transcription/example together. | needs_review |
| MY | Burmese | Myanmar script base form. | Particles, classifiers, register, romanization inconsistency; examples high risk. For simple imperative/action scenes, do not use `ရန်` purpose/infinitive templates when the English scene is an action command. | high_risk |
| KM | Khmer | Khmer script base form. | Particles/classifiers/context words; romanization and natural examples high risk. Short action examples must not be machine-tokenized with spaces inside one Khmer action clause. | high_risk |
| LO | Lao | Lao script base form. | Classifiers, particles, tones not visible in romanization; natural examples need review. Short action examples must not be machine-tokenized with spaces inside one Lao action clause. | high_risk |
| NE | Nepali | Devanagari base form; nouns/verbs citation form. | Honorific levels, postpositions, agreement, case-like forms. | high_risk |
| SI | Sinhala | Sinhala script citation form. | Case/postpositions, verb forms, register; high risk without verification. | high_risk |
| TA | Tamil | Tamil script citation form. | Agglutinative case markers, tense/person endings, honorific/plural respect. | high_risk |
| TE | Telugu | Telugu script citation form. | Agglutinative case markers, tense/person endings, honorific/register. | high_risk |
| KN | Kannada | Kannada script citation form. | Agglutinative case markers, tense/person endings, honorific/register. | high_risk |
| ML | Malayalam | Malayalam script citation form. | Agglutinative case markers, tense/person endings, honorific/register. | high_risk |
| UZ | Uzbek | Modern Latin Uzbek base form; no artificial articles. | Case/possessive suffixes, verb tense/aspect, Cyrillic vs Latin consistency. | needs_review |
| KK | Kazakh | Native word in Kazakh Cyrillic; no articles; Latin only in `transcription`. | Case/possessive suffixes, vowel harmony, verb forms, Cyrillic consistency. | needs_review |
| AZ | Azerbaijani | Modern Latin base form; no articles. | Case/possessive suffixes, vowel harmony, verb tense/aspect. | needs_review |
| KA | Georgian | Georgian script citation form; no grammatical gender. | Verb agreement/person marking, cases/postpositions, natural examples high risk. | high_risk |
| HY | Armenian | Armenian script citation form. | Definite suffix/use of article-like endings, case, verb forms; romanization review. | high_risk |
| TR | Turkish | Native orthography base form; no articles/gender. | Case/possessive suffixes, vowel harmony, evidential/past distinctions. | needs_review |
| SW | Swahili | Nouns with class prefix; verbs often learner-friendly infinitive with `ku-`. | Noun classes, subject/object agreement, tense/aspect prefixes. | needs_review |

## HSK Classic PL/NL/SV/NO QA Notes

For HSK classic seed packs, keep these target-language naturalness fixes:

- PL/NL/SV/NO: demonstratives such as `这` and `那` should expose normal singular/plural coverage where the language requires it, for example PL `ten; ta; to; ci; te`, SV `den här; det här; de här`, and NO `denne; dette; disse`.
- PL: avoid literal teacher vocatives such as bare `nauczycielu` in address examples; use a normal Polish address form. Weather examples should prefer idiomatic `ładna pogoda` over a direct "weather is good" calque. Duration examples are usually clearer with `przez`.
- NL: static location examples should use normal Dutch verbs such as `ligt`, `staat` or `zit` when bare `is` sounds temporal or calqued. Weather examples should prefer `Het is mooi weer`. Teacher address should use a school address form such as `meester`/`juf`, not bare `leraar`.
- NL/SV/NO: for `听`, preserve the teacher-speaking scene, not only a generic "listen to the teacher" sentence. Use natural forms such as Dutch `Ik luister naar de leraar die spreekt.`, Swedish `Jag lyssnar på läraren som talar.`, and Norwegian Bokmål `Jeg hører på læreren som snakker.`.
- SV/NO: `中午` examples should avoid dinner-ambiguous bare `middag`; prefer `mitt på dagen` / `midt på dagen` or another clearly noon-oriented phrase. For `坐飞机`, use a take/travel-by-plane construction when the row target is `坐`, not only a generic "fly" verb.
- SV/NO: standalone `先生` as direct address should use a natural direct-address form, not an uninflected title fragment.
- ES/PT/RU: demonstratives such as `这` and `那` need learner-visible gender/neuter coverage where the language requires it; avoid misleading one-gender or wrong-deixis entries such as Portuguese `isso` for `这`.
- DE/RU/KO: examples for `回` should preserve return/go-back meaning when the target language has a normal return verb; do not reduce it to a generic "go home" if that weakens the card.
- VI: weather examples should use natural Vietnamese weather phrasing such as `Hôm nay trời đẹp`, not a literal "weather is good" calque.
- IT: female-subject profession examples should use the matching feminine form when it is the natural surface form, for example `Lei è medica`.
- DE: long-distance `去` examples may need `fahren` or `reisen` rather than literal `gehen` when the target destination is Beijing/China.
- FR/DE/IT/PT/PT-BR/ES/ES-419/PL/NL: selected human-role nouns such as `老师`, `学生`, `医生` and `同学` should expose normal learner-facing gender pairs where the language commonly marks them. Do not force this onto languages where a common-gender or gender-neutral form is the normal display.

## HSK Classic DA/FI/CS/SK QA Notes

For HSK classic seed packs:

- DA: use `til skolen` / `på skolen` for concrete school-location examples; avoid `gå i skole` when the Chinese sentence means "go to school" now rather than "attend school". Use `på skolen` for being at school.
- DA: avoid bare `lærer` as a direct vocative in classroom goodbye examples; use a natural school address form when Danish would not address someone as `lærer`.
- FI: pronoun display should use useful object/partitive forms such as `sinua`, `minua` and `meitä`, not only total-object forms such as `minut` / `meidät`. Examples need Finnish local cases rather than literal prepositions, and `没` should use `ei ole` rather than an infinitive-like negative form.
- DA/FI/CS/SK: demonstratives such as `这` and `那` should expose gender/number where the language requires it, for example Danish `denne; dette; disse`, Finnish `tuo; nuo; se`, Czech `tento; tato; toto; tito/tyto`, and Slovak `tento; táto; toto; títo/tieto`.
- CS/SK: keep motion and location cases explicit in examples. For `来`, do not add a vehicle-specific verb unless the Chinese example has one. For `听`, prefer a natural subordinate clause when translating "listen to the teacher speak".
- CS/SK: prefer everyday `kamarád` / `kamarát` for ordinary `朋友` examples so the card does not drift toward "boyfriend/girlfriend" or formal-register `přítel` / `priateľ`. Counted animate masculine examples must still use correct forms, such as Czech `čtyři kamarády` and Slovak `štyroch kamarátov`.

## HSK Classic SR/SL/LT/LV QA Notes

For HSK classic seed packs:

- SR: keep the HSK pack consistently in Serbian Cyrillic. Do not mix Latin Serbian into the word/example cells. Gendered profession examples should use the surface gender required by the sentence, for example `Она је лекарка.` when the subject is female.
- SR/SL/LT/LV: do not add artificial articles. These languages stay in base/citation form, but demonstratives and small numbers should expose useful gender/number variants where a single masculine form would hide a normal learner-facing distinction, for example `два; две`, `dva; dve`, `du; dvi`, `divi; divas`.
- SR/SL/LT/LV: demonstratives such as `这`, `那` and interrogative `哪` need gender/number coverage where the target language requires it. Avoid one-gender entries such as only masculine `tas` / `šis` for meanings that also cover "that/those" or "this/these".
- SL: for `听`, avoid a literal "teacher, when speaking" calque. Use a natural subordinate construction such as `Poslušam, kako učitelj govori.`.

## HSK Classic ET QA Notes

For HSK classic seed packs:

- ET has no articles and no grammatical gender. Keep noun entries in base singular where possible, verbs in dictionary `-ma` form, and do not invent gender markers for pronouns or human-role nouns.
- ET examples should use natural Estonian cases instead of copying English prepositions: `laual`, `koolis`, `Pekingis`, `Pekingisse`, `Hiinasse`, `taksoga`, `lennukiga`.
- After numerals, use the natural counted form in examples, for example `kaheksa raamatut`, `kolm tassi`, `viis õuna`.
- For `听`, preserve the teacher-speaking scene with a subordinate clause such as `Ma kuulan, kuidas õpetaja räägib.`
- For spatial words, prefer native locative adverbs over literal side/body-part wording: `前面` -> `ees; eespool`, `后面` -> `taga; tagapool`.
- For phone greeting `喂`, use normal Estonian phone forms such as `halloo; kuulen`, not a descriptive phrase.

## HSK Classic IS QA Notes

For HSK classic seed packs:

- IS has no indefinite articles in the HSK word column. Keep noun entries in nominative base/citation form and do not add definite suffixes unless the suffix is part of a natural example surface form.
- Expose normal gender/number variants where a single form would hide core Icelandic learner-facing distinctions, especially `一`, `二`, `三`, `四`, `这`, `那` and `哪`.
- IS examples must use natural Icelandic cases after prepositions and verbs, for example `í skólanum`, `í skólann`, `á borðinu`, `fyrir framan skólann`, `fyrir aftan borðið`, `til Peking`, `til Kína`.
- For Chinese grammar labels in IS, prefer native Icelandic grammar terms: `ögn` / `spurnarögn` for particles and `mæliorð` for Chinese measure/classifier words. Avoid calqued or over-English `partikill` / `talningarorð` in final word cells.
- Use natural contracted question forms in examples where they are standard written Icelandic, for example `hefurðu`, `kemurðu`, `áttu`.
- For `听`, preserve the teacher-speaking scene with a construction such as `Ég hlusta á kennarann tala.`
- For `坐飞机`, use the natural transport construction `fara með flugvél`, not only bare `fljúga`, so the `坐`/transport sense remains visible.

## HSK Classic HI QA Notes

For HSK classic seed packs:

- HI word and example cells must use Devanagari only. Do not add target-language romanization or Latin fallback.
- HI has no articles in the HSK word column. Use normal dictionary/base forms: nouns in direct form where possible and verbs in infinitive `-ना` form.
- Show useful gender variants in short adjective/interrogative word cells where one form would hide ordinary Hindi learner-facing distinctions, for example `बड़ा; बड़ी; बड़े`, `अच्छा; अच्छी; अच्छे`, `कौन-सा; कौन-सी; कौन-से`.
- Examples should use natural Hindi postpositions and oblique forms: `मेज़ पर`, `स्कूल के सामने`, `रेस्तराँ के पीछे`, `हवाई जहाज़ से`, `बीजिंग में`, `कप में`.
- Prefer gender-neutral Hindi examples where natural (`मुझे ...`, `मेरे पास ...`, `मेरी उम्र ...`). If a simple first-person verb requires gender, the seed pack may use a consistent masculine default until native review requests a different policy.
- Where the Chinese card is explicitly female (`她`) but Hindi pronouns are not gender-marked, mark the female referent naturally through the predicate noun when useful, for example `वह छात्रा है।`
- Use idiomatic Hindi quantity/duration phrasing in examples, for example `मेरे बहुत से दोस्त हैं` and `मैं पाँच मिनट पढ़ता हूँ`, not literal or heavy nominal calques.
- Preserve the `听` teacher-speaking scene with a Hindi construction such as `मैं शिक्षक को बोलते हुए सुनता हूँ।`
- For direct teacher address in Hindi examples, use natural local address (`सर`/`मैडम`) rather than a literal `शिक्षक जी` unless the row specifically needs the noun itself.

## HSK Classic BN QA Notes

For HSK classic seed packs:

- BN word and example cells must use Bengali script only. Do not add target-language romanization or Latin fallback.
- BN has no articles and no grammatical gender in the HSK word column. Use normal Bengali base/citation forms.
- Use Bengali classifier/count forms naturally in examples, for example `একটি বই`, `আটটি বই`, `তিনটি কাপ`, `চারজন বন্ধু`, `পাঁচটি আপেল`.
- Keep location examples as full natural Bengali clauses when clarity matters: `স্কুলের সামনে আছে`, `রেস্তোরাঁর পেছনে আছে`, `টেবিলের ওপর আছে`, `টেবিলের নিচে আছে`.
- Bengali `সে` is gender-neutral. If the Chinese row is explicitly `她`, mark the female referent naturally through the predicate noun when useful, for example `সে একজন ছাত্রী।`
- Preserve `听` with the teacher-speaking scene, for example `আমি শিক্ষককে কথা বলতে শুনি।`
- Preserve HSK semantic contrasts in simple examples: `太` should read as excessive/too much (`খুব বেশি`, `অতিরিক্ত`), not only neutral `খুব`; generic like examples can use natural Bengali `ভালো লাগে` phrasing.
- For direct teacher goodbye, use normal local address such as `স্যার`/`ম্যাডাম` rather than a literal `শিক্ষক`.
- For `先生` direct address, prefer normal Bengali learner-facing address such as `স্যার` over overly literary `মহাশয়` unless the row specifically needs that register.

## TL / Filipino Practical Notes

TL is a native-copy language in this project: `transcription` must equal the final display form. That means an English fallback in `native_word` is not hidden by transcription QA; entry/display translation has its own source-backed gate. For household terms, prefer common Filipino/Tagalog learner forms when available (`palara`, `tuwalyang papel`, `paminggalan`, `banyera`, `serbilyeta`, `bandeha`, `siyansi`, `saro`, `sipit ng Intsik`). Keep English/Taglish product loans only when current-value-locked source evidence shows they are normal learner-facing Philippine usage for that exact meaning, for example selected baking supply or product-label terms.

TL examples should be short natural Filipino, usually locative patterns such as `Nasa ... ang <word>.`, `Malapit sa ... ang <word>.` or a direct imperative for action cards. Do not preserve English word order mechanically when Filipino focus/voice or locative structure requires a different surface form.

For HSK classic seed packs:

- TL HSK word cells use normal Filipino/Tagalog citation forms without artificial articles. English loans are allowed only when they are normal Filipino learner-facing usage; prefer Filipino spellings such as `kompyuter`, `taksi`, `restawran` and `titser` when used.
- Use natural Filipino linker and number forms in examples: `walong libro`, `tatlong tasa`, `apat na kaibigan`, `limang mansanas`.
- Preserve Filipino clitic/pronoun distinctions where useful: `我` should expose `ako` plus common clitic/possessive forms such as `ko`/`akin`; `你` should expose `ikaw`/`ka`/`mo`; `我们` should expose both `kami`/`tayo` and `namin`/`natin`, while examples may choose one natural reading.
- Filipino `siya` is gender-neutral. If an HSK row contrasts `他`/`她`, the word cell may stay identical, but the example should preserve the Chinese referent when possible, for example `Babaeng estudyante siya.` for `她`.
- Use `nang` for duration/adverbial time where required, for example `Nag-aaral ako nang limang minuto.`
- For HSK `太`, prefer excessive-degree wording such as `masyado` rather than neutral `napaka-`.
- For direct address in HSK examples, common Filipino address loans such as `sir` and `miss` can be more natural than overly formal `ginoo` / `binibini`; keep the word cell broad enough to show both learner dictionary forms and normal address usage.

## HSK Classic MY QA Notes

For HSK classic seed packs:

- MY word and example cells must use Myanmar script only. Do not add target-language romanization, IPA, Latin fallback or transcription in HSK word/example columns.
- MY has no articles in the HSK word column. Use normal Burmese citation/base forms; verbs can appear as simple `-သည်` citation/display forms.
- Use Burmese count/classifier forms naturally in examples, for example `စာအုပ်ရှစ်အုပ်`, `စာအုပ်တစ်အုပ်`, `သူငယ်ချင်းတစ်ယောက်`, `ခွက်သုံးခွက်`, `ပန်းသီးငါးလုံး`.
- Location examples should be full Burmese clauses with `တွင်` / `ပေါ်တွင်` / `အောက်တွင်` / `ရှေ့တွင်` / `နောက်မှာ` and a final predicate such as `ရှိသည်`; do not leave fragment-like noun phrases.
- Preserve HSK semantic contrasts: `太` should show excessive degree with `လွန်းသည်`, and `听` should preserve the teacher-speaking scene, for example `ဆရာ စကားပြောနေသည်ကို ကျွန်ုပ် နားထောင်သည်။`
- Burmese `သူ` is often gender-neutral; when the HSK row explicitly contrasts `她`, use `သူမ` or a female predicate noun such as `ကျောင်းသူ` where useful.
- Avoid using `ရန်` purpose/infinitive templates as standalone examples for simple action scenes. A true purpose construction such as "go to sleep" can use natural Burmese wording, but an imperative/action example should be a real clause.
- For Chinese grammar particles in HSK word cells, prefer Burmese `အမှုန်` wording over over-literal generic marker labels. Do not render `没`'s not-yet/negative-prefix sense as standalone `မသေး`; use a pattern such as `မ...သေး`.
- Written HSK examples should avoid double intensifiers such as `အလွန်...လွန်းသည်` for `太`; use a clear excessive construction such as `ကြီးလွန်းသည်`. Date, weekday and demonstrative examples should keep natural written Burmese predicates, for example `ယနေ့သည် ... ဖြစ်သည်` and `ဤသည် ... ဖြစ်သည်`.

## HSK Classic KM QA Notes

For HSK classic seed packs:

- KM word and example cells must use Khmer script only. Do not add target-language romanization, IPA, Latin fallback or transcription in HSK word/example columns.
- KM has no articles in the HSK word column. Use normal Khmer base forms and do not invent artificial article or gender markers.
- Short Khmer action examples should be natural clauses, not machine-tokenized word-by-word strings. Do not insert segmentation spaces inside a simple verb-object unit.
- Use Khmer count/classifier wording where natural in examples, for example `សៀវភៅប្រាំបីក្បាល`, `សៀវភៅមួយក្បាល`, `មិត្តភក្តិម្នាក់`, `មិត្តភក្តិបួននាក់`, and `ផ្លែប៉ោមប្រាំផ្លែ`.
- Location examples should use full Khmer predicate clauses with `នៅ`, for example `នៅខាងមុខសាលារៀន`, `នៅលើតុ`, `នៅក្រោមតុ`, and `នៅខាងក្រោយតុ`; avoid fragment-like noun phrases.
- Preserve HSK semantic contrasts: `太` should show excess with `ពេក`, and `听` should preserve the teacher-speaking scene, for example `ខ្ញុំស្តាប់គ្រូនិយាយ។`
- For Chinese grammar particles in HSK word cells, Khmer `ភាគល្អិត...` wording is acceptable when there is no direct lexical equivalent. Keep the cell short and avoid long grammar lessons.
- Check Khmer word boundaries carefully where `ជា` plus a following word could accidentally form another word: for `零不是一`, use a clear phrase such as `សូន្យមិនមែនជាលេខមួយទេ`, not `សូន្យមិនមែនជាមួយទេ`.
- Keep simple Khmer examples idiomatic rather than over-literal: `谢谢你` can translate naturally as `អរគុណ។`, direct teacher address can use `លាហើយ លោកគ្រូ។`, and date examples should keep a clear space between day and month phrases such as `ថ្ងៃទីមួយ ខែមីនា`.

## HSK Classic LO QA Notes

For HSK classic seed packs:

- LO word and example cells must use Lao script only. Do not add target-language romanization, IPA, Latin fallback or transcription in HSK word/example columns.
- LO has no articles in the HSK word column. Use normal Lao base forms and do not invent artificial article or gender markers.
- Short Lao action examples should be natural clauses, not machine-tokenized word-by-word strings. Do not insert segmentation spaces inside a simple verb-object unit.
- Use Lao classifier wording where natural in examples, for example `ປຶ້ມແປດເຫຼັ້ມ`, `ປຶ້ມໜຶ່ງເຫຼັ້ມ`, `ເພື່ອນໜຶ່ງຄົນ`, `ຈອກສາມໃບ`, and `ໝາກໂປມຫ້າໜ່ວຍ`.
- Location examples should be full Lao predicate clauses with `ຢູ່`, for example `ຢູ່ຂ້າງໜ້າໂຮງຮຽນ`, `ຢູ່ເທິງໂຕະ`, `ຢູ່ລຸ່ມໂຕະ`, and `ຢູ່ຂ້າງຫຼັງໂຕະ`; avoid fragment-like noun phrases.
- Preserve HSK semantic contrasts: `太` should show excess with `ເກີນໄປ`, and `听` should preserve the teacher-speaking scene, for example `ຂ້ອຍຟັງຄູເວົ້າ.`
- For Chinese grammar particles in HSK word cells, Lao `ຄຳຊ່ວຍ...` wording is acceptable when there is no direct lexical equivalent. Keep the cell short and avoid long grammar lessons.
- Keep examples idiomatic rather than over-literal: `出租车` should normally be `ລົດແທັກຊີ`, `下` as a location under a table should surface as `ລຸ່ມ`, and date examples should keep a clear break between day and month phrases such as `ວັນທີໜຶ່ງ ເດືອນມີນາ`.

## HSK Classic NE QA Notes

For HSK classic seed packs:

- NE word and example cells must use Devanagari only. Do not add target-language romanization, IPA or Latin fallback in HSK word/example columns.
- NE has no articles in the HSK word column. Use normal Nepali base/citation forms; verbs should normally be infinitives such as `खानु`, `पिउनु`, `जानु`, and `सिक्नु`.
- Use natural Nepali postpositions and locative forms in examples: `बेइजिङमा`, `स्कूलको अगाडि`, `रेस्टुरेन्टको पछाडि`, `टेबलमा`, `टेबलमुनि`, `कपभित्र`, and `ट्याक्सी चढेर`.
- Use Nepali count/classifier wording where natural in examples, for example `आठवटा किताब`, `एउटा किताब`, `एक जना साथी`, `तीनवटा कप`, `चार जना साथी`, and `पाँचवटा स्याउ`.
- Keep formality consistent. Unknown-person apology/direct-address examples can use `तपाईं` / `-नुहुन्छ`; ordinary learner examples can use `तिमी` / `छौ`.
- Respectful human-role examples should use natural Nepali honorific surface forms where a bare `त्यो ... हो` would sound disrespectful, especially for `老师` / `那是我的老师`.
- Preserve HSK semantic contrasts: `太` should show excess with `अति` or another too-much construction, and `听` should preserve the teacher-speaking scene, for example `म शिक्षकले बोलेको कुरा सुन्छु।`
- Do not copy Hindi surface patterns into Nepali when Nepali uses a different construction. For `有`, avoid Hindi-like `पास हुनु`; use Nepali `सँग ... हुनु` / `छ` constructions in examples and short display wording.
- For Chinese grammar particles in HSK word cells, short Nepali labels such as `प्रश्नसूचक कण` or `पूर्णता सूचक कण` are acceptable when there is no direct lexical equivalent. Keep the cell short and avoid long grammar lessons.

## HSK Classic SI QA Notes

For HSK classic seed packs:

- SI word and example cells must use Sinhala script only. Do not add target-language romanization, IPA or Latin fallback in HSK word/example columns.
- SI has no articles in the HSK word column. Use normal Sinhala base/citation forms; verbs should normally be verbal-noun or citation-like learner forms such as `කන්න`, `බොන්න`, `යන්න`, `ඉගෙන ගන්න`, and `කැමති වෙනවා`.
- Use natural Sinhala SOV clauses and predicates in examples. Location examples should use ordinary Sinhala wording such as `බෙයිජිංවල`, `බෙයිජිංට`, `පාසල ඉදිරිපිට`, `මේසය උඩ`, `මේසය යට`, `කෝප්පය ඇතුළේ ... තියෙනවා`, and `පාසලේ ඉන්නවා`.
- Use Sinhala count/classifier wording where natural in examples, for example `පොත් අටක්`, `එක පොතක්`, `මිතුරෙක්`, `කෝප්ප තුනක්`, `මිතුරන් හතර දෙනෙක්`, and `ඇපල් ගෙඩි පහක්`.
- Keep formality and respect natural for human-role examples. Direct-address examples may use `මහත්මයා`, `මෙනවිය`, or respectful teacher address such as `ගුරුතුමනි`; ordinary learner examples can use `ඔයා`, while more formal apology examples can use `ඔබ`.
- Preserve HSK semantic contrasts: `太` must show excess with `ඕනෑවට වඩා`, and `听` must preserve the teacher-speaking scene, for example `මම ගුරුවරයා කතා කරන දේ අහනවා.`
- For Chinese grammar particles in HSK word cells, short Sinhala labels such as `ප්‍රශ්න පදය`, `සම්පූර්ණ ක්‍රියාව දක්වන පදය`, or `අයිති පදය` are acceptable when there is no direct lexical equivalent. Keep the cell short and avoid long grammar lessons.

## HSK Classic TA QA Notes

For HSK classic seed packs:

- TA word and example cells must use Tamil script only. Do not add target-language romanization, IPA or Latin fallback in HSK word/example columns.
- TA has no articles in the HSK word column. Use normal Tamil base/citation forms; verbs may use learner-friendly verbal nouns such as `சாப்பிடுதல்`, `குடித்தல்`, `செல்லுதல்`, `போகுதல்`, `கற்றல்` or another short Tamil citation form.
- Use natural Tamil case-marked examples instead of copying English prepositions: `பெய்ஜிங்கில்`, `பெய்ஜிங்குக்கு`, `பள்ளியில்`, `பள்ளிக்குச்`, `டாக்ஸியில்`, `விமானத்தில்`, `கோப்பையில்`, `மேசையின் மேல்`, `மேசையின் கீழ்`, and `பள்ளியின் முன்னால்`.
- Use Tamil quantity wording naturally in examples, for example `எட்டு புத்தகங்கள்`, `ஒரு புத்தகம்`, `ஒரு நண்பர்`, `மூன்று கோப்பைகள்`, `நான்கு நண்பர்கள்`, and `ஐந்து ஆப்பிள்கள்`.
- Keep respect/register natural. Human-role examples can use `ஆசிரியர்` with respectful singular verbs such as `இருக்கிறார்`; direct-address examples can use `ஐயா`, `செல்வி`, or vocative `ஆசிரியரே`.
- Preserve HSK semantic contrasts: `太` must show excessive degree, for example `தேவைக்கு அதிகமாகப் பெரியது`; `听` must preserve the teacher-speaking scene, for example `ஆசிரியர் பேசுவதை நான் கேட்கிறேன்`; `回` should preserve return meaning with `திரும்பு`; `能` can be a natural permission/ability question such as `நான் செல்லலாமா?`.
- For Chinese grammar particles in HSK word cells, short Tamil labels such as `கேள்வித் துகள்`, `நிறைவு குறிக்கும் துகள்`, or `உடைமைத் துகள்` are acceptable when there is no direct lexical equivalent. Keep the cell short and avoid long grammar lessons.

## HSK Classic TE QA Notes

For HSK classic seed packs:

- TE word and example cells must use Telugu script only. Do not add target-language romanization, IPA or Latin fallback in HSK word/example columns. Telugu-script loans such as `టీ`, `టాక్సీ`, `కంప్యూటర్`, `డాక్టర్`, `సార్` and `మిస్` are acceptable when they are the normal learner-facing Telugu form.
- TE has no articles in the HSK word column. Use normal Telugu base/citation forms; verbs may use learner-friendly verbal nouns such as `తినడం`, `తాగడం`, `వెళ్లడం`, `రావడం`, `చదవడం` and `నేర్చుకోవడం`.
- Use natural Telugu case-marked examples instead of copying English prepositions: `బీజింగ్‌లో`, `బీజింగ్‌కు`, `పాఠశాలలో`, `పాఠశాలకు`, `టాక్సీలో`, `విమానంలో`, `కప్పులో`, `మేజాపై`, `మేజా కింద`, `పాఠశాల ముందు` and `రెస్టారెంట్ వెనుక`.
- Use Telugu quantity/count wording naturally in examples, for example `ఎనిమిది పుస్తకాలు`, `ఒక పుస్తకం`, `ఒక స్నేహితుడు`, `మూడు కప్పులు`, `నలుగురు స్నేహితులు` and `ఐదు ఆపిళ్లు`.
- Keep respect/register natural. Parent and teacher examples can use respectful plural verbs such as `ఉన్నారు` / `తాగుతున్నారు`; direct-address examples can use normal Telugu address forms such as `సార్`, `మిస్` and `గురువుగారూ`.
- Preserve HSK semantic contrasts: `太` should show excessive degree, for example `మరీ పెద్దగా ఉంది`; `听` must preserve the teacher-speaking scene, for example `గురువు మాట్లాడుతున్నది నేను వింటాను`; `回` should preserve return meaning with `తిరిగి`; `能` can be a natural permission/ability question such as `నేను వెళ్లవచ్చా?`.
- For Chinese grammar particles in HSK word cells, short Telugu labels such as `ప్రశ్నార్థక కణం`, `పూర్తిని సూచించే కణం`, or `సొంతం సూచించే కణం` are acceptable when there is no direct lexical equivalent. Keep the cell short and avoid long grammar lessons.

## HSK Classic KN QA Notes

For HSK classic seed packs:

- KN word and example cells must use Kannada script only. Do not add target-language romanization, IPA or Latin fallback in HSK word/example columns. Kannada-script loans such as `ಟೀ`, `ಟ್ಯಾಕ್ಸಿ`, `ಕಂಪ್ಯೂಟರ್`, `ಡಾಕ್ಟರ್`, `ಸರ್` and `ಮಿಸ್` are acceptable when they are normal learner-facing Kannada usage.
- KN has no articles in the HSK word column. Use normal Kannada base/citation forms; verbs may use learner-friendly verbal nouns such as `ತಿನ್ನುವುದು`, `ಕುಡಿಯುವುದು`, `ಹೋಗುವುದು`, `ಬರುವುದು`, `ಓದುವುದು`, `ಕಲಿಯುವುದು` and `ಮಾಡುವುದು`.
- Use natural Kannada case-marked examples instead of copying English prepositions: `ಬೀಜಿಂಗ್‌ನಲ್ಲಿ`, `ಬೀಜಿಂಗ್‌ಗೆ`, `ಶಾಲೆಯಲ್ಲಿ`, `ಶಾಲೆಗೆ`, `ಟ್ಯಾಕ್ಸಿಯಲ್ಲಿ`, `ವಿಮಾನದಲ್ಲಿ`, `ಕಪ್‌ನಲ್ಲಿ`, `ಮೇಜಿನ ಮೇಲೆ`, `ಮೇಜಿನ ಕೆಳಗೆ`, `ಶಾಲೆಯ ಮುಂದೆ` and `ರೆಸ್ಟೋರೆಂಟ್ ಹಿಂದೆ`.
- Use Kannada quantity/count wording naturally in examples, for example `ಎಂಟು ಪುಸ್ತಕಗಳು`, `ಒಂದು ಪುಸ್ತಕ`, `ಒಬ್ಬ ಸ್ನೇಹಿತ`, `ಮೂರು ಕಪ್‌ಗಳು`, `ನಾಲ್ವರು ಸ್ನೇಹಿತರು` and `ಐದು ಸೇಬುಗಳು`.
- Keep respect/register natural. Parent and teacher examples can use respectful plural verbs such as `ಇದ್ದಾರೆ`, `ಕುಡಿಯುತ್ತಾರೆ` and `ಮಾತನಾಡುತ್ತಿದ್ದಾರೆ`; neutral `他` examples should not overuse honorific `ಅವರು` unless the predicate or scene calls for respect.
- Preserve HSK semantic contrasts: `太` should show excessive degree, for example `ಅತಿಯಾಗಿ ದೊಡ್ಡದಾಗಿದೆ`; `听` must preserve the teacher-speaking scene, for example `ಶಿಕ್ಷಕರು ಮಾತನಾಡುತ್ತಿರುವುದನ್ನು ನಾನು ಕೇಳುತ್ತೇನೆ`; `回` should preserve return meaning with `ಹಿಂತಿರುಗು`; `能` can be a natural permission/ability question such as `ನಾನು ಹೋಗಬಹುದೇ?`.
- For Chinese grammar particles in HSK word cells, short Kannada labels such as `ಪ್ರಶ್ನಾರ್ಥಕ ಕಣ`, `ಪೂರ್ಣತೆಯನ್ನು ಸೂಚಿಸುವ ಕಣ`, or `ಸ್ವಾಮ್ಯ ಸೂಚಕ ಕಣ` are acceptable when there is no direct lexical equivalent. Keep the cell short and avoid long grammar lessons.

## HSK Classic ML QA Notes

For HSK classic seed packs:

- ML word and example cells must use Malayalam script only. Do not add target-language romanization, IPA or Latin fallback in HSK word/example columns. Malayalam-script loans such as `ടാക്സി`, `കമ്പ്യൂട്ടർ`, `ടിവി`, `ഡോക്ടർ`, `സാർ` and `മിസ്` are acceptable when they are normal learner-facing Malayalam usage.
- ML has no articles in the HSK word column. Use normal Malayalam base/citation forms; verbs may use learner-friendly citation forms such as `കഴിക്കുക`, `കുടിക്കുക`, `പോകുക`, `വരുക`, `വായിക്കുക`, `പഠിക്കുക` and `ചെയ്യുക`.
- Use natural Malayalam case-marked examples instead of copying English prepositions: `ബെയ്ജിംഗിൽ`, `ബെയ്ജിംഗിലേക്ക്`, `സ്കൂളിൽ`, `സ്കൂളിലേക്ക്`, `ടാക്സിയിൽ`, `വിമാനത്തിൽ`, `കപ്പിൽ`, `മേശപ്പുറത്ത്`, `മേശയുടെ താഴെ`, `സ്കൂളിന്റെ മുന്നിൽ` and `ഭക്ഷണശാലയുടെ പിന്നിൽ`.
- Use Malayalam quantity/count wording naturally in examples, for example `എട്ട് പുസ്തകങ്ങൾ`, `ഒരു പുസ്തകമുണ്ട്`, `ഒരു സുഹൃത്തുണ്ട്`, `മൂന്ന് കപ്പുകളുണ്ട്`, `നാല് സുഹൃത്തുക്കളുണ്ട്`, `അഞ്ച് ആപ്പിളുകളുണ്ട്` and quantity wording such as `ധാരാളം ആളുകളുണ്ട്`.
- Prefer neutral learner-facing Malayalam in basic human eating scenes: use `കഴിക്കുക`, `കഴിക്കുന്നു`, `കഴിച്ചു` and `കഴിക്കില്ല` rather than more colloquial or harsh `തിന്നുക` forms.
- Keep respect/register natural. Parent and teacher examples can use respectful or neutral natural forms depending on the scene; neutral `他` examples should not overuse honorific `അദ്ദേഹം` unless the predicate or scene calls for respect.
- Preserve HSK semantic contrasts: `太` should show excessive degree, for example `അത്യധികം വലുതാണ്`; `听` must preserve the teacher-speaking scene, for example `അധ്യാപകൻ സംസാരിക്കുന്നത് ഞാൻ കേൾക്കുന്നു`; `回` should preserve return meaning with `മടങ്ങുക` or `തിരികെ`; `能` can be a natural permission/ability question such as `ഞാൻ പോകാമോ?`.
- For Chinese grammar particles in HSK word cells, short Malayalam labels such as `ചോദ്യകണം`, `പൂർണ്ണത സൂചിപ്പിക്കുന്ന കണം`, or `ഉടമസ്ഥത സൂചിപ്പിക്കുന്ന കണം` are acceptable when there is no direct lexical equivalent. Keep the cell short and avoid long grammar lessons.

## HSK Classic UZ QA Notes

For HSK classic seed packs:

- UZ word and example cells must use modern Latin Uzbek consistently. Do not mix Uzbek Cyrillic into HSK word/example columns. ASCII apostrophe forms such as `o'`, `g'`, `yo'q`, `ko'rmoq`, `o'qimoq` and `to'rt` are acceptable in this workbook.
- UZ has no articles in the HSK word column. Use normal Uzbek base/citation forms; verbs should normally use `-moq` citation forms such as `yemoq`, `ichmoq`, `bormoq`, `kelmoq`, `o'qimoq`, `o'rganmoq` and `qilmoq`.
- Use natural Uzbek case suffixes and postpositions instead of copying English prepositions: `Pekinda`, `Pekinga`, `Xitoyga`, `maktabda`, `maktabga`, `taksida`, `samolyotda`, `stakanda`, `stol ustida`, `stol ostida`, `maktab oldida` and `restoran orqasida`.
- Use normal Uzbek count wording in examples, for example `sakkizta kitob`, `bitta kitob`, `bitta do'st`, `uchta stakan`, `to'rtta do'st` and `beshta olma`.
- Prefer natural Uzbek possession in question examples, for example `Senda nechta do'st bor?`, not a literal possessive calque such as `Sening nechta do'sting bor?`.
- For phone-call scenes, `qo'ng'iroq qilmoq` / `qo'ng'iroq qilyapman` is the preferred natural Uzbek surface form; `telefon qilmoq` can remain as a learner synonym.
- Keep Uzbek pronouns and gender natural. Uzbek `u` is gender-neutral; explanatory display forms such as `u; u erkak` / `u; u ayol` may be used for Chinese `他` / `她`, but examples should not invent unnatural gender marking.
- Preserve HSK semantic contrasts: `太` should show excessive degree with `haddan tashqari`; `听` must preserve the teacher-speaking scene, for example `Men o'qituvchining gapirayotganini eshityapman.`; `回` should preserve return meaning with `qaytmoq`; `能` can be a natural permission/ability question such as `Men borsam bo'ladimi?`.
- For Chinese grammar particles in HSK word cells, short Uzbek labels such as `savol yuklamasi`, `tugallanganlik yuklamasi`, or `egalik yuklamasi` are acceptable when there is no direct lexical equivalent. Keep the cell short and avoid long grammar lessons.

## HSK Classic KK QA Notes

For HSK classic seed packs:

- KK word and example cells must use Kazakh Cyrillic consistently. Do not mix Latin Kazakh, Russian-only fallback, or target-language romanization into HSK word/example columns.
- KK has no articles in the HSK word column. Use normal Kazakh base/citation forms; verbs should normally use verbal noun/citation forms such as `жеу`, `ішу`, `бару`, `келу`, `оқу`, `үйрену`, `істеу` and `жасау`.
- Use natural Kazakh case suffixes and postpositions instead of copying English prepositions: `Бейжіңде`, `Бейжіңге`, `Қытайға`, `мектепте`, `мектепке`, `таксимен`, `ұшақпен`, `стақанда`, `үстелдің үстінде`, `үстелдің астында`, `мектептің алдында` and `мейрамхананың артында`.
- Use normal Kazakh count wording in examples, for example `сегіз кітап`, `бір кітап`, `бір дос`, `үш стақан`, `төрт дос` and `бес алма`.
- For generic preference examples, Kazakh often sounds more natural with the singular/class reading, for example `Маған кино ұнайды` and `Маған алма ұнайды`, rather than unnecessary plurals.
- For fruit vocabulary, `жеміс; жеміс-жидек` and examples such as `Мен жеміс-жидек сатып алып жатырмын` are natural learner-facing Kazakh.
- Keep Kazakh pronouns and gender natural. Kazakh `ол` is gender-neutral; explanatory display forms such as `ол; ер адам` / `ол; әйел адам` may be used for Chinese `他` / `她`, but examples should not invent unnatural gender marking.
- Preserve HSK semantic contrasts: `太` should show excessive degree with `тым`; `听` must preserve the teacher-speaking scene, for example `Мен мұғалімнің сөйлеп жатқанын тыңдап отырмын.`; `回` should preserve return meaning with `қайту`; `能` can be a natural permission/ability question such as `Мен барсам бола ма?`.
- For Chinese grammar particles in HSK word cells, short Kazakh labels such as `сұрақ шылауы`, `аяқталғандық шылауы`, or `тәуелдік көрсеткіші` are acceptable when there is no direct lexical equivalent. Keep the cell short and avoid long grammar lessons.

## HSK Classic AZ QA Notes

For HSK classic seed packs:

- AZ word and example cells must use modern Latin Azerbaijani consistently. Do not mix Azerbaijani Cyrillic, Russian-only fallback, or target-language romanization into HSK word/example columns.
- AZ has no articles in the HSK word column. Use normal Azerbaijani base/citation forms; verbs should normally use infinitive/citation forms such as `yemək`, `içmək`, `getmək`, `gəlmək`, `oxumaq`, `öyrənmək`, `etmək` and `hazırlamaq`.
- Use natural Azerbaijani case suffixes and postpositions instead of copying English prepositions: `Pekində`, `Pekinə`, `Çinə`, `məktəbdə`, `məktəbə`, `taksi ilə`, `təyyarə ilə`, `stəkanda`, `stolun üstündə`, `stolun altındadır`, `məktəbin qarşısında` and `restoranın arxasındadır`.
- Use normal Azerbaijani count wording in examples, for example `səkkiz kitab`, `bir kitab`, `bir dost`, `üç stəkan`, `dörd dost` and `beş alma`.
- For Azerbaijani demonstratives, avoid calqued forms such as `ana o`; use learner-facing `o`, `həmin` and plural coverage where useful. Example sentences should not add an English-style comma after a simple subject: use `O mənim müəllimimdir`.
- For the copula in HSK word cells, show the vowel-harmony variants where the suffix is displayed: `-dır/-dir/-dur/-dür`.
- Keep Azerbaijani pronouns and gender natural. Azerbaijani `o` is gender-neutral; explanatory display forms such as `o; kişi` / `o; qadın` may be used for Chinese `他` / `她`, but examples should not invent unnatural gender marking.
- Preserve HSK semantic contrasts: `太` should show excessive degree with `həddindən artıq`; `听` must preserve the teacher-speaking scene, for example `Mən müəllimin danışdığını eşidirəm.`; `回` should preserve return meaning with `qayıtmaq`; `能` can be a natural permission/ability question such as `Mən gedə bilərəmmi?`.
- For Chinese grammar particles in HSK word cells, short Azerbaijani labels such as `sual hissəciyi`, `tamamlanma hissəciyi`, or `yiyəlik göstəricisi` are acceptable when there is no direct lexical equivalent. Keep the cell short and avoid long grammar lessons.

## HSK Classic KA QA Notes

For HSK classic seed packs:

- KA word and example cells must use Georgian script consistently. Do not mix Latin Georgian, Russian/Cyrillic fallback, or target-language romanization into HSK word/example columns.
- KA has no articles and no sentence capitalization distinction. Use normal Georgian base/citation forms; verbs may use verbal nouns or learner-friendly citation/base forms such as `ჭამა`, `დალევა`, `წასვლა`, `მოსვლა`, `კითხვა`, `სწავლა`, `გაკეთება` and `მომზადება`.
- Use natural Georgian cases and postpositions instead of copying English prepositions: `პეკინში`, `ჩინეთში`, `სკოლაში`, `ტაქსით`, `თვითმფრინავით`, `ჭიქაში`, `მაგიდაზე`, `მაგიდის ქვეშ`, `სკოლის წინ` and `რესტორნის უკან`.
- Use normal Georgian count wording in examples, for example `რვა წიგნი`, `ერთი წიგნი`, `ერთი მეგობარი`, `სამი ჭიქა`, `ოთხი მეგობარი` and `ხუთი ვაშლი`.
- Use natural Georgian child-role nouns in HSK family rows: `ვაჟიშვილი` for `儿子` and `ქალიშვილი` for `女儿`; avoid calqued displays such as `ბიჭი შვილი` unless a future context explicitly needs explanation.
- Keep Georgian gender natural. Georgian `ის` is gender-neutral; explanatory display forms such as `ის; ის კაცი` / `ის; ის ქალი` may be used for Chinese `他` / `她`, but examples should not invent unnatural gender marking.
- When preserving the vehicle-riding sense of `坐`, Georgian examples can use `ვმგზავრობ`, for example `პეკინში თვითმფრინავით ვმგზავრობ`.
- Preserve HSK semantic contrasts: `太` should show excessive degree with `მეტისმეტად`; `听` must preserve the teacher-speaking scene, for example `მასწავლებლის ლაპარაკს ვისმენ`; `回` should preserve return meaning with `დაბრუნება`; `能` can be a natural permission/ability question such as `შეიძლება წავიდე?`.
- For Chinese grammar particles in HSK word cells, short Georgian labels such as `კითხვის ნაწილაკი`, `დასრულებულობის ნაწილაკი`, or `კუთვნილების ნაწილაკი` are acceptable when there is no direct lexical equivalent. Keep the cell short and avoid long grammar lessons.

## HSK Classic HY QA Notes

For HSK classic seed packs:

- HY word and example cells must use Armenian script consistently. Do not add target-language romanization, IPA or Latin fallback in HSK word/example columns.
- HY has no artificial article in the HSK word column. Use Armenian citation/base forms in word cells; do not add the definite suffix `-ը/-ն` to noun entries unless it is part of a fixed lexicalized form.
- Armenian examples may and often should use natural definite suffixes, case endings and postpositions: `Պեկինում`, `Չինաստան եմ գնում`, `դպրոցում`, `դպրոց եմ գնում`, `տաքսիով`, `ինքնաթիռով`, `բաժակում`, `սեղանի վրա`, `սեղանի տակ`, `դպրոցի դիմաց` and `ռեստորանի հետևում`.
- Use normal Armenian count wording in examples, for example `ութ գիրք`, `մեկ գիրք`, `մեկ ընկեր`, `երեք բաժակ`, `չորս ընկեր` and `հինգ խնձոր`.
- Keep word cells in base forms even when examples require definite forms. For example, `点` should display `ժամ`, while the sentence can naturally say `ժամը ութն է`.
- For `东西`, prefer learner-facing `բան; առարկա`; bare `իր` is ambiguous and can read as a possessive pronoun in Armenian.
- For duration examples, Armenian often places the focus marker naturally after the duration phrase, for example `Ես հինգ րոպե եմ սովորում`.
- For `叫` name/calling examples, prefer natural Armenian wording such as `Քեզ ինչպե՞ս են կոչում`, not overly formal `Ինչպե՞ս ես կոչվում`.
- Keep Armenian gender natural. Armenian `նա` is gender-neutral; explanatory display forms such as `նա; նա տղամարդ` / `նա; նա կին` may be used for Chinese `他` / `她`, but examples should not invent unnatural gender marking. If the sentence must show female reference, use a natural predicate noun such as `աշակերտուհի`.
- Preserve HSK semantic contrasts: `太` should show excessive degree with `չափազանց`; `听` must preserve the teacher-speaking scene, for example `Ես լսում եմ, թե ինչպես է ուսուցիչը խոսում`; `回` should preserve return meaning with `վերադառնալ`; `能` can be a natural permission/ability question such as `Կարո՞ղ եմ գնալ։`
- For Chinese grammar particles in HSK word cells, short Armenian labels such as `հարցական մասնիկ`, `ավարտված գործողության մասնիկ`, or `պատկանելության մասնիկ` are acceptable when there is no direct lexical equivalent. Keep the cell short and avoid long grammar lessons.

## HSK Classic TR QA Notes

For HSK classic seed packs:

- TR word and example cells must use native Turkish orthography consistently. Do not add target-language romanization, IPA or non-Turkish fallback in HSK word/example columns.
- TR has no articles and no grammatical gender. Use Turkish base/citation forms in word cells; verbs should normally use infinitive forms such as `yemek`, `içmek`, `gitmek`, `gelmek`, `okumak`, `öğrenmek`, `yapmak` and `hazırlamak`.
- Use natural Turkish case, possessive and postpositional forms in examples instead of copying English prepositions: `Pekin'de`, `Pekin'e`, `Çin'e`, `okulda`, `okula`, `taksiyle`, `uçakla`, `bardakta`, `masanın üzerinde`, `masanın altında`, `okulun önünde` and `restoranın arkasında`.
- Use normal Turkish count wording in examples, for example `sekiz kitap`, `bir kitap`, `bir arkadaş`, `üç bardak`, `dört arkadaş` and `beş elma`.
- Use natural Turkish short replies and date phrasing: `呢` can be `Ya sen?`, and HSK date examples should use forms such as `Bugün 1 Mart` and `Bugün 4 Mayıs`.
- Avoid overly bare calques in simple examples. `Beş dakika ders çalışıyorum`, `Az öğrenci var` and `Çince karakterler yazıyorum` are more natural than bare `Beş dakika çalışıyorum`, `Öğrenci az` and `Karakter yazıyorum`.
- Keep Turkish gender natural. Turkish `o` is gender-neutral; explanatory display forms such as `o; erkek o` / `o; kadın o` may be used for Chinese `他` / `她`, but examples should not invent unnatural gender marking. If the sentence must show female reference, a predicate such as `kız öğrenci` can be used.
- Preserve HSK semantic contrasts: `太` should show excessive degree with `fazla` where natural; `听` must preserve the teacher-speaking scene, for example `Öğretmenin konuşmasını dinliyorum`; `回` should preserve return meaning with `dönmek`; `能` can be a natural permission/ability question such as `Gidebilir miyim?`.
- For Chinese grammar particles in HSK word cells, short Turkish labels such as `soru parçacığı`, `tamamlanmış eylem parçacığı`, or `iyelik parçacığı` are acceptable when there is no direct lexical equivalent. Keep the cell short and avoid long grammar lessons.

## HSK Classic SW QA Notes

For HSK classic seed packs:

- SW word and example cells must use standard Swahili orthography consistently. Do not add target-language romanization, IPA or non-Swahili fallback in HSK word/example columns.
- SW has no articles, but noun class prefixes are part of the lexical form and must be kept: `mtu/watu`, `mwanafunzi/wanafunzi`, `kikombe/vikombe`, `kitabu/vitabu`, `tufaha/matufaha`.
- Verbs should normally use learner-friendly infinitive forms with `ku-` in word cells, for example `kula`, `kunywa`, `kwenda`, `kuja`, `kusoma`, `kujifunza`, `kufanya` and `kuandika`.
- Parent word cells should stay lexical, not possessive: use `baba` and `mama`, not `baba yangu` / `mama yangu`, unless the Chinese source example explicitly says "my".
- For Chinese measure words, `kihesabio` is the preferred short Swahili label, for example `kihesabio cha vitabu` and `kihesabio cha jumla`.
- Use natural Swahili agreement in examples: `Kikombe hiki ni kikubwa`, `Kitabu kiko juu ya meza`, `Paka yuko juu ya kiti`, `Duka liko mbele ya shule`, `Wanafunzi ni wachache`.
- Use natural Swahili location and motion expressions instead of copying English prepositions: `shuleni`, `nyumbani`, `dukani`, `juu ya meza`, `chini ya meza`, `mbele ya shule`, `nyuma ya mgahawa`, `kwa teksi` and `kwa ndege`.
- Use normal Swahili count wording in examples, for example `vitabu nane`, `kitabu kimoja`, `rafiki mmoja`, `vikombe vitatu`, `marafiki wanne` and `matufaha matano`.
- Expose useful class-agreement variants in short HSK word cells where a single form would hide normal Swahili grammar. For example, `这` can show `hii; hiki; hizi`, `小` can show `ndogo; kidogo`, and `哪` should use general `gani` plus location/direction readings.
- Preserve HSK semantic contrasts: `太` should show excessive degree with `mno`; `听` must preserve the teacher-speaking scene, for example `Ninamsikiliza mwalimu akizungumza`; `回` should preserve return meaning with `kurudi`; `能` can be a natural permission/ability question such as `Je, ninaweza kwenda?`.
- For Chinese grammar particles in HSK word cells, short Swahili labels with `partikeli` are preferred, such as `partikeli ya swali`, `partikeli ya tendo lililokamilika`, or `partikeli ya umilikaji`. Avoid `kiambishi` unless the target-language form is actually an affix.

## Native-Copy Loan Review Notes

For native-copy languages outside TL, English-looking household terms can be valid loans (`bidet`, `shampoo`, `pizza`, `timer`, `spatula`) or unchecked fallback. Do not decide by English-token ratio alone. The 2026-05-01 all-language pass resolved the 38 non-TL warnings from `outputs/qa/entry_source_backed_translation_all_language_report_20260501.json`: accepted rows are locked in `reference-sources/manual-decisions/entry-source-decisions.jsonl`, AZ `spatula` is source-backed by Azerbaijani product usage, and 5 confirmed rows were repaired. A row can stay only when a current-value-locked source decision proves learner-facing usage for that exact meaning; otherwise repair entry/display, copy transcription to the new display, refresh examples and rerun final QA/delivery. Final export now enforces this all-language gate.

## Meaning Split Triggers

Создавать отдельный `meaning_id`, если:

- English word имеет разные предметные значения: `table` furniture vs data table.
- English verb распадается по aspect/direction: `to run` as habitual exercise vs moving/running now in Russian.
- Target language требует другой verb focus/voice and semantic role: especially Filipino and Austronesian-style focus systems.
- One English adjective maps to different words by object class, gender, animacy or register.
- Phrase-like translation is natural, but it changes the learning target away from the current vocabulary-only card. Simplify, use a lexical item, or mark `needs_review`.

## QA Checklist For Each Language

При генерации language entries проверять:

- display form соответствует language row above;
- article/gender/classifier не добавлен искусственно;
- examples preserve `semantic_scene`;
- example surface form can differ from dictionary form, but tense/aspect/person/number must match;
- register/formality is not silently changed;
- script is consistent with project policy;
- risky rows stay `needs_review` or `high_risk`, not `approved`.

## Open Issues

Эти вопросы не блокируют pilot, но требуют осторожности:

| Вопрос | Почему важно |
| --- | --- |
| Additional regional/script variants | `EN-GB`, `ES-419`, `PT-BR` добавлены как активные варианты. `ZH` зафиксирован как Simplified Chinese. Другие варианты (`FR-CA`, `ES-MX`, `EN-AU`, `ZH-HANT`) не добавлять без отдельного решения. |
| Sinhala/Burmese/Khmer/Lao natural examples | Высокий риск без точечной проверки. |
| South Asian and Dravidian citation forms | ISO romanization решает transcription, но не гарантирует удобную dictionary display form. |

Все найденные в QA языковые нюансы нужно добавлять в этот документ до следующего батча, чтобы ошибка не повторялась.
