#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import { BRAND_NAME } from "./lib/brand.mjs";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function parseArgs(argv) {
  const options = {
    inputs: [],
    outputPrefix: "outputs/video-generator/youtube-thumbnail-review",
    columns: 4,
    requirePublishAt: false,
    failOnWarnings: false,
    allowAutoFirstFrame: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      if (arg.includes("=")) return arg.split("=").slice(1).join("=");
      index += 1;
      return argv[index];
    };

    if (arg === "--output-prefix" || arg.startsWith("--output-prefix=")) options.outputPrefix = readValue();
    else if (arg === "--columns" || arg.startsWith("--columns=")) options.columns = Number(readValue());
    else if (arg === "--require-publish-at") options.requirePublishAt = true;
    else if (arg === "--fail-on-warnings") options.failOnWarnings = true;
    else if (arg === "--allow-auto-first-frame") options.allowAutoFirstFrame = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else options.inputs.push(arg);
  }

  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/build-youtube-thumbnail-review-sheet.mjs <metadata-file-or-dir> [...]",
    "",
    "Builds a non-secret thumbnail review bundle:",
    "  <output-prefix>.json",
    "  <output-prefix>.csv",
    "  <output-prefix>.html",
    "  <output-prefix>.svg",
    "",
    "The bundle maps every thumbnail to set/support/target/title/playlist/publishAt for pre-upload review.",
    "Use --allow-auto-first-frame for channels where YouTube custom thumbnails are unavailable and metadata declares thumbnailUploadMode=first_frame_auto.",
  ].join("\n");
}

function collectMetadataFiles(inputs) {
  const files = [];
  for (const input of inputs) {
    const resolved = path.resolve(input);
    if (!fs.existsSync(resolved)) throw new Error(`Path not found: ${input}`);
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(resolved, { withFileTypes: true })) {
        const full = path.join(resolved, entry.name);
        if (entry.isDirectory()) files.push(...collectMetadataFiles([full]));
        else if (entry.isFile() && entry.name === "youtube_metadata.json") files.push(full);
      }
    } else if (stat.isFile() && path.basename(resolved) === "youtube_metadata.json") {
      files.push(resolved);
    } else {
      throw new Error(`Expected youtube_metadata.json or a directory: ${input}`);
    }
  }
  return [...new Set(files)].sort();
}

function normalizeCode(value) {
  return String(value || "").trim().replace(/_/gu, "-").toUpperCase();
}

function cleanText(value) {
  return String(value || "").replace(/\s+/gu, " ").trim();
}

function truncateText(value, maxLength) {
  const text = cleanText(value);
  const chars = Array.from(text);
  if (chars.length <= maxLength) return text;
  return `${chars.slice(0, Math.max(1, maxLength - 1)).join("").trim()}...`;
}

