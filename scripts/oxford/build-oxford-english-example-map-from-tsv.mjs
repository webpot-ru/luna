#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-22.v1";
const SENTENCE_END_RE = /[.!?]$/u;

function parseArgs(argv) {
  const args = {
    contract: "",
    rowReview: "",
    tsv: "",
    outDir: "outputs/oxford-vocabulary/examples",
    mapId: "english_examples_map_v1",
    label: "Oxford English Example Map",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--")) continue;
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    index += 1;
    if (key === "--contract") args.contract = value;
    else if (key === "--row-review") args.rowReview = value;
    else if (key === "--tsv") args.tsv = value;
    else if (key === "--out-dir") args.outDir = value;
    else if (key === "--map-id") args.mapId = value;
    else if (key === "--label") args.label = value;
    else throw new Error(`Unknown argument: ${key}`);
  }
  if (!args.contract) throw new Error("Missing --contract");
  if (!args.tsv) throw new Error("Missing --tsv");
  return args;
}

function normalizeText(value) {
  return String(value ?? "").replace(/\u00a0/gu, " ").replace(/\s+/gu, " ").trim();
}

function wordCount(sentence) {
  return (normalizeText(sentence).match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/gu) ?? []).length;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSONL at ${filePath}:${index + 1}: ${error.message}`);
      }
    });
}

async function writeJsonl(filePath, rows) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

async function readTsv(filePath) {
  const rows = [];
  const text = await readFile(filePath, "utf8");
  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    const line = rawLine.trimEnd();
    if (!line || line.startsWith("#")) continue;
    const [sourceHeadword, example, extra] = line.split("\t");
    if (!sourceHeadword || !example || extra !== undefined) {
      throw new Error(`Invalid TSV row ${index + 1}: ${rawLine}`);
    }
    rows.push({
      source_headword: normalizeText(sourceHeadword),
      example_EN: normalizeText(example),
    });
  }
  return rows;
}

function validateExamples(rowReviewRows, exampleMapRows) {
  const rowKeys = rowReviewRows.map((row) => row.source_headword);
  const rowKeySet = new Set(rowKeys);
  const exampleKeys = exampleMapRows.map((row) => row.source_headword);
  const exampleKeySet = new Set(exampleKeys);
  const missing = rowKeys.filter((key) => !exampleKeySet.has(key));
  const extra = exampleKeys.filter((key) => !rowKeySet.has(key));
  const duplicates = exampleKeys.filter((key, index) => exampleKeys.indexOf(key) !== index);
  const problems = [];
  if (missing.length) problems.push(`missing examples: ${missing.join(", ")}`);
  if (extra.length) problems.push(`unused examples: ${extra.join(", ")}`);
  if (duplicates.length) problems.push(`duplicate examples: ${[...new Set(duplicates)].join(", ")}`);
  for (const row of exampleMapRows) {
    if (!SENTENCE_END_RE.test(row.example_EN)) problems.push(`${row.source_headword}: missing punctuation`);
    const count = wordCount(row.example_EN);
    if (count > 10) problems.push(`${row.source_headword}: too long (${count} words)`);
    if (/\b(word|meaning)\s*:/iu.test(row.example_EN)) {
      problems.push(`${row.source_headword}: template-like example`);
    }
  }
  if (problems.length) {
    throw new Error(`English example map validation failed:\n${problems.join("\n")}`);
  }
}

function buildMapRows(rowReviewRows, exampleMapRows, generatedAt, args) {
  const bySourceHeadword = new Map(exampleMapRows.map((row) => [row.source_headword, row.example_EN]));
  return rowReviewRows.map((row) => {
    const example = bySourceHeadword.get(row.source_headword);
    return {
      release_id: row.release_id,
      course_id: row.course_id,
      row_id: row.row_id,
      source_headword: row.source_headword,
      reviewed_display_headword: row.reviewed_display_headword,
      reviewed_part_of_speech: row.reviewed_part_of_speech,
      meaning_id: row.meaning_id,
      example_EN: example,
      example_word_count: wordCount(example),
      example_source: "lunacards_authored_not_oxford",
      example_quality_status: "reviewed",
      example_map_rule_version: "oxford-reviewed-english-example-map-from-tsv-v1",
      source_tsv_path: args.tsv,
      script_path: "scripts/oxford/build-oxford-english-example-map-from-tsv.mjs",
      script_version: SCRIPT_VERSION,
      generated_at: generatedAt,
    };
  });
}

function updateContract(contract, mapPath, summaryPath, rows, args) {
  contract.latest_english_example_map = {
    map_id: args.mapId,
    status: "reviewed_lunacards_authored_source_map_ready",
    script_path: "scripts/oxford/build-oxford-english-example-map-from-tsv.mjs",
    script_version: SCRIPT_VERSION,
    source_tsv_path: args.tsv,
    path: mapPath,
    summary_path: summaryPath,
    rows: rows.length,
    max_word_count: Math.max(...rows.map((row) => row.example_word_count)),
    example_source: "lunacards_authored_not_oxford",
    copied_oxford_examples: false,
  };
  contract.next_stage_options = [
    "Build English examples and US/UK edition layer from the reviewed example map.",
    "Generate source-backed EN-US and EN-GB pronunciation artifacts.",
    "Generate support-language translations/examples in language-order batches.",
  ];
  contract.updated_at = new Date().toISOString();
  return contract;
}

const args = parseArgs(process.argv.slice(2));
const contract = await readJson(args.contract);
const rowReviewPath = args.rowReview || contract.latest_row_review?.path;
if (!rowReviewPath) throw new Error("No row-review path provided and contract.latest_row_review.path is empty");
const rowReviewRows = await readJsonl(rowReviewPath);
if (!rowReviewRows.length) throw new Error("Row review is empty");
const releaseId = rowReviewRows[0].release_id;
const badReleaseRows = rowReviewRows.filter((row) => row.release_id !== releaseId);
if (badReleaseRows.length) throw new Error("Row review contains mixed release ids");

const exampleMapRows = await readTsv(args.tsv);
validateExamples(rowReviewRows, exampleMapRows);
const generatedAt = new Date().toISOString();
const rows = buildMapRows(rowReviewRows, exampleMapRows, generatedAt, args);
const outPath = path.join(args.outDir, `${releaseId}_${args.mapId}.jsonl`);
const summaryPath = path.join(args.outDir, `${releaseId}_${args.mapId}_summary.md`);
await writeJsonl(outPath, rows);
await mkdir(path.dirname(summaryPath), { recursive: true });
await writeFile(
  summaryPath,
  [
    `# ${args.label}: ${releaseId}`,
    "",
    `- Script version: \`${SCRIPT_VERSION}\``,
    `- Source TSV: \`${args.tsv}\``,
    `- Row review source: \`${rowReviewPath}\``,
    `- Example map rows: ${rows.length}`,
    "- Example source: `lunacards_authored_not_oxford`",
    "- Example quality status: `reviewed`",
    `- Max word count: ${Math.max(...rows.map((row) => row.example_word_count))}`,
    "- Oxford examples copied: false",
    "- Google Sheet created: false",
    "- Postgres import: false",
    "",
    "This artifact is the reproducible reviewed English example map used by the generic Oxford English-layer builder.",
    "",
  ].join("\n"),
  "utf8"
);

const updatedContract = updateContract(contract, outPath, summaryPath, rows, args);
await writeFile(args.contract, `${JSON.stringify(updatedContract, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      release_id: releaseId,
      rows: rows.length,
      max_word_count: Math.max(...rows.map((row) => row.example_word_count)),
      path: outPath,
      summary_path: summaryPath,
      contract_updated: args.contract,
    },
    null,
    2
  )
);
