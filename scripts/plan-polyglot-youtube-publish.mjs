#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { getDbLanguageCode } from "./lib/video-language-codes.mjs";
import { getPublicCourseUrl, isSpecificStudyCourseUrl } from "./lib/video-public-url.mjs";
import {
  DEFAULT_CHANNEL_CONFIG_PATH,
  customThumbnailUploadAllowed,
  findChannelForSupport,
  loadYoutubeChannels,
  normalizeLanguageCode,
} from "./lib/youtube-playlists.mjs";
import {
  isActivePublication,
  loadPublicationRegistry,
} from "./lib/youtube-publication-registry.mjs";

const DEFAULT_BUNDLES_PATH = "config/polyglot-video-bundles.json";
const DEFAULT_POLYGLOT_PUBLICATION_REGISTRY_PATH = "config/youtube-polyglot-published-videos.json";
const DEFAULT_POLYGLOT_PROGRESS_PATH = "config/youtube-polyglot-progress.json";
const DEFAULT_CALENDAR_PATH = "config/youtube-publish-calendar.json";
const DEFAULT_VIDEO_LOCALIZATION_PATH = "config/video-localization.json";
const DEFAULT_POLYGLOT_LOCALIZATION_PATH = "config/polyglot-video-localization.json";

function parseArgs(argv) {
  const options = {
    setId: "",
    support: "",
    bundleKey: "",
    bundleConfig: DEFAULT_BUNDLES_PATH,
    channelConfig: DEFAULT_CHANNEL_CONFIG_PATH,
    publicationRegistry: DEFAULT_POLYGLOT_PUBLICATION_REGISTRY_PATH,
    progressRegistry: DEFAULT_POLYGLOT_PROGRESS_PATH,
    calendar: DEFAULT_CALENDAR_PATH,
    videoLocalization: DEFAULT_VIDEO_LOCALIZATION_PATH,
    polyglotLocalization: DEFAULT_POLYGLOT_LOCALIZATION_PATH,
    output: "",
    allowRepublish: false,
    requireOfflineDeck: false,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = () => {
      if (arg.includes("=")) return arg.split("=").slice(1).join("=");
      index += 1;
      return argv[index];
    };

    if (arg === "--set" || arg.startsWith("--set=")) options.setId = readValue();
    else if (arg === "--support" || arg.startsWith("--support=")) options.support = readValue();
    else if (arg === "--bundle" || arg.startsWith("--bundle=")) options.bundleKey = readValue();
    else if (arg === "--bundle-config" || arg.startsWith("--bundle-config=")) options.bundleConfig = readValue();
    else if (arg === "--channel-config" || arg.startsWith("--channel-config=")) options.channelConfig = readValue();
    else if (arg === "--publication-registry" || arg.startsWith("--publication-registry=")) options.publicationRegistry = readValue();
    else if (arg === "--progress-registry" || arg.startsWith("--progress-registry=")) options.progressRegistry = readValue();
    else if (arg === "--calendar" || arg.startsWith("--calendar=")) options.calendar = readValue();
    else if (arg === "--video-localization" || arg.startsWith("--video-localization=")) options.videoLocalization = readValue();
    else if (arg === "--polyglot-localization" || arg.startsWith("--polyglot-localization=")) options.polyglotLocalization = readValue();
    else if (arg === "--output" || arg.startsWith("--output=")) options.output = readValue();
    else if (arg === "--allow-republish") options.allowRepublish = true;
    else if (arg === "--require-offline-deck") options.requireOfflineDeck = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
  }

  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/plan-polyglot-youtube-publish.mjs --set <set_id> --support RU --bundle global_europe_core",
    "",
    "Plans one Polyglot YouTube candidate without rendering, uploading or writing external services.",
    "",
    "Options:",
    "  --require-offline-deck       Require data/decks/<set_id>.json and localized Course Metadata.",
    "  --allow-republish            Do not block an active matching Polyglot publication/calendar row.",
    "  --publication-registry <file> Defaults to config/youtube-polyglot-published-videos.json.",
    "  --progress-registry <file>    Defaults to config/youtube-polyglot-progress.json.",
    "  --output <file>              Write full plan report.",
    "  --json                       Print compact summary.",
  ].join("\n");
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function uniqueCodes(values) {
  return [...new Set((values || []).map(normalizeLanguageCode).filter(Boolean))];
}

