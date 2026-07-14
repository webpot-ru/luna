#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import sharp from "sharp";

import { buildContactSheet } from "./build-youtube-cover-assets.mjs";
import { canonicalSupportCode, normalizeCode } from "./lib/youtube-publication-control.mjs";
import { verifyCampaignManifest } from "./lib/youtube-publication-campaign.mjs";

const CONFIRM = "IMPORT_APPROVED_CAMPAIGN_COVERS";

function parseArgs(argv) {
  const options = {
    sourceRef: "origin/codex/polyglot-thumbnail-metadata-fix-20260711",
    ordinarySourceManifest: "outputs/design-prototypes/youtube-thumbnail-home_kitchen_cooking_actions_a1_a2-approved-channel-pairs-target-language-first-20260707/manifest.json",
    polyglotSourceManifest: "outputs/design-prototypes/youtube-thumbnail-home_kitchen_cooking_actions_a1_a2-approved-polyglot-core-canonical-20260711/manifest.json",
    coverRegistry: "config/youtube-cover-assets.json",
    outputRoot: "",
    apply: false,
    confirm: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--manifest" || arg.startsWith("--manifest=")) options.manifest = value();
    else if (arg === "--source-ref" || arg.startsWith("--source-ref=")) options.sourceRef = value();
    else if (arg === "--ordinary-source-manifest" || arg.startsWith("--ordinary-source-manifest=")) options.ordinarySourceManifest = value();
    else if (arg === "--polyglot-source-manifest" || arg.startsWith("--polyglot-source-manifest=")) options.polyglotSourceManifest = value();
    else if (arg === "--cover-registry" || arg.startsWith("--cover-registry=")) options.coverRegistry = value();
    else if (arg === "--output-root" || arg.startsWith("--output-root=")) options.outputRoot = value();
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm" || arg.startsWith("--confirm=")) options.confirm = value();
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function gitBlob(ref, filePath, encoding = null) {
  return execFileSync("git", ["show", `${ref}:${filePath}`], { encoding, maxBuffer: 20 * 1024 * 1024 });
}

function sourceManifest(ref, filePath) {
  return JSON.parse(gitBlob(ref, filePath, "utf8"));
}

function supportCodes(cover = {}) {
  return [cover.supportLang, cover.viewerSupportLang, ...(Array.isArray(cover.channelSupportLangs) ? cover.channelSupportLangs : [])]
    .map(canonicalSupportCode).filter(Boolean);
}

function targetList(value) {
  return (Array.isArray(value) ? value : String(value || "").split(","))
    .map(normalizeCode).filter(Boolean).sort().join(",");
}

function findSourceCover(covers, assignment) {
  return covers.find((cover) => {
    if (cover.uploadEligible === false) return false;
    if (cover.setId && cover.setId !== assignment.setId) return false;
    if (!supportCodes(cover).includes(assignment.supportLang)) return false;
    if (assignment.videoType === "polyglot") {
      return (!cover.bundleKey || cover.bundleKey === assignment.bundleKey)
        && targetList(cover.targetLangsCsv || cover.targetLangs) === targetList(assignment.targetLangs);
    }
    return normalizeCode(cover.targetLang) === assignment.targetLang;
  }) || null;
}

function safeSegment(value) {
  return String(value || "item").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(`node scripts/import-youtube-campaign-covers-from-git.mjs --manifest=<campaign.json> [--apply --confirm=${CONFIRM}]`);
    return;
  }
  if (!options.manifest) throw new Error("--manifest is required");
  if (options.apply && options.confirm !== CONFIRM) throw new Error(`--apply requires --confirm=${CONFIRM}`);
  const campaign = JSON.parse(fs.readFileSync(options.manifest, "utf8"));
  verifyCampaignManifest(campaign);
  const outputRoot = options.outputRoot || `data/youtube-cover-assets/${safeSegment(campaign.campaignId)}`;
  const sourceCovers = [
    ...(sourceManifest(options.sourceRef, options.ordinarySourceManifest).covers || []),
    ...(sourceManifest(options.sourceRef, options.polyglotSourceManifest).covers || []),
  ];
  const requested = (campaign.assignments || []).filter((row) => row.thumbnail?.mode === "custom" && row.thumbnail?.ready !== true);
  const selected = requested.map((assignment) => {
    const cover = findSourceCover(sourceCovers, assignment);
    if (!cover) throw new Error(`Approved source cover not found for ${assignment.assignmentKey}`);
    const sourcePath = cover.relativePath || cover.path;
    if (!sourcePath) throw new Error(`Approved source cover has no repository path for ${assignment.assignmentKey}`);
    const extension = path.extname(sourcePath).toLowerCase() || ".jpg";
    const relativePath = path.join(outputRoot, "by-assignment", `${safeSegment(assignment.assignmentKey)}${extension}`);
    return { assignment, cover, sourcePath, relativePath, sidecarPath: relativePath.replace(/\.[^.]+$/, ".json") };
  });
  if (new Set(selected.map((row) => row.relativePath)).size !== selected.length) throw new Error("Imported cover output paths are not unique");

  const report = {
    mode: options.apply ? "apply" : "dry_run",
    campaignId: campaign.campaignId,
    sourceRef: options.sourceRef,
    requestedCount: requested.length,
    selectedCount: selected.length,
    outputRoot,
    externalProviderCalls: 0,
    youtubeWrites: 0,
  };
  if (!options.apply) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const importedAt = new Date().toISOString();
  const rendered = [];
  for (const item of selected) {
    const bytes = gitBlob(options.sourceRef, item.sourcePath);
    fs.mkdirSync(path.dirname(item.relativePath), { recursive: true });
    fs.writeFileSync(item.relativePath, bytes);
    const metadata = await sharp(item.relativePath).metadata();
    if (metadata.width !== 1280 || metadata.height !== 720 || metadata.format !== "jpeg") {
      throw new Error(`Invalid approved JPG ${item.relativePath}: ${metadata.width}x${metadata.height} ${metadata.format}`);
    }
    const sizeBytes = fs.statSync(item.relativePath).size;
    if (sizeBytes > 2_000_000) throw new Error(`Approved JPG exceeds 2 MB: ${item.relativePath}`);
    const imported = {
      ...item.cover,
      videoType: item.assignment.videoType,
      setId: item.assignment.setId,
      supportLang: item.assignment.supportLang,
      targetLang: item.assignment.targetLang,
      targetLangs: item.assignment.targetLangs || [],
      targetLangsCsv: item.assignment.targetLangsCsv || "",
      targetLangsHash: item.assignment.targetLangsHash || "",
      bundleKey: item.assignment.bundleKey || "",
      contentScope: item.assignment.contentScope || "",
      polyglotKey: item.assignment.polyglotKey || "",
      assignmentKey: item.assignment.assignmentKey,
      path: path.resolve(item.relativePath),
      relativePath: item.relativePath,
      sidecarPath: path.resolve(item.sidecarPath),
      relativeSidecarPath: item.sidecarPath,
      sourceRef: options.sourceRef,
      sourcePath: item.sourcePath,
      importedAt,
      sizeBytes,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      status: "approved",
      uploadEligible: true,
    };
    fs.writeFileSync(item.sidecarPath, `${JSON.stringify(imported, null, 2)}\n`, "utf8");
    rendered.push(imported);
  }
  const contactSheetPath = path.join(outputRoot, "contact-sheet.jpg");
  await buildContactSheet(rendered, contactSheetPath);
  const manifestPath = path.join(outputRoot, "manifest.json");
  const manifest = {
    schemaVersion: 1,
    generatedAt: importedAt,
    status: "approved",
    sourceOfTruth: "Existing approved Git cover assets, narrowed to one immutable publication campaign.",
    campaignId: campaign.campaignId,
    campaignManifestHash: campaign.manifestHash,
    sourceRef: options.sourceRef,
    sourceManifests: [options.ordinarySourceManifest, options.polyglotSourceManifest],
    policy: { externalProviderCalls: 0, youtubeWrites: 0, applyRequiresGitTrackedAssets: true },
    counts: { coverCount: rendered.length, ordinaryCount: rendered.filter((row) => row.videoType === "ordinary").length, polyglotCount: rendered.filter((row) => row.videoType === "polyglot").length },
    outputs: { root: outputRoot, manifest: manifestPath, contactSheet: contactSheetPath },
    covers: rendered,
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const registry = JSON.parse(fs.readFileSync(options.coverRegistry, "utf8"));
  const id = `campaign-${campaign.campaignId}`;
  const existing = (registry.manifests || []).find((row) => row.id === id);
  if (existing && existing.path !== manifestPath) throw new Error(`Cover registry id collision: ${id}`);
  if (!existing) {
    registry.manifests ||= [];
    registry.manifests.push({ id, setId: campaign.setId, videoTypes: ["ordinary", "polyglot"], campaignId: campaign.campaignId, status: registry.policy?.activeStatus || "approved", path: manifestPath });
    fs.writeFileSync(options.coverRegistry, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify({ ...report, manifestPath, contactSheetPath, registryUpdated: !existing }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
