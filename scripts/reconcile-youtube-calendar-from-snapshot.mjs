#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  calendarAssignmentKey,
  canonicalSupportCode,
  isActiveReservation,
  isPolyglotRow,
  normalizeCode,
} from "./lib/youtube-publication-control.mjs";

const DEFAULT_SNAPSHOT_PATH = "config/youtube-publication-snapshot.json";
const DEFAULT_CALENDAR_PATH = "config/youtube-publish-calendar.json";
const DEFAULT_CHANNELS_PATH = "config/youtube-channels.json";
const DEFAULT_POLICY_PATH = "config/youtube-publish-schedule-policy.json";

function parseArgs(argv) {
  const options = {
    snapshot: DEFAULT_SNAPSHOT_PATH,
    calendar: DEFAULT_CALENDAR_PATH,
    channels: DEFAULT_CHANNELS_PATH,
    policy: DEFAULT_POLICY_PATH,
    report: "",
    videoIds: [],
    apply: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--snapshot" || arg.startsWith("--snapshot=")) options.snapshot = value();
    else if (arg === "--calendar" || arg.startsWith("--calendar=")) options.calendar = value();
    else if (arg === "--channels" || arg.startsWith("--channels=")) options.channels = value();
    else if (arg === "--policy" || arg.startsWith("--policy=")) options.policy = value();
    else if (arg === "--report" || arg.startsWith("--report=")) options.report = value();
    else if (arg === "--video-ids" || arg.startsWith("--video-ids=")) options.videoIds = String(value()).split(",").map((id) => id.trim()).filter(Boolean);
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Required JSON file not found: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function channelIndex(channelsConfig) {
  const result = new Map();
  for (const channel of channelsConfig.channels || []) {
    for (const supportLang of channel.supportLangs || []) {
      const canonical = canonicalSupportCode(supportLang);
      const existing = result.get(canonical);
      if (existing && existing.key !== channel.key) {
        throw new Error(`Canonical support ${canonical} maps to multiple physical channels`);
      }
      result.set(canonical, channel);
    }
  }
  return result;
}

const formatterCache = new Map();

function zonedParts(iso, timeZone) {
  const key = timeZone || "Etc/UTC";
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: key,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(key, formatter);
  }
  const parts = Object.fromEntries(formatter.formatToParts(new Date(iso))
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, part.value]));
  return {
    localDate: `${parts.year}-${parts.month}-${parts.day}`,
    localTime: `${parts.hour}:${parts.minute}`,
  };
}

function normalizedPublishAt(value) {
  const millis = Date.parse(value || "");
  return Number.isFinite(millis) ? new Date(millis).toISOString() : "";
}

function sameInstant(left, right) {
  const leftMillis = Date.parse(left || "");
  const rightMillis = Date.parse(right || "");
  return Number.isFinite(leftMillis) && Number.isFinite(rightMillis) && Math.abs(leftMillis - rightMillis) <= 1000;
}

function slotKey(row) {
  return `${row.channelKey || ""}|${normalizedPublishAt(row.publishAt)}`;
}

