#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "LT";
const BATCH_ID = "lt_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-lt.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const LT_TRANSLATIONS_TSV = `source_headword	LT	example_LT
clothes	drabužiai	Mano drabužiai švarūs.
club	klubas	Ji eina į muzikos klubą.
coat	paltas	Mano paltas šiltas.
coffee	kava	Ryte geriu kavą.
cold	šaltas; šalta	Vanduo šaltas.
college	kolegija; universitetas	Mano sesuo studijuoja universitete.
colour	spalva	Mano mėgstamiausia spalva yra mėlyna.
come	ateiti	Ateik čia, prašau.
common	dažnas; įprastas	Šis vardas dažnas.
company	įmonė; bendrovė	Mano mama dirba įmonėje.
compare	palyginti	Palygink šias dvi nuotraukas.
complete	pilnas; baigti	Forma yra užpildyta.
computer	kompiuteris	Šis kompiuteris naujas.
concert	koncertas	Šį vakarą einame į koncertą.
conversation	pokalbis	Turėjome trumpą pokalbį.
cook	gaminti; virėjas	Namuose gaminu vakarienę.
cooking	maisto gaminimas	Man patinka gaminti su tėčiu.
cool	vėsus; šaunus	Kambarys vėsus.
correct	teisingas; pataisyti	Tavo atsakymas teisingas.
cost	kaina; kainuoti	Kiek tai kainuoja?
could modal	galėti; galėčiau	Galėčiau tau padėti.
country	šalis; valstybė	Kanada yra didelė šalis.
course	kursas	Lankau anglų kalbos kursą.
cousin	pusbrolis; pusseserė	Mano pusbrolis gyvena netoli.
cow	karvė	Karvė ėda žolę.
cream	grietinėlė; kremas	Į kavą dedu grietinėlės.
create	kurti	Jie kuria naują žaidimą.
culture	kultūra	Mokomės apie vietos kultūrą.
cup	puodelis	Šis puodelis tuščias.
customer	klientas; pirkėjas	Klientas užduoda klausimą.
cut	pjauti; perpjauti	Perpjauk obuolį pusiau.
dad	tėtis	Tėtis yra darbe.
dance	šokti; šokis	Po vakarienės šokame.
dancer	šokėjas; šokėja	Šokėja greitai juda.
dancing	šokimas	Šokti smagu.
dangerous	pavojingas	Šis kelias pavojingas.
dark	tamsus	Kambarys tamsus.
date	data	Kokia šiandien data?
daughter	dukra	Jos dukrai šešeri.
day	diena	Linkiu tau geros dienos.
dear	brangus; mielas	Brangus drauge, ačiū.
December	gruodis	Mano gimtadienis yra gruodį.
decide	nuspręsti	Nuspręsk dabar, prašau.
delicious	skanus	Ši sriuba skani.
describe	apibūdinti	Apibūdink savo kambarį.
description	aprašymas	Perskaityk trumpą aprašymą.
design	dizainas; kurti	Kuriu paprastą kortelę.
desk	rašomasis stalas	Knyga yra ant mano stalo.
detail	detalė	Trūksta vienos detalės.
dialogue	dialogas	Perskaityk dialogą dabar.
dictionary	žodynas	Per pamoką naudok žodyną.
die	mirti	Gėlės miršta be vandens.
diet	mityba; dieta	Mano mityboje yra vaisių.
difference	skirtumas	Yra vienas skirtumas.
different	skirtingas	Mūsų vardai skirtingi.
difficult	sunkus	Šis klausimas sunkus.
dinner	vakarienė	Vakarienė paruošta.
dirty	purvinas	Mano batai purvini.
discuss	aptarti; diskutuoti	Aptariame planą.
dish	lėkštė; patiekalas	Ši lėkštė karšta.
do1	daryti	Ką darai?
doctor	gydytojas	Gydytojas užimtas.
dog	šuo	Šuo bėga lauke.
dollar	doleris	Tai kainuoja vieną dolerį.
door	durys	Uždaryk duris, prašau.
down	žemyn; apačioje	Atsisėsk čia apačioje.
downstairs	apačioje; pirmame aukšte	Virtuvė yra apačioje.
draw	piešti	Nupiešk mažą namą.
dress	suknelė; apsirengti	Ji dėvi raudoną suknelę.
drink	gėrimas; gerti	Geriu vandenį.
drive	vairuoti	Į darbą važiuoju automobiliu.
driver	vairuotojas	Vairuotojas čia sustoja.
during	per; metu	Miegu per skrydį.
DVD	DVD	Šis DVD senas.
each	kiekvienas	Kiekvienas vaikas turi knygą.
ear	ausis	Man skauda ausį.
early	anksti; ankstyvas	Keliuosi anksti.
east	rytai	Saulė teka rytuose.
easy	lengvas	Šis testas lengvas.
eat	valgyti	Pietus valgome kartu.
egg	kiaušinis	Valgau vieną kiaušinį.
eight	aštuoni	Turiu aštuonias korteles.
eighteen	aštuoniolika	Jai aštuoniolika metų.
eighty	aštuoniasdešimt	Mano seneliui aštuoniasdešimt metų.
elephant	dramblys	Dramblys didelis.
eleven	vienuolika	Pamoka prasideda vienuoliktą.
else	kitas; dar	Ko dar tau reikia?
email	el. laiškas	Atsiųsk man el. laišką.
end	pabaiga; baigti	Tai pabaiga.
enjoy	mėgautis; patikti	Man patinka ši daina.
enough	pakankamai	Turime pakankamai laiko.
euro	euras	Tai kainuoja vieną eurą.
even	net	Net mano brolis žino.
evening	vakaras	Susitinkame šį vakarą.
event	renginys	Renginys prasideda šiandien.
ever	kada nors	Ar kada nors gamini?
every	kiekvienas	Mokausi kiekvieną dieną.
everybody	visi	Visi yra čia.
everyone	kiekvienas	Kiekvienam patinka muzika.
everything	viskas	Viskas paruošta.
exam	egzaminas	Egzaminas netrukus prasidės.
example	pavyzdys	Tai geras pavyzdys.
excited	susijaudinęs; nekantraujantis	Šiandien esu susijaudinęs.
exciting	jaudinantis	Žaidimas jaudinantis.
exercise	pratimas; mankštintis	Prieš pusryčius mankštinuosi.
expensive	brangus	Šis paltas brangus.
explain	paaiškinti	Paaiškink šį žodį, prašau.
extra	papildomas; dar	Man reikia papildomo laiko.
eye	akis	Mano akis raudona.
face	veidas	Nusiprausk veidą.
fact	faktas	Šis faktas svarbus.
fall	kristi; ruduo	Lapai krinta rudenį.
false	klaidingas; netikras	Tas atsakymas klaidingas.
family	šeima	Mano šeima maža.
famous	žymus	Ji yra žymi dainininkė.
fantastic	fantastiškas	Koncertas buvo fantastiškas.
far	toli	Mokykla yra toli.
farm	ūkis	Jie gyvena ūkyje.
farmer	ūkininkas	Ūkininkas augina maistą.
fast	greitas	Šis traukinys greitas.
fat	storas	Katė stora.
father	tėvas	Mano tėvas aukštas.
favourite	mėgstamiausias	Tai mano mėgstamiausia daina.
February	vasaris	Vasarį čia šalta.
feel	jausti	Jaučiuosi laimingas.
feeling	jausmas	Pažįstu tą jausmą.
festival	festivalis	Festivalis prasideda rytoj.
few	keletas	Čia yra keletas mokinių.
fifteen	penkiolika	Man penkiolika metų.
fifth	penktas	Tai penkta pamoka.
fifty	penkiasdešimt	Mano mamai penkiasdešimt metų.
fill	pripildyti; užpildyti	Pripildyk puodelį vandens.
film	filmas	Žiūrime filmą.
final	galutinis; paskutinis	Tai paskutinis klausimas.
find	rasti	Randu savo raktus.
fine	gerai	Dabar jaučiuosi gerai.
finish	baigti	Baik namų darbus.
fire	ugnis	Ugnis karšta.
first	pirmas	Ji yra pirma eilėje.
fish	žuvis	Vakarienei valgau žuvį.
five	penki	Turiu penkias knygas.
flat	butas	Mano butas mažas.
flight	skrydis	Skrydis vėluoja.
floor	grindys; aukštas	Krepšys yra ant grindų.
flower	gėlė	Ši gėlė geltona.
fly	skristi	Paukščiai skrenda dangumi.
follow	sekti	Sek paskui mane, prašau.
food	maistas	Maistas paruoštas.
foot	pėda	Man skauda pėdą.
football	futbolas	Šiandien žaidžiame futbolą.
for	dėl; už	Ši dovana tau.
forget	pamiršti	Nepamiršk raktų.
form	forma	Užpildyk formą.
forty	keturiasdešimt	Mano tėvui keturiasdešimt metų.
four	keturi	Matau keturis paukščius.
fourteen	keturiolika	Jai keturiolika metų.
fourth	ketvirtas	Tai ketvirtas aukštas.
free	nemokamas; laisvas	Bilietas nemokamas.
Friday	penktadienis	Susitinkame penktadienį.
friend	draugas	Mano draugas yra čia.
friendly	draugiškas	Mokytojas draugiškas.
from	iš; nuo	Aš esu iš čia.
front	priekis; priekyje	Stovėk priekyje.
fruit	vaisiai	Kasdien valgau vaisių.
full	pilnas	Butelis pilnas.
fun	pramoga; smagus	Šis žaidimas smagus.
funny	juokingas	Filmas juokingas.
future	ateitis	Pagalvok apie savo ateitį.
game	žaidimas	Žaidimas prasideda dabar.
garden	sodas	Sodas gražus.
geography	geografija	Mokykloje mokausi geografijos.
get	gauti; atvykti	Namo grįžtu šeštą.
girl	mergaitė; mergina	Mergaitė šypsosi.
girlfriend	mergina	Jo mergina maloni.
give	duoti	Duok man knygą.
glass	stiklinė; stiklas	Geriu iš stiklinės.
go	eiti	Dabar einame namo.
good	geras	Ši kava gera.
goodbye	viso gero	Viso gero, iki rytojaus.
grandfather	senelis	Mano senelis senas.
grandmother	močiutė	Mano močiutė verda sriubą.
grandparent	senelis arba močiutė	Močiutė gyvena su mumis.
great	puikus	Tai puiki idėja.
green	žalias	Durys žalios.
grey	pilkas	Dangus pilkas.
group	grupė	Dirbkite mažoje grupėje.
grow	augti; auginti	Augalai auga sode.
guess	atspėti; spėti	Atspėk atsakymą.
guitar	gitara	Jis groja gitara.
gym	sporto salė; sporto klubas	Einu į sporto salę.
hair	plaukai	Jos plaukai ilgi.
half	pusė	Perpjauk pyragą pusiau.
hand	ranka	Pakelk ranką.
happen	įvykti	Kas įvyks toliau?
happy	laimingas	Šiandien esu laimingas.
hard	sunkus; kietas	Ši kėdė kieta.
hat	skrybėlė; kepurė	Mano skrybėlė juoda.
hate	nekęsti	Nekenčiu šaltos arbatos.
have	turėti	Turiu automobilį.
have to modal	turėti; privalėti	Turiu mokytis.
he	jis	Jis yra mano brolis.
head	galva	Man skauda galvą.
health	sveikata	Geras maistas padeda sveikatai.
healthy	sveikas	Šis valgis sveikas.
hear	girdėti	Girdžiu muziką.
hello	labas	Labas, malonu susipažinti.
help	pagalba; padėti	Prašau, padėk man.
her	jos; ją	Tai jos rankinė.
here	čia	Ateik čia dabar.
hey	ei	Ei, palauk manęs.
hi	labas	Labas, kaip sekasi?
high	aukštas	Siena aukšta.
him	jį	Pažįstu jį.
his	jo	Jo paltas mėlynas.
history	istorija	Mokausi istorijos.
hobby	pomėgis	Skaitymas yra mano pomėgis.
holiday	atostogos; šventė	Liepą vykstame atostogų.
home	namai; namuose	Esu namuose.
homework	namų darbai	Šį vakarą padaryk namų darbus.
hope	tikėtis	Tikiuosi, kad ateisi.
horse	arklys	Arklys greitai bėga.
hospital	ligoninė	Ligoninė yra netoli.
hot	karštas	Sriuba karšta.
hotel	viešbutis	Viešbutis švarus.
hour	valanda	Palauk vieną valandą.
house	namas	Šis namas senas.
how	kaip	Kaip laikaisi?
however	tačiau	Tačiau galiu likti čia.
hundred	šimtas	Atėjo šimtas žmonių.
hungry	alkanas	Esu alkanas.
husband	vyras	Jos vyras yra gydytojas.
I	aš	Mėgstu arbatą.
ice	ledas	Ledas šaltas.
ice cream	ledai	Noriu ledų.
idea	idėja	Tai gera idėja.
if	jei	Paskambink man, jei reikia pagalbos.
imagine	įsivaizduoti	Įsivaizduok mažą namą.
important	svarbus	Ši pamoka svarbi.
improve	tobulinti; pagerinti	Noriu tobulėti.
in	į; viduje	Raktai yra mano krepšyje.
include	įtraukti	Įtrauk savo vardą, prašau.
information	informacija	Man reikia daugiau informacijos.
interest	susidomėjimas; interesas	Ji domisi menu.
interested	susidomėjęs	Domiuosi muzika.
interesting	įdomus	Ši knyga įdomi.
internet	internetas	Internetas lėtas.
interview	pokalbis; interviu	Šiandien turiu interviu.
into	į; vidun	Įdėk knygas į krepšį.
introduce	pristatyti	Pristatyk savo draugą.
island	sala	Ši sala maža.
it	tai; jis	Šalta.
its	jo; jos	Šuo mėgsta savo guolį.
jacket	striukė	Mano striukė nauja.
January	sausis	Sausis yra pirmas mėnuo.
jeans	džinsai	Mano džinsai mėlyni.
job	darbas	Man reikia naujo darbo.
join	prisijungti	Prisijunk prie mūsų klasės šiandien.
journey	kelionė	Kelionė ilga.
juice	sultys	Geriu apelsinų sultis.
July	liepa	Liepą keliaujame.
June	birželis	Mokykla baigiasi birželį.
just	ką tik; tik	Man reikia tik vandens.
keep	laikyti; pasilikti	Pasilik šį raktą.
key	raktas	Pamečiau raktą.
kilometre	kilometras	Eik vieną kilometrą.
kind (type)	rūšis; tipas	Kokią muzikos rūšį mėgsti?
kitchen	virtuvė	Virtuvė švari.
know	žinoti; pažinti	Žinau atsakymą.
land	sausuma; žemė	Lėktuvas yra ant žemės.
language	kalba	Anglų kalba yra kalba.
large	didelis	Šis kambarys didelis.
last1 (final)	paskutinis	Tai paskutinis puslapis.
late	vėlyvas; vėlai	Autobusas vėluoja.
later	vėliau	Pasimatysime vėliau.
laugh	juoktis	Juokiamės kartu.
learn	mokytis	Mokausi anglų kalbos.
leave	išeiti; palikti	Palik duris atviras.
left	kairė; kairysis	Čia pasuk į kairę.
leg	koja	Man skauda koją.
lesson	pamoka	Pamoka prasideda dabar.
let	leisti	Leisk man padėti.
letter	laiškas; raidė	Rašau laišką.
library	biblioteka	Biblioteka atsidaro devintą.
lie1	gulėti	Atsigulk ant lovos.
life	gyvenimas	Miesto gyvenimas judrus.
like (similar)	kaip; panašus	Tai kaip žaidimas.
like (find sb/sth pleasant)	patikti; mėgti	Man patinka ši daina.
line	eilė; linija	Stok į eilę.
lion	liūtas	Liūtas miega.
list	sąrašas	Sudaryk pirkinių sąrašą.
listen	klausyti	Klausyk mokytojo.
little	mažas; mažai	Turiu mažai pinigų.
live1	gyventi	Gyvenu netoli mokyklos.
local	vietinis	Tai vietinė parduotuvė.
long1	ilgas	Kelias ilgas.
look	žiūrėti; atrodyti	Pažiūrėk į paveikslą.
lose	pamesti; prarasti	Nepamesk bilieto.
lot	daug	Turiu daug namų darbų.
love	mylėti; meilė	Myliu savo šeimą.
lunch	pietūs	Pietūs paruošti.`;

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
  const lines = LT_TRANSLATIONS_TSV.trim().split(/\n/u);
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
      throw new Error(`Lithuanian example for ${sourceHeadword} must end with sentence punctuation`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Lithuanian row for ${sourceHeadword} must contain Latin-script text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Lithuanian row for ${sourceHeadword} contains a non-Latin script`);
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
      `LT translation source key mismatch: missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`
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
    "- Script-aware validation: LT Latin native orthography, Lithuanian display/example presence, sentence punctuation and non-Latin script leak guard",
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
