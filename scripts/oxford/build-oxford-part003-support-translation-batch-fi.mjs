#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "FI";
const BATCH_ID = "fi_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-fi.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const FI_TRANSLATIONS_TSV = `source_headword	FI	example_FI
machine	kone; laite	Kone tekee kahvia.
magazine	aikakauslehti	Hän lukee musiikkilehteä.
main	pää-; tärkein	Tämä on pääovi.
make	tehdä; valmistaa	Teen lounasta kotona.
man	mies	Mies on opettajani.
many	moni; monta	Täällä on monta opiskelijaa.
map	kartta	Katso karttaa.
March	maaliskuu	Syntymäpäiväni on maaliskuussa.
market	tori; markkinat	Ostamme hedelmiä torilta.
married	naimisissa	Siskoni on naimisissa.
May	toukokuu	Koulu loppuu toukokuussa.
maybe	ehkä	Ehkä sataa myöhemmin.
me	minut; minua	Auta minua, kiitos.
meal	ateria	Tämä ateria on kuuma.
mean	tarkoittaa	Mitä merkki tarkoittaa?
meaning	merkitys	Mikä merkitys tällä on?
meat	liha	Syön lihaa päivälliseksi.
meet	tavata	Tapaamme koulun jälkeen.
meeting	kokous; tapaaminen	Kokous alkaa nyt.
member	jäsen	Hän on kerhon jäsen.
menu	ruokalista	Lue ruokalista.
message	viesti	Lähetän lyhyen viestin.
metre	metri	Kävele metri eteenpäin.
midnight	keskiyö	Juna lähtee keskiyöllä.
mile	maili	Kävelemme mailin.
milk	maito	Juon maitoa aamiaisella.
million	miljoona	Täällä asuu miljoona ihmistä.
minute1	minuutti	Odota yksi minuutti.
miss	kaivata; myöhästyä	Kaipaan vanhaa kouluani.
mistake	virhe	Vastauksessa on yksi virhe.
model	malli	Tämä on pieni malli.
modern	moderni; nykyaikainen	Keittiö on moderni.
moment	hetki	Odota hetki.
Monday	maanantai	Aloitamme työn maanantaina.
money	raha	Tarvitsen vähän rahaa.
month	kuukausi	Kesäkuu on lämmin kuukausi.
more	enemmän; lisää	Tarvitsen enemmän aikaa.
morning	aamu	Opiskelen aamulla.
most	useimmat; eniten	Useimmat opiskelijat pitävät musiikista.
mother	äiti	Äitini työskentelee tänään.
mountain	vuori	Vuori on todella korkea.
mouse	hiiri	Hiiri on tuolin alla.
mouth	suu	Avaa suusi.
move	liikkua; siirtää	Siirrä tuoli tänne.
movie	elokuva	Katsomme elokuvan tänä iltana.
much	paljon; kuinka paljon	Kuinka paljon tämä maksaa?
mum	äiti	Äiti on kotona.
museum	museo	Museo avautuu kello kymmenen.
music	musiikki	Kuuntelen musiikkia.
must modal	täytyä; pitää	Sinun täytyy pysähtyä tähän.
my	minun	Tämä on minun kirjani.
name	nimi; nimetä	Kirjoita nimesi tähän.
natural	luonnollinen	Tämä mehu on luonnollista.
near	lähellä	Pankki on lähellä.
need	tarvita	Tarvitsen kynän.
negative	kielteinen; negatiivinen	Tämä vastaus on kielteinen.
neighbour	naapuri	Naapurini on ystävällinen.
never	ei koskaan	En koskaan juo kahvia.
new	uusi	Tämä puhelin on uusi.
news	uutiset	Tämän päivän uutiset ovat hyviä.
newspaper	sanomalehti	Hän lukee sanomalehteä.
next	seuraava	Seuraava bussi on myöhässä.
next to	vieressä	Istu minun viereeni.
nice	mukava	Huone on mukava.
night	yö	Nukun yöllä.
nine	yhdeksän	Täällä on yhdeksän opiskelijaa.
nineteen	yhdeksäntoista	Hän on yhdeksäntoista vuotta vanha.
ninety	yhdeksänkymmentä	Isoisäni on yhdeksänkymmentävuotias.
no	ei; ei yhtään	Ei kiitos.
no one	ei kukaan	Huoneessa ei ole ketään.
nobody	ei kukaan	Kotona ei ole ketään.
north	pohjoinen	Asema on pohjoisessa.
nose	nenä	Nenäni on kylmä.
not	ei	En ole väsynyt.
note	muistiinpano; huomautus	Kirjoita muistiinpano nyt.
nothing	ei mitään	Laatikossa ei ole mitään.
November	marraskuu	Kurssini alkaa marraskuussa.
now	nyt	Tule tänne nyt.
number	numero; luku	Kirjoita numero tähän.
nurse	sairaanhoitaja	Sairaanhoitaja on ystävällinen.
object	esine; kohde	Laita esine pöydälle.
o’clock	kello	Tunti alkaa kello yhdeksän.
October	lokakuu	Matkustamme lokakuussa.
of	-n; jostakin	Tämä on kuppi teetä.
off	pois; pois päältä	Sammuta valo.
office	toimisto	Toimistoni on pieni.
often	usein	Kävelen usein kouluun.
oh	oi; ai	Oi, ymmärrän nyt.
OK	okei	Onko tämä okei?
old	vanha	Tämä talo on vanha.
on	päällä; -lla/-llä	Kirja on pöydällä.
once	kerran	Soitan kerran viikossa.
one	yksi	Minulla on yksi sisko.
onion	sipuli	Leikkaa yksi sipuli.
online	verkossa	Opiskelen verkossa.
only	vain	Minulla on vain yksi laukku.
open	avoin; avata	Avaa ikkuna.
opinion	mielipide	Mikä on mielipiteesi?
opposite	vastapäätä	Kauppa on pankkia vastapäätä.
or	tai	Teetä vai kahvia?
orange	appelsiini; oranssi	Appelsiini on makea.
order	tilaus; tilata	Tilaan keittoa.
other	muu; toinen	Käytä toista ovea.
our	meidän	Tämä on meidän luokkamme.
out	ulos; ulkona	Mene ulos lounaan jälkeen.
outside	ulkona	Lapset leikkivät ulkona.
over	yli; päällä	Lentokone lentää kaupungin yli.
own	oma; omistaa	Minulla on oma huone.
page	sivu	Avaa sivu kymmenen.
paint	maali; maalata	Maalaa seinä siniseksi.
painting	maalaus	Maalaus on kaunis.
pair	pari	Tarvitsen sukkaparin.
paper	paperi	Kirjoita tälle paperille.
paragraph	kappale	Lue ensimmäinen kappale.
parent	vanhempi	Yksi vanhempi odottaa ulkona.
park	puisto; pysäköidä	Pysäköimme aseman lähelle.
part	osa	Tämä osa on helppo.
partner	pari; kumppani	Työskentele parisi kanssa.
party	juhlat	Juhlat alkavat kello seitsemän.
passport	passi	Näytä passisi.
past	mennyt; yli	Kello on puoli seitsemän.
pay	maksaa	Maksan kortilla.
pen	kynä	Tämä kynä on sininen.
pencil	lyijykynä	Kirjoitan lyijykynällä.
people	ihmiset	Täällä on paljon ihmisiä.
pepper	pippuri	Lisää pippuria keittoon.
perfect	täydellinen	Vastauksesi on täydellinen.
period	jakso; oppitunti	Tämä oppitunti on lyhyt.
person	henkilö; ihminen	Yksi henkilö odottaa.
personal	henkilökohtainen	Tämä on henkilökohtainen puhelimeni.
phone	puhelin; soittaa	Puhelimeni on laukussa.
photo	valokuva	Ota valokuva tässä.
photograph	valokuva; valokuvata	Valokuva on vanha.
phrase	ilmaus	Toista tämä ilmaus.
piano	piano	Hän soittaa pianoa.
picture	kuva	Katso kuvaa.
piece	pala	Ota pala kakkua.
pig	sika	Sika on maatilalla.
pink	vaaleanpunainen	Hänen laukkunsa on vaaleanpunainen.
place	paikka; sijoittaa	Paikka on hiljainen.
plan	suunnitelma	Tarvitsemme suunnitelman.
plane	lentokone	Lentokone on myöhässä.
plant	kasvi; istuttaa	Kastele kasvi tänään.
play	pelata; leikkiä; näytelmä	Lapset leikkivät puistossa.
player	pelaaja	Pelaaja juoksee nopeasti.
please	kiitos; ole hyvä	Istu tähän, kiitos.
point	kohta; piste	Tämä kohta on tärkeä.
police	poliisi	Poliisi on ulkona.
policeman	poliisimies	Poliisimies auttaa meitä.
pool	allas	Allas on kylmä.
poor	köyhä; surkea	Köyhä lapsi on nälkäinen.
popular	suosittu	Tämä laulu on suosittu.
positive	positiivinen	Tulos on positiivinen.
possible	mahdollinen	Onko se mahdollista tänään?
post	julkaisu; lähettää	Luen hänen julkaisunsa verkossa.
potato	peruna	Syön yhden perunan.
pound	punta	Se maksaa yhden punnan.
practice	harjoitus; käytäntö	Harjoitus auttaa joka päivä.
practise	harjoitella	Harjoittelen englantia joka päivä.
prefer	pitää enemmän; suosia	Pidän enemmän teestä.
prepare	valmistella; valmistaa	Valmistele laukkusi tänä iltana.
present	läsnä; nykyinen	Hän on läsnä tänään.
pretty	kaunis; melko	Puutarha on kaunis.
price	hinta	Hinta on matala.
probably	luultavasti	Hän luultavasti tietää.
problem	ongelma	Ongelma on pieni.
product	tuote	Tuote on uusi.
programme	ohjelma	Ohjelma alkaa nyt.
project	projekti	Projektimme on valmis.
purple	violetti	Paita on violetti.
put	laittaa; panna	Laita kirja tähän.
quarter	neljännes; vartti	Kello on vartin yli kaksi.
question	kysymys	Kysy yksi kysymys.
quick	nopea; pikainen	Tämä on pikainen koe.
quickly	nopeasti	Mene nopeasti.
quiet	hiljainen	Kirjasto on hiljainen.
quite	melko	Huone on melko pieni.
radio	radio	Radio on äänekäs.
rain	sade; sataa	Nyt alkaa sataa.
read	lukea	Lue tämä lause.
reader	lukija	Lukija pitää tarinasta.
reading	lukeminen	Lukeminen auttaa minua oppimaan.
ready	valmis	Päivällinen on valmis.
real	todellinen; oikea	On todellinen ongelma.
really	todella	Pidän todella tästä laulusta.
reason	syy	Kerro minulle syy.
red	punainen	Ovi on punainen.
relax	rentoutua	Rentoudu työn jälkeen.
remember	muistaa	Muista passisi.
repeat	toistaa	Toista lause.
report	raportti	Lue raportti tänä iltana.
restaurant	ravintola	Ravintola on kiireinen.
result	tulos	Tulos on hyvä.
return	palata; palauttaa	Palauta kirja huomenna.
rice	riisi	Syön riisiä lounaaksi.
rich	rikas	Tämä kaupunki on rikas.
ride	ajaa; ratsastaa; matka	Ajan pyörällä kouluun.
right	oikea; oikealle	Käänny oikealle tässä.
river	joki	Joki on leveä.
road	tie	Tie on pitkä.
room	huone	Huoneeni on puhdas.
routine	rutiini	Rutiinini alkaa aikaisin.
rule	sääntö	Sääntö on yksinkertainen.
run	juosta	Juoksen joka aamu.
sad	surullinen	Hän on surullinen tänään.
salad	salaatti	Salaatti on tuore.
salt	suola	Lisää vähän suolaa.
same	sama	Meillä on sama laukku.
sandwich	voileipä	Syön voileivän.
Saturday	lauantai	Tapaamme lauantaina.
say	sanoa	Sano nimesi.
school	koulu	Kouluni on lähellä.
science	tiede	Opiskelen tiedettä.
scientist	tutkija	Tutkija kysyy kysymyksen.
sea	meri	Meri on sininen.
second1 (unit of time)	sekunti	Odota yksi sekunti.
section	osa; osio	Lue tämä osio.
see	nähdä; tavata	Näen ystäväni.
sell	myydä	He myyvät tuoreita hedelmiä.
send	lähettää	Lähetä viesti nyt.
sentence	lause	Kirjoita yksi lause.
September	syyskuu	Koulu alkaa syyskuussa.
seven	seitsemän	Täällä on seitsemän ihmistä.
seventeen	seitsemäntoista	Hän on seitsemäntoista vuotta vanha.
seventy	seitsemänkymmentä	Isoäitini on seitsemänkymmentävuotias.
share	jakaa	Jaa kakku.
she	hän	Hän on siskoni.
sheep	lammas	Lammas syö ruohoa.
shirt	paita	Paita on puhdas.
shoe	kenkä	Kenkä on sängyn alla.
shop	kauppa; tehdä ostoksia	Kauppa sulkeutuu aikaisin.
shopping	ostokset; ostoksilla käynti	Ostoksilla käynti on tänään hauskaa.
short	lyhyt	Tarina on lyhyt.
should modal	pitäisi	Sinun pitäisi levätä tänään.
show	näyttää; esitys	Näytä lippusi minulle.
shower	suihku; käydä suihkussa	Käyn suihkussa aamulla.
sick	sairas	Olen tänään sairas.
similar	samanlainen	Laukkumme ovat samanlaiset.
sing	laulaa	Laulan luokassa.
singer	laulaja	Laulaja on kuuluisa.
sister	sisko; sisar	Siskoni on nuori.
sit	istua	Istu ikkunan lähelle.
situation	tilanne	Tilanne on uusi.
six	kuusi	Täällä on kuusi kirjaa.
sixteen	kuusitoista	Hän on kuusitoista vuotta vanha.
sixty	kuusikymmentä	Isäni on kuusikymmentävuotias.
skill	taito	Tämä taito on hyödyllinen.
skirt	hame	Hame on sininen.
sleep	nukkua; uni	Nukun kahdeksan tuntia.
slow	hidas	Bussi on hidas.
small	pieni	Huone on pieni.
snake	käärme	Käärme on pitkä.
snow	lumi; sataa lunta	Lunta sataa talvella.
so	joten; niin	Olen väsynyt, joten lepään.
some	joitakin; vähän	Tarvitsen vähän vettä.
somebody	joku	Joku on ovella.
someone	joku	Joku jätti viestin.
something	jotakin	Tarvitsen jotakin juotavaa.
sometimes	joskus	Kävelen joskus kouluun.
son	poika	Hänen poikansa on koulussa.
song	laulu	Laulu on uusi.
soon	pian	Nähdään pian.
sorry	anteeksi; pahoillaan	Anteeksi.
sound	ääni; kuulostaa	Ääni on kova.
soup	keitto	Keitto on kuumaa.
south	etelä	Hotelli on etelässä.
space	tila; avaruus	Tuolille on tilaa.
speak	puhua	Puhu hitaasti, kiitos.
special	erityinen	Tänään on erityinen päivä.
spell	tavata	Tavaa nimesi.
spelling	oikeinkirjoitus	Tarkista oikeinkirjoitus.
spend	käyttää; kuluttaa	Käytän rahaa ruokaan.
sport	urheilu; laji	Jalkapallo on suosittu laji.
spring	kevät; hypätä	Kukat kasvavat keväällä.
stand	seistä	Seiso oven lähellä.
star	tähti	Näen kirkkaan tähden.
start	aloittaa; alku	Aloita oppitunti nyt.
statement	lausunto; väite	Väite on totta.
station	asema	Asema on lähellä.
stay	jäädä; pysyä	Jää kotiin tänään.
still	vielä	Olen vielä nälkäinen.
stop	pysähtyä; lopettaa; pysäkki	Pysähdy kadunkulmaan.
story	tarina	Kerro minulle tarina.
street	katu	Katu on hiljainen.
strong	vahva	Hän on vahva.
student	opiskelija	Opiskelija lukee kirjaa.
study	opiskella; tutkimus	Opiskelen englantia.
style	tyyli	Pidän tästä tyylistä.
subject	oppiaine; aihe	Englanti on pääaineeni.
success	menestys	Menestys vaatii harjoitusta.
sugar	sokeri	Laita sokeria teehen.
summer	kesä	Kesä on täällä kuuma.
sun	aurinko	Aurinko on kirkas.
Sunday	sunnuntai	Lepäämme sunnuntaina.
supermarket	supermarketti; valintamyymälä	Supermarketti on auki.
sure	varma	Olen varma.
sweater	villapaita	Villapaitani on lämmin.
swim	uida	Uin joka viikko.
swimming	uinti	Uinti on hyvää liikuntaa.
table	pöytä	Avaimet ovat pöydällä.`;

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
      throw new Error(`Finnish example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Finnish display/example must contain Latin text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Finnish display/example contains non-Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Finnish translation row for ${sourceHeadword}`);
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
    "Generate CS support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after CS.",
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
    throw new Error("Usage: node scripts/oxford/build-oxford-part003-support-translation-batch-fi.mjs --contract=<contract.json>");
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const outputPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_fi_v1.jsonl";
  const summaryPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_fi_v1_summary.md";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== "oxford_3000_core_a1_part_003_300_v1") {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(FI_TRANSLATIONS_TSV);

  if (rows.length !== 300) {
    throw new Error(`Expected 300 Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Finnish translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Finnish translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Finnish
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: FI Latin-script display/example cells with Finnish diacritics allowed and no non-Latin script leakage
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
