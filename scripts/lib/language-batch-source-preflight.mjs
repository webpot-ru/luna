import {
  buildArticleGenderMarkerFindings,
  formatArticleGenderMarkerFinding,
} from "./article-gender-marker-consistency.mjs";
import { performance } from "node:perf_hooks";
import {
  buildBatchEntryCrossLanguageBlockers,
  buildEntryCrossLanguageFindings,
  formatEntryCrossLanguageBlocker,
} from "./entry-cross-language-fallbacks.mjs";
import {
  buildIpaTranscriptionSanityFindings,
  formatIpaTranscriptionSanityFinding,
} from "./ipa-transcription-sanity.mjs";
import {
  buildScriptLanguageIdentityFindings,
  formatScriptLanguageIdentityFinding,
} from "./script-language-identity.mjs";
import {
  buildSemanticGranularityFindings,
  formatSemanticGranularityFinding,
} from "./semantic-granularity.mjs";
import {
  buildTranscriptionSourceBackingFindings,
  formatTranscriptionSourceBackingBlocker,
} from "./source-backed-transcriptions.mjs";
import {
  buildToolSourceBatchContext,
  buildToolSourceCandidatesForRow,
  candidateDiffersFromCurrent,
} from "./tool-source-adapters.mjs";
import {
  buildDeckProfileDraftFindings,
  highRiskGrammarLanguageCodes,
  resolveDeckProfileContext,
} from "./deck-profile-policy.mjs";
import {
  buildIntraLanguageTranscriptionCollapseFindings,
  validateTranscriptionShape,
} from "./transcription-shape.mjs";
import {
  buildTranscriptionStyleConsistencyFindings,
  formatTranscriptionStyleConsistencyBlocker,
} from "./transcription-style-consistency.mjs";
import { buildTranslationSourceCoverageFindings } from "./translation-source-coverage.mjs";
import { warningRequiresDecision } from "./source-preflight-warning-decisions.mjs";
import { buildBulkSourceHintsForRows } from "./bulk-source-indexes.mjs";
import {
  isOfficialDictionaryAdapter,
  isStrongDictionaryAdapter,
  isWeakTranslationLanguage,
  weakLanguageRiskFor,
} from "./weak-language-quality-policy.mjs";
import {
  validateCjkExampleSpacing,
} from "./cjk-example-spacing.mjs";
import { validateThaiExampleSpacing } from "./thai-example-spacing.mjs";
import { validateSoutheastAsianExampleSpacing } from "./southeast-asian-example-spacing.mjs";
import { validateActionExampleSurface } from "./action-example-surface.mjs";
import { validateExampleSurfaceGrammar } from "./example-surface-grammar.mjs";
import { validateExampleNaturalness } from "./example-naturalness.mjs";

export const languageBatchSourcePreflightRuleVersion =
  "language-batch-source-preflight-v13-example-naturalness";

const numberMetaTemplateHeads = [
  "number",
  "nombre",
  "número",
  "numero",
  "die zahl",
  "zahl",
  "число",
  "числото",
  "broj",
  "số",
  "nomor",
  "angka",
  "număr",
  "numar",
  "sayısı",
  "say",
  "liczba",
  "tal",
  "tall",
  "getal",
  "nummer",
];

const genericMetaTemplateHeadsByLanguage = new Map([
  ["EN", ["word", "term", "meaning", "translation", "label"]],
  ["EN-GB", ["word", "term", "meaning", "translation", "label"]],
  ["ES", ["palabra", "significado", "traduccion", "traducción"]],
  ["ES-419", ["palabra", "significado", "traduccion", "traducción"]],
  ["FR", ["mot", "terme"]],
  ["DE", ["wort", "begriff", "bedeutung"]],
  ["IT", ["parola", "significato"]],
  ["RU", ["слово", "значение", "перевод"]],
]);

