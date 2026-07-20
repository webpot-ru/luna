#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import { buildPartialRecovery } from "./create-youtube-partial-recovery-campaign.mjs";

const durableRegistry = JSON.parse(fs.readFileSync("config/youtube-publication-campaigns.json", "utf8"));
const durableCalendar = JSON.parse(fs.readFileSync("config/youtube-publish-calendar.json", "utf8"));
const channels = JSON.parse(fs.readFileSync("config/youtube-channels.json", "utf8"));
const policy = JSON.parse(fs.readFileSync("config/youtube-publish-schedule-policy.json", "utf8"));
const currentRecovery = [...durableRegistry.campaigns]
  .filter((row) => row.recoveryOfCampaignId
    && (row.inputs?.assignmentKeys || row.assignmentKeys || []).length > 0
    && row.summary?.ordinaryCount > 0
    && row.summary?.polyglotCount > 0)
  .sort((left, right) => Date.parse(right.claimedAt || right.generatedAt || 0) - Date.parse(left.claimedAt || left.generatedAt || 0))[0];
assert(currentRecovery);
const sourceCampaignId = currentRecovery.recoveryOfCampaignId;
const expected = currentRecovery.summary;

// Reconstruct the exact pre-apply source state in memory so this regression remains
// independent of the durable recovery claim that the production apply intentionally adds.
const registry = structuredClone(durableRegistry);
registry.campaigns = registry.campaigns.filter((row) => row.campaignId !== currentRecovery.campaignId);
const sourceCampaign = registry.campaigns.find((row) => row.campaignId === sourceCampaignId);
assert(sourceCampaign);
const selectedKeys = new Set(currentRecovery.evidence?.partialRecoveryCampaign
  ? currentRecovery.inputs.assignmentKeys
  : currentRecovery.assignmentKeys);
const restoredRows = sourceCampaign.assignments.filter((row) =>
  selectedKeys.has(row.assignmentKey)
  && row.supersededByCampaignId === currentRecovery.campaignId);
assert.equal(restoredRows.length, currentRecovery.assignmentKeys.length);
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
assert.equal(missingRows.length, currentRecovery.assignmentKeys.length);
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
assert.equal(result.manifest.summary.assignmentCount, expected.assignmentCount);
assert.equal(result.manifest.summary.supportCount, expected.supportCount);
assert.equal(result.manifest.summary.ordinaryCount, expected.ordinaryCount);
assert.equal(result.manifest.summary.polyglotCount, expected.polyglotCount);
assert.equal(result.manifest.inputs.ordinarySupportCount, currentRecovery.inputs.ordinarySupportCount);
assert.equal(result.manifest.inputs.polyglotSupportCount, currentRecovery.inputs.polyglotSupportCount);
assert.equal(result.manifest.inputs.allowPartialOrdinaryTail, true);
assert.equal(result.manifest.summary.customThumbnailCount, expected.customThumbnailCount);
assert.equal(result.manifest.summary.automaticThumbnailCount, expected.automaticThumbnailCount);
assert.deepEqual(result.manifest.summary.routeCounts, expected.routeCounts);
assert.equal(new Set(result.manifest.assignments.map((row) => row.assignmentKey)).size, expected.assignmentCount);
assert(result.manifest.assignments.every((row) => Date.parse(row.publishAt) >= Date.parse(generatedAt) + 90 * 60_000));

const nextSource = result.nextRegistry.campaigns.find((row) => row.campaignId === sourceCampaignId);
const nextCampaign = result.nextRegistry.campaigns.find((row) => row.campaignId === result.manifest.campaignId);
assert.equal(nextCampaign.status, "claimed");
assert.equal(nextCampaign.assignments.length, expected.assignmentCount);
assert.equal(nextSource.assignments.filter((row) =>
  assignmentKeys.includes(row.assignmentKey)
  && row.status === "superseded_partial_recovery").length, expected.assignmentCount);
assert.equal(nextSource.assignmentKeys.filter((key) => assignmentKeys.includes(key)).length, 0);
assert.equal(result.nextCalendar.reservations.filter((row) => row.campaignId === result.manifest.campaignId && row.status === "campaign_claimed").length, expected.assignmentCount);
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

console.log("mixed YouTube partial recovery tests passed");
