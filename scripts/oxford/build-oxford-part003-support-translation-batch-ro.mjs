#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_003_300_v1";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_ro_article_display_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_ro_article_display_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-ro.mjs";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "RO";
const BATCH_ID = "ro_article_display_v1";
const RELEASE_ENTRY_COUNT = 300;
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const RO_TRANSLATIONS_TSV = `source_headword	RO	example_RO
machine	o mașină; un aparat	Mașina face cafea.
magazine	o revistă	Citește o revistă de muzică.
main	principal	Aceasta este ușa principală.
make	a face; a pregăti	Pregătesc prânzul acasă.
man	un bărbat	Bărbatul este profesorul meu.
many	mulți; multe	Sunt mulți studenți aici.
map	o hartă	Uită-te la hartă.
March	martie	Ziua mea este în martie.
market	o piață	Cumpărăm fructe la piață.
married	căsătorit	Sora mea este căsătorită.
May	mai	Școala se termină în mai.
maybe	poate	Poate va ploua.
me	pe mine; mie	Ajută-mă, te rog.
meal	o masă; o mâncare	Mâncarea este caldă.
mean	a însemna	Ce înseamnă semnul?
meaning	un sens; o semnificație	Care este sensul?
meat	carne	Mănânc carne la cină.
meet	a întâlni; a se întâlni	Ne întâlnim după școală.
meeting	o întâlnire; o ședință	Întâlnirea începe acum.
member	un membru; o membră	Ea este membră a clubului.
menu	un meniu	Citește meniul.
message	un mesaj	Trimit un mesaj scurt.
metre	un metru	Mergi un metru înainte.
midnight	miezul nopții	Trenul pleacă la miezul nopții.
mile	o milă	Mergem o milă pe jos.
milk	lapte	Beau lapte la micul dejun.
million	un milion	Aici locuiesc un milion de oameni.
minute1	un minut	Așteaptă un minut.
miss	a rata; a-i fi dor	Mi-e dor de vechea școală.
mistake	o greșeală	Este o greșeală în răspuns.
model	un model	Acesta este un model mic.
modern	modern	Bucătăria este modernă.
moment	un moment; o clipă	Așteaptă un moment.
Monday	luni	Începem munca luni.
money	bani	Am nevoie de puțini bani.
month	o lună	Iunie este o lună caldă.
more	mai mult; mai mulți	Am nevoie de mai mult timp.
morning	o dimineață	Învăț dimineața.
most	majoritatea; cel mai mult	Majoritatea studenților iubesc muzica.
mother	o mamă	Mama mea lucrează azi.
mountain	un munte	Muntele este foarte înalt.
mouse	un șoarece	Un șoarece este sub scaun.
mouth	o gură	Deschide gura.
move	a muta; a se mișca	Mută scaunul aici.
movie	un film	Vedem un film diseară.
much	mult; multă	Cât costă?
mum	mama	Mama este acasă.
museum	un muzeu	Muzeul se deschide la zece.
music	muzică	Ascult muzică.
must modal	trebuie	Trebuie să te oprești aici.
my	meu; mea; mei; mele	Aceasta este cartea mea.
name	un nume; a numi	Scrie-ți numele aici.
natural	natural	Acest suc este natural.
near	aproape	Banca este aproape.
need	a avea nevoie; o nevoie	Am nevoie de un stilou.
negative	negativ	Acest răspuns este negativ.
neighbour	un vecin; o vecină	Vecinul meu este prietenos.
never	niciodată	Nu beau cafea niciodată.
new	nou	Telefonul acesta este nou.
news	știri	Știrile de azi sunt bune.
newspaper	un ziar	Citește un ziar.
next	următor	Următorul autobuz întârzie.
next to	lângă	Stai lângă mine.
nice	drăguț; plăcut	Camera este plăcută.
night	o noapte	Dorm noaptea.
nine	nouă	Sunt nouă studenți aici.
nineteen	nouăsprezece	Are nouăsprezece ani.
ninety	nouăzeci	Bunicul meu are nouăzeci de ani.
no	nu; niciun	Nu, mulțumesc.
no one	nimeni	Nu este nimeni în cameră.
nobody	nimeni	Nu este nimeni acasă.
north	nord	Gara este în nord.
nose	un nas	Nasul meu este rece.
not	nu	Nu sunt obosit.
note	o notă; un bilețel	Scrie o notă acum.
nothing	nimic	Nu este nimic în cutie.
November	noiembrie	Cursul meu începe în noiembrie.
now	acum	Vino aici acum.
number	un număr	Scrie numărul aici.
nurse	un asistent; o asistentă	Asistenta este amabilă.
object	un obiect	Pune obiectul pe masă.
o’clock	fix	Cursul începe la ora nouă.
October	octombrie	Călătorim în octombrie.
of	de; al; a	Este o ceașcă de ceai.
off	oprit; jos	Stinge lumina.
office	un birou	Biroul meu este mic.
often	des; adesea	Merg des pe jos la școală.
oh	oh; aha	Aha, acum înțeleg.
OK	bine; în regulă	Este în regulă?
old	vechi; în vârstă	Casa aceasta este veche.
on	pe; pornit	Cartea este pe masă.
once	o dată	Sun o dată pe săptămână.
one	unu; o; un	Am o soră.
onion	o ceapă	Taie o ceapă.
online	online; pe internet	Învăț online.
only	doar; numai	Am doar o geantă.
open	deschis; a deschide	Deschide fereastra.
opinion	o părere; o opinie	Care este părerea ta?
opposite	opus; vizavi	Magazinul este vizavi de bancă.
or	sau	Ceai sau cafea?
orange	o portocală; portocaliu	Portocala este dulce.
order	o comandă; a comanda	Comand supă.
other	alt; altă	Folosește cealaltă ușă.
our	nostru; noastră	Aceasta este clasa noastră.
out	afară	Ieși după prânz.
outside	afară; în exterior	Copiii se joacă afară.
over	peste; deasupra	Avionul zboară deasupra orașului.
own	propriu; a deține	Am propria mea cameră.
page	o pagină	Deschide pagina zece.
paint	vopsea; a picta	Vopsește peretele în albastru.
painting	un tablou; o pictură	Tabloul este frumos.
pair	o pereche	Am nevoie de o pereche de șosete.
paper	hârtie; o lucrare	Scrie pe această hârtie.
paragraph	un paragraf	Citește primul paragraf.
parent	un părinte	Un părinte așteaptă afară.
park	un parc; a parca	Parcăm lângă gară.
part	o parte	Această parte este ușoară.
partner	un partener; o parteneră	Lucrează cu partenerul tău.
party	o petrecere	Petrecerea începe la șapte.
passport	un pașaport	Arată pașaportul.
past	trecut; după	Este șase și jumătate.
pay	a plăti	Plătesc cu cardul.
pen	un pix; un stilou	Pixul acesta este albastru.
pencil	un creion	Scriu cu un creion.
people	oameni	Sunt mulți oameni aici.
pepper	piper	Pune piper în supă.
perfect	perfect	Răspunsul tău este perfect.
period	o perioadă; o oră	Ora aceasta este scurtă.
person	o persoană	O persoană așteaptă.
personal	personal	Acesta este telefonul meu personal.
phone	un telefon; a telefona	Telefonul meu este în geantă.
photo	o fotografie; o poză	Fă o poză aici.
photograph	o fotografie; a fotografia	Fotografia este veche.
phrase	o expresie	Repetă această expresie.
piano	un pian	Cântă la pian.
picture	o imagine; un tablou	Uită-te la imagine.
piece	o bucată	Ia o bucată de tort.
pig	un porc	Porcul este la fermă.
pink	roz	Geanta ei este roz.
place	un loc; a pune	Locul este liniștit.
plan	un plan	Avem nevoie de un plan.
plane	un avion	Avionul întârzie.
plant	o plantă; a planta	Udă planta azi.
play	a juca; a se juca; o piesă	Copiii se joacă în parc.
player	un jucător; o jucătoare	Jucătorul aleargă repede.
please	te rog; vă rog	Stai aici, te rog.
point	un punct; o idee	Acest punct este important.
police	poliția	Poliția este afară.
policeman	un polițist	Polițistul ne ajută.
pool	o piscină; un bazin	Piscina este rece.
poor	sărac	Copilul sărac este flămând.
popular	popular	Cântecul acesta este popular.
positive	pozitiv	Rezultatul este pozitiv.
possible	posibil	Este posibil azi?
post	o postare; poștă	Citesc postarea lui online.
potato	un cartof	Mănânc un cartof.
pound	o liră	Costă o liră.
practice	practică; exercițiu	Practica ajută în fiecare zi.
practise	a exersa	Exersez engleza zilnic.
prefer	a prefera	Prefer ceaiul.
prepare	a pregăti	Pregătește-ți geanta seara.
present	prezent; un cadou	El este prezent azi.
pretty	drăguț; destul de	Grădina este drăguță.
price	un preț	Prețul este mic.
probably	probabil	Probabil știe.
problem	o problemă	Problema este mică.
product	un produs	Produsul este nou.
programme	un program	Programul începe acum.
project	un proiect	Proiectul nostru este gata.
purple	mov; violet	Cămașa este mov.
put	a pune	Pune cartea aici.
quarter	un sfert	Este două și un sfert.
question	o întrebare	Pune o întrebare.
quick	rapid; scurt	Acesta este un test scurt.
quickly	repede	Mergi repede.
quiet	liniștit	Biblioteca este liniștită.
quite	destul de	Camera este destul de mică.
radio	un radio	Radioul este tare.
rain	ploaie; a ploua	Acum începe să plouă.
read	a citi	Citește această propoziție.
reader	un cititor; o cititoare	Cititorul iubește povestea.
reading	citire; lectură	Lectura ajută la învățare.
ready	gata; pregătit	Cina este gata.
real	real; adevărat	Există o problemă reală.
really	chiar; într-adevăr	Chiar îmi place acest cântec.
reason	un motiv	Spune motivul.
red	roșu	Ușa este roșie.
relax	a se relaxa	Relaxează-te după muncă.
remember	a-și aminti; a ține minte	Nu uita pașaportul.
repeat	a repeta	Repetă propoziția.
report	un raport	Citește raportul diseară.
restaurant	un restaurant	Restaurantul este plin.
result	un rezultat	Rezultatul este bun.
return	a se întoarce; a returna	Returnează cartea mâine.
rice	orez	Mănânc orez la prânz.
rich	bogat	Orașul acesta este bogat.
ride	a merge; a călări; o plimbare	Merg cu bicicleta la școală.
right	drept; corect	Fă dreapta aici.
river	un râu	Râul este lat.
road	un drum; o șosea	Drumul este lung.
room	o cameră	Camera mea este curată.
routine	o rutină	Rutina mea începe devreme.
rule	o regulă	Regula este simplă.
run	a alerga	Alerg în fiecare dimineață.
sad	trist	Sunt trist azi.
salad	o salată	Salata este proaspătă.
salt	sare	Adaugă puțină sare.
same	același; aceeași	Avem aceeași geantă.
sandwich	un sandviș	Mănânc un sandviș.
Saturday	sâmbătă	Ne întâlnim sâmbătă.
say	a spune	Spune-ți numele.
school	o școală	Școala mea este aproape.
science	știință	Studiez știința.
scientist	un om de știință; o cercetătoare	Omul de știință pune o întrebare.
sea	o mare	Marea este albastră.
second1 (unit of time)	o secundă	Așteaptă o secundă.
section	o secțiune	Citește această secțiune.
see	a vedea	Îmi văd prietenul.
sell	a vinde	Vând fructe proaspete.
send	a trimite	Trimite mesajul acum.
sentence	o propoziție	Scrie o propoziție.
September	septembrie	Școala începe în septembrie.
seven	șapte	Sunt șapte oameni aici.
seventeen	șaptesprezece	Are șaptesprezece ani.
seventy	șaptezeci	Bunica mea are șaptezeci de ani.
share	a împărți; a distribui	Împarte tortul.
she	ea	Ea este sora mea.
sheep	o oaie	Oaia mănâncă iarbă.
shirt	o cămașă	Cămașa este curată.
shoe	un pantof	Pantoful este sub pat.
shop	un magazin; a cumpăra	Magazinul se închide devreme.
shopping	cumpărături	Cumpărăturile sunt distractive azi.
short	scurt	Povestea este scurtă.
should modal	ar trebui	Ar trebui să te odihnești azi.
show	a arăta; un spectacol	Arată biletul.
shower	un duș; a face duș	Fac duș dimineața.
sick	bolnav	Sunt bolnav azi.
similar	similar; asemănător	Gențile noastre sunt asemănătoare.
sing	a cânta	Cânt la lecție.
singer	un cântăreț; o cântăreață	Cântărețul este celebru.
sister	o soră	Sora mea este tânără.
sit	a sta jos	Stai lângă fereastră.
situation	o situație	Situația este nouă.
six	șase	Sunt șase cărți aici.
sixteen	șaisprezece	Are șaisprezece ani.
sixty	șaizeci	Tatăl meu are șaizeci de ani.
skill	o abilitate; o competență	Această abilitate este utilă.
skirt	o fustă	Fusta este albastră.
sleep	a dormi; somn	Dorm opt ore.
slow	lent; încet	Autobuzul este lent.
small	mic	Camera este mică.
snake	un șarpe	Șarpele este lung.
snow	zăpadă; a ninge	Iarna ninge.
so	așa; deci	Sunt obosit, deci mă odihnesc.
some	niște; câțiva	Am nevoie de puțină apă.
somebody	cineva	Cineva este la ușă.
someone	cineva	Cineva a lăsat un mesaj.
something	ceva	Am nevoie de ceva de băut.
sometimes	uneori	Uneori merg pe jos la școală.
son	un fiu	Fiul ei este la școală.
song	un cântec	Cântecul acesta este nou.
soon	curând	Ne vedem curând.
sorry	scuze; îmi pare rău	Îmi pare rău.
sound	un sunet; a suna	Sunetul este tare.
soup	o supă	Supa este fierbinte.
south	sud	Hotelul este în sud.
space	un spațiu; loc	Este loc pentru un scaun.
speak	a vorbi	Vorbește încet, te rog.
special	special	Azi este o zi specială.
spell	a silabisi	Silabisește-ți numele.
spelling	ortografie; silabisire	Verifică ortografia.
spend	a cheltui; a petrece	Cheltuiesc bani pe mâncare.
sport	un sport	Fotbalul este un sport popular.
spring	primăvară; un arc	Primăvara cresc florile.
stand	a sta în picioare	Stai lângă ușă.
star	o stea	Văd o stea strălucitoare.
start	a începe; un început	Începe lecția acum.
statement	o afirmație; o declarație	Afirmația este adevărată.
station	o stație; o gară	Gara este aproape.
stay	a sta; a rămâne	Stai acasă azi.
still	încă	Încă îmi este foame.
stop	a opri; o oprire	Oprește-te la colț.
story	o poveste	Spune o poveste.
street	o stradă	Strada este liniștită.
strong	puternic	El este puternic.
student	un student; o studentă	Studentul citește o carte.
study	a studia; studiu	Studiez engleza.
style	un stil	Îmi place acest stil.
subject	un subiect; o materie	Engleza este materia mea principală.
success	succes	Succesul cere practică.
sugar	zahăr	Pune zahăr în ceai.
summer	vară	Vara este caldă aici.
sun	soare	Soarele este strălucitor.
Sunday	duminică	Ne odihnim duminică.
supermarket	un supermarket	Supermarketul este deschis.
sure	sigur; desigur	Sunt sigur.
sweater	un pulover	Puloverul meu este cald.
swim	a înota	Înot în fiecare săptămână.
swimming	înot	Înotul este un exercițiu bun.
table	o masă	Cheile sunt pe masă.`;

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
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Romanian rows, found ${lines.length}`);
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
      throw new Error(`Romanian example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Romanian display/example must contain Latin text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Romanian display/example contains non-Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Romanian translation row for ${sourceHeadword}`);
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
    "Generate BG support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after BG.",
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
  const translations = parseTsv(RO_TRANSLATIONS_TSV);

  if (rows.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Romanian translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Romanian translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(JSONL_PATH), { recursive: true });
  await writeFile(JSONL_PATH, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: included for Romanian noun displays where learner-useful
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: RO Latin-script display/example cells with Romanian diacritics allowed and no non-Latin script leakage
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
    next_language: "BG",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
