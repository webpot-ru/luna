#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_BASE_URL = "https://api.vectorengine.ai";
const DEFAULT_MODEL = "gpt-image-2";
const DEFAULT_SIZE = "1536x864";
const DEFAULT_TIMEOUT_MS = 420000;
const RAW_SLUG = "v1-site-ui-vectorengine-full-v1";
const SOURCE_SLUG = "v1-site-ui";
const FINAL_SLUG = "v1-site-ui-center-v9-wide-reference-v1";
const BRAND_NAME = "FlashcardsLuna";
const ACCEPTED_FINAL_OVERRIDES = new Map([
  ["en", "outputs/youtube-channel-assets/en/lunacards-en-channel-banner-youtube-2560x1440-v8-center-v9-wide-reference-v1.jpg"],
]);
const COLLAPSED_VARIANTS = new Map([
  ["EN-GB", "EN"],
  ["ES-419", "ES"],
  ["PT-BR", "PT"],
]);

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function resolveProjectPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(resolveProjectPath(filePath), "utf8"));
}

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
  const options = {
    envFiles: [".env", ".env.local", ".env.vectorengine.local"],
    languageOrder: "config/language-order.json",
    copyConfig: "config/youtube-channel-banner-copy.json",
    model: DEFAULT_MODEL,
    size: DEFAULT_SIZE,
    rawSlug: RAW_SLUG,
    sourceSlug: SOURCE_SLUG,
    finalSlug: FINAL_SLUG,
    codes: [],
    dryRun: false,
    confirmSpend: false,
    skipExisting: true,
    regenerateRaw: false,
    regenerateSource: false,
    skipRefit: false,
    limit: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      if (arg.includes("=")) return arg.split("=").slice(1).join("=");
      index += 1;
      return argv[index];
    };

    if (arg === "--env-file" || arg.startsWith("--env-file=")) options.envFiles.push(readValue());
    else if (arg === "--language-order" || arg.startsWith("--language-order=")) options.languageOrder = readValue();
    else if (arg === "--copy-config" || arg.startsWith("--copy-config=")) options.copyConfig = readValue();
    else if (arg === "--model" || arg.startsWith("--model=")) options.model = readValue();
    else if (arg === "--size" || arg.startsWith("--size=")) options.size = readValue();
    else if (arg === "--raw-slug" || arg.startsWith("--raw-slug=")) options.rawSlug = readValue();
    else if (arg === "--limit" || arg.startsWith("--limit=")) options.limit = Number(readValue());
    else if (arg === "--codes" || arg.startsWith("--codes=")) options.codes.push(...readValue().split(",").map((code) => code.trim().toLowerCase()).filter(Boolean));
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--confirm-spend") options.confirmSpend = true;
    else if (arg === "--no-skip-existing") options.skipExisting = false;
    else if (arg === "--regenerate-raw") options.regenerateRaw = true;
    else if (arg === "--regenerate-source") options.regenerateSource = true;
    else if (arg === "--skip-refit") options.skipRefit = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/generate-vectorengine-channel-banners-batch.mjs --dry-run
  node scripts/generate-vectorengine-channel-banners-batch.mjs --confirm-spend
  node scripts/generate-vectorengine-channel-banners-batch.mjs --confirm-spend --codes=it,vi,th

Purpose:
  Generate missing localized v1-site-ui source banners through VectorEngine,
  then refit them into the accepted center-v9-wide YouTube geometry.

Safety:
  Refuses paid VectorEngine calls without --confirm-spend.
  Existing final banners are skipped by default.
  Use --skip-refit when the generated v1-site-ui sources will be exported
  directly instead of mixed with the older EN wide side panels.
