#!/usr/bin/env node
import assert from "node:assert/strict";
import { buildDeckProfileQualityFindings } from "./lib/deck-profile-policy.mjs";

assert.equal(
  buildDeckProfileQualityFindings(
    [
      {
        set_id: "fixture_food",
        meaning_id: "food_order",
        canonical_english: "food order",
        part_of_speech: "noun",
        canonical_example_en: "The food order is ready.",
        semantic_scene: { target_object: "food order", target_display: "a food order" },
      },
      {
        set_id: "fixture_food",
        meaning_id: "food_container",
        canonical_english: "food container",
        part_of_speech: "noun",
        canonical_example_en: "The food container is in the bag.",
        semantic_scene: { target_object: "food container", target_display: "a food container" },
      },
    ],
    { deck_profile: ["food_countability"], risk_flags: [] }
  ).blockers.length,
  0,
  "Specific food compounds should not be treated as generic food placeholders"
);

assert.equal(
  buildDeckProfileQualityFindings(
    [
      {
        set_id: "fixture_food",
        meaning_id: "meal",
        canonical_english: "meal",
        part_of_speech: "noun",
        canonical_example_en: "The food is ready.",
        semantic_scene: { target_object: "meal", target_display: "a meal" },
      },
    ],
    { deck_profile: ["food_countability"], risk_flags: [] }
  ).blockers.some((issue) => issue.code === "food_countability_weak_anchor"),
  true,
  "Generic food placeholders should still fail for food/countability decks"
);

console.log("Deck profile policy fixtures OK.");
