#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DEFAULT_ARTIFACT_DIR = ".state-artifact";
const DEFAULT_SUMMARY = "outputs/youtube-playlist-image-state-merge-github.json";
const REGISTRY_PATHS = [
  "config/youtube-playlists.json",
  "config/youtube-polyglot-playlists.json",
];

function parseArgs(argv) {
  const options = {
    artifactDir: DEFAULT_ARTIFACT_DIR,
    repoRoot: process.cwd(),
    summary: DEFAULT_SUMMARY,
  };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--artifact-dir=")) options.artifactDir = arg.slice("--artifact-dir=".length);
    else if (arg.startsWith("--repo-root=")) options.repoRoot = arg.slice("--repo-root=".length);
    else if (arg.startsWith("--summary=")) options.summary = arg.slice("--summary=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonIfChanged(filePath, data) {
  const next = `${JSON.stringify(data, null, 2)}\n`;
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  if (current === next) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, next, "utf8");
  return true;
}

function playlistKey(row = {}) {
  return String(row.playlist_key || row.key || "").trim();
}

function timestampMs(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function confirmedImage(row = {}) {
  return Boolean(
    playlistKey(row)
      && row.youtube_playlist_id
      && row.playlistImage?.status === "uploaded"
      && row.playlistImage?.imageId
      && row.playlistImage?.uploadedAt
  );
}

function compatible(current = {}, incoming = {}) {
  const blockers = [];
  if (current.youtube_playlist_id && incoming.youtube_playlist_id && current.youtube_playlist_id !== incoming.youtube_playlist_id) {
    blockers.push(`playlist id mismatch ${current.youtube_playlist_id} != ${incoming.youtube_playlist_id}`);
  }
  if (current.channelKey && incoming.channelKey && current.channelKey !== incoming.channelKey) {
    blockers.push(`channelKey mismatch ${current.channelKey} != ${incoming.channelKey}`);
  }
  if (current.youtube_channel_id && incoming.youtube_channel_id && current.youtube_channel_id !== incoming.youtube_channel_id) {
    blockers.push(`channel id mismatch ${current.youtube_channel_id} != ${incoming.youtube_channel_id}`);
  }
  return blockers;
}

function mergeRegistry(currentRegistry, incomingRegistry) {
  const currentRows = currentRegistry.playlists || [];
  const incomingRows = incomingRegistry.playlists || [];
  const byKey = new Map(currentRows.map((row) => [playlistKey(row), row]).filter(([key]) => key));
  const summary = {
    updated: 0,
    unchanged: 0,
    skippedUnconfirmed: 0,
    skippedMissingCurrent: 0,
    skippedOlder: 0,
    skippedMismatch: 0,
    mismatches: [],
  };

  for (const incoming of incomingRows) {
    if (!confirmedImage(incoming)) {
      summary.skippedUnconfirmed += 1;
      continue;
    }
    const key = playlistKey(incoming);
    const current = byKey.get(key);
    if (!current) {
      summary.skippedMissingCurrent += 1;
      continue;
    }
    const blockers = compatible(current, incoming);
    if (blockers.length) {
      summary.skippedMismatch += 1;
      summary.mismatches.push({ playlistKey: key, blockers });
      continue;
    }
    const incomingMs = timestampMs(incoming.playlistImage.uploadedAt);
    const currentMs = timestampMs(current.playlistImage?.uploadedAt);
    if (currentMs > incomingMs) {
      summary.skippedOlder += 1;
      continue;
    }
    const nextImage = incoming.playlistImage;
    const nextReadback = incoming.lastReadbackAt || nextImage.uploadedAt;
    const changed = JSON.stringify(current.playlistImage) !== JSON.stringify(nextImage)
      || current.lastReadbackAt !== nextReadback;
    if (!changed) {
      summary.unchanged += 1;
      continue;
    }
    current.playlistImage = nextImage;
    current.lastReadbackAt = nextReadback;
    summary.updated += 1;
  }
  return summary;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: node scripts/merge-youtube-playlist-image-state.mjs --artifact-dir=.state-artifact");
    return;
  }
  const repoRoot = path.resolve(options.repoRoot);
  const artifactDir = path.resolve(options.artifactDir);
  const summary = {
    artifactDir,
    mergedAt: new Date().toISOString(),
    filesChanged: [],
    registries: {},
  };

  for (const relativePath of REGISTRY_PATHS) {
    const currentPath = path.join(repoRoot, relativePath);
    const incomingPath = path.join(artifactDir, relativePath);
    if (!fs.existsSync(incomingPath)) {
      summary.registries[relativePath] = { missingArtifact: true };
      continue;
    }
    const current = readJson(currentPath);
    const incoming = readJson(incomingPath);
    summary.registries[relativePath] = mergeRegistry(current, incoming);
    if (writeJsonIfChanged(currentPath, current)) summary.filesChanged.push(relativePath);
  }

  const summaryPath = path.resolve(repoRoot, options.summary);
  writeJsonIfChanged(summaryPath, summary);
  console.log(JSON.stringify(summary, null, 2));
}

main();
