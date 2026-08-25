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
  callOpenAiWithModelFallback,
  selectOpenAiMetadataAlternateModel,
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
import { campaignTitleFallbackReasons, minimumYouTubeTitleLength } from "./lib/youtube-metadata-title-policy.mjs";

const tasks = [
  { requestId: "ordinary|deck|EN|DE", videoType: "ordinary", supportLang: "EN", targetLang: "DE" },
  { requestId: "polyglot|deck|EN|bundle|hash|full", videoType: "polyglot", supportLang: "EN", targetLangs: ["DE", "FR"] },
];
const prompt = buildCampaignMetadataPrompt(tasks);
assert.match(prompt, /2 independent FlashcardsLuna/);
assert.match(prompt, /ordinary\|deck\|EN\|DE/);
assert.match(prompt, /250-900 Unicode characters/);
assert.match(prompt, /25-100 Unicode characters/);
assert.match(prompt, /ZH, JA and KO descriptions may be 150-900 Unicode characters/);
assert.match(prompt, /fallbackTags/u);
assert.equal(CAMPAIGN_MAX_OUTPUT_TOKENS, 60000);
assert.equal(OPENAI_CAMPAIGN_MAX_OUTPUT_TOKENS, 12000);
assert.equal(DEFAULT_OPENAI_DAILY_TOKEN_LIMIT, 2_000_000);
assert.equal(DEFAULT_OPENAI_LARGE_CAMPAIGN_ASSIGNMENTS, 100);
assert.equal(selectOpenAiMetadataModel({ assignmentCount: 99, useLuna: false }), "gpt-5.6-terra");
assert.equal(selectOpenAiMetadataModel({ assignmentCount: 100, useLuna: false }), "gpt-5.6-luna");
assert.equal(selectOpenAiMetadataModel({ assignmentCount: 1, useLuna: true }), "gpt-5.6-luna");
assert.equal(selectOpenAiMetadataAlternateModel({
  selectedModel: "gpt-5.6-luna",
  primaryModel: "gpt-5.6-terra",
  fallbackModel: "gpt-5.6-luna",
}), "gpt-5.6-terra");
assert.equal(selectOpenAiMetadataAlternateModel({
  selectedModel: "gpt-5.6-terra",
  primaryModel: "gpt-5.6-terra",
  fallbackModel: "gpt-5.6-luna",
}), "gpt-5.6-luna");

const fallbackModels = [];
const fallbackMetadata = await callOpenAiWithModelFallback({
  request: { prompt: "test", schema: { type: "object" } },
  primaryModel: "gpt-5.6-terra",
  fallbackModel: "gpt-5.6-luna",
  callProvider: async ({ model }) => {
    fallbackModels.push(model);
    if (model === "gpt-5.6-terra") throw new Error("OpenAI API HTTP 503: overloaded");
    return { provider: "openai", model, value: { items: [] } };
  },
});
assert.deepEqual(fallbackModels, ["gpt-5.6-terra", "gpt-5.6-luna"]);
assert.equal(fallbackMetadata.model, "gpt-5.6-luna");

const incidentTask = {
  requestId: "ordinary|home_bathroom_essentials_a1|HU|HY",
  videoType: "ordinary",
  supportLang: "HU",
  targetLang: "HY",
};
const incidentRequest = {
  prompt: "Deck 5 metadata regression",
  schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: { requestId: { type: "string" } },
        },
      },
    },
  },
  validateValue: (value) => validateCampaignMetadataResponse(value, [incidentTask]),
};
function openAiStructuredResponse(items, model) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      id: `resp-${model}`,
      status: "completed",
      model,
      service_tier: "data_sharing_incentive",
      output: [{
        type: "message",
        content: [{ type: "output_text", text: JSON.stringify({ items }) }],
      }],
      usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
    }),
  };
}
const lunaToTerraModels = [];
const lunaToTerraResult = await callOpenAiWithModelFallback({
  request: incidentRequest,
  primaryModel: "gpt-5.6-luna",
  fallbackModel: "gpt-5.6-terra",
  callProvider: async ({ model, ...request }) => {
    lunaToTerraModels.push(model);
    const items = model === "gpt-5.6-luna"
      ? [{ requestId: "ordinary|home_bathroom_essentials_a1|HU|HY|HY" }]
      : [{ requestId: incidentTask.requestId }];
    return callOpenAiStructuredJson({
      ...request,
      apiKey: "test-key",
      fetchImpl: async () => openAiStructuredResponse(items, model),
    });
  },
});
assert.deepEqual(lunaToTerraModels, ["gpt-5.6-luna", "gpt-5.6-terra"]);
assert.equal(lunaToTerraResult.model, "gpt-5.6-terra");

