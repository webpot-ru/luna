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
  core3000_0001: { DA: ["bestemt artikel", "Døren er åben."], FI: ["määräinen artikkeli", "Ovi on auki."], CS: ["určitý člen", "Dveře jsou otevřené."], SK: ["určitý člen", "Dvere sú otvorené."] },
  core3000_0002: { DA: ["at være", "Jeg vil være klar."], FI: ["olla", "Haluan olla valmis."], CS: ["být", "Chci být připravený."], SK: ["byť", "Chcem byť pripravený."] },
  core3000_0003: { DA: ["og", "Der står te og vand på bordet."], FI: ["ja", "Tee ja vesi ovat pöydällä."], CS: ["a", "Čaj a voda jsou na stole."], SK: ["a", "Čaj a voda sú na stole."] },
  core3000_0004: { DA: ["af", "En kop te er varm."], FI: ["genetiivi; -n", "Kupillinen teetä on kuuma."], CS: ["z; genitiv", "Šálek čaje je horký."], SK: ["z; genitív", "Šálka čaju je horúca."] },
  core3000_0005: { DA: ["at; til", "Jeg vil gå hjem."], FI: ["infinitiivi; johonkin", "Haluan mennä kotiin."], CS: ["infinitivní značka; do", "Chci jít domů."], SK: ["infinitívna značka; do", "Chcem ísť domov."] },
  core3000_0006: { DA: ["en; et", "Jeg har en bog."], FI: ["epämääräinen artikkeli", "Minulla on kirja."], CS: ["neurčitý člen", "Mám knihu."], SK: ["neurčitý člen", "Mám knihu."] },
  core3000_0007: { DA: ["i", "Nøglen ligger i tasken."], FI: ["-ssa; sisällä", "Avain on laukussa."], CS: ["v", "Klíč je v tašce."], SK: ["v", "Kľúč je v taške."] },
  core3000_0008: { DA: ["at have", "Jeg har en telefon."], FI: ["olla jollakulla; omistaa", "Minulla on puhelin."], CS: ["mít", "Mám telefon."], SK: ["mať", "Mám telefón."] },
  core3000_0009: { DA: ["det", "Det ligger i tasken."], FI: ["se", "Se on laukussa."], CS: ["to; ono", "Je to v tašce."], SK: ["to; ono", "Je to v taške."] },
  core3000_0010: { DA: ["du; I", "Du er min ven."], FI: ["sinä; te", "Sinä olet ystäväni."], CS: ["ty; vy", "Jsi můj kamarád."], SK: ["ty; vy", "Si môj kamarát."] },
  core3000_0011: { DA: ["han", "Han er på skolen."], FI: ["hän", "Hän on koulussa."], CS: ["on", "Je ve škole."], SK: ["on", "Je v škole."] },
  core3000_0012: { DA: ["for; til", "Denne gave er til dig."], FI: ["varten; -lle", "Tämä lahja on sinulle."], CS: ["pro; za", "Ten dárek je pro tebe."], SK: ["pre; za", "Tento darček je pre teba."] },
  core3000_0013: { DA: ["de", "De er hjemme."], FI: ["he; ne", "He ovat kotona."], CS: ["oni; ony", "Jsou doma."], SK: ["oni; ony", "Sú doma."] },
  core3000_0014: { DA: ["ikke", "Jeg er ikke træt."], FI: ["ei", "En ole väsynyt."], CS: ["ne", "Nejsem unavený."], SK: ["nie", "Nie som unavený."] },
  core3000_0015: { DA: ["den; det", "Den bog er min."], FI: ["tuo; se", "Tuo kirja on minun."], CS: ["ten; ta; to", "Ta kniha je moje."], SK: ["ten; tá; to", "Tá kniha je moja."] },
  core3000_0016: { DA: ["vi", "Vi er klar."], FI: ["me", "Olemme valmiita."], CS: ["my", "Jsme připraveni."], SK: ["my", "Sme pripravení."] },
  core3000_0017: { DA: ["på", "Koppen står på bordet."], FI: ["-lla; päällä", "Kuppi on pöydällä."], CS: ["na", "Hrnek je na stole."], SK: ["na", "Hrnček je na stole."] },
  core3000_0018: { DA: ["med", "Jeg er sammen med min familie."], FI: ["kanssa", "Olen perheeni kanssa."], CS: ["s; se", "Jsem s rodinou."], SK: ["s; so", "Som s rodinou."] },
  core3000_0019: { DA: ["denne; dette", "Denne bog er ny."], FI: ["tämä", "Tämä kirja on uusi."], CS: ["tento; tato; toto", "Tato kniha je nová."], SK: ["tento; táto; toto", "Táto kniha je nová."] },
  core3000_0020: { DA: ["jeg", "Jeg er hjemme."], FI: ["minä", "Olen kotona."], CS: ["já", "Jsem doma."], SK: ["ja", "Som doma."] },
  core3000_0021: { DA: ["at gøre; at lave", "Jeg laver mine lektier."], FI: ["tehdä", "Teen läksyjäni."], CS: ["dělat", "Dělám domácí úkol."], SK: ["robiť", "Robím domácu úlohu."] },
  core3000_0022: { DA: ["som", "Hun arbejder som lærer."], FI: ["-na; kuten", "Hän työskentelee opettajana."], CS: ["jako", "Pracuje jako učitelka."], SK: ["ako", "Pracuje ako učiteľka."] },
  core3000_0023: { DA: ["ved; på", "Mød mig på skolen."], FI: ["-ssa; luona; kello", "Tapaa minut koululla."], CS: ["v; u; v kolik", "Sejdeme se ve škole."], SK: ["v; pri; o", "Stretnime sa v škole."] },
  core3000_0024: { DA: ["hun", "Hun er min søster."], FI: ["hän", "Hän on siskoni."], CS: ["ona", "Je to moje sestra."], SK: ["ona", "Je to moja sestra."] },
  core3000_0025: { DA: ["men", "Jeg er træt, men glad."], FI: ["mutta", "On myöhä, mutta jään."], CS: ["ale", "Je pozdě, ale zůstanu."], SK: ["ale", "Je neskoro, ale zostanem."] },
  core3000_0026: { DA: ["fra", "Jeg kommer fra Canada."], FI: ["-sta; -stä", "Olen Kanadasta."], CS: ["z; od", "Jsem z Kanady."], SK: ["z; od", "Som z Kanady."] },
  core3000_0027: { DA: ["ved; ved siden af", "Tasken står ved døren."], FI: ["vieressä; mennessä", "Laukku on oven vieressä."], CS: ["u; vedle", "Taška je u dveří."], SK: ["pri; vedľa", "Taška je pri dverách."] },
  core3000_0028: { DA: ["vil; skal", "Jeg ringer til dig."], FI: ["tulee; aion", "Soitan sinulle."], CS: ["bude; budu", "Zavolám ti."], SK: ["bude; budem", "Zavolám ti."] },
  core3000_0029: { DA: ["eller", "Te eller kaffe er fint."], FI: ["tai", "Tee tai kahvi käy hyvin."], CS: ["nebo", "Čaj nebo káva bude v pořádku."], SK: ["alebo", "Čaj alebo káva bude dobrá."] },
  core3000_0030: { DA: ["at sige", "Sig dit navn, tak."], FI: ["sanoa", "Sano nimesi, kiitos."], CS: ["říct; říkat", "Řekni prosím své jméno."], SK: ["povedať; hovoriť", "Povedz prosím svoje meno."] },
  core3000_0031: { DA: ["at gå; at tage", "Jeg går hjem efter skole."], FI: ["mennä", "Menen koulun jälkeen kotiin."], CS: ["jít; jet", "Po škole jdu domů."], SK: ["ísť", "Po škole idem domov."] },
  core3000_0032: { DA: ["så", "Det er sent, så jeg går hjem."], FI: ["joten; niin", "On myöhä, joten menen kotiin."], CS: ["takže; proto", "Je pozdě, takže jdu domů."], SK: ["takže; preto", "Je neskoro, takže idem domov."] },
  core3000_0033: { DA: ["alle; hel", "Alle eleverne er her."], FI: ["kaikki; koko", "Kaikki oppilaat ovat täällä."], CS: ["všichni; celý", "Všichni žáci jsou tady."], SK: ["všetci; celý", "Všetci žiaci sú tu."] },
  core3000_0034: { DA: ["der", "Læg tasken der."], FI: ["siellä; sinne", "Laita laukku sinne."], CS: ["tam", "Polož tašku tam."], SK: ["tam", "Polož tašku tam."] },
  core3000_0035: { DA: ["at vide; at kende", "Jeg kender svaret."], FI: ["tietää; tuntea", "Tiedän vastauksen."], CS: ["vědět; znát", "Znám odpověď."], SK: ["vedieť; poznať", "Poznám odpoveď."] },
  core3000_0036: { DA: ["at få", "Jeg får en ny bog i dag."], FI: ["saada", "Saan tänään uuden kirjan."], CS: ["dostat; získat", "Dnes dostanu novou knihu."], SK: ["dostať; získať", "Dnes dostanem novú knihu."] },
  core3000_0037: { DA: ["at tænke; at tro", "Jeg tror, det er rigtigt."], FI: ["ajatella; olla mieltä", "Luulen, että tämä on oikein."], CS: ["myslet; domnívat se", "Myslím, že je to správně."], SK: ["myslieť; domnievať sa", "Myslím, že je to správne."] },
  core3000_0038: { DA: ["at lave; at gøre", "Jeg laver frokost derhjemme."], FI: ["tehdä; valmistaa", "Teen lounasta kotona."], CS: ["dělat; připravit", "Připravuji doma oběd."], SK: ["robiť; pripraviť", "Pripravujem doma obed."] },
  core3000_0039: { DA: ["tid", "Tid er vigtig."], FI: ["aika", "Aika on tärkeää."], CS: ["čas", "Čas je důležitý."], SK: ["čas", "Čas je dôležitý."] },
  core3000_0040: { DA: ["at se", "Jeg ser huset."], FI: ["nähdä", "Näen talon."], CS: ["vidět", "Vidím dům."], SK: ["vidieť", "Vidím dom."] },
  core3000_0041: { DA: ["ud", "Gå ud nu, tak."], FI: ["ulos", "Mene nyt ulos, ole hyvä."], CS: ["ven", "Prosím, vyjdi teď ven."], SK: ["von", "Prosím, vyjdi teraz von."] },
  core3000_0042: { DA: ["god; godt", "Det er en god dag."], FI: ["hyvä", "Tämä on hyvä päivä."], CS: ["dobrý", "To je dobrý den."], SK: ["dobrý", "To je dobrý deň."] },
  core3000_0043: { DA: ["mennesker; folk", "Der er mange mennesker her."], FI: ["ihmiset", "Täällä on paljon ihmisiä."], CS: ["lidé", "Je tu hodně lidí."], SK: ["ľudia", "Je tu veľa ľudí."] },
  core3000_0044: { DA: ["et år", "Et år har tolv måneder."], FI: ["vuosi", "Vuodessa on kaksitoista kuukautta."], CS: ["rok", "Rok má dvanáct měsíců."], SK: ["rok", "Rok má dvanásť mesiacov."] },
  core3000_0045: { DA: ["at tage", "Tag denne taske, tak."], FI: ["ottaa", "Ota tämä laukku, ole hyvä."], CS: ["vzít", "Vezmi prosím tu tašku."], SK: ["vziať", "Vezmi prosím tú tašku."] },
  core3000_0046: { DA: ["godt", "Hun læser godt."], FI: ["hyvin", "Hän lukee hyvin."], CS: ["dobře", "Čte dobře."], SK: ["dobre", "Číta dobre."] },
  core3000_0047: { DA: ["meget; rigtig", "Dette rum er meget lille."], FI: ["hyvin; todella", "Tämä huone on hyvin pieni."], CS: ["velmi", "Ten pokoj je velmi malý."], SK: ["veľmi", "Tá izba je veľmi malá."] },
  core3000_0048: { DA: ["bare; lige", "Jeg har bare brug for vand."], FI: ["vain; juuri", "Tarvitsen vain vettä."], CS: ["jen; právě", "Potřebuji jen vodu."], SK: ["iba; práve", "Potrebujem iba vodu."] },
  core3000_0049: { DA: ["at komme", "Kom her, tak."], FI: ["tulla", "Tule tänne, ole hyvä."], CS: ["přijít; přijet", "Pojď prosím sem."], SK: ["prísť", "Poď prosím sem."] },
  core3000_0050: { DA: ["at arbejde", "Jeg arbejder på en skole."], FI: ["työskennellä", "Työskentelen koulussa."], CS: ["pracovat", "Pracuji ve škole."], SK: ["pracovať", "Pracujem v škole."] },
  core3000_0051: { DA: ["at bruge", "Jeg bruger denne telefon hver dag."], FI: ["käyttää", "Käytän tätä puhelinta joka päivä."], CS: ["používat", "Používám ten telefon každý den."], SK: ["používať", "Používam tento telefón každý deň."] },
  core3000_0052: { DA: ["så; derefter", "Spis morgenmad, og gå derefter til skolen."], FI: ["sitten; silloin", "Syö aamiainen ja mene sitten kouluun."], CS: ["potom; tehdy", "Sněz snídani a potom jdi do školy."], SK: ["potom; vtedy", "Zjedz raňajky a potom choď do školy."] },
  core3000_0053: { DA: ["også", "Jeg taler også engelsk."], FI: ["myös", "Puhun myös englantia."], CS: ["také", "Mluvím také anglicky."], SK: ["tiež", "Hovorím tiež po anglicky."] },
  core3000_0054: { DA: ["kun; bare", "Jeg har kun én pen."], FI: ["vain", "Minulla on vain yksi kynä."], CS: ["jen; pouze", "Mám jen jedno pero."], SK: ["iba; len", "Mám iba jedno pero."] },
  core3000_0055: { DA: ["at se; at kigge", "Se på tavlen."], FI: ["katsoa", "Katso taulua."], CS: ["dívat se", "Podívej se na tabuli."], SK: ["pozerať sa", "Pozri sa na tabuľu."] },
  core3000_0056: { DA: ["at ville", "Jeg vil have en ny bog."], FI: ["haluta", "Haluan uuden kirjan."], CS: ["chtít", "Chci novou knihu."], SK: ["chcieť", "Chcem novú knihu."] },
  core3000_0057: { DA: ["at give", "Giv mig pennen, tak."], FI: ["antaa", "Anna minulle kynä, ole hyvä."], CS: ["dát", "Dej mi prosím pero."], SK: ["dať", "Daj mi prosím pero."] },
  core3000_0058: { DA: ["første", "Det er min første dag."], FI: ["ensimmäinen", "Tämä on ensimmäinen päiväni."], CS: ["první", "To je můj první den."], SK: ["prvý", "Toto je môj prvý deň."] },
  core3000_0059: { DA: ["ny", "Jeg har en ny telefon."], FI: ["uusi", "Minulla on uusi puhelin."], CS: ["nový", "Mám nový telefon."], SK: ["nový", "Mám nový telefón."] },
  core3000_0060: { DA: ["en måde; en vej", "Det er en god måde at lære på."], FI: ["tapa; tie", "Tämä on hyvä tapa oppia."], CS: ["způsob; cesta", "To je dobrý způsob učení."], SK: ["spôsob; cesta", "To je dobrý spôsob učenia."] },
  core3000_0061: { DA: ["at finde", "Jeg finder mine nøgler på bordet."], FI: ["löytää", "Löydän avaimeni pöydältä."], CS: ["najít", "Najdu klíče na stole."], SK: ["nájsť", "Nájdem kľúče na stole."] },
  core3000_0062: { DA: ["en dag", "En dag kan være meget travl."], FI: ["päivä", "Päivä voi olla hyvin kiireinen."], CS: ["den", "To může být velmi rušný den."], SK: ["deň", "Môže to byť veľmi rušný deň."] },
  core3000_0063: { DA: ["en ting; en sag", "Denne ting er nyttig."], FI: ["asia; esine", "Tämä esine on hyödyllinen."], CS: ["věc", "Ta věc je užitečná."], SK: ["vec", "Tá vec je užitočná."] },
  core3000_0064: { DA: ["rigtig; højre", "Dit svar er rigtigt."], FI: ["oikea", "Vastauksesi on oikea."], CS: ["správný; pravý", "Tvoje odpověď je správná."], SK: ["správny; pravý", "Tvoja odpoveď je správna."] },
  core3000_0065: { DA: ["hvordan", "Hvordan staver du dit navn?"], FI: ["miten", "Miten nimesi kirjoitetaan?"], CS: ["jak", "Jak se píše tvoje jméno?"], SK: ["ako", "Ako sa píše tvoje meno?"] },
  core3000_0066: { DA: ["tilbage", "Kom snart tilbage, tak."], FI: ["takaisin; takaosa", "Tule pian takaisin."], CS: ["zpět; záda", "Vrať se prosím brzy."], SK: ["späť; chrbát", "Vráť sa prosím čoskoro."] },
  core3000_0067: { DA: ["at betyde", "Hvad betyder dette ord?"], FI: ["tarkoittaa", "Mitä tämä sana tarkoittaa?"], CS: ["znamenat", "Co to slovo znamená?"], SK: ["znamenať", "Čo znamená toto slovo?"] },
  core3000_0068: { DA: ["selv", "Selv et barn kan gøre det."], FI: ["jopa", "Jopa lapsi voi tehdä tämän."], CS: ["dokonce; i", "Dokonce i dítě to může udělat."], SK: ["dokonca", "Dokonca aj dieťa to môže urobiť."] },
  core3000_0069: { DA: ["her", "Sæt dig her, tak."], FI: ["täällä; tänne", "Istu tähän, ole hyvä."], CS: ["tady; sem", "Posaď se prosím sem."], SK: ["tu; sem", "Sadni si prosím sem."] },
  core3000_0070: { DA: ["et barn", "Et barn leger udenfor."], FI: ["lapsi", "Lapsi leikkii ulkona."], CS: ["dítě", "Dítě si hraje venku."], SK: ["dieťa", "Dieťa sa hrá vonku."] },
  core3000_0071: { DA: ["at fortælle; at sige", "Fortæl mig dit navn, tak."], FI: ["kertoa; sanoa", "Kerro minulle nimesi, ole hyvä."], CS: ["říct; vyprávět", "Řekni mi prosím své jméno."], SK: ["povedať; rozprávať", "Povedz mi prosím svoje meno."] },
  core3000_0072: { DA: ["virkelig", "Jeg kan virkelig godt lide denne bog."], FI: ["todella", "Pidän tästä kirjasta todella paljon."], CS: ["opravdu", "Tu knihu mám opravdu rád."], SK: ["naozaj", "Túto knihu mám naozaj rád."] },
  core3000_0073: { DA: ["at ringe; at kalde", "Jeg ringer til min mor hver dag."], FI: ["soittaa; kutsua", "Soitan äidilleni joka päivä."], CS: ["volat; nazývat", "Každý den volám mámě."], SK: ["volať; nazývať", "Každý deň volám mame."] },
  core3000_0074: { DA: ["et firma; et selskab", "Et firma sælger disse telefoner."], FI: ["yritys", "Yritys myy näitä puhelimia."], CS: ["firma; společnost", "Firma prodává tyto telefony."], SK: ["firma; spoločnosť", "Firma predáva tieto telefóny."] },
  core3000_0075: { DA: ["at vise", "Vis mig kortet, tak."], FI: ["näyttää", "Näytä minulle kartta, ole hyvä."], CS: ["ukázat", "Ukaž mi prosím mapu."], SK: ["ukázať", "Ukáž mi prosím mapu."] },
  core3000_0076: { DA: ["liv", "Livet er anderledes her."], FI: ["elämä", "Elämä täällä on erilaista."], CS: ["život", "Život je tady jiný."], SK: ["život", "Život je tu iný."] },
  core3000_0077: { DA: ["en mand", "En mand venter udenfor."], FI: ["mies", "Mies odottaa ulkona."], CS: ["muž", "Muž čeká venku."], SK: ["muž", "Muž čaká vonku."] },
  core3000_0078: { DA: ["at ændre; at forandre sig", "Planer ændrer sig hurtigt."], FI: ["muuttaa; muuttua", "Suunnitelmat muuttuvat nopeasti."], CS: ["měnit; změnit se", "Plány se rychle mění."], SK: ["meniť; zmeniť sa", "Plány sa rýchlo menia."] },
  core3000_0079: { DA: ["et sted", "Dette sted er roligt."], FI: ["paikka", "Tämä paikka on hiljainen."], CS: ["místo", "To místo je klidné."], SK: ["miesto", "Toto miesto je tiché."] },
  core3000_0080: { DA: ["lang", "Det er en lang vej."], FI: ["pitkä", "Tämä on pitkä tie."], CS: ["dlouhý", "To je dlouhá cesta."], SK: ["dlhý", "Toto je dlhá cesta."] },
  core3000_0081: { DA: ["at føle", "Jeg føler mig glad i dag."], FI: ["tuntea", "Minusta tuntuu tänään hyvältä."], CS: ["cítit se", "Dnes se cítím dobře."], SK: ["cítiť sa", "Dnes sa cítim dobre."] },
  core3000_0082: { DA: ["for; også", "Denne taske er for tung."], FI: ["liian; myös", "Tämä laukku on liian painava."], CS: ["příliš; také", "Ta taška je příliš těžká."], SK: ["príliš; tiež", "Tá taška je príliš ťažká."] },
  core3000_0083: { DA: ["stadig", "Jeg bor stadig her."], FI: ["yhä; vielä", "Asun yhä täällä."], CS: ["stále; ještě", "Stále tady bydlím."], SK: ["stále; ešte", "Stále tu bývam."] },
  core3000_0084: { DA: ["et problem", "Det er et lille problem."], FI: ["ongelma", "Tämä on pieni ongelma."], CS: ["problém", "To je malý problém."], SK: ["problém", "Toto je malý problém."] },
  core3000_0085: { DA: ["at skrive", "Skriv dit navn, tak."], FI: ["kirjoittaa", "Kirjoita nimesi, ole hyvä."], CS: ["psát", "Napiš prosím své jméno."], SK: ["písať", "Napíš prosím svoje meno."] },
  core3000_0086: { DA: ["fantastisk; stor", "Det er en fantastisk idé."], FI: ["hieno; suuri", "Se on hieno idea."], CS: ["skvělý; velký", "To je skvělý nápad."], SK: ["skvelý; veľký", "To je skvelý nápad."] },
  core3000_0087: { DA: ["at prøve", "Jeg prøver at lære hver dag."], FI: ["yrittää; kokeilla", "Yritän oppia joka päivä."], CS: ["zkusit; snažit se", "Snažím se učit každý den."], SK: ["skúsiť; snažiť sa", "Snažím sa učiť každý deň."] },
  core3000_0088: { DA: ["at tage af sted; at forlade", "Vi tager af sted klokken otte."], FI: ["lähteä; jättää", "Lähdemme kahdeksalta."], CS: ["odcházet; odjet", "Odcházíme v osm."], SK: ["odchádzať; odísť", "Odchádzame o ôsmej."] },
  core3000_0089: { DA: ["et tal; et nummer", "Skriv tallet her."], FI: ["numero; luku", "Kirjoita numero tähän."], CS: ["číslo", "Napiš sem číslo."], SK: ["číslo", "Napíš sem číslo."] },
  core3000_0090: { DA: ["en del", "Denne del er vigtig."], FI: ["osa", "Tämä osa on tärkeä."], CS: ["část", "Ta část je důležitá."], SK: ["časť", "Táto časť je dôležitá."] },
  core3000_0091: { DA: ["et punkt; en pointe", "Dette punkt er klart."], FI: ["kohta; piste", "Tämä kohta on selvä."], CS: ["bod", "Ten bod je jasný."], SK: ["bod", "Tento bod je jasný."] },
  core3000_0092: { DA: ["at hjælpe", "Jeg hjælper min familie."], FI: ["auttaa", "Autan perhettäni."], CS: ["pomáhat", "Pomáhám rodině."], SK: ["pomáhať", "Pomáham rodine."] },
  core3000_0093: { DA: ["at spørge; at bede om", "Stil et spørgsmål, tak."], FI: ["kysyä; pyytää", "Esitä kysymys nyt."], CS: ["ptát se; požádat", "Polož prosím otázku."], SK: ["pýtať sa; požiadať", "Polož prosím otázku."] },
  core3000_0094: { DA: ["at møde", "Vi mødes på skolen."], FI: ["tavata", "Tapaamme koululla."], CS: ["potkat; setkat se", "Sejdeme se ve škole."], SK: ["stretnúť; stretnúť sa", "Stretneme sa v škole."] },
  core3000_0095: { DA: ["at begynde; at starte", "Timerne begynder klokken ni."], FI: ["alkaa; aloittaa", "Tunnit alkavat yhdeksältä."], CS: ["začít; začínat", "Hodina začíná v devět."], SK: ["začať; začínať", "Hodina sa začína o deviatej."] },
  core3000_0096: { DA: ["at tale; at snakke", "Jeg taler med min lærer."], FI: ["puhua", "Puhun opettajan kanssa."], CS: ["mluvit", "Mluvím s učitelem."], SK: ["rozprávať; hovoriť", "Rozprávam sa s učiteľom."] },
  core3000_0097: { DA: ["at lægge; at stille", "Læg bogen på bordet."], FI: ["laittaa; panna", "Laita kirja pöydälle."], CS: ["položit; dát", "Polož knihu na stůl."], SK: ["položiť; dať", "Polož knihu na stôl."] },
  core3000_0098: { DA: ["at blive", "Det kan blive et problem."], FI: ["tulla joksikin; muuttua", "Tästä voi tulla ongelma."], CS: ["stát se", "Může se z toho stát problém."], SK: ["stať sa", "Môže sa z toho stať problém."] },
  core3000_0099: { DA: ["interesse", "Hun viser interesse for musik."], FI: ["kiinnostus", "Hän on kiinnostunut musiikista."], CS: ["zájem", "Zajímá se o hudbu."], SK: ["záujem", "Zaujíma sa o hudbu."] },
  core3000_0100: { DA: ["et land", "Canada er et stort land."], FI: ["maa", "Kanada on suuri maa."], CS: ["země; stát", "Kanada je velká země."], SK: ["krajina; štát", "Kanada je veľká krajina."] },
  core3000_0101: { DA: ["gammel", "Det er et gammelt hus."], FI: ["vanha", "Tämä on vanha talo."], CS: ["starý", "To je starý dům."], SK: ["starý", "Toto je starý dom."] },
  core3000_0102: { DA: ["en skole", "Der er en skole tæt på mit hus."], FI: ["koulu", "Kotini lähellä on koulu."], CS: ["škola", "U mého domu je škola."], SK: ["škola", "Pri mojom dome je škola."] },
  core3000_0103: { DA: ["sen; forsinket", "Jeg kommer for sent til timen."], FI: ["myöhäinen; myöhässä", "Myöhästyn tunnilta."], CS: ["pozdní; pozdě", "Jdu pozdě na hodinu."], SK: ["neskorý; neskoro", "Meškám na hodinu."] },
  core3000_0104: { DA: ["høj", "Væggen er høj."], FI: ["korkea", "Seinä on korkea."], CS: ["vysoký", "Zeď je vysoká."], SK: ["vysoký", "Stena je vysoká."] },
  core3000_0105: { DA: ["forskellig; anderledes", "De to bøger er forskellige."], FI: ["erilainen", "Nämä kaksi kirjaa ovat erilaisia."], CS: ["jiný; různý", "Ty dvě knihy jsou různé."], SK: ["iný; rôzny", "Tieto dve knihy sú rôzne."] },
  core3000_0106: { DA: ["slutningen", "Slutningen på historien er trist."], FI: ["loppu", "Tarinan loppu on surullinen."], CS: ["konec", "Konec příběhu je smutný."], SK: ["koniec", "Koniec príbehu je smutný."] },
  core3000_0107: { DA: ["at bo; at leve", "Jeg bor i en lille by."], FI: ["asua; elää", "Asun pienessä kaupungissa."], CS: ["žít; bydlet", "Bydlím v malém městě."], SK: ["žiť; bývať", "Bývam v malom meste."] },
  core3000_0108: { DA: ["hvorfor", "Hvorfor er du her?"], FI: ["miksi", "Miksi olet täällä?"], CS: ["proč", "Proč jsi tady?"], SK: ["prečo", "Prečo si tu?"] },
  core3000_0109: { DA: ["verden", "Folk lever over hele verden."], FI: ["maailma", "Ihmisiä elää kaikkialla maailmassa."], CS: ["svět", "Lidé žijí po celém světě."], SK: ["svet", "Ľudia žijú na celom svete."] },
  core3000_0110: { DA: ["en uge", "En uge har syv dage."], FI: ["viikko", "Viikossa on seitsemän päivää."], CS: ["týden", "Týden má sedm dní."], SK: ["týždeň", "Týždeň má sedem dní."] },
  core3000_0111: { DA: ["at lege; at spille", "Børn leger i parken."], FI: ["leikkiä; pelata", "Lapset leikkivät puistossa."], CS: ["hrát si; hrát", "Děti si hrají v parku."], SK: ["hrať sa; hrať", "Deti sa hrajú v parku."] },
  core3000_0112: { DA: ["hjem; hjemme", "Jeg går hjem efter arbejde."], FI: ["kotiin; kotona", "Menen työn jälkeen kotiin."], CS: ["domů; doma", "Po práci jdu domů."], SK: ["domov; doma", "Po práci idem domov."] },
  core3000_0113: { DA: ["aldrig", "Jeg spiser aldrig kød."], FI: ["ei koskaan", "En koskaan syö lihaa."], CS: ["nikdy", "Nikdy nejím maso."], SK: ["nikdy", "Nikdy nejem mäso."] },
  core3000_0114: { DA: ["at inkludere; at indgå", "Morgenmad kan være inkluderet i prisen."], FI: ["sisältää; kuulua", "Aamiainen voi sisältyä hintaan."], CS: ["zahrnovat; obsahovat", "Cena může zahrnovat snídani."], SK: ["zahŕňať; obsahovať", "Cena môže zahŕňať raňajky."] },
  core3000_0115: { DA: ["et kursus", "Dette kursus begynder i dag."], FI: ["kurssi", "Tämä kurssi alkaa tänään."], CS: ["kurz", "Ten kurz začíná dnes."], SK: ["kurz", "Tento kurz sa začína dnes."] },
  core3000_0116: { DA: ["et hus", "Der ligger et hus tæt på skolen."], FI: ["talo", "Koulun lähellä on talo."], CS: ["dům", "U školy je dům."], SK: ["dom", "Pri škole je dom."] },
  core3000_0117: { DA: ["en rapport", "Rapporten er kort."], FI: ["raportti", "Raportti on lyhyt."], CS: ["zpráva", "Zpráva je krátká."], SK: ["správa", "Správa je krátka."] },
  core3000_0118: { DA: ["en gruppe", "En gruppe elever venter."], FI: ["ryhmä", "Ryhmä oppilaita odottaa."], CS: ["skupina", "Skupina žáků čeká."], SK: ["skupina", "Skupina žiakov čaká."] },
  core3000_0119: { DA: ["en sag; et tilfælde", "Denne sag er anderledes."], FI: ["tapaus; asia", "Tämä tapaus on erilainen."], CS: ["případ; věc", "Ten případ je jiný."], SK: ["prípad; vec", "Tento prípad je iný."] },
  core3000_0120: { DA: ["en kvinde", "En kvinde venter udenfor."], FI: ["nainen", "Nainen odottaa ulkona."], CS: ["žena", "Žena čeká venku."], SK: ["žena", "Žena čaká vonku."] },
  core3000_0121: { DA: ["en bog", "Denne bog er ny."], FI: ["kirja", "Tämä kirja on uusi."], CS: ["kniha", "Ta kniha je nová."], SK: ["kniha", "Táto kniha je nová."] },
  core3000_0122: { DA: ["en familie", "Min familie er hjemme."], FI: ["perhe", "Perheeni on kotona."], CS: ["rodina", "Moje rodina je doma."], SK: ["rodina", "Moja rodina je doma."] },
  core3000_0123: { DA: ["at virke; at se ud", "Det virker nemt."], FI: ["näyttää; vaikuttaa", "Tämä vaikuttaa helpolta."], CS: ["zdát se", "To se zdá snadné."], SK: ["zdať sa", "To sa zdá ľahké."] },
  core3000_0124: { DA: ["at lade; at tillade", "Lad mig hjælpe."], FI: ["antaa; sallia", "Anna minun auttaa."], CS: ["nechat; dovolit", "Nech mě pomoct."], SK: ["nechať; dovoliť", "Nechaj ma pomôcť."] },
  core3000_0125: { DA: ["igen", "Sig det igen, tak."], FI: ["taas; uudelleen", "Sano se vielä kerran."], CS: ["znovu; zase", "Řekni to prosím ještě jednou."], SK: ["znova; opäť", "Povedz to prosím ešte raz."] },
  core3000_0126: { DA: ["en slags; en type", "Denne slags te smager godt."], FI: ["laji; tyyppi", "Tällainen tee on hyvää."], CS: ["druh", "Ten druh čaje je dobrý."], SK: ["druh", "Tento druh čaju je dobrý."] },
  core3000_0127: { DA: ["at beholde; at lade ligge", "Lad din telefon ligge her."], FI: ["pitää; jättää", "Jätä puhelimesi tähän."], CS: ["nechat; držet", "Nech tady telefon."], SK: ["nechať; držať", "Nechaj tu telefón."] },
  core3000_0128: { DA: ["at høre", "Jeg hører musik udenfor."], FI: ["kuulla", "Kuulen musiikkia ulkoa."], CS: ["slyšet", "Slyším hudbu venku."], SK: ["počuť", "Počujem vonku hudbu."] },
  core3000_0129: { DA: ["et system", "Dette system er enkelt."], FI: ["järjestelmä", "Tämä järjestelmä on yksinkertainen."], CS: ["systém", "Ten systém je jednoduchý."], SK: ["systém", "Tento systém je jednoduchý."] },
  core3000_0130: { DA: ["et spørgsmål", "Stil et spørgsmål nu."], FI: ["kysymys", "Esitä nyt kysymys."], CS: ["otázka", "Polož teď otázku."], SK: ["otázka", "Polož teraz otázku."] },
  core3000_0131: { DA: ["altid", "Hun kommer altid tidligt."], FI: ["aina", "Hän tulee aina aikaisin."], CS: ["vždy", "Vždycky přichází brzy."], SK: ["vždy", "Vždy prichádza skoro."] },
  core3000_0132: { DA: ["stor", "Det er et stort rum."], FI: ["iso; suuri", "Tämä on iso huone."], CS: ["velký", "To je velký pokoj."], SK: ["veľký", "Toto je veľká izba."] },
  core3000_0133: { DA: ["et sæt", "Dette sæt består af seks kopper."], FI: ["setti; sarja", "Tässä setissä on kuusi kuppia."], CS: ["sada", "V té sadě je šest šálků."], SK: ["súprava; sada", "V tejto súprave je šesť šálok."] },
  core3000_0134: { DA: ["lille", "Det er et lille rum."], FI: ["pieni", "Tämä on pieni huone."], CS: ["malý", "To je malý pokoj."], SK: ["malý", "Toto je malá izba."] },
  core3000_0135: { DA: ["at studere; at lære", "Jeg studerer engelsk hver dag."], FI: ["opiskella; tutkia", "Opiskelen englantia joka päivä."], CS: ["studovat; učit se", "Každý den se učím anglicky."], SK: ["študovať; učiť sa", "Každý deň sa učím angličtinu."] },
  core3000_0136: { DA: ["at følge", "Følg læreren, tak."], FI: ["seurata; noudattaa", "Seuraa opettajaa."], CS: ["následovat; dodržovat", "Následuj prosím učitele."], SK: ["nasledovať; dodržiavať", "Nasleduj prosím učiteľa."] },
  core3000_0137: { DA: ["at begynde", "Timen kan begynde nu."], FI: ["alkaa", "Tunti voi alkaa nyt."], CS: ["začít", "Hodina může začít teď."], SK: ["začať", "Hodina sa môže začať teraz."] },
  core3000_0138: { DA: ["vigtig", "Dette spørgsmål er vigtigt."], FI: ["tärkeä", "Tämä kysymys on tärkeä."], CS: ["důležitý", "Ta otázka je důležitá."], SK: ["dôležitý", "Tá otázka je dôležitá."] },
  core3000_0139: { DA: ["at løbe", "Jeg løber i parken."], FI: ["juosta", "Juoksen puistossa."], CS: ["běžet; běhat", "Běhám v parku."], SK: ["bežať; behať", "Behám v parku."] },
  core3000_0140: { DA: ["at dreje; at vende", "Drej til venstre ved døren."], FI: ["kääntyä; kääntää", "Käänny vasemmalle oven luona."], CS: ["zahnout; otočit", "Zahni u dveří doleva."], SK: ["odbočiť; otočiť", "Odboč doľava pri dverách."] },
  core3000_0141: { DA: ["at tage med", "Tag din bog med, tak."], FI: ["tuoda; ottaa mukaan", "Tuo kirjasi, ole hyvä."], CS: ["přinést", "Přines prosím svou knihu."], SK: ["priniesť", "Prines prosím svoju knihu."] },
  core3000_0142: { DA: ["tidlig", "Vi skal begynde tidligt."], FI: ["aikainen; aikaisin", "Meidän täytyy aloittaa aikaisin."], CS: ["brzký; brzy", "Musíme začít brzy."], SK: ["skorý; skoro", "Musíme začať skoro."] },
  core3000_0143: { DA: ["en hånd", "Ræk hånden op."], FI: ["käsi", "Nosta kätesi."], CS: ["ruka", "Zvedni ruku."], SK: ["ruka", "Zdvihni ruku."] },
  core3000_0144: { DA: ["en delstat", "Californien er en stor delstat."], FI: ["osavaltio", "Kalifornia on suuri osavaltio."], CS: ["stát", "Kalifornie je velký stát."], SK: ["štát", "Kalifornia je veľký štát."] },
  core3000_0145: { DA: ["at flytte; at bevæge", "Flyt stolen, tak."], FI: ["liikuttaa; muuttaa", "Siirrä tuolia, ole hyvä."], CS: ["pohnout; přesunout", "Přesuň prosím židli."], SK: ["pohnúť; presunúť", "Presuň prosím stoličku."] },
  core3000_0146: { DA: ["penge", "Jeg har brug for penge til frokost."], FI: ["raha", "Tarvitsen rahaa lounaaseen."], CS: ["peníze", "Potřebuji peníze na oběd."], SK: ["peniaze", "Potrebujem peniaze na obed."] },
  core3000_0147: { DA: ["et faktum", "Det er et vigtigt faktum."], FI: ["tosiasia", "Tämä tosiasia on tärkeä."], CS: ["fakt", "Ten fakt je důležitý."], SK: ["fakt", "Tento fakt je dôležitý."] },
  core3000_0148: { DA: ["dog; alligevel", "Det er sent, men vi kan alligevel vente."], FI: ["kuitenkin", "On myöhä, mutta voimme silti odottaa."], CS: ["avšak; přesto", "Je pozdě, přesto můžeme počkat."], SK: ["avšak; napriek tomu", "Je neskoro, napriek tomu môžeme počkať."] },
  core3000_0149: { DA: ["et område", "Dette område er roligt."], FI: ["alue", "Tämä alue on hiljainen."], CS: ["oblast; okolí", "Ta oblast je klidná."], SK: ["oblasť; okolie", "Táto oblasť je tichá."] },
  core3000_0150: { DA: ["at tilbyde; at levere", "Skolen kan tilbyde frokost."], FI: ["tarjota; toimittaa", "Koulu voi tarjota lounaan."], CS: ["poskytnout; zajistit", "Škola může zajistit oběd."], SK: ["poskytnúť; zabezpečiť", "Škola môže zabezpečiť obed."] },
};

