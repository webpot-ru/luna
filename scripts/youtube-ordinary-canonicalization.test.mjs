#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-ordinary-canonicalization-"));
const manifest = "data/youtube-cover-assets/approved-template-overlay-uz-si-ka-20260713/manifest.json";
const setIds = [
  "home_kitchen_cookware_pilot_01",
  "home_kitchen_cooking_actions_a1_a2",
];

function runNode(args) {
  execFileSync(process.execPath, args, { cwd: root, stdio: "pipe" });
}

for (const setId of setIds) {
  const output = path.join(tempDir, `${setId}-thumbnail-plan.json`);
  runNode([
    "scripts/plan-youtube-thumbnail-batch-from-manifest.mjs",
    `--manifest=${manifest}`,
    `--set-id=${setId}`,
    "--support=UZ,SI,KA",
    `--output=${output}`,
  ]);
  const report = JSON.parse(fs.readFileSync(output, "utf8"));
  assert.equal(report.rows.length, 171, `combined manifest must expose only ${setId}`);
  assert.ok(report.rows.every((row) => row.setId === setId));
  assert.ok(report.rows.every((row) => row.coverRelativePath.includes(`/by-set/${setId}/`)));
}

const scheduleStart = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10);
const dispatcherOutput = path.join(tempDir, "dispatcher-plan.json");
runNode([
  "scripts/dispatch-youtube-bulk-publish.mjs",
  "--set=home_kitchen_cooking_actions_a1_a2",
  "--supports=UZ",
  "--targets-per-support=1",
  `--schedule-start-date=${scheduleStart}`,
  "--dry-run",
  `--output=${dispatcherOutput}`,
]);
const dispatcherReport = JSON.parse(fs.readFileSync(dispatcherOutput, "utf8"));
assert.equal(dispatcherReport.options.generateThumbnails, false);

console.log("youtube ordinary canonicalization regression checks passed");
