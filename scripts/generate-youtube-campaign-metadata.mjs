#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  GEMINI_STRUCTURED_BATCH_MAX_OUTPUT_TOKENS,
  callGeminiApiJsonWithKeys,
  getDirectGeminiApiKeys,
  parseGeminiBackendChain,
  runGeminiBackendChain,
} from "./lib/gemini-structured-json.mjs";
import { callVectorEngineGeminiJson } from "./lib/vectorengine-gemini.mjs";
import {
  generateYouTubeMetadataBatch,
  normalizeYouTubeMetadata,
  validateAiMetadataLanguage,
} from "./lib/youtube-metadata.mjs";

const APPLY_CONFIRM = "GENERATE_YOUTUBE_CAMPAIGN_METADATA";
const VECTOR_CONFIRM = "USE_VECTORENGINE_METADATA";
export const CAMPAIGN_MAX_OUTPUT_TOKENS = GEMINI_STRUCTURED_BATCH_MAX_OUTPUT_TOKENS;
const ITEM_SCHEMA = {
  type: "object",
  properties: {
    requestId: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    hashtags: { type: "array", items: { type: "string" } },
    playlistTitle: { type: "string" },
    playlistDescription: { type: "string" },
  },
  required: ["requestId", "title", "description", "tags", "hashtags"],
};

function parseArgs(argv) {
  const options = {
    registry: "config/youtube-publication-campaigns.json",
    outputRoot: "outputs/youtube-campaign-metadata",
    batchSize: 5,
    rateLimitMs: 15000,
    geminiBackend: "api",
    model: process.env.GEMINI_MODEL || process.env.VECTORENGINE_GEMINI_MODEL || "gemini-3.5-flash",
    apply: false,
    resumeExisting: false,
    confirm: "",
    confirmVectorengine: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--campaign-id" || arg.startsWith("--campaign-id=")) options.campaignId = value();
    else if (arg === "--manifest-hash" || arg.startsWith("--manifest-hash=")) options.manifestHash = value();
    else if (arg === "--route-key" || arg.startsWith("--route-key=")) options.routeKey = value();
    else if (arg === "--registry" || arg.startsWith("--registry=")) options.registry = value();
    else if (arg === "--output-root" || arg.startsWith("--output-root=")) options.outputRoot = value();
    else if (arg === "--batch-size" || arg.startsWith("--batch-size=")) options.batchSize = Number(value());
    else if (arg === "--rate-limit-ms" || arg.startsWith("--rate-limit-ms=")) options.rateLimitMs = Number(value());
    else if (arg === "--gemini-backend" || arg.startsWith("--gemini-backend=")) options.geminiBackend = value();
    else if (arg === "--model" || arg.startsWith("--model=")) options.model = value();
    else if (arg === "--confirm" || arg.startsWith("--confirm=")) options.confirm = value();
    else if (arg === "--confirm-vectorengine" || arg.startsWith("--confirm-vectorengine=")) options.confirmVectorengine = value();
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--resume-existing") options.resumeExisting = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeSegment(value) {
  return String(value || "").replace(/[^a-zA-Z0-9._-]+/gu, "_").replace(/^_+|_+$/gu, "");
}

function boundedText(value, max) {
  const text = String(value || "").replace(/\s+/gu, " ").trim();
  if (Array.from(text).length <= max) return text;
  return `${Array.from(text).slice(0, Math.max(1, max - 3)).join("").trim()}...`;
}

function checkpointIndexPath(outputRoot) {
  return path.join(outputRoot, "index.json");
}

function writeMetadataCheckpoint(report, outputRoot) {
  fs.mkdirSync(outputRoot, { recursive: true });
  const indexPath = checkpointIndexPath(outputRoot);
  const snapshot = {
    ...report,
    completedAssignmentCount: report.entries.length,
    updatedAt: new Date().toISOString(),
    entries: [...report.entries].sort((left, right) => left.assignmentKey.localeCompare(right.assignmentKey)),
  };
  const temporaryPath = `${indexPath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, indexPath);
  report.updatedAt = snapshot.updatedAt;
}

function resolveCheckpointArtifact(outputRoot, artifactPath) {
  const root = path.resolve(outputRoot);
  const resolved = path.resolve(root, String(artifactPath || ""));
  if (resolved === root || !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Campaign metadata checkpoint artifact escapes output root: ${artifactPath || "missing"}`);
  }
  return resolved;
}

