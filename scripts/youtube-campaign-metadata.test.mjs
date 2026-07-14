#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  CAMPAIGN_MAX_OUTPUT_TOKENS,
  buildCampaignMetadataPrompt,
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
