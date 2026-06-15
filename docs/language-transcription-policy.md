# Language Transcription Policy

Этот документ является source of truth по списку языков/языковых вариантов LunaCards и единому формату транскрипции, который показывается в карточке.

Статус: display policy v1 утверждена для пилота.

## Главное решение

В карточке и финальном Google Sheets export есть ровно одно пользовательское поле:

```text
transcription
```

Никакого выбора между IPA, romanization, learner pronunciation и fallback в пользовательском листе быть не должно. Для каждого языка ниже зафиксирован один формат, которым заполняется `transcription`.

Внутренние поля вроде `romanization`, `romanization_system`, `pronunciation_ipa` могут оставаться в базе только как служебные источники для генерации и QA. В пользовательский export уходит одно значение `transcription`.

## Learner-facing формат

Финальная policy остается смешанной и learner-facing: мы не переводим все 54 языка в IPA и не заменяем все на английскую "как слышится" запись. Формат выбирается по языку и фиксируется в таблице ниже:

- для IPA-языков в карточку идет настоящий IPA, подтвержденный source/tool-backed QA;
- для native-orthography языков `transcription` повторяет отображаемое слово, включая диакритику;
- для языков с другим письмом используется стандартная romanization/transliteration или learner romanization, указанная в таблице;
- tone numbers запрещены в финальном output. Для тоновых/тонально-размеченных форматов используются tone marks / tone diacritics: `ZH` pinyin with tone marks, `VI` native Vietnamese tone marks, `TH` and `LO` learner tone diacritics, `MY` tone/register notation;
- диакритики не означают только тоны: `JA` использует macrons, Indic/Sinhala ISO 15919 использует диакритики для буквенных различий, а IPA может использовать stress marks.

## Порядок языков

Машинный source of truth для порядка 54 языковых вариантов в export/template:

```text
config/language-order.json
```

Скрипты используют его через `scripts/lib/language-order.mjs`. Таблица ниже является policy matrix по transcription/display rules; она не должна использоваться как отдельный источник порядка колонок.

## Что именно транскрибируем

`transcription` относится к слову в карточке, не к примеру.

Если в карточке слово показывается с артиклем, родом или грамматическим маркером, `transcription` должна соответствовать этому отображаемому слову целиком.

Пример:

```text
EN word: a table
EN transcription: /ə ˈteɪbəl/
DE word: der Tisch
DE transcription: /deːɐ̯ tɪʃ/
```

Для языков с policy `native orthography` отдельная транскрипция не создается. Чтобы spreadsheet всегда имел одно поле, `transcription` заполняется тем же значением, что и отображаемое слово.

## Единая таблица display-transcription

