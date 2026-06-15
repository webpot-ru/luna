import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";
import { addInternalDataSheet, buildHskBuyerFacingMainSheet } from "./hsk-buyer-facing-workbook.mjs";

const ROOT = process.cwd();
const RELEASE_ID = "hsk3_level_6_1400_v1";
const HSK_VERSION = "HSK 3.0";
const HSK_LEVEL = 6;
const EXPECTED_ROWS = 1400;
const MAIN_SHEET = "HSK3 Level 6";

const contractPath = path.join(ROOT, "config/hsk3-release-contract-v1.json");
const sourcePath = path.join(ROOT, "outputs/hsk/source/hsk3_level_6_1400_v1.source.json");
const reuseMapPath = path.join(ROOT, "outputs/hsk/qa/hsk3_level_6_1400_v1_classic_reuse_map_20260608.json");
const examplesPath = path.join(ROOT, "config/hsk3-level6-examples.json");
const glossesPath = path.join(ROOT, "config/hsk3-level6-en-glosses.json");
const classicTargetTranslationsPath = path.join(ROOT, "config/hsk3-level6-classic-reuse-target-translations.json");
const manualTargetTranslationsPath = path.join(ROOT, "config/hsk3-level6-manual-target-translations.json");
const courseMetadataPath = path.join(ROOT, "config/hsk3-level6-course-metadata.json");
const languagesPath = path.join(ROOT, "config/language-order.json");
const outputDir = path.join(ROOT, "outputs/hsk");
const xlsxPath = path.join(outputDir, `${RELEASE_ID}.xlsx`);
const csvPath = path.join(outputDir, `${RELEASE_ID}.csv`);
const jsonlPath = path.join(outputDir, `${RELEASE_ID}.jsonl`);

