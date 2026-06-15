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
  core3000_0001: { PL: ["przedimek określony", "Drzwi są otwarte."], NL: ["de; het", "De deur is open."], SV: ["bestämd artikel", "Dörren är öppen."], NO: ["bestemt artikkel", "Døren er åpen."] },
  core3000_0002: { PL: ["być", "Chcę tu być."], NL: ["zijn", "Ik wil klaar zijn."], SV: ["vara", "Jag vill vara redo."], NO: ["å være", "Jeg vil være klar."] },
  core3000_0003: { PL: ["i", "Herbata i woda są na stole."], NL: ["en", "Thee en water staan op tafel."], SV: ["och", "Te och vatten står på bordet."], NO: ["og", "Te og vann står på bordet."] },
  core3000_0004: { PL: ["z; dopełniacz", "Filiżanka herbaty jest gorąca."], NL: ["van", "Een kop thee is heet."], SV: ["av", "En kopp te är varm."], NO: ["av", "En kopp te er varm."] },
  core3000_0005: { PL: ["forma bezokolicznika", "Chcę iść do domu."], NL: ["te; naar", "Ik wil naar huis gaan."], SV: ["att", "Jag vill gå hem."], NO: ["å; til", "Jeg vil gå hjem."] },
  core3000_0006: { PL: ["nieokreślony przedimek", "Mam książkę."], NL: ["een", "Ik heb een boek."], SV: ["en; ett", "Jag har en bok."], NO: ["en; et", "Jeg har en bok."] },
  core3000_0007: { PL: ["w", "Klucz jest w torbie."], NL: ["in", "De sleutel zit in de tas."], SV: ["i", "Nyckeln ligger i väskan."], NO: ["i", "Nøkkelen ligger i vesken."] },
  core3000_0008: { PL: ["mieć", "Mam telefon."], NL: ["hebben", "Ik heb een telefoon."], SV: ["ha", "Jag har en telefon."], NO: ["å ha", "Jeg har en telefon."] },
  core3000_0009: { PL: ["to; ono", "To jest w torbie."], NL: ["het; dat", "Het zit in de tas."], SV: ["det", "Det ligger i väskan."], NO: ["det", "Det ligger i vesken."] },
  core3000_0010: { PL: ["ty; pan/pani", "Jesteś moim przyjacielem."], NL: ["jij; u", "Jij bent mijn vriend."], SV: ["du; ni", "Du är min vän."], NO: ["du; dere", "Du er vennen min."] },
  core3000_0011: { PL: ["on", "On jest w szkole."], NL: ["hij", "Hij is op school."], SV: ["han", "Han är i skolan."], NO: ["han", "Han er på skolen."] },
  core3000_0012: { PL: ["dla; za", "Ten prezent jest dla ciebie."], NL: ["voor", "Dit cadeau is voor jou."], SV: ["för; till", "Den här presenten är till dig."], NO: ["for; til", "Denne gaven er til deg."] },
  core3000_0013: { PL: ["oni; one", "Oni są w domu."], NL: ["zij; ze", "Zij zijn thuis."], SV: ["de; dom", "De är hemma."], NO: ["de", "De er hjemme."] },
  core3000_0014: { PL: ["nie", "Nie czuję zmęczenia."], NL: ["niet", "Ik ben niet moe."], SV: ["inte", "Jag är inte trött."], NO: ["ikke", "Jeg er ikke trøtt."] },
  core3000_0015: { PL: ["tamten; ten", "Tamta książka jest moja."], NL: ["die; dat", "Dat boek is van mij."], SV: ["den där; det där", "Den där boken är min."], NO: ["den; det", "Den boken er min."] },
  core3000_0016: { PL: ["my", "Jesteśmy gotowi."], NL: ["wij; we", "Wij zijn klaar."], SV: ["vi", "Vi är redo."], NO: ["vi", "Vi er klare."] },
  core3000_0017: { PL: ["na", "Kubek jest na stole."], NL: ["op", "Het kopje staat op tafel."], SV: ["på", "Koppen står på bordet."], NO: ["på", "Koppen står på bordet."] },
  core3000_0018: { PL: ["z", "Jestem z rodziną."], NL: ["met", "Ik ben bij mijn familie."], SV: ["med", "Jag är med min familj."], NO: ["med", "Jeg er med familien min."] },
  core3000_0019: { PL: ["ten; ta; to", "Ta książka jest nowa."], NL: ["deze; dit", "Dit boek is nieuw."], SV: ["den här; det här", "Den här boken är ny."], NO: ["denne; dette", "Denne boken er ny."] },
  core3000_0020: { PL: ["ja", "Jestem w domu."], NL: ["ik", "Ik ben thuis."], SV: ["jag", "Jag är hemma."], NO: ["jeg", "Jeg er hjemme."] },
  core3000_0021: { PL: ["robić", "Odrabiam pracę domową."], NL: ["doen", "Ik maak mijn huiswerk."], SV: ["göra", "Jag gör mina läxor."], NO: ["å gjøre", "Jeg gjør leksene mine."] },
  core3000_0022: { PL: ["jako", "Ona pracuje jako nauczycielka."], NL: ["als", "Zij werkt als docent."], SV: ["som", "Hon arbetar som lärare."], NO: ["som", "Hun jobber som lærer."] },
  core3000_0023: { PL: ["w; przy; o", "Spotkajmy się w szkole."], NL: ["bij; op", "Ontmoet me op school."], SV: ["vid; på", "Möt mig vid skolan."], NO: ["ved; på", "Møt meg på skolen."] },
  core3000_0024: { PL: ["ona", "Ona jest moją siostrą."], NL: ["zij; ze", "Zij is mijn zus."], SV: ["hon", "Hon är min syster."], NO: ["hun", "Hun er søsteren min."] },
  core3000_0025: { PL: ["ale", "Jest późno, ale zostaję."], NL: ["maar", "Ik ben moe, maar blij."], SV: ["men", "Jag är trött, men glad."], NO: ["men", "Jeg er trøtt, men glad."] },
  core3000_0026: { PL: ["z; od", "Jestem z Kanady."], NL: ["uit; van", "Ik kom uit Canada."], SV: ["från", "Jag kommer från Kanada."], NO: ["fra", "Jeg kommer fra Canada."] },
  core3000_0027: { PL: ["przy; obok", "Torba jest przy drzwiach."], NL: ["bij; naast", "De tas staat naast de deur."], SV: ["vid; bredvid", "Väskan står vid dörren."], NO: ["ved; ved siden av", "Vesken står ved døren."] },
  core3000_0028: { PL: ["będzie; będę", "Zadzwonię do ciebie."], NL: ["zal; zullen", "Ik zal je bellen."], SV: ["ska; kommer att", "Jag ska ringa dig."], NO: ["skal; kommer til å", "Jeg skal ringe deg."] },
  core3000_0029: { PL: ["albo; lub", "Herbata albo kawa będzie dobra."], NL: ["of", "Thee of koffie is prima."], SV: ["eller", "Te eller kaffe går bra."], NO: ["eller", "Te eller kaffe går fint."] },
  core3000_0030: { PL: ["powiedzieć; mówić", "Proszę, podaj swoje imię."], NL: ["zeggen", "Zeg alsjeblieft je naam."], SV: ["säga", "Säg ditt namn, tack."], NO: ["å si", "Si navnet ditt, vær så snill."] },
  core3000_0031: { PL: ["iść; jechać", "Po szkole idę do domu."], NL: ["gaan", "Ik ga na school naar huis."], SV: ["gå; åka", "Jag går hem efter skolan."], NO: ["å gå; å dra", "Jeg går hjem etter skolen."] },
  core3000_0032: { PL: ["więc; dlatego", "Jest późno, więc idę do domu."], NL: ["dus", "Het is laat, dus ik ga naar huis."], SV: ["så", "Det är sent, så jag går hem."], NO: ["så", "Det er sent, så jeg går hjem."] },
  core3000_0033: { PL: ["wszyscy; cały", "Wszyscy uczniowie są tutaj."], NL: ["alle; heel", "Alle leerlingen zijn hier."], SV: ["alla; allt", "Alla elever är här."], NO: ["alle; alt", "Alle elevene er her."] },
  core3000_0034: { PL: ["tam", "Połóż torbę tam."], NL: ["daar", "Zet de tas daar neer."], SV: ["där", "Lägg väskan där."], NO: ["der", "Legg vesken der."] },
  core3000_0035: { PL: ["wiedzieć; znać", "Znam odpowiedź."], NL: ["weten; kennen", "Ik weet het antwoord."], SV: ["veta; känna till", "Jag vet svaret."], NO: ["å vite; å kjenne", "Jeg vet svaret."] },
  core3000_0036: { PL: ["dostać; otrzymać", "Dziś dostanę nową książkę."], NL: ["krijgen", "Ik krijg vandaag een nieuw boek."], SV: ["få", "Jag får en ny bok i dag."], NO: ["å få", "Jeg får en ny bok i dag."] },
  core3000_0037: { PL: ["myśleć; uważać", "Myślę, że to jest dobre."], NL: ["denken", "Ik denk dat dit klopt."], SV: ["tycka; tänka", "Jag tror att det här stämmer."], NO: ["å tenke; å tro", "Jeg tror dette er riktig."] },
  core3000_0038: { PL: ["robić; przygotować", "Robię obiad w domu."], NL: ["maken", "Ik maak thuis lunch."], SV: ["göra; laga", "Jag lagar lunch hemma."], NO: ["å lage; å gjøre", "Jeg lager lunsj hjemme."] },
  core3000_0039: { PL: ["czas", "Czas jest ważny."], NL: ["de tijd", "Tijd is belangrijk."], SV: ["tid", "Tid är viktigt."], NO: ["tid", "Tid er viktig."] },
  core3000_0040: { PL: ["widzieć", "Widzę dom."], NL: ["zien", "Ik zie het huis."], SV: ["se", "Jag ser huset."], NO: ["å se", "Jeg ser huset."] },
  core3000_0041: { PL: ["na zewnątrz", "Proszę wyjść teraz."], NL: ["naar buiten", "Ga nu naar buiten."], SV: ["ut", "Gå ut nu, tack."], NO: ["ut", "Gå ut nå, vær så snill."] },
  core3000_0042: { PL: ["dobry", "To dobry dzień."], NL: ["goed", "Dit is een goede dag."], SV: ["bra; god", "Det här är en bra dag."], NO: ["god; bra", "Dette er en god dag."] },
  core3000_0043: { PL: ["ludzie", "Jest tu wielu ludzi."], NL: ["mensen", "Er zijn hier veel mensen."], SV: ["människor; folk", "Det är många människor här."], NO: ["mennesker; folk", "Det er mange mennesker her."] },
  core3000_0044: { PL: ["rok", "Rok ma dwanaście miesięcy."], NL: ["het jaar", "Een jaar heeft twaalf maanden."], SV: ["ett år", "Ett år har tolv månader."], NO: ["et år", "Et år har tolv måneder."] },
  core3000_0045: { PL: ["wziąć; zabrać", "Proszę, weź tę torbę."], NL: ["nemen", "Neem alsjeblieft deze tas."], SV: ["ta", "Ta den här väskan, tack."], NO: ["å ta", "Ta denne vesken, vær så snill."] },
  core3000_0046: { PL: ["dobrze", "Ona dobrze czyta."], NL: ["goed", "Zij leest goed."], SV: ["bra; väl", "Hon läser bra."], NO: ["bra; godt", "Hun leser godt."] },
  core3000_0047: { PL: ["bardzo", "Ten pokój jest bardzo mały."], NL: ["heel; erg", "Deze kamer is heel klein."], SV: ["mycket; väldigt", "Det här rummet är väldigt litet."], NO: ["veldig; svært", "Dette rommet er veldig lite."] },
  core3000_0048: { PL: ["tylko; właśnie", "Potrzebuję tylko wody."], NL: ["alleen; net", "Ik heb alleen water nodig."], SV: ["bara; just", "Jag behöver bara vatten."], NO: ["bare; nettopp", "Jeg trenger bare vann."] },
  core3000_0049: { PL: ["przyjść; przyjechać", "Proszę, chodź tutaj."], NL: ["komen", "Kom hier, alsjeblieft."], SV: ["komma", "Kom hit, tack."], NO: ["å komme", "Kom hit, vær så snill."] },
  core3000_0050: { PL: ["pracować", "Pracuję w szkole."], NL: ["werken", "Ik werk op een school."], SV: ["arbeta; jobba", "Jag arbetar på en skola."], NO: ["å jobbe; å arbeide", "Jeg jobber på en skole."] },
  core3000_0051: { PL: ["używać", "Codziennie używam tego telefonu."], NL: ["gebruiken", "Ik gebruik deze telefoon elke dag."], SV: ["använda", "Jag använder den här telefonen varje dag."], NO: ["å bruke", "Jeg bruker denne telefonen hver dag."] },
  core3000_0052: { PL: ["potem; wtedy", "Zjedz śniadanie, potem idź do szkoły."], NL: ["dan; daarna", "Eet ontbijt en ga daarna naar school."], SV: ["sedan; då", "Ät frukost och gå sedan till skolan."], NO: ["så; deretter", "Spis frokost, og gå deretter til skolen."] },
  core3000_0053: { PL: ["też; również", "Mówię też po angielsku."], NL: ["ook", "Ik spreek ook Engels."], SV: ["också", "Jag talar också engelska."], NO: ["også", "Jeg snakker også engelsk."] },
  core3000_0054: { PL: ["tylko", "Mam tylko jeden długopis."], NL: ["alleen", "Ik heb maar één pen."], SV: ["bara", "Jag har bara en penna."], NO: ["bare", "Jeg har bare én penn."] },
  core3000_0055: { PL: ["patrzeć", "Spójrz na tablicę."], NL: ["kijken", "Kijk naar het bord."], SV: ["titta", "Titta på tavlan."], NO: ["å se", "Se på tavlen."] },
  core3000_0056: { PL: ["chcieć", "Chcę nową książkę."], NL: ["willen", "Ik wil een nieuw boek."], SV: ["vilja", "Jag vill ha en ny bok."], NO: ["å ville", "Jeg vil ha en ny bok."] },
  core3000_0057: { PL: ["dać", "Proszę, daj mi długopis."], NL: ["geven", "Geef me alsjeblieft de pen."], SV: ["ge", "Ge mig pennan, tack."], NO: ["å gi", "Gi meg pennen, vær så snill."] },
  core3000_0058: { PL: ["pierwszy", "To mój pierwszy dzień."], NL: ["eerste", "Dit is mijn eerste dag."], SV: ["första", "Det här är min första dag."], NO: ["første", "Dette er min første dag."] },
  core3000_0059: { PL: ["nowy", "Mam nowy telefon."], NL: ["nieuw", "Ik heb een nieuwe telefoon."], SV: ["ny", "Jag har en ny telefon."], NO: ["ny", "Jeg har en ny telefon."] },
  core3000_0060: { PL: ["sposób; droga", "To dobry sposób nauki."], NL: ["de manier; de weg", "Dit is een goede manier om te leren."], SV: ["ett sätt; en väg", "Det här är ett bra sätt att lära sig."], NO: ["en måte; en vei", "Dette er en god måte å lære på."] },
  core3000_0061: { PL: ["znaleźć", "Znajduję swoje klucze na stole."], NL: ["vinden", "Ik vind mijn sleutels op tafel."], SV: ["hitta", "Jag hittar mina nycklar på bordet."], NO: ["å finne", "Jeg finner nøklene mine på bordet."] },
  core3000_0062: { PL: ["dzień", "To może być bardzo pracowity dzień."], NL: ["de dag", "Een dag kan erg druk zijn."], SV: ["en dag", "En dag kan vara mycket hektisk."], NO: ["en dag", "En dag kan være veldig travel."] },
  core3000_0063: { PL: ["rzecz", "Ta rzecz jest przydatna."], NL: ["het ding; de zaak", "Dit ding is nuttig."], SV: ["en sak", "Den här saken är användbar."], NO: ["en ting; en sak", "Denne tingen er nyttig."] },
  core3000_0064: { PL: ["prawidłowy; prawy", "Twoja odpowiedź jest prawidłowa."], NL: ["juist; rechts", "Je antwoord is juist."], SV: ["rätt; höger", "Ditt svar är rätt."], NO: ["riktig; høyre", "Svaret ditt er riktig."] },
  core3000_0065: { PL: ["jak", "Jak się pisze twoje imię?"], NL: ["hoe", "Hoe spel je je naam?"], SV: ["hur", "Hur stavar du ditt namn?"], NO: ["hvordan", "Hvordan staver du navnet ditt?"] },
  core3000_0066: { PL: ["z powrotem; tył", "Proszę, wróć niedługo."], NL: ["terug; achter", "Kom alsjeblieft snel terug."], SV: ["tillbaka", "Kom tillbaka snart, tack."], NO: ["tilbake", "Kom snart tilbake, vær så snill."] },
  core3000_0067: { PL: ["znaczyć", "Co znaczy to słowo?"], NL: ["betekenen", "Wat betekent dit woord?"], SV: ["betyda", "Vad betyder det här ordet?"], NO: ["å bety", "Hva betyr dette ordet?"] },
  core3000_0068: { PL: ["nawet", "Nawet dziecko może to zrobić."], NL: ["zelfs", "Zelfs een kind kan dit doen."], SV: ["till och med", "Till och med ett barn kan göra det här."], NO: ["til og med", "Til og med et barn kan gjøre dette."] },
  core3000_0069: { PL: ["tutaj", "Proszę, usiądź tutaj."], NL: ["hier", "Ga hier zitten, alsjeblieft."], SV: ["här", "Sätt dig här, tack."], NO: ["her", "Sett deg her, vær så snill."] },
  core3000_0070: { PL: ["dziecko", "Dziecko bawi się na zewnątrz."], NL: ["het kind", "Een kind speelt buiten."], SV: ["ett barn", "Ett barn leker ute."], NO: ["et barn", "Et barn leker ute."] },
  core3000_0071: { PL: ["powiedzieć; opowiedzieć", "Proszę, podaj mi swoje imię."], NL: ["vertellen; zeggen", "Vertel me alsjeblieft je naam."], SV: ["berätta; säga", "Säg ditt namn till mig, tack."], NO: ["å fortelle; å si", "Fortell meg navnet ditt, vær så snill."] },
  core3000_0072: { PL: ["naprawdę", "Naprawdę lubię tę książkę."], NL: ["echt", "Ik vind dit boek echt leuk."], SV: ["verkligen", "Jag tycker verkligen om den här boken."], NO: ["virkelig", "Jeg liker virkelig denne boken."] },
  core3000_0073: { PL: ["dzwonić; nazywać", "Codziennie dzwonię do mamy."], NL: ["bellen; noemen", "Ik bel mijn moeder elke dag."], SV: ["ringa; kalla", "Jag ringer min mamma varje dag."], NO: ["å ringe; å kalle", "Jeg ringer moren min hver dag."] },
  core3000_0074: { PL: ["firma; spółka", "Firma sprzedaje te telefony."], NL: ["het bedrijf", "Een bedrijf verkoopt deze telefoons."], SV: ["ett företag", "Ett företag säljer de här telefonerna."], NO: ["et selskap; et firma", "Et firma selger disse telefonene."] },
  core3000_0075: { PL: ["pokazać", "Proszę, pokaż mi mapę."], NL: ["laten zien; tonen", "Laat me alsjeblieft de kaart zien."], SV: ["visa", "Visa mig kartan, tack."], NO: ["å vise", "Vis meg kartet, vær så snill."] },
  core3000_0076: { PL: ["życie", "Życie tutaj jest inne."], NL: ["het leven", "Het leven is hier anders."], SV: ["liv", "Livet är annorlunda här."], NO: ["liv", "Livet er annerledes her."] },
  core3000_0077: { PL: ["mężczyzna", "Mężczyzna czeka na zewnątrz."], NL: ["de man", "Een man wacht buiten."], SV: ["en man", "En man väntar utanför."], NO: ["en mann", "En mann venter utenfor."] },
  core3000_0078: { PL: ["zmieniać; zmienić się", "Plany szybko się zmieniają."], NL: ["veranderen", "Plannen veranderen snel."], SV: ["ändra; förändras", "Planer ändras snabbt."], NO: ["å endre; å forandre seg", "Planer endrer seg raskt."] },
  core3000_0079: { PL: ["miejsce", "To miejsce jest ciche."], NL: ["de plek; de plaats", "Deze plek is rustig."], SV: ["en plats", "Den här platsen är lugn."], NO: ["et sted", "Dette stedet er stille."] },
  core3000_0080: { PL: ["długi", "To długa droga."], NL: ["lang", "Dit is een lange weg."], SV: ["lång", "Det här är en lång väg."], NO: ["lang", "Dette er en lang vei."] },
  core3000_0081: { PL: ["czuć się", "Dziś czuję się dobrze."], NL: ["voelen", "Ik voel me vandaag gelukkig."], SV: ["känna", "Jag känner mig glad i dag."], NO: ["å føle", "Jeg føler meg glad i dag."] },
  core3000_0082: { PL: ["zbyt; też", "Ta torba jest zbyt ciężka."], NL: ["te; ook", "Deze tas is te zwaar."], SV: ["för; också", "Den här väskan är för tung."], NO: ["for; også", "Denne vesken er for tung."] },
  core3000_0083: { PL: ["wciąż; nadal", "Wciąż mieszkam tutaj."], NL: ["nog steeds", "Ik woon hier nog steeds."], SV: ["fortfarande", "Jag bor fortfarande här."], NO: ["fortsatt", "Jeg bor fortsatt her."] },
  core3000_0084: { PL: ["problem", "To mały problem."], NL: ["het probleem", "Dit is een klein probleem."], SV: ["ett problem", "Det här är ett litet problem."], NO: ["et problem", "Dette er et lite problem."] },
  core3000_0085: { PL: ["pisać", "Proszę, napisz swoje imię."], NL: ["schrijven", "Schrijf alsjeblieft je naam."], SV: ["skriva", "Skriv ditt namn, tack."], NO: ["å skrive", "Skriv navnet ditt, vær så snill."] },
  core3000_0086: { PL: ["świetny; wielki", "To świetny pomysł."], NL: ["geweldig; groot", "Dat is een geweldig idee."], SV: ["bra; stor", "Det här är en bra idé."], NO: ["flott; stor", "Dette er en flott idé."] },
  core3000_0087: { PL: ["próbować; starać się", "Staram się uczyć codziennie."], NL: ["proberen", "Ik probeer elke dag te leren."], SV: ["försöka", "Jag försöker lära mig varje dag."], NO: ["å prøve", "Jeg prøver å lære hver dag."] },
  core3000_0088: { PL: ["wychodzić; wyjeżdżać", "Wychodzimy o ósmej."], NL: ["vertrekken; weggaan", "We vertrekken om acht uur."], SV: ["lämna; åka", "Vi åker klockan åtta."], NO: ["å dra; å forlate", "Vi drar klokken åtte."] },
  core3000_0089: { PL: ["liczba; numer", "Napisz tutaj liczbę."], NL: ["het nummer; het getal", "Schrijf het nummer hier."], SV: ["ett nummer; ett tal", "Skriv numret här."], NO: ["et nummer; et tall", "Skriv tallet her."] },
  core3000_0090: { PL: ["część", "Ta część jest ważna."], NL: ["het deel", "Dit deel is belangrijk."], SV: ["en del", "Den här delen är viktig."], NO: ["en del", "Denne delen er viktig."] },
  core3000_0091: { PL: ["punkt", "Ten punkt jest jasny."], NL: ["het punt", "Dit punt is duidelijk."], SV: ["en punkt", "Den här punkten är tydlig."], NO: ["et punkt; et poeng", "Dette punktet er klart."] },
  core3000_0092: { PL: ["pomagać", "Pomagam rodzinie."], NL: ["helpen", "Ik help mijn vriend."], SV: ["hjälpa", "Jag hjälper min vän."], NO: ["å hjelpe", "Jeg hjelper vennen min."] },
  core3000_0093: { PL: ["pytać; prosić", "Proszę, zadaj pytanie."], NL: ["vragen", "Stel alsjeblieft een vraag."], SV: ["fråga; be om", "Ställ en fråga, tack."], NO: ["å spørre; å be", "Still et spørsmål, vær så snill."] },
  core3000_0094: { PL: ["spotkać", "Spotykamy się w szkole."], NL: ["ontmoeten", "We ontmoeten elkaar op school."], SV: ["träffa; möta", "Vi träffas i skolan."], NO: ["å møte", "Vi møtes på skolen."] },
  core3000_0095: { PL: ["zaczynać", "Zajęcia zaczynają się o dziewiątej."], NL: ["beginnen; starten", "De lessen beginnen om negen uur."], SV: ["börja; starta", "Lektionerna börjar klockan nio."], NO: ["å begynne; å starte", "Timene begynner klokken ni."] },
  core3000_0096: { PL: ["rozmawiać", "Rozmawiam z nauczycielem."], NL: ["praten", "Ik praat met mijn leraar."], SV: ["prata; tala", "Jag pratar med min lärare."], NO: ["å snakke", "Jeg snakker med læreren min."] },
  core3000_0097: { PL: ["kłaść; położyć", "Połóż książkę na stole."], NL: ["leggen; zetten", "Leg het boek op tafel."], SV: ["lägga; ställa", "Lägg boken på bordet."], NO: ["å legge; å sette", "Legg boken på bordet."] },
  core3000_0098: { PL: ["zostać; stać się", "To może stać się problemem."], NL: ["worden", "Ik wil leraar worden."], SV: ["bli", "Jag vill bli lärare."], NO: ["å bli", "Jeg vil bli lærer."] },
  core3000_0099: { PL: ["zainteresowanie", "Ona interesuje się muzyką."], NL: ["de interesse", "Ze heeft interesse in muziek."], SV: ["intresse", "Hon visar intresse för musik."], NO: ["interesse", "Hun viser interesse for musikk."] },
  core3000_0100: { PL: ["kraj", "Kanada to duży kraj."], NL: ["het land", "Canada is een groot land."], SV: ["ett land", "Kanada är ett stort land."], NO: ["et land", "Canada er et stort land."] },
  core3000_0101: { PL: ["stary", "To stary dom."], NL: ["oud", "Dit is een oud huis."], SV: ["gammal", "Det här är ett gammalt hus."], NO: ["gammel", "Dette er et gammelt hus."] },
  core3000_0102: { PL: ["szkoła", "W pobliżu mojego domu jest szkoła."], NL: ["de school", "Er is een school in de buurt van mijn huis."], SV: ["en skola", "Det finns en skola nära mitt hus."], NO: ["en skole", "Det er en skole i nærheten av huset mitt."] },
  core3000_0103: { PL: ["późny; spóźniony", "Spóźniam się na zajęcia."], NL: ["laat; te laat", "Ik ben te laat voor de les."], SV: ["sen", "Jag är sen till lektionen."], NO: ["sen; forsinket", "Jeg er sen til timen."] },
  core3000_0104: { PL: ["wysoki", "Ściana jest wysoka."], NL: ["hoog", "De muur is hoog."], SV: ["hög", "Väggen är hög."], NO: ["høy", "Veggen er høy."] },
  core3000_0105: { PL: ["inny; różny", "Te dwie książki są różne."], NL: ["anders; verschillend", "Deze twee boeken zijn verschillend."], SV: ["olika; annorlunda", "De här två böckerna är olika."], NO: ["forskjellig; annerledes", "Disse to bøkene er forskjellige."] },
  core3000_0106: { PL: ["koniec", "Koniec historii jest smutny."], NL: ["het einde", "Het einde van het verhaal is verdrietig."], SV: ["slutet", "Slutet på berättelsen är sorgligt."], NO: ["slutten", "Slutten på historien er trist."] },
  core3000_0107: { PL: ["żyć; mieszkać", "Mieszkam w małym mieście."], NL: ["wonen; leven", "Ik woon in een kleine stad."], SV: ["bo; leva", "Jag bor i en liten stad."], NO: ["å bo; å leve", "Jeg bor i en liten by."] },
  core3000_0108: { PL: ["dlaczego", "Dlaczego tu jesteś?"], NL: ["waarom", "Waarom ben je hier?"], SV: ["varför", "Varför är du här?"], NO: ["hvorfor", "Hvorfor er du her?"] },
  core3000_0109: { PL: ["świat", "Ludzie żyją na całym świecie."], NL: ["de wereld", "Mensen leven over de hele wereld."], SV: ["världen", "Människor lever över hela världen."], NO: ["verden", "Folk lever over hele verden."] },
  core3000_0110: { PL: ["tydzień", "Tydzień ma siedem dni."], NL: ["de week", "Een week heeft zeven dagen."], SV: ["en vecka", "En vecka har sju dagar."], NO: ["en uke", "En uke har sju dager."] },
  core3000_0111: { PL: ["bawić się; grać", "Dzieci bawią się w parku."], NL: ["spelen", "Kinderen spelen in het park."], SV: ["leka; spela", "Barn leker i parken."], NO: ["å leke; å spille", "Barn leker i parken."] },
  core3000_0112: { PL: ["do domu; w domu", "Po pracy idę do domu."], NL: ["naar huis; thuis", "Ik ga na het werk naar huis."], SV: ["hem; hemma", "Jag går hem efter jobbet."], NO: ["hjem; hjemme", "Jeg går hjem etter jobb."] },
  core3000_0113: { PL: ["nigdy", "Nigdy nie jem mięsa."], NL: ["nooit", "Ik eet nooit vlees."], SV: ["aldrig", "Jag äter aldrig kött."], NO: ["aldri", "Jeg spiser aldri kjøtt."] },
  core3000_0114: { PL: ["zawierać; obejmować", "Ta cena może obejmować śniadanie."], NL: ["omvatten; inbegrepen zijn", "Bij deze prijs kan ontbijt inbegrepen zijn."], SV: ["inkludera; ingå", "Frukost kan ingå i priset."], NO: ["å inkludere; å være inkludert", "Frokost kan være inkludert i prisen."] },
  core3000_0115: { PL: ["kurs", "Ten kurs zaczyna się dzisiaj."], NL: ["de cursus", "Deze cursus begint vandaag."], SV: ["en kurs", "Den här kursen börjar i dag."], NO: ["et kurs", "Dette kurset begynner i dag."] },
  core3000_0116: { PL: ["dom", "W pobliżu szkoły jest dom."], NL: ["het huis", "Er staat een huis bij de school."], SV: ["ett hus", "Det finns ett hus nära skolan."], NO: ["et hus", "Det er et hus i nærheten av skolen."] },
  core3000_0117: { PL: ["raport; sprawozdanie", "Raport jest krótki."], NL: ["het rapport", "Het rapport is kort."], SV: ["en rapport", "Rapporten är kort."], NO: ["en rapport", "Rapporten er kort."] },
  core3000_0118: { PL: ["grupa", "Grupa uczniów czeka."], NL: ["de groep", "Een groep studenten wacht."], SV: ["en grupp", "En grupp elever väntar."], NO: ["en gruppe", "En gruppe elever venter."] },
  core3000_0119: { PL: ["przypadek; sprawa", "Ten przypadek jest inny."], NL: ["het geval; de zaak", "Dit geval is anders."], SV: ["ett fall", "Det här fallet är annorlunda."], NO: ["en sak; et tilfelle", "Denne saken er annerledes."] },
  core3000_0120: { PL: ["kobieta", "Kobieta czeka na zewnątrz."], NL: ["de vrouw", "Een vrouw wacht buiten."], SV: ["en kvinna", "En kvinna väntar utanför."], NO: ["en kvinne", "En kvinne venter utenfor."] },
  core3000_0121: { PL: ["książka", "Ta książka jest nowa."], NL: ["het boek", "Dit boek is nieuw."], SV: ["en bok", "Den här boken är ny."], NO: ["en bok", "Denne boken er ny."] },
  core3000_0122: { PL: ["rodzina", "Moja rodzina jest w domu."], NL: ["de familie", "Mijn familie is thuis."], SV: ["en familj", "Min familj är hemma."], NO: ["en familie", "Familien min er hjemme."] },
  core3000_0123: { PL: ["wydawać się", "To wydaje się łatwe."], NL: ["lijken", "Je lijkt moe."], SV: ["verka", "Du verkar trött."], NO: ["å virke; å se ut", "Du virker trøtt."] },
  core3000_0124: { PL: ["pozwalać", "Pozwól mi pomóc."], NL: ["laten; toestaan", "Laat me helpen, alsjeblieft."], SV: ["låta; tillåta", "Låt mig hjälpa till."], NO: ["å la; å tillate", "La meg hjelpe."] },
  core3000_0125: { PL: ["znowu; jeszcze raz", "Proszę, powiedz to jeszcze raz."], NL: ["opnieuw; nog eens", "Zeg het alsjeblieft nog eens."], SV: ["igen", "Säg det igen, tack."], NO: ["igjen", "Si det igjen, vær så snill."] },
  core3000_0126: { PL: ["rodzaj", "Ten rodzaj herbaty jest smaczny."], NL: ["de soort", "Deze soort thee is lekker."], SV: ["en sorts; ett slag", "Den här sortens te är gott."], NO: ["en type; et slag", "Denne typen te er god."] },
  core3000_0127: { PL: ["trzymać; zostawić", "Zostaw telefon tutaj."], NL: ["houden; laten", "Laat je telefoon hier liggen."], SV: ["behålla; låta vara", "Lämna din telefon här."], NO: ["å beholde; å la ligge", "La telefonen din ligge her."] },
  core3000_0128: { PL: ["słyszeć", "Słyszę muzykę na zewnątrz."], NL: ["horen", "Ik hoor buiten muziek."], SV: ["höra", "Jag hör musik utanför."], NO: ["å høre", "Jeg hører musikk utenfor."] },
  core3000_0129: { PL: ["system", "Ten system jest prosty."], NL: ["het systeem", "Dit systeem is eenvoudig."], SV: ["ett system", "Det här systemet är enkelt."], NO: ["et system", "Dette systemet er enkelt."] },
  core3000_0130: { PL: ["pytanie", "Zadaj teraz pytanie."], NL: ["de vraag", "Stel nu een vraag."], SV: ["en fråga", "Ställ en fråga nu."], NO: ["et spørsmål", "Still et spørsmål nå."] },
  core3000_0131: { PL: ["zawsze", "Ona zawsze przychodzi wcześnie."], NL: ["altijd", "Zij komt altijd vroeg."], SV: ["alltid", "Hon kommer alltid tidigt."], NO: ["alltid", "Hun kommer alltid tidlig."] },
  core3000_0132: { PL: ["duży", "To duży pokój."], NL: ["groot", "Dit is een grote kamer."], SV: ["stor", "Det här är ett stort rum."], NO: ["stor", "Dette er et stort rom."] },
  core3000_0133: { PL: ["zestaw", "W tym zestawie jest sześć kubków."], NL: ["de set", "In deze set zitten zes kopjes."], SV: ["en uppsättning; ett set", "Det här setet har sex koppar."], NO: ["et sett", "Dette settet har seks kopper."] },
  core3000_0134: { PL: ["mały", "To mały pokój."], NL: ["klein", "Dit is een kleine kamer."], SV: ["liten", "Det här är ett litet rum."], NO: ["liten", "Dette er et lite rom."] },
  core3000_0135: { PL: ["uczyć się; studiować", "Codziennie uczę się angielskiego."], NL: ["studeren; leren", "Ik studeer elke dag Engels."], SV: ["studera; plugga", "Jag studerar engelska varje dag."], NO: ["å studere; å lære", "Jeg studerer engelsk hver dag."] },
  core3000_0136: { PL: ["iść za; stosować się", "Proszę, idź za nauczycielem."], NL: ["volgen", "Volg alsjeblieft de leraar."], SV: ["följa", "Följ läraren, tack."], NO: ["å følge", "Følg læreren, vær så snill."] },
  core3000_0137: { PL: ["zaczynać", "Lekcja może się teraz zacząć."], NL: ["beginnen", "De les kan nu beginnen."], SV: ["börja", "Lektionen kan börja nu."], NO: ["å begynne", "Timen kan begynne nå."] },
  core3000_0138: { PL: ["ważny", "To pytanie jest ważne."], NL: ["belangrijk", "Deze vraag is belangrijk."], SV: ["viktig", "Den här frågan är viktig."], NO: ["viktig", "Dette spørsmålet er viktig."] },
  core3000_0139: { PL: ["biegać; biec", "Biegam w parku."], NL: ["rennen; hardlopen", "Ik ren in het park."], SV: ["springa", "Jag springer i parken."], NO: ["å løpe", "Jeg løper i parken."] },
  core3000_0140: { PL: ["skręcać; obracać", "Skręć w lewo przy drzwiach."], NL: ["afslaan; draaien", "Sla linksaf bij de deur."], SV: ["svänga; vända", "Sväng vänster vid dörren."], NO: ["å svinge; å snu", "Sving til venstre ved døren."] },
  core3000_0141: { PL: ["przynieść", "Proszę, przynieś swoją książkę."], NL: ["meebrengen", "Neem alsjeblieft je boek mee."], SV: ["ta med; komma med", "Ta med din bok, tack."], NO: ["å ta med", "Ta med boken din, vær så snill."] },
  core3000_0142: { PL: ["wczesny; wcześnie", "Musimy zacząć wcześnie."], NL: ["vroeg", "We moeten vroeg beginnen."], SV: ["tidig; tidigt", "Vi behöver börja tidigt."], NO: ["tidlig", "Vi må begynne tidlig."] },
  core3000_0143: { PL: ["ręka; dłoń", "Podnieś rękę."], NL: ["de hand", "Steek je hand op."], SV: ["en hand", "Räck upp handen."], NO: ["en hånd", "Rekk opp hånden."] },
  core3000_0144: { PL: ["stan", "Kalifornia to duży stan."], NL: ["de staat", "Californië is een grote staat."], SV: ["en delstat", "Kalifornien är en stor delstat."], NO: ["en delstat", "California er en stor delstat."] },
  core3000_0145: { PL: ["ruszać; przesuwać", "Proszę, przesuń krzesło."], NL: ["verplaatsen; bewegen", "Verplaats alsjeblieft de stoel."], SV: ["flytta; röra", "Flytta stolen, tack."], NO: ["å flytte; å bevege", "Flytt stolen, vær så snill."] },
  core3000_0146: { PL: ["pieniądze", "Potrzebuję pieniędzy na lunch."], NL: ["het geld", "Ik heb geld nodig voor de lunch."], SV: ["pengar", "Jag behöver pengar till lunch."], NO: ["penger", "Jeg trenger penger til lunsj."] },
  core3000_0147: { PL: ["fakt", "Ten fakt jest ważny."], NL: ["het feit", "Dit feit is belangrijk."], SV: ["ett faktum", "Det här är ett viktigt faktum."], NO: ["et faktum", "Dette er et viktig faktum."] },
  core3000_0148: { PL: ["jednak; jednakże", "Jest późno, jednak możemy poczekać."], NL: ["toch; echter; maar", "Het is laat; toch kunnen we wachten."], SV: ["dock; ändå", "Det är sent, men vi kan ändå vänta."], NO: ["likevel; imidlertid", "Det er sent, men vi kan likevel vente."] },
  core3000_0149: { PL: ["obszar; okolica", "Ta okolica jest cicha."], NL: ["het gebied", "Dit gebied is rustig."], SV: ["ett område", "Det här området är lugnt."], NO: ["et område", "Dette området er stille."] },
  core3000_0150: { PL: ["zapewniać; dostarczać", "Szkoła może zapewnić lunch."], NL: ["aanbieden; voorzien", "De school kan lunch aanbieden."], SV: ["tillhandahålla; ge", "Skolan kan erbjuda lunch."], NO: ["å tilby; å skaffe", "Skolen kan tilby lunsj."] },
};

const languages = ["PL", "NL", "SV", "NO"];

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
  if (!localized) throw new Error(`Missing PL/NL/SV/NO translation for ${row.core_item_id}.`);
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
    translation_batch: "pl_nl_sv_no_v0",
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
const outputPath = path.join(outputDir, `${releaseId}_translation_batch_pl_nl_sv_no_v0.jsonl`);
await writeJsonl(outputPath, outputRows);

const summaryPath = path.join(outputDir, `${releaseId}_translation_batch_pl_nl_sv_no_v0_summary.md`);
await fs.writeFile(
  summaryPath,
  [
    `# Translation Batch PL/NL/SV/NO v0: ${releaseId}`,
    "",
    `- Rows: ${outputRows.length}`,
    "- Languages: PL, NL, SV, NO",
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
  `English Core 3000 PL/NL/SV/NO translation batch written: ${path.relative(process.cwd(), outputPath)} rows=${outputRows.length}`
);
