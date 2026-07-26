#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-ordinary-production-readiness-"));
const writeJson = (name, value) => {
  const filePath = path.join(root, name);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return filePath;
};
const videoPath = path.join(root, "lesson_en_hy.mp4");
const metadataPath = path.join(root, "youtube_metadata.json");
fs.writeFileSync(videoPath, "fixture", "utf8");
fs.writeFileSync(metadataPath, `${JSON.stringify({
  setId: "deck",
  supportLang: "HY",
  targetLang: "EN",
  title: "Fixture ordinary lesson",
  description: "https://flashcardsluna.com/hy/courses",
  source: "human_fixture",
  videoPath,
}, null, 2)}\n`, "utf8");

const playlistRegistryPath = writeJson("playlists.json", { schemaVersion: 1, playlists: [] });
const publicationRegistryPath = writeJson("publications.json", { schemaVersion: 1, publications: [] });
const blockedChannelsPath = writeJson("channels-blocked.json", {
  schemaVersion: 1,
  channels: [{
    key: "hy",
    supportLangs: ["HY"],
    channelId: "fixture-channel-hy",
    longVideoUploadAllowed: false,
    videoProductionReadiness: {
      status: "blocked",
      reason: "fixture_ai33_unavailable",
      checkedAt: "2026-07-26",
    },
  }],
});
const readyChannelsPath = writeJson("channels-ready.json", {
  schemaVersion: 1,
  channels: [{
    key: "hy",
    supportLangs: ["HY"],
    channelId: "fixture-channel-hy",
    longVideoUploadAllowed: false,
    videoProductionReadiness: {
      status: "ready",
      reason: "fixture_verified",
      checkedAt: "2026-07-26",
    },
  }],
});

function plan(channelConfig, output) {
  const result = spawnSync(process.execPath, [
    "scripts/plan-youtube-publish.mjs",
    metadataPath,
    `--channel-config=${channelConfig}`,
    `--playlist-registry=${playlistRegistryPath}`,
    `--publication-registry=${publicationRegistryPath}`,
    `--output=${output}`,
    "--allow-auto-thumbnail-fallback",
  ], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(fs.readFileSync(output, "utf8"));
}

const blockedPlan = plan(blockedChannelsPath, path.join(root, "blocked-plan.json"));
assert.equal(blockedPlan.candidates[0].productionReadiness.ready, false);
assert.match(blockedPlan.candidates[0].blockers.join("\n"), /fixture_ai33_unavailable/u);

const readyPlan = plan(readyChannelsPath, path.join(root, "ready-plan.json"));
assert.equal(readyPlan.candidates[0].productionReadiness.ready, true);
assert.doesNotMatch(readyPlan.candidates[0].blockers.join("\n"), /video production readiness/u);

console.log("ordinary YouTube production readiness tests passed");
