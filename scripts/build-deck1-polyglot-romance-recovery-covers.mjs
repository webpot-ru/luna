#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const ROOT = "outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-approved-polyglot-target-languages-20260707";
const MANIFEST_PATH = path.join(ROOT, "manifest.json");
const TARGET_HASH = "f34a59a474f1";

const RECOVERIES = [
  {
    supportLang: "ES-419",
    source: path.join(ROOT, "by-channel/es__ES-419__es/ES-419__romance_core__8028daba7986__IcuxCkPP06s__full.jpg"),
    folder: "es__ES-419__es",
    lines: ["Español · Francés", "Italiano · Portugués"],
    targetLangs: ["ES", "FR", "IT", "PT"],
    targetLanguageLines: ["Español · Francés", "Italiano · Portugués"],
    title: "Utensilios de cocina",
    description: "Vajilla y utensilios. Nivel básico.",
  },
  {
    supportLang: "PT-BR",
    source: path.join(ROOT, "by-channel/pt__PT-BR__pt/PT-BR__romance_core__cfeabf171e2b__av4qWbUomBA__full.jpg"),
    folder: "pt__PT-BR__pt",
    lines: ["Espanhol · Francês", "Italiano · Português"],
    targetLangs: ["ES", "FR", "IT", "PT"],
    targetLanguageLines: ["Espanhol · Francês", "Italiano · Português"],
    title: "Utensilios de cozinha",
    description: "Louça e utensílios. Nível básico.",
  },
];

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  }[char]));
}

function languageOverlay(lines) {
  return Buffer.from(`
    <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <rect x="64" y="182" width="610" height="116" rx="0" fill="#ffffff"/>
      <text x="80" y="228" fill="#0c2b5d" font-family="Arial, Helvetica, sans-serif" font-size="37" font-weight="400">${escapeXml(lines[0])}</text>
      <text x="80" y="275" fill="#0c2b5d" font-family="Arial, Helvetica, sans-serif" font-size="37" font-weight="400">${escapeXml(lines[1])}</text>
    </svg>
  `);
}

function buildCoverEntry(item, outputPath, sizeBytes) {
  const relativePath = path.join(ROOT, path.relative(ROOT, outputPath));
  const sidecarPath = outputPath.replace(/\.jpg$/u, ".json");
  return {
    videoType: "polyglot",
    setId: "home_kitchen_cookware_pilot_01",
    planningStatus: "recovery_cover_ready",
    polyglotKey: `polyglot:home_kitchen_cookware_pilot_01:${item.supportLang}:romance_core:${TARGET_HASH}`,
    supportLang: item.supportLang,
    channelKey: item.supportLang === "ES-419" ? "es" : "pt",
    channelHandle: "",
    channelFolder: item.folder,
    bundleKey: "romance_core",
    registryBundleKey: "romance_core",
    bundleLabel: "Romance Core",
    contentScope: "full",
    targetLangs: item.targetLangs,
    targetLangsCsv: item.targetLangs.join(","),
    targetLangsHash: TARGET_HASH,
    targetLanguageLines: item.targetLanguageLines,
    title: item.title,
    description: item.description,
    module: "Home",
    category: "Kitchen",
    youtubeVideoId: null,
    youtubeVideoUrl: null,
    privacyStatus: "private",
    publicationStatus: "approved_cover_pending_upload",
    previousThumbnailSet: false,
    previousThumbnailUploadMode: "",
    visualTemplate: "polyglot-target-languages-large-lines",
    uploadEligible: true,
    path: path.resolve(outputPath),
    relativePath,
    sidecarPath: path.resolve(sidecarPath),
    relativeSidecarPath: sidecarPath,
    sizeBytes,
  };
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const additions = [];
  for (const item of RECOVERIES) {
    if (!fs.existsSync(item.source)) throw new Error(`Missing source cover: ${item.source}`);
    const outputPath = path.join(ROOT, "by-channel", item.folder, `${item.supportLang}__romance_core__${TARGET_HASH}__pending__full.jpg`);
    await sharp(item.source)
      .composite([{ input: languageOverlay(item.lines), top: 0, left: 0 }])
      .jpeg({ quality: 93, progressive: true })
      .toFile(outputPath);
    const sizeBytes = fs.statSync(outputPath).size;
    if (sizeBytes >= 2_000_000) throw new Error(`Cover is too large: ${outputPath}`);
    const entry = buildCoverEntry(item, outputPath, sizeBytes);
    fs.writeFileSync(entry.sidecarPath, `${JSON.stringify(entry, null, 2)}\n`);
    additions.push(entry);
  }

  const existing = (manifest.covers || []).filter((cover) => !RECOVERIES.some((item) => (
    cover.supportLang === item.supportLang
      && cover.bundleKey === "romance_core"
      && cover.targetLangsHash === TARGET_HASH
  )));
  manifest.covers = [...existing, ...additions];
  manifest.note = "Canonical local deterministic Polyglot thumbnail set for deck 1 approved custom-thumbnail channels. Includes published covers plus approved planned cover slots. Two Romance recovery covers use the current regional-target contract. No paid image generation and no YouTube upload.";
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ created: additions.map((entry) => entry.relativePath), manifest: MANIFEST_PATH }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
