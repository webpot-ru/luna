#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const repairId = "support_article_display_repair_v1";
const scriptVersion = "2026-05-20.v1";
const defaultContractPath = "config/oxford_3000_core_a1_part_003_300_v1_contract_v0.json";
const defaultOutputDir = "outputs/oxford-vocabulary/qa";
const targetLanguages = ["ES", "FR", "DE", "IT", "PT", "NL", "SV", "NO", "DA", "RO", "ES-419", "PT-BR"];
const articleDisplayPolicy =
  "English headwords stay Oxford-style lemmas. Support-language noun displays use natural articles/gender markers for article languages; zero-change checks are valid when batches already include the article display layer.";
const articlePrefixes = new Map([
  ["ES", ["el", "la", "los", "las", "un", "una", "unos", "unas"]],
  ["ES-419", ["el", "la", "los", "las", "un", "una", "unos", "unas"]],
  ["FR", ["le", "la", "les", "un", "une", "des", "l"]],
  ["DE", ["der", "die", "das", "den", "dem", "ein", "eine", "einen", "einem"]],
  ["IT", ["il", "lo", "la", "gli", "le", "un", "uno", "una", "l"]],
  ["PT", ["o", "a", "os", "as", "um", "uma", "uns", "umas"]],
  ["PT-BR", ["o", "a", "os", "as", "um", "uma", "uns", "umas"]],
  ["NL", ["de", "het", "een"]],
  ["SV", ["en", "ett"]],
  ["NO", ["en", "ei", "et"]],
  ["DA", ["en", "et"]],
  ["RO", ["un", "o", "niste"]],
]);

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

function normalizeComparable(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
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

function hasArticleLikePrefix(language, value) {
  const comparable = normalizeComparable(value);
  const prefixes = articlePrefixes.get(language) ?? [];
  return prefixes.some((prefix) => comparable === prefix || comparable.startsWith(`${prefix} `));
}

const contractPath = argValue("contract", defaultContractPath);
const outputDir = argValue("output-dir", defaultOutputDir);
const contract = await readJson(contractPath);
const releaseId = contract.latest_source_snapshot?.release_id;
if (!releaseId) throw new Error("Contract release id is missing.");

const generatedAt = new Date().toISOString();
const blockers = [];
const checkedBatches = [];
let displayCellsChecked = 0;
let articleLikeDisplayCells = 0;

for (const language of targetLanguages) {
  const matchingBatches = (contract.latest_support_translation_batches ?? []).filter((batch) =>
    (batch.languages ?? []).includes(language)
  );
  if (matchingBatches.length !== 1) {
    blockers.push({
      language,
      reason: matchingBatches.length === 0 ? "missing_article_language_batch" : "duplicate_article_language_batches",
      batch_count: matchingBatches.length,
    });
    continue;
  }

  const batch = matchingBatches[0];
  if (batch.article_display_included !== true) {
    blockers.push({
      language,
      batch_id: batch.batch_id,
      reason: "batch_contract_missing_article_display_included_true",
    });
  }

  const rows = await readJsonl(path.join(projectRoot, batch.path));
  const languageDisplayCells = rows.length;
  const languageArticleLikeCells = rows.filter((row) => hasArticleLikePrefix(language, row[language])).length;
  displayCellsChecked += languageDisplayCells;
  articleLikeDisplayCells += languageArticleLikeCells;
  checkedBatches.push({
    batch_id: batch.batch_id,
    path: batch.path,
    languages: batch.languages,
    article_display_included: batch.article_display_included === true,
    display_cells_checked: languageDisplayCells,
    article_like_display_cells: languageArticleLikeCells,
  });
}

const status = blockers.length === 0 ? "pass" : "blocker";
const reportPath = path.join(outputDir, `${releaseId}_${repairId}.json`);
const reportMdPath = path.join(outputDir, `${releaseId}_${repairId}.md`);
const report = {
  release_id: releaseId,
  repair_id: repairId,
  script_version: scriptVersion,
  generated_at: generatedAt,
  status,
  policy: articleDisplayPolicy,
  target_languages: targetLanguages,
  check_status: status,
  display_cells_checked: displayCellsChecked,
  article_like_display_cells: articleLikeDisplayCells,
  display_cells_changed: 0,
  blockers,
  checked_batches: checkedBatches,
  changed_batches: [],
  examples_changed: 0,
  target_language_transcriptions_added: 0,
};

await writeJson(reportPath, report);
await writeFile(
  reportMdPath,
  [
    `# Oxford Support Article Display Check: ${releaseId}`,
    "",
    `- Repair id: \`${repairId}\``,
    `- Script version: \`${scriptVersion}\``,
    `- Status: \`${status}\``,
    `- Generated at: \`${generatedAt}\``,
    `- Target languages: ${targetLanguages.join(", ")}`,
    `- Display cells checked: ${displayCellsChecked}`,
    `- Article-like display cells: ${articleLikeDisplayCells}`,
    "- Display cells changed: 0",
    `- Policy: ${articleDisplayPolicy}`,
    "- Examples changed: 0",
    "- Target-language transcriptions added: 0",
    "",
    "## Checked Batches",
    "",
    ...checkedBatches.map(
      (batch) =>
        `- \`${batch.batch_id}\`: ${batch.display_cells_checked} cells, article-like=${batch.article_like_display_cells}, path=\`${batch.path}\``
    ),
    "",
    "## Blockers",
    "",
    ...(blockers.length ? blockers.map((item) => `- \`${item.reason}\`: ${JSON.stringify(item)}`) : ["- None."]),
    "",
  ].join("\n"),
  "utf8"
);

contract.latest_support_article_display_repair = {
  repair_id: repairId,
  script_path: "scripts/oxford/check-oxford-support-article-display.mjs",
  script_version: scriptVersion,
  generated_at: generatedAt,
  status,
  check_status: status,
  policy: articleDisplayPolicy,
  target_languages: targetLanguages,
  report_path: relative(reportPath),
  markdown_path: relative(reportMdPath),
  checked_batches: checkedBatches,
  changed_batches: [],
  display_cells_checked: displayCellsChecked,
  article_like_display_cells: articleLikeDisplayCells,
  display_cells_changed: 0,
  changes_by_language: {},
  examples_changed: 0,
  target_language_transcriptions_added: 0,
  does_not_replace: "native-speaker certification or full final linguistic audit",
};
await writeJson(contractPath, contract);

console.log(
  JSON.stringify(
    {
      release_id: releaseId,
      status,
      target_languages: targetLanguages.length,
      display_cells_checked: displayCellsChecked,
      display_cells_changed: 0,
      blockers: blockers.length,
      report: relative(reportPath),
      contract_updated: contractPath,
    },
    null,
    2
  )
);
if (status !== "pass") process.exit(1);
