#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import { buildPartialRecovery } from "./create-youtube-partial-recovery-campaign.mjs";

const sourceCampaignId = "yt-home_kitchen_cooking_actions_a1_a2-2026-07-18-63e957e174e4";
const durableRegistry = JSON.parse(fs.readFileSync("config/youtube-publication-campaigns.json", "utf8"));
const durableCalendar = JSON.parse(fs.readFileSync("config/youtube-publish-calendar.json", "utf8"));
const channels = JSON.parse(fs.readFileSync("config/youtube-channels.json", "utf8"));
const policy = JSON.parse(fs.readFileSync("config/youtube-publish-schedule-policy.json", "utf8"));
const currentRecovery = durableRegistry.campaigns.find((row) =>
  row.recoveryOfCampaignId === sourceCampaignId
  && row.status === "claimed"
  && row.summary?.assignmentCount === 57);
assert(currentRecovery);

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
assert.equal(restoredRows.length, 57);
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

const missingRows = sourceCampaign.assignments.filter((row) => !row.youtubeVideoId && !String(row.status || "").includes("superseded"));
assert.equal(missingRows.length, 57);
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
assert.equal(result.manifest.summary.assignmentCount, 57);
assert.equal(result.manifest.summary.supportCount, 51);
assert.equal(result.manifest.summary.ordinaryCount, 6);
assert.equal(result.manifest.summary.polyglotCount, 51);
assert.equal(result.manifest.inputs.ordinarySupportCount, 2);
assert.equal(result.manifest.inputs.polyglotSupportCount, 51);
assert.equal(result.manifest.summary.customThumbnailCount, 16);
assert.equal(result.manifest.summary.automaticThumbnailCount, 41);
assert.deepEqual(result.manifest.summary.routeCounts, {
  "youtube-1": 18,
  "youtube-2": 13,
  "youtube-3": 13,
  "youtube-4": 13,
});
assert.equal(result.manifest.assignments.filter((row) => row.contentScope === "short_unverified").length, 35);
assert.equal(new Set(result.manifest.assignments.map((row) => row.assignmentKey)).size, 57);
assert(result.manifest.assignments.every((row) => Date.parse(row.publishAt) >= Date.parse(generatedAt) + 90 * 60_000));

const nextSource = result.nextRegistry.campaigns.find((row) => row.campaignId === sourceCampaignId);
const nextCampaign = result.nextRegistry.campaigns.find((row) => row.campaignId === result.manifest.campaignId);
assert.equal(nextCampaign.status, "claimed");
assert.equal(nextCampaign.assignments.length, 57);
assert.equal(nextSource.assignments.filter((row) => row.status === "superseded_partial_recovery").length, 57);
assert.equal(nextSource.assignmentKeys.filter((key) => assignmentKeys.includes(key)).length, 0);
assert.equal(result.nextCalendar.reservations.filter((row) => row.campaignId === result.manifest.campaignId && row.status === "campaign_claimed").length, 57);
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