| Язык | Код Sheets | Код базы | `transcription` в карточке | Правило |
| --- | --- | --- | --- | --- |
| English (US) | EN | EN | IPA | American English / US default. Это canonical base. Писать IPA для отображаемого слова/словосочетания с артиклем, если он есть. |
| Spanish (Spain) | ES | ES | native orthography (no separate transcription by default) | European Spanish / Spain. Повторять отображаемое слово. |
| French | FR | FR | IPA | Писать IPA для отображаемого слова с артиклем/элизией, если они есть. |
| German | DE | DE | IPA | Писать IPA для формы с артиклем; род остается в слове через `der/die/das`. |
| Italian | IT | IT | native orthography | Повторять отображаемое слово. |
| Portuguese (Portugal) | PT | PT | IPA | European Portuguese. Brazilian Portuguese не использовать для `PT`. |
| Russian | RU | RU | practical Latin transliteration (BGN/PCGN-style) | Слово хранится кириллицей, `transcription` латиницей. |
| Chinese (Simplified) | ZH | ZH | Hanyu Pinyin with tone marks | `ZH` = Simplified Chinese. Тоны обязательны. Traditional Chinese не смешивать с `ZH`. |
| Japanese | JA | JA | Modified Hepburn with macrons | Макроны сохранять: `ō`, `ū`. |
| Korean | KO | KO | Revised Romanization | Слово хранится хангылем, `transcription` латиницей. |
| Vietnamese | VI | VI | native orthography with tone marks | Повторять отображаемое слово с диакритикой и тонами. Не упрощать до ASCII-латиницы. |
| Thai | TH | TH | Thai learner romanization with tone diacritics, Paiboon-style | Слово хранится тайским письмом, `transcription` латиницей для ученика с tone diacritics. RTGS без тонов не использовать. |
| Malay | MS | MS | native orthography | Повторять отображаемое слово. |
| Indonesian | ID | ID | native orthography | Повторять отображаемое слово. |
| Polish | PL | PL | IPA | Писать IPA. |
| Dutch | NL | NL | IPA | Писать IPA. |
| Swedish | SV | SV | IPA | Писать IPA. |
| Norwegian Bokmål | NO | NB | IPA | В Google Sheets код `NO`; в базе `NB`. IPA для Bokmål с Urban East Norwegian / Oslo-like pronunciation. |
| Danish | DA | DA | IPA | Писать IPA. |
| Finnish | FI | FI | native orthography | Повторять отображаемое слово. |
| Czech | CS | CS | native orthography | Повторять отображаемое слово. |
| Slovak | SK | SK | native orthography | Повторять отображаемое слово. |
| Hungarian | HU | HU | native orthography | Повторять отображаемое слово. |
| Romanian | RO | RO | native orthography | Повторять отображаемое слово. |
| Bulgarian | BG | BG | official Bulgarian streamlined transliteration | Слово хранится кириллицей, `transcription` латиницей. |
| Croatian | HR | HR | native orthography | Повторять отображаемое слово. |
| Serbian | SR | SR | Serbian Latin (Gaj) | Ordinary LunaCards decks store Serbian display words, examples and Course Metadata in Latin Gaj, so `transcription` repeats the displayed word. If a separate course contract explicitly stores Serbian Cyrillic, `transcription` uses Latin Gaj. |
| Slovenian | SL | SL | native orthography | Повторять отображаемое слово. |
| Lithuanian | LT | LT | native orthography | Повторять отображаемое слово. |
| Latvian | LV | LV | native orthography | Повторять отображаемое слово. |
| Estonian | ET | ET | native orthography | Повторять отображаемое слово. |
| Icelandic | IS | IS | IPA | Писать IPA. |
| Hindi | HI | HI | ISO 15919 | Слово хранится деванагари, `transcription` в ISO 15919. |
| Bengali | BN | BN | ISO 15919 | Слово хранится бенгальским письмом, `transcription` в ISO 15919. |
| Filipino | TL | TL | native orthography | Используем Filipino с кодом `TL`; повторять отображаемое слово. |
| Burmese | MY | MY | practical Burmese romanization with tone/register notation | Слово хранится бирманским письмом, `transcription` латиницей с практической tone/register-подсказкой. Native script или голая копия слова в `transcription` запрещены. |
| Khmer | KM | KM | practical Khmer romanization (Geographic Department / UNGEGN-based style) | Слово хранится кхмерским письмом, `transcription` латиницей. |
| Lao | LO | LO | Lao learner romanization with tone diacritics, Vientiane-based | Слово хранится лаосским письмом, `transcription` латиницей для ученика с tone diacritics. BGN/PCGN без тонов не использовать. |
| Nepali | NE | NE | ISO 15919 | Слово хранится деванагари, `transcription` в ISO 15919. |
| Sinhala | SI | SI | ISO 15919 | Слово хранится сингальским письмом, `transcription` в ISO 15919. |
| Tamil | TA | TA | ISO 15919 | Слово хранится тамильским письмом, `transcription` в ISO 15919. |
| Telugu | TE | TE | ISO 15919 | Слово хранится телугу, `transcription` в ISO 15919. |
| Kannada | KN | KN | ISO 15919 | Слово хранится каннада, `transcription` в ISO 15919. |
| Malayalam | ML | ML | ISO 15919 | Слово хранится малаялам, `transcription` в ISO 15919. |
| Uzbek | UZ | UZ | native orthography | Использовать современную латинскую узбекскую орфографию; повторять отображаемое слово. |
| Kazakh | KK | KK | practical Cyrillic-to-Latin transliteration (BGN/PCGN-style) | Слово хранится казахской кириллицей, `transcription` латиницей. |
| Azerbaijani | AZ | AZ | native orthography | Использовать современную латиницу; повторять отображаемое слово. |
| Georgian | KA | KA | Georgian national romanization | Слово хранится грузинским письмом, `transcription` латиницей. |
| Armenian | HY | HY | practical BGN/PCGN-style romanization | Слово хранится армянским письмом, `transcription` латиницей. |
| Turkish | TR | TR | native orthography | Повторять отображаемое слово. |
| Swahili | SW | SW | native orthography | Повторять отображаемое слово. |
| Brazilian Portuguese | PT-BR | PT-BR | IPA | Regional Portuguese variant for Brazil. Не смешивать с `PT`. |
| Latin American Spanish | ES-419 | ES-419 | native orthography (no separate transcription by default) | Broad Latin American Spanish. Повторять отображаемое слово. |
| British English | EN-GB | EN-GB | IPA | Regional English variant for the United Kingdom. Писать IPA для отображаемого слова/словосочетания; не использовать как canonical base. |

