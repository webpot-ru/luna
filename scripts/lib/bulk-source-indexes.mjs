import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { access, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const indexRoot = path.join(projectRoot, "reference-sources/cache/bulk-source-indexes");

const indexFiles = {
  tatoeba: path.join(indexRoot, "tatoeba_sentences.jsonl"),
  opus: path.join(indexRoot, "opus_examples.jsonl"),
  panlex: path.join(indexRoot, "panlex_candidates.jsonl"),
  panlexMeanings: path.join(indexRoot, "panlex_meanings_candidates.jsonl"),
  weakDictionaries: path.join(indexRoot, "weak_dictionary_candidates.jsonl"),
  weakExamples: path.join(indexRoot, "weak_example_collocations.jsonl"),
  wikidata: path.join(indexRoot, "wikidata_lexemes.jsonl"),
  concepts: path.join(indexRoot, "concept_candidates.jsonl"),
  hunspell: path.join(indexRoot, "hunspell_words.jsonl"),
};

const lookupCacheRoot = path.join(projectRoot, "reference-sources/cache/bulk-source-lookups");
const bulkLookupRuleVersion = "bulk-source-hints-v2";

const iso3ToLuna = new Map([
  ["eng", "EN"],
  ["spa", "ES"],
  ["fra", "FR"],
  ["deu", "DE"],
  ["ger", "DE"],
  ["ita", "IT"],
  ["por", "PT"],
  ["rus", "RU"],
  ["zho", "ZH"],
  ["cmn", "ZH"],
  ["jpn", "JA"],
  ["kor", "KO"],
  ["vie", "VI"],
  ["tha", "TH"],
  ["msa", "MS"],
  ["zsm", "MS"],
  ["ind", "ID"],
  ["pol", "PL"],
  ["nld", "NL"],
  ["swe", "SV"],
  ["nor", "NB"],
  ["nob", "NB"],
  ["dan", "DA"],
  ["fin", "FI"],
  ["ces", "CS"],
  ["cze", "CS"],
  ["slk", "SK"],
  ["slo", "SK"],
  ["hun", "HU"],
  ["ron", "RO"],
  ["rum", "RO"],
  ["bul", "BG"],
  ["hrv", "HR"],
  ["srp", "SR"],
  ["slv", "SL"],
  ["lit", "LT"],
  ["lav", "LV"],
  ["lvs", "LV"],
  ["est", "ET"],
  ["ekk", "ET"],
  ["isl", "IS"],
  ["ice", "IS"],
  ["hin", "HI"],
  ["ben", "BN"],
  ["tgl", "TL"],
  ["mya", "MY"],
  ["bur", "MY"],
  ["khm", "KM"],
  ["lao", "LO"],
  ["nep", "NE"],
  ["npi", "NE"],
  ["sin", "SI"],
  ["tam", "TA"],
  ["tel", "TE"],
  ["kan", "KN"],
  ["mal", "ML"],
  ["uzb", "UZ"],
  ["uzn", "UZ"],
  ["kaz", "KK"],
  ["aze", "AZ"],
  ["azj", "AZ"],
  ["kat", "KA"],
  ["geo", "KA"],
  ["hye", "HY"],
  ["arm", "HY"],
  ["tur", "TR"],
  ["swa", "SW"],
  ["swh", "SW"],
]);

function lunaCodesFromIso3(iso3) {
  const code = normalizeBulkText(iso3).toLowerCase();
  if (code === "eng") return ["EN", "EN-GB"];
  if (code === "spa") return ["ES", "ES-419"];
  if (code === "por") return ["PT", "PT-BR"];
  const mapped = iso3ToLuna.get(code);
  return mapped ? [mapped] : [];
}

const opusCodeToLuna = new Map([
  ["es", "ES"],
  ["fr", "FR"],
  ["de", "DE"],
  ["it", "IT"],
  ["pt", "PT"],
  ["ru", "RU"],
  ["zh", "ZH"],
  ["ja", "JA"],
  ["ko", "KO"],
  ["vi", "VI"],
  ["th", "TH"],
  ["ms", "MS"],
  ["id", "ID"],
  ["pl", "PL"],
  ["nl", "NL"],
  ["sv", "SV"],
  ["no", "NB"],
  ["da", "DA"],
  ["fi", "FI"],
  ["cs", "CS"],
  ["sk", "SK"],
  ["hu", "HU"],
  ["ro", "RO"],
  ["bg", "BG"],
  ["hr", "HR"],
  ["sr", "SR"],
  ["sl", "SL"],
  ["lt", "LT"],
  ["lv", "LV"],
  ["et", "ET"],
  ["is", "IS"],
  ["hi", "HI"],
  ["bn", "BN"],
  ["tl", "TL"],
  ["my", "MY"],
  ["km", "KM"],
  ["lo", "LO"],
  ["ne", "NE"],
  ["si", "SI"],
  ["ta", "TA"],
  ["te", "TE"],
  ["kn", "KN"],
  ["ml", "ML"],
  ["uz", "UZ"],
  ["kk", "KK"],
  ["az", "AZ"],
  ["ka", "KA"],
  ["hy", "HY"],
  ["tr", "TR"],
  ["sw", "SW"],
]);

export function normalizeBulkText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeBulkComparable(value) {
  return normalizeBulkText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(value) {
  const normalized = normalizeBulkComparable(value);
  return normalized ? normalized.split(" ").filter((token) => token.length >= 2) : [];
}

async function pathExists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(root, predicate = () => true) {
  const files = [];
  async function walk(dir) {
    let entries = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (predicate(absolute)) files.push(absolute);
    }
  }
  await walk(root);
  return files;
}

function spawnLines(command, args) {
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
  return {
    child,
    lines: readline.createInterface({ input: child.stdout, crlfDelay: Infinity }),
  };
}

async function writeJsonl(file, rows) {
  await mkdir(path.dirname(file), { recursive: true });
  const writer = createWriteStream(file, { encoding: "utf8" });
  for (const row of rows) {
    if (!writer.write(JSON.stringify(row) + "\n")) {
      await new Promise((resolve) => writer.once("drain", resolve));
    }
  }
  await new Promise((resolve, reject) => {
    writer.on("error", reject);
    writer.end(resolve);
  });
}

function splitDelimited(line, delimiter = "\t") {
  const cols = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      cols.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cols.push(current);
  return cols;
}

function splitCsv(line) {
  return splitDelimited(line, ",");
}

function isUsefulPanlexEnglishSource(text) {
  const value = normalizeBulkText(text);
  if (!value || value.length > 50) return false;
  if (value !== value.toLowerCase()) return false;
  if (/\d/u.test(value)) return false;
  if (/[()[\]{}_=]|https?:|www\./iu.test(value)) return false;
  const tokenList = tokens(value);
  if (tokenList.length === 0 || tokenList.length > 5) return false;
  if (tokenList.some((token) => token.length > 25)) return false;
  return true;
}

async function readZipMember(zipPath, member) {
  return new Promise((resolve, reject) => {
    const child = spawn("unzip", ["-p", zipPath, member], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.stderr.on("data", (chunk) => {
      err += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(err || `unzip exited ${code}`));
    });
  });
}

async function readGzipFile(file) {
  return new Promise((resolve, reject) => {
    const child = spawn("gzip", ["-dc", file], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.stderr.on("data", (chunk) => {
      err += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(err || `gzip exited ${code}`));
    });
  });
}

async function listZipMembers(zipPath) {
  const { child, lines } = spawnLines("unzip", ["-Z1", zipPath]);
  const members = [];
  for await (const line of lines) {
    if (line.trim()) members.push(line.trim());
  }
  await new Promise((resolve) => child.on("close", resolve));
  return members;
}

function xmlDecode(value) {
  return normalizeBulkText(value)
    .replace(/&amp;/gu, "&")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'");
}

function cleanWordnetLiteral(value) {
  return normalizeBulkText(value)
    .replace(/^[+\-?]+/u, "")
    .replace(/\([^)]*\)/gu, "")
    .trim();
}

async function sourceToolsPythonPath() {
  const projectPython = path.join(projectRoot, ".venv-source-tools/bin/python");
  if (await pathExists(projectPython)) return projectPython;
  return "python3";
}

async function readParquetRows(file, columns, maxRows) {
  if (!(await pathExists(file))) return [];
  const python = await sourceToolsPythonPath();
  const script = [
    "import json, sys",
    "import pyarrow.parquet as pq",
    "path = sys.argv[1]",
    "columns = json.loads(sys.argv[2])",
    "max_rows = int(sys.argv[3])",
    "rows = 0",
    "pf = pq.ParquetFile(path)",
    "for batch in pf.iter_batches(columns=columns, batch_size=2048):",
    "    for row in batch.to_pylist():",
    "        print(json.dumps(row, ensure_ascii=False), flush=False)",
    "        rows += 1",
    "        if rows >= max_rows:",
    "            raise SystemExit(0)",
  ].join("\n");
  const child = spawn(python, ["-c", script, file, JSON.stringify(columns), String(maxRows)], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const rows = [];
  for await (const line of lines) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch {
      // Parquet-derived indexes are rebuildable; skip malformed tool output.
    }
  }
  const code = await new Promise((resolve) => child.on("close", resolve));
  if (code !== 0) {
    throw new Error(stderr.trim() || `parquet reader exited ${code}`);
  }
  return rows;
}

async function readIndexJsonl(file, limit = 250000) {
  if (!(await pathExists(file))) return [];
  const rows = [];
  const reader = readline.createInterface({ input: createReadStream(file, "utf8"), crlfDelay: Infinity });
  for await (const line of reader) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
      if (rows.length >= limit) break;
    } catch {
      // Ignore a corrupt cache line; the index is rebuildable.
    }
  }
  return rows;
}

