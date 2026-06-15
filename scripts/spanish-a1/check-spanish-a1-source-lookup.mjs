#!/usr/bin/env node
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { createGunzip } from "node:zlib";

const ROOT = process.cwd();

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const contractPath = path.resolve(args.get("contract") ?? "config/spanish-a1-core-release-contract-v1.json");

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function key(value) {
  return normalizeText(value).toLocaleLowerCase("es");
}

function rel(filePath) {
  return path.relative(ROOT, filePath);
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function addTarget(targets, value) {
  const normalized = key(value);
  if (normalized && normalized !== "not_applicable") targets.add(normalized);
}

function collectKaikkiEvidence(entry) {
  const genders = new Set();
  const tags = new Set();
  const glosses = [];
  const soundIpa = [];

  for (const template of entry.head_templates ?? []) {
    for (const [argKey, value] of Object.entries(template.args ?? {})) {
      if (!/^g\d*$/u.test(argKey)) continue;
      for (const part of String(value).split(/[|,;]/u)) {
        const token = part.trim();
        if (token === "m") genders.add("masculine");
        if (token === "f") genders.add("feminine");
        if (token) tags.add(`g:${token}`);
      }
    }
  }

  for (const sense of entry.senses ?? []) {
    for (const tag of sense.tags ?? []) {
      const normalizedTag = key(tag);
      tags.add(normalizedTag);
      if (normalizedTag === "masculine") genders.add("masculine");
      if (normalizedTag === "feminine") genders.add("feminine");
      if (normalizedTag === "common-gender") genders.add("common");
      if (normalizedTag === "invariable") genders.add("invariable");
    }
    for (const gloss of sense.glosses ?? []) {
      if (glosses.length < 3) glosses.push(normalizeText(gloss));
    }
  }

  for (const sound of entry.sounds ?? []) {
    if (sound.ipa && soundIpa.length < 2) soundIpa.push(sound.ipa);
  }

  return {
    word: entry.word,
    pos: entry.pos,
    genders: [...genders].sort(),
    tags: [...tags].slice(0, 12).sort(),
    glosses,
    ipa: soundIpa,
  };
}

async function buildKaikkiIndex(kaikkiPath, targets) {
  const matches = new Map();
  const stream = createReadStream(kaikkiPath).pipe(createGunzip());
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of lines) {
    if (!line.trim()) continue;
    const parsed = JSON.parse(line);
    const wordKey = key(parsed.word);
    if (!targets.has(wordKey)) continue;
    const bucket = matches.get(wordKey) ?? [];
    bucket.push(collectKaikkiEvidence(parsed));
    matches.set(wordKey, bucket);
  }

  return matches;
}

async function buildUnimorphVerbIndex(unimorphPath, verbTargets) {
  const formsByLemma = new Map();
  const lines = readline.createInterface({ input: createReadStream(unimorphPath), crlfDelay: Infinity });
  for await (const line of lines) {
    const [lemma, form, features] = line.split("\t");
    const lemmaKey = key(lemma);
    if (!verbTargets.has(lemmaKey)) continue;
    const bucket = formsByLemma.get(lemmaKey) ?? { lemma, forms: 0, hasNfin: false, samples: [] };
    bucket.forms += 1;
    if (features?.includes("NFIN")) bucket.hasNfin = true;
    if (bucket.samples.length < 5) bucket.samples.push({ form, features });
    formsByLemma.set(lemmaKey, bucket);
  }
  return formsByLemma;
}

function candidateKeys(row) {
  const values = new Set();
  addTarget(values, row.source_lemma);
  addTarget(values, row.display_ES);
  addTarget(values, row.display_ES_419);
  if (row.verb_infinitive !== "not_applicable") addTarget(values, row.verb_infinitive);
  return [...values];
}

function reflexiveBase(value) {
  const normalized = key(value);
  if (normalized.endsWith("arse") || normalized.endsWith("erse") || normalized.endsWith("irse")) {
    return normalized.slice(0, -2);
  }
  return "";
}

function genderMismatch(row, evidence) {
  if (row.part_of_speech !== "noun") return null;
  const expected = normalizeText(row.gender);
  if (!["masculine", "feminine", "common", "invariable"].includes(expected)) return null;
  const evidenceGenders = new Set(evidence.flatMap((entry) => entry.genders));
  if (!evidenceGenders.size) return null;
  if (evidenceGenders.has(expected)) return null;
  if (expected === "common" && evidenceGenders.has("masculine") && evidenceGenders.has("feminine")) return null;
  return [...evidenceGenders].sort();
}

