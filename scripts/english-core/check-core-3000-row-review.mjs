#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const releaseId = args.get("release") ?? process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? "english_core_3000_a1_a2_part_001_150_v1";
const contractPath = path.resolve(args.get("contract") ?? "config/english-core-3000-source-contract-v0.json");
const filePath = path.resolve(args.get("file") ?? `outputs/english-core-3000/row-reviews/${releaseId}_row_review_v1.jsonl`);

const requiredReviewedFields = [
  "part_of_speech",
  "sense_no",
  "meaning_id",
  "en_display",
  "meaning_note",
  "semantic_scene",
  "example_EN",
  "example_status",
  "row_review_status",
  "row_review",
];

const unresolvedEvidenceBlockers = [
  "transcription_EN_missing",
  "example_transcription_EN_missing",
  "duplicate_reuse_review_pending",
  "translation_preflight_pending",
];

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function normalizeForContains(value) {
  return normalizeText(value)
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{Letter}\p{Number}']+/gu, " ")
    .trim();
}

async function readJsonl(file) {
  const text = await fs.readFile(file, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function main() {
  const contract = JSON.parse(await fs.readFile(contractPath, "utf8"));
  const rows = await readJsonl(filePath);
  const errors = [];
  const warnings = [];
  const meaningIds = new Set();

  if (rows.length !== contract.course.target_selected_rows) {
    errors.push(`row review rows=${rows.length}, expected ${contract.course.target_selected_rows}`);
  }

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    if (row.release_id !== releaseId) errors.push(`row ${rowNumber}: release_id mismatch`);
    if (row.source_language !== "EN") errors.push(`row ${rowNumber}: source_language must be EN`);
    if (row.source_variant !== "US English") errors.push(`row ${rowNumber}: source_variant must be US English`);
    if (row.generation_ready !== false) errors.push(`row ${rowNumber}: generation_ready must remain false`);
    if (!Array.isArray(row.blockers) || row.blockers.length === 0) errors.push(`row ${rowNumber}: blockers must remain non-empty before evidence gates`);

    if (meaningIds.has(row.meaning_id)) errors.push(`row ${rowNumber}: duplicate meaning_id ${row.meaning_id}`);
    meaningIds.add(row.meaning_id);

    if (row.row_review_status === "reviewed_needs_evidence") {
      for (const field of requiredReviewedFields) {
        if (!(field in row)) errors.push(`row ${rowNumber}: reviewed row missing ${field}`);
      }
      if (!normalizeText(row.example_EN)) errors.push(`row ${rowNumber}: reviewed row missing example_EN`);
      if (/Needs row review/i.test(row.meaning_note)) errors.push(`row ${rowNumber}: reviewed row still has generic meaning_note`);
      if (row.semantic_scene?.status !== "reviewed") errors.push(`row ${rowNumber}: reviewed row semantic_scene.status must be reviewed`);
      if (row.example_status !== "reviewed_us_english_example_needs_qa") {
        errors.push(`row ${rowNumber}: reviewed row example_status is ${row.example_status}`);
      }
      const exampleNorm = ` ${normalizeForContains(row.example_EN)} `;
      const headwordNorm = normalizeForContains(row.source_headword);
      if (headwordNorm && !exampleNorm.includes(` ${headwordNorm} `)) {
        errors.push(`row ${rowNumber}: example_EN does not visibly include source_headword ${row.source_headword}`);
      }
      for (const blocker of ["part_of_speech_review_pending", "meaning_note_needs_exact_sense", "semantic_scene_needs_review", "example_EN_missing"]) {
        if (row.blockers.includes(blocker)) errors.push(`row ${rowNumber}: reviewed row still has resolved blocker ${blocker}`);
      }
      for (const blocker of unresolvedEvidenceBlockers) {
        if (!row.blockers.includes(blocker)) errors.push(`row ${rowNumber}: reviewed row lost required evidence blocker ${blocker}`);
      }
    } else if (row.row_review_status === "needs_review") {
      if (normalizeText(row.example_EN)) errors.push(`row ${rowNumber}: unreviewed row should not have example_EN`);
    } else {
      errors.push(`row ${rowNumber}: unexpected row_review_status ${row.row_review_status}`);
    }
  }

  const reviewedRows = rows.filter((row) => row.row_review_status === "reviewed_needs_evidence").length;
  const functionRows = rows.filter((row) => row.function_word_flag).length;
  const reviewedFunctionRows = rows.filter((row) => row.function_word_flag && row.row_review_status === "reviewed_needs_evidence").length;
  if (reviewedRows === 0) warnings.push("no reviewed rows found");
  if (reviewedFunctionRows !== functionRows) {
    warnings.push(`reviewed_function_rows=${reviewedFunctionRows}, function_rows=${functionRows}`);
  }

  if (errors.length) {
    throw new Error(`English Core 3000 row review is not structurally ready:\n${errors.join("\n")}`);
  }

  console.log(
    `English Core 3000 row review OK for ${releaseId}: rows=${rows.length}, reviewed=${reviewedRows}, reviewed_function_rows=${reviewedFunctionRows}, generation_ready=0, file=${path.relative(process.cwd(), filePath)}`
  );
  for (const warning of warnings) console.log(`WARN ${warning}`);
}

await main();
