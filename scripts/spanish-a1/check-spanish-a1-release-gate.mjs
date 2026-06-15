#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

import { isSpanishA1Ipa, transcribeSpanishText } from "./lib/spanish-pronunciation.mjs";

const ROOT = process.cwd();

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const contractPath = path.resolve(args.get("contract") ?? "config/spanish-a1-core-release-contract-v1.json");
const reportOnly = args.has("report-only");
const requireFinalSupport = args.has("require-final-support");

function todayStamp() {
  const value = new Date().toISOString().slice(0, 10);
  return value.replaceAll("-", "");
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function isBlank(value) {
  return normalizeText(value) === "";
}

function isDashPlaceholder(value) {
  return ["-", "–", "—"].includes(normalizeText(value));
}

function rel(filePath) {
  return path.relative(ROOT, filePath);
}

function issue(code, message, detail = {}) {
  return { code, message, ...detail };
}

function workbookFileName(releaseId) {
  if (releaseId !== "spanish_a1_core_part_001_300_v1") {
    return `FlashcardsLuna_${releaseId}_source_draft.xlsx`;
  }
  return "FlashcardsLuna_Spanish_A1_Core_Part_001_source_draft.xlsx";
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${filePath}:${index + 1}: ${error.message}`);
      }
    });
}

function collectIds(value, ids = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectIds(item, ids);
    return ids;
  }
  if (value && typeof value === "object") {
    if (typeof value.id === "string") ids.add(value.id);
    if (typeof value.source_id === "string") ids.add(value.source_id);
    for (const nested of Object.values(value)) collectIds(nested, ids);
  }
  return ids;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findFilesByName(rootDir, fileName, maxDepth = 4, depth = 0, matches = []) {
  if (depth > maxDepth || !(await pathExists(rootDir))) return matches;
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      await findFilesByName(fullPath, fileName, maxDepth, depth + 1, matches);
    } else if (entry.isFile() && entry.name === fileName) {
      matches.push(fullPath);
    }
  }
  return matches;
}

async function validateSourceAdvisoryReview(contract, checkedFiles, blockers) {
  const sourceLookupInfo = contract.latest_source_lookup;
  if (!sourceLookupInfo?.path) return;

  const sourceLookupPath = path.resolve(sourceLookupInfo.path);
  if (!(await pathExists(sourceLookupPath))) {
    blockers.push(issue("source_lookup_report_missing", `Latest source lookup report is missing: ${rel(sourceLookupPath)}.`));
    return;
  }

  checkedFiles.latest_source_lookup = rel(sourceLookupPath);
  let sourceLookup = null;
  try {
    sourceLookup = await readJson(sourceLookupPath);
  } catch (error) {
    blockers.push(issue("source_lookup_report_unreadable", `Latest source lookup report is unreadable: ${rel(sourceLookupPath)} (${error.message})`));
    return;
  }

  const sourceLookupBlockers = Number(sourceLookup.summary?.blockers ?? 0);
  const advisoryWarnings = Number(sourceLookup.summary?.advisory_warnings ?? sourceLookup.advisory_warnings?.length ?? 0);
  if (sourceLookupBlockers > 0) {
    blockers.push(issue("source_lookup_has_blockers", `Latest source lookup report has ${sourceLookupBlockers} blocker(s).`));
  }
  if (advisoryWarnings < 1) return;

  const reviewInfo = contract.latest_source_advisory_review;
  if (!reviewInfo?.path) {
    blockers.push(issue("source_advisory_review_missing", `Source lookup has ${advisoryWarnings} advisory warning(s), but no latest_source_advisory_review is registered in the contract.`));
    return;
  }

  const reviewPath = path.resolve(reviewInfo.path);
  if (!(await pathExists(reviewPath))) {
    blockers.push(issue("source_advisory_review_report_missing", `Latest source advisory review report is missing: ${rel(reviewPath)}.`));
    return;
  }

  checkedFiles.latest_source_advisory_review = rel(reviewPath);
  let review = null;
  try {
    review = await readJson(reviewPath);
  } catch (error) {
    blockers.push(issue("source_advisory_review_report_unreadable", `Latest source advisory review report is unreadable: ${rel(reviewPath)} (${error.message})`));
    return;
  }

  if (review.summary?.status !== "pass") {
    blockers.push(issue("source_advisory_review_not_pass", `Latest source advisory review status is ${review.summary?.status}.`));
  }
  if (Number(review.summary?.blockers ?? 0) > 0) {
    blockers.push(issue("source_advisory_review_has_blockers", `Latest source advisory review has ${review.summary.blockers} blocker(s).`));
  }
  if (Number(review.summary?.unresolved_advisories ?? 0) > 0) {
    blockers.push(issue("source_advisory_review_unresolved", `Latest source advisory review has ${review.summary.unresolved_advisories} unresolved advisory warning(s).`));
  }
  if (Number(review.summary?.reviewed_advisories ?? 0) !== advisoryWarnings) {
    blockers.push(
      issue(
        "source_advisory_review_count_mismatch",
        `Source lookup has ${advisoryWarnings} advisory warning(s), but the review covered ${review.summary?.reviewed_advisories ?? 0}.`
      )
    );
  }
  if (review.summary?.candidate_pool_mutated !== false) {
    blockers.push(issue("source_advisory_review_mutated_candidates", "Source advisory review must not mutate the candidate pool."));
  }
  if (review.summary?.approved_for_generation !== false) {
    blockers.push(issue("source_advisory_review_approved_generation", "Source advisory review must not approve generation by itself."));
  }
  if (review.summary?.source_truth_promotion !== "none_source_partial_retained") {
    blockers.push(issue("source_advisory_review_promoted_source_truth", "Source advisory review must retain source_partial posture unless a separate source-truth decision is documented."));
  }
}

async function validateSupportGenerationPlan(contract, checkedFiles, blockers) {
  const planInfo = contract.latest_support_generation_plan;
  if (!planInfo?.path) return;

  const planPath = path.resolve(planInfo.path);
  if (!(await pathExists(planPath))) {
    blockers.push(issue("support_generation_plan_missing", `Latest support-generation plan is missing: ${rel(planPath)}.`));
    return;
  }

  checkedFiles.latest_support_generation_plan = rel(planPath);
  let plan = null;
  try {
    plan = await readJson(planPath);
  } catch (error) {
    blockers.push(issue("support_generation_plan_unreadable", `Latest support-generation plan is unreadable: ${rel(planPath)} (${error.message})`));
    return;
  }

  const summary = plan.summary ?? {};
  if (summary.status !== "pass") {
    blockers.push(issue("support_generation_plan_not_pass", `Latest support-generation plan status is ${summary.status}.`));
  }
  if (Number(summary.blockers ?? 0) > 0) {
    blockers.push(issue("support_generation_plan_has_blockers", `Latest support-generation plan has ${summary.blockers} blocker(s).`));
  }
  if (Number(summary.target_support_languages ?? 0) !== 52) {
    blockers.push(issue("support_generation_language_count", `Support-generation plan targets ${summary.target_support_languages} languages, expected 52.`));
  }
  if (Number(summary.expected_support_display_cells ?? 0) !== 15600) {
    blockers.push(issue("support_generation_display_cells", `Support-generation plan expects ${summary.expected_support_display_cells} display cells, expected 15600.`));
  }
  if (Number(summary.expected_support_example_cells ?? 0) !== 15600) {
    blockers.push(issue("support_generation_example_cells", `Support-generation plan expects ${summary.expected_support_example_cells} example cells, expected 15600.`));
  }
  const sourceColumns = new Set(summary.source_language_columns ?? []);
  if (!sourceColumns.has("ES") || !sourceColumns.has("ES-419")) {
    blockers.push(issue("support_generation_source_columns", "Support-generation plan must exclude ES and ES-419 from target support batches."));
  }
  if (plan.ai_and_quota_policy?.live_generation_started_by_this_plan !== false) {
    blockers.push(issue("support_generation_started_live_ai", "Support-generation plan must not start live AI/API generation."));
  }
}

async function validateSupportReuseMap(contract, checkedFiles, blockers) {
  const reuseInfo = contract.latest_support_reuse_map;
  if (!reuseInfo?.path) return;

  const reusePath = path.resolve(reuseInfo.path);
  if (!(await pathExists(reusePath))) {
    blockers.push(issue("support_reuse_map_missing", `Latest support reuse map is missing: ${rel(reusePath)}.`));
    return;
  }

  checkedFiles.latest_support_reuse_map = rel(reusePath);
  let reuseMap = null;
  try {
    reuseMap = await readJson(reusePath);
  } catch (error) {
    blockers.push(issue("support_reuse_map_unreadable", `Latest support reuse map is unreadable: ${rel(reusePath)} (${error.message})`));
    return;
  }

  const summary = reuseMap.summary ?? {};
  if (summary.status !== "reuse_map_ready_not_final_generation") {
    blockers.push(issue("support_reuse_map_bad_status", `Latest support reuse map status is ${summary.status}.`));
  }
  if (summary.source !== "ordinary_db_read_only_translation_memory") {
    blockers.push(issue("support_reuse_map_wrong_source", "Support reuse map must be ordinary DB read-only translation memory."));
  }
  if (Number(summary.rows ?? 0) !== 300) {
    blockers.push(issue("support_reuse_map_row_count", `Support reuse map covers ${summary.rows} rows, expected 300.`));
  }
  if (Number(summary.support_language_count ?? 0) !== 52) {
    blockers.push(issue("support_reuse_map_language_count", `Support reuse map covers ${summary.support_language_count} support languages, expected 52.`));
  }
  if (Number(summary.display_cells_expected ?? 0) !== 15600) {
    blockers.push(issue("support_reuse_map_display_expected", `Support reuse map display expected=${summary.display_cells_expected}, expected 15600.`));
  }
  if (Number(summary.example_cells_expected ?? 0) !== 15600) {
    blockers.push(issue("support_reuse_map_example_expected", `Support reuse map example expected=${summary.example_cells_expected}, expected 15600.`));
  }
  if (Number(summary.example_cells_safe_to_reuse ?? 0) !== 0) {
    blockers.push(issue("support_reuse_map_example_reuse_not_allowed", "Support reuse map must not mark ordinary-deck examples as safe to reuse."));
  }
  if (summary.final_delivery_ready !== false) {
    blockers.push(issue("support_reuse_map_claims_delivery_ready", "Support reuse map is not a final delivery artifact."));
  }
}

async function validateFinalSupportBatches({ releaseId, candidatePath, languageOrderPath, checkedFiles, blockers }) {
  const supportDir = path.resolve("outputs/spanish-a1-core/support-translations");
  const rows = (await readJsonl(candidatePath)).filter(isSelected).sort((a, b) => Number(a.selection_order) - Number(b.selection_order));
  const languages = (await readJson(languageOrderPath)).filter(
    (language) => !["ES", "ES-419"].includes(language.spreadsheetCode)
  );
  const expectedRowIds = rows.map((row) => row.row_id);
  checkedFiles.final_support_dir = rel(supportDir);

  for (const language of languages) {
    const slug = language.spreadsheetCode.toLowerCase().replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
    const filePath = path.join(supportDir, `${releaseId}_support_translation_batch_${slug}_v1.jsonl`);
    if (!(await pathExists(filePath))) {
      blockers.push(issue("final_support_batch_missing", `Missing final support batch for ${language.spreadsheetCode}: ${rel(filePath)}.`));
      continue;
    }
    checkedFiles[`final_support:${language.spreadsheetCode}`] = rel(filePath);
    let supportRows = [];
    try {
      supportRows = await readJsonl(filePath);
    } catch (error) {
      blockers.push(issue("final_support_batch_unreadable", `Final support batch for ${language.spreadsheetCode} is unreadable: ${error.message}`));
      continue;
    }
    if (supportRows.length !== rows.length) {
      blockers.push(
        issue(
          "final_support_batch_row_count",
          `${language.spreadsheetCode} support rows=${supportRows.length}, expected ${rows.length}.`
        )
      );
    }
    for (const [index, row] of supportRows.entries()) {
      const rowNumber = index + 1;
      const expectedRowId = expectedRowIds[index];
      const languageCode = normalizeText(row.language_code ?? row.spreadsheet_code);
      if (normalizeText(row.release_id) !== releaseId) {
        blockers.push(issue("final_support_wrong_release_id", `${language.spreadsheetCode} row ${rowNumber} has wrong release_id.`, { row: rowNumber }));
      }
      if (normalizeText(row.row_id) !== expectedRowId) {
        blockers.push(
          issue(
            "final_support_row_identity_mismatch",
            `${language.spreadsheetCode} row ${rowNumber} row_id=${row.row_id}, expected ${expectedRowId}.`,
            { row: rowNumber }
          )
        );
      }
      if (languageCode !== language.spreadsheetCode) {
        blockers.push(issue("final_support_wrong_language", `${language.spreadsheetCode} row ${rowNumber} language=${languageCode}.`, { row: rowNumber }));
      }
      for (const field of ["display", "display_translation", "example", "example_translation", "support_translation_status", "support_example_status", "generation_source", "source_batch_id"]) {
        if (isBlank(row[field])) {
          blockers.push(issue("final_support_blank_field", `${language.spreadsheetCode} row ${rowNumber} has blank ${field}.`, { row: rowNumber }));
        }
      }
      for (const field of ["display", "display_translation"]) {
        if (isDashPlaceholder(row[field])) {
          blockers.push(
            issue(
              "final_support_dash_placeholder",
              `${language.spreadsheetCode} row ${rowNumber} uses dash placeholder in ${field}; use a localized grammar gloss when there is no direct equivalent.`,
              { row: rowNumber }
            )
          );
        }
      }
      if (/[\t\r\n]/u.test(`${row.display ?? ""}${row.display_translation ?? ""}${row.example ?? ""}${row.example_translation ?? ""}`)) {
        blockers.push(issue("final_support_tab_or_newline", `${language.spreadsheetCode} row ${rowNumber} contains tab/newline inside display/example.`, { row: rowNumber }));
      }
    }
  }
}

function selectionDecision(row) {
  return normalizeText(row.selection_decision ?? row.qa_status ?? row.source_status).toLowerCase();
}

function isSelected(row) {
  return selectionDecision(row) === "selected" || normalizeText(row.qa_status).toLowerCase() === "selected";
}

function hasTerminalPunctuation(value) {
  return /[.!?]$/u.test(normalizeText(value));
}

function likelyTemplateExample(value) {
  const text = normalizeText(value).toLowerCase();
  return (
    /^this is\b/u.test(text) ||
    /^i need\b/u.test(text) ||
    /^number[: ]/u.test(text) ||
    /^the word\b/u.test(text) ||
    /\bbiological\b/u.test(text) ||
    /\bsound decision\b/u.test(text)
  );
}

function stressedFeminineAArticleIsAllowed(row) {
  const lemma = normalizeText(row.source_lemma || row.display_ES).toLowerCase();
  return (
    normalizeText(row.gender) === "feminine" &&
    normalizeText(row.article_ES).toLowerCase() === "el" &&
    (/^([aá]gua|[aá]guila|[aá]rea|[aá]ula|[aá]lma|[aá]rma)(\b|$)/u.test(lemma) || /^hambre(\b|$)/u.test(lemma))
  );
}

function validateSpanishRows(rows, contract, releaseId, blockers, warnings) {
  const requiredFields = contract.row_identity?.required_source_fields ?? [];
  const expectedCount = Number(contract.default_release?.expected_row_count ?? 300);
  const selectedRows = rows.filter(isSelected);
  const rowIds = new Set();
  const meaningIds = new Set();
  const itemIds = new Set();

  if (selectedRows.length !== expectedCount) {
    blockers.push(issue("candidate_pool_selected_count", `Selected rows=${selectedRows.length}, expected ${expectedCount}.`));
  }
  if (rows.length < expectedCount) {
    blockers.push(issue("candidate_pool_row_count", `Candidate rows=${rows.length}, expected at least ${expectedCount}.`));
  }

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    for (const field of requiredFields) {
      if (!(field in row)) blockers.push(issue("missing_required_field", `Missing required field ${field}.`, { row: rowNumber }));
      if (field !== "qa_notes" && field in row && isBlank(row[field])) {
        blockers.push(issue("blank_required_field", `Blank required field ${field}.`, { row: rowNumber }));
      }
    }

    if (row.release_id && row.release_id !== releaseId) {
      blockers.push(issue("wrong_release_id", `Expected ${releaseId}, found ${row.release_id}.`, { row: rowNumber }));
    }
    if (row.course_id && row.course_id !== contract.default_release?.course_id) {
      blockers.push(issue("wrong_course_id", `Expected ${contract.default_release?.course_id}, found ${row.course_id}.`, { row: rowNumber }));
    }
    if (row.cefr_level && row.cefr_level !== contract.default_release?.cefr_level) {
      blockers.push(issue("wrong_cefr_level", `Expected ${contract.default_release?.cefr_level}, found ${row.cefr_level}.`, { row: rowNumber }));
    }

    for (const [field, seen, code] of [
      ["row_id", rowIds, "duplicate_row_id"],
      ["meaning_id", meaningIds, "duplicate_meaning_id"],
      ["spanish_item_id", itemIds, "duplicate_spanish_item_id"],
    ]) {
      const value = normalizeText(row[field]);
      if (!value) continue;
      if (seen.has(value)) blockers.push(issue(code, `Duplicate ${field}: ${value}.`, { row: rowNumber }));
      seen.add(value);
    }

    if (normalizeText(row.source_language) && normalizeText(row.source_language) !== "ES") {
      blockers.push(issue("wrong_source_language", `Expected source_language=ES, found ${row.source_language}.`, { row: rowNumber }));
    }

    const pos = normalizeText(row.part_of_speech).toLowerCase();
    if (pos === "noun") {
      const gender = normalizeText(row.gender);
      const article = normalizeText(row.article_ES).toLowerCase();
      if (!["masculine", "feminine", "common", "invariable", "plural_only"].includes(gender)) {
        blockers.push(issue("bad_noun_gender", `Invalid noun gender=${row.gender}.`, { row: rowNumber }));
      }
      if (!["el", "la", "los", "las", "plural_only", "not_applicable"].includes(article)) {
        blockers.push(issue("bad_noun_article", `Invalid noun article_ES=${row.article_ES}.`, { row: rowNumber }));
      }
      if (gender === "feminine" && article === "el" && !stressedFeminineAArticleIsAllowed(row)) {
        blockers.push(issue("feminine_el_article_needs_exception", "Feminine noun with article el must be a documented stressed-a exception.", { row: rowNumber }));
      }
    }

    if (pos === "verb") {
      const infinitive = normalizeText(row.verb_infinitive);
      const group = normalizeText(row.verb_group);
      if (!infinitive) blockers.push(issue("missing_verb_infinitive", "Verb row must store verb_infinitive.", { row: rowNumber }));
      if (!["-ar", "-er", "-ir", "irregular"].includes(group)) {
        blockers.push(issue("bad_verb_group", `Invalid verb_group=${row.verb_group}.`, { row: rowNumber }));
      }
    }

    if (!["noun", "verb"].includes(pos)) {
      for (const field of ["gender", "article_ES", "article_ES_419", "verb_infinitive", "verb_group"]) {
        if (!(field in row)) continue;
        if (field.startsWith("verb_") && pos !== "verb" && !["not_applicable", ""].includes(normalizeText(row[field]))) {
          warnings.push(issue("nonverb_has_verb_field_value", `${field} should usually be not_applicable for POS ${row.part_of_speech}.`, { row: rowNumber }));
        }
      }
    }

    const expectedTranscriptionES = transcribeSpanishText(row.display_ES, "ES");
    const expectedTranscriptionES419 = transcribeSpanishText(row.display_ES_419, "ES-419");
    if (normalizeText(row.transcription_ES) !== expectedTranscriptionES) {
      blockers.push(issue("es_transcription_not_broad_learner_ipa", "transcription_ES must match Spanish A1 broad learner IPA for display_ES.", { row: rowNumber }));
    }
    if (normalizeText(row.transcription_ES_419) !== expectedTranscriptionES419) {
      blockers.push(issue("es419_transcription_not_broad_learner_ipa", "transcription_ES_419 must match Spanish A1 broad learner IPA for display_ES_419.", { row: rowNumber }));
    }
    if (!isSpanishA1Ipa(row.transcription_ES) || !isSpanishA1Ipa(row.transcription_ES_419)) {
      blockers.push(issue("spanish_transcription_not_slash_wrapped_ipa", "Spanish A1 source transcription must be slash-wrapped broad learner IPA.", { row: rowNumber }));
    }
    if (!hasTerminalPunctuation(row.example_ES)) {
      blockers.push(issue("example_es_missing_terminal_punctuation", "example_ES must end with sentence punctuation.", { row: rowNumber }));
    }
    if (!hasTerminalPunctuation(row.example_ES_419)) {
      blockers.push(issue("example_es419_missing_terminal_punctuation", "example_ES_419 must end with sentence punctuation.", { row: rowNumber }));
    }
    if (likelyTemplateExample(row.example_ES) || likelyTemplateExample(row.example_ES_419)) {
      blockers.push(issue("template_or_semantic_smell_example", "Example looks like a template or known bad semantic smell.", { row: rowNumber }));
    }
  }
}

async function main() {
  const blockers = [];
  const warnings = [];
  const checkedFiles = {};

  let contract = null;
  try {
    contract = await readJson(contractPath);
    checkedFiles.contract = rel(contractPath);
  } catch (error) {
    blockers.push(issue("contract_unreadable", `Contract is missing or unreadable: ${rel(contractPath)} (${error.message})`));
  }

  const releaseId = args.get("release") ?? contract?.default_release?.release_id ?? "spanish_a1_core_part_001_300_v1";
  const runDate = args.get("date") ?? todayStamp();
  const candidatePath = path.resolve(
    args.get("candidate-pool") ?? `outputs/spanish-a1-core/candidate-pools/${releaseId}_candidate_pool.jsonl`
  );
  const exportScript = path.resolve(args.get("export-script") ?? "scripts/spanish-a1/export-spanish-a1-workbook.mjs");
  const sourceDraftWorkbook = path.resolve(
    args.get("source-draft-workbook") ?? `outputs/spanish-a1-core/source-drafts/${workbookFileName(releaseId)}`
  );
  const sourceDraftManifest = sourceDraftWorkbook.replace(/\.xlsx$/i, "_manifest.json");
  const qaDir = path.resolve(args.get("out-dir") ?? "outputs/spanish-a1-core/qa");
  const reportJson = path.join(qaDir, `${releaseId}_release_gate_${runDate}.json`);
  const reportMd = path.join(qaDir, `${releaseId}_release_gate_${runDate}.md`);

  if (contract) {
    if (!String(contract.contract_id ?? "").startsWith("spanish_a1_core_release_contract_v1")) {
      blockers.push(issue("unexpected_contract_id", `Unexpected contract_id=${contract.contract_id}.`));
    }
    if (contract.approved_for_generation === true) {
      const confirmation = contract.ai_tool_policy?.latest_explicit_user_confirmation;
      if (!confirmation?.confirmed_at || !confirmation?.scope || confirmation.paid_api_key !== false) {
        blockers.push(issue("generation_approval_missing_confirmation", "approved_for_generation=true requires an explicit quota-use confirmation record with paid_api_key=false."));
      }
      if (
        contract.latest_source_lookup?.blockers !== 0 ||
        contract.latest_source_advisory_review?.status !== "pass" ||
        contract.latest_source_draft?.xlsx_readback?.status !== "pass" ||
        contract.latest_support_generation_plan?.status !== "pass" ||
        contract.latest_support_reuse_map?.status !== "reuse_map_ready_not_final_generation"
      ) {
        blockers.push(issue("generation_approval_before_pre_gates", "approved_for_generation=true is allowed only after source lookup, advisory review, source-draft readback, support plan and reuse-map pre-gates are registered clean."));
      }
    } else if (contract.approved_for_generation !== false) {
      blockers.push(issue("bad_generation_approval_value", "approved_for_generation must be boolean false or true with explicit confirmation."));
    }
    if (contract.default_release?.release_id !== releaseId) {
      blockers.push(issue("default_release_mismatch", `Contract default release is ${contract.default_release?.release_id}, gate release is ${releaseId}.`));
    }
    if (contract.workbook?.postgres_import !== false || contract.workbook?.ordinary_deck_sort !== null) {
      blockers.push(issue("ordinary_deck_or_postgres_enabled", "Spanish A1 must not be treated as an ordinary deck/Postgres import."));
    }

    const blocked = new Set(contract.source_policy?.blocked_without_permission_or_review ?? []);
    for (const required of [
      "copy_pcic_list_order_or_text_as_release_rows",
      "copy_dele_or_siele_exam_materials",
      "claim_official_certified_approved_or_endorsed_status",
    ]) {
      if (!blocked.has(required)) blockers.push(issue("missing_no_copy_block", `Missing blocked source-policy rule: ${required}.`));
    }

    const languageOrderPath = path.resolve(contract.course?.target_language_order_source ?? "config/language-order.json");
    try {
      const languages = await readJson(languageOrderPath);
      checkedFiles.language_order = rel(languageOrderPath);
      const codes = languages.map((row) => row.spreadsheetCode);
      const expectedCount = Number(contract.course?.target_language_column_count ?? 54);
      if (codes.length !== expectedCount) {
        blockers.push(issue("language_count_mismatch", `Language order has ${codes.length} rows, contract expects ${expectedCount}.`));
      }
      for (const code of ["ES", "ES-419"]) {
        if (!codes.includes(code)) blockers.push(issue("missing_language_code", `Language order must include ${code}.`));
      }
    } catch (error) {
      blockers.push(issue("language_order_unreadable", `Language order is missing or unreadable: ${rel(languageOrderPath)} (${error.message})`));
    }

    const manifestPath = path.resolve("reference-sources/sources.manifest.json");
    const optionalPath = path.resolve("reference-sources/optional-tool-source-targets.json");
    const registryIds = new Set();
    try {
      collectIds(await readJson(manifestPath), registryIds);
      checkedFiles.sources_manifest = rel(manifestPath);
    } catch (error) {
      blockers.push(issue("sources_manifest_unreadable", `Source manifest is missing or unreadable: ${rel(manifestPath)} (${error.message})`));
    }
    try {
      collectIds(await readJson(optionalPath), registryIds);
      checkedFiles.optional_source_targets = rel(optionalPath);
    } catch (error) {
      blockers.push(issue("optional_source_targets_unreadable", `Optional source target registry is missing or unreadable: ${rel(optionalPath)} (${error.message})`));
    }

    const localSources = contract.source_policy?.local_candidate_sources ?? [];
    for (const source of localSources) {
      const sourceId = source.source_id;
      if (sourceId !== "opus-en-es" && registryIds.size > 0 && !registryIds.has(sourceId)) {
        blockers.push(issue("source_id_not_registered", `Source id ${sourceId} is not registered in source manifests.`));
      }
      const localPath = normalizeText(source.local_path);
      if (!localPath) {
        blockers.push(issue("local_source_without_path", `Source ${sourceId} has no local_path.`));
        continue;
      }
      if (localPath.includes("*")) {
        const rootBeforeGlob = localPath.slice(0, localPath.indexOf("*")).replace(/\/+$/u, "");
        const fileName = path.basename(localPath);
        const matches = await findFilesByName(path.resolve(rootBeforeGlob), fileName);
        if (!matches.length) {
          blockers.push(issue("local_source_glob_no_matches", `Source ${sourceId} has no local matches for ${localPath}.`));
        } else {
          checkedFiles[`source:${sourceId}`] = matches.map(rel);
        }
      } else {
        const fullPath = path.resolve(localPath);
        if (!(await pathExists(fullPath))) {
          blockers.push(issue("local_source_missing", `Source ${sourceId} is missing at ${localPath}.`));
        } else {
          checkedFiles[`source:${sourceId}`] = rel(fullPath);
        }
      }
    }

    await validateSourceAdvisoryReview(contract, checkedFiles, blockers);
    await validateSupportGenerationPlan(contract, checkedFiles, blockers);
    await validateSupportReuseMap(contract, checkedFiles, blockers);
    if (requireFinalSupport && (await pathExists(candidatePath))) {
      await validateFinalSupportBatches({ releaseId, candidatePath, languageOrderPath, checkedFiles, blockers });
    }
  }

  if (!(await pathExists(candidatePath))) {
    blockers.push(issue("candidate_pool_missing", `Candidate pool is missing: ${rel(candidatePath)}.`));
  } else if (contract) {
    checkedFiles.candidate_pool = rel(candidatePath);
    try {
      const rows = await readJsonl(candidatePath);
      validateSpanishRows(rows, contract, releaseId, blockers, warnings);
    } catch (error) {
      blockers.push(issue("candidate_pool_unreadable", `Candidate pool is unreadable: ${rel(candidatePath)} (${error.message})`));
    }
  }

  if (!(await pathExists(exportScript))) {
    blockers.push(issue("workbook_exporter_missing", `Workbook exporter is missing: ${rel(exportScript)}.`));
  } else {
    checkedFiles.workbook_exporter = rel(exportScript);
    if (!(await pathExists(sourceDraftWorkbook))) {
      blockers.push(issue("source_draft_workbook_missing", `Source-draft workbook is missing: ${rel(sourceDraftWorkbook)}.`));
    } else {
      checkedFiles.source_draft_workbook = rel(sourceDraftWorkbook);
    }
    if (!(await pathExists(sourceDraftManifest))) {
      blockers.push(issue("source_draft_manifest_missing", `Source-draft workbook manifest is missing: ${rel(sourceDraftManifest)}.`));
    } else {
      checkedFiles.source_draft_manifest = rel(sourceDraftManifest);
    }
  }

  const summary = {
    release_id: releaseId,
    status: blockers.length ? "blocked" : "ok",
    blockers: blockers.length,
    warnings: warnings.length,
    contract: checkedFiles.contract ?? null,
    candidate_pool: (await pathExists(candidatePath)) ? rel(candidatePath) : null,
    source_draft_workbook: (await pathExists(sourceDraftWorkbook)) ? rel(sourceDraftWorkbook) : null,
    report_only: reportOnly,
    require_final_support: requireFinalSupport,
  };

  const report = {
    summary,
    blockers,
    warnings,
    checked_files: checkedFiles,
    gate_scope:
      "Spanish A1 release contract, no-copy benchmark posture, local source availability, candidate-pool shape when present, workbook-exporter presence, and optional final support batch completeness. This gate does not import Docker/Postgres rows or upload Google Sheets.",
  };

  await fs.mkdir(qaDir, { recursive: true });
  await fs.writeFile(reportJson, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(
    reportMd,
    [
      `# ${releaseId} Release Gate`,
      "",
      `Status: ${summary.status}`,
      `Blockers: ${summary.blockers}`,
      `Warnings: ${summary.warnings}`,
      `Report only: ${summary.report_only}`,
      `Require final support: ${summary.require_final_support}`,
      "",
      "Scope: Spanish A1 contract/source posture, local source availability, candidate-pool shape when present, workbook exporter presence, and optional final support batch completeness.",
      "This gate does not import Docker/Postgres rows and does not upload Google Sheets.",
      "",
      "## Checked Files",
      "",
      ...Object.entries(checkedFiles).map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(", ") : value}`),
      "",
      "## Blockers",
      "",
      ...(blockers.length ? blockers.map((item) => `- ${item.code}${item.row ? ` row ${item.row}` : ""}: ${item.message}`) : ["- none"]),
      "",
      "## Warnings",
      "",
      ...(warnings.length ? warnings.map((item) => `- ${item.code}${item.row ? ` row ${item.row}` : ""}: ${item.message}`) : ["- none"]),
      "",
    ].join("\n"),
    "utf8"
  );

  console.log(JSON.stringify({ ...summary, report_json: rel(reportJson), report_md: rel(reportMd) }, null, 2));
  if (blockers.length && !reportOnly) process.exitCode = 1;
}

await main();
