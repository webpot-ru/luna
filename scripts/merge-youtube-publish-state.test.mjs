#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-state-merge-test-"));
const artifact = path.join(root, "artifact");
const config = path.join(root, "config");
const artifactConfig = path.join(artifact, "config");
fs.mkdirSync(config, { recursive: true });
fs.mkdirSync(artifactConfig, { recursive: true });

const shared = {
  videoType: "polyglot",
  setId: "test-deck",
  supportLang: "EN",
  targetLang: "ES,FR,DE",
  targetLangs: ["ES", "FR", "DE"],
  targetLangsCsv: "ES,FR,DE",
  channelKey: "en",
  youtubeChannelId: "channel-en",
};
const existingKey = "polyglot:test-deck:EN:bundle_a:hash";
const incomingKey = "polyglot:test-deck:EN:bundle_b:hash";

fs.writeFileSync(path.join(config, "youtube-published-videos.json"), '{"schemaVersion":1,"publications":[]}\n');
fs.writeFileSync(path.join(config, "youtube-polyglot-published-videos.json"), '{"schemaVersion":1,"publications":[]}\n');
fs.writeFileSync(path.join(config, "youtube-publish-calendar.json"), `${JSON.stringify({
  schemaVersion: 1,
  reservations: [
    {
      ...shared,
      polyglotKey: existingKey,
      bundleKey: "bundle_a",
      youtubeVideoId: "existing-video",
      publishAt: "2026-07-20T08:00:00.000Z",
      status: "reserved",
    },
    {
      ...shared,
      polyglotKey: incomingKey,
      bundleKey: "bundle_b",
      publishAt: "2026-07-21T08:00:00.000Z",
      status: "reserved",
    },
  ],
}, null, 2)}\n`);

const incomingPublication = {
  ...shared,
  polyglotKey: incomingKey,
  bundleKey: "bundle_b",
  youtubeVideoId: "incoming-video",
  publicationStatus: "scheduled_uploaded",
  privacyStatus: "private",
  publishAt: "2026-07-21T08:00:00.000Z",
  youtubePlaylistId: "playlist-incoming",
  playlistItemId: "playlist-item-incoming",
  playlistInsertRepairedAt: "2026-07-18T12:00:00.000Z",
  playlistInsertRepairStatus: "inserted",
};
fs.writeFileSync(path.join(config, "youtube-polyglot-published-videos.json"), `${JSON.stringify({
  schemaVersion: 1,
  publications: [{
    ...incomingPublication,
    playlistItemId: "",
    needsPlaylistCreate: true,
    needsPlaylistInsert: true,
    playlistCreateDeferredError: "old quota error",
    postUploadError: "old insert error",
  }],
}, null, 2)}\n`);
fs.writeFileSync(path.join(artifactConfig, "youtube-polyglot-published-videos.json"), `${JSON.stringify({
  schemaVersion: 1,
  publications: [incomingPublication],
}, null, 2)}\n`);
fs.writeFileSync(path.join(artifactConfig, "youtube-publish-calendar.json"), `${JSON.stringify({
  schemaVersion: 1,
  reservations: [{
    ...shared,
    polyglotKey: incomingKey,
    bundleKey: "bundle_b",
    youtubeVideoId: "incoming-video",
    publishAt: "2026-07-21T08:00:00.000Z",
    status: "reserved",
  }],
}, null, 2)}\n`);
fs.writeFileSync(path.join(artifact, "youtube-live-publications-github.json"), `${JSON.stringify({
  schemaVersion: 1,
  publications: [{
    setId: "test-deck",
    supportLang: "EN",
    targetLang: "IT",
    youtubeVideoId: "live-ordinary",
    lastReadbackAt: "2026-07-13T00:00:00.000Z",
    youtubeStatus: { privacyStatus: "public", publishAt: "", uploadStatus: "processed" },
  }, {
    setId: "test-deck",
    supportLang: "EN",
    targetLang: "RU,PL,CS,SK",
    youtubeVideoId: "live-polyglot",
    lastReadbackAt: "2026-07-13T00:00:00.000Z",
    youtubeStatus: { privacyStatus: "public", publishAt: "", uploadStatus: "processed" },
  }],
}, null, 2)}\n`);

const result = spawnSync(process.execPath, [
  "scripts/merge-youtube-publish-state.mjs",
  `--repo-root=${root}`,
  `--artifact-dir=${artifact}`,
  "--summary=merge-summary.json",
], { cwd: process.cwd(), encoding: "utf8" });
assert.equal(result.status, 0, result.stderr || result.stdout);

const calendar = JSON.parse(fs.readFileSync(path.join(config, "youtube-publish-calendar.json"), "utf8"));
assert.equal(calendar.reservations.length, 2, "different polyglotKey values must not collapse even when targetLangs are equal");
assert.equal(calendar.reservations.find((row) => row.polyglotKey === incomingKey)?.youtubeVideoId, "incoming-video");

const registry = JSON.parse(fs.readFileSync(path.join(config, "youtube-polyglot-published-videos.json"), "utf8"));
assert.equal(registry.publications.length, 2);
assert.equal(registry.publications.find((row) => row.youtubeVideoId === "incoming-video")?.polyglotKey, incomingKey);
const repaired = registry.publications.find((row) => row.youtubeVideoId === "incoming-video");
assert.equal(repaired?.playlistItemId, "playlist-item-incoming");
assert.ok(!Object.hasOwn(repaired, "needsPlaylistCreate"));
assert.ok(!Object.hasOwn(repaired, "needsPlaylistInsert"));
assert.equal(registry.publications.find((row) => row.youtubeVideoId === "live-polyglot")?.readback?.privacyStatus, "public");

