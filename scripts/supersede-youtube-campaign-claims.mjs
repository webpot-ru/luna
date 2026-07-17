#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { assignmentKey, calendarAssignmentKey, isActiveReservation } from "./lib/youtube-publication-control.mjs";

const CONFIRM = "SUPERSEDE_ZERO_UPLOAD_YOUTUBE_CAMPAIGN_CLAIMS";

function parseArgs(argv) {
  const options = {
    registry: "config/youtube-publication-campaigns.json",
    calendar: "config/youtube-publish-calendar.json",
    polyglotRegistry: "config/youtube-polyglot-published-videos.json",
    progress: "config/youtube-polyglot-progress.json",
    snapshot: "",
    finalizerArtifact: "",
    output: "outputs/youtube-campaign-claim-supersession.json",
    apply: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--campaign-id" || arg.startsWith("--campaign-id=")) options.campaignId = value();
    else if (arg === "--supports" || arg.startsWith("--supports=")) options.supports = value();
    else if (arg === "--bundle" || arg.startsWith("--bundle=")) options.bundle = value();
    else if (arg === "--registry" || arg.startsWith("--registry=")) options.registry = value();
    else if (arg === "--calendar" || arg.startsWith("--calendar=")) options.calendar = value();
    else if (arg === "--polyglot-registry" || arg.startsWith("--polyglot-registry=")) options.polyglotRegistry = value();
    else if (arg === "--progress" || arg.startsWith("--progress=")) options.progress = value();
    else if (arg === "--snapshot" || arg.startsWith("--snapshot=")) options.snapshot = value();
    else if (arg === "--finalizer-artifact" || arg.startsWith("--finalizer-artifact=")) options.finalizerArtifact = value();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm" || arg.startsWith("--confirm=")) options.confirm = value();
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, filePath);
}

