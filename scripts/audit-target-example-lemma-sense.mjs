#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSafeSetId, psqlJson, sqlLiteralList } from "./lib/qa-utils.mjs";
import {
  buildTargetExampleLexicalAnchorFindings,
  formatTargetExampleLexicalAnchorFinding,
} from "./lib/target-example-lexical-anchor.mjs";

const defaultSetIds = [
  "home_kitchen_cookware_pilot_01",
  "home_kitchen_cooking_actions_a1_a2",
  "home_kitchen_storage_cleaning_a2",
  "home_bathroom_essentials_a1",
  "home_kitchen_small_tools_supplies_a2",
];

const args = process.argv.slice(2);
const setIds = args.filter((arg) => !arg.startsWith("--"));
const requestedSetIds = setIds.length ? setIds : defaultSetIds;
const outArg = args.find((arg) => arg.startsWith("--out="))?.slice("--out=".length);
const reportPath = path.resolve(
  outArg ?? "outputs/qa/target_example_lemma_sense_audit_all_generated_20260502.json"
);

for (const setId of requestedSetIds) assertSafeSetId(setId);

const articleTokens = new Set([
  "a",
  "an",
  "the",
  "to",
  "en",
  "et",
  "ett",
  "un",
  "o",
  "una",
  "el",
  "la",
  "le",
  "les",
  "der",
  "die",
  "das",
]);

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(value) {
  return normalize(value)
    .split(/\s+/u)
    .filter((token) => token && !articleTokens.has(token));
}

function undoubleFinal(value) {
  if (value.length < 2) return value;
  const last = value.at(-1);
  const prev = value.at(-2);
  return last === prev ? value.slice(0, -1) : value;
}

function scandinavianStemCandidates(token) {
  const candidates = new Set([token]);
  for (const suffix of ["ene", "erne", "arna", "en", "et", "n", "t"]) {
    if (token.endsWith(suffix) && token.length > suffix.length + 1) {
      const stem = token.slice(0, -suffix.length);
      candidates.add(stem);
      candidates.add(undoubleFinal(stem));
    }
  }
  return candidates;
}

function romanianStemCandidates(token) {
  const candidates = new Set([token]);
  for (const suffix of ["ului", "ele", "ile", "ul", "le", "a"]) {
    if (token.endsWith(suffix) && token.length > suffix.length + 1) {
      candidates.add(token.slice(0, -suffix.length));
    }
  }
  return candidates;
}

function hasAcceptedInflection(row) {
  const languageCode = row.language_code;
  const displayTokens = tokens(row.display_word);
  const exampleTokens = tokens(row.example_text);
  if (displayTokens.length === 0 || exampleTokens.length === 0) return false;

  for (const displayToken of displayTokens) {
    if (exampleTokens.includes(displayToken)) return true;
    if (exampleTokens.some((exampleToken) => exampleToken.startsWith(displayToken) && displayToken.length >= 3)) {
      return true;
    }

    if (["DA", "NB", "SV"].includes(languageCode)) {
      for (const exampleToken of exampleTokens) {
        const stems = scandinavianStemCandidates(exampleToken);
        if (stems.has(displayToken) || [...stems].some((stem) => stem.startsWith(displayToken))) {
          return true;
        }
      }
    }

    if (languageCode === "RO") {
      for (const exampleToken of exampleTokens) {
        const stems = romanianStemCandidates(exampleToken);
        if (stems.has(displayToken) || [...stems].some((stem) => stem.startsWith(displayToken))) {
          return true;
        }
      }
    }
  }

  return false;
}

function classifyFinding(finding, rowsByKey) {
  const row = rowsByKey.get(`${finding.set_id}::${finding.meaning_id}::${finding.language_code}`);
  if (!row) {
    return {
      classification: "needs_review",
      review_reason: "finding row was not found in current audit rows",
    };
  }

  if (row.language_code === "RU" && normalize(row.part_of_speech).includes("verb")) {
    return {
      classification: "repair_candidate",
      review_reason:
        "RU verb example appears to use a different aspect/infinitive surface than the display verb; needs same-lemma/aspect repair or source-reviewed acceptance.",
    };
  }

  if (hasAcceptedInflection(row)) {
    return {
      classification: "accepted_grammar_form",
      review_reason:
        "Example uses a normal inflected, definite, case-marked or article-adjusted form of the displayed lexical item.",
    };
  }

  return {
    classification: "needs_review",
    review_reason:
      "The deterministic checker could not prove this is only inflection; review before changing anything.",
  };
}

