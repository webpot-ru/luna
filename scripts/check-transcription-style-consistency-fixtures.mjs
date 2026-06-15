#!/usr/bin/env node
import {
  buildTranscriptionStyleConsistencyFindings,
  formatTranscriptionStyleConsistencyBlocker,
} from "./lib/transcription-style-consistency.mjs";

function row(overrides) {
  return {
    set_id: "fixture_transcription_style",
    display_order: overrides.display_order ?? 1,
    meaning_id: overrides.meaning_id,
    canonical_english: overrides.canonical_english ?? overrides.meaning_id,
    language_code: overrides.language_code,
    native_word: overrides.native_word,
    word_with_article_or_marker: overrides.word_with_article_or_marker ?? overrides.native_word,
    display_word: overrides.word_with_article_or_marker ?? overrides.native_word,
    transcription: overrides.transcription,
    romanization_system: overrides.romanization_system ?? "",
  };
}

function fail(message, findings) {
  console.error(`ERROR: ${message}`);
  if (findings) {
    for (const blocker of findings.blockers ?? []) {
      console.error(formatTranscriptionStyleConsistencyBlocker(blocker));
    }
  }
  process.exit(1);
}

const mixedBurmese = [
  row({
    meaning_id: "my_spoon",
    canonical_english: "spoon",
    language_code: "MY",
    native_word: "ဇွန်း",
    transcription: "jwan:",
    romanization_system: "practical Burmese romanization with tone/register notation",
  }),
  row({
    meaning_id: "my_teaspoon",
    canonical_english: "teaspoon",
    language_code: "MY",
    native_word: "လက်ဖက်ရည်ဇွန်း",
    transcription: "le' hpe' ji zun:",
    romanization_system: "practical Burmese romanization with tone/register notation",
  }),
  row({
    meaning_id: "my_cup",
    canonical_english: "cup",
    language_code: "MY",
    native_word: "ခွက်",
    transcription: "khwet’",
    romanization_system: "practical Burmese romanization with tone/register notation",
  }),
  row({
    meaning_id: "my_glass",
    canonical_english: "glass",
    language_code: "MY",
    native_word: "ဖန်ခွက်",
    transcription: "hpan khwe'",
    romanization_system: "practical Burmese romanization with tone/register notation",
  }),
];

const mixedFindings = buildTranscriptionStyleConsistencyFindings(mixedBurmese);
if (
  !mixedFindings.blockers.some((blocker) => blocker.issue_code === "component_transcription_style_mismatch") ||
  !mixedFindings.blockers.some((blocker) => blocker.issue_code === "mixed_apostrophe_style")
) {
  fail("Expected Burmese mixed-style fixtures to produce component and apostrophe blockers.", mixedFindings);
}

const kmMixed = [
  row({
    meaning_id: "km_cup",
    canonical_english: "cup",
    language_code: "KM",
    native_word: "ពែង",
    transcription: "pɛɛng",
    romanization_system: "Geographic Department / UNGEGN-based practical romanization",
  }),
  row({
    meaning_id: "km_chopsticks",
    canonical_english: "chopsticks",
    language_code: "KM",
    native_word: "ចង្កឹះ",
    transcription: "cɑɑcɑngkəh",
    romanization_system: "Geographic Department / UNGEGN-based practical romanization",
  }),
];
const kmFindings = buildTranscriptionStyleConsistencyFindings(kmMixed);
if (!kmFindings.blockers.some((blocker) => blocker.issue_code === "km_practical_style_contains_ipa_like_symbols")) {
  fail("Expected Khmer IPA-like practical-style fixture to produce a blocker.", kmFindings);
}

