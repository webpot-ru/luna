#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-publication-control-merge-test-"));
const input = path.join(root, "input");
const output = path.join(root, "aggregate.json");
const markdown = path.join(root, "aggregate.md");
fs.mkdirSync(input, { recursive: true });

const ordinaryTail = { videoType: "ordinary", setId: "deck", supportLang: "EN", targetLang: "DE" };
const polyglotTail = {
  videoType: "polyglot",
  setId: "deck",
  supportLang: "RU",
  bundleKey: "slavic_core",
  targetLangs: ["PL", "CS", "SK", "BG"],
  polyglotKey: "polyglot:deck:RU:slavic_core:hash",
};

for (let route = 1; route <= 8; route += 1) {
  const videoId = `video-${route}`;
  const report = {
    setId: "deck",
    supports: [`S${route}`],
    summary: {
      activeVideoCount: 1,
      publicCount: 1,
      scheduledCount: 0,
      privateUnscheduledCount: 0,
    },
    generatedAt: "2026-07-13T00:00:00.000Z",
    evidence: {
      videoStatusReadback: true,
      paginationComplete: true,
    },
    blockers: [],
    advisories: route === 1 ? [{
      type: "polyglot_full_tail_deferred_by_active_short_unverified",
      supportLang: "SV",
      bundleKey: "east_asia_core",
    }] : [],
    fallbackCoveredPolyglotTails: route === 1 ? [{
      videoType: "polyglot",
      setId: "deck",
      supportLang: "SV",
      bundleKey: "east_asia_core",
      contentScope: "full",
      polyglotKey: "polyglot:deck:SV:east_asia_core:short-hash",
      coverageStatus: "covered_by_short_unverified",
      activeVideoIds: ["short-video"],
    }] : [],
    tails: route === 1 ? [ordinaryTail] : (route <= 3 ? [polyglotTail] : []),
    publications: [{
      videoType: "ordinary",
      supportLang: `S${route}`,
      targetLang: "DE",
      youtubeVideoId: videoId,
      youtubeVideoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      privacyStatus: "public",
      thumbnailSet: true,
    }],
    unclassifiedUploads: route <= 2 ? [{
      youtubeVideoId: "manual-demo",
      supportLang: "EN",
      title: "Manual API visual demo",
      potentialCurrentSet: true,
      youtubeStatus: { privacyStatus: "public", uploadStatus: "processed" },
    }] : [],
    deletedTombstones: route <= 2 ? [{ youtubeVideoId: "deleted-video", supportLang: "EN", evidence: "test" }] : [],
    calendarDayGaps: [],
  };
  fs.writeFileSync(path.join(input, `youtube-publication-control-youtube-${route}.json`), `${JSON.stringify(report, null, 2)}\n`);
}

const merged = spawnSync(process.execPath, [
  "scripts/merge-youtube-publication-control-reports.mjs",
  `--input=${input}`,
  `--output=${output}`,
  `--markdown=${markdown}`,
  "--expected-routes=8",
  "--expected-route-keys=youtube-1,youtube-2,youtube-3,youtube-4,youtube-5,youtube-6,youtube-7,youtube-8",
  "--all-routes",
  "--source-run=deck:all:123456789",
], { cwd: process.cwd(), encoding: "utf8" });
assert.equal(merged.status, 0, merged.stderr || merged.stdout);

const aggregate = JSON.parse(fs.readFileSync(output, "utf8"));
assert.equal(aggregate.summary.complete, true);
assert.deepEqual(aggregate.summary.receivedRouteKeys, ["youtube-1", "youtube-2", "youtube-3", "youtube-4", "youtube-5", "youtube-6", "youtube-7", "youtube-8"]);
assert.equal(aggregate.routeScope.mode, "all_routes");
assert.equal(aggregate.summary.healthy, true);
assert.equal(aggregate.summary.advisoryCount, 1);
assert.equal(aggregate.advisories.length, 1);
assert.equal(aggregate.summary.tailCount, 2);
assert.equal(aggregate.summary.ordinaryTailCount, 1);
assert.equal(aggregate.summary.polyglotTailCount, 1);
assert.equal(aggregate.summary.polyglotFallbackCoveredCount, 1);
assert.equal(aggregate.fallbackCoveredPolyglotTails.length, 1);
assert.equal(aggregate.publications.length, 8);
assert.equal(aggregate.unclassifiedUploads.length, 1);
assert.equal(aggregate.summary.unclassifiedUploadCount, 1);
assert.equal(aggregate.summary.youtubeDeletedTombstoneCount, 1);
assert.equal(aggregate.deletedTombstones.length, 1);
assert.equal(aggregate.summary.videoStatusReadbackComplete, true);
assert.equal(aggregate.summary.paginationComplete, true);
assert.equal(aggregate.sourceRuns[0].githubRunUrl, "https://github.com/webpot-ru/luna/actions/runs/123456789");
const markdownText = fs.readFileSync(markdown, "utf8");
assert.match(markdownText, /Polyglot slavic_core/);
assert.match(markdownText, /https:\/\/www\.youtube\.com\/watch\?v=video-8/);
assert.match(markdownText, /Unclassified uploads: 1/);
assert.match(markdownText, /polyglot_full_tail_deferred_by_active_short_unverified/);
assert.match(markdownText, /Polyglot fallback covered/);

const scopedOutput = path.join(root, "scoped.json");
const scopedInput = path.join(root, "scoped-input");
fs.mkdirSync(scopedInput, { recursive: true });
for (const route of [2, 3, 4]) fs.copyFileSync(
  path.join(input, `youtube-publication-control-youtube-${route}.json`),
  path.join(scopedInput, `youtube-publication-control-youtube-${route}.json`),
);
const scoped = spawnSync(process.execPath, [
  "scripts/merge-youtube-publication-control-reports.mjs",
  `--input=${scopedInput}`,
  `--output=${scopedOutput}`,
  `--markdown=${path.join(root, "scoped.md")}`,
  "--expected-routes=3",
  "--expected-route-keys=youtube-2,youtube-3,youtube-4",
], { cwd: process.cwd(), encoding: "utf8" });
assert.equal(scoped.status, 0, scoped.stderr || scoped.stdout);
const scopedAggregate = JSON.parse(fs.readFileSync(scopedOutput, "utf8"));
assert.equal(scopedAggregate.summary.complete, true);
assert.equal(scopedAggregate.routeScope.mode, "selected_routes");
assert.deepEqual(scopedAggregate.summary.receivedRouteKeys, ["youtube-2", "youtube-3", "youtube-4"]);

console.log("youtube publication control merge tests passed");
