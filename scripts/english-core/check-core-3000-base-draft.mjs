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
const filePath = path.resolve(args.get("file") ?? `outputs/english-core-3000/base-drafts/${releaseId}_base_draft.jsonl`);

const requiredFields = [
  "release_id",
  "course_id",
  "row_id",
  "core_item_id",
  "source_candidate_id",
  "meaning_id",
  "source_language",
  "source_variant",
  "source_headword",
  "part_of_speech",
  "core_band",
  "level_min",
  "level_max",
  "source_rank",
  "source_status",
  "en_display",
  "article_policy_status",
  "meaning_note",
  "semantic_scene",
  "example_status",
  "transcription_status",
  "example_transcription_status",
  "row_review_status",
  "generation_ready",
  "blockers",
];

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function isNoun(pos) {
  return /\bnoun\b/i.test(pos);
}

function isVerb(pos) {
  return /\bverb\b/i.test(pos) || /^(be|do|have)-verb$/i.test(pos);
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
    errors.push(`base draft rows=${rows.length}, expected ${contract.course.target_selected_rows}`);
  }

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    for (const field of requiredFields) {
      if (!(field in row)) errors.push(`row ${rowNumber}: missing field ${field}`);
    }
    if (row.release_id !== releaseId) errors.push(`row ${rowNumber}: release_id mismatch`);
    if (row.source_language !== "EN") errors.push(`row ${rowNumber}: source_language must be EN`);
    if (row.source_variant !== "US English") errors.push(`row ${rowNumber}: source_variant must be US English`);
    if (row.generation_ready !== false) errors.push(`row ${rowNumber}: generation_ready must remain false`);
    if (!Array.isArray(row.blockers) || row.blockers.length === 0) errors.push(`row ${rowNumber}: blockers must be non-empty`);
    if (normalizeText(row.example_EN)) errors.push(`row ${rowNumber}: example_EN should be blank in skeleton draft`);
    if (normalizeText(row.transcription_EN)) errors.push(`row ${rowNumber}: transcription_EN should be blank until source-backed review`);
    if (normalizeText(row.example_transcription_EN)) errors.push(`row ${rowNumber}: example_transcription_EN should be blank until source-backed review`);

    if (meaningIds.has(row.meaning_id)) errors.push(`row ${rowNumber}: duplicate meaning_id ${row.meaning_id}`);
    meaningIds.add(row.meaning_id);

    if (isNoun(row.part_of_speech) && row.article_policy_status !== "needs_countability_review_before_a_an") {
      errors.push(`row ${rowNumber}: noun article_policy_status must require countability review`);
    }
    if (isVerb(row.part_of_speech) && !/^to /i.test(row.en_display)) {
      errors.push(`row ${rowNumber}: verb en_display should start with to: ${row.en_display}`);
    }
    if (row.semantic_scene?.status !== "needs_review") {
      errors.push(`row ${rowNumber}: semantic_scene.status must be needs_review`);
    }
  }

  const functionRows = rows.filter((row) => row.function_word_flag).length;
  if (functionRows > (contract.candidate_pool_contract.first_release_function_word_selected_limit ?? 30)) {
    errors.push(`function_word rows=${functionRows} exceeds first release cap`);
  }
  if (functionRows === 0) warnings.push("base draft has no function-word rows; check candidate pool policy");

  if (errors.length) {
    throw new Error(`English Core 3000 base draft is not structurally ready:\n${errors.join("\n")}`);
  }

  console.log(
    `English Core 3000 base draft OK for ${releaseId}: rows=${rows.length}, function_rows=${functionRows}, generation_ready=0, file=${path.relative(process.cwd(), filePath)}`
  );
  for (const warning of warnings) console.log(`WARN ${warning}`);
}

await main();
