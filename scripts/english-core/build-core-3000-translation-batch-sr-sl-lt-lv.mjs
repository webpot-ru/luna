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
  core3000_0001: { SR: ["одређени члан", "Врата су отворена."], SL: ["določni člen", "Vrata so odprta."], LT: ["žymimasis artikelis", "Durys atidarytos."], LV: ["noteiktais artikuls", "Durvis ir vaļā."] },
  core3000_0002: { SR: ["бити", "Желим да будем спреман."], SL: ["biti", "Želim biti pripravljen."], LT: ["būti", "Noriu būti pasiruošęs."], LV: ["būt", "Es gribu būt gatavs."] },
  core3000_0003: { SR: ["и", "Чај и вода су на столу."], SL: ["in", "Čaj in voda sta na mizi."], LT: ["ir", "Arbata ir vanduo yra ant stalo."], LV: ["un", "Tēja un ūdens ir uz galda."] },
  core3000_0004: { SR: ["од; генитив", "Шоља чаја је врућа."], SL: ["od; rodilnik", "Skodelica čaja je vroča."], LT: ["iš; kilmininkas", "Puodelis arbatos yra karštas."], LV: ["no; ģenitīvs", "Tase tējas ir karsta."] },
  core3000_0005: { SR: ["да; у", "Желим да идем кући."], SL: ["nedoločnik; v", "Želim iti domov."], LT: ["bendratis; į", "Noriu eiti namo."], LV: ["infinitīvs; uz", "Es gribu iet mājās."] },
  core3000_0006: { SR: ["неодређени члан", "Имам књигу."], SL: ["nedoločni člen", "Imam knjigo."], LT: ["nežymimasis artikelis", "Turiu knygą."], LV: ["nenoteiktais artikuls", "Man ir grāmata."] },
  core3000_0007: { SR: ["у", "Кључ је у торби."], SL: ["v", "Ključ je v torbi."], LT: ["į; viduje; -e", "Raktas yra krepšyje."], LV: ["iekšā; -ā", "Atslēga ir somā."] },
  core3000_0008: { SR: ["имати", "Имам телефон."], SL: ["imeti", "Imam telefon."], LT: ["turėti", "Turiu telefoną."], LV: ["man ir; piederēt", "Man ir telefons."] },
  core3000_0009: { SR: ["оно; то", "У торби је."], SL: ["ono; to", "Je v torbi."], LT: ["tai; jis; ji", "Tai yra krepšyje."], LV: ["tas; tā", "Tas ir somā."] },
  core3000_0010: { SR: ["ти; ви", "Ти си мој пријатељ."], SL: ["ti; vi", "Ti si moj prijatelj."], LT: ["tu; jūs", "Tu esi mano draugas."], LV: ["tu; jūs", "Tu esi mans draugs."] },
  core3000_0011: { SR: ["он", "Он је у школи."], SL: ["on", "On je v šoli."], LT: ["jis", "Jis yra mokykloje."], LV: ["viņš", "Viņš ir skolā."] },
  core3000_0012: { SR: ["за", "Овај поклон је за тебе."], SL: ["za", "To darilo je zate."], LT: ["už; dėl", "Ši dovana skirta tau."], LV: ["priekš; par", "Šī dāvana ir tev."] },
  core3000_0013: { SR: ["они; оне; она", "Они су код куће."], SL: ["oni; one; ona", "Oni so doma."], LT: ["jie; jos", "Jie yra namuose."], LV: ["viņi; viņas", "Viņi ir mājās."] },
  core3000_0014: { SR: ["не", "Нисам уморан."], SL: ["ne", "Nisem utrujen."], LT: ["ne", "Aš nesu pavargęs."], LV: ["ne", "Es neesmu noguris."] },
  core3000_0015: { SR: ["тај; та; то; онај", "Та књига је моја."], SL: ["tisti; tista; tisto", "Tista knjiga je moja."], LT: ["tas; ta; tai", "Ta knyga yra mano."], LV: ["tas; tā", "Tā grāmata ir mana."] },
  core3000_0016: { SR: ["ми", "Спремни смо."], SL: ["mi", "Pripravljeni smo."], LT: ["mes", "Esame pasiruošę."], LV: ["mēs", "Mēs esam gatavi."] },
  core3000_0017: { SR: ["на", "Шоља је на столу."], SL: ["na", "Skodelica je na mizi."], LT: ["ant", "Puodelis yra ant stalo."], LV: ["uz", "Krūze ir uz galda."] },
  core3000_0018: { SR: ["са; с", "Са породицом сам."], SL: ["z; s", "Sem z družino."], LT: ["su", "Esu su savo šeima."], LV: ["ar", "Es esmu ar savu ģimeni."] },
  core3000_0019: { SR: ["овај; ова; ово", "Ова књига је нова."], SL: ["ta; ta; to", "Ta knjiga je nova."], LT: ["šis; ši; tai", "Ši knyga nauja."], LV: ["šis; šī", "Šī grāmata ir jauna."] },
  core3000_0020: { SR: ["ја", "Код куће сам."], SL: ["jaz", "Sem doma."], LT: ["aš", "Esu namuose."], LV: ["es", "Es esmu mājās."] },
  core3000_0021: { SR: ["радити; чинити", "Радим домаћи задатак."], SL: ["delati; narediti", "Delam domačo nalogo."], LT: ["daryti", "Atlieku namų darbus."], LV: ["darīt", "Es pildu mājasdarbu."] },
  core3000_0022: { SR: ["као", "Она ради као учитељица."], SL: ["kot", "Dela kot učiteljica."], LT: ["kaip", "Ji dirba mokytoja."], LV: ["kā", "Viņa strādā par skolotāju."] },
  core3000_0023: { SR: ["у; код; на", "Састани се са мном у школи."], SL: ["v; pri; ob", "Srečaj se z mano v šoli."], LT: ["prie; mokykloje", "Susitik su manimi mokykloje."], LV: ["pie; skolā", "Satiec mani skolā."] },
  core3000_0024: { SR: ["она", "Она је моја сестра."], SL: ["ona", "Ona je moja sestra."], LT: ["ji", "Ji yra mano sesuo."], LV: ["viņa", "Viņa ir mana māsa."] },
  core3000_0025: { SR: ["али", "Уморан сам, али срећан."], SL: ["ampak", "Utrujen sem, ampak sem vesel."], LT: ["bet", "Esu pavargęs, bet laimingas."], LV: ["bet", "Esmu noguris, bet laimīgs."] },
  core3000_0026: { SR: ["из; од", "Ја сам из Канаде."], SL: ["iz; od", "Sem iz Kanade."], LT: ["iš; nuo", "Esu iš Kanados."], LV: ["no", "Es esmu no Kanādas."] },
  core3000_0027: { SR: ["код; поред", "Торба је поред врата."], SL: ["pri; poleg", "Torba je pri vratih."], LT: ["prie; šalia", "Krepšys yra prie durų."], LV: ["pie; blakus", "Soma ir pie durvīm."] },
  core3000_0028: { SR: ["ћу; ће", "Позваћу те."], SL: ["bom; bo", "Poklical te bom."], LT: ["būsiu; bus", "Paskambinsiu tau."], LV: ["būšu; būs", "Es tev piezvanīšu."] },
  core3000_0029: { SR: ["или", "Чај или кафа биће у реду."], SL: ["ali", "Čaj ali kava bo v redu."], LT: ["arba", "Arbata arba kava tiks."], LV: ["vai", "Tēja vai kafija derēs."] },
  core3000_0030: { SR: ["рећи; говорити", "Реци своје име, молим те."], SL: ["reči; govoriti", "Povej svoje ime, prosim."], LT: ["sakyti", "Prašau pasakyti savo vardą."], LV: ["teikt", "Lūdzu, pasaki savu vārdu."] },
  core3000_0031: { SR: ["ићи", "После школе идем кући."], SL: ["iti", "Po šoli grem domov."], LT: ["eiti", "Po mokyklos einu namo."], LV: ["iet", "Pēc skolas eju mājās."] },
  core3000_0032: { SR: ["па; зато", "Касно је, зато идем кући."], SL: ["zato; torej", "Pozno je, zato grem domov."], LT: ["todėl; taigi", "Vėlu, todėl einu namo."], LV: ["tāpēc; tātad", "Ir vēlu, tāpēc eju mājās."] },
  core3000_0033: { SR: ["сви; сав", "Сви ученици су овде."], SL: ["vsi; ves", "Vsi učenci so tukaj."], LT: ["visi; visas", "Visi mokiniai yra čia."], LV: ["visi; viss", "Visi skolēni ir šeit."] },
  core3000_0034: { SR: ["тамо", "Стави торбу тамо."], SL: ["tam", "Daj torbo tja."], LT: ["ten", "Padėk krepšį ten."], LV: ["tur", "Noliec somu tur."] },
  core3000_0035: { SR: ["знати; познавати", "Знам одговор."], SL: ["vedeti; poznati", "Vem odgovor."], LT: ["žinoti; pažinti", "Žinau atsakymą."], LV: ["zināt; pazīt", "Es zinu atbildi."] },
  core3000_0036: { SR: ["добити", "Данас ћу добити нову књигу."], SL: ["dobiti", "Danes dobim novo knjigo."], LT: ["gauti", "Šiandien gausiu naują knygą."], LV: ["saņemt", "Šodien saņemšu jaunu grāmatu."] },
  core3000_0037: { SR: ["мислити", "Мислим да је то тачно."], SL: ["misliti; verjeti", "Mislim, da je to pravilno."], LT: ["manyti; tikėti", "Manau, kad tai teisinga."], LV: ["domāt; ticēt", "Es domāju, ka tas ir pareizi."] },
  core3000_0038: { SR: ["правити; припремити", "Код куће припремам ручак."], SL: ["narediti; pripraviti", "Doma pripravljam kosilo."], LT: ["daryti; paruošti", "Namuose ruošiu pietus."], LV: ["darīt; gatavot", "Mājās gatavoju pusdienas."] },
  core3000_0039: { SR: ["време", "Време је важно."], SL: ["čas", "Čas je pomemben."], LT: ["laikas", "Laikas yra svarbus."], LV: ["laiks", "Laiks ir svarīgs."] },
  core3000_0040: { SR: ["видети", "Видим кућу."], SL: ["videti", "Vidim hišo."], LT: ["matyti", "Matau namą."], LV: ["redzēt", "Es redzu māju."] },
  core3000_0041: { SR: ["напољу; ван", "Изађи сада напоље, молим те."], SL: ["ven; zunaj", "Pojdi zdaj ven, prosim."], LT: ["lauke; lauk", "Prašau dabar išeiti į lauką."], LV: ["ārā", "Lūdzu, ej ārā tagad."] },
  core3000_0042: { SR: ["добар", "Ово је добар дан."], SL: ["dober", "To je dober dan."], LT: ["geras", "Tai gera diena."], LV: ["labs", "Šī ir laba diena."] },
  core3000_0043: { SR: ["људи", "Овде има много људи."], SL: ["ljudje", "Tukaj je veliko ljudi."], LT: ["žmonės", "Čia yra daug žmonių."], LV: ["cilvēki", "Šeit ir daudz cilvēku."] },
  core3000_0044: { SR: ["година", "Година има дванаест месеци."], SL: ["leto", "Leto ima dvanajst mesecev."], LT: ["metai", "Metuose yra dvylika mėnesių."], LV: ["gads", "Gadā ir divpadsmit mēneši."] },
  core3000_0045: { SR: ["узети", "Узми ову торбу, молим те."], SL: ["vzeti", "Vzemi to torbo, prosim."], LT: ["imti; paimti", "Prašau paimti šį krepšį."], LV: ["ņemt; paņemt", "Lūdzu, paņem šo somu."] },
  core3000_0046: { SR: ["добро", "Она добро чита."], SL: ["dobro", "Dobro bere."], LT: ["gerai", "Ji gerai skaito."], LV: ["labi", "Viņa labi lasa."] },
  core3000_0047: { SR: ["веома; врло", "Ова соба је веома мала."], SL: ["zelo", "Ta soba je zelo majhna."], LT: ["labai", "Šis kambarys labai mažas."], LV: ["ļoti", "Šī istaba ir ļoti maza."] },
  core3000_0048: { SR: ["само; управо", "Треба ми само вода."], SL: ["samo; ravno", "Potrebujem samo vodo."], LT: ["tik; kaip tik", "Man reikia tik vandens."], LV: ["tikai; tieši", "Man vajag tikai ūdeni."] },
  core3000_0049: { SR: ["доћи", "Дођи овде, молим те."], SL: ["priti", "Pridi sem, prosim."], LT: ["ateiti", "Prašau ateiti čia."], LV: ["nākt", "Lūdzu, nāc šeit."] },
  core3000_0050: { SR: ["радити", "Радим у школи."], SL: ["delati", "Delam v šoli."], LT: ["dirbti", "Dirbu mokykloje."], LV: ["strādāt", "Es strādāju skolā."] },
  core3000_0051: { SR: ["користити", "Користим овај телефон сваки дан."], SL: ["uporabljati", "Ta telefon uporabljam vsak dan."], LT: ["naudoti", "Šį telefoną naudoju kasdien."], LV: ["lietot", "Es lietoju šo telefonu katru dienu."] },
  core3000_0052: { SR: ["затим; тада", "Доручкуј, затим иди у школу."], SL: ["potem; takrat", "Pojej zajtrk, potem pojdi v šolo."], LT: ["tada; po to", "Pavalgyk pusryčius, tada eik į mokyklą."], LV: ["tad; pēc tam", "Paēd brokastis, tad ej uz skolu."] },
  core3000_0053: { SR: ["такође; и", "Говорим и енглески."], SL: ["tudi", "Govorim tudi angleško."], LT: ["taip pat", "Kalbu ir angliškai."], LV: ["arī", "Es runāju arī angliski."] },
  core3000_0054: { SR: ["само", "Имам само једну оловку."], SL: ["samo", "Imam samo en kemični svinčnik."], LT: ["tik", "Turiu tik vieną rašiklį."], LV: ["tikai", "Man ir tikai viena pildspalva."] },
  core3000_0055: { SR: ["гледати", "Погледај таблу."], SL: ["gledati", "Poglej na tablo."], LT: ["žiūrėti", "Pažiūrėk į lentą."], LV: ["skatīties", "Paskaties uz tāfeli."] },
  core3000_0056: { SR: ["хтети; желети", "Желим нову књигу."], SL: ["hoteti; želeti", "Želim novo knjigo."], LT: ["norėti", "Noriu naujos knygos."], LV: ["gribēt; vēlēties", "Es gribu jaunu grāmatu."] },
  core3000_0057: { SR: ["дати", "Дај ми оловку, молим те."], SL: ["dati", "Daj mi pisalo, prosim."], LT: ["duoti", "Duok man rašiklį, prašau."], LV: ["dot", "Lūdzu, iedod man pildspalvu."] },
  core3000_0058: { SR: ["први", "Ово је мој први дан."], SL: ["prvi", "To je moj prvi dan."], LT: ["pirmas", "Tai mano pirmoji diena."], LV: ["pirmais; pirmā", "Šī ir mana pirmā diena."] },
  core3000_0059: { SR: ["нов", "Имам нови телефон."], SL: ["nov", "Imam nov telefon."], LT: ["naujas", "Turiu naują telefoną."], LV: ["jauns", "Man ir jauns telefons."] },
  core3000_0060: { SR: ["начин; пут", "Ово је добар начин учења."], SL: ["način; pot", "To je dober način učenja."], LT: ["būdas; kelias", "Tai geras būdas mokytis."], LV: ["veids; ceļš", "Tas ir labs veids, kā mācīties."] },
  core3000_0061: { SR: ["наћи; пронаћи", "Проналазим кључеве на столу."], SL: ["najti", "Ključe najdem na mizi."], LT: ["rasti", "Randu raktus ant stalo."], LV: ["atrast", "Es atrodu atslēgas uz galda."] },
  core3000_0062: { SR: ["дан", "Дан може бити веома напоран."], SL: ["dan", "Dan je lahko zelo naporen."], LT: ["diena", "Diena gali būti labai užimta."], LV: ["diena", "Diena var būt ļoti aizņemta."] },
  core3000_0063: { SR: ["ствар", "Ова ствар је корисна."], SL: ["stvar", "Ta stvar je uporabna."], LT: ["daiktas; dalykas", "Šis daiktas naudingas."], LV: ["lieta", "Šī lieta ir noderīga."] },
  core3000_0064: { SR: ["тачан; десан", "Твој одговор је тачан."], SL: ["pravilen; desni", "Tvoj odgovor je pravilen."], LT: ["teisingas; dešinysis", "Tavo atsakymas teisingas."], LV: ["pareizs; pa labi", "Tava atbilde ir pareiza."] },
  core3000_0065: { SR: ["како", "Како се пише твоје име?"], SL: ["kako", "Kako se napiše tvoje ime?"], LT: ["kaip", "Kaip rašomas tavo vardas?"], LV: ["kā", "Kā raksta tavu vārdu?"] },
  core3000_0066: { SR: ["назад; леђа", "Врати се ускоро, молим те."], SL: ["nazaj; hrbet", "Vrni se kmalu, prosim."], LT: ["atgal; nugara", "Prašau greitai grįžti."], LV: ["atpakaļ; mugura", "Lūdzu, drīz atgriezies."] },
  core3000_0067: { SR: ["значити", "Шта значи ова реч?"], SL: ["pomeniti", "Kaj pomeni ta beseda?"], LT: ["reikšti", "Ką reiškia šis žodis?"], LV: ["nozīmēt", "Ko nozīmē šis vārds?"] },
  core3000_0068: { SR: ["чак", "Чак и дете то може да уради."], SL: ["celo", "Celo otrok lahko to naredi."], LT: ["net", "Net vaikas gali tai padaryti."], LV: ["pat", "Pat bērns to var izdarīt."] },
  core3000_0069: { SR: ["овде", "Седи овде, молим те."], SL: ["tukaj; sem", "Sedi tukaj, prosim."], LT: ["čia", "Prašau sėsti čia."], LV: ["šeit; te", "Lūdzu, apsēdies šeit."] },
  core3000_0070: { SR: ["дете", "Дете се игра напољу."], SL: ["otrok", "Otrok se igra zunaj."], LT: ["vaikas", "Vaikas žaidžia lauke."], LV: ["bērns", "Bērns spēlējas ārā."] },
  core3000_0071: { SR: ["рећи; испричати", "Реци ми своје име, молим те."], SL: ["povedati; pripovedovati", "Povej mi svoje ime, prosim."], LT: ["sakyti; pasakoti", "Prašau pasakyti man savo vardą."], LV: ["teikt; stāstīt", "Lūdzu, pasaki man savu vārdu."] },
  core3000_0072: { SR: ["стварно; заиста", "Стварно ми се свиђа ова књига."], SL: ["res; zares", "Ta knjiga mi je res všeč."], LT: ["tikrai", "Man labai patinka ši knyga."], LV: ["tiešām", "Man ļoti patīk šī grāmata."] },
  core3000_0073: { SR: ["звати; назвати", "Зовем маму сваки дан."], SL: ["poklicati; imenovati", "Vsak dan pokličem mamo."], LT: ["skambinti; vadinti", "Kasdien skambinu mamai."], LV: ["zvanīt; saukt", "Es zvanu mammai katru dienu."] },
  core3000_0074: { SR: ["компанија; фирма", "Компанија продаје ове телефоне."], SL: ["podjetje", "Podjetje prodaja te telefone."], LT: ["įmonė", "Bendrovė parduoda šiuos telefonus."], LV: ["uzņēmums", "Uzņēmums pārdod šos telefonus."] },
  core3000_0075: { SR: ["показати", "Покажи ми карту, молим те."], SL: ["pokazati", "Pokaži mi zemljevid, prosim."], LT: ["parodyti", "Prašau parodyti man žemėlapį."], LV: ["parādīt", "Lūdzu, parādi man karti."] },
  core3000_0076: { SR: ["живот", "Живот је овде другачији."], SL: ["življenje", "Življenje je tukaj drugačno."], LT: ["gyvenimas", "Gyvenimas čia kitoks."], LV: ["dzīve", "Dzīve šeit ir citāda."] },
  core3000_0077: { SR: ["мушкарац", "Мушкарац чека напољу."], SL: ["moški", "Moški čaka zunaj."], LT: ["vyras", "Vyras laukia lauke."], LV: ["vīrietis", "Vīrietis gaida ārā."] },
  core3000_0078: { SR: ["мењати; променити се", "Планови се брзо мењају."], SL: ["spremeniti; spreminjati se", "Načrti se hitro spreminjajo."], LT: ["keisti; keistis", "Planai greitai keičiasi."], LV: ["mainīt; mainīties", "Plāni ātri mainās."] },
  core3000_0079: { SR: ["место", "Ово место је тихо."], SL: ["kraj; mesto", "Ta kraj je tih."], LT: ["vieta", "Ši vieta rami."], LV: ["vieta", "Šī vieta ir klusa."] },
  core3000_0080: { SR: ["дуг", "Ово је дуг пут."], SL: ["dolg", "To je dolga cesta."], LT: ["ilgas", "Tai ilgas kelias."], LV: ["garš", "Tas ir garš ceļš."] },
  core3000_0081: { SR: ["осећати се", "Данас се осећам добро."], SL: ["počutiti se", "Danes se počutim dobro."], LT: ["jaustis", "Šiandien jaučiuosi gerai."], LV: ["justies", "Šodien jūtos labi."] },
  core3000_0082: { SR: ["превише; такође", "Ова торба је претешка."], SL: ["preveč; tudi", "Ta torba je pretežka."], LT: ["per; taip pat", "Šis krepšys per sunkus."], LV: ["pārāk; arī", "Šī soma ir pārāk smaga."] },
  core3000_0083: { SR: ["још увек", "Још увек живим овде."], SL: ["še vedno", "Še vedno živim tukaj."], LT: ["vis dar", "Aš vis dar gyvenu čia."], LV: ["vēl; joprojām", "Es joprojām dzīvoju šeit."] },
  core3000_0084: { SR: ["проблем", "Ово је мали проблем."], SL: ["problem", "To je majhen problem."], LT: ["problema", "Tai maža problema."], LV: ["problēma", "Tā ir maza problēma."] },
  core3000_0085: { SR: ["писати", "Напиши своје име, молим те."], SL: ["pisati", "Napiši svoje ime, prosim."], LT: ["rašyti", "Prašau parašyti savo vardą."], LV: ["rakstīt", "Lūdzu, uzraksti savu vārdu."] },
  core3000_0086: { SR: ["сјајан; велики", "То је сјајна идеја."], SL: ["odličen; velik", "To je odlična ideja."], LT: ["puikus; didelis", "Tai puiki idėja."], LV: ["lielisks; liels", "Tā ir lieliska ideja."] },
  core3000_0087: { SR: ["покушати; трудити се", "Покушавам да учим сваки дан."], SL: ["poskusiti; truditi se", "Vsak dan se poskušam učiti."], LT: ["bandyti; stengtis", "Kasdien bandau mokytis."], LV: ["mēģināt; censties", "Es mēģinu mācīties katru dienu."] },
  core3000_0088: { SR: ["отићи; напустити", "Одлазимо у осам."], SL: ["oditi; zapustiti", "Odhajamo ob osmih."], LT: ["išvykti; palikti", "Išvykstame aštuntą valandą."], LV: ["aiziet; atstāt", "Mēs dodamies prom astoņos."] },
  core3000_0089: { SR: ["број", "Напиши број овде."], SL: ["število; številka", "Napiši številko sem."], LT: ["skaičius; numeris", "Parašyk skaičių čia."], LV: ["skaitlis; numurs", "Uzraksti skaitli šeit."] },
  core3000_0090: { SR: ["део", "Овај део је важан."], SL: ["del", "Ta del je pomemben."], LT: ["dalis", "Ši dalis svarbi."], LV: ["daļa", "Šī daļa ir svarīga."] },
  core3000_0091: { SR: ["тачка", "Ова тачка је јасна."], SL: ["točka", "Ta točka je jasna."], LT: ["taškas; punktas", "Šis punktas aiškus."], LV: ["punkts", "Šis punkts ir skaidrs."] },
  core3000_0092: { SR: ["помагати", "Помажем својој породици."], SL: ["pomagati", "Pomagam svoji družini."], LT: ["padėti", "Padedu savo šeimai."], LV: ["palīdzēt", "Es palīdzu savai ģimenei."] },
  core3000_0093: { SR: ["питати; замолити", "Постави питање, молим те."], SL: ["vprašati; prositi", "Postavi vprašanje, prosim."], LT: ["klausti; prašyti", "Prašau užduoti klausimą."], LV: ["jautāt; lūgt", "Lūdzu, uzdod jautājumu."] },
  core3000_0094: { SR: ["срести; упознати", "Срећемо се у школи."], SL: ["srečati; spoznati", "Srečamo se v šoli."], LT: ["susitikti", "Susitinkame mokykloje."], LV: ["satikties", "Mēs tiekamies skolā."] },
  core3000_0095: { SR: ["почети; започети", "Настава почиње у девет."], SL: ["začeti", "Pouk se začne ob devetih."], LT: ["pradėti", "Pamokos prasideda devintą valandą."], LV: ["sākt", "Stundas sākas deviņos."] },
  core3000_0096: { SR: ["разговарати; говорити", "Разговарам с учитељем."], SL: ["govoriti; pogovarjati se", "Pogovarjam se z učiteljem."], LT: ["kalbėti", "Kalbu su savo mokytoju."], LV: ["runāt", "Es runāju ar savu skolotāju."] },
  core3000_0097: { SR: ["ставити; положити", "Стави књигу на сто."], SL: ["dati; položiti", "Daj knjigo na mizo."], LT: ["padėti; dėti", "Padėk knygą ant stalo."], LV: ["likt; nolikt", "Noliec grāmatu uz galda."] },
  core3000_0098: { SR: ["постати", "То може постати проблем."], SL: ["postati", "To lahko postane problem."], LT: ["tapti", "Tai gali tapti problema."], LV: ["kļūt", "Tas var kļūt par problēmu."] },
  core3000_0099: { SR: ["интересовање; занимање", "Занима је музика."], SL: ["zanimanje", "Zanima jo glasba."], LT: ["susidomėjimas", "Ją domina muzika."], LV: ["interese", "Viņu interesē mūzika."] },
  core3000_0100: { SR: ["земља; држава", "Канада је велика земља."], SL: ["država; dežela", "Kanada je velika država."], LT: ["šalis; valstybė", "Kanada yra didelė šalis."], LV: ["valsts; zeme", "Kanāda ir liela valsts."] },
  core3000_0101: { SR: ["стар", "Ово је стара кућа."], SL: ["star", "To je stara hiša."], LT: ["senas", "Tai senas namas."], LV: ["vecs", "Šī ir veca māja."] },
  core3000_0102: { SR: ["школа", "Близу моје куће је школа."], SL: ["šola", "V bližini moje hiše je šola."], LT: ["mokykla", "Netoli mano namų yra mokykla."], LV: ["skola", "Pie manas mājas ir skola."] },
  core3000_0103: { SR: ["касно; каснити", "Касним на час."], SL: ["pozen; zamujati", "Zamujam k pouku."], LT: ["vėlus; vėluoti", "Vėluoju į pamoką."], LV: ["vēls; kavēt", "Es kavēju uz stundu."] },
  core3000_0104: { SR: ["висок", "Зид је висок."], SL: ["visok", "Zid je visok."], LT: ["aukštas", "Siena aukšta."], LV: ["augsts", "Siena ir augsta."] },
  core3000_0105: { SR: ["различит; другачији", "Ове две књиге су различите."], SL: ["različen; drugačen", "Ti dve knjigi sta različni."], LT: ["skirtingas", "Šios dvi knygos skirtingos."], LV: ["atšķirīgs; citāds", "Šīs divas grāmatas ir atšķirīgas."] },
  core3000_0106: { SR: ["крај", "Крај приче је тужан."], SL: ["konec", "Konec zgodbe je žalosten."], LT: ["pabaiga", "Istorijos pabaiga liūdna."], LV: ["beigas", "Stāsta beigas ir skumjas."] },
  core3000_0107: { SR: ["живети; становати", "Живим у малом граду."], SL: ["živeti; stanovati", "Živim v majhnem mestu."], LT: ["gyventi", "Gyvenu mažame mieste."], LV: ["dzīvot", "Es dzīvoju mazā pilsētā."] },
  core3000_0108: { SR: ["зашто", "Зашто си овде?"], SL: ["zakaj", "Zakaj si tukaj?"], LT: ["kodėl", "Kodėl tu čia?"], LV: ["kāpēc", "Kāpēc tu esi šeit?"] },
  core3000_0109: { SR: ["свет", "Људи живе широм света."], SL: ["svet", "Ljudje živijo po vsem svetu."], LT: ["pasaulis", "Žmonės gyvena visame pasaulyje."], LV: ["pasaule", "Cilvēki dzīvo visā pasaulē."] },
  core3000_0110: { SR: ["недеља; седмица", "Седмица има седам дана."], SL: ["teden", "Teden ima sedem dni."], LT: ["savaitė", "Savaitėje yra septynios dienos."], LV: ["nedēļa", "Nedēļā ir septiņas dienas."] },
  core3000_0111: { SR: ["играти се; играти", "Деца се играју у парку."], SL: ["igrati se; igrati", "Otroci se igrajo v parku."], LT: ["žaisti", "Vaikai žaidžia parke."], LV: ["spēlēties; spēlēt", "Bērni spēlējas parkā."] },
  core3000_0112: { SR: ["кући; код куће", "После посла идем кући."], SL: ["domov; doma", "Po službi grem domov."], LT: ["namo; namuose", "Po darbo einu namo."], LV: ["mājās; uz mājām", "Pēc darba eju mājās."] },
  core3000_0113: { SR: ["никада", "Никада не једем месо."], SL: ["nikoli", "Nikoli ne jem mesa."], LT: ["niekada", "Niekada nevalgau mėsos."], LV: ["nekad", "Es nekad neēdu gaļu."] },
  core3000_0114: { SR: ["укључивати; садржати", "Доручак може бити укључен у цену."], SL: ["vključevati; zajemati", "Zajtrk je lahko vključen v ceno."], LT: ["įtraukti; apimti", "Pusryčiai gali būti įskaičiuoti į kainą."], LV: ["iekļaut; saturēt", "Brokastis var būt iekļautas cenā."] },
  core3000_0115: { SR: ["курс", "Овај курс почиње данас."], SL: ["tečaj; predmet", "Ta tečaj se začne danes."], LT: ["kursas", "Šis kursas prasideda šiandien."], LV: ["kurss", "Šis kurss sākas šodien."] },
  core3000_0116: { SR: ["кућа", "Близу школе је кућа."], SL: ["hiša", "Blizu šole je hiša."], LT: ["namas", "Netoli mokyklos yra namas."], LV: ["māja", "Pie skolas ir māja."] },
  core3000_0117: { SR: ["извештај", "Извештај је кратак."], SL: ["poročilo", "Poročilo je kratko."], LT: ["ataskaita", "Ataskaita trumpa."], LV: ["ziņojums", "Ziņojums ir īss."] },
  core3000_0118: { SR: ["група", "Група ученика чека."], SL: ["skupina", "Skupina učencev čaka."], LT: ["grupė", "Mokinių grupė laukia."], LV: ["grupa", "Skolēnu grupa gaida."] },
  core3000_0119: { SR: ["случај", "Овај случај је другачији."], SL: ["primer; zadeva", "Ta primer je drugačen."], LT: ["atvejis; byla", "Šis atvejis kitoks."], LV: ["gadījums; lieta", "Šis gadījums ir citāds."] },
  core3000_0120: { SR: ["жена", "Жена чека напољу."], SL: ["ženska", "Ženska čaka zunaj."], LT: ["moteris", "Moteris laukia lauke."], LV: ["sieviete", "Sieviete gaida ārā."] },
  core3000_0121: { SR: ["књига", "Ова књига је нова."], SL: ["knjiga", "Ta knjiga je nova."], LT: ["knyga", "Ši knyga nauja."], LV: ["grāmata", "Šī grāmata ir jauna."] },
  core3000_0122: { SR: ["породица", "Моја породица је код куће."], SL: ["družina", "Moja družina je doma."], LT: ["šeima", "Mano šeima namuose."], LV: ["ģimene", "Mana ģimene ir mājās."] },
  core3000_0123: { SR: ["чинити се; изгледати", "Делујеш уморно."], SL: ["zdeti se", "Videti si utrujen."], LT: ["atrodyti", "Atrodai pavargęs."], LV: ["šķist; likties", "Tu izskaties noguris."] },
  core3000_0124: { SR: ["пустити; дозволити", "Дозволи ми да помогнем."], SL: ["pustiti; dovoliti", "Dovoli mi, da pomagam."], LT: ["leisti", "Leisk man padėti."], LV: ["ļaut; atļaut", "Ļauj man palīdzēt."] },
  core3000_0125: { SR: ["опет; поново", "Реци то још једном, молим те."], SL: ["spet; ponovno", "Povej to še enkrat, prosim."], LT: ["vėl; dar kartą", "Prašau pasakyti tai dar kartą."], LV: ["atkal; vēlreiz", "Lūdzu, pasaki to vēlreiz."] },
  core3000_0126: { SR: ["врста", "Ова врста чаја је добра."], SL: ["vrsta", "Ta vrsta čaja je dobra."], LT: ["rūšis; tipas", "Ši arbatos rūšis gera."], LV: ["veids; tips", "Šis tējas veids ir labs."] },
  core3000_0127: { SR: ["задржати; оставити", "Остави свој телефон овде."], SL: ["obdržati; pustiti", "Pusti telefon tukaj."], LT: ["laikyti; palikti", "Palik savo telefoną čia."], LV: ["paturēt; atstāt", "Atstāj savu telefonu šeit."] },
  core3000_0128: { SR: ["чути", "Чујем музику напољу."], SL: ["slišati", "Zunaj slišim glasbo."], LT: ["girdėti", "Lauke girdžiu muziką."], LV: ["dzirdēt", "Es dzirdu mūziku ārā."] },
  core3000_0129: { SR: ["систем", "Овај систем је једноставан."], SL: ["sistem", "Ta sistem je preprost."], LT: ["sistema", "Ši sistema paprasta."], LV: ["sistēma", "Šī sistēma ir vienkārša."] },
  core3000_0130: { SR: ["питање", "Постави питање сада."], SL: ["vprašanje", "Zdaj postavi vprašanje."], LT: ["klausimas", "Užduok klausimą dabar."], LV: ["jautājums", "Uzdod jautājumu tagad."] },
  core3000_0131: { SR: ["увек", "Она увек долази рано."], SL: ["vedno", "Vedno pride zgodaj."], LT: ["visada", "Ji visada atvyksta anksti."], LV: ["vienmēr", "Viņa vienmēr ierodas agri."] },
  core3000_0132: { SR: ["велики", "Ово је велика соба."], SL: ["velik", "To je velika soba."], LT: ["didelis", "Tai didelis kambarys."], LV: ["liels", "Šī ir liela istaba."] },
  core3000_0133: { SR: ["сет; комплет", "У овом комплету има шест шоља."], SL: ["komplet; set", "V tem kompletu je šest skodelic."], LT: ["rinkinys; komplektas", "Šiame rinkinyje yra šeši puodeliai."], LV: ["komplekts", "Šajā komplektā ir sešas krūzes."] },
  core3000_0134: { SR: ["мали", "Ово је мала соба."], SL: ["majhen", "To je majhna soba."], LT: ["mažas", "Tai mažas kambarys."], LV: ["mazs", "Šī ir maza istaba."] },
  core3000_0135: { SR: ["учити; студирати", "Учим енглески сваки дан."], SL: ["učiti se; študirati", "Vsak dan se učim angleščine."], LT: ["mokytis; studijuoti", "Kasdien mokausi anglų kalbos."], LV: ["mācīties; studēt", "Es katru dienu mācos angļu valodu."] },
  core3000_0136: { SR: ["следити; пратити", "Прати учитеља, молим те."], SL: ["slediti; spremljati", "Sledi učitelju, prosim."], LT: ["sekti", "Prašau sekti mokytoją."], LV: ["sekot", "Lūdzu, seko skolotājam."] },
  core3000_0137: { SR: ["почети", "Час може да почне сада."], SL: ["začeti", "Pouk se lahko začne zdaj."], LT: ["pradėti", "Pamoka gali prasidėti dabar."], LV: ["sākt", "Stunda var sākties tagad."] },
  core3000_0138: { SR: ["важан", "Ово питање је важно."], SL: ["pomemben", "To vprašanje je pomembno."], LT: ["svarbus", "Šis klausimas svarbus."], LV: ["svarīgs", "Šis jautājums ir svarīgs."] },
  core3000_0139: { SR: ["трчати", "Трчим у парку."], SL: ["teči", "Tečem v parku."], LT: ["bėgti", "Bėgu parke."], LV: ["skriet", "Es skrienu parkā."] },
  core3000_0140: { SR: ["скренути; окренути", "Скрени налево код врата."], SL: ["zaviti; obrniti", "Pri vratih zavij levo."], LT: ["pasukti; apsukti", "Prie durų pasuk kairėn."], LV: ["pagriezties; pagriezt", "Pie durvīm pagriezies pa kreisi."] },
  core3000_0141: { SR: ["донети", "Донеси своју књигу, молим те."], SL: ["prinesti", "Prinesi svojo knjigo, prosim."], LT: ["atnešti; atsinešti", "Atsinešk savo knygą, prašau."], LV: ["atnest", "Lūdzu, atnes savu grāmatu."] },
  core3000_0142: { SR: ["рани; рано", "Морамо почети рано."], SL: ["zgodnji; zgodaj", "Začeti moramo zgodaj."], LT: ["ankstyvas; anksti", "Turime pradėti anksti."], LV: ["agrs; agri", "Mums jāsāk agri."] },
  core3000_0143: { SR: ["рука", "Подигни руку."], SL: ["roka", "Dvigni roko."], LT: ["ranka", "Pakelk ranką."], LV: ["roka", "Pacel roku."] },
  core3000_0144: { SR: ["држава; савезна држава", "Калифорнија је велика савезна држава."], SL: ["država; zvezna država", "Kalifornija je velika zvezna država."], LT: ["valstija; valstybė", "Kalifornija yra didelė valstija."], LV: ["štats; valsts", "Kalifornija ir liels štats."] },
  core3000_0145: { SR: ["померити; преместити", "Помери столицу, молим те."], SL: ["premakniti; prestaviti", "Premakni stol, prosim."], LT: ["pajudinti; patraukti", "Prašau patraukti kėdę."], LV: ["pārvietot; kustināt", "Lūdzu, pārvieto krēslu."] },
  core3000_0146: { SR: ["новац", "Треба ми новац за ручак."], SL: ["denar", "Potrebujem denar za kosilo."], LT: ["pinigai", "Man reikia pinigų pietums."], LV: ["nauda", "Man vajag naudu pusdienām."] },
  core3000_0147: { SR: ["чињеница", "Ова чињеница је важна."], SL: ["dejstvo", "To dejstvo je pomembno."], LT: ["faktas", "Šis faktas svarbus."], LV: ["fakts", "Šis fakts ir svarīgs."] },
  core3000_0148: { SR: ["међутим; ипак", "Касно је, али ипак можемо да сачекамо."], SL: ["vendar; kljub temu", "Pozno je, vendar lahko počakamo."], LT: ["tačiau; vis dėlto", "Vėlu, tačiau galime palaukti."], LV: ["tomēr; taču", "Ir vēlu, tomēr varam pagaidīt."] },
  core3000_0149: { SR: ["подручје; област", "Ово подручје је мирно."], SL: ["območje; področje", "To območje je mirno."], LT: ["sritis; rajonas", "Ši sritis rami."], LV: ["apgabals; joma", "Šis apgabals ir kluss."] },
  core3000_0150: { SR: ["обезбедити; пружити", "Школа може да обезбеди ручак."], SL: ["zagotoviti; priskrbeti", "Šola lahko zagotovi kosilo."], LT: ["suteikti; parūpinti", "Mokykla gali parūpinti pietus."], LV: ["nodrošināt; sniegt", "Skola var nodrošināt pusdienas."] },
};

