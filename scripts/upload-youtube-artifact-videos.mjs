#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  DEFAULT_CHANNEL_CONFIG_PATH,
  findChannelForSupport,
  loadYoutubeChannels,
  normalizeLanguageCode,
} from "./lib/youtube-playlists.mjs";
import {
  DEFAULT_PUBLICATION_REGISTRY_PATH,
  findActivePublication,
  loadPublicationRegistry,
} from "./lib/youtube-publication-registry.mjs";

const DEFAULT_CALENDAR_PATH = "config/youtube-publish-calendar.json";

function parseArgs(argv) {
  const options = {
    inputs: [],
    apply: false,
    confirmYoutubeWrite: false,
    createPlaylist: false,
    limit: 0,
    support: "",
    target: "",
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    calendar: DEFAULT_CALENDAR_PATH,
    firstFrameTimestamp: "0",
  };
  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm-youtube-write") options.confirmYoutubeWrite = true;
    else if (arg === "--create-playlist") options.createPlaylist = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--limit=")) options.limit = Number(arg.slice("--limit=".length));
    else if (arg.startsWith("--support=")) options.support = normalizeLanguageCode(arg.slice("--support=".length));
    else if (arg.startsWith("--target=")) options.target = normalizeLanguageCode(arg.slice("--target=".length));
    else if (arg.startsWith("--publication-registry=")) options.publicationRegistry = arg.slice("--publication-registry=".length);
    else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else if (arg.startsWith("--calendar=")) options.calendar = arg.slice("--calendar=".length);
    else if (arg.startsWith("--first-frame-timestamp=")) options.firstFrameTimestamp = arg.slice("--first-frame-timestamp=".length);
    else options.inputs.push(arg);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/upload-youtube-artifact-videos.mjs <artifact-dir-or-youtube_metadata.json> [...]",
    "",
    "Extracts youtube_thumbnail.jpg from the first video frame, then uses",
    "scripts/youtube-publish-video.mjs to upload already-built videos.",
    "",
    "Dry-run is default. Live write requires:",
    "  --apply --confirm-youtube-write --create-playlist",
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
      throw new Error(`Expected directory or youtube_metadata.json: ${input}`);
    }
  }
  return [...new Set(files)].sort();
}

function defaultVideoPath(metadataFile, metadata) {
  const dir = path.dirname(metadataFile);
  const preferred = path.join(dir, `lesson_${String(metadata.targetLang || "").toLowerCase()}_${String(metadata.supportLang || "").toLowerCase()}.mp4`);
  if (fs.existsSync(preferred)) return preferred;
  return fs.readdirSync(dir)
    .filter((name) => [".mp4", ".mov", ".m4v", ".webm"].includes(path.extname(name).toLowerCase()))
    .sort()
    .map((name) => path.join(dir, name))[0] || "";
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: options.stdio || "pipe",
    encoding: "utf8",
    env: { ...process.env, ...(options.env || {}) },
  });
  if (result.status !== 0) {
    const stdout = result.stdout ? `\nstdout:\n${result.stdout}` : "";
    const stderr = result.stderr ? `\nstderr:\n${result.stderr}` : "";
    throw new Error(`${command} ${args.join(" ")} failed with exit ${result.status}${stdout}${stderr}`);
  }
  return result;
}

function extractFirstFrame({ videoPath, thumbnailPath, timestamp }) {
  run("ffmpeg", [
    "-y",
    "-ss",
    timestamp,
    "-i",
    videoPath,
    "-frames:v",
    "1",
    "-vf",
    "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
    "-q:v",
    "2",
    thumbnailPath,
  ]);
}

function writeMetadataForFirstFrame(metadataFile, metadata, thumbnailPath) {
  metadata.thumbnailPath = path.relative(process.cwd(), thumbnailPath);
  metadata.thumbnailUploadMode = "custom";
  metadata.thumbnailSource = "video-first-frame";
  metadata.thumbnailGenerationBackend = "ffmpeg-first-frame";
  metadata.thumbnailGeneratedAt = new Date().toISOString();
  fs.writeFileSync(metadataFile, `${JSON.stringify(metadata, null, 2)}\n`);
}

function assignmentKey(row) {
  return [
    row.setId || "",
    normalizeLanguageCode(row.supportLang),
    normalizeLanguageCode(row.targetLang),
    row.channelKey || row.publishSchedule?.channelKey || "",
  ].join("|");
}

function loadJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function inactiveCalendarStatus(status) {
  return /cancelled|deleted|failed|superseded/iu.test(String(status || ""));
}

