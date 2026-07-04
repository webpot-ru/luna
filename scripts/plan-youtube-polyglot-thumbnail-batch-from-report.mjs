#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const MAX_YOUTUBE_THUMBNAIL_BYTES = 2 * 1024 * 1024;
const DEFAULT_OUTPUT_DIR = "outputs/review";
const FORBIDDEN_SUPPORTS = new Set(["KA", "SR"]);

function parseArgs(argv) {
  const options = {
    report: "",
    setId: "",
    supports: [],
    youtubeEnvironment: "",
    output: "",
    failOnBlockers: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      if (arg.includes("=")) return arg.split("=").slice(1).join("=");
      index += 1;
      return argv[index];
    };

    if (arg === "--report" || arg.startsWith("--report=")) options.report = readValue();
    else if (arg === "--set-id" || arg.startsWith("--set-id=")) options.setId = readValue();
    else if (arg === "--support" || arg.startsWith("--support=")) options.supports = splitCodes(readValue());
    else if (arg === "--youtube-environment" || arg.startsWith("--youtube-environment=")) options.youtubeEnvironment = readValue();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = readValue();
    else if (arg === "--fail-on-blockers") options.failOnBlockers = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/plan-youtube-polyglot-thumbnail-batch-from-report.mjs --report <report.json> [--set-id <set>] [--support EN,RU] [--youtube-environment <env>] [--output <report.json>]",
    "",
    "Validates prepared Polyglot thumbnail rows. Dry-run only: it never calls YouTube.",
  ].join("\n");
}

function normalizeCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

function splitCodes(value) {
  return String(value || "")
    .split(",")
    .map(normalizeCode)
    .filter(Boolean);
}

function readJson(filePath, label) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) throw new Error(`${label} not found: ${filePath}`);
  return JSON.parse(fs.readFileSync(resolved, "utf8"));
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (
      marker === 0xc0
      || marker === 0xc1
      || marker === 0xc2
      || marker === 0xc3
      || marker === 0xc5
      || marker === 0xc6
      || marker === 0xc7
      || marker === 0xc9
      || marker === 0xca
      || marker === 0xcb
      || marker === 0xcd
      || marker === 0xce
      || marker === 0xcf
    ) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
        format: "jpeg",
      };
    }
    if (!length || length < 2) break;
    offset += 2 + length;
  }
  return null;
}

function imageInfo(filePath) {
  const buffer = fs.readFileSync(filePath);
  return {
    sizeBytes: buffer.length,
    dimensions: jpegDimensions(buffer),
    jpgMagic: buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8,
  };
}

function resolveThumbnailPath(row) {
  const candidates = [
    row.thumbnail,
    row.coverPath,
    row.coverRelativePath,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(resolved)) return resolved;
  }

  return candidates.length ? path.resolve(candidates[0]) : "";
}

