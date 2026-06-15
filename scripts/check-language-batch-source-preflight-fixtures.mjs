#!/usr/bin/env node
import { loadReferenceSourcesManifest } from "./lib/transcription-source-policy.mjs";
import { buildLanguageBatchSourcePreflight } from "./lib/language-batch-source-preflight.mjs";

const manifest = await loadReferenceSourcesManifest();
const manifestSourceIds = new Set((manifest.sources ?? []).map((source) => source.id));

const meaningMetaByMeaningId = {
  fixture_cup_01: { canonical_english: "cup", part_of_speech: "noun" },
  fixture_plate_01: { canonical_english: "plate", part_of_speech: "noun" },
  fixture_sink_01: { canonical_english: "sink", part_of_speech: "noun" },
  fixture_cups_01: { canonical_english: "cups", part_of_speech: "noun" },
  fixture_apple_01: {
    canonical_english: "apple",
    part_of_speech: "noun",
    canonical_example_en: "The apple is in the bowl.",
    semantic_scene: { target_object: "apple", subject_number: "singular", state_or_location: "in the bowl" },
  },
  fixture_apertium_01: { canonical_english: "mug", part_of_speech: "noun" },
  number_zero_01: {
    canonical_english: "zero",
    part_of_speech: "number",
    canonical_example_en: "Zero apples are in the basket.",
    semantic_scene: { target_object: "apples", target_display: "zero", subject_number: "plural" },
  },
  fixture_cjk_ja_01: {
    canonical_english: "prepare",
    part_of_speech: "verb",
    canonical_example_en: "Prepare the vegetables.",
    semantic_scene: { target_object: "vegetables", target_display: "to prepare", action_or_state: "prepare" },
  },
  fixture_lo_spacing_01: {
    canonical_english: "prepare",
    part_of_speech: "verb",
    canonical_example_en: "Prepare the vegetables.",
    semantic_scene: { target_object: "vegetables", target_display: "to prepare", action_or_state: "prepare" },
  },
  fixture_km_spacing_01: {
    canonical_english: "prepare",
    part_of_speech: "verb",
    canonical_example_en: "Prepare the vegetables.",
    semantic_scene: { target_object: "vegetables", target_display: "to prepare", action_or_state: "prepare" },
  },
  fixture_my_action_surface_01: {
    canonical_english: "prepare",
    part_of_speech: "verb",
    canonical_example_en: "Prepare the vegetables.",
    semantic_scene: { target_object: "vegetables", target_display: "to prepare", action_or_state: "prepare" },
  },
};

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

const goldRows = [
  {
    set_id: "fixture_language_batch_preflight",
    meaning_id: "fixture_cup_01",
    canonical_english: "cup",
    part_of_speech: "noun",
    language_code: "ES",
    native_word: "vaso",
    word_with_article_or_marker: "vaso",
    transcription: "vaso",
    fixture_apertium_match: true,
    fixture_apertium_candidate: "vaso",
    example_text: "El vaso está en la mesa.",
  },
  {
    set_id: "fixture_language_batch_preflight",
    meaning_id: "fixture_plate_01",
    canonical_english: "plate",
    part_of_speech: "noun",
    language_code: "FR",
    native_word: "assiette",
    word_with_article_or_marker: "assiette",
    transcription: "/a.sjɛt/",
    fixture_kaikki_match: true,
    fixture_kaikki_candidate: "assiette",
    fixture_dbnary_match: true,
    fixture_dbnary_candidate: "assiette",
    fixture_freedict_match: true,
    fixture_freedict_candidate: "assiette",
    external_mt_suggestion: "assiette",
    external_mt_provider: "fixture-mt",
    example_text: "L'assiette est sur la table.",
  },
];

