#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-metadata-unicode-"));
const metadataPath = path.join(root, "youtube_metadata.json");
const metadata = {
  setId: "deck",
  supportLang: "JA",
  targetLang: "EN",
  title: "日本語の単語を学ぶ初級レッスン",
  description: `${"日".repeat(150)} https://flashcardsluna.com/ja/courses`,
  tags: ["日本語", "英語", "単語", "発音", "学習"],
  hashtags: ["#日本語"],
  categoryId: "27",
  privacyStatus: "private",
};
const before = `${JSON.stringify(metadata, null, 2)}\n`;
fs.writeFileSync(metadataPath, before, "utf8");
const result = spawnSync(process.execPath, ["scripts/check-youtube-metadata.mjs", metadataPath], {
  cwd: process.cwd(),
  encoding: "utf8",
});
assert.equal(result.status, 0, result.stderr || result.stdout);
assert.equal(fs.readFileSync(metadataPath, "utf8"), before, "validation must not append English text to Japanese metadata");
console.log("youtube metadata Unicode tests passed");
