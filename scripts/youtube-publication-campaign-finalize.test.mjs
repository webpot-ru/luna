#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
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
const git = (...args) => {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
};
git("init", "-q");
git("config", "user.name", "YouTube Campaign Test");
git("config", "user.email", "youtube-campaign-test@example.invalid");
write(path.join(root, "data/decks/deck.json"), { cards: [{ id: "card-1" }] });
git("add", "data/decks/deck.json");
git("commit", "-q", "-m", "Add immutable deck fixture");
const historicalDeckBlob = git("rev-parse", "HEAD:data/decks/deck.json");
const historicalDeckSha256 = crypto.createHash("sha256")
  .update(fs.readFileSync(path.join(root, "data/decks/deck.json")))
  .digest("hex");
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
const readyChannelConfig = {
  schemaVersion: 1,
  channels: [{
    key: "en",
    supportLangs: ["EN"],
    longVideoUploadAllowed: true,
    videoProductionReadiness: { status: "ready", reason: "fixture_ready" },
  }],
};
write(path.join(configDir, "youtube-channels.json"), readyChannelConfig);

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

write(path.join(configDir, "youtube-channels.json"), {
  ...readyChannelConfig,
  channels: [{
    ...readyChannelConfig.channels[0],
    videoProductionReadiness: { status: "blocked", reason: "fixture_tts_unavailable" },
  }],
});
const blockedProductionPrepare = spawnSync(process.execPath, [
  path.join(repoRoot, "scripts/prepare-youtube-publication-campaign-run.mjs"),
  "--campaign-id=campaign-test",
  "--manifest-hash=manifest-hash",
  "--registry=config/youtube-publication-campaigns.json",
  "--calendar=config/youtube-publish-calendar.json",
  "--output=outputs/preflight-production-blocked.json",
], { cwd: root, encoding: "utf8" });
assert.notEqual(blockedProductionPrepare.status, 0);
assert.match(blockedProductionPrepare.stderr, /video production readiness is blocked \(fixture_tts_unavailable\)/u);

write(path.join(configDir, "youtube-channels.json"), {
  ...readyChannelConfig,
  channels: [{ ...readyChannelConfig.channels[0], longVideoUploadAllowed: false }],
});
const legacyFullPrepare = spawnSync(process.execPath, [
  path.join(repoRoot, "scripts/prepare-youtube-publication-campaign-run.mjs"),
  "--campaign-id=campaign-test",
  "--manifest-hash=manifest-hash",
  "--registry=config/youtube-publication-campaigns.json",
  "--calendar=config/youtube-publish-calendar.json",
  "--output=outputs/preflight-legacy-full.json",
], { cwd: root, encoding: "utf8" });
assert.notEqual(legacyFullPrepare.status, 0);
assert.match(legacyFullPrepare.stderr, /full Polyglot requires longVideoUploadAllowed=true/u);
write(path.join(configDir, "youtube-channels.json"), readyChannelConfig);

const preflightGithubOutput = path.join(root, "outputs/preflight-github-output.txt");
const preflightWithGithubOutput = spawnSync(process.execPath, [
  path.join(repoRoot, "scripts/prepare-youtube-publication-campaign-run.mjs"),
  "--campaign-id=campaign-test",
  "--manifest-hash=manifest-hash",
  "--registry=config/youtube-publication-campaigns.json",
  "--calendar=config/youtube-publish-calendar.json",
  "--output=outputs/preflight-github-output.json",
  `--github-output=${preflightGithubOutput}`,
], { cwd: root, encoding: "utf8" });
assert.equal(preflightWithGithubOutput.status, 0, preflightWithGithubOutput.stderr || preflightWithGithubOutput.stdout);
const preflightOutputs = fs.readFileSync(preflightGithubOutput, "utf8");
assert.match(preflightOutputs, /^ordinary_worker_count=1$/m);
assert.match(preflightOutputs, /^polyglot_worker_count=1$/m);

