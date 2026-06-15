export const allowedDeckProfiles = new Set([
  "object_noun",
  "action_verb",
  "adjective_state",
  "closed_set",
  "number_quantity",
  "time_calendar",
  "food_countability",
  "document_admin",
  "health_safety",
  "service_problem",
  "regional_variant_heavy",
  "transcription_high_risk",
]);

export const highRiskGrammarLanguageCodes = new Set([
  "BG",
  "HR",
  "SR",
  "LV",
  "PT-BR",
  "RO",
  "KO",
  "TL",
  "IS",
  "LO",
  "TH",
  "MY",
  "KM",
  "BN",
  "HI",
  "NE",
  "SI",
  "TA",
  "TE",
  "KN",
  "ML",
]);

const singleLanguageBatchProfiles = new Set([
  "action_verb",
  "adjective_state",
  "number_quantity",
  "time_calendar",
  "food_countability",
  "document_admin",
  "health_safety",
  "service_problem",
]);

const grammarRiskFlags = new Set([
  "grammar_risk",
  "number_grammar",
  "action_aspect_transitivity",
  "time_scope",
  "food_countability",
  "document_register",
  "health_safety_specificity",
]);

const placeholderPattern = /(^\s*$|todo|tbd|to be decided|candidate \/ planned|none yet|n\/a only)/i;

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

export function parseProfileList(value) {
  if (Array.isArray(value)) return value.flatMap(parseProfileList);
  return normalizeText(value)
    .replace(/^`|`$/g, "")
    .split(/[;,]+/u)
    .map((item) => item.trim().replace(/^`|`$/g, ""))
    .filter(Boolean);
}

export function normalizeDeckProfiles(value) {
  return [...new Set(parseProfileList(value).map((item) => item.toLowerCase().replace(/[-\s]+/g, "_")))];
}

export function normalizeRiskFlags(value) {
  return [...new Set(parseProfileList(value).map((item) => item.toLowerCase().replace(/[-\s]+/g, "_")))];
}

export function validateDeckProfileFields(spec) {
  const errors = [];
  const deckProfiles = normalizeDeckProfiles(spec.deckProfile ?? spec.deck_profile ?? "");
  const riskFlags = normalizeRiskFlags(spec.riskFlags ?? spec.risk_flags ?? "");

  if (placeholderPattern.test(spec.deckProfile ?? spec.deck_profile ?? "")) {
    errors.push("deck_profile is missing or placeholder");
  }
  if (deckProfiles.length === 0) errors.push("deck_profile must contain at least one profile");

  for (const profile of deckProfiles) {
    if (!allowedDeckProfiles.has(profile)) {
      errors.push(`deck_profile has unsupported value=${profile}`);
    }
  }

  if (placeholderPattern.test(spec.riskFlags ?? spec.risk_flags ?? "")) {
    errors.push("risk_flags is missing or placeholder");
  }
  for (const flag of riskFlags) {
    if (!/^[a-z][a-z0-9_]*$/u.test(flag)) {
      errors.push(`risk_flags has unsafe value=${flag}`);
    }
  }

  return errors;
}

export function buildDeckProfilePolicy(deckProfiles = [], riskFlags = []) {
  const profiles = new Set(deckProfiles);
  const flags = new Set(riskFlags);
  const hasSingleLanguageProfile = [...profiles].some((profile) => singleLanguageBatchProfiles.has(profile));
  const hasGrammarRiskFlag = [...flags].some((flag) => grammarRiskFlags.has(flag));
  const requiredQaFamilies = new Set([
    "metadata_review",
    "word_selection_quality",
    "base_example_alignment",
    "example_quality",
    "entry_form",
    "entry_form_register",
    "semantic_granularity",
    "article_gender_marker_consistency",
    "semantic_preservation",
    "target_example_naturalness",
    "target_example_lexical_anchor",
    "target_example_pedagogical_quality",
    "transcription_policy",
    "transcription_source_backing",
  ]);

  if (profiles.has("number_quantity")) requiredQaFamilies.add("number_example_grammar");
  if (profiles.has("regional_variant_heavy")) requiredQaFamilies.add("regional_variant_quality");
  if (profiles.has("transcription_high_risk")) requiredQaFamilies.add("pronunciation_accuracy");

  return {
    profiles: [...profiles].sort(),
    risk_flags: [...flags].sort(),
    grammar_risk: hasSingleLanguageProfile || hasGrammarRiskFlag,
    requires_single_language_batch: hasSingleLanguageProfile || hasGrammarRiskFlag,
    requires_warning_decisions: hasSingleLanguageProfile || hasGrammarRiskFlag,
    required_qa_families: [...requiredQaFamilies].sort(),
  };
}

function rowSetId(row) {
  return row.set_id ?? row.setId ?? "";
}

