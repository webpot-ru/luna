#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const LANGUAGE_ORDER_PATH = path.join(ROOT, "config/language-order.json");
const VERSION = "spanish-a1-core-course-metadata-v5-polished-edition-labels";

const FILES = [
  {
    path: "config/spanish-a1-core-course-metadata.json",
    releaseId: "spanish_a1_core_part_001_300_v1",
    partLabel: "Part 001",
    edition: "latin_american_spanish",
    primarySpanishVariant: "ES-419",
    omittedMainSheetSourceVariants: ["ES"],
  },
  {
    path: "config/spanish-a1-core-course-metadata-spain.json",
    releaseId: "spanish_a1_core_part_001_300_v1",
    partLabel: "Part 001",
    edition: "spain_spanish",
    primarySpanishVariant: "ES",
    omittedMainSheetSourceVariants: ["ES-419"],
  },
  {
    path: "config/spanish-a1-core-part-002-course-metadata.json",
    releaseId: "spanish_a1_core_part_002_300_v1",
    partLabel: "Part 002",
    edition: "latin_american_spanish",
    primarySpanishVariant: "ES-419",
    omittedMainSheetSourceVariants: ["ES"],
  },
  {
    path: "config/spanish-a1-core-part-002-course-metadata-spain.json",
    releaseId: "spanish_a1_core_part_002_300_v1",
    partLabel: "Part 002",
    edition: "spain_spanish",
    primarySpanishVariant: "ES",
    omittedMainSheetSourceVariants: ["ES-419"],
  },
  {
    path: "config/spanish-a1-core-part-003-course-metadata.json",
    releaseId: "spanish_a1_core_part_003_300_v1",
    partLabel: "Part 003",
    edition: "latin_american_spanish",
    primarySpanishVariant: "ES-419",
    omittedMainSheetSourceVariants: ["ES"],
  },
  {
    path: "config/spanish-a1-core-part-003-course-metadata-spain.json",
    releaseId: "spanish_a1_core_part_003_300_v1",
    partLabel: "Part 003",
    edition: "spain_spanish",
    primarySpanishVariant: "ES",
    omittedMainSheetSourceVariants: ["ES-419"],
  },
];

