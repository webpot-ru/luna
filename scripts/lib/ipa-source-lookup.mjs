import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { createGunzip } from "node:zlib";

export const ipaSourceLookupRuleVersion = "ipa-source-lookup-v7";

export const ipaSourceLookupLanguages = new Set(["EN", "EN-GB", "FR", "SV", "NB", "DA", "IS"]);

const cacheDir = path.resolve("reference-sources/cache/ipa-source-lookup");

const languageConfigs = {
  EN: {
    sourceIds: ["ipa-focused-english-us-cmudict-dict", "kaikki-english"],
    sourceFiles: [
      "reference-sources/raw/ipa-focused/english-us/cmudict.dict",
      "reference-sources/raw/wiktionary-kaikki/kaikki.org-dictionary-English.jsonl.gz",
    ],
    loader: loadEnglishUsSources,
  },
  "EN-GB": {
    sourceIds: ["ipa-focused-english-gb-britfone-main", "kaikki-english"],
    sourceFiles: [
      "reference-sources/raw/ipa-focused/english-gb/britfone.main.3.0.1.csv",
      "reference-sources/raw/wiktionary-kaikki/kaikki.org-dictionary-English.jsonl.gz",
    ],
    loader: loadEnglishGbSources,
  },
  FR: {
    sourceIds: ["ipa-focused-french-lexique383-tsv", "kaikki-french"],
    sourceFiles: [
      "reference-sources/raw/ipa-focused/french/Lexique383.tsv",
      "reference-sources/raw/wiktionary-kaikki/kaikki.org-dictionary-French.jsonl.gz",
    ],
    loader: loadFrenchSources,
  },
  SV: {
    sourceIds: ["ipa-focused-swedish-nst-leksikon", "kaikki-swedish"],
    sourceFiles: [
      "reference-sources/raw/ipa-focused/swedish/sv.leksikon.tar.gz",
      "reference-sources/raw/wiktionary-kaikki/kaikki.org-dictionary-Swedish.jsonl.gz",
    ],
    loader: loadSwedishSources,
  },
  NB: {
    sourceIds: [
      "ipa-focused-norwegian-nb-uttale-leksika",
      "ipa-focused-norwegian-nlb-trans",
      "kaikki-norwegian-bokmal",
    ],
    sourceFiles: [
      "reference-sources/raw/ipa-focused/norwegian/nb_uttale_leksika.zip",
      "reference-sources/raw/ipa-focused/norwegian/20191016_nlb_trans.tar.gz",
      "reference-sources/raw/wiktionary-kaikki/kaikki.org-dictionary-NorwegianBokmal.jsonl",
    ],
    loader: loadNorwegianSources,
  },
  DA: {
    sourceIds: ["ipa-focused-danish-udtaleordbog-dk", "ipa-focused-danish-nst-leksikon", "kaikki-danish"],
    sourceFiles: [
      "reference-sources/raw/ipa-focused/danish/udtaleordbog_dk.txt",
      "reference-sources/raw/ipa-focused/danish/da_leksikon.tar.gz",
      "reference-sources/raw/wiktionary-kaikki/kaikki.org-dictionary-Danish.jsonl.gz",
    ],
    loader: loadDanishSources,
  },
  IS: {
    sourceIds: ["ipa-focused-icelandic-iceprondict-111", "kaikki-icelandic"],
    sourceFiles: [
      "reference-sources/raw/ipa-focused/icelandic/iceprondict-1.1.1.zip",
      "reference-sources/raw/wiktionary-kaikki/kaikki.org-dictionary-Icelandic.jsonl.gz",
    ],
    loader: loadIcelandicSources,
  },
};

const ipaSignalPattern =
  /[ˈˌːˑəɛɪʊʌɔɒɑæɐɜɞɚɝɨɯøœɶɤɘɵɒɶɲŋɳɴʃʒʂʐçɕʑɾɽʁʀɣɰβθðɸʝɦʔɡ̯̩̥̬̪̺̻̟̠̤̰̃̍]/u;
const slashWrappedPattern = /^\/(.+)\/$/u;

const articlesByLanguage = {
  EN: new Set(["a", "an", "the", "to"]),
  "EN-GB": new Set(["a", "an", "the", "to"]),
  FR: new Set(["le", "la", "les", "l", "un", "une", "des", "du", "de", "d"]),
  SV: new Set(["en", "ett"]),
  NB: new Set(["en", "ei", "et"]),
  DA: new Set(["en", "et"]),
  IS: new Set([]),
};

