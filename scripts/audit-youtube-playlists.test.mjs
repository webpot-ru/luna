#!/usr/bin/env node
import assert from "node:assert/strict";

import { readOwnedPlaylists } from "./audit-youtube-playlists.mjs";

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url) => {
    const request = new URL(url);
    if (request.pathname === "/youtube/v3/playlists") {
      return new Response(JSON.stringify({
        items: [
          { id: "PL-deleted", snippet: { title: "Gone", description: "", channelId: "channel-en" }, status: { privacyStatus: "public" } },
          { id: "PL-live", snippet: { title: "Live", description: "", channelId: "channel-en" }, status: { privacyStatus: "public" } },
        ],
      }), { status: 200 });
    }
    if (request.pathname === "/youtube/v3/playlistItems") {
      if (request.searchParams.get("playlistId") === "PL-deleted") {
        return new Response(JSON.stringify({ error: { code: 404, errors: [{ reason: "playlistNotFound" }] } }), { status: 404 });
      }
      return new Response(JSON.stringify({ items: [{ contentDetails: { videoId: "video-live" } }] }), { status: 200 });
    }
    throw new Error(`Unexpected YouTube request: ${request}`);
  };

  const report = await readOwnedPlaylists({
    accessToken: "test-token",
    expectedChannelId: "channel-en",
    maxPlaylistPages: 2,
    maxItemPages: 2,
  });
  assert.equal(report.paginationComplete, true);
  assert.deepEqual(report.disappearedPlaylistIds, ["PL-deleted"]);
  assert.deepEqual(report.playlists.map((playlist) => playlist.id), ["PL-live"]);
  assert.deepEqual(report.playlists[0].videoIds, ["video-live"]);
  assert.equal(report.itemPagesRead, 1);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("youtube playlist audit disappearance regression checks passed");
