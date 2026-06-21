#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
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

const DEFAULT_POLICY_PATH = "config/youtube-publish-schedule-policy.json";

function parseArgs(argv) {
  const options = {
    inputs: [],
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    policy: DEFAULT_POLICY_PATH,
    output: "",
    startDate: "",
    limit: 0,
    limitPerChannel: 0,
    allowRepublish: false,
    writeMetadata: false,
    json: false,
  };

  for (const arg of argv) {
    if (arg === "--write-metadata") options.writeMetadata = true;
    else if (arg === "--allow-republish") options.allowRepublish = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else if (arg.startsWith("--publication-registry=")) options.publicationRegistry = arg.slice("--publication-registry=".length);
    else if (arg.startsWith("--policy=")) options.policy = arg.slice("--policy=".length);
    else if (arg.startsWith("--output=")) options.output = arg.slice("--output=".length);
    else if (arg.startsWith("--start-date=")) options.startDate = arg.slice("--start-date=".length);
    else if (arg.startsWith("--limit=")) options.limit = Number(arg.slice("--limit=".length));
    else if (arg.startsWith("--limit-per-channel=")) options.limitPerChannel = Number(arg.slice("--limit-per-channel=".length));
    else options.inputs.push(arg);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/plan-youtube-publish-schedule.mjs <metadata-file-or-dir> [...]",
    "",
    "Options:",
    "  --start-date=YYYY-MM-DD       First local calendar date to use per channel. Defaults to tomorrow per channel timezone.",
    "  --policy=<file>               Schedule policy JSON. Defaults to config/youtube-publish-schedule-policy.json.",
    "  --limit=<n>                   Plan only the first n metadata files after sorting.",
    "  --limit-per-channel=<n>       Plan only the first n non-duplicate videos per channel.",
    "  --write-metadata              Write privacyStatus=private and publishAt into each scheduled youtube_metadata.json.",
    "  --allow-republish             Do not skip rows that already have an active publication registry entry.",
    "  --output=<file>               Write schedule report. Defaults to outputs/youtube-publish-schedule-<timestamp>.json.",
    "  --json                        Print compact JSON summary.",
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

function formatterFor(timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

function zonedParts(date, timeZone) {
  const parts = {};
  for (const part of formatterFor(timeZone).formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function ymdInZone(date, timeZone) {
  const parts = zonedParts(date, timeZone);
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

function parseYmd(ymd) {
  const match = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`Expected YYYY-MM-DD date, got: ${ymd}`);
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function addDaysYmd(ymd, days) {
  const { year, month, day } = parseYmd(ymd);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function wallTimeToUtcIso({ ymd, hhmm, timeZone }) {
  const { year, month, day } = parseYmd(ymd);
  const timeMatch = String(hhmm || "").match(/^(\d{2}):(\d{2})$/);
  if (!timeMatch) throw new Error(`Expected HH:MM slot, got: ${hhmm}`);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  let guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = zonedParts(new Date(guess), timeZone);
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    guess -= asUtc - Date.UTC(year, month - 1, day, hour, minute, 0);
  }
  return new Date(guess).toISOString();
}

function channelPolicy(policy, channelKey) {
  const defaults = policy.default || {};
  const override = policy.channels?.[channelKey] || {};
  const slots = Array.isArray(override.dailySlotsLocal)
    ? override.dailySlotsLocal
    : (Array.isArray(defaults.dailySlotsLocal) ? defaults.dailySlotsLocal : ["08:30", "11:30", "14:30", "17:30", "20:30", "23:30"]);
  const maxVideosPerDay = Number(override.maxVideosPerDay || defaults.maxVideosPerDay || slots.length || 1);
  return {
    timeZone: override.timezone || defaults.timezone || "Etc/UTC",
    dailySlotsLocal: slots.slice(0, Math.max(1, maxVideosPerDay)),
    maxVideosPerDay,
    defaultStartDelayDays: Number(override.defaultStartDelayDays || defaults.defaultStartDelayDays || 1),
    performanceCheckpointsHours: Array.isArray(override.performanceCheckpointsHours)
      ? override.performanceCheckpointsHours
      : (defaults.performanceCheckpointsHours || [24, 72, 168, 720]),
    notes: override.notes || "",
  };
}

function writeScheduledMetadata(row) {
  const metadata = JSON.parse(fs.readFileSync(row.metadataFile, "utf8"));
  metadata.privacyStatus = "private";
  metadata.publishAt = row.publishAt;
  metadata.scheduledPublishAt = row.publishAt;
  metadata.publishSchedule = {
    schemaVersion: 1,
    status: "scheduled",
    channelKey: row.channelKey,
    timeZone: row.timeZone,
    localDate: row.localDate,
    localTime: row.localTime,
    publishAt: row.publishAt,
    policyPath: row.policyPath,
    analyticsCheckpointsAt: row.analyticsCheckpointsAt,
  };
  fs.writeFileSync(row.metadataFile, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

function compactExistingPublication(row) {
  if (!row) return null;
  return {
    youtubeVideoId: row.youtubeVideoId,
    youtubeVideoUrl: row.youtubeVideoUrl || "",
    publicationStatus: row.publicationStatus || "",
    privacyStatus: row.privacyStatus || "",
    publishAt: row.publishAt || row.scheduledPublishAt || "",
    uploadedAt: row.uploadedAt || "",
    githubRunId: row.githubRunId || "",
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || options.inputs.length === 0) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }

  const policy = JSON.parse(fs.readFileSync(options.policy, "utf8"));
  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const publicationRegistry = loadPublicationRegistry(options.publicationRegistry);
  let metadataFiles = collectMetadataFiles(options.inputs);
  if (options.limit > 0) metadataFiles = metadataFiles.slice(0, options.limit);

  const rawRows = metadataFiles.map((metadataFile) => {
    const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
    const channel = findChannelForSupport(channelRegistry.channels, metadata.supportLang);
    const supportLang = normalizeLanguageCode(metadata.supportLang);
    const targetLang = normalizeLanguageCode(metadata.targetLang);
    const existingPublication = findActivePublication(publicationRegistry, metadata);
    return {
      metadataFile,
      setId: metadata.setId || "",
      supportLang,
      targetLang,
      title: metadata.title || "",
      channelKey: channel?.key || "",
      youtubeChannelId: channel?.channelId || "",
      existingPublication,
      blockers: channel ? [] : [`no channel configured for supportLang=${supportLang}`],
    };
  }).sort((a, b) => [
    a.channelKey,
    a.supportLang,
    a.targetLang,
    a.setId,
    a.metadataFile,
  ].join("|").localeCompare([
    b.channelKey,
    b.supportLang,
    b.targetLang,
    b.setId,
    b.metadataFile,
  ].join("|")));

  const scheduleIndexByChannel = new Map();
  const scheduledCountByChannel = new Map();
  const rows = [];

  for (const raw of rawRows) {
    const blockers = [...raw.blockers];
    if (raw.existingPublication && !options.allowRepublish) {
      blockers.push(`existing active publication ${raw.existingPublication.youtubeVideoId}`);
    }
    const skipped = blockers.length > 0;
    if (skipped) {
      rows.push({
        ...raw,
        status: "skipped",
        publishAt: "",
        timeZone: "",
        localDate: "",
        localTime: "",
        policyPath: options.policy,
        analyticsCheckpointsAt: [],
        existingPublication: compactExistingPublication(raw.existingPublication),
        blockers,
      });
      continue;
    }

    const existingScheduledForChannel = scheduledCountByChannel.get(raw.channelKey) || 0;
    if (options.limitPerChannel > 0 && existingScheduledForChannel >= options.limitPerChannel) {
      rows.push({
        ...raw,
        status: "skipped_limit_per_channel",
        publishAt: "",
        timeZone: "",
        localDate: "",
        localTime: "",
        policyPath: options.policy,
        analyticsCheckpointsAt: [],
        existingPublication: null,
        blockers: [`limit-per-channel=${options.limitPerChannel} reached for channel ${raw.channelKey}`],
      });
      continue;
    }

    const perChannelPolicy = channelPolicy(policy, raw.channelKey);
    const channelIndex = scheduleIndexByChannel.get(raw.channelKey) || 0;
    const slotIndex = channelIndex % perChannelPolicy.dailySlotsLocal.length;
    const dayOffset = Math.floor(channelIndex / perChannelPolicy.dailySlotsLocal.length);
    const baseDate = options.startDate
      ? options.startDate
      : addDaysYmd(ymdInZone(new Date(), perChannelPolicy.timeZone), perChannelPolicy.defaultStartDelayDays);
    const localDate = addDaysYmd(baseDate, dayOffset);
    const localTime = perChannelPolicy.dailySlotsLocal[slotIndex];
    const publishAt = wallTimeToUtcIso({
      ymd: localDate,
      hhmm: localTime,
      timeZone: perChannelPolicy.timeZone,
    });
    const publishMillis = Date.parse(publishAt);
    const analyticsCheckpointsAt = perChannelPolicy.performanceCheckpointsHours.map((hours) => ({
      hoursAfterPublish: hours,
      dueAt: new Date(publishMillis + Number(hours) * 60 * 60 * 1000).toISOString(),
    }));
    scheduleIndexByChannel.set(raw.channelKey, channelIndex + 1);
    scheduledCountByChannel.set(raw.channelKey, existingScheduledForChannel + 1);

    const row = {
      ...raw,
      status: "scheduled",
      publishAt,
      timeZone: perChannelPolicy.timeZone,
      localDate,
      localTime,
      localSlotIndex: slotIndex,
      localDayOffset: dayOffset,
      policyPath: options.policy,
      analyticsCheckpointsAt,
      existingPublication: null,
      blockers: [],
    };
    rows.push(row);
    if (options.writeMetadata) writeScheduledMetadata(row);
  }

  const byChannel = {};
  for (const row of rows) {
    if (!row.channelKey) continue;
    byChannel[row.channelKey] ||= {
      channelKey: row.channelKey,
      supportLangs: new Set(),
      scheduledCount: 0,
      skippedCount: 0,
      firstPublishAt: "",
      lastPublishAt: "",
      timezone: row.timeZone || "",
    };
    byChannel[row.channelKey].supportLangs.add(row.supportLang);
    if (row.status === "scheduled") {
      byChannel[row.channelKey].scheduledCount += 1;
      if (!byChannel[row.channelKey].firstPublishAt || row.publishAt < byChannel[row.channelKey].firstPublishAt) {
        byChannel[row.channelKey].firstPublishAt = row.publishAt;
      }
      if (!byChannel[row.channelKey].lastPublishAt || row.publishAt > byChannel[row.channelKey].lastPublishAt) {
        byChannel[row.channelKey].lastPublishAt = row.publishAt;
      }
    } else {
      byChannel[row.channelKey].skippedCount += 1;
    }
  }
  const channelSummaries = Object.values(byChannel).map((entry) => {
    const first = entry.firstPublishAt ? Date.parse(entry.firstPublishAt) : 0;
    const last = entry.lastPublishAt ? Date.parse(entry.lastPublishAt) : 0;
    return {
      ...entry,
      supportLangs: [...entry.supportLangs].sort(),
      scheduledSpanDays: first && last ? Math.floor((last - first) / 86_400_000) + 1 : 0,
    };
  }).sort((a, b) => a.channelKey.localeCompare(b.channelKey));

  const scheduledRows = rows.filter((row) => row.status === "scheduled");
  const outputPath = options.output || path.join("outputs", `youtube-publish-schedule-${timestampSlug()}.json`);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: "dry_run_schedule_plan",
    sourceInputs: options.inputs,
    channelConfig: options.channelConfig,
    publicationRegistry: options.publicationRegistry,
    policy: options.policy,
    writeMetadata: options.writeMetadata,
    summary: {
      candidateCount: rows.length,
      scheduledCount: scheduledRows.length,
      skippedCount: rows.length - scheduledRows.length,
      channelCount: channelSummaries.length,
      firstPublishAt: scheduledRows.map((row) => row.publishAt).sort()[0] || "",
      lastPublishAt: scheduledRows.map((row) => row.publishAt).sort().at(-1) || "",
      writeMetadata: options.writeMetadata,
      limit: options.limit,
      limitPerChannel: options.limitPerChannel,
    },
    channels: channelSummaries,
    rows,
    outputPath,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (options.json) console.log(JSON.stringify(report.summary, null, 2));
  else {
    console.log("YouTube scheduled publish plan");
    console.log(`Candidates: ${report.summary.candidateCount}`);
    console.log(`Scheduled: ${report.summary.scheduledCount}`);
    console.log(`Skipped: ${report.summary.skippedCount}`);
    console.log(`Channels: ${report.summary.channelCount}`);
    console.log(`First publishAt: ${report.summary.firstPublishAt || "(none)"}`);
    console.log(`Last publishAt: ${report.summary.lastPublishAt || "(none)"}`);
    console.log(`Report: ${outputPath}`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
