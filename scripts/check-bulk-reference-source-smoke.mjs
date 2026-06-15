#!/usr/bin/env node
import { execFile } from "node:child_process";
import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { buildToolSourceBatchContext, buildToolSourceCandidatesForRow } from "./lib/tool-source-adapters.mjs";
import { bulkIndexStatus, buildBulkSourceHintsForRows } from "./lib/bulk-source-indexes.mjs";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFreeDictPairs = [
  "eng-bul",
  "eng-ces",
  "eng-dan",
  "eng-fin",
  "eng-hin",
  "eng-hrv",
  "eng-hun",
  "eng-ind",
  "eng-jpn",
  "eng-lit",
  "eng-nld",
  "eng-nor",
  "eng-pol",
  "eng-rom",
  "eng-rus",
  "eng-srp",
  "eng-swe",
  "eng-swh",
  "eng-tur",
  "eng-zho",
];

const requiredTatoebaExports = [
  "sentences.tar.bz2",
  "sentences_detailed.tar.bz2",
  "sentences_base.tar.bz2",
  "links.tar.bz2",
  "tags.tar.bz2",
  "user_lists.tar.bz2",
  "sentences_in_lists.tar.bz2",
  "sentences_CC0.tar.bz2",
];

const staticSourceChecks = [
  ["wikidata", "latest-lexemes.json.bz2"],
  ["concepticon", "concepticon-data-master.zip"],
  ["clics", "clics4-main.zip"],
  ["northeuralex", "northeuralex-v4.0.zip"],
  ["hunspell", "libreoffice-dictionaries-master.zip"],
  ["wikipron", "wikipron-cuny-cl-master.zip"],
];

const freeDictProbeRows = [
  { language_code: "ES", canonical_english: "apple", native_word: "manzana" },
  { language_code: "FR", canonical_english: "apple", native_word: "pomme" },
];

const officialDictionaryProbeRows = [
  { language_code: "KO", canonical_english: "door", native_word: "문" },
  { language_code: "TH", canonical_english: "apple", native_word: "แอปเปิ้ล" },
];

const romanizationProbeRows = [
  { language_code: "BN", canonical_english: "marked", native_word: "অংকিত", transcription: "aṅkita" },
];

const panlexProbeRows = [
  { language_code: "DE", canonical_english: "olympic final", native_word: "olympisches Finale" },
];

const panlexMeaningProbeRows = [
  { language_code: "DE", canonical_english: "apple", native_word: "Apfel" },
  { language_code: "ES", canonical_english: "water", native_word: "agua" },
  { language_code: "IT", canonical_english: "water", native_word: "acqua" },
  { language_code: "HU", canonical_english: "door", native_word: "ajtó" },
  { language_code: "KO", canonical_english: "door", native_word: "문" },
];

const weakDictionaryProbeRows = [
  { language_code: "SI", canonical_english: "apple", native_word: "ඇපල්" },
  { language_code: "UZ", canonical_english: "thing", native_word: "narsa" },
  { language_code: "MY", canonical_english: "able", native_word: "" },
  { language_code: "KA", canonical_english: "virus", native_word: "ვირუსი" },
  { language_code: "KN", canonical_english: "hook", native_word: "ಅಂಕ" },
  { language_code: "LV", canonical_english: "abbot", native_word: "abats" },
  { language_code: "SK", canonical_english: "door", native_word: "dvere" },
  { language_code: "SL", canonical_english: "Blacksburg", native_word: "Blacksburg" },
];

