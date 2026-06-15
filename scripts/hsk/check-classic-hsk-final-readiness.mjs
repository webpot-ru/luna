#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { psqlJson, sqlLiteralList } from "../lib/qa-utils.mjs";

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
const skipGoogleReadback = args.includes("--skip-google-readback");
const skipDbSync = args.includes("--skip-db-sync");
const outputDir = path.resolve("outputs/hsk");
const qaDir = path.join(outputDir, "qa");
const ruleVersion = "classic-hsk-final-readiness-v1";

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

async function runNodeScript(scriptPath, scriptArgs, { parseJson = true, maxBuffer = 1024 * 1024 * 80 } = {}) {
  const label = `node ${[scriptPath, ...scriptArgs].join(" ")}`;
  const startedAt = new Date().toISOString();
  try {
    const { stdout, stderr } = await execFileAsync("node", [scriptPath, ...scriptArgs], { maxBuffer });
    const finishedAt = new Date().toISOString();
    return {
      label,
      status: "ok",
      started_at: startedAt,
      finished_at: finishedAt,
      stdout: String(stdout ?? ""),
      stderr: String(stderr ?? ""),
      parsed: parseJson ? parseJsonFromStdout(stdout, label) : null,
    };
  } catch (error) {
    const finishedAt = new Date().toISOString();
    return {
      label,
      status: "failed",
      started_at: startedAt,
      finished_at: finishedAt,
      stdout: String(error.stdout ?? ""),
      stderr: String(error.stderr ?? error.message ?? ""),
      exit_code: error.code ?? 1,
      parsed: null,
    };
  }
}

