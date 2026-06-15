import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./qa-utils.mjs";

export const candidatePoolRequiredFields = [
  "canonical_english",
  "part_of_speech",
  "domain",
  "level",
  "cefr",
  "frequency_band",
  "priority_band",
  "include_rule_matched",
  "exclude_rule_hit",
  "duplicate_risk",
  "existing_meaning_id",
  "source_support",
  "translation_coverage_risk",
  "example_feasibility",
  "score",
  "decision",
  "decision_note",
];

export const candidatePoolStrictSelectedFields = [
  "scope_decision",
  "duplicate_reuse_decision",
  "compound_multiword_risk",
  "translation_risk",
  "required_qa_profile",
];

const allowedDecisions = new Set(["selected", "backup", "excluded"]);
const emptyish = new Set(["", "none", "n/a", "na", "null"]);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function candidatePoolPathForSetId(setId) {
  return path.join(projectRoot, "outputs/candidate-pools", `${setId}_candidate_pool.jsonl`);
}

export function candidatePoolSummaryPathForSetId(setId) {
  return path.join(projectRoot, "outputs/candidate-pools", `${setId}_candidate_pool_summary.md`);
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function normalizedKey(value) {
  return normalizeText(value).toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, " ").trim();
}

function isBlank(value) {
  return emptyish.has(normalizeText(value).toLowerCase());
}

function fieldValue(row, field) {
  if (field === "translation_risk") return row.translation_risk ?? row.translation_coverage_risk;
  if (field === "translation_coverage_risk") return row.translation_coverage_risk ?? row.translation_risk;
  return row[field];
}

