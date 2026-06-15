#!/usr/bin/env node
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import readline from "node:readline";

import {
  bulkIndexStatus,
  indexFiles,
  normalizeBulkComparable,
  normalizeBulkText,
} from "../lib/bulk-source-indexes.mjs";

const releaseId = process.argv[2] ?? "hsk2_classic_level_1_150_v1";
const levelMatch = releaseId.match(/level_(\d+)_/u);
const hskLevel = levelMatch ? Number(levelMatch[1]) : 1;
const outputDir = path.resolve("outputs/hsk");
const jsonlPath = path.join(outputDir, `${releaseId}.jsonl`);
const csvPath = path.join(outputDir, `${releaseId}.csv`);
const qaDir = path.join(outputDir, "qa");
const sourcePath = path.join(outputDir, "source", `${releaseId}.source.json`);
const languagesPath = path.resolve("config/language-order.json");
const overridesPath = path.resolve(`config/hsk-classic-hsk${hskLevel}-card-overrides.json`);
const examplesPath = path.resolve(`config/hsk-classic-hsk${hskLevel}-examples.json`);
const translationsDir = path.resolve("config");
const translationPackPattern = new RegExp(`^hsk-classic-hsk${hskLevel}-translations-.+\\.tsv$`, "iu");

const ruleVersion = "classic-hsk-source-audit-v1";
const maxIssuesPerBucket = 500;
const maxSampleRows = 80;

const requiredFixedFields = [
  "release_id",
  "hsk_version",
  "hsk_level",
  "hsk_order",
  "simplified",
  "traditional",
  "pinyin",
  "example_zh",
  "example_pinyin",
  "EN",
  "example_EN",
  "translation_status",
  "example_status",
];

const forbiddenHeaderPatterns = [/transcription/i, /romanization/i, /ipa/i, /^audio/i];

const scriptPolicies = {
  ZH: { label: "Han", required: /\p{Script=Han}/u, forbidden: /[A-Za-z]/u },
  JA: { label: "Japanese", required: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u },
  KO: { label: "Hangul", required: /\p{Script=Hangul}/u, forbidden: /[A-Za-z]/u },
  RU: { label: "Cyrillic", required: /\p{Script=Cyrillic}/u, forbidden: /[A-Za-z]/u },
  TH: { label: "Thai", required: /\p{Script=Thai}/u, forbidden: /[A-Za-z]/u },
  BG: { label: "Cyrillic", required: /\p{Script=Cyrillic}/u, forbidden: /[A-Za-z]/u },
  SR: { label: "Cyrillic", required: /\p{Script=Cyrillic}/u, forbidden: /[A-Za-z]/u },
  HI: { label: "Devanagari", required: /\p{Script=Devanagari}/u, forbidden: /[A-Za-z]/u },
  BN: { label: "Bengali", required: /\p{Script=Bengali}/u, forbidden: /[A-Za-z]/u },
  MY: { label: "Myanmar", required: /\p{Script=Myanmar}/u, forbidden: /[A-Za-z]/u },
  KM: { label: "Khmer", required: /\p{Script=Khmer}/u, forbidden: /[A-Za-z]/u },
  LO: { label: "Lao", required: /\p{Script=Lao}/u, forbidden: /[A-Za-z]/u },
  NE: { label: "Devanagari", required: /\p{Script=Devanagari}/u, forbidden: /[A-Za-z]/u },
  SI: { label: "Sinhala", required: /\p{Script=Sinhala}/u, forbidden: /[A-Za-z]/u },
  TA: { label: "Tamil", required: /\p{Script=Tamil}/u, forbidden: /[A-Za-z]/u },
  TE: { label: "Telugu", required: /\p{Script=Telugu}/u, forbidden: /[A-Za-z]/u },
  KN: { label: "Kannada", required: /\p{Script=Kannada}/u, forbidden: /[A-Za-z]/u },
  ML: { label: "Malayalam", required: /\p{Script=Malayalam}/u, forbidden: /[A-Za-z]/u },
  KK: { label: "Cyrillic", required: /\p{Script=Cyrillic}/u, forbidden: /[A-Za-z]/u },
  KA: { label: "Georgian", required: /\p{Script=Georgian}/u, forbidden: /[A-Za-z]/u },
  HY: { label: "Armenian", required: /\p{Script=Armenian}/u, forbidden: /[A-Za-z]/u },
};