async function readIndexJsonlFiltered(file, options = {}) {
  if (!(await pathExists(file))) return [];
  const limit = Number(options.limit ?? 25000);
  const maxLines = Number(options.maxLines ?? process.env.BULK_SOURCE_MAX_LINES ?? Math.max(limit * 20, 200000));
  const languages = options.languages ?? new Set();
  const extraLanguages = options.extraLanguages ?? new Set();
  const needles = options.needles ?? new Set();
  const rows = [];
  const reader = readline.createInterface({ input: createReadStream(file, "utf8"), crlfDelay: Infinity });
  let scannedLines = 0;
  for await (const line of reader) {
    scannedLines += 1;
    if (scannedLines > maxLines) break;
    if (!line.trim()) continue;
    let item;
    try {
      item = JSON.parse(line);
    } catch {
      continue;
    }
    if (item.language_code && !languages.has(item.language_code) && !extraLanguages.has(item.language_code)) continue;
    if (needles.size > 0) {
      const haystack = normalizeBulkComparable(
        `${item.token_key ?? ""} ${item.value ?? ""} ${item.source_text ?? ""} ${item.target_text ?? ""} ${item.text ?? ""} ${item.concept_gloss ?? ""}`
      );
      if (!haystack) continue;
      const haystackTokens = new Set(haystack.split(" ").filter(Boolean));
      if (![...needles].some((needle) => haystackTokens.has(needle))) continue;
    }
    rows.push(item);
    if (rows.length >= limit) break;
  }
  return rows;
}

async function readHunspellLookupForRows(file, rows, options = {}) {
  const maxLines = Number(options.maxLines ?? process.env.BULK_SOURCE_MAX_LINES ?? 200000);
  const languages = new Set(rows.map(rowLanguageCode).filter(Boolean));
  const exactKeys = new Set(
    rows
      .map((row) => {
        const languageCode = rowLanguageCode(row);
        const nativeKey = normalizeBulkComparable(rowNative(row));
        return languageCode && nativeKey ? `${languageCode}::${nativeKey}` : "";
      })
      .filter(Boolean)
  );
  const exactMatches = new Set();
  const languagesPresent = new Set();
  if (!(await pathExists(file)) || languages.size === 0) return { exactMatches, languagesPresent };

  const reader = readline.createInterface({ input: createReadStream(file, "utf8"), crlfDelay: Infinity });
  let scannedLines = 0;
  for await (const line of reader) {
    scannedLines += 1;
    if (scannedLines > maxLines) break;
    if (!line.trim()) continue;
    let item;
    try {
      item = JSON.parse(line);
    } catch {
      continue;
    }
    const languageCode = item.language_code ?? "";
    if (!languages.has(languageCode)) continue;
    languagesPresent.add(languageCode);
    const tokenKey = item.token_key ?? "";
    if (tokenKey && exactKeys.has(`${languageCode}::${tokenKey}`)) exactMatches.add(`${languageCode}::${tokenKey}`);
  }
  return { exactMatches, languagesPresent };
}

export async function buildTatoebaIndex(options = {}) {
  const maxRows = Number(options.maxRows ?? 200000);
  const sentencePath = path.join(projectRoot, "reference-sources/raw/tatoeba/sentences.tar.bz2");
  const rows = [];
  if (!(await pathExists(sentencePath))) return { source: "tatoeba", rows_written: 0, warning: "missing_tatoeba_sentences" };
  const activeCodes = new Set(["eng", ...opusCodeToLuna.keys()]);
  const { child, lines } = spawnLines("bzip2", ["-dc", sentencePath]);
  for await (const line of lines) {
    const [id, lang, text] = splitDelimited(line, "\t");
    if (!activeCodes.has(lang)) continue;
    const languageCode = lang === "eng" ? "EN" : opusCodeToLuna.get(lang);
    const cleanText = normalizeBulkText(text);
    if (!languageCode || !cleanText) continue;
    rows.push({
      source: "tatoeba",
      source_id: "tatoeba-downloads-note",
      language_code: languageCode,
      sentence_id: id,
      text: cleanText,
      token_key: tokens(cleanText).slice(0, 16).join(" "),
      confidence: "source_partial",
    });
    if (rows.length >= maxRows) {
      child.kill();
      break;
    }
  }
  await writeJsonl(indexFiles.tatoeba, rows);
  return { source: "tatoeba", rows_written: rows.length, index_path: path.relative(projectRoot, indexFiles.tatoeba) };
}

export async function buildOpusIndex(options = {}) {
  const maxRows = Number(options.maxRows ?? 200000);
  const opusRoot = path.join(projectRoot, "reference-sources/raw/opus");
  const zipFiles = await listFiles(opusRoot, (file) => /\.zip$/u.test(file));
  const rows = [];
  for (const zipPath of zipFiles) {
    if (rows.length >= maxRows) break;
    const members = await listZipMembers(zipPath);
    const sourceMember = members.find((member) => /\.en$/u.test(member));
    const targetMember = members.find((member) => !/\.en$/u.test(member) && /\.[a-z]{2,3}$/u.test(member));
    if (!sourceMember || !targetMember) continue;
    const targetCode = targetMember.split(".").pop();
    const languageCode = opusCodeToLuna.get(targetCode);
    if (!languageCode) continue;
    const relativeParts = path.relative(opusRoot, zipPath).split(path.sep);
    const corpus = relativeParts[0] ?? "unknown";
    const version = relativeParts[1] ?? "unknown";
    const sourceProcess = spawnLines("unzip", ["-p", zipPath, sourceMember]);
    const targetProcess = spawnLines("unzip", ["-p", zipPath, targetMember]);
    const sourceIterator = sourceProcess.lines[Symbol.asyncIterator]();
    const targetIterator = targetProcess.lines[Symbol.asyncIterator]();
    while (rows.length < maxRows) {
      const [sourceNext, targetNext] = await Promise.all([sourceIterator.next(), targetIterator.next()]);
      if (sourceNext.done || targetNext.done) break;
      const sourceText = normalizeBulkText(sourceNext.value);
      const targetText = normalizeBulkText(targetNext.value);
      if (!sourceText || !targetText) continue;
      rows.push({
        source: "opus",
        source_id: "opus-corpora",
        language_code: languageCode,
        corpus,
        version,
        source_text: sourceText,
        target_text: targetText,
        token_key: tokens(`${sourceText} ${targetText}`).slice(0, 24).join(" "),
        confidence: "source_partial",
      });
    }
    sourceProcess.child.kill();
    targetProcess.child.kill();
  }
  await writeJsonl(indexFiles.opus, rows);
  return { source: "opus", rows_written: rows.length, zip_files: zipFiles.length, index_path: path.relative(projectRoot, indexFiles.opus) };
}

export async function buildWikidataIndex(options = {}) {
  const maxRows = Number(options.maxRows ?? 100000);
  const dumpPath = path.join(projectRoot, "reference-sources/raw/wikidata/latest-lexemes.json.bz2");
  const rows = [];
  if (!(await pathExists(dumpPath))) return { source: "wikidata", rows_written: 0, warning: "missing_wikidata_lexemes" };
  const { child, lines } = spawnLines("bzip2", ["-dc", dumpPath]);
  for await (const rawLine of lines) {
    const line = rawLine.trim().replace(/,$/u, "");
    if (!line || line === "[" || line === "]") continue;
    try {
      const lexeme = JSON.parse(line);
      const lemmas = lexeme.lemmas ?? {};
      for (const [lang, value] of Object.entries(lemmas)) {
        const languageCode = opusCodeToLuna.get(lang) ?? (lang === "en" ? "EN" : null);
        const lemma = normalizeBulkText(value?.value);
        if (!languageCode || !lemma) continue;
        rows.push({
          source: "wikidata",
          source_id: "wikidata-latest-lexemes-json-bz2",
          language_code: languageCode,
          lexeme_id: lexeme.id,
          lexical_category: lexeme.lexicalCategory ?? "",
          value: lemma,
          token_key: tokens(lemma).join(" "),
          confidence: "source_partial",
        });
      }
      if (rows.length >= maxRows) {
        child.kill();
        break;
      }
    } catch {
      // Wikidata dump lines are rebuildable; skip malformed framing lines.
    }
  }
  await writeJsonl(indexFiles.wikidata, rows);
  return { source: "wikidata", rows_written: rows.length, index_path: path.relative(projectRoot, indexFiles.wikidata) };
}

export async function buildConceptIndex(options = {}) {
  const maxRows = Number(options.maxRows ?? 200000);
  const rows = [];
  const concepticonZip = path.join(projectRoot, "reference-sources/raw/concepticon/concepticon-data-master.zip");
  if (await pathExists(concepticonZip)) {
    const content = await readZipMember(concepticonZip, "concepticon-data-master/concepticondata/concepticon.tsv");
    const [headerLine, ...lines] = content.split(/\r?\n/u);
    const header = splitDelimited(headerLine, "\t");
    const index = Object.fromEntries(header.map((key, i) => [key, i]));
    for (const line of lines) {
      if (!line.trim()) continue;
      const cols = splitDelimited(line, "\t");
      const gloss = normalizeBulkText(cols[index.GLOSS]);
      if (!gloss) continue;
      rows.push({
        source: "concepticon",
        source_id: "concepticon-data-master-zip",
        language_code: "EN",
        concept_id: cols[index.ID],
        value: gloss.toLowerCase(),
        semantic_field: cols[index.SEMANTICFIELD] ?? "",
        token_key: tokens(gloss).join(" "),
        confidence: "source_partial",
      });
    }
  }
  const northZip = path.join(projectRoot, "reference-sources/raw/northeuralex/northeuralex-v4.0.zip");
  if (await pathExists(northZip)) {
    const languages = await readZipMember(northZip, "lexibank-northeuralex-5ab1c5d/cldf/languages.csv");
    const langById = new Map();
    for (const line of languages.split(/\r?\n/u).slice(1)) {
      if (!line.trim()) continue;
      const cols = splitCsv(line);
      const languageCode = iso3ToLuna.get(cols[4]);
      if (languageCode) langById.set(cols[0], languageCode);
    }
    const parameters = await readZipMember(northZip, "lexibank-northeuralex-5ab1c5d/cldf/parameters.csv");
    const conceptById = new Map();
    for (const line of parameters.split(/\r?\n/u).slice(1)) {
      if (!line.trim()) continue;
      const cols = splitCsv(line);
      conceptById.set(cols[0], { value: normalizeBulkText(cols[1]), concepticon_id: cols[2], concepticon_gloss: cols[3] });
    }
    const forms = await readZipMember(northZip, "lexibank-northeuralex-5ab1c5d/cldf/forms.csv");
    for (const line of forms.split(/\r?\n/u).slice(1)) {
      if (rows.length >= maxRows) break;
      if (!line.trim()) continue;
      const cols = splitCsv(line);
      const languageCode = langById.get(cols[2]);
      const concept = conceptById.get(cols[3]);
      const value = normalizeBulkText(cols[4]);
      if (!languageCode || !concept || !value) continue;
      rows.push({
        source: "northeuralex",
        source_id: "northeuralex-cldf-zenodo",
        language_code: languageCode,
        concept_id: concept.concepticon_id || cols[3],
        concept_gloss: concept.concepticon_gloss || concept.value,
        value,
        token_key: tokens(`${concept.concepticon_gloss} ${concept.value} ${value}`).join(" "),
        confidence: "source_partial",
      });
    }
  }
  await writeJsonl(indexFiles.concepts, rows);
  return { source: "concepts", rows_written: rows.length, index_path: path.relative(projectRoot, indexFiles.concepts) };
}

