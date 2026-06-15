#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_003_300_v1";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_lv_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_lv_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-lv.mjs";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "LV";
const BATCH_ID = "lv_v1";
const RELEASE_ENTRY_COUNT = 300;
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const LV_TRANSLATIONS_TSV = `source_headword	LV	example_LV
machine	mašīna; iekārta	Mašīna gatavo kafiju.
magazine	žurnāls	Viņš lasa mūzikas žurnālu.
main	galvenais	Tās ir galvenās durvis.
make	darīt; pagatavot	Es gatavoju pusdienas mājās.
man	vīrietis	Vīrietis ir mans skolotājs.
many	daudz; daudzi	Šeit ir daudz skolēnu.
map	karte	Paskaties kartē.
March	marts	Mana dzimšanas diena ir martā.
market	tirgus	Mēs pērkam augļus tirgū.
married	precējies; precējusies	Mana māsa ir precējusies.
May	maijs	Skola beidzas maijā.
maybe	varbūt	Varbūt līs.
me	mani; man	Palīdzi man, lūdzu.
meal	maltīte; ēdiens	Maltīte ir silta.
mean	nozīmēt	Ko nozīmē šī zīme?
meaning	nozīme	Kāda ir nozīme?
meat	gaļa	Vakariņās ēdu gaļu.
meet	satikt; iepazīties	Mēs tiekamies pēc skolas.
meeting	tikšanās; sapulce	Sapulce sākas tagad.
member	biedrs; biedre	Viņa ir kluba biedre.
menu	ēdienkarte; izvēlne	Izlasi ēdienkarti.
message	ziņa; vēstule	Es sūtu īsu ziņu.
metre	metrs	Sper vienu metru uz priekšu.
midnight	pusnakts	Vilciens izbrauc pusnaktī.
mile	jūdze	Mēs ejam vienu jūdzi.
milk	piens	Brokastīs dzeru pienu.
million	miljons	Šeit dzīvo miljons cilvēku.
minute1	minūte	Pagaidi vienu minūti.
miss	pietrūkt; nokavēt	Man pietrūkst vecās skolas.
mistake	kļūda	Atbildē ir kļūda.
model	modelis	Tas ir mazs modelis.
modern	moderns; mūsdienīgs	Virtuve ir moderna.
moment	brīdis; moments	Pagaidi brīdi.
Monday	pirmdiena	Pirmdien sākam darbu.
money	nauda	Man vajag nedaudz naudas.
month	mēnesis	Jūnijs ir silts mēnesis.
more	vairāk	Man vajag vairāk laika.
morning	rīts	Es mācos no rīta.
most	lielākā daļa; visvairāk	Lielākā daļa skolēnu mīl mūziku.
mother	māte; mamma	Mana mamma šodien strādā.
mountain	kalns	Kalns ir ļoti augsts.
mouse	pele	Pele ir zem krēsla.
mouth	mute	Atver muti.
move	pārvietot; kustēties	Pārvieto krēslu šurp.
movie	filma	Šovakar skatāmies filmu.
much	daudz; cik	Cik tas maksā?
mum	mamma	Mamma ir mājās.
museum	muzejs	Muzejs atveras desmitos.
music	mūzika	Es klausos mūziku.
must modal	vajadzēt; būt jā-	Tev šeit jāapstājas.
my	mans; mana	Tā ir mana grāmata.
name	vārds; nosaukt	Ieraksti šeit savu vārdu.
natural	dabisks	Šī sula ir dabiska.
near	tuvu; netālu	Banka ir tuvu.
need	vajadzēt; vajadzība	Man vajag pildspalvu.
negative	negatīvs	Šī atbilde ir negatīva.
neighbour	kaimiņš; kaimiņiene	Mans kaimiņš ir draudzīgs.
never	nekad	Es nekad nedzeru kafiju.
new	jauns	Šis telefons ir jauns.
news	ziņas	Šodienas ziņas ir labas.
newspaper	laikraksts; avīze	Viņš lasa avīzi.
next	nākamais	Nākamais autobuss kavējas.
next to	blakus	Sēdies blakus man.
nice	jauks; patīkams	Istaba ir patīkama.
night	nakts	Es guļu naktī.
nine	deviņi	Šeit ir deviņi skolēni.
nineteen	deviņpadsmit	Viņam ir deviņpadsmit gadi.
ninety	deviņdesmit	Manam vectēvam ir deviņdesmit gadu.
no	nē; nekāds	Nē, paldies.
no one	neviens	Neviens nav istabā.
nobody	neviens	Neviens nav mājās.
north	ziemeļi	Stacija ir ziemeļos.
nose	deguns	Mans deguns ir auksts.
not	ne	Es neesmu noguris.
note	piezīme; zīmīte	Uzraksti zīmīti tagad.
nothing	nekas	Kastē nav nekā.
November	novembris	Mans kurss sākas novembrī.
now	tagad	Nāc šurp tagad.
number	skaitlis; numurs	Ieraksti šeit skaitli.
nurse	medmāsa; medbrālis	Medmāsa ir laipna.
object	priekšmets; objekts	Noliec priekšmetu uz galda.
o’clock	pulksten	Stunda sākas pulksten deviņos.
October	oktobris	Mēs ceļojam oktobrī.
of	no; piederības forma	Tā ir tase tējas.
off	izslēgts; nost	Izslēdz gaismu.
office	birojs; kabinets	Mans birojs ir mazs.
often	bieži	Es bieži eju uz skolu kājām.
oh	ak; o	Ak, tagad saprotu.
OK	labi; kārtībā	Vai tas ir labi?
old	vecs	Šī māja ir veca.
on	uz; ieslēgts	Grāmata ir uz galda.
once	vienreiz	Es zvanu vienreiz nedēļā.
one	viens; viena	Man ir viena māsa.
onion	sīpols	Sagriez vienu sīpolu.
online	tiešsaistē; internetā	Es mācos tiešsaistē.
only	tikai	Man ir tikai viena soma.
open	atvērts; atvērt	Atver logu.
opinion	viedoklis	Kāds ir tavs viedoklis?
opposite	pretī; pretējs	Veikals ir pretī bankai.
or	vai; vai arī	Tēja vai kafija?
orange	apelsīns; oranžs	Apelsīns ir salds.
order	pasūtījums; pasūtīt	Es pasūtu zupu.
other	cits	Izmanto citas durvis.
our	mūsu	Tā ir mūsu klase.
out	ārā	Izej ārā pēc pusdienām.
outside	ārā; ārpusē	Bērni spēlējas ārā.
over	virs; pāri	Lidmašīna lido virs pilsētas.
own	savs; piederēt	Man ir sava istaba.
page	lappuse	Atver desmito lappusi.
paint	krāsa; krāsot	Nokrāso sienu zilu.
painting	glezna	Glezna ir skaista.
pair	pāris	Man vajag zeķu pāri.
paper	papīrs; darbs	Raksti uz šī papīra.
paragraph	rindkopa	Izlasi pirmo rindkopu.
parent	vecāks	Viens vecāks gaida ārā.
park	parks; novietot auto	Mēs novietojam auto pie stacijas.
part	daļa	Šī daļa ir viegla.
partner	partneris; partnere	Strādā ar savu partneri.
party	ballīte	Ballīte sākas septiņos.
passport	pase	Parādi pasi.
past	pagātne; pāri	Ir seši trīsdesmit.
pay	maksāt; samaksāt	Es maksāju ar karti.
pen	pildspalva	Šī pildspalva ir zila.
pencil	zīmulis	Es rakstu ar zīmuli.
people	cilvēki	Šeit ir daudz cilvēku.
pepper	pipars; pipari	Pievieno piparus zupai.
perfect	ideāls; perfekts	Tava atbilde ir ideāla.
period	periods; stunda	Šī stunda ir īsa.
person	persona; cilvēks	Viens cilvēks gaida.
personal	personisks	Tas ir mans personiskais telefons.
phone	telefons; zvanīt	Mans telefons ir somā.
photo	fotogrāfija; bilde	Uzņem šeit fotogrāfiju.
photograph	fotogrāfija; fotografēt	Fotogrāfija ir veca.
phrase	frāze	Atkārto šo frāzi.
piano	klavieres	Viņa spēlē klavieres.
picture	attēls; bilde	Paskaties uz attēlu.
piece	gabals	Paņem kūkas gabalu.
pig	cūka	Cūka ir fermā.
pink	rozā	Viņas soma ir rozā.
place	vieta; novietot	Vieta ir klusa.
plan	plāns	Mums vajag plānu.
plane	lidmašīna	Lidmašīna kavējas.
plant	augs; stādīt	Aplaisti augu šodien.
play	spēlēt; luga	Bērni spēlējas parkā.
player	spēlētājs; spēlētāja	Spēlētājs skrien ātri.
please	lūdzu	Lūdzu, sēdies šeit.
point	punkts; doma	Šis punkts ir svarīgs.
police	policija	Policija ir ārā.
policeman	policists	Policists mums palīdz.
pool	baseins	Baseins ir auksts.
poor	nabadzīgs	Nabadzīgs bērns ir izsalcis.
popular	populārs	Šī dziesma ir populāra.
positive	pozitīvs	Rezultāts ir pozitīvs.
possible	iespējams	Vai tas šodien ir iespējams?
post	ziņa; pasts	Es lasu viņa ziņu internetā.
potato	kartupelis	Es ēdu vienu kartupeli.
pound	mārciņa	Tas maksā vienu mārciņu.
practice	prakse; vingrinājums	Vingrinājums palīdz katru dienu.
practise	praktizēt; vingrināties	Es katru dienu praktizēju angļu valodu.
prefer	dot priekšroku; labāk gribēt	Es labāk izvēlos tēju.
prepare	sagatavot	Sagatavo somu vakarā.
present	klātesošs; dāvana	Viņš šodien ir klāt.
pretty	skaists; diezgan	Dārzs ir skaists.
price	cena	Cena ir zema.
probably	droši vien; iespējams	Viņš droši vien zina.
problem	problēma	Problēma ir maza.
product	produkts; prece	Produkts ir jauns.
programme	programma; raidījums	Programma sākas tagad.
project	projekts	Mūsu projekts ir pabeigts.
purple	violets	Krekls ir violets.
put	likt; nolikt	Noliec grāmatu šeit.
quarter	ceturtdaļa; piecpadsmit minūtes	Ir divi un piecpadsmit.
question	jautājums	Uzdod jautājumu.
quick	ātrs; īss	Tas ir īss tests.
quickly	ātri	Ej ātri.
quiet	kluss	Bibliotēka ir klusa.
quite	diezgan	Istaba ir diezgan maza.
radio	radio	Radio ir skaļš.
rain	lietus; līt	Tagad sāk līt.
read	lasīt	Izlasi šo teikumu.
reader	lasītājs; lasītāja	Lasītājam patīk stāsts.
reading	lasīšana	Lasīšana palīdz mācīties.
ready	gatavs	Vakariņas ir gatavas.
real	īsts; reāls	Ir īsta problēma.
really	tiešām; patiešām	Man tiešām patīk šī dziesma.
reason	iemesls	Pasaki iemeslu.
red	sarkans	Durvis ir sarkanas.
relax	atpūsties; relaksēties	Atpūties pēc darba.
remember	atcerēties; paturēt prātā	Neaizmirsti pasi.
repeat	atkārtot	Atkārto teikumu.
report	ziņojums; atskaite	Izlasi ziņojumu vakarā.
restaurant	restorāns	Restorāns ir pilns.
result	rezultāts	Rezultāts ir labs.
return	atgriezties; atdot	Atdod grāmatu rīt.
rice	rīsi	Pusdienās ēdu rīsus.
rich	bagāts	Šī pilsēta ir bagāta.
ride	braukt; jāt; brauciens	Es braucu uz skolu ar velosipēdu.
right	labais; pareizs	Šeit nogriezies pa labi.
river	upe	Upe ir plata.
road	ceļš	Ceļš ir garš.
room	istaba	Mana istaba ir tīra.
routine	rutīna; dienas kārtība	Mana rutīna sākas agri.
rule	noteikums	Noteikums ir vienkāršs.
run	skriet	Es skrienu katru rītu.
sad	bēdīgs	Šodien esmu bēdīgs.
salad	salāti	Salāti ir svaigi.
salt	sāls	Pievieno nedaudz sāls.
same	tas pats; tāds pats	Mums ir tāda pati soma.
sandwich	sviestmaize	Es ēdu sviestmaizi.
Saturday	sestdiena	Mēs tiekamies sestdien.
say	teikt	Pasaki savu vārdu.
school	skola	Mana skola ir tuvu.
science	zinātne; dabaszinības	Es mācos dabaszinības.
scientist	zinātnieks; zinātniece	Zinātnieks uzdod jautājumu.
sea	jūra	Jūra ir zila.
second1 (unit of time)	sekunde	Pagaidi vienu sekundi.
section	sadaļa; daļa	Izlasi šo sadaļu.
see	redzēt	Es redzu savu draugu.
sell	pārdot	Viņi pārdod svaigus augļus.
send	sūtīt; nosūtīt	Nosūti ziņu tagad.
sentence	teikums	Uzraksti teikumu.
September	septembris	Skola sākas septembrī.
seven	septiņi	Šeit ir septiņi cilvēki.
seventeen	septiņpadsmit	Viņam ir septiņpadsmit gadi.
seventy	septiņdesmit	Manai vecmāmiņai ir septiņdesmit gadu.
share	dalīties; kopīgot	Padalies ar kūku.
she	viņa	Viņa ir mana māsa.
sheep	aita	Aita ēd zāli.
shirt	krekls	Krekls ir tīrs.
shoe	kurpe	Kurpe ir zem gultas.
shop	veikals; iepirkties	Veikals aizveras agri.
shopping	iepirkšanās	Šodien iepirkšanās ir patīkama.
short	īss	Stāsts ir īss.
should modal	vajadzētu	Tev šodien vajadzētu atpūsties.
show	parādīt; raidījums	Parādi karti.
shower	duša; iet dušā	No rīta es eju dušā.
sick	slims	Šodien esmu slims.
similar	līdzīgs	Mūsu somas ir līdzīgas.
sing	dziedāt	Es dziedu stundā.
singer	dziedātājs; dziedātāja	Dziedātājs ir slavens.
sister	māsa	Mana māsa ir jauna.
sit	sēdēt; apsēsties	Sēdies pie loga.
situation	situācija	Situācija ir jauna.
six	seši	Šeit ir sešas grāmatas.
sixteen	sešpadsmit	Viņam ir sešpadsmit gadi.
sixty	sešdesmit	Manam tēvam ir sešdesmit gadu.
skill	prasme	Šī prasme ir noderīga.
skirt	svārki	Svārki ir zili.
sleep	gulēt; miegs	Es guļu astoņas stundas.
slow	lēns	Autobuss ir lēns.
small	mazs	Istaba ir maza.
snake	čūska	Čūska ir gara.
snow	sniegs; snigt	Ziemā snieg.
so	tāpēc; tik	Esmu noguris, tāpēc atpūšos.
some	daži; nedaudz	Man vajag nedaudz ūdens.
somebody	kāds	Kāds ir pie durvīm.
someone	kāds	Kāds atstāja ziņu.
something	kaut kas	Man vajag kaut ko dzert.
sometimes	dažreiz	Dažreiz eju uz skolu kājām.
son	dēls	Viņas dēls ir skolā.
song	dziesma	Šī dziesma ir jauna.
soon	drīz	Tiksimies drīz.
sorry	atvainojiet; žēl	Man ir žēl.
sound	skaņa; skanēt	Skaņa ir stipra.
soup	zupa	Zupa ir karsta.
south	dienvidi	Viesnīca ir dienvidos.
space	telpa; vieta	Krēslam ir vieta.
speak	runāt	Runā lēni, lūdzu.
special	īpašs	Šodien ir īpaša diena.
spell	nosaukt pa burtiem	Nosauc savu vārdu pa burtiem.
spelling	pareizrakstība	Pārbaudi pareizrakstību.
spend	tērēt; pavadīt	Es tērēju naudu ēdienam.
sport	sports	Futbols ir populārs sports.
spring	pavasaris; atspere	Pavasarī aug puķes.
stand	stāvēt	Stāvi pie durvīm.
star	zvaigzne	Es redzu spožu zvaigzni.
start	sākt; sākums	Sāc stundu tagad.
statement	apgalvojums; paziņojums	Apgalvojums ir patiess.
station	stacija	Stacija ir tuvu.
stay	palikt	Paliec mājās šodien.
still	vēl; joprojām	Es joprojām esmu izsalcis.
stop	apstāties; pietura	Apstājies pie stūra.
story	stāsts	Pastāsti stāstu.
street	iela	Iela ir klusa.
strong	stiprs	Viņš ir stiprs.
student	skolēns; students	Skolēns lasa grāmatu.
study	mācīties; studijas	Es mācos angļu valodu.
style	stils	Man patīk šis stils.
subject	priekšmets; tēma	Angļu valoda ir mans priekšmets.
success	panākumi; veiksme	Panākumi prasa praksi.
sugar	cukurs	Pievieno cukuru tējai.
summer	vasara	Vasara šeit ir karsta.
sun	saule	Saule spīd.
Sunday	svētdiena	Svētdienās mēs atpūšamies.
supermarket	lielveikals	Lielveikals ir atvērts.
sure	pārliecināts; droši	Es esmu pārliecināts.
sweater	džemperis	Mans džemperis ir silts.
swim	peldēt	Es peldu katru nedēļu.
swimming	peldēšana	Peldēšana ir labs vingrinājums.
table	galds	Atslēgas ir uz galda.`;

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
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Latvian rows, found ${lines.length}`);
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
      throw new Error(`Latvian example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Latvian display/example must contain Latin text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Latvian display/example contains non-Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Latvian translation row for ${sourceHeadword}`);
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
    "Generate ET support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after ET.",
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
  const translations = parseTsv(LV_TRANSLATIONS_TSV);

  if (rows.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Latvian translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Latvian translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(JSONL_PATH), { recursive: true });
  await writeFile(JSONL_PATH, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Latvian; nouns use nominative singular display forms
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: LV Latin-script display/example cells with Latvian diacritics allowed and no non-Latin script leakage
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
    next_language: "ET",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
