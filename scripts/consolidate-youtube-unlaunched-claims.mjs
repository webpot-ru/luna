#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  assignmentKey,
  calendarAssignmentKey,
  isPolyglotRow,
  polyglotProductSlotKey,
} from "./lib/youtube-publication-control.mjs";
import { isCampaignStatusActive, verifyCampaignManifest } from "./lib/youtube-publication-campaign.mjs";
import { isActiveCalendarReservation, slotKey } from "./plan-youtube-publish-schedule.mjs";

const CONFIRM = "CONSOLIDATE_UNLAUNCHED_YOUTUBE_CLAIMS";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, filePath);
}

function hasUploadReceipt(row = {}) {
  return Boolean(row.youtubeVideoId || row.youtubeVideoUrl || row.artifactPath || row.receiptPath || row.uploadedAt || row.playlistItemId);
}

function parseArgs(argv) {
  const options = {
    registry: "config/youtube-publication-campaigns.json",
    calendar: "config/youtube-publish-calendar.json",
    plansDir: "config/youtube-publication-campaign-plans",
    output: "outputs/youtube-unlaunched-claim-consolidation.json",
    maxControlAgeMinutes: 30,
    expectedSourceClaims: 0,
    apply: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--manifest" || arg.startsWith("--manifest=")) options.manifest = value();
    else if (arg === "--control-report" || arg.startsWith("--control-report=")) options.controlReport = value();
    else if (arg === "--registry" || arg.startsWith("--registry=")) options.registry = value();
    else if (arg === "--calendar" || arg.startsWith("--calendar=")) options.calendar = value();
    else if (arg === "--plans-dir" || arg.startsWith("--plans-dir=")) options.plansDir = value();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
    else if (arg === "--expected-source-claims" || arg.startsWith("--expected-source-claims=")) options.expectedSourceClaims = Number(value());
    else if (arg === "--max-control-age-minutes" || arg.startsWith("--max-control-age-minutes=")) options.maxControlAgeMinutes = Number(value());
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm" || arg.startsWith("--confirm=")) options.confirm = value();
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function activeClaimRows(registry, setId) {
  const rows = [];
  for (const campaign of registry.campaigns || []) {
    if (!isCampaignStatusActive(campaign.status)) continue;
    for (const assignment of campaign.assignments || []) {
      if (assignment.setId !== setId || assignment.status !== "claimed") continue;
      assert(!hasUploadReceipt(assignment), `${campaign.campaignId}: ${assignment.assignmentKey} has upload receipt evidence and cannot be consolidated`);
      assert((campaign.assignmentKeys || []).includes(assignment.assignmentKey), `${campaign.campaignId}: ${assignment.assignmentKey} is not an active top-level claim`);
      rows.push({ campaignId: campaign.campaignId, assignment });
    }
  }
  return rows;
}

function validateControl(report, manifest, now, maxControlAgeMinutes) {
  const summary = report.summary || {};
  assert(summary.complete === true, "control report is incomplete");
  assert(summary.healthy === true && Number(summary.blockerCount || 0) === 0, "control report has blockers");
  assert(summary.paginationComplete === true, "control report pagination is incomplete");
  assert(summary.videoStatusReadbackComplete === true, "control report video status readback is incomplete");
  assert(Number(summary.unclassifiedRecentUploadCount || 0) === 0, "control report has recent unclassified uploads");
  const ageMinutes = (now.getTime() - Date.parse(report.generatedAt || "")) / 60_000;
  assert(Number.isFinite(ageMinutes) && ageMinutes >= -5 && ageMinutes <= maxControlAgeMinutes, `control report is stale: ${Number.isFinite(ageMinutes) ? ageMinutes.toFixed(1) : "unknown"}m`);
  const ordinaryLive = new Set((report.publications || [])
    .filter((row) => row.youtubeVideoId && !isPolyglotRow(row))
    .map(assignmentKey));
  const polyglotLive = new Set((report.publications || [])
    .filter((row) => row.youtubeVideoId && isPolyglotRow(row))
    .map(polyglotProductSlotKey));
  for (const row of manifest.assignments || []) {
    if (isPolyglotRow(row)) {
      assert(!polyglotLive.has(polyglotProductSlotKey(row)), `${row.assignmentKey}: Polyglot product is already live`);
    } else {
      assert(!ordinaryLive.has(assignmentKey(row)), `${row.assignmentKey}: ordinary assignment is already live`);
    }
  }
  return { ageMinutes, sourceRuns: report.sourceRuns || [], activeVideoCount: Number(summary.activeVideoCount || 0) };
}

function campaignRow(manifest, claimedAt, sourceCampaigns) {
  return {
    schemaVersion: 1,
    campaignId: manifest.campaignId,
    manifestHash: manifest.manifestHash,
    setId: manifest.setId,
    status: "claimed",
    claimedAt,
    generatedAt: manifest.generatedAt,
    manifestPath: path.join("config/youtube-publication-campaign-plans", `${manifest.campaignId}.json`),
    integratedClaimConsolidationOfCampaignIds: sourceCampaigns,
    inputs: manifest.inputs,
    summary: manifest.summary,
    evidence: manifest.evidence,
    assignmentKeys: manifest.assignments.map((row) => row.assignmentKey),
    slotKeys: manifest.assignments.map((row) => row.slotKey),
    assignments: manifest.assignments.map((row) => ({ ...row, status: "claimed" })),
  };
}

export function buildUnlaunchedClaimConsolidation({ registry, calendar, manifest, controlReport, now = new Date(), expectedSourceClaims = 0, maxControlAgeMinutes = 30 }) {
  verifyCampaignManifest(manifest);
  assert(manifest.summary?.applyReady === true && (manifest.blockers || []).length === 0, "manifest is not apply-ready");
  const ordinaryPerChannel = Number(manifest.inputs?.ordinaryPerChannel || 0);
  const polyglotPerChannel = Number(manifest.inputs?.polyglotPerChannel || 0);
  const supportCount = Number(manifest.inputs?.supportCount || 0);
  assert(supportCount > 0, "manifest support count is missing");
  assert(manifest.assignments.length === supportCount * (ordinaryPerChannel + polyglotPerChannel), "manifest assignment count does not match declared per-channel wave");
  const sourceRows = activeClaimRows(registry, manifest.setId);
  assert(sourceRows.length > 0, `no unlaunched active claims found for ${manifest.setId}`);
  if (expectedSourceClaims) assert(sourceRows.length === expectedSourceClaims, `source claim count ${sourceRows.length} != expected ${expectedSourceClaims}`);
  const controlEvidence = validateControl(controlReport, manifest, now, maxControlAgeMinutes);
  assert(!(registry.campaigns || []).some((row) => row.campaignId === manifest.campaignId), `campaign already exists: ${manifest.campaignId}`);

  const sourceByCampaign = new Map();
  for (const source of sourceRows) {
    const rows = sourceByCampaign.get(source.campaignId) || [];
    rows.push(source.assignment);
    sourceByCampaign.set(source.campaignId, rows);
  }
  const sourceCalendarKeys = new Set(sourceRows.map((row) => `${row.campaignId}|${row.assignment.calendarAssignmentKey}`));
  const activeCalendarRows = (calendar.reservations || []).filter(isActiveCalendarReservation);
  for (const source of sourceRows) {
    const matching = activeCalendarRows.filter((row) => (
      row.campaignId === source.campaignId
      && calendarAssignmentKey(row) === source.assignment.calendarAssignmentKey
    ));
    assert(matching.length === 1, `${source.campaignId}: calendar claim missing or ambiguous for ${source.assignment.assignmentKey}`);
    assert(matching[0].publishAt === source.assignment.publishAt, `${source.campaignId}: calendar time mismatch for ${source.assignment.assignmentKey}`);
    assert(!hasUploadReceipt(matching[0]), `${source.campaignId}: calendar upload receipt exists for ${source.assignment.assignmentKey}`);
  }
  const sourceAssignmentIds = new Set(sourceRows.map((row) => `${row.campaignId}|${row.assignment.assignmentKey}`));
  const otherClaimedAssignments = new Set();
  const otherPolyglotProducts = new Set();
  for (const campaign of registry.campaigns || []) {
    if (!isCampaignStatusActive(campaign.status)) continue;
    for (const row of campaign.assignments || []) {
      if (sourceAssignmentIds.has(`${campaign.campaignId}|${row.assignmentKey}`)) continue;
      if (row.status !== "claimed") continue;
      otherClaimedAssignments.add(row.assignmentKey);
      if (isPolyglotRow(row)) otherPolyglotProducts.add(polyglotProductSlotKey(row));
    }
  }
  const occupiedSlots = new Set(activeCalendarRows
    .filter((row) => !sourceCalendarKeys.has(`${row.campaignId}|${calendarAssignmentKey(row)}`))
    .map(slotKey));
  const occupiedCalendarAssignments = new Set(activeCalendarRows
    .filter((row) => !sourceCalendarKeys.has(`${row.campaignId}|${calendarAssignmentKey(row)}`))
    .map(calendarAssignmentKey));
  for (const row of manifest.assignments || []) {
    assert(!otherClaimedAssignments.has(row.assignmentKey), `${row.assignmentKey}: claimed by another active campaign`);
    if (isPolyglotRow(row)) assert(!otherPolyglotProducts.has(polyglotProductSlotKey(row)), `${row.assignmentKey}: Polyglot product claimed by another active campaign`);
    assert(!occupiedSlots.has(row.slotKey), `${row.assignmentKey}: calendar slot is occupied`);
    assert(!occupiedCalendarAssignments.has(row.calendarAssignmentKey), `${row.assignmentKey}: calendar assignment is occupied`);
  }

  const changedAt = now.toISOString();
  const sourceCampaigns = [...sourceByCampaign.keys()].sort();
  const nextRegistry = structuredClone(registry);
  for (const campaign of nextRegistry.campaigns || []) {
    const sourceAssignments = sourceByCampaign.get(campaign.campaignId) || [];
    if (!sourceAssignments.length) continue;
    const sourceKeys = new Set(sourceAssignments.map((row) => row.assignmentKey));
    const sourceSlots = new Set(sourceAssignments.map((row) => row.slotKey));
    campaign.assignmentKeys = (campaign.assignmentKeys || []).filter((key) => !sourceKeys.has(key));
    campaign.slotKeys = (campaign.slotKeys || []).filter((key) => !sourceSlots.has(key));
    for (const row of campaign.assignments || []) {
      if (!sourceKeys.has(row.assignmentKey)) continue;
      Object.assign(row, {
        status: "superseded_integrated_plan",
        supersededAt: changedAt,
        supersededByCampaignId: manifest.campaignId,
        supersededReason: "included_or_replaced_by_exact_integrated_wave",
      });
    }
    campaign.integratedClaimConsolidationCampaignId = manifest.campaignId;
    const remainingActive = (campaign.assignments || []).some((row) => !String(row.status || "").includes("superseded") && !String(row.status || "").includes("failed"));
    if (!remainingActive) {
      campaign.status = "superseded_unlaunched_claim_consolidation";
      campaign.supersededAt = changedAt;
      campaign.supersededByCampaignId = manifest.campaignId;
    }
  }
  nextRegistry.campaigns.push(campaignRow(manifest, changedAt, sourceCampaigns));

  const nextCalendar = structuredClone(calendar);
  for (const row of nextCalendar.reservations || []) {
    if (!sourceCalendarKeys.has(`${row.campaignId}|${calendarAssignmentKey(row)}`) || !isActiveCalendarReservation(row)) continue;
    Object.assign(row, {
      status: "superseded_integrated_plan",
      supersededAt: changedAt,
      supersededByCampaignId: manifest.campaignId,
      supersededReason: "included_or_replaced_by_exact_integrated_wave",
      updatedAt: changedAt,
    });
  }
  for (const row of manifest.assignments || []) {
    nextCalendar.reservations.push({
      schemaVersion: 1,
      campaignId: manifest.campaignId,
      campaignManifestHash: manifest.manifestHash,
      status: "campaign_claimed",
      source: "youtube-publication-campaign-integrated-claim-consolidation",
      videoType: row.videoType,
      setId: row.setId,
      supportLang: row.supportLang,
      targetLang: row.targetLang || "",
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
      createdAt: changedAt,
      updatedAt: changedAt,
    });
  }
  nextCalendar.reservations.sort((left, right) => `${left.channelKey}|${left.publishAt}|${left.setId}`.localeCompare(`${right.channelKey}|${right.publishAt}|${right.setId}`));
  return {
    nextRegistry,
    nextCalendar,
    report: {
      status: "consolidation_ready",
      campaignId: manifest.campaignId,
      manifestHash: manifest.manifestHash,
      assignmentCount: manifest.assignments.length,
      sourceClaimCount: sourceRows.length,
      sourceCampaigns: sourceCampaigns.map((campaignId) => ({ campaignId, assignmentCount: sourceByCampaign.get(campaignId).length })),
      controlEvidence,
      providerCalls: 0,
      youtubeWrites: 0,
      durableManifestPath: path.join("config/youtube-publication-campaign-plans", `${manifest.campaignId}.json`),
    },
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(`node scripts/consolidate-youtube-unlaunched-claims.mjs --manifest=<plan.json> --control-report=<all-routes.json> [--expected-source-claims=409] [--apply --confirm=${CONFIRM}]`);
    return;
  }
  assert(options.manifest && options.controlReport, "--manifest and --control-report are required");
  if (options.apply) assert(options.confirm === CONFIRM, `--apply requires --confirm=${CONFIRM}`);
  const manifest = readJson(options.manifest);
  const result = buildUnlaunchedClaimConsolidation({
    registry: readJson(options.registry),
    calendar: readJson(options.calendar),
    manifest,
    controlReport: readJson(options.controlReport),
    expectedSourceClaims: options.expectedSourceClaims,
    maxControlAgeMinutes: options.maxControlAgeMinutes,
  });
  if (options.apply) {
    const durableManifestPath = path.join(options.plansDir, `${manifest.campaignId}.json`);
    assert(!fs.existsSync(durableManifestPath), `durable campaign manifest already exists: ${durableManifestPath}`);
    writeJsonAtomic(durableManifestPath, manifest);
    writeJsonAtomic(options.registry, result.nextRegistry);
    writeJsonAtomic(options.calendar, result.nextCalendar);
    result.report.status = "consolidated";
  }
  writeJsonAtomic(options.output, { mode: options.apply ? "apply" : "dry_run", ...result.report });
  console.log(JSON.stringify({ mode: options.apply ? "apply" : "dry_run", ...result.report }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(); } catch (error) { console.error(error.stack || error.message); process.exit(1); }
}
