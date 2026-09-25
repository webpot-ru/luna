#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MANIFEST_PATH, validateManifest } from "./youtube-migrate-playlist-membership.mjs";

const fail = (message) => { throw new Error(message); };

export function mergeReceipts({ manifest, receipts, ordinary, polyglot }) {
  const byVideo = new Map(manifest.rows.map((row) => [row.youtubeVideoId, row]));
  const seen = new Set();
  let updated = 0;
  for (const receipt of receipts) {
    const item = byVideo.get(receipt.youtubeVideoId);
    if (!item || receipt.migrationId !== manifest.id || receipt.route !== item.route || receipt.destinationPlaylistId !== item.destinationPlaylistId || receipt.destinationPlaylistKey !== item.destinationPlaylistKey || !receipt.playlistItemId || !receipt.verifiedAt) fail(`Invalid migration receipt for ${receipt.youtubeVideoId}.`);
    if (seen.has(receipt.youtubeVideoId)) fail(`Repeated migration receipt for ${receipt.youtubeVideoId}.`);
    seen.add(receipt.youtubeVideoId);
    const registry = item.destinationPlaylistKey.startsWith("POLYGLOT__") ? polyglot : ordinary;
    const rows = registry.publications.filter((row) => row.youtubeVideoId === item.youtubeVideoId && row.setId === item.setId && row.supportLang === item.supportLang && row.targetLang === item.targetLang);
    if (rows.length !== 1) fail(`Current durable video row changed for ${item.youtubeVideoId}.`);
    const row = rows[0];
    if (row.youtubePlaylistId && row.youtubePlaylistId !== item.destinationPlaylistId && !item.sourcePlaylistIds.includes(row.youtubePlaylistId)) fail(`Current playlist changed for ${item.youtubeVideoId}.`);
    if (row.playlist_key && row.playlist_key !== item.destinationPlaylistKey) fail(`Current playlist key changed for ${item.youtubeVideoId}.`);
    if (row.youtubePlaylistId === item.destinationPlaylistId && row.playlistItemId === receipt.playlistItemId) continue;
    const previous = [...new Set([...(row.playlistMembershipMigration?.previousPlaylistIds || []), ...(row.youtubePlaylistId ? [row.youtubePlaylistId] : []), ...item.sourcePlaylistIds])];
    row.playlistMembershipMigration = { migrationId: manifest.id, previousPlaylistIds: previous, previousPlaylistItemId: row.playlistItemId || "", verifiedAt: receipt.verifiedAt, githubRunId: receipt.githubRunId || "", inserted: receipt.inserted === true };
    row.playlist_key = item.destinationPlaylistKey;
    row.youtubePlaylistId = item.destinationPlaylistId;
    row.youtubePlaylistUrl = `https://www.youtube.com/playlist?list=${item.destinationPlaylistId}`;
    row.playlistItemId = receipt.playlistItemId;
    row.lastReadbackAt = receipt.verifiedAt;
    delete row.needsPlaylistInsert;
    updated += 1;
  }
  return { received: receipts.length, updated };
}

function main() {
  const directory = process.argv.find((arg) => arg.startsWith("--receipts-dir="))?.slice(15);
  if (!directory) fail("--receipts-dir required.");
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  validateManifest(manifest);
  const ordinaryPath = "config/youtube-published-videos.json";
  const polyglotPath = "config/youtube-polyglot-published-videos.json";
  const ordinary = JSON.parse(fs.readFileSync(ordinaryPath, "utf8"));
  const polyglot = JSON.parse(fs.readFileSync(polyglotPath, "utf8"));
  const files = fs.existsSync(directory) ? fs.readdirSync(directory).filter((file) => /^youtube-[134]\.jsonl$/.test(file)) : [];
  const receipts = files.flatMap((file) => fs.readFileSync(path.join(directory, file), "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)));
  if (!receipts.length) fail("No verified membership receipts; no registry write.");
  const result = mergeReceipts({ manifest, receipts, ordinary, polyglot });
  if (result.updated) {
    fs.writeFileSync(ordinaryPath, `${JSON.stringify(ordinary, null, 2)}\n`);
    fs.writeFileSync(polyglotPath, `${JSON.stringify(polyglot, null, 2)}\n`);
  }
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) try { main(); } catch (error) { console.error(`::error::${error.message}`); process.exitCode = 1; }
