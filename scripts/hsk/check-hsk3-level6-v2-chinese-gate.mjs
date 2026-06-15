import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "hsk3_level_6_1800_v2";
const DATE = "20260612";
const EXPECTED_ROWS = 1800;
const START_ORDER = 3601;
const END_ORDER = 5400;
const LEGACY_RELEASE_ID = "hsk3_level_6_1400_v1";

const SOURCE_PATH = path.join(ROOT, "outputs/hsk/source/hsk3_level_6_1800_v2.source.json");
const REUSE_MAP_PATH = path.join(ROOT, "outputs/hsk/qa/hsk3_level_6_1800_v2_classic_reuse_map_20260612.json");
const EXAMPLES_PATH = path.join(ROOT, "config/hsk3-level6-v2-examples.json");
const GLOSSES_PATH = path.join(ROOT, "config/hsk3-level6-v2-en-glosses.json");
const MANUAL_TSV_PATH = path.join(ROOT, "config/hsk3-level6-v2-manual-examples.tsv");
const BUILD_REPORT_PATH = path.join(ROOT, "outputs/hsk/qa/hsk3_level_6_1800_v2_chinese_examples_build_20260612.json");
const REPORT_JSON = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_chinese_gate_${DATE}.json`);
const REPORT_MD = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_chinese_gate_${DATE}.md`);

const hanRegex = /\p{Script=Han}/u;
const latinRegex = /[A-Za-züÜ]/u;
const toneNumberRegex = /(?:[A-Za-züÜv:]+[1-5]\b|\b[1-5]\s*$)/u;
const toneMarkRegex = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/u;

function parseTsv(text) {
  const lines = text.trimEnd().split(/\r?\n/u).filter(Boolean);
  const headers = lines.shift()?.split("\t") ?? [];
  return lines.map((line, index) => {
    const values = line.split("\t");
    return {
      line_number: index + 2,
      row: Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex] ?? ""])),
    };
  });
}

function issue(list, code, message, row = null) {
  list.push({ code, message, row });
}

function requiredSourceParts(row) {
  return [row.simplified].filter(Boolean);
}

const [sourceRows, reuseMap, examples, glosses, manualTsv, buildReport] = await Promise.all([
  fs.readFile(SOURCE_PATH, "utf8").then(JSON.parse),
  fs.readFile(REUSE_MAP_PATH, "utf8").then(JSON.parse),
  fs.readFile(EXAMPLES_PATH, "utf8").then(JSON.parse),
  fs.readFile(GLOSSES_PATH, "utf8").then(JSON.parse),
  fs.readFile(MANUAL_TSV_PATH, "utf8"),
  fs.readFile(BUILD_REPORT_PATH, "utf8").then(JSON.parse),
]);

const blockers = [];
const warnings = [];
const sourceByKey = new Map(sourceRows.map((row) => [row.hsk_key ?? `${row.hsk_order}:${row.source_word}`, row]));
const reuseRows = Array.isArray(reuseMap.rows) ? reuseMap.rows : [];
const reuseByKey = new Map(reuseRows.map((row) => [`${row.hsk3_order}:${row.hsk3_source_word}`, row]));
const manualRows = parseTsv(manualTsv);
const manualKeys = new Set();
const manualExpectedKeys = new Set(
  reuseRows
    .filter((row) => row.hsk3_order > 5000 && !row.classic_reuse_allowed)
    .map((row) => `${row.hsk3_order}:${row.hsk3_source_word}`)
);

if (sourceRows.length !== EXPECTED_ROWS) issue(blockers, "source_row_count", `Expected ${EXPECTED_ROWS} source rows, found ${sourceRows.length}.`);
if (Object.keys(examples).length !== EXPECTED_ROWS) issue(blockers, "example_count", `Expected ${EXPECTED_ROWS} examples, found ${Object.keys(examples).length}.`);
if (Object.keys(glosses).length !== EXPECTED_ROWS) issue(blockers, "gloss_count", `Expected ${EXPECTED_ROWS} glosses, found ${Object.keys(glosses).length}.`);
if (reuseRows.length !== EXPECTED_ROWS) issue(blockers, "reuse_row_count", `Expected ${EXPECTED_ROWS} reuse rows, found ${reuseRows.length}.`);
if (manualRows.length !== manualExpectedKeys.size) {
  issue(blockers, "manual_tsv_row_count", `Expected ${manualExpectedKeys.size} manual TSV rows, found ${manualRows.length}.`);
}

