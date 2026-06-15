#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const releaseId =
  args.get("release") ??
  process.argv.slice(2).find((arg) => !arg.startsWith("--")) ??
  "english_core_3000_a1_a2_part_001_150_v1";
const batch = args.get("batch") ?? "ru_es_fr_v0";
const languages = (args.get("languages") ?? "RU,ES,FR").split(",").map((code) => code.trim()).filter(Boolean);
const filePath = path.resolve(
  args.get("file") ??
    `outputs/english-core-3000/translation-batches/${releaseId}_translation_batch_${batch}.jsonl`
);

const cyrillic = /\p{Script=Cyrillic}/u;
const latin = /\p{Script=Latin}/u;
const han = /\p{Script=Han}/u;
const japanese = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const hangul = /\p{Script=Hangul}/u;
const thai = /\p{Script=Thai}/u;
const devanagari = /\p{Script=Devanagari}/u;
const bengali = /\p{Script=Bengali}/u;
const myanmar = /\p{Script=Myanmar}/u;
const khmer = /\p{Script=Khmer}/u;
const lao = /\p{Script=Lao}/u;
const sinhala = /\p{Script=Sinhala}/u;
const tamil = /\p{Script=Tamil}/u;
const telugu = /\p{Script=Telugu}/u;
const kannada = /\p{Script=Kannada}/u;
const malayalam = /\p{Script=Malayalam}/u;
const georgian = /\p{Script=Georgian}/u;
const armenian = /\p{Script=Armenian}/u;
const sentenceTerminators = /(?:[.!?。！？։။।؟]|\u17D4)$/u;
const forbiddenFields = new Set(
  languages.flatMap((language) => [`transcription_${language}`, `example_transcription_${language}`])
);
const allowedExactSurface = new Set(["FR::long", "FR::correct", "FR::important", "NL::in", "RO::important"]);
const latinScriptLanguages = new Set([
  "AZ",
  "CS",
  "DA",
  "DE",
  "EN-GB",
  "ES",
  "ES-419",
  "ET",
  "FI",
  "FR",
  "HR",
  "HU",
  "ID",
  "IS",
  "IT",
  "LT",
  "LV",
  "MS",
  "NL",
  "NO",
  "PL",
  "PT",
  "PT-BR",
  "RO",
  "SK",
  "SL",
  "SV",
  "SW",
  "TL",
  "TR",
  "UZ",
  "VI",
]);

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

function comparable(value) {
  return normalizeText(value)
    .toLocaleLowerCase("en-US")
    .replace(/\b(a|an|the|to)\b/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "");
}

function fail(message) {
  throw new Error(message);
}

const text = await fs.readFile(filePath, "utf8");
const rows = text
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => JSON.parse(line));

if (rows.length !== 150) fail(`Expected 150 rows, got ${rows.length}.`);

const seen = new Set();
for (const row of rows) {
  if (row.release_id !== releaseId) fail(`Unexpected release_id for ${row.core_item_id}.`);
  if (!row.core_item_id) fail("Missing core_item_id.");
  if (seen.has(row.core_item_id)) fail(`Duplicate core_item_id ${row.core_item_id}.`);
  seen.add(row.core_item_id);

  for (const field of forbiddenFields) {
    if (field in row) fail(`Forbidden target-language transcription field ${field} on ${row.core_item_id}.`);
  }

  const englishComparable = comparable(row.en_display);
  for (const language of languages) {
    const display = normalizeText(row[language]);
    const example = normalizeText(row[`example_${language}`]);
    if (!display) fail(`Missing ${language} display for ${row.core_item_id}.`);
    if (!example) fail(`Missing example_${language} for ${row.core_item_id}.`);
    if (!sentenceTerminators.test(example)) {
      fail(`example_${language} lacks sentence punctuation for ${row.core_item_id}: ${example}`);
    }
    if ((language === "RU" || language === "BG" || language === "SR" || language === "KK") && !cyrillic.test(display)) {
      fail(`${language} display must contain Cyrillic for ${row.core_item_id}: ${display}`);
    }
    if (latinScriptLanguages.has(language) && !latin.test(display)) {
      fail(`${language} display must contain Latin text for ${row.core_item_id}: ${display}`);
    }
    if (language === "ZH" && !han.test(display)) {
      fail(`ZH display must contain Han text for ${row.core_item_id}: ${display}`);
    }
    if (language === "JA" && !japanese.test(display)) {
      fail(`JA display must contain Japanese text for ${row.core_item_id}: ${display}`);
    }
    if (language === "KO" && !hangul.test(display)) {
      fail(`KO display must contain Hangul for ${row.core_item_id}: ${display}`);
    }
    if (language === "TH" && !thai.test(display)) {
      fail(`TH display must contain Thai script for ${row.core_item_id}: ${display}`);
    }
    if (language === "HI" && !devanagari.test(display)) {
      fail(`HI display must contain Devanagari script for ${row.core_item_id}: ${display}`);
    }
    if (language === "NE" && !devanagari.test(display)) {
      fail(`NE display must contain Devanagari script for ${row.core_item_id}: ${display}`);
    }
    if (language === "BN" && !bengali.test(display)) {
      fail(`BN display must contain Bengali script for ${row.core_item_id}: ${display}`);
    }
    if (language === "MY" && !myanmar.test(display)) {
      fail(`MY display must contain Myanmar script for ${row.core_item_id}: ${display}`);
    }
    if (language === "KM" && !khmer.test(display)) {
      fail(`KM display must contain Khmer script for ${row.core_item_id}: ${display}`);
    }
    if (language === "LO" && !lao.test(display)) {
      fail(`LO display must contain Lao script for ${row.core_item_id}: ${display}`);
    }
    if (language === "SI" && !sinhala.test(display)) {
      fail(`SI display must contain Sinhala script for ${row.core_item_id}: ${display}`);
    }
    if (language === "TA" && !tamil.test(display)) {
      fail(`TA display must contain Tamil script for ${row.core_item_id}: ${display}`);
    }
    if (language === "TE" && !telugu.test(display)) {
      fail(`TE display must contain Telugu script for ${row.core_item_id}: ${display}`);
    }
    if (language === "KN" && !kannada.test(display)) {
      fail(`KN display must contain Kannada script for ${row.core_item_id}: ${display}`);
    }
    if (language === "ML" && !malayalam.test(display)) {
      fail(`ML display must contain Malayalam script for ${row.core_item_id}: ${display}`);
    }
    if (language === "KA" && !georgian.test(display)) {
      fail(`KA display must contain Georgian script for ${row.core_item_id}: ${display}`);
    }
    if (language === "HY" && !armenian.test(display)) {
      fail(`HY display must contain Armenian script for ${row.core_item_id}: ${display}`);
    }
    const exactSurfaceKey = `${language}::${normalizeText(display).toLocaleLowerCase("en-US")}`;
    if (
      language !== "RU" &&
      !allowedExactSurface.has(exactSurfaceKey) &&
      normalizeText(display).toLocaleLowerCase("en-US") === normalizeText(row.en_display).toLocaleLowerCase("en-US")
    ) {
      fail(`${language} display is an English fallback for ${row.core_item_id}: ${display}`);
    }
  }
}

console.log(
  `English Core 3000 translation batch OK for ${releaseId}: batch=${batch}, rows=${rows.length}, languages=${languages.join(",")}, no_target_transcriptions=true`
);
