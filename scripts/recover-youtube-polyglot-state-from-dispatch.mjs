#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function parseArgs(argv) {
  const options = {
    report: "",
    runIds: [],
    artifactRoot: "outputs/youtube-polyglot-child-state-recovery",
    output: "outputs/youtube-polyglot-child-state-recovery-summary.json",
    mergeScript: "scripts/merge-youtube-publish-state.mjs",
  };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--report=")) options.report = arg.slice("--report=".length);
    else if (arg.startsWith("--run-ids=")) options.runIds.push(...splitCsv(arg.slice("--run-ids=".length)));
    else if (arg.startsWith("--run-id=")) options.runIds.push(arg.slice("--run-id=".length));
    else if (arg.startsWith("--artifact-root=")) options.artifactRoot = arg.slice("--artifact-root=".length);
    else if (arg.startsWith("--output=")) options.output = arg.slice("--output=".length);
    else if (arg.startsWith("--merge-script=")) options.mergeScript = arg.slice("--merge-script=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/recover-youtube-polyglot-state-from-dispatch.mjs --report=outputs/youtube-polyglot-bulk-publish-dispatcher-report.json",
    "  node scripts/recover-youtube-polyglot-state-from-dispatch.mjs --run-ids=123,456",
    "",
    "Downloads child workflow artifacts and merges Polyglot publication/progress/playlist",
    "state into the current checkout. This does not call YouTube or upload videos.",
  ].join("\n");
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function collectRunIdsFromReport(reportPath) {
  if (!reportPath || !fs.existsSync(reportPath)) return [];
  const report = readJson(reportPath);
  const rows = [
    ...(report.execution?.results || []),
    ...(report.results || []),
  ];
  const ids = [];
  for (const row of rows) {
    if (!row?.runId) continue;
    const status = String(row.status || "");
    if (
      row.needsStateRecovery
      || status === "state_persist_failed"
      || row.failure?.kind === "state_persist_failed"
    ) {
      ids.push(String(row.runId));
    }
  }
  return ids;
}

async function gh(args, options = {}) {
  const attempts = options.retries || 1;
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const { stdout, stderr } = await execFileAsync("gh", args, {
        env: process.env,
        maxBuffer: options.maxBuffer || 1024 * 1024 * 40,
      });
      return { stdout, stderr };
    } catch (error) {
      lastError = error;
      const message = String(error?.stderr || error?.stdout || error?.message || error);
      const retryable = /API rate limit exceeded|secondary rate limit|HTTP 5\d\d|ECONNRESET|ETIMEDOUT|fetch failed|Could not resolve host/iu.test(message);
      if (!retryable || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, (options.retryBaseMs || 3000) * attempt));
    }
  }
  throw lastError;
}

function findArtifactStateRoots(rootDir) {
  const roots = [];
  function walk(current) {
    if (!fs.existsSync(current)) return;
    const configPath = path.join(current, "config", "youtube-polyglot-published-videos.json");
    if (fs.existsSync(configPath)) {
      roots.push(current);
      return;
    }
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(current, entry.name));
    }
  }
  walk(rootDir);
  return roots;
}

async function mergeArtifactRoot(artifactDir, summaryPath, mergeScript) {
  const { stdout } = await execFileAsync(process.execPath, [
    mergeScript,
    `--artifact-dir=${artifactDir}`,
    `--summary=${summaryPath}`,
  ], {
    env: process.env,
    maxBuffer: 1024 * 1024 * 20,
  });
  return stdout ? JSON.parse(stdout) : readJson(summaryPath);
}

async function recoverRun(runId, options) {
  const runDir = path.resolve(options.artifactRoot, String(runId));
  fs.mkdirSync(runDir, { recursive: true });
  const result = {
    runId,
    artifactDir: runDir,
    downloaded: false,
    stateRootCount: 0,
    mergeSummaries: [],
    errors: [],
  };

  try {
    await gh(["run", "download", String(runId), "--dir", runDir], { retries: 4, retryBaseMs: 3000 });
    result.downloaded = true;
  } catch (error) {
    result.errors.push(String(error?.stderr || error?.stdout || error?.message || error));
    return result;
  }

  const roots = findArtifactStateRoots(runDir);
  result.stateRootCount = roots.length;
  if (!roots.length) {
    result.errors.push("No Polyglot state artifact root found.");
    return result;
  }

  for (let index = 0; index < roots.length; index += 1) {
    const summaryPath = path.resolve(options.artifactRoot, `merge-summary-${runId}-${index + 1}.json`);
    try {
      result.mergeSummaries.push(await mergeArtifactRoot(roots[index], summaryPath, options.mergeScript));
    } catch (error) {
      result.errors.push(String(error?.stderr || error?.stdout || error?.message || error));
    }
  }
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const runIds = [...new Set([
    ...collectRunIdsFromReport(options.report),
    ...options.runIds,
  ].map(String).filter(Boolean))];

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceReport: options.report || "",
    runIds,
    recovered: [],
  };

  for (const runId of runIds) {
    summary.recovered.push(await recoverRun(runId, options));
  }

  summary.okCount = summary.recovered.filter((row) => row.downloaded && row.stateRootCount > 0 && row.errors.length === 0).length;
  summary.errorCount = summary.recovered.filter((row) => row.errors.length > 0).length;
  writeJson(options.output, summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
