#!/usr/bin/env node
import assert from "node:assert/strict";

import { parseArgs } from "./generate-youtube-metadata.mjs";
import {
  callGeminiApiJsonWithKeys,
  getDirectGeminiApiKeys,
  parseGeminiBackendChain,
  resolveGeminiTimeoutMs,
  runGeminiBackendChain,
} from "./lib/gemini-structured-json.mjs";
import { resolveVectorEngineTimeoutMs } from "./lib/vectorengine-gemini.mjs";
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
assert.equal(resolveGeminiTimeoutMs({ maxOutputTokens: 60000, env: {} }), 600000);
assert.equal(resolveGeminiTimeoutMs({ maxOutputTokens: 1600, env: {} }), 120000);
assert.equal(resolveGeminiTimeoutMs({ maxOutputTokens: 60000, env: { GEMINI_TIMEOUT_MS: "240000" } }), 240000);
assert.equal(resolveVectorEngineTimeoutMs({ maxOutputTokens: 60000, env: {} }), 600000);
assert.equal(resolveVectorEngineTimeoutMs({ maxOutputTokens: 1600, env: {} }), 120000);

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

let timeoutRotationCalls = 0;
const timeoutRotationResult = await callGeminiApiJsonWithKeys({
  prompt: "Return JSON",
  schema: { type: "object" },
  timeoutMs: 1000,
  apiKeys: [
    { name: "GEMINI_API_KEY", apiKey: "first-key" },
    { name: "GEMINI_API_KEY_2", apiKey: "second-key" },
  ],
  fetchImpl: async () => {
    timeoutRotationCalls += 1;
    if (timeoutRotationCalls === 1) {
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: '{"status":"ok"}' }] } }] }),
    };
  },
});
assert.equal(timeoutRotationCalls, 2);
assert.equal(timeoutRotationResult.keyName, "GEMINI_API_KEY_2");
assert.deepEqual(timeoutRotationResult.value, { status: "ok" });

let serviceUnavailableCalls = 0;
const serviceUnavailableResult = await callGeminiApiJsonWithKeys({
  prompt: "Return JSON",
  schema: { type: "object" },
  apiKeys: [
    { name: "GEMINI_API_KEY", apiKey: "first-key" },
    { name: "GEMINI_API_KEY_2", apiKey: "second-key" },
  ],
  fetchImpl: async () => {
    serviceUnavailableCalls += 1;
    if (serviceUnavailableCalls === 1) {
      return {
        ok: false,
        status: 503,
        json: async () => ({ error: { status: "UNAVAILABLE" } }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: '{"status":"ok"}' }] } }] }),
    };
  },
});
assert.equal(serviceUnavailableCalls, 2);
assert.equal(serviceUnavailableResult.keyName, "GEMINI_API_KEY_2");
assert.deepEqual(serviceUnavailableResult.value, { status: "ok" });

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
const invalidJsonRecovery = await callGeminiApiJsonWithKeys({
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
      json: async () => ({
        candidates: [{
          finishReason: "STOP",
          content: { parts: [{ text: invalidJsonCalls === 1 ? '{"status":"cut' : '{"status":"ok"}' }] },
        }],
      }),
    };
  },
});
assert.equal(invalidJsonCalls, 2);
assert.equal(invalidJsonRecovery.keyName, "GEMINI_API_KEY_2");
assert.deepEqual(invalidJsonRecovery.value, { status: "ok" });

let maxTokensCalls = 0;
const maxTokensRecovery = await callGeminiApiJsonWithKeys({
  prompt: "Return JSON",
  schema: { type: "object" },
  apiKeys: [
    { name: "GEMINI_API_KEY", apiKey: "first-key" },
    { name: "GEMINI_API_KEY_2", apiKey: "second-key" },
  ],
  fetchImpl: async () => {
    maxTokensCalls += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          finishReason: maxTokensCalls === 1 ? "MAX_TOKENS" : "STOP",
          content: { parts: [{ text: maxTokensCalls === 1 ? '{"status":"cut' : '{"status":"ok"}' }] },
        }],
      }),
    };
  },
});
assert.equal(maxTokensCalls, 2);
assert.equal(maxTokensRecovery.keyName, "GEMINI_API_KEY_2");
assert.deepEqual(maxTokensRecovery.value, { status: "ok" });

let validationCalls = 0;
const validationRecovery = await callGeminiApiJsonWithKeys({
  prompt: "Return JSON",
  schema: { type: "object" },
  validateValue: (value) => {
    if (value.status !== "ok") throw new Error("did not return the exact requestId set");
  },
  apiKeys: [
    { name: "GEMINI_API_KEY", apiKey: "first-key" },
    { name: "GEMINI_API_KEY_2", apiKey: "second-key" },
  ],
  fetchImpl: async () => {
    validationCalls += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          finishReason: "STOP",
          content: { parts: [{ text: validationCalls === 1 ? '{"status":"incomplete"}' : '{"status":"ok"}' }] },
        }],
      }),
    };
  },
});
assert.equal(validationCalls, 2);
assert.equal(validationRecovery.keyName, "GEMINI_API_KEY_2");
assert.deepEqual(validationRecovery.value, { status: "ok" });

const malformedBackendCalls = [];
const malformedBackendRecovery = await runGeminiBackendChain({
  backends: ["api", "vectorengine"],
  providers: {
    api: async () => {
      malformedBackendCalls.push("api");
      return callGeminiApiJsonWithKeys({
        prompt: "Return JSON",
        schema: { type: "object" },
        apiKeys: [
          { name: "GEMINI_API_KEY", apiKey: "first-key" },
          { name: "GEMINI_API_KEY_2", apiKey: "second-key" },
        ],
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [{ finishReason: "STOP", content: { parts: [{ text: '{"status":"cut' }] } }],
          }),
        }),
      });
    },
    vectorengine: async () => {
      malformedBackendCalls.push("vectorengine");
      return { value: { status: "ok" } };
    },
  },
});
assert.deepEqual(malformedBackendCalls, ["api", "vectorengine"]);
assert.equal(malformedBackendRecovery.backend, "vectorengine");
assert.deepEqual(malformedBackendRecovery.value, { status: "ok" });

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
