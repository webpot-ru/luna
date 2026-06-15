#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_003_300_v1";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_et_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_et_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-et.mjs";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "ET";
const BATCH_ID = "et_v1";
const RELEASE_ENTRY_COUNT = 300;
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const ET_TRANSLATIONS_TSV = `source_headword	ET	example_ET
machine	masin; seade	Masin teeb kohvi.
magazine	ajakiri	Ta loeb muusikaajakirja.
main	peamine; põhiline	See on peauks.
make	tegema; valmistama	Teen kodus lõunat.
man	mees	Mees on minu õpetaja.
many	palju; paljud	Siin on palju õpilasi.
map	kaart	Vaata kaarti.
March	märts	Mu sünnipäev on märtsis.
market	turg; turuplats	Käime turul puuvilju ostmas.
married	abielus	Mu õde on abielus.
May	mai	Kool lõpeb mais.
maybe	võib-olla	Võib-olla sajab vihma.
me	mind; mulle	Palun aita mind.
meal	söögikord; eine	Eine on soe.
mean	tähendama	Mida see märk tähendab?
meaning	tähendus	Mis on tähendus?
meat	liha	Õhtusöögiks söön liha.
meet	kohtuma; tutvuma	Kohtume pärast kooli.
meeting	koosolek; kohtumine	Koosolek algab nüüd.
member	liige	Ta on klubi liige.
menu	menüü	Loe menüüd.
message	sõnum	Saadan lühikese sõnumi.
metre	meeter	Astu üks meeter edasi.
midnight	kesköö	Rong väljub keskööl.
mile	miil	Kõnnime ühe miili.
milk	piim	Hommikusöögiks joon piima.
million	miljon	Siin elab miljon inimest.
minute1	minut	Oota üks minut.
miss	igatsema; maha jääma	Igatsen vana kooli.
mistake	viga	Vastuses on viga.
model	mudel	See on väike mudel.
modern	moodne; tänapäevane	Köök on moodne.
moment	hetk	Oota hetk.
Monday	esmaspäev	Esmaspäeval alustame tööd.
money	raha	Mul on natuke raha vaja.
month	kuu	Juuni on soe kuu.
more	rohkem	Mul on rohkem aega vaja.
morning	hommik	Õpin hommikul.
most	enamik; kõige rohkem	Enamik õpilasi armastab muusikat.
mother	ema	Mu ema töötab täna.
mountain	mägi	Mägi on väga kõrge.
mouse	hiir	Hiir on tooli all.
mouth	suu	Ava suu.
move	liigutama; kolima	Liiguta tool siia.
movie	film	Täna õhtul vaatame filmi.
much	palju; kui palju	Kui palju see maksab?
mum	emme; ema	Emme on kodus.
museum	muuseum	Muuseum avatakse kell kümme.
music	muusika	Kuulan muusikat.
must modal	pidama; peab	Siin pead peatuma.
my	minu; mu	See on minu raamat.
name	nimi; nimetama	Kirjuta siia oma nimi.
natural	loomulik; looduslik	See mahl on looduslik.
near	lähedal	Pank on lähedal.
need	vajama; vajadus	Mul on pastakat vaja.
negative	negatiivne	See vastus on negatiivne.
neighbour	naaber	Minu naaber on sõbralik.
never	mitte kunagi	Ma ei joo kunagi kohvi.
new	uus	See telefon on uus.
news	uudised	Tänased uudised on head.
newspaper	ajaleht	Ta loeb ajalehte.
next	järgmine	Järgmine buss hilineb.
next to	kõrval	Istu minu kõrvale.
nice	kena; meeldiv	Tuba on meeldiv.
night	öö	Magan öösel.
nine	üheksa	Siin on üheksa õpilast.
nineteen	üheksateist	Ta on üheksateist aastat vana.
ninety	üheksakümmend	Mu vanaisa on üheksakümmend aastat vana.
no	ei; mitte ükski	Ei, aitäh.
no one	mitte keegi	Toas pole mitte kedagi.
nobody	mitte keegi	Kodus pole kedagi.
north	põhi; põhjas	Jaam on põhjas.
nose	nina	Mu nina on külm.
not	mitte; ei	Ma ei ole väsinud.
note	märkus; sedel	Kirjuta nüüd sedel.
nothing	mitte midagi	Kastis pole midagi.
November	november	Mu kursus algab novembris.
now	nüüd; praegu	Tule nüüd siia.
number	number; arv	Kirjuta siia number.
nurse	õde; meditsiiniõde	Õde on lahke.
object	ese; objekt	Pane ese lauale.
o’clock	kell	Tund algab kell üheksa.
October	oktoober	Reisime oktoobris.
of	-st; oma	See on tass teed.
off	väljas; välja lülitatud	Lülita tuli välja.
office	kontor; kabinet	Minu kontor on väike.
often	sageli	Käin sageli jalgsi koolis.
oh	oh; ah	Ah, nüüd saan aru.
OK	okei; korras	Kas see on korras?
old	vana	See maja on vana.
on	peal; sees	Raamat on laual.
once	üks kord	Helistan kord nädalas.
one	üks	Mul on üks õde.
onion	sibul	Lõika üks sibul.
online	veebis; internetis	Õpin veebis.
only	ainult	Mul on ainult üks kott.
open	avatud; avama	Ava aken.
opinion	arvamus	Mis on sinu arvamus?
opposite	vastassuunas; vastas	Pood on panga vastas.
or	või	Tee või kohv?
orange	apelsin; oranž	Apelsin on magus.
order	tellimus; tellima	Tellin suppi.
other	muu; teine	Kasuta teist ust.
our	meie	See on meie klass.
out	välja; väljas	Mine pärast lõunat välja.
outside	õues; väljas	Lapsed mängivad õues.
over	üle; kohal	Lennuk lendab linna kohal.
own	oma; omama	Mul on oma tuba.
page	lehekülg	Ava kümnes lehekülg.
paint	värv; värvima	Värvi sein siniseks.
painting	maal	Maal on ilus.
pair	paar	Mul on sokipaari vaja.
paper	paber; töö	Kirjuta sellele paberile.
paragraph	lõik	Loe esimene lõik.
parent	lapsevanem	Üks lapsevanem ootab õues.
park	park; parkima	Pargime jaama lähedale.
part	osa	See osa on lihtne.
partner	partner	Tööta oma partneriga.
party	pidu	Pidu algab kell seitse.
passport	pass	Näita passi.
past	minevik; läbi	Kell on pool seitse.
pay	maksma; tasuma	Maksan kaardiga.
pen	pastakas; pliiats	See pastakas on sinine.
pencil	pliiats	Kirjutan pliiatsiga.
people	inimesed	Siin on palju inimesi.
pepper	pipar	Lisa supile pipart.
perfect	täiuslik; perfektne	Sinu vastus on täiuslik.
period	periood; tund	See tund on lühike.
person	inimene; isik	Üks inimene ootab.
personal	isiklik	See on minu isiklik telefon.
phone	telefon; helistama	Mu telefon on kotis.
photo	foto; pilt	Tee siin foto.
photograph	foto; pildistama	Foto on vana.
phrase	fraas	Korda seda fraasi.
piano	klaver	Ta mängib klaverit.
picture	pilt	Vaata pilti.
piece	tükk	Võta tükk kooki.
pig	siga	Siga on talus.
pink	roosa	Tema kott on roosa.
place	koht; panema	Koht on vaikne.
plan	plaan	Meil on plaani vaja.
plane	lennuk	Lennuk hilineb.
plant	taim; istutama	Kasta taime täna.
play	mängima; näidend	Lapsed mängivad pargis.
player	mängija	Mängija jookseb kiiresti.
please	palun	Palun istu siia.
point	punkt; mõte	See punkt on tähtis.
police	politsei	Politsei on väljas.
policeman	politseinik	Politseinik aitab meid.
pool	bassein	Bassein on külm.
poor	vaene	Vaene laps on näljane.
popular	populaarne	See laul on populaarne.
positive	positiivne	Tulemus on positiivne.
possible	võimalik	Kas see on täna võimalik?
post	postitus; post	Loen tema postitust veebis.
potato	kartul	Söön ühe kartuli.
pound	nael	See maksab ühe naela.
practice	praktika; harjutus	Harjutus aitab iga päev.
practise	harjutama; praktiseerima	Harjutan inglise keelt iga päev.
prefer	eelistama	Eelistan teed.
prepare	valmistama; ette valmistama	Pane kott õhtul valmis.
present	kohal; kingitus	Ta on täna kohal.
pretty	ilus; üsna	Aed on ilus.
price	hind	Hind on madal.
probably	tõenäoliselt	Ta tõenäoliselt teab.
problem	probleem	Probleem on väike.
product	toode	Toode on uus.
programme	programm; saade	Saade algab nüüd.
project	projekt	Meie projekt on valmis.
purple	lilla	Särk on lilla.
put	panema	Pane raamat siia.
quarter	veerand	Kell on veerand kolm.
question	küsimus	Esita küsimus.
quick	kiire; lühike	See on lühike test.
quickly	kiiresti	Mine kiiresti.
quiet	vaikne	Raamatukogu on vaikne.
quite	üsna	Tuba on üsna väike.
radio	raadio	Raadio on vali.
rain	vihm; sadama	Nüüd hakkab sadama.
read	lugema	Loe see lause.
reader	lugeja	Lugejale meeldib lugu.
reading	lugemine	Lugemine aitab õppida.
ready	valmis	Õhtusöök on valmis.
real	päris; tõeline	On päris probleem.
really	tõesti	Mulle tõesti meeldib see laul.
reason	põhjus	Ütle põhjus.
red	punane	Uks on punane.
relax	lõõgastuma; puhkama	Puhka pärast tööd.
remember	mäletama; meeles pidama	Ära unusta passi.
repeat	kordama	Korda lauset.
report	aruanne; raport	Loe õhtul aruannet.
restaurant	restoran	Restoran on täis.
result	tulemus	Tulemus on hea.
return	tagasi tulema; tagastama	Tagasta raamat homme.
rice	riis	Lõunaks söön riisi.
rich	rikas	See linn on rikas.
ride	sõitma; ratsutama; sõit	Sõidan rattaga kooli.
right	parem; õige	Siin pööra paremale.
river	jõgi	Jõgi on lai.
road	tee	Tee on pikk.
room	tuba	Mu tuba on puhas.
routine	rutiin; päevakava	Mu rutiin algab vara.
rule	reegel	Reegel on lihtne.
run	jooksma	Jooksen igal hommikul.
sad	kurb	Täna olen kurb.
salad	salat	Salat on värske.
salt	sool	Lisa natuke soola.
same	sama; samasugune	Meil on samasugune kott.
sandwich	võileib	Söön võileiba.
Saturday	laupäev	Kohtume laupäeval.
say	ütlema	Ütle oma nimi.
school	kool	Mu kool on lähedal.
science	teadus; loodusteadus	Õpin loodusteadust.
scientist	teadlane	Teadlane esitab küsimuse.
sea	meri	Meri on sinine.
second1 (unit of time)	sekund	Oota üks sekund.
section	jaotis; osa	Loe see jaotis.
see	nägema	Näen oma sõpra.
sell	müüma	Nad müüvad värskeid puuvilju.
send	saatma	Saada sõnum nüüd.
sentence	lause	Kirjuta lause.
September	september	Kool algab septembris.
seven	seitse	Siin on seitse inimest.
seventeen	seitseteist	Ta on seitseteist aastat vana.
seventy	seitsekümmend	Mu vanaema on seitsekümmend aastat vana.
share	jagama	Jaga kooki.
she	tema; ta	Ta on minu õde.
sheep	lammas	Lammas sööb rohtu.
shirt	särk	Särk on puhas.
shoe	king	King on voodi all.
shop	pood; ostlema	Pood suletakse vara.
shopping	ostlemine	Täna on ostlemine meeldiv.
short	lühike	Lugu on lühike.
should modal	peaks; pidama	Sa peaksid täna puhkama.
show	näitama; saade	Näita kaarti.
shower	dušš; duši all käima	Hommikul käin duši all.
sick	haige	Täna olen haige.
similar	sarnane	Meie kotid on sarnased.
sing	laulma	Laulan tunnis.
singer	laulja	Laulja on kuulus.
sister	õde	Mu õde on noor.
sit	istuma	Istu akna juurde.
situation	olukord	Olukord on uus.
six	kuus	Siin on kuus raamatut.
sixteen	kuusteist	Ta on kuusteist aastat vana.
sixty	kuuskümmend	Mu isa on kuuskümmend aastat vana.
skill	oskus	See oskus on kasulik.
skirt	seelik	Seelik on sinine.
sleep	magama; uni	Magan kaheksa tundi.
slow	aeglane	Buss on aeglane.
small	väike	Tuba on väike.
snake	madu	Madu on pikk.
snow	lumi; lund sadama	Talvel sajab lund.
so	seega; nii	Olen väsinud, seega puhkan.
some	mõned; natuke	Mul on natuke vett vaja.
somebody	keegi	Keegi on ukse juures.
someone	keegi	Keegi jättis sõnumi.
something	midagi	Mul on midagi juua vaja.
sometimes	mõnikord	Mõnikord lähen kooli jalgsi.
son	poeg	Tema poeg on koolis.
song	laul	See laul on uus.
soon	varsti	Kohtume varsti.
sorry	vabandust; kahju	Mul on kahju.
sound	heli; kõlama	Heli on tugev.
soup	supp	Supp on kuum.
south	lõuna	Hotell on lõunas.
space	ruum; koht	Tooli jaoks on ruumi.
speak	rääkima	Räägi aeglaselt, palun.
special	eriline	Täna on eriline päev.
spell	tähthaaval ütlema	Ütle oma nimi tähthaaval.
spelling	õigekiri	Kontrolli õigekirja.
spend	kulutama; veetma	Kulutan raha toidule.
sport	sport; spordiala	Jalgpall on populaarne spordiala.
spring	kevad; vedru	Kevadel kasvavad lilled.
stand	seisma	Seisa ukse juures.
star	täht	Näen eredat tähte.
start	alustama; algus	Alusta tundi nüüd.
statement	väide; avaldus	Väide on tõene.
station	jaam	Jaam on lähedal.
stay	jääma	Jää täna koju.
still	ikka; veel	Ma olen ikka näljane.
stop	peatuma; peatus	Peatu nurga juures.
story	lugu	Räägi lugu.
street	tänav	Tänav on vaikne.
strong	tugev	Ta on tugev.
student	õpilane; üliõpilane	Õpilane loeb raamatut.
study	õppima; õpingud	Õpin inglise keelt.
style	stiil	Mulle meeldib see stiil.
subject	õppeaine; teema	Inglise keel on mu õppeaine.
success	edu	Edu nõuab harjutamist.
sugar	suhkur	Lisa teele suhkrut.
summer	suvi	Suvi on siin kuum.
sun	päike	Päike paistab.
Sunday	pühapäev	Pühapäeviti puhkame.
supermarket	supermarket; toidupood	Supermarket on avatud.
sure	kindel; muidugi	Olen kindel.
sweater	kampsun	Mu kampsun on soe.
swim	ujuma	Ujun igal nädalal.
swimming	ujumine	Ujumine on hea harjutus.
table	laud	Võtmed on laual.`;

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
  if (lines.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Estonian rows, found ${lines.length}`);
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
      throw new Error(`Estonian example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Estonian display/example must contain Latin text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Estonian display/example contains non-Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Estonian translation row for ${sourceHeadword}`);
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
    article_display_included: false,
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
    article_display_included: false,
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
    "Generate IS support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after IS.",
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
    throw new Error(`Usage: node ${SCRIPT_PATH} --contract=<contract.json>`);
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== RELEASE_ID) {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(ET_TRANSLATIONS_TSV);

  if (rows.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Estonian translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Estonian translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(JSONL_PATH), { recursive: true });
  await writeFile(JSONL_PATH, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Estonian; nouns use base singular where possible and verbs use dictionary forms
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: ET Latin-script display/example cells with Estonian diacritics allowed and no non-Latin script leakage
- Target-language transcriptions: not included
- Postgres import: false
- Google Sheet delivery: false

This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.
`;
  await writeFile(SUMMARY_PATH, summary);

  const updatedContract = updateContract(contract, JSONL_PATH, SUMMARY_PATH, outputRows);
  await writeFile(contractPath, `${JSON.stringify(updatedContract, null, 2)}\n`);

  console.log(JSON.stringify({
    release_id: releaseId,
    batch_id: BATCH_ID,
    languages: [LANGUAGE],
    rows: outputRows.length,
    display_cells: outputRows.length,
    example_cells: outputRows.length,
    path: JSONL_PATH,
    contract_updated: contractPath,
    completed_support_languages: updatedContract.latest_support_translation_batches.length,
    next_language: "IS",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
