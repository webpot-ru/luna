#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  generateYouTubeMetadataBatch,
  selectSeoSafeTitle,
} from "./lib/youtube-metadata.mjs";

const targets = ["AZ", "BG", "BN", "CS", "DA"];
const inputs = targets.map((targetLang) => ({
  setId: "home_kitchen_cooking_actions_a1_a2",
  supportLang: "EN",
  targetLang,
  privacyStatus: "private",
  deckMetadata: {
    title: "Cooking Actions",
    metadataSource: "batch-fallback-test",
  },
  cards: [
    { target_display: `${targetLang} word one` },
    { target_display: `${targetLang} word two` },
  ],
}));

function generatedBatch(items = targets) {
  return {
    items: items.map((targetLang, index) => ({
      targetLang,
      title: index === 0 ? "Tiny title" : `${targetLang} cooking actions vocabulary for beginners`,
      description: `Learn useful ${targetLang} cooking action words with pronunciation, repeat pauses, flashcards and a short review. ${inputs[index]?.setId || "home_kitchen_cooking_actions_a1_a2"}`,
      tags: [
        `${targetLang} vocabulary`, "cooking actions", "language learning", "pronunciation",
        "flashcards", "beginner lesson", "daily practice", "speaking practice",
        "listening practice", "word review", "kitchen vocabulary", "FlashcardsLuna",
      ],
      hashtags: ["#FlashcardsLuna", "#Vocabulary", "#LanguageLearning"],
    })),
  };
}

assert.equal(
  selectSeoSafeTitle("学习孟加拉语烹饪动作", "孟加拉语 A1：烹饪动作与厨房常用动词 | FlashcardsLuna"),
  "孟加拉语 A1：烹饪动作与厨房常用动词 | FlashcardsLuna",
);

let directCalls = 0;
let vectorCalls = 0;
const fallbackResults = await generateYouTubeMetadataBatch(inputs, {
  withGemini: true,
  geminiBackend: "api,vectorengine",
  callGeminiApi: async () => {
    directCalls += 1;
    throw new Error("direct unavailable");
  },
  callGeminiVectorEngineBatch: async () => {
    vectorCalls += 1;
    return generatedBatch();
  },
});
assert.equal(directCalls, 1);
assert.equal(vectorCalls, 1);
assert.equal(fallbackResults.length, 5);
assert.ok(fallbackResults.every((item) => item.source === "gemini-vectorengine"));
assert.ok(fallbackResults.every((item) => item.title.length >= 25));

let directSuccessVectorCalls = 0;
const directResults = await generateYouTubeMetadataBatch(inputs, {
  withGemini: true,
  geminiBackend: "api,vectorengine",
  callGeminiApi: async () => generatedBatch(),
  callGeminiVectorEngineBatch: async () => {
    directSuccessVectorCalls += 1;
    return generatedBatch();
  },
});
assert.equal(directSuccessVectorCalls, 0);
assert.ok(directResults.every((item) => item.source === "gemini-api"));

const previousStrict = process.env.YOUTUBE_METADATA_AI_STRICT;
process.env.YOUTUBE_METADATA_AI_STRICT = "1";
try {
  await assert.rejects(
    generateYouTubeMetadataBatch(inputs, {
      withGemini: true,
      geminiBackend: "api,vectorengine",
      callGeminiApi: async () => {
        throw new Error("direct unavailable");
      },
      callGeminiVectorEngineBatch: async () => generatedBatch(targets.slice(0, 4)),
    }),
    /returned 4 items for 5 inputs/,
  );
} finally {
  if (previousStrict === undefined) delete process.env.YOUTUBE_METADATA_AI_STRICT;
  else process.env.YOUTUBE_METADATA_AI_STRICT = previousStrict;
}

console.log("YouTube metadata batch fallback check passed: one direct batch, one VectorEngine fallback batch, complete-item gate, SEO title fallback.");