const partialTailCampaign = {
  ...campaign,
  campaignId: "campaign-partial-ordinary-tail",
  inputs: {
    ...campaign.inputs,
    supportCount: 2,
    ordinaryPerChannel: 2,
    allowPartialOrdinaryTail: true,
    polyglotPerChannel: 0,
  },
  assignments: [ordinaryAssignment],
  assignmentKeys: [ordinaryAssignment.assignmentKey],
  slotKeys: ["en|2026-07-20T08:30:00.000Z"],
};
write(path.join(configDir, "youtube-publication-campaigns.json"), { schemaVersion: 1, campaigns: [partialTailCampaign] });
write(path.join(configDir, "youtube-publish-calendar.json"), {
  schemaVersion: 1,
  reservations: [{
    ...ordinaryAssignment,
    campaignId: partialTailCampaign.campaignId,
    campaignManifestHash: partialTailCampaign.manifestHash,
    status: "campaign_claimed",
  }],
});
const partialTailPrepare = spawnSync(process.execPath, [
  path.join(repoRoot, "scripts/prepare-youtube-publication-campaign-run.mjs"),
  "--campaign-id=campaign-partial-ordinary-tail",
  "--manifest-hash=manifest-hash",
  "--registry=config/youtube-publication-campaigns.json",
  "--calendar=config/youtube-publish-calendar.json",
  "--output=outputs/preflight-partial-tail.json",
], { cwd: root, encoding: "utf8" });
assert.equal(partialTailPrepare.status, 0, partialTailPrepare.stderr || partialTailPrepare.stdout);
const partialTailPreflight = JSON.parse(fs.readFileSync(path.join(root, "outputs/preflight-partial-tail.json"), "utf8"));
assert.equal(partialTailPreflight.ordinaryMatrix[0].langs, "DE");

const legacyPartialRecoveryCampaign = {
  ...partialTailCampaign,
  campaignId: "campaign-legacy-partial-recovery",
  inputs: {
    ...partialTailCampaign.inputs,
    allowPartialOrdinaryTail: false,
    partialRecoveryOfCampaignId: "campaign-source",
  },
};
write(path.join(configDir, "youtube-publication-campaigns.json"), { schemaVersion: 1, campaigns: [legacyPartialRecoveryCampaign] });
write(path.join(configDir, "youtube-publish-calendar.json"), {
  schemaVersion: 1,
  reservations: [{
    ...ordinaryAssignment,
    campaignId: legacyPartialRecoveryCampaign.campaignId,
    campaignManifestHash: legacyPartialRecoveryCampaign.manifestHash,
    status: "campaign_claimed",
  }],
});
const legacyPartialRecoveryPrepare = spawnSync(process.execPath, [
  path.join(repoRoot, "scripts/prepare-youtube-publication-campaign-run.mjs"),
  "--campaign-id=campaign-legacy-partial-recovery",
  "--manifest-hash=manifest-hash",
  "--registry=config/youtube-publication-campaigns.json",
  "--calendar=config/youtube-publish-calendar.json",
  "--output=outputs/preflight-legacy-partial-recovery.json",
], { cwd: root, encoding: "utf8" });
assert.equal(legacyPartialRecoveryPrepare.status, 0, legacyPartialRecoveryPrepare.stderr || legacyPartialRecoveryPrepare.stdout);

const strictShortCampaign = {
  ...partialTailCampaign,
  campaignId: "campaign-strict-short",
  inputs: { ...partialTailCampaign.inputs, allowPartialOrdinaryTail: false },
};
write(path.join(configDir, "youtube-publication-campaigns.json"), { schemaVersion: 1, campaigns: [strictShortCampaign] });
write(path.join(configDir, "youtube-publish-calendar.json"), {
  schemaVersion: 1,
  reservations: [{
    ...ordinaryAssignment,
    campaignId: strictShortCampaign.campaignId,
    campaignManifestHash: strictShortCampaign.manifestHash,
    status: "campaign_claimed",
  }],
});
const strictShortPrepare = spawnSync(process.execPath, [
  path.join(repoRoot, "scripts/prepare-youtube-publication-campaign-run.mjs"),
  "--campaign-id=campaign-strict-short",
  "--manifest-hash=manifest-hash",
  "--registry=config/youtube-publication-campaigns.json",
  "--calendar=config/youtube-publish-calendar.json",
  "--output=outputs/preflight-strict-short.json",
], { cwd: root, encoding: "utf8" });
assert.notEqual(strictShortPrepare.status, 0);
assert.match(strictShortPrepare.stderr, /EN: ordinary rows 1 != 2/u);

