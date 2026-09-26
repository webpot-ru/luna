import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { MANIFEST_PATH, validateManifest, validateLivePair } from "./youtube-unlist-redundant-playlists.mjs";
import { mergeReceipts } from "./merge-youtube-playlist-unlist-receipts.mjs";

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
const clone = (value) => structuredClone(value);
const sample = manifest.rows.find((row) => row.videoIds.length > 0);
const pair = () => ({
  extra: { id: sample.extraPlaylistId, snippet: { channelId: sample.youtubeChannelId, title: sample.title }, status: { privacyStatus: "public" }, contentDetails: { itemCount: sample.videoIds.length }, videoIds: [...sample.videoIds] },
  canonical: { id: sample.canonicalPlaylistId, snippet: { channelId: sample.youtubeChannelId, title: sample.title }, status: { privacyStatus: "public" }, contentDetails: { itemCount: sample.videoIds.length + 1 }, videoIds: [...sample.videoIds, "another-canonical-video"] },
});

test("manifest is exact 61 across active four routes", () => {
  assert.deepEqual(validateManifest(manifest), { rows: 61, counts: { "youtube-1": 26, "youtube-2": 12, "youtube-3": 18, "youtube-4": 5 }, empty: 28 });
  const drift = clone(manifest);
  drift.rows[0].canonicalPlaylistId = "WRONG";
  assert.throws(() => validateManifest(drift), /Canonical\/extra registry identity mismatch/);
});

test("live pair accepts only content-redundant extra on same owned public channel", () => {
  const current = pair();
  assert.deepEqual(validateLivePair(sample, current.extra, current.canonical), { alreadyUnlisted: false, videoCount: sample.videoIds.length });
  current.extra.status.privacyStatus = "unlisted";
  assert.equal(validateLivePair(sample, current.extra, current.canonical).alreadyUnlisted, true);
  current.canonical.videoIds = [];
  assert.throws(() => validateLivePair(sample, current.extra, current.canonical), /unique_video_in_extra/);
  current.canonical.videoIds = [...sample.videoIds];
  current.canonical.contentDetails.itemCount = sample.videoIds.length;
  current.extra.snippet.channelId = "WRONG";
  assert.throws(() => validateLivePair(sample, current.extra, current.canonical), /playlist_owner_mismatch/);
  current.extra.snippet.channelId = sample.youtubeChannelId;
  current.extra.contentDetails.itemCount += 1;
  assert.throws(() => validateLivePair(sample, current.extra, current.canonical), /playlist_item_count_incomplete/);
});

test("verified receipts persist only exact unlisted rows, idempotently", () => {
  const receipt = { manifestId: manifest.id, route: sample.route, channelKey: sample.channelKey,
    extraPlaylistId: sample.extraPlaylistId, canonicalPlaylistId: sample.canonicalPlaylistId,
    previousPrivacyStatus: "public", privacyStatus: "unlisted", videoIds: sample.videoIds,
    verifiedAt: "2026-09-26T00:00:00Z", githubRunId: "test" };
  const ledger = { schemaVersion: 1, entries: [] };
  assert.deepEqual(mergeReceipts(manifest, [receipt], ledger), { received: 1, updated: 1, durableCount: 1 });
  assert.deepEqual(mergeReceipts(manifest, [receipt], ledger), { received: 1, updated: 0, durableCount: 1 });
  assert.throws(() => mergeReceipts(manifest, [{ ...receipt, canonicalPlaylistId: "WRONG" }], { schemaVersion: 1, entries: [] }), /Invalid unlist receipt/);
});

test("workflow and worker have no video upload or delete path", () => {
  const worker = fs.readFileSync("scripts/youtube-unlist-redundant-playlists.mjs", "utf8");
  const workflow = fs.readFileSync(".github/workflows/youtube-redundant-playlists-unlist.yml", "utf8");
  assert.match(worker, /"PUT", "playlists"/);
  assert.doesNotMatch(worker, /"DELETE"|"POST", "videos"|"POST", "playlistItems"/);
  assert.doesNotMatch(workflow, /youtube-video-publish|youtube-publication-campaign\.yml/);
});
