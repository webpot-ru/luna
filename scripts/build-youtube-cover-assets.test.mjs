#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  buildCoverPlan,
  fittedFontSize,
  fontFamilyForText,
  ordinaryOverlaySvg,
  polyglotOverlaySvg,
  xmlEscape,
} from "./lib/youtube-cover-assets.mjs";

const deck = {
  setId: "test-deck",
  courseMetadata: {
    title: { EN: "Deck", ES: "Baraja", UZ: "Dasta", SI: "කාඩ්පත්", KA: "ბარათები" },
    description: { EN: "Everyday words.", UZ: "Kundalik so'zlar.", SI: "දෛනික වචන.", KA: "ყოველდღიური სიტყვები." },
    module: { EN: "Home", UZ: "Uy", SI: "නිවස", KA: "სახლი" },
    category: { EN: "Kitchen", UZ: "Oshxona", SI: "කුස්සිය", KA: "სამზარეულო" },
  },
};
const channels = ["UZ", "SI", "KA"].map((supportLang) => ({
  key: supportLang.toLowerCase(),
  supportLangs: [supportLang],
  channelId: `channel-${supportLang}`,
  currentHandle: `LunaCards${supportLang}`,
  customThumbnailUploadAllowed: true,
}));
const setConfig = {
  ordinaryBasePath: "ordinary.png",
  polyglotBasePath: "polyglot.png",
  ordinaryTemplate: "ordinary-v1",
  polyglotTemplate: "polyglot-v1",
  showModuleOnOrdinary: true,
};
const polyglotConfig = {
  defaults: { productionBundleKeys: ["global"] },
  bundles: [{ key: "global", label: "Global", targetLangs: ["EN", "ES"], fallbackLangs: ["KA"] }],
};
const plan = buildCoverPlan({
  setId: "test-deck",
  setConfig,
  deck,
  channels,
  supports: ["UZ", "SI", "KA"],
  types: ["ordinary", "polyglot"],
  polyglotConfig,
  outputRoot: "data/test-covers",
});
assert.equal(plan.skipped.length, 0);
assert.equal(plan.covers.filter((cover) => cover.videoType === "ordinary").length, 12);
assert.equal(plan.covers.filter((cover) => cover.videoType === "polyglot").length, 3);
assert.equal(new Set(plan.covers.map((cover) => cover.relativePath)).size, plan.covers.length);
assert.ok(!plan.covers.some((cover) => cover.videoType === "ordinary" && cover.supportLang === cover.targetLang));
assert.ok(plan.covers.every((cover) => cover.uploadEligible === true));
const ordinary = plan.covers.find((cover) => cover.videoType === "ordinary");
const polyglot = plan.covers.find((cover) => cover.videoType === "polyglot");
assert.match(ordinaryOverlaySvg(ordinary), /FlashcardsLuna/);
assert.match(polyglotOverlaySvg(polyglot), /Polyglot/);
assert.equal(xmlEscape("A&B <C>"), "A&amp;B &lt;C&gt;");
assert.ok(fittedFontSize("A very long language label", 200, 68, 24) >= 24);
assert.match(fontFamilyForText("සිංහල"), /Sinhala MN/);
assert.doesNotMatch(fontFamilyForText("English"), /Sinhala MN/);

const blockedPlan = buildCoverPlan({
  setId: "test-deck",
  setConfig,
  deck,
  channels: [{ ...channels[0], customThumbnailUploadAllowed: false }],
  supports: ["UZ"],
  types: ["ordinary"],
  polyglotConfig,
  outputRoot: "data/test-covers",
});
assert.equal(blockedPlan.covers.length, 0);
assert.equal(blockedPlan.skipped[0].reason, "custom_thumbnail_upload_not_allowed");

console.log("youtube cover asset tests passed");
