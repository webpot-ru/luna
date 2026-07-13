#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const script = "scripts/youtube-delete-duplicate-videos.mjs";
const targetFile = "config/youtube-duplicate-delete-plans/2026-07-13-decks-1-2-32.json";

function run(args) {
  return spawnSync(process.execPath, [script, ...args], { cwd: process.cwd(), encoding: "utf8" });
}

for (const [route, expected] of [["youtube-1", 25], ["youtube-2", 2], ["youtube-3", 4], ["youtube-4", 1]]) {
  const result = run([`--target-file=${targetFile}`, `--route=${route}`]);
  assert.equal(result.status, 0, `${route}: ${result.stderr}`);
  assert.match(result.stdout, new RegExp(`Found ${expected} duplicate groups`));
  assert.match(result.stdout, /DRY-RUN MODE/);
}

const unscopedApply = run(["--route=youtube-1", "--apply", "--confirm-youtube-write"]);
assert.equal(unscopedApply.status, 1);
assert.match(`${unscopedApply.stdout}\n${unscopedApply.stderr}`, /Live deletion requires --target-file/);

console.log("youtube-delete-duplicate-videos exact-plan tests passed");
