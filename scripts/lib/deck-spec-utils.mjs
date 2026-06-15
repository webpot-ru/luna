import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const masterPlanPath = path.join(projectRoot, "docs/deck-master-plan.md");
export const registryPath = path.join(projectRoot, "docs/deck-specs/README.md");
export const specsDir = path.join(projectRoot, "docs/deck-specs");

export function parseMarkdownTableRows(filePath, expectedMinCells) {
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

export function extractSpecFile(cell) {
  const markdownLink = cell.match(/\]\(([^)]+)\)/);
  return markdownLink?.[1] ?? cell;
}

export function parseSpecIdentity(specFile) {
  const content = readFileSync(specFile, "utf8");
  const fieldValues = new Map();

  for (const line of content.split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim().replace(/`/g, ""));
    if (cells.length >= 2) fieldValues.set(cells[0], cells[1].replace(/^`|`$/g, ""));
  }

  return {
    content,
    sort: fieldValues.get("Sort") ?? "",
    deck: fieldValues.get("Deck") ?? "",
    setId: fieldValues.get("set_id") ?? fieldValues.get("Proposed set_id") ?? "",
    contentType: fieldValues.get("Content type") ?? "",
    domain: fieldValues.get("Domain") ?? "",
    area: fieldValues.get("Area") ?? "",
    categoryOrSituation: fieldValues.get("Category / situation") ?? "",
    status: fieldValues.get("Status") ?? "",
    levelLabel: fieldValues.get("level_label") ?? "",
    levelMin: fieldValues.get("level_min") ?? "",
    levelMax: fieldValues.get("level_max") ?? "",
    frequencyScope: fieldValues.get("frequency_band scope") ?? "",
    priorityScope: fieldValues.get("priority_band scope") ?? "",
    targetRange: fieldValues.get("Target item range") ?? "",
    deckProfile: fieldValues.get("deck_profile") ?? "",
    riskFlags: fieldValues.get("risk_flags") ?? "",
    filePath: specFile,
    fileName: path.basename(specFile),
  };
}

export function normalizeDeckKey(sort, deck) {
  return `${sort}::${deck}`;
}

export function loadDeckPlanningState() {
  const masterRows = parseMarkdownTableRows(masterPlanPath, 8).map((cells) => ({
    sort: cells[0],
    deck: cells[1],
    contentType: cells[2],
    domain: cells[3],
    levelLabel: cells[4],
    cefr: cells[5],
    frequencyScope: cells[6],
    status: cells[7],
  }));

  const registryRows = parseMarkdownTableRows(registryPath, 5).map((cells) => ({
    sort: cells[0],
    deck: cells[1],
    status: cells[2],
    specFile: extractSpecFile(cells[3]),
  }));

  const specIdentities = readdirSync(specsDir)
    .filter((fileName) => fileName.endsWith(".md") && fileName !== "README.md" && fileName !== "TEMPLATE.md")
    .map((fileName) => parseSpecIdentity(path.join(specsDir, fileName)));

  return { masterRows, registryRows, specIdentities };
}

export function resolveDeckSpec(requestedDeck) {
  const { masterRows, registryRows, specIdentities } = loadDeckPlanningState();
  let masterRow = masterRows.find((row) => row.sort === requestedDeck);
  let specIdentity = null;

  if (!masterRow) {
    specIdentity = specIdentities.find((spec) => spec.setId === requestedDeck);
    if (specIdentity) {
      masterRow = masterRows.find((row) => row.sort === specIdentity.sort && row.deck === specIdentity.deck);
    }
  }

  if (!masterRow) throw new Error(`Deck is not present in Deck Master Plan for requested value: ${requestedDeck}`);

  const key = normalizeDeckKey(masterRow.sort, masterRow.deck);
  const registryRow = registryRows.find((row) => normalizeDeckKey(row.sort, row.deck) === key);
  if (!registryRow) return { masterRow, registryRow: null, spec: null };

  const specPath = path.join(specsDir, registryRow.specFile);
  if (!registryRow.specFile || registryRow.specFile === "-" || !existsSync(specPath)) {
    return { masterRow, registryRow, spec: null };
  }

  return { masterRow, registryRow, spec: parseSpecIdentity(specPath) };
}
