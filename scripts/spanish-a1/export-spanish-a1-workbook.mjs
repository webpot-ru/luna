#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const ROOT = process.cwd();

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const contractPath = path.resolve(args.get("contract") ?? "config/spanish-a1-core-release-contract-v1.json");
const languageOrderPath = path.resolve(args.get("languages") ?? "config/language-order.json");
const outputDir = path.resolve(args.get("out-dir") ?? "outputs/spanish-a1-core/source-drafts");

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
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

function addSheet(workbook, name, rows) {
  const sheet = workbook.worksheets.add(name);
  setValues(sheet, 1, 0, rows);
  return sheet;
}

function asSheetRows(records, headers) {
  return [headers, ...records.map((record) => headers.map((header) => record[header] ?? ""))];
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${path.relative(ROOT, filePath)}:${index + 1}: ${error.message}`);
      }
    });
}

function workbookFileName(releaseId) {
  if (releaseId !== "spanish_a1_core_part_001_300_v1") {
    return `FlashcardsLuna_${releaseId}_source_draft.xlsx`;
  }
  return "FlashcardsLuna_Spanish_A1_Core_Part_001_source_draft.xlsx";
}

function languageColumns(languageOrder) {
  return languageOrder.map((language) => language.spreadsheetCode);
}

function buildSupportCells(row, codes, prefix = "") {
  return codes.map((code) => {
    if (prefix === "example_") {
      if (code === "ES") return row.example_ES;
      if (code === "ES-419") return row.example_ES_419;
      return "";
    }
    if (code === "ES") return row.display_ES;
    if (code === "ES-419") return row.display_ES_419;
    return "";
  });
}

const [contract, languageOrder] = await Promise.all([readJson(contractPath), readJson(languageOrderPath)]);
if (!String(contract.contract_id ?? "").startsWith("spanish_a1_core_release_contract_v1")) {
  throw new Error(`Unexpected contract_id: ${contract.contract_id}`);
}
if (contract.approved_for_generation !== false) {
  throw new Error("Spanish A1 source-draft exporter expects approved_for_generation=false.");
}

const releaseId = args.get("release") ?? contract.default_release.release_id;
const expectedRows = Number(contract.default_release.expected_row_count);
const candidatePoolPath = path.resolve(
  args.get("candidate-pool") ?? `outputs/spanish-a1-core/candidate-pools/${releaseId}_candidate_pool.jsonl`
);
const workbookPath = path.join(outputDir, workbookFileName(releaseId));
const manifestPath = workbookPath.replace(/\.xlsx$/i, "_manifest.json");
const rows = (await readJsonl(candidatePoolPath)).filter((row) => row.selection_decision === "selected");
if (rows.length !== expectedRows) {
  throw new Error(`Expected ${expectedRows} selected rows, got ${rows.length}.`);
}

const codes = languageColumns(languageOrder);
if (codes.length !== Number(contract.course.target_language_column_count)) {
  throw new Error(`Language order has ${codes.length} rows, contract expects ${contract.course.target_language_column_count}.`);
}
for (const required of ["ES", "ES-419"]) {
  if (!codes.includes(required)) throw new Error(`Language order is missing ${required}.`);
}

const fixedColumns = contract.row_identity.required_source_fields;
const translationColumns = codes;
const exampleColumns = codes.map((code) => `example_${code}`);
const extraColumns = ["selection_decision", "selection_order"];
const headers = [...fixedColumns, ...translationColumns, ...exampleColumns, ...extraColumns];
const sourceLookupInfo = contract.latest_source_lookup ?? {};
const sourceReviewInfo = contract.latest_source_advisory_review ?? {};
const sourceCandidateGateStatus =
  sourceReviewInfo.status === "pass"
    ? "source_lookup_advisory_review_pass_source_partial"
    : sourceLookupInfo.status
      ? `source_lookup_${sourceLookupInfo.status}_review_needed`
      : "pending_row_level_source_review";

const sortedRows = rows.sort((a, b) => Number(a.selection_order) - Number(b.selection_order));
const mainRows = sortedRows.map((row) => [
  ...fixedColumns.map((column) => row[column] ?? ""),
  ...buildSupportCells(row, codes),
  ...buildSupportCells(row, codes, "example_"),
  row.selection_decision ?? "",
  row.selection_order ?? "",
]);

const workbook = Workbook.create();
const mainSheetName = contract.workbook.main_sheet_name;
addSheet(workbook, mainSheetName, [headers, ...mainRows]);

addSheet(workbook, "Course Metadata", [
  ["Field", "Value"],
  ["Course", contract.course.product_safe_working_title],
  ["Release ID", releaseId],
  ["Course ID", contract.default_release.course_id],
  ["CEFR", contract.default_release.cefr_level],
  ["Source language", contract.course.source_language_code],
  ["Source variant", contract.course.source_variant],
  ["Regional variant", `${contract.course.regional_variant_code} ${contract.course.regional_variant_label}`],
  ["Rows", String(rows.length)],
  ["Status", contract.status],
  ["Final delivery ready", String(contract.workbook.final_delivery_ready)],
]);

addSheet(workbook, "README", [
  ["Field", "Value"],
  ["Workbook type", "Spanish A1 source draft"],
  ["Final workbook", "false"],
  ["Google Sheet created", "false"],
  ["Postgres import", "false"],
  ["Support-language status", "Only ES and ES-419 are filled in this draft; other language columns are intentionally blank until support-language generation."],
  ["Source lookup status", sourceLookupInfo.status ?? "not_run"],
  ["Source advisory review status", sourceReviewInfo.status ?? "not_run"],
  ["Benchmark posture", "PCIC/DELE/SIELE are benchmark-only and are not copied as row source data."],
  ["Gemini policy", contract.ai_tool_policy.gemini_role],
  ["Transcription policy", contract.field_rules.source_transcription],
]);

addSheet(workbook, "Languages", asSheetRows(languageOrder, ["spreadsheetCode", "dbCode", "language", "transcriptionFormat"]));

addSheet(workbook, "Source Contract", [
  ["Field", "Value"],
  ["contract_id", contract.contract_id],
  ["status", contract.status],
  ["approved_for_generation", String(contract.approved_for_generation)],
  ["postgres_import", String(contract.workbook.postgres_import)],
  ["ordinary_deck_sort", String(contract.workbook.ordinary_deck_sort)],
  ["target_language_order_source", contract.course.target_language_order_source],
  ["target_language_column_count", String(contract.course.target_language_column_count)],
  ["candidate_pool", path.relative(ROOT, candidatePoolPath)],
  ["latest_source_lookup", sourceLookupInfo.path ?? ""],
  ["latest_source_advisory_review", sourceReviewInfo.path ?? ""],
]);

addSheet(
  workbook,
  "Benchmark Audit",
  [
    ["id", "name", "role", "url"],
    ...contract.source_policy.benchmark_only_sources.map((source) => [
      source.id,
      source.name,
      source.role,
      source.url,
    ]),
    ["no-copy", "Blocked source uses", contract.source_policy.blocked_without_permission_or_review.join("; "), ""],
  ]
);

addSheet(
  workbook,
  "Candidate Pool",
  asSheetRows(
    sortedRows,
    [
      "selection_order",
      "row_id",
      "spanish_item_id",
      "meaning_id",
      "display_ES",
      "display_ES_419",
      "part_of_speech",
      "gender",
      "article_ES",
      "article_ES_419",
      "meaning_note",
      "semantic_scene",
      "topic_domain",
      "source_status",
      "qa_status",
    ]
  )
);

addSheet(workbook, "Source Assisted QA", [
  ["Gate", "Status"],
  ["source_contract_gate", "passed_by_release_gate"],
  ["benchmark_no_copy_gate", "passed_by_release_gate"],
  ["candidate_pool_gate", "passed_by_release_gate"],
  ["spanish_source_candidate_gate", sourceCandidateGateStatus],
  ["spanish_article_gender_gate", "candidate_shape_checked"],
  ["spanish_morphology_gate", sourceReviewInfo.status === "pass" ? "unimorph_advisories_reviewed_source_partial" : "candidate_shape_checked"],
  ["support_language_source_preflight", "not_started"],
]);

const regionalRows = sortedRows
  .filter((row) => row.display_ES !== row.display_ES_419 || row.example_ES !== row.example_ES_419 || row.article_ES !== row.article_ES_419)
  .map((row) => ({
    selection_order: row.selection_order,
    display_ES: row.display_ES,
    display_ES_419: row.display_ES_419,
    example_ES: row.example_ES,
    example_ES_419: row.example_ES_419,
    article_ES: row.article_ES,
    article_ES_419: row.article_ES_419,
    qa_status: "regional_variant_pending_source_review",
  }));
addSheet(
  workbook,
  "Regional Variant QA",
  asSheetRows(regionalRows, [
    "selection_order",
    "display_ES",
    "display_ES_419",
    "example_ES",
    "example_ES_419",
    "article_ES",
    "article_ES_419",
    "qa_status",
  ])
);

addSheet(workbook, "Translation QA", [
  ["Field", "Value"],
  ["Support languages generated", "false"],
  ["Filled support display columns", "ES, ES-419 only"],
  ["Filled support example columns", "example_ES, example_ES-419 only"],
  ["Target-language transcription", contract.field_rules.support_language_transcription],
  ["Next gate", "support_language_source_preflight"],
]);

addSheet(
  workbook,
  "Sources",
  [
    ["source_id", "role", "confidence", "local_path"],
    ...contract.source_policy.local_candidate_sources.map((source) => [
      source.source_id,
      source.role,
      source.confidence,
      source.local_path,
    ]),
    ...contract.source_policy.external_frequency_references.map((source) => [
      source.id,
      source.role,
      "external_reference_only",
      source.url,
    ]),
  ]
);

const lastMainColumn = colName(headers.length - 1);
const previewRows = Math.min(mainRows.length + 1, 8);
const mainInspect = await workbook.inspect({
  kind: "table",
  range: `${mainSheetName}!A1:${lastMainColumn}${previewRows}`,
  include: "values",
  tableMaxRows: previewRows,
  tableMaxCols: Math.min(headers.length, 24),
});
console.log(mainInspect.ndjson);

const errorScan = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(errorScan.ndjson);

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(workbookPath);
const workbookBytes = await fs.readFile(workbookPath);
const workbookSha256 = createHash("sha256").update(workbookBytes).digest("hex");
const manifest = {
  release_id: releaseId,
  workbook_type: "source_draft",
  workbook_path: path.relative(ROOT, workbookPath),
  workbook_file: path.basename(workbookPath),
  workbook_sha256: workbookSha256,
  generated_at: new Date().toISOString(),
  rows: rows.length,
  language_columns: codes.length,
  main_sheet: mainSheetName,
  service_sheets: contract.workbook.service_sheets,
  support_languages_generated: false,
  google_sheet_created: false,
  postgres_changes: false,
  candidate_pool: path.relative(ROOT, candidatePoolPath),
  source_lookup: sourceLookupInfo.path ?? null,
  source_advisory_review: sourceReviewInfo.path ?? null,
};
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(
  `Spanish A1 source draft workbook exported: ${path.relative(ROOT, workbookPath)} rows=${rows.length} languages=${codes.length} sha256=${workbookSha256}`
);
