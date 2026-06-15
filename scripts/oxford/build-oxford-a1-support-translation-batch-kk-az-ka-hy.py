#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_VERSION = "2026-05-17.v1"
LANGUAGES = ["KK", "AZ", "KA", "HY"]
SENTENCE_END_RE = re.compile(r"[.!?։]$")
CYRILLIC_RE = re.compile(r"[\u0400-\u04FF]")
GEORGIAN_RE = re.compile(r"[\u10A0-\u10FF]")
ARMENIAN_RE = re.compile(r"[\u0530-\u058F]")


TRANSLATIONS_TSV = """source_headword	KK	example_KK	AZ	example_AZ	KA	example_KA	HY	example_HY
a, an	белгісіз артикль	Менде бір қалам бар.	qeyri-müəyyən artikl	Məndə bir qələm var.	განუსაზღვრელი არტიკლი	მე ერთი კალამი მაქვს.	անորոշ հոդ	Ես մեկ գրիչ ունեմ.
about	туралы; шамамен	Біз тамақ туралы сөйлесеміз.	haqqında; təxminən	Biz yemək haqqında danışırıq.	შესახებ; დაახლოებით	ჩვენ საჭმელზე ვსაუბრობთ.	մասին; մոտավորապես	Մենք խոսում ենք ուտելիքի մասին.
above	үстінде	Сағат есіктің үстінде тұр.	üstündə	Saat qapının üstündədir.	ზემოთ	საათი კარის ზემოთაა.	վերևում	Ժամացույցը դռան վերևում է.
across	арғы жағында; көлденең	Дүкен көшенің арғы жағында.	o tayda; qarşı tərəfdə	Mağaza küçənin o tayındadır.	გადაღმა; გასწვრივ	მაღაზია ქუჩის გადაღმაა.	դիմացի կողմում; լայնքով	Խանութը փողոցի դիմացի կողմում է.
action	әрекет	Оның әрекеті маған көмектеседі.	hərəkət	Onun hərəkəti mənə kömək edir.	მოქმედება	მისი მოქმედება მე მეხმარება.	գործողություն	Նրա գործողությունն ինձ օգնում է.
activity	іс-әрекет; белсенділік	Жүзу қызықты іс-әрекет.	fəaliyyət	Üzmək əyləncəli fəaliyyətdir.	აქტივობა	ცურვა სახალისო აქტივობაა.	գործունեություն	Լողալը զվարճալի գործունեություն է.
actor	актер	Актер фильмде.	aktyor	Aktyor filmdədir.	მსახიობი კაცი	მსახიობი ფილმშია.	դերասան	Դերասանը ֆիլմում է.
actress	актриса	Актриса бізге күлімдейді.	aktrisa	Aktrisa bizə gülümsəyir.	მსახიობი ქალი	მსახიობი ქალი გვიღიმის.	դերասանուհի	Դերասանուհին մեզ ժպտում է.
add	қосу	Атыңды осында қос.	əlavə etmək	Adını bura əlavə et.	დამატება	შენი სახელი აქ დაამატე.	ավելացնել	Քո անունն այստեղ ավելացրու.
address	мекенжай	Менің мекенжайым осы картада.	ünvan	Ünvanım bu kartdadır.	მისამართი	ჩემი მისამართი ამ ბარათზეა.	հասցե	Իմ հասցեն այս քարտի վրա է.
adult	ересек адам	Ересек адам есік жанында отыр.	böyük; yetkin	Bir böyük qapının yanında oturur.	ზრდასრული	ზრდასრული კართან ზის.	մեծահասակ	Մի մեծահասակ դռան մոտ նստած է.
advice	кеңес	Оның кеңесі қарапайым.	məsləhət	Onun məsləhəti sadədir.	რჩევა	მისი რჩევა მარტივია.	խորհուրդ	Նրա խորհուրդը պարզ է.
afraid	қорыққан	Бала қорқып тұр.	qorxmuş	Uşaq qorxub.	შეშინებული	ბავშვი შეშინებულია.	վախեցած	Երեխան վախեցած է.
after	кейін	Мен сабақтан кейін тамақ ішемін.	sonra	Mən dərsdən sonra yeyirəm.	შემდეგ	მე გაკვეთილის შემდეგ ვჭამ.	հետո	Ես դասից հետո ուտում եմ.
afternoon	түстен кейін	Мен түстен кейін оқимын.	günortadan sonra	Mən günortadan sonra oxuyuram.	ნაშუადღევი	მე ნაშუადღევს ვსწავლობ.	կեսօրից հետո	Ես կեսօրից հետո սովորում եմ.
again	қайта; тағы	Өтінемін, оны қайта айт.	yenə; təkrar	Zəhmət olmasa, bunu yenə de.	ისევ	გთხოვ, ეს ისევ თქვი.	կրկին	Խնդրում եմ, դա կրկին ասա.
age	жас	Жасың нешеде?	yaş	Sənin yaşın neçədir?	ასაკი	შენი ასაკი რამდენია?	տարիք	Քո տարիքը քանի՞ է.
ago	бұрын	Мен мұнда екі күн бұрын келдім.	əvvəl	Mən buraya iki gün əvvəl gəldim.	წინ	მე აქ ორი დღის წინ მოვედი.	առաջ	Ես այստեղ երկու օր առաջ եկա.
agree	келісу	Мен сенімен келісемін.	razılaşmaq	Mən səninlə razıyam.	დათანხმება	მე შენ გეთანხმები.	համաձայնել	Ես քեզ հետ համաձայն եմ.
air	ауа	Ауа салқын.	hava	Hava soyuqdur.	ჰაერი	ჰაერი ცივია.	օդ	Օդը սառն է.
airport	әуежай	Біз әуежайдамыз.	hava limanı	Biz hava limanındayıq.	აეროპორტი	ჩვენ აეროპორტში ვართ.	օդանավակայան	Մենք օդանավակայանում ենք.
all	барлық; бәрі	Барлық оқушылар осында.	hamısı; bütün	Bütün şagirdlər buradadır.	ყველა	ყველა მოსწავლე აქ არის.	բոլոր; բոլորը	Բոլոր աշակերտներն այստեղ են.
also	да; де	Маған шай да ұнайды.	həmçinin; də	Mən də çayı sevirəm.	ასევე	მეც მიყვარს ჩაი.	նաև	Ես նույնպես թեյ եմ սիրում.
always	әрқашан	Ол әрқашан су ішеді.	həmişə	O həmişə su içir.	ყოველთვის	ის ყოველთვის წყალს სვამს.	միշտ	Նա միշտ ջուր է խմում.
amazing	таңғажайып	Көрініс таңғажайып.	möhtəşəm	Mənzərə möhtəşəmdir.	გასაოცარი	ხედი გასაოცარია.	զարմանալի	Տեսարանը զարմանալի է.
and	және	Том мен Анна дос.	və	Tom və Anna dostdurlar.	და	ტომი და ანა მეგობრები არიან.	և	Թոմն ու Աննան ընկերներ են.
angry	ашулы	Ол қазір ашулы.	hirsli	O indi hirslidir.	გაბრაზებული	ის ახლა გაბრაზებულია.	բարկացած	Նա հիմա բարկացած է.
animal	жануар	Ит жануар.	heyvan	İt heyvandır.	ცხოველი	ძაღლი ცხოველია.	կենդանի	Շունը կենդանի է.
another	басқа; тағы бір	Мен тағы бір кесе қалаймын.	başqa; daha bir	Mən daha bir fincan istəyirəm.	სხვა; კიდევ ერთი	მე კიდევ ერთი ჭიქა მინდა.	մեկ այլ	Ես մեկ այլ բաժակ եմ ուզում.
answer	жауап	Жауапты осында жаз.	cavab	Cavabı bura yaz.	პასუხი	პასუხი აქ დაწერე.	պատասխան	Պատասխանը այստեղ գրիր.
any	кез келген; бір	Сенде ақша бар ма?	hər hansı; bir	Səndə pul var?	ნებისმიერი; რამე	შენ ფული გაქვს?	որևէ	Քեզ մոտ փող կա՞.
anyone	біреу; кез келген адам	Біреуге көмек керек пе?	kimsə; hər kəs	Kiməsə kömək lazımdır?	ვინმე	ვინმეს დახმარება სჭირდება?	որևէ մեկը	Ինչ-որ մեկին օգնություն պե՞տք է.
anything	бірдеңе; ештеңе	Мен ештеңе көрмеймін.	bir şey; heç nə	Mən heç nə görmürəm.	რამე; არაფერი	მე ვერაფერს ვხედავ.	որևէ բան; ոչինչ	Ես ոչինչ չեմ տեսնում.
apartment	пәтер	Менің пәтерім кішкентай.	mənzil	Mənzilim kiçikdir.	ბინა	ჩემი ბინა პატარაა.	բնակարան	Իմ բնակարանը փոքր է.
apple	алма	Бұл алма қызыл.	alma	Bu alma qırmızıdır.	ვაშლი	ეს ვაშლი წითელია.	խնձոր	Այս խնձորը կարմիր է.
April	сәуір	Менің туған күнім сәуірде.	aprel	Ad günüm apreldədir.	აპრილი	ჩემი დაბადების დღე აპრილშია.	ապրիլ	Իմ ծննդյան օրը ապրիլին է.
area	аймақ	Бұл аймақ тыныш.	ərazi; sahə	Bu ərazi sakitdir.	ტერიტორია; უბანი	ეს უბანი მშვიდია.	տարածք	Այս տարածքը հանգիստ է.
arm	қол	Қолым ауырып тұр.	qol	Qolum ağrıyır.	ხელი	ხელი მტკივა.	ձեռք	Ձեռքս ցավում է.
around	айналасында	Біз саябақтың айналасында жүреміз.	ətrafında	Biz parkın ətrafında gəzirik.	გარშემო	ჩვენ პარკის გარშემო დავდივართ.	շուրջը	Մենք զբոսայգու շուրջը քայլում ենք.
arrive	келу; жету	Олар алтыда келеді.	çatmaq; gəlmək	Onlar altıda çatırlar.	მოსვლა; ჩამოსვლა	ისინი ექვსზე მოდიან.	ժամանել	Նրանք ժամը վեցին ժամանում են.
art	өнер	Маған өнер ұнайды.	incəsənət	Mən incəsənəti sevirəm.	ხელოვნება	მე ხელოვნება მიყვარს.	արվեստ	Ես արվեստ եմ սիրում.
article	мақала	Мен интернеттен мақала оқимын.	məqalə	Mən onlayn məqalə oxuyuram.	სტატია	მე ონლაინ სტატიას ვკითხულობ.	հոդված	Ես առցանց հոդված եմ կարդում.
artist	суретші; өнерпаз	Суретші бет салады.	rəssam; sənətçi	Rəssam üz çəkir.	მხატვარი	მხატვარი სახეს ხატავს.	արվեստագետ; նկարիչ	Նկարիչը դեմք է նկարում.
as	ретінде; сияқты	Мен мұғалім ретінде жұмыс істеймін.	kimi	Mən müəllim kimi işləyirəm.	როგორც	მე მასწავლებლად ვმუშაობ.	որպես; ինչպես	Ես որպես ուսուցիչ եմ աշխատում.
ask	сұрау	Қазір мұғалімнен сұра.	soruşmaq	İndi müəllimdən soruş.	კითხვა; თხოვნა	ახლა მასწავლებელს ჰკითხე.	հարցնել; խնդրել	Հիմա ուսուցչին հարցրու.
at	-да; жанында	Мен үйдемін.	-da; yanında	Mən evdəyəm.	-ში;თან	მე სახლში ვარ.	-ում; մոտ	Ես տանն եմ.
August	тамыз	Біз тамызда саяхаттаймыз.	avqust	Biz avqustda səyahət edirik.	აგვისტო	ჩვენ აგვისტოში ვმოგზაურობთ.	օգոստոս	Մենք օգոստոսին ճանապարհորդում ենք.
aunt	әпке; тәте	Менің тәтем осында тұрады.	xala; bibi	Xalam burada yaşayır.	დეიდა	ჩემი დეიდა აქ ცხოვრობს.	մորաքույր; հորաքույր	Իմ մորաքույրը այստեղ է ապրում.
autumn	күз	Күзде жапырақтар түседі.	payız	Payızda yarpaqlar tökülür.	შემოდგომა	შემოდგომაზე ფოთლები ცვივა.	աշուն	Աշնանը տերևները թափվում են.
away	алысқа	Автобус алысқа кетеді.	uzağa	Avtobus uzağa gedir.	შორს	ავტობუსი შორს მიდის.	հեռու	Ավտոբուսը հեռանում է.
baby	нәресте	Нәресте ұйықтап жатыр.	körpə	Körpə yatır.	ბავშვი; ჩვილი	ჩვილი სძინავს.	մանուկ	Մանուկը քնած է.
back	арқа; артқа	Арқам ауырады.	bel; arxa	Belim ağrıyır.	ზურგი; უკან	ზურგი მტკივა.	մեջք; հետ	Մեջքս ցավում է.
bad	жаман; бұзылған	Бұл сүт бұзылған.	pis; xarab	Bu süd xarabdır.	ცუდი; გაფუჭებული	ეს რძე გაფუჭებულია.	վատ; փչացած	Այս կաթը փչացած է.
bag	сөмке	Сөмкең орындықта тұр.	çanta	Çantan stulun üstündədir.	ჩანთა	შენი ჩანთა სკამზეა.	պայուսակ	Քո պայուսակը աթոռի վրա է.
ball	доп	Доп үстелдің астында.	top	Top masanın altındadır.	ბურთი	ბურთი მაგიდის ქვეშაა.	գնդակ	Գնդակը սեղանի տակ է.
banana	банан	Мен банан жеймін.	banan	Mən banan yeyirəm.	ბანანი	მე ბანანს ვჭამ.	բանան	Ես բանան եմ ուտում.
band	топ; ансамбль	Топ музыка ойнайды.	qrup; ansambl	Qrup musiqi çalır.	ბენდი; ჯგუფი	ჯგუფი მუსიკას უკრავს.	խումբ	Խումբը երաժշտություն է նվագում.
bank (money)	банк	Банк тоғызда ашылады.	bank	Bank doqquzda açılır.	ბანკი	ბანკი ცხრაზე იხსნება.	բանկ	Բանկը բացվում է ժամը իննին.
bath	ванна; шомылу	Мен түнде шомыламын.	vanna; çimmək	Mən gecə çimirəm.	აბაზანა; დაბანა	მე ღამით ვიბან.	լոգանք	Ես գիշերը լոգանք եմ ընդունում.
bathroom	жуынатын бөлме	Жуынатын бөлме таза.	hamam otağı	Hamam otağı təmizdir.	სააბაზანო	სააბაზანო სუფთაა.	լոգասենյակ	Լոգասենյակը մաքուր է.
be	болу	Мен бақыттымын.	olmaq	Mən xoşbəxtəm.	ყოფნა	მე ბედნიერი ვარ.	լինել	Ես ուրախ եմ.
beach	жағажай	Біз жағажайда отырамыз.	çimərlik	Biz çimərlikdə otururuq.	პლაჟი	ჩვენ პლაჟზე ვსხედვართ.	լողափ	Մենք լողափում նստած ենք.
beautiful	әдемі	Гүл әдемі.	gözəl	Çiçək gözəldir.	ლამაზი	ყვავილი ლამაზია.	գեղեցիկ	Ծաղիկը գեղեցիկ է.
because	өйткені	Мен ауырып тұрмын, сондықтан үйде қаламын.	çünki	Mən xəstəyəm, ona görə evdə qalıram.	რადგან	მე ავად ვარ, ამიტომ სახლში ვრჩები.	որովհետև	Ես հիվանդ եմ, դրա համար տանն եմ մնում.
become	болып кету	Ауа суық болып кетуі мүмкін.	olmaq	Hava soyuq ola bilər.	გახდომა	შეიძლება გაცივდეს.	դառնալ	Կարող է ցուրտ դառնալ.
bed	төсек	Төсек үлкен.	çarpayı	Çarpayı böyükdür.	საწოლი	საწოლი დიდია.	մահճակալ	Մահճակալը մեծ է.
bedroom	жатын бөлме	Менің жатын бөлмем тыныш.	yataq otağı	Yataq otağım sakitdir.	საძინებელი	ჩემი საძინებელი მშვიდია.	ննջասենյակ	Իմ ննջասենյակը հանգիստ է.
beer	сыра	Ол кешкі аспен сыра ішеді.	pivə	O, axşam yeməyi ilə pivə içir.	ლუდი	ის ვახშამთან ერთად ლუდს სვამს.	գարեջուր	Նա ընթրիքի հետ գարեջուր է խմում.
before	бұрын; алдында	Түскі астың алдында қолыңды жу.	əvvəl	Nahardan əvvəl əllərini yu.	მანამდე	სადილამდე ხელები დაიბანე.	առաջ	Ճաշից առաջ ձեռքերդ լվա.
begin	бастау	Тестті қазір баста.	başlamaq	Testi indi başla.	დაწყება	ტესტი ახლა დაიწყე.	սկսել	Թեստը հիմա սկսիր.
beginning	басталуы	Басталуы оңай.	başlanğıc	Başlanğıc asandır.	დასაწყისი	დასაწყისი მარტივია.	սկիզբ	Սկիզբը հեշտ է.
behind	артында	Мысық диванның артында.	arxasında	Pişik divanın arxasındadır.	უკან	კატა დივნის უკანაა.	ետևում	Կատուն բազմոցի ետևում է.
believe	сену	Мен саған сенемін.	inanmaq	Mən sənə inanıram.	რწმენა	მე შენი მჯერა.	հավատալ	Ես քեզ հավատում եմ.
below	төменде; астында	Аты суреттің астында.	aşağıda	Ad şəklin altındadır.	ქვემოთ	სახელი სურათის ქვემოთაა.	ներքևում	Անունը նկարի ներքևում է.
best	ең жақсы	Ол менің ең жақсы досым.	ən yaxşı	O mənim ən yaxşı dostumdur.	საუკეთესო	ის ჩემი საუკეთესო მეგობარია.	լավագույն	Նա իմ լավագույն ընկերն է.
better	жақсырақ	Бүгін өзімді жақсырақ сезінемін.	daha yaxşı	Bu gün özümü daha yaxşı hiss edirəm.	უკეთესი	დღეს თავს უკეთ ვგრძნობ.	ավելի լավ	Այսօր ինձ ավելի լավ եմ զգում.
between	арасында	Кафе екі дүкеннің арасында.	arasında	Kafe iki mağazanın arasındadır.	შორის	კაფე ორ მაღაზიას შორისაა.	միջև	Սրճարանը երկու խանութի միջև է.
bicycle	велосипед	Менің велосипедім көк.	velosiped	Velosipedim göydür.	ველოსიპედი	ჩემი ველოსიპედი ლურჯია.	հեծանիվ	Իմ հեծանիվը կապույտ է.
big	үлкен	Бұл қорап үлкен.	böyük	Bu qutu böyükdür.	დიდი	ეს ყუთი დიდია.	մեծ	Այս տուփը մեծ է.
bike	велосипед	Мен велосипедімді тебемін.	velosiped	Mən velosipedimi sürürəm.	ველოსიპედი	მე ჩემს ველოსიპედს ვატარებ.	հեծանիվ	Ես հեծանիվ եմ քշում.
bill	шот	Шот үстелде жатыр.	hesab	Hesab masanın üstündədir.	ანგარიში	ანგარიში მაგიდაზეა.	հաշիվ	Հաշիվը սեղանի վրա է.
bird	құс	Ағашта құс отыр.	quş	Ağacda quş var.	ჩიტი	ხეზე ჩიტია.	թռչուն	Ծառի վրա թռչուն կա.
birthday	туған күн	Бүгін менің туған күнім.	ad günü	Bu gün mənim ad günümdür.	დაბადების დღე	დღეს ჩემი დაბადების დღეა.	ծննդյան օր	Այսօր իմ ծննդյան օրն է.
black	қара	Менің сөмкем қара.	qara	Çantam qaradır.	შავი	ჩემი ჩანთა შავია.	սև	Իմ պայուսակը սև է.
blog	блог	Ол блог жазады.	bloq	O, bloq yazır.	ბლოგი	ის ბლოგს წერს.	բլոգ	Նա բլոգ է գրում.
blonde	сары шашты	Оның шашы сары.	sarışın	Onun sarı saçı var.	ქერა	მას ქერა თმა აქვს.	շիկահեր	Նա շիկահեր մազեր ունի.
blue	көк	Аспан көк.	mavi	Göy mavidir.	ლურჯი	ცა ლურჯია.	կապույտ	Երկինքը կապույտ է.
boat	қайық	Қайық суда тұр.	qayıq	Qayıq suyun üstündədir.	ნავი	ნავი წყალზეა.	նավակ	Նավակը ջրի վրա է.
body	дене	Денем шаршады.	bədən	Bədənim yorğundur.	სხეული	ჩემი სხეული დაღლილია.	մարմին	Իմ մարմինը հոգնած է.
book	кітап	Мен кітап оқимын.	kitab	Mən kitab oxuyuram.	წიგნი	მე წიგნს ვკითხულობ.	գիրք	Ես գիրք եմ կարդում.
boot	етік	Бір етік төсектің астында.	çəkmə	Bir çəkmə çarpayının altındadır.	ჩექმა	ერთი ჩექმა საწოლის ქვეშაა.	երկարաճիտ կոշիկ	Մի երկարաճիտ կոշիկ մահճակալի տակ է.
bored	жалыққан	Мен жалықтым.	darıxmış	Mən darıxmışam.	მოწყენილი	მე მოწყენილი ვარ.	ձանձրացած	Ես ձանձրացել եմ.
boring	қызықсыз	Бұл фильм қызықсыз.	darıxdırıcı	Bu film darıxdırıcıdır.	მოსაწყენი	ეს ფილმი მოსაწყენია.	ձանձրալի	Այս ֆիլմը ձանձրալի է.
born	туған	Мен мамырда тудым.	doğulmuş	Mən mayda doğulmuşam.	დაბადებული	მე მაისში დავიბადე.	ծնված	Ես ծնվել եմ մայիսին.
both	екеуі де	Екі қыз да бақытты.	hər ikisi	Hər iki qız xoşbəxtdir.	ორივე	ორივე გოგო ბედნიერია.	երկուսն էլ	Երկու աղջիկներն էլ ուրախ են.
bottle	бөтелке	Бөтелке толы.	şüşə	Şüşə doludur.	ბოთლი	ბოთლი სავსეა.	շիշ	Շիշը լիքն է.
box	қорап	Қорап ашық.	qutu	Qutu açıqdır.	ყუთი	ყუთი ღიაა.	տուփ	Տուփը բաց է.
boy	ұл бала	Ұл бала тез жүгіреді.	oğlan	Oğlan sürətlə qaçır.	ბიჭი	ბიჭი სწრაფად დარბის.	տղա	Տղան արագ է վազում.
boyfriend	жігіт	Оның жігіті мейірімді.	sevgili oğlan	Onun sevgilisi mehribandır.	შეყვარებული ბიჭი	მისი შეყვარებული კეთილია.	ընկեր տղա	Նրա ընկեր տղան բարի է.
bread	нан	Мен нан қалаймын.	çörək	Mən çörək istəyirəm.	პური	მე პური მინდა.	հաց	Ես հաց եմ ուզում.
break	сындыру	Кесені сындырма.	sındırmaq	Fincanı sındırma.	გატეხვა	ჭიქა არ გატეხო.	կոտրել	Բաժակը մի կոտրիր.
breakfast	таңғы ас	Таңғы ас дайын.	səhər yeməyi	Səhər yeməyi hazırdır.	საუზმე	საუზმე მზადაა.	նախաճաշ	Նախաճաշը պատրաստ է.
bring	әкелу	Кітабыңды әкел.	gətirmək	Kitabını gətir.	მოტანა	შენი წიგნი მოიტანე.	բերել	Գիրքդ բեր.
brother	аға; іні	Менің ағам ұзын бойлы.	qardaş	Qardaşım hündürdür.	ძმა	ჩემი ძმა მაღალია.	եղբայր	Իմ եղբայրը բարձրահասակ է.
brown	қоңыр	Ит қоңыр түсті.	qəhvəyi	İt qəhvəyi rəngdədir.	ყავისფერი	ძაღლი ყავისფერია.	շագանակագույն	Շունը շագանակագույն է.
build	салу	Олар үй салады.	tikmək; qurmaq	Onlar ev tikirlər.	აშენება	ისინი სახლს აშენებენ.	կառուցել	Նրանք տուն են կառուցում.
building	ғимарат	Бұл ғимарат ескі.	bina	Bu bina köhnədir.	შენობა	ეს შენობა ძველია.	շենք	Այս շենքը հին է.
bus	автобус	Автобус кешікті.	avtobus	Avtobus gecikir.	ავტობუსი	ავტობუსი აგვიანებს.	ավտոբուս	Ավտոբուսը ուշանում է.
business	бизнес; кәсіп	Әкемнің бизнесі бар.	biznes; iş	Atamın biznesi var.	ბიზნესი	მამაჩემს ბიზნესი აქვს.	բիզնես	Հայրս բիզնես ունի.
busy	қол бос емес; бос емес	Мен бүгін бос емеспін.	məşğul	Mən bu gün məşğulam.	დაკავებული	დღეს დაკავებული ვარ.	զբաղված	Այսօր ես զբաղված եմ.
but	бірақ	Маған шай ұнайды, бірақ кофе емес.	amma; lakin	Mən çayı sevirəm, amma qəhvəni yox.	მაგრამ	მე ჩაი მიყვარს, მაგრამ ყავა არა.	բայց	Ես թեյ եմ սիրում, բայց սուրճ ոչ.
butter	сары май	Нанға сары май жақ.	kərə yağı	Çörəyə kərə yağı çək.	კარაქი	პურზე კარაქი წაუსვი.	կարագ	Հացին կարագ քսիր.
buy	сатып алу	Мен сүт сатып аламын.	almaq	Mən süd alıram.	ყიდვა	მე რძეს ვყიდულობ.	գնել	Ես կաթ եմ գնում.
by	жанында; арқылы	Терезенің жанында отыр.	yanında; ilə	Pəncərənin yanında otur.	გვერდით; მიერ	ფანჯარასთან დაჯექი.	մոտ; միջոցով	Պատուհանի մոտ նստիր.
bye	сау бол	Сау бол, ертең кездесеміз.	sağ ol	Sağ ol, sabah görüşərik.	ნახვამდის	ნახვამდის, ხვალ გნახავ.	ցտեսություն	Ցտեսություն, վաղը կհանդիպենք.
cafe	кафе	Біз кафеде кездесеміз.	kafe	Biz kafedə görüşürük.	კაფე	ჩვენ კაფეში ვხვდებით.	սրճարան	Մենք սրճարանում հանդիպում ենք.
cake	торт	Торт тәтті.	tort	Tort şirindir.	ნამცხვარი	ნამცხვარი ტკბილია.	տորթ	Տորթը քաղցր է.
call	қоңырау шалу; шақыру	Өтінемін, маған қоңырау шал.	zəng etmək; çağırmaq	Zəhmət olmasa, mənə zəng et.	დარეკვა; დაძახება	გთხოვ, დამირეკე.	զանգահարել; կանչել	Խնդրում եմ, ինձ զանգիր.
camera	камера	Менің камерам жаңа.	kamera	Kameram yenidir.	კამერა	ჩემი კამერა ახალია.	տեսախցիկ	Իմ տեսախցիկը նոր է.
can1 modal	істей алу	Мен жүзе аламын.	bacarmaq	Mən üzə bilirəm.	შეძლება	მე ცურვა შემიძლია.	կարողանալ	Ես կարող եմ լողալ.
cannot	істей алмау	Мен бүгін келе алмаймын.	bilməmək; bacarmamaq	Mən bu gün gələ bilmirəm.	ვერ შეძლება	დღეს მოსვლა არ შემიძლია.	չկարողանալ	Ես այսօր չեմ կարող գալ.
capital	астана	Париж астана қаласы.	paytaxt	Paris paytaxt şəhərdir.	დედაქალაქი	პარიზი დედაქალაქია.	մայրաքաղաք	Փարիզը մայրաքաղաք է.
car	көлік	Көлік қызыл.	maşın	Maşın qırmızıdır.	მანქანა	მანქანა წითელია.	մեքենա	Մեքենան կարմիր է.
card	карта; ашықхат	Менде туған күн картасы бар.	kart; açıqca	Məndə ad günü kartı var.	ბარათი	მე დაბადების დღის ბარათი მაქვს.	քարտ	Ես ծննդյան օրվա քարտ ունեմ.
career	мансап	Мен өнерде мансап қалаймын.	karyera	Mən incəsənətdə karyera istəyirəm.	კარიერა	მე ხელოვნებაში კარიერა მინდა.	կարիերա	Ես արվեստում կարիերա եմ ուզում.
carrot	сәбіз	Сәбіз қызғылт сары.	kök	Yerkökü narıncıdır.	სტაფილო	სტაფილო ნარინჯისფერია.	գազար	Գազարը նարնջագույն է.
carry	көтеру; алып жүру	Мен сөмкемді алып жүремін.	daşımaq	Mən çantamı daşıyıram.	ტარება	ჩემს ჩანთას ვატარებ.	տանել; կրել	Ես պայուսակս տանում եմ.
cat	мысық	Мысық ұйықтайды.	pişik	Pişik yatır.	კატა	კატას სძინავს.	կատու	Կատուն քնում է.
CD	CD; диск	Бұл дискте музыка бар.	CD; disk	Bu diskdə musiqi var.	სიდი; დისკი	ამ დისკზე მუსიკაა.	սի-դի; սկավառակ	Այս սկավառակի վրա երաժշտություն կա.
cent	цент	Бір цент өте кішкентай.	sent	Bir sent çox kiçikdir.	ცენტი	ერთი ცენტი ძალიან პატარაა.	ցենտ	Մեկ ցենտը շատ փոքր է.
centre	орталық	Қала орталығы бос емес.	mərkəz	Şəhər mərkəzi məşğuldur.	ცენტრი	ქალაქის ცენტრი დატვირთულია.	կենտրոն	Քաղաքի կենտրոնը զբաղված է.
century	ғасыр	Бір ғасыр жүз жыл.	əsr	Bir əsr yüz ildir.	საუკუნე	ერთი საუკუნე ასი წელია.	դար	Մեկ դարը հարյուր տարի է.
chair	орындық	Орындыққа отыр.	stul	Stulda otur.	სკამი	სკამზე დაჯექი.	աթոռ	Աթոռին նստիր.
change	өзгерту; ауыстыру	Мен киімімді ауыстырамын.	dəyişmək	Mən paltarımı dəyişirəm.	შეცვლა	მე ტანსაცმელს ვიცვლი.	փոխել	Ես հագուստս փոխում եմ.
chart	кесте; диаграмма	Диаграммаға қара.	cədvəl; diaqram	Diaqramma bax.	დიაგრამა; ცხრილი	დიაგრამას შეხედე.	գծապատկեր; աղյուսակ	Գծապատկերը նայիր.
cheap	арзан	Бұл жейде арзан.	ucuz	Bu köynək ucuzdur.	იაფი	ეს პერანგი იაფია.	էժան	Այս վերնաշապիկը էժան է.
check	тексеру	Жауабыңды тексер.	yoxlamaq	Cavabını yoxla.	შემოწმება	შენი პასუხი შეამოწმე.	ստուգել	Քո պատասխանը ստուգիր.
cheese	ірімшік	Маған ірімшік ұнайды.	pendir	Mən pendiri sevirəm.	ყველი	მე ყველი მიყვარს.	պանիր	Ես պանիր եմ սիրում.
chicken	тауық; тауық еті	Біз кешкі асқа тауық жейміз.	toyuq; toyuq əti	Biz axşam yeməyində toyuq yeyirik.	ქათამი; ქათმის ხორცი	ვახშამზე ქათამს ვჭამთ.	հավ; հավի միս	Մենք ընթրիքին հավ ենք ուտում.
child	бала	Бала бақытты.	uşaq	Uşaq xoşbəxtdir.	ბავშვი	ბავშვი ბედნიერია.	երեխա	Երեխան ուրախ է.
chocolate	шоколад	Шоколад тәтті.	şokolad	Şokolad şirindir.	შოკოლადი	შოკოლადი ტკბილია.	շոկոլադ	Շոկոլադը քաղցր է.
choose	таңдау	Бір жауапты таңда.	seçmək	Bir cavab seç.	არჩევა	ერთი პასუხი აირჩიე.	ընտրել	Մեկ պատասխան ընտրիր.
cinema	кинотеатр	Біз кинотеатрға барамыз.	kino; kinoteatr	Biz kinoya gedirik.	კინოთეატრი	ჩვენ კინოთეატრში მივდივართ.	կինոթատրոն	Մենք կինոթատրոն ենք գնում.
city	қала	Қала үлкен.	şəhər	Şəhər böyükdür.	ქალაქი	ქალაქი დიდია.	քաղաք	Քաղաքը մեծ է.
class	сынып; сабақ	Сабақ тоғызда басталады.	dərs; sinif	Dərs doqquzda başlayır.	კლასი; გაკვეთილი	გაკვეთილი ცხრაზე იწყება.	դաս; դասարան	Դասը սկսվում է ժամը իննին.
classroom	сынып бөлмесі	Сынып бөлмесі тыныш.	sinif otağı	Sinif otağı sakitdir.	საკლასო ოთახი	საკლასო ოთახი მშვიდია.	դասասենյակ	Դասասենյակը հանգիստ է.
clean	таза; тазалау	Бөлме таза.	təmiz; təmizləmək	Otaq təmizdir.	სუფთა; დასუფთავება	ოთახი სუფთაა.	մաքուր; մաքրել	Սենյակը մաքուր է.
climb	өрмелеу; көтерілу	Олар төбеге көтеріледі.	dırmaşmaq	Onlar təpəyə dırmaşırlar.	ასვლა	ისინი ბორცვზე ადიან.	բարձրանալ	Նրանք բլուրն են բարձրանում.
clock	сағат	Сағат қабырғада.	saat	Saat divardadır.	საათი	საათი კედელზეა.	ժամացույց	Ժամացույցը պատին է.
close1	жабу	Өтінемін, есікті жап.	bağlamaq	Zəhmət olmasa, qapını bağla.	დახურვა	გთხოვ, კარი დახურე.	փակել	Խնդրում եմ, դուռը փակիր.
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
            if language == "KK" and (not CYRILLIC_RE.search(display) or not CYRILLIC_RE.search(example)):
                problems.append(f"{source_headword}/{language}: missing Cyrillic script")
            if language == "KA" and (not GEORGIAN_RE.search(display) or not GEORGIAN_RE.search(example)):
                problems.append(f"{source_headword}/{language}: missing Georgian script")
            if language == "HY" and (not ARMENIAN_RE.search(display) or not ARMENIAN_RE.search(example)):
                problems.append(f"{source_headword}/{language}: missing Armenian script")
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
    parser.add_argument("--batch-id", default="kk_az_ka_hy_v1")
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
        "- Validation: exact source-row coverage, non-empty display/example cells, sentence punctuation, KK Cyrillic script, KA Georgian script, HY Armenian script",
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
