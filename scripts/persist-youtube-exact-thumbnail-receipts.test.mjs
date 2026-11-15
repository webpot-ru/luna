import assert from "node:assert/strict";
import { reconcileExactThumbnailReceipts as merge } from "./persist-youtube-exact-thumbnail-receipts.mjs";
const cover = { youtubeVideoId: "abcdefghijk", setId: "deck", supportLang: "AZ", targetLang: "NO", expectedYoutubeChannelId: "owner", relativePath: "data/image.jpg", sizeBytes: 5, sha256: "approved" };
const receipt = { videoId: cover.youtubeVideoId, action: "youtube_set_video_thumbnail", status: "custom_thumbnail_set", setId: "deck", supportLang: "AZ", authorizedChannel: { id: "owner" }, videoBefore: { id: cover.youtubeVideoId, channelId: "owner" }, videoAfter: { id: cover.youtubeVideoId, channelId: "owner" }, thumbnailPath: "/runner/data/image.jpg", thumbnailSizeBytes: 5, thumbnailResultSummary: { itemCount: 1 }, timestamp: "2026-11-15T14:00:00Z" };
const row = { youtubeVideoId: cover.youtubeVideoId, setId: "deck", supportLang: "AZ", targetLang: "NO", publishAt: "keep", thumbnailUploadMode: "first_frame_auto", thumbnailFallbackReason: "old" };
const args = { registries: [{ publications: [row] }], manifest: { covers: [cover] }, receipts: [receipt], runId: 123 };
for (const state of [undefined, false, true]) {
  const input = structuredClone(args); input.registries[0].publications[0].thumbnailSet = state;
  const out = merge(input); const p = out.registries[0].publications[0];
  assert.equal(p.thumbnailSet, true); assert.equal(p.thumbnailUploadMode, "custom"); assert.equal(p.thumbnailSource, "custom"); assert.equal(p.publishAt, "keep"); assert.equal(p.thumbnailFallbackReason, undefined);
  assert.deepEqual(merge({ ...input, registries: out.registries }).registries, out.registries);
}
const unrelated = structuredClone(args); unrelated.registries[0].publications.push({ youtubeVideoId: "other", thumbnailSet: false });
assert.deepEqual(merge(unrelated).registries[0].publications[1], unrelated.registries[0].publications[1]);
assert.throws(() => merge({ ...args, receipts: [{ ...receipt, authorizedChannel: { id: "wrong" } }] }));
assert.throws(() => merge({ ...args, receipts: [{ ...receipt, thumbnailPath: "/wrong.jpg" }] }));
assert.throws(() => merge({ ...args, receipts: [{ ...receipt, videoId: "unapproved" }] }));
assert.throws(() => merge({ ...args, receipts: [receipt, receipt] }));
assert.throws(() => merge({ ...args, receipts: [{ ...receipt, thumbnailResultSummary: { itemCount: 0 } }] }));
assert.equal(merge({ ...args, receipts: [{ ...receipt, status: "failed" }] }).accepted, 0);
const newer = structuredClone(args); newer.registries[0].publications[0].thumbnailUploadedAt = "2026-11-16T00:00:00Z";
assert.throws(() => merge(newer));
const identity = structuredClone(args); identity.registries[0].publications[0].targetLang = "EN";
assert.throws(() => merge(identity));
const duplicate = structuredClone(args); duplicate.registries[0].publications.push(structuredClone(row));
assert.throws(() => merge(duplicate));
assert.equal(args.registries[0].publications[0].thumbnailSet, undefined, "Input was mutated");
console.log("Exact thumbnail receipt reconciliation:14 checks passed; no API writes");
