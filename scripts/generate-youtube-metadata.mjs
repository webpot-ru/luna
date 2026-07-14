#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { generateYouTubeMetadataBatch, resolveTargetLanguages } from "./lib/youtube-metadata.mjs";
import { shardItems } from "./lib/work-shards.mjs";

export function parseArgs(argv) {
  const args = {
    setId: "",
    supportLang: "RU",
    targets: null,
    outputDir: "",
    withGemini: false,
    geminiBackend: "",
    model: "",
    privacyStatus: "public",
    concurrency: Number(process.env.YOUTUBE_METADATA_CONCURRENCY || 4),
    geminiBatchSize: Number(process.env.YOUTUBE_METADATA_BATCH_SIZE || 10),
    geminiRateLimitMs: Number(process.env.YOUTUBE_METADATA_RATE_LIMIT_MS || 15000),
    shardCount: 1,
    shardIndex: 0
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--set" && argv[i + 1]) args.setId = argv[++i];
    else if (arg === "--support" && argv[i + 1]) args.supportLang = argv[++i].toUpperCase();
    else if ((arg === "--target" || arg === "--targets" || arg === "--langs") && argv[i + 1]) {
      const value = argv[++i].trim();
      args.targets = value.toUpperCase() === "ALL"
        ? null
        : value.split(",").map((item) => item.trim().toUpperCase()).filter(Boolean);
    } else if (arg === "--output-dir" && argv[i + 1]) args.outputDir = argv[++i];
    else if (arg === "--with-gemini") args.withGemini = true;
    else if (arg === "--gemini-backend" && argv[i + 1]) args.geminiBackend = argv[++i];
    else if (arg.startsWith("--gemini-backend=")) args.geminiBackend = arg.slice("--gemini-backend=".length);
    else if (arg === "--model" && argv[i + 1]) args.model = argv[++i];
    else if (arg.startsWith("--model=")) args.model = arg.slice("--model=".length);
    else if (arg === "--privacy" && argv[i + 1]) args.privacyStatus = argv[++i];
    else if (arg.startsWith("--privacy=")) args.privacyStatus = arg.slice("--privacy=".length);
    else if (arg === "--concurrency" && argv[i + 1]) args.concurrency = Number(argv[++i]);
    else if (arg === "--gemini-batch-size" && argv[i + 1]) args.geminiBatchSize = Number(argv[++i]);
    else if (arg.startsWith("--gemini-batch-size=")) args.geminiBatchSize = Number(arg.slice("--gemini-batch-size=".length));
    else if (arg === "--gemini-rate-limit-ms" && argv[i + 1]) args.geminiRateLimitMs = Number(argv[++i]);
    else if (arg.startsWith("--gemini-rate-limit-ms=")) args.geminiRateLimitMs = Number(arg.slice("--gemini-rate-limit-ms=".length));
    else if (arg === "--shard-count" && argv[i + 1]) args.shardCount = Number(argv[++i]);
    else if (arg === "--shard-index" && argv[i + 1]) args.shardIndex = Number(argv[++i]);
  }
  return args;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/generate-youtube-metadata.mjs --set <set_id> --support <support_lang> [--target ES|--targets ES,DE|--targets ALL]",
    "",
    "Options:",
    "  --with-gemini                 Improve template metadata with an approved AI provider.",
    "  --gemini-backend openai[,api][,vectorengine][,cli]",
    "                                  Ordered provider chain. CLI is used only when explicitly listed.",
    "                                  Defaults to Google API when GEMINI_API_KEY exists, otherwise CLI.",
    "                                  VectorEngine is opt-in via this flag or GEMINI_BACKEND=vectorengine.",
    "  --model <model>                Override the selected provider model.",
    "  --privacy private|unlisted|public",
    "  --concurrency <n>              Retained for compatibility; AI batches are sequential.",
    "  --gemini-batch-size <n>        Metadata tasks in one AI request. Default/max 10.",
    "  --gemini-rate-limit-ms <n>     Pause between AI batches. Default 15000.",
    "  --shard-count <n>              Deterministic target-language shard count. Default 1.",
    "  --shard-index <n>              0-based deterministic target-language shard index. Default 0.",
    "  --output-dir <dir>             Defaults to outputs/video-generator/<set>_<target>_<support>/youtube_metadata.json."
  ].join("\n");
}