const fixedHeaders = [
  "release_id",
  "hsk_version",
  "hsk_level",
  "hsk_order",
  "hsk_key",
  "source_word",
  "simplified",
  "pinyin",
  "source_pos",
  "classic_reuse_class",
  "classic_reuse_notes",
  "example_zh",
  "example_pinyin",
];
const statusHeaders = ["translation_status", "example_status", "qa_notes"];

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
  if (/[",\n\r]/u.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function toCsv(headers, rows) {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

function hskTargetLanguages(languages) {
  return languages.filter((language) => language.spreadsheetCode !== "ZH");
}

function hskKey(row) {
  return row.hsk_key ?? `${row.hsk_order}:${row.source_word}`;
}

function validateSource(rows) {
  if (!Array.isArray(rows)) throw new Error("HSK3 Level 6 source snapshot must be a JSON array");
  if (rows.length !== EXPECTED_ROWS) throw new Error(`Expected ${EXPECTED_ROWS} HSK3 rows, got ${rows.length}`);
  const seenKeys = new Set();
  for (const [index, row] of rows.entries()) {
    const expectedOrder = 3601 + index;
    if (row.release_id !== RELEASE_ID) throw new Error(`Row ${expectedOrder} has wrong release_id ${row.release_id}`);
    if (row.hsk_version !== HSK_VERSION) throw new Error(`Row ${expectedOrder} has wrong hsk_version ${row.hsk_version}`);
    if (row.hsk_level !== HSK_LEVEL) throw new Error(`Row ${expectedOrder} has wrong hsk_level ${row.hsk_level}`);
    if (row.hsk_order !== expectedOrder) throw new Error(`Row ${expectedOrder} has wrong hsk_order ${row.hsk_order}`);
    if (hskKey(row) !== `${row.hsk_order}:${row.source_word}`) throw new Error(`Row ${expectedOrder} has wrong hsk_key ${hskKey(row)}`);
    if (!row.source_word || !row.simplified || !row.pinyin) throw new Error(`Row ${expectedOrder} missing source_word/simplified/pinyin`);
    if (seenKeys.has(hskKey(row))) throw new Error(`Duplicate hsk_key source row: ${hskKey(row)}`);
    seenKeys.add(hskKey(row));
  }
}

function validateReuseMap(reuseMap, sourceRows) {
  if (reuseMap.release_id !== RELEASE_ID) throw new Error(`Reuse map release_id mismatch: ${reuseMap.release_id}`);
  if (!Array.isArray(reuseMap.rows)) throw new Error("Reuse map must contain rows array");
  if (reuseMap.rows.length !== sourceRows.length) {
    throw new Error(`Reuse map row count ${reuseMap.rows.length} differs from source row count ${sourceRows.length}`);
  }
  const byOrder = new Map(reuseMap.rows.map((row) => [row.hsk3_order, row]));
  for (const row of sourceRows) {
    const reuse = byOrder.get(row.hsk_order);
    if (!reuse) throw new Error(`Reuse map missing row ${row.hsk_order}`);
    if (reuse.hsk3_simplified !== row.simplified || reuse.hsk3_source_word !== row.source_word) {
      throw new Error(`Reuse map source mismatch at row ${row.hsk_order}`);
    }
  }
}

function validateChineseLayer(sourceRows, examples, glosses) {
  const sourceKeys = new Set(sourceRows.map(hskKey));
  for (const row of sourceRows) {
    const key = hskKey(row);
    const example = examples[key];
    const gloss = glosses[key];
    if (!example) throw new Error(`Missing Chinese example for ${key}`);
    if (!gloss) throw new Error(`Missing EN gloss for ${key}`);
    for (const field of ["example_zh", "example_pinyin", "example_en"]) {
      if (!example[field]) throw new Error(`Missing ${field} for ${key}`);
    }
  }
  for (const key of Object.keys(examples)) {
    if (!sourceKeys.has(key)) throw new Error(`Example key is not in HSK3 Level 6 source: ${key}`);
  }
  for (const key of Object.keys(glosses)) {
    if (!sourceKeys.has(key)) throw new Error(`Gloss key is not in HSK3 Level 6 source: ${key}`);
  }
}

function validateCourseMetadata(languages, courseMetadata) {
  const codes = languages.map((language) => language.spreadsheetCode);
  const missing = codes.filter(
    (code) =>
      !courseMetadata[code]?.title ||
      !courseMetadata[code]?.description ||
      !courseMetadata[code]?.module ||
      !courseMetadata[code]?.category
  );
  if (missing.length) throw new Error(`Missing HSK3 Level 6 Course Metadata for: ${missing.join(", ")}`);
  const oldSourceRefs = codes.filter((code) => /HSK 2\.0|2010-2021/u.test(courseMetadata[code].description));
  if (oldSourceRefs.length) throw new Error(`HSK3 Level 6 metadata has old Classic source refs for: ${oldSourceRefs.join(", ")}`);
  const repeatedEnglish = codes.filter(
    (code) => code !== "EN" && code !== "EN-GB" && courseMetadata[code]?.description === courseMetadata.EN?.description
  );
  if (repeatedEnglish.length) throw new Error(`HSK3 Level 6 Course Metadata descriptions repeat EN text for: ${repeatedEnglish.join(", ")}`);
}

function buildRows(sourceRows, languages, reuseMap, examples, glosses, classicTargetTranslations, manualTargetTranslations) {
  const reuseByOrder = new Map(reuseMap.rows.map((row) => [row.hsk3_order, row]));
  const nonEnglishTargetCodes = languages
    .map((language) => language.spreadsheetCode)
    .filter((code) => !["EN", "EN-GB"].includes(code));

  return sourceRows.map((sourceRow) => {
    const key = hskKey(sourceRow);
    const reuse = reuseByOrder.get(sourceRow.hsk_order);
    const example = examples[key];
    const gloss = glosses[key];
    const classicTranslations = classicTargetTranslations[key] ?? null;
    const manualTranslations = manualTargetTranslations[key] ?? null;
    const targetTranslations = classicTranslations ?? manualTranslations ?? null;
    const hasCompleteTargets =
      targetTranslations &&
      nonEnglishTargetCodes.every(
        (code) => targetTranslations[code]?.translation && targetTranslations[code]?.example_translation
      );
    const targetStatus = classicTranslations
      ? "classic_reuse_target_ready"
      : manualTranslations
        ? "hsk3_manual_target_ready"
        : "chinese_layer_ready_target_translation_pending";
    const row = {
      release_id: RELEASE_ID,
      hsk_version: HSK_VERSION,
      hsk_level: HSK_LEVEL,
      hsk_order: sourceRow.hsk_order,
      hsk_key: key,
      source_word: sourceRow.source_word,
      simplified: sourceRow.simplified,
      pinyin: sourceRow.pinyin,
      source_pos: sourceRow.pos ?? "",
      classic_reuse_class: reuse?.classic_reuse_class ?? "unclassified",
      classic_reuse_notes: reuse?.classic_reuse_notes ?? "",
      example_zh: example.example_zh,
      example_pinyin: example.example_pinyin,
      translation_status: hasCompleteTargets ? targetStatus : "chinese_layer_ready_target_translation_pending",
      example_status: hasCompleteTargets ? targetStatus : "chinese_layer_ready_target_translation_pending",
      qa_notes: classicTranslations
        ? "HSK3.0 Chinese layer ready. Target-language cells copied from row-level Classic reuse evidence."
        : manualTranslations
          ? "HSK3.0 Chinese layer ready. Target-language cells authored in the separate HSK3 manual target layer."
          : "HSK3.0 Chinese layer ready. EN/EN-GB pivot cells are filled; remaining target-language packs are pending.",
    };

    for (const language of languages) {
      row[language.spreadsheetCode] = "";
      row[`example_${language.spreadsheetCode}`] = "";
    }
    row.EN = gloss;
    row["EN-GB"] = gloss;
    row.example_EN = example.example_en;
    row["example_EN-GB"] = example.example_en;
    if (targetTranslations) {
      for (const code of nonEnglishTargetCodes) {
        row[code] = targetTranslations[code]?.translation ?? "";
        row[`example_${code}`] = targetTranslations[code]?.example_translation ?? "";
      }
    }

    return row;
  });
}

function addMainSheet(workbook, headers, rows) {
  const sheet = workbook.worksheets.add(MAIN_SHEET);
  setValues(sheet, 1, 0, [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))]);
}

