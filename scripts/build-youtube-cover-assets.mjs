#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import sharp from "sharp";

import {
  buildCoverPlan,
  normalizeCode,
  ordinaryOverlaySvg,
  polyglotOverlaySvg,
  safeSegment,
} from "./lib/youtube-cover-assets.mjs";

const DEFAULT_CONFIG = "config/youtube-cover-templates.json";
const DEFAULT_CHANNELS = "config/youtube-channels.json";
const DEFAULT_POLYGLOT_BUNDLES = "config/polyglot-video-bundles.json";

function parseArgs(argv) {
  const options = {
    config: DEFAULT_CONFIG,
    channels: DEFAULT_CHANNELS,
    polyglotBundles: DEFAULT_POLYGLOT_BUNDLES,
    setIds: [],
    supports: [],
    types: [],
    outputRoot: "",
    concurrency: 4,
    dryRun: false,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--config" || arg.startsWith("--config=")) options.config = value();
    else if (arg === "--channels" || arg.startsWith("--channels=")) options.channels = value();
    else if (arg === "--polyglot-bundles" || arg.startsWith("--polyglot-bundles=")) options.polyglotBundles = value();
    else if (arg === "--set" || arg.startsWith("--set=")) options.setIds.push(...value().split(",").filter(Boolean));
    else if (arg === "--support" || arg.startsWith("--support=")) options.supports.push(...value().split(",").map(normalizeCode).filter(Boolean));
    else if (arg === "--types" || arg.startsWith("--types=")) options.types.push(...value().split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
    else if (arg === "--output-root" || arg.startsWith("--output-root=")) options.outputRoot = value();
    else if (arg === "--concurrency" || arg.startsWith("--concurrency=")) options.concurrency = Number(value());
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} not found: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fileSha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

async function runPool(items, concurrency, worker) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

async function renderCover(cover) {
  if (!fs.existsSync(cover.baseImage)) throw new Error(`Approved base image not found: ${cover.baseImage}`);
  const overlay = cover.videoType === "polyglot" ? polyglotOverlaySvg(cover) : ordinaryOverlaySvg(cover);
  fs.mkdirSync(path.dirname(cover.relativePath), { recursive: true });
  await sharp(cover.baseImage)
    .resize(1280, 720, { fit: "fill" })
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toFile(cover.relativePath);
  const metadata = await sharp(cover.relativePath).metadata();
  if (metadata.width !== 1280 || metadata.height !== 720 || metadata.format !== "jpeg") {
    throw new Error(`Invalid rendered cover ${cover.relativePath}: ${metadata.width}x${metadata.height} ${metadata.format}`);
  }
  const sizeBytes = fs.statSync(cover.relativePath).size;
  if (sizeBytes > 2_000_000) throw new Error(`Rendered cover exceeds YouTube 2 MB limit: ${cover.relativePath} (${sizeBytes})`);
  const rendered = {
    ...cover,
    path: path.resolve(cover.relativePath),
    renderer: "sharp-svg-approved-template-overlay",
    dimensions: "1280x720",
    sizeBytes,
    sha256: fileSha256(cover.relativePath),
  };
  fs.writeFileSync(cover.sidecarPath, `${JSON.stringify(rendered, null, 2)}\n`, "utf8");
  return rendered;
}

async function buildContactSheet(covers, outputPath) {
  if (!covers.length) return "";
  const thumbWidth = 320;
  const thumbHeight = 180;
  const columns = 4;
  const rows = Math.ceil(covers.length / columns);
  const thumbnails = await Promise.all(covers.map((cover) => sharp(cover.relativePath)
    .resize(thumbWidth, thumbHeight, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer()));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await sharp({
    create: {
      width: columns * thumbWidth,
      height: rows * thumbHeight,
      channels: 3,
      background: "#f4f7fa",
    },
  }).composite(thumbnails.map((input, index) => ({
    input,
    left: (index % columns) * thumbWidth,
    top: Math.floor(index / columns) * thumbHeight,
  }))).jpeg({ quality: 86 }).toFile(outputPath);
  return outputPath;
}

function summaryFor(plan, options) {
  return {
    setIds: [...new Set(plan.covers.map((cover) => cover.setId))],
    supports: [...new Set(plan.covers.map((cover) => cover.supportLang))],
    types: [...new Set(plan.covers.map((cover) => cover.videoType))],
    coverCount: plan.covers.length,
    ordinaryCount: plan.covers.filter((cover) => cover.videoType === "ordinary").length,
    polyglotCount: plan.covers.filter((cover) => cover.videoType === "polyglot").length,
    skippedCount: plan.skipped.length,
    outputRoot: options.outputRoot,
    dryRun: options.dryRun,
    externalProviderCalls: 0,
    youtubeWrites: 0,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: node scripts/build-youtube-cover-assets.mjs [--set id[,id]] [--support UZ,SI,KA] [--types ordinary,polyglot] [--output-root path] [--dry-run]");
    return;
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 12) {
    throw new Error("--concurrency must be an integer from 1 to 12");
  }
  const templateConfig = readJson(options.config, "YouTube cover template config");
  const channelConfig = readJson(options.channels, "YouTube channel config");
  const polyglotConfig = readJson(options.polyglotBundles, "Polyglot bundle config");
  options.setIds = [...new Set(options.setIds.length ? options.setIds : templateConfig.defaults?.setIds || [])];
  options.supports = [...new Set(options.supports.length ? options.supports : templateConfig.defaults?.supports || [])];
  options.types = [...new Set(options.types.length ? options.types : templateConfig.defaults?.types || [])];
  options.outputRoot = options.outputRoot || templateConfig.defaults?.outputRoot || "outputs/youtube-cover-assets";
  const unknownTypes = options.types.filter((type) => !["ordinary", "polyglot"].includes(type));
  if (unknownTypes.length) throw new Error(`Unknown cover types: ${unknownTypes.join(",")}`);
  if (!options.setIds.length || !options.supports.length || !options.types.length) throw new Error("At least one set, support and type are required");

  const plan = { covers: [], skipped: [] };
  for (const setId of options.setIds) {
    const setConfig = templateConfig.sets?.[setId];
    if (!setConfig) throw new Error(`No cover template config for set=${setId}`);
    const deck = readJson(setConfig.deckDataPath, `Deck data for ${setId}`);
    const setPlan = buildCoverPlan({
      setId,
      setConfig,
      deck,
      channels: channelConfig.channels || [],
      supports: options.supports,
      types: options.types,
      polyglotConfig,
      outputRoot: options.outputRoot,
    });
    plan.covers.push(...setPlan.covers);
    plan.skipped.push(...setPlan.skipped);
  }
  const summary = summaryFor(plan, options);
  if (options.dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const rendered = new Array(plan.covers.length);
  await runPool(plan.covers, options.concurrency, async (cover, index) => {
    rendered[index] = await renderCover(cover);
  });

  const contactSheets = [];
  const groups = new Map();
  for (const cover of rendered) {
    const key = [cover.setId, cover.supportLang, cover.videoType].join("|");
    const rows = groups.get(key) || [];
    rows.push(cover);
    groups.set(key, rows);
  }
  for (const [key, covers] of groups) {
    const [setId, supportLang, videoType] = key.split("|");
    const outputPath = `${options.outputRoot}/video/contact-sheets/${safeSegment(setId)}__${supportLang}__${videoType}.jpg`;
    await buildContactSheet(covers, outputPath);
    contactSheets.push({ setId, supportLang, videoType, coverCount: covers.length, relativePath: outputPath });
  }

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: "approved",
    sourceOfTruth: "Approved local base artwork plus deterministic no-provider text overlays.",
    configPath: options.config,
    policy: {
      externalProviderCalls: 0,
      youtubeWrites: 0,
      applyRequiresGitTrackedAssets: true,
    },
    counts: summary,
    outputs: {
      root: options.outputRoot,
      manifest: `${options.outputRoot}/manifest.json`,
      contactSheets,
    },
    skipped: plan.skipped,
    covers: rendered,
  };
  fs.mkdirSync(options.outputRoot, { recursive: true });
  fs.writeFileSync(`${options.outputRoot}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

export { buildContactSheet, main, parseArgs, renderCover, summaryFor };
