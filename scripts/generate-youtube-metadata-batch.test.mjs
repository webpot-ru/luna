#!/usr/bin/env node
import assert from "node:assert/strict";

import { parseArgs } from "./generate-youtube-metadata.mjs";
import {
  callGeminiApiJsonWithKeys,
  getDirectGeminiApiKeys,
  parseGeminiBackendChain,
  runGeminiBackendChain,
} from "./lib/gemini-structured-json.mjs";
import { generateYouTubeMetadataBatch } from "./lib/youtube-metadata.mjs";

assert.deepEqual(parseGeminiBackendChain("api,vectorengine"), ["api", "vectorengine"]);
assert.deepEqual(parseGeminiBackendChain("api,api,vectorengine"), ["api", "vectorengine"]);
assert.deepEqual(parseGeminiBackendChain("", { hasDirectApiKey: true }), ["api"]);
assert.throws(() => parseGeminiBackendChain("api,unknown"), /Unsupported Gemini backend/);
assert.deepEqual(getDirectGeminiApiKeys({
  GEMINI_API_KEY: "primary",
  GEMINI_API_KEY_2: "secondary",
  GOOGLE_API_KEY: "legacy-third-value",
}).map((item) => item.name), ["GEMINI_API_KEY", "GEMINI_API_KEY_2"]);
assert.deepEqual(getDirectGeminiApiKeys({
  GOOGLE_API_KEY: "legacy-primary",
  GEMINI_API_KEY_2: "secondary",
}).map((item) => item.name), ["GOOGLE_API_KEY", "GEMINI_API_KEY_2"]);

const parsedArgs = parseArgs([
  "--set", "deck",
  "--support", "EN",
  "--gemini-backend", "api,vectorengine",
  "--gemini-batch-size=10",
  "--gemini-rate-limit-ms", "15000",
]);
assert.equal(parsedArgs.geminiBackend, "api,vectorengine");
assert.equal(parsedArgs.geminiBatchSize, 10);
assert.equal(parsedArgs.geminiRateLimitMs, 15000);

const backendCalls = [];
const chainResult = await runGeminiBackendChain({
  backends: ["api", "vectorengine"],
  providers: {
    api: async () => {
      backendCalls.push("api");
      throw new Error("Gemini API HTTP 429: RESOURCE_EXHAUSTED");
    },
    vectorengine: async () => {
      backendCalls.push("vectorengine");
      return { value: { status: "ok" } };
    },
    cli: async () => {
      backendCalls.push("cli");
      return { value: { status: "unexpected" } };
    },
  },
});
assert.equal(chainResult.backend, "vectorengine");
assert.deepEqual(backendCalls, ["api", "vectorengine"]);

const fetchCalls = [];
const directResult = await callGeminiApiJsonWithKeys({
  prompt: "Return JSON",
  schema: { type: "object", properties: { status: { type: "string" } }, required: ["status"] },
  apiKeys: [
    { name: "GEMINI_API_KEY", apiKey: "first-key" },
    { name: "GEMINI_API_KEY_2", apiKey: "second-key" },
  ],
  fetchImpl: async (url) => {
    fetchCalls.push(url);
    if (fetchCalls.length === 1) {
      return {
        ok: false,
        status: 429,
        json: async () => ({ error: { status: "RESOURCE_EXHAUSTED" } }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '{"status":"ok"}' }] } }] }),
    };
  },
});
assert.equal(fetchCalls.length, 2);
assert.equal(directResult.keyName, "GEMINI_API_KEY_2");
assert.deepEqual(directResult.value, { status: "ok" });

let nonRecoverableCalls = 0;
await assert.rejects(() => callGeminiApiJsonWithKeys({
  prompt: "Return JSON",
  schema: { type: "object" },
  apiKeys: [
    { name: "GEMINI_API_KEY", apiKey: "first-key" },
    { name: "GEMINI_API_KEY_2", apiKey: "second-key" },
  ],
  fetchImpl: async () => {
    nonRecoverableCalls += 1;
    return {
      ok: false,
      status: 400,
      json: async () => ({ error: { status: "INVALID_ARGUMENT" } }),
    };
  },
}), /HTTP 400/);
assert.equal(nonRecoverableCalls, 1);

let invalidJsonCalls = 0;
await assert.rejects(() => callGeminiApiJsonWithKeys({
  prompt: "Return JSON",
  schema: { type: "object" },
  apiKeys: [
    { name: "GEMINI_API_KEY", apiKey: "first-key" },
    { name: "GEMINI_API_KEY_2", apiKey: "second-key" },
  ],
  fetchImpl: async () => {
    invalidJsonCalls += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "not-json" }] } }] }),
    };
  },
}), /Unexpected token/);
assert.equal(invalidJsonCalls, 1);

