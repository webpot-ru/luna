#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { readRows, psqlExec, psqlJson, sqlNullableString, sqlString, toCsv } from "./lib/qa-utils.mjs";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("--"));

function argValue(name, fallback = null) {
  const prefix = `${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const setId = argValue("--set-id");
const outputDir = argValue("--output-dir", "outputs/reuse");
const applySafe = args.includes("--apply-safe");
const safeSetIdPattern = /^[a-z0-9_]+$/;

if (!inputPath) {
  throw new Error(
    "Usage: node scripts/generate-meaning-reuse-plan.mjs <candidates.csv|jsonl> --set-id=<set_id> [--apply-safe]"
  );
}

if (!setId || !safeSetIdPattern.test(setId)) {
  throw new Error("--set-id is required and must match /^[a-z0-9_]+$/.");
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeNullable(value) {
  const normalized = normalizeText(value);
  return normalized || "";
}

function getCandidateValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && String(row[key]).trim() !== "") return String(row[key]).trim();
  }
  return "";
}

function candidateFingerprint(row) {
  return {
    canonicalEnglish: normalizeText(getCandidateValue(row, ["canonical_english", "canonicalEnglish", "EN", "en"])),
    partOfSpeech: normalizeText(getCandidateValue(row, ["part_of_speech", "partOfSpeech", "pos"])),
    meaningNote: normalizeText(getCandidateValue(row, ["meaning_note", "meaningNote"])),
    domain: normalizeNullable(getCandidateValue(row, ["default_domain", "domain", "context_domain"])),
    area: normalizeNullable(getCandidateValue(row, ["default_area", "area", "context_area"])),
    category: normalizeNullable(getCandidateValue(row, ["default_category", "category", "context_category"])),
  };
}

function dbFingerprint(row) {
  return {
    canonicalEnglish: normalizeText(row.canonical_english),
    partOfSpeech: normalizeText(row.part_of_speech),
    meaningNote: normalizeText(row.meaning_note),
    domain: normalizeNullable(row.default_domain),
    area: normalizeNullable(row.default_area),
    category: normalizeNullable(row.default_category),
  };
}

function fingerprintsMatch(candidate, existing) {
  return (
    candidate.canonicalEnglish === existing.canonicalEnglish &&
    candidate.partOfSpeech === existing.partOfSpeech &&
    candidate.meaningNote === existing.meaningNote &&
    candidate.domain === existing.domain &&
    candidate.area === existing.area &&
    candidate.category === existing.category
  );
}

function parseDisplayOrder(row, fallback) {
  const raw = getCandidateValue(row, ["display_order", "displayOrder", "order"]);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid display_order=${raw}; expected positive integer.`);
  }
  return value;
}

function buildOutputName() {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "").replace(/Z$/, "Z");
  return `meaning_reuse_plan_${setId}_${timestamp}`;
}

const setRows = await psqlJson(`
select coalesce(json_agg(row_to_json(content_sets)), '[]'::json)
from content_sets
where set_id = ${sqlString(setId)};
`);

if (setRows.length === 0) {
  throw new Error(`content_set not found for --set-id=${setId}. Create the deck before applying reuse memberships.`);
}

const existingMeanings = await psqlJson(`
select coalesce(json_agg(row_to_json(existing)), '[]'::json)
from (
  select
    mu.meaning_id,
    mu.canonical_english,
    mu.english_with_article,
    mu.part_of_speech,
    mu.meaning_note,
    mu.default_domain,
    mu.default_area,
    mu.default_category,
    mu.level,
    mu.frequency_band,
    mu.priority_band,
    mu.quality_status,
    count(le.language_code) filter (where le.quality_status in ('approved', 'generated_checked')) as final_entry_count,
    count(le.language_code) filter (where le.pronunciation_status in ('approved', 'generated_checked', 'not_applicable')) as final_pronunciation_count
  from meaning_units mu
  left join meaning_language_entries le on le.meaning_id = mu.meaning_id
  where mu.quality_status <> 'blocked'
  group by mu.meaning_id
  order by mu.canonical_english, mu.meaning_id
) existing;
`);

