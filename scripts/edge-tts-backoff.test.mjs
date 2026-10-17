import assert from "node:assert/strict";
import { edgeTtsRetryDelay } from "./lib/edge-tts-backoff.mjs";
assert.equal(edgeTtsRetryDelay("HTTP status=429", 1, 1500, () => 0), 30000);
assert.equal(edgeTtsRetryDelay("HTTP status=429", 2, 1500, () => 0), 60000);
assert.equal(edgeTtsRetryDelay("HTTP status=429", 3, 1500, () => 0), 120000);
assert.equal(edgeTtsRetryDelay("Too Many Requests", 4, 1500, () => 0.5), 122500);
assert.equal(edgeTtsRetryDelay("HTTP status=403", 2, 1500), 3000);
assert.equal(edgeTtsRetryDelay("NoAudioReceived", 1, 1500), 1500);
console.log("Edge TTS bounded backoff tests passed");
