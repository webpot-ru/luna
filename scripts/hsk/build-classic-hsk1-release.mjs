import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";
import { addInternalDataSheet, buildHskBuyerFacingMainSheet } from "./hsk-buyer-facing-workbook.mjs";

const ROOT = process.cwd();
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);
const HSK_VERSION = "HSK 2.0 classic";
const HSK_LEVEL = Number(args.get("level") ?? 1);
if (!Number.isInteger(HSK_LEVEL) || HSK_LEVEL < 1) {
  throw new Error(`Invalid --level value: ${args.get("level")}`);
}
const EXPECTED_ROWS = Number(args.get("expected-rows") ?? 150);
const RELEASE_ID = args.get("release-id") ?? `hsk2_classic_level_${HSK_LEVEL}_${EXPECTED_ROWS}_v1`;
const MAIN_SHEET = `HSK${HSK_LEVEL} Classic`;
const SOURCE_URL =
  HSK_LEVEL === 2
    ? "https://hewgill.com/hsk/hsk2.html + complete-hsk-vocabulary old/2 reconciliation"
    : `https://github.com/drkameleon/complete-hsk-vocabulary/blob/main/wordlists/exclusive/old/${HSK_LEVEL}.json`;
const SOURCE_RAW_URL =
  HSK_LEVEL === 2
    ? "outputs/hsk/source/hsk2_classic_level_2_150_v1.source.json"
    : `https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/wordlists/exclusive/old/${HSK_LEVEL}.json`;
const LICENSE_URL = "https://github.com/drkameleon/complete-hsk-vocabulary/blob/main/LICENSE";
const translationPackPattern = new RegExp(`^hsk-classic-hsk${HSK_LEVEL}-translations-.+\\.tsv$`, "i");

const sourcePath = path.resolve(
  args.get("source") ?? `outputs/hsk/source/${RELEASE_ID}.source.json`
);
const overridesPath = path.resolve(
  args.get("overrides") ?? `config/hsk-classic-hsk${HSK_LEVEL}-card-overrides.json`
);
const examplesPath = path.resolve(args.get("examples") ?? `config/hsk-classic-hsk${HSK_LEVEL}-examples.json`);
const translationsDir = path.resolve(args.get("translations-dir") ?? "config");
const licensePath = path.resolve(args.get("license") ?? "/private/tmp/complete_hsk_license.txt");
const outputDir = path.resolve(args.get("out-dir") ?? "outputs/hsk");
const sourceOutDir = path.join(outputDir, "source");
const xlsxPath = path.join(outputDir, `${RELEASE_ID}.xlsx`);
const csvPath = path.join(outputDir, `${RELEASE_ID}.csv`);
const jsonlPath = path.join(outputDir, `${RELEASE_ID}.jsonl`);
const sourceSnapshotPath = path.join(sourceOutDir, `${RELEASE_ID}.source.json`);
const licenseSnapshotPath = path.join(sourceOutDir, "complete-hsk-vocabulary.MIT-LICENSE.txt");

