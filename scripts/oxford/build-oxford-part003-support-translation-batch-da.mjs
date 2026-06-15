#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "DA";
const BATCH_ID = "da_article_display_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-da.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const DA_TRANSLATIONS_TSV = `source_headword	DA	example_DA
machine	en maskine; et apparat	Maskinen laver kaffe.
magazine	et blad; et magasin	Bladet ligger på bordet.
main	hoved-; vigtigste	Dette er hovedindgangen.
make	lave; gøre	Jeg laver frokost hjemme.
man	en mand	Manden er min lærer.
many	mange	Der er mange elever her.
map	et kort	Se på kortet.
March	marts	Min fødselsdag er i marts.
market	et marked	Vi køber frugt på markedet.
married	gift	Min søster er gift.
May	maj	Skolen slutter i maj.
maybe	måske	Måske regner det senere.
me	mig	Hjælp mig, tak.
meal	et måltid	Måltidet er varmt.
mean	betyde	Hvad betyder skiltet?
meaning	en betydning	Hvad er betydningen?
meat	kød	Jeg spiser kød til aftensmad.
meet	møde	Vi mødes efter skole.
meeting	et møde	Mødet begynder nu.
member	et medlem	Hun er medlem af klubben.
menu	en menu	Læs menuen.
message	en besked	Jeg sender en kort besked.
metre	en meter	Gå en meter frem.
midnight	midnat	Toget kører ved midnat.
mile	en mile	Vi går en mile.
milk	mælk	Jeg drikker mælk til morgenmad.
million	en million	En million mennesker bor her.
minute1	et minut	Vent et minut.
miss	savne; misse	Jeg savner min gamle skole.
mistake	en fejl	Svaret har en fejl.
model	en model	Dette er en lille model.
modern	moderne	Køkkenet er moderne.
moment	et øjeblik	Vent et øjeblik.
Monday	mandag	Vi begynder at arbejde mandag.
money	penge	Jeg har brug for lidt penge.
month	en måned	Juni er en varm måned.
more	mere	Jeg har brug for mere tid.
morning	en morgen	Jeg studerer om morgenen.
most	de fleste; mest	De fleste elever kan lide musik.
mother	en mor	Min mor arbejder i dag.
mountain	et bjerg	Bjerget er meget højt.
mouse	en mus	Der er en mus under stolen.
mouth	en mund	Åbn munden.
move	flytte; bevæge sig	Flyt stolen hertil.
movie	en film	Vi ser en film i aften.
much	meget; hvor meget	Hvor meget koster det?
mum	mor	Mor er hjemme.
museum	et museum	Museet åbner klokken ti.
music	musik	Jeg lytter til musik.
must modal	skal	Du skal stoppe her.
my	min; mit	Dette er min bog.
name	et navn; navngive	Skriv dit navn her.
natural	naturlig	Denne juice er naturlig.
near	nær; tæt på	Banken ligger tæt på.
need	have brug for	Jeg har brug for en pen.
negative	negativ	Denne sætning er negativ.
neighbour	en nabo	Min nabo er venlig.
never	aldrig	Jeg drikker aldrig kaffe.
new	ny	Denne telefon er ny.
news	nyheder	Dagens nyheder er gode.
newspaper	en avis	Han læser en avis.
next	næste	Næste bus er sen.
next to	ved siden af	Sæt dig ved siden af mig.
nice	rar; hyggelig	Rummet er hyggeligt.
night	en nat	Jeg sover om natten.
nine	ni	Der er ni elever her.
nineteen	nitten	Hun er nitten år.
ninety	halvfems	Min morfar er halvfems år.
no	nej; ingen	Nej tak.
no one	ingen	Ingen er i rummet.
nobody	ingen	Ingen er hjemme.
north	nord	Stationen ligger mod nord.
nose	en næse	Min næse er kold.
not	ikke	Jeg er ikke træt.
note	et notat	Skriv et notat nu.
nothing	ingenting	Der er ingenting i kassen.
November	november	Mit kursus begynder i november.
now	nu	Kom her nu.
number	et nummer; et tal	Skriv nummeret her.
nurse	en sygeplejerske	Sygeplejersken er venlig.
object	en genstand	Læg genstanden på bordet.
o’clock	klokken	Timen begynder klokken ni.
October	oktober	Vi rejser i oktober.
of	af	Dette er en kop te.
off	slået fra; væk	Sluk lyset.
office	et kontor	Mit kontor er lille.
often	ofte	Jeg går ofte i skole.
oh	åh	Åh, nu forstår jeg.
OK	okay	Er dette okay?
old	gammel	Dette hus er gammelt.
on	på; tændt	Bogen ligger på bordet.
once	en gang	Jeg ringer en gang om ugen.
one	en; et	Jeg har en søster.
onion	et løg	Skær et løg.
online	online	Jeg studerer online.
only	kun	Jeg har kun en taske.
open	åben; åbne	Åbn vinduet.
opinion	en mening	Hvad er din mening?
opposite	overfor; modsat	Butikken ligger overfor banken.
or	eller	Te eller kaffe?
orange	en appelsin; orange	Appelsinen er sød.
order	en bestilling; bestille	Jeg bestiller suppe.
other	anden; andet	Brug den anden dør.
our	vores	Dette er vores klasse.
out	ud; ude	Gå ud efter frokost.
outside	udenfor; ude	Børnene leger udenfor.
over	over	Flyet flyver over byen.
own	egen; eje	Jeg har mit eget værelse.
page	en side	Åbn side ti.
paint	maling; male	Mal væggen blå.
painting	et maleri	Maleriet er smukt.
pair	et par	Jeg har brug for et par sokker.
paper	papir	Skriv på dette papir.
paragraph	et afsnit	Læs det første afsnit.
parent	en forælder	En forælder venter udenfor.
park	en park; parkere	Vi parkerer nær stationen.
part	en del	Denne del er let.
partner	en partner; en makker	Arbejd med din partner.
party	en fest	Festen begynder klokken syv.
passport	et pas	Vis dit pas.
past	fortid; over	Klokken er halv syv.
pay	betale	Jeg betaler med kort.
pen	en pen	Denne pen er blå.
pencil	en blyant	Jeg skriver med en blyant.
people	mennesker	Der er mange mennesker her.
pepper	peber	Kom peber i suppen.
perfect	perfekt	Dit svar er perfekt.
period	en periode; en time	Denne time er kort.
person	en person	En person venter.
personal	personlig	Dette er min personlige telefon.
phone	en telefon; ringe	Min telefon ligger i tasken.
photo	et foto	Tag et foto her.
photograph	et fotografi; fotografere	Billedet er gammelt.
phrase	en frase	Gentag frasen.
piano	et klaver	Hun spiller klaver.
picture	et billede	Se på billedet.
piece	et stykke	Tag et stykke kage.
pig	en gris	Grisen er på gården.
pink	lyserød	Hendes taske er lyserød.
place	et sted; placere	Stedet er roligt.
plan	en plan	Vi har brug for en plan.
plane	et fly	Flyet er forsinket.
plant	en plante; plante	Vand planten i dag.
play	spille; lege	Børnene leger i parken.
player	en spiller	Spilleren løber hurtigt.
please	vær venlig; tak	Sæt dig her, tak.
point	et punkt	Punktet er vigtigt.
police	politi	Politiet er udenfor.
policeman	en politimand	Politimanden hjælper os.
pool	en pool; et bassin	Poolen er kold.
poor	fattig; stakkels	Det fattige barn er sultent.
popular	populær	Denne sang er populær.
positive	positiv	Dette er et positivt resultat.
possible	mulig	Er det muligt i dag?
post	et opslag; post	Jeg læser hendes opslag online.
potato	en kartoffel	Jeg spiser en kartoffel.
pound	et pund	Det koster et pund.
practice	øvelse; praksis	Øvelse hjælper hver dag.
practise	øve	Jeg øver engelsk hver dag.
prefer	foretrække	Jeg foretrækker te.
prepare	forberede	Forbered tasken i aften.
present	til stede; en gave	Hun er til stede i dag.
pretty	smuk; ret	Haven er smuk.
price	en pris	Prisen er lav.
probably	sandsynligvis	Hun ved det sandsynligvis.
problem	et problem	Problemet er lille.
product	et produkt	Produktet er nyt.
programme	et program	Programmet begynder nu.
project	et projekt	Vores projekt er færdigt.
purple	lilla	Skjorten er lilla.
put	lægge; sætte	Læg bogen her.
quarter	et kvarter; en fjerdedel	Klokken er kvart over to.
question	et spørgsmål	Stil et spørgsmål.
quick	hurtig; kort	Dette er en kort prøve.
quickly	hurtigt	Gå hurtigt.
quiet	stille	Biblioteket er stille.
quite	ret; ganske	Rummet er ret lille.
radio	en radio	Radioen er høj.
rain	regn; regne	Det begynder at regne nu.
read	læse	Læs denne sætning.
reader	en læser	Læseren kan lide historien.
reading	læsning	Læsning hjælper mig med at lære.
ready	klar	Aftensmaden er klar.
real	ægte; virkelig	Der er et ægte problem.
really	virkelig	Jeg kan virkelig lide denne sang.
reason	en grund	Fortæl mig grunden.
red	rød	Døren er rød.
relax	slappe af	Slap af efter arbejde.
remember	huske	Husk dit pas.
repeat	gentage	Gentag sætningen.
report	en rapport	Læs rapporten i aften.
restaurant	en restaurant	Restauranten er fuld.
result	et resultat	Resultatet er godt.
return	vende tilbage; aflevere	Aflever bogen i morgen.
rice	ris	Jeg spiser ris til frokost.
rich	rig	Denne by er rig.
ride	cykle; en tur	Jeg cykler til skole.
right	højre; rigtig	Drej til højre her.
river	en flod	Floden er bred.
road	en vej	Vejen er lang.
room	et værelse; et rum	Mit værelse er rent.
routine	en rutine	Min rutine begynder tidligt.
rule	en regel	Reglen er enkel.
run	løbe	Jeg løber hver morgen.
sad	trist	Han er trist i dag.
salad	en salat	Salaten er frisk.
salt	salt	Tilsæt lidt salt.
same	samme	Vi har den samme taske.
sandwich	en sandwich	Jeg spiser en sandwich.
Saturday	lørdag	Vi mødes på lørdag.
say	sige	Sig dit navn.
school	en skole	Min skole ligger tæt på.
science	naturvidenskab	Jeg lærer naturvidenskab i skolen.
scientist	en forsker	Forskeren stiller et spørgsmål.
sea	et hav	Havet er blåt.
second1 (unit of time)	et sekund	Vent et sekund.
section	en sektion; et afsnit	Læs dette afsnit.
see	se; møde	Jeg ser min ven.
sell	sælge	De sælger frisk frugt.
send	sende	Send en besked nu.
sentence	en sætning	Skriv en sætning.
September	september	Skolen begynder i september.
seven	syv	Der er syv mennesker her.
seventeen	sytten	Han er sytten år.
seventy	halvfjerds	Min mormor er halvfjerds år.
share	dele	Del kagen.
she	hun	Hun er min søster.
sheep	et får	Fåret spiser græs.
shirt	en skjorte	Hans skjorte er ren.
shoe	en sko	En sko ligger under sengen.
shop	en butik; handle	Butikken lukker tidligt.
shopping	indkøb	Det er sjovt at handle i dag.
short	kort	Historien er kort.
should modal	burde	Du burde hvile i dag.
show	vise; et show	Vis mig din billet.
shower	et brusebad; gå i bad	Jeg tager et brusebad.
sick	syg	Jeg føler mig syg i dag.
similar	lignende	Vores tasker er lignende.
sing	synge	Jeg synger i timen.
singer	en sanger; en sangerinde	Sangeren er kendt.
sister	en søster	Min søster er ung.
sit	sidde	Sid ved vinduet.
situation	en situation	Situationen er ny.
six	seks	Seks bøger ligger her.
sixteen	seksten	Hun er seksten år.
sixty	tres	Min far er tres år.
skill	en færdighed	Færdigheden er nyttig.
skirt	en nederdel	Hendes nederdel er blå.
sleep	sove; søvn	Jeg sover otte timer.
slow	langsom	Bussen er langsom.
small	lille	Rummet er lille.
snake	en slange	Slangen er lang.
snow	sne; snevejr	Det sner om vinteren.
so	så; derfor	Jeg er træt, derfor hviler jeg.
some	nogle; lidt	Jeg har brug for lidt vand.
somebody	nogen	Nogen står ved døren.
someone	nogen	Nogen efterlod en besked.
something	noget	Jeg har brug for noget at drikke.
sometimes	nogle gange	Nogle gange går jeg i skole.
son	en søn	Hendes søn er i skole.
song	en sang	Sangen er ny.
soon	snart	Vi ses snart.
sorry	undskyld	Undskyld, jeg er sent på den.
sound	en lyd; lyde	Lyden er høj.
soup	en suppe	Suppen er varm.
south	syd	Hotellet ligger mod syd.
space	et rum; plads	Der er plads til en stol.
speak	tale; snakke	Tal langsomt, tak.
special	speciel	I dag er en speciel dag.
spell	stave	Stav dit navn.
spelling	stavning	Kontroller stavningen.
spend	bruge; tilbringe	Jeg bruger penge på mad.
sport	en sport	Fodbold er en populær sport.
spring	forår; hoppe	Blomster vokser om foråret.
stand	stå	Stå ved døren.
star	en stjerne	Jeg ser en klar stjerne.
start	starte; begynde	Begynd timen nu.
statement	en udtalelse	Udtalelsen er rigtig.
station	en station	Stationen ligger tæt på.
stay	blive; bo	Bliv hjemme i dag.
still	stadig	Jeg er stadig sulten.
stop	stoppe; et stop	Stop ved hjørnet.
story	en historie	Fortæl mig en historie.
street	en gade	Gaden er rolig.
strong	stærk	Han er stærk.
student	en studerende; en elev	Studenten læser en bog.
study	studere; et studie	Jeg studerer engelsk.
style	en stil	Jeg kan lide denne stil.
subject	et fag; et emne	Engelsk er mit hovedfag.
success	succes	Succes kræver øvelse.
sugar	sukker	Kom sukker i teen.
summer	sommer	Sommeren er varm her.
sun	sol	Solen skinner.
Sunday	søndag	Vi hviler på søndag.
supermarket	et supermarked	Supermarkedet er åbent.
sure	sikker	Jeg er sikker.
sweater	en trøje	Min trøje er varm.
swim	svømme	Jeg svømmer hver uge.
swimming	svømning	Svømning er god øvelse.
table	et bord	Nøglerne ligger på bordet.`;

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
      throw new Error(`Danish example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Danish display/example must contain Latin text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Danish display/example contains non-Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Danish translation row for ${sourceHeadword}`);
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
    "Generate FI support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after FI.",
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
    throw new Error("Usage: node scripts/oxford/build-oxford-part003-support-translation-batch-da.mjs --contract=<contract.json>");
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const outputPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_da_article_display_v1.jsonl";
  const summaryPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_da_article_display_v1_summary.md";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== "oxford_3000_core_a1_part_003_300_v1") {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(DA_TRANSLATIONS_TSV);

  if (rows.length !== 300) {
    throw new Error(`Expected 300 Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Danish translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Danish translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: included where useful for Danish nouns
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: DA Latin-script display/example cells and no non-Latin script leakage
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
