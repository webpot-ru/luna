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
    apply: false,
    confirmYoutubeWrite: false,
    forceConfigured: false,
    continueOnError: false,
    scope: "assigned",
    channels: [],
    exclude: [],
    reportPath: "",
  };

  for (const arg of argv) {
    if (arg === "--apply") {
      options.apply = true;
    } else if (arg === "--confirm-youtube-write") {
      options.confirmYoutubeWrite = true;
    } else if (arg === "--force-configured") {
      options.forceConfigured = true;
    } else if (arg === "--continue-on-error") {
      options.continueOnError = true;
    } else if (arg.startsWith("--scope=")) {
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
  node scripts/apply-youtube-channel-branding-batch.mjs --apply --confirm-youtube-write --scope=assigned
  node scripts/apply-youtube-channel-branding-batch.mjs --apply --confirm-youtube-write --scope=all --force-configured
  node scripts/apply-youtube-channel-branding-batch.mjs --apply --confirm-youtube-write --scope=all --force-configured --exclude=en
  node scripts/apply-youtube-channel-branding-batch.mjs --apply --confirm-youtube-write --channels=it,vi,th

Scopes:
  assigned      Only profileStatus=assigned_needs_api_branding channels.
  all           All configured channels. Use --force-configured to touch configured_readback channels.
  not-configured All channels except profileStatus=configured_readback.

This runner calls scripts/youtube-channel-branding.mjs once per channel.
It writes live YouTube API changes: banner, brandingSettings description and watermark.
It does not change channel name, handle, avatar, contact email or profile links.`);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(path.join(projectRoot, filePath), "utf8"));
}

async function writeJson(filePath, data) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(data, null, 2)}\n`);
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

  if (options.scope === "assigned") {
    return applyExclude(channels.filter((channel) => channel.profileStatus === "assigned_needs_api_branding"));
  }
  if (options.scope === "not-configured") {
    return applyExclude(channels.filter((channel) => channel.profileStatus !== "configured_readback"));
  }
  if (options.scope === "all") {
    return applyExclude(channels);
  }

  throw new Error(`Unknown scope: ${options.scope}`);
}

function runChannelApply(channel, options) {
  const args = [
    "scripts/youtube-channel-branding.mjs",
    "--apply",
    "--confirm-youtube-write",
    `--channel=${channel.key}`,
  ];
  if (options.forceConfigured) args.push("--force-configured");

  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });
    child.on("close", (code) => {
      resolve({
        key: channel.key,
        profileStatus: channel.profileStatus || "",
        exitCode: code,
        ok: code === 0,
        stdoutTail: stdout.split(/\r?\n/).filter(Boolean).slice(-5),
        stderrTail: stderr.split(/\r?\n/).filter(Boolean).slice(-5),
      });
    });
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (!options.apply || !options.confirmYoutubeWrite) {
    throw new Error("Live batch apply requires --apply --confirm-youtube-write.");
  }
  if (options.scope === "all" && !options.forceConfigured) {
    throw new Error("--scope=all requires --force-configured to avoid accidental skips.");
  }

  const config = await readJson(CHANNEL_CONFIG_PATH);
  const channels = selectChannels(config.channels || [], options);
  if (channels.length === 0) throw new Error("No channels selected.");

  const report = {
    generatedAt: new Date().toISOString(),
    scope: options.scope,
    forceConfigured: options.forceConfigured,
    excludedKeys: options.exclude,
    selectedKeys: channels.map((channel) => channel.key),
    results: [],
  };

  console.log(`selected=${channels.length}`);
  console.log(`keys=${report.selectedKeys.join(",")}`);
  for (const channel of channels) {
    console.log(`\n== ${channel.key.toUpperCase()} ==`);
    const result = await runChannelApply(channel, options);
    report.results.push(result);
    if (!result.ok && !options.continueOnError) break;
  }

  const safeTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath =
    options.reportPath ||
    `outputs/youtube-channel-assets/youtube-channel-branding-apply-${safeTimestamp}.json`;
  await writeJson(reportPath, report);

  const ok = report.results.filter((result) => result.ok).length;
  const failed = report.results.filter((result) => !result.ok).length;
  console.log(`\nreport=${reportPath}`);
  console.log(`applied_ok=${ok}`);
  console.log(`failed=${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
