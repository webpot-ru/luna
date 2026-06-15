#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const releaseId = process.argv[2] ?? "hsk2_classic_level_1_150_v1";
const levelMatch = releaseId.match(/level_(\d+)_/u);
const rowCountMatch = releaseId.match(/level_\d+_(\d+)_/u);
const hskLevel = levelMatch ? Number(levelMatch[1]) : 1;
const expectedRows = rowCountMatch ? Number(rowCountMatch[1]) : null;

const outputDir = path.resolve("outputs/hsk");
const qaDir = path.join(outputDir, "qa");
const csvPath = path.join(outputDir, `${releaseId}.csv`);
const sourcePath = path.join(outputDir, "source", `${releaseId}.source.json`);
const overridesPath = path.resolve(`config/hsk-classic-hsk${hskLevel}-card-overrides.json`);
const examplesPath = path.resolve(`config/hsk-classic-hsk${hskLevel}-examples.json`);

const toneNumberPattern = /[a-züv:][1-5]\b/iu;
const toneMarkPattern = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ]/iu;
const hanPattern = /\p{Script=Han}/u;
const latinLetterPattern = /\p{Script=Latin}/u;
const hskPlaceholderPatterns = [
  /^我今天学习“.+”这个词。$/u,
  /^这个词是“.+”。$/u,
];
const rawEnglishPatterns = [
  /^surname\b/iu,
  /\bvariant of\b/iu,
  /\bused in\b/iu,
  /\barchaic\b/iu,
  /\babbr\./iu,
  /\bold variant\b/iu,
  /[\u3400-\u9fff]/u,
  /\bCL:/iu,
];
const obviousPinyinArtifacts = [
  /\bnv[1-5]\b/iu,
  /\blv[1-5]\b/iu,
  /&[a-z]+;/iu,
  /&#\d+;/u,
];

function todayStamp() {
  return new Date().toISOString().slice(0, 10).replace(/-/gu, "");
}

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
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
  return { headers, rows };
}

function rowKey(row) {
  return `${row.hsk_order}:${row.simplified}`;
}

function sourceKey(entry, index) {
  return entry.hsk_canonical_source?.hsk_key ?? entry.hsk_key ?? `${index + 1}:${entry.simplified}`;
}

function lookupCurated(curated, row) {
  return curated[rowKey(row)] ?? curated[row.simplified];
}

function compact(value) {
  return String(value ?? "").replace(/\s+/gu, " ").trim().slice(0, 220);
}

function issue(type, severity, row, field, message, extra = {}) {
  return {
    type,
    severity,
    hsk_order: row ? Number(row.hsk_order) : "",
    hsk_key: row ? rowKey(row) : "",
    simplified: row?.simplified ?? "",
    field,
    message,
    ...extra,
  };
}

function hasToneMark(value) {
  return toneMarkPattern.test(String(value ?? ""));
}

function hasToneNumber(value) {
  return toneNumberPattern.test(String(value ?? ""));
}

function hasHan(value) {
  return hanPattern.test(String(value ?? ""));
}

function hasLatinLetter(value) {
  return latinLetterPattern.test(String(value ?? ""));
}

function isPlaceholderExample(value) {
  return hskPlaceholderPatterns.some((pattern) => pattern.test(String(value ?? "").trim()));
}

function requiredSourceParts(simplified) {
  if (String(simplified).includes("…")) {
    return String(simplified)
      .split("…")
      .map((part) => part.replace(/[、/／]/gu, "").trim())
      .filter(Boolean);
  }
  return String(simplified)
    .split(/[、/／]|或/gu)
    .map((part) => part.trim())
    .filter(Boolean);
}

function checkPinyinShape(row, field, value, blockers, warnings) {
  if (!value) {
    blockers.push(issue("missing_chinese_pinyin", "blocker", row, field, "Chinese pinyin field is empty"));
    return;
  }
  if (hasToneNumber(value)) {
    blockers.push(issue("pinyin_tone_number", "blocker", row, field, "Pinyin must use tone marks, not tone numbers", { value: compact(value) }));
  }
  if (hasHan(value)) {
    blockers.push(issue("han_in_pinyin", "blocker", row, field, "Pinyin must not contain Han characters", { value: compact(value) }));
  }
  if (!hasLatinLetter(value)) {
    blockers.push(issue("pinyin_missing_latin_letters", "blocker", row, field, "Pinyin must contain Latin letters", { value: compact(value) }));
  }
  for (const pattern of obviousPinyinArtifacts) {
    if (pattern.test(value)) {
      blockers.push(issue("pinyin_raw_artifact", "blocker", row, field, "Pinyin contains a raw source artifact", { value: compact(value) }));
      break;
    }
  }
  if (!hasToneMark(value)) {
    warnings.push(issue("pinyin_missing_tone_mark", "warning", row, field, "Pinyin has no tone mark; expected only for neutral-tone-only forms or vetted particles", { value: compact(value) }));
  }
}

