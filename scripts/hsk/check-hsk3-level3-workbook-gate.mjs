import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "hsk3_level_3_500_v1";
const DATE = "20260604";
const CSV_PATH = path.join(ROOT, "outputs/hsk/hsk3_level_3_500_v1.csv");
const SOURCE_PATH = path.join(ROOT, "outputs/hsk/source/hsk3_level_3_500_v1.source.json");
const EXAMPLES_PATH = path.join(ROOT, "config/hsk3-level3-examples.json");
const GLOSSES_PATH = path.join(ROOT, "config/hsk3-level3-en-glosses.json");
const COURSE_METADATA_PATH = path.join(ROOT, "config/hsk3-level3-course-metadata.json");
const MANUAL_TARGET_TRANSLATIONS_PATH = path.join(ROOT, "config/hsk3-level3-manual-target-translations.json");
const LANGUAGES_PATH = path.join(ROOT, "config/language-order.json");
const CHINESE_BUILD_REPORT = path.join(ROOT, "outputs/hsk/qa/hsk3_level_3_500_v1_chinese_examples_build_20260604.json");
const CLASSIC_TARGET_REPORT = path.join(ROOT, "outputs/hsk/qa/hsk3_level_3_500_v1_classic_target_translation_build_20260604.json");
const REPORT_JSON = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_workbook_gate_${DATE}.json`);
const REPORT_MD = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_workbook_gate_${DATE}.md`);
const EXPECTED_CLASSIC_READY_ROWS = 298;
const EXPECTED_HSK3_ONLY_ROWS = 202;
const EXPECTED_FILLED_NON_ENGLISH_CELLS = 25_500;

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
  return {
    headers,
    rows: lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    }),
  };
}

function issue(list, code, message, row = null) {
  list.push({ code, message, row });
}

function hasHan(value) {
  return /\p{Script=Han}/u.test(String(value ?? ""));
}

function hasToneNumber(value) {
  return /(?:[A-Za-züÜv:]+[1-5]\b|\b[1-5]\s*$)/u.test(String(value ?? ""));
}

function hasLatin(value) {
  return /[A-Za-züÜ]/u.test(String(value ?? ""));
}

const [csvText, sourceRows, examples, glosses, courseMetadata, manualTargetTranslations, languages, chineseBuildReport, classicTargetReport] =
  await Promise.all([
    fs.readFile(CSV_PATH, "utf8"),
    fs.readFile(SOURCE_PATH, "utf8").then(JSON.parse),
    fs.readFile(EXAMPLES_PATH, "utf8").then(JSON.parse),
    fs.readFile(GLOSSES_PATH, "utf8").then(JSON.parse),
    fs.readFile(COURSE_METADATA_PATH, "utf8").then(JSON.parse),
    fs.readFile(MANUAL_TARGET_TRANSLATIONS_PATH, "utf8").then(JSON.parse),
    fs.readFile(LANGUAGES_PATH, "utf8").then(JSON.parse),
    fs.readFile(CHINESE_BUILD_REPORT, "utf8").then(JSON.parse),
    fs.readFile(CLASSIC_TARGET_REPORT, "utf8").then(JSON.parse),
  ]);

const targetLanguages = languages.filter((language) => language.spreadsheetCode !== "ZH");
const targetCodes = targetLanguages.map((language) => language.spreadsheetCode);
const nonEnglishTargetCodes = targetCodes.filter((code) => !["EN", "EN-GB"].includes(code));
const { headers, rows } = parseCsv(csvText);
const blockers = [];
const warnings = [];

const requiredHeaders = [
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
  ...targetCodes,
  ...targetCodes.map((code) => `example_${code}`),
  "translation_status",
  "example_status",
  "qa_notes",
];

for (const header of requiredHeaders) {
  if (!headers.includes(header)) issue(blockers, "missing_header", `Workbook CSV is missing header ${header}`);
}

if (rows.length !== 500) issue(blockers, "row_count", `Expected 500 workbook rows, found ${rows.length}`);
if (sourceRows.length !== 500) issue(blockers, "source_row_count", `Expected 500 source rows, found ${sourceRows.length}`);
if (targetCodes.length !== 53) issue(blockers, "target_language_count", `Expected 53 HSK target languages, found ${targetCodes.length}`);

const rowsByKey = new Map(rows.map((row) => [row.hsk_key, row]));
if (rowsByKey.size !== rows.length) issue(blockers, "duplicate_hsk_key", "Workbook rows have duplicate hsk_key values.");

