#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "RU";
const BATCH_ID = "ru_v1";
const SENTENCE_END_RE = /[.!?。！？]$/u;

const RU_TRANSLATIONS_TSV = `source_headword	RU	example_RU
take	брать; взять	Возьмите билет.
talk	говорить; разговор	Мы говорим после урока.
tall	высокий	Мой учитель высокий.
taxi	такси	Такси снаружи.
tea	чай	Этот чай горячий.
teach	учить; преподавать	Я преподаю английский.
teacher	учитель; учительница	Учитель улыбается.
team	команда	Наша команда сегодня выигрывает.
teenager	подросток	Подросток читает книгу.
telephone	телефон; звонить	Телефон на столе.
television	телевизор	Телевизор новый.
tell	говорить; сказать	Скажите мне своё имя.
ten	десять	У меня десять книг.
tennis	теннис	Мы играем в теннис сегодня.
terrible	ужасный	Погода ужасная.
test	тест; проверять	Тест начинается сейчас.
text	сообщение; писать сообщение	Отправьте короткое сообщение.
than	чем	Десять больше, чем два.
thank	благодарить	Поблагодарите учителя.
thanks	спасибо	Спасибо за помощь.
that	тот; что	Та книга моя.
the	определённый артикль the	Чай тёплый.
theatre	театр	Театр рядом со станцией.
their	их	Их дом большой.
them	их; им	Я знаю их.
then	потом; затем	Поешьте, затем учитесь.
there	там; есть	Там есть стул.
they	они	Они в школе.
thing	вещь; предмет	Эта вещь полезная.
think	думать	Я думаю о доме.
third	третий; треть	Это третий урок.
thirsty	испытывающий жажду; хотеть пить	Я хочу пить.
thirteen	тринадцать	Ей тринадцать.
thirty	тридцать	Моей сестре тридцать.
this	этот	Этот билет новый.
thousand	тысяча	Пришла тысяча человек.
three	три	Я вижу трёх птиц.
through	через; сквозь	Мы идём через парк.
Thursday	четверг	Мы встречаемся в четверг.
ticket	билет	Мне нужен билет.
time	время	Который час?
tired	уставший	Я устал.
title	заголовок; название	Прочитайте заголовок.
to	к; в; инфинитивная частица to	Я иду на урок.
today	сегодня	Сегодня солнечно.
together	вместе	Мы едим вместе.
toilet	туалет	Туалет чистый.
tomato	помидор	Этот помидор красный.
tomorrow	завтра	До завтра.
tonight	сегодня вечером; этой ночью	Мы учимся сегодня вечером.
too	тоже; слишком	Я тоже хочу чай.
tooth	зуб	У меня болит зуб.
topic	тема	Выберите тему.
tourist	турист; туристка	Турист делает фотографии.
town	город	Этот город тихий.
traffic	движение; пробки	Движение медленное.
train	поезд; тренировать	Поезд опаздывает.
travel	путешествовать; путешествие	Мы путешествуем на поезде.
tree	дерево	Дерево высокое.
trip	поездка	Поездка начинается завтра.
trousers	брюки	Мои брюки чёрные.
true	правдивый; верный	Эта история правдивая.
try	пробовать; попытка	Попробуйте этот чай.
T-shirt	футболка	Я ношу футболку.
Tuesday	вторник	Мы встречаемся во вторник.
turn	повернуть; очередь	Поверните здесь налево.
TV	телевизор; ТВ	Телевизор громкий.
twelve	двенадцать	У меня двенадцать ручек.
twenty	двадцать	Здесь двадцать студентов.
twice	дважды	Я плаваю дважды в неделю.
two	два	Два человека ждут.
type	тип; печатать	Какой тип музыки?
umbrella	зонт	Возьмите зонт.
uncle	дядя	Мой дядя добрый.
under	под	Сумка под столом.
understand	понимать	Я понимаю вопрос.
university	университет	Университет рядом.
until	до; пока не	Ждите до пяти.
up	вверх; наверх	Встаньте сейчас.
upstairs	наверху; наверх	Моя комната наверху.
us	нас; нам	Пожалуйста, помогите нам.
use	использовать; польза	Используйте эту ручку.
useful	полезный	Эта карта полезная.
usually	обычно	Обычно я иду домой пешком.
vacation	отпуск; каникулы	Наш отпуск начинается завтра.
vegetable	овощ	Морковь — овощ.
very	очень	Комната очень тихая.
video	видео	Посмотрите это видео.
village	деревня	Деревня маленькая.
visit	посещать; навещать; визит	Мы навещаем тётю.
visitor	посетитель; гость	Посетитель ждёт снаружи.
wait	ждать; ожидание	Подождите здесь, пожалуйста.
waiter	официант	Официант приносит чай.
wake	просыпаться; будить	Я просыпаюсь рано.
walk	идти пешком; прогулка	Мы идём в школу пешком.
wall	стена	Стена белая.
want	хотеть	Я хочу воды.
warm	тёплый; согревать	Комната тёплая.
wash	мыть; стирка	Вымойте руки.
watch	смотреть; часы	Я смотрю телевизор.
water	вода; поливать	Выпейте воды.
way	путь; способ	Этот путь короткий.
we	мы	Мы изучаем английский.
wear	носить	Я ношу куртку.
weather	погода	Погода холодная.
website	веб-сайт	Этот сайт полезный.
Wednesday	среда	Урок начинается в среду.
week	неделя	Эта неделя занятая.
weekend	выходные	Выходные начинаются завтра.
welcome	добро пожаловать; приветствовать	Добро пожаловать в наш класс.
well	хорошо	Она хорошо поёт.
west	запад	Солнце садится на западе.
what	что; какой	Что это?
when	когда	Когда вы учитесь?
where	где; куда	Где станция?
which	который; какой	Какая сумка ваша?
white	белый	Стена белая.
who	кто	Кто это?
why	почему	Почему вы опоздали?
wife	жена	Его жена учительница.
will modal	will; будущее время	Я помогу вам.
win	побеждать; выигрыш	Наша команда может выиграть.
window	окно	Откройте окно.
wine	вино	Это вино красное.
winter	зима	Зима здесь холодная.
with	с	Идёмте со мной.
without	без	Чай без сахара нормальный.
woman	женщина	Женщина читает книгу.
wonderful	замечательный	Вид замечательный.
word	слово	Напишите одно слово.
work	работать; работа	Я работаю дома.
worker	рабочий; работник	Работник занят.
world	мир	Мир большой.
would modal	would; бы	Я бы хотел чаю.
write	писать	Напишите своё имя.
writer	писатель; писательница	Писатель живёт здесь.
writing	письмо; письменная речь	Её письмо понятное.
wrong	неправильный	Этот ответ неправильный.
yeah	да; ага	Да, я могу прийти.
year	год	Этот год хороший.
yellow	жёлтый	Банан жёлтый.
yes	да	Да, я понимаю.
yesterday	вчера	Я звонил вчера.
you	ты; вы	Ты мой друг.
young	молодой; маленький	Ребёнок ещё маленький.
your	твой; ваш	Ваша сумка здесь.
yourself	себя; сам	Угощайтесь чаем.`;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_004_147_v1_contract_v0.json",
    examples: "",
    outDir: "outputs/oxford-vocabulary/support-translations",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw.startsWith("--")) continue;
    const [key, inlineValue] = raw.split("=", 2);
    const value = inlineValue ?? argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    if (inlineValue === undefined) index += 1;
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
    reviewer: "codex_oxford_part004_support_translation_batch_ru_v1",
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
    script_path: "scripts/oxford/build-oxford-part004-support-translation-batch-ru.mjs",
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
    `# Oxford Part 004 Support Translation Batch ${BATCH_ID}: ${releaseId}`,
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
