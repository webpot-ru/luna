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
const outputPath = path.join(outputDir, "Home_Kitchen_Cookware_Pilot_01_review.xlsx");

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
    mu.plural_form_en,
    coalesce(et.example_text, e.canonical_example_en) as example_en,
    mu.level,
    mu.frequency_band,
    mu.priority_band,
    mu.default_domain,
    mu.default_area,
    mu.default_category,
    mu.countability,
    mu.semantic_class,
    mu.quality_status,
    ''::text as qa_decision,
    ''::text as qa_comment
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  left join meaning_examples e
    on e.meaning_id = mu.meaning_id
    and e.set_id = msm.set_id
    and e.example_role = 'context'
  left join meaning_example_translations et
    on et.example_id = e.example_id
    and et.language_code = 'EN'
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
    ["FlashcardsLuna pilot review"],
    ["Set ID", setId],
    ["Scope", "Home / Kitchen / Cookware, Utensils & Tableware"],
    ["Rows", rowCount],
    ["Purpose", "Review English (US) canonical base before translating to 54 active language variants."],
    ["QA source", "docs/qa-process.md"],
    ["Gate rule", "generated is not approved"],
    ["How to review", "Use the Review sheet. Fill qa_decision and qa_comment."],
    ["Allowed decisions", "approve | revise | move_category | remove | discuss"],
    ["Do not translate yet", "Translations start only after this English (US) base is accepted."],
  ]);
}

function addReviewSheet(workbook, rows) {
  const sheet = workbook.worksheets.add("Review");
  const headers = [
    "display_order",
    "meaning_id",
    "english_with_article",
    "canonical_english",
    "meaning_note",
    "plural_form_en",
    "example_en",
    "level",
    "frequency_band",
    "priority_band",
    "domain",
    "area",
    "category",
    "countability",
    "semantic_class",
    "quality_status",
    "qa_decision",
    "qa_comment",
  ];

  const values = rows.map((row) => [
    row.display_order,
    row.meaning_id,
    row.english_with_article,
    row.canonical_english,
    row.meaning_note,
    row.plural_form_en,
    row.example_en,
    row.level,
    row.frequency_band,
    row.priority_band,
    row.default_domain,
    row.default_area,
    row.default_category,
    row.countability,
    row.semantic_class,
    row.quality_status,
    row.qa_decision,
    row.qa_comment,
  ]);

  setValues(sheet, 1, 0, [headers, ...values]);
}

function addChecklist(workbook) {
  const sheet = workbook.worksheets.add("QA Checklist");
  setValues(sheet, 1, 0, [
    ["Check", "Question"],
    ["Structural DB QA", "Did scripts/db-qa-pilot.sh pass without failed ERROR checks?"],
    ["Category fit", "Does this item belong in Cookware, Utensils & Tableware?"],
    ["Duplicate risk", "Is this too close to another item in the same set?"],
    ["Meaning clarity", "Does meaning_note prevent wrong translation?"],
    ["POS metadata", "Are part of speech, countability, and plural_form_en correct?"],
    ["Article", "Is a/an/a pair of correct for English?"],
    ["Example control", "Is the example short, simple, natural, and easy to translate?"],
    ["Translation readiness", "Can translators preserve the same object/action/situation?"],
    ["Status", "Do not treat generated as approved before manual review."],
    ["Possible actions", "approve | revise | move_category | remove | discuss"],
  ]);
}

const rows = await fetchPilotRows();
if (rows.length !== 50) {
  throw new Error(`Expected 50 pilot rows for ${setId}, got ${rows.length}`);
}

const workbook = Workbook.create();
addReadme(workbook, rows.length);
addReviewSheet(workbook, rows);
addChecklist(workbook);

const reviewInspect = await workbook.inspect({
  kind: "table",
  range: "Review!A1:R12",
  include: "values",
  tableMaxRows: 12,
  tableMaxCols: 18,
});
console.log(reviewInspect.ndjson);

const errorScan = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(errorScan.ndjson);

await workbook.render({ sheetName: "Review", range: "A1:R18", scale: 1 });
await workbook.render({ sheetName: "README", range: "A1:B10", scale: 1 });
await workbook.render({ sheetName: "QA Checklist", range: "A1:B11", scale: 1 });

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

console.log(outputPath);
