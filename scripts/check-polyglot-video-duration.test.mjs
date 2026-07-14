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

function run({ allowed, duration, scope = "full" }) {
  fs.writeFileSync(channelConfig, JSON.stringify({ channels: [{ key: "en", supportLangs: ["EN", "EN-GB"], longVideoUploadAllowed: allowed }] }));
  return spawnSync(process.execPath, [
    "scripts/check-polyglot-video-duration.mjs",
    videoDir,
    `--channel-config=${channelConfig}`,
    `--ffprobe=${ffprobe}`,
    `--content-scope=${scope}`,
    "--max-duration-seconds=895",
  ], { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, FAKE_DURATION: String(duration) } });
}

assert.equal(run({ allowed: undefined, duration: 800 }).status, 0, "short full video must not require long-video capability");
assert.equal(run({ allowed: undefined, duration: 900 }).status, 1, "long full video with unknown capability must block");
assert.equal(run({ allowed: true, duration: 900 }).status, 0, "confirmed long-video channel must pass");
assert.equal(run({ allowed: true, duration: 900, scope: "short_unverified" }).status, 1, "short scope remains hard-capped");
console.log("Polyglot duration/capability tests passed");
