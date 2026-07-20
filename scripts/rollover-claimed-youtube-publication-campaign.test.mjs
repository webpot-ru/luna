#!/usr/bin/env node
import assert from "node:assert/strict";
import { sha256Json } from "./lib/youtube-publication-campaign.mjs";
import { buildClaimedCampaignRollover } from "./rollover-claimed-youtube-publication-campaign.mjs";

const assignment = { assignmentKey: "ordinary|deck|EN|FR", calendarAssignmentKey: "ordinary|deck|EN|FR|en", videoType: "ordinary", setId: "deck", supportLang: "EN", targetLang: "FR", targetLangs: [], channelKey: "en", youtubeChannelId: "UC-en", routeKey: "youtube-1", youtubeEnvironment: "youtube-api-branding", publishAt: "2026-07-20T08:30:00.000Z", localDate: "2026-07-20", localTime: "09:30", timeZone: "Europe/London", slotKey: "en|2026-07-20T08:30:00.000Z", thumbnail: { mode: "first_frame_auto", ready: true }, playlist: { ready: true, state: "resolved_existing", youtubePlaylistId: "PL-en-fr" }, status: "planned" };
const withoutHash = { schemaVersion: 1, generatedAt: "2026-07-20T07:00:00.000Z", mode: "read_only_no_spend_plan", setId: "deck", campaignId: "old-campaign", inputs: { supportCount: 1, ordinaryPerChannel: 1, polyglotPerChannel: 0 }, evidence: {}, summary: { applyReady: true, assignmentCount: 1, firstPublishAt: assignment.publishAt, lastPublishAt: assignment.publishAt, routeCounts: { "youtube-1": 1 } }, estimatedUsage: { providerCallsDuringPlan: 0, youtubeWritesDuringPlan: 0 }, blockers: [], warnings: [], assignments: [assignment] };
const sourceManifest = { ...withoutHash, manifestHash: sha256Json(withoutHash) };
const claimed = { ...assignment, status: "claimed" };
const registry = { campaigns: [{ campaignId: "old-campaign", manifestHash: sourceManifest.manifestHash, manifestPath: "config/youtube-publication-campaign-plans/old-campaign.json", setId: "deck", status: "claimed", assignmentKeys: [assignment.assignmentKey], slotKeys: [assignment.slotKey], assignments: [claimed] }] };
const calendar = { reservations: [{ ...claimed, campaignId: "old-campaign", campaignManifestHash: sourceManifest.manifestHash, status: "campaign_claimed" }] };
const policy = { default: { timezone: "Europe/London", dailySlotsLocal: ["08:30", "11:30"], maxVideosPerDay: 2, performanceCheckpointsHours: [24, 72] }, channels: {} };
const controlReport = { generatedAt: "2026-07-20T09:45:00.000Z", summary: { complete: true, paginationComplete: true, videoStatusReadbackComplete: true, unclassifiedRecentUploadCount: 0, activeVideoCount: 12 }, blockers: [], sourceRuns: ["deck:all:run"], publications: [{ assignmentKey: "ordinary|deck|EN|DE", youtubeVideoId: "existing" }] };
const args = { registry, calendar, policy, sourceManifest, controlReport, campaignId: "old-campaign", now: new Date("2026-07-20T10:00:00.000Z"), minFutureMinutes: 300 };

const result = buildClaimedCampaignRollover(args);
assert.equal(result.report.status, "rollover_ready");
assert.equal(result.report.assignmentCount, 1);
assert.equal(result.report.providerCalls, 0);
assert.equal(result.report.youtubeWrites, 0);
assert.equal(result.nextRegistry.campaigns[0].status, "superseded_unlaunched_claim_rollover");
assert.equal(result.nextRegistry.campaigns[1].status, "claimed");
assert.equal(result.nextCalendar.reservations.filter((row) => row.status === "campaign_claimed").length, 1);
assert.ok(Date.parse(result.report.firstPublishAt) >= Date.parse("2026-07-20T15:00:00.000Z"));
assert.throws(() => buildClaimedCampaignRollover({ ...args, controlReport: { ...controlReport, publications: [...controlReport.publications, { assignmentKey: assignment.assignmentKey, youtubeVideoId: "uploaded" }] } }), /already live/);
assert.throws(() => buildClaimedCampaignRollover({ ...args, registry: { campaigns: [{ ...registry.campaigns[0], githubRunId: "123" }] } }), /dispatch\/finalizer evidence/);
console.log("youtube claimed campaign rollover tests passed");