for (const { line_number: lineNumber, row } of manualRows) {
  const key = row.hsk_key;
  const sourceRow = sourceByKey.get(key);
  if (!key) {
    issue(blockers, "manual_blank_hsk_key", "Manual TSV row has blank hsk_key.", lineNumber);
    continue;
  }
  if (manualKeys.has(key)) issue(blockers, "manual_duplicate_hsk_key", `Manual TSV duplicates ${key}.`, lineNumber);
  manualKeys.add(key);
  if (!sourceRow) {
    issue(blockers, "manual_key_not_in_source", `Manual TSV key is not in source: ${key}.`, lineNumber);
    continue;
  }
  if (!manualExpectedKeys.has(key)) {
    issue(blockers, "manual_key_not_expected", `Manual TSV key is not a blocked Level 6 v2 delta row: ${key}.`, lineNumber);
  }
  if (row.source_word !== sourceRow.source_word) {
    issue(blockers, "manual_source_word_mismatch", `Manual source_word mismatch for ${key}.`, lineNumber);
  }
  if (row.simplified !== sourceRow.simplified) {
    issue(blockers, "manual_simplified_mismatch", `Manual simplified mismatch for ${key}.`, lineNumber);
  }
}

for (const key of manualExpectedKeys) {
  if (!manualKeys.has(key)) issue(blockers, "manual_expected_key_missing", `Manual TSV is missing ${key}.`);
}

for (const sourceRow of sourceRows) {
  const key = sourceRow.hsk_key ?? `${sourceRow.hsk_order}:${sourceRow.source_word}`;
  const example = examples[key];
  const gloss = glosses[key];
  const reuse = reuseByKey.get(key);
  const provenance = buildReport.provenance?.find((row) => row.hsk_key === key);

  if (sourceRow.release_id !== RELEASE_ID) issue(blockers, "wrong_release_id", `Wrong release_id for ${key}: ${sourceRow.release_id}.`, sourceRow.hsk_order);
  if (sourceRow.hsk_level !== 6) issue(blockers, "wrong_hsk_level", `Wrong hsk_level for ${key}: ${sourceRow.hsk_level}.`, sourceRow.hsk_order);
  if (sourceRow.hsk_order < START_ORDER || sourceRow.hsk_order > END_ORDER) {
    issue(blockers, "source_order_out_of_range", `Source order out of range for ${key}.`, sourceRow.hsk_order);
  }
  if (sourceRow.hsk_key !== `${sourceRow.hsk_order}:${sourceRow.source_word}`) {
    issue(blockers, "bad_hsk_key", `Bad hsk_key for order ${sourceRow.hsk_order}: ${sourceRow.hsk_key}.`, sourceRow.hsk_order);
  }
  if (hanRegex.test(sourceRow.pinyin ?? "")) issue(blockers, "source_pinyin_has_han", `Source pinyin contains Han for ${key}.`, sourceRow.hsk_order);
  if (toneNumberRegex.test(sourceRow.pinyin ?? "")) issue(blockers, "source_pinyin_tone_number", `Source pinyin has tone numbers for ${key}.`, sourceRow.hsk_order);

  if (!example) {
    issue(blockers, "missing_example", `Missing example for ${key}.`, sourceRow.hsk_order);
    continue;
  }
  if (!gloss) issue(blockers, "missing_gloss", `Missing gloss for ${key}.`, sourceRow.hsk_order);
  if (!provenance) issue(blockers, "missing_provenance", `Missing build provenance for ${key}.`, sourceRow.hsk_order);

  for (const field of ["example_zh", "example_pinyin", "example_en"]) {
    if (!example[field]) issue(blockers, "missing_example_field", `Missing ${field} for ${key}.`, sourceRow.hsk_order);
  }
  if (!requiredSourceParts(sourceRow).every((part) => example.example_zh.includes(part))) {
    issue(blockers, "example_missing_source_word", `Example does not contain ${sourceRow.simplified}: ${example.example_zh}`, sourceRow.hsk_order);
  }
  if (!hanRegex.test(example.example_zh)) issue(blockers, "example_zh_no_han", `Chinese example has no Han for ${key}.`, sourceRow.hsk_order);
  if (hanRegex.test(example.example_pinyin)) issue(blockers, "example_pinyin_has_han", `Example pinyin contains Han for ${key}.`, sourceRow.hsk_order);
  if (!latinRegex.test(example.example_pinyin)) issue(blockers, "example_pinyin_no_latin", `Example pinyin has no Latin text for ${key}.`, sourceRow.hsk_order);
  if (toneNumberRegex.test(example.example_pinyin)) issue(blockers, "example_pinyin_tone_number", `Example pinyin has tone numbers for ${key}.`, sourceRow.hsk_order);
  if (!toneMarkRegex.test(example.example_pinyin)) issue(blockers, "example_pinyin_no_tone_marks", `Example pinyin has no tone marks for ${key}.`, sourceRow.hsk_order);
  if (hanRegex.test(example.example_en)) issue(blockers, "example_en_has_han", `English example contains Han for ${key}.`, sourceRow.hsk_order);
  if (/["“”]\s*[\p{Script=Han}]+\s*["“”]/u.test(example.example_zh)) {
    issue(blockers, "placeholder_quoted_source_word", `Example looks like quoted-word placeholder for ${key}.`, sourceRow.hsk_order);
  }
  if (/(?:这个词|这个字).*意思是|意思是/u.test(example.example_zh)) {
    issue(blockers, "definition_template_example", `Example looks like a definition template for ${key}: ${example.example_zh}`, sourceRow.hsk_order);
  }

  if (sourceRow.hsk_order <= 5000 && provenance?.source !== LEGACY_RELEASE_ID) {
    issue(blockers, "legacy_row_not_from_legacy_layer", `Legacy row ${key} was not copied from ${LEGACY_RELEASE_ID}.`, sourceRow.hsk_order);
  }
  if (sourceRow.hsk_order > 5000 && reuse?.classic_reuse_allowed && !String(provenance?.source ?? "").startsWith("classic_hsk")) {
    issue(blockers, "delta_reuse_allowed_not_classic", `Reusable delta row ${key} was not sourced from Classic reuse.`, sourceRow.hsk_order);
  }
  if (sourceRow.hsk_order > 5000 && !reuse?.classic_reuse_allowed && provenance?.source !== "hsk3_v2_manual") {
    issue(blockers, "blocked_delta_not_manual", `Blocked delta row is not manual: ${key}.`, sourceRow.hsk_order);
  }
}

