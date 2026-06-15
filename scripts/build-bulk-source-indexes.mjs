#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildConceptIndex,
  buildHunspellIndex,
  buildOpusIndex,
  buildPanlexIndex,
  buildPanlexMeaningsIndex,
  buildTatoebaIndex,
  buildWeakDictionariesIndex,
  buildWeakExamplesIndex,
  buildWikidataIndex,
  bulkIndexStatus,
} from "./lib/bulk-source-indexes.mjs";

const args = process.argv.slice(2);
const sourceArg = args.find((arg) => arg.startsWith("--source="))?.slice("--source=".length) ?? "all";
const maxRows = Number(args.find((arg) => arg.startsWith("--max-rows="))?.slice("--max-rows=".length) ?? 200000);
const outPath =
  args.find((arg) => arg.startsWith("--out="))?.slice("--out=".length) ??
  `outputs/source-preflight/bulk_source_indexes_${new Date().toISOString().replace(/[-:.]/g, "").replace(/Z$/, "Z")}.json`;

function usage() {
  return [
    "Usage: node scripts/build-bulk-source-indexes.mjs --source=tatoeba|opus|panlex|panlex-meanings|weak-dictionaries|weak-examples|wikidata|concepts|hunspell|all [--max-rows=200000] [--out=path]",
    "Builds ignored derived indexes under reference-sources/cache/bulk-source-indexes/.",
  ].join("\n");
}

if (args.includes("--help")) {
  console.log(usage());
  process.exit(0);
}

const builders = {
  tatoeba: buildTatoebaIndex,
  opus: buildOpusIndex,
  panlex: buildPanlexIndex,
  "panlex-meanings": buildPanlexMeaningsIndex,
  "weak-dictionaries": buildWeakDictionariesIndex,
  "weak-examples": buildWeakExamplesIndex,
  wikidata: buildWikidataIndex,
  concepts: buildConceptIndex,
  hunspell: buildHunspellIndex,
};

const selectedSources = sourceArg === "all" ? Object.keys(builders) : sourceArg.split(",").map((item) => item.trim()).filter(Boolean);
for (const source of selectedSources) {
  if (!builders[source]) throw new Error(`Unknown source "${source}". ${usage()}`);
}

const results = [];
for (const source of selectedSources) {
  const startedAt = new Date().toISOString();
  const result = await builders[source]({ maxRows });
  results.push({ ...result, started_at: startedAt, finished_at: new Date().toISOString() });
}

const report = {
  generated_at: new Date().toISOString(),
  source: sourceArg,
  max_rows: maxRows,
  results,
  index_status: await bulkIndexStatus(),
};

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");

const warnings = results.filter((result) => result.warning);
console.log(`Bulk source indexes built: sources=${selectedSources.length}, warnings=${warnings.length}, report=${outPath}`);
for (const warning of warnings) console.log(`${warning.source}: ${warning.warning}`);
