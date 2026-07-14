#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  CAMPAIGN_MAX_OUTPUT_TOKENS,
  DEFAULT_VECTORENGINE_CAMPAIGN_SUB_BATCH_SIZE,
  buildCampaignMetadataPrompt,
  generateVectorEngineCampaignMetadataSubBatches,
  loadReusableMetadataCheckpoint,
  validateCampaignMetadataResponse,
} from "./generate-youtube-campaign-metadata.mjs";

const tasks = [
  { requestId: "ordinary|deck|EN|DE", videoType: "ordinary", supportLang: "EN", targetLang: "DE" },
  { requestId: "polyglot|deck|EN|bundle|hash|full", videoType: "polyglot", supportLang: "EN", targetLangs: ["DE", "FR"] },
];
const prompt = buildCampaignMetadataPrompt(tasks);
assert.match(prompt, /2 independent FlashcardsLuna/);
assert.match(prompt, /ordinary\|deck\|EN\|DE/);
assert.match(prompt, /no more than 900 Unicode characters/);
assert.equal(CAMPAIGN_MAX_OUTPUT_TOKENS, 60000);
const response = {
  items: tasks.map((task) => ({
    requestId: task.requestId,
    title: "Title",
    description: "Description",
    tags: ["tag"],
    hashtags: ["#tag"],
  })),
};
assert.equal(validateCampaignMetadataResponse(response, tasks).size, 2);
assert.throws(() => validateCampaignMetadataResponse({ items: [response.items[0]] }, tasks), /response mismatch/);
assert.equal(DEFAULT_VECTORENGINE_CAMPAIGN_SUB_BATCH_SIZE, 2);
const campaignWorkflow = fs.readFileSync(".github/workflows/youtube-publication-campaign.yml", "utf8");
assert.match(
  campaignWorkflow,
  /  metadata:\n[\s\S]*?strategy:\n\s+fail-fast: false\n\s+max-parallel: 1\n\s+matrix:/u,
  "campaign metadata routes must be serialized to protect the shared Gemini keys",
);

const vectorTasks = Array.from({ length: 5 }, (_, index) => ({
  requestId: `ordinary|deck|EN|T${index + 1}`,
  videoType: "ordinary",
  supportLang: "EN",
  targetLang: `T${index + 1}`,
}));
const vectorCalls = [];
const vectorResult = await generateVectorEngineCampaignMetadataSubBatches(vectorTasks, {
  model: "gemini-test",
  callProvider: async (request) => {
    const count = request.schema.properties.items.minItems;
    const offset = vectorCalls.reduce((sum, value) => sum + value, 0);
    vectorCalls.push(count);
    return {
      items: vectorTasks.slice(offset, offset + count).map((task) => ({
        requestId: task.requestId,
        title: "Title",
        description: "Description",
        tags: ["tag"],
        hashtags: ["#tag"],
      })),
    };
  },
});
assert.deepEqual(vectorCalls, [2, 2, 1]);
assert.equal(vectorResult.providerCallCount, 3);
assert.deepEqual(vectorResult.value.items.map((item) => item.requestId), vectorTasks.map((task) => task.requestId));
assert.equal(vectorResult.batchSizeByRequestId.get(vectorTasks[0].requestId), 2);
assert.equal(vectorResult.batchSizeByRequestId.get(vectorTasks[4].requestId), 1);
await assert.rejects(() => generateVectorEngineCampaignMetadataSubBatches(vectorTasks.slice(0, 2), {
  callProvider: async () => ({ items: [response.items[0]] }),
}), /Unexpected campaign metadata requestId|response mismatch/);
await assert.rejects(() => generateVectorEngineCampaignMetadataSubBatches(vectorTasks, {
  subBatchSize: 3,
  callProvider: async () => ({ items: [] }),
}), /sub-batch size must be an integer between 1 and 2/);

const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-campaign-metadata-copy-"));
const configDir = path.join(root, "config");
const artifactDir = path.join(root, "artifacts", "route-1");
const assignment = {
  assignmentKey: "ordinary|deck|EN|DE",
  videoType: "ordinary",
  setId: "deck",
  supportLang: "EN",
  targetLang: "DE",
  publishAt: "2026-07-20T08:30:00.000Z",
  playlist: {
    ready: true,
    state: "resolved_existing",
    playlistKey: "EN__DE__ordinary-vocabulary__a1-everyday",
    youtubePlaylistId: "PL-test",
    createAllowed: false,
  },
};
fs.mkdirSync(configDir, { recursive: true });
fs.writeFileSync(path.join(configDir, "youtube-publication-campaigns.json"), `${JSON.stringify({
  schemaVersion: 1,
  campaigns: [{ campaignId: "campaign", manifestHash: "hash", assignments: [assignment] }],
}, null, 2)}\n`);
const metadata = {
  campaignId: "campaign",
  campaignManifestHash: "hash",
  publishAt: assignment.publishAt,
  scheduledPublishAt: assignment.publishAt,
  campaignPlaylist: assignment.playlist,
};
const body = `${JSON.stringify(metadata, null, 2)}\n`;
const metadataRelative = "metadata/ordinary.json";
fs.mkdirSync(path.join(artifactDir, "metadata"), { recursive: true });
fs.writeFileSync(path.join(artifactDir, metadataRelative), body);
fs.writeFileSync(path.join(artifactDir, "index.json"), `${JSON.stringify({
  campaignId: "campaign",
  manifestHash: "hash",
  routeKey: "youtube-1",
  batchSize: 10,
  assignmentCount: 1,
  entries: [{
    assignmentKey: assignment.assignmentKey,
    videoType: "ordinary",
    supportLang: "EN",
    targetLang: "DE",
    bundleKey: "",
    artifactPath: metadataRelative,
    destination: "outputs/video-generator/deck_de_en/youtube_metadata.json",
    sha256: crypto.createHash("sha256").update(body).digest("hex"),
  }],
}, null, 2)}\n`);
const reusable = loadReusableMetadataCheckpoint({
  outputRoot: artifactDir,
  campaignId: "campaign",
  manifestHash: "hash",
  routeKey: "youtube-1",
  batchSize: 10,
  taskPlans: [{ assignment }],
});
assert.equal(reusable.size, 1);
assert.equal(reusable.get(assignment.assignmentKey).sha256, crypto.createHash("sha256").update(body).digest("hex"));
assert.throws(() => loadReusableMetadataCheckpoint({
  outputRoot: artifactDir,
  campaignId: "campaign",
  manifestHash: "wrong-hash",
  routeKey: "youtube-1",
  batchSize: 10,
  taskPlans: [{ assignment }],
}), /manifest hash mismatch/);
const copy = spawnSync(process.execPath, [
  path.join(process.cwd(), "scripts/copy-youtube-campaign-metadata.mjs"),
  "--campaign-id=campaign",
  "--manifest-hash=hash",
  "--video-type=ordinary",
  "--support=EN",
  "--input-root=artifacts",
  "--registry=config/youtube-publication-campaigns.json",
  "--output=outputs/copy.json",
], { cwd: root, encoding: "utf8" });
assert.equal(copy.status, 0, copy.stderr || copy.stdout);
assert(fs.existsSync(path.join(root, "outputs/video-generator/deck_de_en/youtube_metadata.json")));
const report = JSON.parse(fs.readFileSync(path.join(root, "outputs/copy.json"), "utf8"));
assert.equal(report.copiedCount, 1);

console.log("youtube campaign metadata tests passed");
