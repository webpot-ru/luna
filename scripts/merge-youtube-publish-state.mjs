#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const DEFAULT_ARTIFACT_DIR = ".state-artifact";
const DEFAULT_SUMMARY_PATH = "outputs/youtube-publish-state-merge-github.json";

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
    "  node scripts/merge-youtube-publish-state.mjs --artifact-dir=.state-artifact",
    "",
    "Merges non-secret YouTube publish state from a GitHub Actions artifact into",
    "the current checkout without overwriting newer local state for existing keys.",
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

function assignmentKey(row = {}) {
  if (row.videoType === "polyglot" || String(row.polyglotKey || "").startsWith("polyglot:")) {
    return row.polyglotKey || [
      "polyglot",
      row.setId || "",
      normalizeLanguageCode(row.supportLang),
      row.bundleKey || "",
      row.targetLangsHash || "",
    ].join(":");
  }
  return [
    row.setId || "",
    normalizeLanguageCode(row.supportLang),
    normalizeLanguageCode(row.targetLang),
    row.channelKey || "",
  ].join("|");
}

function publicationKey(row = {}) {
  if (row.videoType === "polyglot" || String(row.polyglotKey || "").startsWith("polyglot:")) {
    return [
      row.polyglotKey || assignmentKey(row),
      row.youtubeVideoId || "",
    ].join("|");
  }
  return [
    row.setId || "",
    normalizeLanguageCode(row.supportLang),
    normalizeLanguageCode(row.targetLang),
    row.youtubeVideoId || "",
  ].join("|");
}

function isEmpty(value) {
  return value === undefined || value === null || value === "";
}

function fillMissing(existing, incoming, fields) {
  let changed = false;
  for (const field of fields) {
    if (isEmpty(existing[field]) && !isEmpty(incoming[field])) {
      existing[field] = incoming[field];
      changed = true;
    }
  }
  return changed;
}

function mergePublications(currentRegistry, incomingRegistry) {
  const currentRows = currentRegistry.publications || [];
  const incomingRows = (incomingRegistry.publications || []).filter((row) => row?.youtubeVideoId);
  currentRegistry.publications = currentRows;
  const byKey = new Map(currentRows.map((row) => [publicationKey(row), row]));
  const summary = { created: 0, updated: 0, skipped: 0 };

  for (const incoming of incomingRows) {
    const key = publicationKey(incoming);
    const existing = byKey.get(key);
    if (!existing) {
      currentRows.push(incoming);
      byKey.set(key, incoming);
      summary.created += 1;
      continue;
    }

    let changed = fillMissing(existing, incoming, [
      "title",
      "videoType",
      "polyglotKey",
      "bundleKey",
      "bundleLabel",
      "targetLangsCsv",
      "targetLangsHash",
      "youtubeVideoUrl",
      "youtubePlaylistId",
      "youtubePlaylistUrl",
      "playlistItemId",
      "youtubeChannelId",
      "channelHandle",
      "privacyStatus",
      "publishAt",
      "scheduledPublishAt",
      "desiredPrivacyStatus",
      "thumbnailUploadMode",
      "thumbnailSource",
      "thumbnailFallbackReason",
      "metadataSource",
      "metadataModel",
      "githubRunId",
      "githubRunUrl",
      "uploadedAt",
      "lastReadbackAt",
    ]);
    if (existing.thumbnailSet !== true && incoming.thumbnailSet === true) {
      existing.thumbnailSet = true;
      changed = true;
    }
    if (!existing.readback && incoming.readback) {
      existing.readback = incoming.readback;
      changed = true;
    }
    if (changed) summary.updated += 1;
    else summary.skipped += 1;
  }

  return summary;
}

function publicationByAssignment(registry) {
  const byAssignment = new Map();
  for (const row of registry.publications || []) {
    if (!row?.youtubeVideoId) continue;
    const key = assignmentKey(row);
    const previous = byAssignment.get(key);
    const previousTime = Date.parse(previous?.lastReadbackAt || previous?.uploadedAt || 0) || 0;
    const rowTime = Date.parse(row.lastReadbackAt || row.uploadedAt || 0) || 0;
    if (!previous || rowTime >= previousTime) byAssignment.set(key, row);
  }
  return byAssignment;
}

function enrichCalendarRow(row, publication) {
  if (!publication) return false;
  return fillMissing(row, publication, [
    "youtubeVideoId",
    "youtubePlaylistId",
    "playlistItemId",
  ]);
}

function hasCalendarBackingPublication(row, publication) {
  return Boolean(row?.youtubeVideoId || publication?.youtubeVideoId);
}