function outputPathFor({ outputDir, setId, targetLang, supportLang }) {
  if (outputDir) {
    return path.resolve(outputDir, `${setId}_${targetLang.toLowerCase()}_${supportLang.toLowerCase()}_youtube_metadata.json`);
  }
  return path.resolve(
    "outputs/video-generator",
    `${setId}_${targetLang.toLowerCase()}_${supportLang.toLowerCase()}`,
    "youtube_metadata.json"
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.setId) {
    console.error(usage());
    process.exit(1);
  }
  if (!Number.isInteger(args.geminiBatchSize) || args.geminiBatchSize < 1 || args.geminiBatchSize > 10) {
    throw new Error("--gemini-batch-size must be an integer between 1 and 10.");
  }
  if (!Number.isFinite(args.geminiRateLimitMs) || args.geminiRateLimitMs < 0) {
    throw new Error("--gemini-rate-limit-ms must be a non-negative number.");
  }

  let targetLangs = args.targets;
  if (!targetLangs) {
    targetLangs = await resolveTargetLanguages(args.setId, args.supportLang);
  }
  if (targetLangs.length === 0) {
    throw new Error(`No target languages found for set_id=${args.setId} support=${args.supportLang}`);
  }
  const shard = shardItems(targetLangs, { shardCount: args.shardCount, shardIndex: args.shardIndex });
  targetLangs = shard.selectedItems;
  const shardManifestPath = path.resolve(
    args.outputDir || "outputs/video-generator",
    `${args.setId}_${args.supportLang.toLowerCase()}_metadata_shard_${shard.shardIndex}_of_${shard.shardCount}.json`
  );
  fs.mkdirSync(path.dirname(shardManifestPath), { recursive: true });
  fs.writeFileSync(shardManifestPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    phase: "youtube_metadata",
    setId: args.setId,
    supportLang: args.supportLang,
    shardCount: shard.shardCount,
    shardIndex: shard.shardIndex,
    inputTargetCount: shard.allItems.length,
    selectedTargetCount: shard.selectedItems.length,
    skippedTargetCount: shard.skippedItems.length,
    selectedTargets: shard.selectedItems,
    skippedTargets: shard.skippedItems,
  }, null, 2)}\n`, "utf8");
  if (targetLangs.length === 0) {
    console.log(JSON.stringify({
      status: "ok",
      count: 0,
      concurrency: 0,
      shardCount: shard.shardCount,
      shardIndex: shard.shardIndex,
      shardManifestPath,
      results: [],
    }, null, 2));
    return;
  }

  const results = [];
  const batchSize = Math.min(args.geminiBatchSize, targetLangs.length);
  const batches = [];
  for (let index = 0; index < targetLangs.length; index += batchSize) {
    batches.push(targetLangs.slice(index, index + batchSize));
  }
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const targets = batches[batchIndex];
    const metadataItems = await generateYouTubeMetadataBatch(targets.map((targetLang) => ({
      setId: args.setId,
      targetLang,
      supportLang: args.supportLang,
      withGemini: args.withGemini,
      geminiBackend: args.geminiBackend || undefined,
      model: args.model || undefined,
      privacyStatus: args.privacyStatus,
    })));
    for (let index = 0; index < targets.length; index += 1) {
      const targetLang = targets[index];
      const metadata = metadataItems[index];
      const outputPath = outputPathFor({
        outputDir: args.outputDir,
        setId: args.setId,
        targetLang,
        supportLang: args.supportLang,
      });
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
      results.push({ targetLang, outputPath, source: metadata.source, title: metadata.title });
      console.log(`[YOUTUBE_METADATA] ${targetLang}/${args.supportLang}: ${metadata.source} -> ${outputPath}`);
    }
    const hasAnotherBatch = batchIndex < batches.length - 1;
    if (args.withGemini && hasAnotherBatch && args.geminiRateLimitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, args.geminiRateLimitMs));
    }
  }

  console.log(JSON.stringify({
    status: "ok",
    count: results.filter(Boolean).length,
    concurrency: 1,
    geminiBatchSize: batchSize,
    geminiBatchCount: batches.length,
    geminiRateLimitMs: args.withGemini ? args.geminiRateLimitMs : 0,
    shardCount: shard.shardCount,
    shardIndex: shard.shardIndex,
    shardManifestPath,
    results: results.filter(Boolean),
  }, null, 2));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((err) => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
}
