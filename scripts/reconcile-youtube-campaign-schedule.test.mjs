#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-campaign-schedule-reconcile-test-"));
const campaignId = "campaign-test";
const manifestHash = "manifest-test";
const assignment = {
  assignmentKey: "ordinary|deck|EN|DE",
  calendarAssignmentKey: "ordinary|deck|EN|DE|en",
  videoType: "ordinary",
  setId: "deck",
  supportLang: "EN",
  targetLang: "DE",
  channelKey: "en",
  publishAt: "2026-07-22T08:30:00.000Z",
  status: "upload_accepted_reconciliation_required",
  youtubeVideoId: "video-test",
};
const write = (name, value) => fs.writeFileSync(path.join(root, name), `${JSON.stringify(value, null, 2)}\n`);
write("campaigns.json", { campaigns: [{
  campaignId,
  manifestHash,
  status: "reconciliation_required",
  assignments: [assignment],
  finalizeSummary: { expectedCount: 1, observedCount: 1, missingCount: 0, duplicateAssignmentCount: 0, duplicateVideoIdCount: 0, unexpectedPublicationCount: 0, receiptErrorCount: 1 },
}] });
write("calendar.json", { reservations: [{ ...assignment, campaignId, campaignManifestHash: manifestHash, status: "campaign_upload_accepted" }] });
write("ordinary.json", { publications: [{
  setId: "deck", supportLang: "EN", targetLang: "DE", channelKey: "en", youtubeVideoId: "video-test",
  campaignId, campaignManifestHash: manifestHash, publicationStatus: "scheduled_uploaded", publishAt: "2026-07-23T08:30:00.000Z", scheduledPublishAt: "2026-07-23T08:30:00.000Z",
}] });
write("polyglot.json", { publications: [] });
write("report.json", {
  generatedAt: "2026-07-22T10:00:00.000Z",
  summary: { complete: true, paginationComplete: true, videoStatusReadbackComplete: true, expectedRouteCount: 4, receivedRouteCount: 4 },
  publications: [{ ...assignment, youtubeVideoId: "video-test", liveReadbackPresent: true, state: "scheduled", privacyStatus: "private", publishAt: "2026-07-23T08:30:00.000Z" }],
  blockers: [{ type: "live_schedule_missing_calendar", youtubeVideoId: "video-test" }],
});
write("snapshot.json", { decks: [{ publications: [{
  ...assignment, youtubeVideoId: "video-test", liveReadbackPresent: true, state: "scheduled", privacyStatus: "private", publishAt: "2026-07-23T08:30:00.000Z",
}] }] });
const args = [
  path.join(repoRoot, "scripts/reconcile-youtube-campaign-schedule.mjs"),
  `--campaign-id=${campaignId}`,
  "--report=report.json",
  "--snapshot=snapshot.json",
  "--campaign-registry=campaigns.json",
  "--calendar=calendar.json",
  "--ordinary-registry=ordinary.json",
  "--polyglot-registry=polyglot.json",
  "--output=output.json",
];
const before = fs.readFileSync(path.join(root, "campaigns.json"), "utf8");
const dryRun = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8" });
assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
assert.equal(JSON.parse(fs.readFileSync(path.join(root, "output.json"), "utf8")).summary.resolvedPublishAtMismatchCount, 1);
assert.equal(fs.readFileSync(path.join(root, "campaigns.json"), "utf8"), before);

const apply = spawnSync(process.execPath, [...args, "--apply", "--confirm=RECONCILE_YOUTUBE_CAMPAIGN_SCHEDULE"], { cwd: root, encoding: "utf8" });
assert.equal(apply.status, 0, apply.stderr || apply.stdout);
const campaign = JSON.parse(fs.readFileSync(path.join(root, "campaigns.json"), "utf8")).campaigns[0];
const calendar = JSON.parse(fs.readFileSync(path.join(root, "calendar.json"), "utf8")).reservations[0];
assert.equal(campaign.status, "finalized");
assert.equal(campaign.finalizeSummary.receiptErrorCount, 0);
assert.equal(campaign.assignments[0].actualPublishAt, "2026-07-23T08:30:00.000Z");
assert.equal(calendar.publishAt, "2026-07-23T08:30:00.000Z");
assert.equal(calendar.status, "campaign_finalized");

const idempotent = spawnSync(process.execPath, [...args, "--apply", "--confirm=RECONCILE_YOUTUBE_CAMPAIGN_SCHEDULE"], { cwd: root, encoding: "utf8" });
assert.equal(idempotent.status, 0, idempotent.stderr || idempotent.stdout);

write("report.json", { summary: { complete: false }, publications: [], blockers: [] });
const incomplete = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8" });
assert.notEqual(incomplete.status, 0);
assert.match(incomplete.stderr, /incomplete all-route live evidence/);

