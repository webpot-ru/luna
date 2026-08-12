#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  composeIntegratedRecoveryAssignments,
  sourceRowsFromActiveClaims,
  sourceRowsFromCampaign,
} from "./plan-youtube-integrated-recovery-wave.mjs";

function assignment({ assignmentKey, supportLang, videoType, slotKey }) {
  return {
    assignmentKey,
    calendarAssignmentKey: `${assignmentKey}|calendar`,
    supportLang,
    videoType,
    channelKey: supportLang.toLowerCase(),
    youtubeChannelId: `channel-${supportLang}`,
    routeKey: "youtube-1",
    youtubeEnvironment: "youtube-api-youtube-1",
    publishAt: `2026-08-01T${slotKey.slice(-2)}:00:00.000Z`,
    slotKey,
    thumbnail: { mode: "automatic" },
    playlist: { state: "resolved_existing", youtubePlaylistId: `playlist-${assignmentKey}` },
  };
}

const baseAssignments = [
  assignment({ assignmentKey: "ordinary|set|A|a1", supportLang: "A", videoType: "ordinary", slotKey: "a|01" }),
  assignment({ assignmentKey: "ordinary|set|A|a2", supportLang: "A", videoType: "ordinary", slotKey: "a|02" }),
  assignment({ assignmentKey: "ordinary|set|B|b1", supportLang: "B", videoType: "ordinary", slotKey: "b|01" }),
  assignment({ assignmentKey: "ordinary|set|B|b2", supportLang: "B", videoType: "ordinary", slotKey: "b|02" }),
  assignment({ assignmentKey: "polyglot|set|A|bundle-a", supportLang: "A", videoType: "polyglot", slotKey: "a|03" }),
  assignment({ assignmentKey: "polyglot|set|B|bundle-b", supportLang: "B", videoType: "polyglot", slotKey: "b|03" }),
];

const sourceRows = [
  assignment({ assignmentKey: "ordinary|set|A|a1", supportLang: "A", videoType: "ordinary", slotKey: "old|01" }),
  assignment({ assignmentKey: "ordinary|set|A|a3", supportLang: "A", videoType: "ordinary", slotKey: "old|02" }),
  assignment({ assignmentKey: "ordinary|set|B|b2", supportLang: "B", videoType: "ordinary", slotKey: "old|03" }),
  assignment({ assignmentKey: "polyglot|set|A|old-bundle-a", supportLang: "A", videoType: "polyglot", slotKey: "old|04" }),
  assignment({ assignmentKey: "polyglot|set|B|old-bundle-b", supportLang: "B", videoType: "polyglot", slotKey: "old|05" }),
];

const result = composeIntegratedRecoveryAssignments({
  supports: ["A", "B"],
  baseAssignments,
  sourceRows,
  ordinaryPerChannel: 2,
  sourceCampaignId: "recovery-campaign",
});

assert.equal(result.ordinary.length, 4);
assert.equal(result.polyglotAssignments.length, 2);
assert.equal(result.pendingPolyglot.length, 0);
assert.deepEqual(result.ordinary.map((row) => row.assignmentKey).sort(), [
  "ordinary|set|A|a1",
  "ordinary|set|A|a3",
  "ordinary|set|B|b1",
  "ordinary|set|B|b2",
]);
assert.equal(result.ordinary.find((row) => row.assignmentKey === "ordinary|set|A|a3").slotKey, "a|02");
assert.equal(result.ordinary.find((row) => row.assignmentKey === "ordinary|set|B|b1").slotKey, "b|01");
assert.deepEqual(result.polyglotAssignments.map((row) => row.assignmentKey).sort(), [
  "polyglot|set|A|old-bundle-a",
  "polyglot|set|B|old-bundle-b",
]);
assert(result.polyglotAssignments.every((row) => row.integratedRecovery?.sourceCampaignId === "recovery-campaign"));

const partialSource = sourceRowsFromCampaign({
  registry: { campaigns: [{
    campaignId: "partial",
    setId: "set",
    status: "reconciliation_required",
    assignmentKeys: ["missing", "accepted"],
    finalizeSummary: { missingCount: 1, duplicateAssignmentCount: 0, duplicateVideoIdCount: 0, unexpectedPublicationCount: 0 },
    assignments: [
      { assignmentKey: "missing", status: "claimed" },
      { assignmentKey: "accepted", status: "upload_accepted", youtubeVideoId: "video-id" },
    ],
  }] },
  setId: "set",
  sourceCampaignId: "partial",
  expectedSourceAssignments: 1,
});
assert.equal(partialSource.sourceMode, "partial_reconciliation_required");
assert.deepEqual(partialSource.rows.map((row) => row.assignmentKey), ["missing"]);

const multiSource = sourceRowsFromActiveClaims({
  registry: { campaigns: [
    {
      campaignId: "first",
      setId: "set",
      status: "reconciliation_required",
      finalizedAt: "2026-08-01T00:00:00.000Z",
      finalizeSummary: { missingCount: 1 },
      assignmentKeys: ["ordinary|set|A|a1", "accepted"],
      assignments: [
        { assignmentKey: "ordinary|set|A|a1", setId: "set", videoType: "ordinary", status: "claimed" },
        { assignmentKey: "accepted", setId: "set", videoType: "ordinary", status: "upload_accepted", youtubeVideoId: "video" },
      ],
    },
    {
      campaignId: "second",
      setId: "set",
      status: "claimed",
      assignmentKeys: ["polyglot|set|B|bundle|hash|short_unverified"],
      assignments: [{
        assignmentKey: "polyglot|set|B|bundle|hash|short_unverified",
        setId: "set",
        supportLang: "B",
        videoType: "polyglot",
        bundleKey: "bundle",
        contentScope: "short_unverified",
        status: "claimed",
      }],
    },
  ] },
  setId: "set",
  expectedSourceAssignments: 2,
});
assert.equal(multiSource.sourceMode, "multi_campaign_completion");
assert.deepEqual(multiSource.rows.map((row) => row.integratedRecoverySourceCampaignId).sort(), ["first", "second"]);

assert.throws(() => sourceRowsFromActiveClaims({
  registry: { campaigns: [{
    campaignId: "still-running",
    setId: "set",
    status: "running",
    assignmentKeys: ["ordinary|set|A|a1"],
    assignments: [{ assignmentKey: "ordinary|set|A|a1", setId: "set", videoType: "ordinary", status: "claimed" }],
  }] },
  setId: "set",
  expectedSourceAssignments: 1,
}), /in-flight campaign/u);

console.log("integrated recovery wave composition tests passed");
