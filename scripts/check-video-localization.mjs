#!/usr/bin/env node
import fs from "node:fs";
import { getPublicCourseUrl, getQrCodeImageUrl } from "./lib/video-public-url.mjs";

const localizationPath = "config/video-localization.json";
const localization = JSON.parse(fs.readFileSync(localizationPath, "utf8"));

const expectedKeys = Object.keys(localization.EN ?? {});
const monitoredRanges = {
  Cyrillic: [0x0400, 0x04ff],
  Armenian: [0x0530, 0x058f],
  Devanagari: [0x0900, 0x097f],
  Bengali: [0x0980, 0x09ff],
  Telugu: [0x0c00, 0x0c7f],
  Kannada: [0x0c80, 0x0cff],
  Malayalam: [0x0d00, 0x0d7f],
  Sinhala: [0x0d80, 0x0dff],
  Thai: [0x0e00, 0x0e7f],
  Lao: [0x0e80, 0x0eff],
  Georgian: [0x10a0, 0x10ff],
  Khmer: [0x1780, 0x17ff],
  Burmese: [0x1000, 0x109f]
};

const languageScripts = {
  RU: "Cyrillic",
  BG: "Cyrillic",
  KK: "Cyrillic",
  HY: "Armenian",
  HI: "Devanagari",
  NE: "Devanagari",
  BN: "Bengali",
  TE: "Telugu",
  KN: "Kannada",
  ML: "Malayalam",
  SI: "Sinhala",
  TH: "Thai",
  LO: "Lao",
  KA: "Georgian",
  KM: "Khmer",
  MY: "Burmese"
};

const blockers = [];
const homepageUrls = new Set([
  "https://flashcardsluna.com",
  "https://flashcardsluna.com/"
]);

function rangeNameForCodePoint(codePoint) {
  if (codePoint === 0x0964 || codePoint === 0x0965) return null;
  for (const [name, [start, end]] of Object.entries(monitoredRanges)) {
    if (codePoint >= start && codePoint <= end) return name;
  }
  return null;
}

for (const [languageCode, values] of Object.entries(localization)) {
  for (const key of expectedKeys) {
    if (!(key in values)) {
      blockers.push({ languageCode, key, issue: "missing_key" });
    }
  }

  for (const key of Object.keys(values)) {
    if (!expectedKeys.includes(key)) {
      blockers.push({ languageCode, key, issue: "unexpected_key" });
    }
  }

  if (!values.qr_scan_label) {
    blockers.push({ languageCode, key: "qr_scan_label", issue: "missing_qr_scan_label" });
  }

  if (!values.intro_speech_template?.includes("{target_lang}") || !values.intro_speech_template?.includes("{deck_title}")) {
    blockers.push({ languageCode, key: "intro_speech_template", issue: "missing_intro_placeholders" });
  }

  if (!values.quiz_question_label_template?.includes("{current}") || !values.quiz_question_label_template?.includes("{total}")) {
    blockers.push({ languageCode, key: "quiz_question_label_template", issue: "missing_quiz_placeholders" });
  }

  const expectedScript = languageScripts[languageCode];
  if (!expectedScript) continue;

  for (const [key, value] of Object.entries(values)) {
    const cleanValue = String(value)
      .replace(/flashcardsluna\.com/g, "")
      .replace(/<br>/g, "")
      .replace(/\{[^}]+\}/g, "");

    for (const char of cleanValue) {
      const rangeName = rangeNameForCodePoint(char.codePointAt(0));
      if (rangeName && rangeName !== expectedScript) {
        blockers.push({
          languageCode,
          key,
          issue: "unexpected_script",
          expectedScript,
          actualScript: rangeName,
          char
        });
      }
    }
  }
}

for (const languageCode of Object.keys(localization)) {
  const fallbackUrl = getPublicCourseUrl({ setId: "unknown_video_deck_for_fallback_check", supportLang: languageCode });
  if (homepageUrls.has(fallbackUrl) || !/\/courses(\/|$)/.test(new URL(fallbackUrl).pathname)) {
    blockers.push({
      languageCode,
      key: "outro_url",
      issue: "fallback_not_course_url",
      url: fallbackUrl
    });
  }
}

const knownPublishedUrl = getPublicCourseUrl({
  setId: "home_kitchen_cookware_pilot_01",
  supportLang: "RU"
});
if (knownPublishedUrl !== "https://flashcardsluna.com/ru/courses/home-kitchen-kitchenware-basics") {
  blockers.push({
    languageCode: "RU",
    key: "outro_url",
    issue: "published_course_url_mismatch",
    url: knownPublishedUrl
  });
}

const knownPublishedQrSrc = getQrCodeImageUrl(knownPublishedUrl);
if (!knownPublishedQrSrc.startsWith("data:image/svg+xml") || knownPublishedQrSrc.includes("api.qrserver.com")) {
  blockers.push({
    languageCode: "RU",
    key: "outro_qr",
    issue: "qr_not_local_data_uri",
    valuePreview: knownPublishedQrSrc.slice(0, 80)
  });
}

if (blockers.length) {
  console.error(JSON.stringify({ status: "failed", blockerCount: blockers.length, blockers }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "passed",
  languageCount: Object.keys(localization).length,
  keyCount: expectedKeys.length
}, null, 2));