const manualArticleIpa = {
  EN: new Map([
    ["a", [{ value: "/ə/", source_id: "manual-function-word", source_word: "a", source_note: "English unstressed article" }]],
    ["an", [{ value: "/ən/", source_id: "manual-function-word", source_word: "an", source_note: "English unstressed article" }]],
    ["the", [{ value: "/ðə/", source_id: "manual-function-word", source_word: "the", source_note: "English unstressed article" }]],
    ["to", [{ value: "/tə/", source_id: "manual-function-word", source_word: "to", source_note: "English unstressed infinitive marker" }]],
  ]),
  "EN-GB": new Map([
    ["a", [{ value: "/ə/", source_id: "manual-function-word", source_word: "a", source_note: "English unstressed article" }]],
    ["an", [{ value: "/ən/", source_id: "manual-function-word", source_word: "an", source_note: "English unstressed article" }]],
    ["the", [{ value: "/ðə/", source_id: "manual-function-word", source_word: "the", source_note: "English unstressed article" }]],
    ["to", [{ value: "/tə/", source_id: "manual-function-word", source_word: "to", source_note: "English unstressed infinitive marker" }]],
  ]),
  FR: new Map([
    ["le", [{ value: "/lə/", source_id: "manual-function-word", source_word: "le", source_note: "French article" }]],
    ["la", [{ value: "/la/", source_id: "manual-function-word", source_word: "la", source_note: "French article" }]],
    ["les", [{ value: "/le/", source_id: "manual-function-word", source_word: "les", source_note: "French article" }]],
    ["l", [{ value: "/l/", source_id: "manual-function-word", source_word: "l'", source_note: "French elided article" }]],
    ["un", [{ value: "/œ̃/", source_id: "manual-function-word", source_word: "un", source_note: "French article" }]],
    ["une", [{ value: "/yn/", source_id: "manual-function-word", source_word: "une", source_note: "French article" }]],
    ["de", [{ value: "/də/", source_id: "manual-function-word", source_word: "de", source_note: "French preposition/article component" }]],
    ["du", [{ value: "/dy/", source_id: "manual-function-word", source_word: "du", source_note: "French contracted article" }]],
    ["des", [{ value: "/de/", source_id: "manual-function-word", source_word: "des", source_note: "French plural article" }]],
  ]),
};

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeIpaLookupKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .replace(/\([^)]*\)/gu, "")
    .replace(/['’ʼ`´]/gu, " ")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function comparableOrthography(value) {
  return normalizeIpaLookupKey(value);
}

function normalizeIpaComparable(value) {
  return normalizeText(value)
    .replace(/^\/|\/$/gu, "")
    .replace(/[ˈˌ.\s]/gu, "")
    .normalize("NFC");
}

function wrapIpa(value) {
  const text = normalizeText(value).replace(/^\/|\/$/gu, "").trim();
  return text ? `/${text}/` : "";
}

function splitDisplayTokens(value) {
  return normalizeText(value)
    .replace(/([A-Za-zÀ-ž])['’ʼ]([A-Za-zÀ-ž])/gu, "$1 $2")
    .replace(/[‐‑‒–—-]+/gu, " ")
    .split(/[^\p{Letter}\p{Number}]+/u)
    .map((token) => normalizeText(token))
    .filter(Boolean);
}

function rowDisplayWord(row) {
  return normalizeText(row.word_with_article_or_marker ?? row.display_word ?? row.native_word);
}

function rowNativeWord(row) {
  return normalizeText(row.native_word ?? row.word_with_article_or_marker ?? row.display_word);
}

function rowTranscription(row) {
  return normalizeText(row.transcription);
}

function currentIpaInner(row) {
  return rowTranscription(row).match(slashWrappedPattern)?.[1] ?? "";
}

function rowIsOrthographicSlashIpa(row) {
  const inner = normalizeText(currentIpaInner(row));
  if (!inner || ipaSignalPattern.test(inner)) return false;

  const displayComparable = comparableOrthography(rowDisplayWord(row) || rowNativeWord(row));
  const innerComparable = comparableOrthography(inner);
  if (!innerComparable || !displayComparable) return false;
  if (innerComparable === displayComparable) return true;

  const displayTokens = new Set(displayComparable.split(" ").filter(Boolean));
  const innerTokens = innerComparable.split(" ").filter(Boolean);
  return innerTokens.length > 0 && innerTokens.every((token) => displayTokens.has(token));
}

function lookupTermsForRow(row) {
  const languageCode = row.language_code ?? row.languageCode;
  if (!ipaSourceLookupLanguages.has(languageCode)) return [];
  const terms = new Set();
  const display = rowDisplayWord(row);
  const native = rowNativeWord(row);
  for (const value of [display, native]) {
    const key = normalizeIpaLookupKey(value);
    if (key) terms.add(key);
  }

  const articleSet = articlesByLanguage[languageCode] ?? new Set();
  for (const token of splitDisplayTokens(display || native)) {
    const key = normalizeIpaLookupKey(token);
    if (!key) continue;
    terms.add(key);
    if (!articleSet.has(key)) terms.add(key);
  }

  const withoutArticles = splitDisplayTokens(display || native)
    .map((token) => normalizeIpaLookupKey(token))
    .filter((token) => token && !articleSet.has(token))
    .join(" ");
  if (withoutArticles) terms.add(withoutArticles);
  if (rowIsOrthographicSlashIpa(row)) {
    for (const value of [display, native]) {
      for (const term of compoundLookupTermsForValue(value, languageCode)) terms.add(term);
    }
  }
  return [...terms];
}

function compoundLookupTermsForValue(value, languageCode) {
  const key = normalizeIpaLookupKey(value).replace(/\s+/gu, "");
  if (!key || key.length < 7) return [];
  const maxPartLength = Math.min(24, key.length);
  const minPartLength = languageCode === "DA" || languageCode === "NB" || languageCode === "SV" ? 3 : 4;
  const terms = new Set();
  for (let start = 0; start < key.length; start += 1) {
    for (let end = start + minPartLength; end <= key.length && end - start <= maxPartLength; end += 1) {
      const term = key.slice(start, end);
      if (term.length >= minPartLength && term !== key) terms.add(term);
    }
  }
  return [...terms];
}

function candidateObject(value, sourceId, sourceWord, sourceNote = "") {
  return {
    value: wrapIpa(value),
    source_id: sourceId,
    source_word: normalizeText(sourceWord),
    source_note: sourceNote,
  };
}

function addCandidate(results, neededTerms, sourceWord, ipa, sourceId, sourceNote = "") {
  const key = normalizeIpaLookupKey(sourceWord);
  if (!key || !neededTerms.has(key)) return;
  const value = wrapIpa(ipa);
  if (!value) return;
  const candidates = results.get(key) ?? [];
  if (!candidates.some((candidate) => candidate.value === value && candidate.source_id === sourceId)) {
    candidates.push(candidateObject(value, sourceId, sourceWord, sourceNote));
  }
  results.set(key, candidates);
}

function mergeCandidateMaps(...maps) {
  const merged = new Map();
  for (const map of maps) {
    for (const [key, candidates] of map.entries()) {
      const existing = merged.get(key) ?? [];
      for (const candidate of candidates) {
        if (!existing.some((item) => item.value === candidate.value && item.source_id === candidate.source_id)) {
          existing.push(candidate);
        }
      }
      merged.set(key, existing);
    }
  }
  return merged;
}

function addIndexedCandidate(index, key, value, sourceId, sourceWord, sourceNote = "") {
  const wrappedValue = wrapIpa(value);
  if (!key || !wrappedValue) return;
  const candidates = index.get(key) ?? [];
  if (!candidates.some((candidate) => candidate.value === wrappedValue && candidate.source_id === sourceId)) {
    candidates.push(candidateObject(wrappedValue, sourceId, sourceWord, sourceNote));
  }
  index.set(key, candidates);
}

async function* readTextLines(filePath) {
  const source = createReadStream(filePath);
  const input = filePath.endsWith(".gz") ? source.pipe(createGunzip()) : source;
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  for await (const line of rl) yield line;
}

function soundIsRegionalMatch(sound, languageCode) {
  const tags = new Set((sound.tags ?? []).map((tag) => String(tag).toLowerCase()));
  if (languageCode === "EN-GB") {
    if ([...tags].some((tag) => tag === "us" || tag === "america" || tag === "american")) return false;
    if (tags.size === 0) return true;
    return [...tags].some((tag) => ["uk", "british", "england", "received-pronunciation"].includes(tag));
  }
  if (languageCode === "EN") {
    if ([...tags].some((tag) => tag === "uk" || tag === "british" || tag === "england")) return false;
    return true;
  }
  return true;
}

async function loadKaikkiIpaCandidates(neededTerms, languageCode, filePath, sourceId) {
  const results = new Map();
  const index = await loadKaikkiIpaIndex(languageCode, filePath, sourceId);
  for (const term of neededTerms) {
    const candidates = index.get(term);
    if (candidates?.length) results.set(term, candidates);
  }
  return results;
}

async function kaikkiIpaIndexCachePath(languageCode, filePath, sourceId) {
  const signature = await fileSignature(filePath);
  const digest = createHash("sha256")
    .update(ipaSourceLookupRuleVersion)
    .update("kaikki-ipa-full-index-v1")
    .update(languageCode)
    .update(sourceId)
    .update(JSON.stringify(signature))
    .digest("hex")
    .slice(0, 24);
  return {
    signature,
    cachePath: path.join(cacheDir, `kaikki-${languageCode.toLowerCase()}-${digest}.json`),
  };
}

async function loadKaikkiIpaIndex(languageCode, filePath, sourceId) {
  const { signature, cachePath } = await kaikkiIpaIndexCachePath(languageCode, filePath, sourceId);
  try {
    const cached = JSON.parse(await readFile(cachePath, "utf8"));
    if (
      cached.index_version === ipaSourceLookupRuleVersion &&
      cached.index_kind === "kaikki-ipa-full-index-v1" &&
      cached.language_code === languageCode &&
      cached.source_id === sourceId &&
      JSON.stringify(cached.source_file) === JSON.stringify(signature)
    ) {
      return new Map(Object.entries(cached.entries ?? {}));
    }
  } catch {
    // Cache misses are normal; caches are ignored and rebuildable.
  }

  const index = new Map();
  for await (const line of readTextLines(filePath)) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const word = entry.word;
    const key = normalizeIpaLookupKey(word);
    if (!key) continue;
    for (const sound of entry.sounds ?? []) {
      if (typeof sound.ipa !== "string" || !sound.ipa.trim()) continue;
      if (!soundIsRegionalMatch(sound, languageCode)) continue;
      addIndexedCandidate(index, key, sound.ipa, sourceId, word, "Kaikki/Wiktionary IPA");
    }
  }
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(
    cachePath,
    JSON.stringify(
      {
        index_version: ipaSourceLookupRuleVersion,
        index_kind: "kaikki-ipa-full-index-v1",
        language_code: languageCode,
        source_id: sourceId,
        source_file: signature,
        term_count: index.size,
        generated_at: new Date().toISOString(),
        entries: Object.fromEntries(index),
      },
      null,
      2
    ),
    "utf8"
  );
  return index;
}

async function fileSignature(filePath) {
  const info = await stat(filePath);
  return { path: filePath, size: info.size, mtime_ms: Math.round(info.mtimeMs) };
}

async function cachePathFor(languageCode, sourceFiles, neededTerms) {
  const signatures = await Promise.all(sourceFiles.map(fileSignature));
  const digest = createHash("sha256")
    .update(ipaSourceLookupRuleVersion)
    .update(languageCode)
    .update(JSON.stringify(signatures))
    .update(JSON.stringify([...neededTerms].sort()))
    .digest("hex")
    .slice(0, 24);
  return {
    signatures,
    cachePath: path.join(cacheDir, `${languageCode.toLowerCase()}-${digest}.json`),
  };
}

async function loadWithTargetCache(languageCode, neededTerms) {
  const config = languageConfigs[languageCode];
  if (!config || neededTerms.size === 0) return new Map();
  const { signatures, cachePath } = await cachePathFor(languageCode, config.sourceFiles, neededTerms);
  try {
    const cached = JSON.parse(await readFile(cachePath, "utf8"));
    if (
      cached.index_version === ipaSourceLookupRuleVersion &&
      cached.language_code === languageCode &&
      JSON.stringify(cached.source_files) === JSON.stringify(signatures)
    ) {
      return new Map(Object.entries(cached.entries ?? {}));
    }
  } catch {
    // Cache misses are normal; caches are ignored and rebuildable.
  }

  const entries = await config.loader(neededTerms);
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(
    cachePath,
    JSON.stringify(
      {
        index_version: ipaSourceLookupRuleVersion,
        language_code: languageCode,
        source_ids: config.sourceIds,
        source_files: signatures,
        term_count: neededTerms.size,
        entries: Object.fromEntries(entries),
      },
      null,
      2
    ),
    "utf8"
  );
  return entries;
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(cell);
      cell = "";
      continue;
    }
    cell += char;
  }
  cells.push(cell);
  return cells;
}

