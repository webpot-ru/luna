#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const options = {
    inputRoot: ".campaign-metadata",
    output: "outputs/youtube-campaign-metadata-copy.json",
    registry: "config/youtube-publication-campaigns.json",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--campaign-id" || arg.startsWith("--campaign-id=")) options.campaignId = value();
    else if (arg === "--manifest-hash" || arg.startsWith("--manifest-hash=")) options.manifestHash = value();
    else if (arg === "--video-type" || arg.startsWith("--video-type=")) options.videoType = value();
    else if (arg === "--support" || arg.startsWith("--support=")) options.support = value().trim().toUpperCase();
    else if (arg === "--input-root" || arg.startsWith("--input-root=")) options.inputRoot = value();
    else if (arg === "--registry" || arg.startsWith("--registry=")) options.registry = value();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function safeSegment(value) {
  return String(value || "").replace(/[^a-zA-Z0-9._-]+/gu, "_").replace(/^_+|_+$/gu, "");
}

function findIndexes(root) {
  const indexes = [];
  const visit = (directory, depth) => {
    if (!fs.existsSync(directory) || depth > 6) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(filePath, depth + 1);
      else if (entry.isFile() && entry.name === "index.json") indexes.push(filePath);
    }
  };
  visit(path.resolve(root), 0);
  return indexes.sort();
}

function expectedDestination(assignment) {
  if (assignment.videoType === "polyglot") {
    return path.resolve(
      "outputs/video-generator",
      `${assignment.setId}_polyglot_${assignment.supportLang.toLowerCase()}_${safeSegment(assignment.bundleKey)}`,
      "youtube_metadata.json",
    );
  }
  return path.resolve("outputs/video-generator", `${assignment.setId}_${assignment.targetLang.toLowerCase()}_${assignment.supportLang.toLowerCase()}`, "youtube_metadata.json");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("node scripts/copy-youtube-campaign-metadata.mjs --campaign-id=<id> --manifest-hash=<hash> --video-type=ordinary|polyglot --support=EN");
    return;
  }
  if (!options.campaignId || !options.manifestHash || !options.support || !["ordinary", "polyglot"].includes(options.videoType)) {
    throw new Error("--campaign-id, --manifest-hash, --video-type and --support are required");
  }
  const registry = JSON.parse(fs.readFileSync(options.registry, "utf8"));
  const campaign = (registry.campaigns || []).find((row) => row.campaignId === options.campaignId);
  if (!campaign || campaign.manifestHash !== options.manifestHash) throw new Error("Durable campaign identity mismatch");
  const expected = (campaign.assignments || []).filter((row) => (
    row.videoType === options.videoType && row.supportLang === options.support
  ));
  if (!expected.length) throw new Error(`No expected ${options.videoType} assignments for ${options.support}`);

  const indexes = findIndexes(options.inputRoot);
  const allEntries = [];
  for (const indexPath of indexes) {
    const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    if (index.campaignId !== options.campaignId || index.manifestHash !== options.manifestHash) continue;
    for (const entry of index.entries || []) {
      allEntries.push({ ...entry, indexPath });
    }
  }
  const byAssignment = new Map();
  for (const entry of allEntries) {
    if (byAssignment.has(entry.assignmentKey)) throw new Error(`Duplicate campaign metadata artifact: ${entry.assignmentKey}`);
    byAssignment.set(entry.assignmentKey, entry);
  }
  const copied = [];
  for (const assignment of expected) {
    const entry = byAssignment.get(assignment.assignmentKey);
    if (!entry) throw new Error(`Campaign metadata artifact missing: ${assignment.assignmentKey}`);
    if (entry.videoType !== assignment.videoType || entry.supportLang !== assignment.supportLang) {
      throw new Error(`Campaign metadata artifact identity mismatch: ${assignment.assignmentKey}`);
    }
    const indexRoot = path.resolve(path.dirname(entry.indexPath));
    const source = path.resolve(indexRoot, entry.artifactPath);
    if (!source.startsWith(`${indexRoot}${path.sep}`)) throw new Error(`Campaign metadata artifact escapes its index root: ${assignment.assignmentKey}`);
    if (!fs.existsSync(source)) throw new Error(`Campaign metadata file missing: ${source}`);
    if (entry.sha256 && sha256(source) !== entry.sha256) throw new Error(`Campaign metadata checksum mismatch: ${assignment.assignmentKey}`);
    const metadata = JSON.parse(fs.readFileSync(source, "utf8"));
    if (metadata.campaignId !== options.campaignId || metadata.campaignManifestHash !== options.manifestHash) {
      throw new Error(`Metadata document campaign identity mismatch: ${assignment.assignmentKey}`);
    }
    if (metadata.publishAt !== assignment.publishAt || metadata.scheduledPublishAt !== assignment.publishAt) {
      throw new Error(`Metadata publishAt mismatch: ${assignment.assignmentKey}`);
    }
    if (metadata.campaignPlaylist?.playlistKey !== assignment.playlist?.playlistKey
      || metadata.campaignPlaylist?.state !== assignment.playlist?.state
      || String(metadata.campaignPlaylist?.youtubePlaylistId || "") !== String(assignment.playlist?.youtubePlaylistId || "")) {
      throw new Error(`Metadata playlist discovery identity mismatch: ${assignment.assignmentKey}`);
    }
    const destination = expectedDestination(assignment);
    if (path.resolve(entry.destination) !== destination) throw new Error(`Campaign metadata destination mismatch: ${assignment.assignmentKey}`);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    copied.push({ assignmentKey: assignment.assignmentKey, source, destination });
  }
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    campaignId: options.campaignId,
    manifestHash: options.manifestHash,
    videoType: options.videoType,
    supportLang: options.support,
    expectedCount: expected.length,
    copiedCount: copied.length,
    copied,
  };
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(options.json ? report : {
    campaignId: report.campaignId,
    videoType: report.videoType,
    supportLang: report.supportLang,
    copiedCount: report.copiedCount,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
