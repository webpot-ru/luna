#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_VERSION = "2026-05-17.v1"
LANGUAGES = ["PL", "NL", "SV"]
SENTENCE_END_RE = re.compile(r"[.!?。！？]$")


TRANSLATIONS_TSV = """source_headword	PL	example_PL	NL	example_NL	SV	example_SV
a, an	rodzajnik nieokreślony	Mam długopis.	een	Ik heb een pen.	en; ett	Jag har en penna.
about	o; około	Rozmawiamy o jedzeniu.	over; ongeveer	We praten over eten.	om; ungefär	Vi pratar om mat.
above	nad; powyżej	Zegar jest nad drzwiami.	boven	De klok hangt boven de deur.	ovanför	Klockan är ovanför dörren.
across	po drugiej stronie	Sklep jest po drugiej stronie ulicy.	aan de overkant van	De winkel is aan de overkant van de straat.	på andra sidan	Affären ligger på andra sidan gatan.
action	działanie	Jego działanie mi pomaga.	actie; handeling	Zijn actie helpt mij.	handling	Hans handling hjälper mig.
activity	aktywność; zajęcie	Pływanie to fajne zajęcie.	activiteit	Zwemmen is een leuke activiteit.	aktivitet	Simning är en rolig aktivitet.
actor	aktor	Aktor gra w filmie.	acteur	De acteur speelt in een film.	skådespelare	Skådespelaren är med i en film.
actress	aktorka	Aktorka się do nas uśmiecha.	actrice	De actrice glimlacht naar ons.	skådespelerska	Skådespelerskan ler mot oss.
add	dodać	Dodaj tutaj swoje imię.	toevoegen	Voeg hier je naam toe.	lägga till	Lägg till ditt namn här.
address	adres	Mój adres jest na tej karcie.	adres	Mijn adres staat op deze kaart.	 adress	Min adress står på det här kortet.
adult	dorosły	Dorosły siedzi przy drzwiach.	volwassene	Een volwassene zit bij de deur.	vuxen	En vuxen sitter vid dörren.
advice	rada	Jej rada jest prosta.	advies	Haar advies is eenvoudig.	råd	Hennes råd är enkelt.
afraid	bać się	Dziecko się boi.	bang; bang zijn	Het kind is bang.	rädd	Barnet är rädd.
after	po	Jem po lekcji.	na	Ik eet na de les.	efter	Jag äter efter lektionen.
afternoon	popołudnie	Uczę się po południu.	middag	Ik studeer in de middag.	eftermiddag	Jag studerar på eftermiddagen.
again	znowu; ponownie	Proszę, powiedz to znowu.	opnieuw; weer	Zeg het alsjeblieft opnieuw.	igen	Säg det igen, tack.
age	wiek	Ile masz lat?	leeftijd	Wat is je leeftijd?	ålder	Hur gammal är du?
ago	temu	Przyszedłem tutaj dwa dni temu.	geleden	Ik kwam hier twee dagen geleden.	sedan	Jag kom hit för två dagar sedan.
agree	zgadzać się	Zgadzam się z tobą.	het eens zijn	Ik ben het met je eens.	hålla med	Jag håller med dig.
air	powietrze	Powietrze jest zimne.	lucht	De lucht is koud.	luft	Luften är kall.
airport	lotnisko	Jesteśmy na lotnisku.	luchthaven	We zijn op de luchthaven.	flygplats	Vi är på flygplatsen.
all	wszyscy; wszystko	Wszyscy uczniowie są tutaj.	alle	Alle studenten zijn hier.	alla	Alla elever är här.
also	też; także	Lubię też herbatę.	ook	Ik houd ook van thee.	också	Jag gillar också te.
always	zawsze	Ona zawsze pije wodę.	altijd	Zij drinkt altijd water.	alltid	Hon dricker alltid vatten.
amazing	niesamowity	Widok jest niesamowity.	geweldig	Het uitzicht is geweldig.	fantastisk	Utsikten är fantastisk.
and	i	Tom i Anna są przyjaciółmi.	en	Tom en Anna zijn vrienden.	och	Tom och Anna är vänner.
angry	zły; rozgniewany	On jest teraz zły.	boos	Hij is nu boos.	arg	Han är arg nu.
animal	zwierzę	Pies to zwierzę.	dier	Een hond is een dier.	djur	En hund är ett djur.
another	inny; jeszcze jeden	Chcę jeszcze jedną filiżankę.	een andere; nog een	Ik wil nog een kopje.	en annan	Jag vill ha en kopp till.
answer	odpowiedź	Napisz tutaj odpowiedź.	antwoord	Schrijf hier het antwoord.	svar	Skriv svaret här.
any	jakiś; jakikolwiek	Masz jakieś pieniądze?	enige; wat	Heb je wat geld?	någon; något	Har du några pengar?
anyone	ktoś	Czy ktoś potrzebuje pomocy?	iemand	Heeft iemand hulp nodig?	någon	Behöver någon hjälp?
anything	coś; cokolwiek	Nie widzę niczego.	iets; niets	Ik kan niets zien.	något; någonting	Jag kan inte se något.
apartment	mieszkanie	Moje mieszkanie jest małe.	appartement	Mijn appartement is klein.	lägenhet	Min lägenhet är liten.
apple	jabłko	To jabłko jest czerwone.	appel	Deze appel is rood.	äpple	Det här äpplet är rött.
April	kwiecień	Moje urodziny są w kwietniu.	april	Mijn verjaardag is in april.	april	Min födelsedag är i april.
area	obszar; okolica	Ta okolica jest cicha.	gebied	Deze buurt is rustig.	område	Det här området är lugnt.
arm	ręka; ramię	Boli mnie ręka.	arm	Mijn arm doet pijn.	arm	Min arm gör ont.
around	wokół; po	Spacerujemy po parku.	rond; door	We lopen door het park.	runt; genom	Vi går runt i parken.
arrive	przyjechać; przybyć	Oni przyjeżdżają o szóstej.	aankomen	Zij komen om zes uur aan.	anlända; komma	De kommer klockan sex.
art	sztuka	Lubię sztukę.	kunst	Ik houd van kunst.	konst	Jag gillar konst.
article	artykuł	Czytam artykuł online.	artikel	Ik lees online een artikel.	artikel	Jag läser en artikel på nätet.
artist	artysta	Artysta rysuje twarz.	kunstenaar	De kunstenaar tekent een gezicht.	konstnär	Konstnären ritar ett ansikte.
as	jako	Pracuję jako nauczyciel.	als	Ik werk als leraar.	som	Jag arbetar som lärare.
ask	pytać	Zapytaj teraz nauczyciela.	vragen	Vraag het nu aan de leraar.	fråga	Fråga läraren nu.
at	w; przy	Jestem w domu.	op; bij	Ik ben thuis.	på; vid	Jag är hemma.
August	sierpień	Podróżujemy w sierpniu.	augustus	We reizen in augustus.	augusti	Vi reser i augusti.
aunt	ciocia	Moja ciocia mieszka tutaj.	tante	Mijn tante woont hier.	moster; faster	Min faster bor här.
autumn	jesień	Liście opadają jesienią.	herfst	Bladeren vallen in de herfst.	höst	Löven faller på hösten.
away	precz; daleko	Autobus odjeżdża.	weg	De bus rijdt weg.	bort	Bussen åker iväg.
baby	niemowlę	Dziecko śpi.	baby	De baby slaapt.	bebis	Bebisen sover.
back	plecy	Bolą mnie plecy.	rug	Mijn rug doet pijn.	rygg	Min rygg gör ont.
bad	zły; niedobry	To mleko jest zepsute.	slecht	Deze melk is slecht.	dålig	Den här mjölken är dålig.
bag	torba	Twoja torba jest na krześle.	tas	Je tas ligt op de stoel.	väska	Din väska ligger på stolen.
ball	piłka	Piłka jest pod stołem.	bal	De bal ligt onder de tafel.	boll	Bollen ligger under bordet.
banana	banan	Jem banana.	banaan	Ik eet een banaan.	banan	Jag äter en banan.
band	zespół	Zespół gra muzykę.	band	De band speelt muziek.	band	Bandet spelar musik.
bank (money)	bank	Bank otwiera się o dziewiątej.	bank	De bank gaat om negen uur open.	bank	Banken öppnar klockan nio.
bath	kąpiel	Biorę kąpiel wieczorem.	bad	Ik neem 's avonds een bad.	bad	Jag tar ett bad på kvällen.
bathroom	łazienka	Łazienka jest czysta.	badkamer	De badkamer is schoon.	badrum	Badrummet är rent.
be	być	Jestem szczęśliwy.	zijn	Ik ben blij.	vara	Jag är glad.
beach	plaża	Siedzimy na plaży.	strand	We zitten op het strand.	strand	Vi sitter på stranden.
beautiful	piękny	Kwiat jest piękny.	mooi	De bloem is mooi.	vacker	Blomman är vacker.
because	ponieważ	Zostaję w domu, ponieważ jestem chory.	omdat	Ik blijf thuis omdat ik ziek ben.	eftersom; för att	Jag stannar hemma eftersom jag är sjuk.
become	zostać; stać się	Może zrobić się zimno.	worden	Het kan koud worden.	bli	Det kan bli kallt.
bed	łóżko	Łóżko jest duże.	bed	Het bed is groot.	säng	Sängen är stor.
bedroom	sypialnia	Moja sypialnia jest cicha.	slaapkamer	Mijn slaapkamer is rustig.	sovrum	Mitt sovrum är tyst.
beer	piwo	On pije piwo do kolacji.	bier	Hij drinkt bier bij het avondeten.	öl	Han dricker öl till middagen.
before	przed	Umyj ręce przed obiadem.	voor	Was je handen voor de lunch.	före	Tvätta händerna före lunchen.
begin	zaczynać	Zacznij teraz test.	beginnen	Begin nu met de toets.	börja	Börja provet nu.
beginning	początek	Początek jest łatwy.	begin	Het begin is makkelijk.	början	Början är lätt.
behind	za	Kot jest za sofą.	achter	De kat zit achter de bank.	bakom	Katten är bakom soffan.
believe	wierzyć	Wierzę ci.	geloven	Ik geloof je.	tro	Jag tror dig.
below	poniżej; pod	Imię jest pod obrazkiem.	onder	De naam staat onder de afbeelding.	nedanför	Namnet står nedanför bilden.
best	najlepszy	Ona jest moją najlepszą przyjaciółką.	beste	Zij is mijn beste vriendin.	bäst	Hon är min bästa vän.
better	lepszy; lepiej	Czuję się dziś lepiej.	beter	Ik voel me vandaag beter.	bättre	Jag mår bättre i dag.
between	między	Kawiarnia jest między dwoma sklepami.	tussen	Het café ligt tussen twee winkels.	mellan	Kaféet ligger mellan två affärer.
bicycle	rower	Mój rower jest niebieski.	fiets	Mijn fiets is blauw.	cykel	Min cykel är blå.
big	duży	To pudełko jest duże.	groot	Deze doos is groot.	stor	Den här lådan är stor.
bike	rower	Jadę na rowerze.	fiets	Ik fiets.	cykel	Jag cyklar.
bill	rachunek	Rachunek leży na stole.	rekening	De rekening ligt op tafel.	nota	Notan ligger på bordet.
bird	ptak	Ptak jest na drzewie.	vogel	Een vogel zit in de boom.	fågel	En fågel sitter i trädet.
birthday	urodziny	Dziś są moje urodziny.	verjaardag	Vandaag is mijn verjaardag.	födelsedag	I dag är min födelsedag.
black	czarny	Moja torba jest czarna.	zwart	Mijn tas is zwart.	svart	Min väska är svart.
blog	blog	Ona pisze blog.	blog	Zij schrijft een blog.	blogg	Hon skriver en blogg.
blonde	blond	On ma blond włosy.	blond	Hij heeft blond haar.	blond	Han har blont hår.
blue	niebieski	Niebo jest niebieskie.	blauw	De lucht is blauw.	blå	Himlen är blå.
boat	łódź	Łódź jest na wodzie.	boot	De boot ligt op het water.	båt	Båten är på vattnet.
body	ciało	Moje ciało jest zmęczone.	lichaam	Mijn lichaam is moe.	kropp	Min kropp är trött.
book	książka	Czytam książkę.	boek	Ik lees een boek.	bok	Jag läser en bok.
boot	but	Jeden but jest pod łóżkiem.	laars	Een laars ligt onder het bed.	stövel	En stövel ligger under sängen.
bored	znudzony	Jestem znudzony.	verveeld	Ik ben verveeld.	uttråkad	Jag är uttråkad.
boring	nudny	Ten film jest nudny.	saai	Deze film is saai.	tråkig	Den här filmen är tråkig.
born	urodzony	Urodziłem się w maju.	geboren	Ik ben in mei geboren.	född	Jag föddes i maj.
both	oboje; oba	Obie dziewczynki są szczęśliwe.	beide	Beide meisjes zijn blij.	båda	Båda flickorna är glada.
bottle	butelka	Butelka jest pełna.	fles	De fles is vol.	flaska	Flaskan är full.
box	pudełko	Pudełko jest otwarte.	doos	De doos is open.	låda	Lådan är öppen.
boy	chłopiec	Chłopiec szybko biegnie.	jongen	De jongen rent snel.	pojke	Pojken springer snabbt.
boyfriend	chłopak	Jej chłopak jest miły.	vriendje	Haar vriendje is aardig.	pojkvän	Hennes pojkvän är snäll.
bread	chleb	Chcę chleb.	brood	Ik wil brood.	bröd	Jag vill ha bröd.
break	złamać; rozbić	Nie rozbij kubka.	breken	Breek de beker niet.	ha sönder	Ha inte sönder koppen.
breakfast	śniadanie	Śniadanie jest gotowe.	ontbijt	Het ontbijt is klaar.	frukost	Frukosten är klar.
bring	przynieść	Przynieś swoją książkę.	meebrengen	Breng je boek mee.	ta med	Ta med din bok.
brother	brat	Mój brat jest wysoki.	broer	Mijn broer is lang.	bror	Min bror är lång.
brown	brązowy	Pies jest brązowy.	bruin	De hond is bruin.	brun	Hunden är brun.
build	budować	Oni budują dom.	bouwen	Zij bouwen een huis.	bygga	De bygger ett hus.
building	budynek	Ten budynek jest stary.	gebouw	Dit gebouw is oud.	byggnad	Den här byggnaden är gammal.
bus	autobus	Autobus jest spóźniony.	bus	De bus is laat.	buss	Bussen är sen.
business	firma; biznes	Mój ojciec ma firmę.	bedrijf	Mijn vader heeft een bedrijf.	företag	Min far har ett företag.
busy	zajęty	Jestem dziś zajęty.	druk	Ik heb het vandaag druk.	upptagen	Jag är upptagen i dag.
but	ale	Lubię herbatę, ale nie kawę.	maar	Ik houd van thee, maar niet van koffie.	men	Jag gillar te, men inte kaffe.
butter	masło	Posmaruj chleb masłem.	boter	Doe boter op het brood.	smör	Lägg smör på brödet.
buy	kupić	Kupuję mleko.	kopen	Ik koop melk.	köpa	Jag köper mjölk.
by	przy; obok	Usiądź przy oknie.	bij; naast	Ga bij het raam zitten.	vid	Sitt vid fönstret.
bye	cześć; do widzenia	Cześć, do zobaczenia jutro.	doei	Doei, tot morgen.	hej då	Hej då, vi ses i morgon.
cafe	kawiarnia	Spotykamy się w kawiarni.	café	We ontmoeten elkaar in het café.	kafé	Vi träffas på kaféet.
cake	ciasto	Ciasto jest słodkie.	cake; taart	De taart is zoet.	kaka	Kakan är söt.
call	zadzwonić	Proszę, zadzwoń do mnie.	bellen	Bel me alsjeblieft.	ringa	Ring mig, tack.
camera	aparat	Mój aparat jest nowy.	camera	Mijn camera is nieuw.	kamera	Min kamera är ny.
can1 modal	móc; umieć	Umiem pływać.	kunnen	Ik kan zwemmen.	kunna	Jag kan simma.
cannot	nie móc	Nie mogę dziś przyjść.	niet kunnen	Ik kan vandaag niet komen.	inte kunna	Jag kan inte komma i dag.
capital	stolica	Paryż jest stolicą.	hoofdstad	Parijs is een hoofdstad.	huvudstad	Paris är en huvudstad.
car	samochód	Samochód jest czerwony.	auto	De auto is rood.	bil	Bilen är röd.
card	kartka; karta	Mam kartkę urodzinową.	kaart	Ik heb een verjaardagskaart.	kort	Jag har ett födelsedagskort.
career	kariera	Chcę karierę w sztuce.	carrière	Ik wil een carrière in de kunst.	karriär	Jag vill ha en karriär inom konst.
carrot	marchew	Marchew jest pomarańczowa.	wortel	De wortel is oranje.	morot	Moroten är orange.
carry	nieść	Niosę swoją torbę.	dragen	Ik draag mijn tas.	bära	Jag bär min väska.
cat	kot	Kot śpi.	kat	De kat slaapt.	katt	Katten sover.
CD	płyta CD	Ta płyta CD ma muzykę.	cd	Deze cd heeft muziek.	cd	Den här cd:n har musik.
cent	cent	Jeden cent jest bardzo mały.	cent	Een cent is heel klein.	cent	En cent är mycket liten.
centre	centrum	Centrum miasta jest ruchliwe.	centrum	Het centrum van de stad is druk.	centrum	Stadens centrum är livligt.
century	wiek	Stulecie ma sto lat.	eeuw	Een eeuw is honderd jaar.	århundrade	Ett århundrade är hundra år.
chair	krzesło	Usiądź na krześle.	stoel	Ga op de stoel zitten.	stol	Sitt på stolen.
change	zmienić	Zmieniam ubranie.	veranderen; wisselen	Ik trek andere kleren aan.	byta; ändra	Jag byter kläder.
chart	wykres	Spójrz na wykres.	grafiek	Kijk naar de grafiek.	diagram	Titta på diagrammet.
cheap	tani	Ta koszula jest tania.	goedkoop	Dit shirt is goedkoop.	billig	Den här skjortan är billig.
check	sprawdzić	Sprawdź swoją odpowiedź.	controleren	Controleer je antwoord.	kontrollera	Kontrollera ditt svar.
cheese	ser	Lubię ser.	kaas	Ik houd van kaas.	ost	Jag gillar ost.
chicken	kurczak	Jemy kurczaka na kolację.	kip	We eten kip als avondeten.	kyckling	Vi äter kyckling till middag.
child	dziecko	Dziecko jest szczęśliwe.	kind	Het kind is blij.	barn	Barnet är glatt.
chocolate	czekolada	Czekolada jest słodka.	chocolade	Chocolade is zoet.	choklad	Choklad är söt.
choose	wybrać	Wybierz jedną odpowiedź.	kiezen	Kies één antwoord.	välja	Välj ett svar.
cinema	kino	Idziemy do kina.	bioscoop	We gaan naar de bioscoop.	bio	Vi går på bio.
city	miasto	Miasto jest duże.	stad	De stad is groot.	stad	Staden är stor.
class	lekcja; klasa	Lekcja zaczyna się o dziewiątej.	les	De les begint om negen uur.	lektion	Lektionen börjar klockan nio.
classroom	sala lekcyjna	Sala lekcyjna jest cicha.	klaslokaal	Het klaslokaal is rustig.	klassrum	Klassrummet är tyst.
clean	czysty	Pokój jest czysty.	schoon	De kamer is schoon.	ren	Rummet är rent.
climb	wspinać się	Oni wspinają się na wzgórze.	klimmen	Zij klimmen de heuvel op.	klättra	De klättrar uppför kullen.
clock	zegar	Zegar jest na ścianie.	klok	De klok hangt aan de muur.	klocka	Klockan sitter på väggen.
close1	zamknąć	Zamknij drzwi, proszę.	sluiten	Doe de deur dicht, alsjeblieft.	stänga	Stäng dörren, tack.
"""


