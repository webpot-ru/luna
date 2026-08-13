#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { findChannelForCanonicalSupport } from "./lib/youtube-support-routing.mjs";

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".webm"]);

function parseArgs(argv) {
  const options = {
    inputs: [],
    maxDurationSeconds: 895,
    contentScope: "full",
    channelConfig: "config/youtube-channels.json",
    ffprobe: "ffprobe",
    writeMetadata: false,
    requireMeasuredSelection: false,
    output: "",
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      if (arg.includes("=")) return arg.split("=").slice(1).join("=");
      index += 1;
      return argv[index];
    };
    if (arg === "--max-duration-seconds" || arg.startsWith("--max-duration-seconds=")) options.maxDurationSeconds = Number(readValue());
    else if (arg === "--content-scope" || arg.startsWith("--content-scope=")) options.contentScope = readValue();
    else if (arg === "--channel-config" || arg.startsWith("--channel-config=")) options.channelConfig = readValue();
    else if (arg === "--ffprobe" || arg.startsWith("--ffprobe=")) options.ffprobe = readValue();
    else if (arg === "--write-metadata") options.writeMetadata = true;
    else if (arg === "--require-measured-selection") options.requireMeasuredSelection = true;
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
    "  node scripts/check-polyglot-video-duration.mjs <metadata-or-dir> --content-scope full --max-duration-seconds 895",
    "",
    "Videos at or below the threshold are always allowed. Longer full videos require",
    "channel.longVideoUploadAllowed=true. short_unverified is always capped.",
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
    } else if (path.basename(resolved) === "youtube_metadata.json") files.push(resolved);
    else throw new Error(`Expected youtube_metadata.json or a directory: ${input}`);
  }
  return [...new Set(files)].sort();
}

function defaultVideoPath(metadataFile, metadata) {
  if (metadata.videoPath && fs.existsSync(metadata.videoPath)) return path.resolve(metadata.videoPath);
  const dir = path.dirname(metadataFile);
  return fs.readdirSync(dir)
    .filter((name) => VIDEO_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .map((name) => path.join(dir, name))
    .sort()[0] || "";
}

function loadMeasuredSelection(metadataFile, metadata) {
  const candidateDirectories = [path.dirname(metadataFile)];
  if (metadata?.videoPath) candidateDirectories.push(path.dirname(path.resolve(metadata.videoPath)));
  const selectionPaths = [...new Set(candidateDirectories.map((directory) => path.join(directory, "polyglot-duration-selection.json")))];
  for (const selectionPath of selectionPaths) {
    if (!fs.existsSync(selectionPath)) continue;
    const selection = JSON.parse(fs.readFileSync(selectionPath, "utf8"));
    return { selectionPath, selection };
  }
  return { selectionPath: selectionPaths[0], selection: null };
}

function probeDuration(videoPath, ffprobe) {
  const result = spawnSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", videoPath], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`ffprobe failed for ${videoPath}: ${result.stderr || result.stdout}`);
  const duration = Number(String(result.stdout || "").trim());
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Could not read positive duration for ${videoPath}`);
  return duration;
}

function capabilityStatus(channel) {
  if (channel?.longVideoUploadAllowed === true) return "confirmed_allowed";
  if (channel?.longVideoUploadAllowed === false) return "confirmed_blocked";
  return "unknown";
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || options.inputs.length === 0) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }
  if (!Number.isFinite(options.maxDurationSeconds) || options.maxDurationSeconds <= 0) throw new Error("--max-duration-seconds must be a positive number.");
  if (!["full", "short_unverified"].includes(options.contentScope)) throw new Error("--content-scope must be full or short_unverified.");

  const channelRegistry = JSON.parse(fs.readFileSync(options.channelConfig, "utf8"));
  const metadataFiles = collectMetadataFiles(options.inputs);
  const results = metadataFiles.map((metadataFile) => {
    const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
    const videoPath = defaultVideoPath(metadataFile, metadata);
    const { selectionPath, selection } = loadMeasuredSelection(metadataFile, metadata);
    const channel = findChannelForCanonicalSupport(channelRegistry, metadata.supportLang);
    const longVideoCapability = capabilityStatus(channel);
    const blockers = [];
    let durationSeconds = 0;
    if (!channel) blockers.push(`missing channel capability row for support ${metadata.supportLang || "(missing)"}`);
    if (!videoPath) blockers.push("missing rendered Polyglot video file");
    else {
      durationSeconds = probeDuration(videoPath, options.ffprobe);
      if (options.contentScope === "short_unverified" && durationSeconds > options.maxDurationSeconds) {
        blockers.push(`duration ${durationSeconds.toFixed(3)}s exceeds short limit ${options.maxDurationSeconds}s`);
      }
      if (options.contentScope === "full" && durationSeconds > options.maxDurationSeconds && channel?.longVideoUploadAllowed !== true) {
        blockers.push(`duration ${durationSeconds.toFixed(3)}s exceeds ${options.maxDurationSeconds}s and long-video upload capability is ${longVideoCapability}`);
      }
    }
    if (options.contentScope === "short_unverified" && options.requireMeasuredSelection) {
      if (!selection) blockers.push("missing measured Polyglot duration selection");
      else {
        if (selection.selectionMethod !== "measured_tts_audio_prefix") blockers.push("unsupported measured Polyglot duration selection method");
        if (Number(selection.selectedCardCount) < 1) blockers.push("measured Polyglot duration selection contains no cards");
        if (Number(selection.projectedDurationSeconds) > options.maxDurationSeconds) {
          blockers.push(`measured projected duration ${selection.projectedDurationSeconds}s exceeds short limit ${options.maxDurationSeconds}s`);
        }
      }
    }
    const status = blockers.length ? "blocked" : "ok";
    const gate = {
      status,
      checkedAt: new Date().toISOString(),
      contentScope: options.contentScope,
      maxDurationSeconds: options.maxDurationSeconds,
      videoDurationSeconds: durationSeconds ? Number(durationSeconds.toFixed(3)) : null,
      longVideoCapability,
      channelKey: channel?.key || "",
      durationSelectionPath: selection ? selectionPath : "",
      durationSelection: selection,
      blockers,
    };
    if (options.writeMetadata && videoPath) {
      metadata.contentScope = options.contentScope;
      metadata.videoDurationSeconds = gate.videoDurationSeconds;
      metadata.maxDurationSeconds = options.maxDurationSeconds;
      metadata.durationGate = gate;
      if (selection?.selectionMethod === "measured_tts_audio_prefix") {
        metadata.wordCount = Number(selection.selectedCardCount) || metadata.wordCount || 0;
        metadata.wordLimit = Number(selection.selectedCardCount) || metadata.wordLimit || 0;
        metadata.durationSelection = selection;
      }
      fs.writeFileSync(metadataFile, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    }
    return { metadataFile, videoPath, ...gate };
  });
  const blockers = results.flatMap((result) => result.blockers.map((blocker) => `${result.metadataFile}: ${blocker}`));
  if (!metadataFiles.length) blockers.push("no youtube_metadata.json files found");
  const report = {
    generatedAt: new Date().toISOString(),
    status: blockers.length ? "blocked" : "ok",
    contentScope: options.contentScope,
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
  else console.log(`Polyglot duration/capability check: ${report.status}; results=${report.resultCount}; blockers=${report.blockerCount}`);
  if (blockers.length) process.exit(1);
}

main();
