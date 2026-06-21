#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const CHANNEL_CONFIG_PATH = "config/youtube-channels.json";

function parseArgs(argv) {
  const options = {
    scope: "all",
    channels: [],
    exclude: [],
    reportPath: "",
    json: false,
  };

  for (const arg of argv) {
    if (arg.startsWith("--scope=")) {
      options.scope = arg.slice("--scope=".length).trim();
    } else if (arg.startsWith("--channels=")) {
      options.channels = arg
        .slice("--channels=".length)
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
    } else if (arg.startsWith("--exclude=")) {
      options.exclude = arg
        .slice("--exclude=".length)
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
    } else if (arg.startsWith("--report=")) {
      options.reportPath = arg.slice("--report=".length).trim();
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/check-youtube-channel-branding-readback.mjs
  node scripts/check-youtube-channel-branding-readback.mjs --channels=en,ru,es
  node scripts/check-youtube-channel-branding-readback.mjs --scope=all --exclude=en

Checks authorized channels through the existing per-channel OAuth token files.
It verifies channelId, banner presence and description text.
YouTube does not expose watermark state through channels.list; watermark is verified by successful watermarks.set responses.`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(path.join(projectRoot, filePath), "utf8"));
}

async function writeJson(filePath, data) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(data, null, 2)}\n`);
}

function getTokenFile(config, channel) {
  if (channel.oauthTokenFile) return channel.oauthTokenFile;
  const tokenDir = config.defaults?.tokenDir || ".local/youtube-oauth/tokens";
  return path.join(tokenDir, `${channel.key}.json`);
}

function selectChannels(channels, options) {
  const excluded = new Set(options.exclude);
  const applyExclude = (selected) => selected.filter((channel) => !excluded.has(channel.key));

  if (options.channels.length > 0) {
    const wanted = new Set(options.channels);
    const selected = applyExclude(channels.filter((channel) => wanted.has(channel.key)));
    const found = new Set(selected.map((channel) => channel.key));
    const missing = options.channels.filter((key) => !found.has(key) && !excluded.has(key));
    if (missing.length > 0) throw new Error(`Unknown channel key(s): ${missing.join(", ")}`);
    return selected;
  }

  if (options.scope === "all") return applyExclude(channels);
  if (options.scope === "assigned") {
    return applyExclude(channels.filter((channel) => channel.profileStatus === "assigned_needs_api_branding"));
  }
  if (options.scope === "not-configured") {
    return applyExclude(channels.filter((channel) => channel.profileStatus !== "configured_readback"));
  }
  if (options.scope === "configured") {
    return applyExclude(channels.filter((channel) => channel.profileStatus === "configured_readback"));
  }

  throw new Error(`Unknown scope: ${options.scope}`);
}

function normalizeText(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function runListChannels(tokenFile) {
  const args = [
    "scripts/youtube-channel-branding.mjs",
    "--list-channels",
    "--json",
    `--token-file=${tokenFile}`,
  ];

  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      resolve({ exitCode: code, stdout, stderr });
    });
  });
}

async function checkChannel(config, channel) {
  const tokenFile = getTokenFile(config, channel);
  const child = await runListChannels(tokenFile);
  const base = {
    key: channel.key,
    expectedChannelId: channel.channelId || "",
    expectedFinalChannelName: channel.finalChannelName || "",
    publicUrl: channel.publicUrl || "",
    ok: false,
    checks: {},
    manual: {},
    watermarkReadback: "not_available_via_channels.list",
  };

  if (child.exitCode !== 0) {
    return {
      ...base,
      error: "list_channels_failed",
      stderrTail: child.stderr.split(/\r?\n/).filter(Boolean).slice(-3),
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(child.stdout);
  } catch {
    return {
      ...base,
      error: "list_channels_json_parse_failed",
      stdoutTail: child.stdout.split(/\r?\n/).filter(Boolean).slice(-3),
    };
  }

  const authorizedChannels = parsed.channels || [];
  const matched = authorizedChannels.find((item) => item.channelId === channel.channelId) || authorizedChannels[0] || {};
  const descriptionMatches =
    normalizeText(matched.description) === normalizeText(channel.desiredDescription);
  const channelIdMatches = Boolean(channel.channelId) && matched.channelId === channel.channelId;
  const hasBanner = matched.hasBanner === true;
  const titleMatchesFinalName =
    normalizeText(matched.title) === normalizeText(channel.finalChannelName);

  const checks = {
    authorizedChannelCount: authorizedChannels.length,
    channelIdMatches,
    descriptionMatches,
    hasBanner,
  };
  const manual = {
    title: matched.title || "",
    snippetTitle: matched.snippetTitle || "",
    brandingTitle: matched.brandingTitle || "",
    titleMatchesFinalName,
    customUrl: matched.customUrl || "",
    publicLinksNeedStudioCheck: true,
    avatarNeedStudioCheck: true,
    contactEmailNeedStudioCheck: true,
  };

  return {
    ...base,
    actualChannelId: matched.channelId || "",
    ok: channelIdMatches && descriptionMatches && hasBanner,
    checks,
    manual,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const config = await readJson(CHANNEL_CONFIG_PATH);
  const channels = selectChannels(config.channels || [], options);
  if (channels.length === 0) throw new Error("No channels selected.");

  const report = {
    generatedAt: new Date().toISOString(),
    scope: options.scope,
    excludedKeys: options.exclude,
    selectedKeys: channels.map((channel) => channel.key),
    watermarkReadback: "YouTube channels.list does not expose channel watermark state; use the apply reports as write evidence.",
    results: [],
  };

  for (const channel of channels) {
    const result = await checkChannel(config, channel);
    report.results.push(result);
    if (!options.json) {
      const status = result.ok ? "ok" : "FAIL";
      const titleStatus = result.manual?.titleMatchesFinalName ? "title-ok" : "title-manual";
      console.log(
        `${channel.key.toUpperCase()} ${status} channelId=${result.checks?.channelIdMatches ? "ok" : "fail"} banner=${result.checks?.hasBanner ? "ok" : "fail"} description=${result.checks?.descriptionMatches ? "ok" : "fail"} ${titleStatus}`
      );
    }
  }

  const safeTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath =
    options.reportPath ||
    `outputs/youtube-channel-assets/youtube-channel-branding-readback-${safeTimestamp}.json`;
  await writeJson(reportPath, report);

  const ok = report.results.filter((result) => result.ok).length;
  const failed = report.results.filter((result) => !result.ok).length;
  const manualTitleMismatches = report.results.filter(
    (result) => result.manual && result.manual.titleMatchesFinalName === false
  ).length;

  if (options.json) {
    console.log(JSON.stringify({ reportPath, ok, failed, manualTitleMismatches, report }, null, 2));
  } else {
    console.log(`\nreport=${reportPath}`);
    console.log(`readback_ok=${ok}`);
    console.log(`readback_failed=${failed}`);
    console.log(`manual_title_mismatches=${manualTitleMismatches}`);
  }

  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
