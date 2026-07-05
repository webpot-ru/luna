#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_CHANNEL_CONFIG_PATH,
  findChannelForSupport,
  loadYoutubeChannels,
  normalizeLanguageCode,
} from "./lib/youtube-playlists.mjs";
import {
  DEFAULT_PUBLICATION_REGISTRY_PATH,
  loadPublicationRegistry,
  savePublicationRegistry,
} from "./lib/youtube-publication-registry.mjs";

function parseArgs(argv) {
  const options = {
    supportLang: "",
    route: "",
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    apply: false,
    confirmYoutubeWrite: false,
  };

  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm-youtube-write") options.confirmYoutubeWrite = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--support=")) options.supportLang = arg.slice("--support=".length).toUpperCase();
    else if (arg.startsWith("--route=")) options.route = arg.slice("--route=".length);
    else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else if (arg.startsWith("--publication-registry=")) options.publicationRegistry = arg.slice("--publication-registry=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/youtube-delete-duplicate-videos.mjs [--support=VI] [--route=youtube-2]",
    "",
    "Dry-run is default. Live deletion requires:",
    "  --apply --confirm-youtube-write",
  ].join("\n");
}

function loadOAuthClient(clientFile) {
  if (!fs.existsSync(clientFile)) {
    throw new Error(`OAuth client file not found: ${clientFile}`);
  }
  const json = JSON.parse(fs.readFileSync(clientFile, "utf8"));
  const client = json.installed || json.web || json;
  return {
    clientId: client.client_id,
    clientSecret: client.client_secret,
    tokenUri: client.token_uri || "https://oauth2.googleapis.com/token",
  };
}

function tokenFileFor(channelRegistry, channel) {
  const defaults = channelRegistry.defaults || {};
  if (channel.oauthTokenFile) return channel.oauthTokenFile;
  return path.join(defaults.tokenDir || ".local/youtube-oauth/tokens", `${channel.key}.json`);
}

