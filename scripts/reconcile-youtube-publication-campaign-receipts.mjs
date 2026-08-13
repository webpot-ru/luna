#!/usr/bin/env node
import fs from "node:fs";

function parseArgs(argv) {
  const options = {
    campaignRegistry: "config/youtube-publication-campaigns.json",
    calendar: "config/youtube-publish-calendar.json",
    ordinaryRegistry: "config/youtube-published-videos.json",
    polyglotRegistry: "config/youtube-polyglot-published-videos.json",
    apply: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => (arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index]);
    if (arg === "--campaign-id" || arg.startsWith("--campaign-id=")) options.campaignId = value();
    else if (arg === "--manifest-hash" || arg.startsWith("--manifest-hash=")) options.manifestHash = value();
    else if (arg === "--control-report" || arg.startsWith("--control-report=")) options.controlReport = value();
    else if (arg === "--finalizer-report" || arg.startsWith("--finalizer-report=")) options.finalizerReport = value();
    else if (arg === "--parent-run-id" || arg.startsWith("--parent-run-id=")) options.parentRunId = value();
    else if (arg === "--parent-run-url" || arg.startsWith("--parent-run-url=")) options.parentRunUrl = value();
    else if (arg === "--campaign-registry" || arg.startsWith("--campaign-registry=")) options.campaignRegistry = value();
    else if (arg === "--calendar" || arg.startsWith("--calendar=")) options.calendar = value();
    else if (arg === "--ordinary-registry" || arg.startsWith("--ordinary-registry=")) options.ordinaryRegistry = value();
    else if (arg === "--polyglot-registry" || arg.startsWith("--polyglot-registry=")) options.polyglotRegistry = value();
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath) {
  if (!filePath || !fs.existsSync(filePath)) throw new Error(`Required JSON file not found: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeCode(value) {
  return String(value || "").trim().replace(/_/gu, "-").toUpperCase();
}

function normalizeLangs(row) {
  if (Array.isArray(row.targetLangs)) return row.targetLangs.map(normalizeCode).filter(Boolean);
  return String(row.targetLang || row.targetLangsCsv || "")
    .split(",")
    .map(normalizeCode)
    .filter(Boolean);
}

function sameInstant(left, right) {
  const leftMs = Date.parse(left || "");
  const rightMs = Date.parse(right || "");
  return Number.isFinite(leftMs) && Number.isFinite(rightMs) && leftMs === rightMs;
}

function sameLangs(left, right) {
  const leftSorted = [...normalizeLangs(left)].sort();
  const rightSorted = [...normalizeLangs(right)].sort();
  return leftSorted.length === rightSorted.length && leftSorted.every((value, index) => value === rightSorted[index]);
}

function matchesAssignment(assignment, live) {
  if (assignment.setId !== live.setId) return false;
  if (assignment.videoType !== live.videoType) return false;
  if (normalizeCode(assignment.supportLang) !== normalizeCode(live.supportLang)) return false;
  if (!sameInstant(assignment.publishAt, live.publishAt)) return false;
  if (assignment.videoType === "ordinary") return normalizeCode(assignment.targetLang) === normalizeCode(live.targetLang);
  return sameLangs(assignment, live);
}

function matchesRegistryRow(assignment, row, videoId) {
  if (row.youtubeVideoId !== videoId || row.setId !== assignment.setId) return false;
  if (normalizeCode(row.supportLang) !== normalizeCode(assignment.supportLang)) return false;
  if (assignment.videoType !== row.videoType) return false;
  if (assignment.videoType === "ordinary") return normalizeCode(row.targetLang) === normalizeCode(assignment.targetLang);
  return sameLangs(assignment, row);
}

function matchesCalendarRow(assignment, row, campaign) {
  if (row.setId !== assignment.setId || row.videoType !== assignment.videoType) return false;
  if (normalizeCode(row.supportLang) !== normalizeCode(assignment.supportLang)) return false;
  if (row.campaignId !== campaign.campaignId || row.campaignManifestHash !== campaign.manifestHash) return false;
  if (!sameInstant(row.publishAt, assignment.publishAt)) return false;
  if (assignment.videoType === "ordinary") return normalizeCode(row.targetLang) === normalizeCode(assignment.targetLang);
  return sameLangs(row, assignment) && String(row.bundleKey || "") === String(assignment.bundleKey || "");
}

function usage() {
  return [
    "Usage:",
    "  node scripts/reconcile-youtube-publication-campaign-receipts.mjs --campaign-id=<id> --manifest-hash=<hash>",
    "    --control-report=<complete-control.json> --finalizer-report=<finalizer.json>",
    "",
    "Dry-run by default. --apply updates only campaign registry, calendar and ordinary/Polyglot registries.",
  ].join("\n");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  for (const key of ["campaignId", "manifestHash", "controlReport", "finalizerReport"]) {
    if (!options[key]) throw new Error(`Missing --${key.replace(/[A-Z]/gu, (match) => `-${match.toLowerCase()}`)}`);
  }
  const campaignRegistry = readJson(options.campaignRegistry);
  const campaign = (campaignRegistry.campaigns || []).find((row) => row.campaignId === options.campaignId);
  if (!campaign || campaign.manifestHash !== options.manifestHash) throw new Error("Campaign identity mismatch.");
  if (!["claimed", "reconciliation_required"].includes(campaign.status)) {
    throw new Error(`Campaign status is not recoverable: ${campaign.status}`);
  }

  const control = readJson(options.controlReport);
  if (control.summary?.complete !== true || control.summary?.paginationComplete !== true || control.summary?.videoStatusReadbackComplete !== true) {
    throw new Error("Control evidence must be complete with pagination and video-status readback.");
  }
  if ((control.blockers || []).some((row) => ["duplicate_live_assignment", "duplicate_live_video_id"].includes(row.type))) {
    throw new Error("Control evidence contains live duplicate blockers.");
  }
  const finalizer = readJson(options.finalizerReport);
  if (finalizer.campaignId !== campaign.campaignId || finalizer.manifestHash !== campaign.manifestHash) {
    throw new Error("Finalizer evidence campaign identity mismatch.");
  }
  if (finalizer.complete !== false || finalizer.status !== "reconciliation_required") {
    throw new Error("Expected incomplete reconciliation_required finalizer evidence.");
  }
  if ((finalizer.duplicateAssignments || []).length || (finalizer.duplicateVideoIds || []).length || (finalizer.receiptErrors || []).length) {
    throw new Error("Finalizer evidence contains duplicate or receipt-error rows; stop for manual review.");
  }

  const liveRows = (control.publications || []).filter((row) => row.liveReadbackPresent === true && row.youtubeVideoId);
  const assignments = campaign.assignments || [];
  const matches = new Map();
  const duplicateLiveIds = new Set();
  for (const assignment of assignments) {
    const candidates = liveRows.filter((live) => matchesAssignment(assignment, live)
      && (!assignment.youtubeVideoId || live.youtubeVideoId === assignment.youtubeVideoId));
    if (candidates.length > 1) throw new Error(`Multiple live rows match ${assignment.assignmentKey}.`);
    if (candidates.length === 1) {
      const live = candidates[0];
      if (matches.has(live.youtubeVideoId)) duplicateLiveIds.add(live.youtubeVideoId);
      matches.set(assignment.assignmentKey, live);
    }
  }
  if (duplicateLiveIds.size) throw new Error(`One live video matched multiple campaign assignments: ${[...duplicateLiveIds].join(",")}`);
  const expectedObserved = Number(finalizer.observedCount);
  if (matches.size !== expectedObserved || Number(finalizer.missingCount) !== assignments.length - matches.size) {
    throw new Error(`Evidence count mismatch: matched=${matches.size}, finalizerObserved=${expectedObserved}, assignments=${assignments.length}`);
  }

  const ordinaryRegistry = readJson(options.ordinaryRegistry);
  const polyglotRegistry = readJson(options.polyglotRegistry);
  const allRegistries = [ordinaryRegistry, polyglotRegistry];
  const calendar = readJson(options.calendar);
  const reconciledAt = finalizer.generatedAt || new Date().toISOString();
  let assignmentUpdated = 0;
  let calendarUpdated = 0;
  let registryUpdated = 0;
  for (const assignment of assignments) {
    const live = matches.get(assignment.assignmentKey);
    if (!live) continue;
    const playlistId = assignment.playlist?.youtubePlaylistId || "";
    Object.assign(assignment, {
      status: "upload_accepted",
      youtubeVideoId: live.youtubeVideoId,
      youtubeVideoUrl: live.youtubeVideoUrl || `https://www.youtube.com/watch?v=${live.youtubeVideoId}`,
      youtubePlaylistId: playlistId,
      playlistItemId: assignment.playlistItemId || "",
      publicationStatus: live.publicationStatus || "live_youtube_upload_detected",
      thumbnailSet: live.thumbnailSet ?? assignment.thumbnailSet ?? null,
      githubRunId: options.parentRunId || assignment.githubRunId || "",
      githubRunUrl: options.parentRunUrl || assignment.githubRunUrl || "",
      finalizedAt: reconciledAt,
      stateRecovery: "live_control_plus_finalizer_artifact_after_finalizer_push_failure",
    });
    assignmentUpdated++;

    const registry = assignment.videoType === "polyglot" ? polyglotRegistry : ordinaryRegistry;
    const registryRows = (registry.publications || []).filter((row) => matchesRegistryRow(assignment, row, live.youtubeVideoId));
    if (registryRows.length !== 1) throw new Error(`Expected one durable registry row for ${assignment.assignmentKey}, got ${registryRows.length}.`);
    const registryRow = registryRows[0];
    Object.assign(registryRow, {
      assignmentKey: assignment.assignmentKey,
      campaignId: campaign.campaignId,
      campaignManifestHash: campaign.manifestHash,
      publishAt: assignment.publishAt,
      scheduledPublishAt: assignment.publishAt,
      youtubePlaylistId: registryRow.youtubePlaylistId || playlistId,
      playlist_key: assignment.playlist?.playlistKey || registryRow.playlist_key || "",
      githubRunId: options.parentRunId || registryRow.githubRunId || "",
      githubRunUrl: options.parentRunUrl || registryRow.githubRunUrl || "",
      reconciledAt,
      stateRecovery: "live_control_plus_finalizer_artifact_after_finalizer_push_failure",
    });
    if (assignment.videoType === "polyglot") {
      Object.assign(registryRow, {
        bundleKey: assignment.bundleKey,
        contentScope: assignment.contentScope,
        targetLangs: assignment.targetLangs,
        targetLangsCsv: assignment.targetLangs.join(","),
        targetLangsHash: assignment.targetLangsHash,
        targetLang: assignment.targetLangs.join(","),
        polyglotKey: assignment.polyglotKey,
      });
    } else {
      registryRow.targetLang = assignment.targetLang;
    }
    registryUpdated++;

    const calendarRows = (calendar.reservations || []).filter((row) => matchesCalendarRow(assignment, row, campaign));
    if (calendarRows.length !== 1) throw new Error(`Expected one calendar row for ${assignment.assignmentKey}, got ${calendarRows.length}.`);
    Object.assign(calendarRows[0], {
      youtubeVideoId: live.youtubeVideoId,
      youtubePlaylistId: playlistId || calendarRows[0].youtubePlaylistId || "",
      playlistItemId: calendarRows[0].playlistItemId || "",
      status: "campaign_upload_accepted",
      updatedAt: reconciledAt,
    });
    calendarUpdated++;
  }

  campaign.status = "reconciliation_required";
  campaign.finalizedAt = reconciledAt;
  campaign.finalizeSummary = {
    expectedCount: Number(finalizer.expectedCount),
    completedCount: Number(finalizer.completedCount),
    observedCount: Number(finalizer.observedCount),
    missingCount: Number(finalizer.missingCount),
    duplicateAssignmentCount: (finalizer.duplicateAssignments || []).length,
    duplicateVideoIdCount: (finalizer.duplicateVideoIds || []).length,
    unexpectedPublicationCount: (finalizer.unexpectedPublications || []).length,
    receiptErrorCount: (finalizer.receiptErrors || []).length,
    ordinaryResult: finalizer.workerResults?.ordinary || "success",
    polyglotResult: finalizer.workerResults?.polyglot || "failure",
    artifactCount: Number(finalizer.artifactCount || 0),
    stateRecovery: "live_control_plus_finalizer_artifact_after_finalizer_push_failure",
    stateRecoveryRunId: options.parentRunId || "",
  };
  campaign.stateRecovery = {
    recoveredAt: reconciledAt,
    controlGeneratedAt: control.generatedAt,
    finalizerGeneratedAt: finalizer.generatedAt,
    matchedAssignmentCount: matches.size,
    missingAssignmentCount: assignments.length - matches.size,
    source: "complete_live_control_and_finalizer_artifact",
  };

  if (options.apply) {
    writeJson(options.campaignRegistry, campaignRegistry);
    writeJson(options.calendar, calendar);
    writeJson(options.ordinaryRegistry, ordinaryRegistry);
    writeJson(options.polyglotRegistry, polyglotRegistry);
  }
  console.log(JSON.stringify({
    mode: options.apply ? "apply" : "dry-run",
    campaignId: campaign.campaignId,
    expectedCount: assignments.length,
    matchedAssignmentCount: matches.size,
    missingAssignmentCount: assignments.length - matches.size,
    assignmentUpdated,
    calendarUpdated,
    registryUpdated,
    missingAssignmentKeys: assignments.filter((row) => !matches.has(row.assignmentKey)).map((row) => row.assignmentKey),
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`Campaign receipt reconciliation failed: ${error.message}`);
  process.exit(1);
}
