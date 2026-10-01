#!/usr/bin/env node
import assert from "node:assert/strict";

import { readOwnedPlaylists } from "./audit-youtube-playlists.mjs";

const originalFetch = globalThis.fetch;
try {
  let playlistMode = "normal";
  let retryItemCalls = 0;
  globalThis.fetch = async (url) => {
    const request = new URL(url);
    if (request.pathname === "/youtube/v3/playlists") {
      if (["transient-503", "persistent-503", "forbidden-403"].includes(playlistMode)) {
        return new Response(JSON.stringify({ items: [{ id: "PL-retry", snippet: { channelId: "channel-en" }, status: { privacyStatus: "public" } }] }), { status: 200 });
      }
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
      if (playlistMode === "empty-terminal-repeat") {
        return new Response(JSON.stringify({
          items: [{ id: "PL-empty-terminal-repeat", snippet: { title: "Empty terminal repeat", description: "", channelId: "channel-en" }, status: { privacyStatus: "public" } }],
        }), { status: 200 });
      }
      if (playlistMode === "rss-recovery" || playlistMode === "rss-incomplete") {
        return new Response(JSON.stringify({
          items: [{ id: "PL-rss", snippet: { title: "Owned public", channelId: "channel-en" }, status: { privacyStatus: "public" }, contentDetails: { itemCount: playlistMode === "rss-recovery" ? 2 : 3 } }],
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
      if (request.searchParams.get("playlistId") === "PL-retry") {
        retryItemCalls += 1;
        const status = playlistMode === "forbidden-403" ? 403 : 503;
        if (playlistMode !== "transient-503" || retryItemCalls === 1) {
          return new Response(JSON.stringify({ error: { code: status } }), { status });
        }
        return new Response(JSON.stringify({ items: [{ id: "retry-item", contentDetails: { videoId: "retry-video" } }] }), { status: 200 });
      }
      if (["PL-deleted", "PL-rss"].includes(request.searchParams.get("playlistId"))) {
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
      if (request.searchParams.get("playlistId") === "PL-empty-terminal-repeat") {
        const hasPageToken = Boolean(request.searchParams.get("pageToken"));
        return new Response(JSON.stringify(hasPageToken ? {
          nextPageToken: "empty-terminal-token",
          pageInfo: { totalResults: 2 },
          items: [],
        } : {
          nextPageToken: "empty-terminal-token",
          pageInfo: { totalResults: 2 },
          items: [{ id: "item-visible", contentDetails: { videoId: "video-visible" } }],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ items: [{ id: "item-live", contentDetails: { videoId: "video-live" } }] }), { status: 200 });
    }
    if (request.pathname === "/feeds/videos.xml") {
      return new Response('<feed><yt:playlistId>PL-rss</yt:playlistId><yt:channelId>channel-en</yt:channelId><yt:videoId>video-00001</yt:videoId><yt:videoId>video-00002</yt:videoId></feed>', { status: 200 });
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

  playlistMode = "rss-recovery";
  const rssReport = await readOwnedPlaylists({ accessToken: "test-token", expectedChannelId: "channel-en", maxPlaylistPages: 2, maxItemPages: 2 });
  assert.deepEqual(rssReport.disappearedPlaylistIds, []);
  assert.deepEqual(rssReport.playlists[0].videoIds, ["video-00001", "video-00002"]);
  assert.equal(rssReport.playlists[0].membershipSource, "verified_public_feed_after_api_404");
  assert.equal(rssReport.playlists[0].itemMembershipComplete, true);

  playlistMode = "rss-incomplete";
  const incompleteRssReport = await readOwnedPlaylists({ accessToken: "test-token", expectedChannelId: "channel-en", maxPlaylistPages: 2, maxItemPages: 2 });
  assert.deepEqual(incompleteRssReport.disappearedPlaylistIds, ["PL-rss"]);
  assert.deepEqual(incompleteRssReport.playlists, []);

  playlistMode = "empty-terminal-repeat";
  const emptyTerminalReport = await readOwnedPlaylists({
    accessToken: "test-token",
    expectedChannelId: "channel-en",
    maxPlaylistPages: 2,
    maxItemPages: 3,
  });
  assert.equal(emptyTerminalReport.paginationComplete, true);
  assert.equal(emptyTerminalReport.terminalEmptyPageRecoveryCount, 1);
  assert.equal(emptyTerminalReport.itemMembershipIncompletePlaylistCount, 1);
  assert.equal(emptyTerminalReport.playlists[0].terminalEmptyPageRecovered, true);
  assert.equal(emptyTerminalReport.playlists[0].itemMembershipComplete, false);
  assert.equal(emptyTerminalReport.playlists[0].itemPaginationComplete, false);
  assert.deepEqual(emptyTerminalReport.playlists[0].videoIds, ["video-visible"]);
  playlistMode = "transient-503";
  retryItemCalls = 0;
  const retried = await readOwnedPlaylists({ accessToken: "test-token", expectedChannelId: "channel-en", maxPlaylistPages: 2, maxItemPages: 2 });
  assert.equal(retryItemCalls, 2);
  assert.deepEqual(retried.playlists[0].videoIds, ["retry-video"]);
  playlistMode = "persistent-503";
  retryItemCalls = 0;
  await assert.rejects(() => readOwnedPlaylists({ accessToken: "test-token", expectedChannelId: "channel-en", maxPlaylistPages: 2, maxItemPages: 2 }), /playlistId=PL-retry failed \(503\) after 3 attempts/);
  assert.equal(retryItemCalls, 3);
  playlistMode = "forbidden-403";
  retryItemCalls = 0;
  await assert.rejects(() => readOwnedPlaylists({ accessToken: "test-token", expectedChannelId: "channel-en", maxPlaylistPages: 2, maxItemPages: 2 }), /failed \(403\) after 1 attempts/);
  assert.equal(retryItemCalls, 1);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("youtube playlist audit disappearance regression checks passed");