const validLunaModels = [];
await callOpenAiWithModelFallback({
  request: incidentRequest,
  primaryModel: "gpt-5.6-luna",
  fallbackModel: "gpt-5.6-terra",
  callProvider: async ({ model, ...request }) => {
    validLunaModels.push(model);
    return callOpenAiStructuredJson({
      ...request,
      apiKey: "test-key",
      fetchImpl: async () => openAiStructuredResponse([{ requestId: incidentTask.requestId }], model),
    });
  },
});
assert.deepEqual(validLunaModels, ["gpt-5.6-luna"]);

const invalidBothModels = [];
await assert.rejects(() => callOpenAiWithModelFallback({
  request: incidentRequest,
  primaryModel: "gpt-5.6-luna",
  fallbackModel: "gpt-5.6-terra",
  callProvider: async ({ model, ...request }) => {
    invalidBothModels.push(model);
    return callOpenAiStructuredJson({
      ...request,
      apiKey: "test-key",
      fetchImpl: async () => openAiStructuredResponse([
        { requestId: "ordinary|home_bathroom_essentials_a1|HU|HY|HY" },
      ], model),
    });
  },
}), /Unexpected campaign metadata requestId/u);
assert.deepEqual(invalidBothModels, ["gpt-5.6-luna", "gpt-5.6-terra"]);
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