export function loadReusableMetadataCheckpoint({
  outputRoot,
  campaignId,
  manifestHash,
  routeKey,
  batchSize,
  taskPlans,
}) {
  const indexPath = checkpointIndexPath(outputRoot);
  if (!fs.existsSync(indexPath)) return new Map();
  const checkpoint = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  if (checkpoint.campaignId !== campaignId) throw new Error("Campaign metadata checkpoint campaign id mismatch");
  if (checkpoint.manifestHash !== manifestHash) throw new Error("Campaign metadata checkpoint manifest hash mismatch");
  if (checkpoint.routeKey !== routeKey) throw new Error("Campaign metadata checkpoint route mismatch");
  if (Number(checkpoint.batchSize) !== Number(batchSize)) throw new Error("Campaign metadata checkpoint batch size mismatch");
  if (Number(checkpoint.assignmentCount) !== taskPlans.length) throw new Error("Campaign metadata checkpoint assignment count mismatch");

  const expected = new Map(taskPlans.map((task) => [task.assignment.assignmentKey, task]));
  const reusable = new Map();
  for (const entry of checkpoint.entries || []) {
    const task = expected.get(entry.assignmentKey);
    if (!task) throw new Error(`Campaign metadata checkpoint has unexpected assignment: ${entry.assignmentKey || "missing"}`);
    if (reusable.has(entry.assignmentKey)) throw new Error(`Campaign metadata checkpoint duplicates assignment: ${entry.assignmentKey}`);
    if (entry.videoType !== task.assignment.videoType
      || entry.supportLang !== task.assignment.supportLang
      || String(entry.targetLang || "") !== String(task.assignment.targetLang || "")
      || String(entry.bundleKey || "") !== String(task.assignment.bundleKey || "")) {
      throw new Error(`Campaign metadata checkpoint assignment identity mismatch: ${entry.assignmentKey}`);
    }
    if (entry.destination !== destinationFor(task.assignment)) {
      throw new Error(`Campaign metadata checkpoint destination mismatch: ${entry.assignmentKey}`);
    }
    const artifactPath = resolveCheckpointArtifact(outputRoot, entry.artifactPath);
    if (!fs.existsSync(artifactPath)) throw new Error(`Campaign metadata checkpoint artifact is missing: ${entry.artifactPath}`);
    const body = fs.readFileSync(artifactPath, "utf8");
    if (sha256(body) !== entry.sha256) throw new Error(`Campaign metadata checkpoint checksum mismatch: ${entry.assignmentKey}`);
    const metadata = JSON.parse(body);
    if (metadata.campaignId !== campaignId || metadata.campaignManifestHash !== manifestHash) {
      throw new Error(`Campaign metadata checkpoint ownership mismatch: ${entry.assignmentKey}`);
    }
    reusable.set(entry.assignmentKey, structuredClone(entry));
  }
  return reusable;
}

function readClaimedCampaign(options) {
  if (!options.campaignId || !options.manifestHash || !options.routeKey) {
    throw new Error("--campaign-id, --manifest-hash and --route-key are required");
  }
  const registry = JSON.parse(fs.readFileSync(options.registry, "utf8"));
  const campaign = (registry.campaigns || []).find((row) => row.campaignId === options.campaignId);
  if (!campaign) throw new Error(`Campaign not found: ${options.campaignId}`);
  if (campaign.manifestHash !== options.manifestHash) throw new Error("Campaign manifest hash mismatch");
  if (campaign.status !== "claimed") throw new Error(`Campaign status must be claimed, got ${campaign.status}`);
  const assignments = (campaign.assignments || []).filter((row) => row.routeKey === options.routeKey);
  if (!assignments.length) throw new Error(`Campaign has no assignments for route ${options.routeKey}`);
  return { campaign, assignments };
}

async function prepareOrdinaryTask(assignment) {
  const [template] = await generateYouTubeMetadataBatch([{
    setId: assignment.setId,
    supportLang: assignment.supportLang,
    targetLang: assignment.targetLang,
    privacyStatus: "private",
    withGemini: false,
  }]);
  return {
    assignment,
    template,
    request: {
      requestId: assignment.assignmentKey,
      videoType: "ordinary",
      supportLang: assignment.supportLang,
      targetLang: assignment.targetLang,
      targetLanguageName: template.targetLanguageName,
      deckTitle: template.deckTitle,
      level: template.level,
      wordCount: template.wordCount,
      courseUrl: template.courseUrl,
      baseTitle: template.title,
      baseDescription: template.description,
      sampleWords: (template.tags || []).slice(-8),
    },
  };
}

