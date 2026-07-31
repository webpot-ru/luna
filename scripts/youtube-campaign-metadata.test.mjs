#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  CAMPAIGN_MAX_OUTPUT_TOKENS,
  OPENAI_CAMPAIGN_MAX_OUTPUT_TOKENS,
  DEFAULT_OPENAI_DAILY_TOKEN_LIMIT,
  DEFAULT_OPENAI_LARGE_CAMPAIGN_ASSIGNMENTS,
  assertOpenAiDailyTokenBudget,
  selectOpenAiMetadataModel,
  DEFAULT_VECTORENGINE_CAMPAIGN_SUB_BATCH_SIZE,
  buildCampaignMetadataPrompt,
  finalizeCampaignMetadata,
  generateVectorEngineCampaignMetadataSubBatches,
  loadReusableMetadataCheckpoint,
  validateCampaignMetadataResponse,
} from "./generate-youtube-campaign-metadata.mjs";
import { callOpenAiStructuredJson, estimateOpenAiRequestTokenUpperBound, resolveOpenAiServiceTier } from "./lib/openai-structured-json.mjs";
import { runGeminiBackendChain } from "./lib/gemini-structured-json.mjs";

const tasks = [
  { requestId: "ordinary|deck|EN|DE", videoType: "ordinary", supportLang: "EN", targetLang: "DE" },
  { requestId: "polyglot|deck|EN|bundle|hash|full", videoType: "polyglot", supportLang: "EN", targetLangs: ["DE", "FR"] },
];
const prompt = buildCampaignMetadataPrompt(tasks);
assert.match(prompt, /2 independent FlashcardsLuna/);
assert.match(prompt, /ordinary\|deck\|EN\|DE/);
assert.match(prompt, /250-900 Unicode characters/);
assert.match(prompt, /ZH, JA and KO descriptions may be 150-900 Unicode characters/);
assert.match(prompt, /fallbackTags/u);
assert.equal(CAMPAIGN_MAX_OUTPUT_TOKENS, 60000);
assert.equal(OPENAI_CAMPAIGN_MAX_OUTPUT_TOKENS, 12000);
assert.equal(DEFAULT_OPENAI_DAILY_TOKEN_LIMIT, 2_000_000);
assert.equal(DEFAULT_OPENAI_LARGE_CAMPAIGN_ASSIGNMENTS, 100);
assert.equal(selectOpenAiMetadataModel({ assignmentCount: 99, useLuna: false }), "gpt-5.6-terra");
assert.equal(selectOpenAiMetadataModel({ assignmentCount: 100, useLuna: false }), "gpt-5.6-luna");
assert.equal(selectOpenAiMetadataModel({ assignmentCount: 1, useLuna: true }), "gpt-5.6-luna");
assert.doesNotThrow(() => assertOpenAiDailyTokenBudget({ usedTokens: 1_900_000, reservationTokens: 100_000, limitTokens: 2_000_000 }));
assert.throws(() => assertOpenAiDailyTokenBudget({ usedTokens: 1_900_001, reservationTokens: 100_000, limitTokens: 2_000_000 }), /daily token budget would be exceeded/);
const response = {
  items: tasks.map((task) => ({
    requestId: task.requestId,
    title: "Title",
    description: "Description",
    tags: ["tag"],
    hashtags: ["#tag"],
  })),
};
assert.equal(validateCampaignMetadataResponse(response, tasks).size, 2);
assert.throws(() => validateCampaignMetadataResponse({ items: [response.items[0]] }, tasks), /response mismatch/);

