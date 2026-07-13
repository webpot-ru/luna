#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { sameViewerLanguageTargetBlocker } from "./lib/youtube-language-pair-policy.mjs";
import { languageSpreadsheetCodes } from "./lib/language-order.mjs";
import {
  buildPublicationControlReport,
  normalizeCode,
  resolvePolyglotBundleTargets,
} from "./lib/youtube-publication-control.mjs";
import { findChannelForSupport, loadYoutubeChannels } from "./lib/youtube-playlists.mjs";

function parseArgs(argv) {
  const options = {
    setId: "",
    supports: [],
    targets: null,
    ordinaryRegistry: "config/youtube-published-videos.json",
    polyglotRegistry: "config/youtube-polyglot-published-videos.json",
    calendar: "config/youtube-publish-calendar.json",
    channelConfig: "config/youtube-channels.json",
    schedulePolicy: "config/youtube-publish-schedule-policy.json",
    polyglotBundleConfig: "config/polyglot-video-bundles.json",
    polyglotBundles: null,
    blockExistingTargets: false,
    proposedPolyglotKey: "",
    liveAudit: "",
    output: "outputs/youtube-publication-control.json",
    strict: false,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--set" || arg.startsWith("--set=")) options.setId = value();
    else if (arg === "--support" || arg.startsWith("--support=")) options.supports = value().split(",").map(normalizeCode).filter(Boolean);
    else if (arg === "--targets" || arg.startsWith("--targets=")) options.targets = value().split(",").map(normalizeCode).filter(Boolean);
    else if (arg === "--ordinary-registry" || arg.startsWith("--ordinary-registry=")) options.ordinaryRegistry = value();
    else if (arg === "--polyglot-registry" || arg.startsWith("--polyglot-registry=")) options.polyglotRegistry = value();
    else if (arg === "--calendar" || arg.startsWith("--calendar=")) options.calendar = value();
    else if (arg === "--channel-config" || arg.startsWith("--channel-config=")) options.channelConfig = value();
    else if (arg === "--schedule-policy" || arg.startsWith("--schedule-policy=")) options.schedulePolicy = value();
    else if (arg === "--polyglot-bundle-config" || arg.startsWith("--polyglot-bundle-config=")) options.polyglotBundleConfig = value();
    else if (arg === "--polyglot-bundles" || arg.startsWith("--polyglot-bundles=")) {
      const raw = value();
      options.polyglotBundles = String(raw).toUpperCase() === "NONE" ? [] : raw.split(",").map((item) => item.trim()).filter(Boolean);
    }
    else if (arg === "--block-existing-targets") options.blockExistingTargets = true;
    else if (arg === "--proposed-polyglot-key" || arg.startsWith("--proposed-polyglot-key=")) options.proposedPolyglotKey = value();
    else if (arg === "--live-audit" || arg.startsWith("--live-audit=")) options.liveAudit = value();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
    else if (arg === "--strict") options.strict = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath, fallback = {}) {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function targetsForSupport(supportLang, requestedTargets) {
  const raw = requestedTargets || languageSpreadsheetCodes;
  return [...new Set(raw.map(normalizeCode).filter(Boolean))]
    .filter((targetLang) => !sameViewerLanguageTargetBlocker({ supportLang, targetLang }))
    .sort();
}

function uniqueCodes(values) {
  return [...new Set((values || []).map(normalizeCode).filter(Boolean))];
}

function polyglotAssignmentsForSupports({ setId, supports, bundleConfig, requestedBundleKeys }) {
  const bundleKeys = requestedBundleKeys ?? bundleConfig.defaults?.productionBundleKeys ?? [];
  const bundleByKey = new Map((bundleConfig.bundles || []).map((bundle) => [bundle.key, bundle]));
  const unknown = bundleKeys.filter((key) => !bundleByKey.has(key));
  if (unknown.length) throw new Error(`Unknown production Polyglot bundles: ${unknown.join(",")}`);
  const assignments = {};
  for (const supportLang of supports) {
    assignments[supportLang] = bundleKeys.map((bundleKey) => {
      const targetLangs = resolvePolyglotBundleTargets(bundleByKey.get(bundleKey), supportLang).targetLangs;
      const targetHash = crypto.createHash("sha256").update(targetLangs.join(",")).digest("hex").slice(0, 12);
      return {
        bundleKey,
        targetLangs,
        polyglotKey: ["polyglot", setId, normalizeCode(supportLang), bundleKey, targetHash].join(":"),
      };
    });
  }
  return { assignments, bundleKeys };
}

function ymdInZone(date, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDaysYmd(ymd, days) {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days, 12)).toISOString().slice(0, 10);
}

function gapStartDatesForSupports({ supports, channelConfig, schedulePolicy, now = new Date() }) {
  const channels = loadYoutubeChannels(channelConfig).channels;
  const policy = readJson(schedulePolicy, { default: {}, channels: {} });
  const result = {};
  for (const supportLang of supports) {
    const channel = findChannelForSupport(channels, supportLang);
    if (!channel?.key) continue;
    const defaults = policy.default || {};
    const override = policy.channels?.[channel.key] || {};
    const timeZone = override.timezone || defaults.timezone || "Etc/UTC";
    const delayDays = Number(override.defaultStartDelayDays ?? defaults.defaultStartDelayDays ?? 1);
    result[channel.key] = addDaysYmd(ymdInZone(now, timeZone), delayDays);
  }
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.setId || !options.supports.length) {
    console.log("Usage: node scripts/check-youtube-publication-control.mjs --set <id> --support EN[,RU] [--targets DE,FR] [--polyglot-bundles global_europe_core,...] [--live-audit=<file>] [--strict]");
    process.exit(options.help ? 0 : 1);
  }
  if (options.strict && !options.liveAudit) throw new Error("--strict requires --live-audit from a fresh authenticated readback");
  if (options.blockExistingTargets && !options.targets?.length) throw new Error("--block-existing-targets requires explicit --targets");
  const liveAudit = readJson(options.liveAudit, null);
  if (options.strict) {
    if (liveAudit?.setId !== options.setId) throw new Error(`Strict live audit set mismatch: expected ${options.setId}, got ${liveAudit?.setId || "missing"}`);
    if (liveAudit?.videoStatusReadback !== true) throw new Error("Strict live audit requires videos.list status readback");
    const auditedSupports = new Set((liveAudit.supports || []).map(normalizeCode));
    const missingSupports = options.supports.filter((support) => !auditedSupports.has(support));
    if (missingSupports.length) throw new Error(`Strict live audit is missing supports: ${missingSupports.join(",")}`);
    const generatedAt = Date.parse(liveAudit.generatedAt || "");
    if (!Number.isFinite(generatedAt) || Date.now() - generatedAt > 30 * 60 * 1000 || generatedAt > Date.now() + 60_000) {
      throw new Error(`Strict live audit is stale or invalid: ${liveAudit.generatedAt || "missing generatedAt"}`);
    }
  }
  const desiredTargetsBySupport = {};
  for (const supportLang of options.supports) {
    desiredTargetsBySupport[supportLang] = targetsForSupport(supportLang, options.targets);
  }
  const bundleConfig = readJson(options.polyglotBundleConfig, { defaults: {}, bundles: [] });
  const polyglotProduct = polyglotAssignmentsForSupports({
    setId: options.setId,
    supports: options.supports,
    bundleConfig,
    requestedBundleKeys: options.polyglotBundles,
  });
  const report = buildPublicationControlReport({
    ordinaryRegistry: readJson(options.ordinaryRegistry, { publications: [] }),
    polyglotRegistry: readJson(options.polyglotRegistry, { publications: [] }),
    calendar: readJson(options.calendar, { reservations: [] }),
    liveAudit,
    setId: options.setId,
    supports: options.supports,
    desiredTargetsBySupport,
    desiredPolyglotAssignmentsBySupport: polyglotProduct.assignments,
    proposedOrdinaryAssignments: options.blockExistingTargets
      ? options.supports.flatMap((supportLang) => options.targets.map((targetLang) => ({ setId: options.setId, supportLang, targetLang })))
      : [],
    proposedPolyglotAssignments: options.proposedPolyglotKey
      ? options.supports.map((supportLang) => ({
        setId: options.setId,
        supportLang,
        bundleKey: options.proposedPolyglotKey.split(":")[3] || "",
        targetLangs: options.targets || [],
        polyglotKey: options.proposedPolyglotKey,
      }))
      : [],
    gapStartDateByChannel: gapStartDatesForSupports({
      supports: options.supports,
      channelConfig: options.channelConfig,
      schedulePolicy: options.schedulePolicy,
    }),
    requireCompleteLiveAudit: options.strict,
  });
  report.productPolicy = {
    ordinaryTargets: options.targets ? "explicit" : "all_eligible",
    ordinaryTargetSource: options.targets ? "workflow_input" : "config/language-order.json",
    polyglotBundleKeys: polyglotProduct.bundleKeys,
  };
  report.evidence = {
    strict: options.strict,
    liveAuditPath: options.liveAudit || "",
    liveAuditGeneratedAt: liveAudit?.generatedAt || "",
    videoStatusReadback: liveAudit?.videoStatusReadback === true,
    paginationComplete: liveAudit?.paginationComplete === true,
  };
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report.summary, null, 2));
  if (options.strict && report.blockers.length) {
    throw new Error(`YouTube publication control blocked: ${report.blockers.map((item) => item.type).join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
