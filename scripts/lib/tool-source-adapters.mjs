import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createGunzip } from "node:zlib";
import { loadReferenceSourcesManifest, loadTranscriptionSourcePolicy } from "./transcription-source-policy.mjs";

const execFileAsync = promisify(execFile);

export const toolSourceDefinitions = [
  {
    id: "tool-epitran-g2p",
    name: "Epitran optional G2P/IPA adapter",
    kind: "tool_adapter",
    optional: true,
    url: "https://github.com/dmort27/epitran",
    license_note:
      "Optional local adapter. GitHub repository metadata indicates MIT; recent releases indicate MIT-Modern-Variant. Verify installed-version licence before packaging. Tool output is candidate evidence only and cannot produce source_exact by itself.",
    primary_lunacards_use: ["IPA/G2P source_partial candidate generation", "pre-import pronunciation sanity"],
  },
  {
    id: "tool-unimorph-morphology",
    name: "UniMorph optional morphology adapter",
    kind: "tool_adapter",
    optional: true,
    url: "https://unimorph.github.io/",
    license_note: "Optional morphology source adapter. Inspect per-language data licences before downloading or using local UniMorph tables.",
    primary_lunacards_use: ["number/gender/case morphology candidate checks", "number-heavy example grammar preflight"],
  },
  {
    id: "tool-apertium-dictionaries",
    name: "Apertium optional dictionary adapter",
    kind: "tool_adapter",
    optional: true,
    url: "https://wiki.apertium.org/wiki/Bilingual_dictionary",
    license_note: "Optional bilingual dictionary adapter. Apertium pair licences vary; record per-pair license notes before using pair data as source evidence.",
    primary_lunacards_use: ["translation source_partial candidates", "bilingual dictionary sanity checks"],
  },
  {
    id: "official-nikl-korean-basic-dictionary",
    name: "NIKL Korean Basic Dictionary / Korean-English Learners' Dictionary Open API",
    kind: "tool_adapter",
    optional: true,
    url: "https://krdict.korean.go.kr/eng/openApi/openApiInfo",
    license_note:
      "Official NIKL learner dictionary/Open API reference. Use local cached/API lookup as source_partial candidate only; check API and redistribution terms before packaging derived data.",
    primary_lunacards_use: ["KO strong dictionary candidate support", "low-resource translation sanity"],
  },
  {
    id: "official-lexitron-thai-2",
    name: "NECTEC LEXiTRON 2.0 Thai dictionary",
    kind: "tool_adapter",
    optional: true,
    url: "https://opend-portal.nectec.or.th/en/dataset/lexitron-2-0?activity_id=21f15905-6779-4a31-bf47-5445626c213e",
    license_note:
      "NECTEC LEXiTRON 2.0 candidate source. Verify licence/redistribution terms before packaging derived data; NC or restricted terms must remain internal sanity only.",
    primary_lunacards_use: ["TH strong dictionary candidate support", "Thai translation sanity"],
  },
  {
    id: "sealang-dictionary-reference",
    name: "SEAlang dictionary/reference lookup",
    kind: "tool_adapter",
    optional: true,
    url: "https://sealang.net/api/api.pl?service=identify",
    license_note:
      "SEAlang lookup/reference layer for Thai, Lao, Burmese and Khmer. Treat as reference-only unless source terms allow derived redistribution.",
    primary_lunacards_use: ["TH/LO/MY/KM dictionary sanity", "low-resource translation and romanization support"],
  },
  {
    id: "tool-indictrans2-mt-sanity",
    name: "IndicTrans2 optional local MT sanity adapter",
    kind: "tool_adapter",
    optional: true,
    url: "https://github.com/AI4Bharat/IndicTrans2",
    license_note:
      "Optional local MT sanity provider for Indic languages. MT output is never final source truth and cannot approve rows by itself.",
    primary_lunacards_use: ["Indic translation sanity", "South Asian example sanity"],
  },
  {
    id: "dakshina-transliteration-dataset",
    name: "Dakshina transliteration dataset",
    kind: "tool_adapter",
    optional: true,
    url: "https://research.google/pubs/processing-south-asian-languages-written-in-the-latin-script-the-dakshina-dataset/",
    license_note:
      "Optional transliteration/romanization sanity source for South Asian scripts. Use as candidate evidence only; not translation truth.",
    primary_lunacards_use: ["South Asian romanization sanity", "Indic transliteration comparison"],
  },
  {
    id: "tool-external-mt-sanity",
    name: "External MT sanity signal adapter",
    kind: "tool_adapter",
    optional: true,
    url: "https://cloud.google.com/translate/docs/languages",
    license_note:
      "Optional Google/DeepL/Amazon/NLLB-style sanity signal. MT output is not source truth and is disabled unless a draft explicitly carries a suggestion or a provider is configured later.",
    primary_lunacards_use: ["translation disagreement signal", "weak-language triage"],
  },
  {
    id: "tool-openphonemizer",
    name: "OpenPhonemizer optional IPA adapter",
    kind: "tool_adapter",
    optional: true,
    url: "https://github.com/NeuralVox/OpenPhonemizer",
    license_note:
      "Optional BSD-3-Clause-Clear IPA candidate adapter when installed locally. Model/dependency licences still require review. Tool output is candidate evidence only.",
    primary_lunacards_use: ["IPA candidate generation", "pre-import pronunciation sanity"],
  },
  {
    id: "tool-phonemizer-espeak-ng-deferred",
    name: "phonemizer/eSpeak NG deferred adapter",
    kind: "deferred_tool_adapter",
    optional: true,
    url: "https://github.com/espeak-ng/espeak-ng",
    license_note: "Deferred optional sanity tool because eSpeak NG is GPL-3.0. Do not make it a required LunaCards dependency without a separate licence decision.",
    primary_lunacards_use: ["broad IPA sanity checks if explicitly enabled later"],
  },
];

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FREEDICT_CACHE_TYPE = "freedict-cache-index-v2";
const FREEDICT_SOURCE_CACHE_TYPE = "freedict-source-cache-v2";
const NIKL_KO_INDEX_CACHE_TYPE = "nikl-en-ko-index-v1";
const KAIKKI_MAX_ENTRY_BYTES = Number(process.env.KAIKKI_MAX_ENTRY_BYTES ?? 1000000);
const KAIKKI_MAX_SENSE_TEXTS = Number(process.env.KAIKKI_MAX_SENSE_TEXTS ?? 240);

const epitranCodeByLanguage = new Map([
  ["DE", "deu-Latn"],
  ["ES", "spa-Latn"],
  ["ES-419", "spa-Latn"],
  ["FR", "fra-Latn"],
  ["IT", "ita-Latn"],
  ["NL", "nld-Latn"],
  ["PL", "pol-Latn"],
  ["PT", "por-Latn"],
  ["PT-BR", "por-Latn"],
  ["RU", "rus-Cyrl"],
  ["TR", "tur-Latn"],
]);

const epitranPhoneticCandidateLanguages = new Set(["DE", "FR", "NL", "PL", "PT", "PT-BR"]);

const unimorphCodeByLanguage = new Map([
  ["BG", "bul"],
  ["CS", "ces"],
  ["DA", "dan"],
  ["DE", "deu"],
  ["EN", "eng"],
  ["EN-GB", "eng"],
  ["ES", "spa"],
  ["ES-419", "spa"],
  ["ET", "est"],
  ["FR", "fra"],
  ["HI", "hin"],
  ["HR", "hbs"],
  ["HU", "hun"],
  ["IS", "isl"],
  ["IT", "ita"],
  ["JA", "jpn"],
  ["KO", "kor"],
  ["LT", "lit"],
  ["LV", "lav"],
  ["NL", "nld"],
  ["PL", "pol"],
  ["PT", "por"],
  ["PT-BR", "por"],
  ["RO", "ron"],
  ["RU", "rus"],
  ["SL", "slv"],
  ["SR", "hbs"],
  ["SV", "swe"],
  ["TL", "tgl"],
  ["TR", "tur"],
]);

const apertiumCodeToLuna = new Map([
  ["bul", ["BG"]],
  ["deu", ["DE"]],
  ["eng", ["EN"]],
  ["fra", ["FR"]],
  ["hbs", ["HR", "SR"]],
  ["ita", ["IT"]],
  ["por", ["PT", "PT-BR"]],
  ["ron", ["RO"]],
  ["rus", ["RU"]],
  ["spa", ["ES", "ES-419"]],
]);

const freeDictCodeToLuna = new Map([
  ["bul", "BG"],
  ["ces", "CS"],
  ["cze", "CS"],
  ["dan", "DA"],
  ["deu", "DE"],
  ["ger", "DE"],
  ["fin", "FI"],
  ["fra", "FR"],
  ["fre", "FR"],
  ["hin", "HI"],
  ["hrv", "HR"],
  ["hun", "HU"],
  ["ind", "ID"],
  ["ita", "IT"],
  ["jpn", "JA"],
  ["lit", "LT"],
  ["nld", "NL"],
  ["dut", "NL"],
  ["nob", "NB"],
  ["nor", "NB"],
  ["pol", "PL"],
  ["por", "PT"],
  ["ron", "RO"],
  ["rum", "RO"],
  ["rus", "RU"],
  ["spa", "ES"],
  ["srp", "SR"],
  ["swe", "SV"],
  ["swh", "SW"],
  ["tur", "TR"],
  ["zho", "ZH"],
  ["chi", "ZH"],
]);

const kaikkiSourceIdByLanguage = new Map([
  ["EN", "kaikki-english"],
  ["ES", "kaikki-spanish"],
  ["ES-419", "kaikki-spanish"],
  ["FR", "kaikki-french"],
  ["DE", "kaikki-german"],
  ["IT", "kaikki-italian"],
  ["PT", "kaikki-portuguese"],
  ["PT-BR", "kaikki-portuguese"],
  ["RU", "kaikki-russian"],
  ["ZH", "kaikki-chinese"],
  ["JA", "kaikki-japanese"],
  ["KO", "kaikki-korean"],
  ["VI", "kaikki-vietnamese"],
  ["TH", "kaikki-thai"],
  ["MS", "kaikki-malay"],
  ["ID", "kaikki-indonesian"],
  ["PL", "kaikki-polish"],
  ["NL", "kaikki-dutch"],
  ["SV", "kaikki-swedish"],
  ["NB", "kaikki-norwegian-bokmal"],
  ["DA", "kaikki-danish"],
  ["FI", "kaikki-finnish"],
  ["CS", "kaikki-czech"],
  ["SK", "kaikki-slovak"],
  ["HU", "kaikki-hungarian"],
  ["RO", "kaikki-romanian"],
  ["BG", "kaikki-bulgarian"],
  ["HR", "kaikki-serbo-croatian"],
  ["SR", "kaikki-serbo-croatian"],
  ["SL", "kaikki-slovene"],
  ["LT", "kaikki-lithuanian"],
  ["LV", "kaikki-latvian"],
  ["ET", "kaikki-estonian"],
  ["IS", "kaikki-icelandic"],
  ["HI", "kaikki-hindi"],
  ["BN", "kaikki-bengali"],
  ["TL", "kaikki-tagalog"],
  ["MY", "kaikki-burmese"],
  ["KM", "kaikki-khmer"],
  ["LO", "kaikki-lao"],
  ["NE", "kaikki-nepali"],
  ["TA", "kaikki-tamil"],
  ["TE", "kaikki-telugu"],
  ["KN", "kaikki-kannada"],
  ["ML", "kaikki-malayalam"],
  ["UZ", "kaikki-uzbek"],
  ["KK", "kaikki-kazakh"],
  ["AZ", "kaikki-azerbaijani"],
  ["KA", "kaikki-georgian"],
  ["HY", "kaikki-armenian"],
  ["TR", "kaikki-turkish"],
  ["SW", "kaikki-swahili"],
  ["EN-GB", "kaikki-english"],
]);

