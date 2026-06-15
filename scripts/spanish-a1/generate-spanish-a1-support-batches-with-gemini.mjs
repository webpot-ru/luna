#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCRIPT_VERSION = "spanish-a1-support-gemini-20260608.v2";
const DEFAULT_MODEL = "gemini-3.1-pro-preview";
const SUPPORT_DIR = path.join(ROOT, "outputs/spanish-a1-core/support-translations");
const CACHE_DIR = path.join(SUPPORT_DIR, "gemini-cache");
const LANGUAGE_ORDER_PATH = path.join(ROOT, "config/language-order.json");
const GEMINI_AUTH_PROMPT_RE = /Opening authentication page in your browser\.\s*Do you want to continue\?/u;
const HAS_SENTENCE_TERMINAL_RE = /\p{Sentence_Terminal}$/u;

const LANGUAGE_NOTES = {
  EN: "English (US). Use clear beginner-friendly English.",
  FR: "French. Include natural articles for noun display values where useful.",
  DE: "German. Include natural articles for noun display values where useful.",
  IT: "Italian. Include natural articles for noun display values where useful.",
  PT: "European Portuguese. Include natural articles for noun display values where useful.",
  RU: "Russian Cyrillic.",
  ZH: "Simplified Chinese.",
  JA: "Japanese.",
  KO: "Korean.",
  VI: "Vietnamese.",
  TH: "Thai script, with normal Thai spacing and punctuation.",
  MS: "Malay.",
  ID: "Indonesian.",
  PL: "Polish.",
  NL: "Dutch. Include natural articles for noun display values where useful.",
  SV: "Swedish. Include natural articles for noun display values where useful.",
  NO: "Norwegian Bokmal. Include natural articles for noun display values where useful.",
  DA: "Danish. Include natural articles for noun display values where useful.",
  FI: "Finnish.",
  CS: "Czech.",
  SK: "Slovak.",
  HU: "Hungarian.",
  RO: "Romanian. Include natural articles for noun display values where useful.",
  BG: "Bulgarian Cyrillic.",
  HR: "Croatian Latin.",
  SR: "Serbian Cyrillic.",
  SL: "Slovenian.",
  LT: "Lithuanian.",
  LV: "Latvian.",
  ET: "Estonian.",
  IS: "Icelandic.",
  HI: "Hindi Devanagari.",
  BN: "Bengali script.",
  TL: "Filipino.",
  MY: "Burmese Myanmar script.",
  KM: "Khmer script.",
  LO: "Lao script.",
  NE: "Nepali Devanagari.",
  SI: "Sinhala script.",
  TA: "Tamil script.",
  TE: "Telugu script.",
  KN: "Kannada script.",
  ML: "Malayalam script.",
  UZ: "Uzbek Latin.",
  KK: "Kazakh Cyrillic.",
  AZ: "Azerbaijani Latin.",
  KA: "Georgian script.",
  HY: "Armenian script.",
  TR: "Turkish.",
  SW: "Swahili.",
  "PT-BR": "Brazilian Portuguese. Include natural articles for noun display values where useful.",
  "EN-GB": "British English. Use British spelling where a real difference exists.",
};

