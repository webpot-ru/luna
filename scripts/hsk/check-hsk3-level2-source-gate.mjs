import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATE = "20260604";
const RELEASE_ID = "hsk3_level_2_200_v1";
const SOURCE_PATH = path.join(ROOT, "outputs/hsk/source/hsk3_level_2_200_v1.source.json");
const PDF_PATH = path.join(ROOT, "outputs/hsk/source/hsk3_official_syllabus_vocab_chars_grammar_202511_202607.pdf");
const OVERLAP_PATH = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_classic_overlap_${DATE}.json`);
const REPORT_JSON = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_source_gate_${DATE}.json`);
const REPORT_MD = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_source_gate_${DATE}.md`);

const hanRegex = /\p{Script=Han}/u;
const toneNumberRegex = /[A-Za-züÜvV:][1-5]\b/u;
const htmlEntityRegex = /&(?:[a-zA-Z]+|#[0-9]+|#x[0-9a-fA-F]+);/u;

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function pushIssue(list, code, message, row = null) {
  list.push({ code, message, row });
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    const value = row[key] ?? "";
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

const blockers = [];
const warnings = [];

let rows = [];
let overlap = null;

try {
  const pdf = await fs.readFile(PDF_PATH);
  if (!pdf.subarray(0, 4).equals(Buffer.from("%PDF"))) {
    pushIssue(blockers, "official_pdf_not_pdf", `Official PDF snapshot does not start with %PDF: ${PDF_PATH}`);
  }
} catch (error) {
  pushIssue(blockers, "official_pdf_missing", `Official PDF snapshot is missing or unreadable: ${PDF_PATH} (${error.message})`);
}

try {
  rows = await readJson(SOURCE_PATH);
  if (!Array.isArray(rows)) {
    pushIssue(blockers, "source_not_array", `Source snapshot must be a JSON array: ${SOURCE_PATH}`);
    rows = [];
  }
} catch (error) {
  pushIssue(blockers, "source_unreadable", `Source snapshot is missing or unreadable: ${SOURCE_PATH} (${error.message})`);
}

if (rows.length !== 200) {
  pushIssue(blockers, "source_row_count", `Expected 200 HSK3.0 Level 2 rows, found ${rows.length}.`);
}

const duplicateSimplified = Object.entries(countBy(rows, "simplified")).filter(([value, count]) => value && count > 1);
if (duplicateSimplified.length) {
  const unsafeDuplicates = duplicateSimplified.filter(([value]) => {
    const duplicateRows = rows.filter((row) => row.simplified === value);
    const uniqueHskKey = new Set(duplicateRows.map((row) => row.hsk_key)).size === duplicateRows.length;
    const sourceWordDisambiguated = new Set(duplicateRows.map((row) => row.source_word)).size === duplicateRows.length;
    const pinyinDisambiguated = new Set(duplicateRows.map((row) => row.pinyin)).size === duplicateRows.length;
    const posDisambiguated = new Set(duplicateRows.map((row) => row.pos)).size === duplicateRows.length;
    return !uniqueHskKey || !(sourceWordDisambiguated || pinyinDisambiguated || posDisambiguated);
  });
  if (unsafeDuplicates.length) {
    pushIssue(
      blockers,
      "duplicate_simplified_without_source_word_disambiguation",
      `Duplicate simplified rows are not safely source_word-disambiguated: ${unsafeDuplicates.map(([value, count]) => `${value} x${count}`).join(", ")}`
    );
  } else {
    pushIssue(
      warnings,
      "duplicate_simplified_source_word_disambiguated",
      `Official Level 2 contains disambiguated duplicate simplified rows: ${duplicateSimplified.map(([value, count]) => `${value} x${count}`).join(", ")}`
    );
  }
}

for (const [index, row] of rows.entries()) {
  const expectedOrder = 301 + index;
  if (row.release_id !== RELEASE_ID) {
    pushIssue(blockers, "wrong_release_id", `Expected ${RELEASE_ID}, found ${row.release_id}.`, expectedOrder);
  }
  if (row.hsk_version !== "HSK 3.0") {
    pushIssue(blockers, "wrong_hsk_version", `Expected HSK 3.0, found ${row.hsk_version}.`, expectedOrder);
  }
  if (row.hsk_level !== 2) {
    pushIssue(blockers, "wrong_hsk_level", `Expected hsk_level 2, found ${row.hsk_level}.`, expectedOrder);
  }
  if (row.hsk_order !== expectedOrder) {
    pushIssue(blockers, "bad_hsk_order", `Expected hsk_order ${expectedOrder}, found ${row.hsk_order}.`, expectedOrder);
  }
  for (const field of ["source_word", "simplified", "pinyin"]) {
    if (!row[field]) {
      pushIssue(blockers, "missing_core_field", `Missing ${field}.`, expectedOrder);
    }
  }
  if (row.hsk_key !== `${row.hsk_order}:${row.source_word}`) {
    pushIssue(blockers, "bad_hsk_key", `Expected hsk_key ${row.hsk_order}:${row.source_word}, found ${row.hsk_key}.`, expectedOrder);
  }
  if (String(row.release_id ?? "").includes("hsk2_classic")) {
    pushIssue(blockers, "classic_release_leak", `Source row release_id leaks Classic contour: ${row.release_id}.`, expectedOrder);
  }
  if (hanRegex.test(row.pinyin ?? "")) {
    pushIssue(blockers, "han_in_pinyin", `Pinyin contains Han characters: ${row.pinyin}.`, expectedOrder);
  }
  if (toneNumberRegex.test(row.pinyin ?? "")) {
    pushIssue(blockers, "tone_number_pinyin", `Pinyin contains tone-number notation: ${row.pinyin}.`, expectedOrder);
  }
  if (htmlEntityRegex.test(row.pinyin ?? "") || htmlEntityRegex.test(row.source_word ?? "")) {
    pushIssue(blockers, "html_entity_artifact", "Source row contains an HTML entity artifact.", expectedOrder);
  }
  const localPdfPath = row.source?.local_pdf_path;
  if (localPdfPath !== "outputs/hsk/source/hsk3_official_syllabus_vocab_chars_grammar_202511_202607.pdf") {
    pushIssue(blockers, "wrong_local_pdf_path", `Unexpected local PDF path: ${localPdfPath}.`, expectedOrder);
  }
}

try {
  overlap = await readJson(OVERLAP_PATH);
} catch (error) {
  pushIssue(blockers, "overlap_unreadable", `Overlap report is missing or unreadable: ${OVERLAP_PATH} (${error.message})`);
}

if (overlap) {
  const overlapRows = Array.isArray(overlap.rows) ? overlap.rows : [];
  if (overlap.summary?.release_id !== RELEASE_ID) {
    pushIssue(blockers, "overlap_wrong_release_id", `Overlap release_id mismatch: ${overlap.summary?.release_id}`);
  }
  if (overlapRows.length !== rows.length) {
    pushIssue(blockers, "overlap_row_count", `Expected overlap rows to match source rows (${rows.length}), found ${overlapRows.length}.`);
  }
  const typeCounts = countBy(overlapRows, "overlap_type");
  if ((typeCounts.exact_classic_word ?? 0) !== overlap.summary?.exact_classic_word_rows) {
    pushIssue(blockers, "overlap_exact_count_mismatch", "Overlap exact count mismatch.");
  }
  if ((typeCounts.absent_as_exact_classic_word ?? 0) !== overlap.summary?.absent_as_exact_classic_word_rows) {
    pushIssue(blockers, "overlap_absent_count_mismatch", "Overlap absent count mismatch.");
  }
  for (const row of overlapRows) {
    if (!["exact_classic_word", "absent_as_exact_classic_word"].includes(row.overlap_type)) {
      pushIssue(blockers, "unknown_overlap_type", `Unknown overlap type ${row.overlap_type}.`, row.hsk3_order);
    }
    if (row.overlap_type === "exact_classic_word" && !row.classic_matches?.length) {
      pushIssue(blockers, "exact_overlap_without_match", "Exact overlap row has no Classic match.", row.hsk3_order);
    }
    if (row.overlap_type === "absent_as_exact_classic_word" && row.classic_matches?.length) {
      pushIssue(blockers, "absent_overlap_with_match", "Absent overlap row unexpectedly has Classic matches.", row.hsk3_order);
    }
  }
  const strictPinyinDifferenceRows = overlapRows.filter((row) => (row.classic_matches ?? []).some((match) => match.pinyin_same === false));
  if (strictPinyinDifferenceRows.length) {
    pushIssue(
      warnings,
      "strict_pinyin_difference_before_reuse",
      `${strictPinyinDifferenceRows.length} exact-word overlap rows have strict pinyin-string differences and need row-level check before Classic reuse.`
    );
  }
}

const summary = {
  release_id: RELEASE_ID,
  status: blockers.length ? "blocked" : "ok",
  source_rows: rows.length,
  blockers: blockers.length,
  warnings: warnings.length,
  exact_classic_word_rows: overlap?.summary?.exact_classic_word_rows ?? null,
  absent_as_exact_classic_word_rows: overlap?.summary?.absent_as_exact_classic_word_rows ?? null,
};

const report = {
  summary,
  blockers,
  warnings,
  checked_files: {
    source: path.relative(ROOT, SOURCE_PATH),
    official_pdf: path.relative(ROOT, PDF_PATH),
    overlap: path.relative(ROOT, OVERLAP_PATH),
  },
};

await fs.mkdir(path.dirname(REPORT_JSON), { recursive: true });
await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(
  REPORT_MD,
  [
    `# ${RELEASE_ID} Source Gate`,
    "",
    `Status: ${summary.status}`,
    `Source rows: ${summary.source_rows}`,
    `Blockers: ${summary.blockers}`,
    `Warnings: ${summary.warnings}`,
    `Exact Classic word rows: ${summary.exact_classic_word_rows}`,
    `Absent as exact Classic word rows: ${summary.absent_as_exact_classic_word_rows}`,
    "",
    "This gate validates only the HSK 3.0 Level 2 source layer and exact Classic overlap report. It does not build a workbook, import Docker/Postgres rows or upload Google Sheets.",
    "",
    ...blockers.map((issue) => `- BLOCKER ${issue.code}${issue.row ? ` row ${issue.row}` : ""}: ${issue.message}`),
    ...warnings.map((issue) => `- WARNING ${issue.code}: ${issue.message}`),
    "",
  ].join("\n")
);

console.log(JSON.stringify(summary, null, 2));

if (blockers.length) {
  process.exitCode = 1;
}
