import { validateTargetExamplePedagogicalQuality } from "./target-example-pedagogical-quality.mjs";

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeComparable(value) {
  return normalizeText(value)
    .toLowerCase()
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

function rowExample(row) {
  return normalizeText(row.canonical_example_en ?? row.source_example_en ?? row.example_text);
}

function rowCanonical(row) {
  return normalizeText(row.canonical_english ?? row.canonicalEnglish);
}

function stripArticle(value) {
  return normalizeComparable(value).replace(/^(?:a|an|the)\s+/u, "");
}

function looksLikeNeedTemplate(example) {
  return /^(?:i|we|you|he|she|they)\s+need(?:s)?\s+to\b/iu.test(normalizeText(example));
}

function looksLikeGenericPlaceholder(example) {
  const text = normalizeComparable(example);
  return /\b(?:the|some)\s+(?:thing|item|object|stuff)\b/u.test(text);
}

function locativeTautology(row) {
  const example = normalizeText(rowExample(row));
  const canonical = stripArticle(rowCanonical(row));
  if (!canonical || !example) return null;

  const match = example.match(/^(?:the|a|an)\s+(.+?)\s+(?:is|are)\s+(in|inside|on|at|near|under|above|beside|next to)\s+(?:the|a|an)\s+(.+?)\.?$/iu);
  if (!match) return null;

  const subject = stripArticle(match[1]);
  const preposition = normalizeComparable(match[2]);
  const location = stripArticle(match[3]);
  const canonicalTokens = canonical.split(" ").filter(Boolean);
  if (canonicalTokens.length < 2) return null;

  const isInLocative = preposition === "in" || preposition === "inside";
  const isHeadTautology = subject === canonical && isInLocative && canonical === `${location} head`;

  if (isHeadTautology) {
    return "locative example repeats part of the target term as its own location";
  }
  return null;
}

function templateKey(row) {
  const canonical = stripArticle(rowCanonical(row));
  let example = normalizeComparable(rowExample(row));
  if (canonical) example = example.replace(new RegExp(`\\b${canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "u"), "{target}");
  example = example.replace(/\b(?:a|an|the)\s+\{target\}/gu, "{target}");
  return example;
}

export function buildBaseExampleNaturalnessFindings(rows) {
  const blockers = [];
  const warnings = [];

  for (const row of rows) {
    const issues = [];
    const example = rowExample(row);
    if (looksLikeNeedTemplate(example)) {
      issues.push("context example uses a repeated learner-poor need-to template");
    }
    if (looksLikeGenericPlaceholder(example)) {
      issues.push("context example uses a generic placeholder instead of a concrete topic object");
    }
    const tautology = locativeTautology(row);
    if (tautology) issues.push(tautology);
    const pedagogicalIssues = validateTargetExamplePedagogicalQuality({
      ...row,
      language_code: "EN",
      example_text: example,
      target_example: example,
      canonical_example_en: example,
      source_example_en: example,
      target_display_word: rowCanonical(row),
    });
    for (const issue of pedagogicalIssues.filter((candidate) => candidate.severity === "fail")) {
      issues.push(issue.issue);
    }
    for (const issue of pedagogicalIssues.filter((candidate) => candidate.severity === "warning")) {
      warnings.push({
        severity: "warning",
        set_id: rowSetId(row),
        reason: issue.issue,
        template: "target_example_pedagogical_quality",
        count: 1,
        active_meaning_count: rows.length,
        sample: `${rowMeaningId(row)}="${example}"`,
      });
    }

    for (const issue of issues) {
      blockers.push({
        severity: "fail",
        set_id: rowSetId(row),
        meaning_id: rowMeaningId(row),
        example_id: row.example_id,
        canonical_english: rowCanonical(row),
        canonical_example_en: example,
        issue,
      });
    }
  }

  const bySet = new Map();
  for (const row of rows) {
    const setId = rowSetId(row);
    if (!setId) continue;
    if (!bySet.has(setId)) bySet.set(setId, []);
    bySet.get(setId).push(row);
  }

  for (const [setId, setRows] of bySet.entries()) {
    const byTemplate = new Map();
    for (const row of setRows) {
      const key = templateKey(row);
      if (!key) continue;
      if (!byTemplate.has(key)) byTemplate.set(key, []);
      byTemplate.get(key).push(row);
    }

    for (const [key, templateRows] of byTemplate.entries()) {
      if (templateRows.length < 10 && templateRows.length < Math.ceil(setRows.length * 0.4)) continue;
      warnings.push({
        severity: "warning",
        set_id: setId,
        reason: "many English examples share the same normalized template; review for repetitive low-value anchors",
        template: key,
        count: templateRows.length,
        active_meaning_count: setRows.length,
        sample: templateRows
          .slice(0, 5)
          .map((row) => `${rowMeaningId(row)}="${rowExample(row)}"`)
          .join(" | "),
      });
    }
  }

  return { blockers, warnings };
}

export function formatBaseExampleNaturalnessBlocker(blocker) {
  return `${blocker.set_id} ${blocker.meaning_id}: ${blocker.issue}; example="${blocker.canonical_example_en}"`;
}

export function formatBaseExampleNaturalnessWarning(warning) {
  return `${warning.set_id}: ${warning.reason}; template="${warning.template}"; count=${warning.count}/${warning.active_meaning_count}; ${warning.sample}`;
}
