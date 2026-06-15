#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const releaseId = "english_core_3000_a1_a2_part_001_150_v1";
const outputDir = path.resolve("outputs/english-core-3000/translation-batches");
const auditId = "all_language_native_style_audit_v2";
const auditJsonPath = path.join(outputDir, `${releaseId}_${auditId}.json`);
const auditMdPath = path.join(outputDir, `${releaseId}_${auditId}.md`);

const batches = [
  ["ru_es_fr_v0", ["RU", "ES", "FR"]],
  ["de_it_pt_v0", ["DE", "IT", "PT"]],
  ["zh_ja_ko_v0", ["ZH", "JA", "KO"]],
  ["vi_th_ms_id_v0", ["VI", "TH", "MS", "ID"]],
  ["pl_nl_sv_no_v0", ["PL", "NL", "SV", "NO"]],
  ["da_fi_cs_sk_v0", ["DA", "FI", "CS", "SK"]],
  ["hu_ro_bg_hr_v0", ["HU", "RO", "BG", "HR"]],
  ["sr_sl_lt_lv_v0", ["SR", "SL", "LT", "LV"]],
  ["et_is_hi_bn_v0", ["ET", "IS", "HI", "BN"]],
  ["tl_my_km_lo_v0", ["TL", "MY", "KM", "LO"]],
  ["ne_si_ta_v0", ["NE", "SI", "TA"]],
  ["te_kn_ml_v0", ["TE", "KN", "ML"]],
  ["uz_kk_az_v0", ["UZ", "KK", "AZ"]],
  ["ka_hy_tr_v0", ["KA", "HY", "TR"]],
  ["sw_pt_br_es_419_v0", ["SW", "PT-BR", "ES-419"]],
];

const nonLatinScriptLanguages = new Set([
  "RU",
  "ZH",
  "JA",
  "KO",
  "TH",
  "BG",
  "SR",
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
  "KK",
  "KA",
  "HY",
]);

const allowedExactSurface = new Set(["FR::long", "FR::correct", "FR::important", "NL::in", "RO::important"]);
const sentenceTerminators = /(?:[.!?。！？։။।؟]|\u17D4)$/u;

const regionalRules = [
  {
    language: "PT-BR",
    severity: "blocker",
    rule: "pt_br_portugal_form",
    pattern:
      /\b(telem[oó]vel|telemoveis|telemóveis|pequeno-almo[cç]o|autocarro|bilhete|tu\b|teu\b|tua\b|contigo|vem\b|olha\b|faz\b|segue\b|vira\b|move\b|levanta\b|numa\b|num\b|oiço|sinto-me|encontramo-nos|à espera|está a \w+)/iu,
    allow: /\bde volta\b/iu,
  },
  {
    language: "PT",
    severity: "warning",
    rule: "pt_possible_brazil_form",
    pattern: /\b(celular|xícara|café da manhã|você|vocês|por que|por quê|me diga|me mostre|me dê)\b/iu,
  },
  {
    language: "ES-419",
    severity: "blocker",
    rule: "es_419_spain_only_form",
    pattern: /\b(coger|vosotros|ordenador|móvil|camarero)\b/iu,
  },
  {
    language: "ES",
    severity: "warning",
    rule: "es_possible_latam_form",
    pattern: /\b(computadora|celular|ustedes|manejar)\b/iu,
  },
];

const acceptedComparableSurfaces = new Set([
  "PL::core3000_0084::problem",
  "HR::core3000_0084::problem",
  "SL::core3000_0084::problem",
  "RO::core3000_0114::a include",
  "PL::core3000_0129::system",
]);

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

