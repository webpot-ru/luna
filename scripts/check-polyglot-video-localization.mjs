#!/usr/bin/env node
import fs from "node:fs";

const baseLocalizationPath = "config/video-localization.json";
const polyglotLocalizationPath = "config/polyglot-video-localization.json";

const baseLocalization = JSON.parse(fs.readFileSync(baseLocalizationPath, "utf8"));
const polyglotLocalization = JSON.parse(fs.readFileSync(polyglotLocalizationPath, "utf8"));

const requiredKeys = [
  "introTitle",
  "introDescription",
  "introSpeechTemplate",
  "outroTitle",
  "outroSubtitle",
  "outroSpeech",
  "languagesLabel",
  "modeLabel",
  "supportAnchorLabel",
  "headerSuffix"
];

const requiredRegionalVariants = ["EN-GB", "ES-419", "PT-BR"];
const themedDecksClaimPattern = /180|۱۸۰|١٨٠|१८०|১৮০|၁၈၀/;
const pricingPatterns = [
  /\bfree\b/i,
  /\bpaid\b/i,
  /\bpayment\b/i,
  /\bpricing\b/i,
  /\bsubscription\b/i,
  /бесплатн/i,
  /платн/i,
  /\bgratis\b/i,
  /\bgratuit/i,
  /\bgratuito\b/i,
  /\bgr[aá]tis\b/i,
  /\bkostenlos\b/i,
  /\bpercuma\b/i,
  /\bingyen\b/i,
  /\bbezplat/i,
  /\bbezpłat/i,
  /\bzdarma\b/i,
  /\bzadarmo\b/i,
  /\bilmais\b/i,
  /無料/,
  /免费/,
  /免費/,
  /무료/,
  /ฟรี/
];

const baseLanguageCodes = Object.keys(baseLocalization);
const polyglotLanguageCodes = Object.keys(polyglotLocalization);
const blockers = [];

for (const code of baseLanguageCodes) {
  const values = polyglotLocalization[code];
  if (!values) {
    blockers.push({ languageCode: code, issue: "missing_polyglot_localization" });
    continue;
  }

  for (const key of requiredKeys) {
    if (!String(values[key] || "").trim()) {
      blockers.push({ languageCode: code, key, issue: "missing_required_key" });
    }
  }

  if (!String(values.introSpeechTemplate || "").includes("{deck_title}")) {
    blockers.push({ languageCode: code, key: "introSpeechTemplate", issue: "missing_deck_title_placeholder" });
  }

  const outroCta = `${values.outroSubtitle || ""} ${values.outroSpeech || ""}`;
  if (!themedDecksClaimPattern.test(outroCta)) {
    blockers.push({ languageCode: code, key: "outroSubtitle/outroSpeech", issue: "missing_180_plus_themed_decks_cta" });
  }

  for (const [key, value] of Object.entries(values)) {
    for (const pattern of pricingPatterns) {
      if (pattern.test(String(value))) {
        blockers.push({
          languageCode: code,
          key,
          issue: "pricing_copy_not_allowed",
          pattern: String(pattern),
          value
        });
      }
    }
  }
}

for (const code of polyglotLanguageCodes) {
  if (!baseLocalization[code]) {
    blockers.push({ languageCode: code, issue: "unexpected_polyglot_language_code" });
  }
}

for (const code of requiredRegionalVariants) {
  if (!polyglotLocalization[code]) {
    blockers.push({ languageCode: code, issue: "missing_required_regional_variant" });
  }
}

if (blockers.length) {
  console.error(JSON.stringify({
    status: "failed",
    baseLanguageCount: baseLanguageCodes.length,
    polyglotLanguageCount: polyglotLanguageCodes.length,
    blockerCount: blockers.length,
    blockers
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "passed",
  baseLanguageCount: baseLanguageCodes.length,
  polyglotLanguageCount: polyglotLanguageCodes.length,
  requiredKeyCount: requiredKeys.length,
  requiredRegionalVariants
}, null, 2));
