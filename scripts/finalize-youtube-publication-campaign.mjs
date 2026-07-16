#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import { mergeYoutubePublishState } from "./merge-youtube-publish-state.mjs";
import { assignmentKey } from "./lib/youtube-publication-control.mjs";

function parseArgs(argv) {
  const options = {
    artifactsRoot: ".campaign-artifacts",
    campaignRegistry: "config/youtube-publication-campaigns.json",
    calendar: "config/youtube-publish-calendar.json",
    ordinaryRegistry: "config/youtube-published-videos.json",
    polyglotRegistry: "config/youtube-polyglot-published-videos.json",
    ordinaryResult: "unknown",
    polyglotResult: "unknown",
    output: "outputs/youtube-publication-campaign-finalize.json",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--campaign-id" || arg.startsWith("--campaign-id=")) options.campaignId = value();
    else if (arg === "--artifacts-root" || arg.startsWith("--artifacts-root=")) options.artifactsRoot = value();
    else if (arg === "--campaign-registry" || arg.startsWith("--campaign-registry=")) options.campaignRegistry = value();
    else if (arg === "--calendar" || arg.startsWith("--calendar=")) options.calendar = value();
    else if (arg === "--ordinary-registry" || arg.startsWith("--ordinary-registry=")) options.ordinaryRegistry = value();
    else if (arg === "--polyglot-registry" || arg.startsWith("--polyglot-registry=")) options.polyglotRegistry = value();
    else if (arg === "--ordinary-result" || arg.startsWith("--ordinary-result=")) options.ordinaryResult = value();
    else if (arg === "--polyglot-result" || arg.startsWith("--polyglot-result=")) options.polyglotResult = value();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    if (fallback !== null) return structuredClone(fallback);
    throw new Error(`Required JSON file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function artifactStateRoots(root) {
  if (!fs.existsSync(root)) return [];
  const found = [];
  const visit = (directory, depth) => {
    if (depth > 4) return;
    if (fs.existsSync(path.join(directory, "config"))) {
      found.push(directory);
      return;
    }
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) visit(path.join(directory, entry.name), depth + 1);
    }
  };
  visit(path.resolve(root), 0);
  return [...new Set(found)].sort();
}

function sameInstant(left, right) {
  const leftMillis = Date.parse(left || "");
  const rightMillis = Date.parse(right || "");
  return Number.isFinite(leftMillis) && Number.isFinite(rightMillis) && leftMillis === rightMillis;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("node scripts/finalize-youtube-publication-campaign.mjs --campaign-id=<id> --artifacts-root=.campaign-artifacts");
    return;
  }
  if (!options.campaignId) throw new Error("--campaign-id is required");
  const registry = readJson(options.campaignRegistry);
  const campaign = (registry.campaigns || []).find((row) => row.campaignId === options.campaignId);
  if (!campaign) throw new Error(`Campaign not found: ${options.campaignId}`);
  const artifactRoots = artifactStateRoots(options.artifactsRoot);
  const mergeSummaries = artifactRoots.map((artifactDir, index) => mergeYoutubePublishState({
    artifactDir,
    repoRoot: process.cwd(),
    summary: `outputs/youtube-publication-campaign-merge-${String(index + 1).padStart(3, "0")}.json`,
  }));

  const ordinary = readJson(options.ordinaryRegistry, { publications: [] });
  const polyglot = readJson(options.polyglotRegistry, { publications: [] });
  const campaignPublications = [...(ordinary.publications || []), ...(polyglot.publications || [])]
    .filter((row) => row.campaignId === campaign.campaignId && row.campaignManifestHash === campaign.manifestHash && row.youtubeVideoId);
  const expectedAssignmentKeys = new Set((campaign.assignments || []).map((row) => row.assignmentKey));
  const publicationsByAssignment = new Map();
  for (const row of campaignPublications) {
    const key = assignmentKey(row);
    const rows = publicationsByAssignment.get(key) || [];
    rows.push(row);
    publicationsByAssignment.set(key, rows);
  }
  const duplicateAssignments = [...publicationsByAssignment.entries()]
    .filter(([, rows]) => new Set(rows.map((row) => row.youtubeVideoId)).size > 1)
    .map(([key, rows]) => ({ assignmentKey: key, youtubeVideoIds: [...new Set(rows.map((row) => row.youtubeVideoId))] }));
  const assignmentsByVideoId = new Map();
  for (const [key, rows] of publicationsByAssignment) {
    for (const row of rows) {
      const keys = assignmentsByVideoId.get(row.youtubeVideoId) || new Set();
      keys.add(key);
      assignmentsByVideoId.set(row.youtubeVideoId, keys);
    }
  }
  const duplicateVideoIds = [...assignmentsByVideoId.entries()]
    .filter(([, keys]) => keys.size > 1)
    .map(([youtubeVideoId, keys]) => ({ youtubeVideoId, assignmentKeys: [...keys].sort() }));
  const unexpectedPublications = campaignPublications
    .map((row) => ({ assignmentKey: assignmentKey(row), youtubeVideoId: row.youtubeVideoId }))
    .filter((row) => !expectedAssignmentKeys.has(row.assignmentKey));
  const receiptErrors = [];
  for (const assignment of campaign.assignments || []) {
    const rows = publicationsByAssignment.get(assignment.assignmentKey) || [];
    if (rows.length !== 1) continue;
    const publication = rows[0];
    const actualPublishAt = publication.scheduledPublishAt || publication.publishAt || publication.readback?.publishAt || "";
    if (!sameInstant(actualPublishAt, assignment.publishAt)) {
      receiptErrors.push({
        assignmentKey: assignment.assignmentKey,
        code: "publish_at_mismatch",
        expected: assignment.publishAt,
        actual: actualPublishAt,
      });
    }
    if (publication.channelKey && publication.channelKey !== assignment.channelKey) {
      receiptErrors.push({
        assignmentKey: assignment.assignmentKey,
        code: "channel_mismatch",
        expected: assignment.channelKey,
        actual: publication.channelKey,
      });
    }
    if (assignment.thumbnail?.mode === "custom" && publication.thumbnailSet !== true) {
      receiptErrors.push({ assignmentKey: assignment.assignmentKey, code: "required_custom_thumbnail_not_set" });
    }
    if (!publication.youtubePlaylistId) {
      receiptErrors.push({ assignmentKey: assignment.assignmentKey, code: "playlist_id_missing" });
    }
    if (!publication.playlistItemId) {
      receiptErrors.push({ assignmentKey: assignment.assignmentKey, code: "playlist_item_missing" });
    }
    if (assignment.playlist?.state === "resolved_existing"
      && publication.youtubePlaylistId
      && publication.youtubePlaylistId !== assignment.playlist.youtubePlaylistId) {
      receiptErrors.push({
        assignmentKey: assignment.assignmentKey,
        code: "playlist_id_mismatch",
        expected: assignment.playlist.youtubePlaylistId,
        actual: publication.youtubePlaylistId,
      });
    }
    if (publication.postUploadError) {
      receiptErrors.push({ assignmentKey: assignment.assignmentKey, code: "post_upload_error", error: publication.postUploadError });
    }
  }
  const receiptErrorAssignments = new Set(receiptErrors.map((row) => row.assignmentKey));
  const finalizedAt = new Date().toISOString();
  let observedCount = 0;
  let validReceiptCount = 0;
  campaign.assignments = (campaign.assignments || []).map((row) => {
    const publications = publicationsByAssignment.get(row.assignmentKey) || [];
    const publication = publications[0];
    if (!publication) return row;
    observedCount += 1;
    const receiptValid = publications.length === 1 && !receiptErrorAssignments.has(row.assignmentKey);
    if (receiptValid) validReceiptCount += 1;
    return {
      ...row,
      status: receiptValid ? "upload_accepted" : "upload_accepted_reconciliation_required",
      youtubeVideoId: publication.youtubeVideoId,
      youtubeVideoUrl: publication.youtubeVideoUrl,
      youtubePlaylistId: publication.youtubePlaylistId || "",
      playlistItemId: publication.playlistItemId || "",
      thumbnailSet: publication.thumbnailSet === true,
      publicationStatus: publication.publicationStatus || "",
      githubRunId: publication.githubRunId || "",
      githubRunUrl: publication.githubRunUrl || "",
      postUploadError: publication.postUploadError || "",
      finalizedAt,
    };
  });
  const expectedCount = campaign.assignments.length;
  const ordinaryExpectedCount = campaign.assignments.filter((row) => row.videoType === "ordinary").length;
  const polyglotExpectedCount = campaign.assignments.filter((row) => row.videoType === "polyglot").length;
  const workerSucceeded = (expectedCountForType, result) => (
    expectedCountForType === 0 ? ["success", "skipped"].includes(result) : result === "success"
  );
  const workerSuccess = workerSucceeded(ordinaryExpectedCount, options.ordinaryResult)
    && workerSucceeded(polyglotExpectedCount, options.polyglotResult);
  const complete = workerSuccess
    && observedCount === expectedCount
    && validReceiptCount === expectedCount
    && duplicateAssignments.length === 0
    && duplicateVideoIds.length === 0
    && unexpectedPublications.length === 0
    && receiptErrors.length === 0;
  campaign.status = complete ? "finalized" : "reconciliation_required";
  campaign.finalizedAt = finalizedAt;
  campaign.finalizeSummary = {
    expectedCount,
    completedCount: validReceiptCount,
    observedCount,
    missingCount: expectedCount - observedCount,
    duplicateAssignmentCount: duplicateAssignments.length,
    duplicateVideoIdCount: duplicateVideoIds.length,
    unexpectedPublicationCount: unexpectedPublications.length,
    receiptErrorCount: receiptErrors.length,
    ordinaryResult: options.ordinaryResult,
    polyglotResult: options.polyglotResult,
    artifactCount: artifactRoots.length,
  };
  const calendar = readJson(options.calendar, { reservations: [] });
  for (const row of calendar.reservations || []) {
    if (row.campaignId !== campaign.campaignId) continue;
    const publication = (publicationsByAssignment.get(assignmentKey(row)) || [])[0];
    if (!publication) continue;
    row.youtubeVideoId = publication.youtubeVideoId;
    row.youtubePlaylistId = publication.youtubePlaylistId || row.youtubePlaylistId || "";
    row.playlistItemId = publication.playlistItemId || row.playlistItemId || "";
    row.status = complete ? "campaign_finalized" : "campaign_upload_accepted";
    row.updatedAt = finalizedAt;
  }
  writeJson(options.calendar, calendar);
  writeJson(options.campaignRegistry, registry);
  const report = {
    schemaVersion: 1,
    generatedAt: finalizedAt,
    campaignId: campaign.campaignId,
    manifestHash: campaign.manifestHash,
    status: campaign.status,
    complete,
    expectedCount,
    completedCount: validReceiptCount,
    observedCount,
    missingCount: expectedCount - observedCount,
    duplicateAssignments,
    duplicateVideoIds,
    unexpectedPublications,
    receiptErrors,
    workerResults: { ordinary: options.ordinaryResult, polyglot: options.polyglotResult },
    artifactCount: artifactRoots.length,
    mergeSummaries,
  };
  writeJson(options.output, report);
  console.log(JSON.stringify(report, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
