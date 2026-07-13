#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildPlaylistAssignment,
  findChannelForSupport,
  findPlaylistEntry,
  loadPlaylistRegistry,
  loadYoutubeChannels,
  savePlaylistRegistry,
  upsertPlannedPlaylist,
} from "./lib/youtube-playlists.mjs";
import { canonicalSupportCode, normalizeCode } from "./lib/youtube-publication-control.mjs";

function parseArgs(argv) {
  const options = {
    snapshot: "config/youtube-publication-snapshot.json",
    playlistRegistry: "config/youtube-playlists.json",
    channelConfig: "config/youtube-channels.json",
    supports: [],
    output: "outputs/youtube-playlist-registry-reconciliation.json",
    apply: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--snapshot" || arg.startsWith("--snapshot=")) options.snapshot = value();
    else if (arg === "--playlist-registry" || arg.startsWith("--playlist-registry=")) options.playlistRegistry = value();
    else if (arg === "--channel-config" || arg.startsWith("--channel-config=")) options.channelConfig = value();
    else if (arg === "--supports" || arg.startsWith("--supports=")) options.supports = value().split(",").map(canonicalSupportCode).filter(Boolean);
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing ${label}: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function buildReconciliation({ snapshot, playlistRegistry, channelRegistry, supports, now = new Date().toISOString() }) {
  const supportSet = new Set((supports || []).map(canonicalSupportCode).filter(Boolean));
  const grouped = new Map();
  for (const publication of (snapshot.decks || []).flatMap((deck) => deck.publications || [])) {
    if (publication.videoType !== "ordinary" || publication.liveReadbackPresent !== true) continue;
    const supportLang = canonicalSupportCode(publication.supportLang);
    const targetLang = normalizeCode(publication.targetLang);
    if (supportSet.size && !supportSet.has(supportLang)) continue;
    if (!supportLang || !targetLang || !publication.youtubeVideoId) continue;
    const key = `${supportLang}|${targetLang}`;
    const row = grouped.get(key) || { supportLang, targetLang, publications: [] };
    row.publications.push({
      setId: publication.setId,
      youtubeVideoId: publication.youtubeVideoId,
      youtubeVideoUrl: publication.youtubeVideoUrl,
    });
    grouped.set(key, row);
  }

  const nextRegistry = structuredClone(playlistRegistry);
  const channels = channelRegistry.channels || [];
  const rows = [];
  for (const item of [...grouped.values()].sort((a, b) => `${a.supportLang}|${a.targetLang}`.localeCompare(`${b.supportLang}|${b.targetLang}`))) {
    const assignment = buildPlaylistAssignment({
      setId: item.publications[0]?.setId || "",
      supportLang: item.supportLang,
      targetLang: item.targetLang,
      level: "A1",
    });
    const existing = findPlaylistEntry(nextRegistry, assignment.key);
    const channel = findChannelForSupport(channels, item.supportLang);
    const sourcePublications = [...new Map(item.publications.map((row) => [row.youtubeVideoId, row])).values()];
    if (existing) {
      rows.push({
        supportLang: item.supportLang,
        targetLang: item.targetLang,
        playlistKey: assignment.key,
        status: existing.youtube_playlist_id ? "existing_with_id" : "existing_missing_id",
        youtubePlaylistId: existing.youtube_playlist_id || "",
        sourcePublications,
      });
      continue;
    }
    const { entry } = upsertPlannedPlaylist(nextRegistry, assignment, channel || {});
    entry.status = "planned_registry_from_live_snapshot";
    entry.needsPlaylistDiscovery = true;
    entry.sourcePublicationSnapshot = snapshot.generatedAt || "";
    entry.sourceVideoIds = sourcePublications.map((row) => row.youtubeVideoId).sort();
    entry.createdAt = now;
    rows.push({
      supportLang: item.supportLang,
      targetLang: item.targetLang,
      playlistKey: assignment.key,
      status: "planned_add",
      youtubePlaylistId: "",
      sourcePublications,
    });
  }

  const plannedAdds = rows.filter((row) => row.status === "planned_add");
  return {
    nextRegistry,
    report: {
      schemaVersion: 1,
      generatedAt: now,
      mode: "local_playlist_registry_reconciliation",
      sourceSnapshotGeneratedAt: snapshot.generatedAt || "",
      supports: [...supportSet].sort(),
      policy: {
        youtubeWrites: 0,
        playlistCreates: 0,
        playlistItemWrites: 0,
        plannedRowsRequireLiveDiscoveryBeforeCreate: true,
      },
      summary: {
        assignmentCount: rows.length,
        existingWithIdCount: rows.filter((row) => row.status === "existing_with_id").length,
        existingMissingIdCount: rows.filter((row) => row.status === "existing_missing_id").length,
        plannedAddCount: plannedAdds.length,
      },
      plannedAdds,
      rows,
    },
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.supports.length) {
    console.log("Usage: node scripts/reconcile-youtube-playlist-registry-from-snapshot.mjs --supports=UZ,SI,KA [--apply]");
    process.exit(options.help ? 0 : 1);
  }
  const snapshot = readJson(options.snapshot, "publication snapshot");
  const playlistRegistry = loadPlaylistRegistry(options.playlistRegistry);
  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const { nextRegistry, report } = buildReconciliation({
    snapshot,
    playlistRegistry,
    channelRegistry,
    supports: options.supports,
  });
  report.apply = options.apply;
  if (options.apply) savePlaylistRegistry(nextRegistry, options.playlistRegistry);
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ apply: options.apply, output: options.output, summary: report.summary }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

export { buildReconciliation };
