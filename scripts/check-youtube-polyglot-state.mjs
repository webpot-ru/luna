#!/usr/bin/env node
import fs from "node:fs";

const DEFAULT_PUBLICATIONS = "config/youtube-polyglot-published-videos.json";
const DEFAULT_PLAYLISTS = "config/youtube-polyglot-playlists.json";
const DEFAULT_PROGRESS = "config/youtube-polyglot-progress.json";

function parseArgs(argv) {
  const options = {
    publications: DEFAULT_PUBLICATIONS,
    playlists: DEFAULT_PLAYLISTS,
    progress: DEFAULT_PROGRESS,
    setId: "",
    bundle: "",
    json: false,
    help: false,
  };
  for (const arg of argv) {
    if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--publications=")) options.publications = arg.slice("--publications=".length);
    else if (arg.startsWith("--playlists=")) options.playlists = arg.slice("--playlists=".length);
    else if (arg.startsWith("--progress=")) options.progress = arg.slice("--progress=".length);
    else if (arg.startsWith("--set=")) options.setId = arg.slice("--set=".length);
    else if (arg.startsWith("--bundle=")) options.bundle = arg.slice("--bundle=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/check-youtube-polyglot-state.mjs [--set=<set_id>] [--bundle=<bundle_key>]",
    "",
    "Checks that Polyglot publication/progress/playlist state uses Polyglot keys",
    "and does not contain ordinary-video playlist identity.",
  ].join("\n");
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

function csvFromTargets(targetLangs) {
  return (targetLangs || []).map(normalizeCode).filter(Boolean).join(",");
}

function isActive(row) {
  if (!row?.youtubeVideoId) return false;
  const status = String(row.publicationStatus || row.status || "").toLowerCase();
  return !["failed", "deleted", "superseded", "cancel"].some((word) => status.includes(word));
}

function scoped(row, options) {
  if (options.setId && row.setId && row.setId !== options.setId) return false;
  if (options.bundle && row.bundleKey !== options.bundle) return false;
  return true;
}

function assertPolyglotIdentity({ row, label, blockers }) {
  const prefix = `${label} ${row.supportLang || "(missing support)"} ${row.youtubeVideoId || row.youtube_playlist_id || row.polyglotKey || row.playlist_key || ""}`.trim();
  if (row.videoType !== "polyglot") blockers.push(`${prefix}: videoType must be polyglot`);
  if (!String(row.polyglotKey || "").startsWith("polyglot:")) blockers.push(`${prefix}: missing valid polyglotKey`);
  if (!row.bundleKey) blockers.push(`${prefix}: missing bundleKey`);
  if (!Array.isArray(row.targetLangs) || row.targetLangs.length < 3 || row.targetLangs.length > 4) {
    blockers.push(`${prefix}: targetLangs must contain 3..4 languages`);
  }
  if (Array.isArray(row.targetLangs) && row.targetLangs.includes(normalizeCode(row.supportLang))) {
    blockers.push(`${prefix}: targetLangs includes supportLang`);
  }
  const csv = csvFromTargets(row.targetLangs);
  if (csv && row.targetLangsCsv && row.targetLangsCsv !== csv) {
    blockers.push(`${prefix}: targetLangsCsv mismatch; expected ${csv} got ${row.targetLangsCsv}`);
  }
  if (!row.targetLangsHash) blockers.push(`${prefix}: missing targetLangsHash`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const publications = readJson(options.publications, { publications: [] }).publications || [];
  const playlists = readJson(options.playlists, { playlists: [] }).playlists || [];
  const progressItems = readJson(options.progress, { items: [] }).items || [];
  const blockers = [];
  const warnings = [];

  const activePublications = publications.filter(isActive).filter((row) => scoped(row, options));
  const playlistByKey = new Map(playlists.map((row) => [row.playlist_key || row.key || "", row]));
  const progressByKey = new Map(progressItems.map((row) => [row.polyglotKey || "", row]));

  for (const row of activePublications) {
    assertPolyglotIdentity({ row, label: "publication", blockers });
    if (!String(row.playlist_key || "").startsWith("POLYGLOT__")) {
      blockers.push(`publication ${row.supportLang || ""} ${row.youtubeVideoId || ""}: playlist_key must start with POLYGLOT__`);
    }
    if (!row.targetLang && row.targetLangsCsv) warnings.push(`publication ${row.supportLang || ""} ${row.youtubeVideoId || ""}: targetLang is missing`);
    const playlist = playlistByKey.get(row.playlist_key || "");
    if (!playlist) blockers.push(`publication ${row.supportLang || ""} ${row.youtubeVideoId || ""}: missing playlist registry row ${row.playlist_key || "(missing key)"}`);
    else if (row.youtubePlaylistId && playlist.youtube_playlist_id !== row.youtubePlaylistId) {
      blockers.push(`publication ${row.supportLang || ""} ${row.youtubeVideoId || ""}: playlist id mismatch for ${row.playlist_key}`);
    }
    const progress = progressByKey.get(row.polyglotKey || "");
    if (!progress) blockers.push(`publication ${row.supportLang || ""} ${row.youtubeVideoId || ""}: missing progress item ${row.polyglotKey || "(missing key)"}`);
  }

  for (const row of playlists.filter((item) => scoped(item, options))) {
    if (!String(row.playlist_key || row.key || "").startsWith("POLYGLOT__")) {
      blockers.push(`playlist ${row.playlist_key || row.key || "(missing key)"}: Polyglot registry must not contain ordinary playlist keys`);
    }
    if (row.videoType !== "polyglot") blockers.push(`playlist ${row.playlist_key || row.key || "(missing key)"}: videoType must be polyglot`);
  }

  for (const row of progressItems.filter((item) => scoped(item, options))) {
    assertPolyglotIdentity({ row, label: "progress", blockers });
  }

  const report = {
    status: blockers.length ? "blocked" : "ok",
    publicationCount: activePublications.length,
    playlistCount: playlists.filter((item) => scoped(item, options)).length,
    progressCount: progressItems.filter((item) => scoped(item, options)).length,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    blockers,
    warnings,
  };

  if (options.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Polyglot state check: ${report.status}`);
    console.log(`publications=${report.publicationCount} playlists=${report.playlistCount} progress=${report.progressCount}`);
    if (blockers.length) console.log(`blockers=${blockers.join("; ")}`);
    if (warnings.length) console.log(`warnings=${warnings.join("; ")}`);
  }
  if (blockers.length) process.exit(1);
}

main();
