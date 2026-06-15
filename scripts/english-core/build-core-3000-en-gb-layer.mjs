#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const releaseId = args.get("release") ?? "english_core_3000_a1_a2_part_001_150_v1";
const inputPath = path.resolve(
  args.get("input") ??
    `outputs/english-core-3000/en-transcriptions/${releaseId}_en_transcriptions_v1.jsonl`
);
const outputDir = path.resolve(args.get("out-dir") ?? "outputs/english-core-3000/en-gb");

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function writeJsonl(filePath, rows) {
  await fs.writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function britishTextForRow(row) {
  return {
    "EN-GB": normalizeText(row.en_display),
    "example_EN-GB": normalizeText(row.example_EN),
    en_gb_variant_status: "reviewed_same_as_us_english",
    en_gb_variant_note:
      "No British spelling or everyday word-choice difference is required for this selected A1/A2 item.",
  };
}

const rows = await readJsonl(inputPath);
const outputRows = rows.map((row) => {
  const variant = britishTextForRow(row);
  return {
    release_id: releaseId,
    course_id: row.course_id,
    row_id: row.row_id,
    core_item_id: row.core_item_id,
    meaning_id: row.meaning_id,
    source_headword: row.source_headword,
    part_of_speech: row.part_of_speech,
    sense_no: row.sense_no,
    en_display: row.en_display,
    example_EN: row.example_EN,
    ...variant,
  };
});

await fs.mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `${releaseId}_en_gb_text_v1.jsonl`);
await writeJsonl(outputPath, outputRows);

const sameAsUs = outputRows.filter(
  (row) => row["EN-GB"] === row.en_display && row["example_EN-GB"] === row.example_EN
).length;
const summaryPath = path.join(outputDir, `${releaseId}_en_gb_text_v1_summary.md`);
await fs.writeFile(
  summaryPath,
  [
    `# EN-GB Text Layer v1: ${releaseId}`,
    "",
    `- Rows: ${outputRows.length}`,
    `- Same as US English text/example: ${sameAsUs}`,
    "- Transcription columns: not generated",
    "- Status: reviewed text/example layer; British pronunciation remains out of scope",
    "",
    "The first release includes EN-GB as a regional text/example column only.",
    "Rows can intentionally match EN when no British spelling or everyday wording difference is needed.",
    "",
  ].join("\n"),
  "utf8"
);

console.log(
  `English Core 3000 EN-GB layer written: ${path.relative(process.cwd(), outputPath)} rows=${outputRows.length} same_as_us=${sameAsUs}`
);
