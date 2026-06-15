export const weakTranslationLanguageCodes = new Set([
  "KO",
  "VI",
  "TH",
  "MS",
  "SK",
  "SL",
  "LV",
  "ET",
  "IS",
  "BN",
  "TL",
  "MY",
  "KM",
  "LO",
  "NE",
  "SI",
  "TA",
  "TE",
  "KN",
  "ML",
  "UZ",
  "KK",
  "AZ",
  "KA",
  "HY",
]);

export const highPriorityWeakLanguageCodes = new Set(["KO", "VI", "TH", "MY", "KM", "LO", "HY", "SI"]);

const weakLanguageUpliftEstimateByCode = new Map([
  ["KO", { current_translation: 76, target_translation_min: 86, target_translation_max: 88, main_lift: "NIKL learner dictionary + MT sanity" }],
  ["VI", { current_translation: 76, target_translation_min: 84, target_translation_max: 86, main_lift: "MT sanity + Vietnamese dictionary/corpus candidates" }],
  ["TH", { current_translation: 71, target_translation_min: 86, target_translation_max: 88, main_lift: "LEXiTRON + SEAlang + MT sanity" }],
  ["MS", { current_translation: 76, target_translation_min: 84, target_translation_max: 84, main_lift: "PanLex/OMW + MT sanity" }],
  ["SK", { current_translation: 76, target_translation_min: 84, target_translation_max: 86, main_lift: "Slovak WordNet + PanLex/OMW + MT sanity" }],
  ["SL", { current_translation: 76, target_translation_min: 84, target_translation_max: 86, main_lift: "Sloleks morphology/spelling + PanLex/OMW + FreeDict candidates" }],
  ["LV", { current_translation: 76, target_translation_min: 85, target_translation_max: 87, main_lift: "Tēzaurs.lv lemma/morphology source + PanLex/OMW + MT sanity" }],
  ["ET", { current_translation: 76, target_translation_min: 84, target_translation_max: 85, main_lift: "PanLex/OMW + MT sanity; Ekilex deferred until key/account" }],
  ["IS", { current_translation: 76, target_translation_min: 86, target_translation_max: 86, main_lift: "PanLex + stronger IPA/source sanity" }],
  ["BN", { current_translation: 76, target_translation_min: 87, target_translation_max: 88, main_lift: "IndicTrans2 + Dakshina + MT sanity" }],
  ["TL", { current_translation: 76, target_translation_min: 85, target_translation_max: 86, main_lift: "FreeDict/PanLex + MT sanity" }],
  ["MY", { current_translation: 71, target_translation_min: 85, target_translation_max: 87, main_lift: "MY dictionary parquet + PanLex + ALT + EN↔MY example corpora + MT sanity" }],
  ["KM", { current_translation: 71, target_translation_min: 83, target_translation_max: 85, main_lift: "ALT + SEAlang + MT sanity" }],
  ["LO", { current_translation: 71, target_translation_min: 83, target_translation_max: 85, main_lift: "ALT + SEAlang + MT sanity" }],
  ["NE", { current_translation: 76, target_translation_min: 86, target_translation_max: 87, main_lift: "IndicTrans2 + Dakshina + MT sanity" }],
  ["SI", { current_translation: 71, target_translation_min: 86, target_translation_max: 88, main_lift: "Sinhala EN→SI dictionary + Sinhala example/romanization corpus + MT sanity" }],
  ["TA", { current_translation: 76, target_translation_min: 87, target_translation_max: 88, main_lift: "IndicTrans2 + Dakshina" }],
  ["TE", { current_translation: 76, target_translation_min: 87, target_translation_max: 88, main_lift: "IndicTrans2 + Dakshina" }],
  ["KN", { current_translation: 76, target_translation_min: 87, target_translation_max: 89, main_lift: "Alar Kannada-English + IndicTrans2 + Dakshina" }],
  ["ML", { current_translation: 76, target_translation_min: 87, target_translation_max: 88, main_lift: "IndicTrans2 + Dakshina" }],
  ["UZ", { current_translation: 76, target_translation_min: 84, target_translation_max: 85, main_lift: "PanLex + UzWordnet display/concept sanity + MT sanity" }],
  ["KK", { current_translation: 76, target_translation_min: 84, target_translation_max: 86, main_lift: "PanLex + KazParC example/collocation sanity + MT sanity" }],
  ["AZ", { current_translation: 76, target_translation_min: 85, target_translation_max: 86, main_lift: "PanLex + MT sanity" }],
  ["KA", { current_translation: 76, target_translation_min: 85, target_translation_max: 87, main_lift: "Darsala EN-KA lexicon + PanLex + Wikidata/OMW + MT sanity" }],
  ["HY", { current_translation: 71, target_translation_min: 82, target_translation_max: 85, main_lift: "PanLex + MT sanity" }],
]);

export function isWeakTranslationLanguage(languageCode) {
  return weakTranslationLanguageCodes.has(languageCode);
}

export function isHighPriorityWeakLanguage(languageCode) {
  return highPriorityWeakLanguageCodes.has(languageCode);
}

export function weakLanguageRiskFor(languageCode) {
  if (!isWeakTranslationLanguage(languageCode)) return null;
  const estimate = weakLanguageUpliftEstimateByCode.get(languageCode) ?? {};
  return {
    language_code: languageCode,
    risk_type: "low_resource_translation_source",
    current_translation_estimate: estimate.current_translation ?? null,
    target_translation_estimate_min: estimate.target_translation_min ?? null,
    target_translation_estimate_max: estimate.target_translation_max ?? null,
    main_lift: estimate.main_lift ?? "Additional source/MT sanity",
    requires_single_language_batch: true,
    requires_actionable_warning_resolution: true,
  };
}

export function isStrongDictionaryAdapter(adapter) {
  return [
    "nikl",
    "lexitron",
    "sealang",
    "official_dictionary",
    "freedict",
    "dbnary",
    "apertium",
    "sinhala_para_dict",
    "alar_kn",
    "tezaurs_lv",
  ].includes(adapter);
}

export function isOfficialDictionaryAdapter(adapter) {
  return ["nikl", "lexitron", "sealang", "official_dictionary"].includes(adapter);
}
