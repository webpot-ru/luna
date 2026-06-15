#!/usr/bin/env node
import {
  allEntrySourceBackedTranslationLanguageCodes,
  buildEntrySourceBackedTranslationFindings,
} from "./lib/entry-source-backed-translations.mjs";

const manifestSourceIds = new Set([
  "kaikki-tagalog",
  "tagalog-dictionary",
  "drops-tagalog",
  "glad-philippines",
  "kbbi-pantri-web-note",
  "blibli-cupcake-liners-web-note",
  "mobituki-swahili-spatula-web-note",
]);

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
    meaning_id: "tl_paper_towel",
    canonical_english: "paper towel",
    language_code: "TL",
    native_word: "tuwalyang papel",
    display_word: "tuwalyang papel",
    transcription: "tuwalyang papel",
  },
  {
    set_id: "fixture_set",
    display_order: 3,
    meaning_id: "tl_cling_wrap",
    canonical_english: "plastic wrap",
    language_code: "TL",
    native_word: "cling wrap",
    display_word: "cling wrap",
    transcription: "cling wrap",
  },
  {
    set_id: "fixture_set",
    display_order: 4,
    meaning_id: "id_pantry",
    canonical_english: "pantry",
    language_code: "ID",
    native_word: "pantry",
    display_word: "pantry",
    transcription: "pantry",
  },
  {
    set_id: "fixture_set",
    display_order: 5,
    meaning_id: "id_pantri",
    canonical_english: "pantry",
    language_code: "ID",
    native_word: "pantri",
    display_word: "pantri",
    transcription: "pantri",
  },
  {
    set_id: "fixture_set",
    display_order: 6,
    meaning_id: "id_kertas_cupcake",
    canonical_english: "cupcake liners",
    language_code: "ID",
    native_word: "kertas cupcake",
    display_word: "kertas cupcake",
    transcription: "kertas cupcake",
  },
  {
    set_id: "fixture_set",
    display_order: 7,
    meaning_id: "sw_spatula",
    canonical_english: "spatula",
    language_code: "SW",
    native_word: "spatula",
    display_word: "spatula",
    transcription: "spatula",
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
    source_note: "Philippines retail/product usage attests ClingWrap/Cling Wrap as the learner-facing household term.",
  },
  {
    set_id: "fixture_set",
    meaning_id: "id_kertas_cupcake",
    language_code: "ID",
    current_native_word: "kertas cupcake",
    current_display_word: "kertas cupcake",
    current_transcription: "kertas cupcake",
    decision_type: "source_exact_repair",
    source_confidence: "source_exact",
    source_ids: ["blibli-cupcake-liners-web-note"],
    source_note: "Indonesian product usage supports kertas cupcake for cupcake paper liners.",
  },
];

const findings = await buildEntrySourceBackedTranslationFindings(rows, {
  manifestSourceIds,
  decisions,
  enforcedLanguageCodes: new Set(["TL"]),
});

if (findings.blockers.length !== 1) {
  throw new Error(`Expected exactly 1 blocker, got ${findings.blockers.length}`);
}
if (findings.blockers[0].meaning_id !== "tl_aluminum_foil") {
  throw new Error(`Expected aluminum foil blocker, got ${findings.blockers[0].meaning_id}`);
}
if (!findings.reviewed.some((reviewed) => reviewed.meaning_id === "tl_cling_wrap")) {
  throw new Error("Expected source-attested cling wrap decision to pass.");
}

const allLanguageFindings = await buildEntrySourceBackedTranslationFindings(rows, {
  manifestSourceIds,
  decisions,
  enforcedLanguageCodes: allEntrySourceBackedTranslationLanguageCodes,
});

const allLanguageBlockerIds = new Set(allLanguageFindings.blockers.map((blocker) => blocker.meaning_id));
if (!allLanguageBlockerIds.has("id_pantry")) {
  throw new Error("Expected ID pantry English fallback to fail in all-language mode.");
}
if (!allLanguageBlockerIds.has("sw_spatula")) {
  throw new Error("Expected SW spatula English fallback to fail in all-language mode.");
}
if (allLanguageBlockerIds.has("id_pantri")) {
  throw new Error("Expected repaired ID pantri to pass without a source decision.");
}
if (allLanguageBlockerIds.has("id_kertas_cupcake")) {
  throw new Error("Expected source-backed ID kertas cupcake repair decision to pass.");
}

const staleFindings = await buildEntrySourceBackedTranslationFindings(rows, {
  manifestSourceIds,
  decisions: [
    {
      ...decisions[0],
      current_display_word: "plastic wrap",
    },
  ],
  enforcedLanguageCodes: allEntrySourceBackedTranslationLanguageCodes,
});

if (!staleFindings.blockers.some((blocker) => blocker.meaning_id === "tl_cling_wrap")) {
  throw new Error("Expected stale source-backed decision to fail closed.");
}
if (!staleFindings.blockers.some((blocker) => blocker.meaning_id === "id_kertas_cupcake")) {
  throw new Error("Expected stale non-TL source-backed decision to fail closed.");
}

console.log("Entry source-backed translation fixtures OK.");
