#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-publish-control-gate-test-"));
const metadataPath = path.join(root, "youtube_metadata.json");
const staleReportPath = path.join(root, "stale-control.json");
const activeReportPath = path.join(root, "active-control.json");
fs.writeFileSync(metadataPath, '{"setId":"test-deck","supportLang":"EN","targetLang":"DE"}\n');
fs.writeFileSync(staleReportPath, `${JSON.stringify({
  generatedAt: "2020-01-01T00:00:00.000Z",
  setId: "test-deck",
  supports: ["EN"],
  summary: { healthy: true },
  evidence: {
    strict: true,
    videoStatusReadback: true,
    paginationComplete: true,
    liveAuditGeneratedAt: "2020-01-01T00:00:00.000Z",
  },
}, null, 2)}\n`);
const now = new Date().toISOString();
fs.writeFileSync(activeReportPath, `${JSON.stringify({
  generatedAt: now,
  setId: "test-deck",
  supports: ["EN"],
  summary: { healthy: true },
  evidence: {
    strict: true,
    videoStatusReadback: true,
    paginationComplete: true,
    liveAuditGeneratedAt: now,
  },
  publications: [{
    videoType: "ordinary",
    assignmentKey: "ordinary|test-deck|EN|DE",
    setId: "test-deck",
    supportLang: "EN",
    targetLang: "DE",
    youtubeVideoId: "existing-video",
  }],
}, null, 2)}\n`);

function run(extra = []) {
  return spawnSync(process.execPath, [
    "scripts/youtube-publish-video.mjs",
    `--metadata=${metadataPath}`,
    "--apply",
    "--confirm-youtube-write",
    ...extra,
  ], { cwd: process.cwd(), encoding: "utf8" });
}

const missing = run();
assert.notEqual(missing.status, 0);
assert.match(`${missing.stdout}\n${missing.stderr}`, /requires --publication-control-report/);

const stale = run([`--publication-control-report=${staleReportPath}`]);
assert.notEqual(stale.status, 0);
assert.match(`${stale.stdout}\n${stale.stderr}`, /stale or missing fresh live-audit timestamps/);

const active = run([`--publication-control-report=${activeReportPath}`]);
assert.notEqual(active.status, 0);
assert.match(`${active.stdout}\n${active.stderr}`, /active assignment for this candidate/);

fs.writeFileSync(metadataPath, `${JSON.stringify({
  videoType: "polyglot",
  setId: "test-deck",
  supportLang: "EN",
  bundleKey: "global_europe_core",
  contentScope: "full",
  targetLangs: ["ES", "FR", "DE"],
  targetLangsHash: "newhash",
  polyglotKey: "polyglot:test-deck:EN:global_europe_core:newhash",
}, null, 2)}\n`);
fs.writeFileSync(activeReportPath, `${JSON.stringify({
  generatedAt: now,
  setId: "test-deck",
  supports: ["EN"],
  summary: { healthy: true },
  evidence: { strict: true, videoStatusReadback: true, paginationComplete: true, liveAuditGeneratedAt: now },
  publications: [{
    videoType: "polyglot",
    assignmentKey: "polyglot|test-deck|EN|global_europe_core|oldhash|full",
    polyglotSlotKey: "polyglot-slot|test-deck|EN|global_europe_core|full",
    setId: "test-deck",
    supportLang: "EN",
    bundleKey: "global_europe_core",
    contentScope: "full",
    targetLangs: ["ES", "FR", "IT"],
    youtubeVideoId: "existing-poly-video",
  }],
}, null, 2)}\n`);
const activePolyglotSlot = run([`--publication-control-report=${activeReportPath}`]);
assert.notEqual(activePolyglotSlot.status, 0);
assert.match(`${activePolyglotSlot.stdout}\n${activePolyglotSlot.stderr}`, /active assignment for this candidate/);

console.log("youtube publish control gate tests passed");
