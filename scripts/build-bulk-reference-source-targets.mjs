#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const groupsFilter = args
  .find((arg) => arg.startsWith("--groups="))
  ?.slice("--groups=".length)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const languageFilter = args
  .find((arg) => arg.startsWith("--languages="))
  ?.slice("--languages=".length)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const opusCorpusFilter = args
  .find((arg) => arg.startsWith("--opus-corpora="))
  ?.slice("--opus-corpora=".length)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const configPath =
  args.find((arg) => arg.startsWith("--config="))?.slice("--config=".length) ?? "reference-sources/bulk-source-groups.json";
const outPath =
  args.find((arg) => arg.startsWith("--out="))?.slice("--out=".length) ??
  "outputs/source-preflight/bulk_reference_source_targets.json";

function usage() {
  return [
    "Usage: node scripts/build-bulk-reference-source-targets.mjs [--groups=freedict-bulk,panlex-meanings,unimorph-bulk,tatoeba,opus,panlex,wikidata-lexical,concepticon-cldf,hunspell,wikipron] [--languages=ES,FR] [--config=path] [--out=path]",
    "Builds a machine-readable target file for scripts/fetch-optional-tool-sources.mjs.",
  ].join("\n");
}

if (args.includes("--help")) {
  console.log(usage());
  process.exit(0);
}

const enabledGroups = new Set(
  groupsFilter ?? ["freedict-bulk", "panlex-meanings", "unimorph-bulk", "tatoeba", "opus", "panlex", "wikidata-lexical", "concepticon-cldf", "hunspell", "wikipron"]
);
const enabledLanguages = languageFilter ? new Set(languageFilter) : null;
const enabledOpusCorpora = opusCorpusFilter ? new Set(opusCorpusFilter) : null;

function includeGroup(group) {
  return enabledGroups.has(group);
}

function includeLanguage(languageCode) {
  return !enabledLanguages || enabledLanguages.has(languageCode);
}

function latestSourceRelease(entry) {
  return (entry.releases ?? []).find((release) => release.platform === "src" && release.URL);
}

function localFreeDictPath(pair, release) {
  const filename = release.URL.split("/").pop();
  return `reference-sources/raw/freedict/dictionaries/${pair}/${filename}`;
}

function panlexMeaningLocalPath(code) {
  return `reference-sources/raw/panlex-meanings-hf/data/${code}.tsv`;
}

const config = JSON.parse(await readFile(configPath, "utf8"));
const targets = [];

if (includeGroup("freedict-bulk")) {
  const db = JSON.parse(await readFile("reference-sources/raw/freedict/freedict-database.json", "utf8"));
  const entryByName = new Map(db.map((entry) => [entry.name, entry]));
  for (const item of config.freedict_active_language_targets ?? []) {
    if (!includeLanguage(item.language_code)) continue;
    const pair = `eng-${item.freedict_code}`;
    const entry = entryByName.get(pair);
    const release = entry ? latestSourceRelease(entry) : null;
    if (!release) continue;
    targets.push({
      id: `freedict-${pair}-src`,
      source_id: "freedict-database-index",
      group: "freedict-bulk",
      adapter: "freedict",
      language_code: item.language_code,
      pair,
      url: release.URL,
      local_path: localFreeDictPath(pair, release),
      expected_bytes: Number(release.size),
      expected_checksum: release.checksum ?? "",
      license_note:
        `FreeDict ${pair} source archive discovered from local FreeDict database index. Candidate translation support only; TEI/header licence must be checked before exact evidence.`,
    });
  }
}

if (includeGroup("panlex-meanings")) {
  const seenCodes = new Set();
  for (const item of config.panlex_meaning_active_language_targets ?? []) {
    if (!includeLanguage(item.language_code)) continue;
    if (seenCodes.has(item.panlex_code)) continue;
    seenCodes.add(item.panlex_code);
    targets.push({
      id: `panlex-meanings-${item.panlex_code}`,
      source_id: "panlex-meanings-hf-20240301",
      group: "panlex-meanings",
      adapter: "panlex_meaning",
      language_code: item.language_code,
      panlex_code: item.panlex_code,
      url: `https://huggingface.co/datasets/cointegrated/panlex-meanings/resolve/main/data/${item.panlex_code}.tsv`,
      local_path: panlexMeaningLocalPath(item.panlex_code),
      license_note:
        "Hugging Face cointegrated/panlex-meanings TSV extracted from PanLex 20240301, CC0-1.0. Use meaning-id joins as source_partial translation candidates only; not final approval.",
    });
  }
}

