#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_CHANNEL_CONFIG_PATH,
  customThumbnailUploadAllowed,
  findChannelForSupport,
  loadYoutubeChannels,
  normalizeLanguageCode,
} from "./lib/youtube-playlists.mjs";
import {
  DEFAULT_POLYGLOT_PLAYLIST_REGISTRY_PATH,
  buildPolyglotPlaylistAssignment,
  findPolyglotPlaylistEntry,
  loadPolyglotPlaylistRegistry,
  savePolyglotPlaylistRegistry,
  upsertPlannedPolyglotPlaylist,
} from "./lib/polyglot-youtube-playlists.mjs";
import {
  isActivePublication,
  loadPublicationRegistry,
} from "./lib/youtube-publication-registry.mjs";

const DEFAULT_POLYGLOT_PUBLICATION_REGISTRY_PATH = "config/youtube-polyglot-published-videos.json";
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".webm"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function parseArgs(argv) {
  const options = {
    inputs: [],
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    playlistRegistry: DEFAULT_POLYGLOT_PLAYLIST_REGISTRY_PATH,
    publicationRegistry: DEFAULT_POLYGLOT_PUBLICATION_REGISTRY_PATH,
    output: "",
    writeRegistry: false,
    allowPlaylistCreate: false,
    allowRepublish: false,
    requireAiMetadata: false,
    allowAutoThumbnailFallback: false,
    allowShortUnverified: false,
    maxDurationSeconds: 0,
    allowMissingVideo: false,
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
    if (arg === "--write-registry") options.writeRegistry = true;
    else if (arg === "--allow-playlist-create") options.allowPlaylistCreate = true;
    else if (arg === "--allow-republish") options.allowRepublish = true;
    else if (arg === "--require-ai-metadata") options.requireAiMetadata = true;
    else if (arg === "--allow-auto-thumbnail-fallback") options.allowAutoThumbnailFallback = true;
    else if (arg === "--allow-short-unverified") options.allowShortUnverified = true;
    else if (arg === "--max-duration-seconds" || arg.startsWith("--max-duration-seconds=")) options.maxDurationSeconds = Number(readValue());
    else if (arg === "--allow-missing-video") options.allowMissingVideo = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--metadata" || arg.startsWith("--metadata=")) options.inputs.push(readValue());
    else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else if (arg.startsWith("--playlist-registry=")) options.playlistRegistry = arg.slice("--playlist-registry=".length);
    else if (arg.startsWith("--publication-registry=")) options.publicationRegistry = arg.slice("--publication-registry=".length);
    else if (arg.startsWith("--output=")) options.output = arg.slice("--output=".length);
    else options.inputs.push(arg);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/plan-polyglot-youtube-upload.mjs <youtube_metadata.json-or-dir> [...]",
    "",
    "Options:",
    "  --write-registry                 Add missing planned Polyglot playlist entries.",
    "  --allow-playlist-create          Treat missing playlist IDs as publishable if uploader may create them.",
    "  --allow-republish                Allow an active matching Polyglot publication.",
    "  --require-ai-metadata            Block template metadata for live apply.",
    "  --allow-auto-thumbnail-fallback  Accept YouTube auto first-frame fallback.",
    "  --allow-short-unverified         Allow contentScope=short_unverified on channels without custom thumbnails.",
    "  --max-duration-seconds <n>       Required duration cap for short_unverified upload planning.",
    "  --allow-missing-video            Plan metadata without a rendered video; never use for apply.",
  ].join("\n");
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
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

function defaultThumbnailPath(metadataFile, metadata) {
  const explicit = metadata.thumbnailPath || metadata.thumbnail || metadata.thumbnailFile;
  if (explicit && typeof explicit === "string" && fs.existsSync(explicit)) return path.resolve(explicit);
  const dir = path.dirname(metadataFile);
  const images = fs.readdirSync(dir)
    .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .filter((name) => /thumb|thumbnail|cover/i.test(name))
    .map((name) => path.join(dir, name))
    .sort();
  return images[0] || "";
}

function findActivePolyglotPublication(registry, polyglotKey) {
  return (registry.publications || [])
    .filter((row) => row.videoType === "polyglot" || String(row.polyglotKey || "").startsWith("polyglot:"))
    .filter((row) => row.polyglotKey === polyglotKey)
    .filter(isActivePublication)
    .sort((a, b) => String(b.lastReadbackAt || b.uploadedAt || "").localeCompare(String(a.lastReadbackAt || a.uploadedAt || "")))[0] || null;
}

function polishedMetadataIssue(metadata) {
  const source = String(metadata.source || "").trim();
  if (!source) return "metadata source missing; live publish requires AI-polished or human-curated metadata";
  if (source.toLowerCase().startsWith("template")) {
    return `metadata source ${source} is plan-only; live publish requires AI-polished or human-curated metadata`;
  }
  return "";
}

function normalizeContentScope(value) {
  const scope = String(value || "full").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
  return scope || "full";
}

function quotaForCandidate({ hasThumbnail, playlistEntry, allowPlaylistCreate }) {
  let quota = 1600;
  if (hasThumbnail) quota += 50;
  if (playlistEntry?.youtube_playlist_id) quota += 50;
  else if (allowPlaylistCreate) quota += 100;
  return quota;
}

function validateCandidate({
  metadataFile,
  metadata,
  channelRegistry,
  playlistRegistry,
  publicationRegistry,
  allowPlaylistCreate,
  allowRepublish,
  requireAiMetadata,
  allowAutoThumbnailFallback,
  allowShortUnverified,
  maxDurationSeconds,
  allowMissingVideo,
}) {
  const blockers = [];
  const warnings = [];
  const supportLang = normalizeLanguageCode(metadata.supportLang);
  const targetLangs = Array.isArray(metadata.targetLangs)
    ? metadata.targetLangs.map(normalizeLanguageCode).filter(Boolean)
    : String(metadata.targetLangsCsv || "").split(",").map(normalizeLanguageCode).filter(Boolean);
  const channel = findChannelForSupport(channelRegistry.channels, supportLang);
  const assignment = buildPolyglotPlaylistAssignment(metadata);
  const playlistEntry = findPolyglotPlaylistEntry(playlistRegistry, assignment.key);
  const existingPublication = findActivePolyglotPublication(publicationRegistry, metadata.polyglotKey);
  const videoPath = defaultVideoPath(metadataFile, metadata);
  const thumbnailPath = defaultThumbnailPath(metadataFile, metadata);
  const canUploadCustomThumbnail = channel ? customThumbnailUploadAllowed(channelRegistry, channel) : false;
  const contentScope = normalizeContentScope(metadata.contentScope);
  const durationSeconds = Number(metadata.videoDurationSeconds || 0);
  const durationCapSeconds = Number(metadata.maxDurationSeconds || maxDurationSeconds || 0);
  const thumbnailAutoRequested = metadata.thumbnailUploadMode === "first_frame_auto"
    || metadata.thumbnailSource === "youtube-auto-first-frame";
  const useAutoThumbnail = !canUploadCustomThumbnail || thumbnailAutoRequested || (allowAutoThumbnailFallback && !thumbnailPath);
  const thumbnailUploadPath = canUploadCustomThumbnail && !useAutoThumbnail ? thumbnailPath : "";
  const privacyStatus = metadata.privacyStatus || "public";
  const publishAt = metadata.publishAt || metadata.scheduledPublishAt || "";

  if (metadata.videoType !== "polyglot") blockers.push("metadata videoType must be polyglot");
  if (!metadata.polyglotKey || !String(metadata.polyglotKey).startsWith("polyglot:")) blockers.push("missing valid polyglotKey");
  if (!channel) blockers.push(`no channel configured for supportLang=${supportLang}`);
  else if (!channel.channelId) blockers.push(`channel ${channel.key} has no channelId`);
  if (!videoPath && !allowMissingVideo) blockers.push("missing rendered Polyglot video file next to metadata");
  if (targetLangs.length < 3 || targetLangs.length > 4) blockers.push(`targetLangs count must be 3..4, got ${targetLangs.length}`);
  if (targetLangs.includes(supportLang)) blockers.push(`targetLangs includes supportLang=${supportLang}`);
  if (!metadata.title || String(metadata.title).length > 100) blockers.push("missing or too-long title");
  if (!metadata.description || !String(metadata.description).includes("flashcardsluna.com")) blockers.push("description missing flashcardsluna.com link");
  const metadataIssue = polishedMetadataIssue(metadata);
  if (metadataIssue) {
    if (requireAiMetadata) blockers.push(metadataIssue);
    else warnings.push(`${metadataIssue}; allowed in plan only`);
  }
  if (publishAt) {
    const publishTime = Date.parse(publishAt);
    if (privacyStatus !== "private") blockers.push("scheduled publishAt requires privacyStatus=private");
    if (!Number.isFinite(publishTime)) blockers.push(`invalid publishAt timestamp: ${publishAt}`);
    else if (publishTime <= Date.now() + 5 * 60 * 1000) blockers.push(`publishAt must be at least 5 minutes in the future: ${publishAt}`);
  }
  if (!playlistEntry) warnings.push("Polyglot playlist registry entry missing");
  else if (!playlistEntry.youtube_playlist_id && !allowPlaylistCreate) warnings.push("Polyglot playlist has no youtube_playlist_id yet");
  if (existingPublication && !allowRepublish) blockers.push(`active Polyglot publication already exists: video=${existingPublication.youtubeVideoId}`);

  if (!canUploadCustomThumbnail) {
    if (contentScope === "short_unverified" && allowShortUnverified) {
      if (!durationCapSeconds) blockers.push("short_unverified upload requires maxDurationSeconds");
      if (!durationSeconds && !allowMissingVideo) blockers.push("short_unverified upload requires videoDurationSeconds from duration gate");
      if (durationCapSeconds && durationSeconds && durationSeconds > durationCapSeconds) {
        blockers.push(`short_unverified video duration ${durationSeconds.toFixed(3)}s exceeds maxDurationSeconds=${durationCapSeconds}`);
      }
      if (!allowAutoThumbnailFallback) blockers.push("short_unverified upload requires --allow-auto-thumbnail-fallback");
      warnings.push(`short_unverified Polyglot uses YouTube auto thumbnail fallback and duration gate ${durationCapSeconds}s for unverified channel ${channel?.key || supportLang}`);
    } else {
      blockers.push("Polyglot upload is blocked because customThumbnailUploadAllowed must be true. Channels without custom thumbnails may still have the 15-minute upload length limit.");
      warnings.push("YouTube automatic thumbnail fallback is allowed for ordinary videos only, not Polyglot.");
    }
  }

  if (!thumbnailPath && useAutoThumbnail) {
    warnings.push("custom thumbnail not found or disabled; YouTube automatic thumbnail fallback will be used");
  } else if (!thumbnailPath) {
    warnings.push("thumbnail not found; uploader will skip thumbnails.set");
  } else if (!canUploadCustomThumbnail) {
    warnings.push("custom thumbnail file exists but channel policy disables thumbnails.set; YouTube automatic thumbnail fallback will be used");
  }

  return {
    metadataFile,
    videoType: "polyglot",
    polyglotKey: metadata.polyglotKey,
    contentScope,
    wordLimit: Number(metadata.wordLimit || 0),
    videoDurationSeconds: durationSeconds || null,
    maxDurationSeconds: durationCapSeconds || null,
    setId: metadata.setId,
    supportLang,
    bundleKey: metadata.bundleKey,
    targetLangs,
    targetLangsCsv: targetLangs.join(","),
    targetLangsHash: metadata.targetLangsHash || "",
    videoPath,
    thumbnailPath,
    thumbnailUploadPath,
    thumbnailUploadMode: thumbnailUploadPath ? "custom" : (useAutoThumbnail ? "first_frame_auto" : ""),
    channelKey: channel?.key || "",
    youtube_channel_id: channel?.channelId || "",
    customThumbnailUploadAllowed: canUploadCustomThumbnail,
    playlist_key: assignment.key,
    playlist: {
      ...assignment,
      youtube_playlist_id: playlistEntry?.youtube_playlist_id || "",
      registryStatus: playlistEntry?.status || "missing",
      action: playlistEntry?.youtube_playlist_id
        ? "use_existing_playlist"
        : (allowPlaylistCreate ? "create_playlist_then_insert" : "manual_playlist_id_needed"),
    },
    existingPublication: existingPublication ? {
      youtubeVideoId: existingPublication.youtubeVideoId,
      youtubeVideoUrl: existingPublication.youtubeVideoUrl || "",
      publicationStatus: existingPublication.publicationStatus || "",
      privacyStatus: existingPublication.privacyStatus || "",
      githubRunId: existingPublication.githubRunId || "",
      lastReadbackAt: existingPublication.lastReadbackAt || "",
    } : null,
    publish_ready: blockers.length === 0 && (playlistEntry?.youtube_playlist_id || allowPlaylistCreate),
    blockers,
    warnings,
    estimatedQuotaUnits: quotaForCandidate({
      hasThumbnail: Boolean(thumbnailUploadPath),
      playlistEntry,
      allowPlaylistCreate,
    }),
  };
}

function printHuman(report) {
  console.log("Polyglot YouTube upload dry-run plan");
  console.log(`Candidates: ${report.summary.candidateCount}`);
  console.log(`Publish-ready: ${report.summary.publishReadyCount}`);
  console.log(`Estimated max quota units: ${report.summary.estimatedQuotaUnits}`);
  console.log(`Missing planned playlists: ${report.summary.missingPlaylistCount}`);
  console.log(`Report: ${report.outputPath}`);
  console.log("");
  for (const item of report.candidates) {
    console.log(`${item.supportLang} ${item.bundleKey} ${item.setId} -> ${item.targetLangsCsv}`);
    console.log(`  channel=${item.channelKey || "MISSING"} playlist=${item.playlist_key} action=${item.playlist.action}`);
    console.log(`  video=${item.videoPath || "MISSING"}`);
    if (item.thumbnailUploadMode) console.log(`  thumbnailUploadMode=${item.thumbnailUploadMode}`);
    if (item.blockers.length) console.log(`  blockers=${item.blockers.join("; ")}`);
    if (item.warnings.length) console.log(`  warnings=${item.warnings.join("; ")}`);
  }
}

const options = parseArgs(process.argv.slice(2));
if (options.help || options.inputs.length === 0) {
  console.log(usage());
  process.exit(options.help ? 0 : 1);
}

try {
  const metadataFiles = collectMetadataFiles(options.inputs);
  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const playlistRegistry = loadPolyglotPlaylistRegistry(options.playlistRegistry);
  const publicationRegistry = loadPublicationRegistry(options.publicationRegistry);
  const registryCreates = [];
  const candidates = metadataFiles.map((metadataFile) => {
    const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
    const candidate = validateCandidate({
      metadataFile,
      metadata,
      channelRegistry,
      playlistRegistry,
      publicationRegistry,
      allowPlaylistCreate: options.allowPlaylistCreate,
      allowRepublish: options.allowRepublish,
      requireAiMetadata: options.requireAiMetadata,
      allowAutoThumbnailFallback: options.allowAutoThumbnailFallback,
      allowShortUnverified: options.allowShortUnverified,
      maxDurationSeconds: options.maxDurationSeconds,
      allowMissingVideo: options.allowMissingVideo,
    });
    if (options.writeRegistry && !findPolyglotPlaylistEntry(playlistRegistry, candidate.playlist_key)) {
      const { created } = upsertPlannedPolyglotPlaylist(
        playlistRegistry,
        candidate.playlist,
        channelRegistry.channels.find((channel) => channel.key === candidate.channelKey)
      );
      if (created) registryCreates.push(candidate.playlist_key);
    }
    return candidate;
  });

  if (options.writeRegistry && registryCreates.length) {
    savePolyglotPlaylistRegistry(playlistRegistry, options.playlistRegistry);
  }

  const outputPath = options.output || path.join("outputs", `youtube-polyglot-upload-plan-${timestampSlug()}.json`);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: "polyglot_upload_dry_run",
    sourceInputs: options.inputs,
    channelConfig: options.channelConfig,
    playlistRegistry: options.playlistRegistry,
    publicationRegistry: options.publicationRegistry,
    registryCreates,
    summary: {
      candidateCount: candidates.length,
      publishReadyCount: candidates.filter((item) => item.publish_ready).length,
      estimatedQuotaUnits: candidates.reduce((sum, item) => sum + item.estimatedQuotaUnits, 0),
      missingPlaylistCount: candidates.filter((item) => item.playlist.registryStatus === "missing").length,
      blockerCount: candidates.reduce((sum, item) => sum + item.blockers.length, 0),
      warningCount: candidates.reduce((sum, item) => sum + item.warnings.length, 0),
    },
    candidates,
    outputPath,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (options.json) console.log(JSON.stringify(report.summary, null, 2));
  else printHuman(report);
  if (report.summary.blockerCount) process.exit(1);
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
