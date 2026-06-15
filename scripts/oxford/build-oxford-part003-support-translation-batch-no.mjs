#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "NO";
const BATCH_ID = "no_article_display_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-no.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const NO_TRANSLATIONS_TSV = `source_headword	NO	example_NO
machine	en maskin; et apparat	Maskinen lager kaffe.
magazine	et magasin; et tidsskrift	Magasinet ligger på bordet.
main	hoved-; viktigste	Dette er hovedinngangen.
make	lage; gjøre	Jeg lager lunsj hjemme.
man	en mann	Mannen er læreren min.
many	mange	Det er mange elever her.
map	et kart	Se på kartet.
March	mars	Bursdagen min er i mars.
market	et marked	Vi kjøper frukt på markedet.
married	gift	Søsteren min er gift.
May	mai	Skolen slutter i mai.
maybe	kanskje	Kanskje det regner senere.
me	meg	Hjelp meg, takk.
meal	et måltid	Måltidet er varmt.
mean	bety	Hva betyr skiltet?
meaning	en betydning	Hva er betydningen?
meat	kjøtt	Jeg spiser kjøtt til middag.
meet	møte	Vi møtes etter skolen.
meeting	et møte	Møtet begynner nå.
member	et medlem	Hun er medlem av klubben.
menu	en meny	Les menyen.
message	en melding	Jeg sender en kort melding.
metre	en meter	Gå en meter fram.
midnight	midnatt	Toget går ved midnatt.
mile	en engelsk mil	Vi går en engelsk mil.
milk	melk	Jeg drikker melk til frokost.
million	en million	En million mennesker bor her.
minute1	et minutt	Vent et minutt.
miss	savne; misse	Jeg savner den gamle skolen min.
mistake	en feil	Svaret har en feil.
model	en modell	Dette er en liten modell.
modern	moderne	Kjøkkenet er moderne.
moment	et øyeblikk	Vent et øyeblikk.
Monday	mandag	Vi begynner å jobbe på mandag.
money	penger	Jeg trenger litt penger.
month	en måned	Juni er en varm måned.
more	mer	Jeg trenger mer tid.
morning	en morgen	Jeg studerer om morgenen.
most	de fleste; mest	De fleste elever liker musikk.
mother	en mor; en mamma	Moren min jobber i dag.
mountain	et fjell	Fjellet er veldig høyt.
mouse	en mus	Det er en mus under stolen.
mouth	en munn	Åpne munnen.
move	flytte; bevege seg	Flytt stolen hit.
movie	en film	Vi ser en film i kveld.
much	mye; hvor mye	Hvor mye koster det?
mum	mamma	Mamma er hjemme.
museum	et museum	Museet åpner klokka ti.
music	musikk	Jeg lytter til musikk.
must modal	må	Du må stoppe her.
my	min; mitt	Dette er boken min.
name	et navn; navngi	Skriv navnet ditt her.
natural	naturlig	Denne juicen er naturlig.
near	nær	Banken ligger nær.
need	trenge	Jeg trenger en penn.
negative	negativ	Denne setningen er negativ.
neighbour	en nabo	Naboen min er vennlig.
never	aldri	Jeg drikker aldri kaffe.
new	ny	Denne telefonen er ny.
news	nyheter	Dagens nyheter er gode.
newspaper	en avis	Han leser en avis.
next	neste	Neste buss er sen.
next to	ved siden av	Sett deg ved siden av meg.
nice	hyggelig; fin	Rommet er hyggelig.
night	en natt	Jeg sover om natten.
nine	ni	Det er ni elever her.
nineteen	nitten	Hun er nitten år.
ninety	nitti	Bestefaren min er nitti år.
no	nei; ingen	Nei takk.
no one	ingen	Ingen er i rommet.
nobody	ingen	Ingen er hjemme.
north	nord	Stasjonen ligger i nord.
nose	en nese	Nesen min er kald.
not	ikke	Jeg er ikke trøtt.
note	et notat	Skriv et notat nå.
nothing	ingenting	Det er ingenting i boksen.
November	november	Kurset mitt begynner i november.
now	nå	Kom hit nå.
number	et nummer; et tall	Skriv nummeret her.
nurse	en sykepleier	Sykepleieren er snill.
object	en gjenstand	Legg gjenstanden på bordet.
o’clock	klokka	Timen begynner klokka ni.
October	oktober	Vi reiser i oktober.
of	av; fra	Dette er en kopp te.
off	av; borte	Slå av lyset.
office	et kontor	Kontoret mitt er lite.
often	ofte	Jeg går ofte til skolen.
oh	å; oi	Å, nå forstår jeg.
OK	greit; OK	Er dette greit?
old	gammel	Dette huset er gammelt.
on	på; påslått	Boken ligger på bordet.
once	en gang	Jeg ringer en gang i uken.
one	en; ett	Jeg har en søster.
onion	en løk	Skjær en løk.
online	på nett	Jeg studerer på nett.
only	bare	Jeg har bare en veske.
open	åpen; åpne	Åpne vinduet.
opinion	en mening	Hva er meningen din?
opposite	overfor; motsatt	Butikken ligger overfor banken.
or	eller	Te eller kaffe?
orange	en appelsin; oransje	Appelsinen er søt.
order	en bestilling; bestille	Jeg bestiller suppe.
other	annen	Bruk den andre døren.
our	vår; vårt	Dette er klassen vår.
out	ut; ute	Gå ut etter lunsj.
outside	ute; utenfor	Barna leker ute.
over	over	Flyet flyr over byen.
own	egen; eie	Jeg har mitt eget rom.
page	en side	Åpne side ti.
paint	maling; male	Mal veggen blå.
painting	et maleri	Maleriet er vakkert.
pair	et par	Jeg trenger et par sokker.
paper	papir	Skriv på dette papiret.
paragraph	et avsnitt	Les det første avsnittet.
parent	en forelder	En forelder venter utenfor.
park	en park; parkere	Vi parkerer nær stasjonen.
part	en del	Denne delen er lett.
partner	en partner; en makker	Arbeid med partneren din.
party	en fest	Festen begynner klokka sju.
passport	et pass	Vis passet ditt.
past	forbi; fortid	Klokka er halv sju.
pay	betale	Jeg betaler med kort.
pen	en penn	Denne pennen er blå.
pencil	en blyant	Jeg skriver med en blyant.
people	mennesker	Det er mange mennesker her.
pepper	pepper	Ha pepper i suppen.
perfect	perfekt	Svaret ditt er perfekt.
period	en periode; en time	Denne timen er kort.
person	en person	En person venter.
personal	personlig	Dette er min personlige telefon.
phone	en telefon; ringe	Telefonen min ligger i vesken.
photo	et bilde	Ta et bilde her.
photograph	et fotografi; fotografere	Bildet er gammelt.
phrase	en frase	Gjenta frasen.
piano	et piano	Hun spiller piano.
picture	et bilde	Se på bildet.
piece	en bit	Ta en bit kake.
pig	en gris	Grisen er på gården.
pink	rosa	Vesken hennes er rosa.
place	et sted; plassere	Stedet er rolig.
plan	en plan	Vi trenger en plan.
plane	et fly	Flyet er sent.
plant	en plante; plante	Vann planten i dag.
play	spille; leke	Barna leker i parken.
player	en spiller	Spilleren løper fort.
please	vær så snill; takk	Sitt her, takk.
point	et punkt	Punktet er viktig.
police	politi	Politiet er utenfor.
policeman	en politimann	Politimannen hjelper oss.
pool	et basseng	Bassenget er kaldt.
poor	fattig; stakkars	Det fattige barnet er sultent.
popular	populær	Denne sangen er populær.
positive	positiv	Dette er et positivt resultat.
possible	mulig	Er det mulig i dag?
post	et innlegg; post	Jeg leser innlegget hennes på nett.
potato	en potet	Jeg spiser en potet.
pound	et pund	Det koster et pund.
practice	øvelse; praksis	Øvelse hjelper hver dag.
practise	øve	Jeg øver på engelsk hver dag.
prefer	foretrekke	Jeg foretrekker te.
prepare	forberede	Forbered vesken i kveld.
present	til stede; en gave	Hun er til stede i dag.
pretty	pen; ganske	Hagen er pen.
price	en pris	Prisen er lav.
probably	sannsynligvis	Hun vet det sannsynligvis.
problem	et problem	Problemet er lite.
product	et produkt	Produktet er nytt.
programme	et program	Programmet begynner nå.
project	et prosjekt	Prosjektet vårt er klart.
purple	lilla	Skjorten er lilla.
put	legge; sette	Legg boken her.
quarter	et kvarter; en fjerdedel	Klokka er kvart over to.
question	et spørsmål	Still et spørsmål.
quick	rask; kort	Dette er en kort prøve.
quickly	raskt	Gå raskt.
quiet	stille	Biblioteket er stille.
quite	ganske	Rommet er ganske lite.
radio	en radio	Radioen er høy.
rain	regn; regne	Det begynner å regne nå.
read	lese	Les denne setningen.
reader	en leser	Leseren liker historien.
reading	lesing	Lesing hjelper meg å lære.
ready	klar	Middagen er klar.
real	ekte	Det finnes et ekte problem.
really	virkelig	Jeg liker virkelig denne sangen.
reason	en grunn	Fortell meg grunnen.
red	rød	Døren er rød.
relax	slappe av	Slapp av etter jobb.
remember	huske	Husk passet ditt.
repeat	gjenta	Gjenta setningen.
report	en rapport	Les rapporten i kveld.
restaurant	en restaurant	Restauranten er full.
result	et resultat	Resultatet er bra.
return	returnere; komme tilbake	Lever boken tilbake i morgen.
rice	ris	Jeg spiser ris til lunsj.
rich	rik	Denne byen er rik.
ride	sykle; en tur	Jeg sykler til skolen.
right	høyre; riktig	Sving til høyre her.
river	en elv	Elven er bred.
road	en vei	Veien er lang.
room	et rom	Rommet mitt er rent.
routine	en rutine	Rutinen min begynner tidlig.
rule	en regel	Regelen er enkel.
run	løpe	Jeg løper hver morgen.
sad	trist	Han er trist i dag.
salad	en salat	Salaten er fersk.
salt	salt	Tilsett litt salt.
same	samme	Vi har samme veske.
sandwich	en sandwich; et smørbrød	Jeg spiser et smørbrød.
Saturday	lørdag	Vi møtes på lørdag.
say	si	Si navnet ditt.
school	en skole	Skolen min ligger nær.
science	naturfag; vitenskap	Jeg lærer naturfag på skolen.
scientist	en forsker	Forskeren stiller et spørsmål.
sea	et hav	Havet er blått.
second1 (unit of time)	et sekund	Vent et sekund.
section	en seksjon; et avsnitt	Les dette avsnittet.
see	se; møte	Jeg ser vennen min.
sell	selge	De selger fersk frukt.
send	sende	Send en melding nå.
sentence	en setning	Skriv en setning.
September	september	Skolen begynner i september.
seven	sju	Det er sju mennesker her.
seventeen	sytten	Han er sytten år.
seventy	sytti	Bestemoren min er sytti år.
share	dele	Del kaken.
she	hun	Hun er søsteren min.
sheep	en sau	Sauen spiser gress.
shirt	en skjorte	Skjorten hans er ren.
shoe	en sko	En sko ligger under sengen.
shop	en butikk; handle	Butikken stenger tidlig.
shopping	handling	Det er gøy å handle i dag.
short	kort	Historien er kort.
should modal	burde	Du burde hvile i dag.
show	vise; et show	Vis meg billetten din.
shower	en dusj; dusje	Jeg tar en dusj.
sick	syk	Jeg føler meg syk i dag.
similar	lignende	Veskene våre er lignende.
sing	synge	Jeg synger i timen.
singer	en sanger; en sangerinne	Sangeren er kjent.
sister	en søster	Søsteren min er ung.
sit	sitte	Sitt ved vinduet.
situation	en situasjon	Situasjonen er ny.
six	seks	Seks bøker ligger her.
sixteen	seksten	Hun er seksten år.
sixty	seksti	Pappa er seksti år.
skill	en ferdighet	Ferdigheten er nyttig.
skirt	et skjørt	Skjørtet hennes er blått.
sleep	sove; søvn	Jeg sover åtte timer.
slow	langsom	Bussen er langsom.
small	liten	Rommet er lite.
snake	en slange	Slangen er lang.
snow	snø; snøvær	Denne vinteren snør det.
so	så; derfor	Jeg er trøtt, derfor hviler jeg.
some	noen; litt	Jeg trenger litt vann.
somebody	noen	Noen står ved døren.
someone	noen	Noen la igjen en melding.
something	noe	Jeg trenger noe å drikke.
sometimes	noen ganger	Noen ganger går jeg til skolen.
son	en sønn	Sønnen hennes er på skolen.
song	en sang	Sangen er ny.
soon	snart	Vi ses snart.
sorry	unnskyld	Unnskyld, jeg er sen.
sound	en lyd; høres ut	Lyden er høy.
soup	en suppe	Suppen er varm.
south	sør	Hotellet ligger i sør.
space	et rom; plass	Det er plass til en stol.
speak	snakke; tale	Snakk langsomt, takk.
special	spesiell	I dag er en spesiell dag.
spell	stave	Stav navnet ditt.
spelling	staving	Kontroller stavemåten.
spend	bruke; tilbringe	Jeg bruker penger på mat.
sport	en sport	Fotball er en populær sport.
spring	vår; hoppe	Blomster vokser om våren.
stand	stå	Stå ved døren.
star	en stjerne	Jeg ser en klar stjerne.
start	begynne	Begynn timen nå.
statement	en uttalelse	Uttalelsen er riktig.
station	en stasjon	Stasjonen ligger nær.
stay	bli; bo	Bli hjemme i dag.
still	fortsatt	Jeg er fortsatt sulten.
stop	stoppe; et stopp	Stopp ved hjørnet.
story	en historie	Fortell meg en historie.
street	en gate	Gaten er rolig.
strong	sterk	Han er sterk.
student	en student; en elev	Studenten leser en bok.
study	studere; en studie	Jeg studerer engelsk.
style	en stil	Jeg liker denne stilen.
subject	et fag; et emne	Engelsk er hovedfaget mitt.
success	suksess	Suksess krever øvelse.
sugar	sukker	Ha sukker i teen.
summer	sommer	Sommeren er varm her.
sun	sol	Solen skinner.
Sunday	søndag	Vi hviler på søndag.
supermarket	et supermarked	Supermarkedet er åpent.
sure	sikker	Jeg er sikker.
sweater	en genser	Genseren min er varm.
swim	svømme	Jeg svømmer hver uke.
swimming	svømming	Svømming er god øvelse.
table	et bord	Nøklene ligger på bordet.`;

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
      throw new Error(`Norwegian example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Norwegian display/example must contain Latin text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Norwegian display/example contains non-Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Norwegian translation row for ${sourceHeadword}`);
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
    "Generate DA support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after DA.",
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
    throw new Error("Usage: node scripts/oxford/build-oxford-part003-support-translation-batch-no.mjs --contract=<contract.json>");
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const outputPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_no_article_display_v1.jsonl";
  const summaryPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_no_article_display_v1_summary.md";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== "oxford_3000_core_a1_part_003_300_v1") {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(NO_TRANSLATIONS_TSV);

  if (rows.length !== 300) {
    throw new Error(`Expected 300 Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Norwegian translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Norwegian translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: included where useful for Norwegian Bokmal nouns
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: NO Latin-script display/example cells and no non-Latin script leakage
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
