import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile } from "@oai/artifact-tool";

const releaseId = process.argv[2] ?? "hsk2_classic_level_1_150_v1";
const levelMatch = releaseId.match(/level_(\d+)_/u);
const hskLevel = levelMatch ? Number(levelMatch[1]) : 1;
const rowCountMatch = releaseId.match(/level_\d+_(\d+)_/u);
const expectedRowCountFromId = rowCountMatch ? Number(rowCountMatch[1]) : null;
const outputDir = path.resolve("outputs/hsk");
const csvPath = path.join(outputDir, `${releaseId}.csv`);
const xlsxPath = path.join(outputDir, `${releaseId}.xlsx`);
const contractPath = path.resolve("config/hsk-classic-release-contract-v1.json");
const languagesPath = path.resolve("config/language-order.json");
const overridesPath = path.resolve(`config/hsk-classic-hsk${hskLevel}-card-overrides.json`);
const examplesPath = path.resolve(`config/hsk-classic-hsk${hskLevel}-examples.json`);
const sourcePath = path.join(outputDir, "source", `${releaseId}.source.json`);
const translationsDir = path.resolve("config");
const translationPackPattern = new RegExp(`^hsk-classic-hsk${hskLevel}-translations-.+\\.tsv$`, "i");
const mainSheet = `HSK${hskLevel} Classic`;

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (quoted && char === '"' && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function parseCsv(text) {
  const lines = text.trimEnd().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
  return { headers, rows };
}

function parseTsvLine(line) {
  return line.split("\t").map((value) => value.trim());
}

async function loadTranslationPacks() {
  const translations = {};
  const files = (await fs.readdir(translationsDir))
    .filter((file) => translationPackPattern.test(file))
    .sort();

  for (const file of files) {
    const lines = (await fs.readFile(path.join(translationsDir, file), "utf8"))
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"));
    if (!lines.length) continue;
    const headers = parseTsvLine(lines[0]);
    if (headers[0] !== "simplified") throw new Error(`${file} must start with simplified`);
    for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
      const values = parseTsvLine(lines[lineIndex]);
      const word = values[0];
      translations[word] ??= {};
      for (let columnIndex = 1; columnIndex < headers.length; columnIndex += 1) {
        translations[word][headers[columnIndex]] = values[columnIndex] ?? "";
      }
    }
  }

  return { translations, files };
}

function hskTargetLanguages(languages) {
  return languages.filter((language) => language.spreadsheetCode !== "ZH");
}

function rowKey(row) {
  return `${row.hsk_order}:${row.simplified}`;
}