## QA-ограничения

Единое display-решение не означает, что все сгенерированные транскрипции автоматически качественные.

`transcription` в карточках - вспомогательная подсказка для ученика в текущем текстовом deliverable. Audio не входит в текущий repair/export loop: проверяются перевод, пример и текстовая транскрипция перевода. QA не должен превращать romanization/transliteration в отдельный академический проект. Блокировать карточку нужно только если `transcription` пустая, относится не к тому слову, вводит в заблуждение, меняет чтение/смысл или явно нарушает выбранную policy. Допустимые варианты практической латинизации, которые не мешают понять слово и зафиксированы QA evidence, могут получать `generated_checked`.

Детерминированный shape-gate обязателен перед final export и не может быть перекрыт старым QA evidence:

- `native orthography`: `transcription` должна точно повторять отображаемое слово (`word_with_article_or_marker` или `native_word`);
- `IPA`: `transcription` должна быть IPA-строкой в `/.../`, не должна быть обычным display word, and must cover the full learner-facing display form. If `display_word` starts with an article/function marker such as `a/an`, `l'/le/la/les`, `der/die/das`, `o/a/os/as`, `de/het`, `en/ett/et`, that function word must be present phonetically at the start of the IPA rather than silently omitted.
- `romanization`: если отображаемое слово написано нелатинским письмом, `transcription` должна быть латиницей/латиницей с диакритикой, не native script, не копия display word and not punctuation/article-normalized `canonical_english` fallback;
- English verb cards для `EN` и `EN-GB` должны показывать `to + base verb`;
- `ZH` требует Hanyu Pinyin with tone marks; pinyin без tone marks или Han characters в `transcription` блокируются;
- `VI` остается native orthography with tone marks: `transcription` повторяет отображаемое слово и не теряет диакритику;
- `TH` / `LO` используют learner romanization with tone diacritics: mid tone unmarked, low grave, falling circumflex, high acute, rising caron. Тоны не писать словами вроде `(falling)` / `(high)`;
- `MY` = Burmese/Myanmar, not Malay (`MS`). `MY` использует practical romanization with tone/register notation; native Burmese script and bare English fallback in `transcription` are blocked.

V3 adds a separate `pronunciation_accuracy` QA layer for all IPA rows. `transcription_policy` proves that the field follows the chosen policy shape; `pronunciation_accuracy` proves that the IPA content is phonetically suitable for the current display/native word. A slash-wrapped orthographic string such as `/pommeau douche/`, `/le recipient alimentaire/`, `/a food storage container/` or `/der vorratsbehalter/` is not acceptable IPA even though it has `/.../`.

