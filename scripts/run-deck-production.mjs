#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { candidatePoolPathForSetId } from "./lib/deck-candidate-pool.mjs";
import { resolveDeckSpec } from "./lib/deck-spec-utils.mjs";
import { psqlExec, psqlJson, sqlNullableString, sqlString } from "./lib/qa-utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const args = process.argv.slice(2);
const requestedDeck = args.find((arg) => !arg.startsWith("--"));
const execute = args.includes("--execute");
const stage = argValue("--stage");
const runIdArg = argValue("--run-id");
const baseArg = argValue("--base");
const draftArg = argValue("--draft");
const preflightReportArg = argValue("--preflight-report");
const repairLanguageArg = argValue("--repair-language");
const fileIdArg = argValue("--file-id");
const folderIdArg = argValue("--folder-id");
const titleArg = argValue("--title");
const forceNewFile = args.includes("--new-file");
const geminiQaPack =
  args.includes("--gemini-qa-pack") ||
  args.includes("--with-gemini-qa-pack") ||
  process.env.LUNACARDS_GEMINI_QA_PACK === "1";
const geminiQaModel = argValue("--gemini-model", process.env.LUNACARDS_GEMINI_QA_MODEL ?? "gemini-3.1-pro-preview");
const allowedStages = ["prepare", "base", "draft-preflight", "batch-import", "qa", "export", "deliver", "complete"];
const sourcePreflightNodeArgs = ["--max-old-space-size=8192"];
const TOTAL_DECK_COUNT = 180;

function usage() {
  return [
    "Usage: node scripts/run-deck-production.mjs <Sort|set_id> --stage=<stage> [--execute]",
    "Stages: prepare, base, draft-preflight, batch-import, qa, export, deliver, complete",
    "Stage inputs: --base=<base.jsonl|csv>, --draft=<language-batch.jsonl|csv>, --preflight-report=<report.json>, --repair-language=<code>, --file-id=<sheet_id>, --folder-id=<drive_folder_id>, --title=<sheet_title>, --new-file",
    "Optional QA: --gemini-qa-pack [--gemini-model=<model>] records Gemini Tools prompt packs during the qa stage without making live Gemini calls, including Course Metadata native-style review.",
  ].join("\n");
}

if (!requestedDeck || !stage || !allowedStages.includes(stage)) {
  throw new Error(usage());
}