function lookupCurated(curated, row) {
  return curated[rowKey(row)] ?? curated[row.simplified];
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function requireArrayEqual(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label}: expected ${e}, got ${a}`);
}

const expectedCourseMetadataModules = {
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

function validateCourseMetadata(inspect, languageHeaders) {
  const sentenceTerminator = /[.!?。？！؟։।။។]$/u;
  const parsed = JSON.parse(inspect.ndjson);
  const values = parsed.values ?? [];
  if (values.length !== 5) throw new Error(`Course Metadata must have 5 visible rows, got ${values.length}`);

  const header = values[0] ?? [];
  const title = values[1] ?? [];
  const description = values[2] ?? [];
  const module = values[3] ?? [];
  const category = values[4] ?? [];
  requireEqual(header[0] ?? "", "", "Course Metadata A1");
  requireEqual(title[0], "Title", "Course Metadata row 2 label");
  requireEqual(description[0], "Description", "Course Metadata row 3 label");
  requireEqual(module[0], "Module", "Course Metadata row 4 label");
  requireEqual(category[0], "Category", "Course Metadata row 5 label");
  requireArrayEqual(header.slice(1), languageHeaders, "Course Metadata language headers");

  for (const [index, code] of languageHeaders.entries()) {
    const titleValue = String(title[index + 1] ?? "").trim();
    const descriptionValue = String(description[index + 1] ?? "").trim();
    const moduleValue = String(module[index + 1] ?? "").trim();
    const categoryValue = String(category[index + 1] ?? "").trim();
    if (!titleValue) throw new Error(`Course Metadata title is empty for ${code}`);
    if (!descriptionValue) throw new Error(`Course Metadata description is empty for ${code}`);
    if (!moduleValue) throw new Error(`Course Metadata module is empty for ${code}`);
    if (!categoryValue) throw new Error(`Course Metadata category is empty for ${code}`);
    if (!sentenceTerminator.test(titleValue)) {
      throw new Error(`Course Metadata title must end with sentence punctuation for ${code}: ${titleValue}`);
    }
    if (!sentenceTerminator.test(descriptionValue)) {
      throw new Error(`Course Metadata description must end with sentence punctuation for ${code}: ${descriptionValue}`);
    }
    if (!titleValue.includes(`HSK ${hskLevel}`)) {
      throw new Error(`Course Metadata title must include HSK ${hskLevel} for ${code}: ${titleValue}`);
    }
    if (!descriptionValue.includes(String(hskLevel))) {
      throw new Error(`Course Metadata description must include level ${hskLevel} for ${code}: ${descriptionValue}`);
    }
    const expectedModule = expectedCourseMetadataModules[code];
    if (!expectedModule) {
      throw new Error(`Course Metadata expected module is missing for ${code}`);
    }
    if (moduleValue !== expectedModule) {
      throw new Error(`Course Metadata module must be ${expectedModule} for ${code}: ${moduleValue}`);
    }
    if (categoryValue !== `HSK ${hskLevel}`) {
      throw new Error(`Course Metadata category must be HSK ${hskLevel} for ${code}: ${categoryValue}`);
    }
  }
}

async function main() {
  const [csvText, contractText, languagesText, overridesText, examplesText, sourceText] = await Promise.all([
    fs.readFile(csvPath, "utf8"),
    fs.readFile(contractPath, "utf8"),
    fs.readFile(languagesPath, "utf8"),
    fs.readFile(overridesPath, "utf8"),
    fs.readFile(examplesPath, "utf8"),
    fs.readFile(sourcePath, "utf8"),
  ]);
  const contract = JSON.parse(contractText);
  const allLanguages = JSON.parse(languagesText);
  const languages = hskTargetLanguages(allLanguages);
  const overrides = JSON.parse(overridesText);
  const examples = JSON.parse(examplesText);
  const sourceEntries = JSON.parse(sourceText);
  const translationPack = await loadTranslationPacks();
  const { headers, rows } = parseCsv(csvText);

  const expectedRows = expectedRowCountFromId ?? contract.default_release.expected_row_count;
  const languageHeaders = languages.map((language) => language.spreadsheetCode);
  const exampleLanguageHeaders = languages.map((language) => `example_${language.spreadsheetCode}`);
  const expectedHeaders = [
    ...contract.main_sheet.required_fixed_columns,
    ...languageHeaders,
    ...exampleLanguageHeaders,
    ...contract.main_sheet.required_status_columns,
  ];

  requireEqual(rows.length, expectedRows, "row count");
  requireEqual(allLanguages.length, 54, "configured language count");
  requireEqual(languageHeaders.length, 53, "HSK target language column count");
  requireArrayEqual(headers, expectedHeaders, "header contract");

  const seenOrders = new Set();
  for (const row of rows) {
    if (!row.simplified) throw new Error(`missing simplified at order ${row.hsk_order}`);
    if (!row.pinyin) throw new Error(`missing pinyin for ${row.simplified}`);
    const override = lookupCurated(overrides, row);
    const example = lookupCurated(examples, row);
    if (!override) throw new Error(`missing curated override for ${row.simplified}`);
    if (!example) throw new Error(`missing curated example for ${row.simplified}`);
    requireEqual(row.traditional, override.traditional, `traditional for ${row.simplified}`);
    requireEqual(row.pinyin, override.pinyin, `pinyin for ${row.simplified}`);
    requireEqual(row.EN, override.en, `EN meaning for ${row.simplified}`);
    const rowTranslations = translationPack.translations[rowKey(row)] ?? translationPack.translations[row.simplified] ?? {};
    requireEqual(row["EN-GB"], rowTranslations["EN-GB"] ?? override.en, `EN-GB meaning for ${row.simplified}`);
    requireEqual(row.example_zh, example.example_zh, `example_zh for ${row.simplified}`);
    requireEqual(row.example_pinyin, example.example_pinyin, `example_pinyin for ${row.simplified}`);
    requireEqual(row.example_EN, example.example_en, `example_EN for ${row.simplified}`);
    requireEqual(
      row["example_EN-GB"],
      rowTranslations["example_EN-GB"] ?? example.example_en,
      `example_EN-GB for ${row.simplified}`
    );
    for (const [column, value] of Object.entries(rowTranslations)) {
      requireEqual(row[column], value, `${column} translation for ${row.simplified}`);
    }
    if (!row.example_zh) throw new Error(`missing example_zh for ${row.simplified}`);
    if (!row.example_pinyin) throw new Error(`missing example_pinyin for ${row.simplified}`);
    seenOrders.add(Number(row.hsk_order));
  }
  for (let i = 1; i <= expectedRows; i += 1) {
    if (!seenOrders.has(i)) throw new Error(`missing hsk_order ${i}`);
  }

  const forbiddenHeaderPatterns = [/transcription/i, /^audio/i, /ipa/i, /romanization/i];
  const forbidden = headers.filter((header) => forbiddenHeaderPatterns.some((pattern) => pattern.test(header)));
  if (forbidden.length) throw new Error(`forbidden target-language fields found: ${forbidden.join(", ")}`);

  const forbiddenEnglishMeaningPatterns = [
    /^surname\b/i,
    /\bvariant of\b/i,
    /\bused in\b/i,
    /\barchaic\b/i,
    /\babbr\./i,
    /\bold variant\b/i,
  ];
  for (const row of rows) {
    for (const column of ["EN", "EN-GB"]) {
      const value = row[column];
      if (forbiddenEnglishMeaningPatterns.some((pattern) => pattern.test(value))) {
        throw new Error(`raw dictionary artifact in ${column} for ${row.simplified}: ${value}`);
      }
    }
  }

  const imported = await SpreadsheetFile.importXlsx(await fs.readFile(xlsxPath));
  const inspect = await imported.inspect({
    kind: "table",
    range: `${mainSheet}!A1:EZ6`,
    include: "values",
    tableMaxRows: 6,
    tableMaxCols: 130,
  });
  const courseMetadataInspect = await imported.inspect({
    kind: "table",
    range: "Course Metadata!A1:BB5",
    include: "values",
    tableMaxRows: 5,
    tableMaxCols: 60,
  });
  validateCourseMetadata(courseMetadataInspect, languageHeaders);

  console.log(
    JSON.stringify(
      {
        release_id: releaseId,
        rows: rows.length,
        language_columns: languageHeaders.length,
        example_language_columns: exampleLanguageHeaders.length,
        translation_pack_files: translationPack.files,
        headers: headers.length,
        xlsx_import: "ok",
        course_metadata: "ok",
        preview_checked: Boolean(inspect),
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
