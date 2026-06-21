#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_CHANNEL_CONFIG_PATH,
  DEFAULT_PLAYLIST_REGISTRY_PATH,
  buildPlaylistAssignment,
  findChannelForSupport,
  findPlaylistEntry,
  loadPlaylistRegistry,
  loadYoutubeChannels,
  savePlaylistRegistry,
  upsertPlannedPlaylist,
} from "./lib/youtube-playlists.mjs";

function parseArgs(argv) {
  const options = {
    metadata: "",
    video: "",
    thumbnail: "",
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    playlistRegistry: DEFAULT_PLAYLIST_REGISTRY_PATH,
    ledger: "outputs/youtube-publish-ledger.jsonl",
    apply: false,
    confirmYoutubeWrite: false,
    createPlaylist: false,
    privacyStatus: "",
    confirmPublic: false,
  };

  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    else if (arg === "--confirm-youtube-write") options.confirmYoutubeWrite = true;
    else if (arg === "--create-playlist") options.createPlaylist = true;
    else if (arg === "--confirm-public") options.confirmPublic = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--metadata=")) options.metadata = arg.slice("--metadata=".length);
    else if (arg.startsWith("--video=")) options.video = arg.slice("--video=".length);
    else if (arg.startsWith("--thumbnail=")) options.thumbnail = arg.slice("--thumbnail=".length);
    else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else if (arg.startsWith("--playlist-registry=")) options.playlistRegistry = arg.slice("--playlist-registry=".length);
    else if (arg.startsWith("--ledger=")) options.ledger = arg.slice("--ledger=".length);
    else if (arg.startsWith("--privacy=")) options.privacyStatus = arg.slice("--privacy=".length);
    else if (!options.metadata) options.metadata = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/youtube-publish-video.mjs --metadata=<youtube_metadata.json> [--video=<mp4>] [--thumbnail=<image>]",
    "",
    "Dry-run is default. Live write requires:",
    "  --apply --confirm-youtube-write",
    "",
    "Options:",
    "  --create-playlist         Create the playlist if registry has no youtube_playlist_id.",
    "  --privacy=private|unlisted|public",
    "  --confirm-public          Required if privacy=public.",
  ].join("\n");
}

function fail(message) {
  throw new Error(message);
}

function detectMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webm") return "video/webm";
  if (ext === ".mov") return "video/quicktime";
  return "video/mp4";
}

function resolveExistingPath(filePath, label) {
  if (!filePath) return "";
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) fail(`${label} not found: ${filePath}`);
  return resolved;
}

function defaultVideoPath(metadataFile, metadata) {
  const dir = path.dirname(metadataFile);
  const preferred = path.join(dir, `lesson_${String(metadata.targetLang || "").toLowerCase()}_${String(metadata.supportLang || "").toLowerCase()}.mp4`);
  if (fs.existsSync(preferred)) return preferred;
  const video = fs.readdirSync(dir)
    .filter((name) => [".mp4", ".mov", ".m4v", ".webm"].includes(path.extname(name).toLowerCase()))
    .sort()[0];
  return video ? path.join(dir, video) : "";
}

function defaultThumbnailPath(metadataFile, metadata) {
  const explicit = metadata.thumbnailPath || metadata.thumbnail || metadata.thumbnailFile;
  if (explicit && typeof explicit === "string" && fs.existsSync(explicit)) return path.resolve(explicit);
  const dir = path.dirname(metadataFile);
  const image = fs.readdirSync(dir)
    .filter((name) => [".jpg", ".jpeg", ".png", ".webp"].includes(path.extname(name).toLowerCase()))
    .filter((name) => /thumb|thumbnail|cover/i.test(name))
    .sort()[0];
  return image ? path.join(dir, image) : "";
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

async function getAccessToken({ clientFile, tokenFile }) {
  const client = loadOAuthClient(clientFile);
  const token = JSON.parse(fs.readFileSync(tokenFile, "utf8"));
  if (token.access_token && Number(token.expires_at || 0) > Date.now() + 60_000) return token.access_token;
  if (!token.refresh_token) fail(`OAuth token file has no refresh_token: ${tokenFile}`);

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
  if (!response.ok) fail(`OAuth token refresh failed (${response.status}): ${await response.text()}`);
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

async function youtubeJson({ accessToken, method, pathName, query = {}, body }) {
  const url = new URL(pathName, "https://www.googleapis.com/youtube/v3/");
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) fail(`YouTube API ${method} ${url.pathname} failed (${response.status}): ${await response.text()}`);
  if (response.status === 204) return null;
  return response.json();
}

async function youtubeMediaUpload({ accessToken, method = "POST", pathName, query = {}, filePath }) {
  const body = fs.readFileSync(filePath);
  const url = new URL(pathName, "https://www.googleapis.com/upload/youtube/v3/");
  for (const [key, value] of Object.entries({ uploadType: "media", ...query })) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": detectMimeType(filePath),
      "content-length": String(body.length),
    },
    body,
  });
  if (!response.ok) fail(`YouTube media upload ${url.pathname} failed (${response.status}): ${await response.text()}`);
  if (response.status === 204) return null;
  return response.json();
}

