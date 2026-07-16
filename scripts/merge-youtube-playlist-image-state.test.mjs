#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "playlist-image-merge-test-"));
const artifact = path.join(root, "artifact");
for (const base of [root, artifact]) fs.mkdirSync(path.join(base, "config"), { recursive: true });

const registries = [
  ["youtube-playlists.json", "EN__FR__ordinary-vocabulary__a1-everyday", "PLordinary"],
  ["youtube-polyglot-playlists.json", "POLYGLOT__EN__global-europe-core__test", "PLpolyglot"],
];
for (const [fileName, playlistKey, playlistId] of registries) {
  const current = { schemaVersion: 1, playlists: [{ playlist_key: playlistKey, youtube_playlist_id: playlistId, channelKey: "en" }] };
  const incoming = {
    schemaVersion: 1,
    playlists: [{
      ...current.playlists[0],
      playlistImage: {
        status: "uploaded",
        uploadedAt: "2026-07-16T07:00:00.000Z",
        imageId: `${playlistId}.1`,
        method: "insert",
      },
      lastReadbackAt: "2026-07-16T07:00:00.000Z",
    }],
  };
  fs.writeFileSync(path.join(root, "config", fileName), `${JSON.stringify(current, null, 2)}\n`);
  fs.writeFileSync(path.join(artifact, "config", fileName), `${JSON.stringify(incoming, null, 2)}\n`);
}

const result = spawnSync(process.execPath, [
  "scripts/merge-youtube-playlist-image-state.mjs",
  `--repo-root=${root}`,
  `--artifact-dir=${artifact}`,
  "--summary=summary.json",
], { cwd: process.cwd(), encoding: "utf8" });
assert.equal(result.status, 0, result.stderr || result.stdout);

for (const [fileName, , playlistId] of registries) {
  const merged = JSON.parse(fs.readFileSync(path.join(root, "config", fileName), "utf8"));
  assert.equal(merged.playlists[0].playlistImage.imageId, `${playlistId}.1`);
}

console.log("youtube playlist image state merge tests passed");
