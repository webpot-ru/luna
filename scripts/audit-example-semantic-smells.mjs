#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { psqlJson, toCsv } from "./lib/qa-utils.mjs";

const args = process.argv.slice(2);
const sampleSize = Number(args.find((arg) => arg.startsWith("--sample-size="))?.slice("--sample-size=".length) ?? 5);
const seed = args.find((arg) => arg.startsWith("--seed="))?.slice("--seed=".length) ?? "example-semantic-smells-20260603";
const outArg = args.find((arg) => arg.startsWith("--out="))?.slice("--out=".length);
const outPath = path.resolve(outArg ?? "outputs/qa/example_semantic_smells_audit_20260603.json");
const oxfordRelease = args.find((arg) => arg.startsWith("--oxford-release="))?.slice("--oxford-release=".length) ?? "";
const oxfordOnly = args.includes("--oxford-only") || Boolean(oxfordRelease);

if (args.includes("--help")) {
  console.log(
    [
      "Usage: node scripts/audit-example-semantic-smells.mjs [options]",
      "",
      "Options:",
      "  --sample-size=N             Ordinary/HSK sample size per group (default: 5).",
      "  --seed=TEXT                 Stable sampling seed.",
      "  --out=PATH                  JSON report path; .md and .csv are written beside it.",
      "  --oxford-only               Scan Oxford English example-map artifacts only; no DB reads.",
      "  --oxford-release=RELEASE    Scan one Oxford release only; implies --oxford-only.",
      "  --help                      Print this help text.",
    ].join("\n")
  );
  process.exit(0);
}

if (!Number.isInteger(sampleSize) || sampleSize <= 0) {
  throw new Error(`sample-size must be a positive integer, got ${sampleSize}`);
}

function nowStamp() {
  return new Date().toISOString();
}

function severityRank(severity) {
  return { blocker: 3, warning: 2, info: 1 }[severity] ?? 0;
}

