#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "RO";
const BATCH_ID = "ro_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-ro.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const RO_TRANSLATIONS_TSV = `source_headword	RO	example_RO
clothes	haine	Hainele mele sunt curate.
club	un club	Ea merge la un club de muzică.
coat	un palton; o haină	Paltonul meu este cald.
coffee	cafea	Beau cafea dimineața.
cold	rece; frig	Apa este rece.
college	o facultate; un colegiu	Sora mea studiază la facultate.
colour	o culoare	Culoarea mea preferată este albastrul.
come	a veni	Vino aici, te rog.
common	comun; obișnuit	Acest nume este comun.
company	o companie; o firmă	Mama lucrează la o firmă.
compare	a compara	Compară aceste două imagini.
complete	complet; a finaliza	Formularul este complet.
computer	un computer; un calculator	Acest calculator este nou.
concert	un concert	Mergem la concert diseară.
conversation	o conversație; o discuție	Am avut o conversație scurtă.
cook	a găti; un bucătar	Gătesc cina acasă.
cooking	gătit	Îmi place să gătesc cu tata.
cool	răcoros; grozav	Camera este răcoroasă.
correct	corect; a corecta	Răspunsul tău este corect.
cost	un cost; a costa	Cât costă?
could modal	a putea	Aș putea să te ajut.
country	o țară	Canada este o țară mare.
course	un curs	Urmez un curs de engleză.
cousin	un văr; o verișoară	Vărul meu locuiește aproape.
cow	o vacă	Vaca mănâncă iarbă.
cream	frișcă; o cremă	Pun frișcă în cafea.
create	a crea	Ei creează un joc nou.
culture	o cultură	Învățăm despre cultura locală.
cup	o cană; o ceașcă	Această cană este goală.
customer	un client	Clientul pune o întrebare.
cut	a tăia	Taie mărul în două.
dad	tată	Tata este la serviciu.
dance	a dansa; un dans	Dansăm după cină.
dancer	un dansator; o dansatoare	Dansatoarea se mișcă repede.
dancing	dans	Dansul este distractiv.
dangerous	periculos	Acest drum este periculos.
dark	întunecat; închis	Camera este întunecată.
date	o dată	Care este data de azi?
daughter	o fiică	Fiica ei are șase ani.
day	o zi	Îți doresc o zi frumoasă.
dear	drag; scump	Dragă prietene, mulțumesc.
December	decembrie	Ziua mea este în decembrie.
decide	a decide	Decide acum, te rog.
delicious	delicios	Această supă este delicioasă.
describe	a descrie	Descrie camera ta.
description	o descriere	Citește descrierea scurtă.
design	un design; a proiecta	Proiectez o carte simplă.
desk	un birou	Cartea este pe biroul meu.
detail	un detaliu	Lipsește un detaliu.
dialogue	un dialog	Citește dialogul acum.
dictionary	un dicționar	Folosește un dicționar la lecție.
die	a muri	Florile mor fără apă.
diet	o dietă; alimentație	Dieta mea include fructe.
difference	o diferență	Există o diferență.
different	diferit	Avem nume diferite.
difficult	dificil; greu	Această întrebare este dificilă.
dinner	o cină	Cina este gata.
dirty	murdar	Pantofii mei sunt murdari.
discuss	a discuta	Discutăm planul.
dish	o farfurie; un fel de mâncare	Această farfurie este fierbinte.
do1	a face	Ce faci?
doctor	un doctor; un medic	Doctorul este ocupat.
dog	un câine	Câinele aleargă afară.
dollar	un dolar	Costă un dolar.
door	o ușă	Închide ușa, te rog.
down	jos; în jos	Așază-te aici jos.
downstairs	la parter; jos	Bucătăria este la parter.
draw	a desena	Desenează o casă mică.
dress	o rochie; a se îmbrăca	Ea poartă o rochie roșie.
drink	o băutură; a bea	Beau apă.
drive	a conduce	Conduc la serviciu.
driver	un șofer	Șoferul oprește aici.
during	în timpul	Dorm în timpul zborului.
DVD	un DVD	Acest DVD este vechi.
each	fiecare	Fiecare copil are o carte.
ear	o ureche	Mă doare urechea.
early	devreme; timpuriu	Mă trezesc devreme.
east	est	Soarele răsare la est.
easy	ușor	Acest test este ușor.
eat	a mânca	Mâncăm prânzul împreună.
egg	un ou	Mănânc un ou.
eight	opt	Am opt cărți.
eighteen	optsprezece	Ea are optsprezece ani.
eighty	optzeci	Bunicul meu are optzeci de ani.
elephant	un elefant	Elefantul este mare.
eleven	unsprezece	Ora începe la unsprezece.
else	alt; altceva	Ce altceva îți trebuie?
email	un e-mail	Trimite-mi un e-mail.
end	un sfârșit; a se termina	Acesta este sfârșitul.
enjoy	a se bucura; a plăcea	Îmi place acest cântec.
enough	destul; suficient	Avem destul timp.
euro	un euro	Costă un euro.
even	chiar	Chiar și fratele meu știe.
evening	o seară	Ne întâlnim diseară.
event	un eveniment	Evenimentul începe azi.
ever	vreodată	Gătești vreodată?
every	fiecare	Învăț în fiecare zi.
everybody	toată lumea	Toată lumea este aici.
everyone	toată lumea	Toată lumea iubește muzica.
everything	totul	Totul este pregătit.
exam	un examen	Examenul începe curând.
example	un exemplu	Acesta este un exemplu bun.
excited	entuziasmat; emoționat	Sunt entuziasmat azi.
exciting	captivant; interesant	Jocul este captivant.
exercise	un exercițiu; a exersa	Fac exerciții înainte de micul dejun.
expensive	scump	Acest palton este scump.
explain	a explica	Explică acest cuvânt, te rog.
extra	extra; suplimentar	Am nevoie de timp suplimentar.
eye	un ochi	Ochiul meu este roșu.
face	o față	Spală-ți fața.
fact	un fapt	Acest fapt este important.
fall	a cădea; toamnă	Frunzele cad toamna.
false	fals; greșit	Acel răspuns este greșit.
family	o familie	Familia mea este mică.
famous	faimos; celebru	El este un cântăreț celebru.
fantastic	fantastic	Concertul a fost fantastic.
far	departe	Școala este departe.
farm	o fermă	Ei locuiesc la o fermă.
farmer	un fermier	Fermierul cultivă hrană.
fast	rapid	Acest tren este rapid.
fat	gras	Acea pisică este grasă.
father	un tată	Tatăl meu este înalt.
favourite	preferat	Acesta este cântecul meu preferat.
February	februarie	În februarie este frig aici.
feel	a simți	Mă simt fericit.
feeling	un sentiment	Cunosc acel sentiment.
festival	un festival	Festivalul începe mâine.
few	câțiva; câteva	Câțiva elevi sunt aici.
fifteen	cincisprezece	Am cincisprezece ani.
fifth	al cincilea; a cincea	Aceasta este a cincea lecție.
fifty	cincizeci	Mama mea are cincizeci de ani.
fill	a umple; a completa	Umple cana cu apă.
film	un film	Ne uităm la un film.
final	final; ultim	Aceasta este ultima întrebare.
find	a găsi	Îmi găsesc cheile.
fine	bine	Sunt bine acum.
finish	a termina	Termină-ți tema.
fire	foc	Focul este fierbinte.
first	primul; prima	El este primul la rând.
fish	pește	Mănânc pește la cină.
five	cinci	Am cinci cărți.
flat	un apartament	Apartamentul meu este mic.
flight	un zbor	Zborul întârzie.
floor	o podea; un etaj	Geanta este pe podea.
flower	o floare	Această floare este galbenă.
fly	a zbura	Păsările zboară pe cer.
follow	a urma; a urmări	Urmează-mă, te rog.
food	mâncare	Mâncarea este gata.
foot	un picior	Mă doare piciorul.
football	fotbal	Jucăm fotbal azi.
for	pentru	Acest cadou este pentru tine.
forget	a uita	Nu uita cheile.
form	un formular	Completează formularul.
forty	patruzeci	Tata are patruzeci de ani.
four	patru	Văd patru păsări.
fourteen	paisprezece	El are paisprezece ani.
fourth	al patrulea; a patra	Acesta este al patrulea etaj.
free	gratis; liber	Biletul este gratis.
Friday	vineri	Ne întâlnim vineri.
friend	un prieten	Prietenul meu este aici.
friendly	prietenos	Profesorul este prietenos.
from	din; de la	Sunt din România.
front	partea din față; față	Stai în față.
fruit	fructe	Mănânc fructe în fiecare zi.
full	plin	Paharul este plin.
fun	distracție	Jocul este distractiv.
funny	amuzant	Acest film este amuzant.
future	viitor	Mă gândesc la viitor.
game	un joc	Jucăm un joc nou.
garden	o grădină	Copiii sunt în grădină.
geography	geografie	Avem geografie luni.
get	a primi; a obține	Primesc un telefon nou.
girl	o fată	Fata citește o carte.
girlfriend	o iubită	Iubita lui este drăguță.
give	a da	Dă-mi cartea, te rog.
glass	un pahar; sticlă	Paharul este pe masă.
go	a merge	Mergem acasă acum.
good	bun	Aceasta este o idee bună.
goodbye	la revedere	Spune la revedere prietenilor.
grandfather	un bunic	Bunicul meu este blând.
grandmother	o bunică	Bunica mea face ceai.
grandparent	un bunic; o bunică	Fiecare bunic este important.
great	grozav	A fost o zi grozavă.
green	verde	Iarba este verde.
grey	gri	Cerul este gri.
group	un grup	Grupul nostru este mic.
grow	a crește	Plantele cresc repede.
guess	a ghici	Ghicește numele meu.
guitar	o chitară	Cânt la chitară.
gym	o sală de sport	Merg la sala de sport.
hair	păr	Părul ei este lung.
half	jumătate	Dă-mi jumătate.
hand	o mână	Ridică mâna.
happen	a se întâmpla	Ce s-a întâmplat?
happy	fericit	Sunt fericit azi.
hard	greu; tare	Această muncă este grea.
hat	o pălărie; o căciulă	Am o căciulă nouă.
hate	a urî	Urăsc ploaia rece.
have	a avea	Am o mașină.
have to modal	a trebui	Trebuie să plec acum.
he	el	El este fratele meu.
head	un cap	Mă doare capul.
health	sănătate	Sănătatea este importantă.
healthy	sănătos	Merele sunt sănătoase.
hear	a auzi	Aud muzică.
hello	salut	Spune salut profesorului.
help	ajutor; a ajuta	Am nevoie de ajutor.
her	ei; pe ea	Aceasta este geanta ei.
here	aici	Stai aici.
hey	hei; salut	Hei, vino aici.
hi	salut	Salut, sunt Ana.
high	înalt	Muntele este înalt.
him	lui; pe el	Îl văd.
his	lui	Aceasta este bicicleta lui.
history	istorie	Îmi place istoria.
hobby	un hobby; o pasiune	Pasiunea mea este cititul.
holiday	o vacanță; o sărbătoare	Vacanța noastră începe mâine.
home	acasă; casă	Merg acasă.
homework	temă	Îmi fac tema.
hope	a spera	Sper la vreme bună.
horse	un cal	Calul aleargă repede.
hospital	un spital	Spitalul este aproape.
hot	fierbinte; cald	Ceaiul este fierbinte.
hotel	un hotel	Hotelul este curat.
hour	o oră	Așteaptă o oră.
house	o casă	Casa noastră este mică.
how	cum	Cum te simți?
however	totuși	Pot totuși să rămân aici.
hundred	o sută	Au venit o sută de oameni.
hungry	flămând	Îmi este foame.
husband	un soț	Soțul ei este medic.
I	eu	Îmi place ceaiul.
ice	gheață	Gheața este rece.
ice cream	înghețată	Vreau înghețată.
idea	o idee	Este o idee bună.
if	dacă	Sună-mă dacă ai nevoie de ajutor.
imagine	a imagina	Imaginează-ți o casă mică.
important	important	Această lecție este importantă.
improve	a îmbunătăți	Vreau să-mi îmbunătățesc abilitățile.
in	în	Cheia este în geanta mea.
include	a include	Include numele tău, te rog.
information	informație; informații	Am nevoie de mai multe informații.
interest	interes	Are interes pentru artă.
interested	interesat	Sunt interesat de muzică.
interesting	interesant	Această carte este interesantă.
internet	internet	Internetul este lent.
interview	un interviu	Am un interviu azi.
into	în; înăuntru	Pune cheia în geantă.
introduce	a prezenta	Prezintă-ți prietenul.
island	o insulă	Insula este mică.
it	el; ea; acesta	Este pe masă.
its	al său; a sa	Câinele are bolul lui.
jacket	o jachetă	Jacheta mea este albastră.
January	ianuarie	În ianuarie este frig.
jeans	blugi	Port blugi în fiecare zi.
job	un loc de muncă; o slujbă	Caut un loc de muncă.
join	a se alătura	Alătură-te grupului nostru.
journey	o călătorie	Călătoria este lungă.
juice	suc	Beau suc de portocale.
July	iulie	În iulie este cald.
June	iunie	Ziua mea este în iunie.
just	tocmai; doar	Tocmai am sosit.
keep	a păstra	Păstrează restul.
key	o cheie	Unde este cheia mea?
kilometre	un kilometru	Școala este la un kilometru.
kind (type)	un fel; un tip	Ce fel de muzică îți place?
kitchen	o bucătărie	Bucătăria este curată.
know	a ști; a cunoaște	Știu răspunsul.
land	pământ; uscat	Vaporul este aproape de uscat.
language	o limbă	Învăț o limbă nouă.
large	mare	Avem o grădină mare.
last1 (final)	ultim	Aceasta este ultima pagină.
late	târziu	El ajunge târziu.
later	mai târziu	Te sun mai târziu.
laugh	a râde	Râdem împreună.
learn	a învăța	Învăț engleză.
leave	a pleca; a lăsa	Trebuie să plec acum.
left	stâng; la stânga	Virează la stânga.
leg	un picior	Mă doare piciorul.
lesson	o lecție	Lecția începe la nouă.
let	a lăsa	Lasă-mă să ajut.
letter	o scrisoare; o literă	Scriu o scrisoare.
library	o bibliotecă	Biblioteca este liniștită.
lie1	a sta întins; a minți	Stau întins pe pat.
life	viață	Viața este bună.
like (similar)	ca; asemănător	Arată ca fratele lui.
like (find sb/sth pleasant)	a plăcea	Îmi place această carte.
line	o linie; un rând	Stai la rând.
lion	un leu	Leul este puternic.
list	o listă	Scrie o listă.
listen	a asculta	Ascultă muzică.
little	mic; puțin	Am puțin timp.
live1	a trăi; a locui	Locuiesc în București.
local	local	Acesta este un magazin local.
long1	lung	Drumul este lung.
look	a privi; a arăta	Privește imaginea.
lose	a pierde	Nu pierde cheia.
lot	mult; o mulțime	Am multă muncă.
love	a iubi	Îmi iubesc familia.
lunch	prânz	Prânzul este gata.`;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_002_300_v1_contract_v0.json",
    outDir: "outputs/oxford-vocabulary/support-translations",
    examples: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--contract") {
      args.contract = argv[index + 1];
      index += 1;
    } else if (item.startsWith("--contract=")) {
      args.contract = item.slice("--contract=".length);
    } else if (item === "--out-dir") {
      args.outDir = argv[index + 1];
      index += 1;
    } else if (item.startsWith("--out-dir=")) {
      args.outDir = item.slice("--out-dir=".length);
    } else if (item === "--examples") {
      args.examples = argv[index + 1];
      index += 1;
    } else if (item.startsWith("--examples=")) {
      args.examples = item.slice("--examples=".length);
    } else {
      throw new Error(`Unknown argument: ${item}`);
    }
  }
  return args;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const raw = await readFile(filePath, "utf8");
  return raw
    .trim()
    .split(/\n/u)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${filePath}:${index + 1}: ${error.message}`);
      }
    });
}