const existingMemberships = await psqlJson(`
select coalesce(json_agg(row_to_json(existing_memberships)), '[]'::json)
from (
  select meaning_id, display_order
  from meaning_set_memberships
  where set_id = ${sqlString(setId)}
) existing_memberships;
`);

const existingById = new Map(existingMeanings.map((row) => [row.meaning_id, row]));
const existingMembershipIds = new Set(existingMemberships.map((row) => row.meaning_id));
const existingDisplayOrders = new Map(
  existingMemberships
    .filter((row) => row.display_order !== null && row.display_order !== undefined)
    .map((row) => [Number(row.display_order), row.meaning_id])
);
const existingBySurface = new Map();

for (const existing of existingMeanings) {
  const key = `${normalizeText(existing.canonical_english)}::${normalizeText(existing.part_of_speech)}`;
  if (!existingBySurface.has(key)) existingBySurface.set(key, []);
  existingBySurface.get(key).push(existing);
}

const candidates = await readRows(inputPath);
if (candidates.length === 0) {
  throw new Error(`No candidate rows found in ${inputPath}`);
}

const planRows = candidates.map((row, index) => {
  const candidateId =
    getCandidateValue(row, ["candidate_id", "candidateId", "id"]) || `candidate_${String(index + 1).padStart(3, "0")}`;
  const requestedMeaningId = getCandidateValue(row, ["meaning_id", "meaningId", "reuse_meaning_id"]);
  const fingerprint = candidateFingerprint(row);
  const displayOrder = parseDisplayOrder(row, index + 1);
  const contextDomain = getCandidateValue(row, ["context_domain", "domain", "default_domain"]);
  const contextArea = getCandidateValue(row, ["context_area", "area", "default_area"]);
  const contextCategory = getCandidateValue(row, ["context_category", "category", "default_category"]);
  const contextNote = getCandidateValue(row, ["context_note", "contextNote"]);

  const base = {
    candidate_id: candidateId,
    display_order: displayOrder,
    candidate_meaning_id: requestedMeaningId,
    candidate_canonical_english: fingerprint.canonicalEnglish,
    candidate_part_of_speech: fingerprint.partOfSpeech,
    candidate_meaning_note: fingerprint.meaningNote,
    context_domain: contextDomain,
    context_area: contextArea,
    context_category: contextCategory,
    context_note: contextNote,
    reuse_meaning_id: "",
    decision: "",
    apply_status: "not_applied",
    reason: "",
    existing_canonical_english: "",
    existing_meaning_note: "",
    existing_domain: "",
    existing_area: "",
    existing_category: "",
    final_entry_count: "",
    final_pronunciation_count: "",
  };

  if (!fingerprint.canonicalEnglish || !fingerprint.partOfSpeech || !fingerprint.meaningNote) {
    return {
      ...base,
      decision: "blocked_incomplete_candidate",
      reason: "canonical_english, part_of_speech and meaning_note are required for reuse safety.",
    };
  }

  if (requestedMeaningId) {
    const existing = existingById.get(requestedMeaningId);
    if (!existing) {
      return {
        ...base,
        decision: "blocked_unknown_meaning_id",
        reason: `Requested meaning_id does not exist: ${requestedMeaningId}`,
      };
    }

    const existingFp = dbFingerprint(existing);
    if (
      fingerprint.canonicalEnglish !== existingFp.canonicalEnglish ||
      fingerprint.partOfSpeech !== existingFp.partOfSpeech
    ) {
      return {
        ...base,
        decision: "blocked_explicit_mismatch",
        reason: "Requested meaning_id exists, but canonical_english or part_of_speech does not match candidate row.",
        reuse_meaning_id: existing.meaning_id,
        existing_canonical_english: existing.canonical_english,
        existing_meaning_note: existing.meaning_note,
        existing_domain: existing.default_domain,
        existing_area: existing.default_area,
        existing_category: existing.default_category,
        final_entry_count: existing.final_entry_count,
        final_pronunciation_count: existing.final_pronunciation_count,
      };
    }

    if (!fingerprintsMatch(fingerprint, existingFp)) {
      return {
        ...base,
        decision: "needs_review_explicit_partial_match",
        reason:
          "Requested meaning_id matches canonical_english and part_of_speech, but meaning_note or taxonomy fingerprint is not exact. Do not auto-apply.",
        reuse_meaning_id: existing.meaning_id,
        existing_canonical_english: existing.canonical_english,
        existing_meaning_note: existing.meaning_note,
        existing_domain: existing.default_domain,
        existing_area: existing.default_area,
        existing_category: existing.default_category,
        final_entry_count: existing.final_entry_count,
        final_pronunciation_count: existing.final_pronunciation_count,
      };
    }

    return {
      ...base,
      decision: existingMembershipIds.has(existing.meaning_id)
        ? "already_in_set"
        : "safe_reuse_explicit_meaning_id",
      reason:
        "Candidate explicitly references an existing meaning_id with exact canonical_english, part_of_speech, meaning_note and taxonomy fingerprint.",
      reuse_meaning_id: existing.meaning_id,
      existing_canonical_english: existing.canonical_english,
      existing_meaning_note: existing.meaning_note,
      existing_domain: existing.default_domain,
      existing_area: existing.default_area,
      existing_category: existing.default_category,
      final_entry_count: existing.final_entry_count,
      final_pronunciation_count: existing.final_pronunciation_count,
    };
  }

  const surfaceKey = `${fingerprint.canonicalEnglish}::${fingerprint.partOfSpeech}`;
  const surfaceMatches = existingBySurface.get(surfaceKey) ?? [];
  const exactFingerprintMatches = surfaceMatches.filter((existing) =>
    fingerprintsMatch(fingerprint, dbFingerprint(existing))
  );

  if (exactFingerprintMatches.length === 1) {
    const existing = exactFingerprintMatches[0];
    return {
      ...base,
      decision: existingMembershipIds.has(existing.meaning_id) ? "already_in_set" : "safe_reuse_exact_fingerprint",
      reason:
        "Exact canonical_english, part_of_speech, meaning_note and taxonomy fingerprint match an existing meaning_id.",
      reuse_meaning_id: existing.meaning_id,
      existing_canonical_english: existing.canonical_english,
      existing_meaning_note: existing.meaning_note,
      existing_domain: existing.default_domain,
      existing_area: existing.default_area,
      existing_category: existing.default_category,
      final_entry_count: existing.final_entry_count,
      final_pronunciation_count: existing.final_pronunciation_count,
    };
  }

  if (exactFingerprintMatches.length > 1) {
    return {
      ...base,
      decision: "blocked_duplicate_exact_fingerprint",
      reason: `More than one existing meaning has the exact same fingerprint: ${exactFingerprintMatches
        .map((item) => item.meaning_id)
        .join(", ")}`,
    };
  }

  if (surfaceMatches.length > 0) {
    return {
      ...base,
      decision: surfaceMatches.length === 1 ? "needs_review_surface_match" : "blocked_ambiguous_surface_word",
      reason: `Surface word matches existing meaning_id(s), but meaning fingerprint is not exact: ${surfaceMatches
        .map((item) => item.meaning_id)
        .join(", ")}`,
      reuse_meaning_id: surfaceMatches.length === 1 ? surfaceMatches[0].meaning_id : "",
      existing_canonical_english: surfaceMatches.length === 1 ? surfaceMatches[0].canonical_english : "",
      existing_meaning_note: surfaceMatches.length === 1 ? surfaceMatches[0].meaning_note : "",
      existing_domain: surfaceMatches.length === 1 ? surfaceMatches[0].default_domain : "",
      existing_area: surfaceMatches.length === 1 ? surfaceMatches[0].default_area : "",
      existing_category: surfaceMatches.length === 1 ? surfaceMatches[0].default_category : "",
      final_entry_count: surfaceMatches.length === 1 ? surfaceMatches[0].final_entry_count : "",
      final_pronunciation_count: surfaceMatches.length === 1 ? surfaceMatches[0].final_pronunciation_count : "",
    };
  }

  return {
    ...base,
    decision: "new_meaning_required",
    reason: "No existing meaning_id matches this candidate. Create a new meaning_unit before translation.",
  };
});