function pushFinding(findings, row, severity, findingType, reason, contour) {
  findings.push({
    severity,
    contour,
    finding_type: findingType,
    reason,
    release_id: row.release_id ?? "",
    set_id: row.set_id ?? "",
    deck: row.deck ?? row.set_name ?? "",
    language_code: row.language_code ?? row.spreadsheet_code ?? "",
    row_id: row.row_id ?? "",
    order: row.hsk_order ?? row.display_order ?? "",
    meaning_id: row.meaning_id ?? "",
    source_headword: row.source_headword ?? row.canonical_english ?? row.simplified ?? "",
    display: row.reviewed_display_headword ?? row.display_word ?? row.word_translation ?? "",
    example: row.example_EN ?? row.example_text ?? row.example_translation ?? "",
  });
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function stripParenthetical(value) {
  return normalizeText(value).replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

function detectOxfordEnglish(row) {
  const findings = [];
  const example = normalizeText(row.example_EN);
  const headword = stripParenthetical(row.source_headword);
  const lower = example.toLowerCase();
  const contour = "oxford_english_examples";

  const exactBad = new Set([
    "the aids changed the plan.",
    "the decision was audio.",
    "the decision was biological.",
  ]);
  if (exactBad.has(lower)) {
    pushFinding(findings, row, "blocker", "known_bad_semantic_example", "Known nonsensical or wrong-collocation English base example.", contour);
  }

  if (/^they [a-z][a-z-]* the issue carefully\.$/u.test(lower)) {
    pushFinding(findings, row, "blocker", "generic_verb_issue_template", "Generic verb template often creates wrong transitivity or unnatural collocation.", contour);
  }

  if (/^they (cope|depart|differ|erupt|evolve|full-time) the issue carefully\.$/u.test(lower)) {
    pushFinding(findings, row, "blocker", "verb_transitivity_mismatch", "Intransitive or non-verb headword was forced into a transitive template.", contour);
  }

  if (/^the decision was [a-z][a-z-]*\.$/u.test(lower)) {
    const allowed = new Set(["final", "clear", "difficult", "fair", "reasonable", "wise", "wrong", "right"]);
    if (!allowed.has(headword.toLowerCase())) {
      pushFinding(findings, row, "warning", "generic_adjective_decision_template", "Adjective was put into a generic decision frame; needs semantic review for natural collocation.", contour);
    }
  }

  if (/^the report mentioned an? .+\.$/u.test(lower)) {
    pushFinding(findings, row, "warning", "generic_report_mentioned_template", "Noun was put into a generic report frame; often sounds artificial or creates article errors.", contour);
  }

  if (/^the report mentioned an? (accuracy|agriculture|awareness|coverage|creativity|darkness|democracy|destruction|disability|diversity|economics|electronics|fame|fantasy|formation|globalization|goodness|gaming)\.$/u.test(lower)) {
    pushFinding(findings, row, "blocker", "mass_or_abstract_article_error", "Mass or abstract noun appears with an unnatural indefinite article in the base example.", contour);
  }

  if (/^she responded .+ during the meeting\.$/u.test(lower)) {
    pushFinding(findings, row, "warning", "generic_adverb_response_template", "Adverb was put into a generic meeting response frame; needs semantic/naturalness review.", contour);
  }

  if (/^the .+ changed the plan\.$/u.test(lower) && !["policy", "schedule", "weather", "delay"].some((term) => lower.includes(term))) {
    pushFinding(findings, row, "warning", "generic_changed_plan_template", "Subject was put into a generic changed-plan frame; often unnatural for diseases, fields or plural abstractions.", contour);
  }

  return findings;
}

function detectOrdinarySample(row) {
  const findings = [];
  const example = normalizeText(row.example_text);
  const display = normalizeText(row.display_word);
  const contour = "ordinary_sample";

  if (!example) {
    pushFinding(findings, row, "blocker", "missing_example", "Sampled row has an empty target example.", contour);
    return findings;
  }

  if (!/[.!?。！？؟।]$/u.test(example)) {
    pushFinding(findings, row, "warning", "missing_terminal_punctuation", "Target example lacks terminal punctuation.", contour);
  }

  if (display && display.length >= 4) {
    const escaped = display.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = example.match(new RegExp(escaped, "giu")) ?? [];
    if (matches.length >= 2) {
      pushFinding(findings, row, "warning", "display_repeated_in_short_example", "Display term repeats multiple times in a short target example; often sounds mechanical.", contour);
    }
  }

  if (["generated", "draft", "needs_review"].includes(String(row.example_translation_quality_status ?? ""))) {
    pushFinding(findings, row, "blocker", "nonfinal_example_status", "Sampled target example is not in a final checked status.", contour);
  }

  return findings;
}

function detectHskSample(row) {
  const findings = [];
  const example = normalizeText(row.example_translation);
  const contour = "hsk_sample";
  const spreadsheetCode = String(row.spreadsheet_code ?? "");

  if (!example) {
    pushFinding(findings, row, "blocker", "missing_example_translation", "Sampled HSK target example translation is empty.", contour);
    return findings;
  }

  if (/[一-龿]/u.test(example) && spreadsheetCode !== "JA") {
    pushFinding(findings, row, "blocker", "han_leak_example_translation", "Target example translation contains Han characters.", contour);
  }

  const nonLatinExpected = new Set([
    "RU",
    "BG",
    "SR",
    "JA",
    "KO",
    "TH",
    "HI",
    "BN",
    "MY",
    "KM",
    "LO",
    "NE",
    "SI",
    "TA",
    "TE",
    "KN",
    "ML",
    "HY",
    "KA",
    "KK",
  ]);
  if (/^[A-Za-z0-9 ,.'"-]+$/u.test(example) && nonLatinExpected.has(spreadsheetCode)) {
    pushFinding(findings, row, "warning", "latin_only_expected_non_latin_example", "Target example is Latin-only for a language normally expected to use another script.", contour);
  }

  return findings;
}

async function readOxfordExampleMapRows(releaseIdFilter = "") {
  const dir = path.resolve("outputs/oxford-vocabulary/examples");
  let files = [];
  try {
    files = (await readdir(dir))
      .filter((file) => /^oxford_.*_english_examples_map_v1\.jsonl$/u.test(file))
      .map((file) => path.join(dir, file));
  } catch {
    return [];
  }

  const rows = [];
  for (const file of files.sort()) {
    const content = await readFile(file, "utf8");
    for (const line of content.split(/\r?\n/u)) {
      if (!line.trim()) continue;
      const row = { ...JSON.parse(line), artifact_path: path.relative(process.cwd(), file) };
      if (!releaseIdFilter || row.release_id === releaseIdFilter) rows.push(row);
    }
  }
  return rows;
}

async function readOrdinarySampleRows() {
  return psqlJson(`
    select coalesce(json_agg(row_to_json(t) order by set_id, language_code, sample_rank), '[]'::json)
    from (
      select *
      from (
        select
          cs.set_id,
          cs.set_name as deck,
          msm.display_order,
          mu.meaning_id,
          mu.canonical_english,
          le.language_code,
          coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
          et.example_text,
          et.quality_status as example_translation_quality_status,
          row_number() over (
            partition by cs.set_id, le.language_code
            order by md5(cs.set_id || '::' || le.language_code || '::' || mu.meaning_id || '::' || '${seed.replace(/'/g, "''")}')
          ) as sample_rank
        from content_sets cs
        join meaning_set_memberships msm on msm.set_id = cs.set_id
        join meaning_units mu on mu.meaning_id = msm.meaning_id
        join meaning_examples e
          on e.set_id = msm.set_id
         and e.meaning_id = msm.meaning_id
         and e.example_role = 'context'
        join meaning_language_entries le on le.meaning_id = msm.meaning_id
        join meaning_example_translations et
          on et.example_id = e.example_id
         and et.language_code = le.language_code
        where cs.selection_status in ('approved', 'generated')
      ) sampled
      where sample_rank <= ${sampleSize}
    ) t
  `);
}

async function readHskSampleRows() {
  const exists = await psqlJson(`
    select coalesce(json_agg(row_to_json(t)), '[]'::json)
    from (
      select to_regclass('public.hsk_classic_translation_items') is not null as has_translation_table
    ) t
  `);
  if (!exists[0]?.has_translation_table) return [];

  return psqlJson(`
    select coalesce(json_agg(row_to_json(t) order by release_id, spreadsheet_code, sample_rank), '[]'::json)
    from (
      select *
      from (
        select
          release_id,
          hsk_order,
          hsk_key,
          spreadsheet_code,
          db_code,
          word_translation,
          example_translation,
          row_number() over (
            partition by release_id, spreadsheet_code
            order by md5(release_id || '::' || spreadsheet_code || '::' || hsk_order::text || '::' || '${seed.replace(/'/g, "''")}')
          ) as sample_rank
        from hsk_classic_translation_items
        where release_id in (
          'hsk2_classic_level_1_150_v1',
          'hsk2_classic_level_2_150_v1',
          'hsk2_classic_level_3_300_v1',
          'hsk2_classic_level_4_600_v1',
          'hsk2_classic_level_5_1300_v1'
        )
      ) sampled
      where sample_rank <= ${sampleSize}
    ) t
  `);
}

function summarizeFindings(findings) {
  const bySeverity = {};
  const byContour = {};
  const byType = {};
  const byRelease = {};
  const bySet = {};
  for (const finding of findings) {
    bySeverity[finding.severity] = (bySeverity[finding.severity] ?? 0) + 1;
    byContour[finding.contour] = (byContour[finding.contour] ?? 0) + 1;
    byType[finding.finding_type] = (byType[finding.finding_type] ?? 0) + 1;
    if (finding.release_id) byRelease[finding.release_id] = (byRelease[finding.release_id] ?? 0) + 1;
    if (finding.set_id) bySet[finding.set_id] = (bySet[finding.set_id] ?? 0) + 1;
  }
  return { bySeverity, byContour, byType, byRelease, bySet };
}

function buildMarkdown(report) {
  const topFindings = report.findings
    .slice()
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 80);
  const lines = [
    "# Example Semantic Smells Audit",
    "",
    `Generated at: ${report.generated_at}`,
    `Seed: \`${report.seed}\``,
    `Sample size: ${report.sample_size}`,
    "",
    "## Coverage",
    "",
    `- Oxford English example rows scanned: ${report.coverage.oxford_english_rows}`,
    `- Ordinary sampled rows scanned: ${report.coverage.ordinary_sample_rows}`,
    `- HSK sampled rows scanned: ${report.coverage.hsk_sample_rows}`,
    "",
    "## Summary",
    "",
    `- Blockers: ${report.summary.bySeverity.blocker ?? 0}`,
    `- Warnings: ${report.summary.bySeverity.warning ?? 0}`,
    `- Info: ${report.summary.bySeverity.info ?? 0}`,
    "",
    "### By Contour",
    "",
    ...Object.entries(report.summary.byContour).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "### By Type",
    "",
    ...Object.entries(report.summary.byType).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Top Findings",
    "",
    "| Severity | Contour | Release/Deck | Language | Headword | Finding | Example |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...topFindings.map((finding) => {
      const releaseOrDeck = finding.release_id || finding.set_id || finding.deck;
      return `| ${finding.severity} | ${finding.contour} | ${releaseOrDeck} | ${finding.language_code} | ${finding.source_headword} | ${finding.finding_type} | ${normalizeText(finding.example).replace(/\|/g, "/")} |`;
    }),
  ];
  return `${lines.join("\n")}\n`;
}