function parseArgs(argv) {
  const args = {
    languages: [],
    groupSize: 2,
    rowChunkSize: 25,
    maxNewChunks: null,
    model: DEFAULT_MODEL,
    timeoutMs: 900000,
    contract: "config/spanish-a1-core-release-contract-v1.json",
    release: null,
    candidatePool: null,
    reuseDraft: null,
    force: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw.startsWith("--")) continue;
    const [key, inlineValue] = raw.split("=", 2);
    const needsValue = !["--force"].includes(key);
    const value = inlineValue ?? argv[index + 1];
    if (needsValue && (value === undefined || value.startsWith("--"))) {
      throw new Error(`Missing value for ${key}`);
    }
    if (needsValue && inlineValue === undefined) index += 1;
    if (key === "--languages") args.languages = value.split(",").map((item) => item.trim()).filter(Boolean);
    else if (key === "--group-size") args.groupSize = Number(value);
    else if (key === "--row-chunk-size") args.rowChunkSize = Number(value);
    else if (key === "--max-new-chunks") args.maxNewChunks = Number(value);
    else if (key === "--model") args.model = value;
    else if (key === "--timeout-ms") args.timeoutMs = Number(value);
    else if (key === "--contract") args.contract = value;
    else if (key === "--release") args.release = value;
    else if (key === "--candidate-pool") args.candidatePool = value;
    else if (key === "--reuse-draft") args.reuseDraft = value;
    else if (key === "--force") args.force = true;
    else throw new Error(`Unknown argument: ${key}`);
  }
  if (!Number.isInteger(args.groupSize) || args.groupSize < 1 || args.groupSize > 4) {
    throw new Error("--group-size must be an integer from 1 to 4");
  }
  if (!Number.isInteger(args.rowChunkSize) || args.rowChunkSize < 5 || args.rowChunkSize > 75) {
    throw new Error("--row-chunk-size must be an integer from 5 to 75");
  }
  if (
    args.maxNewChunks !== null &&
    (!Number.isInteger(args.maxNewChunks) || args.maxNewChunks < 1)
  ) {
    throw new Error("--max-new-chunks must be a positive integer");
  }
  return args;
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").replace(/\u00a0/gu, " ").replace(/\s+/gu, " ").trim();
}

function codeSlug(code) {
  return String(code).toLowerCase().replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
}

function rel(filePath) {
  return path.relative(ROOT, filePath);
}

function chunk(values, size) {
  const groups = [];
  for (let index = 0; index < values.length; index += size) groups.push(values.slice(index, index + size));
  return groups;
}

function selectedRows(rows) {
  return rows
    .filter((row) => normalizeText(row.selection_decision) === "selected")
    .sort((a, b) => Number(a.selection_order) - Number(b.selection_order));
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
        throw new Error(`${rel(filePath)}:${index + 1}: ${error.message}`);
      }
    });
}

