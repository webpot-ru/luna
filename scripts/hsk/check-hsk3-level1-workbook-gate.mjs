import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile } from "@oai/artifact-tool";

const ROOT = process.cwd();
const RELEASE_ID = "hsk3_level_1_300_v1";
const DATE = "20260604";
const OUTPUT_DIR = path.join(ROOT, "outputs/hsk");
const QA_DIR = path.join(OUTPUT_DIR, "qa");
const CONTRACT_PATH = path.join(ROOT, "config/hsk3-release-contract-v1.json");
const SOURCE_PATH = path.join(ROOT, "outputs/hsk/source/hsk3_level_1_300_v1.source.json");
const REUSE_MAP_PATH = path.join(ROOT, "outputs/hsk/qa/hsk3_level_1_300_v1_classic_reuse_map_20260604.json");
const CLASSIC_TARGET_TRANSLATIONS_PATH = path.join(ROOT, "config/hsk3-level1-classic-reuse-target-translations.json");
const MANUAL_TARGET_TRANSLATIONS_PATH = path.join(ROOT, "config/hsk3-level1-manual-target-translations.json");
const COURSE_METADATA_PATH = path.join(ROOT, "config/hsk3-level1-course-metadata.json");
const CSV_PATH = path.join(OUTPUT_DIR, `${RELEASE_ID}.csv`);
const XLSX_PATH = path.join(OUTPUT_DIR, `${RELEASE_ID}.xlsx`);
const JSONL_PATH = path.join(OUTPUT_DIR, `${RELEASE_ID}.jsonl`);
const LANGUAGES_PATH = path.join(ROOT, "config/language-order.json");
const REPORT_JSON = path.join(QA_DIR, `${RELEASE_ID}_workbook_gate_${DATE}.json`);
const REPORT_MD = path.join(QA_DIR, `${RELEASE_ID}_workbook_gate_${DATE}.md`);

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
  const lines = text.trimEnd().split(/\r?\n/u);
  const headers = parseCsvLine(lines[0] ?? "");
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
  return { headers, rows };
}

function issue(list, code, message, row = null) {
  list.push({ code, message, row });
}

function hskTargetLanguages(languages) {
  return languages.filter((language) => language.spreadsheetCode !== "ZH");
}

const blockers = [];
const warnings = [];

const [
  contract,
  sourceRows,
  reuseMap,
  classicTargetTranslations,
  manualTargetTranslations,
  courseMetadata,
  csvText,
  jsonlText,
  allLanguages,
] = await Promise.all([
  fs.readFile(CONTRACT_PATH, "utf8").then(JSON.parse),
  fs.readFile(SOURCE_PATH, "utf8").then(JSON.parse),
  fs.readFile(REUSE_MAP_PATH, "utf8").then(JSON.parse),
  fs.readFile(CLASSIC_TARGET_TRANSLATIONS_PATH, "utf8").then(JSON.parse),
  fs.readFile(MANUAL_TARGET_TRANSLATIONS_PATH, "utf8").then(JSON.parse),
  fs.readFile(COURSE_METADATA_PATH, "utf8").then(JSON.parse),
  fs.readFile(CSV_PATH, "utf8"),
  fs.readFile(JSONL_PATH, "utf8"),
  fs.readFile(LANGUAGES_PATH, "utf8").then(JSON.parse),
]);

const languages = hskTargetLanguages(allLanguages);
const { headers, rows } = parseCsv(csvText);
const jsonlRows = jsonlText.trimEnd().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
const languageHeaders = languages.map((language) => language.spreadsheetCode);
const exampleLanguageHeaders = languages.map((language) => `example_${language.spreadsheetCode}`);
const expectedHeaders = [
  ...contract.main_sheet.required_fixed_columns,
  ...languageHeaders,
  ...exampleLanguageHeaders,
  ...contract.main_sheet.required_status_columns,
];

