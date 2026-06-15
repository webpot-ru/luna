#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const releaseId = args.get("release") ?? "english_core_3000_a1_a2_part_001_150_v1";
const inputPath = path.resolve(
  args.get("input") ??
    `outputs/english-core-3000/en-transcriptions/${releaseId}_en_transcriptions_v1.jsonl`
);
const outputDir = path.resolve(args.get("out-dir") ?? "outputs/english-core-3000/translation-batches");

const translations = {
  core3000_0001: { HU: ["a; az", "Az ajtó nyitva van."], RO: ["articol hotărât", "Ușa este deschisă."], BG: ["определителен член", "Вратата е отворена."], HR: ["određeni član", "Vrata su otvorena."] },
  core3000_0002: { HU: ["lenni", "Készen akarok lenni."], RO: ["a fi", "Vreau să fiu gata."], BG: ["съм; бъда", "Искам да бъда готов."], HR: ["biti", "Želim biti spreman."] },
  core3000_0003: { HU: ["és", "Tea és víz van az asztalon."], RO: ["și", "Ceaiul și apa sunt pe masă."], BG: ["и", "Чаят и водата са на масата."], HR: ["i", "Čaj i voda su na stolu."] },
  core3000_0004: { HU: ["-nak/-nek; birtokos szerkezet", "Egy csésze tea forró."], RO: ["de; al/a", "O ceașcă de ceai este fierbinte."], BG: ["на; от", "Чаша чай е гореща."], HR: ["od; genitiv", "Šalica čaja je vruća."] },
  core3000_0005: { HU: ["-ni; -hoz/-hez/-höz", "Haza akarok menni."], RO: ["să; la", "Vreau să merg acasă."], BG: ["да; към", "Искам да се прибера вкъщи."], HR: ["infinitiv; u", "Želim ići kući."] },
  core3000_0006: { HU: ["egy", "Van egy könyvem."], RO: ["un; o", "Am o carte."], BG: ["неопределен член", "Имам книга."], HR: ["neodređeni član", "Imam knjigu."] },
  core3000_0007: { HU: ["-ban/-ben", "A kulcs a táskában van."], RO: ["în", "Cheia este în geantă."], BG: ["в", "Ключът е в чантата."], HR: ["u", "Ključ je u torbi."] },
  core3000_0008: { HU: ["van valamije; birtokolni", "Van telefonom."], RO: ["a avea", "Am un telefon."], BG: ["имам", "Имам телефон."], HR: ["imati", "Imam telefon."] },
  core3000_0009: { HU: ["az; ez", "A táskában van."], RO: ["el; ea; asta", "Este în geantă."], BG: ["то; това", "То е в чантата."], HR: ["ono; to", "U torbi je."] },
  core3000_0010: { HU: ["te; ön", "Te vagy a barátom."], RO: ["tu; dumneavoastră", "Tu ești prietenul meu."], BG: ["ти; вие", "Ти си мой приятел."], HR: ["ti; vi", "Ti si moj prijatelj."] },
  core3000_0011: { HU: ["ő", "Ő iskolában van."], RO: ["el", "El este la școală."], BG: ["той", "Той е в училище."], HR: ["on", "On je u školi."] },
  core3000_0012: { HU: ["-nak/-nek; számára", "Ez az ajándék neked van."], RO: ["pentru", "Acest cadou este pentru tine."], BG: ["за", "Този подарък е за теб."], HR: ["za", "Ovaj poklon je za tebe."] },
  core3000_0013: { HU: ["ők", "Ők otthon vannak."], RO: ["ei; ele", "Ei sunt acasă."], BG: ["те", "Те са вкъщи."], HR: ["oni; one; ona", "Oni su kod kuće."] },
  core3000_0014: { HU: ["nem", "Nem vagyok fáradt."], RO: ["nu", "Nu sunt obosit."], BG: ["не", "Не съм уморен."], HR: ["ne", "Nisam umoran."] },
  core3000_0015: { HU: ["az", "Az a könyv az enyém."], RO: ["acel; acea; aceea", "Cartea aceea este a mea."], BG: ["онзи; онази; онова", "Онази книга е моя."], HR: ["taj; ta; to", "Ta knjiga je moja."] },
  core3000_0016: { HU: ["mi", "Készen vagyunk."], RO: ["noi", "Suntem gata."], BG: ["ние", "Готови сме."], HR: ["mi", "Spremni smo."] },
  core3000_0017: { HU: ["-on/-en/-ön; rajta", "A bögre az asztalon van."], RO: ["pe", "Cana este pe masă."], BG: ["на", "Чашата е на масата."], HR: ["na", "Šalica je na stolu."] },
  core3000_0018: { HU: ["-val/-vel", "A családommal vagyok."], RO: ["cu", "Sunt cu familia mea."], BG: ["със; с", "Със семейството си съм."], HR: ["s; sa", "S obitelji sam."] },
  core3000_0019: { HU: ["ez", "Ez a könyv új."], RO: ["acest; această; acesta", "Această carte este nouă."], BG: ["този; тази; това", "Тази книга е нова."], HR: ["ovaj; ova; ovo", "Ova knjiga je nova."] },
  core3000_0020: { HU: ["én", "Otthon vagyok."], RO: ["eu", "Sunt acasă."], BG: ["аз", "Вкъщи съм."], HR: ["ja", "Kod kuće sam."] },
  core3000_0021: { HU: ["csinálni", "Megcsinálom a házi feladatomat."], RO: ["a face", "Îmi fac tema."], BG: ["правя", "Пиша си домашното."], HR: ["raditi; činiti", "Radim domaću zadaću."] },
  core3000_0022: { HU: ["-ként; mint", "Tanárként dolgozik."], RO: ["ca", "Ea lucrează ca profesoară."], BG: ["като", "Тя работи като учителка."], HR: ["kao", "Ona radi kao učiteljica."] },
  core3000_0023: { HU: ["-nál/-nél; -ban/-ben; -kor", "Találkozzunk az iskolában."], RO: ["la", "Întâlnește-mă la școală."], BG: ["в; при; на", "Да се срещнем в училище."], HR: ["u; kod; na", "Nađimo se u školi."] },
  core3000_0024: { HU: ["ő", "Ő a nővérem."], RO: ["ea", "Ea este sora mea."], BG: ["тя", "Тя е сестра ми."], HR: ["ona", "Ona je moja sestra."] },
  core3000_0025: { HU: ["de", "Késő van, de maradok."], RO: ["dar", "Este târziu, dar rămân."], BG: ["но", "Късно е, но оставам."], HR: ["ali", "Kasno je, ali ostajem."] },
  core3000_0026: { HU: ["-ból/-ből; -tól/-től", "Kanadából vagyok."], RO: ["din; de la", "Sunt din Canada."], BG: ["от", "Аз съм от Канада."], HR: ["iz; od", "Ja sam iz Kanade."] },
  core3000_0027: { HU: ["mellett; -nál/-nél", "A táska az ajtó mellett van."], RO: ["lângă; de", "Geanta este lângă ușă."], BG: ["до; при", "Чантата е до вратата."], HR: ["kod; pokraj", "Torba je pokraj vrata."] },
  core3000_0028: { HU: ["fog; majd", "Felhívlak."], RO: ["voi; va", "Te voi suna."], BG: ["ще", "Ще ти се обадя."], HR: ["ću; će", "Nazvat ću te."] },
  core3000_0029: { HU: ["vagy", "A tea vagy a kávé jó lesz."], RO: ["sau", "Ceaiul sau cafeaua este în regulă."], BG: ["или", "Чай или кафе ще е добре."], HR: ["ili", "Čaj ili kava bit će u redu."] },
  core3000_0030: { HU: ["mondani", "Mondd meg a neved, kérlek."], RO: ["a spune", "Spune cum te cheamă, te rog."], BG: ["казвам; кажа", "Кажи името си, моля."], HR: ["reći; govoriti", "Reci svoje ime, molim te."] },
  core3000_0031: { HU: ["menni", "Iskola után hazamegyek."], RO: ["a merge", "După școală merg acasă."], BG: ["отивам; вървя", "След училище се прибирам вкъщи."], HR: ["ići", "Nakon škole idem kući."] },
  core3000_0032: { HU: ["ezért; így", "Késő van, ezért hazamegyek."], RO: ["deci; așa că", "Este târziu, așa că merg acasă."], BG: ["така че; затова", "Късно е, затова се прибирам."], HR: ["pa; zato", "Kasno je, pa idem kući."] },
  core3000_0033: { HU: ["minden; összes", "Minden diák itt van."], RO: ["toți; tot", "Toți elevii sunt aici."], BG: ["всички; цял", "Всички ученици са тук."], HR: ["svi; sav", "Svi učenici su ovdje."] },
  core3000_0034: { HU: ["ott; oda", "Tedd oda a táskát."], RO: ["acolo", "Pune geanta acolo."], BG: ["там", "Сложи чантата там."], HR: ["tamo", "Stavi torbu tamo."] },
  core3000_0035: { HU: ["tudni; ismerni", "Tudom a választ."], RO: ["a ști; a cunoaște", "Știu răspunsul."], BG: ["знам; познавам", "Знам отговора."], HR: ["znati; poznavati", "Znam odgovor."] },
  core3000_0036: { HU: ["kapni", "Ma kapok egy új könyvet."], RO: ["a primi", "Astăzi primesc o carte nouă."], BG: ["получавам", "Днес ще получа нова книга."], HR: ["dobiti", "Danas ću dobiti novu knjigu."] },
  core3000_0037: { HU: ["gondolni; hinni", "Azt hiszem, ez helyes."], RO: ["a gândi; a crede", "Cred că acest lucru este corect."], BG: ["мисля; смятам", "Мисля, че това е правилно."], HR: ["misliti", "Mislim da je to točno."] },
  core3000_0038: { HU: ["csinálni; készíteni", "Otthon ebédet készítek."], RO: ["a face; a pregăti", "Pregătesc prânzul acasă."], BG: ["правя; приготвям", "Приготвям обяд вкъщи."], HR: ["raditi; napraviti; pripremiti", "Kod kuće pripremam ručak."] },
  core3000_0039: { HU: ["idő", "Az idő fontos."], RO: ["timp", "Timpul este important."], BG: ["време", "Времето е важно."], HR: ["vrijeme", "Vrijeme je važno."] },
  core3000_0040: { HU: ["látni", "Látom a házat."], RO: ["a vedea", "Văd casa."], BG: ["виждам", "Виждам къщата."], HR: ["vidjeti", "Vidim kuću."] },
  core3000_0041: { HU: ["ki; kint", "Menj ki most, kérlek."], RO: ["afară", "Ieși afară acum, te rog."], BG: ["навън", "Излез навън сега, моля."], HR: ["vani; van", "Izađi sada van, molim te."] },
  core3000_0042: { HU: ["jó", "Ez egy jó nap."], RO: ["bun", "Aceasta este o zi bună."], BG: ["добър", "Това е добър ден."], HR: ["dobar", "Ovo je dobar dan."] },
  core3000_0043: { HU: ["emberek", "Sok ember van itt."], RO: ["oameni", "Sunt mulți oameni aici."], BG: ["хора", "Тук има много хора."], HR: ["ljudi", "Ovdje ima mnogo ljudi."] },
  core3000_0044: { HU: ["év", "Egy év tizenkét hónapból áll."], RO: ["un an", "Un an are douăsprezece luni."], BG: ["година", "Годината има дванайсет месеца."], HR: ["godina", "Godina ima dvanaest mjeseci."] },
  core3000_0045: { HU: ["venni; elvinni", "Vidd el ezt a táskát, kérlek."], RO: ["a lua", "Ia geanta aceasta, te rog."], BG: ["вземам", "Вземи тази чанта, моля."], HR: ["uzeti", "Uzmi ovu torbu, molim te."] },
  core3000_0046: { HU: ["jól", "Jól olvas."], RO: ["bine", "Ea citește bine."], BG: ["добре", "Тя чете добре."], HR: ["dobro", "Ona dobro čita."] },
  core3000_0047: { HU: ["nagyon", "Ez a szoba nagyon kicsi."], RO: ["foarte", "Această cameră este foarte mică."], BG: ["много", "Тази стая е много малка."], HR: ["vrlo; jako", "Ova soba je vrlo mala."] },
  core3000_0048: { HU: ["csak; éppen", "Csak vízre van szükségem."], RO: ["doar; tocmai", "Am nevoie doar de apă."], BG: ["само; тъкмо", "Трябва ми само вода."], HR: ["samo; upravo", "Trebam samo vodu."] },
  core3000_0049: { HU: ["jönni", "Gyere ide, kérlek."], RO: ["a veni", "Vino aici, te rog."], BG: ["идвам", "Ела тук, моля."], HR: ["doći", "Dođi ovdje, molim te."] },
  core3000_0050: { HU: ["dolgozni", "Egy iskolában dolgozom."], RO: ["a lucra", "Lucrez într-o școală."], BG: ["работя", "Работя в училище."], HR: ["raditi", "Radim u školi."] },
  core3000_0051: { HU: ["használni", "Minden nap használom ezt a telefont."], RO: ["a folosi", "Folosesc acest telefon în fiecare zi."], BG: ["използвам", "Използвам този телефон всеки ден."], HR: ["koristiti", "Koristim ovaj telefon svaki dan."] },
  core3000_0052: { HU: ["aztán; akkor", "Reggelizz, aztán menj iskolába."], RO: ["apoi; atunci", "Ia micul dejun, apoi mergi la școală."], BG: ["после; тогава", "Закуси, после отиди на училище."], HR: ["zatim; tada", "Doručkuj, zatim idi u školu."] },
  core3000_0053: { HU: ["is", "Angolul is beszélek."], RO: ["și; de asemenea", "Vorbesc și engleză."], BG: ["също", "Говоря и английски."], HR: ["također; i", "Govorim i engleski."] },
  core3000_0054: { HU: ["csak", "Csak egy tollam van."], RO: ["doar", "Am doar un stilou."], BG: ["само", "Имам само една химикалка."], HR: ["samo", "Imam samo jednu olovku."] },
  core3000_0055: { HU: ["nézni", "Nézz a táblára."], RO: ["a privi; a se uita", "Uită-te la tablă."], BG: ["гледам", "Погледни към дъската."], HR: ["gledati", "Pogledaj ploču."] },
  core3000_0056: { HU: ["akarni", "Új könyvet akarok."], RO: ["a vrea", "Vreau o carte nouă."], BG: ["искам", "Искам нова книга."], HR: ["htjeti; željeti", "Želim novu knjigu."] },
  core3000_0057: { HU: ["adni", "Add ide a tollat, kérlek."], RO: ["a da", "Dă-mi stiloul, te rog."], BG: ["давам", "Дай ми химикалката, моля."], HR: ["dati", "Daj mi olovku, molim te."] },
  core3000_0058: { HU: ["első", "Ez az első napom."], RO: ["primul; prima", "Aceasta este prima mea zi."], BG: ["първи", "Това е първият ми ден."], HR: ["prvi", "Ovo je moj prvi dan."] },
  core3000_0059: { HU: ["új", "Van egy új telefonom."], RO: ["nou", "Am un telefon nou."], BG: ["нов", "Имам нов телефон."], HR: ["nov", "Imam novi telefon."] },
  core3000_0060: { HU: ["mód; út", "Ez jó módja a tanulásnak."], RO: ["mod; drum", "Acesta este un mod bun de a învăța."], BG: ["начин; път", "Това е добър начин за учене."], HR: ["način; put", "Ovo je dobar način učenja."] },
  core3000_0061: { HU: ["találni", "Megtalálom a kulcsaimat az asztalon."], RO: ["a găsi", "Îmi găsesc cheile pe masă."], BG: ["намирам", "Намирам ключовете си на масата."], HR: ["naći; pronaći", "Pronalazim ključeve na stolu."] },
  core3000_0062: { HU: ["nap", "Egy nap nagyon mozgalmas lehet."], RO: ["zi", "O zi poate fi foarte aglomerată."], BG: ["ден", "Един ден може да бъде много натоварен."], HR: ["dan", "Dan može biti vrlo naporan."] },
  core3000_0063: { HU: ["dolog; tárgy", "Ez a tárgy hasznos."], RO: ["lucru", "Acest lucru este util."], BG: ["нещо", "Това нещо е полезно."], HR: ["stvar", "Ova stvar je korisna."] },
  core3000_0064: { HU: ["helyes; jobb", "A válaszod helyes."], RO: ["corect; drept", "Răspunsul tău este corect."], BG: ["правилен; десен", "Отговорът ти е правилен."], HR: ["točan; desni", "Tvoj odgovor je točan."] },
  core3000_0065: { HU: ["hogyan", "Hogyan kell leírni a nevedet?"], RO: ["cum", "Cum se scrie numele tău?"], BG: ["как", "Как се пише името ти?"], HR: ["kako", "Kako se piše tvoje ime?"] },
  core3000_0066: { HU: ["vissza; hát", "Gyere vissza hamar, kérlek."], RO: ["înapoi; spate", "Te rog, întoarce-te curând."], BG: ["обратно; гръб", "Върни се скоро, моля."], HR: ["natrag; leđa", "Vrati se uskoro, molim te."] },
  core3000_0067: { HU: ["jelenteni", "Mit jelent ez a szó?"], RO: ["a însemna", "Ce înseamnă acest cuvânt?"], BG: ["означавам", "Какво означава тази дума?"], HR: ["značiti", "Što znači ova riječ?"] },
  core3000_0068: { HU: ["még; akár", "Még egy gyerek is meg tudja csinálni."], RO: ["chiar", "Chiar și un copil poate face asta."], BG: ["дори", "Дори дете може да направи това."], HR: ["čak", "Čak i dijete to može napraviti."] },
  core3000_0069: { HU: ["itt; ide", "Ülj ide, kérlek."], RO: ["aici", "Stai aici, te rog."], BG: ["тук", "Седни тук, моля."], HR: ["ovdje", "Sjedni ovdje, molim te."] },
  core3000_0070: { HU: ["gyerek", "Egy gyerek kint játszik."], RO: ["copil", "Un copil se joacă afară."], BG: ["дете", "Дете играе навън."], HR: ["dijete", "Dijete se igra vani."] },
  core3000_0071: { HU: ["mondani; mesélni", "Mondd meg a neved, kérlek."], RO: ["a spune; a povesti", "Spune-mi numele tău, te rog."], BG: ["казвам; разказвам", "Кажи ми името си, моля."], HR: ["reći; ispričati", "Reci mi svoje ime, molim te."] },
  core3000_0072: { HU: ["igazán; tényleg", "Nagyon szeretem ezt a könyvet."], RO: ["chiar; cu adevărat", "Îmi place foarte mult această carte."], BG: ["наистина", "Наистина харесвам тази книга."], HR: ["stvarno", "Stvarno mi se sviđa ova knjiga."] },
  core3000_0073: { HU: ["hívni; nevezni", "Minden nap felhívom anyát."], RO: ["a suna; a numi", "O sun pe mama în fiecare zi."], BG: ["обаждам се; наричам", "Обаждам се на майка ми всеки ден."], HR: ["nazvati; zvati", "Zovem mamu svaki dan."] },
  core3000_0074: { HU: ["cég; vállalat", "A cég ezeket a telefonokat árulja."], RO: ["o companie", "O companie vinde aceste telefoane."], BG: ["фирма; компания", "Фирма продава тези телефони."], HR: ["tvrtka", "Tvrtka prodaje ove telefone."] },
  core3000_0075: { HU: ["mutatni", "Mutasd meg a térképet, kérlek."], RO: ["a arăta", "Arată-mi harta, te rog."], BG: ["показвам", "Покажи ми картата, моля."], HR: ["pokazati", "Pokaži mi kartu, molim te."] },
  core3000_0076: { HU: ["élet", "Itt más az élet."], RO: ["viață", "Viața aici este diferită."], BG: ["живот", "Животът тук е различен."], HR: ["život", "Život je ovdje drugačiji."] },
  core3000_0077: { HU: ["férfi", "Egy férfi kint vár."], RO: ["bărbat", "Un bărbat așteaptă afară."], BG: ["мъж", "Мъж чака навън."], HR: ["muškarac", "Muškarac čeka vani."] },
  core3000_0078: { HU: ["változtatni; változni", "A tervek gyorsan változnak."], RO: ["a schimba; a se schimba", "Planurile se schimbă repede."], BG: ["променям; променям се", "Плановете се променят бързо."], HR: ["mijenjati; promijeniti se", "Planovi se brzo mijenjaju."] },
  core3000_0079: { HU: ["hely", "Ez a hely csendes."], RO: ["loc", "Acest loc este liniștit."], BG: ["място", "Това място е тихо."], HR: ["mjesto", "Ovo mjesto je tiho."] },
  core3000_0080: { HU: ["hosszú", "Ez egy hosszú út."], RO: ["lung", "Acesta este un drum lung."], BG: ["дълъг", "Това е дълъг път."], HR: ["dug", "Ovo je dug put."] },
  core3000_0081: { HU: ["érezni; érezni magát", "Ma jól érzem magam."], RO: ["a simți; a se simți", "Astăzi mă simt bine."], BG: ["чувствам; чувствам се", "Днес се чувствам добре."], HR: ["osjećati se", "Danas se osjećam dobro."] },
  core3000_0082: { HU: ["túl; is", "Ez a táska túl nehéz."], RO: ["prea; de asemenea", "Această geantă este prea grea."], BG: ["твърде; също", "Тази чанта е твърде тежка."], HR: ["previše; također", "Ova torba je preteška."] },
  core3000_0083: { HU: ["még mindig", "Még mindig itt lakom."], RO: ["încă", "Încă locuiesc aici."], BG: ["все още", "Все още живея тук."], HR: ["još uvijek", "Još uvijek živim ovdje."] },
  core3000_0084: { HU: ["probléma", "Ez egy kis probléma."], RO: ["o problemă", "Aceasta este o problemă mică."], BG: ["проблем", "Това е малък проблем."], HR: ["problem", "Ovo je mali problem."] },
  core3000_0085: { HU: ["írni", "Írd le a neved, kérlek."], RO: ["a scrie", "Scrie-ți numele, te rog."], BG: ["пиша", "Напиши името си, моля."], HR: ["pisati", "Napiši svoje ime, molim te."] },
  core3000_0086: { HU: ["nagyszerű; nagy", "Ez egy nagyszerű ötlet."], RO: ["grozav; mare", "Aceasta este o idee grozavă."], BG: ["страхотен; голям", "Това е страхотна идея."], HR: ["sjajan; velik", "To je sjajna ideja."] },
  core3000_0087: { HU: ["próbálni", "Minden nap próbálok tanulni."], RO: ["a încerca", "Încerc să învăț în fiecare zi."], BG: ["опитвам", "Опитвам се да уча всеки ден."], HR: ["pokušati; truditi se", "Pokušavam učiti svaki dan."] },
  core3000_0088: { HU: ["elmenni; elhagyni", "Nyolckor indulunk."], RO: ["a pleca; a lăsa", "Plecăm la ora opt."], BG: ["тръгвам; напускам", "Тръгваме в осем."], HR: ["otići; napustiti", "Odlazimo u osam."] },
  core3000_0089: { HU: ["szám", "Írd ide a számot."], RO: ["un număr", "Scrie numărul aici."], BG: ["число; номер", "Напиши числото тук."], HR: ["broj", "Napiši broj ovdje."] },
  core3000_0090: { HU: ["rész", "Ez a rész fontos."], RO: ["o parte", "Această parte este importantă."], BG: ["част", "Тази част е важна."], HR: ["dio", "Ovaj dio je važan."] },
  core3000_0091: { HU: ["pont", "Ez a pont világos."], RO: ["un punct", "Acest punct este clar."], BG: ["точка; пункт", "Тази точка е ясна."], HR: ["točka", "Ova točka je jasna."] },
  core3000_0092: { HU: ["segíteni", "Segítek a családomnak."], RO: ["a ajuta", "Îmi ajut familia."], BG: ["помагам", "Помагам на семейството си."], HR: ["pomagati", "Pomažem svojoj obitelji."] },
  core3000_0093: { HU: ["kérdezni; kérni", "Tegyél fel egy kérdést."], RO: ["a întreba; a cere", "Pune o întrebare, te rog."], BG: ["питам; моля", "Задай въпрос, моля."], HR: ["pitati; zamoliti", "Postavi pitanje, molim te."] },
  core3000_0094: { HU: ["találkozni", "Találkozunk az iskolában."], RO: ["a întâlni", "Ne întâlnim la școală."], BG: ["срещам; срещам се", "Срещаме се в училище."], HR: ["sresti; upoznati", "Nalazimo se u školi."] },
  core3000_0095: { HU: ["kezdeni; kezdődni", "Az órák kilenckor kezdődnek."], RO: ["a începe", "Orele încep la nouă."], BG: ["започвам", "Часовете започват в девет."], HR: ["početi; započeti", "Nastava počinje u devet."] },
  core3000_0096: { HU: ["beszélni", "Beszélek a tanárommal."], RO: ["a vorbi", "Vorbesc cu profesorul meu."], BG: ["говоря", "Говоря с учителя си."], HR: ["razgovarati; govoriti", "Razgovaram s učiteljem."] },
  core3000_0097: { HU: ["tenni; rakni", "Tedd a könyvet az asztalra."], RO: ["a pune", "Pune cartea pe masă."], BG: ["слагам; поставям", "Сложи книгата на масата."], HR: ["staviti; položiti", "Stavi knjigu na stol."] },
  core3000_0098: { HU: ["válni; lenni valamivé", "Ez problémává válhat."], RO: ["a deveni", "Acest lucru poate deveni o problemă."], BG: ["ставам", "Това може да стане проблем."], HR: ["postati", "To može postati problem."] },
  core3000_0099: { HU: ["érdeklődés", "Érdekli a zene."], RO: ["un interes", "Ea este interesată de muzică."], BG: ["интерес", "Тя се интересува от музика."], HR: ["interes; zanimanje", "Zanima je glazba."] },
  core3000_0100: { HU: ["ország", "Kanada nagy ország."], RO: ["o țară", "Canada este o țară mare."], BG: ["държава; страна", "Канада е голяма държава."], HR: ["zemlja; država", "Kanada je velika zemlja."] },
  core3000_0101: { HU: ["régi; öreg", "Ez egy régi ház."], RO: ["vechi; bătrân", "Aceasta este o casă veche."], BG: ["стар", "Това е стара къща."], HR: ["star", "Ovo je stara kuća."] },
  core3000_0102: { HU: ["iskola", "Van egy iskola a házam közelében."], RO: ["o școală", "Este o școală lângă casa mea."], BG: ["училище", "Има училище близо до дома ми."], HR: ["škola", "Blizu moje kuće je škola."] },
  core3000_0103: { HU: ["késő; késni", "Elkések az óráról."], RO: ["târziu; întârziat", "Întârzii la curs."], BG: ["късен; закъснял", "Закъснявам за час."], HR: ["kasno; kasniti", "Kasnim na sat."] },
  core3000_0104: { HU: ["magas", "A fal magas."], RO: ["înalt", "Peretele este înalt."], BG: ["висок", "Стената е висока."], HR: ["visok", "Zid je visok."] },
  core3000_0105: { HU: ["különböző; más", "Ez a két könyv különböző."], RO: ["diferit", "Aceste două cărți sunt diferite."], BG: ["различен", "Тези две книги са различни."], HR: ["različit; drugačiji", "Ove dvije knjige su različite."] },
  core3000_0106: { HU: ["vég", "A történet vége szomorú."], RO: ["sfârșit", "Sfârșitul poveștii este trist."], BG: ["край", "Краят на историята е тъжен."], HR: ["kraj", "Kraj priče je tužan."] },
  core3000_0107: { HU: ["élni; lakni", "Egy kisvárosban lakom."], RO: ["a locui; a trăi", "Locuiesc într-un oraș mic."], BG: ["живея", "Живея в малък град."], HR: ["živjeti; stanovati", "Živim u malom gradu."] },
  core3000_0108: { HU: ["miért", "Miért vagy itt?"], RO: ["de ce", "De ce ești aici?"], BG: ["защо", "Защо си тук?"], HR: ["zašto", "Zašto si ovdje?"] },
  core3000_0109: { HU: ["világ", "Emberek élnek az egész világon."], RO: ["lume", "Oamenii trăiesc în toată lumea."], BG: ["свят", "Хората живеят по целия свят."], HR: ["svijet", "Ljudi žive diljem svijeta."] },
  core3000_0110: { HU: ["hét", "Egy hét hét napból áll."], RO: ["o săptămână", "O săptămână are șapte zile."], BG: ["седмица", "Седмицата има седем дни."], HR: ["tjedan", "Tjedan ima sedam dana."] },
  core3000_0111: { HU: ["játszani", "A gyerekek a parkban játszanak."], RO: ["a se juca; a juca", "Copiii se joacă în parc."], BG: ["играя", "Децата играят в парка."], HR: ["igrati se; igrati", "Djeca se igraju u parku."] },
  core3000_0112: { HU: ["haza; otthon", "Munka után hazamegyek."], RO: ["acasă", "După muncă merg acasă."], BG: ["вкъщи; у дома", "След работа се прибирам вкъщи."], HR: ["kući; kod kuće", "Nakon posla idem kući."] },
  core3000_0113: { HU: ["soha", "Soha nem eszem húst."], RO: ["niciodată", "Nu mănânc niciodată carne."], BG: ["никога", "Никога не ям месо."], HR: ["nikada", "Nikad ne jedem meso."] },
  core3000_0114: { HU: ["tartalmazni; benne lenni", "A reggeli benne lehet az árban."], RO: ["a include", "Micul dejun poate fi inclus în preț."], BG: ["включвам; съдържам", "Закуската може да е включена в цената."], HR: ["uključivati; sadržavati", "Doručak može biti uključen u cijenu."] },
  core3000_0115: { HU: ["tanfolyam; kurzus", "Ez a tanfolyam ma kezdődik."], RO: ["un curs", "Acest curs începe astăzi."], BG: ["курс", "Този курс започва днес."], HR: ["tečaj; kolegij", "Ovaj tečaj počinje danas."] },
  core3000_0116: { HU: ["ház", "Van egy ház az iskola közelében."], RO: ["o casă", "Este o casă lângă școală."], BG: ["къща", "Има къща близо до училището."], HR: ["kuća", "Blizu škole je kuća."] },
  core3000_0117: { HU: ["jelentés", "A jelentés rövid."], RO: ["un raport", "Raportul este scurt."], BG: ["доклад; отчет", "Докладът е кратък."], HR: ["izvješće", "Izvješće je kratko."] },
  core3000_0118: { HU: ["csoport", "Egy diákcsoport vár."], RO: ["un grup", "Un grup de elevi așteaptă."], BG: ["група", "Група ученици чака."], HR: ["skupina; grupa", "Skupina učenika čeka."] },
  core3000_0119: { HU: ["eset; ügy", "Ez az eset más."], RO: ["un caz", "Acest caz este diferit."], BG: ["случай; дело", "Този случай е различен."], HR: ["slučaj", "Ovaj slučaj je drugačiji."] },
  core3000_0120: { HU: ["nő", "Egy nő kint vár."], RO: ["o femeie", "O femeie așteaptă afară."], BG: ["жена", "Жена чака навън."], HR: ["žena", "Žena čeka vani."] },
  core3000_0121: { HU: ["könyv", "Ez a könyv új."], RO: ["o carte", "Această carte este nouă."], BG: ["книга", "Тази книга е нова."], HR: ["knjiga", "Ova knjiga je nova."] },
  core3000_0122: { HU: ["család", "A családom otthon van."], RO: ["o familie", "Familia mea este acasă."], BG: ["семейство", "Семейството ми е вкъщи."], HR: ["obitelj", "Moja obitelj je kod kuće."] },
  core3000_0123: { HU: ["tűnni; látszani", "Ez könnyűnek tűnik."], RO: ["a părea", "Acest lucru pare ușor."], BG: ["изглеждам; струва ми се", "Това изглежда лесно."], HR: ["činiti se", "Ovo se čini lako."] },
  core3000_0124: { HU: ["hagyni; engedni", "Hadd segítsek."], RO: ["a lăsa; a permite", "Lasă-mă să ajut."], BG: ["позволявам; оставям", "Позволи ми да помогна."], HR: ["pustiti; dopustiti", "Dopusti mi da pomognem."] },
  core3000_0125: { HU: ["újra; megint", "Mondd el újra, kérlek."], RO: ["din nou", "Spune asta încă o dată, te rog."], BG: ["отново; пак", "Кажи го още веднъж, моля."], HR: ["opet; ponovno", "Reci to još jednom, molim te."] },
  core3000_0126: { HU: ["fajta; típus", "Ez a fajta tea finom."], RO: ["un fel; un tip", "Acest fel de ceai este bun."], BG: ["вид", "Този вид чай е хубав."], HR: ["vrsta", "Ova vrsta čaja je dobra."] },
  core3000_0127: { HU: ["megtartani; hagyni", "Hagyd itt a telefonodat."], RO: ["a păstra; a lăsa", "Lasă-ți telefonul aici."], BG: ["пазя; оставям", "Остави телефона си тук."], HR: ["zadržati; ostaviti", "Ostavi svoj telefon ovdje."] },
  core3000_0128: { HU: ["hallani", "Zenét hallok kintről."], RO: ["a auzi", "Aud muzică de afară."], BG: ["чувам", "Чувам музика отвън."], HR: ["čuti", "Čujem glazbu izvana."] },
  core3000_0129: { HU: ["rendszer", "Ez a rendszer egyszerű."], RO: ["un sistem", "Acest sistem este simplu."], BG: ["система", "Тази система е проста."], HR: ["sustav", "Ovaj sustav je jednostavan."] },
  core3000_0130: { HU: ["kérdés", "Tegyél fel most egy kérdést."], RO: ["o întrebare", "Pune acum o întrebare."], BG: ["въпрос", "Задай въпрос сега."], HR: ["pitanje", "Postavi sada pitanje."] },
  core3000_0131: { HU: ["mindig", "Mindig korán érkezik."], RO: ["mereu; întotdeauna", "Ea vine mereu devreme."], BG: ["винаги", "Тя винаги идва рано."], HR: ["uvijek", "Ona uvijek dolazi rano."] },
  core3000_0132: { HU: ["nagy", "Ez egy nagy szoba."], RO: ["mare", "Aceasta este o cameră mare."], BG: ["голям", "Това е голяма стая."], HR: ["velik", "Ovo je velika soba."] },
  core3000_0133: { HU: ["készlet; szett", "Ebben a készletben hat csésze van."], RO: ["un set", "Acest set are șase cești."], BG: ["комплект", "В този комплект има шест чаши."], HR: ["set; komplet", "U ovom setu ima šest šalica."] },
  core3000_0134: { HU: ["kicsi", "Ez egy kicsi szoba."], RO: ["mic", "Aceasta este o cameră mică."], BG: ["малък", "Това е малка стая."], HR: ["malen; mali", "Ovo je mala soba."] },
  core3000_0135: { HU: ["tanulni; tanulmányozni", "Minden nap angolt tanulok."], RO: ["a studia; a învăța", "Studiez engleza în fiecare zi."], BG: ["уча; изучавам", "Уча английски всеки ден."], HR: ["učiti; studirati", "Učim engleski svaki dan."] },
  core3000_0136: { HU: ["követni", "Kövesd a tanárt, kérlek."], RO: ["a urma", "Urmează profesorul, te rog."], BG: ["следвам", "Следвай учителя, моля."], HR: ["slijediti; pratiti", "Slijedi učitelja, molim te."] },
  core3000_0137: { HU: ["kezdeni; kezdődni", "Az óra most kezdődhet."], RO: ["a începe", "Ora poate începe acum."], BG: ["започвам", "Часът може да започне сега."], HR: ["početi", "Sat može početi sada."] },
  core3000_0138: { HU: ["fontos", "Ez a kérdés fontos."], RO: ["important", "Această întrebare este importantă."], BG: ["важен", "Този въпрос е важен."], HR: ["važan", "Ovo pitanje je važno."] },
  core3000_0139: { HU: ["futni", "A parkban futok."], RO: ["a alerga", "Alerg în parc."], BG: ["тичам; бягам", "Тичам в парка."], HR: ["trčati", "Trčim u parku."] },
  core3000_0140: { HU: ["fordulni; fordítani", "Az ajtónál fordulj balra."], RO: ["a întoarce; a vira", "Virează la stânga la ușă."], BG: ["завивам; обръщам", "Завий наляво при вратата."], HR: ["skrenuti; okrenuti", "Skreni lijevo kod vrata."] },
  core3000_0141: { HU: ["hozni", "Hozd el a könyvedet, kérlek."], RO: ["a aduce", "Adu-ți cartea, te rog."], BG: ["донасям", "Донеси книгата си, моля."], HR: ["donijeti", "Donesi svoju knjigu, molim te."] },
  core3000_0142: { HU: ["korai; korán", "Korán kell kezdenünk."], RO: ["devreme; timpuriu", "Trebuie să începem devreme."], BG: ["ранен; рано", "Трябва да започнем рано."], HR: ["rani; rano", "Moramo početi rano."] },
  core3000_0143: { HU: ["kéz", "Emeld fel a kezed."], RO: ["o mână", "Ridică mâna."], BG: ["ръка", "Вдигни ръка."], HR: ["ruka", "Podigni ruku."] },
  core3000_0144: { HU: ["állam", "Kalifornia nagy állam."], RO: ["un stat", "California este un stat mare."], BG: ["щат; държава", "Калифорния е голям щат."], HR: ["država; savezna država", "Kalifornija je velika savezna država."] },
  core3000_0145: { HU: ["mozgatni; költözni", "Mozdítsd el a széket, kérlek."], RO: ["a muta; a mișca", "Mută scaunul, te rog."], BG: ["местя; движа", "Премести стола, моля."], HR: ["pomaknuti; preseliti", "Pomakni stolicu, molim te."] },
  core3000_0146: { HU: ["pénz", "Pénzre van szükségem ebédre."], RO: ["bani", "Am nevoie de bani pentru prânz."], BG: ["пари", "Трябват ми пари за обяд."], HR: ["novac", "Trebam novac za ručak."] },
  core3000_0147: { HU: ["tény", "Ez a tény fontos."], RO: ["un fapt", "Acest fapt este important."], BG: ["факт", "Този факт е важен."], HR: ["činjenica", "Ta je činjenica važna."] },
  core3000_0148: { HU: ["azonban; mégis", "Késő van, mégis várhatunk."], RO: ["totuși; însă", "Este târziu, totuși putem aștepta."], BG: ["обаче; въпреки това; все пак", "Късно е, но все пак можем да почакаме."], HR: ["međutim; ipak", "Kasno je, ali ipak možemo pričekati."] },
  core3000_0149: { HU: ["terület; környék", "Ez a környék csendes."], RO: ["o zonă", "Această zonă este liniștită."], BG: ["район; област", "Този район е тих."], HR: ["područje", "Ovo područje je mirno."] },
  core3000_0150: { HU: ["biztosítani; nyújtani", "Az iskola tud ebédet biztosítani."], RO: ["a oferi; a furniza", "Școala poate oferi prânzul."], BG: ["осигурявам; предоставям", "Училището може да осигури обяд."], HR: ["osigurati; pružiti", "Škola može osigurati ručak."] },
};

