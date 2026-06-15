import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  candidatePoolPathForSetId,
  readCandidateRowsSync,
  validateCandidatePoolRows,
} from "./lib/deck-candidate-pool.mjs";
import {
  buildDeckProfilePolicy,
  normalizeDeckProfiles,
  normalizeRiskFlags,
  validateDeckProfileFields,
} from "./lib/deck-profile-policy.mjs";
import { validateWordSelectionQualityRows } from "./lib/word-selection-quality.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const masterPlanPath = path.join(projectRoot, "docs/deck-master-plan.md");
const registryPath = path.join(projectRoot, "docs/deck-specs/README.md");
const specsDir = path.join(projectRoot, "docs/deck-specs");
const requestedDeck = process.argv[2];
const safeSetIdPattern = /^[a-z0-9_]+$/;
const allowedContentTypes = new Set(["Vocabulary", "Core Foundation"]);
const allowedLevelLabels = new Set([
  "Basic",
  "Elementary",
  "Pre-Intermediate",
  "Intermediate",
  "Upper-Intermediate",
  "Advanced",
  "Proficiency",
]);
const levelLabelCompatibleCefrRanges = new Map([
  ["Basic", [["A1", "A1"]]],
  ["Elementary", [["A1", "A2"], ["A2", "A2"]]],
  ["Pre-Intermediate", [["A2", "B1"], ["B1", "B1"]]],
  ["Intermediate", [["B1", "B1"], ["B1", "B2"]]],
  ["Upper-Intermediate", [["B2", "B2"]]],
  ["Advanced", [["B2", "C1"], ["C1", "C1"]]],
  ["Proficiency", [["C2", "C2"]]],
]);

if (!requestedDeck) {
  throw new Error("Usage: node scripts/check-deck-ready.mjs <Sort|set_id>");
}

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

function extractSpecFile(cell) {
  const markdownLink = cell.match(/\]\(([^)]+)\)/);
  return markdownLink?.[1] ?? cell;
}

function parseSpecIdentity(specFile) {
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
  };
}

function normalizeKey(sort, deck) {
  return `${sort}::${deck}`;
}

function hasFilledListAfter(content, marker) {
  const index = content.indexOf(marker);
  if (index === -1) return false;
  const nextSection = content.indexOf("\n## ", index + marker.length);
  const section = content.slice(index, nextSection === -1 ? content.length : nextSection);
  return /^-\s+\S/m.test(section);
}

function sectionContent(content, marker) {
  const index = content.indexOf(marker);
  if (index === -1) return "";
  const nextSection = content.indexOf("\n## ", index + marker.length);
  return content.slice(index + marker.length, nextSection === -1 ? content.length : nextSection).trim();
}

function isPlaceholderText(value) {
  return /(^\s*$|todo|tbd|to be decided|candidate \/ planned|part of speech \/ closed set|room-object zone|place-object zone)/i.test(
    value ?? ""
  );
}

function validateTargetRange(value) {
  const match = String(value ?? "").match(/\b(\d+)\s*-\s*(\d+)\b/);
  if (!match) return "Target item range must contain numeric min-max, for example 20-60";
  const min = Number(match[1]);
  const max = Number(match[2]);
  if (!Number.isInteger(min) || !Number.isInteger(max) || min <= 0 || max <= 0) {
    return "Target item range min/max must be positive integers";
  }
  if (min > max) return `Target item range min=${min} must be <= max=${max}`;
  return null;
}

function validateLevelCompatibility(levelLabel, levelMin, levelMax) {
  if (!allowedLevelLabels.has(levelLabel)) return `level_label=${levelLabel || "missing"} is not allowed`;
  const ranges = levelLabelCompatibleCefrRanges.get(levelLabel) ?? [];
  const compatible = ranges.some(([min, max]) => min === levelMin && max === levelMax);
  if (!compatible) {
    return `level_label=${levelLabel} is not compatible with CEFR range ${levelMin || "missing"}-${levelMax || "missing"}`;
  }
  return null;
}

function validateSpecContent(spec) {
  const { content } = spec;
  const requiredSnippets = [
    "## Identity",
    "## Scope",
    "One learner-facing grouping principle",
    "Include:",
    "Exclude / move elsewhere:",
    "## Level And Priority",
    "`level_label`",
    "`level_min`",
    "`level_max`",
    "`frequency_band` scope",
    "`priority_band` scope",
    "Target item range",
    "## Quality Profile",
    "`deck_profile`",
    "`risk_flags`",
    "## Candidate Pool Rule",
    "## Next Deck",
    "## QA Notes",
  ];
  const errors = [];

  for (const snippet of requiredSnippets) {
    if (!content.includes(snippet)) errors.push(`missing spec section/field: ${snippet}`);
  }

  if (!safeSetIdPattern.test(spec.setId)) {
    errors.push(`set_id is missing or unsafe: ${spec.setId || "missing"}`);
  }
  if (!allowedContentTypes.has(spec.contentType)) {
    errors.push(`Content type must be Vocabulary or Core Foundation, got: ${spec.contentType || "missing"}`);
  }
  for (const [field, value] of [
    ["Deck", spec.deck],
    ["Domain", spec.domain],
    ["Area", spec.area],
    ["Category / situation", spec.categoryOrSituation],
    ["frequency_band scope", spec.frequencyScope],
    ["priority_band scope", spec.priorityScope],
  ]) {
    if (isPlaceholderText(value)) errors.push(`${field} is empty or placeholder`);
  }

  const targetRangeError = validateTargetRange(spec.targetRange);
  if (targetRangeError) errors.push(targetRangeError);

  const levelError = validateLevelCompatibility(spec.levelLabel, spec.levelMin, spec.levelMax);
  if (levelError) errors.push(levelError);

  errors.push(...validateDeckProfileFields(spec));

  if (!hasFilledListAfter(content, "Include:")) errors.push("Include list is empty");
  if (!hasFilledListAfter(content, "Exclude / move elsewhere:")) errors.push("Exclude / move elsewhere list is empty");
  if (!hasFilledListAfter(content, "Natural next deck(s):")) errors.push("Next deck list is empty");
  if (!hasFilledListAfter(content, "## QA Notes")) errors.push("QA Notes list is empty");

  const candidatePool = sectionContent(content, "## Candidate Pool Rule");
  if (isPlaceholderText(candidatePool) || candidatePool.length < 80) {
    errors.push("Candidate Pool Rule must be specific and non-placeholder");
  }

  for (const placeholder of ["TODO", "TBD", "to be decided", "candidate / planned"]) {
    if (content.toLowerCase().includes(placeholder.toLowerCase())) {
      errors.push(`Spec contains placeholder text: ${placeholder}`);
    }
  }

  return errors;
}

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

