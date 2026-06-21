#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { generateYouTubeMetadata, resolveTargetLanguages } from "./lib/youtube-metadata.mjs";

function parseArgs(argv) {
  const args = {
    setId: "",
    supportLang: "RU",
    targets: null,
    outputDir: "",
    withGemini: false,
    geminiBackend: "",
    model: "",
    privacyStatus: "public"
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

  const results = [];
  for (const targetLang of targetLangs) {
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
    results.push({ targetLang, outputPath, source: metadata.source, title: metadata.title });
    console.log(`[YOUTUBE_METADATA] ${targetLang}/${args.supportLang}: ${metadata.source} -> ${outputPath}`);
  }

  console.log(JSON.stringify({ status: "ok", count: results.length, results }, null, 2));
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
