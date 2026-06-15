import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const execFileAsync = promisify(execFile);

const setId = process.argv[2] ?? "home_kitchen_cookware_pilot_01";
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://lunacards:lunacards@127.0.0.1:55433/lunacards";

const outputDir = path.resolve("outputs/review");
const outputPath = path.join(outputDir, "Home_Kitchen_Cookware_Pilot_01_RU_review.xlsx");

if (!/^[a-z0-9_]+$/.test(setId)) {
  throw new Error(`Unsafe set_id: ${setId}`);
}

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

async function fetchPilotRows() {
  const sql = `
with review_rows as (
  select
    msm.display_order,
    mu.meaning_id,
    mu.english_with_article,
    mu.canonical_english,
    mu.meaning_note,
    coalesce(et_en.example_text, e.canonical_example_en) as example_en,
    le_ru.word_with_article_or_marker as ru_word,
    le_ru.native_word as ru_native_word,
    le_ru.gender as ru_gender,
    le_ru.grammatical_number as ru_grammatical_number,
    le_ru.transcription as ru_transcription,
    et_ru.example_text as ru_example,
    le_ru.quality_status as ru_entry_status,
    et_ru.quality_status as ru_example_status,
    le_ru.usage_note as ru_usage_note,
    ''::text as qa_decision,
    ''::text as qa_comment
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_examples e
    on e.meaning_id = mu.meaning_id
    and e.set_id = msm.set_id
    and e.example_role = 'context'
  left join meaning_example_translations et_en
    on et_en.example_id = e.example_id
    and et_en.language_code = 'EN'
  join meaning_language_entries le_ru
    on le_ru.meaning_id = mu.meaning_id
    and le_ru.language_code = 'RU'
  join meaning_example_translations et_ru
    on et_ru.example_id = e.example_id
    and et_ru.language_code = 'RU'
  where msm.set_id = '${setId}'
    and msm.quality_status <> 'blocked'
  order by msm.display_order
)
select coalesce(json_agg(review_rows), '[]'::json)
from review_rows;
`;

  const { stdout } = await execFileAsync(
    "psql",
    [databaseUrl, "-v", "ON_ERROR_STOP=1", "-tA", "-c", sql],
    { maxBuffer: 1024 * 1024 * 10 }
  );

  return JSON.parse(stdout.trim() || "[]");
}

function addReadme(workbook, rowCount) {
  const sheet = workbook.worksheets.add("README");
  setValues(sheet, 1, 0, [
    ["FlashcardsLuna RU pilot review"],
    ["Set ID", setId],
    ["Scope", "Home / Kitchen / Cookware, Utensils & Tableware"],
    ["Rows", rowCount],
    ["Language", "RU / Russian"],
    ["Purpose", "Review Russian first-target-language layer before scaling to more languages."],
    ["QA source", "docs/qa-process.md"],
    ["Gate rule", "generated is not approved"],
    ["How to review", "Use the Review RU sheet. Fill qa_decision and qa_comment."],
    ["Allowed decisions", "approve | revise | move_category | remove | discuss"],
  ]);
}

function addReviewSheet(workbook, rows) {
  const sheet = workbook.worksheets.add("Review RU");
  const headers = [
    "display_order",
    "meaning_id",
    "english_with_article",
    "canonical_english",
    "meaning_note",
    "example_en",
    "RU",
    "RU native_word",
    "RU gender",
    "RU number",
    "RU transcription",
    "RU example",
    "RU entry status",
    "RU example status",
    "RU usage note",
    "qa_decision",
    "qa_comment",
  ];

  const values = rows.map((row) => [
    row.display_order,
    row.meaning_id,
    row.english_with_article,
    row.canonical_english,
    row.meaning_note,
    row.example_en,
    row.ru_word,
    row.ru_native_word,
    row.ru_gender,
    row.ru_grammatical_number,
    row.ru_transcription,
    row.ru_example,
    row.ru_entry_status,
    row.ru_example_status,
    row.ru_usage_note,
    row.qa_decision,
    row.qa_comment,
  ]);

  setValues(sheet, 1, 0, [headers, ...values]);
}

function addChecklist(workbook) {
  const sheet = workbook.worksheets.add("QA Checklist");
  setValues(sheet, 1, 0, [
    ["Check", "Question"],
    ["Coverage", "Are there 50 Russian entries and 50 Russian examples?"],
    ["Meaning", "Does RU translate the meaning_note, not just the English surface word?"],
    ["Context", "Does RU example preserve the same object/location/state as EN?"],
    ["Naturalness", "Is the Russian example simple and natural enough for a learner?"],
    ["Articles", "Russian should not have artificial article_or_marker."],
    ["Gender/number", "Are RU gender and grammatical_number useful and correct?"],
    ["Transcription", "Does RU transcription match the displayed RU word?"],
    ["Status", "Do not treat generated as approved before manual review."],
    ["Possible actions", "approve | revise | move_category | remove | discuss"],
  ]);
}

const rows = await fetchPilotRows();
if (rows.length !== 50) {
  throw new Error(`Expected 50 RU pilot rows for ${setId}, got ${rows.length}`);
}

const workbook = Workbook.create();
addReadme(workbook, rows.length);
addReviewSheet(workbook, rows);
addChecklist(workbook);

const reviewInspect = await workbook.inspect({
  kind: "table",
  range: "Review RU!A1:Q12",
  include: "values",
  tableMaxRows: 12,
  tableMaxCols: 17,
});
console.log(reviewInspect.ndjson);

const errorScan = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(errorScan.ndjson);

await workbook.render({ sheetName: "Review RU", range: "A1:Q18", scale: 1 });
await workbook.render({ sheetName: "README", range: "A1:B10", scale: 1 });
await workbook.render({ sheetName: "QA Checklist", range: "A1:B10", scale: 1 });

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

console.log(outputPath);
