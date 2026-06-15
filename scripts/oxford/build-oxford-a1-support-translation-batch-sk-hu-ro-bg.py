#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_VERSION = "2026-05-17.v1"
LANGUAGES = ["SK", "HU", "RO", "BG"]
SENTENCE_END_RE = re.compile(r"[.!?。！？]$")
CYRILLIC_RE = re.compile(r"[\u0400-\u04FF]")


TRANSLATIONS_TSV = """source_headword	SK	example_SK	HU	example_HU	RO	example_RO	BG	example_BG
a, an	neurčitý člen	Mám pero.	egy; határozatlan névelő	Van egy tollam.	un; o	Am un stilou.	неопределителен член	Имам химикалка.
about	o; asi	Hovoríme o jedle.	ról/ről; körülbelül	Ételről beszélünk.	despre; aproximativ	Vorbim despre mâncare.	за; около	Говорим за храна.
above	nad	Hodiny sú nad dverami.	felett	Az óra az ajtó felett van.	deasupra	Ceasul este deasupra ușii.	над	Часовникът е над вратата.
across	na druhej strane	Obchod je na druhej strane ulice.	a túloldalon	A bolt az utca túloldalán van.	peste; de cealaltă parte	Magazinul este peste drum.	от другата страна	Магазинът е от другата страна на улицата.
action	čin; konanie	Jeho čin mi pomáha.	cselekedet; tett	A tette segít nekem.	acțiune	Acțiunea lui mă ajută.	действие; постъпка	Неговата постъпка ми помага.
activity	aktivita	Plávanie je zábavná aktivita.	tevékenység	Az úszás szórakoztató tevékenység.	activitate	Înotul este o activitate distractivă.	дейност	Плуването е забавна дейност.
actor	herec	Herec je vo filme.	színész	A színész egy filmben van.	actor	Actorul este într-un film.	актьор	Актьорът е във филм.
actress	herečka	Herečka sa na nás usmieva.	színésznő	A színésznő ránk mosolyog.	actriță	Actrița ne zâmbește.	актриса	Актрисата ни се усмихва.
add	pridať	Pridaj sem svoje meno.	hozzáadni	Írd ide a neved.	a adăuga	Adaugă-ți numele aici.	добавям	Добави името си тук.
address	adresa	Moja adresa je na tejto karte.	cím	A címem ezen a kártyán van.	adresă	Adresa mea este pe acest card.	адрес	Адресът ми е на тази карта.
adult	dospelý	Dospelý sedí pri dverách.	felnőtt	Egy felnőtt ül az ajtó mellett.	adult	Un adult stă lângă ușă.	възрастен	Възрастен седи до вратата.
advice	rada	Jej rada je jednoduchá.	tanács	A tanácsa egyszerű.	sfaturi; sfat	Sfatul ei este simplu.	съвет	Нейният съвет е прост.
afraid	vystrašený; báť sa	Dieťa sa bojí.	félő; megijedt	A gyerek fél.	frică; speriat	Copilului îi este frică.	уплашен; страхувам се	Детето се страхува.
after	po	Jem po hodine.	után	Óra után eszem.	după	Mănânc după curs.	след	Ям след часа.
afternoon	popoludnie	Učím sa popoludní.	délután	Délután tanulok.	după-amiază	Studiez după-amiaza.	следобед	Уча следобед.
again	znova; opäť	Povedz to prosím znova.	újra; megint	Mondd el újra, kérlek.	din nou	Spune asta din nou, te rog.	отново; пак	Кажи го отново, моля.
age	vek	Koľko máš rokov?	kor	Mennyi idős vagy?	vârstă	Ce vârstă ai?	възраст	На колко години си?
ago	pred	Prišiel som sem pred dvoma dňami.	ezelőtt	Két napja jöttem ide.	acum	Am venit aici acum două zile.	преди	Дойдох тук преди два дни.
agree	súhlasiť	Súhlasím s tebou.	egyetérteni	Egyetértek veled.	a fi de acord	Sunt de acord cu tine.	съгласявам се	Съгласен съм с теб.
air	vzduch	Vzduch je studený.	levegő	A levegő hideg.	aer	Aerul este rece.	въздух	Въздухът е студен.
airport	letisko	Sme na letisku.	repülőtér	A repülőtéren vagyunk.	aeroport	Suntem la aeroport.	летище	На летището сме.
all	všetci; všetko	Všetci študenti sú tu.	minden; összes	Minden diák itt van.	toți; tot	Toți elevii sunt aici.	всички; всичко	Всички ученици са тук.
also	tiež; aj	Mám rád aj čaj.	is; szintén	A teát is szeretem.	și; de asemenea	Îmi place și ceaiul.	също	Аз също харесвам чай.
always	vždy	Ona vždy pije vodu.	mindig	Mindig vizet iszik.	mereu; întotdeauna	Ea bea mereu apă.	винаги	Тя винаги пие вода.
amazing	úžasný	Výhľad je úžasný.	lenyűgöző; csodálatos	A kilátás csodálatos.	uimitor	Priveliștea este uimitoare.	удивителен	Гледката е удивителна.
and	a	Tom a Anna sú priatelia.	és	Tom és Anna barátok.	și	Tom și Anna sunt prieteni.	и	Том и Анна са приятели.
angry	nahnevaný	Teraz je nahnevaný.	mérges	Most mérges.	furios	El este furios acum.	ядосан	Той е ядосан сега.
animal	zviera	Pes je zviera.	állat	A kutya állat.	animal	Un câine este un animal.	животно	Кучето е животно.
another	ďalší; iný	Chcem ďalšiu šálku.	másik; újabb	Szeretnék még egy csészét.	alt; încă unul	Vreau încă o ceașcă.	друг; още един	Искам още една чаша.
answer	odpoveď	Napíš odpoveď sem.	válasz	Írd ide a választ.	răspuns	Scrie răspunsul aici.	отговор	Напиши отговора тук.
any	nejaký; akýkoľvek	Máš nejaké peniaze?	bármilyen; valamennyi	Van nálad pénz?	ceva; vreun	Ai bani?	някакъв; който и да е	Имаш ли пари?
anyone	niekto; ktokoľvek	Potrebuje niekto pomoc?	valaki; bárki	Kell valakinek segítség?	cineva; oricine	Are cineva nevoie de ajutor?	някой; който и да е	Някой има ли нужда от помощ?
anything	niečo; čokoľvek	Nevidím nič.	valami; bármi	Nem látok semmit.	ceva; orice	Nu văd nimic.	нещо; каквото и да е	Не виждам нищо.
apartment	byt	Môj byt je malý.	lakás	A lakásom kicsi.	apartament	Apartamentul meu este mic.	апартамент	Апартаментът ми е малък.
apple	jablko	Toto jablko je červené.	alma	Ez az alma piros.	măr	Acest măr este roșu.	ябълка	Тази ябълка е червена.
April	apríl	Moje narodeniny sú v apríli.	április	A születésnapom áprilisban van.	aprilie	Ziua mea este în aprilie.	април	Рожденият ми ден е през април.
area	oblasť; okolie	Táto oblasť je tichá.	terület; környék	Ez a környék csendes.	zonă; regiune	Această zonă este liniștită.	област; район	Този район е тих.
arm	ruka; rameno	Bolí ma ruka.	kar	Fáj a karom.	braț	Mă doare brațul.	ръка	Боли ме ръката.
around	okolo; dookola	Prechádzame sa po parku.	körül; körbe	Körbesétálunk a parkban.	în jurul	Ne plimbăm prin parc.	около	Разхождаме се из парка.
arrive	prísť; doraziť	Prídu o šiestej.	megérkezni	Hatkor érkeznek.	a ajunge; a sosi	Ei ajung la șase.	пристигам	Те пристигат в шест.
art	umenie	Mám rád umenie.	művészet	Szeretem a művészetet.	artă	Îmi place arta.	изкуство	Харесвам изкуство.
article	článok	Čítam článok online.	cikk	Egy cikket olvasok online.	articol	Citesc un articol online.	статия	Чета статия онлайн.
artist	umelec	Umelec kreslí tvár.	művész	A művész arcot rajzol.	artist	Artistul desenează o față.	художник; артист	Художникът рисува лице.
as	ako	Pracujem ako učiteľ.	mint	Tanárként dolgozom.	ca	Lucrez ca profesor.	като	Работя като учител.
ask	pýtať sa; požiadať	Spýtaj sa učiteľa teraz.	kérdezni; kérni	Kérdezd meg most a tanárt.	a întreba; a cere	Întreabă profesorul acum.	питам; моля	Попитай учителя сега.
at	v; pri; na	Som doma.	-nál/-nél; -ban/-ben	Otthon vagyok.	la; în	Sunt acasă.	в; на; при	Вкъщи съм.
August	august	Cestujeme v auguste.	augusztus	Augusztusban utazunk.	august	Călătorim în august.	август	Пътуваме през август.
aunt	teta	Moja teta býva tu.	nagynéni; néni	A nagynéném itt lakik.	mătușă	Mătușa mea locuiește aici.	леля	Леля ми живее тук.
autumn	jeseň	Listy padajú na jeseň.	ősz	Ősszel hullanak a levelek.	toamnă	Frunzele cad toamna.	есен	Листата падат през есента.
away	preč	Autobus odchádza preč.	el; távol	A busz elmegy.	departe	Autobuzul pleacă.	далеч; настрана	Автобусът тръгва.
baby	bábätko	Bábätko spí.	baba	A baba alszik.	bebeluș	Bebelușul doarme.	бебе	Бебето спи.
back	chrbát; späť	Bolí ma chrbát.	hát; vissza	Fáj a hátam.	spate; înapoi	Mă doare spatele.	гръб; обратно	Боли ме гърбът.
bad	zlý; pokazený	Toto mlieko je pokazené.	rossz; romlott	Ez a tej romlott.	rău; stricat	Acest lapte este stricat.	лош; развален	Това мляко е развалено.
bag	taška	Tvoja taška je na stoličke.	táska	A táskád a széken van.	geantă	Geanta ta este pe scaun.	чанта	Чантата ти е на стола.
ball	lopta	Lopta je pod stolom.	labda	A labda az asztal alatt van.	minge	Mingea este sub masă.	топка	Топката е под масата.
banana	banán	Jem banán.	banán	Banánt eszem.	banană	Mănânc o banană.	банан	Ям банан.
band	kapela	Kapela hrá hudbu.	zenekar	A zenekar zenél.	trupă; formație	Trupa cântă muzică.	група; банда	Групата свири музика.
bank (money)	banka	Banka sa otvára o deviatej.	bank	A bank kilenckor nyit.	bancă	Banca se deschide la nouă.	банка	Банката отваря в девет.
bath	kúpeľ	Večer sa kúpem.	fürdő	Este fürdőt veszek.	baie	Fac baie seara.	вана; баня	Вечер се къпя.
bathroom	kúpeľňa	Kúpeľňa je čistá.	fürdőszoba	A fürdőszoba tiszta.	baie	Baia este curată.	баня	Банята е чиста.
be	byť	Som šťastný.	lenni	Boldog vagyok.	a fi	Sunt fericit.	съм; бъда	Щастлив съм.
beach	pláž	Sedíme na pláži.	tengerpart; strand	A parton ülünk.	plajă	Stăm pe plajă.	плаж	Седим на плажа.
beautiful	krásny	Kvet je krásny.	szép	A virág szép.	frumos	Floarea este frumoasă.	красив	Цветето е красиво.
because	pretože; lebo	Zostávam doma, lebo som chorý.	mert	Otthon maradok, mert beteg vagyok.	pentru că	Stau acasă pentru că sunt bolnav.	защото	Оставам вкъщи, защото съм болен.
become	stať sa; zmeniť sa	Môže sa ochladiť.	válni; lenni valamivé	Hideggé válhat.	a deveni	Se poate face frig.	ставам	Може да стане студено.
bed	posteľ	Posteľ je veľká.	ágy	Az ágy nagy.	pat	Patul este mare.	легло	Леглото е голямо.
bedroom	spálňa	Moja spálňa je tichá.	hálószoba	A hálószobám csendes.	dormitor	Dormitorul meu este liniștit.	спалня	Спалнята ми е тиха.
beer	pivo	Pije pivo pri večeri.	sör	Vacsorához sört iszik.	bere	El bea bere la cină.	бира	Той пие бира с вечерята.
before	pred	Umy si ruky pred obedom.	előtt	Moss kezet ebéd előtt.	înainte	Spală-te pe mâini înainte de prânz.	преди	Измий си ръцете преди обяд.
begin	začať	Začni test teraz.	kezdeni	Kezdd el most a tesztet.	a începe	Începe testul acum.	започвам	Започни теста сега.
beginning	začiatok	Začiatok je ľahký.	kezdet	Az eleje könnyű.	început	Începutul este ușor.	начало	Началото е лесно.
behind	za	Mačka je za pohovkou.	mögött	A macska a kanapé mögött van.	în spatele	Pisica este în spatele canapelei.	зад	Котката е зад дивана.
believe	veriť	Verím ti.	hinni	Hiszek neked.	a crede	Te cred.	вярвам	Вярвам ти.
below	pod; nižšie	Meno je pod obrázkom.	alatt	A név a kép alatt van.	sub	Numele este sub poză.	под	Името е под снимката.
best	najlepší	Je moja najlepšia priateľka.	legjobb	Ő a legjobb barátom.	cel mai bun	Ea este cea mai bună prietenă a mea.	най-добър	Тя е най-добрата ми приятелка.
better	lepší	Dnes sa cítim lepšie.	jobb	Ma jobban érzem magam.	mai bun; mai bine	Astăzi mă simt mai bine.	по-добър; по-добре	Днес се чувствам по-добре.
between	medzi	Kaviareň je medzi dvoma obchodmi.	között	A kávézó két bolt között van.	între	Cafeneaua este între două magazine.	между	Кафенето е между два магазина.
bicycle	bicykel	Môj bicykel je modrý.	kerékpár	A kerékpárom kék.	bicicletă	Bicicleta mea este albastră.	велосипед	Велосипедът ми е син.
big	veľký	Táto škatuľa je veľká.	nagy	Ez a doboz nagy.	mare	Această cutie este mare.	голям	Тази кутия е голяма.
bike	bicykel	Jazdím na bicykli.	bicikli	Biciklizek.	bicicletă	Merg cu bicicleta.	колело	Карам колело.
bill	účet	Účet je na stole.	számla	A számla az asztalon van.	notă de plată	Nota este pe masă.	сметка	Сметката е на масата.
bird	vták	Vták je na strome.	madár	Egy madár van a fán.	pasăre	O pasăre este în copac.	птица	Птица е на дървото.
birthday	narodeniny	Dnes mám narodeniny.	születésnap	Ma van a születésnapom.	zi de naștere	Astăzi este ziua mea.	рожден ден	Днес е рожденият ми ден.
black	čierny	Moja taška je čierna.	fekete	A táskám fekete.	negru	Geanta mea este neagră.	черен	Чантата ми е черна.
blog	blog	Píše blog.	blog	Blogot ír.	blog	Ea scrie un blog.	блог	Тя пише блог.
blonde	blond; svetlovlasý	Má blond vlasy.	szőke	Szőke haja van.	blond	El are păr blond.	рус; русокос	Той има руса коса.
blue	modrý	Obloha je modrá.	kék	Az ég kék.	albastru	Cerul este albastru.	син	Небето е синьо.
boat	loď	Loď je na vode.	csónak; hajó	A hajó a vízen van.	barcă	Barca este pe apă.	лодка	Лодката е във водата.
body	telo	Moje telo je unavené.	test	A testem fáradt.	corp	Corpul meu este obosit.	тяло	Тялото ми е уморено.
book	kniha	Čítam knihu.	könyv	Könyvet olvasok.	carte	Citesc o carte.	книга	Чета книга.
boot	čižma	Jedna čižma je pod posteľou.	csizma	Egy csizma az ágy alatt van.	cizmă	O cizmă este sub pat.	ботуш	Един ботуш е под леглото.
bored	znudený; nudiť sa	Nudím sa.	unatkozó; unatkozik	Unatkozom.	plictisit	Sunt plictisit.	отегчен	Отегчен съм.
boring	nudný	Tento film je nudný.	unalmas	Ez a film unalmas.	plictisitor	Acest film este plictisitor.	скучен	Този филм е скучен.
born	narodený	Narodil som sa v máji.	született	Májusban születtem.	născut	M-am născut în mai.	роден	Роден съм през май.
both	oba; obe	Obe dievčatá sú šťastné.	mindkettő	Mindkét lány boldog.	amândoi; ambele	Ambele fete sunt fericite.	и двамата; и двете	И двете момичета са щастливи.
bottle	fľaša	Fľaša je plná.	palack	Az üveg tele van.	sticlă	Sticla este plină.	бутилка	Бутилката е пълна.
box	škatuľa; krabica	Škatuľa je otvorená.	doboz	A doboz nyitva van.	cutie	Cutia este deschisă.	кутия	Кутията е отворена.
boy	chlapec	Chlapec beží rýchlo.	fiú	A fiú gyorsan fut.	băiat	Băiatul aleargă repede.	момче	Момчето тича бързо.
boyfriend	priateľ	Jej priateľ je milý.	barát; fiúbarát	A barátja kedves.	iubit	Iubitul ei este amabil.	гадже; приятел	Нейният приятел е мил.
bread	chlieb	Chcem chlieb.	kenyér	Kenyeret kérek.	pâine	Vreau pâine.	хляб	Искам хляб.
break	rozbiť; zlomiť	Nerozbi tú šálku.	eltörni; megszakítani	Ne törd el a csészét.	a sparge; a rupe	Nu sparge cana.	чупя	Не чупи чашата.
breakfast	raňajky	Raňajky sú hotové.	reggeli	A reggeli kész.	mic dejun	Micul dejun este gata.	закуска	Закуската е готова.
bring	priniesť	Prines svoju knihu.	hozni	Hozd a könyvedet.	a aduce	Adu-ți cartea.	нося; донеса	Донеси книгата си.
brother	brat	Môj brat je vysoký.	testvér; báty; öcs	Az öcsém magas.	frate	Fratele meu este înalt.	брат	Брат ми е висок.
brown	hnedý	Pes je hnedý.	barna	A kutya barna.	maro	Câinele este maro.	кафяв	Кучето е кафяво.
build	stavať	Stavajú dom.	építeni	Házat építenek.	a construi	Ei construiesc o casă.	строя	Те строят къща.
building	budova	Táto budova je stará.	épület	Ez az épület régi.	clădire	Această clădire este veche.	сграда	Тази сграда е стара.
bus	autobus	Autobus mešká.	busz	A busz késik.	autobuz	Autobuzul întârzie.	автобус	Автобусът закъснява.
business	firma; podnik	Môj otec má firmu.	üzlet; vállalkozás	Apámnak van vállalkozása.	afacere	Tatăl meu are o afacere.	бизнес; фирма	Баща ми има бизнес.
busy	zaneprázdnený	Dnes som zaneprázdnený.	elfoglalt	Ma elfoglalt vagyok.	ocupat	Sunt ocupat astăzi.	зает	Днес съм зает.
but	ale	Mám rád čaj, ale nie kávu.	de	Szeretem a teát, de a kávét nem.	dar	Îmi place ceaiul, dar nu cafeaua.	но	Обичам чай, но не кафе.
butter	maslo	Daj maslo na chlieb.	vaj	Tegyél vajat a kenyérre.	unt	Pune unt pe pâine.	масло	Сложи масло на хляба.
buy	kúpiť	Kupujem mlieko.	venni	Tejet veszek.	a cumpăra	Cumpăr lapte.	купувам	Купувам мляко.
by	pri; od	Sadni si k oknu.	mellett; által	Ülj az ablak mellé.	lângă; de	Stai lângă fereastră.	до; от	Седни до прозореца.
bye	ahoj; dovidenia	Ahoj, uvidíme sa zajtra.	szia	Viszlát, holnap találkozunk.	pa	Pa, ne vedem mâine.	чао	Чао, до утре.
cafe	kaviareň	Stretneme sa v kaviarni.	kávézó	A kávézóban találkozunk.	cafenea	Ne întâlnim la cafenea.	кафене	Срещаме се в кафенето.
cake	koláč	Ten koláč je sladký.	torta; sütemény	A torta édes.	prăjitură; tort	Prăjitura este dulce.	торта; сладкиш	Тортата е сладка.
call	zavolať; volať	Zavolaj mi, prosím.	hívni	Kérlek, hívj fel.	a suna; a chema	Te rog, sună-mă.	обаждам се; наричам	Моля, обади ми се.
camera	fotoaparát	Môj fotoaparát je nový.	fényképezőgép	A fényképezőgépem új.	aparat foto	Camera mea este nouă.	фотоапарат; камера	Фотоапаратът ми е нов.
can1 modal	môcť; vedieť	Viem plávať.	tudni; bírni	Tudok úszni.	a putea	Știu să înot.	мога	Мога да плувам.
cannot	nemôcť	Dnes nemôžem prísť.	nem tud; nem lehet	Ma nem tudok jönni.	nu pot	Nu pot veni astăzi.	не мога	Не мога да дойда днес.
capital	hlavné mesto	Paríž je hlavné mesto.	főváros	Párizs főváros.	capitală	Parisul este o capitală.	столица	Париж е столица.
car	auto	Auto je červené.	autó	Az autó piros.	mașină	Mașina este roșie.	кола	Колата е червена.
card	karta; pohľadnica	Mám narodeninovú pohľadnicu.	kártya; lap	Van egy születésnapi lapom.	card; felicitare	Am o felicitare de ziua mea.	карта; картичка	Имам картичка за рожден ден.
career	kariéra	Chcem kariéru v umení.	karrier	Művészeti karriert szeretnék.	carieră	Vreau o carieră în artă.	кариера	Искам кариера в изкуството.
carrot	mrkva	Mrkva je oranžová.	sárgarépa	A sárgarépa narancssárga.	morcov	Morcovul este portocaliu.	морков	Морковът е оранжев.
carry	niesť	Nesiem svoju tašku.	vinni; cipelni	A táskámat viszem.	a purta; a căra	Îmi car geanta.	нося	Нося чантата си.
cat	mačka	Mačka spí.	macska	A macska alszik.	pisică	Pisica doarme.	котка	Котката спи.
CD	CD	Toto CD má hudbu.	CD	Ezen a CD-n zene van.	CD	Acest CD are muzică.	диск; CD	Този диск има музика.
cent	cent	Jeden cent je veľmi malý.	cent	Egy cent nagyon kicsi.	cent	Un cent este foarte mic.	цент	Един цент е много малък.
centre	centrum	Centrum mesta je rušné.	központ	A városközpont forgalmas.	centru	Centrul orașului este aglomerat.	център	Центърът на града е оживен.
century	storočie	Storočie má sto rokov.	évszázad	Egy évszázad száz év.	secol	Un secol are o sută de ani.	век	Един век е сто години.
chair	stolička	Sadni si na stoličku.	szék	Ülj a székre.	scaun	Stai pe scaun.	стол	Седни на стола.
change	zmeniť; vymeniť	Prezliekam sa.	változtatni; cserélni	Átöltözöm.	a schimba	Îmi schimb hainele.	сменям; променям	Сменям дрехите си.
chart	graf; tabuľka	Pozri sa na graf.	diagram; táblázat	Nézd meg a diagramot.	grafic; tabel	Uită-te la grafic.	диаграма; графика	Погледни диаграмата.
cheap	lacný	Táto košeľa je lacná.	olcsó	Ez az ing olcsó.	ieftin	Această cămașă este ieftină.	евтин	Тази риза е евтина.
check	skontrolovať	Skontroluj svoju odpoveď.	ellenőrizni	Ellenőrizd a válaszod.	a verifica	Verifică-ți răspunsul.	проверявам	Провери отговора си.
cheese	syr	Mám rád syr.	sajt	Szeretem a sajtot.	brânză	Îmi place brânza.	сирене	Обичам сирене.
chicken	kura; kurča	Na večeru jeme kurča.	csirke	Vacsorára csirkét eszünk.	pui	Mâncăm pui la cină.	пиле	Ядем пиле за вечеря.
child	dieťa	Dieťa je šťastné.	gyerek	A gyerek boldog.	copil	Copilul este fericit.	дете	Детето е щастливо.
chocolate	čokoláda	Čokoláda je sladká.	csokoládé	A csokoládé édes.	ciocolată	Ciocolata este dulce.	шоколад	Шоколадът е сладък.
choose	vybrať	Vyber jednu odpoveď.	választani	Válassz egy választ.	a alege	Alege un răspuns.	избирам	Избери един отговор.
cinema	kino	Ideme do kina.	mozi	Moziba megyünk.	cinema	Mergem la cinema.	кино	Отиваме на кино.
city	mesto	Mesto je veľké.	város	A város nagy.	oraș	Orașul este mare.	град	Градът е голям.
class	hodina; trieda	Hodina sa začína o deviatej.	óra; osztály	Az óra kilenckor kezdődik.	curs; clasă	Cursul începe la nouă.	час; клас	Часът започва в девет.
classroom	učebňa	Učebňa je tichá.	tanterem	A tanterem csendes.	sală de clasă	Sala de clasă este liniștită.	класна стая	Класната стая е тиха.
clean	čistý; čistiť	Izba je čistá.	tiszta; takarítani	A szoba tiszta.	curat; a curăța	Camera este curată.	чист; чистя	Стаята е чиста.
climb	liezť; vystúpiť	Vystupujú na kopec.	mászni	Felmásznak a dombra.	a urca	Ei urcă dealul.	катеря се	Те се катерят по хълма.
clock	hodiny	Hodiny sú na stene.	óra	Az óra a falon van.	ceas	Ceasul este pe perete.	часовник	Часовникът е на стената.
close1	zavrieť	Zavri dvere, prosím.	bezárni	Csukd be az ajtót, kérlek.	a închide	Închide ușa, te rog.	затварям	Затвори вратата, моля.
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
            if language == "BG" and (not CYRILLIC_RE.search(display) or not CYRILLIC_RE.search(example)):
                problems.append(f"{source_headword}/{language}: missing Cyrillic script")
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
    parser.add_argument("--batch-id", default="sk_hu_ro_bg_v1")
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
        "- Validation: exact source-row coverage, non-empty display/example cells, sentence punctuation, BG Cyrillic script",
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
