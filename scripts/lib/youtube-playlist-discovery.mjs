import { canonicalSupportCode } from "./youtube-publication-control.mjs";

const IDENTITY_MARKER_PREFIX = "LunaCards playlist key:";

export function normalizePlaylistText(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/gu, " ").trim().toLocaleLowerCase();
}

export function playlistIdentityMarker(playlistKey) {
  return `${IDENTITY_MARKER_PREFIX} ${String(playlistKey || "").trim()}`;
}

export function descriptionWithPlaylistIdentity(description, playlistKey) {
  const text = String(description || "").trim();
  const marker = playlistIdentityMarker(playlistKey);
  if (!playlistKey) return Array.from(text).slice(0, 5000).join("");
  if (normalizePlaylistText(text).includes(normalizePlaylistText(marker))) return Array.from(text).slice(0, 5000).join("");
  const separator = text ? "\n\n" : "";
  const maxTextLength = Math.max(0, 5000 - Array.from(separator + marker).length);
  const boundedText = Array.from(text).slice(0, maxTextLength).join("").trimEnd();
  return [boundedText, marker].filter(Boolean).join("\n\n");
}

function playlistId(row = {}) {
  row ||= {};
  return String(row.youtube_playlist_id || row.youtubePlaylistId || row.playlistId || row.id || "").trim();
}

function playlistKey(row = {}) {
  row ||= {};
  return String(row.playlist_key || row.playlistKey || row.key || "").trim();
}

function playlistPrivacyStatus(row = {}) {
  return String(row?.privacyStatus || row?.privacy_status || row?.status?.privacyStatus || "").trim().toLowerCase();
}

function sourceVideoIds(row = {}) {
  row ||= {};
  return new Set([
    ...(row.sourceVideoIds || []),
    ...(row.sourcePublications || []).map((item) => item?.youtubeVideoId),
  ].map(String).filter(Boolean));
}

export function findDiscoveryChannel(snapshot = {}, supportLang) {
  const support = canonicalSupportCode(supportLang);
  return (snapshot.channels || []).find((row) => canonicalSupportCode(row.supportLang) === support) || null;
}