const ordinaryRegistry = JSON.parse(fs.readFileSync(path.join(config, "youtube-published-videos.json"), "utf8"));
assert.equal(ordinaryRegistry.publications.length, 1);
assert.equal(ordinaryRegistry.publications[0].youtubeVideoId, "live-ordinary");
assert.equal(ordinaryRegistry.publications[0].readback?.privacyStatus, "public");
assert.ok(!ordinaryRegistry.publications.some((row) => row.youtubeVideoId === "live-polyglot"));

console.log("youtube publish state merge tests passed");

const thumbnailRoot = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-thumbnail-state-merge-test-"));
const thumbnailArtifact = path.join(thumbnailRoot, "artifact");
const thumbnailConfig = path.join(thumbnailRoot, "config");
const thumbnailArtifactConfig = path.join(thumbnailArtifact, "config");
fs.mkdirSync(thumbnailConfig, { recursive: true });
fs.mkdirSync(thumbnailArtifactConfig, { recursive: true });

const thumbnailTarget = {
  setId: "test-deck",
  supportLang: "VI",
  targetLang: "KK",
  videoType: "ordinary",
  youtubeVideoId: "thumbnail-target",
  thumbnailSet: false,
  lastReadbackAt: "2026-08-16T12:00:00.000Z",
  readback: { privacyStatus: "public", thumbnailStatus: "unknown" },
};
const unrelated = {
  setId: "test-deck",
  supportLang: "EN",
  targetLang: "FR",
  videoType: "ordinary",
  youtubeVideoId: "unrelated-video",
  thumbnailSet: true,
  lastReadbackAt: "2026-08-16T12:30:00.000Z",
  readback: { privacyStatus: "public", thumbnailStatus: "custom_set" },
};
fs.writeFileSync(path.join(thumbnailConfig, "youtube-published-videos.json"), `${JSON.stringify({
  schemaVersion: 1,
  publications: [thumbnailTarget, unrelated],
}, null, 2)}\n`);
fs.writeFileSync(path.join(thumbnailConfig, "youtube-polyglot-published-videos.json"), '{"schemaVersion":1,"publications":[]}\n');
fs.writeFileSync(path.join(thumbnailArtifactConfig, "youtube-published-videos.json"), `${JSON.stringify({
  schemaVersion: 1,
  publications: [{
    ...thumbnailTarget,
    thumbnailSet: true,
    thumbnailSource: "approved-tracked-jpg",
    lastReadbackAt: "2026-08-16T12:44:00.000Z",
  }, {
    ...unrelated,
    lastReadbackAt: "2026-07-01T00:00:00.000Z",
    readback: { privacyStatus: "public", thumbnailStatus: "unknown" },
  }, {
    setId: "deleted-deck",
    supportLang: "EN",
    targetLang: "DE",
    videoType: "ordinary",
    youtubeVideoId: "stale-artifact-only",
    thumbnailSet: true,
  }],
}, null, 2)}\n`);
fs.mkdirSync(path.join(thumbnailArtifact, "outputs"), { recursive: true });
fs.writeFileSync(path.join(thumbnailArtifact, "outputs", "youtube-thumbnail-ledger.jsonl"), `${JSON.stringify({
  action: "youtube_set_video_thumbnail",
  status: "custom_thumbnail_set",
  videoId: "thumbnail-target",
})}\n`);

const thumbnailResult = spawnSync(process.execPath, [
  "scripts/merge-youtube-publish-state.mjs",
  `--repo-root=${thumbnailRoot}`,
  `--artifact-dir=${thumbnailArtifact}`,
  "--thumbnail-state-only",
  "--summary=thumbnail-merge-summary.json",
], { cwd: process.cwd(), encoding: "utf8" });
assert.equal(thumbnailResult.status, 0, thumbnailResult.stderr || thumbnailResult.stdout);
const thumbnailRegistry = JSON.parse(fs.readFileSync(path.join(thumbnailConfig, "youtube-published-videos.json"), "utf8"));
const mergedThumbnailTarget = thumbnailRegistry.publications.find((row) => row.youtubeVideoId === "thumbnail-target");
assert.equal(mergedThumbnailTarget.thumbnailSet, true);
assert.equal(mergedThumbnailTarget.thumbnailSource, "approved-tracked-jpg");
assert.equal(mergedThumbnailTarget.lastReadbackAt, "2026-08-16T12:44:00.000Z");
assert.deepEqual(thumbnailRegistry.publications.find((row) => row.youtubeVideoId === "unrelated-video"), unrelated);
assert.ok(!thumbnailRegistry.publications.some((row) => row.youtubeVideoId === "stale-artifact-only"));
const thumbnailSummary = JSON.parse(fs.readFileSync(path.join(thumbnailRoot, "thumbnail-merge-summary.json"), "utf8"));
assert.deepEqual(thumbnailSummary.filesChanged, ["config/youtube-published-videos.json"]);
assert.equal(thumbnailSummary.publications.updated, 1);

console.log("youtube thumbnail-only state merge tests passed");
