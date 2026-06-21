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
const DEFAULT_CALENDAR_PATH = "config/youtube-publish-calendar.json";
const DEFAULT_TARGET_PLAN_PATH = "outputs/video-generator/youtube-generation-targets-github.json";

function parseArgs(argv) {
  const options = {
    inputs: [],
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    policy: DEFAULT_POLICY_PATH,
    calendar: DEFAULT_CALENDAR_PATH,
    targetPlan: "",
    output: "",
    startDate: "",
    limit: 0,
    limitPerChannel: 0,
    allowRepublish: false,
    writeMetadata: false,
    writeCalendar: false,
    json: false,
  };

  for (const arg of argv) {
    if (arg === "--write-metadata") options.writeMetadata = true;
    else if (arg === "--write-calendar") options.writeCalendar = true;
    else if (arg === "--allow-republish") options.allowRepublish = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else if (arg.startsWith("--publication-registry=")) options.publicationRegistry = arg.slice("--publication-registry=".length);
    else if (arg.startsWith("--policy=")) options.policy = arg.slice("--policy=".length);
    else if (arg.startsWith("--calendar=")) options.calendar = arg.slice("--calendar=".length);
    else if (arg.startsWith("--target-plan=")) options.targetPlan = arg.slice("--target-plan=".length);
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
    "  --calendar=<file>             Durable publication calendar JSON. Defaults to config/youtube-publish-calendar.json.",
    "  --target-plan=<file>          Optional generation-target preflight report for deterministic shard slot ordinals.",
    "  --limit=<n>                   Plan only the first n metadata files after sorting.",
    "  --limit-per-channel=<n>       Plan only the first n non-duplicate videos per channel.",
    "  --write-metadata              Write privacyStatus=private and publishAt into each scheduled youtube_metadata.json.",
    "  --write-calendar              Upsert scheduled reservations into the durable calendar file.",
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

function loadCalendar(filePath = DEFAULT_CALENDAR_PATH) {
  if (!fs.existsSync(filePath)) {
    return {
      schemaVersion: 1,
      sourceOfTruth: "docs/video-lessons-strategy.md#publication-schedule-and-global-calendar",
      policyPath: DEFAULT_POLICY_PATH,
      reservations: [],
    };
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(parsed.reservations)) parsed.reservations = [];
  return parsed;
}

function saveCalendar(calendar, filePath = DEFAULT_CALENDAR_PATH) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  calendar.reservations = (calendar.reservations || []).sort((a, b) => [
    a.channelKey || "",
    a.publishAt || "",
    a.setId || "",
    normalizeLanguageCode(a.supportLang),
    normalizeLanguageCode(a.targetLang),
  ].join("|").localeCompare([
    b.channelKey || "",
    b.publishAt || "",
    b.setId || "",
    normalizeLanguageCode(b.supportLang),
    normalizeLanguageCode(b.targetLang),
  ].join("|")));
  fs.writeFileSync(filePath, `${JSON.stringify(calendar, null, 2)}\n`, "utf8");
}

function isActiveCalendarReservation(row) {
  if (!row?.publishAt || !row?.channelKey) return false;
  const status = String(row.status || row.publicationStatus || "").toLowerCase();
  if (status.includes("cancel")) return false;
  if (status.includes("delete")) return false;
  if (status.includes("failed")) return false;
  if (status.includes("superseded")) return false;
  return true;
}

function reservationAssignmentKey(row) {
  return [
    row.setId || "",
    normalizeLanguageCode(row.supportLang),
    normalizeLanguageCode(row.targetLang),
    row.channelKey || "",
  ].join("|");
}

function slotKey({ channelKey, publishAt }) {
  return [channelKey || "", publishAt || ""].join("|");
}

function slotForOrdinal({ perChannelPolicy, baseDate, ordinal }) {
  const slotCount = perChannelPolicy.dailySlotsLocal.length;
  const slotIndex = ordinal % slotCount;
  const dayOffset = Math.floor(ordinal / slotCount);
  const localDate = addDaysYmd(baseDate, dayOffset);
  const localTime = perChannelPolicy.dailySlotsLocal[slotIndex];
  const publishAt = wallTimeToUtcIso({
    ymd: localDate,
    hhmm: localTime,
    timeZone: perChannelPolicy.timeZone,
  });
  return {
    publishAt,
    timeZone: perChannelPolicy.timeZone,
    localDate,
    localTime,
    localSlotIndex: slotIndex,
    localDayOffset: dayOffset,
    slotOrdinal: ordinal,
  };
}

function findFreeSlot({
  channelKey,
  perChannelPolicy,
  baseDate,
  baseOccupiedSlotKeys,
  plannedSlotKeys,
  preferredFreeOrdinal,
}) {
  const maxIterations = perChannelPolicy.dailySlotsLocal.length * 366 * 5;
  let freeSeen = 0;
  const hasPreferred = Number.isInteger(preferredFreeOrdinal) && preferredFreeOrdinal >= 0;
  for (let ordinal = 0; ordinal < maxIterations; ordinal += 1) {
    const slot = slotForOrdinal({ perChannelPolicy, baseDate, ordinal });
    const key = slotKey({ channelKey, publishAt: slot.publishAt });
    if (baseOccupiedSlotKeys.has(key)) continue;
    if (hasPreferred && freeSeen < preferredFreeOrdinal) {
      freeSeen += 1;
      continue;
    }
    if (!plannedSlotKeys.has(key)) return slot;
    freeSeen += 1;
  }
  throw new Error(`No free publish slot found for channel=${channelKey} within ${maxIterations} slot attempts.`);
}

function loadTargetPlan(filePath, channelRegistry) {
  const resolvedPath = filePath || (fs.existsSync(DEFAULT_TARGET_PLAN_PATH) ? DEFAULT_TARGET_PLAN_PATH : "");
  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    return {
      path: resolvedPath,
      found: false,
      ordinalsByAssignmentKey: new Map(),
    };
  }

  const report = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  const channelCounts = new Map();
  const ordinalsByAssignmentKey = new Map();
  for (const supportReport of report.supports || []) {
    const supportLang = normalizeLanguageCode(supportReport.supportLang);
    const channel = findChannelForSupport(channelRegistry.channels, supportLang);
    if (!channel?.key) continue;
    const start = channelCounts.get(channel.key) || 0;
    const eligibleTargets = Array.isArray(supportReport.eligibleTargets)
      ? supportReport.eligibleTargets.map(normalizeLanguageCode).filter(Boolean)
      : [];
    eligibleTargets.forEach((targetLang, index) => {
      const key = reservationAssignmentKey({
        setId: supportReport.setId || report.setId || "",
        supportLang,
        targetLang,
        channelKey: channel.key,
      });
      ordinalsByAssignmentKey.set(key, start + index);
    });
    channelCounts.set(channel.key, start + eligibleTargets.length);
  }
  return {
    path: resolvedPath,
    found: true,
    ordinalsByAssignmentKey,
    supportCount: (report.supports || []).length,
  };
}

