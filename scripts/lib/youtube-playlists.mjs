import fs from "node:fs";
import path from "node:path";
import { BRAND_NAME } from "./brand.mjs";
import { getLanguageNameInLang } from "./card-slide-template.mjs";

export const DEFAULT_PLAYLIST_REGISTRY_PATH = "config/youtube-playlists.json";
export const DEFAULT_CHANNEL_CONFIG_PATH = "config/youtube-channels.json";

const EN_LANGUAGE_NAMES = {
  EN: "English",
  "EN-GB": "British English",
  ES: "Spanish",
  "ES-419": "Latin American Spanish",
  RU: "Russian",
  DE: "German",
  FR: "French",
  IT: "Italian",
  PT: "Portuguese",
  "PT-BR": "Brazilian Portuguese",
  JA: "Japanese",
  KO: "Korean",
  ZH: "Chinese",
  VI: "Vietnamese",
  TH: "Thai",
  TR: "Turkish",
  ID: "Indonesian",
  MS: "Malay",
  PL: "Polish",
  NL: "Dutch",
  SV: "Swedish",
  NO: "Norwegian",
  DA: "Danish",
  FI: "Finnish",
  CS: "Czech",
  SK: "Slovak",
  HU: "Hungarian",
  RO: "Romanian",
  BG: "Bulgarian",
  HR: "Croatian",
  SR: "Serbian",
  SL: "Slovenian",
  LT: "Lithuanian",
  LV: "Latvian",
  ET: "Estonian",
  IS: "Icelandic",
  HI: "Hindi",
  BN: "Bengali",
  TL: "Filipino",
  MY: "Burmese",
  KM: "Khmer",
  LO: "Lao",
  NE: "Nepali",
  SI: "Sinhala",
  TA: "Tamil",
  TE: "Telugu",
  KN: "Kannada",
  ML: "Malayalam",
  UZ: "Uzbek",
  KK: "Kazakh",
  AZ: "Azerbaijani",
  KA: "Georgian",
  HY: "Armenian",
  SW: "Swahili",
};

const RU_LANGUAGE_NAMES = {
  EN: "Английский",
  "EN-GB": "Британский английский",
  ES: "Испанский",
  "ES-419": "Латиноамериканский испанский",
  RU: "Русский",
  DE: "Немецкий",
  FR: "Французский",
  IT: "Итальянский",
  PT: "Португальский",
  "PT-BR": "Бразильский португальский",
  JA: "Японский",
  KO: "Корейский",
  ZH: "Китайский",
  VI: "Вьетнамский",
  TH: "Тайский",
  TR: "Турецкий",
  ID: "Индонезийский",
  MS: "Малайский",
  PL: "Польский",
  NL: "Нидерландский",
  SV: "Шведский",
  NO: "Норвежский",
  DA: "Датский",
  FI: "Финский",
  CS: "Чешский",
  SK: "Словацкий",
  HU: "Венгерский",
  RO: "Румынский",
  BG: "Болгарский",
  HR: "Хорватский",
  SR: "Сербский",
  SL: "Словенский",
  LT: "Литовский",
  LV: "Латышский",
  ET: "Эстонский",
  IS: "Исландский",
  HI: "Хинди",
  BN: "Бенгальский",
  TL: "Филиппинский",
  MY: "Бирманский",
  KM: "Кхмерский",
  LO: "Лаосский",
  NE: "Непальский",
  SI: "Сингальский",
  TA: "Тамильский",
  TE: "Телугу",
  KN: "Каннада",
  ML: "Малаялам",
  UZ: "Узбекский",
  KK: "Казахский",
  AZ: "Азербайджанский",
  KA: "Грузинский",
  HY: "Армянский",
  SW: "Суахили",
};

