#!/usr/bin/env node
import assert from "node:assert/strict";
import { buildClaimSupersession } from "./supersede-youtube-campaign-claims.mjs";
import { calendarAssignmentKey } from "./lib/youtube-publication-control.mjs";

const assignment = { assignmentKey: "polyglot|deck|BG|global|hash|short_unverified", setId: "deck", channelKey: "bg", slotKey: "bg|2026-07-16T08:30:00.000Z", supportLang: "BG", videoType: "polyglot", bundleKey: "global", contentScope: "short_unverified", targetLangs: ["EN"], targetLang: "EN", youtubeVideoId: "" };
assignment.calendarAssignmentKey = calendarAssignmentKey(assignment);
const registry = { campaigns: [{ campaignId: "campaign", status: "reconciliation_required", assignmentKeys: [assignment.assignmentKey], slotKeys: [assignment.slotKey], assignments: [assignment] }] };
const calendar = { reservations: [{ campaignId: "campaign", ...assignment, channelKey: "bg", publishAt: "2026-07-16T08:30:00.000Z", status: "campaign_claimed" }] };
const snapshot = { decks: [{ publications: [{ supportLang: "BG", videoType: "polyglot", bundleKey: "global", contentScope: "full", youtubeVideoId: "live-full", liveReadbackPresent: true, publishAt: "2026-07-16T08:30:00Z" }] }] };
const result = buildClaimSupersession({ registry, calendar, polyglotRegistry: { publications: [] }, progress: { items: [] }, snapshot, campaignId: "campaign", selectedSupports: ["BG"], bundle: "global", now: "2026-07-16T08:15:00.000Z" });
assert.equal(result.report.proof.zeroDurableReceipts, true);
assert.equal(result.nextRegistry.campaigns[0].assignmentKeys.length, 0);
assert.equal(result.nextRegistry.campaigns[0].assignments[0].status, "superseded_live_full_product_conflict");
assert.equal(result.nextCalendar.reservations[0].supersededByYoutubeVideoId, "live-full");
assert.throws(() => buildClaimSupersession({ registry, calendar, polyglotRegistry: { publications: [{ ...assignment, youtubeVideoId: "short-upload" }] }, progress: { items: [] }, snapshot, campaignId: "campaign", selectedSupports: ["BG"], bundle: "global" }), /durable YouTube receipts/);
console.log("youtube campaign scoped supersession tests passed");
