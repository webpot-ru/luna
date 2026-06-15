#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "spanish_a1_core_part_006_300_v1";
const PART_LABEL = "Part 006";
const CONTRACT_PATH = path.join(ROOT, "config/spanish-a1-core-part-006-release-contract-v1.json");
const CANDIDATE_PATH = path.join(ROOT, "config/spanish-a1-core-part-006-candidates.tsv");
const LATAM_METADATA_PATH = path.join(ROOT, "config/spanish-a1-core-part-006-course-metadata.json");
const SPAIN_METADATA_PATH = path.join(ROOT, "config/spanish-a1-core-part-006-course-metadata-spain.json");
const PART005_INIT_PATH = path.join(ROOT, "scripts/spanish-a1/init-spanish-a1-part005.mjs");
const ORDINARY_IMPORT_DIR = path.join(ROOT, "outputs/import");

const TSV_HEADERS = [
  "part_of_speech",
  "source_lemma",
  "display_ES",
  "display_ES_419",
  "article_ES",
  "article_ES_419",
  "gender",
  "number_policy",
  "verb_infinitive",
  "verb_group",
  "meaning_note",
  "semantic_scene",
  "topic_domain",
  "example_ES",
  "example_ES_419",
];

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

function slugify(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .slice(0, 48);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function listImportFiles(pattern) {
  const entries = await fs.readdir(ORDINARY_IMPORT_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => path.join(ORDINARY_IMPORT_DIR, entry.name))
    .sort();
}

async function loadPart005Backlog() {
  const source = await fs.readFile(PART005_INIT_PATH, "utf8");
  const start = source.indexOf("function normalizeText");
  const end = source.indexOf("const TSV_HEADERS = [");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Unable to extract candidateBacklog from ${path.relative(ROOT, PART005_INIT_PATH)}.`);
  }
  const snippet = source.slice(start, end);
  const loader = new Function(`${snippet}\nreturn candidateBacklog;`);
  return loader();
}

function assertNoTsvBreaks(value, label) {
  const text = String(value ?? "");
  if (text.includes("\t") || text.includes("\n") || text.includes("\r")) {
    throw new Error(`${label} contains a TSV-breaking character.`);
  }
}

function candidateKey(candidate) {
  return `${normalizeText(candidate.source_lemma).toLocaleLowerCase("es")}::${normalizeText(candidate.part_of_speech)}`;
}

async function existingSpanishKeys() {
  const paths = [1, 2, 3, 4, 5].map((part) =>
    path.join(ROOT, `outputs/spanish-a1-core/candidate-pools/spanish_a1_core_part_${String(part).padStart(3, "0")}_300_v1_candidate_pool.jsonl`)
  );
  const keys = new Set();
  for (const filePath of paths) {
    if (!(await pathExists(filePath))) {
      throw new Error(`Required previous Spanish A1 candidate pool missing: ${path.relative(ROOT, filePath)}`);
    }
    const rows = await readJsonl(filePath);
    for (const candidate of rows) {
      keys.add(candidateKey(candidate));
    }
  }
  return keys;
}

function validateCandidateShape(candidate, index) {
  for (const header of TSV_HEADERS) {
    if (!normalizeText(candidate[header])) {
      throw new Error(`candidateBacklog[${index}] ${candidate.source_lemma} missing ${header}.`);
    }
    assertNoTsvBreaks(candidate[header], `candidateBacklog[${index}] ${candidate.source_lemma}.${header}`);
  }
}

function part006Candidate(candidate) {
  return {
    ...candidate,
    topic_domain: normalizeText(candidate.topic_domain).replaceAll("part005", "part006"),
  };
}

function finiteText(value, fallback = "not_applicable") {
  const text = normalizeText(value);
  if (!text) return fallback;
  return text.replace(/\t|\r|\n/gu, " ");
}

function articleFromExample(row) {
  const example = normalizeText(row.example_text).toLocaleLowerCase("es");
  const word = normalizeText(row.native_word).toLocaleLowerCase("es");
  for (const article of ["el", "la", "los", "las"]) {
    if (example.startsWith(`${article} ${word}`)) return article;
  }
  const firstToken = example.match(/^(el|la|los|las)\b/u)?.[1];
  return firstToken ?? "";
}

function deriveArticle(row) {
  if (normalizeText(row.part_of_speech) !== "noun") return "not_applicable";
  const marker = normalizeText(row.article_or_marker).toLocaleLowerCase("es");
  if (["el", "la", "los", "las"].includes(marker)) return marker;
  const exampleArticle = articleFromExample(row);
  if (exampleArticle) return exampleArticle;
  const gender = normalizeText(row.grammatical_gender);
  const number = normalizeText(row.grammatical_number);
  if (number === "plural") {
    if (gender === "feminine") return "las";
    if (gender === "masculine") return "los";
  }
  if (gender === "feminine") return "la";
  if (gender === "masculine") return "el";
  return "not_applicable";
}

function stressedFeminineA(value) {
  const lemma = normalizeText(value).toLocaleLowerCase("es");
  return /^(agua|águila|área|aula|alma|arma|hambre)(\b|$)/u.test(lemma);
}

function deriveGender(row, article, lemma = row.native_word) {
  if (normalizeText(row.part_of_speech) !== "noun") return "not_applicable";
  const gender = normalizeText(row.grammatical_gender);
  if (["masculine", "feminine", "invariable"].includes(gender)) return gender;
  const marker = normalizeText(article).toLocaleLowerCase("es");
  if (marker === "el" && stressedFeminineA(lemma)) return "feminine";
  if (marker === "el" || marker === "los") return "masculine";
  if (marker === "la" || marker === "las") return "feminine";
  if (gender === "common") return "common";
  return "common";
}

function compatibleNounGender(esRow, es419Row, articleES, articleES419) {
  if (normalizeText(esRow.part_of_speech) !== "noun") return true;
  const genderES = deriveGender(esRow, articleES, esRow.native_word);
  const gender419 = deriveGender(es419Row, articleES419, es419Row.native_word);
  const concrete = new Set(["masculine", "feminine"]);
  if (concrete.has(genderES) && concrete.has(gender419) && genderES !== gender419) return false;
  return true;
}

function deriveNumberPolicy(row) {
  if (normalizeText(row.part_of_speech) !== "noun") return "not_applicable";
  return normalizeText(row.grammatical_number) === "plural" ? "plural_default" : "singular_default";
}

function deriveVerbGroup(lemma) {
  const value = normalizeText(lemma).toLocaleLowerCase("es");
  if (value.endsWith("arse")) return "-ar";
  if (value.endsWith("erse")) return "-er";
  if (value.endsWith("irse")) return "-ir";
  if (value.endsWith("ar")) return "-ar";
  if (value.endsWith("er")) return "-er";
  if (value.endsWith("ir")) return "-ir";
  return "irregular";
}

function applySpanishNounOverride(candidate) {
  const key = normalizeText(candidate.source_lemma).toLocaleLowerCase("es");
  const overrides = {
    cobertura: { gender: "feminine", article_ES: "la", article_ES_419: "la" },
  };
  if (!overrides[key]) return candidate;
  return { ...candidate, ...overrides[key] };
}

function cleanMeaningNote(value) {
  return finiteText(value, "ordinary deck translation-memory candidate").replace(/[.。！？!?]\s*$/u, "");
}

function cleanScene(base) {
  const semanticClass = finiteText(base.semantic_class, "");
  const context = finiteText(base.context_note, "");
  const canonical = finiteText(base.canonical_english, "");
  return (semanticClass || context || canonical || "ordinary deck scene").slice(0, 120);
}

function ordinaryCandidateKey(base, esRow) {
  return `${normalizeText(base.set_id)}::${normalizeText(base.meaning_id)}::${normalizeText(esRow.language_code)}`;
}

function canUseOrdinarySourceCandidate(base, esRow, es419Row) {
  const setId = normalizeText(base.set_id);
  if (/alcohol|bar_/u.test(setId)) return false;
  if (!["noun", "verb", "adjective", "adverb", "phrase", "interjection", "pronoun", "determiner", "preposition", "conjunction", "numeral", "ordinal", "particle"].includes(normalizeText(esRow.part_of_speech))) {
    return false;
  }
  const sourceLemma = normalizeText(esRow.native_word);
  const sourceLemma419 = normalizeText(es419Row.native_word);
  if (!sourceLemma || !sourceLemma419) return false;
  if (sourceLemma.length > 46 || sourceLemma419.length > 46) return false;
  if (/[()[\]{}]/u.test(sourceLemma) || /[()[\]{}]/u.test(sourceLemma419)) return false;
  if (!normalizeText(esRow.example_text) || !normalizeText(es419Row.example_text)) return false;
  if (normalizeText(esRow.example_text).length > 120 || normalizeText(es419Row.example_text).length > 120) return false;
  if (normalizeText(esRow.language_code) !== "ES" || normalizeText(es419Row.language_code) !== "ES-419") return false;
  return true;
}

function ordinaryCandidatePriority(candidate) {
  const posRank = new Map([
    ["noun", 0],
    ["verb", 1],
    ["adjective", 2],
    ["adverb", 3],
    ["pronoun", 4],
    ["determiner", 5],
    ["preposition", 6],
    ["conjunction", 7],
    ["numeral", 8],
    ["ordinal", 9],
    ["phrase", 10],
    ["interjection", 11],
    ["particle", 12],
  ]);
  const source = normalizeText(candidate.source_lemma);
  const source419 = normalizeText(candidate.display_ES_419);
  const singleWord = !/\s/u.test(source) && !/\s/u.test(source419) ? 0 : 1;
  const sourceEvidenceFriendly = /^[\p{Letter}áéíóúüñÁÉÍÓÚÜÑ-]+$/u.test(source) ? 0 : 1;
  const genderKnown = candidate.part_of_speech !== "noun" || ["masculine", "feminine", "common", "invariable"].includes(normalizeText(candidate.gender)) ? 0 : 1;
  const rank = posRank.get(normalizeText(candidate.part_of_speech)) ?? 20;
  return [singleWord, sourceEvidenceFriendly, genderKnown, rank, source.length, source];
}

async function loadOrdinarySpanishCandidates() {
  const baseFiles = await listImportFiles(/_base_\d{8}\.jsonl$/u);
  const candidates = [];

  for (const baseFile of baseFiles) {
    const setId = path.basename(baseFile).replace(/_base_\d{8}\.jsonl$/u, "");
    const esFile = path.join(ORDINARY_IMPORT_DIR, `${setId}_es_draft_${path.basename(baseFile).match(/_base_(\d{8})\.jsonl$/u)?.[1]}.jsonl`);
    const es419File = path.join(ORDINARY_IMPORT_DIR, `${setId}_es_419_draft_${path.basename(baseFile).match(/_base_(\d{8})\.jsonl$/u)?.[1]}.jsonl`);
    if (!(await pathExists(esFile)) || !(await pathExists(es419File))) continue;

    const [baseRows, esRows, es419Rows] = await Promise.all([readJsonl(baseFile), readJsonl(esFile), readJsonl(es419File)]);
    const esByMeaning = new Map(esRows.map((row) => [normalizeText(row.meaning_id), row]));
    const es419ByMeaning = new Map(es419Rows.map((row) => [normalizeText(row.meaning_id), row]));

    for (const base of baseRows) {
      const esRow = esByMeaning.get(normalizeText(base.meaning_id));
      const es419Row = es419ByMeaning.get(normalizeText(base.meaning_id));
      if (!esRow || !es419Row) continue;
      if (!canUseOrdinarySourceCandidate(base, esRow, es419Row)) continue;

      const pos = normalizeText(esRow.part_of_speech);
      const sourceLemma = normalizeText(esRow.native_word);
      const articleES = deriveArticle(esRow);
      const articleES419 = deriveArticle(es419Row);
      if (!compatibleNounGender(esRow, es419Row, articleES, articleES419)) continue;
      const candidate = {
        part_of_speech: pos,
        source_lemma: sourceLemma,
        display_ES: sourceLemma,
        display_ES_419: normalizeText(es419Row.native_word),
        article_ES: articleES,
        article_ES_419: articleES419,
        gender: deriveGender(esRow, articleES, sourceLemma),
        number_policy: deriveNumberPolicy(esRow),
        verb_infinitive: pos === "verb" ? sourceLemma : "not_applicable",
        verb_group: pos === "verb" ? deriveVerbGroup(sourceLemma) : "not_applicable",
        meaning_note: cleanMeaningNote(base.meaning_note || esRow.meaning_note || base.canonical_meaning || esRow.canonical_english),
        semantic_scene: cleanScene(base),
        topic_domain: `ordinary_reuse_part006_${slugify(base.area || base.category || base.domain || base.set_id)}`,
        example_ES: normalizeText(esRow.example_text),
        example_ES_419: normalizeText(es419Row.example_text),
        _source: ordinaryCandidateKey(base, esRow),
      };
      const reviewedCandidate = applySpanishNounOverride(candidate);
      reviewedCandidate._priority = ordinaryCandidatePriority(reviewedCandidate);
      candidates.push(reviewedCandidate);
    }
  }

  return candidates.sort((a, b) => {
    const left = a._priority ?? [];
    const right = b._priority ?? [];
    for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
      if (left[index] < right[index]) return -1;
      if (left[index] > right[index]) return 1;
    }
    return 0;
  });
}

function selectEntries(candidateBacklog, ordinaryBacklog, existingKeys) {
  const seenBacklogKeys = new Map();
  const selected = [];
  const skippedPrevious = [];
  const sourceCounts = { part005_backlog: 0, ordinary_translation_memory: 0 };

  for (const [index, candidate] of [...candidateBacklog, ...ordinaryBacklog].entries()) {
    validateCandidateShape(candidate, index);
    const key = candidateKey(candidate);
    if (seenBacklogKeys.has(key)) {
      if (index < candidateBacklog.length && seenBacklogKeys.get(key) <= candidateBacklog.length) {
        throw new Error(`Duplicate Part 006 curated backlog source lemma/POS: ${key} at rows ${seenBacklogKeys.get(key)} and ${index + 1}.`);
      }
      continue;
    }
    seenBacklogKeys.set(key, index + 1);
    if (existingKeys.has(key)) {
      skippedPrevious.push(key);
      continue;
    }
    if (selected.length < 300) {
      const candidateSource = candidate._source ? "ordinary_translation_memory" : "part005_backlog";
      sourceCounts[candidateSource] += 1;
      selected.push(part006Candidate(candidate));
    }
  }

  if (selected.length !== 300) {
    throw new Error(
      `Part 006 selected ${selected.length} non-overlapping entries, expected 300. Backlog=${candidateBacklog.length}, ordinary_backlog=${ordinaryBacklog.length}, skipped_previous=${skippedPrevious.length}.`
    );
  }
  return { selected, skippedPrevious, sourceCounts };
}

function toTsv(entries) {
  return [
    TSV_HEADERS.join("\t"),
    ...entries.map((candidate) => TSV_HEADERS.map((header) => normalizeText(candidate[header])).join("\t")),
    "",
  ].join("\n");
}

function resetContract(part005) {
  return {
    contract_id: "spanish_a1_core_release_contract_v1::spanish_a1_core_part_006_300_v1",
    status: "source_candidate_scaffold_ready",
    scope:
      "Spanish A1 course-prep vocabulary release workbook Part 006, separate from ordinary thematic decks, Oxford English vocabulary, HSK Classic and HSK 3.0; final buyer-facing delivery requires separate Spanish (Spain) and Latin American Spanish edition workbooks.",
    approved_for_generation: false,
    source_candidate_file: "config/spanish-a1-core-part-006-candidates.tsv",
    release_part: {
      part_number: 6,
      row_id_start: 1501,
      meaning_namespace: "spanish_a1::part_006",
      selected_scope:
        "Internal LunaCards continuation of Spanish A1 Core after Parts 001-005; additional A1/A1+ travel, services, home, food, study, admin, tech, nature, emotions, common verbs and adjectives.",
    },
    default_release: {
      release_id: RELEASE_ID,
      course_id: "spanish_a1_core",
      cefr_level: "A1",
      expected_row_count: 300,
    },
    course: part005.course,
    source_policy: part005.source_policy,
    row_identity: part005.row_identity,
    field_rules: part005.field_rules,
    workbook: {
      ...part005.workbook,
      main_sheet_name: "Spanish A1 Core Part 006",
      postgres_import: false,
      ordinary_deck_sort: null,
      isolated_db_storage: {
        ...part005.workbook.isolated_db_storage,
        source_only_saved: false,
        final_support_storage_ready: false,
      },
      google_sheet_created: false,
      final_delivery_ready: false,
    },
    qa_gates: part005.qa_gates,
    ai_tool_policy: {
      ...part005.ai_tool_policy,
      latest_explicit_user_confirmation: null,
      part006_note:
        "No Part 006 live Gemini/support-language generation approval is inherited from earlier parts. Subscription-backed Gemini CLI use must be explicitly confirmed before live generation; no paid API key and no model downgrade.",
    },
    current_blockers: [],
    current_pending: [
      "candidate_pool_build",
      "spanish_source_lookup",
      "source_advisory_review_if_needed",
      "source_draft_workbook",
      "source_draft_readback",
      "support_generation_plan",
      "support_translation_memory_reuse_map",
      "explicit_gemini_quota_confirmation_before_live_support_generation",
      "support_language_generation",
      "spanish_a1_gates",
      "final_two_edition_workbook_export",
      "native_google_sheet_upload_and_readback",
      "sample_quality_audit",
      "isolated_spanish_a1_db_import_and_readback",
      "final_release_gate",
    ],
    updated_at: new Date().toISOString(),
  };
}

function resetMetadata(source, { edition }) {
  return {
    ...source,
    release_id: RELEASE_ID,
    description: `Polished localized Course Metadata for the Spanish A1 Core ${PART_LABEL} ${edition} buyer-facing workbook. Keys use spreadsheetCode values from config/language-order.json.`,
  };
}

async function main() {
  const candidateBacklog = await loadPart005Backlog();
  const ordinaryBacklog = await loadOrdinarySpanishCandidates();
  const existingKeys = await existingSpanishKeys();
  const { selected, skippedPrevious, sourceCounts } = selectEntries(candidateBacklog, ordinaryBacklog, existingKeys);
  await fs.writeFile(CANDIDATE_PATH, toTsv(selected), "utf8");

  const part005 = await readJson(path.join(ROOT, "config/spanish-a1-core-part-005-release-contract-v1.json"));
  await writeJson(CONTRACT_PATH, resetContract(part005));

  const latamMetadata = await readJson(path.join(ROOT, "config/spanish-a1-core-part-005-course-metadata.json"));
  const spainMetadata = await readJson(path.join(ROOT, "config/spanish-a1-core-part-005-course-metadata-spain.json"));
  await writeJson(LATAM_METADATA_PATH, resetMetadata(latamMetadata, { edition: "Latin American Spanish" }));
  await writeJson(SPAIN_METADATA_PATH, resetMetadata(spainMetadata, { edition: "Spanish (Spain)" }));

  console.log(
    JSON.stringify(
      {
        release_id: RELEASE_ID,
        backlog_candidates: candidateBacklog.length,
        ordinary_translation_memory_candidates: ordinaryBacklog.length,
        candidates: selected.length,
        source_counts: sourceCounts,
        skipped_previous_duplicates: skippedPrevious.length,
        first: selected[0]?.source_lemma,
        last: selected.at(-1)?.source_lemma,
        candidate_file: path.relative(ROOT, CANDIDATE_PATH),
        contract: path.relative(ROOT, CONTRACT_PATH),
        metadata: [path.relative(ROOT, LATAM_METADATA_PATH), path.relative(ROOT, SPAIN_METADATA_PATH)],
      },
      null,
      2
    )
  );
}

await main();