async function uploadVideoResumable({ accessToken, videoPath, metadata, privacyStatus }) {
  const stat = fs.statSync(videoPath);
  const initUrl = new URL("videos", "https://www.googleapis.com/upload/youtube/v3/");
  initUrl.searchParams.set("uploadType", "resumable");
  initUrl.searchParams.set("part", "snippet,status");
  initUrl.searchParams.set("fields", "id,snippet(title),status(privacyStatus,uploadStatus)");

  const resource = {
    snippet: {
      title: metadata.title,
      description: metadata.description,
      tags: Array.isArray(metadata.tags) ? metadata.tags : [],
      categoryId: String(metadata.categoryId || "27"),
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: false,
    },
  };

  const init = await fetch(initUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json; charset=UTF-8",
      "x-upload-content-type": detectMimeType(videoPath),
      "x-upload-content-length": String(stat.size),
    },
    body: JSON.stringify(resource),
  });
  if (!init.ok) fail(`YouTube videos.insert init failed (${init.status}): ${await init.text()}`);
  const uploadUrl = init.headers.get("location");
  if (!uploadUrl) fail("YouTube videos.insert did not return a resumable upload URL.");

  const media = fs.readFileSync(videoPath);
  const upload = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": detectMimeType(videoPath),
      "content-length": String(media.length),
    },
    body: media,
  });
  if (!upload.ok) fail(`YouTube video media upload failed (${upload.status}): ${await upload.text()}`);
  return upload.json();
}

function appendLedger(ledgerPath, row) {
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.appendFileSync(ledgerPath, `${JSON.stringify(row)}\n`, "utf8");
}

