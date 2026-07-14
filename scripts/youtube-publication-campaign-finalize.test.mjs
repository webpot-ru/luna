#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-campaign-finalize-"));
const configDir = path.join(root, "config");
const artifactRoot = path.join(root, "artifacts");
fs.mkdirSync(configDir, { recursive: true });
const write = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};
const ordinaryAssignment = {
  assignmentKey: "ordinary|deck|EN|DE",
  calendarAssignmentKey: "ordinary|deck|EN|DE|en",
  videoType: "ordinary",
  setId: "deck",
  supportLang: "EN",
  targetLang: "DE",
  channelKey: "en",
  youtubeChannelId: "channel-en",
  youtubeEnvironment: "youtube-api-branding",
  routeKey: "youtube-1",
  publishAt: "2026-07-20T08:30:00.000Z",
  thumbnail: { mode: "first_frame_auto", ready: true },
  playlist: { ready: true, state: "resolved_existing", playlistKey: "EN__DE__ordinary-vocabulary__a1-everyday", youtubePlaylistId: "ordinary-playlist", createAllowed: false },
  status: "claimed",
};
const polyglotAssignment = {
  assignmentKey: "polyglot|deck|EN|global_europe_core|hash|full",
  calendarAssignmentKey: "polyglot-slot|deck|EN|global_europe_core|full|en",
  videoType: "polyglot",
  polyglotKey: "polyglot:deck:EN:global_europe_core:hash:full",
  setId: "deck",
  supportLang: "EN",
  targetLang: "ES,FR,IT,PT",
  targetLangs: ["ES", "FR", "IT", "PT"],
  targetLangsHash: "hash",
  bundleKey: "global_europe_core",
  contentScope: "full",
  channelKey: "en",
  youtubeChannelId: "channel-en",
  youtubeEnvironment: "youtube-api-branding",
  routeKey: "youtube-1",
  publishAt: "2026-07-20T11:30:00.000Z",
  thumbnail: { mode: "first_frame_auto", ready: true },
  playlist: { ready: true, state: "verified_absent", playlistKey: "POLYGLOT__EN__global-europe-core__hash", youtubePlaylistId: "", createAllowed: true },
  status: "claimed",
};
const campaign = {
  campaignId: "campaign-test",
  manifestHash: "manifest-hash",
  setId: "deck",
  status: "claimed",
  inputs: { supportCount: 1, ordinaryPerChannel: 1, polyglotPerChannel: 1, startDate: "2026-07-20" },
  evidence: { sourceFingerprints: { offlineDeck: { exists: true, sha256: "deck-sha256" } } },
  assignments: [ordinaryAssignment, polyglotAssignment],
  assignmentKeys: [ordinaryAssignment.assignmentKey, polyglotAssignment.assignmentKey],
  slotKeys: ["en|2026-07-20T08:30:00.000Z", "en|2026-07-20T11:30:00.000Z"],
};
write(path.join(configDir, "youtube-publication-campaigns.json"), { schemaVersion: 1, campaigns: [campaign] });
write(path.join(configDir, "youtube-publish-calendar.json"), {
  schemaVersion: 1,
  reservations: [ordinaryAssignment, polyglotAssignment].map((row) => ({
    ...row,
    campaignId: campaign.campaignId,
    campaignManifestHash: campaign.manifestHash,
    status: "campaign_claimed",
  })),
});
for (const name of ["youtube-published-videos.json", "youtube-polyglot-published-videos.json"]) write(path.join(configDir, name), { schemaVersion: 1, publications: [] });
for (const name of ["youtube-playlists.json", "youtube-polyglot-playlists.json"]) write(path.join(configDir, name), { schemaVersion: 1, playlists: [] });
write(path.join(configDir, "youtube-polyglot-progress.json"), { schemaVersion: 1, items: [] });
write(path.join(configDir, "youtube-channels.json"), { schemaVersion: 1, channels: [] });

