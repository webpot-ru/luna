#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "RU";
const BATCH_ID = "ru_v1";
const SENTENCE_END_RE = /[.!?。！？]$/u;

const RU_TRANSLATIONS_TSV = `source_headword	RU	example_RU
clothes	одежда	Моя одежда чистая.
club	клуб	Она ходит в музыкальный клуб.
coat	пальто	Моё пальто тёплое.
coffee	кофе	Я пью кофе утром.
cold	холодный; холод	Вода холодная.
college	колледж	Моя сестра учится в колледже.
colour	цвет	Мой любимый цвет — синий.
come	приходить	Пожалуйста, подойди сюда.
common	распространённый; общий	Это имя распространённое.
company	компания	Моя мама работает в компании.
compare	сравнивать	Сравните эти две картинки.
complete	полный; завершить	Форма заполнена полностью.
computer	компьютер	Этот компьютер новый.
concert	концерт	Сегодня вечером мы идём на концерт.
conversation	разговор	У нас был короткий разговор.
cook	готовить; повар	Я готовлю ужин дома.
cooking	готовка	Мне нравится готовить с папой.
cool	прохладный; классный	В комнате прохладно.
correct	правильный; исправлять	Ваш ответ правильный.
cost	стоить; стоимость	Сколько это стоит?
could modal	мог бы; могла бы	Я мог бы тебе помочь.
country	страна	Канада — большая страна.
course	курс	Я прохожу курс английского.
cousin	двоюродный брат; двоюродная сестра	Мой двоюродный брат живёт рядом.
cow	корова	Корова ест траву.
cream	сливки; крем	Я добавляю сливки в кофе.
create	создавать	Они создают новую игру.
culture	культура	Мы изучаем местную культуру.
cup	чашка	Эта чашка пустая.
customer	клиент; покупатель	Клиент задаёт вопрос.
cut	резать	Разрежьте яблоко пополам.
dad	папа	Мой папа на работе.
dance	танец; танцевать	Мы танцуем после ужина.
dancer	танцор; танцовщица	Танцор быстро двигается.
dancing	танцы	Танцы — это весело.
dangerous	опасный	Эта дорога опасная.
dark	тёмный	В комнате темно.
date	дата	Какая сегодня дата?
daughter	дочь	Её дочери шесть лет.
day	день	Хорошего дня.
dear	дорогой; уважаемый	Дорогой друг, спасибо.
December	декабрь	Мой день рождения в декабре.
decide	решать	Решите сейчас, пожалуйста.
delicious	вкусный	Этот суп вкусный.
describe	описывать	Опишите свою комнату.
description	описание	Прочитайте короткое описание.
design	дизайн; проектировать	Я создаю простой дизайн карточки.
desk	письменный стол	Книга лежит на моём столе.
detail	деталь; подробность	Одной детали не хватает.
dialogue	диалог	Прочитайте диалог сейчас.
dictionary	словарь	Используйте словарь на уроке.
die	умирать	Цветы погибают без воды.
diet	питание; диета	В моё питание входят фрукты.
difference	разница	Есть одна разница.
different	разный; другой	У нас разные имена.
difficult	трудный	Этот вопрос трудный.
dinner	ужин	Ужин готов.
dirty	грязный	Мои туфли грязные.
discuss	обсуждать	Мы обсуждаем план.
dish	блюдо; тарелка	Это блюдо горячее.
do1	делать	Что ты делаешь?
doctor	врач	Врач занят.
dog	собака	Собака бежит на улице.
dollar	доллар	Это стоит один доллар.
door	дверь	Закройте дверь, пожалуйста.
down	вниз; внизу	Сядьте здесь.
downstairs	внизу; на нижнем этаже	Кухня внизу.
draw	рисовать	Нарисуйте маленький дом.
dress	платье; одеваться	На ней красное платье.
drink	напиток; пить	Я пью воду.
drive	водить машину	Я езжу на работу на машине.
driver	водитель	Водитель останавливается здесь.
during	во время	Я сплю во время полёта.
DVD	DVD-диск	Этот DVD-диск старый.
each	каждый	У каждого ребёнка есть книга.
ear	ухо	У меня болит ухо.
early	ранний; рано	Я встаю рано.
east	восток	Солнце встаёт на востоке.
easy	лёгкий	Этот тест лёгкий.
eat	есть; кушать	Мы обедаем вместе.
egg	яйцо	Я ем яйцо.
eight	восемь	У меня восемь карточек.
eighteen	восемнадцать	Ей восемнадцать.
eighty	восемьдесят	Моему дедушке восемьдесят.
elephant	слон	Слон большой.
eleven	одиннадцать	Урок начинается в одиннадцать.
else	ещё; другой	Что ещё тебе нужно?
email	электронное письмо; электронная почта	Отправьте мне электронное письмо.
end	конец; заканчивать	Это конец.
enjoy	наслаждаться; получать удовольствие	Мне нравится эта песня.
enough	достаточно	У нас достаточно времени.
euro	евро	Это стоит один евро.
even	даже	Даже мой брат знает.
evening	вечер	Мы встречаемся сегодня вечером.
event	событие; мероприятие	Мероприятие начинается сегодня.
ever	когда-нибудь	Ты когда-нибудь готовишь?
every	каждый	Я учусь каждый день.
everybody	все; каждый	Все здесь.
everyone	все; каждый	Всем нравится музыка.
everything	всё	Всё готово.
exam	экзамен	Экзамен скоро начнётся.
example	пример	Это хороший пример.
excited	взволнованный; радостный	Я сегодня взволнован.
exciting	увлекательный	Игра увлекательная.
exercise	упражнение; заниматься спортом	Я занимаюсь спортом перед завтраком.
expensive	дорогой	Это пальто дорогое.
explain	объяснять	Пожалуйста, объясните это слово.
extra	дополнительный	Мне нужно дополнительное время.
eye	глаз	У меня красный глаз.
face	лицо	Умой лицо.
fact	факт	Этот факт важен.
fall	падать; осень	Листья падают осенью.
false	ложный; неверный	Этот ответ неверный.
family	семья	Моя семья небольшая.
famous	известный	Она известная певица.
fantastic	фантастический; замечательный	Концерт был замечательный.
far	далеко; далёкий	Школа далеко.
farm	ферма	Они живут на ферме.
farmer	фермер	Фермер выращивает еду.
fast	быстрый; быстро	Этот поезд быстрый.
fat	толстый	Кот толстый.
father	отец	Мой отец высокий.
favourite	любимый	Это моя любимая песня.
February	февраль	Февраль здесь холодный.
feel	чувствовать	Я чувствую себя счастливым.
feeling	чувство	Я знаю это чувство.
festival	фестиваль	Фестиваль начинается завтра.
few	несколько; мало	Здесь несколько учеников.
fifteen	пятнадцать	Мне пятнадцать.
fifth	пятый	Это пятый урок.
fifty	пятьдесят	Моей маме пятьдесят.
fill	заполнять; наполнять	Наполните чашку водой.
film	фильм	Мы смотрим фильм.
final	последний; финальный	Это последний вопрос.
find	находить	Я нахожу ключи.
fine	хорошо; нормальный	Сейчас я чувствую себя хорошо.
finish	заканчивать	Закончите домашнее задание.
fire	огонь; пожар	Огонь горячий.
first	первый	Она первая в очереди.
fish	рыба	Я ем рыбу на ужин.
five	пять	У меня пять книг.
flat	квартира	Моя квартира маленькая.
flight	рейс; полёт	Рейс опаздывает.
floor	пол; этаж	Сумка лежит на полу.
flower	цветок	Этот цветок жёлтый.
fly	летать	Птицы летают в небе.
follow	следовать	Следуйте за мной, пожалуйста.
food	еда	Еда готова.
foot	ступня; нога	У меня болит ступня.
football	футбол	Мы сегодня играем в футбол.
for	для	Этот подарок для тебя.
forget	забывать	Не забудьте ключи.
form	форма; бланк	Заполните форму.
forty	сорок	Моему отцу сорок.
four	четыре	Я вижу четыре птицы.
fourteen	четырнадцать	Ей четырнадцать.
fourth	четвёртый	Это четвёртый этаж.
free	бесплатный; свободный	Билет бесплатный.
Friday	пятница	Мы встречаемся в пятницу.
friend	друг	Мой друг здесь.
friendly	дружелюбный	Учитель дружелюбный.
from	из; от	Я отсюда.
front	перед; передняя часть	Встаньте впереди.
fruit	фрукты; фрукт	Я ем фрукты каждый день.
full	полный	Бутылка полная.
fun	веселье; весёлый	Эта игра весёлая.
funny	смешной	Фильм смешной.
future	будущее	Подумайте о своём будущем.
game	игра	Игра начинается сейчас.
garden	сад	Сад красивый.
geography	география	Я изучаю географию в школе.
get	получать; добираться	Я прихожу домой в шесть.
girl	девочка; девушка	Девочка улыбается.
girlfriend	девушка; подруга	Его девушка добрая.
give	давать	Дайте мне книгу.
glass	стакан; стекло	Я пью из стакана.
go	идти; ехать	Мы сейчас идём домой.
good	хороший	Этот кофе хороший.
goodbye	до свидания	До свидания, увидимся завтра.
grandfather	дедушка	Мой дедушка старый.
grandmother	бабушка	Моя бабушка готовит суп.
grandparent	дедушка или бабушка	Один из моих дедушек живёт с нами.
great	отличный; большой	Это отличная идея.
green	зелёный	Дверь зелёная.
grey	серый	Небо серое.
group	группа	Работайте в маленькой группе.
grow	расти; выращивать	Растения растут в саду.
guess	угадывать; догадка	Угадайте ответ.
guitar	гитара	Он играет на гитаре.
gym	спортзал	Я хожу в спортзал.
hair	волосы	У неё длинные волосы.
half	половина	Разрежьте торт пополам.
hand	рука; кисть	Поднимите руку.
happen	случаться	Что случится дальше?
happy	счастливый	Я сегодня счастлив.
hard	твёрдый; трудный	Этот стул твёрдый.
hat	шляпа; шапка	Моя шапка чёрная.
hate	ненавидеть	Я не люблю холодный чай.
have	иметь	У меня есть машина.
have to modal	должен; нужно	Мне нужно учиться.
he	он	Он мой брат.
head	голова	У меня болит голова.
health	здоровье	Хорошая еда помогает здоровью.
healthy	здоровый	Это блюдо полезное.
hear	слышать	Я слышу музыку.
hello	привет; здравствуйте	Здравствуйте, приятно познакомиться.
help	помощь; помогать	Пожалуйста, помогите мне.
her	её; ей	Это её сумка.
here	здесь; сюда	Иди сюда сейчас.
hey	эй; привет	Эй, подожди меня.
hi	привет	Привет, как дела?
high	высокий	Стена высокая.
him	его; ему	Я знаю его.
his	его	Его пальто синее.
history	история	Я изучаю историю.
hobby	хобби	Чтение — моё хобби.
holiday	отпуск; праздник	В июле мы берём отпуск.
home	дом; домой	Я дома.
homework	домашнее задание	Сделай домашнее задание сегодня вечером.
hope	надеяться	Я надеюсь, что ты придёшь.
horse	лошадь	Лошадь быстро бежит.
hospital	больница	Больница рядом.
hot	горячий; жаркий	Суп горячий.
hotel	отель	Отель чистый.
hour	час	Подождите один час.
house	дом	Этот дом старый.
how	как	Как дела?
however	однако	Однако я могу остаться здесь.
hundred	сто	Пришло сто человек.
hungry	голодный	Я голоден.
husband	муж	Её муж — врач.
I	я	Я люблю чай.
ice	лёд	Лёд холодный.
ice cream	мороженое	Я хочу мороженое.
idea	идея	Это хорошая идея.
if	если	Позвони мне, если нужна помощь.
imagine	представлять	Представьте маленький дом.
important	важный	Этот урок важный.
improve	улучшать	Я хочу стать лучше.
in	в; внутри	Ключи в моей сумке.
include	включать	Пожалуйста, укажите своё имя.
information	информация	Мне нужна дополнительная информация.
interest	интерес	Она интересуется искусством.
interested	заинтересованный	Мне интересна музыка.
interesting	интересный	Эта книга интересная.
internet	интернет	Интернет работает медленно.
interview	интервью; собеседование	У меня сегодня собеседование.
into	в; внутрь	Положите книги в сумку.
introduce	представлять; знакомить	Пожалуйста, представьте своего друга.
island	остров	Этот остров маленький.
it	это; он; она	Сейчас холодно.
its	его; её; свой	Собаке нравится своя лежанка.
jacket	куртка	Моя куртка новая.
January	январь	Январь — первый месяц.
jeans	джинсы	Мои джинсы синие.
job	работа	Мне нужна новая работа.
join	присоединяться	Присоединяйтесь к нашему уроку сегодня.
journey	путешествие; поездка	Поездка длинная.
juice	сок	Я пью апельсиновый сок.
July	июль	Мы путешествуем в июле.
June	июнь	Школа заканчивается в июне.
just	только; просто	Мне просто нужна вода.
keep	хранить; держать	Оставьте этот ключ.
key	ключ	Я потерял ключ.
kilometre	километр	Пройдите один километр.
kind (type)	вид; тип	Какую музыку ты любишь?
kitchen	кухня	Кухня чистая.
know	знать	Я знаю ответ.
land	земля; суша	Самолёт стоит на земле.
language	язык	Английский — это язык.
large	большой	Эта комната большая.
last1 (final)	последний	Это последняя страница.
late	поздний; опаздывающий	Автобус опаздывает.
later	позже	Увидимся позже.
laugh	смеяться; смех	Мы смеёмся вместе.
learn	учить; изучать	Я учу английский.
leave	уходить; оставлять	Оставьте дверь открытой.
left	левый; налево	Поверните здесь налево.
leg	нога	У меня болит нога.
lesson	урок	Урок начинается сейчас.
let	позволять	Позвольте мне помочь вам.
letter	письмо; буква	Я пишу письмо.
library	библиотека	Библиотека открывается в девять.
lie1	лежать	Пожалуйста, лягте на кровать.
life	жизнь	Жизнь в городе насыщенная.
like (similar)	как; похожий на	Это похоже на игру.
like (find sb/sth pleasant)	нравиться	Мне нравится эта песня.
line	линия; очередь	Встаньте в очередь.
lion	лев	Лев спит.
list	список; составлять список	Составьте список покупок.
listen	слушать	Слушайте учителя.
little	маленький; немного	У меня немного денег.
live1	жить	Я живу рядом со школой.
local	местный	Это местный магазин.
long1	длинный; долгий	Дорога длинная.
look	смотреть; выглядеть	Посмотрите на картинку.
lose	терять	Не потеряйте билет.
lot	много	У меня много домашнего задания.
love	любовь; любить	Я люблю свою семью.
lunch	обед	Обед готов.`;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_002_300_v1_contract_v0.json",
    examples: "",
    outDir: "outputs/oxford-vocabulary/support-translations",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--")) continue;
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    index += 1;
    if (key === "--contract") args.contract = value;
    else if (key === "--examples") args.examples = value;
    else if (key === "--out-dir") args.outDir = value;
    else throw new Error(`Unknown argument: ${key}`);
  }
  return args;
}

