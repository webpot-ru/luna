#!/usr/bin/env node
import assert from "node:assert/strict";

import { buildReconciliation } from "./reconcile-youtube-playlist-registry-from-snapshot.mjs";

const snapshot = {
  generatedAt: "2026-07-13T10:00:00.000Z",
  decks: [{
    publications: [{
      videoType: "ordinary",
      setId: "deck1",
      supportLang: "UZ",
      targetLang: "DE",
      youtubeVideoId: "video-deck1",
      youtubeVideoUrl: "https://www.youtube.com/watch?v=video-deck1",
      liveReadbackPresent: true,
    }, {
      videoType: "ordinary",
      setId: "deck2",
      supportLang: "UZ",
      targetLang: "DE",
      youtubeVideoId: "video-deck2",
      youtubeVideoUrl: "https://www.youtube.com/watch?v=video-deck2",
      liveReadbackPresent: true,
    }, {
      videoType: "ordinary",
      setId: "deck1",
      supportLang: "UZ",
      targetLang: "FR",
      youtubeVideoId: "video-fr",
      liveReadbackPresent: true,
    }],
  }],
};
const playlistRegistry = {
  schemaVersion: 1,
  playlists: [{
    playlist_key: "UZ__FR__ordinary-vocabulary__a1-everyday",
    supportLang: "UZ",
    targetLang: "FR",
    youtube_playlist_id: "playlist-fr",
  }],
};
const channelRegistry = {
  channels: [{ key: "uz", supportLangs: ["UZ"], channelId: "channel-uz" }],
};

const { nextRegistry, report } = buildReconciliation({
  snapshot,
  playlistRegistry,
  channelRegistry,
  supports: ["UZ"],
  now: "2026-07-13T10:30:00.000Z",
});
assert.equal(report.summary.assignmentCount, 2);
assert.equal(report.summary.existingWithIdCount, 1);
assert.equal(report.summary.plannedAddCount, 1);
assert.deepEqual(report.plannedAdds[0].sourcePublications.map((row) => row.youtubeVideoId), ["video-deck1", "video-deck2"]);
const planned = nextRegistry.playlists.find((row) => row.targetLang === "DE");
assert.equal(planned.status, "planned_registry_from_live_snapshot");
assert.equal(planned.needsPlaylistDiscovery, true);
assert.deepEqual(planned.sourceVideoIds, ["video-deck1", "video-deck2"]);

console.log("youtube playlist registry reconciliation tests passed");
