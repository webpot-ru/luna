#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { isSpanishA1Ipa, transcribeSpanishText } from "./lib/spanish-pronunciation.mjs";

const ROOT = process.cwd();
let RELEASE_ID = "spanish_a1_core_part_001_300_v1";
const DEFAULT_MODEL = "gemini-3.1-pro-preview";
let CONTRACT_PATH = path.join(ROOT, "config/spanish-a1-core-release-contract-v1.json");
const LANGUAGE_ORDER_PATH = path.join(ROOT, "config/language-order.json");
let CANDIDATE_POOL_PATH;
const SUPPORT_DIR = path.join(ROOT, "outputs/spanish-a1-core/support-translations");
const CACHE_DIR = path.join(ROOT, "outputs/spanish-a1-core/qa/gemini-sample-audit-cache");
const SAMPLE_POSITIONS = [1, 75, 150, 225, 300];
const GEMINI_AUTH_PROMPT_RE = /Opening authentication page in your browser\.\s*Do you want to continue\?/u;
const HAS_SENTENCE_TERMINAL_RE = /\p{Sentence_Terminal}$/u;

function parseArgs(argv) {
  const args = {
    withGemini: false,
    model: DEFAULT_MODEL,
    groupSize: 8,
    timeoutMs: 900000,
    date: new Date().toISOString().slice(0, 10).replaceAll("-", ""),
    force: false,
    contract: CONTRACT_PATH,
    release: null,
    candidatePool: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (raw === "--with-gemini") args.withGemini = true;
    else if (raw === "--force") args.force = true;
    else if (raw.startsWith("--model=")) args.model = raw.slice("--model=".length);
    else if (raw.startsWith("--group-size=")) args.groupSize = Number(raw.slice("--group-size=".length));
    else if (raw.startsWith("--timeout-ms=")) args.timeoutMs = Number(raw.slice("--timeout-ms=".length));
    else if (raw.startsWith("--date=")) args.date = raw.slice("--date=".length);
    else if (raw.startsWith("--contract=")) args.contract = raw.slice("--contract=".length);
    else if (raw.startsWith("--release=")) args.release = raw.slice("--release=".length);
    else if (raw.startsWith("--candidate-pool=")) args.candidatePool = raw.slice("--candidate-pool=".length);
    else throw new Error(`Unknown argument: ${raw}`);
  }
  if (!Number.isInteger(args.groupSize) || args.groupSize < 1 || args.groupSize > 12) {
    throw new Error("--group-size must be an integer from 1 to 12");
  }
  return args;
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").replace(/\u00a0/gu, " ").replace(/\s+/gu, " ").trim();
}

function isDashPlaceholder(value) {
  return ["-", "–", "—"].includes(normalizeText(value));
}

function rel(filePath) {
  return path.relative(ROOT, filePath);
}

function codeSlug(code) {
  return String(code).toLowerCase().replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
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
        throw new Error(`${rel(filePath)}:${index + 1}: ${error.message}`);
      }
    });
}

function selectedRows(rows) {
  return rows
    .filter((row) => normalizeText(row.selection_decision) === "selected")
    .sort((a, b) => Number(a.selection_order) - Number(b.selection_order));
}

function supportFilePath(languageCode) {
  return path.join(SUPPORT_DIR, `${RELEASE_ID}_support_translation_batch_${codeSlug(languageCode)}_v1.jsonl`);
}

function cachePathFor({ model, groupIndex, languages, records }) {
  const hash = createHash("sha256")
    .update(JSON.stringify({ model, languages, records }))
    .digest("hex")
    .slice(0, 16);
  return path.join(
    CACHE_DIR,
    `${RELEASE_ID}_sample_audit_${String(groupIndex).padStart(2, "0")}_${languages.join("_").replace(/-/gu, "_")}_${hash}.json`
  );
}

function localSourceChecks(row, variantCode) {
  const display = variantCode === "ES" ? row.display_ES : row.display_ES_419;
  const example = variantCode === "ES" ? row.example_ES : row.example_ES_419;
  const transcription = variantCode === "ES" ? row.transcription_ES : row.transcription_ES_419;
  const blockers = [];
  if (!normalizeText(display)) blockers.push("blank display");
  if (!normalizeText(example)) blockers.push("blank source example");
  if (!normalizeText(transcription)) blockers.push("blank source transcription");
  if (normalizeText(transcription) !== transcribeSpanishText(display, variantCode)) {
    blockers.push("source transcription must match Spanish A1 broad learner IPA for this variant");
  }
  if (!isSpanishA1Ipa(transcription)) {
    blockers.push("source transcription must be slash-wrapped broad learner IPA");
  }
  if (normalizeText(example) && !HAS_SENTENCE_TERMINAL_RE.test(normalizeText(example))) {
    blockers.push("source example lacks sentence-final punctuation");
  }
  return {
    release_id: RELEASE_ID,
    row_id: row.row_id,
    language_code: variantCode,
    display,
    example,
    transcription,
    translation_status: blockers.length ? "blocker" : "pass",
    example_status: blockers.length ? "blocker" : "pass",
    transcription_status: blockers.length ? "blocker" : "pass",
    overall_status: blockers.length ? "blocker" : "pass",
    notes: blockers.join("; ") || "Spanish source display/example/transcription sample check passed.",
  };
}

