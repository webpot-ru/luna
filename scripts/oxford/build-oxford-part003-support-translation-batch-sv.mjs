#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "SV";
const BATCH_ID = "sv_article_display_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-sv.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const SV_TRANSLATIONS_TSV = `source_headword	SV	example_SV
machine	en maskin; en apparat	Maskinen gör kaffe.
magazine	en tidskrift	Tidningen ligger på bordet.
main	huvud-; viktigaste	Det här är huvudingången.
make	göra; laga	Jag lagar lunch hemma.
man	en man	Mannen är min lärare.
many	många	Det finns många elever här.
map	en karta	Titta på kartan.
March	mars	Min födelsedag är i mars.
market	en marknad	Vi köper frukt på marknaden.
married	gift	Min syster är gift.
May	maj	Skolan slutar i maj.
maybe	kanske	Kanske regnar det senare.
me	mig	Hjälp mig, tack.
meal	en måltid	Måltiden är varm.
mean	betyda	Vad betyder skylten?
meaning	en betydelse	Vad är betydelsen?
meat	kött	Jag äter kött till middag.
meet	träffa	Vi träffas efter skolan.
meeting	ett möte	Mötet börjar nu.
member	en medlem	Hon är medlem i klubben.
menu	en meny	Läs menyn.
message	ett meddelande	Jag skickar ett kort meddelande.
metre	en meter	Gå en meter framåt.
midnight	midnatt	Tåget går vid midnatt.
mile	en engelsk mil	Vi går en engelsk mil.
milk	mjölk	Jag dricker mjölk till frukost.
million	en miljon	En miljon människor bor här.
minute1	en minut	Vänta en minut.
miss	sakna; missa	Jag saknar min gamla skola.
mistake	ett misstag	Svaret har ett misstag.
model	en modell	Det här är en liten modell.
modern	modern	Köket är modernt.
moment	ett ögonblick	Vänta ett ögonblick.
Monday	måndag	Vi börjar arbeta på måndag.
money	pengar	Jag behöver lite pengar.
month	en månad	Juni är en varm månad.
more	mer	Jag behöver mer tid.
morning	en morgon	Jag studerar på morgonen.
most	de flesta; mest	De flesta elever gillar musik.
mother	en mamma; en mor	Min mamma arbetar i dag.
mountain	ett berg	Berget är mycket högt.
mouse	en mus	Det finns en mus under stolen.
mouth	en mun	Öppna munnen.
move	flytta; röra sig	Flytta stolen hit.
movie	en film	Vi ser en film i kväll.
much	mycket; hur mycket	Hur mycket kostar det?
mum	mamma	Mamma är hemma.
museum	ett museum	Museet öppnar klockan tio.
music	musik	Jag lyssnar på musik.
must modal	måste	Du måste stanna här.
my	min; mitt	Det här är min bok.
name	ett namn; namnge	Skriv ditt namn här.
natural	naturlig	Den här juicen är naturlig.
near	nära	Banken ligger nära.
need	behöva	Jag behöver en penna.
negative	negativ	Den här meningen är negativ.
neighbour	en granne	Min granne är vänlig.
never	aldrig	Jag dricker aldrig kaffe.
new	ny	Den här telefonen är ny.
news	nyheter	Dagens nyheter är goda.
newspaper	en tidning	Han läser en tidning.
next	nästa	Nästa buss är sen.
next to	bredvid	Sätt dig bredvid mig.
nice	trevlig; fin	Rummet är trevligt.
night	en natt	Jag sover på natten.
nine	nio	Det finns nio elever här.
nineteen	nitton	Hon är nitton år.
ninety	nittio	Min morfar är nittio år.
no	nej; ingen	Nej, tack.
no one	ingen	Ingen är i rummet.
nobody	ingen	Ingen är hemma.
north	norr	Stationen ligger i norr.
nose	en näsa	Min näsa är kall.
not	inte	Jag är inte trött.
note	en anteckning	Skriv en anteckning nu.
nothing	ingenting	Det finns ingenting i lådan.
November	november	Min kurs börjar i november.
now	nu	Kom hit nu.
number	ett nummer; ett tal	Skriv numret här.
nurse	en sjuksköterska	Sjuksköterskan är snäll.
object	ett föremål	Lägg föremålet på bordet.
o’clock	klockan	Lektionen börjar klockan nio.
October	oktober	Vi reser i oktober.
of	av; från	Det här är en kopp te.
off	av; borta	Släck lampan.
office	ett kontor	Mitt kontor är litet.
often	ofta	Jag går ofta till skolan.
oh	oj; åh	Åh, nu förstår jag.
OK	okej	Är det här okej?
old	gammal	Det här huset är gammalt.
on	på; påslagen	Boken ligger på bordet.
once	en gång	Jag ringer en gång i veckan.
one	en; ett	Jag har en syster.
onion	en lök	Skär en lök.
online	online	Jag studerar online.
only	bara	Jag har bara en väska.
open	öppen; öppna	Öppna fönstret.
opinion	en åsikt	Vad är din åsikt?
opposite	mittemot; motsatt	Butiken ligger mittemot banken.
or	eller	Te eller kaffe?
orange	en apelsin; orange	Apelsinen är söt.
order	en beställning; beställa	Jag beställer soppa.
other	annan	Använd den andra dörren.
our	vår; vårt	Det här är vår klass.
out	ut; ute	Gå ut efter lunch.
outside	utanför; ute	Barnen leker ute.
over	över	Flygplanet flyger över staden.
own	egen; äga	Jag har ett eget rum.
page	en sida	Öppna sidan tio.
paint	färg; måla	Måla väggen blå.
painting	en målning	Målningen är vacker.
pair	ett par	Jag behöver ett par strumpor.
paper	papper	Skriv på det här papperet.
paragraph	ett stycke	Läs första stycket.
parent	en förälder	En förälder väntar utanför.
park	en park; parkera	Vi parkerar nära stationen.
part	en del	Den här delen är lätt.
partner	en partner; en kamrat	Arbeta med din partner.
party	en fest	Festen börjar klockan sju.
passport	ett pass	Visa ditt pass.
past	förfluten; över	Klockan är halv sju.
pay	betala	Jag betalar med kort.
pen	en penna	Pennan är blå.
pencil	en blyertspenna	Jag skriver med en blyertspenna.
people	människor	Det finns många människor här.
pepper	peppar	Lägg peppar i soppan.
perfect	perfekt	Ditt svar är perfekt.
period	en period; en lektion	Lektionen är kort.
person	en person	En person väntar.
personal	personlig	Det här är min personliga telefon.
phone	en telefon; ringa	Min telefon ligger i väskan.
photo	ett foto	Ta ett foto här.
photograph	ett fotografi; fotografera	Fotot är gammalt.
phrase	en fras	Upprepa frasen.
piano	ett piano	Hon spelar piano.
picture	en bild	Titta på bilden.
piece	en bit	Ta en bit kaka.
pig	en gris	Grisen är på gården.
pink	rosa	Hennes väska är rosa.
place	en plats; placera	Platsen är lugn.
plan	en plan	Vi behöver en plan.
plane	ett flygplan	Flygplanet är sent.
plant	en växt; plantera	Vattna växten i dag.
play	spela; leka	Barnen leker i parken.
player	en spelare	Spelaren springer snabbt.
please	snälla; tack	Sitt här, tack.
point	en punkt	Punkten är viktig.
police	polis	Polisen är utanför.
policeman	en polis	Polisen hjälper oss.
pool	en bassäng	Poolen är kall.
poor	fattig; stackars	Det fattiga barnet är hungrigt.
popular	populär	Den här sången är populär.
positive	positiv	Det här är ett positivt resultat.
possible	möjlig	Är det möjligt i dag?
post	ett inlägg; post	Jag läser hennes inlägg online.
potato	en potatis	Jag äter en potatis.
pound	ett pund	Det kostar ett pund.
practice	övning; praktik	Övning hjälper varje dag.
practise	öva	Jag övar engelska varje dag.
prefer	föredra	Jag föredrar te.
prepare	förbereda	Förbered väskan i kväll.
present	närvarande; en present	Hon är närvarande i dag.
pretty	vacker; ganska	Trädgården är vacker.
price	ett pris	Priset är lågt.
probably	förmodligen	Hon vet förmodligen.
problem	ett problem	Problemet är litet.
product	en produkt	Produkten är ny.
programme	ett program	Programmet börjar nu.
project	ett projekt	Vårt projekt är klart.
purple	lila	Skjortan är lila.
put	lägga; sätta	Lägg boken här.
quarter	en kvart; en fjärdedel	Klockan är kvart över två.
question	en fråga	Ställ en fråga.
quick	snabb; kort	Det här är ett kort prov.
quickly	snabbt	Gå snabbt.
quiet	tyst	Biblioteket är tyst.
quite	ganska	Rummet är ganska litet.
radio	en radio	Radion är högljudd.
rain	regn; regna	Det börjar regna nu.
read	läsa	Läs den här meningen.
reader	en läsare	Läsaren gillar berättelsen.
reading	läsning	Läsning hjälper mig att lära.
ready	klar	Middagen är klar.
real	verklig	Det finns ett verkligt problem.
really	verkligen	Jag gillar verkligen den här sången.
reason	en anledning	Berätta anledningen för mig.
red	röd	Dörren är röd.
relax	koppla av	Koppla av efter jobbet.
remember	komma ihåg	Kom ihåg ditt pass.
repeat	upprepa	Upprepa meningen.
report	en rapport	Läs rapporten i kväll.
restaurant	en restaurang	Restaurangen är full.
result	ett resultat	Resultatet är bra.
return	återvända; lämna tillbaka	Lämna tillbaka boken i morgon.
rice	ris	Jag äter ris till lunch.
rich	rik	Den här staden är rik.
ride	cykla; en tur	Jag cyklar till skolan.
right	höger; rätt	Sväng höger här.
river	en flod	Floden är bred.
road	en väg	Vägen är lång.
room	ett rum	Mitt rum är rent.
routine	en rutin	Min rutin börjar tidigt.
rule	en regel	Regeln är enkel.
run	springa	Jag springer varje morgon.
sad	ledsen	Han är ledsen i dag.
salad	en sallad	Salladen är färsk.
salt	salt	Tillsätt lite salt.
same	samma	Vi har samma väska.
sandwich	en smörgås	Jag äter en smörgås.
Saturday	lördag	Vi träffas på lördag.
say	säga	Säg ditt namn.
school	en skola	Min skola ligger nära.
science	naturvetenskap	Jag lär mig naturvetenskap i skolan.
scientist	en forskare	Forskaren ställer en fråga.
sea	ett hav	Havet är blått.
second1 (unit of time)	en sekund	Vänta en sekund.
section	en sektion; ett avsnitt	Läs det här avsnittet.
see	se; träffa	Jag ser min vän.
sell	sälja	De säljer färsk frukt.
send	skicka	Skicka ett meddelande nu.
sentence	en mening	Skriv en mening.
September	september	Skolan börjar i september.
seven	sju	Det finns sju människor här.
seventeen	sjutton	Han är sjutton år.
seventy	sjuttio	Min mormor är sjuttio år.
share	dela	Dela kakan.
she	hon	Hon är min syster.
sheep	ett får	Fåret äter gräs.
shirt	en skjorta	Hans skjorta är ren.
shoe	en sko	En sko ligger under sängen.
shop	en affär; handla	Affären stänger tidigt.
shopping	shopping; handlande	Det är roligt att handla i dag.
short	kort	Berättelsen är kort.
should modal	borde	Du borde vila i dag.
show	visa; en show	Visa mig din biljett.
shower	en dusch; duscha	Jag tar en dusch.
sick	sjuk	Jag känner mig sjuk i dag.
similar	liknande	Våra väskor är liknande.
sing	sjunga	Jag sjunger på lektionen.
singer	en sångare; en sångerska	Sångerskan är känd.
sister	en syster	Min syster är ung.
sit	sitta	Sitt vid fönstret.
situation	en situation	Situationen är ny.
six	sex	Sex böcker ligger här.
sixteen	sexton	Hon är sexton år.
sixty	sextio	Min pappa är sextio år.
skill	en färdighet	Färdigheten är nyttig.
skirt	en kjol	Hennes kjol är blå.
sleep	sova; sömn	Jag sover åtta timmar.
slow	långsam	Bussen är långsam.
small	liten	Rummet är litet.
snake	en orm	Ormen är lång.
snow	snö; snöa	Det snöar på vintern.
so	så; därför	Jag är trött, därför vilar jag.
some	några; lite	Jag behöver lite vatten.
somebody	någon	Någon står vid dörren.
someone	någon	Någon lämnade ett meddelande.
something	något	Jag behöver något att dricka.
sometimes	ibland	Ibland går jag till skolan.
son	en son	Hennes son är i skolan.
song	en sång	Sången är ny.
soon	snart	Vi ses snart.
sorry	förlåt	Förlåt, jag är sen.
sound	ett ljud; låta	Ljudet är högt.
soup	en soppa	Soppan är het.
south	söder	Hotellet ligger i söder.
space	ett utrymme; rymd	Det finns plats för en stol.
speak	tala	Tala långsamt, tack.
special	speciell	I dag är en speciell dag.
spell	stava	Stava ditt namn.
spelling	stavning	Kontrollera stavningen.
spend	spendera; tillbringa	Jag spenderar pengar på mat.
sport	en sport	Fotboll är en populär sport.
spring	vår; hoppa	Blommor växer på våren.
stand	stå	Stå vid dörren.
star	en stjärna	Jag ser en klar stjärna.
start	börja	Börja lektionen nu.
statement	ett uttalande	Uttalandet är korrekt.
station	en station	Stationen ligger nära.
stay	stanna	Stanna hemma i dag.
still	fortfarande	Jag är fortfarande hungrig.
stop	stanna; en hållplats	Stanna vid hörnet.
story	en berättelse	Berätta en berättelse för mig.
street	en gata	Gatan är lugn.
strong	stark	Han är stark.
student	en student; en elev	Studenten läser en bok.
study	studera; en studie	Jag studerar engelska.
style	en stil	Jag gillar den här stilen.
subject	ett ämne	Engelska är mitt huvudämne.
success	framgång	Framgång kräver övning.
sugar	socker	Lägg socker i teet.
summer	sommar	Sommaren är varm här.
sun	sol	Solen skiner.
Sunday	söndag	Vi vilar på söndag.
supermarket	en stormarknad	Stormarknaden är öppen.
sure	säker	Jag är säker.
sweater	en tröja	Min tröja är varm.
swim	simma	Jag simmar varje vecka.
swimming	simning	Simning är bra övning.
table	ett bord	Nycklarna ligger på bordet.`;

function parseArgs() {
  const args = new Map();
  const argv = process.argv.slice(2);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const equalsMatch = arg.match(/^--([^=]+)=(.*)$/u);
    if (equalsMatch) {
      args.set(equalsMatch[1], equalsMatch[2]);
      continue;
    }
    const keyMatch = arg.match(/^--(.+)$/u);
    if (!keyMatch) continue;
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${arg}`);
    }
    args.set(keyMatch[1], value);
    index += 1;
  }
  return args;
}

function parseTsv(tsv) {
  const [headerLine, ...lines] = tsv.trim().split(/\r?\n/u);
  if (headerLine !== `source_headword\t${LANGUAGE}\texample_${LANGUAGE}`) {
    throw new Error(`Unexpected TSV header: ${headerLine}`);
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
      throw new Error(`Swedish example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Swedish display/example must contain Latin text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Swedish display/example contains non-Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Swedish translation row for ${sourceHeadword}`);
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
    article_display_included: true,
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
    article_display_included: true,
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
    "Generate NO support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after NO.",
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
    throw new Error("Usage: node scripts/oxford/build-oxford-part003-support-translation-batch-sv.mjs --contract=<contract.json>");
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const outputPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_sv_article_display_v1.jsonl";
  const summaryPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_sv_article_display_v1_summary.md";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== "oxford_3000_core_a1_part_003_300_v1") {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(SV_TRANSLATIONS_TSV);

  if (rows.length !== 300) {
    throw new Error(`Expected 300 Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Swedish translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Swedish translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: included where useful for Swedish nouns
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: SV Latin-script display/example cells and no non-Latin script leakage
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
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
