import fs from "node:fs";

import { getShortsOutroTranslation } from "./lib/shorts-outro-translations.mjs";

const videoLocalizationPath = "config/video-localization.json";
const videoLocalization = JSON.parse(fs.readFileSync(videoLocalizationPath, "utf8"));
const codes = Object.keys(videoLocalization).sort();
const languageContours = new Set(codes.map((code) => (code === "NB" ? "NO" : code)));

const requiredFields = ["title", "subtitle", "notice", "audio"];
const englishAudio = getShortsOutroTranslation("EN").audio;
const allowedEnglishAudioCodes = new Set(["EN", "EN-GB"]);
const staleDescriptionPattern = /description|описании/i;

const blockers = [];

for (const code of codes) {
  const translation = getShortsOutroTranslation(code);
  for (const field of requiredFields) {
    if (!String(translation[field] || "").trim()) {
      blockers.push({
        code,
        field,
        reason: "missing_required_field"
      });
    }
  }

  if (staleDescriptionPattern.test(`${translation.notice || ""} ${translation.audio || ""}`)) {
    blockers.push({
      code,
      reason: "shorts_cta_mentions_description"
    });
  }

  if (!allowedEnglishAudioCodes.has(code) && translation.audio === englishAudio) {
    blockers.push({
      code,
      reason: "fell_back_to_english_audio"
    });
  }
}

const no = getShortsOutroTranslation("NO");
const nb = getShortsOutroTranslation("NB");
for (const field of requiredFields) {
  if (no[field] !== nb[field]) {
    blockers.push({
      code: "NB",
      field,
      reason: "nb_must_match_no_bokmal_alias"
    });
  }
}

const report = {
  status: blockers.length ? "failed" : "passed",
  checkedCodes: languageContours.size,
  checkedLocalizationKeys: codes.length,
  nbNoAliasMerged: true,
  requiredFields,
  blockers
};

console.log(JSON.stringify(report, null, 2));

if (blockers.length) {
  process.exit(1);
}