function mergeCalendar(currentCalendar, incomingCalendar, currentPublications) {
  const currentRows = currentCalendar.reservations || [];
  const incomingRows = incomingCalendar.reservations || [];
  currentCalendar.reservations = currentRows;
  const byAssignment = new Map(currentRows.map((row) => [assignmentKey(row), row]));
  const publicationsByAssignment = publicationByAssignment(currentPublications);
  const summary = { created: 0, updated: 0, skipped: 0 };

  for (const incoming of incomingRows) {
    const isPolyglot = incoming.videoType === "polyglot" || String(incoming.polyglotKey || "").startsWith("polyglot:");
    if (!incoming?.setId || !incoming?.supportLang || !incoming?.channelKey || (!incoming?.targetLang && !isPolyglot)) {
      summary.skipped += 1;
      continue;
    }
    const key = assignmentKey(incoming);
    const publication = publicationsByAssignment.get(key);
    const existing = byAssignment.get(key);
    if (!existing) {
      if (!hasCalendarBackingPublication(incoming, publication)) {
        summary.skipped += 1;
        continue;
      }
      const next = { ...incoming };
      enrichCalendarRow(next, publication);
      currentRows.push(next);
      byAssignment.set(key, next);
      summary.created += 1;
      continue;
    }

    let changed = fillMissing(existing, incoming, [
      "youtubeChannelId",
      "publishAt",
      "timeZone",
      "localDate",
      "localTime",
      "localSlotIndex",
      "localDayOffset",
      "slotOrdinal",
      "source",
      "policyPath",
      "metadataFile",
      "title",
      "playlist_key",
      "githubRunId",
      "githubRunUrl",
      "createdAt",
      "updatedAt",
    ]);
    if (!Array.isArray(existing.analyticsCheckpointsAt) || existing.analyticsCheckpointsAt.length === 0) {
      if (Array.isArray(incoming.analyticsCheckpointsAt) && incoming.analyticsCheckpointsAt.length > 0) {
        existing.analyticsCheckpointsAt = incoming.analyticsCheckpointsAt;
        changed = true;
      }
    }
    changed = enrichCalendarRow(existing, publication) || changed;
    if (changed) summary.updated += 1;
    else summary.skipped += 1;
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

    let changed = fillMissing(existing, incoming, [
      "supportLang",
      "targetLang",
      "videoType",
      "polyglotKey",
      "bundleKey",
      "bundleLabel",
      "targetLangsCsv",
      "targetLangsHash",
      "courseFamily",
      "levelOrTrack",
      "variantOrYear",
      "channelKey",
      "youtube_channel_id",
      "youtube_playlist_id",
      "title",
      "description",
      "titleReviewStatus",
      "createdAt",
      "lastReadbackAt",
    ]);
    if (String(existing.status || "") === "planned" && String(incoming.status || "").startsWith("created_")) {
      existing.status = incoming.status;
      changed = true;
    }
    if (changed) summary.updated += 1;
    else summary.skipped += 1;
  }

  return summary;
}

function mergePolyglotProgress(currentRegistry, incomingRegistry) {
  const currentRows = currentRegistry.items || [];
  const incomingRows = incomingRegistry.items || [];
  currentRegistry.items = currentRows;
  const byKey = new Map(currentRows.map((row) => [row.polyglotKey || "", row]));
  const summary = { created: 0, updated: 0, skipped: 0 };

  for (const incoming of incomingRows) {
    const key = incoming.polyglotKey || "";
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
    let changed = fillMissing(existing, incoming, [
      "videoType",
      "setId",
      "supportLang",
      "bundleKey",
      "bundleLabel",
      "targetLangsCsv",
      "targetLangsHash",
      "youtubeVideoId",
      "youtubeVideoUrl",
      "youtubePlaylistId",
      "playlistItemId",
      "channelKey",
      "privacyStatus",
      "publishAt",
      "githubRunId",
      "githubRunUrl",
      "createdAt",
    ]);
    for (const field of ["status", "updatedAt"]) {
      if (!isEmpty(incoming[field]) && existing[field] !== incoming[field]) {
        existing[field] = incoming[field];
        changed = true;
      }
    }
    if (!Array.isArray(existing.targetLangs) && Array.isArray(incoming.targetLangs)) {
      existing.targetLangs = incoming.targetLangs;
      changed = true;
    }
    if (changed) summary.updated += 1;
    else summary.skipped += 1;
  }

  return summary;
}

function mergeChannels(currentRegistry, incomingRegistry) {
  const currentRows = currentRegistry.channels || [];
  const incomingRows = incomingRegistry.channels || [];
  const byKey = new Map(currentRows.map((row) => [row.key || "", row]));
  const summary = { updated: 0, skipped: 0 };

  for (const incoming of incomingRows) {
    const key = incoming.key || "";
    const existing = byKey.get(key);
    if (!key || !existing) {
      summary.skipped += 1;
      continue;
    }
    let changed = false;
    if (incoming.customThumbnailUploadAllowed === false && existing.customThumbnailUploadAllowed !== false) {
      existing.customThumbnailUploadAllowed = false;
      changed = true;
    }
    if (incoming.thumbnailFallbackMode && !existing.thumbnailFallbackMode) {
      existing.thumbnailFallbackMode = incoming.thumbnailFallbackMode;
      changed = true;
    }
    if (Array.isArray(incoming.notes) && incoming.notes.length) {
      existing.notes = Array.isArray(existing.notes) ? existing.notes : [];
      for (const note of incoming.notes) {
        if (!existing.notes.includes(note)) {
          existing.notes.push(note);
          changed = true;
        }
      }
    }
    if (changed) summary.updated += 1;
    else summary.skipped += 1;
  }

  return summary;
}

