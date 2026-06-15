#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "PL";
const BATCH_ID = "pl_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-pl.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const PL_TRANSLATIONS_TSV = `source_headword	PL	example_PL
clothes	ubrania	Moje ubrania są czyste.
club	klub	Ona chodzi do klubu muzycznego.
coat	płaszcz	Mój płaszcz jest ciepły.
coffee	kawa	Piję kawę rano.
cold	zimny; zimno	Woda jest zimna.
college	uczelnia; szkoła wyższa	Moja siostra studiuje na uczelni.
colour	kolor	Mój ulubiony kolor to niebieski.
come	przychodzić; przyjść	Proszę tu przyjść.
common	powszechny	To imię jest powszechne.
company	firma	Moja mama pracuje w firmie.
compare	porównywać	Porównaj te dwa obrazki.
complete	kompletny; ukończyć	Formularz jest już kompletny.
computer	komputer	Ten komputer jest nowy.
concert	koncert	Idziemy dziś wieczorem na koncert.
conversation	rozmowa	Mieliśmy krótką rozmowę.
cook	gotować; kucharz	Gotuję kolację w domu.
cooking	gotowanie	Lubię gotować z tatą.
cool	chłodny; fajny	Pokój jest chłodny.
correct	poprawny; poprawiać	Twoja odpowiedź jest poprawna.
cost	koszt; kosztować	Ile to kosztuje?
could modal	móc	Mogę ci pomóc.
country	kraj	Kanada jest dużym krajem.
course	kurs	Jestem na kursie angielskiego.
cousin	kuzyn; kuzynka	Mój kuzyn mieszka blisko.
cow	krowa	Krowa je trawę.
cream	śmietanka; krem	Dodaję śmietankę do kawy.
create	tworzyć	Oni tworzą nową grę.
culture	kultura	Uczymy się lokalnej kultury.
cup	kubek	Ten kubek jest pusty.
customer	klient	Klient zadał pytanie.
cut	ciąć; kroić	Pokrój jabłko na pół.
dad	tata	Tata pracuje.
dance	tańczyć; taniec	Tańczymy po kolacji.
dancer	tancerz; tancerka	Tancerz porusza się szybko.
dancing	taniec	Taniec jest zabawny.
dangerous	niebezpieczny	Ta droga jest niebezpieczna.
dark	ciemny	Pokój jest ciemny.
date	data	Jaka jest dziś data?
daughter	córka	Jej córka ma sześć lat.
day	dzień	Miłego dnia.
dear	drogi	Drogi przyjacielu, dziękuję.
December	grudzień	Moje urodziny są w grudniu.
decide	zdecydować	Proszę zdecydować teraz.
delicious	pyszny	Ta zupa jest pyszna.
describe	opisywać	Opisz swój pokój.
description	opis	Przeczytaj krótki opis.
design	projekt; projektować	Robię prosty projekt karty.
desk	biurko	Książka jest na moim biurku.
detail	szczegół	Brakuje jednego szczegółu.
dialogue	dialog	Przeczytaj teraz ten dialog.
dictionary	słownik	Użyj słownika na lekcji.
die	umierać	Kwiaty umierają bez wody.
diet	dieta	Moja dieta zawiera owoce.
difference	różnica	Jest jedna różnica.
different	inny; różny	Mamy różne imiona.
difficult	trudny	To pytanie jest trudne.
dinner	kolacja	Kolacja jest gotowa.
dirty	brudny	Moje buty są brudne.
discuss	omawiać	Omawiamy plan.
dish	talerz; danie	Ten talerz jest gorący.
do1	robić	Co robisz?
doctor	lekarz; lekarka	Lekarz jest zajęty.
dog	pies	Pies biega na zewnątrz.
dollar	dolar	To kosztuje jednego dolara.
door	drzwi	Proszę zamknąć drzwi.
down	w dół; na dole	Usiądź tutaj.
downstairs	na dole	Kuchnia jest na dole.
draw	rysować	Narysuj mały dom.
dress	sukienka; ubierać się	Ona nosi czerwoną sukienkę.
drink	napój; pić	Piję wodę.
drive	prowadzić samochód	Jadę samochodem do pracy.
driver	kierowca	Kierowca zatrzymał się tutaj.
during	podczas	Spałem podczas lotu.
DVD	DVD	Ta płyta DVD jest stara.
each	każdy	Każde dziecko ma książkę.
ear	ucho	Boli mnie ucho.
early	wcześnie	Wstaję wcześnie.
east	wschód	Słońce wschodzi na wschodzie.
easy	łatwy	Ten test jest łatwy.
eat	jeść	Jemy razem lunch.
egg	jajko	Jem jedno jajko.
eight	osiem	Mam osiem kart.
eighteen	osiemnaście	Ona ma osiemnaście lat.
eighty	osiemdziesiąt	Mój dziadek ma osiemdziesiąt lat.
elephant	słoń	Słoń jest duży.
eleven	jedenaście	Lekcja zaczyna się o jedenastej.
else	inny; jeszcze	Czego jeszcze potrzebujesz?
email	e-mail	Wyślij do mnie e-mail.
end	koniec; kończyć	To jest koniec.
enjoy	cieszyć się; lubić	Lubię tę piosenkę.
enough	dość; wystarczająco	Mamy wystarczająco czasu.
euro	euro	To kosztuje jedno euro.
even	nawet	Nawet mój brat to wie.
evening	wieczór	Do zobaczenia dziś wieczorem.
event	wydarzenie	Wydarzenie zaczyna się dzisiaj.
ever	kiedykolwiek	Czy kiedykolwiek gotowałeś?
every	każdy	Uczę się każdego dnia.
everybody	wszyscy	Wszyscy są tutaj.
everyone	wszyscy	Wszyscy lubią muzykę.
everything	wszystko	Wszystko jest gotowe.
exam	egzamin	Egzamin zacznie się wkrótce.
example	przykład	To dobry przykład.
excited	podekscytowany	Jestem dziś podekscytowany.
exciting	ekscytujący	Ta gra jest ekscytująca.
exercise	ćwiczenie; ćwiczyć	Ćwiczę przed śniadaniem.
expensive	drogi	Ten płaszcz jest drogi.
explain	wyjaśniać	Proszę wyjaśnić to słowo.
extra	dodatkowy	Potrzebuję dodatkowego czasu.
eye	oko	Moje oko jest czerwone.
face	twarz	Umyj twarz.
fact	fakt	Ten fakt jest ważny.
fall	spadać; jesień	Liście spadają jesienią.
false	fałszywy; nieprawdziwy	Ta odpowiedź jest nieprawdziwa.
family	rodzina	Moja rodzina jest mała.
famous	sławny	Ona jest sławną piosenkarką.
fantastic	fantastyczny	Koncert był fantastyczny.
far	daleko	Szkoła jest daleko.
farm	farma	Oni mieszkają na farmie.
farmer	rolnik	Rolnik uprawia jedzenie.
fast	szybki	Ten pociąg jest szybki.
fat	gruby	Ten kot jest gruby.
father	ojciec; tata	Mój ojciec jest wysoki.
favourite	ulubiony	To moja ulubiona piosenka.
February	luty	Tutaj w lutym jest zimno.
feel	czuć	Czuję się szczęśliwy.
feeling	uczucie	Rozumiem to uczucie.
festival	festiwal	Festiwal zaczyna się jutro.
few	kilka; mało	Jest tu kilku uczniów.
fifteen	piętnaście	Mam piętnaście lat.
fifth	piąty	To piąta lekcja.
fifty	pięćdziesiąt	Moja mama ma pięćdziesiąt lat.
fill	wypełniać; napełniać	Napełnij kubek wodą.
film	film	Oglądamy film.
final	końcowy; ostatni	To ostatnie pytanie.
find	znaleźć	Znalazłem klucz.
fine	dobrze; w porządku	Teraz wszystko w porządku.
finish	kończyć	Skończ pracę domową.
fire	ogień	Ogień jest gorący.
first	pierwszy	Ona stoi pierwsza w kolejce.
fish	ryba	Jem rybę na kolację.
five	pięć	Mam pięć książek.
flat	mieszkanie	Moje mieszkanie jest małe.
flight	lot	Lot jest opóźniony.
floor	podłoga; piętro	Torba jest na podłodze.
flower	kwiat	Ten kwiat jest żółty.
fly	latać	Ptak lata po niebie.
follow	podążać	Idź za mną.
food	jedzenie	Jedzenie jest gotowe.
foot	stopa	Boli mnie stopa.
football	piłka nożna	Gramy dziś w piłkę nożną.
for	dla	Ten prezent jest dla ciebie.
forget	zapominać	Nie zapomnij klucza.
form	formularz	Wypełnij formularz.
forty	czterdzieści	Mój ojciec ma czterdzieści lat.
four	cztery	Widzę cztery ptaki.
fourteen	czternaście	Ona ma czternaście lat.
fourth	czwarty	To czwarte piętro.
free	darmowy; wolny	Bilet jest darmowy.
Friday	piątek	Do zobaczenia w piątek.
friend	przyjaciel; przyjaciółka	Mój przyjaciel jest tutaj.
friendly	przyjazny	Nauczyciel jest przyjazny.
from	z	Jestem stąd.
front	przód	To jest z przodu.
fruit	owoc	Jem owoce każdego dnia.
full	pełny; najedzony	Butelka jest pełna.
fun	zabawa; przyjemność	Ta gra jest fajna.
funny	zabawny	Ten film jest zabawny.
future	przyszłość	Pomyśl o swojej przyszłości.
game	gra	Gra zaczyna się teraz.
garden	ogród	Ogród jest piękny.
geography	geografia	Uczę się geografii w szkole.
get	dostawać; dotrzeć	Docieram do domu o szóstej.
girl	dziewczynka	Dziewczynka się uśmiecha.
girlfriend	dziewczyna	Jego dziewczyna jest miła.
give	dawać	Daj mi książkę.
glass	szklanka; szkło	Piję wodę ze szklanki.
go	iść; jechać	Teraz idziemy do domu.
good	dobry	Ta kawa jest dobra.
goodbye	do widzenia	Do widzenia, do jutra.
grandfather	dziadek	Mój dziadek jest stary.
grandmother	babcia	Moja babcia gotuje zupę.
grandparent	dziadek lub babcia	Mój dziadek mieszka z nami.
great	wspaniały; wielki	To wspaniały pomysł.
green	zielony	Drzwi są zielone.
grey	szary	Niebo jest szare.
group	grupa	Pracujcie w małej grupie.
grow	rosnąć; uprawiać	Roślina rośnie w ogrodzie.
guess	zgadnąć	Zgadnij odpowiedź.
guitar	gitara	On gra na gitarze.
gym	siłownia	Idę na siłownię.
hair	włosy	Ona ma długie włosy.
half	połowa	Przekrój ciasto na pół.
hand	ręka	Podnieś rękę.
happen	zdarzyć się	Co stanie się dalej?
happy	szczęśliwy	Jestem dziś szczęśliwy.
hard	twardy; trudny	To krzesło jest twarde.
hat	kapelusz; czapka	Moja czapka jest czarna.
hate	nienawidzić	Nienawidzę zimnej herbaty.
have	mieć	Mam samochód.
have to modal	musieć	Muszę się uczyć.
he	on	On jest moim bratem.
head	głowa	Boli mnie głowa.
health	zdrowie	Dobre jedzenie pomaga zdrowiu.
healthy	zdrowy	To danie jest zdrowe.
hear	słyszeć	Słyszę muzykę.
hello	cześć	Cześć, miło cię poznać.
help	pomagać; pomoc	Pomóż mi, proszę.
her	jej; ją	To jest jej torba.
here	tutaj	Przyjdź tutaj teraz.
hey	hej	Hej, poczekaj na mnie.
hi	cześć	Cześć, jak się masz?
high	wysoki	Ściana jest wysoka.
him	go; jemu	Znam go.
his	jego	Jego płaszcz jest niebieski.
history	historia	Uczę się historii.
hobby	hobby	Czytanie to moje hobby.
holiday	wakacje	Jedziemy na wakacje w lipcu.
home	dom	Jestem w domu.
homework	praca domowa	Zrób pracę domową dziś wieczorem.
hope	mieć nadzieję	Mam nadzieję, że przyjdziesz.
horse	koń	Koń biegnie szybko.
hospital	szpital	Szpital jest blisko.
hot	gorący	Zupa jest gorąca.
hotel	hotel	Hotel jest czysty.
hour	godzina	Poczekaj jedną godzinę.
house	dom	Ten dom jest stary.
how	jak	Jak się masz?
however	jednak	Jednak mogę tu zostać.
hundred	sto	Przyszło sto osób.
hungry	głodny	Jestem głodny.
husband	mąż	Jej mąż jest lekarzem.
I	ja	Lubię herbatę.
ice	lód	Lód jest zimny.
ice cream	lody	Chcę lody.
idea	pomysł	To dobry pomysł.
if	jeśli	Zadzwoń, jeśli potrzebujesz pomocy.
imagine	wyobrażać sobie	Wyobraź sobie mały dom.
important	ważny	Ta lekcja jest ważna.
improve	poprawiać	Chcę się poprawić.
in	w; w środku	Klucz jest w mojej torbie.
include	zawierać; dołączyć	Dołącz swoje imię.
information	informacja	Potrzebuję więcej informacji.
interest	zainteresowanie	Ona interesuje się sztuką.
interested	zainteresowany	Interesuję się muzyką.
interesting	interesujący	Ta książka jest interesująca.
internet	internet	Internet jest wolny.
interview	rozmowa kwalifikacyjna	Mam dziś rozmowę kwalifikacyjną.
into	do; włożyć do	Włóż książkę do torby.
introduce	przedstawiać	Przedstaw swojego przyjaciela.
island	wyspa	Ta wyspa jest mała.
it	to; ono	Jest zimno.
its	jego; jej	Pies lubi swoje łóżko.
jacket	kurtka	Moja kurtka jest nowa.
January	styczeń	Styczeń jest pierwszym miesiącem.
jeans	dżinsy	Moje dżinsy są niebieskie.
job	praca	Potrzebuję nowej pracy.
join	dołączyć	Dołącz dziś do naszej klasy.
journey	podróż	Podróż jest długa.
juice	sok	Piję sok pomarańczowy.
July	lipiec	Podróżujemy w lipcu.
June	czerwiec	Szkoła kończy się w czerwcu.
just	tylko; właśnie	Potrzebuję tylko wody.
keep	trzymać; zachować	Zachowaj ten klucz.
key	klucz	Zgubiłem klucz.
kilometre	kilometr	Przejdź jeden kilometr.
kind (type)	rodzaj	Jaki rodzaj muzyki lubisz?
kitchen	kuchnia	Kuchnia jest czysta.
know	wiedzieć	Znam odpowiedź.
land	ziemia; ląd	Samolot jest na ziemi.
language	język	Angielski jest językiem.
large	duży	Ten pokój jest duży.
last1 (final)	ostatni	To ostatnia strona.
late	spóźniony	Autobus jest spóźniony.
later	później	Do zobaczenia później.
laugh	śmiać się	Śmiejemy się razem.
learn	uczyć się	Uczę się angielskiego.
leave	wychodzić; zostawiać	Teraz wychodzę z domu.
left	lewy; w lewo	Skręć tutaj w lewo.
leg	noga	Boli mnie noga.
lesson	lekcja	Lekcja zaczyna się teraz.
let	pozwalać	Pozwól mi ci pomóc.
letter	list; litera	Piszę list.
library	biblioteka	Biblioteka otwiera się o dziewiątej.
lie1	leżeć	Leż na łóżku.
life	życie	Życie w mieście jest ruchliwe.
like (similar)	jak; podobny	To jest jak gra.
like (find sb/sth pleasant)	lubić	Lubię tę piosenkę.
line	kolejka; linia	Stań w kolejce.
lion	lew	Lew śpi.
list	lista	Zrób listę zakupów.
listen	słuchać	Słuchaj nauczyciela.
little	mały; trochę	Mam trochę pieniędzy.
live1	mieszkać	Mieszkam blisko szkoły.
local	lokalny	To jest lokalny sklep.
long1	długi	Droga jest długa.
look	patrzeć; wyglądać	Popatrz na obrazek.
lose	tracić; zgubić	Nie zgub biletu.
lot	dużo	Mam dużo pracy domowej.
love	miłość; kochać	Kocham swoją rodzinę.
lunch	lunch; obiad	Lunch jest gotowy.`;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_002_300_v1_contract_v0.json",
    examples: "",
    outDir: "outputs/oxford-vocabulary/support-translations",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--")) continue;
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    index += 1;
    if (key === "--contract") args.contract = value;
    else if (key === "--examples") args.examples = value;
    else if (key === "--out-dir") args.outDir = value;
    else throw new Error(`Unknown argument: ${key}`);
  }
  return args;
}

function normalizeText(value) {
  return String(value ?? "").replace(/\u00a0/gu, " ").replace(/\s+/gu, " ").trim();
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSONL at ${filePath}:${index + 1}: ${error.message}`);
      }
    });
}

