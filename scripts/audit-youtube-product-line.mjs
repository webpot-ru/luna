#!/usr/bin/env node
import fs from "node:fs";

import { sameViewerLanguageTargetBlocker } from "./lib/youtube-language-pair-policy.mjs";
import { isActivePublication } from "./lib/youtube-publication-registry.mjs";

const ORDINARY_REGISTRY = "config/youtube-published-videos.json";
const POLYGLOT_REGISTRY = "config/youtube-polyglot-published-videos.json";
const POLYGLOT_PROGRESS = "config/youtube-polyglot-progress.json";
const POLYGLOT_PLAYLISTS = "config/youtube-polyglot-playlists.json";
const POLYGLOT_BUNDLES = "config/polyglot-video-bundles.json";
const CHANNELS = "config/youtube-channels.json";
const ROUTING = "config/youtube-api-project-routing.json";
const LANGUAGE_ORDER = "config/language-order.json";

const DEFAULT_SET_IDS = [
  "home_kitchen_cookware_pilot_01",
  "home_kitchen_cooking_actions_a1_a2",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeCode(value) {
  return String(value || "").trim().replace(/_/g, "-").toUpperCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseArgs(argv) {
  const options = { json: false, setIds: DEFAULT_SET_IDS };
  for (const arg of argv) {
    if (arg === "--json") options.json = true;
    else if (arg.startsWith("--sets=")) options.setIds = unique(arg.slice(7).split(",").map((value) => value.trim()));
    else if (arg === "--help" || arg === "-h") {
      console.log("Usage: node scripts/audit-youtube-product-line.mjs [--sets=set_a,set_b] [--json]");
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function countBy(rows, field, fallback = "(empty)") {
  const counts = {};
  for (const row of rows) {
    const key = String(row[field] || fallback);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function resolveBundleTargets(bundle, supportLang) {
  const support = normalizeCode(supportLang);
  const desiredCount = unique((bundle.targetLangs || []).map(normalizeCode)).length;
  const targets = unique((bundle.targetLangs || []).map(normalizeCode)).filter((code) => code !== support);
  for (const code of unique((bundle.fallbackLangs || []).map(normalizeCode))) {
    if (targets.length >= desiredCount) break;
    if (code !== support && !targets.includes(code)) targets.push(code);
  }
  return targets;
}

function sameTargetSet(left, right) {
  return [...left].sort().join(",") === [...right].sort().join(",");
}

function buildContext() {
  const channels = readJson(CHANNELS).channels || [];
  const routing = readJson(ROUTING).projects || [];
  const targetLangs = readJson(LANGUAGE_ORDER).map((row) => normalizeCode(row.spreadsheetCode));
  const bundleConfig = readJson(POLYGLOT_BUNDLES);
  const bundles = bundleConfig.bundles || [];
  const coreBundleKeys = bundleConfig.productLine?.coreBundleKeys || [];
  const bundleByKey = new Map(bundles.map((bundle) => [bundle.key, bundle]));
  const canonicalSupports = routing.flatMap((route) => route.supportVariants || []).map(normalizeCode);
  const routeBySupport = new Map(
    routing.flatMap((route) => (route.supportVariants || []).map((support) => [normalizeCode(support), route.key])),
  );
  const channelBySupport = new Map();
  for (const channel of channels) {
    for (const support of channel.supportLangs || []) channelBySupport.set(normalizeCode(support), channel);
  }
  const canonicalSupportByChannel = new Map();
  for (const support of canonicalSupports) {
    const channel = channelBySupport.get(support);
    if (channel) canonicalSupportByChannel.set(channel.key, support);
  }
  return {
    channels,
    routing,
    targetLangs,
    bundles,
    bundleByKey,
    coreBundleKeys,
    canonicalSupports,
    routeBySupport,
    channelBySupport,
    canonicalSupportByChannel,
  };
}

function auditOrdinary(setId, ordinaryRows, context) {
  const expectedPairs = [];
  for (const supportLang of context.canonicalSupports) {
    for (const targetLang of context.targetLangs) {
      if (!sameViewerLanguageTargetBlocker({ supportLang, targetLang })) expectedPairs.push([supportLang, targetLang]);
    }
  }
  const activeRows = ordinaryRows.filter((row) => row.setId === setId && isActivePublication(row));
  const activeKeys = new Set(
    activeRows.map((row) => `${normalizeCode(row.supportLang)}|${normalizeCode(row.targetLang)}`),
  );
  const expectedKeys = new Set(expectedPairs.map(([support, target]) => `${support}|${target}`));
  const missingPairs = expectedPairs
    .filter(([support, target]) => !activeKeys.has(`${support}|${target}`))
    .map(([supportLang, targetLang]) => ({ supportLang, targetLang, route: context.routeBySupport.get(supportLang) }));
  const routes = context.routing.map((route) => {
    const expected = expectedPairs.filter(([support]) => context.routeBySupport.get(support) === route.key).length;
    const missing = missingPairs.filter((pair) => pair.route === route.key).length;
    return { route: route.key, expected, covered: expected - missing, missing };
  });
  return {
    setId,
    expected: expectedPairs.length,
    covered: expectedPairs.length - missingPairs.length,
    missing: missingPairs.length,
    activeRegistryRows: activeRows.length,
    unexpectedActiveRegistryRows: activeRows.filter((row) => (
      !expectedKeys.has(`${normalizeCode(row.supportLang)}|${normalizeCode(row.targetLang)}`)
    )).length,
    routes,
    missingPairs,
    privacyStatuses: countBy(activeRows, "privacyStatus"),
    publicationStatuses: countBy(activeRows, "publicationStatus"),
  };
}

function inferLegacyBundle(row, channel, context) {
  const rowTargets = unique((row.targetLangs || String(row.targetLang || "").split(",")).map(normalizeCode));
  const matches = [];
  for (const bundleKey of context.coreBundleKeys) {
    const bundle = context.bundleByKey.get(bundleKey);
    if (!bundle) continue;
    for (const supportLang of channel.supportLangs || []) {
      if (sameTargetSet(rowTargets, resolveBundleTargets(bundle, supportLang))) {
        matches.push(bundleKey);
        break;
      }
    }
  }
  return unique(matches).length === 1 ? unique(matches)[0] : "";
}

function auditPolyglot(setId, polyglotRows, progressRows, playlistRows, context) {
  const activeRows = polyglotRows.filter((row) => row.setId === setId && isActivePublication(row));
  const progressKeys = new Set(progressRows.map((row) => row.polyglotKey).filter(Boolean));
  const playlistKeys = new Set(playlistRows.map((row) => row.playlist_key || row.key).filter(Boolean));
  const coreRows = [];
  const legacyBundleInferences = [];

  for (const row of activeRows) {
    const support = normalizeCode(row.supportLang);
    const channel = context.channelBySupport.get(support);
    if (!channel) continue;
    let effectiveBundleKey = context.coreBundleKeys.includes(row.bundleKey) ? row.bundleKey : "";
    if (!effectiveBundleKey) {
      effectiveBundleKey = inferLegacyBundle(row, channel, context);
      if (effectiveBundleKey) {
        legacyBundleInferences.push({
          youtubeVideoId: row.youtubeVideoId,
          supportLang: support,
          storedBundleKey: row.bundleKey,
          effectiveBundleKey,
        });
      }
    }
    if (effectiveBundleKey) coreRows.push({ row, channelKey: channel.key, effectiveBundleKey });
  }

  const slotRows = new Map();
  for (const item of coreRows) {
    const key = `${item.channelKey}|${item.effectiveBundleKey}`;
    if (!slotRows.has(key)) slotRows.set(key, []);
    slotRows.get(key).push(item.row);
  }
  const expectedSlots = context.channels.flatMap((channel) => (
    context.coreBundleKeys.map((bundleKey) => `${channel.key}|${bundleKey}`)
  ));
  const missingSlots = expectedSlots.filter((key) => !slotRows.has(key));
  const duplicateSlots = [...slotRows.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([slot, rows]) => ({
      slot,
      videos: rows.map((row) => ({
        youtubeVideoId: row.youtubeVideoId,
        supportLang: normalizeCode(row.supportLang),
        contentScope: row.contentScope || "full",
      })),
    }));
  let fullOnlySlots = 0;
  let shortOnlySlots = 0;
  let fullAndShortSlots = 0;
  for (const rows of slotRows.values()) {
    const scopes = new Set(rows.map((row) => row.contentScope || "full"));
    if (scopes.has("full") && scopes.has("short_unverified")) fullAndShortSlots += 1;
    else if (scopes.has("full")) fullOnlySlots += 1;
    else if (scopes.has("short_unverified")) shortOnlySlots += 1;
  }
  const strictCanonicalSlots = new Set(
    activeRows
      .filter((row) => context.coreBundleKeys.includes(row.bundleKey))
      .filter((row) => normalizeCode(row.supportLang) === context.canonicalSupportByChannel.get(row.channelKey))
      .map((row) => `${row.channelKey}|${row.bundleKey}`),
  );
  const legacySupportRows = activeRows
    .filter((row) => {
      const channel = context.channelBySupport.get(normalizeCode(row.supportLang));
      return channel && normalizeCode(row.supportLang) !== context.canonicalSupportByChannel.get(channel.key);
    })
    .map((row) => ({
      youtubeVideoId: row.youtubeVideoId,
      channelKey: row.channelKey,
      supportLang: normalizeCode(row.supportLang),
      canonicalSupportLang: context.canonicalSupportByChannel.get(row.channelKey),
      bundleKey: row.bundleKey,
    }));
  const nonCoreRows = activeRows.filter((row) => !coreRows.some((item) => item.row === row));

  return {
    setId,
    coreBundleKeys: context.coreBundleKeys,
    expectedPhysicalSlots: expectedSlots.length,
    coveredPhysicalSlots: expectedSlots.length - missingSlots.length,
    strictCanonicalSlots: strictCanonicalSlots.size,
    missingPhysicalSlots: missingSlots,
    activeRegistryRows: activeRows.length,
    activeCoreRows: coreRows.length,
    fullOnlySlots,
    shortOnlySlots,
    fullAndShortSlots,
    duplicateSlots,
    legacySupportRows,
    legacyBundleInferences,
    nonCoreRows: nonCoreRows.map((row) => ({
      youtubeVideoId: row.youtubeVideoId,
      supportLang: normalizeCode(row.supportLang),
      bundleKey: row.bundleKey,
      contentScope: row.contentScope || "full",
    })),
    missingPlaylistRegistryRows: activeRows.filter((row) => !playlistKeys.has(row.playlist_key)).length,
    missingProgressRows: activeRows.filter((row) => !progressKeys.has(row.polyglotKey)).length,
    emptyYoutubePlaylistIds: activeRows.filter((row) => !row.youtubePlaylistId).length,
    privacyStatuses: countBy(activeRows, "privacyStatus"),
    publicationStatuses: countBy(activeRows, "publicationStatus"),
    contentScopes: countBy(activeRows, "contentScope", "full"),
  };
}

function printText(report) {
  console.log("YouTube product-line audit (local durable registries only; no API calls or writes)");
  console.log(`Core Polyglot bundles: ${report.corePolyglotBundleKeys.join(", ")}`);
  for (const ordinary of report.ordinary) {
    console.log(`\nOrdinary ${ordinary.setId}: ${ordinary.covered}/${ordinary.expected}, missing=${ordinary.missing}`);
    for (const route of ordinary.routes) console.log(`  ${route.route}: ${route.covered}/${route.expected}, missing=${route.missing}`);
    if (ordinary.missingPairs.length && ordinary.missingPairs.length <= 100) {
      console.log(`  missing pairs: ${ordinary.missingPairs.map((pair) => `${pair.supportLang}->${pair.targetLang}`).join(", ")}`);
    } else if (ordinary.missingPairs.length) {
      const counts = {};
      for (const pair of ordinary.missingPairs) counts[pair.supportLang] = (counts[pair.supportLang] || 0) + 1;
      console.log(`  missing by support: ${Object.entries(counts).map(([support, count]) => `${support}:${count}`).join(", ")}`);
    }
    if (ordinary.unexpectedActiveRegistryRows) console.log(`  out-of-matrix active registry rows=${ordinary.unexpectedActiveRegistryRows}`);
  }
  for (const polyglot of report.polyglot) {
    console.log(`\nPolyglot ${polyglot.setId}: physical slots ${polyglot.coveredPhysicalSlots}/${polyglot.expectedPhysicalSlots}; strict canonical slots ${polyglot.strictCanonicalSlots}/${polyglot.expectedPhysicalSlots}`);
    console.log(`  full-only=${polyglot.fullOnlySlots}, short-only=${polyglot.shortOnlySlots}, full+short duplicates=${polyglot.fullAndShortSlots}`);
    console.log(`  active rows=${polyglot.activeRegistryRows}, duplicate slots=${polyglot.duplicateSlots.length}, legacy support rows=${polyglot.legacySupportRows.length}, inferred legacy bundles=${polyglot.legacyBundleInferences.length}, non-core rows=${polyglot.nonCoreRows.length}`);
    console.log(`  state debts: missing playlist registry=${polyglot.missingPlaylistRegistryRows}, missing progress=${polyglot.missingProgressRows}, empty YouTube playlist id=${polyglot.emptyYoutubePlaylistIds}`);
    if (polyglot.missingPhysicalSlots.length && polyglot.missingPhysicalSlots.length <= 40) {
      console.log(`  missing slots: ${polyglot.missingPhysicalSlots.join(", ")}`);
    } else if (polyglot.missingPhysicalSlots.length) {
      console.log(`  missing slots=${polyglot.missingPhysicalSlots.length} across ${new Set(polyglot.missingPhysicalSlots.map((slot) => slot.split("|")[0])).size} channels`);
    }
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const context = buildContext();
  const ordinaryRows = readJson(ORDINARY_REGISTRY).publications || [];
  const polyglotRows = readJson(POLYGLOT_REGISTRY).publications || [];
  const progressRows = readJson(POLYGLOT_PROGRESS).items || [];
  const playlistRows = readJson(POLYGLOT_PLAYLISTS).playlists || [];
  const report = {
    generatedAt: new Date().toISOString(),
    evidenceScope: "local_durable_registries_no_external_api",
    physicalChannelCount: context.channels.length,
    targetVariantCount: context.targetLangs.length,
    corePolyglotBundleKeys: context.coreBundleKeys,
    ordinary: options.setIds.map((setId) => auditOrdinary(setId, ordinaryRows, context)),
    polyglot: options.setIds.map((setId) => auditPolyglot(setId, polyglotRows, progressRows, playlistRows, context)),
  };
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else printText(report);
}

main();
