#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const DEFAULT_ARTIFACT_DIR = ".state-artifact";
const DEFAULT_SUMMARY_PATH = "outputs/youtube-playlist-metadata-state-merge-github.json";

function parseArgs(argv) {
  const options = {
    artifactDir: DEFAULT_ARTIFACT_DIR,
    repoRoot: process.cwd(),
    summary: DEFAULT_SUMMARY_PATH,
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

function usage() {
  return [
    "Usage:",
    "  node scripts/merge-youtube-playlist-metadata-state.mjs --artifact-dir=.state-artifact",
    "",
    "Merges confirmed playlist metadata repair rows from a GitHub Actions artifact",
    "into config/youtube-playlists.json without accepting unverified audit/generate rows.",
  ].join("\n");
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

function normalizeLanguageCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

function playlistKey(row = {}) {
  return String(row.playlist_key || row.key || "").trim();
}

function timestampMs(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function repairTimestamp(row = {}) {
  return row.playlistMetadataRepair?.repairedAt || "";
}

function hasConfirmedRepair(row = {}) {
  return Boolean(
    playlistKey(row)
      && row.youtube_playlist_id
      && row.playlistMetadataRepair?.repairedAt
      && row.title
      && row.description
  );
}

function compatibleRows(current = {}, incoming = {}) {
  const blockers = [];
  if (current.youtube_playlist_id && incoming.youtube_playlist_id && current.youtube_playlist_id !== incoming.youtube_playlist_id) {
    blockers.push(`playlist id mismatch ${current.youtube_playlist_id} != ${incoming.youtube_playlist_id}`);
  }
  for (const field of ["supportLang", "targetLang"]) {
    const currentValue = normalizeLanguageCode(current[field]);
    const incomingValue = normalizeLanguageCode(incoming[field]);
    if (currentValue && incomingValue && currentValue !== incomingValue) {
      blockers.push(`${field} mismatch ${currentValue} != ${incomingValue}`);
    }
  }
  if (current.channelKey && incoming.channelKey && current.channelKey !== incoming.channelKey) {
    blockers.push(`channelKey mismatch ${current.channelKey} != ${incoming.channelKey}`);
  }
  if (current.youtube_channel_id && incoming.youtube_channel_id && current.youtube_channel_id !== incoming.youtube_channel_id) {
    blockers.push(`channel id mismatch ${current.youtube_channel_id} != ${incoming.youtube_channel_id}`);
  }
  return blockers;
}

function applyConfirmedRepair(current, incoming) {
  const fields = [
    "title",
    "description",
    "titleReviewStatus",
    "playlistMetadataRepair",
    "lastReadbackAt",
  ];
  let changed = false;
  for (const field of fields) {
    const next = incoming[field];
    if (next !== undefined && JSON.stringify(current[field]) !== JSON.stringify(next)) {
      current[field] = next;
      changed = true;
    }
  }
  if (incoming.status && current.status !== incoming.status) {
    current.status = incoming.status;
    changed = true;
  }
  return changed;
}

function mergePlaylistMetadata(currentRegistry, incomingRegistry) {
  const currentRows = currentRegistry.playlists || [];
  const incomingRows = incomingRegistry.playlists || [];
  currentRegistry.playlists = currentRows;
  const byKey = new Map(currentRows.map((row) => [playlistKey(row), row]).filter(([key]) => key));
  const summary = {
    updated: 0,
    unchanged: 0,
    skippedUnconfirmed: 0,
    skippedMissingCurrent: 0,
    skippedOlderOrEqual: 0,
    skippedMismatch: 0,
    mismatches: [],
  };

  for (const incoming of incomingRows) {
    if (!hasConfirmedRepair(incoming)) {
      summary.skippedUnconfirmed += 1;
      continue;
    }
    const key = playlistKey(incoming);
    const current = byKey.get(key);
    if (!current) {
      summary.skippedMissingCurrent += 1;
      continue;
    }
    const blockers = compatibleRows(current, incoming);
    if (blockers.length) {
      summary.skippedMismatch += 1;
      summary.mismatches.push({ playlist_key: key, blockers });
      continue;
    }
    const incomingRepairMs = timestampMs(repairTimestamp(incoming));
    const currentRepairMs = timestampMs(repairTimestamp(current));
    const contentDiffers = current.title !== incoming.title || current.description !== incoming.description;
    if (currentRepairMs > incomingRepairMs) {
      summary.skippedOlderOrEqual += 1;
      continue;
    }
    if (currentRepairMs === incomingRepairMs && !contentDiffers) {
      summary.unchanged += 1;
      continue;
    }
    if (applyConfirmedRepair(current, incoming)) summary.updated += 1;
    else summary.unchanged += 1;
  }

  currentRows.sort((a, b) => playlistKey(a).localeCompare(playlistKey(b)));
  return summary;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const repoRoot = path.resolve(options.repoRoot);
  const artifactDir = path.resolve(options.artifactDir);
  const currentPath = path.join(repoRoot, "config/youtube-playlists.json");
  const incomingPath = path.join(artifactDir, "config/youtube-playlists.json");
  const summary = {
    artifactDir,
    incomingPath,
    mergedAt: new Date().toISOString(),
    filesChanged: [],
    playlists: {
      updated: 0,
      unchanged: 0,
      skippedUnconfirmed: 0,
      skippedMissingCurrent: 0,
      skippedOlderOrEqual: 0,
      skippedMismatch: 0,
      mismatches: [],
    },
  };

  if (!fs.existsSync(incomingPath)) {
    summary.missingArtifact = true;
  } else {
    const currentRegistry = fs.existsSync(currentPath)
      ? readJson(currentPath)
      : { schemaVersion: 1, playlists: [] };
    const incomingRegistry = readJson(incomingPath);
    summary.playlists = mergePlaylistMetadata(currentRegistry, incomingRegistry);
    if (writeJsonIfChanged(currentPath, currentRegistry)) summary.filesChanged.push("config/youtube-playlists.json");
  }

  const summaryPath = path.resolve(repoRoot, options.summary);
  writeJsonIfChanged(summaryPath, summary);
  console.log(JSON.stringify(summary, null, 2));
}

main();