function targetHash(targetLangs) {
  return crypto.createHash("sha256").update(uniqueCodes(targetLangs).join(",")).digest("hex").slice(0, 12);
}

function buildPolyglotKey({ setId, supportLang, bundleKey, targetLangsHash }) {
  return [
    "polyglot",
    String(setId || "").trim(),
    normalizeLanguageCode(supportLang),
    String(bundleKey || "").trim(),
    targetLangsHash,
  ].join(":");
}

function findBundle(bundleConfig, bundleKey) {
  const key = String(bundleKey || "").trim();
  return (bundleConfig.bundles || []).find((bundle) => bundle.key === key) || null;
}

function resolveBundleTargets(bundle, supportLang) {
  const support = normalizeLanguageCode(supportLang);
  const desiredCount = uniqueCodes(bundle.targetLangs).length;
  const targetLangs = [];
  const removed = [];
  const fallbackAdded = [];

  for (const code of uniqueCodes(bundle.targetLangs)) {
    if (code === support) {
      removed.push(code);
      continue;
    }
    targetLangs.push(code);
  }

  for (const code of uniqueCodes(bundle.fallbackLangs)) {
    if (targetLangs.length >= desiredCount) break;
    if (code === support || targetLangs.includes(code)) continue;
    targetLangs.push(code);
    fallbackAdded.push(code);
  }

  return {
    targetLangs,
    removedSupportTargets: removed,
    fallbackAdded,
    desiredCount,
  };
}

function pickLocalizedValue(values, supportLang) {
  const support = normalizeLanguageCode(supportLang);
  const keys = uniqueCodes([support, getDbLanguageCode(support)]);
  for (const key of keys) {
    const value = values?.[key];
    if (typeof value === "string" && value.trim()) return { value: value.trim(), key };
  }
  return { value: "", key: "" };
}

function languageKeysForDeck(code) {
  return uniqueCodes([code, getDbLanguageCode(code)]);
}

function findObjectByLanguageKey(container, code) {
  for (const key of languageKeysForDeck(code)) {
    if (container?.[key]) return { value: container[key], key };
  }
  return { value: null, key: "" };
}

function loadDeckPlan({ setId, supportLang, targetLangs, requireOfflineDeck }) {
  const deckPath = path.resolve(`data/decks/${setId}.json`);
  const blockers = [];
  const warnings = [];
  const deck = readJson(deckPath, null);

  if (!deck) {
    const message = `offline deck JSON missing: data/decks/${setId}.json`;
    if (requireOfflineDeck) blockers.push(message);
    else warnings.push(message);
    return {
      path: deckPath,
      exists: false,
      metadataSource: "",
      title: "",
      description: "",
      supportDeckKey: "",
      targetDeckKeys: {},
      cardCount: 0,
      blockers,
      warnings,
    };
  }

  const titlePick = pickLocalizedValue(deck.courseMetadata?.title || deck.titles, supportLang);
  const descriptionPick = pickLocalizedValue(deck.courseMetadata?.description || deck.descriptions, supportLang);
  const metadataSource = deck.courseMetadata?.title ? "offline-course-metadata" : (deck.titles ? "offline-legacy-titles" : "");
  if (!titlePick.value) blockers.push(`missing localized Course Metadata title for supportLang=${supportLang}`);
  if (!descriptionPick.value) warnings.push(`missing localized Course Metadata description for supportLang=${supportLang}`);

  const supportCardsPick = findObjectByLanguageKey(deck.cards, supportLang);
  if (!supportCardsPick.value) blockers.push(`offline deck cards missing supportLang=${supportLang}`);

  const targetDeckKeys = {};
  const targetCounts = [];
  for (const targetLang of targetLangs) {
    const targetCardsPick = findObjectByLanguageKey(supportCardsPick.value, targetLang);
    targetDeckKeys[targetLang] = targetCardsPick.key;
    if (!Array.isArray(targetCardsPick.value)) {
      blockers.push(`offline deck cards missing targetLang=${targetLang} under supportLang=${supportLang}`);
      continue;
    }
    if (targetCardsPick.value.length === 0) blockers.push(`offline deck cards empty for targetLang=${targetLang}`);
    targetCounts.push(targetCardsPick.value.length);
  }

  const uniqueCounts = [...new Set(targetCounts)];
  if (uniqueCounts.length > 1) {
    blockers.push(`target card counts differ across bundle: ${targetCounts.join(",")}`);
  }

  return {
    path: deckPath,
    exists: true,
    metadataSource,
    title: titlePick.value,
    description: descriptionPick.value,
    titleKey: titlePick.key,
    descriptionKey: descriptionPick.key,
    supportDeckKey: supportCardsPick.key,
    targetDeckKeys,
    cardCount: uniqueCounts[0] || 0,
    blockers,
    warnings,
  };
}

