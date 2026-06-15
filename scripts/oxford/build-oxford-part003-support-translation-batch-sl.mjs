#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_003_300_v1";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_sl_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_sl_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-sl.mjs";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "SL";
const BATCH_ID = "sl_v1";
const RELEASE_ENTRY_COUNT = 300;
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /\p{Script=Latin}/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const SL_TRANSLATIONS_TSV = `source_headword	SL	example_SL
machine	stroj; naprava	Stroj kuha kavo.
magazine	revija	Bere glasbeno revijo.
main	glavni	To so glavna vrata.
make	narediti; pripraviti	Pripravljam kosilo doma.
man	moški	Moški je moj učitelj.
many	veliko; mnogi	Tukaj je veliko učencev.
map	zemljevid	Poglej zemljevid.
March	marec	Rojstni dan imam marca.
market	tržnica; trg	Kupujemo sadje na tržnici.
married	poročen; poročena	Moja sestra je poročena.
May	maj	Šola se konča maja.
maybe	mogoče; morda	Morda bo deževalo.
me	mene; mi	Pomagaj mi, prosim.
meal	obrok; jed	Jed je topla.
mean	pomeniti	Kaj pomeni znak?
meaning	pomen	Kakšen je pomen?
meat	meso	Jem meso za večerjo.
meet	spoznati; sestati se	Srečamo se po šoli.
meeting	sestanek	Sestanek se začne zdaj.
member	član; članica	Ona je članica kluba.
menu	jedilnik; meni	Preberi jedilnik.
message	sporočilo	Pošiljam kratko sporočilo.
metre	meter	Stopi en meter naprej.
midnight	polnoč	Vlak odpelje ob polnoči.
mile	milja	Hodimo eno miljo.
milk	mleko	Pijem mleko za zajtrk.
million	milijon	Tukaj živi milijon ljudi.
minute1	minuta	Počakaj eno minuto.
miss	pogrešati; zamuditi	Pogrešam staro šolo.
mistake	napaka	V odgovoru je napaka.
model	model	To je majhen model.
modern	moderen; sodoben	Kuhinja je moderna.
moment	trenutek	Počakaj trenutek.
Monday	ponedeljek	V ponedeljek začnemo delati.
money	denar	Potrebujem malo denarja.
month	mesec	Junij je topel mesec.
more	več	Potrebujem več časa.
morning	jutro	Učim se zjutraj.
most	večina; največ	Večina učencev ima rada glasbo.
mother	mati; mama	Moja mama danes dela.
mountain	gora	Gora je zelo visoka.
mouse	miš	Miš je pod stolom.
mouth	usta	Odpri usta.
move	premakniti; preseliti	Premakni stol sem.
movie	film	Nocoj gledamo film.
much	veliko; koliko	Koliko to stane?
mum	mama	Mama je doma.
museum	muzej	Muzej se odpre ob desetih.
music	glasba	Poslušam glasbo.
must modal	morati	Tukaj moraš stati.
my	moj; moja	To je moja knjiga.
name	ime; imenovati	Tukaj napiši svoje ime.
natural	naraven; naravni	Ta sok je naraven.
near	blizu	Banka je blizu.
need	potrebovati; potreba	Potrebujem pisalo.
negative	negativen	Ta odgovor je negativen.
neighbour	sosed; soseda	Moj sosed je prijazen.
never	nikoli	Nikoli ne pijem kave.
new	nov	Ta telefon je nov.
news	novice	Današnje novice so dobre.
newspaper	časopis	Bere časopis.
next	naslednji	Naslednji avtobus zamuja.
next to	poleg	Sedi poleg mene.
nice	lep; prijeten	Soba je prijetna.
night	noč	Spim ponoči.
nine	devet	Tukaj je devet učencev.
nineteen	devetnajst	Star je devetnajst let.
ninety	devetdeset	Moj dedek ima devetdeset let.
no	ne; noben	Ne, hvala.
no one	nihče	Nihče ni v sobi.
nobody	nihče	Nihče ni doma.
north	sever	Postaja je na severu.
nose	nos	Moj nos je hladen.
not	ne	Nisem utrujen.
note	opomba; zapisek	Napiši zapisek zdaj.
nothing	nič	V škatli ni ničesar.
November	november	Moj tečaj se začne novembra.
now	zdaj	Pridi sem zdaj.
number	številka; število	Tukaj napiši številko.
nurse	medicinska sestra; zdravstveni brat	Sestra je prijazna.
object	predmet	Položi predmet na mizo.
o’clock	ura	Ura se začne ob devetih.
October	oktober	Potujemo oktobra.
of	od; iz	To je skodelica čaja.
off	izklopljen; dol	Ugasni luč.
office	pisarna	Moja pisarna je majhna.
often	pogosto	Pogosto grem peš v šolo.
oh	o; aha	Aha, zdaj razumem.
OK	v redu; okej	Je to v redu?
old	star	Ta hiša je stara.
on	na; vključen	Knjiga je na mizi.
once	enkrat	Kličem enkrat na teden.
one	en; ena	Imam eno sestro.
onion	čebula	Nareži eno čebulo.
online	na spletu; spletno	Učim se na spletu.
only	samo	Imam samo eno torbo.
open	odprt; odpreti	Odpri okno.
opinion	mnenje	Kakšno je tvoje mnenje?
opposite	nasproti; nasproten	Trgovina je nasproti banke.
or	ali	Čaj ali kava?
orange	pomaranča; oranžen	Pomaranča je sladka.
order	naročilo; naročiti	Naročam juho.
other	drugi	Uporabi druga vrata.
our	naš; naša	To je naš razred.
out	ven; zunaj	Pojdi ven po kosilu.
outside	zunaj; zunanji	Otroci se igrajo zunaj.
over	nad; čez	Letalo leti nad mestom.
own	lasten; imeti	Imam svojo sobo.
page	stran	Odpri deseto stran.
paint	barva; barvati	Pobarvaj steno modro.
painting	slika	Slika je lepa.
pair	par	Potrebujem par nogavic.
paper	papir; naloga	Piši na ta papir.
paragraph	odstavek	Preberi prvi odstavek.
parent	starš	En starš čaka zunaj.
park	park; parkirati	Parkiramo blizu postaje.
part	del	Ta del je lahek.
partner	partner; partnerica	Delaj s svojim partnerjem.
party	zabava	Zabava se začne ob sedmih.
passport	potni list	Pokaži potni list.
past	preteklost; čez	Ura je šest trideset.
pay	plačati	Plačam s kartico.
pen	pisalo; kemični svinčnik	To pisalo je modro.
pencil	svinčnik	Pišem s svinčnikom.
people	ljudje	Tukaj je veliko ljudi.
pepper	poper	Daj poper v juho.
perfect	popoln	Tvoj odgovor je popoln.
period	obdobje; ura	Ta ura je kratka.
person	oseba	Ena oseba čaka.
personal	oseben; osebni	To je moj osebni telefon.
phone	telefon; poklicati	Moj telefon je v torbi.
photo	fotografija; slika	Tukaj posnemi fotografijo.
photograph	fotografija; fotografirati	Fotografija je stara.
phrase	fraza; besedna zveza	Ponovi to frazo.
piano	klavir	Igra klavir.
picture	slika	Poglej sliko.
piece	kos	Vzemi kos torte.
pig	prašič	Prašič je na kmetiji.
pink	rožnat	Njena torba je rožnata.
place	kraj; mesto; postaviti	Kraj je tih.
plan	načrt	Potrebujemo načrt.
plane	letalo	Letalo zamuja.
plant	rastlina; saditi	Zalij rastlino danes.
play	igrati; predstava	Otroci se igrajo v parku.
player	igralec; igralka	Igralec hitro teče.
please	prosim	Prosim, sedi tukaj.
point	točka; bistvo	Ta točka je pomembna.
police	policija	Policija je zunaj.
policeman	policist	Policist nam pomaga.
pool	bazen	Bazen je hladen.
poor	reven	Reven otrok je lačen.
popular	priljubljen; popularen	Ta pesem je priljubljena.
positive	pozitiven	Rezultat je pozitiven.
possible	možen	Je to danes mogoče?
post	objava; pošta	Berem njegovo objavo na spletu.
potato	krompir	Jem en krompir.
pound	funt	Stane en funt.
practice	vaja; praksa	Vaja pomaga vsak dan.
practise	vaditi	Vsak dan vadim angleščino.
prefer	raje imeti	Raje imam čaj.
prepare	pripraviti	Zvečer pripravi torbo.
present	prisoten; darilo	Danes je prisoten.
pretty	lep; precej	Vrt je lep.
price	cena	Cena je nizka.
probably	verjetno	Verjetno ve.
problem	problem; težava	Problem je majhen.
product	izdelek	Izdelek je nov.
programme	program; oddaja	Program se začne zdaj.
project	projekt	Naš projekt je končan.
purple	vijoličen	Srajca je vijolična.
put	postaviti; dati	Položi knjigo sem.
quarter	četrt	Ura je dve in petnajst.
question	vprašanje	Postavi vprašanje.
quick	hiter; kratek	To je kratek test.
quickly	hitro	Pojdi hitro.
quiet	tih	Knjižnica je tiha.
quite	precej	Soba je precej majhna.
radio	radio	Radio je glasen.
rain	dež; deževati	Zdaj začne deževati.
read	brati	Preberi ta stavek.
reader	bralec; bralka	Bralec ima rad zgodbo.
reading	branje	Branje pomaga pri učenju.
ready	pripravljen	Večerja je pripravljena.
real	resničen; pravi	Obstaja resničen problem.
really	res; zares	Res imam rad to pesem.
reason	razlog	Povej razlog.
red	rdeč	Vrata so rdeča.
relax	sprostiti se	Sprosti se po delu.
remember	spomniti se; zapomniti si	Ne pozabi potnega lista.
repeat	ponoviti	Ponovi stavek.
report	poročilo	Preberi poročilo zvečer.
restaurant	restavracija	Restavracija je polna.
result	rezultat	Rezultat je dober.
return	vrniti se; vrniti	Vrni knjigo jutri.
rice	riž	Jem riž za kosilo.
rich	bogat	To mesto je bogato.
ride	voziti se; jahati; vožnja	Vozim se s kolesom v šolo.
right	desni; pravilen	Tukaj zavij desno.
river	reka	Reka je široka.
road	cesta	Cesta je dolga.
room	soba	Moja soba je čista.
routine	rutina; dnevni red	Moja rutina se začne zgodaj.
rule	pravilo	Pravilo je preprosto.
run	teči	Tečem vsako jutro.
sad	žalosten	Danes sem žalosten.
salad	solata	Solata je sveža.
salt	sol	Dodaj malo soli.
same	isti	Imamo isto torbo.
sandwich	sendvič	Jem sendvič.
Saturday	sobota	Srečamo se v soboto.
say	reči	Povej svoje ime.
school	šola	Moja šola je blizu.
science	znanost; naravoslovje	Učim se naravoslovje.
scientist	znanstvenik; znanstvenica	Znanstvenik postavi vprašanje.
sea	morje	Morje je modro.
second1 (unit of time)	sekunda	Počakaj eno sekundo.
section	razdelek; del	Preberi ta razdelek.
see	videti	Vidim svojega prijatelja.
sell	prodati; prodajati	Prodajajo sveže sadje.
send	poslati	Pošlji sporočilo zdaj.
sentence	stavek	Napiši stavek.
September	september	Šola se začne septembra.
seven	sedem	Tukaj je sedem ljudi.
seventeen	sedemnajst	Star je sedemnajst let.
seventy	sedemdeset	Moja babica ima sedemdeset let.
share	deliti; razdeliti	Razdeli torto.
she	ona	Ona je moja sestra.
sheep	ovca	Ovca je travo.
shirt	srajca	Srajca je čista.
shoe	čevelj	Čevelj je pod posteljo.
shop	trgovina; kupovati	Trgovina se zgodaj zapre.
shopping	nakupovanje	Nakupovanje je danes zabavno.
short	kratek	Zgodba je kratka.
should modal	naj; bi moral	Danes bi moral počivati.
show	pokazati; oddaja	Pokaži zemljevid.
shower	prha; tuširati se	Zjutraj se tuširam.
sick	bolan	Danes sem bolan.
similar	podoben	Najini torbi sta podobni.
sing	peti	Pojem pri uri.
singer	pevec; pevka	Pevec je znan.
sister	sestra	Moja sestra je mlada.
sit	sedeti; sesti	Sedi poleg okna.
situation	položaj; situacija	Situacija je nova.
six	šest	Tukaj je šest knjig.
sixteen	šestnajst	Star je šestnajst let.
sixty	šestdeset	Moj oče ima šestdeset let.
skill	spretnost; veščina	Ta veščina je koristna.
skirt	krilo	Krilo je modro.
sleep	spati; spanec	Spim osem ur.
slow	počasen	Avtobus je počasen.
small	majhen	Soba je majhna.
snake	kača	Kača je dolga.
snow	sneg; snežiti	Pozimi sneži.
so	tako; zato	Utrujen sem, zato počivam.
some	nekaj; malo	Potrebujem malo vode.
somebody	nekdo	Nekdo je pri vratih.
someone	nekdo	Nekdo je pustil sporočilo.
something	nekaj	Potrebujem nekaj za piti.
sometimes	včasih	Včasih grem peš v šolo.
son	sin	Njen sin je v šoli.
song	pesem	Ta pesem je nova.
soon	kmalu	Se vidimo kmalu.
sorry	oprosti; žal mi je	Žal mi je.
sound	zvok; zveneti	Zvok je glasen.
soup	juha	Juha je vroča.
south	jug	Hotel je na jugu.
space	prostor; vesolje	Je prostor za stol.
speak	govoriti	Govori počasi, prosim.
special	poseben	Danes je poseben dan.
spell	črkovati	Črkuj svoje ime.
spelling	črkovanje; pravopis	Preveri pravopis.
spend	porabiti; preživeti	Denar porabim za hrano.
sport	šport	Nogomet je priljubljen šport.
spring	pomlad; vzmet	Spomladi rastejo rože.
stand	stati	Stoj poleg vrat.
star	zvezda	Vidim svetlo zvezdo.
start	začeti; začetek	Začni lekcijo zdaj.
statement	izjava	Trditev je pravilna.
station	postaja	Postaja je blizu.
stay	ostati	Danes ostani doma.
still	še	Še sem lačen.
stop	ustaviti; postaja	Ustavi se na vogalu.
story	zgodba	Povej zgodbo.
street	ulica	Ulica je tiha.
strong	močan	On je močan.
student	učenec; študent	Učenec bere knjigo.
study	učiti se; študij	Učim se angleščino.
style	slog; stil	Všeč mi je ta slog.
subject	predmet; tema	Angleščina je moj glavni predmet.
success	uspeh	Uspeh zahteva vajo.
sugar	sladkor	Daj sladkor v čaj.
summer	poletje	Poletje je tukaj vroče.
sun	sonce	Sonce je svetlo.
Sunday	nedelja	Ob nedeljah počivamo.
supermarket	supermarket	Supermarket je odprt.
sure	prepričan; seveda	Prepričan sem.
sweater	pulover	Moj pulover je topel.
swim	plavati	Plavam vsak teden.
swimming	plavanje	Plavanje je dobra vaja.
table	miza	Ključi so na mizi.`;

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
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Slovenian rows, found ${lines.length}`);
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
      throw new Error(`Slovenian example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Slovenian display/example must contain Latin text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Slovenian display/example contains non-Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Slovenian translation row for ${sourceHeadword}`);
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
    "Generate LT support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after LT.",
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
  const translations = parseTsv(SL_TRANSLATIONS_TSV);

  if (rows.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Slovenian translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Slovenian translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(JSONL_PATH), { recursive: true });
  await writeFile(JSONL_PATH, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Slovenian; nouns use nominative singular display forms
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: SL Latin-script display/example cells with Slovenian diacritics allowed and no non-Latin script leakage
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
    next_language: "LT",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