const polyglotRoot = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-campaign-schedule-polyglot-test-"));
const polyglotAssignment = {
  assignmentKey: "polyglot|deck|KM|romance_core|f34a59a474f1|short_unverified",
  calendarAssignmentKey: "polyglot-slot|deck|KM|romance_core|short_unverified|km",
  videoType: "polyglot",
  setId: "deck",
  supportLang: "KM",
  targetLangs: ["ES", "FR", "IT", "PT"],
  targetLangsHash: "f34a59a474f1",
  bundleKey: "romance_core",
  contentScope: "short_unverified",
  channelKey: "km",
  publishAt: "2026-07-22T08:30:00.000Z",
  status: "upload_accepted_reconciliation_required",
  youtubeVideoId: "polyglot-video-test",
};
const writePolyglot = (name, value) => fs.writeFileSync(path.join(polyglotRoot, name), `${JSON.stringify(value, null, 2)}\n`);
writePolyglot("campaigns.json", { campaigns: [{
  campaignId,
  manifestHash,
  status: "reconciliation_required",
  assignments: [polyglotAssignment],
  finalizeSummary: { expectedCount: 1, observedCount: 1, missingCount: 0, duplicateAssignmentCount: 0, duplicateVideoIdCount: 0, unexpectedPublicationCount: 0, receiptErrorCount: 1 },
}] });
writePolyglot("calendar.json", { reservations: [{ ...polyglotAssignment, campaignId, campaignManifestHash: manifestHash, status: "campaign_upload_accepted" }] });
writePolyglot("ordinary.json", { publications: [] });
writePolyglot("polyglot.json", { publications: [{
  ...polyglotAssignment,
  polyglotKey: "polyglot:deck:KM:romance_core:f34a59a474f1",
  campaignId,
  campaignManifestHash: manifestHash,
  publicationStatus: "scheduled_uploaded",
  publishAt: "2026-07-23T08:30:00.000Z",
  scheduledPublishAt: "2026-07-23T08:30:00.000Z",
}] });
writePolyglot("report.json", {
  generatedAt: "2026-07-22T10:00:00.000Z",
  summary: { complete: true, paginationComplete: true, videoStatusReadbackComplete: true, expectedRouteCount: 4, receivedRouteCount: 4 },
  publications: [{ ...polyglotAssignment, youtubeVideoId: "polyglot-video-test", liveReadbackPresent: true, state: "scheduled", privacyStatus: "private", publishAt: "2026-07-23T08:30:00.000Z" }],
  blockers: [{ type: "live_schedule_missing_calendar", youtubeVideoId: "polyglot-video-test" }],
});
writePolyglot("snapshot.json", { decks: [{ publications: [{
  setId: "deck",
  supportLang: "KM",
  targetLangs: ["PT", "IT", "FR", "ES"],
  bundleKey: "romance_core",
  contentScope: "short_unverified",
  channelKey: "km",
  youtubeVideoId: "polyglot-video-test",
  liveReadbackPresent: true,
  state: "scheduled",
  privacyStatus: "private",
  publishAt: "2026-07-23T08:30:00.000Z",
}] }] });
const polyglotArgs = [
  path.join(repoRoot, "scripts/reconcile-youtube-campaign-schedule.mjs"),
  `--campaign-id=${campaignId}`,
  "--report=report.json",
  "--snapshot=snapshot.json",
  "--campaign-registry=campaigns.json",
  "--calendar=calendar.json",
  "--ordinary-registry=ordinary.json",
  "--polyglot-registry=polyglot.json",
  "--output=output.json",
];
const polyglotDryRun = spawnSync(process.execPath, polyglotArgs, { cwd: polyglotRoot, encoding: "utf8" });
assert.equal(polyglotDryRun.status, 0, polyglotDryRun.stderr || polyglotDryRun.stdout);
assert.equal(JSON.parse(fs.readFileSync(path.join(polyglotRoot, "output.json"), "utf8")).summary.resolvedPublishAtMismatchCount, 1);

writePolyglot("snapshot.json", { decks: [{ publications: [{
  setId: "deck",
  supportLang: "KM",
  targetLangs: ["ES", "FR", "IT", "RU"],
  bundleKey: "romance_core",
  contentScope: "short_unverified",
  channelKey: "km",
  youtubeVideoId: "polyglot-video-test",
  liveReadbackPresent: true,
  state: "scheduled",
  privacyStatus: "private",
  publishAt: "2026-07-23T08:30:00.000Z",
}] }] });
const targetDrift = spawnSync(process.execPath, polyglotArgs, { cwd: polyglotRoot, encoding: "utf8" });
assert.notEqual(targetDrift.status, 0);
assert.match(targetDrift.stderr, /Snapshot assignment identity differs/);

console.log("youtube campaign schedule reconciliation tests passed");