Executable gates:

- `scripts/check-transcription-policy-shape.mjs <set_id>` blocks shape/policy violations.
- The same shape gate fails closed when an IPA language row shows an article/function marker in `display_word` but the IPA only transcribes the lexical head. Examples that must fail: `EN-GB a cup -> /kʌp/`, `FR l'assiette -> /a.sjɛt/`, `DE der Teller -> /ˈtɛlɐ/`. Corrected forms must cover the display, e.g. `/ə kʌp/`, `/la.sjɛt/`, `/deːɐ̯ ˈtɛlɐ/`.
- `scripts/check-transcription-style-consistency.mjs <set_id>` blocks internally mixed romanization styles for learner/script languages using machine-readable profiles in `config/transcription-style-profiles.json`. The profile layer defines allowed characters, forbidden symbols, punctuation spacing and tone-number restrictions by language. It catches source-exact-but-product-bad rows such as Burmese compact dictionary punctuation (`pan:kan`, `a.hpum:`, `laksutpa.wa`), mixed accented Latin in the current MY project style (`tú`, `hmwe tán`), mixed apostrophe/register markers, Burmese component romanization drift, Khmer practical-romanization rows with IPA-like symbols such as `ɑ`, `ə` or `ɛ`, and tone-number regressions for `ZH`/`TH`/`LO`. This gate is style consistency, not native-speaker approval.
- `scripts/check-ipa-transcription-sanity.mjs <set_id>` blocks obvious pseudo-IPA in IPA languages.
- `scripts/check-ipa-source-lookup.mjs <set_id>` runs the stronger local IPA lookup layer for `EN`, `EN-GB`, `FR`, `SV`, `NB`, `DA` and `IS`; it blocks slash-wrapped orthographic strings when local exact/component source evidence shows the value is not IPA.
- `scripts/check-source-backed-transcriptions.mjs <set_id>` applies the machine-readable source policy from `config/transcription-source-policy.json` and records/validates `transcription_source_backing` evidence. Final-ready confidence is limited to `deterministic`, `source_exact`, or a narrowly accepted `accepted_source_partial` for strict high-risk rows with a current-value-locked source-preflight warning decision; unreviewed `source_partial`, `conflict` and `no_source` block final export. For strict high-risk lookup languages (`TH`, `LO`, `MY`, `KM`, `HY`), `source_exact` now requires an exact local source headword and matching romanization candidate, delimiter-only normalized exact evidence, a `HY` CLDR BGN-style compiler match, or a current-value-locked component/manual source decision, not just source-family availability. For the IPA-focused languages, source-backed final readiness also includes `scripts/check-ipa-source-lookup.mjs`.
- `scripts/check-high-risk-transcription-lookup.mjs <set_id>` runs the strict lookup layer directly for `TH`, `LO`, `MY`, `KM` and `HY`.
- `pronunciation_accuracy` evidence is required for final-ready IPA rows. If exact IPA cannot be source-backed, the row stays `needs_review`/blocked rather than being guessed.
- Cross-language fallback leaks are blocked separately: high-risk romanization languages must not receive the same pseudo-English transcription across a large part of a deck or across a whole 3-language batch. `BN`, `HI`, `NE`, `SI`, `TA`, `TE`, `KN` and `ML` are especially checked for this because a valid ISO 15919 transcription must be derived from that language's current native/display word, not copied from English or from a neighboring language row. Isolated shared loanword-like transcriptions are warning/review artifacts, not automatic hard blockers.

If a romanized loanword genuinely matches the English canonical form, the row defaults to `needs_review`; a silent pass is not allowed without explicit documented review evidence.

2026-06-12 ingredient/spice follow-up: Russian pantry loanwords whose BGN/PCGN-style practical transliteration legitimately matches an English-looking token must be handled by narrow current-policy allowlist entries, not by weakening the fallback gate. `паприка -> paprika` and `пищевая сода -> pishchevaya soda` are accepted as Russian display-derived transliterations for the ingredient/spice deck; unrelated English fallback tokens such as `sugar`, `flour` or `oil` remain blockers.

