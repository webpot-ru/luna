#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const VIDEO_GENERATOR_DIR = "outputs/video-generator";
const CHANNEL_CONFIG_PATH = "config/youtube-channels.json";
const DEFAULT_ORDINARY_MANIFEST = "outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-approved-channel-pairs-target-language-first-20260707/manifest.json";
const DEFAULT_POLYGLOT_MANIFEST = "outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-approved-polyglot-target-languages-20260707/manifest.json";

function parseArgs(argv) {
  const options = {
    inputDir: VIDEO_GENERATOR_DIR,
    manifests: [DEFAULT_ORDINARY_MANIFEST, DEFAULT_POLYGLOT_MANIFEST],
    strictCustom: false,
    output: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      if (arg.includes("=")) return arg.split("=").slice(1).join("=");
      index += 1;
      return argv[index];
    };
    if (arg === "--input-dir" || arg.startsWith("--input-dir=")) options.inputDir = readValue();
    else if (arg === "--manifest" || arg.startsWith("--manifest=")) options.manifests.push(readValue());
    else if (arg === "--manifests" || arg.startsWith("--manifests=")) {
      options.manifests.push(...String(readValue()).split(",").map((item) => item.trim()).filter(Boolean));
    } else if (arg === "--strict-custom") options.strictCustom = true;
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = readValue();
    else throw new Error(`Unknown argument: ${arg}`);
  }
  options.manifests = [...new Set(options.manifests.filter(Boolean))];
  return options;
}

function loadChannels() {
  if (!fs.existsSync(CHANNEL_CONFIG_PATH)) {
    console.error(`[ERROR] Channel config not found at: ${CHANNEL_CONFIG_PATH}`);
    return { channels: [] };
  }
  return JSON.parse(fs.readFileSync(CHANNEL_CONFIG_PATH, "utf8"));
}

function normalizeCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

function supportToChannelKey(supportLang) {
  const code = normalizeCode(supportLang);
  if (code === "EN" || code === "EN-GB") return "en";
  if (code === "ES" || code === "ES-419") return "es";
  if (code === "PT" || code === "PT-BR") return "pt";
  return code.toLowerCase();
}

function findChannelForSupport(channels, supportLang) {
  const code = normalizeCode(supportLang);
  const key = supportToChannelKey(code);
  return channels.find((c) => {
    const values = [
      c.key,
      c.supportLang,
      ...(Array.isArray(c.supportVariants) ? c.supportVariants : []),
      ...(Array.isArray(c.channelSupportLangs) ? c.channelSupportLangs : []),
    ];
    return String(c.key || "").toLowerCase() === key
      || values.map(normalizeCode).includes(code);
  });
}

function collectMetadataFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectMetadataFiles(full, files);
    } else if (entry.isFile() && entry.name === "youtube_metadata.json") {
      files.push(full);
    }
  }
  return files;
}

function loadCovers(manifestPaths) {
  const covers = [];
  for (const manifestPath of manifestPaths) {
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    for (const cover of manifest.covers || []) {
      covers.push({ ...cover, manifestPath });
    }
  }
  return covers;
}

function coverSupportCodes(cover) {
  return [
    cover.supportLang,
    cover.viewerSupportLang,
    ...(Array.isArray(cover.channelSupportLangs) ? cover.channelSupportLangs : []),
  ].map(normalizeCode).filter(Boolean);
}

function sameTargetList(left, right) {
  const normalizeList = (value) => String(value || "")
    .split(",")
    .map(normalizeCode)
    .filter(Boolean)
    .sort()
    .join(",");
  return normalizeList(left) === normalizeList(right);
}

function findCover(covers, metadata) {
  const supportLang = normalizeCode(metadata.supportLang);
  const targetLang = normalizeCode(metadata.targetLang);
  const setId = String(metadata.setId || "");
  const isPolyglot = String(metadata.targetLang || "").includes(",");
  return covers.find((cover) => {
    if (setId && cover.setId && cover.setId !== setId) return false;
    if (cover.uploadEligible === false) return false;
    if (!coverSupportCodes(cover).includes(supportLang)) return false;
    if (isPolyglot || cover.videoType === "polyglot") {
      if (metadata.bundleKey && cover.bundleKey && metadata.bundleKey !== cover.bundleKey) return false;
      return sameTargetList(metadata.targetLang, cover.targetLangsCsv || (cover.targetLangs || []).join(","));
    }
    return normalizeCode(cover.targetLang) === targetLang;
  });
}