function colName(index) {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function rangeFor(row, col, rows, cols) {
  const start = `${colName(col)}${row}`;
  const end = `${colName(col + cols - 1)}${row + rows - 1}`;
  return `${start}:${end}`;
}

function setValues(sheet, startRow, startCol, values) {
  if (!values.length) return;
  const width = Math.max(...values.map((row) => row.length));
  const padded = values.map((row) => [...row, ...Array(width - row.length).fill("")]);
  sheet.getRange(rangeFor(startRow, startCol, padded.length, width)).values = padded;
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function toCsv(headers, rows) {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

function parseTsvLine(line) {
  return line.split("\t").map((value) => value.trim());
}

async function loadTranslationPacks({ dir, languages }) {
  const languageCodes = new Set(languages.map((language) => language.spreadsheetCode));
  const translations = {};
  const sourceFilesByColumn = {};
  let files = [];
  try {
    files = (await fs.readdir(dir))
      .filter((file) => translationPackPattern.test(file))
      .sort();
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  for (const file of files) {
    const filePath = path.join(dir, file);
    const lines = (await fs.readFile(filePath, "utf8"))
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"));
    if (!lines.length) continue;

    const headers = parseTsvLine(lines[0]);
    if (headers[0] !== "simplified") {
      throw new Error(`${file} must start with a simplified header`);
    }

    for (const header of headers.slice(1)) {
      const languageCode = header.startsWith("example_") ? header.slice("example_".length) : header;
      if (!languageCodes.has(languageCode)) {
        throw new Error(`${file} has unknown language column: ${header}`);
      }
      sourceFilesByColumn[header] ??= new Set();
      sourceFilesByColumn[header].add(file);
    }

    for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
      const values = parseTsvLine(lines[lineIndex]);
      const word = values[0];
      if (!word) throw new Error(`${file}:${lineIndex + 1} missing simplified word`);
      translations[word] ??= {};
      for (let columnIndex = 1; columnIndex < headers.length; columnIndex += 1) {
        const header = headers[columnIndex];
        const value = values[columnIndex] ?? "";
        if (!value) throw new Error(`${file}:${lineIndex + 1} missing value for ${header}`);
        translations[word][header] = value;
      }
    }
  }

  return {
    translations,
    files,
    sourceFilesByColumn: Object.fromEntries(
      Object.entries(sourceFilesByColumn).map(([column, sourceFiles]) => [
        column,
        Array.from(sourceFiles).sort(),
      ])
    ),
  };
}

function hskTargetLanguages(languages) {
  return languages.filter((language) => language.spreadsheetCode !== "ZH");
}

function firstForm(entry) {
  const form = entry.forms?.[0];
  if (!form) throw new Error(`Missing form for ${entry.simplified}`);
  return form;
}

function hskEntryKey(entry, index = 0) {
  return entry.hsk_canonical_source?.hsk_key ?? entry.hsk_key ?? entry.simplified ?? `${index + 1}`;
}

function buildEntryLookup(entries) {
  const simplifiedCounts = new Map();
  for (const entry of entries) {
    simplifiedCounts.set(entry.simplified, (simplifiedCounts.get(entry.simplified) ?? 0) + 1);
  }
  return { simplifiedCounts };
}

function lookupCuratedByEntry(curated, entry, index, simplifiedCounts) {
  const key = hskEntryKey(entry, index);
  if (curated[key]) return curated[key];
  if ((simplifiedCounts.get(entry.simplified) ?? 0) > 1) return null;
  return curated[entry.simplified] ?? null;
}

function compactMeaning(form) {
  return (form.meanings ?? []).join(" | ");
}

function normalizeSpacing(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeComparableText(value) {
  return normalizeSpacing(value).toLocaleLowerCase("en-US");
}

function selectSourceForm(entry, override) {
  const forms = entry.forms ?? [];
  const desiredPinyinExact = normalizeSpacing(override?.pinyin);
  const desiredPinyin = normalizeComparableText(override?.pinyin);
  const desiredTraditional = String(override?.traditional ?? "").normalize("NFC");

  if (desiredPinyinExact && desiredTraditional) {
    const exactCase = forms.find(
      (form) =>
        normalizeSpacing(form.transcriptions?.pinyin) === desiredPinyinExact &&
        String(form.traditional ?? "").normalize("NFC") === desiredTraditional
    );
    if (exactCase) return exactCase;
  }

  if (desiredPinyinExact) {
    const byExactPinyin = forms.find(
      (form) => normalizeSpacing(form.transcriptions?.pinyin) === desiredPinyinExact
    );
    if (byExactPinyin) return byExactPinyin;
  }

  if (desiredPinyin && desiredTraditional) {
    const exact = forms.find(
      (form) =>
        normalizeComparableText(form.transcriptions?.pinyin) === desiredPinyin &&
        String(form.traditional ?? "").normalize("NFC") === desiredTraditional
    );
    if (exact) return exact;
  }

  if (desiredPinyin) {
    const byPinyin = forms.find(
      (form) => normalizeComparableText(form.transcriptions?.pinyin) === desiredPinyin
    );
    if (byPinyin) return byPinyin;
  }

  if (desiredTraditional) {
    const byTraditional = forms.find(
      (form) => String(form.traditional ?? "").normalize("NFC") === desiredTraditional
    );
    if (byTraditional) return byTraditional;
  }

  return firstForm(entry);
}

function validateOverrides(entries, overrides) {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    throw new Error("HSK card overrides must be a JSON object keyed by simplified word");
  }

  const { simplifiedCounts } = buildEntryLookup(entries);
  const sourceWords = new Set(entries.map((entry) => entry.simplified));
  const sourceKeys = new Set(entries.map((entry, index) => hskEntryKey(entry, index)));
  const overrideWords = new Set(Object.keys(overrides));

  for (const [index, entry] of entries.entries()) {
    const key = hskEntryKey(entry, index);
    const override = lookupCuratedByEntry(overrides, entry, index, simplifiedCounts);
    if (!override) throw new Error(`Missing curated HSK card override for ${key}`);
    if (!override.traditional) throw new Error(`Missing curated traditional for ${key}`);
    if (!override.pinyin) throw new Error(`Missing curated pinyin for ${key}`);
    if (!override.en) throw new Error(`Missing curated EN meaning for ${key}`);
  }

  for (const word of overrideWords) {
    if (!sourceWords.has(word) && !sourceKeys.has(word)) {
      throw new Error(`Curated override has unknown HSK word/key: ${word}`);
    }
  }
}

function validateExamples(entries, examples) {
  if (!examples || typeof examples !== "object" || Array.isArray(examples)) {
    throw new Error("HSK examples must be a JSON object keyed by simplified word");
  }

  const { simplifiedCounts } = buildEntryLookup(entries);
  const sourceWords = new Set(entries.map((entry) => entry.simplified));
  const sourceKeys = new Set(entries.map((entry, index) => hskEntryKey(entry, index)));
  const exampleWords = new Set(Object.keys(examples));

  for (const [index, entry] of entries.entries()) {
    const key = hskEntryKey(entry, index);
    const example = lookupCuratedByEntry(examples, entry, index, simplifiedCounts);
    if (!example) throw new Error(`Missing HSK example for ${key}`);
    if (!example.example_zh) throw new Error(`Missing example_zh for ${key}`);
    if (!example.example_pinyin) throw new Error(`Missing example_pinyin for ${key}`);
    if (!example.example_en) throw new Error(`Missing example_en for ${key}`);
    const requiredParts = entry.simplified.split("…").filter(Boolean);
    if (!requiredParts.every((part) => example.example_zh.includes(part))) {
      throw new Error(`Example for ${key} does not include the source word: ${example.example_zh}`);
    }
  }

  for (const word of exampleWords) {
    if (!sourceWords.has(word) && !sourceKeys.has(word)) {
      throw new Error(`Example file has unknown HSK word/key: ${word}`);
    }
  }
}

function validateTranslationPacks(entries, translationPack) {
  const sourceWords = new Set(entries.map((entry) => entry.simplified));
  const sourceKeys = new Set(entries.map((entry, index) => hskEntryKey(entry, index)));
  for (const word of Object.keys(translationPack.translations)) {
    if (!sourceWords.has(word) && !sourceKeys.has(word)) {
      throw new Error(`Translation pack has unknown HSK word/key: ${word}`);
    }
  }
}

function validateSource(entries) {
  if (!Array.isArray(entries)) throw new Error("HSK source must be a JSON array");
  if (entries.length !== EXPECTED_ROWS) {
    throw new Error(`Expected ${EXPECTED_ROWS} HSK rows, got ${entries.length}`);
  }

  const seen = new Set();
  for (const [index, entry] of entries.entries()) {
    const form = firstForm(entry);
    const key = hskEntryKey(entry, index);
    if (!entry.simplified) throw new Error(`Row ${index + 1} missing simplified`);
    if (seen.has(key)) throw new Error(`Duplicate HSK source key: ${key}`);
    seen.add(key);
    if (!form.transcriptions?.pinyin) throw new Error(`Row ${index + 1} missing pinyin for ${entry.simplified}`);
  }
}

function buildRows(entries, languages, overrides, examples, translationPack) {
  const { simplifiedCounts } = buildEntryLookup(entries);
  return entries.map((entry, index) => {
    const key = hskEntryKey(entry, index);
    const override = lookupCuratedByEntry(overrides, entry, index, simplifiedCounts);
    const example = lookupCuratedByEntry(examples, entry, index, simplifiedCounts);
    const rowTranslations =
      translationPack.translations[key] ?? translationPack.translations[entry.simplified] ?? {};
    const form = selectSourceForm(entry, override);
    const row = {
      release_id: RELEASE_ID,
      hsk_version: HSK_VERSION,
      hsk_level: HSK_LEVEL,
      hsk_order: index + 1,
      simplified: entry.simplified,
      traditional: override.traditional,
      pinyin: override.pinyin,
      example_zh: example.example_zh,
      example_pinyin: example.example_pinyin,
      source_en_meaning: compactMeaning(form),
      source_pos: (entry.pos ?? []).join(";"),
      source_classifiers: (form.classifiers ?? []).join(";"),
      source_frequency: entry.frequency ?? "",
      translation_status: "seed_pending",
      example_status: "example_pending",
      qa_notes: "",
    };

    for (const language of languages) {
      if (language.spreadsheetCode === "EN") {
        row[language.spreadsheetCode] = override.en;
        row.example_EN = example.example_en;
      } else if (language.spreadsheetCode === "EN-GB") {
        row["EN-GB"] = rowTranslations["EN-GB"] ?? override.en;
        row["example_EN-GB"] = rowTranslations["example_EN-GB"] ?? example.example_en;
      } else {
        row[language.spreadsheetCode] = rowTranslations[language.spreadsheetCode] ?? "";
        row[`example_${language.spreadsheetCode}`] =
          rowTranslations[`example_${language.spreadsheetCode}`] ?? "";
      }
    }

    const wordTranslationCount = languages.filter((language) =>
      Boolean(row[language.spreadsheetCode])
    ).length;
    const exampleTranslationCount = languages.filter((language) =>
      Boolean(row[`example_${language.spreadsheetCode}`])
    ).length;
    row.translation_status =
      wordTranslationCount === languages.length
        ? `complete_${wordTranslationCount}_languages_filled`
        : `partial_${wordTranslationCount}_languages_filled`;
    row.example_status =
      exampleTranslationCount === languages.length
        ? `complete_${exampleTranslationCount}_languages_filled`
        : `partial_${exampleTranslationCount}_languages_filled`;

    return row;
  });
}

function translationSourcePlan(languages) {
  const groups = {
    "strong/import_or_structured": new Set(["EN", "RU", "ID"]),
    "good/reference_or_deck": new Set([
      "ES",
      "FR",
      "DE",
      "IT",
      "PT",
      "PT-BR",
      "JA",
      "KO",
      "VI",
      "TH",
      "TR",
    ]),
    "app_or_reference_only": new Set([
      "HI",
      "BN",
      "TL",
      "KM",
      "MS",
      "SW",
      "PL",
      "NL",
      "SV",
      "NO",
      "DA",
      "FI",
      "CS",
      "SK",
      "HU",
      "RO",
      "HR",
    ]),
  };

  return languages.map((language) => {
    let status = "needs_translation_and_qa";
    for (const [group, codes] of Object.entries(groups)) {
      if (codes.has(language.spreadsheetCode)) status = group;
    }
    return {
      order: languages.indexOf(language) + 1,
      spreadsheet_code: language.spreadsheetCode,
      db_code: language.dbCode,
      language: language.language,
      source_status: status,
      notes:
        status === "needs_translation_and_qa"
            ? "No reliable HSK target-language source found in the current research pass."
            : "Use only after license/source review; closed apps/decks are reference, not blind import.",
    };
  });
}

function addMainSheet(workbook, headers, rows) {
  const sheet = workbook.worksheets.add(MAIN_SHEET);
  setValues(sheet, 1, 0, [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))]);
}

const courseMetadataDescriptions = {
  EN: "HSK {level} vocabulary from HSK 2.0 (2010-2021).",
  ES: "Vocabulario chino HSK {level} de HSK 2.0 (2010-2021).",
  FR: "Vocabulaire chinois HSK {level} de HSK 2.0 (2010-2021).",
  DE: "Chinesischer Wortschatz für HSK {level} aus HSK 2.0 (2010-2021).",
  IT: "Vocabolario cinese HSK {level} da HSK 2.0 (2010-2021).",
  PT: "Vocabulário chinês HSK {level} do HSK 2.0 (2010-2021).",
  RU: "Лексика HSK {level} по версии HSK 2.0 (2010-2021).",
  JA: "HSK 2.0（2010-2021）のHSK {level}中国語語彙。",
  KO: "HSK 2.0(2010-2021) 기준 HSK {level} 중국어 어휘.",
  VI: "Từ vựng tiếng Trung HSK {level} theo HSK 2.0 (2010-2021).",
  TH: "คำศัพท์จีน HSK {level} ตาม HSK 2.0 (2010-2021).",
  MS: "Perbendaharaan kata Cina HSK {level} mengikut HSK 2.0 (2010-2021).",
  ID: "Kosakata Mandarin HSK {level} berdasarkan HSK 2.0 (2010-2021).",
  PL: "Chińskie słownictwo HSK {level} według HSK 2.0 (2010-2021).",
  NL: "Chinese woordenschat voor HSK {level} volgens HSK 2.0 (2010-2021).",
  SV: "Kinesiskt HSK {level}-ordförråd enligt HSK 2.0 (2010-2021).",
  NO: "Kinesisk HSK {level}-ordliste etter HSK 2.0 (2010-2021).",
  DA: "Kinesisk HSK {level}-ordforråd efter HSK 2.0 (2010-2021).",
  FI: "HSK {level}:n kiinan sanasto HSK 2.0:n mukaan (2010-2021).",
  CS: "Čínská slovní zásoba HSK {level} podle HSK 2.0 (2010-2021).",
  SK: "Čínska slovná zásoba HSK {level} podľa HSK 2.0 (2010-2021).",
  HU: "HSK {level} kínai szókincs a HSK 2.0 szerint (2010-2021).",
  RO: "Vocabular chinezesc HSK {level} conform HSK 2.0 (2010-2021).",
  BG: "Китайска лексика HSK {level} по HSK 2.0 (2010-2021).",
  HR: "Kineski vokabular HSK {level} prema HSK 2.0 (2010-2021).",
  SR: "Кинески речник HSK {level} према HSK 2.0 (2010-2021).",
  SL: "Kitajsko besedišče HSK {level} po HSK 2.0 (2010-2021).",
  LT: "HSK {level} kinų žodynas pagal HSK 2.0 (2010-2021).",
  LV: "HSK {level} ķīniešu vārdu krājums pēc HSK 2.0 (2010-2021).",
  ET: "HSK {level} hiina sõnavara HSK 2.0 järgi (2010-2021).",
  IS: "Kínverskur HSK {level} orðaforði samkvæmt HSK 2.0 (2010-2021).",
  HI: "HSK 2.0 (2010-2021) के अनुसार HSK {level} चीनी शब्दावली।",
  BN: "HSK 2.0 (2010-2021) অনুযায়ী HSK {level} চীনা শব্দভান্ডার।",
  TL: "Bokabularyong Tsino para sa HSK {level} ayon sa HSK 2.0 (2010-2021).",
  MY: "HSK 2.0 (2010-2021) အရ HSK {level} တရုတ်ဝေါဟာရ။",
  KM: "វាក្យសព្ទចិន HSK {level} តាម HSK 2.0 (2010-2021)។",
  LO: "ຄຳສັບຈີນ HSK {level} ຕາມ HSK 2.0 (2010-2021).",
  NE: "HSK 2.0 (2010-2021) अनुसार HSK {level} चिनियाँ शब्दावली।",
  SI: "HSK 2.0 (2010-2021) අනුව HSK {level} චීන වචනමාලාව.",
  TA: "HSK 2.0 (2010-2021) படி HSK {level} சீன சொற்கள்.",
  TE: "HSK 2.0 (2010-2021) ప్రకారం HSK {level} చైనీస్ పదజాలం.",
  KN: "HSK 2.0 (2010-2021) ಪ್ರಕಾರ HSK {level} ಚೈನೀಸ್ ಪದಸಂಪತ್ತು.",
  ML: "HSK 2.0 (2010-2021) പ്രകാരമുള്ള HSK {level} ചൈനീസ് പദസഞ്ചയം.",
  UZ: "HSK 2.0 (2010-2021) bo‘yicha HSK {level} xitoycha lug‘at.",
  KK: "HSK 2.0 (2010-2021) бойынша HSK {level} қытай сөздігі.",
  AZ: "HSK 2.0 (2010-2021) üzrə HSK {level} Çin lüğəti.",
  KA: "HSK 2.0-ის (2010-2021) მიხედვით HSK {level} ჩინური ლექსიკა.",
  HY: "HSK 2.0-ի (2010-2021) HSK {level} չինարեն բառապաշար։",
  TR: "HSK 2.0'a (2010-2021) göre HSK {level} Çince kelime bilgisi.",
  SW: "Msamiati wa Kichina wa HSK {level} kulingana na HSK 2.0 (2010-2021).",
  "PT-BR": "Vocabulário chinês HSK {level} do HSK 2.0 (2010-2021).",
  "ES-419": "Vocabulario chino HSK {level} de HSK 2.0 (2010-2021).",
  "EN-GB": "HSK {level} vocabulary from HSK 2.0 (2010-2021).",
};

function courseMetadataCategory() {
  return `HSK ${HSK_LEVEL}`;
}

const courseMetadataModules = {
  EN: "Chinese",
  ES: "Chino",
  FR: "Chinois",
  DE: "Chinesisch",
  IT: "Cinese",
  PT: "Chinês",
  RU: "Китайский",
  JA: "中国語",
  KO: "중국어",
  VI: "Tiếng Trung",
  TH: "ภาษาจีน",
  MS: "Bahasa Cina",
  ID: "Bahasa Mandarin",
  PL: "Chiński",
  NL: "Chinees",
  SV: "Kinesiska",
  NO: "Kinesisk",
  DA: "Kinesisk",
  FI: "Kiina",
  CS: "Čínština",
  SK: "Čínština",
  HU: "Kínai",
  RO: "Chineză",
  BG: "Китайски",
  HR: "Kineski",
  SR: "Кинески",
  SL: "Kitajščina",
  LT: "Kinų",
  LV: "Ķīniešu",
  ET: "Hiina keel",
  IS: "Kínverska",
  HI: "चीनी",
  BN: "চীনা",
  TL: "Tsino",
  MY: "တရုတ်",
  KM: "ភាសាចិន",
  LO: "ພາສາຈີນ",
  NE: "चिनियाँ",
  SI: "චීන",
  TA: "சீனம்",
  TE: "చైనీస్",
  KN: "ಚೈನೀಸ್",
  ML: "ചൈനീസ്",
  UZ: "Xitoy tili",
  KK: "Қытай тілі",
  AZ: "Çin dili",
  KA: "ჩინური",
  HY: "Չինարեն",
  TR: "Çince",
  SW: "Kichina",
  "PT-BR": "Chinês",
  "ES-419": "Chino",
  "EN-GB": "Chinese",
};

function addCourseMetadata(workbook, languages) {
  const codes = languages.map((language) => language.spreadsheetCode);
  const missing = codes.filter((code) => !courseMetadataDescriptions[code] || !courseMetadataModules[code]);
  if (missing.length) {
    throw new Error(`Missing HSK Course Metadata copy for: ${missing.join(", ")}`);
  }
  const title = `HSK ${HSK_LEVEL}.`;
  const category = courseMetadataCategory();
  const sheet = workbook.worksheets.add("Course Metadata");
  setValues(sheet, 1, 0, [
    ["", ...codes],
    ["Title", ...codes.map(() => title)],
    [
      "Description",
      ...codes.map((code) => courseMetadataDescriptions[code].replace("{level}", String(HSK_LEVEL))),
    ],
    ["Module", ...codes.map((code) => courseMetadataModules[code])],
    ["Category", ...codes.map(() => category)],
  ]);
}

function addReadme(workbook, languages) {
  const sheet = workbook.worksheets.add("README");
  setValues(sheet, 1, 0, [
    ["LunaCards HSK classic release workbook"],
    ["Release ID", RELEASE_ID],
    ["HSK version", HSK_VERSION],
    ["HSK level", HSK_LEVEL],
    ["Expected rows", EXPECTED_ROWS],
    ["Internal language columns", languages.length],
    ["Buyer-facing language columns", "54 including ZH"],
    ["Main sheet", MAIN_SHEET],
    ["Status", "working preparation; not final target-language delivery"],
    ["Audio", "not in scope"],
    ["Target-language transcription", "not in scope"],
    ["Chinese pinyin", "shown on the main sheet as ZH transcription and ZH example transcription"],
    ["Translation rule", "Language cells contain short learner-facing meanings only."],
    ["Course Metadata", "Title, description, module and category in HSK target-language order; excludes ZH."],
    ["Internal Data", "Technical HSK fields, statuses and source/QA columns are kept off the buyer-facing first sheet."],
    ["Curated HSK card overrides", path.relative(ROOT, overridesPath)],
    ["Curated HSK examples", path.relative(ROOT, examplesPath)],
    ["Example translations", "example_<LANG> columns; no target-language transcription columns"],
    ["Source audit", "Raw source dictionary fields are kept in the Source Audit sheet, not in the main card sheet."],
    ["Source URL", SOURCE_URL],
    ["Source raw URL", SOURCE_RAW_URL],
    ["Source license", "MIT; see Sources sheet and outputs/hsk/source/"],
    ["Documentation", "docs/hsk-classic-release-plan.md"],
    ["Contract", "config/hsk-classic-release-contract-v1.json"],
  ]);
}

function addLanguages(workbook, languages) {
  const sheet = workbook.worksheets.add("Languages");
  setValues(sheet, 1, 0, [["order", "spreadsheet_code", "db_code", "language"]]);
  setValues(
    sheet,
    2,
    0,
    languages.map((language, index) => [
      index + 1,
      language.spreadsheetCode,
      language.dbCode,
      language.language,
    ])
  );
}

function addTranslationSourcePlan(workbook, languages) {
  const rows = translationSourcePlan(languages);
  const headers = ["order", "spreadsheet_code", "db_code", "language", "source_status", "notes"];
  const sheet = workbook.worksheets.add("Translation Source Plan");
  setValues(sheet, 1, 0, [headers, ...rows.map((row) => headers.map((header) => row[header]))]);
}

function addTranslationQa(workbook, languages, rows, translationPack) {
  const headers = [
    "order",
    "spreadsheet_code",
    "language",
    "word_filled",
    "example_filled",
    "word_missing",
    "example_missing",
    "status",
    "source_files",
  ];
  const data = languages.map((language, index) => {
    const wordFilled = rows.filter((row) => Boolean(row[language.spreadsheetCode])).length;
    const exampleFilled = rows.filter((row) => Boolean(row[`example_${language.spreadsheetCode}`])).length;
    let status = "empty";
    let sourceFiles = "";
    if (language.spreadsheetCode === "EN") {
      status = "built_in_curated";
      sourceFiles = "card overrides + examples";
    } else if (language.spreadsheetCode === "EN-GB") {
      const regionalSourceFiles = [
        ...(translationPack.sourceFilesByColumn[language.spreadsheetCode] ?? []),
        ...(translationPack.sourceFilesByColumn[`example_${language.spreadsheetCode}`] ?? []),
      ].filter((file, fileIndex, allFiles) => allFiles.indexOf(file) === fileIndex);
      status = regionalSourceFiles.length ? "built_in_curated_plus_regional_overrides" : "built_in_curated";
      sourceFiles = ["card overrides + examples", ...regionalSourceFiles].join(", ");
    } else if (wordFilled === rows.length && exampleFilled === rows.length) {
      status = "filled_pending_language_qa";
      sourceFiles = [
        ...(translationPack.sourceFilesByColumn[language.spreadsheetCode] ?? []),
        ...(translationPack.sourceFilesByColumn[`example_${language.spreadsheetCode}`] ?? []),
      ]
        .filter((file, fileIndex, allFiles) => allFiles.indexOf(file) === fileIndex)
        .join(", ");
    } else if (wordFilled || exampleFilled) {
      status = "partial";
      sourceFiles = [
        ...(translationPack.sourceFilesByColumn[language.spreadsheetCode] ?? []),
        ...(translationPack.sourceFilesByColumn[`example_${language.spreadsheetCode}`] ?? []),
      ]
        .filter((file, fileIndex, allFiles) => allFiles.indexOf(file) === fileIndex)
        .join(", ");
    }
    return [
      index + 1,
      language.spreadsheetCode,
      language.language,
      wordFilled,
      exampleFilled,
      rows.length - wordFilled,
      rows.length - exampleFilled,
      status,
      sourceFiles,
    ];
  });
  const sheet = workbook.worksheets.add("Translation QA");
  setValues(sheet, 1, 0, [headers, ...data]);
}

function addSourceAudit(workbook, rows) {
  const headers = [
    "hsk_order",
    "simplified",
    "traditional",
    "pinyin",
    "source_en_meaning",
    "source_pos",
    "source_classifiers",
    "source_frequency",
  ];
  const sheet = workbook.worksheets.add("Source Audit");
  setValues(sheet, 1, 0, [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))]);
}

