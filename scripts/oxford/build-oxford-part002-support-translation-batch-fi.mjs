#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "FI";
const BATCH_ID = "fi_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-fi.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const FI_TRANSLATIONS_TSV = `source_headword	FI	example_FI
clothes	vaatteet	Vaatteeni ovat puhtaat.
club	kerho; klubi	Hän käy musiikkikerhossa.
coat	takki	Takkini on lämmin.
coffee	kahvi	Juon kahvia aamulla.
cold	kylmä	Vesi on kylmää.
college	ammattikorkeakoulu; yliopisto	Siskoni opiskelee korkeakoulussa.
colour	väri	Lempivärini on sininen.
come	tulla	Tule tänne, kiitos.
common	yleinen	Tämä nimi on yleinen.
company	yritys	Äitini työskentelee yrityksessä.
compare	verrata	Vertaile näitä kahta kuvaa.
complete	valmis; täydellinen	Lomake on valmis.
computer	tietokone	Tämä tietokone on uusi.
concert	konsertti	Menemme konserttiin tänä iltana.
conversation	keskustelu	Meillä oli lyhyt keskustelu.
cook	laittaa ruokaa; kokki	Laitan ruokaa kotona.
cooking	ruoanlaitto	Pidän ruoanlaitosta isän kanssa.
cool	viileä; siisti	Huone on viileä.
correct	oikea; korjata	Vastauksesi on oikea.
cost	hinta; maksaa	Paljonko se maksaa?
could modal	voida	Voisin auttaa sinua.
country	maa	Kanada on suuri maa.
course	kurssi	Käyn englannin kurssia.
cousin	serkku	Serkkuni asuu lähellä minua.
cow	lehmä	Lehmä syö ruohoa.
cream	kerma; voide	Laitan kermaa kahviin.
create	luoda; tehdä	He luovat uuden pelin.
culture	kulttuuri	Opimme paikallisesta kulttuurista.
cup	kuppi	Tämä kuppi on tyhjä.
customer	asiakas	Asiakas kysyy kysymyksen.
cut	leikata	Leikkaa omena kahtia.
dad	isä	Isä on töissä.
dance	tanssia; tanssi	Tanssimme päivällisen jälkeen.
dancer	tanssija	Tanssija liikkuu nopeasti.
dancing	tanssiminen	Tanssiminen on hauskaa.
dangerous	vaarallinen	Tämä tie on vaarallinen.
dark	pimeä; tumma	Huone on pimeä.
date	päivämäärä	Mikä päivämäärä tänään on?
daughter	tytär	Hänen tyttärensä on kuusivuotias.
day	päivä	Hyvää päivänjatkoa.
dear	rakas	Rakas ystävä, kiitos.
December	joulukuu	Syntymäpäiväni on joulukuussa.
decide	päättää	Päätä nyt, kiitos.
delicious	herkullinen	Tämä keitto on herkullista.
describe	kuvailla	Kuvaile huonettasi.
description	kuvaus	Lue lyhyt kuvaus.
design	suunnitelma; suunnitella	Suunnittelen yksinkertaisen kortin.
desk	työpöytä	Kirja on työpöydälläni.
detail	yksityiskohta	Yksi yksityiskohta puuttuu.
dialogue	dialogi	Lue dialogi nyt.
dictionary	sanakirja	Käytä sanakirjaa tunnilla.
die	kuolla	Kukat kuolevat ilman vettä.
diet	ruokavalio	Ruokavaliooni kuuluu hedelmiä.
difference	ero	On yksi ero.
different	erilainen	Meillä on erilaiset nimet.
difficult	vaikea	Tämä kysymys on vaikea.
dinner	päivällinen	Päivällinen on valmis.
dirty	likainen	Kenkäni ovat likaiset.
discuss	keskustella	Keskustelemme suunnitelmasta.
dish	lautanen; ruokalaji	Tämä lautanen on kuuma.
do1	tehdä	Mitä sinä teet?
doctor	lääkäri	Lääkäri on kiireinen.
dog	koira	Koira juoksee ulkona.
dollar	dollari	Se maksaa yhden dollarin.
door	ovi	Sulje ovi, kiitos.
down	alas; alhaalla	Istu tähän alas.
downstairs	alakerrassa	Keittiö on alakerrassa.
draw	piirtää	Piirrä pieni talo.
dress	mekko; pukeutua	Hänellä on punainen mekko.
drink	juoma; juoda	Juon vettä.
drive	ajaa	Ajan töihin.
driver	kuljettaja	Kuljettaja pysähtyy tähän.
during	aikana	Nukun lennon aikana.
DVD	dvd	Tämä dvd on vanha.
each	jokainen	Jokaisella lapsella on kirja.
ear	korva	Korvaani sattuu.
early	aikainen; aikaisin	Nousen aikaisin.
east	itä	Aurinko nousee idästä.
easy	helppo	Tämä koe on helppo.
eat	syödä	Syömme lounasta yhdessä.
egg	muna	Syön yhden munan.
eight	kahdeksan	Minulla on kahdeksan korttia.
eighteen	kahdeksantoista	Hän on kahdeksantoistavuotias.
eighty	kahdeksankymmentä	Isoisäni on kahdeksankymmentävuotias.
elephant	norsu	Norsu on suuri.
eleven	yksitoista	Tunti alkaa yhdeltätoista.
else	muuten; muuta	Mitä muuta tarvitset?
email	sähköposti	Lähetä minulle sähköposti.
end	loppu; päättyä	Tämä on lopussa.
enjoy	nauttia; pitää	Pidän tästä laulusta.
enough	tarpeeksi	Meillä on tarpeeksi aikaa.
euro	euro	Se maksaa yhden euron.
even	jopa	Jopa veljeni tietää sen.
evening	ilta	Tapaamme tänä iltana.
event	tapahtuma	Tapahtuma alkaa tänään.
ever	koskaan	Laitatko koskaan ruokaa?
every	jokainen	Opiskelen joka päivä.
everybody	kaikki	Kaikki ovat täällä.
everyone	kaikki	Kaikki pitävät musiikista.
everything	kaikki	Kaikki on valmista.
exam	koe; tentti	Koe alkaa pian.
example	esimerkki	Tämä on hyvä esimerkki.
excited	innoissaan	Olen tänään innoissani.
exciting	jännittävä	Peli on jännittävä.
exercise	harjoitus; harjoitella	Harjoittelen ennen aamiaista.
expensive	kallis	Tämä takki on kallis.
explain	selittää	Selitä tämä sana, kiitos.
extra	ylimääräinen	Tarvitsen ylimääräistä aikaa.
eye	silmä	Silmäni on punainen.
face	kasvot	Pese kasvosi.
fact	tosiasia	Tämä tosiasia on tärkeä.
fall	pudota; syksy	Lehdet putoavat syksyllä.
false	väärä	Se vastaus on väärä.
family	perhe	Perheeni on pieni.
famous	kuuluisa	Hän on kuuluisa laulaja.
fantastic	mahtava	Konsertti oli mahtava.
far	kaukana	Koulu on kaukana.
farm	maatila	He asuvat maatilalla.
farmer	maanviljelijä	Maanviljelijä kasvattaa ruokaa.
fast	nopea	Tämä juna on nopea.
fat	lihava	Tuo kissa on lihava.
father	isä	Isäni on pitkä.
favourite	suosikki	Tämä on suosikkilauluni.
February	helmikuu	Helmikuu on täällä kylmä.
feel	tuntea	Tunnen itseni iloiseksi.
feeling	tunne	Tunnen sen tunteen.
festival	festivaali	Festivaali alkaa huomenna.
few	muutama	Muutama oppilas on täällä.
fifteen	viisitoista	Olen viisitoistavuotias.
fifth	viides	Tämä on viides tunti.
fifty	viisikymmentä	Äitini on viisikymmentävuotias.
fill	täyttää	Täytä kuppi vedellä.
film	elokuva	Katsomme elokuvan.
final	viimeinen; lopullinen	Tämä on viimeinen kysymys.
find	löytää	Löydän avaimeni.
fine	hyvä	Voin hyvin nyt.
finish	lopettaa; saada valmiiksi	Tee läksysi valmiiksi.
fire	tuli	Tuli on kuuma.
first	ensimmäinen	Hän on ensimmäisenä jonossa.
fish	kala	Syön kalaa päivälliseksi.
five	viisi	Minulla on viisi kirjaa.
flat	asunto	Asuntoni on pieni.
flight	lento	Lento on myöhässä.
floor	lattia; kerros	Laukku on lattialla.
flower	kukka	Tämä kukka on keltainen.
fly	lentää	Linnut lentävät taivaalla.
follow	seurata	Seuraa minua, kiitos.
food	ruoka	Ruoka on valmista.
foot	jalka	Jalkaani sattuu.
football	jalkapallo	Pelaamme jalkapalloa tänään.
for	varten; -lle	Tämä lahja on sinulle.
forget	unohtaa	Älä unohda avaimiasi.
form	lomake	Täytä lomake.
forty	neljäkymmentä	Isäni on neljäkymmentävuotias.
four	neljä	Näen neljä lintua.
fourteen	neljätoista	Hän on neljätoistavuotias.
fourth	neljäs	Tämä on neljäs kerros.
free	ilmainen; vapaa	Lippu on ilmainen.
Friday	perjantai	Tapaamme perjantaina.
friend	ystävä	Ystäväni on täällä.
friendly	ystävällinen	Opettaja on ystävällinen.
from	-sta/-stä; jostakin	Olen Suomesta.
front	etuosa	Seiso edessä.
fruit	hedelmä	Syön hedelmiä joka päivä.
full	täysi; kylläinen	Pullo on täysi.
fun	hauska; hauskuus	Tämä peli on hauska.
funny	hauska	Elokuva on hauska.
future	tulevaisuus	Ajattele tulevaisuuttasi.
game	peli	Peli alkaa nyt.
garden	puutarha	Puutarha on kaunis.
geography	maantiede	Opiskelen maantiedettä koulussa.
get	saada; tulla	Tulen kotiin kuudelta.
girl	tyttö	Tyttö hymyilee.
girlfriend	tyttöystävä	Hänen tyttöystävänsä on kiltti.
give	antaa	Anna minulle kirja.
glass	lasi	Juon lasista.
go	mennä	Menemme nyt kotiin.
good	hyvä	Tämä kahvi on hyvää.
goodbye	näkemiin	Näkemiin, nähdään huomenna.
grandfather	isoisä	Isoisäni on vanha.
grandmother	isoäiti	Isoäitini tekee keittoa.
grandparent	isovanhempi	Yksi isovanhempi asuu kanssamme.
great	loistava; suuri	Tämä on loistava idea.
green	vihreä	Ovi on vihreä.
grey	harmaa	Taivas on harmaa.
group	ryhmä	Työskentele pienessä ryhmässä.
grow	kasvaa; kasvattaa	Kasvit kasvavat puutarhassa.
guess	arvata	Arvaa vastaus.
guitar	kitara	Hän soittaa kitaraa.
gym	kuntosali	Käyn kuntosalilla.
hair	hiukset	Hänen hiuksensa ovat pitkät.
half	puoli; puolikas	Leikkaa kakku kahtia.
hand	käsi	Nosta kätesi.
happen	tapahtua	Mitä tapahtuu seuraavaksi?
happy	iloinen	Olen tänään iloinen.
hard	kova; vaikea	Tämä tuoli on kova.
hat	hattu; pipo	Piponi on musta.
hate	vihata	Vihaan kylmää teetä.
have	olla; omistaa	Minulla on auto.
have to modal	täytyä	Minun täytyy opiskella.
he	hän	Hän on veljeni.
head	pää	Päähäni sattuu.
health	terveys	Hyvä ruoka auttaa terveyttä.
healthy	terveellinen	Tämä ateria on terveellinen.
hear	kuulla	Kuulen musiikkia.
hello	hei	Hei, hauska tavata.
help	auttaa; apu	Auta minua, kiitos.
her	hänet; hänen	Tämä on hänen laukkunsa.
here	täällä; tänne	Tule tänne nyt.
hey	hei	Hei, odota minua.
hi	hei	Hei, mitä kuuluu?
high	korkea	Seinä on korkea.
him	hänet	Tunnen hänet.
his	hänen	Hänen takkinsa on sininen.
history	historia	Opiskelen historiaa.
hobby	harrastus	Lukeminen on harrastukseni.
holiday	loma; pyhä	Pidämme lomaa heinäkuussa.
home	koti; kotona	Olen kotona.
homework	läksyt	Tee läksysi tänä iltana.
hope	toivoa	Toivon, että tulet.
horse	hevonen	Hevonen juoksee nopeasti.
hospital	sairaala	Sairaala on lähellä.
hot	kuuma	Keitto on kuumaa.
hotel	hotelli	Hotelli on puhdas.
hour	tunti	Odota yksi tunti.
house	talo	Tämä talo on vanha.
how	miten	Mitä kuuluu?
however	kuitenkin	Voin kuitenkin jäädä tänne.
hundred	sata	Sata ihmistä tuli.
hungry	nälkäinen	Olen nälkäinen.
husband	aviomies	Hänen miehensä on lääkäri.
I	minä	Pidän teestä.
ice	jää	Jää on kylmää.
ice cream	jäätelö	Haluan jäätelöä.
idea	idea	Se on hyvä idea.
if	jos	Soita minulle, jos tarvitset apua.
imagine	kuvitella	Kuvittele pieni talo.
important	tärkeä	Tämä tunti on tärkeä.
improve	parantaa; kehittyä	Haluan parantaa taitojani.
in	sisällä; -ssa	Avain on laukussani.
include	sisällyttää; ottaa mukaan	Ota nimesi mukaan, kiitos.
information	tieto	Tarvitsen lisää tietoa.
interest	kiinnostus	Hänellä on kiinnostusta taiteeseen.
interested	kiinnostunut	Olen kiinnostunut musiikista.
interesting	mielenkiintoinen	Tämä kirja on mielenkiintoinen.
internet	internet	Internet on hidas.
interview	haastattelu	Minulla on haastattelu tänään.
into	sisään	Laita kirjat laukkuun.
introduce	esitellä	Esittele ystäväsi, kiitos.
island	saari	Tämä saari on pieni.
it	se	On kylmä.
its	sen	Koira pitää sängystään.
jacket	takki	Takkini on uusi.
January	tammikuu	Tammikuu on ensimmäinen kuukausi.
jeans	farkut	Farkkuni ovat siniset.
job	työ; työpaikka	Tarvitsen uuden työn.
join	liittyä; osallistua	Liity luokkaamme tänään.
journey	matka	Matka on pitkä.
juice	mehu	Juon appelsiinimehua.
July	heinäkuu	Matkustamme heinäkuussa.
June	kesäkuu	Koulu päättyy kesäkuussa.
just	vain; juuri	Tarvitsen vain vettä.
keep	pitää; säilyttää	Säilytä tämä avain.
key	avain	Kadotin avaimeni.
kilometre	kilometri	Kävele yksi kilometri.
kind (type)	laji; tyyppi	Millaisesta musiikista pidät?
kitchen	keittiö	Keittiö on puhdas.
know	tietää	Tiedän vastauksen.
land	maa; maa-alue	Lentokone on maassa.
language	kieli	Englanti on kieli.
large	suuri	Tämä huone on suuri.
last1 (final)	viimeinen	Tämä on viimeinen sivu.
late	myöhässä	Bussi on myöhässä.
later	myöhemmin	Nähdään myöhemmin.
laugh	nauraa	Nauramme yhdessä.
learn	oppia	Opettelen englantia.
leave	lähteä; jättää	Jätä ovi auki.
left	vasen	Käänny tästä vasemmalle.
leg	jalka	Jalkaani sattuu.
lesson	oppitunti	Oppitunti alkaa nyt.
let	antaa; sallia	Anna minun auttaa sinua.
letter	kirje; kirjain	Kirjoitan kirjeen.
library	kirjasto	Kirjasto avautuu yhdeksältä.
lie1	maata	Mene sängylle makaamaan, kiitos.
life	elämä	Kaupunkielämä on kiireistä.
like (similar)	kuten; muistuttaa	Se on kuin peli.
like (find sb/sth pleasant)	pitää	Pidän tästä laulusta.
line	jono; viiva	Seiso jonossa.
lion	leijona	Leijona nukkuu.
list	lista	Tee ostoslista.
listen	kuunnella	Kuuntele opettajaa.
little	pieni; vähän	Minulla on vähän rahaa.
live1	asua	Asun lähellä koulua.
local	paikallinen	Tämä on paikallinen kauppa.
long1	pitkä	Tie on pitkä.
look	katsoa; näyttää	Katso kuvaa.
lose	kadottaa; hävitä	Älä kadota lippua.
lot	paljon	Minulla on paljon läksyjä.
love	rakkaus; rakastaa	Rakastan perhettäni.
lunch	lounas	Lounas on valmis.`;

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
  const lines = FI_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tFI\texample_FI") {
    throw new Error("Unexpected FI translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad FI translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad FI translation row ${index + 2}: empty field`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad FI example punctuation for ${sourceHeadword}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad FI Latin native orthography shape for ${sourceHeadword}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad FI non-Latin script leak for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate FI translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing FI translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`FI translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part002_support_translation_batch_fi_v1",
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
    FI: translation.display,
    example_FI: translation.example,
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
    "- Script-aware validation: FI Latin native orthography, Finnish no-article display policy, sentence punctuation and non-Latin script leak guard",
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