function localSupportChecks(row, supportRow, language) {
  const display = normalizeText(supportRow?.display_translation ?? supportRow?.display);
  const example = normalizeText(supportRow?.example_translation ?? supportRow?.example);
  const blockers = [];
  if (!supportRow) blockers.push("missing support row");
  if (normalizeText(supportRow?.row_id) !== row.row_id) blockers.push("row_id mismatch");
  if (normalizeText(supportRow?.language_code ?? supportRow?.spreadsheet_code) !== language.spreadsheetCode) {
    blockers.push("language code mismatch");
  }
  if (!display) blockers.push("blank display translation");
  if (isDashPlaceholder(display)) blockers.push("dash placeholder display translation");
  if (!example) blockers.push("blank example translation");
  if (/[\t\r\n]/u.test(display) || /[\t\r\n]/u.test(example)) blockers.push("tab/newline in display or example");
  if (example && !HAS_SENTENCE_TERMINAL_RE.test(example)) blockers.push("example lacks sentence-final punctuation");
  return {
    release_id: RELEASE_ID,
    row_id: row.row_id,
    language_code: language.spreadsheetCode,
    language_name: language.language,
    source_display_ES: row.display_ES,
    source_display_ES_419: row.display_ES_419,
    meaning_note: row.meaning_note,
    semantic_scene: row.semantic_scene,
    source_example_ES: row.example_ES,
    display,
    example,
    local_status: blockers.length ? "blocker" : "pass",
    local_notes: blockers.join("; ") || "Shape check passed.",
  };
}

function buildGeminiPrompt(languages, records) {
  return [
    "You are QA-reviewing a small sample from LunaCards Spanish A1 learner-support vocabulary cards.",
    "Return valid JSON only. Do not use Markdown fences.",
    "Review only the provided target display/example against the Spanish source item, meaning note, semantic scene and source example.",
    "Use status pass, warn or blocker.",
    "Use blocker only for clear semantic error, wrong target language/script, copied Spanish where it is not a normal borrowing, or an example that is clearly unnatural/nonsensical or not scene-aligned.",
    "Use warn for minor style/article/register concerns that do not make the card wrong.",
    "Do not block acceptable synonyms, article differences, or concise beginner phrasing.",
    "This audit is an AI sample review, not native-speaker certification.",
    "",
    `Languages: ${languages.map((language) => `${language.spreadsheetCode} (${language.language})`).join("; ")}`,
    "",
    "Return shape:",
    JSON.stringify({
      reviews: [
        {
          language_code: "EN",
          row_id: "spa_a1_0001",
          display_status: "pass",
          example_status: "pass",
          overall_status: "pass",
          notes: "short reason",
        },
      ],
    }),
    "",
    "Records:",
    JSON.stringify(records),
  ].join("\n");
}

function runGemini(prompt, model, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn("gemini", ["--skip-trust", "-m", model, "-p", prompt], {
      cwd: ROOT,
      detached: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let authPromptAccepted = false;
    let timedOut = false;
    const acceptAuthPromptIfPresent = (text) => {
      if (!authPromptAccepted && GEMINI_AUTH_PROMPT_RE.test(text)) {
        authPromptAccepted = true;
        child.stdin.write("Y\n");
      }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
    }, timeoutMs);
    child.stdout.on("data", (data) => {
      const text = data.toString();
      stdout += text;
      acceptAuthPromptIfPresent(stdout);
    });
    child.stderr.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      acceptAuthPromptIfPresent(stderr);
    });
    child.stdin.write("Y\n");
    child.stdin.end();
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`Gemini timed out after ${timeoutMs}ms\nSTDERR:\n${stderr}\nSTDOUT:\n${stdout}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`Gemini exited ${code}\nSTDERR:\n${stderr}\nSTDOUT:\n${stdout}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function parseGeminiJson(stdout) {
  let response = stdout.trim();
  try {
    const wrapper = JSON.parse(stdout);
    if (wrapper?.response !== undefined) response = normalizeText(wrapper.response);
    else return wrapper;
  } catch {
    // Gemini CLI may return raw model text.
  }
  response = response.replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "").trim();
  try {
    return JSON.parse(response);
  } catch (error) {
    const start = response.indexOf("{");
    const end = response.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(response.slice(start, end + 1));
    throw error;
  }
}