async function writeJson(filePath, payload) {
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function sourceHashFor(rows) {
  const payload = rows.map((row) => ({
    row_id: row.row_id,
    spanish_item_id: row.spanish_item_id,
    meaning_id: row.meaning_id,
    display_ES: row.display_ES,
    display_ES_419: row.display_ES_419,
    part_of_speech: row.part_of_speech,
    meaning_note: row.meaning_note,
    semantic_scene: row.semantic_scene,
    example_ES: row.example_ES,
    example_ES_419: row.example_ES_419,
  }));
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}

function normalizeExample(value) {
  const text = normalizeText(value);
  if (!text) return "";
  return HAS_SENTENCE_TERMINAL_RE.test(text) ? text : `${text}.`;
}

function supportFilePath(releaseId, languageCode) {
  return path.join(SUPPORT_DIR, `${releaseId}_support_translation_batch_${codeSlug(languageCode)}_v1.jsonl`);
}

function summaryFilePath(releaseId, languageCode) {
  return path.join(SUPPORT_DIR, `${releaseId}_support_translation_batch_${codeSlug(languageCode)}_v1_summary.md`);
}

function batchIdFor(releaseId, languageCode) {
  return `${releaseId}_support_generation_batch_${codeSlug(languageCode)}_v1`;
}

function defaultReuseDraftPath(contract, releaseId) {
  if (contract.latest_support_reuse_map?.path) {
    const reusePath = path.resolve(contract.latest_support_reuse_map.path);
    const reuseName = path.basename(reusePath);
    const draftName = reuseName
      .replace(`${releaseId}_support_reuse_map_`, `${releaseId}_support_display_draft_from_reuse_`)
      .replace(/\.json$/iu, ".jsonl");
    return path.join(path.dirname(reusePath), draftName);
  }
  return path.join(
    ROOT,
    "outputs/spanish-a1-core/support-generation",
    `${releaseId}_support_display_draft_from_reuse_20260607-livecheck.jsonl`
  );
}

async function readReuseDraft(reuseDraftPath) {
  if (!existsSync(reuseDraftPath)) return new Map();
  const rows = await readJsonl(reuseDraftPath);
  const map = new Map();
  for (const row of rows) {
    const key = `${normalizeText(row.row_id)}:${normalizeText(row.language_code)}`;
    if (row.display) map.set(key, row);
  }
  return map;
}

function buildPrompt(languages, rows, reuseMap) {
  const sourceRows = rows.map((row) => ({
    row_id: row.row_id,
    spanish_item_id: row.spanish_item_id,
    source_display_ES: row.display_ES,
    source_display_ES_419: row.display_ES_419,
    part_of_speech: row.part_of_speech,
    gender: row.gender,
    article_ES: row.article_ES,
    meaning_note: row.meaning_note,
    semantic_scene: row.semantic_scene,
    topic_domain: row.topic_domain,
    example_ES: row.example_ES,
    example_ES_419: row.example_ES_419,
    reuse_display_by_language: Object.fromEntries(
      languages
        .map((code) => [code, reuseMap.get(`${row.row_id}:${code}`)?.display ?? ""])
        .filter(([, value]) => value)
    ),
  }));
  return [
    "You are generating learner-support translations for LunaCards Spanish A1 vocabulary cards.",
    "The Spanish source rows are internally authored by LunaCards. PCIC, DELE, SIELE and dictionaries are not row text sources.",
    "Return valid JSON only. Do not use Markdown fences.",
    "For each target language code, return exactly one output row for every source row, in the same order.",
    "Output fields per row: row_id, display, example.",
    "display is a concise natural translation of the Spanish source item in the requested target language and the given sense.",
    "example is a natural beginner-friendly translation/adaptation of the Spanish example into the target language, preserving the same scene and meaning.",
    "If reuse_display_by_language contains a value, use it only if it is correct for the row's sense and POS; otherwise repair it.",
    "Do not copy Spanish into non-Spanish target languages unless it is a true shared proper name or unavoidable borrowing.",
    "Do not include romanization, IPA, transcription, notes, tabs, newlines, source labels, or explanations inside values.",
    "Use native script for script-specific target languages. Keep examples concise and sentence-final punctuated.",
    "For article-display languages, include natural article/gender markers in display for nouns where useful.",
    "",
    `Target languages: ${languages.map((code) => `${code} (${LANGUAGE_NOTES[code] ?? code})`).join("; ")}`,
    "",
    "Required JSON shape:",
    JSON.stringify({
      by_language: {
        EN: [
          {
            row_id: "spa_a1_0001",
            display: "hello",
            example: "Hello, Ana.",
          },
        ],
      },
    }),
    "",
    "Source rows JSON:",
    JSON.stringify(sourceRows),
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
    // Plain Gemini CLI mode returns model text directly.
  }
  response = response.replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "").trim();
  try {
    return JSON.parse(response);
  } catch (error) {
    const start = response.indexOf("{");
    const end = response.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(response.slice(start, end + 1));
      } catch {
        const parsed = parseLastJsonObject(response);
        if (parsed) return parsed;
      }
    }
    throw error;
  }
}

function parseLastJsonObject(text) {
  const starts = [];
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const index = text.indexOf('{"by_language"', searchFrom);
    if (index === -1) break;
    starts.push(index);
    searchFrom = index + 1;
  }
  for (const start of starts.reverse()) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
      const char = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') {
        inString = true;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(start, index + 1));
          } catch {
            break;
          }
        }
      }
    }
  }
  return null;
}

function validatePayload(payload, languages, sourceRows) {
  if (!payload || typeof payload !== "object" || !payload.by_language || typeof payload.by_language !== "object") {
    throw new Error("Gemini payload missing by_language object");
  }
  for (const code of languages) {
    const rows = payload.by_language[code];
    if (!Array.isArray(rows)) throw new Error(`Missing by_language.${code} array`);
    if (rows.length !== sourceRows.length) throw new Error(`${code}: expected ${sourceRows.length} rows, got ${rows.length}`);
    for (const [index, row] of rows.entries()) {
      const expectedRowId = normalizeText(sourceRows[index].row_id);
      if (normalizeText(row.row_id) !== expectedRowId) {
        throw new Error(`${code}: row ${index + 1} row_id mismatch: ${row.row_id} != ${expectedRowId}`);
      }
      for (const field of ["display", "example"]) {
        const value = normalizeText(row[field]);
        if (!value) throw new Error(`${code}: ${expectedRowId} empty ${field}`);
        if (/[\t\r\n]/u.test(value)) throw new Error(`${code}: ${expectedRowId} ${field} contains tab/newline`);
      }
    }
  }
}