function rowFromReservation(raw, reservation, options) {
  const publishMillis = Date.parse(reservation.publishAt);
  const analyticsCheckpointsAt = Array.isArray(reservation.analyticsCheckpointsAt) && reservation.analyticsCheckpointsAt.length
    ? reservation.analyticsCheckpointsAt
    : [];
  return {
    ...raw,
    status: "scheduled",
    publishAt: reservation.publishAt,
    timeZone: reservation.timeZone || "",
    localDate: reservation.localDate || "",
    localTime: reservation.localTime || "",
    localSlotIndex: Number.isInteger(reservation.localSlotIndex) ? reservation.localSlotIndex : null,
    localDayOffset: Number.isInteger(reservation.localDayOffset) ? reservation.localDayOffset : null,
    slotOrdinal: Number.isInteger(reservation.slotOrdinal) ? reservation.slotOrdinal : null,
    policyPath: reservation.policyPath || options.policy,
    calendarPath: options.calendar,
    calendarReservationKey: reservationAssignmentKey(reservation),
    calendarReservationAction: "reused",
    analyticsCheckpointsAt,
    existingPublication: null,
    blockers: [],
    publishMillis,
  };
}

function reservationFromRow(row, existing = {}) {
  const now = new Date().toISOString();
  return {
    ...existing,
    schemaVersion: 1,
    setId: row.setId || "",
    supportLang: normalizeLanguageCode(row.supportLang),
    targetLang: normalizeLanguageCode(row.targetLang),
    channelKey: row.channelKey || "",
    youtubeChannelId: row.youtubeChannelId || "",
    publishAt: row.publishAt || "",
    timeZone: row.timeZone || "",
    localDate: row.localDate || "",
    localTime: row.localTime || "",
    localSlotIndex: row.localSlotIndex,
    localDayOffset: row.localDayOffset,
    slotOrdinal: row.slotOrdinal,
    status: existing.status || "reserved",
    source: "plan-youtube-publish-schedule",
    policyPath: row.policyPath || "",
    metadataFile: path.relative(process.cwd(), row.metadataFile),
    title: row.title || "",
    playlist_key: row.playlist_key || "",
    analyticsCheckpointsAt: row.analyticsCheckpointsAt || [],
    githubRunId: process.env.GITHUB_RUN_ID || existing.githubRunId || "",
    githubRunUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : (existing.githubRunUrl || ""),
    createdAt: existing.createdAt || now,
    updatedAt: now,
  };
}

