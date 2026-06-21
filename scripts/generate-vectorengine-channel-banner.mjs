#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL = "gpt-image-2";
const DEFAULT_SIZE = "1536x1024";
const CHANNEL_COPY_PATH = path.resolve("config/youtube-channel-banner-copy.json");

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
    size: DEFAULT_SIZE,
    code: "en",
    outDir: null,
    mode: "composite",
    confirmSpend: false,
    slug: "vectorengine-gpt-image-2-v1"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      if (arg.includes("=")) return arg.split("=").slice(1).join("=");
      index += 1;
      return argv[index];
    };

    if (arg === "--env-file" || arg.startsWith("--env-file=")) args.envFiles.push(readValue());
    else if (arg === "--code" || arg.startsWith("--code=")) args.code = readValue().toLowerCase();
    else if (arg === "--model" || arg.startsWith("--model=")) args.model = readValue();
    else if (arg === "--size" || arg.startsWith("--size=")) args.size = readValue();
    else if (arg === "--out-dir" || arg.startsWith("--out-dir=")) args.outDir = readValue();
    else if (arg === "--mode" || arg.startsWith("--mode=")) args.mode = readValue();
    else if (arg === "--slug" || arg.startsWith("--slug=")) args.slug = readValue();
    else if (arg === "--confirm-spend") args.confirmSpend = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function printHelp() {
  console.log(`Generate one VectorEngine-backed YouTube channel banner.

Usage:
  node scripts/generate-vectorengine-channel-banner.mjs --confirm-spend
  node scripts/generate-vectorengine-channel-banner.mjs --confirm-spend --code=it --slug=vectorengine-gpt-image-2-test-v1
  node scripts/generate-vectorengine-channel-banner.mjs --confirm-spend --code=it --mode=full-render --slug=vectorengine-gpt-image-2-full-v1

Env:
  VECTORENGINE_API_KEY or VECTOR_ENGINE_API_KEY
  VECTORENGINE_BASE_URL optional, defaults to ${DEFAULT_BASE_URL}

Safety:
  Refuses to call VectorEngine without --confirm-spend.
  Never prints the API key.`);
}

function getApiKey() {
  const keyName = process.env.VECTORENGINE_API_KEY
    ? "VECTORENGINE_API_KEY"
    : "VECTOR_ENGINE_API_KEY";
  const apiKey = process.env.VECTORENGINE_API_KEY || process.env.VECTOR_ENGINE_API_KEY || "";
  return { keyName, apiKey };
}

function loadChannelCopy() {
  return JSON.parse(fs.readFileSync(CHANNEL_COPY_PATH, "utf8"));
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/gu, "").replace(/\.\d+Z$/u, "Z");
}