function blockerSummary(rows) {
  const counts = {};
  for (const row of rows) {
    for (const reason of row.blockers) counts[reason] = (counts[reason] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function bySupportSummary(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = row.supportLang;
    if (!map.has(key)) {
      map.set(key, {
        supportLang: key,
        channelKey: row.channelKey || "",
        routeEnvironment: row.routeEnvironment || "",
        total: 0,
        ready: 0,
        blocked: 0,
        bundles: [],
      });
    }
    const item = map.get(key);
    item.total += 1;
    if (row.status === "ready") item.ready += 1;
    else item.blocked += 1;
    item.bundles.push(row.bundleKey);
  }
  return [...map.values()]
    .map((item) => ({
      ...item,
      bundles: [...new Set(item.bundles)].filter(Boolean).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.supportLang.localeCompare(b.supportLang));
}

function validateRow(row, options) {
  const supportLang = normalizeCode(row.supportLang);
  const blockers = [];

  if (row.status !== "ready") blockers.push("source_row_not_ready");
  if (row.videoType !== "polyglot") blockers.push("not_polyglot");
  if (row.contentScope !== "full") blockers.push("not_full_scope");
  if (FORBIDDEN_SUPPORTS.has(supportLang)) blockers.push("forbidden_support");
  if (!row.setId) blockers.push("missing_set_id");
  if (options.setId && row.setId !== options.setId) blockers.push("set_id_mismatch");
  if (!supportLang) blockers.push("missing_support_lang");
  if (!row.bundleKey) blockers.push("missing_bundle_key");
  if (!row.youtubeVideoId) blockers.push("missing_video_id");
  if (!row.routeEnvironment) blockers.push("missing_route_environment");
  if (options.youtubeEnvironment && row.routeEnvironment !== options.youtubeEnvironment) blockers.push("route_environment_mismatch");

  const thumbnailPath = resolveThumbnailPath(row);
  let coverSizeBytes = 0;
  let coverDimensions = null;
  if (!thumbnailPath || !fs.existsSync(thumbnailPath)) {
    blockers.push("missing_thumbnail");
  } else {
    const ext = path.extname(thumbnailPath).toLowerCase();
    if (ext !== ".jpg" && ext !== ".jpeg") blockers.push("not_jpg");
    try {
      const info = imageInfo(thumbnailPath);
      coverSizeBytes = info.sizeBytes;
      coverDimensions = info.dimensions;
      if (!info.jpgMagic) blockers.push("not_jpg");
      if (coverSizeBytes > MAX_YOUTUBE_THUMBNAIL_BYTES) blockers.push("over_2mb");
      if (!coverDimensions) blockers.push("dimensions_unreadable");
      else if (coverDimensions.width !== 1280 || coverDimensions.height !== 720) blockers.push("wrong_dimensions");
    } catch {
      blockers.push("thumbnail_read_failed");
    }
  }

  return {
    ...row,
    status: blockers.length ? "blocked" : "ready",
    blockers,
    supportLang,
    thumbnail: thumbnailPath ? path.relative(process.cwd(), thumbnailPath) : "",
    coverSizeBytes,
    coverDimensions,
  };
}

function defaultOutputPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(DEFAULT_OUTPUT_DIR, `youtube-polyglot-thumbnail-batch-plan-${stamp}.json`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.report) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }

  const sourceReportPath = path.resolve(options.report);
  const sourceReport = readJson(sourceReportPath, "Polyglot thumbnail report");
  const supportFilter = new Set(options.supports);
  const sourceRows = ensureArray(sourceReport.readyRows).filter((row) => {
    const support = normalizeCode(row.supportLang);
    if (supportFilter.size && !supportFilter.has(support)) return false;
    return true;
  });

  const rows = sourceRows.map((row) => validateRow(row, options));
  const readyRows = rows.filter((row) => row.status === "ready");
  const blockedRows = rows.filter((row) => row.status !== "ready");
  const report = {
    generatedAt: new Date().toISOString(),
    mode: "dry-run",
    action: "youtube_polyglot_thumbnail_batch_set_from_report",
    sourceReportPath,
    setId: options.setId || sourceReport.setId || "",
    filters: {
      supports: options.supports,
      youtubeEnvironment: options.youtubeEnvironment || "",
    },
    summary: {
      totalRows: rows.length,
      readyRows: readyRows.length,
      blockedRows: blockedRows.length,
      status: blockedRows.length ? (readyRows.length ? "partial" : "blocked") : "ready",
      bySupport: bySupportSummary(rows),
      blockedReasons: blockerSummary(blockedRows),
    },
    readyRows,
    blockedRows,
    rows,
  };

  const output = path.resolve(options.output || defaultOutputPath());
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    reportPath: path.relative(process.cwd(), output),
    totalRows: report.summary.totalRows,
    readyRows: report.summary.readyRows,
    blockedRows: report.summary.blockedRows,
    bySupport: report.summary.bySupport,
    blockedReasons: report.summary.blockedReasons,
  }, null, 2));

  if (options.failOnBlockers && blockedRows.length) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
