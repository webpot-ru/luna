#!/usr/bin/env node
import assert from "node:assert/strict";
import { selectMaximumPolyglotCardPrefix } from "./polyglot-duration-selection.mjs";

assert.deepEqual(selectMaximumPolyglotCardPrefix({
  introDurationSeconds: 10,
  outroDurationSeconds: 15,
  cardDurationsSeconds: [20, 30, 40],
  maxDurationSeconds: 85,
}), {
  availableCardCount: 3,
  selectedCardCount: 2,
  baseDurationSeconds: 25,
  selectedCardDurationSeconds: 50,
  projectedDurationSeconds: 75,
  maxDurationSeconds: 85,
  truncated: true,
});

assert.throws(() => selectMaximumPolyglotCardPrefix({
  introDurationSeconds: 80,
  outroDurationSeconds: 20,
  cardDurationsSeconds: [],
  maxDurationSeconds: 90,
}), /Intro and outro alone exceed/);

console.log("polyglot-duration-selection tests passed");