function rowLanguageCode(row) {
  return row.language_code ?? row.languageCode ?? "";
}

function rowPartOfSpeech(row) {
  return normalizeComparable(row.part_of_speech ?? row.partOfSpeech ?? "");
}

function rowCanonical(row) {
  return normalizeText(row.canonical_english ?? row.canonicalEnglish ?? "");
}

function textBag(row) {
  return normalizeComparable(
    [
      row.set_id,
      row.domain,
      row.area,
      row.category,
      row.situation,
      row.context_domain,
      row.context_area,
      row.context_category,
      row.meaning_note,
      row.canonical_english,
      row.canonical_example_en,
    ].join(" ")
  );
}

export function inferDeckProfilesFromRows(rows) {
  const explicitProfiles = normalizeDeckProfiles(rows.flatMap((row) => [row.deck_profile, row.deck_profiles]).filter(Boolean));
  if (explicitProfiles.length > 0) return explicitProfiles;

  const bag = textBag(rows[0] ?? {});
  const setIds = new Set(rows.map(rowSetId).filter(Boolean));
  const profiles = new Set();

  if ([...setIds].some((setId) => /numbers?_counting|counting|number/i.test(setId)) || /\bnumber(s)?\b|\bcounting\b/u.test(bag)) {
    profiles.add("closed_set");
    profiles.add("number_quantity");
  }
  if (/\btime\b|\bcalendar\b|\bday(s)?\b|\bdate(s)?\b|\bscheduling\b/u.test(bag)) profiles.add("time_calendar");
  if (/\bfood\b|\beating\b|\bdrink(s)?\b|\bbeverage(s)?\b|\brestaurant\b|\bcafe\b/u.test(bag)) profiles.add("food_countability");
  if (/\bdocument(s)?\b|\badministration\b|\bform(s)?\b|\bcontact\b|\baddress\b/u.test(bag)) profiles.add("document_admin");
  if (/\bhealth\b|\bbody\b|\bpharmacy\b|\bsymptom(s)?\b|\bmedicine\b|\bemergency\b|\bsafety\b/u.test(bag)) profiles.add("health_safety");

  const partOfSpeechValues = rows.map(rowPartOfSpeech).filter(Boolean);
  const canonicalValues = rows.map((row) => normalizeComparable(rowCanonical(row))).filter(Boolean);
  if (
    (partOfSpeechValues.length > 0 && partOfSpeechValues.every((value) => value === "verb")) ||
    canonicalValues.some((value) => value.startsWith("to "))
  ) {
    profiles.add("action_verb");
  }
  if (partOfSpeechValues.length > 0 && partOfSpeechValues.every((value) => value === "adjective")) profiles.add("adjective_state");
  if (profiles.size === 0 && partOfSpeechValues.length > 0 && partOfSpeechValues.every((value) => value.includes("noun"))) {
    profiles.add("object_noun");
  }

  return [...profiles].sort();
}

export function inferRiskFlagsFromRows(rows) {
  const explicitFlags = normalizeRiskFlags(rows.flatMap((row) => [row.risk_flags, row.riskFlags]).filter(Boolean));
  const flags = new Set(explicitFlags);
  for (const row of rows) {
    if (row.compound_multiword_risk && !isBlankish(row.compound_multiword_risk)) flags.add("compound_whole_meaning");
    if (row.required_qa_profile && !isBlankish(row.required_qa_profile)) {
      for (const item of normalizeRiskFlags(row.required_qa_profile)) flags.add(item);
    }
  }
  return [...flags].sort();
}

export function resolveDeckProfileContext({ spec = null, rows = [] } = {}) {
  const specProfiles = normalizeDeckProfiles(spec?.deckProfile ?? spec?.deck_profile ?? "");
  const specRiskFlags = normalizeRiskFlags(spec?.riskFlags ?? spec?.risk_flags ?? "");
  const deckProfiles = specProfiles.length > 0 ? specProfiles : inferDeckProfilesFromRows(rows);
  const riskFlags = [...new Set([...specRiskFlags, ...inferRiskFlagsFromRows(rows)])].sort();
  const policy = buildDeckProfilePolicy(deckProfiles, riskFlags);
  const highRiskLanguageCount = rows.filter((row) => highRiskGrammarLanguageCodes.has(rowLanguageCode(row))).length;
  return {
    deck_profile: deckProfiles,
    risk_flags: riskFlags,
    policy: {
      ...policy,
      high_risk_language_count: highRiskLanguageCount,
      requires_single_language_batch: policy.requires_single_language_batch || highRiskLanguageCount > 0,
      requires_warning_decisions: policy.requires_warning_decisions || highRiskLanguageCount > 0,
    },
  };
}

function isBlankish(value) {
  return /^(|none|n\/a|na|null|no|false)$/iu.test(normalizeText(value));
}

