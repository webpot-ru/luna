import crypto from "node:crypto";

import { getLanguageNameInLang } from "./card-slide-template.mjs";
import { sameViewerLanguageTargetBlocker } from "./youtube-language-pair-policy.mjs";
import { resolvePolyglotBundleTargets } from "./youtube-publication-control.mjs";

function normalizeCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

function cleanText(value) {
  return String(value || "").replace(/\s+/gu, " ").trim();
}

function stripTerminalPunctuation(value) {
  return cleanText(value).replace(/[.!?。！？]+$/u, "");
}

function safeSegment(value) {
  return cleanText(value)
    .replace(/^@/u, "")
    .replace(/[^A-Za-z0-9._-]+/gu, "_")
    .replace(/_+/gu, "_")
    .replace(/^_+|_+$/gu, "") || "item";
}

function xmlEscape(value) {
  return String(value || "")
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&apos;");
}

function visualWeight(value) {
  let total = 0;
  for (const char of [...cleanText(value)]) {
    if (/\s/u.test(char)) total += 0.3;
    else if (/\p{Mark}/u.test(char)) total += 0;
    else if (/[\u0000-\u024F]/u.test(char)) total += /[A-Z0-9]/u.test(char) ? 0.64 : 0.56;
    else total += 0.94;
  }
  return Math.max(total, 1);
}

function fittedFontSize(value, maxWidth, maxSize, minSize) {
  return Math.max(minSize, Math.min(maxSize, Math.floor(maxWidth / visualWeight(value))));
}

function languageLabel(targetLang, supportLang) {
  return cleanText(getLanguageNameInLang(normalizeCode(targetLang), normalizeCode(supportLang))) || normalizeCode(targetLang);
}

function localizedDeckText(deck, supportLang) {
  const code = normalizeCode(supportLang);
  const metadata = deck.courseMetadata || deck.course_metadata || {};
  const title = metadata.title?.[code] || deck.titles?.[code] || metadata.title?.EN || deck.titles?.EN || deck.setId || "Vocabulary";
  const description = metadata.description?.[code] || deck.descriptions?.[code] || metadata.description?.EN || deck.descriptions?.EN || "";
  const module = metadata.module?.[code] || metadata.module?.EN || "";
  const category = metadata.category?.[code] || metadata.category?.EN || "";
  return {
    title: stripTerminalPunctuation(title),
    description: cleanText(description),
    module: stripTerminalPunctuation(module),
    category: stripTerminalPunctuation(category),
  };
}

function hashTargets(targetLangs) {
  return crypto.createHash("sha256").update(targetLangs.map(normalizeCode).join(",")).digest("hex").slice(0, 12);
}

function targetLines(targetLangs, supportLang) {
  const labels = targetLangs.map((code) => languageLabel(code, supportLang));
  if (labels.length <= 2) return [labels.join(" · ")];
  const midpoint = Math.ceil(labels.length / 2);
  return [labels.slice(0, midpoint).join(" · "), labels.slice(midpoint).join(" · ")];
}

function findChannel(channels, supportLang) {
  const code = normalizeCode(supportLang);
  return channels.find((channel) => (channel.supportLangs || []).map(normalizeCode).includes(code));
}

function targetCodesForDeck(deck) {
  const metadata = deck.courseMetadata || deck.course_metadata || {};
  const source = metadata.title || deck.titles || {};
  return [...new Set(Object.keys(source).map(normalizeCode).map((code) => code === "NB" ? "NO" : code).filter(Boolean))];
}

