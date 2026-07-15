#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { checkScheduledPlaylistVisibility } from "./check-youtube-scheduled-playlist-visibility.mjs";
import { buildPlaylistAssignment } from "./lib/youtube-playlists.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "youtube-playlist-visibility-"));
const write = (name, value) => {
  const filePath = path.join(root, name);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return filePath;
};

const setId = "home_kitchen_cooking_actions_a1_a2";
const publicAssignment = buildPlaylistAssignment({ setId, supportLang: "EN", targetLang: "DE" });
const unlistedAssignment = buildPlaylistAssignment({ setId, supportLang: "EN", targetLang: "FR" });
const ordinaryRegistry = write("ordinary.json", {
  playlists: [
    { playlist_key: publicAssignment.key, youtube_playlist_id: "public-playlist" },
    { playlist_key: unlistedAssignment.key, youtube_playlist_id: "unlisted-playlist" },
  ],
});
const polyglotRegistry = write("polyglot.json", { playlists: [] });
const discovery = write("discovery.json", {
  complete: true,
  channels: [{
    supportLang: "EN",
    complete: true,
    youtubeChannelId: "channel-en",
    playlists: [
      { id: "public-playlist", title: publicAssignment.title, youtubeChannelId: "channel-en", privacyStatus: "public" },
      { id: "unlisted-playlist", title: unlistedAssignment.title, youtubeChannelId: "channel-en", privacyStatus: "unlisted" },
    ],
  }],
});

const publicReport = checkScheduledPlaylistVisibility({
  plan: write("public-plan.json", { candidate: { setId, supportLang: "EN", targetLang: "DE", videoType: "ordinary" } }),
  discovery,
  ordinaryRegistry,
  polyglotRegistry,
  requirePublic: true,
});
assert.equal(publicReport.summary.ready, true);
assert.equal(publicReport.summary.existingPublicPlaylistCount, 1);

const ordinaryTargets = checkScheduledPlaylistVisibility({
  generationTargets: write("targets.json", {
    setId,
    supports: [{ supportLang: "EN", shardSelectedTargets: ["DE", "FR"] }],
  }),
  discovery,
  ordinaryRegistry,
  polyglotRegistry,
  requirePublic: true,
});
assert.equal(ordinaryTargets.summary.ready, false);
assert.equal(ordinaryTargets.summary.candidateCount, 2);
assert.equal(ordinaryTargets.summary.blockers, 1);
assert.match(ordinaryTargets.blockers[0].message, /public playlist/);

console.log("youtube scheduled playlist visibility tests passed");
