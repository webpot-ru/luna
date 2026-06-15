#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_003_300_v1";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_hr_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_hr_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-hr.mjs";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "HR";
const BATCH_ID = "hr_v1";
const RELEASE_ENTRY_COUNT = 300;
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const HR_TRANSLATIONS_TSV = `source_headword	HR	example_HR
machine	stroj; uređaj	Stroj kuha kavu.
magazine	časopis	Čita glazbeni časopis.
main	glavni	Ovo su glavna vrata.
make	napraviti; pripremiti	Pripremam ručak kod kuće.
man	muškarac	Muškarac je moj učitelj.
many	mnogo; mnogi	Ovdje ima mnogo učenika.
map	karta	Pogledaj kartu.
March	ožujak	Rođendan mi je u ožujku.
market	tržnica; tržište	Kupujemo voće na tržnici.
married	oženjen; udana	Moja sestra je udana.
May	svibanj	Škola završava u svibnju.
maybe	možda	Možda će padati kiša.
me	mene; mi	Pomozi mi, molim te.
meal	obrok; jelo	Jelo je toplo.
mean	značiti	Što znači znak?
meaning	značenje	Koje je značenje?
meat	meso	Jedem meso za večeru.
meet	upoznati; sastati se	Sastajemo se nakon škole.
meeting	sastanak	Sastanak počinje sada.
member	član	Ona je član kluba.
menu	jelovnik; meni	Pročitaj jelovnik.
message	poruka	Šaljem kratku poruku.
metre	metar	Hodaj jedan metar naprijed.
midnight	ponoć	Vlak polazi u ponoć.
mile	milja	Hodamo jednu milju.
milk	mlijeko	Pijem mlijeko za doručak.
million	milijun	Ovdje živi milijun ljudi.
minute1	minuta	Čekaj jednu minutu.
miss	nedostajati; propustiti	Nedostaje mi stara škola.
mistake	pogreška	U odgovoru je pogreška.
model	model	Ovo je mali model.
modern	moderan	Kuhinja je moderna.
moment	trenutak	Pričekaj trenutak.
Monday	ponedjeljak	Počinjemo raditi u ponedjeljak.
money	novac	Treba mi malo novca.
month	mjesec	Lipanj je topao mjesec.
more	više	Treba mi više vremena.
morning	jutro	Učim ujutro.
most	većina; najviše	Većina učenika voli glazbu.
mother	majka	Moja majka danas radi.
mountain	planina	Planina je vrlo visoka.
mouse	miš	Miš je ispod stolice.
mouth	usta	Otvori usta.
move	pomicati; preseliti	Pomakni stolicu ovamo.
movie	film	Večeras gledamo film.
much	mnogo; koliko	Koliko to košta?
mum	mama	Mama je kod kuće.
museum	muzej	Muzej se otvara u deset.
music	glazba	Slušam glazbu.
must modal	morati	Moraš stati ovdje.
my	moj; moja	Ovo je moja knjiga.
name	ime; imenovati	Napiši svoje ime ovdje.
natural	prirodan; prirodni	Ovaj sok je prirodan.
near	blizu	Banka je blizu.
need	trebati; potreba	Trebam olovku.
negative	negativan	Ovaj odgovor je negativan.
neighbour	susjed	Moj susjed je prijateljski raspoložen.
never	nikad	Nikad ne pijem kavu.
new	nov	Ovaj telefon je nov.
news	vijesti	Današnje vijesti su dobre.
newspaper	novine	Čita novine.
next	sljedeći	Sljedeći autobus kasni.
next to	pokraj	Sjedni pokraj mene.
nice	lijep; ugodan	Soba je ugodna.
night	noć	Spavam noću.
nine	devet	Ovdje je devet učenika.
nineteen	devetnaest	Ima devetnaest godina.
ninety	devedeset	Moj djed ima devedeset godina.
no	ne; nijedan	Ne, hvala.
no one	nitko	Nitko nije u sobi.
nobody	nitko	Nitko nije kod kuće.
north	sjever	Kolodvor je na sjeveru.
nose	nos	Moj nos je hladan.
not	ne	Nisam umoran.
note	bilješka	Napiši bilješku sada.
nothing	ništa	U kutiji nema ničega.
November	studeni	Moj tečaj počinje u studenome.
now	sada	Dođi ovamo sada.
number	broj	Napiši broj ovdje.
nurse	medicinska sestra; medicinski brat	Sestra je ljubazna.
object	predmet	Stavi predmet na stol.
o’clock	sati	Sat počinje u devet.
October	listopad	Putujemo u listopadu.
of	od; za	Ovo je šalica čaja.
off	isključen; dolje	Ugasi svjetlo.
office	ured	Moj ured je malen.
often	često	Često idem pješice u školu.
oh	o; aha	Aha, sada razumijem.
OK	u redu; okej	Je li to u redu?
old	star	Ova kuća je stara.
on	na; uključen	Knjiga je na stolu.
once	jednom	Zovem jednom tjedno.
one	jedan; jedna	Imam jednu sestru.
onion	luk	Nareži jedan luk.
online	online; na internetu	Učim online.
only	samo	Imam samo jednu torbu.
open	otvoren; otvoriti	Otvori prozor.
opinion	mišljenje	Koje je tvoje mišljenje?
opposite	nasuprot; suprotan	Trgovina je nasuprot banci.
or	ili	Čaj ili kava?
orange	naranča; narančast	Naranča je slatka.
order	narudžba; naručiti	Naručujem juhu.
other	drugi	Upotrijebi druga vrata.
our	naš; naša	Ovo je naš razred.
out	van; vani	Izađi nakon ručka.
outside	vani; izvana	Djeca se igraju vani.
over	iznad; preko	Zrakoplov leti iznad grada.
own	vlastit; posjedovati	Imam vlastitu sobu.
page	stranica	Otvori desetu stranicu.
paint	boja; bojiti	Oboji zid plavom bojom.
painting	slika	Slika je lijepa.
pair	par	Trebam par čarapa.
paper	papir; rad	Piši na ovaj papir.
paragraph	odlomak	Pročitaj prvi odlomak.
parent	roditelj	Jedan roditelj čeka vani.
park	park; parkirati	Parkiramo blizu kolodvora.
part	dio	Ovaj dio je lagan.
partner	partner; partnerica	Radi sa svojim partnerom.
party	zabava	Zabava počinje u sedam.
passport	putovnica	Pokaži putovnicu.
past	prošlost; nakon	Šest je i trideset.
pay	platiti	Plaćam karticom.
pen	olovka	Ova olovka je plava.
pencil	olovka; grafitna olovka	Pišem olovkom.
people	ljudi	Ovdje ima mnogo ljudi.
pepper	papar	Stavi papar u juhu.
perfect	savršen	Tvoj odgovor je savršen.
period	razdoblje; sat	Ovaj sat je kratak.
person	osoba	Jedna osoba čeka.
personal	osoban; osobni	Ovo je moj osobni telefon.
phone	telefon; nazvati	Moj telefon je u torbi.
photo	fotografija; slika	Snimi fotografiju ovdje.
photograph	fotografija; fotografirati	Fotografija je stara.
phrase	fraza	Ponovi ovu frazu.
piano	klavir	Svira klavir.
picture	slika	Pogledaj sliku.
piece	komad	Uzmi komad torte.
pig	svinja	Svinja je na farmi.
pink	ružičast	Njezina torba je ružičasta.
place	mjesto; staviti	Mjesto je tiho.
plan	plan	Treba nam plan.
plane	zrakoplov	Zrakoplov kasni.
plant	biljka; saditi	Zalij biljku danas.
play	igrati; predstava	Djeca se igraju u parku.
player	igrač	Igrač brzo trči.
please	molim	Molim te, sjedni ovdje.
point	točka; poanta	Ova je točka važna.
police	policija	Policija je vani.
policeman	policajac	Policajac nam pomaže.
pool	bazen	Bazen je hladan.
poor	siromašan	Siromašno dijete je gladno.
popular	popularan	Ova pjesma je popularna.
positive	pozitivan	Rezultat je pozitivan.
possible	moguć	Je li to moguće danas?
post	objava; pošta	Čitam njegovu objavu online.
potato	krumpir	Jedem jedan krumpir.
pound	funta	Košta jednu funtu.
practice	vježba; praksa	Vježba pomaže svaki dan.
practise	vježbati	Vježbam engleski svaki dan.
prefer	više voljeti	Više volim čaj.
prepare	pripremiti	Pripremi torbu navečer.
present	prisutan; poklon	Danas je prisutan.
pretty	lijep; prilično	Vrt je lijep.
price	cijena	Cijena je niska.
probably	vjerojatno	Vjerojatno zna.
problem	problem	Problem je malen.
product	proizvod	Proizvod je nov.
programme	program; emisija	Program počinje sada.
project	projekt	Naš projekt je gotov.
purple	ljubičast	Košulja je ljubičasta.
put	staviti	Stavi knjigu ovdje.
quarter	četvrt	Dva je i petnaest.
question	pitanje	Postavi pitanje.
quick	brz; kratak	Ovo je kratak test.
quickly	brzo	Idi brzo.
quiet	tih	Knjižnica je tiha.
quite	prilično	Soba je prilično mala.
radio	radio	Radio je glasan.
rain	kiša; padati kiša	Sada počinje padati kiša.
read	čitati	Pročitaj ovu rečenicu.
reader	čitatelj	Čitatelj voli priču.
reading	čitanje	Čitanje pomaže u učenju.
ready	spreman	Večera je spremna.
real	stvaran; pravi	Postoji stvaran problem.
really	stvarno	Stvarno volim ovu pjesmu.
reason	razlog	Reci razlog.
red	crven	Vrata su crvena.
relax	opustiti se	Opusti se nakon posla.
remember	sjetiti se; zapamtiti	Ne zaboravi putovnicu.
repeat	ponoviti	Ponovi rečenicu.
report	izvješće	Pročitaj izvješće večeras.
restaurant	restoran	Restoran je pun.
result	rezultat	Rezultat je dobar.
return	vratiti se; vratiti	Vrati knjigu sutra.
rice	riža	Jedem rižu za ručak.
rich	bogat	Ovaj grad je bogat.
ride	voziti se; jahati; vožnja	Vozim se biciklom u školu.
right	desni; točan	Ovdje skreni desno.
river	rijeka	Rijeka je široka.
road	cesta	Cesta je duga.
room	soba	Moja soba je čista.
routine	rutina; dnevni red	Moja rutina počinje rano.
rule	pravilo	Pravilo je jednostavno.
run	trčati	Trčim svako jutro.
sad	tužan	Danas sam tužan.
salad	salata	Salata je svježa.
salt	sol	Dodaj malo soli.
same	isti	Imamo istu torbu.
sandwich	sendvič	Jedem sendvič.
Saturday	subota	Sastajemo se u subotu.
say	reći	Reci svoje ime.
school	škola	Moja škola je blizu.
science	znanost	Učim znanost.
scientist	znanstvenik	Znanstvenik postavlja pitanje.
sea	more	More je plavo.
second1 (unit of time)	sekunda	Čekaj jednu sekundu.
section	odjeljak; dio	Pročitaj ovaj odjeljak.
see	vidjeti	Vidim svog prijatelja.
sell	prodati; prodavati	Prodaju svježe voće.
send	poslati	Pošalji poruku sada.
sentence	rečenica	Napiši rečenicu.
September	rujan	Škola počinje u rujnu.
seven	sedam	Ovdje je sedam ljudi.
seventeen	sedamnaest	Ima sedamnaest godina.
seventy	sedamdeset	Moja baka ima sedamdeset godina.
share	podijeliti; dijeliti	Podijeli tortu.
she	ona	Ona je moja sestra.
sheep	ovca	Ovca jede travu.
shirt	košulja	Košulja je čista.
shoe	cipela	Cipela je ispod kreveta.
shop	trgovina; kupovati	Trgovina se rano zatvara.
shopping	kupovina	Kupovina je danas zabavna.
short	kratak	Priča je kratka.
should modal	trebati	Trebao bi se danas odmoriti.
show	pokazati; emisija	Pokaži kartu.
shower	tuš; tuširati se	Tuširam se ujutro.
sick	bolestan	Danas sam bolestan.
similar	sličan	Naše torbe su slične.
sing	pjevati	Pjevam na satu.
singer	pjevač; pjevačica	Pjevač je poznat.
sister	sestra	Moja sestra je mlada.
sit	sjediti; sjesti	Sjedni pokraj prozora.
situation	situacija	Situacija je nova.
six	šest	Ovdje je šest knjiga.
sixteen	šesnaest	Ima šesnaest godina.
sixty	šezdeset	Moj otac ima šezdeset godina.
skill	vještina	Ova vještina je korisna.
skirt	suknja	Suknja je plava.
sleep	spavati; san	Spavam osam sati.
slow	spor	Autobus je spor.
small	malen	Soba je mala.
snake	zmija	Zmija je duga.
snow	snijeg; padati snijeg	Zimi pada snijeg.
so	tako; zato	Umoran sam, zato se odmaram.
some	neki; malo	Trebam malo vode.
somebody	netko	Netko je na vratima.
someone	netko	Netko je ostavio poruku.
something	nešto	Trebam nešto za piće.
sometimes	ponekad	Ponekad idem pješice u školu.
son	sin	Njezin sin je u školi.
song	pjesma	Ova pjesma je nova.
soon	uskoro	Vidimo se uskoro.
sorry	oprosti; žao mi je	Žao mi je.
sound	zvuk; zvučati	Zvuk je glasan.
soup	juha	Juha je vruća.
south	jug	Hotel je na jugu.
space	prostor; mjesto	Ima mjesta za stolicu.
speak	govoriti	Govori polako, molim te.
special	poseban	Danas je poseban dan.
spell	slovkati	Slovkaj svoje ime.
spelling	pravopis	Provjeri pravopis.
spend	trošiti; provesti	Trošim novac na hranu.
sport	sport	Nogomet je popularan sport.
spring	proljeće; opruga	U proljeće cvijeće raste.
stand	stajati	Stani pokraj vrata.
star	zvijezda	Vidim sjajnu zvijezdu.
start	početi; početak	Počni lekciju sada.
statement	izjava	Tvrdnja je istinita.
station	kolodvor; stanica	Kolodvor je blizu.
stay	ostati	Ostani danas kod kuće.
still	još	Još sam gladan.
stop	zaustaviti; stanica	Stani na uglu.
story	priča	Ispričaj priču.
street	ulica	Ulica je tiha.
strong	jak	On je jak.
student	učenik; student	Učenik čita knjigu.
study	učiti; studij	Učim engleski.
style	stil	Sviđa mi se ovaj stil.
subject	predmet; tema	Engleski je moj glavni predmet.
success	uspjeh	Uspjeh traži vježbu.
sugar	šećer	Stavi šećer u čaj.
summer	ljeto	Ljeto je ovdje vruće.
sun	sunce	Sunce je sjajno.
Sunday	nedjelja	Nedjeljom se odmaramo.
supermarket	supermarket	Supermarket je otvoren.
sure	siguran; naravno	Siguran sam.
sweater	džemper	Moj džemper je topao.
swim	plivati	Plivam svaki tjedan.
swimming	plivanje	Plivanje je dobra vježba.
table	stol	Ključevi su na stolu.`;

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
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Croatian rows, found ${lines.length}`);
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
      throw new Error(`Croatian example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Croatian display/example must contain Latin text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Croatian display/example contains non-Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Croatian translation row for ${sourceHeadword}`);
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
    "Generate SR support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after SR.",
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
  const translations = parseTsv(HR_TRANSLATIONS_TSV);

  if (rows.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Croatian translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Croatian translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(JSONL_PATH), { recursive: true });
  await writeFile(JSONL_PATH, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Croatian; nouns use nominative singular display forms
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: HR Latin-script display/example cells with Croatian diacritics allowed and no non-Latin script leakage
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
    next_language: "SR",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