function addSources(workbook) {
  const sheet = workbook.worksheets.add("Sources");
  setValues(sheet, 1, 0, [
    ["source_id", "role", "url", "license", "notes"],
    [
      `hsk-classic-level-${HSK_LEVEL}-source`,
      `Chinese base list for HSK 2.0 classic level ${HSK_LEVEL}`,
      SOURCE_URL,
      "MIT",
      "Used for source list membership, POS, classifiers and source dictionary meanings; card-facing traditional/pinyin/EN meanings are curated separately.",
    ],
    [
      `lunacards-hsk${HSK_LEVEL}-card-overrides`,
      `Curated learner-facing HSK ${HSK_LEVEL} forms and EN meanings`,
      path.relative(ROOT, overridesPath),
      "internal LunaCards curation",
      "Used to avoid raw dictionary artifacts such as surnames, variants, archaic senses and wrong homograph forms in card-facing fields.",
    ],
    [
      `lunacards-hsk${HSK_LEVEL}-examples`,
      `Curated HSK ${HSK_LEVEL} Chinese examples, example pinyin and EN example translations`,
      path.relative(ROOT, examplesPath),
      "internal LunaCards curation",
      "Used for example_zh, example_pinyin and example_EN. EN-GB and other example language columns can be filled or regionally corrected in translation batches.",
    ],
    [
      "complete-hsk-vocabulary-license",
      "License text",
      LICENSE_URL,
      "MIT",
      "Snapshot written to outputs/hsk/source/ when available.",
    ],
  ]);
}