async function isFinalLanguageComplete(releaseId, code, sourceRows) {
  const filePath = supportFilePath(releaseId, code);
  if (!existsSync(filePath)) return false;
  try {
    const rows = await readJsonl(filePath);
    if (rows.length !== sourceRows.length) return false;
    const expectedRowIds = sourceRows.map((row) => row.row_id);
    for (const [index, row] of rows.entries()) {
      if (normalizeText(row.row_id) !== expectedRowIds[index]) return false;
      if (normalizeText(row.language_code) !== code && normalizeText(row.spreadsheet_code) !== code) return false;
      if (!normalizeText(row.display_translation ?? row.display)) return false;
      if (!normalizeText(row.example_translation ?? row.example)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function rawBaseFor(releaseId, sourceHash, rowChunkIndex, rowCount, languages) {
  return path.join(
    CACHE_DIR,
    `${releaseId}_${sourceHash}_gemini_rows_${String(rowChunkIndex).padStart(2, "0")}_n${String(rowCount).padStart(3, "0")}_${languages.join("_").replace(/-/gu, "_")}`
  );
}

async function runGeminiWithRetries(prompt, model, timeoutMs, attempts = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await runGemini(prompt, model, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, 5000 * attempt));
    }
  }
  throw lastError;
}

async function writeLanguageBatch({ releaseId, code, language, sourceRows, generatedRows, reuseMap, model }) {
  validatePayload({ by_language: { [code]: generatedRows } }, [code], sourceRows);
  const filePath = supportFilePath(releaseId, code);
  const summaryPath = summaryFilePath(releaseId, code);
  const batchId = batchIdFor(releaseId, code);
  const lines = sourceRows.map((sourceRow, index) => {
    const generated = generatedRows[index];
    const reuse = reuseMap.get(`${sourceRow.row_id}:${code}`);
    const display = normalizeText(generated.display);
    const example = normalizeExample(generated.example);
    const displayReused = reuse && normalizeText(reuse.display) === display;
    const generationSource = displayReused
      ? `${reuse.generation_source}; gemini_cli:${model}:example_generation`
      : `gemini_cli:${model}`;
    return JSON.stringify({
      release_id: releaseId,
      row_id: sourceRow.row_id,
      spanish_item_id: sourceRow.spanish_item_id,
      meaning_id: sourceRow.meaning_id,
      language_code: code,
      spreadsheet_code: code,
      db_language_code: language.dbCode,
      db_code: language.dbCode,
      language_name: language.language,
      display,
      display_translation: display,
      example,
      example_translation: example,
      support_translation_status: displayReused
        ? "reviewed_from_exact_ordinary_db_meaning_match"
        : "generated_with_gemini_cli",
      support_example_status: "generated_with_gemini_cli_scene_aligned",
      generation_source: generationSource,
      source_batch_id: batchId,
      model,
      qa_notes: displayReused
        ? "Display reused only after exact ordinary DB meaning/POS match and Gemini scene-context review; example generated from Spanish A1 source scene."
        : "Generated from Spanish A1 source display, meaning note, semantic scene and source example.",
    });
  });
  await fs.writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
  await fs.writeFile(
    summaryPath,
    [
      `# ${releaseId} ${code} Support Translation Batch`,
      "",
      `Status: complete`,
      `Language: ${code} / ${language.language}`,
      `Rows: ${sourceRows.length}`,
      `Model: ${model}`,
      `Script: ${SCRIPT_VERSION}`,
      `Output: ${rel(filePath)}`,
      "",
      "Examples are generated from Spanish A1 source scenes. Ordinary-deck examples are not reused.",
      "",
    ].join("\n"),
    "utf8"
  );
  return { filePath, summaryPath };
}

const args = parseArgs(process.argv.slice(2));
await fs.mkdir(SUPPORT_DIR, { recursive: true });
await fs.mkdir(CACHE_DIR, { recursive: true });

const CONTRACT_PATH = path.resolve(args.contract);
const contract = await readJson(CONTRACT_PATH);
const RELEASE_ID = args.release ?? contract.default_release?.release_id;
if (!RELEASE_ID) throw new Error("Missing release id; pass --release or set contract.default_release.release_id");
const CANDIDATE_POOL_PATH = path.resolve(
  args.candidatePool ?? `outputs/spanish-a1-core/candidate-pools/${RELEASE_ID}_candidate_pool.jsonl`
);
const REUSE_DRAFT_PATH = path.resolve(args.reuseDraft ?? defaultReuseDraftPath(contract, RELEASE_ID));

const [allCandidateRows, allLanguages, reuseMap] = await Promise.all([
  readJsonl(CANDIDATE_POOL_PATH),
  readJson(LANGUAGE_ORDER_PATH),
  readReuseDraft(REUSE_DRAFT_PATH),
]);

if (!String(contract.contract_id ?? "").startsWith("spanish_a1_core_release_contract_v1")) {
  throw new Error(`Unexpected contract_id: ${contract.contract_id}`);
}
if (contract.default_release?.release_id !== RELEASE_ID) {
  throw new Error(`Unexpected release_id in contract: ${contract.default_release?.release_id}`);
}

const sourceRows = selectedRows(allCandidateRows);
if (sourceRows.length !== Number(contract.default_release.expected_row_count)) {
  throw new Error(`Expected ${contract.default_release.expected_row_count} selected rows, got ${sourceRows.length}`);
}

const targetLanguages = allLanguages.filter((language) => !["ES", "ES-419"].includes(language.spreadsheetCode));
const languageByCode = new Map(targetLanguages.map((language) => [language.spreadsheetCode, language]));
const requestedLanguages = args.languages.length ? args.languages : targetLanguages.map((language) => language.spreadsheetCode);
for (const code of requestedLanguages) {
  if (!languageByCode.has(code)) throw new Error(`Unsupported target language code: ${code}`);
}

const alreadyComplete = [];
const pendingLanguages = [];
for (const code of requestedLanguages) {
  if (!args.force && (await isFinalLanguageComplete(RELEASE_ID, code, sourceRows))) {
    alreadyComplete.push(code);
  } else {
    pendingLanguages.push(code);
  }
}

if (!pendingLanguages.length) {
  console.log(
    JSON.stringify(
      {
        release_id: RELEASE_ID,
        script_version: SCRIPT_VERSION,
        status: "all_requested_languages_already_complete",
        requested_languages: requestedLanguages,
        already_complete: alreadyComplete,
      },
      null,
      2
    )
  );
  process.exit(0);
}

const sourceHash = sourceHashFor(sourceRows);
const generatedRowsByLanguage = new Map(pendingLanguages.map((code) => [code, []]));
const writtenCodes = new Set();
let groupIndex = 0;
let newChunks = 0;
let stoppedAfterMaxNewChunks = false;

groups:
for (const languages of chunk(pendingLanguages, args.groupSize)) {
  groupIndex += 1;
  let rowChunkIndex = 0;
  for (const sourceRowsChunk of chunk(sourceRows, args.rowChunkSize)) {
    rowChunkIndex += 1;
    const rawBase = rawBaseFor(RELEASE_ID, sourceHash, rowChunkIndex, sourceRowsChunk.length, languages);
    const payloadPath = `${rawBase}.payload.json`;
    const stdoutPath = `${rawBase}.stdout.txt`;
    let payload;
    let source = "cached";
    let shouldGenerate = false;
    if (existsSync(payloadPath)) {
      try {
        payload = await readJson(payloadPath);
      } catch (error) {
        source = "invalid_cached_payload_retried";
        shouldGenerate = true;
      }
    } else if (existsSync(stdoutPath)) {
      try {
        const stdout = await fs.readFile(stdoutPath, "utf8");
        payload = parseGeminiJson(stdout);
        await writeJson(payloadPath, payload);
        source = "cached_stdout";
      } catch (error) {
        source = "invalid_cached_stdout_retried";
        shouldGenerate = true;
      }
    } else {
      shouldGenerate = true;
    }
    if (shouldGenerate) {
      if (args.maxNewChunks !== null && newChunks >= args.maxNewChunks) {
        stoppedAfterMaxNewChunks = true;
        break groups;
      }
      source = source === "cached" ? "gemini" : `${source}:gemini`;
      const prompt = buildPrompt(languages, sourceRowsChunk, reuseMap);
      await fs.writeFile(`${rawBase}.prompt.txt`, prompt, "utf8");
      const { stdout, stderr } = await runGeminiWithRetries(prompt, args.model, args.timeoutMs);
      await fs.writeFile(stdoutPath, stdout, "utf8");
      if (stderr.trim()) await fs.writeFile(`${rawBase}.stderr.txt`, stderr, "utf8");
      payload = parseGeminiJson(stdout);
      await writeJson(payloadPath, payload);
      newChunks += 1;
    }
    validatePayload(payload, languages, sourceRowsChunk);
    for (const code of languages) {
      generatedRowsByLanguage.get(code).push(...payload.by_language[code]);
    }
    console.log(
      JSON.stringify(
        {
          group: groupIndex,
          row_chunk: rowChunkIndex,
          row_count: sourceRowsChunk.length,
          languages,
          source,
          new_chunks: newChunks,
        },
        null,
        2
      )
    );
  }
  if (!stoppedAfterMaxNewChunks) {
    for (const code of languages) {
      const rows = generatedRowsByLanguage.get(code);
      if (rows.length !== sourceRows.length || writtenCodes.has(code)) continue;
      const result = await writeLanguageBatch({
        releaseId: RELEASE_ID,
        code,
        language: languageByCode.get(code),
        sourceRows,
        generatedRows: rows,
        reuseMap,
        model: args.model,
      });
      writtenCodes.add(code);
      console.log(
        JSON.stringify(
          {
            group: groupIndex,
            language: code,
            status: "language_batch_written",
            file: rel(result.filePath),
            summary: rel(result.summaryPath),
          },
          null,
          2
        )
      );
    }
  }
}

const written = [];
if (!stoppedAfterMaxNewChunks) {
  for (const code of pendingLanguages) {
    if (writtenCodes.has(code)) continue;
    const rows = generatedRowsByLanguage.get(code);
    if (rows.length !== sourceRows.length) continue;
    const result = await writeLanguageBatch({
      releaseId: RELEASE_ID,
      code,
      language: languageByCode.get(code),
      sourceRows,
      generatedRows: rows,
      reuseMap,
      model: args.model,
    });
    written.push({ code, file: rel(result.filePath), summary: rel(result.summaryPath) });
  }
}

const rowsCachedByLanguage = Object.fromEntries(
  pendingLanguages.map((code) => [code, generatedRowsByLanguage.get(code).length])
);
const status = stoppedAfterMaxNewChunks || pendingLanguages.some((code) => generatedRowsByLanguage.get(code).length !== sourceRows.length)
  ? "partial_chunks_cached"
  : "complete";

console.log(
  JSON.stringify(
    {
      release_id: RELEASE_ID,
      script_version: SCRIPT_VERSION,
      status,
      model: args.model,
      source_hash: sourceHash,
      row_chunk_size: args.rowChunkSize,
      group_size: args.groupSize,
      new_chunks: newChunks,
      already_complete: alreadyComplete,
      pending_languages: pendingLanguages,
      rows_cached_by_language: rowsCachedByLanguage,
      written,
      cache_dir: rel(CACHE_DIR),
      next_step:
        status === "complete"
          ? "run support plan/gates and final workbook export"
          : "rerun the same command until each pending language reaches 300 cached rows",
    },
    null,
    2
  )
);
