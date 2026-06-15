#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "CS";
const BATCH_ID = "cs_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-cs.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zÀ-ÿ]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const CS_TRANSLATIONS_TSV = `source_headword	CS	example_CS
machine	stroj; zařízení	Stroj dělá kávu.
magazine	časopis	Čte hudební časopis.
main	hlavní	Toto jsou hlavní dveře.
make	dělat; vyrobit	Dělám oběd doma.
man	muž	Ten muž je můj učitel.
many	mnoho; hodně	Je tu mnoho studentů.
map	mapa	Podívej se na mapu.
March	březen	Narozeniny mám v březnu.
market	trh	Kupujeme ovoce na trhu.
married	ženatý; vdaná	Moje sestra je vdaná.
May	květen	Škola končí v květnu.
maybe	možná	Možná bude pršet.
me	mě; mne	Pomoz mi, prosím.
meal	jídlo; pokrm	Toto jídlo je teplé.
mean	znamenat	Co znamená ta značka?
meaning	význam	Jaký je význam?
meat	maso	Jím maso k večeři.
meet	potkat; setkat se	Setkáme se po škole.
meeting	schůzka; setkání	Schůzka začíná teď.
member	člen	Je členem klubu.
menu	jídelní lístek; menu	Přečti si jídelní lístek.
message	zpráva	Posílám krátkou zprávu.
metre	metr	Jdi jeden metr dopředu.
midnight	půlnoc	Vlak odjíždí o půlnoci.
mile	míle	Jdeme jednu míli.
milk	mléko	Piju mléko k snídani.
million	milion	Žije tu milion lidí.
minute1	minuta	Počkej jednu minutu.
miss	postrádat; zmeškat	Postrádám svou starou školu.
mistake	chyba	V odpovědi je jedna chyba.
model	model	Toto je malý model.
modern	moderní	Kuchyně je moderní.
moment	chvíle; okamžik	Počkej chvíli.
Monday	pondělí	V pondělí začínáme pracovat.
money	peníze	Potřebuji trochu peněz.
month	měsíc	Červen je teplý měsíc.
more	více; další	Potřebuji více času.
morning	ráno	Ráno se učím.
most	většina; nejvíce	Většina studentů má ráda hudbu.
mother	matka; máma	Moje matka dnes pracuje.
mountain	hora	Ta hora je velmi vysoká.
mouse	myš	Pod židlí je myš.
mouth	ústa	Otevři ústa.
move	pohybovat se; přesunout	Přesuň židli sem.
movie	film	Dnes večer se díváme na film.
much	hodně; kolik	Kolik to stojí?
mum	máma	Máma je doma.
museum	muzeum	Muzeum se otevírá v deset.
music	hudba	Poslouchám hudbu.
must modal	muset	Musíš tady zastavit.
my	můj; moje	Toto je moje kniha.
name	jméno; pojmenovat	Napiš sem své jméno.
natural	přirozený; přírodní	Tato šťáva je přírodní.
near	blízko	Banka je blízko.
need	potřebovat	Potřebuji pero.
negative	negativní; záporný	Tato odpověď je záporná.
neighbour	soused	Můj soused je přátelský.
never	nikdy	Nikdy nepiju kávu.
new	nový	Tento telefon je nový.
news	zprávy	Dnešní zprávy jsou dobré.
newspaper	noviny	Čte noviny.
next	další; příští	Další autobus má zpoždění.
next to	vedle	Posaď se vedle mě.
nice	milý; příjemný	Pokoj je příjemný.
night	noc	Spím v noci.
nine	devět	Je tu devět studentů.
nineteen	devatenáct	Je jí devatenáct let.
ninety	devadesát	Mému dědovi je devadesát.
no	ne; žádný	Ne, děkuji.
no one	nikdo	V pokoji nikdo není.
nobody	nikdo	Doma nikdo není.
north	sever	Stanice je na severu.
nose	nos	Můj nos je studený.
not	ne	Nejsem unavený.
note	poznámka; zápis	Napiš poznámku teď.
nothing	nic	V krabici nic není.
November	listopad	Můj kurz začíná v listopadu.
now	teď	Přijď sem teď.
number	číslo	Napiš sem číslo.
nurse	zdravotní sestra; ošetřovatel	Zdravotní sestra je milá.
object	předmět; objekt	Polož předmět na stůl.
o’clock	hodin	Hodina začíná v devět hodin.
October	říjen	Cestujeme v říjnu.
of	z; od	Toto je šálek čaje.
off	vypnutý; pryč	Vypni světlo.
office	kancelář	Moje kancelář je malá.
often	často	Často chodím do školy pěšky.
oh	ach; aha	Aha, už rozumím.
OK	dobře; v pořádku	Je to v pořádku?
old	starý	Tento dům je starý.
on	na; zapnutý	Kniha je na stole.
once	jednou	Volám jednou týdně.
one	jeden	Mám jednu sestru.
onion	cibule	Nakrájej jednu cibuli.
online	online; na internetu	Učím se online.
only	jen; pouze	Mám jen jednu tašku.
open	otevřený; otevřít	Otevři okno.
opinion	názor	Jaký je tvůj názor?
opposite	naproti; opačný	Obchod je naproti bance.
or	nebo	Čaj nebo kávu?
orange	pomeranč; oranžový	Pomeranč je sladký.
order	objednávka; objednat	Objednávám polévku.
other	jiný; další	Použij druhé dveře.
our	náš	Toto je naše třída.
out	ven	Jdi ven po obědě.
outside	venku	Děti si hrají venku.
over	nad; přes	Letadlo letí nad městem.
own	vlastní; vlastnit	Mám vlastní pokoj.
page	stránka	Otevři stránku deset.
paint	barva; malovat	Namaluj zeď modře.
painting	obraz; malba	Ten obraz je krásný.
pair	pár	Potřebuji pár ponožek.
paper	papír	Napiš to na tento papír.
paragraph	odstavec	Přečti první odstavec.
parent	rodič	Jeden rodič čeká venku.
park	park; parkovat	Parkujeme blízko stanice.
part	část	Tato část je snadná.
partner	partner; dvojice	Pracuj se svým partnerem.
party	večírek; oslava	Večírek začíná v sedm.
passport	pas	Ukaž svůj pas.
past	minulost; po	Je půl sedmé.
pay	platit; zaplatit	Platím kartou.
pen	pero	Toto pero je modré.
pencil	tužka	Píšu tužkou.
people	lidé	Je tu hodně lidí.
pepper	pepř	Přidej pepř do polévky.
perfect	dokonalý	Tvoje odpověď je dokonalá.
period	období; hodina	Tato hodina je krátká.
person	osoba; člověk	Jedna osoba čeká.
personal	osobní	Toto je můj osobní telefon.
phone	telefon; telefonovat	Můj telefon je v tašce.
photo	fotka; fotografie	Udělej tady fotku.
photograph	fotografie; fotografovat	Fotografie je stará.
phrase	fráze; slovní spojení	Zopakuj tuto frázi.
piano	klavír	Hraje na klavír.
picture	obrázek; obraz	Podívej se na obrázek.
piece	kus; kousek	Vezmi si kousek dortu.
pig	prase	Prase je na farmě.
pink	růžový	Její taška je růžová.
place	místo; položit	Místo je tiché.
plan	plán	Potřebujeme plán.
plane	letadlo	Letadlo má zpoždění.
plant	rostlina; zasadit	Zalij rostlinu dnes.
play	hrát; hra	Děti si hrají v parku.
player	hráč	Hráč běží rychle.
please	prosím	Posaď se sem, prosím.
point	bod; myšlenka	Tento bod je důležitý.
police	policie	Policie je venku.
policeman	policista	Policista nám pomáhá.
pool	bazén	Bazén je studený.
poor	chudý; ubohý	Chudé dítě má hlad.
popular	oblíbený; populární	Tato píseň je oblíbená.
positive	pozitivní; kladný	Výsledek je pozitivní.
possible	možný	Je to dnes možné?
post	příspěvek; poslat	Čtu její příspěvek online.
potato	brambor	Jím jeden brambor.
pound	libra	Stojí to jednu libru.
practice	cvičení; praxe	Cvičení pomáhá každý den.
practise	cvičit; procvičovat	Cvičím angličtinu každý den.
prefer	dávat přednost	Dávám přednost čaji.
prepare	připravit	Připrav si tašku večer.
present	přítomný; dárek	Dnes je přítomná.
pretty	hezký; docela	Zahrada je hezká.
price	cena	Cena je nízká.
probably	pravděpodobně	Pravděpodobně to ví.
problem	problém	Problém je malý.
product	produkt; výrobek	Výrobek je nový.
programme	program; pořad	Program začíná teď.
project	projekt	Náš projekt je hotový.
purple	fialový	Košile je fialová.
put	dát; položit	Polož knihu sem.
quarter	čtvrt; čtvrtina	Je čtvrt na tři.
question	otázka	Polož jednu otázku.
quick	rychlý; krátký	Toto je krátký test.
quickly	rychle	Jdi rychle.
quiet	tichý	Knihovna je tichá.
quite	docela	Pokoj je docela malý.
radio	rádio	Rádio je hlasité.
rain	déšť; pršet	Teď začíná pršet.
read	číst	Přečti tuto větu.
reader	čtenář	Čtenář má rád příběh.
reading	čtení	Čtení mi pomáhá učit se.
ready	připravený; hotový	Večeře je hotová.
real	skutečný; opravdový	Je tu skutečný problém.
really	opravdu	Opravdu mám rád tuto píseň.
reason	důvod	Řekni mi důvod.
red	červený	Dveře jsou červené.
relax	odpočívat; relaxovat	Odpočiň si po práci.
remember	pamatovat si; vzpomenout si	Pamatuj si svůj pas.
repeat	opakovat	Zopakuj větu.
report	zpráva; report	Přečti zprávu večer.
restaurant	restaurace	Restaurace je plná.
result	výsledek	Výsledek je dobrý.
return	vrátit se; vrátit	Vrať knihu zítra.
rice	rýže	Jím rýži k obědu.
rich	bohatý	Toto město je bohaté.
ride	jet; jízda	Jedu do školy na kole.
right	pravý; správný	Zahni tady doprava.
river	řeka	Řeka je široká.
road	silnice; cesta	Cesta je dlouhá.
room	pokoj; místnost	Můj pokoj je čistý.
routine	rutina; režim	Moje rutina začíná brzy.
rule	pravidlo	Pravidlo je jednoduché.
run	běžet	Běhám každé ráno.
sad	smutný	Dnes je smutný.
salad	salát	Salát je čerstvý.
salt	sůl	Přidej trochu soli.
same	stejný	Máme stejnou tašku.
sandwich	sendvič	Jím sendvič.
Saturday	sobota	Setkáme se v sobotu.
say	říct; říkat	Řekni své jméno.
school	škola	Moje škola je blízko.
science	věda; přírodní vědy	Učím se přírodní vědy.
scientist	vědec; vědkyně	Vědec klade otázku.
sea	moře	Moře je modré.
second1 (unit of time)	sekunda	Počkej jednu sekundu.
section	část; oddíl	Přečti tuto část.
see	vidět	Vidím svého kamaráda.
sell	prodávat	Prodávají čerstvé ovoce.
send	poslat; posílat	Pošli zprávu teď.
sentence	věta	Napiš jednu větu.
September	září	Škola začíná v září.
seven	sedm	Je tu sedm lidí.
seventeen	sedmnáct	Je mu sedmnáct let.
seventy	sedmdesát	Mé babičce je sedmdesát.
share	sdílet; rozdělit	Rozděl dort.
she	ona	Ona je moje sestra.
sheep	ovce	Ovce jí trávu.
shirt	košile	Košile je čistá.
shoe	bota	Bota je pod postelí.
shop	obchod; nakupovat	Obchod zavírá brzy.
shopping	nakupování	Nakupování je dnes zábavné.
short	krátký	Příběh je krátký.
should modal	měl by; měla by	Dnes bys měl odpočívat.
show	ukázat; pořad	Ukaž mi svůj lístek.
shower	sprcha; sprchovat se	Ráno se sprchuji.
sick	nemocný	Dnes jsem nemocný.
similar	podobný	Naše tašky jsou podobné.
sing	zpívat	Zpívám ve třídě.
singer	zpěvák; zpěvačka	Zpěvák je slavný.
sister	sestra	Moje sestra je mladá.
sit	sedět; posadit se	Posaď se u okna.
situation	situace	Situace je nová.
six	šest	Je tu šest knih.
sixteen	šestnáct	Je jí šestnáct let.
sixty	šedesát	Mému otci je šedesát.
skill	dovednost	Tato dovednost je užitečná.
skirt	sukně	Sukně je modrá.
sleep	spát; spánek	Spím osm hodin.
slow	pomalý	Autobus je pomalý.
small	malý	Pokoj je malý.
snake	had	Had je dlouhý.
snow	sníh; sněžit	V zimě sněží.
so	takže; tak	Jsem unavený, takže odpočívám.
some	nějaký; několik	Potřebuji trochu vody.
somebody	někdo	Někdo je u dveří.
someone	někdo	Někdo nechal zprávu.
something	něco	Potřebuji něco k pití.
sometimes	někdy; občas	Někdy chodím do školy pěšky.
son	syn	Její syn je ve škole.
song	píseň	Tato píseň je nová.
soon	brzy	Uvidíme se brzy.
sorry	promiň; líto	Promiň.
sound	zvuk; znít	Ten zvuk je hlasitý.
soup	polévka	Polévka je horká.
south	jih	Hotel je na jihu.
space	prostor; vesmír	Je tu místo pro židli.
speak	mluvit	Mluv pomalu, prosím.
special	zvláštní; speciální	Dnes je zvláštní den.
spell	hláskovat	Hláskuj své jméno.
spelling	pravopis; hláskování	Zkontroluj pravopis.
spend	utratit; strávit	Utrácím peníze za jídlo.
sport	sport	Fotbal je oblíbený sport.
spring	jaro; pružina	Květiny rostou na jaře.
stand	stát	Stůj u dveří.
star	hvězda	Vidím jasnou hvězdu.
start	začít; začátek	Začni hodinu teď.
statement	prohlášení; tvrzení	Tvrzení je pravdivé.
station	stanice; nádraží	Stanice je blízko.
stay	zůstat	Zůstaň dnes doma.
still	stále; pořád	Mám pořád hlad.
stop	zastavit; přestat; zastávka	Zastav na rohu ulice.
story	příběh	Řekni mi příběh.
street	ulice	Ulice je tichá.
strong	silný	Je silný.
student	student	Student čte knihu.
study	studovat; studie	Studuji angličtinu.
style	styl	Líbí se mi tento styl.
subject	předmět; téma	Angličtina je můj hlavní předmět.
success	úspěch	Úspěch vyžaduje praxi.
sugar	cukr	Dej cukr do čaje.
summer	léto	Léto je tady horké.
sun	slunce	Slunce je jasné.
Sunday	neděle	V neděli odpočíváme.
supermarket	supermarket	Supermarket je otevřený.
sure	jistý; určitě	Jsem si jistý.
sweater	svetr	Můj svetr je teplý.
swim	plavat	Plavu každý týden.
swimming	plavání	Plavání je dobré cvičení.
table	stůl	Klíče jsou na stole.`;

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
      throw new Error(`Czech example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Czech display/example must contain Latin text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Czech display/example contains non-Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Czech translation row for ${sourceHeadword}`);
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
    "Generate SK support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after SK.",
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
    throw new Error("Usage: node scripts/oxford/build-oxford-part003-support-translation-batch-cs.mjs --contract=<contract.json>");
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const outputPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_cs_v1.jsonl";
  const summaryPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_cs_v1_summary.md";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== "oxford_3000_core_a1_part_003_300_v1") {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(CS_TRANSLATIONS_TSV);

  if (rows.length !== 300) {
    throw new Error(`Expected 300 Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Czech translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Czech translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Czech
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: CS Latin-script display/example cells with Czech diacritics allowed and no non-Latin script leakage
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
