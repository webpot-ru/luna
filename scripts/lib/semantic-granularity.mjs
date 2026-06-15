const hardGranularityPairs = [
  ["body wash", "soap"],
  ["hand soap", "soap"],
  ["soap dispenser", "soap"],
  ["soap dish", "soap"],
  ["shower head", "shower"],
  ["washcloth", "towel"],
  ["toothbrush holder", "toothbrush"],
  ["toothbrush cup", "toothbrush"],
  ["sink strainer", "sink"],
];

const warningGranularityPairs = [
  ["bath towel", "towel"],
  ["hand towel", "towel"],
  ["towel hook", "towel rack"],
  ["food storage bag", "food storage container"],
  ["freezer bag", "food storage bag"],
  ["frying pan", "pan"],
  ["saucepan", "pot"],
];

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeGranularitySurface(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/^(?:a|an|the|el|la|los|las|un|una|le|les|des|der|die|das|il|lo|l'|o|a|os|as|de|het|en|et|ett)\s+/u, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function rowSetId(row) {
  return row.set_id ?? row.setId ?? "";
}

function rowMeaningId(row) {
  return row.meaning_id ?? row.meaningId ?? "";
}

function rowLanguageCode(row) {
  return row.language_code ?? row.languageCode;
}

function rowCanonical(row) {
  return normalizeGranularitySurface(row.canonical_english ?? row.canonicalEnglish);
}

function rowDisplay(row) {
  return normalizeText(row.display_word ?? row.displayWord ?? row.word_with_article_or_marker ?? row.native_word);
}

function rowNative(row) {
  return normalizeText(row.native_word ?? row.nativeWord ?? row.display_word ?? row.displayWord ?? row.word_with_article_or_marker);
}

function rowTranscription(row) {
  return normalizeText(row.transcription);
}

function buildBySetLanguage(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = `${rowSetId(row)}::${rowLanguageCode(row)}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  return grouped;
}

function affected(row) {
  return {
    set_id: rowSetId(row),
    meaning_id: rowMeaningId(row),
    language_code: rowLanguageCode(row),
    display_word: rowDisplay(row),
  };
}

function inspectPairs(rows, pairs, severity) {
  const findings = [];
  const bySetLanguage = buildBySetLanguage(rows);

  for (const groupRows of bySetLanguage.values()) {
    const byCanonical = new Map(groupRows.map((row) => [rowCanonical(row), row]));
    for (const [narrowCanonical, broadCanonical] of pairs) {
      const narrow = byCanonical.get(narrowCanonical);
      const broad = byCanonical.get(broadCanonical);
      if (!narrow || !broad) continue;
      const narrowSurface = normalizeGranularitySurface(rowDisplay(narrow));
      const broadSurface = normalizeGranularitySurface(rowDisplay(broad));
      if (!narrowSurface || !broadSurface || narrowSurface !== broadSurface) continue;
      findings.push({
        severity,
        set_id: rowSetId(narrow),
        language_code: rowLanguageCode(narrow),
        meaning_id: rowMeaningId(narrow),
        native_word: rowNative(narrow),
        transcription: rowTranscription(narrow),
        broad_meaning_id: rowMeaningId(broad),
        narrow_canonical: narrowCanonical,
        broad_canonical: broadCanonical,
        normalized_surface: narrowSurface,
        display_word: rowDisplay(narrow),
        broad_display_word: rowDisplay(broad),
        reason:
          severity === "fail"
            ? `${narrowCanonical} collapsed to the same display as broader ${broadCanonical}`
            : `${narrowCanonical} shares display with nearby ${broadCanonical}; review semantic granularity`,
        affected_rows: [affected(narrow), affected(broad)],
      });
    }
  }

  return findings;
}

export function buildSemanticGranularityFindings(rows) {
  return {
    blockers: inspectPairs(rows, hardGranularityPairs, "fail"),
    warnings: inspectPairs(rows, warningGranularityPairs, "warning"),
  };
}

export function formatSemanticGranularityFinding(finding) {
  return `${finding.language_code}/${finding.meaning_id}: ${finding.reason}; display="${finding.display_word}", broad="${finding.broad_display_word}"`;
}