На старте `pronunciation_status` должен оставаться `needs_review` для языков и форматов, где массовая генерация может ошибаться или быть неудобной для обычного пользователя:

```text
EN, EN-GB, FR, DE, PT, PT-BR, PL, NL, SV, NB/NO, DA, IS,
HI, BN, TH, MY, KM, LO, NE, SI, TA, TE, KN, ML, HY
```

Для языков с `native orthography`, где `transcription` повторяет слово, статус может быть `generated`, если слово само прошло QA.

## Source-decision notes

`docs/reference-sources.md` records the language-to-source decision matrix for all 54 active language variants. The policy in this document remains the source of truth for the user-facing `transcription` format; dictionaries, Wiktionary-derived dumps and transliteration tools are evidence sources, not automatic truth. A value can pass only when the source-backed form matches the current display/native word, the exact meaning, the regional variant and the current policy.

The implemented source-backed gate is intentionally fail-closed. `scripts/check-source-backed-transcriptions.mjs --write-evidence` writes `qa_reviews.check_family='transcription_source_backing'` with method, confidence, source ids, policy version, manifest hash, checked display/native/transcription values and issues. `check-qa-evidence.mjs`, `db-qa-set.sh`, final export and final linguistic audit all require this evidence to be current by `qa_checked_value_hash`. A stale AI batch or dry-run review cannot satisfy this family.

Group decisions:

- IPA languages (`EN`, `EN-GB`, `FR`, `DE`, `PT`, `PT-BR`, `PL`, `NL`, `SV`, `NB/NO`, `DA`, `IS`) require source/tool-backed `pronunciation_accuracy` evidence. Regional variants are separate: `EN-GB` cannot silently inherit `EN`, and `PT-BR` cannot silently inherit `PT`. The 2026-05-01 IPA-focused source layer adds stronger local source files for `EN` (CMUdict, ARPABET requiring deterministic IPA conversion), `EN-GB` (Britfone IPA), `FR` (Lexique383), `SV` (NST Swedish, SAMPA requiring conversion), `NB/NO` (NB Uttale and NLB Bokmål), `DA` (Udtaleordbog.dk IPA plus NST Danish fallback) and `IS` (IcePronDict). These sources improve future repair evidence; they do not auto-replace existing card values. The executable `check-ipa-source-lookup` gate now uses this layer to block source-confirmed pseudo-IPA before final export.
- Native-orthography languages (`ES`, `IT`, `VI`, `MS`, `ID`, `FI`, `CS`, `SK`, `HU`, `RO`, `HR`, `SL`, `LT`, `LV`, `ET`, `TL`, `UZ`, `AZ`, `TR`, `SW`, `ES-419`) keep copying the current display form into `transcription`. Source checks are still useful for spelling, diacritics and regional word choice, but they do not create a separate pronunciation field.
- Course-specific overrides may tighten this default only inside their own documented contract. Spanish A1 final edition workbooks use broad learner IPA (`spanish_a1_broad_learner_ipa_v1`) for the primary `ES`/`ES-419` word and example transcription columns because `docs/spanish-a1-core-release-plan.md` and the Spanish A1 contracts explicitly require separate Spain/LatAm pronunciation support. That override does not change ordinary-deck `ES`/`ES-419` native-orthography transcription.
- Standard romanization/transliteration languages (`RU`, `BG`, `KK`, `KA`, `HY`, `KO`, `JA`, `ZH`, `HI`, `BN`, `NE`, `SI`, `TA`, `TE`, `KN`, `ML`) keep the current policy. `SR` ordinary decks are Serbian Latin (Gaj) display/native-copy; `SR` only uses Cyrillic-to-Latin transliteration when a separate course contract explicitly stores Serbian Cyrillic. Deterministic transliteration can be auto-safe only when it is derived from the current native/display form; multi-reading systems such as `JA` and pronunciation-sensitive systems such as `KO` remain source-assisted/manual-review-required.
- For `KA`, Georgian national romanization remains the policy. The pronoun `მე` uses the standard learner/display romanization `me`; the shape gate has a narrow exact allowlist for this row so it does not force a nonstandard transliteration variant.
- `ZH` remains Simplified Chinese with Hanyu Pinyin tone marks. Tone numbers, tone-less pinyin and Traditional Chinese fallback are not final card output.
- `TH` and `LO` remain learner romanization with tone diacritics. Official tone-less romanization systems can be used as reference layers, but not as final card output because they hide the learner-critical tone information. Strict high-risk lookup must not promote tone-less RTGS/BGN/ALA-LC output to `source_exact`; delimiter normalization may only ignore punctuation/spacing, not missing tone marks or changed letters.
- `MY` remains Burmese/Myanmar, not Malay. The final format is practical learner romanization with tone/register support, closer to learner pronunciation support than to raw MLCTS-only output. The project style profile is lowercase ASCII plus spaces, hyphen, straight apostrophe, colon and dot. A Burmese row does not need an artificial marker on every syllable when exact source/tool evidence produces an unmarked syllable; source-backed evidence and the style profile must still prove that it is not a native-script copy, English fallback or mixed-style value.
- `KM` remains a practical Geographic Department / UNGEGN-based romanization. When sources conflict or a word has unstable vowel interpretation, the row fails closed to `needs_review`.
- `HY` remains practical Armenian romanization in BGN/PCGN-style. The strict gate derives the expected value from the current Armenian native/display form using the CLDR BGN-style rule set before considering Kaikki Armenian romanization candidates. This intentionally accepts `ձագար` -> `dzagar` and rejects Kaikki-style `jagar` for our final card policy; rows that still conflict with the BGN compiler remain blocked until repaired or explicitly reviewed.
- `SI` and Indic-script languages (`HI`, `BN`, `NE`, `SI`, `TA`, `TE`, `KN`, `ML`) use ISO 15919 and should be validated through ISO/CLDR/Aksharamukha-style references. This is transliteration evidence, not a claim of phrase-level pronunciation.