const EDITIONS = {
  spain_spanish: {
    display: "Spanish (Spain)",
    variantLabel: "polished_spain_spanish_label",
    descriptionLabel: "Spanish (Spain)",
    categories: {
      EN: "Spanish (Spain)",
      ES: "Español de España",
      FR: "Espagnol d'Espagne",
      DE: "Spanisch (Spanien)",
      IT: "Spagnolo di Spagna",
      PT: "Espanhol de Espanha",
      RU: "Испанский (Испания)",
      ZH: "西班牙西班牙语",
      JA: "スペインのスペイン語",
      KO: "스페인 스페인어",
      VI: "Tiếng Tây Ban Nha (Tây Ban Nha)",
      TH: "ภาษาสเปน (สเปน)",
      MS: "Bahasa Sepanyol (Sepanyol)",
      ID: "Bahasa Spanyol (Spanyol)",
      PL: "Hiszpański (Hiszpania)",
      NL: "Spaans (Spanje)",
      SV: "Spanska (Spanien)",
      NO: "Spansk (Spania)",
      DA: "Spansk (Spanien)",
      FI: "Espanjan espanja",
      CS: "Španělština (Španělsko)",
      SK: "Španielčina (Španielsko)",
      HU: "Spanyol (Spanyolország)",
      RO: "Spaniolă (Spania)",
      BG: "Испански (Испания)",
      HR: "Španjolski (Španjolska)",
      SR: "Шпански (Шпанија)",
      SL: "Španščina (Španija)",
      LT: "Ispanų (Ispanija)",
      LV: "Spāņu (Spānija)",
      ET: "Hispaania hispaania keel",
      IS: "Spænska (Spánn)",
      HI: "स्पेनिश (स्पेन)",
      BN: "স্প্যানিশ (স্পেন)",
      TL: "Espanyol (Espanya)",
      MY: "စပိန်စကား (စပိန်)",
      KM: "ភាសាអេស្ប៉ាញ (អេស្ប៉ាញ)",
      LO: "ພາສາສະເປນ (ສະເປນ)",
      NE: "स्पेनी (स्पेन)",
      SI: "ස්පාඤ්ඤ (ස්පාඤ්ඤය)",
      TA: "ஸ்பானிஷ் (ஸ்பெயின்)",
      TE: "స్పానిష్ (స్పెయిన్)",
      KN: "ಸ್ಪ್ಯಾನಿಷ್ (ಸ್ಪೇನ್)",
      ML: "സ്പാനിഷ് (സ്പെയിൻ)",
      UZ: "Ispan tili (Ispaniya)",
      KK: "Испан тілі (Испания)",
      AZ: "İspan dili (İspaniya)",
      KA: "ესპანური (ესპანეთი)",
      HY: "Իսպաներեն (Իսպանիա)",
      TR: "İspanyolca (İspanya)",
      SW: "Kihispania (Hispania)",
      "PT-BR": "Espanhol da Espanha",
      "ES-419": "Español de España",
      "EN-GB": "Spanish (Spain)",
    },
  },
  latin_american_spanish: {
    display: "Latin American Spanish",
    variantLabel: "polished_latin_american_spanish_label",
    descriptionLabel: "Latin American Spanish",
    categories: {
      EN: "Latin American Spanish",
      ES: "Español de América Latina",
      FR: "Espagnol d'Amérique latine",
      DE: "Lateinamerikanisches Spanisch",
      IT: "Spagnolo latinoamericano",
      PT: "Espanhol latino-americano",
      RU: "Испанский (Латинская Америка)",
      ZH: "拉丁美洲西班牙语",
      JA: "ラテンアメリカのスペイン語",
      KO: "라틴 아메리카 스페인어",
      VI: "Tiếng Tây Ban Nha Mỹ Latinh",
      TH: "ภาษาสเปนละตินอเมริกา",
      MS: "Bahasa Sepanyol Amerika Latin",
      ID: "Bahasa Spanyol Amerika Latin",
      PL: "Hiszpański (Ameryka Łacińska)",
      NL: "Latijns-Amerikaans Spaans",
      SV: "Latinamerikansk spanska",
      NO: "Latinamerikansk spansk",
      DA: "Latinamerikansk spansk",
      FI: "Latinalaisen Amerikan espanja",
      CS: "Latinskoamerická španělština",
      SK: "Latinskoamerická španielčina",
      HU: "Latin-amerikai spanyol",
      RO: "Spaniolă latino-americană",
      BG: "Латиноамерикански испански",
      HR: "Latinoamerički španjolski",
      SR: "Латиноамерички шпански",
      SL: "Latinskoameriška španščina",
      LT: "Lotynų Amerikos ispanų",
      LV: "Latīņamerikas spāņu",
      ET: "Ladina-Ameerika hispaania keel",
      IS: "Rómönsk-amerísk spænska",
      HI: "लैटिन अमेरिकी स्पेनिश",
      BN: "লাতিন আমেরিকান স্প্যানিশ",
      TL: "Espanyol ng Latin America",
      MY: "လက်တင်အမေရိက စပိန်စကား",
      KM: "ភាសាអេស្ប៉ាញអាមេរិកឡាទីន",
      LO: "ພາສາສະເປນລາຕິນອາເມລິກາ",
      NE: "ल्याटिन अमेरिकी स्पेनी",
      SI: "ලතින් ඇමරිකානු ස්පාඤ්ඤ",
      TA: "லத்தீன் அமெரிக்க ஸ்பானிஷ்",
      TE: "లాటిన్ అమెరికన్ స్పానిష్",
      KN: "ಲ್ಯಾಟಿನ್ ಅಮೆರಿಕನ್ ಸ್ಪ್ಯಾನಿಷ್",
      ML: "ലാറ്റിൻ അമേരിക്കൻ സ്പാനിഷ്",
      UZ: "Lotin Amerikasi ispan tili",
      KK: "Латын Америкасы испан тілі",
      AZ: "Latın Amerikası ispan dili",
      KA: "ლათინური ამერიკის ესპანური",
      HY: "Լատինաամերիկյան իսպաներեն",
      TR: "Latin Amerika İspanyolcası",
      SW: "Kihispania cha Amerika ya Kilatini",
      "PT-BR": "Espanhol latino-americano",
      "ES-419": "Español de América Latina",
      "EN-GB": "Latin American Spanish",
    },
  },
};

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function polishRows({ previousRows, languageCodes, edition }) {
  const editionConfig = EDITIONS[edition];
  const rows = {};
  for (const code of languageCodes) {
    const previous = previousRows[code];
    if (!previous) throw new Error(`Missing existing Course Metadata row for ${code}`);
    const category = editionConfig.categories[code];
    if (!category) throw new Error(`Missing polished ${edition} category for ${code}`);
    const levelSignal = normalizeText(previous.level_signal);
    rows[code] = {
      title: `${category} A1`,
      description: `${category} A1. ${levelSignal}`,
      module: normalizeText(previous.module),
      category,
      level_signal: levelSignal,
      edition_marker: category,
    };
  }
  return rows;
}

const languageOrder = await readJson(LANGUAGE_ORDER_PATH);
const languageCodes = languageOrder.map((language) => language.spreadsheetCode);

for (const file of FILES) {
  const filePath = path.join(ROOT, file.path);
  const current = await readJson(filePath);
  const editionConfig = EDITIONS[file.edition];
  const next = {
    ...current,
    version: VERSION,
    release_id: file.releaseId,
    description: `Polished localized Course Metadata for the Spanish A1 Core ${file.partLabel} ${editionConfig.descriptionLabel} buyer-facing workbook. Keys use spreadsheetCode values from config/language-order.json.`,
    workbook_edition: file.edition,
    primary_spanish_variant: file.primarySpanishVariant,
    omitted_main_sheet_source_variants: file.omittedMainSheetSourceVariants,
    variant_label: editionConfig.variantLabel,
    variant_policy:
      "Course Metadata must use reader-facing full edition labels, not cramped abbreviations, while preserving the ordinary 5-row polyglot sheet shape.",
    rows: polishRows({ previousRows: current.rows ?? {}, languageCodes, edition: file.edition }),
  };
  await writeJson(filePath, next);
  console.log(`${file.path}: ${Object.keys(next.rows).length} rows, version=${VERSION}`);
}