const ordinaryArtifact = path.join(artifactRoot, "ordinary", "config");
const polyglotArtifact = path.join(artifactRoot, "polyglot", "config");
const publicationBase = {
  campaignId: campaign.campaignId,
  campaignManifestHash: campaign.manifestHash,
  setId: "deck",
  supportLang: "EN",
  channelKey: "en",
  publicationStatus: "scheduled_uploaded",
};
write(path.join(ordinaryArtifact, "youtube-published-videos.json"), {
  schemaVersion: 1,
  publications: [{
    ...publicationBase,
    targetLang: "DE",
    publishAt: ordinaryAssignment.publishAt,
    youtubeVideoId: "ordinary-video",
    youtubeVideoUrl: "https://youtu.be/ordinary-video",
    youtubePlaylistId: "ordinary-playlist",
    playlistItemId: "ordinary-playlist-item",
  }],
});
write(path.join(polyglotArtifact, "youtube-polyglot-published-videos.json"), {
  schemaVersion: 1,
  publications: [{
    ...publicationBase,
    videoType: "polyglot",
    polyglotKey: polyglotAssignment.polyglotKey,
    targetLang: polyglotAssignment.targetLang,
    targetLangs: polyglotAssignment.targetLangs,
    targetLangsHash: "hash",
    bundleKey: "global_europe_core",
    contentScope: "full",
    publishAt: polyglotAssignment.publishAt,
    youtubeVideoId: "polyglot-video",
    youtubeVideoUrl: "https://youtu.be/polyglot-video",
    youtubePlaylistId: "polyglot-playlist",
    playlistItemId: "polyglot-playlist-item",
  }],
});

const prepare = spawnSync(process.execPath, [
  path.join(repoRoot, "scripts/prepare-youtube-publication-campaign-run.mjs"),
  "--campaign-id=campaign-test",
  "--manifest-hash=manifest-hash",
  "--registry=config/youtube-publication-campaigns.json",
  "--calendar=config/youtube-publish-calendar.json",
  "--output=outputs/preflight.json",
], { cwd: root, encoding: "utf8" });
assert.equal(prepare.status, 0, prepare.stderr || prepare.stdout);
const preflight = JSON.parse(fs.readFileSync(path.join(root, "outputs/preflight.json"), "utf8"));
assert.equal(preflight.ordinaryMatrix[0].langs, "DE");
assert.equal(preflight.ordinaryMatrix[0].route_key, "youtube-1");
assert.equal(preflight.polyglotMatrix[0].bundle, "global_europe_core");
assert.equal(preflight.polyglotMatrix[0].route_key, "youtube-1");

const finalize = spawnSync(process.execPath, [
  path.join(repoRoot, "scripts/finalize-youtube-publication-campaign.mjs"),
  "--campaign-id=campaign-test",
  "--artifacts-root=artifacts",
  "--ordinary-result=success",
  "--polyglot-result=success",
  "--output=outputs/final.json",
], { cwd: root, encoding: "utf8" });
assert.equal(finalize.status, 0, finalize.stderr || finalize.stdout);
const finalReport = JSON.parse(fs.readFileSync(path.join(root, "outputs/final.json"), "utf8"));
assert.equal(finalReport.complete, true);
assert.equal(finalReport.completedCount, 2);
const finalCampaign = JSON.parse(fs.readFileSync(path.join(configDir, "youtube-publication-campaigns.json"), "utf8")).campaigns[0];
assert.equal(finalCampaign.status, "finalized");
assert.deepEqual(finalCampaign.assignments.map((row) => row.youtubeVideoId).sort(), ["ordinary-video", "polyglot-video"]);
const finalCalendar = JSON.parse(fs.readFileSync(path.join(configDir, "youtube-publish-calendar.json"), "utf8"));
assert(finalCalendar.reservations.every((row) => row.status === "campaign_finalized" && row.youtubeVideoId));

const failedRegistry = JSON.parse(fs.readFileSync(path.join(configDir, "youtube-publication-campaigns.json"), "utf8"));
failedRegistry.campaigns[0].status = "claimed";
write(path.join(configDir, "youtube-publication-campaigns.json"), failedRegistry);
const failedOrdinary = JSON.parse(fs.readFileSync(path.join(configDir, "youtube-published-videos.json"), "utf8"));
failedOrdinary.publications[0].postUploadError = "playlist write failed after videos.insert";
write(path.join(configDir, "youtube-published-videos.json"), failedOrdinary);
const failedFinalize = spawnSync(process.execPath, [
  path.join(repoRoot, "scripts/finalize-youtube-publication-campaign.mjs"),
  "--campaign-id=campaign-test",
  "--artifacts-root=artifacts",
  "--ordinary-result=success",
  "--polyglot-result=success",
  "--output=outputs/final-failed.json",
], { cwd: root, encoding: "utf8" });
assert.equal(failedFinalize.status, 0, failedFinalize.stderr || failedFinalize.stdout);
const failedReport = JSON.parse(fs.readFileSync(path.join(root, "outputs/final-failed.json"), "utf8"));
assert.equal(failedReport.complete, false);
assert.equal(failedReport.status, "reconciliation_required");
assert.equal(failedReport.receiptErrors.some((row) => row.code === "post_upload_error"), true);

console.log("youtube publication campaign finalizer tests passed");