export async function buildHunspellIndex(options = {}) {
  const maxRowsPerLanguage = Number(options.maxRows ?? 25000);
  const zipPath = path.join(projectRoot, "reference-sources/raw/hunspell/libreoffice-dictionaries-master.zip");
  const configPath = path.join(projectRoot, "reference-sources/bulk-source-groups.json");
  const rows = [];
  if (!(await pathExists(zipPath))) return { source: "hunspell", rows_written: 0, warning: "missing_hunspell_archive" };
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const prefixes = new Map();
  for (const item of config.hunspell_languages ?? []) {
    for (const prefix of item.dictionary_prefixes ?? []) {
      const key = prefix.toLowerCase();
      if (!prefixes.has(key)) prefixes.set(key, []);
      prefixes.get(key).push(item.language_code);
    }
  }
  const members = await listZipMembers(zipPath);
  const dicMembers = members.filter((member) => /\.dic$/u.test(member));
  const countsByLanguage = new Map();
  for (const member of dicMembers) {
    const basename = path.basename(member, ".dic").toLowerCase();
    const prefix = [...prefixes.keys()].find((candidate) => basename === candidate.toLowerCase() || basename.startsWith(`${candidate.toLowerCase()}_`));
    const languageCodes = prefix ? prefixes.get(prefix) ?? [] : [];
    if (languageCodes.length === 0) continue;
    if (languageCodes.every((languageCode) => (countsByLanguage.get(languageCode) ?? 0) >= maxRowsPerLanguage)) continue;
    const content = await readZipMember(zipPath, member);
    for (const line of content.split(/\r?\n/u).slice(1)) {
      const word = normalizeBulkText(line.split("/")[0]);
      if (!word || /\d/u.test(word) || word.length < 2) continue;
      for (const languageCode of languageCodes) {
        if ((countsByLanguage.get(languageCode) ?? 0) >= maxRowsPerLanguage) continue;
        countsByLanguage.set(languageCode, (countsByLanguage.get(languageCode) ?? 0) + 1);
        rows.push({
          source: "hunspell",
          source_id: "libreoffice-dictionaries-master-zip",
          language_code: languageCode,
          value: word,
          token_key: normalizeBulkComparable(word),
          confidence: "source_partial",
        });
      }
      if (languageCodes.every((languageCode) => (countsByLanguage.get(languageCode) ?? 0) >= maxRowsPerLanguage)) break;
    }
  }
  await writeJsonl(indexFiles.hunspell, rows);
  return {
    source: "hunspell",
    rows_written: rows.length,
    languages_indexed: countsByLanguage.size,
    index_path: path.relative(projectRoot, indexFiles.hunspell),
  };
}

export async function buildPanlexIndex(options = {}) {
  const maxRows = Number(options.maxRows ?? 200000);
  const maxRowsPerLanguage = Number(options.maxRowsPerLanguage ?? Math.max(1000, Math.ceil(maxRows / 54)));
  const hfCsvPath = path.join(projectRoot, "reference-sources/raw/panlex-hf/lbourdois-panlex/panlex.csv");
  const zipPath = path.join(projectRoot, "reference-sources/raw/panlex/panlex-20250201-csv.zip");
  const rows = [];
  const countsByLanguage = new Map();

  if (await pathExists(hfCsvPath)) {
    const reader = readline.createInterface({ input: createReadStream(hfCsvPath, { encoding: "utf8" }), crlfDelay: Infinity });
    let headerMap = null;
    for await (const line of reader) {
      if (!line.trim()) continue;
      const cols = splitDelimited(line, ";");
      if (!headerMap) {
        headerMap = new Map(cols.map((name, index) => [normalizeBulkText(name).toLowerCase(), index]));
        continue;
      }
      const value = normalizeBulkText(cols[headerMap.get("vocab")] ?? "");
      const iso3 = normalizeBulkText(cols[headerMap.get("639-3")] ?? "");
      if (!value || !iso3 || value.length > 80) continue;
      if (/\p{Control}/u.test(value)) continue;
      for (const languageCode of lunaCodesFromIso3(iso3)) {
        if ((countsByLanguage.get(languageCode) ?? 0) >= maxRowsPerLanguage) continue;
        countsByLanguage.set(languageCode, (countsByLanguage.get(languageCode) ?? 0) + 1);
        rows.push({
          source: "panlex",
          source_id: "panlex-vocabulary-hf-20240101",
          language_code: languageCode,
          value,
          token_key: tokens(value).join(" "),
          confidence: "source_partial",
        });
        if (rows.length >= maxRows) break;
      }
      if (rows.length >= maxRows) break;
    }
    await writeJsonl(indexFiles.panlex, rows);
    return {
      source: "panlex",
      rows_written: rows.length,
      languages_indexed: countsByLanguage.size,
      index_path: path.relative(projectRoot, indexFiles.panlex),
    };
  }

  if (!(await pathExists(zipPath))) return { source: "panlex", rows_written: 0, warning: "missing_panlex_archive" };
  const members = await listZipMembers(zipPath);
  const candidateMember = members.find((member) => /expr.*\.csv$/iu.test(member)) ?? members.find((member) => /\.csv$/iu.test(member));
  if (!candidateMember) return { source: "panlex", rows_written: 0, warning: "panlex_csv_member_not_found" };
  const { child, lines } = spawnLines("unzip", ["-p", zipPath, candidateMember]);
  for await (const line of lines) {
    if (rows.length >= maxRows) {
      child.kill();
      break;
    }
    const cols = splitCsv(line);
    const value = normalizeBulkText(cols.at(-1));
    if (!value || value.length > 80) continue;
    rows.push({
      source: "panlex",
      source_id: "panlex-csv-20250201",
      language_code: "",
      value,
      token_key: tokens(value).join(" "),
      confidence: "source_partial",
    });
  }
  await writeJsonl(indexFiles.panlex, rows);
  return { source: "panlex", rows_written: rows.length, index_path: path.relative(projectRoot, indexFiles.panlex) };
}

async function loadPanlexEnglishMeanings(englishPath, maxEnglishFormsPerMeaning = 3, maxEnglishMeanings = 300000) {
  const meaningToEnglish = new Map();
  const reader = readline.createInterface({ input: createReadStream(englishPath, { encoding: "utf8" }), crlfDelay: Infinity });
  let isHeader = true;
  for await (const line of reader) {
    if (!line.trim()) continue;
    if (isHeader) {
      isHeader = false;
      continue;
    }
    const cols = splitDelimited(line, "\t");
    const text = normalizeBulkText(cols[2]);
    const meaning = normalizeBulkText(cols[4]);
    if (!text || !meaning || text.length > 80 || /\p{Control}/u.test(text)) continue;
    if (!isUsefulPanlexEnglishSource(text)) continue;
    const current = meaningToEnglish.get(meaning) ?? [];
    if (current.length >= maxEnglishFormsPerMeaning) continue;
    const comparable = normalizeBulkComparable(text);
    if (!comparable || current.some((item) => item.source_key === comparable)) continue;
    current.push({ source_text: text, source_key: comparable });
    meaningToEnglish.set(meaning, current);
    if (meaningToEnglish.size >= maxEnglishMeanings) break;
  }
  return meaningToEnglish;
}

async function collectPanlexMeaningTargetRows(root, maxRowsPerLanguage, targetOverfetchFactor) {
  const targetRowsByMeaning = new Map();
  const candidateCountsByLanguage = new Map();
  const targetLimitPerLanguage = maxRowsPerLanguage * targetOverfetchFactor;
  const files = (await listFiles(root, (file) => /\.tsv$/u.test(file))).sort();

  for (const file of files) {
    const panlexCode = path.basename(file, ".tsv");
    if (panlexCode === "eng") continue;
    const languageCodes = lunaCodesFromIso3(panlexCode);
    if (languageCodes.length === 0) continue;
    if (languageCodes.every((languageCode) => (candidateCountsByLanguage.get(languageCode) ?? 0) >= targetLimitPerLanguage)) {
      continue;
    }

    const reader = readline.createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
    let isHeader = true;
    for await (const line of reader) {
      if (!line.trim()) continue;
      if (isHeader) {
        isHeader = false;
        continue;
      }
      const cols = splitDelimited(line, "\t");
      const targetText = normalizeBulkText(cols[2]);
      const meaning = normalizeBulkText(cols[4]);
      if (!targetText || !meaning || targetText.length > 80 || /\p{Control}/u.test(targetText)) continue;
      const targetKey = tokens(targetText).join(" ");
      if (!targetKey) continue;
      for (const languageCode of languageCodes) {
        if ((candidateCountsByLanguage.get(languageCode) ?? 0) >= targetLimitPerLanguage) continue;
        const targetRows = targetRowsByMeaning.get(meaning) ?? [];
        targetRows.push({
          language_code: languageCode,
          panlex_code: panlexCode,
          value: targetText,
          token_key: targetKey,
        });
        targetRowsByMeaning.set(meaning, targetRows);
        candidateCountsByLanguage.set(languageCode, (candidateCountsByLanguage.get(languageCode) ?? 0) + 1);
      }
      if (languageCodes.every((languageCode) => (candidateCountsByLanguage.get(languageCode) ?? 0) >= targetLimitPerLanguage)) {
        break;
      }
    }
  }

  return {
    targetRowsByMeaning,
    candidateCountsByLanguage,
    target_limit_per_language: targetLimitPerLanguage,
  };
}