function loadPair(repoRoot, artifactDir, relativePath, fallback) {
  const currentPath = path.join(repoRoot, relativePath);
  const incomingPath = path.join(artifactDir, relativePath);
  const current = fs.existsSync(currentPath) ? readJson(currentPath) : fallback();
  const incoming = fs.existsSync(incomingPath) ? readJson(incomingPath) : fallback();
  return { currentPath, incomingPath, current, incoming, hasIncoming: fs.existsSync(incomingPath) };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const repoRoot = path.resolve(options.repoRoot);
  const artifactDir = path.resolve(options.artifactDir);
  const summary = {
    artifactDir,
    mergedAt: new Date().toISOString(),
    filesChanged: [],
    publications: { created: 0, updated: 0, skipped: 0 },
    calendar: { created: 0, updated: 0, skipped: 0 },
    playlists: { created: 0, updated: 0, skipped: 0 },
    channels: { updated: 0, skipped: 0 },
    polyglotPublications: { created: 0, updated: 0, skipped: 0 },
    polyglotProgress: { created: 0, updated: 0, skipped: 0 },
    polyglotPlaylists: { created: 0, updated: 0, skipped: 0 },
  };

  const publications = loadPair(repoRoot, artifactDir, "config/youtube-published-videos.json", () => ({
    schemaVersion: 1,
    publications: [],
  }));
  if (publications.hasIncoming) {
    summary.publications = mergePublications(publications.current, publications.incoming);
    if (writeJsonIfChanged(publications.currentPath, publications.current)) summary.filesChanged.push("config/youtube-published-videos.json");
  }

  const calendar = loadPair(repoRoot, artifactDir, "config/youtube-publish-calendar.json", () => ({
    schemaVersion: 1,
    reservations: [],
  }));
  if (calendar.hasIncoming) {
    summary.calendar = mergeCalendar(calendar.current, calendar.incoming, publications.current);
    if (writeJsonIfChanged(calendar.currentPath, calendar.current)) summary.filesChanged.push("config/youtube-publish-calendar.json");
  }

  const playlists = loadPair(repoRoot, artifactDir, "config/youtube-playlists.json", () => ({
    schemaVersion: 1,
    playlists: [],
  }));
  if (playlists.hasIncoming) {
    summary.playlists = mergePlaylists(playlists.current, playlists.incoming);
    if (writeJsonIfChanged(playlists.currentPath, playlists.current)) summary.filesChanged.push("config/youtube-playlists.json");
  }

  const channels = loadPair(repoRoot, artifactDir, "config/youtube-channels.json", () => ({
    schemaVersion: 1,
    channels: [],
  }));
  if (channels.hasIncoming) {
    summary.channels = mergeChannels(channels.current, channels.incoming);
    if (writeJsonIfChanged(channels.currentPath, channels.current)) summary.filesChanged.push("config/youtube-channels.json");
  }

  const polyglotPublications = loadPair(repoRoot, artifactDir, "config/youtube-polyglot-published-videos.json", () => ({
    schemaVersion: 1,
    publications: [],
  }));
  if (polyglotPublications.hasIncoming) {
    summary.polyglotPublications = mergePublications(polyglotPublications.current, polyglotPublications.incoming);
    if (writeJsonIfChanged(polyglotPublications.currentPath, polyglotPublications.current)) {
      summary.filesChanged.push("config/youtube-polyglot-published-videos.json");
    }
  }

  const polyglotProgress = loadPair(repoRoot, artifactDir, "config/youtube-polyglot-progress.json", () => ({
    schemaVersion: 1,
    items: [],
  }));
  if (polyglotProgress.hasIncoming) {
    summary.polyglotProgress = mergePolyglotProgress(polyglotProgress.current, polyglotProgress.incoming);
    if (writeJsonIfChanged(polyglotProgress.currentPath, polyglotProgress.current)) {
      summary.filesChanged.push("config/youtube-polyglot-progress.json");
    }
  }

  const polyglotPlaylists = loadPair(repoRoot, artifactDir, "config/youtube-polyglot-playlists.json", () => ({
    schemaVersion: 1,
    playlists: [],
  }));
  if (polyglotPlaylists.hasIncoming) {
    summary.polyglotPlaylists = mergePlaylists(polyglotPlaylists.current, polyglotPlaylists.incoming);
    if (writeJsonIfChanged(polyglotPlaylists.currentPath, polyglotPlaylists.current)) {
      summary.filesChanged.push("config/youtube-polyglot-playlists.json");
    }
  }

  const summaryPath = path.resolve(repoRoot, options.summary);
  writeJsonIfChanged(summaryPath, summary);
  console.log(JSON.stringify(summary, null, 2));
}

main();
