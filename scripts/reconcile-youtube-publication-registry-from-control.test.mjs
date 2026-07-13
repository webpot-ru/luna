#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-registry-control-reconcile-test-"));
const ordinaryPath = path.join(root, "ordinary.json");
const polyglotPath = path.join(root, "polyglot.json");
const channelsPath = path.join(root, "channels.json");
const progressPath = path.join(root, "progress.json");
const report1Path = path.join(root, "deck1.json");
const report2Path = path.join(root, "deck2.json");

const liveOrdinary = {
  videoType: "ordinary",
  setId: "deck1",
  supportLang: "EN",
  targetLang: "DE",
  youtubeVideoId: "ordinary-live",
  privacyStatus: "public",
  publicationStatus: "live_youtube_upload_detected",
  liveReadbackPresent: true,
  durableRegistryPresent: false,
};
const livePolyglot = {
  videoType: "polyglot",
  setId: "deck1",
  supportLang: "MY",
  targetLangs: ["EN", "ES", "FR", "DE"],
  bundleKey: "global_europe_core",
  contentScope: "full",
  youtubeVideoId: "polyglot-live",
  privacyStatus: "public",
  publicationStatus: "live_youtube_upload_detected",
  liveReadbackPresent: true,
  durableRegistryPresent: true,
};
const completeSummary = { complete: true, paginationComplete: true, videoStatusReadbackComplete: true };
const deletedTombstone = {
  youtubeVideoId: "polyglot-deleted",
  setId: "deck1",
  supportLang: "MY",
  videoType: "polyglot",
  evidence: "uploads_playlist_title_deleted_video_and_videos_list_not_returned",
};

fs.writeFileSync(ordinaryPath, `${JSON.stringify({ publications: [
  { ...liveOrdinary, youtubeVideoId: "ordinary-stale", liveReadbackPresent: false, durableRegistryPresent: true },
  { ...livePolyglot, publicationStatus: "superseded", liveReadbackPresent: false },
  { ...livePolyglot, youtubeVideoId: "polyglot-deleted", publicationStatus: "published", liveReadbackPresent: false },
] }, null, 2)}\n`);
fs.writeFileSync(polyglotPath, `${JSON.stringify({ publications: [] }, null, 2)}\n`);
fs.writeFileSync(channelsPath, `${JSON.stringify({ channels: [
  { key: "en", channelId: "channel-en", supportLangs: ["EN"] },
  { key: "my", channelId: "channel-my", supportLangs: ["MY"] },
] }, null, 2)}\n`);
fs.writeFileSync(progressPath, `${JSON.stringify({ items: [
  { polyglotKey: "polyglot:deck1:MY:global_europe_core:test", youtubeVideoId: "polyglot-deleted", status: "published_uploaded_thumbnail_auto" },
] }, null, 2)}\n`);
fs.writeFileSync(report1Path, `${JSON.stringify({ summary: completeSummary, publications: [liveOrdinary, livePolyglot], deletedTombstones: [deletedTombstone], blockers: [] }, null, 2)}\n`);
fs.writeFileSync(report2Path, `${JSON.stringify({ summary: completeSummary, publications: [], blockers: [] }, null, 2)}\n`);

const args = [
  "scripts/reconcile-youtube-publication-registry-from-control.mjs",
  `--report=${report1Path}`,
  `--report=${report2Path}`,
  `--ordinary-registry=${ordinaryPath}`,
  `--polyglot-registry=${polyglotPath}`,
  `--polyglot-progress=${progressPath}`,
  `--channel-config=${channelsPath}`,
];
const beforeDryRun = fs.readFileSync(ordinaryPath, "utf8");
const dryRun = spawnSync(process.execPath, args, { cwd: process.cwd(), encoding: "utf8" });
assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
assert.equal(fs.readFileSync(ordinaryPath, "utf8"), beforeDryRun);

const incompletePath = path.join(root, "incomplete.json");
fs.writeFileSync(incompletePath, `${JSON.stringify({ summary: { ...completeSummary, paginationComplete: false }, publications: [], blockers: [] }, null, 2)}\n`);
const incomplete = spawnSync(process.execPath, [
  ...args.filter((arg) => !arg.startsWith(`--report=${report2Path}`)),
  `--report=${incompletePath}`,
], { cwd: process.cwd(), encoding: "utf8" });
assert.notEqual(incomplete.status, 0);
assert.match(incomplete.stderr, /incomplete live evidence/);

const apply = spawnSync(process.execPath, [...args, "--apply"], { cwd: process.cwd(), encoding: "utf8" });
assert.equal(apply.status, 0, apply.stderr || apply.stdout);
const ordinary = JSON.parse(fs.readFileSync(ordinaryPath, "utf8")).publications;
const polyglot = JSON.parse(fs.readFileSync(polyglotPath, "utf8")).publications;
const progress = JSON.parse(fs.readFileSync(progressPath, "utf8")).items;

assert.equal(ordinary.some((row) => row.videoType === "polyglot"), false);
assert.equal(ordinary.find((row) => row.youtubeVideoId === "ordinary-live")?.publicationStatus, "live_youtube_upload_detected");
assert.match(ordinary.find((row) => row.youtubeVideoId === "ordinary-stale")?.publicationStatus || "", /^superseded_registry_not_observed/);
assert.equal(polyglot.find((row) => row.youtubeVideoId === "polyglot-live")?.publicationStatus, "live_youtube_upload_detected");
assert.match(polyglot.find((row) => row.youtubeVideoId === "polyglot-live")?.polyglotKey || "", /^polyglot:deck1:MY:global_europe_core:/);
assert.equal(polyglot.find((row) => row.youtubeVideoId === "polyglot-deleted")?.publicationStatus, "deleted_youtube_tombstone_confirmed");
assert.equal(progress.find((row) => row.youtubeVideoId === "polyglot-deleted")?.status, "deleted_youtube_tombstone_confirmed");

console.log("youtube publication registry control reconciliation tests passed");
