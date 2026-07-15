#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  canonicalSupportCode,
  isPolyglotRow,
  polyglotContentScope,
  polyglotProductSlotKey,
} from "./lib/youtube-publication-control.mjs";

function parseArgs(argv) {
  const options = {
    report: "",
    setId: "",
    output: "",
    requireClean: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => arg.includes("=") ? arg.split("=").slice(1).join("=") : argv[++index];
    if (arg === "--report" || arg.startsWith("--report=")) options.report = value();
    else if (arg === "--set" || arg.startsWith("--set=")) options.setId = value();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = value();
    else if (arg === "--require-clean") options.requireClean = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isLivePolyglot(row, setId) {
  if (!isPolyglotRow(row)) return false;
  if (String(row?.setId || "") !== String(setId || "")) return false;
  if (row?.liveReadbackPresent !== true) return false;
  const status = String(row?.publicationStatus || row?.status || "").toLowerCase();
  return !["failed", "deleted", "superseded", "cancel"].some((token) => status.includes(token));
}

export function auditPolyglotYoutubeScopeConflicts({ report, setId }) {
  const reportSummary = report?.summary || {};
  const rows = (report?.publications || []).filter((row) => isLivePolyglot(row, setId));
  const groups = new Map();
  for (const row of rows) {
    const key = polyglotProductSlotKey(row);
    const values = groups.get(key) || [];
    values.push(row);
    groups.set(key, values);
  }
  const slots = [...groups.entries()].map(([productSlotKey, values]) => {
    const scopes = [...new Set(values.map(polyglotContentScope))].sort();
    const first = values[0] || {};
    return {
      productSlotKey,
      supportLang: canonicalSupportCode(first.supportLang),
      bundleKey: String(first.bundleKey || ""),
      scopes,
      state: scopes.length > 1 ? "mixed_short_and_full" : (scopes[0] === "short_unverified" ? "short_only" : "full_only"),
      videos: values.map((row) => ({
        youtubeVideoId: row.youtubeVideoId || "",
        youtubeVideoUrl: row.youtubeVideoUrl || "",
        contentScope: polyglotContentScope(row),
        privacyStatus: row.privacyStatus || "",
        publishAt: row.publishAt || row.scheduledPublishAt || "",
        durableRegistryPresent: row.durableRegistryPresent === true,
      })).sort((left, right) => left.youtubeVideoId.localeCompare(right.youtubeVideoId)),
    };
  }).sort((left, right) => left.productSlotKey.localeCompare(right.productSlotKey));
  const mixed = slots.filter((slot) => slot.state === "mixed_short_and_full");
  const shortOnly = slots.filter((slot) => slot.state === "short_only");
  const fullOnly = slots.filter((slot) => slot.state === "full_only");
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: "polyglot_short_full_live_scope_audit",
    sourceReportGeneratedAt: report?.generatedAt || "",
    sourceGates: {
      complete: reportSummary.complete === true,
      paginationComplete: reportSummary.paginationComplete === true,
      videoStatusReadbackComplete: reportSummary.videoStatusReadbackComplete === true,
    },
    setId,
    slots,
    summary: {
      activePolyglotRows: rows.length,
      productSlots: slots.length,
      fullOnlySlots: fullOnly.length,
      shortOnlySlots: shortOnly.length,
      mixedShortFullSlots: mixed.length,
      clean: reportSummary.complete === true
        && reportSummary.paginationComplete === true
        && reportSummary.videoStatusReadbackComplete === true
        && mixed.length === 0,
      youtubeWrites: 0,
    },
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.report || !options.setId) {
    console.log("node scripts/audit-polyglot-youtube-scope-conflicts.mjs --report=<youtube-publication-control.json> --set=<set_id> [--require-clean] [--output=<report.json>]");
    process.exit(options.help ? 0 : 1);
  }
  const result = auditPolyglotYoutubeScopeConflicts({ report: readJson(options.report), setId: options.setId });
  if (options.output) {
    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    fs.writeFileSync(options.output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(result.summary, null, 2));
  if (options.requireClean && !result.summary.clean) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