async function writeJsonl(filePath, rows) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function parseTranslations() {
  const lines = PL_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tPL\texample_PL") {
    throw new Error("Unexpected PL translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad PL translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad PL translation row ${index + 2}: empty field`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad PL example punctuation for ${sourceHeadword}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad PL Latin native orthography shape for ${sourceHeadword}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad PL non-Latin script leak for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate PL translation key: ${sourceHeadword}`);
    }
    map.set(sourceHeadword, { display, example });
  }
  return map;
}

function validateTranslationMap(rows, translations) {
  if (rows.length !== 300) {
    throw new Error(`Expected exactly 300 English example rows, got ${rows.length}`);
  }
  const sourceKeys = rows.map((row) => row.source_headword);
  const rowKeySet = new Set(sourceKeys);
  const missing = sourceKeys.filter((key) => !translations.has(key));
  const extra = [...translations.keys()].filter((key) => !rowKeySet.has(key));
  if (missing.length) {
    throw new Error(`Missing PL translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`PL translation map has unused rows: ${extra.join(", ")}`);
  }
}

function buildSupportRow(exampleRow, translation, generatedAt) {
  return {
    release_id: exampleRow.release_id,
    course_id: exampleRow.course_id,
    row_id: exampleRow.row_id,
    core_item_id: exampleRow.core_item_id,
    meaning_id: exampleRow.meaning_id,
    source_candidate_id: exampleRow.source_candidate_id,
    source_headword: exampleRow.source_headword,
    reviewed_display_headword: exampleRow.reviewed_display_headword,
    reviewed_part_of_speech: exampleRow.reviewed_part_of_speech,
    meaning_note: exampleRow.meaning_note,
    example_EN: exampleRow.example_EN,
    support_translation_batch: BATCH_ID,
    support_translation_status: "draft_native_style_needs_source_assisted_qa",
    support_example_status: "draft_scene_preserving_needs_source_assisted_qa",
    source_note:
      "Internal LunaCards Oxford support-language draft; support aid for English learning, not ordinary polyglot final delivery.",
    reviewer: "codex_oxford_part002_support_translation_batch_pl_v1",
    reviewed_at: generatedAt,
    generation_ready: false,
    remaining_blockers: (exampleRow.remaining_blockers ?? []).filter(
      (blocker) =>
        ![
          "english_pronunciation_source_check",
          "english_example_quality_check",
          "support_translation_meaning_check",
          "support_example_scene_check",
        ].includes(blocker)
    ),
    PL: translation.display,
    example_PL: translation.example,
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
    "- Script-aware validation: PL Latin native orthography, sentence punctuation and non-Latin script leak guard",
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
