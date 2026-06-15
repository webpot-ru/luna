#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "BG";
const BATCH_ID = "bg_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-bg.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const CYRILLIC_RE = /\p{Script=Cyrillic}/u;
const UNEXPECTED_SCRIPT_RE = /[\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const BG_TRANSLATIONS_TSV = `source_headword	BG	example_BG
take	вземам; водя	Вземи билета.
talk	говоря; разговор	Говорим след часа.
tall	висок	Учителят ми е висок.
taxi	такси	Таксито е навън.
tea	чай	Този чай е горещ.
teach	преподавам	Преподавам английски.
teacher	учител; учителка	Учителката се усмихва.
team	отбор; екип	Нашият отбор печели днес.
teenager	тийнейджър	Тийнейджърът чете книга.
telephone	телефон; телефонирам	Телефонът е на масата.
television	телевизор; телевизия	Телевизорът е нов.
tell	казвам; разказвам	Кажи ми името си.
ten	десет	Имам десет книги.
tennis	тенис	Играем тенис днес.
terrible	ужасен	Времето е ужасно.
test	тест; изпит	Тестът започва сега.
text	съобщение; текст	Изпрати кратко съобщение.
than	от; отколкото	Десет е повече от две.
thank	благодаря	Благодари на учителя си.
thanks	благодаря; благодарности	Благодаря за помощта.
that	онзи; това	Онази книга е моя.
the	английски определителен член	Чаят е топъл.
theatre	театър	Театърът е близо до гарата.
their	техен; тяхна	Тяхната къща е голяма.
them	тях; им	Познавам ги.
then	после; тогава	Яж, после учи.
there	там; има	Там има стол.
they	те	Те са на училище.
thing	нещо; предмет	Това нещо е полезно.
think	мисля	Мисля за дома.
third	трети; една трета	Това е третият урок.
thirsty	жаден	Жаден съм.
thirteen	тринадесет	Тя е на тринадесет.
thirty	тридесет	Сестра ми е на тридесет.
this	този; това	Този билет е нов.
thousand	хиляда	Дойдоха хиляда души.
three	три	Виждам три птици.
through	през; чрез	Минаваме през парка.
Thursday	четвъртък	Срещаме се в четвъртък.
ticket	билет	Трябва ми билет.
time	време; час	Колко е часът?
tired	уморен	Уморен съм.
title	заглавие	Прочети заглавието.
to	до; към; за	Отивам на час.
today	днес	Днес е слънчево.
together	заедно	Ядем заедно.
toilet	тоалетна	Тоалетната е чиста.
tomato	домат	Този домат е червен.
tomorrow	утре	Ще се видим утре.
tonight	тази вечер	Учим тази вечер.
too	също; твърде	И аз искам чай.
tooth	зъб	Боли ме зъб.
topic	тема	Избери тема.
tourist	турист; туристка	Туристът снима.
town	град; малък град	Този град е тих.
traffic	трафик; движение	Трафикът е бавен.
train	влак; тренирам	Влакът закъснява.
travel	пътувам; пътуване	Пътуваме с влак.
tree	дърво	Дървото е високо.
trip	пътуване; екскурзия	Екскурзията започва утре.
trousers	панталони	Панталоните ми са черни.
true	истински; верен	Тази история е вярна.
try	опитвам	Опитай този чай.
T-shirt	тениска	Нося тениска.
Tuesday	вторник	Срещаме се във вторник.
turn	завивам; ред	Завий наляво тук.
TV	телевизор; телевизия	Телевизорът е силен.
twelve	дванадесет	Имам дванадесет химикалки.
twenty	двадесет	Тук има двадесет ученици.
twice	два пъти	Плувам два пъти седмично.
two	две; двама	Двама души чакат.
type	тип; пиша на клавиатура	Какъв тип музика?
umbrella	чадър	Вземи чадър.
uncle	чичо; вуйчо	Чичо ми е мил.
under	под	Чантата е под масата.
understand	разбирам	Разбирам въпроса.
university	университет	Университетът е близо.
until	до	Изчакай до пет.
up	нагоре; горе	Стани сега.
upstairs	горе; на горния етаж	Стаята ми е горе.
us	нас; ни	Помогни ни, моля.
use	използвам; употреба	Използвай тази химикалка.
useful	полезен	Тази карта е полезна.
usually	обикновено	Обикновено се прибирам пеша.
vacation	ваканция; отпуск	Ваканцията ни започва утре.
vegetable	зеленчук	Морковът е зеленчук.
very	много	Стаята е много тиха.
video	видео	Гледай това видео.
village	село	Селото е малко.
visit	посещавам	Посещаваме леля си.
visitor	посетител; посетителка	Посетителят чака навън.
wait	чакам	Чакай тук, моля.
waiter	сервитьор; сервитьорка	Сервитьорът носи чай.
wake	събуждам се; събуждам	Събуждам се рано.
walk	ходя пеша; разходка	Ходим пеша до училище.
wall	стена	Стената е бяла.
want	искам	Искам вода.
warm	топъл; затоплям	Стаята е топла.
wash	мия	Измий си ръцете.
watch	гледам; часовник	Гледам телевизия.
water	вода; поливам	Пий малко вода.
way	път; начин	Този път е кратък.
we	ние	Учим английски.
wear	нося	Нося палто.
weather	време; климат	Времето е студено.
website	уебсайт	Този уебсайт е полезен.
Wednesday	сряда	Часът започва в сряда.
week	седмица	Тази седмица е натоварена.
weekend	уикенд	Уикендът започва утре.
welcome	добре дошъл; приветствам	Добре дошъл в нашия час.
well	добре	Тя пее добре.
west	запад	Слънцето залязва на запад.
what	какво; кой	Какво е това?
when	кога; когато	Кога учиш?
where	къде	Къде е гарата?
which	кой; който	Коя чанта е твоя?
white	бял	Стената е бяла.
who	кой	Кой е там?
why	защо	Защо закъсняваш?
wife	съпруга	Съпругата му е учителка.
will modal	ще	Ще ти помогна.
win	печеля	Нашият отбор може да спечели.
window	прозорец	Отвори прозореца.
wine	вино	Това вино е червено.
winter	зима	Зимата тук е студена.
with	с	Ела с мен.
without	без	Чаят без захар е добър.
woman	жена	Жената чете книга.
wonderful	чудесен; прекрасен	Гледката е прекрасна.
word	дума	Напиши една дума.
work	работя; работа	Работя у дома.
worker	работник; работничка	Работникът е зает.
world	свят	Светът е голям.
would modal	бих; щях	Бих искал чай.
write	пиша	Напиши името си.
writer	писател; писателка	Писателят живее тук.
writing	писане; почерк	Почеркът й е ясен.
wrong	грешен; неправилен	Този отговор е грешен.
yeah	да; добре	Да, мога да дойда.
year	година	Тази година е добра.
yellow	жълт	Бананът е жълт.
yes	да	Да, разбирам.
yesterday	вчера	Обадих се вчера.
you	ти; вие	Ти си мой приятел.
young	млад	Детето е младо.
your	твой; ваш	Твоята чанта е тук.
yourself	себе си; сам	Сипи си чай.`;

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
  const lines = BG_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tBG\texample_BG") {
    throw new Error("Unexpected BG translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad BG translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad BG translation row ${index + 2}: empty field`);
    }
    if (!CYRILLIC_RE.test(display) || !CYRILLIC_RE.test(example)) {
      throw new Error(`Bad BG translation row ${index + 2}: display/example must contain Cyrillic text`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Bad BG translation row ${index + 2}: display/example contains unexpected script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad BG example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate BG translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing BG translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`BG translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_bg_v1",
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
    BG: translation.display,
    example_BG: translation.example,
  };
}

function updateContract(contract, batchPath, summaryPath, rows, generatedAt) {
  const batch = {
    batch_id: BATCH_ID,
    status: "draft_native_style_needs_source_assisted_qa_not_delivery_ready",
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    path: batchPath,
    summary_path: summaryPath,
    languages: [LANGUAGE],
    rows: rows.length,
    display_cells: rows.length,
    example_cells: rows.length,
    target_language_transcriptions_included: false,
    article_display_included: false,
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
    "Generate the next support-language batch in language order: HR.",
    "Run weak-language targeted review and source-backed support-language audits after all support languages are covered.",
    "Export US/UK workbooks only after all support-language gates pass.",
  ];
  contract.updated_at = generatedAt;
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
    "- Article display: not applicable for Bulgarian; display cells use base forms and do not force definite suffixes",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: BG Cyrillic display/example cells with no unexpected script leakage",
    "- Target-language transcriptions: not included",
    "- Postgres import: false",
    "- Google Sheet delivery: false",
    "",
    "This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.",
    "",
  ].join("\n"),
  "utf8"
);

const updatedContract = updateContract(contract, batchPath, summaryPath, supportRows, generatedAt);
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
