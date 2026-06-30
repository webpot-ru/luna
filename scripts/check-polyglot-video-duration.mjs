#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".webm"]);

function parseArgs(argv) {
  const options = {
    inputs: [],
    maxDurationSeconds: 0,
    writeMetadata: false,
    output: "",
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      if (arg.includes("=")) return arg.split("=").slice(1).join("=");
      index += 1;
      return argv[index];
    };
    if (arg === "--max-duration-seconds" || arg.startsWith("--max-duration-seconds=")) {
      options.maxDurationSeconds = Number(readValue());
    } else if (arg === "--write-metadata") options.writeMetadata = true;
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = readValue();
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else options.inputs.push(arg);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/check-polyglot-video-duration.mjs <youtube_metadata.json-or-dir> --max-duration-seconds 895 [--write-metadata]",
    "",
    "Checks rendered Polyglot mp4 duration before upload. With --write-metadata,",
    "writes videoDurationSeconds/maxDurationSeconds/durationGate into youtube_metadata.json.",
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

function defaultVideoPath(metadataFile, metadata) {
  if (metadata.videoPath && fs.existsSync(metadata.videoPath)) return path.resolve(metadata.videoPath);
  const dir = path.dirname(metadataFile);
  const videos = fs.readdirSync(dir)
    .filter((name) => VIDEO_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .map((name) => path.join(dir, name))
    .sort();
  return videos[0] || "";
}

function probeDuration(videoPath) {
  const result = spawnSync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    videoPath,
  ], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`ffprobe failed for ${videoPath}: ${result.stderr || result.stdout}`);
  }
  const duration = Number(String(result.stdout || "").trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Could not read positive duration for ${videoPath}`);
  }
  return duration;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || options.inputs.length === 0) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }
  if (!Number.isFinite(options.maxDurationSeconds) || options.maxDurationSeconds <= 0) {
    throw new Error("--max-duration-seconds must be a positive number.");
  }

  const results = collectMetadataFiles(options.inputs).map((metadataFile) => {
    const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
    const videoPath = defaultVideoPath(metadataFile, metadata);
    const blockers = [];
    let durationSeconds = 0;
    if (!videoPath) {
      blockers.push("missing rendered Polyglot video file");
    } else {
      durationSeconds = probeDuration(videoPath);
      if (durationSeconds > options.maxDurationSeconds) {
        blockers.push(`duration ${durationSeconds.toFixed(3)}s exceeds max ${options.maxDurationSeconds}s`);
      }
    }
    const status = blockers.length ? "blocked" : "ok";
    if (options.writeMetadata && videoPath) {
      metadata.videoDurationSeconds = Number(durationSeconds.toFixed(3));
      metadata.maxDurationSeconds = options.maxDurationSeconds;
      metadata.durationGate = {
        status,
        checkedAt: new Date().toISOString(),
        maxDurationSeconds: options.maxDurationSeconds,
        videoDurationSeconds: metadata.videoDurationSeconds,
      };
      fs.writeFileSync(metadataFile, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    }
    return {
      metadataFile,
      videoPath,
      durationSeconds: durationSeconds ? Number(durationSeconds.toFixed(3)) : null,
      maxDurationSeconds: options.maxDurationSeconds,
      status,
      blockers,
    };
  });

  const blockers = results.flatMap((result) => result.blockers.map((blocker) => `${result.metadataFile}: ${blocker}`));
  const report = {
    generatedAt: new Date().toISOString(),
    status: blockers.length ? "blocked" : "ok",
    maxDurationSeconds: options.maxDurationSeconds,
    resultCount: results.length,
    blockerCount: blockers.length,
    blockers,
    results,
  };
  const output = options.output || path.join("outputs", "polyglot-video-duration-check.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Polyglot duration check: ${report.status}`);
    for (const result of results) {
      console.log(`${result.durationSeconds ?? "missing"}s <= ${result.maxDurationSeconds}s ${result.videoPath || result.metadataFile}`);
    }
    if (blockers.length) console.log(`blockers=${blockers.join("; ")}`);
  }
  if (blockers.length) process.exit(1);
}

main();
