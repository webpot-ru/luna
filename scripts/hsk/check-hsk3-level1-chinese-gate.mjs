import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "hsk3_level_1_300_v1";
const DATE = "20260604";
const SOURCE_PATH = path.join(ROOT, "outputs/hsk/source/hsk3_level_1_300_v1.source.json");
const EXAMPLES_PATH = path.join(ROOT, "config/hsk3-level1-examples.json");
const GLOSSES_PATH = path.join(ROOT, "config/hsk3-level1-en-glosses.json");
const CSV_PATH = path.join(ROOT, "outputs/hsk/hsk3_level_1_300_v1.csv");
const REPORT_JSON = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_chinese_gate_${DATE}.json`);
const REPORT_MD = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_chinese_gate_${DATE}.md`);

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
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
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

function requiredSourceParts(simplified) {
  return String(simplified).split("…").filter(Boolean);
}

const [sourceRows, examples, glosses, csvText] = await Promise.all([
  fs.readFile(SOURCE_PATH, "utf8").then(JSON.parse),
  fs.readFile(EXAMPLES_PATH, "utf8").then(JSON.parse),
  fs.readFile(GLOSSES_PATH, "utf8").then(JSON.parse),
  fs.readFile(CSV_PATH, "utf8"),
]);

const csvRows = parseCsv(csvText);
const csvByWord = new Map(csvRows.map((row) => [row.simplified, row]));
const blockers = [];
const warnings = [];
let manualExamples = 0;
let classicExamples = 0;

for (const sourceRow of sourceRows) {
  const order = sourceRow.hsk_order;
  const word = sourceRow.simplified;
  const example = examples[word];
  const gloss = glosses[word];
  const csv = csvByWord.get(word);

  if (!example) {
    issue(blockers, "missing_example_config", `Missing example config for ${word}`, order);
    continue;
  }
  if (!gloss) issue(blockers, "missing_gloss_config", `Missing EN gloss for ${word}`, order);
  if (!csv) issue(blockers, "missing_workbook_row", `Missing workbook row for ${word}`, order);

  for (const field of ["example_zh", "example_pinyin", "example_en"]) {
    if (!example[field]) issue(blockers, "missing_example_field", `Missing ${field} for ${word}`, order);
  }

  if (!requiredSourceParts(word).every((part) => example.example_zh.includes(part))) {
    issue(blockers, "example_missing_source_word", `Example does not contain source word ${word}: ${example.example_zh}`, order);
  }
  if (!hasHan(example.example_zh)) issue(blockers, "example_zh_no_han", `Chinese example has no Han text for ${word}`, order);
  if (hasHan(example.example_pinyin)) issue(blockers, "example_pinyin_has_han", `Example pinyin contains Han for ${word}`, order);
  if (!hasLatin(example.example_pinyin)) issue(blockers, "example_pinyin_no_latin", `Example pinyin has no Latin text for ${word}`, order);
  if (hasToneNumber(example.example_pinyin)) issue(blockers, "example_pinyin_tone_number", `Example pinyin has tone numbers for ${word}`, order);
  if (hasHan(example.example_en)) issue(blockers, "example_en_has_han", `English example translation contains Han for ${word}`, order);
  if (/["“”]\s*[\p{Script=Han}]+\s*["“”]/u.test(example.example_zh)) {
    issue(blockers, "placeholder_quoted_source_word", `Example looks like a quoted-word placeholder for ${word}`, order);
  }
  if (/这个词|这个字|意思是/u.test(example.example_zh)) {
    issue(blockers, "definition_template_example", `Example looks like a definition template for ${word}: ${example.example_zh}`, order);
  }

  if (csv) {
    for (const [field, expected] of [
      ["example_zh", example.example_zh],
      ["example_pinyin", example.example_pinyin],
      ["EN", gloss],
      ["EN-GB", gloss],
      ["example_EN", example.example_en],
      ["example_EN-GB", example.example_en],
    ]) {
      if (csv[field] !== expected) issue(blockers, "workbook_chinese_layer_mismatch", `${field} mismatch for ${word}`, order);
    }
  }
}

for (const word of Object.keys(examples)) {
  if (!sourceRows.some((row) => row.simplified === word)) issue(blockers, "example_word_not_in_source", `Example config has non-source word ${word}`);
}
for (const word of Object.keys(glosses)) {
  if (!sourceRows.some((row) => row.simplified === word)) issue(blockers, "gloss_word_not_in_source", `Gloss config has non-source word ${word}`);
}

try {
  const buildReport = JSON.parse(
    await fs.readFile(path.join(ROOT, "outputs/hsk/qa/hsk3_level_1_300_v1_chinese_examples_build_20260604.json"), "utf8")
  );
  manualExamples = buildReport.manual_examples ?? 0;
  classicExamples = buildReport.classic_reuse_examples ?? 0;
  if (buildReport.blockers?.length) {
    issue(blockers, "chinese_examples_build_report_blocked", `Build report has ${buildReport.blockers.length} blockers`);
  }
} catch (error) {
  issue(warnings, "missing_chinese_examples_build_report", `Could not read build report: ${error.message}`);
}

const report = {
  release_id: RELEASE_ID,
  generated_at: new Date().toISOString(),
  status: blockers.length ? "blocked" : "ok",
  rows_checked: sourceRows.length,
  examples_checked: Object.keys(examples).length,
  glosses_checked: Object.keys(glosses).length,
  manual_examples: manualExamples,
  classic_reuse_examples: classicExamples,
  blockers,
  warnings,
  notes: [
    "This gate validates the HSK 3.0 Level 1 Chinese source example layer and EN/EN-GB pivot cells.",
    "It does not certify non-English target-language translation packs.",
    "It does not import Docker/Postgres rows or upload Google Sheets.",
  ],
};

await fs.mkdir(path.dirname(REPORT_JSON), { recursive: true });
await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(
  REPORT_MD,
  [
    `# ${RELEASE_ID} Chinese Gate`,
    "",
    `Status: ${report.status}`,
    `Rows checked: ${report.rows_checked}`,
    `Examples checked: ${report.examples_checked}`,
    `Glosses checked: ${report.glosses_checked}`,
    `Manual examples: ${report.manual_examples}`,
    `Classic reuse examples: ${report.classic_reuse_examples}`,
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
      examples_checked: report.examples_checked,
      glosses_checked: report.glosses_checked,
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
