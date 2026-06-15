#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_003_300_v1";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_is_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_is_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-is.mjs";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "IS";
const BATCH_ID = "is_v1";
const RELEASE_ENTRY_COUNT = 300;
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const IS_TRANSLATIONS_TSV = `source_headword	IS	example_IS
machine	vél; tæki	Vélin býr til kaffi.
magazine	tímarit	Hann les tónlistartímarit.
main	aðal; helsti	Þetta er aðaldyrnar.
make	gera; búa til	Ég bý til hádegismat heima.
man	maður	Maðurinn er kennarinn minn.
many	margir; mikið	Hér eru margir nemendur.
map	kort	Horfðu á kortið.
March	mars	Afmælið mitt er í mars.
market	markaður; torg	Við kaupum ávexti á markaði.
married	giftur; gift	Systir mín er gift.
May	maí	Skólinn endar í maí.
maybe	kannski	Kannski rignir.
me	mig; mér	Hjálpaðu mér, vinsamlegast.
meal	máltíð; matur	Máltíðin er hlý.
mean	þýða; merkja	Hvað þýðir merkið?
meaning	merking	Hver er merkingin?
meat	kjöt	Ég borða kjöt í kvöldmat.
meet	hitta; kynnast	Við hittumst eftir skóla.
meeting	fundur; hittast	Fundurinn byrjar núna.
member	meðlimur; félagi	Hún er meðlimur í klúbbnum.
menu	matseðill; valmynd	Lestu matseðilinn.
message	skilaboð	Ég sendi stutt skilaboð.
metre	metri	Stígðu einn metra áfram.
midnight	miðnætti	Lestin fer á miðnætti.
mile	míla	Við göngum eina mílu.
milk	mjólk	Ég drekk mjólk í morgunmat.
million	milljón	Hér býr milljón manna.
minute1	mínúta	Bíddu eina mínútu.
miss	sakna; missa af	Ég sakna gamla skólans.
mistake	mistök; villa	Það eru mistök í svarinu.
model	módel; líkan	Þetta er lítið líkan.
modern	nútímalegur; modern	Eldhúsið er nútímalegt.
moment	augnablik	Bíddu augnablik.
Monday	mánudagur	Á mánudag byrjum við að vinna.
money	peningar	Ég þarf smá peninga.
month	mánuður	Júní er hlýr mánuður.
more	meira; fleiri	Ég þarf meiri tíma.
morning	morgunn	Ég læri á morgnana.
most	flestir; mest	Flestir nemendur elska tónlist.
mother	móðir; mamma	Mamma mín vinnur í dag.
mountain	fjall	Fjallið er mjög hátt.
mouse	mús	Músin er undir stólnum.
mouth	munnur	Opnaðu munninn.
move	hreyfa; flytja	Færðu stólinn hingað.
movie	kvikmynd; mynd	Við horfum á kvikmynd í kvöld.
much	mikið; hversu mikið	Hvað kostar þetta mikið?
mum	mamma	Mamma er heima.
museum	safn	Safnið opnar klukkan tíu.
music	tónlist	Ég hlusta á tónlist.
must modal	verða að; þurfa að	Þú verður að stoppa hér.
my	minn; mín; mitt	Þetta er bókin mín.
name	nafn; nefna	Skrifaðu nafnið þitt hér.
natural	náttúrulegur; eðlilegur	Þessi safi er náttúrulegur.
near	nálægt	Bankinn er nálægt.
need	þurfa; þörf	Ég þarf penna.
negative	neikvæður	Þetta svar er neikvætt.
neighbour	nágranni; nágrannakona	Nágranni minn er vingjarnlegur.
never	aldrei	Ég drekk aldrei kaffi.
new	nýr; ný	Þessi sími er nýr.
news	fréttir	Fréttir dagsins eru góðar.
newspaper	dagblað	Hann les dagblað.
next	næsti; næsta	Næsti strætó er seinn.
next to	við hliðina á	Sestu við hliðina á mér.
nice	góður; fallegur	Herbergið er fallegt.
night	nótt	Ég sef á nóttunni.
nine	níu	Hér eru níu nemendur.
nineteen	nítján	Hann er nítján ára.
ninety	níutíu	Afi minn er níutíu ára.
no	nei; enginn	Nei, takk.
no one	enginn	Enginn er í herberginu.
nobody	enginn	Enginn er heima.
north	norður	Stöðin er í norðri.
nose	nef	Nefið mitt er kalt.
not	ekki	Ég er ekki þreyttur.
note	athugasemd; minnismiði	Skrifaðu minnismiða núna.
nothing	ekkert	Það er ekkert í kassanum.
November	nóvember	Námskeiðið mitt byrjar í nóvember.
now	núna; núna strax	Komdu hingað núna.
number	tala; númer	Skrifaðu töluna hér.
nurse	hjúkrunarfræðingur	Hjúkrunarfræðingurinn er góður.
object	hlutur; fyrirbæri	Settu hlutinn á borðið.
o’clock	klukkan	Tíminn byrjar klukkan níu.
October	október	Við ferðumst í október.
of	af; úr	Þetta er tebolli.
off	slökktur; burt	Slökktu ljósið.
office	skrifstofa; vinnuherbergi	Skrifstofan mín er lítil.
often	oft	Ég geng oft í skólann.
oh	ó; æ	Ó, nú skil ég.
OK	allt í lagi; ókei	Er þetta allt í lagi?
old	gamall; gömul	Þetta hús er gamalt.
on	á; kveiktur	Bókin er á borðinu.
once	einu sinni	Ég hringi einu sinni í viku.
one	einn; ein; eitt	Ég á eina systur.
onion	laukur	Skerðu einn lauk.
online	á netinu	Ég læri á netinu.
only	aðeins; bara	Ég á aðeins eina tösku.
open	opinn; opna	Opnaðu gluggann.
opinion	skoðun	Hver er skoðun þín?
opposite	á móti; gagnstæður	Búðin er á móti bankanum.
or	eða	Te eða kaffi?
orange	appelsína; appelsínugulur	Appelsínan er sæt.
order	pöntun; panta	Ég panta súpu.
other	annar; önnur	Notaðu hinar dyrnar.
our	okkar	Þetta er bekkurinn okkar.
out	út; úti	Farðu út eftir hádegismat.
outside	úti; fyrir utan	Börnin leika sér úti.
over	yfir	Flugvélin flýgur yfir borginni.
own	eigin; eiga	Ég á mitt eigið herbergi.
page	síða	Opnaðu tíundu síðuna.
paint	málning; mála	Málaðu vegginn bláan.
painting	málverk	Málverkið er fallegt.
pair	par	Ég þarf par af sokkum.
paper	pappír; ritgerð	Skrifaðu á þennan pappír.
paragraph	málsgrein	Lestu fyrstu málsgreinina.
parent	foreldri	Eitt foreldri bíður úti.
park	garður; leggja bíl	Við leggjum bílnum nálægt stöðinni.
part	hluti	Þessi hluti er auðveldur.
partner	félagi; maki	Vinndu með félaga þínum.
party	veisla	Veislan byrjar klukkan sjö.
passport	vegabréf	Sýndu vegabréfið.
past	fortíð; yfir	Klukkan er hálf sjö.
pay	borga; greiða	Ég borga með korti.
pen	penni	Þessi penni er blár.
pencil	blýantur	Ég skrifa með blýanti.
people	fólk	Hér er margt fólk.
pepper	pipar	Settu pipar í súpuna.
perfect	fullkominn	Svarið þitt er fullkomið.
period	tímabil; kennslustund	Þessi kennslustund er stutt.
person	manneskja; einstaklingur	Ein manneskja bíður.
personal	persónulegur	Þetta er persónulegi síminn minn.
phone	sími; hringja	Síminn minn er í töskunni.
photo	ljósmynd; mynd	Taktu ljósmynd hér.
photograph	ljósmynd; ljósmynda	Ljósmyndin er gömul.
phrase	frasi; orðasamband	Endurtaktu þennan frasa.
piano	píanó	Hún spilar á píanó.
picture	mynd	Horfðu á myndina.
piece	stykki; biti	Taktu kökubita.
pig	svín	Svínið er á býlinu.
pink	bleikur	Taskan hennar er bleik.
place	staður; setja	Staðurinn er rólegur.
plan	áætlun; plan	Við þurfum áætlun.
plane	flugvél	Flugvélin er sein.
plant	planta; gróðursetja	Vökvaðu plöntuna í dag.
play	leika; leikrit	Börnin leika sér í garðinum.
player	leikmaður; spilari	Leikmaðurinn hleypur hratt.
please	vinsamlegast; gjörðu svo vel	Vinsamlegast sestu hér.
point	punktur; atriði	Þessi punktur er mikilvægur.
police	lögregla	Lögreglan er úti.
policeman	lögreglumaður	Lögreglumaðurinn hjálpar okkur.
pool	sundlaug	Sundlaugin er köld.
poor	fátækur	Fátæka barnið er svangt.
popular	vinsæll	Þetta lag er vinsælt.
positive	jákvæður	Niðurstaðan er jákvæð.
possible	mögulegur	Er þetta mögulegt í dag?
post	færsla; póstur	Ég les færsluna hans á netinu.
potato	kartafla	Ég borða eina kartöflu.
pound	pund	Þetta kostar eitt pund.
practice	æfing; venja	Æfingin hjálpar á hverjum degi.
practise	æfa	Ég æfi ensku á hverjum degi.
prefer	kjósa frekar	Ég kýs frekar te.
prepare	undirbúa	Undirbúðu töskuna í kvöld.
present	viðstaddur; gjöf	Hann er viðstaddur í dag.
pretty	fallegur; frekar	Garðurinn er fallegur.
price	verð	Verðið er lágt.
probably	líklega	Hann veit það líklega.
problem	vandamál	Vandamálið er lítið.
product	vara; afurð	Varan er ný.
programme	dagskrá; þáttur	Þátturinn byrjar núna.
project	verkefni	Verkefnið okkar er búið.
purple	fjólublár	Skyrtan er fjólublá.
put	setja; leggja	Settu bókina hér.
quarter	fjórðungur; korter	Klukkan er korter yfir tvö.
question	spurning	Spurðu spurningar.
quick	fljótur; stuttur	Þetta er stutt próf.
quickly	fljótt	Farðu fljótt.
quiet	hljóðlátur; rólegur	Bókasafnið er rólegt.
quite	frekar	Herbergið er frekar lítið.
radio	útvarp	Útvarpið er hátt.
rain	rigning; rigna	Nú byrjar að rigna.
read	lesa	Lestu þessa setningu.
reader	lesandi	Lesandanum líkar sagan.
reading	lestur	Lestur hjálpar við nám.
ready	tilbúinn	Kvöldmaturinn er tilbúinn.
real	raunverulegur	Það er raunverulegt vandamál.
really	virkilega	Mér líkar þetta lag virkilega.
reason	ástæða	Sagðu ástæðuna.
red	rauður	Hurðin er rauð.
relax	slaka á	Slakaðu á eftir vinnu.
remember	muna; muna eftir	Mundu eftir vegabréfinu.
repeat	endurtaka	Endurtaktu setninguna.
report	skýrsla; tilkynning	Lestu skýrsluna í kvöld.
restaurant	veitingastaður	Veitingastaðurinn er fullur.
result	niðurstaða	Niðurstaðan er góð.
return	snúa aftur; skila	Skilaðu bókinni á morgun.
rice	hrísgrjón	Ég borða hrísgrjón í hádeginu.
rich	ríkur	Þessi borg er rík.
ride	hjóla; ríða; ferð	Ég hjóla í skólann.
right	hægri; réttur	Beygðu til hægri hér.
river	á	Áin er breið.
road	vegur	Vegurinn er langur.
room	herbergi	Herbergið mitt er hreint.
routine	rútína; dagleg venja	Daglega venjan mín byrjar snemma.
rule	regla	Reglan er einföld.
run	hlaupa	Ég hleyp á hverjum morgni.
sad	sorgmæddur	Ég er sorgmæddur í dag.
salad	salat	Salatið er ferskt.
salt	salt	Settu smá salt.
same	sami; eins	Við eigum eins tösku.
sandwich	samloka	Ég borða samloku.
Saturday	laugardagur	Við hittumst á laugardag.
say	segja	Sagðu nafnið þitt.
school	skóli	Skólinn minn er nálægt.
science	vísindi	Ég læri náttúruvísindi.
scientist	vísindamaður	Vísindamaðurinn spyr spurningar.
sea	sjór; haf	Sjórinn er blár.
second1 (unit of time)	sekúnda	Bíddu eina sekúndu.
section	kafli; hluti	Lestu þennan kafla.
see	sjá	Ég sé vin minn.
sell	selja	Þau selja ferska ávexti.
send	senda	Sendu skilaboð núna.
sentence	setning	Skrifaðu setningu.
September	september	Skólinn byrjar í september.
seven	sjö	Hér eru sjö manns.
seventeen	sautján	Hann er sautján ára.
seventy	sjötíu	Amma mín er sjötíu ára.
share	deila	Deildu kökunni.
she	hún	Hún er systir mín.
sheep	kind; sauðfé	Kindin étur gras.
shirt	skyrta	Skyrtan er hrein.
shoe	skór	Skórinn er undir rúminu.
shop	búð; versla	Búðin lokar snemma.
shopping	innkaup	Innkaupin eru skemmtileg í dag.
short	stuttur	Sagan er stutt.
should modal	ætti að	Þú ættir að hvíla þig í dag.
show	sýna; þáttur	Sýndu kortið.
shower	sturta; fara í sturtu	Ég fer í sturtu á morgnana.
sick	veikur	Ég er veikur í dag.
similar	svipaður	Töskurnar okkar eru svipaðar.
sing	syngja	Ég syng í tímanum.
singer	söngvari	Söngvarinn er frægur.
sister	systir	Systir mín er ung.
sit	sitja	Sestu við gluggann.
situation	aðstæður; staða	Staðan er ný.
six	sex	Hér eru sex bækur.
sixteen	sextán	Hann er sextán ára.
sixty	sextíu	Faðir minn er sextíu ára.
skill	færni	Þessi færni er gagnleg.
skirt	pils	Pilsið er blátt.
sleep	sofa; svefn	Ég sef í átta klukkustundir.
slow	hægur	Strætóinn er hægur.
small	lítill	Herbergið er lítið.
snake	snákur	Snákurinn er langur.
snow	snjór; snjóa	Það snjóar á veturna.
so	svo; þannig	Ég er þreyttur, svo ég hvíli mig.
some	nokkrir; smá	Ég þarf smá vatn.
somebody	einhver	Einhver er við dyrnar.
someone	einhver	Einhver skildi eftir skilaboð.
something	eitthvað	Ég þarf eitthvað að drekka.
sometimes	stundum	Stundum geng ég í skólann.
son	sonur	Sonur hennar er í skólanum.
song	lag	Þetta lag er nýtt.
soon	bráðum	Við sjáumst bráðum.
sorry	fyrirgefðu; miður	Mér þykir það miður.
sound	hljóð; hljóma	Hljóðið er sterkt.
soup	súpa	Súpan er heit.
south	suður	Hótelið er í suðri.
space	rými; pláss	Það er pláss fyrir stól.
speak	tala	Talaðu hægt, vinsamlegast.
special	sérstakur	Í dag er sérstakur dagur.
spell	stafa	Stafaðu nafnið þitt.
spelling	stafsetning	Athugaðu stafsetninguna.
spend	eyða; verja	Ég eyði peningum í mat.
sport	íþrótt	Fótbolti er vinsæl íþrótt.
spring	vor; gormur	Blóm vaxa á vorin.
stand	standa	Stattu við dyrnar.
star	stjarna	Ég sé bjarta stjörnu.
start	byrja; byrjun	Byrjaðu tímann núna.
statement	fullyrðing; yfirlýsing	Fullyrðingin er sönn.
station	stöð	Stöðin er nálægt.
stay	vera áfram; dvelja	Vertu heima í dag.
still	enn; kyrr	Ég er enn svangur.
stop	stoppa; stoppistöð	Stoppaðu við hornið.
story	saga	Segðu sögu.
street	gata	Gatan er róleg.
strong	sterkur	Hann er sterkur.
student	nemandi; háskólanemi	Nemandinn les bók.
study	læra; nám	Ég læri ensku.
style	stíll	Mér líkar þessi stíll.
subject	námsgrein; efni	Enska er námsgreinin mín.
success	árangur	Árangur krefst æfingar.
sugar	sykur	Settu sykur í teið.
summer	sumar	Sumarið er heitt hér.
sun	sól	Sólin skín.
Sunday	sunnudagur	Við hvílum okkur á sunnudögum.
supermarket	stórmarkaður	Stórmarkaðurinn er opinn.
sure	viss; auðvitað	Ég er viss.
sweater	peysa	Peysan mín er hlý.
swim	synda	Ég syndi í hverri viku.
swimming	sund	Sund er góð æfing.
table	borð	Lyklarnir eru á borðinu.`;

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
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Icelandic rows, found ${lines.length}`);
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
      throw new Error(`Icelandic example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Icelandic display/example must contain Latin text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Icelandic display/example contains non-Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Icelandic translation row for ${sourceHeadword}`);
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
    "Generate HI support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after HI.",
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
  const translations = parseTsv(IS_TRANSLATIONS_TSV);

  if (rows.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Icelandic translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Icelandic translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(JSONL_PATH), { recursive: true });
  await writeFile(JSONL_PATH, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Icelandic; nouns use nominative/base citation forms and examples may use natural case or definite suffixes
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: IS Latin-script display/example cells with Icelandic diacritics allowed and no non-Latin script leakage
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
    next_language: "HI",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
