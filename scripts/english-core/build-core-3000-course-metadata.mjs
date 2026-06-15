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
const metadataPath = path.resolve(
  args.get("metadata") ?? "config/english-core-3000-course-metadata-v0.json"
);
const languageOrderPath = path.resolve(args.get("languages") ?? "config/language-order.json");
const outputDir = path.resolve(args.get("out-dir") ?? "outputs/english-core-3000/course-metadata");

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

const [metadataConfig, languageOrder] = await Promise.all([
  fs.readFile(metadataPath, "utf8").then(JSON.parse),
  fs.readFile(languageOrderPath, "utf8").then(JSON.parse),
]);

if (metadataConfig.release_id !== releaseId) {
  throw new Error(`Metadata release_id mismatch: ${metadataConfig.release_id} !== ${releaseId}.`);
}

const rows = languageOrder.map((language, index) => {
  const item = metadataConfig.metadata?.[language.spreadsheetCode];
  if (!item) throw new Error(`Missing Course Metadata for ${language.spreadsheetCode}.`);
  return {
    release_id: releaseId,
    order: index + 1,
    spreadsheet_code: language.spreadsheetCode,
    db_code: language.dbCode,
    language: language.language,
    title: normalizeText(item.Title),
    description: normalizeText(item.Description),
    level_signal: normalizeText(item.level_signal),
    metadata_status: metadataConfig.status,
  };
});

await fs.mkdir(outputDir, { recursive: true });
const jsonPath = path.join(outputDir, `${releaseId}_course_metadata_v0.json`);
await fs.writeFile(
  jsonPath,
  `${JSON.stringify(
    {
      release_id: releaseId,
      metadata_version: metadataConfig.metadata_version,
      status: metadataConfig.status,
      title_limit: metadataConfig.title_limit,
      description_limit: metadataConfig.description_limit,
      rows,
    },
    null,
    2
  )}\n`,
  "utf8"
);

const sheetPreviewPath = path.join(outputDir, `${releaseId}_course_metadata_sheet_preview.tsv`);
const codes = languageOrder.map((language) => language.spreadsheetCode);
const byCode = new Map(rows.map((row) => [row.spreadsheet_code, row]));
await fs.writeFile(
  sheetPreviewPath,
  [
    ["", ...codes].join("\t"),
    ["Title", ...codes.map((code) => byCode.get(code)?.title ?? "")].join("\t"),
    ["Description", ...codes.map((code) => byCode.get(code)?.description ?? "")].join("\t"),
    "",
  ].join("\n"),
  "utf8"
);

const summaryPath = path.join(outputDir, `${releaseId}_course_metadata_v0_summary.md`);
await fs.writeFile(
  summaryPath,
  [
    `# Course Metadata v0: ${releaseId}`,
    "",
    `- Rows/languages: ${rows.length}`,
    `- Status: ${metadataConfig.status}`,
    `- Title limit: ${metadataConfig.title_limit}`,
    `- Description limit: ${metadataConfig.description_limit}`,
    `- JSON: ${path.relative(process.cwd(), jsonPath)}`,
    `- Sheet preview: ${path.relative(process.cwd(), sheetPreviewPath)}`,
    "",
    "This artifact prepares the `Course Metadata` sheet only. It does not generate vocabulary translations, import Postgres rows or create a Google Sheet.",
    "",
  ].join("\n"),
  "utf8"
);

console.log(
  `English Core 3000 Course Metadata written: ${path.relative(process.cwd(), jsonPath)} rows=${rows.length}`
);