const sourceLookupCodeOverrides = {
  NO: "NB",
  "PT-BR": "PT",
  "ES-419": "ES",
  "EN-GB": "EN",
};

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (quoted && char === '"' && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function parseCsv(text) {
  const lines = text.trimEnd().split(/\r?\n/u);
  const headers = parseCsvLine(lines[0] ?? "");
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
  return { headers, rows };
}

function parseTsvLine(line) {
  return line.split("\t").map((value) => value.trim());
}

async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function loadReleaseRows() {
  if (await pathExists(jsonlPath)) {
    const text = await fs.readFile(jsonlPath, "utf8");
    const rows = text
      .trimEnd()
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const headers = rows.length ? Object.keys(rows[0]) : [];
    return { inputPath: jsonlPath, inputFormat: "jsonl", headers, rows };
  }

  if (await pathExists(csvPath)) {
    const parsed = parseCsv(await fs.readFile(csvPath, "utf8"));
    return { inputPath: csvPath, inputFormat: "csv", ...parsed };
  }

  throw new Error(`Missing HSK release input: ${jsonlPath} or ${csvPath}`);
}

async function loadTranslationPacks() {
  const translations = {};
  const files = (await fs.readdir(translationsDir))
    .filter((file) => translationPackPattern.test(file))
    .sort();

  for (const file of files) {
    const lines = (await fs.readFile(path.join(translationsDir, file), "utf8"))
      .split(/\r?\n/u)
      .filter((line) => line.trim() && !line.trim().startsWith("#"));
    if (!lines.length) continue;
    const headers = parseTsvLine(lines[0]);
    if (headers[0] !== "simplified") throw new Error(`${file} must start with simplified`);
    for (const line of lines.slice(1)) {
      const values = parseTsvLine(line);
      const simplified = values[0];
      if (!simplified) continue;
      translations[simplified] ??= {};
      for (let index = 1; index < headers.length; index += 1) {
        translations[simplified][headers[index]] = values[index] ?? "";
      }
    }
  }

  return { files, translations };
}

function hskTargetLanguages(languages) {
  return languages.filter((language) => language.spreadsheetCode !== "ZH");
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/gu, "");
}

function compactValue(value, limit = 160) {
  const text = normalizeBulkText(value);
  return text.length > limit ? `${text.slice(0, limit - 1)}...` : text;
}

function issue(type, row, language, field, message, extra = {}) {
  return {
    type,
    order: row?.hsk_order ?? "",
    simplified: row?.simplified ?? "",
    language,
    field,
    message,
    ...extra,
  };
}

function addIssue(target, item) {
  target.push(item);
}

function isEffectivelyEmpty(value) {
  return normalizeBulkText(value) === "";
}

function onlyNeutralSymbols(value) {
  const text = normalizeBulkText(value);
  return Boolean(text) && !/[\p{Letter}]/u.test(text);
}

function hasPinyinToneNumber(value) {
  return /(?:[A-Za-züÜv:]+[1-5]\b|\b[1-5]\s*$)/u.test(String(value ?? ""));
}

function comparable(value) {
  return normalizeBulkComparable(value);
}

function isLikelyEnglishPhrase(value) {
  const text = normalizeBulkText(value);
  if (!/[A-Za-z]/u.test(text)) return false;
  if (/^(?:to|a|an|the|of|and|or|in|on|at|for|with|from)\b/iu.test(text)) return true;
  const tokens = text.match(/[A-Za-z]+/gu) ?? [];
  return tokens.length >= 3;
}

function sourceLookupCode(language) {
  return sourceLookupCodeOverrides[language.spreadsheetCode] ?? language.dbCode ?? language.spreadsheetCode;
}

