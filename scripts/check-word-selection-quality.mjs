#!/usr/bin/env node
import path from "node:path";
import {
  candidatePoolPathForSetId,
  readCandidateRows,
} from "./lib/deck-candidate-pool.mjs";
import { resolveDeckSpec } from "./lib/deck-spec-utils.mjs";
import { validateWordSelectionQualityRows } from "./lib/word-selection-quality.mjs";

const args = process.argv.slice(2);
const requestedDeck = args.find((arg) => !arg.startsWith("--"));
const fileArg = args.find((arg) => arg.startsWith("--file="))?.slice("--file=".length);
const strictWarnings = args.includes("--strict-warnings");

if (!requestedDeck) {
  throw new Error("Usage: node scripts/check-word-selection-quality.mjs <Sort|set_id> [--file=path] [--strict-warnings]");
}

const { masterRow, spec } = resolveDeckSpec(requestedDeck);
if (!spec) {
  throw new Error(`Deck ${masterRow.sort}::${masterRow.deck} has no spec file; word selection cannot be checked.`);
}

const poolPath = path.resolve(fileArg ?? candidatePoolPathForSetId(spec.setId));
const rows = await readCandidateRows(poolPath);
const { blockers, warnings, summary } = validateWordSelectionQualityRows(rows, spec);

if (blockers.length > 0 || (strictWarnings && warnings.length > 0)) {
  const parts = [];
  if (blockers.length > 0) parts.push(`Blockers:\n${blockers.map((item) => `- ${item}`).join("\n")}`);
  if (warnings.length > 0) parts.push(`Warnings:\n${warnings.map((item) => `- ${item}`).join("\n")}`);
  throw new Error(`Word selection quality is not ready for ${spec.setId} (${poolPath}):\n${parts.join("\n\n")}`);
}

console.log(
  `Word selection quality OK for ${spec.setId}: selected=${summary.selected_count}, warnings=${warnings.length}, file=${poolPath}`
);
if (warnings.length > 0) {
  for (const warning of warnings) console.log(`warning: ${warning}`);
}
