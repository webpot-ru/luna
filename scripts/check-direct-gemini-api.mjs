#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const DEFAULT_OUTPUT_DIR = "outputs/tmp/direct-gemini-api-smoke";
const DEFAULT_KEY_NAMES = ["GEMINI_API_KEY", "GEMINI_API_KEY_2"];

function cleanText(value) {
  return String(value || "").replace(/\s+/gu, " ").trim();
}

function boundedError(error) {
  return cleanText(error?.message || String(error || "unknown Gemini API error")).slice(0, 800);
}

function maskSecretInText(value, secret, label) {
  let text = String(value || "");
  if (!secret) return text;
  for (const needle of [secret, encodeURIComponent(secret)]) {
    if (needle) text = text.split(needle).join(`[${label}]`);
  }
  return text;
}

function parseArgs(argv) {
  const args = {
    keyNames: DEFAULT_KEY_NAMES,
    model: DEFAULT_MODEL,
    outDir: DEFAULT_OUTPUT_DIR,
    confirmSpend: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      if (arg.includes("=")) return arg.split("=").slice(1).join("=");
      index += 1;
      return argv[index];
    };

    if (arg === "--key-names" || arg.startsWith("--key-names=")) {
      args.keyNames = readValue().split(",").map((item) => item.trim()).filter(Boolean);
    } else if (arg === "--model" || arg.startsWith("--model=")) {
      args.model = readValue();
    } else if (arg === "--out-dir" || arg.startsWith("--out-dir=")) {
      args.outDir = readValue();
    } else if (arg === "--confirm-spend") {
      args.confirmSpend = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Direct Google Gemini API smoke check

Usage:
  node scripts/check-direct-gemini-api.mjs --confirm-spend
  node scripts/check-direct-gemini-api.mjs --key-names GEMINI_API_KEY,GEMINI_API_KEY_2 --confirm-spend

Env:
  GEMINI_API_KEY and GEMINI_API_KEY_2 by default
  GEMINI_MODEL optional, defaults to ${DEFAULT_MODEL}

Safety:
  The check refuses to call Gemini without --confirm-spend.
  It makes one tiny generateContent request per configured key name.
  It prints key names only, never key values.`);
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/gu, "").replace(/\.\d+Z$/u, "Z");
}

function parseGeminiTextResponse(data) {
  const candidates = [];
  const visit = (value, depth = 0) => {
    if (depth > 10 || value == null) return;
    if (typeof value === "string") {
      candidates.push(value.trim());
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    if (typeof value === "object") {
      for (const item of Object.values(value)) visit(item, depth + 1);
    }
  };
  visit(data?.output_text);
  visit(data?.outputText);
  visit(data?.text);
  visit(data?.steps);
  visit(data?.output);
  visit(data?.response);
  for (const candidate of candidates) {
    if (!candidate.includes("{")) continue;
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end <= start) continue;
    const text = candidate.slice(start, end + 1);
    JSON.parse(text);
    return text;
  }
  throw new Error(`Gemini returned no parseable JSON text: ${JSON.stringify(data).slice(0, 500)}`);
}

async function checkKey({ keyName, apiKey, model }) {
  const startedAt = new Date().toISOString();
  const start = Date.now();
  const schema = {
    type: "object",
    properties: {
      status: { type: "string" },
      provider: { type: "string" },
      modelFamily: { type: "string" }
    },
    required: ["status", "provider", "modelFamily"]
  };
  const url = "https://generativelanguage.googleapis.com/v1beta/interactions";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model,
        input: [
          "Return a tiny JSON health check for this direct Google Gemini API connection.",
          'Use exactly: {"status":"ok","provider":"google","modelFamily":"gemini"}'
        ].join("\n"),
        generation_config: {
          temperature: 0,
          max_output_tokens: 1024,
          thinking_level: "low"
        },
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema
        }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Gemini API HTTP ${response.status}: ${JSON.stringify(data).slice(0, 800)}`);
    }
    const result = parseGeminiTextResponse(data);
    const ok = result.status === "ok" && result.provider === "google" && result.modelFamily === "gemini";
    return {
      keyName,
      configured: true,
      status: ok ? "ok" : "unexpected_response",
      model,
      startedAt,
      finishedAt: new Date().toISOString(),
      elapsedMs: Date.now() - start,
      result,
    };
  } catch (error) {
    return {
      keyName,
      configured: true,
      status: "failed",
      model,
      startedAt,
      finishedAt: new Date().toISOString(),
      elapsedMs: Date.now() - start,
      error: maskSecretInText(boundedError(error), apiKey, keyName),
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.confirmSpend) {
    throw new Error("Refusing to call Gemini because this can spend API usage. Re-run with --confirm-spend.");
  }
  if (!args.keyNames.length) {
    throw new Error("Expected at least one key name.");
  }

  const results = [];
  for (const keyName of args.keyNames) {
    const apiKey = String(process.env[keyName] || "").trim();
    if (!apiKey) {
      results.push({
        keyName,
        configured: false,
        status: "missing",
        model: args.model,
      });
      continue;
    }
    results.push(await checkKey({ keyName, apiKey, model: args.model }));
  }

  const status = results.every((item) => item.status === "ok") ? "ok" : "failed";
  fs.mkdirSync(args.outDir, { recursive: true });
  const outputPath = path.join(args.outDir, `direct-gemini-api-smoke-${timestamp()}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify({
    status,
    backend: "direct-google-gemini-api",
    model: args.model,
    keyNames: args.keyNames,
    generatedAt: new Date().toISOString(),
    requestCount: results.filter((item) => item.configured).length,
    results,
  }, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    status,
    backend: "direct-google-gemini-api",
    model: args.model,
    outputPath,
    results: results.map((item) => ({
      keyName: item.keyName,
      configured: item.configured,
      status: item.status,
      elapsedMs: item.elapsedMs,
      error: item.error,
    })),
  }, null, 2));

  if (status !== "ok") process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
