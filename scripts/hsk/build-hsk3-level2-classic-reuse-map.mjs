import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "hsk3_level_2_200_v1";
const DATE = "20260604";
const OVERLAP_PATH = path.join(ROOT, "outputs/hsk/qa/hsk3_level_2_200_v1_classic_overlap_20260604.json");
const JSON_OUT = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_classic_reuse_map_${DATE}.json`);
const MD_OUT = path.join(ROOT, `outputs/hsk/qa/${RELEASE_ID}_classic_reuse_map_${DATE}.md`);

const tonePolicyWords = new Map([
  ["地", "HSK 3.0 uses neutral `de` for the adverbial particle. Keep HSK 3.0 official pinyin."],
  ["得", "HSK 3.0 uses neutral `de` for the complement particle. Keep HSK 3.0 official pinyin."],
  ["个子", "HSK 3.0 uses neutral-style `gèzi`; Classic stores spaced neutral-style `gè zi`."],
  ["记得", "HSK 3.0 uses neutral-style `jìde`; Classic stores spaced neutral-style `jì de`."],
  ["一会儿", "HSK 3.0 uses erhua contraction `yíhuìr`; Classic stores full-form `yī huì er`."],
]);

const selectedClassicByOrder = new Map([
  [
    358,
    {
      classic_level: 3,
      classic_order: 97,
      note: "HSK3 `花2` is the noun/adjectival flower sense, so it must select Classic `花` row 97, not Classic row 96 `to spend; to cost`.",
    },
  ],
]);

function stripSpaces(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[\s’']/gu, "")
    .toLocaleLowerCase("en-US");
}

function stripTonesAndSpaces(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/ü/gu, "u")
    .replace(/Ü/gu, "U")
    .replace(/[\s’']/gu, "")
    .toLocaleLowerCase("en-US");
}

function classify(row) {
  if (row.overlap_type === "absent_as_exact_classic_word") {
    return {
      classic_reuse_class: "absent_as_exact_classic_word",
      classic_reuse_allowed: false,
      classic_reuse_notes: "No exact simplified-word Classic row found. Requires fresh HSK 3.0 work.",
    };
  }

  const matches = row.classic_matches ?? [];
  const firstMatch = matches[0];
  if (!firstMatch) {
    return {
      classic_reuse_class: "overlap_inconsistent",
      classic_reuse_allowed: false,
      classic_reuse_notes: "Overlap row is exact but has no Classic match.",
    };
  }

  const selectedOverride = selectedClassicByOrder.get(row.hsk3_order);
  if (selectedOverride) {
    const overrideMatch = matches.find(
      (match) =>
        match.classic_level === selectedOverride.classic_level && match.classic_order === selectedOverride.classic_order
    );
    if (overrideMatch) {
      return {
        classic_reuse_class: "variant_ok",
        classic_reuse_allowed: true,
        classic_reuse_notes: selectedOverride.note,
        selected_classic_match: overrideMatch,
      };
    }
  }

  const exactPinyinMatch = matches.find((match) => match.pinyin_same === true);
  if (exactPinyinMatch) {
    return {
      classic_reuse_class: "exact_same_pinyin",
      classic_reuse_allowed: true,
      classic_reuse_notes:
        matches.length > 1 && matches.some((match) => match !== exactPinyinMatch)
          ? "Exact simplified word and exact HSK3.0 pinyin match one Classic row. Other Classic readings exist and must not override the HSK3.0 reading."
          : "Exact simplified word and exact pinyin string match Classic. Still requires row-level sense check before copying examples.",
      selected_classic_match: exactPinyinMatch,
    };
  }

  const hsk3Pinyin = row.hsk3_pinyin;
  const styleMatch = matches.find((match) => stripSpaces(hsk3Pinyin) === stripSpaces(match.classic_pinyin));
  if (styleMatch) {
    return {
      classic_reuse_class: "style_only_pinyin",
      classic_reuse_allowed: true,
      classic_reuse_notes: "Pinyin differs only by spacing/apostrophe style. HSK 3.0 official pinyin should remain card-facing.",
      selected_classic_match: styleMatch,
    };
  }

  if (tonePolicyWords.has(row.hsk3_simplified)) {
    return {
      classic_reuse_class: "tone_or_neutral_policy",
      classic_reuse_allowed: true,
      classic_reuse_notes: tonePolicyWords.get(row.hsk3_simplified),
      selected_classic_match: firstMatch,
    };
  }

  const toneBaseMatch = matches.find((match) => stripTonesAndSpaces(hsk3Pinyin) === stripTonesAndSpaces(match.classic_pinyin));
  if (toneBaseMatch) {
    return {
      classic_reuse_class: "tone_or_neutral_policy",
      classic_reuse_allowed: true,
      classic_reuse_notes: "Same Latin pinyin base but tone/neutral-tone display differs. Keep HSK 3.0 official pinyin.",
      selected_classic_match: toneBaseMatch,
    };
  }

  return {
    classic_reuse_class: "reading_difference_review",
    classic_reuse_allowed: false,
    classic_reuse_notes: "Exact simplified word but pinyin base differs. Requires HSK 3.0 sense-specific handling before reuse.",
  };
}

const overlap = JSON.parse(await fs.readFile(OVERLAP_PATH, "utf8"));
const rows = overlap.rows.map((row) => {
  const classification = classify(row);
  const firstMatch = classification.selected_classic_match ?? row.classic_matches?.[0] ?? null;
  return {
    hsk3_order: row.hsk3_order,
    hsk3_level: row.hsk3_level,
    hsk3_source_word: row.hsk3_source_word,
    hsk3_simplified: row.hsk3_simplified,
    hsk3_pinyin: row.hsk3_pinyin,
    hsk3_pos: row.hsk3_pos,
    classic_reuse_class: classification.classic_reuse_class,
    classic_reuse_allowed: classification.classic_reuse_allowed,
    classic_reuse_notes: classification.classic_reuse_notes,
    classic_match_count: row.classic_matches?.length ?? 0,
    first_classic_release_id: firstMatch?.classic_release_id ?? "",
    first_classic_level: firstMatch?.classic_level ?? "",
    first_classic_order: firstMatch?.classic_order ?? "",
    first_classic_source_word: firstMatch?.classic_source_word ?? "",
    first_classic_pinyin: firstMatch?.classic_pinyin ?? "",
    first_classic_en: firstMatch?.classic_en ?? "",
  };
});

const classCounts = {};
for (const row of rows) classCounts[row.classic_reuse_class] = (classCounts[row.classic_reuse_class] ?? 0) + 1;

const report = {
  release_id: RELEASE_ID,
  generated_at: new Date().toISOString(),
  source_overlap_report: path.relative(ROOT, OVERLAP_PATH),
  row_count: rows.length,
  class_counts: classCounts,
  reuse_allowed_rows: rows.filter((row) => row.classic_reuse_allowed).length,
  reuse_blocked_rows: rows.filter((row) => !row.classic_reuse_allowed).length,
  notes: [
    "This map classifies exact Classic overlap for planning only.",
    "Allowed does not mean blind copy: HSK 3.0 official pinyin remains card-facing and examples still require row-level sense checks.",
    "Classic HSK files, DB rows and Google Sheets are not mutated by this map.",
  ],
  rows,
};

await fs.mkdir(path.dirname(JSON_OUT), { recursive: true });
await fs.writeFile(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(
  MD_OUT,
  [
    `# ${RELEASE_ID} Classic Reuse Map`,
    "",
    `Rows: ${rows.length}`,
    `Reuse allowed candidates: ${report.reuse_allowed_rows}`,
    `Reuse blocked rows: ${report.reuse_blocked_rows}`,
    `Class counts: ${JSON.stringify(classCounts)}`,
    "",
    "This is a planning map only. It does not copy Classic examples/translations and does not mutate Classic releases.",
    "",
    "Blocked rows:",
    ...rows
      .filter((row) => !row.classic_reuse_allowed)
      .map((row) => `- ${row.hsk3_order} ${row.hsk3_source_word}: ${row.classic_reuse_class}; ${row.classic_reuse_notes}`),
    "",
  ].join("\n")
);

console.log(
  JSON.stringify(
    {
      release_id: RELEASE_ID,
      rows: rows.length,
      class_counts: classCounts,
      reuse_allowed_rows: report.reuse_allowed_rows,
      reuse_blocked_rows: report.reuse_blocked_rows,
      json: path.relative(ROOT, JSON_OUT),
      md: path.relative(ROOT, MD_OUT),
    },
    null,
    2
  )
);
