#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "CS";
const BATCH_ID = "cs_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-cs.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const CS_TRANSLATIONS_TSV = `source_headword	CS	example_CS
clothes	oblečení	Moje oblečení je čisté.
club	klub	Chodí do hudebního klubu.
coat	kabát; bunda	Můj kabát je teplý.
coffee	káva	Ráno piju kávu.
cold	studený; chladný	Voda je studená.
college	vysoká škola	Moje sestra studuje na vysoké škole.
colour	barva	Moje oblíbená barva je modrá.
come	přijít	Přijď sem, prosím.
common	běžný; obyčejný	Toto jméno je běžné.
company	firma; společnost	Moje máma pracuje ve firmě.
compare	porovnat	Porovnej tyto dva obrázky.
complete	úplný; dokončit	Formulář je úplný.
computer	počítač	Tento počítač je nový.
concert	koncert	Dnes večer jdeme na koncert.
conversation	rozhovor	Měli jsme krátký rozhovor.
cook	vařit; kuchař	Vařím doma večeři.
cooking	vaření	Rád vařím s tátou.
cool	chladný; skvělý	Pokoj je chladný.
correct	správný; opravit	Tvoje odpověď je správná.
cost	cena; stát	Kolik to stojí?
could modal	moci	Mohl bych ti pomoct.
country	země	Kanada je velká země.
course	kurz	Chodím na kurz angličtiny.
cousin	bratranec; sestřenice	Můj bratranec bydlí blízko.
cow	kráva	Kráva jí trávu.
cream	smetana; krém	Dávám smetanu do kávy.
create	vytvořit	Vytvářejí novou hru.
culture	kultura	Učíme se o místní kultuře.
cup	šálek; hrnek	Tento hrnek je prázdný.
customer	zákazník	Zákazník klade otázku.
cut	řezat; krájet	Rozkroj jablko napůl.
dad	táta	Táta je v práci.
dance	tančit; tanec	Po večeři tančíme.
dancer	tanečník; tanečnice	Tanečnice se rychle pohybuje.
dancing	tanec	Tanec je zábavný.
dangerous	nebezpečný	Tato cesta je nebezpečná.
dark	tmavý; tma	Pokoj je tmavý.
date	datum	Jaké je dnes datum?
daughter	dcera	Její dcera má šest let.
day	den	Přeji hezký den.
dear	milý; drahý	Milý příteli, děkuji.
December	prosinec	Narozeniny mám v prosinci.
decide	rozhodnout	Rozhodni se teď, prosím.
delicious	chutný; výborný	Tato polévka je výborná.
describe	popsat	Popiš svůj pokoj.
description	popis	Přečti si krátký popis.
design	návrh; navrhnout	Navrhuji jednoduchou kartu.
desk	psací stůl	Kniha je na mém stole.
detail	detail	Jeden detail chybí.
dialogue	dialog	Přečti dialog teď.
dictionary	slovník	Použij slovník ve třídě.
die	zemřít	Květiny bez vody umírají.
diet	strava; dieta	Moje strava obsahuje ovoce.
difference	rozdíl	Je tu jeden rozdíl.
different	jiný	Máme jiná jména.
difficult	těžký; obtížný	Tato otázka je těžká.
dinner	večeře	Večeře je hotová.
dirty	špinavý	Moje boty jsou špinavé.
discuss	diskutovat; probrat	Probíráme plán.
dish	talíř; jídlo	Tento talíř je horký.
do1	dělat	Co děláš?
doctor	lékař	Doktor je zaneprázdněný.
dog	pes	Pes běží venku.
dollar	dolar	Stojí to jeden dolar.
door	dveře	Zavři dveře, prosím.
down	dolů; dole	Sedni si sem dolů.
downstairs	dole; v přízemí	Kuchyň je dole.
draw	kreslit	Nakresli malý dům.
dress	šaty; oblékat	Má na sobě červené šaty.
drink	nápoj; pít	Piju vodu.
drive	řídit	Jezdím do práce autem.
driver	řidič	Řidič tady zastavuje.
during	během	Spím během letu.
DVD	dvd	Toto dvd je staré.
each	každý	Každé dítě má knihu.
ear	ucho	Bolí mě ucho.
early	brzký; brzy	Vstávám brzy.
east	východ	Slunce vychází na východě.
easy	snadný	Tento test je snadný.
eat	jíst	Obědváme spolu.
egg	vejce	Jím jedno vejce.
eight	osm	Mám osm karet.
eighteen	osmnáct	Je jí osmnáct.
eighty	osmdesát	Mému dědovi je osmdesát.
elephant	slon	Slon je velký.
eleven	jedenáct	Hodina začíná v jedenáct.
else	jiný; ještě	Co ještě potřebuješ?
email	e-mail	Pošli mi e-mail.
end	konec; skončit	Toto je konec.
enjoy	užívat si; mít rád	Mám rád tuto píseň.
enough	dost	Máme dost času.
euro	euro	Stojí to jedno euro.
even	dokonce	Dokonce i můj bratr to ví.
evening	večer	Dnes večer se setkáme.
event	událost; akce	Akce začíná dnes.
ever	někdy	Vaříš někdy?
every	každý	Učím se každý den.
everybody	všichni	Všichni jsou tady.
everyone	všichni	Všichni mají rádi hudbu.
everything	všechno	Všechno je připravené.
exam	zkouška	Zkouška brzy začíná.
example	příklad	Toto je dobrý příklad.
excited	nadšený	Dnes jsem nadšený.
exciting	vzrušující; napínavý	Hra je napínavá.
exercise	cvičení; cvičit	Cvičím před snídaní.
expensive	drahý	Tento kabát je drahý.
explain	vysvětlit	Vysvětli toto slovo, prosím.
extra	extra; navíc	Potřebuji čas navíc.
eye	oko	Moje oko je červené.
face	obličej	Umyj si obličej.
fact	fakt	Tento fakt je důležitý.
fall	padat; podzim	Listy na podzim padají.
false	nepravdivý; špatný	Ta odpověď je špatná.
family	rodina	Moje rodina je malá.
famous	slavný	Je to slavný zpěvák.
fantastic	fantastický	Koncert byl fantastický.
far	daleko	Škola je daleko.
farm	farma	Bydlí na farmě.
farmer	farmář	Farmář pěstuje jídlo.
fast	rychlý	Tento vlak je rychlý.
fat	tlustý	Ta kočka je tlustá.
father	otec	Můj otec je vysoký.
favourite	oblíbený	Toto je moje oblíbená píseň.
February	únor	V únoru je tady zima.
feel	cítit	Cítím se šťastný.
feeling	pocit	Znám ten pocit.
festival	festival	Festival začíná zítra.
few	několik	Je tu několik studentů.
fifteen	patnáct	Je mi patnáct.
fifth	pátý	Toto je pátá hodina.
fifty	padesát	Mé mámě je padesát.
fill	vyplnit; naplnit	Naplň hrnek vodou.
film	film	Díváme se na film.
final	poslední; konečný	Toto je poslední otázka.
find	najít	Najdu své klíče.
fine	dobrý	Je mi teď dobře.
finish	dokončit	Dokonči svůj domácí úkol.
fire	oheň	Oheň je horký.
first	první	Je první v řadě.
fish	ryba	Jím rybu k večeři.
five	pět	Mám pět knih.
flat	byt	Můj byt je malý.
flight	let	Let má zpoždění.
floor	podlaha; patro	Taška je na podlaze.
flower	květina	Tato květina je žlutá.
fly	létat	Ptáci létají na obloze.
follow	následovat; sledovat	Následuj mě, prosím.
food	jídlo	Jídlo je hotové.
foot	noha	Bolí mě noha.
football	fotbal	Dnes hrajeme fotbal.
for	pro	Tento dárek je pro tebe.
forget	zapomenout	Nezapomeň klíče.
form	formulář	Vyplň formulář.
forty	čtyřicet	Mému tátovi je čtyřicet.
four	čtyři	Vidím čtyři ptáky.
fourteen	čtrnáct	Je mu čtrnáct.
fourth	čtvrtý	Toto je čtvrté patro.
free	zdarma; volný	Lístek je zdarma.
Friday	pátek	Setkáme se v pátek.
friend	přítel; kamarád	Můj kamarád je tady.
friendly	přátelský	Učitel je přátelský.
from	z; od	Jsem z Česka.
front	přední část; předek	Stůj vepředu.
fruit	ovoce	Jím ovoce každý den.
full	plný	Sklenice je plná.
fun	zábava	Hra je zábava.
funny	legrační	Tento film je legrační.
future	budoucnost	Přemýšlím o budoucnosti.
game	hra	Hrajeme novou hru.
garden	zahrada	Děti jsou na zahradě.
geography	zeměpis	Máme zeměpis v pondělí.
get	dostat; získat	Dostanu nový telefon.
girl	dívka	Ta dívka čte knihu.
girlfriend	přítelkyně	Jeho přítelkyně je milá.
give	dát	Dej mi knihu, prosím.
glass	sklenice	Sklenice je na stole.
go	jít	Jdeme teď domů.
good	dobrý	To je dobrý nápad.
goodbye	sbohem	Řekni sbohem svým přátelům.
grandfather	dědeček	Můj dědeček je laskavý.
grandmother	babička	Moje babička dělá čaj.
grandparent	prarodič	Každý prarodič je důležitý.
great	skvělý	Byl to skvělý den.
green	zelený	Tráva je zelená.
grey	šedý	Obloha je šedá.
group	skupina	Naše skupina je malá.
grow	růst	Rostliny rostou rychle.
guess	hádat	Hádej moje jméno.
guitar	kytara	Hraju na kytaru.
gym	tělocvična; posilovna	Chodím do posilovny.
hair	vlasy	Její vlasy jsou dlouhé.
half	polovina	Dej mi polovinu.
hand	ruka	Zvedni ruku.
happen	stát se	Co se stalo?
happy	šťastný	Jsem dnes šťastný.
hard	těžký; tvrdý	Tato práce je těžká.
hat	klobouk; čepice	Mám novou čepici.
hate	nenávidět	Nesnáším studený déšť.
have	mít	Mám auto.
have to modal	muset	Musím teď jít.
he	on	On je můj bratr.
head	hlava	Bolí mě hlava.
health	zdraví	Zdraví je důležité.
healthy	zdravý	Jablka jsou zdravá.
hear	slyšet	Slyším hudbu.
hello	ahoj	Řekni ahoj učiteli.
help	pomoc; pomoci	Potřebuji pomoc.
her	její; ji	To je její taška.
here	tady	Posaď se tady.
hey	hej; ahoj	Ahoj, pojď sem.
hi	ahoj	Ahoj, jsem Jana.
high	vysoký	Hora je vysoká.
him	jeho; ho	Vidím ho.
his	jeho	To je jeho kolo.
history	dějepis; historie	Dějepis mám rád.
hobby	koníček	Můj koníček je čtení.
holiday	dovolená; svátek	Naše dovolená začíná zítra.
home	domov; doma	Jdu domů.
homework	domácí úkol	Dělám domácí úkol.
hope	doufat	Doufám v dobré počasí.
horse	kůň	Kůň běží rychle.
hospital	nemocnice	Nemocnice je blízko.
hot	horký	Čaj je horký.
hotel	hotel	Hotel je čistý.
hour	hodina	Počkej jednu hodinu.
house	dům	Náš dům je malý.
how	jak	Jak se máš?
however	nicméně; však	Můžu však zůstat tady.
hundred	sto	Přišlo sto lidí.
hungry	hladový	Mám hlad.
husband	manžel	Její manžel je lékař.
I	já	Mám rád čaj.
ice	led	Led je studený.
ice cream	zmrzlina	Chci zmrzlinu.
idea	nápad	To je dobrý nápad.
if	jestli; pokud	Zavolej mi, pokud potřebuješ pomoc.
imagine	představit si	Představ si malý dům.
important	důležitý	Tato hodina je důležitá.
improve	zlepšit	Chci zlepšit své dovednosti.
in	v; uvnitř	Klíč je v mé tašce.
include	zahrnout; obsahovat	Uveď své jméno, prosím.
information	informace	Potřebuji více informací.
interest	zájem	Má zájem o umění.
interested	zajímat se; zaujatý	Zajímám se o hudbu.
interesting	zajímavý	Tato kniha je zajímavá.
internet	internet	Internet je pomalý.
interview	rozhovor; pohovor	Dnes mám pohovor.
into	do	Dej klíč do tašky.
introduce	představit	Představ svého přítele.
island	ostrov	Ostrov je malý.
it	ono; to	Je to na stole.
its	jeho; její	Pes má svou misku.
jacket	bunda	Moje bunda je modrá.
January	leden	V lednu je zima.
jeans	džíny	Nosím džíny každý den.
job	práce	Hledám práci.
join	připojit se	Připoj se k naší skupině.
journey	cesta	Cesta je dlouhá.
juice	džus	Piju pomerančový džus.
July	červenec	V červenci je teplo.
June	červen	Narozeniny mám v červnu.
just	právě; jen	Přišel jsem právě teď.
keep	nechat si; udržet	Nech si drobné.
key	klíč	Kde je můj klíč?
kilometre	kilometr	Škola je kilometr daleko.
kind (type)	druh	Jaký druh hudby máš rád?
kitchen	kuchyně	Kuchyně je čistá.
know	vědět; znát	Znám odpověď.
land	země; pevnina	Loď je blízko pevniny.
language	jazyk	Učím se nový jazyk.
large	velký	Máme velkou zahradu.
last1 (final)	poslední	Toto je poslední stránka.
late	pozdě; pozdní	Přijde pozdě.
later	později	Zavolám ti později.
laugh	smát se	Smějeme se spolu.
learn	učit se	Učím se anglicky.
leave	odejít	Musím teď odejít.
left	levý; vlevo	Odboč vlevo.
leg	noha	Bolí mě noha.
lesson	hodina; lekce	Lekce začíná v devět.
let	nechat	Nech mě pomoct.
letter	dopis; písmeno	Píšu dopis.
library	knihovna	Knihovna je tichá.
lie1	ležet; lhát	Ležím na posteli.
life	život	Život je dobrý.
like (similar)	jako	Vypadá jako jeho bratr.
like (find sb/sth pleasant)	mít rád	Mám rád tuto knihu.
line	čára; řada	Stůj v řadě.
lion	lev	Lev je silný.
list	seznam	Napiš seznam.
listen	poslouchat	Poslouchej hudbu.
little	malý; trochu	Mám trochu času.
live1	žít	Bydlím v Praze.
local	místní	Toto je místní obchod.
long1	dlouhý	Cesta je dlouhá.
look	dívat se; vypadat	Podívej se na obrázek.
lose	ztratit	Neztrať svůj klíč.
lot	hodně	Mám hodně práce.
love	milovat	Miluji svou rodinu.
lunch	oběd	Oběd je hotový.`;

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
  const lines = CS_TRANSLATIONS_TSV.trim().split(/\n/u);
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
      throw new Error(`Czech example for ${sourceHeadword} must end with sentence punctuation`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Czech row for ${sourceHeadword} must contain Latin-script text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Czech row for ${sourceHeadword} contains an unexpected non-Latin script`);
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
      `CS translation source key mismatch: missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`
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
    "- Script-aware validation: CS Latin native orthography, Czech no-article display policy, sentence punctuation and non-Latin script leak guard",
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
