#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "NL";
const BATCH_ID = "nl_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-nl.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const NL_TRANSLATIONS_TSV = `source_headword	NL	example_NL
machine	de machine; het apparaat	Deze machine maakt koffie.
magazine	het tijdschrift	Zij leest een muziektijdschrift.
main	hoofd-; belangrijkste	Dit is de hoofdingang.
make	maken; klaarmaken	Ik maak lunch thuis.
man	de man	Die man is mijn leraar.
many	veel	Er zijn veel leerlingen hier.
map	de kaart	Kijk naar de kaart.
March	maart	Mijn verjaardag is in maart.
market	de markt	Wij kopen fruit op de markt.
married	getrouwd	Mijn zus is getrouwd.
May	mei	De school eindigt in mei.
maybe	misschien	Misschien gaat het regenen.
me	mij; me	Help mij, alstublieft.
meal	de maaltijd	Deze maaltijd is warm.
mean	betekenen	Wat betekent dit bord?
meaning	de betekenis	Wat is de betekenis?
meat	het vlees	Ik eet vlees bij het avondeten.
meet	ontmoeten	Wij ontmoeten elkaar na school.
meeting	de vergadering	De vergadering begint nu.
member	het lid	Zij is lid van de club.
menu	het menu	Lees het menu.
message	het bericht	Ik stuur een kort bericht.
metre	de meter	Loop één meter naar voren.
midnight	de middernacht	De trein vertrekt om middernacht.
mile	de mijl	Wij lopen één mijl.
milk	de melk	Ik drink melk bij het ontbijt.
million	het miljoen	Een miljoen mensen wonen hier.
minute1	de minuut	Wacht één minuut.
miss	missen	Ik mis mijn oude school.
mistake	de fout	Dit antwoord heeft één fout.
model	het model	Dit is een klein model.
modern	modern	De keuken is modern.
moment	het moment; de minuut	Wacht even een moment.
Monday	maandag	Wij beginnen maandag met werken.
money	het geld	Ik heb wat geld nodig.
month	de maand	Juni is een warme maand.
more	meer	Ik heb meer tijd nodig.
morning	de ochtend	Ik studeer in de ochtend.
most	de meeste; meest	De meeste leerlingen houden van muziek.
mother	de moeder	Mijn moeder werkt vandaag.
mountain	de berg	Die berg is erg hoog.
mouse	de muis	Er zit een muis onder de stoel.
mouth	de mond	Open je mond.
move	bewegen; verplaatsen	Verplaats de stoel hierheen.
movie	de film	Wij kijken vanavond een film.
much	veel; hoeveel	Hoeveel kost dit?
mum	de mama; de moeder	Mama is thuis.
museum	het museum	Het museum gaat om tien uur open.
music	de muziek	Ik luister naar muziek.
must modal	moeten	Je moet hier stoppen.
my	mijn	Dit is mijn boek.
name	de naam; noemen	Schrijf je naam hier.
natural	natuurlijk	Dit sap is natuurlijk.
near	dichtbij	De bank is dichtbij.
need	nodig hebben	Ik heb een pen nodig.
negative	negatief	Deze zin is negatief.
neighbour	de buur; de buurvrouw	Mijn buur is vriendelijk.
never	nooit	Ik drink nooit koffie.
new	nieuw	Deze telefoon is nieuw.
news	het nieuws	Het nieuws vandaag is goed.
newspaper	de krant	Hij leest een krant.
next	volgende	De volgende bus is te laat.
next to	naast	Ga naast mij zitten.
nice	leuk; aardig	De kamer is prettig.
night	de nacht	Ik slaap 's nachts.
nine	negen	Er zijn negen leerlingen hier.
nineteen	negentien	Zij is negentien jaar.
ninety	negentig	Mijn opa is negentig jaar.
no	nee; geen	Nee, dank je.
no one	niemand	Niemand is in de kamer.
nobody	niemand	Niemand is thuis.
north	het noorden	Het station ligt in het noorden.
nose	de neus	Mijn neus is koud.
not	niet	Ik ben niet moe.
note	de notitie	Schrijf nu een notitie.
nothing	niets	Er zit niets in de doos.
November	november	Mijn cursus begint in november.
now	nu	Kom nu hier.
number	het nummer; het getal	Schrijf het nummer hier.
nurse	de verpleegkundige	De verpleegkundige is aardig.
object	het object; het voorwerp	Zet het voorwerp op de tafel.
o’clock	uur	De les begint om negen uur.
October	oktober	Wij reizen in oktober.
of	van	Dit is een kop thee.
off	uit; weg	Doe het licht uit.
office	het kantoor	Mijn kantoor is klein.
often	vaak	Ik loop vaak naar school.
oh	oh	Oh, nu begrijp ik het.
OK	oké	Is dit oké?
old	oud	Dit huis is oud.
on	op; aan	Het boek ligt op tafel.
once	één keer	Ik bel één keer per week.
one	één	Ik heb één zus.
onion	de ui	Snijd één ui.
online	online	Ik studeer online.
only	alleen	Ik heb alleen één tas.
open	open; openen	Open het raam.
opinion	de mening	Wat is jouw mening?
opposite	tegenover; tegengesteld	De winkel is tegenover de bank.
or	of	Thee of koffie?
orange	de sinaasappel; oranje	Deze sinaasappel is zoet.
order	de bestelling; bestellen	Ik bestel soep.
other	ander	Gebruik de andere deur.
our	ons; onze	Dit is onze klas.
out	uit; naar buiten	Ga na de lunch naar buiten.
outside	buiten	De kinderen spelen buiten.
over	over; boven	Het vliegtuig vliegt boven de stad.
own	eigen; bezitten	Ik heb mijn eigen kamer.
page	de pagina	Open pagina tien.
paint	de verf; schilderen	Verf de muur blauw.
painting	het schilderij	Dit schilderij is mooi.
pair	het paar	Ik heb een paar sokken nodig.
paper	het papier	Schrijf op dit papier.
paragraph	de alinea	Lees de eerste alinea.
parent	de ouder	Een ouder wacht buiten.
park	het park; parkeren	Wij parkeren dicht bij het station.
part	het deel	Dit deel is makkelijk.
partner	de partner; de maat	Werk met je partner.
party	het feest	Het feest begint om zeven uur.
passport	het paspoort	Laat je paspoort zien.
past	verleden; over	Het is half zeven.
pay	betalen	Ik betaal met een kaart.
pen	de pen	Deze pen is blauw.
pencil	het potlood	Ik schrijf met een potlood.
people	de mensen	Er zijn veel mensen hier.
pepper	de peper	Doe peper in de soep.
perfect	perfect	Jouw antwoord is perfect.
period	de periode; de les	Deze les is kort.
person	de persoon	Er wacht één persoon.
personal	persoonlijk	Dit is mijn persoonlijke telefoon.
phone	de telefoon; bellen	Mijn telefoon zit in mijn tas.
photo	de foto	Maak hier een foto.
photograph	de foto; fotograferen	Deze foto is oud.
phrase	de zin; de woordgroep	Herhaal deze zin.
piano	de piano	Zij speelt piano.
picture	de afbeelding; de foto	Kijk naar deze afbeelding.
piece	het stuk	Neem een stuk taart.
pig	het varken	Het varken is op de boerderij.
pink	roze	Haar tas is roze.
place	de plaats; zetten	Deze plaats is rustig.
plan	het plan	Wij hebben een plan nodig.
plane	het vliegtuig	Het vliegtuig is te laat.
plant	de plant; planten	Geef de plant vandaag water.
play	spelen; het toneelstuk	Kinderen spelen in het park.
player	de speler	De speler rent snel.
please	alstublieft; alsjeblieft	Ga hier zitten, alstublieft.
point	het punt	Dit punt is belangrijk.
police	de politie	De politie is buiten.
policeman	de politieman	De politieman helpt ons.
pool	het zwembad	Het zwembad is koud.
poor	arm; zielig	Het arme kind heeft honger.
popular	populair	Dit lied is populair.
positive	positief	Dit is een positief resultaat.
possible	mogelijk	Is dit vandaag mogelijk?
post	de post; het bericht	Ik lees haar bericht online.
potato	de aardappel	Ik eet één aardappel.
pound	het pond	Het kost één pond.
practice	de oefening; de praktijk	Oefening helpt elke dag.
practise	oefenen	Ik oefen elke dag Engels.
prefer	liever hebben	Ik heb liever thee.
prepare	voorbereiden	Maak je tas vanavond klaar.
present	aanwezig; het cadeau	Zij is vandaag aanwezig.
pretty	mooi; vrij	De tuin is mooi.
price	de prijs	De prijs is laag.
probably	waarschijnlijk	Zij weet het waarschijnlijk.
problem	het probleem	Dit probleem is klein.
product	het product	Dit product is nieuw.
programme	het programma	Het programma begint nu.
project	het project	Ons project is klaar.
purple	paars	Het shirt is paars.
put	zetten; leggen	Leg het boek hier.
quarter	het kwartier; het kwart	Het is kwart over twee.
question	de vraag	Stel één vraag.
quick	snel; kort	Dit is een korte toets.
quickly	snel	Ga snel.
quiet	stil	De bibliotheek is stil.
quite	best; vrij	Deze kamer is vrij klein.
radio	de radio	De radio staat hard.
rain	de regen; regenen	Het begint nu te regenen.
read	lezen	Lees deze zin.
reader	de lezer	De lezer vindt het verhaal leuk.
reading	het lezen	Lezen helpt mij leren.
ready	klaar	Het avondeten is klaar.
real	echt	Er is een echt probleem.
really	echt	Ik vind dit lied echt leuk.
reason	de reden	Vertel mij de reden.
red	rood	De deur is rood.
relax	ontspannen	Ontspan na het werk.
remember	onthouden	Vergeet je paspoort niet.
repeat	herhalen	Herhaal deze zin.
report	het rapport	Lees het rapport vanavond.
restaurant	het restaurant	Het restaurant is druk.
result	het resultaat	Het resultaat is goed.
return	terugkeren; teruggeven	Geef het boek morgen terug.
rice	de rijst	Ik eet rijst bij de lunch.
rich	rijk	Deze stad is rijk.
ride	rijden; de rit	Ik rijd op de fiets.
right	rechts; juist	Sla hier rechtsaf.
river	de rivier	De rivier is breed.
road	de weg	Deze weg is lang.
room	de kamer	Mijn kamer is schoon.
routine	de routine	Mijn routine begint vroeg.
rule	de regel	Deze regel is eenvoudig.
run	rennen	Ik ren elke ochtend.
sad	verdrietig	Hij is vandaag verdrietig.
salad	de salade	Deze salade is vers.
salt	het zout	Voeg een beetje zout toe.
same	hetzelfde	Wij hebben dezelfde tas.
sandwich	de boterham; de sandwich	Ik eet een boterham.
Saturday	zaterdag	Wij ontmoeten elkaar zaterdag.
say	zeggen	Zeg je naam.
school	de school	Mijn school is dichtbij.
science	de wetenschap	Ik leer wetenschap op school.
scientist	de wetenschapper	De wetenschapper stelt een vraag.
sea	de zee	De zee is blauw.
second1 (unit of time)	de seconde	Wacht één seconde.
section	de sectie; het deel	Lees deze sectie.
see	zien; ontmoeten	Ik zie mijn vriend.
sell	verkopen	Zij verkopen vers fruit.
send	sturen	Stuur nu een bericht.
sentence	de zin	Schrijf één zin.
September	september	De school begint in september.
seven	zeven	Er zijn zeven mensen hier.
seventeen	zeventien	Hij is zeventien jaar.
seventy	zeventig	Mijn oma is zeventig jaar.
share	delen	Deel de taart.
she	zij	Zij is mijn zus.
sheep	het schaap	Het schaap eet gras.
shirt	het overhemd	Zijn overhemd is schoon.
shoe	de schoen	Een schoen ligt onder het bed.
shop	de winkel; winkelen	De winkel sluit vroeg.
shopping	het winkelen	Winkelen is vandaag leuk.
short	kort	Dit verhaal is kort.
should modal	zou moeten	Je zou vandaag moeten rusten.
show	tonen; de show	Laat mij je kaartje zien.
shower	de douche; douchen	Ik neem een douche.
sick	ziek	Ik voel me vandaag ziek.
similar	vergelijkbaar; gelijkend	Onze tassen lijken op elkaar.
sing	zingen	Ik zing in de les.
singer	de zanger; de zangeres	Die zangeres is beroemd.
sister	de zus	Mijn zus is jong.
sit	zitten	Ga bij het raam zitten.
situation	de situatie	Deze situatie is nieuw.
six	zes	Zes boeken zijn hier.
sixteen	zestien	Zij is zestien jaar.
sixty	zestig	Mijn vader is zestig jaar.
skill	de vaardigheid	Deze vaardigheid is nuttig.
skirt	de rok	Haar rok is blauw.
sleep	slapen; de slaap	Ik slaap acht uur.
slow	langzaam	De bus is langzaam.
small	klein	De kamer is klein.
snake	de slang	De slang is lang.
snow	de sneeuw; sneeuwen	Het sneeuwt in de winter.
so	dus; zo	Ik ben moe, dus ik rust.
some	enkele; wat	Ik heb wat water nodig.
somebody	iemand	Er staat iemand bij de deur.
someone	iemand	Iemand liet een bericht achter.
something	iets	Ik heb iets te drinken nodig.
sometimes	soms	Soms loop ik naar school.
son	de zoon	Haar zoon is op school.
song	het lied	Dit lied is nieuw.
soon	binnenkort	Tot binnenkort.
sorry	sorry; het spijt me	Het spijt me.
sound	het geluid; klinken	Het geluid is hard.
soup	de soep	De soep is heet.
south	het zuiden	Het hotel ligt in het zuiden.
space	de ruimte	Er is ruimte voor een stoel.
speak	spreken	Spreek langzaam, alstublieft.
special	speciaal	Vandaag is een speciale dag.
spell	spellen	Spel je naam.
spelling	de spelling	Controleer je spelling.
spend	uitgeven; doorbrengen	Ik geef geld uit aan eten.
sport	de sport	Voetbal is een populaire sport.
spring	de lente; springen	Bloemen groeien in de lente.
stand	staan	Sta bij de deur.
star	de ster	Ik zie een heldere ster.
start	beginnen	Begin nu met de les.
statement	de verklaring	Deze verklaring is juist.
station	het station	Het station is dichtbij.
stay	blijven	Blijf vandaag thuis.
still	nog steeds	Ik heb nog steeds honger.
stop	stoppen; de halte	Stop op de hoek.
story	het verhaal	Vertel mij een verhaal.
street	de straat	Deze straat is rustig.
strong	sterk	Hij is sterk.
student	de student; de leerling	De student leest een boek.
study	studeren; de studie	Ik studeer Engels.
style	de stijl	Ik vind deze stijl mooi.
subject	het vak; het onderwerp	Engels is mijn hoofdvak.
success	het succes	Succes vraagt oefening.
sugar	de suiker	Doe suiker in de thee.
summer	de zomer	De zomer is hier heet.
sun	de zon	De zon schijnt.
Sunday	zondag	Wij rusten op zondag.
supermarket	de supermarkt	De supermarkt is open.
sure	zeker	Ik ben zeker.
sweater	de trui	Mijn trui is warm.
swim	zwemmen	Ik zwem elke week.
swimming	het zwemmen	Zwemmen is goede oefening.
table	de tafel	De sleutels liggen op tafel.`;

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
      throw new Error(`Dutch example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Dutch display/example must contain Latin text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Dutch display/example contains non-Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Dutch translation row for ${sourceHeadword}`);
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
    "Generate SV support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after SV.",
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
    throw new Error("Usage: node scripts/oxford/build-oxford-part003-support-translation-batch-nl.mjs --contract=<contract.json>");
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const outputPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_nl_v1.jsonl";
  const summaryPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_nl_v1_summary.md";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== "oxford_3000_core_a1_part_003_300_v1") {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(NL_TRANSLATIONS_TSV);

  if (rows.length !== 300) {
    throw new Error(`Expected 300 Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Dutch translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Dutch translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: included where useful for Dutch nouns
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: NL Latin-script display/example cells and no non-Latin script leakage
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
