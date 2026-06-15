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
const filePath = path.resolve(args.get("file") ?? `outputs/english-core-3000/en-transcriptions/${releaseId}_en_transcriptions_v1.jsonl`);

const ipaPattern = /^\/[^/]+\/$/u;
const requiredEvidenceSources = new Set([
  "ipa-focused-english-us-cmudict-dict",
  "ipa-focused-english-us-cmudict-phones",
  "ipa-focused-english-us-cmudict-symbols",
]);

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
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

  if (rows.length !== contract.course.target_selected_rows) {
    errors.push(`EN transcription rows=${rows.length}, expected ${contract.course.target_selected_rows}`);
  }

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    if (row.release_id !== releaseId) errors.push(`row ${rowNumber}: release_id mismatch`);
    if (row.source_language !== "EN") errors.push(`row ${rowNumber}: source_language must be EN`);
    if (row.source_variant !== "US English") errors.push(`row ${rowNumber}: source_variant must be US English`);
    if (row.generation_ready !== false) errors.push(`row ${rowNumber}: generation_ready must remain false`);
    if (!normalizeText(row.en_display)) errors.push(`row ${rowNumber}: missing en_display`);
    if (!normalizeText(row.example_EN)) errors.push(`row ${rowNumber}: missing example_EN`);
    if (!ipaPattern.test(row.transcription_EN ?? "")) errors.push(`row ${rowNumber}: transcription_EN is not slash-wrapped IPA`);
    if (!ipaPattern.test(row.example_transcription_EN ?? "")) {
      errors.push(`row ${rowNumber}: example_transcription_EN is not slash-wrapped IPA`);
    }
    if (row.transcription_status !== "source_backed_cmudict_component_exact") {
      errors.push(`row ${rowNumber}: unexpected transcription_status ${row.transcription_status}`);
    }
    if (row.example_transcription_status !== "source_backed_cmudict_component_exact") {
      errors.push(`row ${rowNumber}: unexpected example_transcription_status ${row.example_transcription_status}`);
    }
    if (row.blockers?.includes("transcription_EN_missing")) {
      errors.push(`row ${rowNumber}: transcription_EN_missing blocker still present`);
    }
    if (row.blockers?.includes("example_transcription_EN_missing")) {
      errors.push(`row ${rowNumber}: example_transcription_EN_missing blocker still present`);
    }
    const review = row.en_transcription_review;
    if (review?.status !== "source_backed_needs_final_qa") {
      errors.push(`row ${rowNumber}: missing source-backed transcription review`);
    }
    for (const sourceId of requiredEvidenceSources) {
      if (!review?.source_ids?.includes(sourceId)) {
        errors.push(`row ${rowNumber}: source evidence missing ${sourceId}`);
      }
    }
    if (!Array.isArray(review?.display_evidence) || review.display_evidence.length === 0) {
      errors.push(`row ${rowNumber}: display_evidence missing`);
    }
    if (!Array.isArray(review?.example_evidence) || review.example_evidence.length === 0) {
      errors.push(`row ${rowNumber}: example_evidence missing`);
    }
    for (const evidence of [...(review?.display_evidence ?? []), ...(review?.example_evidence ?? [])]) {
      if (!evidence.token || !evidence.arpabet || !evidence.ipa || evidence.source_id !== "ipa-focused-english-us-cmudict-dict") {
        errors.push(`row ${rowNumber}: malformed CMU evidence`);
      }
    }
  }

  const filledWords = rows.filter((row) => normalizeText(row.transcription_EN)).length;
  const filledExamples = rows.filter((row) => normalizeText(row.example_transcription_EN)).length;
  if (errors.length) {
    throw new Error(`English Core 3000 EN transcriptions are not structurally ready:\n${errors.join("\n")}`);
  }

  console.log(
    `English Core 3000 EN transcriptions OK for ${releaseId}: rows=${rows.length}, transcription_EN=${filledWords}, example_transcription_EN=${filledExamples}, generation_ready=0, file=${path.relative(process.cwd(), filePath)}`
  );
}

await main();
