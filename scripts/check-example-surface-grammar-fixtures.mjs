#!/usr/bin/env node
import {
  buildExampleSurfaceGrammarFindings,
  validateExampleSurfaceGrammar,
} from "./lib/example-surface-grammar.mjs";

const badRows = [
  {
    set_id: "fixture",
    meaning_id: "hu_charger",
    language_code: "HU",
    canonical_example_en: "The charger is in the drawer.",
    example_text: "A(z) töltő a fiókban van.",
  },
  {
    set_id: "fixture",
    meaning_id: "et_conditioner",
    language_code: "ET",
    canonical_example_en: "The conditioner is beside the shampoo.",
    example_text: "Palsam on kõrval šampoon.",
  },
  {
    set_id: "fixture",
    meaning_id: "fi_body_wash",
    language_code: "FI",
    canonical_example_en: "The body wash is on the bathroom shelf.",
    example_text: "Suihkusaippua on päällä kylpyhuoneen hylly.",
  },
  {
    set_id: "fixture",
    meaning_id: "hr_faucet",
    language_code: "HR",
    canonical_example_en: "The faucet is above the sink.",
    example_text: "Slavina je iznad umivaonik.",
  },
  {
    set_id: "fixture",
    meaning_id: "hr_gloves",
    language_code: "HR",
    canonical_example_en: "The rubber gloves are under the sink.",
    example_text: "Gumene rukavice je ispod sudopera.",
  },
  {
    set_id: "fixture",
    meaning_id: "ne_espresso",
    language_code: "NE",
    canonical_example_en: "The espresso is in the small cup.",
    example_text: "एस्प्रेसो सानो कपमा छ। (espreso sāno kapamā cha.)",
  },
];

const goodRows = [
  {
    set_id: "fixture",
    meaning_id: "hu_charger",
    language_code: "HU",
    canonical_example_en: "The charger is in the drawer.",
    example_text: "A töltő a fiókban van.",
  },
  {
    set_id: "fixture",
    meaning_id: "hu_power_strip",
    language_code: "HU",
    canonical_example_en: "The power strip is under the desk.",
    example_text: "Az elosztó az íróasztal alatt van.",
  },
  {
    set_id: "fixture",
    meaning_id: "et_conditioner",
    language_code: "ET",
    canonical_example_en: "The conditioner is beside the shampoo.",
    example_text: "Palsam on šampooni kõrval.",
  },
  {
    set_id: "fixture",
    meaning_id: "fi_body_wash",
    language_code: "FI",
    canonical_example_en: "The body wash is on the bathroom shelf.",
    example_text: "Suihkusaippua on kylpyhuoneen hyllyllä.",
  },
  {
    set_id: "fixture",
    meaning_id: "hr_faucet",
    language_code: "HR",
    canonical_example_en: "The faucet is above the sink.",
    example_text: "Slavina je iznad umivaonika.",
  },
  {
    set_id: "fixture",
    meaning_id: "hr_gloves",
    language_code: "HR",
    canonical_example_en: "The rubber gloves are under the sink.",
    example_text: "Gumene rukavice su ispod sudopera.",
  },
  {
    set_id: "fixture",
    meaning_id: "ne_espresso",
    language_code: "NE",
    canonical_example_en: "The espresso is in the small cup.",
    example_text: "एस्प्रेसो सानो कपमा छ।",
  },
];

for (const row of badRows) {
  const issues = validateExampleSurfaceGrammar(row);
  if (issues.length === 0) {
    throw new Error(`Expected fixture blocker for ${row.language_code}/${row.meaning_id}`);
  }
}

for (const row of goodRows) {
  const issues = validateExampleSurfaceGrammar(row);
  if (issues.length > 0) {
    throw new Error(`Unexpected fixture blocker for ${row.language_code}/${row.meaning_id}: ${issues.map((issue) => issue.issue).join("; ")}`);
  }
}

const findings = buildExampleSurfaceGrammarFindings([...badRows, ...goodRows]);
if (findings.blockers.length !== badRows.length) {
  throw new Error(`Expected ${badRows.length} fixture blockers, got ${findings.blockers.length}`);
}

console.log(`Example surface grammar fixtures OK: bad=${badRows.length}, good=${goodRows.length}`);
