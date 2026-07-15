#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { buildPublicationCampaign, verifyCampaignManifest } from "./youtube-publication-campaign.mjs";
import { loadCanonicalSupportRouting } from "./youtube-support-routing.mjs";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-publication-campaign-"));
const writeJson = (name, value) => {
  const filePath = path.join(tempRoot, name);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return filePath;
};
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const snapshot = readJson("config/youtube-publication-snapshot.json");
snapshot.generatedAt = "2026-07-14T00:00:00.000Z";
const channels = readJson("config/youtube-channels.json");
channels.channels = channels.channels.map((channel) => ({
  ...channel,
  customThumbnailUploadAllowed: false,
  thumbnailFallbackMode: "first_frame_auto",
  longVideoUploadAllowed: false,
}));
const routingFixture = readJson("config/youtube-api-project-routing.json");
const canonicalRouting = loadCanonicalSupportRouting();
const discoveryChannels = [...canonicalRouting.supportToChannel.entries()].map(([supportLang, channel]) => {
  return {
    supportLang,
    channelKey: channel.key,
    youtubeChannelId: channel.channelId,
    routeKey: canonicalRouting.supportToRoute.get(supportLang).key,
    complete: true,
    playlists: [],
  };
});
const paths = {
  snapshotPath: writeJson("snapshot.json", snapshot),
  channelsPath: writeJson("channels.json", channels),
  routingPath: writeJson("routing.json", routingFixture),
  policyPath: writeJson("policy.json", readJson("config/youtube-publish-schedule-policy.json")),
  calendarPath: writeJson("calendar.json", { schemaVersion: 1, reservations: [] }),
  campaignRegistryPath: writeJson("campaigns.json", { schemaVersion: 1, campaigns: [] }),
  coverRegistryPath: writeJson("covers.json", { schemaVersion: 1, policy: { activeStatus: "approved" }, manifests: [] }),
  deckSourcesPath: writeJson("deck-sources.json", { home_kitchen_cooking_actions_a1_a2: "test-drive-file-id" }),
  offlineDeckPath: writeJson("offline-deck.json", { setId: "home_kitchen_cooking_actions_a1_a2" }),
  ordinaryPlaylistRegistryPath: writeJson("ordinary-playlists.json", { schemaVersion: 1, playlists: [] }),
  polyglotPlaylistRegistryPath: writeJson("polyglot-playlists.json", { schemaVersion: 1, playlists: [] }),
  playlistDiscoveryPath: writeJson("playlist-discovery.json", {
    schemaVersion: 1,
    generatedAt: "2026-07-14T00:00:00.000Z",
    complete: true,
    summary: { complete: true, blockerCount: 0, supportCount: 51 },
    channels: discoveryChannels,
  }),
};
const baseOptions = {
  setId: "home_kitchen_cooking_actions_a1_a2",
  supports: "ALL",
  ordinaryPerChannel: 5,
  polyglotPerChannel: 1,
  startDate: "2026-07-14",
  minFutureMinutes: 90,
  maxSnapshotAgeMinutes: 30,
  now: new Date("2026-07-14T00:00:00.000Z"),
  ...paths,
};

const first = buildPublicationCampaign(baseOptions);
verifyCampaignManifest(first);
assert.equal(first.summary.applyReady, true);
assert.equal(first.summary.supportCount, 51);
assert.equal(first.summary.ordinaryCount, 255);
assert.equal(first.summary.polyglotCount, 51);
assert.equal(first.summary.assignmentCount, 306);
assert.deepEqual(first.summary.routeCounts, { "youtube-1": 72, "youtube-2": 78, "youtube-3": 78, "youtube-4": 78 });
assert.equal(new Set(first.assignments.map((row) => row.assignmentKey)).size, 306);
assert.equal(new Set(first.assignments.map((row) => row.slotKey)).size, 306);
assert.equal(first.estimatedUsage.estimatedVideoUploadCalls, 306);
assert.equal(first.estimatedUsage.estimatedPlaylistItemInsertUnits, 15_300);
assert.equal(first.estimatedUsage.estimatedPlaylistCreateUnitsMaximum, 15_300);
assert.equal(first.estimatedUsage.estimatedThumbnailSetUnits, 0);
assert.equal(first.estimatedUsage.estimatedGeneralQuotaUnitsMaximum, 30_600);
assert.equal(first.estimatedUsage.estimatedQuotaUnitsMaximum, 30_906);
assert.equal(first.summary.playlistCreateCount, 306);
assert.equal(first.summary.existingPlaylistCount, 0);
assert.deepEqual(
  Object.fromEntries(Object.entries(first.estimatedUsage.byRoute).map(([key, value]) => [key, value.estimatedVideoUploadCalls])),
  { "youtube-1": 72, "youtube-2": 78, "youtube-3": 78, "youtube-4": 78 },
);
assert(Object.values(first.estimatedUsage.byRoute).every((row) => row.estimatedVideoUploadCalls <= 100));
assert(Object.values(first.estimatedUsage.byRoute).every((row) => row.estimatedGeneralQuotaUnitsMaximum <= 10_000));
assert.equal(first.estimatedUsage.directGeminiRequestsCurrentWorkerLayout, 102);
assert.equal(first.estimatedUsage.directGeminiRequestsCampaignRouteBatchSize5, 63);
assert.equal(first.estimatedUsage.directGeminiRequestsCampaignWideBatchSize5, 62);
assert(first.assignments.every((row) => row.thumbnail.mode === "first_frame_auto" && row.thumbnail.ready));
assert(first.assignments.filter((row) => row.videoType === "polyglot").every((row) => (
  row.contentScope === "short_unverified" && row.cardLimit === 0 && row.maxDurationSeconds === 895
)), "unverified channels must claim an explicit <=14:55 short Polyglot product");
assert(first.assignments.every((row) => row.playlist.state === "verified_absent" && row.playlist.createAllowed));