function preparePolyglotTask(assignment, outputRoot) {
  const templatePath = path.join(outputRoot, ".templates", `${safeSegment(assignment.assignmentKey)}.json`);
  fs.mkdirSync(path.dirname(templatePath), { recursive: true });
  const args = [
    "scripts/generate-polyglot-youtube-metadata.mjs",
    "--set", assignment.setId,
    "--support", assignment.supportLang,
    "--bundle", assignment.bundleKey,
    "--privacy", "private",
    "--campaign-id", assignment.campaignId,
    "--campaign-manifest-hash", assignment.campaignManifestHash,
    "--output", templatePath,
    "--json",
  ];
  const result = spawnSync(process.execPath, args, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(`Polyglot template planner failed for ${assignment.assignmentKey}:\n${result.stdout}\n${result.stderr}`.trim());
  }
  const template = JSON.parse(fs.readFileSync(templatePath, "utf8"));
  return {
    assignment,
    template,
    request: {
      requestId: assignment.assignmentKey,
      videoType: "polyglot",
      supportLang: assignment.supportLang,
      targetLangs: assignment.targetLangs,
      targetLanguagesDisplay: template.targetLanguagesDisplay,
      deckTitle: template.deckTitle,
      wordCount: template.wordCount,
      courseUrl: template.courseUrl,
      bundleKey: assignment.bundleKey,
      baseTitle: template.title,
      baseDescription: template.description,
      basePlaylistTitle: template.playlistTitle,
      basePlaylistDescription: template.playlistDescription,
    },
  };
}

export function buildCampaignMetadataPrompt(tasks) {
  return [
    `Create YouTube SEO metadata for ${tasks.length} independent FlashcardsLuna vocabulary videos in one response.`,
    "Return one items[] entry for every task and preserve each requestId exactly.",
    "Write every title, description, tag set and playlist copy in that task's supportLang.",
    "Do not merge, omit or duplicate tasks.",
    "For Polyglot tasks, playlistTitle and playlistDescription are required; ordinary tasks may leave them empty.",
    "Titles must be natural, <=100 characters and not clickbait.",
    "Descriptions must be concise: 3-5 short sentences and no more than 900 Unicode characters.",
    "Descriptions must include the task courseUrl exactly once and describe vocabulary, pronunciation, repeat pauses and review.",
    "Polyglot playlistDescription must be no more than 600 Unicode characters.",
    "Do not invent prices, certificates, native teachers, fluency guarantees or exact durations.",
    "tags: 12-18 strings without #. hashtags: 3-5 strings beginning with # and containing no spaces.",
    "TASKS_JSON:",
    JSON.stringify(tasks),
    "Return exactly: {\"items\":[{\"requestId\":\"same-as-input\",\"title\":\"\",\"description\":\"\",\"tags\":[],\"hashtags\":[],\"playlistTitle\":\"\",\"playlistDescription\":\"\"}]}",
  ].join("\n");
}

function batchSchema(itemCount) {
  return {
    type: "object",
    properties: {
      items: {
        type: "array",
        minItems: itemCount,
        maxItems: itemCount,
        items: ITEM_SCHEMA,
      },
    },
    required: ["items"],
  };
}

export function validateCampaignMetadataResponse(value, tasks) {
  const expected = new Set(tasks.map((task) => task.requestId));
  const items = Array.isArray(value?.items) ? value.items : [];
  const byId = new Map();
  for (const item of items) {
    const id = String(item?.requestId || "");
    if (!expected.has(id)) throw new Error(`Unexpected campaign metadata requestId: ${id || "missing"}`);
    if (byId.has(id)) throw new Error(`Duplicate campaign metadata requestId: ${id}`);
    byId.set(id, item);
  }
  const missing = [...expected].filter((id) => !byId.has(id));
  if (items.length !== expected.size || missing.length) {
    throw new Error(`Campaign metadata response mismatch: expected=${expected.size} received=${items.length} missing=${missing.join(",") || "none"}`);
  }
  return byId;
}

