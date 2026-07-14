#!/usr/bin/env node
import assert from "node:assert/strict";

import { sha256Json } from "./lib/youtube-publication-campaign.mjs";
import { buildZeroUploadRearm } from "./rearm-youtube-publication-campaign.mjs";

const replacementCampaignId = "old-campaign";
const oldManifestHash = "old-manifest";
const assignmentKey = "ordinary|deck|EN|FR";
const calendarAssignmentKey = `${assignmentKey}|en`;
const oldAssignment = {
  assignmentKey,
  calendarAssignmentKey,
  videoType: "ordinary",
  setId: "deck",
  supportLang: "EN",
  targetLang: "FR",
  channelKey: "en",
  publishAt: "2026-07-14T08:00:00.000Z",
  slotKey: "en|2026-07-14T08:00:00.000Z",
  status: "claimed",
};
const registry = {
  schemaVersion: 1,
  campaigns: [{
    campaignId: replacementCampaignId,
    manifestHash: oldManifestHash,
    setId: "deck",
    status: "reconciliation_required",
    assignmentKeys: [assignmentKey],
    slotKeys: [oldAssignment.slotKey],
    assignments: [oldAssignment],
    finalizeSummary: {
      completedCount: 0,
      observedCount: 0,
      artifactCount: 0,
      receiptErrorCount: 0,
    },
  }],
};
const calendar = {
  schemaVersion: 1,
  reservations: [{
    ...oldAssignment,
    campaignId: replacementCampaignId,
    campaignManifestHash: oldManifestHash,
    status: "campaign_claimed",
  }],
};
const recoveryAssignment = {
  ...oldAssignment,
  publishAt: "2026-07-14T13:30:00.000Z",
  slotKey: "en|2026-07-14T13:30:00.000Z",
  localDate: "2026-07-14",
  localTime: "14:30",
  timeZone: "Europe/London",
  routeKey: "youtube-1",
  youtubeEnvironment: "youtube-api-branding",
  youtubeChannelId: "UC-en",
  thumbnail: { mode: "first_frame_auto", ready: true },
  playlist: { ready: true, state: "resolved_existing", youtubePlaylistId: "PL-en-fr" },
};
const manifestWithoutHash = {
  schemaVersion: 1,
  generatedAt: "2026-07-14T07:10:00.000Z",
  mode: "read_only_no_spend_plan",
  setId: "deck",
  campaignId: "new-campaign",
  inputs: { supportCount: 1, ordinaryPerChannel: 1, polyglotPerChannel: 0, replacementCampaignId },
  evidence: { replacementCampaign: { campaignId: replacementCampaignId, manifestHash: oldManifestHash } },
  summary: {
    applyReady: true,
    assignmentCount: 1,
    firstPublishAt: recoveryAssignment.publishAt,
    lastPublishAt: recoveryAssignment.publishAt,
    routeCounts: { "youtube-1": 1 },
  },
  estimatedUsage: { providerCallsDuringPlan: 0, youtubeWritesDuringPlan: 0 },
  blockers: [],
  warnings: [],
  assignments: [recoveryAssignment],
};
const manifest = { ...manifestWithoutHash, manifestHash: sha256Json(manifestWithoutHash) };
const controlReport = {
  summary: {
    complete: true,
    healthy: true,
    paginationComplete: true,
    videoStatusReadbackComplete: true,
    blockerCount: 0,
  },
  blockers: [],
  sourceRuns: ["deck:all:run"],
  publications: [{ setId: "deck", assignmentKey: "ordinary|deck|EN|DE", youtubeVideoId: "existing-video" }],
};

const result = buildZeroUploadRearm({
  registry,
  calendar,
  manifest,
  beforeReport: controlReport,
  afterReport: controlReport,
  replacementCampaignId,
  now: new Date("2026-07-14T07:00:00.000Z"),
  minFutureMinutes: 300,
});
assert.equal(result.report.status, "rearm_ready");
assert.equal(result.report.assignmentCount, 1);
assert.equal(result.nextRegistry.campaigns[0].status, "superseded_zero_upload_recovery");
assert.equal(result.nextRegistry.campaigns[1].status, "claimed");
assert.equal(result.nextRegistry.campaigns[1].recoveryOfCampaignId, replacementCampaignId);
assert.equal(result.nextCalendar.reservations.filter((row) => row.status === "campaign_claimed").length, 1);
assert.equal(result.nextCalendar.reservations.filter((row) => row.status === "superseded_zero_upload_recovery").length, 1);

assert.throws(() => buildZeroUploadRearm({
  registry,
  calendar,
  manifest,
  beforeReport: controlReport,
  afterReport: {
    ...controlReport,
    publications: [...controlReport.publications, { setId: "deck", assignmentKey, youtubeVideoId: "new-video" }],
  },
  replacementCampaignId,
  now: new Date("2026-07-14T07:00:00.000Z"),
}), /live video ID set changed/);

const driftManifestWithoutHash = {
  ...manifestWithoutHash,
  assignments: [{ ...recoveryAssignment, assignmentKey: "ordinary|deck|EN|IT", targetLang: "IT" }],
};
const driftManifest = { ...driftManifestWithoutHash, manifestHash: sha256Json(driftManifestWithoutHash) };
assert.throws(() => buildZeroUploadRearm({
  registry,
  calendar,
  manifest: driftManifest,
  beforeReport: controlReport,
  afterReport: controlReport,
  replacementCampaignId,
  now: new Date("2026-07-14T07:00:00.000Z"),
}), /assignment set differs/);

console.log("youtube publication campaign zero-upload rearm tests passed");
