#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  DEFAULT_VECTORENGINE_IMAGE_MODEL,
  callVectorEngineImage,
  getVectorEngineApiKey,
  loadDotEnvFile,
} from "./lib/vectorengine-image.mjs";

const DEFAULT_SIZE = "1536x864";
const OUTPUT_NAME = "youtube_thumbnail";
const MAX_YOUTUBE_THUMBNAIL_BYTES = 2 * 1024 * 1024;

function parseArgs(argv) {
  const options = {
    inputs: [],
    envFiles: [".env", ".env.local", ".env.vectorengine.local"],
    model: process.env.VECTORENGINE_IMAGE_MODEL || DEFAULT_VECTORENGINE_IMAGE_MODEL,
    size: DEFAULT_SIZE,
    outputName: OUTPUT_NAME,
    confirmSpend: false,
    dryRun: false,
    force: false,
    writeMetadata: true,
    limit: null,
    output: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      if (arg.includes("=")) return arg.split("=").slice(1).join("=");
      index += 1;
      return argv[index];
    };

    if (arg === "--env-file" || arg.startsWith("--env-file=")) options.envFiles.push(readValue());
    else if (arg === "--model" || arg.startsWith("--model=")) options.model = readValue();
    else if (arg === "--size" || arg.startsWith("--size=")) options.size = readValue();
    else if (arg === "--output-name" || arg.startsWith("--output-name=")) options.outputName = readValue();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = readValue();
    else if (arg === "--limit" || arg.startsWith("--limit=")) options.limit = Number(readValue());
    else if (arg === "--confirm-spend") options.confirmSpend = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--no-write-metadata") options.writeMetadata = false;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else options.inputs.push(arg);
  }

  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/generate-youtube-thumbnails.mjs <metadata-file-or-dir> [...] --dry-run",
    "  node scripts/generate-youtube-thumbnails.mjs outputs/video-generator --confirm-spend",
    "",
    "Creates one VectorEngine GPT Image 2 YouTube thumbnail per youtube_metadata.json.",
    "The final JPEG is written next to metadata as youtube_thumbnail.jpg and metadata.thumbnailPath is updated.",
    "",
    "Safety:",
    "  Live VectorEngine image calls require --confirm-spend.",
    "  The script never prints API keys or token contents.",
  ].join("\n");
}

function collectMetadataFiles(inputs) {
  const files = [];
  for (const input of inputs) {
    const resolved = path.resolve(input);
    if (!fs.existsSync(resolved)) throw new Error(`Path not found: ${input}`);
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(resolved, { withFileTypes: true })) {
        const full = path.join(resolved, entry.name);
        if (entry.isDirectory()) files.push(...collectMetadataFiles([full]));
        else if (entry.isFile() && entry.name === "youtube_metadata.json") files.push(full);
      }
    } else if (path.basename(resolved) === "youtube_metadata.json") {
      files.push(resolved);
    } else {
      throw new Error(`Expected youtube_metadata.json or a directory: ${input}`);
    }
  }
  return [...new Set(files)].sort();
}

function cleanText(value) {
  return String(value || "").replace(/\s+/gu, " ").trim();
}

function stripSentenceTerminator(value) {
  return cleanText(value).replace(/[.!?。！？։။။।]+$/u, "").trim();
}

function truncateText(value, maxLength) {
  const text = cleanText(value);
  if (Array.from(text).length <= maxLength) return text;
  const chars = Array.from(text);
  const cut = chars.slice(0, maxLength - 1).join("");
  const space = cut.lastIndexOf(" ");
  return `${(space > 12 ? cut.slice(0, space) : cut).trim()}…`;
}

function thumbnailCopy(metadata) {
  const targetName = truncateText(metadata.targetLanguageName || metadata.targetLang || "Language", 28);
  const level = truncateText(metadata.level || "A1", 12);
  const deckTitle = truncateText(stripSentenceTerminator(metadata.deckTitle) || "Vocabulary", 38);

  return {
    brand: "LunaCards",
    headline: `${targetName} ${level}`.trim(),
    topic: deckTitle,
  };
}

function buildPrompt(metadata) {
  const copy = thumbnailCopy(metadata);
  return [
    "Create one premium YouTube thumbnail for a LunaCards flashcard vocabulary lesson.",
    "Canvas: 16:9 YouTube thumbnail, high contrast and readable at small size.",
    "Visual style: same premium LunaCards system as the channel art and flashcardsluna.com: light #f4f7f9 background, white rounded flashcard panels, soft blue accents, deep navy typography, subtle violet accent, clean modern educational product feel.",
    "Layout: big readable text on the left or center-left, elegant flashcard/course-card composition on the right, no clutter, no people, no dark background, no clickbait face, no neon.",
    "Show a few abstract non-text flashcards or icons that suggest vocabulary, audio/pronunciation and a quick quiz. Icons may include headphones, cards, check mark, book, moon-card motif.",
    "Important text rule: render ONLY the exact text lines below. Put each line on its own line. Do not add pipe separators, quotes, URLs, extra words, watermarks, signatures, random letters, or translated alternatives.",
    copy.brand,
    copy.headline,
    copy.topic,
    "Keep every text line large, crisp and inside safe margins. If text is long, make it slightly smaller instead of cropping.",
    "Use no other readable text anywhere in the image.",
  ].join("\n");
}