for (const key of Object.keys(examples)) {
  if (!sourceByKey.has(key)) issue(blockers, "example_key_not_in_source", `Example key not in source: ${key}.`);
}
for (const key of Object.keys(glosses)) {
  if (!sourceByKey.has(key)) issue(blockers, "gloss_key_not_in_source", `Gloss key not in source: ${key}.`);
}

if (buildReport.status !== "ok") issue(blockers, "build_report_not_ok", `Chinese build report status is ${buildReport.status}.`);
if (buildReport.blockers?.length) issue(blockers, "build_report_blockers", `Chinese build report has ${buildReport.blockers.length} blockers.`);
if (buildReport.examples !== EXPECTED_ROWS || buildReport.glosses !== EXPECTED_ROWS) {
  issue(blockers, "build_report_count_mismatch", `Build report examples/glosses mismatch: ${buildReport.examples}/${buildReport.glosses}.`);
}
if (buildReport.legacy_examples !== 1400 || buildReport.manual_examples !== manualExpectedKeys.size || buildReport.classic_reuse_examples !== 219) {
  issue(
    blockers,
    "build_report_provenance_count_mismatch",
    `Build report provenance counts mismatch: legacy=${buildReport.legacy_examples}, manual=${buildReport.manual_examples}, classic=${buildReport.classic_reuse_examples}.`
  );
}

const report = {
  release_id: RELEASE_ID,
  generated_at: new Date().toISOString(),
  status: blockers.length ? "blocked" : "ok",
  rows_checked: sourceRows.length,
  examples_checked: Object.keys(examples).length,
  glosses_checked: Object.keys(glosses).length,
  legacy_examples: buildReport.legacy_examples ?? 0,
  manual_examples: buildReport.manual_examples ?? 0,
  classic_reuse_examples: buildReport.classic_reuse_examples ?? 0,
  manual_tsv_rows: manualRows.length,
  blockers,
  warnings,
  checked_files: {
    source: path.relative(ROOT, SOURCE_PATH),
    reuse_map: path.relative(ROOT, REUSE_MAP_PATH),
    examples: path.relative(ROOT, EXAMPLES_PATH),
    glosses: path.relative(ROOT, GLOSSES_PATH),
    manual_tsv: path.relative(ROOT, MANUAL_TSV_PATH),
    build_report: path.relative(ROOT, BUILD_REPORT_PATH),
  },
  notes: [
    "This gate validates the corrected HSK 3.0 Level 6 v2 Chinese source example layer and English pivot gloss/example text.",
    "It keeps the published hsk3_level_6_1400_v1 layer separate.",
    "It does not certify non-English target-language translation packs.",
    "It does not build a workbook, import Docker/Postgres rows or upload Google Sheets.",
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
    `Legacy examples: ${report.legacy_examples}`,
    `Manual examples: ${report.manual_examples}`,
    `Classic reuse examples: ${report.classic_reuse_examples}`,
    `Manual TSV rows: ${report.manual_tsv_rows}`,
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
      legacy_examples: report.legacy_examples,
      manual_examples: report.manual_examples,
      classic_reuse_examples: report.classic_reuse_examples,
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
