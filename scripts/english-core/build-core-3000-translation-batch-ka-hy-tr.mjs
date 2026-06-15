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
  core3000_0001: { KA: ["განსაზღვრული არტიკლი", "კარი ღიაა."], HY: ["որոշյալ հոդ", "Դուռը բաց է։"], TR: ["belirli artikel", "Kapı açık."] },
  core3000_0002: { KA: ["ყოფნა", "მინდა მზად ვიყო."], HY: ["լինել", "Ես ուզում եմ պատրաստ լինել։"], TR: ["olmak", "Hazır olmak istiyorum."] },
  core3000_0003: { KA: ["და", "ჩაი და წყალი მაგიდაზეა."], HY: ["և", "Թեյն ու ջուրը սեղանի վրա են։"], TR: ["ve", "Çay ve su masanın üzerinde."] },
  core3000_0004: { KA: ["-ის; -ს", "ერთი ჭიქა ჩაი ცხელია."], HY: ["-ի", "Մի բաժակ թեյը տաք է։"], TR: ["-in; -ın", "Bir fincan çay sıcak."] },
  core3000_0005: { KA: ["-კენ; -თვის", "მინდა სახლში წავიდე."], HY: ["դեպի; համար", "Ես ուզում եմ տուն գնալ։"], TR: ["-e; -a; için", "Eve gitmek istiyorum."] },
  core3000_0006: { KA: ["განუსაზღვრელი არტიკლი", "წიგნი მაქვს."], HY: ["անորոշ հոդ", "Ես գիրք ունեմ։"], TR: ["belirsiz artikel", "Bir kitabım var."] },
  core3000_0007: { KA: ["-ში; შიგნით", "გასაღები ჩანთაშია."], HY: ["մեջ; -ում", "Բանալին պայուսակի մեջ է։"], TR: ["içinde; -de", "Anahtar çantanın içinde."] },
  core3000_0008: { KA: ["ქონა", "ტელეფონი მაქვს."], HY: ["ունենալ", "Ես հեռախոս ունեմ։"], TR: ["sahip olmak; var", "Telefonum var."] },
  core3000_0009: { KA: ["ის; ეს", "ის ჩანთაშია."], HY: ["այն; սա", "Այն պայուսակի մեջ է։"], TR: ["o; bu", "O çantanın içinde."] },
  core3000_0010: { KA: ["შენ; თქვენ", "შენ ჩემი მეგობარი ხარ."], HY: ["դու; դուք", "Դու իմ ընկերն ես։"], TR: ["sen; siz", "Sen benim arkadaşımsın."] },
  core3000_0011: { KA: ["ის; კაცი", "ის სკოლაშია."], HY: ["նա; տղամարդ", "Նա դպրոցում է։"], TR: ["o; erkek", "O okulda."] },
  core3000_0012: { KA: ["-თვის", "ეს საჩუქარი შენთვისაა."], HY: ["համար", "Այս նվերը քեզ համար է։"], TR: ["için", "Bu hediye senin için."] },
  core3000_0013: { KA: ["ისინი", "ისინი სახლში არიან."], HY: ["նրանք", "Նրանք տանն են։"], TR: ["onlar", "Onlar evde."] },
  core3000_0014: { KA: ["არა; არ", "დაღლილი არ ვარ."], HY: ["ոչ; չ-", "Ես հոգնած չեմ։"], TR: ["değil; yok", "Yorgun değilim."] },
  core3000_0015: { KA: ["ის", "ის წიგნი ჩემია."], HY: ["այն", "Այդ գիրքն իմն է։"], TR: ["şu; o", "O kitap benim."] },
  core3000_0016: { KA: ["ჩვენ", "ჩვენ მზად ვართ."], HY: ["մենք", "Մենք պատրաստ ենք։"], TR: ["biz", "Biz hazırız."] },
  core3000_0017: { KA: ["-ზე", "ჭიქა მაგიდაზეა."], HY: ["վրա", "Բաժակը սեղանի վրա է։"], TR: ["üstünde", "Fincan masanın üstünde."] },
  core3000_0018: { KA: ["ერთად; -თან", "ოჯახთან ერთად ვარ."], HY: ["հետ", "Ես ընտանիքիս հետ եմ։"], TR: ["ile", "Ailemleyim."] },
  core3000_0019: { KA: ["ეს", "ეს წიგნი ახალია."], HY: ["սա; այս", "Այս գիրքը նոր է։"], TR: ["bu", "Bu kitap yeni."] },
  core3000_0020: { KA: ["მე", "სახლში ვარ."], HY: ["ես", "Ես տանն եմ։"], TR: ["ben", "Ben evdeyim."] },
  core3000_0021: { KA: ["გაკეთება", "საშინაო დავალებას ვაკეთებ."], HY: ["անել", "Ես տնային աշխատանքս եմ անում։"], TR: ["yapmak", "Ödevimi yapıyorum."] },
  core3000_0022: { KA: ["როგორც", "ის მასწავლებლად მუშაობს."], HY: ["որպես", "Նա աշխատում է որպես ուսուցիչ։"], TR: ["olarak", "O öğretmen olarak çalışıyor."] },
  core3000_0023: { KA: ["-ში; -თან", "სკოლაში შემხვდი."], HY: ["-ում; մոտ", "Ինձ դպրոցում հանդիպիր։"], TR: ["-de; yanında", "Benimle okulda buluş."] },
  core3000_0024: { KA: ["ის; ქალი", "ის ჩემი დაა."], HY: ["նա; կին", "Նա իմ քույրն է։"], TR: ["o; kadın", "O benim kız kardeşim."] },
  core3000_0025: { KA: ["მაგრამ", "დაღლილი ვარ, მაგრამ ბედნიერი ვარ."], HY: ["բայց", "Ես հոգնած եմ, բայց ուրախ եմ։"], TR: ["ama; fakat", "Yorgunum ama mutluyum."] },
  core3000_0026: { KA: ["-დან", "კანადიდან ვარ."], HY: ["-ից", "Ես Կանադայից եմ։"], TR: ["-den; -dan", "Kanada'danım."] },
  core3000_0027: { KA: ["გვერდით", "ჩანთა კართან არის."], HY: ["կողքին", "Պայուսակը դռան կողքին է։"], TR: ["yanında", "Çanta kapının yanında."] },
  core3000_0028: { KA: ["მომავალი დროის მაჩვენებელი", "შენ დაგირეკავ."], HY: ["ապառնի ժամանակի նշան", "Ես քեզ կզանգեմ։"], TR: ["gelecek zaman eki", "Seni arayacağım."] },
  core3000_0029: { KA: ["ან", "ჩაი ან ყავა კარგია."], HY: ["կամ", "Թեյը կամ սուրճը հարմար է։"], TR: ["veya; ya da", "Çay ya da kahve olur."] },
  core3000_0030: { KA: ["თქმა", "გთხოვ, შენი სახელი თქვი."], HY: ["ասել", "Խնդրում եմ, անունդ ասա։"], TR: ["söylemek; demek", "Lütfen adını söyle."] },
  core3000_0031: { KA: ["წასვლა", "სკოლის შემდეგ სახლში მივდივარ."], HY: ["գնալ", "Դպրոցից հետո տուն եմ գնում։"], TR: ["gitmek", "Okuldan sonra eve gidiyorum."] },
  core3000_0032: { KA: ["ამიტომ", "გვიანია, ამიტომ სახლში მივდივარ."], HY: ["ուստի; դրա համար", "Ուշ է, դրա համար տուն եմ գնում։"], TR: ["bu yüzden", "Geç oldu, bu yüzden eve gidiyorum."] },
  core3000_0033: { KA: ["ყველა", "ყველა მოსწავლე აქ არის."], HY: ["բոլոր; բոլորը", "Բոլոր աշակերտներն այստեղ են։"], TR: ["hepsi; bütün", "Bütün öğrenciler burada."] },
  core3000_0034: { KA: ["იქ", "ჩანთა იქ დადე."], HY: ["այնտեղ", "Պայուսակը այնտեղ դիր։"], TR: ["orada; oraya", "Çantayı oraya koy."] },
  core3000_0035: { KA: ["ცოდნა", "პასუხი ვიცი."], HY: ["իմանալ", "Ես պատասխանը գիտեմ։"], TR: ["bilmek", "Cevabı biliyorum."] },
  core3000_0036: { KA: ["მიღება; აღება", "დღეს ახალ წიგნს ვიღებ."], HY: ["ստանալ; վերցնել", "Այսօր նոր գիրք եմ ստանում։"], TR: ["almak", "Bugün yeni bir kitap alıyorum."] },
  core3000_0037: { KA: ["ფიქრი", "ვფიქრობ, ეს სწორია."], HY: ["մտածել", "Կարծում եմ՝ սա ճիշտ է։"], TR: ["düşünmek", "Bence bu doğru."] },
  core3000_0038: { KA: ["გაკეთება; მომზადება", "სახლში სადილს ვამზადებ."], HY: ["անել; պատրաստել", "Ես տանը ճաշ եմ պատրաստում։"], TR: ["yapmak; hazırlamak", "Evde öğle yemeği hazırlıyorum."] },
  core3000_0039: { KA: ["დრო", "დრო მნიშვნელოვანია."], HY: ["ժամանակ", "Ժամանակը կարևոր է։"], TR: ["zaman", "Zaman önemli."] },
  core3000_0040: { KA: ["ნახვა; დანახვა", "სახლს ვხედავ."], HY: ["տեսնել", "Ես տունը տեսնում եմ։"], TR: ["görmek", "Evi görüyorum."] },
  core3000_0041: { KA: ["გარეთ", "გთხოვ, ახლა გარეთ გადი."], HY: ["դուրս", "Խնդրում եմ, հիմա դուրս գնա։"], TR: ["dışarı", "Lütfen şimdi dışarı çık."] },
  core3000_0042: { KA: ["კარგი", "ეს კარგი დღეა."], HY: ["լավ", "Սա լավ օր է։"], TR: ["iyi", "Bu iyi bir gün."] },
  core3000_0043: { KA: ["ხალხი; ადამიანები", "აქ ბევრი ადამიანია."], HY: ["մարդիկ", "Այստեղ շատ մարդ կա։"], TR: ["insanlar", "Burada birçok insan var."] },
  core3000_0044: { KA: ["წელი", "წელიწადში თორმეტი თვეა."], HY: ["տարի", "Տարվա մեջ տասներկու ամիս կա։"], TR: ["yıl", "Bir yılda on iki ay vardır."] },
  core3000_0045: { KA: ["აღება", "გთხოვ, ეს ჩანთა აიღე."], HY: ["վերցնել", "Խնդրում եմ, այս պայուսակը վերցրու։"], TR: ["almak", "Lütfen bu çantayı al."] },
  core3000_0046: { KA: ["კარგად", "ის კარგად კითხულობს."], HY: ["լավ", "Նա լավ է կարդում։"], TR: ["iyi", "O iyi okur."] },
  core3000_0047: { KA: ["ძალიან", "ეს ოთახი ძალიან პატარაა."], HY: ["շատ", "Այս սենյակը շատ փոքր է։"], TR: ["çok", "Bu oda çok küçük."] },
  core3000_0048: { KA: ["მხოლოდ; ახლახან", "მხოლოდ წყალი მჭირდება."], HY: ["միայն; հենց նոր", "Ինձ միայն ջուր է պետք։"], TR: ["sadece; az önce", "Sadece suya ihtiyacım var."] },
  core3000_0049: { KA: ["მოსვლა", "გთხოვ, აქ მოდი."], HY: ["գալ", "Խնդրում եմ, այստեղ արի։"], TR: ["gelmek", "Lütfen buraya gel."] },
  core3000_0050: { KA: ["მუშაობა", "სკოლაში ვმუშაობ."], HY: ["աշխատել", "Ես դպրոցում եմ աշխատում։"], TR: ["çalışmak", "Okulda çalışıyorum."] },
  core3000_0051: { KA: ["გამოყენება", "ამ ტელეფონს ყოველდღე ვიყენებ."], HY: ["օգտագործել", "Ես այս հեռախոսը ամեն օր օգտագործում եմ։"], TR: ["kullanmak", "Bu telefonu her gün kullanıyorum."] },
  core3000_0052: { KA: ["შემდეგ", "ისაუზმე, შემდეგ სკოლაში წადი."], HY: ["հետո", "Նախաճաշիր, հետո դպրոց գնա։"], TR: ["sonra", "Kahvaltı yap, sonra okula git."] },
  core3000_0053: { KA: ["ასევე", "ინგლისურადაც ვლაპარაკობ."], HY: ["նաև", "Ես նաև անգլերեն եմ խոսում։"], TR: ["ayrıca; de", "Ben de İngilizce konuşuyorum."] },
  core3000_0054: { KA: ["მხოლოდ", "მხოლოდ ერთი კალამი მაქვს."], HY: ["միայն", "Ես միայն մեկ գրիչ ունեմ։"], TR: ["yalnızca; sadece", "Sadece bir kalemim var."] },
  core3000_0055: { KA: ["ყურება; შეხედვა", "დაფას შეხედე."], HY: ["նայել", "Գրատախտակին նայիր։"], TR: ["bakmak", "Tahtaya bak."] },
  core3000_0056: { KA: ["ნდომა", "ახალი წიგნი მინდა."], HY: ["ուզել", "Ես նոր գիրք եմ ուզում։"], TR: ["istemek", "Yeni bir kitap istiyorum."] },
  core3000_0057: { KA: ["მიცემა", "გთხოვ, კალამი მომეცი."], HY: ["տալ", "Խնդրում եմ, գրիչը տուր ինձ։"], TR: ["vermek", "Lütfen kalemi bana ver."] },
  core3000_0058: { KA: ["პირველი", "ეს ჩემი პირველი დღეა."], HY: ["առաջին", "Սա իմ առաջին օրն է։"], TR: ["ilk; birinci", "Bu benim ilk günüm."] },
  core3000_0059: { KA: ["ახალი", "ახალი ტელეფონი მაქვს."], HY: ["նոր", "Ես նոր հեռախոս ունեմ։"], TR: ["yeni", "Yeni bir telefonum var."] },
  core3000_0060: { KA: ["გზა; მეთოდი", "ეს სწავლის კარგი გზაა."], HY: ["ճանապարհ; եղանակ", "Սա սովորելու լավ ձև է։"], TR: ["yol; yöntem", "Bu öğrenmek için iyi bir yol."] },
  core3000_0061: { KA: ["პოვნა", "გასაღებებს მაგიდაზე ვპოულობ."], HY: ["գտնել", "Բանալիներս սեղանի վրա եմ գտնում։"], TR: ["bulmak", "Anahtarlarımı masanın üstünde buluyorum."] },
  core3000_0062: { KA: ["დღე", "ერთი დღე შეიძლება ძალიან დატვირთული იყოს."], HY: ["օր", "Մի օր կարող է շատ զբաղված լինել։"], TR: ["gün", "Bir gün çok yoğun olabilir."] },
  core3000_0063: { KA: ["ნივთი; რამ", "ეს ნივთი სასარგებლოა."], HY: ["բան; առարկա", "Այս բանը օգտակար է։"], TR: ["şey; konu", "Bu şey yararlı."] },
  core3000_0064: { KA: ["სწორი; მარჯვენა", "შენი პასუხი სწორია."], HY: ["ճիշտ; աջ", "Քո պատասխանը ճիշտ է։"], TR: ["doğru; sağ", "Cevabın doğru."] },
  core3000_0065: { KA: ["როგორ", "შენი სახელი როგორ იწერება?"], HY: ["ինչպես", "Անունդ ինչպե՞ս է գրվում։"], TR: ["nasıl", "Adın nasıl yazılır?"] },
  core3000_0066: { KA: ["უკან; დაბრუნებით", "გთხოვ, მალე დაბრუნდი."], HY: ["հետ; ետ", "Խնդրում եմ, շուտ վերադարձիր։"], TR: ["geri", "Lütfen yakında geri gel."] },
  core3000_0067: { KA: ["ნიშნავდეს", "ეს სიტყვა რას ნიშნავს?"], HY: ["նշանակել", "Այս բառը ի՞նչ է նշանակում։"], TR: ["anlamına gelmek", "Bu kelime ne anlama geliyor?"] },
  core3000_0068: { KA: ["თუნდაც", "ამას ბავშვიც კი შეძლებს."], HY: ["նույնիսկ", "Նույնիսկ երեխան կարող է սա անել։"], TR: ["bile", "Bunu bir çocuk bile yapabilir."] },
  core3000_0069: { KA: ["აქ", "გთხოვ, აქ დაჯექი."], HY: ["այստեղ", "Խնդրում եմ, այստեղ նստիր։"], TR: ["burada", "Lütfen buraya otur."] },
  core3000_0070: { KA: ["ბავშვი", "ბავშვი გარეთ თამაშობს."], HY: ["երեխա", "Երեխան դրսում է խաղում։"], TR: ["çocuk", "Çocuk dışarıda oynuyor."] },
  core3000_0071: { KA: ["თქმა; მოყოლა", "გთხოვ, შენი სახელი მითხარი."], HY: ["ասել; պատմել", "Խնդրում եմ, անունդ ինձ ասա։"], TR: ["söylemek; anlatmak", "Lütfen adını bana söyle."] },
  core3000_0072: { KA: ["ნამდვილად", "ეს წიგნი ნამდვილად მომწონს."], HY: ["իսկապես", "Ինձ այս գիրքն իսկապես դուր է գալիս։"], TR: ["gerçekten", "Bu kitabı gerçekten seviyorum."] },
  core3000_0073: { KA: ["დარეკვა", "დედას ყოველდღე ვურეკავ."], HY: ["զանգել", "Ես ամեն օր մայրիկիս եմ զանգում։"], TR: ["aramak", "Annemi her gün arıyorum."] },
  core3000_0074: { KA: ["კომპანია", "კომპანია ამ ტელეფონებს ყიდის."], HY: ["ընկերություն", "Ընկերությունն այս հեռախոսներն է վաճառում։"], TR: ["şirket", "Şirket bu telefonları satıyor."] },
  core3000_0075: { KA: ["ჩვენება", "გთხოვ, რუკა მაჩვენე."], HY: ["ցույց տալ", "Խնդրում եմ, քարտեզը ցույց տուր ինձ։"], TR: ["göstermek", "Lütfen haritayı bana göster."] },
  core3000_0076: { KA: ["ცხოვრება", "აქ ცხოვრება სხვანაირია."], HY: ["կյանք", "Այստեղ կյանքը տարբեր է։"], TR: ["hayat", "Burada hayat farklı."] },
  core3000_0077: { KA: ["კაცი", "ერთი კაცი გარეთ ელოდება."], HY: ["տղամարդ", "Մի տղամարդ դրսում սպասում է։"], TR: ["erkek; adam", "Bir adam dışarıda bekliyor."] },
  core3000_0078: { KA: ["შეცვლა", "გეგმები სწრაფად იცვლება."], HY: ["փոխվել; փոխել", "Պլանները արագ փոխվում են։"], TR: ["değişmek; değiştirmek", "Planlar hızla değişir."] },
  core3000_0079: { KA: ["ადგილი", "ეს ადგილი მშვიდია."], HY: ["տեղ", "Այս տեղը հանգիստ է։"], TR: ["yer", "Burası sessiz bir yer."] },
  core3000_0080: { KA: ["გრძელი", "ეს გრძელი გზაა."], HY: ["երկար", "Սա երկար ճանապարհ է։"], TR: ["uzun", "Bu uzun bir yol."] },
  core3000_0081: { KA: ["გრძნობა", "დღეს თავს ბედნიერად ვგრძნობ."], HY: ["զգալ", "Այսօր ես ինձ ուրախ եմ զգում։"], TR: ["hissetmek", "Bugün kendimi mutlu hissediyorum."] },
  core3000_0082: { KA: ["ზედმეტად", "ეს ჩანთა ზედმეტად მძიმეა."], HY: ["չափազանց", "Այս պայուսակը չափազանց ծանր է։"], TR: ["fazla; aşırı", "Bu çanta aşırı ağır."] },
  core3000_0083: { KA: ["ჯერ კიდევ", "ჯერ კიდევ აქ ვცხოვრობ."], HY: ["դեռ", "Ես դեռ այստեղ եմ ապրում։"], TR: ["hâlâ", "Hâlâ burada yaşıyorum."] },
  core3000_0084: { KA: ["პრობლემა", "ეს პატარა პრობლემაა."], HY: ["խնդիր", "Սա փոքր խնդիր է։"], TR: ["sorun; problem", "Bu küçük bir sorun."] },
  core3000_0085: { KA: ["წერა", "გთხოვ, შენი სახელი დაწერე."], HY: ["գրել", "Խնդրում եմ, անունդ գրիր։"], TR: ["yazmak", "Lütfen adını yaz."] },
  core3000_0086: { KA: ["შესანიშნავი", "ეს შესანიშნავი იდეაა."], HY: ["հիանալի", "Սա հիանալի գաղափար է։"], TR: ["harika", "Bu harika bir fikir."] },
  core3000_0087: { KA: ["ცდა", "ყოველდღე სწავლას ვცდილობ."], HY: ["փորձել", "Ես ամեն օր փորձում եմ սովորել։"], TR: ["denemek; çalışmak", "Her gün öğrenmeye çalışıyorum."] },
  core3000_0088: { KA: ["წასვლა; დატოვება", "რვაზე მივდივართ."], HY: ["գնալ; դուրս գալ", "Մենք ութին դուրս ենք գալիս։"], TR: ["ayrılmak; bırakmak", "Saat sekizde çıkıyoruz."] },
  core3000_0089: { KA: ["რიცხვი; ნომერი", "რიცხვი აქ დაწერე."], HY: ["թիվ; համար", "Թիվը այստեղ գրիր։"], TR: ["sayı; numara", "Numarayı buraya yaz."] },
  core3000_0090: { KA: ["ნაწილი", "ეს ნაწილი მნიშვნელოვანია."], HY: ["մաս", "Այս մասը կարևոր է։"], TR: ["bölüm; parça", "Bu bölüm önemli."] },
  core3000_0091: { KA: ["წერტილი; აზრი", "ეს აზრი ნათელია."], HY: ["կետ; միտք", "Այս միտքը պարզ է։"], TR: ["nokta; fikir", "Bu fikir açık."] },
  core3000_0092: { KA: ["დახმარება", "მეგობარს ვეხმარები."], HY: ["օգնել", "Ես ընկերոջս օգնում եմ։"], TR: ["yardım etmek", "Arkadaşıma yardım ediyorum."] },
  core3000_0093: { KA: ["კითხვა", "გთხოვ, კითხვა დასვი."], HY: ["հարցնել", "Խնդրում եմ, հարց տուր։"], TR: ["sormak", "Lütfen bir soru sor."] },
  core3000_0094: { KA: ["შეხვედრა", "სკოლაში ვხვდებით."], HY: ["հանդիպել", "Մենք դպրոցում ենք հանդիպում։"], TR: ["buluşmak; tanışmak", "Okulda buluşuyoruz."] },
  core3000_0095: { KA: ["დაწყება", "გაკვეთილები ცხრაზე იწყება."], HY: ["սկսել; սկսվել", "Դասերը ժամը իննին են սկսվում։"], TR: ["başlamak", "Dersler dokuzda başlıyor."] },
  core3000_0096: { KA: ["ლაპარაკი", "მასწავლებელს ველაპარაკები."], HY: ["խոսել", "Ես ուսուցչիս հետ եմ խոսում։"], TR: ["konuşmak", "Öğretmenimle konuşuyorum."] },
  core3000_0097: { KA: ["დადება", "წიგნი მაგიდაზე დადე."], HY: ["դնել", "Գիրքը սեղանի վրա դիր։"], TR: ["koymak", "Kitabı masanın üstüne koy."] },
  core3000_0098: { KA: ["გახდომა", "მინდა მასწავლებელი გავხდე."], HY: ["դառնալ", "Ես ուզում եմ ուսուցիչ դառնալ։"], TR: ["olmak; haline gelmek", "Öğretmen olmak istiyorum."] },
  core3000_0099: { KA: ["ინტერესი", "მას მუსიკა აინტერესებს."], HY: ["հետաքրքրություն", "Նա երաժշտությամբ հետաքրքրված է։"], TR: ["ilgi", "Onun müziğe ilgisi var."] },
  core3000_0100: { KA: ["ქვეყანა", "კანადა დიდი ქვეყანაა."], HY: ["երկիր", "Կանադան մեծ երկիր է։"], TR: ["ülke", "Kanada büyük bir ülke."] },
  core3000_0101: { KA: ["ძველი; მოხუცი", "ეს ძველი სახლია."], HY: ["հին; ծեր", "Սա հին տուն է։"], TR: ["eski; yaşlı", "Bu eski bir ev."] },
  core3000_0102: { KA: ["სკოლა", "ჩემს სახლთან ახლოს სკოლაა."], HY: ["դպրոց", "Տանս մոտ դպրոց կա։"], TR: ["okul", "Evimin yakınında bir okul var."] },
  core3000_0103: { KA: ["გვიანი; დაგვიანებული", "გაკვეთილზე დამაგვიანდა."], HY: ["ուշ; ուշացած", "Ես դասից ուշացել եմ։"], TR: ["geç", "Derse geç kaldım."] },
  core3000_0104: { KA: ["მაღალი", "კედელი მაღალია."], HY: ["բարձր", "Պատը բարձր է։"], TR: ["yüksek", "Duvar yüksek."] },
  core3000_0105: { KA: ["სხვადასხვა; განსხვავებული", "ეს ორი წიგნი განსხვავებულია."], HY: ["տարբեր", "Այս երկու գրքերը տարբեր են։"], TR: ["farklı", "Bu iki kitap farklı."] },
  core3000_0106: { KA: ["დასასრული", "ამბის დასასრული სევდიანია."], HY: ["վերջ", "Պատմության վերջը տխուր է։"], TR: ["son", "Hikayenin sonu üzücü."] },
  core3000_0107: { KA: ["ცხოვრება", "პატარა ქალაქში ვცხოვრობ."], HY: ["ապրել", "Ես փոքր քաղաքում եմ ապրում։"], TR: ["yaşamak", "Küçük bir kasabada yaşıyorum."] },
  core3000_0108: { KA: ["რატომ", "აქ რატომ ხარ?"], HY: ["ինչու", "Ինչո՞ւ ես այստեղ։"], TR: ["neden; niçin", "Neden buradasın?"] },
  core3000_0109: { KA: ["მსოფლიო", "ადამიანები მთელ მსოფლიოში ცხოვრობენ."], HY: ["աշխարհ", "Մարդիկ ապրում են ամբողջ աշխարհում։"], TR: ["dünya", "İnsanlar dünyanın her yerinde yaşar."] },
  core3000_0110: { KA: ["კვირა", "კვირაში შვიდი დღეა."], HY: ["շաբաթ", "Շաբաթում յոթ օր կա։"], TR: ["hafta", "Bir haftada yedi gün vardır."] },
  core3000_0111: { KA: ["თამაში", "ბავშვები პარკში თამაშობენ."], HY: ["խաղալ", "Երեխաները այգում են խաղում։"], TR: ["oynamak", "Çocuklar parkta oynar."] },
  core3000_0112: { KA: ["სახლი; სახლში", "სამსახურის შემდეგ სახლში მივდივარ."], HY: ["տուն; տանը", "Աշխատանքից հետո տուն եմ գնում։"], TR: ["ev", "İşten sonra eve gidiyorum."] },
  core3000_0113: { KA: ["არასდროს", "ხორცს არასდროს ვჭამ."], HY: ["երբեք", "Ես երբեք միս չեմ ուտում։"], TR: ["asla; hiç", "Ben hiç et yemem."] },
  core3000_0114: { KA: ["შეიცავს; მოიცავს", "ამ ფასში შეიძლება საუზმეც შედიოდეს."], HY: ["ներառել", "Այս գինը կարող է նախաճաշ ներառել։"], TR: ["içermek", "Bu fiyata kahvaltı dahil olabilir."] },
  core3000_0115: { KA: ["კურსი", "ეს კურსი დღეს იწყება."], HY: ["դասընթաց", "Այս դասընթացը այսօր է սկսվում։"], TR: ["kurs", "Bu kurs bugün başlıyor."] },
  core3000_0116: { KA: ["სახლი", "სკოლასთან ახლოს სახლია."], HY: ["տուն", "Դպրոցի մոտ տուն կա։"], TR: ["ev", "Okulun yakınında bir ev var."] },
  core3000_0117: { KA: ["ანგარიში", "ანგარიში მოკლეა."], HY: ["զեկույց", "Զեկույցը կարճ է։"], TR: ["rapor", "Rapor kısa."] },
  core3000_0118: { KA: ["ჯგუფი", "მოსწავლეთა ჯგუფი ელოდება."], HY: ["խումբ", "Մի խումբ աշակերտներ սպասում են։"], TR: ["grup", "Bir grup öğrenci bekliyor."] },
  core3000_0119: { KA: ["შემთხვევა; საქმე", "ეს შემთხვევა განსხვავებულია."], HY: ["դեպք; գործ", "Այս դեպքը տարբեր է։"], TR: ["durum; dava", "Bu durum farklı."] },
  core3000_0120: { KA: ["ქალი", "ერთი ქალი გარეთ ელოდება."], HY: ["կին", "Մի կին դրսում սպասում է։"], TR: ["kadın", "Bir kadın dışarıda bekliyor."] },
  core3000_0121: { KA: ["წიგნი", "ეს წიგნი ახალია."], HY: ["գիրք", "Այս գիրքը նոր է։"], TR: ["kitap", "Bu kitap yeni."] },
  core3000_0122: { KA: ["ოჯახი", "ჩემი ოჯახი სახლშია."], HY: ["ընտանիք", "Իմ ընտանիքը տանն է։"], TR: ["aile", "Ailem evde."] },
  core3000_0123: { KA: ["ჩანდეს; გამოიყურებოდეს", "დაღლილი ჩანხარ."], HY: ["թվալ", "Դու հոգնած ես թվում։"], TR: ["görünmek", "Yorgun görünüyorsun."] },
  core3000_0124: { KA: ["ნებართვის მიცემა", "გთხოვ, ნება მომეცი დაგეხმარო."], HY: ["թույլ տալ", "Խնդրում եմ, թույլ տուր օգնեմ։"], TR: ["izin vermek", "Lütfen yardım etmeme izin ver."] },
  core3000_0125: { KA: ["ისევ; კვლავ", "გთხოვ, ეს ისევ თქვი."], HY: ["նորից", "Խնդրում եմ, դա նորից ասա։"], TR: ["yeniden; yine", "Lütfen onu tekrar söyle."] },
  core3000_0126: { KA: ["სახეობა; ტიპი", "ამ სახეობის ჩაი კარგია."], HY: ["տեսակ", "Այս տեսակի թեյը լավ է։"], TR: ["tür", "Bu tür çay iyi."] },
  core3000_0127: { KA: ["შენახვა; დატოვება", "ტელეფონი აქ დატოვე."], HY: ["պահել", "Հեռախոսդ այստեղ պահիր։"], TR: ["saklamak; tutmak", "Telefonunu burada tut."] },
  core3000_0128: { KA: ["მოსმენა; გაგონება", "გარედან მუსიკა მესმის."], HY: ["լսել", "Ես դրսից երաժշտություն եմ լսում։"], TR: ["duymak; işitmek", "Dışarıdan müzik duyuyorum."] },
  core3000_0129: { KA: ["სისტემა", "ეს სისტემა მარტივია."], HY: ["համակարգ", "Այս համակարգը պարզ է։"], TR: ["sistem", "Bu sistem basit."] },
  core3000_0130: { KA: ["კითხვა", "ახლა კითხვა დასვი."], HY: ["հարց", "Հիմա հարց տուր։"], TR: ["soru", "Şimdi bir soru sor."] },
  core3000_0131: { KA: ["ყოველთვის", "ის ყოველთვის ადრე მოდის."], HY: ["միշտ", "Նա միշտ շուտ է գալիս։"], TR: ["her zaman", "O her zaman erken gelir."] },
  core3000_0132: { KA: ["დიდი", "ეს დიდი ოთახია."], HY: ["մեծ", "Սա մեծ սենյակ է։"], TR: ["büyük", "Bu büyük bir oda."] },
  core3000_0133: { KA: ["ნაკრები", "ამ ნაკრებში ექვსი ჭიქაა."], HY: ["հավաքածու", "Այս հավաքածուում վեց բաժակ կա։"], TR: ["set; takım", "Bu sette altı fincan var."] },
  core3000_0134: { KA: ["პატარა", "ეს პატარა ოთახია."], HY: ["փոքր", "Սա փոքր սենյակ է։"], TR: ["küçük", "Bu küçük bir oda."] },
  core3000_0135: { KA: ["სწავლა", "ინგლისურს ყოველდღე ვსწავლობ."], HY: ["սովորել; ուսումնասիրել", "Ես ամեն օր անգլերեն եմ սովորում։"], TR: ["çalışmak; öğrenmek", "Her gün İngilizce çalışıyorum."] },
  core3000_0136: { KA: ["მიყოლა; დაცვა", "გთხოვ, მასწავლებელს მიჰყევი."], HY: ["հետևել", "Խնդրում եմ, հետևիր ուսուցչին։"], TR: ["takip etmek; uymak", "Lütfen öğretmeni takip et."] },
  core3000_0137: { KA: ["დაწყება", "გაკვეთილი ახლა შეიძლება დაიწყოს."], HY: ["սկսել", "Դասը հիմա կարող է սկսվել։"], TR: ["başlamak", "Ders şimdi başlayabilir."] },
  core3000_0138: { KA: ["მნიშვნელოვანი", "ეს კითხვა მნიშვნელოვანია."], HY: ["կարևոր", "Այս հարցը կարևոր է։"], TR: ["önemli", "Bu soru önemli."] },
  core3000_0139: { KA: ["სირბილი", "პარკში დავრბივარ."], HY: ["վազել", "Ես այգում եմ վազում։"], TR: ["koşmak", "Parkta koşuyorum."] },
  core3000_0140: { KA: ["მობრუნება; მოხვევა", "კართან მარცხნივ მოუხვიე."], HY: ["շրջվել; թեքվել", "Դռան մոտ ձախ թեքվիր։"], TR: ["dönmek; çevirmek", "Kapının yanında sola dön."] },
  core3000_0141: { KA: ["მოტანა", "გთხოვ, შენი წიგნი მოიტანე."], HY: ["բերել", "Խնդրում եմ, գիրքդ բեր։"], TR: ["getirmek", "Lütfen kitabını getir."] },
  core3000_0142: { KA: ["ადრე; ადრეული", "ადრე დაწყება გვჭირდება."], HY: ["վաղ", "Մեզ վաղ սկիզբ է պետք։"], TR: ["erken", "Erken başlamamız gerekiyor."] },
  core3000_0143: { KA: ["ხელი", "ხელი აწიე."], HY: ["ձեռք", "Ձեռքդ բարձրացրու։"], TR: ["el", "Elini kaldır."] },
  core3000_0144: { KA: ["შტატი", "კალიფორნია დიდი შტატია."], HY: ["նահանգ", "Կալիֆոռնիան մեծ նահանգ է։"], TR: ["eyalet", "Kaliforniya büyük bir eyalet."] },
  core3000_0145: { KA: ["გადაწევა; გადატანა", "გთხოვ, სკამი გასწიე."], HY: ["տեղափոխել; շարժել", "Խնդրում եմ, աթոռը տեղաշարժիր։"], TR: ["hareket ettirmek; taşımak", "Lütfen sandalyeyi hareket ettir."] },
  core3000_0146: { KA: ["ფული", "სადილისთვის ფული მჭირდება."], HY: ["փող", "Ինձ ճաշի համար փող է պետք։"], TR: ["para", "Öğle yemeği için paraya ihtiyacım var."] },
  core3000_0147: { KA: ["ფაქტი", "ეს ფაქტი მნიშვნელოვანია."], HY: ["փաստ", "Այս փաստը կարևոր է։"], TR: ["gerçek; olgu", "Bu gerçek önemli."] },
  core3000_0148: { KA: ["თუმცა", "გვიანია; თუმცა შეგვიძლია დაველოდოთ."], HY: ["սակայն; այնուամենայնիվ", "Ուշ է, սակայն կարող ենք սպասել։"], TR: ["ancak; bununla birlikte", "Geç oldu; ancak bekleyebiliriz."] },
  core3000_0149: { KA: ["ტერიტორია; არეალი", "ეს ტერიტორია მშვიდია."], HY: ["տարածք", "Այս տարածքը հանգիստ է։"], TR: ["alan; bölge", "Bu bölge sessiz."] },
  core3000_0150: { KA: ["უზრუნველყოფა; მიცემა", "სკოლას შეუძლია სადილი უზრუნველყოს."], HY: ["տրամադրել; ապահովել", "Դպրոցը կարող է ճաշ տրամադրել։"], TR: ["sağlamak; sunmak", "Okul öğle yemeği sunabilir."] },
};

