#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

import {
  assignmentKey as controlAssignmentKey,
  canonicalSupportCode,
  isActive as controlIsActive,
  isPolyglotRow,
  normalizeCode,
} from "./lib/youtube-publication-control.mjs";

function parseArgs(argv) {
  const options = {
    reports: [],
    ordinaryRegistry: "config/youtube-published-videos.json",
    polyglotRegistry: "config/youtube-polyglot-published-videos.json",
    polyglotProgress: "config/youtube-polyglot-progress.json",
    channelConfig: "config/youtube-channels.json",
    apply: false,
  };
  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    else if (arg.startsWith("--report=")) options.reports.push(arg.slice("--report=".length));
    else if (arg.startsWith("--ordinary-registry=")) options.ordinaryRegistry = arg.slice("--ordinary-registry=".length);
    else if (arg.startsWith("--polyglot-registry=")) options.polyglotRegistry = arg.slice("--polyglot-registry=".length);
    else if (arg.startsWith("--polyglot-progress=")) options.polyglotProgress = arg.slice("--polyglot-progress=".length);
    else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Required file not found: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function isActive(row) {
  return controlIsActive(row);
}

function targetLangs(row) {
  if (Array.isArray(row.targetLangs)) return row.targetLangs.map(normalizeCode).filter(Boolean);
  return String(row.targetLang || row.targetLangsCsv || "").split(",").map(normalizeCode).filter(Boolean);
}

function assignmentKey(row) {
  return row.assignmentKey || controlAssignmentKey(row);
}

function targetHash(langs) {
  return crypto.createHash("sha256").update(langs.join(",")).digest("hex").slice(0, 12);
}

function channelFor(channels, supportLang) {
  const support = canonicalSupportCode(supportLang);
  return channels.find(channel => (channel.supportLangs || []).map(canonicalSupportCode).includes(support));
}

function durableRowFromLive(row, channels, reconciledAt) {
  const supportLang = canonicalSupportCode(row.supportLang);
  const channel = channelFor(channels, supportLang);
  const common = {
    schemaVersion: 1,
    videoType: row.videoType === "polyglot" ? "polyglot" : "ordinary",
    setId: row.setId,
    supportLang,
    youtubeVideoId: row.youtubeVideoId,
    youtubeVideoUrl: row.youtubeVideoUrl || `https://www.youtube.com/watch?v=${row.youtubeVideoId}`,
    channelKey: channel?.key || "",
    youtubeChannelId: channel?.channelId || "",
    privacyStatus: row.privacyStatus || "",
    publishAt: row.publishAt || "",
    scheduledPublishAt: row.publishAt || "",
    publicationStatus: row.publicationStatus || "live_youtube_upload_detected",
    thumbnailSet: row.thumbnailSet ?? null,
    thumbnailUploadMode: row.thumbnailUploadMode || "",
    needsThumbnailPermission: row.needsThumbnailPermission === true,
    needsPlaylistInsert: row.needsPlaylistInsert === true,
    source: "publication_control_live_registry_reconciliation",
    reconciledAt,
  };
  if (common.videoType === "ordinary") {
    return { ...common, targetLang: normalizeCode(row.targetLang), targetLangs: [] };
  }
  const langs = targetLangs(row);
  const hash = targetHash(langs);
  const bundleKey = row.bundleKey || String(row.polyglotKey || "").split(":")[3] || "";
  return {
    ...common,
    targetLang: langs.join(","),
    targetLangs: langs,
    targetLangsCsv: langs.join(","),
    targetLangsHash: hash,
    bundleKey,
    contentScope: row.contentScope || "full",
    polyglotKey: `polyglot:${row.setId}:${supportLang}:${bundleKey}:${hash}`,
  };
}

function markInactive(row, reason, liveVideoId, reconciledAt) {
  row.publicationStatus = reason;
  row.reconciledAt = reconciledAt;
  row.supersededByVideoId = liveVideoId || "";
  row.source = "publication_control_live_registry_reconciliation";
}

function replaceByVideoId(rows, replacement) {
  const remaining = rows.filter(row => row.youtubeVideoId !== replacement.youtubeVideoId);
  rows.splice(0, rows.length, ...remaining, replacement);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.reports.length !== 2) throw new Error(`Exactly two all-route deck reports are required; received ${options.reports.length}.`);
  const reports = options.reports.map(readJson);
  for (const report of reports) {
    if (report.summary?.complete !== true || report.summary?.paginationComplete !== true || report.summary?.videoStatusReadbackComplete !== true) {
      throw new Error("Refusing registry reconciliation from incomplete live evidence.");
    }
    if ((report.blockers || []).some(blocker => blocker.type === "duplicate_live_assignment")) {
      throw new Error("Refusing registry reconciliation while live duplicate assignments remain.");
    }
  }

  const ordinary = readJson(options.ordinaryRegistry);
  const polyglot = readJson(options.polyglotRegistry);
  const polyglotProgress = readJson(options.polyglotProgress);
  const channels = readJson(options.channelConfig).channels || [];
  const reconciledAt = new Date().toISOString();
  const deletedTombstones = reports.flatMap(report => report.deletedTombstones || []).filter(row => row.youtubeVideoId);
  let tombstoneRowsMarked = 0;
  let tombstoneProgressItemsMarked = 0;
  const markProgressDeleted = (item, evidence = "youtube_deleted_tombstone") => {
    if (!item?.youtubeVideoId || String(item.status || "").startsWith("deleted_")) return;
    item.status = "deleted_youtube_tombstone_confirmed";
    item.deletedAt = reconciledAt;
    item.updatedAt = reconciledAt;
    item.deletionEvidence = evidence;
    item.source = "publication_control_live_registry_reconciliation";
    tombstoneProgressItemsMarked++;
  };
  for (const tombstone of deletedTombstones) {
    for (const registryRows of [ordinary.publications, polyglot.publications]) {
      for (const row of registryRows) {
        if (row.youtubeVideoId !== tombstone.youtubeVideoId || !isActive(row)) continue;
        markInactive(row, "deleted_youtube_tombstone_confirmed", "", reconciledAt);
        row.deletedAt = reconciledAt;
        row.deletionEvidence = tombstone.evidence || "youtube_deleted_tombstone";
        tombstoneRowsMarked++;
      }
    }
    for (const item of polyglotProgress.items || []) {
      if (item.youtubeVideoId !== tombstone.youtubeVideoId) continue;
      markProgressDeleted(item, tombstone.evidence || "youtube_deleted_tombstone");
    }
  }
  const confirmedDeletedVideoIds = new Map(
    [...ordinary.publications, ...polyglot.publications]
      .filter(row => row.youtubeVideoId && row.publicationStatus === "deleted_youtube_tombstone_confirmed")
      .map(row => [row.youtubeVideoId, row.deletionEvidence || "durable_registry_deleted_youtube_tombstone_confirmed"]),
  );
  for (const item of polyglotProgress.items || []) {
    const evidence = confirmedDeletedVideoIds.get(item.youtubeVideoId);
    if (evidence) markProgressDeleted(item, evidence);
  }
  const liveRows = reports.flatMap(report => report.publications || []).filter(row => row.liveReadbackPresent === true && row.youtubeVideoId);
  const liveVideoIds = new Set(liveRows.map(row => row.youtubeVideoId));
  const liveRowsByVideoId = new Map(liveRows.map(row => [row.youtubeVideoId, row]));
  const misplacedPolyglotRows = ordinary.publications.filter(isPolyglotRow);
  ordinary.publications = ordinary.publications.filter(row => !isPolyglotRow(row));
  for (const videoId of new Set(misplacedPolyglotRows.map(row => row.youtubeVideoId).filter(Boolean))) {
    const liveRow = liveRowsByVideoId.get(videoId);
    if (liveRow) {
      replaceByVideoId(polyglot.publications, durableRowFromLive(liveRow, channels, reconciledAt));
      continue;
    }
    const candidates = [
      ...polyglot.publications.filter(row => row.youtubeVideoId === videoId),
      ...misplacedPolyglotRows.filter(row => row.youtubeVideoId === videoId),
    ];
    const preferred = candidates
      .filter(row => liveVideoIds.has(videoId) ? isActive(row) : !isActive(row))
      .sort((a, b) => Object.keys(b).length - Object.keys(a).length)[0]
      || candidates.sort((a, b) => Object.keys(b).length - Object.keys(a).length)[0];
    replaceByVideoId(polyglot.publications, preferred);
  }
  const liveByAssignment = new Map();
  for (const row of liveRows) {
    const key = assignmentKey(row);
    const existing = liveByAssignment.get(key);
    if (existing && existing.youtubeVideoId !== row.youtubeVideoId) throw new Error(`Multiple live videos remain for ${key}.`);
    liveByAssignment.set(key, row);
  }

  let ordinaryAdded = 0;
  let polyglotAdded = 0;
  let restoredLiveRows = 0;
  let staleRows = 0;
  const missingLiveRows = reports.flatMap(report => report.publications || [])
    .filter(row => row.liveReadbackPresent === true && row.durableRegistryPresent !== true && row.youtubeVideoId)
    .filter(row => {
      const registryRows = row.videoType === "polyglot" ? polyglot.publications : ordinary.publications;
      return !registryRows.some(registryRow => registryRow.youtubeVideoId === row.youtubeVideoId && isActive(registryRow));
    });

  for (const live of missingLiveRows) {
    const registryRows = live.videoType === "polyglot" ? polyglot.publications : ordinary.publications;
    const key = assignmentKey(live);
    for (const row of registryRows) {
      if (isActive(row) && assignmentKey(row) === key && row.youtubeVideoId !== live.youtubeVideoId) {
        markInactive(row, "superseded_registry_not_observed_after_live_readback", live.youtubeVideoId, reconciledAt);
        staleRows++;
      }
    }
    replaceByVideoId(registryRows, durableRowFromLive(live, channels, reconciledAt));
    if (live.videoType === "polyglot") polyglotAdded++;
    else ordinaryAdded++;
  }

  for (const live of liveRows) {
    const registryRows = live.videoType === "polyglot" ? polyglot.publications : ordinary.publications;
    if (registryRows.some(row => row.youtubeVideoId === live.youtubeVideoId && isActive(row))) continue;
    replaceByVideoId(registryRows, durableRowFromLive(live, channels, reconciledAt));
    restoredLiveRows++;
  }

  for (const blocker of reports.flatMap(report => report.blockers || []).filter(item => item.type === "duplicate_registry_assignment")) {
    const live = liveByAssignment.get(blocker.key);
    for (const videoId of blocker.videoIds || []) {
      if (liveVideoIds.has(videoId) || live?.youtubeVideoId === videoId) continue;
      for (const registryRows of [ordinary.publications, polyglot.publications]) {
        for (const row of registryRows) {
          if (row.youtubeVideoId === videoId && isActive(row)) {
            markInactive(row, "superseded_registry_not_observed_after_complete_live_readback", live?.youtubeVideoId || "", reconciledAt);
            staleRows++;
          }
        }
      }
    }
  }

  const missingAfter = missingLiveRows.filter(live => {
    const rows = live.videoType === "polyglot" ? polyglot.publications : ordinary.publications;
    return !rows.some(row => row.youtubeVideoId === live.youtubeVideoId && isActive(row));
  });
  if (missingAfter.length) throw new Error(`Failed to reconcile ${missingAfter.length} live video rows.`);

  for (const rows of [ordinary.publications, polyglot.publications]) {
    const activeKeys = new Map();
    for (const row of rows.filter(isActive)) {
      const key = assignmentKey(row);
      const existing = activeKeys.get(key);
      if (existing && existing !== row.youtubeVideoId) throw new Error(`Active durable assignment remains duplicated: ${key}`);
      activeKeys.set(key, row.youtubeVideoId);
    }
  }

  if (options.apply) {
    fs.writeFileSync(options.ordinaryRegistry, `${JSON.stringify(ordinary, null, 2)}\n`, "utf8");
    fs.writeFileSync(options.polyglotRegistry, `${JSON.stringify(polyglot, null, 2)}\n`, "utf8");
    fs.writeFileSync(options.polyglotProgress, `${JSON.stringify(polyglotProgress, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify({
    mode: options.apply ? "apply" : "dry-run",
    liveRows: liveRows.length,
    missingLiveRows: missingLiveRows.length,
    ordinaryAdded,
    polyglotAdded,
    restoredLiveRows,
    tombstoneRowsMarked,
    tombstoneProgressItemsMarked,
    staleRows,
    migratedPolyglotRows: misplacedPolyglotRows.length,
    ordinaryPublicationCount: ordinary.publications.length,
    polyglotPublicationCount: polyglot.publications.length,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`Publication registry reconciliation failed: ${error.message}`);
  process.exit(1);
}