await mkdir(path.dirname(outPath), { recursive: true });

const oxfordRows = await readOxfordExampleMapRows(oxfordRelease);
const ordinaryRows = oxfordOnly ? [] : await readOrdinarySampleRows();
let hskRows = [];
if (!oxfordOnly) {
  try {
    hskRows = await readHskSampleRows();
  } catch (error) {
    hskRows = [];
  }
}

const findings = [
  ...oxfordRows.flatMap(detectOxfordEnglish),
  ...ordinaryRows.flatMap(detectOrdinarySample),
  ...hskRows.flatMap(detectHskSample),
];
if (oxfordRelease && oxfordRows.length === 0) {
  findings.push({
    severity: "blocker",
    contour: "oxford_english_examples",
    finding_type: "missing_release_example_map",
    reason: "No Oxford English example-map rows were found for the requested release.",
    release_id: oxfordRelease,
    set_id: "",
    deck: "",
    language_code: "",
    row_id: "",
    order: "",
    meaning_id: "",
    source_headword: "",
    display: "",
    example: "",
  });
}
const reportStatus = findings.some((finding) => finding.severity === "blocker") ? "blockers" : "pass";

const report = {
  status: reportStatus,
  generated_at: nowStamp(),
  mode: "example_semantic_smells_audit",
  scope: oxfordOnly ? "oxford_only" : "all_contours",
  oxford_release_filter: oxfordRelease || null,
  seed,
  sample_size: sampleSize,
  coverage: {
    oxford_english_rows: oxfordRows.length,
    ordinary_sample_rows: ordinaryRows.length,
    hsk_sample_rows: hskRows.length,
  },
  summary: summarizeFindings(findings),
  findings,
  oxford_rows: oxfordRows,
  ordinary_sample_rows: ordinaryRows,
  hsk_sample_rows: hskRows,
};

await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(outPath.replace(/\.json$/u, ".md"), buildMarkdown(report), "utf8");
await writeFile(
  outPath.replace(/\.json$/u, ".csv"),
  `${toCsv(findings, [
    "severity",
    "contour",
    "finding_type",
    "reason",
    "release_id",
    "set_id",
    "deck",
    "language_code",
    "row_id",
    "order",
    "meaning_id",
    "source_headword",
    "display",
    "example",
  ])}\n`,
  "utf8"
);

console.log(JSON.stringify({
  status: report.status,
  report: path.relative(process.cwd(), outPath),
  markdown: path.relative(process.cwd(), outPath.replace(/\.json$/u, ".md")),
  csv: path.relative(process.cwd(), outPath.replace(/\.json$/u, ".csv")),
  coverage: report.coverage,
  summary: report.summary,
}, null, 2));
