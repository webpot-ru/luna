#!/usr/bin/env node
import { validateIpaTranscriptionSanity } from "./lib/ipa-transcription-sanity.mjs";
import {
  buildIntraLanguageTranscriptionCollapseFindings,
  validateTranscriptionShape,
} from "./lib/transcription-shape.mjs";
import { buildTranscriptionSourceBackingFindings } from "./lib/source-backed-transcriptions.mjs";
import { loadReferenceSourcesManifest } from "./lib/transcription-source-policy.mjs";

function baseRow(overrides) {
  return {
    set_id: "fixture_transcription_source_policy",
    meaning_id: overrides.meaning_id ?? "fixture_meaning",
    canonical_english: overrides.canonical_english ?? "kitchen scale",
    part_of_speech: "noun",
    language_code: overrides.language_code,
    native_word: overrides.native_word,
    word_with_article_or_marker: overrides.word_with_article_or_marker ?? overrides.native_word,
    display_word: overrides.word_with_article_or_marker ?? overrides.native_word,
    transcription: overrides.transcription,
    romanization_system: overrides.romanization_system ?? "",
  };
}

const negativeRows = [
  baseRow({
    language_code: "TH",
    native_word: "ตาชั่งครัว",
    transcription: "khrua-kitcen-scale-ǎa",
    romanization_system: "Paiboon-style tone-aware learner romanization",
  }),
  baseRow({
    language_code: "BG",
    native_word: "кухненска везна",
    transcription: "kuhnenski-kitcen-scale",
    romanization_system: "official Bulgarian streamlined transliteration",
  }),
  baseRow({
    language_code: "FR",
    native_word: "la balance",
    word_with_article_or_marker: "la balance",
    transcription: "/la balance/",
  }),
  baseRow({
    language_code: "EN-GB",
    native_word: "cup",
    word_with_article_or_marker: "a cup",
    canonical_english: "cup",
    transcription: "/kʌp/",
  }),
  baseRow({
    language_code: "FR",
    native_word: "assiette",
    word_with_article_or_marker: "l'assiette",
    canonical_english: "plate",
    transcription: "/a.sjɛt/",
  }),
  baseRow({
    language_code: "DE",
    native_word: "Teller",
    word_with_article_or_marker: "der Teller",
    canonical_english: "plate",
    transcription: "/ˈtɛlɐ/",
  }),
  baseRow({
    language_code: "ZH",
    native_word: "厨房秤",
    transcription: "chu2 fang2 cheng4",
    romanization_system: "Hanyu Pinyin with tone marks",
  }),
  baseRow({
    language_code: "VI",
    native_word: "cốc",
    canonical_english: "cup",
    transcription: "coc",
  }),
  baseRow({
    language_code: "HI",
    native_word: "रसोई का तराजू",
    transcription: "रसोई का तराजू",
    romanization_system: "ISO 15919",
  }),
  baseRow({
    language_code: "KA",
    native_word: "სამზარეულოს სასწორი",
    transcription: "kitchen scale",
    romanization_system: "Georgian national romanization",
  }),
  baseRow({
    language_code: "LO",
    native_word: "ລາວ",
    canonical_english: "Lao",
    transcription: "lao",
    romanization_system: "ALA-LC romanization",
  }),
  baseRow({
    language_code: "LO",
    native_word: "ສະບາຍດີ",
    canonical_english: "hello",
    transcription: "sabaidi",
    romanization_system: "BGN/PCGN 1966",
  }),
  baseRow({
    language_code: "TH",
    native_word: "สวัสดี",
    canonical_english: "hello",
    transcription: "sawatdi",
    romanization_system: "RTGS",
  }),
  baseRow({
    language_code: "MY",
    native_word: "မြန်မာ",
    canonical_english: "Myanmar",
    transcription: "mranma",
    romanization_system: "MLCTS",
  }),
  baseRow({
    language_code: "KM",
    native_word: "កម្ពុជា",
    canonical_english: "Cambodia",
    transcription: "Cambodia",
    romanization_system: "Geographic Department / UNGEGN-based practical romanization",
  }),
  baseRow({
    language_code: "HY",
    native_word: "Հայաստան",
    canonical_english: "Armenia",
    transcription: "Armenia",
    romanization_system: "practical BGN/PCGN-style romanization",
  }),
];

