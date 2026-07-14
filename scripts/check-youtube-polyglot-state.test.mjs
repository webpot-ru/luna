#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-polyglot-state-check-"));
const publication = {
  videoType: "polyglot",
  setId: "deck",
  supportLang: "EN",
  youtubeVideoId: "video",
  youtubePlaylistId: "playlist",
  playlist_key: "POLYGLOT__EN__DECK__BUNDLE",
  polyglotKey: "polyglot:deck:EN:bundle:hash:full",
  bundleKey: "bundle",
  targetLangs: ["FR", "DE", "IT"],
  targetLangsCsv: "FR,DE,IT",
  targetLangsHash: "hash",
  publicationStatus: "scheduled_uploaded",
};
const files = {
  publications: path.join(root, "publications.json"),
  playlists: path.join(root, "playlists.json"),
  progress: path.join(root, "progress.json"),
};
fs.writeFileSync(files.publications, JSON.stringify({ publications: [publication] }));
fs.writeFileSync(files.playlists, JSON.stringify({ playlists: [{ ...publication, youtube_playlist_id: "playlist" }] }));
fs.writeFileSync(files.progress, JSON.stringify({ items: [{ ...publication }] }));

function run() {
  return spawnSync(process.execPath, [
    "scripts/check-youtube-polyglot-state.mjs",
    `--publications=${files.publications}`,
    `--playlists=${files.playlists}`,
    `--progress=${files.progress}`,
    "--json",
  ], { cwd: process.cwd(), encoding: "utf8" });
}

assert.equal(run().status, 0);
fs.writeFileSync(files.progress, JSON.stringify({ items: [] }));
const blocked = run();
assert.equal(blocked.status, 1);
assert.match(blocked.stdout, /missing progress item/u);
console.log("youtube Polyglot state checker tests passed");
