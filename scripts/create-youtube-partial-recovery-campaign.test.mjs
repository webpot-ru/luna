#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import { buildPartialRecovery } from "./create-youtube-partial-recovery-campaign.mjs";
import { calendarAssignmentKey } from "./lib/youtube-publication-control.mjs";

const durableRegistry = JSON.parse(fs.readFileSync("config/youtube-publication-campaigns.json", "utf8"));
const durableCalendar = JSON.parse(fs.readFileSync("config/youtube-publish-calendar.json", "utf8"));
const channels = JSON.parse(fs.readFileSync("config/youtube-channels.json", "utf8"));
const policy = JSON.parse(fs.readFileSync("config/youtube-publish-schedule-policy.json", "utf8"));
const currentRecovery = [...durableRegistry.campaigns]
  .filter((row) => row.recoveryOfCampaignId
    && (row.inputs?.assignmentKeys || row.assignmentKeys || []).length > 0
    && row.summary?.ordinaryCount > 0
    && row.summary?.polyglotCount > 0)
  .filter((row) => {
    const source = durableRegistry.campaigns.find((candidate) => candidate.campaignId === row.recoveryOfCampaignId);
    const keys = new Set(row.inputs?.assignmentKeys || row.assignmentKeys || []);
    return source && source.assignments.filter((assignment) =>
      keys.has(assignment.assignmentKey)
      && assignment.supersededByCampaignId === row.campaignId).length === keys.size;
  })
  .sort((left, right) => Date.parse(right.claimedAt || right.generatedAt || 0) - Date.parse(left.claimedAt || left.generatedAt || 0))[0];
assert(currentRecovery);
const sourceCampaignId = currentRecovery.recoveryOfCampaignId;

// Reconstruct the exact pre-apply source state in memory so this regression remains
// independent of the durable recovery claim that the production apply intentionally adds.
const registry = structuredClone(durableRegistry);
registry.campaigns = registry.campaigns.filter((row) => row.campaignId !== currentRecovery.campaignId);
const sourceCampaign = registry.campaigns.find((row) => row.campaignId === sourceCampaignId);
assert(sourceCampaign);
const selectedKeys = new Set(currentRecovery.evidence?.partialRecoveryCampaign
  ? currentRecovery.inputs.assignmentKeys
  : currentRecovery.assignmentKeys);
const expectedAssignmentCount = selectedKeys.size;
const restoredRows = sourceCampaign.assignments.filter((row) =>
  selectedKeys.has(row.assignmentKey)
  && row.supersededByCampaignId === currentRecovery.campaignId);
assert.equal(restoredRows.length, expectedAssignmentCount);
for (const row of restoredRows) {
  row.status = "missing";
  delete row.supersededAt;
  delete row.supersededByCampaignId;
}
sourceCampaign.assignmentKeys = [...new Set([...(sourceCampaign.assignmentKeys || []), ...restoredRows.map((row) => row.assignmentKey)])];
sourceCampaign.slotKeys = [...new Set([...(sourceCampaign.slotKeys || []), ...restoredRows.map((row) => row.slotKey)])];
sourceCampaign.partialRecoveryCampaignIds = (sourceCampaign.partialRecoveryCampaignIds || []).filter((id) => id !== currentRecovery.campaignId);

const calendar = structuredClone(durableCalendar);
calendar.reservations = calendar.reservations.filter((row) => row.campaignId !== currentRecovery.campaignId);
for (const row of calendar.reservations) {
  if (row.campaignId !== sourceCampaignId || row.supersededByCampaignId !== currentRecovery.campaignId) continue;
  row.status = "campaign_claimed";
  delete row.supersededAt;
  delete row.supersededByCampaignId;
}

