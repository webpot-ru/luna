#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const contractPath = path.resolve(args.get("contract") ?? "config/english-core-3000-source-contract-v0.json");
const outputRoot = path.resolve(args.get("out-dir") ?? "outputs/english-core-3000/source");
const releaseId = args.get("release") ?? "english_core_3000_a1_a2_part_001_150_v1";

const sourceArgs = [
  { sourceId: "ngsl_1_2", arg: "ngsl" },
  { sourceId: "cefr_j_wordlist", arg: "cefrj" },
];

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizedKey(value) {
  return normalizeText(value).toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, "_").replace(/^_+|_+$/g, "");
}

async function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(await fs.readFile(filePath));
  return hash.digest("hex");
}

function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted && char === '"' && next === '"') {
      field += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && char === delimiter) {
      row.push(field);
      field = "";
      continue;
    }
    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  if (rows.length === 0) return [];

  const headers = rows[0].map(normalizeText);
  return rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, normalizeText(values[index])]))
  );
}

function parseRows(filePath, text) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".json") {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.rows)) return parsed.rows;
    throw new Error(`${filePath} JSON must be an array or { rows: [...] }`);
  }
  if (ext === ".jsonl") {
    return text
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  const firstLine = text.split(/\r?\n/u).find((line) => line.trim()) ?? "";
  const delimiter = firstLine.includes("\t") ? "\t" : ",";
  return parseDelimited(text, delimiter);
}

function pick(row, names) {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeText(key).toLowerCase(), value])
  );
  for (const name of names) {
    const value = normalized[name.toLowerCase()];
    if (normalizeText(value)) return normalizeText(value);
  }
  return "";
}

function firstValue(row) {
  return normalizeText(Object.values(row).find((value) => normalizeText(value)) ?? "");
}

function normalizeSourceRow(row, sourceId, index) {
  const sourceHeadword =
    pick(row, ["headword", "word", "lemma", "ngsl headword", "ngsl_headword", "vocabulary", "entry"]) ||
    firstValue(row);
  const partOfSpeech = pick(row, ["part_of_speech", "part of speech", "pos", "PoS"]);
  const rank = pick(row, ["rank", "frequency rank", "ngsl rank", "ngsl_rank", "freq rank", "sfi rank"]);
  const level = pick(row, ["level", "cefr", "cefr-j", "cefr_j_level", "CEFR"]);
  const band = pick(row, ["band", "frequency_band", "ngsl_band", "level band"]);

  return {
    source_id: sourceId,
    source_candidate_id: `${sourceId}::${index + 1}::${normalizedKey(sourceHeadword) || "blank"}`,
    source_headword: sourceHeadword,
    normalized_headword: normalizeText(sourceHeadword).toLocaleLowerCase("en-US"),
    part_of_speech: partOfSpeech,
    source_rank: rank,
    source_level: level,
    source_band: band,
    raw_row_number: index + 2,
  };
}

async function writeJsonl(filePath, rows) {
  await fs.writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

async function main() {
  const contract = JSON.parse(await fs.readFile(contractPath, "utf8"));
  if (contract.approved_for_generation !== false) {
    throw new Error("Source snapshot builder refuses contracts that are approved_for_generation.");
  }

  await fs.mkdir(outputRoot, { recursive: true });
  const retrievedAt = new Date().toISOString();
  const sources = [];

  for (const { sourceId, arg } of sourceArgs) {
    const fileArg = args.get(arg);
    if (!fileArg) continue;
    const filePath = path.resolve(fileArg);
    const rawText = await fs.readFile(filePath, "utf8");
    const rawRows = parseRows(filePath, rawText);
    const normalizedRows = rawRows
      .map((row, index) => normalizeSourceRow(row, sourceId, index))
      .filter((row) => row.source_headword);

    if (normalizedRows.length === 0) {
      throw new Error(`${sourceId} source produced 0 normalized rows from ${filePath}`);
    }

    const normalizedPath = path.join(outputRoot, `${releaseId}.${sourceId}.normalized.jsonl`);
    await writeJsonl(normalizedPath, normalizedRows);
    const sourceContract = contract.source_stack?.find((source) => source.source_id === sourceId) ?? {};

    sources.push({
      source_id: sourceId,
      source_role: sourceContract.role ?? "",
      source_status: sourceContract.status ?? "",
      source_url: sourceContract.url ?? "",
      source_path: path.relative(process.cwd(), filePath),
      normalized_path: path.relative(process.cwd(), normalizedPath),
      retrieved_at: retrievedAt,
      raw_file_sha256: await sha256File(filePath),
      normalized_file_sha256: await sha256File(normalizedPath),
      normalized_rows: normalizedRows.length,
      license_or_terms_note: sourceContract.terms_snapshot ?? "",
      attribution_text: sourceContract.attribution_text ?? "",
      field_mapping: "generic header detection: headword/word/lemma, pos, rank, level, band",
      included_columns: Object.keys(rawRows[0] ?? {}),
      excluded_columns: [],
    });
  }

  if (sources.length === 0) {
    throw new Error(
      "No source files were provided. Pass --ngsl=/path/to/ngsl.csv and optionally --cefrj=/path/to/cefrj.csv. This script does not download sources."
    );
  }

  const manifest = {
    release_id: releaseId,
    contract_id: contract.contract_id,
    contract_path: path.relative(process.cwd(), contractPath),
    generated_at: retrievedAt,
    approved_for_generation: false,
    sources,
    blocked_content_policy: contract.snapshot_requirements?.blocked_content ?? [],
  };

  const manifestPath = path.join(outputRoot, `${releaseId}_source_snapshot_manifest.json`);
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(
    `English Core 3000 source snapshot written: ${path.relative(process.cwd(), manifestPath)} (${sources.map((source) => `${source.source_id}:${source.normalized_rows}`).join(", ")})`
  );
}

await main();
