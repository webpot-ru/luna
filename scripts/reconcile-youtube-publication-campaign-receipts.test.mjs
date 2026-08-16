#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-lost-receipt-"));
const write = (name, value) => {
  const file = path.join(root, name);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return file;
};
const campaignId = "campaign-lost-receipt";
const manifestHash = "manifest-lost-receipt";
const accepted = {
  assignmentKey: "ordinary|deck|UZ|EN",
  videoType: "ordinary",
  setId: "deck",
  supportLang: "UZ",
  targetLang: "EN",
  channelKey: "uz",
  youtubeChannelId: "channel-uz",
  routeKey: "youtube-4",
  publishAt: "2026-08-17T15:30:00.000Z",
  status: "upload_accepted",
  youtubeVideoId: "video-accepted",
  youtubeVideoUrl: "https://www.youtube.com/watch?v=video-accepted",
  playlist: { youtubePlaylistId: "playlist-en", playlistKey: "UZ__EN", state: "resolved_existing" },
  thumbnail: { mode: "custom" },
};
const lost = {
  ...accepted,
  assignmentKey: "ordinary|deck|UZ|ES",
  targetLang: "ES",
  publishAt: "2026-08-17T18:30:00.000Z",
  status: "claimed",
  youtubeVideoId: "",
  youtubeVideoUrl: "",
  playlist: { youtubePlaylistId: "playlist-es", playlistKey: "UZ__ES", state: "resolved_existing" },
};
const campaignRegistry = write("campaigns.json", {
  campaigns: [{
    campaignId,
    manifestHash,
    status: "reconciliation_required",
    assignments: [accepted, lost],
    assignmentKeys: [accepted.assignmentKey, lost.assignmentKey],
  }],
});
const calendar = write("calendar.json", { reservations: [accepted, lost].map((row) => ({
  ...row,
  campaignId,
  campaignManifestHash: manifestHash,
  youtubeVideoId: row.youtubeVideoId || "",
  status: row.youtubeVideoId ? "campaign_upload_accepted" : "campaign_claimed",
})) });
const ordinaryRegistry = write("ordinary.json", { publications: [{
  ...accepted,
  videoType: undefined,
  campaignId,
  campaignManifestHash: manifestHash,
  thumbnailSet: true,
  youtubePlaylistId: "playlist-en",
  playlistItemId: "item-en",
}] });
const polyglotRegistry = write("polyglot.json", { publications: [] });
const liveAccepted = {
  ...accepted,
  liveReadbackPresent: true,
  durableRegistryPresent: true,
  privacyStatus: "private",
  publicationStatus: "scheduled_uploaded",
};
const liveLost = {
  ...lost,
  youtubeVideoId: "video-lost",
  youtubeVideoUrl: "https://www.youtube.com/watch?v=video-lost",
  liveReadbackPresent: true,
  durableRegistryPresent: false,
  privacyStatus: "private",
  publicationStatus: "live_youtube_upload_detected",
};
const control = write("control.json", {
  generatedAt: "2026-08-16T04:34:18.361Z",
  summary: { complete: true, paginationComplete: true, videoStatusReadbackComplete: true },
  blockers: [
    { type: "live_schedule_missing_calendar", youtubeVideoId: "video-lost" },
    { type: "live_video_missing_durable_registry", youtubeVideoId: "video-lost" },
  ],
  publications: [liveAccepted, liveLost],
});
const finalizer = write("finalizer.json", {
  campaignId,
  manifestHash,
  generatedAt: "2026-08-16T04:00:00.000Z",
  complete: false,
  status: "reconciliation_required",
  expectedCount: 2,
  completedCount: 1,
  observedCount: 1,
  missingCount: 1,
  artifactCount: 1,
  workerResults: { ordinary: "failure", polyglot: "skipped" },
  duplicateAssignments: [],
  duplicateVideoIds: [],
  unexpectedPublications: [],
  receiptErrors: [],
});
const baseArgs = [
  path.join(repoRoot, "scripts/reconcile-youtube-publication-campaign-receipts.mjs"),
  `--campaign-id=${campaignId}`,
  `--manifest-hash=${manifestHash}`,
  `--control-report=${control}`,
  `--finalizer-report=${finalizer}`,
  `--campaign-registry=${campaignRegistry}`,
  `--calendar=${calendar}`,
  `--ordinary-registry=${ordinaryRegistry}`,
  `--polyglot-registry=${polyglotRegistry}`,
];

const unsafe = spawnSync(process.execPath, baseArgs, { encoding: "utf8" });
assert.notEqual(unsafe.status, 0);
assert.match(unsafe.stderr, /Evidence count mismatch/u);

const applied = spawnSync(process.execPath, [
  ...baseArgs,
  `--lost-receipt-assignment-key=${lost.assignmentKey}`,
  "--lost-receipt-video-id=video-lost",
  "--confirm=RECONCILE_LOST_YOUTUBE_UPLOAD_RECEIPT",
  "--apply",
], { encoding: "utf8" });
assert.equal(applied.status, 0, applied.stderr || applied.stdout);
const report = JSON.parse(applied.stdout);
assert.equal(report.matchedAssignmentCount, 2);
assert.equal(report.missingAssignmentCount, 0);
assert.equal(report.lostReceiptRecoveredCount, 1);

const nextCampaign = JSON.parse(fs.readFileSync(campaignRegistry, "utf8")).campaigns[0];
const recovered = nextCampaign.assignments.find((row) => row.assignmentKey === lost.assignmentKey);
assert.equal(recovered.status, "upload_accepted_reconciliation_required");
assert.equal(recovered.youtubeVideoId, "video-lost");
assert.equal(recovered.thumbnailSet, false);
assert.match(recovered.postUploadError, /lost receipt after videos\.insert/u);
assert.equal(nextCampaign.finalizeSummary.completedCount, 1);
assert.equal(nextCampaign.finalizeSummary.observedCount, 2);
assert.equal(nextCampaign.finalizeSummary.missingCount, 0);
assert.equal(nextCampaign.finalizeSummary.receiptErrorCount, 3);

const recoveredPublication = JSON.parse(fs.readFileSync(ordinaryRegistry, "utf8")).publications
  .find((row) => row.youtubeVideoId === "video-lost");
assert.equal(recoveredPublication.needsPlaylistInsert, true);
assert.equal(recoveredPublication.needsThumbnailPermission, true);
assert.equal(recoveredPublication.youtubePlaylistId, "playlist-es");
const recoveredCalendar = JSON.parse(fs.readFileSync(calendar, "utf8")).reservations
  .find((row) => row.targetLang === "ES");
assert.equal(recoveredCalendar.youtubeVideoId, "video-lost");
assert.equal(recoveredCalendar.status, "campaign_upload_accepted_reconciliation_required");

console.log("youtube lost receipt reconciliation tests passed");