function normalizeText(value) {
  return String(value ?? "").replace(/\u00a0/gu, " ").replace(/\s+/gu, " ").trim();
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSONL at ${filePath}:${index + 1}: ${error.message}`);
      }
    });
}

async function writeJsonl(filePath, rows) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function parseTranslations() {
  const lines = RU_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tRU\texample_RU") {
    throw new Error("Unexpected RU translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad RU translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad RU translation row ${index + 2}: empty field`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad RU example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate RU translation key: ${sourceHeadword}`);
    }
    map.set(sourceHeadword, { display, example });
  }
  return map;
}

function validateTranslationMap(rows, translations) {
  const sourceKeys = rows.map((row) => row.source_headword);
  const rowKeySet = new Set(sourceKeys);
  const missing = sourceKeys.filter((key) => !translations.has(key));
  const extra = [...translations.keys()].filter((key) => !rowKeySet.has(key));
  if (missing.length) {
    throw new Error(`Missing RU translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`RU translation map has unused rows: ${extra.join(", ")}`);
  }
}

function buildSupportRow(exampleRow, translation, generatedAt) {
  return {
    release_id: exampleRow.release_id,
    course_id: exampleRow.course_id,
    row_id: exampleRow.row_id,
    core_item_id: exampleRow.core_item_id,
    meaning_id: exampleRow.meaning_id,
    source_candidate_id: exampleRow.source_candidate_id,
    source_headword: exampleRow.source_headword,
    reviewed_display_headword: exampleRow.reviewed_display_headword,
    reviewed_part_of_speech: exampleRow.reviewed_part_of_speech,
    meaning_note: exampleRow.meaning_note,
    example_EN: exampleRow.example_EN,
    support_translation_batch: BATCH_ID,
    support_translation_status: "draft_native_style_needs_source_assisted_qa",
    support_example_status: "draft_scene_preserving_needs_source_assisted_qa",
    source_note:
      "Internal LunaCards Oxford support-language draft; support aid for English learning, not ordinary polyglot final delivery.",
    reviewer: "codex_oxford_part002_support_translation_batch_ru_v1",
    reviewed_at: generatedAt,
    generation_ready: false,
    remaining_blockers: (exampleRow.remaining_blockers ?? []).filter(
      (blocker) =>
        ![
          "english_pronunciation_source_check",
          "english_example_quality_check",
          "support_translation_meaning_check",
          "support_example_scene_check",
        ].includes(blocker)
    ),
    RU: translation.display,
    example_RU: translation.example,
  };
}

