#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-campaign-playlist-uploader-"));
const writeJson = (relativePath, value) => {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return filePath;
};
const playlistKey = "EN__DE__ordinary-vocabulary__a1-everyday";
const metadataPath = writeJson("metadata/youtube_metadata.json", {
  setId: "deck",
  supportLang: "EN",
  targetLang: "DE",
  title: "German A1 Vocabulary",
  description: "A complete human-reviewed description.",
  tags: ["German"],
  hashtags: ["#LunaCards"],
  source: "human-curated-test",
  privacyStatus: "private",
  campaignId: "campaign-test",
  campaignManifestHash: "manifest-test",
  campaignPlaylist: {
    ready: true,
    state: "resolved_existing",
    playlistKey,
    youtubePlaylistId: "PL-campaign-existing",
    createAllowed: false,
    discoveryGeneratedAt: "2099-01-01T00:00:00.000Z",
  },
});
const videoPath = path.join(root, "metadata", "video.mp4");
fs.writeFileSync(videoPath, "test");
const channelPath = writeJson("config/youtube-channels.json", {
  schemaVersion: 1,
  defaults: { customThumbnailUploadAllowed: false },
  channels: [{ key: "en", channelId: "channel-en", supportLangs: ["EN", "EN-GB"], customThumbnailUploadAllowed: false }],
});
const playlistPath = writeJson("config/youtube-playlists.json", { schemaVersion: 1, playlists: [] });
const publicationPath = writeJson("config/youtube-published-videos.json", { schemaVersion: 1, publications: [] });

function run(extra = []) {
  return spawnSync(process.execPath, [
    path.join(repoRoot, "scripts/youtube-publish-video.mjs"),
    `--metadata=${metadataPath}`,
    `--video=${videoPath}`,
    `--channel-config=${channelPath}`,
    `--playlist-registry=${playlistPath}`,
    `--publication-registry=${publicationPath}`,
    "--privacy=private",
    "--publish-at=2099-01-02T08:30:00.000Z",
    "--create-playlist",
    ...extra,
  ], { cwd: repoRoot, encoding: "utf8" });
}

const ready = run();
assert.equal(ready.status, 0, ready.stderr || ready.stdout);
assert.match(ready.stdout, /playlist=EN__DE__ordinary-vocabulary__a1-everyday PL-campaign-existing/);
assert.equal(JSON.parse(fs.readFileSync(playlistPath, "utf8")).playlists.length, 0, "dry-run must not persist campaign playlist reconciliation");

writeJson("config/youtube-playlists.json", {
  schemaVersion: 1,
  playlists: [{ playlist_key: playlistKey, youtube_playlist_id: "PL-conflict" }],
});
const conflict = run();
assert.equal(conflict.status, 0, conflict.stderr || conflict.stdout);
assert.match(conflict.stdout, /campaign playlist ID conflicts with registry/);

console.log("youtube campaign playlist uploader tests passed");
