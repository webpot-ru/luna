#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  descriptionWithPlaylistIdentity,
  playlistIdentityMarker,
  resolvePlaylistDiscovery,
  validateResolvedPlaylistIdentities,
} from "./youtube-playlist-discovery.mjs";

const assignment = {
  key: "EN__NO__ordinary-vocabulary__a1-everyday",
  title: "Norwegian A1: Everyday Flashcards",
  description: "Learn Norwegian.",
};
const channel = {
  supportLang: "EN",
  youtubeChannelId: "channel-en",
  complete: true,
  playlists: [],
};

const absent = resolvePlaylistDiscovery({ assignment, registryEntry: null, discoveryChannel: channel });
assert.equal(absent.ready, true);
assert.equal(absent.state, "verified_absent");
assert.equal(absent.createAllowed, true);

const byTitle = resolvePlaylistDiscovery({
  assignment,
  registryEntry: { playlist_key: assignment.key, youtube_playlist_id: "" },
  discoveryChannel: {
    ...channel,
    playlists: [{ id: "PL-title", title: `  ${assignment.title.toUpperCase()}  `, description: "", youtubeChannelId: "channel-en", videoIds: [] }],
  },
});
assert.equal(byTitle.state, "resolved_existing");
assert.equal(byTitle.youtubePlaylistId, "PL-title");
assert.deepEqual(byTitle.matchEvidence, ["exact_deterministic_title"]);

const marker = playlistIdentityMarker(assignment.key);
const byMarker = resolvePlaylistDiscovery({
  assignment,
  registryEntry: null,
  discoveryChannel: {
    ...channel,
    playlists: [{ id: "PL-marker", title: "Renamed", description: `Public copy\n\n${marker}`, youtubeChannelId: "channel-en", videoIds: [] }],
  },
});
assert.equal(byMarker.youtubePlaylistId, "PL-marker");
assert(byMarker.matchEvidence.includes("stable_key_marker"));

const bySourceVideo = resolvePlaylistDiscovery({
  assignment,
  registryEntry: { playlist_key: assignment.key, youtube_playlist_id: "", sourceVideoIds: ["video-1"] },
  discoveryChannel: {
    ...channel,
    playlists: [{ id: "PL-source", title: "Renamed", description: "", youtubeChannelId: "channel-en", videoIds: ["video-1"] }],
  },
});
assert.equal(bySourceVideo.youtubePlaylistId, "PL-source");
assert(bySourceVideo.matchEvidence.includes("known_source_video_membership"));

const durableMissing = resolvePlaylistDiscovery({
  assignment,
  registryEntry: { playlist_key: assignment.key, youtube_playlist_id: "PL-missing" },
  discoveryChannel: channel,
});
assert.equal(durableMissing.ready, false);
assert(durableMissing.blockers.some((row) => row.includes("absent from complete channel discovery")));

const ambiguous = resolvePlaylistDiscovery({
  assignment,
  registryEntry: null,
  discoveryChannel: {
    ...channel,
    playlists: [
      { id: "PL-one", title: assignment.title, description: "", youtubeChannelId: "channel-en", videoIds: [] },
      { id: "PL-two", title: assignment.title, description: marker, youtubeChannelId: "channel-en", videoIds: [] },
    ],
  },
});
assert.equal(ambiguous.ready, false);
assert(ambiguous.blockers.some((row) => row.includes("multiple live playlists")));

assert.equal(descriptionWithPlaylistIdentity("Description", assignment.key), `Description\n\n${marker}`);
assert.equal(descriptionWithPlaylistIdentity(`Description\n\n${marker}`, assignment.key), `Description\n\n${marker}`);
assert.equal(Array.from(descriptionWithPlaylistIdentity("x".repeat(6000), assignment.key)).length, 5000);
assert(descriptionWithPlaylistIdentity("x".repeat(6000), assignment.key).endsWith(marker));

assert.deepEqual(validateResolvedPlaylistIdentities([
  { playlist: { playlistKey: "key-a", youtubePlaylistId: "PL-shared" } },
  { playlist: { playlistKey: "key-b", youtubePlaylistId: "PL-shared" } },
]).length, 1);

console.log("youtube playlist discovery identity tests passed");
