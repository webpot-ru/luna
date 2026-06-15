function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeComparable(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
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

function normalizeLocation(location) {
  return normalizeComparable(location).replace(/^(?:the|a|an)\s+/u, "");
}

export function templateSkeletonForEnglishExample(example) {
  const text = normalizeComparable(example);
  const locative = text.match(
    /^(?:the|a|an)?\s*.+?\s+(is|are)\s+(on|in|near|beside|by|under|above|next to|inside|over)\s+(.+)$/u
  );
  if (locative) {
    return `{target} ${locative[1]} ${locative[2]} ${normalizeLocation(locative[3])}`;
  }

  const imperative = text.match(/^([a-z]+)\s+(?:the|a|an)\s+.+$/u);
  if (imperative) return `${imperative[1]} {object}`;

  return text.replace(/^(?:the|a|an)\s+.+?\s+/u, "{target} ");
}

function affectedRows(rows) {
  return rows.map((row) => ({
    set_id: rowSetId(row),
    meaning_id: rowMeaningId(row),
    example_id: row.example_id,
    canonical_example_en: rowExample(row),
  }));
}

export function buildExampleTemplateDiversityFindings(rows) {
  const blockers = [];
  const warnings = [];
  const rowsBySet = new Map();

  for (const row of rows) {
    const setId = rowSetId(row);
    if (!setId) continue;
    if (!rowsBySet.has(setId)) rowsBySet.set(setId, []);
    rowsBySet.get(setId).push(row);
  }

  for (const [setId, setRows] of rowsBySet.entries()) {
    const bySkeleton = new Map();
    for (const row of setRows) {
      const skeleton = templateSkeletonForEnglishExample(rowExample(row));
      if (!skeleton) continue;
      if (!bySkeleton.has(skeleton)) bySkeleton.set(skeleton, []);
      bySkeleton.get(skeleton).push(row);
    }

    for (const [skeleton, group] of bySkeleton.entries()) {
      const count = group.length;
      const ratio = setRows.length > 0 ? count / setRows.length : 0;
      if (count >= 15 && ratio >= 0.4) {
        blockers.push({
          severity: "fail",
          set_id: setId,
          skeleton,
          count,
          total: setRows.length,
          ratio,
          reason: "one English example template dominates the deck and weakens card diversity",
          affected_rows: affectedRows(group),
        });
      } else if (count >= 8 && ratio >= 0.25) {
        warnings.push({
          severity: "warning",
          set_id: setId,
          skeleton,
          count,
          total: setRows.length,
          ratio,
          reason: "English examples reuse one template often enough to review for learning value",
          affected_rows: affectedRows(group),
        });
      }
    }
  }

  return { blockers, warnings };
}

export function formatExampleTemplateDiversityFinding(finding) {
  return `${finding.set_id} skeleton="${finding.skeleton}" count=${finding.count}/${finding.total}: ${finding.reason}`;
}
