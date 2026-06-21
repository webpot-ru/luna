#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_CHANNEL_CONFIG_PATH,
  loadYoutubeChannels,
} from "./lib/youtube-playlists.mjs";
import {
  DEFAULT_PUBLICATION_REGISTRY_PATH,
  loadPublicationRegistry,
} from "./lib/youtube-publication-registry.mjs";

const DEFAULT_POLICY_PATH = "config/youtube-publish-schedule-policy.json";

function parseArgs(argv) {
  const options = {
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    publicationRegistry: DEFAULT_PUBLICATION_REGISTRY_PATH,
    policy: DEFAULT_POLICY_PATH,
    output: "",
    ledger: "outputs/youtube-video-statistics-ledger.jsonl",
    asOf: new Date().toISOString(),
    dueOnly: true,
    fetch: false,
    confirmYoutubeRead: false,
    json: false,
  };

  for (const arg of argv) {
    if (arg === "--fetch") options.fetch = true;
    else if (arg === "--confirm-youtube-read") options.confirmYoutubeRead = true;
    else if (arg === "--include-pending") options.dueOnly = false;
    else if (arg === "--due-only") options.dueOnly = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else if (arg.startsWith("--publication-registry=")) options.publicationRegistry = arg.slice("--publication-registry=".length);
    else if (arg.startsWith("--policy=")) options.policy = arg.slice("--policy=".length);
    else if (arg.startsWith("--output=")) options.output = arg.slice("--output=".length);
    else if (arg.startsWith("--ledger=")) options.ledger = arg.slice("--ledger=".length);
    else if (arg.startsWith("--as-of=")) options.asOf = arg.slice("--as-of=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/read-youtube-video-statistics.mjs [--fetch --confirm-youtube-read]",
    "",
    "Default mode plans due statistics checkpoints without external API calls.",
    "",
    "Options:",
    "  --fetch                       Call YouTube Data API videos.list for due checkpoints.",
    "  --confirm-youtube-read         Required with --fetch.",
    "  --due-only                    Include only checkpoints due at --as-of. Default.",
    "  --include-pending             Include pending checkpoints in the report.",
    "  --as-of=<ISO>                 Evaluation timestamp. Defaults to now.",
    "  --output=<file>               Defaults to outputs/youtube-video-statistics-snapshots-<timestamp>.json.",
    "  --ledger=<file>               JSONL append path for fetched snapshots.",
    "  --json                        Print compact JSON summary.",
  ].join("\n");
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function activePublication(row) {
  if (!row?.youtubeVideoId) return false;
  const status = String(row.publicationStatus || row.status || "").toLowerCase();
  return !status.includes("failed") && !status.includes("deleted") && !status.includes("superseded");
}

function publishMoment(row) {
  return row.scheduledPublishAt || row.publishAt || row.publishedAt || row.uploadedAt || "";
}

function checkpointKey(row, hours) {
  return [
    row.setId,
    row.supportLang,
    row.targetLang,
    row.youtubeVideoId,
    `${hours}h`,
  ].join("|");
}

function loadOAuthClient(clientFile) {
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

function resolveExistingPath(filePath, label) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) throw new Error(`${label} not found: ${filePath}`);
  return resolved;
}

async function getAccessToken({ clientFile, tokenFile }) {
  const client = loadOAuthClient(clientFile);
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

async function youtubeJson({ accessToken, method, pathName, query = {} }) {
  const url = new URL(pathName, "https://www.googleapis.com/youtube/v3/");
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`YouTube API ${method} ${url.pathname} failed (${response.status}): ${await response.text()}`);
  return response.json();
}

function channelForRow(channels, row) {
  if (row.channelKey) {
    const channel = channels.find((item) => item.key === row.channelKey);
    if (channel) return channel;
  }
  if (row.youtubeChannelId) {
    const channel = channels.find((item) => item.channelId === row.youtubeChannelId);
    if (channel) return channel;
  }
  return null;
}

function checkpointRows({ registry, policy, asOf, dueOnly }) {
  const checkpoints = policy.default?.performanceCheckpointsHours || [24, 72, 168, 720];
  const asOfMillis = Date.parse(asOf);
  if (!Number.isFinite(asOfMillis)) throw new Error(`Invalid --as-of timestamp: ${asOf}`);
  const rows = [];
  for (const publication of registry.publications || []) {
    if (!activePublication(publication)) continue;
    const publishedAt = publishMoment(publication);
    if (!publishedAt || !Number.isFinite(Date.parse(publishedAt))) {
      rows.push({
        status: "missing_publish_time",
        checkpointKey: checkpointKey(publication, "unknown"),
        publication,
        checkpointHours: null,
        dueAt: "",
      });
      continue;
    }
    const publishedMillis = Date.parse(publishedAt);
    for (const hours of checkpoints) {
      const dueAt = new Date(publishedMillis + Number(hours) * 60 * 60 * 1000).toISOString();
      const due = Date.parse(dueAt) <= asOfMillis;
      if (dueOnly && !due) continue;
      rows.push({
        status: due ? "due" : "pending",
        checkpointKey: checkpointKey(publication, hours),
        publication,
        checkpointHours: Number(hours),
        publishedAt,
        dueAt,
      });
    }
  }
  return rows;
}

function appendLedger(ledgerPath, rows) {
  if (!rows.length) return;
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.appendFileSync(ledgerPath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

async function fetchSnapshot({ row, channelRegistry, channel }) {
  const clientFile = resolveExistingPath(channelRegistry.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json", "OAuth client");
  const tokenFile = resolveExistingPath(tokenFileFor(channelRegistry, channel), "OAuth token");
  const accessToken = await getAccessToken({ clientFile, tokenFile });
  const videoId = row.publication.youtubeVideoId;
  const response = await youtubeJson({
    accessToken,
    method: "GET",
    pathName: "videos",
    query: {
      part: "snippet,status,statistics",
      id: videoId,
      fields: "items(id,snippet(channelId,title,publishedAt),status(privacyStatus,uploadStatus,publishAt),statistics(viewCount,likeCount,commentCount,favoriteCount))",
    },
  });
  const item = response.items?.[0] || null;
  if (!item) {
    return {
      status: "readback_missing",
      error: "YouTube videos.list returned no items",
    };
  }
  const actualChannelId = item.snippet?.channelId || "";
  const expectedChannelId = row.publication.youtubeChannelId || channel.channelId || "";
  const mismatch = expectedChannelId && actualChannelId !== expectedChannelId;
  return {
    status: mismatch ? "channel_mismatch" : "readback_ok",
    video: item,
    error: mismatch ? `expected channel ${expectedChannelId}, got ${actualChannelId}` : "",
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (options.fetch && !options.confirmYoutubeRead) {
    throw new Error("--fetch requires --confirm-youtube-read.");
  }

  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const policy = fs.existsSync(options.policy)
    ? JSON.parse(fs.readFileSync(options.policy, "utf8"))
    : { default: { performanceCheckpointsHours: [24, 72, 168, 720] } };
  const registry = loadPublicationRegistry(options.publicationRegistry);
  const checkpoints = checkpointRows({
    registry,
    policy,
    asOf: options.asOf,
    dueOnly: options.dueOnly,
  });

  const rows = [];
  for (const checkpoint of checkpoints) {
    const publication = checkpoint.publication;
    const channel = channelForRow(channelRegistry.channels || [], publication);
    const base = {
      observedAt: new Date().toISOString(),
      checkpointKey: checkpoint.checkpointKey,
      checkpointStatus: checkpoint.status,
      checkpointHours: checkpoint.checkpointHours,
      dueAt: checkpoint.dueAt,
      setId: publication.setId,
      supportLang: publication.supportLang,
      targetLang: publication.targetLang,
      channelKey: publication.channelKey || channel?.key || "",
      youtubeChannelId: publication.youtubeChannelId || channel?.channelId || "",
      youtubeVideoId: publication.youtubeVideoId,
      youtubeVideoUrl: publication.youtubeVideoUrl || "",
      publishedAt: checkpoint.publishedAt || publishMoment(publication),
      publicationStatus: publication.publicationStatus || publication.status || "",
      privacyStatus: publication.privacyStatus || "",
      fetchMode: options.fetch,
    };
    if (!channel) {
      rows.push({
        ...base,
        status: "channel_not_configured",
        error: "No channel config found for publication row",
      });
      continue;
    }
    if (!options.fetch || checkpoint.status !== "due") {
      rows.push({
        ...base,
        status: checkpoint.status,
        error: "",
      });
      continue;
    }
    try {
      const snapshot = await fetchSnapshot({ row: checkpoint, channelRegistry, channel });
      const stats = snapshot.video?.statistics || {};
      rows.push({
        ...base,
        status: snapshot.status,
        error: snapshot.error,
        readback: snapshot.video ? {
          title: snapshot.video.snippet?.title || "",
          channelId: snapshot.video.snippet?.channelId || "",
          publishedAt: snapshot.video.snippet?.publishedAt || "",
          privacyStatus: snapshot.video.status?.privacyStatus || "",
          uploadStatus: snapshot.video.status?.uploadStatus || "",
          publishAt: snapshot.video.status?.publishAt || "",
          statistics: {
            viewCount: Number(stats.viewCount || 0),
            likeCount: Number(stats.likeCount || 0),
            commentCount: Number(stats.commentCount || 0),
            favoriteCount: Number(stats.favoriteCount || 0),
          },
        } : null,
      });
    } catch (error) {
      rows.push({
        ...base,
        status: "readback_failed",
        error: error.message,
      });
    }
  }

  const outputPath = options.output || path.join("outputs", `youtube-video-statistics-snapshots-${timestampSlug()}.json`);
  const report = {
    generatedAt: new Date().toISOString(),
    asOf: options.asOf,
    mode: options.fetch ? "youtube_data_api_statistics_readback" : "youtube_statistics_readback_plan",
    publicationRegistry: options.publicationRegistry,
    channelConfig: options.channelConfig,
    policy: options.policy,
    summary: {
      checkpointCount: rows.length,
      dueCount: rows.filter((row) => row.checkpointStatus === "due").length,
      fetchedCount: rows.filter((row) => row.status === "readback_ok" || row.status === "channel_mismatch" || row.status === "readback_missing").length,
      okCount: rows.filter((row) => row.status === "readback_ok").length,
      failedCount: rows.filter((row) => row.status === "readback_failed" || row.status === "channel_mismatch" || row.status === "channel_not_configured").length,
      missingCount: rows.filter((row) => row.status === "readback_missing").length,
      fetchMode: options.fetch,
      dueOnly: options.dueOnly,
    },
    rows,
    outputPath,
    ledgerPath: options.ledger,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (options.fetch) appendLedger(options.ledger, rows.filter((row) => row.status !== "pending"));

  if (options.json) console.log(JSON.stringify(report.summary, null, 2));
  else {
    console.log("YouTube video statistics readback");
    console.log(`Mode: ${report.mode}`);
    console.log(`Checkpoints: ${report.summary.checkpointCount}`);
    console.log(`Due: ${report.summary.dueCount}`);
    console.log(`Fetched: ${report.summary.fetchedCount}`);
    console.log(`OK: ${report.summary.okCount}`);
    console.log(`Failed: ${report.summary.failedCount}`);
    console.log(`Report: ${outputPath}`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
