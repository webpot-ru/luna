#!/usr/bin/env node
import {
  psqlExec,
  readRows,
  sqlJson,
  sqlNullableString,
  sqlString,
} from "./lib/qa-utils.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run");

if (!inputPath) {
  throw new Error("Usage: node scripts/import-final-linguistic-audit-results.mjs <results.jsonl|csv> [--dry-run]");
}

const allowedResults = new Set(["pass", "needs_review", "fail"]);

function requireText(row, field, line) {
  const value = row[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Line ${line}: ${field} is required`);
  }
  return value.trim();
}

function normalizedResult(value) {
  return String(value ?? "").trim().toLowerCase();
}

function parseJsonField(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  return JSON.parse(value);
}

function buildEvidence(row) {
  const issues = parseJsonField(row.issues, []);
  const rowEvidence = parseJsonField(row.evidence, {});
  return {
    importer: "import-final-linguistic-audit-results",
    input_file: inputPath,
    result: normalizedResult(row.result),
    issues: Array.isArray(issues) ? issues : [issues],
    confidence: row.confidence === undefined || row.confidence === "" ? null : Number(row.confidence),
    audit_evidence: rowEvidence && typeof rowEvidence === "object" ? rowEvidence : { raw: rowEvidence },
  };
}

const rows = await readRows(inputPath);
if (rows.length === 0) throw new Error(`No final linguistic audit rows found in ${inputPath}`);

const statements = ["begin;"];
let passCount = 0;
let reviewCount = 0;

for (const [index, row] of rows.entries()) {
  const line = index + 2;
  const targetType = requireText(row, "target_type", line);
  const targetKey = requireText(row, "target_key", line);
  const languageCode = requireText(row, "language_code", line);
  const reviewer = requireText(row, "reviewer", line);
  const passId = requireText(row, "pass_id", line);
  const checkFamily = requireText(row, "check_family", line);
  const resultSummary = requireText(row, "result_summary", line);
  const result = normalizedResult(row.result);
  const batchId = row.batch_id ?? "";
  const sourceNote = row.source_note ?? "";

  if (targetType !== "export") {
    throw new Error(`Line ${line}: final_linguistic_audit target_type must be export`);
  }
  if (checkFamily !== "final_linguistic_audit") {
    throw new Error(`Line ${line}: check_family must be final_linguistic_audit`);
  }
  if (!passId.startsWith("final_linguistic_audit_")) {
    throw new Error(`Line ${line}: pass_id must start with final_linguistic_audit_`);
  }
  if (!allowedResults.has(result)) {
    throw new Error(`Line ${line}: result must be pass, needs_review or fail`);
  }
  if (!/^[-A-Z0-9]+$/.test(languageCode)) {
    throw new Error(`Line ${line}: invalid language_code=${languageCode}`);
  }
  if (!targetKey.endsWith(`::${languageCode}`)) {
    throw new Error(`Line ${line}: target_key must end with ::${languageCode}`);
  }

  const reviewStatus = result === "pass" ? "generated_checked" : "needs_review";
  const evidence = buildEvidence(row);

  statements.push(`
insert into qa_reviews (
  target_type,
  target_key,
  language_code,
  review_status,
  issue_type,
  notes,
  reviewer,
  reviewed_at,
  pass_id,
  batch_id,
  check_family,
  result_summary,
  source_note,
  evidence
) values (
  ${sqlString(targetType)},
  ${sqlString(targetKey)},
  ${sqlString(languageCode)},
  ${sqlString(reviewStatus)},
  'final_linguistic_audit',
  ${sqlString(resultSummary)},
  ${sqlString(reviewer)},
  now(),
  ${sqlString(passId)},
  ${sqlNullableString(batchId)},
  'final_linguistic_audit',
  ${sqlString(resultSummary)},
  ${sqlNullableString(sourceNote)},
  ${sqlJson(evidence)}
);
`);

  if (result === "pass") passCount += 1;
  else reviewCount += 1;
}

statements.push(dryRun ? "rollback;" : "commit;");

await psqlExec(statements.join("\n"));

console.log(
  `${dryRun ? "Validated" : "Imported"} final linguistic audit results: pass=${passCount}, needs_review_or_fail=${reviewCount}`
);
