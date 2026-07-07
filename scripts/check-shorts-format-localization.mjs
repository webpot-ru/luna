#!/usr/bin/env node
import fs from "node:fs";

import {
  SHORTS_FORMAT_IDS,
  SHORTS_FORMAT_REQUIRED_FIELDS,
  getShortsFormatTranslation,
  getShortsFormatTranslations
} from "./lib/shorts-format-translations.mjs";

const videoLocalizationPath = "config/video-localization.json";
const videoLocalization = JSON.parse(fs.readFileSync(videoLocalizationPath, "utf8"));
const codes = Object.keys(videoLocalization).sort();
const languageContours = new Set(codes.map((code) => (code === "NB" ? "NO" : code)));
const allowedEnglishHookCodes = new Set(["EN", "EN-GB"]);
const blockers = [];

for (const code of codes) {
  const pack = getShortsFormatTranslations(code);
  for (const formatId of SHORTS_FORMAT_IDS) {
    const translation = getShortsFormatTranslation(code, formatId);
    for (const field of SHORTS_FORMAT_REQUIRED_FIELDS) {
      if (!String(translation[field] || "").trim()) {
        blockers.push({
          code,
          formatId,
          field,
          reason: "missing_required_field"
        });
      }
    }

    const english = getShortsFormatTranslation("EN", formatId);
    if (!allowedEnglishHookCodes.has(code) && translation.hook === english.hook) {
      blockers.push({
        code,
        formatId,
        field: "hook",
        reason: "fell_back_to_english_hook"
      });
    }
  }

  for (const formatId of SHORTS_FORMAT_IDS) {
    if (!pack.formats[formatId]) {
      blockers.push({
        code,
        formatId,
        reason: "missing_format"
      });
    }
  }
}

for (const formatId of SHORTS_FORMAT_IDS) {
  const no = getShortsFormatTranslation("NO", formatId);
  const nb = getShortsFormatTranslation("NB", formatId);
  for (const field of SHORTS_FORMAT_REQUIRED_FIELDS) {
    if (no[field] !== nb[field]) {
      blockers.push({
        code: "NB",
        formatId,
        field,
        reason: "nb_must_match_no_bokmal_alias"
      });
    }
  }
}

const report = {
  status: blockers.length ? "failed" : "passed",
  checkedCodes: languageContours.size,
  checkedLocalizationKeys: codes.length,
  nbNoAliasMerged: true,
  checkedFormats: SHORTS_FORMAT_IDS.length,
  requiredFields: SHORTS_FORMAT_REQUIRED_FIELDS,
  blockers
};

console.log(JSON.stringify(report, null, 2));

if (blockers.length) {
  process.exit(1);
}