const languages = ["HU", "RO", "BG", "HR"];

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function writeJsonl(filePath, rows) {
  await fs.writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

const sourceRows = await readJsonl(inputPath);
const outputRows = sourceRows.map((row) => {
  const localized = translations[row.core_item_id];
  if (!localized) throw new Error(`Missing HU/RO/BG/HR translation for ${row.core_item_id}.`);
  const out = {
    release_id: releaseId,
    course_id: row.course_id,
    row_id: row.row_id,
    core_item_id: row.core_item_id,
    meaning_id: row.meaning_id,
    source_headword: row.source_headword,
    part_of_speech: row.part_of_speech,
    en_display: row.en_display,
    example_EN: row.example_EN,
    translation_batch: "hu_ro_bg_hr_v0",
    translation_status: "draft_native_style_qa_v3_checked",
    source_note: "Internal LunaCards draft translation layer; native-style QA v1/v2/v3 checked, final QA and source-assisted checks still required before delivery.",
  };
  for (const language of languages) {
    const [display, example] = localized[language] ?? [];
    out[language] = normalizeText(display);
    out[`example_${language}`] = normalizeText(example);
  }
  return out;
});

await fs.mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `${releaseId}_translation_batch_hu_ro_bg_hr_v0.jsonl`);
await writeJsonl(outputPath, outputRows);

const summaryPath = path.join(outputDir, `${releaseId}_translation_batch_hu_ro_bg_hr_v0_summary.md`);
await fs.writeFile(
  summaryPath,
  [
    `# Translation Batch HU/RO/BG/HR v0: ${releaseId}`,
    "",
    `- Rows: ${outputRows.length}`,
    "- Languages: HU, RO, BG, HR",
    "- Fields: display word plus translated example only",
    "- Target-language transcription fields: not generated",
    "- Status: draft_native_style_qa_v3_checked",
    "",
    "This artifact does not import Postgres rows and does not create a Google Sheet.",
    "Function words may use learner-facing glosses where a direct one-word target equivalent is misleading.",
    "Native-style QA v1/v2/v3 repaired obvious naturalness/copy issues during drafting; final QA evidence is still not created.",
    "",
  ].join("\n"),
  "utf8"
);

console.log(
  `English Core 3000 HU/RO/BG/HR translation batch written: ${path.relative(process.cwd(), outputPath)} rows=${outputRows.length}`
);