if (contract.contract_id !== "hsk3_release_v1") issue(blockers, "wrong_contract_id", `Unexpected contract_id ${contract.contract_id}`);
if (rows.length !== contract.default_release.expected_row_count) {
  issue(blockers, "row_count_mismatch", `Expected ${contract.default_release.expected_row_count} rows, found ${rows.length}`);
}
if (sourceRows.length !== rows.length) issue(blockers, "source_row_count_mismatch", `Source rows ${sourceRows.length} vs CSV rows ${rows.length}`);
if (jsonlRows.length !== rows.length) issue(blockers, "jsonl_row_count_mismatch", `JSONL rows ${jsonlRows.length} vs CSV rows ${rows.length}`);
if (allLanguages.length !== 54) issue(blockers, "language_count_mismatch", `Expected 54 configured languages, found ${allLanguages.length}`);
if (languages.length !== 53) issue(blockers, "target_language_count_mismatch", `Expected 53 target languages after excluding ZH, found ${languages.length}`);
if (JSON.stringify(headers) !== JSON.stringify(expectedHeaders)) issue(blockers, "header_contract_mismatch", "CSV headers do not match HSK3 contract.");
if (headers.includes("ZH") || headers.includes("example_ZH")) issue(blockers, "zh_target_column_present", "HSK3 workbook must not include ZH target-language columns.");
const forbiddenHeaders = headers.filter((header) => /transcription|audio|ipa|romanization/iu.test(header));
if (forbiddenHeaders.length) issue(blockers, "forbidden_target_header", `Forbidden target-language fields: ${forbiddenHeaders.join(", ")}`);

const sourceByOrder = new Map(sourceRows.map((row) => [row.hsk_order, row]));
const reuseByOrder = new Map(reuseMap.rows.map((row) => [row.hsk3_order, row]));
let exampleZhFilled = 0;
let examplePinyinFilled = 0;
let targetWordFilled = 0;
let targetExampleFilled = 0;
let nonEnglishTargetWordFilled = 0;
let nonEnglishTargetExampleFilled = 0;
let classicReuseReadyRows = 0;
let manualTargetReadyRows = 0;
let manualTargetPartialRows = 0;
let targetPendingRows = 0;
let expectedNonEnglishTargetWordCells = 0;
let expectedNonEnglishTargetExampleCells = 0;

