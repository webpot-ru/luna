#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_003_300_v1";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_lt_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_lt_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-lt.mjs";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "LT";
const BATCH_ID = "lt_v1";
const RELEASE_ENTRY_COUNT = 300;
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const LT_TRANSLATIONS_TSV = `source_headword	LT	example_LT
machine	mašina; įrenginys	Mašina verda kavą.
magazine	žurnalas	Jis skaito muzikos žurnalą.
main	pagrindinis	Tai yra pagrindinės durys.
make	padaryti; paruošti	Ruošiu pietus namuose.
man	vyras	Vyras yra mano mokytojas.
many	daug; daugelis	Čia yra daug mokinių.
map	žemėlapis	Pažiūrėk į žemėlapį.
March	kovas	Mano gimtadienis yra kovą.
market	turgus; rinka	Perkame vaisius turguje.
married	vedęs; ištekėjusi	Mano sesuo yra ištekėjusi.
May	gegužė	Mokykla baigiasi gegužę.
maybe	galbūt	Galbūt lis.
me	mane; man	Prašau, padėk man.
meal	valgis; patiekalas	Patiekalas yra šiltas.
mean	reikšti	Ką reiškia ženklas?
meaning	reikšmė	Kokia yra reikšmė?
meat	mėsa	Vakarienei valgau mėsą.
meet	susitikti; susipažinti	Susitinkame po mokyklos.
meeting	susitikimas; posėdis	Susitikimas prasideda dabar.
member	narys; narė	Ji yra klubo narė.
menu	meniu	Perskaityk meniu.
message	žinutė; pranešimas	Siunčiu trumpą žinutę.
metre	metras	Eik vieną metrą pirmyn.
midnight	vidurnaktis	Traukinys išvyksta vidurnaktį.
mile	mylia	Einame vieną mylią.
milk	pienas	Pusryčiams geriu pieną.
million	milijonas	Čia gyvena milijonas žmonių.
minute1	minutė	Palauk vieną minutę.
miss	ilgėtis; praleisti	Ilgiuosi senos mokyklos.
mistake	klaida	Atsakyme yra klaida.
model	modelis	Tai mažas modelis.
modern	modernus; šiuolaikiškas	Virtuvė yra moderni.
moment	akimirka; momentas	Palauk akimirką.
Monday	pirmadienis	Pirmadienį pradedame dirbti.
money	pinigai	Man reikia šiek tiek pinigų.
month	mėnuo	Birželis yra šiltas mėnuo.
more	daugiau	Man reikia daugiau laiko.
morning	rytas	Mokausi ryte.
most	dauguma; daugiausia	Dauguma mokinių mėgsta muziką.
mother	mama; motina	Mano mama šiandien dirba.
mountain	kalnas	Kalnas yra labai aukštas.
mouse	pelė	Pelė yra po kėde.
mouth	burna	Atverk burną.
move	judinti; persikelti	Patrauk kėdę čia.
movie	filmas	Šį vakarą žiūrime filmą.
much	daug; kiek	Kiek tai kainuoja?
mum	mama	Mama yra namuose.
museum	muziejus	Muziejus atsidaro dešimtą.
music	muzika	Klausausi muzikos.
must modal	privalėti; turėti	Čia privalai sustoti.
my	mano	Tai mano knyga.
name	vardas; pavadinti	Čia parašyk savo vardą.
natural	natūralus	Šios sultys yra natūralios.
near	arti; šalia	Bankas yra arti.
need	reikėti; poreikis	Man reikia rašiklio.
negative	neigiamas	Šis atsakymas yra neigiamas.
neighbour	kaimynas; kaimynė	Mano kaimynas yra draugiškas.
never	niekada	Niekada negeriu kavos.
new	naujas	Šis telefonas yra naujas.
news	naujienos	Šiandienos naujienos yra geros.
newspaper	laikraštis	Jis skaito laikraštį.
next	kitas; sekantis	Kitas autobusas vėluoja.
next to	šalia	Sėsk šalia manęs.
nice	gražus; malonus	Kambarys yra malonus.
night	naktis	Miegu naktį.
nine	devyni	Čia yra devyni mokiniai.
nineteen	devyniolika	Jam devyniolika metų.
ninety	devyniasdešimt	Mano seneliui devyniasdešimt metų.
no	ne; joks	Ne, ačiū.
no one	niekas	Niekas nėra kambaryje.
nobody	niekas	Niekas nėra namuose.
north	šiaurė	Stotis yra šiaurėje.
nose	nosis	Mano nosis šalta.
not	ne	Aš nesu pavargęs.
note	užrašas; pastaba	Parašyk užrašą dabar.
nothing	nieko	Dėžėje nėra nieko.
November	lapkritis	Mano kursas prasideda lapkritį.
now	dabar	Ateik čia dabar.
number	skaičius; numeris	Čia parašyk skaičių.
nurse	slaugytoja; slaugytojas	Slaugytoja yra maloni.
object	daiktas; objektas	Padėk daiktą ant stalo.
o’clock	valanda	Pamoka prasideda devintą valandą.
October	spalis	Keliaujame spalį.
of	iš; nuo	Tai puodelis arbatos.
off	išjungtas	Išjunk šviesą.
office	biuras; kabinetas	Mano biuras yra mažas.
often	dažnai	Dažnai einu į mokyklą pėsčiomis.
oh	o; aha	Aha, dabar suprantu.
OK	gerai; tvarkoje	Ar tai gerai?
old	senas	Šis namas yra senas.
on	ant; įjungtas	Knyga yra ant stalo.
once	vieną kartą	Skambinu vieną kartą per savaitę.
one	vienas; viena	Turiu vieną seserį.
onion	svogūnas	Supjaustyk vieną svogūną.
online	internetu; internete	Mokausi internetu.
only	tik	Turiu tik vieną krepšį.
open	atviras; atidaryti	Atidaryk langą.
opinion	nuomonė	Kokia tavo nuomonė?
opposite	priešais; priešingas	Parduotuvė yra priešais banką.
or	arba	Arbata arba kava?
orange	apelsinas; oranžinis	Apelsinas yra saldus.
order	užsakymas; užsakyti	Užsakau sriubą.
other	kitas	Naudok kitas duris.
our	mūsų	Tai mūsų klasė.
out	laukan; išorėje	Išeik po pietų.
outside	lauke; išorėje	Vaikai žaidžia lauke.
over	virš; per	Lėktuvas skrenda virš miesto.
own	savas; turėti	Turiu savo kambarį.
page	puslapis	Atversk dešimtą puslapį.
paint	dažai; dažyti	Nudažyk sieną mėlynai.
painting	paveikslas	Paveikslas yra gražus.
pair	pora	Man reikia poros kojinių.
paper	popierius; darbas	Rašyk ant šio popieriaus.
paragraph	pastraipa	Perskaityk pirmą pastraipą.
parent	tėvas; motina	Vienas iš tėvų laukia lauke.
park	parkas; parkuoti	Parkuojame netoli stoties.
part	dalis	Ši dalis yra lengva.
partner	partneris; partnerė	Dirbk su savo partneriu.
party	vakarėlis	Vakarėlis prasideda septintą.
passport	pasas	Parodyk pasą.
past	praeitis; po	Yra šešta trisdešimt.
pay	mokėti; sumokėti	Moku kortele.
pen	rašiklis	Šis rašiklis yra mėlynas.
pencil	pieštukas	Rašau pieštuku.
people	žmonės	Čia yra daug žmonių.
pepper	pipiras; pipirai	Įdėk pipirų į sriubą.
perfect	tobulas	Tavo atsakymas yra tobulas.
period	laikotarpis; pamoka	Ši pamoka yra trumpa.
person	asmuo; žmogus	Vienas žmogus laukia.
personal	asmeninis	Tai mano asmeninis telefonas.
phone	telefonas; skambinti	Mano telefonas yra krepšyje.
photo	nuotrauka	Čia padaryk nuotrauką.
photograph	nuotrauka; fotografuoti	Nuotrauka yra sena.
phrase	frazė	Pakartok šią frazę.
piano	pianinas	Ji groja pianinu.
picture	paveikslas; nuotrauka	Pažiūrėk į paveikslą.
piece	gabalas	Paimk gabalą torto.
pig	kiaulė	Kiaulė yra ūkyje.
pink	rožinis	Jos krepšys yra rožinis.
place	vieta; padėti	Vieta yra tyli.
plan	planas	Mums reikia plano.
plane	lėktuvas	Lėktuvas vėluoja.
plant	augalas; sodinti	Šiandien palaistyk augalą.
play	žaisti; pjesė	Vaikai žaidžia parke.
player	žaidėjas; žaidėja	Žaidėjas greitai bėga.
please	prašau	Prašau, sėsk čia.
point	taškas; mintis	Šis taškas yra svarbus.
police	policija	Policija yra lauke.
policeman	policininkas	Policininkas mums padeda.
pool	baseinas	Baseinas yra šaltas.
poor	vargšas; neturtingas	Neturtingas vaikas yra alkanas.
popular	populiarus	Ši daina yra populiari.
positive	teigiamas	Rezultatas yra teigiamas.
possible	galimas	Ar tai įmanoma šiandien?
post	įrašas; paštas	Skaitau jo įrašą internete.
potato	bulvė	Valgau vieną bulvę.
pound	svaras	Tai kainuoja vieną svarą.
practice	praktika; pratimas	Pratimas padeda kasdien.
practise	praktikuotis; mokytis	Kasdien mokausi anglų kalbos.
prefer	labiau mėgti	Labiau mėgstu arbatą.
prepare	paruošti	Paruošk krepšį vakare.
present	esantis; dovana	Jis šiandien yra čia.
pretty	gražus; gana	Sodas yra gražus.
price	kaina	Kaina yra maža.
probably	tikriausiai	Jis tikriausiai žino.
problem	problema	Problema yra maža.
product	produktas; gaminys	Gaminys yra naujas.
programme	programa; laida	Programa prasideda dabar.
project	projektas	Mūsų projektas baigtas.
purple	violetinis	Marškiniai yra violetiniai.
put	padėti; dėti	Padėk knygą čia.
quarter	ketvirtis	Dabar antra penkiolika.
question	klausimas	Užduok klausimą.
quick	greitas; trumpas	Tai trumpas testas.
quickly	greitai	Eik greitai.
quiet	tylus	Biblioteka yra tyli.
quite	gana	Kambarys gana mažas.
radio	radijas	Radijas yra garsus.
rain	lietus; lyti	Dabar pradeda lyti.
read	skaityti	Perskaityk šį sakinį.
reader	skaitytojas	Skaitytojas mėgsta istoriją.
reading	skaitymas	Skaitymas padeda mokytis.
ready	pasiruošęs; paruoštas	Vakarienė paruošta.
real	tikras	Yra tikra problema.
really	tikrai	Man tikrai patinka ši daina.
reason	priežastis	Pasakyk priežastį.
red	raudonas	Durys yra raudonos.
relax	atsipalaiduoti	Atsipalaiduok po darbo.
remember	prisiminti; nepamiršti	Nepamiršk paso.
repeat	pakartoti	Pakartok sakinį.
report	ataskaita; pranešimas	Perskaityk ataskaitą vakare.
restaurant	restoranas	Restoranas yra pilnas.
result	rezultatas	Rezultatas yra geras.
return	grįžti; grąžinti	Grąžink knygą rytoj.
rice	ryžiai	Pietums valgau ryžius.
rich	turtingas	Šis miestas yra turtingas.
ride	važiuoti; joti; važiavimas	Važiuoju dviračiu į mokyklą.
right	dešinysis; teisingas	Čia suk į dešinę.
river	upė	Upė yra plati.
road	kelias	Kelias yra ilgas.
room	kambarys	Mano kambarys yra švarus.
routine	rutina; dienotvarkė	Mano rutina prasideda anksti.
rule	taisyklė	Taisyklė yra paprasta.
run	bėgti	Bėgu kiekvieną rytą.
sad	liūdnas	Šiandien esu liūdnas.
salad	salotos	Salotos yra šviežios.
salt	druska	Įdėk šiek tiek druskos.
same	tas pats; toks pat	Turime tokį pat krepšį.
sandwich	sumuštinis	Valgau sumuštinį.
Saturday	šeštadienis	Susitinkame šeštadienį.
say	sakyti	Pasakyk savo vardą.
school	mokykla	Mano mokykla yra arti.
science	mokslas	Mokausi gamtos mokslų.
scientist	mokslininkas; mokslininkė	Mokslininkas užduoda klausimą.
sea	jūra	Jūra yra mėlyna.
second1 (unit of time)	sekundė	Palauk vieną sekundę.
section	skyrius; dalis	Perskaityk šį skyrių.
see	matyti	Matau savo draugą.
sell	parduoti; pardavinėti	Jie parduoda šviežius vaisius.
send	siųsti; išsiųsti	Išsiųsk žinutę dabar.
sentence	sakinys	Parašyk sakinį.
September	rugsėjis	Mokykla prasideda rugsėjį.
seven	septyni	Čia yra septyni žmonės.
seventeen	septyniolika	Jam septyniolika metų.
seventy	septyniasdešimt	Mano močiutei septyniasdešimt metų.
share	dalytis; pasidalyti	Pasidalink tortu.
she	ji	Ji yra mano sesuo.
sheep	avis	Avis ėda žolę.
shirt	marškiniai	Marškiniai yra švarūs.
shoe	batas	Batas yra po lova.
shop	parduotuvė; apsipirkti	Parduotuvė anksti užsidaro.
shopping	apsipirkimas	Šiandien apsipirkimas smagus.
short	trumpas	Istorija yra trumpa.
should modal	turėti; reikėtų	Šiandien turėtum pailsėti.
show	parodyti; laida	Parodyk žemėlapį.
shower	dušas; praustis po dušu	Ryte prausiuosi po dušu.
sick	sergantis	Šiandien sergu.
similar	panašus	Mūsų krepšiai panašūs.
sing	dainuoti	Dainuoju pamokoje.
singer	dainininkas; dainininkė	Dainininkas yra žinomas.
sister	sesuo	Mano sesuo jauna.
sit	sėdėti; atsisėsti	Sėsk šalia lango.
situation	situacija	Situacija yra nauja.
six	šeši	Čia yra šešios knygos.
sixteen	šešiolika	Jam šešiolika metų.
sixty	šešiasdešimt	Mano tėvui šešiasdešimt metų.
skill	įgūdis	Šis įgūdis naudingas.
skirt	sijonas	Sijonas yra mėlynas.
sleep	miegoti; miegas	Miegu aštuonias valandas.
slow	lėtas	Autobusas yra lėtas.
small	mažas	Kambarys yra mažas.
snake	gyvatė	Gyvatė yra ilga.
snow	sniegas; snigti	Žiemą sninga.
so	taip; todėl	Esu pavargęs, todėl ilsiuosi.
some	keli; šiek tiek	Man reikia šiek tiek vandens.
somebody	kažkas	Kažkas yra prie durų.
someone	kažkas	Kažkas paliko žinutę.
something	kažkas	Man reikia ko nors gerti.
sometimes	kartais	Kartais einu į mokyklą pėsčiomis.
son	sūnus	Jos sūnus yra mokykloje.
song	daina	Ši daina nauja.
soon	netrukus	Pasimatysime netrukus.
sorry	atsiprašau; gaila	Man gaila.
sound	garsas; skambėti	Garsas yra stiprus.
soup	sriuba	Sriuba karšta.
south	pietūs	Viešbutis yra pietuose.
space	erdvė; vieta	Yra vietos kėdei.
speak	kalbėti	Kalbėk lėtai, prašau.
special	ypatingas	Šiandien ypatinga diena.
spell	paraidžiui pasakyti	Pasakyk savo vardą paraidžiui.
spelling	rašyba	Patikrink rašybą.
spend	leisti; išleisti; praleisti	Leidžiu pinigus maistui.
sport	sportas	Futbolas yra populiarus sportas.
spring	pavasaris; spyruoklė	Pavasarį auga gėlės.
stand	stovėti	Stovėk šalia durų.
star	žvaigždė	Matau ryškią žvaigždę.
start	pradėti; pradžia	Pradėk pamoką dabar.
statement	teiginys; pareiškimas	Teiginys yra teisingas.
station	stotis	Stotis yra arti.
stay	likti	Šiandien lik namuose.
still	vis dar; dar	Vis dar esu alkanas.
stop	sustabdyti; stotelė	Sustok ant kampo.
story	istorija; pasakojimas	Papasakok istoriją.
street	gatvė	Gatvė yra tyli.
strong	stiprus	Jis yra stiprus.
student	mokinys; studentas	Mokinys skaito knygą.
study	mokytis; studijos	Mokausi anglų kalbos.
style	stilius	Man patinka šis stilius.
subject	dalykas; tema	Anglų kalba yra mano dalykas.
success	sėkmė	Sėkmė reikalauja praktikos.
sugar	cukrus	Įdėk cukraus į arbatą.
summer	vasara	Vasara čia karšta.
sun	saulė	Saulė šviečia.
Sunday	sekmadienis	Sekmadieniais ilsimės.
supermarket	prekybos centras	Prekybos centras atidarytas.
sure	tikras; žinoma	Esu tikras.
sweater	megztinis	Mano megztinis šiltas.
swim	plaukti	Plaukiu kiekvieną savaitę.
swimming	plaukimas	Plaukimas yra geras pratimas.
table	stalas	Raktai yra ant stalo.`;

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
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Lithuanian rows, found ${lines.length}`);
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
      throw new Error(`Lithuanian example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Lithuanian display/example must contain Latin text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Lithuanian display/example contains non-Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Lithuanian translation row for ${sourceHeadword}`);
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
    "Generate LV support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after LV.",
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
  const translations = parseTsv(LT_TRANSLATIONS_TSV);

  if (rows.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Lithuanian translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Lithuanian translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(JSONL_PATH), { recursive: true });
  await writeFile(JSONL_PATH, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Lithuanian; nouns use nominative singular display forms
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: LT Latin-script display/example cells with Lithuanian diacritics allowed and no non-Latin script leakage
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
    next_language: "LV",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