export function readCandidateRowsSync(filePath) {
  const content = readFileSync(filePath, "utf8");
  if (path.extname(filePath).toLowerCase() === ".jsonl") {
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
  return parseCsv(content);
}

export async function readCandidateRows(filePath) {
  const content = await readFile(filePath, "utf8");
  if (path.extname(filePath).toLowerCase() === ".jsonl") {
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
  return parseCsv(content);
}

export function parseTargetRange(value) {
  const match = String(value ?? "").match(/\b(\d+)\s*-\s*(\d+)\b/);
  if (!match) return null;
  return { min: Number(match[1]), max: Number(match[2]) };
}

export function validateCandidatePoolRows(rows, spec) {
  const errors = [];
  const targetRange = parseTargetRange(spec.targetRange);
  const setId = spec.setId;

  if (!targetRange) {
    errors.push("candidate pool cannot validate because spec target range is missing");
    return errors;
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    errors.push(`candidate pool is empty for ${setId}`);
    return errors;
  }

  const minPoolSize = targetRange.max * 2;
  const hasPoolSizeException = rows.some((row) => !isBlank(row.pool_size_exception_reason));
  if (rows.length < minPoolSize && !hasPoolSizeException) {
    errors.push(
      `candidate pool has ${rows.length} row(s), expected at least ${minPoolSize} (2x target max=${targetRange.max}) or pool_size_exception_reason`
    );
  }

  const selectedRows = rows.filter((row) => normalizeText(row.decision) === "selected");
  const strictSelectedContract = spec.status === "approved_for_generation";
  if (selectedRows.length < targetRange.min || selectedRows.length > targetRange.max) {
    errors.push(
      `selected candidate count ${selectedRows.length} must fit target range ${targetRange.min}-${targetRange.max}`
    );
  }

  const selectedCanonicalKeys = new Map();
  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    for (const field of candidatePoolRequiredFields) {
      if (field === "translation_coverage_risk" && ("translation_risk" in row || "translation_coverage_risk" in row)) continue;
      if (!(field in row)) errors.push(`row ${rowNumber}: missing field ${field}`);
    }

    const decision = normalizeText(row.decision);
    if (!allowedDecisions.has(decision)) errors.push(`row ${rowNumber}: invalid decision=${decision || "missing"}`);
    if (isBlank(row.decision_note)) errors.push(`row ${rowNumber}: decision_note is required`);

    const score = Number(row.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      errors.push(`row ${rowNumber}: score must be a number from 0 to 100`);
    }

    if (decision === "selected") {
      if (strictSelectedContract) {
        for (const field of candidatePoolStrictSelectedFields) {
          if (normalizeText(fieldValue(row, field)) === "") {
            errors.push(`row ${rowNumber}: approved_for_generation selected row needs ${field}`);
          }
        }
      }
      if (isBlank(row.include_rule_matched)) errors.push(`row ${rowNumber}: selected row needs include_rule_matched`);
      if (!isBlank(row.exclude_rule_hit)) errors.push(`row ${rowNumber}: selected row has exclude_rule_hit=${row.exclude_rule_hit}`);
      if (isBlank(row.source_support)) errors.push(`row ${rowNumber}: source_support is required`);
      if (isBlank(fieldValue(row, "translation_coverage_risk"))) errors.push(`row ${rowNumber}: translation_coverage_risk is required`);
      if (isBlank(row.example_feasibility)) errors.push(`row ${rowNumber}: example_feasibility is required`);

      const duplicateRisk = normalizeText(row.duplicate_risk).toLowerCase();
      const existingMeaningId = normalizeText(row.existing_meaning_id);
      if (existingMeaningId && duplicateRisk !== "explicit_reuse") {
        errors.push(`row ${rowNumber}: existing_meaning_id requires duplicate_risk=explicit_reuse`);
      }
      if (duplicateRisk && !["none", "explicit_reuse"].includes(duplicateRisk)) {
        errors.push(`row ${rowNumber}: selected row has unresolved duplicate_risk=${row.duplicate_risk}`);
      }
      if (duplicateRisk === "explicit_reuse" && !existingMeaningId) {
        errors.push(`row ${rowNumber}: duplicate_risk=explicit_reuse requires existing_meaning_id`);
      }

      const canonicalKey = normalizedKey(row.canonical_english);
      if (selectedCanonicalKeys.has(canonicalKey)) {
        errors.push(`row ${rowNumber}: duplicate selected canonical_english also appears on row ${selectedCanonicalKeys.get(canonicalKey)}`);
      } else {
        selectedCanonicalKeys.set(canonicalKey, rowNumber);
      }
    }

    if (decision === "excluded" && isBlank(row.move_target)) {
      errors.push(`row ${rowNumber}: excluded row requires move_target`);
    }
  }

  return errors;
}

export function summarizeCandidatePool(rows, spec) {
  const counts = {};
  for (const row of rows) counts[row.decision] = (counts[row.decision] ?? 0) + 1;
  return {
    set_id: spec.setId,
    rows: rows.length,
    target_range: spec.targetRange,
    decision_counts: counts,
    selected: counts.selected ?? 0,
    backup: counts.backup ?? 0,
    excluded: counts.excluded ?? 0,
  };
}

export async function writeCandidatePoolOutputs({ rows, setId, summary }) {
  const poolPath = candidatePoolPathForSetId(setId);
  const summaryPath = candidatePoolSummaryPathForSetId(setId);
  await mkdir(path.dirname(poolPath), { recursive: true });
  await writeFile(poolPath, rows.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");
  await writeFile(
    summaryPath,
    [
      `# Candidate Pool: ${setId}`,
      "",
      `- Rows: ${summary.rows}`,
      `- Target range: ${summary.target_range}`,
      `- Selected: ${summary.selected}`,
      `- Backup: ${summary.backup}`,
      `- Excluded: ${summary.excluded}`,
      "",
      "This file is generated from the candidate-pool compiler. The JSONL pool is the validation source.",
      "",
    ].join("\n"),
    "utf8"
  );
  return { poolPath, summaryPath };
}

export function candidatePoolExists(setId) {
  return existsSync(candidatePoolPathForSetId(setId));
}