function addCourseMetadata(workbook, languages, courseMetadata) {
  validateCourseMetadata(languages, courseMetadata);
  const codes = languages.map((language) => language.spreadsheetCode);
  const sheet = workbook.worksheets.add("Course Metadata");
  setValues(sheet, 1, 0, [
    ["", ...codes],
    ["Title", ...codes.map((code) => courseMetadata[code].title)],
    ["Description", ...codes.map((code) => courseMetadata[code].description)],
    ["Module", ...codes.map((code) => courseMetadata[code].module)],
    ["Category", ...codes.map((code) => courseMetadata[code].category)],
  ]);
}

function addReadme(workbook, contract, languages, reuseMap) {
  const sheet = workbook.worksheets.add("README");
  setValues(sheet, 1, 0, [
    ["LunaCards HSK 3.0 preparation workbook"],
    ["Release ID", RELEASE_ID],
    ["HSK version", HSK_VERSION],
    ["HSK level", HSK_LEVEL],
    ["Expected rows", EXPECTED_ROWS],
    ["Official source order", "3601-5000"],
    ["Internal language columns", languages.length],
    ["Buyer-facing language columns", "54 including ZH"],
    ["Main sheet", MAIN_SHEET],
    ["Status", "complete source/chinese/classic-reuse/manual target-language preparation"],
    ["Chinese layer", "ready: Chinese word/example and pinyin are shown as ZH, ZH example, ZH transcription and ZH example transcription"],
    ["Official source", contract.source_policy.official_page_url],
    ["Official PDF", contract.source_policy.pdf_url],
    ["Local source snapshot", path.relative(ROOT, sourcePath)],
    ["Classic reuse map", path.relative(ROOT, reuseMapPath)],
    ["Chinese examples", path.relative(ROOT, examplesPath)],
    ["EN glosses", path.relative(ROOT, glossesPath)],
    ["Classic target translation layer", path.relative(ROOT, classicTargetTranslationsPath)],
    ["Manual HSK3 target translation layer", path.relative(ROOT, manualTargetTranslationsPath)],
    ["Reuse allowed candidates", reuseMap.reuse_allowed_rows],
    ["Reuse blocked rows", reuseMap.reuse_blocked_rows],
    ["Audio", "not in scope"],
    ["Target-language transcription", "not in scope"],
    ["Internal Data", "Technical HSK3 source/reuse/status fields are kept off the buyer-facing first sheet."],
    ["Contract", path.relative(ROOT, contractPath)],
    ["Documentation", "docs/hsk-3-release-plan.md"],
  ]);
}

