#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { buildPolyglotPlaylistAssignment } from "./lib/polyglot-youtube-playlists.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "polyglot-youtube-metadata-unicode-"));
const courseUrl = "https://flashcardsluna.com/zh/courses/home-kitchen-cooking-actions/study/standard?langs=en%2Ces%2Cfr%2Cde";
const metadata = {
  videoType: "polyglot",
  polyglotKey: "polyglot:home_kitchen_cooking_actions_a1_a2:ZH:global_europe_core:7a4233775927:full",
  setId: "home_kitchen_cooking_actions_a1_a2",
  supportLang: "ZH",
  bundleKey: "global_europe_core",
  targetLangs: ["EN", "ES", "FR", "DE"],
  title: "Polyglot: 烹饪动作词汇 | 英语、西班牙语、法语、德语",
  description: `${"用多种语言练习烹饪动作词汇，听发音、暂停回忆并重复复习。".repeat(4)}180 多个主题词汇包。课程链接：${courseUrl}`,
  courseUrl,
  tags: ["烹饪词汇", "英语", "西班牙语", "法语", "德语", "多语学习", "发音", "闪卡"],
  hashtags: ["#多语学习", "#烹饪词汇", "#语言学习"],
  source: "openai-responses-campaign-batch",
  playlistTitle: "Polyglot 烹饪动作",
  playlistDescription: "多语言烹饪词汇复习。",
};
metadata.playlist_key = buildPolyglotPlaylistAssignment(metadata).key;
assert(Array.from(metadata.description).length >= 150 && Array.from(metadata.description).length < 250);

const metadataPath = path.join(root, "youtube_metadata.json");
fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
const run = spawnSync(process.execPath, [
  "scripts/check-polyglot-youtube-metadata.mjs",
  metadataPath,
  "--require-ai-metadata",
  "--expected-support=ZH",
  "--expected-bundle=global_europe_core",
  "--expected-targets=EN,ES,FR,DE",
], { cwd: process.cwd(), encoding: "utf8" });

assert.equal(run.status, 0, run.stderr || run.stdout);
const report = JSON.parse(run.stdout);
assert.equal(report.status, "pass");
assert.equal(report.results[0].metrics.descriptionLength, Array.from(metadata.description).length);
assert.equal(fs.readFileSync(metadataPath, "utf8"), `${JSON.stringify(metadata, null, 2)}\n`);

console.log("Polyglot YouTube metadata Unicode tests passed");
