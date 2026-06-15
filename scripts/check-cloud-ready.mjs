import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const strict = process.argv.includes("--strict");

const requiredFiles = [
  ".env.example",
  ".gitignore",
  "docker-compose.yml",
  "docs/README.md",
  "docs/cloud-automation.md",
  "docs/deck-master-plan.md",
  "docs/data-delivery-pipeline.md",
  "docs/database-schema.md",
  "config/language-order.json",
  "config/spreadsheet-contract-v1.json",
  "scripts/db-apply.sh",
  "scripts/db-qa-set.sh",
  "scripts/db-dump.sh",
  "scripts/db-restore.sh",
  "scripts/check-deck-ready.mjs",
  "scripts/check-deck-specs.mjs",
  "scripts/check-language-order.mjs",
  "scripts/check-product-roadmap.mjs",
  "scripts/check-qa-evidence.mjs",
  "scripts/run-deck-automation.mjs",
  "scripts/run-ai-qa.mjs",
  "scripts/import-ai-qa-results.mjs",
  "scripts/generate-meaning-reuse-plan.mjs",
  "scripts/export-flashcards-working-sheet.mjs",
  "scripts/upload-spreadsheet-to-drive-folder.mjs",
];

const errors = [];
const warnings = [];

function readProjectFile(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function runGit(args) {
  try {
    return execFileSync("git", args, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    warnings.push(`git ${args.join(" ")} failed: ${error.message}`);
    return "";
  }
}

for (const relativePath of requiredFiles) {
  if (!existsSync(path.join(projectRoot, relativePath))) {
    errors.push(`Missing required cloud-ready file: ${relativePath}`);
  }
}

const envExample = existsSync(path.join(projectRoot, ".env.example")) ? readProjectFile(".env.example") : "";
if (!envExample.includes("DATABASE_URL=")) errors.push(".env.example must include DATABASE_URL");
if (!envExample.includes("POSTGRES_PORT=")) warnings.push(".env.example should document POSTGRES_PORT");
if (!envExample.includes("GOOGLE_DRIVE_FOLDER_ID=")) {
  errors.push(".env.example must include GOOGLE_DRIVE_FOLDER_ID for final Drive-folder delivery");
}
if (
  !envExample.includes("GOOGLE_OAUTH_CLIENT_FILE") &&
  !envExample.includes("GOOGLE_APPLICATION_CREDENTIALS") &&
  !envExample.includes("GOOGLE_SERVICE_ACCOUNT_JSON")
) {
  warnings.push(".env.example should document OAuth or service-account credentials for Drive-folder upload");
}
if (!envExample.includes("GOOGLE_OAUTH_TOKEN_FILE")) {
  warnings.push(".env.example should document GOOGLE_OAUTH_TOKEN_FILE for local Drive OAuth token cache");
}

const gitignore = existsSync(path.join(projectRoot, ".gitignore")) ? readProjectFile(".gitignore") : "";
for (const pattern of [".env", ".secrets/", "node_modules", "Trash/", "outputs/tmp/", "outputs/db/*.sql"]) {
  if (!gitignore.includes(pattern)) {
    errors.push(`.gitignore must include ${pattern}`);
  }
}

const cloudDoc = existsSync(path.join(projectRoot, "docs/cloud-automation.md"))
  ? readProjectFile("docs/cloud-automation.md")
  : "";
for (const phrase of ["approved_for_generation", "scripts/db-dump.sh", "scripts/db-restore.sh", "Google Sheets"]) {
  if (!cloudDoc.includes(phrase)) {
    errors.push(`docs/cloud-automation.md must mention ${phrase}`);
  }
}

const masterPlan = existsSync(path.join(projectRoot, "docs/deck-master-plan.md"))
  ? readProjectFile("docs/deck-master-plan.md")
  : "";
const deckRows = masterPlan
  .split(/\r?\n/)
  .filter((line) => /^\|\s*\d+\s*\|/.test(line));
const statusCounts = new Map();
for (const row of deckRows) {
  const cells = row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
  const status = cells[7] ?? "unknown";
  statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
}

if (deckRows.length < 180) {
  warnings.push(`Deck Master Plan currently has ${deckRows.length} deck rows; expected at least 180 for full roadmap.`);
}

const remotes = runGit(["remote", "-v"]);
if (!remotes) {
  const message = "No git remote configured. Cloud runtime cannot pull this repo until a remote is added.";
  if (strict) errors.push(message);
  else warnings.push(message);
}

const status = runGit(["status", "--short"]);
if (status) {
  const message = "Working tree has uncommitted changes. Commit before cloud handoff.";
  if (strict) errors.push(message);
  else warnings.push(message);
}

console.log("Cloud readiness check");
console.log(`deck_rows=${deckRows.length}`);
console.log(
  `deck_status_counts=${JSON.stringify(Object.fromEntries([...statusCounts.entries()].sort(([a], [b]) => a.localeCompare(b))))}`
);
console.log(`git_remote_configured=${remotes ? "yes" : "no"}`);
console.log(`working_tree_clean=${status ? "no" : "yes"}`);

if (warnings.length) {
  console.log("\nWarnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (errors.length) {
  console.error("\nErrors:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("\nCloud readiness check passed.");
