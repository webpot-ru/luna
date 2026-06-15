import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { createGunzip } from "node:zlib";

const lookupRuleVersion = "high-risk-transcription-lookup-v5";
const manualDecisionRegistryPath =
  "reference-sources/manual-decisions/high-risk-transcription-decisions.jsonl";
const acceptedManualDecisionMethods = new Set([
  "component_source_exact",
  "normalized_exact",
  "manual_source_exact",
]);

const highRiskConfigs = {
  TH: {
    sourceId: "kaikki-thai",
    sourceLabel: "Kaikki Thai",
    rawPath: "reference-sources/raw/wiktionary-kaikki/kaikki.org-dictionary-Thai.jsonl.gz",
    cachePath: "reference-sources/cache/transcription-lookup/kaikki-thai-index.json",
    referenceSourceIds: [
      "thai-language-phonemic-transcription-page",
      "thai-language-tones-page",
      "sealang-ala-lc-thai-page",
      "loc-ala-lc-thai-source-doc",
    ],
  },
  LO: {
    sourceId: "kaikki-lao",
    sourceLabel: "Kaikki Lao",
    rawPath: "reference-sources/raw/wiktionary-kaikki/kaikki.org-dictionary-Lao.jsonl.gz",
    cachePath: "reference-sources/cache/transcription-lookup/kaikki-lao-index.json",
    referenceSourceIds: [
      "bgn-pcgn-lao-pdf",
      "sealang-lao-dictionary-top-page",
      "sealang-lao-dictionary-notes-page",
      "sealang-lao-ipa-help-page",
      "wiktionary-lao-transliteration-page",
      "lao2ipa-1.0.0",
      "loc-ala-lc-lao-source-doc",
    ],
  },
  MY: {
    sourceId: "kaikki-burmese",
    sourceLabel: "Kaikki Burmese",
    rawPath: "reference-sources/raw/wiktionary-kaikki/kaikki.org-dictionary-Burmese.jsonl.gz",
    cachePath: "reference-sources/cache/transcription-lookup/kaikki-burmese-index.json",
    referenceSourceIds: [
      "bgn-pcgn-burmese-pdf",
      "sealang-burmese-dictionary-top-page",
      "sealang-burmese-dictionary-notes-page",
      "sealang-burmese-ipa-help-page",
      "wiktionary-burmese-transliteration-page",
      "sealang-ala-lc-burmese-page",
      "python-myanmar-1.10.0",
      "mya2rom-master",
      "loc-ala-lc-burmese-source-doc",
    ],
  },
  KM: {
    sourceId: "kaikki-khmer",
    sourceLabel: "Kaikki Khmer",
    rawPath: "reference-sources/raw/wiktionary-kaikki/kaikki.org-dictionary-Khmer.jsonl.gz",
    cachePath: "reference-sources/cache/transcription-lookup/kaikki-khmer-index.json",
    referenceSourceIds: [
      "bgn-pcgn-khmer-pdf",
      "sealang-khmer-dictionary-top-page",
      "sealang-khmer-dictionary-notes-page",
      "sealang-khmer-ipa-help-page",
      "wiktionary-khmer-romanization-page",
      "sealang-ala-lc-khmer-page",
      "loc-ala-lc-khmer-source-doc",
    ],
  },
  HY: {
    sourceId: "kaikki-armenian",
    sourceLabel: "Kaikki Armenian",
    rawPath: "reference-sources/raw/wiktionary-kaikki/kaikki.org-dictionary-Armenian.jsonl.gz",
    cachePath: "reference-sources/cache/transcription-lookup/kaikki-armenian-index.json",
    referenceSourceIds: ["loc-ala-lc-armenian-source-doc", "cldr-48-core"],
  },
};

const highRiskLanguageCodes = new Set(Object.keys(highRiskConfigs));
const latinLetterPattern = /\p{Script=Latin}/u;
const nativeScriptPattern = /[\p{Script=Thai}\p{Script=Lao}\p{Script=Myanmar}\p{Script=Khmer}\p{Script=Armenian}]/u;
const loadedIndexCache = new Map();
let loadedManualDecisionCache = null;