const specIdentities = readdirSync(specsDir)
  .filter((fileName) => fileName.endsWith(".md") && fileName !== "README.md" && fileName !== "TEMPLATE.md")
  .map((fileName) => ({
    fileName,
    filePath: path.join(specsDir, fileName),
    ...parseSpecIdentity(path.join(specsDir, fileName)),
  }));

let masterRow = masterRows.find((row) => row.sort === requestedDeck);
let specIdentity = null;

if (!masterRow) {
  specIdentity = specIdentities.find((spec) => spec.setId === requestedDeck);
  if (specIdentity) {
    masterRow = masterRows.find((row) => row.sort === specIdentity.sort && row.deck === specIdentity.deck);
  }
}

if (!masterRow) {
  throw new Error(`Deck is not present in Deck Master Plan for requested value: ${requestedDeck}`);
}

const key = normalizeKey(masterRow.sort, masterRow.deck);
const registryRow = registryRows.find((row) => normalizeKey(row.sort, row.deck) === key);
const errors = [];

if (masterRow.status !== "approved_for_generation") {
  errors.push(
    `Deck ${key} is not generation-ready: status=${masterRow.status}. Required status is approved_for_generation.`
  );
}

if (!registryRow) {
  errors.push(`Deck ${key} is missing from docs/deck-specs/README.md registry.`);
} else {
  if (registryRow.status !== masterRow.status) {
    errors.push(`Registry status mismatch for ${key}: registry=${registryRow.status}, master=${masterRow.status}`);
  }

  const specPath = path.join(specsDir, registryRow.specFile);
  if (!registryRow.specFile || registryRow.specFile === "-") {
    errors.push(`Registry row for ${key} has no spec file.`);
  } else if (!existsSync(specPath)) {
    errors.push(`Spec file does not exist for ${key}: ${registryRow.specFile}`);
  } else {
    specIdentity = parseSpecIdentity(specPath);
    const specErrors = validateSpecContent(specIdentity);
    errors.push(...specErrors.map((error) => `${registryRow.specFile}: ${error}`));
    if (masterRow.status === "approved_for_generation") {
      const candidatePoolPath = candidatePoolPathForSetId(specIdentity.setId);
      if (!existsSync(candidatePoolPath)) {
        errors.push(
          `${registryRow.specFile}: missing candidate-pool evidence at ${path.relative(projectRoot, candidatePoolPath)}`
        );
      } else {
        try {
          const candidateRows = readCandidateRowsSync(candidatePoolPath);
          const candidatePoolErrors = validateCandidatePoolRows(candidateRows, specIdentity);
          errors.push(
            ...candidatePoolErrors.map(
              (error) => `${registryRow.specFile}: candidate pool ${path.relative(projectRoot, candidatePoolPath)}: ${error}`
            )
          );
          const wordSelectionErrors = validateWordSelectionQualityRows(candidateRows, specIdentity);
          errors.push(
            ...wordSelectionErrors.blockers.map(
              (error) =>
                `${registryRow.specFile}: word selection ${path.relative(projectRoot, candidatePoolPath)}: ${error}`
            )
          );
        } catch (error) {
          errors.push(`${registryRow.specFile}: candidate pool cannot be read: ${error.message}`);
        }
      }
    }

    if (specIdentity.sort !== masterRow.sort) {
      errors.push(`${registryRow.specFile}: Sort mismatch spec=${specIdentity.sort}, master=${masterRow.sort}`);
    }
    if (specIdentity.deck !== masterRow.deck) {
      errors.push(`${registryRow.specFile}: Deck mismatch spec=${specIdentity.deck}, master=${masterRow.deck}`);
    }
    if (specIdentity.status !== masterRow.status) {
      errors.push(`${registryRow.specFile}: Status mismatch spec=${specIdentity.status}, master=${masterRow.status}`);
    }
  }
}

if (errors.length > 0) {
  throw new Error(`Deck is not ready for generation:\n${errors.join("\n")}`);
}

const deckProfiles = normalizeDeckProfiles(specIdentity.deckProfile);
const riskFlags = normalizeRiskFlags(specIdentity.riskFlags);
const profilePolicy = buildDeckProfilePolicy(deckProfiles, riskFlags);

console.log(
  `Deck ready for generation: ${key}; deck_profile=${deckProfiles.join(",")}; risk_flags=${riskFlags.join(",")}; requires_single_language_batch=${profilePolicy.requires_single_language_batch ? "yes" : "no"}`
);
