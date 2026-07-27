#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  OPENAI_METADATA_CANARY_TASKS,
  runCanary,
  validateCanaryPayload,
} from "./check-openai-youtube-metadata.mjs";

const items = OPENAI_METADATA_CANARY_TASKS.map((task) => ({
  requestId: task.requestId,
  title: `Canary ${task.requestId}`.slice(0, 100),
  description: "A concise language-learning lesson with clear vocabulary practice, listening prompts, repetition pauses and a short review for independent learners.",
  tags: ["language learning", "vocabulary", "FlashcardsLuna"],
  hashtags: ["#LanguageLearning", "#Vocabulary", "#FlashcardsLuna"],
}));
assert.equal(validateCanaryPayload({ items }).items.length, 2);
assert.throws(() => validateCanaryPayload({ items: items.slice(0, 1) }), /requestId mismatch/);

const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "openai-metadata-canary-")), "report.json");
let calls = 0;
const report = await runCanary({
  output,
  callProvider: async ({ validateValue }) => {
    calls += 1;
    validateValue({ items });
    return {
      value: { items },
      model: "gpt-test",
      serviceTier: "data_sharing_incentive",
      responseId: "resp-test",
      usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150, reasoningTokens: 10 },
    };
  },
});
assert.equal(calls, 1);
assert.equal(report.requestCount, 1);
assert.equal(report.serviceTier, "data_sharing_incentive");
assert.equal(report.usage.totalTokens, 150);
assert.equal(JSON.parse(fs.readFileSync(output, "utf8")).status, "ok");

const campaignWorkflow = fs.readFileSync(".github/workflows/youtube-publication-campaign.yml", "utf8");
assert.match(campaignWorkflow, /BACKEND="openai"/);
assert.match(campaignWorkflow, /--openai-model="gpt-5\.6-terra"/);
assert.match(campaignWorkflow, /--openai-fallback-model="gpt-5\.6-luna"/);
assert.doesNotMatch(campaignWorkflow, /BACKEND="openai,api"/);
assert.match(campaignWorkflow, /VectorEngine is disabled for campaign metadata/);

console.log("OpenAI YouTube metadata canary tests passed");
