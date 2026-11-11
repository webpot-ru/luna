import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { buildReboundMetadata } from "./rebind-youtube-campaign-metadata.mjs";
import { sha256Json } from "./lib/youtube-publication-campaign.mjs";

fs.mkdirSync("scratch", { recursive: true });
const root = fs.mkdtempSync(path.resolve("scratch/metadata-rebind-test-"));
const hash = body => crypto.createHash("sha256").update(body).digest("hex");
function signed(value) {
  const copy = structuredClone(value);
  delete copy.manifestHash;
  return { ...copy, manifestHash: sha256Json(copy) };
}
const ordinary = { assignmentKey: "ordinary|deck|EN|DE", videoType: "ordinary", setId: "deck", supportLang: "EN", targetLang: "DE", routeKey: "youtube-1", channelKey: "en", publishAt: "2030-01-01T10:00:00Z" };
const polyglot = { assignmentKey: "polyglot|deck|EN|bundle|hash|full", videoType: "polyglot", setId: "deck", supportLang: "EN", bundleKey: "bundle", targetLangs: ["DE", "FR"], contentScope: "full", routeKey: "youtube-1", channelKey: "en", publishAt: "2030-01-02T10:00:00Z" };
const source = signed({ campaignId: "yt-source", setId: "deck", inputs: {}, evidence: { sourceFingerprints: { offlineDeck: { sha256: "deck-sha" } } }, assignments: [ordinary, polyglot] });
const target = signed({ ...source, campaignId: "yt-target", inputs: { partialRecoveryOfCampaignId: source.campaignId }, assignments: source.assignments.map(row => ({ ...row, publishAt: "2030-02-01T10:00:00Z" })) });
const entries = [];
for (const row of source.assignments) {
  const name = row.videoType + ".json";
  const body = JSON.stringify({ campaignId: source.campaignId, campaignManifestHash: source.manifestHash, title: "Approved localized title", description: "Approved localized description", tags: ["vocabulary"], publishAt: row.publishAt });
  fs.writeFileSync(path.join(root, name), body);
  entries.push({ assignmentKey: row.assignmentKey, videoType: row.videoType, supportLang: row.supportLang, targetLang: row.targetLang || "", bundleKey: row.bundleKey || "", artifactPath: name, sha256: hash(body), destination: row.videoType === "ordinary" ? "outputs/video-generator/deck_de_en/youtube_metadata.json" : "outputs/video-generator/deck_polyglot_en_bundle/youtube_metadata.json" });
}
const checkpoint = { campaignId: source.campaignId, manifestHash: source.manifestHash, routeKey: "youtube-1", complete: true, assignmentCount: 2, batchSize: 5, entries };
const writeIndex = value => fs.writeFileSync(path.join(root, "index.json"), JSON.stringify(value));
writeIndex(checkpoint);
const build = changes => buildReboundMetadata({ source, target, routeKey: "youtube-1", outputRoot: root, ...changes });
const writes = build();
assert.equal(writes.length, 3);
for (const [, body] of writes.slice(0, -1)) {
  const value = JSON.parse(body);
  assert.equal(value.title, "Approved localized title");
  assert.equal(value.description, "Approved localized description");
  assert.deepEqual(value.tags, ["vocabulary"]);
  assert.equal(value.campaignId, target.campaignId);
  assert.equal(value.campaignManifestHash, target.manifestHash);
  assert.equal(value.publishAt, target.assignments[0].publishAt);
  assert.equal(value.scheduledPublishAt, target.assignments[0].publishAt);
  assert.equal(value.metadataRecoverySource.manifestHash, source.manifestHash);
}
const next = JSON.parse(writes.at(-1)[1]);
assert.equal(next.campaignId, target.campaignId);
for (let i = 0; i < 2; i++) assert.equal(next.entries[i].sha256, hash(writes[i][1]));
assert.throws(() => build({ target: signed({ ...target, inputs: {} }) }), /exact partial-recovery source/);
assert.throws(() => build({ target: signed({ ...target, assignments: [target.assignments[0]] }) }), /entire original assignment set/);
assert.throws(() => build({ target: signed({ ...target, assignments: target.assignments.map(row => ({ ...row, routeKey: "youtube-2" })) }) }), /route|identity/i);
assert.throws(() => build({ target: signed({ ...target, assignments: target.assignments.map(row => ({ ...row, youtubeVideoId: "accepted" })) }) }), /accepted assignment/);
assert.throws(() => build({ target: signed({ ...target, evidence: { sourceFingerprints: { offlineDeck: { sha256: "changed" } } } }) }), /Source deck changed/);
writeIndex({ ...checkpoint, entries: entries.slice(0, 1) });
assert.throws(() => build(), /entire route/);
writeIndex({ ...checkpoint, entries: entries.map(entry => ({ ...entry, sha256: "bad" })) });
assert.throws(() => build(), /checksum mismatch/);
writeIndex({ ...checkpoint, entries: entries.map(entry => ({ ...entry, artifactPath: "../escape.json" })) });
assert.throws(() => build(), /escapes output root/);
writeIndex({ ...checkpoint, complete: false });
assert.throws(() => build(), /completed checkpoint/);
console.log("Exact recovery metadata rebind tests passed");