const safeDecisions = new Set(["safe_reuse_explicit_meaning_id", "safe_reuse_exact_fingerprint"]);
const safeRowsByDisplayOrder = new Map();

for (const row of planRows) {
  if (!safeDecisions.has(row.decision)) continue;
  const displayOrder = Number(row.display_order);
  const existingAtOrder = existingDisplayOrders.get(displayOrder);

  if (existingAtOrder && existingAtOrder !== row.reuse_meaning_id) {
    row.decision = "blocked_display_order_conflict";
    row.reason = `display_order=${displayOrder} is already used by ${existingAtOrder} in set_id=${setId}.`;
    continue;
  }

  if (!safeRowsByDisplayOrder.has(displayOrder)) {
    safeRowsByDisplayOrder.set(displayOrder, []);
  }
  safeRowsByDisplayOrder.get(displayOrder).push(row);
}

for (const [displayOrder, rowsAtOrder] of safeRowsByDisplayOrder.entries()) {
  const uniqueMeaningIds = new Set(rowsAtOrder.map((row) => row.reuse_meaning_id));
  if (uniqueMeaningIds.size <= 1) continue;
  for (const row of rowsAtOrder) {
    row.decision = "blocked_candidate_display_order_duplicate";
    row.reason = `display_order=${displayOrder} is duplicated inside the candidate file for ${[...uniqueMeaningIds].join(", ")}.`;
  }
}

