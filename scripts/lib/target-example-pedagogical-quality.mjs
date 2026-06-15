const locationPrepositions = new Set([
  "in",
  "inside",
  "on",
  "at",
  "near",
  "beside",
  "next",
  "under",
  "above",
  "over",
  "below",
]);

export const targetExamplePedagogicalQualityRuleVersion =
  "card-content-model-v3-target-example-pedagogical-quality";

const weakHeadNouns = new Set([
  "head",
  "seat",
  "shelf",
  "cabinet",
  "drawer",
  "rack",
  "holder",
  "hook",
  "area",
]);

const partWholeReviewHeads = new Set(["seat", "holder", "hook", "rack"]);

const functionWords = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "for",
  "and",
  "in",
  "on",
  "at",
  "near",
  "beside",
  "under",
  "above",
  "over",
  "below",
  "inside",
  "outside",
  "le",
  "la",
  "les",
  "de",
  "du",
  "des",
  "der",
  "die",
  "das",
  "o",
  "os",
  "as",
  "um",
  "uma",
  "en",
  "ett",
  "et",
]);

function normalize(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/[.!?。！？।။។։]+$/u, "")
    .replace(/\s+/g, " ");
}

function normalizeComparable(value) {
  return normalize(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(value) {
  return normalizeComparable(value)
    .split(" ")
    .filter((token) => token && !functionWords.has(token));
}

function parseScene(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function canonicalTokens(row) {
  return tokens(row.canonical_english ?? row.canonicalEnglish ?? row.target_display_word ?? row.display_word);
}

function locationTokens(row) {
  const scene = parseScene(row.semantic_scene ?? row.context_semantic_scene);
  return tokens(scene.state_or_location ?? row.state_or_location ?? "");
}

function locativeSeverityFromText(value) {
  const comparable = normalizeComparable(value);
  if (/^(?:near|beside|next|by|under|above|over|below)\b/u.test(comparable)) return "warning";
  return "fail";
}

function selfContainerSceneSeverity(row) {
  const targetTokens = canonicalTokens(row);
  const scene = parseScene(row.semantic_scene ?? row.context_semantic_scene);
  const locationText = scene.state_or_location ?? row.state_or_location ?? "";
  const locTokens = locationTokens(row);
  if (targetTokens.length < 2 || locTokens.length === 0) return null;

  const targetSet = new Set(targetTokens);
  const locSet = new Set(locTokens);
  const nonHeadTargetTokens = targetTokens.filter((token) => !weakHeadNouns.has(token));
  if (nonHeadTargetTokens.length === 0) return null;

  const allLocationTokensAreTargetModifiers = [...locSet].every((token) => targetSet.has(token));
  const targetModifierInLocation = nonHeadTargetTokens.some((token) => locSet.has(token));

  return allLocationTokensAreTargetModifiers && targetModifierInLocation
    ? locativeSeverityFromText(locationText)
    : null;
}

function englishSelfLocationExampleSeverity(row) {
  const example = normalizeComparable(row.example_text ?? row.target_example ?? row.source_example_en ?? row.canonical_example_en);
  const targetTokens = canonicalTokens(row);
  if (!example || targetTokens.length < 2) return null;

  const words = example.split(" ").filter(Boolean);
  const targetModifierTokens = targetTokens.filter((token) => !weakHeadNouns.has(token));
  if (targetModifierTokens.length === 0) return null;

  for (let index = 0; index < words.length; index += 1) {
    if (!locationPrepositions.has(words[index])) continue;
    const tail = words.slice(index + 1).filter((token) => !functionWords.has(token));
    if (tail.length === 0) continue;
    if (tail.every((token) => targetModifierTokens.includes(token))) {
      return locativeSeverityFromText(words.slice(index).join(" "));
    }
  }
  return null;
}

function isPartWholeReviewCase(row) {
  const targetTokens = canonicalTokens(row);
  const head = targetTokens[targetTokens.length - 1];
  return partWholeReviewHeads.has(head);
}

export function validateTargetExamplePedagogicalQuality(row) {
  const issues = [];
  const selfContainerSeverity =
    selfContainerSceneSeverity(row) ?? englishSelfLocationExampleSeverity(row);
  if (selfContainerSeverity) {
    issues.push({
      severity: isPartWholeReviewCase(row) ? "warning" : selfContainerSeverity,
      issue: "example uses a self-container or category-location scene that teaches the surrounding category instead of a useful contrast",
    });
  }
  return issues;
}

export function buildTargetExamplePedagogicalQualityFindings(rows) {
  const blockers = [];
  const warnings = [];
  for (const row of rows) {
    for (const issue of validateTargetExamplePedagogicalQuality(row)) {
      const finding = {
        severity: issue.severity,
        set_id: row.set_id ?? row.setId,
        meaning_id: row.meaning_id ?? row.meaningId,
        example_id: row.example_id ?? row.exampleId,
        language_code: row.language_code ?? row.languageCode,
        canonical_english: row.canonical_english ?? row.canonicalEnglish ?? "",
        display_word: row.target_display_word ?? row.display_word ?? "",
        example_text: row.example_text ?? row.target_example ?? row.source_example_en ?? row.canonical_example_en ?? "",
        issue: issue.issue,
      };
      if (issue.severity === "fail") blockers.push(finding);
      else warnings.push(finding);
    }
  }
  return { blockers, warnings };
}

export function formatTargetExamplePedagogicalQualityFinding(finding) {
  return `${finding.set_id} ${finding.language_code}/${finding.meaning_id}: ${finding.issue}; canonical="${finding.canonical_english}"; example="${finding.example_text}"`;
}