const rows = await psqlJson(`
select coalesce(json_agg(row_to_json(rows)), '[]'::json)
from (
  select
    msm.set_id,
    cs.set_name,
    msm.display_order,
    mu.meaning_id,
    mu.canonical_english,
    mu.part_of_speech,
    e.example_id,
    e.canonical_example_en,
    e.semantic_scene,
    et.language_code,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    le.native_word,
    le.transcription,
    et.example_text
  from meaning_set_memberships msm
  join content_sets cs on cs.set_id = msm.set_id
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join meaning_examples e
    on e.set_id = msm.set_id
   and e.meaning_id = msm.meaning_id
   and e.example_role = 'context'
  join meaning_example_translations et on et.example_id = e.example_id
  left join meaning_language_entries le
    on le.meaning_id = msm.meaning_id
   and le.language_code = et.language_code
  where msm.set_id in (${sqlLiteralList(requestedSetIds)})
    and msm.quality_status <> 'blocked'
  order by msm.set_id, msm.display_order, et.language_code
) rows;
`);

const rowsByKey = new Map(rows.map((row) => [`${row.set_id}::${row.meaning_id}::${row.language_code}`, row]));
const findings = buildTargetExampleLexicalAnchorFindings(rows);
const classified = [...findings.blockers, ...findings.warnings].map((finding) => {
  const row = rowsByKey.get(`${finding.set_id}::${finding.meaning_id}::${finding.language_code}`) ?? {};
  return {
    ...classifyFinding(finding, rowsByKey),
    severity: finding.severity,
    set_id: finding.set_id,
    deck: row.set_name ?? "",
    display_order: row.display_order ?? null,
    language_code: finding.language_code,
    meaning_id: finding.meaning_id,
    canonical_english: row.canonical_english ?? "",
    part_of_speech: row.part_of_speech ?? "",
    display_word: finding.display_word,
    example_text: finding.example_text,
    transcription: row.transcription ?? "",
    checker_reason: formatTargetExampleLexicalAnchorFinding(finding),
  };
});

const byClassification = {};
const byLanguage = {};
const byDeck = {};
for (const item of classified) {
  byClassification[item.classification] = (byClassification[item.classification] ?? 0) + 1;
  byLanguage[item.language_code] ??= {};
  byLanguage[item.language_code][item.classification] =
    (byLanguage[item.language_code][item.classification] ?? 0) + 1;
  byDeck[item.set_id] ??= {};
  byDeck[item.set_id][item.classification] = (byDeck[item.set_id][item.classification] ?? 0) + 1;
}

const report = {
  generated_at: new Date().toISOString(),
  mode: "target_example_lemma_sense_audit",
  set_ids: requestedSetIds,
  rows_checked: rows.length,
  raw_blocker_count: findings.blockers.length,
  raw_warning_count: findings.warnings.length,
  reviewed_finding_count: classified.length,
  by_classification: byClassification,
  by_language: byLanguage,
  by_deck: byDeck,
  findings: classified,
};

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");

const markdownPath = reportPath.replace(/\.json$/u, ".md");
await writeFile(
  markdownPath,
  [
    "# Target Example Lemma/Sense Audit",
    "",
    `Generated at: ${report.generated_at}`,
    `Rows checked: ${rows.length}`,
    `Raw lexical-anchor blockers: ${findings.blockers.length}`,
    `Raw lexical-anchor warnings: ${findings.warnings.length}`,
    "",
    `Classification: ${JSON.stringify(byClassification)}`,
    "",
    "| Classification | Count |",
    "| --- | ---: |",
    ...Object.entries(byClassification).map(([name, count]) => `| ${name} | ${count} |`),
    "",
    "## Repair Candidates",
    "",
    ...classified
      .filter((item) => item.classification === "repair_candidate")
      .map(
        (item) =>
          `- ${item.set_id} ${item.language_code}/${item.meaning_id}: display="${item.display_word}", example="${item.example_text}", canonical="${item.canonical_english}"`
      ),
    "",
    "## Needs Review",
    "",
    ...(classified.filter((item) => item.classification === "needs_review").length
      ? classified
          .filter((item) => item.classification === "needs_review")
          .map(
            (item) =>
              `- ${item.set_id} ${item.language_code}/${item.meaning_id}: display="${item.display_word}", example="${item.example_text}", canonical="${item.canonical_english}"`
          )
      : ["None."]),
    "",
    "## Accepted Grammar Forms",
    "",
    ...classified
      .filter((item) => item.classification === "accepted_grammar_form")
      .map(
        (item) =>
          `- ${item.set_id} ${item.language_code}/${item.meaning_id}: display="${item.display_word}", example="${item.example_text}"`
      ),
    "",
  ].join("\n"),
  "utf8"
);

console.log(
  `Target example lemma/sense audit complete: rows=${rows.length}, findings=${classified.length}, classifications=${JSON.stringify(
    byClassification
  )}, report=${path.relative(process.cwd(), reportPath)}`
);
