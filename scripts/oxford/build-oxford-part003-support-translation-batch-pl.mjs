#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "PL";
const BATCH_ID = "pl_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-pl.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const PL_TRANSLATIONS_TSV = `source_headword	PL	example_PL
machine	maszyna; urządzenie	Ta maszyna robi kawę.
magazine	magazyn; czasopismo	Ona czyta magazyn muzyczny.
main	główny	To główne drzwi.
make	robić; przygotować	Robię lunch w domu.
man	mężczyzna	Ten mężczyzna jest moim nauczycielem.
many	wiele; dużo	Wielu uczniów jest tutaj.
map	mapa	Spójrz na mapę.
March	marzec	Moje urodziny są w marcu.
market	rynek; targ	Kupujemy owoce na targu.
married	żonaty; zamężna	Moja siostra jest zamężna.
May	maj	Szkoła kończy się w maju.
maybe	może	Może będzie padać.
me	mnie; ja	Proszę, pomóż mi.
meal	posiłek	Ten posiłek jest gorący.
mean	znaczyć	Co znaczy ten znak?
meaning	znaczenie	Jakie jest znaczenie?
meat	mięso	Jem mięso na kolację.
meet	spotkać; spotykać	Spotykamy się po szkole.
meeting	spotkanie	Zebranie zaczyna się teraz.
member	członek	Ona jest członkiem klubu.
menu	menu	Przeczytaj menu.
message	wiadomość	Wysyłam krótką wiadomość.
metre	metr	Idź jeden metr naprzód.
midnight	północ	Pociąg odjeżdża o północy.
mile	mila	Idziemy jedną milę.
milk	mleko	Piję mleko na śniadanie.
million	milion	Milion ludzi mieszka tutaj.
minute1	minuta	Poczekaj jedną minutę.
miss	tęsknić; przegapić	Tęsknię za starą szkołą.
mistake	błąd	W tej odpowiedzi jest jeden błąd.
model	model	To mały model.
modern	nowoczesny	Kuchnia jest nowoczesna.
moment	chwila	Poczekaj chwilę.
Monday	poniedziałek	Zaczynamy pracę w poniedziałek.
money	pieniądze	Potrzebuję trochę pieniędzy.
month	miesiąc	Czerwiec jest gorącym miesiącem.
more	więcej	Potrzebuję więcej czasu.
morning	ranek	Uczę się rano.
most	większość; najbardziej	Większość uczniów lubi muzykę.
mother	matka; mama	Moja mama dziś pracuje.
mountain	góra	Ta góra jest bardzo wysoka.
mouse	mysz	Mysz jest pod krzesłem.
mouth	usta	Otwórz usta.
move	ruszać; przenieść	Przenieś krzesło tutaj.
movie	film	Oglądamy film dziś wieczorem.
much	dużo; ile	Ile to kosztuje?
mum	mama	Mama jest w domu.
museum	muzeum	Muzeum otwiera się o dziesiątej.
music	muzyka	Słucham muzyki.
must modal	musieć	Musisz się tutaj zatrzymać.
my	mój	To moja książka.
name	imię; nazwa	Napisz tu swoje imię.
natural	naturalny	Ten sok jest naturalny.
near	blisko	Bank jest blisko stąd.
need	potrzebować	Potrzebuję długopisu.
negative	negatywny; przeczenie	Ta odpowiedź jest negatywna.
neighbour	sąsiad; sąsiadka	Mój sąsiad jest przyjazny.
never	nigdy	Nigdy nie piję kawy.
new	nowy	Ten telefon jest nowy.
news	wiadomości	Dzisiejsze wiadomości są dobre.
newspaper	gazeta	On czyta gazetę.
next	następny	Następny autobus jest spóźniony.
next to	obok	Usiądź obok mnie.
nice	miły; przyjemny	Ten pokój jest przyjemny.
night	noc	Śpię w nocy.
nine	dziewięć	Dziewięciu uczniów jest tutaj.
nineteen	dziewiętnaście	Ona ma dziewiętnaście lat.
ninety	dziewięćdziesiąt	Mój dziadek ma dziewięćdziesiąt lat.
no	nie; żaden	Nie, dziękuję.
no one	nikt	Nikogo nie ma w pokoju.
nobody	nikt	Nikogo nie ma w domu.
north	północ	Stacja jest na północy.
nose	nos	Mój nos jest zimny.
not	nie	Nie jestem zmęczony.
note	notatka	Napisz teraz notatkę.
nothing	nic	Nic nie ma w pudełku.
November	listopad	Mój kurs zaczyna się w listopadzie.
now	teraz	Przyjdź tutaj teraz.
number	numer; liczba	Napisz numer tutaj.
nurse	pielęgniarka	Pielęgniarka jest miła.
object	przedmiot; obiekt	Połóż przedmiot na stole.
o’clock	godzina	Lekcja zaczyna się o dziewiątej.
October	październik	Podróżujemy w październiku.
of	z; od	To jest filiżanka herbaty.
off	wyłączony; z dala	Wyłącz światło.
office	biuro	Moje biuro jest małe.
often	często	Często chodzę do szkoły.
oh	och	Och, teraz rozumiem.
OK	w porządku	Czy tak jest w porządku?
old	stary	Ten dom jest stary.
on	na; włączony	Książka jest na stole.
once	raz	Dzwonię raz w tygodniu.
one	jeden	Mam jedną siostrę.
onion	cebula	Pokrój jedną cebulę.
online	online; internetowy	Uczę się online.
only	tylko	Mam tylko jedną torbę.
open	otwarty; otwierać	Otwórz okno.
opinion	opinia	Jaka jest twoja opinia?
opposite	naprzeciwko; przeciwny	Sklep jest naprzeciwko banku.
or	lub; albo	Herbata czy kawa?
orange	pomarańcza; pomarańczowy	Ta pomarańcza jest słodka.
order	zamówienie; zamawiać	Zamawiam zupę.
other	inny	Użyj innych drzwi.
our	nasz	To jest nasza klasa.
out	na zewnątrz	Wyjdź na zewnątrz po lunchu.
outside	na zewnątrz	Dzieci bawią się na zewnątrz.
over	nad; przez	Samolot leci nad miastem.
own	własny; posiadać	Mam własny pokój.
page	strona	Otwórz stronę dziesiątą.
paint	farba; malować	Pomaluj ścianę na niebiesko.
painting	obraz; malowanie	Ten obraz jest piękny.
pair	para	Potrzebuję pary skarpet.
paper	papier	Napisz na tym papierze.
paragraph	akapit	Przeczytaj pierwszy akapit.
parent	rodzic	Jeden rodzic czeka na zewnątrz.
park	park; parkować	Parkujemy blisko stacji.
part	część	Ta część jest łatwa.
partner	partner; współpracownik	Pracuj ze swoim partnerem.
party	przyjęcie	Impreza zaczyna się o siódmej.
passport	paszport	Pokaż swój paszport.
past	przeszłość; po	Jest wpół do siódmej.
pay	płacić	Płacę kartą.
pen	długopis	Ten długopis jest niebieski.
pencil	ołówek	Piszę ołówkiem.
people	ludzie	Wielu ludzi jest tutaj.
pepper	pieprz	Dodaj pieprzu do zupy.
perfect	doskonały	Twoja odpowiedź jest doskonała.
period	okres; lekcja	Ta lekcja jest krótka.
person	osoba	Jedna osoba czeka.
personal	osobisty	To mój osobisty telefon.
phone	telefon; dzwonić	Mój telefon jest w torbie.
photo	zdjęcie	Zrób zdjęcie tutaj.
photograph	fotografia; fotografować	To zdjęcie jest stare.
phrase	fraza	Powtórz tę frazę.
piano	pianino	Ona gra na pianinie.
picture	obraz; zdjęcie	Spójrz na ten obrazek.
piece	kawałek	Weź kawałek ciasta.
pig	świnia	Świnia jest na farmie.
pink	różowy	Jej torba jest różowa.
place	miejsce; położyć	To miejsce jest ciche.
plan	plan	Potrzebujemy planu.
plane	samolot	Samolot jest spóźniony.
plant	roślina; sadzić	Podlej dziś roślinę.
play	bawić się; grać	Dzieci bawią się w parku.
player	gracz; zawodnik	Zawodnik biegnie szybko.
please	proszę	Proszę usiąść tutaj.
point	punkt; kwestia	Ten punkt jest ważny.
police	policja	Policja jest na zewnątrz.
policeman	policjant	Policjant nam pomaga.
pool	basen	Basen jest zimny.
poor	biedny; słaby	Biedne dziecko jest głodne.
popular	popularny	Ta piosenka jest popularna.
positive	pozytywny	To pozytywny wynik.
possible	możliwy	Czy to dziś możliwe?
post	post; wysyłać	Czytam jej post online.
potato	ziemniak	Jem jednego ziemniaka.
pound	funt	To kosztuje jeden funt.
practice	ćwiczenie; praktyka	Ćwiczenie pomaga codziennie.
practise	ćwiczyć	Ćwiczę angielski codziennie.
prefer	woleć	Wolę herbatę.
prepare	przygotować	Przygotuj torbę dziś wieczorem.
present	obecny; prezent	Ona jest dziś obecna.
pretty	ładny; dość	Ogród jest ładny.
price	cena	Cena jest niska.
probably	prawdopodobnie	Ona prawdopodobnie wie.
problem	problem	Ten problem jest mały.
product	produkt	Ten produkt jest nowy.
programme	program	Program zaczyna się teraz.
project	projekt	Nasz projekt jest gotowy.
purple	fioletowy	Koszula jest fioletowa.
put	kłaść; położyć	Połóż książkę tutaj.
quarter	ćwierć; piętnaście minut	Jest druga piętnaście.
question	pytanie	Zadaj jedno pytanie.
quick	szybki; krótki	To krótki test.
quickly	szybko	Idź szybko.
quiet	cichy	Biblioteka jest cicha.
quite	dość	Ten pokój jest dość mały.
radio	radio	Radio jest bardzo głośne.
rain	deszcz; padać	Deszcz zaczyna padać.
read	czytać	Przeczytaj to zdanie.
reader	czytelnik	Czytelnik lubi tę historię.
reading	czytanie	Czytanie pomaga mi się uczyć.
ready	gotowy	Kolacja jest gotowa.
real	prawdziwy	Jest prawdziwy problem.
really	naprawdę	Naprawdę lubię tę piosenkę.
reason	powód	Podaj mi powód.
red	czerwony	Drzwi są czerwone.
relax	odpoczywać; relaksować się	Odpocznij po pracy.
remember	pamiętać	Pamiętaj o paszporcie.
repeat	powtarzać	Powtórz to zdanie.
report	raport	Przeczytaj raport dziś wieczorem.
restaurant	restauracja	Restauracja jest zatłoczona.
result	wynik	Wynik jest dobry.
return	wracać; zwrócić	Zwróć książkę jutro.
rice	ryż	Jem ryż na lunch.
rich	bogaty	To miasto jest bogate.
ride	jechać; przejażdżka	Jadę na rowerze.
right	prawy; poprawny	Skręć tutaj w prawo.
river	rzeka	Rzeka jest szeroka.
road	droga	Ta droga jest długa.
room	pokój	Pokój jest czysty.
routine	rutyna	Moja rutyna zaczyna się wcześnie.
rule	reguła; zasada	Ta zasada jest prosta.
run	biegać	Biegam każdego ranka.
sad	smutny	On jest dziś smutny.
salad	sałatka	Ta sałatka jest świeża.
salt	sól	Dodaj trochę soli.
same	taki sam	Mamy taką samą torbę.
sandwich	kanapka	Jem jedną kanapkę.
Saturday	sobota	Spotykamy się w sobotę.
say	mówić	Powiedz swoje imię.
school	szkoła	Moja szkoła jest blisko.
science	nauka	Uczę się nauk ścisłych.
scientist	naukowiec	Naukowiec zadaje pytanie.
sea	morze	Morze jest niebieskie.
second1 (unit of time)	sekunda	Poczekaj jedną sekundę.
section	sekcja; część	Przeczytaj tę sekcję.
see	widzieć; spotkać	Widzę mojego przyjaciela.
sell	sprzedawać	Oni sprzedają świeże owoce.
send	wysyłać	Wyślij wiadomość teraz.
sentence	zdanie	Napisz jedno zdanie.
September	wrzesień	Szkoła zaczyna się we wrześniu.
seven	siedem	Siedem osób jest tutaj.
seventeen	siedemnaście	On ma siedemnaście lat.
seventy	siedemdziesiąt	Moja babcia ma siedemdziesiąt lat.
share	dzielić się; podzielić	Podziel ciasto.
she	ona	Ona jest moją siostrą.
sheep	owca	Owca je trawę.
shirt	koszula	Jego koszula jest czysta.
shoe	but	Jeden but jest pod łóżkiem.
shop	sklep; robić zakupy	Sklep zamyka się wcześnie.
shopping	zakupy	Zakupy są dziś przyjemne.
short	krótki	Ta historia jest krótka.
should modal	powinien	Powinieneś dziś odpocząć.
show	pokazywać; program	Pokaż mi swój bilet.
shower	prysznic; brać prysznic	Biorę prysznic.
sick	chory	Czuję się dziś chory.
similar	podobny	Nasze torby są podobne.
sing	śpiewać	Śpiewam na lekcji.
singer	piosenkarz; piosenkarka	Ta piosenkarka jest sławna.
sister	siostra	Moja siostra jest młoda.
sit	siedzieć	Usiądź przy oknie.
situation	sytuacja	Ta sytuacja jest nowa.
six	sześć	Sześć książek jest tutaj.
sixteen	szesnaście	Ona ma szesnaście lat.
sixty	sześćdziesiąt	Mój tata ma sześćdziesiąt lat.
skill	umiejętność	Ta umiejętność jest przydatna.
skirt	spódnica	Jej spódnica jest niebieska.
sleep	spać; sen	Śpię osiem godzin.
slow	powolny	Autobus jest powolny.
small	mały	Pokój jest mały.
snake	wąż	Wąż jest długi.
snow	śnieg; padać śnieg	Śnieg pada zimą.
so	więc; tak	Jestem zmęczony, więc odpoczywam.
some	kilka; trochę	Potrzebuję trochę wody.
somebody	ktoś	Ktoś jest przy drzwiach.
someone	ktoś	Ktoś zostawił wiadomość.
something	coś	Potrzebuję czegoś do picia.
sometimes	czasami	Czasami chodzę do szkoły pieszo.
son	syn	Jej syn jest w szkole.
song	piosenka	Ta piosenka jest nowa.
soon	wkrótce	Do zobaczenia wkrótce.
sorry	przepraszam	Przepraszam.
sound	dźwięk; brzmieć	Dźwięk jest głośny.
soup	zupa	Zupa jest gorąca.
south	południe	Hotel jest na południu.
space	miejsce; przestrzeń	Jest miejsce na krzesło.
speak	mówić	Proszę mówić powoli.
special	specjalny	Dziś jest specjalny dzień.
spell	literować	Przeliteruj swoje imię.
spelling	pisownia	Sprawdź pisownię.
spend	wydawać; spędzać	Wydaję pieniądze na jedzenie.
sport	sport	Piłka nożna to popularny sport.
spring	wiosna; skok	Kwiaty rosną wiosną.
stand	stać	Stań przy drzwiach.
star	gwiazda	Widzę jasną gwiazdę.
start	zaczynać	Zacznij lekcję teraz.
statement	stwierdzenie	To stwierdzenie jest poprawne.
station	stacja	Stacja jest blisko.
stay	zostać; mieszkać	Zostań dziś w domu.
still	wciąż	Wciąż jestem głodny.
stop	zatrzymać; przystanek	Zatrzymaj się na rogu.
story	historia	Opowiedz mi historię.
street	ulica	Ta ulica jest cicha.
strong	silny	On jest silny.
student	uczeń; student	Student czyta książkę.
study	uczyć się; studia	Uczę się angielskiego.
style	styl	Lubię ten styl.
subject	przedmiot; temat	Angielski jest moim głównym przedmiotem.
success	sukces	Sukces wymaga ćwiczeń.
sugar	cukier	Dodaj cukier do herbaty.
summer	lato	Lato jest tutaj gorące.
sun	słońce	Słońce świeci.
Sunday	niedziela	Odpoczywamy w niedzielę.
supermarket	supermarket	Supermarket jest otwarty.
sure	pewny	Jestem pewien.
sweater	sweter	Mój sweter jest ciepły.
swim	pływać	Pływam co tydzień.
swimming	pływanie	Pływanie to dobre ćwiczenie.
table	stół	Klucze są na stole.`;

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
      throw new Error(`Polish example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Polish display/example must contain Latin text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Polish display/example contains non-Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Polish translation row for ${sourceHeadword}`);
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
    "Generate NL support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after NL.",
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
    throw new Error("Usage: node scripts/oxford/build-oxford-part003-support-translation-batch-pl.mjs --contract=<contract.json>");
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const outputPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_pl_v1.jsonl";
  const summaryPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_pl_v1_summary.md";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== "oxford_3000_core_a1_part_003_300_v1") {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(PL_TRANSLATIONS_TSV);

  if (rows.length !== 300) {
    throw new Error(`Expected 300 Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Polish translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Polish translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Polish
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: PL Latin-script display/example cells, Polish diacritics allowed and no non-Latin script leakage
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
