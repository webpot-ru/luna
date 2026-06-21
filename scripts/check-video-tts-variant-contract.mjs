#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { defaultVoiceMap, getVoiceForLanguage } from "./lib/tts-voice-map.mjs";
import {
  getDbLanguageCode,
  getSpreadsheetLanguageCode,
  isKnownLanguageCode,
  normalizeLanguageCode,
} from "./lib/video-language-codes.mjs";
import { getPublicCourseUrl, getPublicSiteLanguagePath } from "./lib/video-public-url.mjs";

const execFileAsync = promisify(execFile);

const DEFAULT_DATABASE_URL = "postgresql://lunacards:lunacards@127.0.0.1:55433/lunacards";

const options = {
  setId: "",
  supportLang: "RU",
  targetLangs: [],
  metadataInputs: [],
  output: "",
  sampleSize: 20,
  strictWarnings: false,
  skipCardReadback: false,
};

function usage() {
  return [
    "Usage:",
    "  node scripts/check-video-tts-variant-contract.mjs --set <set_id> --support <code> --target <code[,code...]> [--output report.json]",
    "  node scripts/check-video-tts-variant-contract.mjs --metadata <youtube_metadata.json-or-dir> [--output report.json]",
    "",
    "Options:",
    "  --sample-size <n>        Number of deck rows to inspect per pair; default 20.",
    "  --skip-card-readback     Check only language-code, voice and URL contracts.",
    "  --strict-warnings        Treat warnings as failure.",
  ].join("\n");
}

function takeArg(args, index) {
  if (index + 1 >= args.length) throw new Error(`Missing value for ${args[index]}`);
  return args[index + 1];
}

function splitCodes(value) {
  return String(value || "")
    .split(",")
    .map((part) => normalizeLanguageCode(part))
    .filter(Boolean);
}

function parseArgs() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--set") {
      options.setId = takeArg(args, i);
      i += 1;
    } else if (arg.startsWith("--set=")) {
      options.setId = arg.slice("--set=".length);
    } else if (arg === "--support") {
      options.supportLang = normalizeLanguageCode(takeArg(args, i));
      i += 1;
    } else if (arg.startsWith("--support=")) {
      options.supportLang = normalizeLanguageCode(arg.slice("--support=".length));
    } else if (arg === "--target" || arg === "--targets") {
      options.targetLangs.push(...splitCodes(takeArg(args, i)));
      i += 1;
    } else if (arg.startsWith("--target=")) {
      options.targetLangs.push(...splitCodes(arg.slice("--target=".length)));
    } else if (arg.startsWith("--targets=")) {
      options.targetLangs.push(...splitCodes(arg.slice("--targets=".length)));
    } else if (arg === "--metadata") {
      options.metadataInputs.push(takeArg(args, i));
      i += 1;
    } else if (arg.startsWith("--metadata=")) {
      options.metadataInputs.push(arg.slice("--metadata=".length));
    } else if (arg === "--output") {
      options.output = takeArg(args, i);
      i += 1;
    } else if (arg.startsWith("--output=")) {
      options.output = arg.slice("--output=".length);
    } else if (arg === "--sample-size") {
      options.sampleSize = Number(takeArg(args, i));
      i += 1;
    } else if (arg.startsWith("--sample-size=")) {
      options.sampleSize = Number(arg.slice("--sample-size=".length));
    } else if (arg === "--strict-warnings") {
      options.strictWarnings = true;
    } else if (arg === "--skip-card-readback") {
      options.skipCardReadback = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    } else if (arg) {
      options.metadataInputs.push(arg);
    }
  }

  if (!Number.isFinite(options.sampleSize) || options.sampleSize < 1) {
    throw new Error("--sample-size must be a positive number.");
  }
  options.sampleSize = Math.min(100, Math.floor(options.sampleSize));
}

