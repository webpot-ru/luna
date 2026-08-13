#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-polyglot-duration-check-"));
const ffprobe = path.join(root, "ffprobe");
fs.writeFileSync(ffprobe, "#!/bin/sh\nprintf '%s\\n' \"${FAKE_DURATION:-900}\"\n");
fs.chmodSync(ffprobe, 0o755);
const videoDir = path.join(root, "video");
fs.mkdirSync(videoDir);
fs.writeFileSync(path.join(videoDir, "video.mp4"), "fixture");
fs.writeFileSync(path.join(videoDir, "youtube_metadata.json"), JSON.stringify({ supportLang: "EN", videoPath: path.join(videoDir, "video.mp4") }));
const channelConfig = path.join(root, "channels.json");

function run({ allowed, duration, scope = "full", requireMeasuredSelection = false, writeMetadata = false, input = videoDir }) {
  fs.writeFileSync(channelConfig, JSON.stringify({ channels: [{ key: "en", supportLangs: ["EN", "EN-GB"], longVideoUploadAllowed: allowed }] }));
  return spawnSync(process.execPath, [
    "scripts/check-polyglot-video-duration.mjs",
    input,
    `--channel-config=${channelConfig}`,
    `--ffprobe=${ffprobe}`,
    `--content-scope=${scope}`,
    "--max-duration-seconds=895",
    ...(writeMetadata ? ["--write-metadata"] : []),
    ...(requireMeasuredSelection ? ["--require-measured-selection"] : []),
  ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, FAKE_DURATION: String(duration) } });
}

assert.equal(run({ allowed: undefined, duration: 800 }).status, 0, "short full video must not require long-video capability");
assert.equal(run({ allowed: undefined, duration: 900 }).status, 1, "long full video with unknown capability must block");
assert.equal(run({ allowed: true, duration: 900 }).status, 0, "confirmed long-video channel must pass");
assert.equal(run({ allowed: true, duration: 900, scope: "short_unverified" }).status, 1, "short scope remains hard-capped");
assert.equal(run({ allowed: true, duration: 800, scope: "short_unverified", requireMeasuredSelection: true }).status, 1, "new short videos require measured duration selection evidence");
fs.writeFileSync(path.join(videoDir, "polyglot-duration-selection.json"), JSON.stringify({
  selectionMethod: "measured_tts_audio_prefix",
  selectedCardCount: 20,
  projectedDurationSeconds: 800,
}));
assert.equal(run({ allowed: true, duration: 800, scope: "short_unverified", requireMeasuredSelection: true, writeMetadata: true }).status, 0, "measured short selection evidence passes");
const written = JSON.parse(fs.readFileSync(path.join(videoDir, "youtube_metadata.json"), "utf8"));
assert.equal(written.contentScope, "short_unverified", "duration gate persists short content scope");
assert.equal(written.wordLimit, 20, "duration gate persists measured selected-card count");

const renderedDir = path.join(root, "rendered");
const bundleMetadataDir = path.join(root, "bundle-metadata");
fs.mkdirSync(renderedDir);
fs.mkdirSync(bundleMetadataDir);
fs.writeFileSync(path.join(renderedDir, "video.mp4"), "fixture");
fs.writeFileSync(path.join(renderedDir, "polyglot-duration-selection.json"), JSON.stringify({
  selectionMethod: "measured_tts_audio_prefix",
  selectedCardCount: 18,
  projectedDurationSeconds: 720,
}));
fs.writeFileSync(path.join(bundleMetadataDir, "youtube_metadata.json"), JSON.stringify({
  supportLang: "EN",
  videoPath: path.join(renderedDir, "video.mp4"),
}));
assert.equal(run({
  allowed: true,
  duration: 720,
  scope: "short_unverified",
  requireMeasuredSelection: true,
  writeMetadata: true,
  input: bundleMetadataDir,
}).status, 0, "measured selection next to rendered video passes for bundle metadata");
const bundleMetadata = JSON.parse(fs.readFileSync(path.join(bundleMetadataDir, "youtube_metadata.json"), "utf8"));
assert.equal(bundleMetadata.durationSelection.selectedCardCount, 18, "render-directory selection is persisted to bundle metadata");
console.log("Polyglot duration/capability tests passed");
