#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "RU";
const BATCH_ID = "ru_v1";
const SENTENCE_END_RE = /[.!?。！？]$/u;

const RU_TRANSLATIONS_TSV = `source_headword	RU	example_RU
machine	машина; аппарат	Эта машина готовит кофе.
magazine	журнал	Она читает музыкальный журнал.
main	главный; основной	Это главная дверь.
make	делать; готовить	Я готовлю обед дома.
man	мужчина	Этот мужчина — мой учитель.
many	много; многие	Здесь много студентов.
map	карта	Посмотрите на карту.
March	март	Мой день рождения в марте.
market	рынок	Мы покупаем фрукты на рынке.
married	женатый; замужем	Моя сестра замужем.
May	май	Школа заканчивается в мае.
maybe	может быть	Может быть, пойдёт дождь.
me	меня; мне	Пожалуйста, помогите мне.
meal	еда; приём пищи	Эта еда горячая.
mean	значить	Что означает этот знак?
meaning	значение	Какое это значение?
meat	мясо	Я ем мясо на ужин.
meet	встречать; встречаться	Мы встречаемся после урока.
meeting	встреча; собрание	Встреча начинается сейчас.
member	участник; член	Она член клуба.
menu	меню	Прочитайте меню, пожалуйста.
message	сообщение	Я отправляю короткое сообщение.
metre	метр	Пройдите один метр вперёд.
midnight	полночь	Поезд отправляется в полночь.
mile	миля	Мы идём одну милю.
milk	молоко	Я пью молоко на завтрак.
million	миллион	Здесь живёт миллион человек.
minute1	минута	Подождите одну минуту, пожалуйста.
miss	скучать; пропускать	Я скучаю по старой школе.
mistake	ошибка	В этом ответе есть ошибка.
model	модель	Это маленькая модель.
modern	современный	Кухня современная.
moment	момент	Подождите минуту, пожалуйста.
Monday	понедельник	Мы начинаем работу в понедельник.
money	деньги	Мне нужны деньги.
month	месяц	Июнь — тёплый месяц.
more	больше; ещё	Мне нужно больше времени.
morning	утро	Я учусь утром.
most	большинство; самый	Большинству студентов нравится музыка.
mother	мать; мама	Моя мама сегодня работает.
mountain	гора	Гора высокая.
mouse	мышь	Мышь под стулом.
mouth	рот	Откройте рот, пожалуйста.
move	двигать; двигаться	Передвиньте стул сюда.
movie	фильм	Сегодня вечером мы смотрим фильм.
much	сколько; много	Сколько это стоит?
mum	мама	Моя мама дома.
museum	музей	Музей открывается в десять.
music	музыка	Я слушаю музыку.
must modal	должен; нужно	Вы должны остановиться здесь.
my	мой	Это моя книга.
name	имя; называть	Напишите своё имя здесь.
natural	натуральный; естественный	Этот сок натуральный.
near	рядом; близко	Банк рядом.
need	нуждаться; нужно	Мне нужна ручка.
negative	отрицательный	Этот ответ отрицательный.
neighbour	сосед; соседка	Мой сосед дружелюбный.
never	никогда	Я никогда не пью кофе.
new	новый	Этот телефон новый.
news	новости	Сегодня новости хорошие.
newspaper	газета	Он читает газету.
next	следующий	Следующий автобус опаздывает.
next to	рядом с	Сядьте рядом со мной.
nice	приятный; хороший	Комната приятная.
night	ночь	Я сплю ночью.
nine	девять	Здесь девять студентов.
nineteen	девятнадцать	Ей девятнадцать.
ninety	девяносто	Моему дедушке девяносто.
no	нет	Нет, спасибо.
no one	никто	В комнате никого нет.
nobody	никто	Дома никого нет.
north	север	Станция к северу отсюда.
nose	нос	Мой нос холодный.
not	не	Я не устал.
note	заметка; записка	Напишите заметку сейчас.
nothing	ничего	В коробке ничего нет.
November	ноябрь	Мой курс начинается в ноябре.
now	сейчас	Идите сюда сейчас.
number	номер; число	Напишите номер здесь.
nurse	медсестра; медбрат	Медсестра добрая.
object	предмет; объект	Положите предмет на стол.
o’clock	часов	Урок начинается в девять часов.
October	октябрь	Мы путешествуем в октябре.
of	из; от	Это чашка чая.
off	выключенный; прочь	Выключите свет.
office	офис	Мой офис маленький.
often	часто	Я часто хожу в школу пешком.
oh	о; ой	О, теперь я понимаю.
OK	хорошо; нормально	Так нормально?
old	старый	Этот дом старый.
on	на	Книга на столе.
once	один раз	Я звоню раз в неделю.
one	один	У меня одна сестра.
onion	лук	Нарежьте одну луковицу.
online	онлайн	Я учусь онлайн.
only	только	У меня только одна сумка.
open	открывать; открытый	Откройте окно, пожалуйста.
opinion	мнение	Какое у вас мнение?
opposite	напротив; противоположный	Магазин напротив банка.
or	или	Чай или кофе?
orange	апельсин; оранжевый	Этот апельсин сладкий.
order	заказывать; заказ	Я заказываю суп.
other	другой	Используйте другую дверь.
our	наш	Это наш класс.
out	наружу; вне	Выйдите после обеда.
outside	снаружи; на улице	Дети играют на улице.
over	над; через	Самолёт летит над городом.
own	свой; собственный	У меня своя комната.
page	страница	Откройте страницу десять.
paint	красить; рисовать краской	Покрасьте стену в синий цвет.
painting	картина	Эта картина красивая.
pair	пара	Мне нужна пара носков.
paper	бумага	Пишите на этой бумаге.
paragraph	абзац	Прочитайте первый абзац.
parent	родитель	Родитель ждёт снаружи.
park	парковаться; парк	Мы паркуемся рядом со станцией.
part	часть	Эта часть лёгкая.
partner	партнёр	Работайте с партнёром.
party	вечеринка	Вечеринка начинается в семь.
passport	паспорт	Покажите паспорт, пожалуйста.
past	прошлый; после	Сейчас половина седьмого.
pay	платить	Я плачу картой.
pen	ручка	Эта ручка синяя.
pencil	карандаш	Я пишу карандашом.
people	люди	Здесь много людей.
pepper	перец	Добавьте перец в суп.
perfect	идеальный	Ваш ответ идеален.
period	период; урок	Урок короткий.
person	человек	Один человек ждёт.
personal	личный	Это мой личный телефон.
phone	телефон	Мой телефон в сумке.
photo	фото; фотография	Сделайте фото здесь.
photograph	фотография	Эта фотография старая.
phrase	фраза	Повторите фразу, пожалуйста.
piano	пианино	Она играет на пианино.
picture	картинка; изображение	Посмотрите на эту картинку.
piece	кусок; часть	Возьмите один кусок торта.
pig	свинья	Свинья на ферме.
pink	розовый	Её сумка розовая.
place	место	Это место тихое.
plan	план	Нам нужен план.
plane	самолёт	Самолёт опаздывает.
plant	растение; сажать	Полейте растение сегодня.
play	играть	Дети играют в парке.
player	игрок	Игрок быстро бежит.
please	пожалуйста	Пожалуйста, сядьте здесь.
point	пункт; точка	Этот пункт важен.
police	полиция	Полиция снаружи.
policeman	полицейский	Полицейский помогает нам.
pool	бассейн	Бассейн холодный.
poor	бедный	Бедный ребёнок голоден.
popular	популярный	Эта песня популярная.
positive	положительный	Это положительный результат.
possible	возможный	Это возможно сегодня?
post	пост; публикация	Я читаю её пост онлайн.
potato	картофель; картошка	Я ем картошку.
pound	фунт	Это стоит один фунт.
practice	практика	Практика помогает каждый день.
practise	практиковаться	Я практикую английский каждый день.
prefer	предпочитать	Я предпочитаю чай.
prepare	готовить; подготавливать	Подготовьте сумку сегодня вечером.
present	присутствующий; подарок	Она сегодня присутствует.
pretty	симпатичный; довольно	Сад симпатичный.
price	цена	Цена низкая.
probably	вероятно; наверное	Она, наверное, знает.
problem	проблема	Эта проблема небольшая.
product	продукт; товар	Этот товар новый.
programme	программа	Программа начинается сейчас.
project	проект	Наш проект готов.
purple	фиолетовый	Рубашка фиолетовая.
put	класть; ставить	Положите книгу сюда.
quarter	четверть	Сейчас четверть третьего.
question	вопрос	Задайте один вопрос.
quick	быстрый	Это быстрый тест.
quickly	быстро	Пожалуйста, идите быстро.
quiet	тихий	В библиотеке тихо.
quite	довольно	Эта комната довольно маленькая.
radio	радио	Радио громкое.
rain	дождь	Дождь начинается сейчас.
read	читать	Прочитайте это предложение.
reader	читатель	Читателю нравится история.
reading	чтение	Чтение помогает мне учиться.
ready	готовый	Ужин готов.
real	настоящий; реальный	Это реальная проблема.
really	действительно; очень	Мне действительно нравится эта песня.
reason	причина	Скажите мне причину.
red	красный	Дверь красная.
relax	расслабляться; отдыхать	Отдохните после работы.
remember	помнить	Помните свой паспорт.
repeat	повторять	Повторите предложение, пожалуйста.
report	отчёт; доклад	Прочитайте отчёт сегодня вечером.
restaurant	ресторан	Ресторан занят.
result	результат	Результат хороший.
return	возвращать; возвращаться	Верните книгу завтра.
rice	рис	Я ем рис на обед.
rich	богатый	Город богатый.
ride	ездить	Я езжу на велосипеде.
right	правый; правильно	Поверните здесь направо.
river	река	Река широкая.
road	дорога	Эта дорога длинная.
room	комната	Моя комната чистая.
routine	распорядок	Мой распорядок начинается рано.
rule	правило	Это правило простое.
run	бегать	Я бегаю каждое утро.
sad	грустный	Сегодня ему грустно.
salad	салат	Этот салат свежий.
salt	соль	Добавьте немного соли.
same	такой же	У нас одинаковая сумка.
sandwich	сэндвич; бутерброд	Я ем сэндвич.
Saturday	суббота	Мы встречаемся в субботу.
say	говорить; сказать	Скажите своё имя, пожалуйста.
school	школа	Моя школа рядом.
science	наука	Я изучаю науку.
scientist	учёный	Учёный задаёт вопрос.
sea	море	Море синее.
second1 (unit of time)	секунда	Подождите одну секунду.
section	раздел	Прочитайте этот раздел.
see	видеть	Я вижу друга.
sell	продавать	Они продают свежие фрукты.
send	отправлять	Отправьте сообщение сейчас.
sentence	предложение	Напишите одно предложение.
September	сентябрь	Школа начинается в сентябре.
seven	семь	Здесь семь человек.
seventeen	семнадцать	Ему семнадцать.
seventy	семьдесят	Моей бабушке семьдесят.
share	делиться	Поделитесь тортом.
she	она	Она моя сестра.
sheep	овца	Овца ест траву.
shirt	рубашка	Его рубашка чистая.
shoe	туфля; обувь	Одна туфля под кроватью.
shop	магазин	Магазин закрывается рано.
shopping	покупки	Сегодня покупки в радость.
short	короткий	Эта история короткая.
should modal	следует; должен	Вам следует отдохнуть сегодня.
show	показывать	Покажите мне билет.
shower	душ	Я принимаю душ.
sick	больной	Сегодня мне плохо.
similar	похожий	Наши сумки похожи.
sing	петь	Я пою на уроке.
singer	певец; певица	Певец известный.
sister	сестра	Моя сестра молодая.
sit	сидеть	Сядьте у окна.
situation	ситуация	Эта ситуация новая.
six	шесть	Здесь шесть книг.
sixteen	шестнадцать	Ей шестнадцать.
sixty	шестьдесят	Моему отцу шестьдесят.
skill	навык	Этот навык полезен.
skirt	юбка	Её юбка синяя.
sleep	спать	Я сплю восемь часов.
slow	медленный	Автобус медленный.
small	маленький	Комната маленькая.
snake	змея	Змея длинная.
snow	снег	Снег падает зимой.
so	поэтому; так	Я устал, поэтому отдыхаю.
some	немного; несколько	Мне нужно немного воды.
somebody	кто-то	Кто-то у двери.
someone	кто-то	Кто-то оставил сообщение.
something	что-то	Мне нужно что-то выпить.
sometimes	иногда	Я иногда хожу в школу пешком.
son	сын	Её сын в школе.
song	песня	Эта песня новая.
soon	скоро	До скорого.
sorry	извините; сожалеющий	Мне жаль.
sound	звук	Звук громкий.
soup	суп	Суп горячий.
south	юг	Отель к югу отсюда.
space	место; пространство	Есть место для одного стула.
speak	говорить	Пожалуйста, говорите медленно.
special	особый	Сегодня особый день.
spell	писать по буквам	Произнесите своё имя по буквам.
spelling	правописание	Проверьте правописание.
spend	тратить	Я трачу деньги на еду.
sport	спорт	Футбол — популярный спорт.
spring	весна	Весной растут цветы.
stand	стоять	Встаньте у двери.
star	звезда	Я вижу яркую звезду.
start	начинать	Начните урок сейчас.
statement	утверждение	Это утверждение верное.
station	станция	Станция рядом.
stay	оставаться	Останьтесь дома сегодня.
still	всё ещё	Я всё ещё голоден.
stop	останавливаться; остановка	Остановитесь на углу.
story	история; рассказ	Расскажите мне историю.
street	улица	Эта улица тихая.
strong	сильный	Он сильный.
student	студент; ученик	Студент читает книгу.
study	учиться; изучать	Я изучаю английский.
style	стиль	Мне нравится этот стиль.
subject	предмет	Английский — мой главный предмет.
success	успех	Успех требует практики.
sugar	сахар	Положите сахар в чай.
summer	лето	Здесь лето жаркое.
sun	солнце	Солнце яркое.
Sunday	воскресенье	Мы отдыхаем в воскресенье.
supermarket	супермаркет	Супермаркет открыт.
sure	уверенный	Я уверен.
sweater	свитер	Мой свитер тёплый.
swim	плавать	Я плаваю каждую неделю.
swimming	плавание	Плавание — хорошее упражнение.
table	стол	Ключи на столе.`;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_003_300_v1_contract_v0.json",
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
    reviewer: "codex_oxford_part003_support_translation_batch_ru_v1",
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
    script_path: "scripts/oxford/build-oxford-part003-support-translation-batch-ru.mjs",
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
    "Generate the next support-language batch in language order: ES.",
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
    `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}`,
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