const czechPolyglotTask = {
  assignment: {
    assignmentKey: "polyglot|deck|CS|romance_core|hash|full",
    supportLang: "CS",
    videoType: "polyglot",
    campaignId: "campaign",
    campaignManifestHash: "hash",
    publishAt: "2026-07-25T10:30:00.000Z",
    playlist: { playlistKey: "CS__romance_core", youtubePlaylistId: "PL-test" },
  },
  template: {
    setId: "deck",
    supportLang: "CS",
    title: "Polyglot: kuchyňská slovíčka",
    description: "Procvičujte kuchyňská slovíčka, výslovnost a opakování s kartičkami FlashcardsLuna. Více jazyků v jednom videu pomáhá pravidelnému učení a opakování slovní zásoby. Poslouchejte slovo, opakujte je během pauzy a na konci si ověřte paměť krátkým opakováním.",
    tags: ["FlashcardsLuna", "polyglot", "kuchyňská slovíčka", "jazykové kartičky", "francouzština"],
    hashtags: ["#FlashcardsLuna", "#Polyglot"],
    playlistTitle: "Polyglot: románské jazyky",
    playlistDescription: "Procvičujte románské jazyky v režimu Polyglot.",
  },
};
const czechMetadata = finalizeCampaignMetadata(czechPolyglotTask, {
  title: "Polyglot: kuchyňská slovíčka",
  description: czechPolyglotTask.template.description,
  tags: ["learn French", "French vocabulary", "French pronunciation", "French for beginners", "kitchen words", "basic French words", "word list"],
  hashtags: ["#FlashcardsLuna", "#Polyglot"],
  playlistTitle: "Polyglot: románské jazyky",
  playlistDescription: "Procvičujte románské jazyky v režimu Polyglot.",
}, { backend: "openai", backendChain: ["openai"], model: "gpt-test", batchSize: 5 });
assert.deepEqual(czechMetadata.tags, czechPolyglotTask.template.tags);
assert.equal(czechMetadata.aiMetadata.tagsFallbackToTemplate, true);
assert.equal(czechMetadata.aiMetadata.languageGate.status, "pass");
assert.equal(DEFAULT_VECTORENGINE_CAMPAIGN_SUB_BATCH_SIZE, 2);
const campaignWorkflow = fs.readFileSync(".github/workflows/youtube-publication-campaign.yml", "utf8");
assert.match(
  campaignWorkflow,
  /  metadata:\n[\s\S]*?strategy:\n\s+fail-fast: false\n\s+max-parallel: 1\n\s+matrix:/u,
  "campaign metadata routes must be serialized to protect the shared provider quota",
);
assert.match(
  campaignWorkflow,
  /  ordinary:\n[\s\S]*?strategy:\n\s+fail-fast: false\n[\s\S]*?max-parallel: 8\n\s+matrix:\n\s+route_key: \[youtube-1, youtube-2, youtube-3, youtube-4, youtube-5, youtube-6, youtube-7, youtube-8\]/u,
  "all eight project queues must start together for ordinary publication",
);
assert.match(
  campaignWorkflow,
  /  polyglot:\n[\s\S]*?strategy:\n\s+fail-fast: false\n[\s\S]*?max-parallel: 8\n\s+matrix:\n\s+route_key: \[youtube-1, youtube-2, youtube-3, youtube-4, youtube-5, youtube-6, youtube-7, youtube-8\]/u,
  "all eight project queues must start together for Polyglot publication",
);
const routeWorkerWorkflow = fs.readFileSync(".github/workflows/youtube-campaign-route-publish.yml", "utf8");
assert.match(routeWorkerWorkflow, /  ordinary:\n[\s\S]*?max-parallel: 5\n\s+matrix:/u, "each ordinary project queue must run five physical channels concurrently");
assert.match(routeWorkerWorkflow, /  polyglot:\n[\s\S]*?max-parallel: 5\n\s+matrix:/u, "each Polyglot project queue must run five physical channels concurrently");
assert.match(routeWorkerWorkflow, /campaign_polyglot_rows: \$\{\{ matrix\.polyglot_rows \}\}/u, "the route worker must pass the complete Polyglot sequence for a physical channel");
const polyglotWorkflow = fs.readFileSync(".github/workflows/youtube-polyglot-video-publish.yml", "utf8");
assert.match(polyglotWorkflow, /prepare-polyglot-sequence:[\s\S]*?worker_matrix/u, "Polyglot publication must prepare a per-channel sequence");
assert.match(polyglotWorkflow, /youtube-polyglot-video:\n\s+needs: prepare-polyglot-sequence[\s\S]*?max-parallel: 1[\s\S]*?matrix: \$\{\{ fromJSON\(needs\.prepare-polyglot-sequence\.outputs\.worker_matrix\) \}\}/u, "all Polyglot bundles for one physical channel must stay serial");
assert.match(campaignWorkflow, /OPENAI_API_KEY: \$\{\{ secrets\.OPENAI_API_KEY \}\}/u);
assert.match(campaignWorkflow, /BACKEND="openai"/u);
assert.match(campaignWorkflow, /--confirm-openai=USE_OPENAI_METADATA/u);
assert.match(campaignWorkflow, /--openai-model="gpt-5\.6-terra"/u);
assert.match(campaignWorkflow, /--openai-fallback-model="gpt-5\.6-luna"/u);
assert.match(campaignWorkflow, /OPENAI_ROUTE_TOKEN_BUDGET: \$\{\{ matrix\.openai_token_budget \}\}/u);
assert.match(campaignWorkflow, /VectorEngine is disabled for campaign metadata; use only Terra and Luna\./u);
assert.doesNotMatch(campaignWorkflow, /OPENAI_METADATA_MODEL: \$\{\{ vars\.OPENAI_METADATA_MODEL \}\}/u);
assert.ok(estimateOpenAiRequestTokenUpperBound({ prompt, schema: { type: "object", properties: {} } }) > Buffer.byteLength(prompt));

