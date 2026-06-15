#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_VERSION = "2026-05-17.v1"
LANGUAGES = ["DE", "IT", "PT"]
SENTENCE_END_RE = re.compile(r"[.!?。！？]$")


TRANSLATIONS_TSV = """source_headword	DE	example_DE	IT	example_IT	PT	example_PT
a, an	ein; eine	Ich habe einen Stift.	un; una	Ho una penna.	um; uma	Tenho uma caneta.
about	über; ungefähr	Wir sprechen über Essen.	su; circa	Parliamo di cibo.	sobre; aproximadamente	Falamos sobre comida.
above	über; oberhalb	Die Uhr hängt über der Tür.	sopra; al di sopra	L'orologio è sopra la porta.	acima de; por cima de	O relógio está acima da porta.
across	auf der anderen Seite von	Das Geschäft ist auf der anderen Straßenseite.	dall'altra parte di	Il negozio è dall'altra parte della strada.	do outro lado de	A loja fica do outro lado da rua.
action	Handlung; Aktion	Seine Handlung hilft mir.	azione	La sua azione mi aiuta.	ação	A sua ação ajuda-me.
activity	Aktivität; Tätigkeit	Schwimmen ist eine schöne Aktivität.	attività	Nuotare è un'attività divertente.	atividade	Nadar é uma atividade divertida.
actor	Schauspieler	Der Schauspieler ist in einem Film.	attore	L'attore è in un film.	ator	O ator está num filme.
actress	Schauspielerin	Die Schauspielerin lächelt uns an.	attrice	L'attrice ci sorride.	atriz	A atriz sorri para nós.
add	hinzufügen	Füge hier deinen Namen hinzu.	aggiungere	Aggiungi qui il tuo nome.	adicionar	Adiciona o teu nome aqui.
address	Adresse	Meine Adresse steht auf dieser Karte.	indirizzo	Il mio indirizzo è su questa carta.	morada; endereço	A minha morada está neste cartão.
adult	Erwachsener; Erwachsene	Ein Erwachsener sitzt neben der Tür.	adulto; adulta	Un adulto siede vicino alla porta.	adulto; adulta	Um adulto senta-se perto da porta.
advice	Rat	Ihr Rat ist einfach.	consiglio	Il suo consiglio è semplice.	conselho	O conselho dela é simples.
afraid	Angst haben	Das Kind hat Angst.	avere paura	Il bambino ha paura.	ter medo	A criança tem medo.
after	nach	Ich esse nach dem Unterricht.	dopo	Mangio dopo la lezione.	depois de	Como depois da aula.
afternoon	Nachmittag	Ich lerne am Nachmittag.	pomeriggio	Studio nel pomeriggio.	tarde	Estudo à tarde.
again	wieder; noch einmal	Sag es bitte noch einmal.	di nuovo; ancora	Per favore, dillo di nuovo.	outra vez	Por favor, diz isso outra vez.
age	Alter	Wie alt bist du?	età	Qual è la tua età?	idade	Qual é a tua idade?
ago	vor	Ich kam vor zwei Tagen hierher.	fa	Sono venuto qui due giorni fa.	há	Vim aqui há dois dias.
agree	zustimmen	Ich stimme dir zu.	essere d'accordo	Sono d'accordo con te.	concordar	Concordo contigo.
air	Luft	Die Luft ist kalt.	aria	L'aria è fredda.	ar	O ar está frio.
airport	Flughafen	Wir sind am Flughafen.	aeroporto	Siamo all'aeroporto.	aeroporto	Estamos no aeroporto.
all	alle	Alle Schüler sind hier.	tutti; tutte	Tutti gli studenti sono qui.	todos; todas	Todos os alunos estão aqui.
also	auch	Ich mag auch Tee.	anche	Mi piace anche il tè.	também	Também gosto de chá.
always	immer	Sie trinkt immer Wasser.	sempre	Lei beve sempre acqua.	sempre	Ela bebe sempre água.
amazing	erstaunlich; großartig	Die Aussicht ist großartig.	incredibile; meraviglioso	La vista è meravigliosa.	incrível	A vista é incrível.
and	und	Tom und Anna sind Freunde.	e	Tom e Anna sono amici.	e	O Tom e a Ana são amigos.
angry	wütend; ärgerlich	Er ist jetzt wütend.	arrabbiato	Adesso è arrabbiato.	zangado	Ele está zangado agora.
animal	Tier	Ein Hund ist ein Tier.	animale	Un cane è un animale.	animal	Um cão é um animal.
another	ein anderer; noch ein	Ich möchte noch eine Tasse.	un altro; un'altra	Voglio un'altra tazza.	outro; outra	Quero outra chávena.
answer	Antwort	Schreib die Antwort hier.	risposta	Scrivi qui la risposta.	resposta	Escreve a resposta aqui.
any	irgendein; etwas	Hast du etwas Geld?	qualche; alcuno	Hai dei soldi?	algum; qualquer	Tens algum dinheiro?
anyone	jemand	Braucht jemand Hilfe?	qualcuno	Qualcuno ha bisogno di aiuto?	alguém	Alguém precisa de ajuda?
anything	irgendetwas	Ich kann nichts sehen.	qualcosa; niente	Non riesco a vedere niente.	alguma coisa; nada	Não consigo ver nada.
apartment	Wohnung	Meine Wohnung ist klein.	appartamento	Il mio appartamento è piccolo.	apartamento	O meu apartamento é pequeno.
apple	Apfel	Dieser Apfel ist rot.	mela	Questa mela è rossa.	maçã	Esta maçã é vermelha.
April	April	Mein Geburtstag ist im April.	aprile	Il mio compleanno è ad aprile.	abril	O meu aniversário é em abril.
area	Gebiet; Bereich	Diese Gegend ist ruhig.	zona; area	Questa zona è tranquilla.	área; zona	Esta zona é calma.
arm	Arm	Mein Arm tut weh.	braccio	Mi fa male il braccio.	braço	O meu braço dói.
around	um ... herum; durch	Wir gehen durch den Park.	intorno a; in giro per	Camminiamo nel parco.	à volta de; pelo	Andamos pelo parque.
arrive	ankommen	Sie kommen um sechs an.	arrivare	Arrivano alle sei.	chegar	Eles chegam às seis.
art	Kunst	Ich mag Kunst.	arte	Mi piace l'arte.	arte	Gosto de arte.
article	Artikel	Ich lese online einen Artikel.	articolo	Leggo un articolo online.	artigo	Leio um artigo online.
artist	Künstler; Künstlerin	Der Künstler zeichnet ein Gesicht.	artista	L'artista disegna un volto.	artista	O artista desenha um rosto.
as	als	Ich arbeite als Lehrer.	come	Lavoro come insegnante.	como	Trabalho como professor.
ask	fragen	Frag jetzt den Lehrer.	chiedere	Chiedi ora all'insegnante.	perguntar	Pergunta ao professor agora.
at	an; bei; in	Ich bin zu Hause.	a; presso	Sono a casa.	em; a	Estou em casa.
August	August	Wir reisen im August.	agosto	Viaggiamo ad agosto.	agosto	Viajamos em agosto.
aunt	Tante	Meine Tante wohnt hier.	zia	Mia zia vive qui.	tia	A minha tia vive aqui.
autumn	Herbst	Im Herbst fallen Blätter.	autunno	Le foglie cadono in autunno.	outono	As folhas caem no outono.
away	weg	Der Bus fährt weg.	via	L'autobus va via.	embora; para longe	O autocarro vai embora.
baby	Baby	Das Baby schläft.	bambino piccolo; bebè	Il bebè dorme.	bebé	O bebé está a dormir.
back	Rücken	Mein Rücken tut weh.	schiena	Mi fa male la schiena.	costas	As minhas costas doem.
bad	schlecht	Diese Milch ist schlecht.	cattivo; brutto	Questo latte è cattivo.	mau; estragado	Este leite está estragado.
bag	Tasche	Deine Tasche liegt auf dem Stuhl.	borsa	La tua borsa è sulla sedia.	saco; mala	A tua mala está na cadeira.
ball	Ball	Der Ball liegt unter dem Tisch.	palla	La palla è sotto il tavolo.	bola	A bola está debaixo da mesa.
banana	Banane	Ich esse eine Banane.	banana	Mangio una banana.	banana	Como uma banana.
band	Band	Die Band spielt Musik.	gruppo musicale	La band suona musica.	banda	A banda toca música.
bank (money)	Bank	Die Bank öffnet um neun.	banca	La banca apre alle nove.	banco	O banco abre às nove.
bath	Bad	Ich nehme abends ein Bad.	bagno	Faccio un bagno di sera.	banho	Tomo banho à noite.
bathroom	Badezimmer	Das Badezimmer ist sauber.	bagno	Il bagno è pulito.	casa de banho	A casa de banho está limpa.
be	sein	Ich bin glücklich.	essere	Sono felice.	ser; estar	Estou feliz.
beach	Strand	Wir sitzen am Strand.	spiaggia	Sediamo sulla spiaggia.	praia	Sentamo-nos na praia.
beautiful	schön	Die Blume ist schön.	bello	Il fiore è bello.	bonito	A flor é bonita.
because	weil	Ich bleibe zu Hause, weil ich krank bin.	perché	Resto a casa perché sto male.	porque	Fico em casa porque estou doente.
become	werden	Es kann kalt werden.	diventare	Può diventare freddo.	tornar-se	Pode ficar frio.
bed	Bett	Das Bett ist groß.	letto	Il letto è grande.	cama	A cama é grande.
bedroom	Schlafzimmer	Mein Schlafzimmer ist ruhig.	camera da letto	La mia camera da letto è tranquilla.	quarto	O meu quarto é calmo.
beer	Bier	Er trinkt Bier zum Abendessen.	birra	Beve birra a cena.	cerveja	Ele bebe cerveja ao jantar.
before	vor	Wasch dir vor dem Mittagessen die Hände.	prima di	Lavati le mani prima di pranzo.	antes de	Lava as mãos antes do almoço.
begin	beginnen	Beginne jetzt den Test.	iniziare	Inizia ora il test.	começar	Começa o teste agora.
beginning	Anfang	Der Anfang ist einfach.	inizio	L'inizio è facile.	início	O início é fácil.
behind	hinter	Die Katze ist hinter dem Sofa.	dietro	Il gatto è dietro il divano.	atrás de	O gato está atrás do sofá.
believe	glauben	Ich glaube dir.	credere	Ti credo.	acreditar	Acredito em ti.
below	unter; unten	Der Name steht unter dem Bild.	sotto	Il nome è sotto l'immagine.	abaixo de	O nome está abaixo da imagem.
best	beste; bester	Sie ist meine beste Freundin.	migliore	Lei è la mia migliore amica.	melhor	Ela é a minha melhor amiga.
better	besser	Ich fühle mich heute besser.	meglio	Oggi mi sento meglio.	melhor	Sinto-me melhor hoje.
between	zwischen	Das Café ist zwischen zwei Geschäften.	tra; fra	Il caffè è tra due negozi.	entre	O café fica entre duas lojas.
bicycle	Fahrrad	Mein Fahrrad ist blau.	bicicletta	La mia bicicletta è blu.	bicicleta	A minha bicicleta é azul.
big	groß	Diese Schachtel ist groß.	grande	Questa scatola è grande.	grande	Esta caixa é grande.
bike	Rad; Fahrrad	Ich fahre mit meinem Rad.	bici	Vado in bici.	bicicleta	Ando de bicicleta.
bill	Rechnung	Die Rechnung liegt auf dem Tisch.	conto	Il conto è sul tavolo.	conta	A conta está na mesa.
bird	Vogel	Ein Vogel ist im Baum.	uccello	Un uccello è sull'albero.	pássaro	Um pássaro está na árvore.
birthday	Geburtstag	Heute ist mein Geburtstag.	compleanno	Oggi è il mio compleanno.	aniversário	Hoje é o meu aniversário.
black	schwarz	Meine Tasche ist schwarz.	nero	La mia borsa è nera.	preto	A minha mala é preta.
blog	Blog	Sie schreibt einen Blog.	blog	Lei scrive un blog.	blogue	Ela escreve um blogue.
blonde	blond	Er hat blondes Haar.	biondo	Ha i capelli biondi.	louro	Ele tem cabelo louro.
blue	blau	Der Himmel ist blau.	blu	Il cielo è blu.	azul	O céu é azul.
boat	Boot	Das Boot ist auf dem Wasser.	barca	La barca è sull'acqua.	barco	O barco está na água.
body	Körper	Mein Körper ist müde.	corpo	Il mio corpo è stanco.	corpo	O meu corpo está cansado.
book	Buch	Ich lese ein Buch.	libro	Leggo un libro.	livro	Leio um livro.
boot	Stiefel	Ein Stiefel liegt unter dem Bett.	stivale	Uno stivale è sotto il letto.	bota	Uma bota está debaixo da cama.
bored	gelangweilt	Ich bin gelangweilt.	annoiato	Sono annoiato.	aborrecido	Estou aborrecido.
boring	langweilig	Dieser Film ist langweilig.	noioso	Questo film è noioso.	aborrecido	Este filme é aborrecido.
born	geboren	Ich wurde im Mai geboren.	nato	Sono nato a maggio.	nascido	Eu nasci em maio.
both	beide	Beide Mädchen sind glücklich.	entrambi; entrambe	Entrambe le ragazze sono felici.	ambos; ambas	Ambas as raparigas estão felizes.
bottle	Flasche	Die Flasche ist voll.	bottiglia	La bottiglia è piena.	garrafa	A garrafa está cheia.
box	Schachtel; Kiste	Die Schachtel ist offen.	scatola	La scatola è aperta.	caixa	A caixa está aberta.
boy	Junge	Der Junge läuft schnell.	ragazzo	Il ragazzo corre veloce.	rapaz	O rapaz corre depressa.
boyfriend	Freund	Ihr Freund ist nett.	fidanzato	Il suo fidanzato è gentile.	namorado	O namorado dela é simpático.
bread	Brot	Ich möchte Brot.	pane	Voglio pane.	pão	Quero pão.
break	zerbrechen	Zerbrich die Tasse nicht.	rompere	Non rompere la tazza.	partir	Não partas a chávena.
breakfast	Frühstück	Das Frühstück ist fertig.	colazione	La colazione è pronta.	pequeno-almoço	O pequeno-almoço está pronto.
bring	bringen	Bring dein Buch mit.	portare	Porta il tuo libro.	trazer	Traz o teu livro.
brother	Bruder	Mein Bruder ist groß.	fratello	Mio fratello è alto.	irmão	O meu irmão é alto.
brown	braun	Der Hund ist braun.	marrone	Il cane è marrone.	castanho	O cão é castanho.
build	bauen	Sie bauen ein Haus.	costruire	Costruiscono una casa.	construir	Eles constroem uma casa.
building	Gebäude	Dieses Gebäude ist alt.	edificio	Questo edificio è vecchio.	edifício	Este edifício é velho.
bus	Bus	Der Bus ist spät dran.	autobus	L'autobus è in ritardo.	autocarro	O autocarro está atrasado.
business	Geschäft; Unternehmen	Mein Vater hat ein Geschäft.	attività; azienda	Mio padre ha un'attività.	negócio	O meu pai tem um negócio.
busy	beschäftigt	Ich bin heute beschäftigt.	occupato	Oggi sono occupato.	ocupado	Estou ocupado hoje.
but	aber	Ich mag Tee, aber keinen Kaffee.	ma	Mi piace il tè, ma non il caffè.	mas	Gosto de chá, mas não de café.
butter	Butter	Streich Butter aufs Brot.	burro	Metti il burro sul pane.	manteiga	Põe manteiga no pão.
buy	kaufen	Ich kaufe Milch.	comprare	Compro il latte.	comprar	Compro leite.
by	bei; neben	Setz dich ans Fenster.	vicino a; da	Siediti vicino alla finestra.	junto de	Senta-te junto à janela.
bye	tschüss	Tschüss, bis morgen.	ciao	Ciao, a domani.	adeus	Adeus, até amanhã.
cafe	Café	Wir treffen uns im Café.	caffè	Ci incontriamo al caffè.	café	Encontramo-nos no café.
cake	Kuchen	Der Kuchen ist süß.	torta	La torta è dolce.	bolo	O bolo é doce.
call	anrufen	Ruf mich bitte an.	chiamare	Per favore, chiamami.	telefonar	Por favor, telefona-me.
camera	Kamera	Meine Kamera ist neu.	fotocamera	La mia fotocamera è nuova.	câmara	A minha câmara é nova.
can1 modal	können	Ich kann schwimmen.	potere	So nuotare.	poder	Sei nadar.
cannot	nicht können	Ich kann heute nicht kommen.	non potere	Non posso venire oggi.	não poder	Não posso vir hoje.
capital	Hauptstadt	Paris ist eine Hauptstadt.	capitale	Parigi è una capitale.	capital	Paris é uma capital.
car	Auto	Das Auto ist rot.	auto	L'auto è rossa.	carro	O carro é vermelho.
card	Karte	Ich habe eine Geburtstagskarte.	carta; biglietto	Ho un biglietto di compleanno.	cartão	Tenho um cartão de aniversário.
career	Karriere	Ich möchte eine Karriere in der Kunst.	carriera	Voglio una carriera nell'arte.	carreira	Quero uma carreira na arte.
carrot	Karotte	Die Karotte ist orange.	carota	La carota è arancione.	cenoura	A cenoura é laranja.
carry	tragen	Ich trage meine Tasche.	portare	Porto la mia borsa.	levar; carregar	Levo a minha mala.
cat	Katze	Die Katze schläft.	gatto	Il gatto dorme.	gato	O gato dorme.
CD	CD	Diese CD hat Musik.	CD	Questo CD ha musica.	CD	Este CD tem música.
cent	Cent	Ein Cent ist sehr klein.	centesimo	Un centesimo è molto piccolo.	cêntimo	Um cêntimo é muito pequeno.
centre	Zentrum	Das Stadtzentrum ist belebt.	centro	Il centro della città è affollato.	centro	O centro da cidade está movimentado.
century	Jahrhundert	Ein Jahrhundert hat hundert Jahre.	secolo	Un secolo è cento anni.	século	Um século tem cem anos.
chair	Stuhl	Setz dich auf den Stuhl.	sedia	Siediti sulla sedia.	cadeira	Senta-te na cadeira.
change	wechseln; ändern	Ich wechsle meine Kleidung.	cambiare	Mi cambio i vestiti.	mudar	Mudo de roupa.
chart	Diagramm	Sieh dir das Diagramm an.	grafico	Guarda il grafico.	gráfico	Olha para o gráfico.
cheap	billig; günstig	Dieses Hemd ist günstig.	economico	Questa camicia è economica.	barato	Esta camisa é barata.
check	prüfen	Prüfe deine Antwort.	controllare	Controlla la tua risposta.	verificar	Verifica a tua resposta.
cheese	Käse	Ich mag Käse.	formaggio	Mi piace il formaggio.	queijo	Gosto de queijo.
chicken	Hähnchen; Huhn	Wir essen Hähnchen zum Abendessen.	pollo	Mangiamo pollo a cena.	frango	Comemos frango ao jantar.
child	Kind	Das Kind ist glücklich.	bambino	Il bambino è felice.	criança	A criança está feliz.
chocolate	Schokolade	Schokolade ist süß.	cioccolato	Il cioccolato è dolce.	chocolate	O chocolate é doce.
choose	wählen	Wähle eine Antwort.	scegliere	Scegli una risposta.	escolher	Escolhe uma resposta.
cinema	Kino	Wir gehen ins Kino.	cinema	Andiamo al cinema.	cinema	Vamos ao cinema.
city	Stadt	Die Stadt ist groß.	città	La città è grande.	cidade	A cidade é grande.
class	Unterricht	Der Unterricht beginnt um neun.	lezione	La lezione inizia alle nove.	aula	A aula começa às nove.
classroom	Klassenzimmer	Das Klassenzimmer ist ruhig.	aula	L'aula è tranquilla.	sala de aula	A sala de aula está calma.
clean	sauber	Das Zimmer ist sauber.	pulito	La stanza è pulita.	limpo	O quarto está limpo.
climb	klettern; steigen	Sie steigen den Hügel hinauf.	salire; arrampicarsi	Salgo sulla collina.	subir	Eles sobem a colina.
clock	Uhr	Die Uhr hängt an der Wand.	orologio	L'orologio è sulla parete.	relógio	O relógio está na parede.
close1	schließen	Schließ bitte die Tür.	chiudere	Chiudi la porta, per favore.	fechar	Fecha a porta, por favor.
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
    parser.add_argument("--batch-id", default="de_it_pt_v1")
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
