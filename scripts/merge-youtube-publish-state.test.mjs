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
