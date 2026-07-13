#!/usr/bin/env node
import assert from "node:assert/strict";

import { selectCandidates } from "./youtube-upload-playlist-images.mjs";

const manifest = {
  records: [{
    playlistKey: "UZ__DE__ordinary-vocabulary__a1-everyday",
    channelKey: "uz",
    playlistId: "",
    coverPath: "data/future.jpg",
    uploadEligible: false,
    uploadBlocker: "missing_youtube_playlist_id",
  }, {
    playlistKey: "UZ__FR__ordinary-vocabulary__a1-everyday",
    channelKey: "uz",
    playlistId: "playlist-fr",
    coverPath: "data/current.jpg",
    uploadEligible: true,
    uploadBlocker: "",
  }, {
    playlistKey: "KA__DE__ordinary-vocabulary__a1-everyday",
    channelKey: "ka",
    playlistId: "playlist-ka",
    coverPath: "data/blocked.jpg",
    uploadBlocker: "custom_playlist_cover_not_allowed_for_channel",
  }],
};
const playlistRegistry = {
  playlists: [{
    playlist_key: "UZ__DE__ordinary-vocabulary__a1-everyday",
    youtube_playlist_id: "playlist-de",
  }, {
    playlist_key: "UZ__FR__ordinary-vocabulary__a1-everyday",
    youtube_playlist_id: "playlist-fr",
  }],
};

const selected = selectCandidates({
  manifest,
  supports: ["uz"],
  playlistKeys: [],
  limitPerChannel: 0,
  playlistRegistry,
  skipUploaded: false,
});
assert.equal(selected.length, 2);
assert.equal(selected[0].playlistId, "playlist-de");
assert.equal(selected[0].playlistIdSource, "durable_registry");

playlistRegistry.playlists[0].playlistImage = { status: "uploaded" };
const missingOnly = selectCandidates({
  manifest,
  supports: ["uz"],
  playlistKeys: [],
  limitPerChannel: 0,
  playlistRegistry,
  skipUploaded: true,
});
assert.deepEqual(missingOnly.map((row) => row.playlistKey), ["UZ__FR__ordinary-vocabulary__a1-everyday"]);

assert.throws(() => selectCandidates({
  manifest: { records: [{ ...manifest.records[1], playlistId: "stale-playlist-id" }] },
  supports: ["uz"],
  playlistKeys: [],
  limitPerChannel: 0,
  playlistRegistry,
  skipUploaded: false,
}), /Playlist id mismatch/);

console.log("youtube playlist image selection tests passed");
