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
  core3000_0001: { UZ: ["aniq artikl", "Eshik ochiq."], KK: ["белгілі артикль", "Есік ашық."], AZ: ["müəyyən artikl", "Qapı açıqdır."] },
  core3000_0002: { UZ: ["bo'lmoq", "Men tayyor bo'lishni xohlayman."], KK: ["болу", "Мен дайын болғым келеді."], AZ: ["olmaq", "Mən hazır olmaq istəyirəm."] },
  core3000_0003: { UZ: ["va", "Choy va suv stol ustida."], KK: ["және", "Шай мен су үстелдің үстінде."], AZ: ["və", "Çay və su stolun üstündədir."] },
  core3000_0004: { UZ: ["-ning", "Bir piyola choy issiq."], KK: ["-ның; -нің", "Бір кесе шай ыстық."], AZ: ["-ın; -in", "Bir fincan çay istidir."] },
  core3000_0005: { UZ: ["-ga; -moq uchun", "Men uyga borishni xohlayman."], KK: ["-ға; -ге", "Мен үйге барғым келеді."], AZ: ["-a; -ə; üçün", "Mən evə getmək istəyirəm."] },
  core3000_0006: { UZ: ["noaniq artikl", "Menda kitob bor."], KK: ["белгісіз артикль", "Менде кітап бар."], AZ: ["qeyri-müəyyən artikl", "Məndə kitab var."] },
  core3000_0007: { UZ: ["ichida; -da", "Kalit sumkaning ichida."], KK: ["ішінде; -да", "Кілт сөмкенің ішінде."], AZ: ["içində; -da", "Açar çantanın içindədir."] },
  core3000_0008: { UZ: ["ega bo'lmoq; bor", "Menda telefon bor."], KK: ["бар болу; иелену", "Менде телефон бар."], AZ: ["sahib olmaq; var", "Məndə telefon var."] },
  core3000_0009: { UZ: ["u; bu", "U sumkaning ichida."], KK: ["ол; бұл", "Ол сөмкенің ішінде."], AZ: ["o; bu", "O çantanın içindədir."] },
  core3000_0010: { UZ: ["sen; siz", "Sen mening do'stimsan."], KK: ["сен; сіз", "Сен менің досымсың."], AZ: ["sən; siz", "Sən mənim dostumsan."] },
  core3000_0011: { UZ: ["u; u erkak", "U maktabda."], KK: ["ол; ер адам", "Ол мектепте."], AZ: ["o; kişi", "O məktəbdədir."] },
  core3000_0012: { UZ: ["uchun", "Bu sovg'a sen uchun."], KK: ["үшін", "Бұл сыйлық саған арналған."], AZ: ["üçün", "Bu hədiyyə sənin üçündür."] },
  core3000_0013: { UZ: ["ular", "Ular uyda."], KK: ["олар", "Олар үйде."], AZ: ["onlar", "Onlar evdədirlər."] },
  core3000_0014: { UZ: ["emas; yo'q", "Men charchagan emasman."], KK: ["емес; жоқ", "Мен шаршаған жоқпын."], AZ: ["deyil; yox", "Mən yorğun deyiləm."] },
  core3000_0015: { UZ: ["o'sha", "O'sha kitob meniki."], KK: ["анау; сол", "Анау кітап менікі."], AZ: ["o; həmin", "O kitab mənimdir."] },
  core3000_0016: { UZ: ["biz", "Biz tayyormiz."], KK: ["біз", "Біз дайынбыз."], AZ: ["biz", "Biz hazırıq."] },
  core3000_0017: { UZ: ["ustida", "Piyola stol ustida."], KK: ["үстінде", "Кесе үстелдің үстінде."], AZ: ["üstündə", "Fincan stolun üstündədir."] },
  core3000_0018: { UZ: ["bilan", "Men oilam bilanman."], KK: ["бірге", "Мен отбасыммен біргемін."], AZ: ["ilə", "Mən ailəmləyəm."] },
  core3000_0019: { UZ: ["bu", "Bu kitob yangi."], KK: ["бұл", "Бұл кітап жаңа."], AZ: ["bu", "Bu kitab yenidir."] },
  core3000_0020: { UZ: ["men", "Men uydaman."], KK: ["мен", "Мен үйдемін."], AZ: ["mən", "Mən evdəyəm."] },
  core3000_0021: { UZ: ["qilmoq", "Men uy vazifamni qilaman."], KK: ["істеу; жасау", "Мен үй тапсырмамды орындаймын."], AZ: ["etmək; görmək", "Mən ev tapşırığımı edirəm."] },
  core3000_0022: { UZ: ["sifatida", "U o'qituvchi sifatida ishlaydi."], KK: ["ретінде", "Ол мұғалім болып жұмыс істейді."], AZ: ["kimi", "O müəllim kimi işləyir."] },
  core3000_0023: { UZ: ["-da; yonida", "Meni maktabda kutib ol."], KK: ["-да; жанында", "Мені мектепте кездестір."], AZ: ["-da; yanında", "Mənimlə məktəbdə görüş."] },
  core3000_0024: { UZ: ["u; u ayol", "U mening opam."], KK: ["ол; әйел адам", "Ол менің әпкем."], AZ: ["o; qadın", "O mənim bacımdır."] },
  core3000_0025: { UZ: ["lekin", "Men charchadim, lekin xursandman."], KK: ["бірақ", "Мен шаршадым, бірақ қуаныштымын."], AZ: ["amma; lakin", "Mən yorğunam, amma xoşbəxtəm."] },
  core3000_0026: { UZ: ["-dan", "Men Kanadadanman."], KK: ["-дан; -ден", "Мен Канададанмын."], AZ: ["-dan; -dən", "Mən Kanadadanam."] },
  core3000_0027: { UZ: ["yonida", "Sumka eshik yonida."], KK: ["жанында", "Сөмке есіктің жанында."], AZ: ["yanında", "Çanta qapının yanındadır."] },
  core3000_0028: { UZ: ["kelasi zamon belgisi", "Men senga qo'ng'iroq qilaman."], KK: ["келер шақ көрсеткіші", "Мен саған қоңырау шаламын."], AZ: ["gələcək zaman göstəricisi", "Mən sənə zəng edəcəyəm."] },
  core3000_0029: { UZ: ["yoki", "Choy yoki qahva bo'ladi."], KK: ["немесе", "Шай немесе кофе жарайды."], AZ: ["və ya", "Çay və ya qəhvə olar."] },
  core3000_0030: { UZ: ["aytmoq", "Iltimos, ismingni ayt."], KK: ["айту", "Өтінемін, атыңды айт."], AZ: ["demək", "Zəhmət olmasa, adını de."] },
  core3000_0031: { UZ: ["bormoq", "Men maktabdan keyin uyga boraman."], KK: ["бару", "Мен мектептен кейін үйге барамын."], AZ: ["getmək", "Mən məktəbdən sonra evə gedirəm."] },
  core3000_0032: { UZ: ["shuning uchun", "Kech bo'ldi, shuning uchun uyga ketyapman."], KK: ["сондықтан", "Кеш болды, сондықтан үйге бара жатырмын."], AZ: ["ona görə", "Gecdir, ona görə evə gedirəm."] },
  core3000_0033: { UZ: ["hamma; barcha", "Barcha talabalar shu yerda."], KK: ["бәрі; барлық", "Барлық оқушылар осында."], AZ: ["hamısı; bütün", "Bütün şagirdlər buradadır."] },
  core3000_0034: { UZ: ["u yerda", "Sumkani u yerga qo'y."], KK: ["онда; сол жерде", "Сөмкені сол жерге қой."], AZ: ["orada", "Çantanı ora qoy."] },
  core3000_0035: { UZ: ["bilmoq", "Men javobni bilaman."], KK: ["білу", "Мен жауапты білемін."], AZ: ["bilmək", "Mən cavabı bilirəm."] },
  core3000_0036: { UZ: ["olmoq; qo'lga kiritmoq", "Men bugun yangi kitob olaman."], KK: ["алу", "Мен бүгін жаңа кітап аламын."], AZ: ["almaq; əldə etmək", "Mən bu gün yeni kitab alıram."] },
  core3000_0037: { UZ: ["o'ylamoq", "Menimcha, bu to'g'ri."], KK: ["ойлау", "Менің ойымша, бұл дұрыс."], AZ: ["düşünmək", "Məncə, bu doğrudur."] },
  core3000_0038: { UZ: ["qilmoq; tayyorlamoq", "Men uyda tushlik tayyorlayman."], KK: ["жасау; дайындау", "Мен үйде түскі ас дайындаймын."], AZ: ["etmək; hazırlamaq", "Mən evdə nahar hazırlayıram."] },
  core3000_0039: { UZ: ["vaqt", "Vaqt muhim."], KK: ["уақыт", "Уақыт маңызды."], AZ: ["vaxt", "Vaxt vacibdir."] },
  core3000_0040: { UZ: ["ko'rmoq", "Men uyni ko'ryapman."], KK: ["көру", "Мен үйді көріп тұрмын."], AZ: ["görmək", "Mən evi görürəm."] },
  core3000_0041: { UZ: ["tashqariga", "Iltimos, hozir tashqariga chiq."], KK: ["сыртқа", "Өтінемін, қазір сыртқа шық."], AZ: ["bayıra", "Zəhmət olmasa, indi bayıra çıx."] },
  core3000_0042: { UZ: ["yaxshi", "Bu yaxshi kun."], KK: ["жақсы", "Бұл жақсы күн."], AZ: ["yaxşı", "Bu yaxşı gündür."] },
  core3000_0043: { UZ: ["odamlar", "Bu yerda ko'p odam bor."], KK: ["адамдар", "Мұнда көп адам бар."], AZ: ["insanlar; adamlar", "Burada çox adam var."] },
  core3000_0044: { UZ: ["yil", "Bir yilda o'n ikki oy bor."], KK: ["жыл", "Бір жылда он екі ай бар."], AZ: ["il", "Bir ildə on iki ay var."] },
  core3000_0045: { UZ: ["olmoq", "Iltimos, bu sumkani ol."], KK: ["алу", "Өтінемін, мына сөмкені ал."], AZ: ["götürmək; almaq", "Zəhmət olmasa, bu çantanı götür."] },
  core3000_0046: { UZ: ["yaxshi", "U yaxshi o'qiydi."], KK: ["жақсы", "Ол жақсы оқиды."], AZ: ["yaxşı", "O yaxşı oxuyur."] },
  core3000_0047: { UZ: ["juda", "Bu xona juda kichik."], KK: ["өте", "Бұл бөлме өте кішкентай."], AZ: ["çox", "Bu otaq çox kiçikdir."] },
  core3000_0048: { UZ: ["faqat; hozirgina", "Menga faqat suv kerak."], KK: ["тек; жаңа ғана", "Маған тек су керек."], AZ: ["sadəcə; indicə", "Mənə sadəcə su lazımdır."] },
  core3000_0049: { UZ: ["kelmoq", "Iltimos, bu yerga kel."], KK: ["келу", "Өтінемін, мұнда кел."], AZ: ["gəlmək", "Zəhmət olmasa, bura gəl."] },
  core3000_0050: { UZ: ["ishlamoq", "Men maktabda ishlayman."], KK: ["жұмыс істеу", "Мен мектепте жұмыс істеймін."], AZ: ["işləmək", "Mən məktəbdə işləyirəm."] },
  core3000_0051: { UZ: ["ishlatmoq; foydalanmoq", "Men bu telefondan har kuni foydalanaman."], KK: ["қолдану", "Мен бұл телефонды күн сайын қолданамын."], AZ: ["istifadə etmək", "Mən bu telefondan hər gün istifadə edirəm."] },
  core3000_0052: { UZ: ["keyin", "Nonushta qil, keyin maktabga bor."], KK: ["содан кейін", "Таңғы ас іш, содан кейін мектепке бар."], AZ: ["sonra", "Səhər yeməyi ye, sonra məktəbə get."] },
  core3000_0053: { UZ: ["ham", "Men inglizcha ham gapiraman."], KK: ["да; де", "Мен ағылшынша да сөйлеймін."], AZ: ["həmçinin; də", "Mən ingiliscə də danışıram."] },
  core3000_0054: { UZ: ["faqat", "Menda faqat bitta ruchka bor."], KK: ["тек", "Менде тек бір қалам бар."], AZ: ["yalnız", "Məndə yalnız bir qələm var."] },
  core3000_0055: { UZ: ["qaramoq", "Doskaga qara."], KK: ["қарау", "Тақтаға қара."], AZ: ["baxmaq", "Lövhəyə bax."] },
  core3000_0056: { UZ: ["xohlamoq; kerak bo'lmoq", "Menga yangi kitob kerak."], KK: ["қалау; керек болу", "Маған жаңа кітап керек."], AZ: ["istəmək", "Mən yeni kitab istəyirəm."] },
  core3000_0057: { UZ: ["bermoq", "Iltimos, menga ruchkani ber."], KK: ["беру", "Өтінемін, маған қаламды бер."], AZ: ["vermək", "Zəhmət olmasa, qələmi mənə ver."] },
  core3000_0058: { UZ: ["birinchi", "Bu mening birinchi kunim."], KK: ["бірінші", "Бұл менің бірінші күнім."], AZ: ["birinci", "Bu mənim birinci günümdür."] },
  core3000_0059: { UZ: ["yangi", "Menda yangi telefon bor."], KK: ["жаңа", "Менде жаңа телефон бар."], AZ: ["yeni", "Məndə yeni telefon var."] },
  core3000_0060: { UZ: ["yo'l; usul", "Bu o'rganishning yaxshi usuli."], KK: ["жол; тәсіл", "Бұл үйренудің жақсы тәсілі."], AZ: ["yol; üsul", "Bu öyrənmək üçün yaxşı üsuldur."] },
  core3000_0061: { UZ: ["topmoq", "Men kalitlarimni stol ustidan topaman."], KK: ["табу", "Мен кілттерімді үстелдің үстінен табамын."], AZ: ["tapmaq", "Mən açarlarımı stolun üstündə tapıram."] },
  core3000_0062: { UZ: ["kun", "Bir kun juda band bo'lishi mumkin."], KK: ["күн", "Бір күн өте қарбалас болуы мүмкін."], AZ: ["gün", "Bir gün çox məşğul ola bilər."] },
  core3000_0063: { UZ: ["narsa; masala", "Bu narsa foydali."], KK: ["нәрсе; мәселе", "Бұл нәрсе пайдалы."], AZ: ["şey; məsələ", "Bu şey faydalıdır."] },
  core3000_0064: { UZ: ["to'g'ri; o'ng", "Javobing to'g'ri."], KK: ["дұрыс; оң", "Жауабың дұрыс."], AZ: ["doğru; sağ", "Cavabın doğrudur."] },
  core3000_0065: { UZ: ["qanday", "Isming qanday yoziladi?"], KK: ["қалай", "Атың қалай жазылады?"], AZ: ["necə", "Adın necə yazılır?"] },
  core3000_0066: { UZ: ["orqaga; qaytib", "Iltimos, tezroq qaytib kel."], KK: ["артқа; қайта", "Өтінемін, жақында қайтып кел."], AZ: ["geri", "Zəhmət olmasa, tezliklə geri gəl."] },
  core3000_0067: { UZ: ["anglatmoq", "Bu so'z nimani anglatadi?"], KK: ["білдіру", "Бұл сөз нені білдіреді?"], AZ: ["mənasını vermək", "Bu söz nə deməkdir?"] },
  core3000_0068: { UZ: ["hatto", "Hatto bola ham buni qila oladi."], KK: ["тіпті", "Мұны тіпті бала да істей алады."], AZ: ["hətta", "Hətta uşaq da bunu edə bilər."] },
  core3000_0069: { UZ: ["shu yerda", "Iltimos, shu yerga o'tir."], KK: ["осында", "Өтінемін, осында отыр."], AZ: ["burada", "Zəhmət olmasa, burada otur."] },
  core3000_0070: { UZ: ["bola", "Bola tashqarida o'ynayapti."], KK: ["бала", "Бала сыртта ойнап жүр."], AZ: ["uşaq", "Uşaq bayırda oynayır."] },
  core3000_0071: { UZ: ["aytmoq", "Iltimos, ismingni menga ayt."], KK: ["айту", "Өтінемін, маған атыңды айт."], AZ: ["demək; söyləmək", "Zəhmət olmasa, adını mənə de."] },
  core3000_0072: { UZ: ["haqiqatan ham", "Menga bu kitob haqiqatan ham yoqadi."], KK: ["шынымен", "Маған бұл кітап шынымен ұнайды."], AZ: ["həqiqətən", "Mən bu kitabı həqiqətən bəyənirəm."] },
  core3000_0073: { UZ: ["qo'ng'iroq qilmoq", "Men onamga har kuni qo'ng'iroq qilaman."], KK: ["қоңырау шалу", "Мен анама күн сайын қоңырау шаламын."], AZ: ["zəng etmək", "Mən anama hər gün zəng edirəm."] },
  core3000_0074: { UZ: ["kompaniya", "Kompaniya bu telefonlarni sotadi."], KK: ["компания", "Компания бұл телефондарды сатады."], AZ: ["şirkət", "Şirkət bu telefonları satır."] },
  core3000_0075: { UZ: ["ko'rsatmoq", "Iltimos, menga xaritani ko'rsat."], KK: ["көрсету", "Өтінемін, маған картаны көрсет."], AZ: ["göstərmək", "Zəhmət olmasa, xəritəni mənə göstər."] },
  core3000_0076: { UZ: ["hayot", "Bu yerda hayot boshqacha."], KK: ["өмір", "Мұнда өмір басқа."], AZ: ["həyat", "Burada həyat fərqlidir."] },
  core3000_0077: { UZ: ["erkak kishi", "Bir erkak kishi tashqarida kutyapti."], KK: ["ер адам", "Бір ер адам сыртта күтіп тұр."], AZ: ["kişi", "Bir kişi bayırda gözləyir."] },
  core3000_0078: { UZ: ["o'zgarmoq; o'zgartirmoq", "Rejalar tez o'zgaradi."], KK: ["өзгеру; өзгерту", "Жоспарлар тез өзгереді."], AZ: ["dəyişmək", "Planlar tez dəyişir."] },
  core3000_0079: { UZ: ["joy", "Bu joy tinch."], KK: ["орын; жер", "Бұл жер тыныш."], AZ: ["yer", "Bu yer sakitdir."] },
  core3000_0080: { UZ: ["uzun", "Bu uzun yo'l."], KK: ["ұзын", "Бұл ұзын жол."], AZ: ["uzun", "Bu uzun yoldur."] },
  core3000_0081: { UZ: ["his qilmoq", "Men bugun o'zimni xursand his qilyapman."], KK: ["сезіну", "Мен бүгін өзімді қуанышты сезінемін."], AZ: ["hiss etmək", "Mən bu gün özümü xoşbəxt hiss edirəm."] },
  core3000_0082: { UZ: ["haddan tashqari; juda", "Bu sumka haddan tashqari og'ir."], KK: ["тым", "Бұл сөмке тым ауыр."], AZ: ["çox; həddindən artıq", "Bu çanta həddindən artıq ağırdır."] },
  core3000_0083: { UZ: ["hali ham", "Men hali ham shu yerda yashayman."], KK: ["әлі де", "Мен әлі де осында тұрамын."], AZ: ["hələ də", "Mən hələ də burada yaşayıram."] },
  core3000_0084: { UZ: ["muammo", "Bu kichik muammo."], KK: ["мәселе; проблема", "Бұл кішкентай мәселе."], AZ: ["problem; məsələ", "Bu kiçik problemdir."] },
  core3000_0085: { UZ: ["yozmoq", "Iltimos, ismingni yoz."], KK: ["жазу", "Өтінемін, атыңды жаз."], AZ: ["yazmaq", "Zəhmət olmasa, adını yaz."] },
  core3000_0086: { UZ: ["ajoyib", "Bu ajoyib fikr."], KK: ["тамаша", "Бұл тамаша идея."], AZ: ["əla; möhtəşəm", "Bu əla fikirdir."] },
  core3000_0087: { UZ: ["harakat qilmoq", "Men har kuni o'rganishga harakat qilaman."], KK: ["тырысу", "Мен күн сайын үйренуге тырысамын."], AZ: ["çalışmaq; cəhd etmək", "Mən hər gün öyrənməyə çalışıram."] },
  core3000_0088: { UZ: ["ketmoq; tark etmoq", "Biz sakkizda ketamiz."], KK: ["кету; қалдыру", "Біз сегізде кетеміз."], AZ: ["getmək; tərk etmək", "Biz səkkizdə çıxırıq."] },
  core3000_0089: { UZ: ["raqam; son", "Raqamni shu yerga yoz."], KK: ["сан; нөмір", "Санды осы жерге жаз."], AZ: ["rəqəm; nömrə", "Rəqəmi bura yaz."] },
  core3000_0090: { UZ: ["qism", "Bu qism muhim."], KK: ["бөлік", "Бұл бөлік маңызды."], AZ: ["hissə", "Bu hissə vacibdir."] },
  core3000_0091: { UZ: ["nuqta; fikr", "Bu fikr aniq."], KK: ["нүкте; ой", "Бұл ой анық."], AZ: ["nöqtə; fikir", "Bu fikir aydındır."] },
  core3000_0092: { UZ: ["yordam bermoq", "Men do'stimga yordam beraman."], KK: ["көмектесу", "Мен досыма көмектесемін."], AZ: ["kömək etmək", "Mən dostuma kömək edirəm."] },
  core3000_0093: { UZ: ["so'ramoq", "Iltimos, savol so'ra."], KK: ["сұрау", "Өтінемін, сұрақ қой."], AZ: ["soruşmaq", "Zəhmət olmasa, sual soruş."] },
  core3000_0094: { UZ: ["uchrashmoq", "Biz maktabda uchrashamiz."], KK: ["кездесу", "Біз мектепте кездесеміз."], AZ: ["görüşmək", "Biz məktəbdə görüşürük."] },
  core3000_0095: { UZ: ["boshlamoq; boshlanmoq", "Darslar to'qqizda boshlanadi."], KK: ["бастау; басталу", "Сабақтар тоғызда басталады."], AZ: ["başlamaq", "Dərslər doqquzda başlayır."] },
  core3000_0096: { UZ: ["gaplashmoq", "Men o'qituvchim bilan gaplashaman."], KK: ["сөйлесу", "Мен мұғаліміммен сөйлесемін."], AZ: ["danışmaq", "Mən müəllimimlə danışıram."] },
  core3000_0097: { UZ: ["qo'ymoq", "Kitobni stol ustiga qo'y."], KK: ["қою", "Кітапты үстелдің үстіне қой."], AZ: ["qoymaq", "Kitabı stolun üstünə qoy."] },
  core3000_0098: { UZ: ["bo'lmoq; aylanish", "Men o'qituvchi bo'lishni xohlayman."], KK: ["болу", "Мен мұғалім болғым келеді."], AZ: ["olmaq", "Mən müəllim olmaq istəyirəm."] },
  core3000_0099: { UZ: ["qiziqish", "U musiqaga qiziqadi."], KK: ["қызығушылық", "Оның музыкаға қызығушылығы бар."], AZ: ["maraq", "Onun musiqiyə marağı var."] },
  core3000_0100: { UZ: ["mamlakat", "Kanada katta mamlakat."], KK: ["ел", "Канада үлкен ел."], AZ: ["ölkə", "Kanada böyük ölkədir."] },
  core3000_0101: { UZ: ["eski; qari", "Bu eski uy."], KK: ["ескі; қарт", "Бұл ескі үй."], AZ: ["köhnə; yaşlı", "Bu köhnə evdir."] },
  core3000_0102: { UZ: ["maktab", "Uyim yaqinida maktab bor."], KK: ["мектеп", "Үйімнің жанында мектеп бар."], AZ: ["məktəb", "Evimin yaxınlığında məktəb var."] },
  core3000_0103: { UZ: ["kech; kechikkan", "Men darsga kech qoldim."], KK: ["кеш; кешіккен", "Мен сабаққа кешіктім."], AZ: ["gec", "Mən dərsə gecikmişəm."] },
  core3000_0104: { UZ: ["baland", "Devor baland."], KK: ["биік", "Қабырға биік."], AZ: ["hündür; yüksək", "Divar hündürdür."] },
  core3000_0105: { UZ: ["turli; boshqacha", "Bu ikki kitob boshqacha."], KK: ["әртүрлі; басқа", "Бұл екі кітап әртүрлі."], AZ: ["fərqli", "Bu iki kitab fərqlidir."] },
  core3000_0106: { UZ: ["oxir", "Hikoyaning oxiri qayg'uli."], KK: ["соңы; аяқталуы", "Әңгіменің соңы қайғылы."], AZ: ["son", "Hekayənin sonu kədərlidir."] },
  core3000_0107: { UZ: ["yashamoq", "Men kichik shaharchada yashayman."], KK: ["тұру; өмір сүру", "Мен шағын қалада тұрамын."], AZ: ["yaşamaq", "Mən kiçik şəhərdə yaşayıram."] },
  core3000_0108: { UZ: ["nima uchun", "Nega sen bu yerdasan?"], KK: ["неге", "Сен неге осындасың?"], AZ: ["niyə", "Sən niyə buradasan?"] },
  core3000_0109: { UZ: ["dunyo", "Odamlar butun dunyo bo'ylab yashaydi."], KK: ["әлем", "Адамдар бүкіл әлемде тұрады."], AZ: ["dünya", "İnsanlar bütün dünyada yaşayırlar."] },
  core3000_0110: { UZ: ["hafta", "Bir haftada yetti kun bor."], KK: ["апта", "Бір аптада жеті күн бар."], AZ: ["həftə", "Bir həftədə yeddi gün var."] },
  core3000_0111: { UZ: ["o'ynamoq", "Bolalar bog'da o'ynaydi."], KK: ["ойнау", "Балалар саябақта ойнайды."], AZ: ["oynamaq", "Uşaqlar parkda oynayırlar."] },
  core3000_0112: { UZ: ["uy", "Men ishdan keyin uyga boraman."], KK: ["үй", "Мен жұмыстан кейін үйге барамын."], AZ: ["ev", "Mən işdən sonra evə gedirəm."] },
  core3000_0113: { UZ: ["hech qachon", "Men hech qachon go'sht yemayman."], KK: ["ешқашан", "Мен ешқашан ет жемеймін."], AZ: ["heç vaxt", "Mən heç vaxt ət yemirəm."] },
  core3000_0114: { UZ: ["o'z ichiga olmoq", "Bu narx nonushtani o'z ichiga olishi mumkin."], KK: ["қамту; кіру", "Бұл бағаға таңғы ас кіруі мүмкін."], AZ: ["daxil etmək", "Bu qiymətə səhər yeməyi daxil ola bilər."] },
  core3000_0115: { UZ: ["kurs", "Bu kurs bugun boshlanadi."], KK: ["курс", "Бұл курс бүгін басталады."], AZ: ["kurs", "Bu kurs bu gün başlayır."] },
  core3000_0116: { UZ: ["uy", "Maktab yaqinida uy bor."], KK: ["үй", "Мектептің жанында үй бар."], AZ: ["ev", "Məktəbin yaxınlığında ev var."] },
  core3000_0117: { UZ: ["hisobot", "Hisobot qisqa."], KK: ["есеп", "Есеп қысқа."], AZ: ["hesabat", "Hesabat qısadır."] },
  core3000_0118: { UZ: ["guruh", "Talabalar guruhi kutyapti."], KK: ["топ", "Оқушылар тобы күтіп тұр."], AZ: ["qrup", "Bir qrup şagird gözləyir."] },
  core3000_0119: { UZ: ["holat; ish", "Bu holat boshqacha."], KK: ["жағдай; іс", "Бұл жағдай басқа."], AZ: ["hal; iş", "Bu hal fərqlidir."] },
  core3000_0120: { UZ: ["ayol", "Bir ayol tashqarida kutyapti."], KK: ["әйел", "Бір әйел сыртта күтіп тұр."], AZ: ["qadın", "Bir qadın bayırda gözləyir."] },
  core3000_0121: { UZ: ["kitob", "Bu kitob yangi."], KK: ["кітап", "Бұл кітап жаңа."], AZ: ["kitab", "Bu kitab yenidir."] },
  core3000_0122: { UZ: ["oila", "Oilam uyda."], KK: ["отбасы", "Менің отбасым үйде."], AZ: ["ailə", "Ailəm evdədir."] },
  core3000_0123: { UZ: ["ko'rinmoq; tuyulmoq", "Sen charchaganga o'xshaysan."], KK: ["көріну; сияқты болу", "Сен шаршаған сияқтысың."], AZ: ["görünmək", "Sən yorğun görünürsən."] },
  core3000_0124: { UZ: ["ruxsat bermoq", "Iltimos, yordam berishimga ruxsat ber."], KK: ["рұқсат беру", "Өтінемін, маған көмектесуге рұқсат ет."], AZ: ["icazə vermək", "Zəhmət olmasa, kömək etməyimə icazə ver."] },
  core3000_0125: { UZ: ["yana", "Iltimos, buni yana ayt."], KK: ["қайта; тағы", "Өтінемін, оны қайта айт."], AZ: ["yenə", "Zəhmət olmasa, bunu yenə de."] },
  core3000_0126: { UZ: ["tur", "Bunday choy yaxshi."], KK: ["түр", "Мұндай шай жақсы."], AZ: ["növ", "Bu növ çay yaxşıdır."] },
  core3000_0127: { UZ: ["saqlamoq; qo'ymoq", "Telefoningni shu yerda qoldir."], KK: ["сақтау; ұстау", "Телефоныңды осы жерде ұста."], AZ: ["saxlamaq", "Telefonunu burada saxla."] },
  core3000_0128: { UZ: ["eshitmoq", "Men tashqaridan musiqa eshityapman."], KK: ["есту", "Мен сырттан музыка естіп тұрмын."], AZ: ["eşitmək", "Mən bayırdan musiqi eşidirəm."] },
  core3000_0129: { UZ: ["tizim", "Bu tizim oddiy."], KK: ["жүйе", "Бұл жүйе қарапайым."], AZ: ["sistem", "Bu sistem sadədir."] },
  core3000_0130: { UZ: ["savol", "Hozir savol so'ra."], KK: ["сұрақ", "Қазір сұрақ қой."], AZ: ["sual", "İndi sual soruş."] },
  core3000_0131: { UZ: ["har doim", "U har doim erta keladi."], KK: ["әрқашан", "Ол әрқашан ерте келеді."], AZ: ["həmişə", "O həmişə tez gəlir."] },
  core3000_0132: { UZ: ["katta", "Bu katta xona."], KK: ["үлкен", "Бұл үлкен бөлме."], AZ: ["böyük", "Bu böyük otaqdır."] },
  core3000_0133: { UZ: ["to'plam", "Bu to'plamda oltita piyola bor."], KK: ["жинақ", "Бұл жинақта алты кесе бар."], AZ: ["dəst", "Bu dəstdə altı fincan var."] },
  core3000_0134: { UZ: ["kichik", "Bu kichik xona."], KK: ["кішкентай", "Бұл кішкентай бөлме."], AZ: ["kiçik", "Bu kiçik otaqdır."] },
  core3000_0135: { UZ: ["o'qimoq; o'rganmoq", "Men har kuni ingliz tilini o'rganaman."], KK: ["оқу; үйрену", "Мен күн сайын ағылшын тілін үйренемін."], AZ: ["oxumaq; öyrənmək", "Mən hər gün ingilis dilini öyrənirəm."] },
  core3000_0136: { UZ: ["ergashmoq; amal qilmoq", "Iltimos, o'qituvchiga ergash."], KK: ["еру; орындау", "Өтінемін, мұғалімнің соңынан ер."], AZ: ["izləmək; əməl etmək", "Zəhmət olmasa, müəllimi izlə."] },
  core3000_0137: { UZ: ["boshlamoq", "Dars hozir boshlanishi mumkin."], KK: ["бастау; басталу", "Сабақ қазір басталуы мүмкін."], AZ: ["başlamaq", "Dərs indi başlaya bilər."] },
  core3000_0138: { UZ: ["muhim", "Bu savol muhim."], KK: ["маңызды", "Бұл сұрақ маңызды."], AZ: ["vacib", "Bu sual vacibdir."] },
  core3000_0139: { UZ: ["yugurmoq", "Men bog'da yuguraman."], KK: ["жүгіру", "Мен саябақта жүгіремін."], AZ: ["qaçmaq", "Mən parkda qaçıram."] },
  core3000_0140: { UZ: ["burilmoq; aylantirmoq", "Eshik yonida chapga buril."], KK: ["бұрылу; айналдыру", "Есіктің жанында солға бұрыл."], AZ: ["dönmək; çevirmək", "Qapının yanında sola dön."] },
  core3000_0141: { UZ: ["olib kelmoq", "Iltimos, kitobingni olib kel."], KK: ["әкелу", "Өтінемін, кітабыңды әкел."], AZ: ["gətirmək", "Zəhmət olmasa, kitabını gətir."] },
  core3000_0142: { UZ: ["erta; barvaqt", "Bizga erta boshlash kerak."], KK: ["ерте", "Бізге ерте бастау керек."], AZ: ["erkən", "Bizə erkən başlamaq lazımdır."] },
  core3000_0143: { UZ: ["qo'l", "Qo'lingni ko'tar."], KK: ["қол", "Қолыңды көтер."], AZ: ["əl", "Əlini qaldır."] },
  core3000_0144: { UZ: ["shtat", "Kaliforniya katta shtat."], KK: ["штат", "Калифорния үлкен штат."], AZ: ["ştat", "Kaliforniya böyük ştatdır."] },
  core3000_0145: { UZ: ["siljitmoq; ko'chirmoq", "Iltimos, stulni siljit."], KK: ["жылжыту", "Өтінемін, орындықты жылжыт."], AZ: ["tərpətmək; köçürmək", "Zəhmət olmasa, stulu tərpət."] },
  core3000_0146: { UZ: ["pul", "Menga tushlik uchun pul kerak."], KK: ["ақша", "Маған түскі асқа ақша керек."], AZ: ["pul", "Mənə nahar üçün pul lazımdır."] },
  core3000_0147: { UZ: ["fakt; dalil", "Bu fakt muhim."], KK: ["дерек; факт", "Бұл дерек маңызды."], AZ: ["fakt", "Bu fakt vacibdir."] },
  core3000_0148: { UZ: ["biroq; ammo", "Kech bo'ldi; ammo biz kutishimiz mumkin."], KK: ["алайда", "Кеш болды; алайда біз күте аламыз."], AZ: ["lakin; bununla belə", "Gecdir; lakin biz gözləyə bilərik."] },
  core3000_0149: { UZ: ["hudud; maydon", "Bu hudud tinch."], KK: ["аймақ; аудан", "Бұл аймақ тыныш."], AZ: ["ərazi; sahə", "Bu ərazi sakitdir."] },
  core3000_0150: { UZ: ["ta'minlamoq; bermoq", "Maktab tushlik bilan ta'minlay oladi."], KK: ["қамтамасыз ету; беру", "Мектеп түскі аспен қамтамасыз ете алады."], AZ: ["təmin etmək; vermək", "Məktəb naharla təmin edə bilər."] },
};

