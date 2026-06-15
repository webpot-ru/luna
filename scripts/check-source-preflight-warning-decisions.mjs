#!/usr/bin/env node
import {
  defaultSourcePreflightWarningDecisionsPath,
  loadSourcePreflightWarningDecisions,
  validateSourcePreflightWarningDecisions,
} from "./lib/source-preflight-warning-decisions.mjs";
import { loadReferenceSourcesManifest } from "./lib/transcription-source-policy.mjs";

const args = process.argv.slice(2);
const decisionsPath = args.find((arg) => !arg.startsWith("--")) ?? defaultSourcePreflightWarningDecisionsPath;

const manifest = await loadReferenceSourcesManifest();
const manifestSourceIds = new Set((manifest.sources ?? []).map((source) => source.id));
const decisions = await loadSourcePreflightWarningDecisions(decisionsPath);
const result = validateSourcePreflightWarningDecisions(decisions, { manifestSourceIds });

if (result.error_count > 0) {
  console.error(
    `Source preflight warning decisions failed: decisions=${result.decision_count}, errors=${result.error_count}, warnings=${result.warning_count}.`
  );
  for (const error of result.errors) console.error(error);
  process.exit(1);
}

if (result.warning_count > 0) {
  console.error(
    `Source preflight warning decision warnings: decisions=${result.decision_count}, warnings=${result.warning_count}.`
  );
  for (const warning of result.warnings) console.error(warning);
}

console.log(
  `Source preflight warning decisions OK: path=${decisionsPath}, decisions=${result.decision_count}, warnings=${result.warning_count}.`
);