const collapseRows = [
  "Кухонные весы",
  "Кухонный таймер",
  "Кухонный термометр",
  "Воронка",
  "Пресс для чеснока",
  "Нож для пиццы",
  "Кухонные ножницы",
].map((nativeWord, index) =>
  baseRow({
    meaning_id: `fixture_ru_collapse_${index + 1}`,
    canonical_english: `fixture item ${index + 1}`,
    language_code: "RU",
    native_word: nativeWord,
    transcription: "kuhonnye",
    romanization_system: "BGN/PCGN-style practical Latin transliteration",
  })
);

const goldRows = [
  baseRow({
    language_code: "ES",
    native_word: "la bascula de cocina",
    word_with_article_or_marker: "la bascula de cocina",
    transcription: "la bascula de cocina",
  }),
  baseRow({
    language_code: "EN-GB",
    native_word: "cup",
    word_with_article_or_marker: "a cup",
    canonical_english: "cup",
    transcription: "/ə kʌp/",
  }),
  baseRow({
    language_code: "FR",
    native_word: "assiette",
    word_with_article_or_marker: "l'assiette",
    canonical_english: "plate",
    transcription: "/la.sjɛt/",
  }),
  baseRow({
    language_code: "DE",
    native_word: "Teller",
    word_with_article_or_marker: "der Teller",
    canonical_english: "plate",
    transcription: "/deːɐ̯ ˈtɛlɐ/",
  }),
  baseRow({
    language_code: "ZH",
    native_word: "厨房秤",
    transcription: "chúfáng chèng",
    romanization_system: "Hanyu Pinyin with tone marks",
  }),
  baseRow({
    language_code: "RU",
    native_word: "Кухонные весы",
    transcription: "kuhonnye vesy",
    romanization_system: "BGN/PCGN-style practical Latin transliteration",
  }),
  baseRow({
    language_code: "TH",
    native_word: "ไทย",
    canonical_english: "Thai",
    transcription: "tai",
    romanization_system: "Paiboon-style tone-aware learner romanization",
  }),
  baseRow({
    meaning_id: "fixture_th_delimiter_normalized",
    language_code: "TH",
    native_word: "ห้องน้ำ",
    canonical_english: "bathroom",
    transcription: "hɔ̂ng náam",
    romanization_system: "Paiboon-style tone-aware learner romanization",
  }),
  baseRow({
    language_code: "LO",
    native_word: "ລາວ",
    canonical_english: "Lao",
    transcription: "lāo",
    romanization_system: "Vientiane tone-aware learner romanization",
  }),
  baseRow({
    language_code: "MY",
    native_word: "ဝီကီပိဒိယ",
    canonical_english: "Wikipedia",
    transcription: "wikipi.di.ya.",
    romanization_system: "practical Burmese romanization with tone/register notation",
  }),
  baseRow({
    language_code: "KM",
    native_word: "កម្ពុជា",
    canonical_english: "Cambodia",
    transcription: "kampuciə",
    romanization_system: "Geographic Department / UNGEGN-based practical romanization",
  }),
  baseRow({
    language_code: "HY",
    native_word: "Հայաստան",
    canonical_english: "Armenia",
    transcription: "Hayastan",
    romanization_system: "practical BGN/PCGN-style romanization",
  }),
  baseRow({
    meaning_id: "fixture_hy_bgn_funnel",
    language_code: "HY",
    native_word: "ձագար",
    canonical_english: "funnel",
    transcription: "dzagar",
    romanization_system: "practical BGN/PCGN-style romanization",
  }),
];

const shapeOnlyGoldRows = [
  baseRow({
    meaning_id: "fixture_en_gb_pair_of_tongs",
    language_code: "EN-GB",
    native_word: "tongs",
    word_with_article_or_marker: "a pair of tongs",
    canonical_english: "tongs",
    transcription: "/ə ˌpeər əv tɒŋz/",
  }),
  baseRow({
    meaning_id: "fixture_pt_br_os_hashis",
    language_code: "PT-BR",
    native_word: "hashis",
    word_with_article_or_marker: "os hashis",
    canonical_english: "chopsticks",
    transcription: "/uz aˈʃis/",
  }),
];

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function rowIssueSummary(row) {
  const shapeIssues = validateTranscriptionShape(row);
  const ipaIssues = validateIpaTranscriptionSanity(row).filter((issue) => issue.severity === "fail");
  return [...shapeIssues, ...ipaIssues.map((issue) => issue.issue)];
}

