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
  videoProductionReadiness: { status: "ready", reason: "fixture_ready", checkedAt: "2026-07-26" },
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
assert.equal(first.estimatedUsage.metadataMaximumOpenAiAttempts, 63);
assert.equal(first.estimatedUsage.metadataMaximumDirectGeminiAttempts, 126);
assert.equal(first.estimatedUsage.metadataMaximumVectorEngineAttempts, 184);
assert.equal(first.estimatedUsage.metadataMaximumProviderAttempts, 373);
assert.equal(first.estimatedUsage.renderJobCount, 306);
assert(first.assignments.every((row) => row.thumbnail.mode === "first_frame_auto" && row.thumbnail.ready));
assert(first.assignments.filter((row) => row.videoType === "polyglot").every((row) => (
  row.contentScope === "short_unverified"
  && row.cardLimit === 0
  && row.maxDurationSeconds === 895
  && row.autoFallbackReason === "long_video_upload_not_confirmed"
)), "channels without confirmed long-video capability must be planned as measured short Polyglots before claim");
assert.equal(first.summary.fullPolyglotCount, 0);
assert.equal(first.summary.shortUnverifiedPolyglotCount, 51);
assert(first.assignments.every((row) => row.playlist.state === "verified_absent" && row.playlist.createAllowed));

const productionBlockedChannels = readJson(paths.channelsPath);
productionBlockedChannels.channels = productionBlockedChannels.channels.map((channel) => (
  channel.key === "hy" ? {
    ...channel,
    videoProductionReadiness: {
      status: "blocked",
      reason: "fixture_ai33_unavailable",
      checkedAt: "2026-07-26",
    },
  } : channel
));
const productionDeferredPlan = buildPublicationCampaign({
  ...baseOptions,
  channelsPath: writeJson("channels-production-blocked-hy.json", productionBlockedChannels),
});
assert.equal(productionDeferredPlan.summary.applyReady, true);
assert.equal(productionDeferredPlan.summary.assignmentCount, 300);
assert.equal(productionDeferredPlan.summary.productionDeferredSupportCount, 1);
assert.equal(productionDeferredPlan.summary.productionDeferredAssignmentCount, 6);
assert.equal(productionDeferredPlan.assignments.filter((row) => row.supportLang === "HY").length, 0);
assert.equal(productionDeferredPlan.evidence.productionDeferredAssignments.filter((row) => row.supportLang === "HY").length, 6);

const customEligibleChannels = readJson(paths.channelsPath);
customEligibleChannels.channels = customEligibleChannels.channels.map((channel) => (
  channel.key === "en" ? { ...channel, customThumbnailUploadAllowed: true } : channel
));
const missingDeclaredCoverManifestPlan = buildPublicationCampaign({
  ...baseOptions,
  supports: "EN",
  channelsPath: writeJson("channels-custom-en.json", customEligibleChannels),
  coverRegistryPath: writeJson("covers-missing-declared-manifest.json", {
    schemaVersion: 1,
    policy: { activeStatus: "approved" },
    manifests: [{
      id: "missing-deck2-ordinary-manifest",
      setId: "home_kitchen_cooking_actions_a1_a2",
      videoType: "ordinary",
      status: "approved",
      path: path.join(tempRoot, "missing-approved-manifest.json"),
    }],
  }),
  playlistDiscoveryPath: writeJson("playlist-discovery-en-missing-manifest.json", {
    ...readJson(paths.playlistDiscoveryPath),
    summary: { complete: true, blockerCount: 0, supportCount: 1 },
    channels: readJson(paths.playlistDiscoveryPath).channels.filter((channel) => channel.supportLang === "EN"),
  }),
});
assert(missingDeclaredCoverManifestPlan.blockers.some((row) => row.includes("missing-deck2-ordinary-manifest (missing)")));

