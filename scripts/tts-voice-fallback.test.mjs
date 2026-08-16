#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  defaultVoiceMap,
  getVoiceForLanguage,
} from "./lib/tts-voice-map.mjs";

assert.equal(defaultVoiceMap.SK, "edge_sk-SK-LukasNeural");
assert.equal(getVoiceForLanguage("SK"), "edge_sk-SK-LukasNeural");
assert.notEqual(getVoiceForLanguage("SK"), "edge_en-US-GuyNeural");
assert.equal(getVoiceForLanguage("sk"), "edge_sk-SK-LukasNeural");

assert.equal(defaultVoiceMap.SL, "edge_sl-SI-RokNeural");
assert.equal(getVoiceForLanguage("SL"), "edge_sl-SI-RokNeural");
assert.notEqual(getVoiceForLanguage("SL"), "edge_en-US-GuyNeural");
assert.equal(getVoiceForLanguage("sl"), "edge_sl-SI-RokNeural");

console.log("TTS voice map tests passed.");
