#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_VERSION = "2026-05-17.v1"
LANGUAGES = ["LV", "ET", "IS", "HI"]
SENTENCE_END_RE = re.compile(r"[.!?।。！？]$")
DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")


TRANSLATIONS_TSV = """source_headword	LV	example_LV	ET	example_ET	IS	example_IS	HI	example_HI
a, an	nenoteiktais artikuls	Man ir pildspalva.	umbmäärane artikkel	Mul on pastakas.	óákveðinn greinir	Ég er með penna.	अनिश्चित आर्टिकल	मेरे पास एक कलम है।
about	par; apmēram	Mēs runājam par ēdienu.	kohta; umbes	Me räägime toidust.	um; um það bil	Við tölum um mat.	के बारे में; लगभग	हम खाने के बारे में बात करते हैं।
above	virs	Pulkstenis ir virs durvīm.	üleval; kohal	Kell on ukse kohal.	fyrir ofan	Klukkan er fyrir ofan dyrnar.	ऊपर	घड़ी दरवाज़े के ऊपर है।
across	otrā pusē	Veikals ir ielas otrā pusē.	teisel pool	Pood on üle tänava.	hinum megin	Búðin er hinum megin við götuna.	के पार; दूसरी तरफ़	दुकान सड़क के उस पार है।
action	darbība; rīcība	Viņa rīcība man palīdz.	tegu; tegevus	Tema tegu aitab mind.	aðgerð; verk	Athöfn hans hjálpar mér.	क्रिया; काम	उसका काम मेरी मदद करता है।
activity	aktivitāte; nodarbe	Peldēšana ir jautra nodarbe.	tegevus	Ujumine on lõbus tegevus.	athöfn; virkni	Sund er skemmtileg virkni.	गतिविधि	तैरना मज़ेदार गतिविधि है।
actor	aktieris	Aktieris ir filmā.	näitleja	Näitleja on filmis.	leikari	Leikarinn er í kvikmynd.	अभिनेता	अभिनेता एक फ़िल्म में है।
actress	aktrise	Aktrise mums smaida.	näitlejanna	Näitlejanna naeratab meile.	leikkona	Leikkonan brosir til okkar.	अभिनेत्री	अभिनेत्री हमें मुस्कुराती है।
add	pievienot	Pievieno šeit savu vārdu.	lisama	Lisa oma nimi siia.	bæta við	Bættu nafninu þínu við hér.	जोड़ना	अपना नाम यहाँ जोड़ो।
address	adrese	Mana adrese ir uz šīs kartītes.	aadress	Minu aadress on sellel kaardil.	heimilisfang	Heimilisfangið mitt er á þessu korti.	पता	मेरा पता इस कार्ड पर है।
adult	pieaugušais	Pieaugušais sēž pie durvīm.	täiskasvanu	Täiskasvanu istub ukse juures.	fullorðinn	Fullorðinn situr við dyrnar.	वयस्क	एक वयस्क दरवाज़े के पास बैठा है।
advice	padoms	Viņas padoms ir vienkāršs.	nõuanne	Tema nõuanne on lihtne.	ráð	Ráð hennar er einfalt.	सलाह	उसकी सलाह सरल है।
afraid	nobijies; baidīties	Bērns baidās.	kartma; hirmul	Laps kardab.	hræddur; óttast	Barnið er hrætt.	डरा हुआ; डरना	बच्चा डर रहा है।
after	pēc	Es ēdu pēc stundas.	pärast	Ma söön pärast tundi.	eftir	Ég borða eftir tímann.	के बाद	मैं कक्षा के बाद खाता हूँ।
afternoon	pēcpusdiena	Es mācos pēcpusdienā.	pärastlõuna	Ma õpin pärastlõunal.	síðdegi	Ég læri síðdegis.	दोपहर बाद	मैं दोपहर बाद पढ़ता हूँ।
again	atkal; vēlreiz	Lūdzu, pasaki to vēlreiz.	jälle; uuesti	Palun ütle seda uuesti.	aftur	Segðu það aftur, vinsamlegast.	फिर; दोबारा	कृपया इसे फिर से कहो।
age	vecums	Cik tev ir gadu?	vanus	Kui vana sa oled?	aldur	Hvað ertu gamall?	उम्र	तुम्हारी उम्र क्या है?
ago	pirms	Es atnācu šeit pirms divām dienām.	tagasi	Ma tulin siia kaks päeva tagasi.	fyrir	Ég kom hingað fyrir tveimur dögum.	पहले	मैं दो दिन पहले यहाँ आया था।
agree	piekrist	Es tev piekrītu.	nõustuma	Ma nõustun sinuga.	sammála	Ég er sammála þér.	सहमत होना	मैं तुमसे सहमत हूँ।
air	gaiss	Gaiss ir auksts.	õhk	Õhk on külm.	loft	Loftið er kalt.	हवा	हवा ठंडी है।
airport	lidosta	Mēs esam lidostā.	lennujaam	Me oleme lennujaamas.	flughöfn	Við erum á flugvellinum.	हवाई अड्डा	हम हवाई अड्डे पर हैं।
all	visi; viss	Visi skolēni ir šeit.	kõik	Kõik õpilased on siin.	allir; allt	Allir nemendur eru hér.	सभी; सब	सभी विद्यार्थी यहाँ हैं।
also	arī	Man arī patīk tēja.	ka; samuti	Mulle meeldib ka tee.	líka	Mér líkar líka te.	भी	मुझे भी चाय पसंद है।
always	vienmēr	Viņa vienmēr dzer ūdeni.	alati	Ta joob alati vett.	alltaf	Hún drekkur alltaf vatn.	हमेशा	वह हमेशा पानी पीती है।
amazing	apbrīnojams	Skats ir apbrīnojams.	hämmastav	Vaade on hämmastav.	ótrúlegur	Útsýnið er ótrúlegt.	अद्भुत	दृश्य अद्भुत है।
and	un	Toms un Anna ir draugi.	ja	Tom ja Anna on sõbrad.	og	Tom og Anna eru vinir.	और	टॉम और अन्ना दोस्त हैं।
angry	dusmīgs	Viņš tagad ir dusmīgs.	vihane	Ta on nüüd vihane.	reiður	Hann er reiður núna.	गुस्से में	वह अभी गुस्से में है।
animal	dzīvnieks	Suns ir dzīvnieks.	loom	Koer on loom.	dýr	Hundur er dýr.	जानवर	कुत्ता एक जानवर है।
another	cits; vēl viens	Es gribu vēl vienu krūzi.	teine; veel üks	Ma tahan veel ühte tassi.	annar; enn einn	Ég vil annan bolla.	दूसरा; एक और	मुझे एक और कप चाहिए।
answer	atbilde	Raksti atbildi šeit.	vastus	Kirjuta vastus siia.	svar	Skrifaðu svarið hér.	उत्तर; जवाब	उत्तर यहाँ लिखो।
any	jebkurš; kāds	Vai tev ir nauda?	mõni; ükskõik milline	Kas sul on raha?	einhver; nokkur	Áttu einhvern pening?	कोई; कुछ	क्या तुम्हारे पास पैसे हैं?
anyone	kāds; jebkurš	Vai kādam vajag palīdzību?	keegi; ükskõik kes	Kas keegi vajab abi?	einhver; hver sem er	Þarf einhver hjálp?	कोई भी; कोई	क्या किसी को मदद चाहिए?
anything	kaut kas; jebkas	Es neko neredzu.	midagi; ükskõik mida	Ma ei näe midagi.	eitthvað; hvað sem er	Ég sé ekkert.	कुछ भी	मुझे कुछ भी नहीं दिखता।
apartment	dzīvoklis	Mans dzīvoklis ir mazs.	korter	Minu korter on väike.	íbúð	Íbúðin mín er lítil.	अपार्टमेंट	मेरा अपार्टमेंट छोटा है।
apple	ābols	Šis ābols ir sarkans.	õun	See õun on punane.	epli	Þetta epli er rautt.	सेब	यह सेब लाल है।
April	aprīlis	Mana dzimšanas diena ir aprīlī.	aprill	Mu sünnipäev on aprillis.	apríl	Afmælið mitt er í apríl.	अप्रैल	मेरा जन्मदिन अप्रैल में है।
area	apgabals; rajons	Šis rajons ir kluss.	ala; piirkond	See piirkond on vaikne.	svæði	Þetta svæði er rólegt.	क्षेत्र; इलाका	यह इलाका शांत है।
arm	roka	Man sāp roka.	käs	Mu käsi valutab.	handleggur	Handleggurinn minn verkjar.	बांह	मेरी बांह दुख रही है।
around	ap; apkārt	Mēs pastaigājamies pa parku.	ümber; ringi	Me kõnnime pargis ringi.	í kringum; um	Við göngum um garðinn.	चारों ओर; आसपास	हम पार्क के आसपास चलते हैं।
arrive	ierasties	Viņi ierodas sešos.	saabuma	Nad saabuvad kell kuus.	koma; mæta	Þau koma klukkan sex.	पहुँचना	वे छह बजे पहुँचते हैं।
art	māksla	Man patīk māksla.	kunst	Mulle meeldib kunst.	list	Mér líkar list.	कला	मुझे कला पसंद है।
article	raksts	Es lasu rakstu internetā.	artikkel	Ma loen artiklit veebis.	grein	Ég les grein á netinu.	लेख	मैं ऑनलाइन एक लेख पढ़ता हूँ।
artist	mākslinieks	Mākslinieks zīmē seju.	kunstnik	Kunstnik joonistab nägu.	listamaður	Listamaðurinn teiknar andlit.	कलाकार	कलाकार चेहरा बनाता है।
as	kā	Es strādāju par skolotāju.	kui; nagu	Ma töötan õpetajana.	sem	Ég vinn sem kennari.	के रूप में; जैसे	मैं शिक्षक के रूप में काम करता हूँ।
ask	jautāt; lūgt	Pajautā skolotājam tagad.	küsima; paluma	Küsi nüüd õpetajalt.	spyrja; biðja	Spurðu kennarann núna.	पूछना; कहना	अब शिक्षक से पूछो।
at	pie; vietā	Es esmu mājās.	juures; kohas	Ma olen kodus.	við; í	Ég er heima.	पर; में	मैं घर पर हूँ।
August	augusts	Mēs ceļojam augustā.	august	Me reisime augustis.	ágúst	Við ferðumst í ágúst.	अगस्त	हम अगस्त में यात्रा करते हैं।
aunt	tante	Mana tante dzīvo šeit.	tädi	Mu tädi elab siin.	frænka	Frænka mín býr hér.	चाची; मौसी	मेरी चाची यहाँ रहती है।
autumn	rudens	Lapas krīt rudenī.	sügis	Lehed langevad sügisel.	haust	Lauf falla á haustin.	पतझड़; शरद ऋतु	पतझड़ में पत्ते गिरते हैं।
away	prom	Autobuss brauc prom.	ära	Buss sõidab ära.	burt; í burtu	Strætó fer í burtu.	दूर; चला जाना	बस चली जाती है।
baby	mazulis	Mazulis guļ.	beebi	Beebi magab.	ungabarn	Ungabarnið sefur.	शिशु	शिशु सो रहा है।
back	mugura; atpakaļ	Man sāp mugura.	selg; tagasi	Mu selg valutab.	bak; aftur	Bakið mitt verkjar.	पीठ; वापस	मेरी पीठ दुख रही है।
bad	slikts; sabojājies	Šis piens ir sabojājies.	halb; riknenud	See piim on halvaks läinud.	vondur; skemmdur	Þessi mjólk er skemmd.	बुरा; खराब	यह दूध खराब है।
bag	soma	Tava soma ir uz krēsla.	kott	Sinu kott on toolil.	taska	Taskan þín er á stólnum.	बैग	तुम्हारा बैग कुर्सी पर है।
ball	bumba	Bumba ir zem galda.	pall	Pall on laua all.	bolti	Boltinn er undir borðinu.	गेंद	गेंद मेज़ के नीचे है।
banana	banāns	Es ēdu banānu.	banaan	Ma söön banaani.	banani	Ég borða banana.	केला	मैं केला खाता हूँ।
band	grupa	Grupa spēlē mūziku.	bänd	Bänd mängib muusikat.	hljómsveit	Hljómsveitin spilar tónlist.	बैंड; समूह	बैंड संगीत बजाता है।
bank (money)	banka	Banka atveras deviņos.	pank	Pank avatakse kell üheksa.	banki	Bankinn opnar klukkan níu.	बैंक	बैंक नौ बजे खुलता है।
bath	vanna	Es vakarā eju vannā.	vann	Ma käin õhtul vannis.	bað	Ég fer í bað á kvöldin.	स्नान; नहाना	मैं रात में नहाता हूँ।
bathroom	vannas istaba	Vannas istaba ir tīra.	vannituba	Vannituba on puhas.	baðherbergi	Baðherbergið er hreint.	बाथरूम	बाथरूम साफ़ है।
be	būt	Es esmu laimīgs.	olema	Ma olen õnnelik.	vera	Ég er ánægður.	होना	मैं खुश हूँ।
beach	pludmale	Mēs sēžam pludmalē.	rand	Me istume rannas.	strönd	Við sitjum á ströndinni.	समुद्र तट	हम समुद्र तट पर बैठे हैं।
beautiful	skaists	Zieds ir skaists.	ilus	Lill on ilus.	fallegur	Blómið er fallegt.	सुंदर	फूल सुंदर है।
because	jo	Es palieku mājās, jo esmu slims.	sest	Ma jään koju, sest olen haige.	af því að	Ég verð heima af því að ég er veikur.	क्योंकि	मैं घर पर रहता हूँ क्योंकि मैं बीमार हूँ।
become	kļūt	Var kļūt auksts.	saama; muutuma	Võib külmaks minna.	verða	Það getur orðið kalt.	बनना; हो जाना	यह ठंडा हो सकता है।
bed	gulta	Gulta ir liela.	voodi	Voodi on suur.	rúm	Rúmið er stórt.	बिस्तर	बिस्तर बड़ा है।
bedroom	guļamistaba	Mana guļamistaba ir klusa.	magamistuba	Minu magamistuba on vaikne.	svefnherbergi	Svefnherbergið mitt er hljótt.	शयनकक्ष	मेरा शयनकक्ष शांत है।
beer	alus	Viņš dzer alu pie vakariņām.	õlu	Ta joob õhtusöögi kõrvale õlut.	bjór	Hann drekkur bjór með kvöldmatnum.	बीयर	वह रात के खाने के साथ बीयर पीता है।
before	pirms	Nomazgā rokas pirms pusdienām.	enne	Pese käed enne lõunat.	áður en	Þvoðu hendurnar fyrir hádegismat.	से पहले	दोपहर के खाने से पहले हाथ धोओ।
begin	sākt	Sāc testu tagad.	alustama	Alusta testi nüüd.	byrja	Byrjaðu prófið núna.	शुरू करना	परीक्षा अब शुरू करो।
beginning	sākums	Sākums ir viegls.	algus	Algus on lihtne.	byrjun	Byrjunin er auðveld.	शुरुआत	शुरुआत आसान है।
behind	aiz	Kaķis ir aiz dīvāna.	taga	Kass on diivani taga.	á bak við	Kötturinn er á bak við sófann.	पीछे	बिल्ली सोफ़े के पीछे है।
believe	ticēt	Es tev ticu.	uskuma	Ma usun sind.	trúa	Ég trúi þér.	विश्वास करना	मैं तुम पर विश्वास करता हूँ।
below	zem	Vārds ir zem attēla.	all	Nimi on pildi all.	fyrir neðan	Nafnið er fyrir neðan myndina.	नीचे	नाम तस्वीर के नीचे है।
best	labākais	Viņa ir mana labākā draudzene.	parim	Ta on mu parim sõber.	bestur	Hún er besti vinur minn.	सबसे अच्छा	वह मेरी सबसे अच्छी दोस्त है।
better	labāks; labāk	Šodien es jūtos labāk.	parem	Tunnen end täna paremini.	betri; betur	Mér líður betur í dag.	बेहतर	आज मैं बेहतर महसूस करता हूँ।
between	starp	Kafejnīca ir starp diviem veikaliem.	vahel	Kohvik on kahe poe vahel.	á milli	Kaffihúsið er á milli tveggja búða.	के बीच	कैफ़े दो दुकानों के बीच है।
bicycle	velosipēds	Mans velosipēds ir zils.	jalgratas	Mu jalgratas on sinine.	reiðhjól	Reiðhjólið mitt er blátt.	साइकिल	मेरी साइकिल नीली है।
big	liels	Šī kaste ir liela.	suur	See kast on suur.	stór	Þessi kassi er stór.	बड़ा	यह डिब्बा बड़ा है।
bike	ritenis; velosipēds	Es braucu ar riteni.	ratas	Ma sõidan rattaga.	hjól	Ég hjóla.	बाइक; साइकिल	मैं साइकिल चलाता हूँ।
bill	rēķins	Rēķins ir uz galda.	arve	Arve on laual.	reikningur	Reikningurinn er á borðinu.	बिल	बिल मेज़ पर है।
bird	putns	Putns ir kokā.	lind	Lind on puu otsas.	fugl	Fugl er í trénu.	पक्षी	पेड़ पर एक पक्षी है।
birthday	dzimšanas diena	Šodien ir mana dzimšanas diena.	sünnipäev	Täna on mu sünnipäev.	afmæli	Í dag er afmælið mitt.	जन्मदिन	आज मेरा जन्मदिन है।
black	melns	Mana soma ir melna.	must	Mu kott on must.	svartur	Taskan mín er svört.	काला	मेरा बैग काला है।
blog	emuārs	Viņa raksta emuāru.	blogi	Ta kirjutab blogi.	blogg	Hún skrifar blogg.	ब्लॉग	वह ब्लॉग लिखती है।
blonde	blonds; gaišmatains	Viņam ir blondi mati.	blond; heledapäine	Tal on blondid juuksed.	ljóshærður	Hann er með ljóst hár.	गोरा; सुनहरे बालों वाला	उसके सुनहरे बाल हैं।
blue	zils	Debesis ir zilas.	sinine	Taevas on sinine.	blár	Himinninn er blár.	नीला	आसमान नीला है।
boat	laiva	Laiva ir uz ūdens.	paat	Paat on vee peal.	bátur	Báturinn er á vatninu.	नाव	नाव पानी पर है।
body	ķermenis	Mans ķermenis ir noguris.	keha	Mu keha on väsinud.	líkami	Líkaminn minn er þreyttur.	शरीर	मेरा शरीर थका है।
book	grāmata	Es lasu grāmatu.	raamat	Ma loen raamatut.	bók	Ég les bók.	किताब	मैं किताब पढ़ता हूँ।
boot	zābaks	Viens zābaks ir zem gultas.	saabas	Üks saabas on voodi all.	stígvél	Eitt stígvél er undir rúminu.	बूट	एक बूट बिस्तर के नीचे है।
bored	garlaikots	Man ir garlaicīgi.	igavlema; tüdinud	Mul on igav.	leiður	Mér leiðist.	ऊबा हुआ	मैं ऊब गया हूँ।
boring	garlaicīgs	Šī filma ir garlaicīga.	igav	See film on igav.	leiðinlegur	Þessi mynd er leiðinleg.	उबाऊ	यह फ़िल्म उबाऊ है।
born	dzimis	Es piedzimu maijā.	sündinud	Ma sündisin mais.	fæddur	Ég fæddist í maí.	जन्मा हुआ	मेरा जन्म मई में हुआ था।
both	abi	Abas meitenes ir laimīgas.	mõlemad	Mõlemad tüdrukud on õnnelikud.	báðir; báðar	Báðar stelpurnar eru ánægðar.	दोनों	दोनों लड़कियाँ खुश हैं।
bottle	pudele	Pudele ir pilna.	pudel	Pudel on täis.	flaska	Flaskan er full.	बोतल	बोतल भरी हुई है।
box	kaste	Kaste ir atvērta.	kast	Kast on avatud.	kassi	Kassinn er opinn.	डिब्बा	डिब्बा खुला है।
boy	zēns	Zēns skrien ātri.	poiss	Poiss jookseb kiiresti.	strákur	Strákurinn hleypur hratt.	लड़का	लड़का तेज़ दौड़ता है।
boyfriend	draugs	Viņas draugs ir laipns.	poiss-sõber	Tema poiss-sõber on lahke.	kærasti	Kærastinn hennar er góður.	प्रेमी	उसका प्रेमी दयालु है।
bread	maize	Es gribu maizi.	leib	Ma tahan leiba.	brauð	Ég vil brauð.	रोटी; ब्रेड	मुझे रोटी चाहिए।
break	salauzt	Nesalauz krūzi.	lõhkuma; murdma	Ära lõhu tassi.	brjóta	Ekki brjóta bollann.	तोड़ना	कप मत तोड़ो।
breakfast	brokastis	Brokastis ir gatavas.	hommikusöök	Hommikusöök on valmis.	morgunmatur	Morgunmaturinn er tilbúinn.	नाश्ता	नाश्ता तैयार है।
bring	atnest	Atnes savu grāmatu.	tooma	Too oma raamat.	koma með; færa	Komdu með bókina þína.	लाना	अपनी किताब लाओ।
brother	brālis	Mans brālis ir garš.	vend	Mu vend on pikk.	bróðir	Bróðir minn er hár.	भाई	मेरा भाई लंबा है।
brown	brūns	Suns ir brūns.	pruun	Koer on pruun.	brúnn	Hundurinn er brúnn.	भूरा	कुत्ता भूरा है।
build	būvēt	Viņi būvē māju.	ehitama	Nad ehitavad maja.	byggja	Þau byggja hús.	बनाना; निर्माण करना	वे घर बना रहे हैं।
building	ēka	Šī ēka ir veca.	hoone	See hoone on vana.	bygging	Þessi bygging er gömul.	इमारत	यह इमारत पुरानी है।
bus	autobuss	Autobuss kavējas.	buss	Buss hilineb.	strætó	Strætó er seinn.	बस	बस देर से है।
business	uzņēmums; bizness	Manam tēvam ir uzņēmums.	äri; ettevõte	Mu isal on ettevõte.	fyrirtæki; viðskipti	Faðir minn á fyrirtæki.	व्यवसाय	मेरे पिता का व्यवसाय है।
busy	aizņemts	Šodien esmu aizņemts.	hõivatud	Ma olen täna hõivatud.	upptekinn	Ég er upptekinn í dag.	व्यस्त	मैं आज व्यस्त हूँ।
but	bet	Man patīk tēja, bet ne kafija.	aga	Mulle meeldib tee, aga mitte kohv.	en	Mér líkar te, en ekki kaffi.	लेकिन	मुझे चाय पसंद है, लेकिन कॉफ़ी नहीं।
butter	sviests	Uzliec sviestu uz maizes.	või	Pane võid leivale.	smjör	Settu smjör á brauðið.	मक्खन	रोटी पर मक्खन लगाओ।
buy	pirkt	Es pērku pienu.	ostma	Ma ostan piima.	kaupa	Ég kaupi mjólk.	खरीदना	मैं दूध खरीदता हूँ।
by	pie; blakus	Apsēdies pie loga.	juures; kõrval	Istu akna juurde.	við; hjá	Sittu við gluggann.	के पास; द्वारा	खिड़की के पास बैठो।
bye	atā; uz redzēšanos	Atā, tiekamies rīt.	head aega	Head aega, näeme homme.	bless	Bless, sjáumst á morgun.	अलविदा; बाय	बाय, कल मिलते हैं।
cafe	kafejnīca	Mēs tiekamies kafejnīcā.	kohvik	Me kohtume kohvikus.	kaffihús	Við hittumst á kaffihúsinu.	कैफ़े	हम कैफ़े में मिलते हैं।
cake	kūka	Kūka ir salda.	kook	Kook on magus.	kaka	Kakan er sæt.	केक	केक मीठा है।
call	zvanīt; saukt	Lūdzu, piezvani man.	helistama; kutsuma	Palun helista mulle.	hringja; kalla	Hringdu í mig, vinsamlegast.	फ़ोन करना; बुलाना	कृपया मुझे फ़ोन करो।
camera	fotoaparāts	Mans fotoaparāts ir jauns.	kaamera	Minu kaamera on uus.	myndavél	Myndavélin mín er ný.	कैमरा	मेरा कैमरा नया है।
can1 modal	varēt; prast	Es protu peldēt.	saama; oskama	Ma oskan ujuda.	geta; kunna	Ég get synt.	सकना; कर पाना	मैं तैर सकता हूँ।
cannot	nevarēt	Es šodien nevaru nākt.	ei saa; ei või	Ma ei saa täna tulla.	geta ekki	Ég get ekki komið í dag.	नहीं कर सकता	मैं आज नहीं आ सकता।
capital	galvaspilsēta	Parīze ir galvaspilsēta.	pealinn	Pariis on pealinn.	höfuðborg	París er höfuðborg.	राजधानी	पेरिस राजधानी है।
car	automašīna	Automašīna ir sarkana.	auto	Auto on punane.	bíll	Bíllinn er rauður.	कार	कार लाल है।
card	kartīte; karte	Man ir dzimšanas dienas kartīte.	kaart	Mul on sünnipäevakaart.	kort	Ég er með afmæliskort.	कार्ड	मेरे पास जन्मदिन का कार्ड है।
career	karjera	Es gribu karjeru mākslā.	karjäär	Ma tahan karjääri kunstis.	starfsferill	Ég vil starfsferil í list.	करियर	मुझे कला में करियर चाहिए।
carrot	burkāns	Burkāns ir oranžs.	porgand	Porgand on oranž.	gulrót	Gulrótin er appelsínugul.	गाजर	गाजर नारंगी है।
carry	nest	Es nesu savu somu.	kandma	Ma kannan oma kotti.	bera	Ég ber töskuna mína.	ले जाना; उठाना	मैं अपना बैग ले जाता हूँ।
cat	kaķis	Kaķis guļ.	kass	Kass magab.	köttur	Kötturinn sefur.	बिल्ली	बिल्ली सोती है।
CD	CD; disks	Šajā diskā ir mūzika.	CD; plaat	Sellel plaadil on muusika.	geisladiskur	Þessi geisladiskur er með tónlist.	सीडी; डिस्क	इस डिस्क में संगीत है।
cent	cents	Viens cents ir ļoti mazs.	sent	Üks sent on väga väike.	sent	Eitt sent er mjög lítið.	सेंट	एक सेंट बहुत छोटा है।
centre	centrs	Pilsētas centrs ir rosīgs.	keskus	Linna keskus on hõivatud.	miðja; miðstöð	Miðbærinn er annasamur.	केंद्र	शहर का केंद्र व्यस्त है।
century	gadsimts	Gadsimts ir simts gadi.	sajand	Sajand on sada aastat.	öld	Öld er hundrað ár.	शताब्दी	एक शताब्दी सौ साल होती है।
chair	krēsls	Apsēdies uz krēsla.	tool	Istu toolile.	stóll	Sestu á stólinn.	कुर्सी	कुर्सी पर बैठो।
change	mainīt; pārģērbties	Es pārģērbjos.	muutma; vahetama	Ma vahetan riideid.	breyta; skipta	Ég skipti um föt.	बदलना	मैं कपड़े बदलता हूँ।
chart	diagramma	Apskati diagrammu.	graafik; tabel	Vaata graafikut.	rit; tafla	Skoðaðu ritið.	चार्ट; ग्राफ़	चार्ट देखो।
cheap	lēts	Šis krekls ir lēts.	odav	See särk on odav.	ódýr	Þessi skyrta er ódýr.	सस्ता	यह कमीज़ सस्ती है।
check	pārbaudīt	Pārbaudi savu atbildi.	kontrollima	Kontrolli oma vastust.	athuga	Athugaðu svarið þitt.	जाँचना	अपना उत्तर जाँचो।
cheese	siers	Man patīk siers.	juust	Mulle meeldib juust.	ostur	Mér líkar ostur.	पनीर; चीज़	मुझे पनीर पसंद है।
chicken	vista; vistas gaļa	Mēs vakariņās ēdam vistu.	kana	Me sööme õhtusöögiks kana.	kjúklingur	Við borðum kjúkling í kvöldmat.	चिकन; मुर्गी	हम रात के खाने में चिकन खाते हैं।
child	bērns	Bērns ir laimīgs.	laps	Laps on õnnelik.	barn	Barnið er ánægt.	बच्चा	बच्चा खुश है।
chocolate	šokolāde	Šokolāde ir salda.	šokolaad	Šokolaad on magus.	súkkulaði	Súkkulaði er sætt.	चॉकलेट	चॉकलेट मीठी है।
choose	izvēlēties	Izvēlies vienu atbildi.	valima	Vali üks vastus.	velja	Veldu eitt svar.	चुनना	एक उत्तर चुनो।
cinema	kino	Mēs ejam uz kino.	kino	Me läheme kinno.	kvikmyndahús	Við förum í bíó.	सिनेमा	हम सिनेमा जाते हैं।
city	pilsēta	Pilsēta ir liela.	linn	Linn on suur.	borg	Borgin er stór.	शहर	शहर बड़ा है।
class	stunda; klase	Stunda sākas deviņos.	tund; klass	Tund algab kell üheksa.	tími; bekkur	Tíminn byrjar klukkan níu.	कक्षा; क्लास	कक्षा नौ बजे शुरू होती है।
classroom	klase; mācību telpa	Klase ir klusa.	klassiruum	Klassiruum on vaikne.	kennslustofa	Kennslustofan er hljóðlát.	कक्षा-कक्ष	कक्षा-कक्ष शांत है।
clean	tīrs; tīrīt	Istaba ir tīra.	puhas; koristama	Tuba on puhas.	hreinn; þrífa	Herbergið er hreint.	साफ़; साफ़ करना	कमरा साफ़ है।
climb	kāpt	Viņi kāpj kalnā.	ronima	Nad ronivad mäele.	klifra	Þau klifra upp hæðina.	चढ़ना	वे पहाड़ी पर चढ़ते हैं।
clock	pulkstenis	Pulkstenis ir uz sienas.	kell	Kell on seinal.	klukka	Klukkan er á veggnum.	घड़ी	घड़ी दीवार पर है।
close1	aizvērt	Aizver durvis, lūdzu.	sulgema	Palun sulge uks.	loka	Lokaðu dyrunum, vinsamlegast.	बंद करना	कृपया दरवाज़ा बंद करो।
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
            if language == "HI" and (not DEVANAGARI_RE.search(display) or not DEVANAGARI_RE.search(example)):
                problems.append(f"{source_headword}/{language}: missing Devanagari script")
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
    parser.add_argument("--batch-id", default="lv_et_is_hi_v1")
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
        "- Validation: exact source-row coverage, non-empty display/example cells, sentence punctuation, HI Devanagari script",
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
