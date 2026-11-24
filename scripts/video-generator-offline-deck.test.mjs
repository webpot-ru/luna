#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  edgeVoiceCandidates,
  fetchDeckCards,
  getTtsAudio,
  isUsableEdgeMp3,
  resolveOfflineDeckCards,
} from "./lib/video-generator.mjs";

const completeOfflineDeck = {
  cards: {
    ID: {
      AZ: [{ meaning_id: "fixture", target_word: "unitaz", support_word: "toilet" }],
    },
    NB: {
      EN: [{ meaning_id: "alias-fixture", target_word: "toilet", support_word: "toalett" }],
    },
  },
};

assert.equal(resolveOfflineDeckCards(completeOfflineDeck, "AZ", "ID")?.length, 1);
assert.equal(resolveOfflineDeckCards(completeOfflineDeck, "EN", "NO")?.length, 1);
assert.equal(resolveOfflineDeckCards(completeOfflineDeck, "FR", "ID"), null);
assert.deepEqual(edgeVoiceCandidates("LO", "edge_lo-LA-KeomanyNeural"), [
  "edge_lo-LA-KeomanyNeural",
  "edge_lo-LA-ChanthavongNeural",
]);
assert.deepEqual(edgeVoiceCandidates("LO", "edge_lo-LA-ChanthavongNeural"), [
  "edge_lo-LA-ChanthavongNeural",
]);
assert.equal(isUsableEdgeMp3(new URL(import.meta.url)), false);

let databaseCalls = 0;
await assert.rejects(
  fetchDeckCards("home_bathroom_essentials_a1", "FR", "ID", {
    offlineData: completeOfflineDeck,
    runningInGitHubActions: true,
    databaseLoader: async () => {
      databaseCalls += 1;
      throw new Error("database loader must not run");
    },
  }),
  /GitHub video generation requires offline cards for home_bathroom_essentials_a1\/ID->FR/,
);
assert.equal(databaseCalls, 0);

const localCards = await fetchDeckCards("local-fixture", "FR", "ID", {
  offlineData: completeOfflineDeck,
  runningInGitHubActions: false,
  databaseLoader: async () => {
    databaseCalls += 1;
    return [{ meaning_id: "db-fixture" }];
  },
});
assert.equal(databaseCalls, 1);
assert.equal(localCards[0].meaning_id, "db-fixture");

const compatibilityExporter = fs.readFileSync("scripts/export-deck-data.mjs", "utf8");
assert.match(compatibilityExporter, /export-and-upload-deck\.mjs/);
assert.match(compatibilityExporter, /--local-only/);
assert.doesNotMatch(compatibilityExporter, /const supportLangs = \[/);

const canonicalExporter = fs.readFileSync("scripts/export-and-upload-deck.mjs", "utf8");
assert.match(canonicalExporter, /process\.exitCode = 1/);

const videoGeneratorSource = fs.readFileSync("scripts/lib/video-generator.mjs", "utf8");
assert.match(videoGeneratorSource, /crypto\.randomUUID\(\).*\.tmp\.mp3/);
assert.doesNotMatch(videoGeneratorSource, /unlinkSync\(candidateCachedPath\)/);

fs.mkdirSync("scratch", { recursive: true });
const fixture = fs.mkdtempSync("scratch/guarded-parallel-video-");
const mp3Fixture = Buffer.concat([Buffer.from("ID3"), Buffer.alloc(150)]);
const fallbackVoice = "edge_lo-LA-ChanthavongNeural";
const audioText = "cache only fixture";
const fallbackHash = crypto.createHash("sha256").update(`${fallbackVoice}_${audioText}`).digest("hex");
const fallbackPath = path.join(fixture, `${fallbackHash}.mp3`);
fs.writeFileSync(fallbackPath, mp3Fixture);
assert.equal(await getTtsAudio({
  text: audioText, voiceId: "edge_lo-LA-KeomanyNeural", langCode: "LO", cacheDir: fixture, cacheOnly: true,
}), fallbackPath);
await assert.rejects(getTtsAudio({
  text: "missing Armenian audio", voiceId: "ai33_fixture", langCode: "HY", cacheDir: fixture, cacheOnly: true,
}), /Required pre-fetched audio missing/u);
await assert.rejects(getTtsAudio({
  text: "missing Edge audio", voiceId: "edge_en-US-JennyNeural", langCode: "EN", cacheDir: fixture, cacheOnly: true,
}), /Required pre-fetched audio missing/u);

fs.mkdirSync(path.join(fixture, "scripts"));
fs.mkdirSync(path.join(fixture, "data/decks"), { recursive: true });
fs.writeFileSync(path.join(fixture, "data/decks/fixture.json"), JSON.stringify({
  cards: { RU: { FR: [], IT: [], DE: [], JA: [] } },
}));
fs.writeFileSync(path.join(fixture, "scripts/build-deck-video.mjs"), `
  import fs from "node:fs";
  const stage = process.env.YOUTUBE_ORDINARY_AUDIO_STAGE;
  fs.appendFileSync("timing.log", stage + " start\\n");
  await new Promise(resolve => setTimeout(resolve, 150));
  fs.appendFileSync("timing.log", stage + " finish\\n");
`);
const parallelBuild = spawnSync(process.execPath, [
  fileURLToPath(new URL("./build-all-deck-videos.mjs", import.meta.url)),
  "--set", "fixture", "--support", "RU", "--concurrency", "3",
], {
  cwd: fixture,
  env: { ...process.env, YOUTUBE_CAMPAIGN_HTTP429_MODE: "stop" },
  encoding: "utf8",
});
assert.equal(parallelBuild.status, 0, parallelBuild.stderr);
const marks = fs.readFileSync(path.join(fixture, "timing.log"), "utf8").trim().split("\n");
assert.deepEqual(marks.slice(0, 8), Array(4).fill(["prefetch start", "prefetch finish"]).flat());
const renders = marks.slice(8);
assert.equal(renders.length, 8);
assert(renders.every(mark => mark.startsWith("cache-only ")));
let active = 0;
let maximum = 0;
for (const mark of renders) {
  active += mark.endsWith(" start") ? 1 : -1;
  maximum = Math.max(maximum, active);
}
assert.equal(active, 0);
assert.equal(maximum, 3);

console.log("video-generator offline deck tests passed");