async function loadDanishUdtaleordbog(neededTerms) {
  const results = new Map();
  const content = await readFile("reference-sources/raw/ipa-focused/danish/udtaleordbog_dk.txt", "utf8");
  for (const line of content.split(/\r?\n/u)) {
    if (!line || line.startsWith("Based on") || line.startsWith("The list") || line.startsWith("Orthography;")) continue;
    const [orthography, phonology] = line.split(";");
    addCandidate(results, neededTerms, orthography, phonology, "ipa-focused-danish-udtaleordbog-dk", "Udtaleordbog.dk phonology");
  }
  return results;
}

async function loadBritfone(neededTerms) {
  const results = new Map();
  const content = await readFile("reference-sources/raw/ipa-focused/english-gb/britfone.main.3.0.1.csv", "utf8");
  for (const line of content.split(/\r?\n/u)) {
    if (!line.trim()) continue;
    const commaIndex = line.indexOf(",");
    if (commaIndex < 0) continue;
    const word = line.slice(0, commaIndex).trim();
    const ipa = line.slice(commaIndex + 1).trim();
    addCandidate(results, neededTerms, word, normalizeBritfoneIpa(ipa), "ipa-focused-english-gb-britfone-main", "Britfone IPA");
  }
  return results;
}

const ipaVowelPattern = /[aeiouɑɐɒæɛəɜɞɘɪɨʊʌɔɵøœɶɤɯyɐɚɝː]/u;

