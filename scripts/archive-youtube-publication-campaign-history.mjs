#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { planYoutubeCampaignHistoryArchive, readYoutubeDurableJson, serializeYoutubeDurableJson } from "./lib/youtube-durable-json.mjs";

const apply = process.argv.includes("--apply");
const registryPath = "config/youtube-publication-campaigns.json";
if (apply) assert.ok(process.argv.includes("--confirm=ARCHIVE_FINALIZED_YOUTUBE_CAMPAIGNS"), "Explicit archive confirmation required");
const plan = planYoutubeCampaignHistoryArchive(registryPath);
const indexText = `${JSON.stringify(plan.index)}\n`;
for (const text of [indexText, plan.historyText]) assert.ok(Buffer.byteLength(text) <= 95 * 1024 * 1024, "Archive/index exceeds safe blob budget");
if (apply) {
  fs.mkdirSync(path.dirname(plan.historyPath), { recursive: true });
  if (fs.existsSync(plan.historyPath)) assert.equal(fs.readFileSync(plan.historyPath, "utf8"), plan.historyText);
  else fs.writeFileSync(plan.historyPath, plan.historyText, { flag: "wx" });
  // Validate the complete new index before replacing the canonical file.
  const hydrated = { ...plan.registry, campaignArchives: plan.index.campaignArchives };
  assert.equal(serializeYoutubeDurableJson(registryPath, hydrated), indexText);
  const temporary = `${registryPath}.archive-${process.pid}`;
  fs.writeFileSync(temporary, indexText);
  fs.renameSync(temporary, registryPath);
  assert.deepEqual(readYoutubeDurableJson(registryPath).campaigns, plan.registry.campaigns);
}
console.log(JSON.stringify({ mode: apply ? "apply" : "dry_run", campaignCount: plan.registry.campaigns.length,
  archivedCount: plan.reference.campaignCount, historyPath: plan.historyPath,
  indexBytes: Buffer.byteLength(indexText), historyBytes: Buffer.byteLength(plan.historyText),
  providerCalls: 0, youtubeWrites: 0 }, null, 2));