const weakExampleProbeRows = [
  { language_code: "MY", canonical_english: "sea", native_word: "ပင်လယ်" },
  { language_code: "SI", canonical_english: "this", native_word: "මෙය" },
  { language_code: "KM", canonical_english: "said", native_word: "" },
  { language_code: "LO", canonical_english: "said", native_word: "" },
  { language_code: "KK", canonical_english: "Kazakhstan", native_word: "Қазақстан" },
];

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "unknown";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function countByAdapterLanguage(rows) {
  const counts = {};
  for (const row of rows) {
    const key = `${row.language_code ?? "??"}:${row.adapter ?? row.source ?? "unknown"}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

async function pathExists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function fileSize(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  const fileStat = await stat(absolutePath);
  return fileStat.size;
}

async function listFiles(root, predicate = () => true) {
  const out = [];
  async function walk(dir) {
    let entries = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (predicate(absolute)) out.push(absolute);
    }
  }
  await walk(path.join(projectRoot, root));
  return out;
}

async function assertPresentFile(relativePath, blockers) {
  const absolutePath = path.join(projectRoot, relativePath);
  if (!(await pathExists(absolutePath))) {
    blockers.push(`Missing file: ${relativePath}`);
    return null;
  }
  const size = await fileSize(relativePath);
  if (size <= 0) blockers.push(`Empty file: ${relativePath}`);
  return size;
}

async function readJsonReport(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  if (!(await pathExists(absolutePath))) return null;
  try {
    return JSON.parse(await readFile(absolutePath, "utf8"));
  } catch {
    return null;
  }
}

async function zipListSmoke(relativePath, blockers) {
  const absolutePath = path.join(projectRoot, relativePath);
  try {
    const { stdout } = await execFileAsync("unzip", ["-l", absolutePath], {
      timeout: 15000,
      maxBuffer: 1024 * 1024,
    });
    if (!stdout.includes("Length")) blockers.push(`Unzip listing did not look valid: ${relativePath}`);
  } catch (error) {
    blockers.push(`Cannot list zip archive ${relativePath}: ${error.message}`);
  }
}

async function bzip2IntegritySmoke(relativePath, blockers) {
  const absolutePath = path.join(projectRoot, relativePath);
  try {
    await execFileAsync("bzip2", ["-tv", absolutePath], {
      timeout: 300000,
      maxBuffer: 1024 * 1024,
    });
  } catch (error) {
    blockers.push(`Cannot verify bzip2 export ${relativePath}: ${error.message}`);
  }
}

async function runFreeDictProbe(blockers, warnings) {
  const context = await buildToolSourceBatchContext({ features: { epitran: false, unimorph: false, apertium: false } });
  let candidateRows = 0;
  const details = [];
  for (const row of freeDictProbeRows) {
    const { candidates } = await buildToolSourceCandidatesForRow(row, context);
    const freeDictCandidate = candidates.find((candidate) => candidate.adapter === "freedict");
    if (freeDictCandidate) {
      candidateRows += 1;
      details.push(`${row.language_code}:${freeDictCandidate.value}`);
    }
  }
  if (candidateRows < 2) {
    warnings.push(`FreeDict probe returned ${candidateRows}/2 common "apple" candidates; expected 2 after bulk download.`);
  }
  return details;
}

async function runOfficialDictionaryProbe(blockers, warnings) {
  const context = await buildToolSourceBatchContext({
    features: { epitran: false, unimorph: false, apertium: false, freedict: false, dbnaryTranslations: false },
  });
  let candidateRows = 0;
  const details = [];
  for (const row of officialDictionaryProbeRows) {
    const { candidates } = await buildToolSourceCandidatesForRow(row, context);
    const officialCandidate = candidates.find((candidate) =>
      ["nikl", "lexitron"].includes(candidate.adapter)
    );
    if (officialCandidate) {
      candidateRows += 1;
      details.push(`${row.language_code}:${officialCandidate.adapter}:${officialCandidate.value}`);
    }
  }
  if (candidateRows < officialDictionaryProbeRows.length) {
    blockers.push(
      `Official dictionary probe returned ${candidateRows}/${officialDictionaryProbeRows.length} candidates; expected NIKL KO and LEXiTRON TH.`
    );
  }
  return details;
}

async function runRomanizationProbe(blockers, warnings) {
  const context = await buildToolSourceBatchContext({
    features: { epitran: false, unimorph: false, apertium: false, freedict: false, dbnaryTranslations: false },
  });
  let candidateRows = 0;
  const details = [];
  for (const row of romanizationProbeRows) {
    const { candidates } = await buildToolSourceCandidatesForRow(row, context);
    const dakshinaCandidate = candidates.find((candidate) => candidate.adapter === "dakshina");
    if (dakshinaCandidate) {
      candidateRows += 1;
      details.push(`${row.language_code}:${dakshinaCandidate.value}`);
    }
  }
  if (candidateRows < romanizationProbeRows.length) {
    warnings.push(
      `Dakshina romanization probe returned ${candidateRows}/${romanizationProbeRows.length} candidates; South Asian romanization sanity may be incomplete.`
    );
  }
  return details;
}

async function runPanlexProbe(blockers, warnings) {
  const hints = await buildBulkSourceHintsForRows(panlexProbeRows, { maxScan: 500000 });
  const panlexCandidates = hints.translationCandidates.filter((candidate) => candidate.adapter === "panlex");
  if (panlexCandidates.length === 0) {
    blockers.push("PanLex HF vocabulary index is present but did not return the expected vocabulary sanity candidate.");
  }
  return panlexCandidates.map((candidate) => `${candidate.language_code}:${candidate.value}`).slice(0, 5);
}

async function runPanlexMeaningProbe(blockers, warnings) {
  const hints = await buildBulkSourceHintsForRows(panlexMeaningProbeRows, { maxScan: 500000 });
  const panlexMeaningCandidates = hints.translationCandidates.filter((candidate) => candidate.adapter === "panlex_meaning");
  if (panlexMeaningCandidates.length === 0) {
    blockers.push("PanLex meanings index is present but did not return any expected meaning-id translation candidate.");
  }
  return panlexMeaningCandidates
    .map((candidate) => `${candidate.language_code}:${candidate.value}`)
    .slice(0, 8);
}

async function runWeakSourceProbe(blockers, warnings) {
  const hints = await buildBulkSourceHintsForRows([...weakDictionaryProbeRows, ...weakExampleProbeRows], { maxScan: 500000 });
  const weakDictionaryCandidates = hints.translationCandidates.filter((candidate) => candidate.adapter === "sinhala_para_dict");
  const uzwordnetCandidates = hints.translationCandidates.filter((candidate) => candidate.adapter === "uzwordnet");
  const parquetDictionaryCandidates = hints.translationCandidates.filter((candidate) =>
    ["myanmar_mcfnlp_dict", "darsala_en_ka_lexicon"].includes(candidate.adapter)
  );
  const weakDictionaryV2Candidates = hints.translationCandidates.filter((candidate) =>
    ["alar_kn", "tezaurs_lv", "slovak_wordnet", "sloleks_sl"].includes(candidate.adapter)
  );
  const weakExampleCandidates = hints.exampleCollocationCandidates.filter((candidate) =>
    ["kaung_en_my", "hfcourse_en_my", "sinhala_english_singlish", "alt_parallel", "darsala_en_ka_lexicon", "kazparc_kk"].includes(candidate.adapter)
  );
  if (weakDictionaryCandidates.length === 0) {
    blockers.push("Weak dictionary index is present but did not return the expected Sinhala dictionary candidate.");
  }
  if (uzwordnetCandidates.length === 0) {
    blockers.push("Weak dictionary index is present but did not return the expected UzWordnet native-form candidate.");
  }
  if (parquetDictionaryCandidates.length < 2) {
    blockers.push("Weak dictionary index is present but did not return expected MY/KA parquet dictionary candidates.");
  }
  if (weakExampleCandidates.length === 0) {
    blockers.push("Weak example index is present but did not return expected SI/MY/ALT example collocation candidates.");
  }
  if ((await pathExists(path.join(projectRoot, "reference-sources/raw/official-dictionaries/alar-kn/alar.yml"))) && !weakDictionaryV2Candidates.some((candidate) => candidate.adapter === "alar_kn")) {
    blockers.push("Weak dictionaries v2 index has Alar raw data but did not return the expected KN dictionary candidate.");
  }
  if ((await pathExists(path.join(projectRoot, "reference-sources/raw/official-dictionaries/tezaurs-lv/tezaurs.zip"))) && !weakDictionaryV2Candidates.some((candidate) => candidate.adapter === "tezaurs_lv")) {
    warnings.push("Tēzaurs raw data is present but the LV probe did not find a candidate; inspect XML member format before relying on LV uplift.");
  }
  if ((await pathExists(path.join(projectRoot, "reference-sources/raw/official-dictionaries/slovak-wordnet/sk-wn-2013-01-23.txt.gz"))) && !weakDictionaryV2Candidates.some((candidate) => candidate.adapter === "slovak_wordnet")) {
    warnings.push("Slovak WordNet raw data is present but the SK probe did not find a candidate; keep SK WordNet as concept sanity until probe is improved.");
  }
  if ((await pathExists(path.join(projectRoot, "reference-sources/raw/official-dictionaries/sloleks/Sloleks.3.0.zip"))) && !weakDictionaryV2Candidates.some((candidate) => candidate.adapter === "sloleks_sl")) {
    warnings.push("Sloleks raw data is present but the SL probe did not find a candidate; keep Sloleks as morphology/spelling sanity until probe is improved.");
  }
  return {
    dictionary: [...weakDictionaryCandidates, ...uzwordnetCandidates, ...parquetDictionaryCandidates, ...weakDictionaryV2Candidates]
      .map((candidate) => `${candidate.language_code}:${candidate.adapter}:${candidate.value}`)
      .slice(0, 8),
    dictionary_counts: countByAdapterLanguage([...weakDictionaryCandidates, ...uzwordnetCandidates, ...parquetDictionaryCandidates, ...weakDictionaryV2Candidates]),
    examples: weakExampleCandidates.map((candidate) => `${candidate.language_code}:${candidate.adapter}`).slice(0, 5),
    example_counts: countByAdapterLanguage(weakExampleCandidates),
  };
}

async function main() {
  const blockers = [];
  const warnings = [];
  const summary = {
    freedict_pairs_present: 0,
    tatoeba_exports_present: 0,
    static_sources_present: 0,
    opus_zip_files_present: 0,
    opus_tmp_files_present: 0,
    panlex_present: false,
    panlex_meanings_present: false,
    reports: {},
    freedict_probe_candidates: [],
    official_dictionary_probe_candidates: [],
    romanization_probe_candidates: [],
    panlex_probe_candidates: [],
    panlex_meaning_probe_candidates: [],
    weak_source_probe_candidates: {},
    indexes: {},
  };

  for (const pair of requiredFreeDictPairs) {
    const files = await listFiles(`reference-sources/raw/freedict/dictionaries/${pair}`, (file) =>
      /freedict-.+\.src\.tar\.xz$/u.test(file)
    );
    if (files.length === 0) blockers.push(`Missing FreeDict pair archive: ${pair}`);
    else summary.freedict_pairs_present += 1;
  }

  for (const file of requiredTatoebaExports) {
    const relativePath = `reference-sources/raw/tatoeba/${file}`;
    const size = await assertPresentFile(relativePath, blockers);
    if (size) summary.tatoeba_exports_present += 1;
  }
  await bzip2IntegritySmoke("reference-sources/raw/tatoeba/sentences.tar.bz2", blockers);
  await bzip2IntegritySmoke("reference-sources/raw/tatoeba/links.tar.bz2", blockers);

  for (const [dir, file] of staticSourceChecks) {
    const relativePath = `reference-sources/raw/${dir}/${file}`;
    const size = await assertPresentFile(relativePath, blockers);
    if (size) summary.static_sources_present += 1;
    if (file.endsWith(".zip") && size) await zipListSmoke(relativePath, blockers);
  }

  summary.opus_zip_files_present = (await listFiles("reference-sources/raw/opus", (file) => /\.zip$/u.test(file))).length;
  summary.opus_tmp_files_present = (await listFiles("reference-sources/raw/opus", (file) => /\.tmp-\d+$/u.test(file))).length;
  if (summary.opus_zip_files_present === 0) warnings.push("No OPUS zip files are present yet.");
  if (summary.opus_tmp_files_present > 0) warnings.push(`OPUS still has ${summary.opus_tmp_files_present} temporary download file(s).`);

  const panlexFiles = [
    ...(await listFiles("reference-sources/raw/panlex", (file) => /\.zip$/u.test(file))),
    ...(await listFiles("reference-sources/raw/panlex-hf", (file) => /panlex\.csv$/u.test(file))),
  ];
  summary.panlex_present = panlexFiles.length > 0;
  if (!summary.panlex_present) warnings.push("PanLex dump is not present; last fetch may need retry if the host is reachable.");

  const panlexMeaningFiles = await listFiles("reference-sources/raw/panlex-meanings-hf/data", (file) => /\.tsv$/u.test(file));
  summary.panlex_meanings_present = panlexMeaningFiles.length > 0;
  if (!summary.panlex_meanings_present) warnings.push("PanLex meanings TSV files are not present yet.");

  const reportPaths = [
    "outputs/source-preflight/bulk_reference_sources_core_20260503.json",
    "outputs/source-preflight/bulk_reference_sources_concept_20260503.json",
    "outputs/source-preflight/bulk_reference_sources_panlex_20260503.json",
    "outputs/source-preflight/bulk_reference_sources_opus_smoke_20260503.json",
    "outputs/source-preflight/bulk_reference_sources_opus_smoke_20260503_rerun.json",
    "outputs/source-preflight/bulk_sources_panlex_hunspell_wikipron_20260503.json",
    "outputs/source-preflight/bulk_sources_unimorph_active_20260503.json",
    "outputs/source-preflight/bulk_source_indexes_20260503.json",
  ];
  for (const reportPath of reportPaths) {
    const report = await readJsonReport(reportPath);
    if (!report) {
      warnings.push(`Missing or unreadable fetch report: ${reportPath}`);
      continue;
    }
    summary.reports[reportPath] = {
      target_count: report.target_count ?? report.results?.length ?? 0,
      failed_count: report.failed_count ?? (report.results ?? []).filter((row) => row.status === "failed").length,
      deferred_retry_count: (report.results ?? []).filter((row) => row.status === "deferred_retry").length,
      unavailable_pair_count: (report.results ?? []).filter((row) => row.status === "unavailable_pair").length,
      unavailable_source_count: (report.results ?? []).filter((row) => row.status === "unavailable_source").length,
      already_present_count: (report.results ?? []).filter((row) => row.status === "already_present").length,
      downloaded_count: (report.results ?? []).filter((row) => row.status === "downloaded").length,
    };
  }

  summary.freedict_probe_candidates = await runFreeDictProbe(blockers, warnings);
  summary.official_dictionary_probe_candidates = await runOfficialDictionaryProbe(blockers, warnings);
  summary.romanization_probe_candidates = await runRomanizationProbe(blockers, warnings);
  summary.panlex_probe_candidates = await runPanlexProbe(blockers, warnings);
  if (summary.panlex_meanings_present) {
    summary.panlex_meaning_probe_candidates = await runPanlexMeaningProbe(blockers, warnings);
  }
  summary.weak_source_probe_candidates = await runWeakSourceProbe(blockers, warnings);
  summary.indexes = await bulkIndexStatus();

  const totalRawBytes = (await listFiles("reference-sources/raw")).reduce(async (totalPromise, file) => {
    const total = await totalPromise;
    try {
      return total + (await stat(file)).size;
    } catch {
      return total;
    }
  }, Promise.resolve(0));
  summary.total_checked_raw_bytes = await totalRawBytes;
  summary.total_checked_raw_size = formatBytes(summary.total_checked_raw_bytes);

  const output = { status: blockers.length === 0 ? "pass" : "fail", blockers, warnings, summary };
  console.log(JSON.stringify(output, null, 2));
  if (blockers.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
