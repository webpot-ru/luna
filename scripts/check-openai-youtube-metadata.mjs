#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { callOpenAiStructuredJson } from "./lib/openai-structured-json.mjs";

export const OPENAI_METADATA_CANARY_CONFIRM = "USE_OPENAI_METADATA";
export const OPENAI_METADATA_CANARY_TASKS = [
  { requestId: "ordinary|canary|EN|NO", videoType: "ordinary", supportLang: "EN", targetLang: "NO" },
  { requestId: "polyglot|canary|ES-419|romance_core", videoType: "polyglot", supportLang: "ES-419", targetLangs: ["EN", "FR", "IT", "PT-BR"] },
];

const CANARY_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      minItems: OPENAI_METADATA_CANARY_TASKS.length,
      maxItems: OPENAI_METADATA_CANARY_TASKS.length,
      items: {
        type: "object",
        properties: {
          requestId: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          hashtags: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

function parseArgs(argv) {
  const options = {
    confirm: "",
    output: "outputs/openai-youtube-metadata-canary/report.json",
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--confirm" || arg.startsWith("--confirm=")) options.confirm = value();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    `  node scripts/check-openai-youtube-metadata.mjs --confirm=${OPENAI_METADATA_CANARY_CONFIRM}`,
    "",
    "Runs exactly one OpenAI Responses request for two synthetic YouTube metadata tasks.",
    "It cannot render video, generate TTS, reserve calendar slots or write to YouTube.",
  ].join("\n");
}

function buildPrompt() {
  return [
    "Create concise YouTube metadata for exactly two independent FlashcardsLuna language-learning videos.",
    "Return every requestId exactly once and no extra requestIds.",
    "Titles must be <=100 characters. Descriptions must be useful, natural and 300-900 characters.",
    "Tags must contain 6-15 plain strings. Hashtags must contain 3-5 strings beginning with #.",
    "Do not mention prices, subscriptions, certificates, guarantees or native teachers.",
    "Tasks:",
    ...OPENAI_METADATA_CANARY_TASKS.map((task) => JSON.stringify(task)),
  ].join("\n");
}

export function validateCanaryPayload(value, tasks = OPENAI_METADATA_CANARY_TASKS) {
  if (!Array.isArray(value?.items)) throw new Error("Canary response items must be an array.");
  const expected = tasks.map((task) => task.requestId).sort();
  const received = value.items.map((item) => String(item?.requestId || "")).sort();
  if (JSON.stringify(received) !== JSON.stringify(expected)) {
    throw new Error(`Canary requestId mismatch: expected=${expected.join(",")}; received=${received.join(",")}`);
  }
  for (const item of value.items) {
    if (!String(item.title || "").trim() || Array.from(item.title).length > 100) {
      throw new Error(`Invalid canary title for ${item.requestId}`);
    }
    if (Array.from(String(item.description || "")).length < 100) {
      throw new Error(`Canary description is too short for ${item.requestId}`);
    }
    if (!Array.isArray(item.tags) || item.tags.length < 3) throw new Error(`Invalid canary tags for ${item.requestId}`);
    if (!Array.isArray(item.hashtags) || item.hashtags.some((tag) => !String(tag).startsWith("#"))) {
      throw new Error(`Invalid canary hashtags for ${item.requestId}`);
    }
  }
  return value;
}

export async function runCanary({ output, callProvider = callOpenAiStructuredJson } = {}) {
  const result = await callProvider({
    prompt: buildPrompt(),
    schema: CANARY_SCHEMA,
    model: process.env.OPENAI_METADATA_MODEL || "gpt-5.4-mini-2026-03-17",
    serviceTier: process.env.OPENAI_SERVICE_TIER || "auto",
    maxOutputTokens: 4000,
    systemInstruction: "Return strict JSON for the two supplied YouTube metadata tasks. No Markdown or omitted items.",
    validateValue: validateCanaryPayload,
  });
  const report = {
    status: "ok",
    generatedAt: new Date().toISOString(),
    requestCount: 1,
    taskCount: OPENAI_METADATA_CANARY_TASKS.length,
    provider: "openai",
    model: result.model,
    serviceTier: result.serviceTier,
    responseId: result.responseId,
    usage: result.usage,
    items: result.value.items,
  };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (options.confirm !== OPENAI_METADATA_CANARY_CONFIRM) {
    throw new Error(`OpenAI canary requires --confirm=${OPENAI_METADATA_CANARY_CONFIRM}`);
  }
  const report = await runCanary({ output: path.resolve(options.output) });
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
