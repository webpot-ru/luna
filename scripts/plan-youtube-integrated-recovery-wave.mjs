#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildPublicationCampaign,
  fileFingerprint,
  sha256Json,
  verifyCampaignManifest,
} from "./lib/youtube-publication-campaign.mjs";
import {
  assignmentKey,
  calendarAssignmentKey,
  effectiveScheduleStartDate,
  isPolyglotRow,
  polyglotProductSlotKey,
} from "./lib/youtube-publication-control.mjs";
import {
  channelPolicy,
  findFreeSlot,
  isActiveCalendarReservation,
  slotKey,
  ymdInZone,
} from "./plan-youtube-publish-schedule.mjs";

const DEFAULT_SET_ID = "home_kitchen_storage_cleaning_a2";
const DEFAULT_SOURCE_CAMPAIGN_ID = "yt-home_kitchen_storage_cleaning_a2-2026-07-28-cdaa533f7749";

function parseArgs(argv) {
  const options = {
    setId: DEFAULT_SET_ID,
    sourceCampaignId: DEFAULT_SOURCE_CAMPAIGN_ID,
    ordinaryPerChannel: 11,
    polyglotPerChannel: 1,
    minFutureMinutes: 90,
    maxSnapshotAgeMinutes: 30,
    expectedSourceAssignments: 113,
    registry: "config/youtube-publication-campaigns.json",
    calendar: "config/youtube-publish-calendar.json",
    policy: "config/youtube-publish-schedule-policy.json",
    routing: "config/youtube-api-project-routing.json",
    channels: "config/youtube-channels.json",
    covers: "config/youtube-cover-assets.json",
    ordinaryPlaylists: "config/youtube-playlists.json",
    polyglotPlaylists: "config/youtube-polyglot-playlists.json",
    snapshot: "config/youtube-publication-snapshot.json",
    playlistDiscovery: "config/youtube-playlist-discovery-snapshot.json",
    output: "outputs/youtube-integrated-recovery-wave-plan.json",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--set" || arg.startsWith("--set=")) options.setId = value();
    else if (arg === "--source-campaign-id" || arg.startsWith("--source-campaign-id=")) options.sourceCampaignId = value();
    else if (arg === "--ordinary-per-channel" || arg.startsWith("--ordinary-per-channel=")) options.ordinaryPerChannel = Number(value());
    else if (arg === "--polyglot-per-channel" || arg.startsWith("--polyglot-per-channel=")) options.polyglotPerChannel = Number(value());
    else if (arg === "--min-future-minutes" || arg.startsWith("--min-future-minutes=")) options.minFutureMinutes = Number(value());
    else if (arg === "--max-snapshot-age-minutes" || arg.startsWith("--max-snapshot-age-minutes=")) options.maxSnapshotAgeMinutes = Number(value());
    else if (arg === "--expected-source-assignments" || arg.startsWith("--expected-source-assignments=")) options.expectedSourceAssignments = Number(value());
    else if (arg === "--registry" || arg.startsWith("--registry=")) options.registry = value();
    else if (arg === "--calendar" || arg.startsWith("--calendar=")) options.calendar = value();
    else if (arg === "--policy" || arg.startsWith("--policy=")) options.policy = value();
    else if (arg === "--routing" || arg.startsWith("--routing=")) options.routing = value();
    else if (arg === "--channels" || arg.startsWith("--channels=")) options.channels = value();
    else if (arg === "--covers" || arg.startsWith("--covers=")) options.covers = value();
    else if (arg === "--ordinary-playlists" || arg.startsWith("--ordinary-playlists=")) options.ordinaryPlaylists = value();
    else if (arg === "--polyglot-playlists" || arg.startsWith("--polyglot-playlists=")) options.polyglotPlaylists = value();
    else if (arg === "--snapshot" || arg.startsWith("--snapshot=")) options.snapshot = value();
    else if (arg === "--playlist-discovery" || arg.startsWith("--playlist-discovery=")) options.playlistDiscovery = value();
    else if (arg === "--control-report" || arg.startsWith("--control-report=")) options.controlReport = value();
    else if (arg === "--start-date" || arg.startsWith("--start-date=")) options.startDate = value();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
    else if (arg === "--generated-at" || arg.startsWith("--generated-at=")) options.generatedAt = value();
    else if (arg === "--json") options.json = true;
    else if (arg === "--require-apply-ready") options.requireApplyReady = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return "node scripts/plan-youtube-integrated-recovery-wave.mjs --control-report=<all-routes.json> [--set=<set_id>] [--source-campaign-id=<id>] [--ordinary-per-channel=11] [--polyglot-per-channel=1]";
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function hasUploadReceipt(row = {}) {
  return Boolean(row.youtubeVideoId || row.youtubeVideoUrl || row.artifactPath || row.receiptPath || row.uploadedAt || row.playlistItemId);
}

function groupBySupport(rows, videoType) {
  const grouped = new Map();
  for (const row of rows.filter((candidate) => candidate.videoType === videoType)) {
    const list = grouped.get(row.supportLang) || [];
    list.push(row);
    grouped.set(row.supportLang, list);
  }
  return grouped;
}

function analyticsCheckpoints(publishAt, hours) {
  const source = Date.parse(publishAt || "");
  if (!Number.isFinite(source)) return [];
  return (hours || []).map((hour) => new Date(source + Number(hour) * 60 * 60 * 1000).toISOString());
}

function sourceRowsFromCampaign({ registry, setId, sourceCampaignId, expectedSourceAssignments }) {
  const campaign = (registry.campaigns || []).find((row) => row.campaignId === sourceCampaignId);
  assert(campaign, `source campaign not found: ${sourceCampaignId}`);
  assert(campaign.setId === setId, `source campaign set mismatch: ${campaign.setId || "missing"}`);
  const isUnlaunched = campaign.status === "claimed";
  const isPartialRecovery = campaign.status === "reconciliation_required";
  assert(isUnlaunched || isPartialRecovery, `source campaign must be claimed or reconciliation_required, got ${campaign.status || "missing"}`);
  if (isUnlaunched) {
    assert(!campaign.finalizedAt && !campaign.finalizeSummary && !campaign.githubRunId && !campaign.dispatchRunId, `${sourceCampaignId}: unlaunched source campaign has dispatch/finalizer evidence`);
  } else {
    const summary = campaign.finalizeSummary || {};
    assert(Number(summary.duplicateAssignmentCount || 0) === 0, `${sourceCampaignId}: source campaign has duplicate assignment evidence`);
    assert(Number(summary.duplicateVideoIdCount || 0) === 0, `${sourceCampaignId}: source campaign has duplicate video ID evidence`);
    assert(Number(summary.unexpectedPublicationCount || 0) === 0, `${sourceCampaignId}: source campaign has unexpected publication evidence`);
  }
  const rows = (campaign.assignments || []).filter((row) => row.status === "claimed" && !hasUploadReceipt(row));
  if (isUnlaunched) assert(rows.length === campaign.assignments.length, `${sourceCampaignId}: every unlaunched source assignment must remain claimed`);
  else assert(Number(campaign.finalizeSummary?.missingCount || 0) === rows.length, `${sourceCampaignId}: missing receipt count does not match recoverable claimed rows`);
  assert(rows.length === expectedSourceAssignments, `${sourceCampaignId}: source assignment count ${rows.length} != ${expectedSourceAssignments}`);
  for (const row of rows) {
    assert(!hasUploadReceipt(row), `${row.assignmentKey}: source row has upload receipt evidence`);
    assert((campaign.assignmentKeys || []).includes(row.assignmentKey), `${row.assignmentKey}: source row is missing from active campaign keys`);
  }
  return { campaign, rows, sourceMode: isUnlaunched ? "unlaunched_claimed" : "partial_reconciliation_required" };
}

function previewPaths(options, now) {
  const stamp = now.toISOString().replace(/[:.]/gu, "-");
  const directory = path.join("scratch", `integrated-recovery-preview-${stamp}`);
  return {
    directory,
    registry: path.join(directory, "youtube-publication-campaigns.preview.json"),
    calendar: path.join(directory, "youtube-publish-calendar.preview.json"),
  };
}

function buildUnlaunchedPreview({ registry, calendar, sourceCampaignId, sourceRows }) {
  const sourceAssignmentKeys = new Set(sourceRows.map((row) => row.assignmentKey));
  const sourceSlotKeys = new Set(sourceRows.map((row) => row.slotKey));
  const sourceCalendarKeys = new Set(sourceRows.map((row) => row.calendarAssignmentKey));
  const previewRegistry = structuredClone(registry);
  for (const campaign of previewRegistry.campaigns || []) {
    if (campaign.campaignId !== sourceCampaignId) continue;
    campaign.assignmentKeys = (campaign.assignmentKeys || []).filter((key) => !sourceAssignmentKeys.has(key));
    campaign.slotKeys = (campaign.slotKeys || []).filter((key) => !sourceSlotKeys.has(key));
    for (const row of campaign.assignments || []) {
      if (sourceAssignmentKeys.has(row.assignmentKey)) row.status = "superseded_integrated_plan";
    }
    const remainingActive = (campaign.assignments || []).some((row) => row.status === "claimed" || row.status === "upload_accepted" || row.status === "upload_accepted_reconciliation_required");
    if (!remainingActive) campaign.status = "superseded_integrated_plan_preview";
  }
  const previewCalendar = structuredClone(calendar);
  for (const row of previewCalendar.reservations || []) {
    if (row.campaignId === sourceCampaignId && sourceCalendarKeys.has(calendarAssignmentKey(row)) && isActiveCalendarReservation(row)) {
      row.status = "superseded_integrated_plan_preview";
    }
  }
  return { previewRegistry, previewCalendar };
}

function transferSourceToSlot(source, slotCarrier, sourceCampaignId) {
  return {
    ...source,
    channelKey: slotCarrier.channelKey,
    youtubeChannelId: slotCarrier.youtubeChannelId,
    routeKey: slotCarrier.routeKey,
    youtubeEnvironment: slotCarrier.youtubeEnvironment,
    productionReadiness: slotCarrier.productionReadiness,
    publishAt: slotCarrier.publishAt,
    requestedStartDate: slotCarrier.requestedStartDate,
    effectiveStartDate: slotCarrier.effectiveStartDate,
    timeZone: slotCarrier.timeZone,
    localDate: slotCarrier.localDate,
    localTime: slotCarrier.localTime,
    localSlotIndex: slotCarrier.localSlotIndex,
    slotKey: slotCarrier.slotKey,
    analyticsCheckpointsAt: slotCarrier.analyticsCheckpointsAt,
    integratedRecovery: {
      sourceCampaignId,
      sourceAssignmentKey: source.assignmentKey,
      scheduleCarrierAssignmentKey: slotCarrier.assignmentKey,
    },
  };
}

function composeOrdinaryAssignments({ supports, baseAssignments, sourceRows, ordinaryPerChannel, sourceCampaignId }) {
  const sourceBySupport = groupBySupport(sourceRows, "ordinary");
  const baseBySupport = groupBySupport(baseAssignments, "ordinary");
  const output = [];
  for (const support of supports) {
    const source = sourceBySupport.get(support) || [];
    const base = baseBySupport.get(support) || [];
    assert(source.length <= ordinaryPerChannel, `${support}: source ordinary tails ${source.length} exceed configured ${ordinaryPerChannel}`);
    assert(base.length === ordinaryPerChannel, `${support}: preview ordinary rows ${base.length} != ${ordinaryPerChannel}`);
    const sourceKeys = new Set(source.map((row) => row.assignmentKey));
    assert(sourceKeys.size === source.length, `${support}: duplicate source ordinary assignment key`);
    const baseByKey = new Map(base.map((row) => [row.assignmentKey, row]));
    const freeCarriers = base.filter((row) => !sourceKeys.has(row.assignmentKey));
    const rows = [];
    for (const row of source) {
      const carrier = baseByKey.get(row.assignmentKey) || freeCarriers.shift();
      assert(carrier, `${support}: no free schedule carrier remains for source ordinary ${row.assignmentKey}`);
      rows.push(transferSourceToSlot(row, carrier, sourceCampaignId));
    }
    const neededFresh = ordinaryPerChannel - source.length;
    assert(freeCarriers.length === neededFresh, `${support}: fresh ordinary complement ${freeCarriers.length} != ${neededFresh}`);
    rows.push(...freeCarriers);
    assert(rows.length === ordinaryPerChannel, `${support}: composed ordinary count ${rows.length} != ${ordinaryPerChannel}`);
    output.push(...rows);
  }
  return output;
}

function composePolyglotAssignments({ supports, baseAssignments, sourceRows, sourceCampaignId }) {
  const sourceBySupport = groupBySupport(sourceRows, "polyglot");
  const baseBySupport = groupBySupport(baseAssignments, "polyglot");
  const output = [];
  const pending = [];
  for (const support of supports) {
    const source = sourceBySupport.get(support) || [];
    assert(source.length === 1, `${support}: source Polyglot tails ${source.length} != 1`);
    const carrier = (baseBySupport.get(support) || [])[0];
    if (!carrier) {
      pending.push(source[0]);
      continue;
    }
    output.push(transferSourceToSlot(source[0], carrier, sourceCampaignId));
  }
  return { output, pending };
}

function assignPendingPolyglotSlots({ pending, assignments, calendar, sourceCampaignId, policy, now, minFutureMinutes }) {
  if (!pending.length) return [];
  const sourceKeys = new Set(pending.map((row) => `${sourceCampaignId}|${row.calendarAssignmentKey}`));
  const occupied = new Set((calendar.reservations || [])
    .filter(isActiveCalendarReservation)
    .filter((row) => !sourceKeys.has(`${row.campaignId}|${calendarAssignmentKey(row)}`))
    .map(slotKey));
  const planned = new Set(assignments.map((row) => row.slotKey));
  const minPublishMillis = now.getTime() + minFutureMinutes * 60_000;
  const scheduled = [];
  for (const row of pending) {
    const perChannelPolicy = channelPolicy(policy, row.channelKey);
    const ordinaryCarrier = assignments.find((candidate) => candidate.supportLang === row.supportLang && candidate.videoType === "ordinary");
    const baseDate = ordinaryCarrier?.effectiveStartDate || effectiveScheduleStartDate({
      automaticStartDate: ymdInZone(new Date(minPublishMillis), perChannelPolicy.timeZone),
      requestedStartDate: "",
      fillEarliest: perChannelPolicy.fillEarliestAvailable,
    });
    const slot = findFreeSlot({
      channelKey: row.channelKey,
      perChannelPolicy,
      baseDate,
      baseOccupiedSlotKeys: occupied,
      plannedSlotKeys: planned,
      preferredFreeOrdinal: null,
      minPublishMillis,
      fillDayGaps: perChannelPolicy.fillEarliestAvailable,
    });
    const assigned = {
      ...row,
      publishAt: slot.publishAt,
      requestedStartDate: "auto",
      effectiveStartDate: baseDate,
      timeZone: slot.timeZone,
      localDate: slot.localDate,
      localTime: slot.localTime,
      localSlotIndex: slot.localSlotIndex,
      slotKey: slotKey({ channelKey: row.channelKey, publishAt: slot.publishAt }),
      analyticsCheckpointsAt: analyticsCheckpoints(slot.publishAt, perChannelPolicy.performanceCheckpointsHours),
      integratedRecovery: {
        sourceCampaignId,
        sourceAssignmentKey: row.assignmentKey,
        scheduleCarrierAssignmentKey: "new_free_slot",
      },
    };
    planned.add(assigned.slotKey);
    scheduled.push(assigned);
  }
  return scheduled;
}

function validateLiveControl({ report, assignments, now, maxSnapshotAgeMinutes }) {
  const summary = report.summary || {};
  assert(summary.complete === true && summary.healthy === true && Number(summary.blockerCount || 0) === 0, "control report is not healthy and complete");
  assert(summary.paginationComplete === true && summary.videoStatusReadbackComplete === true, "control report pagination/status readback is incomplete");
  assert(Number(summary.unclassifiedRecentUploadCount || 0) === 0, "control report has recent unclassified uploads");
  const ageMinutes = (now.getTime() - Date.parse(report.generatedAt || "")) / 60_000;
  assert(Number.isFinite(ageMinutes) && ageMinutes >= -5 && ageMinutes <= maxSnapshotAgeMinutes, `control report is stale: ${Number.isFinite(ageMinutes) ? ageMinutes.toFixed(1) : "unknown"}m`);
  const ordinaryLive = new Set((report.publications || []).filter((row) => row.youtubeVideoId && !isPolyglotRow(row)).map(assignmentKey));
  const polyglotLive = new Set((report.publications || []).filter((row) => row.youtubeVideoId && isPolyglotRow(row)).map(polyglotProductSlotKey));
  for (const row of assignments) {
    if (row.videoType === "ordinary") assert(!ordinaryLive.has(row.assignmentKey), `${row.assignmentKey}: ordinary assignment is already live`);
    else assert(!polyglotLive.has(polyglotProductSlotKey(row)), `${row.assignmentKey}: Polyglot product is already live`);
  }
  return { generatedAt: report.generatedAt, ageMinutes, activeVideoCount: Number(summary.activeVideoCount || 0) };
}

function aggregateUsage({ assignments, routing }) {
  const quota = routing.quotaPolicy || {};
  const aggregateLimit = Number(quota.aggregateVideoUploadCallLimitPerQuotaDay || 0);
  const routeKeys = (routing.projects || []).map((row) => row.key);
  const byRoute = Object.fromEntries(routeKeys.map((routeKey) => {
    const rows = assignments.filter((row) => row.routeKey === routeKey);
    const playlistCreates = rows.filter((row) => row.playlist?.state === "verified_absent" && row.playlist?.createAllowed).length;
    const customThumbnails = rows.filter((row) => row.thumbnail?.mode === "custom").length;
    const general = rows.length * 50 + playlistCreates * 50 + customThumbnails * 50;
    return [routeKey, {
      estimatedVideoUploadCalls: rows.length,
      estimatedPlaylistItemInsertUnits: rows.length * 50,
      estimatedPlaylistCreateUnitsMaximum: playlistCreates * 50,
      estimatedThumbnailSetUnits: customThumbnails * 50,
      estimatedGeneralQuotaUnitsMaximum: general,
      estimatedQuotaUnitsMaximum: rows.length + general,
    }];
  }));
  const blockers = [];
  if (!Number.isInteger(aggregateLimit) || aggregateLimit < 1) blockers.push("routing quota policy is missing a positive aggregateVideoUploadCallLimitPerQuotaDay");
  else if (assignments.length > aggregateLimit) blockers.push(`campaign video uploads ${assignments.length} exceed the aggregate daily limit ${aggregateLimit}`);
  if (quota.allowAutomaticRouteFallback !== false) blockers.push("routing quota policy must disable automatic route fallback");
  if (quota.allowStandbyRouteQuotaUse !== false) blockers.push("routing quota policy must disable standby-route quota use");
  for (const [routeKey, usage] of Object.entries(byRoute)) {
    if (usage.estimatedVideoUploadCalls > 100) blockers.push(`${routeKey}: ${usage.estimatedVideoUploadCalls} video uploads exceed the default 100-call videos.insert bucket`);
    if (usage.estimatedGeneralQuotaUnitsMaximum > 10_000) blockers.push(`${routeKey}: estimated general quota maximum ${usage.estimatedGeneralQuotaUnitsMaximum} exceeds the default 10000-unit pool`);
  }
  const customThumbnailCount = assignments.filter((row) => row.thumbnail?.mode === "custom").length;
  const playlistCreateCount = assignments.filter((row) => row.playlist?.state === "verified_absent" && row.playlist?.createAllowed).length;
  return {
    blockers,
    routeCounts: Object.fromEntries(Object.entries(byRoute).map(([key, value]) => [key, value.estimatedVideoUploadCalls])),
    estimatedUsage: {
      estimatedVideoUploadCalls: assignments.length,
      aggregateVideoUploadCallLimitPerQuotaDay: aggregateLimit,
      aggregateVideoUploadCallHeadroom: Math.max(0, aggregateLimit - assignments.length),
      quotaDayTimeZone: quota.quotaDayTimeZone || "",
      automaticRouteFallbackAllowed: quota.allowAutomaticRouteFallback === true,
      standbyRouteQuotaUseAllowed: quota.allowStandbyRouteQuotaUse === true,
      estimatedPlaylistItemInsertUnits: assignments.length * 50,
      estimatedPlaylistCreateUnitsMaximum: playlistCreateCount * 50,
      estimatedThumbnailSetUnits: customThumbnailCount * 50,
      estimatedGeneralQuotaUnitsMaximum: assignments.length * 50 + playlistCreateCount * 50 + customThumbnailCount * 50,
      estimatedQuotaUnitsMaximum: assignments.length + assignments.length * 50 + playlistCreateCount * 50 + customThumbnailCount * 50,
      byRoute,
      providerCallsDuringPlan: 0,
      youtubeWritesDuringPlan: 0,
    },
    customThumbnailCount,
    playlistCreateCount,
  };
}

function sourceFingerprints({ base, options }) {
  const fingerprints = structuredClone(base.evidence?.sourceFingerprints || {});
  fingerprints.calendar = fileFingerprint(options.calendar);
  fingerprints.campaignRegistry = fileFingerprint(options.registry);
  return fingerprints;
}

export function composeIntegratedRecoveryAssignments({ supports, baseAssignments, sourceRows, ordinaryPerChannel, sourceCampaignId }) {
  const ordinary = composeOrdinaryAssignments({ supports, baseAssignments, sourceRows, ordinaryPerChannel, sourceCampaignId });
  const polyglot = composePolyglotAssignments({ supports, baseAssignments, sourceRows, sourceCampaignId });
  return { ordinary, polyglotAssignments: polyglot.output, pendingPolyglot: polyglot.pending };
}

export { sourceRowsFromCampaign };

export function buildIntegratedRecoveryWave(options) {
  assert(options.controlReport, "--control-report is required");
  const now = options.now instanceof Date ? options.now : new Date(options.generatedAt || Date.now());
  const registry = readJson(options.registry);
  const calendar = readJson(options.calendar);
  const policy = readJson(options.policy);
  const routing = readJson(options.routing);
  const controlReport = readJson(options.controlReport);
  const { campaign: sourceCampaign, rows: sourceRows, sourceMode } = sourceRowsFromCampaign({
    registry,
    setId: options.setId,
    sourceCampaignId: options.sourceCampaignId,
    expectedSourceAssignments: options.expectedSourceAssignments,
  });
  const preview = buildUnlaunchedPreview({ registry, calendar, sourceCampaignId: options.sourceCampaignId, sourceRows });
  const temporary = previewPaths(options, now);
  writeJson(temporary.registry, preview.previewRegistry);
  writeJson(temporary.calendar, preview.previewCalendar);
  const base = buildPublicationCampaign({
    setId: options.setId,
    ordinaryPerChannel: options.ordinaryPerChannel,
    polyglotPerChannel: options.polyglotPerChannel,
    minFutureMinutes: options.minFutureMinutes,
    maxSnapshotAgeMinutes: options.maxSnapshotAgeMinutes,
    startDate: options.startDate || "",
    now,
    snapshotPath: options.snapshot,
    calendarPath: temporary.calendar,
    campaignRegistryPath: temporary.registry,
    policyPath: options.policy,
    routingPath: options.routing,
    channelsPath: options.channels,
    coverRegistryPath: options.covers,
    ordinaryPlaylistRegistryPath: options.ordinaryPlaylists,
    polyglotPlaylistRegistryPath: options.polyglotPlaylists,
    playlistDiscoveryPath: options.playlistDiscovery,
  });
  const expectedPreviewBlockers = new Set([
    "ZH: only 0/1 unclaimed full Polyglot tails available",
    "Polyglot assignment count 50 != 51",
  ]);
  const unexpectedBaseBlockers = (base.blockers || []).filter((row) => !expectedPreviewBlockers.has(row));
  assert(unexpectedBaseBlockers.length === 0, `preview has unexpected blockers: ${unexpectedBaseBlockers.join("; ")}`);
  const supports = String(base.inputs?.supports || "").split(",").filter(Boolean);
  const composed = composeIntegratedRecoveryAssignments({
    supports,
    baseAssignments: base.assignments,
    sourceRows,
    ordinaryPerChannel: options.ordinaryPerChannel,
    sourceCampaignId: options.sourceCampaignId,
  });
  const pending = assignPendingPolyglotSlots({
    pending: composed.pendingPolyglot,
    assignments: [...composed.ordinary, ...composed.polyglotAssignments],
    calendar,
    sourceCampaignId: options.sourceCampaignId,
    policy,
    now,
    minFutureMinutes: options.minFutureMinutes,
  });
  const assignments = [...composed.ordinary, ...composed.polyglotAssignments, ...pending]
    .sort((left, right) => `${left.supportLang}|${left.videoType}|${left.assignmentKey}`.localeCompare(`${right.supportLang}|${right.videoType}|${right.assignmentKey}`));
  const blockers = [];
  const expectedCount = supports.length * (options.ordinaryPerChannel + options.polyglotPerChannel);
  if (assignments.length !== expectedCount) blockers.push(`assignment count ${assignments.length} != ${expectedCount}`);
  if (new Set(assignments.map((row) => row.assignmentKey)).size !== assignments.length) blockers.push("campaign contains duplicate assignment keys");
  if (new Set(assignments.map((row) => row.slotKey)).size !== assignments.length) blockers.push("campaign contains duplicate channel publish slots");
  for (const support of supports) {
    const ordinary = assignments.filter((row) => row.supportLang === support && row.videoType === "ordinary");
    const polyglot = assignments.filter((row) => row.supportLang === support && row.videoType === "polyglot");
    if (ordinary.length !== options.ordinaryPerChannel) blockers.push(`${support}: ordinary assignment count ${ordinary.length} != ${options.ordinaryPerChannel}`);
    if (polyglot.length !== options.polyglotPerChannel) blockers.push(`${support}: Polyglot assignment count ${polyglot.length} != ${options.polyglotPerChannel}`);
  }
  const sourceKeys = new Set(sourceRows.map((row) => row.assignmentKey));
  const finalKeys = new Set(assignments.map((row) => row.assignmentKey));
  const missingSourceKeys = [...sourceKeys].filter((key) => !finalKeys.has(key));
  if (missingSourceKeys.length) blockers.push(`source recovery assignments missing from integrated wave: ${missingSourceKeys.join(",")}`);
  const controlEvidence = validateLiveControl({ report: controlReport, assignments, now, maxSnapshotAgeMinutes: options.maxSnapshotAgeMinutes });
  const usage = aggregateUsage({ assignments, routing });
  blockers.push(...usage.blockers);
  const warnings = [...(base.warnings || []), `${options.sourceCampaignId}: all ${sourceRows.length} no-receipt recovery assignments are pinned into this ${options.ordinaryPerChannel}+${options.polyglotPerChannel} wave`];
  const summary = {
    applyReady: blockers.length === 0,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    supportCount: supports.length,
    scheduledSupportCount: supports.length,
    productionDeferredSupportCount: 0,
    productionDeferredAssignmentCount: 0,
    ordinaryCount: assignments.filter((row) => row.videoType === "ordinary").length,
    polyglotCount: assignments.filter((row) => row.videoType === "polyglot").length,
    fullPolyglotCount: assignments.filter((row) => row.videoType === "polyglot" && row.contentScope === "full").length,
    shortUnverifiedPolyglotCount: assignments.filter((row) => row.videoType === "polyglot" && row.contentScope === "short_unverified").length,
    assignmentCount: assignments.length,
    firstPublishAt: assignments.map((row) => row.publishAt).sort()[0] || "",
    lastPublishAt: assignments.map((row) => row.publishAt).sort().at(-1) || "",
    customThumbnailCount: usage.customThumbnailCount,
    automaticThumbnailCount: assignments.length - usage.customThumbnailCount,
    existingPlaylistCount: assignments.filter((row) => row.playlist?.state === "resolved_existing" && row.playlist?.youtubePlaylistId).length,
    playlistCreateCount: usage.playlistCreateCount,
    playlistCreateCountMaximum: usage.playlistCreateCount,
    routeCounts: usage.routeCounts,
  };
  const inputs = {
    ...base.inputs,
    ordinarySupportCount: supports.length,
    polyglotSupportCount: supports.length,
    productionDeferredSupportCount: 0,
    ordinaryPerChannel: options.ordinaryPerChannel,
    polyglotPerChannel: options.polyglotPerChannel,
    integratedRecoverySourceCampaignId: options.sourceCampaignId,
    integratedRecoveryAssignmentCount: sourceRows.length,
  };
  const evidence = {
    ...base.evidence,
    sourceFingerprints: sourceFingerprints({ base, options }),
    integratedRecovery: {
      sourceCampaignId: options.sourceCampaignId,
      sourceManifestHash: sourceCampaign.manifestHash,
      sourceMode,
      sourceAssignmentCount: sourceRows.length,
      sourceOrdinaryCount: sourceRows.filter((row) => row.videoType === "ordinary").length,
      sourcePolyglotCount: sourceRows.filter((row) => row.videoType === "polyglot").length,
      sourceAssignmentsIncludedExactly: missingSourceKeys.length === 0,
      controlEvidence,
      previewPaths: temporary,
    },
  };
  const core = {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    mode: "read_only_no_spend_integrated_recovery_plan",
    setId: options.setId,
    inputs,
    evidence,
    summary,
    estimatedUsage: {
      ...base.estimatedUsage,
      ...usage.estimatedUsage,
    },
    blockers,
    warnings,
    assignments,
  };
  const identityHash = sha256Json({ setId: core.setId, inputs: core.inputs, evidence: core.evidence, assignments: core.assignments });
  const start = options.startDate || now.toISOString().slice(0, 10);
  const manifest = { ...core, campaignId: `yt-${options.setId}-${start}-${identityHash.slice(0, 12)}` };
  manifest.manifestHash = sha256Json(manifest);
  verifyCampaignManifest(manifest);
  return manifest;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return console.log(usage());
  const manifest = buildIntegratedRecoveryWave(options);
  writeJson(options.output, manifest);
  const report = {
    campaignId: manifest.campaignId,
    manifestHash: manifest.manifestHash,
    ...manifest.summary,
    sourceCampaignId: options.sourceCampaignId,
    sourceAssignmentCount: options.expectedSourceAssignments,
    manifestPath: options.output,
  };
  console.log(options.json ? JSON.stringify(report, null, 2) : `Campaign: ${report.campaignId}\nAssignments: ${report.assignmentCount}\nApply ready: ${report.applyReady}\nManifest: ${options.output}`);
  if (options.requireApplyReady && !manifest.summary.applyReady) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}
