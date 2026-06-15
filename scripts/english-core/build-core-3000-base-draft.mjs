#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const contractPath = path.resolve(args.get("contract") ?? "config/english-core-3000-source-contract-v0.json");
const releaseId = args.get("release") ?? "english_core_3000_a1_a2_part_001_150_v1";
const outputDir = path.resolve(args.get("out-dir") ?? "outputs/english-core-3000/base-drafts");

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function safeId(value) {
  return normalizeText(value)
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
}

function firstPos(posValue) {
  const parts = String(posValue ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length > 1) return "needs_review";
  return parts[0] ?? "needs_review";
}

function isNoun(pos) {
  return /\bnoun\b/i.test(pos);
}

function isVerb(pos) {
  return /\bverb\b/i.test(pos) || /^(be|do|have)-verb$/i.test(pos);
}

function startsWithVowelSound(word) {
  return /^[aeiou]/i.test(word);
}

function displayForm(row, pos) {
  const word = normalizeText(row.source_headword);
  if (isVerb(pos)) return `to ${word}`;
  return word;
}

function countabilityStatus(pos) {
  if (isNoun(pos)) return "needs_review_default_countable_singular";
  return "not_applicable";
}

function articleOrMarker(row, pos) {
  return "";
}

function proposedArticleOrMarker(row, pos) {
  if (!isNoun(pos)) return "";
  return startsWithVowelSound(row.source_headword) ? "an" : "a";
}

function semanticSceneStub(row, display) {
  return {
    rule_version: "english-core-base-draft-v0",
    status: "needs_review",
    target_object: row.normalized_headword,
    target_display: display,
    subject_number: isNoun(row.part_of_speech) ? "singular_needs_countability_review" : "not_applicable_or_needs_review",
    action_or_state: "needs_review",
    state_or_location: "needs_review",
    tense_aspect: "simple_present_or_base_usage_needs_review",
    topic_context: "general_core_english",
  };
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function writeJsonl(filePath, rows) {
  await fs.writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

async function main() {
  const contract = JSON.parse(await fs.readFile(contractPath, "utf8"));
  if (contract.approved_for_generation !== false) {
    throw new Error("Base draft builder refuses contracts approved_for_generation.");
  }

  const pool = contract.latest_candidate_pool;
  if (pool?.status !== "checked_ok") {
    throw new Error("Base draft requires latest_candidate_pool.status=checked_ok.");
  }

  const candidateRows = await readJsonl(path.resolve(pool.path));
  const selectedRows = candidateRows.filter((row) => row.selection_decision === "selected");
  if (selectedRows.length !== contract.course.target_selected_rows) {
    throw new Error(`Expected ${contract.course.target_selected_rows} selected rows, got ${selectedRows.length}.`);
  }

  const rows = selectedRows.map((row, index) => {
    const pos = firstPos(row.part_of_speech);
    const display = displayForm(row, pos);
    const meaningId = `english_core_${safeId(row.source_headword)}_${safeId(pos)}_01`;
    const isFunctionWord = row.selection_profile === "grammar_sensitive";
    return {
      release_id: releaseId,
      course_id: contract.course.course_id,
      row_id: `${releaseId}::${String(index + 1).padStart(3, "0")}`,
      core_item_id: `core3000_${String(index + 1).padStart(4, "0")}`,
      source_candidate_id: row.source_candidate_id,
      meaning_id: meaningId,
      source_language: "EN",
      source_variant: "US English",
      source_headword: row.source_headword,
      normalized_headword: row.normalized_headword,
      part_of_speech: pos,
      source_part_of_speech_candidates: row.part_of_speech,
      sense_no: "01_needs_review",
      core_band: row.ngsl_band,
      level_min: row.level_min,
      level_max: row.level_max,
      source_rank: row.ngsl_rank,
      benchmark_membership: row.oxford_benchmark_match,
      source_status: "source_candidate_needs_row_review",
      en_display: display,
      native_word_EN: row.source_headword,
      article_or_marker_EN: articleOrMarker(row, pos),
      proposed_article_or_marker_EN: proposedArticleOrMarker(row, pos),
      article_policy_status: isNoun(pos) ? "needs_countability_review_before_a_an" : "not_applicable",
      grammatical_number_EN: isNoun(pos) ? "singular_needs_review" : "not_applicable",
      countability_EN: countabilityStatus(pos),
      meaning_note: `Needs row review: US English core word "${row.source_headword}" (${pos}) selected from NGSL/CEFR-J for A1/A2 pilot. Final meaning note must choose the exact learner-safe sense before generation.`,
      semantic_scene: semanticSceneStub(row, display),
      example_EN: "",
      example_status: "needs_manual_example",
      transcription_EN: "",
      transcription_status: "needs_source_backed_transcription",
      example_transcription_EN: "",
      example_transcription_status: "needs_source_backed_example_transcription",
      function_word_flag: isFunctionWord,
      row_review_status: "needs_review",
      generation_ready: false,
      blockers: [
        ...(pos === "needs_review" ? ["part_of_speech_review_pending"] : []),
        "meaning_note_needs_exact_sense",
        ...(isNoun(pos) ? ["countability_article_review_pending"] : []),
        "semantic_scene_needs_review",
        "example_EN_missing",
        "transcription_EN_missing",
        "example_transcription_EN_missing",
        "duplicate_reuse_review_pending",
        "translation_preflight_pending",
      ],
      source_support: row.source_support,
      sense_split_risk: row.sense_split_risk,
      example_feasibility: row.example_feasibility,
      required_next_gates: row.required_next_gates,
    };
  });

  await fs.mkdir(outputDir, { recursive: true });
  const outPath = path.join(outputDir, `${releaseId}_base_draft.jsonl`);
  const summaryPath = path.join(outputDir, `${releaseId}_base_draft_summary.md`);
  await writeJsonl(outPath, rows);

  const functionRows = rows.filter((row) => row.function_word_flag).length;
  const nounRows = rows.filter((row) => isNoun(row.part_of_speech)).length;
  const verbRows = rows.filter((row) => isVerb(row.part_of_speech)).length;
  const posReviewRows = rows.filter((row) => row.part_of_speech === "needs_review").length;
  await fs.writeFile(
    summaryPath,
    [
      `# Base Draft: ${releaseId}`,
      "",
      `- Rows: ${rows.length}`,
      `- Generation ready: 0`,
      `- Needs review: ${rows.length}`,
      `- Function/grammar-sensitive rows: ${functionRows}`,
      `- POS/sense review rows: ${posReviewRows}`,
      `- Noun rows needing countability/article review: ${nounRows}`,
      `- Verb display rows with to + base draft: ${verbRows}`,
      "",
      "This artifact is a row-level skeleton only. It is not card generation approval and contains no target-language translations.",
      "",
    ].join("\n"),
    "utf8"
  );

  console.log(
    `English Core 3000 base draft written: ${path.relative(process.cwd(), outPath)} rows=${rows.length} needs_review=${rows.length} generation_ready=0`
  );
}

await main();
