export const exampleSurfaceGrammarRuleVersion =
  "example-surface-grammar-v2-template-artifacts-uralic-locatives-hr-sr-cases-no-parenthetical-romanization";

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
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

function rowExampleText(row) {
  return normalizeText(row.example_text ?? row.exampleText ?? row.target_example ?? row.targetExample);
}

function rowCanonicalExample(row) {
  return normalizeText(row.canonical_example_en ?? row.canonicalExampleEn);
}

const globalTemplateArtifactRules = [
  [/\{\{[^{}\n]{1,80}\}\}/u, "Example contains unresolved double-brace template text."],
  [/\{[^{}\n]{1,80}\}/u, "Example contains unresolved brace placeholder text."],
  [/<(?:word|entry|example|translation|meaning|target|noun|verb|object|place|location|article)[^>\n]{0,60}>/iu, "Example contains unresolved angle-bracket placeholder text."],
  [/\[(?:word|entry|example|translation|meaning|target|noun|verb|object|place|location|article)[^\]\n]{0,60}\]/iu, "Example contains unresolved bracket placeholder text."],
  [/\b(?:TODO|TBD|FIXME)\b/u, "Example contains unresolved TODO/FIXME marker."],
];

const nonLatinExampleLanguages = new Set([
  "BG",
  "RU",
  "ZH",
  "JA",
  "KO",
  "TH",
  "MY",
  "KM",
  "LO",
  "HI",
  "BN",
  "NE",
  "SI",
  "TA",
  "TE",
  "KN",
  "ML",
  "KK",
  "KA",
  "HY",
]);

const parentheticalLatinRomanizationPattern =
  /\([A-Za-z][A-Za-z0-9 .,'’\-āēīōūĀĒĪŌŪáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛǎěǐǒǔǍĚǏǑǓăĕĭŏŭĂĔĬŎŬəƏɛƐɔƆʃʒŋɲɐɡḍṭṇṅṃḥṣśḷṛñçğşüöäëï]+[.!?]?\)/u;

const languageSurfaceRules = {
  HU: [
    [/(?:^|[^\p{Letter}\p{Number}])A\(z\)(?=[^\p{Letter}\p{Number}]|$)/u, "Hungarian example contains unresolved article template A(z); use A before consonants and Az before vowels."],
  ],
  ET: [
    [
      /\bon\s+(?:kõrval|lähedal|juures|sees|kohal)\s+[\p{Letter}]/iu,
      "Estonian location/postposition phrase appears calqued from English; use noun + genitive/location form before the postposition, e.g. šampooni kõrval.",
    ],
  ],
  FI: [
    [
      /\bon\s+(?:päällä|sisällä|vieressä)\s+[\p{Letter}]/iu,
      "Finnish location phrase appears calqued from English; use locative case or noun-genitive + postposition, e.g. hyllyllä or hyllyn päällä.",
    ],
    [
      /\bon\s+lähellä\s+(?:suihku|pesuallas|allas|kylpyamme|wc|kaappi|hylly|pöytä|tuoli|sänky)(?:[.!?]|$)/iu,
      "Finnish lähellä phrase appears to use a bare nominative place noun; use the required case form, e.g. suihkua or altaan lähellä.",
    ],
  ],
  HR: [
    [/\biznad\s+(?:umivaonik|toalet|stol|sudoper|krevet|ormar)(?=[\s.!?,;:]|$)/iu, "Croatian iznad requires genitive in this locative scene, not a bare nominative noun."],
    [/\b(?:pokraj|pored)\s+(?:umivaonik|toalet|stol|sudoper|krevet|ormar)(?=[\s.!?,;:]|$)/iu, "Croatian pokraj/pored requires genitive in this locative scene, not a bare nominative noun."],
    [/\bna\s+kukica\b/iu, "Croatian na + location requires the locative form here, e.g. na kukici."],
    [/\bGumene rukavice\s+je\b/iu, "Croatian plural subject gumene rukavice requires plural verb su, not singular je."],
  ],
  SR: [
    [/\biznad\s+(?:umivaonik|toalet|sto|sudoper|krevet|ormar)(?=[\s.!?,;:]|$)/iu, "Serbian iznad requires genitive in this locative scene, not a bare nominative noun."],
    [/\b(?:pokraj|pored)\s+(?:umivaonik|toalet|sto|sudoper|krevet|ormar)(?=[\s.!?,;:]|$)/iu, "Serbian pokraj/pored requires genitive in this locative scene, not a bare nominative noun."],
    [/\bna\s+kukica\b/iu, "Serbian na + location requires the locative form here, e.g. na kukici."],
    [/\bGumene rukavice\s+je\b/iu, "Serbian plural subject gumene rukavice requires plural verb su, not singular je."],
  ],
};

function issue(ruleVersion, issue) {
  return {
    severity: "fail",
    issue,
    rule_version: ruleVersion,
  };
}

export function validateExampleSurfaceGrammar(row) {
  const exampleText = rowExampleText(row);
  if (!exampleText) return [];

  const findings = [];
  const languageCode = rowLanguageCode(row);

  for (const [pattern, message] of globalTemplateArtifactRules) {
    if (pattern.test(exampleText)) findings.push(issue(exampleSurfaceGrammarRuleVersion, message));
  }

  for (const [pattern, message] of languageSurfaceRules[languageCode] ?? []) {
    if (pattern.test(exampleText)) findings.push(issue(exampleSurfaceGrammarRuleVersion, message));
  }

  if (nonLatinExampleLanguages.has(languageCode) && parentheticalLatinRomanizationPattern.test(exampleText)) {
    findings.push(
      issue(
        exampleSurfaceGrammarRuleVersion,
        "Example text contains parenthetical Latin romanization; keep romanization/transcription only in the transcription field."
      )
    );
  }

  const unique = new Map();
  for (const finding of findings) unique.set(finding.issue, finding);
  return [...unique.values()];
}

export function buildExampleSurfaceGrammarFindings(rows) {
  const blockers = [];
  let checked = 0;
  for (const row of rows) {
    checked += 1;
    for (const finding of validateExampleSurfaceGrammar(row)) {
      blockers.push({
        ...finding,
        set_id: rowSetId(row),
        display_order: row.display_order ?? row.displayOrder ?? null,
        meaning_id: rowMeaningId(row),
        example_id: row.example_id ?? row.exampleId ?? row.context_example_id ?? null,
        language_code: rowLanguageCode(row),
        canonical_example_en: rowCanonicalExample(row),
        example_text: rowExampleText(row),
      });
    }
  }
  return { blockers, checked };
}

export function formatExampleSurfaceGrammarFinding(finding) {
  return `${finding.set_id ?? "unknown"} ${finding.language_code ?? "??"}/${finding.meaning_id ?? "unknown"}: ${finding.issue}; canonical="${finding.canonical_example_en ?? ""}"; example="${finding.example_text ?? ""}"`;
}