const dbnarySourceIdByLanguage = new Map([
  ["EN", "dbnary-en-20251001"],
  ["EN-GB", "dbnary-en-20251001"],
  ["ES", "dbnary-es-20251001"],
  ["ES-419", "dbnary-es-20251001"],
  ["FR", "dbnary-fr-20251001"],
  ["DE", "dbnary-de-20251001"],
  ["IT", "dbnary-it-20251001"],
  ["PT", "dbnary-pt-20251001"],
  ["PT-BR", "dbnary-pt-20251001"],
  ["RU", "dbnary-ru-20251001"],
  ["ZH", "dbnary-zh-20251001"],
  ["JA", "dbnary-ja-20251001"],
  ["ID", "dbnary-id-20251001"],
  ["PL", "dbnary-pl-20251001"],
  ["NL", "dbnary-nl-20251001"],
  ["SV", "dbnary-sv-20251001"],
  ["NB", "dbnary-no-20251001"],
  ["DA", "dbnary-da-20251001"],
  ["FI", "dbnary-fi-20251001"],
  ["CS", "dbnary-cs-20251001"],
  ["BG", "dbnary-bg-20251001"],
  ["HR", "dbnary-sh-20251001"],
  ["SR", "dbnary-sh-20251001"],
  ["LT", "dbnary-lt-20251001"],
  ["TR", "dbnary-tr-20251001"],
]);

const officialDictionarySourceByLanguage = new Map([
  ["KO", { source_id: "official-nikl-korean-basic-dictionary", adapter: "nikl" }],
  ["TH", { source_id: "official-lexitron-thai-2", adapter: "lexitron" }],
  ["MY", { source_id: "sealang-dictionary-reference", adapter: "sealang" }],
  ["KM", { source_id: "sealang-dictionary-reference", adapter: "sealang" }],
  ["LO", { source_id: "sealang-dictionary-reference", adapter: "sealang" }],
]);

const indicMtSanityLanguages = new Set(["HI", "BN", "NE", "SI", "TA", "TE", "KN", "ML"]);

const dakshinaCodeByLanguage = new Map([
  ["BN", "bn"],
  ["HI", "hi"],
  ["KN", "kn"],
  ["ML", "ml"],
  ["SI", "si"],
  ["TA", "ta"],
  ["TE", "te"],
]);

