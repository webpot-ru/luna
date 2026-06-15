#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "DA";
const BATCH_ID = "da_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-da.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const DA_TRANSLATIONS_TSV = `source_headword	DA	example_DA
clothes	tøj	Mit tøj er rent.
club	en klub	Hun går i en musikklub.
coat	en frakke; en jakke	Min frakke er varm.
coffee	kaffe	Jeg drikker kaffe om morgenen.
cold	kold; kulde	Vandet er koldt.
college	en professionshøjskole; et universitet	Min søster går på universitetet.
colour	en farve	Min yndlingsfarve er blå.
come	komme	Kom her, tak.
common	almindelig	Dette navn er almindeligt.
company	et firma; en virksomhed	Min mor arbejder i et firma.
compare	sammenligne	Sammenlign de to billeder.
complete	komplet; fuldføre	Formularen er komplet.
computer	en computer	Denne computer er ny.
concert	en koncert	Vi går til koncert i aften.
conversation	en samtale	Vi havde en kort samtale.
cook	lave mad; en kok	Jeg laver aftensmad hjemme.
cooking	madlavning	Jeg kan lide at lave mad med min far.
cool	kølig; cool	Rummet er køligt.
correct	rigtig; rette	Dit svar er rigtigt.
cost	en pris; koste	Hvor meget koster det?
could modal	kunne	Jeg kunne hjælpe dig.
country	et land	Canada er et stort land.
course	et kursus	Jeg tager et engelskkursus.
cousin	en fætter; en kusine	Min fætter bor tæt på mig.
cow	en ko	Koen spiser græs.
cream	fløde; creme	Jeg kommer fløde i kaffen.
create	skabe; lave	De laver et nyt spil.
culture	en kultur	Vi lærer om lokal kultur.
cup	en kop	Denne kop er tom.
customer	en kunde	Kunden stiller et spørgsmål.
cut	skære	Skær æblet over.
dad	en far; en pappa	Far er på arbejde.
dance	danse; en dans	Vi danser efter middagen.
dancer	en danser	Danseren bevæger sig hurtigt.
dancing	dans	Dans er sjovt.
dangerous	farlig	Denne vej er farlig.
dark	mørk	Rummet er mørkt.
date	en dato	Hvilken dato er det i dag?
daughter	en datter	Hendes datter er seks år.
day	en dag	Hav en god dag.
dear	kære	Kære ven, tak.
December	december	Min fødselsdag er i december.
decide	beslutte	Bestem dig nu, tak.
delicious	lækker	Denne suppe er lækker.
describe	beskrive	Beskriv dit værelse.
description	en beskrivelse	Læs den korte beskrivelse.
design	et design; designe	Jeg designer et enkelt kort.
desk	et skrivebord	Bogen ligger på mit skrivebord.
detail	en detalje	En detalje mangler.
dialogue	en dialog	Læs dialogen nu.
dictionary	en ordbog	Brug en ordbog i timen.
die	dø	Blomsterne dør uden vand.
diet	en kost; en diæt	Min kost indeholder frugt.
difference	en forskel	Der er en forskel.
different	anderledes; forskellig	Vi har forskellige navne.
difficult	svær	Dette spørgsmål er svært.
dinner	en middag	Middagen er klar.
dirty	snavset	Mine sko er snavsede.
discuss	diskutere	Vi diskuterer planen.
dish	en tallerken; en ret	Denne tallerken er varm.
do1	gøre	Hvad laver du?
doctor	en læge	Lægen har travlt.
dog	en hund	Hunden løber udenfor.
dollar	en dollar	Det koster en dollar.
door	en dør	Luk døren, tak.
down	ned; nede	Sæt dig ned her.
downstairs	nede; nedenunder	Køkkenet er nedenunder.
draw	tegne	Tegn et lille hus.
dress	en kjole; klæde sig	Hun har en rød kjole på.
drink	en drik; drikke	Jeg drikker vand.
drive	køre	Jeg kører på arbejde.
driver	en chauffør	Chaufføren stopper her.
during	under	Jeg sover under flyveturen.
DVD	en dvd	Denne dvd er gammel.
each	hver	Hvert barn har en bog.
ear	et øre	Mit øre gør ondt.
early	tidlig; tidligt	Jeg står tidligt op.
east	øst	Solen står op i øst.
easy	let	Denne prøve er let.
eat	spise	Vi spiser frokost sammen.
egg	et æg	Jeg spiser et æg.
eight	otte	Jeg har otte kort.
eighteen	atten	Hun er atten år.
eighty	firs	Min bedstefar er firs år.
elephant	en elefant	Elefanten er stor.
eleven	elleve	Timen starter klokken elleve.
else	ellers; mere	Hvad mere har du brug for?
email	en e-mail	Send mig en e-mail.
end	en slutning; slutte	Dette er slutningen.
enjoy	nyde; kunne lide	Jeg kan lide denne sang.
enough	nok	Vi har nok tid.
euro	en euro	Det koster en euro.
even	endda; selv	Selv min bror ved det.
evening	en aften	Vi mødes i aften.
event	et arrangement	Arrangementet starter i dag.
ever	nogensinde	Laver du nogensinde mad?
every	hver	Jeg studerer hver dag.
everybody	alle	Alle er her.
everyone	alle	Alle kan lide musik.
everything	alt	Alt er klart.
exam	en eksamen; en prøve	Prøven starter snart.
example	et eksempel	Dette er et godt eksempel.
excited	spændt	Jeg er spændt i dag.
exciting	spændende	Spillet er spændende.
exercise	en øvelse; træne	Jeg træner før morgenmad.
expensive	dyr	Denne frakke er dyr.
explain	forklare	Forklar dette ord, tak.
extra	ekstra	Jeg har brug for ekstra tid.
eye	et øje	Mit øje er rødt.
face	et ansigt	Vask dit ansigt.
fact	en kendsgerning; et faktum	Denne kendsgerning er vigtig.
fall	falde; efterår	Blade falder om efteråret.
false	forkert; falsk	Det svar er forkert.
family	en familie	Min familie er lille.
famous	kendt	Hun er en kendt sanger.
fantastic	fantastisk	Koncerten var fantastisk.
far	langt	Skolen ligger langt væk.
farm	en gård	De bor på en gård.
farmer	en landmand	Landmanden dyrker mad.
fast	hurtig	Dette tog er hurtigt.
fat	tyk	Den kat er tyk.
father	en far	Min far er høj.
favourite	favorit	Dette er min yndlingssang.
February	februar	Februar er kold her.
feel	føle	Jeg føler mig glad.
feeling	en følelse	Jeg kender den følelse.
festival	en festival	Festivalen starter i morgen.
few	nogle få; få	Nogle få elever er her.
fifteen	femten	Jeg er femten år.
fifth	femte	Dette er den femte time.
fifty	halvtreds	Min mor er halvtreds år.
fill	fylde	Fyld koppen med vand.
film	en film	Vi ser en film.
final	sidste; endelig	Dette er det sidste spørgsmål.
find	finde	Jeg finder mine nøgler.
fine	god; fint	Jeg har det fint nu.
finish	afslutte; blive færdig	Gør dine lektier færdige.
fire	ild; brand	Ilden er varm.
first	første	Hun er først i køen.
fish	fisk	Jeg spiser fisk til middag.
five	fem	Jeg har fem bøger.
flat	en lejlighed	Min lejlighed er lille.
flight	en flyvning; et fly	Flyet er forsinket.
floor	et gulv; en etage	Tasken ligger på gulvet.
flower	en blomst	Denne blomst er gul.
fly	flyve	Fugle flyver på himlen.
follow	følge	Følg mig, tak.
food	mad	Maden er klar.
foot	en fod	Min fod gør ondt.
football	fodbold	Vi spiller fodbold i dag.
for	for; til	Denne gave er til dig.
forget	glemme	Glem ikke dine nøgler.
form	en formular	Udfyld formularen.
forty	fyrre	Min far er fyrre år.
four	fire	Jeg ser fire fugle.
fourteen	fjorten	Hun er fjorten år.
fourth	fjerde	Dette er fjerde etage.
free	gratis; fri	Billetten er gratis.
Friday	fredag	Vi mødes på fredag.
friend	en ven	Min ven er her.
friendly	venlig	Læreren er venlig.
from	fra	Jeg er herfra.
front	en forside; foran	Stå forrest.
fruit	frugt	Jeg spiser frugt hver dag.
full	fuld; mæt	Flasken er fuld.
fun	sjov; fornøjelse	Dette spil er sjovt.
funny	sjov	Filmen er sjov.
future	en fremtid	Tænk på din fremtid.
game	et spil	Spillet starter nu.
garden	en have	Haven er smuk.
geography	geografi	Jeg læser geografi i skolen.
get	få; komme	Jeg kommer hjem klokken seks.
girl	en pige	Pigen smiler.
girlfriend	en kæreste	Hans kæreste er sød.
give	give	Giv mig bogen.
glass	et glas	Jeg drikker af et glas.
go	gå	Vi går hjem nu.
good	god; godt	Denne kaffe er god.
goodbye	farvel	Farvel, vi ses i morgen.
grandfather	en bedstefar	Min bedstefar er gammel.
grandmother	en bedstemor	Min bedstemor laver suppe.
grandparent	en bedsteforælder	En bedsteforælder bor hos os.
great	flot; stor	Det er en flot idé.
green	grøn	Døren er grøn.
grey	grå	Himlen er grå.
group	en gruppe	Arbejd i en lille gruppe.
grow	vokse; dyrke	Planter vokser i haven.
guess	gætte	Gæt svaret.
guitar	en guitar	Han spiller guitar.
gym	et fitnesscenter	Jeg går i fitnesscenter.
hair	hår	Hendes hår er langt.
half	en halv; halvdelen	Skær kagen over.
hand	en hånd	Ræk hånden op.
happen	ske	Hvad sker der nu?
happy	glad	Jeg er glad i dag.
hard	hård; svær	Denne stol er hård.
hat	en hat; en hue	Min hue er sort.
hate	hade	Jeg hader kold te.
have	have	Jeg har en bil.
have to modal	skulle; være nødt til	Jeg skal studere.
he	han	Han er min bror.
head	et hoved	Mit hoved gør ondt.
health	sundhed	God mad hjælper sundheden.
healthy	sund	Dette måltid er sundt.
hear	høre	Jeg hører musik.
hello	hej	Hej, rart at møde dig.
help	hjælpe; hjælp	Hjælp mig, tak.
her	hende; hendes	Dette er hendes taske.
here	her	Kom her nu.
hey	hej	Hej, vent på mig.
hi	hej	Hej, hvordan har du det?
high	høj	Væggen er høj.
him	ham	Jeg kender ham.
his	hans	Hans frakke er blå.
history	historie	Jeg læser historie.
hobby	en hobby	Læsning er min hobby.
holiday	en ferie; en helligdag	Vi holder ferie i juli.
home	et hjem; hjemme	Jeg er hjemme.
homework	lektier	Lav dine lektier i aften.
hope	håbe	Jeg håber, du kommer.
horse	en hest	Hesten løber hurtigt.
hospital	et hospital	Hospitalet ligger tæt på.
hot	varm	Suppen er varm.
hotel	et hotel	Hotellet er rent.
hour	en time	Vent en time.
house	et hus	Dette hus er gammelt.
how	hvordan	Hvordan har du det?
however	dog	Dog kan jeg blive her.
hundred	hundrede	Hundrede mennesker kom.
hungry	sulten	Jeg er sulten.
husband	en mand; en ægtemand	Hendes mand er læge.
I	jeg	Jeg kan lide te.
ice	is	Isen er kold.
ice cream	is	Jeg vil have is.
idea	en idé	Det er en god idé.
if	hvis	Ring til mig, hvis du har brug for hjælp.
imagine	forestille sig	Forestil dig et lille hus.
important	vigtig	Denne time er vigtig.
improve	forbedre	Jeg vil forbedre mig.
in	i	Nøglerne ligger i min taske.
include	inkludere; tage med	Tag dit navn med, tak.
information	information	Jeg har brug for mere information.
interest	en interesse	Hun har interesse for kunst.
interested	interesseret	Jeg er interesseret i musik.
interesting	interessant	Denne bog er interessant.
internet	internet	Internettet er langsomt.
interview	et interview	Jeg har et interview i dag.
into	ind i	Læg bøgerne i tasken.
introduce	præsentere	Præsenter din ven, tak.
island	en ø	Denne ø er lille.
it	det	Det er koldt.
its	dens; sin	Hunden kan lide sin seng.
jacket	en jakke	Min jakke er ny.
January	januar	Januar er den første måned.
jeans	jeans	Mine jeans er blå.
job	et job	Jeg har brug for et nyt job.
join	være med; slutte sig til	Vær med i vores klasse i dag.
journey	en rejse	Rejsen er lang.
juice	juice; saft	Jeg drikker appelsinjuice.
July	juli	Vi rejser i juli.
June	juni	Skolen slutter i juni.
just	bare; lige	Jeg har bare brug for vand.
keep	beholde; gemme	Gem denne nøgle.
key	en nøgle	Jeg har mistet min nøgle.
kilometre	en kilometer	Gå en kilometer.
kind (type)	en type; slags	Hvilken type musik kan du lide?
kitchen	et køkken	Køkkenet er rent.
know	vide	Jeg ved svaret.
land	land; jord	Flyet står på jorden.
language	et sprog	Engelsk er et sprog.
large	stor	Dette rum er stort.
last1 (final)	sidste	Dette er den sidste side.
late	sen	Bussen er forsinket.
later	senere	Vi ses senere.
laugh	grine	Vi griner sammen.
learn	lære	Jeg lærer engelsk.
leave	forlade; lade	Lad døren stå åben.
left	venstre	Drej til venstre her.
leg	et ben	Mit ben gør ondt.
lesson	en time; en lektion	Timen starter nu.
let	lade	Lad mig hjælpe dig.
letter	et brev; et bogstav	Jeg skriver et brev.
library	et bibliotek	Biblioteket åbner klokken ni.
lie1	ligge	Læg dig på sengen, tak.
life	et liv	Bylivet er travlt.
like (similar)	som; ligne	Det er som et spil.
like (find sb/sth pleasant)	kunne lide	Jeg kan lide denne sang.
line	en kø; en linje	Stå i kø.
lion	en løve	Løven sover.
list	en liste	Lav en indkøbsliste.
listen	lytte	Lyt til læreren.
little	lille; lidt	Jeg har lidt penge.
live1	bo	Jeg bor tæt på skolen.
local	lokal	Dette er en lokal butik.
long1	lang	Vejen er lang.
look	se; kigge	Kig på billedet.
lose	miste; tabe	Mist ikke billetten.
lot	meget; en masse	Jeg har mange lektier.
love	kærlighed; elske	Jeg elsker min familie.
lunch	en frokost	Frokosten er klar.`;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_002_300_v1_contract_v0.json",
    examples: "",
    outDir: "outputs/oxford-vocabulary/support-translations",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--")) continue;
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    index += 1;
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
  const lines = DA_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tDA\texample_DA") {
    throw new Error("Unexpected DA translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad DA translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad DA translation row ${index + 2}: empty field`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad DA example punctuation for ${sourceHeadword}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad DA Latin native orthography shape for ${sourceHeadword}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad DA non-Latin script leak for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate DA translation key: ${sourceHeadword}`);
    }
    map.set(sourceHeadword, { display, example });
  }
  return map;
}

function validateTranslationMap(rows, translations) {
  if (rows.length !== 300) {
    throw new Error(`Expected exactly 300 English example rows, got ${rows.length}`);
  }
  const sourceKeys = rows.map((row) => row.source_headword);
  const rowKeySet = new Set(sourceKeys);
  const missing = sourceKeys.filter((key) => !translations.has(key));
  const extra = [...translations.keys()].filter((key) => !rowKeySet.has(key));
  if (missing.length) {
    throw new Error(`Missing DA translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`DA translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part002_support_translation_batch_da_v1",
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
    DA: translation.display,
    example_DA: translation.example,
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
    "- Script-aware validation: DA Latin native orthography, Danish article display support, sentence punctuation and non-Latin script leak guard",
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
