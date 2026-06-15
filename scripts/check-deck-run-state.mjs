#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { candidatePoolPathForSetId } from "./lib/deck-candidate-pool.mjs";
import { resolveDeckSpec } from "./lib/deck-spec-utils.mjs";
import { psqlJson, sqlString } from "./lib/qa-utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const requestedDeck = process.argv[2];
const runIdArg = process.argv.find((arg) => arg.startsWith("--run-id="))?.slice("--run-id=".length);
const stages = ["prepare", "base", "draft-preflight", "batch-import", "qa", "export", "deliver", "complete"];

if (!requestedDeck) {
  throw new Error("Usage: node scripts/check-deck-run-state.mjs <Sort|set_id> [--run-id=<run_id>]");
}

async function sha256File(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function relativePath(filePath) {
  return path.relative(projectRoot, path.resolve(filePath));
}

function findLatestManifest(setId) {
  const dir = path.join(projectRoot, "outputs", "runs", setId);
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(dir, file))
    .filter((file) => !runIdArg || path.basename(file, ".json") === runIdArg)
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return files[0] ?? null;
}

async function maybeHash(label, filePath, expectedSha, findings, options = {}) {
  if (!filePath) return null;
  const absolutePath = path.resolve(projectRoot, filePath);
  if (!existsSync(absolutePath)) {
    findings.push(`${label} missing: ${filePath}`);
    return null;
  }
  const actualSha = await sha256File(absolutePath);
  if (expectedSha && actualSha !== expectedSha) {
    const message = options.warningMessage ?? `${label} stale: ${filePath}`;
    if (options.warnOnly) options.warnings?.push(message);
    else findings.push(message);
  }
  return actualSha;
}

async function activeLocks(setId) {
  try {
    return await psqlJson(`
select coalesce(json_agg(row_to_json(active)), '[]'::json)
from (
  select run_id, run_status, current_stage, locked_by, started_at, heartbeat_at
  from deck_generation_runs
  where set_id = ${sqlString(setId)}
    and run_status = 'running'
  order by started_at desc
) active;
`);
  } catch (error) {
    return [{ error: String(error.stderr || error.message).trim() }];
  }
}

const { spec } = resolveDeckSpec(requestedDeck);
if (!spec?.setId) throw new Error(`Deck ${requestedDeck} has no resolved spec/set_id.`);

const setId = spec.setId;
const manifestPath = findLatestManifest(setId);
const findings = [];
const warnings = [];
let manifest = null;
let latestStage = "none";
let nextStage = "prepare";

if (manifestPath) {
  manifest = await readJson(manifestPath);
  latestStage = manifest.current_stage ?? "unknown";
  const stageIndex = stages.indexOf(latestStage);
  nextStage = stageIndex >= 0 && stageIndex < stages.length - 1 ? stages[stageIndex + 1] : "none";

  const completedRun = manifest.status === "completed" && manifest.current_stage === "complete";
  await maybeHash("spec", manifest.artifacts?.spec_path, manifest.artifacts?.spec_sha256, findings, {
    warnOnly: completedRun,
    warnings,
    warningMessage: `spec changed after completed run: ${manifest.artifacts?.spec_path}`,
  });
  await maybeHash(
    "candidate_pool",
    manifest.artifacts?.candidate_pool_path,
    manifest.artifacts?.candidate_pool_sha256,
    findings
  );
  await maybeHash("base", manifest.artifacts?.base_path, manifest.artifacts?.base_sha256, findings);
  await maybeHash("last_draft", manifest.artifacts?.last_draft_path, manifest.artifacts?.last_draft_sha256, findings);
  await maybeHash(
    "last_preflight_report",
    manifest.artifacts?.last_preflight_report_path,
    manifest.artifacts?.last_preflight_report_sha256,
    findings
  );
  await maybeHash("final_workbook", manifest.artifacts?.final_workbook_path, manifest.artifacts?.final_workbook_sha256, findings);
  await maybeHash(
    "delivery_manifest",
    manifest.artifacts?.delivery_manifest_path,
    manifest.artifacts?.delivery_manifest_sha256,
    findings
  );
} else {
  findings.push("no run manifest found");
}

const specSha = await sha256File(spec.filePath);
const candidatePoolPath = candidatePoolPathForSetId(setId);
const candidatePoolPresent = existsSync(path.resolve(projectRoot, candidatePoolPath));
const locks = await activeLocks(setId);

console.log(
  JSON.stringify(
    {
      set_id: setId,
      sort: spec.sort,
      deck_name: spec.deck,
      manifest_path: manifestPath ? relativePath(manifestPath) : null,
      run_id: manifest?.run_id ?? null,
      status: manifest?.status ?? "not_started",
      latest_stage: latestStage,
      next_stage: nextStage,
      stale_or_missing: findings,
      warnings,
      active_locks: locks,
      current_inputs: {
        spec_path: relativePath(spec.filePath),
        spec_sha256: specSha,
        candidate_pool_path: candidatePoolPath,
        candidate_pool_present: candidatePoolPresent,
        candidate_pool_sha256: candidatePoolPresent ? await sha256File(path.resolve(projectRoot, candidatePoolPath)) : null,
      },
    },
    null,
    2
  )
);

if (findings.some((finding) => /stale|missing|no run manifest/u.test(finding))) {
  process.exitCode = 1;
}