function normalizeBritfoneIpa(value) {
  const tokens = String(value ?? "")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  const firstStress = tokens.findIndex((token) => token === "ˈ" || token === "ˌ");
  if (
    firstStress > 0 &&
    tokens.slice(0, firstStress).every((token) => !ipaVowelPattern.test(token)) &&
    ipaVowelPattern.test(tokens[firstStress + 1] ?? "")
  ) {
    const [stress] = tokens.splice(firstStress, 1);
    tokens.unshift(stress);
  }
  return tokens.join("");
}

function secondaryIpaLookupTerms(neededTerms, primaryCandidates) {
  const missing = new Set();
  for (const term of neededTerms) {
    if (primaryCandidates.has(term)) continue;
    const parts = term.split(" ").filter(Boolean);
    if (parts.length > 1 && parts.every((part) => primaryCandidates.has(part))) continue;
    missing.add(term);
  }
  return missing;
}

const arpabetToIpa = new Map([
  ["AA", "ɑ"], ["AE", "æ"], ["AH", "ʌ"], ["AO", "ɔ"], ["AW", "aʊ"], ["AY", "aɪ"],
  ["B", "b"], ["CH", "tʃ"], ["D", "d"], ["DH", "ð"], ["EH", "ɛ"], ["ER", "ɝ"],
  ["EY", "eɪ"], ["F", "f"], ["G", "ɡ"], ["HH", "h"], ["IH", "ɪ"], ["IY", "i"],
  ["JH", "dʒ"], ["K", "k"], ["L", "l"], ["M", "m"], ["N", "n"], ["NG", "ŋ"],
  ["OW", "oʊ"], ["OY", "ɔɪ"], ["P", "p"], ["R", "ɹ"], ["S", "s"], ["SH", "ʃ"],
  ["T", "t"], ["TH", "θ"], ["UH", "ʊ"], ["UW", "u"], ["V", "v"], ["W", "w"],
  ["Y", "j"], ["Z", "z"], ["ZH", "ʒ"],
]);

function arpabetPronunciationToIpa(phones) {
  const output = [];
  for (const rawPhone of phones) {
    const match = rawPhone.match(/^([A-Z]+)([012])?$/u);
    if (!match) continue;
    const base = match[1];
    const stress = match[2] ?? "";
    let ipa = arpabetToIpa.get(base);
    if (!ipa) continue;
    if (base === "AH" && stress === "0") ipa = "ə";
    if (base === "ER" && stress === "0") ipa = "ɚ";
    if (stress === "1") ipa = `ˈ${ipa}`;
    if (stress === "2") ipa = `ˌ${ipa}`;
    output.push(ipa);
  }
  return output.join(" ");
}

async function loadCmudict(neededTerms) {
  const results = new Map();
  const content = await readFile("reference-sources/raw/ipa-focused/english-us/cmudict.dict", "utf8");
  for (const line of content.split(/\r?\n/u)) {
    if (!line.trim() || line.startsWith(";;;")) continue;
    const [rawWord, ...phones] = line.trim().split(/\s+/u);
    const word = rawWord.replace(/\(\d+\)$/u, "");
    addCandidate(
      results,
      neededTerms,
      word,
      arpabetPronunciationToIpa(phones),
      "ipa-focused-english-us-cmudict-dict",
      "CMUdict ARPABET converted to IPA"
    );
  }
  return results;
}

async function loadEnglishUsSources(neededTerms) {
  const cmudict = await loadCmudict(neededTerms);
  const secondaryTerms = secondaryIpaLookupTerms(neededTerms, cmudict);
  if (secondaryTerms.size === 0) return cmudict;
  return mergeCandidateMaps(
    cmudict,
    await loadKaikkiIpaCandidates(
      secondaryTerms,
      "EN",
      "reference-sources/raw/wiktionary-kaikki/kaikki.org-dictionary-English.jsonl.gz",
      "kaikki-english"
    )
  );
}

async function loadEnglishGbSources(neededTerms) {
  const britfone = await loadBritfone(neededTerms);
  if (process.env.ENABLE_KAIKKI_IPA_FALLBACK !== "1") return britfone;
  const secondaryTerms = secondaryIpaLookupTerms(neededTerms, britfone);
  if (secondaryTerms.size === 0) return britfone;
  return mergeCandidateMaps(
    await loadKaikkiIpaCandidates(
      secondaryTerms,
      "EN-GB",
      "reference-sources/raw/wiktionary-kaikki/kaikki.org-dictionary-English.jsonl.gz",
      "kaikki-english"
    ),
    britfone
  );
}