const openAiBodies = [];
const openAiResult = await callOpenAiStructuredJson({
  apiKey: "test-key",
  model: "gpt-test",
  serviceTier: "auto",
  prompt,
  schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            requestId: { type: "string" },
            title: { type: "string" },
          },
        },
      },
    },
  },
  validateValue: (value) => assert.equal(value.items.length, 1),
  fetchImpl: async (_url, init) => {
    openAiBodies.push(JSON.parse(init.body));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        id: "resp-test",
        status: "completed",
        model: "gpt-test-2026-01-01",
        service_tier: "data_sharing_incentive",
        output: [{
          type: "message",
          content: [{ type: "output_text", text: JSON.stringify({ items: [{ requestId: tasks[0].requestId, title: "Title" }] }) }],
        }],
        usage: {
          input_tokens: 100,
          output_tokens: 25,
          total_tokens: 125,
          output_tokens_details: { reasoning_tokens: 5 },
        },
      }),
    };
  },
});
assert.equal(openAiResult.provider, "openai");
assert.equal(openAiResult.serviceTier, "data_sharing_incentive");
assert.equal(openAiResult.usage.totalTokens, 125);
assert.equal(openAiBodies[0].store, false);
assert.equal(openAiBodies[0].service_tier, "auto");
assert.equal(openAiBodies[0].text.format.strict, true);
assert.equal(openAiBodies[0].text.format.schema.additionalProperties, false);
assert.deepEqual(openAiBodies[0].text.format.schema.required, ["items"]);
assert.equal(openAiBodies[0].text.format.schema.properties.items.items.additionalProperties, false);
assert.throws(() => resolveOpenAiServiceTier("batch"), /Expected auto, default or flex/);

const foreignRequestIdBackendCalls = [];
const foreignRequestIdRecovery = await runGeminiBackendChain({
  backends: ["openai", "api"],
  providers: {
    openai: async () => {
      foreignRequestIdBackendCalls.push("openai");
      return callOpenAiStructuredJson({
        apiKey: "test-key",
        model: "gpt-test",
        prompt,
        schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  requestId: { type: "string" },
                },
              },
            },
          },
        },
        validateValue: (value) => validateCampaignMetadataResponse(value, tasks),
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => ({
            id: "resp-foreign-request-id",
            status: "completed",
            model: "gpt-test",
            service_tier: "default",
            output: [{
              type: "message",
              content: [{
                type: "output_text",
                text: JSON.stringify({
                  items: [{ requestId: "polyglot|another_deck|NO|east_asia_core|hash|full" }],
                }),
              }],
            }],
          }),
        }),
      });
    },
    api: async () => {
      foreignRequestIdBackendCalls.push("api");
      return { value: { recovered: true } };
    },
  },
});
assert.deepEqual(foreignRequestIdBackendCalls, ["openai", "api"]);
assert.equal(foreignRequestIdRecovery.backend, "api");
assert.deepEqual(foreignRequestIdRecovery.value, { recovered: true });

const vectorTasks = Array.from({ length: 5 }, (_, index) => ({
  requestId: `ordinary|deck|EN|T${index + 1}`,
  videoType: "ordinary",
  supportLang: "EN",
  targetLang: `T${index + 1}`,
}));
const vectorCalls = [];
const vectorResult = await generateVectorEngineCampaignMetadataSubBatches(vectorTasks, {
  model: "gemini-test",
  callProvider: async (request) => {
    const count = request.schema.properties.items.minItems;
    const offset = vectorCalls.reduce((sum, value) => sum + value, 0);
    vectorCalls.push(count);
    return {
      items: vectorTasks.slice(offset, offset + count).map((task) => ({
        requestId: task.requestId,
        title: "Title",
        description: "Description",
        tags: ["tag"],
        hashtags: ["#tag"],
      })),
    };
  },
});
assert.deepEqual(vectorCalls, [2, 2, 1]);
assert.equal(vectorResult.providerCallCount, 3);
assert.deepEqual(vectorResult.value.items.map((item) => item.requestId), vectorTasks.map((task) => task.requestId));
assert.equal(vectorResult.batchSizeByRequestId.get(vectorTasks[0].requestId), 2);
assert.equal(vectorResult.batchSizeByRequestId.get(vectorTasks[4].requestId), 1);
await assert.rejects(() => generateVectorEngineCampaignMetadataSubBatches(vectorTasks.slice(0, 2), {
  callProvider: async () => ({ items: [response.items[0]] }),
}), /Unexpected campaign metadata requestId|response mismatch/);
await assert.rejects(() => generateVectorEngineCampaignMetadataSubBatches(vectorTasks, {
  subBatchSize: 3,
  callProvider: async () => ({ items: [] }),
}), /sub-batch size must be an integer between 1 and 2/);

