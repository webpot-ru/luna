#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_VERSION = "2026-05-17.v1"
LANGUAGES = ["HR", "SR", "SL", "LT"]
SENTENCE_END_RE = re.compile(r"[.!?。！？]$")
CYRILLIC_RE = re.compile(r"[\u0400-\u04FF]")


TRANSLATIONS_TSV = """source_headword	HR	example_HR	SR	example_SR	SL	example_SL	LT	example_LT
a, an	neodređeni član	Imam olovku.	неодређени члан	Имам оловку.	nedoločni člen	Imam pisalo.	nežymimasis artikelis	Turiu rašiklį.
about	o; oko	Razgovaramo o hrani.	о; око	Разговарамо о храни.	o; približno	Govorimo o hrani.	apie; maždaug	Kalbame apie maistą.
above	iznad	Sat je iznad vrata.	изнад	Сат је изнад врата.	nad	Ura je nad vrati.	virš	Laikrodis yra virš durų.
across	preko puta	Trgovina je preko puta ulice.	преко пута	Продавница је преко пута улице.	na drugi strani	Trgovina je na drugi strani ulice.	kitoje pusėje	Parduotuvė yra kitoje gatvės pusėje.
action	radnja; postupak	Njegov postupak mi pomaže.	радња; поступак	Његов поступак ми помаже.	dejanje; ukrep	Njegovo dejanje mi pomaga.	veiksmas; poelgis	Jo poelgis man padeda.
activity	aktivnost	Plivanje je zabavna aktivnost.	активност	Пливање је забавна активност.	dejavnost	Plavanje je zabavna dejavnost.	veikla	Plaukimas yra smagi veikla.
actor	glumac	Glumac je u filmu.	глумац	Глумац је у филму.	igralec	Igralec je v filmu.	aktorius	Aktorius yra filme.
actress	glumica	Glumica nam se smiješi.	глумица	Глумица нам се смеши.	igralka	Igralka se nam smehlja.	aktorė	Aktorė mums šypsosi.
add	dodati	Dodaj svoje ime ovdje.	додати	Додај своје име овде.	dodati	Dodaj svoje ime sem.	pridėti	Pridėk savo vardą čia.
address	adresa	Moja adresa je na ovoj kartici.	адреса	Моја адреса је на овој картици.	naslov	Moj naslov je na tej kartici.	adresas	Mano adresas yra šioje kortelėje.
adult	odrasla osoba	Odrasla osoba sjedi kraj vrata.	одрасла особа	Одрасла особа седи поред врата.	odrasla oseba	Odrasla oseba sedi pri vratih.	suaugęs žmogus	Suaugęs žmogus sėdi prie durų.
advice	savjet	Njezin savjet je jednostavan.	савет	Њен савет је једноставан.	nasvet	Njen nasvet je preprost.	patarimas	Jos patarimas paprastas.
afraid	uplašen; bojati se	Dijete se boji.	уплашен; бојати се	Дете се боји.	prestrašen; bati se	Otroka je strah.	išsigandęs; bijoti	Vaikas bijo.
after	nakon; poslije	Jedem nakon sata.	после; након	Једем после часа.	po	Jem po uri.	po	Valgau po pamokos.
afternoon	poslijepodne	Učim poslijepodne.	послеподне	Учим послеподне.	popoldne	Učim se popoldne.	popietė	Mokausi popiet.
again	opet; ponovno	Reci to ponovno, molim te.	опет; поново	Реци то поново, молим те.	spet; ponovno	Povej to še enkrat, prosim.	vėl	Pasakyk tai dar kartą, prašau.
age	dob; godine	Koliko imaš godina?	старост; године	Колико имаш година?	starost	Koliko si star?	amžius	Koks tavo amžius?
ago	prije	Došao sam ovamo prije dva dana.	пре	Дошао сам овде пре два дана.	pred	Sem sem prišel pred dvema dnevoma.	prieš	Atėjau čia prieš dvi dienas.
agree	složiti se	Slažem se s tobom.	сложити се	Слажем се с тобом.	strinjati se	Strinjam se s tabo.	sutikti	Sutinku su tavimi.
air	zrak	Zrak je hladan.	ваздух	Ваздух је хладан.	zrak	Zrak je hladen.	oras	Oras šaltas.
airport	zračna luka	Na zračnoj smo luci.	аеродром	На аеродрому смо.	letališče	Smo na letališču.	oro uostas	Esame oro uoste.
all	svi; sve	Svi učenici su ovdje.	сви; све	Сви ученици су овде.	vsi; vse	Vsi učenci so tukaj.	visi; viskas	Visi mokiniai yra čia.
also	također; i	Volim i čaj.	такође; и	Волим и чај.	tudi	Tudi čaj mi je všeč.	taip pat	Man taip pat patinka arbata.
always	uvijek	Ona uvijek pije vodu.	увек	Она увек пије воду.	vedno	Ona vedno pije vodo.	visada	Ji visada geria vandenį.
amazing	nevjerojatan	Pogled je nevjerojatan.	невероватан	Поглед је невероватан.	neverjeten	Razgled je neverjeten.	nuostabus	Vaizdas nuostabus.
and	i	Tom i Anna su prijatelji.	и	Том и Ана су пријатељи.	in	Tom in Ana sta prijatelja.	ir	Tomas ir Ana yra draugai.
angry	ljut	Sada je ljut.	љут	Сада је љут.	jezen	Zdaj je jezen.	piktas	Dabar jis piktas.
animal	životinja	Pas je životinja.	животиња	Пас је животиња.	žival	Pes je žival.	gyvūnas	Šuo yra gyvūnas.
another	drugi; još jedan	Želim još jednu šalicu.	други; још један	Желим још једну шољу.	drugi; še en	Želim še eno skodelico.	kitas; dar vienas	Noriu dar vieno puodelio.
answer	odgovor	Napiši odgovor ovdje.	одговор	Напиши одговор овде.	odgovor	Odgovor napiši sem.	atsakymas	Parašyk atsakymą čia.
any	bilo koji; nešto	Imaš li novca?	било који; нешто	Имаш ли новца?	kateri koli; nekaj	Imaš kaj denarja?	bet koks; kiek nors	Ar turi pinigų?
anyone	netko; bilo tko	Treba li netko pomoć?	неко; било ко	Да ли некоме треба помоћ?	kdo; kdor koli	Ali kdo potrebuje pomoč?	kas nors; bet kas	Ar kam nors reikia pagalbos?
anything	išta; bilo što	Ne vidim ništa.	ишта; било шта	Не видим ништа.	kaj; karkoli	Ničesar ne vidim.	kas nors; bet kas	Nieko nematau.
apartment	stan	Moj stan je malen.	стан	Мој стан је мали.	stanovanje	Moje stanovanje je majhno.	butas	Mano butas mažas.
apple	jabuka	Ova jabuka je crvena.	јабука	Ова јабука је црвена.	jabolko	To jabolko je rdeče.	obuolys	Šis obuolys raudonas.
April	travanj	Rođendan mi je u travnju.	април	Рођендан ми је у априлу.	april	Moj rojstni dan je aprila.	balandis	Mano gimtadienis yra balandį.
area	područje	Ovo područje je tiho.	подручје; област	Ово подручје је тихо.	območje	To območje je mirno.	sritis; rajonas	Ši vietovė rami.
arm	ruka	Boli me ruka.	рука	Боли ме рука.	roka	Boli me roka.	ranka	Man skauda ranką.
around	oko; uokolo	Šetamo po parku.	око; унаоколо	Шетамо по парку.	okoli	Sprehodimo se po parku.	aplink	Vaikštome po parką.
arrive	stići; doći	Stižu u šest.	стићи; доћи	Стижу у шест.	prispeti	Prispejo ob šestih.	atvykti	Jie atvyksta šeštą.
art	umjetnost	Volim umjetnost.	уметност	Волим уметност.	umetnost	Všeč mi je umetnost.	menas	Man patinka menas.
article	članak	Čitam članak na internetu.	чланак	Читам чланак на интернету.	članek	Na spletu berem članek.	straipsnis	Skaitau straipsnį internete.
artist	umjetnik	Umjetnik crta lice.	уметник	Уметник црта лице.	umetnik	Umetnik riše obraz.	menininkas	Menininkas piešia veidą.
as	kao	Radim kao učitelj.	као	Радим као учитељ.	kot	Delam kot učitelj.	kaip	Dirbu mokytoju.
ask	pitati; zamoliti	Pitaj učitelja sada.	питати; замолити	Питај учитеља сада.	vprašati; prositi	Zdaj vprašaj učitelja.	klausti; paprašyti	Paklausk mokytojo dabar.
at	u; kod	Kod kuće sam.	у; код	Код куће сам.	v; pri	Doma sem.	prie; namuose	Esu namuose.
August	kolovoz	Putujemo u kolovozu.	август	Путујемо у августу.	avgust	Potujemo avgusta.	rugpjūtis	Keliaujame rugpjūtį.
aunt	teta	Moja teta živi ovdje.	тетка	Моја тетка живи овде.	teta	Moja teta živi tukaj.	teta	Mano teta gyvena čia.
autumn	jesen	Lišće pada u jesen.	јесен	Лишће пада у јесен.	jesen	Listje pada jeseni.	ruduo	Lapai krenta rudenį.
away	daleko; odlaziti	Autobus odlazi.	далеко; одлазити	Аутобус одлази.	stran	Avtobus odpelje stran.	šalin; tolyn	Autobusas nuvažiuoja.
baby	beba	Beba spava.	беба	Беба спава.	dojenček	Dojenček spi.	kūdikis	Kūdikis miega.
back	leđa; natrag	Bole me leđa.	леђа; назад	Боле ме леђа.	hrbet; nazaj	Boli me hrbet.	nugara; atgal	Man skauda nugarą.
bad	loš; pokvaren	Ovo mlijeko je pokvareno.	лош; покварен	Ово млеко је покварено.	slab; pokvarjen	To mleko je pokvarjeno.	blogas; sugedęs	Šis pienas sugedęs.
bag	torba	Tvoja torba je na stolici.	торба	Твоја торба је на столици.	torba	Tvoja torba je na stolu.	krepšys	Tavo krepšys yra ant kėdės.
ball	lopta	Lopta je ispod stola.	лопта	Лопта је испод стола.	žoga	Žoga je pod mizo.	kamuolys	Kamuolys yra po stalu.
banana	banana	Jedem bananu.	банана	Једем банану.	banana	Jem banano.	bananas	Valgau bananą.
band	bend; grupa	Bend svira glazbu.	бенд; група	Бенд свира музику.	skupina	Skupina igra glasbo.	grupė	Grupė groja muziką.
bank (money)	banka	Banka se otvara u devet.	банка	Банка се отвара у девет.	banka	Banka se odpre ob devetih.	bankas	Bankas atsidaro devintą.
bath	kupka	Navečer se kupam.	купање; купка	Увече се купам.	kopel	Zvečer se kopam.	vonia	Vakare maudausi vonioje.
bathroom	kupaonica	Kupaonica je čista.	купатило	Купатило је чисто.	kopalnica	Kopalnica je čista.	vonios kambarys	Vonios kambarys švarus.
be	biti	Sretan sam.	бити	Срећан сам.	biti	Srečen sem.	būti	Esu laimingas.
beach	plaža	Sjedimo na plaži.	плажа	Седимо на плажи.	plaža	Sedimo na plaži.	paplūdimys	Sėdime paplūdimyje.
beautiful	lijep	Cvijet je lijep.	леп	Цвет је леп.	lep	Cvet je lep.	gražus	Gėlė graži.
because	jer	Ostajem doma jer sam bolestan.	јер	Остајем код куће јер сам болестан.	ker	Ostajam doma, ker sem bolan.	nes	Lieku namuose, nes sergu.
become	postati	Može postati hladno.	постати	Може постати хладно.	postati	Lahko postane hladno.	tapti	Gali pasidaryti šalta.
bed	krevet	Krevet je velik.	кревет	Кревет је велики.	postelja	Postelja je velika.	lova	Lova didelė.
bedroom	spavaća soba	Moja spavaća soba je tiha.	спаваћа соба	Моја спаваћа соба је тиха.	spalnica	Moja spalnica je tiha.	miegamasis	Mano miegamasis tylus.
beer	pivo	On pije pivo uz večeru.	пиво	Он пије пиво уз вечеру.	pivo	Ob večerji pije pivo.	alus	Jis geria alų prie vakarienės.
before	prije	Operi ruke prije ručka.	пре	Оперите руке пре ручка.	pred	Umij si roke pred kosilom.	prieš	Nusiplauk rankas prieš pietus.
begin	početi	Počnite test sada.	почети	Почни тест сада.	začeti	Zdaj začni test.	pradėti	Pradėk testą dabar.
beginning	početak	Početak je lagan.	почетак	Почетак је лак.	začetek	Začetek je lahek.	pradžia	Pradžia lengva.
behind	iza	Mačka je iza sofe.	иза	Мачка је иза софе.	za	Mačka je za kavčem.	už	Katė yra už sofos.
believe	vjerovati	Vjerujem ti.	веровати	Верујем ти.	verjeti	Verjamem ti.	tikėti	Tikiu tavimi.
below	ispod	Ime je ispod slike.	испод	Име је испод слике.	pod	Ime je pod sliko.	žemiau; po	Vardas yra po paveikslėliu.
best	najbolji	Ona je moja najbolja prijateljica.	најбољи	Она је моја најбоља пријатељица.	najboljši	Ona je moja najboljša prijateljica.	geriausias	Ji yra mano geriausia draugė.
better	bolji; bolje	Danas se osjećam bolje.	бољи; боље	Данас се осећам боље.	boljši; bolje	Danes se počutim bolje.	geresnis; geriau	Šiandien jaučiuosi geriau.
between	između	Kafić je između dvije trgovine.	између	Кафић је између две продавнице.	med	Kavarna je med dvema trgovinama.	tarp	Kavinė yra tarp dviejų parduotuvių.
bicycle	bicikl	Moj bicikl je plav.	бицикл	Мој бицикл је плав.	kolo	Moje kolo je modro.	dviratis	Mano dviratis mėlynas.
big	velik	Ova kutija je velika.	велики	Ова кутија је велика.	velik	Ta škatla je velika.	didelis	Ši dėžė didelė.
bike	bicikl	Vozim bicikl.	бицикл	Возим бицикл.	kolo	Vozim kolo.	dviratis	Važiuoju dviračiu.
bill	račun	Račun je na stolu.	рачун	Рачун је на столу.	račun	Račun je na mizi.	sąskaita	Sąskaita yra ant stalo.
bird	ptica	Ptica je na drvetu.	птица	Птица је на дрвету.	ptica	Ptica je na drevesu.	paukštis	Paukštis yra medyje.
birthday	rođendan	Danas mi je rođendan.	рођендан	Данас ми је рођендан.	rojstni dan	Danes imam rojstni dan.	gimtadienis	Šiandien mano gimtadienis.
black	crn	Moja torba je crna.	црн	Моја торба је црна.	črn	Moja torba je črna.	juodas	Mano krepšys juodas.
blog	blog	Ona piše blog.	блог	Она пише блог.	blog	Piše blog.	tinklaraštis	Ji rašo tinklaraštį.
blonde	plavokos; plav	Ima plavu kosu.	плавокос; плав	Има плаву косу.	blond; svetlolas	Ima svetle lase.	šviesiaplaukis	Jis turi šviesius plaukus.
blue	plav	Nebo je plavo.	плав	Небо је плаво.	moder	Nebo je modro.	mėlynas	Dangus mėlynas.
boat	brod; čamac	Brod je na vodi.	брод; чамац	Брод је на води.	čoln	Čoln je na vodi.	valtis	Valtis yra ant vandens.
body	tijelo	Moje tijelo je umorno.	тело	Моје тело је уморно.	telo	Moje telo je utrujeno.	kūnas	Mano kūnas pavargęs.
book	knjiga	Čitam knjigu.	књига	Читам књигу.	knjiga	Berem knjigo.	knyga	Skaitau knygą.
boot	čizma	Jedna čizma je ispod kreveta.	чизма	Једна чизма је испод кревета.	škorenj	En škorenj je pod posteljo.	batas	Vienas batas yra po lova.
bored	dosadno; dosađivati se	Dosadno mi je.	досадно; досађивати се	Досадно ми је.	dolgčas	Dolgčas mi je.	nuobodžiaujantis	Man nuobodu.
boring	dosadan	Ovaj film je dosadan.	досадан	Овај филм је досадан.	dolgočasen	Ta film je dolgočasen.	nuobodus	Šis filmas nuobodus.
born	rođen	Rođen sam u svibnju.	рођен	Рођен сам у мају.	rojen	Rodil sem se maja.	gimęs	Gimiau gegužę.
both	oba; obje	Obje djevojke su sretne.	оба; обе	Обе девојке су срећне.	oba; obe	Obe dekleti sta srečni.	abu; abi	Abi mergaitės laimingos.
bottle	boca	Boca je puna.	боца; флаша	Флаша је пуна.	steklenica	Steklenica je polna.	butelis	Butelis pilnas.
box	kutija	Kutija je otvorena.	кутија	Кутија је отворена.	škatla	Škatla je odprta.	dėžė	Dėžė atidaryta.
boy	dječak	Dječak brzo trči.	дечак	Дечак брзо трчи.	fant	Fant hitro teče.	berniukas	Berniukas greitai bėga.
boyfriend	dečko	Njezin dečko je ljubazan.	дечко	Њен дечко је љубазан.	fant	Njen fant je prijazen.	vaikinas	Jos vaikinas malonus.
bread	kruh	Želim kruh.	хлеб	Желим хлеб.	kruh	Želim kruh.	duona	Noriu duonos.
break	razbiti; slomiti	Nemoj razbiti šalicu.	разбити; сломити	Немој разбити шољу.	razbiti; zlomiti	Ne razbij skodelice.	sudaužyti; sulaužyti	Nesudaužyk puodelio.
breakfast	doručak	Doručak je spreman.	доручак	Доручак је спреман.	zajtrk	Zajtrk je pripravljen.	pusryčiai	Pusryčiai paruošti.
bring	donijeti	Donesi svoju knjigu.	донети	Донеси своју књигу.	prinesti	Prinesi svojo knjigo.	atnešti	Atsinešk savo knygą.
brother	brat	Moj brat je visok.	брат	Мој брат је висок.	brat	Moj brat je visok.	brolis	Mano brolis aukštas.
brown	smeđ	Pas je smeđ.	браон; смеђ	Пас је браон.	rjav	Pes je rjav.	rudas	Šuo rudas.
build	graditi	Oni grade kuću.	градити	Они граде кућу.	graditi	Gradijo hišo.	statyti	Jie stato namą.
building	zgrada	Ova zgrada je stara.	зграда	Ова зграда је стара.	stavba	Ta stavba je stara.	pastatas	Šis pastatas senas.
bus	autobus	Autobus kasni.	аутобус	Аутобус касни.	avtobus	Avtobus zamuja.	autobusas	Autobusas vėluoja.
business	posao; poduzeće	Moj otac ima poduzeće.	посао; предузеће	Мој отац има предузеће.	posel; podjetje	Moj oče ima podjetje.	verslas	Mano tėvas turi verslą.
busy	zauzet	Danas sam zauzet.	заузет	Данас сам заузет.	zaseden; zaposlen	Danes sem zaposlen.	užsiėmęs	Šiandien esu užsiėmęs.
but	ali	Volim čaj, ali ne kavu.	али	Волим чај, али не кафу.	ampak	Rad imam čaj, ampak ne kave.	bet	Mėgstu arbatą, bet ne kavą.
butter	maslac	Stavi maslac na kruh.	маслац	Стави маслац на хлеб.	maslo	Daj maslo na kruh.	sviestas	Užtepk sviesto ant duonos.
buy	kupiti	Kupujem mlijeko.	купити	Купујем млеко.	kupiti	Kupujem mleko.	pirkti	Perku pieną.
by	kraj; od	Sjedni kraj prozora.	поред; од	Седи поред прозора.	pri; ob	Sedi ob oknu.	prie; pagal	Sėsk prie lango.
bye	bok; doviđenja	Bok, vidimo se sutra.	ћао; довиђења	Ћао, видимо се сутра.	adijo	Adijo, se vidimo jutri.	viso gero	Iki, pasimatysime rytoj.
cafe	kafić	Nalazimo se u kafiću.	кафић	Налазимо се у кафићу.	kavarna	Dobimo se v kavarni.	kavinė	Susitinkame kavinėje.
cake	torta; kolač	Torta je slatka.	торта; колач	Торта је слатка.	torta; kolač	Torta je sladka.	tortas; pyragas	Tortas saldus.
call	nazvati; zvati	Nazovi me, molim te.	позвати; звати	Позови ме, молим те.	poklicati; imenovati	Pokliči me, prosim.	skambinti; vadinti	Paskambink man, prašau.
camera	fotoaparat	Moj fotoaparat je nov.	фотоапарат; камера	Мој фотоапарат је нов.	fotoaparat	Moj fotoaparat je nov.	fotoaparatas	Mano fotoaparatas naujas.
can1 modal	moći; znati	Znam plivati.	моћи; знати	Знам да пливам.	moči; znati	Znam plavati.	galėti; mokėti	Moku plaukti.
cannot	ne moći	Danas ne mogu doći.	не моћи	Данас не могу да дођем.	ne moči	Danes ne morem priti.	negalėti	Šiandien negaliu ateiti.
capital	glavni grad	Pariz je glavni grad.	главни град	Париз је главни град.	glavno mesto	Pariz je glavno mesto.	sostinė	Paryžius yra sostinė.
car	auto	Auto je crven.	ауто	Ауто је црвен.	avto	Avto je rdeč.	automobilis	Automobilis raudonas.
card	kartica; čestitka	Imam rođendansku čestitku.	картица; честитка	Имам рођенданску честитку.	kartica; voščilnica	Imam rojstnodnevno voščilnico.	kortelė; atvirukas	Turiu gimtadienio atviruką.
career	karijera	Želim karijeru u umjetnosti.	каријера	Желим каријеру у уметности.	kariera	Želim kariero v umetnosti.	karjera	Noriu karjeros mene.
carrot	mrkva	Mrkva je narančasta.	шаргарепа	Шаргарепа је наранџаста.	korenje	Korenje je oranžno.	morka	Morka oranžinė.
carry	nositi	Nosim svoju torbu.	носити	Носим своју торбу.	nositi	Nosim svojo torbo.	nešti	Nešu savo krepšį.
cat	mačka	Mačka spava.	мачка	Мачка спава.	mačka	Mačka spi.	katė	Katė miega.
CD	CD; disk	Ovaj disk ima glazbu.	диск; CD	Овај диск има музику.	CD; disk	Ta disk ima glasbo.	CD; diskas	Šiame diske yra muzikos.
cent	cent	Jedan cent je vrlo malen.	цент	Један цент је веома мали.	cent	En cent je zelo majhen.	centas	Vienas centas labai mažas.
centre	središte	Središte grada je prometno.	центар	Центар града је прометан.	središče	Središče mesta je živahno.	centras	Miesto centras judrus.
century	stoljeće	Stoljeće ima sto godina.	век	Век има сто година.	stoletje	Stoletje ima sto let.	amžius	Amžius yra šimtas metų.
chair	stolica	Sjedni na stolicu.	столица	Седи на столицу.	stol	Sedi na stol.	kėdė	Sėsk ant kėdės.
change	promijeniti; presvući	Presvlačim se.	променити; пресвући	Пресвлачим се.	spremeniti; preobleči se	Preoblečem se.	keisti; persirengti	Persirengiu.
chart	grafikon	Pogledaj grafikon.	графикон; табела	Погледај графикон.	graf; tabela	Poglej graf.	diagrama	Pažiūrėk į diagramą.
cheap	jeftin	Ova košulja je jeftina.	јефтин	Ова кошуља је јефтина.	poceni	Ta srajca je poceni.	pigus	Šie marškiniai pigūs.
check	provjeriti	Provjeri svoj odgovor.	проверити	Провери свој одговор.	preveriti	Preveri svoj odgovor.	patikrinti	Patikrink savo atsakymą.
cheese	sir	Volim sir.	сир	Волим сир.	sir	Rad imam sir.	sūris	Mėgstu sūrį.
chicken	piletina; kokoš	Za večeru jedemo piletinu.	пилетина; пиле	За вечеру једемо пилетину.	piščanec	Za večerjo jemo piščanca.	vištiena	Vakarienei valgome vištieną.
child	dijete	Dijete je sretno.	дете	Дете је срећно.	otrok	Otroka je vesel.	vaikas	Vaikas laimingas.
chocolate	čokolada	Čokolada je slatka.	чоколада	Чоколада је слатка.	čokolada	Čokolada je sladka.	šokoladas	Šokoladas saldus.
choose	izabrati	Izaberi jedan odgovor.	изабрати	Изабери један одговор.	izbrati	Izberi en odgovor.	pasirinkti	Pasirink vieną atsakymą.
cinema	kino	Idemo u kino.	биоскоп	Идемо у биоскоп.	kino	Gremo v kino.	kinas	Einame į kiną.
city	grad	Grad je velik.	град	Град је велики.	mesto	Mesto je veliko.	miestas	Miestas didelis.
class	sat; razred	Sat počinje u devet.	час; разред	Час почиње у девет.	ura; razred	Pouk se začne ob devetih.	pamoka; klasė	Pamoka prasideda devintą.
classroom	učionica	Učionica je tiha.	учионица	Учионица је тиха.	učilnica	Učilnica je tiha.	klasė; auditorija	Klasė tyli.
clean	čist; čistiti	Soba je čista.	чист; чистити	Соба је чиста.	čist; čistiti	Soba je čista.	švarus; valyti	Kambarys švarus.
climb	penjati se	Oni se penju na brdo.	пењати се	Они се пењу на брдо.	plezati	Plezajo na hrib.	kopti; lipti	Jie kopia į kalvą.
clock	sat	Sat je na zidu.	сат	Сат је на зиду.	ura	Ura je na steni.	laikrodis	Laikrodis yra ant sienos.
close1	zatvoriti	Zatvori vrata, molim te.	затворити	Затвори врата, молим те.	zapreti	Zapri vrata, prosim.	uždaryti	Uždaryk duris, prašau.
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
            if language == "SR" and (not CYRILLIC_RE.search(display) or not CYRILLIC_RE.search(example)):
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
    parser.add_argument("--batch-id", default="hr_sr_sl_lt_v1")
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
        "- Validation: exact source-row coverage, non-empty display/example cells, sentence punctuation, SR Cyrillic script",
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
