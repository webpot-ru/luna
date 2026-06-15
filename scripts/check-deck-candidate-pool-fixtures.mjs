#!/usr/bin/env node
import { validateCandidatePoolRows } from "./lib/deck-candidate-pool.mjs";

const spec = {
  setId: "fixture_numbers_a1",
  targetRange: "2-3",
  status: "approved_for_generation",
};

const validRows = [
  {
    canonical_english: "one",
    part_of_speech: "number",
    domain: "Core Foundation",
    level: "Basic",
    cefr: "A1",
    frequency_band: "core",
    priority_band: "core",
    include_rule_matched: "cardinal numbers",
    exclude_rule_hit: "none",
    duplicate_risk: "none",
    existing_meaning_id: "",
    source_support: "core closed-set number",
    translation_coverage_risk: "low",
    example_feasibility: "short count example",
    scope_decision: "Inside closed-set A1 number scope.",
    duplicate_reuse_decision: "No existing meaning reuse.",
    compound_multiword_risk: "none",
    required_qa_profile: "number_quantity",
    score: 95,
    decision: "selected",
    decision_note: "Core number.",
    move_target: "",
  },
  {
    canonical_english: "two",
    part_of_speech: "number",
    domain: "Core Foundation",
    level: "Basic",
    cefr: "A1",
    frequency_band: "core",
    priority_band: "core",
    include_rule_matched: "cardinal numbers",
    exclude_rule_hit: "none",
    duplicate_risk: "none",
    existing_meaning_id: "",
    source_support: "core closed-set number",
    translation_coverage_risk: "low",
    example_feasibility: "short count example",
    scope_decision: "Inside closed-set A1 number scope.",
    duplicate_reuse_decision: "No existing meaning reuse.",
    compound_multiword_risk: "none",
    required_qa_profile: "number_quantity",
    score: 94,
    decision: "selected",
    decision_note: "Core number.",
    move_target: "",
  },
  {
    canonical_english: "third",
    part_of_speech: "ordinal number",
    domain: "Core Foundation",
    level: "Basic",
    cefr: "A1",
    frequency_band: "core",
    priority_band: "core",
    include_rule_matched: "ordinal backup",
    exclude_rule_hit: "none",
    duplicate_risk: "none",
    existing_meaning_id: "",
    source_support: "core ordinal",
    translation_coverage_risk: "medium",
    example_feasibility: "short order example",
    score: 70,
    decision: "backup",
    decision_note: "Use only if ordinal numbers are included.",
    move_target: "",
  },
  {
    canonical_english: "a dozen",
    part_of_speech: "noun phrase",
    domain: "Core Foundation",
    level: "Elementary",
    cefr: "A2",
    frequency_band: "common",
    priority_band: "useful",
    include_rule_matched: "none",
    exclude_rule_hit: "quantity phrase",
    duplicate_risk: "none",
    existing_meaning_id: "",
    source_support: "common phrase",
    translation_coverage_risk: "medium",
    example_feasibility: "phrase example",
    score: 50,
    decision: "excluded",
    decision_note: "Not a basic number word.",
    move_target: "Quantities & Measures",
  },
  {
    canonical_english: "zero",
    part_of_speech: "number",
    domain: "Core Foundation",
    level: "Basic",
    cefr: "A1",
    frequency_band: "core",
    priority_band: "core",
    include_rule_matched: "cardinal numbers",
    exclude_rule_hit: "none",
    duplicate_risk: "none",
    existing_meaning_id: "",
    source_support: "core closed-set number",
    translation_coverage_risk: "low",
    example_feasibility: "short count example",
    score: 93,
    decision: "backup",
    decision_note: "Backup for closed-set ordering.",
    move_target: "",
  },
  {
    canonical_english: "ten",
    part_of_speech: "number",
    domain: "Core Foundation",
    level: "Basic",
    cefr: "A1",
    frequency_band: "core",
    priority_band: "core",
    include_rule_matched: "cardinal numbers",
    exclude_rule_hit: "none",
    duplicate_risk: "none",
    existing_meaning_id: "",
    source_support: "core closed-set number",
    translation_coverage_risk: "low",
    example_feasibility: "short count example",
    score: 92,
    decision: "backup",
    decision_note: "Backup for closed-set ordering.",
    move_target: "",
  },
];

const validErrors = validateCandidatePoolRows(validRows, spec);
if (validErrors.length > 0) {
  throw new Error(`Expected valid candidate pool fixture, got:\n${validErrors.join("\n")}`);
}

const duplicateErrors = validateCandidatePoolRows(
  [
    { ...validRows[0], duplicate_risk: "exact_generated_match", existing_meaning_id: "existing_one" },
    ...validRows.slice(1),
  ],
  spec
);
if (!duplicateErrors.some((error) => error.includes("existing_meaning_id requires duplicate_risk=explicit_reuse"))) {
  throw new Error("Expected generated duplicate without explicit reuse to fail.");
}

const excludedMoveErrors = validateCandidatePoolRows(
  validRows.map((row) => (row.decision === "excluded" ? { ...row, move_target: "" } : row)),
  spec
);
if (!excludedMoveErrors.some((error) => error.includes("excluded row requires move_target"))) {
  throw new Error("Expected excluded row without move_target to fail.");
}

const strictContractErrors = validateCandidatePoolRows(
  [{ ...validRows[0], required_qa_profile: "" }, ...validRows.slice(1)],
  spec
);
if (!strictContractErrors.some((error) => error.includes("approved_for_generation selected row needs required_qa_profile"))) {
  throw new Error("Expected approved selected row without required_qa_profile to fail.");
}

const smallPoolErrors = validateCandidatePoolRows(validRows.slice(0, 3), spec);
if (!smallPoolErrors.some((error) => error.includes("expected at least"))) {
  throw new Error("Expected too-small pool to fail.");
}

console.log("Deck candidate pool fixtures OK.");