const armenianBgnMap = new Map([
  ["Ա", "A"], ["ա", "a"],
  ["Բ", "B"], ["բ", "b"],
  ["Գ", "G"], ["գ", "g"],
  ["Դ", "D"], ["դ", "d"],
  ["Զ", "Z"], ["զ", "z"],
  ["Է", "E"], ["է", "e"],
  ["Ը", "Y"], ["ը", "y"],
  ["Թ", "T"], ["թ", "t"],
  ["Ժ", "Zh"], ["ժ", "zh"],
  ["Ի", "I"], ["ի", "i"],
  ["Լ", "L"], ["լ", "l"],
  ["Խ", "Kh"], ["խ", "kh"],
  ["Ծ", "Ts"], ["ծ", "ts"],
  ["Կ", "K"], ["կ", "k"],
  ["Հ", "H"], ["հ", "h"],
  ["Ձ", "Dz"], ["ձ", "dz"],
  ["Ղ", "Gh"], ["ղ", "gh"],
  ["Ճ", "Ch"], ["ճ", "ch"],
  ["Մ", "M"], ["մ", "m"],
  ["Յ", "Y"], ["յ", "y"],
  ["Ն", "N"], ["ն", "n"],
  ["Շ", "Sh"], ["շ", "sh"],
  ["Չ", "Ch"], ["չ", "ch"],
  ["Պ", "P"], ["պ", "p"],
  ["Ջ", "J"], ["ջ", "j"],
  ["Ռ", "Rr"], ["ռ", "rr"],
  ["Ս", "S"], ["ս", "s"],
  ["Վ", "V"], ["վ", "v"],
  ["Տ", "T"], ["տ", "t"],
  ["Ր", "R"], ["ր", "r"],
  ["Ց", "Ts"], ["ց", "ts"],
  ["Փ", "P"], ["փ", "p"],
  ["Ք", "K"], ["ք", "k"],
  ["Օ", "O"], ["օ", "o"],
  ["Ֆ", "F"], ["ֆ", "f"],
]);

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeForMatch(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[ʼ՚ʻ‘’`]/gu, "'")
    .replace(/\s+/g, " ");
}

function normalizeForDelimiterMatch(value) {
  return normalizeForMatch(value)
    .replace(/([.:])\s+/gu, "$1")
    .replace(/[‐‑‒–—-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePracticalRomanization(value) {
  return normalizeForDelimiterMatch(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[ɑɒ]/gu, "a")
    .replace(/[ɔ]/gu, "o")
    .replace(/[əɜɘ]/gu, "a")
    .replace(/[ɨɯ]/gu, "i")
    .replace(/[ʼ՚ʻ‘’`']/gu, "")
    .replace(/č/gu, "ch")
    .replace(/š/gu, "sh")
    .replace(/ǰ/gu, "j")
    .replace(/ġ/gu, "gh")
    .replace(/ñ/gu, "nh")
    .replace(/ṙ/gu, "rr")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSpacingFlexiblePracticalRomanization(value) {
  return normalizePracticalRomanization(value).replace(/\s+/g, "");
}

function normalizeKhmerPracticalSkeleton(value) {
  return normalizeForDelimiterMatch(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[ʼ՚ʻ‘’`']/gu, "")
    .replace(/[ɑɒɔəɜɘɨɯɤɐɛŭŏăĕ]/gu, "a")
    .replace(/ñ/gu, "nh")
    .replace(/[aeiouy]+/gu, "")
    .replace(/chh/gu, "c")
    .replace(/ch/gu, "c")
    .replace(/c/gu, "c")
    .replace(/kh/gu, "k")
    .replace(/ph/gu, "p")
    .replace(/th/gu, "t")
    .replace(/nh/gu, "n")
    .replace(/w/gu, "v")
    .replace(/\s+/g, "")
    .trim();
}

function transliterateArmenianWordBgn(word) {
  const chars = [...word.normalize("NFC")];
  let output = "";
  for (let index = 0; index < chars.length; index += 1) {
    const current = chars[index];
    const next = chars[index + 1] ?? "";
    const previous = chars[index - 1] ?? "";
    const atStart = index === 0;
    const previousIsVowel = /[ԱԵԷԸԻՈՕՒաեէըիոօւ]/u.test(previous);

    if ((current === "Ու" || current === "ու") || ((current === "Ո" || current === "ո") && (next === "Ւ" || next === "ւ"))) {
      output += current === "Ո" ? "U" : "u";
      index += current === "Ո" || current === "ո" ? 1 : 0;
      continue;
    }
    if (current === "և" || current === "եւ" || current === "եվ") {
      output += atStart || previousIsVowel ? "yev" : "ev";
      continue;
    }
    if (current === "Ե" || current === "ե") {
      if (atStart || previousIsVowel) output += current === "Ե" ? "Ye" : "ye";
      else output += current === "Ե" ? "E" : "e";
      continue;
    }
    if (current === "Ո" || current === "ո") {
      if (atStart) output += current === "Ո" ? "Vo" : "vo";
      else output += current === "Ո" ? "O" : "o";
      continue;
    }
    output += armenianBgnMap.get(current) ?? current;
  }
  return output;
}

function transliterateArmenianBgn(value) {
  return normalizeText(value)
    .split(/(\s+)/u)
    .map((part) => (part.trim() ? transliterateArmenianWordBgn(part) : part))
    .join("");
}

function evaluateArmenianBgnLookup(row, sourceIds) {
  const nativeWord = normalizeText(row.native_word ?? row.word_with_article_or_marker ?? row.display_word);
  const displayWord = normalizeText(row.word_with_article_or_marker ?? row.display_word ?? row.native_word);
  const lookupWord = nativeWord || displayWord;
  const transcription = normalizeText(row.transcription);
  const sourceValue = transliterateArmenianBgn(lookupWord);
  if (normalizePracticalRomanization(sourceValue) === normalizePracticalRomanization(transcription)) {
    return {
      applies: true,
      pass: true,
      confidence: "source_exact",
      source_match: "high_risk_hy_bgn_cldr",
      source_ids: sourceIds,
      source_value: sourceValue,
      checked_native_word: nativeWord,
      checked_display_word: displayWord,
      checked_transcription: transcription,
      issues: [],
    };
  }
  return {
    applies: true,
    pass: false,
    confidence: "conflict",
    source_match: "high_risk_hy_bgn_mismatch",
    source_ids: sourceIds,
    source_value: sourceValue,
    checked_native_word: nativeWord,
    checked_display_word: displayWord,
    checked_transcription: transcription,
    issues: [
      buildIssue(
        "fail",
        "high_risk_hy_bgn_mismatch",
        `HY transcription does not match CLDR BGN-style source value for ${lookupWord}: ${sourceValue}`
      ),
    ],
  };
}

function addCandidate(candidates, value, source) {
  const rawText = normalizeText(value);
  if (!rawText) return;
  for (const text of rawText.split(/\s+\|\s+/u).map((candidate) => candidate.trim()).filter(Boolean)) {
    if (!latinLetterPattern.test(text)) continue;
    if (nativeScriptPattern.test(text)) continue;
    if (/^classifier\b/iu.test(text)) continue;
    candidates.set(normalizeForMatch(text), { value: text, source });
  }
}

function addIpaCandidate(ipaCandidates, value, source) {
  const text = normalizeText(value);
  if (!text) return;
  ipaCandidates.set(text, { value: text, source });
}

function parseHeadTemplateRomanization(expansion) {
  const text = normalizeText(expansion);
  if (!text.includes("•")) return [];
  const matches = [...text.matchAll(/\(([^()]+)\)/gu)];
  return matches.map((match) => match[1]).filter(Boolean);
}

function extractEntrySummary(entry) {
  const candidates = new Map();
  const ipaCandidates = new Map();
  const glosses = [];
  const pos = new Set();

  if (entry.pos) pos.add(entry.pos);

  for (const form of entry.forms ?? []) {
    if (Array.isArray(form.tags) && form.tags.includes("romanization")) {
      addCandidate(candidates, form.form, "forms.romanization");
    }
    if (form.roman) addCandidate(candidates, form.roman, "forms.roman");
  }

  for (const head of entry.head_templates ?? []) {
    for (const candidate of parseHeadTemplateRomanization(head.expansion)) {
      addCandidate(candidates, candidate, "head_template");
    }
  }

  for (const sound of entry.sounds ?? []) {
    const rawTags = (sound.raw_tags ?? []).map((tag) => String(tag).toLowerCase());
    const tags = (sound.tags ?? []).map((tag) => String(tag).toLowerCase());
    if (
      sound.roman &&
      (rawTags.some((tag) => tag.includes("paiboon")) || tags.includes("romanization"))
    ) {
      addCandidate(candidates, sound.roman, "sounds.roman");
    }
    if (sound.ipa) addIpaCandidate(ipaCandidates, sound.ipa, "sounds.ipa");
  }

  for (const sense of entry.senses ?? []) {
    for (const gloss of sense.glosses ?? []) {
      const text = normalizeText(gloss);
      if (text && glosses.length < 8) glosses.push(text);
    }
  }

  return {
    word: normalizeText(entry.word),
    candidates: [...candidates.values()],
    ipa_candidates: [...ipaCandidates.values()],
    glosses,
    pos: [...pos],
  };
}

function mergeEntrySummaries(existing, next) {
  const candidates = new Map((existing.candidates ?? []).map((candidate) => [normalizeForMatch(candidate.value), candidate]));
  const ipaCandidates = new Map((existing.ipa_candidates ?? []).map((candidate) => [candidate.value, candidate]));
  const glosses = [...(existing.glosses ?? [])];
  const pos = new Set(existing.pos ?? []);

  for (const candidate of next.candidates ?? []) candidates.set(normalizeForMatch(candidate.value), candidate);
  for (const candidate of next.ipa_candidates ?? []) ipaCandidates.set(candidate.value, candidate);
  for (const gloss of next.glosses ?? []) {
    if (!glosses.includes(gloss) && glosses.length < 12) glosses.push(gloss);
  }
  for (const value of next.pos ?? []) pos.add(value);

  return {
    word: existing.word,
    entries: (existing.entries ?? 1) + 1,
    candidates: [...candidates.values()],
    ipa_candidates: [...ipaCandidates.values()],
    glosses,
    pos: [...pos],
  };
}

async function buildKaikkiIndex(config) {
  const sourceInfo = await stat(config.rawPath);
  const entries = {};
  const stream = createReadStream(config.rawPath).pipe(createGunzip());
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of lines) {
    if (!line.trim()) continue;
    const entry = JSON.parse(line);
    const summary = extractEntrySummary(entry);
    if (!summary.word) continue;
    entries[summary.word] = entries[summary.word]
      ? mergeEntrySummaries(entries[summary.word], summary)
      : { ...summary, entries: 1 };
  }

  const index = {
    index_version: lookupRuleVersion,
    source_id: config.sourceId,
    source_label: config.sourceLabel,
    source_path: config.rawPath,
    source_size: sourceInfo.size,
    source_mtime_ms: sourceInfo.mtimeMs,
    generated_at: new Date().toISOString(),
    entries,
  };

  await mkdir(path.dirname(config.cachePath), { recursive: true });
  await writeFile(config.cachePath, JSON.stringify(index), "utf8");
  return index;
}

async function loadKaikkiIndex(config) {
  if (loadedIndexCache.has(config.sourceId)) return loadedIndexCache.get(config.sourceId);

  const sourceInfo = await stat(config.rawPath);
  try {
    const cached = JSON.parse(await readFile(config.cachePath, "utf8"));
    if (
      cached.index_version === lookupRuleVersion &&
      cached.source_size === sourceInfo.size &&
      cached.source_mtime_ms === sourceInfo.mtimeMs
    ) {
      loadedIndexCache.set(config.sourceId, cached);
      return cached;
    }
  } catch {
    // Missing or stale cache is expected; rebuild from the ignored raw source.
  }
  const rebuilt = await buildKaikkiIndex(config);
  loadedIndexCache.set(config.sourceId, rebuilt);
  return rebuilt;
}

function candidateValues(entry) {
  return (entry?.candidates ?? []).map((candidate) => candidate.value);
}

function compactSourceEntry(entry) {
  if (!entry) return null;
  const candidates = entry.candidates ?? [];
  return {
    word: entry.word,
    entries: entry.entries,
    candidates: candidates.slice(0, 12).map((candidate) => candidate.value),
    candidate_sources: [...new Set(candidates.map((candidate) => candidate.source))].sort(),
    ipa_candidates: (entry.ipa_candidates ?? []).slice(0, 4).map((candidate) => candidate.value),
    pos: entry.pos ?? [],
  };
}

function buildIssue(severity, code, detail) {
  return { severity, code, detail };
}

function decisionKey(row) {
  return [
    row.set_id ?? row.setId,
    row.meaning_id ?? row.meaningId,
    row.language_code ?? row.languageCode,
  ].join("::");
}

function parseSourceIds(value) {
  if (Array.isArray(value)) return value.map((sourceId) => normalizeText(sourceId)).filter(Boolean);
  return normalizeText(value)
    .split(/[|,]/u)
    .map((sourceId) => sourceId.trim())
    .filter(Boolean);
}

async function loadManualDecisions() {
  if (loadedManualDecisionCache) return loadedManualDecisionCache;
  const decisions = new Map();
  try {
    const content = await readFile(manualDecisionRegistryPath, "utf8");
    for (const [index, rawLine] of content.split(/\r?\n/u).entries()) {
      const line = rawLine.trim();
      if (!line) continue;
      const row = JSON.parse(line);
      const key = decisionKey(row);
      if (!key || key.includes("undefined")) {
        throw new Error(`Line ${index + 1}: set_id, meaning_id and language_code are required`);
      }
      if (decisions.has(key)) {
        throw new Error(`Line ${index + 1}: duplicate high-risk transcription decision for ${key}`);
      }
      decisions.set(key, row);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  loadedManualDecisionCache = decisions;
  return decisions;
}

function validateManualDecision(decision, row, manifestSourceIds) {
  const sourceIds = parseSourceIds(decision.source_ids);
  const checkedNativeWord = normalizeText(row.native_word ?? row.word_with_article_or_marker ?? row.display_word);
  const checkedDisplayWord = normalizeText(row.word_with_article_or_marker ?? row.display_word ?? row.native_word);
  const checkedTranscription = normalizeText(row.transcription);
  const expectedNativeWord = normalizeText(decision.current_native_word);
  const expectedDisplayWord = normalizeText(decision.current_display_word);
  const expectedTranscription = normalizeText(decision.current_transcription);
  const sourceConfidence = normalizeText(decision.source_confidence);
  const decisionMethod = normalizeText(decision.decision_method);
  const sourceNote = normalizeText(decision.source_note);
  const issues = [];

  if (expectedNativeWord !== checkedNativeWord) {
    issues.push(
      buildIssue(
        "fail",
        "high_risk_manual_decision_stale",
        `Manual decision native_word is stale: decision="${expectedNativeWord}", current="${checkedNativeWord}"`
      )
    );
  }
  if (expectedDisplayWord !== checkedDisplayWord) {
    issues.push(
      buildIssue(
        "fail",
        "high_risk_manual_decision_stale",
        `Manual decision display word is stale: decision="${expectedDisplayWord}", current="${checkedDisplayWord}"`
      )
    );
  }
  if (expectedTranscription !== checkedTranscription) {
    issues.push(
      buildIssue(
        "fail",
        "high_risk_manual_decision_stale",
        `Manual decision transcription is stale: decision="${expectedTranscription}", current="${checkedTranscription}"`
      )
    );
  }
  if (sourceConfidence !== "source_exact") {
    issues.push(
      buildIssue(
        "fail",
        "high_risk_manual_decision_not_final_ready",
        `Manual decision source_confidence must be source_exact, got "${sourceConfidence}"`
      )
    );
  }
  if (!acceptedManualDecisionMethods.has(decisionMethod)) {
    issues.push(
      buildIssue(
        "fail",
        "high_risk_manual_decision_invalid_method",
        `Manual decision method is not accepted: ${decisionMethod}`
      )
    );
  }
  if (sourceIds.length === 0) {
    issues.push(buildIssue("fail", "high_risk_manual_decision_missing_source", "Manual decision source_ids are required"));
  }
  for (const sourceId of sourceIds) {
    if (!manifestSourceIds.has(sourceId)) {
      issues.push(
        buildIssue(
          "fail",
          "high_risk_manual_decision_unknown_source",
          `Manual decision source_id is not in the reference manifest: ${sourceId}`
        )
      );
    }
  }
  if (!sourceNote) {
    issues.push(buildIssue("fail", "high_risk_manual_decision_missing_note", "Manual decision source_note is required"));
  }

  return {
    pass: issues.length === 0,
    issues,
    sourceIds,
    sourceConfidence,
    decisionMethod,
    sourceNote,
    checkedNativeWord,
    checkedDisplayWord,
    checkedTranscription,
  };
}

export function isHighRiskTranscriptionLookupLanguage(languageCode) {
  return highRiskLanguageCodes.has(languageCode);
}

export function highRiskTranscriptionLookupLanguageCodes() {
  return [...highRiskLanguageCodes];
}

export async function evaluateHighRiskTranscriptionLookup(row, options = {}) {
  const languageCode = row.language_code ?? row.languageCode;
  const config = highRiskConfigs[languageCode];
  if (!config) return { applies: false };

  const manifestSourceIds = options.manifestSourceIds ?? new Set();
  const manualDecisions = options.manualDecisions ?? (await loadManualDecisions());
  const manualDecision = manualDecisions.get(decisionKey(row));
  if (manualDecision) {
    const decision = validateManualDecision(manualDecision, row, manifestSourceIds);
    if (!decision.pass) {
      return {
        applies: true,
        pass: false,
        confidence: "conflict",
        source_match: "high_risk_manual_decision_invalid_or_stale",
        source_ids: decision.sourceIds,
        source_value: normalizeText(manualDecision.source_value),
        checked_native_word: decision.checkedNativeWord,
        checked_display_word: decision.checkedDisplayWord,
        checked_transcription: decision.checkedTranscription,
        issues: decision.issues,
        source_decision: manualDecision,
      };
    }
    return {
      applies: true,
      pass: true,
      confidence: "source_exact",
      source_match: `high_risk_manual_${decision.decisionMethod}`,
      source_ids: decision.sourceIds,
      source_value: normalizeText(manualDecision.source_value) || decision.checkedTranscription,
      checked_native_word: decision.checkedNativeWord,
      checked_display_word: decision.checkedDisplayWord,
      checked_transcription: decision.checkedTranscription,
      issues: [],
      source_decision: manualDecision,
    };
  }

  const sourceIds = [config.sourceId, ...config.referenceSourceIds];
  const missingSourceIds = sourceIds.filter((sourceId) => !manifestSourceIds.has(sourceId));
  if (missingSourceIds.length > 0) {
    return {
      applies: true,
      pass: false,
      confidence: "no_source",
      source_match: "high_risk_missing_manifest_source",
      source_ids: sourceIds,
      source_value: "",
      issues: [
        buildIssue(
          "fail",
          "high_risk_missing_manifest_source",
          `Missing high-risk source id(s): ${missingSourceIds.join(", ")}`
        ),
      ],
    };
  }

  if (languageCode === "HY") {
    return evaluateArmenianBgnLookup(row, sourceIds);
  }

  const nativeWord = normalizeText(row.native_word ?? row.word_with_article_or_marker ?? row.display_word);
  const displayWord = normalizeText(row.word_with_article_or_marker ?? row.display_word ?? row.native_word);
  const lookupWord = nativeWord || displayWord;
  const transcription = normalizeText(row.transcription);
  let index;
  try {
    index = await loadKaikkiIndex(config);
  } catch (error) {
    return {
      applies: true,
      pass: false,
      confidence: "no_source",
      source_match: "high_risk_raw_source_unavailable",
      source_ids: sourceIds,
      source_value: "",
      checked_native_word: nativeWord,
      checked_display_word: displayWord,
      checked_transcription: transcription,
      issues: [
        buildIssue(
          "fail",
          "high_risk_raw_source_unavailable",
          `${languageCode} high-risk local source is unavailable or unreadable: ${config.rawPath} (${error.message})`
        ),
      ],
    };
  }
  const entry = index.entries[lookupWord];

  if (!entry) {
    return {
      applies: true,
      pass: false,
      confidence: "source_partial",
      source_match: "high_risk_exact_native_word_missing",
      source_ids: sourceIds,
      source_value: "",
      checked_native_word: nativeWord,
      checked_display_word: displayWord,
      checked_transcription: transcription,
      issues: [
        buildIssue(
          "fail",
          "high_risk_exact_native_word_missing",
          `${languageCode} native/display word was not found as an exact headword in ${config.sourceLabel}: ${lookupWord}`
        ),
      ],
    };
  }

  const candidates = candidateValues(entry);
  if (candidates.length === 0) {
    return {
      applies: true,
      pass: false,
      confidence: "source_partial",
      source_match: "high_risk_exact_source_has_no_romanization_candidate",
      source_ids: sourceIds,
      source_value: "",
      checked_native_word: nativeWord,
      checked_display_word: displayWord,
      checked_transcription: transcription,
      source_entry: compactSourceEntry(entry),
      issues: [
        buildIssue(
          "fail",
          "high_risk_exact_source_has_no_romanization_candidate",
          `${languageCode} exact source entry has no romanization candidate: ${lookupWord}`
        ),
      ],
    };
  }

  const normalizedTranscription = normalizeForMatch(transcription);
  const matchedCandidate = (entry.candidates ?? []).find(
    (candidate) => normalizeForMatch(candidate.value) === normalizedTranscription
  );
  const delimiterMatchedCandidate = (entry.candidates ?? []).find(
    (candidate) => normalizeForDelimiterMatch(candidate.value) === normalizeForDelimiterMatch(transcription)
  );
  const practicalMatchedCandidate =
    languageCode === "KM"
      ? (entry.candidates ?? []).find(
          (candidate) =>
            normalizeSpacingFlexiblePracticalRomanization(candidate.value) ===
            normalizeSpacingFlexiblePracticalRomanization(transcription)
        )
      : languageCode === "MY"
        ? (entry.candidates ?? []).find(
            (candidate) =>
              normalizeSpacingFlexiblePracticalRomanization(candidate.value) ===
              normalizeSpacingFlexiblePracticalRomanization(transcription)
          )
        : null;
  const khmerSkeletonMatchedCandidate =
    languageCode === "KM"
      ? (entry.candidates ?? []).find(
          (candidate) =>
            normalizeKhmerPracticalSkeleton(candidate.value) === normalizeKhmerPracticalSkeleton(transcription)
        )
      : null;

  if (!matchedCandidate && !delimiterMatchedCandidate && !practicalMatchedCandidate && !khmerSkeletonMatchedCandidate) {
    if (languageCode === "LO") {
      return {
        applies: true,
        pass: false,
        confidence: "source_partial",
        source_match: "high_risk_lao_library_romanization_variant",
        source_ids: sourceIds,
        source_value: candidates.slice(0, 8).join(" | "),
        checked_native_word: nativeWord,
        checked_display_word: displayWord,
        checked_transcription: transcription,
        source_entry: compactSourceEntry(entry),
        issues: [
          buildIssue(
            "fail",
            "high_risk_lao_library_romanization_variant",
            `${languageCode} exact source candidate(s) for ${lookupWord} use library/source romanization that may be tone-less or not LunaCards learner style: ${candidates
              .slice(0, 8)
              .join(" | ")}`
          ),
        ],
      };
    }
    return {
      applies: true,
      pass: false,
      confidence: "conflict",
      source_match: "high_risk_transcription_candidate_mismatch",
      source_ids: sourceIds,
      source_value: candidates.slice(0, 8).join(" | "),
      checked_native_word: nativeWord,
      checked_display_word: displayWord,
      checked_transcription: transcription,
      source_entry: compactSourceEntry(entry),
      issues: [
        buildIssue(
          "fail",
          "high_risk_transcription_candidate_mismatch",
          `${languageCode} transcription does not match exact source candidate(s) for ${lookupWord}: ${candidates
            .slice(0, 8)
            .join(" | ")}`
        ),
      ],
    };
  }

  return {
    applies: true,
    pass: true,
    confidence: "source_exact",
    source_match: matchedCandidate
      ? `high_risk_exact_${config.sourceId}`
      : delimiterMatchedCandidate
        ? `high_risk_delimiter_normalized_${config.sourceId}`
        : practicalMatchedCandidate
          ? `high_risk_practical_normalized_${config.sourceId}`
          : `high_risk_practical_skeleton_${config.sourceId}`,
    source_ids: sourceIds,
    source_value: (matchedCandidate ?? delimiterMatchedCandidate ?? practicalMatchedCandidate ?? khmerSkeletonMatchedCandidate)
      .value,
    checked_native_word: nativeWord,
    checked_display_word: displayWord,
    checked_transcription: transcription,
    source_entry: compactSourceEntry(entry),
    issues: [],
  };
}

export async function buildHighRiskTranscriptionLookupFindings(rows, options = {}) {
  const blockers = [];
  const passes = [];
  const skipped = [];
  const byLanguage = new Map();

  for (const row of rows) {
    const languageCode = row.language_code ?? row.languageCode;
    const result = await evaluateHighRiskTranscriptionLookup(row, options);
    if (!result.applies) {
      skipped.push(row);
      continue;
    }

    const finding = {
      set_id: row.set_id ?? row.setId,
      meaning_id: row.meaning_id ?? row.meaningId,
      canonical_english: row.canonical_english ?? row.canonicalEnglish,
      language_code: languageCode,
      display_word: result.checked_display_word ?? row.word_with_article_or_marker ?? row.display_word ?? row.native_word,
      native_word: result.checked_native_word ?? row.native_word,
      transcription: result.checked_transcription ?? row.transcription,
      confidence: result.confidence,
      source_match: result.source_match,
      source_ids: result.source_ids,
      source_value: result.source_value,
      source_entry: result.source_entry,
      source_decision: result.source_decision,
      issues: result.issues,
    };

    const summary = byLanguage.get(languageCode) ?? {
      language_code: languageCode,
      rows: 0,
      passes: 0,
      source_partial: 0,
      conflict: 0,
      no_source: 0,
    };
    summary.rows += 1;
    if (result.pass) summary.passes += 1;
    else summary[result.confidence] = (summary[result.confidence] ?? 0) + 1;
    byLanguage.set(languageCode, summary);

    if (result.pass) passes.push(finding);
    else blockers.push(finding);
  }

  return {
    blockers,
    passes,
    skipped,
    byLanguage: [...byLanguage.values()].sort((a, b) => a.language_code.localeCompare(b.language_code)),
  };
}

export function formatHighRiskTranscriptionLookupBlocker(finding) {
  const issueText = (finding.issues ?? [])
    .filter((issue) => issue.severity === "fail")
    .map((issue) => `${issue.code}: ${issue.detail}`)
    .join("; ");
  return [
    finding.set_id,
    finding.language_code,
    finding.meaning_id,
    `confidence=${finding.confidence}`,
    `display="${finding.display_word}"`,
    `transcription="${finding.transcription}"`,
    issueText || "high-risk lookup did not produce final-ready source_exact evidence",
  ].join(" ");
}
