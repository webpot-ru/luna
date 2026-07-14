#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import { buildPublicationCampaign } from "./lib/youtube-publication-campaign.mjs";

function parseArgs(argv) {
  const options = {
    supports: "ALL",
    ordinaryPerChannel: 5,
    polyglotPerChannel: 1,
    minFutureMinutes: 90,
    maxSnapshotAgeMinutes: 30,
    output: "outputs/youtube-publication-campaign-plan.json",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--set" || arg.startsWith("--set=")) options.setId = value();
    else if (arg === "--supports" || arg.startsWith("--supports=")) options.supports = value();
    else if (arg === "--ordinary-per-channel" || arg.startsWith("--ordinary-per-channel=")) options.ordinaryPerChannel = Number(value());
    else if (arg === "--polyglot-per-channel" || arg.startsWith("--polyglot-per-channel=")) options.polyglotPerChannel = Number(value());
    else if (arg === "--start-date" || arg.startsWith("--start-date=")) options.startDate = value();
    else if (arg === "--min-future-minutes" || arg.startsWith("--min-future-minutes=")) options.minFutureMinutes = Number(value());
    else if (arg === "--max-snapshot-age-minutes" || arg.startsWith("--max-snapshot-age-minutes=")) options.maxSnapshotAgeMinutes = Number(value());
    else if (arg === "--snapshot" || arg.startsWith("--snapshot=")) options.snapshotPath = value();
    else if (arg === "--calendar" || arg.startsWith("--calendar=")) options.calendarPath = value();
    else if (arg === "--campaign-registry" || arg.startsWith("--campaign-registry=")) options.campaignRegistryPath = value();
    else if (arg === "--policy" || arg.startsWith("--policy=")) options.policyPath = value();
    else if (arg === "--routing" || arg.startsWith("--routing=")) options.routingPath = value();
    else if (arg === "--channels" || arg.startsWith("--channels=")) options.channelsPath = value();
    else if (arg === "--cover-registry" || arg.startsWith("--cover-registry=")) options.coverRegistryPath = value();
    else if (arg === "--ordinary-playlist-registry" || arg.startsWith("--ordinary-playlist-registry=")) options.ordinaryPlaylistRegistryPath = value();
    else if (arg === "--polyglot-playlist-registry" || arg.startsWith("--polyglot-playlist-registry=")) options.polyglotPlaylistRegistryPath = value();
    else if (arg === "--playlist-discovery" || arg.startsWith("--playlist-discovery=")) options.playlistDiscoveryPath = value();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
    else if (arg === "--require-apply-ready") options.requireApplyReady = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return "node scripts/plan-youtube-publication-campaign.mjs --set=<set_id> [--supports=ALL] [--ordinary-per-channel=5] [--polyglot-per-channel=1] [--start-date=YYYY-MM-DD]";
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return console.log(usage());
  if (!options.setId) throw new Error("--set is required");
  const manifest = buildPublicationCampaign(options);
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  if (options.json) console.log(JSON.stringify({ campaignId: manifest.campaignId, manifestHash: manifest.manifestHash, ...manifest.summary }, null, 2));
  else {
    console.log(`Campaign: ${manifest.campaignId}`);
    console.log(`Assignments: ${manifest.summary.assignmentCount} (${manifest.summary.ordinaryCount} ordinary + ${manifest.summary.polyglotCount} Polyglot)`);
    console.log(`Apply ready: ${manifest.summary.applyReady}`);
    console.log(`Blockers: ${manifest.summary.blockerCount}`);
    console.log(`Manifest: ${options.output}`);
  }
  if (options.requireApplyReady && !manifest.summary.applyReady) process.exitCode = 2;
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