for (const [index, sourceRow] of sourceRows.entries()) {
  const order = 501 + index;
  const key = sourceRow.hsk_key ?? `${sourceRow.hsk_order}:${sourceRow.source_word}`;
  const row = rowsByKey.get(key);
  const example = examples[key];
  const gloss = glosses[key];
  if (!row) {
    issue(blockers, "missing_workbook_row", `Missing workbook row for ${key}`, order);
    continue;
  }
  for (const [field, expected] of [
    ["release_id", RELEASE_ID],
    ["hsk_version", "HSK 3.0"],
    ["hsk_level", "3"],
    ["hsk_order", String(order)],
    ["source_word", sourceRow.source_word],
    ["simplified", sourceRow.simplified],
    ["pinyin", sourceRow.pinyin],
    ["source_pos", sourceRow.pos ?? ""],
    ["example_zh", example?.example_zh ?? ""],
    ["example_pinyin", example?.example_pinyin ?? ""],
    ["EN", gloss ?? ""],
    ["EN-GB", gloss ?? ""],
    ["example_EN", example?.example_en ?? ""],
    ["example_EN-GB", example?.example_en ?? ""],
  ]) {
    if (row[field] !== expected) issue(blockers, "field_mismatch", `${field} mismatch for ${key}: expected ${expected}, found ${row[field]}`, order);
  }
  if (!example) issue(blockers, "missing_example_config", `Missing example config for ${key}`, order);
  if (!gloss) issue(blockers, "missing_gloss_config", `Missing gloss config for ${key}`, order);
  if (example) {
    if (!example.example_zh.includes(sourceRow.simplified)) {
      issue(blockers, "example_missing_source_word", `Example does not contain ${sourceRow.simplified}: ${example.example_zh}`, order);
    }
    if (!hasHan(example.example_zh)) issue(blockers, "example_zh_no_han", `Chinese example has no Han for ${key}`, order);
    if (hasHan(example.example_pinyin)) issue(blockers, "example_pinyin_has_han", `Example pinyin contains Han for ${key}`, order);
    if (!hasLatin(example.example_pinyin)) issue(blockers, "example_pinyin_no_latin", `Example pinyin has no Latin for ${key}`, order);
    if (hasToneNumber(example.example_pinyin)) issue(blockers, "example_pinyin_tone_number", `Example pinyin has tone numbers for ${key}`, order);
    if (hasHan(example.example_en)) issue(blockers, "example_en_has_han", `English example translation contains Han for ${key}`, order);
  }
}

if (chineseBuildReport.blockers?.length) {
  issue(blockers, "chinese_build_report_blocked", `Chinese example build report has ${chineseBuildReport.blockers.length} blockers`);
}
if (classicTargetReport.blockers?.length) {
  issue(blockers, "classic_target_report_blocked", `Classic target build report has ${classicTargetReport.blockers.length} blockers`);
}

const statusCounts = rows.reduce((acc, row) => {
  acc[row.translation_status] = (acc[row.translation_status] ?? 0) + 1;
  return acc;
}, {});
const completeClassicRows = statusCounts.classic_reuse_target_ready ?? 0;
const completeManualRows = statusCounts.hsk3_manual_target_ready ?? 0;
const pendingRows = statusCounts.chinese_layer_ready_target_translation_pending ?? 0;

if (completeClassicRows !== EXPECTED_CLASSIC_READY_ROWS) {
  issue(blockers, "classic_reuse_ready_count", `Expected ${EXPECTED_CLASSIC_READY_ROWS} Classic-ready rows, found ${completeClassicRows}`);
}
if (completeManualRows + pendingRows !== EXPECTED_HSK3_ONLY_ROWS) {
  issue(blockers, "manual_or_pending_row_count", `Expected ${EXPECTED_HSK3_ONLY_ROWS} HSK3-only manual/pending rows, found manual=${completeManualRows}, pending=${pendingRows}`);
}
if (completeManualRows !== EXPECTED_HSK3_ONLY_ROWS) {
  issue(blockers, "manual_ready_count", `Expected ${EXPECTED_HSK3_ONLY_ROWS} manual-ready HSK3-only rows, found ${completeManualRows}`);
}
if (pendingRows !== 0) {
  issue(blockers, "pending_target_rows", `Expected 0 pending target-language rows, found ${pendingRows}`);
}

for (const row of rows) {
  const manualTranslations = manualTargetTranslations[row.hsk_key] ?? null;
  for (const code of nonEnglishTargetCodes) {
    const word = row[code];
    const example = row[`example_${code}`];
    if (row.translation_status === "classic_reuse_target_ready") {
      if (!word) issue(blockers, "classic_target_word_blank", `Classic-ready row ${row.hsk_key} missing ${code}`, Number(row.hsk_order));
      if (!example) issue(blockers, "classic_target_example_blank", `Classic-ready row ${row.hsk_key} missing example_${code}`, Number(row.hsk_order));
    }
    if (row.translation_status === "chinese_layer_ready_target_translation_pending") {
      const manualCell = manualTranslations?.[code] ?? null;
      if (manualCell) {
        if (word !== manualCell.translation) {
          issue(blockers, "pending_manual_word_mismatch", `Pending row ${row.hsk_key} ${code} differs from manual target layer`, Number(row.hsk_order));
        }
        if (example !== manualCell.example_translation) {
          issue(blockers, "pending_manual_example_mismatch", `Pending row ${row.hsk_key} example_${code} differs from manual target layer`, Number(row.hsk_order));
        }
      } else if (word || example) {
        issue(blockers, "pending_unexpected_target_filled", `Pending row ${row.hsk_key} unexpectedly has ${code} target cells without manual layer evidence`, Number(row.hsk_order));
      }
    }
    if (row.translation_status === "hsk3_manual_target_ready") {
      const manualCell = manualTranslations?.[code] ?? null;
      if (!manualCell) {
        issue(blockers, "manual_ready_missing_layer_cell", `Manual-ready row ${row.hsk_key} has no ${code} manual layer evidence`, Number(row.hsk_order));
      } else {
        if (word !== manualCell.translation) {
          issue(blockers, "manual_ready_word_mismatch", `Manual-ready row ${row.hsk_key} ${code} differs from manual target layer`, Number(row.hsk_order));
        }
        if (example !== manualCell.example_translation) {
          issue(blockers, "manual_ready_example_mismatch", `Manual-ready row ${row.hsk_key} example_${code} differs from manual target layer`, Number(row.hsk_order));
        }
      }
    }
  }
}