const turkishOrdinaryTask = {
  assignment: {
    assignmentKey: "ordinary|deck|TR|TA",
    supportLang: "TR",
    targetLang: "TA",
    videoType: "ordinary",
    campaignId: "campaign",
    campaignManifestHash: "hash",
    publishAt: "2026-08-13T20:30:00.000Z",
    playlist: { playlistKey: "TR__TA__ordinary", youtubePlaylistId: "PL-test" },
  },
  template: {
    setId: "deck",
    supportLang: "TR",
    targetLang: "TA",
    targetLanguageName: "Tamilce",
    deckTitle: "Küçük mutfak aletleri",
    title: "Tamilce A1: Küçük mutfak aletleri | 32 kelime",
    description: "Tamilce küçük mutfak aletleri kelimelerini FlashcardsLuna ile çalışın. Kelimeleri dinleyin, telaffuzu takip edin ve verilen aralarda yüksek sesle tekrar edin. Dersin sonunda kısa bir tekrar ve mini test ile öğrendiklerinizi kontrol edin. Kartları düzenli olarak gözden geçirmek için https://flashcardsluna.com adresini kullanın.",
    tags: ["Tamilce", "mutfak kelimeleri", "telaffuz", "kelime çalışması", "FlashcardsLuna"],
    hashtags: ["#FlashcardsLuna", "#Tamilce", "#Kelime"],
  },
};
const turkishMetadata = finalizeCampaignMetadata(turkishOrdinaryTask, {
  title: "타밀어 초급: 작은 주방 도구 단어 32개",
  description: turkishOrdinaryTask.template.description,
  tags: turkishOrdinaryTask.template.tags,
  hashtags: turkishOrdinaryTask.template.hashtags,
}, { backend: "openai", backendChain: ["openai"], model: "gpt-test", batchSize: 5 });
assert.equal(turkishMetadata.title, turkishOrdinaryTask.template.title);
assert.equal(turkishMetadata.aiMetadata.titleFallbackToTemplate, true);
assert.deepEqual(turkishMetadata.aiMetadata.titleFallbackReasons, [
  "below_search_intent_minimum",
  "missing_target_language_name",
  "missing_deck_title",
]);
assert.equal(minimumYouTubeTitleLength("TR"), 25);
assert.equal(minimumYouTubeTitleLength("JA"), 15);
assert.deepEqual(campaignTitleFallbackReasons({ title: "x".repeat(24), supportLang: "TR" }), ["below_search_intent_minimum"]);
assert.deepEqual(campaignTitleFallbackReasons({ title: "日".repeat(14), supportLang: "JA" }), ["below_search_intent_minimum"]);
assert.deepEqual(campaignTitleFallbackReasons({ title: "日".repeat(15), supportLang: "JA" }), []);
assert.deepEqual(campaignTitleFallbackReasons({ title: "x".repeat(101), supportLang: "TR" }), ["above_youtube_maximum"]);
const validTurkishTitle = "Tamilce A1: Küçük mutfak aletleri | 32 kelime";
assert.deepEqual(campaignTitleFallbackReasons({
  title: validTurkishTitle,
  supportLang: "TR",
  videoType: "ordinary",
  targetLanguageName: "Tamilce",
  deckTitle: "Küçük mutfak aletleri",
}), []);
assert.equal(DEFAULT_VECTORENGINE_CAMPAIGN_SUB_BATCH_SIZE, 2);
const campaignWorkflow = fs.readFileSync(".github/workflows/youtube-publication-campaign.yml", "utf8");
assert.match(
  campaignWorkflow,
  /  metadata:\n[\s\S]*?strategy:\n\s+fail-fast: false[\s\S]*?\n\s+max-parallel: 4\n\s+matrix:/u,
  "campaign metadata routes must allow four bounded concurrent provider jobs",
);
assert.match(
  campaignWorkflow,
  /  routes:\n[\s\S]*?strategy:\n\s+fail-fast: false\n[\s\S]*?max-parallel: 8\n\s+matrix:\n\s+route_key: \[youtube-1, youtube-2, youtube-3, youtube-4, youtube-5, youtube-6, youtube-7, youtube-8\][\s\S]*?video_type: combined/u,
  "all eight project queues must start together and own both publication phases",
);
const routeWorkerWorkflow = fs.readFileSync(".github/workflows/youtube-campaign-route-publish.yml", "utf8");
assert.match(
  routeWorkerWorkflow,
  /permissions:\n\s+actions: read\n\s+contents: write/u,
  "the nested route workflow must preserve the permissions required by its publication workflows",
);
assert.match(routeWorkerWorkflow, /  ordinary:\n[\s\S]*?max-parallel: 5\n\s+matrix:/u, "each ordinary project queue must run five physical channels concurrently");
assert.match(routeWorkerWorkflow, /  polyglot:\n[\s\S]*?max-parallel: 5\n\s+matrix:/u, "each Polyglot project queue must run five physical channels concurrently");
assert.match(routeWorkerWorkflow, /  polyglot:\n[\s\S]*?needs: \[prepare, ordinary\]/u, "each project must start Polyglot after its own ordinary queue");
assert.match(routeWorkerWorkflow, /inputs\.video_type == 'polyglot' \|\| inputs\.video_type == 'combined'/u, "combined route publication must include Polyglot");
assert.doesNotMatch(campaignWorkflow, /needs: \[preflight, metadata, ordinary\]/u, "Polyglot must not wait for the global ordinary matrix");
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

