#!/usr/bin/env node
import { mkdir, copyFile, stat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const configPath = "config/youtube-channels.json";
const outputsPrefix = "outputs/youtube-channel-assets";
const committedPrefix = "assets/youtube-channel-branding";

function parseArgs(argv) {
  const options = {
    direction: "",
    verify: false,
    list: false,
  };

  for (const arg of argv) {
    if (arg === "--to-assets") options.direction = "to-assets";
    else if (arg === "--to-outputs") options.direction = "to-outputs";
    else if (arg === "--verify") options.verify = true;
    else if (arg === "--list") options.list = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/sync-youtube-channel-branding-assets.mjs --to-assets --verify
  node scripts/sync-youtube-channel-branding-assets.mjs --to-outputs --verify
  node scripts/sync-youtube-channel-branding-assets.mjs --list

Copies only the public YouTube channel branding assets referenced by
config/youtube-channels.json:
  - channel banners
  - shared avatar image
  - shared watermark image

No OAuth tokens, client secrets, .local files or contact email defaults are copied.`);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(projectRoot, relativePath), "utf8"));
}

function normalizeRelative(filePath) {
  const normalized = filePath.split(path.sep).join("/");
  if (!normalized.startsWith(`${outputsPrefix}/`)) {
    throw new Error(`Expected asset under ${outputsPrefix}: ${filePath}`);
  }
  return normalized.slice(outputsPrefix.length + 1);
}

function projectPath(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  const relative = path.relative(projectRoot, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing path outside project root: ${relativePath}`);
  }
  return absolutePath;
}

async function collectAssets() {
  const config = await readJson(configPath);
  const files = new Set();

  for (const channel of config.channels || []) {
    if (channel.bannerAsset) files.add(channel.bannerAsset);
    if (channel.avatarAsset || config.defaults?.avatarAsset) {
      files.add(channel.avatarAsset || config.defaults.avatarAsset);
    }
    if (channel.watermarkAsset || config.defaults?.watermarkAsset) {
      files.add(channel.watermarkAsset || config.defaults.watermarkAsset);
    }
  }

  return [...files].sort().map((sourcePath) => {
    const relativeAssetPath = normalizeRelative(sourcePath);
    return {
      outputPath: `${outputsPrefix}/${relativeAssetPath}`,
      committedPath: `${committedPrefix}/${relativeAssetPath}`,
    };
  });
}

async function fileSize(relativePath) {
  try {
    const info = await stat(projectPath(relativePath));
    return info.size;
  } catch {
    return null;
  }
}

async function copyAsset(sourcePath, destinationPath) {
  const sourceSize = await fileSize(sourcePath);
  if (sourceSize === null) {
    throw new Error(`Missing source asset: ${sourcePath}`);
  }
  await mkdir(path.dirname(projectPath(destinationPath)), { recursive: true });
  await copyFile(projectPath(sourcePath), projectPath(destinationPath));
  const destinationSize = await fileSize(destinationPath);
  if (destinationSize !== sourceSize) {
    throw new Error(`Copy size mismatch: ${sourcePath} -> ${destinationPath}`);
  }
  return sourceSize;
}

async function verifyAssets(assets, direction) {
  const missing = [];
  const mismatched = [];
  let bytes = 0;

  for (const asset of assets) {
    const sourcePath = direction === "to-assets" ? asset.outputPath : asset.committedPath;
    const destinationPath = direction === "to-assets" ? asset.committedPath : asset.outputPath;
    const sourceSize = await fileSize(sourcePath);
    const destinationSize = await fileSize(destinationPath);
    if (sourceSize === null) missing.push(sourcePath);
    if (destinationSize === null) missing.push(destinationPath);
    if (sourceSize !== null && destinationSize !== null && sourceSize !== destinationSize) {
      mismatched.push({ sourcePath, destinationPath, sourceSize, destinationSize });
    }
    if (destinationSize !== null) bytes += destinationSize;
  }

  if (missing.length > 0 || mismatched.length > 0) {
    console.error(JSON.stringify({ missing, mismatched }, null, 2));
    process.exit(1);
  }

  return bytes;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const assets = await collectAssets();
  if (options.list) {
    for (const asset of assets) console.log(asset.outputPath);
    console.error(`asset_count=${assets.length}`);
    return;
  }

  if (!options.direction) {
    throw new Error("Pass --to-assets, --to-outputs or --list.");
  }

  let copiedBytes = 0;
  for (const asset of assets) {
    const sourcePath = options.direction === "to-assets" ? asset.outputPath : asset.committedPath;
    const destinationPath = options.direction === "to-assets" ? asset.committedPath : asset.outputPath;
    copiedBytes += await copyAsset(sourcePath, destinationPath);
  }

  let verifiedBytes = copiedBytes;
  if (options.verify) {
    verifiedBytes = await verifyAssets(assets, options.direction);
  }

  console.log(`asset_direction=${options.direction}`);
  console.log(`asset_count=${assets.length}`);
  console.log(`asset_bytes=${verifiedBytes}`);
  console.log(options.direction === "to-assets" ? `committed_root=${committedPrefix}` : `outputs_root=${outputsPrefix}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
