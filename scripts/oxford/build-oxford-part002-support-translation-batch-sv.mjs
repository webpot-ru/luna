#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "SV";
const BATCH_ID = "sv_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-sv.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const SV_TRANSLATIONS_TSV = `source_headword	SV	example_SV
clothes	kläder	Mina kläder är rena.
club	en klubb	Hon går till en musikklubb.
coat	en rock; en kappa	Min rock är varm.
coffee	kaffe	Jag dricker kaffe på morgonen.
cold	kall; kyla	Vattnet är kallt.
college	en högskola; ett universitet	Min syster går på högskola.
colour	en färg	Min favoritfärg är blå.
come	komma	Kom hit, tack.
common	vanlig	Det här namnet är vanligt.
company	ett företag	Min mamma arbetar på ett företag.
compare	jämföra	Jämför de här två bilderna.
complete	komplett; slutföra	Formuläret är komplett.
computer	en dator	Den här datorn är ny.
concert	en konsert	Vi går på konsert i kväll.
conversation	ett samtal	Vi hade ett kort samtal.
cook	laga mat; en kock	Jag lagar middag hemma.
cooking	matlagning	Jag tycker om att laga mat med pappa.
cool	sval; cool	Rummet är svalt.
correct	rätt; korrigera	Ditt svar är rätt.
cost	kostnad; kosta	Hur mycket kostar det?
could modal	kunna	Jag skulle kunna hjälpa dig.
country	ett land	Kanada är ett stort land.
course	en kurs	Jag går en engelskakurs.
cousin	en kusin	Min kusin bor nära mig.
cow	en ko	Kon äter gräs.
cream	grädde; kräm	Jag har grädde i kaffet.
create	skapa	De skapar ett nytt spel.
culture	en kultur	Vi lär oss om lokal kultur.
cup	en kopp	Den här koppen är tom.
customer	en kund	Kunden ställer en fråga.
cut	skära	Skär äpplet i två delar.
dad	en pappa	Pappa är på jobbet.
dance	dansa; en dans	Vi dansar efter middagen.
dancer	en dansare	Dansaren rör sig snabbt.
dancing	dans	Dans är roligt.
dangerous	farlig	Den här vägen är farlig.
dark	mörk	Rummet är mörkt.
date	ett datum	Vilket datum är det i dag?
daughter	en dotter	Hennes dotter är sex år.
day	en dag	Ha en bra dag.
dear	kära	Kära vän, tack.
December	december	Min födelsedag är i december.
decide	bestämma	Bestäm nu, tack.
delicious	utsökt; jättegod	Den här soppan är jättegod.
describe	beskriva	Beskriv ditt rum.
description	en beskrivning	Läs den korta beskrivningen.
design	design; utforma	Jag designar ett enkelt kort.
desk	ett skrivbord	Boken ligger på mitt skrivbord.
detail	en detalj	En detalj saknas.
dialogue	en dialog	Läs dialogen nu.
dictionary	en ordbok	Använd en ordbok på lektionen.
die	dö	Blommorna dör utan vatten.
diet	en kost; en diet	Min kost innehåller frukt.
difference	en skillnad	Det finns en skillnad.
different	annorlunda; olika	Vi har olika namn.
difficult	svår	Den här frågan är svår.
dinner	en middag	Middagen är klar.
dirty	smutsig	Mina skor är smutsiga.
discuss	diskutera	Vi diskuterar planen.
dish	en tallrik; en maträtt	Den här tallriken är het.
do1	göra	Vad gör du?
doctor	en läkare	Läkaren är upptagen.
dog	en hund	Hunden springer ute.
dollar	en dollar	Det kostar en dollar.
door	en dörr	Stäng dörren, tack.
down	ner; nere	Sätt dig ner här.
downstairs	nere; på nedervåningen	Köket ligger på nedervåningen.
draw	rita	Rita ett litet hus.
dress	en klänning; klä sig	Hon har på sig en röd klänning.
drink	en dryck; dricka	Jag dricker vatten.
drive	köra	Jag kör till jobbet.
driver	en förare; en chaufför	Chauffören stannar här.
during	under	Jag sover under flygresan.
DVD	en dvd	Den här dvd:n är gammal.
each	varje	Varje barn har en bok.
ear	ett öra	Mitt öra gör ont.
early	tidig; tidigt	Jag går upp tidigt.
east	öster	Solen går upp i öster.
easy	lätt	Det här provet är lätt.
eat	äta	Vi äter lunch tillsammans.
egg	ett ägg	Jag äter ett ägg.
eight	åtta	Jag har åtta kort.
eighteen	arton	Hon är arton år.
eighty	åttio	Min farfar är åttio år.
elephant	en elefant	Elefanten är stor.
eleven	elva	Lektionen börjar klockan elva.
else	annars; mer	Vad mer behöver du?
email	ett mejl	Skicka ett mejl till mig.
end	ett slut; sluta	Det här är slutet.
enjoy	tycka om; njuta av	Jag tycker om den här sången.
enough	nog	Vi har nog med tid.
euro	en euro	Det kostar en euro.
even	även; till och med	Även min bror vet det.
evening	en kväll	Vi träffas i kväll.
event	ett evenemang	Evenemanget börjar i dag.
ever	någonsin	Lagar du någonsin mat?
every	varje	Jag studerar varje dag.
everybody	alla	Alla är här.
everyone	alla	Alla tycker om musik.
everything	allt	Allt är klart.
exam	ett prov; en examen	Provet börjar snart.
example	ett exempel	Det här är ett bra exempel.
excited	förväntansfull; uppspelt	Jag är förväntansfull i dag.
exciting	spännande	Spelet är spännande.
exercise	en övning; träna	Jag tränar före frukost.
expensive	dyr	Den här rocken är dyr.
explain	förklara	Förklara det här ordet, tack.
extra	extra	Jag behöver extra tid.
eye	ett öga	Mitt öga är rött.
face	ett ansikte	Tvätta ansiktet.
fact	ett faktum	Det här faktumet är viktigt.
fall	falla; höst	Löv faller på hösten.
false	fel; falsk	Det svaret är fel.
family	en familj	Min familj är liten.
famous	känd	Hon är en känd sångerska.
fantastic	fantastisk	Konserten var fantastisk.
far	långt	Skolan ligger långt bort.
farm	en bondgård	De bor på en bondgård.
farmer	en bonde	Bonden odlar mat.
fast	snabb	Det här tåget är snabbt.
fat	tjock	Den katten är tjock.
father	en far; en pappa	Min pappa är lång.
favourite	favorit	Det här är min favoritlåt.
February	februari	Februari är kall här.
feel	känna	Jag känner mig glad.
feeling	en känsla	Jag känner igen den känslan.
festival	en festival	Festivalen börjar i morgon.
few	några få; få	Några få elever är här.
fifteen	femton	Jag är femton år.
fifth	femte	Det här är femte lektionen.
fifty	femtio	Min mamma är femtio år.
fill	fylla	Fyll koppen med vatten.
film	en film	Vi tittar på en film.
final	sista; slutlig	Det här är den sista frågan.
find	hitta	Jag hittar mina nycklar.
fine	bra	Jag mår bra nu.
finish	göra färdig; avsluta	Gör färdigt läxan.
fire	eld	Elden är het.
first	första	Hon är först i kön.
fish	fisk	Jag äter fisk till middag.
five	fem	Jag har fem böcker.
flat	en lägenhet	Min lägenhet är liten.
flight	en flygning; ett flyg	Flyget är försenat.
floor	ett golv; en våning	Väskan ligger på golvet.
flower	en blomma	Den här blomman är gul.
fly	flyga	Fåglar flyger på himlen.
follow	följa	Följ mig, tack.
food	mat	Maten är klar.
foot	en fot	Min fot gör ont.
football	fotboll	Vi spelar fotboll i dag.
for	för; till	Den här presenten är till dig.
forget	glömma	Glöm inte dina nycklar.
form	ett formulär	Fyll i formuläret.
forty	fyrtio	Min pappa är fyrtio år.
four	fyra	Jag ser fyra fåglar.
fourteen	fjorton	Hon är fjorton år.
fourth	fjärde	Det här är fjärde våningen.
free	gratis; fri	Biljetten är gratis.
Friday	fredag	Vi träffas på fredag.
friend	en vän	Min vän är här.
friendly	vänlig	Läraren är vänlig.
from	från	Jag är härifrån.
front	framsida; främre del	Stå längst fram.
fruit	frukt	Jag äter frukt varje dag.
full	full; mätt	Flaskan är full.
fun	roligt; nöje	Det här spelet är roligt.
funny	rolig	Filmen är rolig.
future	en framtid	Tänk på din framtid.
game	ett spel	Spelet börjar nu.
garden	en trädgård	Trädgården är vacker.
geography	geografi	Jag studerar geografi i skolan.
get	få; komma	Jag kommer hem klockan sex.
girl	en flicka	Flickan ler.
girlfriend	en flickvän	Hans flickvän är snäll.
give	ge	Ge mig boken.
glass	ett glas	Jag dricker ur ett glas.
go	gå	Vi går hem nu.
good	bra	Det här kaffet är bra.
goodbye	hej då	Hej då, vi ses i morgon.
grandfather	en farfar; en morfar	Min farfar är gammal.
grandmother	en farmor; en mormor	Min mormor lagar soppa.
grandparent	en mor- eller farförälder	En morförälder bor hos oss.
great	bra; stor	Det här är en bra idé.
green	grön	Dörren är grön.
grey	grå	Himlen är grå.
group	en grupp	Arbeta i en liten grupp.
grow	växa; odla	Växter växer i trädgården.
guess	gissa	Gissa svaret.
guitar	en gitarr	Han spelar gitarr.
gym	ett gym	Jag går till gymmet.
hair	hår	Hennes hår är långt.
half	en halv; hälften	Skär kakan i två delar.
hand	en hand	Räck upp handen.
happen	hända	Vad kommer att hända sedan?
happy	glad	Jag är glad i dag.
hard	hård; svår	Den här stolen är hård.
hat	en hatt; en mössa	Min mössa är svart.
hate	hata	Jag hatar kallt te.
have	ha	Jag har en bil.
have to modal	måste	Jag måste studera.
he	han	Han är min bror.
head	ett huvud	Mitt huvud gör ont.
health	hälsa	Bra mat hjälper hälsan.
healthy	hälsosam	Den här måltiden är hälsosam.
hear	höra	Jag hör musik.
hello	hej	Hej, trevligt att träffas.
help	hjälpa; hjälp	Hjälp mig, tack.
her	henne; hennes	Det här är hennes väska.
here	här	Kom hit nu.
hey	hej	Hej, vänta på mig.
hi	hej	Hej, hur mår du?
high	hög	Väggen är hög.
him	honom	Jag känner honom.
his	hans	Hans rock är blå.
history	historia	Jag studerar historia.
hobby	en hobby	Läsning är min hobby.
holiday	en semester; en helgdag	Vi tar semester i juli.
home	ett hem; hemma	Jag är hemma.
homework	läxa	Gör läxan i kväll.
hope	hoppas	Jag hoppas att du kommer.
horse	en häst	Hästen springer snabbt.
hospital	ett sjukhus	Sjukhuset ligger nära här.
hot	het; varm	Soppan är het.
hotel	ett hotell	Hotellet är rent.
hour	en timme	Vänta en timme.
house	ett hus	Det här huset är gammalt.
how	hur	Hur mår du?
however	dock; emellertid	Dock kan jag stanna här.
hundred	hundra	Hundra människor kom.
hungry	hungrig	Jag är hungrig.
husband	en man; en make	Hennes man är läkare.
I	jag	Jag tycker om te.
ice	is	Isen är kall.
ice cream	glass	Jag vill ha glass.
idea	en idé	Det där är en bra idé.
if	om	Ring mig om du behöver hjälp.
imagine	föreställa sig	Föreställ dig ett litet hus.
important	viktig	Den här lektionen är viktig.
improve	förbättra	Jag vill förbättra mig.
in	i	Nycklarna ligger i min väska.
include	inkludera; ta med	Ta med ditt namn, tack.
information	information	Jag behöver mer information.
interest	ett intresse	Hon har ett intresse för konst.
interested	intresserad	Jag är intresserad av musik.
interesting	intressant	Den här boken är intressant.
internet	internet	Internet är långsamt.
interview	en intervju	Jag har en intervju i dag.
into	in i	Lägg böckerna i väskan.
introduce	presentera	Presentera din vän, tack.
island	en ö	Den här ön är liten.
it	det	Det är kallt.
its	dess; sin	Hunden tycker om sin bädd.
jacket	en jacka	Min jacka är ny.
January	januari	Januari är den första månaden.
jeans	jeans	Mina jeans är blå.
job	ett jobb	Jag behöver ett nytt jobb.
join	gå med; delta	Gå med i vår klass i dag.
journey	en resa	Resan är lång.
juice	juice; saft	Jag dricker apelsinjuice.
July	juli	Vi reser i juli.
June	juni	Skolan slutar i juni.
just	bara; nyss	Jag behöver bara vatten.
keep	behålla; spara	Spara den här nyckeln.
key	en nyckel	Jag har tappat min nyckel.
kilometre	en kilometer	Gå en kilometer.
kind (type)	en sorts; ett slag	Vilken sorts musik tycker du om?
kitchen	ett kök	Köket är rent.
know	veta	Jag vet svaret.
land	land; mark	Planet står på marken.
language	ett språk	Engelska är ett språk.
large	stor	Det här rummet är stort.
last1 (final)	sista	Det här är den sista sidan.
late	sen	Bussen är sen.
later	senare	Vi ses senare.
laugh	skratta	Vi skrattar tillsammans.
learn	lära sig	Jag lär mig engelska.
leave	lämna; gå	Lämna dörren öppen.
left	vänster	Sväng vänster här.
leg	ett ben	Mitt ben gör ont.
lesson	en lektion	Lektionen börjar nu.
let	låta	Låt mig hjälpa dig.
letter	ett brev; en bokstav	Jag skriver ett brev.
library	ett bibliotek	Biblioteket öppnar klockan nio.
lie1	ligga	Lägg dig på sängen, tack.
life	ett liv	Stadslivet är hektiskt.
like (similar)	som; likna	Det är som ett spel.
like (find sb/sth pleasant)	tycka om	Jag tycker om den här sången.
line	en kö; en linje	Stå i kö.
lion	ett lejon	Lejonet sover.
list	en lista	Gör en inköpslista.
listen	lyssna	Lyssna på läraren.
little	lite; liten	Jag har lite pengar.
live1	bo	Jag bor nära skolan.
local	lokal	Det här är en lokal butik.
long1	lång	Vägen är lång.
look	titta; se ut	Titta på bilden.
lose	tappa; förlora	Tappa inte bort biljetten.
lot	mycket; en massa	Jag har mycket läxor.
love	kärlek; älska	Jag älskar min familj.
lunch	en lunch	Lunchen är klar.`;

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
  const lines = SV_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tSV\texample_SV") {
    throw new Error("Unexpected SV translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad SV translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad SV translation row ${index + 2}: empty field`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad SV example punctuation for ${sourceHeadword}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad SV Latin native orthography shape for ${sourceHeadword}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad SV non-Latin script leak for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate SV translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing SV translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`SV translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part002_support_translation_batch_sv_v1",
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
    SV: translation.display,
    example_SV: translation.example,
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
    "- Script-aware validation: SV Latin native orthography, Swedish article display support, sentence punctuation and non-Latin script leak guard",
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