for (const row of rows) {
  const order = Number(row.hsk_order);
  const source = sourceByOrder.get(order);
  const reuse = reuseByOrder.get(order);
  if (!source) {
    issue(blockers, "missing_source_order", `Missing source row for order ${order}`, order);
    continue;
  }
  if (!reuse) issue(blockers, "missing_reuse_order", `Missing reuse-map row for order ${order}`, order);
  for (const [field, expected] of [
    ["release_id", RELEASE_ID],
    ["hsk_version", "HSK 3.0"],
    ["hsk_level", "1"],
    ["source_word", source.source_word],
    ["simplified", source.simplified],
    ["pinyin", source.pinyin],
    ["source_pos", source.pos ?? ""],
  ]) {
    if (row[field] !== String(expected)) {
      issue(blockers, "source_field_mismatch", `${field} mismatch: expected ${expected}, got ${row[field]}`, order);
    }
  }
  if (reuse && row.classic_reuse_class !== reuse.classic_reuse_class) {
    issue(blockers, "reuse_class_mismatch", `Reuse class mismatch: expected ${reuse.classic_reuse_class}, got ${row.classic_reuse_class}`, order);
  }
  const expectedClassicTargets = classicTargetTranslations[row.simplified] ?? null;
  const expectedManualTargets = manualTargetTranslations[row.simplified] ?? null;
  const expectedTargets = expectedClassicTargets ?? expectedManualTargets ?? null;
  const manualComplete =
    expectedManualTargets &&
    languages
      .map((language) => language.spreadsheetCode)
      .filter((code) => !["EN", "EN-GB"].includes(code))
      .every((code) => expectedManualTargets[code]?.translation && expectedManualTargets[code]?.example_translation);
  const expectedStatus = expectedClassicTargets
    ? "classic_reuse_target_ready"
    : manualComplete
      ? "hsk3_manual_target_ready"
      : "chinese_layer_ready_target_translation_pending";
  if (row.translation_status !== expectedStatus) issue(blockers, "bad_translation_status", `Expected ${expectedStatus}, got ${row.translation_status}`, order);
  if (row.example_status !== expectedStatus) issue(blockers, "bad_example_status", `Expected ${expectedStatus}, got ${row.example_status}`, order);
  if (expectedClassicTargets) classicReuseReadyRows += 1;
  else if (manualComplete) manualTargetReadyRows += 1;
  else if (expectedManualTargets) {
    manualTargetPartialRows += 1;
    targetPendingRows += 1;
  }
  else targetPendingRows += 1;
  if (row.example_zh) exampleZhFilled += 1;
  if (row.example_pinyin) examplePinyinFilled += 1;
  for (const language of languages) {
    if (row[language.spreadsheetCode]) targetWordFilled += 1;
    if (row[`example_${language.spreadsheetCode}`]) targetExampleFilled += 1;
    if (["EN", "EN-GB"].includes(language.spreadsheetCode)) continue;
    const expected = expectedTargets?.[language.spreadsheetCode] ?? null;
    const actualWord = row[language.spreadsheetCode];
    const actualExample = row[`example_${language.spreadsheetCode}`];
    if (actualWord) nonEnglishTargetWordFilled += 1;
    if (actualExample) {
      nonEnglishTargetExampleFilled += 1;
    }
    if (expected) {
      if (expected.translation) expectedNonEnglishTargetWordCells += 1;
      if (expected.example_translation) expectedNonEnglishTargetExampleCells += 1;
      if (actualWord !== expected.translation) {
        issue(blockers, "classic_target_word_mismatch", `${language.spreadsheetCode} mismatch for ${row.simplified}`, order);
      }
      if (actualExample !== expected.example_translation) {
        issue(blockers, "classic_target_example_mismatch", `example_${language.spreadsheetCode} mismatch for ${row.simplified}`, order);
      }
    } else {
      if (actualWord) issue(blockers, "unexpected_pending_target_word", `${language.spreadsheetCode} should be blank for pending row ${row.simplified}`, order);
      if (actualExample) issue(blockers, "unexpected_pending_target_example", `example_${language.spreadsheetCode} should be blank for pending row ${row.simplified}`, order);
    }
  }
}

if (exampleZhFilled !== rows.length || examplePinyinFilled !== rows.length) {
  issue(blockers, "chinese_examples_incomplete", `Expected ${rows.length} Chinese example rows, got example_zh=${exampleZhFilled}, example_pinyin=${examplePinyinFilled}.`);
}
const expectedEnglishCells = rows.length * 2;
if (targetWordFilled - nonEnglishTargetWordFilled !== expectedEnglishCells) {
  issue(blockers, "english_pivot_word_cells_incomplete", `Expected ${expectedEnglishCells} EN/EN-GB word cells, found ${targetWordFilled - nonEnglishTargetWordFilled}.`);
}
if (targetExampleFilled - nonEnglishTargetExampleFilled !== expectedEnglishCells) {
  issue(blockers, "english_pivot_example_cells_incomplete", `Expected ${expectedEnglishCells} EN/EN-GB example cells, found ${targetExampleFilled - nonEnglishTargetExampleFilled}.`);
}
if (nonEnglishTargetWordFilled !== expectedNonEnglishTargetWordCells || nonEnglishTargetExampleFilled !== expectedNonEnglishTargetExampleCells) {
  issue(
    blockers,
    "non_english_target_fill_count_mismatch",
    `Expected non-English word/example cells from Classic/manual layers words=${expectedNonEnglishTargetWordCells}, examples=${expectedNonEnglishTargetExampleCells}; got words=${nonEnglishTargetWordFilled}, examples=${nonEnglishTargetExampleFilled}`
  );
}
if (targetPendingRows > 0) {
  issue(warnings, "target_translations_partial", `${targetPendingRows} HSK3.0 manual rows still need non-English target-language word/example translations.`);
}

