#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "HR";
const BATCH_ID = "hr_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-hr.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const HR_TRANSLATIONS_TSV = `source_headword	HR	example_HR
clothes	odjeća	Moja odjeća je čista.
club	klub	Ona ide u glazbeni klub.
coat	kaput	Moj kaput je topao.
coffee	kava	Pijem kavu ujutro.
cold	hladan; hladno	Voda je hladna.
college	fakultet; koledž	Moja sestra je na fakultetu.
colour	boja	Moja omiljena boja je plava.
come	doći; dolaziti	Dođi ovamo, molim te.
common	čest; uobičajen	Ovo ime je često.
company	tvrtka; poduzeće	Moja majka radi u tvrtki.
compare	usporediti; uspoređivati	Usporedi ove dvije slike.
complete	potpun; dovršiti	Obrazac je potpun.
computer	računalo	Ovo računalo je novo.
concert	koncert	Večeras idemo na koncert.
conversation	razgovor	Imali smo kratak razgovor.
cook	kuhati; kuhar	Kuham večeru kod kuće.
cooking	kuhanje	Volim kuhati s tatom.
cool	hladan; super	Soba je hladna.
correct	točan; ispraviti	Tvoj odgovor je točan.
cost	cijena; koštati	Koliko to košta?
could modal	moći; mogao bih	Mogao bih ti pomoći.
country	zemlja; država	Kanada je velika zemlja.
course	tečaj; kolegij	Pohađam tečaj engleskog.
cousin	bratić; sestrična	Moj bratić živi blizu.
cow	krava	Krava jede travu.
cream	vrhnje; krema	Stavljam vrhnje u kavu.
create	stvoriti; stvarati	Oni stvaraju novu igru.
culture	kultura	Učimo o lokalnoj kulturi.
cup	šalica	Ova šalica je prazna.
customer	kupac; klijent	Kupac postavlja pitanje.
cut	rezati; odrezati	Prereži jabuku napola.
dad	tata	Tata je na poslu.
dance	plesati; ples	Plešemo nakon večere.
dancer	plesač; plesačica	Plesačica se brzo kreće.
dancing	plesanje	Plesanje je zabavno.
dangerous	opasan	Ova cesta je opasna.
dark	taman; mračan	Soba je mračna.
date	datum	Koji je danas datum?
daughter	kći	Njezina kći ima šest godina.
day	dan	Ugodan dan ti želim.
dear	drag; poštovani	Dragi prijatelju, hvala.
December	prosinac	Moj rođendan je u prosincu.
decide	odlučiti	Odluči sada, molim te.
delicious	ukusan	Ova juha je ukusna.
describe	opisati; opisivati	Opiši svoju sobu.
description	opis	Pročitaj kratak opis.
design	dizajn; oblikovati	Oblikujem jednostavnu karticu.
desk	radni stol	Knjiga je na mom stolu.
detail	detalj	Jedan detalj nedostaje.
dialogue	dijalog	Pročitaj dijalog sada.
dictionary	rječnik	Koristi rječnik na satu.
die	umrijeti	Cvijeće umire bez vode.
diet	prehrana; dijeta	Moja prehrana uključuje voće.
difference	razlika	Postoji jedna razlika.
different	različit	Imamo različita imena.
difficult	težak	Ovo pitanje je teško.
dinner	večera	Večera je spremna.
dirty	prljav	Moje cipele su prljave.
discuss	raspraviti; razgovarati	Razgovaramo o planu.
dish	tanjur; jelo	Ovaj tanjur je vruć.
do1	raditi; činiti	Što radiš?
doctor	liječnik	Liječnik je zauzet.
dog	pas	Pas trči vani.
dollar	dolar	Košta jedan dolar.
door	vrata	Zatvori vrata, molim te.
down	dolje; prema dolje	Sjedni ovdje dolje.
downstairs	dolje; na donjem katu	Kuhinja je dolje.
draw	crtati	Nacrtaj malu kuću.
dress	haljina; odjenuti	Ona nosi crvenu haljinu.
drink	piće; piti	Pijem vodu.
drive	voziti	Vozim na posao.
driver	vozač	Vozač se ovdje zaustavlja.
during	tijekom	Spavam tijekom leta.
DVD	DVD	Ovaj DVD je star.
each	svaki	Svako dijete ima knjigu.
ear	uho	Boli me uho.
early	rano; rani	Ustajem rano.
east	istok	Sunce izlazi na istoku.
easy	lak	Ovaj test je lagan.
eat	jesti	Jedemo ručak zajedno.
egg	jaje	Jedem jedno jaje.
eight	osam	Imam osam kartica.
eighteen	osamnaest	Ona ima osamnaest godina.
eighty	osamdeset	Moj djed ima osamdeset godina.
elephant	slon	Slon je velik.
eleven	jedanaest	Sat počinje u jedanaest.
else	drugi; još	Što ti još treba?
email	e-mail	Pošalji mi e-mail.
end	kraj; završiti	Ovo je kraj.
enjoy	uživati; sviđati se	Uživam u ovoj pjesmi.
enough	dovoljno	Imamo dovoljno vremena.
euro	euro	Košta jedan euro.
even	čak	Čak i moj brat zna.
evening	večer	Sastajemo se večeras.
event	događaj	Događaj počinje danas.
ever	ikada	Kuhaš li ikada?
every	svaki	Učim svaki dan.
everybody	svi	Svi su ovdje.
everyone	svatko	Svatko voli glazbu.
everything	sve	Sve je spremno.
exam	ispit	Ispit počinje uskoro.
example	primjer	Ovo je dobar primjer.
excited	uzbuđen	Danas sam uzbuđen.
exciting	uzbudljiv	Igra je uzbudljiva.
exercise	vježba; vježbati	Vježbam prije doručka.
expensive	skup	Ovaj kaput je skup.
explain	objasniti	Objasni ovu riječ, molim te.
extra	dodatni; još	Trebam dodatno vrijeme.
eye	oko	Oko mi je crveno.
face	lice	Operi lice.
fact	činjenica	Ova činjenica je važna.
fall	pasti; jesen	Lišće pada u jesen.
false	netočan; lažan	Taj odgovor je netočan.
family	obitelj	Moja obitelj je mala.
famous	poznat	Ona je poznata pjevačica.
fantastic	fantastičan	Koncert je bio fantastičan.
far	daleko	Škola je daleko.
farm	farma; gospodarstvo	Žive na farmi.
farmer	poljoprivrednik	Poljoprivrednik uzgaja hranu.
fast	brz	Ovaj vlak je brz.
fat	debeo	Mačka je debela.
father	otac	Moj otac je visok.
favourite	omiljen	Ovo je moja omiljena pjesma.
February	veljača	U veljači je ovdje hladno.
feel	osjećati	Osjećam se sretno.
feeling	osjećaj	Znam taj osjećaj.
festival	festival	Festival počinje sutra.
few	nekoliko	Nekoliko učenika je ovdje.
fifteen	petnaest	Imam petnaest godina.
fifth	peti	Ovo je peti sat.
fifty	pedeset	Moja majka ima pedeset godina.
fill	napuniti; ispuniti	Napuni šalicu vodom.
film	film	Gledamo film.
final	konačan; posljednji	Ovo je posljednje pitanje.
find	pronaći; naći	Pronalazim svoje ključeve.
fine	dobro	Sada se osjećam dobro.
finish	završiti	Završi domaću zadaću.
fire	vatra	Vatra je vruća.
first	prvi	Ona je prva u redu.
fish	riba	Jedem ribu za večeru.
five	pet	Imam pet knjiga.
flat	stan	Moj stan je malen.
flight	let	Let kasni.
floor	pod; kat	Torba je na podu.
flower	cvijet	Ovaj cvijet je žut.
fly	letjeti	Ptice lete nebom.
follow	slijediti	Slijedi me, molim te.
food	hrana	Hrana je spremna.
foot	stopalo	Boli me stopalo.
football	nogomet	Danas igramo nogomet.
for	za	Ovaj poklon je za tebe.
forget	zaboraviti	Ne zaboravi ključeve.
form	obrazac	Ispuni obrazac.
forty	četrdeset	Moj otac ima četrdeset godina.
four	četiri	Vidim četiri ptice.
fourteen	četrnaest	Ona ima četrnaest godina.
fourth	četvrti	Ovo je četvrti kat.
free	besplatan; slobodan	Ulaznica je besplatna.
Friday	petak	Sastajemo se u petak.
friend	prijatelj	Moj prijatelj je ovdje.
friendly	prijateljski	Učitelj je prijateljski raspoložen.
from	iz; od	Odavde sam.
front	prednji dio; naprijed	Stani naprijed.
fruit	voće	Jedem voće svaki dan.
full	pun	Boca je puna.
fun	zabava; zabavan	Ova igra je zabavna.
funny	smiješan	Film je smiješan.
future	budućnost	Razmisli o svojoj budućnosti.
game	igra	Igra počinje sada.
garden	vrt	Vrt je lijep.
geography	geografija	Učim geografiju u školi.
get	dobiti; stići	Stižem kući u šest.
girl	djevojčica; djevojka	Djevojčica se smiješi.
girlfriend	djevojka	Njegova djevojka je ljubazna.
give	dati	Daj mi knjigu.
glass	čaša; staklo	Pijem iz čaše.
go	ići	Sada idemo kući.
good	dobar	Ova kava je dobra.
goodbye	doviđenja	Doviđenja, vidimo se sutra.
grandfather	djed	Moj djed je star.
grandmother	baka	Moja baka kuha juhu.
grandparent	baka ili djed	Baka živi s nama.
great	odličan	Ovo je odlična ideja.
green	zelen	Vrata su zelena.
grey	siv	Nebo je sivo.
group	grupa; skupina	Radite u maloj skupini.
grow	rasti; uzgajati	Biljke rastu u vrtu.
guess	pogoditi; pretpostaviti	Pogodi odgovor.
guitar	gitara	On svira gitaru.
gym	teretana	Idem u teretanu.
hair	kosa	Njezina kosa je duga.
half	polovica	Prereži kolač napola.
hand	ruka	Podigni ruku.
happen	dogoditi se	Što će se dogoditi?
happy	sretan	Danas sam sretan.
hard	težak; tvrd	Ova stolica je tvrda.
hat	šešir; kapa	Moj šešir je crn.
hate	mrziti	Mrzim hladan čaj.
have	imati	Imam auto.
have to modal	morati	Moram učiti.
he	on	On je moj brat.
head	glava	Boli me glava.
health	zdravlje	Dobra hrana pomaže zdravlju.
healthy	zdrav; zdravo	Ovaj obrok je zdrav.
hear	čuti	Čujem glazbu.
hello	bok; zdravo	Zdravo, drago mi je.
help	pomoć; pomoći	Molim te, pomozi mi.
her	njezin; nju	Ovo je njezina torba.
here	ovdje	Dođi ovamo sada.
hey	hej	Hej, čekaj me.
hi	bok	Bok, kako si?
high	visok	Zid je visok.
him	njega	Poznajem ga.
his	njegov	Njegov kaput je plav.
history	povijest	Učim povijest.
hobby	hobi	Čitanje je moj hobi.
holiday	odmor; blagdan	U srpnju idemo na odmor.
home	dom; kod kuće	Kod kuće sam.
homework	domaća zadaća	Napiši domaću zadaću večeras.
hope	nadati se	Nadam se da ćeš doći.
horse	konj	Konj brzo trči.
hospital	bolnica	Bolnica je blizu.
hot	vruć	Juha je vruća.
hotel	hotel	Hotel je čist.
hour	sat	Čekaj jedan sat.
house	kuća	Ova kuća je stara.
how	kako	Kako si?
however	međutim	Međutim, mogu ostati ovdje.
hundred	sto	Došlo je sto ljudi.
hungry	gladan	Gladan sam.
husband	suprug	Njezin suprug je liječnik.
I	ja	Volim čaj.
ice	led	Led je hladan.
ice cream	sladoled	Želim sladoled.
idea	ideja	To je dobra ideja.
if	ako	Nazovi me ako trebaš pomoć.
imagine	zamisliti	Zamisli malu kuću.
important	važan	Ovaj sat je važan.
improve	poboljšati	Želim se poboljšati.
in	u	Ključevi su u mojoj torbi.
include	uključiti	Uključi svoje ime, molim te.
information	informacija	Trebam više informacija.
interest	interes; zanimanje	Ona se zanima za umjetnost.
interested	zainteresiran	Zainteresiran sam za glazbu.
interesting	zanimljiv	Ova knjiga je zanimljiva.
internet	internet	Internet je spor.
interview	intervju; razgovor	Danas imam intervju.
into	u; unutra	Stavi knjige u torbu.
introduce	predstaviti	Predstavi svog prijatelja.
island	otok	Ovaj otok je malen.
it	to; ono	Hladno je.
its	njegov; njezin	Pas voli svoj krevet.
jacket	jakna	Moja jakna je nova.
January	siječanj	Siječanj je prvi mjesec.
jeans	traperice	Moje traperice su plave.
job	posao	Trebam novi posao.
join	pridružiti se	Pridruži se našem razredu danas.
journey	putovanje	Putovanje je dugo.
juice	sok	Pijem sok od naranče.
July	srpanj	Putujemo u srpnju.
June	lipanj	Škola završava u lipnju.
just	upravo; samo	Samo trebam vodu.
keep	zadržati; čuvati	Zadrži ovaj ključ.
key	ključ	Izgubio sam ključ.
kilometre	kilometar	Hodaj jedan kilometar.
kind (type)	vrsta	Koju vrstu glazbe voliš?
kitchen	kuhinja	Kuhinja je čista.
know	znati; poznavati	Znam odgovor.
land	kopno; zemlja	Avion je na kopnu.
language	jezik	Engleski je jezik.
large	velik	Ova soba je velika.
last1 (final)	posljednji	Ovo je posljednja stranica.
late	kasan; kasno	Autobus kasni.
later	kasnije	Vidimo se kasnije.
laugh	smijati se	Smijemo se zajedno.
learn	učiti	Učim engleski.
leave	otići; ostaviti	Ostavi vrata otvorena.
left	lijevo; lijevi	Ovdje skreni lijevo.
leg	noga	Boli me noga.
lesson	lekcija; sat	Sat počinje sada.
let	dopustiti; pustiti	Dopusti mi da pomognem.
letter	pismo; slovo	Pišem pismo.
library	knjižnica	Knjižnica se otvara u devet.
lie1	ležati	Lezi na krevet.
life	život	Gradski život je užurban.
like (similar)	kao; sličan	To je kao igra.
like (find sb/sth pleasant)	sviđati se; voljeti	Sviđa mi se ova pjesma.
line	red; crta	Stani u red.
lion	lav	Lav spava.
list	popis	Napravi popis za kupnju.
listen	slušati	Slušaj učitelja.
little	malen; malo	Imam malo novca.
live1	živjeti	Živim blizu škole.
local	lokalni; mjesni	Ovo je lokalna trgovina.
long1	dug; dugačak	Cesta je duga.
look	gledati; izgledati	Pogledaj sliku.
lose	izgubiti	Nemoj izgubiti kartu.
lot	puno; mnogo	Imam puno domaće zadaće.
love	voljeti; ljubav	Volim svoju obitelj.
lunch	ručak	Ručak je spreman.`;

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
  const lines = HR_TRANSLATIONS_TSV.trim().split(/\n/u);
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
      throw new Error(`Croatian example for ${sourceHeadword} must end with sentence punctuation`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Croatian row for ${sourceHeadword} must contain Latin-script text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Croatian row for ${sourceHeadword} contains a non-Latin script`);
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
      `HR translation source key mismatch: missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`
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
    "- Script-aware validation: HR Latin native orthography, Croatian display/example presence, sentence punctuation and non-Latin script leak guard",
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
