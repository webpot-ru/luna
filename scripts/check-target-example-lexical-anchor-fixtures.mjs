#!/usr/bin/env node
import { validateTargetExampleLexicalAnchor } from "./lib/target-example-lexical-anchor.mjs";

function assertNoFindings(name, row) {
  const findings = validateTargetExampleLexicalAnchor(row);
  if (findings.length > 0) {
    throw new Error(`${name}: expected no findings, got ${JSON.stringify(findings)}`);
  }
}

function assertWarning(name, row) {
  const findings = validateTargetExampleLexicalAnchor(row);
  if (!findings.some((finding) => finding.severity === "warning")) {
    throw new Error(`${name}: expected a warning, got ${JSON.stringify(findings)}`);
  }
}

assertNoFindings("LV feminine -e locative anchors same lemma", {
  set_id: "fixture_lexical_anchor",
  meaning_id: "fixture_glass_lv_01",
  language_code: "LV",
  part_of_speech: "noun",
  display_word: "glāze",
  example_text: "Glāzē ir ūdens.",
});

assertNoFindings("LV feminine -a locative anchors same lemma", {
  set_id: "fixture_lexical_anchor",
  meaning_id: "fixture_pitcher_lv_01",
  language_code: "LV",
  part_of_speech: "noun",
  display_word: "krūka",
  example_text: "Krūkā ir ūdens.",
});

assertNoFindings("DA definite suffix anchors same lemma", {
  set_id: "fixture_lexical_anchor",
  meaning_id: "fixture_bowl_da_01",
  language_code: "DA",
  part_of_speech: "noun",
  display_word: "en skål",
  example_text: "Skålen står på køkkenbordet.",
});

assertNoFindings("DA doubled-consonant definite suffix anchors same lemma", {
  set_id: "fixture_lexical_anchor",
  meaning_id: "fixture_cup_da_01",
  language_code: "DA",
  part_of_speech: "noun",
  display_word: "en kop",
  example_text: "Koppen står ved siden af vasken.",
});

assertNoFindings("DA neuter doubled-consonant definite suffix anchors same lemma", {
  set_id: "fixture_lexical_anchor",
  meaning_id: "fixture_glass_da_01",
  language_code: "DA",
  part_of_speech: "noun",
  display_word: "et glas",
  example_text: "Glasset er fuldt af vand.",
});

assertNoFindings("DA el-ending definite suffix anchors same lemma", {
  set_id: "fixture_lexical_anchor",
  meaning_id: "fixture_kettle_da_01",
  language_code: "DA",
  part_of_speech: "noun",
  display_word: "en kedel",
  example_text: "Kedlen står på komfuret.",
});

assertNoFindings("DA ffel-ending definite suffix anchors same lemma", {
  set_id: "fixture_lexical_anchor",
  meaning_id: "fixture_fork_da_01",
  language_code: "DA",
  part_of_speech: "noun",
  display_word: "en gaffel",
  example_text: "Gaflen ligger ved siden af tallerkenen.",
});

assertNoFindings("DA final-e definite suffix anchors same lemma", {
  set_id: "fixture_lexical_anchor",
  meaning_id: "fixture_ladle_da_01",
  language_code: "DA",
  part_of_speech: "noun",
  display_word: "en øse",
  example_text: "Øsen ligger i gryden.",
});

assertNoFindings("NB definite suffix anchors same lemma", {
  set_id: "fixture_lexical_anchor",
  meaning_id: "fixture_lid_nb_01",
  language_code: "NB",
  part_of_speech: "noun",
  display_word: "et lokk",
  example_text: "Lokket ligger på gryten.",
});

assertNoFindings("SV definite suffix anchors same lemma", {
  set_id: "fixture_lexical_anchor",
  meaning_id: "fixture_mug_sv_01",
  language_code: "SV",
  part_of_speech: "noun",
  display_word: "en mugg",
  example_text: "Muggen står på hyllan.",
});

assertNoFindings("SR feminine locative anchors same lemma", {
  set_id: "fixture_lexical_anchor",
  meaning_id: "fixture_glass_sr_01",
  language_code: "SR",
  part_of_speech: "noun",
  display_word: "čaša",
  example_text: "U čaši je voda.",
});

assertNoFindings("LT is-ending locative anchors same lemma", {
  set_id: "fixture_lexical_anchor",
  meaning_id: "fixture_pitcher_lt_01",
  language_code: "LT",
  part_of_speech: "noun",
  display_word: "ąsotis",
  example_text: "Ąsotyje yra vandens.",
});

assertWarning("LV unrelated example still warns", {
  set_id: "fixture_lexical_anchor",
  meaning_id: "fixture_pitcher_lv_bad_01",
  language_code: "LV",
  part_of_speech: "noun",
  display_word: "krūka",
  example_text: "Ūdens ir uz galda.",
});

console.log("Target-example lexical anchor fixtures OK.");