// Exact-key partial recovery may intentionally select only the subset that is
// still proven missing by the fresh live audit. Other historical missing rows
// in the source campaign must remain untouched.
const missingRows = restoredRows;
assert.equal(missingRows.length, expectedAssignmentCount);
const assignmentKeys = missingRows.map((row) => row.assignmentKey);
const generatedAt = "2026-07-19T03:00:00.000Z";
const controlReports = ["youtube-1", "youtube-2", "youtube-3", "youtube-4"].map((routeKey) => {
  const rows = missingRows.filter((row) => row.routeKey === routeKey);
  return {
    setId: sourceCampaign.setId,
    generatedAt,
    supports: [...new Set(rows.map((row) => row.supportLang))],
    blockers: [],
    summary: { liveAuditPaginationComplete: true },
    evidence: { videoStatusReadback: true },
    publications: [],
    tails: rows.map((row) => row.videoType === "ordinary"
      ? { videoType: "ordinary", supportLang: row.supportLang, targetLang: row.targetLang }
      : { videoType: "polyglot", supportLang: row.supportLang, bundleKey: row.bundleKey, contentScope: "full" }),
  };
});

const result = buildPartialRecovery({
  registry,
  calendar,
  channels,
  policy,
  controlReports,
  campaignId: sourceCampaignId,
  assignmentKeys,
  now: new Date(generatedAt),
  minFutureMinutes: 90,
});

assert.equal(result.manifest.summary.applyReady, true);
assert.equal(result.manifest.summary.assignmentCount, expectedAssignmentCount);
assert.equal(result.manifest.summary.supportCount, new Set(missingRows.map((row) => row.supportLang)).size);
assert.equal(result.manifest.summary.ordinaryCount, missingRows.filter((row) => row.videoType === "ordinary").length);
assert.equal(result.manifest.summary.polyglotCount, missingRows.filter((row) => row.videoType === "polyglot").length);
assert.equal(result.manifest.inputs.ordinarySupportCount, currentRecovery.inputs.ordinarySupportCount);
assert.equal(result.manifest.inputs.polyglotSupportCount, currentRecovery.inputs.polyglotSupportCount);
assert.equal(result.manifest.inputs.allowPartialOrdinaryTail, true);
assert.equal(result.manifest.summary.customThumbnailCount, missingRows.filter((row) => row.thumbnail?.mode === "custom").length);
assert.equal(result.manifest.summary.automaticThumbnailCount, expectedAssignmentCount - result.manifest.summary.customThumbnailCount);
assert.deepEqual(result.manifest.summary.routeCounts, Object.fromEntries(["youtube-1", "youtube-2", "youtube-3", "youtube-4"].map((route) => [route, missingRows.filter((row) => row.routeKey === route).length])));
assert.equal(new Set(result.manifest.assignments.map((row) => row.assignmentKey)).size, expectedAssignmentCount);
assert(result.manifest.assignments.every((row) => Date.parse(row.publishAt) >= Date.parse(generatedAt) + 90 * 60_000));

const nextSource = result.nextRegistry.campaigns.find((row) => row.campaignId === sourceCampaignId);
const nextCampaign = result.nextRegistry.campaigns.find((row) => row.campaignId === result.manifest.campaignId);
assert.equal(nextCampaign.status, "claimed");
assert.equal(nextCampaign.assignments.length, expectedAssignmentCount);
assert.equal(nextSource.assignments.filter((row) =>
  assignmentKeys.includes(row.assignmentKey)
  && row.status === "superseded_partial_recovery").length, expectedAssignmentCount);
assert.equal(nextSource.assignmentKeys.filter((key) => assignmentKeys.includes(key)).length, 0);
assert.equal(result.nextCalendar.reservations.filter((row) => row.campaignId === result.manifest.campaignId && row.status === "campaign_claimed").length, expectedAssignmentCount);
assert.equal(result.manifest.generatedAt, generatedAt);

const ordinaryRow = missingRows.find((row) => row.videoType === "ordinary");
const collisionReports = structuredClone(controlReports);
collisionReports.find((report) => report.supports.includes(ordinaryRow.supportLang)).publications.push({
  ...ordinaryRow,
  youtubeVideoId: "existing-ordinary-video",
});
assert.throws(() => buildPartialRecovery({
  registry,
  calendar,
  channels,
  policy,
  controlReports: collisionReports,
  campaignId: sourceCampaignId,
  assignmentKeys,
  now: new Date(generatedAt),
}), /ordinary assignment already exists live/);

const registryWithAcceptedUpload = structuredClone(registry);
registryWithAcceptedUpload.campaigns
  .find((row) => row.campaignId === sourceCampaignId)
  .assignments.find((row) => row.assignmentKey === ordinaryRow.assignmentKey).youtubeVideoId = "accepted-video";