const languages = ["UZ", "KK", "AZ"];

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
  if (!localized) throw new Error(`Missing UZ/KK/AZ translation for ${row.core_item_id}.`);
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
    translation_batch: "uz_kk_az_v0",
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
const outputPath = path.join(outputDir, `${releaseId}_translation_batch_uz_kk_az_v0.jsonl`);
await writeJsonl(outputPath, outputRows);

const summaryPath = path.join(outputDir, `${releaseId}_translation_batch_uz_kk_az_v0_summary.md`);
await fs.writeFile(
  summaryPath,
  [
    `# Translation Batch UZ/KK/AZ v0: ${releaseId}`,
    "",
    `- Rows: ${outputRows.length}`,
    "- Languages: UZ, KK, AZ",
    "- Fields: display word plus translated example only",
    "- Target-language transcription fields: not generated",
    "- Status: draft_native_style_qa_v2_checked",
    "",
    "This artifact does not import Postgres rows and does not create a Google Sheet.",
    "Uzbek uses modern Latin Uzbek. Kazakh uses Kazakh Cyrillic. Azerbaijani uses modern Latin Azerbaijani.",
    "Function words may use learner-facing glosses where a direct one-word target equivalent is misleading.",
    "Native-style QA v2 repaired obvious naturalness, degree, permission and case-governance issues during drafting; final QA evidence is still not created.",
    "",
  ].join("\n"),
  "utf8"
);

console.log(
  `English Core 3000 UZ/KK/AZ translation batch written: ${path.relative(process.cwd(), outputPath)} rows=${outputRows.length}`
);
