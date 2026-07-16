#!/usr/bin/env node
import assert from "node:assert/strict";

import { reconcileCalendar } from "./reconcile-youtube-calendar-from-snapshot.mjs";

const snapshot = {
  generatedAt: "2026-07-13T08:00:00.000Z",
  decks: [{
    publications: [
      { videoType: "ordinary", setId: "deck", supportLang: "EN", targetLang: "NB", youtubeVideoId: "keep-update", privacyStatus: "private", state: "scheduled", publishAt: "2026-07-14T15:30:00Z", liveReadbackPresent: true },
      { videoType: "ordinary", setId: "deck", supportLang: "EN", targetLang: "IT", youtubeVideoId: "create-me", privacyStatus: "private", state: "scheduled", publishAt: "2026-07-14T18:30:00Z", liveReadbackPresent: true },
      { videoType: "ordinary", setId: "deck", supportLang: "EN", targetLang: "FR", youtubeVideoId: "dup-1", privacyStatus: "private", state: "scheduled", publishAt: "2026-07-14T21:30:00Z", liveReadbackPresent: true },
      { videoType: "ordinary", setId: "deck", supportLang: "EN", targetLang: "FR", youtubeVideoId: "dup-2", privacyStatus: "private", state: "scheduled", publishAt: "2026-07-14T21:30:00Z", liveReadbackPresent: true },
      { videoType: "ordinary", setId: "deck", supportLang: "EN", targetLang: "DE", youtubeVideoId: "slot-collision", privacyStatus: "private", state: "scheduled", publishAt: "2026-07-15T00:30:00Z", liveReadbackPresent: true },
    ],
    duplicateGroups: [{ evidenceTypes: ["duplicate_live_assignment"], videoIds: ["dup-1", "dup-2"] }],
  }],
};

const channelsConfig = {
  channels: [{ key: "en", channelId: "channel-en", supportLangs: ["EN", "EN-GB"] }],
};
const policy = {
  default: {
    timezone: "Etc/UTC",
    dailySlotsLocal: ["08:30", "11:30", "14:30", "17:30", "20:30", "23:30"],
    performanceCheckpointsHours: [24, 72],
  },
  channels: { en: { timezone: "America/New_York" } },
};
const calendar = {
  schemaVersion: 1,
  reservations: [
    { setId: "deck", supportLang: "EN", targetLang: "NB", channelKey: "en", youtubeVideoId: "keep-update", publishAt: "2026-07-14T12:30:00.000Z", status: "reserved" },
    { setId: "deck", supportLang: "EN", targetLang: "IT", channelKey: "en", youtubeVideoId: "cancelled-old-video", publishAt: "2026-07-14T18:30:00.000Z", status: "reserved", cancelledAt: "2026-07-13T07:00:00.000Z" },
    { setId: "other-deck", supportLang: "EN", targetLang: "ES", channelKey: "en", youtubeVideoId: "other-video", publishAt: "2026-07-15T00:30:00.000Z", status: "reserved" },
  ],
};

const first = reconcileCalendar({
  snapshot,
  calendar: structuredClone(calendar),
  channelsConfig,
  policy,
  now: "2026-07-13T08:05:00.000Z",
});
assert.equal(first.report.summary.scheduledLiveCandidates, 5);
assert.equal(first.report.summary.updated, 1);
assert.equal(first.report.summary.created, 1);
assert.equal(first.report.summary.skipped, 3);
assert.deepEqual(first.report.skipped.map((row) => row.reason).sort(), [
  "calendar_slot_collision",
  "live_duplicate_group",
  "live_duplicate_group",
]);
assert.equal(first.calendar.reservations.find((row) => row.youtubeVideoId === "keep-update").publishAt, "2026-07-14T15:30:00.000Z");
assert.equal(first.calendar.reservations.find((row) => row.youtubeVideoId === "cancelled-old-video").cancelledAt, "2026-07-13T07:00:00.000Z");
assert.equal(first.calendar.reservations.find((row) => row.youtubeVideoId === "create-me").localTime, "14:30");
assert.deepEqual(first.calendar.reservations.slice(0, 3).map((row) => row.youtubeVideoId), ["keep-update", "cancelled-old-video", "other-video"]);
assert.equal(first.calendar.reservations.at(-1).youtubeVideoId, "create-me");

const second = reconcileCalendar({
  snapshot,
  calendar: structuredClone(first.calendar),
  channelsConfig,
  policy,
  now: "2026-07-13T08:06:00.000Z",
});
assert.equal(second.report.summary.created, 0);
assert.equal(second.report.summary.updated, 0);
assert.equal(second.report.summary.unchanged, 2);
assert.equal(second.report.summary.skipped, 3);

const scoped = reconcileCalendar({
  snapshot,
  calendar: structuredClone(calendar),
  channelsConfig,
  policy,
  now: "2026-07-13T08:05:00.000Z",
  allowedVideoIds: ["create-me"],
});
assert.equal(scoped.report.summary.scheduledLiveCandidates, 1);
assert.equal(scoped.report.summary.created, 1);
assert.equal(scoped.report.summary.updated, 0);
assert.equal(scoped.report.summary.skipped, 0);
assert.equal(scoped.calendar.reservations.at(-1).youtubeVideoId, "create-me");

console.log("youtube calendar snapshot reconciliation tests passed");
