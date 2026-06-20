#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const COLLAPSED_VARIANTS = new Map([
  ["EN-GB", "EN"],
  ["ES-419", "ES"],
  ["PT-BR", "PT"],
]);

function parseArgs(argv) {
  const options = {
    languageOrder: "config/language-order.json",
    channelConfig: "config/youtube-channels.json",
    inventory: "config/youtube-channel-inventory.json",
    tokenDir: ".local/youtube-oauth/tokens",
    json: false,
  };

  for (const arg of argv) {
    if (arg === "--json") options.json = true;
    else if (arg.startsWith("--language-order=")) options.languageOrder = arg.slice("--language-order=".length);
    else if (arg.startsWith("--channel-config=")) options.channelConfig = arg.slice("--channel-config=".length);
    else if (arg.startsWith("--inventory=")) options.inventory = arg.slice("--inventory=".length);
    else if (arg.startsWith("--token-dir=")) options.tokenDir = arg.slice("--token-dir=".length);
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/plan-youtube-channel-tokens.mjs [--json]

Purpose:
  Builds the 51 public support-channel OAuth token checklist from the 54-language
  deck layer by collapsing EN-GB -> EN, ES-419 -> ES and PT-BR -> PT.

Output:
  key, support language variants, existing config handle/id, and local token file status.
`);
}

function resolveProjectPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
}

async function loadJson(filePath) {
  return JSON.parse(await readFile(resolveProjectPath(filePath), "utf8"));
}

async function exists(filePath) {
  try {
    await access(resolveProjectPath(filePath));
    return true;
  } catch {
    return false;
  }
}

function publicCodeFor(language) {
  const code = String(language.spreadsheetCode || "").trim().toUpperCase();
  return COLLAPSED_VARIANTS.get(code) || code;
}

function keyFor(publicCode) {
  return String(publicCode || "").trim().toLowerCase();
}

function sitePathFor(publicCode) {
  return publicCode.toLowerCase();
}

function tokenFileFor(channel, options, key) {
  return channel?.oauthTokenFile || channel?.tokenFile || path.join(options.tokenDir, `${key}.json`);
}

function assignedKeyForInventory(channel) {
  if (channel.assignedSupportKey) return keyFor(channel.assignedSupportKey);
  if (channel.assignedSupportCode) {
    const publicCode = COLLAPSED_VARIANTS.get(String(channel.assignedSupportCode).trim().toUpperCase())
      || String(channel.assignedSupportCode).trim().toUpperCase();
    return keyFor(publicCode);
  }
  return "";
}

async function buildPlan(options) {
  const languages = await loadJson(options.languageOrder);
  const channelConfig = await loadJson(options.channelConfig);
  const inventory = await loadJson(options.inventory).catch(() => ({ channels: [] }));
  const configuredByKey = new Map((channelConfig.channels || []).map((channel) => [channel.key, channel]));
  const inventoryByAssignedKey = new Map(
    (inventory.channels || [])
      .map((channel) => [assignedKeyForInventory(channel), channel])
      .filter(([key]) => key),
  );
  const unassignedInventory = (inventory.channels || []).filter((channel) => !assignedKeyForInventory(channel));
  const grouped = new Map();

  for (const language of languages) {
    const publicCode = publicCodeFor(language);
    const key = keyFor(publicCode);
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        publicCode,
        supportLangs: [],
        languageNames: [],
        siteCoursesUrl: `https://flashcardsluna.com/${sitePathFor(publicCode)}/courses`,
      });
    }
    const group = grouped.get(key);
    group.supportLangs.push(language.spreadsheetCode);
    group.languageNames.push(language.language);
  }

  const rows = [];
  for (const group of grouped.values()) {
    const configured = configuredByKey.get(group.key) || null;
    const assignedInventory = inventoryByAssignedKey.get(group.key) || null;
    const tokenFile = tokenFileFor(configured || assignedInventory, options, group.key);
    const tokenExists = await exists(tokenFile);
    rows.push({
      ...group,
      configured: Boolean(configured),
      currentHandle: configured?.currentHandle || "",
      inventoryTokenKey: assignedInventory?.tokenKey || "",
      inventoryTitle: assignedInventory?.currentTitle || "",
      inventoryHandle: assignedInventory?.currentHandle || "",
      channelId: configured?.channelId || assignedInventory?.channelId || "",
      profileStatus: configured?.profileStatus || "missing_from_config",
      tokenFile,
      tokenExists,
      suggestedAuthCommand: `npm run auth:youtube-channel -- --token-file=${tokenFile}`,
    });
  }

  return {
    rows: rows.sort((a, b) => a.key.localeCompare(b.key)),
    unassignedInventory: unassignedInventory.sort((a, b) => a.tokenKey.localeCompare(b.tokenKey)),
  };
}

function printTable({ rows, unassignedInventory }) {
  const configured = rows.filter((row) => row.configured).length;
  const tokenized = rows.filter((row) => row.tokenExists).length;
  const assignedInventory = rows.filter((row) => row.inventoryTokenKey).length;
  console.log(`YouTube support-channel token plan: ${rows.length} public channels`);
  console.log(`Configured channels: ${configured}`);
  console.log(`Existing per-channel tokens: ${tokenized}`);
  console.log(`Assigned inventory channels: ${assignedInventory}`);
  console.log(`Unassigned inventory channels: ${unassignedInventory.length}`);
  console.log("");
  for (const row of rows) {
    const status = row.tokenExists ? "TOKEN" : "missing-token";
    const config = row.configured ? `@${row.currentHandle || "configured"}` : "not-in-config";
    console.log(`${row.key.padEnd(5)} ${status.padEnd(13)} ${config.padEnd(24)} ${row.supportLangs.join(",")} -> ${row.tokenFile}`);
  }
  if (unassignedInventory.length > 0) {
    console.log("");
    console.log("Unassigned inventory:");
    for (const channel of unassignedInventory) {
      console.log(`${channel.tokenKey.padEnd(14)} @${String(channel.currentHandle || "").padEnd(20)} ${channel.currentTitle} ${channel.channelId}`);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const plan = await buildPlan(options);
  if (options.json) console.log(JSON.stringify({ channels: plan.rows, unassignedInventory: plan.unassignedInventory }, null, 2));
  else printTable(plan);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