const targets = ["FR", "DE", "IT", "ES", "PT", "JA", "KO", "ZH", "RU", "TR"];
let batchProviderCalls = 0;
const previousStrict = process.env.YOUTUBE_METADATA_AI_STRICT;
process.env.YOUTUBE_METADATA_AI_STRICT = "1";
try {
  const metadata = await generateYouTubeMetadataBatch(targets.map((targetLang) => ({
    setId: "test_deck_a1",
    supportLang: "EN",
    targetLang,
    withGemini: true,
    geminiBackend: "api,vectorengine",
    privacyStatus: "private",
    cards: [{ target_display: `${targetLang} sample`, target_word: `${targetLang} sample` }],
    deckMetadata: {
      title: "Kitchen Basics",
      description: "A1 beginner vocabulary",
      levelSignal: "A1",
      metadataSource: "test",
    },
  })), {
    providers: {
      api: async () => {
        batchProviderCalls += 1;
        return {
          value: {
            items: targets.map((targetLang, index) => ({
              requestId: `metadata-${index}-${targetLang}`,
              title: `Learn ${targetLang} Kitchen Basics`,
              description: `Practise ${targetLang} kitchen vocabulary with pronunciation, repeat pauses and a mini-test.`,
              tags: [targetLang, "kitchen vocabulary", "pronunciation"],
              hashtags: ["#FlashcardsLuna", "#Vocabulary", "#Languages"],
            })),
          },
          model: "test-model",
          keyName: "GEMINI_API_KEY",
        };
      },
      vectorengine: async () => {
        throw new Error("VectorEngine must not run after a successful direct batch.");
      },
    },
  });
  assert.equal(batchProviderCalls, 1);
  assert.equal(metadata.length, 10);
  assert.ok(metadata.every((item) => item.source === "gemini-api-batch"));
  assert.ok(metadata.every((item) => item.aiMetadata.batchSize === 10));
} finally {
  if (previousStrict === undefined) delete process.env.YOUTUBE_METADATA_AI_STRICT;
  else process.env.YOUTUBE_METADATA_AI_STRICT = previousStrict;
}

const exactSetCalls = [];
process.env.YOUTUBE_METADATA_AI_STRICT = "1";
try {
  const metadata = await generateYouTubeMetadataBatch(["FR", "DE"].map((targetLang) => ({
    setId: "test_deck_a1",
    supportLang: "EN",
    targetLang,
    withGemini: true,
    geminiBackend: "api,vectorengine",
    privacyStatus: "private",
    cards: [{ target_display: `${targetLang} sample`, target_word: `${targetLang} sample` }],
    deckMetadata: {
      title: "Kitchen Basics",
      description: "A1 beginner vocabulary",
      levelSignal: "A1",
      metadataSource: "test",
    },
  })), {
    providers: {
      api: async () => {
        exactSetCalls.push("api");
        return {
          value: {
            items: [{
              requestId: "metadata-0-FR",
              title: "Learn FR Kitchen Basics",
              description: "Practise FR kitchen vocabulary with pronunciation, repeat pauses and a mini-test.",
              tags: ["FR", "kitchen vocabulary", "pronunciation"],
              hashtags: ["#FlashcardsLuna", "#Vocabulary", "#Languages"],
            }],
          },
        };
      },
      vectorengine: async () => {
        exactSetCalls.push("vectorengine");
        return {
          value: {
            items: ["FR", "DE"].map((targetLang, index) => ({
              requestId: `metadata-${index}-${targetLang}`,
              title: `Learn ${targetLang} Kitchen Basics`,
              description: `Practise ${targetLang} kitchen vocabulary with pronunciation, repeat pauses and a mini-test.`,
              tags: [targetLang, "kitchen vocabulary", "pronunciation"],
              hashtags: ["#FlashcardsLuna", "#Vocabulary", "#Languages"],
            })),
          },
          model: "vector-test-model",
        };
      },
    },
  });
  assert.deepEqual(exactSetCalls, ["api", "vectorengine"]);
  assert.ok(metadata.every((item) => item.source === "gemini-vectorengine-batch"));
} finally {
  if (previousStrict === undefined) delete process.env.YOUTUBE_METADATA_AI_STRICT;
  else process.env.YOUTUBE_METADATA_AI_STRICT = previousStrict;
}

console.log("youtube metadata batch and provider-chain tests passed");