function loadEnvFile() {
  const envPath = path.resolve(".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

function sqlString(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

async function psqlJson(sql) {
  const databaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  const { stdout } = await execFileAsync(
    "psql",
    [databaseUrl, "-v", "ON_ERROR_STOP=1", "-tA", "-c", sql],
    { maxBuffer: 1024 * 1024 * 20 }
  );
  return JSON.parse(stdout.trim() || "[]");
}

function collectMetadataFiles(inputs) {
  const files = [];
  for (const input of inputs) {
    const resolved = path.resolve(input);
    if (!fs.existsSync(resolved)) throw new Error(`Path not found: ${input}`);
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(resolved, { withFileTypes: true })) {
        const full = path.join(resolved, entry.name);
        if (entry.isDirectory()) files.push(...collectMetadataFiles([full]));
        else if (entry.isFile() && entry.name.endsWith("youtube_metadata.json")) files.push(full);
      }
    } else {
      files.push(resolved);
    }
  }
  return files.sort();
}

function makePairKey(pair) {
  return `${pair.setId}::${pair.supportLang}::${pair.targetLang}`;
}

function collectPairs() {
  const pairs = [];

  for (const file of collectMetadataFiles(options.metadataInputs)) {
    const metadata = JSON.parse(fs.readFileSync(file, "utf8"));
    pairs.push({
      source: file,
      setId: metadata.setId || options.setId,
      supportLang: normalizeLanguageCode(metadata.supportLang || options.supportLang),
      targetLang: normalizeLanguageCode(metadata.targetLang),
    });
  }

  for (const targetLang of options.targetLangs) {
    pairs.push({
      source: "cli",
      setId: options.setId,
      supportLang: normalizeLanguageCode(options.supportLang),
      targetLang: normalizeLanguageCode(targetLang),
    });
  }

  const unique = new Map();
  for (const pair of pairs) {
    if (!pair.setId || !pair.supportLang || !pair.targetLang) {
      throw new Error(`Incomplete check pair: ${JSON.stringify(pair)}`);
    }
    unique.set(makePairKey(pair), pair);
  }
  return [...unique.values()];
}

function readOfflineDeckData(setId) {
  const jsonPath = path.resolve(`data/decks/${setId}.json`);
  if (!fs.existsSync(jsonPath)) return null;
  return {
    path: jsonPath,
    data: JSON.parse(fs.readFileSync(jsonPath, "utf8")),
  };
}

async function fetchSampleCards({ setId, targetLang, supportLang }) {
  const targetDbLang = getDbLanguageCode(targetLang);
  const supportDbLang = getDbLanguageCode(supportLang);
  const offline = readOfflineDeckData(setId);
  if (offline) {
    const exact = offline.data.cards?.[supportLang]?.[targetLang];
    const dbMapped = offline.data.cards?.[supportDbLang]?.[targetDbLang];
    const cards = exact || dbMapped;
    if (cards) {
      return {
        source: exact ? "offline-exact" : "offline-db-mapped",
        sourcePath: offline.path,
        dataTargetLang: targetDbLang,
        dataSupportLang: supportDbLang,
        cards: cards.slice(0, options.sampleSize),
        availableCards: cards.length,
      };
    }
  }

  const sql = `
    select coalesce(json_agg(row_to_json(rows)), '[]'::json) from (
      with deck_examples as (
        select distinct on (meaning_id)
          example_id,
          meaning_id,
          canonical_example_en,
          example_role
        from meaning_examples
        where set_id = ${sqlString(setId)} or example_role = 'base'
        order by meaning_id, case when set_id = ${sqlString(setId)} then 1 else 2 end
      )
      select
        msm.meaning_id,
        msm.display_order,
        mu.canonical_english,
        coalesce(le_target.word_with_article_or_marker, le_target.native_word) as target_display,
        le_target.transcription as target_transcription,
        coalesce(le_support.word_with_article_or_marker, le_support.native_word) as support_display,
        ex_target.example_text as target_example,
        ex_support.example_text as support_example
      from meaning_set_memberships msm
      join meaning_units mu on mu.meaning_id = msm.meaning_id
      left join meaning_language_entries le_target
        on le_target.meaning_id = msm.meaning_id
        and le_target.language_code = ${sqlString(targetDbLang)}
      left join meaning_language_entries le_support
        on le_support.meaning_id = msm.meaning_id
        and le_support.language_code = ${sqlString(supportDbLang)}
      left join deck_examples ex on ex.meaning_id = msm.meaning_id
      left join meaning_example_translations ex_target
        on ex_target.example_id = ex.example_id
        and ex_target.language_code = ${sqlString(targetDbLang)}
      left join meaning_example_translations ex_support
        on ex_support.example_id = ex.example_id
        and ex_support.language_code = ${sqlString(supportDbLang)}
      where msm.set_id = ${sqlString(setId)}
      order by msm.display_order, msm.meaning_id
      limit ${options.sampleSize}
    ) rows;
  `;
  return {
    source: "postgres",
    sourcePath: "",
    dataTargetLang: targetDbLang,
    dataSupportLang: supportDbLang,
    cards: await psqlJson(sql),
    availableCards: null,
  };
}

const SCRIPT_RE = {
  Latin: /\p{Script=Latin}/u,
  Cyrillic: /\p{Script=Cyrillic}/u,
  Han: /\p{Script=Han}/u,
  Hiragana: /\p{Script=Hiragana}/u,
  Katakana: /\p{Script=Katakana}/u,
  Hangul: /\p{Script=Hangul}/u,
  Thai: /\p{Script=Thai}/u,
  Lao: /\p{Script=Lao}/u,
  Khmer: /\p{Script=Khmer}/u,
  Myanmar: /\p{Script=Myanmar}/u,
  Georgian: /\p{Script=Georgian}/u,
  Armenian: /\p{Script=Armenian}/u,
  Devanagari: /\p{Script=Devanagari}/u,
  Bengali: /\p{Script=Bengali}/u,
  Sinhala: /\p{Script=Sinhala}/u,
  Tamil: /\p{Script=Tamil}/u,
  Telugu: /\p{Script=Telugu}/u,
  Kannada: /\p{Script=Kannada}/u,
  Malayalam: /\p{Script=Malayalam}/u,
  Japanese: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u,
};

const LETTER_RE = /\p{L}/u;

const LATIN_LANGUAGE_CODES = new Set([
  "EN", "EN-GB", "ES", "ES-419", "FR", "DE", "IT", "PT", "PT-BR", "VI",
  "TR", "ID", "MS", "PL", "NL", "SV", "NO", "NB", "DA", "FI", "CS", "SK",
  "HU", "RO", "HR", "SR", "SL", "LT", "LV", "ET", "IS", "TL", "UZ", "AZ",
  "SW",
]);

const REQUIRED_SCRIPT_BY_CODE = {
  RU: "Cyrillic",
  BG: "Cyrillic",
  KK: "Cyrillic",
  ZH: "Han",
  JA: "Japanese",
  KO: "Hangul",
  TH: "Thai",
  LO: "Lao",
  KM: "Khmer",
  MY: "Myanmar",
  KA: "Georgian",
  HY: "Armenian",
  HI: "Devanagari",
  NE: "Devanagari",
  BN: "Bengali",
  SI: "Sinhala",
  TA: "Tamil",
  TE: "Telugu",
  KN: "Kannada",
  ML: "Malayalam",
};

const NON_LATIN_SCRIPT_CHECKS = [
  ["Cyrillic", SCRIPT_RE.Cyrillic],
  ["Han", SCRIPT_RE.Han],
  ["Hiragana", SCRIPT_RE.Hiragana],
  ["Katakana", SCRIPT_RE.Katakana],
  ["Hangul", SCRIPT_RE.Hangul],
  ["Thai", SCRIPT_RE.Thai],
  ["Lao", SCRIPT_RE.Lao],
  ["Khmer", SCRIPT_RE.Khmer],
  ["Myanmar", SCRIPT_RE.Myanmar],
  ["Georgian", SCRIPT_RE.Georgian],
  ["Armenian", SCRIPT_RE.Armenian],
  ["Devanagari", SCRIPT_RE.Devanagari],
  ["Bengali", SCRIPT_RE.Bengali],
  ["Sinhala", SCRIPT_RE.Sinhala],
  ["Tamil", SCRIPT_RE.Tamil],
  ["Telugu", SCRIPT_RE.Telugu],
  ["Kannada", SCRIPT_RE.Kannada],
  ["Malayalam", SCRIPT_RE.Malayalam],
];

const WARNING_PATTERNS = {
  NO: [
    [/(\b|^)(ikkje|eg|kva|frå|vere|vert|meir|noko|nokre|dykk|deira)(\b|$)/iu, "possible Nynorsk marker in Bokmal/Norwegian Bokmal text"],
  ],
  NB: [
    [/(\b|^)(ikkje|eg|kva|frå|vere|vert|meir|noko|nokre|dykk|deira)(\b|$)/iu, "possible Nynorsk marker in Bokmal/Norwegian Bokmal text"],
  ],
  "EN-GB": [
    [/\bfaucets?\b/iu, "US English word in British English risk list: faucet"],
    [/\btrash (can|bag)\b/iu, "US English trash term in British English risk list"],
    [/\bgarbage (can|bag)\b/iu, "US English garbage term in British English risk list"],
    [/\belevators?\b/iu, "US English word in British English risk list: elevator"],
    [/\bsidewalks?\b/iu, "US English word in British English risk list: sidewalk"],
    [/\bapartments?\b/iu, "US English word in British English risk list: apartment"],
  ],
  EN: [
    [/\brubbish\b/iu, "British English word in US English risk list: rubbish"],
    [/\blifts?\b/iu, "British English word in US English risk list: lift"],
    [/\bflats?\b/iu, "British English word in US English risk list: flat"],
  ],
  "ES-419": [
    [/\bvosotros\b/iu, "Spain Spanish pronoun in Latin American Spanish risk list: vosotros"],
    [/\bzumo\b/iu, "Spain Spanish word in Latin American Spanish risk list: zumo"],
    [/\bordenador(?:es)?\b/iu, "Spain Spanish word in Latin American Spanish risk list: ordenador"],
    [/\bgrifo\b/iu, "Spain Spanish word in Latin American Spanish risk list: grifo"],
  ],
  ES: [
    [/\bcomputadora(?:s)?\b/iu, "Latin American Spanish word in Spain Spanish risk list: computadora"],
    [/\bcelular(?:es)?\b/iu, "Latin American Spanish word in Spain Spanish risk list: celular"],
  ],
  "PT-BR": [
    [/\btelem[oó]vel(?:es)?\b/iu, "European Portuguese word in Brazilian Portuguese risk list: telemovel"],
    [/\bautocarro(?:s)?\b/iu, "European Portuguese word in Brazilian Portuguese risk list: autocarro"],
    [/\bcasa de banho\b/iu, "European Portuguese phrase in Brazilian Portuguese risk list: casa de banho"],
    [/\bpequeno[- ]almo[cç]o\b/iu, "European Portuguese phrase in Brazilian Portuguese risk list: pequeno-almoco"],
    [/\bfrigor[ií]fico(?:s)?\b/iu, "European Portuguese word in Brazilian Portuguese risk list: frigorifico"],
  ],
  PT: [
    [/\b[oô]nibus\b/iu, "Brazilian Portuguese word in European Portuguese risk list: onibus"],
    [/\bgeladeira(?:s)?\b/iu, "Brazilian Portuguese word in European Portuguese risk list: geladeira"],
    [/\bbanheiro(?:s)?\b/iu, "Brazilian Portuguese word in European Portuguese risk list: banheiro"],
    [/\bcaf[eé] da manh[ãa]\b/iu, "Brazilian Portuguese phrase in European Portuguese risk list: cafe da manha"],
    [/\bcelular(?:es)?\b/iu, "Brazilian Portuguese word in European Portuguese risk list: celular"],
  ],
};

function hasNonLatinScript(text) {
  return NON_LATIN_SCRIPT_CHECKS.find(([, regex]) => regex.test(text));
}

function checkScriptContract({ code, text, context }) {
  const blockers = [];
  const warnings = [];
  const value = String(text || "").trim();
  if (!value) return { blockers, warnings };

  const spreadsheetCode = getSpreadsheetLanguageCode(code);
  const dbCode = getDbLanguageCode(code);
  const codeKeys = [...new Set([spreadsheetCode, dbCode, normalizeLanguageCode(code)])];
  const expectedScript = codeKeys.map((key) => REQUIRED_SCRIPT_BY_CODE[key]).find(Boolean);
  const hasLetters = LETTER_RE.test(value);

  if (expectedScript && hasLetters && !SCRIPT_RE[expectedScript].test(value)) {
    blockers.push(`${context}: expected ${expectedScript} text for ${spreadsheetCode}/${dbCode}, got "${value}"`);
  }

  if (!expectedScript && codeKeys.some((key) => LATIN_LANGUAGE_CODES.has(key)) && hasLetters) {
    const nonLatin = hasNonLatinScript(value);
    if (nonLatin) {
      blockers.push(`${context}: expected Latin-script text for ${spreadsheetCode}/${dbCode}, found ${nonLatin[0]} in "${value}"`);
    }
  }

  if (codeKeys.includes("SR") && SCRIPT_RE.Cyrillic.test(value)) {
    blockers.push(`${context}: ordinary SR must be Serbian Latin Gaj; Cyrillic found in "${value}"`);
  }

  for (const key of codeKeys) {
    for (const [regex, message] of WARNING_PATTERNS[key] || []) {
      if (regex.test(value)) warnings.push(`${context}: ${message}: "${value}"`);
    }
  }

  return { blockers, warnings };
}

function checkVoiceContract(code, role) {
  const normalized = normalizeLanguageCode(code);
  const dbCode = getDbLanguageCode(normalized);
  const spreadsheetCode = getSpreadsheetLanguageCode(normalized);
  const voiceLookupCode = defaultVoiceMap[normalized] ? normalized : defaultVoiceMap[spreadsheetCode] ? spreadsheetCode : dbCode;
  const voice = getVoiceForLanguage(voiceLookupCode);
  const expectedVoice = defaultVoiceMap[voiceLookupCode];
  const blockers = [];
  const warnings = [];

  if (!isKnownLanguageCode(normalized) && !defaultVoiceMap[normalized]) {
    blockers.push(`${role}: unknown language code ${normalized}`);
  }
  if (!expectedVoice) {
    blockers.push(`${role}: no explicit TTS voice configured for ${normalized}; fallback would be ${voice}`);
  } else if (voice !== expectedVoice) {
    blockers.push(`${role}: voice mismatch for ${normalized}: ${voice} != ${expectedVoice}`);
  }

  return {
    blockers,
    warnings,
    details: {
      inputCode: normalized,
      spreadsheetCode,
      dbCode,
      voiceLookupCode,
      voice,
      expectedVoice: expectedVoice || "",
    },
  };
}

function checkUrlContract({ setId, supportLang, targetLang }) {
  const blockers = [];
  const warnings = [];
  const courseUrl = getPublicCourseUrl({ setId, supportLang, targetLang });
  const expectedSupportPath = getPublicSiteLanguagePath(supportLang);
  let actualSupportPath = "";
  let targetParam = "";

  try {
    const parsed = new URL(courseUrl);
    actualSupportPath = parsed.pathname.split("/").filter(Boolean)[0] || "";
    targetParam = parsed.searchParams.get("langs") || "";
  } catch (error) {
    blockers.push(`courseUrl is not a valid URL: ${courseUrl}`);
  }

  if (actualSupportPath && actualSupportPath !== expectedSupportPath) {
    blockers.push(`support site path mismatch: /${actualSupportPath} != /${expectedSupportPath}`);
  }

  const supportCode = normalizeLanguageCode(supportLang);
  const forbiddenRegionalPaths = {
    "EN-GB": ["en-gb", "gb", "uk", "us"],
    "ES-419": ["es-419", "mx", "latam"],
    "PT-BR": ["pt-br", "br"],
    NB: ["nb"],
  };
  for (const [code, forbidden] of Object.entries(forbiddenRegionalPaths)) {
    if (supportCode === code && forbidden.includes(actualSupportPath)) {
      blockers.push(`support site path must be collapsed for ${code}; got /${actualSupportPath}`);
    }
  }

  const expectedTargetParam = normalizeLanguageCode(targetLang).toLowerCase();
  if (!targetParam) {
    blockers.push(`courseUrl missing target study query parameter ?langs=${expectedTargetParam}; set may be missing publishedCourseSlugBySetId`);
  } else if (targetParam !== expectedTargetParam) {
    blockers.push(`target study query mismatch: langs=${targetParam} != ${expectedTargetParam}`);
  }

  return {
    blockers,
    warnings,
    details: {
      courseUrl,
      expectedSupportPath,
      actualSupportPath,
      expectedTargetParam,
      targetParam,
    },
  };
}

function pushChecks(target, check) {
  target.blockers.push(...check.blockers);
  target.warnings.push(...check.warnings);
}

async function validatePair(pair) {
  const result = {
    source: pair.source,
    setId: pair.setId,
    supportLang: normalizeLanguageCode(pair.supportLang),
    targetLang: normalizeLanguageCode(pair.targetLang),
    status: "pass",
    blockers: [],
    warnings: [],
    voice: {},
    url: {},
    cardReadback: null,
  };

  const targetVoice = checkVoiceContract(result.targetLang, "target");
  const supportVoice = checkVoiceContract(result.supportLang, "support");
  pushChecks(result, targetVoice);
  pushChecks(result, supportVoice);
  result.voice = {
    target: targetVoice.details,
    support: supportVoice.details,
  };

  const urlCheck = checkUrlContract(result);
  pushChecks(result, urlCheck);
  result.url = urlCheck.details;

  if (!options.skipCardReadback) {
    try {
      const readback = await fetchSampleCards(result);
      result.cardReadback = {
        source: readback.source,
        sourcePath: readback.sourcePath,
        dataTargetLang: readback.dataTargetLang,
        dataSupportLang: readback.dataSupportLang,
        checkedCards: readback.cards.length,
        availableCards: readback.availableCards,
        samples: readback.cards.map((card) => ({
          display_order: card.display_order,
          meaning_id: card.meaning_id,
          target_display: card.target_display || "",
          support_display: card.support_display || "",
        })),
      };

      if (readback.cards.length === 0) {
        result.blockers.push(`no cards found for set=${result.setId} target=${readback.dataTargetLang} support=${readback.dataSupportLang}`);
      }

      for (const card of readback.cards) {
        const rowLabel = `row ${card.display_order ?? "?"} ${card.meaning_id || ""}`.trim();
        if (!String(card.target_display || "").trim()) {
          result.blockers.push(`${rowLabel}: missing target_display for ${readback.dataTargetLang}`);
        }
        if (!String(card.support_display || "").trim()) {
          result.blockers.push(`${rowLabel}: missing support_display for ${readback.dataSupportLang}`);
        }
        for (const [field, code] of [
          ["target_display", readback.dataTargetLang],
          ["target_example", readback.dataTargetLang],
          ["support_display", readback.dataSupportLang],
          ["support_example", readback.dataSupportLang],
        ]) {
          const scriptCheck = checkScriptContract({
            code,
            text: card[field],
            context: `${rowLabel} ${field}`,
          });
          pushChecks(result, scriptCheck);
        }
      }
    } catch (error) {
      result.blockers.push(`card readback failed: ${error.message}`);
    }
  }

  result.status = result.blockers.length || (options.strictWarnings && result.warnings.length) ? "fail" : "pass";
  return result;
}

async function main() {
  parseArgs();
  loadEnvFile();
  const pairs = collectPairs();
  if (pairs.length === 0) throw new Error(`${usage()}\n\nNo check pairs were provided.`);

  const results = [];
  for (const pair of pairs) {
    results.push(await validatePair(pair));
  }

  const blockerCount = results.reduce((sum, result) => sum + result.blockers.length, 0);
  const warningCount = results.reduce((sum, result) => sum + result.warnings.length, 0);
  const report = {
    status: blockerCount || (options.strictWarnings && warningCount) ? "fail" : "pass",
    checkedAt: new Date().toISOString(),
    summary: {
      pairCount: results.length,
      blockerCount,
      warningCount,
      strictWarnings: options.strictWarnings,
      skipCardReadback: options.skipCardReadback,
      sampleSize: options.sampleSize,
    },
    results,
  };

  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (options.output) {
    fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
    fs.writeFileSync(options.output, json, "utf8");
  }
  console.log(json);
  if (report.status === "fail") process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
