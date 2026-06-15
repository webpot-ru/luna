#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const releaseId = args.get("release") ?? "english_core_3000_a1_a2_part_001_150_v1";
const inputPath = path.resolve(args.get("input") ?? `outputs/english-core-3000/row-reviews/${releaseId}_row_review_v1.jsonl`);
const cmuPath = path.resolve(args.get("cmu") ?? "reference-sources/raw/ipa-focused/english-us/cmudict.dict");
const outputDir = path.resolve(args.get("out-dir") ?? "outputs/english-core-3000/en-transcriptions");

const cmuSourceIds = [
  "ipa-focused-english-us-cmudict-dict",
  "ipa-focused-english-us-cmudict-phones",
  "ipa-focused-english-us-cmudict-symbols",
];

const resolvedTranscriptionBlockers = new Set([
  "transcription_EN_missing",
  "example_transcription_EN_missing",
]);

const phoneMap = {
  AA: "ɑ",
  AE: "æ",
  AH0: "ə",
  AH1: "ʌ",
  AH2: "ə",
  AO: "ɔ",
  AW: "aʊ",
  AY: "aɪ",
  B: "b",
  CH: "tʃ",
  D: "d",
  DH: "ð",
  EH: "ɛ",
  ER0: "ɚ",
  ER1: "ɝ",
  ER2: "ɚ",
  EY: "eɪ",
  F: "f",
  G: "ɡ",
  HH: "h",
  IH: "ɪ",
  IY: "i",
  JH: "dʒ",
  K: "k",
  L: "l",
  M: "m",
  N: "n",
  NG: "ŋ",
  OW: "oʊ",
  OY: "ɔɪ",
  P: "p",
  R: "r",
  S: "s",
  SH: "ʃ",
  T: "t",
  TH: "θ",
  UH: "ʊ",
  UW: "u",
  V: "v",
  W: "w",
  Y: "j",
  Z: "z",
  ZH: "ʒ",
};

function stripStress(phone) {
  return phone.replace(/[0-2]$/u, "");
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function lookupKey(value) {
  return normalizeText(value)
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{Letter}'-]+/gu, "")
    .replace(/^'+|'+$/gu, "");
}

function tokenize(text) {
  return normalizeText(text)
    .replace(/[’]/gu, "'")
    .match(/[\p{Letter}]+(?:'[\p{Letter}]+)?/gu) ?? [];
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

async function loadCmuDict(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  const entries = new Map();
  for (const line of text.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(";;;")) continue;
    const [rawWord, ...phones] = trimmed.split(/\s+/u);
    const key = rawWord.toLocaleLowerCase("en-US").replace(/\(\d+\)$/u, "");
    if (!entries.has(key)) entries.set(key, phones);
  }
  return entries;
}

function arpabetToIpa(phones) {
  return phones
    .map((phone) => {
      const direct = phoneMap[phone];
      if (direct) return direct;
      const stripped = stripStress(phone);
      const fallback = phoneMap[stripped];
      if (fallback) return fallback;
      throw new Error(`Unsupported CMU phone: ${phone}`);
    })
    .join("");
}

function transcribeText(text, entries) {
  const tokens = tokenize(text);
  if (tokens.length === 0) throw new Error(`No transcribable tokens in: ${text}`);
  const evidence = [];
  const ipaParts = [];
  for (const token of tokens) {
    const key = lookupKey(token);
    const phones = entries.get(key);
    if (!phones) throw new Error(`CMUdict missing token "${token}" from text "${text}"`);
    const ipa = arpabetToIpa(phones);
    ipaParts.push(ipa);
    evidence.push({
      token,
      cmu_key: key,
      arpabet: phones.join(" "),
      ipa,
      source_id: "ipa-focused-english-us-cmudict-dict",
      match_type: "exact_token",
    });
  }
  return {
    ipa: `/${ipaParts.join(" ")}/`,
    tokens: evidence,
  };
}

async function main() {
  const rows = await readJsonl(inputPath);
  const entries = await loadCmuDict(cmuPath);
  const outputRows = rows.map((row) => {
    const display = normalizeText(row.en_display || row.source_headword);
    const example = normalizeText(row.example_EN);
    if (!display) throw new Error(`${row.core_item_id}: missing en_display`);
    if (!example) throw new Error(`${row.core_item_id}: missing example_EN`);
    const displayTranscription = transcribeText(display, entries);
    const exampleTranscription = transcribeText(example, entries);
    const blockers = (Array.isArray(row.blockers) ? row.blockers : []).filter(
      (blocker) => !resolvedTranscriptionBlockers.has(blocker)
    );
    return {
      ...row,
      transcription_EN: displayTranscription.ipa,
      transcription_status: "source_backed_cmudict_component_exact",
      example_transcription_EN: exampleTranscription.ipa,
      example_transcription_status: "source_backed_cmudict_component_exact",
      blockers,
      en_transcription_review: {
        status: "source_backed_needs_final_qa",
        source_ids: cmuSourceIds,
        source_path: "reference-sources/raw/ipa-focused/english-us/cmudict.dict",
        method: "cmudict_exact_token_lookup_plus_deterministic_arpabet_to_ipa",
        confidence: "source_exact_component_phrase",
        display_evidence: displayTranscription.tokens,
        example_evidence: exampleTranscription.tokens,
        still_required_before_generation: blockers,
      },
    };
  });

  await fs.mkdir(outputDir, { recursive: true });
  const outPath = path.join(outputDir, `${releaseId}_en_transcriptions_v1.jsonl`);
  const summaryPath = path.join(outputDir, `${releaseId}_en_transcriptions_v1_summary.md`);
  await writeJsonl(outPath, outputRows);
  await fs.writeFile(
    summaryPath,
    [
      `# EN Transcriptions v1: ${releaseId}`,
      "",
      `- Rows: ${outputRows.length}`,
      `- transcription_EN filled: ${outputRows.filter((row) => row.transcription_EN).length}`,
      `- example_transcription_EN filled: ${outputRows.filter((row) => row.example_transcription_EN).length}`,
      "- Generation ready: 0",
      "- Source: CMUdict exact-token lookup with deterministic ARPABET-to-IPA conversion.",
      "",
      "This artifact fills only US English source word/display and US English example transcriptions.",
      "It does not create target-language transcription, Postgres rows, final QA evidence or Google Sheet output.",
      "",
    ].join("\n"),
    "utf8"
  );

  console.log(
    `English Core 3000 EN transcriptions written: ${path.relative(process.cwd(), outPath)} rows=${outputRows.length} generation_ready=0`
  );
}

await main();
