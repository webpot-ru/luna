#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-publish-video-path-"));
const writeJson = (relativePath, value) => {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return filePath;
};

const renderedVideoPath = path.join(root, "rendered", "polyglot_es_fr_it_pt_sl.mp4");
fs.mkdirSync(path.dirname(renderedVideoPath), { recursive: true });
fs.writeFileSync(renderedVideoPath, "fixture", "utf8");
const metadataPath = writeJson("bundle/youtube_metadata.json", {
  setId: "deck",
  supportLang: "SL",
  targetLang: "EN",
  title: "Fixture lesson",
  description: "A complete human-reviewed description.",
  tags: ["fixture"],
  source: "human-curated-test",
  videoPath: renderedVideoPath,
});
const channelConfigPath = writeJson("config/youtube-channels.json", {
  schemaVersion: 1,
  defaults: { customThumbnailUploadAllowed: false },
  channels: [{ key: "sl", channelId: "channel-sl", supportLangs: ["SL"], customThumbnailUploadAllowed: false }],
});
const playlistRegistryPath = writeJson("config/youtube-playlists.json", { schemaVersion: 1, playlists: [] });
const publicationRegistryPath = writeJson("config/youtube-published-videos.json", { schemaVersion: 1, publications: [] });

const result = spawnSync(process.execPath, [
  path.join(repoRoot, "scripts/youtube-publish-video.mjs"),
  `--metadata=${metadataPath}`,
  `--channel-config=${channelConfigPath}`,
  `--playlist-registry=${playlistRegistryPath}`,
  `--publication-registry=${publicationRegistryPath}`,
  "--privacy=private",
], { cwd: repoRoot, encoding: "utf8" });

assert.equal(result.status, 0, result.stderr || result.stdout);
assert.ok(result.stdout.includes(`video=${renderedVideoPath}`), result.stdout);

console.log("youtube publish video path tests passed");
