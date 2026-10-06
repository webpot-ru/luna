#!/usr/bin/env node
import assert from "node:assert/strict";

import { selectCandidates, replacementEvidence, playlistImageAction } from "./youtube-upload-playlist-images.mjs";

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

const polyglotRegistryPath = "config/youtube-polyglot-playlists.json";
const polyglotRegistry = {
  playlists: [{
    playlist_key: "POLYGLOT__UZ__global-europe-core__test",
    youtube_playlist_id: "playlist-polyglot",
  }],
};
const polyglotSelected = selectCandidates({
  manifest: {
    records: [{
      playlistKey: "POLYGLOT__UZ__global-europe-core__test",
      channelKey: "uz",
      registryPath: polyglotRegistryPath,
      playlistId: "playlist-polyglot",
      coverPath: "data/polyglot.jpg",
    }],
  },
  supports: ["uz"],
  playlistKeys: [],
  limitPerChannel: 0,
  playlistRegistry,
  playlistRegistries: new Map([[polyglotRegistryPath, polyglotRegistry]]),
  skipUploaded: false,
});
assert.equal(polyglotSelected.length, 1);
assert.equal(polyglotSelected[0].registryPath, polyglotRegistryPath);
assert.equal(polyglotSelected[0].playlistIdSource, "durable_registry");

console.log("youtube playlist image selection tests passed");

const replacement = {channelKey:"en", playlistId:"playlist-one", expectedImageId:"image-old", sha256:"a".repeat(64), auditState:"installed", auditEvidenceType:"youtube_playlist_images_readback"};
const audit = {completedAt:new Date().toISOString(), mode:"read_only_playlist_images_audit", policy:{youtubeWrites:0,endpoint:"playlistImages.list"},rows:[{channelKey:"en",playlistId:"playlist-one",state:"installed",channelIdentityRead:true,playlistImages:[{id:"image-old",playlistId:"playlist-one",type:"hero"}]}]};
replacementEvidence(replacement,audit);
assert.equal(playlistImageAction({id:"image-old"}, replacement, true),"update");
assert.equal(playlistImageAction({id:"image-old"}, replacement, false),"existing_readback");
assert.equal(playlistImageAction(null,replacement,false),"insert");
assert.throws(()=>playlistImageAction(null,replacement,true),/disappeared/);
assert.throws(()=>playlistImageAction({id:"image-other"},replacement,true),/changed/);
assert.throws(()=>replacementEvidence({...replacement,sha256:""},audit),/SHA256/);
assert.throws(()=>replacementEvidence(replacement,{...audit,completedAt:"2020-01-01T00:00:00Z"}),/fresh/);
assert.throws(()=>replacementEvidence(replacement,{...audit,rows:[]}),/does not prove/);
assert.throws(()=>replacementEvidence(replacement,{...audit,rows:[{...audit.rows[0],channelIdentityRead:false}]}),/does not prove/);
console.log("Exact existing-image replacement gates passed");
