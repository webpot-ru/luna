#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ASSIGNED_AT = "2026-06-20";
const CHANNEL_CONFIG_PATH = "config/youtube-channels.json";
const INVENTORY_PATH = "config/youtube-channel-inventory.json";
const LANGUAGE_ORDER_PATH = "config/language-order.json";
const BANNER_COPY_PATH = "config/youtube-channel-banner-copy.json";
const POSITIONING_COPY_PATH = "config/youtube-channel-positioning-copy.json";
const REPORT_PATH = "outputs/youtube-channel-assets/youtube-channel-language-assignment-20260620.json";

const COLLAPSE_PUBLIC_CODE = {
  "EN-GB": "EN",
  "ES-419": "ES",
  "PT-BR": "PT",
};

const EXISTING_PUBLIC_CODES = new Set([
  "en",
  "es",
  "pt",
  "ru",
  "hi",
  "id",
  "fr",
  "de",
  "ja",
  "ko",
  "tr",
  "zh",
]);

const CHANNEL_DETAILS = {
  it: {
    market: "Italian speakers",
    finalChannelName: "LunaCards Italiano",
    targetHandle: "LunaCardsItaliano",
    shortDescription: "Video lezioni con flashcard per italofoni.",
    description:
      "FlashcardsLuna aiuta gli italofoni a imparare con brevi video di flashcard.\n\nIniziamo con lezioni di vocabolario in oltre 50 lingue: ascolta, ripeti, controlla il significato e ripassa con un mini-test.\n\nEsercitati anche sul sito:\nhttps://flashcardsluna.com/it/courses",
  },
  vi: {
    market: "Vietnamese speakers",
    finalChannelName: "LunaCards Tiếng Việt",
    targetHandle: "LunaCardsTiengViet",
    shortDescription: "Bài học video flashcard cho người nói tiếng Việt.",
    description:
      "FlashcardsLuna giúp người nói tiếng Việt học bằng các video flashcard ngắn.\n\nChúng tôi bắt đầu với bài học từ vựng cho hơn 50 ngôn ngữ: nghe, lặp lại, xem nghĩa rồi ôn bằng bài kiểm tra nhỏ.\n\nLuyện tập thêm trên website:\nhttps://flashcardsluna.com/vi/courses",
  },
  th: {
    market: "Thai speakers",
    finalChannelName: "LunaCards ภาษาไทย",
    targetHandle: "LunaCardsThai",
    shortDescription: "วิดีโอบทเรียนแฟลชการ์ดสำหรับผู้พูดภาษาไทย",
    description:
      "FlashcardsLuna ช่วยผู้พูดภาษาไทยเรียนรู้ด้วยวิดีโอแฟลชการ์ดสั้น ๆ\n\nเราเริ่มจากบทเรียนคำศัพท์ในกว่า 50 ภาษา: ฟัง พูดตาม ดูความหมาย แล้วทบทวนด้วยแบบทดสอบสั้น ๆ\n\nฝึกต่อได้ที่เว็บไซต์:\nhttps://flashcardsluna.com/th/courses",
  },
  ms: {
    market: "Malay speakers",
    finalChannelName: "LunaCards Bahasa Melayu",
    targetHandle: "LunaCardsMalay",
    shortDescription: "Pelajaran video kad imbas untuk penutur bahasa Melayu.",
    description:
      "FlashcardsLuna membantu penutur bahasa Melayu belajar melalui video kad imbas yang ringkas.\n\nKami bermula dengan pelajaran kosa kata untuk lebih 50 bahasa: dengar, ulang, semak maksud, kemudian cuba kuiz ringkas.\n\nBerlatih juga di laman web:\nhttps://flashcardsluna.com/ms/courses",
  },
  pl: {
    market: "Polish speakers",
    finalChannelName: "LunaCards Polski",
    targetHandle: "LunaCardsPolski",
    shortDescription: "Lekcje wideo z fiszkami dla osób mówiących po polsku.",
    description:
      "FlashcardsLuna pomaga osobom mówiącym po polsku uczyć się z krótkich filmów z fiszkami.\n\nZaczynamy od słownictwa w ponad 50 językach: słuchaj, powtarzaj, sprawdzaj znaczenie i utrwalaj w krótkim teście.\n\nĆwicz także na stronie:\nhttps://flashcardsluna.com/pl/courses",
  },
  nl: {
    market: "Dutch speakers",
    finalChannelName: "LunaCards Nederlands",
    targetHandle: "LunaCardsNederlands",
    shortDescription: "Flashcard-videolessen voor Nederlandstaligen.",
    description:
      "FlashcardsLuna helpt Nederlandstaligen leren met korte flashcardvideo's.\n\nWe beginnen met woordenschatlessen voor meer dan 50 talen: luister, herhaal, controleer de betekenis en oefen met een korte quiz.\n\nOefen ook op de website:\nhttps://flashcardsluna.com/nl/courses",
  },
  sv: {
    market: "Swedish speakers",
    finalChannelName: "LunaCards Svenska",
    targetHandle: "LunaCardsSvenska",
    shortDescription: "Flashcard-videolektioner för svensktalande.",
    description:
      "FlashcardsLuna hjälper svensktalande att lära sig med korta flashcardvideor.\n\nVi börjar med ordförrådslektioner på över 50 språk: lyssna, upprepa, kontrollera betydelsen och repetera med ett kort test.\n\nÖva också på webbplatsen:\nhttps://flashcardsluna.com/sv/courses",
  },
  no: {
    market: "Norwegian speakers",
    finalChannelName: "LunaCards Norsk",
    targetHandle: "LunaCardsNorsk",
    shortDescription: "Flashcard-videoleksjoner for norsktalende.",
    description:
      "FlashcardsLuna hjelper norsktalende å lære med korte flashcard-videoer.\n\nVi starter med ordforråd på over 50 språk: lytt, gjenta, sjekk betydningen og øv med en kort test.\n\nØv også på nettstedet:\nhttps://flashcardsluna.com/no/courses",
  },
  da: {
    market: "Danish speakers",
    finalChannelName: "LunaCards Dansk",
    targetHandle: "LunaCardsDansk",
    shortDescription: "Flashcard-videolektioner for dansktalende.",
    description:
      "FlashcardsLuna hjælper dansktalende med at lære gennem korte flashcard-videoer.\n\nVi starter med ordforråd på over 50 sprog: lyt, gentag, tjek betydningen og øv med en kort test.\n\nØv også på websitet:\nhttps://flashcardsluna.com/da/courses",
  },
  fi: {
    market: "Finnish speakers",
    finalChannelName: "LunaCards Suomi",
    targetHandle: "LunaCardsSuomi",
    shortDescription: "Flashcard-videotunteja suomenkielisille.",
    description:
      "FlashcardsLuna auttaa suomenkielisiä oppimaan lyhyiden flashcard-videoiden avulla.\n\nAloitamme sanastotunneilla yli 50 kielessä: kuuntele, toista, tarkista merkitys ja harjoittele lyhyellä testillä.\n\nHarjoittele myös sivustolla:\nhttps://flashcardsluna.com/fi/courses",
  },
  cs: {
    market: "Czech speakers",
    finalChannelName: "LunaCards Česky",
    targetHandle: "LunaCardsCesky",
    shortDescription: "Videolekce s kartičkami pro česky mluvící.",
    description:
      "FlashcardsLuna pomáhá česky mluvícím učit se pomocí krátkých videí s kartičkami.\n\nZačínáme slovní zásobou ve více než 50 jazycích: poslouchejte, opakujte, zkontrolujte význam a procvičte si ho krátkým testem.\n\nProcvičujte také na webu:\nhttps://flashcardsluna.com/cs/courses",
  },
  sk: {
    market: "Slovak speakers",
    finalChannelName: "LunaCards Slovensky",
    targetHandle: "LunaCardsSlovensky",
    shortDescription: "Videolekcie s kartičkami pre slovensky hovoriacich.",
    description:
      "FlashcardsLuna pomáha slovensky hovoriacim učiť sa pomocou krátkych videí s kartičkami.\n\nZačíname slovnou zásobou vo viac ako 50 jazykoch: počúvajte, opakujte, skontrolujte význam a precvičte si ho krátkym testom.\n\nCvičte aj na webe:\nhttps://flashcardsluna.com/sk/courses",
  },
  hu: {
    market: "Hungarian speakers",
    finalChannelName: "LunaCards Magyar",
    targetHandle: "LunaCardsMagyar",
    shortDescription: "Tanulókártyás videóleckék magyarul beszélőknek.",
    description:
      "A FlashcardsLuna rövid tanulókártyás videókkal segít a magyarul beszélőknek tanulni.\n\nTöbb mint 50 nyelv szókincsével kezdünk: hallgasd meg, ismételd el, nézd meg a jelentést, majd gyakorolj egy rövid teszttel.\n\nGyakorolj a weboldalon is:\nhttps://flashcardsluna.com/hu/courses",
  },
  ro: {
    market: "Romanian speakers",
    finalChannelName: "LunaCards Română",
    targetHandle: "LunaCardsRomana",
    shortDescription: "Lecții video cu flashcarduri pentru vorbitorii de română.",
    description:
      "FlashcardsLuna îi ajută pe vorbitorii de română să învețe cu videoclipuri scurte cu flashcarduri.\n\nÎncepem cu lecții de vocabular în peste 50 de limbi: ascultă, repetă, verifică sensul și exersează cu un mini-test.\n\nExersează și pe site:\nhttps://flashcardsluna.com/ro/courses",
  },
  bg: {
    market: "Bulgarian speakers",
    finalChannelName: "LunaCards Български",
    targetHandle: "LunaCardsBulgarski",
    shortDescription: "Видео уроци с флашкарти за българоговорящи.",
    description:
      "FlashcardsLuna помага на българоговорящите да учат с кратки видеа с флашкарти.\n\nЗапочваме с уроци по речник за над 50 езика: слушайте, повтаряйте, проверявайте значението и упражнявайте с кратък тест.\n\nУпражнявайте и в сайта:\nhttps://flashcardsluna.com/bg/courses",
  },
  hr: {
    market: "Croatian speakers",
    finalChannelName: "LunaCards Hrvatski",
    targetHandle: "LunaCardsHrvatski",
    shortDescription: "Video lekcije s karticama za govornike hrvatskog.",
    description:
      "FlashcardsLuna pomaže govornicima hrvatskog učiti uz kratke videozapise s karticama.\n\nPočinjemo s lekcijama vokabulara za više od 50 jezika: slušaj, ponovi, provjeri značenje i uvježbaj kratkim testom.\n\nVježbaj i na stranici:\nhttps://flashcardsluna.com/hr/courses",
  },
  sr: {
    market: "Serbian speakers",
    finalChannelName: "LunaCards Srpski",
    targetHandle: "LunaCardsSrpski",
    shortDescription: "Video lekcije sa karticama za govornike srpskog.",
    description:
      "FlashcardsLuna pomaže govornicima srpskog da uče uz kratke video lekcije sa karticama.\n\nPočinjemo sa vokabularom za više od 50 jezika: slušajte, ponovite, proverite značenje i vežbajte kroz kratak test.\n\nVežbajte i na sajtu:\nhttps://flashcardsluna.com/sr/courses",
  },
  sl: {
    market: "Slovenian speakers",
    finalChannelName: "LunaCards Slovenščina",
    targetHandle: "LunaCardsSlovenscina",
    shortDescription: "Video lekcije s karticami za slovensko govoreče.",
    description:
      "FlashcardsLuna slovensko govorečim pomaga pri učenju s kratkimi videi s karticami.\n\nZačenjamo z besediščem v več kot 50 jezikih: poslušaj, ponovi, preveri pomen in utrdi znanje s kratkim testom.\n\nVadi tudi na spletni strani:\nhttps://flashcardsluna.com/sl/courses",
  },
  lt: {
    market: "Lithuanian speakers",
    finalChannelName: "LunaCards Lietuviškai",
    targetHandle: "LunaCardsLietuviu",
    shortDescription: "Vaizdo pamokos su kortelėmis lietuviškai kalbantiems.",
    description:
      "FlashcardsLuna padeda lietuviškai kalbantiems mokytis per trumpus vaizdo įrašus su kortelėmis.\n\nPradedame nuo žodyno pamokų daugiau nei 50 kalbų: klausykitės, kartokite, pasitikrinkite reikšmę ir pasipraktikuokite trumpu testu.\n\nMokykitės ir svetainėje:\nhttps://flashcardsluna.com/lt/courses",
  },
  lv: {
    market: "Latvian speakers",
    finalChannelName: "LunaCards Latviski",
    targetHandle: "LunaCardsLatviesu",
    shortDescription: "Video nodarbības ar kartītēm latviski runājošajiem.",
    description:
      "FlashcardsLuna palīdz latviski runājošajiem mācīties ar īsiem kartīšu video.\n\nSākam ar vārdu krājuma nodarbībām vairāk nekā 50 valodās: klausies, atkārto, pārbaudi nozīmi un nostiprini ar īsu testu.\n\nMācies arī vietnē:\nhttps://flashcardsluna.com/lv/courses",
  },
  et: {
    market: "Estonian speakers",
    finalChannelName: "LunaCards Eesti",
    targetHandle: "LunaCardsEesti",
    shortDescription: "Mälukaartidega videotunnid eesti keele kõnelejatele.",
    description:
      "FlashcardsLuna aitab eesti keele kõnelejatel õppida lühikeste mälukaardivideote abil.\n\nAlustame sõnavaratundidega enam kui 50 keeles: kuula, korda, kontrolli tähendust ja harjuta lühikese testiga.\n\nHarjuta ka veebis:\nhttps://flashcardsluna.com/et/courses",
  },
  is: {
    market: "Icelandic speakers",
    finalChannelName: "LunaCards Íslenska",
    targetHandle: "LunaCardsIslenska",
    shortDescription: "Myndbandskennsla með spjaldkortum fyrir íslenskumælandi.",
    description:
      "FlashcardsLuna hjálpar íslenskumælandi að læra með stuttum spjaldkortamyndböndum.\n\nVið byrjum á orðaforðakennslu í yfir 50 tungumálum: hlustaðu, endurtaktu, athugaðu merkinguna og æfðu með stuttu prófi.\n\nÆfðu líka á vefnum:\nhttps://flashcardsluna.com/is/courses",
  },
  bn: {
    market: "Bengali speakers",
    finalChannelName: "LunaCards বাংলা",
    targetHandle: "LunaCardsBangla",
    shortDescription: "বাংলাভাষীদের জন্য ফ্ল্যাশকার্ড ভিডিও পাঠ।",
    description:
      "FlashcardsLuna বাংলাভাষীদের ছোট ফ্ল্যাশকার্ড ভিডিও দিয়ে শিখতে সাহায্য করে।\n\nআমরা ৫০টিরও বেশি ভাষার শব্দভান্ডার পাঠ দিয়ে শুরু করছি: শুনুন, পুনরাবৃত্তি করুন, অর্থ দেখুন, তারপর ছোট কুইজে অনুশীলন করুন।\n\nওয়েবসাইটেও অনুশীলন করুন:\nhttps://flashcardsluna.com/bn/courses",
  },
  tl: {
    market: "Filipino speakers",
    finalChannelName: "LunaCards Filipino",
    targetHandle: "LunaCardsFilipino",
    shortDescription: "Mga video lesson na may flashcards para sa mga nagsasalita ng Filipino.",
    description:
      "Tinutulungan ng FlashcardsLuna ang mga nagsasalita ng Filipino na matuto gamit ang maiikling flashcard video.\n\nNagsisimula kami sa bokabularyo para sa 50+ wika: makinig, ulitin, tingnan ang kahulugan, at magsanay sa maikling pagsusulit.\n\nMagpraktis din sa website:\nhttps://flashcardsluna.com/tl/courses",
  },
  my: {
    market: "Burmese speakers",
    finalChannelName: "LunaCards မြန်မာ",
    targetHandle: "LunaCardsBurmese",
    shortDescription: "မြန်မာဘာသာပြောသူများအတွက် ဖလက်ရှ်ကတ် ဗီဒီယိုသင်ခန်းစာများ။",
    description:
      "FlashcardsLuna သည် မြန်မာဘာသာပြောသူများကို ဖလက်ရှ်ကတ် ဗီဒီယိုတိုများဖြင့် လေ့လာရန် ကူညီပေးသည်။\n\nဘာသာစကား ၅၀ ကျော်အတွက် ဝေါဟာရသင်ခန်းစာများဖြင့် စတင်ပါသည်: နားထောင်ပါ၊ ထပ်ပြောပါ၊ အဓိပ္ပါယ်ကိုကြည့်ပါ၊ ထို့နောက် စမ်းသပ်မေးခွန်းတိုဖြင့် လေ့ကျင့်ပါ။\n\nဝက်ဘ်ဆိုက်တွင်လည်း လေ့ကျင့်ပါ:\nhttps://flashcardsluna.com/my/courses",
  },
  km: {
    market: "Khmer speakers",
    finalChannelName: "LunaCards ភាសាខ្មែរ",
    targetHandle: "LunaCardsKhmer",
    shortDescription: "វីដេអូមេរៀនកាតចងចាំសម្រាប់អ្នកនិយាយភាសាខ្មែរ។",
    description:
      "FlashcardsLuna ជួយអ្នកនិយាយភាសាខ្មែររៀនតាមវីដេអូកាតចងចាំខ្លីៗ។\n\nយើងចាប់ផ្តើមពីមេរៀនវាក្យសព្ទសម្រាប់ភាសាជាង 50: ស្តាប់ និយាយតាម ពិនិត្យអត្ថន័យ ហើយហាត់ជាមួយតេស្តខ្លី។\n\nហាត់បន្ថែមនៅលើគេហទំព័រ:\nhttps://flashcardsluna.com/km/courses",
  },
  lo: {
    market: "Lao speakers",
    finalChannelName: "LunaCards ພາສາລາວ",
    targetHandle: "LunaCardsLao",
    shortDescription: "ວິດີໂອບົດຮຽນບັດຄຳສັບສຳລັບຜູ້ເວົ້າພາສາລາວ.",
    description:
      "FlashcardsLuna ຊ່ວຍຜູ້ເວົ້າພາສາລາວຮຽນດ້ວຍວິດີໂອບັດຄຳສັບສັ້ນໆ.\n\nພວກເຮົາເລີ່ມຈາກບົດຮຽນຄຳສັບໃນຫຼາຍກວ່າ 50 ພາສາ: ຟັງ, ເວົ້າຕາມ, ເບິ່ງຄວາມໝາຍ ແລ້ວຝຶກດ້ວຍແບບທົດສອບສັ້ນ.\n\nຝຶກຕໍ່ໃນເວັບໄຊ:\nhttps://flashcardsluna.com/lo/courses",
  },
  ne: {
    market: "Nepali speakers",
    finalChannelName: "LunaCards नेपाली",
    targetHandle: "LunaCardsNepali",
    shortDescription: "नेपाली भाषीहरूका लागि फ्ल्यासकार्ड भिडियो पाठहरू।",
    description:
      "FlashcardsLuna ले नेपाली भाषीहरूलाई छोटा फ्ल्यासकार्ड भिडियोबाट सिक्न मद्दत गर्छ।\n\nहामी ५० भन्दा बढी भाषाका शब्दावली पाठबाट सुरु गर्छौं: सुन्नुहोस्, दोहोर्याउनुहोस्, अर्थ हेर्नुहोस्, अनि छोटो परीक्षणबाट अभ्यास गर्नुहोस्।\n\nवेबसाइटमा पनि अभ्यास गर्नुहोस्:\nhttps://flashcardsluna.com/ne/courses",
  },
  si: {
    market: "Sinhala speakers",
    finalChannelName: "LunaCards සිංහල",
    targetHandle: "LunaCardsSinhala",
    shortDescription: "සිංහල කතා කරන අයට ෆ්ලෑෂ්කාඩ් වීඩියෝ පාඩම්.",
    description:
      "FlashcardsLuna සිංහල කතා කරන අයට කෙටි ෆ්ලෑෂ්කාඩ් වීඩියෝ හරහා ඉගෙනීමට උපකාර කරයි.\n\nඅපි භාෂා 50 කට වැඩි ගණනක වචන මාලා පාඩම් වලින් ආරම්භ කරමු: අසන්න, නැවත කියන්න, අර්ථය බලන්න, ඉන්පසු කෙටි පරීක්ෂණයකින් පුහුණු වන්න.\n\nවෙබ් අඩවියෙන්ද පුහුණු වන්න:\nhttps://flashcardsluna.com/si/courses",
  },
  ta: {
    market: "Tamil speakers",
    finalChannelName: "LunaCards தமிழ்",
    targetHandle: "LunaCardsTamil",
    shortDescription: "தமிழ் பேசுவோருக்கான ஃபிளாஷ்கார்டு வீடியோ பாடங்கள்.",
    description:
      "FlashcardsLuna தமிழ் பேசுவோருக்கு குறுகிய ஃபிளாஷ்கார்டு வீடியோக்களால் கற்க உதவுகிறது.\n\n50க்கும் மேற்பட்ட மொழிகளுக்கான சொற்களஞ்சியப் பாடங்களால் தொடங்குகிறோம்: கேளுங்கள், மீண்டும் சொல்லுங்கள், அர்த்தத்தைப் பாருங்கள், பின்னர் சிறிய தேர்வில் பயிற்சி செய்யுங்கள்.\n\nஇணையதளத்திலும் பயிற்சி செய்யுங்கள்:\nhttps://flashcardsluna.com/ta/courses",
  },
  te: {
    market: "Telugu speakers",
    finalChannelName: "LunaCards తెలుగు",
    targetHandle: "LunaCardsTelugu",
    shortDescription: "తెలుగు మాట్లాడేవారికి ఫ్లాష్‌కార్డ్ వీడియో పాఠాలు.",
    description:
      "FlashcardsLuna తెలుగు మాట్లాడేవారికి చిన్న ఫ్లాష్‌కార్డ్ వీడియోలతో నేర్చుకోవడంలో సహాయం చేస్తుంది.\n\nమేము 50కి పైగా భాషల పదజాల పాఠాలతో ప్రారంభిస్తాము: వినండి, పునరావృతం చేయండి, అర్థాన్ని చూడండి, తర్వాత చిన్న పరీక్షతో అభ్యాసం చేయండి.\n\nవెబ్‌సైట్‌లో కూడా అభ్యాసం చేయండి:\nhttps://flashcardsluna.com/te/courses",
  },
  kn: {
    market: "Kannada speakers",
    finalChannelName: "LunaCards ಕನ್ನಡ",
    targetHandle: "LunaCardsKannada",
    shortDescription: "ಕನ್ನಡ ಮಾತನಾಡುವವರಿಗಾಗಿ ಫ್ಲಾಶ್‌ಕಾರ್ಡ್ ವೀಡಿಯೊ ಪಾಠಗಳು.",
    description:
      "FlashcardsLuna ಕನ್ನಡ ಮಾತನಾಡುವವರಿಗೆ ಚಿಕ್ಕ ಫ್ಲಾಶ್‌ಕಾರ್ಡ್ ವೀಡಿಯೊಗಳ ಮೂಲಕ ಕಲಿಯಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.\n\nನಾವು 50ಕ್ಕಿಂತ ಹೆಚ್ಚು ಭಾಷೆಗಳ ಪದಸಂಪತ್ತಿ ಪಾಠಗಳಿಂದ ಪ್ರಾರಂಭಿಸುತ್ತೇವೆ: ಕೇಳಿ, ಮರುಕಳಿ, ಅರ್ಥ ನೋಡಿ, ನಂತರ ಸಣ್ಣ ಪರೀಕ್ಷೆಯಿಂದ ಅಭ್ಯಾಸ ಮಾಡಿ.\n\nವೆಬ್‌ಸೈಟ್‌ನಲ್ಲೂ ಅಭ್ಯಾಸ ಮಾಡಿ:\nhttps://flashcardsluna.com/kn/courses",
  },
  ml: {
    market: "Malayalam speakers",
    finalChannelName: "LunaCards മലയാളം",
    targetHandle: "LunaCardsMalayalam",
    shortDescription: "മലയാളം സംസാരിക്കുന്നവർക്കുള്ള ഫ്ലാഷ്‌കാർഡ് വീഡിയോ പാഠങ്ങൾ.",
    description:
      "FlashcardsLuna മലയാളം സംസാരിക്കുന്നവരെ ചെറിയ ഫ്ലാഷ്‌കാർഡ് വീഡിയോകളിലൂടെ പഠിക്കാൻ സഹായിക്കുന്നു.\n\n50-ൽ അധികം ഭാഷകളിലെ പദസമ്പത്ത് പാഠങ്ങളോടെയാണ് ഞങ്ങൾ തുടങ്ങുന്നത്: കേൾക്കൂ, ആവർത്തിക്കൂ, അർത്ഥം നോക്കൂ, പിന്നെ ചെറിയ ടെസ്റ്റിലൂടെ അഭ്യസിക്കൂ.\n\nവെബ്സൈറ്റിലും അഭ്യസിക്കൂ:\nhttps://flashcardsluna.com/ml/courses",
  },
  uz: {
    market: "Uzbek speakers",
    finalChannelName: "LunaCards O‘zbekcha",
    targetHandle: "LunaCardsUzbek",
    shortDescription: "O‘zbek tilida so‘zlashuvchilar uchun fleshkarta video darslar.",
    description:
      "FlashcardsLuna o‘zbek tilida so‘zlashuvchilarga qisqa fleshkarta videolari orqali o‘rganishga yordam beradi.\n\nBiz 50 dan ortiq til bo‘yicha lug‘at darslaridan boshlaymiz: tinglang, takrorlang, ma'nosini tekshiring va kichik test bilan mashq qiling.\n\nSaytda ham mashq qiling:\nhttps://flashcardsluna.com/uz/courses",
  },
  kk: {
    market: "Kazakh speakers",
    finalChannelName: "LunaCards Қазақша",
    targetHandle: "LunaCardsKazakh",
    shortDescription: "Қазақ тілінде сөйлейтіндерге арналған флешкарта видео сабақтары.",
    description:
      "FlashcardsLuna қазақ тілінде сөйлейтіндерге қысқа флешкарта видеолары арқылы үйренуге көмектеседі.\n\nБіз 50-ден астам тілдегі сөздік сабақтарынан бастаймыз: тыңдаңыз, қайталаңыз, мағынасын тексеріңіз, содан кейін шағын тестпен жаттығыңыз.\n\nСайтта да жаттығыңыз:\nhttps://flashcardsluna.com/kk/courses",
  },
  az: {
    market: "Azerbaijani speakers",
    finalChannelName: "LunaCards Azərbaycan",
    targetHandle: "LunaCardsAzerbaycan",
    shortDescription: "Azərbaycanca danışanlar üçün fleşkart video dərsləri.",
    description:
      "FlashcardsLuna azərbaycanca danışanlara qısa fleşkart videoları ilə öyrənməyə kömək edir.\n\n50-dən çox dil üçün söz ehtiyatı dərslərindən başlayırıq: dinləyin, təkrar edin, mənanı yoxlayın və qısa testlə məşq edin.\n\nSaytda da məşq edin:\nhttps://flashcardsluna.com/az/courses",
  },
  ka: {
    market: "Georgian speakers",
    finalChannelName: "LunaCards ქართული",
    targetHandle: "LunaCardsGeorgian",
    shortDescription: "ფლეშბარათების ვიდეოგაკვეთილები ქართულად მოლაპარაკეებისთვის.",
    description:
      "FlashcardsLuna ქართულად მოლაპარაკეებს ეხმარება მოკლე ფლეშბარათების ვიდეოებით სწავლაში.\n\nვიწყებთ 50-ზე მეტი ენის ლექსიკის გაკვეთილებით: მოუსმინეთ, გაიმეორეთ, შეამოწმეთ მნიშვნელობა და ივარჯიშეთ მოკლე ტესტით.\n\nივარჯიშეთ ვებგვერდზეც:\nhttps://flashcardsluna.com/ka/courses",
  },
  hy: {
    market: "Armenian speakers",
    finalChannelName: "LunaCards Հայերեն",
    targetHandle: "LunaCardsArmenian",
    shortDescription: "Ֆլեշքարտերով վիդեոդասեր հայերեն խոսողների համար։",
    description:
      "FlashcardsLuna-ը օգնում է հայերեն խոսողներին սովորել կարճ ֆլեշքարտային տեսանյութերով։\n\nՍկսում ենք 50-ից ավելի լեզուների բառապաշարի դասերից․ լսեք, կրկնեք, ստուգեք իմաստը, ապա վարժվեք կարճ թեստով։\n\nՎարժվեք նաև կայքում՝\nhttps://flashcardsluna.com/hy/courses",
  },
  sw: {
    market: "Swahili speakers",
    finalChannelName: "LunaCards Kiswahili",
    targetHandle: "LunaCardsSwahili",
    shortDescription: "Masomo ya video ya flashcard kwa wazungumzaji wa Kiswahili.",
    description:
      "FlashcardsLuna huwasaidia wazungumzaji wa Kiswahili kujifunza kupitia video fupi za flashcard.\n\nTunaanza na masomo ya msamiati kwa lugha 50+: sikiliza, rudia, angalia maana, kisha fanya jaribio fupi.\n\nFanya mazoezi pia kwenye tovuti:\nhttps://flashcardsluna.com/sw/courses",
  },
};