function updateContract(contract, batchPath, summaryPath, rows) {
  const batch = {
    batch_id: BATCH_ID,
    status: "draft_native_style_needs_source_assisted_qa_not_delivery_ready",
    script_path: "scripts/oxford/build-oxford-part002-support-translation-batch-ru.mjs",
    script_version: SCRIPT_VERSION,
    path: batchPath,
    summary_path: summaryPath,
    languages: [LANGUAGE],
    rows: rows.length,
    display_cells: rows.length,
    example_cells: rows.length,
    target_language_transcriptions_included: false,
    closes_gate_layer: [],
    does_not_close: [
      "support_translation_meaning_check",
      "support_example_scene_check",
      "weak_language_targeted_review",
      "support_translation_sample_review",
      "support_translation_source_backed_audit",
      "support_example_quality_audit",
      "support_article_display_repair_check",
      "final_delivery_approval_check",
    ],
  };
  const existing = contract.latest_support_translation_batches ?? [];
  contract.latest_support_translation_batches = [
    ...existing.filter((item) => item.batch_id !== BATCH_ID),
    batch,
  ];
  contract.next_stage_options = [
    "Generate the next support-language batch in language order.",
    "Run weak-language targeted review and source-backed support-language audits after all support languages are covered.",
    "Export US/UK workbooks only after all support-language gates pass.",
  ];
  return contract;
}