const lexiquePhonemeMap = new Map([
  ["§", "ɔ̃"], ["5", "ɛ̃"], ["1", "œ̃"], ["2", "ø"], ["9", "œ"],
  ["E", "ɛ"], ["O", "ɔ"], ["R", "ʁ"], ["S", "ʃ"], ["Z", "ʒ"],
  ["N", "ɲ"], ["G", "ŋ"], ["A", "ɑ"], ["H", "ɥ"], ["@", "ə"], ["°", "ə"],
]);

function lexiquePhonToIpa(value) {
  return [...String(value ?? "")].map((char) => lexiquePhonemeMap.get(char) ?? char).join("");
}

async function loadLexique383(neededTerms) {
  const results = new Map();
  const content = await readFile("reference-sources/raw/ipa-focused/french/Lexique383.tsv", "utf8");
  const lines = content.split(/\r?\n/u);
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;
    const cells = line.split("\t");
    const ortho = cells[0];
    const phon = cells[1];
    const lemma = cells[2];
    const ipa = lexiquePhonToIpa(phon);
    addCandidate(results, neededTerms, ortho, ipa, "ipa-focused-french-lexique383-tsv", "Lexique383 phon field converted to IPA");
    if (lemma && lemma !== ortho) {
      addCandidate(results, neededTerms, lemma, ipa, "ipa-focused-french-lexique383-tsv", "Lexique383 lemma phon field converted to IPA");
    }
  }
  return results;
}

async function loadFrenchSources(neededTerms) {
  return mergeCandidateMaps(
    await loadLexique383(neededTerms),
    await loadKaikkiIpaCandidates(
      neededTerms,
      "FR",
      "reference-sources/raw/wiktionary-kaikki/kaikki.org-dictionary-French.jsonl.gz",
      "kaikki-french"
    )
  );
}

function execStreamLines(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options.spawnOptions ?? {});
    const encoding = options.encoding ?? "utf8";
    const chunks = [];
    let stderr = "";
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`${command} ${args.join(" ")} failed with code ${code}: ${stderr.trim()}`));
      else resolve(Buffer.concat(chunks).toString(encoding).split(/\r?\n/u));
    });
  });
}

async function loadNorwegianNbUttale(neededTerms) {
  const results = new Map();
  const lines = await execStreamLines("unzip", [
    "-p",
    "reference-sources/raw/ipa-focused/norwegian/nb_uttale_leksika.zip",
    "nb_uttale_leksika/e_written_pronunciation_lexicon.csv",
  ]);
  for (let index = 1; index < lines.length; index += 1) {
    const cells = parseCsvLine(lines[index]);
    const word = cells[0];
    const ipa = (cells[6] ?? "").replace(/['"]/gu, "ˈ").replace(/,/gu, "ˌ");
    addCandidate(results, neededTerms, word, ipa, "ipa-focused-norwegian-nb-uttale-leksika", "NB Uttale e_written IPA column");
  }
  return results;
}

const norwegianSampaReplacements = [
  ["t`", "ʈ"],
  ["d`", "ɖ"],
  ["n`", "ɳ"],
  ["l`", "ɭ"],
  ["s`", "ʂ"],
  ["n=", "n̩"],
  ["m=", "m̩"],
  ["l=", "l̩"],
  ["u0", "ʉ"],
  ["A:", "ɑː"],
  ["E:", "eː"],
  ["I:", "iː"],
  ["O:", "oː"],
  ["U:", "uː"],
  ["}:", "ʉː"],
  ["{:", "æː"],
  ["2:", "øː"],
  ["9:", "œː"],
  ["@", "ə"],
  ["A", "ɑ"],
  ["E", "ɛ"],
  ["I", "ɪ"],
  ["O", "ɔ"],
  ["U", "ʊ"],
  ["Y", "ʏ"],
  ["}", "ʉ"],
  ["{", "æ"],
  ["2", "ø"],
  ["9", "œ"],
  ["C", "ç"],
  ["N", "ŋ"],
  ["S", "ʃ"],
  ["\"", "ˈ"],
  ["%", "ˌ"],
  ["$", "."],
];

function convertNorwegianSampa(value) {
  let text = String(value ?? "").replace(/^"+|"+$/gu, "");
  for (const [from, to] of norwegianSampaReplacements) {
    text = text.split(from).join(to);
  }
  return text.replace(/ˈ{2,}/gu, "ˈ").replace(/\.+/gu, ".").replace(/^\./u, "").replace(/\.$/u, "");
}

async function loadNorwegianNlb(neededTerms) {
  const results = new Map();
  const lines = await execStreamLines("tar", [
    "-xOzf",
    "reference-sources/raw/ipa-focused/norwegian/20191016_nlb_trans.tar.gz",
    "20191016_nlb_trans/nlb_nob_20181129.lex",
  ], { encoding: "latin1", spawnOptions: { stdio: ["ignore", "pipe", "pipe"] } });
  for (const line of lines) {
    if (!line) continue;
    const cells = line.split("\t");
    const word = cells[0] ?? "";
    const sampa = cells[1] ?? "";
    addCandidate(
      results,
      neededTerms,
      word,
      convertNorwegianSampa(sampa),
      "ipa-focused-norwegian-nlb-trans",
      "NLB Bokmål SAMPA converted to IPA"
    );
  }
  return results;
}

async function loadNorwegianSources(neededTerms) {
  return mergeCandidateMaps(
    await loadNorwegianNbUttale(neededTerms),
    await loadNorwegianNlb(neededTerms),
    await loadKaikkiIpaCandidates(
      neededTerms,
      "NB",
      "reference-sources/raw/wiktionary-kaikki/kaikki.org-dictionary-NorwegianBokmal.jsonl",
      "kaikki-norwegian-bokmal"
    )
  );
}

async function loadIcelandicSampaMap() {
  const lines = await execStreamLines("unzip", [
    "-p",
    "reference-sources/raw/ipa-focused/icelandic/iceprondict-1.1.1.zip",
    "iceprondict-1.1.1/sampa_ipa_single.tsv",
  ]);
  const map = new Map();
  for (const line of lines) {
    const [sampa, ipa] = line.split("\t");
    if (sampa && ipa) map.set(sampa, ipa);
  }
  return map;
}

function convertTokenizedSampa(value, map) {
  return String(value ?? "")
    .split(/\s+/u)
    .filter(Boolean)
    .map((token) => map.get(token) ?? token)
    .join("");
}

async function loadIcelandicIcePronDict(neededTerms) {
  const results = new Map();
  const sampaMap = await loadIcelandicSampaMap();
  const zipPath = "reference-sources/raw/ipa-focused/icelandic/iceprondict-1.1.1.zip";
  const sourceFiles = [
    "iceprondict-1.1.1/dictionaries/ice_pron_dict_complete.csv",
    "iceprondict-1.1.1/dictionaries/ice_pron_dict_standard_clear.csv",
    "iceprondict-1.1.1/train_dev_test/train/standard_clear_train.tsv",
    "iceprondict-1.1.1/train_dev_test/dev/standard_clear_dev.tsv",
    "iceprondict-1.1.1/train_dev_test/test/standard_clear_test.tsv",
  ];
  for (const sourceFile of sourceFiles) {
    const lines = await execStreamLines("unzip", ["-p", zipPath, sourceFile]);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line || line.startsWith("word\t")) continue;
      const cells = line.split("\t");
      const word = cells[0];
      const sampa = cells[1];
      addCandidate(
        results,
        neededTerms,
        word,
        convertTokenizedSampa(sampa, sampaMap),
        "ipa-focused-icelandic-iceprondict-111",
        `IcePronDict ${sourceFile.split("/").pop()} SAMPA converted to IPA`
      );
    }
  }
  return results;
}