Additional 2026-05-01 source cache for high-risk repair: GOV.UK BGN/PCGN PDFs for Burmese, Khmer and Lao, SEAlang Burmese/Khmer/Lao dictionary and notation pages, `lao2ipa`, `python-myanmar` and `mya2rom` are tracked in `reference-sources/sources.manifest.json`. These sources are text/reference support for the existing `transcription` field only. They do not introduce audio work and they do not auto-replace card values: BGN/PCGN/ALA-LC may be tone-less or library-oriented, and tool output remains candidate evidence until the exact current display/native word and LunaCards policy are satisfied. The same rule applies to the IPA-focused cache: CMUdict, Britfone, Lexique383, Udtaleordbog.dk, NST, NB Uttale/NLB and IcePronDict are trusted evidence sources, not automatic final values.

2026-05-04 style-consistency hardening: source-backed exact lookup is necessary but not sufficient for high-risk romanization languages. A row can match a source and still be bad for the product if the same deck mixes library transliteration and learner pronunciation notation. `transcription_style_consistency` therefore fails closed before import/final export when it proves mixed style inside the same language. Current values that deliberately choose a different style must be repaired into the project style or receive a narrow current-value style decision before final delivery.

2026-05-04 style-profile follow-up: the gate now reads `config/transcription-style-profiles.json` and applies profiles to 20 romanization/transliteration languages (`BG`, `BN`, `HI`, `HY`, `JA`, `KA`, `KK`, `KM`, `KN`, `KO`, `LO`, `ML`, `MY`, `NE`, `RU`, `SI`, `TA`, `TE`, `TH`, `ZH`) in the current pilot. The first use normalized remaining MY rows to mya2rom-backed project style rather than keeping compact dictionary forms or mixed accent notation.

