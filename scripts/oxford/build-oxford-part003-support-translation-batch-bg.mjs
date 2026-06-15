#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_003_300_v1";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_bg_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_bg_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-bg.mjs";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "BG";
const BATCH_ID = "bg_v1";
const RELEASE_ENTRY_COUNT = 300;
const SENTENCE_END_RE = /[.!?]$/u;
const CYRILLIC_RE = /\p{Script=Cyrillic}/u;
const UNEXPECTED_SCRIPT_RE = /[\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const BG_TRANSLATIONS_TSV = `source_headword	BG	example_BG
machine	машина; апарат	Машината прави кафе.
magazine	списание	Чете музикално списание.
main	основен; главен	Това е главната врата.
make	правя; приготвям	Приготвям обяд у дома.
man	мъж	Мъжът е моят учител.
many	много	Тук има много ученици.
map	карта	Погледни картата.
March	март	Рожденият ми ден е през март.
market	пазар	Купуваме плодове на пазара.
married	женен; омъжена	Сестра ми е омъжена.
May	май	Училището свършва през май.
maybe	може би	Може би ще вали.
me	мен; ми	Помогни ми, моля.
meal	хранене; ястие	Ястието е топло.
mean	означавам	Какво означава знакът?
meaning	значение	Какво е значението?
meat	месо	Ям месо за вечеря.
meet	срещам; срещам се	Срещаме се след училище.
meeting	среща; събрание	Срещата започва сега.
member	член	Тя е член на клуба.
menu	меню	Прочети менюто.
message	съобщение	Изпращам кратко съобщение.
metre	метър	Върви един метър напред.
midnight	полунощ	Влакът тръгва в полунощ.
mile	миля	Вървим една миля.
milk	мляко	Пия мляко на закуска.
million	милион	Тук живеят един милион души.
minute1	минута	Изчакай една минута.
miss	пропускам; липсвам	Липсва ми старото училище.
mistake	грешка	В отговора има грешка.
model	модел	Това е малък модел.
modern	модерен	Кухнята е модерна.
moment	момент; миг	Изчакай един момент.
Monday	понеделник	Започваме работа в понеделник.
money	пари	Трябват ми малко пари.
month	месец	Юни е топъл месец.
more	повече	Трябва ми повече време.
morning	сутрин	Уча сутрин.
most	повечето; най-много	Повечето ученици обичат музика.
mother	майка	Майка ми работи днес.
mountain	планина	Планината е много висока.
mouse	мишка	Под стола има мишка.
mouth	уста	Отвори устата си.
move	движа се; местя	Премести стола тук.
movie	филм	Гледаме филм тази вечер.
much	много; колко	Колко струва това?
mum	мама	Мама е вкъщи.
museum	музей	Музеят отваря в десет.
music	музика	Слушам музика.
must modal	трябва	Трябва да спреш тук.
my	мой; моя	Това е моята книга.
name	име; назовавам	Напиши името си тук.
natural	естествен; натурален	Този сок е натурален.
near	близо	Банката е близо.
need	нужда; имам нужда	Имам нужда от химикалка.
negative	отрицателен; негативен	Този отговор е отрицателен.
neighbour	съсед	Съседът ми е приятелски настроен.
never	никога	Никога не пия кафе.
new	нов	Този телефон е нов.
news	новини	Днешните новини са добри.
newspaper	вестник	Чете вестник.
next	следващ	Следващият автобус закъснява.
next to	до	Седни до мен.
nice	мил; приятен	Стаята е приятна.
night	нощ	Спя през нощта.
nine	девет	Тук има девет ученици.
nineteen	деветнадесет	Той е на деветнадесет.
ninety	деветдесет	Дядо ми е на деветдесет.
no	не; няма	Не, благодаря.
no one	никой	В стаята няма никого.
nobody	никой	Вкъщи няма никого.
north	север	Гарата е на север.
nose	нос	Носът ми е студен.
not	не	Не съм уморен.
note	бележка	Напиши бележка сега.
nothing	нищо	В кутията няма нищо.
November	ноември	Курсът ми започва през ноември.
now	сега	Ела тук сега.
number	номер; число	Напиши номера тук.
nurse	медицинска сестра; медицински брат	Сестрата е мила.
object	предмет; обект	Постави предмета на масата.
o’clock	часа	Урокът започва в девет часа.
October	октомври	Пътуваме през октомври.
of	на; от	Това е чаша чай.
off	изключен; долу	Изключи лампата.
office	офис; кабинет	Офисът ми е малък.
often	често	Често ходя пеша на училище.
oh	о; ах	Ах, сега разбирам.
OK	добре; окей	Това наред ли е?
old	стар; възрастен	Тази къща е стара.
on	на; включен	Книгата е на масата.
once	веднъж	Обаждам се веднъж седмично.
one	един; една	Имам една сестра.
onion	лук	Нарежи една глава лук.
online	онлайн	Уча онлайн.
only	само	Имам само една чанта.
open	отворен; отварям	Отвори прозореца.
opinion	мнение	Какво е твоето мнение?
opposite	срещу; противоположен	Магазинът е срещу банката.
or	или	Чай или кафе?
orange	портокал; оранжев	Портокалът е сладък.
order	поръчка; поръчвам	Поръчвам супа.
other	друг; друга	Използвай другата врата.
our	наш; наша	Това е нашият клас.
out	навън	Излез навън след обяд.
outside	навън; отвън	Децата играят навън.
over	над; през	Самолетът лети над града.
own	собствен; притежавам	Имам собствена стая.
page	страница	Отвори страница десет.
paint	боя; рисувам	Боядисай стената в синьо.
painting	картина	Картината е красива.
pair	чифт	Трябва ми чифт чорапи.
paper	хартия; документ	Пиши на тази хартия.
paragraph	абзац	Прочети първия абзац.
parent	родител	Един родител чака навън.
park	парк; паркирам	Паркираме близо до гарата.
part	част	Тази част е лесна.
partner	партньор; партньорка	Работи с партньора си.
party	парти; купон	Партито започва в седем.
passport	паспорт	Покажи паспорта си.
past	минало; след	Часът е шест и половина.
pay	плащам	Плащам с карта.
pen	химикалка	Тази химикалка е синя.
pencil	молив	Пиша с молив.
people	хора	Тук има много хора.
pepper	пипер	Сложи пипер в супата.
perfect	перфектен	Отговорът ти е перфектен.
period	период; час	Този час е кратък.
person	човек; лице	Един човек чака.
personal	личен	Това е личният ми телефон.
phone	телефон; обаждам се	Телефонът ми е в чантата.
photo	снимка	Направи снимка тук.
photograph	фотография; снимка	Снимката е стара.
phrase	фраза	Повтори тази фраза.
piano	пиано	Той свири на пиано.
picture	картина; снимка	Погледни картината.
piece	парче	Вземи парче торта.
pig	прасе	Прасето е във фермата.
pink	розов	Чантата й е розова.
place	място; поставям	Мястото е тихо.
plan	план	Нужен ни е план.
plane	самолет	Самолетът закъснява.
plant	растение; засаждам	Полей растението днес.
play	играя; пиеса	Децата играят в парка.
player	играч	Играчът тича бързо.
please	моля	Седни тук, моля.
point	точка; идея	Тази точка е важна.
police	полиция	Полицията е навън.
policeman	полицай	Полицаят ни помага.
pool	басейн	Басейнът е студен.
poor	беден	Бедното дете е гладно.
popular	популярен	Тази песен е популярна.
positive	положителен	Резултатът е положителен.
possible	възможен	Възможно ли е днес?
post	публикация; поща	Чета публикацията му онлайн.
potato	картоф	Ям един картоф.
pound	паунд	Струва един паунд.
practice	практика; упражнение	Практиката помага всеки ден.
practise	упражнявам се	Упражнявам английски всеки ден.
prefer	предпочитам	Предпочитам чай.
prepare	подготвям; приготвям	Приготви чантата си вечерта.
present	настоящ; подарък	Той присъства днес.
pretty	красив; доста	Градината е красива.
price	цена	Цената е ниска.
probably	вероятно	Вероятно знае.
problem	проблем	Проблемът е малък.
product	продукт	Продуктът е нов.
programme	програма; предаване	Програмата започва сега.
project	проект	Проектът ни е готов.
purple	лилав	Ризата е лилава.
put	слагам; поставям	Сложи книгата тук.
quarter	четвърт	Часът е два и четвърт.
question	въпрос	Задай въпрос.
quick	бърз; кратък	Това е кратък тест.
quickly	бързо	Върви бързо.
quiet	тих	Библиотеката е тиха.
quite	доста	Стаята е доста малка.
radio	радио	Радиото е силно.
rain	дъжд; вали	Сега започва да вали.
read	чета	Прочети това изречение.
reader	читател	Читателят харесва историята.
reading	четене	Четенето помага за учене.
ready	готов	Вечерята е готова.
real	истински; реален	Има истински проблем.
really	наистина	Наистина харесвам тази песен.
reason	причина	Кажи причината.
red	червен	Вратата е червена.
relax	отпускам се; почивам	Почини си след работа.
remember	помня; не забравям	Не забравяй паспорта си.
repeat	повтарям	Повтори изречението.
report	доклад; отчет	Прочети доклада тази вечер.
restaurant	ресторант	Ресторантът е пълен.
result	резултат	Резултатът е добър.
return	връщам се; връщам	Върни книгата утре.
rice	ориз	Ям ориз за обяд.
rich	богат	Този град е богат.
ride	карам; яздя; пътуване	Ходя на училище с колело.
right	десен; правилен	Завий надясно тук.
river	река	Реката е широка.
road	път	Пътят е дълъг.
room	стая	Стаята ми е чиста.
routine	рутина; режим	Режимът ми започва рано.
rule	правило	Правилото е просто.
run	тичам	Тичам всяка сутрин.
sad	тъжен	Днес съм тъжен.
salad	салата	Салатата е свежа.
salt	сол	Добави малко сол.
same	същият; еднакъв	Имаме същата чанта.
sandwich	сандвич	Ям сандвич.
Saturday	събота	Срещаме се в събота.
say	казвам	Кажи името си.
school	училище	Училището ми е близо.
science	наука	Изучавам наука.
scientist	учен	Ученият задава въпрос.
sea	море	Морето е синьо.
second1 (unit of time)	секунда	Изчакай една секунда.
section	раздел; секция	Прочети този раздел.
see	виждам	Виждам приятеля си.
sell	продавам	Продават пресни плодове.
send	изпращам	Изпрати съобщението сега.
sentence	изречение	Напиши изречение.
September	септември	Училището започва през септември.
seven	седем	Тук има седем души.
seventeen	седемнадесет	Той е на седемнадесет.
seventy	седемдесет	Баба ми е на седемдесет.
share	споделям; разделям	Раздели тортата.
she	тя	Тя е сестра ми.
sheep	овца	Овцата яде трева.
shirt	риза	Ризата е чиста.
shoe	обувка	Обувката е под леглото.
shop	магазин; пазарувам	Магазинът затваря рано.
shopping	пазаруване	Пазаруването е забавно днес.
short	къс; кратък	Историята е кратка.
should modal	трябва; би трябвало	Трябва да си починеш днес.
show	показвам; шоу	Покажи билета си.
shower	душ; вземам душ	Взимам душ сутрин.
sick	болен	Днес съм болен.
similar	подобен	Чантите ни са подобни.
sing	пея	Пея в часа.
singer	певец; певица	Певецът е известен.
sister	сестра	Сестра ми е млада.
sit	сядам; седя	Седни до прозореца.
situation	ситуация	Ситуацията е нова.
six	шест	Тук има шест книги.
sixteen	шестнадесет	Той е на шестнадесет.
sixty	шестдесет	Баща ми е на шестдесет.
skill	умение	Това умение е полезно.
skirt	пола	Полата е синя.
sleep	спя; сън	Спя осем часа.
slow	бавен	Автобусът е бавен.
small	малък	Стаята е малка.
snake	змия	Змията е дълга.
snow	сняг; вали сняг	През зимата вали сняг.
so	така; затова	Уморен съм, затова почивам.
some	няколко; малко	Трябва ми малко вода.
somebody	някой	Някой е на вратата.
someone	някой	Някой остави съобщение.
something	нещо	Трябва ми нещо за пиене.
sometimes	понякога	Понякога ходя пеша на училище.
son	син	Синът й е на училище.
song	песен	Тази песен е нова.
soon	скоро	Ще се видим скоро.
sorry	съжалявам; извинявай	Съжалявам.
sound	звук; звуча	Звукът е силен.
soup	супа	Супата е гореща.
south	юг	Хотелът е на юг.
space	място; пространство	Има място за стол.
speak	говоря	Говори бавно, моля.
special	специален	Днес е специален ден.
spell	изписвам буква по буква	Изпиши името си буква по буква.
spelling	правопис	Провери правописа.
spend	харча; прекарвам	Харча пари за храна.
sport	спорт	Футболът е популярен спорт.
spring	пролет; пружина	През пролетта цветята растат.
stand	стоя	Стой до вратата.
star	звезда	Виждам ярка звезда.
start	започвам; начало	Започни урока сега.
statement	твърдение; изявление	Твърдението е вярно.
station	гара; станция	Гарата е близо.
stay	оставам; стоя	Остани у дома днес.
still	още	Все още съм гладен.
stop	спирам; спирка	Спри на ъгъла.
story	история	Разкажи история.
street	улица	Улицата е тиха.
strong	силен	Той е силен.
student	ученик; студент	Ученикът чете книга.
study	уча; изследване	Уча английски.
style	стил	Харесвам този стил.
subject	предмет; тема	Английският е основният ми предмет.
success	успех	Успехът изисква практика.
sugar	захар	Сложи захар в чая.
summer	лято	Лятото тук е горещо.
sun	слънце	Слънцето е ярко.
Sunday	неделя	Почиваме в неделя.
supermarket	супермаркет	Супермаркетът е отворен.
sure	сигурен; разбира се	Сигурен съм.
sweater	пуловер	Пуловерът ми е топъл.
swim	плувам	Плувам всяка седмица.
swimming	плуване	Плуването е добро упражнение.
table	маса	Ключовете са на масата.`;

function parseArgs() {
  const args = new Map();
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/u);
    if (match) args.set(match[1], match[2]);
  }
  return args;
}