async function loadIcelandicSources(neededTerms) {
  return mergeCandidateMaps(
    await loadIcelandicIcePronDict(neededTerms),
    await loadKaikkiIpaCandidates(
      neededTerms,
      "IS",
      "reference-sources/raw/wiktionary-kaikki/kaikki.org-dictionary-Icelandic.jsonl.gz",
      "kaikki-icelandic"
    )
  );
}

const swedishSampaReplacements = [
  ["x\\", "ɧ"],
  ["s'", "ɕ"],
  ["s\\", "ɕ"],
  ["n`", "ɳ"],
  ["d`", "ɖ"],
  ["t`", "ʈ"],
  ["l`", "ɭ"],
  ["s`", "ʂ"],
  ["A:", "ɑː"],
  ["E:", "ɛː"],
  ["e:", "eː"],
  ["i:", "iː"],
  ["o:", "uː"],
  ["u:", "ʉː"],
  ["}:", "ʉː"],
  ["y:", "yː"],
  ["2:", "øː"],
  ["9:", "œː"],
  ["O:", "oː"],
  ["2", "ø"],
  ["9", "œ"],
  ["Y", "ʏ"],
  ["I", "ɪ"],
  ["E", "ɛ"],
  ["O", "ɔ"],
  ["A", "a"],
  ["U", "ɵ"],
  ["}", "ʉ"],
  ["N", "ŋ"],
  ["S", "ʂ"],
  ["\"", "ˈ"],
  ["%", "ˌ"],
  ["$", "."],
  ["0", "ə"],
];

function convertSwedishSampa(value) {
  let text = String(value ?? "").replace(/^"+|"+$/gu, "");
  for (const [from, to] of swedishSampaReplacements) {
    text = text.split(from).join(to);
  }
  return text.replace(/ˈ{2,}/gu, "ˈ").replace(/\.+/gu, ".").replace(/^\./u, "").replace(/\.$/u, "");
}

const danishSampaReplacements = [
  ["aI", "ɑj"],
  ["aU", "ɑw"],
  ["s'", "ɕ"],
  ["a:", "aː"],
  ["A:", "ɑː"],
  ["E:", "ɛː"],
  ["O:", "ɔː"],
  ["e:", "eː"],
  ["i:", "iː"],
  ["o:", "oː"],
  ["u:", "uː"],
  ["y:", "yː"],
  ["2:", "øː"],
  ["9:", "œː"],
  ["2", "ø"],
  ["9", "œ"],
  ["@", "ə"],
  ["6", "ɐ"],
  ["D", "ð"],
  ["R", "ʁ"],
  ["N", "ŋ"],
  ["S", "ʃ"],
  ["A", "ɑ"],
  ["E", "ɛ"],
  ["O", "ɔ"],
  ["Y", "ʏ"],
  ["?", "ʔ"],
  ["\"", "ˈ"],
  ["%", "ˌ"],
  ["$", "."],
];

function convertDanishSampa(value) {
  let text = String(value ?? "").replace(/^"+|"+$/gu, "");
  for (const [from, to] of danishSampaReplacements) {
    text = text.split(from).join(to);
  }
  return text.replace(/ˈ{2,}/gu, "ˈ").replace(/\.+/gu, ".").replace(/^\./u, "").replace(/\.$/u, "");
}

async function loadDanishNst(neededTerms) {
  const results = new Map();
  const lines = await execStreamLines("tar", [
    "-xOzf",
    "reference-sources/raw/ipa-focused/danish/da_leksikon.tar.gz",
    "dan030224NST.pron/dan030224NST.pron",
  ], { encoding: "latin1", spawnOptions: { stdio: ["ignore", "pipe", "pipe"] } });
  for (const line of lines) {
    if (!line) continue;
    const cells = line.split(";");
    const word = cells[0] ?? "";
    const sampa = cells[11] ?? cells[10] ?? "";
    addCandidate(
      results,
      neededTerms,
      word,
      convertDanishSampa(sampa),
      "ipa-focused-danish-nst-leksikon",
      "NST Danish SAMPA converted to IPA"
    );
  }
  return results;
}