2026-05-17 Numbers rebuild follow-up: strict high-risk lookup may normalize source-side Khmer IPA-like vowel symbols such as `ɔ` to the current project ASCII practical style for source matching, but final `KM` card output must still avoid IPA-like symbols. For `MY`, current-value/source decisions must preserve the spaced learner style enforced by `transcription_style_consistency`; they must not reintroduce compact dictionary punctuation or mixed accent notation merely because a raw source presents it that way.

2026-05-04 IPA display-coverage follow-up: `transcription_policy` now enforces the existing "transcription covers display word" rule for IPA rows with articles/function markers. The current pilot initially had 447 rows where display forms such as `FR l'assiette`, `DE der Teller`, `EN-GB a cup`, `PT o prato`, `NL het bord`, `SV en tallrik`, `NB en tallerken` and `DA en tallerken` had IPA for the lexical head only. Narrow repair added the article/function-word IPA prefix without changing words or examples; the same gate now blocks future imports/final exports that repeat this omission.

Strict lookup status on 2026-05-01: the initial `TH`/`LO`/`MY`/`KM`/`HY` audit found blockers across the five generated decks after accepting delimiter-only exact matches and applying the `HY` CLDR BGN-style compiler. The completed repair-first rollout got all generated decks current under that high-risk gate. A later IPA-focused lookup pass then found a new blocker class: `outputs/qa/ipa_source_lookup_generated_decks_20260501.json` reported 235 hard IPA blockers in `Kitchen Storage & Cleaning` and `Bathroom Essentials` across `EN-GB`, `FR`, `SV`, `NB`, `DA` and `IS`, and `outputs/qa/source_backed_transcription_with_ipa_lookup_20260501.json` confirmed the same source-backed blockers. The completed IPA repair rollout imported all 235 source-backed fixes into Postgres, refreshed `transcription_policy`, `transcription_source_backing` and IPA `pronunciation_accuracy` evidence, rebuilt final workbooks, updated the same Google Sheet file ids in place, verified readback and passed delivery freshness. Current reports `outputs/qa/ipa_source_lookup_final_recheck_20260501.json` and `outputs/qa/source_backed_transcription_after_remaining_ipa_repairs_20260501.json` have 0 hard blockers for the two affected decks. Exact IPA source gaps must still never be guessed: they require source-backed repair rows or documented current-value-locked review.

## Зафиксированные специальные решения

| Вопрос | Решение |
| --- | --- |
| Regional variants | Поддерживаются коды языковых вариантов в финальных листах и базе. Добавлены `EN-GB`, `ES-419`, `PT-BR`; это отдельные language entries, а не замена `EN`, `ES`, `PT`. |
| English | `EN` = American English / US default and canonical base. `EN-GB` = British English variant для Великобритании; не использовать как source/canonical base. |
| Spanish | `ES` = Spanish (Spain). `ES-419` = broad Latin American Spanish. |
| Portuguese | `PT` = European Portuguese для Португалии. `PT-BR` = Brazilian Portuguese. Не смешивать эти варианты. |
| Chinese | `ZH` = Simplified Chinese. `ZH-HANT` / Traditional Chinese не активен и добавляется только отдельным решением. |
| Norwegian | В базе `NB`, в Google Sheets `NO`. Используем Bokmål, не Nynorsk. Для IPA берем Urban East Norwegian / Oslo-like pronunciation. |
| Filipino | Используем Filipino с кодом `TL`. `FIL/fil` не использовать как основной код. |
| Kazakh | `native_word` хранится казахской кириллицей. `transcription` хранится латиницей по practical Cyrillic-to-Latin transliteration. |
| Russian transliteration | `native_word` хранится кириллицей. `transcription` хранится practical Latin transliteration как вспомогательная подсказка; minor romanization variants не блокируют карточку, если слово понятно и есть QA evidence. |
| Native orthography languages | `transcription` повторяет отображаемое слово. Пустых transcription-ячеек в финальном export быть не должно. |