async function writeJsonl(filePath, rows) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function parseTranslations() {
  const lines = RO_TRANSLATIONS_TSV.trim().split(/\n/u);
  const header = lines.shift();
  if (header !== `source_headword\t${LANGUAGE}\texample_${LANGUAGE}`) {
    throw new Error(`Unexpected TSV header: ${header}`);
  }
  const translations = new Map();
  for (const [index, line] of lines.entries()) {
    const cells = line.split("\t");
    if (cells.length !== 3) {
      throw new Error(`TSV row ${index + 2} must have exactly 3 tab-separated cells`);
    }
    const [sourceHeadword, display, example] = cells.map((cell) => cell.trim());
    if (!sourceHeadword || !display || !example) {
      throw new Error(`TSV row ${index + 2} has an empty required cell`);
    }
    if (translations.has(sourceHeadword)) {
      throw new Error(`Duplicate translation source headword: ${sourceHeadword}`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Romanian example for ${sourceHeadword} must end with sentence punctuation`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Romanian row for ${sourceHeadword} must contain Latin-script text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Romanian row for ${sourceHeadword} contains an unexpected non-Latin script`);
    }
    translations.set(sourceHeadword, { display, example });
  }
  return translations;
}

function validateTranslationMap(exampleRows, translations) {
  const expected = exampleRows.map((row) => row.source_headword);
  const missing = expected.filter((sourceHeadword) => !translations.has(sourceHeadword));
  const extra = [...translations.keys()].filter((sourceHeadword) => !expected.includes(sourceHeadword));
  if (missing.length || extra.length) {
    throw new Error(
      `RO translation source key mismatch: missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`
    );
  }
}

function buildSupportRow(row, translation, generatedAt) {
  return {
    release_id: row.release_id,
    course_id: row.course_id,
    row_id: row.row_id,
    core_item_id: row.core_item_id,
    meaning_id: row.meaning_id,
    source_headword: row.source_headword,
    reviewed_part_of_speech: row.reviewed_part_of_speech,
    meaning_note: row.meaning_note,
    semantic_scene: row.semantic_scene,
    support_translation_batch: BATCH_ID,
    support_translation_status: "draft_native_style_needs_source_assisted_qa",
    support_example_status: "draft_scene_preserving_needs_source_assisted_qa",
    support_translation_source: "codex_curated_native_style_support_translation_not_oxford",
    support_example_source: "codex_curated_scene_preserving_support_example_not_oxford",
    generated_at: generatedAt,
    [LANGUAGE]: translation.display,
    [`example_${LANGUAGE}`]: translation.example,
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
    "- Script-aware validation: RO Latin native orthography, Romanian learner-facing article display support, sentence punctuation and non-Latin script leak guard",
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
