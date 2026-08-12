#!/usr/bin/env node
import assert from "node:assert/strict";

import { sha256Json } from "./lib/youtube-publication-campaign.mjs";
import { buildUnlaunchedClaimConsolidation } from "./consolidate-youtube-unlaunched-claims.mjs";

const assignment = {
  assignmentKey: "ordinary|deck|EN|FR",
  calendarAssignmentKey: "ordinary|deck|EN|FR|en",
  videoType: "ordinary",
  setId: "deck",
  supportLang: "EN",
  targetLang: "FR",
  channelKey: "en",
  youtubeChannelId: "channel-en",
  routeKey: "youtube-1",
  youtubeEnvironment: "youtube-api-youtube-1",
  publishAt: "2026-07-29T12:30:00.000Z",
  timeZone: "Etc/UTC",
  localDate: "2026-07-29",
  localTime: "12:30",
  localSlotIndex: 0,
  slotKey: "en|2026-07-29T12:30:00.000Z",
  thumbnail: { mode: "first_frame_auto", ready: true },
  playlist: { ready: true, state: "resolved_existing", youtubePlaylistId: "playlist", createAllowed: false },
};
const manifest = {
  schemaVersion: 1,
  generatedAt: "2026-07-28T03:00:00.000Z",
  mode: "read_only_no_spend_plan",
  setId: "deck",
  inputs: { supportCount: 1, ordinaryPerChannel: 1, polyglotPerChannel: 0 },
  evidence: {},
  summary: { applyReady: true, assignmentCount: 1 },
  blockers: [],
  warnings: [],
  assignments: [assignment],
  campaignId: "yt-deck-2026-07-28-test",
};
manifest.manifestHash = sha256Json(manifest);
const registry = {
  schemaVersion: 1,
  campaigns: [{
    campaignId: "old",
    setId: "deck",
    status: "claimed",
    assignmentKeys: [assignment.assignmentKey],
    slotKeys: [assignment.slotKey],
    assignments: [{ ...assignment, status: "claimed" }],
  }],
};
const calendar = {
  schemaVersion: 1,
  reservations: [{
    campaignId: "old",
    campaignManifestHash: "old-hash",
    status: "campaign_claimed",
    ...assignment,
  }],
};
const controlReport = {
  generatedAt: "2026-07-28T03:00:00.000Z",
  sourceRuns: ["deck:youtube-1:1"],
  summary: { complete: true, healthy: true, blockerCount: 0, paginationComplete: true, videoStatusReadbackComplete: true, unclassifiedRecentUploadCount: 0, activeVideoCount: 0 },
  publications: [],
};
const result = buildUnlaunchedClaimConsolidation({
  registry,
  calendar,
  manifest,
  controlReport,
  now: new Date("2026-07-28T03:01:00.000Z"),
  expectedSourceClaims: 1,
});
assert.equal(result.report.status, "consolidation_ready");
assert.equal(result.report.sourceClaimCount, 1);
assert.equal(result.nextRegistry.campaigns.find((row) => row.campaignId === "old").status, "superseded_unlaunched_claim_consolidation");
assert.equal(result.nextRegistry.campaigns.find((row) => row.campaignId === manifest.campaignId).status, "claimed");
assert.equal(result.nextCalendar.reservations.filter((row) => row.campaignId === manifest.campaignId).length, 1);
assert.equal(result.nextCalendar.reservations.find((row) => row.campaignId === "old").status, "superseded_integrated_plan");

const acceptedAssignment = {
  ...assignment,
  assignmentKey: "ordinary|deck|EN|DE",
  calendarAssignmentKey: "ordinary|deck|EN|DE|en",
  targetLang: "DE",
  publishAt: "2026-07-28T12:30:00.000Z",
  slotKey: "en|2026-07-28T12:30:00.000Z",
  youtubeVideoId: "accepted-video",
};
const partialRegistry = {
  schemaVersion: 1,
  campaigns: [{
    campaignId: "partial",
    setId: "deck",
    status: "reconciliation_required",
    finalizedAt: "2026-07-28T02:30:00.000Z",
    finalizeSummary: { missingCount: 1, completedCount: 1 },
    assignmentKeys: [assignment.assignmentKey, acceptedAssignment.assignmentKey],
    slotKeys: [assignment.slotKey, acceptedAssignment.slotKey],
    assignments: [
      { ...assignment, status: "claimed" },
      { ...acceptedAssignment, status: "upload_accepted" },
    ],
  }],
};
const partialCalendar = {
  schemaVersion: 1,
  reservations: [
    { campaignId: "partial", campaignManifestHash: "old-hash", status: "campaign_claimed", ...assignment },
    { campaignId: "partial", campaignManifestHash: "old-hash", status: "campaign_upload_accepted", ...acceptedAssignment },
  ],
};
const partialResult = buildUnlaunchedClaimConsolidation({
  registry: partialRegistry,
  calendar: partialCalendar,
  manifest,
  controlReport,
  sourceCampaignId: "partial",
  now: new Date("2026-07-28T03:01:00.000Z"),
  expectedSourceClaims: 1,
});
const retainedPartial = partialResult.nextRegistry.campaigns.find((row) => row.campaignId === "partial");
assert.equal(retainedPartial.status, "reconciliation_required");
assert.equal(retainedPartial.assignments.find((row) => row.assignmentKey === assignment.assignmentKey).status, "superseded_integrated_plan");
assert.equal(retainedPartial.assignments.find((row) => row.assignmentKey === acceptedAssignment.assignmentKey).status, "upload_accepted");
assert.equal(partialResult.report.selectedSourceCampaignId, "partial");