async function loadDanishSources(neededTerms) {
  return mergeCandidateMaps(
    await loadDanishUdtaleordbog(neededTerms),
    await loadDanishNst(neededTerms),
    await loadKaikkiIpaCandidates(
      neededTerms,
      "DA",
      "reference-sources/raw/wiktionary-kaikki/kaikki.org-dictionary-Danish.jsonl.gz",
      "kaikki-danish"
    )
  );
}

async function loadSwedishNst(neededTerms) {
  const results = new Map();
  const lines = await execStreamLines("tar", [
    "-xOzf",
    "reference-sources/raw/ipa-focused/swedish/sv.leksikon.tar.gz",
    "NST svensk leksikon/swe030224NST.pron/swe030224NST.pron",
  ], { encoding: "latin1", spawnOptions: { stdio: ["ignore", "pipe", "pipe"] } });
  for (const line of lines) {
    if (!line) continue;
    const cells = line.split(";");
    const word = cells[0] ?? "";
    const sampa = cells[11] ?? cells[10] ?? "";
    addCandidate(
      results,
      neededTerms,
      word,
      convertSwedishSampa(sampa),
      "ipa-focused-swedish-nst-leksikon",
      "NST Swedish SAMPA converted to IPA"
    );
  }
  return results;
}

async function loadSwedishSources(neededTerms) {
  return mergeCandidateMaps(
    await loadSwedishNst(neededTerms),
    await loadKaikkiIpaCandidates(
      neededTerms,
      "SV",
      "reference-sources/raw/wiktionary-kaikki/kaikki.org-dictionary-Swedish.jsonl.gz",
      "kaikki-swedish"
    )
  );
}

function candidatesForTerm(context, languageCode, term) {
  const key = normalizeIpaLookupKey(term);
  const map = context.candidatesByLanguage.get(languageCode);
  const manual = manualArticleIpa[languageCode]?.get(key);
  const source = map?.get(key) ?? [];
  return [...(manual ?? []), ...source];
}

function primaryCandidateForTerm(context, languageCode, term) {
  return candidatesForTerm(context, languageCode, term)[0] ?? null;
}

function buildComponentCandidate(row, context) {
  const languageCode = row.language_code ?? row.languageCode;
  const display = rowDisplayWord(row) || rowNativeWord(row);
  const tokens = splitDisplayTokens(display).map((token) => normalizeIpaLookupKey(token)).filter(Boolean);
  if (tokens.length < 2) return null;
  const candidateParts = [];
  const sourceIds = new Set();
  const sourceWords = [];
  for (const token of tokens) {
    const candidate = primaryCandidateForTerm(context, languageCode, token);
    if (!candidate) return null;
    candidateParts.push(candidate.value.replace(/^\/|\/$/gu, ""));
    sourceIds.add(candidate.source_id);
    sourceWords.push(candidate.source_word);
  }
  return {
    value: wrapIpa(candidateParts.join(" ")),
    source_ids: [...sourceIds].filter((sourceId) => sourceId !== "manual-function-word"),
    source_words: sourceWords,
    source_match: "ipa_component_source_candidate",
  };
}

function bestCompoundParts(context, languageCode, compoundKey) {
  const memo = new Map();
  const linkers = new Set(["s"]);

  function walk(index, usedParts) {
    const memoKey = `${index}:${usedParts}`;
    if (memo.has(memoKey)) return memo.get(memoKey);
    if (index === compoundKey.length) return [];
    if (usedParts >= 5) return null;

    let best = null;
    const remaining = compoundKey.length - index;
    for (let length = Math.min(24, remaining); length >= 3; length -= 1) {
      const term = compoundKey.slice(index, index + length);
      const candidate = primaryCandidateForTerm(context, languageCode, term);
      if (!candidate) continue;
      const rest = walk(index + length, usedParts + 1);
      if (rest === null) continue;
      const parts = [{ term, candidate }, ...rest];
      if (
        !best ||
        parts.length < best.length ||
        (parts.length === best.length && parts.map((part) => part.term.length).join(",") > best.map((part) => part.term.length).join(","))
      ) {
        best = parts;
      }
    }

    if (!best && index > 0 && linkers.has(compoundKey[index])) {
      best = walk(index + 1, usedParts);
    }

    memo.set(memoKey, best);
    return best;
  }

  return walk(0, 0);
}

function buildCompoundCandidate(row, context) {
  const languageCode = row.language_code ?? row.languageCode;
  if (!new Set(["DA", "IS", "NB", "SV"]).has(languageCode)) return null;
  const display = rowDisplayWord(row) || rowNativeWord(row);
  const compoundKey = normalizeIpaLookupKey(display).replace(/\s+/gu, "");
  if (compoundKey.length < 7) return null;
  const parts = bestCompoundParts(context, languageCode, compoundKey);
  if (!parts || parts.length < 2) return null;

  const candidateParts = [];
  const sourceIds = new Set();
  const sourceWords = [];
  for (const part of parts) {
    candidateParts.push(part.candidate.value.replace(/^\/|\/$/gu, ""));
    sourceIds.add(part.candidate.source_id);
    sourceWords.push(part.candidate.source_word);
  }
  return {
    value: wrapIpa(candidateParts.join(".")),
    source_ids: [...sourceIds].filter((sourceId) => sourceId !== "manual-function-word"),
    source_words: sourceWords,
    source_match: "ipa_compound_component_source_candidate",
  };
}

function buildExactCandidate(row, context) {
  const languageCode = row.language_code ?? row.languageCode;
  const display = rowDisplayWord(row) || rowNativeWord(row);
  const native = rowNativeWord(row) || display;
  for (const term of [display, native]) {
    const candidate = primaryCandidateForTerm(context, languageCode, term);
    if (candidate) {
      return {
        value: candidate.value,
        source_ids: [candidate.source_id],
        source_words: [candidate.source_word],
        source_match: "ipa_exact_source_candidate",
      };
    }
  }
  return null;
}

