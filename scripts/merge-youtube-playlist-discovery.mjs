#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertCanonicalSupportCount,
  loadCanonicalSupportRouting,
} from "./lib/youtube-support-routing.mjs";
import { canonicalSupportCode } from "./lib/youtube-publication-control.mjs";

function parseArgs(argv) {
  const options = {
    input: ".control-artifacts",
    output: "outputs/youtube-playlist-discovery-snapshot.json",
    expectedRoutes: 4,
    supports: "ALL",
    routing: "config/youtube-api-project-routing.json",
    channels: "config/youtube-channels.json",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--input" || arg.startsWith("--input=")) options.input = value();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
    else if (arg === "--expected-routes" || arg.startsWith("--expected-routes=")) options.expectedRoutes = Number(value());
    else if (arg === "--supports" || arg.startsWith("--supports=")) options.supports = value();
    else if (arg === "--routing" || arg.startsWith("--routing=")) options.routing = value();
    else if (arg === "--channels" || arg.startsWith("--channels=")) options.channels = value();
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function findReports(root) {
  const files = [];
  const visit = (directory, depth) => {
    if (!fs.existsSync(directory) || depth > 6) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(filePath, depth + 1);
      else if (entry.isFile() && /^youtube-playlist-discovery-youtube-\d+\.json$/u.test(entry.name)) files.push(filePath);
    }
  };
  visit(path.resolve(root), 0);
  return files.sort();
}

function resolveExpectedSupports(routing, requested = "ALL") {
  const allSupports = [...routing.supportToChannel.keys()].sort();
  if (!requested || String(requested).trim().toUpperCase() === "ALL") return allSupports;
  const supports = [...new Set(String(requested)
    .split(",")
    .map((value) => canonicalSupportCode(value))
    .filter(Boolean))]
    .sort();
  const unknown = supports.filter((support) => !routing.supportToChannel.has(support));
  if (unknown.length) throw new Error(`Unknown canonical support(s): ${unknown.join(",")}`);
  return supports;
}

export function mergePlaylistDiscoveryReports({ reports, routing, expectedRoutes = 4, expectedSupports, generatedAt = new Date().toISOString() }) {
  const blockers = [];
  const routeKeys = reports.map((row) => row.routeKey).filter(Boolean);
  if (reports.length !== expectedRoutes) blockers.push(`route report count ${reports.length} != ${expectedRoutes}`);
  if (new Set(routeKeys).size !== routeKeys.length) blockers.push("duplicate route reports");
  for (const report of reports) if (report.complete !== true) blockers.push(`${report.routeKey || "unknown"}: route playlist discovery is incomplete`);

  const requiredSupports = expectedSupports?.length
    ? [...new Set(expectedSupports.map((value) => canonicalSupportCode(value)).filter(Boolean))].sort()
    : [...routing.supportToChannel.keys()].sort();
  const channels = reports.flatMap((report) => (report.channels || []).map((channel) => ({ ...channel, routeKey: report.routeKey })))
    .sort((left, right) => canonicalSupportCode(left.supportLang).localeCompare(canonicalSupportCode(right.supportLang)));
  const actualSupports = channels.map((row) => canonicalSupportCode(row.supportLang)).filter(Boolean);
  const duplicateSupports = [...new Set(actualSupports.filter((support, index) => actualSupports.indexOf(support) !== index))];
  if (duplicateSupports.length) blockers.push(`duplicate support discoveries: ${duplicateSupports.join(",")}`);
  const missingSupports = requiredSupports.filter((support) => !actualSupports.includes(support));
  const unexpectedSupports = actualSupports.filter((support) => !requiredSupports.includes(support));
  if (missingSupports.length) blockers.push(`missing support discoveries: ${missingSupports.join(",")}`);
  if (unexpectedSupports.length) blockers.push(`unexpected support discoveries: ${unexpectedSupports.join(",")}`);

  for (const channel of channels) {
    const support = canonicalSupportCode(channel.supportLang);
    const expectedChannel = routing.supportToChannel.get(support);
    const expectedRoute = routing.supportToRoute.get(support);
    if (!expectedChannel || channel.youtubeChannelId !== expectedChannel.channelId) {
      blockers.push(`${support}: discovered channel ID mismatch`);
    }
    if (!expectedRoute || channel.routeKey !== expectedRoute.key) blockers.push(`${support}: discovered route mismatch`);
    if (channel.complete !== true) blockers.push(`${support}: channel playlist discovery is incomplete`);
  }

  return {
    schemaVersion: 1,
    generatedAt,
    mode: "youtube_playlist_discovery_snapshot",
    complete: blockers.length === 0,
    summary: {
      complete: blockers.length === 0,
      blockerCount: blockers.length,
      routeCount: new Set(routeKeys).size,
      expectedSupportCount: requiredSupports.length,
      supportCount: new Set(actualSupports).size,
      playlistCount: channels.reduce((total, row) => total + (row.playlists || []).length, 0),
      youtubeReadCalls: reports.reduce((total, row) => total + Number(row.summary?.youtubeReadCalls || 0), 0),
      youtubeWrites: 0,
    },
    blockers,
    routes: reports.map((row) => ({
      routeKey: row.routeKey,
      generatedAt: row.generatedAt,
      complete: row.complete,
      summary: row.summary,
    })).sort((left, right) => left.routeKey.localeCompare(right.routeKey)),
    channels,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("node scripts/merge-youtube-playlist-discovery.mjs --input=.control-artifacts --expected-routes=4");
    return;
  }
  const routing = loadCanonicalSupportRouting({ routingPath: options.routing, channelsPath: options.channels });
  assertCanonicalSupportCount(routing, 51);
  const files = findReports(options.input);
  const reports = files.map((filePath) => JSON.parse(fs.readFileSync(filePath, "utf8")));
  const snapshot = mergePlaylistDiscoveryReports({
    reports,
    routing,
    expectedRoutes: options.expectedRoutes,
    expectedSupports: resolveExpectedSupports(routing, options.supports),
  });
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ output: options.output, ...snapshot.summary }, null, 2));
  if (!snapshot.complete) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
