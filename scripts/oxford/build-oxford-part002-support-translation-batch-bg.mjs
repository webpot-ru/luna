#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "BG";
const BATCH_ID = "bg_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-bg.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const CYRILLIC_RE = /\p{Script=Cyrillic}/u;
const UNEXPECTED_SCRIPT_RE = /[\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const BG_TRANSLATIONS_TSV = `source_headword	BG	example_BG
clothes	дрехи	Дрехите ми са чисти.
club	клуб	Тя ходи в музикален клуб.
coat	палто; яке	Палтото ми е топло.
coffee	кафе	Пия кафе сутрин.
cold	студен; студено	Водата е студена.
college	колеж; университет	Сестра ми учи в университет.
colour	цвят	Любимият ми цвят е син.
come	идвам	Ела тук, моля.
common	често срещан; обикновен	Това име е често срещано.
company	компания; фирма	Майка ми работи във фирма.
compare	сравнявам	Сравни тези две снимки.
complete	пълен; завършен; завършвам	Формулярът е завършен.
computer	компютър	Този компютър е нов.
concert	концерт	Тази вечер отиваме на концерт.
conversation	разговор	Имахме кратък разговор.
cook	готвя; готвач	Готвя вечеря у дома.
cooking	готвене	Обичам да готвя с татко.
cool	хладен; готин	Стаята е хладна.
correct	правилен; поправям	Отговорът ти е правилен.
cost	цена; струвам	Колко струва това?
could modal	мога; бих могъл	Бих могъл да ти помогна.
country	държава; страна	Канада е голяма държава.
course	курс	Ходя на курс по английски.
cousin	братовчед; братовчедка	Братовчед ми живее наблизо.
cow	крава	Кравата яде трева.
cream	сметана; крем	Слагам сметана в кафето.
create	създавам	Те създават нова игра.
culture	култура	Учим за местната култура.
cup	чаша	Тази чаша е празна.
customer	клиент	Клиентът задава въпрос.
cut	режа	Разрежи ябълката на две.
dad	татко	Татко е на работа.
dance	танцувам; танц	Танцуваме след вечеря.
dancer	танцьор; танцьорка	Танцьорката се движи бързо.
dancing	танцуване	Танцуването е забавно.
dangerous	опасен	Този път е опасен.
dark	тъмен; тъмно	Стаята е тъмна.
date	дата	Коя дата е днес?
daughter	дъщеря	Дъщеря й е на шест години.
day	ден	Пожелавам ти хубав ден.
dear	скъп; мил	Скъпи приятелю, благодаря.
December	декември	Рожденият ми ден е през декември.
decide	решавам	Реши сега, моля.
delicious	вкусен	Тази супа е вкусна.
describe	описвам	Опиши стаята си.
description	описание	Прочети краткото описание.
design	дизайн; проектирам	Проектирам проста карта.
desk	бюро	Книгата е на бюрото ми.
detail	детайл	Липсва един детайл.
dialogue	диалог	Прочети диалога сега.
dictionary	речник	Използвай речник в час.
die	умирам	Цветята умират без вода.
diet	диета; хранене	Диетата ми включва плодове.
difference	разлика	Има една разлика.
different	различен	Имаме различни имена.
difficult	труден	Този въпрос е труден.
dinner	вечеря	Вечерята е готова.
dirty	мръсен	Обувките ми са мръсни.
discuss	обсъждам	Обсъждаме плана.
dish	чиния; ястие	Тази чиния е гореща.
do1	правя	Какво правиш?
doctor	лекар	Лекарят е зает.
dog	куче	Кучето тича навън.
dollar	долар	Струва един долар.
door	врата	Затвори вратата, моля.
down	долу; надолу	Седни тук долу.
downstairs	долу; на долния етаж	Кухнята е долу.
draw	рисувам	Нарисувай малка къща.
dress	рокля; обличам	Тя носи червена рокля.
drink	напитка; пия	Пия вода.
drive	шофирам	Шофирам до работа.
driver	шофьор	Шофьорът спира тук.
during	по време на	Спя по време на полета.
DVD	ди ви ди	Това ди ви ди е старо.
each	всеки	Всяко дете има книга.
ear	ухо	Боли ме ухото.
early	ранен; рано	Ставам рано.
east	изток	Слънцето изгрява на изток.
easy	лесен	Този тест е лесен.
eat	ям	Обядваме заедно.
egg	яйце	Ям едно яйце.
eight	осем	Имам осем карти.
eighteen	осемнадесет	Тя е на осемнадесет.
eighty	осемдесет	Дядо ми е на осемдесет.
elephant	слон	Слонът е голям.
eleven	единадесет	Часът започва в единадесет.
else	друг; още	Какво още ти трябва?
email	имейл	Изпрати ми имейл.
end	край; свършвам	Това е краят.
enjoy	наслаждавам се; харесвам	Харесвам тази песен.
enough	достатъчно	Имаме достатъчно време.
euro	евро	Струва едно евро.
even	дори	Дори брат ми го знае.
evening	вечер	Ще се срещнем тази вечер.
event	събитие	Събитието започва днес.
ever	някога	Готвиш ли някога?
every	всеки	Уча всеки ден.
everybody	всички	Всички са тук.
everyone	всички	Всички харесват музика.
everything	всичко	Всичко е готово.
exam	изпит	Изпитът започва скоро.
example	пример	Това е добър пример.
excited	развълнуван	Днес съм развълнуван.
exciting	вълнуващ	Играта е вълнуваща.
exercise	упражнение; тренирам	Тренирам преди закуска.
expensive	скъп	Това палто е скъпо.
explain	обяснявам	Обясни тази дума, моля.
extra	допълнителен; още	Имам нужда от допълнително време.
eye	око	Окото ми е червено.
face	лице	Измий лицето си.
fact	факт	Този факт е важен.
fall	падам; есен	Листата падат през есента.
false	грешен; неверен	Този отговор е грешен.
family	семейство	Семейството ми е малко.
famous	известен	Той е известен певец.
fantastic	фантастичен	Концертът беше фантастичен.
far	далеч	Училището е далеч.
farm	ферма	Те живеят във ферма.
farmer	фермер	Фермерът отглежда храна.
fast	бърз	Този влак е бърз.
fat	дебел	Тази котка е дебела.
father	баща	Баща ми е висок.
favourite	любим	Това е любимата ми песен.
February	февруари	През февруари тук е студено.
feel	чувствам	Чувствам се щастлив.
feeling	чувство	Познавам това чувство.
festival	фестивал	Фестивалът започва утре.
few	няколко	Няколко ученици са тук.
fifteen	петнадесет	Аз съм на петнадесет.
fifth	пети	Това е петият час.
fifty	петдесет	Майка ми е на петдесет.
fill	пълня; попълвам	Напълни чашата с вода.
film	филм	Гледаме филм.
final	последен; окончателен	Това е последният въпрос.
find	намирам	Намирам ключовете си.
fine	добре	Сега съм добре.
finish	завършвам	Завърши домашното си.
fire	огън	Огънят е горещ.
first	първи	Той е първи на опашката.
fish	риба	Ям риба за вечеря.
five	пет	Имам пет книги.
flat	апартамент	Апартаментът ми е малък.
flight	полет	Полетът закъснява.
floor	под; етаж	Чантата е на пода.
flower	цвете	Това цвете е жълто.
fly	летя	Птиците летят в небето.
follow	следвам	Следвай ме, моля.
food	храна	Храната е готова.
foot	крак	Боли ме кракът.
football	футбол	Днес играем футбол.
for	за	Този подарък е за теб.
forget	забравям	Не забравяй ключовете.
form	формуляр	Попълни формуляра.
forty	четиридесет	Баща ми е на четиридесет.
four	четири	Виждам четири птици.
fourteen	четиринадесет	Той е на четиринадесет.
fourth	четвърти	Това е четвъртият етаж.
free	безплатен; свободен	Билетът е безплатен.
Friday	петък	Ще се срещнем в петък.
friend	приятел	Приятелят ми е тук.
friendly	приятелски настроен	Учителят е приятелски настроен.
from	от	Аз съм от България.
front	предна част; отпред	Стой отпред.
fruit	плодове	Ям плодове всеки ден.
full	пълен	Чашата е пълна.
fun	забавление	Играта е забавна.
funny	смешен	Този филм е смешен.
future	бъдеще	Мисля за бъдещето.
game	игра	Играем нова игра.
garden	градина	Децата са в градината.
geography	география	Имаме география в понеделник.
get	получавам	Получавам нов телефон.
girl	момиче	Момичето чете книга.
girlfriend	приятелка	Приятелката му е мила.
give	давам	Дай ми книгата, моля.
glass	чаша; стъкло	Чашата е на масата.
go	отивам	Сега отиваме вкъщи.
good	добър	Това е добра идея.
goodbye	довиждане	Кажи довиждане на приятелите си.
grandfather	дядо	Дядо ми е мил.
grandmother	баба	Баба ми прави чай.
grandparent	баба или дядо	Баба ми е важна за мен.
great	страхотен	Беше страхотен ден.
green	зелен	Тревата е зелена.
grey	сив	Небето е сиво.
group	група	Нашата група е малка.
grow	раста; отглеждам	Растенията растат бързо.
guess	познавам; предполагам	Познай името ми.
guitar	китара	Свиря на китара.
gym	фитнес; спортна зала	Ходя на фитнес.
hair	коса	Косата й е дълга.
half	половина	Дай ми половината.
hand	ръка	Вдигни ръка.
happen	случвам се	Какво се случи?
happy	щастлив	Днес съм щастлив.
hard	труден; твърд	Тази работа е трудна.
hat	шапка	Имам нова шапка.
hate	мразя	Мразя студения дъжд.
have	имам	Имам кола.
have to modal	трябва	Трябва да тръгвам сега.
he	той	Той е брат ми.
head	глава	Боли ме главата.
health	здраве	Здравето е важно.
healthy	здравословен; здрав	Ябълките са здравословни.
hear	чувам	Чувам музика.
hello	здравей	Кажи здравей на учителя.
help	помощ; помагам	Имам нужда от помощ.
her	нейният; нея	Това е нейната чанта.
here	тук	Седни тук.
hey	хей; здравей	Хей, ела тук.
hi	здрасти	Здрасти, аз съм Ана.
high	висок	Планината е висока.
him	него	Виждам го.
his	неговият	Това е неговият велосипед.
history	история	Харесвам история.
hobby	хоби	Хобито ми е четене.
holiday	ваканция; празник	Ваканцията ни започва утре.
home	дом; вкъщи	Отивам вкъщи.
homework	домашна работа	Пиша домашното си.
hope	надявам се	Надявам се на хубаво време.
horse	кон	Конят тича бързо.
hospital	болница	Болницата е наблизо.
hot	горещ	Чаят е горещ.
hotel	хотел	Хотелът е чист.
hour	час	Изчакай един час.
house	къща	Къщата ни е малка.
how	как	Как се чувстваш?
however	обаче	Мога обаче да остана тук.
hundred	сто	Дойдоха сто души.
hungry	гладен	Гладен съм.
husband	съпруг	Съпругът й е лекар.
I	аз	Харесвам чай.
ice	лед	Ледът е студен.
ice cream	сладолед	Искам сладолед.
idea	идея	Това е добра идея.
if	ако	Обади ми се, ако имаш нужда от помощ.
imagine	представям си	Представи си малка къща.
important	важен	Този час е важен.
improve	подобрявам	Искам да подобря уменията си.
in	в	Ключът е в чантата ми.
include	включвам	Включи името си, моля.
information	информация	Имам нужда от повече информация.
interest	интерес	Той има интерес към изкуството.
interested	заинтересован	Интересувам се от музика.
interesting	интересен	Тази книга е интересна.
internet	интернет	Интернетът е бавен.
interview	интервю	Днес имам интервю.
into	в; навътре	Сложи ключа в чантата.
introduce	представям	Представи приятеля си.
island	остров	Островът е малък.
it	то	То е на масата.
its	неговият; нейният	Кучето има своя купа.
jacket	яке	Якето ми е синьо.
January	януари	През януари е студено.
jeans	дънки	Нося дънки всеки ден.
job	работа	Търся работа.
join	присъединявам се	Присъедини се към нашата група.
journey	пътуване	Пътуването е дълго.
juice	сок	Пия портокалов сок.
July	юли	През юли е топло.
June	юни	Рожденият ми ден е през юни.
just	току-що; само	Току-що пристигнах.
keep	запазвам	Запази рестото.
key	ключ	Къде е ключът ми?
kilometre	километър	Училището е на километър.
kind (type)	вид	Какъв вид музика харесваш?
kitchen	кухня	Кухнята е чиста.
know	знам; познавам	Знам отговора.
land	земя; суша	Корабът е близо до сушата.
language	език	Уча нов език.
large	голям	Имаме голяма градина.
last1 (final)	последен	Това е последната страница.
late	късен; късно	Той пристига късно.
later	по-късно	Ще ти се обадя по-късно.
laugh	смея се	Смеем се заедно.
learn	уча	Уча английски.
leave	тръгвам; оставям	Трябва да тръгна сега.
left	ляв; наляво	Завий наляво.
leg	крак	Боли ме кракът.
lesson	урок; час	Урокът започва в девет.
let	позволявам; оставям	Позволи ми да помогна.
letter	писмо; буква	Пиша писмо.
library	библиотека	Библиотеката е тиха.
lie1	лежа; лъжа	Лежа на леглото.
life	живот	Животът е хубав.
like (similar)	като; подобен	Изглежда като брат си.
like (find sb/sth pleasant)	харесвам	Харесвам тази книга.
line	линия; ред	Застани на ред.
lion	лъв	Лъвът е силен.
list	списък	Напиши списък.
listen	слушам	Слушай музика.
little	малък; малко	Имам малко време.
live1	живея	Живея в София.
local	местен	Това е местен магазин.
long1	дълъг	Пътят е дълъг.
look	гледам; изглеждам	Погледни картината.
lose	губя	Не губи ключа си.
lot	много	Имам много работа.
love	обичам	Обичам семейството си.
lunch	обяд	Обядът е готов.`;

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
  const lines = BG_TRANSLATIONS_TSV.trim().split(/\n/u);
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
      throw new Error(`Bulgarian example for ${sourceHeadword} must end with sentence punctuation`);
    }
    if (!CYRILLIC_RE.test(display) || !CYRILLIC_RE.test(example)) {
      throw new Error(`Bulgarian row for ${sourceHeadword} must contain Cyrillic-script text`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Bulgarian row for ${sourceHeadword} contains an unexpected non-Cyrillic script`);
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
      `BG translation source key mismatch: missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`
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
    "- Script-aware validation: BG Cyrillic native orthography, Bulgarian display/example presence, sentence punctuation and unexpected-script leak guard",
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
