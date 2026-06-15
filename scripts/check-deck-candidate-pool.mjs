#!/usr/bin/env node
import path from "node:path";
import {
  candidatePoolPathForSetId,
  readCandidateRows,
  summarizeCandidatePool,
  validateCandidatePoolRows,
} from "./lib/deck-candidate-pool.mjs";
import { resolveDeckSpec } from "./lib/deck-spec-utils.mjs";

const args = process.argv.slice(2);
const requestedDeck = args.find((arg) => !arg.startsWith("--"));
const fileArg = args.find((arg) => arg.startsWith("--file="))?.slice("--file=".length);

if (!requestedDeck) {
  throw new Error("Usage: node scripts/check-deck-candidate-pool.mjs <Sort|set_id> [--file=path]");
}

const { masterRow, spec } = resolveDeckSpec(requestedDeck);
if (!spec) {
  throw new Error(`Deck ${masterRow.sort}::${masterRow.deck} has no spec file; candidate pool cannot be checked.`);
}

const poolPath = path.resolve(fileArg ?? candidatePoolPathForSetId(spec.setId));
const rows = await readCandidateRows(poolPath);
const errors = validateCandidatePoolRows(rows, spec);
const summary = summarizeCandidatePool(rows, spec);

if (errors.length > 0) {
  throw new Error(`Candidate pool is not ready for ${spec.setId} (${poolPath}):\n${errors.join("\n")}`);
}

console.log(
  `Candidate pool OK for ${spec.setId}: rows=${summary.rows}, selected=${summary.selected}, backup=${summary.backup}, excluded=${summary.excluded}, file=${poolPath}`
);
