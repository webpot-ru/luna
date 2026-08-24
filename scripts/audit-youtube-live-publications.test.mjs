#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  courseSetBySlug,
  inferPublicationFromDescription,
  isRetryableYoutubeReadStatus,
  isYoutubeDeletedTombstone,
  markPotentialCurrentSetUnmatched,
  publicationFromRegistryItem,
  validateAuditExclusions,
  youtubeJson,
} from "./audit-youtube-live-publications.mjs";

function jsonResponse(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

assert.equal(isRetryableYoutubeReadStatus(429), true);
assert.equal(isRetryableYoutubeReadStatus(503), true);
assert.equal(isRetryableYoutubeReadStatus(401), false);

{
  const waits = [];
  let calls = 0;
  const result = await youtubeJson({
    accessToken: "test-token",
    pathName: "channels",
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) throw new TypeError("fetch failed");
      return jsonResponse({ items: [{ id: "channel" }] });
    },
    sleepImpl: async (delayMs) => waits.push(delayMs),
    warnImpl: () => {},
    retryBaseMs: 7,
  });
  assert.equal(calls, 2);
  assert.deepEqual(waits, [7]);
  assert.equal(result.items[0].id, "channel");
}

{
  const waits = [];
  let calls = 0;
  const result = await youtubeJson({
    accessToken: "test-token",
    pathName: "playlistItems",
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return jsonResponse({ error: "temporary" }, { status: 503 });
      return jsonResponse({ items: [] });
    },
    sleepImpl: async (delayMs) => waits.push(delayMs),
    warnImpl: () => {},
    retryBaseMs: 11,
  });
  assert.equal(calls, 2);
  assert.deepEqual(waits, [11]);
  assert.deepEqual(result, { items: [] });
}

{
  let calls = 0;
  await assert.rejects(
    youtubeJson({
      accessToken: "test-token",
      pathName: "channels",
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse({ error: "unauthorized" }, { status: 401 });
      },
      sleepImpl: async () => assert.fail("401 must not retry"),
      warnImpl: () => {},
      retryBaseMs: 0,
    }),
    /failed \(401\)/,
  );
  assert.equal(calls, 1);
}

{
  let error;
  try {
    await youtubeJson({
      accessToken: "test-token",
      pathName: "playlistItems",
      fetchImpl: async () => jsonResponse({
        error: { errors: [{ reason: "playlistNotFound" }] },
      }, { status: 404 }),
      sleepImpl: async () => assert.fail("playlistNotFound must not retry"),
      warnImpl: () => {},
      retryBaseMs: 0,
    });
  } catch (caught) {
    error = caught;
  }
  assert.equal(error?.status, 404);
  assert.equal(error?.youtubeReason, "playlistNotFound");
  assert.equal(error?.youtubePath, "/youtube/v3/playlistItems");
}

{
  const waits = [];
  let calls = 0;
  await assert.rejects(
    youtubeJson({
      accessToken: "test-token",
      pathName: "videos",
      fetchImpl: async () => {
        calls += 1;
        throw new TypeError("fetch failed");
      },
      sleepImpl: async (delayMs) => waits.push(delayMs),
      warnImpl: () => {},
      maxAttempts: 3,
      retryBaseMs: 5,
    }),
    /fetch failed/,
  );
  assert.equal(calls, 3);
  assert.deepEqual(waits, [5, 10]);
}

assert.equal(isYoutubeDeletedTombstone({ title: "Deleted video", youtubeStatus: { uploadStatus: "not_returned" } }), true);
assert.equal(isYoutubeDeletedTombstone({ title: "Deleted video", youtubeStatus: { uploadStatus: "uploaded" } }), false);

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