const safeRows = planRows.filter((row) => safeDecisions.has(row.decision));

if (applySafe && safeRows.length > 0) {
  const values = safeRows
    .map((row) => {
      const source = candidates.find((candidate, index) => {
        const candidateId =
          getCandidateValue(candidate, ["candidate_id", "candidateId", "id"]) ||
          `candidate_${String(index + 1).padStart(3, "0")}`;
        return candidateId === row.candidate_id;
      });
      return `(
        ${sqlString(row.reuse_meaning_id)},
        ${sqlString(setId)},
        ${Number(row.display_order)},
        ${sqlNullableString(row.context_domain || getCandidateValue(source ?? {}, ["default_domain", "domain"]))},
        ${sqlNullableString(row.context_area || getCandidateValue(source ?? {}, ["default_area", "area"]))},
        ${sqlNullableString(row.context_category || getCandidateValue(source ?? {}, ["default_category", "category"]))},
        ${sqlNullableString(row.context_note)},
        'generated'
      )`;
    })
    .join(",\n");

  await psqlExec(`
insert into meaning_set_memberships (
  meaning_id,
  set_id,
  display_order,
  context_domain,
  context_area,
  context_category,
  context_note,
  quality_status
)
values
${values}
on conflict (meaning_id, set_id) do update set
  display_order = excluded.display_order,
  context_domain = excluded.context_domain,
  context_area = excluded.context_area,
  context_category = excluded.context_category,
  context_note = excluded.context_note,
  updated_at = now();
`);

  for (const row of planRows) {
    if (safeDecisions.has(row.decision)) row.apply_status = "applied_membership";
  }
}

await mkdir(outputDir, { recursive: true });
const outputBase = path.join(outputDir, buildOutputName());
const headers = [
  "candidate_id",
  "display_order",
  "candidate_meaning_id",
  "candidate_canonical_english",
  "candidate_part_of_speech",
  "candidate_meaning_note",
  "decision",
  "apply_status",
  "reuse_meaning_id",
  "reason",
  "existing_canonical_english",
  "existing_meaning_note",
  "existing_domain",
  "existing_area",
  "existing_category",
  "final_entry_count",
  "final_pronunciation_count",
  "context_domain",
  "context_area",
  "context_category",
  "context_note",
];

await writeFile(`${outputBase}.csv`, toCsv(planRows, headers), "utf8");
await writeFile(`${outputBase}.json`, `${JSON.stringify(planRows, null, 2)}\n`, "utf8");

const counts = planRows.reduce((accumulator, row) => {
  accumulator[row.decision] = (accumulator[row.decision] ?? 0) + 1;
  return accumulator;
}, {});

console.log("Meaning reuse plan generated");
console.log(`input_rows=${candidates.length}`);
console.log(`set_id=${setId}`);
console.log(`apply_safe=${applySafe ? "yes" : "no"}`);
console.log(`decision_counts=${JSON.stringify(counts)}`);
console.log(`csv=${outputBase}.csv`);
console.log(`json=${outputBase}.json`);