async function closeWritable(stream) {
  await new Promise((resolve, reject) => {
    stream.on("error", reject);
    stream.end(resolve);
  });
}

export async function buildPanlexMeaningsIndex(options = {}) {
  const maxRows = Number(options.maxRows ?? 500000);
  const maxRowsPerLanguage = Number(options.maxRowsPerLanguage ?? Math.max(1000, Math.ceil(maxRows / 54)));
  const maxEnglishFormsPerMeaning = Number(options.maxEnglishFormsPerMeaning ?? 3);
  const maxEnglishMeanings = Number(options.maxEnglishMeanings ?? 300000);
  const root = path.join(projectRoot, "reference-sources/raw/panlex-meanings-hf/data");
  const englishPath = path.join(root, "eng.tsv");
  const countsByLanguage = new Map();
  if (!(await pathExists(englishPath))) {
    return { source: "panlex_meaning", rows_written: 0, warning: "missing_panlex_meanings_english" };
  }
  const meaningToEnglish = await loadPanlexEnglishMeanings(englishPath, maxEnglishFormsPerMeaning, maxEnglishMeanings);
  await mkdir(path.dirname(indexFiles.panlexMeanings), { recursive: true });
  const writer = createWriteStream(indexFiles.panlexMeanings, { encoding: "utf8" });
  let rowsWritten = 0;

  for (const [meaning, englishForms] of meaningToEnglish.entries()) {
    if (rowsWritten >= maxRows) break;
    for (const languageCode of ["EN", "EN-GB"]) {
      if (rowsWritten >= maxRows) break;
      if ((countsByLanguage.get(languageCode) ?? 0) >= maxRowsPerLanguage) continue;
      const english = englishForms[0];
      writer.write(
        JSON.stringify({
          source: "panlex_meaning",
          source_id: "panlex-meanings-hf-20240301",
          language_code: languageCode,
          panlex_code: "eng",
          meaning_id: meaning,
          source_text: english.source_text,
          source_key: english.source_key,
          value: english.source_text,
          token_key: english.source_key,
          confidence: "source_partial",
        }) + "\n"
      );
      countsByLanguage.set(languageCode, (countsByLanguage.get(languageCode) ?? 0) + 1);
      rowsWritten += 1;
    }
  }

  const files = (await listFiles(root, (file) => /\.tsv$/u.test(file))).sort();
  for (const file of files) {
    const panlexCode = path.basename(file, ".tsv");
    if (panlexCode === "eng") continue;
    const languageCodes = lunaCodesFromIso3(panlexCode);
    if (languageCodes.length === 0) continue;
    if (languageCodes.every((languageCode) => (countsByLanguage.get(languageCode) ?? 0) >= maxRowsPerLanguage)) continue;
    const reader = readline.createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
    let isHeader = true;
    for await (const line of reader) {
      if (rowsWritten >= maxRows) break;
      if (!line.trim()) continue;
      if (isHeader) {
        isHeader = false;
        continue;
      }
      const cols = splitDelimited(line, "\t");
      const targetText = normalizeBulkText(cols[2]);
      const meaning = normalizeBulkText(cols[4]);
      if (!targetText || !meaning || targetText.length > 80 || /\p{Control}/u.test(targetText)) continue;
      const englishForms = meaningToEnglish.get(meaning);
      if (!englishForms?.length) continue;
      const targetKey = tokens(targetText).join(" ");
      if (!targetKey) continue;
      for (const languageCode of languageCodes) {
        if ((countsByLanguage.get(languageCode) ?? 0) >= maxRowsPerLanguage) continue;
        for (const english of englishForms) {
          if (rowsWritten >= maxRows) break;
          if ((countsByLanguage.get(languageCode) ?? 0) >= maxRowsPerLanguage) break;
          writer.write(
            JSON.stringify({
              source: "panlex_meaning",
              source_id: "panlex-meanings-hf-20240301",
              language_code: languageCode,
              panlex_code: panlexCode,
              meaning_id: meaning,
              source_text: english.source_text,
              source_key: english.source_key,
              value: targetText,
              token_key: targetKey,
              confidence: "source_partial",
            }) + "\n"
          );
          countsByLanguage.set(languageCode, (countsByLanguage.get(languageCode) ?? 0) + 1);
          rowsWritten += 1;
        }
      }
      if (rowsWritten >= maxRows) break;
      if (languageCodes.every((languageCode) => (countsByLanguage.get(languageCode) ?? 0) >= maxRowsPerLanguage)) break;
    }
    if (rowsWritten >= maxRows) break;
  }
  await closeWritable(writer);
  return {
    source: "panlex_meaning",
    rows_written: rowsWritten,
    languages_indexed: countsByLanguage.size,
    english_meanings_indexed: meaningToEnglish.size,
    index_path: path.relative(projectRoot, indexFiles.panlexMeanings),
  };
}

function addWeakDictionaryRow(rows, row, maxRows) {
  const sourceText = normalizeBulkText(row.source_text);
  const value = normalizeBulkText(row.value);
  const languageCode = normalizeBulkText(row.language_code);
  if (rows.length >= maxRows) return false;
  if (!sourceText || !value || !languageCode) return false;
  if (!isUsefulPanlexEnglishSource(sourceText)) return false;
  if (value.length > 80 || /\p{Control}/u.test(value)) return false;
  const sourceKey = normalizeBulkComparable(sourceText);
  const tokenKey = tokens(value).join(" ");
  if (!sourceKey || !tokenKey) return false;
  rows.push({
    source: row.source,
    source_id: row.source_id,
    language_code: languageCode,
    source_text: sourceText,
    source_key: sourceKey,
    value,
    token_key: tokenKey,
    confidence: "source_partial",
  });
  return true;
}

function addWeakNativeLexiconRow(rows, row, maxRows) {
  const value = normalizeBulkText(row.value);
  const languageCode = normalizeBulkText(row.language_code);
  if (rows.length >= maxRows) return false;
  if (!value || !languageCode) return false;
  if (value.length > 80 || /\p{Control}/u.test(value)) return false;
  const tokenKey = tokens(value).join(" ");
  if (!tokenKey) return false;
  const sourceText = normalizeBulkText(row.source_text ?? row.source_id ?? row.source ?? "");
  rows.push({
    source: row.source,
    source_id: row.source_id,
    language_code: languageCode,
    source_text: sourceText,
    source_key: normalizeBulkComparable(sourceText),
    value,
    token_key: tokenKey,
    part_of_speech: row.part_of_speech ?? "",
    confidence: "source_partial",
  });
  return true;
}

async function readAlarKannadaDictionary(file, rows, countsByLanguage, maxRows, maxRowsForSource) {
  if (!(await pathExists(file))) return 0;
  const reader = readline.createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  let currentEntry = "";
  let sourceRows = 0;
  for await (const line of reader) {
    if (rows.length >= maxRows || sourceRows >= maxRowsForSource) break;
    const entryMatch = line.match(/^  entry:\s*(.*)$/u);
    if (entryMatch) {
      currentEntry = normalizeBulkText(entryMatch[1]).replace(/^"|"$/gu, "");
      continue;
    }
    const defMatch = line.match(/^    entry:\s*(.*)$/u);
    if (!defMatch || !currentEntry) continue;
    const definition = normalizeBulkText(defMatch[1]).replace(/^"|"$/gu, "");
    if (
      addWeakNativeLexiconRow(
        rows,
        {
          source: "alar_kn",
          source_id: "alar-kn-alar-yml",
          language_code: "KN",
          source_text: definition,
          value: currentEntry,
        },
        maxRows
      )
    ) {
      sourceRows += 1;
      countsByLanguage.set("KN", (countsByLanguage.get("KN") ?? 0) + 1);
    }
  }
  return sourceRows;
}

async function readSlovakWordnet(file, rows, countsByLanguage, maxRows, maxRowsForSource) {
  if (!(await pathExists(file))) return 0;
  const { child, lines } = spawnLines("gzip", ["-dc", file]);
  let sourceRows = 0;
  for await (const line of lines) {
    if (rows.length >= maxRows || sourceRows >= maxRowsForSource) {
      child.kill();
      break;
    }
    const [slovakRecord, englishRecord] = line.split("␞");
    if (!slovakRecord || !englishRecord) continue;
    const slovakCols = splitDelimited(slovakRecord, "\t");
    const slovakWords = normalizeBulkText(slovakCols[2] ?? "")
      .split(";")
      .map(cleanWordnetLiteral)
      .filter(Boolean)
      .slice(0, 8);
    const englishWords = normalizeBulkText(englishRecord.split("|")[0] ?? "")
      .split(/\s+/u)
      .map((token) => cleanWordnetLiteral(token.replace(/_/gu, " ")))
      .filter((token) => /^[A-Za-z][A-Za-z -]{1,45}$/u.test(token))
      .filter((token) => !["n", "v", "a", "s", "r"].includes(token.toLowerCase()))
      .slice(0, 8);
    for (const english of englishWords) {
      for (const slovak of slovakWords) {
        if (rows.length >= maxRows || sourceRows >= maxRowsForSource) break;
        if (
          addWeakDictionaryRow(
            rows,
            {
              source: "slovak_wordnet",
              source_id: "slovak-wordnet-20130123-gz",
              language_code: "SK",
              source_text: english,
              value: slovak,
            },
            maxRows
          )
        ) {
          sourceRows += 1;
          countsByLanguage.set("SK", (countsByLanguage.get("SK") ?? 0) + 1);
        }
      }
    }
  }
  return sourceRows;
}

function extractXmlLexicalValues(text) {
  const values = new Set();
  const tagPattern = /<(?:orth|lemma|hw|form|word|k|l)[^>]*>([^<]{2,100})</giu;
  const attrPattern = /\b(?:lemma|orth|writtenForm|headword|form|zapis_oblike|iztocnica|iztočnica)="([^"]{2,100})"/giu;
  const featValPattern = /\batt="(?:zapis_oblike|lemma|iztocnica|iztočnica|orth|writtenForm)"\s+val="([^"]{2,100})"/giu;
  for (const match of text.matchAll(tagPattern)) values.add(xmlDecode(match[1]));
  for (const match of text.matchAll(attrPattern)) values.add(xmlDecode(match[1]));
  for (const match of text.matchAll(featValPattern)) values.add(xmlDecode(match[1]));
  return [...values].filter((value) => value && !/[<>={}]/u.test(value));
}

