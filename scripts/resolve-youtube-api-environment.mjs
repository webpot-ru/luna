#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    if (arg.startsWith("--support=")) args.support = arg.slice("--support=".length);
    else if (arg.startsWith("--environment=")) args.environment = arg.slice("--environment=".length);
    else if (arg === "--activation-readback") args.activationReadback = true;
    else if (arg === "--json") args.json = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function splitCodes(value) {
  return String(value || "")
    .split(",")
    .map((item) => normalizeCode(item))
    .filter(Boolean);
}

function sortedUniqueCodes(values = []) {
  return [...new Set(values.map((item) => normalizeCode(item)).filter(Boolean))].sort();
}

export function resolveYouTubeApiEnvironment({
  routing,
  supportCodes: requestedSupportCodes,
  requestedEnvironment = "auto",
  activationReadback = false,
} = {}) {
  const normalizedRequestedSupportCodes = (requestedSupportCodes || []).map((item) => normalizeCode(item)).filter(Boolean);
  const supportCodes = sortedUniqueCodes(normalizedRequestedSupportCodes);
  if (!supportCodes.length) {
    throw new Error("--support must include at least one support language/channel code.");
  }

  const projects = routing.projects || [];
  const matches = [];

  for (const supportCode of supportCodes) {
    const match = projects.find((project) => {
      const channelKeys = (project.supportChannelKeys || []).map((item) => normalizeCode(item));
      const variants = (project.supportVariants || []).map((item) => normalizeCode(item));
      return channelKeys.includes(supportCode) || variants.includes(supportCode);
    });
    if (!match) {
      throw new Error(`No YouTube API project route found for support=${supportCode}.`);
    }
    matches.push({
      support: supportCode,
      route: match.key,
      label: match.label,
      githubEnvironment: match.githubEnvironment,
    });
  }

  const environments = [...new Set(matches.map((item) => item.githubEnvironment))];
  if (environments.length !== 1) {
    throw new Error(
      `Support codes span multiple GitHub environments: ${matches
        .map((item) => `${item.support}:${item.githubEnvironment}`)
        .join(", ")}. Dispatch separate workflow runs per route.`,
    );
  }

  const expectedEnvironment = environments[0];
  const environment = String(requestedEnvironment || "auto").trim();
  if (environment && environment !== "auto" && environment !== expectedEnvironment) {
    throw new Error(
      `GitHub environment mismatch: requested ${requestedEnvironment}, expected ${expectedEnvironment} for support=${supportCodes.join(",")}.`,
    );
  }

  const routes = [...new Map(matches.map((item) => [item.route, projects.find((project) => project.key === item.route)])).values()];
  if (activationReadback) {
    if (!environment || environment === "auto") {
      throw new Error("--activation-readback requires an explicit matching --environment.");
    }
    if (routes.length !== 1) {
      throw new Error("--activation-readback must be limited to exactly one YouTube API route.");
    }
    const [route] = routes;
    if (route?.publicationReady === true) {
      throw new Error(`--activation-readback is only allowed while ${route.key} is publication-blocked.`);
    }
    const expectedRouteSupports = sortedUniqueCodes(route?.supportVariants || []);
    if (normalizedRequestedSupportCodes.length !== supportCodes.length) {
      throw new Error("--activation-readback must list each active support exactly once.");
    }
    if (supportCodes.join("|") !== expectedRouteSupports.join("|")) {
      throw new Error(
        `--activation-readback for ${route?.key || "this route"} must include every active support exactly once: ${expectedRouteSupports.join(",")}.`,
      );
    }
  }

  const publicationBlockers = [...new Map(matches.map((item) => [item.route, item])).values()]
    .map((item) => {
      const route = projects.find((project) => project.key === item.route);
      if (route?.publicationReady === true) return "";
      return `Route ${item.route} is publication-blocked: ${String(route?.publicationBlockedReason || "publicationReady is false").trim()}`;
    })
    .filter(Boolean)
    .sort();
  if (publicationBlockers.length && !activationReadback) {
    throw new Error(publicationBlockers.join("\n"));
  }

  return {
    ok: true,
    supportCodes,
    githubEnvironment: expectedEnvironment,
    routes: matches,
    activationReadback,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = path.resolve("config/youtube-api-project-routing.json");
  const routing = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const result = resolveYouTubeApiEnvironment({
    routing,
    supportCodes: splitCodes(args.support),
    requestedEnvironment: args.environment || "auto",
    activationReadback: args.activationReadback === true,
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`YouTube API environment OK: ${supportCodes.join(",")} -> ${expectedEnvironment}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exit(1);
  }
}
