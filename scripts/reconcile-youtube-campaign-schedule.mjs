#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  assignmentKey,
  calendarAssignmentKey,
  canonicalSupportCode,
  isActive,
  isActiveReservation,
  isPolyglotRow,
  normalizedTargetLangs,
  polyglotSlotKey,
} from "./lib/youtube-publication-control.mjs";

function parseArgs(argv) {
  const options = {
    campaignRegistry: "config/youtube-publication-campaigns.json",
    calendar: "config/youtube-publish-calendar.json",
    ordinaryRegistry: "config/youtube-published-videos.json",
    polyglotRegistry: "config/youtube-polyglot-published-videos.json",
    snapshot: "",
    reportEvidence: "",
    output: "outputs/youtube-campaign-schedule-reconciliation.json",
    apply: false,
    confirm: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--campaign-id" || arg.startsWith("--campaign-id=")) options.campaignId = value();
    else if (arg === "--report" || arg.startsWith("--report=")) options.report = value();
    else if (arg === "--report-evidence" || arg.startsWith("--report-evidence=")) options.reportEvidence = value();
    else if (arg === "--snapshot" || arg.startsWith("--snapshot=")) options.snapshot = value();
    else if (arg === "--campaign-registry" || arg.startsWith("--campaign-registry=")) options.campaignRegistry = value();
    else if (arg === "--calendar" || arg.startsWith("--calendar=")) options.calendar = value();
    else if (arg === "--ordinary-registry" || arg.startsWith("--ordinary-registry=")) options.ordinaryRegistry = value();
    else if (arg === "--polyglot-registry" || arg.startsWith("--polyglot-registry=")) options.polyglotRegistry = value();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
    else if (arg === "--confirm" || arg.startsWith("--confirm=")) options.confirm = value();
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

function sameInstant(left, right) {
  const leftMillis = Date.parse(left || "");
  const rightMillis = Date.parse(right || "");
  return Number.isFinite(leftMillis) && Number.isFinite(rightMillis) && leftMillis === rightMillis;
}

function assert(value, message) {
  if (!value) throw new Error(message);
}

function activeCampaignPublications(ordinary, polyglot, campaign) {
  return [...(ordinary.publications || []), ...(polyglot.publications || [])]
    .filter((row) => (
      row.campaignId === campaign.campaignId
      && row.campaignManifestHash === campaign.manifestHash
      && row.youtubeVideoId
      && isActive(row)
    ));
}

function completeReport(report) {
  return report?.summary?.complete === true
    && report.summary.paginationComplete === true
    && report.summary.videoStatusReadbackComplete === true
    && report.summary.expectedRouteCount === 4
    && report.summary.receivedRouteCount === 4;
}

function slotKey(row) {
  return `${row.channelKey || ""}|${new Date(row.publishAt).toISOString()}`;
}

function isPolyglotIdentityRow(row) {
  return isPolyglotRow(row) || (Boolean(row.bundleKey) && Array.isArray(row.targetLangs));
}

function sameAssignmentIdentity(left, right) {
  if (assignmentKey(left) === assignmentKey(right)) return true;
  if (!isPolyglotIdentityRow(left) || !isPolyglotIdentityRow(right)) return false;

  const leftTargets = normalizedTargetLangs(left);
  const rightTargets = normalizedTargetLangs(right);
  return leftTargets.length > 0
    && leftTargets.length === rightTargets.length
    && leftTargets.every((target, index) => target === rightTargets[index])
    && String(left.setId || "") === String(right.setId || "")
    && canonicalSupportCode(left.supportLang) === canonicalSupportCode(right.supportLang)
    && polyglotSlotKey(left) === polyglotSlotKey(right);
}

function planReconciliation({ campaign, report, snapshot, calendar, ordinary, polyglot, now }) {
  assert(completeReport(report), "Refusing campaign schedule reconciliation from incomplete all-route live evidence.");
  assert(
    campaign.status === "reconciliation_required"
      || (campaign.status === "finalized" && (
        campaign.scheduleReconciliation?.reportPath === report.__evidencePath
        || campaign.scheduleReconciliation?.reportPath === report.__sourcePath
      )),
    "Campaign must be reconciliation_required, or a prior reconciliation from this exact report.",
  );
  assert(campaign.finalizeSummary?.expectedCount === campaign.assignments.length, "Campaign finalizer evidence is incomplete.");
  assert(campaign.finalizeSummary?.observedCount === campaign.assignments.length, "Campaign has assignments without observed upload receipts.");
  assert(campaign.finalizeSummary?.missingCount === 0, "Campaign has missing assignments; use partial recovery instead.");
  assert(campaign.finalizeSummary?.duplicateAssignmentCount === 0 && campaign.finalizeSummary?.duplicateVideoIdCount === 0, "Campaign has duplicate receipt evidence.");
  assert(campaign.finalizeSummary?.unexpectedPublicationCount === 0, "Campaign has unexpected publication evidence.");

  const publications = activeCampaignPublications(ordinary, polyglot, campaign);
  const byAssignment = new Map();
  for (const publication of publications) {
    const key = assignmentKey(publication);
    const rows = byAssignment.get(key) || [];
    rows.push(publication);
    byAssignment.set(key, rows);
  }
  for (const assignment of campaign.assignments) {
    const rows = byAssignment.get(assignment.assignmentKey) || [];
    assert(rows.length === 1, `Expected exactly one active durable publication for ${assignment.assignmentKey}.`);
  }

  const liveByVideoId = new Map((report.publications || [])
    .filter((row) => row.liveReadbackPresent === true && row.youtubeVideoId)
    .map((row) => [row.youtubeVideoId, row]));
  const snapshotByVideoId = new Map((snapshot.decks || [])
    .flatMap((deck) => deck.publications || [])
    .filter((row) => row.liveReadbackPresent === true && row.youtubeVideoId)
    .map((row) => [row.youtubeVideoId, row]));
  const activeReservations = (calendar.reservations || []).filter(isActiveReservation);
  const changes = [];
  const mismatchVideoIds = new Set();

  for (const assignment of campaign.assignments) {
    const publication = byAssignment.get(assignment.assignmentKey)[0];
    const actualPublishAt = publication.scheduledPublishAt || publication.publishAt || publication.readback?.publishAt || "";
    if (sameInstant(actualPublishAt, assignment.publishAt)) continue;
    assert(actualPublishAt, `Missing actual schedule for ${assignment.assignmentKey}.`);
    const live = liveByVideoId.get(publication.youtubeVideoId);
    assert(live, `Live evidence is missing campaign video ${publication.youtubeVideoId}.`);
    assert(sameInstant(live.publishAt, actualPublishAt), `Live schedule disagrees with durable receipt for ${assignment.assignmentKey}.`);
    assert(sameAssignmentIdentity(live, assignment), `Live assignment identity differs for ${assignment.assignmentKey}.`);
    const snapshotLive = snapshotByVideoId.get(publication.youtubeVideoId);
    assert(snapshotLive, `Snapshot evidence is missing campaign video ${publication.youtubeVideoId}.`);
    assert(snapshotLive.state === "scheduled" && snapshotLive.privacyStatus === "private", `Schedule mismatch is not a future private scheduled video: ${assignment.assignmentKey}.`);
    assert(sameInstant(snapshotLive.publishAt, actualPublishAt), `Snapshot schedule disagrees with durable receipt for ${assignment.assignmentKey}.`);
    assert(sameAssignmentIdentity(snapshotLive, assignment), `Snapshot assignment identity differs for ${assignment.assignmentKey}.`);

    const reservationKey = assignment.calendarAssignmentKey || calendarAssignmentKey(assignment);
    const reservations = activeReservations.filter((row) => calendarAssignmentKey(row) === reservationKey);
    assert(reservations.length === 1, `Expected exactly one active calendar reservation for ${assignment.assignmentKey}.`);
    const reservation = reservations[0];
    assert(reservation.youtubeVideoId === publication.youtubeVideoId, `Calendar video ID differs for ${assignment.assignmentKey}.`);
    assert(
      sameInstant(reservation.publishAt, assignment.publishAt) || sameInstant(reservation.publishAt, actualPublishAt),
      `Calendar claim differs from immutable campaign assignment and live schedule for ${assignment.assignmentKey}.`,
    );
    const candidate = { ...reservation, publishAt: new Date(actualPublishAt).toISOString() };
    const collisions = activeReservations.filter((row) => row !== reservation && slotKey(row) === slotKey(candidate));
    assert(collisions.length === 0, `Actual live schedule collides with an active calendar slot for ${assignment.assignmentKey}.`);
    mismatchVideoIds.add(publication.youtubeVideoId);
    changes.push({
      assignmentKey: assignment.assignmentKey,
      calendarAssignmentKey: reservationKey,
      youtubeVideoId: publication.youtubeVideoId,
      claimedPublishAt: assignment.publishAt,
      actualPublishAt: new Date(actualPublishAt).toISOString(),
    });
  }

  assert(changes.length > 0, "No publishAt mismatches require reconciliation.");
  const invalidBlockers = (report.blockers || []).filter((blocker) => (
    blocker.type !== "live_schedule_missing_calendar" || !mismatchVideoIds.has(blocker.youtubeVideoId)
  ));
  assert(invalidBlockers.length === 0, "Live report contains blockers other than the exact schedule mismatches.");
  const reportMismatchIds = new Set((report.blockers || [])
    .filter((blocker) => blocker.type === "live_schedule_missing_calendar")
    .map((blocker) => blocker.youtubeVideoId));
  assert(reportMismatchIds.size === mismatchVideoIds.size && [...mismatchVideoIds].every((id) => reportMismatchIds.has(id)), "Live report schedule blockers do not exactly match campaign receipt mismatches.");

  return { changes, reconciledAt: now };
}

function applyReconciliation({ campaign, calendar, changes, reportPath, reconciledAt }) {
  const changesByAssignment = new Map(changes.map((change) => [change.assignmentKey, change]));
  for (const reservation of calendar.reservations || []) {
    const change = changesByAssignment.get(assignmentKey(reservation));
    if (reservation.campaignId !== campaign.campaignId) continue;
    if (change) reservation.publishAt = change.actualPublishAt;
    reservation.status = "campaign_finalized";
    reservation.updatedAt = reconciledAt;
    reservation.scheduleReconciledAt = reconciledAt;
    reservation.scheduleReconciliationSource = reportPath;
  }
  campaign.assignments = campaign.assignments.map((assignment) => {
    const change = changesByAssignment.get(assignment.assignmentKey);
    if (!change) return { ...assignment, status: "upload_accepted" };
    return {
      ...assignment,
      status: "upload_accepted_schedule_reconciled",
      actualPublishAt: change.actualPublishAt,
      scheduleReconciledAt: reconciledAt,
      scheduleReconciliationSource: reportPath,
    };
  });
  campaign.status = "finalized";
  campaign.finalizedAt = reconciledAt;
  campaign.finalizeSummary = {
    ...campaign.finalizeSummary,
    completedCount: campaign.assignments.length,
    receiptErrorCount: 0,
  };
  campaign.scheduleReconciliation = {
    reconciledAt,
    reportPath,
    resolvedPublishAtMismatchCount: changes.length,
    changes,
    note: "Immutable manifest retains claimed slots; calendar and campaign receipts record authenticated live schedule readback.",
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: node scripts/reconcile-youtube-campaign-schedule.mjs --campaign-id=<id> --report=<complete-all-route-control.json> [--report-evidence=<durable-url-or-tracked-path>] --snapshot=<same-run-publication-snapshot.json> [--apply --confirm=RECONCILE_YOUTUBE_CAMPAIGN_SCHEDULE]");
    return;
  }
  assert(options.campaignId && options.report && options.snapshot, "--campaign-id, --report and --snapshot are required.");
  if (options.apply) assert(options.confirm === "RECONCILE_YOUTUBE_CAMPAIGN_SCHEDULE", "--apply requires --confirm=RECONCILE_YOUTUBE_CAMPAIGN_SCHEDULE.");
  const registry = readJson(options.campaignRegistry);
  const campaign = (registry.campaigns || []).find((row) => row.campaignId === options.campaignId);
  assert(campaign, `Campaign not found: ${options.campaignId}`);
  const calendar = readJson(options.calendar);
  const report = readJson(options.report);
  report.__sourcePath = options.report;
  report.__evidencePath = options.reportEvidence || options.report;
  const snapshot = readJson(options.snapshot);
  const ordinary = readJson(options.ordinaryRegistry);
  const polyglot = readJson(options.polyglotRegistry);
  const { changes, reconciledAt } = planReconciliation({ campaign, report, snapshot, calendar, ordinary, polyglot, now: new Date().toISOString() });
  const output = {
    schemaVersion: 1,
    mode: options.apply ? "apply_local_durable_state_only" : "dry-run",
    campaignId: campaign.campaignId,
    manifestHash: campaign.manifestHash,
    sourceReport: report.__evidencePath,
    sourceReportReadPath: options.report,
    sourceReportGeneratedAt: report.generatedAt || "",
    sourceSnapshot: options.snapshot,
    sourceSnapshotGeneratedAt: snapshot.generatedAt || "",
    reconciledAt,
    summary: { resolvedPublishAtMismatchCount: changes.length, unchangedAssignmentCount: campaign.assignments.length - changes.length },
    changes,
  };
  if (options.apply) {
    applyReconciliation({
      campaign,
      calendar,
      changes,
      reportPath: report.__evidencePath,
      reconciledAt,
    });
    writeJson(options.calendar, calendar);
    writeJson(options.campaignRegistry, registry);
  }
  writeJson(options.output, output);
  console.log(JSON.stringify(output, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`Campaign schedule reconciliation failed: ${error.message}`);
  process.exit(1);
}