function buildCoverPlan({
  setId,
  setConfig,
  deck,
  channels,
  supports,
  types,
  targets = [],
  bundles = [],
  polyglotConfig,
  outputRoot,
}) {
  const covers = [];
  const skipped = [];
  const enabledTypes = new Set(types);
  const selectedTargets = new Set(targets.map(normalizeCode));
  const selectedBundles = new Set(bundles.map(cleanText));
  const bundleKeys = polyglotConfig.defaults?.productionBundleKeys || [];
  const bundleByKey = new Map((polyglotConfig.bundles || []).map((bundle) => [bundle.key, bundle]));
  const deckTargets = targetCodesForDeck(deck);

  for (const supportRaw of supports) {
    const supportLang = normalizeCode(supportRaw);
    const channel = findChannel(channels, supportLang);
    if (!channel) throw new Error(`No YouTube channel configured for support=${supportLang}`);
    if (channel.customThumbnailUploadAllowed !== true) {
      skipped.push({ setId, supportLang, reason: "custom_thumbnail_upload_not_allowed" });
      continue;
    }
    const localized = localizedDeckText(deck, supportLang);
    const channelFolder = `${safeSegment(channel.key)}__${supportLang}__${safeSegment(channel.currentHandle || channel.targetHandle || channel.key)}`;

    if (enabledTypes.has("ordinary")) {
      for (const targetLang of deckTargets) {
        if (selectedTargets.size && !selectedTargets.has(targetLang)) continue;
        if (sameViewerLanguageTargetBlocker({ supportLang, targetLang })) continue;
        const targetName = languageLabel(targetLang, supportLang);
        const relativePath = [
          outputRoot,
          "video",
          "by-set",
          setId,
          "ordinary",
          "by-channel",
          channelFolder,
          `${targetLang}__${safeSegment(targetName)}`,
          "youtube_thumbnail.jpg",
        ].join("/");
        covers.push({
          videoType: "ordinary",
          setId,
          supportLang,
          viewerSupportLang: supportLang,
          channelKey: channel.key,
          channelId: channel.channelId,
          channelHandle: channel.currentHandle || channel.targetHandle || "",
          channelSupportLangs: channel.supportLangs || [supportLang],
          targetLang,
          targetName,
          targetLabel: `${targetName} A1`,
          title: localized.title,
          description: localized.description,
          module: localized.module,
          category: localized.category,
          baseImage: setConfig.ordinaryBasePath,
          visualTemplate: setConfig.ordinaryTemplate,
          showModule: setConfig.showModuleOnOrdinary === true,
          uploadEligible: true,
          relativePath,
          sidecarPath: relativePath.replace(/youtube_thumbnail\.jpg$/u, "video.json"),
        });
      }
    }

    if (enabledTypes.has("polyglot")) {
      for (const bundleKey of bundleKeys) {
        if (selectedBundles.size && !selectedBundles.has(bundleKey)) continue;
        const bundle = bundleByKey.get(bundleKey);
        if (!bundle) throw new Error(`Unknown production Polyglot bundle: ${bundleKey}`);
        const targetLangs = resolvePolyglotBundleTargets(bundle, supportLang).targetLangs;
        const targetLangsHash = hashTargets(targetLangs);
        const relativePath = [
          outputRoot,
          "video",
          "by-set",
          setId,
          "polyglot",
          "by-channel",
          channelFolder,
          `${supportLang}__${safeSegment(bundleKey)}__${targetLangsHash}__full.jpg`,
        ].join("/");
        covers.push({
          videoType: "polyglot",
          setId,
          supportLang,
          viewerSupportLang: supportLang,
          channelKey: channel.key,
          channelId: channel.channelId,
          channelHandle: channel.currentHandle || channel.targetHandle || "",
          channelSupportLangs: channel.supportLangs || [supportLang],
          bundleKey,
          bundleLabel: bundle.label || bundleKey,
          contentScope: "full",
          targetLangs,
          targetLangsCsv: targetLangs.join(","),
          targetLangsHash,
          targetLanguageLines: targetLines(targetLangs, supportLang),
          polyglotKey: `polyglot:${setId}:${supportLang}:${bundleKey}:${targetLangsHash}`,
          title: localized.title,
          description: localized.description,
          module: localized.module,
          category: localized.category,
          baseImage: setConfig.polyglotBasePath,
          visualTemplate: setConfig.polyglotTemplate,
          uploadEligible: true,
          relativePath,
          sidecarPath: relativePath.replace(/\.jpg$/u, ".json"),
        });
      }
    }
  }

  const paths = covers.map((cover) => cover.relativePath);
  if (new Set(paths).size !== paths.length) throw new Error("Cover plan produced duplicate output paths");
  return { covers, skipped };
}

function fontFamilyForText(value) {
  if (/[\u0D80-\u0DFF]/u.test(String(value || ""))) {
    return "Noto Sans Sinhala, Sinhala MN, Noto Sans, Arial, sans-serif";
  }
  return "Noto Sans, Arial, sans-serif";
}

function textElement(value, { x, y, size, weight = 400, color = "#07164d" }) {
  return `<text x="${x}" y="${y}" font-family="${fontFamilyForText(value)}" font-size="${size}" font-weight="${weight}" fill="${color}">${xmlEscape(value)}</text>`;
}