function validateReviews(payload, records) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.reviews)) {
    throw new Error("Gemini audit payload missing reviews array");
  }
  if (payload.reviews.length !== records.length) {
    throw new Error(`Gemini audit returned ${payload.reviews.length} reviews, expected ${records.length}`);
  }
  const expectedKeys = records.map((record) => `${record.language_code}:${record.row_id}`);
  for (const [index, review] of payload.reviews.entries()) {
    const key = `${normalizeText(review.language_code)}:${normalizeText(review.row_id)}`;
    if (key !== expectedKeys[index]) {
      throw new Error(`Gemini review ${index + 1} key mismatch ${key} !== ${expectedKeys[index]}`);
    }
    for (const field of ["display_status", "example_status", "overall_status"]) {
      if (!new Set(["pass", "warn", "blocker"]).has(normalizeText(review[field]))) {
        throw new Error(`Gemini review ${key} has invalid ${field}: ${review[field]}`);
      }
    }
  }
}

async function geminiReviewGroups({ languageGroups, recordsByLanguage, model, timeoutMs, force }) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const reviews = [];
  for (const [groupIndex, languages] of languageGroups.entries()) {
    const records = languages.flatMap((language) => recordsByLanguage.get(language.spreadsheetCode) ?? []);
    const cachePath = cachePathFor({ model, groupIndex, languages: languages.map((language) => language.spreadsheetCode), records });
    let payload;
    try {
      if (!force) payload = await readJson(cachePath);
    } catch {
      payload = null;
    }
    if (!payload) {
      const prompt = buildGeminiPrompt(languages, records);
      const result = await runGemini(prompt, model, timeoutMs);
      payload = parseGeminiJson(result.stdout);
      validateReviews(payload, records);
      await writeJson(cachePath, {
        model,
        languages: languages.map((language) => language.spreadsheetCode),
        records,
        reviews: payload.reviews,
        raw_stderr: result.stderr,
      });
    } else {
      validateReviews(payload, records);
    }
    reviews.push(...payload.reviews.map((review) => ({ ...review, audit_cache: rel(cachePath) })));
    console.log(`sample_audit_group=${groupIndex + 1}/${languageGroups.length} languages=${languages.map((l) => l.spreadsheetCode).join(",")} reviews=${records.length}`);
  }
  return reviews;
}

const args = parseArgs(process.argv.slice(2));
CONTRACT_PATH = path.resolve(args.contract);
const [contract, languageOrder] = await Promise.all([
  readJson(CONTRACT_PATH),
  readJson(LANGUAGE_ORDER_PATH),
]);
RELEASE_ID = args.release ?? contract.default_release?.release_id ?? RELEASE_ID;
CANDIDATE_POOL_PATH = path.resolve(
  args.candidatePool ?? path.join(ROOT, "outputs/spanish-a1-core/candidate-pools", `${RELEASE_ID}_candidate_pool.jsonl`)
);
const candidateRows = await readJsonl(CANDIDATE_POOL_PATH);
if (contract.default_release?.release_id !== RELEASE_ID) {
  throw new Error(`Unexpected release id in contract: ${contract.default_release?.release_id}`);
}
const sourceRows = selectedRows(candidateRows);
if (sourceRows.length !== Number(contract.default_release.expected_row_count)) {
  throw new Error(`Expected ${contract.default_release.expected_row_count} selected rows, got ${sourceRows.length}`);
}
const sampleRows = SAMPLE_POSITIONS.map((position) => sourceRows[position - 1]);
const sourceChecks = sampleRows.flatMap((row) => [localSourceChecks(row, "ES"), localSourceChecks(row, "ES-419")]);

const supportLanguages = languageOrder.filter((language) => !["ES", "ES-419"].includes(language.spreadsheetCode));
const supportChecks = [];
const recordsByLanguage = new Map();
for (const language of supportLanguages) {
  const rows = await readJsonl(supportFilePath(language.spreadsheetCode));
  const byRowId = new Map(rows.map((row) => [normalizeText(row.row_id), row]));
  const records = sampleRows.map((sourceRow) => localSupportChecks(sourceRow, byRowId.get(sourceRow.row_id), language));
  recordsByLanguage.set(language.spreadsheetCode, records);
  supportChecks.push(...records);
}

let geminiReviews = [];
if (args.withGemini) {
  const languageGroups = chunk(supportLanguages, args.groupSize);
  geminiReviews = await geminiReviewGroups({
    languageGroups,
    recordsByLanguage,
    model: args.model,
    timeoutMs: args.timeoutMs,
    force: args.force,
  });
}

