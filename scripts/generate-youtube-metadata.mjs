#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { generateYouTubeMetadata, generateYouTubeMetadataBatch, resolveTargetLanguages } from "./lib/youtube-metadata.mjs";
import { shardItems } from "./lib/work-shards.mjs";

function parseArgs(argv) {
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
    geminiBatchSize: Number(process.env.YOUTUBE_METADATA_GEMINI_BATCH_SIZE || 1),
    geminiRateLimitMs: Number(process.env.YOUTUBE_METADATA_GEMINI_RATE_LIMIT_MS || 0),
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
    else if (arg === "--model" && argv[i + 1]) args.model = argv[++i];
    else if (arg === "--privacy" && argv[i + 1]) args.privacyStatus = argv[++i];
    else if (arg === "--concurrency" && argv[i + 1]) args.concurrency = Number(argv[++i]);
    else if (arg === "--gemini-batch-size" && argv[i + 1]) args.geminiBatchSize = Number(argv[++i]);
    else if (arg === "--gemini-rate-limit-ms" && argv[i + 1]) args.geminiRateLimitMs = Number(argv[++i]);
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
    "  --with-gemini                 Improve template metadata with Gemini.",
    "  --gemini-backend api|cli|vectorengine|api,vectorengine",
    "                                  Use Google API, local Gemini CLI, VectorEngine, or an ordered backend chain.",
    "                                  Defaults to direct Google API when direct keys exist, otherwise CLI.",
    "                                  Direct Google keys are tried as GEMINI_API_KEY, GEMINI_API_KEY_2, GOOGLE_API_KEY.",
    "  --model <model>                Override Gemini model.",
    "  --gemini-batch-size <n>        Group up to n targets per API -> VectorEngine batch. Default 1.",
    "  --gemini-rate-limit-ms <n>     Pause between metadata batches. Default 0.",
    "  --privacy private|unlisted|public",
    "  --concurrency <n>              Metadata/SEO generation concurrency. Default 4.",
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunks(items, size) {
  const chunkSize = Math.max(1, Math.floor(Number(size) || 1));
  const result = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    result.push(items.slice(index, index + chunkSize));
  }
  return result;
}

function useDirectApiBatch(args) {
  if (!args.withGemini || Math.floor(Number(args.geminiBatchSize) || 1) <= 1) return false;
  const backends = String(args.geminiBackend || process.env.GEMINI_BACKEND || "api")
    .split(",")
    .map((backend) => backend.trim().toLowerCase())
    .filter(Boolean);
  return backends[0] === "api" && backends.every((backend) => backend === "api" || backend === "vectorengine");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.setId) {
    console.error(usage());
    process.exit(1);
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

  if (useDirectApiBatch(args)) {
    const results = [];
    const targetChunks = chunks(targetLangs, args.geminiBatchSize);
    for (let chunkIndex = 0; chunkIndex < targetChunks.length; chunkIndex += 1) {
      const chunk = targetChunks[chunkIndex];
      const metadataItems = await generateYouTubeMetadataBatch(
        chunk.map((targetLang) => ({
          setId: args.setId,
          targetLang,
          supportLang: args.supportLang,
          privacyStatus: args.privacyStatus
        })),
        {
          withGemini: args.withGemini,
          geminiBackend: args.geminiBackend || "api",
          model: args.model || undefined,
          privacyStatus: args.privacyStatus
        }
      );
      for (const metadata of metadataItems) {
        const outputPath = outputPathFor({
          outputDir: args.outputDir,
          setId: args.setId,
          targetLang: metadata.targetLang,
          supportLang: args.supportLang
        });
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
        results.push({ targetLang: metadata.targetLang, outputPath, source: metadata.source, title: metadata.title });
        console.log(`[YOUTUBE_METADATA] ${metadata.targetLang}/${args.supportLang}: ${metadata.source} -> ${outputPath}`);
      }
      if (chunkIndex < targetChunks.length - 1 && Number(args.geminiRateLimitMs) > 0) {
        await sleep(Number(args.geminiRateLimitMs));
      }
    }
    console.log(JSON.stringify({
      status: "ok",
      count: results.length,
      concurrency: 1,
      geminiBatchSize: Math.max(1, Math.floor(Number(args.geminiBatchSize) || 1)),
      geminiRateLimitMs: Math.max(0, Math.floor(Number(args.geminiRateLimitMs) || 0)),
      shardCount: shard.shardCount,
      shardIndex: shard.shardIndex,
      shardManifestPath,
      results,
    }, null, 2));
    return;
  }

  const results = new Array(targetLangs.length);
  const concurrency = Math.max(1, Math.min(Math.floor(Number(args.concurrency) || 1), Math.max(1, targetLangs.length)));
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < targetLangs.length) {
      const index = nextIndex;
      nextIndex += 1;
      const targetLang = targetLangs[index];
      const metadata = await generateYouTubeMetadata({
        setId: args.setId,
        targetLang,
        supportLang: args.supportLang,
        withGemini: args.withGemini,
        geminiBackend: args.geminiBackend || undefined,
        model: args.model || undefined,
        privacyStatus: args.privacyStatus
      });

      const outputPath = outputPathFor({
        outputDir: args.outputDir,
        setId: args.setId,
        targetLang,
        supportLang: args.supportLang
      });
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
      results[index] = { targetLang, outputPath, source: metadata.source, title: metadata.title };
      console.log(`[YOUTUBE_METADATA] ${targetLang}/${args.supportLang}: ${metadata.source} -> ${outputPath}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  console.log(JSON.stringify({
    status: "ok",
    count: results.filter(Boolean).length,
    concurrency,
    shardCount: shard.shardCount,
    shardIndex: shard.shardIndex,
    shardManifestPath,
    results: results.filter(Boolean),
  }, null, 2));
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