let xlsxImport = "not_checked";
let courseMetadataGate = "not_checked";
try {
  const imported = await SpreadsheetFile.importXlsx(await fs.readFile(XLSX_PATH));
  const inspect = await imported.inspect({
    kind: "table",
    range: `${contract.main_sheet.sheet_name}!A1:EZ6`,
    include: "values",
    tableMaxRows: 6,
    tableMaxCols: 140,
  });
  const parsed = JSON.parse(inspect.ndjson);
  if (!parsed.values?.length) issue(blockers, "xlsx_main_sheet_empty", "Imported XLSX main sheet preview is empty.");
  const courseMetadataInspect = await imported.inspect({
    kind: "table",
    range: "Course Metadata!A1:BB5",
    include: "values",
    tableMaxRows: 5,
    tableMaxCols: 54,
  });
  const courseMetadataRows = JSON.parse(courseMetadataInspect.ndjson).values ?? [];
  if (courseMetadataRows.length !== 5) {
    issue(blockers, "course_metadata_shape", `Course Metadata must have 5 visible rows, got ${courseMetadataRows.length}.`);
  } else {
    const [headerRow, titleRow, descriptionRow, moduleRow, categoryRow] = courseMetadataRows;
    if ((headerRow?.[0] ?? "") !== "") issue(blockers, "course_metadata_header_a1", "Course Metadata A1 must be blank.");
    if (titleRow?.[0] !== "Title") issue(blockers, "course_metadata_title_label", "Course Metadata row 2 label must be Title.");
    if (descriptionRow?.[0] !== "Description") {
      issue(blockers, "course_metadata_description_label", "Course Metadata row 3 label must be Description.");
    }
    if (moduleRow?.[0] !== "Module") issue(blockers, "course_metadata_module_label", "Course Metadata row 4 label must be Module.");
    if (categoryRow?.[0] !== "Category") {
      issue(blockers, "course_metadata_category_label", "Course Metadata row 5 label must be Category.");
    }
    const sheetCodes = headerRow.slice(1);
    if (JSON.stringify(sheetCodes) !== JSON.stringify(languageHeaders)) {
      issue(blockers, "course_metadata_language_order", "Course Metadata language headers do not match HSK3 target-language order.");
    }
    for (const [index, code] of languageHeaders.entries()) {
      const expected = courseMetadata[code];
      if (!expected?.title || !expected?.description || !expected?.module || !expected?.category) {
        issue(blockers, "course_metadata_missing_config", `Missing Course Metadata config for ${code}.`);
        continue;
      }
      const actualTitle = titleRow[index + 1] ?? "";
      const actualDescription = descriptionRow[index + 1] ?? "";
      const actualModule = moduleRow[index + 1] ?? "";
      const actualCategory = categoryRow[index + 1] ?? "";
      if (actualTitle !== expected.title) {
        issue(blockers, "course_metadata_title_mismatch", `${code} title mismatch: expected ${expected.title}, got ${actualTitle}.`);
      }
      if (actualDescription !== expected.description) {
        issue(
          blockers,
          "course_metadata_description_mismatch",
          `${code} description mismatch: expected ${expected.description}, got ${actualDescription}.`
        );
      }
      if (actualModule !== expected.module) {
        issue(blockers, "course_metadata_module_mismatch", `${code} module mismatch: expected ${expected.module}, got ${actualModule}.`);
      }
      if (actualCategory !== expected.category) {
        issue(
          blockers,
          "course_metadata_category_mismatch",
          `${code} category mismatch: expected ${expected.category}, got ${actualCategory}.`
        );
      }
    }
    const enDescription = courseMetadata.EN?.description ?? "";
    const repeatedEnglish = languageHeaders.filter(
      (code, index) => code !== "EN" && code !== "EN-GB" && (descriptionRow[index + 1] ?? "") === enDescription
    );
    if (repeatedEnglish.length) {
      issue(blockers, "course_metadata_repeated_english", `Course Metadata repeats EN description for: ${repeatedEnglish.join(", ")}.`);
    }
    courseMetadataGate = "ok";
  }
  xlsxImport = "ok";
} catch (error) {
  issue(blockers, "xlsx_import_failed", `XLSX import failed: ${error.message}`);
  xlsxImport = "failed";
  courseMetadataGate = "failed";
}