const languages = ["DA", "FI", "CS", "SK"];

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
  if (!localized) throw new Error(`Missing DA/FI/CS/SK translation for ${row.core_item_id}.`);
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
    translation_batch: "da_fi_cs_sk_v0",
    translation_status: "draft_native_style_qa_v2_checked",
    source_note: "Internal LunaCards draft translation layer; native-style QA v2 checked, final QA and source-assisted checks still required before delivery.",
  };
  for (const language of languages) {
    const [display, example] = localized[language] ?? [];
    out[language] = normalizeText(display);
    out[`example_${language}`] = normalizeText(example);
  }
  return out;
});

await fs.mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `${releaseId}_translation_batch_da_fi_cs_sk_v0.jsonl`);
await writeJsonl(outputPath, outputRows);

const summaryPath = path.join(outputDir, `${releaseId}_translation_batch_da_fi_cs_sk_v0_summary.md`);
await fs.writeFile(
  summaryPath,
  [
    `# Translation Batch DA/FI/CS/SK v0: ${releaseId}`,
    "",
    `- Rows: ${outputRows.length}`,
    "- Languages: DA, FI, CS, SK",
    "- Fields: display word plus translated example only",
    "- Target-language transcription fields: not generated",
    "- Status: draft_native_style_qa_v2_checked",
    "",
    "This artifact does not import Postgres rows and does not create a Google Sheet.",
    "Function words may use learner-facing glosses where a direct one-word target equivalent is misleading.",
    "Native-style QA v2 repaired obvious naturalness/copy issues during drafting; final QA evidence is still not created.",
    "",
  ].join("\n"),
  "utf8"
);

console.log(
  `English Core 3000 DA/FI/CS/SK translation batch written: ${path.relative(process.cwd(), outputPath)} rows=${outputRows.length}`
);
