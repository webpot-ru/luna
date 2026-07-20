#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { calendarAssignmentKey, effectiveScheduleStartDate, isPolyglotRow, polyglotProductSlotKey } from "./lib/youtube-publication-control.mjs";
import { isCampaignStatusActive, sha256Json, verifyCampaignManifest } from "./lib/youtube-publication-campaign.mjs";
import { channelPolicy, findFreeSlot, isActiveCalendarReservation, slotKey, ymdInZone } from "./plan-youtube-publish-schedule.mjs";

const CONFIRM = "ROLLOVER_UNLAUNCHED_CLAIMED_YOUTUBE_CAMPAIGN";
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const unique = (values) => [...new Set(values.filter(Boolean))].sort();
const equal = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);
const hasReceipt = (row = {}) => Boolean(row.youtubeVideoId || row.youtubeVideoUrl || row.githubRunId || row.artifactPath || row.receiptPath || row.uploadedAt);
const hasCalendarReceipt = (row = {}) => Boolean(row.youtubeVideoId || row.youtubeVideoUrl || row.artifactPath || row.receiptPath || row.uploadedAt || row.playlistItemId);
const isAssignmentClaimActive = (row = {}) => {
  const status = String(row.status || "").toLowerCase();
  return !status.includes("superseded") && !status.includes("failed") && !status.includes("cancelled") && !status.includes("deleted");
};

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, file);
}