// Two Polyglot bundles can share one physical support channel. Their
// campaign metadata destinations must remain distinct instead of silently
// overwriting the first bundle during the copy step.
const polyAssignments = [
  {
    assignmentKey: "polyglot|deck|SL|romance_core|romance-hash|short_unverified",
    videoType: "polyglot",
    setId: "deck",
    supportLang: "SL",
    bundleKey: "romance_core",
    targetLangs: ["ES", "FR", "IT", "PT"],
    publishAt: "2026-07-20T09:30:00.000Z",
    playlist: {
      ready: true,
      state: "resolved_existing",
      playlistKey: "POLYGLOT__SL__ROMANCE__short_unverified",
      youtubePlaylistId: "PL-romance",
      createAllowed: false,
    },
  },
  {
    assignmentKey: "polyglot|deck|SL|east_asia_core|east-hash|short_unverified",
    videoType: "polyglot",
    setId: "deck",
    supportLang: "SL",
    bundleKey: "east_asia_core",
    targetLangs: ["ZH", "JA", "KO"],
    publishAt: "2026-07-20T12:30:00.000Z",
    playlist: {
      ready: true,
      state: "resolved_existing",
      playlistKey: "POLYGLOT__SL__EAST_ASIA__short_unverified",
      youtubePlaylistId: "PL-east-asia",
      createAllowed: false,
    },
  },
];
const campaignWithPolyglot = JSON.parse(fs.readFileSync(path.join(configDir, "youtube-publication-campaigns.json"), "utf8"));
campaignWithPolyglot.campaigns[0].assignments.push(...polyAssignments);
fs.writeFileSync(path.join(configDir, "youtube-publication-campaigns.json"), `${JSON.stringify(campaignWithPolyglot, null, 2)}\n`);
const polyArtifactDir = path.join(root, "artifacts", "route-2");
fs.mkdirSync(path.join(polyArtifactDir, "metadata"), { recursive: true });
const polyEntries = polyAssignments.map((polyAssignment) => {
  const metadataRelativePath = `metadata/${polyAssignment.bundleKey}.json`;
  const polyMetadata = {
    videoType: "polyglot",
    campaignId: "campaign",
    campaignManifestHash: "hash",
    publishAt: polyAssignment.publishAt,
    scheduledPublishAt: polyAssignment.publishAt,
    bundleKey: polyAssignment.bundleKey,
    campaignPlaylist: polyAssignment.playlist,
  };
  const polyBody = `${JSON.stringify(polyMetadata, null, 2)}\n`;
  fs.writeFileSync(path.join(polyArtifactDir, metadataRelativePath), polyBody);
  return {
    assignmentKey: polyAssignment.assignmentKey,
    videoType: "polyglot",
    supportLang: polyAssignment.supportLang,
    bundleKey: polyAssignment.bundleKey,
    artifactPath: metadataRelativePath,
    destination: `outputs/video-generator/deck_polyglot_sl_${polyAssignment.bundleKey}/youtube_metadata.json`,
    sha256: crypto.createHash("sha256").update(polyBody).digest("hex"),
  };
});
fs.writeFileSync(path.join(polyArtifactDir, "index.json"), `${JSON.stringify({
  campaignId: "campaign",
  manifestHash: "hash",
  routeKey: "youtube-2",
  entries: polyEntries,
}, null, 2)}\n`);
const polyCopy = spawnSync(process.execPath, [
  path.join(process.cwd(), "scripts/copy-youtube-campaign-metadata.mjs"),
  "--campaign-id=campaign",
  "--manifest-hash=hash",
  "--video-type=polyglot",
  "--support=SL",
  "--input-root=artifacts",
  "--registry=config/youtube-publication-campaigns.json",
  "--output=outputs/poly-copy.json",
], { cwd: root, encoding: "utf8" });
assert.equal(polyCopy.status, 0, polyCopy.stderr || polyCopy.stdout);
assert(fs.existsSync(path.join(root, "outputs/video-generator/deck_polyglot_sl_romance_core/youtube_metadata.json")));
assert(fs.existsSync(path.join(root, "outputs/video-generator/deck_polyglot_sl_east_asia_core/youtube_metadata.json")));
const polyReport = JSON.parse(fs.readFileSync(path.join(root, "outputs/poly-copy.json"), "utf8"));
assert.equal(polyReport.copiedCount, 2);

console.log("youtube campaign metadata tests passed");