function addLanguages(workbook, languages) {
  const sheet = workbook.worksheets.add("Languages");
  setValues(sheet, 1, 0, [["order", "spreadsheet_code", "db_code", "language"]]);
  setValues(
    sheet,
    2,
    0,
    languages.map((language, index) => [index + 1, language.spreadsheetCode, language.dbCode, language.language])
  );
}

function addClassicReuseMap(workbook, reuseMap) {
  const headers = [
    "hsk3_order",
    "hsk3_source_word",
    "hsk3_simplified",
    "hsk3_pinyin",
    "hsk3_pos",
    "classic_reuse_class",
    "classic_reuse_allowed",
    "classic_reuse_notes",
    "first_classic_release_id",
    "first_classic_level",
    "first_classic_order",
    "first_classic_source_word",
    "first_classic_pinyin",
    "first_classic_en",
  ];
  const sheet = workbook.worksheets.add("Classic Reuse Map");
  setValues(sheet, 1, 0, [headers, ...reuseMap.rows.map((row) => headers.map((header) => row[header] ?? ""))]);
}

function addTranslationQa(workbook, languages, rows) {
  const headers = ["order", "spreadsheet_code", "language", "word_filled", "example_filled", "word_missing", "example_missing", "status"];
  const data = languages.map((language, index) => {
    const code = language.spreadsheetCode;
    const filledWords = rows.filter((row) => Boolean(row[code])).length;
    const filledExamples = rows.filter((row) => Boolean(row[`example_${code}`])).length;
    return [
      index + 1,
      code,
      language.language,
      filledWords,
      filledExamples,
      rows.length - filledWords,
      rows.length - filledExamples,
      ["EN", "EN-GB"].includes(code)
        ? "english_pivot_ready"
        : filledWords === rows.length && filledExamples === rows.length
          ? "complete"
          : "manual_hsk3_target_pending",
    ];
  });
  const sheet = workbook.worksheets.add("Translation QA");
  setValues(sheet, 1, 0, [headers, ...data]);
}

function addSourceAudit(workbook, sourceRows, reuseMap) {
  const reuseByOrder = new Map(reuseMap.rows.map((row) => [row.hsk3_order, row]));
  const headers = [
    "hsk_order",
    "hsk_key",
    "source_word",
    "simplified",
    "pinyin",
    "source_pos",
    "raw_level",
    "classic_reuse_class",
    "classic_reuse_allowed",
    "first_classic_release_id",
    "first_classic_order",
    "first_classic_source_word",
    "first_classic_pinyin",
  ];
  const rows = sourceRows.map((row) => {
    const reuse = reuseByOrder.get(row.hsk_order);
    return [
      row.hsk_order,
      hskKey(row),
      row.source_word,
      row.simplified,
      row.pinyin,
      row.pos ?? "",
      row.raw_level ?? "",
      reuse?.classic_reuse_class ?? "",
      reuse?.classic_reuse_allowed ?? "",
      reuse?.first_classic_release_id ?? "",
      reuse?.first_classic_order ?? "",
      reuse?.first_classic_source_word ?? "",
      reuse?.first_classic_pinyin ?? "",
    ];
  });
  const sheet = workbook.worksheets.add("Source Audit");
  setValues(sheet, 1, 0, [headers, ...rows]);
}

function addSources(workbook, contract) {
  const sheet = workbook.worksheets.add("Sources");
  setValues(sheet, 1, 0, [
    ["source_id", "role", "url_or_path", "license_or_posture", "notes"],
    [
      "official-hsk3-syllabus-pdf",
      "Chinese base list for HSK 3.0 Level 6",
      contract.source_policy.pdf_url,
      "official exam syllabus; use as source of truth for source rows",
      "Local snapshot is stored under outputs/hsk/source/.",
    ],
    [
      "hsk3-level6-source-snapshot",
      "Normalized source rows",
      path.relative(ROOT, sourcePath),
      "internal LunaCards normalization of official source",
      "Preserves official HSK 3.0 pinyin and row order 3601-5000.",
    ],
    [
      "hsk3-level6-classic-reuse-map",
      "Classic HSK candidate reuse classification",
      path.relative(ROOT, reuseMapPath),
      "candidate evidence only",
      "Does not mutate or override HSK 3.0 source rows.",
    ],
    [
      "hsk3-level6-classic-reuse-target-translations",
      "Target-language cells copied from row-level Classic reuse",
      path.relative(ROOT, classicTargetTranslationsPath),
      "candidate reuse evidence only",
      "Only applies to rows whose Chinese examples were sourced from Classic reuse.",
    ],
    [
      "hsk3-level6-manual-target-translations",
      "Target-language cells authored for HSK3-only rows",
      path.relative(ROOT, manualTargetTranslationsPath),
      "manual HSK3 target layer",
      "Complete for the 664 HSK3-only rows across all 51 non-English target languages.",
    ],
  ]);
}