for (const row of negativeRows) {
  const issues = rowIssueSummary(row);
  if (issues.length === 0) {
    fail(`${row.language_code}/${row.meaning_id} negative fixture did not produce a shape/sanity issue.`);
  }
}

const collapseFindings = buildIntraLanguageTranscriptionCollapseFindings(collapseRows);
if (collapseFindings.length === 0) {
  fail("RU kuhonnye collapse fixture did not produce an intra-language collapse finding.");
}

for (const row of goldRows) {
  const issues = rowIssueSummary(row);
  if (issues.length > 0) {
    fail(`${row.language_code}/${row.meaning_id} gold fixture produced issue(s): ${issues.join("; ")}`);
  }
}

for (const row of shapeOnlyGoldRows) {
  const issues = rowIssueSummary(row);
  if (issues.length > 0) {
    fail(`${row.language_code}/${row.meaning_id} shape-only gold fixture produced issue(s): ${issues.join("; ")}`);
  }
}

const manifest = await loadReferenceSourcesManifest();
const manifestSourceIds = new Set((manifest.sources ?? []).map((source) => source.id));
const sourceBackedGold = await buildTranscriptionSourceBackingFindings(goldRows, { manifestSourceIds });
if (sourceBackedGold.blockers.length > 0) {
  fail(
    `Gold source-backed fixtures produced blocker(s): ${sourceBackedGold.blockers
      .map((blocker) => `${blocker.language_code}/${blocker.meaning_id}:${blocker.confidence}`)
      .join(", ")}`
  );
}

const sourceBackedNegative = await buildTranscriptionSourceBackingFindings(negativeRows, { manifestSourceIds });
if (sourceBackedNegative.blockers.length !== negativeRows.length) {
  fail(
    `Expected ${negativeRows.length} source-backed negative blockers, got ${sourceBackedNegative.blockers.length}.`
  );
}

const staleManualDecisionRow = baseRow({
  meaning_id: "fixture_stale_manual_decision",
  language_code: "TH",
  native_word: "ห้องน้ำ",
  canonical_english: "bathroom",
  transcription: "hɔ̂ng náam",
  romanization_system: "Paiboon-style tone-aware learner romanization",
});
const staleManualDecision = new Map([
  [
    "fixture_transcription_source_policy::fixture_stale_manual_decision::TH",
    {
      set_id: "fixture_transcription_source_policy",
      meaning_id: "fixture_stale_manual_decision",
      language_code: "TH",
      current_native_word: "ห้องน้ำ",
      current_display_word: "ห้องน้ำ",
      current_transcription: "hɔ̂ng-náam",
      decision_method: "component_source_exact",
      source_confidence: "source_exact",
      source_ids: ["kaikki-thai"],
      source_note: "stale fixture decision should not be accepted",
    },
  ],
]);
const staleDecisionResult = await buildTranscriptionSourceBackingFindings([staleManualDecisionRow], {
  manifestSourceIds,
  manualDecisions: staleManualDecision,
});
if (
  staleDecisionResult.blockers.length !== 1 ||
  !staleDecisionResult.blockers[0].issues.some((issue) => issue.code === "high_risk_manual_decision_stale")
) {
  fail("Stale high-risk manual source decision fixture did not fail closed.");
}

const hyKaikkiConventionRow = baseRow({
  meaning_id: "fixture_hy_kaikki_not_bgn",
  language_code: "HY",
  native_word: "ձագար",
  canonical_english: "funnel",
  transcription: "jagar",
  romanization_system: "practical BGN/PCGN-style romanization",
});
const hyKaikkiConventionResult = await buildTranscriptionSourceBackingFindings([hyKaikkiConventionRow], {
  manifestSourceIds,
});
if (
  hyKaikkiConventionResult.blockers.length !== 1 ||
  !hyKaikkiConventionResult.blockers[0].issues.some((issue) => issue.code === "high_risk_hy_bgn_mismatch")
) {
  fail("HY Kaikki-style Armenian romanization fixture did not fail against the CLDR BGN-style compiler.");
}

console.log(
  `Transcription source policy fixtures OK: negative=${negativeRows.length}, collapse=${collapseRows.length}, gold=${goldRows.length}, shape_only_gold=${shapeOnlyGoldRows.length}.`
);
