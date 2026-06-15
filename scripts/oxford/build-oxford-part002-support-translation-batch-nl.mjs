#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "NL";
const BATCH_ID = "nl_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-nl.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const NL_TRANSLATIONS_TSV = `source_headword	NL	example_NL
clothes	de kleding	Mijn kleding is schoon.
club	de club	Zij gaat naar de muziekclub.
coat	de jas	Mijn jas is warm.
coffee	de koffie	Ik drink koffie in de ochtend.
cold	koud; de kou	Het water is koud.
college	de hogeschool; de universiteit	Mijn zus studeert aan de universiteit.
colour	de kleur	Mijn favoriete kleur is blauw.
come	komen	Kom hier, alstublieft.
common	gewoon; veelvoorkomend	Deze naam is veelvoorkomend.
company	het bedrijf	Mijn moeder werkt bij een bedrijf.
compare	vergelijken	Vergelijk deze twee foto's.
complete	compleet; afmaken	Het formulier is compleet.
computer	de computer	Deze computer is nieuw.
concert	het concert	Wij gaan vanavond naar een concert.
conversation	het gesprek	Wij hadden een kort gesprek.
cook	koken; de kok	Ik kook avondeten thuis.
cooking	het koken	Ik kook graag met mijn vader.
cool	koel; gaaf	De kamer is koel.
correct	juist; corrigeren	Je antwoord is juist.
cost	de kosten; kosten	Hoeveel kost dit?
could modal	kunnen	Ik kan je helpen.
country	het land	Canada is een groot land.
course	de cursus	Ik volg een cursus Engels.
cousin	de neef; de nicht	Mijn neef woont dichtbij.
cow	de koe	De koe eet gras.
cream	de room; de crème	Ik doe room in mijn koffie.
create	maken; creëren	Zij maken een nieuw spel.
culture	de cultuur	Wij leren over lokale cultuur.
cup	de kop; het kopje	Dit kopje is leeg.
customer	de klant	De klant stelt een vraag.
cut	snijden	Snijd de appel doormidden.
dad	de papa; de vader	Papa is aan het werk.
dance	dansen; de dans	Wij dansen na het avondeten.
dancer	de danser; de danseres	De danser beweegt snel.
dancing	het dansen	Dansen is leuk.
dangerous	gevaarlijk	Deze weg is gevaarlijk.
dark	donker	De kamer is donker.
date	de datum	Welke datum is het vandaag?
daughter	de dochter	Haar dochter is zes jaar.
day	de dag	Een fijne dag.
dear	beste	Beste vriend, bedankt.
December	december	Mijn verjaardag is in december.
decide	beslissen	Beslis nu, alstublieft.
delicious	heerlijk	Deze soep is heerlijk.
describe	beschrijven	Beschrijf je kamer.
description	de beschrijving	Lees de korte beschrijving.
design	het ontwerp; ontwerpen	Ik maak een eenvoudig kaartontwerp.
desk	het bureau	Het boek ligt op mijn bureau.
detail	het detail	Er ontbreekt één detail.
dialogue	de dialoog	Lees deze dialoog nu.
dictionary	het woordenboek	Gebruik het woordenboek in de les.
die	sterven	Bloemen sterven zonder water.
diet	het dieet	Mijn dieet bevat fruit.
difference	het verschil	Er is één verschil.
different	anders; verschillend	Onze namen zijn verschillend.
difficult	moeilijk	Deze vraag is moeilijk.
dinner	het avondeten	Het avondeten is klaar.
dirty	vies	Mijn schoenen zijn vies.
discuss	bespreken	Wij bespreken het plan.
dish	het bord; het gerecht	Dit bord is heet.
do1	doen	Wat doe je?
doctor	de dokter	De dokter is druk.
dog	de hond	De hond rent buiten.
dollar	de dollar	Dit kost één dollar.
door	de deur	Sluit de deur, alstublieft.
down	naar beneden; beneden	Ga hier zitten.
downstairs	beneden	De keuken is beneden.
draw	tekenen	Teken een klein huis.
dress	de jurk; zich aankleden	Zij draagt een rode jurk.
drink	de drank; drinken	Ik drink water.
drive	rijden	Ik rijd naar mijn werk.
driver	de bestuurder; de chauffeur	De chauffeur stopt hier.
during	tijdens	Ik slaap tijdens de vlucht.
DVD	de dvd	Deze dvd is oud.
each	elke	Elk kind heeft een boek.
ear	het oor	Mijn oor doet pijn.
early	vroeg	Ik sta vroeg op.
east	het oosten	De zon komt op in het oosten.
easy	makkelijk	Deze toets is makkelijk.
eat	eten	Wij lunchen samen.
egg	het ei	Ik eet één ei.
eight	acht	Ik heb acht kaarten.
eighteen	achttien	Zij is achttien jaar.
eighty	tachtig	Mijn opa is tachtig jaar.
elephant	de olifant	De olifant is groot.
eleven	elf	De les begint om elf uur.
else	anders; nog	Wat heb je nog nodig?
email	de e-mail	Stuur mij een e-mail.
end	het einde; eindigen	Dit is het einde.
enjoy	genieten van	Ik geniet van dit lied.
enough	genoeg	Wij hebben genoeg tijd.
euro	de euro	Dit kost één euro.
even	zelfs	Zelfs mijn broer weet het.
evening	de avond	Tot vanavond.
event	het evenement	Het evenement begint vandaag.
ever	ooit	Heb je ooit gekookt?
every	elke	Ik leer elke dag.
everybody	iedereen	Iedereen is hier.
everyone	iedereen	Iedereen houdt van muziek.
everything	alles	Alles is klaar.
exam	het examen	Het examen begint binnenkort.
example	het voorbeeld	Dit is een goed voorbeeld.
excited	opgewonden; enthousiast	Ik ben vandaag enthousiast.
exciting	spannend	Dit spel is spannend.
exercise	de oefening; bewegen	Ik sport voor het ontbijt.
expensive	duur	Deze jas is duur.
explain	uitleggen	Leg dit woord uit, alstublieft.
extra	extra	Ik heb extra tijd nodig.
eye	het oog	Mijn oog is rood.
face	het gezicht	Was je gezicht.
fact	het feit	Dit feit is belangrijk.
fall	vallen; de herfst	Bladeren vallen in de herfst.
false	onjuist; vals	Dit antwoord is onjuist.
family	de familie	Mijn familie is klein.
famous	beroemd	Zij is een beroemde zangeres.
fantastic	fantastisch	Het concert was fantastisch.
far	ver	De school is ver.
farm	de boerderij	Zij wonen op een boerderij.
farmer	de boer	De boer verbouwt voedsel.
fast	snel	Deze trein is snel.
fat	dik	Die kat is dik.
father	de vader	Mijn vader is lang.
favourite	favoriet	Dit is mijn favoriete lied.
February	februari	Het is hier koud in februari.
feel	voelen	Ik voel me gelukkig.
feeling	het gevoel	Ik begrijp dat gevoel.
festival	het festival	Het festival begint morgen.
few	enkele; weinig	Er zijn weinig leerlingen hier.
fifteen	vijftien	Ik ben vijftien jaar.
fifth	vijfde	Dit is de vijfde les.
fifty	vijftig	Mijn moeder is vijftig jaar.
fill	vullen	Vul de beker met water.
film	de film	Wij kijken een film.
final	laatste; definitief	Dit is de laatste vraag.
find	vinden	Ik vind de sleutel.
fine	goed	Het gaat nu goed met mij.
finish	afmaken	Maak je huiswerk af.
fire	het vuur	Vuur is heet.
first	eerste	Zij staat als eerste in de rij.
fish	de vis	Ik eet vis als avondeten.
five	vijf	Ik heb vijf boeken.
flat	het appartement	Mijn appartement is klein.
flight	de vlucht	De vlucht is te laat.
floor	de vloer; de verdieping	De tas ligt op de vloer.
flower	de bloem	Deze bloem is geel.
fly	vliegen	De vogel vliegt in de lucht.
follow	volgen	Volg mij.
food	het eten	Het eten is klaar.
foot	de voet	Mijn voet doet pijn.
football	het voetbal	Wij spelen vandaag voetbal.
for	voor	Dit cadeau is voor jou.
forget	vergeten	Vergeet de sleutel niet.
form	het formulier	Vul het formulier in.
forty	veertig	Mijn vader is veertig jaar.
four	vier	Ik zie vier vogels.
fourteen	veertien	Zij is veertien jaar.
fourth	vierde	Dit is de vierde verdieping.
free	gratis; vrij	Het kaartje is gratis.
Friday	vrijdag	Tot vrijdag.
friend	de vriend; de vriendin	Mijn vriend is hier.
friendly	vriendelijk	De leraar is vriendelijk.
from	van	Ik kom hiervandaan.
front	de voorkant	Het is aan de voorkant.
fruit	het fruit	Ik eet elke dag fruit.
full	vol; verzadigd	De fles is vol.
fun	het plezier; leuk	Dit spel is leuk.
funny	grappig	Deze film is grappig.
future	de toekomst	Denk aan je toekomst.
game	het spel	Het spel begint nu.
garden	de tuin	De tuin is mooi.
geography	de aardrijkskunde	Ik leer aardrijkskunde op school.
get	krijgen; aankomen	Ik kom om zes uur thuis.
girl	het meisje	Het meisje glimlacht.
girlfriend	de vriendin	Zijn vriendin is aardig.
give	geven	Geef mij het boek.
glass	het glas	Ik drink water uit een glas.
go	gaan	Wij gaan nu naar huis.
good	goed	Deze koffie is goed.
goodbye	tot ziens	Tot ziens, tot morgen.
grandfather	de opa; de grootvader	Mijn opa is oud.
grandmother	de oma; de grootmoeder	Mijn oma kookt soep.
grandparent	de grootouder	Mijn grootouder woont bij ons.
great	geweldig; groot	Dat is een geweldig idee.
green	groen	De deur is groen.
grey	grijs	De lucht is grijs.
group	de groep	Werk in een kleine groep.
grow	groeien; verbouwen	De plant groeit in de tuin.
guess	raden	Raad het antwoord.
guitar	de gitaar	Hij speelt gitaar.
gym	de sportschool	Ik ga naar de sportschool.
hair	het haar	Haar haar is lang.
half	de helft	Snijd de taart doormidden.
hand	de hand	Steek je hand op.
happen	gebeuren	Wat gebeurt er daarna?
happy	gelukkig	Ik ben vandaag gelukkig.
hard	hard; moeilijk	Deze stoel is hard.
hat	de hoed; de muts	Mijn muts is zwart.
hate	haten	Ik haat koude thee.
have	hebben	Ik heb een auto.
have to modal	moeten	Ik moet studeren.
he	hij	Hij is mijn broer.
head	het hoofd	Mijn hoofd doet pijn.
health	de gezondheid	Goed eten helpt de gezondheid.
healthy	gezond	Dit gerecht is gezond.
hear	horen	Ik hoor muziek.
hello	hallo	Hallo, leuk je te ontmoeten.
help	helpen; de hulp	Help mij, alstublieft.
her	haar	Dit is haar tas.
here	hier	Kom nu hier.
hey	hey	Hey, wacht op mij.
hi	hoi	Hoi, hoe gaat het?
high	hoog	De muur is hoog.
him	hem	Ik ken hem.
his	zijn	Zijn jas is blauw.
history	de geschiedenis	Ik leer geschiedenis.
hobby	de hobby	Lezen is mijn hobby.
holiday	de vakantie	Wij gaan in juli op vakantie.
home	het huis; thuis	Ik ben thuis.
homework	het huiswerk	Maak vanavond je huiswerk.
hope	hopen	Ik hoop dat je komt.
horse	het paard	Het paard rent snel.
hospital	het ziekenhuis	Het ziekenhuis is dichtbij.
hot	heet	De soep is heet.
hotel	het hotel	Het hotel is schoon.
hour	het uur	Wacht één uur.
house	het huis	Dit huis is oud.
how	hoe	Hoe gaat het?
however	echter	Ik kan hier echter blijven.
hundred	honderd	Honderd mensen kwamen.
hungry	hongerig	Ik heb honger.
husband	de man; de echtgenoot	Haar man is dokter.
I	ik	Ik houd van thee.
ice	het ijs	Het ijs is koud.
ice cream	het ijsje	Ik wil een ijsje.
idea	het idee	Dit is een goed idee.
if	als	Bel mij als je hulp nodig hebt.
imagine	zich voorstellen	Stel je een klein huis voor.
important	belangrijk	Deze les is belangrijk.
improve	verbeteren	Ik wil mezelf verbeteren.
in	in	De sleutel zit in mijn tas.
include	opnemen; erbij doen	Doe je naam erbij.
information	de informatie	Ik heb meer informatie nodig.
interest	de interesse	Zij heeft interesse in kunst.
interested	geïnteresseerd	Ik ben geïnteresseerd in muziek.
interesting	interessant	Dit boek is interessant.
internet	het internet	Het internet is langzaam.
interview	het interview	Ik heb vandaag een interview.
into	in; naar binnen	Doe het boek in de tas.
introduce	voorstellen	Stel je vriend voor.
island	het eiland	Dit eiland is klein.
it	het	Het is koud.
its	zijn; haar	De hond houdt van zijn bed.
jacket	de jas	Mijn jas is nieuw.
January	januari	Januari is de eerste maand.
jeans	de spijkerbroek	Mijn spijkerbroek is blauw.
job	de baan	Ik heb een nieuwe baan nodig.
join	meedoen; aansluiten	Doe vandaag mee met onze klas.
journey	de reis	De reis is lang.
juice	het sap	Ik drink sinaasappelsap.
July	juli	Wij reizen in juli.
June	juni	De school eindigt in juni.
just	alleen; net	Ik heb alleen water nodig.
keep	houden; bewaren	Bewaar deze sleutel.
key	de sleutel	Ik ben de sleutel kwijt.
kilometre	de kilometer	Loop één kilometer.
kind (type)	het soort	Welk soort muziek vind je leuk?
kitchen	de keuken	De keuken is schoon.
know	weten	Ik weet het antwoord.
land	het land; de grond	Het vliegtuig staat op de grond.
language	de taal	Engels is een taal.
large	groot	Deze kamer is groot.
last1 (final)	laatste	Dit is de laatste pagina.
late	laat	De bus is laat.
later	later	Tot later.
laugh	lachen	Wij lachen samen.
learn	leren	Ik leer Engels.
leave	weggaan; verlaten	Ik verlaat nu het huis.
left	links	Sla hier linksaf.
leg	het been	Mijn been doet pijn.
lesson	de les	De les begint nu.
let	laten	Laat mij je helpen.
letter	de brief; de letter	Ik schrijf een brief.
library	de bibliotheek	De bibliotheek opent om negen uur.
lie1	liggen	Ga op het bed liggen.
life	het leven	Het leven in de stad is druk.
like (similar)	zoals; lijken op	Dit lijkt op een spel.
like (find sb/sth pleasant)	leuk vinden	Ik vind dit lied leuk.
line	de rij; de lijn	Sta in de rij.
lion	de leeuw	De leeuw slaapt.
list	de lijst	Maak een boodschappenlijst.
listen	luisteren	Luister naar de leraar.
little	klein; weinig	Ik heb weinig geld.
live1	wonen	Ik woon dicht bij school.
local	lokaal	Dit is een lokale winkel.
long1	lang	De weg is lang.
look	kijken; eruitzien	Kijk naar de afbeelding.
lose	verliezen	Raak het kaartje niet kwijt.
lot	veel	Ik heb veel huiswerk.
love	de liefde; houden van	Ik houd van mijn familie.
lunch	de lunch	De lunch is klaar.`;

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
  const lines = NL_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tNL\texample_NL") {
    throw new Error("Unexpected NL translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad NL translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad NL translation row ${index + 2}: empty field`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad NL example punctuation for ${sourceHeadword}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad NL Latin native orthography shape for ${sourceHeadword}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad NL non-Latin script leak for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate NL translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing NL translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`NL translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part002_support_translation_batch_nl_v1",
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
    NL: translation.display,
    example_NL: translation.example,
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
    "- Script-aware validation: NL Latin native orthography, sentence punctuation and non-Latin script leak guard",
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
