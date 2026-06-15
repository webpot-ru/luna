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
const outputDir = path.resolve(args.get("out-dir") ?? "outputs/english-core-3000/candidate-pools");

const levelOrder = new Map([
  ["A1", 1],
  ["A2", 2],
  ["B1", 3],
  ["B2", 4],
  ["C1", 5],
  ["C2", 6],
]);

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizedKey(value) {
  return normalizeText(value).toLocaleLowerCase("en-US");
}

function safeId(value) {
  return normalizedKey(value).replace(/[^\p{Letter}\p{Number}]+/gu, "_").replace(/^_+|_+$/g, "");
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function unique(values) {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

function levelMin(levels) {
  return unique(levels).sort((a, b) => (levelOrder.get(a) ?? 99) - (levelOrder.get(b) ?? 99))[0] ?? "";
}

function ngslBand(rank) {
  if (rank <= 1000) return "core_1000";
  if (rank <= 2000) return "core_2000";
  return "core_3000";
}

function posRisk(posValues) {
  const pos = new Set(posValues.map((value) => value.toLowerCase()));
  if ([...pos].some((value) => ["preposition", "determiner", "pronoun", "auxiliary verb", "modal auxiliary", "conjunction", "be-verb", "do-verb", "have-verb", "infinitive-to"].includes(value))) {
    return "grammar_sensitive";
  }
  if ([...pos].some((value) => ["noun", "verb", "adjective", "adverb"].includes(value))) return "ordinary_vocab";
  return "needs_pos_review";
}

function exampleFeasibility(posValues) {
  const risk = posRisk(posValues);
  if (risk === "grammar_sensitive") {
    return "medium: high-frequency function word; needs a short learner-safe example that teaches usage without turning into a grammar lesson.";
  }
  if (risk === "ordinary_vocab") {
    return "high: common A1/A2 vocabulary item should support a short US English learner example.";
  }
  return "medium: CEFR-J POS is missing or unusual; example feasibility needs manual review before generation.";
}

function senseSplitRisk(posValues, levels) {
  if (posValues.length > 1) return `medium: CEFR-J has multiple POS values (${posValues.join(", ")}); selected meaning_id must pick one learner-safe sense.`;
  if (levels.length > 1) return `medium: CEFR-J has multiple level values (${levels.join(", ")}); level_min/level_max must be chosen deliberately.`;
  return "low: single CEFR-J POS/level match in current snapshot.";
}

function decisionNote(decision, row) {
  if (decision === "selected") {
    return "Selected proposal for first A1/A2 pilot by NGSL rank, CEFR-J A1/A2 cross-check and first-release function-word quota. Still requires meaning_id, meaning_note, semantic_scene, US English example and QA evidence before generation.";
  }
  if (decision === "backup") {
    return "Backup candidate for the same A1/A2 slice; keep available if selected rows fail sense, duplicate, translation, or example checks.";
  }
  return "Needs manual review before selection because CEFR-J A1/A2 support is missing or ambiguous in the current deterministic join.";
}

async function main() {
  const contract = JSON.parse(await fs.readFile(contractPath, "utf8"));
  if (contract.approved_for_generation !== false) {
    throw new Error("Candidate pool builder refuses contracts approved_for_generation.");
  }

  const snapshot = contract.latest_source_snapshot;
  if (snapshot?.status !== "checked_ok") {
    throw new Error("Candidate pool requires latest_source_snapshot.status=checked_ok.");
  }

  const ngslPath = path.resolve(snapshot.sources.find((source) => source.source_id === "ngsl_1_2")?.normalized_path ?? "");
  const cefrPath = path.resolve(snapshot.sources.find((source) => source.source_id === "cefr_j_wordlist")?.normalized_path ?? "");
  const ngslRows = (await readJsonl(ngslPath)).sort((a, b) => Number(a.source_rank) - Number(b.source_rank));
  const cefrRows = await readJsonl(cefrPath);

  const cefrByKey = new Map();
  for (const row of cefrRows) {
    const key = normalizedKey(row.normalized_headword);
    if (!key) continue;
    const bucket = cefrByKey.get(key) ?? [];
    bucket.push(row);
    cefrByKey.set(key, bucket);
  }

  const candidates = [];
  let selectedCount = 0;
  let selectedGrammarSensitiveCount = 0;
  const functionWordLimit = Number(contract.candidate_pool_contract.first_release_function_word_selected_limit ?? 30);
  for (const ngsl of ngslRows) {
    const key = normalizedKey(ngsl.normalized_headword);
    if (!key) continue;
    const rank = Number(ngsl.source_rank);
    const cefrMatches = cefrByKey.get(key) ?? [];
    const levels = unique(cefrMatches.map((row) => row.source_level));
    const posValues = unique(cefrMatches.map((row) => row.part_of_speech));
    const hasA1A2 = levels.includes("A1") || levels.includes("A2");
    const level = levelMin(levels);
    const risk = posRisk(posValues);
    let decision = "needs_review";
    if (hasA1A2) {
      const grammarEligible = risk === "grammar_sensitive" && selectedGrammarSensitiveCount < functionWordLimit;
      const ordinaryEligible = risk !== "grammar_sensitive";
      if (selectedCount < contract.course.target_selected_rows && (ordinaryEligible || grammarEligible)) {
        decision = "selected";
        selectedCount += 1;
        if (risk === "grammar_sensitive") selectedGrammarSensitiveCount += 1;
      } else {
        decision = "backup";
      }
    }

    candidates.push({
      release_id: releaseId,
      course_id: contract.course.course_id,
      source_candidate_id: `english_core_3000::${rank}::${safeId(ngsl.source_headword)}`,
      source_headword: ngsl.source_headword,
      normalized_headword: key,
      part_of_speech: posValues.join("|") || "needs_review",
      ngsl_rank: String(rank),
      ngsl_band: ngslBand(rank),
      cefr_j_level: levels.join("|") || "not_matched",
      level_min: level || "needs_review",
      level_max: unique(levels).sort((a, b) => (levelOrder.get(b) ?? 0) - (levelOrder.get(a) ?? 0))[0] ?? "needs_review",
      oxford_benchmark_match: "not_checked_no_oxford_source_snapshot",
      source_support: `NGSL 1.2 rank ${rank}; CEFR-J matches=${cefrMatches.length}; levels=${levels.join("|") || "none"}; pos=${posValues.join("|") || "none"}.`,
      duplicate_risk: "pending_lunacards_meaning_reuse_check",
      sense_split_risk: senseSplitRisk(posValues, levels),
      translation_coverage_risk: "pending_54_language_source_assisted_preflight",
      example_feasibility: exampleFeasibility(posValues),
      selection_profile: risk,
      selection_decision: decision,
      decision_note: decisionNote(decision, { levels, posValues }),
      source_status: decision === "needs_review" ? "needs_review" : "source_candidate",
      required_next_gates: "meaning_id_assignment,duplicate_reuse_review,semantic_scene,us_english_example,english_transcription_source_review,54_language_preflight",
      ngsl_source_candidate_id: ngsl.source_candidate_id,
      cefr_j_source_candidate_ids: cefrMatches.map((row) => row.source_candidate_id).join("|"),
    });

    if (candidates.length >= contract.candidate_pool_contract.min_rows && selectedCount >= contract.candidate_pool_contract.selected_rows) break;
  }

  await fs.mkdir(outputDir, { recursive: true });
  const poolPath = path.join(outputDir, `${releaseId}_candidate_pool.jsonl`);
  const summaryPath = path.join(outputDir, `${releaseId}_candidate_pool_summary.md`);
  await fs.writeFile(poolPath, `${candidates.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");

  const counts = candidates.reduce((acc, row) => {
    acc[row.selection_decision] = (acc[row.selection_decision] ?? 0) + 1;
    return acc;
  }, {});
  const selectedProfileCounts = candidates
    .filter((row) => row.selection_decision === "selected")
    .reduce((acc, row) => {
      acc[row.selection_profile] = (acc[row.selection_profile] ?? 0) + 1;
      return acc;
    }, {});
  await fs.writeFile(
    summaryPath,
    [
      `# Candidate Pool: ${releaseId}`,
      "",
      `- Rows: ${candidates.length}`,
      `- Selected: ${counts.selected ?? 0}`,
      `- Backup: ${counts.backup ?? 0}`,
      `- Needs review: ${counts.needs_review ?? 0}`,
      `- Selected ordinary vocabulary: ${selectedProfileCounts.ordinary_vocab ?? 0}`,
      `- Selected grammar-sensitive/function rows: ${selectedProfileCounts.grammar_sensitive ?? 0}`,
      "",
      "Built from checked NGSL 1.2 and CEFR-J Wordlist 1.6 source snapshots.",
      `Function-word selected cap: ${functionWordLimit}`,
      "This is not generation approval.",
      "",
    ].join("\n"),
    "utf8"
  );

  console.log(
    `English Core 3000 candidate pool written: ${path.relative(process.cwd(), poolPath)} rows=${candidates.length} selected=${counts.selected ?? 0} backup=${counts.backup ?? 0} needs_review=${counts.needs_review ?? 0}`
  );
}

await main();