const report = {
  release_id: RELEASE_ID,
  generated_at: new Date().toISOString(),
  status: blockers.length ? "blocked" : "ok",
  rows_checked: rows.length,
  source_rows: sourceRows.length,
  jsonl_rows: jsonlRows.length,
  language_columns: languageHeaders.length,
  example_language_columns: exampleLanguageHeaders.length,
  example_zh_filled: exampleZhFilled,
  example_pinyin_filled: examplePinyinFilled,
  target_word_cells_filled: targetWordFilled,
  target_example_cells_filled: targetExampleFilled,
  non_english_target_word_cells_filled: nonEnglishTargetWordFilled,
  non_english_target_example_cells_filled: nonEnglishTargetExampleFilled,
  classic_reuse_ready_rows: classicReuseReadyRows,
  manual_target_ready_rows: manualTargetReadyRows,
  manual_target_partial_rows: manualTargetPartialRows,
  target_pending_rows: targetPendingRows,
  xlsx_import: xlsxImport,
  course_metadata_gate: courseMetadataGate,
  blockers,
  warnings,
  notes: [
    "This gate validates the HSK 3.0 Level 1 workbook after the Chinese layer is built.",
    "It requires Chinese examples, EN/EN-GB pivot cells and the current Classic-reuse target translation layer.",
    targetPendingRows > 0
      ? "Manual HSK3.0 rows remain pending for non-English target-language packs."
      : "Manual HSK3.0 target-language packs are complete for all non-English target languages.",
    "It does not import Docker/Postgres rows or upload Google Sheets.",
  ],
};

await fs.mkdir(QA_DIR, { recursive: true });
await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(
  REPORT_MD,
  [
    `# ${RELEASE_ID} Workbook Gate`,
    "",
    `Status: ${report.status}`,
    `Rows checked: ${report.rows_checked}`,
    `Language columns: ${report.language_columns}`,
    `Example language columns: ${report.example_language_columns}`,
    `Chinese examples filled: ${report.example_zh_filled}`,
    `Target word cells filled: ${report.target_word_cells_filled}`,
    `Target example cells filled: ${report.target_example_cells_filled}`,
    `Classic reuse ready rows: ${report.classic_reuse_ready_rows}`,
    `Manual HSK3 target ready rows: ${report.manual_target_ready_rows}`,
    `Manual HSK3 target partial rows: ${report.manual_target_partial_rows}`,
    `Target pending rows: ${report.target_pending_rows}`,
    `XLSX import: ${report.xlsx_import}`,
    `Course Metadata gate: ${report.course_metadata_gate}`,
    `Blockers: ${blockers.length}`,
    `Warnings: ${warnings.length}`,
    "",
    ...blockers.map((item) => `- BLOCKER ${item.code}${item.row ? ` row ${item.row}` : ""}: ${item.message}`),
    ...warnings.map((item) => `- WARNING ${item.code}: ${item.message}`),
    "",
  ].join("\n")
);

console.log(
  JSON.stringify(
    {
      release_id: RELEASE_ID,
      status: report.status,
      rows_checked: report.rows_checked,
      language_columns: report.language_columns,
      example_language_columns: report.example_language_columns,
      blockers: blockers.length,
      warnings: warnings.length,
      report: path.relative(ROOT, REPORT_JSON),
      markdown: path.relative(ROOT, REPORT_MD),
    },
    null,
    2
  )
);

if (blockers.length) process.exitCode = 1;
