import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseSpecIdentity as parseDeckSpecIdentity } from "./lib/deck-spec-utils.mjs";
import { validateDeckProfileFields } from "./lib/deck-profile-policy.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const masterPlanPath = path.join(projectRoot, "docs/deck-master-plan.md");
const registryPath = path.join(projectRoot, "docs/deck-specs/README.md");
const specsDir = path.join(projectRoot, "docs/deck-specs");

const allowedDeckStatuses = new Set([
  "candidate",
  "planned",
  "spec_ready",
  "approved_for_generation",
  "generated",
  "blocked",
]);

const specRequiredStatuses = new Set(["spec_ready", "approved_for_generation", "generated"]);

function parseMarkdownTableRows(filePath, expectedMinCells) {
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.startsWith("|"))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim())
    )
    .filter((cells) => cells.length >= expectedMinCells)
    .filter((cells) => /^\d+$/.test(cells[0]));
}

function normalizeKey(sort, deck) {
  return `${sort}::${deck}`;
}

function extractSpecFile(cell) {
  const markdownLink = cell.match(/\]\(([^)]+)\)/);
  return markdownLink?.[1] ?? cell;
}

const errors = [];
const masterRows = parseMarkdownTableRows(masterPlanPath, 8).map((cells) => ({
  sort: cells[0],
  deck: cells[1],
  status: cells[7],
}));

const registryRows = parseMarkdownTableRows(registryPath, 5).map((cells) => ({
  sort: cells[0],
  deck: cells[1],
  status: cells[2],
  specFile: extractSpecFile(cells[3]),
}));

const masterByKey = new Map();
const registryByKey = new Map();

for (const row of masterRows) {
  const key = normalizeKey(row.sort, row.deck);
  if (masterByKey.has(key)) errors.push(`Deck Master Plan duplicate row: ${key}`);
  masterByKey.set(key, row);

  if (!allowedDeckStatuses.has(row.status)) {
    errors.push(`Deck Master Plan invalid status for ${key}: ${row.status}`);
  }

}

for (const row of registryRows) {
  const key = normalizeKey(row.sort, row.deck);
  if (registryByKey.has(key)) errors.push(`Deck specs registry duplicate row: ${key}`);
  registryByKey.set(key, row);

  const masterRow = masterByKey.get(key);
  if (!masterRow) {
    errors.push(`Deck specs registry row is not present in Deck Master Plan: ${key}`);
  } else if (masterRow.status !== row.status) {
    errors.push(
      `Deck specs registry status mismatch for ${key}: registry=${row.status}, master=${masterRow.status}`
    );
  }

  if (!allowedDeckStatuses.has(row.status)) {
    errors.push(`Deck specs registry invalid status for ${key}: ${row.status}`);
  }

  if (!row.specFile || row.specFile === "-") {
    errors.push(`Deck specs registry missing spec file for ${key}`);
  } else if (!existsSync(path.join(specsDir, row.specFile))) {
    errors.push(`Deck specs registry spec file does not exist for ${key}: ${row.specFile}`);
  } else {
    const spec = parseDeckSpecIdentity(path.join(specsDir, row.specFile));
    errors.push(...validateDeckProfileFields(spec).map((error) => `${row.specFile}: ${error}`));
  }
}

for (const row of masterRows) {
  const key = normalizeKey(row.sort, row.deck);
  if (specRequiredStatuses.has(row.status) && !registryByKey.has(key)) {
    errors.push(`Deck with status ${row.status} must have registry row and spec file: ${key}`);
  }
}

if (errors.length > 0) {
  throw new Error(`Deck specs check failed:\n${errors.join("\n")}`);
}

console.log(
  `Deck specs OK: ${registryRows.length} registry row(s), ${masterRows.length} master plan row(s).`
);