function parseArgs(argv) {
  const options = { registry: "config/youtube-publication-campaigns.json", calendar: "config/youtube-publish-calendar.json", policy: "config/youtube-publish-schedule-policy.json", minFutureMinutes: 300, maxControlAgeMinutes: 120, startDate: "", output: "outputs/youtube-claimed-campaign-rollover.json", apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--campaign-id" || arg.startsWith("--campaign-id=")) options.campaignId = value();
    else if (arg === "--control-report" || arg.startsWith("--control-report=")) options.controlReport = value();
    else if (arg === "--registry" || arg.startsWith("--registry=")) options.registry = value();
    else if (arg === "--calendar" || arg.startsWith("--calendar=")) options.calendar = value();
    else if (arg === "--policy" || arg.startsWith("--policy=")) options.policy = value();
    else if (arg === "--min-future-minutes" || arg.startsWith("--min-future-minutes=")) options.minFutureMinutes = Number(value());
    else if (arg === "--max-control-age-minutes" || arg.startsWith("--max-control-age-minutes=")) options.maxControlAgeMinutes = Number(value());
    else if (arg === "--start-date" || arg.startsWith("--start-date=")) options.startDate = value();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm" || arg.startsWith("--confirm=")) options.confirm = value();
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function blockerTouches(blocker, assignments) {
  if (blocker.assignmentKey) return assignments.some((row) => row.assignmentKey === blocker.assignmentKey);
  return assignments.some((row) => {
    if (blocker.setId && blocker.setId !== row.setId) return false;
    if (blocker.supportLang && blocker.supportLang !== row.supportLang) return false;
    if (blocker.videoType && blocker.videoType !== row.videoType) return false;
    if (blocker.targetLang && blocker.targetLang !== row.targetLang) return false;
    if (blocker.bundleKey && blocker.bundleKey !== row.bundleKey) return false;
    return Boolean(blocker.supportLang || blocker.targetLang || blocker.bundleKey);
  });
}

function validateControl(report, assignments, now, maxAgeMinutes) {
  const summary = report.summary || {};
  assert(summary.complete === true, "control report is incomplete");
  assert(summary.paginationComplete === true, "control report pagination is incomplete");
  assert(summary.videoStatusReadbackComplete === true, "control report video-status readback is incomplete");
  assert(Number(summary.unclassifiedRecentUploadCount || 0) === 0, "control report contains recent unclassified uploads");
  const ageMinutes = (now.getTime() - Date.parse(report.generatedAt || "")) / 60_000;
  assert(Number.isFinite(ageMinutes) && ageMinutes >= -5 && ageMinutes <= maxAgeMinutes, `control report is stale: age=${Number.isFinite(ageMinutes) ? ageMinutes.toFixed(1) : "unknown"}m, max=${maxAgeMinutes}m`);
  const selectedBlockers = (report.blockers || []).filter((row) => blockerTouches(row, assignments));
  assert(!selectedBlockers.length, `control report contains ${selectedBlockers.length} selected blocker(s)`);
  const keys = new Set(assignments.map((row) => row.assignmentKey));
  const live = (report.publications || []).find((row) => row.youtubeVideoId && keys.has(row.assignmentKey));
  assert(!live, `rollover assignment is already live: ${live?.assignmentKey}`);
  return { sourceRuns: report.sourceRuns || [], activeVideoCount: Number(summary.activeVideoCount || 0), ageMinutes, selectedBlockerCount: 0, liveAssignmentMatchCount: 0 };
}

function campaignFromManifest(manifest, sourceCampaignId, claimedAt, manifestPath) {
  return { schemaVersion: 1, campaignId: manifest.campaignId, manifestHash: manifest.manifestHash, setId: manifest.setId, status: "claimed", claimedAt, generatedAt: manifest.generatedAt, manifestPath, rolloverOfCampaignId: sourceCampaignId, inputs: manifest.inputs, summary: manifest.summary, evidence: manifest.evidence, assignmentKeys: manifest.assignments.map((row) => row.assignmentKey), slotKeys: manifest.assignments.map((row) => row.slotKey), assignments: manifest.assignments.map((row) => ({ ...row, status: "claimed" })) };
}

export function buildClaimedCampaignRollover({ registry, calendar, policy, sourceManifest, controlReport, campaignId, now = new Date(), minFutureMinutes = 300, maxControlAgeMinutes = 120, startDate = "" }) {
  assert(Number.isInteger(minFutureMinutes) && minFutureMinutes >= 90, "minFutureMinutes must be an integer >= 90");
  verifyCampaignManifest(sourceManifest);
  const campaign = (registry.campaigns || []).find((row) => row.campaignId === campaignId);
  assert(campaign?.status === "claimed", `source campaign must be claimed, got ${campaign?.status || "missing"}`);
  assert(campaign.manifestHash === sourceManifest.manifestHash, "source campaign manifest hash mismatch");
  assert((campaign.assignments || []).length > 0 && campaign.assignments.every((row) => row.status === "claimed"), "source assignments are not all claimed");
  assert(!(campaign.finalizeSummary || campaign.workerRuns || campaign.dispatchRunId || campaign.githubRunId), "source campaign has dispatch/finalizer evidence");
  assert(!campaign.assignments.some(hasReceipt), "source campaign contains upload receipt evidence");
  const sourceKeys = unique(sourceManifest.assignments.map((row) => row.assignmentKey));
  assert(equal(sourceKeys, unique(campaign.assignments.map((row) => row.assignmentKey))), "source durable manifest assignment set mismatch");
  const zeroUploadEvidence = validateControl(controlReport, campaign.assignments, now, maxControlAgeMinutes);

  const ownedClaims = (calendar.reservations || []).filter((row) => row.campaignId === campaignId && isActiveCalendarReservation(row));
  assert(ownedClaims.length === campaign.assignments.length, `active durable claim count ${ownedClaims.length} != ${campaign.assignments.length}`);
  const owned = new Map(ownedClaims.map((row) => [calendarAssignmentKey(row), row]));
  for (const row of campaign.assignments) {
    const claim = owned.get(row.calendarAssignmentKey);
    assert(claim && claim.campaignManifestHash === campaign.manifestHash, `durable calendar claim mismatch: ${row.assignmentKey}`);
    assert(claim.publishAt === row.publishAt && slotKey(claim) === row.slotKey && !hasCalendarReceipt(claim), `calendar slot or receipt mismatch: ${row.assignmentKey}`);
  }
  const otherCampaigns = (registry.campaigns || []).filter((row) => row.campaignId !== campaignId && isCampaignStatusActive(row.status));
  const otherKeys = new Set(otherCampaigns.flatMap((row) => row.assignmentKeys || []));
  const keyConflict = sourceKeys.find((key) => otherKeys.has(key));
  assert(!keyConflict, `assignment is claimed by another campaign: ${keyConflict}`);
  const productSlots = new Set(campaign.assignments.filter(isPolyglotRow).map(polyglotProductSlotKey));
  const productConflict = otherCampaigns.flatMap((row) => row.assignments || []).find((row) => isAssignmentClaimActive(row) && isPolyglotRow(row) && productSlots.has(polyglotProductSlotKey(row)));
  assert(!productConflict, `Polyglot product slot is claimed by another campaign: ${productConflict?.assignmentKey || "unknown"}`);

  const minPublishMillis = now.getTime() + minFutureMinutes * 60_000;
  const occupied = new Set((calendar.reservations || []).filter((row) => row.campaignId !== campaignId && isActiveCalendarReservation(row)).map(slotKey));
  const planned = new Set();
  const assignments = sourceManifest.assignments.map((source) => {
    const channel = channelPolicy(policy, source.channelKey);
    const automaticStartDate = ymdInZone(new Date(minPublishMillis), channel.timeZone);
    const baseDate = effectiveScheduleStartDate({ automaticStartDate, requestedStartDate: startDate, fillEarliest: false });
    const slot = findFreeSlot({ channelKey: source.channelKey, perChannelPolicy: channel, baseDate, baseOccupiedSlotKeys: occupied, plannedSlotKeys: planned, preferredFreeOrdinal: null, minPublishMillis, fillDayGaps: false });
    const key = slotKey({ channelKey: source.channelKey, publishAt: slot.publishAt });
    planned.add(key);
    const checkpoints = channel.performanceCheckpointsHours.map((hours) => ({ hoursAfterPublish: hours, dueAt: new Date(Date.parse(slot.publishAt) + hours * 3_600_000).toISOString() }));
    return { ...source, publishAt: slot.publishAt, localDate: slot.localDate, localTime: slot.localTime, localSlotIndex: slot.localSlotIndex, timeZone: slot.timeZone, slotKey: key, analyticsCheckpointsAt: checkpoints, status: "planned" };
  });
  assert(equal(sourceKeys, unique(assignments.map((row) => row.assignmentKey))), "rollover changed assignment identity");
  assert(new Set(assignments.map((row) => row.slotKey)).size === assignments.length, "rollover contains duplicate slots");
  const generatedAt = now.toISOString();
  const suffix = sha256Json({ campaignId, generatedAt, slots: assignments.map((row) => row.slotKey) }).slice(0, 12);
  const rolloverCampaignId = `yt-${campaign.setId}-${generatedAt.slice(0, 10)}-${suffix}`;
  assert(!(registry.campaigns || []).some((row) => row.campaignId === rolloverCampaignId), "rollover campaignId collision");
  const firstPublishAt = assignments.map((row) => row.publishAt).sort()[0];
  const lastPublishAt = assignments.map((row) => row.publishAt).sort().at(-1);
  const routes = unique(assignments.map((row) => row.routeKey));
  const routeCounts = Object.fromEntries(routes.map((route) => [route, assignments.filter((row) => row.routeKey === route).length]));
  const noHash = { ...sourceManifest, generatedAt, campaignId: rolloverCampaignId, inputs: { ...sourceManifest.inputs, rolloverSourceCampaignId: campaignId, minFutureMinutes, startDate: startDate || "auto" }, evidence: { ...sourceManifest.evidence, claimedCampaignRollover: { sourceCampaignId: campaignId, sourceManifestHash: campaign.manifestHash, proof: "fresh_control_report_plus_zero_durable_receipts", controlSourceRuns: zeroUploadEvidence.sourceRuns, activeVideoCount: zeroUploadEvidence.activeVideoCount } }, summary: { ...sourceManifest.summary, applyReady: true, assignmentCount: assignments.length, firstPublishAt, lastPublishAt, routeCounts }, blockers: [], assignments };
  delete noHash.manifestHash;
  const manifest = { ...noHash, manifestHash: sha256Json(noHash) };
  verifyCampaignManifest(manifest);
  assert(Date.parse(firstPublishAt) >= minPublishMillis, `first rollover slot is less than ${minFutureMinutes} minutes in the future`);

  const manifestPath = `config/youtube-publication-campaign-plans/${rolloverCampaignId}.json`;
  const nextRegistry = structuredClone(registry);
  const old = nextRegistry.campaigns.find((row) => row.campaignId === campaignId);
  Object.assign(old, { status: "superseded_unlaunched_claim_rollover", supersededAt: generatedAt, supersededByCampaignId: rolloverCampaignId, zeroUploadEvidence });
  old.assignments.forEach((row) => { row.status = "superseded_unlaunched_claim_rollover"; });
  nextRegistry.campaigns.push(campaignFromManifest(manifest, campaignId, generatedAt, manifestPath));
  const nextCalendar = structuredClone(calendar);
  nextCalendar.reservations.forEach((row) => { if (row.campaignId === campaignId && isActiveCalendarReservation(row)) Object.assign(row, { status: "superseded_unlaunched_claim_rollover", updatedAt: generatedAt, supersededByCampaignId: rolloverCampaignId }); });
  assignments.forEach((row) => nextCalendar.reservations.push({ schemaVersion: 1, campaignId: rolloverCampaignId, campaignManifestHash: manifest.manifestHash, status: "campaign_claimed", source: "youtube-publication-campaign-claimed-rollover", rolloverOfCampaignId: campaignId, videoType: row.videoType, setId: row.setId, supportLang: row.supportLang, targetLang: row.targetLang, targetLangs: row.targetLangs || [], targetLangsCsv: row.targetLangsCsv || "", targetLangsHash: row.targetLangsHash || "", bundleKey: row.bundleKey || "", contentScope: row.contentScope || "", polyglotKey: row.polyglotKey || "", channelKey: row.channelKey, youtubeChannelId: row.youtubeChannelId, publishAt: row.publishAt, timeZone: row.timeZone, localDate: row.localDate, localTime: row.localTime, localSlotIndex: row.localSlotIndex, analyticsCheckpointsAt: row.analyticsCheckpointsAt || [], createdAt: generatedAt, updatedAt: generatedAt }));
  return { manifest, nextRegistry, nextCalendar, report: { status: "rollover_ready", sourceCampaignId: campaignId, rolloverCampaignId, manifestHash: manifest.manifestHash, assignmentCount: assignments.length, firstPublishAt, lastPublishAt, routeCounts, zeroUploadEvidence, durableManifestPath: manifestPath, providerCalls: 0, youtubeWrites: 0 } };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log(`node scripts/rollover-claimed-youtube-publication-campaign.mjs --campaign-id=<id> --control-report=<json> [--apply --confirm=${CONFIRM}]`); return; }
  assert(options.campaignId && options.controlReport, "--campaign-id and --control-report are required");
  if (options.apply) assert(options.confirm === CONFIRM, `--apply requires --confirm=${CONFIRM}`);
  const registry = readJson(options.registry);
  const campaign = registry.campaigns.find((row) => row.campaignId === options.campaignId);
  assert(campaign?.manifestPath, "source campaign durable manifest path is missing");
  const result = buildClaimedCampaignRollover({ registry, calendar: readJson(options.calendar), policy: readJson(options.policy), sourceManifest: readJson(campaign.manifestPath), controlReport: readJson(options.controlReport), campaignId: options.campaignId, now: new Date(), minFutureMinutes: options.minFutureMinutes, maxControlAgeMinutes: options.maxControlAgeMinutes, startDate: options.startDate });
  if (options.apply) {
    assert(!fs.existsSync(result.report.durableManifestPath), `durable rollover manifest already exists: ${result.report.durableManifestPath}`);
    writeJson(result.report.durableManifestPath, result.manifest);
    writeJson(options.calendar, result.nextCalendar);
    writeJson(options.registry, result.nextRegistry);
    result.report.status = "rolled_over";
  }
  writeJson(options.output, { mode: options.apply ? "apply" : "dry_run", ...result.report });
  console.log(JSON.stringify({ mode: options.apply ? "apply" : "dry_run", ...result.report }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(); } catch (error) { console.error(error.stack || error.message); process.exit(1); }
}
