#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "NO";
const BATCH_ID = "no_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-no.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const NO_TRANSLATIONS_TSV = `source_headword	NO	example_NO
clothes	klær	Klærne mine er rene.
club	en klubb	Hun går på en musikklubb.
coat	en frakk; en kåpe	Frakken min er varm.
coffee	kaffe	Jeg drikker kaffe om morgenen.
cold	kald; kulde	Vannet er kaldt.
college	en høyskole; et universitet	Søsteren min går på høyskole.
colour	en farge	Favorittfargen min er blå.
come	komme	Kom hit, takk.
common	vanlig	Dette navnet er vanlig.
company	et firma; et selskap	Moren min jobber i et firma.
compare	sammenligne	Sammenlign disse to bildene.
complete	komplett; fullføre	Skjemaet er komplett.
computer	en datamaskin	Denne datamaskinen er ny.
concert	en konsert	Vi går på konsert i kveld.
conversation	en samtale	Vi hadde en kort samtale.
cook	lage mat; en kokk	Jeg lager middag hjemme.
cooking	matlagning	Jeg liker å lage mat med pappa.
cool	kjølig; kul	Rommet er kjølig.
correct	riktig; rette	Svaret ditt er riktig.
cost	en kostnad; koste	Hvor mye koster det?
could modal	kunne	Jeg kunne hjelpe deg.
country	et land	Canada er et stort land.
course	et kurs	Jeg tar et engelskkurs.
cousin	en fetter; en kusine	Fetteren min bor nær meg.
cow	en ku	Kua spiser gress.
cream	fløte; krem	Jeg har fløte i kaffen.
create	skape; lage	De lager et nytt spill.
culture	en kultur	Vi lærer om lokal kultur.
cup	en kopp	Denne koppen er tom.
customer	en kunde	Kunden stiller et spørsmål.
cut	skjære	Skjær eplet i to.
dad	en pappa	Pappa er på jobb.
dance	danse; en dans	Vi danser etter middagen.
dancer	en danser	Danseren beveger seg raskt.
dancing	dans	Dans er gøy.
dangerous	farlig	Denne veien er farlig.
dark	mørk	Rommet er mørkt.
date	en dato	Hvilken dato er det i dag?
daughter	en datter	Datteren hennes er seks år.
day	en dag	Ha en fin dag.
dear	kjære	Kjære venn, takk.
December	desember	Bursdagen min er i desember.
decide	bestemme	Bestem deg nå, takk.
delicious	nydelig	Denne suppen er nydelig.
describe	beskrive	Beskriv rommet ditt.
description	en beskrivelse	Les den korte beskrivelsen.
design	et design; designe	Jeg designer et enkelt kort.
desk	et skrivebord	Boken ligger på skrivebordet mitt.
detail	en detalj	En detalj mangler.
dialogue	en dialog	Les dialogen nå.
dictionary	en ordbok	Bruk en ordbok i timen.
die	dø	Blomstene dør uten vann.
diet	et kosthold; en diett	Kostholdet mitt inneholder frukt.
difference	en forskjell	Det er én forskjell.
different	annerledes; ulik	Vi har ulike navn.
difficult	vanskelig	Dette spørsmålet er vanskelig.
dinner	en middag	Middagen er klar.
dirty	skitten	Skoene mine er skitne.
discuss	diskutere	Vi diskuterer planen.
dish	en tallerken; en rett	Denne tallerkenen er varm.
do1	gjøre	Hva gjør du?
doctor	en lege	Legen er opptatt.
dog	en hund	Hunden løper ute.
dollar	en dollar	Det koster én dollar.
door	en dør	Lukk døren, takk.
down	ned; nede	Sett deg ned her.
downstairs	nede; i første etasje	Kjøkkenet er nede.
draw	tegne	Tegn et lite hus.
dress	en kjole; kle seg	Hun har på seg en rød kjole.
drink	en drikk; drikke	Jeg drikker vann.
drive	kjøre	Jeg kjører til jobb.
driver	en sjåfør	Sjåføren stopper her.
during	under	Jeg sover under flyturen.
DVD	en dvd	Denne dvd-en er gammel.
each	hver	Hvert barn har en bok.
ear	et øre	Øret mitt gjør vondt.
early	tidlig	Jeg står opp tidlig.
east	øst	Solen går opp i øst.
easy	lett	Denne prøven er lett.
eat	spise	Vi spiser lunsj sammen.
egg	et egg	Jeg spiser et egg.
eight	åtte	Jeg har åtte kort.
eighteen	atten	Hun er atten år.
eighty	åtti	Bestefaren min er åtti år.
elephant	en elefant	Elefanten er stor.
eleven	elleve	Timen begynner klokka elleve.
else	ellers; mer	Hva mer trenger du?
email	en e-post	Send meg en e-post.
end	en slutt; ende	Dette er slutten.
enjoy	like; nyte	Jeg liker denne sangen.
enough	nok	Vi har nok tid.
euro	en euro	Det koster én euro.
even	til og med	Til og med broren min vet det.
evening	en kveld	Vi møtes i kveld.
event	et arrangement	Arrangementet starter i dag.
ever	noen gang	Lager du noen gang mat?
every	hver	Jeg studerer hver dag.
everybody	alle	Alle er her.
everyone	alle	Alle liker musikk.
everything	alt	Alt er klart.
exam	en eksamen; en prøve	Prøven begynner snart.
example	et eksempel	Dette er et godt eksempel.
excited	spent	Jeg er spent i dag.
exciting	spennende	Spillet er spennende.
exercise	en øvelse; trene	Jeg trener før frokost.
expensive	dyr	Denne frakken er dyr.
explain	forklare	Forklar dette ordet, takk.
extra	ekstra	Jeg trenger ekstra tid.
eye	et øye	Øyet mitt er rødt.
face	et ansikt	Vask ansiktet ditt.
fact	et faktum	Dette faktumet er viktig.
fall	falle; høst	Blader faller om høsten.
false	feil; falsk	Det svaret er feil.
family	en familie	Familien min er liten.
famous	kjent	Hun er en kjent sanger.
fantastic	fantastisk	Konserten var fantastisk.
far	langt	Skolen ligger langt unna.
farm	en gård	De bor på en gård.
farmer	en bonde	Bonden dyrker mat.
fast	rask	Dette toget er raskt.
fat	tykk	Den katten er tykk.
father	en far; en pappa	Faren min er høy.
favourite	favoritt	Dette er favorittsangen min.
February	februar	Februar er kald her.
feel	føle	Jeg føler meg glad.
feeling	en følelse	Jeg kjenner den følelsen.
festival	en festival	Festivalen starter i morgen.
few	noen få; få	Noen få elever er her.
fifteen	femten	Jeg er femten år.
fifth	femte	Dette er den femte timen.
fifty	femti	Moren min er femti år.
fill	fylle	Fyll koppen med vann.
film	en film	Vi ser en film.
final	siste; endelig	Dette er det siste spørsmålet.
find	finne	Jeg finner nøklene mine.
fine	bra	Jeg føler meg bra nå.
finish	fullføre; bli ferdig	Gjør ferdig leksene dine.
fire	ild; brann	Ilden er varm.
first	første	Hun er først i køen.
fish	fisk	Jeg spiser fisk til middag.
five	fem	Jeg har fem bøker.
flat	en leilighet	Leiligheten min er liten.
flight	en flytur; et fly	Flyet er forsinket.
floor	et gulv; en etasje	Vesken ligger på gulvet.
flower	en blomst	Denne blomsten er gul.
fly	fly	Fugler flyr på himmelen.
follow	følge	Følg meg, takk.
food	mat	Maten er klar.
foot	en fot	Foten min gjør vondt.
football	fotball	Vi spiller fotball i dag.
for	for; til	Denne gaven er til deg.
forget	glemme	Ikke glem nøklene dine.
form	et skjema	Fyll ut skjemaet.
forty	førti	Faren min er førti år.
four	fire	Jeg ser fire fugler.
fourteen	fjorten	Hun er fjorten år.
fourth	fjerde	Dette er fjerde etasje.
free	gratis; fri	Billetten er gratis.
Friday	fredag	Vi møtes på fredag.
friend	en venn	Vennen min er her.
friendly	vennlig	Læreren er vennlig.
from	fra	Jeg er herfra.
front	en forside; foran	Stå foran.
fruit	frukt	Jeg spiser frukt hver dag.
full	full; mett	Flasken er full.
fun	gøy; moro	Dette spillet er gøy.
funny	morsom	Filmen er morsom.
future	en framtid	Tenk på framtiden din.
game	et spill	Spillet starter nå.
garden	en hage	Hagen er vakker.
geography	geografi	Jeg studerer geografi på skolen.
get	få; komme	Jeg kommer hjem klokka seks.
girl	en jente	Jenta smiler.
girlfriend	en kjæreste	Kjæresten hans er snill.
give	gi	Gi meg boken.
glass	et glass	Jeg drikker fra et glass.
go	gå	Vi går hjem nå.
good	god; bra	Denne kaffen er god.
goodbye	ha det	Ha det, vi ses i morgen.
grandfather	en bestefar	Bestefaren min er gammel.
grandmother	en bestemor	Bestemoren min lager suppe.
grandparent	en besteforelder	En besteforelder bor hos oss.
great	flott; stor	Dette er en flott idé.
green	grønn	Døren er grønn.
grey	grå	Himmelen er grå.
group	en gruppe	Arbeid i en liten gruppe.
grow	vokse; dyrke	Planter vokser i hagen.
guess	gjette	Gjett svaret.
guitar	en gitar	Han spiller gitar.
gym	et treningssenter	Jeg går på treningssenter.
hair	hår	Håret hennes er langt.
half	en halv; halvparten	Skjær kaken i to.
hand	en hånd	Rekk opp hånden.
happen	skje	Hva kommer til å skje nå?
happy	glad	Jeg er glad i dag.
hard	hard; vanskelig	Denne stolen er hard.
hat	en hatt; en lue	Lua mi er svart.
hate	hate	Jeg hater kald te.
have	ha	Jeg har en bil.
have to modal	måtte	Jeg må studere.
he	han	Han er broren min.
head	et hode	Hodet mitt gjør vondt.
health	helse	God mat hjelper helsen.
healthy	sunn	Dette måltidet er sunt.
hear	høre	Jeg hører musikk.
hello	hallo	Hallo, hyggelig å møte deg.
help	hjelpe; hjelp	Hjelp meg, takk.
her	henne; hennes	Dette er vesken hennes.
here	her	Kom hit nå.
hey	hei	Hei, vent på meg.
hi	hei	Hei, hvordan har du det?
high	høy	Veggen er høy.
him	ham	Jeg kjenner ham.
his	hans	Frakken hans er blå.
history	historie	Jeg studerer historie.
hobby	en hobby	Lesing er hobbyen min.
holiday	en ferie; en helligdag	Vi tar ferie i juli.
home	et hjem; hjemme	Jeg er hjemme.
homework	lekser	Gjør leksene dine i kveld.
hope	håpe	Jeg håper du kommer.
horse	en hest	Hesten løper raskt.
hospital	et sykehus	Sykehuset ligger nær her.
hot	varm	Suppen er varm.
hotel	et hotell	Hotellet er rent.
hour	en time	Vent en time.
house	et hus	Dette huset er gammelt.
how	hvordan	Hvordan har du det?
however	likevel	Likevel kan jeg bli her.
hundred	hundre	Hundre mennesker kom.
hungry	sulten	Jeg er sulten.
husband	en mann; en ektemann	Mannen hennes er lege.
I	jeg	Jeg liker te.
ice	is	Isen er kald.
ice cream	is	Jeg vil ha is.
idea	en idé	Det er en god idé.
if	hvis	Ring meg hvis du trenger hjelp.
imagine	forestille seg	Se for deg et lite hus.
important	viktig	Denne timen er viktig.
improve	forbedre	Jeg vil forbedre meg.
in	i	Nøklene ligger i vesken min.
include	inkludere; ta med	Ta med navnet ditt, takk.
information	informasjon	Jeg trenger mer informasjon.
interest	en interesse	Hun har interesse for kunst.
interested	interessert	Jeg er interessert i musikk.
interesting	interessant	Denne boken er interessant.
internet	internett	Internett er tregt.
interview	et intervju	Jeg har et intervju i dag.
into	inn i	Legg bøkene i vesken.
introduce	presentere	Presenter vennen din, takk.
island	en ø	Denne øya er liten.
it	det	Det er kaldt.
its	dens; sin	Hunden liker sengen sin.
jacket	en jakke	Jakken min er ny.
January	januar	Januar er den første måneden.
jeans	jeans	Jeansen min er blå.
job	en jobb	Jeg trenger en ny jobb.
join	bli med	Bli med i klassen vår i dag.
journey	en reise	Reisen er lang.
juice	juice; saft	Jeg drikker appelsinjuice.
July	juli	Vi reiser i juli.
June	juni	Skolen slutter i juni.
just	bare; nettopp	Jeg trenger bare vann.
keep	beholde; spare	Ta vare på denne nøkkelen.
key	en nøkkel	Jeg mistet nøkkelen min.
kilometre	en kilometer	Gå én kilometer.
kind (type)	en type; et slag	Hvilken type musikk liker du?
kitchen	et kjøkken	Kjøkkenet er rent.
know	vite	Jeg vet svaret.
land	land; grunn	Flyet står på bakken.
language	et språk	Engelsk er et språk.
large	stor	Dette rommet er stort.
last1 (final)	siste	Dette er den siste siden.
late	sen	Bussen er sen.
later	senere	Vi ses senere.
laugh	le	Vi ler sammen.
learn	lære	Jeg lærer engelsk.
leave	forlate; la	Lukk opp døren, og la den stå åpen.
left	venstre	Sving til venstre her.
leg	et bein	Beinet mitt gjør vondt.
lesson	en time; en leksjon	Timen begynner nå.
let	la	La meg hjelpe deg.
letter	et brev; en bokstav	Jeg skriver et brev.
library	et bibliotek	Biblioteket åpner klokka ni.
lie1	ligge	Legg deg på sengen, takk.
life	et liv	Bylivet er travelt.
like (similar)	som; ligne	Det er som et spill.
like (find sb/sth pleasant)	like	Jeg liker denne sangen.
line	en kø; en linje	Stå i kø.
lion	en løve	Løven sover.
list	en liste	Lag en handleliste.
listen	lytte	Lytt til læreren.
little	liten; lite	Jeg har lite penger.
live1	bo	Jeg bor nær skolen.
local	lokal	Dette er en lokal butikk.
long1	lang	Veien er lang.
look	se; se ut	Se på bildet.
lose	miste; tape	Ikke mist billetten.
lot	mye; en masse	Jeg har mye lekser.
love	kjærlighet; elske	Jeg elsker familien min.
lunch	en lunsj	Lunsjen er klar.`;

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
  const lines = NO_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tNO\texample_NO") {
    throw new Error("Unexpected NO translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad NO translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad NO translation row ${index + 2}: empty field`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad NO example punctuation for ${sourceHeadword}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad NO Latin native orthography shape for ${sourceHeadword}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad NO non-Latin script leak for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate NO translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing NO translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`NO translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part002_support_translation_batch_no_v1",
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
    NO: translation.display,
    example_NO: translation.example,
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
    "- Script-aware validation: NO Latin native orthography, Norwegian Bokmål article display support, sentence punctuation and non-Latin script leak guard",
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
