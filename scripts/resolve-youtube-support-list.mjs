#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  loadCanonicalSupportRouting,
  resolveCanonicalSupports,
} from "./lib/youtube-support-routing.mjs";

const DEFAULT_ROUTING_PATH = "config/youtube-api-project-routing.json";
const DEFAULT_CHANNELS_PATH = "config/youtube-channels.json";

function parseArgs(argv) {
  const options = {
    supports: "ALL",
    supportSource: "variants",
    excludeSupports: [],
    routing: DEFAULT_ROUTING_PATH,
    channels: DEFAULT_CHANNELS_PATH,
    json: false,
  };
  for (const arg of argv) {
    const readValue = () => arg.split("=").slice(1).join("=");
    if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--supports=")) options.supports = readValue();
    else if (arg.startsWith("--support-source=")) options.supportSource = readValue();
    else if (arg.startsWith("--exclude-supports=")) options.excludeSupports = splitCodes(readValue());
    else if (arg.startsWith("--routing=")) options.routing = readValue();
    else if (arg.startsWith("--channels=")) options.channels = readValue();
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/resolve-youtube-support-list.mjs --supports=route:youtube-1 --support-source=variants --json",
    "",
    "Expands ALL, route:youtube-N or explicit support codes from config/youtube-api-project-routing.json.",
  ].join("\n");
}

function normalizeCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

function splitCodes(value) {
  return String(value || "")
    .split(",")
    .map((item) => normalizeCode(item))
    .filter(Boolean);
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function resolveSupports(options, routing) {
  if (!["variants", "channel-keys"].includes(options.supportSource)) {
    throw new Error("--support-source must be variants or channel-keys.");
  }

  return resolveCanonicalSupports({
    requested: options.supports,
    excludeSupports: options.excludeSupports,
    routing,
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const routing = loadCanonicalSupportRouting({
    routingPath: options.routing,
    channelsPath: options.channels,
  });
  const supports = resolveSupports(options, routing);
  if (!supports.length) throw new Error("No support languages resolved.");
  const result = {
    ok: true,
    supports,
    supportsCsv: supports.join(","),
    supportCount: supports.length,
    requestedSupports: options.supports,
    supportSource: options.supportSource,
  };

  if (options.json) console.log(JSON.stringify(result, null, 2));
  else console.log(result.supportsCsv);
}

try {
  main();
} catch (error) {
  console.error(`::error::${error.message}`);
  process.exit(1);
}
