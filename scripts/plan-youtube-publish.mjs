#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_CHANNEL_CONFIG_PATH,
  DEFAULT_PLAYLIST_REGISTRY_PATH,
  buildPlaylistAssignment,
  customThumbnailUploadAllowed,
  findChannelForSupport,
  findPlaylistEntry,
  loadPlaylistRegistry,
  loadYoutubeChannels,
  savePlaylistRegistry,
  upsertPlannedPlaylist,
} from "./lib/youtube-playlists.mjs";
import {
  DEFAULT_PUBLICATION_REGISTRY_PATH,
  activePublicationBlocker,
  findActivePublication,
  loadPublicationRegistry,
} from "./lib/youtube-publication-registry.mjs";

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".webm"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function parseArgs(argv) {
  const options = {
    inputs: [],
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    playlistRegistry: DEFAULT_PLAYLIST_REGISTRY_PATH,
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    output: "",
    writeRegistry: false,
    allowPlaylistCreate: false,
    allowRepublish: false,
    requireAiMetadata: false,
    allowAutoThumbnailFallback: false,
    json: false,
  };

  for (const arg of argv) {
    if (arg === "--write-registry") options.writeRegistry = true;
    else if (arg === "--allow-playlist-create") options.allowPlaylistCreate = true;
    else if (arg === "--allow-republish") options.allowRepublish = true;
    else if (arg === "--require-ai-metadata") options.requireAiMetadata = true;
    else if (arg === "--allow-auto-thumbnail-fallback") options.allowAutoThumbnailFallback = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
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
    "  node scripts/plan-youtube-publish.mjs <metadata-file-or-dir> [...]",
    "",
    "Options:",
    "  --write-registry          Add missing planned playlist entries to config/youtube-playlists.json.",
    "  --allow-playlist-create   Treat missing playlist IDs as publishable if uploader may create them later.",
    "  --allow-republish         Allow uploading a set/support/target already present in config/youtube-published-videos.json.",
    "  --require-ai-metadata     Block template/template-ai-fallback metadata; intended for live apply planning.",
    "  --allow-auto-thumbnail-fallback  Allow no custom thumbnail and use YouTube automatic thumbnail fallback.",
    "  --output=<file>           Write dry-run plan to this file. Defaults to outputs/youtube-publish-plan-<timestamp>.json.",
    "  --json                    Print compact JSON summary.",
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

function findVideoFile(metadataFile, metadata) {
  if (metadata.videoPath && fs.existsSync(metadata.videoPath)) return path.resolve(metadata.videoPath);
  const dir = path.dirname(metadataFile);
  const preferred = `lesson_${String(metadata.targetLang || "").toLowerCase()}_${String(metadata.supportLang || "").toLowerCase()}.mp4`;
  const preferredPath = path.join(dir, preferred);
  if (fs.existsSync(preferredPath)) return preferredPath;

  const videos = fs.readdirSync(dir)
    .filter((name) => VIDEO_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .map((name) => path.join(dir, name))
    .sort();
  return videos[0] || "";
}

function findThumbnailFile(metadataFile, metadata) {
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

function quotaForCandidate({ hasThumbnail, playlistEntry, allowPlaylistCreate }) {
  let quota = 1600;
  if (hasThumbnail) quota += 50;
  if (playlistEntry?.youtube_playlist_id) quota += 50;
  else if (allowPlaylistCreate) quota += 100;
  return quota;
}

function polishedMetadataIssue(metadata) {
  const source = String(metadata.source || "").trim();
  if (!source) return "metadata source missing; live publish requires AI-polished or human-curated metadata";
  if (source.toLowerCase().startsWith("template")) {
    return `metadata source ${source} is plan-only; live publish requires AI-polished or human-curated metadata`;
  }
  return "";
}

function buildCandidate({
  metadataFile,
  metadata,
  channelRegistry,
  playlistRegistry,
  publicationRegistry,
  allowPlaylistCreate,
  allowRepublish,
  requireAiMetadata,
  allowAutoThumbnailFallback,
}) {
  const assignment = buildPlaylistAssignment(metadata);
  const channel = findChannelForSupport(channelRegistry.channels, metadata.supportLang);
  const playlistEntry = findPlaylistEntry(playlistRegistry, assignment.key);
  const existingPublication = findActivePublication(publicationRegistry, metadata);
  const videoPath = findVideoFile(metadataFile, metadata);
  const thumbnailPath = findThumbnailFile(metadataFile, metadata);
  const thumbnailAutoRequested = metadata.thumbnailUploadMode === "first_frame_auto"
    || metadata.thumbnailSource === "youtube-auto-first-frame";
  const canUploadCustomThumbnail = channel ? customThumbnailUploadAllowed(channelRegistry, channel) : false;
  const useAutoThumbnail = !canUploadCustomThumbnail || thumbnailAutoRequested || (allowAutoThumbnailFallback && !thumbnailPath);
  const thumbnailUploadPath = canUploadCustomThumbnail && !useAutoThumbnail ? thumbnailPath : "";
  const thumbnailUploadMode = thumbnailUploadPath ? "custom" : (useAutoThumbnail ? "first_frame_auto" : "");
  const thumbnailFallbackReason = !canUploadCustomThumbnail
    ? (channel ? "channel_custom_thumbnail_upload_not_available" : "channel_custom_thumbnail_status_unknown")
    : (thumbnailAutoRequested
      ? (metadata.thumbnailFallbackReason || "metadata_requested_first_frame_auto")
      : (useAutoThumbnail ? "custom_thumbnail_generation_disabled" : ""));
  const privacyStatus = metadata.privacyStatus || "public";
  const publishAt = metadata.publishAt || metadata.scheduledPublishAt || "";
  const blockers = [];
  const warnings = [];

  if (!channel) blockers.push(`no channel configured for supportLang=${metadata.supportLang}`);
  else if (!channel.channelId) blockers.push(`channel ${channel.key} has no channelId`);
  if (!videoPath) blockers.push("missing video file next to metadata");
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
    if (playlistEntry?.status && String(playlistEntry.status).toLowerCase().includes("unlisted")) {
      blockers.push("scheduled public release needs a public playlist; promote existing unlisted playlist before upload or create a new public playlist");
    }
  }
  if (!playlistEntry) warnings.push("playlist registry entry missing");
  else if (!playlistEntry.youtube_playlist_id && !allowPlaylistCreate) warnings.push("playlist has no youtube_playlist_id yet");
  if (existingPublication && !allowRepublish) blockers.push(activePublicationBlocker(existingPublication));
  if (!thumbnailPath && useAutoThumbnail) {
    warnings.push("custom thumbnail not found or disabled; YouTube automatic thumbnail fallback will be used");
  } else if (!thumbnailPath) {
    warnings.push("thumbnail not found; uploader will skip thumbnails.set");
  } else if (!canUploadCustomThumbnail) {
    warnings.push("custom thumbnail file exists but channel policy disables thumbnails.set; YouTube automatic thumbnail fallback will be used");
  }
  const playlistAction = playlistEntry?.youtube_playlist_id
    ? "use_existing_playlist"
    : (allowPlaylistCreate ? "create_playlist_then_insert" : "manual_playlist_id_needed");

  return {
    metadataFile,
    videoPath,
    thumbnailPath,
    setId: metadata.setId,
    supportLang: metadata.supportLang,
    targetLang: metadata.targetLang,
    title: metadata.title,
    metadataSource: metadata.source || "",
    privacyStatus,
    publishAt,
    channelKey: channel?.key || "",
    youtube_channel_id: channel?.channelId || "",
    customThumbnailUploadAllowed: canUploadCustomThumbnail,
    thumbnailUploadMode,
    thumbnailFallbackReason,
    thumbnailUploadPath,
    existingPublication: existingPublication ? {
      youtubeVideoId: existingPublication.youtubeVideoId,
      youtubeVideoUrl: existingPublication.youtubeVideoUrl || "",
      publicationStatus: existingPublication.publicationStatus || "",
      privacyStatus: existingPublication.privacyStatus || "",
      githubRunId: existingPublication.githubRunId || "",
      lastReadbackAt: existingPublication.lastReadbackAt || "",
    } : null,
    playlist_key: assignment.key,
    playlist: {
      ...assignment,
      youtube_playlist_id: playlistEntry?.youtube_playlist_id || "",
      registryStatus: playlistEntry?.status || "missing",
      action: playlistAction,
    },
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
  console.log("YouTube publish dry-run plan");
  console.log(`Candidates: ${report.summary.candidateCount}`);
  console.log(`Publish-ready: ${report.summary.publishReadyCount}`);
  console.log(`Estimated max quota units: ${report.summary.estimatedQuotaUnits}`);
  console.log(`Missing planned playlists: ${report.summary.missingPlaylistCount}`);
  console.log(`Report: ${report.outputPath}`);
  console.log("");
  for (const item of report.candidates) {
    console.log(`${item.supportLang}->${item.targetLang} ${item.setId}`);
    console.log(`  channel=${item.channelKey || "MISSING"} playlist=${item.playlist_key} action=${item.playlist.action}`);
    console.log(`  video=${item.videoPath || "MISSING"}`);
    if (item.thumbnailPath) console.log(`  thumbnail=${item.thumbnailPath}`);
    if (item.thumbnailUploadMode) console.log(`  thumbnailUploadMode=${item.thumbnailUploadMode}`);
    if (item.blockers.length) console.log(`  blockers=${item.blockers.join("; ")}`);
    if (item.warnings.length) console.log(`  warnings=${item.warnings.join("; ")}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || options.inputs.length === 0) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }

  const metadataFiles = collectMetadataFiles(options.inputs);
  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const playlistRegistry = loadPlaylistRegistry(options.playlistRegistry);
  const publicationRegistry = loadPublicationRegistry(options.publicationRegistry);
  const registryCreates = [];
  const candidates = metadataFiles.map((metadataFile) => {
    const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
    const candidate = buildCandidate({
      metadataFile,
      metadata,
      channelRegistry,
      playlistRegistry,
      publicationRegistry,
      allowPlaylistCreate: options.allowPlaylistCreate,
      allowRepublish: options.allowRepublish,
      requireAiMetadata: options.requireAiMetadata,
      allowAutoThumbnailFallback: options.allowAutoThumbnailFallback,
    });
    if (options.writeRegistry && !findPlaylistEntry(playlistRegistry, candidate.playlist_key)) {
      const { created } = upsertPlannedPlaylist(
        playlistRegistry,
        candidate.playlist,
        channelRegistry.channels.find((channel) => channel.key === candidate.channelKey)
      );
      if (created) registryCreates.push(candidate.playlist_key);
    }
    return candidate;
  });

  if (options.writeRegistry && registryCreates.length) {
    savePlaylistRegistry(playlistRegistry, options.playlistRegistry);
  }

  const outputPath = options.output || path.join("outputs", `youtube-publish-plan-${timestampSlug()}.json`);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: "dry_run",
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
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
