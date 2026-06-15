#!/usr/bin/env node
import path from "node:path";
import { psqlJson, readRows } from "./lib/qa-utils.mjs";
import {
  summarizeCandidatePool,
  validateCandidatePoolRows,
  writeCandidatePoolOutputs,
} from "./lib/deck-candidate-pool.mjs";
import { resolveDeckSpec } from "./lib/deck-spec-utils.mjs";

const args = process.argv.slice(2);
const requestedDeck = args.find((arg) => !arg.startsWith("--"));
const inputPath = args.filter((arg) => !arg.startsWith("--"))[1];
const allowInvalid = args.includes("--allow-invalid");

if (!requestedDeck || !inputPath) {
  throw new Error("Usage: node scripts/compile-deck-candidate-pool.mjs <Sort|set_id> <candidate-input.jsonl|csv> [--allow-invalid]");
}

const { masterRow, spec } = resolveDeckSpec(requestedDeck);
if (!spec) {
  throw new Error(`Deck ${masterRow.sort}::${masterRow.deck} has no spec file; candidate pool cannot be compiled.`);
}

function normalizeCanonical(value) {
  return String(value ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/^(?:a|an|the|to)\s+/u, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const existingRows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    lower(regexp_replace(regexp_replace(mu.canonical_english, '^(a|an|the|to)\\s+', '', 'i'), '[^[:alnum:]]+', ' ', 'g')) as canonical_key,
    mu.meaning_id,
    mu.canonical_english,
    array_agg(distinct msm.set_id order by msm.set_id) as set_ids
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  where msm.quality_status <> 'blocked'
  group by mu.meaning_id, mu.canonical_english
) rows;
`);
const existingByCanonical = new Map(existingRows.map((row) => [String(row.canonical_key ?? "").trim(), row]));
const inputRows = await readRows(path.resolve(inputPath));
const passthroughFields = [
  "scope_decision",
  "duplicate_reuse_decision",
  "compound_multiword_risk",
  "translation_risk",
  "required_qa_profile",
  "meaning_note",
  "english_with_article",
  "current_context_example_en",
  "display_order",
  "selected_meaning_id",
  "spec_file",
];

const rows = inputRows.map((row) => {
  const canonicalKey = normalizeCanonical(row.canonical_english);
  const existing = existingByCanonical.get(canonicalKey);
  const next = {
    canonical_english: row.canonical_english ?? "",
    part_of_speech: row.part_of_speech ?? "",
    domain: row.domain ?? spec.domain,
    level: row.level ?? spec.levelLabel,
    cefr: row.cefr ?? `${spec.levelMin}-${spec.levelMax}`,
    frequency_band: row.frequency_band ?? spec.frequencyScope,
    priority_band: row.priority_band ?? spec.priorityScope,
    include_rule_matched: row.include_rule_matched ?? "",
    exclude_rule_hit: row.exclude_rule_hit ?? "",
    duplicate_risk: row.duplicate_risk ?? (existing ? "exact_generated_match" : "none"),
    existing_meaning_id: row.existing_meaning_id ?? existing?.meaning_id ?? "",
    source_support: row.source_support ?? "",
    translation_coverage_risk: row.translation_coverage_risk ?? "",
    example_feasibility: row.example_feasibility ?? "",
    score: row.score ?? "",
    decision: row.decision ?? "backup",
    decision_note: row.decision_note ?? "",
    move_target: row.move_target ?? "",
    pool_size_exception_reason: row.pool_size_exception_reason ?? "",
  };
  for (const field of passthroughFields) {
    if (row[field] !== undefined) next[field] = row[field];
  }
  if (existing && !row.decision_note) {
    next.decision_note = `Existing generated surface match in ${existing.set_ids.join(", ")}; review before selecting.`;
  }
  return next;
});

const summary = summarizeCandidatePool(rows, spec);
const errors = validateCandidatePoolRows(rows, spec);
if (errors.length > 0 && !allowInvalid) {
  throw new Error(`Compiled candidate pool is not valid:\n${errors.join("\n")}`);
}

const outputs = await writeCandidatePoolOutputs({ rows, setId: spec.setId, summary });
console.log(
  `Candidate pool compiled for ${spec.setId}: rows=${summary.rows}, selected=${summary.selected}, backup=${summary.backup}, excluded=${summary.excluded}`
);
console.log(outputs.poolPath);
console.log(outputs.summaryPath);
