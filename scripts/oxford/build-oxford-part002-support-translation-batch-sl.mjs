#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "SL";
const BATCH_ID = "sl_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-sl.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const SL_TRANSLATIONS_TSV = `source_headword	SL	example_SL
clothes	oblačila	Moja oblačila so čista.
club	klub	Ona hodi v glasbeni klub.
coat	plašč	Moj plašč je topel.
coffee	kava	Zjutraj pijem kavo.
cold	hladen; hladno	Voda je hladna.
college	fakulteta; kolidž	Moja sestra študira na fakulteti.
colour	barva	Moja najljubša barva je modra.
come	priti	Pridi sem, prosim.
common	pogost; običajen	To ime je pogosto.
company	podjetje; družba	Moja mama dela v podjetju.
compare	primerjati	Primerjaj ti dve sliki.
complete	popoln; dokončati	Obrazec je popoln.
computer	računalnik	Ta računalnik je nov.
concert	koncert	Nocoj gremo na koncert.
conversation	pogovor	Imeli smo kratek pogovor.
cook	kuhati; kuhar	Kuham večerjo doma.
cooking	kuhanje	Rad kuham z očetom.
cool	hladen; kul	Soba je hladna.
correct	pravilen; popraviti	Tvoj odgovor je pravilen.
cost	cena; stati	Koliko to stane?
could modal	moči; lahko bi	Lahko bi ti pomagal.
country	država; dežela	Kanada je velika država.
course	tečaj; predmet	Hodim na tečaj angleščine.
cousin	bratranec; sestrična	Moj bratranec živi blizu.
cow	krava	Krava jé travo.
cream	smetana; krema	V kavo dam smetano.
create	ustvariti; ustvarjati	Ustvarjajo novo igro.
culture	kultura	Učimo se o lokalni kulturi.
cup	skodelica	Ta skodelica je prazna.
customer	stranka	Stranka postavi vprašanje.
cut	rezati; prerezati	Prereži jabolko na pol.
dad	oče; ati	Oče je v službi.
dance	plesati; ples	Plešemo po večerji.
dancer	plesalec; plesalka	Plesalka se hitro premika.
dancing	plesanje	Plesanje je zabavno.
dangerous	nevaren	Ta cesta je nevarna.
dark	temen; mračen	Soba je mračna.
date	datum	Kateri datum je danes?
daughter	hči	Njena hči ima šest let.
day	dan	Želim ti lep dan.
dear	drag; spoštovani	Dragi prijatelj, hvala.
December	december	Moj rojstni dan je decembra.
decide	odločiti se	Odloči se zdaj, prosim.
delicious	okusen	Ta juha je okusna.
describe	opisati	Opiši svojo sobo.
description	opis	Preberi kratek opis.
design	oblikovanje; oblikovati	Oblikujem preprosto kartico.
desk	pisalna miza	Knjiga je na moji mizi.
detail	podrobnost	Manjka ena podrobnost.
dialogue	dialog	Preberi dialog zdaj.
dictionary	slovar	Uporabi slovar pri pouku.
die	umreti	Rože umrejo brez vode.
diet	prehrana; dieta	Moja prehrana vključuje sadje.
difference	razlika	Obstaja ena razlika.
different	različen	Imamo različna imena.
difficult	težak	To vprašanje je težko.
dinner	večerja	Večerja je pripravljena.
dirty	umazan	Moji čevlji so umazani.
discuss	razpravljati; pogovarjati se	Pogovarjamo se o načrtu.
dish	krožnik; jed	Ta krožnik je vroč.
do1	delati; narediti	Kaj delaš?
doctor	zdravnik	Zdravnik je zaseden.
dog	pes	Pes teče zunaj.
dollar	dolar	Stane en dolar.
door	vrata	Zapri vrata, prosim.
down	dol; navzdol	Sedi tukaj dol.
downstairs	spodaj; v spodnjem nadstropju	Kuhinja je spodaj.
draw	risati	Nariši majhno hišo.
dress	obleka; obleči	Ona nosi rdečo obleko.
drink	pijača; piti	Pijem vodo.
drive	voziti	Vozim se v službo.
driver	voznik	Voznik se tukaj ustavi.
during	med	Spim med letom.
DVD	DVD	Ta DVD je star.
each	vsak	Vsak otrok ima knjigo.
ear	uho	Boli me uho.
early	zgodaj; zgoden	Vstanem zgodaj.
east	vzhod	Sonce vzhaja na vzhodu.
easy	lahek	Ta test je lahek.
eat	jesti	Kosilo jemo skupaj.
egg	jajce	Pojem eno jajce.
eight	osem	Imam osem kartic.
eighteen	osemnajst	Ona ima osemnajst let.
eighty	osemdeset	Moj dedek ima osemdeset let.
elephant	slon	Slon je velik.
eleven	enajst	Pouk se začne ob enajstih.
else	drug; še	Kaj še potrebuješ?
email	e-pošta	Pošlji mi e-pošto.
end	konec; končati	To je konec.
enjoy	uživati; biti všeč	Uživam v tej pesmi.
enough	dovolj	Imamo dovolj časa.
euro	evro	Stane en evro.
even	celo	Celo moj brat ve.
evening	večer	Srečamo se zvečer.
event	dogodek	Dogodek se začne danes.
ever	kdaj	Ali kdaj kuhaš?
every	vsak	Učim se vsak dan.
everybody	vsi	Vsi so tukaj.
everyone	vsi	Vsem je všeč glasba.
everything	vse	Vse je pripravljeno.
exam	izpit	Izpit se začne kmalu.
example	primer	To je dober primer.
excited	navdušen; vznemirjen	Danes sem navdušen.
exciting	vznemirljiv	Igra je vznemirljiva.
exercise	vaja; telovaditi	Telovadim pred zajtrkom.
expensive	drag	Ta plašč je drag.
explain	razložiti	Razloži to besedo, prosim.
extra	dodaten; še	Potrebujem dodaten čas.
eye	oko	Moje oko je rdeče.
face	obraz	Umij si obraz.
fact	dejstvo	To dejstvo je pomembno.
fall	pasti; jesen	Listi padajo jeseni.
false	napačen; lažen	Ta odgovor je napačen.
family	družina	Moja družina je majhna.
famous	znan	Ona je znana pevka.
fantastic	fantastičen	Koncert je bil fantastičen.
far	daleč	Šola je daleč.
farm	kmetija	Živijo na kmetiji.
farmer	kmet	Kmet prideluje hrano.
fast	hiter	Ta vlak je hiter.
fat	debel	Mačka je debela.
father	oče	Moj oče je visok.
favourite	najljubši	To je moja najljubša pesem.
February	februar	Februarja je tukaj hladno.
feel	čutiti	Počutim se srečno.
feeling	občutek	Poznam ta občutek.
festival	festival	Festival se začne jutri.
few	nekaj	Nekaj učencev je tukaj.
fifteen	petnajst	Imam petnajst let.
fifth	peti	To je peta ura.
fifty	petdeset	Moja mama ima petdeset let.
fill	napolniti; izpolniti	Napolni skodelico z vodo.
film	film	Gledamo film.
final	končen; zadnji	To je zadnje vprašanje.
find	najti	Najdem svoje ključe.
fine	dobro	Zdaj se počutim dobro.
finish	končati	Končaj domačo nalogo.
fire	ogenj	Ogenj je vroč.
first	prvi	Ona je prva v vrsti.
fish	riba	Za večerjo jem ribo.
five	pet	Imam pet knjig.
flat	stanovanje	Moje stanovanje je majhno.
flight	let	Let zamuja.
floor	tla; nadstropje	Torba je na tleh.
flower	roža; cvet	Ta roža je rumena.
fly	leteti	Ptice letijo po nebu.
follow	slediti	Sledi mi, prosim.
food	hrana	Hrana je pripravljena.
foot	stopalo	Boli me stopalo.
football	nogomet	Danes igramo nogomet.
for	za	To darilo je zate.
forget	pozabiti	Ne pozabi ključev.
form	obrazec	Izpolni obrazec.
forty	štirideset	Moj oče ima štirideset let.
four	štiri	Vidim štiri ptice.
fourteen	štirinajst	Ona ima štirinajst let.
fourth	četrti	To je četrto nadstropje.
free	brezplačen; prost	Vstopnica je brezplačna.
Friday	petek	Srečamo se v petek.
friend	prijatelj	Moj prijatelj je tukaj.
friendly	prijazen	Učitelj je prijazen.
from	iz; od	Sem od tod.
front	sprednji del; spredaj	Stoj spredaj.
fruit	sadje	Jem sadje vsak dan.
full	poln	Steklenica je polna.
fun	zabava; zabaven	Ta igra je zabavna.
funny	smešen	Film je smešen.
future	prihodnost	Razmisli o svoji prihodnosti.
game	igra	Igra se začne zdaj.
garden	vrt	Vrt je lep.
geography	geografija	V šoli se učim geografije.
get	dobiti; priti	Domov pridem ob šestih.
girl	dekle; deklica	Deklica se nasmehne.
girlfriend	dekle	Njegovo dekle je prijazno.
give	dati	Daj mi knjigo.
glass	kozarec; steklo	Pijem iz kozarca.
go	iti	Zdaj gremo domov.
good	dober	Ta kava je dobra.
goodbye	nasvidenje	Nasvidenje, se vidimo jutri.
grandfather	dedek	Moj dedek je star.
grandmother	babica	Moja babica kuha juho.
grandparent	stari starš	Babica živi z nami.
great	odličen	To je odlična ideja.
green	zelen	Vrata so zelena.
grey	siv	Nebo je sivo.
group	skupina	Delajte v majhni skupini.
grow	rasti; gojiti	Rastline rastejo na vrtu.
guess	uganiti; domnevati	Ugani odgovor.
guitar	kitara	On igra kitaro.
gym	telovadnica; fitnes	Hodim v fitnes.
hair	lasje	Njeni lasje so dolgi.
half	polovica	Prereži torto na pol.
hand	roka	Dvigni roko.
happen	zgoditi se	Kaj se bo zgodilo?
happy	srečen	Danes sem srečen.
hard	težek; trd	Ta stol je trd.
hat	klobuk; kapa	Moj klobuk je črn.
hate	sovražiti	Sovražim hladen čaj.
have	imeti	Imam avto.
have to modal	morati	Moram se učiti.
he	on	On je moj brat.
head	glava	Boli me glava.
health	zdravje	Dobra hrana pomaga zdravju.
healthy	zdrav	Ta obrok je zdrav.
hear	slišati	Slišim glasbo.
hello	živjo; pozdravljen	Živjo, me veseli.
help	pomoč; pomagati	Prosim, pomagaj mi.
her	njen; njo	To je njena torba.
here	tukaj	Pridi sem zdaj.
hey	hej	Hej, počakaj me.
hi	živjo	Živjo, kako si?
high	visok	Zid je visok.
him	njega	Poznam ga.
his	njegov	Njegov plašč je moder.
history	zgodovina	Učim se zgodovine.
hobby	hobi	Branje je moj hobi.
holiday	počitnice; praznik	Julija gremo na počitnice.
home	dom; doma	Doma sem.
homework	domača naloga	Naredi domačo nalogo nocoj.
hope	upati	Upam, da prideš.
horse	konj	Konj hitro teče.
hospital	bolnišnica	Bolnišnica je blizu.
hot	vroč	Juha je vroča.
hotel	hotel	Hotel je čist.
hour	ura	Počakaj eno uro.
house	hiša	Ta hiša je stara.
how	kako	Kako si?
however	vendar	Vendar lahko ostanem tukaj.
hundred	sto	Prišlo je sto ljudi.
hungry	lačen	Lačen sem.
husband	mož	Njen mož je zdravnik.
I	jaz	Rad imam čaj.
ice	led	Led je hladen.
ice cream	sladoled	Želim sladoled.
idea	ideja	To je dobra ideja.
if	če	Pokliči me, če potrebuješ pomoč.
imagine	predstavljati si	Predstavljaj si majhno hišo.
important	pomemben	Ta ura je pomembna.
improve	izboljšati	Želim se izboljšati.
in	v	Ključi so v moji torbi.
include	vključiti	Vključi svoje ime, prosim.
information	informacija	Potrebujem več informacij.
interest	zanimanje; interes	Zanima jo umetnost.
interested	zainteresiran	Zanima me glasba.
interesting	zanimiv	Ta knjiga je zanimiva.
internet	internet	Internet je počasen.
interview	intervju; razgovor	Danes imam intervju.
into	v; noter	Daj knjige v torbo.
introduce	predstaviti	Predstavi svojega prijatelja.
island	otok	Ta otok je majhen.
it	to; ono	Hladno je.
its	njegov; njen	Pes ima svojo posteljo.
jacket	jakna	Moja jakna je nova.
January	januar	Januar je prvi mesec.
jeans	kavbojke	Moje kavbojke so modre.
job	služba; delo	Potrebujem novo službo.
join	pridružiti se	Pridruži se našemu razredu danes.
journey	potovanje	Potovanje je dolgo.
juice	sok	Pijem pomarančni sok.
July	julij	Potujemo julija.
June	junij	Šola se konča junija.
just	pravkar; samo	Samo vodo potrebujem.
keep	obdržati; hraniti	Obdrži ta ključ.
key	ključ	Izgubil sem ključ.
kilometre	kilometer	Hodi en kilometer.
kind (type)	vrsta	Katero vrsto glasbe imaš rad?
kitchen	kuhinja	Kuhinja je čista.
know	vedeti; poznati	Vem odgovor.
land	kopno; zemlja	Letalo je na kopnem.
language	jezik	Angleščina je jezik.
large	velik	Ta soba je velika.
last1 (final)	zadnji	To je zadnja stran.
late	pozen; pozno	Avtobus zamuja.
later	pozneje	Se vidimo pozneje.
laugh	smejati se	Smejimo se skupaj.
learn	učiti se	Učim se angleščine.
leave	oditi; pustiti	Pusti vrata odprta.
left	levo; levi	Tukaj zavij levo.
leg	noga	Boli me noga.
lesson	lekcija; ura	Ura se začne zdaj.
let	dovoliti; pustiti	Dovoli mi, da pomagam.
letter	pismo; črka	Pišem pismo.
library	knjižnica	Knjižnica se odpre ob devetih.
lie1	ležati	Lezi na posteljo.
life	življenje	Mestno življenje je živahno.
like (similar)	kot; podoben	To je kot igra.
like (find sb/sth pleasant)	biti všeč; imeti rad	Všeč mi je ta pesem.
line	vrsta; črta	Stoj v vrsti.
lion	lev	Lev spi.
list	seznam	Naredi nakupovalni seznam.
listen	poslušati	Poslušaj učitelja.
little	majhen; malo	Imam malo denarja.
live1	živeti	Živim blizu šole.
local	lokalen; krajeven	To je lokalna trgovina.
long1	dolg	Cesta je dolga.
look	pogledati; izgledati	Poglej sliko.
lose	izgubiti	Ne izgubi vstopnice.
lot	veliko; mnogo	Imam veliko domače naloge.
love	ljubiti; ljubezen	Ljubim svojo družino.
lunch	kosilo	Kosilo je pripravljeno.`;

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
  const lines = SL_TRANSLATIONS_TSV.trim().split(/\n/u);
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
      throw new Error(`Slovenian example for ${sourceHeadword} must end with sentence punctuation`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Slovenian row for ${sourceHeadword} must contain Latin-script text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Slovenian row for ${sourceHeadword} contains a non-Latin script`);
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
      `SL translation source key mismatch: missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`
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
    "- Script-aware validation: SL Latin native orthography, Slovenian display/example presence, sentence punctuation and non-Latin script leak guard",
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
