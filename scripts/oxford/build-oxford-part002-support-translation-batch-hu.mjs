#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "HU";
const BATCH_ID = "hu_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-hu.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const HU_TRANSLATIONS_TSV = `source_headword	HU	example_HU
clothes	ruhák; öltözék	A ruhám tiszta.
club	klub	Zenei klubba jár.
coat	kabát	A kabátom meleg.
coffee	kávé	Reggel kávét iszom.
cold	hideg	A víz hideg.
college	főiskola; egyetem	A nővérem főiskolán tanul.
colour	szín	A kedvenc színem kék.
come	jönni	Gyere ide, kérlek.
common	gyakori	Ez a név gyakori.
company	cég; vállalat	Anyám egy cégnél dolgozik.
compare	összehasonlítani	Hasonlítsd össze a két képet.
complete	teljes; kész; befejezni	Az űrlap kész.
computer	számítógép	Ez a számítógép új.
concert	koncert	Ma este koncertre megyünk.
conversation	beszélgetés	Rövid beszélgetésünk volt.
cook	főzni; szakács	Otthon vacsorát főzök.
cooking	főzés	Szeretek apával főzni.
cool	hűvös; menő	A szoba hűvös.
correct	helyes; kijavítani	A válaszod helyes.
cost	ár; kerül	Mennyibe kerül?
could modal	tudna; tudnék	Tudnék segíteni neked.
country	ország	Kanada nagy ország.
course	tanfolyam; kurzus	Angol tanfolyamra járok.
cousin	unokatestvér	Az unokatestvérem közel lakik.
cow	tehén	A tehén füvet eszik.
cream	tejszín; krém	Tejszínt teszek a kávéba.
create	létrehozni; alkotni	Új játékot alkotnak.
culture	kultúra	A helyi kultúráról tanulunk.
cup	csésze; bögre	Ez a bögre üres.
customer	vásárló; ügyfél	A vásárló kérdez valamit.
cut	vágni	Vágd félbe az almát.
dad	apa	Apa dolgozik.
dance	táncolni; tánc	Vacsora után táncolunk.
dancer	táncos	A táncos gyorsan mozog.
dancing	tánc; táncolás	A tánc szórakoztató.
dangerous	veszélyes	Ez az út veszélyes.
dark	sötét	A szoba sötét.
date	dátum	Mi a mai dátum?
daughter	lánygyermek; lánya	A lánya hatéves.
day	nap	Legyen szép napod.
dear	kedves; drága	Kedves barátom, köszönöm.
December	december	A születésnapom decemberben van.
decide	dönteni	Dönts most, kérlek.
delicious	finom	Ez a leves finom.
describe	leírni; jellemezni	Írd le a szobádat.
description	leírás	Olvasd el a rövid leírást.
design	terv; tervezni	Egyszerű kártyát tervezek.
desk	íróasztal	A könyv az íróasztalomon van.
detail	részlet	Egy részlet hiányzik.
dialogue	párbeszéd	Olvasd el a párbeszédet most.
dictionary	szótár	Használj szótárt az órán.
die	meghalni	A virágok víz nélkül meghalnak.
diet	étrend; diéta	Az étrendemben van gyümölcs.
difference	különbség	Van egy különbség.
different	más; különböző	Különböző neveink vannak.
difficult	nehéz	Ez a kérdés nehéz.
dinner	vacsora	A vacsora kész.
dirty	piszkos; koszos	A cipőm koszos.
discuss	megbeszélni; megvitatni	Megbeszéljük a tervet.
dish	tányér; étel	Ez a tányér forró.
do1	csinálni; tenni	Mit csinálsz?
doctor	orvos	Az orvos elfoglalt.
dog	kutya	A kutya kint fut.
dollar	dollár	Egy dollárba kerül.
door	ajtó	Zárd be az ajtót, kérlek.
down	le; lent	Ülj le ide.
downstairs	lent; a földszinten	A konyha lent van.
draw	rajzolni	Rajzolj egy kis házat.
dress	ruha; felöltözni	Piros ruhát visel.
drink	ital; inni	Vizet iszom.
drive	vezetni	Autóval megyek dolgozni.
driver	sofőr; vezető	A sofőr itt megáll.
during	alatt; közben	Alszom a repülés alatt.
DVD	dvd	Ez a dvd régi.
each	minden; mindegyik	Minden gyereknek van könyve.
ear	fül	Fáj a fülem.
early	korai; korán	Korán kelek.
east	kelet	A nap keleten kel fel.
easy	könnyű	Ez a teszt könnyű.
eat	enni	Együtt ebédelünk.
egg	tojás	Egy tojást eszem.
eight	nyolc	Nyolc kártyám van.
eighteen	tizennyolc	Ő tizennyolc éves.
eighty	nyolcvan	A nagyapám nyolcvan éves.
elephant	elefánt	Az elefánt nagy.
eleven	tizenegy	Az óra tizenegykor kezdődik.
else	más; még	Mire van még szükséged?
email	e-mail	Küldj nekem e-mailt.
end	vég; befejezni	Ez a vég.
enjoy	élvezni; szeretni	Szeretem ezt a dalt.
enough	elég	Elég időnk van.
euro	euró	Egy euróba kerül.
even	még; sőt	Még a bátyám is tudja.
evening	este	Ma este találkozunk.
event	esemény; rendezvény	A rendezvény ma kezdődik.
ever	valaha; valamikor	Szoktál valaha főzni?
every	minden	Minden nap tanulok.
everybody	mindenki	Mindenki itt van.
everyone	mindenki	Mindenki szereti a zenét.
everything	minden	Minden kész.
exam	vizsga	A vizsga hamarosan kezdődik.
example	példa	Ez jó példa.
excited	izgatott	Ma izgatott vagyok.
exciting	izgalmas	A játék izgalmas.
exercise	gyakorlat; edzeni	Reggeli előtt edzek.
expensive	drága	Ez a kabát drága.
explain	elmagyarázni	Magyarázd el ezt a szót, kérlek.
extra	extra; plusz	Plusz időre van szükségem.
eye	szem	A szemem piros.
face	arc	Mosd meg az arcodat.
fact	tény	Ez a tény fontos.
fall	esni; ősz	A levelek ősszel hullanak.
false	hamis; téves	Az a válasz téves.
family	család	A családom kicsi.
famous	híres	Ő híres énekes.
fantastic	fantasztikus	A koncert fantasztikus volt.
far	messze; távoli	Az iskola messze van.
farm	farm; gazdaság	Egy farmon élnek.
farmer	gazda; gazdálkodó	A gazda ételt termel.
fast	gyors	Ez a vonat gyors.
fat	kövér	Az a macska kövér.
father	apa; édesapa	Apám magas.
favourite	kedvenc	Ez a kedvenc dalom.
February	február	Februárban itt hideg van.
feel	érezni	Boldognak érzem magam.
feeling	érzés	Ismerem ezt az érzést.
festival	fesztivál	A fesztivál holnap kezdődik.
few	néhány	Néhány diák itt van.
fifteen	tizenöt	Tizenöt éves vagyok.
fifth	ötödik	Ez az ötödik óra.
fifty	ötven	Anyám ötven éves.
fill	kitölteni; megtölteni	Töltsd meg a bögrét vízzel.
film	film	Filmet nézünk.
final	utolsó; végső	Ez az utolsó kérdés.
find	megtalálni	Megtalálom a kulcsaimat.
fine	jól; rendben	Most jól vagyok.
finish	befejezni	Fejezd be a házi feladatodat.
fire	tűz	A tűz forró.
first	első	Ő az első a sorban.
fish	hal	Vacsorára halat eszem.
five	öt	Öt könyvem van.
flat	lakás	A lakásom kicsi.
flight	repülőút; járat	A járat késik.
floor	padló; emelet	A táska a padlón van.
flower	virág	Ez a virág sárga.
fly	repülni	A madarak az égen repülnek.
follow	követni	Kövess engem, kérlek.
food	étel	Az étel kész.
foot	lábfej; láb	Fáj a lábam.
football	futball; labdarúgás	Ma futballozunk.
for	számára; -nak/-nek	Ez az ajándék neked van.
forget	elfelejteni	Ne felejtsd el a kulcsokat.
form	űrlap	Töltsd ki az űrlapot.
forty	negyven	Apám negyven éves.
four	négy	Négy madarat látok.
fourteen	tizennégy	Ő tizennégy éves.
fourth	negyedik	Ez a negyedik emelet.
free	ingyenes; szabad	A jegy ingyenes.
Friday	péntek	Pénteken találkozunk.
friend	barát	A barátom itt van.
friendly	barátságos	A tanár barátságos.
from	-ból/-ből; -tól/-től	Magyarországról vagyok.
front	eleje; elöl	Állj elöl.
fruit	gyümölcs	Minden nap gyümölcsöt eszem.
full	tele; teljes	A pohár tele van.
fun	szórakozás; móka	A játék móka.
funny	vicces	Ez a film vicces.
future	jövő	A jövőre gondolok.
game	játék	Új játékot játszunk.
garden	kert	A gyerekek a kertben vannak.
geography	földrajz	Hétfőn földrajzunk van.
get	kapni; szerezni	Új telefont kapok.
girl	lány	A lány könyvet olvas.
girlfriend	barátnő	A barátnője kedves.
give	adni	Add ide a könyvet, kérlek.
glass	pohár; üveg	A pohár az asztalon van.
go	menni	Most hazamegyünk.
good	jó	Ez jó ötlet.
goodbye	viszlát	Mondj viszlátot a barátaidnak.
grandfather	nagyapa	A nagyapám kedves.
grandmother	nagymama	A nagymamám teát készít.
grandparent	nagyszülő	Minden nagyszülő fontos.
great	nagyszerű	Nagyszerű nap volt.
green	zöld	A fű zöld.
grey	szürke	Az ég szürke.
group	csoport	A csoportunk kicsi.
grow	nőni; termeszteni	A növények gyorsan nőnek.
guess	kitalálni; tippelni	Találd ki a nevemet.
guitar	gitár	Gitáron játszom.
gym	edzőterem; tornaterem	Edzőterembe járok.
hair	haj	A haja hosszú.
half	fél; fele	Add ide a felét.
hand	kéz	Emeld fel a kezed.
happen	történni	Mi történt?
happy	boldog	Ma boldog vagyok.
hard	nehéz; kemény	Ez a munka nehéz.
hat	kalap; sapka	Új sapkám van.
hate	utálni	Utálom a hideg esőt.
have	van; birtokolni	Van autóm.
have to modal	kell	Most mennem kell.
he	ő	Ő a bátyám.
head	fej	Fáj a fejem.
health	egészség	Az egészség fontos.
healthy	egészséges	Az alma egészséges.
hear	hallani	Zenét hallok.
hello	szia; helló	Köszönj a tanárnak.
help	segítség; segíteni	Segítségre van szükségem.
her	őt; az ő	Ez az ő táskája.
here	itt	Ülj ide.
hey	hé; szia	Hé, gyere ide.
hi	szia	Szia, Anna vagyok.
high	magas	A hegy magas.
him	őt	Látom őt.
his	az ő	Ez az ő biciklije.
history	történelem	Szeretem a történelmet.
hobby	hobbi	A hobbim az olvasás.
holiday	nyaralás; ünnep	A nyaralásunk holnap kezdődik.
home	otthon; haza	Hazamegyek.
homework	házi feladat	Házi feladatot írok.
hope	remélni	Jó időt remélek.
horse	ló	A ló gyorsan fut.
hospital	kórház	A kórház közel van.
hot	forró; meleg	A tea forró.
hotel	hotel; szálloda	A szálloda tiszta.
hour	óra	Várj egy órát.
house	ház	A házunk kicsi.
how	hogyan	Hogy vagy?
however	azonban	Itt azonban maradhatok.
hundred	száz	Száz ember jött.
hungry	éhes	Éhes vagyok.
husband	férj	A férje orvos.
I	én	Szeretem a teát.
ice	jég	A jég hideg.
ice cream	fagylalt	Fagylaltot kérek.
idea	ötlet	Ez jó ötlet.
if	ha	Hívj fel, ha segítség kell.
imagine	elképzelni	Képzelj el egy kis házat.
important	fontos	Ez az óra fontos.
improve	javítani; fejlődni	Fejleszteni akarom a készségeimet.
in	-ban/-ben; bent	A kulcs a táskámban van.
include	tartalmazni; belefoglalni	Írd bele a nevedet, kérlek.
information	információ	Több információra van szükségem.
interest	érdeklődés	Érdeklődik a művészet iránt.
interested	érdeklődő; érdekel	Érdekel a zene.
interesting	érdekes	Ez a könyv érdekes.
internet	internet	Az internet lassú.
interview	interjú; állásinterjú	Ma állásinterjúm van.
into	-ba/-be	Tedd a kulcsot a táskába.
introduce	bemutatni	Mutasd be a barátodat.
island	sziget	A sziget kicsi.
it	az; ez	Az asztalon van.
its	az ő; annak	A kutyának saját tálja van.
jacket	kabát; dzseki	A dzsekim kék.
January	január	Januárban hideg van.
jeans	farmer; farmernadrág	Minden nap farmert viselek.
job	munka; állás	Munkát keresek.
join	csatlakozni	Csatlakozz a csoportunkhoz.
journey	utazás; út	Az út hosszú.
juice	gyümölcslé; dzsúsz	Narancslevet iszom.
July	július	Júliusban meleg van.
June	június	Júniusban van a születésnapom.
just	éppen; csak	Éppen most érkeztem.
keep	megtartani	Tartsd meg az aprót.
key	kulcs	Hol van a kulcsom?
kilometre	kilométer	Az iskola egy kilométerre van.
kind (type)	fajta	Milyen zenét szeretsz?
kitchen	konyha	A konyha tiszta.
know	tudni; ismerni	Tudom a választ.
land	föld; szárazföld	A hajó közel van a szárazföldhöz.
language	nyelv	Új nyelvet tanulok.
large	nagy	Nagy kertünk van.
last1 (final)	utolsó	Ez az utolsó oldal.
late	késő; későn	Későn érkezik.
later	később	Később felhívlak.
laugh	nevetni	Együtt nevetünk.
learn	tanulni	Angolul tanulok.
leave	elmenni; elhagyni	Most el kell mennem.
left	bal; balra	Fordulj balra.
leg	láb	Fáj a lábam.
lesson	óra; lecke	Az óra kilenckor kezdődik.
let	engedni; hagyni	Hadd segítsek.
letter	levél; betű	Levelet írok.
library	könyvtár	A könyvtár csendes.
lie1	feküdni; hazudni	Az ágyon fekszem.
life	élet	Az élet jó.
like (similar)	mint; olyan, mint	Úgy néz ki, mint a bátyja.
like (find sb/sth pleasant)	szeretni; kedvelni	Szeretem ezt a könyvet.
line	vonal; sor	Állj sorba.
lion	oroszlán	Az oroszlán erős.
list	lista	Írj listát.
listen	hallgatni; figyelni	Hallgass zenét.
little	kis; kevés	Kevés időm van.
live1	élni; lakni	Budapesten lakom.
local	helyi	Ez egy helyi bolt.
long1	hosszú	Az út hosszú.
look	nézni; kinézni	Nézd meg a képet.
lose	elveszíteni	Ne veszítsd el a kulcsodat.
lot	sok	Sok munkám van.
love	szeretni; imádni	Szeretem a családomat.
lunch	ebéd	Az ebéd kész.`;

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
  const lines = HU_TRANSLATIONS_TSV.trim().split(/\n/u);
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
      throw new Error(`Hungarian example for ${sourceHeadword} must end with sentence punctuation`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Hungarian row for ${sourceHeadword} must contain Latin-script text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Hungarian row for ${sourceHeadword} contains an unexpected non-Latin script`);
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
      `HU translation source key mismatch: missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`
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
    "- Script-aware validation: HU Latin native orthography, Hungarian no-article display policy, sentence punctuation and non-Latin script leak guard",
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
