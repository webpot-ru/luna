#!/usr/bin/env node
import {
  buildTranslationSourceCoverageFindings,
} from "./lib/translation-source-coverage.mjs";

const manifestSourceIds = new Set([
  "kaikki-tagalog",
  "glad-philippines",
  "blibli-cupcake-liners-web-note",
  "panlex-license-note",
  "tatoeba-downloads-note",
  "omw-1.4",
]);

const policy = {
  policy_version: "fixture-policy",
  global_supporting_source_ids: ["omw-1.4", "panlex-license-note"],
  example_collocation_source_ids: ["tatoeba-downloads-note"],
  language_source_ids: {
    EN: ["kaikki-english"],
    TL: ["kaikki-tagalog"],
    ID: ["kaikki-indonesian"],
  },
};

const rows = [
  {
    set_id: "fixture_set",
    display_order: 1,
    meaning_id: "tl_aluminum_foil",
    canonical_english: "aluminum foil",
    language_code: "TL",
    native_word: "aluminum foil",
    display_word: "aluminum foil",
    transcription: "aluminum foil",
  },
  {
    set_id: "fixture_set",
    display_order: 2,
    meaning_id: "tl_cling_wrap",
    canonical_english: "plastic wrap",
    language_code: "TL",
    native_word: "cling wrap",
    display_word: "cling wrap",
    transcription: "cling wrap",
  },
  {
    set_id: "fixture_set",
    display_order: 3,
    meaning_id: "id_pantri",
    canonical_english: "pantry",
    language_code: "ID",
    native_word: "pantri",
    display_word: "pantri",
    transcription: "pantri",
  },
];

const decisions = [
  {
    set_id: "fixture_set",
    meaning_id: "tl_cling_wrap",
    language_code: "TL",
    current_native_word: "cling wrap",
    current_display_word: "cling wrap",
    current_transcription: "cling wrap",
    decision_type: "source_attested_loan",
    source_confidence: "source_exact",
    source_ids: ["glad-philippines"],
    source_note: "Philippines retail/product usage attests Cling Wrap for this household meaning.",
  },
];

const findings = await buildTranslationSourceCoverageFindings(rows, {
  manifestSourceIds,
  decisions,
  policy,
});

if (!findings.blockers.some((blocker) => blocker.meaning_id === "tl_aluminum_foil")) {
  throw new Error("Expected exact English fallback to be a translation coverage blocker.");
}
if (!findings.rows.some((row) => row.meaning_id === "tl_cling_wrap" && row.status === "loan_decision")) {
  throw new Error("Expected source-backed loan decision to pass as loan_decision.");
}
if (!findings.rows.some((row) => row.meaning_id === "id_pantri" && row.status === "source_partial")) {
  throw new Error("Expected non-fallback row with source family to be source_partial in v1.");
}

const staleFindings = await buildTranslationSourceCoverageFindings(rows, {
  manifestSourceIds,
  decisions: [{ ...decisions[0], current_transcription: "plastic wrap" }],
  policy,
});
if (!staleFindings.blockers.some((blocker) => blocker.status === "stale_decision")) {
  throw new Error("Expected stale source decision to fail closed.");
}

const unrelatedDeckFindings = await buildTranslationSourceCoverageFindings(rows, {
  manifestSourceIds,
  decisions: [{ ...decisions[0], set_id: "another_set" }],
  policy,
});
if (unrelatedDeckFindings.blockers.some((blocker) => blocker.reason === "decision_without_current_row")) {
  throw new Error("Expected source decisions from unchecked decks to be ignored, not treated as stale.");
}

const tatoebaOnlyFindings = await buildTranslationSourceCoverageFindings(
  [
    {
      set_id: "fixture_set",
      display_order: 4,
      meaning_id: "tl_tatoeba_only",
      canonical_english: "paper towel",
      language_code: "TL",
      native_word: "tuwalyang papel",
      display_word: "tuwalyang papel",
      transcription: "tuwalyang papel",
    },
  ],
  {
    manifestSourceIds,
    decisions: [],
    policy: {
      ...policy,
      language_source_ids: { TL: [] },
      example_collocation_source_ids: ["tatoeba-downloads-note"],
    },
  }
);
if (!tatoebaOnlyFindings.rows.some((row) => row.status === "no_source")) {
  throw new Error("Expected Tatoeba-only support to remain no_source for entry translation truth.");
}

const panlexOnlyFindings = await buildTranslationSourceCoverageFindings(
  [
    {
      set_id: "fixture_set",
      display_order: 5,
      meaning_id: "tl_panlex_only",
      canonical_english: "spatula",
      language_code: "TL",
      native_word: "spatula",
      display_word: "spatula",
      transcription: "spatula",
    },
    {
      set_id: "fixture_set",
      display_order: 6,
      meaning_id: "tl_panlex_supporting_only",
      canonical_english: "paper towel",
      language_code: "TL",
      native_word: "tuwalyang papel",
      display_word: "tuwalyang papel",
      transcription: "tuwalyang papel",
    },
  ],
  {
    manifestSourceIds,
    decisions: [],
    policy: {
      ...policy,
      language_source_ids: { TL: ["panlex-license-note"] },
    },
  }
);
if (!panlexOnlyFindings.blockers.some((blocker) => blocker.meaning_id === "tl_panlex_only")) {
  throw new Error("Expected English-looking PanLex-only match to remain blocked without a source-backed loan decision.");
}
if (!panlexOnlyFindings.rows.some((row) => row.meaning_id === "tl_panlex_supporting_only" && row.status === "source_partial")) {
  throw new Error("Expected non-fallback PanLex-only support to be source_partial, not source_exact.");
}

console.log("Translation source coverage fixtures OK.");
