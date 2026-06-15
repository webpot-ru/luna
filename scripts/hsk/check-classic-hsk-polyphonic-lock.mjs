#!/usr/bin/env node
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const defaultReleaseIds = [
  "hsk2_classic_level_1_150_v1",
  "hsk2_classic_level_2_150_v1",
  "hsk2_classic_level_3_300_v1",
  "hsk2_classic_level_4_600_v1",
  "hsk2_classic_level_5_1300_v1",
];

const args = process.argv.slice(2);
const releaseIds = args.filter((arg) => !arg.startsWith("--"));
const selectedReleaseIds = releaseIds.length ? releaseIds : defaultReleaseIds;
const outputDir = path.resolve("outputs/hsk");
const qaDir = path.join(outputDir, "qa");
const lockPath = path.resolve("config/hsk-classic-polyphonic-lock.json");
const ruleVersion = "classic-hsk-polyphonic-lock-v1";

function todayStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/gu, "");
}

function reportStem(releases) {
  if (releases.length === 5 && releases.every((releaseId, index) => releaseId === defaultReleaseIds[index])) {
    return "hsk2_classic_levels_1_5";
  }
  if (releases.length === 1) return releases[0];
  return `hsk2_classic_${releases.length}_releases`;
}

function parseJsonFromStdout(stdout, commandLabel) {
  const text = String(stdout ?? "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Could not parse JSON output from ${commandLabel}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text.slice(start, end + 1));
}

async function runSemanticGate(releaseId) {
  const label = `node scripts/hsk/check-classic-hsk-semantic-pinyin-gate.mjs ${releaseId}`;
  try {
    const { stdout, stderr } = await execFileAsync("node", ["scripts/hsk/check-classic-hsk-semantic-pinyin-gate.mjs", releaseId], {
      maxBuffer: 1024 * 1024 * 80,
    });
    const parsed = parseJsonFromStdout(stdout, label);
    return { release_id: releaseId, status: "ok", stdout, stderr, parsed };
  } catch (error) {
    return {
      release_id: releaseId,
      status: "failed",
      stdout: String(error.stdout ?? ""),
      stderr: String(error.stderr ?? error.message ?? ""),
      parsed: null,
    };
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function issueKey(item) {
  return [
    item.release_id,
    item.hsk_key,
    item.type ?? item.needs_review_type,
    item.simplified,
    item.pinyin,
  ].join("|");
}

function blocker(message, extra = {}) {
  return { message, ...extra };
}

async function main() {
  await fs.mkdir(qaDir, { recursive: true });
  const lockConfig = await readJson(lockPath);
  if (lockConfig.rule_version !== ruleVersion) {
    throw new Error(`Unsupported polyphonic lock rule_version: ${lockConfig.rule_version}`);
  }

  const selectedSet = new Set(selectedReleaseIds);
  const locks = lockConfig.locks.filter((lock) => selectedSet.has(lock.release_id));
  const locksByKey = new Map(locks.map((lock) => [issueKey(lock), lock]));
  const seenIssueKeys = new Set();
  const blockers = [];
  const releaseReports = [];

  for (const releaseId of selectedReleaseIds) {
    if (!/^hsk2_classic_level_\d+_\d+_v\d+$/u.test(releaseId)) {
      blockers.push(blocker("Unsafe or unsupported release id", { release_id: releaseId }));
      continue;
    }

    const run = await runSemanticGate(releaseId);
    let semanticReport = null;
    if (run.status !== "ok") {
      blockers.push(blocker("Semantic pinyin gate failed while enforcing polyphonic lock", { release_id: releaseId, stderr: run.stderr }));
    } else {
      semanticReport = await readJson(run.parsed.report);
      if (Number(semanticReport.blockers ?? 0) !== 0) {
        blockers.push(blocker("Semantic pinyin gate has hard blockers", { release_id: releaseId, blockers: semanticReport.blockers }));
      }
      for (const item of semanticReport.needs_review_samples ?? []) {
        const enriched = { release_id: releaseId, ...item };
        const key = issueKey(enriched);
        seenIssueKeys.add(key);
        if (!locksByKey.has(key)) {
          blockers.push(blocker("Unapproved semantic pinyin needs_review row", { release_id: releaseId, issue: enriched }));
        }
      }
    }

    releaseReports.push({
      release_id: releaseId,
      command_status: run.status,
      semantic_report: run.parsed?.report ?? "",
      semantic_blockers: semanticReport?.blockers ?? null,
      semantic_needs_review: semanticReport?.needs_review ?? null,
      controlled_needs_review: (semanticReport?.needs_review_samples ?? []).filter((item) => locksByKey.has(issueKey({ release_id: releaseId, ...item }))).length,
    });
  }

  for (const lock of locks) {
    const key = issueKey(lock);
    if (!seenIssueKeys.has(key)) {
      blockers.push(blocker("Polyphonic lock entry was not observed in current semantic pinyin needs_review output", { lock }));
    }
  }

  const report = {
    rule_version: ruleVersion,
    generated_at: new Date().toISOString(),
    release_ids: selectedReleaseIds,
    lock_config: path.relative(process.cwd(), lockPath),
    status: blockers.length ? "blocked" : "ok",
    locks_checked: locks.length,
    controlled_needs_review: seenIssueKeys.size,
    releases: releaseReports,
    blockers,
    notes: [
      "This gate turns known HSK cross-level polyphonic needs_review rows into an explicit executable lock.",
      "Any new semantic pinyin needs_review row is a blocker until it is repaired or deliberately added to the lock with a release-specific reason.",
      "It does not perform manual/native review and does not mutate ordinary deck, Oxford, Polyglot, database or Google Sheet state.",
    ],
  };

  const reportPath = path.join(qaDir, `${reportStem(selectedReleaseIds)}_polyphonic_lock_${todayStamp()}.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        status: report.status,
        report: path.relative(process.cwd(), reportPath),
        releases: selectedReleaseIds.length,
        locks_checked: locks.length,
        controlled_needs_review: seenIssueKeys.size,
        blockers: blockers.length,
      },
      null,
      2
    )
  );

  if (blockers.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