function checkEnglishGloss(row, value, blockers) {
  if (!value) {
    blockers.push(issue("missing_en_gloss", "blocker", row, "EN", "English gloss is empty"));
    return;
  }
  for (const pattern of rawEnglishPatterns) {
    if (pattern.test(value)) {
      blockers.push(issue("raw_dictionary_artifact_en", "blocker", row, "EN", "English gloss contains raw dictionary/source artifact", { value: compact(value) }));
      return;
    }
  }
}

async function main() {
  const [csvText, sourceText, overridesText, examplesText] = await Promise.all([
    fs.readFile(csvPath, "utf8"),
    fs.readFile(sourcePath, "utf8"),
    fs.readFile(overridesPath, "utf8"),
    fs.readFile(examplesPath, "utf8"),
  ]);
  const { rows } = parseCsv(csvText);
  const sourceRows = JSON.parse(sourceText);
  const overrides = JSON.parse(overridesText);
  const examples = JSON.parse(examplesText);

  const sourceByKey = new Map(sourceRows.map((entry, index) => [sourceKey(entry, index), entry]));
  const sourceBySimplified = new Map();
  for (const [index, entry] of sourceRows.entries()) {
    if (!sourceBySimplified.has(entry.simplified)) sourceBySimplified.set(entry.simplified, []);
    sourceBySimplified.get(entry.simplified).push({ entry, index });
  }

  const blockers = [];
  const warnings = [];
  const seenOrders = new Set();
  let placeholderExamples = 0;
  let curatedExamples = 0;

  if (expectedRows !== null && rows.length !== expectedRows) {
    blockers.push(issue("row_count_mismatch", "blocker", null, "hsk_order", `Expected ${expectedRows} rows, got ${rows.length}`));
  }
  if (sourceRows.length !== rows.length) {
    blockers.push(issue("source_row_count_mismatch", "blocker", null, "source", `Source row count ${sourceRows.length} differs from workbook rows ${rows.length}`));
  }

  for (const row of rows) {
    seenOrders.add(Number(row.hsk_order));
    const source = sourceByKey.get(rowKey(row));
    const simplifiedSources = sourceBySimplified.get(row.simplified) ?? [];
    const override = lookupCurated(overrides, row);
    const example = lookupCurated(examples, row);

    if (!source && simplifiedSources.length === 0) {
      blockers.push(issue("missing_source_row", "blocker", row, "simplified", "Workbook row is absent from source snapshot"));
    }
    if (!override) {
      blockers.push(issue("missing_card_override", "blocker", row, "pinyin", "Missing card override row"));
    }
    if (!example) {
      blockers.push(issue("missing_example_row", "blocker", row, "example_zh", "Missing curated example row"));
    }

    if (!row.simplified || !hasHan(row.simplified)) {
      blockers.push(issue("bad_simplified_shape", "blocker", row, "simplified", "Simplified source item must contain Han characters", { value: compact(row.simplified) }));
    }
    if (!row.traditional || !hasHan(row.traditional)) {
      blockers.push(issue("bad_traditional_shape", "blocker", row, "traditional", "Traditional source item must contain Han characters", { value: compact(row.traditional) }));
    }
    if (override) {
      if (row.traditional !== override.traditional) {
        blockers.push(issue("traditional_override_mismatch", "blocker", row, "traditional", "Workbook traditional must match card override", { expected: compact(override.traditional), actual: compact(row.traditional) }));
      }
      if (row.pinyin !== override.pinyin) {
        blockers.push(issue("pinyin_override_mismatch", "blocker", row, "pinyin", "Workbook pinyin must match card override", { expected: compact(override.pinyin), actual: compact(row.pinyin) }));
      }
      checkEnglishGloss(row, override.en, blockers);
    }

    checkPinyinShape(row, "pinyin", row.pinyin, blockers, warnings);

    if (example) {
      if (row.example_zh !== example.example_zh) {
        blockers.push(issue("example_zh_mismatch", "blocker", row, "example_zh", "Workbook example_zh must match examples file", { expected: compact(example.example_zh), actual: compact(row.example_zh) }));
      }
      if (row.example_pinyin !== example.example_pinyin) {
        blockers.push(issue("example_pinyin_mismatch", "blocker", row, "example_pinyin", "Workbook example_pinyin must match examples file", { expected: compact(example.example_pinyin), actual: compact(row.example_pinyin) }));
      }
      if (row.example_EN !== example.example_en) {
        blockers.push(issue("example_en_mismatch", "blocker", row, "example_EN", "Workbook example_EN must match examples file", { expected: compact(example.example_en), actual: compact(row.example_EN) }));
      }
      if (!row.example_zh || !hasHan(row.example_zh)) {
        blockers.push(issue("bad_example_zh_shape", "blocker", row, "example_zh", "Chinese example must contain Han characters", { value: compact(row.example_zh) }));
      }
      if (isPlaceholderExample(row.example_zh)) {
        placeholderExamples += 1;
        blockers.push(issue("placeholder_chinese_example", "blocker", row, "example_zh", "Chinese example is still a structural placeholder", { value: compact(row.example_zh) }));
      } else {
        curatedExamples += 1;
      }
      const parts = requiredSourceParts(row.simplified);
      if (parts.length && !parts.every((part) => row.example_zh.includes(part))) {
        blockers.push(issue("example_missing_exact_source_item", "blocker", row, "example_zh", "Chinese example must contain the exact simplified source item", { required: parts, value: compact(row.example_zh) }));
      }
      checkPinyinShape(row, "example_pinyin", row.example_pinyin, blockers, warnings);
      if (rawEnglishPatterns.some((pattern) => pattern.test(row.example_EN ?? ""))) {
        blockers.push(issue("raw_dictionary_artifact_example_en", "blocker", row, "example_EN", "English example contains raw dictionary/source artifact", { value: compact(row.example_EN) }));
      }
      if (!row.example_EN || hasHan(row.example_EN)) {
        blockers.push(issue("bad_example_en_shape", "blocker", row, "example_EN", "English example must be non-empty and must not contain Han characters", { value: compact(row.example_EN) }));
      }
    }
  }

  for (let i = 1; expectedRows !== null && i <= expectedRows; i += 1) {
    if (!seenOrders.has(i)) {
      blockers.push(issue("missing_hsk_order", "blocker", null, "hsk_order", `Missing hsk_order ${i}`));
    }
  }

  const report = {
    release_id: releaseId,
    hsk_level: hskLevel,
    generated_at: new Date().toISOString(),
    rows_checked: rows.length,
    expected_rows: expectedRows,
    source_rows: sourceRows.length,
    curated_examples: curatedExamples,
    placeholder_examples: placeholderExamples,
    blockers: blockers.length,
    warnings: warnings.length,
    blocker_type_counts: countByType(blockers),
    warning_type_counts: countByType(warnings),
    blocker_samples: blockers.slice(0, 250),
    warning_samples: warnings.slice(0, 250),
    notes: [
      "This is an HSK-only Chinese gate. It reads HSK source, card override, example and workbook CSV files only.",
      "It does not mutate ordinary deck, Oxford, Polyglot or database pipelines.",
      "Passing this automated gate is not equivalent to external native-speaker approval.",
    ],
  };

  await fs.mkdir(qaDir, { recursive: true });
  const reportPath = path.join(qaDir, `${releaseId}_chinese_gate_${todayStamp()}.json`);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        release_id: releaseId,
        rows_checked: rows.length,
        curated_examples: curatedExamples,
        placeholder_examples: placeholderExamples,
        blockers: blockers.length,
        warnings: warnings.length,
        report: path.relative(process.cwd(), reportPath),
      },
      null,
      2
    )
  );

  if (blockers.length) process.exitCode = 1;
}

function countByType(items) {
  const counts = {};
  for (const item of items) counts[item.type] = (counts[item.type] ?? 0) + 1;
  return counts;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
