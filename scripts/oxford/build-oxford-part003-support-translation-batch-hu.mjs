#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_003_300_v1";
const CONTRACT_PATH = "config/oxford_3000_core_a1_part_003_300_v1_contract_v0.json";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_hu_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_hu_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-hu.mjs";
const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "HU";
const BATCH_ID = "hu_v1";
const SUPPORT_LANGUAGE_COUNT = 52;
const RELEASE_ENTRY_COUNT = 300;
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const HU_TRANSLATIONS_TSV = `source_headword	HU	example_HU
machine	gép; berendezés	A gép kávét készít.
magazine	magazin; folyóirat	Zenei magazint olvas.
main	fő; legfontosabb	Ez a fő ajtó.
make	készíteni; csinálni	Otthon ebédet készítek.
man	férfi	A férfi a tanárom.
many	sok; számos	Sok diák van itt.
map	térkép	Nézd meg a térképet.
March	március	Márciusban van a születésnapom.
market	piac	Gyümölcsöt veszünk a piacon.
married	házas	A nővérem házas.
May	május	Májusban véget ér az iskola.
maybe	talán	Talán esni fog.
me	engem; nekem	Segíts nekem, kérlek.
meal	étkezés; étel	Ez az étel meleg.
mean	jelenteni	Mit jelent a jel?
meaning	jelentés	Mi a jelentése?
meat	hús	Húst eszem vacsorára.
meet	találkozni	Iskola után találkozunk.
meeting	találkozó; megbeszélés	A találkozó most kezdődik.
member	tag	A klub tagja.
menu	étlap; menü	Olvasd el az étlapot.
message	üzenet	Rövid üzenetet küldök.
metre	méter	Menj egy métert előre.
midnight	éjfél	A vonat éjfélkor indul.
mile	mérföld	Egy mérföldet sétálunk.
milk	tej	Reggelinél tejet iszom.
million	millió	Egymillió ember él itt.
minute1	perc	Várj egy percet.
miss	hiányolni; lekésni	Hiányzik a régi iskolám.
mistake	hiba	A válaszban van egy hiba.
model	modell; minta	Ez egy kis modell.
modern	modern	A konyha modern.
moment	pillanat	Várj egy pillanatot.
Monday	hétfő	Hétfőn kezdünk dolgozni.
money	pénz	Szükségem van egy kis pénzre.
month	hónap	Június meleg hónap.
more	több; még	Több időre van szükségem.
morning	reggel	Reggel tanulok.
most	legtöbb; leginkább	A legtöbb diák szereti a zenét.
mother	anya; édesanya	Anyám ma dolgozik.
mountain	hegy	A hegy nagyon magas.
mouse	egér	Egér van a szék alatt.
mouth	száj	Nyisd ki a szádat.
move	mozogni; áthelyezni	Tedd át ide a széket.
movie	film	Ma este filmet nézünk.
much	sok; mennyi	Mennyibe kerül ez?
mum	anya	Anya otthon van.
museum	múzeum	A múzeum tízkor nyit.
music	zene	Zenét hallgatok.
must modal	kell	Itt meg kell állnod.
my	az én; -m	Ez az én könyvem.
name	név; elnevezni	Írd ide a nevedet.
natural	természetes	Ez a gyümölcslé természetes.
near	közel	A bank közel van.
need	szükség; szüksége van	Szükségem van egy tollra.
negative	negatív; tagadó	Ez a válasz negatív.
neighbour	szomszéd	A szomszédom barátságos.
never	soha	Soha nem iszom kávét.
new	új	Ez a telefon új.
news	hírek	A mai hírek jók.
newspaper	újság	Újságot olvas.
next	következő	A következő busz késik.
next to	mellett	Ülj mellém.
nice	kedves; kellemes	A szoba kellemes.
night	éjszaka	Éjszaka alszom.
nine	kilenc	Kilenc diák van itt.
nineteen	tizenkilenc	Tizenkilenc éves.
ninety	kilencven	A nagyapám kilencven éves.
no	nem; nincs	Nem, köszönöm.
no one	senki	Senki sincs a szobában.
nobody	senki	Senki sincs otthon.
north	észak	Az állomás északon van.
nose	orr	Hideg az orrom.
not	nem	Nem vagyok fáradt.
note	jegyzet; megjegyzés	Írj most jegyzetet.
nothing	semmi	Semmi sincs a dobozban.
November	november	A kurzusom novemberben kezdődik.
now	most	Gyere ide most.
number	szám	Írd ide a számot.
nurse	ápoló; nővér	A nővér kedves.
object	tárgy; objektum	Tedd a tárgyat az asztalra.
o’clock	óra	Az óra kilenckor kezdődik.
October	október	Októberben utazunk.
of	-nak/-nek; -ból/-ből	Ez egy csésze tea.
off	kikapcsolt; le	Kapcsold le a lámpát.
office	iroda	Az irodám kicsi.
often	gyakran	Gyakran gyalog megyek iskolába.
oh	ó; aha	Aha, most értem.
OK	rendben; oké	Ez rendben van?
old	régi; idős	Ez a ház régi.
on	-on/-en/-ön; bekapcsolva	A könyv az asztalon van.
once	egyszer	Hetente egyszer telefonálok.
one	egy	Van egy nővérem.
onion	hagyma	Vágj fel egy hagymát.
online	online; interneten	Online tanulok.
only	csak	Csak egy táskám van.
open	nyitott; kinyitni	Nyisd ki az ablakot.
opinion	vélemény	Mi a véleményed?
opposite	szemben; ellentétes	A bolt a bankkal szemben van.
or	vagy	Teát vagy kávét?
orange	narancs; narancssárga	A narancs édes.
order	rendelés; rendelni	Levest rendelek.
other	más; másik	Használd a másik ajtót.
our	a mi; -unk/-ünk	Ez a mi osztályunk.
out	ki; kint	Menj ki ebéd után.
outside	kint; kívül	A gyerekek kint játszanak.
over	fölött; át	A repülő a város fölött repül.
own	saját; birtokolni	Saját szobám van.
page	oldal	Nyisd ki a tízedik oldalt.
paint	festék; festeni	Fesd kékre a falat.
painting	festmény	A festmény szép.
pair	pár	Szükségem van egy pár zoknira.
paper	papír	Írd erre a papírra.
paragraph	bekezdés	Olvasd el az első bekezdést.
parent	szülő	Egy szülő kint vár.
park	park; parkolni	Az állomás közelében parkolunk.
part	rész	Ez a rész könnyű.
partner	partner; társ	Dolgozz a partnereddel.
party	buli; parti	A buli hétkor kezdődik.
passport	útlevél	Mutasd az útleveledet.
past	múlt; után	Fél hét van.
pay	fizetni	Kártyával fizetek.
pen	toll	Ez a toll kék.
pencil	ceruza	Ceruzával írok.
people	emberek	Sok ember van itt.
pepper	bors	Tegyél borsot a levesbe.
perfect	tökéletes	A válaszod tökéletes.
period	időszak; óra	Ez az óra rövid.
person	személy; ember	Egy személy vár.
personal	személyes	Ez a személyes telefonom.
phone	telefon; telefonálni	A telefonom a táskában van.
photo	fotó; fénykép	Készíts itt fotót.
photograph	fénykép; fényképezni	A fénykép régi.
phrase	kifejezés	Ismételd meg ezt a kifejezést.
piano	zongora	Zongorán játszik.
picture	kép	Nézd meg a képet.
piece	darab	Vegyél egy darab tortát.
pig	disznó; sertés	A disznó a farmon van.
pink	rózsaszín	A táskája rózsaszín.
place	hely; elhelyezni	A hely csendes.
plan	terv	Tervre van szükségünk.
plane	repülőgép	A repülőgép késik.
plant	növény; ültetni	Öntözd meg ma a növényt.
play	játszani; darab	A gyerekek a parkban játszanak.
player	játékos	A játékos gyorsan fut.
please	kérlek; kérem	Ülj ide, kérlek.
point	pont; lényeg	Ez a pont fontos.
police	rendőrség	A rendőrség kint van.
policeman	rendőr	A rendőr segít nekünk.
pool	medence	A medence hideg.
poor	szegény	A szegény gyerek éhes.
popular	népszerű	Ez a dal népszerű.
positive	pozitív	Az eredmény pozitív.
possible	lehetséges	Ez ma lehetséges?
post	bejegyzés; posta	Online olvasom a bejegyzését.
potato	burgonya; krumpli	Egy krumplit eszem.
pound	font	Egy fontba kerül.
practice	gyakorlat; gyakorlás	A gyakorlás minden nap segít.
practise	gyakorolni	Mindennap angolt gyakorlok.
prefer	előnyben részesíteni	A teát részesítem előnyben.
prepare	előkészíteni; elkészíteni	Este készítsd elő a táskádat.
present	jelen; ajándék	Ma jelen van.
pretty	csinos; elég	A kert csinos.
price	ár	Az ár alacsony.
probably	valószínűleg	Valószínűleg tudja.
problem	probléma	A probléma kicsi.
product	termék	A termék új.
programme	program; műsor	A program most kezdődik.
project	projekt; terv	A projektünk kész.
purple	lila	Az ing lila.
put	tenni; rakni	Tedd ide a könyvet.
quarter	negyed	Negyed három van.
question	kérdés	Tegyél fel egy kérdést.
quick	gyors; rövid	Ez egy rövid teszt.
quickly	gyorsan	Menj gyorsan.
quiet	csendes	A könyvtár csendes.
quite	elég; meglehetősen	A szoba elég kicsi.
radio	rádió	A rádió hangos.
rain	eső; esni	Most kezd esni.
read	olvasni	Olvasd el ezt a mondatot.
reader	olvasó	Az olvasó szereti a történetet.
reading	olvasás	Az olvasás segít tanulni.
ready	kész; készen álló	A vacsora kész.
real	valódi; igazi	Valódi probléma van.
really	igazán; tényleg	Igazán szeretem ezt a dalt.
reason	ok	Mondd el az okot.
red	piros; vörös	Az ajtó piros.
relax	pihenni; relaxálni	Pihenj munka után.
remember	emlékezni; megjegyezni	Ne feledd az útleveledet.
repeat	ismételni	Ismételd meg a mondatot.
report	jelentés; beszámoló	Este olvasd el a jelentést.
restaurant	étterem	Az étterem tele van.
result	eredmény	Az eredmény jó.
return	visszatérni; visszaadni	Holnap add vissza a könyvet.
rice	rizs	Ebédre rizst eszem.
rich	gazdag	Ez a város gazdag.
ride	menni; lovagolni; utazás	Biciklivel megyek iskolába.
right	jobb; helyes	Itt fordulj jobbra.
river	folyó	A folyó széles.
road	út	Az út hosszú.
room	szoba; helyiség	A szobám tiszta.
routine	rutin; napirend	A napirendem korán kezdődik.
rule	szabály	A szabály egyszerű.
run	futni	Minden reggel futok.
sad	szomorú	Ma szomorú vagyok.
salad	saláta	A saláta friss.
salt	só	Adj hozzá egy kis sót.
same	ugyanaz; azonos	Ugyanolyan táskánk van.
sandwich	szendvics	Szendvicset eszem.
Saturday	szombat	Szombaton találkozunk.
say	mondani	Mondd ki a nevedet.
school	iskola	Az iskolám közel van.
science	tudomány	Tudományt tanulok.
scientist	tudós	A tudós kérdést tesz fel.
sea	tenger	A tenger kék.
second1 (unit of time)	másodperc	Várj egy másodpercet.
section	rész; szakasz	Olvasd el ezt a részt.
see	látni	Látom a barátomat.
sell	eladni; árulni	Friss gyümölcsöt árulnak.
send	küldeni	Küldd el most az üzenetet.
sentence	mondat	Írj egy mondatot.
September	szeptember	Szeptemberben kezdődik az iskola.
seven	hét	Hét ember van itt.
seventeen	tizenhét	Tizenhét éves.
seventy	hetven	A nagymamám hetven éves.
share	megosztani; elosztani	Oszd el a tortát.
she	ő	Ő a nővérem.
sheep	juh; birka	A birka füvet eszik.
shirt	ing	Az ing tiszta.
shoe	cipő	A cipő az ágy alatt van.
shop	bolt; vásárolni	A bolt korán zár.
shopping	vásárlás	A vásárlás ma szórakoztató.
short	rövid	A történet rövid.
should modal	kellene	Ma pihenned kellene.
show	megmutatni; műsor	Mutasd meg a jegyedet.
shower	zuhany; zuhanyozni	Reggel zuhanyozom.
sick	beteg	Ma beteg vagyok.
similar	hasonló	A táskáink hasonlóak.
sing	énekelni	Az órán énekelek.
singer	énekes	Az énekes híres.
sister	nővér; húg	A húgom fiatal.
sit	ülni; leülni	Ülj az ablak mellé.
situation	helyzet	A helyzet új.
six	hat	Hat könyv van itt.
sixteen	tizenhat	Tizenhat éves.
sixty	hatvan	Apám hatvan éves.
skill	készség; tudás	Ez a készség hasznos.
skirt	szoknya	A szoknya kék.
sleep	aludni; alvás	Nyolc órát alszom.
slow	lassú	A busz lassú.
small	kicsi	A szoba kicsi.
snake	kígyó	A kígyó hosszú.
snow	hó; havazni	Télen havazik.
so	ezért; úgy	Fáradt vagyok, ezért pihenek.
some	néhány; valamennyi	Kell egy kis víz.
somebody	valaki	Valaki az ajtónál van.
someone	valaki	Valaki üzenetet hagyott.
something	valami	Valami innivalóra van szükségem.
sometimes	néha	Néha gyalog megyek iskolába.
son	fiú; fia	A fia iskolában van.
song	dal	Ez a dal új.
soon	hamarosan	Hamarosan találkozunk.
sorry	bocsánat; sajnálom	Bocsánat.
sound	hang; hangzik	A hang hangos.
soup	leves	A leves forró.
south	dél	A hotel délen van.
space	hely; tér; űr	Van hely egy széknek.
speak	beszélni	Beszélj lassan, kérlek.
special	különleges	Ma különleges nap van.
spell	betűzni	Betűzd le a nevedet.
spelling	helyesírás; betűzés	Ellenőrizd a helyesírást.
spend	költeni; tölteni	Pénzt költök ételre.
sport	sport	A futball népszerű sport.
spring	tavasz; rugó	Tavasszal nőnek a virágok.
stand	állni	Állj az ajtó mellé.
star	csillag	Látok egy fényes csillagot.
start	kezdeni; kezdet	Kezdd el most az órát.
statement	kijelentés; állítás	Az állítás igaz.
station	állomás	Az állomás közel van.
stay	maradni	Maradj ma otthon.
still	még; még mindig	Még mindig éhes vagyok.
stop	megállni; megálló	Állj meg az utcasarkon.
story	történet	Mondj el egy történetet.
street	utca	Az utca csendes.
strong	erős	Ő erős.
student	diák; hallgató	A diák könyvet olvas.
study	tanulni; tanulmány	Angolt tanulok.
style	stílus	Tetszik ez a stílus.
subject	tantárgy; téma	Az angol a fő tantárgyam.
success	siker	A sikerhez gyakorlás kell.
sugar	cukor	Tegyél cukrot a teába.
summer	nyár	Itt forró a nyár.
sun	nap	A nap fényes.
Sunday	vasárnap	Vasárnap pihenünk.
supermarket	szupermarket	A szupermarket nyitva van.
sure	biztos; persze	Biztos vagyok benne.
sweater	pulóver	A pulóverem meleg.
swim	úszni	Minden héten úszom.
swimming	úszás	Az úszás jó edzés.
table	asztal	A kulcsok az asztalon vannak.`;

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
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Hungarian rows, found ${lines.length}`);
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
      throw new Error(`Hungarian example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Hungarian display/example must contain Latin text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Hungarian display/example contains non-Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Hungarian translation row for ${sourceHeadword}`);
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
    "Generate RO support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after RO.",
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
  const outputPath = JSONL_PATH;
  const summaryPath = SUMMARY_PATH;
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== RELEASE_ID) {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(HU_TRANSLATIONS_TSV);

  if (rows.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Hungarian translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Hungarian translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Hungarian
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: HU Latin-script display/example cells with Hungarian diacritics allowed and no non-Latin script leakage
- Target-language transcriptions: not included
- Postgres import: false
- Google Sheet delivery: false

This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.
`;
  await writeFile(summaryPath, summary);

  const updatedContract = updateContract(contract, outputPath, summaryPath, outputRows);
  await writeFile(contractPath, `${JSON.stringify(updatedContract, null, 2)}\n`);

  console.log(JSON.stringify({
    release_id: releaseId,
    batch_id: BATCH_ID,
    languages: [LANGUAGE],
    rows: outputRows.length,
    display_cells: outputRows.length,
    example_cells: outputRows.length,
    path: outputPath,
    contract_updated: contractPath,
    completed_support_languages: updatedContract.latest_support_translation_batches.length,
    next_language: "RO",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