const blobOnlyCampaign = {
  ...campaign,
  campaignId: "campaign-blob-only",
  evidence: {
    sourceFingerprints: { offlineDeck: { exists: true, sha256: historicalDeckSha256 } },
    deckSource: {
      mode: "historical_git_blob",
      historicalGitBlob: {
        available: true,
        matchesLocalFile: true,
        commit: "",
        blobId: historicalDeckBlob,
        localBlobId: historicalDeckBlob,
        path: "data/decks/deck.json",
        source: "explicit_verified_blob",
      },
    },
  },
};
write(path.join(configDir, "youtube-publication-campaigns.json"), { schemaVersion: 1, campaigns: [blobOnlyCampaign] });
write(path.join(configDir, "youtube-publish-calendar.json"), {
  schemaVersion: 1,
  reservations: [ordinaryAssignment, polyglotAssignment].map((row) => ({
    ...row,
    campaignId: blobOnlyCampaign.campaignId,
    campaignManifestHash: blobOnlyCampaign.manifestHash,
    status: "campaign_claimed",
  })),
});
const blobOnlyGithubOutput = path.join(root, "outputs/github-output.txt");
const blobOnlyPrepare = spawnSync(process.execPath, [
  path.join(repoRoot, "scripts/prepare-youtube-publication-campaign-run.mjs"),
  "--campaign-id=campaign-blob-only",
  "--manifest-hash=manifest-hash",
  "--registry=config/youtube-publication-campaigns.json",
  "--calendar=config/youtube-publish-calendar.json",
  "--output=outputs/preflight-blob-only.json",
  `--github-output=${blobOnlyGithubOutput}`,
], { cwd: root, encoding: "utf8" });
assert.equal(blobOnlyPrepare.status, 0, blobOnlyPrepare.stderr || blobOnlyPrepare.stdout);
const blobOnlyOutputs = fs.readFileSync(blobOnlyGithubOutput, "utf8");
assert.match(blobOnlyOutputs, /^offline_deck_git_commit=$/m);
assert.match(blobOnlyOutputs, new RegExp(`^offline_deck_git_blob=${historicalDeckBlob}$`, "m"));

write(path.join(root, "data/decks/deck.json"), { cards: [{ id: "card-2" }] });
git("add", "data/decks/deck.json");
git("commit", "-q", "-m", "Change immutable deck fixture");
const mismatchedDeckCommit = git("rev-parse", "HEAD");
const mismatchedCampaign = {
  ...blobOnlyCampaign,
  campaignId: "campaign-blob-mismatch",
  evidence: {
    ...blobOnlyCampaign.evidence,
    deckSource: {
      ...blobOnlyCampaign.evidence.deckSource,
      historicalGitBlob: {
        ...blobOnlyCampaign.evidence.deckSource.historicalGitBlob,
        commit: mismatchedDeckCommit,
      },
    },
  },
};
write(path.join(configDir, "youtube-publication-campaigns.json"), { schemaVersion: 1, campaigns: [mismatchedCampaign] });
write(path.join(configDir, "youtube-publish-calendar.json"), {
  schemaVersion: 1,
  reservations: [ordinaryAssignment, polyglotAssignment].map((row) => ({
    ...row,
    campaignId: mismatchedCampaign.campaignId,
    campaignManifestHash: mismatchedCampaign.manifestHash,
    status: "campaign_claimed",
  })),
});
const mismatchedPrepare = spawnSync(process.execPath, [
  path.join(repoRoot, "scripts/prepare-youtube-publication-campaign-run.mjs"),
  "--campaign-id=campaign-blob-mismatch",
  "--manifest-hash=manifest-hash",
  "--registry=config/youtube-publication-campaigns.json",
  "--calendar=config/youtube-publish-calendar.json",
  "--output=outputs/preflight-blob-mismatch.json",
], { cwd: root, encoding: "utf8" });
assert.notEqual(mismatchedPrepare.status, 0);
assert.match(mismatchedPrepare.stderr, /campaign historical Git deck source is incomplete/u);

