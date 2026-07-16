#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_OUTPUT = "data/youtube-playlist-covers/youtube-playlist-cover-closeout-20260716/manifest.json";
const EXPECTED_ROUTES = ["youtube-1", "youtube-2", "youtube-3", "youtube-4"];
const EXPECTED_CHANNEL_KEYS = ["en", "ru", "es", "pt", "ja", "tr", "zh", "vi", "th", "sr", "my", "ne", "si", "uz", "ka", "sw"];

function parseArgs(argv) {
  const options = {
    auditDir: "",
    channelConfig: "config/youtube-channels.json",
    assetRoot: "data/youtube-playlist-covers",
    output: DEFAULT_OUTPUT,
    requireGitTracked: false,
    expectedRoutes: EXPECTED_ROUTES,
    expectedChannels: EXPECTED_CHANNEL_KEYS,
  };
  for (const arg of argv) {
    if (arg.startsWith("--audit-dir=")) options.auditDir = arg.slice("--audit-dir=".length);
    else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else if (arg.startsWith("--asset-root=")) options.assetRoot = arg.slice("--asset-root=".length);
    else if (arg.startsWith("--output=")) options.output = arg.slice("--output=".length);
    else if (arg.startsWith("--expected-routes=")) options.expectedRoutes = arg.slice("--expected-routes=".length).split(",").map((value) => value.trim()).filter(Boolean);
    else if (arg.startsWith("--expected-channels=")) options.expectedChannels = arg.slice("--expected-channels=".length).split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
    else if (arg === "--require-git-tracked") options.requireGitTracked = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function walk(root) {
  if (!root || !fs.existsSync(root)) return [];
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const filePath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walk(filePath));
    else files.push(filePath);
  }
  return files;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function isGitTracked(filePath) {
  return spawnSync("git", ["ls-files", "--error-unmatch", "--", filePath], {
    cwd: process.cwd(),
    stdio: "ignore",
  }).status === 0;
}

function loadAuditRows(auditDir) {
  const files = walk(auditDir).filter((filePath) => /^youtube-playlist-images-audit-.*\.json$/u.test(path.basename(filePath)));
  if (!files.length) throw new Error(`No playlist-image audit reports found under ${auditDir}`);
  const rows = [];
  const reports = [];
  for (const filePath of files.sort()) {
    const report = readJson(filePath);
    const relative = path.relative(process.cwd(), filePath) || filePath;
    reports.push({ file: relative, sha256: sha256(filePath), report });
    for (const row of report.rows || []) rows.push({ ...row, auditReport: relative });
  }
  return { rows, reports };
}

function materializeAuditEvidence(reports, outputDir) {
  const evidenceRoot = path.join(outputDir, "audit-evidence");
  const evidenceBySource = new Map();
  for (const report of reports) {
    const sourcePath = path.resolve(report.file);
    const destination = path.join(evidenceRoot, path.basename(report.file));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(sourcePath, destination);
    evidenceBySource.set(report.file, {
      file: path.relative(process.cwd(), destination) || destination,
      sha256: sha256(destination),
    });
  }
  return evidenceBySource;
}

function loadAssets(assetRoot, outputPath) {
  const manifests = walk(assetRoot)
    .filter((filePath) => path.basename(filePath) === "manifest.json")
    .filter((filePath) => path.resolve(filePath) !== path.resolve(outputPath));
  const byPlaylistKey = new Map();
  for (const manifestPath of manifests.sort()) {
    const manifest = readJson(manifestPath);
    for (const record of manifest.records || []) {
      if (!record.playlistKey || !record.coverPath || !fs.existsSync(record.coverPath)) continue;
      const asset = {
        ...record,
        assetManifest: path.relative(process.cwd(), manifestPath) || manifestPath,
        gitTracked: isGitTracked(record.coverPath),
      };
      const previous = byPlaylistKey.get(record.playlistKey);
      if (!previous || (!previous.gitTracked && asset.gitTracked)) byPlaylistKey.set(record.playlistKey, asset);
    }
  }
  return byPlaylistKey;
}

function channelSummary(container, channelKey, route) {
  return container[channelKey] ||= {
    channelKey,
    route,
    installed: 0,
    absent: 0,
    ready: 0,
    needsRender: 0,
    blockedCapability: 0,
    noPlaylistId: 0,
    unprovenOrError: 0,
  };
}

function routeSummary(container, route) {
  return container[route] ||= {
    route,
    ready: 0,
    channels: new Set(),
    estimatedApplyQuotaUnits: 0,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: node scripts/build-youtube-playlist-cover-closeout-manifest.mjs --audit-dir=<downloaded artifacts> [--expected-routes=youtube-2 --expected-channels=vi,th]");
    return;
  }
  if (!options.auditDir) throw new Error("--audit-dir is required");

  const { rows, reports } = loadAuditRows(options.auditDir);
  const outputDir = path.dirname(options.output);
  const auditEvidenceBySource = materializeAuditEvidence(reports, outputDir);
  const channels = readJson(options.channelConfig).channels || [];
  const channelByKey = new Map(channels.map((channel) => [channel.key, channel]));
  const assets = loadAssets(options.assetRoot, options.output);
  const records = [];
  const blocked = [];
  const installed = [];
  const keysToRender = [];
  const byChannel = {};
  const byRoute = {};
  const seenPhysical = new Set();

  for (const row of rows.sort((a, b) => `${a.route}:${a.channelKey}:${a.playlistId}:${a.playlistKey}`.localeCompare(`${b.route}:${b.channelKey}:${b.playlistId}:${b.playlistKey}`))) {
    const physicalKey = row.playlistId
      ? `${row.channelKey}:${row.playlistId}`
      : `${row.channelKey}:no-id:${row.registryPath}:${row.playlistKey}`;
    if (seenPhysical.has(physicalKey)) continue;
    seenPhysical.add(physicalKey);
    const channel = channelByKey.get(row.channelKey);
    const channelCounts = channelSummary(byChannel, row.channelKey, row.route);
    if (row.state === "installed") {
      channelCounts.installed += 1;
      installed.push({ ...row });
      continue;
    }
    if (row.state === "no_playlist_id") {
      channelCounts.noPlaylistId += 1;
      blocked.push({ ...row, blocker: "missing_confirmed_playlist_id" });
      continue;
    }
    if (row.state !== "absent") {
      channelCounts.unprovenOrError += 1;
      blocked.push({ ...row, blocker: row.state === "error" ? "audit_error" : "live_state_unproven" });
      continue;
    }

    channelCounts.absent += 1;
    if (channel?.playlistImageUploadAllowed !== true) {
      channelCounts.blockedCapability += 1;
      blocked.push({
        ...row,
        blocker: "playlist_image_upload_not_allowed_or_unproven",
        capability: {
          allowed: channel?.playlistImageUploadAllowed ?? null,
          proven: channel?.playlistImageUploadCapabilityProven === true,
          evidence: channel?.playlistImageUploadEvidence || "unproven",
        },
      });
      continue;
    }

    const asset = assets.get(row.playlistKey);
    if (!asset || (options.requireGitTracked && !asset.gitTracked)) {
      channelCounts.needsRender += 1;
      keysToRender.push(row.playlistKey);
      blocked.push({
        ...row,
        blocker: asset ? "cover_not_git_tracked" : "approved_cover_missing",
        candidateCoverPath: asset?.coverPath || "",
      });
      continue;
    }

    const record = {
      exactMissingOnly: true,
      auditState: "absent",
      auditReport: auditEvidenceBySource.get(row.auditReport)?.file || "",
      auditReportSha256: auditEvidenceBySource.get(row.auditReport)?.sha256 || "",
      route: row.route,
      channelKey: row.channelKey,
      channelId: channel.channelId,
      supportLang: row.supportLang,
      videoType: row.videoType,
      playlistKey: row.playlistKey,
      playlistId: row.playlistId,
      registryPath: row.registryPath,
      registryRows: row.registryRows,
      title: row.title,
      coverPath: asset.coverPath,
      assetManifest: asset.assetManifest,
      coverGitTracked: asset.gitTracked,
      capability: {
        allowed: true,
        proven: channel.playlistImageUploadCapabilityProven === true,
        evidence: channel.playlistImageUploadEvidence,
      },
    };
    records.push(record);
    channelCounts.ready += 1;
    const routeCounts = routeSummary(byRoute, row.route);
    routeCounts.ready += 1;
    routeCounts.channels.add(row.channelKey);
  }

  const routeRows = Object.values(byRoute).map((row) => ({
    route: row.route,
    ready: row.ready,
    channels: [...row.channels].sort(),
    estimatedApplyQuotaUnits: row.ready * 53 + row.channels.size,
  })).sort((a, b) => a.route.localeCompare(b.route));
  const reportProblems = reports.filter(({ report }) => !report.completedAt || report.summary?.errors || report.summary?.unproven);
  const observedRoutes = new Set(rows.map((row) => row.route).filter(Boolean));
  const observedChannels = new Set(rows.map((row) => row.channelKey).filter(Boolean));
  const missingRoutes = options.expectedRoutes.filter((route) => !observedRoutes.has(route));
  const missingChannels = options.expectedChannels.filter((key) => !observedChannels.has(key));
  const keysPath = path.join(outputDir, "playlist-keys-to-render.txt");
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: "exact_missing_only_playlist_images",
    scope: {
      expectedRoutes: options.expectedRoutes,
      expectedChannels: options.expectedChannels,
    },
    auditReports: reports.map(({ file }) => auditEvidenceBySource.get(file)),
    auditComplete: reportProblems.length === 0 && missingRoutes.length === 0 && missingChannels.length === 0,
    missingRoutes,
    missingChannels,
    auditProblems: reportProblems.map(({ file, report }) => ({
      file,
      completedAt: report.completedAt || "",
      errors: report.summary?.errors || 0,
      unproven: report.summary?.unproven || 0,
    })),
    summary: {
      physicalRows: seenPhysical.size,
      installed: installed.length,
      ready: records.length,
      blocked: blocked.length,
      needsRender: [...new Set(keysToRender)].length,
      byChannel: Object.values(byChannel).sort((a, b) => a.channelKey.localeCompare(b.channelKey)),
      byRoute: routeRows,
      estimatedApplyQuotaUnits: routeRows.reduce((sum, row) => sum + row.estimatedApplyQuotaUnits, 0),
      youtubeWritesPlanned: records.length,
    },
    records,
    blocked,
    installed,
  };
  writeText(options.output, `${JSON.stringify(manifest, null, 2)}\n`);
  writeText(keysPath, `${[...new Set(keysToRender)].sort().join("\n")}${keysToRender.length ? "\n" : ""}`);
  console.log(JSON.stringify({ output: options.output, keysToRender: keysPath, summary: manifest.summary, auditComplete: manifest.auditComplete }, null, 2));
}

main();