const subsetSupports = ["EN", "RU"];
const subsetDiscovery = readJson(paths.playlistDiscoveryPath);
subsetDiscovery.channels = subsetDiscovery.channels.filter((channel) => subsetSupports.includes(channel.supportLang));
subsetDiscovery.summary.supportCount = subsetSupports.length;
const subsetPlan = buildPublicationCampaign({
  ...baseOptions,
  supports: subsetSupports.join(","),
  playlistDiscoveryPath: writeJson("playlist-discovery-subset.json", subsetDiscovery),
});
assert.equal(subsetPlan.summary.applyReady, true);
assert.equal(subsetPlan.summary.supportCount, subsetSupports.length);
assert.equal(subsetPlan.summary.assignmentCount, 12);

const crossScopeSnapshot = readJson(paths.snapshotPath);
const crossScopeDeck = crossScopeSnapshot.decks.find((deck) => deck.setId === "home_kitchen_cooking_actions_a1_a2");
crossScopeDeck.publications.push({
  setId: "home_kitchen_cooking_actions_a1_a2",
  supportLang: "EN",
  videoType: "polyglot",
  bundleKey: "global_europe_core",
  contentScope: "short_unverified",
  targetLangs: ["ES", "FR", "DE", "IT"],
  youtubeVideoId: "active-short-video",
  liveReadbackPresent: true,
});
const fullEligibleChannels = readJson(paths.channelsPath);
fullEligibleChannels.channels = fullEligibleChannels.channels.map((channel) => (
  channel.key === "en" ? { ...channel, longVideoUploadAllowed: true } : channel
));
const crossScopePlan = buildPublicationCampaign({
  ...baseOptions,
  snapshotPath: writeJson("snapshot-cross-scope.json", crossScopeSnapshot),
  channelsPath: writeJson("channels-full-en.json", fullEligibleChannels),
});
assert.equal(crossScopePlan.summary.applyReady, false);
assert(crossScopePlan.blockers.some((row) => row.includes("EN: global_europe_core full is blocked by active short_unverified Polyglot video active-short-video")));

const oneExistingDiscovery = readJson(paths.playlistDiscoveryPath);
const firstAssignment = first.assignments[0];
const firstChannelDiscovery = oneExistingDiscovery.channels.find((row) => row.supportLang === firstAssignment.supportLang);
firstChannelDiscovery.playlists.push({
  id: "PL-existing-campaign-test",
  title: firstAssignment.playlist.title,
  description: "",
  youtubeChannelId: firstAssignment.youtubeChannelId,
  privacyStatus: "public",
  videoIds: [],
});
const oneExistingPlan = buildPublicationCampaign({
  ...baseOptions,
  playlistDiscoveryPath: writeJson("playlist-discovery-one-existing.json", oneExistingDiscovery),
});
assert.equal(oneExistingPlan.summary.applyReady, true);
assert.equal(oneExistingPlan.summary.existingPlaylistCount, 1);
assert.equal(oneExistingPlan.summary.playlistCreateCount, 305);
assert.equal(oneExistingPlan.assignments[0].playlist.youtubePlaylistId, "PL-existing-campaign-test");

const stalePlaylistDiscovery = readJson(paths.playlistDiscoveryPath);
stalePlaylistDiscovery.generatedAt = "2026-07-13T00:00:00.000Z";
const stalePlaylistDiscoveryPath = writeJson("playlist-discovery-stale.json", stalePlaylistDiscovery);
const stalePlaylistPlan = buildPublicationCampaign({ ...baseOptions, playlistDiscoveryPath: stalePlaylistDiscoveryPath });
assert(stalePlaylistPlan.blockers.some((row) => row.includes("playlist discovery snapshot is not fresh enough")));

