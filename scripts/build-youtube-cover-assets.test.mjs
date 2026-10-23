#!/usr/bin/env node
import assert from "node:assert/strict";
import sharp from "sharp";
import { measureCoverHeadings, parseArgs } from "./build-youtube-cover-assets.mjs";

import {
  buildCoverPlan,
  fittedFontSize,
  fitCoverDescription,
  fontFamilyForText,
  ordinaryOverlaySvg,
  polyglotOverlaySvg,
  xmlEscape,
} from "./lib/youtube-cover-assets.mjs";

const deck = {
  setId: "test-deck",
  courseMetadata: {
    title: { EN: "Deck", ES: "Baraja", NB: "Kort", UZ: "Dasta", SI: "කාඩ්පත්", KA: "ბარათები" },
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
  bundles: [
    { key: "global", label: "Global", targetLangs: ["EN", "ES"], fallbackLangs: ["KA"] },
    { key: "southeast", label: "Southeast", targetLangs: ["SI", "KA"], fallbackLangs: ["EN"] },
  ],
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
assert.equal(plan.covers.filter((cover) => cover.videoType === "ordinary").length, 15);
assert.equal(plan.covers.filter((cover) => cover.videoType === "polyglot").length, 3);
assert.equal(new Set(plan.covers.map((cover) => cover.relativePath)).size, plan.covers.length);
assert.ok(!plan.covers.some((cover) => cover.videoType === "ordinary" && cover.supportLang === cover.targetLang));
assert.ok(plan.covers.some((cover) => cover.videoType === "ordinary" && cover.targetLang === "NO"));
assert.ok(!plan.covers.some((cover) => cover.videoType === "ordinary" && cover.targetLang === "NB"));
assert.ok(plan.covers.every((cover) => cover.uploadEligible === true));
const ordinary = plan.covers.find((cover) => cover.videoType === "ordinary");
const polyglot = plan.covers.find((cover) => cover.videoType === "polyglot");
assert.match(ordinaryOverlaySvg(ordinary), /FlashcardsLuna/);
assert.match(polyglotOverlaySvg(polyglot), /Polyglot/);
assert.equal(xmlEscape("A&B <C>"), "A&amp;B &lt;C&gt;");
const longDescription = "Слова для рабочего стола и кабинета. Начальный уровень.";
assert.equal(fitCoverDescription(longDescription, 488).lines.length, 2);
assert.match(ordinaryOverlaySvg({ ...ordinary, description: longDescription, descriptionLayout: "wrapped-safe-area-v1" }), /lengthAdjust="spacingAndGlyphs"/);
assert.doesNotMatch(ordinaryOverlaySvg(ordinary), /lengthAdjust=/);
assert.throws(() => fitCoverDescription("W".repeat(300), 488), /does not fit/);
for (const text of ["คำศัพท์โต๊ะทำงาน ระดับต้น", "මේසය සහ කාර්යාල වචන. මූලික මට්ටම.", "စားပွဲနှင့် ရုံးသုံးစကားလုံးများ။ အခြေခံအဆင့်။"]) {
  assert.ok(fitCoverDescription(text, 528).lines.length <= 2);
}
assert.ok(fittedFontSize("A very long language label", 200, 68, 24) >= 24);
assert.match(fontFamilyForText("සිංහල"), /Sinhala MN/);
assert.doesNotMatch(fontFamilyForText("English"), /Sinhala MN/);

const filteredPlan = buildCoverPlan({
  setId: "test-deck",
  setConfig,
  deck,
  channels,
  supports: ["UZ"],
  types: ["ordinary", "polyglot"],
  targets: ["ES"],
  bundles: ["global"],
  polyglotConfig,
  outputRoot: "data/test-covers",
});
assert.deepEqual(filteredPlan.covers.map((cover) => [cover.videoType, cover.targetLang || cover.bundleKey]), [
  ["ordinary", "ES"],
  ["polyglot", "global"],
]);

const approvedExpansionPlan = buildCoverPlan({
  setId: "test-deck",
  setConfig,
  deck,
  channels,
  supports: ["UZ"],
  types: ["polyglot"],
  bundles: ["southeast"],
  polyglotConfig,
  outputRoot: "data/test-covers",
});
assert.deepEqual(approvedExpansionPlan.covers.map((cover) => cover.bundleKey), ["southeast"]);

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

const offlinePlan = buildCoverPlan({
  setId: "test-deck", setConfig: { ...setConfig, ordinaryLevelLabel: "A1–A2" }, deck,
  channels: [{ ...channels[0], customThumbnailUploadAllowed: false }], supports: ["UZ"], types: ["ordinary"],
  polyglotConfig, outputRoot: "data/test-review-covers", offlineReview: true,
});
assert.ok(offlinePlan.covers.length > 0);
assert.ok(offlinePlan.covers.every((row) => row.uploadEligible === false && row.targetLabel.endsWith("A1–A2")));
const norwegianPlan = buildCoverPlan({
  setId: "test-deck", setConfig, deck,
  channels: [{ key: "no", supportLangs: ["NO"], customThumbnailUploadAllowed: true }], supports: ["NO"], types: ["ordinary"],
  polyglotConfig, outputRoot: "data/test-no-covers",
});
assert.ok(norwegianPlan.covers.length > 0);
assert.ok(norwegianPlan.covers.every((row) => row.title === "Kort"));

assert.equal(parseArgs([]).offlineReview, false);
assert.equal(parseArgs(["--offline-review"]).offlineReview, true);
assert.equal(await measureCoverHeadings(ordinary), ordinary);
const measured = await measureCoverHeadings({
  ...ordinary,
  measureHeadings: true,
  targetLabel: "English (United Kingdom and Northern Ireland) A1–A2",
});
const measuredText = await sharp({ text: {
  text: measured.targetLabel,
  font: `Noto Sans ${measured.measuredTargetFontSize}`,
  rgba: true,
  dpi: 72,
} }).toBuffer({ resolveWithObject: true });
assert.ok(measuredText.info.width <= 590);
assert.ok(measuredText.info.height <= 70);
assert.ok(measured.measuredTargetFontSize > 0);
assert.match(ordinaryOverlaySvg(measured), new RegExp(`font-size="${measured.measuredTargetFontSize}"`));

console.log("youtube cover asset tests passed");