async function main() {
  const contract = await readJson(contractPath);
  const releaseId = args.get("release") ?? contract.default_release.release_id;
  const runDate = args.get("date") ?? todayStamp();
  const candidatePoolPath = path.resolve(
    args.get("candidate-pool") ?? `outputs/spanish-a1-core/candidate-pools/${releaseId}_candidate_pool.jsonl`
  );
  const qaDir = path.resolve(args.get("out-dir") ?? "outputs/spanish-a1-core/source-lookup");
  const reportJson = path.join(qaDir, `${releaseId}_spanish_source_lookup_${runDate}.json`);
  const reportMd = path.join(qaDir, `${releaseId}_spanish_source_lookup_${runDate}.md`);

  const rows = (await readJsonl(candidatePoolPath)).filter((row) => row.selection_decision === "selected");
  const sourceById = new Map((contract.source_policy.local_candidate_sources ?? []).map((source) => [source.source_id, source]));
  const kaikkiPath = path.resolve(sourceById.get("kaikki-spanish")?.local_path ?? "");
  const unimorphPath = path.resolve(sourceById.get("unimorph-spa")?.local_path ?? "");

  const targets = new Set();
  const verbTargets = new Set();
  for (const row of rows) {
    for (const value of candidateKeys(row)) targets.add(value);
    if (row.part_of_speech === "verb") {
      addTarget(verbTargets, row.verb_infinitive);
      addTarget(verbTargets, reflexiveBase(row.verb_infinitive));
    }
  }

  const [kaikki, unimorph] = await Promise.all([
    buildKaikkiIndex(kaikkiPath, targets),
    buildUnimorphVerbIndex(unimorphPath, verbTargets),
  ]);

  const findings = [];
  const advisoryWarnings = [];
  for (const row of rows) {
    const keys = candidateKeys(row);
    const evidence = keys.flatMap((value) => kaikki.get(value) ?? []);
    const mismatch = genderMismatch(row, evidence);
    const verbLookupKeys = row.part_of_speech === "verb" ? [key(row.verb_infinitive), reflexiveBase(row.verb_infinitive)].filter(Boolean) : [];
    const verbEvidence = verbLookupKeys.map((value) => unimorph.get(value)).find(Boolean) ?? null;
    if (!evidence.length) {
      advisoryWarnings.push({
        row_id: row.row_id,
        code: "kaikki_exact_match_missing",
        message: `No exact Kaikki match for ${keys.join(" / ")}.`,
      });
    }
    if (mismatch) {
      advisoryWarnings.push({
        row_id: row.row_id,
        code: "kaikki_gender_review_needed",
        message: `Candidate gender=${row.gender}; Kaikki evidence genders=${mismatch.join("|")}.`,
      });
    }
    if (row.part_of_speech === "verb" && !verbEvidence) {
      advisoryWarnings.push({
        row_id: row.row_id,
        code: "unimorph_verb_missing",
        message: `No UniMorph rows for verb ${row.verb_infinitive}.`,
      });
    }
    findings.push({
      row_id: row.row_id,
      selection_order: row.selection_order,
      display_ES: row.display_ES,
      display_ES_419: row.display_ES_419,
      part_of_speech: row.part_of_speech,
      gender: row.gender,
      article_ES: row.article_ES,
      article_ES_419: row.article_ES_419,
      lookup_keys: keys,
      kaikki_match_count: evidence.length,
      kaikki_pos: [...new Set(evidence.map((entry) => entry.pos))].sort(),
      kaikki_genders: [...new Set(evidence.flatMap((entry) => entry.genders))].sort(),
      kaikki_sample_glosses: [...new Set(evidence.flatMap((entry) => entry.glosses))].slice(0, 3),
      kaikki_sample_ipa: [...new Set(evidence.flatMap((entry) => entry.ipa))].slice(0, 2),
      unimorph_lookup_keys: verbLookupKeys,
      unimorph_forms: verbEvidence?.forms ?? 0,
      unimorph_has_nfin: verbEvidence?.hasNfin ?? false,
      regional_variant_differs:
        row.display_ES !== row.display_ES_419 || row.example_ES !== row.example_ES_419 || row.article_ES !== row.article_ES_419,
      source_lookup_status: evidence.length || verbEvidence ? "source_partial_lookup_found" : "source_lookup_missing_advisory",
    });
  }

  const summary = {
    release_id: releaseId,
    status: "pass_with_advisory_warnings",
    rows: rows.length,
    unique_lookup_targets: targets.size,
    kaikki_exact_match_rows: findings.filter((row) => row.kaikki_match_count > 0).length,
    rows_without_kaikki_exact_match: findings.filter((row) => row.kaikki_match_count === 0).length,
    verb_rows: findings.filter((row) => row.part_of_speech === "verb").length,
    verb_rows_with_unimorph: findings.filter((row) => row.part_of_speech === "verb" && row.unimorph_forms > 0).length,
    regional_variant_rows: findings.filter((row) => row.regional_variant_differs).length,
    advisory_warnings: advisoryWarnings.length,
    blockers: 0,
  };

  await fs.mkdir(qaDir, { recursive: true });
  await fs.writeFile(
    reportJson,
    `${JSON.stringify(
      {
        summary,
        checked_files: {
          contract: rel(contractPath),
          candidate_pool: rel(candidatePoolPath),
          kaikki: rel(kaikkiPath),
          unimorph: rel(unimorphPath),
        },
        advisory_warnings: advisoryWarnings,
        findings,
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await fs.writeFile(
    reportMd,
    [
      `# ${releaseId} Spanish Source Lookup`,
      "",
      `Status: ${summary.status}`,
      `Rows: ${summary.rows}`,
      `Kaikki exact-match rows: ${summary.kaikki_exact_match_rows}`,
      `Rows without Kaikki exact match: ${summary.rows_without_kaikki_exact_match}`,
      `Verb rows with UniMorph: ${summary.verb_rows_with_unimorph}/${summary.verb_rows}`,
      `Regional-variant rows: ${summary.regional_variant_rows}`,
      `Advisory warnings: ${summary.advisory_warnings}`,
      "Blockers: 0",
      "",
      "This lookup is source_partial evidence only. It does not approve generation, does not mutate the candidate pool, does not import Docker/Postgres rows and does not upload Google Sheets.",
      "",
      "## Advisory Warning Samples",
      "",
      ...advisoryWarnings.slice(0, 30).map((warning) => `- ${warning.row_id} ${warning.code}: ${warning.message}`),
      ...(advisoryWarnings.length > 30 ? [`- ... ${advisoryWarnings.length - 30} more advisory warnings in JSON report.`] : []),
      "",
    ].join("\n"),
    "utf8"
  );

  console.log(JSON.stringify({ ...summary, report_json: rel(reportJson), report_md: rel(reportMd) }, null, 2));
}

await main();