const args = parseArgs(process.argv.slice(2));
const contract = await readJson(args.contract);
const examplesPath = args.examples || contract.latest_english_examples?.path;
if (!examplesPath) {
  throw new Error("No examples path provided and contract.latest_english_examples.path is empty");
}
const exampleRows = await readJsonl(examplesPath);
if (!exampleRows.length) {
  throw new Error("English examples artifact is empty");
}
const translations = parseTranslations();
validateTranslationMap(exampleRows, translations);

const releaseId = exampleRows[0].release_id;
const generatedAt = new Date().toISOString();
const supportRows = exampleRows.map((row) => buildSupportRow(row, translations.get(row.source_headword), generatedAt));
const batchPath = path.join(args.outDir, `${releaseId}_support_translation_batch_${BATCH_ID}.jsonl`);
const summaryPath = path.join(args.outDir, `${releaseId}_support_translation_batch_${BATCH_ID}_summary.md`);
await writeJsonl(batchPath, supportRows);
await mkdir(path.dirname(summaryPath), { recursive: true });
await writeFile(
  summaryPath,
  [
    `# Oxford Part 002 Support Translation Batch ${BATCH_ID}: ${releaseId}`,
    "",
    `- Script version: \`${SCRIPT_VERSION}\``,
    `- Source rows: \`${examplesPath}\``,
    `- Rows: ${supportRows.length}`,
    `- Languages: ${LANGUAGE}`,
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Target-language transcriptions: not included",
    "- Postgres import: false",
    "- Google Sheet delivery: false",
    "",
    "This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.",
    "",
  ].join("\n"),
  "utf8"
);

const updatedContract = updateContract(contract, batchPath, summaryPath, supportRows);
await writeFile(args.contract, `${JSON.stringify(updatedContract, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      release_id: releaseId,
      batch_id: BATCH_ID,
      languages: [LANGUAGE],
      rows: supportRows.length,
      display_cells: supportRows.length,
      example_cells: supportRows.length,
      path: batchPath,
      contract_updated: args.contract,
    },
    null,
    2
  )
);
