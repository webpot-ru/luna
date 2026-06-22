#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_YOUTUBE_THUMBNAIL_BYTES = 2 * 1024 * 1024;

const options = {
  inputs: [],
  output: "",
  strictWarnings: false,
  allowAutoFirstFrame: false,
};

for (const arg of process.argv.slice(2)) {
  if (arg === "--strict-warnings") options.strictWarnings = true;
  else if (arg === "--allow-auto-first-frame") options.allowAutoFirstFrame = true;
  else if (arg.startsWith("--output=")) options.output = arg.slice("--output=".length);
  else if (arg === "--help" || arg === "-h") options.help = true;
  else options.inputs.push(arg);
}

function usage() {
  return [
    "Usage:",
    "  node scripts/check-youtube-thumbnails.mjs <metadata-file-or-dir> [...] [--output=report.json] [--strict-warnings] [--allow-auto-first-frame]",
    "",
    "Checks that each youtube_metadata.json has a custom 16:9 thumbnail next to it or in metadata.thumbnailPath.",
    "With --allow-auto-first-frame, metadata.thumbnailUploadMode=first_frame_auto is accepted for channels without custom thumbnail permission.",
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

function resolveMaybeProjectPath(filePath, metadataFile) {
  if (!filePath || typeof filePath !== "string") return "";
  if (path.isAbsolute(filePath)) return filePath;
  const fromProject = path.resolve(filePath);
  if (fs.existsSync(fromProject)) return fromProject;
  return path.resolve(path.dirname(metadataFile), filePath);
}

function findThumbnailFile(metadataFile, metadata) {
  const explicit = metadata.thumbnailPath || metadata.thumbnail || metadata.thumbnailFile;
  const explicitPath = resolveMaybeProjectPath(explicit, metadataFile);
  if (explicitPath && fs.existsSync(explicitPath)) return explicitPath;
  const dir = path.dirname(metadataFile);
  const images = fs.readdirSync(dir)
    .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .filter((name) => /(?:^|[-_])(thumbnail|thumb|cover|poster)(?:[-_.]|$)/iu.test(name))
    .map((name) => path.join(dir, name))
    .sort();
  return images[0] || "";
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (
      marker === 0xc0
      || marker === 0xc1
      || marker === 0xc2
      || marker === 0xc3
      || marker === 0xc5
      || marker === 0xc6
      || marker === 0xc7
      || marker === 0xc9
      || marker === 0xca
      || marker === 0xcb
      || marker === 0xcd
      || marker === 0xce
      || marker === 0xcf
    ) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
        format: "jpeg",
      };
    }
    if (!length || length < 2) break;
    offset += 2 + length;
  }
  return null;
}

function pngDimensions(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    format: "png",
  };
}

function imageDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  return jpegDimensions(buffer) || pngDimensions(buffer) || null;
}

function validate(metadataFile) {
  const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
  const blockers = [];
  const warnings = [];
  const thumbnailPath = findThumbnailFile(metadataFile, metadata);
  const autoFirstFrame = metadata.thumbnailUploadMode === "first_frame_auto"
    || metadata.thumbnailSource === "youtube-auto-first-frame";
  let sizeBytes = 0;
  let dimensions = null;

  if (!thumbnailPath) {
    if (options.allowAutoFirstFrame && autoFirstFrame) {
      warnings.push("custom thumbnail file absent by policy; YouTube auto first-frame thumbnail fallback will be used");
    } else {
      blockers.push("missing custom thumbnail file");
    }
  } else {
    sizeBytes = fs.statSync(thumbnailPath).size;
    if (sizeBytes > MAX_YOUTUBE_THUMBNAIL_BYTES) {
      blockers.push(`thumbnail exceeds 2MB YouTube limit: ${sizeBytes}`);
    }
    dimensions = imageDimensions(thumbnailPath);
    if (!dimensions) {
      warnings.push("thumbnail dimensions could not be read; only JPEG/PNG dimension checks are built in");
    } else {
      const ratio = dimensions.width / dimensions.height;
      if (dimensions.width < 1280 || dimensions.height < 720) {
        blockers.push(`thumbnail below recommended 1280x720: ${dimensions.width}x${dimensions.height}`);
      }
      if (Math.abs(ratio - (16 / 9)) > 0.02) {
        blockers.push(`thumbnail is not 16:9: ${dimensions.width}x${dimensions.height}`);
      }
    }
  }

  if (!metadata.thumbnailPath && !metadata.thumbnail && thumbnailPath) {
    warnings.push("thumbnail exists but metadata does not carry thumbnailPath");
  }

  return {
    file: metadataFile,
    status: blockers.length ? "fail" : "pass",
    blockers,
    warnings,
    metrics: {
      thumbnailPath,
      sizeBytes,
      dimensions,
    },
  };
}

try {
  if (options.help || options.inputs.length === 0) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }
  const files = collectMetadataFiles(options.inputs);
  if (files.length === 0) throw new Error("No youtube_metadata.json files found.");
  const results = files.map(validate);
  const blockerCount = results.reduce((sum, result) => sum + result.blockers.length, 0);
  const warningCount = results.reduce((sum, result) => sum + result.warnings.length, 0);
  const report = {
    status: blockerCount || (options.strictWarnings && warningCount) ? "fail" : "pass",
    fileCount: files.length,
    summary: {
      blockerCount,
      warningCount,
      strictWarnings: options.strictWarnings,
      allowAutoFirstFrame: options.allowAutoFirstFrame,
      thumbnailCount: results.filter((result) => result.metrics.thumbnailPath).length,
      autoFirstFrameCount: results.filter((result) => {
        const metadata = JSON.parse(fs.readFileSync(result.file, "utf8"));
        return metadata.thumbnailUploadMode === "first_frame_auto"
          || metadata.thumbnailSource === "youtube-auto-first-frame";
      }).length,
    },
    results,
  };
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (options.output) {
    fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
    fs.writeFileSync(options.output, json, "utf8");
  }
  console.log(json);
  if (report.status === "fail") process.exit(1);
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
