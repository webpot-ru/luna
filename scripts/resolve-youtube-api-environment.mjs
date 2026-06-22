#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    if (arg.startsWith("--support=")) args.support = arg.slice("--support=".length);
    else if (arg.startsWith("--environment=")) args.environment = arg.slice("--environment=".length);
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const supportCodes = splitCodes(args.support);
  if (!supportCodes.length) {
    throw new Error("--support must include at least one support language/channel code.");
  }

  const configPath = path.resolve("config/youtube-api-project-routing.json");
  const routing = JSON.parse(fs.readFileSync(configPath, "utf8"));
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
  const requestedEnvironment = String(args.environment || "auto").trim();
  if (requestedEnvironment && requestedEnvironment !== "auto" && requestedEnvironment !== expectedEnvironment) {
    throw new Error(
      `GitHub environment mismatch: requested ${requestedEnvironment}, expected ${expectedEnvironment} for support=${supportCodes.join(",")}.`,
    );
  }

  const result = {
    ok: true,
    supportCodes,
    githubEnvironment: expectedEnvironment,
    routes: matches,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`YouTube API environment OK: ${supportCodes.join(",")} -> ${expectedEnvironment}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`::error::${error.message}`);
  process.exit(1);
}