function calendarShape(publication, channel, policy, now, policyPath) {
  const supportLang = canonicalSupportCode(publication.supportLang);
  const targetLangs = (publication.targetLangs || []).map(normalizeCode).filter(Boolean);
  const targetLang = isPolyglotRow(publication) ? targetLangs.join(",") : normalizeCode(publication.targetLang);
  const publishAt = normalizedPublishAt(publication.publishAt);
  const channelPolicy = policy.channels?.[channel.key] || {};
  const timeZone = channelPolicy.timezone || policy.default?.timezone || "Etc/UTC";
  const { localDate, localTime } = zonedParts(publishAt, timeZone);
  const dailySlots = channelPolicy.dailySlotsLocal || policy.default?.dailySlotsLocal || [];
  const checkpointHours = channelPolicy.performanceCheckpointsHours || policy.default?.performanceCheckpointsHours || [];
  const row = {
    schemaVersion: 1,
    videoType: isPolyglotRow(publication) ? "polyglot" : "ordinary",
    setId: publication.setId,
    supportLang,
    targetLang,
    channelKey: channel.key,
    youtubeChannelId: channel.channelId || "",
    publishAt,
    timeZone,
    localDate,
    localTime,
    localSlotIndex: dailySlots.indexOf(localTime),
    status: "reserved_live_readback_reconciled",
    source: "youtube-publication-snapshot-reconciliation",
    policyPath,
    youtubeVideoId: publication.youtubeVideoId,
    analyticsCheckpointsAt: checkpointHours.map((hoursAfterPublish) => ({
      hoursAfterPublish,
      dueAt: new Date(Date.parse(publishAt) + hoursAfterPublish * 60 * 60 * 1000).toISOString(),
    })),
    updatedAt: now,
  };
  if (row.videoType === "polyglot") {
    row.bundleKey = publication.bundleKey || "";
    row.contentScope = publication.contentScope || "full";
    row.targetLangs = targetLangs;
    row.targetLangsCsv = targetLang;
  }
  return row;
}

function duplicateLiveVideoIds(snapshot) {
  const ids = new Set();
  for (const deck of snapshot.decks || []) {
    for (const group of deck.duplicateGroups || []) {
      if (!(group.evidenceTypes || []).includes("duplicate_live_assignment")) continue;
      for (const videoId of group.videoIds || []) ids.add(videoId);
    }
  }
  return ids;
}

function scheduledPublications(snapshot) {
  return (snapshot.decks || []).flatMap((deck) => deck.publications || []).filter((row) => (
    row.liveReadbackPresent === true
    && row.privacyStatus === "private"
    && row.state === "scheduled"
    && row.youtubeVideoId
    && normalizedPublishAt(row.publishAt)
  ));
}

function summarizeSkip(report, reason, publication, details = {}) {
  report.skipped.push({
    reason,
    setId: publication.setId || "",
    supportLang: canonicalSupportCode(publication.supportLang),
    targetLang: publication.targetLang || "",
    bundleKey: publication.bundleKey || "",
    youtubeVideoId: publication.youtubeVideoId || "",
    publishAt: normalizedPublishAt(publication.publishAt),
    ...details,
  });
}

