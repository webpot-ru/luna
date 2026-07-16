#!/usr/bin/env node

import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

import { fontFamilyForText, safeSegment, xmlEscape } from "./lib/youtube-cover-assets.mjs";

const DEFAULT_BASE = "assets/youtube-cover-templates/playlist-universal-approved-base.jpg";
const DEFAULT_OUTPUT = "data/youtube-playlist-covers/youtube-playlist-cover-closeout-20260716/assets";

function parseArgs(argv) {
  const options = { keysFile: "", base: DEFAULT_BASE, outputRoot: DEFAULT_OUTPUT };
  for (const arg of argv) {
    if (arg.startsWith("--keys-file=")) options.keysFile = arg.slice("--keys-file=".length);
    else if (arg.startsWith("--base=")) options.base = arg.slice("--base=".length);
    else if (arg.startsWith("--output-root=")) options.outputRoot = arg.slice("--output-root=".length);
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function cleanTitle(value) {
  return String(value || "A1 Vocabulary")
    .replace(/\s*(?:\||-)\s*FlashcardsLuna\s*$/iu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function splitTitle(value) {
  const title = cleanTitle(value);
  for (const separator of [" | ", ": ", "："]) {
    const index = title.indexOf(separator);
    if (index > 0) return [title.slice(0, index).trim(), title.slice(index + separator.length).trim()];
  }
  return [title, ""];
}

function unit(char) {
  return /[\p{Script=Latin}\p{Script=Cyrillic}\d.,:;!?()'’\-]/u.test(char) ? 0.58 : 1;
}

function wrapText(value, maxUnits, maxLines) {
  const text = String(value || "").trim();
  if (!text) return [];
  const tokens = text.includes(" ") ? text.split(/\s+/u) : Array.from(text);
  const separator = text.includes(" ") ? " " : "";
  const lines = [];
  let current = "";
  let currentUnits = 0;
  for (const token of tokens) {
    const tokenUnits = Array.from(token).reduce((sum, char) => sum + unit(char), 0) + (current ? unit(" ") : 0);
    if (current && currentUnits + tokenUnits > maxUnits && lines.length < maxLines - 1) {
      lines.push(current);
      current = token;
      currentUnits = tokenUnits;
    } else {
      current = current ? `${current}${separator}${token}` : token;
      currentUnits += tokenUnits;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function textSvg(lines, { x, y, size, lineHeight, weight = 400, color = "#07164d" }) {
  if (!lines.length) return "";
  const family = fontFamilyForText(lines.join(" "));
  const spans = lines.map((line, index) => `<tspan x="${x}" dy="${index ? lineHeight : 0}">${xmlEscape(line)}</tspan>`).join("");
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${color}">${spans}</text>`;
}

function footerFor(support, videoType) {
  const poly = {
    EN: "4 languages • one lesson", RU: "4 языка • один урок", JA: "4言語 • 1つのレッスン",
    TR: "4 dil • tek ders", VI: "4 ngôn ngữ • một bài học", TH: "4 ภาษา • 1 บทเรียน",
    SR: "4 jezika • jedna lekcija", MY: "ဘာသာစကား ၄ မျိုး • သင်ခန်းစာတစ်ခု",
    NE: "४ भाषा • एउटै पाठ", SI: "භාෂා 4ක් • එක් පාඩමක්", UZ: "4 til • bitta dars",
    KA: "4 ენა • ერთი გაკვეთილი", SW: "lugha 4 • somo moja", ZH: "4 种语言 • 一节课",
  };
  const ordinary = {
    EN: "everyday vocabulary", RU: "повседневные слова", JA: "日常語彙", TR: "günlük kelimeler",
    VI: "từ vựng hằng ngày", TH: "คำศัพท์ในชีวิตประจำวัน", SR: "svakodnevne reči",
    MY: "နေ့စဉ်သုံး ဝေါဟာရ", NE: "दैनिक शब्दहरू", SI: "දෛනික වචන මාලාව",
    UZ: "kundalik so‘zlar", KA: "ყოველდღიური ლექსიკა", SW: "msamiati wa kila siku",
  };
  return (videoType === "polyglot" ? poly : ordinary)[support] || (videoType === "polyglot" ? poly.EN : ordinary.EN);
}

function overlaySvg(row) {
  const support = String(row.supportLang || "").toUpperCase();
  const videoType = row.videoType || "ordinary";
  const [headline, detail] = splitTitle(row.title);
  const headlineLines = wrapText(headline, 17, 3);
  const detailLines = wrapText(detail, 25, 3);
  const headlineSize = headlineLines.join("").length > 34 ? 42 : 52;
  const detailSize = detailLines.join("").length > 54 ? 27 : 34;
  const footer = footerFor(support, videoType);
  return `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="58" width="610" height="592" rx="34" fill="#fffefa" fill-opacity="0.90" stroke="#e8e3d1" stroke-opacity="0.75" stroke-width="2"/>
      <rect x="72" y="92" width="244" height="44" rx="22" fill="#f1faf7" stroke="#bfdcd1" stroke-width="2"/>
      ${textSvg(["FlashcardsLuna"], { x: 96, y: 124, size: 28, lineHeight: 32, color: "#276878" })}
      ${textSvg(headlineLines, { x: 72, y: 210, size: headlineSize, lineHeight: headlineSize * 1.08, weight: 700 })}
      <rect x="72" y="420" width="${videoType === "polyglot" ? 150 : 124}" height="68" rx="18" fill="#108a63"/>
      ${textSvg([videoType === "polyglot" ? "4×" : "A1"], { x: 96, y: 472, size: 49, lineHeight: 52, weight: 700, color: "#ffffff" })}
      ${textSvg(detailLines, { x: 72, y: 540, size: detailSize, lineHeight: detailSize * 1.1, weight: 700 })}
      <circle cx="89" cy="612" r="13" fill="#108a63"/>
      ${textSvg(wrapText(footer, 30, 2), { x: 118, y: 622, size: 28, lineHeight: 32, color: "#47596f" })}
    </svg>`;
}

async function contactSheet(records, outputPath) {
  if (!records.length) return;
  const size = 192;
  const columns = 5;
  const rows = Math.ceil(records.length / columns);
  const thumbs = await Promise.all(records.map((record) => sharp(record.coverPath).resize(size, size).jpeg({ quality: 80 }).toBuffer()));
  await sharp({ create: { width: columns * size, height: rows * size, channels: 3, background: "#f4f7fa" } })
    .composite(thumbs.map((input, index) => ({ input, left: (index % columns) * size, top: Math.floor(index / columns) * size })))
    .jpeg({ quality: 86 })
    .toFile(outputPath);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: node scripts/render-youtube-playlist-cover-overlays.mjs --keys-file=<exact keys>");
    return;
  }
  if (!options.keysFile || !fs.existsSync(options.keysFile)) throw new Error("--keys-file is required");
  if (!fs.existsSync(options.base) || !isGitTracked(options.base)) throw new Error(`Approved Git-tracked base is required: ${options.base}`);
  const keys = new Set(fs.readFileSync(options.keysFile, "utf8").split(/\r?\n/u).map((value) => value.trim()).filter(Boolean));
  const channels = readJson("config/youtube-channels.json").channels || [];
  const channelByKey = new Map(channels.map((channel) => [channel.key, channel]));
  const ordinary = (readJson("config/youtube-playlists.json").playlists || []).map((row) => ({ ...row, videoType: "ordinary", registryPath: "config/youtube-playlists.json" }));
  const polyglot = (readJson("config/youtube-polyglot-playlists.json").playlists || []).map((row) => ({ ...row, videoType: "polyglot", registryPath: "config/youtube-polyglot-playlists.json" }));
  const byKey = new Map([...ordinary, ...polyglot].map((row) => [row.playlist_key || row.key, row]));
  const records = [];
  fs.mkdirSync(options.outputRoot, { recursive: true });
  for (const playlistKey of [...keys].sort()) {
    const row = byKey.get(playlistKey);
    if (!row) throw new Error(`Unknown playlist key: ${playlistKey}`);
    const channel = channelByKey.get(row.channelKey);
    if (channel?.playlistImageUploadAllowed !== true) throw new Error(`Playlist images are not allowed for ${row.channelKey}`);
    const folder = path.join(options.outputRoot, "by-channel", safeSegment(row.channelKey), safeSegment(playlistKey));
    const coverPath = path.join(folder, "playlist_cover.jpg");
    fs.mkdirSync(folder, { recursive: true });
    await sharp(options.base)
      .resize(1024, 1024, { fit: "fill" })
      .composite([{ input: Buffer.from(overlaySvg(row)), top: 0, left: 0 }])
      .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
      .toFile(coverPath);
    const metadata = await sharp(coverPath).metadata();
    if (metadata.width !== 1024 || metadata.height !== 1024 || metadata.format !== "jpeg") throw new Error(`Invalid cover: ${coverPath}`);
    const record = {
      playlistKey,
      registryPath: row.registryPath,
      videoType: row.videoType,
      supportLang: row.supportLang,
      targetLang: row.targetLang || "",
      channelKey: row.channelKey,
      channelId: row.youtube_channel_id || channel.channelId,
      playlistId: row.youtube_playlist_id || "",
      title: row.title || "",
      description: row.description || "",
      coverPath,
      baseImage: options.base,
      renderer: "sharp-svg-approved-playlist-overlay",
      sizeBytes: fs.statSync(coverPath).size,
      sha256: sha256(coverPath),
      uploadEligible: Boolean(row.youtube_playlist_id),
      uploadBlocker: row.youtube_playlist_id ? "" : "missing_youtube_playlist_id",
    };
    fs.writeFileSync(path.join(folder, "playlist.json"), `${JSON.stringify(record, null, 2)}\n`);
    records.push(record);
  }
  await contactSheet(records, path.join(options.outputRoot, "contact-sheet.jpg"));
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    baseImage: options.base,
    renderer: "sharp-svg-approved-playlist-overlay",
    externalProviderCalls: 0,
    youtubeWrites: 0,
    records,
  };
  fs.writeFileSync(path.join(options.outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ outputRoot: options.outputRoot, rendered: records.length, manifest: path.join(options.outputRoot, "manifest.json") }, null, 2));
}

function isGitTracked(filePath) {
  return spawnSync("git", ["ls-files", "--error-unmatch", "--", filePath], { cwd: process.cwd(), stdio: "ignore" }).status === 0;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
