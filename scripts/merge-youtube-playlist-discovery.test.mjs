#!/usr/bin/env node
import assert from "node:assert/strict";

import { loadCanonicalSupportRouting } from "./lib/youtube-support-routing.mjs";
import { mergePlaylistDiscoveryReports } from "./merge-youtube-playlist-discovery.mjs";

const routing = loadCanonicalSupportRouting();
const reports = routing.projects.map((route) => {
  const supports = [...routing.supportToRoute.entries()]
    .filter(([, supportRoute]) => supportRoute.key === route.key)
    .map(([support]) => support)
    .sort();
  return {
    generatedAt: "2026-07-14T00:00:00.000Z",
    routeKey: route.key,
    complete: true,
    summary: { youtubeReadCalls: supports.length * 2 },
    channels: supports.map((supportLang) => ({
      supportLang,
      channelKey: routing.supportToChannel.get(supportLang).key,
      youtubeChannelId: routing.supportToChannel.get(supportLang).channelId,
      complete: true,
      playlists: [],
    })),
  };
});

const merged = mergePlaylistDiscoveryReports({
  reports,
  routing,
  expectedRoutes: 4,
  generatedAt: "2026-07-14T00:01:00.000Z",
});
assert.equal(merged.complete, true);
assert.equal(merged.summary.routeCount, 4);
assert.equal(merged.summary.supportCount, 51);
assert.equal(merged.summary.blockerCount, 0);
assert.equal(merged.summary.youtubeWrites, 0);

const subsetSupports = ["FR", "KO", "ZH", "BN", "IT"];
const subsetReports = reports.map((report) => ({
  ...report,
  channels: report.channels.filter((channel) => subsetSupports.includes(channel.supportLang)),
}));
const subset = mergePlaylistDiscoveryReports({
  reports: subsetReports,
  routing,
  expectedRoutes: 4,
  expectedSupports: subsetSupports,
  generatedAt: "2026-07-14T00:01:00.000Z",
});
assert.equal(subset.complete, true);
assert.equal(subset.summary.expectedSupportCount, 5);
assert.equal(subset.summary.supportCount, 5);
assert.equal(subset.summary.blockerCount, 0);

const incomplete = mergePlaylistDiscoveryReports({ reports: reports.slice(0, 3), routing, expectedRoutes: 4 });
assert.equal(incomplete.complete, false);
assert(incomplete.blockers.some((row) => row.includes("route report count")));
assert(incomplete.blockers.some((row) => row.includes("missing support discoveries")));

console.log("youtube playlist discovery merge tests passed");