const checksumMismatchPlan = buildPublicationCampaign({
  ...baseOptions,
  supports: "EN",
  ordinaryPerChannel: 1,
  polyglotPerChannel: 0,
  channelsPath: writeJson("channels-custom-en-checksum.json", customEligibleChannels),
  coverRegistryPath: writeJson("covers-checksum-mismatch.json", {
    schemaVersion: 1,
    policy: { activeStatus: "approved" },
    manifests: [{
      id: "checksum-mismatch",
      setId: "home_kitchen_cooking_actions_a1_a2",
      videoType: "ordinary",
      status: "approved",
      path: writeJson("checksum-mismatch-manifest.json", {
        covers: [{
          status: "approved",
          setId: "home_kitchen_cooking_actions_a1_a2",
          videoType: "ordinary",
          supportLang: "EN",
          targetLang: "HI",
          assignmentKey: "ordinary|home_kitchen_cooking_actions_a1_a2|EN|HI",
          relativePath: "data/youtube-cover-assets/yt-home_kitchen_cooking_actions_a1_a2-2026-07-14-30b96a246c69/by-assignment/ordinary-home_kitchen_cooking_actions_a1_a2-EN-HI.jpg",
          sha256: "not-the-real-checksum",
        }],
      }),
    }],
  }),
  playlistDiscoveryPath: writeJson("playlist-discovery-en-checksum.json", {
    ...readJson(paths.playlistDiscoveryPath),
    summary: { complete: true, blockerCount: 0, supportCount: 1 },
    channels: readJson(paths.playlistDiscoveryPath).channels.filter((channel) => channel.supportLang === "EN"),
  }),
});
assert(checksumMismatchPlan.blockers.some((row) => row.includes("approved_cover_checksum_mismatch")));

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

const enTails = snapshot.decks
  .find((deck) => deck.setId === "home_kitchen_cooking_actions_a1_a2")
  .tails.filter((tail) => tail.videoType === "ordinary" && tail.supportLang === "EN");
const claimedEnTailKeys = enTails.slice(0, -3).map((tail) => (
  `ordinary|home_kitchen_cooking_actions_a1_a2|EN|${tail.targetLang}`
));
const partialTailRegistryPath = writeJson("campaigns-partial-tail.json", {
  schemaVersion: 1,
  campaigns: [{
    campaignId: "claimed-en-tail-fixture",
    status: "claimed",
    assignmentKeys: claimedEnTailKeys,
    slotKeys: [],
    assignments: [],
  }],
});
const enDiscovery = readJson(paths.playlistDiscoveryPath);
enDiscovery.channels = enDiscovery.channels.filter((channel) => channel.supportLang === "EN");
enDiscovery.summary.supportCount = 1;
const strictExhaustedTailPlan = buildPublicationCampaign({
  ...baseOptions,
  supports: "EN",
  polyglotPerChannel: 0,
  campaignRegistryPath: partialTailRegistryPath,
  playlistDiscoveryPath: writeJson("playlist-discovery-en-partial-strict.json", enDiscovery),
});
assert(strictExhaustedTailPlan.blockers.some((row) => row.includes("only 3/5 unclaimed ordinary tails available")));
assert(strictExhaustedTailPlan.blockers.some((row) => row.includes("ordinary assignment count 3 != 5")));
const allowedExhaustedTailPlan = buildPublicationCampaign({
  ...baseOptions,
  supports: "EN",
  polyglotPerChannel: 0,
  allowPartialOrdinaryTail: true,
  campaignRegistryPath: partialTailRegistryPath,
  playlistDiscoveryPath: writeJson("playlist-discovery-en-partial-allowed.json", enDiscovery),
});
assert.equal(allowedExhaustedTailPlan.summary.applyReady, true);
assert.equal(allowedExhaustedTailPlan.summary.ordinaryCount, 3);
assert.equal(allowedExhaustedTailPlan.inputs.allowPartialOrdinaryTail, true);

const releasedPartialRecoveryKey = claimedEnTailKeys[0];
const releasedPartialRecoveryRegistryPath = writeJson("campaigns-released-partial-recovery.json", {
  schemaVersion: 1,
  campaigns: [{
    campaignId: "released-en-tail-fixture",
    status: "reconciliation_required",
    assignmentKeys: claimedEnTailKeys,
    slotKeys: [],
    assignments: claimedEnTailKeys.map((assignmentKey, index) => ({
      assignmentKey,
      videoType: "ordinary",
      setId: "home_kitchen_cooking_actions_a1_a2",
      supportLang: "EN",
      targetLang: assignmentKey.split("|").at(-1),
      status: index === 0 ? "superseded_partial_recovery" : "claimed",
    })),
  }],
});
const releasedPartialRecoveryPlan = buildPublicationCampaign({
  ...baseOptions,
  supports: "EN",
  polyglotPerChannel: 0,
  allowPartialOrdinaryTail: true,
  campaignRegistryPath: releasedPartialRecoveryRegistryPath,
  playlistDiscoveryPath: writeJson("playlist-discovery-en-released-partial-recovery.json", enDiscovery),
});
assert.equal(releasedPartialRecoveryPlan.summary.ordinaryCount, 4);
assert(releasedPartialRecoveryPlan.assignments.some((row) => row.assignmentKey === releasedPartialRecoveryKey),
  "a superseded partial-recovery assignment must not be re-claimed through the campaign top-level assignmentKeys fallback");

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
assert.equal(crossScopePlan.summary.applyReady, true);
const nextFullAfterShort = crossScopePlan.assignments.find((row) => row.videoType === "polyglot" && row.supportLang === "EN");
assert.notEqual(nextFullAfterShort.bundleKey, "global_europe_core", "active short must defer its full replacement and select the next missing bundle");
assert.equal(nextFullAfterShort.contentScope, "full");

