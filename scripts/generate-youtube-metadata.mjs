#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { generateYouTubeMetadata, resolveTargetLanguages } from "./lib/youtube-metadata.mjs";
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
    "  --gemini-backend api|cli|vectorengine",
    "                                  Use Google API, local Gemini CLI, or VectorEngine Gemini proxy.",
    "                                  Defaults to Google API when GEMINI_API_KEY exists, otherwise CLI.",
    "                                  VectorEngine is opt-in via this flag or GEMINI_BACKEND=vectorengine.",
    "  --model <model>                Override Gemini model.",
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