export function resolvePlaylistDiscovery({ assignment, registryEntry, discoveryChannel, requirePublic = false }) {
  const expectedKey = String(assignment?.key || assignment?.playlist_key || "").trim();
  const expectedTitle = normalizePlaylistText(assignment?.title);
  const expectedMarker = normalizePlaylistText(playlistIdentityMarker(expectedKey));
  const registryPlaylistId = playlistId(registryEntry);
  const registryKey = playlistKey(registryEntry);
  const blockers = [];
  const warnings = [];

  if (!expectedKey) blockers.push("playlist assignment key is missing");
  if (!discoveryChannel) blockers.push("route-authenticated playlist discovery is missing for support channel");
  if (discoveryChannel && discoveryChannel.complete !== true) blockers.push("playlist discovery for support channel is incomplete");
  if (registryKey && registryKey !== expectedKey) blockers.push(`playlist registry key mismatch: expected=${expectedKey} actual=${registryKey}`);
  if (blockers.length) {
    return { ready: false, state: "blocked", blockers, warnings, playlistKey: expectedKey, youtubePlaylistId: "", createAllowed: false };
  }

  const live = discoveryChannel.playlists || [];
  if (registryPlaylistId) {
    const exact = live.filter((row) => playlistId(row) === registryPlaylistId);
    if (exact.length !== 1) {
      blockers.push(exact.length
        ? `durable playlist ID is duplicated in discovery: ${registryPlaylistId}`
        : `durable playlist ID is absent from complete channel discovery: ${registryPlaylistId}`);
    } else if (exact[0].youtubeChannelId && discoveryChannel.youtubeChannelId
      && exact[0].youtubeChannelId !== discoveryChannel.youtubeChannelId) {
      blockers.push(`durable playlist belongs to another channel: ${registryPlaylistId}`);
    }
    if (blockers.length) {
      return { ready: false, state: "blocked", blockers, warnings, playlistKey: expectedKey, youtubePlaylistId: registryPlaylistId, createAllowed: false };
    }
    if (expectedTitle && normalizePlaylistText(exact[0].title) !== expectedTitle) {
      warnings.push("durable playlist title differs from the current deterministic title; ID remains authoritative");
    }
    const privacyStatus = playlistPrivacyStatus(exact[0]);
    if (requirePublic && privacyStatus !== "public") {
      blockers.push(`scheduled public release requires a public playlist; current privacy=${privacyStatus || "unknown"}`);
    }
    return {
      ready: blockers.length === 0,
      state: blockers.length ? "blocked" : "resolved_existing",
      blockers,
      warnings,
      playlistKey: expectedKey,
      youtubePlaylistId: registryPlaylistId,
      playlistPrivacyStatus: privacyStatus,
      createAllowed: false,
      matchEvidence: ["durable_registry_id"],
    };
  }

  const expectedSourceVideoIds = sourceVideoIds(registryEntry);
  const matches = live.map((row) => {
    const evidence = [];
    const description = normalizePlaylistText(row.description);
    if (expectedMarker && description.includes(expectedMarker)) evidence.push("stable_key_marker");
    if (expectedTitle && normalizePlaylistText(row.title) === expectedTitle) evidence.push("exact_deterministic_title");
    const liveVideoIds = new Set((row.videoIds || []).map(String).filter(Boolean));
    if (row.itemMembershipComplete !== false && [...expectedSourceVideoIds].some((id) => liveVideoIds.has(id))) {
      evidence.push("known_source_video_membership");
    }
    return { row, evidence };
  }).filter((match) => match.evidence.length > 0);

  if (matches.length > 1) {
    blockers.push(`multiple live playlists match stable identity ${expectedKey}: ${matches.map((match) => playlistId(match.row)).join(",")}`);
    return { ready: false, state: "blocked", blockers, warnings, playlistKey: expectedKey, youtubePlaylistId: "", createAllowed: false };
  }
  if (matches.length === 1) {
    const resolvedId = playlistId(matches[0].row);
    if (!resolvedId) blockers.push(`matched live playlist has no ID for ${expectedKey}`);
    const privacyStatus = playlistPrivacyStatus(matches[0].row);
    if (requirePublic && privacyStatus !== "public") {
      blockers.push(`scheduled public release requires a public playlist; current privacy=${privacyStatus || "unknown"}`);
    }
    return {
      ready: blockers.length === 0,
      state: blockers.length ? "blocked" : "resolved_existing",
      blockers,
      warnings,
      playlistKey: expectedKey,
      youtubePlaylistId: resolvedId,
      playlistPrivacyStatus: privacyStatus,
      createAllowed: false,
      matchEvidence: matches[0].evidence,
    };
  }

  const incompleteMembershipPlaylistIds = live
    .filter((row) => row.itemMembershipComplete === false)
    .map((row) => playlistId(row))
    .filter(Boolean);
  if (incompleteMembershipPlaylistIds.length) {
    blockers.push(`owned playlist item membership is incomplete; cannot prove playlist absence for ${expectedKey}: ${incompleteMembershipPlaylistIds.join(",")}`);
    return { ready: false, state: "blocked", blockers, warnings, playlistKey: expectedKey, youtubePlaylistId: "", createAllowed: false };
  }

  return {
    ready: true,
    state: "verified_absent",
    blockers,
    warnings,
    playlistKey: expectedKey,
    youtubePlaylistId: "",
    playlistPrivacyStatus: "public",
    createAllowed: true,
    matchEvidence: ["complete_channel_inventory_no_identity_match"],
  };
}

export function validateResolvedPlaylistIdentities(rows = []) {
  const blockers = [];
  const keyToId = new Map();
  const idToKeys = new Map();
  for (const row of rows) {
    const key = String(row?.playlist?.playlistKey || "").trim();
    const id = String(row?.playlist?.youtubePlaylistId || "").trim();
    if (!key) continue;
    if (keyToId.has(key) && keyToId.get(key) !== id) blockers.push(`${key}: one playlist key resolved to conflicting IDs`);
    else keyToId.set(key, id);
    if (!id) continue;
    const keys = idToKeys.get(id) || new Set();
    keys.add(key);
    idToKeys.set(id, keys);
  }
  for (const [id, keys] of idToKeys) {
    if (keys.size > 1) blockers.push(`${id}: one live playlist resolved to multiple stable keys (${[...keys].sort().join(",")})`);
  }
  return blockers;
}