async function getAccessToken({ clientFile, tokenFile }) {
  const client = loadOAuthClient(clientFile);
  if (!fs.existsSync(tokenFile)) {
    throw new Error(`OAuth token file not found: ${tokenFile}`);
  }
  const token = JSON.parse(fs.readFileSync(tokenFile, "utf8"));
  if (token.access_token && Number(token.expires_at || 0) > Date.now() + 60_000) return token.access_token;
  if (!token.refresh_token) throw new Error(`OAuth token file has no refresh_token: ${tokenFile}`);

  const body = new URLSearchParams({
    client_id: client.clientId,
    client_secret: client.clientSecret,
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
  });
  const response = await fetch(client.tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(`OAuth token refresh failed (${response.status}): ${await response.text()}`);
  const refreshed = await response.json();
  const nextToken = {
    ...token,
    ...refreshed,
    refresh_token: refreshed.refresh_token || token.refresh_token,
    expires_at: Date.now() + (Number(refreshed.expires_in || 3600) - 60) * 1000,
  };
  fs.writeFileSync(tokenFile, `${JSON.stringify(nextToken, null, 2)}\n`, "utf8");
  return nextToken.access_token;
}

async function deleteVideo(accessToken, videoId) {
  const url = new URL(`videos?id=${videoId}`, "https://www.googleapis.com/youtube/v3/");
  const response = await fetch(url, {
    method: "DELETE",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 404) {
    console.log(`Video ${videoId} already deleted / not found on YouTube (404).`);
    return true;
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`YouTube API DELETE failed (${response.status}): ${text}`);
  }
  return true;
}

function assignmentKey(row = {}) {
  return [
    row.setId || "",
    normalizeLanguageCode(row.supportLang),
    normalizeLanguageCode(row.targetLang),
  ].join("|");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  if (options.apply && !options.confirmYoutubeWrite) {
    console.error("Error: --apply requires --confirm-youtube-write");
    process.exit(1);
  }

  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const publicationRegistry = loadPublicationRegistry(options.publicationRegistry);
  const routing = JSON.parse(fs.readFileSync("config/youtube-api-project-routing.json", "utf8"));

  const active = publicationRegistry.publications.filter(r => {
    const s = (r.publicationStatus || r.status || '').toLowerCase();
    return r.youtubeVideoId && !s.includes('superseded') && !s.includes('deleted') && !s.includes('failed');
  });

  // Find duplicates
  const byKey = new Map();
  for (const row of active) {
    const key = assignmentKey(row);
    const rows = byKey.get(key) || [];
    rows.push(row);
    byKey.set(key, rows);
  }

  const dupes = [...byKey.entries()].filter(([, rows]) => rows.length > 1);
  const candidates = [];

  for (const [key, rows] of dupes) {
    const sorted = rows.slice().sort((a, b) => {
      const aLive = (a.publicationStatus||'').includes('live_youtube_upload_detected') ? 1 : 0;
      const bLive = (b.publicationStatus||'').includes('live_youtube_upload_detected') ? 1 : 0;
      if (aLive !== bLive) return aLive - bLive;
      const aHasDate = (a.publishAt || a.scheduledPublishAt) ? 0 : 1;
      const bHasDate = (b.publishAt || b.scheduledPublishAt) ? 0 : 1;
      if (aHasDate !== bHasDate) return aHasDate - bHasDate;
      return String(b.uploadedAt || b.lastReadbackAt || '').localeCompare(String(a.uploadedAt || a.lastReadbackAt || ''));
    });

    const [keep, ...del] = sorted;
    
    // Find channel and route
    const channel = findChannelForSupport(channelRegistry.channels, keep.supportLang);
    let route = "";
    if (channel) {
      for (const r of routing.projects) {
        if ((r.supportChannelKeys || []).includes(channel.key)) {
          route = r.key;
          break;
        }
      }
    }

    // Apply filters
    if (options.supportLang && normalizeLanguageCode(keep.supportLang) !== options.supportLang) continue;
    if (options.route && route !== options.route) continue;

    candidates.push({
      key,
      channel,
      route,
      keep,
      del,
    });
  }

  console.log(`Found ${candidates.length} duplicate groups to process (with ${candidates.reduce((sum, c) => sum + c.del.length, 0)} videos to delete).`);

  if (!options.apply) {
    console.log("\nDRY-RUN MODE (No deletions will be performed). Run with --apply --confirm-youtube-write to perform deletions.");
    for (const c of candidates) {
      console.log(`Group: ${c.key} (Route: ${c.route}, Channel: ${c.channel?.key || 'unknown'})`);
      console.log(`  KEEP: ${c.keep.youtubeVideoId} | Title: ${c.keep.title}`);
      for (const d of c.del) {
        console.log(`  DELETE: ${d.youtubeVideoId} | Title: ${d.title} | Status: ${d.publicationStatus}`);
      }
    }
    return;
  }

  // Deletion logic
  console.log("\nSTARTING LIVE DELETIONS...");
  const clientFile = channelRegistry.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json";
  let processedCount = 0;
  let errorCount = 0;

  for (const c of candidates) {
    if (!c.channel) {
      console.error(`Skipping group ${c.key} because channel config is missing.`);
      errorCount++;
      continue;
    }

    const tokenFile = tokenFileFor(channelRegistry, c.channel);
    if (!fs.existsSync(tokenFile)) {
      console.error(`Skipping group ${c.key} because token file is missing locally: ${tokenFile}`);
      errorCount++;
      continue;
    }

    let accessToken;
    try {
      accessToken = await getAccessToken({ clientFile, tokenFile });
    } catch (e) {
      console.error(`Skipping group ${c.key} because token refresh failed: ${e.message}`);
      errorCount++;
      continue;
    }

    for (const d of c.del) {
      console.log(`Deleting video ${d.youtubeVideoId} for ${c.key}...`);
      try {
        await deleteVideo(accessToken, d.youtubeVideoId);
        
        // Find the exact row in publication registry and mark it as deleted
        const registryRow = publicationRegistry.publications.find(
          p => p.youtubeVideoId === d.youtubeVideoId && p.setId === d.setId
        );
        if (registryRow) {
          registryRow.publicationStatus = "deleted_duplicate";
          registryRow.deletedAt = new Date().toISOString();
        }
        processedCount++;
      } catch (e) {
        console.error(`Failed to delete video ${d.youtubeVideoId}: ${e.message}`);
        errorCount++;
      }
    }
  }

  // Save updated registry
  if (processedCount > 0) {
    savePublicationRegistry(publicationRegistry, options.publicationRegistry);
    console.log(`Saved updated publication registry to ${options.publicationRegistry}`);
  }

  console.log(`Deletion summary: successfully processed ${processedCount} videos, encountered ${errorCount} errors.`);
}

main().catch(err => {
  console.error("Critical error:", err);
  process.exit(1);
});