async function callVectorEngineImage({ prompt, model, size, apiKey }) {
  const baseUrl = String(process.env.VECTORENGINE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/u, "");
  const response = await fetch(`${baseUrl}/v1/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      n: 1
    })
  });
  const bodyText = await response.text();
  if (!response.ok) {
    let message = bodyText.slice(0, 800);
    try {
      const data = JSON.parse(bodyText);
      message = data.error?.message || data.message || message;
    } catch {
      // keep bounded raw text
    }
    throw new Error(`VectorEngine image HTTP ${response.status}: ${message}`);
  }
  const data = JSON.parse(bodyText);
  const first = data.data?.[0];
  if (!first) throw new Error(`VectorEngine image response missing data[0]: ${bodyText.slice(0, 500)}`);
  if (first.b64_json) return Buffer.from(first.b64_json, "base64");
  if (first.url) {
    const imageResponse = await fetch(first.url);
    if (!imageResponse.ok) throw new Error(`VectorEngine image URL fetch HTTP ${imageResponse.status}`);
    return Buffer.from(await imageResponse.arrayBuffer());
  }
  throw new Error(`VectorEngine image response has neither b64_json nor url: ${JSON.stringify(first).slice(0, 500)}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.confirmSpend) {
    throw new Error("Refusing to call VectorEngine because this spends API credits. Re-run with --confirm-spend.");
  }
  if (!["composite", "full-render"].includes(args.mode)) {
    throw new Error(`Unsupported mode "${args.mode}". Use composite or full-render.`);
  }
  const channelCopy = loadChannelCopy();
  const copy = channelCopy[args.code];
  if (!copy) {
    throw new Error(`Unsupported channel code "${args.code}". Add localized copy to ${path.relative(process.cwd(), CHANNEL_COPY_PATH)} first.`);
  }

  const loadedEnvFiles = [];
  for (const envFile of args.envFiles) {
    const resolved = path.resolve(envFile);
    if (loadDotEnv(resolved)) loadedEnvFiles.push(path.relative(process.cwd(), resolved));
  }
  const { keyName, apiKey } = getApiKey();
  if (!apiKey) throw new Error("Missing VectorEngine key. Set VECTORENGINE_API_KEY or VECTOR_ENGINE_API_KEY.");

  const outDir = path.resolve(args.outDir || `outputs/youtube-channel-assets/${args.code}`);
  await fsp.mkdir(outDir, { recursive: true });

  const prompt = args.mode === "full-render"
    ? [
      "Create one complete premium YouTube channel banner for LunaCards. Do not leave empty space for later editing.",
      "The final artwork must already include all visible brand text and design elements as one coherent rendered image.",
      "Target composition: ultra-wide YouTube channel header, light modern SaaS/product UI, matching flashcardsluna.com: pale #f4f7f9 background, white rounded flashcard/course tiles, soft blue accents, deep navy brand text, subtle violet highlights, polished premium educational feel.",
      "YouTube safety: all important content must be compact and centered vertically. Imagine only a narrow horizontal strip through the exact middle will be visible. Keep every letter, logo, URL, and important card inside the middle 40% of the image height, with large empty padding above and below. Do not make the brand text huge.",
      "Scale rule: the whole center brand lockup should occupy about one third of the image height, not more. Leave generous top and bottom whitespace.",
      "Center text must be exact, readable, and large:",
      "LunaCards",
      copy.headline,
      copy.subline,
      "flashcardsluna.com",
      "Use no other words, letters, labels, URLs, signatures, watermarks, or random text anywhere.",
      "Draw a small LunaCards-style blue flashcard logo above the word LunaCards: blue card stack, yellow crescent moon, tiny black cat ears. It does not need to be an exact imported logo, but it must be clean and premium.",
      "Left and right sides: rich website-like grids of small rounded flashcard/course tiles with non-text icons only: globe, books, notebook, headphones, microscope flask, camera, landscape card, pencil, plant, moon card, quiz card. Fill the full wide header so it never looks like a small centered image.",
      "Keep all exact text inside the central safe area with generous margins. The full-width desktop crop should show side tiles across both edges and a clean center.",
      "Avoid dark backgrounds, neon, busy collage, stock photo look, people, animals except the tiny cat-ear logo motif, and heavy borders."
    ].join("\n")
    : [
      "Create a premium YouTube channel banner background artwork for LunaCards, an educational flashcard learning brand.",
      "Landscape 3:2 composition that will be assembled into a 16:9 YouTube banner.",
      "Style: light modern SaaS/product UI, similar to flashcardsluna.com: pale #f4f7f9 background, clean white rounded course cards, soft blue accents, deep navy details, subtle violet accent, polished premium feel.",
      "Content: an elegant flashcard library and learning dashboard. Put many small white flashcard tiles and course tiles on both the left and right sides, arranged in neat grids like the LunaCards website. Include abstract learning icons inside tiles: globe, books, notebook, headphones, microscope flask, camera, landscape card, pencil, plant, moon card, quiz card.",
      "The side panels must fill the full desktop-width header, not look like a small centered image. Left and right side areas should feel rich and detailed, with at least 14-20 small tiles total.",
      "Composition rule: leave a wide clean bright center area for later text/logo overlay. Important detailed objects should sit outside the central safe area and remain visible in a very wide YouTube desktop crop.",
      "Critical: do NOT include any readable text, letters, URLs, brand names, logos, signatures, borders, frames, watermarks, or UI labels. No words anywhere.",
      "Avoid dark backgrounds, neon, busy collages, stock photo look, giant objects, people, animals, and extra decorative frames. No gray empty YouTube-like margins."
    ].join("\n");

  const rawPath = path.join(outDir, `lunacards-${args.code}-channel-banner-${args.slug}-raw-${args.size}.png`);
  const startedAt = new Date().toISOString();
  const imageBytes = await callVectorEngineImage({
    prompt,
    model: args.model,
    size: args.size,
    apiKey
  });
  await fsp.writeFile(rawPath, imageBytes);

  const postprocessScript = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    args.mode === "full-render" ? "fit-vectorengine-channel-banner.py" : "compose-vectorengine-channel-banner.py"
  );
  const postprocessArgs = [
    postprocessScript,
    "--raw", rawPath,
    "--out-dir", outDir,
    "--slug", args.slug,
    "--code", args.code
  ];
  if (args.mode !== "full-render") {
    postprocessArgs.push("--headline", copy.headline, "--subline", copy.subline);
  }
  const compose = spawnSync("python3", postprocessArgs, {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  if (compose.status !== 0) {
    throw new Error(`Compose failed:\n${compose.stdout}\n${compose.stderr}`);
  }
  const composeResult = JSON.parse(compose.stdout);

  const metadataPath = path.join(outDir, `lunacards-${args.code}-channel-banner-${args.slug}-metadata.json`);
  await fsp.writeFile(metadataPath, `${JSON.stringify({
    status: "ok",
    code: args.code,
    supportLanguage: copy.languageName,
    provider: "vectorengine",
    model: args.model,
    size: args.size,
    mode: args.mode,
    keyName,
    loadedEnvFiles,
    prompt,
    localizedCopy: {
      brand: "LunaCards",
      headline: copy.headline,
      subline: copy.subline,
      url: "flashcardsluna.com"
    },
    rawPath,
    ...composeResult,
    youtubeSpec: {
      recommendedUploadPx: "2560x1440",
      aspectRatio: "16:9",
      officialMinimumUploadPx: "2048x1152",
      officialSafeAreaAtMinimumPx: "1235x338",
      scaledSafeAreaFor2560PxApprox: "1544x423",
      projectSafeAreaPreviewPx: "1546x423",
      maxFileSize: "6 MB"
    },
    startedAt,
    finishedAt: new Date().toISOString()
  }, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    status: "ok",
    provider: "vectorengine",
    code: args.code,
    supportLanguage: copy.languageName,
    mode: args.mode,
    model: args.model,
    size: args.size,
    keyName,
    rawPath,
    metadataPath,
    ...composeResult
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
