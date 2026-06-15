#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_003_300_v1";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_sr_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_sr_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-sr.mjs";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "SR";
const BATCH_ID = "sr_v1";
const RELEASE_ENTRY_COUNT = 300;
const SENTENCE_END_RE = /[.!?]$/u;
const CYRILLIC_RE = /\p{Script=Cyrillic}/u;
const LATIN_LETTER_RE = /\p{Script=Latin}/u;
const UNEXPECTED_SCRIPT_RE = /[\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const SR_LATIN_TRANSLATIONS_TSV = `source_headword	SR	example_SR
machine	mašina; uređaj	Mašina kuva kafu.
magazine	časopis	Čita muzički časopis.
main	glavni	Ovo su glavna vrata.
make	napraviti; pripremiti	Pripremam ručak kod kuće.
man	muškarac	Muškarac je moj učitelj.
many	mnogo; mnogi	Ovde ima mnogo učenika.
map	mapa; karta	Pogledaj mapu.
March	mart	Rođendan mi je u martu.
market	pijaca; tržište	Kupujemo voće na pijaci.
married	oženjen; udata	Moja sestra je udata.
May	maj	Škola se završava u maju.
maybe	možda	Možda će padati kiša.
me	mene; mi	Pomozi mi, molim te.
meal	obrok; jelo	Jelo je toplo.
mean	značiti	Šta znači znak?
meaning	značenje	Koje je značenje?
meat	meso	Jedem meso za večeru.
meet	upoznati; sastati se	Sastajemo se posle škole.
meeting	sastanak	Sastanak počinje sada.
member	član; članica	Ona je članica kluba.
menu	jelovnik; meni	Pročitaj meni.
message	poruka	Šaljem kratku poruku.
metre	metar	Hodaj jedan metar napred.
midnight	ponoć	Voz polazi u ponoć.
mile	milja	Hodamo jednu milju.
milk	mleko	Pijem mleko za doručak.
million	milion	Ovde živi milion ljudi.
minute1	minut	Sačekaj jedan minut.
miss	nedostajati; propustiti	Nedostaje mi stara škola.
mistake	greška	U odgovoru je greška.
model	model	Ovo je mali model.
modern	moderan	Kuhinja je moderna.
moment	trenutak	Sačekaj trenutak.
Monday	ponedeljak	Počinjemo rad u ponedeljak.
money	novac	Treba mi malo novca.
month	mesec	Jun je topao mesec.
more	više	Treba mi više vremena.
morning	jutro	Učim ujutru.
most	većina; najviše	Većina učenika voli muziku.
mother	majka	Moja majka danas radi.
mountain	planina	Planina je vrlo visoka.
mouse	miš	Miš je ispod stolice.
mouth	usta	Otvori usta.
move	pomeriti; preseliti	Pomeri stolicu ovamo.
movie	film	Večeras gledamo film.
much	mnogo; koliko	Koliko to košta?
mum	mama	Mama je kod kuće.
museum	muzej	Muzej se otvara u deset.
music	muzika	Slušam muziku.
must modal	morati	Moraš stati ovde.
my	moj; moja	Ovo je moja knjiga.
name	ime; imenovati	Napiši svoje ime ovde.
natural	prirodan; prirodni	Ovaj sok je prirodan.
near	blizu	Banka je blizu.
need	trebati; potreba	Treba mi olovka.
negative	negativan	Ovaj odgovor je negativan.
neighbour	komšija; sused	Moj komšija je ljubazan.
never	nikad	Nikad ne pijem kafu.
new	nov	Ovaj telefon je nov.
news	vesti	Današnje vesti su dobre.
newspaper	novine	Čita novine.
next	sledeći	Sledeći autobus kasni.
next to	pored	Sedi pored mene.
nice	lep; prijatan	Soba je prijatna.
night	noć	Spavam noću.
nine	devet	Ovde je devet učenika.
nineteen	devetnaest	Ima devetnaest godina.
ninety	devedeset	Moj deda ima devedeset godina.
no	ne; nijedan	Ne, hvala.
no one	niko	Niko nije u sobi.
nobody	niko	Niko nije kod kuće.
north	sever	Stanica je na severu.
nose	nos	Moj nos je hladan.
not	ne	Nisam umoran.
note	beleška	Napiši belešku sada.
nothing	ništa	U kutiji nema ničega.
November	novembar	Moj kurs počinje u novembru.
now	sada	Dođi ovamo sada.
number	broj	Napiši broj ovde.
nurse	medicinska sestra; medicinski brat	Sestra je ljubazna.
object	predmet	Stavi predmet na sto.
o’clock	sati	Čas počinje u devet.
October	oktobar	Putujemo u oktobru.
of	od; za	Ovo je šolja čaja.
off	isključen; dole	Ugasi svetlo.
office	kancelarija	Moja kancelarija je mala.
often	često	Često idem peške u školu.
oh	o; aha	Aha, sada razumem.
OK	u redu; okej	Da li je to u redu?
old	star	Ova kuća je stara.
on	na; uključen	Knjiga je na stolu.
once	jednom	Zovem jednom nedeljno.
one	jedan; jedna	Imam jednu sestru.
onion	luk	Iseci jedan luk.
online	onlajn; na internetu	Učim onlajn.
only	samo	Imam samo jednu torbu.
open	otvoren; otvoriti	Otvori prozor.
opinion	mišljenje	Koje je tvoje mišljenje?
opposite	nasuprot; suprotan	Prodavnica je nasuprot banci.
or	ili	Čaj ili kafa?
orange	pomorandža; narandžast	Pomorandža je slatka.
order	porudžbina; naručiti	Naručujem supu.
other	drugi	Upotrebi druga vrata.
our	naš; naša	Ovo je naš razred.
out	napolje; van	Izađi posle ručka.
outside	napolju; spolja	Deca se igraju napolju.
over	iznad; preko	Avion leti iznad grada.
own	sopstven; posedovati	Imam sopstvenu sobu.
page	stranica	Otvori desetu stranicu.
paint	boja; bojiti	Oboji zid plavom bojom.
painting	slika	Slika je lepa.
pair	par	Treba mi par čarapa.
paper	papir; rad	Piši na ovaj papir.
paragraph	pasus	Pročitaj prvi pasus.
parent	roditelj	Jedan roditelj čeka napolju.
park	park; parkirati	Parkiramo blizu stanice.
part	deo	Ovaj deo je lak.
partner	partner; partnerka	Radi sa svojim partnerom.
party	zabava	Zabava počinje u sedam.
passport	pasoš	Pokaži pasoš.
past	prošlost; posle	Šest je i trideset.
pay	platiti	Plaćam karticom.
pen	hemijska olovka	Ova hemijska je plava.
pencil	olovka; grafitna olovka	Pišem olovkom.
people	ljudi	Ovde ima mnogo ljudi.
pepper	biber	Stavi biber u supu.
perfect	savršen	Tvoj odgovor je savršen.
period	period; čas	Ovaj čas je kratak.
person	osoba	Jedna osoba čeka.
personal	ličan; lični	Ovo je moj lični telefon.
phone	telefon; pozvati	Moj telefon je u torbi.
photo	fotografija; slika	Snimi fotografiju ovde.
photograph	fotografija; fotografisati	Fotografija je stara.
phrase	fraza	Ponovi ovu frazu.
piano	klavir	Svira klavir.
picture	slika	Pogledaj sliku.
piece	komad	Uzmi komad torte.
pig	svinja	Svinja je na farmi.
pink	roze	Njena torba je roze.
place	mesto; staviti	Mesto je tiho.
plan	plan	Treba nam plan.
plane	avion	Avion kasni.
plant	biljka; saditi	Zalij biljku danas.
play	igrati; predstava	Deca se igraju u parku.
player	igrač	Igrač brzo trči.
please	molim	Molim te, sedi ovde.
point	tačka; poenta	Ova tačka je važna.
police	policija	Policija je napolju.
policeman	policajac	Policajac nam pomaže.
pool	bazen	Bazen je hladan.
poor	siromašan	Siromašno dete je gladno.
popular	popularan	Ova pesma je popularna.
positive	pozitivan	Rezultat je pozitivan.
possible	moguć	Da li je to moguće danas?
post	objava; pošta	Čitam njegovu objavu onlajn.
potato	krompir	Jedem jedan krompir.
pound	funta	Košta jednu funtu.
practice	vežba; praksa	Vežba pomaže svaki dan.
practise	vežbati	Vežbam engleski svaki dan.
prefer	više voleti	Više volim čaj.
prepare	pripremiti	Pripremi torbu uveče.
present	prisutan; poklon	Danas je prisutan.
pretty	lep; prilično	Vrt je lep.
price	cena	Cena je niska.
probably	verovatno	Verovatno zna.
problem	problem	Problem je mali.
product	proizvod	Proizvod je nov.
programme	program; emisija	Program počinje sada.
project	projekat	Naš projekat je gotov.
purple	ljubičast	Košulja je ljubičasta.
put	staviti	Stavi knjigu ovde.
quarter	četvrt	Dva je i petnaest.
question	pitanje	Postavi pitanje.
quick	brz; kratak	Ovo je kratak test.
quickly	brzo	Idi brzo.
quiet	tih	Biblioteka je tiha.
quite	prilično	Soba je prilično mala.
radio	radio	Radio je glasan.
rain	kiša; padati kiša	Sada počinje kiša.
read	čitati	Pročitaj ovu rečenicu.
reader	čitalac	Čitalac voli priču.
reading	čitanje	Čitanje pomaže u učenju.
ready	spreman	Večera je spremna.
real	stvaran; pravi	Postoji stvaran problem.
really	stvarno	Stvarno volim ovu pesmu.
reason	razlog	Reci razlog.
red	crven	Vrata su crvena.
relax	opustiti se	Opusti se posle posla.
remember	setiti se; zapamtiti	Ne zaboravi pasoš.
repeat	ponoviti	Ponovi rečenicu.
report	izveštaj	Pročitaj izveštaj večeras.
restaurant	restoran	Restoran je pun.
result	rezultat	Rezultat je dobar.
return	vratiti se; vratiti	Vrati knjigu sutra.
rice	pirinač	Jedem pirinač za ručak.
rich	bogat	Ovaj grad je bogat.
ride	voziti se; jahati; vožnja	Vozim se biciklom u školu.
right	desni; tačan	Ovde skreni desno.
river	reka	Reka je široka.
road	put; drum	Put je dug.
room	soba	Moja soba je čista.
routine	rutina; dnevni red	Moja rutina počinje rano.
rule	pravilo	Pravilo je jednostavno.
run	trčati	Trčim svako jutro.
sad	tužan	Danas sam tužan.
salad	salata	Salata je sveža.
salt	so	Dodaj malo soli.
same	isti	Imamo istu torbu.
sandwich	sendvič	Jedem sendvič.
Saturday	subota	Sastajemo se u subotu.
say	reći	Reci svoje ime.
school	škola	Moja škola je blizu.
science	nauka	Učim nauku.
scientist	naučnik	Naučnik postavlja pitanje.
sea	more	More je plavo.
second1 (unit of time)	sekunda	Sačekaj jednu sekundu.
section	odeljak; deo	Pročitaj ovaj odeljak.
see	videti	Vidim svog prijatelja.
sell	prodati; prodavati	Prodaju sveže voće.
send	poslati	Pošalji poruku sada.
sentence	rečenica	Napiši rečenicu.
September	septembar	Škola počinje u septembru.
seven	sedam	Ovde je sedam ljudi.
seventeen	sedamnaest	Ima sedamnaest godina.
seventy	sedamdeset	Moja baka ima sedamdeset godina.
share	podeliti; deliti	Podeli tortu.
she	ona	Ona je moja sestra.
sheep	ovca	Ovca jede travu.
shirt	košulja	Košulja je čista.
shoe	cipela	Cipela je ispod kreveta.
shop	prodavnica; kupovati	Prodavnica se rano zatvara.
shopping	kupovina	Kupovina je danas zabavna.
short	kratak	Priča je kratka.
should modal	trebati	Trebalo bi da se odmoriš danas.
show	pokazati; emisija	Pokaži mapu.
shower	tuš; tuširati se	Tuširam se ujutru.
sick	bolestan	Danas sam bolestan.
similar	sličan	Naše torbe su slične.
sing	pevati	Pevam na času.
singer	pevač; pevačica	Pevač je poznat.
sister	sestra	Moja sestra je mlada.
sit	sedeti; sesti	Sedi pored prozora.
situation	situacija	Situacija je nova.
six	šest	Ovde je šest knjiga.
sixteen	šesnaest	Ima šesnaest godina.
sixty	šezdeset	Moj otac ima šezdeset godina.
skill	veština	Ova veština je korisna.
skirt	suknja	Suknja je plava.
sleep	spavati; san	Spavam osam sati.
slow	spor	Autobus je spor.
small	mali	Soba je mala.
snake	zmija	Zmija je duga.
snow	sneg; padati sneg	Zimi pada sneg.
so	tako; zato	Umoran sam, zato odmaram.
some	neki; malo	Treba mi malo vode.
somebody	neko	Neko je na vratima.
someone	neko	Neko je ostavio poruku.
something	nešto	Treba mi nešto za piće.
sometimes	ponekad	Ponekad idem peške u školu.
son	sin	Njen sin je u školi.
song	pesma	Ova pesma je nova.
soon	uskoro	Vidimo se uskoro.
sorry	izvini; žao mi je	Žao mi je.
sound	zvuk; zvučati	Zvuk je glasan.
soup	supa	Supa je vruća.
south	jug	Hotel je na jugu.
space	prostor; mesto	Ima mesta za stolicu.
speak	govoriti	Govori polako, molim te.
special	poseban	Danas je poseban dan.
spell	slovkati	Slovkaj svoje ime.
spelling	pravopis	Proveri pravopis.
spend	trošiti; provesti	Trošim novac na hranu.
sport	sport	Fudbal je popularan sport.
spring	proleće; opruga	U proleće cveće raste.
stand	stajati	Stani pored vrata.
star	zvezda	Vidim sjajnu zvezdu.
start	početi; početak	Počni lekciju sada.
statement	izjava	Tvrdnja je tačna.
station	stanica	Stanica je blizu.
stay	ostati	Ostani danas kod kuće.
still	još	Još sam gladan.
stop	zaustaviti; stanica	Stani na uglu.
story	priča	Ispričaj priču.
street	ulica	Ulica je tiha.
strong	jak	On je jak.
student	učenik; student	Učenik čita knjigu.
study	učiti; studije	Učim engleski.
style	stil	Sviđa mi se ovaj stil.
subject	predmet; tema	Engleski je moj glavni predmet.
success	uspeh	Uspeh traži vežbu.
sugar	šećer	Stavi šećer u čaj.
summer	leto	Leto je ovde vruće.
sun	sunce	Sunce je sjajno.
Sunday	nedelja	Nedeljom se odmaramo.
supermarket	supermarket	Supermarket je otvoren.
sure	siguran; naravno	Siguran sam.
sweater	džemper	Moj džemper je topao.
swim	plivati	Plivam svake nedelje.
swimming	plivanje	Plivanje je dobra vežba.
table	sto	Ključevi su na stolu.`;

const DIGRAPHS = [
  ["DŽ", "Џ"],
  ["Dž", "Џ"],
  ["dž", "џ"],
  ["LJ", "Љ"],
  ["Lj", "Љ"],
  ["lj", "љ"],
  ["NJ", "Њ"],
  ["Nj", "Њ"],
  ["nj", "њ"],
];

const LATIN_TO_CYRILLIC = new Map([
  ["A", "А"], ["a", "а"],
  ["B", "Б"], ["b", "б"],
  ["C", "Ц"], ["c", "ц"],
  ["Č", "Ч"], ["č", "ч"],
  ["Ć", "Ћ"], ["ć", "ћ"],
  ["D", "Д"], ["d", "д"],
  ["Đ", "Ђ"], ["đ", "ђ"],
  ["E", "Е"], ["e", "е"],
  ["F", "Ф"], ["f", "ф"],
  ["G", "Г"], ["g", "г"],
  ["H", "Х"], ["h", "х"],
  ["I", "И"], ["i", "и"],
  ["J", "Ј"], ["j", "ј"],
  ["K", "К"], ["k", "к"],
  ["L", "Л"], ["l", "л"],
  ["M", "М"], ["m", "м"],
  ["N", "Н"], ["n", "н"],
  ["O", "О"], ["o", "о"],
  ["P", "П"], ["p", "п"],
  ["R", "Р"], ["r", "р"],
  ["S", "С"], ["s", "с"],
  ["Š", "Ш"], ["š", "ш"],
  ["T", "Т"], ["t", "т"],
  ["U", "У"], ["u", "у"],
  ["V", "В"], ["v", "в"],
  ["Z", "З"], ["z", "з"],
  ["Ž", "Ж"], ["ž", "ж"],
]);

function parseArgs() {
  const args = new Map();
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/u);
    if (match) args.set(match[1], match[2]);
  }
  return args;
}