function entryKey(entry, index = 0) {
  return entry?.hsk_canonical_source?.hsk_key ?? entry?.hsk_key ?? entry?.simplified ?? `${index + 1}`;
}

function rowKey(row) {
  return `${row.hsk_order}:${row.simplified}`;
}

function lookupCurated(curated, row) {
  return curated[rowKey(row)] ?? curated[row.simplified];
}

function checkScriptPolicy(row, code, field, value) {
  const policy = scriptPolicies[code];
  if (!policy) return null;
  const text = normalizeBulkText(value);
  if (!text || onlyNeutralSymbols(text)) return null;
  if (!policy.required.test(text)) {
    return issue("wrong_script", row, code, field, `${code} value does not contain expected ${policy.label} script`, {
      value: compactValue(text),
    });
  }
  if (policy.forbidden?.test(text)) {
    return issue("wrong_script", row, code, field, `${code} value contains forbidden Latin-script fallback`, {
      value: compactValue(text),
    });
  }
  return null;
}

function checkExampleDrift(row, code, value) {
  const text = normalizeBulkText(value);
  const exampleEn = normalizeBulkText(row.example_EN);
  if (!text) {
    return issue("missing_required_hsk_field", row, code, `example_${code}`, "missing target example translation");
  }
  if (code !== "EN" && code !== "EN-GB" && comparable(text) === comparable(exampleEn)) {
    return issue("english_fallback", row, code, `example_${code}`, "target example is identical to example_EN", {
      value: compactValue(text),
    });
  }
  if (/^(?:word|meaning|translation|number)\s*[:：]/iu.test(text)) {
    return issue("example_scene_drift", row, code, `example_${code}`, "target example looks like a meta-template, not the Chinese example scene", {
      value: compactValue(text),
    });
  }
  return null;
}

function confidenceBucket(summary) {
  if (summary.blockers > 0) return "blocked";
  if (summary.filled_word_cells_count === 0 || summary.filled_example_cells_count === 0) return "missing_content";
  if (summary.source_candidate_count > 0 && summary.example_candidate_count > 0 && summary.warnings === 0) return "source_supported";
  if (summary.source_candidate_count > 0 || summary.example_candidate_count > 0) return "source_partial";
  return "generated_checked_no_source";
}