const languages = ["KA", "HY", "TR"];

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
  if (!localized) throw new Error(`Missing KA/HY/TR translation for ${row.core_item_id}.`);
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
    translation_batch: "ka_hy_tr_v0",
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
const outputPath = path.join(outputDir, `${releaseId}_translation_batch_ka_hy_tr_v0.jsonl`);
await writeJsonl(outputPath, outputRows);

const summaryPath = path.join(outputDir, `${releaseId}_translation_batch_ka_hy_tr_v0_summary.md`);
await fs.writeFile(
  summaryPath,
  [
    `# Translation Batch KA/HY/TR v0: ${releaseId}`,
    "",
    `- Rows: ${outputRows.length}`,
    "- Languages: KA, HY, TR",
    "- Fields: display word plus translated example only",
    "- Target-language transcription fields: not generated",
    "- Status: draft_native_style_qa_v2_checked",
    "",
    "This artifact does not import Postgres rows and does not create a Google Sheet.",
    "Georgian uses Georgian script. Armenian uses Armenian script. Turkish uses modern Turkish Latin orthography.",
    "Function words may use learner-facing glosses where a direct one-word target equivalent is misleading.",
    "Native-style QA v2 repaired obvious naturalness, display-form, time and case-governance issues during drafting; final QA evidence is still not created.",
    "",
  ].join("\n"),
  "utf8"
);

console.log(
  `English Core 3000 KA/HY/TR translation batch written: ${path.relative(process.cwd(), outputPath)} rows=${outputRows.length}`
);