const polyglotOnlyCampaign = {
  ...campaign,
  campaignId: "campaign-polyglot-only",
  inputs: { ...campaign.inputs, ordinaryPerChannel: 0, polyglotPerChannel: 1 },
  assignments: [polyglotAssignment],
  assignmentKeys: [polyglotAssignment.assignmentKey],
  slotKeys: ["en|2026-07-20T11:30:00.000Z"],
};
write(path.join(configDir, "youtube-publication-campaigns.json"), {
  schemaVersion: 1,
  campaigns: [campaign, polyglotOnlyCampaign],
});
write(path.join(configDir, "youtube-publish-calendar.json"), {
  schemaVersion: 1,
  reservations: [{
    ...polyglotAssignment,
    campaignId: polyglotOnlyCampaign.campaignId,
    campaignManifestHash: polyglotOnlyCampaign.manifestHash,
    status: "campaign_claimed",
  }],
});
const polyglotOnlyPrepare = spawnSync(process.execPath, [
  path.join(repoRoot, "scripts/prepare-youtube-publication-campaign-run.mjs"),
  "--campaign-id=campaign-polyglot-only",
  "--manifest-hash=manifest-hash",
  "--registry=config/youtube-publication-campaigns.json",
  "--calendar=config/youtube-publish-calendar.json",
  "--output=outputs/preflight-polyglot-only.json",
], { cwd: root, encoding: "utf8" });
assert.equal(polyglotOnlyPrepare.status, 0, polyglotOnlyPrepare.stderr || polyglotOnlyPrepare.stdout);
const polyglotOnlyPreflight = JSON.parse(fs.readFileSync(path.join(root, "outputs/preflight-polyglot-only.json"), "utf8"));
assert.equal(polyglotOnlyPreflight.ordinaryMatrix.length, 0);
assert.equal(polyglotOnlyPreflight.polyglotMatrix.length, 1);

const polyglotOnlyArtifactRoot = path.join(root, "artifacts-polyglot-only");
const polyglotOnlyArtifact = path.join(polyglotOnlyArtifactRoot, "polyglot", "config");
write(path.join(polyglotOnlyArtifact, "youtube-polyglot-published-videos.json"), {
  schemaVersion: 1,
  publications: [{
    ...publicationBase,
    campaignId: polyglotOnlyCampaign.campaignId,
    videoType: "polyglot",
    polyglotKey: polyglotAssignment.polyglotKey,
    targetLang: polyglotAssignment.targetLang,
    targetLangs: polyglotAssignment.targetLangs,
    targetLangsHash: "hash",
    bundleKey: "global_europe_core",
    contentScope: "full",
    publishAt: polyglotAssignment.publishAt,
    youtubeVideoId: "polyglot-only-video",
    youtubeVideoUrl: "https://youtu.be/polyglot-only-video",
    youtubePlaylistId: "polyglot-playlist",
    playlistItemId: "polyglot-only-playlist-item",
  }],
});
const polyglotOnlyFinalize = spawnSync(process.execPath, [
  path.join(repoRoot, "scripts/finalize-youtube-publication-campaign.mjs"),
  "--campaign-id=campaign-polyglot-only",
  "--artifacts-root=artifacts-polyglot-only",
  "--ordinary-result=failure",
  "--polyglot-result=success",
  "--output=outputs/final-polyglot-only.json",
], { cwd: root, encoding: "utf8" });
assert.equal(polyglotOnlyFinalize.status, 0, polyglotOnlyFinalize.stderr || polyglotOnlyFinalize.stdout);
const polyglotOnlyFinalReport = JSON.parse(fs.readFileSync(path.join(root, "outputs/final-polyglot-only.json"), "utf8"));
assert.equal(polyglotOnlyFinalReport.complete, true);

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
for (const name of ["youtube-published-videos.json", "youtube-polyglot-published-videos.json"]) {
  write(path.join(configDir, name), { schemaVersion: 1, publications: [] });
}
for (const name of ["youtube-playlists.json", "youtube-polyglot-playlists.json"]) {
  write(path.join(configDir, name), { schemaVersion: 1, playlists: [] });
}
write(path.join(configDir, "youtube-polyglot-progress.json"), { schemaVersion: 1, items: [] });

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
