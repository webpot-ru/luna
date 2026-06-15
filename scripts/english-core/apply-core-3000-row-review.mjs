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
const basePath = path.resolve(args.get("base") ?? `outputs/english-core-3000/base-drafts/${releaseId}_base_draft.jsonl`);
const overridesPath = path.resolve(args.get("overrides") ?? "config/english-core-3000-row-review-overrides-v0.json");
const outputDir = path.resolve(args.get("out-dir") ?? "outputs/english-core-3000/row-reviews");

const resolvedRowBlockers = new Set([
  "part_of_speech_review_pending",
  "meaning_note_needs_exact_sense",
  "semantic_scene_needs_review",
  "example_EN_missing",
]);

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
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

function applyOverride(row, override) {
  const semanticScene = {
    rule_version: "english-core-row-review-v0",
    ...override.semantic_scene,
    status: "reviewed",
  };
  const existingBlockers = Array.isArray(row.blockers) ? row.blockers : [];
  const blockers = existingBlockers.filter((blocker) => !resolvedRowBlockers.has(blocker));

  return {
    ...row,
    part_of_speech: override.part_of_speech,
    sense_no: override.sense_no,
    meaning_id: override.meaning_id,
    source_status: "row_reviewed_needs_evidence",
    en_display: override.en_display,
    meaning_note: override.meaning_note,
    semantic_scene: semanticScene,
    example_EN: override.example_EN,
    example_status: "reviewed_us_english_example_needs_qa",
    row_review_status: "reviewed_needs_evidence",
    generation_ready: false,
    blockers,
    row_review: {
      status: "reviewed_needs_evidence",
      reviewed_fields: [
        "part_of_speech",
        "sense_no",
        "meaning_id",
        "meaning_note",
        "semantic_scene",
        "example_EN",
      ],
      review_source: "config/english-core-3000-row-review-overrides-v0.json",
      review_method: "internal_curation_ai_assisted_original_content",
      still_required_before_generation: blockers,
    },
  };
}

async function main() {
  const baseRows = await readJsonl(basePath);
  const overrides = JSON.parse(await fs.readFile(overridesPath, "utf8"));
  if (overrides.release_id !== releaseId) {
    throw new Error(`Override release_id ${overrides.release_id} does not match ${releaseId}.`);
  }
  if (overrides.approved_for_generation !== false) {
    throw new Error("Row review overrides must not approve generation.");
  }

  const byCoreItemId = new Map();
  for (const override of overrides.reviewed_rows ?? []) {
    if (!normalizeText(override.core_item_id)) throw new Error("Override row missing core_item_id.");
    if (byCoreItemId.has(override.core_item_id)) throw new Error(`Duplicate override for ${override.core_item_id}.`);
    byCoreItemId.set(override.core_item_id, override);
  }

  const seenBaseCoreIds = new Set(baseRows.map((row) => row.core_item_id));
  for (const coreItemId of byCoreItemId.keys()) {
    if (!seenBaseCoreIds.has(coreItemId)) throw new Error(`Override core_item_id not found in base draft: ${coreItemId}`);
  }

  const rows = baseRows.map((row) => {
    const override = byCoreItemId.get(row.core_item_id);
    return override ? applyOverride(row, override) : row;
  });

  const reviewedRows = rows.filter((row) => row.row_review_status === "reviewed_needs_evidence");
  const unreviewedRows = rows.length - reviewedRows.length;

  await fs.mkdir(outputDir, { recursive: true });
  const outPath = path.join(outputDir, `${releaseId}_row_review_v0.jsonl`);
  const summaryPath = path.join(outputDir, `${releaseId}_row_review_v0_summary.md`);
  await writeJsonl(outPath, rows);
  await fs.writeFile(
    summaryPath,
    [
      `# Row Review v0: ${releaseId}`,
      "",
      `- Rows: ${rows.length}`,
      `- Reviewed rows: ${reviewedRows.length}`,
      `- Unreviewed rows: ${unreviewedRows}`,
      `- Generation ready: 0`,
      `- Review scope: ${overrides.review_scope?.selection ?? "not specified"}`,
      "",
      "Reviewed rows have LunaCards-owned POS/sense, meaning notes, semantic scenes and US English examples.",
      "They still require source-backed English word/example transcription, duplicate/reuse review, translation preflight and final QA before generation.",
      "",
      "## Reviewed Core Items",
      "",
      ...reviewedRows.map((row) => `- ${row.core_item_id}: ${row.source_headword} -> ${row.meaning_id}`),
      "",
    ].join("\n"),
    "utf8"
  );

  console.log(
    `English Core 3000 row review written: ${path.relative(process.cwd(), outPath)} rows=${rows.length} reviewed=${reviewedRows.length} generation_ready=0`
  );
}

await main();
