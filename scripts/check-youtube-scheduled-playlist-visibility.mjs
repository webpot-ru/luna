#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildPolyglotPlaylistAssignment,
  findPolyglotPlaylistEntry,
} from "./lib/polyglot-youtube-playlists.mjs";
import {
  buildPlaylistAssignment,
  findPlaylistEntry,
} from "./lib/youtube-playlists.mjs";
import {
  findDiscoveryChannel,
  resolvePlaylistDiscovery,
} from "./lib/youtube-playlist-discovery.mjs";

function parseArgs(argv) {
  const options = {
    plan: "",
    generationTargets: "",
    discovery: "",
    ordinaryRegistry: "config/youtube-playlists.json",
    polyglotRegistry: "config/youtube-polyglot-playlists.json",
    output: "",
    requirePublic: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--plan" || arg.startsWith("--plan=")) options.plan = value();
    else if (arg === "--generation-targets" || arg.startsWith("--generation-targets=")) options.generationTargets = value();
    else if (arg === "--discovery" || arg.startsWith("--discovery=")) options.discovery = value();
    else if (arg === "--ordinary-registry" || arg.startsWith("--ordinary-registry=")) options.ordinaryRegistry = value();
    else if (arg === "--polyglot-registry" || arg.startsWith("--polyglot-registry=")) options.polyglotRegistry = value();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
    else if (arg === "--require-public") options.requirePublic = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath, label) {
  if (!filePath) throw new Error(`${label} path is required`);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read ${label} at ${filePath}: ${error.message}`);
  }
}

function candidateFromPlan(plan) {
  const candidate = plan?.candidate || plan?.assignment || plan;
  if (!candidate?.supportLang || !candidate?.setId) {
    throw new Error("plan must contain candidate.setId and candidate.supportLang");
  }
  return candidate;
}

function candidatesFromGenerationTargets(targetPlan) {
  const setId = String(targetPlan?.setId || "").trim();
  if (!setId) throw new Error("generation target plan must contain setId");
  const candidates = [];
  for (const supportPlan of targetPlan?.supports || []) {
    const supportLang = String(supportPlan?.supportLang || "").trim();
    const targetLangs = supportPlan?.shardSelectedTargets || [];
    if (!supportLang || !Array.isArray(targetLangs)) continue;
    for (const targetLang of targetLangs) {
      if (!String(targetLang || "").trim()) continue;
      candidates.push({
        setId,
        supportLang,
        targetLang: String(targetLang).trim(),
        videoType: "ordinary",
      });
    }
  }
  if (!candidates.length) throw new Error("generation target plan has no shard-selected ordinary candidates");
  return candidates;
}

function resolveCandidate({ candidate, discovery, ordinaryRegistry, polyglotRegistry, requirePublic }) {
  const polyglot = candidate.videoType === "polyglot" || Boolean(candidate.polyglotKey) || Boolean(candidate.bundleKey && candidate.targetLangs);
  const assignment = polyglot ? buildPolyglotPlaylistAssignment(candidate) : buildPlaylistAssignment(candidate);
  const registry = polyglot ? polyglotRegistry : ordinaryRegistry;
  const registryEntry = polyglot
    ? findPolyglotPlaylistEntry(registry, assignment.key)
    : findPlaylistEntry(registry, assignment.key);
  const resolved = resolvePlaylistDiscovery({
    assignment,
    registryEntry,
    discoveryChannel: findDiscoveryChannel(discovery, candidate.supportLang),
    requirePublic,
  });
  return {
    candidate: {
      setId: candidate.setId,
      supportLang: candidate.supportLang,
      videoType: polyglot ? "polyglot" : "ordinary",
      bundleKey: candidate.bundleKey || "",
      targetLang: candidate.targetLang || "",
      targetLangs: candidate.targetLangs || [],
    },
    playlist: resolved,
  };
}

export function checkScheduledPlaylistVisibility(options) {
  const discovery = readJson(options.discovery, "playlist discovery");
  const ordinaryRegistry = readJson(options.ordinaryRegistry, "ordinary playlist registry");
  const polyglotRegistry = readJson(options.polyglotRegistry, "Polyglot playlist registry");
  const candidates = options.generationTargets
    ? candidatesFromGenerationTargets(readJson(options.generationTargets, "generation target plan"))
    : [candidateFromPlan(readJson(options.plan, "publication plan"))];
  const items = candidates.map((candidate) => resolveCandidate({
    candidate,
    discovery,
    ordinaryRegistry,
    polyglotRegistry,
    requirePublic: options.requirePublic,
  }));
  const blockers = items.flatMap((item) => item.playlist.blockers.map((message) => ({
    supportLang: item.candidate.supportLang,
    targetLang: item.candidate.targetLang,
    bundleKey: item.candidate.bundleKey,
    message,
  })));
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: "youtube_scheduled_playlist_visibility_preflight",
    source: options.generationTargets ? "generation_targets" : "publication_plan",
    items,
    requirePublic: options.requirePublic,
    summary: {
      ready: blockers.length === 0,
      candidateCount: items.length,
      existingPublicPlaylistCount: items.filter((item) => item.playlist.state === "resolved_existing").length,
      createEligibleCount: items.filter((item) => item.playlist.state === "verified_absent").length,
      blockers: blockers.length,
      youtubeWrites: 0,
    },
    blockers,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || (!options.plan && !options.generationTargets) || !options.discovery || (options.plan && options.generationTargets)) {
    console.log("node scripts/check-youtube-scheduled-playlist-visibility.mjs (--plan=<plan.json>|--generation-targets=<targets.json>) --discovery=<live-playlists.json> --require-public --output=<report.json>");
    process.exit(options.help ? 0 : 1);
  }
  const report = checkScheduledPlaylistVisibility(options);
  if (options.output) {
    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report.summary, null, 2));
  if (!report.summary.ready) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
