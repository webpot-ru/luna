#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  isCampaignStatusActive,
  verifyCampaignManifest,
  verifyManifestSourceFingerprints,
} from "./lib/youtube-publication-campaign.mjs";
import {
  assignmentKey,
  calendarAssignmentKey,
} from "./lib/youtube-publication-control.mjs";
import {
  isActiveCalendarReservation,
  slotKey,
} from "./plan-youtube-publish-schedule.mjs";

const CONFIRM = "REARM_ZERO_UPLOAD_YOUTUBE_PUBLICATION_CAMPAIGN";
const EXPAND_CONFIRM = "EXPAND_ZERO_UPLOAD_YOUTUBE_PUBLICATION_CAMPAIGN";

function parseArgs(argv) {
  const options = {
    registry: "config/youtube-publication-campaigns.json",
    calendar: "config/youtube-publish-calendar.json",
    plansDir: "config/youtube-publication-campaign-plans",
    minFutureMinutes: 300,
    apply: false,
    confirm: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--manifest" || arg.startsWith("--manifest=")) options.manifest = value();
    else if (arg === "--replacement-campaign-id" || arg.startsWith("--replacement-campaign-id=")) options.replacementCampaignId = value();
    else if (arg === "--before-control-report" || arg.startsWith("--before-control-report=")) options.beforeControlReport = value();
    else if (arg === "--after-control-report" || arg.startsWith("--after-control-report=")) options.afterControlReport = value();
    else if (arg === "--registry" || arg.startsWith("--registry=")) options.registry = value();
    else if (arg === "--calendar" || arg.startsWith("--calendar=")) options.calendar = value();
    else if (arg === "--plans-dir" || arg.startsWith("--plans-dir=")) options.plansDir = value();
    else if (arg === "--min-future-minutes" || arg.startsWith("--min-future-minutes=")) options.minFutureMinutes = Number(value());
    else if (arg === "--allow-expanded-zero-upload-recovery") options.allowExpandedZeroUploadRecovery = true;
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm" || arg.startsWith("--confirm=")) options.confirm = value();
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function equalArrays(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function controlReportForSet(report, setId) {
  if (report.summary) return report;
  const deck = Object.values(report.decks || {}).find((row) => row?.setId === setId);
  assert(deck, `control snapshot has no deck report for ${setId}`);
  return {
    ...deck,
    blockers: deck.blockers || [],
    sourceRuns: deck.evidence?.sourceRuns || report.sourceRuns || [],
  };
}

function validateControlReport(report, label, setId) {
  const scoped = controlReportForSet(report, setId);
  const summary = scoped.summary || {};
  assert(summary.complete === true, `${label} control report is incomplete`);
  assert(summary.healthy === true, `${label} control report is unhealthy`);
  assert(summary.paginationComplete === true, `${label} pagination is incomplete`);
  assert(summary.videoStatusReadbackComplete === true, `${label} video-status readback is incomplete`);
  assert(Number(summary.blockerCount || 0) === 0 && (scoped.blockers || []).length === 0, `${label} control report has blockers`);
  const wrongSet = (scoped.publications || []).find((row) => row.setId && row.setId !== setId);
  assert(!wrongSet, `${label} control report contains another set: ${wrongSet?.setId}`);
  return scoped;
}

function zeroUploadSummaryIsClean(campaign) {
  const summary = campaign.finalizeSummary || {};
  return ["completedCount", "observedCount", "artifactCount", "receiptErrorCount"]
    .every((key) => Number(summary[key] || 0) === 0);
}

export function buildZeroUploadRearm({
  registry,
  calendar,
  manifest,
  beforeReport,
  afterReport,
  replacementCampaignId,
  now = new Date(),
  minFutureMinutes = 300,
  allowExpandedZeroUploadRecovery = false,
}) {
  verifyCampaignManifest(manifest);
  assert(manifest.summary?.applyReady === true && (manifest.blockers || []).length === 0, "recovery manifest is not apply-ready");
  const oldCampaign = (registry.campaigns || []).find((row) => row.campaignId === replacementCampaignId);
  assert(oldCampaign, `replacement campaign not found: ${replacementCampaignId}`);
  assert(oldCampaign.status === "reconciliation_required", `replacement campaign status must be reconciliation_required, got ${oldCampaign.status}`);
  assert(zeroUploadSummaryIsClean(oldCampaign), "replacement campaign finalizer does not prove zero uploads/artifacts/receipt errors");
  assert((oldCampaign.assignments || []).length > 0, "replacement campaign has no assignments");
  assert((oldCampaign.assignments || []).every((row) => row.status === "claimed"), "replacement campaign assignments are not all claimed");
  assert((oldCampaign.assignments || []).every((row) => !row.youtubeVideoId && !row.youtubeVideoUrl), "replacement campaign contains a YouTube receipt");
  assert(manifest.campaignId !== replacementCampaignId, "recovery campaign must have a new campaign ID");
  assert(manifest.evidence?.replacementCampaign?.campaignId === replacementCampaignId, "recovery manifest does not name the replacement campaign");
  assert(manifest.evidence?.replacementCampaign?.manifestHash === oldCampaign.manifestHash, "recovery manifest replacement hash does not match durable state");

  const scopedBeforeReport = validateControlReport(beforeReport, "before", oldCampaign.setId);
  const scopedAfterReport = validateControlReport(afterReport, "after", oldCampaign.setId);
  const beforeVideoIds = sortedUnique((scopedBeforeReport.publications || []).map((row) => row.youtubeVideoId));
  const afterVideoIds = sortedUnique((scopedAfterReport.publications || []).map((row) => row.youtubeVideoId));
  assert(equalArrays(beforeVideoIds, afterVideoIds), "live video ID set changed between before and after control reports");

  const oldAssignmentKeys = sortedUnique((oldCampaign.assignments || []).map((row) => row.assignmentKey));
  const newAssignmentKeys = sortedUnique((manifest.assignments || []).map((row) => row.assignmentKey));
  if (allowExpandedZeroUploadRecovery) {
    const missingOldAssignment = oldAssignmentKeys.find((key) => !newAssignmentKeys.includes(key));
    assert(!missingOldAssignment, `expanded recovery manifest omits zero-upload assignment: ${missingOldAssignment}`);
    assert(newAssignmentKeys.length > oldAssignmentKeys.length, "expanded recovery manifest must add at least one new assignment");
  } else {
    assert(equalArrays(oldAssignmentKeys, newAssignmentKeys), "recovery manifest assignment set differs from the zero-upload campaign");
  }
  const liveAssignmentKeys = new Set((scopedAfterReport.publications || []).map((row) => row.assignmentKey).filter(Boolean));
  const liveRecoveryKey = newAssignmentKeys.find((key) => liveAssignmentKeys.has(key));
  assert(!liveRecoveryKey, `recovery assignment is already live: ${liveRecoveryKey}`);

  const ownedClaims = (calendar.reservations || []).filter((row) => row.campaignId === replacementCampaignId && isActiveCalendarReservation(row));
  assert(ownedClaims.length === oldCampaign.assignments.length, `durable claim count ${ownedClaims.length} != ${oldCampaign.assignments.length}`);
  const claimsByAssignment = new Map(ownedClaims.map((row) => [calendarAssignmentKey(row), row]));
  for (const row of oldCampaign.assignments) {
    const claim = claimsByAssignment.get(row.calendarAssignmentKey);
    assert(claim, `old durable calendar claim missing: ${row.assignmentKey}`);
    assert(claim.campaignManifestHash === oldCampaign.manifestHash && claim.publishAt === row.publishAt, `old claim mismatch: ${row.assignmentKey}`);
  }

  const otherActiveReservations = (calendar.reservations || [])
    .filter((row) => row.campaignId !== replacementCampaignId)
    .filter(isActiveCalendarReservation);
  const occupiedSlots = new Set(otherActiveReservations.map(slotKey));
  const newSlots = (manifest.assignments || []).map((row) => row.slotKey);
  assert(new Set(newSlots).size === newSlots.length, "recovery manifest contains duplicate slots");
  const occupiedRecoverySlot = newSlots.find((key) => occupiedSlots.has(key));
  assert(!occupiedRecoverySlot, `recovery slot is already occupied: ${occupiedRecoverySlot}`);

  const otherActiveCampaigns = (registry.campaigns || [])
    .filter((row) => row.campaignId !== replacementCampaignId && isCampaignStatusActive(row.status));
  const otherAssignmentKeys = new Set(otherActiveCampaigns.flatMap((row) => row.assignmentKeys || []));
  const conflictingAssignment = newAssignmentKeys.find((key) => otherAssignmentKeys.has(key));
  assert(!conflictingAssignment, `recovery assignment is claimed by another campaign: ${conflictingAssignment}`);
  const firstPublishAt = Date.parse(manifest.summary?.firstPublishAt || "");
  assert(Number.isFinite(firstPublishAt), "recovery manifest has no valid firstPublishAt");
  assert(firstPublishAt >= now.getTime() + minFutureMinutes * 60_000, `first recovery slot is less than ${minFutureMinutes} minutes in the future`);
  for (const row of manifest.assignments || []) {
    assert(assignmentKey(row) === row.assignmentKey, `non-canonical recovery assignment: ${row.assignmentKey}`);
  }

  const rearmedAt = now.toISOString();
  const durableManifestPath = path.join("config/youtube-publication-campaign-plans", `${manifest.campaignId}.json`);
  const zeroUploadEvidence = {
    beforeSourceRuns: scopedBeforeReport.sourceRuns || [],
    afterSourceRuns: scopedAfterReport.sourceRuns || [],
    beforeVideoCount: beforeVideoIds.length,
    afterVideoCount: afterVideoIds.length,
    addedVideoIds: [],
    removedVideoIds: [],
  };
  const nextRegistry = structuredClone(registry);
  const oldRegistryRow = nextRegistry.campaigns.find((row) => row.campaignId === replacementCampaignId);
  const supersededStatus = allowExpandedZeroUploadRecovery
    ? "superseded_zero_upload_expansion"
    : "superseded_zero_upload_recovery";
  const recoverySource = allowExpandedZeroUploadRecovery
    ? "youtube-publication-campaign-zero-upload-expansion"
    : "youtube-publication-campaign-zero-upload-rearm";
  oldRegistryRow.status = supersededStatus;
  oldRegistryRow.supersededAt = rearmedAt;
  oldRegistryRow.supersededByCampaignId = manifest.campaignId;
  oldRegistryRow.zeroUploadEvidence = zeroUploadEvidence;
  for (const row of oldRegistryRow.assignments || []) row.status = supersededStatus;
  const newCampaign = {
    schemaVersion: 1,
    campaignId: manifest.campaignId,
    manifestHash: manifest.manifestHash,
    setId: manifest.setId,
    status: "claimed",
    claimedAt: rearmedAt,
    generatedAt: manifest.generatedAt,
    manifestPath: durableManifestPath,
    recoveryOfCampaignId: replacementCampaignId,
    ...(allowExpandedZeroUploadRecovery ? { expandedZeroUploadRecoveryOfCampaignId: replacementCampaignId } : {}),
    zeroUploadEvidence,
    inputs: manifest.inputs,
    summary: manifest.summary,
    evidence: manifest.evidence,
    assignmentKeys: manifest.assignments.map((row) => row.assignmentKey),
    slotKeys: manifest.assignments.map((row) => row.slotKey),
    assignments: manifest.assignments.map((row) => ({
      assignmentKey: row.assignmentKey,
      calendarAssignmentKey: row.calendarAssignmentKey,
      videoType: row.videoType,
      setId: row.setId,
      supportLang: row.supportLang,
      targetLang: row.targetLang,
      targetLangs: row.targetLangs || [],
      targetLangsHash: row.targetLangsHash || "",
      bundleKey: row.bundleKey || "",
      contentScope: row.contentScope || "",
      polyglotKey: row.polyglotKey || "",
      channelKey: row.channelKey,
      youtubeChannelId: row.youtubeChannelId,
      routeKey: row.routeKey,
      youtubeEnvironment: row.youtubeEnvironment,
      publishAt: row.publishAt,
      localDate: row.localDate,
      localTime: row.localTime,
      timeZone: row.timeZone,
      slotKey: row.slotKey,
      thumbnail: row.thumbnail,
      playlist: row.playlist,
      status: "claimed",
    })),
  };
  nextRegistry.campaigns.push(newCampaign);

  const nextCalendar = structuredClone(calendar);
  for (const row of nextCalendar.reservations || []) {
    if (row.campaignId !== replacementCampaignId || !isActiveCalendarReservation(row)) continue;
    row.status = supersededStatus;
    row.updatedAt = rearmedAt;
    row.supersededByCampaignId = manifest.campaignId;
  }
  for (const row of manifest.assignments || []) {
    nextCalendar.reservations.push({
      schemaVersion: 1,
      campaignId: manifest.campaignId,
      campaignManifestHash: manifest.manifestHash,
      status: "campaign_claimed",
      source: recoverySource,
      recoveryOfCampaignId: replacementCampaignId,
      videoType: row.videoType,
      setId: row.setId,
      supportLang: row.supportLang,
      targetLang: row.targetLang,
      targetLangs: row.targetLangs || [],
      targetLangsCsv: row.targetLangsCsv || "",
      targetLangsHash: row.targetLangsHash || "",
      bundleKey: row.bundleKey || "",
      contentScope: row.contentScope || "",
      polyglotKey: row.polyglotKey || "",
      channelKey: row.channelKey,
      youtubeChannelId: row.youtubeChannelId,
      publishAt: row.publishAt,
      timeZone: row.timeZone,
      localDate: row.localDate,
      localTime: row.localTime,
      localSlotIndex: row.localSlotIndex,
      analyticsCheckpointsAt: row.analyticsCheckpointsAt || [],
      createdAt: rearmedAt,
      updatedAt: rearmedAt,
    });
  }
  nextCalendar.reservations.sort((left, right) => `${left.channelKey}|${left.publishAt}|${left.setId}`.localeCompare(`${right.channelKey}|${right.publishAt}|${right.setId}`));

  return {
    nextRegistry,
    nextCalendar,
    report: {
      status: "rearm_ready",
      recoveryMode: allowExpandedZeroUploadRecovery ? "expanded_zero_upload_recovery" : "exact_zero_upload_rearm",
      replacementCampaignId,
      recoveryCampaignId: manifest.campaignId,
      manifestHash: manifest.manifestHash,
      assignmentCount: manifest.assignments.length,
      firstPublishAt: manifest.summary.firstPublishAt,
      lastPublishAt: manifest.summary.lastPublishAt,
      routeCounts: manifest.summary.routeCounts,
      zeroUploadEvidence,
      durableManifestPath,
      providerCalls: 0,
      youtubeWrites: 0,
    },
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(`node scripts/rearm-youtube-publication-campaign.mjs --manifest=<plan.json> --replacement-campaign-id=<id> --before-control-report=<json> --after-control-report=<json> [--allow-expanded-zero-upload-recovery] [--apply --confirm=${CONFIRM}|${EXPAND_CONFIRM}]`);
    return;
  }
  for (const key of ["manifest", "replacementCampaignId", "beforeControlReport", "afterControlReport"]) {
    if (!options[key]) throw new Error(`--${key.replaceAll(/[A-Z]/g, (value) => `-${value.toLowerCase()}`)} is required`);
  }
  const requiredConfirm = options.allowExpandedZeroUploadRecovery ? EXPAND_CONFIRM : CONFIRM;
  if (options.apply && options.confirm !== requiredConfirm) throw new Error(`--apply requires --confirm=${requiredConfirm}`);
  const manifest = readJson(options.manifest);
  const sourceMismatches = verifyManifestSourceFingerprints(manifest);
  if (sourceMismatches.length) throw new Error(`recovery manifest source changed: ${sourceMismatches.map((row) => row.key).join(", ")}`);
  const result = buildZeroUploadRearm({
    registry: readJson(options.registry),
    calendar: readJson(options.calendar),
    manifest,
    beforeReport: readJson(options.beforeControlReport),
    afterReport: readJson(options.afterControlReport),
    replacementCampaignId: options.replacementCampaignId,
    now: new Date(),
    minFutureMinutes: options.minFutureMinutes,
    allowExpandedZeroUploadRecovery: options.allowExpandedZeroUploadRecovery === true,
  });
  if (options.apply) {
    const durableManifestPath = path.join(options.plansDir, `${manifest.campaignId}.json`);
    assert(!fs.existsSync(durableManifestPath), `durable recovery manifest already exists: ${durableManifestPath}`);
    writeJsonAtomic(durableManifestPath, manifest);
    writeJsonAtomic(options.calendar, result.nextCalendar);
    writeJsonAtomic(options.registry, result.nextRegistry);
    result.report.status = "rearmed";
    result.report.durableManifestPath = durableManifestPath;
  }
  console.log(JSON.stringify({ mode: options.apply ? "apply" : "dry_run", ...result.report }, null, 2));
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isCli) {
  try {
    main();
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}
