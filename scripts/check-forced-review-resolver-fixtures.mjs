#!/usr/bin/env node
import { buildCurrentAutoConfirmationMap } from "./lib/forced-review-auto-confirmations.mjs";
import { classifyForcedReviewResolution } from "./lib/forced-review-resolver.mjs";

function fail(message) {
  throw new Error(message);
}

function classify(row, candidates, queueItem = {}) {
  return classifyForcedReviewResolution({
    queueItem: {
      priority: "P2",
      source_status: "source_partial",
      ...queueItem,
    },
    row: {
      set_id: "fixture_set",
      meaning_id: "fixture_meaning",
      language_code: "KO",
      canonical_english: "bedroom",
      native_word: "침실",
      display_word: "침실",
      transcription: "chimsil",
      ...row,
    },
    candidates,
  });
}

const ko = classify(
  {},
  [
    {
      adapter: "nikl",
      value: "침실",
      field: "native_word",
      source_ids: ["official-nikl-korean-basic-dictionary"],
      confidence: "source_partial",
    },
  ]
);
if (ko.resolution_class !== "auto_confirmed_strong") {
  fail(`Expected KO NIKL exact candidate to auto_confirmed_strong, got ${ko.resolution_class}`);
}

const th = classify(
  {
    language_code: "TH",
    canonical_english: "shower",
    native_word: "ฝักบัว",
    display_word: "ฝักบัว",
    transcription: "fàk-buua",
  },
  [
    {
      adapter: "lexitron",
      value: "ฝักบัว",
      field: "native_word",
      source_ids: ["official-lexitron-thai-en"],
      confidence: "source_partial",
    },
  ]
);
if (th.resolution_class !== "auto_confirmed_strong") {
  fail(`Expected TH LEXiTRON exact candidate to auto_confirmed_strong, got ${th.resolution_class}`);
}

const panlexOnly = classify(
  {
    language_code: "HY",
    canonical_english: "plate",
    native_word: "ափսե",
    display_word: "ափսե",
    transcription: "apse",
  },
  [
    {
      adapter: "panlex_meaning",
      value: "ափսե",
      field: "native_word",
      source_ids: ["panlex-meanings-hf-20240301"],
      confidence: "source_partial",
    },
  ]
);
if (panlexOnly.resolution_class === "auto_confirmed_strong") {
  fail("PanLex-only match must not become auto_confirmed_strong.");
}

const multiSource = classify(
  {
    language_code: "KA",
    canonical_english: "plate",
    native_word: "თეფში",
    display_word: "თეფში",
    transcription: "tepshi",
  },
  [
    {
      adapter: "panlex_meaning",
      value: "თეფში",
      field: "native_word",
      source_ids: ["panlex-meanings-hf-20240301"],
      confidence: "source_partial",
    },
    {
      adapter: "wikidata",
      value: "თეფში",
      field: "native_word",
      source_ids: ["wikidata-lexemes"],
      confidence: "source_partial",
    },
  ]
);
if (multiSource.resolution_class !== "auto_supported_multi_source") {
  fail(`Expected two weak source families to auto_supported_multi_source, got ${multiSource.resolution_class}`);
}

const fallback = classify(
  {
    language_code: "TL",
    canonical_english: "toothbrush holder",
    native_word: "toothbrush holder",
    display_word: "toothbrush holder",
    transcription: "toothbrush holder",
  },
  [
    {
      adapter: "freedict",
      value: "lalagyan ng sipilyo",
      field: "native_word",
      source_ids: ["freedict-database-index"],
      confidence: "source_partial",
    },
  ]
);
if (fallback.resolution_class !== "source_conflict_needs_repair") {
  fail(`Expected English-looking fallback with strong candidate to need repair, got ${fallback.resolution_class}`);
}

const blocker = classify(
  {},
  [],
  {
    priority: "P0",
    source_status: "conflict",
  }
);
if (blocker.resolution_class !== "source_conflict_needs_repair") {
  fail(`Expected existing P0 conflict to need repair, got ${blocker.resolution_class}`);
}

const manifestSourceIds = new Set(["official-nikl-korean-basic-dictionary"]);
const currentRows = [
  {
    set_id: "fixture_set",
    meaning_id: "fixture_meaning",
    language_code: "KO",
    native_word: "침실",
    display_word: "침실",
    transcription: "chimsil",
  },
];
const { validByKey, stale } = buildCurrentAutoConfirmationMap(
  [
    {
      set_id: "fixture_set",
      meaning_id: "fixture_meaning",
      language_code: "KO",
      current_native_word: "침실",
      current_display_word: "침실",
      current_transcription: "chimsil-old",
      decision_type: "auto_confirmed_strong",
      source_ids: ["official-nikl-korean-basic-dictionary"],
      source_note: "fixture stale decision",
    },
  ],
  currentRows,
  manifestSourceIds
);
if (validByKey.size !== 0 || stale.length !== 1 || !stale[0].issues.includes("current_transcription_mismatch")) {
  fail("Expected changed current value to make auto-confirmation stale.");
}

console.log("Forced review resolver fixtures OK.");