function parseTsv(tsv) {
  const [headerLine, ...lines] = tsv.trim().split(/\r?\n/u);
  if (headerLine !== `source_headword\t${LANGUAGE}\texample_${LANGUAGE}`) {
    throw new Error(`Unexpected TSV header: ${headerLine}`);
  }
  if (lines.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Bulgarian rows, found ${lines.length}`);
  }

  const map = new Map();
  for (const [lineIndex, line] of lines.entries()) {
    const cells = line.split("\t");
    if (cells.length !== 3) {
      throw new Error(`Invalid TSV cell count at data line ${lineIndex + 2}: ${line}`);
    }
    const [sourceHeadword, display, example] = cells.map((cell) => cell.trim());
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Blank TSV value at data line ${lineIndex + 2}: ${line}`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bulgarian example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!CYRILLIC_RE.test(display) || !CYRILLIC_RE.test(example)) {
      throw new Error(`Bulgarian display/example must contain Cyrillic text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Bulgarian display/example contains unexpected script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Bulgarian translation row for ${sourceHeadword}`);
    }
    map.set(sourceHeadword, { display, example });
  }
  return map;
}

async function readJsonl(filePath) {
  const raw = await readFile(filePath, "utf8");
  return raw
    .trim()
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function buildSupportRow(row, translation) {
  return {
    release_id: row.release_id,
    course_id: row.course_id,
    row_id: row.row_id,
    core_item_id: row.core_item_id,
    meaning_id: row.meaning_id,
    source_candidate_id: row.source_candidate_id,
    source_headword: row.source_headword,
    reviewed_display_headword: row.reviewed_display_headword,
    reviewed_part_of_speech: row.reviewed_part_of_speech,
    example_EN: row.example_EN,
    [LANGUAGE]: translation.display,
    [`example_${LANGUAGE}`]: translation.example,
    translation_status: "draft_native_style_needs_source_assisted_qa",
    example_translation_status: "draft_scene_preserving_needs_source_assisted_qa",
    target_language_transcription_status: "not_included_for_support_language",
    article_display_included: false,
    batch_id: BATCH_ID,
    batch_language: LANGUAGE,
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    generated_at: new Date().toISOString(),
  };
}

function updateContract(contract, outputPath, summaryPath, rows) {
  const batch = {
    batch_id: BATCH_ID,
    status: "draft_native_style_needs_source_assisted_qa_not_delivery_ready",
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    path: outputPath,
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

  const existing = Array.isArray(contract.latest_support_translation_batches)
    ? contract.latest_support_translation_batches.filter((item) => item.batch_id !== BATCH_ID)
    : [];
  contract.latest_support_translation_batches = [...existing, batch];
  contract.status = "support_language_batches_in_progress_not_delivery_ready";
  contract.next_stage_options = [
    "Generate HR support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after HR.",
    "Run weak-language targeted review and source-backed support-language audits after all support languages are covered.",
    "Export US/UK workbooks only after all support-language gates pass.",
  ];
  contract.updated_at = new Date().toISOString();
  return contract;
}

async function main() {
  const args = parseArgs();
  const contractPath = args.get("contract");
  if (!contractPath) {
    throw new Error(`Usage: node ${SCRIPT_PATH} --contract=<contract.json>`);
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== RELEASE_ID) {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(BG_TRANSLATIONS_TSV);

  if (rows.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Bulgarian translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Bulgarian translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(JSONL_PATH), { recursive: true });
  await writeFile(JSONL_PATH, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Bulgarian; display cells use base forms and do not force definite suffixes
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: BG Cyrillic display/example cells with no unexpected script leakage
- Target-language transcriptions: not included
- Postgres import: false
- Google Sheet delivery: false

This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.
`;
  await writeFile(SUMMARY_PATH, summary);

  const updatedContract = updateContract(contract, JSONL_PATH, SUMMARY_PATH, outputRows);
  await writeFile(contractPath, `${JSON.stringify(updatedContract, null, 2)}\n`);

  console.log(JSON.stringify({
    release_id: releaseId,
    batch_id: BATCH_ID,
    languages: [LANGUAGE],
    rows: outputRows.length,
    display_cells: outputRows.length,
    example_cells: outputRows.length,
    path: JSONL_PATH,
    contract_updated: contractPath,
    completed_support_languages: updatedContract.latest_support_translation_batches.length,
    next_language: "HR",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