function genericMetaTemplateHeadsForLanguage(languageCode) {
  return genericMetaTemplateHeadsByLanguage.get(languageCode) ?? [];
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeComparable(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function rowLine(row, index) {
  return row.__line ?? row.line ?? index + 2;
}

function rowSetId(row) {
  return row.set_id ?? row.setId ?? "";
}

function rowMeaningId(row) {
  return row.meaning_id ?? row.meaningId ?? "";
}

function rowLanguageCode(row) {
  return row.language_code ?? row.languageCode ?? "";
}

function rowDisplayWord(row) {
  return row.word_with_article_or_marker ?? row.display_word ?? row.native_word ?? "";
}

function rowExampleText(row) {
  return row.example_text ?? row.target_example ?? row.example ?? "";
}

function makeFinding(row, index, severity, code, detail, extra = {}) {
  return {
    severity,
    code,
    set_id: rowSetId(row),
    line: rowLine(row, index),
    meaning_id: rowMeaningId(row),
    language_code: rowLanguageCode(row),
    field: extra.field ?? null,
    detail,
    native_word: row.native_word ?? "",
    display_word: rowDisplayWord(row),
    transcription: row.transcription ?? "",
    source_ids: extra.source_ids ?? [],
    candidates: extra.candidates ?? [],
  };
}

function isNumberHeavyRow(row) {
  const setId = rowSetId(row);
  if (/numbers?_counting|counting|number/i.test(setId)) return true;
  const profiles = row.deck_profile ?? row.deck_profiles ?? "";
  if (/number_quantity/i.test(String(profiles))) return true;
  if (row.expected_grammatical_number || row.number_grammar_expected) return true;
  const scene = typeof row.semantic_scene === "string" ? row.semantic_scene : JSON.stringify(row.semantic_scene ?? "");
  return /\b(number|count|total|first|second|third|cardinal|ordinal)\b/i.test(`${row.canonical_english ?? ""} ${scene}`);
}

function buildRiskProfile(rows, deckProfileContext) {
  const languages = [...new Set(rows.map((row) => row.language_code).filter(Boolean))].sort();
  const numberHeavy = rows.some(isNumberHeavyRow);
  const highRiskLanguageCount = rows.filter((row) => highRiskGrammarLanguageCodes.has(row.language_code)).length;
  const weakLanguageCount = rows.filter((row) => isWeakTranslationLanguage(row.language_code)).length;
  const requiresSingleLanguageBatch =
    numberHeavy || highRiskLanguageCount > 0 || weakLanguageCount > 0 || deckProfileContext.policy.requires_single_language_batch;
  return {
    number_heavy: numberHeavy,
    deck_profile: deckProfileContext.deck_profile,
    risk_flags: deckProfileContext.risk_flags,
    profile_requires_single_language_batch: deckProfileContext.policy.requires_single_language_batch,
    high_risk_language_count: highRiskLanguageCount,
    weak_language_count: weakLanguageCount,
    requires_single_language_batch: requiresSingleLanguageBatch,
    requires_warning_decisions: requiresSingleLanguageBatch,
    language_count: languages.length,
  };
}

function isNumberLexicalScene(row) {
  const canonicalExample = normalizeComparable(row.canonical_example_en ?? "");
  const canonicalEnglish = normalizeComparable(row.canonical_english ?? "");
  return canonicalEnglish === "number" || canonicalExample === "the number is on the card";
}

function isLexicalMetaScene(row) {
  const canonicalExample = normalizeComparable(row.canonical_example_en ?? "");
  const canonicalEnglish = normalizeComparable(row.canonical_english ?? "");
  if (["word", "term", "meaning", "translation", "number", "name", "label"].includes(canonicalEnglish)) {
    return true;
  }
  return /^(the )?(word|term|meaning|translation|number|name|label)\b/u.test(canonicalExample);
}

function hasMetaTemplateExample(text, heads) {
  const comparable = normalizeComparable(text);
  if (!comparable) return false;
  return heads.some((head) => comparable === head || comparable.startsWith(`${head} `));
}

function buildDraftExampleSceneFindings(row, index) {
  const findings = [];
  const exampleText = normalizeText(rowExampleText(row));
  if (!exampleText) return findings;

  const languageCode = rowLanguageCode(row);
  const canonicalExample = normalizeText(row.canonical_example_en);
  if (languageCode !== "EN" && languageCode !== "EN-GB" && canonicalExample) {
    if (normalizeComparable(exampleText) === normalizeComparable(canonicalExample)) {
      findings.push(
        makeFinding(
          row,
          index,
          "blocker",
          "draft_example_scene_alignment",
          "Target example is an English fallback instead of a localized scene-preserving example.",
          { field: "example_text" }
        )
      );
    }
  }

  if (
    !isLexicalMetaScene(row) &&
    hasMetaTemplateExample(exampleText, genericMetaTemplateHeadsForLanguage(languageCode))
  ) {
    findings.push(
      makeFinding(
        row,
        index,
        "blocker",
        "draft_example_scene_alignment",
        "Draft example uses a generic word/meaning meta-template instead of preserving the canonical example scene.",
        { field: "example_text" }
      )
    );
  }

  if (
    isNumberHeavyRow(row) &&
    !isNumberLexicalScene(row) &&
    hasMetaTemplateExample(exampleText, numberMetaTemplateHeads)
  ) {
    findings.push(
      makeFinding(
        row,
        index,
        "blocker",
        "draft_example_scene_alignment",
        "Number-heavy draft example uses a meta-template instead of preserving the canonical example scene.",
        { field: "example_text" }
      )
    );
  }

  if (isNumberHeavyRow(row) && !canonicalExample && !row.semantic_scene) {
    findings.push(
      makeFinding(
        row,
        index,
        "warning",
        "draft_example_scene_not_checkable",
        "Draft example scene cannot be checked before import because canonical_example_en/semantic_scene is unavailable.",
        { field: "example_text" }
      )
    );
  }

  return findings;
}

function buildExampleSceneCandidate(row) {
  const targetExample = normalizeText(rowExampleText(row));
  const canonicalExample = normalizeText(row.canonical_example_en);
  const proofFields = [
    "scene_slot_proof",
    "semantic_scene_proof",
    "target_example_lexical_anchor_proof",
    "number_example_grammar_proof",
    "profile_qa_proof",
  ];
  const proofValues = {};
  for (const field of proofFields) {
    if (row[field]) proofValues[field] = row[field];
  }
  return {
    set_id: rowSetId(row),
    line: row.__line ?? row.line ?? null,
    meaning_id: rowMeaningId(row),
    language_code: rowLanguageCode(row),
    canonical_example_en: canonicalExample,
    target_example: targetExample,
    semantic_scene: row.semantic_scene ?? null,
    proof_present: Object.keys(proofValues).length > 0,
    proof_fields: proofValues,
    scene_checkable: Boolean(canonicalExample || row.semantic_scene),
  };
}

function buildExternalMtSanity(row) {
  const suggestion = normalizeText(
    row.external_mt_suggestion ??
      row.external_mt_native_word ??
      row.google_translate_suggestion ??
      row.mt_suggestion
  );
  const provider = normalizeText(row.external_mt_provider ?? row.mt_provider ?? "");
  if (!suggestion) return null;
  const current = normalizeText(row.native_word);
  const agrees = normalizeComparable(suggestion) === normalizeComparable(current);
  return {
    set_id: rowSetId(row),
    line: row.__line ?? row.line ?? null,
    meaning_id: rowMeaningId(row),
    language_code: rowLanguageCode(row),
    field: "native_word",
    provider: provider || "external_mt",
    current_draft: current,
    suggestion,
    agreement: agrees ? "agreement" : "disagreement",
    risk_reason: agrees
      ? "External MT suggestion matches the current draft after loose normalization; this is sanity signal only."
      : "External MT suggestion differs from the current draft; this is report-only unless another source/rule gate produces a blocker.",
    final_evidence: false,
  };
}

function buildMtAgreementScore(externalMtSanity) {
  const score = {
    agreement: 0,
    disagreement: 0,
    no_signal: 0,
    by_language: {},
  };
  for (const row of externalMtSanity) {
    const agreement = row.agreement === "agreement" ? "agreement" : "disagreement";
    score[agreement] += 1;
    const languageCode = row.language_code || "unknown";
    score.by_language[languageCode] ??= { agreement: 0, disagreement: 0 };
    score.by_language[languageCode][agreement] += 1;
  }
  return score;
}

function buildLicenseRestrictionNotes(candidates) {
  const seen = new Set();
  const notes = [];
  for (const candidate of candidates) {
    const note = normalizeText(candidate.license_restriction_note);
    if (!note) continue;
    const key = `${candidate.adapter ?? ""}::${candidate.language_code ?? ""}::${note}`;
    if (seen.has(key)) continue;
    seen.add(key);
    notes.push({
      language_code: candidate.language_code ?? "",
      adapter: candidate.adapter ?? "",
      source_ids: candidate.source_ids ?? [],
      note,
    });
  }
  return notes;
}

function isExactOrthographicIpa(row) {
  const languageCode = rowLanguageCode(row);
  if (languageCode === "EN" || languageCode === "EN-GB") return false;
  const transcription = normalizeText(row.transcription);
  const match = transcription.match(/^\/(.+)\/$/u);
  if (!match) return false;
  if (/[ˈˌːˑəɛɪʊʌɔɒɑæɐɜɞɚɝɨɯøœɶɤɘɵɒɶɲŋɳɴʃʒʂʐçɕʑɾɽʁʀɣɰβθðɸʝɦʔɡ̯̩̥̬̪̺̻̟̠̤̰̃̍]/u.test(match[1])) {
    return false;
  }
  const inner = normalizeComparable(match[1]);
  const display = normalizeComparable(rowDisplayWord(row) || row.native_word);
  return inner.length >= 5 && inner === display;
}

function compactSourceBackingWarning(result) {
  const failIssues = result.issues.filter((issue) => issue.severity === "fail");
  return {
    severity: "warning",
    code: `transcription_source_${result.confidence}`,
    set_id: result.set_id,
    line: result.line ?? null,
    meaning_id: result.meaning_id,
    language_code: result.language_code,
    field: "transcription",
    detail:
      failIssues.map((issue) => `${issue.code}: ${issue.detail}`).join("; ") ||
      `source-backed transcription confidence=${result.confidence}`,
    native_word: result.native_word,
    display_word: result.display_word,
    transcription: result.transcription,
    source_ids: result.source_ids,
    candidates: result.source_value ? [{ field: "transcription", value: result.source_value, source_ids: result.source_ids }] : [],
  };
}

function uniqueFindings(findings) {
  const seen = new Set();
  const result = [];
  for (const finding of findings) {
    const key = [
      finding.severity,
      finding.code,
      finding.set_id,
      finding.line,
      finding.meaning_id,
      finding.language_code,
      finding.field,
      finding.detail,
    ].join("::");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(finding);
  }
  return result;
}

export async function buildLanguageBatchSourcePreflight(rows, options = {}) {
  const startedAt = performance.now();
  const timingMs = {};
  async function timed(label, fn) {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      timingMs[label] = Number((performance.now() - start).toFixed(3));
      if (process.env.SOURCE_PREFLIGHT_PROGRESS === "1") {
        console.error(`[source-preflight] build.${label} ${timingMs[label]}ms`);
      }
    }
  }

  const manifestSourceIds = options.manifestSourceIds ?? new Set();
  const meaningMetaByMeaningId = options.meaningMetaByMeaningId ?? {};
  const blockers = [];
  const warnings = [];
  const sourceCandidates = [];
  const externalMtSanity = [];

  const normalizedRows = rows.map((row, index) => {
    const meaningId = rowMeaningId(row);
    const meta = meaningMetaByMeaningId[meaningId] ?? {};
    return {
      ...row,
      __line: rowLine(row, index),
      set_id: rowSetId(row),
      meaning_id: meaningId,
      language_code: rowLanguageCode(row),
      canonical_english: row.canonical_english ?? row.canonicalEnglish ?? meta.canonical_english ?? "",
      canonical_example_en: row.canonical_example_en ?? row.canonicalExampleEn ?? meta.canonical_example_en ?? "",
      semantic_scene: row.semantic_scene ?? row.semanticScene ?? meta.semantic_scene ?? null,
      part_of_speech: row.part_of_speech ?? meta.part_of_speech ?? "",
      display_word: rowDisplayWord(row),
      word_with_article_or_marker: row.word_with_article_or_marker ?? row.display_word ?? row.native_word,
    };
  });
  const deckProfileContext = resolveDeckProfileContext({ spec: options.spec, rows: normalizedRows });
  const riskProfile = buildRiskProfile(normalizedRows, deckProfileContext);
  const languages = [...new Set(normalizedRows.map((row) => row.language_code))].sort();
  if (riskProfile.requires_single_language_batch && languages.length > 1) {
    blockers.push({
      severity: "blocker",
      code: "high_risk_batch_language_count",
      set_id: normalizedRows[0]?.set_id ?? "",
      line: null,
      meaning_id: null,
      language_code: languages.join(","),
      field: null,
      detail: "High-risk grammar, number-heavy or weak-source batches must be generated and imported one language at a time.",
      native_word: "",
      display_word: "",
      transcription: "",
      source_ids: [],
      candidates: [],
    });
  }
  const lineByTarget = new Map(
    normalizedRows.map((row) => [`${row.set_id}::${row.meaning_id}::${row.language_code}`, row.__line])
  );
  const targetKeyFor = (row) => `${row.set_id}::${row.meaning_id}::${row.language_code}`;
  const hasDraftTarget = (row) => lineByTarget.has(targetKeyFor(row));
  const lineFor = (row) => lineByTarget.get(targetKeyFor(row)) ?? row.line ?? null;

  const toolContext = await timed("tool_source_batch_context", () => buildToolSourceBatchContext({
    fixtureToolSources: options.fixtureToolSources,
    rows: normalizedRows,
  }));
  for (const warning of toolContext.warnings) {
    warnings.push({
      severity: "warning",
      code: warning.code,
      set_id: normalizedRows[0]?.set_id ?? "",
      line: null,
      meaning_id: null,
      language_code: null,
      field: null,
      detail: warning.detail,
      native_word: "",
      display_word: "",
      transcription: "",
      source_ids: [warning.source_id],
      candidates: [],
    });
  }

  for (const [index, row] of normalizedRows.entries()) {
    const mtSanity = buildExternalMtSanity(row);
    if (mtSanity) externalMtSanity.push(mtSanity);

    for (const finding of buildDraftExampleSceneFindings(row, index)) {
      const target = finding.severity === "blocker" ? blockers : warnings;
      target.push(finding);
    }
    for (const issue of validateCjkExampleSpacing(row)) {
      blockers.push(
        makeFinding(row, index, "blocker", "cjk_example_spacing", issue.issue, {
          field: "example_text",
        })
      );
    }
    for (const issue of validateThaiExampleSpacing(row)) {
      blockers.push(
        makeFinding(row, index, "blocker", "thai_example_spacing", issue.issue, {
          field: "example_text",
        })
      );
    }
    for (const issue of validateSoutheastAsianExampleSpacing(row)) {
      blockers.push(
        makeFinding(row, index, "blocker", "southeast_asian_example_spacing", issue.issue, {
          field: "example_text",
        })
      );
    }
    for (const issue of validateActionExampleSurface(row)) {
      blockers.push(
        makeFinding(row, index, "blocker", "action_example_surface", issue.issue, {
          field: "example_text",
        })
      );
    }
    for (const issue of validateExampleSurfaceGrammar(row)) {
      blockers.push(
        makeFinding(row, index, "blocker", "example_surface_grammar", issue.issue, {
          field: "example_text",
        })
      );
    }
    for (const issue of validateExampleNaturalness(row)) {
      blockers.push(
        makeFinding(row, index, "blocker", "target_example_naturalness", issue, {
          field: "example_text",
        })
      );
    }

    for (const issue of validateTranscriptionShape(row)) {
      blockers.push(makeFinding(row, index, "blocker", "transcription_shape", issue, { field: "transcription" }));
    }
    if (isExactOrthographicIpa(row)) {
      blockers.push(
        makeFinding(
          row,
          index,
          "blocker",
          "ipa_orthographic_slash",
          "IPA transcription appears to be slash-wrapped display orthography.",
          { field: "transcription" }
        )
      );
    }

    const toolCandidateStart = performance.now();
    if (process.env.SOURCE_PREFLIGHT_PROGRESS === "1") {
      console.error(`[source-preflight] row.${row.language_code}.${row.meaning_id}.source_candidates.start`);
    }
    const toolResult = await buildToolSourceCandidatesForRow(row, toolContext);
    timingMs.per_row_source_candidates = Number(
      ((timingMs.per_row_source_candidates ?? 0) + performance.now() - toolCandidateStart).toFixed(3)
    );
    if (process.env.SOURCE_PREFLIGHT_PROGRESS === "1") {
      console.error(
        `[source-preflight] row.${row.language_code}.${row.meaning_id}.source_candidates ${Number(
          (performance.now() - toolCandidateStart).toFixed(3)
        )}ms`
      );
    }
    const exactCandidateFields = new Set(
      toolResult.candidates
        .filter((candidate) => !candidateDiffersFromCurrent(candidate, row))
        .map((candidate) => candidate.field)
    );
    for (const candidate of toolResult.candidates) {
      const candidateRecord = {
        set_id: row.set_id,
        line: row.__line,
        meaning_id: row.meaning_id,
        language_code: row.language_code,
        field: candidate.field,
        value: candidate.value,
        confidence: candidate.confidence,
        source_ids: candidate.source_ids ?? [candidate.source_id],
        adapter: candidate.adapter,
        note: candidate.note,
        reason: candidate.note,
        gloss: candidate.gloss ?? null,
        license_restriction_note: candidate.license_restriction_note ?? "",
      };
      sourceCandidates.push(candidateRecord);
      if (
        !["kaikki", "epitran", "indictrans2", "external_mt", "dakshina"].includes(candidate.adapter) &&
        !exactCandidateFields.has(candidate.field) &&
        candidateDiffersFromCurrent(candidate, row)
      ) {
        warnings.push(
          makeFinding(
            row,
            index,
            "warning",
            "tool_candidate_mismatch",
            `${candidate.adapter} candidate differs from draft ${candidate.field}.`,
            { field: candidate.field, source_ids: candidateRecord.source_ids, candidates: [candidateRecord] }
          )
        );
      }
    }
    for (const finding of toolResult.findings) {
      const target = finding.severity === "blocker" ? blockers : warnings;
      target.push(
        makeFinding(row, index, finding.severity, finding.code, finding.note, {
          field: finding.field,
          source_ids: [finding.source_id],
          candidates: [
            {
              field: finding.field,
              value: finding.value,
              expected_value: finding.expected_value,
              confidence: finding.confidence,
              source_ids: [finding.source_id],
              adapter: finding.adapter,
            },
          ],
        })
      );
    }
  }

  const profileDraftFindings = buildDeckProfileDraftFindings(normalizedRows, deckProfileContext);
  for (const blocker of profileDraftFindings.blockers) {
    blockers.push({
      ...blocker,
      detail: blocker.detail,
      native_word: "",
      display_word: "",
      transcription: "",
      source_ids: [],
      candidates: [],
    });
  }
  for (const warning of profileDraftFindings.warnings) {
    warnings.push({
      ...warning,
      detail: warning.detail,
      native_word: "",
      display_word: "",
      transcription: "",
      source_ids: [],
      candidates: [],
    });
  }

  const ipaSanity = buildIpaTranscriptionSanityFindings(normalizedRows);
  for (const blocker of ipaSanity.blockers) {
    blockers.push(
      makeFinding(blocker, 0, "blocker", "ipa_transcription_sanity", formatIpaTranscriptionSanityFinding(blocker), {
        field: "transcription",
      })
    );
  }
  for (const warning of ipaSanity.warnings) {
    warnings.push(
      makeFinding(warning, 0, "warning", "ipa_transcription_sanity", formatIpaTranscriptionSanityFinding(warning), {
        field: "transcription",
      })
    );
  }

  const collapseFindings = buildIntraLanguageTranscriptionCollapseFindings(normalizedRows);
  for (const finding of collapseFindings) {
    blockers.push({
      severity: "blocker",
      code: "transcription_intra_language_collapse",
      set_id: finding.set_id,
      line: null,
      meaning_id: null,
      language_code: finding.language_code,
      field: "transcription",
      detail: `Same normalized transcription "${finding.normalized_transcription}" appears on ${finding.row_count}/${finding.total_rows} active rows.`,
      native_word: "",
      display_word: "",
      transcription: finding.normalized_transcription,
      source_ids: [],
      candidates: [],
    });
  }

  const styleFindings = buildTranscriptionStyleConsistencyFindings(normalizedRows);
  for (const blocker of styleFindings.blockers) {
    blockers.push({
      severity: "blocker",
      code: "transcription_style_consistency",
      set_id: blocker.set_id,
      line: null,
      meaning_id: null,
      language_code: blocker.language_code,
      field: "transcription",
      detail: formatTranscriptionStyleConsistencyBlocker(blocker),
      native_word: "",
      display_word: "",
      transcription: "",
      source_ids: [],
      candidates: [],
    });
  }

  const entryRows = normalizedRows.map((row) => ({
    ...row,
    display_word: row.display_word,
    word_with_article_or_marker: row.word_with_article_or_marker,
  }));

  for (const blocker of [
    ...buildEntryCrossLanguageFindings(entryRows).blockers,
    ...buildBatchEntryCrossLanguageBlockers(entryRows),
  ]) {
    blockers.push(
      makeFinding(blocker, 0, "blocker", "entry_source_fallback", formatEntryCrossLanguageBlocker(blocker), {
        field: "native_word",
      })
    );
  }

  const scriptFindings = buildScriptLanguageIdentityFindings(entryRows);
  for (const blocker of scriptFindings.blockers) {
    blockers.push(
      makeFinding(blocker, 0, "blocker", "script_language_identity", formatScriptLanguageIdentityFinding(blocker), {
        field: "native_word",
      })
    );
  }
  for (const warning of scriptFindings.warnings) {
    warnings.push(
      makeFinding(warning, 0, "warning", "script_language_identity", formatScriptLanguageIdentityFinding(warning), {
        field: "native_word",
      })
    );
  }

  const articleFindings = buildArticleGenderMarkerFindings(entryRows);
  for (const blocker of articleFindings.blockers) {
    blockers.push(
      makeFinding(blocker, 0, "blocker", "article_gender_marker", formatArticleGenderMarkerFinding(blocker), {
        field: "word_with_article_or_marker",
      })
    );
  }
  for (const warning of articleFindings.warnings) {
    warnings.push(
      makeFinding(warning, 0, "warning", "article_gender_marker", formatArticleGenderMarkerFinding(warning), {
        field: "word_with_article_or_marker",
      })
    );
  }

  const granularityFindings = buildSemanticGranularityFindings(entryRows);
  for (const blocker of granularityFindings.blockers) {
    blockers.push(
      makeFinding(blocker, 0, "blocker", "semantic_granularity", formatSemanticGranularityFinding(blocker), {
        field: "native_word",
      })
    );
  }
  for (const warning of granularityFindings.warnings) {
    warnings.push(
      makeFinding(warning, 0, "warning", "semantic_granularity", formatSemanticGranularityFinding(warning), {
        field: "native_word",
      })
    );
  }

  const translationCoverage = await timed("translation_coverage", () => buildTranslationSourceCoverageFindings(entryRows, {
    manifestSourceIds,
    ...(options.entrySourceDecisions ? { decisions: options.entrySourceDecisions } : {}),
    policy: options.translationSourcePolicy,
  }));
  for (const blocker of translationCoverage.blockers) {
    if (!hasDraftTarget(blocker)) continue;
    blockers.push({
      severity: "blocker",
      code: "translation_source_coverage",
      set_id: blocker.set_id,
      line: lineFor(blocker),
      meaning_id: blocker.meaning_id,
      language_code: blocker.language_code,
      field: "native_word",
      detail: `${blocker.status}; ${blocker.reason}; ${blocker.detail ?? ""}`,
      native_word: "",
      display_word: "",
      transcription: "",
      source_ids: blocker.source_ids ?? [],
      candidates: [],
    });
  }
  for (const row of translationCoverage.rows) {
    if (!hasDraftTarget(row)) continue;
    if (row.status === "source_partial" || row.status === "no_source" || row.status === "not_checkable") {
      warnings.push({
        severity: "warning",
        code: `translation_${row.status}`,
        set_id: row.set_id,
        line: lineFor(row),
        meaning_id: row.meaning_id,
        language_code: row.language_code,
        field: "native_word",
        detail: row.reason,
        native_word: "",
        display_word: "",
        transcription: "",
        source_ids: row.source_ids ?? [],
        candidates: [],
      });
    }
  }

  const sourceBacking = await timed("transcription_source_backing", () =>
    buildTranscriptionSourceBackingFindings(normalizedRows, { manifestSourceIds })
  );
  for (const blocker of sourceBacking.blockers) {
    if (blocker.confidence === "conflict") {
      blockers.push({
        ...compactSourceBackingWarning(blocker),
        severity: "blocker",
        code: "transcription_source_conflict",
        detail: formatTranscriptionSourceBackingBlocker(blocker),
      });
    } else {
      warnings.push(compactSourceBackingWarning(blocker));
    }
  }

  const bulkHints = await timed("bulk_hints", () => buildBulkSourceHintsForRows(normalizedRows));
  for (const candidate of bulkHints.translationCandidates) sourceCandidates.push(candidate);
  const translationCandidates = sourceCandidates.filter((candidate) =>
    candidate.field === "native_word" &&
    [
      "kaikki",
      "dbnary",
      "freedict",
      "apertium",
      "nikl",
      "lexitron",
      "sealang",
      "official_dictionary",
      "panlex",
      "panlex_meaning",
      "sinhala_para_dict",
      "alar_kn",
      "tezaurs_lv",
      "slovak_wordnet",
      "sloleks_sl",
      "indowordnet",
      "myordbok_my",
      "uzwordnet",
      "myanmar_mcfnlp_dict",
      "darsala_en_ka_lexicon",
      "wikidata",
      "concepticon",
      "northeuralex",
    ].includes(candidate.adapter)
  );
  const strongDictionaryCandidates = translationCandidates.filter((candidate) => isStrongDictionaryAdapter(candidate.adapter));
  const officialDictionaryCandidates = translationCandidates.filter((candidate) => isOfficialDictionaryAdapter(candidate.adapter));
  const panlexCandidates = translationCandidates.filter((candidate) =>
    ["panlex", "panlex_meaning"].includes(candidate.adapter)
  );
  const lowResourceLanguageRisk = normalizedRows
    .map((row) => weakLanguageRiskFor(row.language_code))
    .filter(Boolean)
    .filter((risk, index, risks) => risks.findIndex((candidate) => candidate.language_code === risk.language_code) === index)
    .sort((left, right) => left.language_code.localeCompare(right.language_code));
  for (const [index, row] of normalizedRows.entries()) {
    if (!isWeakTranslationLanguage(row.language_code)) continue;
    const mtDisagreement = externalMtSanity.find(
      (mtRow) =>
        mtRow.set_id === row.set_id &&
        mtRow.meaning_id === row.meaning_id &&
        mtRow.language_code === row.language_code &&
        mtRow.agreement === "disagreement"
    );
    if (!mtDisagreement) continue;
    const hasStrongDictionaryCandidate = strongDictionaryCandidates.some(
      (candidate) =>
        candidate.set_id === row.set_id &&
        candidate.meaning_id === row.meaning_id &&
        candidate.language_code === row.language_code
    );
    if (hasStrongDictionaryCandidate) continue;
    warnings.push(
      makeFinding(
        row,
        index,
        "warning",
        "low_resource_mt_dictionary_disagreement",
        "Weak-language draft has external MT disagreement and no strong dictionary candidate for this row; repair the draft or add a current-value-locked decision before strict import.",
        {
          field: "native_word",
          source_ids: ["tool-external-mt-sanity"],
          candidates: [
            {
              field: "native_word",
              value: mtDisagreement.suggestion,
              confidence: "source_partial",
              source_ids: ["tool-external-mt-sanity"],
              adapter: mtDisagreement.provider,
            },
          ],
        }
      )
    );
  }
  const finalBlockers = uniqueFindings(blockers);
  const finalWarnings = uniqueFindings(warnings);
  const actionableWarnings = finalWarnings.filter(warningRequiresDecision);
  const exampleSceneCandidates = normalizedRows.map(buildExampleSceneCandidate);
  const sourceConflicts = finalBlockers
    .concat(finalWarnings)
    .filter((finding) => /source|conflict|fallback|tool_candidate_mismatch/u.test(finding.code ?? ""));
  const setIds = [...new Set(normalizedRows.map((row) => row.set_id))].sort();

  timingMs.build_total = Number((performance.now() - startedAt).toFixed(3));

  return {
    rule_version: languageBatchSourcePreflightRuleVersion,
    deck_profile: deckProfileContext.deck_profile,
    risk_flags: deckProfileContext.risk_flags,
    profile_policy: deckProfileContext.policy,
    risk_profile: riskProfile,
    requires_warning_decisions: riskProfile.requires_warning_decisions,
    requires_single_language_batch: riskProfile.requires_single_language_batch,
    rows_checked: normalizedRows.length,
    set_ids: setIds,
    language_codes: languages,
    blocker_count: finalBlockers.length,
    warning_count: finalWarnings.length,
    actionable_warning_count: actionableWarnings.length,
    source_candidate_count: sourceCandidates.length,
    translation_candidate_count: translationCandidates.length,
    strong_dictionary_candidate_count: strongDictionaryCandidates.length,
    official_dictionary_candidate_count: officialDictionaryCandidates.length,
    panlex_candidate_count: panlexCandidates.length,
    example_collocation_candidate_count: bulkHints.exampleCollocationCandidates.length,
    concept_sanity_count: bulkHints.conceptSanity.length,
    spelling_sanity_count: bulkHints.spellingSanity.length,
    external_mt_sanity_count: externalMtSanity.length,
    low_resource_language_risk_count: lowResourceLanguageRisk.length,
    blockers: finalBlockers,
    hard_blockers: finalBlockers,
    warnings: finalWarnings,
    actionable_warnings: actionableWarnings,
    decision_required: actionableWarnings,
    source_candidates: sourceCandidates,
    translation_candidates: translationCandidates,
    strong_dictionary_candidates: strongDictionaryCandidates,
    official_dictionary_candidates: officialDictionaryCandidates,
    panlex_candidates: panlexCandidates,
    example_scene_candidates: exampleSceneCandidates,
    example_collocation_candidates: bulkHints.exampleCollocationCandidates,
    concept_sanity: bulkHints.conceptSanity,
    spelling_sanity: bulkHints.spellingSanity,
    source_conflicts: sourceConflicts,
    external_mt_sanity: externalMtSanity,
    mt_agreement_score: buildMtAgreementScore(externalMtSanity),
    low_resource_language_risk: lowResourceLanguageRisk,
    license_restriction_note: buildLicenseRestrictionNotes(sourceCandidates),
    scene_slot_proof: profileDraftFindings.scene_slot_proof,
    compound_whole_meaning: profileDraftFindings.compound_whole_meaning,
    timing_ms: timingMs,
    summary_by_language: languages.map((languageCode) => ({
      language_code: languageCode,
      rows: normalizedRows.filter((row) => row.language_code === languageCode).length,
      blockers: finalBlockers.filter((finding) => finding.language_code === languageCode).length,
      warnings: finalWarnings.filter((finding) => finding.language_code === languageCode).length,
      source_candidates: sourceCandidates.filter((candidate) => candidate.language_code === languageCode).length,
    })),
  };
}

export function formatLanguageBatchSourcePreflightFinding(finding) {
  const location = `${finding.set_id ?? "unknown"}#${finding.line ?? "?"}`;
  const target = `${finding.language_code ?? "??"}/${finding.meaning_id ?? "unknown"}`;
  const field = finding.field ? ` ${finding.field}` : "";
  return `${location} ${target}${field}: ${finding.code}; ${finding.detail}`;
}
