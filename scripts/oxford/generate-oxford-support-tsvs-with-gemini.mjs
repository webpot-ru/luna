#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";

const SCRIPT_VERSION = "2026-06-03.v2";
const DEFAULT_RELEASE_ID = "oxford_3000_core_b1_part_003_100_v1";
const DEFAULT_CONTRACT_PATH = `config/${DEFAULT_RELEASE_ID}_contract_v0.json`;
const OUT_DIR = "config";
const RAW_DIR = "outputs/oxford-vocabulary/gemini-support-generation";
const DEFAULT_MODEL = "pro";
const HAS_SENTENCE_TERMINAL_RE = /\p{Sentence_Terminal}$/u;
const SENTENCE_END_RE = /[.!?؟۔။။！？¿။៕។]$/u;
const GEMINI_AUTH_PROMPT_RE = /Opening authentication page in your browser\.\s*Do you want to continue\?/u;
const ARTICLE_LANGUAGES = new Set(["ES", "FR", "DE", "IT", "PT", "NL", "SV", "NO", "DA", "RO", "ES-419", "PT-BR"]);
const LANGUAGE_NOTES = {
  ES: "Spanish (Spain), include natural articles for noun display values where useful.",
  FR: "French, include natural articles for noun display values where useful.",
  DE: "German, include natural articles for noun display values where useful.",
  IT: "Italian, include natural articles for noun display values where useful.",
  PT: "European Portuguese, include natural articles for noun display values where useful.",
  RU: "Russian Cyrillic.",
  ZH: "Simplified Chinese.",
  JA: "Japanese.",
  KO: "Korean.",
  VI: "Vietnamese.",
  TH: "Thai script, no spaces between Thai words except normal punctuation spacing.",
  MS: "Malay.",
  ID: "Indonesian.",
  PL: "Polish.",
  NL: "Dutch, include natural articles for noun display values where useful.",
  SV: "Swedish, include natural articles for noun display values where useful.",
  NO: "Norwegian Bokmal, include natural articles for noun display values where useful.",
  DA: "Danish, include natural articles for noun display values where useful.",
  FI: "Finnish.",
  CS: "Czech.",
  SK: "Slovak.",
  HU: "Hungarian.",
  RO: "Romanian, include natural articles for noun display values where useful.",
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
  "PT-BR": "Brazilian Portuguese, include natural articles for noun display values where useful.",
  "ES-419": "Latin American Spanish, include natural articles for noun display values where useful.",
};

