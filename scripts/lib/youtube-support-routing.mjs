import fs from "node:fs";
import path from "node:path";

import { canonicalSupportCode, normalizeCode } from "./youtube-publication-control.mjs";

export const DEFAULT_YOUTUBE_ROUTING_PATH = "config/youtube-api-project-routing.json";
export const DEFAULT_YOUTUBE_CHANNELS_PATH = "config/youtube-channels.json";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

export function canonicalSupportForChannel(channel = {}) {
  const candidates = [
    channel.supportLang,
    ...(Array.isArray(channel.supportLangs) ? channel.supportLangs : []),
    ...(Array.isArray(channel.supportVariants) ? channel.supportVariants : []),
    ...(Array.isArray(channel.channelSupportLangs) ? channel.channelSupportLangs : []),
  ].map(canonicalSupportCode).filter(Boolean);
  const canonical = [...new Set(candidates)];
  if (canonical.length !== 1) {
    throw new Error(
      `Channel ${channel.key || "(missing key)"} must resolve to exactly one canonical support language; got ${canonical.join(", ") || "none"}.`,
    );
  }
  return canonical[0];
}

export function buildCanonicalSupportRouting({ routing, channelRegistry }) {
  const channels = channelRegistry.channels || [];
  const channelByKey = new Map(channels.map((channel) => [String(channel.key || "").toLowerCase(), channel]));
  const routedChannelKeys = new Set();
  const supportToRoute = new Map();
  const supportToChannel = new Map();
  const projects = (routing.projects || []).map((project) => {
    const canonicalSupports = (project.supportChannelKeys || []).map((channelKeyRaw) => {
      const channelKey = String(channelKeyRaw || "").toLowerCase();
      const channel = channelByKey.get(channelKey);
      if (!channel) throw new Error(`Route ${project.key} references unknown channel key: ${channelKeyRaw}`);
      if (routedChannelKeys.has(channelKey)) throw new Error(`Channel ${channelKey} is assigned to more than one YouTube route.`);
      routedChannelKeys.add(channelKey);
      const support = canonicalSupportForChannel(channel);
      if (supportToRoute.has(support)) throw new Error(`Canonical support ${support} is assigned to more than one physical channel.`);
      supportToRoute.set(support, project);
      supportToChannel.set(support, channel);
      return support;
    });
    return { ...project, canonicalSupports };
  });

  const unrouted = channels
    .map((channel) => String(channel.key || "").toLowerCase())
    .filter(Boolean)
    .filter((key) => !routedChannelKeys.has(key));
  if (unrouted.length) throw new Error(`YouTube channels missing from route config: ${unrouted.join(", ")}`);

  return {
    parsed: routing,
    channelRegistry,
    projects,
    channels,
    channelByKey,
    supportToRoute,
    supportToChannel,
  };
}

export function loadCanonicalSupportRouting({
  routingPath = DEFAULT_YOUTUBE_ROUTING_PATH,
  channelsPath = DEFAULT_YOUTUBE_CHANNELS_PATH,
} = {}) {
  return buildCanonicalSupportRouting({
    routing: readJson(routingPath),
    channelRegistry: readJson(channelsPath),
  });
}

export function publicationBlockerForRoute(route = {}) {
  if (route.publicationReady === true) return "";
  const routeName = route.key || route.label || "(unknown route)";
  const reason = String(route.publicationBlockedReason || "publicationReady is false").trim();
  return `Route ${routeName} is publication-blocked: ${reason}`;
}

export function assertPublicationReadyForSupports(routing, supports = []) {
  const routes = new Map();
  for (const supportRaw of supports) {
    const support = canonicalSupportCode(supportRaw);
    const route = routing.supportToRoute.get(support);
    if (!route) throw new Error(`No physical YouTube channel route for canonical support=${support || supportRaw}.`);
    routes.set(route.key || route.label, route);
  }
  const blockers = [...routes.values()]
    .map((route) => publicationBlockerForRoute(route))
    .filter(Boolean)
    .sort();
  if (blockers.length) throw new Error(blockers.join("\n"));
  return [...routes.values()];
}

export function resolveCanonicalSupports({ requested = "ALL", excludeSupports = [], routing }) {
  const selector = String(requested || "ALL").trim();
  let supports;
  if (!selector || selector.toUpperCase() === "ALL") {
    supports = routing.projects.flatMap((project) => project.canonicalSupports || []);
  } else if (/^route:/iu.test(selector)) {
    const routeKey = selector.slice("route:".length).trim();
    const project = routing.projects.find((item) => item.key === routeKey || item.label === routeKey);
    if (!project) throw new Error(`Unknown route selector: ${requested}`);
    supports = project.canonicalSupports || [];
  } else {
    supports = selector.split(",").map(canonicalSupportCode).filter(Boolean);
  }

  const excluded = new Set((excludeSupports || []).map(canonicalSupportCode).filter(Boolean));
  const resolved = [...new Set(supports.map(canonicalSupportCode).filter(Boolean))]
    .filter((support) => !excluded.has(support))
    .sort();
  const unknown = resolved.filter((support) => !routing.supportToRoute.has(support));
  if (unknown.length) throw new Error(`No physical YouTube channel route for canonical support(s): ${unknown.join(", ")}`);
  return resolved;
}

export function findChannelForCanonicalSupport(channelRegistry, supportLang) {
  const support = canonicalSupportCode(supportLang);
  return (channelRegistry.channels || []).find((channel) => canonicalSupportForChannel(channel) === support) || null;
}

export function canonicalSupportRouteKey(routing, supportLang) {
  return routing.supportToRoute.get(canonicalSupportCode(supportLang))?.key || "";
}

export function assertCanonicalSupportCount(routing, expected = 51) {
  const supports = [...routing.supportToRoute.keys()];
  if (supports.length !== expected) {
    throw new Error(`Expected ${expected} canonical YouTube support channels, got ${supports.length}.`);
  }
  const invalid = supports.filter((support) => canonicalSupportCode(normalizeCode(support)) !== support);
  if (invalid.length) throw new Error(`Non-canonical support codes found: ${invalid.join(", ")}`);
  return supports;
}
