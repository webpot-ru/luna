#!/usr/bin/env node
import assert from "node:assert/strict";
import { validateExampleNaturalness } from "./lib/example-naturalness.mjs";
import { validateIpaTranscriptionSanity } from "./lib/ipa-transcription-sanity.mjs";
import { validateTargetExamplePedagogicalQuality } from "./lib/target-example-pedagogical-quality.mjs";

function hasFail(issues) {
  return issues.some((issue) => issue.severity === "fail");
}

assert.equal(
  hasFail(
    validateIpaTranscriptionSanity({
      language_code: "FR",
      native_word: "le pommeau de douche",
      word_with_article_or_marker: "le pommeau de douche",
      transcription: "/pommeau douche/",
    })
  ),
  true,
  "FR slash-wrapped orthography should fail"
);

assert.equal(
  hasFail(
    validateIpaTranscriptionSanity({
      language_code: "FR",
      native_word: "le pommeau de douche",
      word_with_article_or_marker: "le pommeau de douche",
      transcription: "/lə pɔmo də duʃ/",
    })
  ),
  false,
  "FR corrected IPA should pass deterministic sanity"
);

assert.equal(
  hasFail(
    validateIpaTranscriptionSanity({
      language_code: "SV",
      native_word: "en gryta",
      word_with_article_or_marker: "en gryta",
      transcription: "/ɛn ˈɡryːta/",
    })
  ),
  false,
  "SV IPA with IPA symbols should pass"
);

assert.equal(
  hasFail(
    validateIpaTranscriptionSanity({
      language_code: "FR",
      native_word: "le recipient alimentaire",
      word_with_article_or_marker: "le recipient alimentaire",
      transcription: "/le recipient alimentaire/",
    })
  ),
  true,
  "FR orthographic article inside IPA should fail"
);

assert.equal(
  hasFail(
    validateTargetExamplePedagogicalQuality({
      set_id: "fixture",
      meaning_id: "shower_head",
      language_code: "EN",
      canonical_english: "shower head",
      canonical_example_en: "The shower head is in the shower.",
      semantic_scene: { state_or_location: "in the shower" },
      example_text: "The shower head is in the shower.",
    })
  ),
  true,
  "self-container shower-head example should fail"
);

assert.equal(
  hasFail(
    validateTargetExamplePedagogicalQuality({
      set_id: "fixture",
      meaning_id: "shower_head",
      language_code: "EN",
      canonical_english: "shower head",
      canonical_example_en: "The shower head is above the faucet.",
      semantic_scene: { state_or_location: "above the faucet" },
      example_text: "The shower head is above the faucet.",
    })
  ),
  false,
  "concrete non-tautological shower-head example should pass"
);

assert.equal(
  validateExampleNaturalness({
    language_code: "KO",
    example_text: "분무기 은 조리대 위에 있어요.",
  }).length > 0,
  true,
  "KO detached topic particle should fail naturalness"
);

assert.equal(
  validateExampleNaturalness({
    language_code: "HI",
    example_text: "रसोई सिंक है साफ है।",
  }).length > 0,
  true,
  "HI duplicate copula state example should fail naturalness"
);

assert.equal(
  validateExampleNaturalness({
    language_code: "UZ",
    example_text: "Oshxona rakovinasi bor toza.",
  }).length > 0,
  true,
  "UZ existential-before-state calque should fail naturalness"
);

assert.equal(
  validateExampleNaturalness({
    language_code: "RU",
    semantic_scene: { action_or_state: "is clean", state_or_location: "clean" },
    example_text: "Кухонная раковина чистая.",
  }).length,
  0,
  "RU simple adjective predicate should pass naturalness"
);

assert.equal(
  validateExampleNaturalness({
    language_code: "PT",
    example_text: "A tesoura de cozinha estáo ao lado da tigela.",
  }).length > 0,
  true,
  "PT hybrid estáo spelling should fail naturalness"
);

assert.equal(
  validateExampleNaturalness({
    language_code: "PT-BR",
    example_text: "Os palitos de dente estão na gaveta.",
  }).length,
  0,
  "PT-BR valid estão form should pass naturalness"
);

console.log("V3 QA unit fixtures OK");