function comparable(value) {
  return normalizeText(value)
    .toLocaleLowerCase("en-US")
    .replace(/\b(a|an|the|to)\b/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "");
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSONL at ${filePath}:${index + 1}: ${error.message}`);
      }
    });
}

const languageOrder = JSON.parse(await fs.readFile("config/language-order.json", "utf8")).map(
  (language) => language.spreadsheetCode,
);
const sourceRows = await readJsonl(`outputs/english-core-3000/en-transcriptions/${releaseId}_en_transcriptions_v1.jsonl`);
const rowsById = new Map(
  sourceRows.map((row) => [
    row.core_item_id,
    {
      release_id: row.release_id,
      core_item_id: row.core_item_id,
      en_display: row.en_display,
      example_EN: row.example_EN,
      languages: {
        EN: {
          display: normalizeText(row.en_display),
          example: normalizeText(row.example_EN),
        },
      },
    },
  ]),
);

const enGbRows = await readJsonl(`outputs/english-core-3000/en-gb/${releaseId}_en_gb_text_v1.jsonl`);
for (const row of enGbRows) {
  const merged = rowsById.get(row.core_item_id);
  if (!merged) throw new Error(`Unknown EN-GB core_item_id ${row.core_item_id}`);
  merged.languages["EN-GB"] = {
    display: normalizeText(row["EN-GB"]),
    example: normalizeText(row["example_EN-GB"]),
  };
}

for (const [batchId, languages] of batches) {
  const batchRows = await readJsonl(path.join(outputDir, `${releaseId}_translation_batch_${batchId}.jsonl`));
  for (const row of batchRows) {
    const merged = rowsById.get(row.core_item_id);
    if (!merged) throw new Error(`Unknown core_item_id ${row.core_item_id} in ${batchId}`);
    for (const language of languages) {
      merged.languages[language] = {
        display: normalizeText(row[language]),
        example: normalizeText(row[`example_${language}`]),
      };
    }
  }
}

const findings = [];
function addFinding(severity, rule, row, language, field, value, detail) {
  findings.push({
    severity,
    rule,
    core_item_id: row.core_item_id,
    en_display: row.en_display,
    language,
    field,
    value,
    detail,
  });
}

for (const row of rowsById.values()) {
  for (const language of languageOrder) {
    const cell = row.languages[language];
    if (!cell) {
      addFinding("blocker", "missing_language_row", row, language, "row", "", "Missing language row in merged matrix.");
      continue;
    }
    if (!cell.display) addFinding("blocker", "missing_display", row, language, language, "", "Missing display cell.");
    if (!cell.example) {
      addFinding("blocker", "missing_example", row, language, `example_${language}`, "", "Missing example cell.");
    } else if (!sentenceTerminators.test(cell.example)) {
      addFinding(
        "blocker",
        "missing_example_punctuation",
        row,
        language,
        `example_${language}`,
        cell.example,
        "Example lacks final sentence punctuation.",
      );
    }

    if (language !== "EN" && language !== "EN-GB") {
      const exactKey = `${language}::${cell.display.toLocaleLowerCase("en-US")}`;
      if (
        !allowedExactSurface.has(exactKey) &&
        cell.display.toLocaleLowerCase("en-US") === row.en_display.toLocaleLowerCase("en-US")
      ) {
        addFinding("blocker", "exact_english_display_fallback", row, language, language, cell.display, "Display matches EN exactly.");
      }
      if (cell.example.toLocaleLowerCase("en-US") === row.example_EN.toLocaleLowerCase("en-US")) {
        addFinding(
          "blocker",
          "exact_english_example_fallback",
          row,
          language,
          `example_${language}`,
          cell.example,
          "Example matches EN exactly.",
        );
      }
      const comparableKey = `${language}::${row.core_item_id}::${cell.display.toLocaleLowerCase("en-US")}`;
      if (
        comparable(cell.display) &&
        comparable(cell.display) === comparable(row.en_display) &&
        !allowedExactSurface.has(exactKey) &&
        !acceptedComparableSurfaces.has(comparableKey)
      ) {
        addFinding(
          "warning",
          "comparable_english_display_surface",
          row,
          language,
          language,
          cell.display,
          "Display is very close to EN after article/function-word normalization; may be a valid cognate/loan.",
        );
      }
    }

    if (nonLatinScriptLanguages.has(language) && /[A-Za-z]{3,}/u.test(`${cell.display} ${cell.example}`)) {
      addFinding(
        "warning",
        "latin_token_in_non_latin_language",
        row,
        language,
        `${language}/example_${language}`,
        `${cell.display} / ${cell.example}`,
        "Latin token in non-Latin script language; may be a fallback or an allowed proper name/loan.",
      );
    }

    for (const regionalRule of regionalRules) {
      if (regionalRule.language !== language) continue;
      const value = `${cell.display} ${cell.example}`;
      const match = value.match(regionalRule.pattern);
      if (match && !(regionalRule.allow && regionalRule.allow.test(value))) {
        addFinding(regionalRule.severity, regionalRule.rule, row, language, `${language}/example_${language}`, value, match[0]);
      }
    }
  }
}

const counts = {
  rows: rowsById.size,
  language_columns: languageOrder.length,
  expected_cells: rowsById.size * languageOrder.length * 2,
  blockers: findings.filter((finding) => finding.severity === "blocker").length,
  warnings: findings.filter((finding) => finding.severity === "warning").length,
};

const findingsByRule = findings.reduce((acc, finding) => {
  acc[finding.rule] = (acc[finding.rule] ?? 0) + 1;
  return acc;
}, {});

const report = {
  release_id: releaseId,
  audit_id: auditId,
  status: counts.blockers > 0 ? "needs_repair" : counts.warnings > 0 ? "passed_with_warnings" : "passed_no_findings",
  note: "AI editorial/native-style audit, not external native-speaker approval.",
  accepted_warnings: [
    "PL/HR/SL problem are valid learner-facing cognates for core3000_0084.",
    "RO a include is the valid Romanian infinitive for core3000_0114.",
    "PL system is a valid learner-facing cognate for core3000_0129.",
  ],
  repair_notes: [
    "v2 rerun follows semantic repair of core3000_0082 too in HI, BN, MY, NE, TA, TE, KN and ML.",
    "v2 rerun follows PT-BR display/example alignment repair for core3000_0028 will.",
  ],
  counts,
  findings_by_rule: findingsByRule,
  findings,
};

await fs.writeFile(auditJsonPath, `${JSON.stringify(report, null, 2)}\n`);

const topFindings = findings.slice(0, 80);
const md = [
  `# English Core 3000 All-Language Native-Style Audit v2`,
  "",
  `Release: \`${releaseId}\``,
  "",
  "Status: `" + report.status + "`",
  "",
  "This is an AI editorial/native-style audit, not external native-speaker approval.",
  "",
  "## Repair Notes",
  "",
  "- v2 rerun follows semantic repair of `core3000_0082` / `too` in `HI`, `BN`, `MY`, `NE`, `TA`, `TE`, `KN` and `ML`.",
  "- v2 rerun follows `PT-BR` display/example alignment repair for `core3000_0028` / `will`.",
  "",
  "## Accepted Cognates",
  "",
  "- `PL`, `HR`, `SL` `problem` are valid learner-facing cognates, not English fallback.",
  "- `RO` `a include` is the valid Romanian infinitive, not English fallback.",
  "- `PL` `system` is a valid learner-facing cognate, not English fallback.",
  "",
  "## Counts",
  "",
  `- Rows: ${counts.rows}`,
  `- Language columns: ${counts.language_columns}`,
  `- Expected display/example cells: ${counts.expected_cells}`,
  `- Blockers: ${counts.blockers}`,
  `- Warnings: ${counts.warnings}`,
  "",
  "## Findings By Rule",
  "",
  ...Object.entries(findingsByRule).map(([rule, count]) => `- \`${rule}\`: ${count}`),
  ...(topFindings.length
    ? [
        "",
        "## First Findings",
        "",
        ...topFindings.map(
          (finding) =>
            `- ${finding.severity.toUpperCase()} \`${finding.rule}\` ${finding.core_item_id} ${finding.language} ${finding.field}: ${finding.detail}`,
        ),
      ]
    : ["", "No findings."]),
  "",
  "## Remaining Gate",
  "",
  "Final source-assisted QA, semantic preservation evidence, target example naturalness evidence and export checks are still required before delivery.",
  "",
].join("\n");

await fs.writeFile(auditMdPath, md);

console.log(JSON.stringify({ auditJsonPath, auditMdPath, ...counts, findings_by_rule: findingsByRule }, null, 2));
