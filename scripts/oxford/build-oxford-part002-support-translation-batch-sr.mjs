#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "SR";
const BATCH_ID = "sr_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-sr.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const CYRILLIC_RE = /\p{Script=Cyrillic}/u;
const UNEXPECTED_SCRIPT_RE = /[\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;
const LATIN_LETTER_RE = /\p{Script=Latin}/u;

const SR_TRANSLATIONS_TSV = `source_headword	SR	example_SR
clothes	одећа	Моја одећа је чиста.
club	клуб	Она иде у музички клуб.
coat	капут	Мој капут је топао.
coffee	кафа	Пијем кафу ујутро.
cold	хладан; хладно	Вода је хладна.
college	факултет; колеџ	Моја сестра је на факултету.
colour	боја	Моја омиљена боја је плава.
come	доћи	Дођи овамо, молим те.
common	чест; уобичајен	Ово име је често.
company	компанија; фирма	Моја мајка ради у фирми.
compare	упоредити; поредити	Упореди ове две слике.
complete	потпун; завршити	Образац је потпун.
computer	рачунар	Овај рачунар је нов.
concert	концерт	Вечерас идемо на концерт.
conversation	разговор	Имали смо кратак разговор.
cook	кувати; кувар	Кувам вечеру код куће.
cooking	кување	Волим да кувам са татом.
cool	хладан; супер	Соба је хладна.
correct	тачан; исправити	Твој одговор је тачан.
cost	цена; коштати	Колико то кошта?
could modal	моћи; могао бих	Могао бих да ти помогнем.
country	земља; држава	Канада је велика земља.
course	курс; предмет	Идем на курс енглеског.
cousin	рођак; рођака	Мој рођак живи близу.
cow	крава	Крава једе траву.
cream	павлака; крем	Стављам павлаку у кафу.
create	створити; правити	Они праве нову игру.
culture	култура	Учимо о локалној култури.
cup	шоља	Ова шоља је празна.
customer	купац; клијент	Купац поставља питање.
cut	сећи; пресећи	Пресеци јабуку напола.
dad	тата	Тата је на послу.
dance	плесати; плес	Плешемо после вечере.
dancer	плесач; плесачица	Плесачица се брзо креће.
dancing	плесање	Плесање је забавно.
dangerous	опасан	Овај пут је опасан.
dark	таман; мрачан	Соба је мрачна.
date	датум	Који је данас датум?
daughter	ћерка	Њена ћерка има шест година.
day	дан	Желим ти леп дан.
dear	драг; поштован	Драги пријатељу, хвала.
December	децембар	Мој рођендан је у децембру.
decide	одлучити	Одлучи сада, молим те.
delicious	укусан	Ова супа је укусна.
describe	описати; описивати	Опиши своју собу.
description	опис	Прочитај кратак опис.
design	дизајн; осмислити	Осмишљавам једноставну картицу.
desk	радни сто	Књига је на мом столу.
detail	детаљ	Један детаљ недостаје.
dialogue	дијалог	Прочитај дијалог сада.
dictionary	речник	Користи речник на часу.
die	умрети	Цвеће умире без воде.
diet	исхрана; дијета	Моја исхрана укључује воће.
difference	разлика	Постоји једна разлика.
different	различит	Имамо различита имена.
difficult	тежак	Ово питање је тешко.
dinner	вечера	Вечера је спремна.
dirty	прљав	Моје ципеле су прљаве.
discuss	разговарати; расправљати	Разговарамо о плану.
dish	тањир; јело	Овај тањир је врућ.
do1	радити; чинити	Шта радиш?
doctor	лекар	Лекар је заузет.
dog	пас	Пас трчи напољу.
dollar	долар	Кошта један долар.
door	врата	Затвори врата, молим те.
down	доле; надоле	Седи овде доле.
downstairs	доле; на доњем спрату	Кухиња је доле.
draw	цртати	Нацртај малу кућу.
dress	хаљина; обући	Она носи црвену хаљину.
drink	пиће; пити	Пијем воду.
drive	возити	Возим на посао.
driver	возач	Возач се овде зауставља.
during	током	Спавам током лета.
DVD	ди-ви-ди	Овај ди-ви-ди је стар.
each	сваки	Свако дете има књигу.
ear	ухо	Боли ме ухо.
early	рано; рани	Устајем рано.
east	исток	Сунце излази на истоку.
easy	лак	Овај тест је лак.
eat	јести	Једемо ручак заједно.
egg	јаје	Једем једно јаје.
eight	осам	Имам осам картица.
eighteen	осамнаест	Она има осамнаест година.
eighty	осамдесет	Мој деда има осамдесет година.
elephant	слон	Слон је велики.
eleven	једанаест	Час почиње у једанаест.
else	други; још	Шта ти још треба?
email	имејл	Пошаљи ми имејл.
end	крај; завршити	Ово је крај.
enjoy	уживати; допадати се	Уживам у овој песми.
enough	довољно	Имамо довољно времена.
euro	евро	Кошта један евро.
even	чак	Чак и мој брат зна.
evening	вече	Састајемо се вечерас.
event	догађај	Догађај почиње данас.
ever	икада	Да ли икада куваш?
every	сваки	Учим сваки дан.
everybody	сви	Сви су овде.
everyone	свако	Свако воли музику.
everything	све	Све је спремно.
exam	испит	Испит ускоро почиње.
example	пример	Ово је добар пример.
excited	узбуђен	Данас сам узбуђен.
exciting	узбудљив	Игра је узбудљива.
exercise	вежба; вежбати	Вежбам пре доручка.
expensive	скуп	Овај капут је скуп.
explain	објаснити	Објасни ову реч, молим те.
extra	додатан; још	Треба ми додатно време.
eye	око	Око ми је црвено.
face	лице	Опери лице.
fact	чињеница	Ова чињеница је важна.
fall	пасти; јесен	Лишће пада у јесен.
false	нетачан; лажан	Тај одговор је нетачан.
family	породица	Моја породица је мала.
famous	познат	Она је позната певачица.
fantastic	фантастичан	Концерт је био фантастичан.
far	далеко	Школа је далеко.
farm	фарма; имање	Они живе на фарми.
farmer	пољопривредник	Пољопривредник узгаја храну.
fast	брз	Овај воз је брз.
fat	дебео	Мачка је дебела.
father	отац	Мој отац је висок.
favourite	омиљен	Ово је моја омиљена песма.
February	фебруар	У фебруару је овде хладно.
feel	осећати	Осећам се срећно.
feeling	осећај	Знам тај осећај.
festival	фестивал	Фестивал почиње сутра.
few	неколико	Неколико ученика је овде.
fifteen	петнаест	Имам петнаест година.
fifth	пети	Ово је пети час.
fifty	педесет	Моја мајка има педесет година.
fill	напунити; попунити	Напуни шољу водом.
film	филм	Гледамо филм.
final	коначан; последњи	Ово је последње питање.
find	наћи; пронаћи	Налазим своје кључеве.
fine	добро	Сада се осећам добро.
finish	завршити	Заврши домаћи задатак.
fire	ватра	Ватра је врела.
first	први	Она је прва у реду.
fish	риба	Једем рибу за вечеру.
five	пет	Имам пет књига.
flat	стан	Мој стан је мали.
flight	лет	Лет касни.
floor	под; спрат	Торба је на поду.
flower	цвет	Овај цвет је жут.
fly	летети	Птице лете небом.
follow	пратити	Прати ме, молим те.
food	храна	Храна је спремна.
foot	стопало	Боли ме стопало.
football	фудбал	Данас играмо фудбал.
for	за	Овај поклон је за тебе.
forget	заборавити	Не заборави кључеве.
form	образац	Попуни образац.
forty	четрдесет	Мој отац има четрдесет година.
four	четири	Видим четири птице.
fourteen	четрнаест	Она има четрнаест година.
fourth	четврти	Ово је четврти спрат.
free	бесплатан; слободан	Карта је бесплатна.
Friday	петак	Састајемо се у петак.
friend	пријатељ	Мој пријатељ је овде.
friendly	пријатељски	Учитељ је пријатељски настројен.
from	из; од	Ја сам одавде.
front	предњи део; напред	Стани напред.
fruit	воће	Једем воће сваки дан.
full	пун	Флаша је пуна.
fun	забава; забаван	Ова игра је забавна.
funny	смешан	Филм је смешан.
future	будућност	Размисли о својој будућности.
game	игра	Игра почиње сада.
garden	башта	Башта је лепа.
geography	географија	Учим географију у школи.
get	добити; стићи	Стижем кући у шест.
girl	девојчица; девојка	Девојчица се смеши.
girlfriend	девојка	Његова девојка је љубазна.
give	дати	Дај ми књигу.
glass	чаша; стакло	Пијем из чаше.
go	ићи	Сада идемо кући.
good	добар	Ова кафа је добра.
goodbye	довиђења	Довиђења, видимо се сутра.
grandfather	деда	Мој деда је стар.
grandmother	бака	Моја бака кува супу.
grandparent	бака или деда	Бака живи са нама.
great	одличан	Ово је одлична идеја.
green	зелен	Врата су зелена.
grey	сив	Небо је сиво.
group	група; скупина	Радите у малој групи.
grow	расти; узгајати	Биљке расту у башти.
guess	погодити; претпоставити	Погоди одговор.
guitar	гитара	Он свира гитару.
gym	теретана	Идем у теретану.
hair	коса	Њена коса је дуга.
half	половина	Пресеци колач напола.
hand	рука	Подигни руку.
happen	догодити се	Шта ће се догодити?
happy	срећан	Данас сам срећан.
hard	тежак; тврд	Ова столица је тврда.
hat	шешир; капа	Мој шешир је црн.
hate	мрзети	Мрзим хладан чај.
have	имати	Имам ауто.
have to modal	морати	Морам да учим.
he	он	Он је мој брат.
head	глава	Боли ме глава.
health	здравље	Добра храна помаже здрављу.
healthy	здрав	Овај оброк је здрав.
hear	чути	Чујем музику.
hello	здраво; ћао	Здраво, драго ми је.
help	помоћ; помоћи	Молим те, помози ми.
her	њен; њу	Ово је њена торба.
here	овде	Дођи овамо сада.
hey	хеј	Хеј, чекај ме.
hi	ћао	Ћао, како си?
high	висок	Зид је висок.
him	њега	Познајем га.
his	његов	Његов капут је плав.
history	историја	Учим историју.
hobby	хоби	Читање је мој хоби.
holiday	одмор; празник	У јулу идемо на одмор.
home	дом; код куће	Код куће сам.
homework	домаћи задатак	Уради домаћи задатак вечерас.
hope	надати се	Надам се да ћеш доћи.
horse	коњ	Коњ брзо трчи.
hospital	болница	Болница је близу.
hot	врућ	Супа је врућа.
hotel	хотел	Хотел је чист.
hour	сат	Чекај један сат.
house	кућа	Ова кућа је стара.
how	како	Како си?
however	међутим	Међутим, могу да останем овде.
hundred	сто	Дошло је сто људи.
hungry	гладан	Гладан сам.
husband	супруг	Њен супруг је лекар.
I	ја	Волим чај.
ice	лед	Лед је хладан.
ice cream	сладолед	Желим сладолед.
idea	идеја	То је добра идеја.
if	ако	Позови ме ако ти треба помоћ.
imagine	замислити	Замисли малу кућу.
important	важан	Овај час је важан.
improve	побољшати	Желим да се побољшам.
in	у	Кључеви су у мојој торби.
include	укључити	Укључи своје име, молим те.
information	информација	Треба ми више информација.
interest	интересовање; интерес	Она се занима за уметност.
interested	заинтересован	Заинтересован сам за музику.
interesting	занимљив	Ова књига је занимљива.
internet	интернет	Интернет је спор.
interview	интервју; разговор	Данас имам интервју.
into	у; унутра	Стави књиге у торбу.
introduce	представити	Представи свог пријатеља.
island	острво	Ово острво је мало.
it	то; оно	Хладно је.
its	његов; њен	Пас воли свој кревет.
jacket	јакна	Моја јакна је нова.
January	јануар	Јануар је први месец.
jeans	фармерке	Моје фармерке су плаве.
job	посао	Треба ми нови посао.
join	придружити се	Придружи се нашем разреду данас.
journey	путовање	Путовање је дуго.
juice	сок	Пијем сок од поморанџе.
July	јул	Путујемо у јулу.
June	јун	Школа се завршава у јуну.
just	управо; само	Само ми треба вода.
keep	задржати; чувати	Задржи овај кључ.
key	кључ	Изгубио сам кључ.
kilometre	километар	Ходај један километар.
kind (type)	врста	Коју врсту музике волиш?
kitchen	кухиња	Кухиња је чиста.
know	знати; познавати	Знам одговор.
land	копно; земља	Авион је на копну.
language	језик	Енглески је језик.
large	велики	Ова соба је велика.
last1 (final)	последњи	Ово је последња страница.
late	касни; касно	Аутобус касни.
later	касније	Видимо се касније.
laugh	смејати се	Смејемо се заједно.
learn	учити	Учим енглески.
leave	отићи; оставити	Остави врата отворена.
left	лево; леви	Овде скрени лево.
leg	нога	Боли ме нога.
lesson	лекција; час	Час почиње сада.
let	допустити; пустити	Допусти ми да помогнем.
letter	писмо; слово	Пишем писмо.
library	библиотека	Библиотека се отвара у девет.
lie1	лежати	Лези на кревет.
life	живот	Градски живот је ужурбан.
like (similar)	као; сличан	То је као игра.
like (find sb/sth pleasant)	свиђати се; волети	Свиђа ми се ова песма.
line	ред; линија	Стани у ред.
lion	лав	Лав спава.
list	списак	Направи списак за куповину.
listen	слушати	Слушај учитеља.
little	мали; мало	Имам мало новца.
live1	живети	Живим близу школе.
local	локални; месни	Ово је локална продавница.
long1	дуг; дугачак	Пут је дугачак.
look	гледати; изгледати	Погледај слику.
lose	изгубити	Немој изгубити карту.
lot	много; пуно	Имам много домаћег задатка.
love	волети; љубав	Волим своју породицу.
lunch	ручак	Ручак је спреман.`;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_002_300_v1_contract_v0.json",
    outDir: "outputs/oxford-vocabulary/support-translations",
    examples: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--contract") {
      args.contract = argv[index + 1];
      index += 1;
    } else if (item.startsWith("--contract=")) {
      args.contract = item.slice("--contract=".length);
    } else if (item === "--out-dir") {
      args.outDir = argv[index + 1];
      index += 1;
    } else if (item.startsWith("--out-dir=")) {
      args.outDir = item.slice("--out-dir=".length);
    } else if (item === "--examples") {
      args.examples = argv[index + 1];
      index += 1;
    } else if (item.startsWith("--examples=")) {
      args.examples = item.slice("--examples=".length);
    } else {
      throw new Error(`Unknown argument: ${item}`);
    }
  }
  return args;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const raw = await readFile(filePath, "utf8");
  return raw
    .trim()
    .split(/\n/u)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${filePath}:${index + 1}: ${error.message}`);
      }
    });
}

async function writeJsonl(filePath, rows) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function parseTranslations() {
  const lines = SR_TRANSLATIONS_TSV.trim().split(/\n/u);
  const header = lines.shift();
  if (header !== `source_headword\t${LANGUAGE}\texample_${LANGUAGE}`) {
    throw new Error(`Unexpected TSV header: ${header}`);
  }
  const translations = new Map();
  for (const [index, line] of lines.entries()) {
    const cells = line.split("\t");
    if (cells.length !== 3) {
      throw new Error(`TSV row ${index + 2} must have exactly 3 tab-separated cells`);
    }
    const [sourceHeadword, display, example] = cells.map((cell) => cell.trim());
    if (!sourceHeadword || !display || !example) {
      throw new Error(`TSV row ${index + 2} has an empty required cell`);
    }
    if (translations.has(sourceHeadword)) {
      throw new Error(`Duplicate translation source headword: ${sourceHeadword}`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Serbian example for ${sourceHeadword} must end with sentence punctuation`);
    }
    if (!CYRILLIC_RE.test(display) || !CYRILLIC_RE.test(example)) {
      throw new Error(`Serbian row for ${sourceHeadword} must contain Cyrillic-script text`);
    }
    if (LATIN_LETTER_RE.test(display) || LATIN_LETTER_RE.test(example)) {
      throw new Error(`Serbian row for ${sourceHeadword} contains Latin-script letters`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Serbian row for ${sourceHeadword} contains an unexpected non-Cyrillic script`);
    }
    translations.set(sourceHeadword, { display, example });
  }
  return translations;
}

function validateTranslationMap(exampleRows, translations) {
  const expected = exampleRows.map((row) => row.source_headword);
  const missing = expected.filter((sourceHeadword) => !translations.has(sourceHeadword));
  const extra = [...translations.keys()].filter((sourceHeadword) => !expected.includes(sourceHeadword));
  if (missing.length || extra.length) {
    throw new Error(
      `SR translation source key mismatch: missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`
    );
  }
}

function buildSupportRow(row, translation, generatedAt) {
  return {
    release_id: row.release_id,
    course_id: row.course_id,
    row_id: row.row_id,
    core_item_id: row.core_item_id,
    meaning_id: row.meaning_id,
    source_headword: row.source_headword,
    reviewed_part_of_speech: row.reviewed_part_of_speech,
    meaning_note: row.meaning_note,
    semantic_scene: row.semantic_scene,
    support_translation_batch: BATCH_ID,
    support_translation_status: "draft_native_style_needs_source_assisted_qa",
    support_example_status: "draft_scene_preserving_needs_source_assisted_qa",
    support_translation_source: "codex_curated_native_style_support_translation_not_oxford",
    support_example_source: "codex_curated_scene_preserving_support_example_not_oxford",
    generated_at: generatedAt,
    [LANGUAGE]: translation.display,
    [`example_${LANGUAGE}`]: translation.example,
  };
}

function updateContract(contract, batchPath, summaryPath, rows) {
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
  contract.status = "support_language_batches_in_progress_not_delivery_ready";
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
    "- Script-aware validation: SR Cyrillic native orthography, Serbian display/example presence, sentence punctuation and Latin/non-Cyrillic script leak guard",
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