const gold = await buildLanguageBatchSourcePreflight(goldRows, {
  manifestSourceIds,
  meaningMetaByMeaningId,
  fixtureToolSources: true,
});
if (gold.blocker_count !== 0) {
  fail(`Expected gold preflight to have 0 blockers, got ${gold.blocker_count}.`);
}
if (!gold.warnings.some((warning) => warning.code === "optional_tool_missing")) {
  fail("Expected missing optional tool to produce a warning, not a blocker.");
}
if (
  gold.source_candidates.some(
    (candidate) => candidate.source_ids.includes("tool-epitran-g2p") && candidate.language_code === "ES"
  )
) {
  fail("ES copy-display rows must not produce Epitran source candidates.");
}
if (
  !gold.source_candidates.some(
    (candidate) => candidate.source_ids.includes("tool-epitran-g2p") && candidate.language_code === "FR"
  )
) {
  fail("Expected fixture Epitran candidate to be reported as source_partial for FR source-lookup rows.");
}
if (
  !gold.source_candidates.some(
    (candidate) =>
      candidate.adapter === "apertium" &&
      candidate.language_code === "ES" &&
      candidate.confidence === "source_partial"
  )
) {
  fail("Expected EN→ES Apertium candidate to be reported as source_partial.");
}
if (
  !gold.source_candidates.some(
    (candidate) =>
      candidate.adapter === "kaikki" &&
      candidate.language_code === "FR" &&
      candidate.source_ids.includes("kaikki-french") &&
      candidate.source_ids.includes("dbnary-fr-20251001") &&
      candidate.confidence === "source_partial"
  )
) {
  fail("Expected Kaikki/DBnary-supported lexical candidate for a non-ES language.");
}
if (
  !gold.translation_candidates.some(
    (candidate) =>
      candidate.adapter === "dbnary" &&
      candidate.language_code === "FR" &&
      candidate.confidence === "source_partial"
  )
) {
  fail("Expected parsed DBnary translation candidate to appear in translation_candidates as source_partial.");
}
if (
  !gold.translation_candidates.some(
    (candidate) =>
      candidate.adapter === "freedict" &&
      candidate.language_code === "FR" &&
      candidate.confidence === "source_partial"
  )
) {
  fail("Expected FreeDict candidate to appear in translation_candidates as source_partial.");
}
if (gold.example_scene_candidates.length !== goldRows.length) {
  fail("Expected one example_scene_candidates row per draft row.");
}
if (!gold.external_mt_sanity.some((row) => row.provider === "fixture-mt" && row.agreement === "agreement")) {
  fail("Expected external_mt_sanity report row for fixture MT input.");
}

const weakLanguageGoldRows = [
  {
    set_id: "fixture_language_batch_preflight",
    meaning_id: "fixture_door_ko_01",
    canonical_english: "door",
    part_of_speech: "noun",
    language_code: "KO",
    native_word: "문",
    word_with_article_or_marker: "문",
    transcription: "mun",
    fixture_official_dictionary_match: true,
    fixture_official_dictionary_candidate: "문",
    fixture_official_dictionary_source_id: "official-nikl-korean-basic-dictionary",
    fixture_official_dictionary_adapter: "nikl",
    external_mt_suggestion: "문",
    external_mt_provider: "fixture-mt",
    example_text: "문은 열려 있습니다.",
  },
];
const weakLanguageGold = await buildLanguageBatchSourcePreflight(weakLanguageGoldRows, {
  manifestSourceIds,
  meaningMetaByMeaningId,
  fixtureToolSources: true,
});
if (weakLanguageGold.blocker_count !== 0) {
  fail(`Expected weak-language gold preflight to have 0 blockers, got ${weakLanguageGold.blocker_count}.`);
}
if (!weakLanguageGold.risk_profile.requires_single_language_batch || weakLanguageGold.risk_profile.weak_language_count !== 1) {
  fail("Expected weak-language rows to require one language per batch.");
}
if (
  !weakLanguageGold.strong_dictionary_candidates.some(
    (candidate) => candidate.adapter === "nikl" && candidate.language_code === "KO"
  )
) {
  fail("Expected NIKL official dictionary candidate to appear as a strong dictionary candidate for KO.");
}
if (!weakLanguageGold.official_dictionary_candidates.some((candidate) => candidate.language_code === "KO")) {
  fail("Expected official_dictionary_candidates to include the KO row.");
}
if (!weakLanguageGold.low_resource_language_risk.some((risk) => risk.language_code === "KO")) {
  fail("Expected low_resource_language_risk to include KO.");
}

