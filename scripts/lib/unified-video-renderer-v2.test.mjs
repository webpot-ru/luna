import test from "node:test";
import assert from "node:assert/strict";
import {
  generateUnifiedRendererHtml,
  getLanguageNameInLang,
} from "./card-slide-template.mjs";
import { getDeckArtDataUri } from "./video-deck-art.mjs";

test("generateUnifiedRendererHtml returns self-contained v2 HTML without external CDN dependencies", () => {
  const html = generateUnifiedRendererHtml({ setId: "home_kitchen_cookware_pilot_01" });
  assert.ok(html.includes("window.renderTask"));
  assert.ok(html.includes("screen-intro"));
  assert.ok(html.includes("screen-card"));
  assert.ok(html.includes("screen-promo"));
  assert.ok(html.includes("flashcardsluna.com"));
  assert.ok(!html.includes("cdn.tailwindcss.com"), "must not depend on Tailwind CDN");
  assert.ok(!html.includes("fonts.googleapis.com"), "must not depend on Google Fonts CDN");
});

test("generateUnifiedRendererHtml works without arguments for legacy callers", () => {
  const html = generateUnifiedRendererHtml();
  assert.ok(html.includes("window.renderTask"));
});

test("getDeckArtDataUri resolves known deck base art and safely falls back for unknown sets", () => {
  const knownArt = getDeckArtDataUri("home_kitchen_cookware_pilot_01");
  assert.ok(knownArt.startsWith("data:image/"), "known deck should resolve base art data URI");
  assert.equal(getDeckArtDataUri("nonexistent_deck_id_for_test"), "");
});

test("getLanguageNameInLang remains exported and functional", () => {
  assert.equal(getLanguageNameInLang("EN", "RU"), "Английский");
});
