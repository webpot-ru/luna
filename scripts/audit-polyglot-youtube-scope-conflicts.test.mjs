#!/usr/bin/env node
import assert from "node:assert/strict";

import { auditPolyglotYoutubeScopeConflicts } from "./audit-polyglot-youtube-scope-conflicts.mjs";

const base = {
  videoType: "polyglot",
  setId: "deck-2",
  supportLang: "EN",
  bundleKey: "global_europe_core",
  liveReadbackPresent: true,
  publicationStatus: "scheduled_uploaded",
  durableRegistryPresent: true,
};

const mixed = auditPolyglotYoutubeScopeConflicts({
  setId: "deck-2",
  report: {
    generatedAt: "2026-07-15T12:10:47Z",
    summary: { complete: true, paginationComplete: true, videoStatusReadbackComplete: true },
    publications: [
      { ...base, youtubeVideoId: "full-video", contentScope: "full" },
      { ...base, youtubeVideoId: "short-video", contentScope: "short_unverified" },
    ],
  },
});
assert.equal(mixed.summary.productSlots, 1);
assert.equal(mixed.summary.mixedShortFullSlots, 1);
assert.equal(mixed.summary.clean, false);

const fullOnly = auditPolyglotYoutubeScopeConflicts({
  setId: "deck-2",
  report: {
    summary: { complete: true, paginationComplete: true, videoStatusReadbackComplete: true },
    publications: [{ ...base, youtubeVideoId: "full-video", contentScope: "full" }],
  },
});
assert.equal(fullOnly.summary.fullOnlySlots, 1);
assert.equal(fullOnly.summary.shortOnlySlots, 0);
assert.equal(fullOnly.summary.mixedShortFullSlots, 0);
assert.equal(fullOnly.summary.clean, true);

console.log("polyglot live short/full scope audit tests passed");