function upsertCalendarReservation(calendar, row) {
  calendar.reservations ||= [];
  const key = reservationAssignmentKey(row);
  const index = calendar.reservations.findIndex((reservation) => reservationAssignmentKey(reservation) === key);
  if (index >= 0) {
    calendar.reservations[index] = reservationFromRow(row, calendar.reservations[index]);
    return "updated";
  }
  calendar.reservations.push(reservationFromRow(row));
  return "created";
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
    calendarPath: row.calendarPath || "",
    calendarReservationKey: row.calendarReservationKey || "",
    calendarReservationAction: row.calendarReservationAction || "",
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
  const calendar = loadCalendar(options.calendar);
  calendar.policyPath = options.policy;
  const targetPlan = loadTargetPlan(options.targetPlan, channelRegistry);
  let metadataFiles = collectMetadataFiles(options.inputs);
  if (options.limit > 0) metadataFiles = metadataFiles.slice(0, options.limit);

  const activeCalendarReservations = (calendar.reservations || []).filter(isActiveCalendarReservation);
  const reservationByAssignment = new Map();
  const baseOccupiedSlotKeys = new Set();
  for (const reservation of activeCalendarReservations) {
    reservationByAssignment.set(reservationAssignmentKey(reservation), reservation);
    baseOccupiedSlotKeys.add(slotKey(reservation));
  }
  for (const publication of publicationRegistry.publications || []) {
    const publishAt = publication.publishAt || publication.scheduledPublishAt || "";
    const channelKey = publication.channelKey || "";
    if (publishAt && channelKey) baseOccupiedSlotKeys.add(slotKey({ channelKey, publishAt }));
  }

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
      playlist_key: metadata.playlist_key || metadata.playlistKey || metadata.playlist?.key || "",
      channelKey: channel?.key || "",
      youtubeChannelId: channel?.channelId || "",
      targetPlanSlotOrdinal: null,
      existingPublication,
      blockers: channel ? [] : [`no channel configured for supportLang=${supportLang}`],
    };
  }).map((row) => {
    const key = reservationAssignmentKey(row);
    return {
      ...row,
      targetPlanSlotOrdinal: targetPlan.ordinalsByAssignmentKey.get(key) ?? null,
    };
  }).sort((a, b) => [
    a.channelKey,
    Number.isInteger(a.targetPlanSlotOrdinal) ? String(a.targetPlanSlotOrdinal).padStart(6, "0") : "999999",
    a.supportLang,
    a.targetLang,
    a.setId,
    a.metadataFile,
  ].join("|").localeCompare([
    b.channelKey,
    Number.isInteger(b.targetPlanSlotOrdinal) ? String(b.targetPlanSlotOrdinal).padStart(6, "0") : "999999",
    b.supportLang,
    b.targetLang,
    b.setId,
    b.metadataFile,
  ].join("|")));

  const plannedSlotKeys = new Set();
  const scheduledCountByChannel = new Map();
  const rows = [];
  const calendarWrites = {
    created: 0,
    updated: 0,
    reused: 0,
  };

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
    const baseDate = options.startDate
      ? options.startDate
      : addDaysYmd(ymdInZone(new Date(), perChannelPolicy.timeZone), perChannelPolicy.defaultStartDelayDays);
    const calendarReservationKey = reservationAssignmentKey(raw);
    const existingCalendarReservation = reservationByAssignment.get(calendarReservationKey);

    if (existingCalendarReservation) {
      const row = rowFromReservation(raw, existingCalendarReservation, options);
      scheduledCountByChannel.set(raw.channelKey, existingScheduledForChannel + 1);
      plannedSlotKeys.add(slotKey(row));
      rows.push(row);
      calendarWrites.reused += 1;
      if (options.writeMetadata) writeScheduledMetadata(row);
      if (options.writeCalendar) {
        const action = upsertCalendarReservation(calendar, row);
        calendarWrites[action] += 1;
      }
      continue;
    }

    const preferredFreeOrdinal = Number.isInteger(raw.targetPlanSlotOrdinal)
      ? raw.targetPlanSlotOrdinal
      : null;
    const slot = findFreeSlot({
      channelKey: raw.channelKey,
      perChannelPolicy,
      baseDate,
      baseOccupiedSlotKeys,
      plannedSlotKeys,
      preferredFreeOrdinal,
    });
    const publishAt = slot.publishAt;
    const publishMillis = Date.parse(publishAt);
    const analyticsCheckpointsAt = perChannelPolicy.performanceCheckpointsHours.map((hours) => ({
      hoursAfterPublish: hours,
      dueAt: new Date(publishMillis + Number(hours) * 60 * 60 * 1000).toISOString(),
    }));
    scheduledCountByChannel.set(raw.channelKey, existingScheduledForChannel + 1);

    const row = {
      ...raw,
      status: "scheduled",
      publishAt,
      timeZone: slot.timeZone,
      localDate: slot.localDate,
      localTime: slot.localTime,
      localSlotIndex: slot.localSlotIndex,
      localDayOffset: slot.localDayOffset,
      slotOrdinal: slot.slotOrdinal,
      policyPath: options.policy,
      calendarPath: options.calendar,
      calendarReservationKey,
      calendarReservationAction: options.writeCalendar ? "reserved" : "planned_only",
      analyticsCheckpointsAt,
      existingPublication: null,
      blockers: [],
    };
    rows.push(row);
    plannedSlotKeys.add(slotKey(row));
    if (options.writeMetadata) writeScheduledMetadata(row);
    if (options.writeCalendar) {
      const action = upsertCalendarReservation(calendar, row);
      calendarWrites[action] += 1;
    }
  }

  if (options.writeCalendar) {
    saveCalendar(calendar, options.calendar);
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
    calendar: options.calendar,
    targetPlan: {
      path: targetPlan.path || options.targetPlan || "",
      found: targetPlan.found,
      supportCount: targetPlan.supportCount || 0,
      ordinalCount: targetPlan.ordinalsByAssignmentKey.size,
    },
    writeMetadata: options.writeMetadata,
    writeCalendar: options.writeCalendar,
    summary: {
      candidateCount: rows.length,
      scheduledCount: scheduledRows.length,
      skippedCount: rows.length - scheduledRows.length,
      channelCount: channelSummaries.length,
      firstPublishAt: scheduledRows.map((row) => row.publishAt).sort()[0] || "",
      lastPublishAt: scheduledRows.map((row) => row.publishAt).sort().at(-1) || "",
      writeMetadata: options.writeMetadata,
      writeCalendar: options.writeCalendar,
      calendarReservationCount: calendar.reservations?.length || 0,
      calendarWrites,
      baseOccupiedSlotCount: baseOccupiedSlotKeys.size,
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