const metadataCodes = Object.keys(courseMetadata);
if (metadataCodes.length !== 53) issue(blockers, "course_metadata_language_count", `Expected 53 Course Metadata languages, found ${metadataCodes.length}`);
for (const code of targetCodes) {
  const metadata = courseMetadata[code];
  if (!metadata) {
    issue(blockers, "course_metadata_missing_language", `Missing Course Metadata for ${code}`);
    continue;
  }
  if (metadata.title !== "HSK 3.") issue(blockers, "course_metadata_bad_title", `Bad title for ${code}: ${metadata.title}`);
  if (metadata.category !== "HSK 3") issue(blockers, "course_metadata_bad_category", `Bad category for ${code}: ${metadata.category}`);
  if (/HSK 2\.0|2010-2021/u.test(metadata.description)) {
    issue(blockers, "course_metadata_old_source_ref", `Old Classic source ref in ${code}: ${metadata.description}`);
  }
  if (!metadata.description.includes("HSK 3") || !metadata.description.includes("HSK 3.0")) {
    issue(blockers, "course_metadata_bad_description", `Description must mention HSK 3 and HSK 3.0 for ${code}: ${metadata.description}`);
  }
}

const filledNonEnglishWordCells = rows.reduce(
  (sum, row) => sum + nonEnglishTargetCodes.filter((code) => Boolean(row[code])).length,
  0
);
const filledNonEnglishExampleCells = rows.reduce(
  (sum, row) => sum + nonEnglishTargetCodes.filter((code) => Boolean(row[`example_${code}`])).length,
  0
);

if (filledNonEnglishWordCells !== EXPECTED_FILLED_NON_ENGLISH_CELLS) {
  issue(blockers, "filled_non_english_word_cells", `Expected ${EXPECTED_FILLED_NON_ENGLISH_CELLS} filled non-English word cells, found ${filledNonEnglishWordCells}`);
}
if (filledNonEnglishExampleCells !== EXPECTED_FILLED_NON_ENGLISH_CELLS) {
  issue(blockers, "filled_non_english_example_cells", `Expected ${EXPECTED_FILLED_NON_ENGLISH_CELLS} filled non-English example cells, found ${filledNonEnglishExampleCells}`);
}

const report = {
  release_id: RELEASE_ID,
  generated_at: new Date().toISOString(),
  status: blockers.length ? "blocked" : "ok",
  readiness: pendingRows ? "prep_not_final_target_language_delivery" : "complete_53_languages_filled",
  rows_checked: rows.length,
  target_language_count: targetCodes.length,
  status_counts: statusCounts,
  filled_non_english_word_cells: filledNonEnglishWordCells,
  filled_non_english_example_cells: filledNonEnglishExampleCells,
  hsk3_only_row_count: EXPECTED_HSK3_ONLY_ROWS,
  pending_rows: pendingRows,
  blockers,
  warnings,
  checked_files: {
    csv: path.relative(ROOT, CSV_PATH),
    source: path.relative(ROOT, SOURCE_PATH),
    examples: path.relative(ROOT, EXAMPLES_PATH),
    glosses: path.relative(ROOT, GLOSSES_PATH),
    course_metadata: path.relative(ROOT, COURSE_METADATA_PATH),
    manual_target_translations: path.relative(ROOT, MANUAL_TARGET_TRANSLATIONS_PATH),
  },
};

await fs.mkdir(path.dirname(REPORT_JSON), { recursive: true });
await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(
  REPORT_MD,
  [
    `# ${RELEASE_ID} Workbook Gate`,
    "",
    `Status: ${report.status}`,
    `Readiness: ${report.readiness}`,
    `Rows checked: ${report.rows_checked}`,
    `Target languages: ${report.target_language_count}`,
    `Status counts: ${JSON.stringify(statusCounts)}`,
    `Filled non-English word cells: ${filledNonEnglishWordCells}`,
    `Filled non-English example cells: ${filledNonEnglishExampleCells}`,
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
      readiness: report.readiness,
      rows_checked: report.rows_checked,
      status_counts: report.status_counts,
      filled_non_english_word_cells: report.filled_non_english_word_cells,
      filled_non_english_example_cells: report.filled_non_english_example_cells,
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
