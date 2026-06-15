import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const RELEASE_ID = "hsk3_level_2_200_v1";
const DATE = "20260604";
const SAMPLE_PER_LANGUAGE = 10;
const CSV_PATH = path.join(ROOT, "outputs/hsk/hsk3_level_2_200_v1.csv");
const LANGUAGES_PATH = path.join(ROOT, "config/language-order.json");
const REPORT_JSON = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_sample_10_per_language_quality_${DATE}.json`);
const REPORT_CSV = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_sample_10_per_language_quality_${DATE}.csv`);
const REPORT_MD = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_sample_10_per_language_quality_${DATE}.md`);

const toneMarkRegex = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ]/iu;
const toneNumberRegex = /(?:[A-Za-züÜv:]+[1-5]\b|\b[1-5]\s*$)/u;
const hanRegex = /\p{Script=Han}/u;
const latinRegex = /[A-Za-züÜ]/u;
const artifactRegex = /\b(?:todo|tbd|fixme|null|undefined|translation|example)\b|[?？]{3,}|…{2,}/iu;

const acceptedNeutralSourcePinyin = new Map([
  ["啊", "a"],
  ["得", "de"],
  ["地", "de"],
  ["过", "guo"],
  ["着", "zhe"],
]);

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (quoted && char === '"' && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
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
    .sort((a, b) => hashScore(`${RELEASE_ID}:${code}:${a.hsk_order}`).localeCompare(hashScore(`${RELEASE_ID}:${code}:${b.hsk_order}`)))
    .slice(0, count)
    .sort((a, b) => Number(a.hsk_order) - Number(b.hsk_order));
}

function addIssue(list, severity, code, message, data = {}) {
  list.push({ severity, code, message, ...data });
}

function checkChineseRow(row, issues) {
  const order = Number(row.hsk_order);
  const word = row.simplified;
  for (const [field, value] of [
    ["pinyin", row.pinyin],
    ["example_pinyin", row.example_pinyin],
  ]) {
    if (!value) addIssue(issues, "blocker", "missing_chinese_pinyin", `${field} is blank`, { row: order, word, field });
    if (hanRegex.test(value)) addIssue(issues, "blocker", "han_in_chinese_pinyin", `${field} contains Han characters`, { row: order, word, field, value });
    if (!latinRegex.test(value)) addIssue(issues, "blocker", "no_latin_in_chinese_pinyin", `${field} has no Latin pinyin`, { row: order, word, field, value });
    if (toneNumberRegex.test(value)) addIssue(issues, "blocker", "tone_number_chinese_pinyin", `${field} uses tone-number notation`, { row: order, word, field, value });
  }

  if (!toneMarkRegex.test(row.pinyin) && acceptedNeutralSourcePinyin.get(word) !== row.pinyin) {
    addIssue(issues, "warning", "source_pinyin_no_tone_mark", "Source pinyin has no tone mark and is not an accepted neutral/source form.", {
      row: order,
      word,
      pinyin: row.pinyin,
    });
  }
  if (!toneMarkRegex.test(row.example_pinyin)) {
    addIssue(issues, "blocker", "example_pinyin_no_tone_marks", "Example pinyin has no tone marks at all.", {
      row: order,
      word,
      example_pinyin: row.example_pinyin,
    });
  }
}

function checkSampleCell(row, language, issues) {
  const code = language.spreadsheetCode;
  const order = Number(row.hsk_order);
  const word = row.simplified;
  const target = row[code] ?? "";
  const exampleTarget = row[`example_${code}`] ?? "";
  const en = row.EN ?? "";
  const exampleEn = row.example_EN ?? "";
  const context = { row: order, word, code };

  if (!target) addIssue(issues, "blocker", "sample_blank_translation", "Sampled target translation is blank.", context);
  if (!exampleTarget) addIssue(issues, "blocker", "sample_blank_example_translation", "Sampled target example translation is blank.", context);
  if (artifactRegex.test(target)) addIssue(issues, "blocker", "sample_translation_artifact", "Target translation contains placeholder/artifact text.", { ...context, target });
  if (artifactRegex.test(exampleTarget)) addIssue(issues, "blocker", "sample_example_artifact", "Target example contains placeholder/artifact text.", { ...context, exampleTarget });
  if (normalizedText(target) === normalizedText(row.simplified) || normalizedText(exampleTarget) === normalizedText(row.example_zh)) {
    addIssue(issues, "blocker", "sample_exact_chinese_copy", "Target cell is an exact copy of the Chinese source/example.", context);
  }
  if (!["EN", "EN-GB"].includes(code)) {
    if (normalizedText(exampleTarget) === normalizedText(exampleEn)) {
      addIssue(issues, "blocker", "sample_exact_english_example_copy", "Non-English example is an exact English fallback.", context);
    }
    if (normalizedText(target) === normalizedText(en)) {
      addIssue(issues, "warning", "sample_exact_english_word_match", "Non-English word equals English gloss; may be valid loanword but needs review.", {
        ...context,
        target,
        en,
      });
    }
  }
}

const [csvText, languageRows] = await Promise.all([
  fs.readFile(CSV_PATH, "utf8"),
  fs.readFile(LANGUAGES_PATH, "utf8").then(JSON.parse),
]);
const rows = parseCsv(csvText);
const languages = languageRows.filter((language) => language.spreadsheetCode !== "ZH");
const issues = [];

for (const row of rows) checkChineseRow(row, issues);

const sampleRows = [];
for (const language of languages) {
  const code = language.spreadsheetCode;
  const eligible = rows.filter((row) => row[code] && row[`example_${code}`]);
  if (eligible.length < SAMPLE_PER_LANGUAGE) {
    addIssue(issues, "blocker", "not_enough_filled_rows_for_language_sample", `Only ${eligible.length} filled rows for ${code}`, {
      code,
      filled_rows: eligible.length,
    });
  }
  for (const row of chooseSample(eligible, code, SAMPLE_PER_LANGUAGE)) {
    checkSampleCell(row, language, issues);
    sampleRows.push({
      language_code: code,
      language: language.language,
      hsk_order: Number(row.hsk_order),
      source_word: row.simplified,
      source_pinyin: row.pinyin,
      example_zh: row.example_zh,
      example_pinyin: row.example_pinyin,
      target_translation: row[code],
      target_example_translation: row[`example_${code}`],
      en_gloss: row.EN,
      en_example_translation: row.example_EN,
      row_status: row.translation_status,
    });
  }
}

const blockers = issues.filter((issue) => issue.severity === "blocker");
const warnings = issues.filter((issue) => issue.severity === "warning");
const languageSummary = languages.map((language) => {
  const code = language.spreadsheetCode;
  const filledRows = rows.filter((row) => row[code] && row[`example_${code}`]).length;
  const sampledRows = sampleRows.filter((row) => row.language_code === code).length;
  return {
    code,
    language: language.language,
    filled_rows: filledRows,
    sampled_rows: sampledRows,
    pending_rows: rows.length - filledRows,
  };
});
const acceptedNeutralSourcePinyinRows = [...acceptedNeutralSourcePinyin.entries()].map(([word, pinyin]) => ({ word, pinyin }));

const report = {
  release_id: RELEASE_ID,
  generated_at: new Date().toISOString(),
  status: blockers.length ? "blocked" : "ok",
  sample_policy: {
    sample_per_language: SAMPLE_PER_LANGUAGE,
    target_languages_checked: languages.length,
    target_language_sample_rows: sampleRows.length,
    sample_scope: "10 filled workbook rows per target language after Level 2 reached complete_53_languages_filled.",
  },
  chinese_pinyin_policy: {
    rows_checked: rows.length,
    source_pinyin_rows_checked: rows.length,
    example_pinyin_rows_checked: rows.length,
    accepted_neutral_source_pinyin_rows: acceptedNeutralSourcePinyinRows,
  },
  blockers,
  warnings,
  language_summary: languageSummary,
  samples: sampleRows,
  notes: [
    "This is deterministic native-free QA, not a live native-speaker certification.",
    "It checks sampled target translations/examples for blanks, artifacts, exact Chinese copies and exact English fallbacks.",
    "It checks all Chinese source pinyin and example pinyin for Han leakage, tone-number notation and no-tone shape.",
  ],
};

await fs.mkdir(path.dirname(REPORT_JSON), { recursive: true });
await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);

const sampleHeaders = [
  "language_code",
  "language",
  "hsk_order",
  "source_word",
  "source_pinyin",
  "example_zh",
  "example_pinyin",
  "target_translation",
  "target_example_translation",
  "en_gloss",
  "en_example_translation",
  "row_status",
];
await fs.writeFile(
  REPORT_CSV,
  [sampleHeaders.join(","), ...sampleRows.map((row) => sampleHeaders.map((header) => csvEscape(row[header])).join(","))].join("\n") + "\n"
);

await fs.writeFile(
  REPORT_MD,
  [
    `# ${RELEASE_ID} Sample 10 Per Language Quality Audit`,
    "",
    `Status: ${report.status}`,
    `Target languages checked: ${languages.length}`,
    `Sample rows: ${sampleRows.length}`,
    `Chinese source pinyin rows checked: ${rows.length}`,
    `Chinese example pinyin rows checked: ${rows.length}`,
    `Blockers: ${blockers.length}`,
    `Warnings: ${warnings.length}`,
    "",
    "## Scope",
    "",
    report.sample_policy.sample_scope,
    "",
    "This is deterministic native-free QA, not a live native-speaker certification.",
    "",
    "## Chinese Pinyin",
    "",
    `Accepted neutral/source no-tone rows: ${acceptedNeutralSourcePinyinRows.length}`,
    ...acceptedNeutralSourcePinyinRows.map((row) => `- ${row.word}: ${row.pinyin}`),
    "",
    "## Findings",
    "",
    blockers.length ? blockers.map((issue) => `- BLOCKER ${issue.code}${issue.row ? ` row ${issue.row}` : ""}: ${issue.message}`).join("\n") : "- No blockers.",
    "",
    warnings.length ? warnings.map((issue) => `- WARNING ${issue.code}${issue.row ? ` row ${issue.row}` : ""}: ${issue.message}`).join("\n") : "- No warnings.",
    "",
    "## Language Summary",
    "",
    "| Code | Language | Filled rows | Sampled rows | Pending rows |",
    "| --- | --- | ---: | ---: | ---: |",
    ...languageSummary.map((row) => `| ${row.code} | ${row.language} | ${row.filled_rows} | ${row.sampled_rows} | ${row.pending_rows} |`),
    "",
  ].join("\n")
);

console.log(
  JSON.stringify(
    {
      release_id: RELEASE_ID,
      status: report.status,
      target_languages_checked: languages.length,
      sample_rows: sampleRows.length,
      chinese_source_pinyin_rows_checked: rows.length,
      chinese_example_pinyin_rows_checked: rows.length,
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