assert.throws(() => buildPartialRecovery({
  registry: registryWithAcceptedUpload,
  calendar,
  channels,
  policy,
  controlReports,
  campaignId: sourceCampaignId,
  assignmentKeys,
  now: new Date(generatedAt),
}), /already has YouTube video/);

const upgradeKey = "polyglot|deck|LO|romance_core|targets|short_unverified";
const upgradeRegistry = {
  campaigns: [{
    campaignId: "short-source",
    manifestHash: "source-hash",
    setId: "deck",
    status: "claimed",
    assignmentKeys: [upgradeKey],
    slotKeys: ["lo|2026-07-19T01:30:00.000Z"],
    assignments: [{
      assignmentKey: upgradeKey,
      calendarAssignmentKey: upgradeKey,
      videoType: "polyglot",
      setId: "deck",
      supportLang: "LO",
      bundleKey: "romance_core",
      contentScope: "short_unverified",
      targetLangs: ["ES", "FR", "IT", "PT"],
      targetLangsHash: "targets",
      polyglotKey: "polyglot:deck:LO:romance_core:targets:short_unverified",
      channelKey: "lo",
      youtubeChannelId: "channel-lo",
      routeKey: "youtube-3",
      youtubeEnvironment: "youtube-api-youtube-3",
      publishAt: "2026-07-19T01:30:00.000Z",
      localDate: "2026-07-19",
      localTime: "08:30",
      timeZone: "Asia/Vientiane",
      slotKey: "lo|2026-07-19T01:30:00.000Z",
      thumbnail: { mode: "first_frame_auto", ready: true },
      playlist: { state: "verified_absent", createAllowed: true },
      status: "claimed",
    }],
  }],
};
const upgradeCalendar = {
  reservations: [{
    ...upgradeRegistry.campaigns[0].assignments[0],
    campaignId: "short-source",
    campaignManifestHash: "source-hash",
    status: "campaign_claimed",
  }],
};
const upgradeCalendarKey = calendarAssignmentKey(upgradeRegistry.campaigns[0].assignments[0]);
upgradeRegistry.campaigns[0].assignments[0].calendarAssignmentKey = upgradeCalendarKey;
upgradeCalendar.reservations[0].calendarAssignmentKey = upgradeCalendarKey;
const upgradeChannels = { channels: [{ key: "lo", supportLangs: ["LO"], longVideoUploadAllowed: false, customThumbnailUploadAllowed: false }] };
const upgradeControl = [{
  setId: "deck",
  generatedAt,
  supports: ["LO"],
  blockers: [],
  summary: { liveAuditPaginationComplete: true },
  evidence: { videoStatusReadback: true },
  publications: [],
  tails: [{ videoType: "polyglot", supportLang: "LO", bundleKey: "romance_core", contentScope: "full" }],
}];
const upgradeResult = buildPartialRecovery({
  registry: upgradeRegistry,
  calendar: upgradeCalendar,
  channels: upgradeChannels,
  policy,
  controlReports: upgradeControl,
  campaignId: "short-source",
  assignmentKeys: [upgradeKey],
  polyglotScopeUpgrades: { [upgradeKey]: "full" },
  now: new Date(generatedAt),
  minFutureMinutes: 90,
});
assert.equal(upgradeResult.manifest.assignments[0].contentScope, "full");
assert.equal(upgradeResult.manifest.assignments[0].maxDurationSeconds, 895);
assert.match(upgradeResult.manifest.assignments[0].assignmentKey, /\|full$/u);
assert.equal(upgradeResult.nextRegistry.campaigns[0].assignments[0].status, "superseded_partial_recovery");
assert.throws(() => buildPartialRecovery({
  registry: upgradeRegistry,
  calendar: upgradeCalendar,
  channels: upgradeChannels,
  policy,
  controlReports: upgradeControl,
  campaignId: "short-source",
  assignmentKeys: [upgradeKey],
  polyglotScopeUpgrades: { [upgradeKey]: "short_unverified" },
  now: new Date(generatedAt),
}), /supported Polyglot scope upgrade/);

console.log("mixed YouTube partial recovery tests passed");