def normalize_text(value):
    return re.sub(r"\s+", " ", str(value or "").replace("\u00a0", " ")).strip()


def parse_translations():
    rows = [line.split("\t") for line in TRANSLATIONS_TSV.strip().splitlines()]
    header = rows[0]
    expected = ["source_headword"]
    for language in LANGUAGES:
        expected.extend([language, f"example_{language}"])
    if header != expected:
        raise ValueError(f"Unexpected translation header: {header}")
    translations = {}
    for row_number, row in enumerate(rows[1:], start=2):
        if len(row) != len(header):
            raise ValueError(f"Malformed translation row {row_number}: expected {len(header)} cells, got {len(row)}")
        source_headword = normalize_text(row[0])
        if source_headword in translations:
            raise ValueError(f"Duplicate translation row for {source_headword}")
        localized = {}
        for index, language in enumerate(LANGUAGES):
            display = normalize_text(row[1 + index * 2])
            example = normalize_text(row[2 + index * 2])
            localized[language] = [display, example]
        translations[source_headword] = localized
    return translations


TRANSLATIONS = parse_translations()


def read_jsonl(path):
    rows = []
    for index, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as error:
            raise ValueError(f"Invalid JSONL at {path}:{index}: {error}") from error
    return rows


def write_jsonl(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def validate_translation_map(source_rows):
    source_keys = {row["source_headword"] for row in source_rows}
    missing = sorted(source_keys - set(TRANSLATIONS))
    extra = sorted(set(TRANSLATIONS) - source_keys)
    if missing:
        raise ValueError(f"Missing translations for rows: {missing}")
    if extra:
        raise ValueError(f"Translation map has unused rows: {extra}")
    problems = []
    for source_headword, localized in TRANSLATIONS.items():
        for language in LANGUAGES:
            display, example = localized.get(language, ["", ""])
            if not normalize_text(display):
                problems.append(f"{source_headword}/{language}: missing display")
            if not normalize_text(example):
                problems.append(f"{source_headword}/{language}: missing example")
            if not SENTENCE_END_RE.search(example):
                problems.append(f"{source_headword}/{language}: example missing sentence punctuation")
            if not re.search(r"[A-Za-zÀ-ž]", display):
                problems.append(f"{source_headword}/{language}: display has no Latin text")
            if not re.search(r"[A-Za-zÀ-ž]", example):
                problems.append(f"{source_headword}/{language}: example has no Latin text")
    if problems:
        raise ValueError("Translation quality problems:\n" + "\n".join(problems))


def build_row(row, generated_at, batch_id):
    localized = TRANSLATIONS[row["source_headword"]]
    blockers = [
        blocker
        for blocker in row.get("remaining_blockers", [])
        if blocker not in {"support_translation_meaning_check", "support_example_scene_check"}
    ]
    out = {
        "release_id": row["release_id"],
        "course_id": row["course_id"],
        "row_id": row["row_id"],
        "core_item_id": row["core_item_id"],
        "meaning_id": row["meaning_id"],
        "source_candidate_id": row["source_candidate_id"],
        "source_headword": row["source_headword"],
        "reviewed_display_headword": row["reviewed_display_headword"],
        "reviewed_part_of_speech": row["reviewed_part_of_speech"],
        "meaning_note": row["meaning_note"],
        "example_EN": row["example_EN"],
        "support_translation_batch": batch_id,
        "support_translation_status": "draft_native_style_needs_source_assisted_qa",
        "support_example_status": "draft_scene_preserving_needs_source_assisted_qa",
        "source_note": "Internal LunaCards Oxford support-language draft; support aid for English learning, not ordinary polyglot final delivery.",
        "reviewer": f"codex_oxford_a1_support_translation_batch_{batch_id}",
        "reviewed_at": generated_at,
        "generation_ready": False,
        "remaining_blockers": blockers,
    }
    for language in LANGUAGES:
        display, example = localized[language]
        out[language] = normalize_text(display)
        out[f"example_{language}"] = normalize_text(example)
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--pronunciations",
        default="outputs/oxford-vocabulary/pronunciations/oxford_3000_core_a1_part_001_150_v1_en_us_pronunciations_v1.jsonl",
    )
    parser.add_argument("--out-dir", default="outputs/oxford-vocabulary/support-translations")
    parser.add_argument("--batch-id", default="pl_nl_sv_v1")
    args = parser.parse_args()

    source_path = Path(args.pronunciations)
    source_rows = read_jsonl(source_path)
    if not source_rows:
        raise ValueError("Source pronunciation artifact is empty")
    validate_translation_map(source_rows)

    generated_at = datetime.now(timezone.utc).isoformat()
    rows = [build_row(row, generated_at, args.batch_id) for row in source_rows]
    release_id = source_rows[0]["release_id"]
    output_dir = Path(args.out_dir)
    batch_path = output_dir / f"{release_id}_support_translation_batch_{args.batch_id}.jsonl"
    summary_path = output_dir / f"{release_id}_support_translation_batch_{args.batch_id}_summary.md"
    write_jsonl(batch_path, rows)

    summary = [
        f"# Oxford A1 Support Translation Batch {args.batch_id}: {release_id}",
        "",
        f"- Script version: `{SCRIPT_VERSION}`",
        f"- Source rows: `{source_path}`",
        f"- Rows: {len(rows)}",
        f"- Languages: {', '.join(LANGUAGES)}",
        "- Translation status: `draft_native_style_needs_source_assisted_qa`",
        "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
        "- Target-language transcriptions: not included",
        "- Postgres import: false",
        "- Google Sheet delivery: false",
        "",
        "This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.",
        "",
    ]
    summary_path.write_text("\n".join(summary), encoding="utf-8")
    print(f"Oxford support translation batch built: rows={len(rows)} languages={','.join(LANGUAGES)} path={batch_path}")


if __name__ == "__main__":
    main()