const officialDictionaryLeakRows = [
  {
    set_id: "fixture_language_batch_preflight",
    meaning_id: "fixture_cook_km_01",
    canonical_english: "cook",
    part_of_speech: "verb",
    language_code: "KM",
    native_word: "ចម្អិន",
    word_with_article_or_marker: "ចម្អិន",
    transcription: "cham'en",
    romanization_system: "LunaCards practical Khmer",
    example_text: "ចម្អិនម្ហូប។",
  },
  {
    set_id: "fixture_language_batch_preflight",
    meaning_id: "fixture_cook_lo_01",
    canonical_english: "cook",
    part_of_speech: "verb",
    language_code: "LO",
    native_word: "ແຕ່ງ",
    word_with_article_or_marker: "ແຕ່ງ",
    transcription: "tǣng",
    romanization_system: "LunaCards Lao learner romanization",
    example_text: "ແຕ່ງອາຫານ.",
  },
  {
    set_id: "fixture_language_batch_preflight",
    meaning_id: "fixture_cook_my_01",
    canonical_english: "cook",
    part_of_speech: "verb",
    language_code: "MY",
    native_word: "ချက်",
    word_with_article_or_marker: "ချက်",
    transcription: "chet",
    romanization_system: "LunaCards practical Burmese",
    example_text: "ဟင်းချက်ပါ။",
  },
];
const officialDictionaryLeak = await buildLanguageBatchSourcePreflight(officialDictionaryLeakRows, {
  manifestSourceIds,
  meaningMetaByMeaningId,
});
const leakedSinhalaCandidate = officialDictionaryLeak.source_candidates.find(
  (candidate) =>
    ["KM", "LO", "MY"].includes(candidate.language_code) &&
    candidate.adapter === "sealang" &&
    String(candidate.note ?? "").includes("sinhala-para-dict")
);
if (leakedSinhalaCandidate) {
  fail("Sinhala weak dictionary rows must not leak into KM/LO/MY SEAlang/official-dictionary candidates.");
}

const romanizationGoldRows = [
  {
    set_id: "fixture_language_batch_preflight",
    meaning_id: "fixture_book_bn_01",
    canonical_english: "book",
    part_of_speech: "noun",
    language_code: "BN",
    native_word: "বই",
    word_with_article_or_marker: "বই",
    transcription: "bai",
    fixture_dakshina_candidate: "boi",
    example_text: "বইটি টেবিলে আছে।",
  },
];
const romanizationGold = await buildLanguageBatchSourcePreflight(romanizationGoldRows, {
  manifestSourceIds,
  meaningMetaByMeaningId,
  fixtureToolSources: true,
});
if (
  !romanizationGold.source_candidates.some(
    (candidate) => candidate.adapter === "dakshina" && candidate.source_ids.includes("dakshina-transliteration-dataset")
  )
) {
  fail("Expected Dakshina romanization sanity candidate for South Asian script rows.");
}

const weakLanguageNegativeRows = [
  {
    set_id: "fixture_language_batch_preflight",
    meaning_id: "fixture_door_ko_bad_01",
    canonical_english: "door",
    part_of_speech: "noun",
    language_code: "KO",
    native_word: "창문",
    word_with_article_or_marker: "창문",
    transcription: "changmun",
    external_mt_suggestion: "문",
    external_mt_provider: "fixture-mt",
    example_text: "문은 열려 있습니다.",
  },
];
const weakLanguageNegative = await buildLanguageBatchSourcePreflight(weakLanguageNegativeRows, {
  manifestSourceIds,
  meaningMetaByMeaningId,
  fixtureToolSources: true,
});
if (
  !weakLanguageNegative.warnings.some((warning) => warning.code === "low_resource_mt_dictionary_disagreement") ||
  !weakLanguageNegative.decision_required.some((warning) => warning.code === "low_resource_mt_dictionary_disagreement")
) {
  fail("Expected weak-language MT disagreement without strong dictionary support to require a warning decision.");
}

