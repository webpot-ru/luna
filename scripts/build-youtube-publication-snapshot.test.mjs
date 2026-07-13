#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-publication-snapshot-test-"));
const reportPath = path.join(root, "report.json");
const outputPath = path.join(root, "snapshot.json");
const markdownPath = path.join(root, "snapshot.md");
const playlistRegistryPath = path.join(root, "youtube-playlists.json");
const coverAssetConfigPath = path.join(root, "youtube-cover-assets.json");
const playlistCoverManifestPath = path.join(root, "playlist-cover-manifest.json");
const coverWithIdPath = path.join(root, "cover-with-id.jpg");
const coverWithoutIdPath = path.join(root, "cover-without-id.jpg");
const report = {
  schemaVersion: 1,
  generatedAt: "2026-07-13T00:10:00.000Z",
  mode: "youtube_publication_control_all_routes",
  summary: {
    complete: true,
    expectedRouteCount: 4,
    receivedRouteCount: 4,
    activeVideoCount: 3,
    publicCount: 2,
    scheduledCount: 1,
    privateUnscheduledCount: 0,
    tailCount: 1,
    ordinaryTailCount: 1,
    polyglotTailCount: 0,
    videoStatusReadbackComplete: true,
    paginationComplete: true,
  },
  routes: Array.from({ length: 4 }, (_, index) => ({
    file: `/tmp/youtube-publication-control-youtube-${index + 1}.json`,
    setId: "test-deck",
    supports: index === 0 ? ["EN"] : [`S${index + 1}`],
    generatedAt: "2026-07-13T00:05:00.000Z",
    evidence: {
      liveAuditGeneratedAt: "2026-07-13T00:00:00.000Z",
      videoStatusReadback: true,
      paginationComplete: true,
    },
  })),
  publications: [{
    videoType: "ordinary",
    setId: "test-deck",
    supportLang: "EN",
    targetLang: "NB",
    youtubeVideoId: "durable-video",
    youtubeVideoUrl: "https://www.youtube.com/watch?v=durable-video",
    privacyStatus: "public",
    durableRegistryPresent: true,
    liveReadbackPresent: true,
  }, {
    videoType: "ordinary",
    setId: "test-deck",
    supportLang: "EN-GB",
    targetLang: "NB",
    youtubeVideoId: "live-only-video",
    youtubeVideoUrl: "https://www.youtube.com/watch?v=live-only-video",
    privacyStatus: "public",
    durableRegistryPresent: false,
    liveReadbackPresent: true,
  }, {
    videoType: "ordinary",
    setId: "test-deck",
    supportLang: "EN",
    targetLang: "DE",
    youtubeVideoId: "scheduled-video",
    privacyStatus: "private",
    publishAt: "2099-01-01T08:00:00.000Z",
    durableRegistryPresent: true,
    liveReadbackPresent: true,
  }, {
    videoType: "polyglot",
    setId: "test-deck",
    supportLang: "EN",
    bundleKey: "global_europe_core",
    targetLangs: ["ES", "FR", "DE", "IT"],
    youtubeVideoId: "durable-observed",
    privacyStatus: "public",
    durableRegistryPresent: true,
    liveReadbackPresent: false,
  }],
  blockers: [{
    type: "duplicate_live_assignment",
    key: "ordinary|test-deck|EN|NB",
    setId: "test-deck",
    supportLang: "EN",
    targetLang: "NB",
    videoIds: ["durable-video", "live-only-video"],
  }],
  unclassifiedUploads: [{
    youtubeVideoId: "unclassified-video",
    youtubeVideoUrl: "https://www.youtube.com/watch?v=unclassified-video",
    supportLang: "EN",
    channelKey: "en",
    title: "Manual API visual demo",
    uploadedAt: "2026-07-12T20:00:00.000Z",
    potentialCurrentSet: true,
    reviewedNonProduct: false,
    youtubeStatus: { privacyStatus: "public", publishAt: "", uploadStatus: "processed" },
  }, {
    youtubeVideoId: "durable-video",
    supportLang: "EN",
    title: "Already classified row",
    uploadedAt: "2026-07-12T19:00:00.000Z",
    potentialCurrentSet: true,
    youtubeStatus: { privacyStatus: "public", publishAt: "", uploadStatus: "processed" },
  }, {
    youtubeVideoId: "durable-observed",
    supportLang: "EN",
    title: "Registry Polyglot without old course URL",
    uploadedAt: "2026-07-12T18:00:00.000Z",
    potentialCurrentSet: false,
    youtubeStatus: null,
  }],
  tails: [{ videoType: "ordinary", setId: "test-deck", supportLang: "EN", targetLang: "FR" }],
  calendarDayGaps: [],
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(coverWithIdPath, "cover");
fs.writeFileSync(coverWithoutIdPath, "cover");
fs.writeFileSync(playlistRegistryPath, `${JSON.stringify({
  playlists: [{
    playlist_key: "EN__DE__ordinary-vocabulary__a1-everyday",
    supportLang: "EN",
    targetLang: "DE",
    youtube_playlist_id: "playlist-with-id",
    playlistImage: { status: "uploaded" },
  }, {
    playlist_key: "EN__FR__ordinary-vocabulary__a1-everyday",
    supportLang: "EN",
    targetLang: "FR",
    youtube_playlist_id: "",
    needsPlaylistDiscovery: true,
  }],
}, null, 2)}\n`);
fs.writeFileSync(playlistCoverManifestPath, `${JSON.stringify({
  records: [{
    playlistKey: "EN__DE__ordinary-vocabulary__a1-everyday",
    supportLang: "EN",
    targetLang: "DE",
    playlistId: "playlist-with-id",
    coverPath: coverWithIdPath,
  }, {
    playlistKey: "EN__FR__ordinary-vocabulary__a1-everyday",
    supportLang: "EN",
    targetLang: "FR",
    playlistId: "",
    coverPath: coverWithoutIdPath,
  }],
}, null, 2)}\n`);
fs.writeFileSync(coverAssetConfigPath, `${JSON.stringify({
  playlistManifests: [{ status: "approved", path: playlistCoverManifestPath }],
}, null, 2)}\n`);

const result = spawnSync(process.execPath, [
  "scripts/build-youtube-publication-snapshot.mjs",
  `--report=${reportPath}`,
  `--output=${outputPath}`,
  `--markdown=${markdownPath}`,
  `--cover-asset-config=${coverAssetConfigPath}`,
  `--playlist-registry=${playlistRegistryPath}`,
  "--source-run=test-deck:youtube-1:123456789",
], { cwd: process.cwd(), encoding: "utf8" });
assert.equal(result.status, 0, result.stderr || result.stdout);

const snapshot = JSON.parse(fs.readFileSync(outputPath, "utf8"));
assert.equal(snapshot.totals.liveVideoCount, 4);
assert.equal(snapshot.totals.scannedUploadVideoCount, 5);
assert.equal(snapshot.totals.classifiedProductVideoCount, 4);
assert.equal(snapshot.totals.liveStatusUnknownCount, 1);
assert.equal(snapshot.totals.unclassifiedUploadCount, 1);
assert.equal(snapshot.totals.unclassifiedRecentEvaluationComplete, true);
assert.equal(snapshot.totals.unclassifiedRecentUploadCount, 1);
assert.equal(snapshot.totals.unclassifiedStatusReadbackComplete, true);
assert.equal(snapshot.totals.liveDuplicateGroupCount, 1);
assert.equal(snapshot.totals.preparedPlaylistCoverCount, 2);
assert.equal(snapshot.totals.uploadEligiblePlaylistCoverCount, 1);
assert.equal(snapshot.totals.plannedPlaylistCoverCount, 1);
assert.equal(snapshot.totals.gitTrackedPlaylistCoverCount, 0);
assert.equal(snapshot.totals.uploadedPlaylistCoverCount, 1);
assert.equal(snapshot.coverReadiness.playlist.filePresentCount, 2);
assert.equal(snapshot.coverReadiness.playlist.playlistIdConflictCount, 0);
assert.equal(snapshot.coverReadiness.playlist.bySupport[0].supportLang, "EN");
assert.equal(snapshot.coverReadiness.playlist.plannedWithoutPlaylistId[0].targetLang, "FR");
assert.equal(snapshot.unclassifiedUploads[0].youtubeVideoId, "unclassified-video");
assert.deepEqual(snapshot.unclassifiedUploads[0].sourceSetIds, ["test-deck"]);
assert.equal(snapshot.decks[0].publications.find((row) => row.youtubeVideoId === "durable-observed")?.statusEvidence, "uploads_playlist_registry_match");
assert.equal(snapshot.decks[0].evidence.strictApplyEvidence, true);
assert.equal(snapshot.decks[0].duplicateGroups.length, 1);
assert.equal(snapshot.decks[0].duplicateGroups[0].recommendedKeepVideoId, "durable-video");
assert.deepEqual(snapshot.decks[0].duplicateGroups[0].candidateDeleteVideoIds, ["live-only-video"]);
assert.equal(snapshot.decks[0].channels.find((row) => row.supportLang === "EN")?.scheduledCount, 1);
assert.equal(snapshot.decks[0].evidence.routes[0].artifact, "youtube-publication-control-youtube-1.json");
assert.ok(!JSON.stringify(snapshot).includes("/tmp/"));
const markdown = fs.readFileSync(markdownPath, "utf8");
assert.match(markdown, /durable-video/);
assert.match(markdown, /Удаление не выполнено/);
assert.match(markdown, /Нераспознанные загрузки/);
assert.match(markdown, /unclassified-video/);
assert.match(markdown, /Обложки плейлистов/);
assert.match(markdown, /EN=\[FR\]/);

const missingManifestConfigPath = path.join(root, "youtube-cover-assets-missing-manifest.json");
fs.writeFileSync(missingManifestConfigPath, `${JSON.stringify({
  playlistManifests: [{ status: "approved", path: path.join(root, "missing-playlist-cover-manifest.json") }],
}, null, 2)}\n`);
const missingManifestResult = spawnSync(process.execPath, [
  "scripts/build-youtube-publication-snapshot.mjs",
  `--report=${reportPath}`,
  `--output=${path.join(root, "missing-manifest-snapshot.json")}`,
  `--markdown=${path.join(root, "missing-manifest-snapshot.md")}`,
  `--cover-asset-config=${missingManifestConfigPath}`,
  `--playlist-registry=${playlistRegistryPath}`,
], { cwd: process.cwd(), encoding: "utf8" });
assert.notEqual(missingManifestResult.status, 0);
assert.match(missingManifestResult.stderr, /Required JSON file not found/);

console.log("youtube publication snapshot tests passed");