async function sha256File(filePath) {
  return createHash("sha256").update(await fs.readFile(filePath)).digest("hex");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function parseReadbackStdout(stdout, releaseId) {
  const okLine = String(stdout ?? "")
    .split(/\r?\n/u)
    .find((line) => line.startsWith("HSK Google Sheet readback OK:"));
  if (!okLine) return { release_id: releaseId, status: "missing_ok_line" };
  const rows = Number(okLine.match(/rows=(\d+)/u)?.[1] ?? 0);
  const columns = Number(okLine.match(/columns=(\d+)/u)?.[1] ?? 0);
  const cells = Number(okLine.match(/cells=(\d+)/u)?.[1] ?? 0);
  return { release_id: releaseId, status: "ok", rows, columns, cells };
}

function expectedRowsFromReleaseId(releaseId) {
  const match = releaseId.match(/level_\d+_(\d+)_/u);
  if (!match) throw new Error(`Unsupported release id: ${releaseId}`);
  return Number(match[1]);
}

async function collectManifestState(releaseId) {
  const workbookPath = path.join(outputDir, `${releaseId}.xlsx`);
  const manifestPath = path.join(outputDir, `${releaseId}_delivery.json`);
  const workbookSha = await sha256File(workbookPath);
  const manifest = await readJson(manifestPath);
  return {
    release_id: releaseId,
    workbook: path.relative(process.cwd(), workbookPath),
    delivery_manifest: path.relative(process.cwd(), manifestPath),
    workbook_sha256: workbookSha,
    google_sheet_url: manifest.google_sheet_url ?? manifest.google_sheet_web_url ?? "",
    google_sheet_upload_status: manifest.google_sheet_upload_status ?? "",
    google_sheet_uploaded_at: manifest.google_sheet_uploaded_at ?? "",
    google_sheet_uploaded_workbook_sha256: manifest.google_sheet_uploaded_workbook_sha256 ?? "",
    google_sheet_readback_status: manifest.google_sheet_readback_status ?? "",
    google_sheet_readback_verified_at: manifest.google_sheet_readback_verified_at ?? "",
    google_sheet_readback_sample_count: manifest.google_sheet_readback_sample_count ?? 0,
    google_sheet_readback_workbook_sha256: manifest.google_sheet_readback_workbook_sha256 ?? "",
    upload_hash_matches_current_workbook: workbookSha === manifest.google_sheet_uploaded_workbook_sha256,
    readback_hash_matches_current_workbook: workbookSha === manifest.google_sheet_readback_workbook_sha256,
  };
}

async function collectDbState(releases) {
  const releaseList = sqlLiteralList(releases);
  return psqlJson(`
    select coalesce(json_agg(row_to_json(t) order by release_id), '[]'::json)
    from (
      select
        release_id,
        count(*)::int as rows,
        min(hsk_order)::int as min_order,
        max(hsk_order)::int as max_order,
        count(*) filter (where pinyin ~ '[1-5]')::int as word_tone_number_hits,
        count(*) filter (where example_pinyin ~ '[1-5]')::int as example_tone_number_hits
      from hsk_classic_source_items
      where release_id in (${releaseList})
      group by release_id
    ) t;
  `);
}

function hasBlockingGateIssue(gate) {
  if (!gate || gate.status !== "ok") return true;
  const parsed = gate.parsed ?? {};
  return Number(parsed.blockers ?? 0) !== 0;
}

function readinessIssue(message, extra = {}) {
  return { message, ...extra };
}

async function main() {
  await fs.mkdir(qaDir, { recursive: true });

  const releaseReports = [];
  const blockers = [];
  const warnings = [];

  for (const releaseId of selectedReleaseIds) {
    if (!/^hsk2_classic_level_\d+_\d+_v\d+$/u.test(releaseId)) {
      blockers.push(readinessIssue(`Unsafe or unsupported release id: ${releaseId}`));
      continue;
    }

    const [releaseGate, chineseGate, semanticPinyinGate, pinyinAlignmentGate, exampleComplexityGate, sourceAudit] = await Promise.all([
      runNodeScript("scripts/hsk/check-classic-hsk-release.mjs", [releaseId]),
      runNodeScript("scripts/hsk/check-classic-hsk-chinese-gate.mjs", [releaseId]),
      runNodeScript("scripts/hsk/check-classic-hsk-semantic-pinyin-gate.mjs", [releaseId]),
      runNodeScript("scripts/hsk/check-classic-hsk-pinyin-alignment-gate.mjs", [releaseId]),
      runNodeScript("scripts/hsk/check-classic-hsk-example-complexity-gate.mjs", [releaseId]),
      runNodeScript("scripts/hsk/check-classic-hsk-source-audit.mjs", [releaseId]),
    ]);

    let googleReadback = { release_id: releaseId, skipped: skipGoogleReadback };
    if (!skipGoogleReadback) {
      const readbackRun = await runNodeScript(
        "scripts/hsk/check-classic-hsk-google-sheet-readback.mjs",
        [releaseId],
        { parseJson: false, maxBuffer: 1024 * 1024 * 40 }
      );
      googleReadback = {
        ...parseReadbackStdout(readbackRun.stdout, releaseId),
        command_status: readbackRun.status,
        stderr: readbackRun.stderr,
      };
      if (readbackRun.status !== "ok") {
        blockers.push(readinessIssue("Google Sheet live readback failed", { release_id: releaseId, stderr: readbackRun.stderr }));
      }
    }

    const manifest = await collectManifestState(releaseId).catch((error) => ({
      release_id: releaseId,
      status: "failed",
      error: error.message,
    }));

    const releaseReport = {
      release_id: releaseId,
      expected_rows: expectedRowsFromReleaseId(releaseId),
      release_gate: releaseGate.parsed,
      chinese_gate: chineseGate.parsed,
      semantic_pinyin_gate: semanticPinyinGate.parsed,
      pinyin_alignment_gate: pinyinAlignmentGate.parsed,
      example_complexity_gate: exampleComplexityGate.parsed,
      source_audit: sourceAudit.parsed,
      gate_commands: {
        release_gate: releaseGate.status,
        chinese_gate: chineseGate.status,
        semantic_pinyin_gate: semanticPinyinGate.status,
        pinyin_alignment_gate: pinyinAlignmentGate.status,
        example_complexity_gate: exampleComplexityGate.status,
        source_audit: sourceAudit.status,
      },
      manifest,
      google_readback: googleReadback,
    };
    releaseReports.push(releaseReport);

    if (releaseGate.status !== "ok") blockers.push(readinessIssue("HSK release gate failed", { release_id: releaseId, stderr: releaseGate.stderr }));
    if (hasBlockingGateIssue(chineseGate)) blockers.push(readinessIssue("HSK Chinese gate has blockers", { release_id: releaseId, gate: chineseGate.parsed }));
    if (hasBlockingGateIssue(semanticPinyinGate)) blockers.push(readinessIssue("HSK semantic pinyin gate has blockers", { release_id: releaseId, gate: semanticPinyinGate.parsed }));
    if (hasBlockingGateIssue(pinyinAlignmentGate)) blockers.push(readinessIssue("HSK pinyin alignment gate has blockers", { release_id: releaseId, gate: pinyinAlignmentGate.parsed, stderr: pinyinAlignmentGate.stderr }));
    if (hasBlockingGateIssue(exampleComplexityGate)) blockers.push(readinessIssue("HSK example complexity gate has blockers", { release_id: releaseId, gate: exampleComplexityGate.parsed, stderr: exampleComplexityGate.stderr }));
    if (hasBlockingGateIssue(sourceAudit)) blockers.push(readinessIssue("HSK source audit has blockers", { release_id: releaseId, gate: sourceAudit.parsed }));

    if (Number(semanticPinyinGate.parsed?.needs_review ?? 0) > 0) {
      warnings.push(readinessIssue("Semantic pinyin gate has tracked needs_review rows", {
        release_id: releaseId,
        needs_review: semanticPinyinGate.parsed.needs_review,
      }));
    }
    if (Number(pinyinAlignmentGate.parsed?.warnings ?? 0) > 0) {
      warnings.push(readinessIssue("Pinyin alignment gate has warnings", {
        release_id: releaseId,
        warnings: pinyinAlignmentGate.parsed.warnings,
      }));
    }
    if (Number(exampleComplexityGate.parsed?.warnings ?? 0) > 0) {
      warnings.push(readinessIssue("Example complexity gate has warnings", {
        release_id: releaseId,
        warnings: exampleComplexityGate.parsed.warnings,
      }));
    }
    if (manifest.status === "failed") {
      blockers.push(readinessIssue("Delivery manifest could not be read", { release_id: releaseId, error: manifest.error }));
    } else {
      if (manifest.google_sheet_upload_status !== "uploaded") {
        blockers.push(readinessIssue("Google Sheet upload status is not uploaded", { release_id: releaseId }));
      }
      if (manifest.google_sheet_readback_status !== "verified") {
        blockers.push(readinessIssue("Google Sheet manifest readback status is not verified", { release_id: releaseId }));
      }
      if (!manifest.upload_hash_matches_current_workbook) {
        blockers.push(readinessIssue("Google Sheet uploaded hash does not match current workbook", { release_id: releaseId }));
      }
      if (!manifest.readback_hash_matches_current_workbook) {
        blockers.push(readinessIssue("Google Sheet readback hash does not match current workbook", { release_id: releaseId }));
      }
    }
  }

  const polyphonicLock = await runNodeScript("scripts/hsk/check-classic-hsk-polyphonic-lock.mjs", selectedReleaseIds, {
    maxBuffer: 1024 * 1024 * 80,
  });
  if (polyphonicLock.status !== "ok") {
    blockers.push(readinessIssue("HSK polyphonic lock gate failed", { stderr: polyphonicLock.stderr }));
  } else if (Number(polyphonicLock.parsed?.blockers ?? 0) !== 0) {
    blockers.push(readinessIssue("HSK polyphonic lock gate has blockers", { gate: polyphonicLock.parsed }));
  }

  let dbImport = { skipped: skipDbSync };
  if (!skipDbSync) {
    const importRun = await runNodeScript("scripts/hsk/import-classic-hsk-source-to-db.mjs", selectedReleaseIds, {
      maxBuffer: 1024 * 1024 * 40,
    });
    dbImport = {
      command_status: importRun.status,
      stderr: importRun.stderr,
      parsed: importRun.parsed,
    };
    if (importRun.status !== "ok") {
      blockers.push(readinessIssue("HSK DB source import/sync failed", { stderr: importRun.stderr }));
    } else if (Number(importRun.parsed?.blockers ?? 0) !== 0 || Number(importRun.parsed?.db?.readback_mismatches?.length ?? 0) !== 0) {
      blockers.push(readinessIssue("HSK DB source import/sync reported blockers or readback mismatches", { import: importRun.parsed }));
    }
  }

  const dbState = await collectDbState(selectedReleaseIds).catch((error) => {
    blockers.push(readinessIssue("Could not query HSK DB source state", { error: error.message }));
    return [];
  });
  const dbStateByRelease = new Map(dbState.map((row) => [row.release_id, row]));
  for (const releaseId of selectedReleaseIds) {
    const expectedRows = expectedRowsFromReleaseId(releaseId);
    const row = dbStateByRelease.get(releaseId);
    if (!row) {
      blockers.push(readinessIssue("Missing release in hsk_classic_source_items", { release_id: releaseId }));
      continue;
    }
    if (Number(row.rows) !== expectedRows || Number(row.min_order) !== 1 || Number(row.max_order) !== expectedRows) {
      blockers.push(readinessIssue("HSK DB source row range mismatch", { release_id: releaseId, db: row, expected_rows: expectedRows }));
    }
    if (Number(row.word_tone_number_hits) !== 0 || Number(row.example_tone_number_hits) !== 0) {
      blockers.push(readinessIssue("HSK DB source contains pinyin tone numbers", { release_id: releaseId, db: row }));
    }
  }

  const report = {
    rule_version: ruleVersion,
    generated_at: new Date().toISOString(),
    release_ids: selectedReleaseIds,
    status: blockers.length ? "blocked" : "ok",
    skipped: {
      google_readback: skipGoogleReadback,
      db_sync: skipDbSync,
    },
    db_import: dbImport,
    db_state: dbState,
    polyphonic_lock: polyphonicLock.parsed,
    releases: releaseReports,
    blockers,
    warnings,
  };

  const stem = reportStem(selectedReleaseIds);
  const jsonPath = path.join(qaDir, `${stem}_final_readiness_${todayStamp()}.json`);
  const mdPath = path.join(qaDir, `${stem}_final_readiness_${todayStamp()}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(mdPath, renderMarkdown(report, jsonPath), "utf8");

  console.log(
    JSON.stringify(
      {
        status: report.status,
        report: path.relative(process.cwd(), jsonPath),
        markdown: path.relative(process.cwd(), mdPath),
        releases: selectedReleaseIds.length,
        blockers: blockers.length,
        warnings: warnings.length,
        google_readback_skipped: skipGoogleReadback,
        db_sync_skipped: skipDbSync,
      },
      null,
      2
    )
  );

  if (blockers.length) process.exitCode = 1;
}

function renderMarkdown(report, jsonPath) {
  const lines = [
    `# HSK Final Readiness - ${todayStamp()}`,
    "",
    `Status: ${report.status}`,
    "",
    `JSON report: \`${path.relative(process.cwd(), jsonPath)}\``,
    "",
    "This is an executable HSK gate package. It does not require or schedule manual/native review.",
    "",
    "## Releases",
    "",
    "| Release | Rows | Chinese blockers | Semantic pinyin blockers | Pinyin alignment blockers | Example complexity blockers | Pinyin needs review | Source blockers | Google readback | DB rows | DB tone-number hits |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|",
  ];
  const dbByRelease = new Map(report.db_state.map((row) => [row.release_id, row]));
  for (const release of report.releases) {
    const db = dbByRelease.get(release.release_id) ?? {};
    lines.push(
      [
        `| ${release.release_id}`,
        release.expected_rows,
        release.chinese_gate?.blockers ?? "n/a",
        release.semantic_pinyin_gate?.blockers ?? "n/a",
        release.pinyin_alignment_gate?.blockers ?? "n/a",
        release.example_complexity_gate?.blockers ?? "n/a",
        release.semantic_pinyin_gate?.needs_review ?? "n/a",
        release.source_audit?.blockers ?? "n/a",
        release.google_readback?.skipped ? "skipped" : release.google_readback?.status ?? "n/a",
        db.rows ?? "n/a",
        Number(db.word_tone_number_hits ?? 0) + Number(db.example_tone_number_hits ?? 0),
      ].join(" | ") + " |"
    );
  }
  lines.push(
    "",
    "## Polyphonic Lock",
    "",
    "```json",
    JSON.stringify(report.polyphonic_lock, null, 2),
    "```"
  );
  lines.push("", "## DB Sync", "", "```json", JSON.stringify(report.db_import, null, 2), "```");
  if (report.blockers.length) {
    lines.push("", "## Blockers", "");
    for (const blocker of report.blockers) lines.push(`- ${blocker.message} ${blocker.release_id ? `(${blocker.release_id})` : ""}`.trim());
  }
  if (report.warnings.length) {
    lines.push("", "## Warnings", "");
    for (const warning of report.warnings) lines.push(`- ${warning.message} ${warning.release_id ? `(${warning.release_id})` : ""}`.trim());
  }
  return `${lines.join("\n")}\n`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
