#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  edgeVoiceCandidates,
  fetchDeckCards,
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

console.log("video-generator offline deck tests passed");