async function generateBatch(tasks, options) {
  const backends = parseGeminiBackendChain(options.geminiBackend, {
    hasDirectApiKey: getDirectGeminiApiKeys().length > 0,
  });
  const taskRequests = tasks.map((task) => task.request);
  const validateValue = (value) => validateCampaignMetadataResponse(value, taskRequests);
  const request = {
    prompt: buildCampaignMetadataPrompt(taskRequests),
    schema: batchSchema(tasks.length),
    model: options.model,
    maxOutputTokens: CAMPAIGN_MAX_OUTPUT_TOKENS,
    temperature: 0.25,
    systemInstruction: `Return strict JSON for all ${tasks.length} FlashcardsLuna metadata tasks. No Markdown or omitted items.`,
    validateValue,
  };
  const result = await runGeminiBackendChain({
    backends,
    providers: {
      api: async () => callGeminiApiJsonWithKeys(request),
      vectorengine: async () => {
        const value = await callVectorEngineGeminiJson(request);
        validateValue(value);
        return { value, model: options.model };
      },
    },
  });
  return { ...result, byId: validateValue(result.value) };
}

function finalizeMetadata(task, generated, provider) {
  const source = `gemini-${provider.backend}-campaign-batch`;
  const merged = normalizeYouTubeMetadata({
    ...task.template,
    title: generated.title,
    description: generated.description,
    tags: generated.tags,
    hashtags: generated.hashtags,
    source,
    model: provider.model,
    campaignId: task.assignment.campaignId,
    campaignManifestHash: task.assignment.campaignManifestHash,
    publishAt: task.assignment.publishAt,
    scheduledPublishAt: task.assignment.publishAt,
    privacyStatus: "private",
    aiMetadata: {
      attempted: true,
      backend: provider.backend,
      backendChain: provider.backendChain,
      batchSize: provider.batchSize,
      status: "pass",
    },
  });
  merged.campaignPlaylist = structuredClone(task.assignment.playlist || {});
  merged.playlist_key = task.assignment.playlist?.playlistKey || merged.playlist_key || "";
  merged.youtubePlaylistId = task.assignment.playlist?.youtubePlaylistId || "";
  if (task.assignment.videoType === "polyglot") {
    const playlistTitle = boundedText(generated.playlistTitle || task.template.playlistTitle, 100);
    const playlistDescription = String(generated.playlistDescription || task.template.playlistDescription || "").trim().slice(0, 5000);
    merged.playlistTitle = playlistTitle;
    merged.playlistDescription = playlistDescription;
    merged.playlistTitleSource = source;
    merged.playlist = {
      ...(task.template.playlist || {}),
      title: playlistTitle,
      description: playlistDescription,
    };
  }
  const languageGate = validateAiMetadataLanguage(merged);
  if (languageGate.blockers.length) {
    throw new Error(`${task.assignment.assignmentKey}: metadata language gate failed: ${languageGate.blockers.join("; ")}`);
  }
  merged.aiMetadata.languageGate = languageGate;
  return merged;
}

function destinationFor(assignment) {
  if (assignment.videoType === "polyglot") {
    return path.join("outputs/video-generator", `${assignment.setId}_polyglot_${assignment.supportLang.toLowerCase()}`, "youtube_metadata.json");
  }
  return path.join("outputs/video-generator", `${assignment.setId}_${assignment.targetLang.toLowerCase()}_${assignment.supportLang.toLowerCase()}`, "youtube_metadata.json");
}

