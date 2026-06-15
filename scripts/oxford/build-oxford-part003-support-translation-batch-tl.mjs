#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_003_300_v1";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_tl_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_tl_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-tl.mjs";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "TL";
const BATCH_ID = "tl_v1";
const RELEASE_ENTRY_COUNT = 300;
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const UNEXPECTED_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u1000-\u109F\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const TL_TRANSLATIONS_TSV = `source_headword	TL	example_TL
machine	makina; aparato	Gumagawa ng kape ang makinang ito.
magazine	magasin; pahayagang-magasin	Nagbabasa siya ng magasin sa musika.
main	pangunahing; punong	Ito ang pangunahing pinto.
make	gumawa; gumawa ng	Gumagawa ako ng tanghalian sa bahay.
man	lalaki; tao	Ang lalaki ay guro ko.
many	marami	Maraming estudyante ang narito.
map	mapa	Tingnan ang mapa.
March	Marso	Ang kaarawan ko ay sa Marso.
market	palengke; pamilihan	Bumibili kami ng prutas sa palengke.
married	may asawa; kasal	May asawa ang kapatid kong babae.
May	Mayo	Natatapos ang paaralan sa Mayo.
maybe	marahil; baka	Baka umulan mamaya.
me	ako; akin; sa akin	Tulungan mo ako, pakiusap.
meal	pagkain; kainan	Mainit ang pagkaing ito.
mean	ibig sabihin; mangahulugan	Ano ang ibig sabihin ng karatulang ito?
meaning	kahulugan	Ano ang kahulugan nito?
meat	karne	Kumakain ako ng karne sa hapunan.
meet	makipagkita; magkita	Magkikita kami pagkatapos ng klase.
meeting	pulong; miting	Nagsisimula na ang pulong.
member	miyembro	Miyembro siya ng club.
menu	menu; talaan ng pagkain	Basahin ang menu, pakiusap.
message	mensahe	Nagpapadala ako ng maikling mensahe.
metre	metro	Lumakad ng isang metro pasulong.
midnight	hatinggabi	Aalis ang tren sa hatinggabi.
mile	milya	Naglalakad kami ng isang milya.
milk	gatas	Umiinom ako ng gatas sa almusal.
million	milyon	Isang milyong tao ang nakatira rito.
minute1	minuto	Maghintay ng isang minuto, pakiusap.
miss	ma-miss; hindi maabutan	Na-miss ko ang dati kong paaralan.
mistake	pagkakamali	May pagkakamali sa sagot na ito.
model	modelo; halimbawa	Ito ay maliit na modelo.
modern	moderno	Moderno ang kusina.
moment	sandali	Maghintay sandali, pakiusap.
Monday	Lunes	Nagsisimula kami ng trabaho sa Lunes.
money	pera	Kailangan ko ng pera.
month	buwan	Ang Hunyo ay mainit na buwan.
more	mas marami; dagdag	Kailangan ko ng dagdag na oras.
morning	umaga	Nag-aaral ako sa umaga.
most	karamihan; pinakamarami	Karamihan sa mga estudyante ay gusto ang musika.
mother	ina; nanay	Nagtatrabaho ngayon ang nanay ko.
mountain	bundok	Mataas ang bundok.
mouse	daga	May daga sa ilalim ng upuan.
mouth	bibig	Buksan mo ang bibig mo, pakiusap.
move	ilipat; gumalaw	Ilipat mo rito ang upuan.
movie	pelikula	Manonood kami ng pelikula mamaya.
much	marami; magkano	Magkano ito?
mum	nanay	Nasa bahay ang nanay ko.
museum	museo	Nagbubukas ang museo nang alas diyes.
music	musika	Nakikinig ako ng musika.
must modal	kailangan; dapat	Kailangan mong huminto rito.
my	aking; ko	Ito ang aking libro.
name	pangalan; pangalanan	Isulat mo rito ang pangalan mo.
natural	natural; likas	Natural ang katas na ito.
near	malapit	Malapit dito ang bangko.
need	kailangan; pangangailangan	Kailangan ko ng panulat.
negative	negatibo	Negatibo ang sagot na ito.
neighbour	kapitbahay	Palakaibigan ang kapitbahay ko.
never	hindi kailanman	Hindi ako kailanman umiinom ng kape.
new	bago	Bago ang teleponong ito.
news	balita	Maganda ang balita ngayon.
newspaper	dyaryo; pahayagan	Nagbabasa siya ng dyaryo.
next	susunod; kasunod	Huli ang susunod na bus.
next to	katabi; sa tabi ng	Umupo ka sa tabi ko.
nice	maganda; mabait	Maganda ang kuwarto.
night	gabi	Natutulog ako sa gabi.
nine	siyam	Narito ang siyam na estudyante.
nineteen	labinsiyam	Labinsiyam na taong gulang siya.
ninety	siyamnapu	Siyamnapung taong gulang ang lolo ko.
no	hindi; wala	Hindi, salamat.
no one	walang sinuman	Walang sinuman sa kuwarto.
nobody	walang tao	Walang tao sa bahay.
north	hilaga	Nasa hilaga ang istasyon.
nose	ilong	Malamig ang ilong ko.
not	hindi	Hindi ako pagod.
note	tala; sulat	Gumawa ka ng tala ngayon.
nothing	wala	Walang laman ang kahon.
November	Nobyembre	Magsisimula ang kurso ko sa Nobyembre.
now	ngayon; na	Pumunta ka rito ngayon.
number	numero; bilang	Isulat mo rito ang numero.
nurse	nars	Mabait ang nars.
object	bagay; bagay na nakikita	Ilagay ang bagay sa mesa.
o’clock	alas; eksakto	Nagsisimula ang klase nang alas nuwebe.
October	Oktubre	Maglalakbay kami sa Oktubre.
of	ng; mula sa	Ito ay tasa ng tsaa.
off	patay; nakapatay	Patayin mo ang ilaw.
office	opisina	Maliit ang opisina ko.
often	madalas	Madalas akong naglalakad papuntang paaralan.
oh	oh; naku	Oh, naiintindihan ko na.
OK	okey; ayos	Ok ba ito?
old	luma; matanda	Luma ang bahay na ito.
on	nasa; nakabukas	Nasa mesa ang libro.
once	minsan; isang beses	Tumatawag ako isang beses sa isang linggo.
one	isa	Mayroon akong isang kapatid na babae.
onion	sibuyas	Hiwain ang isang sibuyas.
online	online	Nag-aaral ako online.
only	lamang; lang	Isang bag lang ang mayroon ako.
open	bukas; buksan	Buksan ang bintana, pakiusap.
opinion	opinyon; kuro-kuro	Ano ang opinyon mo?
opposite	katapat; kabaligtaran	Katapat ng bangko ang tindahan.
or	o; o kaya	Tsaa o kape?
orange	dalandan; kulay kahel	Matamis ang dalandan na ito.
order	order; umorder	Umuorder ako ng sopas.
other	iba; ibang	Gamitin ang ibang pinto.
our	amin; atin	Ito ang silid-aralan namin.
out	labas; palabas	Lumabas ka pagkatapos ng tanghalian.
outside	sa labas	Naglalaro sa labas ang mga bata.
over	sa ibabaw; lampas	Lumilipad ang eroplano sa ibabaw ng lungsod.
own	sarili; sariling	Mayroon akong sariling kuwarto.
page	pahina	Buksan ang pahina sampu.
paint	pintura; magpinta	Pinturahan ng asul ang dingding.
painting	pinta; larawan	Maganda ang pintang ito.
pair	pares	Kailangan ko ng isang pares ng medyas.
paper	papel	Sumulat sa papel na ito.
paragraph	talata	Basahin ang unang talata.
parent	magulang	Naghihintay sa labas ang isang magulang.
park	parke; magparada	Nagpaparada kami malapit sa istasyon.
part	bahagi	Madali ang bahaging ito.
partner	kapareha; kasama	Makipagtrabaho sa kapareha.
party	salu-salo; party	Magsisimula ang party nang alas siyete.
passport	pasaporte	Ipakita ang pasaporte mo, pakiusap.
past	nakaraan; lampas	Alas sais y medya na.
pay	magbayad; bayaran	Nagbabayad ako gamit ang card.
pen	panulat; bolpen	Asul ang panulat na ito.
pencil	lapis	Nagsusulat ako gamit ang lapis.
people	mga tao	Maraming tao ang narito.
pepper	paminta; sili	Lagyan ng paminta ang sopas.
perfect	perpekto; eksakto	Perpekto ang sagot mo.
period	panahon; yugto	Maikli ang panahon ng klase.
person	tao; persona	May isang taong naghihintay.
personal	personal; pansarili	Ito ang personal kong telepono.
phone	telepono; tumawag	Nasa bag ko ang telepono ko.
photo	larawan; litrato	Kumuha ng larawan dito.
photograph	larawan; litrato	Luma ang litratong ito.
phrase	parirala	Ulitin ang parirala, pakiusap.
piano	piyano	Tumutugtog siya ng piyano.
picture	larawan	Tingnan ang larawang ito.
piece	piraso	Kumuha ng isang piraso ng cake.
pig	baboy	Nasa bukid ang baboy.
pink	rosas; kulay rosas	Kulay rosas ang bag niya.
place	lugar	Tahimik ang lugar na ito.
plan	plano	Kailangan namin ng plano.
plane	eroplano	Huli ang eroplano.
plant	halaman; magtanim	Diligan ang halaman ngayon.
play	maglaro; dula	Naglalaro ang mga bata sa parke.
player	manlalaro	Mabilis tumakbo ang manlalaro.
please	pakiusap; pakisuyo	Umupo ka rito, pakiusap.
point	punto; tuldok	Mahalaga ang puntong ito.
police	pulis	Nasa labas ang pulis.
policeman	pulis na lalaki; pulis	Tinutulungan kami ng pulis.
pool	pool; languyan	Malamig ang pool.
poor	mahirap; dukha	Gutom ang mahirap na bata.
popular	sikat; popular	Sikat ang kantang ito.
positive	positibo	Positibo ang resulta.
possible	posible	Posible ba ito ngayon?
post	post; koreo	Binabasa ko online ang post niya.
potato	patatas	Kumakain ako ng patatas.
pound	libra; pound	Isang pound ang halaga nito.
practice	ensayo; praktis	Nakakatulong ang praktis araw-araw.
practise	magsanay; magpraktis	Nagpapraktis ako ng Ingles araw-araw.
prefer	mas gusto	Mas gusto ko ang tsaa.
prepare	maghanda	Ihanda ang bag mo mamayang gabi.
present	naroroon; regalo	Naroroon siya ngayon.
pretty	maganda; medyo	Maganda ang hardin.
price	presyo	Mababa ang presyo.
probably	malamang; marahil	Malamang alam niya.
problem	problema	Maliit ang problemang ito.
product	produkto	Bago ang produktong ito.
programme	programa	Nagsisimula na ang programa.
project	proyekto	Handa na ang proyekto namin.
purple	lila; kulay ube	Kulay lila ang kamiseta.
put	ilagay	Ilagay ang libro rito.
quarter	kapat; labinlimang minuto	Labinlimang minuto ang lumipas mula alas dos.
question	tanong	Magtanong ng isang tanong.
quick	mabilis; maikli	Mabilis ang pagsusulit na ito.
quickly	mabilis	Lumakad nang mabilis, pakiusap.
quiet	tahimik	Tahimik ang aklatan.
quite	medyo; lubos	Medyo maliit ang kuwartong ito.
radio	radyo	Malakas ang radyo.
rain	ulan; umulan	Nagsisimula na ang ulan.
read	magbasa	Basahin ang pangungusap na ito.
reader	mambabasa	Gusto ng mambabasa ang kuwento.
reading	pagbasa	Nakakatulong sa akin ang pagbasa.
ready	handa	Handa na ang hapunan.
real	totoo; tunay	Totoong problema ito.
really	talaga	Gustong-gusto ko ang kantang ito.
reason	dahilan	Sabihin mo sa akin ang dahilan.
red	pula	Pula ang pinto.
relax	magpahinga	Magpahinga pagkatapos ng trabaho.
remember	tandaan	Tandaan mo ang pasaporte mo.
repeat	ulitin; ulit	Ulitin ang pangungusap, pakiusap.
report	ulat	Basahin ang ulat mamayang gabi.
restaurant	restawran	Abala ang restawran.
result	resulta	Maganda ang resulta.
return	ibalik; bumalik	Ibalik ang libro bukas.
rice	kanin; bigas	Kumakain ako ng kanin sa tanghalian.
rich	mayaman	Mayaman ang lungsod.
ride	sumakay; sakay	Sumasakay ako sa bisikleta.
right	tama; kanan	Lumiko pakanan dito.
river	ilog	Malapad ang ilog.
road	kalsada	Mahaba ang kalsadang ito.
room	kuwarto; silid	Malinis ang kuwarto ko.
routine	gawain; rutina	Maagang nagsisimula ang rutina ko.
rule	patakaran; tuntunin	Simple ang tuntuning ito.
run	tumakbo; takbo	Tumatakbo ako tuwing umaga.
sad	malungkot	Malungkot siya ngayon.
salad	salad	Sariwa ang salad na ito.
salt	asin	Magdagdag ng kaunting asin.
same	pareho	Pareho ang bag namin.
sandwich	sandwich	Kumakain ako ng sandwich.
Saturday	Sabado	Magkikita kami sa Sabado.
say	sabihin	Sabihin mo ang pangalan mo, pakiusap.
school	paaralan	Malapit dito ang paaralan ko.
science	agham	Nag-aaral ako ng agham.
scientist	siyentipiko	Nagtatanong ang siyentipiko.
sea	dagat	Asul ang dagat.
second1 (unit of time)	segundo	Maghintay ng isang segundo.
section	seksyon; bahagi	Basahin ang seksyong ito.
see	makita	Nakikita ko ang kaibigan ko.
sell	magbenta	Nagbebenta sila ng sariwang prutas.
send	magpadala	Ipadala ang mensahe ngayon.
sentence	pangungusap	Sumulat ng isang pangungusap.
September	Setyembre	Nagsisimula ang paaralan sa Setyembre.
seven	pito	Narito ang pitong tao.
seventeen	labimpito	Labimpitong taong gulang siya.
seventy	pitumpu	Pitumpung taong gulang ang lola ko.
share	ibahagi; hatiin	Ibahagi ang cake.
she	siya; babae	Kapatid ko siyang babae.
sheep	tupa	Kumakain ng damo ang tupa.
shirt	kamiseta	Malinis ang kamiseta niya.
shoe	sapatos	Nasa ilalim ng kama ang isang sapatos.
shop	tindahan; mamili	Maagang nagsasara ang tindahan.
shopping	pamimili	Masaya ang pamimili ngayon.
short	maikli	Maikli ang kuwentong ito.
should modal	dapat	Dapat kang magpahinga ngayon.
show	ipakita; palabas	Ipakita mo sa akin ang tiket mo.
shower	paligo; maligo	Naliligo ako sa umaga.
sick	may sakit	Masama ang pakiramdam ko ngayon.
similar	magkatulad	Magkatulad ang mga bag namin.
sing	kumanta	Kumakanta ako sa klase.
singer	mang-aawit	Sikat ang mang-aawit.
sister	kapatid na babae	Bata pa ang kapatid kong babae.
sit	umupo	Umupo malapit sa bintana.
situation	sitwasyon	Bago ang sitwasyong ito.
six	anim	Narito ang anim na libro.
sixteen	labing-anim	Labing-anim na taong gulang siya.
sixty	animnapu	Animnapung taong gulang ang tatay ko.
skill	kasanayan	Kapaki-pakinabang ang kasanayang ito.
skirt	palda	Asul ang palda niya.
sleep	matulog; tulog	Natutulog ako ng walong oras.
slow	mabagal	Mabagal ang bus.
small	maliit	Maliit ang kuwarto.
snake	ahas	Mahaba ang ahas.
snow	niyebe; umulan ng niyebe	Umuulan ng niyebe sa taglamig.
so	kaya; napaka	Pagod ako, kaya nagpapahinga ako.
some	ilan; kaunti	Kailangan ko ng kaunting tubig.
somebody	may tao	May tao sa pinto.
someone	may isang tao	May isang taong nag-iwan ng mensahe.
something	bagay; kung ano	Kailangan ko ng maiinom.
sometimes	minsan	Minsan naglalakad ako papuntang paaralan.
son	anak na lalaki	Nasa paaralan ang anak niyang lalaki.
song	kanta	Bago ang kantang ito.
soon	malapit na; sa lalong madaling panahon	Magkita tayo sa lalong madaling panahon.
sorry	paumanhin; pasensiya	Paumanhin.
sound	tunog; ingay	Malakas ang tunog.
soup	sopas	Mainit ang sopas.
south	timog	Nasa timog ang hotel.
space	espasyo; kalawakan	May espasyo para sa isang upuan.
speak	magsalita	Magsalita nang mabagal, pakiusap.
special	espesyal	Espesyal ang araw na ito.
spell	baybayin	Baybayin mo ang pangalan mo.
spelling	pagbaybay	Suriin ang pagbaybay mo.
spend	gumastos; magpalipas	Gumagastos ako ng pera sa pagkain.
sport	palakasan; isport	Sikat na isport ang football.
spring	tagsibol; bukal	Tumutubo ang mga bulaklak sa tagsibol.
stand	tumayo; tayo	Tumayo malapit sa pinto.
star	bituin	Nakikita ko ang maliwanag na bituin.
start	magsimula; simula	Simulan ang aralin ngayon.
statement	pahayag	Totoo ang pahayag na ito.
station	istasyon	Malapit ang istasyon.
stay	manatili; tumira	Manatili sa bahay ngayon.
still	pa rin; tahimik	Gutom pa rin ako.
stop	huminto; hintuan	Huminto sa kanto.
story	kuwento	Kuwentuhan mo ako.
street	kalye	Tahimik ang kalyeng ito.
strong	malakas	Malakas siya.
student	estudyante	Nagbabasa ng libro ang estudyante.
study	pag-aaral; mag-aral	Nag-aaral ako ng Ingles.
style	estilo	Gusto ko ang estilong ito.
subject	asignatura; paksa	Ingles ang pangunahing asignatura ko.
success	tagumpay	Kailangan ng praktis para sa tagumpay.
sugar	asukal	Lagyan ng asukal ang tsaa.
summer	tag-init	Mainit dito sa tag-init.
sun	araw	Maliwanag ang araw.
Sunday	Linggo	Nagpapahinga kami sa Linggo.
supermarket	supermarket	Bukas ang supermarket.
sure	sigurado; tiyak	Sigurado ako.
sweater	suweter	Mainit ang suweter ko.
swim	lumangoy	Lumalangoy ako bawat linggo.
swimming	paglangoy	Magandang ehersisyo ang paglangoy.
table	mesa	Nasa mesa ang mga susi.`;

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
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Filipino rows, found ${lines.length}`);
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
      throw new Error(`Filipino example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Filipino display/example must contain Latin text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Filipino display/example contains unexpected non-Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Filipino translation row for ${sourceHeadword}`);
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
    "Generate MY support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after MY.",
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
  const translations = parseTsv(TL_TRANSLATIONS_TSV);

  if (rows.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Filipino translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Filipino translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(JSONL_PATH), { recursive: true });
  await writeFile(JSONL_PATH, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Filipino; display cells use Filipino/Tagalog Latin-script citation/base forms
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: TL Filipino native Latin display/example cells, sentence punctuation and unexpected-script leakage guard
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
    next_language: "MY",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
