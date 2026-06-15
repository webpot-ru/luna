#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const inputPath = process.argv.slice(2).find((arg) => !arg.startsWith("--"));

if (!inputPath || process.argv.includes("--help") || process.argv.includes("-h")) {
  console.error("Usage: node scripts/check-course-metadata-native-style-results.mjs <gemini-results.jsonl>");
  process.exit(inputPath ? 0 : 1);
}

function parseJsonl(text) {
  const rows = [];
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch (error) {
      throw new Error(`Invalid JSON on line ${index + 1}: ${error.message}`);
    }
  }
  return rows;
}

function normalizeResult(value) {
  return String(value ?? "").trim().toLowerCase();
}

const rows = parseJsonl(await readFile(inputPath, "utf8"));
if (rows.length === 0) throw new Error(`No review rows found in ${inputPath}`);

const blockers = [];
const warnings = [];
const seen = new Set();
const allowedResults = new Set(["pass", "needs_review", "fail"]);

for (const [index, row] of rows.entries()) {
  const line = index + 1;
  const result = normalizeResult(row.result);
  const key = row.review_key ?? `${row.set_id ?? ""}::course_metadata::${row.language_code ?? ""}`;

  if (!row.review_key || typeof row.review_key !== "string") {
    blockers.push(`line ${line}: missing review_key`);
  }
  if (!row.set_id || typeof row.set_id !== "string") {
    blockers.push(`line ${line}: missing set_id`);
  }
  if (!row.language_code || typeof row.language_code !== "string") {
    blockers.push(`line ${line}: missing language_code`);
  }
  if (!allowedResults.has(result)) {
    blockers.push(`line ${line}: unsupported result ${JSON.stringify(row.result)}`);
  }
  if (!row.target_hash || typeof row.target_hash !== "string") {
    blockers.push(`line ${line}: missing target_hash`);
  }
  if (typeof row.result_summary !== "string" || row.result_summary.trim() === "") {
    blockers.push(`line ${line}: missing result_summary`);
  }
  if (!Array.isArray(row.issues)) {
    blockers.push(`line ${line}: issues must be an array`);
  }
  if (!row.suggested_repair || typeof row.suggested_repair !== "object") {
    blockers.push(`line ${line}: missing suggested_repair object`);
  }
  if (typeof row.confidence !== "number" || row.confidence < 0 || row.confidence > 1) {
    blockers.push(`line ${line}: confidence must be a number from 0 to 1`);
  }
  if (seen.has(key)) {
    blockers.push(`line ${line}: duplicate review key ${key}`);
  }
  seen.add(key);

  if (result === "fail") {
    blockers.push(`${key}: fail: ${row.result_summary ?? ""}`);
  } else if (result === "needs_review") {
    warnings.push(`${key}: needs_review: ${row.result_summary ?? ""}`);
  }
}

if (blockers.length > 0) {
  console.error(`Course Metadata native-style review failed: ${blockers.length} blocker(s), ${warnings.length} warning(s).`);
  for (const blocker of blockers.slice(0, 200)) console.error(`- ${blocker}`);
  if (blockers.length > 200) console.error(`... ${blockers.length - 200} more blocker(s)`);
  process.exit(1);
}

console.log(
  `Course Metadata native-style review OK: rows=${rows.length}, pass=${rows.filter((row) => normalizeResult(row.result) === "pass").length}, needs_review=${warnings.length}, fail=0.`
);
if (warnings.length > 0) {
  for (const warning of warnings.slice(0, 80)) console.log(`WARN ${warning}`);
  if (warnings.length > 80) console.log(`WARN ... ${warnings.length - 80} more warning(s)`);
}