export async function buildCampaignMetadata(options) {
  const { campaign, assignments } = readClaimedCampaign(options);
  if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 10) {
    throw new Error("--batch-size must be an integer between 1 and 10");
  }
  if (!Number.isFinite(options.rateLimitMs) || options.rateLimitMs < 0) throw new Error("--rate-limit-ms must be non-negative");
  const backendNames = String(options.geminiBackend || "").toLowerCase().split(",").map((item) => item.trim()).filter(Boolean);
  if (backendNames.includes("vectorengine") && options.confirmVectorengine !== VECTOR_CONFIRM) {
    throw new Error(`VectorEngine requires --confirm-vectorengine=${VECTOR_CONFIRM}`);
  }
  if (options.apply && options.confirm !== APPLY_CONFIRM) throw new Error(`--apply requires --confirm=${APPLY_CONFIRM}`);

  const hydratedAssignments = assignments.map((row) => ({
    ...row,
    campaignId: campaign.campaignId,
    campaignManifestHash: campaign.manifestHash,
  }));
  const taskPlans = [];
  for (const assignment of hydratedAssignments) {
    taskPlans.push(assignment.videoType === "ordinary"
      ? await prepareOrdinaryTask(assignment)
      : preparePolyglotTask(assignment, options.outputRoot));
  }
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: options.apply ? "apply" : "read_only_plan",
    status: options.apply ? "in_progress" : "planned",
    complete: !options.apply,
    campaignId: campaign.campaignId,
    manifestHash: campaign.manifestHash,
    routeKey: options.routeKey,
    assignmentCount: taskPlans.length,
    batchSize: options.batchSize,
    batchCount: Math.ceil(taskPlans.length / options.batchSize),
    plannedProviderCalls: options.apply ? Math.ceil(taskPlans.length / options.batchSize) : 0,
    providerCalls: 0,
    attemptedBatchCount: 0,
    reusedBatchCount: 0,
    reusedAssignmentCount: 0,
    entries: [],
  };
  if (!options.apply) return report;
  const reusableEntries = options.resumeExisting
    ? loadReusableMetadataCheckpoint({
      outputRoot: options.outputRoot,
      campaignId: campaign.campaignId,
      manifestHash: campaign.manifestHash,
      routeKey: options.routeKey,
      batchSize: options.batchSize,
      taskPlans,
    })
    : new Map();
  report.resumeExisting = options.resumeExisting;
  writeMetadataCheckpoint(report, options.outputRoot);

  try {
    for (let offset = 0; offset < taskPlans.length; offset += options.batchSize) {
      const tasks = taskPlans.slice(offset, offset + options.batchSize);
      const reusableBatch = tasks.map((task) => reusableEntries.get(task.assignment.assignmentKey));
      const reusableCount = reusableBatch.filter(Boolean).length;
      if (reusableCount > 0 && reusableCount !== tasks.length) {
        throw new Error(`Campaign metadata checkpoint contains a partial batch at offset ${offset}`);
      }
      if (reusableCount === tasks.length) {
        report.entries.push(...reusableBatch);
        report.reusedBatchCount += 1;
        report.reusedAssignmentCount += tasks.length;
        writeMetadataCheckpoint(report, options.outputRoot);
        continue;
      }

      report.activeBatchIndex = Math.floor(offset / options.batchSize);
      report.attemptedBatchCount += 1;
      report.providerCalls += 1;
      writeMetadataCheckpoint(report, options.outputRoot);
      const provider = await generateBatch(tasks, options);
      for (const task of tasks) {
        const metadata = finalizeMetadata(task, provider.byId.get(task.assignment.assignmentKey), {
          backend: provider.backend,
          backendChain: backendNames,
          model: provider.model || options.model,
          batchSize: tasks.length,
        });
        const artifactPath = path.join(options.outputRoot, "metadata", `${safeSegment(task.assignment.assignmentKey)}.json`);
        fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
        const body = `${JSON.stringify(metadata, null, 2)}\n`;
        fs.writeFileSync(artifactPath, body, "utf8");
        report.entries.push({
          assignmentKey: task.assignment.assignmentKey,
          videoType: task.assignment.videoType,
          supportLang: task.assignment.supportLang,
          targetLang: task.assignment.targetLang,
          bundleKey: task.assignment.bundleKey || "",
          artifactPath: path.relative(options.outputRoot, artifactPath),
          destination: destinationFor(task.assignment),
          sha256: sha256(body),
          source: metadata.source,
        });
      }
      delete report.activeBatchIndex;
      writeMetadataCheckpoint(report, options.outputRoot);
      if (offset + options.batchSize < taskPlans.length && options.rateLimitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, options.rateLimitMs));
      }
    }
  } catch (error) {
    report.status = "failed";
    report.complete = false;
    report.error = boundedText(error?.message || error, 1200);
    report.failedBatchIndex = report.activeBatchIndex;
    delete report.activeBatchIndex;
    writeMetadataCheckpoint(report, options.outputRoot);
    throw error;
  }
  report.status = "complete";
  report.complete = true;
  delete report.error;
  delete report.failedBatchIndex;
  writeMetadataCheckpoint(report, options.outputRoot);
  return report;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(`node scripts/generate-youtube-campaign-metadata.mjs --campaign-id=<id> --manifest-hash=<hash> --route-key=youtube-1 [--apply --confirm=${APPLY_CONFIRM}]`);
    return;
  }
  const report = await buildCampaignMetadata(options);
  const summary = {
    mode: report.mode,
    campaignId: report.campaignId,
    routeKey: report.routeKey,
    assignmentCount: report.assignmentCount,
    batchCount: report.batchCount,
    plannedProviderCalls: report.plannedProviderCalls,
    providerCalls: report.providerCalls,
    reusedBatchCount: report.reusedBatchCount,
    reusedAssignmentCount: report.reusedAssignmentCount,
    outputRoot: options.outputRoot,
  };
  console.log(JSON.stringify(options.json ? report : summary, null, 2));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