function relativeProjectPath(filePath) {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function resolveMaybeProjectPath(filePath, metadataFile) {
  if (!filePath || typeof filePath !== "string") return "";
  if (path.isAbsolute(filePath)) return filePath;
  const fromProject = path.resolve(filePath);
  if (fs.existsSync(fromProject)) return fromProject;
  return path.resolve(path.dirname(metadataFile), filePath);
}

function findThumbnailFile(metadataFile, metadata) {
  const explicit = metadata.thumbnailPath || metadata.thumbnail || metadata.thumbnailFile;
  const explicitPath = resolveMaybeProjectPath(explicit, metadataFile);
  if (explicitPath && fs.existsSync(explicitPath)) return explicitPath;

  const dir = path.dirname(metadataFile);
  return fs.readdirSync(dir)
    .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .filter((name) => /(?:^|[-_])(thumbnail|thumb|cover|poster)(?:[-_.]|$)/iu.test(name))
    .map((name) => path.join(dir, name))
    .sort()[0] || "";
}

function readOptionalJson(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function thumbnailMetadataPath(metadataFile, metadata) {
  const explicit = resolveMaybeProjectPath(metadata.thumbnailMetadataPath, metadataFile);
  if (explicit && fs.existsSync(explicit)) return explicit;
  const adjacent = path.join(path.dirname(metadataFile), "youtube_thumbnail_metadata.json");
  return fs.existsSync(adjacent) ? adjacent : "";
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/gu, '""')}"`;
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

function htmlEscape(value) {
  return xmlEscape(value).replace(/'/gu, "&#39;");
}

function hrefFrom(outputPath, assetPath) {
  return path.relative(path.dirname(path.resolve(outputPath)), path.resolve(assetPath)).replace(/\\/g, "/");
}

function expectedThumbnailLines(metadata) {
  const targetName = truncateText(metadata.targetLanguageName || metadata.targetLang || "Language", 28);
  const level = truncateText(metadata.level || "A1", 12);
  const deckTitle = truncateText(cleanText(metadata.deckTitle || metadata.title || "Vocabulary").replace(/[.!?。！？։။။।]+$/u, ""), 38);
  return [BRAND_NAME, `${targetName} ${level}`.trim(), deckTitle];
}

function buildRows(metadataFiles, options) {
  const blockers = [];
  const warnings = [];
  const seenKeys = new Map();

  const rows = metadataFiles.map((metadataFile, index) => {
    const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
    const setId = String(metadata.setId || "");
    const supportLang = normalizeCode(metadata.supportLang);
    const targetLang = normalizeCode(metadata.targetLang);
    const key = [setId, supportLang, targetLang].join("|");
    const publishAt = metadata.publishAt || metadata.scheduledPublishAt || "";
    const thumbnailPath = findThumbnailFile(metadataFile, metadata);
    const thumbMetaPath = thumbnailMetadataPath(metadataFile, metadata);
    const thumbMeta = readOptionalJson(thumbMetaPath);
    const autoFirstFrame = metadata.thumbnailUploadMode === "first_frame_auto"
      || metadata.thumbnailSource === "youtube-auto-first-frame";
    const rowBlockers = [];
    const rowWarnings = [];

    if (!setId) rowBlockers.push("missing setId");
    if (!supportLang) rowBlockers.push("missing supportLang");
    if (!targetLang) rowBlockers.push("missing targetLang");
    if (!metadata.title) rowWarnings.push("missing title");
    if (!thumbnailPath) {
      if (options.allowAutoFirstFrame && autoFirstFrame) {
        rowWarnings.push("custom thumbnail unavailable; YouTube auto first-frame fallback");
      } else {
        rowBlockers.push("missing thumbnail");
      }
    }
    if (options.requirePublishAt && !publishAt) rowBlockers.push("missing publishAt for scheduled run");
    if (seenKeys.has(key)) rowBlockers.push(`duplicate key also in ${seenKeys.get(key)}`);
    else seenKeys.set(key, relativeProjectPath(metadataFile));

    const thumbnailSizeBytes = thumbnailPath ? fs.statSync(thumbnailPath).size : 0;
    if (thumbnailPath && thumbnailSizeBytes === 0) rowBlockers.push("empty thumbnail file");
    if (thumbnailPath && !metadata.thumbnailPath && !metadata.thumbnail) rowWarnings.push("thumbnail exists but metadata has no thumbnailPath");

    const row = {
      order: index + 1,
      key,
      setId,
      supportLang,
      targetLang,
      title: cleanText(metadata.title),
      deckTitle: cleanText(metadata.deckTitle),
      targetLanguageName: cleanText(metadata.targetLanguageName),
      level: cleanText(metadata.level),
      playlist_key: metadata.playlist_key || metadata.playlistKey || "",
      privacyStatus: metadata.privacyStatus || "",
      publishAt,
      scheduledPublishAt: metadata.scheduledPublishAt || "",
      expectedThumbnailLines: expectedThumbnailLines(metadata),
      metadataSource: metadata.source || "",
      metadataModel: metadata.model || metadata.geminiModel || "",
      metadataFile: relativeProjectPath(metadataFile),
      thumbnailPath: thumbnailPath ? relativeProjectPath(thumbnailPath) : "",
      thumbnailMetadataPath: thumbMetaPath ? relativeProjectPath(thumbMetaPath) : "",
      thumbnailSource: metadata.thumbnailSource || thumbMeta?.provider || "",
      thumbnailUploadMode: metadata.thumbnailUploadMode || (thumbnailPath ? "custom" : ""),
      thumbnailFallbackReason: metadata.thumbnailFallbackReason || "",
      thumbnailModel: thumbMeta?.model || "",
      thumbnailLogoOverlay: Boolean(metadata.thumbnailLogoOverlay || thumbMeta?.logoOverlay),
      thumbnailLogoAsset: metadata.thumbnailLogoAsset || thumbMeta?.logoAsset || "",
      thumbnailSizeBytes,
      blockers: rowBlockers,
      warnings: rowWarnings,
    };
    blockers.push(...rowBlockers.map((item) => `${key}: ${item}`));
    warnings.push(...rowWarnings.map((item) => `${key}: ${item}`));
    return row;
  });

  return { rows, blockers, warnings };
}

function writeCsv(csvPath, rows) {
  const headers = [
    "order",
    "key",
    "setId",
    "supportLang",
    "targetLang",
    "title",
    "deckTitle",
    "targetLanguageName",
    "level",
    "playlist_key",
    "privacyStatus",
    "publishAt",
    "expectedThumbnailLines",
    "thumbnailPath",
    "thumbnailMetadataPath",
    "thumbnailSource",
    "thumbnailUploadMode",
    "thumbnailFallbackReason",
    "thumbnailModel",
    "thumbnailLogoOverlay",
    "metadataFile",
    "blockers",
    "warnings",
  ];
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => {
      const value = Array.isArray(row[header]) ? row[header].join(" | ") : row[header];
      return csvEscape(value);
    }).join(",")),
  ];
  fs.writeFileSync(csvPath, `${lines.join("\n")}\n`, "utf8");
}

