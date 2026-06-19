#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { callVectorEngineGeminiJson, getVectorEngineGeminiKey } from "./lib/vectorengine-gemini.mjs";

const DEFAULT_MODEL = process.env.VECTORENGINE_GEMINI_MODEL || "gemini-3.5-flash";
const DEFAULT_OUTPUT_DIR = "outputs/tmp/vectorengine-gemini-smoke";

function loadDotEnv(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return false;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/u);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [rawKey, ...rawValueParts] = line.split("=");
    const key = rawKey.trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key) || process.env[key]) continue;
    let value = rawValueParts.join("=").trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
  return true;
}

function parseArgs(argv) {
  const args = {
    envFiles: [".env", ".env.local", ".env.vectorengine.local"],
    model: DEFAULT_MODEL,
    outDir: DEFAULT_OUTPUT_DIR,
    confirmSpend: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      if (arg.includes("=")) return arg.split("=").slice(1).join("=");
      index += 1;
      return argv[index];
    };

    if (arg === "--env-file" || arg.startsWith("--env-file=")) args.envFiles.push(readValue());
    else if (arg === "--model" || arg.startsWith("--model=")) args.model = readValue();
    else if (arg === "--out-dir" || arg.startsWith("--out-dir=")) args.outDir = readValue();
    else if (arg === "--confirm-spend") args.confirmSpend = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function printHelp() {
  console.log(`VectorEngine Gemini smoke check

Usage:
  node scripts/check-vectorengine-gemini.mjs --confirm-spend
  node scripts/check-vectorengine-gemini.mjs --env-file /path/to/.env --confirm-spend

Env:
  VECTORENGINE_API_KEY or VECTOR_ENGINE_API_KEY
  VECTORENGINE_BASE_URL optional, defaults to https://api.vectorengine.ai
  VECTORENGINE_GEMINI_MODEL optional, defaults to ${DEFAULT_MODEL}

Safety:
  The check refuses to call VectorEngine without --confirm-spend.
  It prints the env key name only, never the key value.`);
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/gu, "").replace(/\.\d+Z$/u, "Z");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.confirmSpend) {
    throw new Error("Refusing to call VectorEngine because this can spend API credits. Re-run with --confirm-spend.");
  }

  const loadedEnvFiles = [];
  for (const envFile of args.envFiles) {
    const resolved = path.resolve(envFile);
    if (loadDotEnv(resolved)) loadedEnvFiles.push(path.relative(process.cwd(), resolved));
  }

  const { apiKey, keyName } = getVectorEngineGeminiKey();
  if (!apiKey) {
    throw new Error("Missing VectorEngine key. Set VECTORENGINE_API_KEY or VECTOR_ENGINE_API_KEY.");
  }

  const schema = {
    type: "object",
    properties: {
      status: { type: "string" },
      provider: { type: "string" },
      modelFamily: { type: "string" }
    },
    required: ["status", "provider", "modelFamily"]
  };
  const startedAt = new Date().toISOString();
  const result = await callVectorEngineGeminiJson({
    model: args.model,
    schema,
    maxOutputTokens: 256,
    temperature: 0,
    systemInstruction: "Return strict JSON only. Do not use Markdown.",
    prompt: [
      "Return a tiny JSON health check for this API connection.",
      'Use exactly: {"status":"ok","provider":"vectorengine","modelFamily":"gemini"}'
    ].join("\n")
  });

  if (result.status !== "ok" || result.provider !== "vectorengine" || result.modelFamily !== "gemini") {
    throw new Error(`Unexpected VectorEngine Gemini smoke response: ${JSON.stringify(result)}`);
  }

  fs.mkdirSync(args.outDir, { recursive: true });
  const outputPath = path.join(args.outDir, `vectorengine-gemini-smoke-${timestamp()}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify({
    status: "ok",
    provider: "vectorengine",
    backend: "gemini",
    model: args.model,
    keyName,
    loadedEnvFiles,
    startedAt,
    finishedAt: new Date().toISOString(),
    result
  }, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    status: "ok",
    backend: "vectorengine-gemini",
    model: args.model,
    keyName,
    outputPath
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