function countBy(items, keyFn) {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function tokens(value) {
  const normalized = comparable(value);
  return normalized ? normalized.split(" ").filter((token) => token.length >= 3) : [];
}

function candidateHaystack(item) {
  return normalizeBulkComparable(
    `${item.source_key ?? ""} ${item.token_key ?? ""} ${item.value ?? ""} ${item.source_text ?? ""} ${item.target_text ?? ""} ${item.text ?? ""} ${item.concept_gloss ?? ""}`
  );
}

function buildRowLookup(auditRows) {
  const rowsByLanguageAndToken = new Map();
  const needles = new Set();
  const nativeExactKeys = new Map();
  for (let index = 0; index < auditRows.length; index += 1) {
    const row = auditRows[index];
    const languageCode = row.language_code;
    for (const token of tokens(`${row.canonical_english} ${row.native_word}`)) {
      needles.add(token);
      if (!rowsByLanguageAndToken.has(languageCode)) rowsByLanguageAndToken.set(languageCode, new Map());
      const byToken = rowsByLanguageAndToken.get(languageCode);
      if (!byToken.has(token)) byToken.set(token, new Set());
      byToken.get(token).add(index);
    }
    const nativeKey = comparable(row.native_word);
    if (languageCode && nativeKey) nativeExactKeys.set(`${languageCode}::${nativeKey}`, index);
  }
  return { rowsByLanguageAndToken, needles, nativeExactKeys };
}

async function readIndexedCandidates(file, auditRows, lookup, options) {
  const rows = [];
  if (!(await pathExists(file))) return rows;
  const maxLines = Number(process.env.HSK_SOURCE_AUDIT_MAX_LINES ?? options.maxLines ?? 180000);
  const maxRows = Number(options.maxRows ?? 2000);
  const maxPerRow = Number(options.maxPerRow ?? 6);
  const languages = new Set(auditRows.map((row) => row.language_code).filter(Boolean));
  const rowCounts = new Map();
  const seen = new Set();
  const reader = readline.createInterface({ input: createReadStream(file, "utf8"), crlfDelay: Infinity });
  let scanned = 0;

  for await (const line of reader) {
    scanned += 1;
    if (scanned > maxLines || rows.length >= maxRows) break;
    if (!line.trim()) continue;
    let item;
    try {
      item = JSON.parse(line);
    } catch {
      continue;
    }
    const itemLanguage = item.language_code ?? "";
    if (options.kind !== "concept" && itemLanguage && !languages.has(itemLanguage)) continue;
    if (options.kind === "concept" && itemLanguage && itemLanguage !== "EN" && !languages.has(itemLanguage)) continue;

    const haystackTokens = new Set(candidateHaystack(item).split(" ").filter((token) => token.length >= 3));
    const matchedTokens = [...haystackTokens].filter((token) => lookup.needles.has(token));
    if (!matchedTokens.length) continue;

    const languageTargets =
      options.kind === "concept" && itemLanguage === "EN"
        ? [...languages]
        : [itemLanguage].filter(Boolean);
    const rowIndexes = new Set();
    for (const languageCode of languageTargets) {
      const byToken = lookup.rowsByLanguageAndToken.get(languageCode);
      if (!byToken) continue;
      for (const token of matchedTokens) {
        for (const rowIndex of byToken.get(token) ?? []) rowIndexes.add(rowIndex);
      }
    }

    for (const rowIndex of rowIndexes) {
      if (rows.length >= maxRows) break;
      const row = auditRows[rowIndex];
      const rowCount = rowCounts.get(rowIndex) ?? 0;
      if (rowCount >= maxPerRow) continue;
      const stableKey = `${options.kind}:${rowIndex}:${item.source ?? ""}:${item.source_id ?? ""}:${item.value ?? item.target_text ?? item.text ?? item.concept_gloss ?? ""}`;
      if (seen.has(stableKey)) continue;
      seen.add(stableKey);
      rowCounts.set(rowIndex, rowCount + 1);
      if (options.kind === "example") {
        rows.push({
          source_id: item.source_id,
          adapter: item.source,
          language_code: row.language_code,
          spreadsheet_language_code: row.spreadsheet_language_code,
          meaning_id: row.meaning_id,
          canonical_english: row.canonical_english,
          target_anchor: row.native_word,
          source_text: item.source_text ?? "",
          target_text: item.target_text ?? item.text ?? "",
          confidence: "source_partial",
          note: `${item.source} collocation/example hint; corpus disagreement alone is never a blocker.`,
        });
      } else if (options.kind === "concept") {
        rows.push({
          source_id: item.source_id,
          adapter: item.source,
          language_code: row.language_code,
          spreadsheet_language_code: row.spreadsheet_language_code,
          meaning_id: row.meaning_id,
          concept_id: item.concept_id ?? "",
          concept_gloss: item.concept_gloss ?? item.value ?? "",
          candidate_value: item.value ?? "",
          confidence: "source_partial",
          note: "Concept sanity hint only; use for semantic granularity/false-friend review, not automatic approval.",
        });
      } else {
        rows.push({
          source_id: item.source_id,
          adapter: item.source,
          set_id: releaseId,
          meaning_id: row.meaning_id,
          canonical_english: row.canonical_english,
          field: "native_word",
          value: item.value ?? item.concept_gloss ?? "",
          confidence: "source_partial",
          source_ids: [item.source_id].filter(Boolean),
          note: `${item.source} bulk index candidate; repair hint only, not final truth.`,
          language_code: row.language_code,
          spreadsheet_language_code: row.spreadsheet_language_code,
        });
      }
    }
  }

  return rows;
}

async function readHunspellSanity(file, auditRows, lookup) {
  const rows = [];
  if (!(await pathExists(file))) return rows;
  const maxLines = Number(process.env.HSK_SOURCE_AUDIT_MAX_LINES ?? 180000);
  const languages = new Set(auditRows.map((row) => row.language_code).filter(Boolean));
  const exactMatches = new Set();
  const languagesPresent = new Set();
  const reader = readline.createInterface({ input: createReadStream(file, "utf8"), crlfDelay: Infinity });
  let scanned = 0;
  for await (const line of reader) {
    scanned += 1;
    if (scanned > maxLines) break;
    if (!line.trim()) continue;
    let item;
    try {
      item = JSON.parse(line);
    } catch {
      continue;
    }
    const languageCode = item.language_code ?? "";
    if (!languages.has(languageCode)) continue;
    languagesPresent.add(languageCode);
    const tokenKey = item.token_key ?? "";
    if (tokenKey && lookup.nativeExactKeys.has(`${languageCode}::${tokenKey}`)) {
      exactMatches.add(`${languageCode}::${tokenKey}`);
    }
  }

  for (const row of auditRows) {
    const nativeComparable = comparable(row.native_word);
    if (!nativeComparable || !languagesPresent.has(row.language_code)) continue;
    const key = `${row.language_code}::${nativeComparable}`;
    if (!exactMatches.has(key)) {
      rows.push({
        source_id: "libreoffice-dictionaries-master-zip",
        adapter: "hunspell",
        language_code: row.language_code,
        spreadsheet_language_code: row.spreadsheet_language_code,
        meaning_id: row.meaning_id,
        field: "native_word",
        current_value: row.native_word,
        status: "not_found",
        confidence: "source_partial",
        note: "Hunspell spelling sanity did not find an exact display/native form; warning only, never translation truth.",
      });
    }
  }
  return rows;
}

async function buildHskSourceHints(auditRows) {
  const lookup = buildRowLookup(auditRows);
  const [
    weakDictionaryRows,
    panlexMeaningRows,
    panlexRows,
    wikidataRows,
    conceptRows,
    weakExampleRows,
    opusRows,
    tatoebaRows,
    spellingSanity,
  ] = await Promise.all([
    readIndexedCandidates(indexFiles.weakDictionaries, auditRows, lookup, { kind: "translation", maxRows: 1200, maxPerRow: 4 }),
    readIndexedCandidates(indexFiles.panlexMeanings, auditRows, lookup, { kind: "translation", maxRows: 1200, maxPerRow: 4 }),
    readIndexedCandidates(indexFiles.panlex, auditRows, lookup, { kind: "translation", maxRows: 800, maxPerRow: 3 }),
    readIndexedCandidates(indexFiles.wikidata, auditRows, lookup, { kind: "translation", maxRows: 600, maxPerRow: 2 }),
    readIndexedCandidates(indexFiles.concepts, auditRows, lookup, { kind: "concept", maxRows: 800, maxPerRow: 2 }),
    readIndexedCandidates(indexFiles.weakExamples, auditRows, lookup, { kind: "example", maxRows: 1200, maxPerRow: 3 }),
    readIndexedCandidates(indexFiles.opus, auditRows, lookup, { kind: "example", maxRows: 1000, maxPerRow: 2 }),
    readIndexedCandidates(indexFiles.tatoeba, auditRows, lookup, { kind: "example", maxRows: 1000, maxPerRow: 2 }),
    readHunspellSanity(indexFiles.hunspell, auditRows, lookup),
  ]);
  return {
    translationCandidates: [...weakDictionaryRows, ...panlexMeaningRows, ...panlexRows, ...wikidataRows],
    exampleCollocationCandidates: [...weakExampleRows, ...opusRows, ...tatoebaRows],
    conceptSanity: conceptRows,
    spellingSanity,
  };
}

function sampleCandidates(candidates) {
  return candidates.slice(0, maxSampleRows).map((candidate) => ({
    language_code: candidate.language_code,
    adapter: candidate.adapter,
    source_id: candidate.source_id,
    meaning_id: candidate.meaning_id,
    canonical_english: compactValue(candidate.canonical_english, 90),
    value: compactValue(candidate.value ?? candidate.target_text ?? candidate.candidate_value ?? "", 120),
    confidence: candidate.confidence,
    note: candidate.note,
  }));
}

async function main() {
  const [
    release,
    languages,
    overrides,
    examples,
    sourceEntries,
    translationPack,
    indexStatus,
  ] = await Promise.all([
    loadReleaseRows(),
    fs.readFile(languagesPath, "utf8").then((text) => hskTargetLanguages(JSON.parse(text))),
    fs.readFile(overridesPath, "utf8").then(JSON.parse),
    fs.readFile(examplesPath, "utf8").then(JSON.parse),
    fs.readFile(sourcePath, "utf8").then(JSON.parse),
    loadTranslationPacks(),
    bulkIndexStatus(),
  ]);

  const languageCodes = languages.map((language) => language.spreadsheetCode);
  const blockers = [];
  const warnings = [];
  const sourceByKey = new Map(sourceEntries.map((entry, index) => [entryKey(entry, index), entry]));
  const sourceBySimplified = new Map(sourceEntries.map((entry) => [entry.simplified, entry]));
  const sourceCharacters = new Set(sourceEntries.map((entry) => entry.simplified).join(""));
  const headerSet = new Set(release.headers);

  for (const field of requiredFixedFields) {
    if (!headerSet.has(field)) {
      addIssue(blockers, issue("missing_required_hsk_field", null, "", field, "required HSK field is missing from release headers"));
    }
  }

  for (const language of languageCodes) {
    if (!headerSet.has(language)) {
      addIssue(blockers, issue("missing_required_hsk_field", null, language, language, "required target-language word column is missing"));
    }
    if (!headerSet.has(`example_${language}`)) {
      addIssue(blockers, issue("missing_required_hsk_field", null, language, `example_${language}`, "required target-language example column is missing"));
    }
  }

  for (const header of release.headers) {
    if (forbiddenHeaderPatterns.some((pattern) => pattern.test(header))) {
      addIssue(blockers, issue("forbidden_target_transcription_column", null, "", header, "HSK target-language transcription/IPA/romanization column is out of scope"));
    }
  }

  for (const row of release.rows) {
    for (const field of requiredFixedFields) {
      if (isEffectivelyEmpty(row[field])) {
        addIssue(blockers, issue("missing_required_hsk_field", row, "", field, "required HSK field is empty"));
      }
    }

    const sourceRow = sourceByKey.get(rowKey(row)) ?? sourceBySimplified.get(row.simplified);
    const override = lookupCurated(overrides, row);
    const example = lookupCurated(examples, row);
    if (!sourceRow) {
      addIssue(warnings, issue("hsk_source_snapshot_missing", row, "ZH", "simplified", "simplified word is absent from HSK source snapshot"));
    }
    if (!override) {
      addIssue(blockers, issue("missing_required_hsk_field", row, "ZH", "pinyin", "missing curated card override for HSK source row"));
    }
    if (!example) {
      addIssue(blockers, issue("missing_required_hsk_field", row, "ZH", "example_zh", "missing curated example row for HSK source row"));
    }

    if (example && row.example_zh !== example.example_zh) {
      addIssue(blockers, issue("example_zh_mismatch", row, "ZH", "example_zh", "example_zh must match curated examples file", {
        expected: example.example_zh,
        actual: compactValue(row.example_zh),
      }));
    }
    if (override && row.pinyin !== override.pinyin) {
      addIssue(blockers, issue("pinyin_mismatch", row, "ZH", "pinyin", "word pinyin must match curated card override", {
        expected: override.pinyin,
        actual: compactValue(row.pinyin),
      }));
    }
    if (example && row.example_pinyin !== example.example_pinyin) {
      addIssue(blockers, issue("pinyin_mismatch", row, "ZH", "example_pinyin", "example pinyin must match curated examples file", {
        expected: example.example_pinyin,
        actual: compactValue(row.example_pinyin),
      }));
    }
    for (const field of ["pinyin", "example_pinyin"]) {
      if (hasPinyinToneNumber(row[field])) {
        addIssue(blockers, issue("pinyin_tone_numbers", row, "ZH", field, "Chinese pinyin must use tone marks, not tone numbers", {
          value: compactValue(row[field]),
        }));
      }
    }
    for (const char of Array.from(row.example_zh ?? "")) {
      if (/\p{Script=Han}/u.test(char) && !sourceCharacters.has(char)) {
        addIssue(warnings, issue("chinese_example_non_hsk_han", row, "ZH", "example_zh", `Chinese example contains a Han character not present in the HSK${hskLevel} source snapshot`, {
          char,
          value: compactValue(row.example_zh),
        }));
      }
    }

    const packRow = translationPack.translations[rowKey(row)] ?? translationPack.translations[row.simplified] ?? {};
    for (const [column, expected] of Object.entries(packRow)) {
      if (row[column] !== expected) {
        addIssue(blockers, issue("translation_pack_mismatch", row, column.startsWith("example_") ? column.replace(/^example_/u, "") : column, column, "translation pack value is stale or mismatched vs workbook", {
          expected: compactValue(expected),
          actual: compactValue(row[column]),
        }));
      }
    }

    for (const code of languageCodes) {
      const wordField = code;
      const exampleField = `example_${code}`;
      const wordValue = row[wordField];
      const exampleValue = row[exampleField];
      if (isEffectivelyEmpty(wordValue)) {
        addIssue(blockers, issue("missing_required_hsk_field", row, code, wordField, "missing target word translation"));
      }
      if (isEffectivelyEmpty(exampleValue)) {
        addIssue(blockers, issue("missing_required_hsk_field", row, code, exampleField, "missing target example translation"));
      }

      const wordScriptIssue = checkScriptPolicy(row, code, wordField, wordValue);
      if (wordScriptIssue) addIssue(blockers, wordScriptIssue);
      const exampleScriptIssue = checkScriptPolicy(row, code, exampleField, exampleValue);
      if (exampleScriptIssue) addIssue(blockers, exampleScriptIssue);

      if (code !== "EN" && code !== "EN-GB") {
        if (comparable(wordValue) === comparable(row.EN) && isLikelyEnglishPhrase(wordValue)) {
          addIssue(blockers, issue("english_fallback", row, code, wordField, "target word cell appears to be an English fallback", {
            value: compactValue(wordValue),
          }));
        } else if (comparable(wordValue) === comparable(row.EN)) {
          addIssue(warnings, issue("possible_english_loan_or_fallback", row, code, wordField, "target word equals EN gloss; review as loanword vs fallback", {
            value: compactValue(wordValue),
          }));
        }
      }

      const driftIssue = checkExampleDrift(row, code, exampleValue);
      if (driftIssue) addIssue(blockers, driftIssue);
    }
  }

  const auditRows = [];
  for (const row of release.rows) {
    for (const language of languages) {
      const code = language.spreadsheetCode;
      auditRows.push({
        set_id: releaseId,
        meaning_id: `hsk:${row.hsk_order}:${row.simplified}`,
        language_code: sourceLookupCode(language),
        spreadsheet_language_code: code,
        canonical_english: row.EN,
        native_word: row[code],
        target_example: row[`example_${code}`],
        example_text: row[`example_${code}`],
        hsk_simplified: row.simplified,
        hsk_order: row.hsk_order,
        example_zh: row.example_zh,
        example_pinyin: row.example_pinyin,
      });
    }
  }

  const sourceHints = await buildHskSourceHints(auditRows);

  const wordCandidateCounts = countBy(sourceHints.translationCandidates, (candidate) => candidate.language_code);
  const exampleCandidateCounts = countBy(sourceHints.exampleCollocationCandidates, (candidate) => candidate.language_code);
  const spellingWarningCounts = countBy(sourceHints.spellingSanity, (candidate) => candidate.language_code);

  for (const language of languages) {
    const code = language.spreadsheetCode;
    const lookupCode = sourceLookupCode(language);
    const wordCandidates = wordCandidateCounts.get(lookupCode) ?? 0;
    const exampleCandidates = exampleCandidateCounts.get(lookupCode) ?? 0;
    if (wordCandidates === 0 && exampleCandidates === 0) {
      addIssue(warnings, issue("no_source_candidates", null, code, "", "no indexed source candidates found for this HSK language in the current source cache"));
    }
    const spellingWarnings = spellingWarningCounts.get(lookupCode) ?? 0;
    if (spellingWarnings > 0) {
      addIssue(warnings, issue("spelling_sanity_partial", null, code, "", "Hunspell did not find exact display-form matches for some word cells; warning only", {
        count: spellingWarnings,
      }));
    }
  }

  const blockerCountsByLanguage = countBy(blockers, (item) => item.language || "");
  const warningCountsByLanguage = countBy(warnings, (item) => item.language || "");
  const summaryByLanguage = languages.map((language) => {
    const code = language.spreadsheetCode;
    const lookupCode = sourceLookupCode(language);
    const summary = {
      language: code,
      source_lookup_language: lookupCode,
      filled_word_cells_count: release.rows.filter((row) => !isEffectivelyEmpty(row[code])).length,
      filled_example_cells_count: release.rows.filter((row) => !isEffectivelyEmpty(row[`example_${code}`])).length,
      blockers: blockerCountsByLanguage.get(code) ?? 0,
      warnings: warningCountsByLanguage.get(code) ?? 0,
      source_candidate_count: wordCandidateCounts.get(lookupCode) ?? 0,
      example_candidate_count: exampleCandidateCounts.get(lookupCode) ?? 0,
      estimated_confidence_bucket: "",
    };
    summary.estimated_confidence_bucket = confidenceBucket(summary);
    return summary;
  });

  const report = {
    release_id: releaseId,
    generated_at: new Date().toISOString(),
    rule_version: ruleVersion,
    input_path: path.relative(process.cwd(), release.inputPath),
    input_format: release.inputFormat,
    rows_checked: release.rows.length,
    languages_checked: languages.length,
    translation_pack_files: translationPack.files,
    source_index_status: indexStatus,
    blocker_count: blockers.length,
    warning_count: warnings.length,
    source_candidate_count: sourceHints.translationCandidates.length,
    example_candidate_count: sourceHints.exampleCollocationCandidates.length,
    concept_sanity_count: sourceHints.conceptSanity.length,
    spelling_sanity_count: sourceHints.spellingSanity.length,
    summary_by_language: summaryByLanguage,
    blockers: blockers.slice(0, maxIssuesPerBucket),
    warnings: warnings.slice(0, maxIssuesPerBucket),
    source_candidates_sample: sampleCandidates(sourceHints.translationCandidates),
    example_candidates_sample: sampleCandidates(sourceHints.exampleCollocationCandidates),
    concept_sanity_sample: sampleCandidates(sourceHints.conceptSanity),
    spelling_sanity_sample: sampleCandidates(sourceHints.spellingSanity),
    notes: [
      "HSK source truth is the Chinese row: simplified/traditional/pinyin/example_zh/example_pinyin.",
      "EN gloss/example_EN are pivot fields for indexed source candidate lookup only.",
      "Indexed sources are candidate/sanity evidence only; source_partial/no_source/candidate mismatch are not blockers.",
      "Target-language transcription, IPA and romanization columns are out of scope for HSK.",
      "MT/Google Translate is not used as source truth by this audit.",
    ],
  };

  await fs.mkdir(qaDir, { recursive: true });
  const reportPath = path.join(qaDir, `${releaseId}_source_audit_${todayStamp()}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log(
    JSON.stringify(
      {
        release_id: releaseId,
        rows_checked: release.rows.length,
        languages_checked: languages.length,
        blockers: blockers.length,
        warnings: warnings.length,
        source_candidates: sourceHints.translationCandidates.length,
        example_candidates: sourceHints.exampleCollocationCandidates.length,
        report: path.relative(process.cwd(), reportPath),
      },
      null,
      2
    )
  );

  if (blockers.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