function loadCalendar(filePath) {
  const calendar = readJson(filePath, { reservations: [] });
  if (!Array.isArray(calendar.reservations)) calendar.reservations = [];
  return calendar;
}

function loadProgressRegistry(filePath) {
  const registry = readJson(filePath, { items: [] });
  if (!Array.isArray(registry.items)) registry.items = [];
  return registry;
}

function isActiveCalendarReservation(row) {
  if (!row) return false;
  const status = String(row.status || row.publicationStatus || "").toLowerCase();
  if (status.includes("cancel")) return false;
  if (status.includes("delete")) return false;
  if (status.includes("failed")) return false;
  if (status.includes("superseded")) return false;
  return true;
}

function findActivePolyglotPublication(publicationRegistry, polyglotKey) {
  return (publicationRegistry.publications || [])
    .filter((row) => row.videoType === "polyglot" || String(row.polyglotKey || "").startsWith("polyglot:"))
    .filter((row) => row.polyglotKey === polyglotKey)
    .filter(isActivePublication)[0] || null;
}

function findActivePolyglotCalendarReservation(calendar, polyglotKey) {
  return (calendar.reservations || [])
    .filter((row) => row.videoType === "polyglot" || String(row.polyglotKey || "").startsWith("polyglot:"))
    .filter((row) => row.polyglotKey === polyglotKey)
    .filter(isActiveCalendarReservation)[0] || null;
}

function isActiveProgressItem(row) {
  if (!row) return false;
  const status = String(row.status || "").toLowerCase();
  if (status.includes("cancel")) return false;
  if (status.includes("delete")) return false;
  if (status.includes("failed")) return false;
  if (status.includes("superseded")) return false;
  if (status.includes("skipped")) return false;
  return true;
}

function findActivePolyglotProgressItem(progressRegistry, polyglotKey) {
  return (progressRegistry.items || [])
    .filter((row) => row.videoType === "polyglot" || String(row.polyglotKey || "").startsWith("polyglot:"))
    .filter((row) => row.polyglotKey === polyglotKey)
    .filter(isActiveProgressItem)[0] || null;
}