function sha256(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function supports(csv) {
  return [...new Set(String(csv || "").split(",").map((value) => value.trim().toUpperCase()).filter(Boolean))].sort();
}

function publications(data) {
  return data.publications || data.items || data.progress || data.videos || [];
}

function liveFullBySupport(snapshot, selected, bundle) {
  const rows = (snapshot.decks || []).flatMap((deck) => deck.publications || [])
    .filter((row) => selected.includes(row.supportLang)
      && row.videoType === "polyglot"
      && row.bundleKey === bundle
      && row.contentScope === "full"
      && row.youtubeVideoId
      && row.liveReadbackPresent === true);
  const map = new Map(rows.map((row) => [row.supportLang, row]));
  if (map.size !== selected.length) throw new Error("exact live full evidence is incomplete");
  return map;
}

// A finalized parent workflow already contains durable upload receipts.  This
// mode deliberately does not pretend that those receipts are a new live
// snapshot; it only reconciles the parent campaign's own unexpected full
// publications, whose receipt validation was clean.
function finalizedReceiptFullBySupport(finalizerArtifact, ledgers, campaignId, selected, bundle) {
  if (finalizerArtifact.campaignId !== campaignId) throw new Error("finalizer artifact campaignId mismatch");
  if ((finalizerArtifact.receiptErrors || []).length) throw new Error("finalizer artifact contains receipt errors");
  const unexpected = (finalizerArtifact.unexpectedPublications || []).filter((row) => selected.includes(row.assignmentKey?.split("|")[2]));
  if (unexpected.length !== selected.length) throw new Error("finalizer artifact does not contain one unexpected full publication per selected support");
  const bySupport = new Map();
  for (const item of unexpected) {
    const ledgerRows = ledgers.filter((row) => row.youtubeVideoId === item.youtubeVideoId);
    if (!ledgerRows.length) throw new Error(`${item.youtubeVideoId}: durable upload receipt is missing`);
    if (ledgerRows.some((candidate) => candidate.videoType !== "polyglot" || candidate.contentScope !== "full" || candidate.bundleKey !== bundle
      || candidate.campaignId !== campaignId || assignmentKey(candidate) !== item.assignmentKey || candidate.postUploadError)) {
      throw new Error(`${item.youtubeVideoId}: durable receipt is not a clean matching full publication`);
    }
    const row = ledgerRows.find((candidate) => candidate.scheduledPublishAt && candidate.youtubePlaylistId && candidate.playlistItemId);
    if (!row) throw new Error(`${item.youtubeVideoId}: no durable receipt has schedule and playlist proof`);
    if (bySupport.has(row.supportLang)) throw new Error(`${row.supportLang}: multiple durable full receipts`);
    bySupport.set(row.supportLang, row);
  }
  if (bySupport.size !== selected.length) throw new Error("durable full receipt support coverage is incomplete");
  return bySupport;
}

export function buildClaimSupersession({ registry, calendar, polyglotRegistry, progress, snapshot, finalizerArtifact, campaignId, selectedSupports, bundle, now = new Date().toISOString() }) {
  const campaign = (registry.campaigns || []).find((row) => row.campaignId === campaignId);
  if (!campaign || campaign.status !== "reconciliation_required") throw new Error("source campaign must exist and be reconciliation_required");
  const ledgers = [polyglotRegistry, progress].flatMap(publications);
  const fullPublications = finalizerArtifact
    ? finalizedReceiptFullBySupport(finalizerArtifact, ledgers, campaignId, selectedSupports, bundle)
    : liveFullBySupport(snapshot, selectedSupports, bundle);
  const selected = selectedSupports.map((support) => {
    const matches = (campaign.assignments || []).filter((row) => row.supportLang === support
      && row.videoType === "polyglot"
      && row.bundleKey === bundle
      && row.contentScope === "short_unverified"
      && !row.youtubeVideoId
      && !String(row.status || "").includes("superseded"));
    if (matches.length !== 1) throw new Error(`${support}: expected one active zero-upload short claim, got ${matches.length}`);
    return matches[0];
  });
  const keys = new Set(selected.map((row) => row.assignmentKey));
  const calendarKeys = new Set(selected.map((row) => row.calendarAssignmentKey));
  const slots = new Set(selected.map((row) => row.slotKey));
  const activeCalendarRows = (calendar.reservations || []).filter((row) => row.campaignId === campaignId && isActiveReservation(row));
  for (const row of selected) {
    const claim = activeCalendarRows.filter((candidate) => calendarAssignmentKey(candidate) === row.calendarAssignmentKey);
    if (claim.length !== 1 || claim[0].youtubeVideoId) throw new Error(`${row.supportLang}: calendar claim is not exactly one zero-upload reservation`);
  }
  const durableAssignmentKey = (row) => row.assignmentKey || assignmentKey(row);
  const receiptRows = ledgers.filter((row) => keys.has(durableAssignmentKey(row)) && row.youtubeVideoId);
  if (receiptRows.length) throw new Error(`selected claims have durable YouTube receipts: ${receiptRows.map((row) => row.youtubeVideoId).join(",")}`);
  const reportRows = selected.map((row) => ({
    supportLang: row.supportLang,
    assignmentKey: row.assignmentKey,
    calendarAssignmentKey: row.calendarAssignmentKey,
    claimedSlot: row.slotKey,
    shortYoutubeVideoId: row.youtubeVideoId || "",
    durableReceiptCount: ledgers.filter((candidate) => durableAssignmentKey(candidate) === row.assignmentKey && candidate.youtubeVideoId).length,
    durableArtifactReferences: [row.artifactPath, row.receiptPath, row.githubRunId].filter(Boolean),
    fullYoutubeVideoId: fullPublications.get(row.supportLang).youtubeVideoId,
    fullPublishAt: fullPublications.get(row.supportLang).scheduledPublishAt || fullPublications.get(row.supportLang).publishAt,
  }));
  if (reportRows.some((row) => row.shortYoutubeVideoId || row.durableReceiptCount || row.durableArtifactReferences.length)) {
    throw new Error("selected claims are not proven zero-upload");
  }
  const nextRegistry = structuredClone(registry);
  const nextCampaign = nextRegistry.campaigns.find((row) => row.campaignId === campaignId);
  nextCampaign.assignmentKeys = (nextCampaign.assignmentKeys || []).filter((key) => !keys.has(key));
  nextCampaign.slotKeys = (nextCampaign.slotKeys || []).filter((key) => !slots.has(key));
  for (const row of nextCampaign.assignments || []) {
    if (!keys.has(row.assignmentKey)) continue;
    const full = fullPublications.get(row.supportLang);
    Object.assign(row, { status: "superseded_live_full_product_conflict", supersededAt: now, supersededByYoutubeVideoId: full.youtubeVideoId, supersededReason: "confirmed_full_product_has_priority" });
  }
  const nextCalendar = structuredClone(calendar);
  const fullCalendarReservations = [];
  for (const row of nextCalendar.reservations || []) {
    if (row.campaignId !== campaignId || !calendarKeys.has(calendarAssignmentKey(row)) || !isActiveReservation(row)) continue;
    const full = fullPublications.get(row.supportLang);
    Object.assign(row, { status: "superseded_live_full_product_conflict", supersededAt: now, supersededByYoutubeVideoId: full.youtubeVideoId, supersededReason: "confirmed_full_product_has_priority", updatedAt: now });
    fullCalendarReservations.push({
      ...row,
      status: "reserved_durable_upload_receipt_reconciled",
      source: "youtube-campaign-finalizer-reconciliation",
      contentScope: "full",
      polyglotKey: full.polyglotKey,
      targetLang: full.targetLang,
      targetLangs: full.targetLangs,
      targetLangsCsv: full.targetLangsCsv,
      targetLangsHash: full.targetLangsHash,
      youtubeVideoId: full.youtubeVideoId,
      youtubePlaylistId: full.youtubePlaylistId,
      playlistItemId: full.playlistItemId,
      publicationStatus: full.publicationStatus,
      scheduledPublishAt: full.scheduledPublishAt,
      reconciledAt: now,
      supersededAt: undefined,
      supersededByYoutubeVideoId: undefined,
      supersededReason: undefined,
      updatedAt: now,
    });
  }
  for (const row of fullCalendarReservations) {
    const duplicate = (nextCalendar.reservations || []).find((candidate) => isActiveReservation(candidate) && calendarAssignmentKey(candidate) === calendarAssignmentKey(row));
    if (duplicate) throw new Error(`${row.supportLang}: full calendar reservation already active`);
    nextCalendar.reservations.push(row);
  }
  nextCampaign.reconciledFullPublications = [
    ...(nextCampaign.reconciledFullPublications || []),
    ...[...fullPublications.values()].map((row) => ({ supportLang: row.supportLang, bundleKey: row.bundleKey, contentScope: "full", youtubeVideoId: row.youtubeVideoId, scheduledPublishAt: row.scheduledPublishAt, reconciledAt: now, source: finalizerArtifact ? "finalizer_durable_upload_receipt" : "live_snapshot" })),
  ];
  return {
    report: {
      schemaVersion: 1,
      generatedAt: now,
      mode: "dry-run",
      campaignId,
      bundleKey: bundle,
      selectedCount: reportRows.length,
      proof: { zeroYoutubeIds: true, zeroDurableReceipts: true, zeroDurableArtifactReferences: true, fullProductPriority: true },
      fullEvidenceSource: finalizerArtifact ? "parent_finalizer_durable_upload_receipt" : "live_snapshot",
      rows: reportRows,
      sourceFingerprints: { registry: sha256(registry), calendar: sha256(calendar), polyglotRegistry: sha256(polyglotRegistry), progress: sha256(progress), ...(finalizerArtifact ? { finalizerArtifact: sha256(finalizerArtifact) } : { snapshot: sha256(snapshot) }) },
    },
    nextRegistry,
    nextCalendar,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(`node scripts/supersede-youtube-campaign-claims.mjs --campaign-id=<id> --supports=BG,HR --bundle=global_europe_core --snapshot=<snapshot.json> [--apply --confirm=${CONFIRM}]`);
    return;
  }
  if (!options.campaignId || !options.supports || !options.bundle || (!options.snapshot && !options.finalizerArtifact)) throw new Error("--campaign-id, --supports, --bundle and either --snapshot or --finalizer-artifact are required");
  if (options.apply && options.confirm !== CONFIRM) throw new Error(`--apply requires --confirm=${CONFIRM}`);
  const result = buildClaimSupersession({
    registry: readJson(options.registry),
    calendar: readJson(options.calendar),
    polyglotRegistry: readJson(options.polyglotRegistry),
    progress: readJson(options.progress),
    snapshot: options.snapshot ? readJson(options.snapshot) : null,
    finalizerArtifact: options.finalizerArtifact ? readJson(options.finalizerArtifact) : null,
    campaignId: options.campaignId,
    selectedSupports: supports(options.supports),
    bundle: options.bundle,
  });
  result.report.mode = options.apply ? "apply_local_zero_upload_claim_supersession" : "dry-run";
  if (options.apply) {
    writeJson(options.registry, result.nextRegistry);
    writeJson(options.calendar, result.nextCalendar);
  }
  writeJson(options.output, result.report);
  console.log(JSON.stringify(result.report, null, 2));
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
