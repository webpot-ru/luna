#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-polyglot-cover-copy-test-"));
const inputDir = path.join(root, "input", "polyglot");
const coverPath = path.join(root, "polyglot.jpg");
const manifestPath = path.join(root, "manifest.json");
const registryPath = path.join(root, "cover-registry.json");
const reportPath = path.join(root, "report.json");
fs.mkdirSync(inputDir, { recursive: true });
fs.writeFileSync(coverPath, "approved-polyglot-cover");
fs.writeFileSync(path.join(inputDir, "youtube_metadata.json"), `${JSON.stringify({
  videoType: "polyglot",
  polyglotKey: "polyglot:home_kitchen_cookware_pilot_01:UZ:global_europe_core:hash",
  setId: "home_kitchen_cookware_pilot_01",
  supportLang: "UZ",
  bundleKey: "global_europe_core",
  targetLangs: ["EN", "ES", "FR", "DE"],
  targetLangsCsv: "EN,ES,FR,DE",
}, null, 2)}\n`);
fs.writeFileSync(manifestPath, `${JSON.stringify({
  covers: [{
    videoType: "polyglot",
    setId: "home_kitchen_cookware_pilot_01",
    supportLang: "UZ",
    channelSupportLangs: ["UZ"],
    bundleKey: "global_europe_core",
    targetLangs: ["DE", "FR", "ES", "EN"],
    targetLangsCsv: "DE,FR,ES,EN",
    uploadEligible: true,
    path: coverPath,
  }],
}, null, 2)}\n`);
fs.writeFileSync(registryPath, `${JSON.stringify({
  policy: { activeStatus: "approved" },
  manifests: [{ status: "approved", path: manifestPath }],
}, null, 2)}\n`);

const result = spawnSync(process.execPath, [
  "scripts/copy-pre-rendered-thumbnails.mjs",
  `--input-dir=${path.join(root, "input")}`,
  `--cover-registry=${registryPath}`,
  `--output=${reportPath}`,
  "--strict-custom",
], { cwd: process.cwd(), encoding: "utf8" });
assert.equal(result.status, 0, result.stderr || result.stdout);
assert.equal(fs.readFileSync(path.join(inputDir, "youtube_thumbnail.jpg"), "utf8"), "approved-polyglot-cover");
const metadata = JSON.parse(fs.readFileSync(path.join(inputDir, "youtube_metadata.json"), "utf8"));
assert.equal(metadata.thumbnailUploadMode, "custom");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
assert.equal(report.copiedCount, 1);
assert.equal(report.missingCoverCount, 0);

console.log("pre-rendered Polyglot thumbnail copy tests passed");
