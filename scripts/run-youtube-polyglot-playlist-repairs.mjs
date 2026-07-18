#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const DEFAULT_REGISTRY = "config/youtube-polyglot-published-videos.json";

function parseArgs(argv) {
  const options = { setId: "", supports: [], registry: DEFAULT_REGISTRY, apply: false, confirm: "", ledger: "outputs/youtube-polyglot-playlist-tail-repair-ledger.jsonl" };
  for (const arg of argv) {
    if (arg.startsWith("--set-id=")) options.setId = arg.slice("--set-id=".length);
    else if (arg.startsWith("--supports=")) options.supports = arg.slice("--supports=".length).split(",").map((value) => value.trim().toUpperCase()).filter(Boolean);
    else if (arg.startsWith("--publication-registry=")) options.registry = arg.slice("--publication-registry=".length);
    else if (arg.startsWith("--ledger=")) options.ledger = arg.slice("--ledger=".length);
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm-youtube-write") options.confirm = "APPLY_YOUTUBE_PLAYLIST_INSERT";
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function fail(message) { throw new Error(message); }

function pendingPolyglotRow(registry, setId, support) {
  const rows = (registry.publications || []).filter((row) => row.setId === setId
    && row.supportLang === support
    && row.youtubeVideoId
    && (row.videoType === "polyglot" || String(row.polyglotKey || "").startsWith("polyglot:"))
    && (row.needsPlaylistCreate || row.needsPlaylistInsert || !row.playlistItemId));
  if (rows.length !== 1) fail(`${support}: expected exactly one pending uploaded Polyglot playlist row, got ${rows.length}`);
  return rows[0];
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.setId || !options.supports.length) {
    console.log("Usage: node scripts/run-youtube-polyglot-playlist-repairs.mjs --set-id=<set> --supports=BG,NL [--apply --confirm-youtube-write]");
    return;
  }
  if (options.apply && options.confirm !== "APPLY_YOUTUBE_PLAYLIST_INSERT") fail("--apply requires --confirm-youtube-write");
  const registry = JSON.parse(fs.readFileSync(options.registry, "utf8"));
  const rows = [...new Map(options.supports.map((support) => [support, pendingPolyglotRow(registry, options.setId, support)])).values()];
  for (const row of rows) {
    const args = [
      "scripts/youtube-repair-playlist-insert.mjs",
      `--set-id=${options.setId}`,
      `--support=${row.supportLang}`,
      `--polyglot-key=${row.polyglotKey}`,
      "--playlist-registry=config/youtube-polyglot-playlists.json",
      `--publication-registry=${options.registry}`,
      `--ledger=${options.ledger}`,
    ];
    if (options.apply) args.push("--apply", "--confirm-youtube-write");
    const result = spawnSync(process.execPath, args, { stdio: "inherit" });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}

main();