const KK_LANGUAGE_NAMES = {
  EN: "Ағылшын",
  "EN-GB": "Британдық ағылшын",
  ES: "Испан",
  "ES-419": "Латын Америкасы испан",
  RU: "Орыс",
  DE: "Неміс",
  FR: "Француз",
  IT: "Итальян",
  PT: "Португал",
  "PT-BR": "Бразилия португал",
  JA: "Жапон",
  KO: "Корей",
  ZH: "Қытай",
  VI: "Вьетнам",
  TH: "Тай",
  TR: "Түрік",
  ID: "Индонезия",
  MS: "Малай",
  PL: "Поляк",
  NL: "Нидерланд",
  SV: "Швед",
  NO: "Норвег",
  DA: "Дат",
  FI: "Фин",
  CS: "Чех",
  SK: "Словак",
  HU: "Венгр",
  RO: "Румын",
  BG: "Болгар",
  HR: "Хорват",
  SR: "Серб",
  SL: "Словен",
  LT: "Литва",
  LV: "Латыш",
  ET: "Эстон",
  IS: "Исланд",
  HI: "Хинди",
  BN: "Бенгал",
  TL: "Филиппин",
  MY: "Бирма",
  KM: "Кхмер",
  LO: "Лаос",
  NE: "Непал",
  SI: "Сингал",
  TA: "Тамил",
  TE: "Телугу",
  KN: "Каннада",
  ML: "Малаялам",
  UZ: "Өзбек",
  KK: "Қазақ",
  AZ: "Әзербайжан",
  KA: "Грузин",
  HY: "Армян",
  SW: "Суахили",
};

function getPlaylistLanguageName(targetLang, supportLang) {
  const target = normalizeLanguageCode(targetLang);
  const support = normalizeLanguageCode(supportLang);
  if (support === "EN" || support === "EN-GB") return EN_LANGUAGE_NAMES[target] || target;
  if (support === "RU") return RU_LANGUAGE_NAMES[target] || EN_LANGUAGE_NAMES[target] || target;
  if (support === "KK") return KK_LANGUAGE_NAMES[target] || EN_LANGUAGE_NAMES[target] || target;
  const localized = getLanguageNameInLang(target, support);
  if (localized && localized !== target) return localized;
  return EN_LANGUAGE_NAMES[target] || target;
}

export function normalizeLanguageCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

export function customThumbnailUploadAllowed(channelRegistry = {}, channel = {}) {
  const defaultValue = channelRegistry?.defaults?.customThumbnailUploadAllowed;
  const channelValue = channel?.customThumbnailUploadAllowed;
  if (channelValue === true) return true;
  if (channelValue === false) return false;
  if (defaultValue === true) return true;
  return false;
}