function writeHtml(htmlPath, rows, report) {
  const cards = rows.map((row) => {
    const imgSrc = row.thumbnailPath ? hrefFrom(htmlPath, row.thumbnailPath) : "";
    const expected = row.expectedThumbnailLines.map(htmlEscape).join("<br>");
    const statusClass = row.blockers.length ? "blocked" : row.warnings.length ? "warning" : "ok";
    return [
      `<article class="card ${statusClass}">`,
      imgSrc
        ? `<img src="${htmlEscape(imgSrc)}" alt="${htmlEscape(row.key)}">`
        : `<div class="missing">${row.thumbnailUploadMode === "first_frame_auto" ? "Auto first-frame thumbnail" : "Missing thumbnail"}</div>`,
      `<div class="meta">`,
      `<div class="k">${row.order}. ${htmlEscape(row.supportLang)} -> ${htmlEscape(row.targetLang)}</div>`,
      `<div class="title">${htmlEscape(row.title || row.deckTitle || row.key)}</div>`,
      `<div class="line"><b>Expected text:</b><br>${expected}</div>`,
      `<div class="line"><b>Playlist:</b> ${htmlEscape(row.playlist_key || "(missing)")}</div>`,
      `<div class="line"><b>PublishAt:</b> ${htmlEscape(row.publishAt || "(not scheduled)")}</div>`,
      row.blockers.length ? `<div class="bad"><b>Blockers:</b> ${htmlEscape(row.blockers.join("; "))}</div>` : "",
      row.warnings.length ? `<div class="warn"><b>Warnings:</b> ${htmlEscape(row.warnings.join("; "))}</div>` : "",
      `</div>`,
      `</article>`,
    ].join("\n");
  }).join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>YouTube Thumbnail Review</title>
  <style>
    body { margin: 0; font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f4f7f9; color: #12243a; }
    header { position: sticky; top: 0; z-index: 2; padding: 14px 18px; background: rgba(255,255,255,.96); border-bottom: 1px solid #d8e1ea; }
    h1 { margin: 0 0 4px; font-size: 20px; }
    .summary { color: #506178; }
    main { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 16px; padding: 16px; }
    .card { background: #fff; border: 1px solid #d7e0ea; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(16,36,58,.06); }
    .card.blocked { border-color: #d94646; }
    .card.warning { border-color: #d9951d; }
    img, .missing { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: #dfe8f1; }
    .missing { display: grid; place-items: center; color: #a33; font-weight: 700; }
    .meta { padding: 12px; }
    .k { font-weight: 800; color: #213a5a; }
    .title { margin: 4px 0 8px; font-weight: 650; }
    .line { margin-top: 6px; color: #344a63; }
    .bad { margin-top: 8px; color: #a51d1d; }
    .warn { margin-top: 8px; color: #8a5a00; }
  </style>
</head>
<body>
  <header>
    <h1>YouTube Thumbnail Review</h1>
    <div class="summary">Generated ${htmlEscape(report.generatedAt)} | status ${htmlEscape(report.status)} | thumbnails ${report.summary.thumbnailCount}/${report.summary.rowCount} | blockers ${report.summary.blockerCount} | warnings ${report.summary.warningCount}</div>
  </header>
  <main>
${cards}
  </main>
</body>
</html>
`;
  fs.writeFileSync(htmlPath, html, "utf8");
}

function wrapText(value, maxChars, maxLines) {
  const words = cleanText(value).split(" ").filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (Array.from(next).length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines);
}

function writeSvg(svgPath, rows, report, columns) {
  const safeColumns = Math.max(1, Math.min(Math.floor(Number(columns) || 4), 8));
  const thumbW = 320;
  const thumbH = 180;
  const pad = 16;
  const labelH = 104;
  const cellW = thumbW + pad * 2;
  const cellH = thumbH + labelH + pad * 2;
  const headerH = 86;
  const rowCount = Math.max(1, Math.ceil(rows.length / safeColumns));
  const width = safeColumns * cellW;
  const height = headerH + rowCount * cellH;

  const cells = rows.map((row, index) => {
    const col = index % safeColumns;
    const line = Math.floor(index / safeColumns);
    const x = col * cellW + pad;
    const y = headerH + line * cellH + pad;
    const imgHref = row.thumbnailPath ? hrefFrom(svgPath, row.thumbnailPath) : "";
    const titleLines = wrapText(row.title || row.deckTitle || row.key, 40, 2);
    const status = row.blockers.length ? "BLOCKED" : row.warnings.length ? "WARN" : "OK";
    const stroke = row.blockers.length ? "#d94646" : row.warnings.length ? "#d9951d" : "#d7e0ea";
    const publishAt = row.publishAt ? row.publishAt.replace("T", " ").replace(/:\d\d\.\d\d\dZ$/u, "Z") : "not scheduled";
    const titleSvg = titleLines.map((text, i) => (
      `<text x="${x}" y="${y + thumbH + 46 + i * 17}" class="small">${xmlEscape(text)}</text>`
    )).join("\n");
    return `<g>
  <rect x="${x - 8}" y="${y - 8}" width="${thumbW + 16}" height="${thumbH + labelH + 16}" rx="8" fill="#ffffff" stroke="${stroke}"/>
  ${imgHref ? `<image href="${xmlEscape(imgHref)}" x="${x}" y="${y}" width="${thumbW}" height="${thumbH}" preserveAspectRatio="xMidYMid slice"/>` : `<rect x="${x}" y="${y}" width="${thumbW}" height="${thumbH}" fill="#dfe8f1"/><text x="${x + 58}" y="${y + 96}" class="bad">${row.thumbnailUploadMode === "first_frame_auto" ? "Auto first frame" : "Missing thumbnail"}</text>`}
  <text x="${x}" y="${y + thumbH + 22}" class="key">${row.order}. ${xmlEscape(row.supportLang)} -> ${xmlEscape(row.targetLang)} | ${status}</text>
  ${titleSvg}
  <text x="${x}" y="${y + thumbH + 88}" class="tiny">${xmlEscape(publishAt)}</text>
</g>`;
  }).join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<style>
  .title { font: 700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #12243a; }
  .summary { font: 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #506178; }
  .key { font: 700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #213a5a; }
  .small { font: 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #243b55; }
  .tiny { font: 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #64748b; }
  .bad { font: 700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #a51d1d; }
</style>
<rect width="100%" height="100%" fill="#f4f7f9"/>
<text x="18" y="34" class="title">YouTube Thumbnail Review</text>
<text x="18" y="62" class="summary">status ${xmlEscape(report.status)} | thumbnails ${report.summary.thumbnailCount}/${report.summary.rowCount} | blockers ${report.summary.blockerCount} | warnings ${report.summary.warningCount}</text>
${cells}
</svg>
`;
  fs.writeFileSync(svgPath, svg, "utf8");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || options.inputs.length === 0) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }

  const metadataFiles = collectMetadataFiles(options.inputs);
  if (!metadataFiles.length) throw new Error("No youtube_metadata.json files found.");
  const { rows, blockers, warnings } = buildRows(metadataFiles, options);
  const prefix = path.resolve(options.outputPrefix);
  fs.mkdirSync(path.dirname(prefix), { recursive: true });
  const jsonPath = `${prefix}.json`;
  const csvPath = `${prefix}.csv`;
  const htmlPath = `${prefix}.html`;
  const svgPath = `${prefix}.svg`;

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: blockers.length || (options.failOnWarnings && warnings.length) ? "blocked" : "pass",
    options: {
      outputPrefix: relativeProjectPath(prefix),
      columns: options.columns,
      requirePublishAt: options.requirePublishAt,
      failOnWarnings: options.failOnWarnings,
    },
    summary: {
      rowCount: rows.length,
      thumbnailCount: rows.filter((row) => row.thumbnailPath).length,
      blockerCount: blockers.length,
      warningCount: warnings.length,
    },
    blockers,
    warnings,
    artifacts: {
      json: relativeProjectPath(jsonPath),
      csv: relativeProjectPath(csvPath),
      html: relativeProjectPath(htmlPath),
      svg: relativeProjectPath(svgPath),
    },
    rows,
  };

  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeCsv(csvPath, rows);
  writeHtml(htmlPath, rows, report);
  writeSvg(svgPath, rows, report, options.columns);

  console.log(JSON.stringify({
    status: report.status,
    summary: report.summary,
    artifacts: report.artifacts,
  }, null, 2));

  if (report.status !== "pass") process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
