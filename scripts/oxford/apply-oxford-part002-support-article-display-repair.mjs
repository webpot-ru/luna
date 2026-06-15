#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultContractPath = "config/oxford_3000_core_a1_part_002_300_v1_contract_v0.json";
const repairId = "support_article_display_repair_v1";
const scriptVersion = "2026-05-19.v1";
const targetLanguages = ["ES", "FR", "DE", "IT", "PT", "NL", "SV", "NO", "DA", "RO", "ES-419", "PT-BR"];
const articleDisplayPolicy =
  "English headwords stay Oxford-style lemmas. Support-language noun displays use natural articles/gender markers for article languages; languages without articles are not changed.";

const overrides = new Map([
  [
    "020",
    new Map([
      ["ES", "el coste; costar"],
      ["FR", "le coût; coûter"],
      ["DE", "die Kosten; kosten"],
      ["IT", "il costo; costare"],
      ["PT", "o custo; custar"],
      ["SV", "en kostnad; kosta"],
      ["ES-419", "el costo; costar"],
      ["PT-BR", "o custo; custar"],
    ]),
  ],
  [
    "032",
    new Map([
      ["ES", "el papá"],
      ["FR", "le papa"],
      ["IT", "il papà"],
      ["RO", "un tată"],
      ["ES-419", "el papá"],
    ]),
  ],
]);

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function relative(filePath) {
  return path.relative(projectRoot, path.resolve(projectRoot, filePath));
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  return (await readFile(filePath, "utf8"))
    .split(/\n/u)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

async function writeJson(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function writeJsonl(filePath, rows) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function repairedBatchPath(batchPath) {
  if (batchPath.includes("_article_display_v2.jsonl")) return batchPath;
  return batchPath.replace("_v1.jsonl", "_article_display_v2.jsonl");
}

function repairedSummaryPath(summaryPath) {
  if (summaryPath.includes("_article_display_v2_summary.md")) return summaryPath;
  return summaryPath.replace("_v1_summary.md", "_article_display_v2_summary.md");
}

function repairedBatchId(batchId) {
  if (batchId.includes("_article_display_v2")) return batchId;
  return batchId.replace("_v1", "_article_display_v2");
}

function rowSuffix(rowId) {
  return String(rowId).split("::").pop();
}

const contractPath = argValue("contract", defaultContractPath);
const contract = await readJson(contractPath);
const releaseId = contract.latest_source_snapshot?.release_id;
if (releaseId !== "oxford_3000_core_a1_part_002_300_v1") {
  throw new Error(`This Part 002 repair script received unexpected release_id=${releaseId}`);
}

const generatedAt = new Date().toISOString();
const changedBatches = [];
const changesByLanguage = {};
let displayCellsChanged = 0;

for (const batch of contract.latest_support_translation_batches ?? []) {
  const affectedLanguages = (batch.languages ?? []).filter((language) => targetLanguages.includes(language));
  if (!affectedLanguages.length) continue;

  const sourcePath = path.join(projectRoot, batch.path);
  const rows = await readJsonl(sourcePath);
  const batchChanges = [];

  for (const row of rows) {
    const rowOverrides = overrides.get(rowSuffix(row.row_id));
    if (!rowOverrides) continue;
    for (const language of affectedLanguages) {
      const nextValue = rowOverrides.get(language);
      if (!nextValue || row[language] === nextValue) continue;
      batchChanges.push({
        row_id: row.row_id,
        source_headword: row.source_headword,
        language,
        before: row[language],
        after: nextValue,
      });
      row[language] = nextValue;
      changesByLanguage[language] = (changesByLanguage[language] ?? 0) + 1;
      displayCellsChanged += 1;
    }
  }

  if (!batchChanges.length) continue;

  const nextPath = repairedBatchPath(batch.path);
  const nextSummaryPath = repairedSummaryPath(batch.summary_path);
  await writeJsonl(path.join(projectRoot, nextPath), rows);
  await writeFile(
    path.join(projectRoot, nextSummaryPath),
    [
      `# Oxford Part 002 Support Article Display Repair: ${batch.batch_id}`,
      "",
      `- Repair id: \`${repairId}\``,
      `- Script version: \`${scriptVersion}\``,
      `- Generated at: \`${generatedAt}\``,
      `- Source batch: \`${batch.path}\``,
      `- Output batch: \`${nextPath}\``,
      `- Affected languages: ${affectedLanguages.join(", ")}`,
      `- Display cells changed: ${batchChanges.length}`,
      `- Policy: ${articleDisplayPolicy}`,
      "- Examples changed: 0",
      "- Target-language transcriptions added: 0",
      "",
    ].join("\n"),
    "utf8"
  );

  batch.batch_id = repairedBatchId(batch.batch_id);
  batch.path = nextPath;
  batch.summary_path = nextSummaryPath;
  batch.article_display_repair = {
    repair_id: repairId,
    script_path: "scripts/oxford/apply-oxford-part002-support-article-display-repair.mjs",
    script_version: scriptVersion,
    source_batch_path: relative(sourcePath),
    generated_at: generatedAt,
    policy: articleDisplayPolicy,
    affected_languages: affectedLanguages,
    display_cells_changed: batchChanges.length,
    examples_changed: 0,
    target_language_transcriptions_added: 0,
  };
  changedBatches.push({
    batch_id: batch.batch_id,
    path: nextPath,
    affected_languages: affectedLanguages,
    display_cells_changed: batchChanges.length,
    sample: batchChanges.slice(0, 12),
  });
}

contract.latest_support_article_display_repair = {
  repair_id: repairId,
  script_path: "scripts/oxford/apply-oxford-part002-support-article-display-repair.mjs",
  script_version: scriptVersion,
  generated_at: generatedAt,
  policy: articleDisplayPolicy,
  target_languages: targetLanguages,
  changed_batches: changedBatches,
  display_cells_changed: displayCellsChanged,
  changes_by_language: Object.fromEntries(Object.entries(changesByLanguage).sort()),
  examples_changed: 0,
  target_language_transcriptions_added: 0,
  does_not_replace: "native-speaker certification or full final linguistic audit",
};

await writeJson(contractPath, contract);

const reportPath = `outputs/oxford-vocabulary/qa/${releaseId}_${repairId}.json`;
const reportMdPath = `outputs/oxford-vocabulary/qa/${releaseId}_${repairId}.md`;
await writeJson(path.join(projectRoot, reportPath), {
  release_id: releaseId,
  repair_id: repairId,
  script_version: scriptVersion,
  generated_at: generatedAt,
  policy: articleDisplayPolicy,
  target_languages: targetLanguages,
  display_cells_changed: displayCellsChanged,
  changes_by_language: Object.fromEntries(Object.entries(changesByLanguage).sort()),
  changed_batches: changedBatches,
  examples_changed: 0,
  target_language_transcriptions_added: 0,
});
await writeFile(
  path.join(projectRoot, reportMdPath),
  [
    `# Oxford Part 002 Support Article Display Repair: ${releaseId}`,
    "",
    `- Repair id: \`${repairId}\``,
    `- Script version: \`${scriptVersion}\``,
    `- Generated at: \`${generatedAt}\``,
    `- Display cells changed: ${displayCellsChanged}`,
    `- Target languages: ${targetLanguages.join(", ")}`,
    `- Policy: ${articleDisplayPolicy}`,
    "- Examples changed: 0",
    "- Target-language transcriptions added: 0",
    "",
    "## Changes By Language",
    "",
    ...Object.entries(changesByLanguage)
      .sort()
      .map(([language, count]) => `- ${language}: ${count}`),
    "",
    "## Changed Batches",
    "",
    ...changedBatches.map((item) => `- \`${item.batch_id}\`: ${item.display_cells_changed} cells -> \`${item.path}\``),
    "",
  ].join("\n"),
  "utf8"
);

console.log(
  JSON.stringify(
    {
      release_id: releaseId,
      repair_id: repairId,
      display_cells_changed: displayCellsChanged,
      changed_batches: changedBatches.length,
      report: reportPath,
      contract_updated: contractPath,
    },
    null,
    2
  )
);