function partOfSpeechMatchesAllowed(partOfSpeech, allowedParts) {
  if (!partOfSpeech) return true;
  if (allowedParts.has("noun") && partOfSpeech.includes("noun")) return true;
  if (allowedParts.has("verb") && partOfSpeech === "verb") return true;
  if (allowedParts.has("adjective") && partOfSpeech === "adjective") return true;
  if (allowedParts.has("adverb") && partOfSpeech === "adverb") return true;
  return false;
}

function proofPresent(row, fields) {
  return fields.some((field) => {
    const value = row[field];
    if (value && typeof value === "object") return Object.keys(value).length > 0;
    return normalizeText(value).length >= 12;
  });
}

function isTargetLanguage(row) {
  const languageCode = rowLanguageCode(row);
  return languageCode && languageCode !== "EN" && languageCode !== "EN-GB";
}

function isCompoundCandidate(row, context) {
  const risk = normalizeComparable(row.compound_multiword_risk ?? "");
  if (risk && !isBlankish(risk)) return true;
  const canonical = rowCanonical(row);
  const comparable = normalizeComparable(canonical);
  if (!canonical || comparable.startsWith("to ")) return false;
  if (rowPartOfSpeech(row).includes("phrase")) return true;
  return /[- ]/u.test(canonical) && comparable.split(" ").filter(Boolean).length >= 2;
}

function makeFinding(row, severity, code, detail, field = null) {
  return {
    severity,
    code,
    set_id: rowSetId(row),
    line: row.__line ?? row.line ?? null,
    meaning_id: row.meaning_id ?? row.meaningId ?? null,
    language_code: rowLanguageCode(row) || null,
    field,
    detail,
  };
}

export function buildDeckProfileDraftFindings(rows, context) {
  const blockers = [];
  const warnings = [];
  const sceneSlotProof = [];
  const compoundWholeMeaning = [];
  const profiles = new Set(context.deck_profile ?? []);

  for (const row of rows) {
    const hasScene = Boolean(row.semantic_scene) || normalizeText(row.canonical_example_en).length > 0;
    sceneSlotProof.push({
      set_id: rowSetId(row),
      meaning_id: row.meaning_id ?? row.meaningId ?? null,
      language_code: rowLanguageCode(row) || null,
      has_semantic_scene: Boolean(row.semantic_scene),
      has_canonical_example_en: Boolean(normalizeText(row.canonical_example_en)),
      has_target_example: Boolean(normalizeText(row.example_text ?? row.target_example ?? row.example)),
      scene_slot_proof_present: proofPresent(row, ["scene_slot_proof", "semantic_scene_proof", "profile_qa_proof"]),
    });

    if (isCompoundCandidate(row, context)) {
      const proof = proofPresent(row, ["compound_whole_meaning_proof", "profile_qa_proof"]);
      compoundWholeMeaning.push({
        set_id: rowSetId(row),
        meaning_id: row.meaning_id ?? row.meaningId ?? null,
        language_code: rowLanguageCode(row) || null,
        canonical_english: rowCanonical(row),
        proof_present: proof,
      });
      if (isTargetLanguage(row) && !proof) {
        blockers.push(
          makeFinding(
            row,
            "blocker",
            "compound_whole_meaning",
            "Compound or multiword lexical item needs whole-meaning proof before import; do not approve literal component translation by default.",
            "native_word"
          )
        );
      }
    }

    if (!isTargetLanguage(row)) continue;

    if (profiles.has("number_quantity") && !proofPresent(row, ["number_example_grammar_proof", "profile_qa_proof"])) {
      blockers.push(
        makeFinding(row, "blocker", "number_quantity_profile_proof", "Number/quantity draft needs proof for number grammar, scene slots and target usage before import.", "example_text")
      );
    }
    if (profiles.has("action_verb") && !proofPresent(row, ["action_grammar_proof", "profile_qa_proof"])) {
      blockers.push(
        makeFinding(row, "blocker", "action_verb_grammar", "Action-verb draft needs proof for aspect/transitivity/object collocation before import.", "example_text")
      );
    }
    if (profiles.has("time_calendar") && !proofPresent(row, ["time_scope_proof", "profile_qa_proof"])) {
      blockers.push(
        makeFinding(row, "blocker", "time_calendar_scope", "Time/calendar draft needs proof that it stays in calendar/time scope and does not drift into admin, phone or payment usage.", "example_text")
      );
    }
    if (profiles.has("food_countability") && !proofPresent(row, ["food_countability_proof", "profile_qa_proof"])) {
      blockers.push(
        makeFinding(row, "blocker", "food_countability_container", "Food/drink draft needs proof for countability, container/portion wording and scene preservation.", "example_text")
      );
    }
    if (profiles.has("document_admin") && !proofPresent(row, ["document_register_proof", "profile_qa_proof"])) {
      blockers.push(
        makeFinding(row, "blocker", "document_admin_register", "Document/admin draft needs proof for register, form-field meaning and whole-entry scope before import.", "native_word")
      );
    }
    if (profiles.has("health_safety") && !proofPresent(row, ["health_safety_specificity_proof", "profile_qa_proof"])) {
      blockers.push(
        makeFinding(row, "blocker", "health_safety_specificity", "Health/safety draft needs proof that broad-vs-specific meaning and register are preserved before import.", "native_word")
      );
    }
  }

  return { blockers, warnings, scene_slot_proof: sceneSlotProof, compound_whole_meaning: compoundWholeMeaning };
}