async function main() {
  const [
    contractText,
    sourceText,
    reuseText,
    examplesText,
    glossesText,
    classicTargetsText,
    manualTargetsText,
    courseMetadataText,
    languagesText,
  ] = await Promise.all([
    fs.readFile(contractPath, "utf8"),
    fs.readFile(sourcePath, "utf8"),
    fs.readFile(reuseMapPath, "utf8"),
    fs.readFile(examplesPath, "utf8"),
    fs.readFile(glossesPath, "utf8"),
    fs.readFile(classicTargetTranslationsPath, "utf8"),
    fs.readFile(manualTargetTranslationsPath, "utf8"),
    fs.readFile(courseMetadataPath, "utf8"),
    fs.readFile(languagesPath, "utf8"),
  ]);
  const contract = JSON.parse(contractText);
  const sourceRows = JSON.parse(sourceText);
  const reuseMap = JSON.parse(reuseText);
  const examples = JSON.parse(examplesText);
  const glosses = JSON.parse(glossesText);
  const classicTargetTranslations = JSON.parse(classicTargetsText);
  const manualTargetTranslations = JSON.parse(manualTargetsText);
  const courseMetadata = JSON.parse(courseMetadataText);
  const allLanguages = JSON.parse(languagesText);
  const languages = hskTargetLanguages(allLanguages);

  validateSource(sourceRows);
  validateReuseMap(reuseMap, sourceRows);
  validateChineseLayer(sourceRows, examples, glosses);
  if (allLanguages.length !== 54) throw new Error(`Expected 54 configured languages, got ${allLanguages.length}`);
  if (languages.length !== 53) throw new Error(`Expected 53 HSK target languages after removing ZH, got ${languages.length}`);

  const languageHeaders = languages.map((language) => language.spreadsheetCode);
  const exampleLanguageHeaders = languages.map((language) => `example_${language.spreadsheetCode}`);
  const headers = [...fixedHeaders, ...languageHeaders, ...exampleLanguageHeaders, ...statusHeaders];
  const rows = buildRows(sourceRows, languages, reuseMap, examples, glosses, classicTargetTranslations, manualTargetTranslations);

  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(csvPath, `${toCsv(headers, rows)}\n`, "utf8"),
    fs.writeFile(jsonlPath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8"),
  ]);

  const workbook = Workbook.create();
  const buyerFacing = buildHskBuyerFacingMainSheet({ rows, allLanguages });
  addMainSheet(workbook, buyerFacing.headers, buyerFacing.rows);
  addInternalDataSheet({ workbook, setValues, headers, rows });
  addCourseMetadata(workbook, languages, courseMetadata);
  addReadme(workbook, contract, languages, reuseMap);
  addLanguages(workbook, languages);
  addClassicReuseMap(workbook, reuseMap);
  addTranslationQa(workbook, languages, rows);
  addSourceAudit(workbook, sourceRows, reuseMap);
  addSources(workbook, contract);

  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(xlsxPath);

  const completeRows = rows.filter((row) => row.translation_status !== "chinese_layer_ready_target_translation_pending").length;
  const pendingRows = rows.length - completeRows;
  console.log(
    JSON.stringify(
      {
        release_id: RELEASE_ID,
        status: pendingRows ? "target_language_packs_pending" : "complete_53_languages_filled",
        rows: rows.length,
        complete_target_rows: completeRows,
        pending_target_rows: pendingRows,
        language_columns: languageHeaders.length,
        example_language_columns: exampleLanguageHeaders.length,
        reuse_allowed_rows: reuseMap.reuse_allowed_rows,
        reuse_blocked_rows: reuseMap.reuse_blocked_rows,
        files: {
          xlsx: path.relative(ROOT, xlsxPath),
          csv: path.relative(ROOT, csvPath),
          jsonl: path.relative(ROOT, jsonlPath),
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