function outputPaths(metadataFile, outputName) {
  const dir = path.dirname(metadataFile);
  return {
    rawPath: path.join(dir, `${outputName}_raw.png`),
    thumbnailPath: path.join(dir, `${outputName}.jpg`),
    thumbnailMetadataPath: path.join(dir, `${outputName}_metadata.json`),
  };
}

function assertFfmpeg() {
  const probe = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (probe.status !== 0) {
    throw new Error("ffmpeg is required to normalize thumbnails to 1280x720 JPEG.");
  }
}

function normalizeWithFfmpeg(rawPath, thumbnailPath) {
  assertFfmpeg();
  const qualities = [3, 5, 7, 9, 11];
  let lastError = "";
  for (const quality of qualities) {
    const result = spawnSync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      rawPath,
      "-vf",
      "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720",
      "-frames:v",
      "1",
      "-q:v",
      String(quality),
      thumbnailPath,
    ], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    if (result.status !== 0) {
      lastError = `${result.stdout}\n${result.stderr}`.trim();
      continue;
    }
    const size = fs.statSync(thumbnailPath).size;
    if (size <= MAX_YOUTUBE_THUMBNAIL_BYTES) {
      return { quality, size };
    }
  }
  const size = fs.existsSync(thumbnailPath) ? fs.statSync(thumbnailPath).size : 0;
  throw new Error(`Could not create a <=2MB thumbnail. Last size=${size}. ${lastError}`);
}

function relativeProjectPath(filePath) {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function updateMetadataFile(metadataFile, metadata, thumbnailPath, thumbnailMetadataPath) {
  const next = {
    ...metadata,
    thumbnailPath: relativeProjectPath(thumbnailPath),
    thumbnail: relativeProjectPath(thumbnailPath),
    thumbnailSource: "vectorengine-gpt-image-2",
    thumbnailMetadataPath: relativeProjectPath(thumbnailMetadataPath),
    thumbnailGeneratedAt: new Date().toISOString(),
  };
  fs.writeFileSync(metadataFile, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || options.inputs.length === 0) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }
  if (!options.dryRun && !options.confirmSpend) {
    throw new Error("Refusing to call VectorEngine because this spends API credits. Re-run with --confirm-spend.");
  }

  const files = collectMetadataFiles(options.inputs);
  const selectedFiles = options.limit ? files.slice(0, options.limit) : files;
  const loadedEnvFiles = [];
  for (const envFile of options.envFiles) {
    const resolved = path.resolve(envFile);
    if (loadDotEnvFile(resolved)) loadedEnvFiles.push(relativeProjectPath(resolved));
  }
  const { keyName, apiKey } = getVectorEngineApiKey();
  if (!options.dryRun && !apiKey) {
    throw new Error("Missing VectorEngine key. Set VECTORENGINE_API_KEY or VECTOR_ENGINE_API_KEY.");
  }

  const records = [];
  for (const metadataFile of selectedFiles) {
    const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
    const paths = outputPaths(metadataFile, options.outputName);
    const prompt = buildPrompt(metadata);
    const existing = fs.existsSync(paths.thumbnailPath);
    if (existing && !options.force) {
      if (options.writeMetadata) updateMetadataFile(metadataFile, metadata, paths.thumbnailPath, paths.thumbnailMetadataPath);
      records.push({
        status: "skipped_existing",
        metadataFile: relativeProjectPath(metadataFile),
        thumbnailPath: relativeProjectPath(paths.thumbnailPath),
      });
      continue;
    }
    if (options.dryRun) {
      records.push({
        status: "dry_run",
        metadataFile: relativeProjectPath(metadataFile),
        rawPath: relativeProjectPath(paths.rawPath),
        thumbnailPath: relativeProjectPath(paths.thumbnailPath),
        prompt,
      });
      continue;
    }

    await fsp.mkdir(path.dirname(paths.rawPath), { recursive: true });
    const startedAt = new Date().toISOString();
    const imageBytes = await callVectorEngineImage({
      prompt,
      model: options.model,
      size: options.size,
      apiKey,
    });
    await fsp.writeFile(paths.rawPath, imageBytes);
    const normalized = normalizeWithFfmpeg(paths.rawPath, paths.thumbnailPath);
    const record = {
      status: "ok",
      metadataFile: relativeProjectPath(metadataFile),
      setId: metadata.setId,
      supportLang: metadata.supportLang,
      targetLang: metadata.targetLang,
      provider: "vectorengine",
      model: options.model,
      size: options.size,
      keyName,
      loadedEnvFiles,
      prompt,
      rawPath: relativeProjectPath(paths.rawPath),
      thumbnailPath: relativeProjectPath(paths.thumbnailPath),
      ffmpeg: normalized,
      startedAt,
      finishedAt: new Date().toISOString(),
    };
    await fsp.writeFile(paths.thumbnailMetadataPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    if (options.writeMetadata) updateMetadataFile(metadataFile, metadata, paths.thumbnailPath, paths.thumbnailMetadataPath);
    records.push(record);
  }

  const report = {
    status: records.some((record) => record.status === "ok" || record.status === "skipped_existing" || record.status === "dry_run")
      ? "ok"
      : "empty",
    generatedAt: new Date().toISOString(),
    model: options.model,
    size: options.size,
    dryRun: options.dryRun,
    inputCount: files.length,
    processedCount: records.length,
    records,
  };
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (options.output) {
    fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
    fs.writeFileSync(options.output, json, "utf8");
  }
  console.log(json);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
