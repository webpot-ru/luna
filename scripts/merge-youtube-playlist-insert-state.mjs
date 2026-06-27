#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const DEFAULT_ARTIFACT_DIR = ".state-artifact";
const DEFAULT_SUMMARY_PATH = "outputs/youtube-playlist-insert-state-merge-github.json";

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
    "  node scripts/merge-youtube-playlist-insert-state.mjs --artifact-dir=.state-artifact",
    "",
    "Merges confirmed playlist-item insert repair rows from a GitHub Actions artifact",
    "into config/youtube-published-videos.json without overwriting newer upload state.",
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

function publicationKey(row = {}) {
  return [
    row.setId || "",
    normalizeLanguageCode(row.supportLang),
    normalizeLanguageCode(row.targetLang),
    row.youtubeVideoId || "",
  ].join("|");
}

function timestampMs(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasConfirmedPlaylistInsertRepair(row = {}) {
  return Boolean(
    row.setId
      && row.supportLang
      && row.targetLang
      && row.youtubeVideoId
      && row.youtubePlaylistId
      && row.playlistItemId
      && row.playlistInsertRepairedAt
      && row.playlistInsertRepairStatus
      && !row.needsPlaylistInsert
  );
}

function compatibleRows(current = {}, incoming = {}) {
  const blockers = [];
  if (current.youtubeVideoId && incoming.youtubeVideoId && current.youtubeVideoId !== incoming.youtubeVideoId) {
    blockers.push(`video id mismatch ${current.youtubeVideoId} != ${incoming.youtubeVideoId}`);
  }
  if (current.youtubePlaylistId && incoming.youtubePlaylistId && current.youtubePlaylistId !== incoming.youtubePlaylistId) {
    blockers.push(`playlist id mismatch ${current.youtubePlaylistId} != ${incoming.youtubePlaylistId}`);
  }
  for (const field of ["supportLang", "targetLang"]) {
    const currentValue = normalizeLanguageCode(current[field]);
    const incomingValue = normalizeLanguageCode(incoming[field]);
    if (currentValue && incomingValue && currentValue !== incomingValue) {
      blockers.push(`${field} mismatch ${currentValue} != ${incomingValue}`);
    }
  }
  if (current.youtubeChannelId && incoming.youtubeChannelId && current.youtubeChannelId !== incoming.youtubeChannelId) {
    blockers.push(`channel id mismatch ${current.youtubeChannelId} != ${incoming.youtubeChannelId}`);
  }
  return blockers;
}

function applyPlaylistInsertRepair(current, incoming) {
  const fields = [
    "youtubePlaylistId",
    "youtubePlaylistUrl",
    "playlistItemId",
    "publicationStatus",
    "status",
    "playlistCreateRepairedAt",
    "playlistCreateRepairStatus",
    "playlistInsertRepairedAt",
    "playlistInsertRepairStatus",
    "playlistInsertRepairGithubRunId",
    "playlistInsertRepairGithubRunUrl",
    "playlistInsertRepairNote",
    "lastReadbackAt",
    "readback",
  ];
  let changed = false;
  for (const field of fields) {
    const next = incoming[field];
    if (next !== undefined && JSON.stringify(current[field]) !== JSON.stringify(next)) {
      current[field] = next;
      changed = true;
    }
  }
  if (current.needsPlaylistCreate !== undefined) {
    delete current.needsPlaylistCreate;
    changed = true;
  }
  if (current.needsPlaylistInsert !== undefined) {
    delete current.needsPlaylistInsert;
    changed = true;
  }
  for (const field of ["playlistCreateDeferredError", "playlistInsertDeferredError"]) {
    if (current[field] !== undefined && incoming[field] === undefined) {
      delete current[field];
      changed = true;
    }
  }
  if (current.postUploadError !== undefined && incoming.postUploadError === undefined) {
    delete current.postUploadError;
    changed = true;
  }
  if (current.readback?.postUploadError !== undefined && incoming.readback?.postUploadError === undefined) {
    delete current.readback.postUploadError;
    changed = true;
  }
  return changed;
}

function mergePublications(currentRegistry, incomingRegistry) {
  const currentRows = currentRegistry.publications || [];
  const incomingRows = incomingRegistry.publications || [];
  currentRegistry.publications = currentRows;
  const byKey = new Map(currentRows.map((row) => [publicationKey(row), row]));
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
    if (!hasConfirmedPlaylistInsertRepair(incoming)) {
      summary.skippedUnconfirmed += 1;
      continue;
    }
    const key = publicationKey(incoming);
    const current = byKey.get(key);
    if (!current) {
      summary.skippedMissingCurrent += 1;
      continue;
    }
    const blockers = compatibleRows(current, incoming);
    if (blockers.length) {
      summary.skippedMismatch += 1;
      summary.mismatches.push({ key, blockers });
      continue;
    }
    const incomingRepairMs = timestampMs(incoming.playlistInsertRepairedAt);
    const currentRepairMs = timestampMs(current.playlistInsertRepairedAt);
    if (currentRepairMs > incomingRepairMs) {
      summary.skippedOlderOrEqual += 1;
      continue;
    }
    if (
      currentRepairMs === incomingRepairMs
      && current.playlistItemId === incoming.playlistItemId
      && !current.needsPlaylistInsert
      && current.postUploadError === undefined
      && current.readback?.postUploadError === undefined
    ) {
      summary.unchanged += 1;
      continue;
    }
    if (applyPlaylistInsertRepair(current, incoming)) summary.updated += 1;
    else summary.unchanged += 1;
  }

  return summary;
}

