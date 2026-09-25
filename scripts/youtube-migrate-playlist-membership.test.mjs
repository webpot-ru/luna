import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { MANIFEST_PATH, validateManifest } from "./youtube-migrate-playlist-membership.mjs";
import { mergeReceipts } from "./merge-youtube-playlist-membership-migration.mjs";

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
const ordinary = JSON.parse(fs.readFileSync("config/youtube-published-videos.json", "utf8"));
const polyglot = JSON.parse(fs.readFileSync("config/youtube-polyglot-published-videos.json", "utf8"));
const clone = (value) => structuredClone(value);

test("exact manifest has 20 unique validated existing videos", () => {
  assert.deepEqual(validateManifest(manifest), { rows: 20, ordinary: 19, polyglot: 1 });
  const bad = clone(manifest);
  bad.rows[1].youtubeVideoId = bad.rows[0].youtubeVideoId;
  assert.throws(() => validateManifest(bad), /Duplicate migration video/);
  const redirected = clone(manifest);
  redirected.rows[0].destinationPlaylistId = "PL_UNAPPROVED";
  assert.throws(() => validateManifest(redirected), /Canonical playlist identity mismatch/);
});

test("migration code has no video upload or playlist deletion path", () => {
  const workflow = fs.readFileSync(".github/workflows/youtube-playlist-membership-migration.yml", "utf8");
  const worker = fs.readFileSync("scripts/youtube-migrate-playlist-membership.mjs", "utf8");
  assert.match(worker, /"POST", "playlistItems"/);
  assert.doesNotMatch(worker, /"POST", "videos"|"DELETE", "playlists"|"DELETE", "playlistItems"/);
  assert.doesNotMatch(workflow, /youtube-video-publish|youtube-publication-campaign\.yml/);
});

test("verified receipt changes only canonical membership and preserves old playlist provenance", () => {
  const source = manifest.rows.find((row) => row.youtubeVideoId === "r6qSzH_CXy4");
  const o = clone(ordinary);
  const p = clone(polyglot);
  const before = o.publications.find((row) => row.youtubeVideoId === source.youtubeVideoId);
  const oldId = before.youtubePlaylistId;
  const receipt = { migrationId: manifest.id, route: source.route, youtubeVideoId: source.youtubeVideoId, destinationPlaylistId: source.destinationPlaylistId, destinationPlaylistKey: source.destinationPlaylistKey, playlistItemId: "verified-new-item", verifiedAt: "2026-09-25T00:00:00.000Z", inserted: true };
  assert.deepEqual(mergeReceipts({ manifest, receipts: [receipt], ordinary: o, polyglot: p }), { received: 1, updated: 1 });
  const after = o.publications.find((row) => row.youtubeVideoId === source.youtubeVideoId);
  assert.equal(after.youtubePlaylistId, source.destinationPlaylistId);
  assert.equal(after.playlistItemId, "verified-new-item");
  assert.ok(after.playlistMembershipMigration.previousPlaylistIds.includes(oldId));
  assert.equal(ordinary.publications.find((row) => row.youtubeVideoId === source.youtubeVideoId).youtubePlaylistId, oldId);
  assert.deepEqual(mergeReceipts({ manifest, receipts: [receipt], ordinary: o, polyglot: p }), { received: 1, updated: 0 });
});

test("receipt from an unapproved destination cannot mutate registry", () => {
  const row = manifest.rows[0];
  const o = clone(ordinary);
  const before = JSON.stringify(o);
  assert.throws(() => mergeReceipts({ manifest, receipts: [{ migrationId: manifest.id, route: row.route, youtubeVideoId: row.youtubeVideoId, destinationPlaylistId: "wrong", destinationPlaylistKey: row.destinationPlaylistKey, playlistItemId: "item", verifiedAt: "2026-09-25T00:00:00Z" }], ordinary: o, polyglot: clone(polyglot) }), /Invalid migration receipt/);
  assert.equal(JSON.stringify(o), before);
});

test("polyglot receipt updates only the Polyglot ledger", () => {
  const item = manifest.rows.find((row) => row.youtubeVideoId === "M7kl3T-lzZk");
  const o = clone(ordinary);
  const p = clone(polyglot);
  const ordinaryBefore = JSON.stringify(o);
  const receipt = { migrationId: manifest.id, route: item.route, youtubeVideoId: item.youtubeVideoId, destinationPlaylistId: item.destinationPlaylistId, destinationPlaylistKey: item.destinationPlaylistKey, playlistItemId: "verified-polyglot-item", verifiedAt: "2026-09-25T00:00:00.000Z", inserted: true };
  assert.deepEqual(mergeReceipts({ manifest, receipts: [receipt], ordinary: o, polyglot: p }), { received: 1, updated: 1 });
  assert.equal(JSON.stringify(o), ordinaryBefore);
  assert.equal(p.publications.find((row) => row.youtubeVideoId === item.youtubeVideoId).playlistItemId, "verified-polyglot-item");
});