function toSerbianCyrillic(value) {
  let output = value;
  for (const [latin, cyrillic] of DIGRAPHS) {
    output = output.replaceAll(latin, cyrillic);
  }
  return [...output].map((char) => LATIN_TO_CYRILLIC.get(char) ?? char).join("");
}

function parseTsv(tsv) {
  const [headerLine, ...lines] = tsv.trim().split(/\r?\n/u);
  if (headerLine !== `source_headword\t${LANGUAGE}\texample_${LANGUAGE}`) {
    throw new Error(`Unexpected TSV header: ${headerLine}`);
  }
  if (lines.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Serbian rows, found ${lines.length}`);
  }

  const map = new Map();
  for (const [lineIndex, line] of lines.entries()) {
    const cells = line.split("\t");
    if (cells.length !== 3) {
      throw new Error(`Invalid TSV cell count at data line ${lineIndex + 2}: ${line}`);
    }
    const [sourceHeadword, latinDisplay, latinExample] = cells.map((cell) => cell.trim());
    const display = toSerbianCyrillic(latinDisplay);
    const example = toSerbianCyrillic(latinExample);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Blank TSV value at data line ${lineIndex + 2}: ${line}`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Serbian example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!CYRILLIC_RE.test(display) || !CYRILLIC_RE.test(example)) {
      throw new Error(`Serbian display/example must contain Cyrillic text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (LATIN_LETTER_RE.test(display) || LATIN_LETTER_RE.test(example)) {
      throw new Error(`Serbian display/example contains Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Serbian display/example contains an unexpected non-Cyrillic script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Serbian translation row for ${sourceHeadword}`);
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
    "Generate SL support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after SL.",
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
  const translations = parseTsv(SR_LATIN_TRANSLATIONS_TSV);

  if (rows.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Serbian translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Serbian translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(JSONL_PATH), { recursive: true });
  await writeFile(JSONL_PATH, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Serbian; nouns use nominative singular display forms
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: SR Cyrillic display/example cells with no Latin or unexpected-script leakage
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
    next_language: "SL",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