function syncCalendarFromPublication({ calendarPath, channelConfigPath, publicationRegistryPath, metadataFile }) {
  const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
  const publicationRegistry = loadPublicationRegistry(publicationRegistryPath);
  const publication = findActivePublication(publicationRegistry, metadata);
  if (!publication?.youtubeVideoId) {
    throw new Error(`No active publication row after upload for ${metadata.supportLang}->${metadata.targetLang}`);
  }
  const channelRegistry = loadYoutubeChannels(channelConfigPath);
  const channel = findChannelForSupport(channelRegistry.channels, metadata.supportLang);
  const calendar = loadJson(calendarPath, { schemaVersion: 1, reservations: [] });
  calendar.reservations ||= [];
  const key = assignmentKey({
    setId: metadata.setId,
    supportLang: metadata.supportLang,
    targetLang: metadata.targetLang,
    channelKey: channel?.key || metadata.publishSchedule?.channelKey || "",
  });
  let row = calendar.reservations.find((item) => assignmentKey(item) === key);
  const now = new Date().toISOString();
  if (!row) {
    row = {
      schemaVersion: 1,
      setId: metadata.setId,
      supportLang: normalizeLanguageCode(metadata.supportLang),
      targetLang: normalizeLanguageCode(metadata.targetLang),
      channelKey: channel?.key || metadata.publishSchedule?.channelKey || "",
      youtubeChannelId: channel?.channelId || "",
      publishAt: metadata.publishAt || metadata.scheduledPublishAt || "",
      timeZone: metadata.publishSchedule?.timeZone || "",
      localDate: metadata.publishSchedule?.localDate || "",
      localTime: metadata.publishSchedule?.localTime || "",
      localSlotIndex: metadata.publishSchedule?.localSlotIndex ?? null,
      localDayOffset: metadata.publishSchedule?.localDayOffset ?? null,
      slotOrdinal: metadata.publishSchedule?.slotOrdinal ?? null,
      status: "reserved",
      source: "local-artifact-upload-first-frame",
      policyPath: metadata.publishSchedule?.policyPath || "config/youtube-publish-schedule-policy.json",
      metadataFile: path.relative(process.cwd(), metadataFile),
      title: metadata.title || "",
      playlist_key: publication.playlist_key || metadata.playlist_key || metadata.playlistKey || "",
      analyticsCheckpointsAt: metadata.publishSchedule?.analyticsCheckpointsAt || [],
      createdAt: now,
    };
    calendar.reservations.push(row);
  }
  row.updatedAt = now;
  const wasInactive = inactiveCalendarStatus(row.status);
  if (!row.status || wasInactive) row.status = "reserved";
  row.youtubeVideoId = publication.youtubeVideoId;
  row.youtubePlaylistId = publication.youtubePlaylistId || "";
  row.playlistItemId = publication.playlistItemId || "";
  row.publishAt = publication.publishAt || publication.scheduledPublishAt || metadata.publishAt || metadata.scheduledPublishAt || row.publishAt || "";
  row.title = publication.title || row.title || metadata.title || "";
  row.playlist_key = publication.playlist_key || row.playlist_key || metadata.playlist_key || "";
  row.metadataFile = path.relative(process.cwd(), metadataFile);
  if (!row.source || row.source === "plan-youtube-publish-schedule" || wasInactive) {
    row.source = "local-artifact-upload-first-frame";
  }
  saveJson(calendarPath, calendar);
  return {
    key,
    youtubeVideoId: row.youtubeVideoId,
    youtubePlaylistId: row.youtubePlaylistId,
    playlistItemId: row.playlistItemId,
  };
}

function uploadOne(metadataFile, options) {
  const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
  metadata.supportLang = normalizeLanguageCode(metadata.supportLang);
  metadata.targetLang = normalizeLanguageCode(metadata.targetLang);
  if (options.support && metadata.supportLang !== options.support) return { status: "filtered", metadataFile };
  if (options.target && metadata.targetLang !== options.target) return { status: "filtered", metadataFile };

  const publicationRegistry = loadPublicationRegistry(options.publicationRegistry);
  const existing = findActivePublication(publicationRegistry, metadata);
  if (existing?.youtubeVideoId) {
    const calendarSync = options.apply
      ? syncCalendarFromPublication({
          calendarPath: options.calendar,
          channelConfigPath: options.channelConfig,
          publicationRegistryPath: options.publicationRegistry,
          metadataFile,
        })
      : null;
    return {
      status: "skipped_existing_publication",
      metadataFile,
      supportLang: metadata.supportLang,
      targetLang: metadata.targetLang,
      youtubeVideoId: existing.youtubeVideoId,
      calendarSync,
    };
  }

  const videoPath = defaultVideoPath(metadataFile, metadata);
  if (!videoPath) throw new Error(`Video file missing next to ${metadataFile}`);
  const thumbnailPath = path.join(path.dirname(metadataFile), "youtube_thumbnail.jpg");
  extractFirstFrame({ videoPath, thumbnailPath, timestamp: options.firstFrameTimestamp });
  writeMetadataForFirstFrame(metadataFile, metadata, thumbnailPath);

  const args = [
    "scripts/youtube-publish-video.mjs",
    `--metadata=${metadataFile}`,
    `--video=${videoPath}`,
    `--thumbnail=${thumbnailPath}`,
    "--create-playlist",
  ];
  if (options.apply) {
    if (!options.confirmYoutubeWrite) throw new Error("--apply requires --confirm-youtube-write");
    args.push("--apply", "--confirm-youtube-write");
  }
  const upload = run(process.execPath, args, { stdio: "pipe" });
  const calendarSync = options.apply
    ? syncCalendarFromPublication({
        calendarPath: options.calendar,
        channelConfigPath: options.channelConfig,
        publicationRegistryPath: options.publicationRegistry,
        metadataFile,
      })
    : null;
  return {
    status: options.apply ? "uploaded" : "planned",
    metadataFile,
    supportLang: metadata.supportLang,
    targetLang: metadata.targetLang,
    videoPath,
    thumbnailPath,
    calendarSync,
    uploadOutput: upload.stdout.trim(),
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || options.inputs.length === 0) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }
  const files = collectMetadataFiles(options.inputs);
  const selected = options.limit > 0 ? files.slice(0, options.limit) : files;
  const results = [];
  for (const file of selected) {
    const result = uploadOne(file, options);
    if (result.status !== "filtered") results.push(result);
  }
  console.log(JSON.stringify({
    apply: options.apply,
    inputMetadataCount: files.length,
    processedCount: results.filter((item) => item.status === "uploaded" || item.status === "planned").length,
    skippedExistingCount: results.filter((item) => item.status === "skipped_existing_publication").length,
    results,
  }, null, 2));
}

main();
