#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "SK";
const BATCH_ID = "sk_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-sk.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const SK_TRANSLATIONS_TSV = `source_headword	SK	example_SK
clothes	oblečenie	Moje oblečenie je čisté.
club	klub	Chodí do hudobného klubu.
coat	kabát; bunda	Môj kabát je teplý.
coffee	káva	Ráno pijem kávu.
cold	studený; chladný	Voda je studená.
college	vysoká škola	Moja sestra študuje na vysokej škole.
colour	farba	Moja obľúbená farba je modrá.
come	prísť	Poď sem, prosím.
common	bežný; obyčajný	Toto meno je bežné.
company	firma; spoločnosť	Moja mama pracuje vo firme.
compare	porovnať	Porovnaj tieto dva obrázky.
complete	úplný; dokončiť	Formulár je úplný.
computer	počítač	Tento počítač je nový.
concert	koncert	Dnes večer ideme na koncert.
conversation	rozhovor	Mali sme krátky rozhovor.
cook	variť; kuchár	Varím doma večeru.
cooking	varenie	Rád varím s otcom.
cool	chladný; skvelý	Izba je chladná.
correct	správny; opraviť	Tvoja odpoveď je správna.
cost	cena; stáť	Koľko to stojí?
could modal	môcť	Mohol by som ti pomôcť.
country	krajina	Kanada je veľká krajina.
course	kurz	Chodím na kurz angličtiny.
cousin	bratranec; sesternica	Môj bratranec býva blízko.
cow	krava	Krava žerie trávu.
cream	smotana; krém	Dávam smotanu do kávy.
create	vytvoriť	Vytvárajú novú hru.
culture	kultúra	Učíme sa o miestnej kultúre.
cup	šálka; hrnček	Tento hrnček je prázdny.
customer	zákazník	Zákazník kladie otázku.
cut	rezať; krájať	Rozkroj jablko na polovicu.
dad	otec; tato	Otec je v práci.
dance	tancovať; tanec	Po večeri tancujeme.
dancer	tanečník; tanečnica	Tanečnica sa rýchlo pohybuje.
dancing	tanec	Tanec je zábavný.
dangerous	nebezpečný	Táto cesta je nebezpečná.
dark	tmavý; tma	Izba je tmavá.
date	dátum	Aký je dnes dátum?
daughter	dcéra	Jej dcéra má šesť rokov.
day	deň	Prajem pekný deň.
dear	milý; drahý	Milý priateľ, ďakujem.
December	december	Narodeniny mám v decembri.
decide	rozhodnúť	Rozhodni sa teraz, prosím.
delicious	chutný; výborný	Táto polievka je výborná.
describe	opísať	Opíš svoju izbu.
description	opis	Prečítaj si krátky opis.
design	návrh; navrhnúť	Navrhujem jednoduchú kartu.
desk	písací stôl	Kniha je na mojom stole.
detail	detail	Jeden detail chýba.
dialogue	dialóg	Prečítaj dialóg teraz.
dictionary	slovník	Použi slovník na hodine.
die	zomrieť	Kvety bez vody umierajú.
diet	strava; diéta	Moja strava obsahuje ovocie.
difference	rozdiel	Je tu jeden rozdiel.
different	iný	Máme iné mená.
difficult	ťažký; náročný	Táto otázka je ťažká.
dinner	večera	Večera je hotová.
dirty	špinavý	Moje topánky sú špinavé.
discuss	diskutovať; prebrať	Preberáme plán.
dish	tanier; jedlo	Tento tanier je horúci.
do1	robiť	Čo robíš?
doctor	lekár	Lekár je zaneprázdnený.
dog	pes	Pes beží vonku.
dollar	dolár	Stojí to jeden dolár.
door	dvere	Zavri dvere, prosím.
down	dole; nadol	Sadni si sem dole.
downstairs	dole; na prízemí	Kuchyňa je dole.
draw	kresliť	Nakresli malý dom.
dress	šaty; obliekať	Má na sebe červené šaty.
drink	nápoj; piť	Pijem vodu.
drive	šoférovať; viesť	Jazdím do práce autom.
driver	vodič	Vodič tu zastavuje.
during	počas	Spím počas letu.
DVD	dvd	Toto dvd je staré.
each	každý	Každé dieťa má knihu.
ear	ucho	Bolí ma ucho.
early	skorý; skoro	Vstávam skoro.
east	východ	Slnko vychádza na východe.
easy	ľahký	Tento test je ľahký.
eat	jesť	Obedujeme spolu.
egg	vajce	Jem jedno vajce.
eight	osem	Mám osem kariet.
eighteen	osemnásť	Má osemnásť rokov.
eighty	osemdesiat	Môj starý otec má osemdesiat rokov.
elephant	slon	Slon je veľký.
eleven	jedenásť	Hodina začína o jedenástej.
else	iný; ešte	Čo ešte potrebuješ?
email	e-mail	Pošli mi e-mail.
end	koniec; skončiť	Toto je koniec.
enjoy	užívať si; mať rád	Mám rád túto pieseň.
enough	dosť	Máme dosť času.
euro	euro	Stojí to jedno euro.
even	dokonca	Dokonca aj môj brat to vie.
evening	večer	Dnes večer sa stretneme.
event	udalosť; akcia	Akcia sa začína dnes.
ever	niekedy	Varíš niekedy?
every	každý	Učím sa každý deň.
everybody	všetci	Všetci sú tu.
everyone	všetci	Všetci majú radi hudbu.
everything	všetko	Všetko je pripravené.
exam	skúška	Skúška sa čoskoro začína.
example	príklad	Toto je dobrý príklad.
excited	nadšený	Dnes som nadšený.
exciting	vzrušujúci; napínavý	Hra je napínavá.
exercise	cvičenie; cvičiť	Cvičím pred raňajkami.
expensive	drahý	Tento kabát je drahý.
explain	vysvetliť	Vysvetli toto slovo, prosím.
extra	navyše; dodatočný	Potrebujem čas navyše.
eye	oko	Moje oko je červené.
face	tvár	Umy si tvár.
fact	fakt	Tento fakt je dôležitý.
fall	padať; jeseň	Listy na jeseň padajú.
false	nepravdivý; nesprávny	Tá odpoveď je nesprávna.
family	rodina	Moja rodina je malá.
famous	slávny	Je to slávny spevák.
fantastic	fantastický	Koncert bol fantastický.
far	ďaleko	Škola je ďaleko.
farm	farma	Bývajú na farme.
farmer	farmár	Farmár pestuje jedlo.
fast	rýchly	Tento vlak je rýchly.
fat	tučný	Tá mačka je tučná.
father	otec	Môj otec je vysoký.
favourite	obľúbený	Toto je moja obľúbená pieseň.
February	február	Vo februári je tu zima.
feel	cítiť	Cítim sa šťastný.
feeling	pocit	Poznám ten pocit.
festival	festival	Festival sa začína zajtra.
few	niekoľko	Je tu niekoľko študentov.
fifteen	pätnásť	Mám pätnásť rokov.
fifth	piaty	Toto je piata hodina.
fifty	päťdesiat	Moja mama má päťdesiat rokov.
fill	vyplniť; naplniť	Naplň hrnček vodou.
film	film	Pozeráme film.
final	posledný; konečný	Toto je posledná otázka.
find	nájsť	Nájdem svoje kľúče.
fine	dobrý	Teraz sa mám dobre.
finish	dokončiť	Dokonči svoju domácu úlohu.
fire	oheň	Oheň je horúci.
first	prvý	Je prvý v rade.
fish	ryba	Jem rybu na večeru.
five	päť	Mám päť kníh.
flat	byt	Môj byt je malý.
flight	let	Let mešká.
floor	podlaha; poschodie	Taška je na podlahe.
flower	kvetina	Táto kvetina je žltá.
fly	lietať	Vtáky lietajú na oblohe.
follow	nasledovať; sledovať	Nasleduj ma, prosím.
food	jedlo	Jedlo je hotové.
foot	noha	Bolí ma noha.
football	futbal	Dnes hráme futbal.
for	pre	Tento darček je pre teba.
forget	zabudnúť	Nezabudni kľúče.
form	formulár	Vyplň formulár.
forty	štyridsať	Môj otec má štyridsať rokov.
four	štyri	Vidím štyri vtáky.
fourteen	štrnásť	Má štrnásť rokov.
fourth	štvrtý	Toto je štvrté poschodie.
free	zadarmo; voľný	Lístok je zadarmo.
Friday	piatok	Stretneme sa v piatok.
friend	priateľ; kamarát	Môj kamarát je tu.
friendly	priateľský	Učiteľ je priateľský.
from	z; od	Som zo Slovenska.
front	predná časť; predok	Stoj vpredu.
fruit	ovocie	Jem ovocie každý deň.
full	plný	Pohár je plný.
fun	zábava	Hra je zábava.
funny	zábavný; smiešny	Tento film je smiešny.
future	budúcnosť	Premýšľam o budúcnosti.
game	hra	Hráme novú hru.
garden	záhrada	Deti sú v záhrade.
geography	geografia; zemepis	V pondelok máme geografiu.
get	dostať; získať	Dostanem nový telefón.
girl	dievča	To dievča číta knihu.
girlfriend	priateľka	Jeho priateľka je milá.
give	dať	Daj mi knihu, prosím.
glass	pohár	Pohár je na stole.
go	ísť	Ideme teraz domov.
good	dobrý	To je dobrý nápad.
goodbye	zbohom	Rozlúč sa s priateľmi.
grandfather	starý otec	Môj starý otec je láskavý.
grandmother	stará mama	Moja stará mama robí čaj.
grandparent	starý rodič	Každý starý rodič je dôležitý.
great	skvelý	Bol to skvelý deň.
green	zelený	Tráva je zelená.
grey	sivý	Obloha je sivá.
group	skupina	Naša skupina je malá.
grow	rásť	Rastliny rastú rýchlo.
guess	hádať	Uhádni moje meno.
guitar	gitara	Hrám na gitare.
gym	telocvičňa; posilňovňa	Chodím do posilňovne.
hair	vlasy	Jej vlasy sú dlhé.
half	polovica	Daj mi polovicu.
hand	ruka	Zdvihni ruku.
happen	stať sa	Čo sa stalo?
happy	šťastný	Dnes som šťastný.
hard	ťažký; tvrdý	Táto práca je ťažká.
hat	klobúk; čiapka	Mám novú čiapku.
hate	nenávidieť	Neznášam studený dážď.
have	mať	Mám auto.
have to modal	musieť	Musím teraz ísť.
he	on	On je môj brat.
head	hlava	Bolí ma hlava.
health	zdravie	Zdravie je dôležité.
healthy	zdravý	Jablká sú zdravé.
hear	počuť	Počujem hudbu.
hello	ahoj	Povedz ahoj učiteľovi.
help	pomoc; pomôcť	Potrebujem pomoc.
her	jej; ju	To je jej taška.
here	tu	Sadni si tu.
hey	hej; ahoj	Ahoj, poď sem.
hi	ahoj	Ahoj, som Jana.
high	vysoký	Hora je vysoká.
him	jeho; ho	Vidím ho.
his	jeho	To je jeho bicykel.
history	dejepis; história	Mám rád dejepis.
hobby	koníček	Môj koníček je čítanie.
holiday	dovolenka; sviatok	Naša dovolenka sa začína zajtra.
home	domov; doma	Idem domov.
homework	domáca úloha	Robím domácu úlohu.
hope	dúfať	Dúfam v dobré počasie.
horse	kôň	Kôň beží rýchlo.
hospital	nemocnica	Nemocnica je blízko.
hot	horúci	Čaj je horúci.
hotel	hotel	Hotel je čistý.
hour	hodina	Počkaj jednu hodinu.
house	dom	Náš dom je malý.
how	ako	Ako sa máš?
however	však; napriek tomu	Môžem však zostať tu.
hundred	sto	Prišlo sto ľudí.
hungry	hladný	Mám hlad.
husband	manžel	Jej manžel je lekár.
I	ja	Mám rád čaj.
ice	ľad	Ľad je studený.
ice cream	zmrzlina	Chcem zmrzlinu.
idea	nápad	To je dobrý nápad.
if	ak; či	Zavolaj mi, ak potrebuješ pomoc.
imagine	predstaviť si	Predstav si malý dom.
important	dôležitý	Táto hodina je dôležitá.
improve	zlepšiť	Chcem zlepšiť svoje zručnosti.
in	v; vo vnútri	Kľúč je v mojej taške.
include	zahrnúť; obsahovať	Uveď svoje meno, prosím.
information	informácie	Potrebujem viac informácií.
interest	záujem	Má záujem o umenie.
interested	zaujímať sa; zaujatý	Zaujímam sa o hudbu.
interesting	zaujímavý	Táto kniha je zaujímavá.
internet	internet	Internet je pomalý.
interview	rozhovor; pohovor	Dnes mám pohovor.
into	do	Daj kľúč do tašky.
introduce	predstaviť	Predstav svojho priateľa.
island	ostrov	Ostrov je malý.
it	ono; to	Je to na stole.
its	jeho; jej	Pes má svoju misku.
jacket	bunda	Moja bunda je modrá.
January	január	V januári je zima.
jeans	džínsy	Nosím džínsy každý deň.
job	práca	Hľadám prácu.
join	pridať sa	Pridaj sa k našej skupine.
journey	cesta	Cesta je dlhá.
juice	džús	Pijem pomarančový džús.
July	júl	V júli je teplo.
June	jún	Narodeniny mám v júni.
just	práve; len	Prišiel som práve teraz.
keep	nechať si; udržať	Nechaj si drobné.
key	kľúč	Kde je môj kľúč?
kilometre	kilometer	Škola je kilometer ďaleko.
kind (type)	druh	Aký druh hudby máš rád?
kitchen	kuchyňa	Kuchyňa je čistá.
know	vedieť; poznať	Poznám odpoveď.
land	zem; pevnina	Loď je blízko pevniny.
language	jazyk	Učím sa nový jazyk.
large	veľký	Máme veľkú záhradu.
last1 (final)	posledný	Toto je posledná strana.
late	neskoro; neskorý	Príde neskoro.
later	neskôr	Zavolám ti neskôr.
laugh	smiať sa	Smejeme sa spolu.
learn	učiť sa	Učím sa angličtinu.
leave	odísť	Musím teraz odísť.
left	ľavý; vľavo	Odboč vľavo.
leg	noha	Bolí ma noha.
lesson	hodina; lekcia	Lekcia sa začína o deviatej.
let	nechať	Nechaj ma pomôcť.
letter	list; písmeno	Píšem list.
library	knižnica	Knižnica je tichá.
lie1	ležať; klamať	Ležím na posteli.
life	život	Život je dobrý.
like (similar)	ako	Vyzerá ako jeho brat.
like (find sb/sth pleasant)	mať rád	Mám rád túto knihu.
line	čiara; rad	Stoj v rade.
lion	lev	Lev je silný.
list	zoznam	Napíš zoznam.
listen	počúvať	Počúvaj hudbu.
little	malý; trochu	Mám trochu času.
live1	žiť; bývať	Bývam v Bratislave.
local	miestny	Toto je miestny obchod.
long1	dlhý	Cesta je dlhá.
look	pozerať sa; vyzerať	Pozri sa na obrázok.
lose	stratiť	Nestrať svoj kľúč.
lot	veľa	Mám veľa práce.
love	milovať	Milujem svoju rodinu.
lunch	obed	Obed je hotový.`;

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
  const lines = SK_TRANSLATIONS_TSV.trim().split(/\n/u);
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
      throw new Error(`Slovak example for ${sourceHeadword} must end with sentence punctuation`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Slovak row for ${sourceHeadword} must contain Latin-script text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Slovak row for ${sourceHeadword} contains an unexpected non-Latin script`);
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
      `SK translation source key mismatch: missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`
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
    "- Script-aware validation: SK Latin native orthography, Slovak no-article display policy, sentence punctuation and non-Latin script leak guard",
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