async function readTezaursLatvianZip(zipPath, rows, countsByLanguage, maxRows, maxRowsForSource) {
  if (!(await pathExists(zipPath))) return 0;
  let members = [];
  try {
    members = await listZipMembers(zipPath);
  } catch {
    return 0;
  }
  const member = members.find((item) => /tezaurs.*\.xml$/iu.test(item)) ?? members.find((item) => /\.xml$/iu.test(item));
  if (!member) return 0;
  let sourceRows = 0;
  const seen = new Set();
  const { child, lines } = spawnLines("unzip", ["-p", zipPath, member]);
  for await (const line of lines) {
    if (rows.length >= maxRows || sourceRows >= maxRowsForSource) {
      child.kill();
      break;
    }
    for (const value of extractXmlLexicalValues(line)) {
      const key = normalizeBulkComparable(value);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      if (
        addWeakNativeLexiconRow(
          rows,
          {
            source: "tezaurs_lv",
            source_id: "tezaurs-lv-2020-zip",
            language_code: "LV",
            source_text: "Tēzaurs.lv lemma/form",
            value,
          },
          maxRows
        )
      ) {
        sourceRows += 1;
        countsByLanguage.set("LV", (countsByLanguage.get("LV") ?? 0) + 1);
      }
    }
  }
  return sourceRows;
}

async function readSloleksSlovenianZip(zipPath, rows, countsByLanguage, maxRows, maxRowsForSource) {
  if (!(await pathExists(zipPath))) return 0;
  let members = [];
  try {
    members = await listZipMembers(zipPath);
  } catch {
    return 0;
  }
  const xmlMembers = members.filter((item) => /\.xml$/iu.test(item)).slice(0, 12);
  let sourceRows = 0;
  const seen = new Set();
  for (const member of xmlMembers) {
    if (rows.length >= maxRows || sourceRows >= maxRowsForSource) break;
    const { child, lines } = spawnLines("unzip", ["-p", zipPath, member]);
    for await (const line of lines) {
      if (rows.length >= maxRows || sourceRows >= maxRowsForSource) {
        child.kill();
        break;
      }
      for (const value of extractXmlLexicalValues(line)) {
        const key = normalizeBulkComparable(value);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        if (
          addWeakNativeLexiconRow(
            rows,
            {
              source: "sloleks_sl",
              source_id: "sloleks-sl-3-0-zip",
              language_code: "SL",
              source_text: "Sloleks lemma/form",
              value,
            },
            maxRows
          )
        ) {
          sourceRows += 1;
          countsByLanguage.set("SL", (countsByLanguage.get("SL") ?? 0) + 1);
        }
      }
    }
  }
  return sourceRows;
}