const languages = ["SR", "SL", "LT", "LV"];

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
  if (!localized) throw new Error(`Missing SR/SL/LT/LV translation for ${row.core_item_id}.`);
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
    translation_batch: "sr_sl_lt_lv_v0",
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
const outputPath = path.join(outputDir, `${releaseId}_translation_batch_sr_sl_lt_lv_v0.jsonl`);
await writeJsonl(outputPath, outputRows);

const summaryPath = path.join(outputDir, `${releaseId}_translation_batch_sr_sl_lt_lv_v0_summary.md`);
await fs.writeFile(
  summaryPath,
  [
    `# Translation Batch SR/SL/LT/LV v0: ${releaseId}`,
    "",
    `- Rows: ${outputRows.length}`,
    "- Languages: SR, SL, LT, LV",
    "- Fields: display word plus translated example only",
    "- Target-language transcription fields: not generated",
    "- Status: draft_native_style_qa_v3_checked",
    "",
    "This artifact does not import Postgres rows and does not create a Google Sheet.",
    "Serbian word/example cells use Cyrillic consistently. Slovenian, Lithuanian and Latvian use native Latin orthography.",
    "Function words may use learner-facing glosses where a direct one-word target equivalent is misleading.",
    "Native-style QA v1/v2/v3 repaired obvious naturalness/copy issues during drafting; final QA evidence is still not created.",
    "",
  ].join("\n"),
  "utf8"
);

console.log(
  `English Core 3000 SR/SL/LT/LV translation batch written: ${path.relative(process.cwd(), outputPath)} rows=${outputRows.length}`
);
