import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const RELEASE_ID = "hsk3_level_6_1400_v1";
const DATE = "20260608";
const SAMPLE_PER_LANGUAGE = 5;
const CSV_PATH = path.join(ROOT, "outputs/hsk/hsk3_level_6_1400_v1.csv");
const LANGUAGES_PATH = path.join(ROOT, "config/language-order.json");
const REPORT_JSON = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_native_style_sample_5_per_language_${DATE}.json`);
const REPORT_CSV = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_native_style_sample_5_per_language_${DATE}.csv`);
const REPORT_MD = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_native_style_sample_5_per_language_${DATE}.md`);

const forcedReviewKeys = new Set(["4341:局1", "4342:局2", "4450:料1", "4451:料2", "4461:露", "4463:露1", "4726:散", "4728:散"]);
const artifactRegex =
  /(?:^|[\s,;:()[\]{}"'“”¿?¡!])(?:TODO|TBD|FIXME|todo:|tbd|fixme|null|Null|NULL|undefined|Undefined|UNDEFINED|translation|Translation|example|Example)(?:$|[\s,;:()[\]{}"'“”¿?¡!])|[?？]{3,}|…{2,}/u;
const hanRegex = /\p{Script=Han}/u;

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (quoted && char === "\"" && next === "\"") {
      value += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function parseCsv(text) {
  const lines = text.trimEnd().split(/\r?\n/u);
  const headers = parseCsvLine(lines[0] ?? "");
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/u.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function normalizedText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("en-US");
}

function hashScore(seed) {
  return crypto.createHash("sha256").update(seed).digest("hex");
}

function chooseSample(rows, code, count) {
  return [...rows]
    .sort((a, b) => hashScore(`${RELEASE_ID}:native-style:${code}:${a.hsk_key}`).localeCompare(hashScore(`${RELEASE_ID}:native-style:${code}:${b.hsk_key}`)))
    .slice(0, count)
    .sort((a, b) => Number(a.hsk_order) - Number(b.hsk_order));
}

function addIssue(list, severity, code, message, data = {}) {
  list.push({ severity, code, message, ...data });
}

function checkNativeStyleCell({ row, language, issues }) {
  const code = language.spreadsheetCode;
  const order = Number(row.hsk_order);
  const context = { row: order, hsk_key: row.hsk_key, word: row.simplified, language_code: code };
  const target = row[code] ?? "";
  const exampleTarget = row[`example_${code}`] ?? "";
  const exampleEn = row.example_EN ?? "";

  if (!target) addIssue(issues, "blocker", "native_sample_blank_translation", "Target translation is blank.", context);
  if (!exampleTarget) addIssue(issues, "blocker", "native_sample_blank_example", "Target example translation is blank.", context);
  if (artifactRegex.test(target)) addIssue(issues, "blocker", "native_sample_translation_artifact", "Target translation contains placeholder/artifact text.", { ...context, target });
  if (artifactRegex.test(exampleTarget)) addIssue(issues, "blocker", "native_sample_example_artifact", "Target example contains placeholder/artifact text.", { ...context, exampleTarget });
  if (normalizedText(exampleTarget) === normalizedText(row.example_zh)) {
    addIssue(issues, "blocker", "native_sample_exact_chinese_copy", "Target example is an exact copy of the Chinese example.", context);
  }
  if (!["EN", "EN-GB"].includes(code) && normalizedText(exampleTarget) === normalizedText(exampleEn)) {
    addIssue(issues, "blocker", "native_sample_exact_english_fallback", "Non-English target example is an exact English fallback.", context);
  }
  if (!["JA", "KO"].includes(code) && hanRegex.test(exampleTarget)) {
    addIssue(issues, "warning", "native_sample_unexpected_han", "Target example contains Han outside CJK target languages.", {
      ...context,
      exampleTarget,
    });
  }

  }

const [csvText, languageRows] = await Promise.all([
  fs.readFile(CSV_PATH, "utf8"),
  fs.readFile(LANGUAGES_PATH, "utf8").then(JSON.parse),
]);
const rows = parseCsv(csvText);
const languages = languageRows.filter((language) => language.spreadsheetCode !== "ZH");
const issues = [];
const sampled = [];
const seen = new Set();

for (const language of languages) {
  const code = language.spreadsheetCode;
  const eligible = rows.filter((row) => row[code] && row[`example_${code}`]);
  for (const row of chooseSample(eligible, code, SAMPLE_PER_LANGUAGE)) {
    const key = `${code}:${row.hsk_key}`;
    seen.add(key);
    checkNativeStyleCell({ row, language, issues });
    sampled.push({ sample_type: "hash_sample", language_code: code, language: language.language, hsk_key: row.hsk_key, hsk_order: Number(row.hsk_order), source_word: row.simplified, target_translation: row[code], target_example_translation: row[`example_${code}`] });
  }
}

for (const row of rows.filter((candidate) => forcedReviewKeys.has(candidate.hsk_key))) {
  for (const language of languages) {
    const code = language.spreadsheetCode;
    const key = `${code}:${row.hsk_key}`;
    if (!seen.has(key)) {
      checkNativeStyleCell({ row, language, issues });
      sampled.push({ sample_type: "forced_high_risk", language_code: code, language: language.language, hsk_key: row.hsk_key, hsk_order: Number(row.hsk_order), source_word: row.simplified, target_translation: row[code], target_example_translation: row[`example_${code}`] });
    }
  }
}

const blockers = issues.filter((issue) => issue.severity === "blocker");
const warnings = issues.filter((issue) => issue.severity === "warning");
const report = {
  release_id: RELEASE_ID,
  generated_at: new Date().toISOString(),
  status: blockers.length ? "blocked" : "ok",
  sample_policy: {
    sample_per_language: SAMPLE_PER_LANGUAGE,
    target_languages_checked: languages.length,
    hash_sample_rows: languages.length * SAMPLE_PER_LANGUAGE,
    forced_high_risk_keys: [...forcedReviewKeys],
    rows_checked_total: sampled.length,
    scope: "Deterministic native-style sample: five target examples per language plus forced high-risk HSK3 rows. This is not live native-speaker certification.",
  },
  blockers,
  warnings,
  samples: sampled,
  notes: [
    "The gate is intentionally high-signal and reproducible.",
    "It blocks blanks, artifacts, exact Chinese copies, exact English fallback examples, and known confirmed unnatural target-language patterns.",
    "Level 6 forces disambiguated duplicate/source-homonym rows 4341:局1, 4342:局2, 4450:料1, 4451:料2, 4461:露, 4463:露1, 4726:散 and 4728:散 through all target languages in addition to the hash sample.",
  ],
};

await fs.mkdir(path.dirname(REPORT_JSON), { recursive: true });
await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);

const sampleHeaders = ["sample_type", "language_code", "language", "hsk_key", "hsk_order", "source_word", "target_translation", "target_example_translation"];
await fs.writeFile(
  REPORT_CSV,
  [sampleHeaders.join(","), ...sampled.map((row) => sampleHeaders.map((header) => csvEscape(row[header])).join(","))].join("\n") + "\n"
);

await fs.writeFile(
  REPORT_MD,
  [
    `# ${RELEASE_ID} Native-Style Sample Audit`,
    "",
    `Status: ${report.status}`,
    `Target languages checked: ${languages.length}`,
    `Hash sample rows: ${report.sample_policy.hash_sample_rows}`,
    `Forced high-risk keys: ${report.sample_policy.forced_high_risk_keys.join(", ")}`,
    `Rows checked total: ${sampled.length}`,
    `Blockers: ${blockers.length}`,
    `Warnings: ${warnings.length}`,
    "",
    "This is deterministic native-style QA, not live native-speaker certification.",
    "",
    "## Findings",
    "",
    blockers.length ? blockers.map((issue) => `- BLOCKER ${issue.code}${issue.row ? ` row ${issue.row}` : ""}: ${issue.message}`).join("\n") : "- No blockers.",
    "",
    warnings.length ? warnings.map((issue) => `- WARNING ${issue.code}${issue.row ? ` row ${issue.row}` : ""}: ${issue.message}`).join("\n") : "- No warnings.",
    "",
  ].join("\n")
);

console.log(
  JSON.stringify(
    {
      release_id: RELEASE_ID,
      status: report.status,
      target_languages_checked: languages.length,
      hash_sample_rows: report.sample_policy.hash_sample_rows,
      rows_checked_total: sampled.length,
      blockers: blockers.length,
      warnings: warnings.length,
      report: path.relative(ROOT, REPORT_JSON),
      csv: path.relative(ROOT, REPORT_CSV),
      markdown: path.relative(ROOT, REPORT_MD),
    },
    null,
    2
  )
);

if (blockers.length) process.exitCode = 1;
