#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ORDINARY = "config/youtube-playlists.json";
const POLYGLOT = "config/youtube-polyglot-playlists.json";

function parseArgs(argv) {
  const options = { auditReport: "", manifest: "", playlistKeys: [], apply: false, output: "outputs/youtube-playlist-image-audit-state-merge.json" };
  for (const arg of argv) {
    if (arg.startsWith("--audit-report=")) options.auditReport = arg.slice("--audit-report=".length);
    else if (arg.startsWith("--manifest=")) options.manifest = arg.slice("--manifest=".length);
    else if (arg.startsWith("--playlist-keys=")) options.playlistKeys = arg.slice("--playlist-keys=".length).split(",").map((value) => value.trim()).filter(Boolean);
    else if (arg === "--apply") options.apply = true;
    else if (arg.startsWith("--output=")) options.output = arg.slice("--output=".length);
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} not found: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function findPlaylist(registry, playlistKey) {
  return (registry.playlists || []).find((row) => (row.playlist_key || row.key) === playlistKey);
}

function isGitTracked(filePath) {
  return spawnSync("git", ["ls-files", "--error-unmatch", "--", filePath], { stdio: "ignore" }).status === 0;
}

function saveJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: node scripts/merge-youtube-playlist-image-audit-state.mjs --audit-report=<path> --manifest=<path> --playlist-keys=<key> [--apply]");
    return;
  }
  if (!options.auditReport || !options.manifest || !options.playlistKeys.length) throw new Error("--audit-report, --manifest and --playlist-keys are required");

  const audit = readJson(options.auditReport, "Audit report");
  const manifest = readJson(options.manifest, "Playlist image manifest");
  const auditDigest = sha256(options.auditReport);
  const manifestByKey = new Map((manifest.records || []).map((row) => [row.playlistKey, row]));
  const registries = new Map([[ORDINARY, readJson(ORDINARY, "Ordinary playlist registry")], [POLYGLOT, readJson(POLYGLOT, "Polyglot playlist registry")]]);
  const keySet = new Set(options.playlistKeys);
  const rows = (audit.rows || []).filter((row) => keySet.has(row.playlistKey));
  if (rows.length !== keySet.size) throw new Error("Requested playlist key is missing from audit report");

  const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), mode: options.apply ? "apply" : "plan", auditReport: options.auditReport, auditReportSha256: auditDigest, manifest: options.manifest, requestedPlaylistKeys: options.playlistKeys, results: [] };
  const changed = new Set();
  for (const row of rows) {
    if (row.state !== "installed") throw new Error(`Audit state for ${row.playlistKey} is ${row.state}, expected installed`);
    const image = (row.playlistImages || []).find((item) => item.playlistId === row.playlistId && item.id);
    if (!image) throw new Error(`Installed audit row has no image ID: ${row.playlistKey}`);
    const asset = manifestByKey.get(row.playlistKey);
    if (!asset || asset.playlistId !== row.playlistId || !asset.coverPath || !isGitTracked(asset.coverPath)) {
      throw new Error(`No exact Git-tracked manifest cover for ${row.playlistKey}`);
    }
    const references = row.registryRows?.length ? row.registryRows : [{ registryPath: row.registryPath, playlistKey: row.playlistKey }];
    for (const reference of references) {
      const registryPath = reference.registryPath || row.registryPath;
      const registry = registries.get(registryPath);
      if (!registry) throw new Error(`Unsupported registry path: ${registryPath}`);
      const entry = findPlaylist(registry, reference.playlistKey || row.playlistKey);
      if (!entry || entry.youtube_playlist_id !== row.playlistId) throw new Error(`Registry playlist mismatch for ${row.playlistKey}`);
      const existing = entry.playlistImage || null;
      if (existing?.imageId && existing.imageId !== image.id) throw new Error(`Conflicting durable image ID for ${row.playlistKey}`);
      const next = {
        status: "uploaded",
        uploadedAt: row.readbackAt,
        imageId: image.id,
        method: "audit_readback_after_accepted_insert",
        sourceManifest: options.manifest,
        sourceCoverPath: asset.coverPath,
        sourceCoverGitTracked: true,
        sourceAuditReport: options.auditReport,
        sourceAuditSha256: auditDigest,
        playlistImagesEndpoint: "playlistImages",
      };
      const unchanged = JSON.stringify(existing) === JSON.stringify(next) && entry.lastReadbackAt === row.readbackAt;
      report.results.push({ playlistKey: row.playlistKey, playlistId: row.playlistId, imageId: image.id, registryPath, status: unchanged ? "already_persisted" : "planned" });
      if (options.apply && !unchanged) {
        entry.playlistImage = next;
        entry.lastReadbackAt = row.readbackAt;
        changed.add(registryPath);
      }
    }
  }
  if (options.apply) for (const registryPath of changed) saveJson(registryPath, registries.get(registryPath));
  report.summary = { total: report.results.length, changedRegistries: [...changed].sort(), applied: options.apply };
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  saveJson(options.output, report);
  console.log(JSON.stringify({ output: options.output, summary: report.summary, results: report.results }, null, 2));
}

main();
