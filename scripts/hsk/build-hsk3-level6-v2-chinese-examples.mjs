import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "hsk3_level_6_1800_v2";
const DATE = "20260612";
const LEGACY_RELEASE_ID = "hsk3_level_6_1400_v1";

const sourcePath = path.join(ROOT, "outputs/hsk/source/hsk3_level_6_1800_v2.source.json");
const reuseMapPath = path.join(ROOT, "outputs/hsk/qa/hsk3_level_6_1800_v2_classic_reuse_map_20260612.json");
const legacyExamplesPath = path.join(ROOT, "config/hsk3-level6-examples.json");
const legacyGlossesPath = path.join(ROOT, "config/hsk3-level6-en-glosses.json");
const manualTsvPath = path.join(ROOT, "config/hsk3-level6-v2-manual-examples.tsv");
const examplesOut = path.join(ROOT, "config/hsk3-level6-v2-examples.json");
const glossesOut = path.join(ROOT, "config/hsk3-level6-v2-en-glosses.json");
const reportOut = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_chinese_examples_build_${DATE}.json`);

function parseTsv(text) {
  const lines = text.trimEnd().split(/\r?\n/u).filter(Boolean);
  const headers = lines.shift()?.split("\t") ?? [];
  return lines.map((line, index) => {
    const values = line.split("\t");
    return {
      line_number: index + 2,
      row: Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex] ?? ""])),
    };
  });
}

function normalized(value) {
  return String(value ?? "").normalize("NFC").trim();
}

function hasToneNumber(value) {
  return /(?:[A-Za-züÜv:]+[1-5]\b|\b[1-5]\s*$)/u.test(value);
}

function requiredSourceParts(row) {
  return [row.simplified].filter(Boolean);
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function loadClassicExamples() {
  const byLevel = new Map();
  for (const level of [1, 2, 3, 4, 5, 6]) {
    const filePath = path.join(ROOT, `config/hsk-classic-hsk${level}-examples.json`);
    byLevel.set(level, JSON.parse(await fs.readFile(filePath, "utf8")));
  }
  return byLevel;
}

function findClassicExample(classicExamples, reuse) {
  const level = Number(reuse.first_classic_level);
  const order = Number(reuse.first_classic_order);
  const sourceWord = reuse.first_classic_source_word || reuse.hsk3_simplified;
  const data = classicExamples.get(level) ?? {};
  return data[`${order}:${sourceWord}`] ?? data[sourceWord] ?? data[reuse.hsk3_simplified] ?? null;
}

async function loadManualRows() {
  try {
    const parsed = parseTsv(await fs.readFile(manualTsvPath, "utf8"));
    return parsed.map(({ line_number: lineNumber, row }) => ({
      lineNumber,
      hskKey: normalized(row.hsk_key),
      sourceWord: normalized(row.source_word),
      simplified: normalized(row.simplified),
      gloss: normalized(row.gloss),
      example_zh: normalized(row.example_zh),
      example_pinyin: normalized(row.example_pinyin),
      example_en: normalized(row.example_en),
    }));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

const [sourceRows, reuseMap, legacyExamples, legacyGlosses, classicExamples, manualRows] = await Promise.all([
  fs.readFile(sourcePath, "utf8").then(JSON.parse),
  fs.readFile(reuseMapPath, "utf8").then(JSON.parse),
  readJsonIfExists(legacyExamplesPath, {}),
  readJsonIfExists(legacyGlossesPath, {}),
  loadClassicExamples(),
  loadManualRows(),
]);

const reuseRows = reuseMap.rows ?? [];
const reuseByOrder = new Map(reuseRows.map((row) => [row.hsk3_order, row]));
const sourceByKey = new Map(sourceRows.map((row) => [row.hsk_key ?? `${row.hsk_order}:${row.source_word}`, row]));
const manualByKey = new Map();
const examples = {};
const glosses = {};
const provenance = [];
const blockers = [];

for (const manual of manualRows) {
  const sourceRow = sourceByKey.get(manual.hskKey);
  if (!manual.hskKey) {
    blockers.push({ issue: "manual_blank_hsk_key", line: manual.lineNumber });
    continue;
  }
  if (!sourceRow) {
    blockers.push({ issue: "manual_key_not_in_hsk3_source", line: manual.lineNumber, hsk_key: manual.hskKey });
    continue;
  }
  if (manualByKey.has(manual.hskKey)) {
    blockers.push({ issue: "manual_duplicate_hsk_key", line: manual.lineNumber, hsk_key: manual.hskKey });
    continue;
  }
  if (manual.sourceWord !== sourceRow.source_word) {
    blockers.push({
      issue: "manual_source_word_mismatch",
      line: manual.lineNumber,
      hsk_key: manual.hskKey,
      expected: sourceRow.source_word,
      actual: manual.sourceWord,
    });
  }
  if (manual.simplified !== sourceRow.simplified) {
    blockers.push({
      issue: "manual_simplified_mismatch",
      line: manual.lineNumber,
      hsk_key: manual.hskKey,
      expected: sourceRow.simplified,
      actual: manual.simplified,
    });
  }
  manualByKey.set(manual.hskKey, manual);
}

for (const sourceRow of sourceRows) {
  const hskKey = sourceRow.hsk_key ?? `${sourceRow.hsk_order}:${sourceRow.source_word}`;
  const reuse = reuseByOrder.get(sourceRow.hsk_order);
  const rawManual = manualByKey.get(hskKey);
  const manual =
    rawManual && rawManual.gloss && rawManual.example_zh && rawManual.example_pinyin && rawManual.example_en
      ? rawManual
      : null;
  let value = null;
  let gloss = "";
  let source = "";

  if (sourceRow.hsk_order <= 5000 && legacyExamples[hskKey] && legacyGlosses[hskKey]) {
    value = legacyExamples[hskKey];
    gloss = legacyGlosses[hskKey];
    source = LEGACY_RELEASE_ID;
  } else if (manual) {
    value = {
      example_zh: manual.example_zh,
      example_pinyin: manual.example_pinyin,
      example_en: manual.example_en,
    };
    gloss = manual.gloss;
    source = "hsk3_v2_manual";
  } else if (reuse?.classic_reuse_allowed) {
    const classic = findClassicExample(classicExamples, reuse);
    if (classic) {
      value = {
        example_zh: classic.example_zh,
        example_pinyin: classic.example_pinyin,
        example_en: classic.example_en,
      };
      gloss = reuse.first_classic_en || "";
      source = `classic_hsk${reuse.first_classic_level}:${reuse.first_classic_order}:${reuse.first_classic_source_word}`;
    }
  }

  if (!value) {
    blockers.push({
      order: sourceRow.hsk_order,
      hsk_key: hskKey,
      word: sourceRow.source_word,
      issue: reuse?.classic_reuse_allowed ? "missing_classic_example" : "missing_hsk3_v2_manual_example",
      reuse_class: reuse?.classic_reuse_class ?? "",
    });
    continue;
  }
  if (!gloss) {
    blockers.push({ order: sourceRow.hsk_order, hsk_key: hskKey, word: sourceRow.source_word, issue: "missing_gloss" });
  }
  if (!requiredSourceParts(sourceRow).every((part) => value.example_zh.includes(part))) {
    blockers.push({
      order: sourceRow.hsk_order,
      hsk_key: hskKey,
      word: sourceRow.source_word,
      issue: "example_missing_source_word",
      example_zh: value.example_zh,
    });
  }
  if (hasToneNumber(value.example_pinyin)) {
    blockers.push({
      order: sourceRow.hsk_order,
      hsk_key: hskKey,
      word: sourceRow.source_word,
      issue: "tone_number_pinyin",
      example_pinyin: value.example_pinyin,
    });
  }

  examples[hskKey] = value;
  glosses[hskKey] = gloss;
  provenance.push({
    order: sourceRow.hsk_order,
    hsk_key: hskKey,
    source_word: sourceRow.source_word,
    simplified: sourceRow.simplified,
    source,
    reuse_class: reuse?.classic_reuse_class ?? "",
  });
}

const sourceOrders = new Set(sourceRows.map((row) => row.hsk_order));
for (const item of provenance) {
  if (!sourceOrders.has(item.order)) blockers.push({ order: item.order, issue: "provenance_order_not_in_hsk3_source" });
}

const report = {
  release_id: RELEASE_ID,
  generated_at: new Date().toISOString(),
  status: blockers.length ? "blocked" : "ok",
  examples: Object.keys(examples).length,
  glosses: Object.keys(glosses).length,
  legacy_examples: provenance.filter((row) => row.source === LEGACY_RELEASE_ID).length,
  manual_examples: provenance.filter((row) => row.source === "hsk3_v2_manual").length,
  classic_reuse_examples: provenance.filter((row) => row.source.startsWith("classic_hsk")).length,
  pending_manual_examples: sourceRows.length - Object.keys(examples).length,
  manual_tsv: path.relative(ROOT, manualTsvPath),
  blockers,
  provenance,
  notes: [
    "This builder keeps the legacy 1400-row Level 6 Chinese layer immutable and writes separate Level 6 v2 files.",
    "Rows 3601-5000 are copied from hsk3_level_6_1400_v1 when present.",
    "Rows 5001-5400 use row-level Classic reuse when allowed; blocked rows must be authored in config/hsk3-level6-v2-manual-examples.tsv.",
    "This script does not build a workbook, import Docker/Postgres rows or upload Google Sheets.",
  ],
};

await fs.writeFile(examplesOut, `${JSON.stringify(examples, null, 2)}\n`);
await fs.writeFile(glossesOut, `${JSON.stringify(glosses, null, 2)}\n`);
await fs.mkdir(path.dirname(reportOut), { recursive: true });
await fs.writeFile(reportOut, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      release_id: RELEASE_ID,
      status: report.status,
      examples: report.examples,
      glosses: report.glosses,
      legacy_examples: report.legacy_examples,
      manual_examples: report.manual_examples,
      classic_reuse_examples: report.classic_reuse_examples,
      pending_manual_examples: report.pending_manual_examples,
      blockers: blockers.length,
      output_examples: path.relative(ROOT, examplesOut),
      output_glosses: path.relative(ROOT, glossesOut),
      report: path.relative(ROOT, reportOut),
    },
    null,
    2
  )
);

if (blockers.length) process.exitCode = 1;
