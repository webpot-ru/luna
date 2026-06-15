#!/usr/bin/env node
import { buildIpaSourceLookupFindings } from "./lib/ipa-source-lookup.mjs";

function row(overrides) {
  return {
    set_id: "fixture_ipa_source_lookup",
    meaning_id: overrides.meaning_id,
    canonical_english: overrides.canonical_english ?? overrides.meaning_id,
    part_of_speech: "noun",
    language_code: overrides.language_code,
    native_word: overrides.native_word,
    word_with_article_or_marker: overrides.word_with_article_or_marker ?? overrides.native_word,
    display_word: overrides.word_with_article_or_marker ?? overrides.native_word,
    transcription: overrides.transcription,
    romanization_system: "",
  };
}

const rows = [
  row({
    meaning_id: "negative_en_gb_cling_film",
    language_code: "EN-GB",
    native_word: "cling film",
    transcription: "/cling film/",
  }),
  row({
    meaning_id: "negative_fr_la_douche",
    language_code: "FR",
    native_word: "douche",
    word_with_article_or_marker: "la douche",
    transcription: "/la douche/",
  }),
  row({
    meaning_id: "negative_da_toilettet",
    language_code: "DA",
    native_word: "toilettet",
    transcription: "/toilettet/",
  }),
  row({
    meaning_id: "gold_en_gb_film",
    language_code: "EN-GB",
    native_word: "film",
    transcription: "/fɪlm/",
  }),
  row({
    meaning_id: "gold_fr_douche",
    language_code: "FR",
    native_word: "douche",
    transcription: "/duʃ/",
  }),
  row({
    meaning_id: "gold_da_toilettet",
    language_code: "DA",
    native_word: "toilettet",
    transcription: "/tsɒɪˈlɛtɤ/",
  }),
];

const findings = await buildIpaSourceLookupFindings(rows);
const blockerKeys = new Set(findings.blockers.map((blocker) => blocker.meaning_id));

for (const key of ["negative_en_gb_cling_film", "negative_fr_la_douche", "negative_da_toilettet"]) {
  if (!blockerKeys.has(key)) {
    console.error(`ERROR: expected ${key} to fail IPA source lookup.`);
    process.exit(1);
  }
}

for (const key of ["gold_en_gb_film", "gold_fr_douche", "gold_da_toilettet"]) {
  if (blockerKeys.has(key)) {
    console.error(`ERROR: expected ${key} to pass IPA source lookup.`);
    process.exit(1);
  }
}

console.log(
  `IPA source lookup fixtures OK: rows=${rows.length}, blockers=${findings.blockers.length}, warnings=${findings.warnings.length}.`
);