const negativeRows = [
  {
    set_id: "fixture_language_batch_preflight",
    meaning_id: "fixture_sink_01",
    canonical_english: "sink",
    part_of_speech: "noun",
    language_code: "FR",
    native_word: "lavabo",
    word_with_article_or_marker: "lavabo",
    transcription: "/lavabo/",
    example_text: "Le lavabo est propre.",
  },
  {
    set_id: "fixture_language_batch_preflight",
    meaning_id: "fixture_cups_01",
    canonical_english: "cups",
    part_of_speech: "noun",
    language_code: "HR",
    native_word: "šalica",
    word_with_article_or_marker: "šalica",
    transcription: "šalica",
    grammatical_number: "singular",
    expected_grammatical_number: "plural",
    example_text: "Dvije šalice su na stolu.",
  },
  {
    set_id: "fixture_language_batch_preflight",
    meaning_id: "fixture_apertium_01",
    canonical_english: "mug",
    part_of_speech: "noun",
    language_code: "TL",
    native_word: "saro",
    word_with_article_or_marker: "saro",
    transcription: "saro",
    fixture_apertium_match: true,
    fixture_apertium_candidate: "saro",
    example_text: "Ang saro ay nasa mesa.",
  },
  {
    set_id: "core_numbers_counting_a1",
    meaning_id: "number_zero_01",
    canonical_english: "zero",
    part_of_speech: "number",
    canonical_example_en: "Zero apples are in the basket.",
    language_code: "ES",
    native_word: "cero",
    word_with_article_or_marker: "cero",
    transcription: "cero",
    example_text: "Número: cero.",
  },
  {
    set_id: "fixture_language_batch_preflight",
    meaning_id: "fixture_apple_01",
    canonical_english: "apple",
    part_of_speech: "noun",
    canonical_example_en: "The apple is in the bowl.",
    semantic_scene: { target_object: "apple", subject_number: "singular", state_or_location: "in the bowl" },
    language_code: "ES",
    native_word: "manzana",
    word_with_article_or_marker: "manzana",
    transcription: "manzana",
    example_text: "Palabra: manzana.",
  },
  {
    set_id: "fixture_language_batch_preflight",
    meaning_id: "fixture_cjk_ja_01",
    canonical_english: "prepare",
    part_of_speech: "verb",
    canonical_example_en: "Prepare the vegetables.",
    language_code: "JA",
    native_word: "準備する",
    word_with_article_or_marker: "準備する",
    transcription: "junbi suru",
    example_text: "野菜を 準備する。",
  },
  {
    set_id: "fixture_language_batch_preflight",
    meaning_id: "fixture_thai_spacing_01",
    canonical_english: "prepare",
    part_of_speech: "verb",
    canonical_example_en: "Prepare the vegetables.",
    language_code: "TH",
    native_word: "เตรียม",
    word_with_article_or_marker: "เตรียม",
    transcription: "triam",
    example_text: "เตรียม ผัก.",
  },
  {
    set_id: "fixture_language_batch_preflight",
    meaning_id: "fixture_lo_spacing_01",
    canonical_english: "prepare",
    part_of_speech: "verb",
    canonical_example_en: "Prepare the vegetables.",
    language_code: "LO",
    native_word: "ກຽມ",
    word_with_article_or_marker: "ກຽມ",
    transcription: "kīam",
    example_text: "ກຽມ ຜັກ.",
  },
  {
    set_id: "fixture_language_batch_preflight",
    meaning_id: "fixture_km_spacing_01",
    canonical_english: "prepare",
    part_of_speech: "verb",
    canonical_example_en: "Prepare the vegetables.",
    language_code: "KM",
    native_word: "រៀបចំ",
    word_with_article_or_marker: "រៀបចំ",
    transcription: "rieb cham",
    example_text: "រៀបចំ បន្លែ។",
  },
  {
    set_id: "fixture_language_batch_preflight",
    meaning_id: "fixture_my_action_surface_01",
    canonical_english: "prepare",
    part_of_speech: "verb",
    canonical_example_en: "Prepare the vegetables.",
    language_code: "MY",
    native_word: "ပြင်ဆင်ရန်",
    word_with_article_or_marker: "ပြင်ဆင်ရန်",
    transcription: "pyin hsin yan",
    example_text: "ပြင်ဆင်ရန် ဟင်းသီးဟင်းရွက်။",
  },
];

