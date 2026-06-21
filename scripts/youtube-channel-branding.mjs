#!/usr/bin/env node
import { spawn } from "node:child_process";
import http from "node:http";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const DEFAULT_YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.force-ssl";
const DEFAULT_OAUTH_PORT = 53682;
const MUTABLE_CHANNEL_BRANDING_KEYS = [
  "country",
  "description",
  "defaultLanguage",
  "keywords",
  "trackingAnalyticsAccountId",
  "unsubscribedTrailer",
];

function parseArgs(argv) {
  const options = {
    config: "config/youtube-channels.json",
    channel: "",
    authorize: false,
    listChannels: false,
    resolveHandles: false,
    writeResolvedChannelIds: false,
    noBrowser: false,
    scope: process.env.YOUTUBE_OAUTH_SCOPE || DEFAULT_YOUTUBE_SCOPE,
    oauthPort: Number(process.env.YOUTUBE_OAUTH_PORT || DEFAULT_OAUTH_PORT),
    oauthClientFile: "",
    tokenFile: "",
    dryRun: true,
    apply: false,
    confirmYoutubeWrite: false,
    forceConfigured: false,
    json: false,
  };

  for (const arg of argv) {
    if (arg === "--authorize") {
      options.authorize = true;
      options.dryRun = false;
    } else if (arg === "--list-channels") {
      options.listChannels = true;
      options.dryRun = false;
    } else if (arg === "--resolve-handles") {
      options.resolveHandles = true;
      options.dryRun = false;
    } else if (arg === "--write-resolved-channel-ids") {
      options.writeResolvedChannelIds = true;
      options.dryRun = false;
    } else if (arg === "--apply") {
      options.apply = true;
      options.dryRun = false;
    } else if (arg === "--dry-run" || arg === "--plan") {
      options.dryRun = true;
      options.apply = false;
    } else if (arg === "--no-browser") {
      options.noBrowser = true;
    } else if (arg === "--confirm-youtube-write") {
      options.confirmYoutubeWrite = true;
    } else if (arg === "--force-configured") {
      options.forceConfigured = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg.startsWith("--config=")) {
      options.config = arg.slice("--config=".length);
    } else if (arg.startsWith("--channel=")) {
      options.channel = arg.slice("--channel=".length).toLowerCase();
    } else if (arg.startsWith("--scope=")) {
      options.scope = arg.slice("--scope=".length).trim();
    } else if (arg.startsWith("--oauth-port=")) {
      options.oauthPort = Number(arg.slice("--oauth-port=".length));
    } else if (arg.startsWith("--oauth-client-file=")) {
      options.oauthClientFile = arg.slice("--oauth-client-file=".length).trim();
    } else if (arg.startsWith("--token-file=")) {
      options.tokenFile = arg.slice("--token-file=".length).trim();
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/youtube-channel-branding.mjs --dry-run [--channel=en]
  node scripts/youtube-channel-branding.mjs --authorize --channel=<key>
  node scripts/youtube-channel-branding.mjs --authorize --token-file=.local/youtube-oauth/tokens/discovery.json
  node scripts/youtube-channel-branding.mjs --list-channels [--token-file=.local/youtube-oauth/tokens/discovery.json]
  node scripts/youtube-channel-branding.mjs --resolve-handles [--write-resolved-channel-ids]
  node scripts/youtube-channel-branding.mjs --apply --confirm-youtube-write --channel=<key>

Purpose:
  Plans and optionally applies the official YouTube API channel-branding subset.

Can apply through official YouTube Data API:
  - channel banner upload + brandingSettings.image.bannerExternalUrl
  - brandingSettings.channel.description when desiredDescription is present
  - channel video watermark

Manual / YouTube Studio only:
  - channel creation
  - channel title/name and handle
  - profile avatar/icon
  - contact email and public profile links

OAuth files:
  - Client JSON defaults to .local/youtube-oauth/google-oauth-client.json
  - Token JSON defaults to .local/youtube-oauth/tokens/<channel-key>.json
  - Discovery token defaults to .local/youtube-oauth/tokens/discovery.json
  - Token must be authorized for the specific Brand Channel.
  - --resolve-handles can use any valid project YouTube OAuth token for public handle readback.
  - Default scope: ${DEFAULT_YOUTUBE_SCOPE}
  - Default local OAuth callback: http://127.0.0.1:${DEFAULT_OAUTH_PORT}/oauth2callback
`);
}

function resolveProjectPath(filePath) {
  if (!filePath) return "";
  return path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
}

async function fileInfo(filePath) {
  if (!filePath) return { exists: false, path: "" };
  const absolutePath = resolveProjectPath(filePath);
  try {
    const info = await stat(absolutePath);
    return { exists: true, path: filePath, absolutePath, size: info.size };
  } catch {
    return { exists: false, path: filePath, absolutePath, size: 0 };
  }
}

function detectMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  return "application/octet-stream";
}

async function loadJson(filePath) {
  const absolutePath = resolveProjectPath(filePath);
  return JSON.parse(await readFile(absolutePath, "utf8"));
}

function getTokenFile(config, channel) {
  if (channel.oauthTokenFile) return channel.oauthTokenFile;
  const tokenDir = config.defaults?.tokenDir || ".local/youtube-oauth/tokens";
  return path.join(tokenDir, `${channel.key}.json`);
}

function getDefaultOAuthClientFile(config) {
  return config.defaults?.oauthClientFile || ".local/youtube-oauth/google-oauth-client.json";
}

function getDiscoveryTokenFile(config, options) {
  if (options.tokenFile) return options.tokenFile;
  const tokenDir = config.defaults?.tokenDir || ".local/youtube-oauth/tokens";
  return path.join(tokenDir, "discovery.json");
}

async function buildChannelPlan(config, channel) {
  const banner = await fileInfo(channel.bannerAsset);
  const avatar = await fileInfo(channel.avatarAsset || config.defaults?.avatarAsset);
  const watermark = await fileInfo(channel.watermarkAsset || config.defaults?.watermarkAsset);
  const oauthClient = await fileInfo(channel.oauthClientFile || config.defaults?.oauthClientFile);
  const tokenFile = getTokenFile(config, channel);
  const oauthToken = await fileInfo(tokenFile);

  const apiActions = [];
  apiActions.push({
    action: "channelBanners.insert + channels.update",
    ready: banner.exists,
    asset: banner.path,
    quotaUnitsApprox: 50,
  });
  apiActions.push({
    action: "watermarks.set",
    ready: watermark.exists,
    asset: watermark.path,
    quotaUnitsApprox: 50,
  });
  apiActions.push({
    action: "channels.update brandingSettings.channel.description",
    ready: typeof channel.desiredDescription === "string" && channel.desiredDescription.trim().length > 0,
    asset: null,
    quotaUnitsApprox: 50,
  });

  return {
    key: channel.key,
    supportLangs: channel.supportLangs || [],
    publicUrl: channel.publicUrl,
    handle: channel.currentHandle,
    channelId: channel.channelId || null,
    siteCoursesUrl: channel.siteCoursesUrl,
    profileStatus: channel.profileStatus || "unknown",
    assets: { banner, avatar, watermark },
    oauth: { client: oauthClient, token: oauthToken },
    apiActions,
    manualActions: config.defaults?.manualOnlyFields || [],
    notes: [
      channel.channelId ? "Channel ID is present." : "Channel ID is missing; apply mode must discover the authorized channel with mine=true.",
      channel.profileStatus === "configured_readback" ? "Already configured/read back; apply mode skips it unless --force-configured is passed." : "",
      channel.profileStatus === "needs_public_link_fix" ? "Needs a YouTube Studio public-link fix; official API does not cover profile links reliably." : "",
    ].filter(Boolean),
  };
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

async function loadOAuthClient(clientFile) {
  let parsed;
  try {
    parsed = await loadJson(clientFile);
  } catch (error) {
    fail(`Cannot read OAuth client file ${clientFile}: ${error.message}`);
  }

  const client = parsed.installed || parsed.web;
  if (!client?.client_id || !client?.client_secret) {
    fail("OAuth client file must contain installed/web client_id and client_secret.");
  }

  return {
    clientId: client.client_id,
    clientSecret: client.client_secret,
    authUri: client.auth_uri || "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUri: client.token_uri || "https://oauth2.googleapis.com/token",
  };
}

async function saveOAuthToken(tokenFile, token) {
  const absolutePath = resolveProjectPath(tokenFile);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(token, null, 2)}\n`, { mode: 0o600 });
}

function openBrowser(url) {
  try {
    const isWin = process.platform === "win32";
    const isMac = process.platform === "darwin";
    const command = isWin ? "cmd" : isMac ? "open" : "xdg-open";
    const args = isWin ? ["/c", "start", '""', url] : [url];
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      shell: isWin,
    });
    child.on("error", () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}

async function startOAuthListener({ state, port }) {
  let resolveCode;
  let rejectCode;
  const codePromise = new Promise((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url, "http://127.0.0.1");
    if (requestUrl.pathname !== "/oauth2callback") {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const returnedState = requestUrl.searchParams.get("state");
    const error = requestUrl.searchParams.get("error");
    const code = requestUrl.searchParams.get("code");

    if (returnedState !== state) {
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      response.end("OAuth state mismatch. You can close this tab.");
      server.close();
      rejectCode(new Error("OAuth state mismatch."));
      return;
    }

    if (error) {
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      response.end(`OAuth error: ${error}. You can close this tab.`);
      server.close();
      rejectCode(new Error(`OAuth error: ${error}`));
      return;
    }

    if (!code) {
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      response.end("OAuth callback did not include a code. You can close this tab.");
      server.close();
      rejectCode(new Error("OAuth callback did not include a code."));
      return;
    }

    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end("<html><body><h1>LunaCards YouTube authorized.</h1><p>You can close this tab.</p></body></html>");
    server.close();
    resolveCode(code);
  });

  await new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  return { port: address.port, codePromise };
}

async function exchangeOAuthCode({ client, code, redirectUri }) {
  const body = new URLSearchParams({
    client_id: client.clientId,
    client_secret: client.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const response = await fetch(client.tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    fail(`OAuth code exchange failed (${response.status}): ${await response.text()}`);
  }

  return response.json();
}

async function authorizeOAuth({ clientFile, tokenFile, scope, noBrowser, oauthPort }) {
  const client = await loadOAuthClient(clientFile);
  const state = Math.random().toString(36).slice(2);
  const { port, codePromise } = await startOAuthListener({ state, port: oauthPort });
  const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
  const authUrl = new URL(client.authUri);
  authUrl.searchParams.set("client_id", client.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  console.log("Open this URL to authorize the selected LunaCards YouTube channel:");
  console.log(authUrl.toString());
  console.log(`OAuth callback URI: ${redirectUri}`);
  console.log("Important: choose the exact Brand Channel in the Google/YouTube account picker.");

  if (!noBrowser) {
    const opened = openBrowser(authUrl.toString());
    if (!opened) console.log("Browser did not open automatically; paste the URL manually.");
  }

  const code = await codePromise;
  const token = await exchangeOAuthCode({ client, code, redirectUri });
  if (!token.refresh_token) {
    fail("OAuth token has no refresh_token. Re-run --authorize and allow offline access.");
  }
  const storedToken = {
    ...token,
    scope,
    expires_at: Date.now() + (Number(token.expires_in || 3600) - 60) * 1000,
  };
  await saveOAuthToken(tokenFile, storedToken);

  console.log("YouTube OAuth authorization completed");
  console.log(`token_file=${tokenFile}`);
}

async function getOAuthAccessToken({ clientFile, tokenFile }) {
  const client = await loadOAuthClient(clientFile);
  let token;
  try {
    token = await loadJson(tokenFile);
  } catch (error) {
    fail(`Cannot read OAuth token file ${tokenFile}: ${error.message}`);
  }

  if (token.access_token && Number(token.expires_at || 0) > Date.now() + 60_000) {
    return token.access_token;
  }

  if (!token.refresh_token) {
    fail(`OAuth token file ${tokenFile} has no refresh_token.`);
  }

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

  if (!response.ok) {
    fail(`OAuth token refresh failed (${response.status}): ${await response.text()}`);
  }

  const refreshed = await response.json();
  const nextToken = {
    ...token,
    ...refreshed,
    refresh_token: refreshed.refresh_token || token.refresh_token,
    expires_at: Date.now() + (Number(refreshed.expires_in || 3600) - 60) * 1000,
  };
  await saveOAuthToken(tokenFile, nextToken);
  return nextToken.access_token;
}

async function youtubeJson({ accessToken, method, base = "https://www.googleapis.com/youtube/v3/", pathName, query = {}, body }) {
  const url = new URL(pathName, base);
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

  if (!response.ok) {
    fail(`YouTube API ${method} ${url.pathname} failed (${response.status}): ${await response.text()}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function youtubeUpload({ accessToken, pathName, query = {}, filePath }) {
  const absolutePath = resolveProjectPath(filePath);
  const body = await readFile(absolutePath);
  const url = new URL(pathName, "https://www.googleapis.com/upload/youtube/v3/");
  for (const [key, value] of Object.entries({ uploadType: "media", ...query })) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": detectMimeType(filePath),
      "content-length": String(body.length),
    },
    body,
  });

  if (!response.ok) {
    fail(`YouTube upload ${url.pathname} failed (${response.status}): ${await response.text()}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function youtubeMultipartUpload({ accessToken, pathName, query = {}, filePath, resource }) {
  const absolutePath = resolveProjectPath(filePath);
  const mediaBody = await readFile(absolutePath);
  const boundary = `lunacards_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  const url = new URL(pathName, "https://www.googleapis.com/upload/youtube/v3/");
  for (const [key, value] of Object.entries({ uploadType: "multipart", ...query })) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const metadataPart = Buffer.from(
    [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(resource),
      `--${boundary}`,
      `Content-Type: ${detectMimeType(filePath)}`,
      "",
    ].join("\r\n") + "\r\n"
  );
  const closingPart = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([metadataPart, mediaBody, closingPart]);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": `multipart/related; boundary=${boundary}`,
      "content-length": String(body.length),
    },
    body,
  });

  if (!response.ok) {
    fail(`YouTube multipart upload ${url.pathname} failed (${response.status}): ${await response.text()}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function getChannelResource({ accessToken, channel }) {
  const query = {
    part: "id,snippet,brandingSettings",
    fields: "items(id,snippet(title),brandingSettings)",
  };
  if (channel.channelId) query.id = channel.channelId;
  else query.mine = "true";

  const data = await youtubeJson({
    accessToken,
    method: "GET",
    pathName: "channels",
    query,
  });

  const item = data?.items?.[0];
  if (!item?.id) fail(`No authorized channel found for key ${channel.key}.`);
  return item;
}

async function listAuthorizedChannels({ accessToken }) {
  const items = [];
  let pageToken = "";

  do {
    const data = await youtubeJson({
      accessToken,
      method: "GET",
      pathName: "channels",
      query: {
        part: "id,snippet,brandingSettings,contentDetails",
        mine: "true",
        maxResults: 50,
        pageToken,
        fields: "nextPageToken,items(id,snippet(title,customUrl,description,publishedAt,defaultLanguage),brandingSettings(channel(title,description,keywords,defaultLanguage,country),image(bannerExternalUrl)),contentDetails(relatedPlaylists(uploads)))",
      },
    });

    items.push(...(data.items || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return items.map((item) => ({
    channelId: item.id,
    title: item.snippet?.title || item.brandingSettings?.channel?.title || "",
    snippetTitle: item.snippet?.title || "",
    brandingTitle: item.brandingSettings?.channel?.title || "",
    customUrl: item.snippet?.customUrl || "",
    description: item.snippet?.description || item.brandingSettings?.channel?.description || "",
    defaultLanguage: item.snippet?.defaultLanguage || item.brandingSettings?.channel?.defaultLanguage || "",
    country: item.brandingSettings?.channel?.country || "",
    keywords: item.brandingSettings?.channel?.keywords || "",
    hasBanner: Boolean(item.brandingSettings?.image?.bannerExternalUrl),
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads || "",
    publishedAt: item.snippet?.publishedAt || "",
  }));
}

async function resolveChannelByHandle({ accessToken, handle }) {
  const normalizedHandle = String(handle || "").trim().replace(/^@/, "");
  if (!normalizedHandle) return null;

  const data = await youtubeJson({
    accessToken,
    method: "GET",
    pathName: "channels",
    query: {
      part: "id,snippet,contentDetails",
      forHandle: `@${normalizedHandle}`,
      maxResults: 1,
      fields: "items(id,snippet(title,customUrl,publishedAt),contentDetails(relatedPlaylists(uploads)))",
    },
  });

  const item = data?.items?.[0];
  if (!item?.id) return null;
  return {
    channelId: item.id,
    title: item.snippet?.title || "",
    customUrl: item.snippet?.customUrl || "",
    publicUrl: `https://www.youtube.com/${item.snippet?.customUrl || `@${normalizedHandle}`}`,
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads || "",
    publishedAt: item.snippet?.publishedAt || "",
  };
}

async function resolveConfiguredHandles({ accessToken, channels, writeToConfig, configPath, config }) {
  const results = [];

  for (const channel of channels) {
    const handle = channel.currentHandle || "";
    if (!handle) {
      results.push({
        key: channel.key,
        status: "missing_handle",
        handle,
        configuredChannelId: channel.channelId || "",
      });
      continue;
    }

    const resolved = await resolveChannelByHandle({ accessToken, handle });
    const configuredChannelId = channel.channelId || "";
    let status = "not_found";
    if (resolved?.channelId) {
      status = configuredChannelId
        ? configuredChannelId === resolved.channelId
          ? "matched_existing"
          : "mismatch_existing"
        : "resolved_missing";
    }

    if (writeToConfig && status === "resolved_missing") {
      channel.channelId = resolved.channelId;
    }

    results.push({
      key: channel.key,
      handle,
      status,
      configuredChannelId,
      resolved: resolved || null,
    });
  }

  if (writeToConfig) {
    const mismatches = results.filter((result) => result.status === "mismatch_existing");
    if (mismatches.length > 0) {
      fail(`Refusing to write channel IDs because ${mismatches.length} configured handle(s) mismatch existing channelId.`);
    }
    await writeFile(resolveProjectPath(configPath), `${JSON.stringify(config, null, 2)}\n`);
  }

  return results;
}

function printAuthorizedChannels(channels) {
  console.log(`Authorized YouTube channels found: ${channels.length}`);
  for (const [index, channel] of channels.entries()) {
    console.log(`${index + 1}. ${channel.title || "(no title)"}`);
    console.log(`   channelId: ${channel.channelId}`);
    if (channel.customUrl) console.log(`   customUrl: ${channel.customUrl}`);
    if (channel.defaultLanguage) console.log(`   defaultLanguage: ${channel.defaultLanguage}`);
    if (channel.country) console.log(`   country: ${channel.country}`);
    console.log(`   hasBanner: ${channel.hasBanner ? "yes" : "no"}`);
    if (channel.uploadsPlaylistId) console.log(`   uploadsPlaylistId: ${channel.uploadsPlaylistId}`);
    if (channel.publishedAt) console.log(`   publishedAt: ${channel.publishedAt}`);
  }
}

async function updateBranding({ accessToken, channel, currentChannel, bannerExternalUrl }) {
  const currentBranding = currentChannel.brandingSettings || {};
  const currentChannelSettings = currentBranding.channel || {};
  const nextChannelSettings = {};

  for (const key of MUTABLE_CHANNEL_BRANDING_KEYS) {
    if (currentChannelSettings[key] !== undefined) {
      nextChannelSettings[key] = currentChannelSettings[key];
    }
  }

  if (channel.desiredDescription) {
    nextChannelSettings.description = channel.desiredDescription;
  }

  const nextImageSettings = {};
  if (currentBranding.image?.bannerExternalUrl) {
    nextImageSettings.bannerExternalUrl = currentBranding.image.bannerExternalUrl;
  }
  if (bannerExternalUrl) {
    nextImageSettings.bannerExternalUrl = bannerExternalUrl;
  }

  const nextBranding = {
    channel: nextChannelSettings,
  };
  if (Object.keys(nextImageSettings).length > 0) {
    nextBranding.image = nextImageSettings;
  }

  return youtubeJson({
    accessToken,
    method: "PUT",
    pathName: "channels",
    query: {
      part: "brandingSettings",
      fields: "id,brandingSettings",
    },
    body: {
      id: currentChannel.id,
      brandingSettings: nextBranding,
    },
  });
}

async function applyChannel(config, channel, plan, options) {
  if (channel.profileStatus === "configured_readback" && !options.forceConfigured) {
    return { key: channel.key, status: "skipped_configured_readback" };
  }

  if (!options.confirmYoutubeWrite) {
    fail("Apply mode requires --confirm-youtube-write.");
  }
  if (!plan.oauth.client.exists) fail(`Missing OAuth client file: ${plan.oauth.client.path}`);
  if (!plan.oauth.token.exists) fail(`Missing OAuth token file for ${channel.key}: ${plan.oauth.token.path}`);
  if (!plan.assets.banner.exists) fail(`Missing banner asset for ${channel.key}: ${plan.assets.banner.path}`);
  if (!plan.assets.watermark.exists) fail(`Missing watermark asset for ${channel.key}: ${plan.assets.watermark.path}`);

  const accessToken = await getOAuthAccessToken({
    clientFile: plan.oauth.client.path,
    tokenFile: plan.oauth.token.path,
  });
  const currentChannel = await getChannelResource({ accessToken, channel });

  const banner = await youtubeUpload({
    accessToken,
    pathName: "channelBanners/insert",
    filePath: plan.assets.banner.path,
  });
  await updateBranding({
    accessToken,
    channel,
    currentChannel,
    bannerExternalUrl: banner?.url,
  });
  await youtubeMultipartUpload({
    accessToken,
    pathName: "watermarks/set",
    query: { channelId: currentChannel.id },
    filePath: plan.assets.watermark.path,
    resource: {
      timing: {
        type: "offsetFromStart",
        offsetMs: 0,
        durationMs: 3600000,
      },
      position: {
        type: "corner",
        cornerPosition: "topRight",
      },
      targetChannelId: currentChannel.id,
    },
  });

  return {
    key: channel.key,
    status: "applied",
    channelId: currentChannel.id,
    wrote: ["banner", "brandingSettings", "watermark"],
    manualRemaining: plan.manualActions,
  };
}

function printPlan(plans) {
  console.log("YouTube channel branding plan");
  console.log("Official API scope: banner, description, watermark. Manual scope: creation, name/handle, avatar, contact email, profile links.");
  console.log("");

  for (const plan of plans) {
    console.log(`${plan.key.toUpperCase()} @${plan.handle} (${plan.profileStatus})`);
    console.log(`  Channel: ${plan.publicUrl}`);
    console.log(`  Site: ${plan.siteCoursesUrl}`);
    console.log(`  Banner: ${plan.assets.banner.exists ? "OK" : "MISSING"} ${plan.assets.banner.path}`);
    console.log(`  Avatar/manual asset: ${plan.assets.avatar.exists ? "OK" : "MISSING"} ${plan.assets.avatar.path}`);
    console.log(`  Watermark: ${plan.assets.watermark.exists ? "OK" : "MISSING"} ${plan.assets.watermark.path}`);
    console.log(`  OAuth client: ${plan.oauth.client.exists ? "present" : "missing"} ${plan.oauth.client.path}`);
    console.log(`  OAuth token: ${plan.oauth.token.exists ? "present" : "missing"} ${plan.oauth.token.path}`);
    for (const action of plan.apiActions) {
      console.log(`  API: ${action.ready ? "ready" : "not ready"} ${action.action}`);
    }
    for (const note of plan.notes) {
      console.log(`  Note: ${note}`);
    }
    console.log("");
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const config = await loadJson(options.config);
  let channels = config.channels || [];
  if (options.apply && !options.channel) {
    fail("--apply requires --channel=<key>.");
  }
  if (options.authorize && !options.channel && !options.tokenFile) {
    fail("--authorize requires --channel=<key>, or --token-file=<path> for discovery authorization.");
  }
  if (options.channel) {
    channels = channels.filter((channel) => channel.key === options.channel);
    if (channels.length === 0) fail(`No channel found for key: ${options.channel}`);
  }

  if (options.authorize && !options.channel) {
    const clientFile = options.oauthClientFile || getDefaultOAuthClientFile(config);
    await authorizeOAuth({
      clientFile,
      tokenFile: options.tokenFile,
      scope: options.scope,
      noBrowser: options.noBrowser,
      oauthPort: options.oauthPort,
    });
    return;
  }

  if (options.listChannels) {
    const clientFile = options.oauthClientFile || getDefaultOAuthClientFile(config);
    const tokenFile = getDiscoveryTokenFile(config, options);
    const accessToken = await getOAuthAccessToken({ clientFile, tokenFile });
    const authorizedChannels = await listAuthorizedChannels({ accessToken });
    if (options.json) {
      console.log(JSON.stringify({ tokenFile, channels: authorizedChannels }, null, 2));
    } else {
      printAuthorizedChannels(authorizedChannels);
    }
    return;
  }

  if (options.resolveHandles) {
    const clientFile = options.oauthClientFile || getDefaultOAuthClientFile(config);
    const tokenFile = getDiscoveryTokenFile(config, options);
    const accessToken = await getOAuthAccessToken({ clientFile, tokenFile });
    const results = await resolveConfiguredHandles({
      accessToken,
      channels,
      writeToConfig: options.writeResolvedChannelIds,
      configPath: options.config,
      config,
    });
    if (options.json) {
      console.log(JSON.stringify({ tokenFile, wroteConfig: options.writeResolvedChannelIds, results }, null, 2));
    } else {
      for (const result of results) {
        const resolvedId = result.resolved?.channelId || "";
        console.log(`${result.key}: @${result.handle} ${result.status}${resolvedId ? ` ${resolvedId}` : ""}`);
      }
    }
    return;
  }

  const plans = [];
  for (const channel of channels) {
    plans.push(await buildChannelPlan(config, channel));
  }

  if (options.authorize) {
    const channel = channels[0];
    const plan = plans[0];
    if (!plan.oauth.client.exists) {
      fail(`Missing OAuth client file: ${plan.oauth.client.path}`);
    }
    await authorizeOAuth({
      clientFile: plan.oauth.client.path,
      tokenFile: plan.oauth.token.path,
      scope: options.scope,
      noBrowser: options.noBrowser,
      oauthPort: options.oauthPort,
    });
    return;
  }

  if (options.json && !options.apply) {
    console.log(JSON.stringify({ config: options.config, plans }, null, 2));
    return;
  }

  if (!options.apply) {
    printPlan(plans);
    return;
  }

  const results = [];
  for (const channel of channels) {
    const plan = plans.find((item) => item.key === channel.key);
    results.push(await applyChannel(config, channel, plan, options));
  }
  console.log(JSON.stringify({ results }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