export function normalizeSlugPart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripLevel(value) {
  return cleanText(value).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

const NATIVE_PLAYLIST_TEMPLATES = {
  BG: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: думи и произношение`,
    description: ({ targetName }) => `${BRAND_NAME} видеа за българскоговорящи, които учат ${targetName}: карти с думи, произношение, паузи за повторение и кратки мини тестове.`
  },
  BN: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: শব্দভান্ডার ও উচ্চারণ`,
    description: ({ targetName }) => `${BRAND_NAME} ভিডিও বাংলা ভাষাভাষীদের ${targetName} শেখাতে সাহায্য করে: ফ্ল্যাশকার্ড, উচ্চারণ, পুনরাবৃত্তির বিরতি এবং ছোট পরীক্ষা।`
  },
  CS: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: slovíčka a výslovnost`,
    description: ({ targetName }) => `Videa ${BRAND_NAME} pro česky mluvící studenty, kteří se učí ${targetName}: kartičky, výslovnost, pauzy na opakování a krátké mini testy.`
  },
  DA: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: ordforråd og udtale`,
    description: ({ targetName }) => `${BRAND_NAME}-videoer for dansktalende, der lærer ${targetName}: flashcards, udtale, gentagelsespauser og korte mini-tests.`
  },
  ET: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: sõnavara ja hääldus`,
    description: ({ targetName }) => `${BRAND_NAME} videod eesti keelt kõnelevatele õppijatele, kes õpivad ${targetName}: sõnakaardid, hääldus, kordamispausid ja lühikesed minitestid.`
  },
  FI: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: sanasto ja ääntäminen`,
    description: ({ targetName }) => `${BRAND_NAME}-videot suomenkielisille oppijoille, jotka opiskelevat ${targetName}: sanakortit, ääntäminen, toistotauot ja lyhyet minitestit.`
  },
  HR: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: rječnik i izgovor`,
    description: ({ targetName }) => `${BRAND_NAME} videozapisi za govornike hrvatskog koji uče ${targetName}: kartice, izgovor, pauze za ponavljanje i kratki mini testovi.`
  },
  HU: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: szókincs és kiejtés`,
    description: ({ targetName }) => `${BRAND_NAME} videók magyar anyanyelvű tanulóknak, akik ${targetName} nyelvet tanulnak: szókártyák, kiejtés, ismétlési szünetek és rövid mini tesztek.`
  },
  IS: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: orðaforði og framburður`,
    description: ({ targetName }) => `${BRAND_NAME} myndbönd fyrir íslenskumælandi sem læra ${targetName}: orðaspjöld, framburð, endurtekningarhlé og stutt smápróf.`
  },
  KM: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: វាក្យសព្ទ និងការបញ្ចេញសំឡេង`,
    description: ({ targetName }) => `វីដេអូ ${BRAND_NAME} សម្រាប់អ្នកនិយាយភាសាខ្មែរ ដែលកំពុងរៀន ${targetName}: កាតពាក្យ ការបញ្ចេញសំឡេង ពេលសម្រាកសម្រាប់និយាយតាម និងតេស្តខ្លីៗ។`
  },
  LO: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: ຄຳສັບ ແລະ ການອອກສຽງ`,
    description: ({ targetName }) => `ວິດີໂອ ${BRAND_NAME} ສຳລັບຜູ້ເວົ້າພາສາລາວທີ່ກຳລັງຮຽນ ${targetName}: ບັດຄຳສັບ, ການອອກສຽງ, ຊ່ວງພັກເພື່ອຝຶກຊ້ຳ ແລະ ບົດທົດສອບສັ້ນ.`
  },
  LT: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: žodynas ir tarimas`,
    description: ({ targetName }) => `${BRAND_NAME} vaizdo įrašai lietuviškai kalbantiems, kurie mokosi ${targetName}: kortelės, tarimas, pauzės kartojimui ir trumpi mini testai.`
  },
  LV: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: vārdu krājums un izruna`,
    description: ({ targetName }) => `${BRAND_NAME} video latviski runājošiem, kuri mācās ${targetName}: kartītes, izruna, pauzes atkārtošanai un īsi mini testi.`
  },
  MS: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: kosa kata dan sebutan`,
    description: ({ targetName }) => `Video ${BRAND_NAME} untuk penutur bahasa Melayu yang belajar ${targetName}: kad imbas, sebutan, jeda ulang sebut dan ujian mini ringkas.`
  },
  MY: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: ဝေါဟာရနှင့် အသံထွက်`,
    description: ({ targetName }) => `${BRAND_NAME} ဗီဒီယိုများသည် မြန်မာဘာသာပြောသူများ ${targetName} ကို လေ့လာရန်အတွက် ကတ်များ၊ အသံထွက်၊ ထပ်ဆိုရန် ခဏနားချိန်များနှင့် စမ်းသပ်မေးခွန်းတိုများ ပါဝင်သည်။`
  },
  NL: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: woordenschat en uitspraak`,
    description: ({ targetName }) => `${BRAND_NAME}-video's voor Nederlandstaligen die ${targetName} leren: flashcards, uitspraak, pauzes om te herhalen en korte mini-tests.`
  },
  NO: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: ordforråd og uttale`,
    description: ({ targetName }) => `${BRAND_NAME}-videoer for norsktalende som lærer ${targetName}: flashcards, uttale, pauser for repetisjon og korte minitester.`
  },
  PL: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: słownictwo i wymowa`,
    description: ({ targetName }) => `Filmy ${BRAND_NAME} dla polskojęzycznych osób uczących się ${targetName}: fiszki, wymowa, pauzy na powtarzanie i krótkie mini testy.`
  },
  RO: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: vocabular și pronunție`,
    description: ({ targetName }) => `Videoclipuri ${BRAND_NAME} pentru vorbitorii de română care învață ${targetName}: carduri, pronunție, pauze pentru repetare și mini teste scurte.`
  },
  SK: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: slovná zásoba a výslovnosť`,
    description: ({ targetName }) => `Videá ${BRAND_NAME} pre slovensky hovoriacich študentov, ktorí sa učia ${targetName}: kartičky, výslovnosť, pauzy na opakovanie a krátke mini testy.`
  },
  SL: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: besedišče in izgovorjava`,
    description: ({ targetName }) => `Videi ${BRAND_NAME} za slovensko govoreče, ki se učijo ${targetName}: kartice, izgovorjava, premori za ponavljanje in kratki mini testi.`
  },
  SR: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: vokabular i izgovor`,
    description: ({ targetName }) => `${BRAND_NAME} video snimci za govornike srpskog koji uče ${targetName}: kartice, izgovor, pauze za ponavljanje i kratki mini testovi.`
  },
  SV: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: ordförråd och uttal`,
    description: ({ targetName }) => `${BRAND_NAME}-videor för svensktalande som lär sig ${targetName}: flashcards, uttal, pauser för upprepning och korta minitest.`
  },
  TH: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: คำศัพท์และการออกเสียง`,
    description: ({ targetName }) => `วิดีโอ ${BRAND_NAME} สำหรับผู้พูดภาษาไทยที่กำลังเรียน ${targetName}: แฟลชการ์ด การออกเสียง ช่วงหยุดเพื่อพูดตาม และแบบทดสอบสั้น ๆ`
  },
  TL: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: bokabularyo at pagbigkas`,
    description: ({ targetName }) => `Mga video ng ${BRAND_NAME} para sa mga nagsasalita ng Filipino na nag-aaral ng ${targetName}: flashcards, pagbigkas, mga pahinga para ulitin, at maiikling mini-test.`
  },
  UZ: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: lug'at va talaffuz`,
    description: ({ targetName }) => `${BRAND_NAME} videolari o'zbek tilida so'zlashuvchilar uchun ${targetName} o'rganishga yordam beradi: kartochkalar, talaffuz, takrorlash pauzalari va qisqa mini-testlar.`
  },
  VI: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}: từ vựng và phát âm`,
    description: ({ targetName }) => `Video ${BRAND_NAME} dành cho người nói tiếng Việt học ${targetName}: thẻ ghi nhớ, phát âm, khoảng dừng để lặp lại và bài kiểm tra ngắn.`
  },
  ZH: {
    title: ({ targetName, level }) => `${targetName} ${level || "A1"}：词汇和发音`,
    description: ({ targetName }) => `${BRAND_NAME} 视频帮助中文母语者学习 ${targetName}：单词卡、发音、跟读停顿和简短小测。`
  }
};

export function inferCourseFamily(metadata = {}) {
  const explicit = metadata.courseFamily || metadata.playlistCourseFamily;
  if (explicit) return normalizeSlugPart(explicit);

  const setId = String(metadata.setId || metadata.releaseId || "").toLowerCase();
  if (setId.includes("spanish_a1") || setId.includes("spanish-a1")) return "spanish-a1-core";
  if (setId.includes("oxford_3000") || setId.includes("oxford-3000")) return "oxford-3000-core";
  if (setId.includes("oxford_5000") || setId.includes("oxford-5000")) return "oxford-5000-advanced";
  if (setId.includes("hsk3") || setId.includes("hsk-3")) return "hsk3";
  if (setId.includes("hsk_classic") || setId.includes("hsk-classic")) return "hsk-classic";
  if (setId.includes("english_core_3000") || setId.includes("english-core-3000")) return "english-core-3000";
  return "ordinary-vocabulary";
}

export function inferLevelOrTrack(metadata = {}, courseFamily = inferCourseFamily(metadata)) {
  const explicit = metadata.levelOrTrack || metadata.playlistLevelOrTrack || metadata.playlistTrack;
  if (explicit) return normalizeSlugPart(explicit);

  const setId = String(metadata.setId || metadata.releaseId || "").toLowerCase();
  const level = stripLevel(metadata.level || "");

  if (courseFamily === "spanish-a1-core") return "a1";
  if (courseFamily === "oxford-3000-core") return level && level !== "a1" ? level : "a1-a2";
  if (courseFamily === "oxford-5000-advanced") return level || "b2-c1";
  if (courseFamily === "hsk3") {
    const match = setId.match(/level[-_]?(\d+)/);
    return match ? `level-${match[1]}` : "level-1";
  }
  if (courseFamily === "hsk-classic") {
    const match = setId.match(/hsk[-_]?(\d+)/);
    return match ? `hsk-${match[1]}` : "hsk";
  }
  if (courseFamily === "english-core-3000") return level || "core";
  return "a1-everyday";
}

export function buildPlaylistKey({ supportLang, targetLang, courseFamily, levelOrTrack, variantOrYear }) {
  const support = normalizeLanguageCode(supportLang);
  const target = normalizeLanguageCode(targetLang);
  const family = normalizeSlugPart(courseFamily);
  const track = normalizeSlugPart(levelOrTrack);
  const variant = normalizeSlugPart(variantOrYear);
  return [support, target, family, track, variant].filter(Boolean).join("__");
}

function buildTitle({ supportLang, targetLang, courseFamily, levelOrTrack }) {
  const support = normalizeLanguageCode(supportLang);
  const targetName = getPlaylistLanguageName(targetLang, support);
  const rawTrack = String(levelOrTrack || "");
  const level = rawTrack
    .replace(/^a1-/i, "A1: ")
    .replace(/^a2-/i, "A2: ")
    .replace(/^b1-/i, "B1: ")
    .replace(/^b2-/i, "B2: ")
    .replace(/^c1-/i, "C1: ")
    .replace(/^c2-/i, "C2: ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim();

  if (support === "RU") {
    if (courseFamily === "ordinary-vocabulary") return `${targetName} A1: бытовой словарь`;
    if (courseFamily === "spanish-a1-core") return `${targetName} A1: базовый курс`;
    if (courseFamily === "hsk3") return `${targetName}: HSK 3.0`;
    if (courseFamily.startsWith("oxford")) return `${targetName}: Oxford vocabulary`;
    return `${targetName}: ${BRAND_NAME}`;
  }
  if (support === "ES" || support === "ES-419") {
    return `${targetName} ${level || "A1"}: tarjetas ${BRAND_NAME}`;
  }
  if (support === "PT" || support === "PT-BR") {
    return `${targetName} ${level || "A1"}: flashcards ${BRAND_NAME}`;
  }
  if (support === "KK") {
    if (courseFamily === "ordinary-vocabulary") return `${targetName} тілі A1: сөздік және айтылым`;
    return `${targetName} тілі ${level || "A1"}: сөздік және айтылым`;
  }
  const template = NATIVE_PLAYLIST_TEMPLATES[support];
  if (template) {
    const nativeLevel = (level || "A1").replace(/:\s*Everyday$/u, "");
    return template.title({ targetName, level: nativeLevel, courseFamily, levelOrTrack });
  }
  if (courseFamily === "ordinary-vocabulary") {
    return `${targetName} ${level || "A1"} Flashcards`;
  }
  return `${targetName} ${level || "A1"}: ${BRAND_NAME} flashcards`;
}

function buildDescription({ supportLang, targetLang, courseFamily, levelOrTrack }) {
  const support = normalizeLanguageCode(supportLang);
  const targetName = getPlaylistLanguageName(targetLang, support);
  if (support === "RU") {
    return `Видео ${BRAND_NAME} для русскоязычных, которые изучают ${targetName}: карточки, произношение, паузы для повторения и короткие мини-тесты. Playlist key: ${courseFamily}/${levelOrTrack}.`;
  }
  if (support === "KK") {
    return `${BRAND_NAME} видеолары қазақ тілді көрермендерге ${targetName} тілін үйренуге көмектеседі: карточкалар, айтылым, қайталау паузалары және қысқа мини-тесттер.`;
  }
  const template = NATIVE_PLAYLIST_TEMPLATES[support];
  if (template) return template.description({ targetName, courseFamily, levelOrTrack });
  return `${BRAND_NAME} videos for native ${support} speakers learning ${targetName}: flashcards, pronunciation, repeat pauses and quick mini-tests. Playlist key: ${courseFamily}/${levelOrTrack}.`;
}

export function buildPlaylistAssignment(metadata = {}) {
  const supportLang = normalizeLanguageCode(metadata.supportLang);
  const targetLang = normalizeLanguageCode(metadata.targetLang);
  const courseFamily = inferCourseFamily(metadata);
  const levelOrTrack = inferLevelOrTrack(metadata, courseFamily);
  const variantOrYear = metadata.variantOrYear || metadata.playlistVariant || "";
  const key = buildPlaylistKey({ supportLang, targetLang, courseFamily, levelOrTrack, variantOrYear });
  const title = cleanText(metadata.playlistTitle || buildTitle({ supportLang, targetLang, courseFamily, levelOrTrack }));
  const description = cleanText(metadata.playlistDescription || buildDescription({ supportLang, targetLang, courseFamily, levelOrTrack }));
  const titleReviewStatus = ["EN", "RU", "ES", "ES-419", "PT", "PT-BR"].includes(supportLang)
    ? "template_reviewed_family"
    : "template_needs_native_review";

  return {
    key,
    supportLang,
    targetLang,
    courseFamily,
    levelOrTrack,
    variantOrYear: normalizeSlugPart(variantOrYear),
    title,
    description,
    titleReviewStatus,
  };
}

export function loadYoutubeChannels(filePath = DEFAULT_CHANNEL_CONFIG_PATH) {
  const registry = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(registry.channels)) throw new Error(`Invalid YouTube channel config: ${filePath}`);
  return registry;
}

export function saveYoutubeChannels(registry, filePath = DEFAULT_CHANNEL_CONFIG_PATH) {
  fs.writeFileSync(filePath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

export function findChannelForSupport(channels, supportLang) {
  const code = normalizeLanguageCode(supportLang);
  return channels.find((channel) => (channel.supportLangs || []).map(normalizeLanguageCode).includes(code));
}

export function loadPlaylistRegistry(filePath = DEFAULT_PLAYLIST_REGISTRY_PATH) {
  if (!fs.existsSync(filePath)) {
    return {
      schemaVersion: 1,
      sourceOfTruth: "docs/video-lessons-strategy.md#13-playlist-architecture",
      defaults: {
        defaultVideoPrivacyStatus: "public",
        defaultPlaylistPrivacyStatus: "public",
        ledgerPath: "outputs/youtube-publish-ledger.jsonl",
      },
      playlists: [],
    };
  }
  const registry = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(registry.playlists)) throw new Error(`Invalid YouTube playlist registry: ${filePath}`);
  return registry;
}

export function savePlaylistRegistry(registry, filePath = DEFAULT_PLAYLIST_REGISTRY_PATH) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

export function findPlaylistEntry(registry, key) {
  return registry.playlists.find((playlist) => playlist.playlist_key === key || playlist.key === key);
}

export function upsertPlannedPlaylist(registry, assignment, channel = {}) {
  const existing = findPlaylistEntry(registry, assignment.key);
  if (existing) return { entry: existing, created: false };

  const entry = {
    playlist_key: assignment.key,
    supportLang: assignment.supportLang,
    targetLang: assignment.targetLang,
    courseFamily: assignment.courseFamily,
    levelOrTrack: assignment.levelOrTrack,
    variantOrYear: assignment.variantOrYear,
    channelKey: channel.key || "",
    youtube_channel_id: channel.channelId || "",
    youtube_playlist_id: "",
    title: assignment.title,
    description: assignment.description,
    status: "planned",
    titleReviewStatus: assignment.titleReviewStatus,
    createdAt: new Date().toISOString(),
    lastReadbackAt: "",
  };
  registry.playlists.push(entry);
  registry.playlists.sort((a, b) => String(a.playlist_key).localeCompare(String(b.playlist_key)));
  return { entry, created: true };
}
