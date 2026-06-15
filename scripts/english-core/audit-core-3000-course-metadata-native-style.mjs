#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const releaseId =
  args.get("release") ??
  process.argv.slice(2).find((arg) => !arg.startsWith("--")) ??
  "english_core_3000_a1_a2_part_001_150_v1";
const metadataPath = path.resolve(
  args.get("metadata") ??
    `outputs/english-core-3000/course-metadata/${releaseId}_course_metadata_v0.json`
);
const languageOrderPath = path.resolve(args.get("languages") ?? "config/language-order.json");
const outputDir = path.resolve(args.get("out-dir") ?? "outputs/english-core-3000/course-metadata");
const reportId = "course_metadata_native_style_qa_v1";
const reportJsonPath = path.join(outputDir, `${releaseId}_${reportId}.json`);
const reportMdPath = path.join(outputDir, `${releaseId}_${reportId}.md`);

const sentenceTerminators = /(?:[.!?。！？։။।؟]|\u17D4)$/u;
const forbiddenClaims = /\b(oxford|official|certified|endorsed)\b/iu;
const scriptChecks = {
  RU: /\p{Script=Cyrillic}/u,
  BG: /\p{Script=Cyrillic}/u,
  SR: /\p{Script=Cyrillic}/u,
  KK: /\p{Script=Cyrillic}/u,
  ZH: /\p{Script=Han}/u,
  JA: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u,
  KO: /\p{Script=Hangul}/u,
  TH: /\p{Script=Thai}/u,
  HI: /\p{Script=Devanagari}/u,
  NE: /\p{Script=Devanagari}/u,
  BN: /\p{Script=Bengali}/u,
  MY: /\p{Script=Myanmar}/u,
  KM: /\p{Script=Khmer}/u,
  LO: /\p{Script=Lao}/u,
  SI: /\p{Script=Sinhala}/u,
  TA: /\p{Script=Tamil}/u,
  TE: /\p{Script=Telugu}/u,
  KN: /\p{Script=Kannada}/u,
  ML: /\p{Script=Malayalam}/u,
  KA: /\p{Script=Georgian}/u,
  HY: /\p{Script=Armenian}/u,
};

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

function visibleLength(value) {
  return Array.from(normalizeText(value)).length;
}

function issue(severity, language, field, message, value = "") {
  return { severity, language, field, message, value };
}

const [artifact, languageOrder] = await Promise.all([
  fs.readFile(metadataPath, "utf8").then(JSON.parse),
  fs.readFile(languageOrderPath, "utf8").then(JSON.parse),
]);

const blockers = [];
const warnings = [];

if (artifact.release_id !== releaseId) {
  blockers.push(issue("blocker", "ALL", "release_id", "Release id mismatch.", artifact.release_id));
}
if (artifact.status !== "metadata_language_qa_v1_checked") {
  blockers.push(issue("blocker", "ALL", "status", "Metadata artifact must be rebuilt from checked config status.", artifact.status));
}

const titleLimit = artifact.title_limit ?? 25;
const descriptionLimit = artifact.description_limit ?? 60;
const rowsByCode = new Map((artifact.rows ?? []).map((row) => [row.spreadsheet_code, row]));

for (const [index, language] of languageOrder.entries()) {
  const code = language.spreadsheetCode;
  const row = rowsByCode.get(code);
  if (!row) {
    blockers.push(issue("blocker", code, "row", "Missing metadata row."));
    continue;
  }
  const title = normalizeText(row.title);
  const description = normalizeText(row.description);
  const levelSignal = normalizeText(row.level_signal);
  if (row.order !== index + 1) {
    blockers.push(issue("blocker", code, "order", "Metadata order does not match language-order.json.", String(row.order)));
  }
  if (row.db_code !== language.dbCode) {
    blockers.push(issue("blocker", code, "db_code", "Metadata db_code does not match language-order.json.", row.db_code));
  }
  if (!title) blockers.push(issue("blocker", code, "title", "Missing title."));
  if (!description) blockers.push(issue("blocker", code, "description", "Missing description."));
  if (!levelSignal) blockers.push(issue("blocker", code, "level_signal", "Missing level signal."));
  if (visibleLength(title) > titleLimit) {
    blockers.push(issue("blocker", code, "title", `Title too long: ${visibleLength(title)} > ${titleLimit}.`, title));
  }
  if (visibleLength(description) > descriptionLimit) {
    blockers.push(
      issue("blocker", code, "description", `Description too long: ${visibleLength(description)} > ${descriptionLimit}.`, description)
    );
  }
  if (!sentenceTerminators.test(title)) {
    blockers.push(issue("blocker", code, "title", "Title lacks final sentence punctuation.", title));
  }
  if (!sentenceTerminators.test(description)) {
    blockers.push(issue("blocker", code, "description", "Description lacks final sentence punctuation.", description));
  }
  if (!description.includes(levelSignal)) {
    blockers.push(issue("blocker", code, "description", "Description does not include level_signal as visible text.", description));
  }
  if (forbiddenClaims.test(`${title} ${description}`)) {
    blockers.push(issue("blocker", code, "title/description", "Forbidden official/certified/Oxford-style claim.", `${title} ${description}`));
  }
  const scriptCheck = scriptChecks[code];
  if (scriptCheck && !scriptCheck.test(`${title} ${description} ${levelSignal}`)) {
    blockers.push(issue("blocker", code, "script", "Expected native script is missing from metadata.", `${title} ${description}`));
  }
}

const report = {
  release_id: releaseId,
  report_id: reportId,
  generated_at: new Date().toISOString(),
  status: blockers.length === 0 ? "passed_metadata_language_qa_v1" : "blocked",
  rows: artifact.rows?.length ?? 0,
  language_columns: languageOrder.length,
  title_limit: titleLimit,
  description_limit: descriptionLimit,
  blockers,
  warnings,
  note: "AI editorial/native-style Course Metadata QA, not external native-speaker approval.",
};

await fs.writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(
  reportMdPath,
  [
    `# Course Metadata Native-Style QA v1`,
    ``,
    `Release: \`${releaseId}\``,
    ``,
    `Status: \`${report.status}\``,
    ``,
    `This is an AI editorial/native-style Course Metadata QA pass, not external native-speaker approval.`,
    ``,
    `| Check | Result |`,
    `| --- | --- |`,
    `| Rows | ${report.rows} |`,
    `| Language columns | ${report.language_columns} |`,
    `| Title limit | ${titleLimit} |`,
    `| Description limit | ${descriptionLimit} |`,
    `| Blockers | ${blockers.length} |`,
    `| Warnings | ${warnings.length} |`,
    ``,
    `## Blockers`,
    ``,
    ...(blockers.length ? blockers.map((item) => `- ${item.language} ${item.field}: ${item.message}`) : [`- None.`]),
    ``,
    `## Warnings`,
    ``,
    ...(warnings.length ? warnings.map((item) => `- ${item.language} ${item.field}: ${item.message}`) : [`- None.`]),
    ``,
  ].join("\n")
);

if (blockers.length) {
  throw new Error(`Course Metadata native-style QA blocked: blockers=${blockers.length}. See ${path.relative(process.cwd(), reportMdPath)}`);
}

console.log(
  `English Core 3000 Course Metadata native-style QA OK for ${releaseId}: rows=${report.rows}, languages=${report.language_columns}, blockers=0, warnings=${warnings.length}`
);