const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-campaign-metadata-copy-"));
const configDir = path.join(root, "config");
const artifactDir = path.join(root, "artifacts", "route-1");
const assignment = {
  assignmentKey: "ordinary|deck|EN|DE",
  videoType: "ordinary",
  setId: "deck",
  supportLang: "EN",
  targetLang: "DE",
  publishAt: "2026-07-20T08:30:00.000Z",
  playlist: {
    ready: true,
    state: "resolved_existing",
    playlistKey: "EN__DE__ordinary-vocabulary__a1-everyday",
    youtubePlaylistId: "PL-test",
    createAllowed: false,
  },
};
fs.mkdirSync(configDir, { recursive: true });
fs.writeFileSync(path.join(configDir, "youtube-publication-campaigns.json"), `${JSON.stringify({
  schemaVersion: 1,
  campaigns: [{ campaignId: "campaign", manifestHash: "hash", assignments: [assignment] }],
}, null, 2)}\n`);
const metadata = {
  campaignId: "campaign",
  campaignManifestHash: "hash",
  publishAt: assignment.publishAt,
  scheduledPublishAt: assignment.publishAt,
  campaignPlaylist: assignment.playlist,
};
const body = `${JSON.stringify(metadata, null, 2)}\n`;
const metadataRelative = "metadata/ordinary.json";
fs.mkdirSync(path.join(artifactDir, "metadata"), { recursive: true });
fs.writeFileSync(path.join(artifactDir, metadataRelative), body);
fs.writeFileSync(path.join(artifactDir, "index.json"), `${JSON.stringify({
  campaignId: "campaign",
  manifestHash: "hash",
  routeKey: "youtube-1",
  batchSize: 10,
  assignmentCount: 1,
  entries: [{
    assignmentKey: assignment.assignmentKey,
    videoType: "ordinary",
    supportLang: "EN",
    targetLang: "DE",
    bundleKey: "",
    artifactPath: metadataRelative,
    destination: "outputs/video-generator/deck_de_en/youtube_metadata.json",
    sha256: crypto.createHash("sha256").update(body).digest("hex"),
  }],
}, null, 2)}\n`);
const reusable = loadReusableMetadataCheckpoint({
  outputRoot: artifactDir,
  campaignId: "campaign",
  manifestHash: "hash",
  routeKey: "youtube-1",
  batchSize: 10,
  taskPlans: [{ assignment }],
});
assert.equal(reusable.size, 1);
assert.equal(reusable.get(assignment.assignmentKey).sha256, crypto.createHash("sha256").update(body).digest("hex"));
assert.throws(() => loadReusableMetadataCheckpoint({
  outputRoot: artifactDir,
  campaignId: "campaign",
  manifestHash: "wrong-hash",
  routeKey: "youtube-1",
  batchSize: 10,
  taskPlans: [{ assignment }],
}), /manifest hash mismatch/);
const copy = spawnSync(process.execPath, [
  path.join(process.cwd(), "scripts/copy-youtube-campaign-metadata.mjs"),
  "--campaign-id=campaign",
  "--manifest-hash=hash",
  "--video-type=ordinary",
  "--support=EN",
  "--input-root=artifacts",
  "--registry=config/youtube-publication-campaigns.json",
  "--output=outputs/copy.json",
], { cwd: root, encoding: "utf8" });
assert.equal(copy.status, 0, copy.stderr || copy.stdout);
assert(fs.existsSync(path.join(root, "outputs/video-generator/deck_de_en/youtube_metadata.json")));
const report = JSON.parse(fs.readFileSync(path.join(root, "outputs/copy.json"), "utf8"));
assert.equal(report.copiedCount, 1);

console.log("youtube campaign metadata tests passed");