function argValue(name, fallback = null) {
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function timestampId() {
  return new Date().toISOString().replace(/[-:.]/g, "").replace(/Z$/, "Z");
}

async function sha256File(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

function relativePath(filePath) {
  return path.relative(projectRoot, path.resolve(filePath));
}

function prettyGoogleSheetTitle({ deck, sort, setId }) {
  const deckTitle = deck?.deck ?? deck?.name ?? setId;
  const sortNumber = Number(sort ?? deck?.sort);
  if (Number.isFinite(sortNumber) && sortNumber > 0) {
    return `FlashcardsLuna ${String(sortNumber).padStart(3, "0")} of ${TOTAL_DECK_COUNT} - ${deckTitle}`;
  }
  return `FlashcardsLuna - ${deckTitle}`;
}

function isGeneratedSlugTitle(title) {
  return /^FlashcardsLuna[_-][A-Za-z0-9_-]+(?:_final)?$/.test(String(title ?? ""));
}

function isDeckProgressTitle(title) {
  return new RegExp(`^FlashcardsLuna \\\\d{3} of ${TOTAL_DECK_COUNT} - .+`).test(String(title ?? ""));
}

function deliveryTitle({ titleArg, manifestTitle, workbookPath, deck, sort, setId }) {
  if (titleArg) return titleArg;
  if (manifestTitle && !isGeneratedSlugTitle(manifestTitle) && isDeckProgressTitle(manifestTitle)) return manifestTitle;
  return prettyGoogleSheetTitle({ deck, sort, setId }) ?? path.basename(workbookPath, ".xlsx");
}

function runManifestDir(setId) {
  return path.join(projectRoot, "outputs", "runs", setId);
}

function runManifestPath(setId, runId) {
  return path.join(runManifestDir(setId), `${runId}.json`);
}

async function readJsonAsync(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function findLatestManifest(setId) {
  const dir = runManifestDir(setId);
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(dir, file))
    .filter((file) => !runIdArg || path.basename(file, ".json") === runIdArg)
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return files[0] ?? null;
}

async function loadManifest(setId) {
  const manifestPath = findLatestManifest(setId);
  if (!manifestPath) throw new Error(`No run manifest found for ${setId}. Run --stage=prepare --execute first.`);
  return { manifestPath, manifest: await readJsonAsync(manifestPath) };
}

async function writeManifest(manifestPath, manifest) {
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function runCommand(label, command, commandArgs, options = {}) {
  const startedAt = new Date().toISOString();
  const printable = [command, ...commandArgs].join(" ");
  console.log(`[${label}] ${printable}`);
  try {
    const stdout = execFileSync(command, commandArgs, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: options.maxBuffer ?? 1024 * 1024 * 80,
      env: process.env,
    });
    if (stdout.trim()) console.log(stdout.trim());
    return {
      label,
      command: printable,
      status: "passed",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      stdout_tail: stdout.slice(-4000),
    };
  } catch (error) {
    const stdout = String(error.stdout ?? "");
    const stderr = String(error.stderr ?? "");
    if (stdout.trim()) console.log(stdout.trim());
    if (stderr.trim()) console.error(stderr.trim());
    throw new Error(`${label} failed: ${printable}\n${stderr || stdout || error.message}`);
  }
}

async function updateRunStage(runId, nextStage, status = "running", errorSummary = "") {
  await psqlExec(`
update deck_generation_runs
set
  current_stage = ${sqlString(nextStage)},
  run_status = ${sqlString(status)},
  heartbeat_at = now(),
  updated_at = now(),
  finished_at = case when ${sqlString(status)} = 'running' then null else now() end,
  error_summary = case when ${sqlNullableString(errorSummary)} is null then error_summary else ${sqlNullableString(errorSummary)} end
where run_id = ${sqlString(runId)};
`);
}

async function runningLocksForSetId(setId) {
  return await psqlJson(`
select coalesce(json_agg(row_to_json(active)), '[]'::json)
from (
  select run_id, set_id, current_stage, locked_by, started_at
  from deck_generation_runs
  where set_id = ${sqlString(setId)}
    and run_status = 'running'
) active;
`);
}

async function claimRun({ sort, setId, deckName }) {
  const existing = await runningLocksForSetId(setId);
  if (existing.length > 0) {
    throw new Error(`Deck ${setId} already has a running production lock: ${existing[0].run_id}`);
  }
  const runId = `run_${setId}_${timestampId()}_${randomUUID().slice(0, 8)}`;
  const lockedBy = process.env.LUNACARDS_RUNNER_ID ?? `local:${process.pid}`;
  const rows = await psqlJson(`
with inserted as (
  insert into deck_generation_runs (
    run_id,
    sort,
    set_id,
    deck_name,
    run_status,
    locked_by,
    current_stage,
    language_batch
  )
  values (
    ${sqlString(runId)},
    ${Number(sort)},
    ${sqlString(setId)},
    ${sqlString(deckName)},
    'running',
    ${sqlString(lockedBy)},
    'prepare',
    '{}'::text[]
  )
  returning run_id, sort, set_id, deck_name, run_status, locked_by, started_at, current_stage
)
select coalesce(json_agg(row_to_json(inserted)), '[]'::json)
from inserted;
`);
  if (rows.length !== 1) throw new Error(`Failed to create deck_generation_runs lock for ${setId}`);
  return rows[0];
}

function stageIndex(name) {
  return allowedStages.indexOf(name);
}

function requireStageDone(manifest, requiredStage) {
  if (!manifest.stages?.[requiredStage]?.passed) {
    throw new Error(`Stage ${stage} requires completed stage ${requiredStage}.`);
  }
}

function isAllowedCompleteSpecHashChange(manifest, spec) {
  return (
    stage === "complete" &&
    manifest.stages?.deliver?.passed === true &&
    ["deliver", "complete"].includes(manifest.current_stage) &&
    spec.status === "generated"
  );
}

async function assertPrepareFresh(manifest, spec, candidatePoolPath) {
  const specSha = await sha256File(spec.filePath);
  const poolSha = await sha256File(candidatePoolPath);
  if (manifest.artifacts?.spec_sha256 !== specSha && !isAllowedCompleteSpecHashChange(manifest, spec)) {
    throw new Error("Run manifest prepare stage is stale: spec hash changed.");
  }
  if (manifest.artifacts?.candidate_pool_sha256 !== poolSha) {
    throw new Error("Run manifest prepare stage is stale: candidate pool hash changed.");
  }
}

function parseJsonFromStdout(stdout) {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new Error(`Could not parse JSON from stdout:\n${stdout}`);
  return JSON.parse(stdout.slice(start, end + 1));
}

function runCommandJson(label, command, commandArgs) {
  const result = runCommand(label, command, commandArgs, { maxBuffer: 1024 * 1024 * 120 });
  return { result, json: parseJsonFromStdout(result.stdout_tail) };
}

async function findDeliveryManifest(setId) {
  const outputDir = path.join(projectRoot, "outputs", "google-sheets");
  if (!existsSync(outputDir)) throw new Error(`No outputs/google-sheets directory found for ${setId}`);
  const matches = [];
  for (const file of readdirSync(outputDir)) {
    if (!file.endsWith("_delivery.json")) continue;
    const manifestPath = path.join(outputDir, file);
    const manifest = await readJsonAsync(manifestPath);
    if (manifest.set_id === setId && manifest.export_mode === "final") matches.push({ manifestPath, manifest });
  }
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one final delivery manifest for ${setId}, got ${matches.length}`);
  }
  return matches[0];
}

function qaCommands(setId, spec, options = {}) {
  const commands = [
    [
      "ensure-course-metadata-module-category",
      "node",
      ["scripts/ensure-course-metadata-module-category.mjs", setId],
    ],
    ["db-qa-set", "bash", ["scripts/db-qa-set.sh", setId]],
    ["source-backed-transcriptions", "node", ["scripts/check-source-backed-transcriptions.mjs", setId]],
    ["translation-source-coverage", "node", ["scripts/check-translation-source-coverage.mjs", setId]],
    ["entry-source-backed-translations", "node", ["scripts/check-entry-source-backed-translations.mjs", setId, "--all-languages"]],
    ["qa-evidence", "node", ["scripts/check-qa-evidence.mjs", setId]],
    ["transcription-policy-shape", "node", ["scripts/check-transcription-policy-shape.mjs", setId]],
    ["transcription-style-consistency", "node", ["scripts/check-transcription-style-consistency.mjs", setId]],
    ["transcription-fallbacks", "node", ["scripts/check-transcription-fallbacks.mjs", setId]],
    ["transcription-cross-language-fallbacks", "node", ["scripts/check-transcription-cross-language-fallbacks.mjs", setId]],
    ["ipa-transcription-sanity", "node", ["scripts/check-ipa-transcription-sanity.mjs", setId]],
    ["entry-cross-language-fallbacks", "node", ["scripts/check-entry-cross-language-fallbacks.mjs", setId]],
    ["script-language-identity", "node", ["scripts/check-script-language-identity.mjs", setId]],
    ["latin-diacritic-loss", "node", ["scripts/check-latin-diacritic-loss.mjs", setId]],
    ["meaning-contrast", "node", ["scripts/check-meaning-contrast.mjs", setId]],
    ["semantic-granularity", "node", ["scripts/check-semantic-granularity.mjs", setId]],
    ["article-gender-marker", "node", ["scripts/check-article-gender-marker-consistency.mjs", setId]],
    ["base-example-naturalness", "node", ["scripts/check-base-example-naturalness.mjs", setId]],
    ["example-template-diversity", "node", ["scripts/check-example-template-diversity.mjs", setId]],
    ["target-example-lexical-anchor", "node", ["scripts/check-target-example-lexical-anchor.mjs", setId]],
    ["target-example-pedagogical-quality", "node", ["scripts/check-target-example-pedagogical-quality.mjs", setId]],
    ["example-casing", "node", ["scripts/check-example-casing.mjs", setId]],
    ["semantic-scene-alignment", "node", ["scripts/check-semantic-scene-alignment.mjs", setId]],
    ["target-semantic-scene-alignment", "node", ["scripts/check-target-semantic-scene-alignment.mjs", setId]],
    ["qa-hash-coverage", "node", ["scripts/check-qa-hash-coverage.mjs", setId]],
    ["deck-profile-quality", "node", ["scripts/check-deck-profile-quality.mjs", setId]],
  ];
  if (String(spec.deckProfile ?? "").includes("number_quantity")) {
    commands.push(["number-example-grammar", "node", ["scripts/check-number-example-grammar.mjs", setId]]);
  }
  if (options.geminiQaPack) {
    commands.push([
      "gemini-qa-pack",
      "node",
      [
        "scripts/run-ai-qa.mjs",
        setId,
        "--gemini-pack",
        `--gemini-model=${options.geminiModel ?? "gemini-3.1-pro-preview"}`,
        "--checks=semantic_preservation,target_example_naturalness,target_example_lexical_anchor,target_example_pedagogical_quality,entry_form,entry_form_register,transcription_policy,pronunciation_accuracy",
        "--languages=all",
      ],
    ]);
    commands.push([
      "course-metadata-native-style-pack",
      "node",
      [
        "scripts/export-course-metadata-native-style-review.mjs",
        setId,
        `--gemini-model=${options.geminiModel ?? "gemini-3.1-pro-preview"}`,
        "--languages=all",
      ],
    ]);
  }
  return commands;
}

function stageCommandRecord(stageName, commands, extra = {}) {
  return {
    passed: true,
    stage: stageName,
    completed_at: new Date().toISOString(),
    commands,
    ...extra,
  };
}

const { masterRow, spec } = resolveDeckSpec(requestedDeck);
if (!spec?.setId) throw new Error(`Deck ${requestedDeck} has no resolved spec/set_id.`);
const setId = spec.setId;
const sort = Number(spec.sort || masterRow.sort);
const candidatePoolPath = path.resolve(candidatePoolPathForSetId(setId));
const specPath = path.resolve(spec.filePath);
const runState = stage === "prepare" ? null : await loadManifest(setId);
const manifest = runState?.manifest ?? null;
const manifestPath = runState?.manifestPath ?? null;

if (!execute && ["export", "deliver", "complete"].includes(stage)) {
  throw new Error(`Stage ${stage} mutates files/services and requires --execute.`);
}

if (stage !== "prepare") {
  if (manifest.set_id !== setId) throw new Error(`Run manifest set_id mismatch: ${manifest.set_id} vs ${setId}`);
  if (runIdArg && manifest.run_id !== runIdArg) throw new Error(`Run manifest run_id mismatch: ${manifest.run_id} vs ${runIdArg}`);
  await assertPrepareFresh(manifest, spec, candidatePoolPath);
}

if (stage === "prepare") {
  const commands = [
    runCommand("git-status", "git", ["status", "--short", "--branch"]),
    runCommand("check-deck-specs", "node", ["scripts/check-deck-specs.mjs"]),
    runCommand("check-deck-candidate-pool", "node", ["scripts/check-deck-candidate-pool.mjs", String(requestedDeck)]),
    runCommand("check-word-selection-quality", "node", ["scripts/check-word-selection-quality.mjs", String(requestedDeck)]),
    runCommand("check-deck-ready", "node", ["scripts/check-deck-ready.mjs", String(requestedDeck)]),
  ];
  const specSha = await sha256File(specPath);
  const poolSha = await sha256File(candidatePoolPath);
  if (!execute) {
    console.log(
      JSON.stringify(
        {
          dry_run: true,
          stage,
          set_id: setId,
          sort,
          spec_path: relativePath(specPath),
          spec_sha256: specSha,
          candidate_pool_path: relativePath(candidatePoolPath),
          candidate_pool_sha256: poolSha,
          next: "rerun with --execute to claim runtime lock and write run manifest",
        },
        null,
        2
      )
    );
    process.exit(0);
  }
  const runningLocks = await runningLocksForSetId(setId);
  if (runningLocks.length > 1) throw new Error(`Deck ${setId} has multiple running production locks.`);
  const existingLock = runningLocks[0] ?? null;
  if (existingLock && runIdArg && existingLock.run_id !== runIdArg) {
    throw new Error(`Deck ${setId} has running production lock ${existingLock.run_id}, not requested --run-id=${runIdArg}.`);
  }
  const lock = existingLock ?? (await claimRun({ sort, setId, deckName: spec.deck || masterRow.deck }));
  const runId = lock.run_id;
  const nextManifestPath = runManifestPath(setId, runId);
  const previousManifest = existsSync(nextManifestPath) ? await readJsonAsync(nextManifestPath) : {};
  const nextManifest = {
    ...previousManifest,
    schema_version: 1,
    run_id: runId,
    set_id: setId,
    sort,
    deck_name: spec.deck || masterRow.deck,
    status: "running",
    current_stage: "prepare",
    created_at: previousManifest.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
    runtime_lock: lock,
    artifacts: {
      spec_path: relativePath(specPath),
      spec_sha256: specSha,
      candidate_pool_path: relativePath(candidatePoolPath),
      candidate_pool_sha256: poolSha,
    },
    stages: {
      ...(previousManifest.stages ?? {}),
      prepare: stageCommandRecord("prepare", commands, { runtime_lock_claimed: true }),
    },
  };
  if (existingLock) {
    nextManifest.stages.prepare.runtime_lock_claimed = false;
    nextManifest.stages.prepare.runtime_lock_reused = true;
    await updateRunStage(runId, "prepare");
  }
  await writeManifest(nextManifestPath, nextManifest);
  console.log(`${existingLock ? "Production run prepare refreshed" : "Production run prepared"}: ${relativePath(nextManifestPath)}`);
  process.exit(0);
}

function nextManifestWithStage(stageName, stageRecord, artifactPatch = {}) {
  return {
    ...manifest,
    current_stage: stageName,
    updated_at: new Date().toISOString(),
    artifacts: {
      ...(manifest.artifacts ?? {}),
      ...artifactPatch,
    },
    stages: {
      ...(manifest.stages ?? {}),
      [stageName]: stageRecord,
    },
  };
}

function appendArtifactRecord(manifest, key, record, uniqueBy = "path") {
  const existing = Array.isArray(manifest.artifacts?.[key]) ? manifest.artifacts[key] : [];
  const next = [...existing.filter((item) => item?.[uniqueBy] !== record?.[uniqueBy]), record];
  return next.sort((left, right) =>
    String(left.language_codes?.join(",") ?? left.language_code ?? left[uniqueBy] ?? "").localeCompare(
      String(right.language_codes?.join(",") ?? right.language_code ?? right[uniqueBy] ?? "")
    )
  );
}

if (stage === "base") {
  requireStageDone(manifest, "prepare");
  if (!baseArg) throw new Error("Stage base requires --base=<deck-base.jsonl|csv>.");
  const basePath = path.resolve(baseArg);
  const baseSha = await sha256File(basePath);
  const commands = [runCommand("base-dry-run", "node", ["scripts/import-deck-base-data.mjs", basePath, "--dry-run"])];
  if (execute) {
    commands.push(runCommand("base-import", "node", ["scripts/import-deck-base-data.mjs", basePath]));
    commands.push(runCommand("meaning-contrast", "node", ["scripts/check-meaning-contrast.mjs", setId]));
    commands.push(runCommand("base-example-naturalness", "node", ["scripts/check-base-example-naturalness.mjs", setId]));
    commands.push(runCommand("semantic-scene-alignment", "node", ["scripts/check-semantic-scene-alignment.mjs", setId]));
    const nextManifest = nextManifestWithStage("base", stageCommandRecord("base", commands), {
      base_path: relativePath(basePath),
      base_sha256: baseSha,
    });
    await updateRunStage(manifest.run_id, "base");
    await writeManifest(manifestPath, nextManifest);
    console.log(`Base stage complete: ${relativePath(manifestPath)}`);
  }
  process.exit(0);
}

if (stage === "draft-preflight") {
  requireStageDone(manifest, "base");
  if (!draftArg) throw new Error("Stage draft-preflight requires --draft=<language-batch.jsonl|csv>.");
  const draftPath = path.resolve(draftArg);
  const draftSha = await sha256File(draftPath);
  const outPath = execute
    ? path.join(projectRoot, "outputs", "source-preflight", `${setId}_${path.basename(draftPath).replace(/\W+/g, "_")}_${timestampId()}.json`)
    : path.join("/private/tmp", `${setId}_${path.basename(draftPath).replace(/\W+/g, "_")}_${timestampId()}_source_preflight.json`);
  const commands = [
    runCommand("language-batch-source-preflight", "node", [
      ...sourcePreflightNodeArgs,
      "scripts/check-language-batch-source-preflight.mjs",
      draftPath,
      `--out=${outPath}`,
      "--require-warning-decisions",
    ]),
  ];
  const report = await readJsonAsync(outPath);
  if (report.input_sha256 !== draftSha) throw new Error("Preflight report input_sha256 does not match draft hash.");
  if (execute) {
    const reportSha = await sha256File(outPath);
    const draftPreflightRecord = {
      path: relativePath(outPath),
      sha256: reportSha,
      draft_path: relativePath(draftPath),
      draft_sha256: draftSha,
      language_codes: report.language_codes ?? [],
      rows_checked: report.rows_checked ?? null,
      blocker_count: report.blocker_count ?? null,
      warning_count: report.warning_count ?? null,
      unresolved_warning_decisions: report.warning_review?.unresolved_count ?? null,
      generated_at: report.generated_at ?? null,
    };
    const nextManifest = nextManifestWithStage("draft-preflight", stageCommandRecord("draft-preflight", commands), {
      last_draft_path: relativePath(draftPath),
      last_draft_sha256: draftSha,
      last_preflight_report_path: relativePath(outPath),
      last_preflight_report_sha256: reportSha,
      draft_preflights: appendArtifactRecord(manifest, "draft_preflights", draftPreflightRecord),
    });
    await updateRunStage(manifest.run_id, "draft-preflight");
    await writeManifest(manifestPath, nextManifest);
    console.log(`Draft preflight complete: ${relativePath(outPath)}`);
  }
  process.exit(0);
}

if (stage === "batch-import") {
  requireStageDone(manifest, "draft-preflight");
  if (!draftArg && !manifest.artifacts?.last_draft_path) {
    throw new Error("Stage batch-import requires --draft=<language-batch.jsonl|csv> or a previous draft-preflight artifact.");
  }
  const draftPath = path.resolve(draftArg ?? manifest.artifacts.last_draft_path);
  const reportPathRaw = preflightReportArg ?? manifest.artifacts?.last_preflight_report_path;
  if (!reportPathRaw) throw new Error("Stage batch-import requires --preflight-report=<report.json>.");
  const reportPath = path.resolve(reportPathRaw);
  if (!existsSync(reportPath)) throw new Error(`Preflight report does not exist: ${reportPath}`);
  const draftSha = await sha256File(draftPath);
  const report = await readJsonAsync(reportPath);
  if (report.input_sha256 !== draftSha) throw new Error("Draft changed after source preflight; rerun draft-preflight.");
  const importPreflightOutPath = execute
    ? path.join(projectRoot, "outputs", "source-preflight", `${setId}_${path.basename(draftPath).replace(/\W+/g, "_")}_import_${timestampId()}.json`)
    : path.join("/private/tmp", `${setId}_${path.basename(draftPath).replace(/\W+/g, "_")}_${timestampId()}_import_preflight.json`);
  const commands = [
    runCommand("language-batch-import", "node", [
      "scripts/import-language-batch.mjs",
      draftPath,
      `--expected-preflight-report=${reportPath}`,
      `--source-preflight-out=${importPreflightOutPath}`,
      "--require-warning-decisions",
      ...(repairLanguageArg ? [`--repair-language=${repairLanguageArg}`] : []),
      ...(execute ? [] : ["--dry-run"]),
    ]),
  ];
  if (execute) {
    const importReport = await readJsonAsync(importPreflightOutPath);
    if (importReport.preflight_reused !== true) {
      throw new Error(`Batch import did not reuse the expected preflight report: ${importPreflightOutPath}`);
    }
    const languageImportRecord = {
      path: relativePath(importPreflightOutPath),
      sha256: await sha256File(importPreflightOutPath),
      draft_path: relativePath(draftPath),
      draft_sha256: draftSha,
      expected_preflight_report_path: relativePath(reportPath),
      expected_preflight_report_sha256: await sha256File(reportPath),
      language_codes: importReport.language_codes ?? report.language_codes ?? [],
      rows_checked: importReport.rows_checked ?? null,
      blocker_count: importReport.blocker_count ?? null,
      warning_count: importReport.warning_count ?? null,
      unresolved_warning_decisions: importReport.warning_review?.unresolved_count ?? null,
      preflight_reused: true,
      imported_at: importReport.generated_at ?? new Date().toISOString(),
      ...(repairLanguageArg ? { repair_language: repairLanguageArg } : {}),
    };
    const nextManifest = nextManifestWithStage("batch-import", stageCommandRecord("batch-import", commands), {
      last_imported_draft_path: relativePath(draftPath),
      last_imported_draft_sha256: draftSha,
      last_expected_preflight_report_path: relativePath(reportPath),
      last_expected_preflight_report_sha256: languageImportRecord.expected_preflight_report_sha256,
      last_import_preflight_report_path: relativePath(importPreflightOutPath),
      last_import_preflight_report_sha256: languageImportRecord.sha256,
      last_import_preflight_reused: true,
      language_imports: appendArtifactRecord(manifest, "language_imports", languageImportRecord),
      ...(repairLanguageArg ? { last_repair_language: repairLanguageArg } : {}),
    });
    await updateRunStage(manifest.run_id, "batch-import");
    await writeManifest(manifestPath, nextManifest);
    console.log(`Batch import complete: ${relativePath(manifestPath)}`);
  }
  process.exit(0);
}

if (stage === "qa") {
  requireStageDone(manifest, "batch-import");
  const commands = qaCommands(setId, spec, { geminiQaPack, geminiModel: geminiQaModel }).map(
    ([label, command, commandArgs]) => runCommand(label, command, commandArgs)
  );
  if (execute) {
    const nextManifest = nextManifestWithStage(
      "qa",
      stageCommandRecord("qa", commands, {
        gemini_qa_pack_requested: geminiQaPack,
        ...(geminiQaPack ? { gemini_qa_model: geminiQaModel } : {}),
      })
    );
    await updateRunStage(manifest.run_id, "qa");
    await writeManifest(manifestPath, nextManifest);
    console.log(`QA stage complete: ${relativePath(manifestPath)}`);
  }
  process.exit(0);
}

if (stage === "export") {
  requireStageDone(manifest, "qa");
  const commands = [runCommand("final-export", "node", ["scripts/export-flashcards-working-sheet.mjs", setId, "--final"], { maxBuffer: 1024 * 1024 * 220 })];
  const { manifestPath: deliveryManifestPath, manifest: deliveryManifest } = await findDeliveryManifest(setId);
  const workbookPath = path.resolve(deliveryManifest.workbook_path);
  const nextManifest = nextManifestWithStage("export", stageCommandRecord("export", commands), {
    final_workbook_path: relativePath(workbookPath),
    final_workbook_sha256: await sha256File(workbookPath),
    delivery_manifest_path: relativePath(deliveryManifestPath),
    delivery_manifest_sha256: await sha256File(deliveryManifestPath),
  });
  await updateRunStage(manifest.run_id, "export");
  await writeManifest(manifestPath, nextManifest);
  console.log(`Export stage complete: ${relativePath(deliveryManifestPath)}`);
  process.exit(0);
}

if (stage === "deliver") {
  requireStageDone(manifest, "export");
  const delivery = await findDeliveryManifest(setId);
  const workbookPath = path.resolve(delivery.manifest.workbook_path);
  const driveFolderId = folderIdArg ?? delivery.manifest.drive_folder_id ?? "1mrg1eiUkOK5RFEN61EfEDMTH8dbMiNei";
  const title = deliveryTitle({
    titleArg,
    manifestTitle: delivery.manifest.google_sheet_title,
    workbookPath,
    deck: spec,
    sort,
    setId,
  });
  const fileId = forceNewFile ? null : (fileIdArg ?? delivery.manifest.google_sheet_id);
  const commands = [];
  commands.push(
    runCommand("google-sheet-upload", "node", [
      "scripts/upload-spreadsheet-to-drive-folder.mjs",
      workbookPath,
      ...(fileId ? [`--file-id=${fileId}`] : [`--folder-id=${driveFolderId}`]),
      `--title=${title}`,
    ])
  );
  commands.push(runCommand("google-sheet-readback", "node", ["scripts/check-google-sheet-readback.mjs", setId]));
  const auditBatch = runCommandJson("export-final-linguistic-audit-batch", "node", [
    "scripts/export-final-linguistic-audit-batch.mjs",
    setId,
  ]);
  commands.push(auditBatch.result);
  const auditRun = runCommandJson("run-final-linguistic-audit", "node", [
    "scripts/run-final-linguistic-audit.mjs",
    auditBatch.json.output_path,
  ]);
  commands.push(auditRun.result);
  if (Number(auditRun.json.needs_review) > 0 || Number(auditRun.json.fail) > 0) {
    throw new Error(
      `Post-final linguistic audit did not pass: needs_review=${auditRun.json.needs_review}, fail=${auditRun.json.fail}, summary=${auditRun.json.summary_path}`
    );
  }
  commands.push(runCommand("import-final-linguistic-audit-results", "node", [
    "scripts/import-final-linguistic-audit-results.mjs",
    auditRun.json.output_path,
  ]));
  commands.push(runCommand("final-export-after-audit", "node", ["scripts/export-flashcards-working-sheet.mjs", setId, "--final"], { maxBuffer: 1024 * 1024 * 220 }));
  const refreshedDelivery = await findDeliveryManifest(setId);
  const refreshedWorkbook = path.resolve(refreshedDelivery.manifest.workbook_path);
  const refreshedFileId = forceNewFile ? refreshedDelivery.manifest.google_sheet_id : (fileIdArg ?? refreshedDelivery.manifest.google_sheet_id);
  if (!refreshedFileId) throw new Error("Cannot refresh delivery after audit import: Google Sheet file id is missing.");
  commands.push(
    runCommand("google-sheet-refresh-after-audit", "node", [
      "scripts/upload-spreadsheet-to-drive-folder.mjs",
      refreshedWorkbook,
      `--file-id=${refreshedFileId}`,
      `--title=${title}`,
    ])
  );
  commands.push(runCommand("google-sheet-readback-after-audit", "node", ["scripts/check-google-sheet-readback.mjs", setId]));
  commands.push(runCommand("delivery-freshness", "node", ["scripts/check-delivery-freshness.mjs", setId]));
  const finalDelivery = await findDeliveryManifest(setId);
  const nextManifest = nextManifestWithStage("deliver", stageCommandRecord("deliver", commands), {
    final_workbook_path: relativePath(path.resolve(finalDelivery.manifest.workbook_path)),
    final_workbook_sha256: await sha256File(path.resolve(finalDelivery.manifest.workbook_path)),
    delivery_manifest_path: relativePath(finalDelivery.manifestPath),
    delivery_manifest_sha256: await sha256File(finalDelivery.manifestPath),
    google_sheet_id: finalDelivery.manifest.google_sheet_id,
    final_linguistic_audit_summary_path: relativePath(auditRun.json.summary_path),
  });
  await updateRunStage(manifest.run_id, "deliver");
  await writeManifest(manifestPath, nextManifest);
  console.log(`Delivery stage complete: ${relativePath(manifestPath)}`);
  process.exit(0);
}

if (stage === "complete") {
  requireStageDone(manifest, "deliver");
  const commands = [runCommand("delivery-freshness", "node", ["scripts/check-delivery-freshness.mjs", setId])];
  const finalDelivery = await findDeliveryManifest(setId);
  const nextManifest = {
    ...nextManifestWithStage("complete", stageCommandRecord("complete", commands), {
      spec_path: relativePath(specPath),
      spec_sha256: await sha256File(specPath),
      candidate_pool_path: relativePath(candidatePoolPath),
      candidate_pool_sha256: await sha256File(candidatePoolPath),
      final_workbook_path: relativePath(path.resolve(finalDelivery.manifest.workbook_path)),
      final_workbook_sha256: await sha256File(path.resolve(finalDelivery.manifest.workbook_path)),
      delivery_manifest_path: relativePath(finalDelivery.manifestPath),
      delivery_manifest_sha256: await sha256File(finalDelivery.manifestPath),
      google_sheet_id: finalDelivery.manifest.google_sheet_id,
    }),
    status: "completed",
  };
  await updateRunStage(manifest.run_id, "complete", "completed");
  await writeManifest(manifestPath, nextManifest);
  console.log(`Production run complete: ${relativePath(manifestPath)}`);
}