function resolveCoverPath(cover) {
  const candidates = [cover.relativePath, cover.path].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  console.log("=== Starting copy of pre-rendered custom thumbnails ===");
  const channelRegistry = loadChannels();
  const metadataFiles = collectMetadataFiles(options.inputDir);
  const covers = loadCovers(options.manifests);
  const report = {
    generatedAt: new Date().toISOString(),
    inputDir: options.inputDir,
    manifests: options.manifests.filter((manifestPath) => fs.existsSync(manifestPath)),
    strictCustom: options.strictCustom,
    totalMetadataFiles: metadataFiles.length,
    copiedCount: 0,
    autoFallbackCount: 0,
    missingCoverCount: 0,
    rows: [],
  };

  if (metadataFiles.length === 0) {
    console.log(`[INFO] No youtube_metadata.json files found in ${options.inputDir}. Make sure you generated videos first!`);
    return;
  }

  for (const metaFile of metadataFiles) {
    let metadata;
    try {
      metadata = JSON.parse(fs.readFileSync(metaFile, "utf8"));
    } catch (e) {
      console.error(`[ERROR] Could not parse: ${metaFile}`);
      continue;
    }

    const supportLang = normalizeCode(metadata.supportLang);
    const targetLang = (metadata.targetLang || "");

    const channel = findChannelForSupport(channelRegistry.channels, supportLang);
    if (!channel || channel.customThumbnailUploadAllowed === false) {
      const updatedMeta = {
        ...metadata,
        thumbnailUploadMode: "first_frame_auto",
        thumbnailSource: "youtube-auto-first-frame",
        thumbnailFallbackReason: channel
          ? "channel_custom_thumbnail_upload_not_available"
          : "channel_custom_thumbnail_status_unknown",
      };
      fs.writeFileSync(metaFile, `${JSON.stringify(updatedMeta, null, 2)}\n`, "utf8");
      console.log(`[AUTO] Channel for support ${supportLang} does not allow custom thumbnails.`);
      report.autoFallbackCount++;
      report.rows.push({
        metadataFile: metaFile,
        supportLang,
        targetLang,
        status: "auto_first_frame",
        reason: updatedMeta.thumbnailFallbackReason,
      });
      continue;
    }

    const cover = findCover(covers, metadata);
    const prototypePath = cover ? resolveCoverPath(cover) : "";

    if (prototypePath && fs.existsSync(prototypePath)) {
      const destDir = path.dirname(metaFile);
      const destThumb = path.join(destDir, "youtube_thumbnail.jpg");

      fs.copyFileSync(prototypePath, destThumb);

      // Update metadata fields to satisfy validation and upload gates
      const updatedMeta = {
        ...metadata,
        thumbnailPath: "youtube_thumbnail.jpg",
        thumbnail: "youtube_thumbnail.jpg",
        thumbnailUploadMode: "custom",
        thumbnailSource: "pre-rendered-design-prototype",
        thumbnailFallbackReason: "",
        thumbnailLogoOverlay: false,
        thumbnailGeneratedAt: new Date().toISOString(),
        thumbnailPrototypeManifest: cover.manifestPath,
        thumbnailPrototypePath: prototypePath,
      };

      fs.writeFileSync(metaFile, `${JSON.stringify(updatedMeta, null, 2)}\n`, "utf8");
      console.log(`[SUCCESS] Copied thumbnail for ${supportLang} -> ${targetLang} from ${prototypePath}`);
      report.copiedCount++;
      report.rows.push({
        metadataFile: metaFile,
        supportLang,
        targetLang,
        status: "copied",
        coverPath: prototypePath,
        manifestPath: cover.manifestPath,
      });
    } else {
      console.log(`[WARN] Pre-rendered thumbnail NOT found for ${supportLang} -> ${targetLang}`);
      report.missingCoverCount++;
      report.rows.push({
        metadataFile: metaFile,
        supportLang,
        targetLang,
        status: "missing_cover",
      });
    }
  }

  if (options.output) {
    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(`=== Done! Copied ${report.copiedCount} custom thumbnails to ${options.inputDir}; auto fallback ${report.autoFallbackCount}; missing covers ${report.missingCoverCount} ===`);
  if (options.strictCustom && report.missingCoverCount > 0) {
    throw new Error(`Missing pre-rendered custom thumbnails for ${report.missingCoverCount} metadata file(s).`);
  }
}

main();