const myProfileMixed = [
  row({
    meaning_id: "my_plate_compact_colon",
    canonical_english: "plate",
    language_code: "MY",
    native_word: "ပန်းကန်",
    transcription: "pan:kan",
    romanization_system: "practical Burmese romanization with tone/register notation",
  }),
  row({
    meaning_id: "my_lid_compact_dot",
    canonical_english: "lid",
    language_code: "MY",
    native_word: "အဖုံး",
    transcription: "a.hpum:",
    romanization_system: "practical Burmese romanization with tone/register notation",
  }),
  row({
    meaning_id: "my_chopsticks_accented",
    canonical_english: "chopsticks",
    language_code: "MY",
    native_word: "တူ",
    transcription: "tú",
    romanization_system: "practical Burmese romanization with tone/register notation",
  }),
];
const myProfileFindings = buildTranscriptionStyleConsistencyFindings(myProfileMixed);
if (
  !myProfileFindings.blockers.some((blocker) => blocker.issue_code === "my_colon_without_separator") ||
  !myProfileFindings.blockers.some((blocker) => blocker.issue_code === "my_dot_without_separator") ||
  !myProfileFindings.blockers.some((blocker) => blocker.issue_code === "profile_disallowed_character")
) {
  fail("Expected Burmese style profile fixtures to produce compact punctuation and disallowed-character blockers.", myProfileFindings);
}

const toneNumberMixed = [
  row({
    meaning_id: "zh_tone_number",
    canonical_english: "cup",
    language_code: "ZH",
    native_word: "杯子",
    transcription: "bei1 zi5",
    romanization_system: "Hanyu Pinyin with tone marks",
  }),
  row({
    meaning_id: "th_tone_number",
    canonical_english: "cup",
    language_code: "TH",
    native_word: "ถ้วย",
    transcription: "tûai3",
    romanization_system: "Thai learner romanization with tone diacritics",
  }),
];
const toneNumberFindings = buildTranscriptionStyleConsistencyFindings(toneNumberMixed);
if (
  !toneNumberFindings.blockers.some((blocker) => blocker.issue_code === "zh_tone_number") ||
  !toneNumberFindings.blockers.some((blocker) => blocker.issue_code === "thai_tone_number")
) {
  fail("Expected tone-number fixtures to produce blockers.", toneNumberFindings);
}

const goldRows = [
  row({
    meaning_id: "my_spoon_gold",
    canonical_english: "spoon",
    language_code: "MY",
    native_word: "ဇွန်း",
    transcription: "zun:",
    romanization_system: "practical Burmese romanization with tone/register notation",
  }),
  row({
    meaning_id: "my_teaspoon_gold",
    canonical_english: "teaspoon",
    language_code: "MY",
    native_word: "လက်ဖက်ရည်ဇွန်း",
    transcription: "le' hpe' ji zun:",
    romanization_system: "practical Burmese romanization with tone/register notation",
  }),
  row({
    meaning_id: "km_plate_gold",
    canonical_english: "plate",
    language_code: "KM",
    native_word: "ចាន",
    transcription: "chan",
    romanization_system: "Geographic Department / UNGEGN-based practical romanization",
  }),
  row({
    meaning_id: "my_plate_gold",
    canonical_english: "plate",
    language_code: "MY",
    native_word: "ပန်းကန်",
    transcription: "pan: kan",
    romanization_system: "practical Burmese romanization with tone/register notation",
  }),
  row({
    meaning_id: "zh_gold",
    canonical_english: "cup",
    language_code: "ZH",
    native_word: "杯子",
    transcription: "bēi zi",
    romanization_system: "Hanyu Pinyin with tone marks",
  }),
  row({
    meaning_id: "th_gold",
    canonical_english: "cup",
    language_code: "TH",
    native_word: "ถ้วย",
    transcription: "tûai",
    romanization_system: "Thai learner romanization with tone diacritics",
  }),
];
const goldFindings = buildTranscriptionStyleConsistencyFindings(goldRows);
if (goldFindings.blockers.length > 0) {
  fail("Gold style fixtures produced blockers.", goldFindings);
}

console.log(
  `Transcription style consistency fixtures OK: mixed=${mixedFindings.blockers.length}, km=${kmFindings.blockers.length}, my_profile=${myProfileFindings.blockers.length}, tone_numbers=${toneNumberFindings.blockers.length}, gold=${goldRows.length}.`
);