export async function buildIpaSourceLookupContext(rows) {
  const termsByLanguage = new Map();
  for (const row of rows) {
    const languageCode = row.language_code ?? row.languageCode;
    if (!ipaSourceLookupLanguages.has(languageCode)) continue;
    const terms = termsByLanguage.get(languageCode) ?? new Set();
    for (const term of lookupTermsForRow(row)) terms.add(term);
    termsByLanguage.set(languageCode, terms);
  }

  const candidatesByLanguage = new Map();
  const sourceIdsByLanguage = new Map();
  for (const [languageCode, terms] of termsByLanguage.entries()) {
    const config = languageConfigs[languageCode];
    sourceIdsByLanguage.set(languageCode, config?.sourceIds ?? []);
    candidatesByLanguage.set(languageCode, await loadWithTargetCache(languageCode, terms));
  }
  return { candidatesByLanguage, sourceIdsByLanguage };
}

export async function evaluateIpaSourceLookup(row, options = {}) {
  const languageCode = row.language_code ?? row.languageCode;
  if (!ipaSourceLookupLanguages.has(languageCode)) return { applies: false };

  const context = options.ipaSourceLookupContext ?? (await buildIpaSourceLookupContext([row]));
  const exactCandidate = buildExactCandidate(row, context);
  const componentCandidate = buildComponentCandidate(row, context);
  const compoundCandidate = buildCompoundCandidate(row, context);
  const sourceCandidate = exactCandidate ?? componentCandidate ?? compoundCandidate;
  const orthographicSlash = rowIsOrthographicSlashIpa(row);
  const transcription = rowTranscription(row);
  const displayWord = rowDisplayWord(row);
  const nativeWord = rowNativeWord(row);
  const sourceIds = context.sourceIdsByLanguage.get(languageCode) ?? languageConfigs[languageCode]?.sourceIds ?? [];

  const base = {
    applies: true,
    language_code: languageCode,
    set_id: row.set_id ?? row.setId,
    meaning_id: row.meaning_id ?? row.meaningId ?? row.target_key,
    display_word: displayWord,
    native_word: nativeWord,
    transcription,
    source_ids: sourceCandidate?.source_ids?.length ? sourceCandidate.source_ids : sourceIds,
    source_value: sourceCandidate?.value ?? null,
    source_words: sourceCandidate?.source_words ?? [],
    rule_version: ipaSourceLookupRuleVersion,
    orthographic_slash: orthographicSlash,
  };

  if (sourceCandidate && normalizeIpaComparable(transcription) === normalizeIpaComparable(sourceCandidate.value)) {
    return {
      ...base,
      pass: true,
      severity: "pass",
      confidence: "source_exact",
      source_match: sourceCandidate.source_match,
      issues: [],
    };
  }

  if (orthographicSlash && sourceCandidate) {
    return {
      ...base,
      pass: false,
      severity: "fail",
      confidence: "conflict",
      source_match: sourceCandidate.source_match,
      issues: [
        {
          severity: "fail",
          code: "ipa_source_lookup_pseudo_ipa",
          detail: `IPA transcription is slash-wrapped orthography; source candidate is ${sourceCandidate.value}`,
        },
      ],
    };
  }

  if (orthographicSlash && !sourceCandidate) {
    return {
      ...base,
      pass: false,
      severity: "fail",
      confidence: "source_partial",
      source_match: "ipa_source_gap_for_orthographic_slash",
      issues: [
        {
          severity: "fail",
          code: "ipa_source_lookup_source_gap",
          detail: "IPA transcription looks like slash-wrapped orthography and no exact/component source candidate was found",
        },
      ],
    };
  }

  if (sourceCandidate) {
    return {
      ...base,
      pass: true,
      severity: "warning",
      confidence: "source_exact",
      source_match: "ipa_source_candidate_differs_review",
      issues: [
        {
          severity: "warning",
          code: "ipa_source_lookup_candidate_differs",
          detail: `Current IPA differs from source candidate ${sourceCandidate.value}; review before repair, but not a deterministic pseudo-IPA blocker`,
        },
      ],
    };
  }

  return {
    ...base,
    pass: true,
    severity: "warning",
    confidence: "source_partial",
    source_match: "ipa_source_lookup_no_candidate",
    issues: [
      {
        severity: "warning",
        code: "ipa_source_lookup_no_candidate",
        detail: "No exact/component IPA source candidate found in the focused local source cache",
      },
    ],
  };
}

export async function buildIpaSourceLookupFindings(rows, options = {}) {
  const context = options.ipaSourceLookupContext ?? (await buildIpaSourceLookupContext(rows));
  const blockers = [];
  const warnings = [];
  const passes = [];
  const byLanguage = new Map();

  for (const row of rows) {
    const result = await evaluateIpaSourceLookup(row, { ...options, ipaSourceLookupContext: context });
    if (!result.applies) continue;
    const summary = byLanguage.get(result.language_code) ?? {
      language_code: result.language_code,
      rows: 0,
      pass: 0,
      warning: 0,
      fail: 0,
    };
    summary.rows += 1;
    summary[result.severity] = (summary[result.severity] ?? 0) + 1;
    byLanguage.set(result.language_code, summary);
    if (result.severity === "fail") blockers.push(result);
    else if (result.severity === "warning") warnings.push(result);
    else passes.push(result);
  }

  return {
    blockers,
    warnings,
    passes,
    byLanguage: [...byLanguage.values()].sort((a, b) => a.language_code.localeCompare(b.language_code)),
  };
}

export function formatIpaSourceLookupFinding(finding) {
  const setPrefix = finding.set_id ? `${finding.set_id} ` : "";
  const source = finding.source_value ? `; source="${finding.source_value}"` : "";
  return `${setPrefix}${finding.language_code}/${finding.meaning_id}: ${finding.issues
    .map((issue) => issue.detail)
    .join("; ")}; display="${finding.display_word}"; transcription="${finding.transcription}"${source}`;
}
