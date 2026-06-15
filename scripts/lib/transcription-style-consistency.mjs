import { readFileSync } from "node:fs";

const styleProfileConfig = JSON.parse(
  readFileSync(new URL("../../config/transcription-style-profiles.json", import.meta.url), "utf8")
);

export const transcriptionStyleConsistencyRuleVersion = `${styleProfileConfig.version}:transcription-style-consistency-v3-current-decision-aware`;

const transcriptionStyleProfiles = styleProfileConfig.profiles ?? {};
const styleCheckedLanguages = new Set(Object.keys(transcriptionStyleProfiles));
const highRiskTranscriptionDecisionKeys = loadHighRiskTranscriptionDecisionKeys();
const myanmarScriptPattern = /\p{Script=Myanmar}/u;
const nativeScriptPattern =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Lao}\p{Script=Myanmar}\p{Script=Khmer}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Sinhala}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Cyrillic}\p{Script=Armenian}\p{Script=Georgian}]/u;
const kmIpaLikeSymbolPattern = /[ɑɒɔəɜɨɯɤɐʔɛ]/u;
const curlyApostrophePattern = /[’‘ʼ]/u;
const asciiApostrophePattern = /'/u;
const regexCache = new Map();

function compileRegex(pattern) {
  if (!regexCache.has(pattern)) {
    regexCache.set(pattern, new RegExp(pattern, "u"));
  }
  return regexCache.get(pattern);
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function loadHighRiskTranscriptionDecisionKeys() {
  const keys = new Set();
  try {
    const decisions = readFileSync(
      new URL("../../reference-sources/manual-decisions/high-risk-transcription-decisions.jsonl", import.meta.url),
      "utf8"
    );
    for (const line of decisions.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const decision = JSON.parse(line);
      const setId = normalizeText(decision.set_id);
      const languageCode = normalizeText(decision.language_code);
      const meaningId = normalizeText(decision.meaning_id);
      const nativeWord = normalizeText(decision.current_native_word);
      const transcription = normalizeText(decision.current_transcription);
      if (!setId || !languageCode || !meaningId || !nativeWord || !transcription) continue;
      keys.add(`${setId}::${languageCode}::${meaningId}::${nativeWord}::${transcription}`);
    }
  } catch {
    return keys;
  }
  return keys;
}

function rowSetId(row) {
  return normalizeText(row.set_id ?? row.setId);
}

function rowLanguageCode(row) {
  return normalizeText(row.language_code ?? row.languageCode);
}

function rowMeaningId(row) {
  return normalizeText(row.meaning_id ?? row.meaningId);
}

function rowDisplayWord(row) {
  return normalizeText(row.display_word ?? row.word_with_article_or_marker ?? row.native_word);
}

function rowNativeWord(row) {
  return normalizeText(row.native_word ?? row.word_with_article_or_marker ?? row.display_word);
}

function rowTranscription(row) {
  return normalizeText(row.transcription);
}

function normalizeNativeComponent(value) {
  return normalizeText(value).replace(/[\s\u200b\u200c\u200d\-‐‑‒–—]+/gu, "");
}

function transcriptionTokens(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[’‘ʼ]/gu, "'")
    .replace(/[:.'ʔ]+/gu, " ")
    .replace(/[‐‑‒–—-]+/gu, " ")
    .split(/[^\p{Letter}\p{Number}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function containsTokenSubsequence(haystack, needle) {
  if (needle.length === 0) return true;
  if (haystack.length < needle.length) return false;
  for (let index = 0; index <= haystack.length - needle.length; index += 1) {
    let matches = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[index + offset] !== needle[offset]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

function compactRow(row) {
  return {
    set_id: rowSetId(row),
    display_order: row.display_order ?? row.displayOrder ?? null,
    meaning_id: rowMeaningId(row),
    canonical_english: normalizeText(row.canonical_english ?? row.canonicalEnglish),
    language_code: rowLanguageCode(row),
    native_word: rowNativeWord(row),
    display_word: rowDisplayWord(row),
    transcription: rowTranscription(row),
    romanization_system: normalizeText(row.romanization_system ?? row.romanizationSystem),
  };
}

function hasCurrentValueTranscriptionDecision(row) {
  return highRiskTranscriptionDecisionKeys.has(
    `${row.set_id}::${row.language_code}::${row.meaning_id}::${row.native_word}::${row.transcription}`
  );
}

function addMixedApostropheFindings(group, blockers) {
  const rowsWithAscii = group.rows.filter((row) => asciiApostrophePattern.test(row.transcription));
  const rowsWithCurly = group.rows.filter((row) => curlyApostrophePattern.test(row.transcription));
  if (rowsWithAscii.length === 0 || rowsWithCurly.length === 0) return;

  blockers.push({
    set_id: group.set_id,
    language_code: group.language_code,
    issue_code: "mixed_apostrophe_style",
    severity: "fail",
    reason:
      "transcriptions mix straight apostrophe and curly apostrophe markers inside one language; normalize to one project style before final delivery",
    affected_rows: [...rowsWithAscii, ...rowsWithCurly].map(compactRow),
  });
}

function addProfileFindings(group, blockers) {
  const profile = transcriptionStyleProfiles[group.language_code];
  if (!profile) return;

  const issueRows = new Map();
  const addIssue = (issueCode, reason, row) => {
    if (!issueRows.has(issueCode)) {
      issueRows.set(issueCode, {
        reason,
        rows: [],
      });
    }
    issueRows.get(issueCode).rows.push(row);
  };

  const allowedPattern = profile.allowedPattern ? compileRegex(profile.allowedPattern) : null;
  for (const row of group.rows) {
    const transcription = row.transcription;
    if (!transcription) continue;

    if (profile.mustBeLowercase && transcription !== transcription.toLowerCase()) {
      addIssue(
        "profile_requires_lowercase",
        `${profile.label} requires lowercase project style; uppercase letters must not appear in final transcription`,
        row
      );
    }

    if (allowedPattern && !allowedPattern.test(transcription)) {
      addIssue(
        "profile_disallowed_character",
        `${profile.label} allows only this project character set: ${profile.description}`,
        row
      );
    }

    for (const forbidden of profile.forbiddenPatterns ?? []) {
      if (compileRegex(forbidden.pattern).test(transcription)) {
        addIssue(forbidden.code, forbidden.reason, row);
      }
    }
  }

  for (const [issueCode, issue] of issueRows) {
    blockers.push({
      set_id: group.set_id,
      language_code: group.language_code,
      issue_code: issueCode,
      severity: "fail",
      reason: issue.reason,
      profile_label: profile.label,
      affected_rows: issue.rows.map(compactRow),
    });
  }
}

function addMyComponentFindings(group, blockers) {
  if (group.language_code !== "MY") return;

  const componentRows = group.rows
    .map((row) => ({
      row,
      native_component: normalizeNativeComponent(row.native_word || row.display_word),
      transcription_tokens: transcriptionTokens(row.transcription),
    }))
    .filter(
      (candidate) =>
        myanmarScriptPattern.test(candidate.native_component) &&
        [...candidate.native_component].length >= 2 &&
        candidate.transcription_tokens.length > 0
    );

  for (const component of componentRows) {
    for (const target of group.rows) {
      if (target.meaning_id === component.row.meaning_id) continue;
      const targetNative = normalizeNativeComponent(target.native_word || target.display_word);
      if (!targetNative || targetNative === component.native_component) continue;
      if (!targetNative.includes(component.native_component)) continue;

      const targetTokens = transcriptionTokens(target.transcription);
      if (containsTokenSubsequence(targetTokens, component.transcription_tokens)) continue;
      const targetCompact = targetTokens.join("");
      const componentCompact = component.transcription_tokens.join("");
      if (componentCompact && targetCompact.includes(componentCompact)) continue;
      if (hasCurrentValueTranscriptionDecision(target)) continue;

      blockers.push({
        set_id: group.set_id,
        language_code: group.language_code,
        issue_code: "component_transcription_style_mismatch",
        severity: "fail",
        reason:
          "a Burmese native component appears in another row, but its romanized component does not appear there; this usually means MLCTS-style and learner-style romanization were mixed",
        component: compactRow(component.row),
        target: compactRow(target),
        affected_rows: [compactRow(component.row), compactRow(target)],
      });
    }
  }
}

function addKmStyleFindings(group, blockers) {
  if (group.language_code !== "KM") return;

  const affectedRows = group.rows.filter((row) => kmIpaLikeSymbolPattern.test(row.transcription));
  if (affectedRows.length === 0) return;

  blockers.push({
    set_id: group.set_id,
    language_code: group.language_code,
    issue_code: "km_practical_style_contains_ipa_like_symbols",
    severity: "fail",
    reason:
      "Khmer practical romanization should stay in one project style; IPA-like symbols such as ɑ/ə/ɛ/ʔ need repair or an explicit current-value style decision",
    affected_rows: affectedRows.map(compactRow),
  });
}

export function buildTranscriptionStyleConsistencyFindings(rows) {
  const groups = new Map();
  for (const rawRow of rows) {
    const row = compactRow(rawRow);
    if (!row.set_id || !row.language_code || !styleCheckedLanguages.has(row.language_code)) continue;
    if (!row.transcription || !nativeScriptPattern.test(row.native_word || row.display_word)) continue;

    const key = `${row.set_id}::${row.language_code}`;
    if (!groups.has(key)) {
      groups.set(key, {
        set_id: row.set_id,
        language_code: row.language_code,
        rows: [],
      });
    }
    groups.get(key).rows.push(row);
  }

  const blockers = [];
  for (const group of groups.values()) {
    addProfileFindings(group, blockers);
    addMixedApostropheFindings(group, blockers);
    addMyComponentFindings(group, blockers);
    addKmStyleFindings(group, blockers);
  }

  return {
    rule_version: transcriptionStyleConsistencyRuleVersion,
    checked_rows: [...groups.values()].reduce((sum, group) => sum + group.rows.length, 0),
    checked_languages: [...new Set([...groups.values()].map((group) => group.language_code))].sort(),
    blockers,
    warnings: [],
  };
}

export function formatTranscriptionStyleConsistencyBlocker(blocker) {
  const prefix = `${blocker.set_id} ${blocker.language_code} ${blocker.issue_code}`;
  if (blocker.issue_code === "component_transcription_style_mismatch") {
    return (
      `${prefix}: ${blocker.reason}; component ${blocker.component.meaning_id} ` +
      `"${blocker.component.native_word}" -> "${blocker.component.transcription}", target ` +
      `${blocker.target.meaning_id} "${blocker.target.native_word}" -> "${blocker.target.transcription}"`
    );
  }

  const sample = (blocker.affected_rows ?? [])
    .slice(0, 8)
    .map((row) => `${row.meaning_id}="${row.transcription}"`)
    .join("; ");
  return `${prefix}: ${blocker.reason}${sample ? `; ${sample}` : ""}`;
}