function dryRun(plan) {
  console.log("YouTube publish dry-run");
  console.log(`metadata=${plan.metadataFile}`);
  console.log(`video=${plan.videoPath || "MISSING"}`);
  console.log(`thumbnail=${plan.thumbnailPath || "none"}`);
  console.log(`channel=${plan.channelKey} ${plan.youtube_channel_id}`);
  console.log(`playlist=${plan.playlist_key} ${plan.youtube_playlist_id || "(missing id)"}`);
  console.log(`privacy=${plan.privacyStatus}`);
  console.log(`estimatedQuotaUnits=${plan.estimatedQuotaUnits}`);
  if (plan.blockers.length) console.log(`blockers=${plan.blockers.join("; ")}`);
  if (plan.warnings.length) console.log(`warnings=${plan.warnings.join("; ")}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.metadata) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }

  const metadataFile = resolveExistingPath(options.metadata, "metadata");
  const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
  const channelRegistry = loadYoutubeChannels(options.channelConfig);
  const playlistRegistry = loadPlaylistRegistry(options.playlistRegistry);
  const channel = findChannelForSupport(channelRegistry.channels, metadata.supportLang);
  if (!channel) fail(`No channel configured for supportLang=${metadata.supportLang}`);
  if (!channel.channelId) fail(`Channel ${channel.key} has no channelId.`);

  const assignment = buildPlaylistAssignment(metadata);
  let playlistEntry = findPlaylistEntry(playlistRegistry, assignment.key);
  const videoPath = resolveExistingPath(options.video || defaultVideoPath(metadataFile, metadata), "video");
  const thumbnailCandidate = options.thumbnail || defaultThumbnailPath(metadataFile, metadata);
  const thumbnailPath = thumbnailCandidate ? resolveExistingPath(thumbnailCandidate, "thumbnail") : "";
  const privacyStatus = options.privacyStatus || metadata.privacyStatus || "unlisted";
  if (!["private", "unlisted", "public"].includes(privacyStatus)) fail(`Invalid privacy: ${privacyStatus}`);
  if (privacyStatus === "public" && !options.confirmPublic) fail("privacy=public requires --confirm-public.");

  const plan = {
    metadataFile,
    videoPath,
    thumbnailPath,
    channelKey: channel.key,
    youtube_channel_id: channel.channelId,
    playlist_key: assignment.key,
    youtube_playlist_id: playlistEntry?.youtube_playlist_id || "",
    privacyStatus,
    estimatedQuotaUnits: 1600 + (thumbnailPath ? 50 : 0) + (playlistEntry?.youtube_playlist_id ? 50 : (options.createPlaylist ? 100 : 0)),
    blockers: playlistEntry?.youtube_playlist_id || options.createPlaylist ? [] : ["playlist has no youtube_playlist_id; pass --create-playlist or fill config/youtube-playlists.json"],
    warnings: thumbnailPath ? [] : ["thumbnail not found; thumbnails.set will be skipped"],
  };

  if (!options.apply) {
    dryRun(plan);
    return;
  }
  if (!options.confirmYoutubeWrite) fail("Live publish requires --confirm-youtube-write.");
  if (plan.blockers.length) fail(plan.blockers.join("; "));

  const clientFile = channelRegistry.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json";
  const tokenFile = tokenFileFor(channelRegistry, channel);
  resolveExistingPath(clientFile, "OAuth client");
  resolveExistingPath(tokenFile, "OAuth token");

  const ledgerBase = {
    timestamp: new Date().toISOString(),
    action: "youtube_publish_video",
    metadataFile,
    videoPath,
    thumbnailPath,
    channelKey: channel.key,
    supportLang: metadata.supportLang,
    targetLang: metadata.targetLang,
    setId: metadata.setId,
    playlist_key: assignment.key,
    privacyStatus,
  };

  try {
    const accessToken = await getAccessToken({ clientFile, tokenFile });
    if (!playlistEntry) {
      const result = upsertPlannedPlaylist(playlistRegistry, assignment, channel);
      playlistEntry = result.entry;
    }
    if (!playlistEntry.youtube_playlist_id) {
      const playlist = await youtubeJson({
        accessToken,
        method: "POST",
        pathName: "playlists",
        query: { part: "snippet,status", fields: "id,snippet(title),status(privacyStatus)" },
        body: {
          snippet: {
            title: playlistEntry.title || assignment.title,
            description: playlistEntry.description || assignment.description,
          },
          status: { privacyStatus: "unlisted" },
        },
      });
      playlistEntry.youtube_playlist_id = playlist.id;
      playlistEntry.status = "created_unlisted";
      playlistEntry.lastReadbackAt = new Date().toISOString();
      savePlaylistRegistry(playlistRegistry, options.playlistRegistry);
    }

    const uploaded = await uploadVideoResumable({ accessToken, videoPath, metadata, privacyStatus });
    const videoId = uploaded.id;
    let thumbnailResult = null;
    if (thumbnailPath) {
      thumbnailResult = await youtubeMediaUpload({
        accessToken,
        pathName: "thumbnails/set",
        query: { videoId },
        filePath: thumbnailPath,
      });
    }

    const playlistItem = await youtubeJson({
      accessToken,
      method: "POST",
      pathName: "playlistItems",
      query: { part: "snippet,contentDetails", fields: "id,snippet(playlistId,resourceId),contentDetails(videoId)" },
      body: {
        snippet: {
          playlistId: playlistEntry.youtube_playlist_id,
          resourceId: {
            kind: "youtube#video",
            videoId,
          },
        },
      },
    });

    const videoReadback = await youtubeJson({
      accessToken,
      method: "GET",
      pathName: "videos",
      query: {
        part: "snippet,status",
        id: videoId,
        fields: "items(id,snippet(title),status(privacyStatus,uploadStatus))",
      },
    });

    const ledgerRow = {
      ...ledgerBase,
      status: "published_uploaded",
      youtubeVideoId: videoId,
      youtubePlaylistId: playlistEntry.youtube_playlist_id,
      playlistItemId: playlistItem.id,
      thumbnailSet: Boolean(thumbnailResult),
      readback: videoReadback,
    };
    appendLedger(options.ledger, ledgerRow);
    console.log(JSON.stringify(ledgerRow, null, 2));
  } catch (error) {
    appendLedger(options.ledger, {
      ...ledgerBase,
      status: "failed",
      error: error.message,
    });
    throw error;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