async function maybeCopy(from, to) {
  try {
    if (path.resolve(from) === path.resolve(to)) return;
    await fs.copyFile(from, to);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function main() {
  const [sourceText, overridesText, examplesText, languagesText] = await Promise.all([
    fs.readFile(sourcePath, "utf8"),
    fs.readFile(overridesPath, "utf8"),
    fs.readFile(examplesPath, "utf8"),
    fs.readFile(path.resolve("config/language-order.json"), "utf8"),
  ]);

  const entries = JSON.parse(sourceText);
  const overrides = JSON.parse(overridesText);
  const examples = JSON.parse(examplesText);
  const allLanguages = JSON.parse(languagesText);
  const languages = hskTargetLanguages(allLanguages);
  validateSource(entries);
  validateOverrides(entries, overrides);
  validateExamples(entries, examples);
  if (allLanguages.length !== 54) throw new Error(`Expected 54 configured languages, got ${allLanguages.length}`);
  if (languages.length !== 53) throw new Error(`Expected 53 HSK target languages after removing ZH, got ${languages.length}`);
  const translationPack = await loadTranslationPacks({ dir: translationsDir, languages });
  validateTranslationPacks(entries, translationPack);

  const fixedHeaders = [
    "release_id",
    "hsk_version",
    "hsk_level",
    "hsk_order",
    "simplified",
    "traditional",
    "pinyin",
    "example_zh",
    "example_pinyin",
  ];
  const languageHeaders = languages.map((language) => language.spreadsheetCode);
  const exampleLanguageHeaders = languages.map((language) => `example_${language.spreadsheetCode}`);
  const statusHeaders = ["translation_status", "example_status", "qa_notes"];
  const headers = [...fixedHeaders, ...languageHeaders, ...exampleLanguageHeaders, ...statusHeaders];
  const rows = buildRows(entries, languages, overrides, examples, translationPack);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(sourceOutDir, { recursive: true });
  await Promise.all([
    fs.writeFile(csvPath, `${toCsv(headers, rows)}\n`, "utf8"),
    fs.writeFile(jsonlPath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8"),
    maybeCopy(sourcePath, sourceSnapshotPath),
    maybeCopy(licensePath, licenseSnapshotPath),
  ]);

  const workbook = Workbook.create();
  const buyerFacing = buildHskBuyerFacingMainSheet({ rows, allLanguages });
  addMainSheet(workbook, buyerFacing.headers, buyerFacing.rows);
  addInternalDataSheet({ workbook, setValues, headers, rows });
  addCourseMetadata(workbook, languages);
  addReadme(workbook, languages);
  addLanguages(workbook, languages);
  addTranslationSourcePlan(workbook, languages);
  addTranslationQa(workbook, languages, rows, translationPack);
  addSourceAudit(workbook, rows);
  addSources(workbook);

  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(xlsxPath);

  console.log(
    JSON.stringify(
      {
        release_id: RELEASE_ID,
        rows: rows.length,
        language_columns: languageHeaders.length,
        translation_pack_files: translationPack.files,
        files: {
          xlsx: path.relative(ROOT, xlsxPath),
          csv: path.relative(ROOT, csvPath),
          jsonl: path.relative(ROOT, jsonlPath),
          source_snapshot: path.relative(ROOT, sourceSnapshotPath),
          license_snapshot: path.relative(ROOT, licenseSnapshotPath),
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