const enDe = {
  ...assignment,
  assignmentKey: "ordinary|deck|EN|DE",
  calendarAssignmentKey: "ordinary|deck|EN|DE|en",
  targetLang: "DE",
  publishAt: "2026-07-30T12:30:00.000Z",
  slotKey: "en|2026-07-30T12:30:00.000Z",
};
const ruEn = {
  ...assignment,
  assignmentKey: "ordinary|deck|RU|EN",
  calendarAssignmentKey: "ordinary|deck|RU|EN|ru",
  supportLang: "RU",
  targetLang: "EN",
  channelKey: "ru",
  youtubeChannelId: "channel-ru",
  publishAt: "2026-07-29T13:30:00.000Z",
  slotKey: "ru|2026-07-29T13:30:00.000Z",
};
const ruPolyglot = {
  ...ruEn,
  assignmentKey: "polyglot|deck|RU|romance_core|hash|full",
  calendarAssignmentKey: "polyglot-slot|deck|RU|romance_core|full|ru",
  videoType: "polyglot",
  targetLang: "ES,FR,IT,PT",
  targetLangs: ["ES", "FR", "IT", "PT"],
  targetLangsHash: "hash",
  bundleKey: "romance_core",
  contentScope: "full",
  polyglotKey: "polyglot:deck:RU:romance_core:hash:full",
  publishAt: "2026-07-30T13:30:00.000Z",
  slotKey: "ru|2026-07-30T13:30:00.000Z",
};
const completionManifest = {
  ...manifest,
  mode: "read_only_no_spend_completion_tail_plan",
  inputs: {
    supportCount: 2,
    ordinarySupportCount: 2,
    polyglotSupportCount: 1,
    ordinaryPerChannel: 2,
    polyglotPerChannel: 4,
    allowPartialOrdinaryTail: true,
    allowPartialPolyglotTail: true,
    completionTailMode: true,
  },
  assignments: [assignment, enDe, ruEn, ruPolyglot],
  campaignId: "yt-deck-2026-07-28-completion",
};
delete completionManifest.manifestHash;
completionManifest.manifestHash = sha256Json(completionManifest);
const completionResult = buildUnlaunchedClaimConsolidation({
  registry,
  calendar,
  manifest: completionManifest,
  controlReport,
  now: new Date("2026-07-28T03:01:00.000Z"),
  expectedSourceClaims: 1,
});
assert.equal(completionResult.report.assignmentCount, 4);
assert.equal(completionResult.report.sourceClaimCount, 1);

const missingSourceManifest = {
  ...completionManifest,
  assignments: completionManifest.assignments.filter((row) => row.assignmentKey !== assignment.assignmentKey),
  campaignId: "yt-deck-2026-07-28-missing-source",
};
delete missingSourceManifest.manifestHash;
missingSourceManifest.manifestHash = sha256Json(missingSourceManifest);
assert.throws(() => buildUnlaunchedClaimConsolidation({
  registry,
  calendar,
  manifest: missingSourceManifest,
  controlReport,
  now: new Date("2026-07-28T03:01:00.000Z"),
  expectedSourceClaims: 1,
}), /active source claim is missing from the consolidated manifest/u);

assert.throws(() => buildUnlaunchedClaimConsolidation({
  registry: {
    campaigns: [{
      ...registry.campaigns[0],
      campaignId: "still-running",
      status: "running",
    }],
  },
  calendar: {
    reservations: [{
      ...calendar.reservations[0],
      campaignId: "still-running",
    }],
  },
  manifest,
  controlReport,
  now: new Date("2026-07-28T03:01:00.000Z"),
  expectedSourceClaims: 1,
}), /in-flight campaign/u);

console.log("youtube unlaunched claim consolidation tests passed");