const reviewByKey = new Map(geminiReviews.map((review) => [`${review.language_code}:${review.row_id}`, review]));
const combinedSupportChecks = supportChecks.map((check) => {
  const review = reviewByKey.get(`${check.language_code}:${check.row_id}`);
  return {
    ...check,
    gemini_display_status: review?.display_status ?? (args.withGemini ? "missing" : "not_run"),
    gemini_example_status: review?.example_status ?? (args.withGemini ? "missing" : "not_run"),
    gemini_overall_status: review?.overall_status ?? (args.withGemini ? "missing" : "not_run"),
    gemini_notes: review?.notes ?? "",
    audit_cache: review?.audit_cache ?? "",
  };
});

const localBlockers = [
  ...sourceChecks.filter((check) => check.overall_status === "blocker"),
  ...supportChecks.filter((check) => check.local_status === "blocker"),
];
const geminiBlockers = combinedSupportChecks.filter((check) => check.gemini_overall_status === "blocker");
const geminiWarnings = combinedSupportChecks.filter((check) => check.gemini_overall_status === "warn");
const missingGemini = args.withGemini ? combinedSupportChecks.filter((check) => check.gemini_overall_status === "missing") : [];
const blockers = [
  ...localBlockers.map((check) => ({
    kind: "local",
    language_code: check.language_code,
    row_id: check.row_id,
    notes: check.notes ?? check.local_notes,
  })),
  ...geminiBlockers.map((check) => ({
    kind: "gemini",
    language_code: check.language_code,
    row_id: check.row_id,
    notes: check.gemini_notes,
  })),
  ...missingGemini.map((check) => ({
    kind: "gemini_missing",
    language_code: check.language_code,
    row_id: check.row_id,
    notes: "Gemini review missing for sampled support row.",
  })),
];

const reportJsonPath = path.join(
  ROOT,
  "outputs/spanish-a1-core/qa",
  `${RELEASE_ID}_sample_quality_audit_${args.date}.json`
);
const reportMdPath = reportJsonPath.replace(/\.json$/iu, ".md");
const summary = {
  release_id: RELEASE_ID,
  status: blockers.length ? "blocked" : "pass",
  audit_method: args.withGemini
    ? "deterministic local checks plus Gemini CLI AI sample review"
    : "deterministic local checks only",
  does_not_replace: "native-speaker certification or full row-by-row linguistic audit",
  sample_positions: SAMPLE_POSITIONS,
  sampled_source_rows: sampleRows.map((row) => row.row_id),
  source_language_variants_checked: 2,
  support_languages_checked: supportLanguages.length,
  source_sample_checks: sourceChecks.length,
  support_sample_checks: combinedSupportChecks.length,
  gemini_reviews: geminiReviews.length,
  warnings: geminiWarnings.length,
  blockers: blockers.length,
  model: args.withGemini ? args.model : null,
  checked_at: new Date().toISOString(),
};
const report = {
  summary,
  blockers,
  warnings: geminiWarnings.map((check) => ({
    language_code: check.language_code,
    row_id: check.row_id,
    display: check.display,
    example: check.example,
    notes: check.gemini_notes,
  })),
  source_checks: sourceChecks,
  support_checks: combinedSupportChecks,
};
await writeJson(reportJsonPath, report);
await fs.writeFile(
  reportMdPath,
  [
    `# Spanish A1 Sample Quality Audit - ${RELEASE_ID}`,
    "",
    `- Status: ${summary.status}`,
    `- Method: ${summary.audit_method}`,
    `- Does not replace: ${summary.does_not_replace}`,
    `- Sample positions: ${SAMPLE_POSITIONS.join(", ")}`,
    `- Source rows: ${summary.sampled_source_rows.join(", ")}`,
    `- Source checks: ${summary.source_sample_checks}`,
    `- Support language checks: ${summary.support_sample_checks}`,
    `- Gemini reviews: ${summary.gemini_reviews}`,
    `- Warnings: ${summary.warnings}`,
    `- Blockers: ${summary.blockers}`,
    "",
    "## Blockers",
    "",
    ...(blockers.length
      ? blockers.map((blocker) => `- ${blocker.kind} ${blocker.language_code} ${blocker.row_id}: ${blocker.notes}`)
      : ["None."]),
    "",
    "## Warnings",
    "",
    ...(geminiWarnings.length
      ? geminiWarnings.map((check) => `- ${check.language_code} ${check.row_id}: ${check.gemini_notes}`)
      : ["None."]),
    "",
  ].join("\n"),
  "utf8"
);

console.log(JSON.stringify({ ...summary, report_json: rel(reportJsonPath), report_md: rel(reportMdPath) }, null, 2));
if (blockers.length) process.exitCode = 1;
