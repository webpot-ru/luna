#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_VERSION = "2026-05-17.v1"
LANGUAGES = ["NO", "DA", "FI", "CS"]
SENTENCE_END_RE = re.compile(r"[.!?。！？]$")


TRANSLATIONS_TSV = """source_headword	NO	example_NO	DA	example_DA	FI	example_FI	CS	example_CS
a, an	en; ei; et	Jeg har en penn.	en; et	Jeg har en pen.	epämääräinen artikkeli	Minulla on kynä.	neurčitý člen	Mám pero.
about	om; omtrent	Vi snakker om mat.	om; cirka	Vi taler om mad.	aiheesta; noin	Puhumme ruoasta.	o; asi	Mluvíme o jídle.
above	over; ovenfor	Klokken er over døren.	over; ovenfor	Uret er over døren.	yläpuolella	Kello on oven yläpuolella.	nad	Hodiny jsou nad dveřmi.
across	på andre siden av	Butikken ligger på andre siden av gaten.	på den anden side af	Butikken ligger på den anden side af gaden.	toisella puolella	Kauppa on kadun toisella puolella.	na druhé straně	Obchod je na druhé straně ulice.
action	handling	Handlingen hans hjelper meg.	handling	Hans handling hjælper mig.	teko; toiminta	Hänen tekonsa auttaa minua.	čin; jednání	Jeho čin mi pomáhá.
activity	aktivitet	Svømming er en morsom aktivitet.	aktivitet	Svømning er en sjov aktivitet.	aktiviteetti; toiminta	Uinti on hauska aktiviteetti.	aktivita	Plavání je zábavná aktivita.
actor	skuespiller	Skuespilleren er med i en film.	skuespiller	Skuespilleren er med i en film.	näyttelijä	Näyttelijä on elokuvassa.	herec	Herec je ve filmu.
actress	skuespillerinne	Skuespillerinnen smiler til oss.	skuespillerinde	Skuespillerinden smiler til os.	näyttelijätär; näyttelijä	Näyttelijä hymyilee meille.	herečka	Herečka se na nás usmívá.
add	legge til	Legg til navnet ditt her.	tilføje	Tilføj dit navn her.	lisätä	Lisää nimesi tähän.	přidat	Přidej sem své jméno.
address	adresse	Adressen min står på dette kortet.	adresse	Min adresse står på dette kort.	osoite	Osoitteeni on tässä kortissa.	adresa	Moje adresa je na této kartě.
adult	voksen	En voksen sitter ved døren.	voksen	En voksen sidder ved døren.	aikuinen	Aikuinen istuu oven lähellä.	dospělý	Dospělý sedí u dveří.
advice	råd	Rådet hennes er enkelt.	råd	Hendes råd er enkelt.	neuvo	Hänen neuvonsa on yksinkertainen.	rada	Její rada je jednoduchá.
afraid	redd	Barnet er redd.	bange	Barnet er bange.	peloissaan	Lapsi on peloissaan.	vystrašený; bát se	Dítě se bojí.
after	etter	Jeg spiser etter timen.	efter	Jeg spiser efter timen.	jälkeen	Syön oppitunnin jälkeen.	po	Jím po hodině.
afternoon	ettermiddag	Jeg studerer om ettermiddagen.	eftermiddag	Jeg læser om eftermiddagen.	iltapäivä	Opiskelen iltapäivällä.	odpoledne	Odpoledne se učím.
again	igjen	Si det igjen, vær så snill.	igen	Sig det igen, tak.	uudelleen; taas	Sano se uudelleen, ole hyvä.	znovu; zase	Řekni to prosím znovu.
age	alder	Hvor gammel er du?	alder	Hvor gammel er du?	ikä	Mikä on ikäsi?	věk	Kolik ti je let?
ago	siden	Jeg kom hit for to dager siden.	for siden	Jeg kom hertil for to dage siden.	sitten	Tulin tänne kaksi päivää sitten.	před	Přišel jsem sem před dvěma dny.
agree	være enig	Jeg er enig med deg.	være enig	Jeg er enig med dig.	olla samaa mieltä	Olen kanssasi samaa mieltä.	souhlasit	Souhlasím s tebou.
air	luft	Luften er kald.	luft	Luften er kold.	ilma	Ilma on kylmä.	vzduch	Vzduch je studený.
airport	flyplass	Vi er på flyplassen.	lufthavn	Vi er i lufthavnen.	lentokenttä	Olemme lentokentällä.	letiště	Jsme na letišti.
all	alle; alt	Alle elevene er her.	alle; alt	Alle eleverne er her.	kaikki	Kaikki oppilaat ovat täällä.	všichni; všechno	Všichni studenti jsou tady.
also	også	Jeg liker også te.	også	Jeg kan også lide te.	myös	Pidän myös teestä.	také	Také mám rád čaj.
always	alltid	Hun drikker alltid vann.	altid	Hun drikker altid vand.	aina	Hän juo aina vettä.	vždy	Vždy pije vodu.
amazing	fantastisk	Utsikten er fantastisk.	fantastisk	Udsigten er fantastisk.	hämmästyttävä; upea	Näkymä on upea.	úžasný	Výhled je úžasný.
and	og	Tom og Anna er venner.	og	Tom og Anna er venner.	ja	Tom ja Anna ovat ystäviä.	a	Tom a Anna jsou přátelé.
angry	sint	Han er sint nå.	vred	Han er vred nu.	vihainen	Hän on nyt vihainen.	rozzlobený	Teď je rozzlobený.
animal	dyr	En hund er et dyr.	dyr	En hund er et dyr.	eläin	Koira on eläin.	zvíře	Pes je zvíře.
another	en annen; ett til	Jeg vil ha en kopp til.	en anden; en til	Jeg vil have en kop til.	toinen	Haluan toisen kupin.	další; jiný	Chci další šálek.
answer	svar	Skriv svaret her.	svar	Skriv svaret her.	vastaus	Kirjoita vastaus tähän.	odpověď	Napiš odpověď sem.
any	noen; noe	Har du noen penger?	nogen; noget	Har du nogen penge?	jokin; yhtään	Onko sinulla rahaa?	nějaký; jakýkoli	Máš nějaké peníze?
anyone	noen	Trenger noen hjelp?	nogen	Har nogen brug for hjælp?	kukaan; joku	Tarvitseeko joku apua?	někdo; kdokoli	Potřebuje někdo pomoc?
anything	noe	Jeg kan ikke se noe.	noget	Jeg kan ikke se noget.	mitään	En näe mitään.	něco; cokoli	Nevidím nic.
apartment	leilighet	Leiligheten min er liten.	lejlighed	Min lejlighed er lille.	asunto	Asuntoni on pieni.	byt	Můj byt je malý.
apple	eple	Dette eplet er rødt.	æble	Dette æble er rødt.	omena	Tämä omena on punainen.	jablko	To jablko je červené.
April	april	Bursdagen min er i april.	april	Min fødselsdag er i april.	huhtikuu	Syntymäpäiväni on huhtikuussa.	duben	Moje narozeniny jsou v dubnu.
area	område	Dette området er stille.	område	Dette område er roligt.	alue	Tämä alue on hiljainen.	oblast; okolí	Ta oblast je klidná.
arm	arm	Armen min gjør vondt.	arm	Min arm gør ondt.	käsivarsi	Käsivarteeni sattuu.	paže	Bolí mě paže.
around	rundt	Vi går rundt i parken.	rundt	Vi går rundt i parken.	ympäri; ympärillä	Kävelemme puistossa ympäriinsä.	kolem	Procházíme se po parku.
arrive	ankomme; komme	De kommer klokken seks.	ankomme; komme	De ankommer klokken seks.	saapua	He saapuvat kuudelta.	přijet; dorazit	Přijedou v šest.
art	kunst	Jeg liker kunst.	kunst	Jeg kan lide kunst.	taide	Pidän taiteesta.	umění	Mám rád umění.
article	artikkel	Jeg leser en artikkel på nettet.	artikel	Jeg læser en artikel online.	artikkeli	Luen artikkelia verkossa.	článek	Čtu článek online.
artist	kunstner	Kunstneren tegner et ansikt.	kunstner	Kunstneren tegner et ansigt.	taiteilija	Taiteilija piirtää kasvot.	umělec	Umělec kreslí obličej.
as	som	Jeg jobber som lærer.	som	Jeg arbejder som lærer.	-na; kuten	Työskentelen opettajana.	jako	Pracuji jako učitel.
ask	spørre	Spør læreren nå.	spørge	Spørg læreren nu.	kysyä	Kysy nyt opettajalta.	ptát se; požádat	Zeptej se teď učitele.
at	på; ved	Jeg er hjemme.	ved; på	Jeg er hjemme.	-ssa; luona	Olen kotona.	v; u; na	Jsem doma.
August	august	Vi reiser i august.	august	Vi rejser i august.	elokuu	Matkustamme elokuussa.	srpen	Cestujeme v srpnu.
aunt	tante	Tanten min bor her.	tante	Min tante bor her.	täti	Tätini asuu täällä.	teta	Moje teta tady bydlí.
autumn	høst	Blader faller om høsten.	efterår	Blade falder om efteråret.	syksy	Lehdet putoavat syksyllä.	podzim	Na podzim padá listí.
away	bort	Bussen kjører bort.	væk	Bussen kører væk.	pois	Bussi lähtee pois.	pryč	Autobus odjíždí pryč.
baby	baby	Babyen sover.	baby	Babyen sover.	vauva	Vauva nukkuu.	miminko	Miminko spí.
back	rygg	Ryggen min gjør vondt.	ryg	Min ryg gør ondt.	selkä	Selkääni sattuu.	záda	Bolí mě záda.
bad	dårlig	Denne melken er dårlig.	dårlig	Denne mælk er dårlig.	huono; pilaantunut	Tämä maito on pilaantunutta.	špatný	To mléko je špatné.
bag	veske	Vesken din ligger på stolen.	taske	Din taske ligger på stolen.	laukku	Laukkusi on tuolilla.	taška	Tvoje taška je na židli.
ball	ball	Ballen ligger under bordet.	bold	Bolden ligger under bordet.	pallo	Pallo on pöydän alla.	míč	Míč je pod stolem.
banana	banan	Jeg spiser en banan.	banan	Jeg spiser en banan.	banaani	Syön banaanin.	banán	Jím banán.
band	band	Bandet spiller musikk.	band	Bandet spiller musik.	bändi	Bändi soittaa musiikkia.	kapela	Kapela hraje hudbu.
bank (money)	bank	Banken åpner klokken ni.	bank	Banken åbner klokken ni.	pankki	Pankki avautuu yhdeksältä.	banka	Banka otevírá v devět.
bath	bad	Jeg tar et bad om kvelden.	bad	Jeg tager et bad om aftenen.	kylpy	Käyn illalla kylvyssä.	koupel	Večer se koupu.
bathroom	bad; badrom	Badet er rent.	badeværelse	Badeværelset er rent.	kylpyhuone	Kylpyhuone on puhdas.	koupelna	Koupelna je čistá.
be	være	Jeg er glad.	være	Jeg er glad.	olla	Olen onnellinen.	být	Jsem šťastný.
beach	strand	Vi sitter på stranden.	strand	Vi sidder på stranden.	ranta	Istumme rannalla.	pláž	Sedíme na pláži.
beautiful	vakker	Blomsten er vakker.	smuk	Blomsten er smuk.	kaunis	Kukka on kaunis.	krásný	Květina je krásná.
because	fordi	Jeg blir hjemme fordi jeg er syk.	fordi	Jeg bliver hjemme, fordi jeg er syg.	koska	Jään kotiin, koska olen sairas.	protože	Zůstávám doma, protože jsem nemocný.
become	bli	Det kan bli kaldt.	blive	Det kan blive koldt.	tulla joksikin; muuttua	Sää voi muuttua kylmäksi.	stát se	Může se ochladit.
bed	seng	Sengen er stor.	seng	Sengen er stor.	sänky	Sänky on iso.	postel	Postel je velká.
bedroom	soverom	Soverommet mitt er stille.	soveværelse	Mit soveværelse er roligt.	makuuhuone	Makuuhuoneeni on hiljainen.	ložnice	Moje ložnice je tichá.
beer	øl	Han drikker øl til middag.	øl	Han drikker øl til aftensmad.	olut	Hän juo olutta illallisella.	pivo	K večeři pije pivo.
before	før	Vask hendene før lunsj.	før	Vask hænder før frokost.	ennen	Pese kädet ennen lounasta.	před	Umyj si ruce před obědem.
begin	begynne	Begynn prøven nå.	begynde	Begynd prøven nu.	alkaa; aloittaa	Aloita koe nyt.	začít	Začni test teď.
beginning	begynnelse	Begynnelsen er enkel.	begyndelse	Begyndelsen er let.	alku	Alku on helppo.	začátek	Začátek je snadný.
behind	bak	Katten er bak sofaen.	bag	Katten er bag sofaen.	takana	Kissa on sohvan takana.	za	Kočka je za pohovkou.
believe	tro	Jeg tror deg.	tro	Jeg tror på dig.	uskoa	Uskon sinua.	věřit	Věřím ti.
below	nedenfor; under	Navnet står under bildet.	nedenfor; under	Navnet står under billedet.	alapuolella	Nimi on kuvan alapuolella.	pod	Jméno je pod obrázkem.
best	best	Hun er min beste venn.	bedste	Hun er min bedste ven.	paras	Hän on paras ystäväni.	nejlepší	Je moje nejlepší kamarádka.
better	bedre	Jeg føler meg bedre i dag.	bedre	Jeg har det bedre i dag.	parempi	Minulla on tänään parempi olo.	lepší	Dnes se cítím lépe.
between	mellom	Kafeen ligger mellom to butikker.	mellem	Caféen ligger mellem to butikker.	välissä	Kahvila on kahden kaupan välissä.	mezi	Kavárna je mezi dvěma obchody.
bicycle	sykkel	Sykkelen min er blå.	cykel	Min cykel er blå.	polkupyörä	Polkupyöräni on sininen.	jízdní kolo	Moje kolo je modré.
big	stor	Denne esken er stor.	stor	Denne kasse er stor.	iso; suuri	Tämä laatikko on iso.	velký	Tahle krabice je velká.
bike	sykkel	Jeg sykler.	cykel	Jeg cykler.	pyörä	Ajan pyörällä.	kolo	Jedu na kole.
bill	regning	Regningen ligger på bordet.	regning	Regningen ligger på bordet.	lasku	Lasku on pöydällä.	účet	Účet je na stole.
bird	fugl	En fugl sitter i treet.	fugl	En fugl sidder i træet.	lintu	Lintu on puussa.	pták	Na stromě je pták.
birthday	bursdag	I dag er det bursdagen min.	fødselsdag	I dag er det min fødselsdag.	syntymäpäivä	Tänään on syntymäpäiväni.	narozeniny	Dnes mám narozeniny.
black	svart	Vesken min er svart.	sort	Min taske er sort.	musta	Laukkuni on musta.	černý	Moje taška je černá.
blog	blogg	Hun skriver en blogg.	blog	Hun skriver en blog.	blogi	Hän kirjoittaa blogia.	blog	Píše blog.
blonde	blond	Han har blondt hår.	blond	Han har blondt hår.	vaalea; vaaleatukkainen	Hänellä on vaaleat hiukset.	blond; světlovlasý	Má blond vlasy.
blue	blå	Himmelen er blå.	blå	Himlen er blå.	sininen	Taivas on sininen.	modrý	Nebe je modré.
boat	båt	Båten er på vannet.	båd	Båden er på vandet.	vene	Vene on vedessä.	loď	Loď je na vodě.
body	kropp	Kroppen min er sliten.	krop	Min krop er træt.	keho; vartalo	Kehoni on väsynyt.	tělo	Moje tělo je unavené.
book	bok	Jeg leser en bok.	bog	Jeg læser en bog.	kirja	Luen kirjaa.	kniha	Čtu knihu.
boot	støvel	Én støvel ligger under sengen.	støvle	En støvle ligger under sengen.	saapas	Yksi saapas on sängyn alla.	bota	Jedna bota je pod postelí.
bored	lei; kjeder seg	Jeg kjeder meg.	keder sig	Jeg keder mig.	tylsistynyt	Olen tylsistynyt.	znuděný	Nudím se.
boring	kjedelig	Denne filmen er kjedelig.	kedelig	Denne film er kedelig.	tylsä	Tämä elokuva on tylsä.	nudný	Ten film je nudný.
born	født	Jeg ble født i mai.	født	Jeg blev født i maj.	syntynyt	Olen syntynyt toukokuussa.	narozený	Narodil jsem se v květnu.
both	begge	Begge jentene er glade.	begge	Begge piger er glade.	molemmat	Molemmat tytöt ovat onnellisia.	oba; obě	Obě dívky jsou šťastné.
bottle	flaske	Flasken er full.	flaske	Flasken er fuld.	pullo	Pullo on täynnä.	lahev	Láhev je plná.
box	eske	Boksen er åpen.	kasse; boks	Kassen er åben.	laatikko	Laatikko on auki.	krabice	Krabice je otevřená.
boy	gutt	Gutten løper fort.	dreng	Drengen løber hurtigt.	poika	Poika juoksee nopeasti.	chlapec	Chlapec běží rychle.
boyfriend	kjæreste	Kjæresten hennes er snill.	kæreste	Hendes kæreste er venlig.	poikaystävä	Hänen poikaystävänsä on kiltti.	přítel	Její přítel je milý.
bread	brød	Jeg vil ha brød.	brød	Jeg vil have brød.	leipä	Haluan leipää.	chléb	Chci chléb.
break	knuse; ødelegge	Ikke knus koppen.	knække; ødelægge	Ødelæg ikke koppen.	rikkoa	Älä riko kuppia.	rozbít	Nerozbij ten šálek.
breakfast	frokost	Frokosten er klar.	morgenmad	Morgenmaden er klar.	aamiainen	Aamiainen on valmis.	snídaně	Snídaně je připravená.
bring	ta med	Ta med boken din.	tage med	Tag din bog med.	tuoda; ottaa mukaan	Tuo kirjasi.	přinést	Přines svou knihu.
brother	bror	Broren min er høy.	bror	Min bror er høj.	veli	Veljeni on pitkä.	bratr	Můj bratr je vysoký.
brown	brun	Hunden er brun.	brun	Hunden er brun.	ruskea	Koira on ruskea.	hnědý	Pes je hnědý.
build	bygge	De bygger et hus.	bygge	De bygger et hus.	rakentaa	He rakentavat taloa.	stavět	Staví dům.
building	bygning	Denne bygningen er gammel.	bygning	Denne bygning er gammel.	rakennus	Tämä rakennus on vanha.	budova	Ta budova je stará.
bus	buss	Bussen er sen.	bus	Bussen er forsinket.	bussi	Bussi on myöhässä.	autobus	Autobus má zpoždění.
business	forretning; virksomhet	Faren min har en virksomhet.	forretning; virksomhed	Min far har en virksomhed.	liiketoiminta; yritys	Isälläni on yritys.	podnik; obchod	Můj otec má podnik.
busy	opptatt	Jeg er opptatt i dag.	travl	Jeg har travlt i dag.	kiireinen	Olen tänään kiireinen.	zaneprázdněný	Dnes jsem zaneprázdněný.
but	men	Jeg liker te, men ikke kaffe.	men	Jeg kan lide te, men ikke kaffe.	mutta	Pidän teestä, mutta en kahvista.	ale	Mám rád čaj, ale ne kávu.
butter	smør	Ha smør på brødet.	smør	Smør brødet med smør.	voi	Laita voita leivälle.	máslo	Dej máslo na chléb.
buy	kjøpe	Jeg kjøper melk.	købe	Jeg køber mælk.	ostaa	Ostan maitoa.	koupit	Kupuji mléko.
by	ved; av	Sitt ved vinduet.	ved; af	Sid ved vinduet.	vieressä; toimesta	Istu ikkunan vieressä.	u; podle	Sedni si k oknu.
bye	ha det	Ha det, vi ses i morgen.	farvel	Farvel, vi ses i morgen.	hei hei	Hei hei, nähdään huomenna.	ahoj; na shledanou	Ahoj, uvidíme se zítra.
cafe	kafé	Vi møtes på kafeen.	café	Vi mødes på caféen.	kahvila	Tapaamme kahvilassa.	kavárna	Sejdeme se v kavárně.
cake	kake	Kaken er søt.	kage	Kagen er sød.	kakku	Kakku on makea.	dort	Dort je sladký.
call	ringe; kalle	Ring meg, vær så snill.	ringe; kalde	Ring til mig, tak.	soittaa; kutsua	Soita minulle, ole hyvä.	volat; nazývat	Zavolej mi prosím.
camera	kamera	Kameraet mitt er nytt.	kamera	Mit kamera er nyt.	kamera	Kamerani on uusi.	fotoaparát	Můj fotoaparát je nový.
can1 modal	kunne	Jeg kan svømme.	kunne	Jeg kan svømme.	voida; osata	Osaan uida.	moci; umět	Umím plavat.
cannot	kan ikke	Jeg kan ikke komme i dag.	kan ikke	Jeg kan ikke komme i dag.	ei voi	En voi tulla tänään.	nemoci	Dnes nemůžu přijít.
capital	hovedstad	Paris er en hovedstad.	hovedstad	Paris er en hovedstad.	pääkaupunki	Pariisi on pääkaupunki.	hlavní město	Paříž je hlavní město.
car	bil	Bilen er rød.	bil	Bilen er rød.	auto	Auto on punainen.	auto	Auto je červené.
card	kort	Jeg har et bursdagskort.	kort	Jeg har et fødselsdagskort.	kortti	Minulla on syntymäpäiväkortti.	karta; přání	Mám narozeninové přání.
career	karriere	Jeg vil ha en karriere innen kunst.	karriere	Jeg vil have en karriere inden for kunst.	ura	Haluan uran taiteessa.	kariéra	Chci kariéru v umění.
carrot	gulrot	Gulroten er oransje.	gulerod	Guleroden er orange.	porkkana	Porkkana on oranssi.	mrkev	Mrkev je oranžová.
carry	bære	Jeg bærer vesken min.	bære	Jeg bærer min taske.	kantaa	Kannan laukkuani.	nést	Nesu svou tašku.
cat	katt	Katten sover.	kat	Katten sover.	kissa	Kissa nukkuu.	kočka	Kočka spí.
CD	CD	Denne CD-en har musikk.	cd	Denne cd har musik.	CD-levy	Tällä CD-levyllä on musiikkia.	CD	To CD má hudbu.
cent	cent	Én cent er veldig liten.	cent	En cent er meget lille.	sentti	Yksi sentti on hyvin pieni.	cent	Jeden cent je velmi malý.
centre	sentrum	Sentrum av byen er travelt.	centrum	Byens centrum er travlt.	keskusta	Kaupungin keskusta on vilkas.	centrum	Centrum města je rušné.
century	århundre	Et århundre er hundre år.	århundrede	Et århundrede er hundrede år.	vuosisata	Vuosisata on sata vuotta.	století	Století je sto let.
chair	stol	Sitt på stolen.	stol	Sid på stolen.	tuoli	Istu tuolille.	židle	Sedni si na židli.
change	endre; skifte	Jeg skifter klær.	ændre; skifte	Jeg skifter tøj.	muuttaa; vaihtaa	Vaihdan vaatteet.	změnit; vyměnit	Měním si oblečení.
chart	diagram	Se på diagrammet.	diagram	Se på diagrammet.	kaavio	Katso kaaviota.	graf; tabulka	Podívej se na graf.
cheap	billig	Denne skjorten er billig.	billig	Denne skjorte er billig.	halpa	Tämä paita on halpa.	levný	Tahle košile je levná.
check	sjekke	Sjekk svaret ditt.	tjekke	Tjek dit svar.	tarkistaa	Tarkista vastauksesi.	zkontrolovat	Zkontroluj svou odpověď.
cheese	ost	Jeg liker ost.	ost	Jeg kan lide ost.	juusto	Pidän juustosta.	sýr	Mám rád sýr.
chicken	kylling	Vi spiser kylling til middag.	kylling	Vi spiser kylling til aftensmad.	kana	Syömme kanaa illalliseksi.	kuře	K večeři jíme kuře.
child	barn	Barnet er glad.	barn	Barnet er glad.	lapsi	Lapsi on onnellinen.	dítě	Dítě je šťastné.
chocolate	sjokolade	Sjokolade er søt.	chokolade	Chokolade er sød.	suklaa	Suklaa on makeaa.	čokoláda	Čokoláda je sladká.
choose	velge	Velg ett svar.	vælge	Vælg ét svar.	valita	Valitse yksi vastaus.	vybrat	Vyber jednu odpověď.
cinema	kino	Vi går på kino.	biograf	Vi går i biografen.	elokuvateatteri	Menemme elokuvateatteriin.	kino	Jdeme do kina.
city	by	Byen er stor.	by	Byen er stor.	kaupunki	Kaupunki on iso.	město	Město je velké.
class	time; klasse	Timen begynner klokken ni.	time; klasse	Timen begynder klokken ni.	oppitunti; luokka	Oppitunti alkaa yhdeksältä.	hodina; třída	Hodina začíná v devět.
classroom	klasserom	Klasserommet er stille.	klasselokale	Klasselokalet er roligt.	luokkahuone	Luokkahuone on hiljainen.	třída; učebna	Učebna je tichá.
clean	ren; rengjøre	Rommet er rent.	ren; gøre rent	Værelset er rent.	puhdas; siivota	Huone on puhdas.	čistý; uklidit	Pokoj je čistý.
climb	klatre	De klatrer opp bakken.	klatre	De klatrer op ad bakken.	kiivetä	He kiipeävät mäelle.	lézt; vyšplhat	Vylézají na kopec.
clock	klokke	Klokken er på veggen.	ur	Uret hænger på væggen.	kello	Kello on seinällä.	hodiny	Hodiny jsou na zdi.
close1	lukke	Lukk døren, vær så snill.	lukke	Luk døren, tak.	sulkea	Sulje ovi, ole hyvä.	zavřít	Zavři dveře, prosím.
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
    parser.add_argument("--batch-id", default="no_da_fi_cs_v1")
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
        "- Validation: exact source-row coverage, non-empty display/example cells, sentence punctuation",
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