const noDurableDeckSource = buildPublicationCampaign({
  ...baseOptions,
  deckSourcesPath: writeJson("deck-sources-empty.json", {}),
});
assert(noDurableDeckSource.blockers.some((row) => row.includes("offline deck is not Git-tracked")));

const oversizedRouteWave = buildPublicationCampaign({ ...baseOptions, ordinaryPerChannel: 8 });
assert(oversizedRouteWave.blockers.some((row) => row.includes("videos.insert bucket")));

const laterHint = buildPublicationCampaign({ ...baseOptions, startDate: "2026-08-01" });
assert(
  laterHint.assignments.some((row) => row.localDate < "2026-08-01"),
  "fill-earliest campaign scheduling must not create a calendar gap for a later date hint",
);

for (const support of new Set(first.assignments.map((row) => row.supportLang))) {
  const rows = first.assignments.filter((row) => row.supportLang === support);
  assert.equal(rows.length, 6);
  assert.equal(rows.filter((row) => row.videoType === "ordinary").length, 5);
  assert.equal(rows.filter((row) => row.videoType === "polyglot").length, 1);
  const localDates = [...new Set(rows.map((row) => row.localDate))].sort();
  for (let index = 1; index < localDates.length; index += 1) {
    const previous = new Date(`${localDates[index - 1]}T12:00:00Z`);
    const current = new Date(`${localDates[index]}T12:00:00Z`);
    assert.equal((current - previous) / 86_400_000, 1, `${support} campaign dates must be contiguous`);
  }
}

const manifestPath = writeJson("manifest.json", first);
const claimArgs = [
  "scripts/claim-youtube-publication-campaign.mjs",
  `--manifest=${manifestPath}`,
  `--campaign-registry=${paths.campaignRegistryPath}`,
  `--calendar=${paths.calendarPath}`,
  `--plans-dir=${path.join(tempRoot, "plans")}`,
  "--max-plan-age-minutes=10000",
  "--apply",
  "--confirm=CLAIM_YOUTUBE_PUBLICATION_CAMPAIGN",
  "--json",
];
const firstClaim = spawnSync(process.execPath, claimArgs, { cwd: process.cwd(), encoding: "utf8" });
assert.equal(firstClaim.status, 0, firstClaim.stderr || firstClaim.stdout);
assert.match(firstClaim.stdout, /"status": "claimed"/);
assert.equal(readJson(paths.calendarPath).reservations.length, 306);
assert.equal(readJson(paths.campaignRegistryPath).campaigns.length, 1);
assert(fs.existsSync(path.join(tempRoot, "plans", `${first.campaignId}.json`)));

const secondClaim = spawnSync(process.execPath, claimArgs, { cwd: process.cwd(), encoding: "utf8" });
assert.equal(secondClaim.status, 0, secondClaim.stderr || secondClaim.stdout);
assert.match(secondClaim.stdout, /"status": "already_claimed"/);
assert.equal(readJson(paths.calendarPath).reservations.length, 306);

fs.writeFileSync(paths.campaignRegistryPath, `${JSON.stringify({ schemaVersion: 1, campaigns: [] }, null, 2)}\n`, "utf8");
const recoveredClaim = spawnSync(process.execPath, claimArgs, { cwd: process.cwd(), encoding: "utf8" });
assert.equal(recoveredClaim.status, 0, recoveredClaim.stderr || recoveredClaim.stdout);
assert.match(recoveredClaim.stdout, /"status": "claimed"/);
assert.equal(readJson(paths.calendarPath).reservations.length, 306, "claim recovery must not duplicate calendar rows");
assert.equal(readJson(paths.campaignRegistryPath).campaigns.length, 1, "claim recovery must restore the missing campaign registry row");

const failedAfterUploadRegistry = readJson(paths.campaignRegistryPath);
failedAfterUploadRegistry.campaigns[0].status = "reconciliation_required";
fs.writeFileSync(paths.campaignRegistryPath, `${JSON.stringify(failedAfterUploadRegistry, null, 2)}\n`, "utf8");
const next = buildPublicationCampaign(baseOptions);
assert.equal(next.summary.applyReady, true);
assert.equal(next.summary.assignmentCount, 306);
const firstKeys = new Set(first.assignments.map((row) => row.assignmentKey));
assert(next.assignments.every((row) => !firstKeys.has(row.assignmentKey)), "active recovery claims must prevent duplicate content selection");
const firstSlots = new Set(first.assignments.map((row) => row.slotKey));
assert(next.assignments.every((row) => !firstSlots.has(row.slotKey)), "active recovery claims must prevent duplicate calendar slots");

console.log("youtube publication campaign tests passed");