function mergePlaylists(currentRegistry, incomingRegistry) {
  const currentRows = currentRegistry.playlists || [];
  const incomingRows = incomingRegistry.playlists || [];
  currentRegistry.playlists = currentRows;
  const byKey = new Map(currentRows.map((row) => [row.playlist_key || row.key || "", row]));
  const summary = { created: 0, updated: 0, skipped: 0 };

  for (const incoming of incomingRows) {
    const key = incoming.playlist_key || incoming.key || "";
    if (!key) {
      summary.skipped += 1;
      continue;
    }
    const existing = byKey.get(key);
    if (!existing) {
      currentRows.push(incoming);
      byKey.set(key, incoming);
      summary.created += 1;
      continue;
    }

    let changed = false;
    for (const field of [
      "supportLang",
      "targetLang",
      "courseFamily",
      "levelOrTrack",
      "variantOrYear",
      "channelKey",
      "youtube_channel_id",
      "youtube_playlist_id",
      "title",
      "description",
      "titleReviewStatus",
      "status",
      "createdAt",
      "lastReadbackAt",
    ]) {
      const next = incoming[field];
      if ((existing[field] === undefined || existing[field] === "") && next !== undefined && next !== "") {
        existing[field] = next;
        changed = true;
      }
    }
    if (String(existing.status || "") === "planned" && String(incoming.status || "").startsWith("created_")) {
      existing.status = incoming.status;
      changed = true;
    }
    if (existing.youtube_playlist_id && existing.needsPlaylistCreate !== undefined) {
      delete existing.needsPlaylistCreate;
      changed = true;
    }
    if (existing.youtube_playlist_id && existing.playlistCreateDeferredError !== undefined) {
      delete existing.playlistCreateDeferredError;
      changed = true;
    }
    if (changed) summary.updated += 1;
    else summary.skipped += 1;
  }

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
  const currentPath = path.join(repoRoot, "config/youtube-published-videos.json");
  const incomingPath = path.join(artifactDir, "config/youtube-published-videos.json");
  const currentPlaylistsPath = path.join(repoRoot, "config/youtube-playlists.json");
  const incomingPlaylistsPath = path.join(artifactDir, "config/youtube-playlists.json");
  const summary = {
    artifactDir,
    incomingPath,
    mergedAt: new Date().toISOString(),
    filesChanged: [],
    publications: {
      updated: 0,
      unchanged: 0,
      skippedUnconfirmed: 0,
      skippedMissingCurrent: 0,
      skippedOlderOrEqual: 0,
      skippedMismatch: 0,
      mismatches: [],
    },
    playlists: {
      created: 0,
      updated: 0,
      skipped: 0,
    },
  };

  if (!fs.existsSync(incomingPath)) {
    summary.missingArtifact = true;
  } else {
    const currentRegistry = fs.existsSync(currentPath)
      ? readJson(currentPath)
      : { schemaVersion: 1, publications: [] };
    const incomingRegistry = readJson(incomingPath);
    summary.publications = mergePublications(currentRegistry, incomingRegistry);
    if (writeJsonIfChanged(currentPath, currentRegistry)) summary.filesChanged.push("config/youtube-published-videos.json");
  }
  if (fs.existsSync(incomingPlaylistsPath)) {
    const currentPlaylists = fs.existsSync(currentPlaylistsPath)
      ? readJson(currentPlaylistsPath)
      : { schemaVersion: 1, playlists: [] };
    const incomingPlaylists = readJson(incomingPlaylistsPath);
    summary.playlists = mergePlaylists(currentPlaylists, incomingPlaylists);
    if (writeJsonIfChanged(currentPlaylistsPath, currentPlaylists)) summary.filesChanged.push("config/youtube-playlists.json");
  }

  const summaryPath = path.resolve(repoRoot, options.summary);
  writeJsonIfChanged(summaryPath, summary);
  console.log(JSON.stringify(summary, null, 2));
}

main();