function readJson(filePath) {
  return readFile(filePath, "utf8").then((raw) => JSON.parse(raw));
}

function writeJson(filePath, value) {
  return writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function publicOrder(languageOrder, bannerCopy) {
  const seen = new Set();
  const result = [];
  for (const item of languageOrder) {
    const rawCode = item.spreadsheetCode || item.dbCode;
    const publicCode = (COLLAPSE_PUBLIC_CODE[rawCode] || rawCode).toLowerCase();
    if (bannerCopy[publicCode] && !seen.has(publicCode)) {
      seen.add(publicCode);
      result.push(publicCode);
    }
  }
  for (const code of Object.keys(bannerCopy).sort()) {
    if (!seen.has(code)) {
      seen.add(code);
      result.push(code);
    }
  }
  return result;
}

function supportLangsForCode(code) {
  if (code === "en") return ["EN", "EN-GB"];
  if (code === "es") return ["ES", "ES-419"];
  if (code === "pt") return ["PT", "PT-BR"];
  return [code.toUpperCase()];
}

function bannerAssetForCode(code) {
  if (code === "en") {
    return "outputs/youtube-channel-assets/en/lunacards-en-channel-banner-youtube-2560x1440-v8-center-v9-wide-reference-v1.jpg";
  }
  return `outputs/youtube-channel-assets/${code}/lunacards-${code}-channel-banner-youtube-2560x1440-v1-site-ui-center-v9-wide-reference-v1.jpg`;
}

function renderPositioningCopy(positioningCopy, code, siteCoursesUrl, fallbackDetails) {
  const key = String(code || "").toLowerCase();
  const item = positioningCopy.copy?.[key];
  if (!item) {
    return {
      shortDescription: fallbackDetails.shortDescription,
      desiredDescription: fallbackDetails.description,
    };
  }

  const placeholder = positioningCopy.descriptionSitePlaceholder || "{{siteCoursesUrl}}";
  const desiredDescription = item.description.replaceAll(placeholder, siteCoursesUrl).trim();
  if (desiredDescription.includes(placeholder)) {
    throw new Error(`Unreplaced site placeholder in ${key} positioning description.`);
  }

  return {
    shortDescription: item.shortDescription.trim(),
    desiredDescription,
  };
}

function currentHandleFromInventory(item) {
  const handle = item.currentHandle || "";
  return handle.replace(/^@/, "");
}

function currentHandleDisplay(item) {
  const handle = currentHandleFromInventory(item);
  return handle ? `@${handle}` : "(no handle)";
}

async function main() {
  const [channelConfig, inventory, languageOrder, bannerCopy, positioningCopy] = await Promise.all([
    readJson(CHANNEL_CONFIG_PATH),
    readJson(INVENTORY_PATH),
    readJson(LANGUAGE_ORDER_PATH),
    readJson(BANNER_COPY_PATH),
    readJson(POSITIONING_COPY_PATH),
  ]);

  const remainingCodes = publicOrder(languageOrder, bannerCopy).filter((code) => !EXISTING_PUBLIC_CODES.has(code));
  const inventoryRows = inventory.channels || [];
  if (remainingCodes.length !== inventoryRows.length) {
    throw new Error(`Cannot assign languages: ${remainingCodes.length} remaining codes but ${inventoryRows.length} inventory rows.`);
  }

  const missingDetails = remainingCodes.filter((code) => !CHANNEL_DETAILS[code]);
  if (missingDetails.length) {
    throw new Error(`Missing CHANNEL_DETAILS for: ${missingDetails.join(", ")}`);
  }

  const assignment = remainingCodes.map((code, index) => {
    const inventoryRow = inventoryRows[index];
    const details = CHANNEL_DETAILS[code];
    const tokenFile = inventoryRow.tokenFile || `.local/youtube-oauth/tokens/${inventoryRow.tokenKey}.json`;
    const siteCoursesUrl = `https://flashcardsluna.com/${code}/courses`;
    const channelCopy = renderPositioningCopy(positioningCopy, code, siteCoursesUrl, details);
    return {
      code,
      tokenKey: inventoryRow.tokenKey,
      channelId: inventoryRow.channelId,
      currentHandle: currentHandleFromInventory(inventoryRow),
      currentHandleDisplay: currentHandleDisplay(inventoryRow),
      currentTitle: inventoryRow.currentTitle || "",
      currentPublicUrl: inventoryRow.publicUrl,
      targetHandle: details.targetHandle,
      finalChannelName: details.finalChannelName,
      market: details.market,
      shortDescription: channelCopy.shortDescription,
      desiredDescription: channelCopy.desiredDescription,
      siteCoursesUrl,
      bannerAsset: bannerAssetForCode(code),
      avatarAsset: channelConfig.defaults?.avatarAsset || "outputs/youtube-channel-assets/en/flashcardsluna-site-avatar-512.png",
      oauthTokenFile: tokenFile,
      oldContentRisk: inventoryRow.tokenKey === "unassigned-047",
    };
  });

  const remainingSet = new Set(remainingCodes);
  channelConfig.channels = (channelConfig.channels || []).filter((channel) => !remainingSet.has(channel.key));
  for (const item of assignment) {
    channelConfig.channels.push({
      key: item.code,
      supportLangs: supportLangsForCode(item.code),
      currentHandle: item.currentHandle,
      targetHandle: item.targetHandle,
      publicUrl: item.currentPublicUrl,
      channelId: item.channelId,
      siteCoursesUrl: item.siteCoursesUrl,
      finalChannelName: item.finalChannelName,
      bannerAsset: item.bannerAsset,
      bannerSlug: "v1-site-ui-center-v9-wide-reference-v1",
      shortDescription: item.shortDescription,
      desiredDescription: item.desiredDescription,
      profileStatus: "assigned_needs_api_branding",
      oauthTokenFile: item.oauthTokenFile,
      inventoryTokenKey: item.tokenKey,
      notes: [
        `Assigned from ${item.tokenKey} on ${ASSIGNED_AT}.`,
        "Official API can set banner, description and watermark; channel name, handle, avatar, contact email and profile links remain manual YouTube Studio fields.",
        item.oldContentRisk ? "Existing non-Luna channel title/content was present at assignment; review old videos/profile before public launch." : "",
      ].filter(Boolean),
    });
  }

  inventory.channels = inventoryRows.map((row, index) => {
    const item = assignment[index];
    return {
      ...row,
      assignmentStatus: "assigned_to_support_language",
      assignedSupportCode: item.code.toUpperCase(),
      assignedAt: ASSIGNED_AT,
      targetHandle: item.targetHandle,
      finalChannelName: item.finalChannelName,
      siteCoursesUrl: item.siteCoursesUrl,
      bannerAsset: item.bannerAsset,
      assignmentNote: item.oldContentRisk
        ? "Assigned last-priority language slot; old non-Luna content/title present, review before public launch."
        : "Assigned by remaining public support-language priority order.",
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    assignedAt: ASSIGNED_AT,
    sourceOfTruth: "docs/video-lessons-strategy.md#11-channel-branding-packages",
    existingPublicCodes: [...EXISTING_PUBLIC_CODES],
    remainingCodes,
    assignment,
    sheetTab: "YouTube каналы",
    notes: [
      "Current handle/publicUrl are API-readback values from temporary Brand Channel inventory.",
      "Target handle/final channel name are desired manual YouTube Studio values.",
      "YouTube official API write scope is banner, description and watermark only.",
    ],
  };

  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await Promise.all([
    writeJson(CHANNEL_CONFIG_PATH, channelConfig),
    writeJson(INVENTORY_PATH, inventory),
    writeJson(REPORT_PATH, report),
  ]);

  console.log(`assigned=${assignment.length}`);
  for (const item of assignment) {
    console.log(`${item.tokenKey} -> ${item.code.toUpperCase()} ${item.currentHandleDisplay} -> @${item.targetHandle} (${item.finalChannelName})`);
  }
  console.log(`report=${REPORT_PATH}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
