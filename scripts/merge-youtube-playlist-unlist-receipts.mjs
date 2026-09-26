#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MANIFEST_PATH, validateManifest } from "./youtube-unlist-redundant-playlists.mjs";

const fail = (message) => { throw new Error(message); };
const LEDGER_PATH = "config/youtube-playlist-visibility-migrations.json";
const sameSet = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

export function mergeReceipts(manifest, receipts, ledger = { schemaVersion: 1, entries: [] }) {
  if (ledger.schemaVersion !== 1 || !Array.isArray(ledger.entries)) fail("Invalid visibility ledger.");
  const byId = new Map(manifest.rows.map((row) => [row.extraPlaylistId, row]));
  const seen = new Set();
  let updated = 0;
  for (const receipt of receipts) {
    const row = byId.get(receipt.extraPlaylistId);
    if (!row || seen.has(receipt.extraPlaylistId)) fail(`Unexpected/repeated receipt ${receipt.extraPlaylistId}.`);
    seen.add(receipt.extraPlaylistId);
    if (receipt.manifestId !== manifest.id || receipt.route !== row.route || receipt.channelKey !== row.channelKey
      || receipt.canonicalPlaylistId !== row.canonicalPlaylistId || receipt.privacyStatus !== "unlisted"
      || !receipt.verifiedAt || !sameSet(receipt.videoIds || [], row.videoIds)) fail(`Invalid unlist receipt ${receipt.extraPlaylistId}.`);
    const entry = { manifestId: manifest.id, sourceReadOnlyRunId: manifest.sourceReadOnlyRunId,
      route: row.route, channelKey: row.channelKey, youtubeChannelId: row.youtubeChannelId,
      extraPlaylistId: row.extraPlaylistId, canonicalPlaylistId: row.canonicalPlaylistId,
      previousPrivacyStatus: receipt.previousPrivacyStatus, privacyStatus: "unlisted",
      videoIds: row.videoIds, verifiedAt: receipt.verifiedAt, githubRunId: receipt.githubRunId || "" };
    const index = ledger.entries.findIndex((item) => item.extraPlaylistId === row.extraPlaylistId);
    if (index >= 0) {
      const existing = ledger.entries[index];
      if (existing.manifestId !== manifest.id || existing.canonicalPlaylistId !== row.canonicalPlaylistId) fail(`Conflicting durable visibility row ${row.extraPlaylistId}.`);
      if (Date.parse(existing.verifiedAt || "") >= Date.parse(entry.verifiedAt)) continue;
      ledger.entries[index] = entry;
    } else ledger.entries.push(entry);
    updated += 1;
  }
  ledger.entries.sort((a, b) => a.extraPlaylistId.localeCompare(b.extraPlaylistId));
  return { received: receipts.length, updated, durableCount: ledger.entries.filter((row) => row.manifestId === manifest.id && row.privacyStatus === "unlisted").length };
}

function main() {
  const dir = process.argv.find((arg) => arg.startsWith("--receipts-dir="))?.slice(15);
  if (!dir) fail("--receipts-dir required.");
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  validateManifest(manifest);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((file) => /^youtube-[1-4]\.jsonl$/.test(file)) : [];
  const receipts = files.flatMap((file) => fs.readFileSync(path.join(dir, file), "utf8").trim().split("\n").filter(Boolean).map(JSON.parse));
  if (!receipts.length) fail("No verified playlist visibility receipts; no ledger write.");
  const ledger = fs.existsSync(LEDGER_PATH) ? JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8")) : { schemaVersion: 1, entries: [] };
  const summary = mergeReceipts(manifest, receipts, ledger);
  fs.writeFileSync(LEDGER_PATH, `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(JSON.stringify(summary));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) try { main(); } catch (error) { console.error(`::error::${error.message}`); process.exitCode = 1; }