export function buildDeckProfileQualityFindings(rows, context) {
  const blockers = [];
  const warnings = [];
  const profiles = new Set(context.deck_profile ?? []);
  const flags = new Set(context.risk_flags ?? []);
  const allowedParts = new Set();
  if (profiles.has("object_noun")) allowedParts.add("noun");
  if (profiles.has("action_verb")) allowedParts.add("verb");
  if (profiles.has("adjective_state")) allowedParts.add("adjective");
  if (flags.has("study_feedback_words")) allowedParts.add("adverb");
  const mixedLexicalProfile = allowedParts.size > 1;

  for (const row of rows) {
    const partOfSpeech = rowPartOfSpeech(row);
    const bag = textBag(row);
    const canonicalExample = normalizeComparable(row.canonical_example_en ?? "");

    if (mixedLexicalProfile && !partOfSpeechMatchesAllowed(partOfSpeech, allowedParts)) {
      blockers.push(makeFinding(row, "blocker", "deck_profile_pos_mismatch", "Mixed lexical deck contains a part of speech outside configured deck_profile/risk_flags.", "part_of_speech"));
    } else if (profiles.has("object_noun") && partOfSpeech === "verb") {
      blockers.push(makeFinding(row, "blocker", "deck_profile_pos_mismatch", "Object/noun deck contains a verb meaning.", "part_of_speech"));
    }
    if (!mixedLexicalProfile && profiles.has("action_verb") && partOfSpeech && partOfSpeech !== "verb") {
      blockers.push(makeFinding(row, "blocker", "deck_profile_pos_mismatch", "Action-verb deck contains a non-verb meaning.", "part_of_speech"));
    }
    if (!mixedLexicalProfile && profiles.has("adjective_state") && partOfSpeech && partOfSpeech !== "adjective") {
      blockers.push(makeFinding(row, "blocker", "deck_profile_pos_mismatch", "Adjective/state deck contains a non-adjective meaning.", "part_of_speech"));
    }
    if (profiles.has("time_calendar") && /\b(price|payment|receipt|phone|address|passport|form)\b/u.test(bag)) {
      blockers.push(makeFinding(row, "blocker", "time_calendar_scope_drift", "Time/calendar profile includes payment, contact or admin scope wording.", "canonical_english"));
    }
    const foodPlaceholderExample = /\b(the food|some food|food item|thing)\b/u.test(canonicalExample);
    const isSpecificFoodCompound = (value) => {
      const parts = normalizeComparable(value).split(" ").filter(Boolean);
      return parts[0] === "food" && parts.length >= 2 && !new Set(["item", "thing"]).has(parts[1]);
    };
    const actualFoodLexeme =
      normalizeComparable(row.canonical_english ?? "") === "food" ||
      isSpecificFoodCompound(row.canonical_english ?? "") ||
      normalizeComparable(row.semantic_scene?.target_object ?? "") === "food" ||
      isSpecificFoodCompound(row.semantic_scene?.target_object ?? "") ||
      normalizeComparable(row.semantic_scene?.target_display ?? "") === "food" ||
      isSpecificFoodCompound(row.semantic_scene?.target_display ?? "");
    if (profiles.has("food_countability") && foodPlaceholderExample && !actualFoodLexeme) {
      blockers.push(makeFinding(row, "blocker", "food_countability_weak_anchor", "Food/countability profile uses a generic food placeholder instead of a countable/container scene.", "canonical_example_en"));
    }
    if (profiles.has("health_safety") && /\bfeel bad|not good|problem\b/u.test(canonicalExample)) {
      blockers.push(makeFinding(row, "blocker", "health_safety_broad_example", "Health/safety profile uses a broad weak example where a specific symptom/object scene is required.", "canonical_example_en"));
    }
  }

  return { blockers, warnings };
}

export function formatDeckProfileFinding(finding) {
  const location = `${finding.set_id ?? "unknown"}#${finding.line ?? "?"}`;
  const target = `${finding.language_code ?? "??"}/${finding.meaning_id ?? "unknown"}`;
  const field = finding.field ? ` ${finding.field}` : "";
  return `${location} ${target}${field}: ${finding.code}; ${finding.detail}`;
}