async function readKalebuKamusiSwahiliCsv(file, rows, countsByLanguage, maxRows) {
  if (!(await pathExists(file))) return 0;
  const reader = readline.createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  let headers = null;
  let sourceRows = 0;
  const seen = new Set();
  for await (const line of reader) {
    if (!line.trim()) continue;
    const cols = splitCsv(line);
    if (!headers) {
      headers = cols.map((col) => normalizeBulkComparable(col));
      continue;
    }
    const row = Object.fromEntries(headers.map((header, index) => [header, cols[index] ?? ""]));
    const value = normalizeBulkText(row.word ?? "");
    const key = normalizeBulkComparable(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (
      addWeakNativeLexiconRow(
        rows,
        {
          source: "kalebu_kamusi_sw",
          source_id: "kalebu-kamusi-swahili-dictionary",
          language_code: "SW",
          source_text: row.meaning ?? "Kalebu/kamusi Swahili definition",
          value,
        },
        maxRows
      )
    ) {
      sourceRows += 1;
      countsByLanguage.set("SW", (countsByLanguage.get("SW") ?? 0) + 1);
    }
    if (rows.length >= maxRows) break;
  }
  return sourceRows;
}

async function readSeanghayKhmerLexiconParquet(file, rows, countsByLanguage, maxRows, maxRowsForSource) {
  if (!(await pathExists(file))) return 0;
  let sourceRows = 0;
  const seen = new Set();
  try {
    const parquetRows = await readParquetRows(file, ["t_main_en", "t_main_kh", "t_active"], Math.min(maxRowsForSource, maxRows - rows.length));
    for (const row of parquetRows) {
      if (rows.length >= maxRows || sourceRows >= maxRowsForSource) break;
      if (row.t_active !== undefined && row.t_active !== null && Number(row.t_active) === 0) continue;
      const english = normalizeBulkText(row.t_main_en ?? "").toLowerCase();
      const khmer = normalizeBulkText(row.t_main_kh ?? "");
      const key = `${normalizeBulkComparable(english)}:${normalizeBulkComparable(khmer)}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      if (
        addWeakDictionaryRow(
          rows,
          {
            source: "seanghay_lexicon_kh",
            source_id: "seanghay-lexicon-kh-parquet",
            language_code: "KM",
            source_text: english,
            value: khmer,
          },
          maxRows
        )
      ) {
        sourceRows += 1;
        countsByLanguage.set("KM", (countsByLanguage.get("KM") ?? 0) + 1);
      }
    }
  } catch {
    // Parquet support is optional; missing pyarrow or malformed cache should fail soft.
  }
  return sourceRows;
}

async function readMyanmarOpenWordnetTab(file, rows, countsByLanguage, maxRows, maxRowsForSource) {
  if (!(await pathExists(file))) return 0;
  const reader = readline.createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  let sourceRows = 0;
  const seen = new Set();
  for await (const line of reader) {
    if (rows.length >= maxRows || sourceRows >= maxRowsForSource) break;
    if (!line.trim() || line.startsWith("#")) continue;
    const cols = splitDelimited(line, "\t");
    const synset = normalizeBulkText(cols[0] ?? "");
    const value = normalizeBulkText(cols[2] ?? "");
    const key = normalizeBulkComparable(value);
    if (!synset || !key || seen.has(`${synset}:${key}`)) continue;
    seen.add(`${synset}:${key}`);
    if (
      addWeakNativeLexiconRow(
        rows,
        {
          source: "myanmar_open_wordnet",
          source_id: "myanmar-open-wordnet-013-tab",
          language_code: "MY",
          source_text: synset,
          value,
          part_of_speech: synset.match(/-([a-z])$/u)?.[1] ?? "",
        },
        maxRows
      )
    ) {
      sourceRows += 1;
      countsByLanguage.set("MY", (countsByLanguage.get("MY") ?? 0) + 1);
    }
  }
  return sourceRows;
}

async function readNepaliBrihatSabdakosh(file, rows, countsByLanguage, maxRows, maxRowsForSource) {
  if (!(await pathExists(file))) return 0;
  let parsed = [];
  try {
    parsed = JSON.parse(await readGzipFile(file));
  } catch {
    return 0;
  }
  let sourceRows = 0;
  const seen = new Set();
  for (const entry of Array.isArray(parsed) ? parsed : []) {
    if (rows.length >= maxRows || sourceRows >= maxRowsForSource) break;
    const value = normalizeBulkText(entry?.word ?? "");
    const key = normalizeBulkComparable(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const firstDefinition = Array.isArray(entry?.definitions) ? entry.definitions[0] : null;
    if (
      addWeakNativeLexiconRow(
        rows,
        {
          source: "nepali_brihat_sabdakosh",
          source_id: "nepali-brihat-sabdakosh-json-gz",
          language_code: "NE",
          source_text: firstDefinition?.grammar ?? "Nepali Brihat Sabdakosh headword",
          value,
          part_of_speech: firstDefinition?.grammar ?? "",
        },
        maxRows
      )
    ) {
      sourceRows += 1;
      countsByLanguage.set("NE", (countsByLanguage.get("NE") ?? 0) + 1);
    }
  }
  return sourceRows;
}

export async function buildWeakDictionariesIndex(options = {}) {
  const maxRows = Number(options.maxRows ?? 600000);
  const rows = [];
  const countsByLanguage = new Map();
  const sinhalaPath = path.join(
    projectRoot,
    "reference-sources/raw/official-dictionaries/sinhala-para-dict/En-Si-dict-filtered-V2.tsv"
  );
  const uzwordnetPath = path.join(projectRoot, "reference-sources/raw/official-dictionaries/uzwordnet/uzwordnet.json");
  const myanmarMcfnlpPath = path.join(projectRoot, "reference-sources/raw/official-dictionaries/myanmar-mcfnlp/train-00000-of-00001.parquet");
  const georgianLexiconPath = path.join(projectRoot, "reference-sources/raw/hf-corpora/darsala-english-georgian/lexicon.parquet");
  const alarKnPath = path.join(projectRoot, "reference-sources/raw/official-dictionaries/alar-kn/alar.yml");
  const tezaursLvPath = path.join(projectRoot, "reference-sources/raw/official-dictionaries/tezaurs-lv/tezaurs.zip");
  const slovakWordnetPath = path.join(projectRoot, "reference-sources/raw/official-dictionaries/slovak-wordnet/sk-wn-2013-01-23.txt.gz");
  const sloleksSlPath = path.join(projectRoot, "reference-sources/raw/official-dictionaries/sloleks/Sloleks.3.0.zip");
  const kalebuKamusiSwPath = path.join(projectRoot, "reference-sources/raw/official-dictionaries/kalebu-kamusi/words.csv");
  const khmerLexiconPath = path.join(projectRoot, "reference-sources/raw/official-dictionaries/seanghay-lexicon-kh/train-00000-of-00001.parquet");
  const myanmarOpenWordnetPath = path.join(projectRoot, "reference-sources/raw/official-dictionaries/myanmar-open-wordnet/mow-0.1.3-mya_20171005165336.tab");
  const nepaliBrihatPath = path.join(projectRoot, "reference-sources/raw/official-dictionaries/nepali-brihat-sabdakosh/sabdakosh.json.gz");
  const maxRowsPerV2Source = Math.max(120000, Math.floor(maxRows / 12));

  if (await pathExists(sinhalaPath)) {
    const reader = readline.createInterface({ input: createReadStream(sinhalaPath, { encoding: "utf8" }), crlfDelay: Infinity });
    for await (const line of reader) {
      if (!line.trim()) continue;
      const cols = splitDelimited(line, "\t");
      if (
        addWeakDictionaryRow(
          rows,
          {
            source: "sinhala_para_dict",
            source_id: "sinhala-para-dict-filtered-v2",
            language_code: "SI",
            source_text: cols[0],
            value: cols[1],
          },
          maxRows
        )
      ) {
        countsByLanguage.set("SI", (countsByLanguage.get("SI") ?? 0) + 1);
      }
      if (rows.length >= maxRows) break;
    }
  }

  if ((await pathExists(uzwordnetPath)) && rows.length < maxRows) {
    try {
      const parsed = JSON.parse(await readFile(uzwordnetPath, "utf8"));
      const graph = Array.isArray(parsed?.["@graph"]) ? parsed["@graph"] : [];
      const lexicon = graph.find((node) => Array.isArray(node.entry));
      for (const entry of lexicon?.entry ?? []) {
        const writtenForm = entry?.lemma?.writtenForm;
        const senseRefs = Array.isArray(entry?.sense) ? entry.sense.map((sense) => sense.synsetRef).filter(Boolean).slice(0, 8) : [];
        if (
          addWeakNativeLexiconRow(
            rows,
            {
              source: "uzwordnet",
              source_id: "uzwordnet-json-1-0",
              language_code: "UZ",
              source_text: senseRefs.join(" "),
              value: writtenForm,
              part_of_speech: entry?.partOfSpeech ?? "",
            },
            maxRows
          )
        ) {
          countsByLanguage.set("UZ", (countsByLanguage.get("UZ") ?? 0) + 1);
        }
        if (rows.length >= maxRows) break;
      }
    } catch {
      // UzWordnet is optional and rebuildable; malformed local cache should not break other weak indexes.
    }
  }

  if ((await pathExists(myanmarMcfnlpPath)) && rows.length < maxRows) {
    try {
      const parquetRows = await readParquetRows(myanmarMcfnlpPath, ["word", "definition", "pos"], Math.min(maxRows - rows.length, 150000));
      for (const row of parquetRows) {
        if (
          addWeakDictionaryRow(
            rows,
            {
              source: "myanmar_mcfnlp_dict",
              source_id: "myanmar-mcfnlp-dictionary-parquet",
              language_code: "MY",
              source_text: row.word,
              value: row.definition,
            },
            maxRows
          )
        ) {
          countsByLanguage.set("MY", (countsByLanguage.get("MY") ?? 0) + 1);
        }
        if (rows.length >= maxRows) break;
      }
    } catch {
      // Parquet support is optional; missing pyarrow or malformed cache should fail soft.
    }
  }

  if ((await pathExists(georgianLexiconPath)) && rows.length < maxRows) {
    try {
      const parquetRows = await readParquetRows(georgianLexiconPath, ["en", "ka"], Math.min(maxRows - rows.length, 150000));
      for (const row of parquetRows) {
        if (
          addWeakDictionaryRow(
            rows,
            {
              source: "darsala_en_ka_lexicon",
              source_id: "darsala-english-georgian-lexicon-parquet",
              language_code: "KA",
              source_text: row.en,
              value: row.ka,
            },
            maxRows
          )
        ) {
          countsByLanguage.set("KA", (countsByLanguage.get("KA") ?? 0) + 1);
        }
        if (rows.length >= maxRows) break;
      }
    } catch {
      // Parquet support is optional; missing pyarrow or malformed cache should fail soft.
    }
  }

  if (rows.length < maxRows) {
    await readSeanghayKhmerLexiconParquet(khmerLexiconPath, rows, countsByLanguage, maxRows, maxRowsPerV2Source);
  }
  if (rows.length < maxRows) {
    await readMyanmarOpenWordnetTab(myanmarOpenWordnetPath, rows, countsByLanguage, maxRows, maxRowsPerV2Source);
  }
  if (rows.length < maxRows) {
    await readNepaliBrihatSabdakosh(nepaliBrihatPath, rows, countsByLanguage, maxRows, maxRowsPerV2Source);
  }
  if (rows.length < maxRows) {
    await readAlarKannadaDictionary(alarKnPath, rows, countsByLanguage, maxRows, maxRowsPerV2Source);
  }
  if (rows.length < maxRows) {
    await readSlovakWordnet(slovakWordnetPath, rows, countsByLanguage, maxRows, maxRowsPerV2Source);
  }
  if (rows.length < maxRows) {
    await readTezaursLatvianZip(tezaursLvPath, rows, countsByLanguage, maxRows, maxRowsPerV2Source);
  }
  if (rows.length < maxRows) {
    await readSloleksSlovenianZip(sloleksSlPath, rows, countsByLanguage, maxRows, maxRowsPerV2Source);
  }
  if (rows.length < maxRows) {
    await readKalebuKamusiSwahiliCsv(kalebuKamusiSwPath, rows, countsByLanguage, maxRows);
  }

  rows.sort((left, right) =>
    `${left.language_code ?? ""}:${left.source ?? ""}:${left.token_key ?? ""}`.localeCompare(
      `${right.language_code ?? ""}:${right.source ?? ""}:${right.token_key ?? ""}`
    )
  );
  await writeJsonl(indexFiles.weakDictionaries, rows);
  return {
    source: "weak_dictionaries",
    rows_written: rows.length,
    languages_indexed: countsByLanguage.size,
    index_path: path.relative(projectRoot, indexFiles.weakDictionaries),
    warning: rows.length === 0 ? "missing_or_empty_weak_dictionary_sources" : undefined,
  };
}

function addWeakExampleRow(rows, row, maxRows) {
  const sourceText = normalizeBulkText(row.source_text);
  const targetText = normalizeBulkText(row.target_text);
  const languageCode = normalizeBulkText(row.language_code);
  if (rows.length >= maxRows) return false;
  if (!sourceText || !targetText || !languageCode) return false;
  if (sourceText.length > 220 || targetText.length > 260) return false;
  if (/\p{Control}/u.test(sourceText) || /\p{Control}/u.test(targetText)) return false;
  const sourceKey = tokens(sourceText).join(" ");
  const tokenKey = tokens(targetText).join(" ");
  if (!sourceKey || !tokenKey) return false;
  rows.push({
    source: row.source,
    source_id: row.source_id,
    language_code: languageCode,
    source_text: sourceText,
    source_key: sourceKey,
    target_text: targetText,
    token_key: tokenKey,
    confidence: "source_partial",
  });
  return true;
}

async function readCsvExampleFile(file, config, rows, countsByLanguage, maxRows) {
  if (!(await pathExists(file))) return;
  const reader = readline.createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  let headers = null;
  for await (const line of reader) {
    if (!line.trim()) continue;
    const cols = splitCsv(line);
    if (!headers) {
      headers = cols.map((col) => normalizeBulkText(col));
      continue;
    }
    const row = Object.fromEntries(headers.map((header, index) => [header, cols[index] ?? ""]));
    if (
      addWeakExampleRow(
        rows,
        {
          source: config.source,
          source_id: config.source_id,
          language_code: config.language_code,
          source_text: row[config.source_col],
          target_text: row[config.target_col],
        },
        maxRows
      )
    ) {
      countsByLanguage.set(config.language_code, (countsByLanguage.get(config.language_code) ?? 0) + 1);
    }
    if (rows.length >= maxRows) break;
  }
}

async function readFlexibleCsvExampleFile(file, config, rows, countsByLanguage, maxRows) {
  if (!(await pathExists(file))) return;
  const reader = readline.createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  let headers = null;
  let sourceColumn = -1;
  let targetColumn = -1;
  for await (const line of reader) {
    if (!line.trim()) continue;
    const cols = splitCsv(line);
    if (!headers) {
      headers = cols.map((col) => normalizeBulkComparable(col));
      sourceColumn = headers.findIndex((header) => config.source_headers.includes(header));
      targetColumn = headers.findIndex((header) => config.target_headers.includes(header));
      if (sourceColumn < 0 || targetColumn < 0) return;
      continue;
    }
    if (
      addWeakExampleRow(
        rows,
        {
          source: config.source,
          source_id: config.source_id,
          language_code: config.language_code,
          source_text: cols[sourceColumn],
          target_text: cols[targetColumn],
        },
        maxRows
      )
    ) {
      countsByLanguage.set(config.language_code, (countsByLanguage.get(config.language_code) ?? 0) + 1);
    }
    if (rows.length >= maxRows) break;
  }
}

async function readAltDataMap(zipPath, members, code) {
  const member = members.find((candidate) => candidate.endsWith(`/data_${code}.txt`) || candidate === `data_${code}.txt`);
  if (!member) return new Map();
  const content = await readZipMember(zipPath, member);
  const rows = new Map();
  for (const line of content.split(/\r?\n/u)) {
    if (!line.trim()) continue;
    const cols = splitDelimited(line, "\t");
    const sentenceId = normalizeBulkText(cols[0]);
    const text = normalizeBulkText(cols.slice(1).join("\t"));
    if (sentenceId && text) rows.set(sentenceId, text);
  }
  return rows;
}

async function readAltParallelExamples(zipPath, rows, countsByLanguage, maxRows) {
  if (!(await pathExists(zipPath))) return;
  let members = [];
  try {
    members = await listZipMembers(zipPath);
  } catch {
    return;
  }
  const englishRows = await readAltDataMap(zipPath, members, "en");
  if (englishRows.size === 0) return;
  const targets = [
    ["bg", "BN"],
    ["fil", "TL"],
    ["hi", "HI"],
    ["id", "ID"],
    ["ja", "JA"],
    ["khm", "KM"],
    ["lo", "LO"],
    ["ms", "MS"],
    ["my", "MY"],
    ["th", "TH"],
    ["vi", "VI"],
    ["zh", "ZH"],
  ];
  for (const [memberCode, languageCode] of targets) {
    if (rows.length >= maxRows) break;
    const targetRows = await readAltDataMap(zipPath, members, memberCode);
    if (targetRows.size === 0) continue;
    for (const [sentenceId, sourceText] of englishRows.entries()) {
      const targetText = targetRows.get(sentenceId);
      if (
        addWeakExampleRow(
          rows,
          {
            source: "alt_parallel",
            source_id: "alt-parallel-corpus-20191206",
            language_code: languageCode,
            source_text: sourceText,
            target_text: targetText,
          },
          maxRows
        )
      ) {
        countsByLanguage.set(languageCode, (countsByLanguage.get(languageCode) ?? 0) + 1);
      }
      if (rows.length >= maxRows) break;
    }
  }
}

async function readGeorgianLexiconExamples(file, rows, countsByLanguage, maxRows) {
  if (!(await pathExists(file))) return;
  try {
    const parquetRows = await readParquetRows(file, ["en", "ka"], Math.min(maxRows - rows.length, 150000));
    for (const row of parquetRows) {
      if (
        addWeakExampleRow(
          rows,
          {
            source: "darsala_en_ka_lexicon",
            source_id: "darsala-english-georgian-lexicon-parquet",
            language_code: "KA",
            source_text: row.en,
            target_text: row.ka,
          },
          maxRows
        )
      ) {
        countsByLanguage.set("KA", (countsByLanguage.get("KA") ?? 0) + 1);
      }
      if (rows.length >= maxRows) break;
    }
  } catch {
    // Parquet support is optional; missing pyarrow or malformed cache should fail soft.
  }
}

async function readLocalDocAzerbaijaniExamples(file, rows, countsByLanguage, maxRows) {
  if (!(await pathExists(file))) return;
  try {
    const parquetRows = await readParquetRows(
      file,
      ["src_lang", "tgt_lang", "src_text", "tgt_text"],
      Math.min(maxRows - rows.length, 150000)
    );
    for (const row of parquetRows) {
      const srcLang = normalizeBulkComparable(row.src_lang ?? "");
      const tgtLang = normalizeBulkComparable(row.tgt_lang ?? "");
      let sourceText = "";
      let targetText = "";
      if (/^(en|eng)/u.test(srcLang) && /^(az|azj|aze)/u.test(tgtLang)) {
        sourceText = row.src_text;
        targetText = row.tgt_text;
      } else if (/^(az|azj|aze)/u.test(srcLang) && /^(en|eng)/u.test(tgtLang)) {
        sourceText = row.tgt_text;
        targetText = row.src_text;
      }
      if (
        addWeakExampleRow(
          rows,
          {
            source: "localdoc_az_en_size_balanced",
            source_id: "localdoc-azerbaijani-english-parallel-size-balanced",
            language_code: "AZ",
            source_text: sourceText,
            target_text: targetText,
          },
          maxRows
        )
      ) {
        countsByLanguage.set("AZ", (countsByLanguage.get("AZ") ?? 0) + 1);
      }
      if (rows.length >= maxRows) break;
    }
  } catch {
    // Parquet support is optional; malformed or unavailable local cache should fail soft.
  }
}

function looksKazakhCyrillicText(text) {
  return /[\u0400-\u04FF]/u.test(normalizeBulkText(text));
}

function looksEnglishLatinText(text) {
  const value = normalizeBulkText(text);
  return /[A-Za-z]/u.test(value) && !/[\u0400-\u04FF]/u.test(value);
}

async function readKkEnCorporaZip(zipPath, rows, countsByLanguage, maxRows) {
  if (!(await pathExists(zipPath))) return;
  let members = [];
  try {
    members = await listZipMembers(zipPath);
  } catch {
    return;
  }
  const sourceMember = members.find((member) => /(^|\/)src\.txt$/u.test(member));
  const targetMember = members.find((member) => /(^|\/)tgt\.txt$/u.test(member));
  if (!sourceMember || !targetMember) return;
  let sourceLines = [];
  let targetLines = [];
  try {
    sourceLines = (await readZipMember(zipPath, sourceMember)).split(/\r?\n/u);
    targetLines = (await readZipMember(zipPath, targetMember)).split(/\r?\n/u);
  } catch {
    return;
  }
  const pairCount = Math.min(sourceLines.length, targetLines.length);
  for (let index = 0; index < pairCount; index += 1) {
    if (rows.length >= maxRows) break;
    const left = sourceLines[index];
    const right = targetLines[index];
    const leftKazakh = looksKazakhCyrillicText(left);
    const rightKazakh = looksKazakhCyrillicText(right);
    const leftEnglish = looksEnglishLatinText(left);
    const rightEnglish = looksEnglishLatinText(right);
    let sourceText = "";
    let targetText = "";
    if (leftEnglish && rightKazakh) {
      sourceText = left;
      targetText = right;
    } else if (rightEnglish && leftKazakh) {
      sourceText = right;
      targetText = left;
    } else {
      continue;
    }
    if (
      addWeakExampleRow(
        rows,
        {
          source: "kk_en_corpora_zenodo",
          source_id: "kk-en-corpora-zenodo-v1",
          language_code: "KK",
          source_text: sourceText,
          target_text: targetText,
        },
        maxRows
      )
    ) {
      countsByLanguage.set("KK", (countsByLanguage.get("KK") ?? 0) + 1);
    }
  }
}

export async function buildWeakExamplesIndex(options = {}) {
  const maxRows = Number(options.maxRows ?? 300000);
  const rows = [];
  const countsByLanguage = new Map();
  const exampleFiles = [
    {
      file: path.join(projectRoot, "reference-sources/raw/hf-corpora/sinhala-english-singlish/data.csv"),
      source: "sinhala_english_singlish",
      source_id: "sinhala-english-singlish-hf-20250526",
      language_code: "SI",
      source_col: "English",
      target_col: "Sinhala",
    },
    {
      file: path.join(projectRoot, "reference-sources/raw/hf-corpora/kaung-nyo-lwin-english-myanmar/train.csv"),
      source: "kaung_en_my",
      source_id: "kaung-nyo-lwin-english-myanmar-train",
      language_code: "MY",
      source_col: "en",
      target_col: "my",
    },
    {
      file: path.join(projectRoot, "reference-sources/raw/hf-corpora/kaung-nyo-lwin-english-myanmar/validation.csv"),
      source: "kaung_en_my",
      source_id: "kaung-nyo-lwin-english-myanmar-validation",
      language_code: "MY",
      source_col: "en",
      target_col: "my",
    },
    {
      file: path.join(projectRoot, "reference-sources/raw/hf-corpora/kaung-nyo-lwin-english-myanmar/test.csv"),
      source: "kaung_en_my",
      source_id: "kaung-nyo-lwin-english-myanmar-test",
      language_code: "MY",
      source_col: "en",
      target_col: "my",
    },
    {
      file: path.join(projectRoot, "reference-sources/raw/hf-corpora/hfcourse-english-burmese/data.csv"),
      source: "hfcourse_en_my",
      source_id: "hfcourse-english-burmese-corpus",
      language_code: "MY",
      source_col: "English",
      target_col: "Burmese",
    },
  ];

  for (const config of exampleFiles) {
    await readCsvExampleFile(config.file, config, rows, countsByLanguage, maxRows);
    if (rows.length >= maxRows) break;
  }
  await readLocalDocAzerbaijaniExamples(
    path.join(projectRoot, "reference-sources/raw/hf-corpora/localdoc-azerbaijani-english-size-balanced/train-00000-of-00001.parquet"),
    rows,
    countsByLanguage,
    maxRows
  );
  await readAltParallelExamples(
    path.join(projectRoot, "reference-sources/raw/hf-corpora/alt/ALT-Parallel-Corpus-20191206.zip"),
    rows,
    countsByLanguage,
    maxRows
  );
  await readGeorgianLexiconExamples(
    path.join(projectRoot, "reference-sources/raw/hf-corpora/darsala-english-georgian/lexicon.parquet"),
    rows,
    countsByLanguage,
    maxRows
  );
  await readFlexibleCsvExampleFile(
    path.join(projectRoot, "reference-sources/raw/hf-corpora/kazparc/01_kazparc_all_entries.csv"),
    {
      source: "kazparc_kk",
      source_id: "kazparc-kk-en-all-entries",
      language_code: "KK",
      source_headers: ["en", "english", "eng"],
      target_headers: ["kk", "kazakh", "kaz"],
    },
    rows,
    countsByLanguage,
    maxRows
  );
  await readKkEnCorporaZip(
    path.join(projectRoot, "reference-sources/raw/hf-corpora/kk-en-corpora/kk_en_corpora-v1.zip"),
    rows,
    countsByLanguage,
    maxRows
  );

  await writeJsonl(indexFiles.weakExamples, rows);
  return {
    source: "weak_examples",
    rows_written: rows.length,
    languages_indexed: countsByLanguage.size,
    index_path: path.relative(projectRoot, indexFiles.weakExamples),
    warning: rows.length === 0 ? "missing_or_empty_weak_example_sources" : undefined,
  };
}

function rowLanguageCode(row) {
  return row.language_code ?? row.languageCode ?? "";
}

function rowEnglish(row) {
  return row.canonical_english ?? row.canonicalEnglish ?? "";
}

function rowNative(row) {
  return row.native_word ?? row.display_word ?? row.word_with_article_or_marker ?? "";
}

function rowExample(row) {
  return row.example_text ?? row.target_example ?? row.example ?? "";
}

function rowStableLookupKey(row) {
  return {
    set_id: row.set_id ?? row.setId ?? "",
    meaning_id: row.meaning_id ?? row.meaningId ?? "",
    language_code: rowLanguageCode(row),
    canonical_english: rowEnglish(row),
    native_word: rowNative(row),
    display_word: row.word_with_article_or_marker ?? row.display_word ?? "",
    example_text: rowExample(row),
  };
}

async function bulkLookupSourceStats() {
  const stats = [];
  for (const [source, file] of Object.entries(indexFiles)) {
    try {
      const info = await stat(file);
      stats.push({ source, path: path.relative(projectRoot, file), bytes: info.size, mtime_ms: info.mtimeMs });
    } catch {
      stats.push({ source, path: path.relative(projectRoot, file), missing: true });
    }
  }
  return stats;
}

function bulkLookupCachePath(cacheKey) {
  return path.join(lookupCacheRoot, `batch_${cacheKey}.json`);
}

async function readBulkLookupCache(cacheKey, sourceStats) {
  try {
    const parsed = JSON.parse(await readFile(bulkLookupCachePath(cacheKey), "utf8"));
    if (parsed?.type !== "bulk-source-hints-batch-cache-v1") return null;
    if (parsed.rule_version !== bulkLookupRuleVersion) return null;
    if (parsed.cache_key !== cacheKey) return null;
    if (JSON.stringify(parsed.source_stats ?? []) !== JSON.stringify(sourceStats)) return null;
    return parsed.result ?? null;
  } catch {
    return null;
  }
}

async function writeBulkLookupCache(cacheKey, sourceStats, result) {
  try {
    await mkdir(lookupCacheRoot, { recursive: true });
    await writeFile(
      bulkLookupCachePath(cacheKey),
      JSON.stringify(
        {
          type: "bulk-source-hints-batch-cache-v1",
          rule_version: bulkLookupRuleVersion,
          generated_at: new Date().toISOString(),
          cache_key: cacheKey,
          source_stats: sourceStats,
          result,
        },
        null,
        2
      ) + "\n",
      "utf8"
    );
  } catch {
    // Cache writes are best-effort; source hints are rebuildable.
  }
}

function matchesTokenKey(row, item) {
  if (item.source === "panlex_meaning") {
    const englishKey = normalizeBulkComparable(rowEnglish(row));
    const nativeKey = normalizeBulkComparable(rowNative(row));
    return Boolean(
      (englishKey && item.source_key === englishKey) ||
        (nativeKey && item.token_key === nativeKey)
    );
  }
  const haystack = normalizeBulkComparable(`${item.source_key ?? ""} ${item.token_key ?? ""} ${item.value ?? ""} ${item.source_text ?? ""} ${item.target_text ?? ""} ${item.text ?? ""} ${item.concept_gloss ?? ""}`);
  const needles = tokens(`${rowEnglish(row)} ${rowNative(row)}`).filter((token) => token.length >= 3);
  return needles.some((needle) => haystack.split(" ").includes(needle));
}

function baseReport(row, item, field, value) {
  return {
    source_id: item.source_id,
    adapter: item.source,
    set_id: row.set_id ?? row.setId ?? "",
    meaning_id: row.meaning_id ?? row.meaningId ?? "",
    canonical_english: rowEnglish(row),
    field,
    value,
    confidence: "source_partial",
    source_ids: [item.source_id].filter(Boolean),
    note: `${item.source} bulk index candidate; repair hint only, not final truth.`,
    language_code: rowLanguageCode(row),
  };
}

export async function buildBulkSourceHintsForRows(rows, options = {}) {
  const maxScan = Number(options.maxScan ?? 25000);
  const maxLines = Number(options.maxLines ?? process.env.BULK_SOURCE_MAX_LINES ?? Math.max(maxScan * 20, 200000));
  const maxTranslationCandidates = Number(options.maxTranslationCandidates ?? 2000);
  const maxTranslationCandidatesPerRow = Number(options.maxTranslationCandidatesPerRow ?? 25);
  const maxExampleCandidates = Number(options.maxExampleCandidates ?? 2000);
  const maxExampleCandidatesPerRow = Number(options.maxExampleCandidatesPerRow ?? 12);
  const maxConceptCandidates = Number(options.maxConceptCandidates ?? 2000);
  const maxConceptCandidatesPerRow = Number(options.maxConceptCandidatesPerRow ?? 12);
  const sourceStats = await bulkLookupSourceStats();
  const cacheKey = createHash("sha256")
    .update(bulkLookupRuleVersion)
    .update("\0")
    .update(JSON.stringify(rows.map(rowStableLookupKey)))
    .update("\0")
    .update(String(maxScan))
    .update("\0")
    .update(String(maxLines))
    .update("\0")
    .update(String(maxTranslationCandidates))
    .update("\0")
    .update(String(maxTranslationCandidatesPerRow))
    .update("\0")
    .update(String(maxExampleCandidates))
    .update("\0")
    .update(String(maxExampleCandidatesPerRow))
    .update("\0")
    .update(String(maxConceptCandidates))
    .update("\0")
    .update(String(maxConceptCandidatesPerRow))
    .digest("hex")
    .slice(0, 24);
  const cached = await readBulkLookupCache(cacheKey, sourceStats);
  if (cached) return cached;

  const languages = new Set(rows.map(rowLanguageCode).filter(Boolean));
  const needles = new Set(
    rows.flatMap((row) => tokens(`${rowEnglish(row)} ${rowNative(row)}`).filter((token) => token.length >= 3))
  );
  const [opusRows, tatoebaRows, panlexRows, panlexMeaningRows, weakDictionaryRows, weakExampleRows, wikidataRows, conceptRows, hunspellLookup] = await Promise.all([
    readIndexJsonlFiltered(indexFiles.opus, { limit: maxScan, maxLines, languages, needles }),
    readIndexJsonlFiltered(indexFiles.tatoeba, { limit: maxScan, maxLines, languages, needles }),
    readIndexJsonlFiltered(indexFiles.panlex, { limit: Math.max(maxScan, 50000), maxLines, languages, needles }),
    readIndexJsonlFiltered(indexFiles.panlexMeanings, { limit: Math.max(maxScan, 50000), maxLines, languages, needles }),
    readIndexJsonlFiltered(indexFiles.weakDictionaries, {
      limit: Math.max(maxScan, 50000),
      maxLines: Math.max(maxLines, 1800000),
      languages,
      needles,
    }),
    readIndexJsonlFiltered(indexFiles.weakExamples, { limit: maxScan, maxLines, languages, needles }),
    readIndexJsonlFiltered(indexFiles.wikidata, { limit: maxScan, maxLines, languages, needles }),
    readIndexJsonlFiltered(indexFiles.concepts, {
      limit: maxScan,
      maxLines,
      languages,
      extraLanguages: new Set(["EN"]),
      needles,
    }),
    readHunspellLookupForRows(indexFiles.hunspell, rows, { maxLines }),
  ]);
  const translationCandidates = [];
  const exampleCollocationCandidates = [];
  const conceptSanity = [];
  const spellingSanity = [];
  for (const row of rows) {
    const languageCode = rowLanguageCode(row);
    const nativeComparable = normalizeBulkComparable(rowNative(row));
    let rowTranslationCandidates = 0;
    for (const item of [...weakDictionaryRows, ...panlexMeaningRows, ...panlexRows, ...wikidataRows, ...conceptRows]) {
      if (translationCandidates.length >= maxTranslationCandidates) break;
      if (rowTranslationCandidates >= maxTranslationCandidatesPerRow) break;
      if (item.language_code && item.language_code !== languageCode) continue;
      if (!matchesTokenKey(row, item)) continue;
      translationCandidates.push(baseReport(row, item, "native_word", item.value ?? item.concept_gloss ?? ""));
      rowTranslationCandidates += 1;
    }
    let rowExampleCandidates = 0;
    for (const item of [...weakExampleRows, ...opusRows, ...tatoebaRows]) {
      if (exampleCollocationCandidates.length >= maxExampleCandidates) break;
      if (rowExampleCandidates >= maxExampleCandidatesPerRow) break;
      if (item.language_code !== languageCode) continue;
      if (!matchesTokenKey(row, item)) continue;
      exampleCollocationCandidates.push({
        source_id: item.source_id,
        adapter: item.source,
        language_code: languageCode,
        meaning_id: row.meaning_id ?? row.meaningId ?? "",
        canonical_english: rowEnglish(row),
        target_anchor: rowNative(row),
        source_text: item.source_text ?? "",
        target_text: item.target_text ?? item.text ?? "",
        confidence: "source_partial",
        note: `${item.source} collocation/example hint; corpus disagreement alone is never a blocker.`,
      });
      rowExampleCandidates += 1;
    }
    let rowConceptCandidates = 0;
    for (const item of conceptRows) {
      if (conceptSanity.length >= maxConceptCandidates) break;
      if (rowConceptCandidates >= maxConceptCandidatesPerRow) break;
      if (item.language_code && item.language_code !== languageCode && item.language_code !== "EN") continue;
      if (!matchesTokenKey(row, item)) continue;
      conceptSanity.push({
        source_id: item.source_id,
        adapter: item.source,
        language_code: languageCode,
        meaning_id: row.meaning_id ?? row.meaningId ?? "",
        concept_id: item.concept_id ?? "",
        concept_gloss: item.concept_gloss ?? item.value ?? "",
        candidate_value: item.value ?? "",
        confidence: "source_partial",
        note: "Concept sanity hint only; use for semantic granularity/false-friend review, not automatic approval.",
      });
      rowConceptCandidates += 1;
    }
    if (hunspellLookup.languagesPresent.has(languageCode) && nativeComparable) {
      const exact = hunspellLookup.exactMatches.has(`${languageCode}::${nativeComparable}`);
      if (!exact) {
        spellingSanity.push({
          source_id: "libreoffice-dictionaries-master-zip",
          adapter: "hunspell",
          language_code: languageCode,
          meaning_id: row.meaning_id ?? row.meaningId ?? "",
          field: "native_word",
          current_value: rowNative(row),
          status: "not_found",
          confidence: "source_partial",
          note: "Hunspell spelling sanity did not find an exact display/native form; warning only, never translation truth.",
        });
      }
    }
    if (!rowExample(row) && false) {
      // Keep rowExample referenced for future scene-aware corpus filters without changing current behavior.
    }
  }
  const result = { translationCandidates, exampleCollocationCandidates, conceptSanity, spellingSanity };
  await writeBulkLookupCache(cacheKey, sourceStats, result);
  return result;
}

export async function bulkIndexStatus() {
  const status = {};
  for (const [name, file] of Object.entries(indexFiles)) {
    try {
      const info = await stat(file);
      status[name] = { present: true, bytes: info.size, path: path.relative(projectRoot, file) };
    } catch {
      status[name] = { present: false, path: path.relative(projectRoot, file) };
    }
  }
  return status;
}

export { indexFiles };
