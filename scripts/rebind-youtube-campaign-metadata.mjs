import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadReusableMetadataCheckpoint } from "./generate-youtube-campaign-metadata.mjs";
import { verifyCampaignManifest } from "./lib/youtube-publication-campaign.mjs";
import { readYoutubeDurableJson } from "./lib/youtube-durable-json.mjs";

const identityFields = [
  "assignmentKey", "setId", "videoType", "supportLang", "targetLang",
  "bundleKey", "targetLangsHash", "contentScope",
  "channelKey", "youtubeChannelId", "routeKey",
];
const identity = row => ({
  ...Object.fromEntries(identityFields.map(key => [key, row[key] ?? ""])),
  targetLangs: row.targetLangs ?? [],
  cardLimit: row.cardLimit ?? 0,
  maxDurationSeconds: row.maxDurationSeconds ?? 0,
});
const identities = manifest => manifest.assignments.map(identity)
  .sort((left, right) => left.assignmentKey.localeCompare(right.assignmentKey));
const sha256 = body => crypto.createHash("sha256").update(body).digest("hex");

export function buildReboundMetadata({ source, target, ancestors = [], routeKey, outputRoot }) {
  verifyCampaignManifest(source);
  verifyCampaignManifest(target);
  assert.notEqual(source.campaignId, target.campaignId);
  let descendant = target;
  const visited = new Set([target.campaignId]);
  for (const ancestor of [...ancestors, source]) {
    verifyCampaignManifest(ancestor);
    assert.ok(!visited.has(ancestor.campaignId), "Recovery source lineage contains a cycle");
    visited.add(ancestor.campaignId);
    assert.equal(descendant.inputs.partialRecoveryOfCampaignId, ancestor.campaignId, "Only the exact partial-recovery source lineage may supply metadata");
    assert.equal(ancestor.setId, source.setId);
    assert.equal(ancestor.evidence.sourceFingerprints.offlineDeck.sha256, source.evidence.sourceFingerprints.offlineDeck.sha256, "Source deck changed within recovery lineage");
    assert.deepEqual(identities(ancestor), identities(source), "An intermediate recovery changed metadata identity or scope");
    descendant = ancestor;
  }
  assert.equal(target.setId, source.setId);
  assert.equal(target.evidence.sourceFingerprints.offlineDeck.sha256, source.evidence.sourceFingerprints.offlineDeck.sha256, "Source deck changed");
  assert.deepEqual(target.assignments.map(r => r.assignmentKey).sort(), source.assignments.map(r => r.assignmentKey).sort(), "Reuse requires the entire original assignment set");
  const original = new Map(source.assignments.map(row => [row.assignmentKey, row]));
  assert.equal(original.size, source.assignments.length);
  const selected = target.assignments.filter(row => row.routeKey === routeKey);
  assert.ok(selected.length > 0, "Recovery route has no assignments");
  for (const row of target.assignments) {
    assert.deepEqual(identity(row), identity(original.get(row.assignmentKey)), "Metadata assignment identity changed");
    assert.ok(!row.youtubeVideoId, "An accepted assignment cannot be rebound");
  }
  const checkpointPath = path.join(outputRoot, "index.json");
  const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, "utf8"));
  assert.equal(checkpoint.complete, true, "Recovery requires a completed checkpoint");
  const entries = loadReusableMetadataCheckpoint({ outputRoot, campaignId: source.campaignId,
    manifestHash: source.manifestHash, routeKey, batchSize: checkpoint.batchSize,
    taskPlans: selected.map(row => ({ assignment: original.get(row.assignmentKey) })),
  });
  assert.equal(entries.size, selected.length, "Recovery metadata must cover the entire route");
  const provenance = { campaignId: source.campaignId, manifestHash: source.manifestHash };
  const writes = [];
  const rebound = selected.map(row => {
    const entry = entries.get(row.assignmentKey);
    const file = path.resolve(outputRoot, entry.artifactPath);
    const metadata = JSON.parse(fs.readFileSync(file, "utf8"));
    metadata.campaignId = target.campaignId;
    metadata.campaignManifestHash = target.manifestHash;
    metadata.publishAt = row.publishAt;
    metadata.scheduledPublishAt = row.publishAt;
    metadata.privacyStatus = "private";
    metadata.metadataRecoverySource = provenance;
    const body = JSON.stringify(metadata, null, 2) + "\n";
    writes.push([file, body]);
    return { ...entry, sha256: sha256(body) };
  });
  const index = { ...checkpoint, campaignId: target.campaignId, manifestHash: target.manifestHash,
    metadataRecoverySource: provenance, updatedAt: new Date().toISOString(), entries: rebound };
  writes.push([checkpointPath, JSON.stringify(index, null, 2) + "\n"]);
  return writes;
}

function main() {
  const [campaignId, sourceId, routeKey, outputRoot] = process.argv.slice(2);
  for (const id of [campaignId, sourceId]) assert.match(id || "", /^yt-[a-z0-9_-]+$/);
  assert.match(routeKey || "", /^youtube-[1-4]$/);
  assert.ok(outputRoot);
  const registry = readYoutubeDurableJson("config/youtube-publication-campaigns.json");
  const campaign = registry.campaigns.find(row => row.campaignId === campaignId);
  assert.equal(campaign?.status, "claimed");
  const readPlan = id => JSON.parse(fs.readFileSync(`config/youtube-publication-campaign-plans/${id}.json`, "utf8"));
  const target = readPlan(campaignId);
  assert.equal(target.manifestHash, campaign.manifestHash);
  assert.equal(target.campaignId, campaignId);
  const source = readPlan(sourceId);
  assert.equal(source.campaignId, sourceId);
  const ancestors = [];
  const visited = new Set([campaignId]);
  let parentId = target.inputs.partialRecoveryOfCampaignId;
  while (parentId !== sourceId) {
    assert.match(parentId || "", /^yt-[a-z0-9_-]+$/);
    assert.ok(!visited.has(parentId), "Recovery source lineage contains a cycle");
    visited.add(parentId);
    const parent = readPlan(parentId);
    assert.equal(parent.campaignId, parentId);
    ancestors.push(parent);
    parentId = parent.inputs.partialRecoveryOfCampaignId;
  }
  const writes = buildReboundMetadata({ source, target, ancestors, routeKey, outputRoot });
  // Validate every source file before replacing any file. Commit the index last.
  // An interrupted transfer therefore fails checksum validation before generation.
  for (const [file, body] of writes) {
    const temporary = `${file}.tmp-${process.pid}`;
    fs.writeFileSync(temporary, body);
    fs.renameSync(temporary, file);
  }
  console.log(`Rebound ${writes.length - 1} verified metadata documents; provider calls: 0`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