function parseArgs(argv) {
  const args = {
    contract: DEFAULT_CONTRACT_PATH,
    languages: [],
    groupSize: 4,
    rowChunkSize: 300,
    maxNewRowChunks: null,
    model: DEFAULT_MODEL,
    timeoutMs: 900000,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw.startsWith("--")) continue;
    const [key, inlineValue] = raw.split("=", 2);
    const value = inlineValue ?? argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${key}`);
    if (inlineValue === undefined) index += 1;
    if (key === "--contract") args.contract = value;
    else if (key === "--languages") args.languages = value.split(",").map((item) => item.trim()).filter(Boolean);
    else if (key === "--group-size") args.groupSize = Number(value);
    else if (key === "--row-chunk-size") args.rowChunkSize = Number(value);
    else if (key === "--max-new-row-chunks") args.maxNewRowChunks = Number(value);
    else if (key === "--model") args.model = value;
    else if (key === "--timeout-ms") args.timeoutMs = Number(value);
    else throw new Error(`Unknown argument: ${key}`);
  }
  if (!Number.isInteger(args.groupSize) || args.groupSize < 1 || args.groupSize > 6) {
    throw new Error("--group-size must be an integer from 1 to 6");
  }
  if (!Number.isInteger(args.rowChunkSize) || args.rowChunkSize < 1 || args.rowChunkSize > 300) {
    throw new Error("--row-chunk-size must be an integer from 1 to 300");
  }
  if (
    args.maxNewRowChunks !== null &&
    (!Number.isInteger(args.maxNewRowChunks) || args.maxNewRowChunks < 1)
  ) {
    throw new Error("--max-new-row-chunks must be a positive integer");
  }
  if (!Number.isInteger(args.timeoutMs) || args.timeoutMs < 1000) {
    throw new Error("--timeout-ms must be an integer >= 1000");
  }
  return args;
}

function normalizeText(value) {
  return String(value ?? "").replace(/\u00a0/gu, " ").replace(/\s+/gu, " ").trim();
}

function normalizeExampleForLanguage(code, value) {
  const text = normalizeText(value);
  const normalized = code === "HY" && text.endsWith(":") ? `${text.slice(0, -1)}։` : text;
  return HAS_SENTENCE_TERMINAL_RE.test(normalized) ? normalized : `${normalized}.`;
}

function batchIdFor(code) {
  const lower = code.toLowerCase().replace(/-/gu, "_");
  return ARTICLE_LANGUAGES.has(code) ? `${lower}_article_display_v1` : `${lower}_v1`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  return (await readFile(filePath, "utf8"))
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function chunk(values, size) {
  const groups = [];
  for (let index = 0; index < values.length; index += size) groups.push(values.slice(index, index + size));
  return groups;
}

function buildPrompt(languages, rows) {
  const sourceRows = rows.map((row) => ({
    source_headword: row.source_headword,
    display_headword_EN: row.reviewed_display_headword,
    part_of_speech: row.reviewed_part_of_speech,
    meaning_note: row.meaning_note,
    example_EN: row.example_EN,
  }));
  return [
    "You are generating support-language translations for LunaCards Oxford English-learning cards.",
    "The English source text is authored by LunaCards and is not copied from Oxford definitions/examples.",
    "Return valid JSON only. Do not use Markdown fences.",
    "For each target language code, return exactly one row for every source row, in the same order.",
    "Fields per returned row: source_headword, display, example.",
    "display translates the English headword/sense for learner support; example translates example_EN naturally while preserving the same scene.",
    "Keep examples concise, natural, and sentence-final punctuated.",
    "Do not include romanization, IPA, transcription, notes, tabs, or newline characters inside values.",
    "For article-display languages, include natural article/gender markers in display for nouns where useful; otherwise use natural lemma/display form.",
    "For script-specific languages, use the native script named in the language note.",
    "",
    `Target languages: ${languages.map((code) => `${code} (${LANGUAGE_NOTES[code] ?? code})`).join("; ")}`,
    "",
    "Output schema:",
    JSON.stringify({
      by_language: {
        RU: [
          {
            source_headword: "example source headword",
            display: "translated display",
            example: "translated example sentence.",
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
    const child = spawn(
      "gemini",
      ["--skip-trust", "-m", model, "-p", prompt],
      { cwd: process.cwd(), detached: true, stdio: ["pipe", "pipe", "pipe"] }
    );
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
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      acceptAuthPromptIfPresent(stdout);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      acceptAuthPromptIfPresent(stderr);
    });
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
  let response = normalizeText(stdout);
  try {
    const wrapper = JSON.parse(stdout);
    if (wrapper?.response !== undefined) response = normalizeText(wrapper.response);
    else return wrapper;
  } catch {
    // Plain CLI mode returns the model text directly.
  }
  response = response.replace(/^```(?:json)?/iu, "").replace(/```$/u, "").trim();
  return JSON.parse(response);
}

function validatePayload(payload, languages, sourceRows) {
  if (!payload || typeof payload !== "object" || !payload.by_language) {
    throw new Error("Gemini payload missing by_language object");
  }
  for (const code of languages) {
    const rows = payload.by_language[code];
    if (!Array.isArray(rows)) throw new Error(`Missing language array: ${code}`);
    if (rows.length !== sourceRows.length) throw new Error(`${code}: expected ${sourceRows.length} rows, got ${rows.length}`);
    for (const [index, row] of rows.entries()) {
      const expected = sourceRows[index].source_headword;
      if (normalizeText(row.source_headword) !== expected) {
        throw new Error(`${code}: row ${index + 1} source_headword mismatch: ${row.source_headword} != ${expected}`);
      }
      for (const field of ["display", "example"]) {
        const value = normalizeText(row[field]);
        if (!value) throw new Error(`${code}: row ${index + 1} empty ${field}`);
        if (/[\t\r\n]/u.test(value)) throw new Error(`${code}: row ${index + 1} ${field} contains tab/newline`);
      }
      if (!HAS_SENTENCE_TERMINAL_RE.test(normalizeExampleForLanguage(code, row.example))) {
        throw new Error(`${code}: row ${index + 1} example lacks sentence punctuation`);
      }
    }
  }
}

function sourceHashFor(rows) {
  const payload = rows.map((row) => ({
    source_headword: row.source_headword,
    display_headword_EN: row.reviewed_display_headword,
    part_of_speech: row.reviewed_part_of_speech,
    meaning_note: row.meaning_note,
    example_EN: row.example_EN,
  }));
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 12);
}

async function readExistingDisplayMap(releaseId, code) {
  const batchId = batchIdFor(code);
  const filePath = path.join(OUT_DIR, `${releaseId}_support_translation_batch_${batchId}.tsv`);
  const displayBySource = new Map();
  if (!existsSync(filePath)) return displayBySource;
  const lines = (await readFile(filePath, "utf8")).split(/\r?\n/u).filter((line) => line.trim());
  for (const [index, line] of lines.entries()) {
    if (index === 0) continue;
    const [sourceHeadword, display] = line.split("\t");
    if (sourceHeadword && display) displayBySource.set(normalizeText(sourceHeadword), normalizeText(display));
  }
  return displayBySource;
}

async function writeLanguageTsv(releaseId, code, rows, existingDisplayBySource) {
  const batchId = batchIdFor(code);
  const filePath = path.join(OUT_DIR, `${releaseId}_support_translation_batch_${batchId}.tsv`);
  const lines = [`source_headword\t${code}\texample_${code}`];
  for (const row of rows) {
    const sourceHeadword = normalizeText(row.source_headword);
    const display = existingDisplayBySource.get(sourceHeadword) ?? normalizeText(row.display);
    lines.push(`${sourceHeadword}\t${display}\t${normalizeExampleForLanguage(code, row.example)}`);
  }
  await writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
  return { code, batchId, filePath };
}

function rawBaseFor(releaseId, sourceHash, groupIndex, rowChunkIndex, rowCount, languages) {
  return path.join(
    RAW_DIR,
    `${releaseId}_${sourceHash}_gemini_support_group_${String(groupIndex).padStart(2, "0")}_rows_${String(rowChunkIndex).padStart(2, "0")}_n${String(rowCount).padStart(3, "0")}_${languages.join("_").replace(/-/gu, "_")}`
  );
}

const args = parseArgs(process.argv.slice(2));
const contract = await readJson(args.contract);
const releaseId = contract.latest_source_snapshot?.release_id ?? contract.release_id ?? DEFAULT_RELEASE_ID;
const sourceRows = await readJsonl(contract.latest_english_examples.path);
const sourceHash = sourceHashFor(sourceRows);
const languageOrder = (await readJson("config/language-order.json"))
  .map((item) => item.spreadsheetCode)
  .filter((code) => !["EN", "EN-GB"].includes(code));
const requestedLanguages = args.languages.length ? args.languages : ["RU", ...languageOrder.filter((code) => code !== "RU")];
for (const code of requestedLanguages) {
  if (!languageOrder.includes(code)) throw new Error(`Unsupported language code: ${code}`);
}
await mkdir(RAW_DIR, { recursive: true });

const generatedRowsByLanguage = new Map(requestedLanguages.map((code) => [code, []]));
const existingDisplayByLanguage = new Map();
for (const code of requestedLanguages) {
  existingDisplayByLanguage.set(code, await readExistingDisplayMap(releaseId, code));
}
let groupIndex = 0;
let newRowChunks = 0;
let stoppedAfterMaxNewChunks = false;
groups: 
for (const languages of chunk(requestedLanguages, args.groupSize)) {
  groupIndex += 1;
  let rowChunkIndex = 0;
  for (const sourceRowsChunk of chunk(sourceRows, args.rowChunkSize)) {
    rowChunkIndex += 1;
    const rawBase = rawBaseFor(releaseId, sourceHash, groupIndex, rowChunkIndex, sourceRowsChunk.length, languages);
    const payloadPath = `${rawBase}.payload.json`;
    let payload;
    let source = "gemini";
    if (existsSync(payloadPath)) {
      payload = await readJson(payloadPath);
      source = "cached";
    } else {
      if (args.maxNewRowChunks !== null && newRowChunks >= args.maxNewRowChunks) {
        stoppedAfterMaxNewChunks = true;
        break groups;
      }
      const prompt = buildPrompt(languages, sourceRowsChunk);
      const { stdout, stderr } = await runGemini(prompt, args.model, args.timeoutMs);
      await writeFile(`${rawBase}.stdout.json`, stdout, "utf8");
      if (stderr.trim()) await writeFile(`${rawBase}.stderr.txt`, stderr, "utf8");
      payload = parseGeminiJson(stdout);
      await writeFile(payloadPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
      newRowChunks += 1;
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
        },
        null,
        2
      )
    );
  }
  if (!stoppedAfterMaxNewChunks) {
    const written = [];
    for (const code of languages) {
      const rows = generatedRowsByLanguage.get(code);
      if (rows.length === sourceRows.length) {
        validatePayload({ by_language: { [code]: rows } }, [code], sourceRows);
        written.push(await writeLanguageTsv(releaseId, code, rows, existingDisplayByLanguage.get(code)));
      }
    }
    if (written.length) {
      console.log(
        JSON.stringify(
          {
            group: groupIndex,
            status: "group_tsvs_written",
            tsvs: written.map((item) => item.filePath),
          },
          null,
          2
        )
      );
    }
  }
}

const rowCountsByLanguage = Object.fromEntries(
  requestedLanguages.map((code) => [code, generatedRowsByLanguage.get(code).length])
);
if (stoppedAfterMaxNewChunks || requestedLanguages.some((code) => generatedRowsByLanguage.get(code).length !== sourceRows.length)) {
  console.log(
    JSON.stringify(
      {
        release_id: releaseId,
        script_version: SCRIPT_VERSION,
        source_hash: sourceHash,
        model: args.model,
        contract: args.contract,
        status: "partial_chunks_cached_not_tsv_complete",
        row_chunk_size: args.rowChunkSize,
        new_row_chunks: newRowChunks,
        timeout_ms: args.timeoutMs,
        expected_rows_per_language: sourceRows.length,
        rows_cached_by_language: rowCountsByLanguage,
        next_step: "rerun the same command until rows_cached_by_language reaches expected_rows_per_language, then rerun without --max-new-row-chunks or with a high enough value to write final TSVs",
      },
      null,
      2
    )
  );
  process.exit(0);
}

const generated = [];
for (const code of requestedLanguages) {
  const rows = generatedRowsByLanguage.get(code);
  validatePayload({ by_language: { [code]: rows } }, [code], sourceRows);
  generated.push(await writeLanguageTsv(releaseId, code, rows, existingDisplayByLanguage.get(code)));
}

console.log(
  JSON.stringify(
    {
      release_id: releaseId,
      script_version: SCRIPT_VERSION,
      source_hash: sourceHash,
      model: args.model,
      contract: args.contract,
      row_chunk_size: args.rowChunkSize,
      timeout_ms: args.timeoutMs,
      languages: generated.map((item) => item.code),
      tsvs: generated.map((item) => item.filePath),
    },
    null,
    2
  )
);
