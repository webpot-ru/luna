#!/usr/bin/env node
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { buildContactSheet, renderCover } from "./build-youtube-cover-assets.mjs";
import { languageLabel, safeSegment, targetLines } from "./lib/youtube-cover-assets.mjs";

const DEFAULT_PLAN = "../../outputs/youtube-publication-campaign-preflight-29478908334/youtube-publication-campaign-plan.json";
const DEFAULT_APPROVED_MANIFEST = "data/youtube-cover-assets/yt-home_kitchen_cooking_actions_a1_a2-2026-07-14-30b96a246c69/manifest.json";
const DEFAULT_DECK_BLOB = "144f997ab79e4e99efaf18c0d7592fb904609dd1";
const APPROVAL_CONFIRMATION = "APPROVE_REVIEWED_CAMPAIGN_COVERS";

function parseArgs(argv) {
  const options = {
    campaignManifest: DEFAULT_PLAN,
    approvedManifest: DEFAULT_APPROVED_MANIFEST,
    deckGitBlob: DEFAULT_DECK_BLOB,
    outputRoot: "",
    concurrency: 4,
    dryRun: false,
    approve: false,
    confirm: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--campaign-manifest" || arg.startsWith("--campaign-manifest=")) options.campaignManifest = value();
    else if (arg === "--approved-manifest" || arg.startsWith("--approved-manifest=")) options.approvedManifest = value();
    else if (arg === "--deck-git-blob" || arg.startsWith("--deck-git-blob=")) options.deckGitBlob = value();
    else if (arg === "--output-root" || arg.startsWith("--output-root=")) options.outputRoot = value();
    else if (arg === "--concurrency" || arg.startsWith("--concurrency=")) options.concurrency = Number(value());
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--approve") options.approve = true;
    else if (arg === "--confirm" || arg.startsWith("--confirm=")) options.confirm = value();
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} not found: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableAssignmentKey(assignment) {
  return String(assignment.assignmentKey || "").trim();
}

function approvedAssignmentKeys(manifest) {
  if (manifest.status !== "approved") throw new Error(`Expected approved current cover manifest, got status=${manifest.status}`);
  return new Set((manifest.covers || [])
    .filter((cover) => cover.status === "approved")
    .map(stableAssignmentKey)
    .filter(Boolean));
}

function selectMissingCustomAssignments(plan, approvedKeys) {
  const candidates = (plan.assignments || []).filter((assignment) => assignment.thumbnail?.mode === "custom" && assignment.thumbnail?.ready !== true);
  if (!candidates.length) throw new Error("Campaign manifest has no missing custom-thumbnail assignments");
  const duplicateKeys = candidates.map(stableAssignmentKey).filter((key, index, all) => all.indexOf(key) !== index);
  if (duplicateKeys.length) throw new Error(`Duplicate campaign assignment keys: ${[...new Set(duplicateKeys)].join(",")}`);
  const alreadyApproved = candidates.filter((assignment) => approvedKeys.has(stableAssignmentKey(assignment)));
  if (alreadyApproved.length) {
    throw new Error(`Campaign says cover missing but approved exact cover exists: ${alreadyApproved.map(stableAssignmentKey).join(",")}`);
  }
  return candidates;
}

function readHistoricalDeck(blobId) {
  execFileSync("git", ["cat-file", "-e", `${blobId}^{blob}`], { stdio: "pipe" });
  const raw = execFileSync("git", ["show", blobId], { encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
  return { deck: JSON.parse(raw), sha256: sha256(raw) };
}

function assertTrackedFile(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} missing: ${filePath}`);
  execFileSync("git", ["ls-files", "--error-unmatch", "--", filePath], { stdio: "pipe" });
  return sha256(fs.readFileSync(filePath));
}

function localizedDeckText(deck, supportLang) {
  const metadata = deck.courseMetadata || deck.course_metadata || {};
  const title = metadata.title?.[supportLang] || deck.titles?.[supportLang] || metadata.title?.EN || deck.titles?.EN || deck.setId;
  const description = metadata.description?.[supportLang] || deck.descriptions?.[supportLang] || metadata.description?.EN || deck.descriptions?.EN || "";
  const module = metadata.module?.[supportLang] || metadata.module?.EN || "";
  const category = metadata.category?.[supportLang] || metadata.category?.EN || "";
  return {
    title: String(title || "").replace(/[.!?。！？]+$/u, "").trim(),
    description: String(description || "").replace(/\s+/gu, " ").trim(),
    module: String(module || "").replace(/[.!?。！？]+$/u, "").trim(),
    category: String(category || "").replace(/[.!?。！？]+$/u, "").trim(),
  };
}

function findChannel(channels, assignment) {
  const channel = channels.find((item) => item.key === assignment.channelKey);
  if (!channel) throw new Error(`No configured channel for ${stableAssignmentKey(assignment)}`);
  if (channel.customThumbnailUploadAllowed !== true) throw new Error(`Custom thumbnail unexpectedly disabled for ${stableAssignmentKey(assignment)}`);
  return channel;
}

function hasCjk(text) {
  return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(String(text || ""));
}

function coverForAssignment({ assignment, channels, deck, baseImage, outputRoot }) {
  const channel = findChannel(channels, assignment);
  const localized = localizedDeckText(deck, assignment.supportLang);
  const channelFolder = `${safeSegment(channel.key)}__${assignment.supportLang}__${safeSegment(channel.currentHandle || channel.targetHandle || channel.key)}`;
  const common = {
    setId: assignment.setId,
    supportLang: assignment.supportLang,
    viewerSupportLang: assignment.supportLang,
    channelKey: channel.key,
    channelId: channel.channelId,
    channelHandle: channel.currentHandle || channel.targetHandle || "",
    channelSupportLangs: channel.supportLangs || [assignment.supportLang],
    assignmentKey: stableAssignmentKey(assignment),
    calendarAssignmentKey: assignment.calendarAssignmentKey,
    title: localized.title,
    description: localized.description,
    module: localized.module,
    category: localized.category,
    baseImage,
    sourceAssetApproval: "git-tracked-approved-base",
    uploadEligible: false,
    status: "preCommitReady",
    reviewStatus: "pending_visual_review",
    gitTrackedApprovalRequired: true,
  };
  if (assignment.videoType === "ordinary") {
    const targetName = languageLabel(assignment.targetLang, assignment.supportLang);
    const relativePath = path.join(outputRoot, "by-assignment", `ordinary-${safeSegment(assignment.setId)}-${assignment.supportLang}-${assignment.targetLang}.jpg`);
    return {
      ...common,
      videoType: "ordinary",
      targetLang: assignment.targetLang,
      targetName,
      targetLabel: `${targetName} A1`,
      visualTemplate: "ordinary-target-language-first-large-headline-v3-deck2-action-base",
      showModule: true,
      relativePath,
      sidecarPath: relativePath.replace(/\.jpg$/u, ".json"),
      cjkTextPresent: hasCjk([targetName, localized.title, localized.description].join(" ")),
    };
  }
  const targetLangs = assignment.targetLangs || [];
  const relativePath = path.join(outputRoot, "by-assignment", `polyglot-${safeSegment(assignment.setId)}-${assignment.supportLang}-${safeSegment(assignment.bundleKey)}-${assignment.targetLangsHash}-${assignment.contentScope}.jpg`);
  const targetLanguageLines = targetLines(targetLangs, assignment.supportLang);
  return {
    ...common,
    videoType: "polyglot",
    bundleKey: assignment.bundleKey,
    bundleLabel: assignment.bundleKey,
    contentScope: assignment.contentScope,
    targetLangs,
    targetLangsCsv: targetLangs.join(","),
    targetLangsHash: assignment.targetLangsHash,
    targetLanguageLines,
    polyglotKey: assignment.polyglotKey,
    visualTemplate: "polyglot-target-languages-large-lines-v1-deck2-action-base",
    relativePath,
    sidecarPath: relativePath.replace(/\.jpg$/u, ".json"),
    cjkTextPresent: hasCjk([...targetLanguageLines, localized.title, localized.description].join(" ")),
  };
}

async function runPool(items, concurrency, worker) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(items.length, concurrency) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index], index);
    }
  }));
}

function reviewSheet(covers, approved) {
  const headers = ["assignmentKey", "videoType", "supportLang", "targetOrBundle", "contentScope", "file", "sha256", "CJK text", "technical status", "visual review", "approval"];
  const rows = covers.map((cover) => [
    cover.assignmentKey,
    cover.videoType,
    cover.supportLang,
    cover.videoType === "ordinary" ? cover.targetLang : `${cover.bundleKey}:${cover.targetLangsCsv}`,
    cover.contentScope || "",
    cover.relativePath,
    cover.sha256,
    cover.cjkTextPresent ? "yes" : "no",
    "passed-render",
    approved ? "APPROVED" : "PENDING",
    approved ? "APPROVED" : "NOT APPROVED",
  ]);
  return [headers, ...rows].map((row) => row.map((cell) => `"${String(cell || "").replace(/"/gu, '""')}"`).join(",")).join("\n") + "\n";
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: node scripts/build-youtube-campaign-cover-review.mjs --campaign-manifest <immutable-plan.json> [--output-root data/youtube-cover-assets/<campaign>-precommit-ready] [--dry-run]");
    return;
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 12) throw new Error("--concurrency must be an integer from 1 to 12");
  if (options.approve && options.confirm !== APPROVAL_CONFIRMATION) {
    throw new Error(`--approve requires --confirm=${APPROVAL_CONFIRMATION}`);
  }
  const plan = readJson(options.campaignManifest, "Campaign manifest");
  if (!plan.campaignId || !plan.manifestHash) throw new Error("Campaign manifest must be immutable and include campaignId + manifestHash");
  if (plan.setId !== "home_kitchen_cooking_actions_a1_a2") throw new Error(`This scoped generator only supports deck #2, got ${plan.setId}`);
  options.outputRoot ||= `data/youtube-cover-assets/${plan.campaignId}-precommit-ready`;
  const approved = readJson(options.approvedManifest, "Current approved cover manifest");
  const selected = selectMissingCustomAssignments(plan, approvedAssignmentKeys(approved));
  if (selected.length !== 75) throw new Error(`Expected exactly 75 missing custom covers, got ${selected.length}`);
  const expectedCustom = (plan.assignments || []).filter((assignment) => assignment.thumbnail?.mode === "custom").length;
  if (expectedCustom !== 90 || approved.covers?.length !== 72) throw new Error(`Unexpected campaign/current-cover boundary: custom=${expectedCustom} approved=${approved.covers?.length}`);
  const { deck, sha256: deckSha256 } = readHistoricalDeck(options.deckGitBlob);
  if (deck.setId !== plan.setId) throw new Error(`Historical deck blob setId mismatch: ${deck.setId}`);
  const baseImage = "assets/youtube-cover-templates/deck2-universal-approved-base.png";
  const baseSha256 = assertTrackedFile(baseImage, "Approved deck #2 cover base");
  const channels = readJson("config/youtube-channels.json", "YouTube channels").channels || [];
  const covers = selected.map((assignment) => coverForAssignment({ assignment, channels, deck, baseImage, outputRoot: options.outputRoot }));
  if (new Set(covers.map((cover) => cover.relativePath)).size !== covers.length) throw new Error("Duplicate deterministic cover paths");
  const summary = {
    campaignId: plan.campaignId,
    campaignManifestHash: plan.manifestHash,
    coverCount: covers.length,
    ordinaryCount: covers.filter((cover) => cover.videoType === "ordinary").length,
    polyglotCount: covers.filter((cover) => cover.videoType === "polyglot").length,
    status: options.approve ? "approved" : "preCommitReady",
    approved: options.approve,
    externalProviderCalls: 0,
    youtubeWrites: 0,
  };
  if (options.dryRun) {
    console.log(JSON.stringify({ ...summary, approved: options.approve, outputRoot: options.outputRoot, selectedAssignmentKeys: covers.map((cover) => cover.assignmentKey) }, null, 2));
    return;
  }
  const rendered = new Array(covers.length);
  await runPool(covers, options.concurrency, async (cover, index) => {
    rendered[index] = await renderCover(cover);
  });
  for (const cover of rendered) {
    const sidecar = readJson(cover.sidecarPath, "Rendered cover sidecar");
    cover.status = options.approve ? "approved" : "preCommitReady";
    cover.uploadEligible = options.approve;
    cover.reviewStatus = options.approve ? "approved_visual_review" : "pending_visual_review";
    cover.gitTrackedApprovalRequired = !options.approve;
    sidecar.status = cover.status;
    sidecar.uploadEligible = cover.uploadEligible;
    sidecar.reviewStatus = cover.reviewStatus;
    sidecar.gitTrackedApprovalRequired = cover.gitTrackedApprovalRequired;
    fs.writeFileSync(cover.sidecarPath, `${JSON.stringify(sidecar, null, 2)}\n`, "utf8");
  }
  const contactSheets = [];
  for (const [groupKey, group] of Object.entries(Object.groupBy(rendered, (cover) => `${cover.supportLang}__${cover.videoType}`))) {
    const contactPath = path.join(options.outputRoot, "contact-sheets", `${groupKey}.jpg`);
    await buildContactSheet(group, contactPath);
    contactSheets.push({ groupKey, coverCount: group.length, relativePath: contactPath });
  }
  fs.mkdirSync(options.outputRoot, { recursive: true });
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: options.approve ? "approved" : "preCommitReady",
    sourceOfTruth: "Immutable campaign manifest; exact missing custom-thumbnail assignments only.",
    campaignId: plan.campaignId,
    campaignManifestHash: plan.manifestHash,
    source: {
      campaignManifest: options.campaignManifest,
      approvedCoverManifest: options.approvedManifest,
      historicalDeckGitBlob: options.deckGitBlob,
      historicalDeckSha256: deckSha256,
      approvedBaseImage: baseImage,
      approvedBaseImageSha256: baseSha256,
    },
    policy: {
      externalProviderCalls: 0,
      youtubeWrites: 0,
      uploadEligible: options.approve,
      visualReviewRequired: !options.approve,
      gitTrackedApprovalManifestRequired: !options.approve,
    },
    counts: summary,
    review: {
      sheetCsv: path.join(options.outputRoot, "review-sheet.csv"),
      contactSheets,
      pendingVisualReviewCount: options.approve ? 0 : rendered.length,
      approvedCount: options.approve ? rendered.length : 0,
      cjkTextCoverCount: rendered.filter((cover) => cover.cjkTextPresent).length,
    },
    covers: rendered,
  };
  fs.writeFileSync(path.join(options.outputRoot, "review-sheet.csv"), reviewSheet(rendered, options.approve), "utf8");
  fs.writeFileSync(path.join(options.outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...summary, outputRoot: options.outputRoot, contactSheetCount: contactSheets.length }, null, 2));
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

export { approvedAssignmentKeys, coverForAssignment, parseArgs, selectMissingCustomAssignments };