function reconcileCalendar({ snapshot, calendar, channelsConfig, policy, policyPath = DEFAULT_POLICY_PATH, now = new Date().toISOString(), allowedVideoIds = [] }) {
  const channels = channelIndex(channelsConfig);
  const reservations = calendar.reservations || [];
  const activeRows = reservations.filter(isActiveReservation);
  const duplicateIds = duplicateLiveVideoIds(snapshot);
  const allowedIds = new Set(allowedVideoIds);
  const candidates = scheduledPublications(snapshot).filter((row) => !allowedIds.size || allowedIds.has(row.youtubeVideoId));
  const candidateGroups = new Map();
  const prepared = [];
  const report = {
    schemaVersion: 1,
    generatedAt: now,
    mode: "dry-run",
    sourceSnapshotGeneratedAt: snapshot.generatedAt || "",
    summary: {
      scheduledLiveCandidates: candidates.length,
      created: 0,
      updated: 0,
      unchanged: 0,
      skipped: 0,
    },
    changes: [],
    skipped: [],
  };

  for (const publication of candidates) {
    const supportLang = canonicalSupportCode(publication.supportLang);
    const channel = channels.get(supportLang);
    if (!channel) {
      summarizeSkip(report, "channel_not_configured", publication);
      continue;
    }
    const shaped = calendarShape(publication, channel, policy, now, policyPath);
    const key = calendarAssignmentKey(shaped);
    prepared.push({ publication, shaped, key });
    const values = candidateGroups.get(key) || [];
    values.push(publication.youtubeVideoId);
    candidateGroups.set(key, values);
  }

  for (const { publication, shaped, key } of prepared) {
    if (duplicateIds.has(publication.youtubeVideoId)) {
      summarizeSkip(report, "live_duplicate_group", publication);
      continue;
    }
    const semanticCandidateIds = [...new Set(candidateGroups.get(key) || [])];
    if (semanticCandidateIds.length > 1) {
      summarizeSkip(report, "multiple_live_videos_for_assignment", publication, { videoIds: semanticCandidateIds.sort() });
      continue;
    }

    const byVideo = activeRows.filter((row) => row.youtubeVideoId === publication.youtubeVideoId);
    const byAssignment = activeRows.filter((row) => calendarAssignmentKey(row) === key);
    if (byVideo.length > 1 || byAssignment.length > 1) {
      summarizeSkip(report, "ambiguous_active_calendar_rows", publication, {
        matchingVideoRows: byVideo.length,
        matchingAssignmentRows: byAssignment.length,
      });
      continue;
    }
    const existing = byVideo[0] || byAssignment[0];
    if (existing && calendarAssignmentKey(existing) !== key) {
      summarizeSkip(report, "video_assignment_mismatch", publication, { existingAssignmentKey: calendarAssignmentKey(existing), expectedAssignmentKey: key });
      continue;
    }
    if (existing?.youtubeVideoId && existing.youtubeVideoId !== publication.youtubeVideoId) {
      summarizeSkip(report, "assignment_points_to_different_video", publication, { existingVideoId: existing.youtubeVideoId });
      continue;
    }

    const collisions = activeRows.filter((row) => row !== existing && slotKey(row) === slotKey(shaped));
    if (collisions.length) {
      summarizeSkip(report, "calendar_slot_collision", publication, {
        conflictingVideoIds: [...new Set(collisions.map((row) => row.youtubeVideoId).filter(Boolean))].sort(),
        conflictingAssignmentKeys: [...new Set(collisions.map(calendarAssignmentKey))].sort(),
      });
      continue;
    }

    if (existing && sameInstant(existing.publishAt, shaped.publishAt) && existing.youtubeVideoId === shaped.youtubeVideoId) {
      report.summary.unchanged += 1;
      continue;
    }
    if (existing) {
      const before = { publishAt: existing.publishAt || "", youtubeVideoId: existing.youtubeVideoId || "" };
      Object.assign(existing, shaped, { createdAt: existing.createdAt || now });
      report.summary.updated += 1;
      report.changes.push({ action: "update", assignmentKey: key, before, after: { publishAt: shaped.publishAt, youtubeVideoId: shaped.youtubeVideoId } });
    } else {
      reservations.push({ ...shaped, createdAt: now });
      activeRows.push(reservations.at(-1));
      report.summary.created += 1;
      report.changes.push({ action: "create", assignmentKey: key, after: { publishAt: shaped.publishAt, youtubeVideoId: shaped.youtubeVideoId } });
    }
  }

  report.summary.skipped = report.skipped.length;
  calendar.reservations = reservations;
  return { calendar, report };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: node scripts/reconcile-youtube-calendar-from-snapshot.mjs [--apply] [--video-ids=<id,...>] [--snapshot=<json>] [--calendar=<json>] [--report=<json>]");
    return;
  }
  const snapshot = readJson(options.snapshot);
  const calendar = readJson(options.calendar);
  const channelsConfig = readJson(options.channels);
  const policy = readJson(options.policy);
  const { calendar: reconciled, report } = reconcileCalendar({
    snapshot,
    calendar,
    channelsConfig,
    policy,
    policyPath: options.policy,
    allowedVideoIds: options.videoIds,
  });
  report.mode = options.apply ? "apply_local_calendar_only" : "dry-run";
  if (options.apply) writeJson(options.calendar, reconciled);
  if (options.report) writeJson(options.report, report);
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

export { reconcileCalendar };