const lexvoCodeByLanguage = new Map([
  ["ES", "spa"],
  ["ES-419", "spa"],
  ["FR", "fra"],
  ["DE", "deu"],
  ["IT", "ita"],
  ["PT", "por"],
  ["PT-BR", "por"],
  ["RU", "rus"],
  ["ZH", "zho"],
  ["JA", "jpn"],
  ["ID", "ind"],
  ["PL", "pol"],
  ["NL", "nld"],
  ["SV", "swe"],
  ["NB", "nor"],
  ["DA", "dan"],
  ["FI", "fin"],
  ["CS", "ces"],
  ["BG", "bul"],
  ["HR", "hbs"],
  ["SR", "hbs"],
  ["LT", "lit"],
  ["TR", "tur"],
]);

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeComparable(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeMorphComparable(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function uniqueSourceIds(values) {
  return [...new Set(values.filter(Boolean))];
}

function maybeAddCandidate(candidates, candidate, limit = 5) {
  if (!candidate?.value) return;
  if (candidates.some((row) => normalizeComparable(row.value) === normalizeComparable(candidate.value))) return;
  if (candidates.length < limit) candidates.push(candidate);
}

function glossTextFromKaikkiEntry(entry) {
  const parts = [];
  for (const sense of entry.senses ?? []) {
    for (const gloss of sense.glosses ?? []) parts.push(gloss);
    for (const rawGloss of sense.raw_glosses ?? []) parts.push(rawGloss);
    for (const link of sense.links ?? []) {
      if (Array.isArray(link)) parts.push(link[0], link[1]);
      else if (link?.word) parts.push(link.word);
    }
  }
  return normalizeText(parts.filter(Boolean).join(" ; "));
}

function entryMatchesCanonicalEnglish(entry, canonicalEnglish) {
  const canonical = normalizeComparable(canonicalEnglish);
  if (!canonical) return false;
  const canonicalTokens = canonical.split(" ").filter(Boolean);
  const candidateTexts = [];
  for (const sense of entry.senses ?? []) {
    if (candidateTexts.length >= KAIKKI_MAX_SENSE_TEXTS) break;
    for (const gloss of sense.glosses ?? []) candidateTexts.push(gloss);
    for (const rawGloss of sense.raw_glosses ?? []) candidateTexts.push(rawGloss);
    for (const link of sense.links ?? []) {
      if (Array.isArray(link)) candidateTexts.push(link[0], link[1]);
      else if (link?.word) candidateTexts.push(link.word);
    }
  }
  for (const text of candidateTexts) {
    const comparable = normalizeComparable(text);
    if (!comparable) continue;
    if (comparable === canonical) return true;
    if (canonicalTokens.length === 1 && comparable.split(" ").includes(canonical)) return true;
    if (canonicalTokens.length > 1 && comparable.includes(canonical)) return true;
  }
  return false;
}

function entryMatchedCanonicalKeys(entry, englishByKey) {
  const matches = new Set();
  const candidateTexts = [];
  for (const sense of entry.senses ?? []) {
    if (candidateTexts.length >= KAIKKI_MAX_SENSE_TEXTS) break;
    for (const gloss of sense.glosses ?? []) candidateTexts.push(gloss);
    for (const rawGloss of sense.raw_glosses ?? []) candidateTexts.push(rawGloss);
    for (const link of sense.links ?? []) {
      if (Array.isArray(link)) candidateTexts.push(link[0], link[1]);
      else if (link?.word) candidateTexts.push(link.word);
    }
  }
  for (const text of candidateTexts) {
    const comparable = normalizeComparable(text);
    if (!comparable) continue;
    if (englishByKey.has(comparable)) matches.add(comparable);
    for (const token of comparable.split(" ").filter(Boolean)) {
      if (englishByKey.has(token)) matches.add(token);
    }
    for (const key of englishByKey.keys()) {
      if (key.includes(" ") && comparable.includes(key)) matches.add(key);
    }
  }
  return [...matches];
}

function openMaybeGzip(localPath) {
  const stream = createReadStream(localPath);
  return localPath.endsWith(".gz") ? stream.pipe(createGunzip()) : stream;
}

function methodByLanguageFromPolicy(policy) {
  const result = new Map();
  for (const [method, languageCodes] of Object.entries(policy.methods ?? {})) {
    for (const languageCode of languageCodes) result.set(languageCode, method);
  }
  return result;
}

function shouldUseEpitranForLanguage(languageCode, context) {
  if (context.mode !== "fixture" && process.env.SOURCE_PREFLIGHT_ENABLE_EPITRAN !== "1") return false;
  if (!epitranPhoneticCandidateLanguages.has(languageCode)) return false;
  const method = context.transcriptionMethodByLanguage?.get(languageCode);
  return method === "source_lookup";
}

async function canImportPythonModule(moduleName, pythonExecutable = "python3") {
  try {
    await execFileAsync(pythonExecutable, ["-c", `import ${moduleName}`], { timeout: 12000, maxBuffer: 4096 });
    return true;
  } catch {
    return false;
  }
}

async function pathExists(localPath) {
  try {
    await access(localPath);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(localPath, options = {}) {
  const limit = options.limit ?? 200;
  const files = [];
  async function visit(current) {
    if (files.length >= limit) return;
    let entries = [];
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(entryPath);
      else files.push(entryPath);
      if (files.length >= limit) return;
    }
  }
  await visit(localPath);
  return files;
}

async function streamTarBzipMemberLines(archivePath, memberPath, onLine) {
  return new Promise((resolve, reject) => {
    const tar = spawn("tar", ["-xOzf", archivePath, memberPath], { stdio: ["ignore", "pipe", "pipe"] });
    const bzcat = spawn("bzcat", [], { stdio: ["pipe", "pipe", "pipe"] });
    const stderr = [];
    let stopped = false;

    tar.stderr.on("data", (chunk) => stderr.push(chunk.toString()));
    bzcat.stderr.on("data", (chunk) => stderr.push(chunk.toString()));
    tar.on("error", reject);
    bzcat.on("error", reject);
    tar.stdout.on("error", (error) => {
      if (!stopped || error.code !== "EPIPE") reject(error);
    });
    bzcat.stdin.on("error", (error) => {
      if (!stopped || error.code !== "EPIPE") reject(error);
    });
    tar.stdout.pipe(bzcat.stdin);

    const lineReader = readline.createInterface({ input: bzcat.stdout, crlfDelay: Infinity });
    (async () => {
      try {
        for await (const line of lineReader) {
          const shouldContinue = await onLine(line);
          if (shouldContinue === false) {
            stopped = true;
            lineReader.close();
            tar.stdout.unpipe(bzcat.stdin);
            bzcat.stdin.destroy();
            tar.kill("SIGTERM");
            bzcat.kill("SIGTERM");
            break;
          }
        }
      } catch (error) {
        reject(error);
      }
    })();

    bzcat.on("close", (code, signal) => {
      if (stopped || code === 0 || signal === "SIGTERM") resolve();
      else reject(new Error(`bzcat failed for ${memberPath}: ${stderr.join("").trim()}`));
    });
  });
}

function firstNumberFeature(features) {
  if (/\bPL\b/u.test(features)) return "plural";
  if (/\bSG\b/u.test(features)) return "singular";
  return "";
}

function decodeXmlEntities(value) {
  return String(value ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

function dixText(fragment) {
  return decodeXmlEntities(
    String(fragment ?? "")
      .replace(/<b\s*\/>/giu, " ")
      .replace(/<j\s*\/>/giu, "")
      .replace(/<s\b[^>]*\/>/giu, "")
      .replace(/<[^>]+>/gu, "")
      .replace(/\s+/gu, " ")
      .trim()
  );
}

function inferApertiumPair(file) {
  const base = path.basename(file).toLowerCase();
  const match = base.match(/(?:apertium-)?([a-z]{2,3})-([a-z]{2,3})/u);
  if (!match) return null;
  const left = match[1];
  const right = match[2];
  if (left !== "eng" && right !== "eng") return null;
  const targetCode = left === "eng" ? right : left;
  return {
    english_side: left === "eng" ? "left" : "right",
    target_code: targetCode,
    language_codes: apertiumCodeToLuna.get(targetCode) ?? [],
  };
}

async function commandExists(command) {
  try {
    await execFileAsync(command, ["--help"], { timeout: 2500, maxBuffer: 4096 });
    return true;
  } catch {
    return false;
  }
}

async function listZipMembers(zipPath) {
  try {
    const { stdout } = await execFileAsync("unzip", ["-Z1", zipPath], {
      timeout: 30000,
      maxBuffer: 8 * 1024 * 1024,
    });
    return stdout
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function readZipMember(zipPath, memberPath) {
  try {
    const { stdout } = await execFileAsync("unzip", ["-p", zipPath, memberPath], {
      timeout: 30000,
      maxBuffer: 128 * 1024 * 1024,
    });
    return stdout;
  } catch {
    return "";
  }
}

async function detectPythonExecutable() {
  const envPython = normalizeText(process.env.SOURCE_PREFLIGHT_PYTHON);
  if (envPython) return envPython;
  const localPython = path.join(projectRoot, ".venv-source-tools/bin/python");
  if (await pathExists(localPython)) return localPython;
  return "python3";
}

export async function buildToolSourceBatchContext(options = {}) {
  const features = options.features ?? {};
  const transcriptionPolicy = await loadTranscriptionSourcePolicy();
  const referenceManifest = await loadReferenceSourcesManifest();
  const sourceById = new Map((referenceManifest.sources ?? []).map((source) => [source.id, source]));
  const transcriptionMethodByLanguage = methodByLanguageFromPolicy(transcriptionPolicy);
  if (options.fixtureToolSources) {
    return {
      mode: "fixture",
      projectRoot,
      transcriptionMethodByLanguage,
      sourceById,
    availability: {
        epitran: true,
        unimorph: true,
        apertium: true,
        freedict: true,
        dbnaryTranslations: true,
        kaikki: true,
        officialDictionaries: true,
        mtSanity: true,
        dakshina: true,
        openphonemizer: false,
        phonemizerEspeakNg: false,
      },
      unimorphCache: new Map(),
      apertiumCache: new Map(),
      freedictCache: new Map(),
      dbnaryCache: new Map(),
      kaikkiCache: new Map(),
      officialDictionaryCache: new Map(),
      mtSanityCache: new Map(),
      dakshinaCache: new Map(),
      warnings: [
        {
          source_id: "tool-openphonemizer",
          severity: "warning",
          code: "optional_tool_missing",
          detail: "fixture missing-tool warning",
        },
      ],
    };
  }

  const pythonExecutable = await detectPythonExecutable();
  const openphonemizerImportable = await canImportPythonModule("openphonemizer", pythonExecutable);
  const openphonemizerCommandAvailable = await commandExists(process.env.OPENPHONEMIZER_BIN ?? "openphonemizer");
  const availability = {
    epitran: features.epitran === false ? false : await canImportPythonModule("epitran", pythonExecutable),
    unimorph: features.unimorph === false ? false : await pathExists(path.join(projectRoot, "reference-sources/raw/unimorph")),
    apertium: features.apertium === false ? false : await pathExists(path.join(projectRoot, "reference-sources/raw/apertium")),
    freedict: features.freedict === false ? false : await pathExists(path.join(projectRoot, "reference-sources/raw/freedict/dictionaries")),
    dbnaryTranslations:
      features.dbnaryTranslations === false
        ? false
        : await pathExists(path.join(projectRoot, "reference-sources/raw/dbnary/en_dbnary_all_20251001.tgz")),
    kaikki: features.kaikki === false ? false : true,
    officialDictionaries:
      features.officialDictionaries === false
        ? false
        : await pathExists(path.join(projectRoot, "reference-sources/raw/official-dictionaries")),
    mtSanity: features.mtSanity === false ? false : true,
    dakshina:
      features.dakshina === false
        ? false
        : await pathExists(path.join(projectRoot, "reference-sources/raw/dakshina/dakshina_dataset_v1.0.tar")),
    openphonemizer: openphonemizerImportable || openphonemizerCommandAvailable,
    phonemizerEspeakNg: false,
  };

  const warnings = [];
  if (!availability.epitran) {
    warnings.push({
      source_id: "tool-epitran-g2p",
      severity: "warning",
      code: "optional_tool_missing",
      detail: "Epitran is not installed; IPA/G2P candidate generation is unavailable.",
    });
  }
  if (!availability.unimorph) {
    warnings.push({
      source_id: "tool-unimorph-morphology",
      severity: "warning",
      code: "optional_source_missing",
      detail: "UniMorph data is not present under reference-sources/raw/unimorph.",
    });
  }
  if (!availability.apertium) {
    warnings.push({
      source_id: "tool-apertium-dictionaries",
      severity: "warning",
      code: "optional_source_missing",
      detail: "Apertium dictionaries are not present under reference-sources/raw/apertium.",
    });
  }
  if (!availability.freedict) {
    warnings.push({
      source_id: "freedict-database-index",
      severity: "warning",
      code: "optional_source_missing",
      detail: "Targeted FreeDict dictionaries are not present under reference-sources/raw/freedict/dictionaries.",
    });
  }
  if (!availability.openphonemizer) {
    warnings.push({
      source_id: "tool-openphonemizer",
      severity: "warning",
      code: "optional_tool_missing",
      detail: "OpenPhonemizer is not installed or importable; optional IPA candidates are unavailable.",
    });
  }

  const context = {
    mode: "auto",
    projectRoot,
    pythonExecutable,
    transcriptionMethodByLanguage,
    sourceById,
    paths: {
      unimorphRoot: path.join(projectRoot, "reference-sources/raw/unimorph"),
      apertiumRoot: path.join(projectRoot, "reference-sources/raw/apertium"),
      freedictRoot: path.join(projectRoot, "reference-sources/raw/freedict/dictionaries"),
      dbnaryEnglishArchive: path.join(projectRoot, "reference-sources/raw/dbnary/en_dbnary_all_20251001.tgz"),
      officialDictionaryRoot: path.join(projectRoot, "reference-sources/raw/official-dictionaries"),
      mtSanityRoot: path.join(projectRoot, "reference-sources/raw/mt-sanity"),
      dakshinaArchive: path.join(projectRoot, "reference-sources/raw/dakshina/dakshina_dataset_v1.0.tar"),
    },
    unimorphTargetComparablesByCode: buildUnimorphTargetComparables(options.rows ?? []),
    availability,
    unimorphCache: new Map(),
    apertiumCache: new Map(),
    freedictCache: new Map(),
    dbnaryCache: new Map(),
    kaikkiCache: new Map(),
    officialDictionaryCache: new Map(),
    mtSanityCache: new Map(),
    dakshinaCache: new Map(),
    warnings,
  };
  if (options.rows?.length) {
    context.dbnaryBatchCandidates = await buildDbnaryBatchCandidateMap(options.rows, context);
    context.kaikkiBatchCandidates = await buildKaikkiBatchCandidateMap(options.rows, context);
  }
  return context;
}

function buildUnimorphTargetComparables(rows) {
  const byCode = new Map();
  for (const row of rows) {
    const languageCode = row.language_code ?? row.languageCode;
    const code = unimorphCodeByLanguage.get(languageCode);
    if (!code) continue;
    const values = [
      row.native_word,
      row.display_word,
      row.word_with_article_or_marker,
    ]
      .map(normalizeMorphComparable)
      .filter(Boolean);
    if (values.length === 0) continue;
    if (!byCode.has(code)) byCode.set(code, new Set());
    for (const value of values) byCode.get(code).add(value);
  }
  return byCode;
}

async function epitranCandidate(row, context) {
  const languageCode = row.language_code ?? row.languageCode;
  if (!shouldUseEpitranForLanguage(languageCode, context)) return null;
  const code = epitranCodeByLanguage.get(languageCode);
  if (!code) return null;
  const display = normalizeText(row.word_with_article_or_marker ?? row.display_word ?? row.native_word);
  if (!display) return null;

  if (context.mode === "fixture") {
    return {
      source_id: "tool-epitran-g2p",
      adapter: "epitran",
      field: "transcription",
      value: row.fixture_epitran_candidate ?? `/${normalizeComparable(display).replace(/\s+/g, ".")}/`,
      confidence: "source_partial",
      note: "Fixture Epitran candidate; tool output is not final truth.",
    };
  }

  if (!context.availability.epitran) return null;
  try {
    const script = [
      "import json, sys",
      "import epitran",
      "epi = epitran.Epitran(sys.argv[1])",
      "print(json.dumps({'candidate': epi.transliterate(sys.argv[2])}, ensure_ascii=False))",
    ].join("\n");
    const { stdout } = await execFileAsync(context.pythonExecutable ?? "python3", ["-c", script, code, display], {
      timeout: 5000,
      maxBuffer: 1024 * 128,
    });
    const parsed = JSON.parse(stdout.trim() || "{}");
    const candidate = normalizeText(parsed.candidate);
    if (!candidate) return null;
    return {
      source_id: "tool-epitran-g2p",
      adapter: "epitran",
      field: "transcription",
      value: candidate.startsWith("/") ? candidate : `/${candidate}/`,
      confidence: "source_partial",
      note: `Epitran ${code} candidate; tool output is not final truth.`,
    };
  } catch (error) {
    return {
      source_id: "tool-epitran-g2p",
      adapter: "epitran",
      field: "transcription",
      value: "",
      confidence: "source_partial",
      warning: "tool_error",
      note: `Epitran probe failed: ${error.message}`,
    };
  }
}

async function loadUnimorphForms(languageCode, context) {
  const code = unimorphCodeByLanguage.get(languageCode);
  if (!code || !context.availability?.unimorph) return [];
  if (context.unimorphCache.has(code)) return context.unimorphCache.get(code);

  const root = context.paths?.unimorphRoot ?? path.join(projectRoot, "reference-sources/raw/unimorph");
  const targetComparables = context.unimorphTargetComparablesByCode?.get(code) ?? null;
  const files = (await listFiles(root, { limit: 500 })).filter((file) => {
    const lower = path.basename(file).toLowerCase();
    const relativeParts = path.relative(root, file).toLowerCase().split(path.sep);
    return lower === code || lower.startsWith(`${code}.`) || lower.includes(`${code}_`) || relativeParts.includes(code);
  });
  const rows = [];
  for (const file of files.slice(0, 30)) {
    let input = null;
    try {
      input = createReadStream(file);
      const lineReader = readline.createInterface({ input, crlfDelay: Infinity });
      for await (const line of lineReader) {
        if (!line.trim() || line.startsWith("#")) continue;
        const [lemma, form, features] = line.split("\t");
        if (!lemma || !form || !features) continue;
        if (targetComparables) {
          const lemmaComparable = normalizeMorphComparable(lemma);
          const formComparable = normalizeMorphComparable(form);
          if (!targetComparables.has(lemmaComparable) && !targetComparables.has(formComparable)) continue;
        }
        rows.push({
          lemma: normalizeText(lemma),
          form: normalizeText(form),
          features: normalizeText(features),
          grammatical_number: firstNumberFeature(features),
          source_file: path.relative(projectRoot, file),
        });
        if (targetComparables && rows.length >= targetComparables.size * 4) break;
      }
      lineReader.close();
    } catch {
      continue;
    } finally {
      input?.destroy?.();
    }
  }
  context.unimorphCache.set(code, rows);
  return rows;
}

async function unimorphFindings(row, context) {
  const findings = [];
  const expectedNumber = normalizeText(row.expected_grammatical_number ?? row.number_grammar_expected);
  const actualNumber = normalizeText(row.grammatical_number ?? row.number_grammar_actual);
  const partOfSpeech = normalizeComparable(row.part_of_speech ?? row.partOfSpeech ?? "");
  const shouldSuggestMissingNumber =
    Boolean(expectedNumber) ||
    Boolean(actualNumber) ||
    ["noun", "proper noun", "pronoun", "adjective", "determiner", "numeral"].includes(partOfSpeech);
  if (expectedNumber && actualNumber && expectedNumber !== actualNumber) {
    findings.push({
      source_id: "tool-unimorph-morphology",
      adapter: "unimorph",
      field: "grammatical_number",
      value: actualNumber,
      expected_value: expectedNumber,
      confidence: "source_partial",
      severity: "blocker",
      code: "morphology_number_mismatch",
      note:
        context.mode === "fixture"
          ? "Fixture UniMorph-style mismatch."
          : "Draft row declares number morphology that conflicts with the expected number.",
    });
  }
  const shouldLookupUnimorphForm = Boolean(expectedNumber) || Boolean(actualNumber) || shouldSuggestMissingNumber;
  if (context.mode !== "fixture" && context.availability?.unimorph && shouldLookupUnimorphForm) {
    const forms = await loadUnimorphForms(row.language_code ?? row.languageCode, context);
    const display = normalizeMorphComparable(row.word_with_article_or_marker ?? row.display_word ?? row.native_word);
    const native = normalizeMorphComparable(row.native_word);
    const match = forms.find((form) => normalizeMorphComparable(form.form) === display || normalizeMorphComparable(form.form) === native);
    if (match?.grammatical_number && expectedNumber && match.grammatical_number !== expectedNumber) {
      findings.push({
        source_id: "tool-unimorph-morphology",
        adapter: "unimorph",
        field: "grammatical_number",
        value: match.grammatical_number,
        expected_value: expectedNumber,
        confidence: "source_partial",
        severity: "blocker",
        code: "morphology_number_mismatch",
        note: `UniMorph local form ${match.form} (${match.features}) conflicts with expected grammatical number; ${match.source_file}.`,
      });
    }
    if (match?.grammatical_number && !actualNumber && shouldSuggestMissingNumber) {
      findings.push({
        source_id: "tool-unimorph-morphology",
        adapter: "unimorph",
        field: "grammatical_number",
        value: match.grammatical_number,
        expected_value: expectedNumber || "",
        confidence: "source_partial",
        severity: "warning",
        code: "morphology_candidate",
        note: `UniMorph local form candidate ${match.form} (${match.features}); ${match.source_file}.`,
      });
    }
  }
  return findings;
}

async function loadApertiumRows(context) {
  if (!context.availability?.apertium) return [];
  if (context.apertiumCache.has("rows")) return context.apertiumCache.get("rows");

  const root = context.paths?.apertiumRoot ?? path.join(projectRoot, "reference-sources/raw/apertium");
  const files = (await listFiles(root, { limit: 500 })).filter((file) => /\.(jsonl|tsv|csv|dix)$/iu.test(file));
  const rows = [];
  for (const file of files.slice(0, 80)) {
    let content = "";
    try {
      content = await readFile(file, "utf8");
    } catch {
      continue;
    }
    if (file.endsWith(".dix")) {
      const pair = inferApertiumPair(file);
      if (!pair || pair.language_codes.length === 0) continue;
      const entryPattern = /<p>\s*<l>([\s\S]*?)<\/l>\s*<r>([\s\S]*?)<\/r>\s*<\/p>/giu;
      let match = null;
      while ((match = entryPattern.exec(content)) !== null) {
        const left = dixText(match[1]);
        const right = dixText(match[2]);
        const source = pair.english_side === "left" ? left : right;
        const target = pair.english_side === "left" ? right : left;
        if (!source || !target) continue;
        for (const languageCode of pair.language_codes) {
          rows.push({
            source,
            target,
            language_code: languageCode,
            source_file: path.relative(projectRoot, file),
          });
        }
      }
      continue;
    }

    for (const line of content.split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      if (file.endsWith(".jsonl")) {
        try {
          const parsed = JSON.parse(trimmed);
          const source = parsed.source ?? parsed.source_word ?? parsed.en ?? parsed.english ?? parsed.lemma;
          const target = parsed.target ?? parsed.target_word ?? parsed.translation ?? parsed.native_word;
          const languageCode = parsed.language_code ?? parsed.target_language_code ?? parsed.luna_language_code ?? "";
          if (source && target) {
            rows.push({
              source: normalizeText(source),
              target: normalizeText(target),
              language_code: normalizeText(languageCode),
              source_file: path.relative(projectRoot, file),
            });
          }
        } catch {
          continue;
        }
      } else {
        const cols = trimmed.split(file.endsWith(".csv") ? "," : "\t").map((col) => normalizeText(col));
        if (cols.length >= 2) {
          rows.push({
            source: cols[0],
            target: cols[1],
            language_code: cols[2] ?? "",
            source_file: path.relative(projectRoot, file),
          });
        }
      }
    }
  }
  context.apertiumCache.set("rows", rows);
  return rows;
}

async function apertiumCandidate(row, context) {
  if (!row.fixture_apertium_match && context.mode === "fixture") return null;
  const value = normalizeText(row.fixture_apertium_candidate ?? row.native_word ?? row.display_word);
  if (context.mode === "fixture" && !value) return null;
  if (context.mode === "fixture") {
    return {
      source_id: "tool-apertium-dictionaries",
      adapter: "apertium",
      field: "native_word",
      value,
      confidence: "source_partial",
      note: "Apertium dictionary candidate; supports review but cannot approve final row alone.",
    };
  }
  if (!context.availability?.apertium) return null;
  const source = normalizeComparable(row.canonical_english);
  if (!source) return null;
  const languageCode = row.language_code ?? row.languageCode ?? "";
  const match = (await loadApertiumRows(context)).find(
    (candidate) =>
      normalizeComparable(candidate.source) === source &&
      (!candidate.language_code || candidate.language_code === languageCode)
  );
  if (!match?.target) return null;
  return {
    source_id: "tool-apertium-dictionaries",
    adapter: "apertium",
    field: "native_word",
    value: match.target,
    confidence: "source_partial",
    note: `Apertium local dictionary candidate from ${match.source_file}; supports review but cannot approve final row alone.`,
  };
}

async function loadFreeDictRows(context, languageCode = "", sourceFilter = "") {
  if (!context.availability?.freedict) return [];
  const normalizedSourceFilter = normalizeComparable(sourceFilter);
  const cacheKey = languageCode || normalizedSourceFilter ? `rows:${languageCode}:${normalizedSourceFilter}` : "rows";
  if (context.freedictCache.has(cacheKey)) return context.freedictCache.get(cacheKey);

  const root = context.paths?.freedictRoot ?? path.join(projectRoot, "reference-sources/raw/freedict/dictionaries");
  const files = (await listFiles(root, { limit: 500 })).filter((file) => {
    if (!/\.(jsonl|tsv|csv|tei|xml|tar\.xz)$/iu.test(file)) return false;
    const fileLanguageCode = lunaLanguageFromFreeDictPath(file);
    return !languageCode || fileLanguageCode === languageCode;
  });
  const rows = [];
  for (const file of files.slice(0, 100)) {
    if (normalizedSourceFilter && /\.(tei|xml|tar\.xz)$/iu.test(file)) {
      const cachedSourceRows = await readFreeDictSourceCache(file, normalizedSourceFilter);
      if (cachedSourceRows) {
        for (const row of cachedSourceRows) rows.push(row);
        continue;
      }
      const sourceRows = await freeDictRowsFromTeiForSource(file, normalizedSourceFilter);
      await writeFreeDictSourceCache(file, normalizedSourceFilter, sourceRows);
      for (const row of sourceRows) rows.push(row);
      continue;
    }
    const cachedRows = await readFreeDictCache(file, normalizedSourceFilter);
    if (cachedRows) {
      for (const row of cachedRows) rows.push(row);
      continue;
    }
    let content = "";
    try {
      content = await readFreeDictContent(file);
    } catch {
      continue;
    }
    const fileRows = [];
    if (/\.(tei|xml|tar\.xz)$/iu.test(file)) {
      for (const row of freeDictRowsFromTei(content, file)) fileRows.push(row);
      for (const row of fileRows) {
        if (!normalizedSourceFilter || normalizeComparable(row.source) === normalizedSourceFilter) rows.push(row);
      }
      await writeFreeDictCache(file, fileRows);
      continue;
    }
    for (const line of content.split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      if (/\.jsonl$/iu.test(file)) {
        try {
          const parsed = JSON.parse(trimmed);
          const source = parsed.source ?? parsed.source_word ?? parsed.en ?? parsed.english ?? parsed.lemma;
          const target = parsed.target ?? parsed.target_word ?? parsed.translation ?? parsed.native_word;
          const languageCode = parsed.language_code ?? parsed.target_language_code ?? parsed.luna_language_code ?? "";
          if (source && target) {
            fileRows.push({
              source: normalizeText(source),
              target: normalizeText(target),
              language_code: normalizeText(languageCode),
              source_file: path.relative(projectRoot, file),
            });
          }
        } catch {
          continue;
        }
      } else {
        const cols = trimmed.split(/\.csv$/iu.test(file) ? "," : "\t").map((col) => normalizeText(col));
        if (cols.length >= 2) {
          fileRows.push({
            source: cols[0],
            target: cols[1],
            language_code: cols[2] ?? "",
            source_file: path.relative(projectRoot, file),
          });
        }
      }
    }
    for (const row of fileRows) {
      if (!normalizedSourceFilter || normalizeComparable(row.source) === normalizedSourceFilter) rows.push(row);
    }
    await writeFreeDictCache(file, fileRows);
  }
  context.freedictCache.set(cacheKey, rows);
  return rows;
}

function lunaLanguageFromFreeDictPath(file) {
  const pairMatch = file.match(/eng-([a-z]{3})/iu);
  const targetCode = pairMatch?.[1]?.toLowerCase();
  return targetCode ? freeDictCodeToLuna.get(targetCode) ?? "" : "";
}

function stripXmlTags(value) {
  return normalizeText(decodeXmlEntities(String(value ?? "").replace(/<[^>]+>/gu, " ")));
}

function freeDictCachePath(file) {
  const relative = path.relative(projectRoot, file).replace(/[^a-z0-9._-]+/giu, "__");
  return path.join(projectRoot, "reference-sources/cache/freedict", `${relative}.lookup.jsonl`);
}

function freeDictSourceCachePath(file, sourceFilter) {
  const relative = path.relative(projectRoot, file).replace(/[^a-z0-9._-]+/giu, "__");
  const sourceHash = createHash("sha256").update(normalizeComparable(sourceFilter)).digest("hex").slice(0, 24);
  return path.join(projectRoot, "reference-sources/cache/freedict/by-source", relative, `${sourceHash}.json`);
}

async function readFreeDictSourceCache(file, sourceFilter) {
  const cachePath = freeDictSourceCachePath(file, sourceFilter);
  try {
    const [rawStat, cacheContent] = await Promise.all([stat(file), readFile(cachePath, "utf8")]);
    const parsed = JSON.parse(cacheContent);
    if (parsed?.type !== FREEDICT_SOURCE_CACHE_TYPE) return null;
    if (parsed.raw_size !== rawStat.size || parsed.raw_mtime_ms !== rawStat.mtimeMs) return null;
    if (parsed.source_key !== normalizeComparable(sourceFilter)) return null;
    if ((parsed.rows ?? []).some((row) => !row.language_code)) return null;
    return Array.isArray(parsed.rows) ? parsed.rows : null;
  } catch {
    return null;
  }
}

async function writeFreeDictSourceCache(file, sourceFilter, rows) {
  const cachePath = freeDictSourceCachePath(file, sourceFilter);
  try {
    const rawStat = await stat(file);
    await mkdir(path.dirname(cachePath), { recursive: true });
    await writeFile(
      cachePath,
      JSON.stringify(
        {
          type: FREEDICT_SOURCE_CACHE_TYPE,
          generated_at: new Date().toISOString(),
          raw_file: path.relative(projectRoot, file),
          raw_size: rawStat.size,
          raw_mtime_ms: rawStat.mtimeMs,
          source_key: normalizeComparable(sourceFilter),
          rows,
        },
        null,
        2
      )
    );
  } catch {
    // Cache writes are best-effort; exact lookup can still stream the raw archive.
  }
}

async function readFreeDictCache(file, sourceFilter = "") {
  const cachePath = freeDictCachePath(file);
  try {
    const rawStat = await stat(file);
    const firstLine = await readFirstLine(cachePath);
    const meta = firstLine ? JSON.parse(firstLine) : null;
    if (meta?.type !== FREEDICT_CACHE_TYPE) return null;
    if (meta.raw_size !== rawStat.size || meta.raw_mtime_ms !== rawStat.mtimeMs) return null;
    const normalizedFilter = normalizeComparable(sourceFilter);
    if (normalizedFilter) {
      const pattern = `"source_key":${JSON.stringify(normalizedFilter)}`;
      try {
        const { stdout } = await execFileAsync("rg", ["--fixed-strings", pattern, cachePath], {
          maxBuffer: 8 * 1024 * 1024,
          timeout: 12000,
        });
        return stdout
          .split(/\r?\n/u)
          .filter(Boolean)
          .map((line) => JSON.parse(line))
          .map(({ source_key: _sourceKey, ...row }) => row);
      } catch (error) {
        if (error?.code === 1) return [];
        throw error;
      }
    }
    const rows = [];
    const reader = readline.createInterface({
      input: createReadStream(cachePath, { encoding: "utf8" }),
      crlfDelay: Infinity,
    });
    let skippedMeta = false;
    for await (const line of reader) {
      if (!line.trim()) continue;
      if (!skippedMeta) {
        skippedMeta = true;
        continue;
      }
      const { source_key: _sourceKey, ...row } = JSON.parse(line);
      rows.push(row);
    }
    return rows;
  } catch {
    return null;
  }
}

async function readFirstLine(file) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const stream = createReadStream(file, { encoding: "utf8", highWaterMark: 4096 });
    stream.on("data", (chunk) => {
      buffer += chunk;
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex !== -1) {
        resolve(buffer.slice(0, newlineIndex));
        stream.destroy();
      }
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(buffer));
  });
}

async function writeFreeDictCache(file, rows) {
  const cachePath = freeDictCachePath(file);
  try {
    const rawStat = await stat(file);
    await mkdir(path.dirname(cachePath), { recursive: true });
    await writeFile(
      cachePath,
      [
        JSON.stringify({
          type: FREEDICT_CACHE_TYPE,
          generated_at: new Date().toISOString(),
          raw_file: path.relative(projectRoot, file),
          raw_size: rawStat.size,
          raw_mtime_ms: rawStat.mtimeMs,
        }),
        ...rows
          .map((row) => ({ source_key: normalizeComparable(row.source), ...row }))
          .filter((row) => row.source_key)
          .map((row) => JSON.stringify(row)),
        "",
      ].join("\n")
    );
  } catch {
    // Cache writes are best-effort; preflight must still work from raw archives.
  }
}

async function readFreeDictContent(file) {
  if (!/\.tar\.xz$/iu.test(file)) return readFile(file, "utf8");
  const member = await freeDictTeiMember(file);
  const args = member ? ["-xOf", file, member] : ["-xOf", file];
  const { stdout } = await execFileAsync("tar", args, {
    maxBuffer: 96 * 1024 * 1024,
    timeout: 30000,
  });
  return stdout;
}

async function freeDictTeiMember(file) {
  const { stdout: listing } = await execFileAsync("tar", ["-tf", file], {
    maxBuffer: 4 * 1024 * 1024,
    timeout: 30000,
  });
  return (
    listing
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .find((line) => /\.tei$/iu.test(line)) ?? ""
  );
}

async function freeDictRowsFromTeiForSource(file, normalizedSourceFilter) {
  const rows = [];
  let child = null;
  let stream = null;
  try {
    if (/\.tar\.xz$/iu.test(file)) {
      const member = await freeDictTeiMember(file);
      child = spawn("tar", member ? ["-xOf", file, member] : ["-xOf", file], { stdio: ["ignore", "pipe", "ignore"] });
      stream = child.stdout;
    } else {
      stream = createReadStream(file);
    }
    stream.setEncoding("utf8");
    let buffer = "";
    for await (const chunk of stream) {
      buffer += chunk;
      let endIndex = buffer.indexOf("</entry>");
      while (endIndex !== -1) {
        const entry = buffer.slice(0, endIndex + "</entry>".length);
        buffer = buffer.slice(endIndex + "</entry>".length);
        const source = stripXmlTags(entry.match(/<orth\b[^>]*>([\s\S]*?)<\/orth>/iu)?.[1]);
        if (source && normalizeComparable(source) === normalizedSourceFilter) {
          for (const row of freeDictRowsFromTei(entry, file)) rows.push(row);
          if (rows.length > 0) {
            stream.destroy();
            if (child) child.kill();
            return rows;
          }
        }
        endIndex = buffer.indexOf("</entry>");
      }
      if (buffer.length > 1024 * 1024) buffer = buffer.slice(-1024 * 1024);
    }
  } catch {
    return rows;
  } finally {
    if (child) child.kill();
  }
  return rows;
}

function freeDictRowsFromTei(content, file) {
  const rows = [];
  const languageCode = lunaLanguageFromFreeDictPath(file);
  const sourceFile = path.relative(projectRoot, file);
  const entryMatches = String(content ?? "").matchAll(/<entry\b[\s\S]*?<\/entry>/giu);
  for (const entryMatch of entryMatches) {
    const entry = entryMatch[0];
    const source = stripXmlTags(entry.match(/<orth\b[^>]*>([\s\S]*?)<\/orth>/iu)?.[1]);
    if (!source) continue;
    const targets = [];
    const transCitMatches = entry.matchAll(/<cit\b[^>]*type=["']trans["'][^>]*>[\s\S]*?<\/cit>/giu);
    for (const citMatch of transCitMatches) {
      for (const quoteMatch of citMatch[0].matchAll(/<quote\b[^>]*>([\s\S]*?)<\/quote>/giu)) {
        const target = stripXmlTags(quoteMatch[1]);
        if (target) targets.push(target);
      }
    }
    if (targets.length === 0) {
      for (const quoteMatch of entry.matchAll(/<quote\b[^>]*>([\s\S]*?)<\/quote>/giu)) {
        const target = stripXmlTags(quoteMatch[1]);
        if (target) targets.push(target);
      }
    }
    for (const target of targets.slice(0, 12)) {
      if (!target || normalizeComparable(target) === normalizeComparable(source)) continue;
      rows.push({
        source,
        target,
        language_code: languageCode,
        source_file: sourceFile,
      });
    }
  }
  return rows;
}

function splitSourceDelimited(line, delimiter = "\t") {
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
  return cols.map((col) => normalizeText(col));
}

function pickField(row, names) {
  for (const name of names) {
    if (row[name] != null && normalizeText(row[name])) return normalizeText(row[name]);
  }
  return "";
}

function parsedSourceRowFromObject(parsed, file) {
  const source = pickField(parsed, [
    "source",
    "source_word",
    "canonical_english",
    "english",
    "en",
    "lemma_en",
    "e_entry",
    "e_search",
    "e-related",
  ]);
  const target = pickField(parsed, [
    "target",
    "target_word",
    "translation",
    "native_word",
    "display_word",
    "word",
    "lemma",
    "t_entry",
    "t_search",
  ]);
  if (!source || !target) return null;
  return {
    source,
    target,
    language_code: pickField(parsed, ["language_code", "target_language_code", "luna_language_code", "lang"]),
    source_id: pickField(parsed, ["source_id", "source_identifier", "reference_source_id"]),
    adapter: pickField(parsed, ["adapter", "source_adapter"]),
    license_restriction_note: pickField(parsed, ["license_restriction_note", "license_note"]),
    source_file: path.relative(projectRoot, file),
  };
}

async function loadGenericSourceRows(context, cacheName, rootPath, languageCode = "", sourceFilter = "") {
  if (!rootPath || !(await pathExists(rootPath))) return [];
  const normalizedSourceFilter = normalizeComparable(sourceFilter);
  const requestedLanguageCode = normalizeText(languageCode).toUpperCase();
  const cacheKey = `${cacheName}:${requestedLanguageCode}:${normalizedSourceFilter}`;
  if (context[cacheName]?.has(cacheKey)) return context[cacheName].get(cacheKey);

  const files = (await listFiles(rootPath, { limit: 500 })).filter((file) => /\.(jsonl|tsv|csv)$/iu.test(file));
  const rows = [];
  for (const file of files.slice(0, 200)) {
    let content = "";
    try {
      content = await readFile(file, "utf8");
    } catch {
      continue;
    }
    let headers = null;
    for (const line of content.split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      let row = null;
      if (/\.jsonl$/iu.test(file)) {
        try {
          row = parsedSourceRowFromObject(JSON.parse(trimmed), file);
        } catch {
          continue;
        }
      } else {
        const delimiter = /\.csv$/iu.test(file) ? "," : "\t";
        const cols = splitSourceDelimited(trimmed, delimiter);
        if (!headers && cols.some((col) => /^(source|target|english|translation|native_word|language_code)$/iu.test(col))) {
          headers = cols.map((col) => normalizeComparable(col).replace(/\s+/gu, "_"));
          continue;
        }
        if (headers) {
          const parsed = Object.fromEntries(headers.map((header, index) => [header, cols[index] ?? ""]));
          row = parsedSourceRowFromObject(parsed, file);
        } else if (cols.length >= 2) {
          row = {
            source: cols[0],
            target: cols[1],
            language_code: cols[2] ?? "",
            source_id: cols[3] ?? "",
            adapter: cols[4] ?? "",
            license_restriction_note: cols[5] ?? "",
            source_file: path.relative(projectRoot, file),
          };
        }
      }
      if (!row?.source || !row.target) continue;
      if (requestedLanguageCode && normalizeText(row.language_code).toUpperCase() !== requestedLanguageCode) continue;
      if (normalizedSourceFilter && normalizeComparable(row.source) !== normalizedSourceFilter) continue;
      rows.push(row);
      if (rows.length >= 100) break;
    }
    if (rows.length >= 100) break;
  }
  context[cacheName]?.set(cacheKey, rows);
  return rows;
}

async function loadOfficialDictionaryRows(context, languageCode = "", sourceFilter = "") {
  return loadGenericSourceRows(
    context,
    "officialDictionaryCache",
    context.paths?.officialDictionaryRoot ?? path.join(projectRoot, "reference-sources/raw/official-dictionaries"),
    languageCode,
    sourceFilter
  );
}

function featureObject(value) {
  const result = {};
  const features = Array.isArray(value?.feat) ? value.feat : value?.feat ? [value.feat] : [];
  for (const feature of features) {
    const key = normalizeText(feature?.att);
    if (key) result[key] = normalizeText(feature?.val);
  }
  return result;
}

function valuesFromDelimitedGloss(value) {
  return normalizeText(value)
    .split(/\s*(?:;|,|\/|\bor\b)\s*/iu)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function niklEntryCandidatesFromJson(parsed, sourceFilter, memberPath) {
  const source = normalizeComparable(sourceFilter);
  if (!source) return [];
  const entries = parsed?.LexicalResource?.Lexicon?.LexicalEntry ?? [];
  const candidates = [];
  for (const entry of Array.isArray(entries) ? entries : [entries]) {
    const lemma = normalizeText(featureObject(entry?.Lemma).writtenForm);
    if (!lemma) continue;
    const senses = Array.isArray(entry?.Sense) ? entry.Sense : entry?.Sense ? [entry.Sense] : [];
    for (const sense of senses) {
      const equivalents = Array.isArray(sense?.Equivalent) ? sense.Equivalent : sense?.Equivalent ? [sense.Equivalent] : [];
      for (const equivalent of equivalents) {
        const features = featureObject(equivalent);
        const language = normalizeText(features.language);
        if (language !== "영어" && language.toLowerCase() !== "english") continue;
        const englishLemma = normalizeText(features.lemma);
        const englishDefinition = normalizeText(features.definition);
        const candidateTexts = valuesFromDelimitedGloss(englishLemma);
        if (!candidateTexts.some((text) => normalizeComparable(text) === source)) {
          continue;
        }
        if (candidates.some((candidate) => normalizeComparable(candidate.target) === normalizeComparable(lemma))) continue;
        candidates.push({
          source: englishLemma || englishDefinition || sourceFilter,
          target: lemma,
          language_code: "KO",
          source_id: "official-nikl-korean-basic-dictionary",
          adapter: "nikl",
          source_file: `reference-sources/raw/official-dictionaries/nikl/korean-basic-dictionary-json-20260419.zip:${memberPath}`,
          gloss: englishDefinition,
          license_restriction_note:
            "NIKL Korean Basic Dictionary full JSON download; candidate evidence only and redistribution terms must be respected.",
        });
      }
    }
    if (candidates.length >= 5) break;
  }
  return candidates;
}

function addNiklIndexCandidate(index, key, row, limit = 8) {
  if (!key || !row?.target) return;
  const rows = index[key] ?? [];
  if (rows.some((candidate) => normalizeComparable(candidate.target) === normalizeComparable(row.target))) return;
  if (rows.length >= limit) return;
  rows.push(row);
  index[key] = rows;
}

function niklIndexRowsFromJson(parsed, memberPath) {
  const entries = parsed?.LexicalResource?.Lexicon?.LexicalEntry ?? [];
  const rowsByEnglishKey = {};
  for (const entry of Array.isArray(entries) ? entries : [entries]) {
    const lemma = normalizeText(featureObject(entry?.Lemma).writtenForm);
    if (!lemma) continue;
    const senses = Array.isArray(entry?.Sense) ? entry.Sense : entry?.Sense ? [entry.Sense] : [];
    for (const sense of senses) {
      const equivalents = Array.isArray(sense?.Equivalent) ? sense.Equivalent : sense?.Equivalent ? [sense.Equivalent] : [];
      for (const equivalent of equivalents) {
        const features = featureObject(equivalent);
        const language = normalizeText(features.language);
        if (language !== "영어" && language.toLowerCase() !== "english") continue;
        const englishLemma = normalizeText(features.lemma);
        const englishDefinition = normalizeText(features.definition);
        for (const candidateText of valuesFromDelimitedGloss(englishLemma)) {
          const key = normalizeComparable(candidateText);
          if (!key) continue;
          addNiklIndexCandidate(rowsByEnglishKey, key, {
            source: candidateText,
            target: lemma,
            language_code: "KO",
            source_id: "official-nikl-korean-basic-dictionary",
            adapter: "nikl",
            source_file: `reference-sources/raw/official-dictionaries/nikl/korean-basic-dictionary-json-20260419.zip:${memberPath}`,
            gloss: englishDefinition,
            license_restriction_note:
              "NIKL Korean Basic Dictionary full JSON download; candidate evidence only and redistribution terms must be respected.",
          });
        }
      }
    }
  }
  return rowsByEnglishKey;
}

async function loadNiklKoreanIndex(context, zipPath) {
  const cacheKey = "__nikl_en_ko_index";
  if (context.officialDictionaryCache?.has(cacheKey)) return context.officialDictionaryCache.get(cacheKey);

  const zipStats = await stat(zipPath);
  const cachePath = path.join(projectRoot, "reference-sources/cache/official-dictionaries/nikl_en_to_ko_v1.json");
  if (await pathExists(cachePath)) {
    try {
      const parsed = JSON.parse(await readFile(cachePath, "utf8"));
      if (
        parsed.cache_type === NIKL_KO_INDEX_CACHE_TYPE &&
        parsed.source_size === zipStats.size &&
        parsed.source_mtime_ms === Math.trunc(zipStats.mtimeMs) &&
        parsed.entries &&
        typeof parsed.entries === "object"
      ) {
        context.officialDictionaryCache?.set(cacheKey, parsed.entries);
        return parsed.entries;
      }
    } catch {
      // Rebuild corrupt or stale caches below.
    }
  }

  const entries = {};
  const members = (await listZipMembers(zipPath)).filter((item) => /\.json$/iu.test(item));
  for (const member of members) {
    const content = await readZipMember(zipPath, member);
    if (!content) continue;
    try {
      const memberRows = niklIndexRowsFromJson(JSON.parse(content), member);
      for (const [key, rows] of Object.entries(memberRows)) {
        for (const row of rows) addNiklIndexCandidate(entries, key, row);
      }
    } catch {
      continue;
    }
  }

  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(
    cachePath,
    JSON.stringify(
      {
        cache_type: NIKL_KO_INDEX_CACHE_TYPE,
        generated_at: new Date().toISOString(),
        source_zip: path.relative(projectRoot, zipPath),
        source_size: zipStats.size,
        source_mtime_ms: Math.trunc(zipStats.mtimeMs),
        members_count: members.length,
        entries,
      },
      null,
      2
    )
  );
  context.officialDictionaryCache?.set(cacheKey, entries);
  return entries;
}

async function loadNiklKoreanRows(context, sourceFilter = "") {
  const source = normalizeComparable(sourceFilter);
  if (!source || !context.availability?.officialDictionaries) return [];
  const cacheKey = `nikl:${source}`;
  if (context.officialDictionaryCache?.has(cacheKey)) return context.officialDictionaryCache.get(cacheKey);

  const zipPath = path.join(
    context.paths?.officialDictionaryRoot ?? path.join(projectRoot, "reference-sources/raw/official-dictionaries"),
    "nikl/korean-basic-dictionary-json-20260419.zip"
  );
  if (!(await pathExists(zipPath))) {
    context.officialDictionaryCache?.set(cacheKey, []);
    return [];
  }
  const index = await loadNiklKoreanIndex(context, zipPath);
  const candidates = (index[source] ?? []).slice(0, 5);
  context.officialDictionaryCache?.set(cacheKey, candidates);
  return candidates;
}

async function loadLexitronRows(context, sourceFilter = "") {
  const source = normalizeComparable(sourceFilter);
  if (!source || !context.availability?.officialDictionaries) return [];
  const cacheKey = `lexitron:${source}`;
  if (context.officialDictionaryCache?.has(cacheKey)) return context.officialDictionaryCache.get(cacheKey);
  const root = context.paths?.officialDictionaryRoot ?? path.join(projectRoot, "reference-sources/raw/official-dictionaries");
  const csvPath = path.join(root, "lexitron/etlex-utf8.csv");
  const rows = [];
  if (!(await pathExists(csvPath))) {
    context.officialDictionaryCache?.set(cacheKey, rows);
    return rows;
  }
  const reader = readline.createInterface({ input: createReadStream(csvPath, { encoding: "utf8" }), crlfDelay: Infinity });
  let headers = null;
  for await (const line of reader) {
    if (!line.trim()) continue;
    const cols = splitSourceDelimited(line, ",");
    if (!headers) {
      headers = cols.map((col) => normalizeComparable(col).replace(/\s+/gu, "_"));
      continue;
    }
    const row = Object.fromEntries(headers.map((header, index) => [header, cols[index] ?? ""]));
    const english = normalizeText(row.e_entry || row.e_search);
    const thai = normalizeText(row.t_entry);
    if (!english || !thai || normalizeComparable(english) !== source) continue;
    rows.push({
      source: english,
      target: thai,
      language_code: "TH",
      source_id: "official-lexitron-thai-2",
      adapter: "lexitron",
      source_file: "reference-sources/raw/official-dictionaries/lexitron/etlex-utf8.csv",
      gloss: normalizeText(row.t_related || row.e_syn || row.e_cat),
      license_restriction_note:
        "NECTEC LEXiTRON 2.0 CKAN dataset says License not specified; use as internal source_partial sanity only.",
    });
    if (rows.length >= 5) break;
  }
  context.officialDictionaryCache?.set(cacheKey, rows);
  return rows;
}

async function loadMtSanityRows(context, languageCode = "", sourceFilter = "") {
  return loadGenericSourceRows(
    context,
    "mtSanityCache",
    context.paths?.mtSanityRoot ?? path.join(projectRoot, "reference-sources/raw/mt-sanity"),
    languageCode,
    sourceFilter
  );
}

async function officialDictionaryCandidate(row, context) {
  const languageCode = row.language_code ?? row.languageCode ?? "";
  const sourceInfo = officialDictionarySourceByLanguage.get(languageCode);
  const fixtureMatch =
    row.fixture_official_dictionary_match ||
    row.fixture_nikl_candidate ||
    row.fixture_lexitron_candidate ||
    row.fixture_sealang_candidate;
  if (context.mode === "fixture") {
    if (!fixtureMatch) return null;
    const sourceId = normalizeText(row.fixture_official_dictionary_source_id ?? sourceInfo?.source_id ?? "official-dictionary-fixture");
    const adapter = normalizeText(row.fixture_official_dictionary_adapter ?? sourceInfo?.adapter ?? "official_dictionary");
    const value = normalizeText(
      row.fixture_official_dictionary_candidate ??
        row.fixture_nikl_candidate ??
        row.fixture_lexitron_candidate ??
        row.fixture_sealang_candidate ??
        row.native_word ??
        row.display_word
    );
    if (!value) return null;
    return {
      source_id: sourceId,
      adapter,
      field: "native_word",
      value,
      confidence: "source_partial",
      source_ids: [sourceId],
      note: "Official/curated dictionary fixture candidate; source output is candidate evidence only.",
      license_restriction_note: normalizeText(row.fixture_license_restriction_note),
    };
  }
  if (!sourceInfo || !context.availability?.officialDictionaries) return null;
  const source = normalizeComparable(row.canonical_english);
  if (!source) return null;
  const sourceRows =
    languageCode === "KO"
      ? await loadNiklKoreanRows(context, row.canonical_english)
      : languageCode === "TH"
        ? await loadLexitronRows(context, row.canonical_english)
      : await loadOfficialDictionaryRows(context, languageCode, source);
  const currentValue = normalizeComparable(row.native_word ?? row.display_word ?? row.word_with_article_or_marker);
  const match =
    sourceRows.find(
      (candidate) =>
        currentValue &&
        normalizeComparable(candidate.target) === currentValue &&
        (languageCode === "KO" || normalizeComparable(candidate.source) === source) &&
        (!candidate.language_code || candidate.language_code === languageCode)
    ) ??
    sourceRows.find(
    (candidate) =>
      (languageCode === "KO" || normalizeComparable(candidate.source) === source) &&
      (!candidate.language_code || candidate.language_code === languageCode)
    );
  if (!match?.target) return null;
  return {
    source_id: match.source_id || sourceInfo.source_id,
    adapter: match.adapter || sourceInfo.adapter,
    field: "native_word",
    value: match.target,
    confidence: "source_partial",
    source_ids: uniqueSourceIds([match.source_id || sourceInfo.source_id]),
    note: `Official/curated dictionary candidate from ${match.source_file}; candidate evidence only.`,
    license_restriction_note: match.license_restriction_note || context.sourceById?.get(sourceInfo.source_id)?.license_note || "",
  };
}

async function mtSanityCandidate(row, context) {
  const languageCode = row.language_code ?? row.languageCode ?? "";
  const fixtureCandidate = row.fixture_indictrans2_candidate ?? row.fixture_external_mt_candidate;
  if (context.mode === "fixture") {
    if (!fixtureCandidate) return null;
    const sourceId = indicMtSanityLanguages.has(languageCode) ? "tool-indictrans2-mt-sanity" : "tool-external-mt-sanity";
    return {
      source_id: sourceId,
      adapter: indicMtSanityLanguages.has(languageCode) ? "indictrans2" : "external_mt",
      field: "native_word",
      value: normalizeText(fixtureCandidate),
      confidence: "source_partial",
      source_ids: [sourceId],
      note: "MT sanity fixture candidate; MT output is not final source truth.",
      license_restriction_note: "MT sanity signal only; provider terms apply.",
    };
  }
  if (!context.availability?.mtSanity) return null;
  const source = normalizeComparable(row.canonical_english);
  if (!source) return null;
  const match = (await loadMtSanityRows(context, languageCode, source)).find(
    (candidate) =>
      normalizeComparable(candidate.source) === source &&
      (!candidate.language_code || candidate.language_code === languageCode)
  );
  if (!match?.target) return null;
  const sourceId = match.source_id || (indicMtSanityLanguages.has(languageCode) ? "tool-indictrans2-mt-sanity" : "tool-external-mt-sanity");
  return {
    source_id: sourceId,
    adapter: match.adapter || (indicMtSanityLanguages.has(languageCode) ? "indictrans2" : "external_mt"),
    field: "native_word",
    value: match.target,
    confidence: "source_partial",
    source_ids: [sourceId],
    note: `MT sanity candidate from ${match.source_file}; MT output is not final source truth.`,
    license_restriction_note: match.license_restriction_note || "MT sanity signal only; provider terms apply.",
  };
}

async function dakshinaTransliterationCandidate(row, context) {
  const languageCode = row.language_code ?? row.languageCode ?? "";
  const dakshinaCode = dakshinaCodeByLanguage.get(languageCode);
  if (context.mode === "fixture" && row.fixture_dakshina_candidate) {
    return {
      source_id: "dakshina-transliteration-dataset",
      adapter: "dakshina",
      field: "transcription",
      value: normalizeText(row.fixture_dakshina_candidate),
      confidence: "source_partial",
      source_ids: ["dakshina-transliteration-dataset"],
      note: "Dakshina fixture romanization candidate; sanity evidence only.",
      license_restriction_note: "Dakshina is CC BY-SA 4.0; use as romanization sanity only.",
    };
  }
  if (!dakshinaCode || !context.availability?.dakshina) return null;
  const nativeWord = normalizeText(row.native_word ?? row.word_with_article_or_marker ?? row.display_word);
  if (!nativeWord) return null;
  const cacheKey = `dakshina:${dakshinaCode}:${nativeWord}`;
  if (context.dakshinaCache?.has(cacheKey)) return context.dakshinaCache.get(cacheKey);

  const archivePath = context.paths?.dakshinaArchive ?? path.join(projectRoot, "reference-sources/raw/dakshina/dakshina_dataset_v1.0.tar");
  const members = [
    `dakshina_dataset_v1.0/${dakshinaCode}/lexicons/${dakshinaCode}.translit.sampled.train.tsv`,
    `dakshina_dataset_v1.0/${dakshinaCode}/lexicons/${dakshinaCode}.translit.sampled.dev.tsv`,
    `dakshina_dataset_v1.0/${dakshinaCode}/lexicons/${dakshinaCode}.translit.sampled.test.tsv`,
  ];
  const candidates = new Map();
  for (const member of members) {
    let stdout = "";
    try {
      ({ stdout } = await execFileAsync("tar", ["-xOf", archivePath, member], {
        timeout: 30000,
        maxBuffer: 16 * 1024 * 1024,
      }));
    } catch {
      continue;
    }
    for (const line of stdout.split(/\r?\n/u)) {
      if (!line.trim()) continue;
      const [native, romanization, count] = line.split("\t").map((item) => normalizeText(item));
      if (normalizeText(native) !== nativeWord || !romanization) continue;
      const previous = candidates.get(romanization);
      const numericCount = Number(count || 0);
      if (!previous || numericCount > previous.count) {
        candidates.set(romanization, { romanization, count: numericCount, member });
      }
    }
  }
  const best = [...candidates.values()].sort((left, right) => right.count - left.count)[0];
  const result = best
    ? {
        source_id: "dakshina-transliteration-dataset",
        adapter: "dakshina",
        field: "transcription",
        value: best.romanization,
        confidence: "source_partial",
        source_ids: ["dakshina-transliteration-dataset"],
        note: `Dakshina attested romanization candidate from ${best.member}; this is sanity evidence and not ISO 15919 final truth.`,
        license_restriction_note: "Dakshina is CC BY-SA 4.0; use as romanization sanity only.",
      }
    : null;
  context.dakshinaCache?.set(cacheKey, result);
  return result;
}

async function freeDictCandidate(row, context) {
  if (!row.fixture_freedict_match && context.mode === "fixture") return null;
  const value = normalizeText(row.fixture_freedict_candidate ?? row.native_word ?? row.display_word);
  if (context.mode === "fixture" && !value) return null;
  if (context.mode === "fixture") {
    return {
      source_id: "freedict-database-index",
      adapter: "freedict",
      field: "native_word",
      value,
      confidence: "source_partial",
      note: "FreeDict fixture candidate; bilingual dictionary output is source_partial until sense-matched.",
    };
  }
  if (!context.availability?.freedict) return null;
  const source = normalizeComparable(row.canonical_english);
  const languageCode = row.language_code ?? row.languageCode ?? "";
  if (!source || !languageCode) return null;
  const match = (await loadFreeDictRows(context, languageCode, source)).find(
    (candidate) => candidate.language_code === languageCode
  );
  if (!match?.target) return null;
  return {
    source_id: "freedict-database-index",
    adapter: "freedict",
    field: "native_word",
    value: match.target,
    confidence: "source_partial",
    note: `FreeDict targeted dictionary candidate from ${match.source_file}; candidate evidence only.`,
  };
}

function dbnaryPageSubjectFromEntrySubject(subject) {
  if (!subject) return "";
  if (!subject.startsWith("eng:")) return "";
  return subject.replace(/__.+$/u, "");
}

function dbnaryWrittenForm(block) {
  const match = block.match(/dbnary:writtenForm\s+"([^"]+)"@[a-z-]+/u);
  return match?.[1] ? cleanDbnaryWrittenForm(match[1]) : "";
}

function cleanDbnaryWrittenForm(value) {
  return normalizeText(
    decodeXmlEntities(value)
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/gu, "$2")
      .replace(/\[\[([^\]]+)\]\]/gu, "$1")
  );
}

function dbnaryBlockSubject(block) {
  const match = block.match(/^(\S+)/u);
  return match?.[1] ?? "";
}

function dbnaryCandidateMapKey(canonicalEnglish, targetLexvo) {
  return `${normalizeComparable(canonicalEnglish)}::${targetLexvo}`;
}

function dbnaryBatchCachePath(batchKey) {
  return path.join(projectRoot, "reference-sources/cache/dbnary", `en_20251001_${batchKey}.json`);
}

async function readDbnaryBatchCache(archivePath, batchKey) {
  const cachePath = dbnaryBatchCachePath(batchKey);
  try {
    const [rawStat, cacheContent] = await Promise.all([stat(archivePath), readFile(cachePath, "utf8")]);
    const parsed = JSON.parse(cacheContent);
    if (parsed?.type !== "dbnary-batch-candidate-cache-v1") return null;
    if (parsed.raw_size !== rawStat.size || parsed.raw_mtime_ms !== rawStat.mtimeMs) return null;
    if (parsed.batch_key !== batchKey) return null;
    return new Map(Object.entries(parsed.candidates_by_key ?? {}));
  } catch {
    return null;
  }
}

async function writeDbnaryBatchCache(archivePath, batchKey, candidateMap) {
  const cachePath = dbnaryBatchCachePath(batchKey);
  try {
    const rawStat = await stat(archivePath);
    await mkdir(path.dirname(cachePath), { recursive: true });
    await writeFile(
      cachePath,
      JSON.stringify(
        {
          type: "dbnary-batch-candidate-cache-v1",
          generated_at: new Date().toISOString(),
          raw_file: path.relative(projectRoot, archivePath),
          raw_size: rawStat.size,
          raw_mtime_ms: rawStat.mtimeMs,
          batch_key: batchKey,
          candidates_by_key: Object.fromEntries(candidateMap.entries()),
        },
        null,
        2
      )
    );
  } catch {
    // Cache writes are best-effort. The batch lookup can still stream DBnary once.
  }
}

async function buildDbnaryBatchCandidateMap(rows, context) {
  if (!context.availability?.dbnaryTranslations) return new Map();
  const archivePath =
    context.paths?.dbnaryEnglishArchive ?? path.join(projectRoot, "reference-sources/raw/dbnary/en_dbnary_all_20251001.tgz");
  const maxLines = Number(process.env.DBNARY_SOURCE_MAX_LINES ?? 250000);
  const englishByKey = new Map();
  const targetLexvos = new Set();
  const sourceIdsByLexvo = new Map();

  for (const row of rows ?? []) {
    const canonicalEnglish = normalizeText(row.canonical_english ?? row.canonicalEnglish);
    const languageCode = row.language_code ?? row.languageCode ?? "";
    const targetLexvo = lexvoCodeByLanguage.get(languageCode);
    if (!canonicalEnglish || !targetLexvo) continue;
    const englishKey = normalizeComparable(canonicalEnglish);
    if (!englishKey) continue;
    if (!englishByKey.has(englishKey)) englishByKey.set(englishKey, canonicalEnglish);
    targetLexvos.add(targetLexvo);
    const sourceId = dbnarySourceIdByLanguage.get(languageCode);
    if (sourceId) {
      const sourceIds = sourceIdsByLexvo.get(targetLexvo) ?? [];
      sourceIds.push(sourceId);
      sourceIdsByLexvo.set(targetLexvo, uniqueSourceIds(sourceIds));
    }
  }

  if (englishByKey.size === 0 || targetLexvos.size === 0) return new Map();

  const batchKey = createHash("sha256")
    .update([...englishByKey.keys()].sort().join("\n"))
    .update("\0")
    .update([...targetLexvos].sort().join("\n"))
    .update("\0")
    .update(String(maxLines))
    .digest("hex")
    .slice(0, 24);
  const cached = await readDbnaryBatchCache(archivePath, batchKey);
  if (cached) return cached;
  if (process.env.DBNARY_ALLOW_ON_THE_FLY !== "1") return new Map();

  const sourceId = "dbnary-en-20251001";
  const candidatesByKey = new Map();
  const subjectToEnglishKey = new Map();
  let blockLines = [];

  function addCandidate(englishKey, targetLexvo, value) {
    const key = dbnaryCandidateMapKey(englishKey, targetLexvo);
    const candidates = candidatesByKey.get(key) ?? [];
    maybeAddCandidate(candidates, {
      source_id: sourceId,
      adapter: "dbnary",
      field: "native_word",
      value,
      confidence: "source_partial",
      source_ids: uniqueSourceIds([sourceId, ...(sourceIdsByLexvo.get(targetLexvo) ?? [])]),
      note: `DBnary English-edition translation candidate for "${englishByKey.get(englishKey) ?? englishKey}" -> ${targetLexvo}; source_partial until sense-matched.`,
    });
    if (candidates.length > 0) candidatesByKey.set(key, candidates);
  }

  function processBlock(block) {
    if (!block.trim()) return;
    const subject = dbnaryBlockSubject(block);
    const labelMatch = block.match(/rdfs:label\s+"([^"]+)"@en/u);
    if (labelMatch) {
      const englishKey = normalizeComparable(labelMatch[1]);
      if (englishByKey.has(englishKey)) {
        subjectToEnglishKey.set(subject, englishKey);
        const pageSubject = dbnaryPageSubjectFromEntrySubject(subject);
        if (pageSubject) subjectToEnglishKey.set(pageSubject, englishKey);
      }
    }

    const targetLexvo = [...targetLexvos].find((lexvo) => block.includes(`dbnary:targetLanguage   lexvo:${lexvo}`));
    if (!targetLexvo || subjectToEnglishKey.size === 0) return;
    const matchedSubject =
      subjectToEnglishKey.has(subject) ? subject : [...subjectToEnglishKey.keys()].find((candidateSubject) => block.includes(candidateSubject));
    if (!matchedSubject) return;
    const value = normalizeText(dbnaryWrittenForm(block));
    if (value) addCandidate(subjectToEnglishKey.get(matchedSubject), targetLexvo, value);
  }

  try {
    let scannedLines = 0;
    await streamTarBzipMemberLines(archivePath, "en/en_dbnary_ontolex_20251001.ttl.bz2", async (line) => {
      scannedLines += 1;
      if (scannedLines > maxLines) return false;
      if (line.trim() === "") {
        processBlock(blockLines.join("\n"));
        blockLines = [];
        return true;
      }
      blockLines.push(line);
      return true;
    });
    if (blockLines.length > 0) processBlock(blockLines.join("\n"));
  } catch {
    return new Map();
  }

  await writeDbnaryBatchCache(archivePath, batchKey, candidatesByKey);
  return candidatesByKey;
}

async function dbnaryTranslationCandidates(row, context) {
  const languageCode = row.language_code ?? row.languageCode ?? "";
  const targetLexvo = lexvoCodeByLanguage.get(languageCode);
  const archivePath = context.paths?.dbnaryEnglishArchive ?? path.join(projectRoot, "reference-sources/raw/dbnary/en_dbnary_all_20251001.tgz");
  const canonicalEnglish = normalizeText(row.canonical_english ?? row.canonicalEnglish);
  if (!targetLexvo || !canonicalEnglish || !context.availability?.dbnaryTranslations) return [];

  const cacheKey = `${normalizeComparable(canonicalEnglish)}::${targetLexvo}`;
  if (context.dbnaryBatchCandidates) return context.dbnaryBatchCandidates.get(cacheKey) ?? [];
  if (context.dbnaryCache?.has(cacheKey)) return context.dbnaryCache.get(cacheKey);

  const candidates = [];
  const matchingSubjects = new Set();
  let blockLines = [];
  const sourceId = "dbnary-en-20251001";
  const targetSourceId = dbnarySourceIdByLanguage.get(languageCode);

  function processBlock(block) {
    if (!block.trim()) return true;
    const subject = dbnaryBlockSubject(block);
    const labelMatch = block.match(/rdfs:label\s+"([^"]+)"@en/u);
    if (labelMatch && normalizeComparable(labelMatch[1]) === normalizeComparable(canonicalEnglish)) {
      matchingSubjects.add(subject);
      const pageSubject = dbnaryPageSubjectFromEntrySubject(subject);
      if (pageSubject) matchingSubjects.add(pageSubject);
    }

    if (matchingSubjects.size > 0 && block.includes(`dbnary:targetLanguage   lexvo:${targetLexvo}`)) {
      const isForMatchedEntry = [...matchingSubjects].some((matchedSubject) => block.includes(matchedSubject));
      if (isForMatchedEntry) {
        const value = normalizeText(dbnaryWrittenForm(block));
        maybeAddCandidate(candidates, {
          source_id: sourceId,
          adapter: "dbnary",
          field: "native_word",
          value,
          confidence: "source_partial",
          source_ids: uniqueSourceIds([sourceId, targetSourceId]),
          note: `DBnary English-edition translation candidate for "${canonicalEnglish}" -> ${targetLexvo}; source_partial until sense-matched.`,
        });
      }
    }
    return candidates.length < 5;
  }

  try {
    await streamTarBzipMemberLines(archivePath, "en/en_dbnary_ontolex_20251001.ttl.bz2", async (line) => {
      if (line.trim() === "") {
        const shouldContinue = processBlock(blockLines.join("\n"));
        blockLines = [];
        return shouldContinue;
      }
      blockLines.push(line);
      return true;
    });
    if (blockLines.length > 0) processBlock(blockLines.join("\n"));
  } catch {
    // Keep DBnary lookup fail-soft: DBnary archives are candidate evidence only.
  }

  context.dbnaryCache?.set(cacheKey, candidates);
  return candidates;
}

function kaikkiBatchCachePath(batchKey) {
  return path.join(projectRoot, "reference-sources/cache/kaikki", `batch_${batchKey}.json`);
}

async function readKaikkiBatchCache(batchKey, sources) {
  const cachePath = kaikkiBatchCachePath(batchKey);
  try {
    const sourceStats = await Promise.all(
      sources.map(async ([sourceId, localPath]) => {
        const rawStat = await stat(localPath);
        return { source_id: sourceId, raw_size: rawStat.size, raw_mtime_ms: rawStat.mtimeMs };
      })
    );
    const parsed = JSON.parse(await readFile(cachePath, "utf8"));
    if (parsed?.type !== "kaikki-batch-candidate-cache-v1") return null;
    if (parsed.batch_key !== batchKey) return null;
    if (JSON.stringify(parsed.source_stats ?? []) !== JSON.stringify(sourceStats)) return null;
    return new Map(Object.entries(parsed.candidates_by_key ?? {}));
  } catch {
    return null;
  }
}

async function writeKaikkiBatchCache(batchKey, sources, candidateMap) {
  const cachePath = kaikkiBatchCachePath(batchKey);
  try {
    const sourceStats = await Promise.all(
      sources.map(async ([sourceId, localPath]) => {
        const rawStat = await stat(localPath);
        return { source_id: sourceId, raw_size: rawStat.size, raw_mtime_ms: rawStat.mtimeMs };
      })
    );
    await mkdir(path.dirname(cachePath), { recursive: true });
    await writeFile(
      cachePath,
      JSON.stringify(
        {
          type: "kaikki-batch-candidate-cache-v1",
          generated_at: new Date().toISOString(),
          batch_key: batchKey,
          source_stats: sourceStats,
          candidates_by_key: Object.fromEntries(candidateMap.entries()),
        },
        null,
        2
      )
    );
  } catch {
    // Cache writes are best-effort. The batch lookup can still stream source files once.
  }
}

async function buildKaikkiBatchCandidateMap(rows, context) {
  if (!context.availability?.kaikki) return new Map();
  const maxLines = Number(process.env.KAIKKI_SOURCE_MAX_LINES ?? 100000);
  const termsBySource = new Map();
  const pathsBySource = new Map();

  for (const row of rows ?? []) {
    const languageCode = row.language_code ?? row.languageCode ?? "";
    if (languageCode === "EN" || languageCode === "EN-GB") continue;
    const sourceId = kaikkiSourceIdByLanguage.get(languageCode);
    const source = sourceId ? context.sourceById?.get(sourceId) : null;
    const localPath = source?.local_path ? path.resolve(projectRoot, source.local_path) : "";
    const canonicalEnglish = normalizeText(row.canonical_english ?? row.canonicalEnglish);
    const englishKey = normalizeComparable(canonicalEnglish);
    if (!sourceId || !localPath || !englishKey || !(await pathExists(localPath))) continue;
    if (!termsBySource.has(sourceId)) termsBySource.set(sourceId, new Map());
    if (!termsBySource.get(sourceId).has(englishKey)) termsBySource.get(sourceId).set(englishKey, canonicalEnglish);
    pathsBySource.set(sourceId, localPath);
  }

  const sources = [...pathsBySource.entries()].sort(([left], [right]) => left.localeCompare(right));
  if (sources.length === 0) return new Map();
  const batchKey = createHash("sha256")
    .update(
      [...termsBySource.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([sourceId, terms]) => `${sourceId}:${[...terms.keys()].sort().join(",")}`)
        .join("\n")
    )
    .update("\0")
    .update(String(maxLines))
    .digest("hex")
    .slice(0, 24);
  const cached = await readKaikkiBatchCache(batchKey, sources);
  if (cached) return cached;

  const candidatesByKey = new Map();
  for (const [sourceId, localPath] of sources) {
    const englishByKey = termsBySource.get(sourceId);
    const source = context.sourceById?.get(sourceId) ?? {};
    const supportingDbnarySourceId = [...dbnarySourceIdByLanguage.entries()].find(
      ([languageCode]) => kaikkiSourceIdByLanguage.get(languageCode) === sourceId
    )?.[1];
    const input = openMaybeGzip(localPath);
    const lineReader = readline.createInterface({ input, crlfDelay: Infinity });
    let scannedLines = 0;
    try {
      for await (const line of lineReader) {
        scannedLines += 1;
        if (scannedLines > maxLines) break;
        if (!line.trim()) continue;
        if (line.length > KAIKKI_MAX_ENTRY_BYTES) continue;
        let entry = null;
        try {
          entry = JSON.parse(line);
        } catch {
          continue;
        }
        if (!entry?.word) continue;
        for (const englishKey of entryMatchedCanonicalKeys(entry, englishByKey)) {
          const key = `${sourceId}::${englishKey}`;
          const value = normalizeText(entry.word);
          if (!value) continue;
          const candidates = candidatesByKey.get(key) ?? [];
          maybeAddCandidate(candidates, {
            source_id: sourceId,
            adapter: "kaikki",
            field: "native_word",
            value,
            confidence: "source_partial",
            source_ids: uniqueSourceIds([sourceId, supportingDbnarySourceId]),
            note: `Kaikki/Wiktionary candidate for English gloss "${englishByKey.get(englishKey)}" (${entry.pos ?? "unknown POS"}); ${source.local_path}. DBnary may provide separate parsed EN->target candidates when available.`,
            gloss: glossTextFromKaikkiEntry(entry).slice(0, 240),
          });
          if (candidates.length > 0) candidatesByKey.set(key, candidates);
        }
      }
    } finally {
      lineReader.close();
      input.destroy?.();
    }
  }

  await writeKaikkiBatchCache(batchKey, sources, candidatesByKey);
  return candidatesByKey;
}

async function loadKaikkiCandidates(row, context) {
  const languageCode = row.language_code ?? row.languageCode ?? "";
  if (languageCode === "EN" || languageCode === "EN-GB") return [];
  const sourceId = kaikkiSourceIdByLanguage.get(languageCode);
  const source = sourceId ? context.sourceById?.get(sourceId) : null;
  const localPath = source?.local_path ? path.resolve(projectRoot, source.local_path) : "";
  const canonicalEnglish = normalizeText(row.canonical_english ?? row.canonicalEnglish);
  if (!sourceId || !localPath || !canonicalEnglish) return [];

  const cacheKey = `${sourceId}::${normalizeComparable(canonicalEnglish)}`;
  if (context.kaikkiBatchCandidates) return context.kaikkiBatchCandidates.get(cacheKey) ?? [];
  if (context.kaikkiCache?.has(cacheKey)) return context.kaikkiCache.get(cacheKey);

  const candidates = [];
  const currentComparable = normalizeComparable(row.native_word ?? row.display_word ?? row.word_with_article_or_marker);
  if (!(await pathExists(localPath))) {
    context.kaikkiCache?.set(cacheKey, candidates);
    return candidates;
  }

  const lineReader = readline.createInterface({
    input: openMaybeGzip(localPath),
    crlfDelay: Infinity,
  });

  try {
    for await (const line of lineReader) {
      if (candidates.length >= 5) break;
      if (!line.trim()) continue;
      if (line.length > KAIKKI_MAX_ENTRY_BYTES) continue;
      let entry = null;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }
      if (!entry?.word || !entryMatchesCanonicalEnglish(entry, canonicalEnglish)) continue;
      const value = normalizeText(entry.word);
      if (!value || candidates.some((candidate) => normalizeComparable(candidate.value) === normalizeComparable(value))) {
        continue;
      }
      const supportingDbnarySourceId = dbnarySourceIdByLanguage.get(languageCode);
      const candidate = {
        source_id: sourceId,
        adapter: "kaikki",
        field: "native_word",
        value,
        confidence: "source_partial",
        source_ids: uniqueSourceIds([sourceId, supportingDbnarySourceId]),
        note: `Kaikki/Wiktionary candidate for English gloss "${canonicalEnglish}" (${entry.pos ?? "unknown POS"}); ${source.local_path}. DBnary may provide separate parsed EN->target candidates when available.`,
        gloss: glossTextFromKaikkiEntry(entry).slice(0, 240),
      };
      if (normalizeComparable(value) === currentComparable) candidates.unshift(candidate);
      else if (candidates.length < 5) candidates.push(candidate);
    }
  } finally {
    lineReader.close();
  }

  context.kaikkiCache?.set(cacheKey, candidates);
  return candidates;
}

async function lexicalSourceCandidates(row, context) {
  if (context.mode === "fixture") {
    if (!row.fixture_kaikki_match) return [];
    const languageCode = row.language_code ?? row.languageCode ?? "";
    const sourceId = row.fixture_kaikki_source_id ?? kaikkiSourceIdByLanguage.get(languageCode) ?? "kaikki-fixture";
    const candidates = [
      {
        source_id: sourceId,
        adapter: "kaikki",
        field: "native_word",
        value: normalizeText(row.fixture_kaikki_candidate ?? row.native_word ?? row.display_word),
        confidence: "source_partial",
        source_ids: uniqueSourceIds([sourceId, dbnarySourceIdByLanguage.get(languageCode)]),
        note: "Fixture Kaikki/DBnary lexical candidate; source output is not final truth.",
      },
    ].filter((candidate) => candidate.value);
    if (row.fixture_dbnary_match) {
      candidates.push({
        source_id: "dbnary-en-20251001",
        adapter: "dbnary",
        field: "native_word",
        value: normalizeText(row.fixture_dbnary_candidate ?? row.native_word ?? row.display_word),
        confidence: "source_partial",
        source_ids: uniqueSourceIds(["dbnary-en-20251001", dbnarySourceIdByLanguage.get(languageCode)]),
        note: "Fixture DBnary parsed translation candidate; source output is not final truth.",
      });
    }
    if (row.fixture_freedict_match) {
      candidates.push({
        source_id: "freedict-database-index",
        adapter: "freedict",
        field: "native_word",
        value: normalizeText(row.fixture_freedict_candidate ?? row.native_word ?? row.display_word),
        confidence: "source_partial",
        source_ids: ["freedict-database-index"],
        note: "Fixture FreeDict candidate; source output is not final truth.",
      });
    }
    return candidates;
  }

  const candidates = [];
  if (context.availability?.kaikki) {
    for (const candidate of await loadKaikkiCandidates(row, context)) {
      candidates.push(candidate);
    }
  }
  for (const candidate of await dbnaryTranslationCandidates(row, context)) {
    candidates.push(candidate);
  }
  return candidates;
}

export async function buildToolSourceCandidatesForRow(row, context) {
  const candidates = [];
  const findings = [];
  const progressPrefix = `[source-preflight] adapter.${row.language_code ?? row.languageCode}.${row.meaning_id ?? row.meaningId}`;
  async function timedAdapter(label, fn) {
    if (process.env.SOURCE_PREFLIGHT_PROGRESS === "1") console.error(`${progressPrefix}.${label}.start`);
    const startedAt = Date.now();
    try {
      return await fn();
    } finally {
      if (process.env.SOURCE_PREFLIGHT_PROGRESS === "1") {
        console.error(`${progressPrefix}.${label} ${Date.now() - startedAt}ms`);
      }
    }
  }

  const epitran = await timedAdapter("epitran", () => epitranCandidate(row, context));
  if (epitran && !epitran.warning) candidates.push(epitran);

  for (const finding of await timedAdapter("unimorph", () => unimorphFindings(row, context))) findings.push(finding);

  const officialDictionary = await timedAdapter("official_dictionary", () => officialDictionaryCandidate(row, context));
  if (officialDictionary) candidates.push(officialDictionary);

  for (const candidate of await timedAdapter("lexical_sources", () => lexicalSourceCandidates(row, context))) candidates.push(candidate);

  const apertium = await timedAdapter("apertium", () => apertiumCandidate(row, context));
  if (apertium) candidates.push(apertium);

  const freedict = await timedAdapter("freedict", () => freeDictCandidate(row, context));
  if (freedict) candidates.push(freedict);

  const mtSanity = await timedAdapter("mt_sanity", () => mtSanityCandidate(row, context));
  if (mtSanity) candidates.push(mtSanity);

  const dakshina = await timedAdapter("dakshina", () => dakshinaTransliterationCandidate(row, context));
  if (dakshina) candidates.push(dakshina);

  return { candidates, findings };
}

export function candidateDiffersFromCurrent(candidate, row) {
  if (!candidate?.value) return false;
  const current =
    candidate.field === "transcription"
      ? row.transcription
      : candidate.field === "native_word"
        ? row.native_word
        : row[candidate.field];
  return normalizeComparable(candidate.value) !== normalizeComparable(current);
}