`);
}

function publicCodeFor(language) {
  return COLLAPSED_VARIANTS.get(language.spreadsheetCode) || language.spreadsheetCode;
}

function publicCodesFromLanguageOrder(languageOrder) {
  const seen = new Set();
  const codes = [];
  for (const language of languageOrder) {
    const key = publicCodeFor(language).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      codes.push(key);
    }
  }
  return codes;
}

function getApiKey() {
  const keyName = process.env.VECTORENGINE_API_KEY
    ? "VECTORENGINE_API_KEY"
    : "VECTOR_ENGINE_API_KEY";
  const apiKey = process.env.VECTORENGINE_API_KEY || process.env.VECTOR_ENGINE_API_KEY || "";
  return { keyName, apiKey };
}

function outputPaths(code, options) {
  const outDir = resolveProjectPath(`outputs/youtube-channel-assets/${code}`);
  const rawPath = path.join(outDir, `lunacards-${code}-channel-banner-${options.rawSlug}-raw-${options.size}.png`);
  const rawMetadataPath = path.join(outDir, `lunacards-${code}-channel-banner-${options.rawSlug}-metadata.json`);
  const sourcePath = path.join(outDir, `lunacards-${code}-channel-banner-youtube-2560x1440-${options.sourceSlug}.png`);
  const sourceMetadataPath = path.join(outDir, `lunacards-${code}-channel-banner-${options.sourceSlug}-source-metadata.json`);
  const finalPath = path.join(outDir, `lunacards-${code}-channel-banner-youtube-2560x1440-${options.finalSlug}.jpg`);
  return { outDir, rawPath, rawMetadataPath, sourcePath, sourceMetadataPath, finalPath };
}

function acceptedFinalPath(code, options) {
  const override = ACCEPTED_FINAL_OVERRIDES.get(code);
  return override ? resolveProjectPath(override) : outputPaths(code, options).finalPath;
}

function buildPrompt(copy) {
  return [
    `Create one complete premium YouTube channel banner for ${BRAND_NAME} for native ${copy.languageName} speakers.`,
    "Do not leave empty space for later editing; the final artwork must already include all visible brand text as one coherent rendered image.",
    "Target composition: ultra-wide YouTube channel header, light modern SaaS/product UI, matching flashcardsluna.com: pale #f4f7f9 background, white rounded flashcard/course tiles, soft blue accents, deep navy brand text, subtle violet highlights, polished premium educational feel.",
    "YouTube safety: all important content must be compact and centered vertically. Imagine only a narrow horizontal strip through the exact middle will be visible. Keep every letter, logo, URL, and important card inside the middle 40% of the image height, with large empty padding above and below. Do not make the brand text huge.",
    "Scale rule: the whole center brand lockup should occupy about one third of the image height, not more. Leave generous top and bottom whitespace.",
    "Center text must be exact, readable, and large. Render these four text lines exactly and do not translate or change them:",
    BRAND_NAME,
    copy.headline,
    copy.subline,
    "flashcardsluna.com",
    "Use no other words, letters, labels, URLs, signatures, watermarks, or random text anywhere.",
    `Draw a small ${BRAND_NAME}-style blue flashcard logo above the word ${BRAND_NAME}: blue card stack, yellow crescent moon, tiny black cat ears. It does not need to be an exact imported logo, but it must be clean and premium.`,
    "Left and right sides: rich website-like grids of small rounded flashcard/course tiles with non-text icons only: globe, books, notebook, headphones, microscope flask, camera, landscape card, pencil, plant, moon card, quiz card. Fill the full wide header so it never looks like a small centered image.",
    "Keep all exact text inside the central safe area with generous margins. The full-width desktop crop should show side tiles across both edges and a clean center.",
    "Avoid dark backgrounds, neon, busy collage, stock photo look, people, animals except the tiny cat-ear logo motif, and heavy borders."
  ].join("\n");
}

async function callVectorEngineImage({ prompt, model, size, apiKey }) {
  const baseUrl = String(process.env.VECTORENGINE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/u, "");
  const timeoutMs = Number(process.env.VECTORENGINE_IMAGE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const response = await fetch(`${baseUrl}/v1/images/generations`, {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model, prompt, size, n: 1 })
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

function runChecked(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

async function writeManifest(records, errors, options) {
  const manifestPath = resolveProjectPath("outputs/youtube-channel-assets/channel-banner-vectorengine-v1-site-ui-batch-manifest.json");
  const manifest = {
    status: errors.length > 0 ? "partial" : "ok",
    generatedAt: new Date().toISOString(),
    rawSlug: options.rawSlug,
    sourceSlug: options.sourceSlug,
    finalSlug: options.finalSlug,
    model: options.model,
    size: options.size,
    generatedCount: records.filter((record) => record.status === "ok").length,
    skippedCount: records.filter((record) => record.status === "skipped_existing").length,
    errorCount: errors.length,
    records,
    errors,
  };
  await fsp.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifestPath;
}

async function processCode(code, copy, options, apiKey, keyName) {
  const paths = outputPaths(code, options);
  await fsp.mkdir(paths.outDir, { recursive: true });
  const finalExists = fs.existsSync(acceptedFinalPath(code, options));
  if (options.skipExisting && finalExists && !options.regenerateRaw && !options.regenerateSource) {
    return {
      status: "skipped_existing",
      code,
      supportLanguage: copy.languageName,
      finalPath: acceptedFinalPath(code, options),
    };
  }

  const prompt = buildPrompt(copy);
  if (!fs.existsSync(paths.rawPath) || options.regenerateRaw) {
    const startedAt = new Date().toISOString();
    const imageBytes = await callVectorEngineImage({
      prompt,
      model: options.model,
      size: options.size,
      apiKey,
    });
    await fsp.writeFile(paths.rawPath, imageBytes);
    await fsp.writeFile(paths.rawMetadataPath, `${JSON.stringify({
      status: "ok",
      code,
      supportLanguage: copy.languageName,
      provider: "vectorengine",
      model: options.model,
      size: options.size,
      keyName,
      prompt,
      localizedCopy: {
        brand: BRAND_NAME,
        headline: copy.headline,
        subline: copy.subline,
        url: "flashcardsluna.com",
      },
      rawPath: paths.rawPath,
      startedAt,
      finishedAt: new Date().toISOString(),
    }, null, 2)}\n`, "utf8");
  }

  if (!fs.existsSync(paths.sourcePath) || options.regenerateSource || options.regenerateRaw) {
    runChecked("python3", [
      "scripts/fit-vectorengine-channel-banner-source.py",
      "--raw",
      paths.rawPath,
      "--code",
      code,
      "--slug",
      options.sourceSlug,
      "--out-dir",
      paths.outDir,
    ]);
  }

  if (!options.skipRefit) {
    runChecked("python3", [
      "scripts/refit-localized-channel-banners-from-source.py",
      "--codes",
      code,
    ]);
  }

  return {
    status: "ok",
    code,
    supportLanguage: copy.languageName,
    rawPath: paths.rawPath,
    rawMetadataPath: paths.rawMetadataPath,
    sourcePath: paths.sourcePath,
    sourceMetadataPath: paths.sourceMetadataPath,
    finalPath: paths.finalPath,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const channelCopy = loadJson(options.copyConfig);
  const languageOrder = loadJson(options.languageOrder);
  const publicCodes = publicCodesFromLanguageOrder(languageOrder);
  const requestedCodes = options.codes.length > 0 ? options.codes : publicCodes;
  let codes = requestedCodes.filter((code) => {
    const hasCopy = Boolean(channelCopy[code]);
    if (!hasCopy) console.warn(`Skipping ${code}: missing ${options.copyConfig} entry`);
    return hasCopy;
  });
  if (options.skipExisting) {
    codes = codes.filter((code) => !fs.existsSync(acceptedFinalPath(code, options)));
  }
  if (Number.isFinite(options.limit) && options.limit > 0) {
    codes = codes.slice(0, options.limit);
  }

  const plan = codes.map((code) => ({
    code,
    supportLanguage: channelCopy[code].languageName,
    headline: channelCopy[code].headline,
    subline: channelCopy[code].subline,
    finalPath: acceptedFinalPath(code, options),
  }));

  if (options.dryRun) {
    console.log(JSON.stringify({
      status: "dry_run",
      totalPublicChannels: publicCodes.length,
      plannedCount: plan.length,
      skippedExisting: publicCodes.length - plan.length,
      planned: plan,
    }, null, 2));
    return;
  }

  if (!options.confirmSpend) {
    throw new Error("Refusing to call VectorEngine because this spends API credits. Re-run with --confirm-spend.");
  }

  const loadedEnvFiles = [];
  for (const envFile of options.envFiles) {
    const resolved = resolveProjectPath(envFile);
    if (loadDotEnv(resolved)) loadedEnvFiles.push(path.relative(projectRoot, resolved));
  }
  const { keyName, apiKey } = getApiKey();
  if (!apiKey) throw new Error("Missing VectorEngine key. Set VECTORENGINE_API_KEY or VECTOR_ENGINE_API_KEY.");

  const records = [];
  const errors = [];
  for (const [index, item] of plan.entries()) {
    console.log(`[${index + 1}/${plan.length}] ${item.code.toUpperCase()} ${item.supportLanguage}`);
    try {
      const record = await processCode(item.code, channelCopy[item.code], options, apiKey, keyName);
      records.push({ ...record, loadedEnvFiles });
    } catch (error) {
      const errorRecord = {
        code: item.code,
        supportLanguage: item.supportLanguage,
        message: error.message,
      };
      errors.push(errorRecord);
      records.push({ status: "error", ...errorRecord });
      await writeManifest(records, errors, options);
      throw error;
    }
    await writeManifest(records, errors, options);
  }

  const okCodes = records.filter((record) => record.status === "ok").map((record) => record.code);
  if (okCodes.length > 0 && !options.skipRefit) {
    runChecked("python3", [
      "scripts/refit-localized-channel-banners-from-source.py",
      "--codes",
      ...okCodes,
    ]);
  }
  const manifestPath = await writeManifest(records, errors, options);
  console.log(JSON.stringify({
    status: errors.length > 0 ? "partial" : "ok",
    plannedCount: plan.length,
    okCount: okCodes.length,
    errorCount: errors.length,
    manifestPath,
    codes: okCodes,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
