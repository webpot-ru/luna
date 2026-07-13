#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  courseSetBySlug,
  inferPublicationFromDescription,
  markPotentialCurrentSetUnmatched,
  publicationFromRegistryItem,
  validateAuditExclusions,
} from "./audit-youtube-live-publications.mjs";

const exclusions = validateAuditExclusions({
  entries: [{ youtubeVideoId: "reviewed-demo", status: "reviewed_non_product", reason: "manual API demo" }],
});
assert.equal(exclusions.get("reviewed-demo")?.reason, "manual API demo");
assert.throws(
  () => validateAuditExclusions({ entries: [{ youtubeVideoId: "missing-reason", status: "reviewed_non_product" }] }),
  /requires a review reason/,
);
assert.throws(
  () => validateAuditExclusions({ entries: [{ youtubeVideoId: "wrong-status", status: "ignored", reason: "not allowed" }] }),
  /status=reviewed_non_product/,
);

const courseLookup = courseSetBySlug({
  publishedCourseSlugBySetId: {
    deck1: "kitchenware",
    deck2: "cooking-actions",
  },
});
const inferredOtherDeck = inferPublicationFromDescription({
  supportLang: "ES-419",
  channelSupportLangs: ["ES", "ES-419"],
  courseSetLookup: courseLookup,
  item: {
    snippet: {
      title: "Cooking Actions",
      description: "https://flashcardsluna.com/es/courses/cooking-actions?langs=FR",
      resourceId: { videoId: "other-deck-video" },
    },
    contentDetails: { videoId: "other-deck-video" },
  },
});
assert.equal(inferredOtherDeck.setId, "deck2");
assert.equal(inferredOtherDeck.targetLang, "FR");

const registryFallback = publicationFromRegistryItem({
  setId: "deck1",
  supportLang: "EN",
  targetLang: "NB",
  youtubeVideoId: "registry-video",
}, {
  snippet: { title: "Edited description", publishedAt: "2026-07-10T10:00:00Z" },
  contentDetails: { videoId: "registry-video" },
});
assert.equal(registryFallback.setId, "deck1");
assert.equal(registryFallback.targetLang, "NB");
assert.equal(registryFallback.supportLangResolution, "local_registry_video_id");

const recent = markPotentialCurrentSetUnmatched({
  youtubeVideoId: "unknown-live",
  uploadedAt: "2026-07-11T10:00:00Z",
  youtubeStatus: { uploadStatus: "uploaded", privacyStatus: "private" },
}, {
  auditWindowStart: "2026-07-10T00:00:00Z",
  exclusionByVideoId: new Map(),
});
assert.equal(recent.potentialCurrentSet, true);

const deleted = markPotentialCurrentSetUnmatched({
  youtubeVideoId: "deleted",
  uploadedAt: "2026-07-11T10:00:00Z",
  youtubeStatus: { uploadStatus: "not_returned" },
}, {
  auditWindowStart: "2026-07-10T00:00:00Z",
  exclusionByVideoId: new Map(),
});
assert.equal(deleted.potentialCurrentSet, false);

const reviewed = markPotentialCurrentSetUnmatched({
  youtubeVideoId: "reviewed-demo",
  uploadedAt: "2026-07-11T10:00:00Z",
  youtubeStatus: { uploadStatus: "uploaded" },
}, {
  auditWindowStart: "2026-07-10T00:00:00Z",
  exclusionByVideoId: new Map([["reviewed-demo", { reason: "manual demo" }]]),
});
assert.equal(reviewed.potentialCurrentSet, false);
assert.equal(reviewed.reviewedNonProduct, true);

console.log("youtube live publication audit classification tests passed");
