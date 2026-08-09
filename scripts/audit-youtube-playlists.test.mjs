#!/usr/bin/env node
import assert from "node:assert/strict";

import { readOwnedPlaylists } from "./audit-youtube-playlists.mjs";

const originalFetch = globalThis.fetch;
try {
  let playlistMode = "normal";
  globalThis.fetch = async (url) => {
    const request = new URL(url);
    if (request.pathname === "/youtube/v3/playlists") {
      if (playlistMode === "loop") {
        return new Response(JSON.stringify({
          items: [{ id: "PL-loop", snippet: { title: "Loop", description: "", channelId: "channel-en" }, status: { privacyStatus: "public" } }],
        }), { status: 200 });
      }
      if (playlistMode === "terminal-repeat") {
        return new Response(JSON.stringify({
          items: [{ id: "PL-terminal-repeat", snippet: { title: "Terminal repeat", description: "", channelId: "channel-en" }, status: { privacyStatus: "public" } }],
        }), { status: 200 });
      }
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
      if (request.searchParams.get("playlistId") === "PL-loop") {
        return new Response(JSON.stringify({
          nextPageToken: "loop-token",
          pageInfo: { totalResults: 2 },
          items: [{ id: "item-loop", contentDetails: { videoId: "video-loop" } }],
        }), { status: 200 });
      }
      if (request.searchParams.get("playlistId") === "PL-terminal-repeat") {
        const hasPageToken = Boolean(request.searchParams.get("pageToken"));
        return new Response(JSON.stringify({
          nextPageToken: "terminal-token",
          pageInfo: { totalResults: 2 },
          items: [{
            id: hasPageToken ? "item-terminal-2" : "item-terminal-1",
            contentDetails: { videoId: hasPageToken ? "video-terminal-2" : "video-terminal-1" },
          }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ items: [{ id: "item-live", contentDetails: { videoId: "video-live" } }] }), { status: 200 });
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

  const selectedReport = await readOwnedPlaylists({
    accessToken: "test-token",
    expectedChannelId: "channel-en",
    maxPlaylistPages: 2,
    maxItemPages: 2,
    playlistIds: ["PL-live"],
  });
  assert.equal(selectedReport.scope, "selected_playlists");
  assert.deepEqual(selectedReport.selectedPlaylistIds, ["PL-live"]);
  assert.deepEqual(selectedReport.playlists.map((playlist) => playlist.id), ["PL-live"]);

  playlistMode = "loop";
  await assert.rejects(
    () => readOwnedPlaylists({
      accessToken: "test-token",
      expectedChannelId: "channel-en",
      maxPlaylistPages: 2,
      maxItemPages: 3,
    }),
    /pagination token repeated.*PL-loop/u,
  );

  playlistMode = "terminal-repeat";
  const terminalRepeatReport = await readOwnedPlaylists({
    accessToken: "test-token",
    expectedChannelId: "channel-en",
    maxPlaylistPages: 2,
    maxItemPages: 3,
  });
  assert.equal(terminalRepeatReport.paginationComplete, true);
  assert.equal(terminalRepeatReport.terminalRepeatedTokenRecoveryCount, 1);
  assert.equal(terminalRepeatReport.playlists[0].terminalRepeatedTokenRecovered, true);
  assert.equal(terminalRepeatReport.playlists[0].itemRowsRead, 2);
  assert.equal(terminalRepeatReport.playlists[0].uniquePlaylistItemCount, 2);
  assert.deepEqual(terminalRepeatReport.playlists[0].videoIds, ["video-terminal-1", "video-terminal-2"]);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("youtube playlist audit disappearance regression checks passed");
