#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "SK";
const BATCH_ID = "sk_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-sk.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const SK_TRANSLATIONS_TSV = `source_headword	SK	example_SK
machine	stroj; zariadenie	Stroj robí kávu.
magazine	časopis	Číta hudobný časopis.
main	hlavný	Toto sú hlavné dvere.
make	robiť; vyrobiť	Robím obed doma.
man	muž	Ten muž je môj učiteľ.
many	mnoho; veľa	Je tu veľa študentov.
map	mapa	Pozri sa na mapu.
March	marec	Narodeniny mám v marci.
market	trh	Kupujeme ovocie na trhu.
married	ženatý; vydatá	Moja sestra je vydatá.
May	máj	Škola končí v máji.
maybe	možno	Možno bude pršať.
me	mňa; mi	Pomôž mi, prosím.
meal	jedlo; pokrm	Toto jedlo je teplé.
mean	znamenať	Čo znamená tá značka?
meaning	význam	Aký je význam?
meat	mäso	Jem mäso na večeru.
meet	stretnúť; stretnúť sa	Stretneme sa po škole.
meeting	stretnutie; schôdzka	Stretnutie sa začína teraz.
member	člen	Je členom klubu.
menu	jedálny lístok; menu	Prečítaj si jedálny lístok.
message	správa	Posielam krátku správu.
metre	meter	Choď jeden meter dopredu.
midnight	polnoc	Vlak odchádza o polnoci.
mile	míľa	Ideme jednu míľu.
milk	mlieko	Pijem mlieko na raňajky.
million	milión	Žije tu milión ľudí.
minute1	minúta	Počkaj jednu minútu.
miss	chýbať; zmeškať	Chýba mi moja stará škola.
mistake	chyba	V odpovedi je jedna chyba.
model	model	Toto je malý model.
modern	moderný	Kuchyňa je moderná.
moment	chvíľa; okamih	Počkaj chvíľu.
Monday	pondelok	V pondelok začíname pracovať.
money	peniaze	Potrebujem trochu peňazí.
month	mesiac	Jún je teplý mesiac.
more	viac; ďalší	Potrebujem viac času.
morning	ráno	Ráno sa učím.
most	väčšina; najviac	Väčšina študentov má rada hudbu.
mother	matka; mama	Moja matka dnes pracuje.
mountain	hora	Tá hora je veľmi vysoká.
mouse	myš	Pod stoličkou je myš.
mouth	ústa	Otvor ústa.
move	pohybovať sa; presunúť	Presuň stoličku sem.
movie	film	Dnes večer pozeráme film.
much	veľa; koľko	Koľko to stojí?
mum	mama	Mama je doma.
museum	múzeum	Múzeum sa otvára o desiatej.
music	hudba	Počúvam hudbu.
must modal	musieť	Musíš tu zastaviť.
my	môj; moja	Toto je moja kniha.
name	meno; pomenovať	Napíš sem svoje meno.
natural	prirodzený; prírodný	Táto šťava je prírodná.
near	blízko	Banka je blízko.
need	potrebovať	Potrebujem pero.
negative	negatívny; záporný	Táto odpoveď je záporná.
neighbour	sused	Môj sused je priateľský.
never	nikdy	Nikdy nepijem kávu.
new	nový	Tento telefón je nový.
news	správy	Dnešné správy sú dobré.
newspaper	noviny	Číta noviny.
next	ďalší; nasledujúci	Ďalší autobus mešká.
next to	vedľa	Sadni si vedľa mňa.
nice	milý; príjemný	Izba je príjemná.
night	noc	Spím v noci.
nine	deväť	Je tu deväť študentov.
nineteen	devätnásť	Má devätnásť rokov.
ninety	deväťdesiat	Môj starý otec má deväťdesiat rokov.
no	nie; žiadny	Nie, ďakujem.
no one	nikto	V izbe nikto nie je.
nobody	nikto	Doma nikto nie je.
north	sever	Stanica je na severe.
nose	nos	Môj nos je studený.
not	nie	Nie som unavený.
note	poznámka; zápis	Napíš poznámku teraz.
nothing	nič	V krabici nič nie je.
November	november	Môj kurz sa začína v novembri.
now	teraz	Príď sem teraz.
number	číslo	Napíš sem číslo.
nurse	zdravotná sestra; ošetrovateľ	Zdravotná sestra je milá.
object	predmet; objekt	Polož predmet na stôl.
o’clock	hodín	Hodina sa začína o deviatej.
October	október	Cestujeme v októbri.
of	z; od	Toto je šálka čaju.
off	vypnutý; preč	Vypni svetlo.
office	kancelária	Moja kancelária je malá.
often	často	Často chodím do školy pešo.
oh	ach; aha	Aha, už rozumiem.
OK	dobre; v poriadku	Je to v poriadku?
old	starý	Tento dom je starý.
on	na; zapnutý	Kniha je na stole.
once	raz	Volám raz týždenne.
one	jeden	Mám jednu sestru.
onion	cibuľa	Nakrájaj jednu cibuľu.
online	online; na internete	Učím sa online.
only	len; iba	Mám len jednu tašku.
open	otvorený; otvoriť	Otvor okno.
opinion	názor	Aký je tvoj názor?
opposite	oproti; opačný	Obchod je oproti banke.
or	alebo	Čaj alebo kávu?
orange	pomaranč; oranžový	Pomaranč je sladký.
order	objednávka; objednať	Objednávam si polievku.
other	iný; ďalší	Použi druhé dvere.
our	náš	Toto je naša trieda.
out	von	Choď von po obede.
outside	vonku	Deti sa hrajú vonku.
over	nad; cez	Lietadlo letí nad mestom.
own	vlastný; vlastniť	Mám vlastnú izbu.
page	strana; stránka	Otvor stranu desať.
paint	farba; maľovať	Namaľuj stenu namodro.
painting	obraz; maľba	Ten obraz je krásny.
pair	pár	Potrebujem pár ponožiek.
paper	papier	Napíš to na tento papier.
paragraph	odsek	Prečítaj prvý odsek.
parent	rodič	Jeden rodič čaká vonku.
park	park; parkovať	Parkujeme blízko stanice.
part	časť	Táto časť je ľahká.
partner	partner; dvojica	Pracuj so svojím partnerom.
party	večierok; oslava	Večierok sa začína o siedmej.
passport	pas	Ukáž svoj pas.
past	minulosť; po	Je pol siedmej.
pay	platiť; zaplatiť	Platím kartou.
pen	pero	Toto pero je modré.
pencil	ceruzka	Píšem ceruzkou.
people	ľudia	Je tu veľa ľudí.
pepper	korenie; čierne korenie	Pridaj korenie do polievky.
perfect	dokonalý	Tvoja odpoveď je dokonalá.
period	obdobie; hodina	Táto hodina je krátka.
person	osoba; človek	Jedna osoba čaká.
personal	osobný	Toto je môj osobný telefón.
phone	telefón; telefonovať	Môj telefón je v taške.
photo	fotka; fotografia	Urob tu fotku.
photograph	fotografia; fotografovať	Fotografia je stará.
phrase	fráza; slovné spojenie	Zopakuj túto frázu.
piano	klavír	Hrá na klavíri.
picture	obrázok; obraz	Pozri sa na obrázok.
piece	kus; kúsok	Vezmi si kúsok koláča.
pig	prasa	Prasa je na farme.
pink	ružový	Jej taška je ružová.
place	miesto; položiť	Miesto je tiché.
plan	plán	Potrebujeme plán.
plane	lietadlo	Lietadlo mešká.
plant	rastlina; zasadiť	Polej rastlinu dnes.
play	hrať; hra	Deti sa hrajú v parku.
player	hráč	Hráč beží rýchlo.
please	prosím	Sadni si sem, prosím.
point	bod; myšlienka	Tento bod je dôležitý.
police	polícia	Polícia je vonku.
policeman	policajt	Policajt nám pomáha.
pool	bazén	Bazén je studený.
poor	chudobný; úbohý	Chudobné dieťa je hladné.
popular	obľúbený; populárny	Táto pieseň je obľúbená.
positive	pozitívny; kladný	Výsledok je pozitívny.
possible	možný	Je to dnes možné?
post	príspevok; poslať	Čítam jej príspevok online.
potato	zemiak	Jem jeden zemiak.
pound	libra	Stojí to jednu libru.
practice	cvičenie; prax	Cvičenie pomáha každý deň.
practise	cvičiť; precvičovať	Cvičím angličtinu každý deň.
prefer	uprednostňovať	Dávam prednosť čaju.
prepare	pripraviť	Priprav si tašku večer.
present	prítomný; darček	Dnes je prítomná.
pretty	pekný; celkom	Záhrada je pekná.
price	cena	Cena je nízka.
probably	pravdepodobne	Pravdepodobne to vie.
problem	problém	Problém je malý.
product	produkt; výrobok	Výrobok je nový.
programme	program; relácia	Program sa začína teraz.
project	projekt	Náš projekt je hotový.
purple	fialový	Košeľa je fialová.
put	dať; položiť	Polož knihu sem.
quarter	štvrť; štvrtina	Je štvrť na tri.
question	otázka	Polož jednu otázku.
quick	rýchly; krátky	Toto je krátky test.
quickly	rýchlo	Choď rýchlo.
quiet	tichý	Knižnica je tichá.
quite	celkom	Izba je celkom malá.
radio	rádio	Rádio je hlasné.
rain	dážď; pršať	Teraz začína pršať.
read	čítať	Prečítaj túto vetu.
reader	čitateľ	Čitateľ má rád príbeh.
reading	čítanie	Čítanie mi pomáha učiť sa.
ready	pripravený; hotový	Večera je hotová.
real	skutočný; ozajstný	Je tu skutočný problém.
really	naozaj	Naozaj mám rád túto pieseň.
reason	dôvod	Povedz mi dôvod.
red	červený	Dvere sú červené.
relax	odpočívať; relaxovať	Oddýchni si po práci.
remember	pamätať si; spomenúť si	Pamätaj si svoj pas.
repeat	opakovať	Zopakuj vetu.
report	správa; report	Prečítaj správu večer.
restaurant	reštaurácia	Reštaurácia je plná.
result	výsledok	Výsledok je dobrý.
return	vrátiť sa; vrátiť	Vráť knihu zajtra.
rice	ryža	Jem ryžu na obed.
rich	bohatý	Toto mesto je bohaté.
ride	ísť; jazda	Idem do školy na bicykli.
right	pravý; správny	Odboč tu doprava.
river	rieka	Rieka je široká.
road	cesta; ulica	Cesta je dlhá.
room	izba; miestnosť	Moja izba je čistá.
routine	rutina; režim	Moja rutina sa začína skoro.
rule	pravidlo	Pravidlo je jednoduché.
run	bežať	Behám každé ráno.
sad	smutný	Dnes je smutný.
salad	šalát	Šalát je čerstvý.
salt	soľ	Pridaj trochu soli.
same	rovnaký	Máme rovnakú tašku.
sandwich	sendvič	Jem sendvič.
Saturday	sobota	Stretneme sa v sobotu.
say	povedať; hovoriť	Povedz svoje meno.
school	škola	Moja škola je blízko.
science	veda; prírodné vedy	Učím sa prírodné vedy.
scientist	vedec; vedkyňa	Vedec kladie otázku.
sea	more	More je modré.
second1 (unit of time)	sekunda	Počkaj jednu sekundu.
section	časť; oddiel	Prečítaj túto časť.
see	vidieť	Vidím svojho kamaráta.
sell	predávať	Predávajú čerstvé ovocie.
send	poslať; posielať	Pošli správu teraz.
sentence	veta	Napíš jednu vetu.
September	september	Škola sa začína v septembri.
seven	sedem	Je tu sedem ľudí.
seventeen	sedemnásť	Má sedemnásť rokov.
seventy	sedemdesiat	Moja babička má sedemdesiat rokov.
share	zdieľať; rozdeliť	Rozdeľ koláč.
she	ona	Ona je moja sestra.
sheep	ovca	Ovca žerie trávu.
shirt	košeľa	Košeľa je čistá.
shoe	topánka	Topánka je pod posteľou.
shop	obchod; nakupovať	Obchod sa zatvára skoro.
shopping	nakupovanie	Nakupovanie je dnes zábavné.
short	krátky	Príbeh je krátky.
should modal	mal by; mala by	Dnes by si mal odpočívať.
show	ukázať; relácia	Ukáž mi svoj lístok.
shower	sprcha; sprchovať sa	Ráno sa sprchujem.
sick	chorý	Dnes som chorý.
similar	podobný	Naše tašky sú podobné.
sing	spievať	Spievam v triede.
singer	spevák; speváčka	Spevák je slávny.
sister	sestra	Moja sestra je mladá.
sit	sedieť; sadnúť si	Sadni si pri okne.
situation	situácia	Situácia je nová.
six	šesť	Je tu šesť kníh.
sixteen	šestnásť	Má šestnásť rokov.
sixty	šesťdesiat	Môj otec má šesťdesiat rokov.
skill	zručnosť	Táto zručnosť je užitočná.
skirt	sukňa	Sukňa je modrá.
sleep	spať; spánok	Spím osem hodín.
slow	pomalý	Autobus je pomalý.
small	malý	Izba je malá.
snake	had	Had je dlhý.
snow	sneh; snežiť	V zime sneží.
so	takže; tak	Som unavený, takže oddychujem.
some	nejaký; niekoľko	Potrebujem trochu vody.
somebody	niekto	Niekto je pri dverách.
someone	niekto	Niekto nechal správu.
something	niečo	Potrebujem niečo na pitie.
sometimes	niekedy; občas	Niekedy chodím do školy pešo.
son	syn	Jej syn je v škole.
song	pieseň	Táto pieseň je nová.
soon	čoskoro	Uvidíme sa čoskoro.
sorry	prepáč; ľúto	Prepáč.
sound	zvuk; znieť	Ten zvuk je hlasný.
soup	polievka	Polievka je horúca.
south	juh	Hotel je na juhu.
space	priestor; vesmír	Je tu miesto pre stoličku.
speak	hovoriť	Hovor pomaly, prosím.
special	zvláštny; špeciálny	Dnes je špeciálny deň.
spell	hláskovať	Hláskuj svoje meno.
spelling	pravopis; hláskovanie	Skontroluj pravopis.
spend	minúť; stráviť	Míňam peniaze na jedlo.
sport	šport	Futbal je obľúbený šport.
spring	jar; pružina	Kvety rastú na jar.
stand	stáť	Stoj pri dverách.
star	hviezda	Vidím jasnú hviezdu.
start	začať; začiatok	Začni hodinu teraz.
statement	vyhlásenie; tvrdenie	Tvrdenie je pravdivé.
station	stanica; nádražie	Stanica je blízko.
stay	zostať	Zostaň dnes doma.
still	stále; ešte	Stále som hladný.
stop	zastaviť; prestať; zastávka	Zastav na rohu ulice.
story	príbeh	Povedz mi príbeh.
street	ulica	Ulica je tichá.
strong	silný	Je silný.
student	študent	Študent číta knihu.
study	študovať; štúdium	Študujem angličtinu.
style	štýl	Páči sa mi tento štýl.
subject	predmet; téma	Angličtina je môj hlavný predmet.
success	úspech	Úspech vyžaduje prax.
sugar	cukor	Daj cukor do čaju.
summer	leto	Leto je tu horúce.
sun	slnko	Slnko je jasné.
Sunday	nedeľa	V nedeľu oddychujeme.
supermarket	supermarket	Supermarket je otvorený.
sure	istý; určite	Som si istý.
sweater	sveter	Môj sveter je teplý.
swim	plávať	Plávam každý týždeň.
swimming	plávanie	Plávanie je dobré cvičenie.
table	stôl	Kľúče sú na stole.`;

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
      throw new Error(`Slovak example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Slovak display/example must contain Latin text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Slovak display/example contains non-Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Slovak translation row for ${sourceHeadword}`);
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
    "Generate HU support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after HU.",
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
    throw new Error("Usage: node scripts/oxford/build-oxford-part003-support-translation-batch-sk.mjs --contract=<contract.json>");
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const outputPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_sk_v1.jsonl";
  const summaryPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_sk_v1_summary.md";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== "oxford_3000_core_a1_part_003_300_v1") {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(SK_TRANSLATIONS_TSV);

  if (rows.length !== 300) {
    throw new Error(`Expected 300 Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Slovak translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Slovak translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Slovak
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: SK Latin-script display/example cells with Slovak diacritics allowed and no non-Latin script leakage
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