function commonBottomDecoration() {
  return [
    '<rect x="78" y="548" width="414" height="56" rx="28" fill="#fffefa" fill-opacity="0.93" stroke="#e7e2d5" stroke-width="2"/>',
    '<circle cx="112" cy="576" r="10" fill="#65b776"/>',
    '<path d="M145 576h38M164 557v38" stroke="#0f477b" stroke-width="9" stroke-linecap="round"/>',
    '<rect x="200" y="566" width="31" height="20" rx="5" fill="#79a9df"/>',
    '<path d="M258 582c8-22 34-22 43 0z" fill="#eb665c"/>',
    '<rect x="350" y="570" width="60" height="12" rx="6" fill="#d8d8cc"/>',
  ].join("");
}

function ordinaryOverlaySvg(cover) {
  const targetSize = fittedFontSize(cover.targetLabel, 590, 68, 34);
  const titleSize = fittedFontSize(cover.title, 590, 48, 28);
  const descriptionSize = fittedFontSize(cover.description, 540, 29, 19);
  const moduleText = [cover.module, cover.category].filter(Boolean).join(" · ");
  const targetY = cover.showModule ? 275 : 238;
  const titleY = cover.showModule ? 374 : 358;
  return `
    <svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <rect x="78" y="111" width="166" height="40" rx="20" fill="#f0f9fb" stroke="#b8dce7" stroke-width="2"/>
      ${textElement("FlashcardsLuna", { x: 99, y: 138, size: 18, color: "#267083" })}
      ${cover.showModule && moduleText ? textElement(moduleText, { x: 79, y: 177, size: 23, color: "#347383" }) : ""}
      ${textElement(cover.targetLabel, { x: 79, y: targetY, size: targetSize, weight: 400 })}
      ${textElement(cover.title, { x: 79, y: titleY, size: titleSize, weight: 400, color: "#08204e" })}
      <rect x="78" y="430" width="570" height="64" rx="32" fill="#fffefa" fill-opacity="0.94" stroke="#e7e2d5" stroke-width="2"/>
      <circle cx="112" cy="462" r="10" fill="#65b776"/>
      ${textElement(cover.description, { x: 136, y: 472, size: descriptionSize, color: "#23334c" })}
      ${commonBottomDecoration()}
    </svg>`;
}

function polyglotOverlaySvg(cover) {
  const moduleText = [cover.module, cover.category].filter(Boolean).join(" · ");
  const lineSizes = cover.targetLanguageLines.map((line) => fittedFontSize(line, 570, 38, 24));
  const titleSize = fittedFontSize(cover.title, 590, 48, 28);
  const descriptionSize = fittedFontSize(cover.description, 540, 29, 19);
  const secondLine = cover.targetLanguageLines[1] || "";
  return `
    <svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <rect x="78" y="111" width="166" height="40" rx="20" fill="#f0f9fb" stroke="#b8dce7" stroke-width="2"/>
      ${textElement("FlashcardsLuna", { x: 99, y: 138, size: 18, color: "#267083" })}
      <rect x="270" y="111" width="178" height="40" rx="20" fill="#fffefa" stroke="#e4dfce" stroke-width="2"/>
      <circle cx="291" cy="131" r="8" fill="#65b776"/>
      ${textElement(`Polyglot · ${cover.targetLangs.length}`, { x: 309, y: 138, size: 18, color: "#23334c" })}
      <rect x="465" y="111" width="196" height="40" rx="20" fill="#f0f9fb" stroke="#b8dce7" stroke-width="2"/>
      ${textElement(moduleText || cover.bundleLabel, { x: 490, y: 138, size: fittedFontSize(moduleText || cover.bundleLabel, 150, 18, 13), color: "#347383" })}
      ${textElement(cover.targetLanguageLines[0], { x: 79, y: 231, size: lineSizes[0], color: "#111b48" })}
      ${secondLine ? textElement(secondLine, { x: 79, y: 280, size: lineSizes[1], color: "#111b48" }) : ""}
      ${textElement(cover.title, { x: 79, y: 389, size: titleSize, color: "#08204e" })}
      <rect x="78" y="438" width="610" height="64" rx="32" fill="#fffefa" fill-opacity="0.94" stroke="#e7e2d5" stroke-width="2"/>
      <circle cx="112" cy="470" r="10" fill="#65b776"/>
      ${textElement(cover.description, { x: 136, y: 480, size: descriptionSize, color: "#23334c" })}
      ${commonBottomDecoration()}
    </svg>`;
}

export {
  buildCoverPlan,
  fittedFontSize,
  fontFamilyForText,
  hashTargets,
  languageLabel,
  normalizeCode,
  ordinaryOverlaySvg,
  polyglotOverlaySvg,
  safeSegment,
  targetLines,
  xmlEscape,
};