const negative = await buildLanguageBatchSourcePreflight(negativeRows, {
  manifestSourceIds,
  meaningMetaByMeaningId,
  fixtureToolSources: true,
});
if (!negative.blockers.some((blocker) => blocker.code === "ipa_orthographic_slash")) {
  fail("Expected slash-wrapped orthographic IPA to be a hard blocker.");
}
if (!negative.blockers.some((blocker) => blocker.code === "morphology_number_mismatch")) {
  fail("Expected UniMorph-style number mismatch to be a hard blocker.");
}
if (!negative.source_candidates.some((candidate) => candidate.source_ids.includes("tool-apertium-dictionaries"))) {
  fail("Expected Apertium fixture candidate to be reported.");
}
if (!negative.blockers.some((blocker) => blocker.code === "draft_example_scene_alignment")) {
  fail("Expected number meta-template example to be a hard draft scene blocker.");
}
if (
  !negative.blockers.some(
    (blocker) =>
      blocker.code === "draft_example_scene_alignment" &&
      blocker.meaning_id === "fixture_apple_01" &&
      blocker.detail.includes("generic word/meaning meta-template")
  )
) {
  fail("Expected generic word/meaning meta-template example to be a hard draft scene blocker.");
}
if (!negative.blockers.some((blocker) => blocker.code === "cjk_example_spacing")) {
  fail("Expected ZH/JA artificial internal spacing to be a hard draft blocker.");
}
if (!negative.blockers.some((blocker) => blocker.code === "thai_example_spacing")) {
  fail("Expected TH artificial internal spacing to be a hard draft blocker.");
}
if (!negative.blockers.some((blocker) => blocker.code === "southeast_asian_example_spacing")) {
  fail("Expected KM/LO artificial action spacing to be a hard draft blocker.");
}
if (!negative.blockers.some((blocker) => blocker.code === "action_example_surface")) {
  fail("Expected MY infinitive-template action example to be a hard draft blocker.");
}
if (!negative.blockers.some((blocker) => blocker.code === "high_risk_batch_language_count")) {
  fail("Expected multi-language high-risk batch to be a hard blocker.");
}
if (
  negative.source_candidates.some(
    (candidate) => candidate.source_ids.includes("tool-apertium-dictionaries") && candidate.confidence !== "source_partial"
  )
) {
  fail("Apertium candidate must remain source_partial, not source_exact.");
}
if (!negative.source_conflicts.some((finding) => finding.code === "entry_source_fallback" || finding.code.includes("source"))) {
  fail("Expected source_conflicts section to expose fallback/source issues.");
}
if (!Array.isArray(negative.decision_required)) {
  fail("Expected decision_required section to be present.");
}

const profileNegativeRows = [
  {
    set_id: "fixture_profile_compound",
    deck_profile: "object_noun",
    risk_flags: "compound_whole_meaning",
    meaning_id: "fixture_boarding_pass_01",
    canonical_english: "boarding pass",
    part_of_speech: "noun phrase",
    language_code: "ES",
    native_word: "pase abordar",
    word_with_article_or_marker: "pase abordar",
    transcription: "pase abordar",
    compound_multiword_risk: "whole_meaning",
    example_text: "El pase está en la bolsa.",
  },
  {
    set_id: "fixture_profile_action",
    deck_profile: "action_verb",
    meaning_id: "fixture_stir_01",
    canonical_english: "to stir",
    part_of_speech: "verb",
    language_code: "ES",
    native_word: "remover",
    word_with_article_or_marker: "remover",
    transcription: "remover",
    example_text: "Remueve la sopa.",
  },
  {
    set_id: "fixture_profile_food",
    deck_profile: "food_countability",
    meaning_id: "fixture_coffee_01",
    canonical_english: "coffee",
    part_of_speech: "noun",
    language_code: "ES",
    native_word: "café",
    word_with_article_or_marker: "café",
    transcription: "café",
    example_text: "El café está en la taza.",
  },
  {
    set_id: "fixture_profile_document",
    deck_profile: "document_admin",
    meaning_id: "fixture_form_01",
    canonical_english: "form",
    part_of_speech: "noun",
    language_code: "ES",
    native_word: "formulario",
    word_with_article_or_marker: "formulario",
    transcription: "formulario",
    example_text: "El formulario está en la mesa.",
  },
  {
    set_id: "fixture_profile_health",
    deck_profile: "health_safety",
    meaning_id: "fixture_bandage_01",
    canonical_english: "bandage",
    part_of_speech: "noun",
    language_code: "ES",
    native_word: "venda",
    word_with_article_or_marker: "venda",
    transcription: "venda",
    example_text: "La venda está en la bolsa.",
  },
];

const profileNegative = await buildLanguageBatchSourcePreflight(profileNegativeRows, {
  manifestSourceIds,
  meaningMetaByMeaningId,
  fixtureToolSources: true,
});
for (const code of [
  "compound_whole_meaning",
  "action_verb_grammar",
  "food_countability_container",
  "document_admin_register",
  "health_safety_specificity",
]) {
  if (!profileNegative.blockers.some((blocker) => blocker.code === code)) {
    fail(`Expected profile preflight blocker ${code}.`);
  }
}

console.log(
  `Language batch source preflight fixtures OK: gold_blockers=${gold.blocker_count}, weak_gold_blockers=${weakLanguageGold.blocker_count}, romanization_candidates=${romanizationGold.source_candidate_count}, weak_negative_warnings=${weakLanguageNegative.warning_count}, negative_blockers=${negative.blocker_count}, profile_blockers=${profileNegative.blocker_count}.`
);