if (includeGroup("unimorph-bulk")) {
  const seenCodes = new Set();
  for (const item of config.unimorph_active_language_targets ?? []) {
    if (!includeLanguage(item.language_code)) continue;
    if (seenCodes.has(item.unimorph_code)) continue;
    seenCodes.add(item.unimorph_code);
    targets.push({
      id: `unimorph-${item.unimorph_code}`,
      source_id: "tool-unimorph-morphology",
      group: "unimorph-bulk",
      adapter: "unimorph",
      language_code: item.language_code,
      repo: `unimorph/${item.unimorph_code}`,
      url: `https://raw.githubusercontent.com/unimorph/${item.unimorph_code}/master/${item.unimorph_code}`,
      local_path: `reference-sources/raw/unimorph/${item.unimorph_code}/${item.unimorph_code}`,
      license_note: `UniMorph ${item.unimorph_code} data target. Missing repositories are recorded as unavailable_source; present data remains morphology candidate evidence only.`,
    });
  }
}

if (includeGroup("tatoeba")) {
  for (const item of config.tatoeba_exports ?? []) {
    targets.push({
      id: `tatoeba-${item.id}`,
      source_id: "tatoeba-downloads",
      group: "tatoeba",
      adapter: "tatoeba",
      language_code: "multi",
      url: item.url,
      local_path: `reference-sources/raw/tatoeba/${path.basename(item.url)}`,
      license_note:
        "Tatoeba export. Use text/link/tag data as collocation and example sanity evidence only; observe per-sentence licence metadata.",
    });
  }
}

if (includeGroup("opus")) {
  for (const corpus of config.opus_corpora ?? []) {
    if (enabledOpusCorpora && !enabledOpusCorpora.has(corpus.id)) continue;
    for (const language of config.opus_target_languages ?? []) {
      if (!includeLanguage(language.language_code)) continue;
      const opusPair = `en-${language.opus_code}`;
      targets.push({
        id: `opus-${corpus.id}-${corpus.version}-${opusPair}`,
        source_id: "opus-corpora",
        group: "opus",
        adapter: "opus",
        language_code: language.language_code,
        pair: opusPair,
        corpus: corpus.id,
        tier: corpus.tier,
        url: `https://object.pouta.csc.fi/OPUS-${corpus.id}/${corpus.version}/moses/${opusPair}.txt.zip`,
        local_path: `reference-sources/raw/opus/${corpus.id}/${corpus.version}/${opusPair}.txt.zip`,
        license_note:
          `OPUS ${corpus.id} ${corpus.version} Moses pair ${opusPair}. Use as ${corpus.tier} example/collocation sanity only; not translation truth.`,
      });
    }
  }
}

for (const source of config.static_sources ?? []) {
  if (!includeGroup(source.group)) continue;
  targets.push({
    source_id: source.id,
    language_code: "multi",
    ...source,
  });
}

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(
  outPath,
  JSON.stringify(
    {
      version: 1,
      generated_at: new Date().toISOString(),
      config_path: configPath,
      filters: {
        groups: [...enabledGroups].sort(),
        languages: enabledLanguages ? [...enabledLanguages].sort() : null,
        opus_corpora: enabledOpusCorpora ? [...enabledOpusCorpora].sort() : null,
      },
      policy: config.policy,
      targets,
    },
    null,
    2
  ) + "\n"
);

const byGroup = {};
for (const target of targets) byGroup[target.group] = (byGroup[target.group] ?? 0) + 1;
console.log(`Bulk reference source targets: total=${targets.length}, groups=${JSON.stringify(byGroup)}, out=${outPath}`);