const deferredShortDiscovery = readJson(paths.playlistDiscoveryPath);
deferredShortDiscovery.channels = deferredShortDiscovery.channels.filter((channel) => channel.supportLang === "EN");
deferredShortDiscovery.summary.supportCount = 1;
const planAfterPublishedShort = buildPublicationCampaign({
  ...baseOptions,
  supports: "EN",
  snapshotPath: writeJson("snapshot-published-short.json", crossScopeSnapshot),
  playlistDiscoveryPath: writeJson("playlist-discovery-published-short.json", deferredShortDiscovery),
});
assert.equal(planAfterPublishedShort.summary.applyReady, true);
const nextPolyglotAfterShort = planAfterPublishedShort.assignments.find((row) => row.videoType === "polyglot");
assert.notEqual(nextPolyglotAfterShort.bundleKey, "global_europe_core", "published short must keep its full tail deferred and select the next missing bundle");
assert.equal(nextPolyglotAfterShort.contentScope, "short_unverified");

const activeShortClaim = {
  schemaVersion: 1,
  campaigns: [{
    campaignId: "claimed-short",
    status: "claimed",
    assignmentKeys: ["polyglot|home_kitchen_cooking_actions_a1_a2|EN|romance_core|f34a59a474f1|short_unverified"],
    slotKeys: [],
    assignments: [{
      videoType: "polyglot",
      setId: "home_kitchen_cooking_actions_a1_a2",
      supportLang: "EN",
      bundleKey: "romance_core",
      contentScope: "short_unverified",
      targetLangs: ["ES", "FR", "IT", "PT"],
    }],
  }],
};
const planAfterActiveShortClaim = buildPublicationCampaign({
  ...baseOptions,
  supports: "EN",
  channelsPath: writeJson("channels-full-en-claim.json", fullEligibleChannels),
  campaignRegistryPath: writeJson("campaigns-active-short.json", activeShortClaim),
  playlistDiscoveryPath: writeJson("playlist-discovery-en-claim.json", {
    ...readJson(paths.playlistDiscoveryPath),
    summary: { complete: true, blockerCount: 0, supportCount: 1 },
    channels: readJson(paths.playlistDiscoveryPath).channels.filter((channel) => channel.supportLang === "EN"),
  }),
});
const enClaimPolyglot = planAfterActiveShortClaim.assignments.find((row) => row.videoType === "polyglot");
assert.notEqual(enClaimPolyglot.bundleKey, "romance_core", "an active short claim must block a new full claim for the same product slot");

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
  "--max-plan-age-minutes=20000",
  "--apply",
  "--confirm=CLAIM_YOUTUBE_PUBLICATION_CAMPAIGN",
  "--json",
];
const firstClaim = spawnSync(process.execPath, claimArgs, { cwd: process.cwd(), encoding: "utf8" });
assert.equal(firstClaim.status, 0, firstClaim.stderr || firstClaim.stdout);
assert.match(firstClaim.stdout, /"status": "claimed"/);
assert.equal(readJson(paths.calendarPath).reservations.length, 306);
assert.equal(readJson(paths.campaignRegistryPath).campaigns.length, 1);
assert(readJson(paths.campaignRegistryPath).campaigns[0].assignments
  .filter((row) => row.videoType === "polyglot")
  .every((row) => row.contentScope === "short_unverified" && row.maxDurationSeconds === 895),
"claim must retain the short duration contract for the dispatch preflight");
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