function validateStudyUrl(url, targetLangs) {
  const blockers = [];
  const urlTargets = [];
  try {
    const parsed = new URL(url);
    for (const value of String(parsed.searchParams.get("langs") || "").split(",")) {
      if (value.trim()) urlTargets.push(normalizeLanguageCode(value));
    }
  } catch {
    blockers.push(`invalid course URL: ${url}`);
  }

  if (!isSpecificStudyCourseUrl(url)) blockers.push(`course URL is not a specific study route: ${url}`);
  const expected = uniqueCodes(targetLangs);
  if (expected.join(",") !== urlTargets.join(",")) {
    blockers.push(`course URL langs mismatch: expected ${expected.join(",")} got ${urlTargets.join(",")}`);
  }
  return { blockers, urlTargets };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.setId || !options.support || !options.bundleKey) {
    console.log(usage());
    process.exit(options.help ? 0 : 1);
  }

  const supports = uniqueCodes(String(options.support).split(","));
  if (supports.length !== 1 || supports[0] === "ALL") {
    throw new Error("Polyglot planner accepts exactly one explicit support language per video.");
  }
  const supportLang = supports[0];

  const bundleConfig = readJson(options.bundleConfig, null);
  if (!bundleConfig) throw new Error(`Missing Polyglot bundle config: ${options.bundleConfig}`);
  const bundle = findBundle(bundleConfig, options.bundleKey);
  if (!bundle) throw new Error(`Unknown Polyglot bundle: ${options.bundleKey}`);

  const baseLocalization = readJson(options.videoLocalization, {});
  const polyglotLocalization = readJson(options.polyglotLocalization, {});
  const publicationRegistry = loadPublicationRegistry(options.publicationRegistry);
  const progressRegistry = loadProgressRegistry(options.progressRegistry);
  const calendar = loadCalendar(options.calendar);
  const channelRegistry = loadYoutubeChannels(options.channelConfig);

  const resolved = resolveBundleTargets(bundle, supportLang);
  const targetLangs = resolved.targetLangs;
  const targetLangsHash = targetHash(targetLangs);
  const polyglotKey = buildPolyglotKey({
    setId: options.setId,
    supportLang,
    bundleKey: bundle.key,
    targetLangsHash,
  });

  const blockers = [];
  const warnings = [];
  const minTargetLanguages = Number(bundleConfig.defaults?.minTargetLanguages || 3);
  const maxTargetLanguages = Number(bundleConfig.defaults?.maxTargetLanguages || 4);

  if (!baseLocalization[supportLang]) blockers.push(`support language missing in config/video-localization.json: ${supportLang}`);
  if (!polyglotLocalization[supportLang]) blockers.push(`support language missing in config/polyglot-video-localization.json: ${supportLang}`);
  for (const targetLang of targetLangs) {
    if (!baseLocalization[targetLang]) blockers.push(`target language missing in config/video-localization.json: ${targetLang}`);
  }
  if (targetLangs.includes(supportLang)) blockers.push(`targetLangs must not include supportLang=${supportLang}`);
  if (targetLangs.length < minTargetLanguages || targetLangs.length > maxTargetLanguages) {
    blockers.push(`resolved target count ${targetLangs.length} outside allowed ${minTargetLanguages}..${maxTargetLanguages}`);
  }
  if (resolved.removedSupportTargets.length && resolved.fallbackAdded.length === 0) {
    warnings.push(`supportLang=${supportLang} was removed from bundle but no fallback target was added`);
  }

  const deckPlan = loadDeckPlan({
    setId: options.setId,
    supportLang,
    targetLangs,
    requireOfflineDeck: options.requireOfflineDeck,
  });
  blockers.push(...deckPlan.blockers);
  warnings.push(...deckPlan.warnings);

  const channel = findChannelForSupport(channelRegistry.channels, supportLang);
  if (!channel) blockers.push(`no YouTube support channel configured for supportLang=${supportLang}`);
  else if (!channel.channelId) blockers.push(`YouTube support channel ${channel.key} has no channelId`);

  let canUploadCustomThumbnail = false;
  if (channel) {
    canUploadCustomThumbnail = customThumbnailUploadAllowed(channelRegistry, channel);
    if (!canUploadCustomThumbnail) {
      blockers.push(`Polyglot is blocked for channel key ${channel.key} because customThumbnailUploadAllowed must be true because channels without custom thumbnails may still have the 15-minute upload length limit`);
    }
  }

  const studyUrl = getPublicCourseUrl({ setId: options.setId, supportLang, targetLangs });
  const urlValidation = validateStudyUrl(studyUrl, targetLangs);
  blockers.push(...urlValidation.blockers);

  const existingPublication = findActivePolyglotPublication(publicationRegistry, polyglotKey);
  if (existingPublication && !options.allowRepublish) {
    blockers.push(`active Polyglot publication already exists for ${polyglotKey}: video=${existingPublication.youtubeVideoId}`);
  }
  const existingCalendarReservation = findActivePolyglotCalendarReservation(calendar, polyglotKey);
  if (existingCalendarReservation && !options.allowRepublish) {
    blockers.push(`active Polyglot calendar reservation already exists for ${polyglotKey}: publishAt=${existingCalendarReservation.publishAt || "reserved"}`);
  }
  const existingProgressItem = findActivePolyglotProgressItem(progressRegistry, polyglotKey);
  if (existingProgressItem && !options.allowRepublish) {
    blockers.push(`active Polyglot progress item already exists for ${polyglotKey}: status=${existingProgressItem.status || "active"}`);
  }

  const candidate = {
    videoType: "polyglot",
    polyglotKey,
    setId: options.setId,
    supportLang,
    bundleKey: bundle.key,
    bundleLabel: bundle.label || bundle.key,
    bundleWave: bundle.wave || null,
    targetLangs,
    targetLangsCsv: targetLangs.join(","),
    targetLangsHash,
    removedSupportTargets: resolved.removedSupportTargets,
    fallbackAdded: resolved.fallbackAdded,
    channelKey: channel?.key || "",
    youtubeChannelId: channel?.channelId || "",
    customThumbnailUploadAllowed: canUploadCustomThumbnail,
    polyglotChannelEligibility: canUploadCustomThumbnail ? "eligible" : "blocked_until_phone_verified",
    deck: deckPlan,
    studyUrl,
    urlTargetLangs: urlValidation.urlTargets,
    buildCommand: `node scripts/build-polyglot-video.mjs --set ${options.setId} --support ${supportLang} --targets ${targetLangs.join(",")}`,
    noAudioPreviewCommand: `node scripts/build-polyglot-video.mjs --set ${options.setId} --support ${supportLang} --targets ${targetLangs.join(",")} --no-audio --limit 3`,
    existingPublication: existingPublication ? {
      youtubeVideoId: existingPublication.youtubeVideoId || "",
      publicationStatus: existingPublication.publicationStatus || existingPublication.status || "",
      privacyStatus: existingPublication.privacyStatus || "",
      githubRunId: existingPublication.githubRunId || "",
    } : null,
    existingCalendarReservation: existingCalendarReservation ? {
      publishAt: existingCalendarReservation.publishAt || "",
      status: existingCalendarReservation.status || "",
      channelKey: existingCalendarReservation.channelKey || "",
    } : null,
    existingProgressItem: existingProgressItem ? {
      status: existingProgressItem.status || "",
      updatedAt: existingProgressItem.updatedAt || existingProgressItem.createdAt || "",
      outputPath: existingProgressItem.outputPath || "",
      youtubeVideoId: existingProgressItem.youtubeVideoId || "",
    } : null,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    mode: "polyglot_youtube_plan",
    sourceOfTruth: bundleConfig.sourceOfTruth || "docs/video-lessons-strategy.md#polyglot-mode-multilingual-decks",
    publicationRegistry: options.publicationRegistry,
    progressRegistry: options.progressRegistry,
    physicalCalendar: options.calendar,
    allowRepublish: options.allowRepublish,
    requireOfflineDeck: options.requireOfflineDeck,
    candidate,
    blockers,
    warnings,
    summary: {
      status: blockers.length ? "blocked" : "ready",
      videoType: "polyglot",
      setId: options.setId,
      supportLang,
      bundleKey: bundle.key,
      targetLangs: targetLangs.join(","),
      targetLangsHash,
      cardCount: deckPlan.cardCount,
      channelKey: channel?.key || "",
      blockerCount: blockers.length,
      warningCount: warnings.length,
      canRenderNoAudio: blockers.length === 0,
      canUploadToYouTube: false,
    },
  };

  if (options.output) {
    fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
    fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  if (options.json) console.log(JSON.stringify(report.summary, null, 2));
  else console.log(JSON.stringify(report, null, 2));

  if (blockers.length) process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
