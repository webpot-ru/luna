import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSafeSetId, psqlJson, sqlLiteralList, sqlString } from "./lib/qa-utils.mjs";
import { languageOrderRecords } from "./lib/language-order.mjs";
import { isRegionalVariantRisk } from "./lib/regional-variant-quality.mjs";

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(
    [
      "Usage: node scripts/run-ai-qa.mjs <set_id> [--languages=<codes|all>] [--checks=<families|all>] [--dry-run]",
      "       node scripts/run-ai-qa.mjs <set_id> --gemini-pack [--gemini-model=<model>] [--languages=<codes|all>] [--checks=<families|all>]",
      "",
      "--dry-run writes an agent-review payload only and cannot produce final pass evidence.",
      "--gemini-pack writes a minimized prompt pack for mcp__gemini_tools__.gemini_extract_json without making live Gemini calls.",
      "Live provider QA is optional and requires already-configured credentials; do not ask the user for API keys.",
    ].join("\n")
  );
  process.exit(0);
}
const setId = args.find((arg) => !arg.startsWith("--")) ?? "home_kitchen_cookware_pilot_01";
const languageArg = args.find((arg) => arg.startsWith("--languages="))?.split("=")[1] ?? "all";
const checksArg = args.find((arg) => arg.startsWith("--checks="))?.split("=")[1] ?? "all";
const dryRun = args.includes("--dry-run");
const geminiPack = args.includes("--gemini-pack");
const geminiModel =
  args.find((arg) => arg.startsWith("--gemini-model="))?.split("=")[1] ?? "gemini-3.1-pro-preview";

assertSafeSetId(setId);

const checkAliases = new Map([
  ["word_selection", "word_selection_quality"],
  ["word_selection_quality", "word_selection_quality"],
  ["selection", "word_selection_quality"],
  ["base", "base_example_alignment"],
  ["base_example", "base_example_alignment"],
  ["base_example_alignment", "base_example_alignment"],
  ["example_quality", "example_quality"],
  ["quality", "example_quality"],
  ["semantic", "semantic_preservation"],
  ["semantic_preservation", "semantic_preservation"],
  ["naturalness", "target_example_naturalness"],
  ["target_example_naturalness", "target_example_naturalness"],
  ["lexical_anchor", "target_example_lexical_anchor"],
  ["target_example_lexical_anchor", "target_example_lexical_anchor"],
  ["pedagogical_quality", "target_example_pedagogical_quality"],
  ["example_pedagogy", "target_example_pedagogical_quality"],
  ["target_example_pedagogical_quality", "target_example_pedagogical_quality"],
  ["regional", "regional_variant_quality"],
  ["regional_variant", "regional_variant_quality"],
  ["regional_variant_quality", "regional_variant_quality"],
  ["entry", "entry_form"],
  ["entry_form", "entry_form"],
  ["entry_register", "entry_form_register"],
  ["entry_form_register", "entry_form_register"],
  ["register", "entry_form_register"],
  ["semantic_granularity", "semantic_granularity"],
  ["granularity", "semantic_granularity"],
  ["article_gender_marker_consistency", "article_gender_marker_consistency"],
  ["article_gender", "article_gender_marker_consistency"],
  ["transcription", "transcription_policy"],
  ["transcription_policy", "transcription_policy"],
  ["pronunciation", "pronunciation_accuracy"],
  ["pronunciation_accuracy", "pronunciation_accuracy"],
]);

const allCheckFamilies = [
  "word_selection_quality",
  "base_example_alignment",
  "example_quality",
  "semantic_preservation",
  "target_example_naturalness",
  "target_example_lexical_anchor",
  "target_example_pedagogical_quality",
  "regional_variant_quality",
  "entry_form",
  "entry_form_register",
  "semantic_granularity",
  "article_gender_marker_consistency",
  "transcription_policy",
  "pronunciation_accuracy",
];
const requestedCheckFamilies =
  checksArg === "all"
    ? allCheckFamilies
    : checksArg
        .split(",")
        .map((check) => check.trim())
        .filter(Boolean)
        .map((check) => {
          const normalized = checkAliases.get(check);
          if (!normalized) {
            throw new Error(`Unknown check family: ${check}`);
          }
          return normalized;
        });

if (requestedCheckFamilies.length === 0) {
  throw new Error("At least one check family is required.");
}

const languageLookup = new Map();
for (const record of languageOrderRecords) {
  languageLookup.set(record.dbCode, record.dbCode);
  languageLookup.set(record.spreadsheetCode, record.dbCode);
}

function resolveLanguageCodes(value) {
  if (value === "all") return languageOrderRecords.map((record) => record.dbCode);
  const resolved = [];
  for (const rawCode of value.split(",").map((code) => code.trim()).filter(Boolean)) {
    const dbCode = languageLookup.get(rawCode);
    if (!dbCode) throw new Error(`Unknown active language code: ${rawCode}`);
    if (!resolved.includes(dbCode)) resolved.push(dbCode);
  }
  if (resolved.length === 0) throw new Error("At least one language code is required.");
  return resolved;
}

const languageCodes = resolveLanguageCodes(languageArg);
const languageRecordsByDbCode = new Map(languageOrderRecords.map((record) => [record.dbCode, record]));

function timestampId() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
}

const timestamp = timestampId();
const batchId = `ai_qa_${setId}_${timestamp}`;

function passIdFor(checkFamily) {
  return `${checkFamily}_${timestamp}`;
}

async function fetchSemanticRows() {
  const sql = `
with context_examples as (
  select
    msm.display_order,
    e.example_id,
    e.meaning_id,
    e.canonical_example_en,
    e.semantic_scene,
    mu.canonical_english,
    mu.english_with_article,
    mu.part_of_speech,
    mu.meaning_note,
    mu.default_domain,
    mu.default_area,
    mu.default_category
  from meaning_examples e
  join meaning_set_memberships msm
    on msm.meaning_id = e.meaning_id
   and msm.set_id = e.set_id
  join meaning_units mu on mu.meaning_id = e.meaning_id
  where e.set_id = ${sqlString(setId)}
    and e.example_role = 'context'
    and msm.quality_status <> 'blocked'
),
target_entries as (
  select
    le.meaning_id,
    le.language_code,
    coalesce(le.word_with_article_or_marker, le.native_word) as target_display_word
  from meaning_language_entries le
  where le.language_code in (${sqlLiteralList(languageCodes)})
)
select coalesce(json_agg(row_to_json(batch_rows)), '[]'::json)
from (
  select
    ${sqlString(setId)} as set_id,
    ce.meaning_id,
    ce.example_id,
    ${sqlString(setId)} || '::' || ce.meaning_id || '::' || ce.example_id::text as target_key,
    'meaning_example_translation' as target_type,
    et.language_code,
    ce.canonical_example_en as source_example_en,
    et.example_text as target_example,
    ce.semantic_scene,
    ce.canonical_english,
    ce.english_with_article,
    ce.part_of_speech,
    ce.meaning_note,
    ce.default_domain,
    ce.default_area,
    ce.default_category,
    te.target_display_word
  from context_examples ce
  join meaning_example_translations et on et.example_id = ce.example_id
  left join target_entries te
    on te.meaning_id = ce.meaning_id
   and te.language_code = et.language_code
  where et.language_code in (${sqlLiteralList(languageCodes)})
  order by ce.display_order, et.language_code
) batch_rows;
`;
  return psqlJson(sql);
}

async function fetchWordSelectionRows() {
  const sql = `
with active_items as (
  select
    msm.display_order,
    msm.meaning_id,
    msm.context_domain,
    msm.context_area,
    msm.context_category,
    msm.context_note,
    mu.canonical_english,
    mu.english_with_article,
    mu.canonical_meaning,
    mu.part_of_speech,
    mu.meaning_note,
    mu.default_domain,
    mu.default_area,
    mu.default_category,
    mu.level,
    mu.frequency_band,
    mu.priority_band,
    mu.countability,
    mu.plural_form_en,
    mu.semantic_class,
    mu.verb_pattern,
    mu.transitivity,
    mu.tags,
    cs.content_type,
    cs.set_name,
    cs.domain,
    cs.area,
    cs.category,
    cs.situation,
    cs.level_min,
    cs.level_max,
    cs.level_label,
    cs.learning_goal,
    cs.target_item_count_min,
    cs.target_item_count_max
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  join content_sets cs on cs.set_id = msm.set_id
  where msm.set_id = ${sqlString(setId)}
    and msm.quality_status <> 'blocked'
),
context_examples as (
  select e.meaning_id, e.canonical_example_en, e.semantic_scene
  from meaning_examples e
  where e.set_id = ${sqlString(setId)}
    and e.example_role = 'context'
)
select coalesce(json_agg(row_to_json(batch_rows)), '[]'::json)
from (
  select
    ${sqlString(setId)} as set_id,
    ai.meaning_id,
    ${sqlString(setId)} || '::' || ai.meaning_id as target_key,
    'content_set' as target_type,
    'EN' as language_code,
    ai.content_type,
    ai.set_name,
    ai.domain,
    ai.area,
    ai.category,
    ai.situation,
    ai.level_min,
    ai.level_max,
    ai.level_label,
    ai.learning_goal,
    ai.target_item_count_min,
    ai.target_item_count_max,
    ai.display_order,
    ai.context_domain,
    ai.context_area,
    ai.context_category,
    ai.context_note,
    ai.canonical_english,
    ai.english_with_article,
    ai.canonical_meaning,
    ai.part_of_speech,
    ai.meaning_note,
    ai.default_domain,
    ai.default_area,
    ai.default_category,
    ai.level,
    ai.frequency_band,
    ai.priority_band,
    ai.countability,
    ai.plural_form_en,
    ai.semantic_class,
    ai.verb_pattern,
    ai.transitivity,
    ai.tags,
    ce.canonical_example_en as source_example_en,
    ce.semantic_scene
  from active_items ai
  left join context_examples ce on ce.meaning_id = ai.meaning_id
  order by ai.display_order
) batch_rows;
`;
  return psqlJson(sql);
}

async function fetchBaseExampleRows() {
  const sql = `
with context_examples as (
  select
    msm.display_order,
    e.example_id,
    e.meaning_id,
    e.canonical_example_en,
    e.semantic_scene,
    mu.canonical_english,
    mu.english_with_article,
    mu.part_of_speech,
    mu.meaning_note,
    mu.default_domain,
    mu.default_area,
    mu.default_category,
    msm.context_domain,
    msm.context_area,
    msm.context_category,
    msm.context_note
  from meaning_examples e
  join meaning_set_memberships msm
    on msm.meaning_id = e.meaning_id
   and msm.set_id = e.set_id
  join meaning_units mu on mu.meaning_id = e.meaning_id
  where e.set_id = ${sqlString(setId)}
    and e.example_role = 'context'
    and msm.quality_status <> 'blocked'
)
select coalesce(json_agg(row_to_json(batch_rows)), '[]'::json)
from (
  select
    ${sqlString(setId)} as set_id,
    ce.meaning_id,
    ce.example_id,
    ce.example_id::text as target_key,
    'meaning_example' as target_type,
    'EN' as language_code,
    ce.canonical_example_en as source_example_en,
    ce.canonical_example_en as target_example,
    ce.semantic_scene,
    ce.canonical_english,
    ce.english_with_article,
    ce.part_of_speech,
    ce.meaning_note,
    ce.default_domain,
    ce.default_area,
    ce.default_category,
    ce.context_domain,
    ce.context_area,
    ce.context_category,
    ce.context_note
  from context_examples ce
  order by ce.display_order
) batch_rows;
`;
  return psqlJson(sql);
}

async function fetchEntryRows() {
  const sql = `
with active_items as (
  select
    msm.display_order,
    mu.meaning_id,
    mu.canonical_english,
    mu.english_with_article,
    mu.canonical_meaning,
    mu.part_of_speech,
    mu.meaning_note,
    mu.default_domain,
    mu.default_area,
    mu.default_category,
    mu.countability,
    mu.plural_form_en,
    mu.semantic_class,
    mu.verb_pattern,
    mu.transitivity,
    mu.tags,
    msm.context_domain,
    msm.context_area,
    msm.context_category,
    msm.context_note
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  where msm.set_id = ${sqlString(setId)}
    and msm.quality_status <> 'blocked'
),
context_examples as (
  select e.meaning_id, e.canonical_example_en, e.semantic_scene
  from meaning_examples e
  where e.set_id = ${sqlString(setId)}
    and e.example_role = 'context'
)
select coalesce(json_agg(row_to_json(batch_rows)), '[]'::json)
from (
  select
    ${sqlString(setId)} as set_id,
    ai.meaning_id as target_key,
    'meaning_language_entry' as target_type,
    le.language_code,
    ai.canonical_english,
    ai.english_with_article,
    ai.canonical_meaning,
    ai.part_of_speech,
    ai.meaning_note,
    ai.default_domain,
    ai.default_area,
    ai.default_category,
    ai.countability,
    ai.plural_form_en,
    ai.semantic_class,
    ai.verb_pattern,
    ai.transitivity,
    ai.tags,
    ai.context_domain,
    ai.context_area,
    ai.context_category,
    ai.context_note,
    ce.canonical_example_en as source_example_en,
    ce.semantic_scene,
    le.native_word,
    le.word_with_article_or_marker,
    le.article_or_marker,
    le.gender,
    le.grammatical_number,
    le.usage_note,
    le.source_note
  from active_items ai
  join meaning_language_entries le on le.meaning_id = ai.meaning_id
  left join context_examples ce on ce.meaning_id = ai.meaning_id
  where le.language_code in (${sqlLiteralList(languageCodes)})
  order by ai.display_order, le.language_code
) batch_rows;
`;
  return psqlJson(sql);
}

async function fetchTranscriptionRows() {
  const sql = `
with active_items as (
  select
    msm.display_order,
    mu.meaning_id,
    mu.canonical_english,
    mu.english_with_article,
    mu.part_of_speech,
    mu.meaning_note
  from meaning_set_memberships msm
  join meaning_units mu on mu.meaning_id = msm.meaning_id
  where msm.set_id = ${sqlString(setId)}
    and msm.quality_status <> 'blocked'
)
select coalesce(json_agg(row_to_json(batch_rows)), '[]'::json)
from (
  select
    ${sqlString(setId)} as set_id,
    ai.meaning_id as target_key,
    'meaning_language_entry' as target_type,
    le.language_code,
    ai.canonical_english,
    ai.english_with_article,
    ai.part_of_speech,
    ai.meaning_note,
    le.native_word,
    le.word_with_article_or_marker,
    coalesce(le.word_with_article_or_marker, le.native_word) as display_word,
    le.transcription,
    le.romanization,
    le.romanization_system,
    le.pronunciation_ipa,
    le.learner_pronunciation
  from active_items ai
  join meaning_language_entries le on le.meaning_id = ai.meaning_id
  where le.language_code in (${sqlLiteralList(languageCodes)})
  order by ai.display_order, le.language_code
) batch_rows;
`;
  return psqlJson(sql);
}

function languagePolicy(languageCode) {
  const record = languageRecordsByDbCode.get(languageCode);
  if (!record) throw new Error(`Missing language policy for DB code ${languageCode}`);
  return record;
}

function dryRunDecision(row) {
  return {
    result: "needs_review",
    check_family: row.check_family,
    target_type: row.target_type,
    target_key: row.target_key,
    language_code: row.language_code,
    result_summary: "Dry run only; no model judgment was requested.",
    source_note: "dry-run; database row and policy payload were exported for preview only",
    issues: ["dry_run"],
    confidence: 0,
  };
}

function buildPromptPayload(row) {
  return {
    task: row.check_family,
    rules: {
      base_example_alignment:
        "Check that the English context example matches the meaning_id, English display form and semantic_scene. It must be simple, topic-bound and must not introduce a different target object, number, action/state, location/state, tense/aspect, attributes, actor or time.",
      word_selection_quality:
        "Check that this meaning belongs in this exact deck: it matches the deck scope and include/exclude rules, is appropriate for the stated level and priority, is not a rare/specialized item unless the deck spec allows it, is not a duplicate or near-duplicate without a clear reason, is not a mixed-bag item from another deck, and can support a short controlled context example.",
      example_quality:
        "Check that the English context example is learner-facing quality: natural, concrete, short, topic-bound, not a repeated template, not built with unnecessary modal/intent words like need/want/can, and uses a natural verb-object collocation. The example must work as a semantic anchor for any language pair, not only English-to-target translation.",
      semantic_preservation:
        "Check that target_example preserves semantic_scene and does not change target object, displayed form, number, action/state, location/state, tense/aspect, topic context, attributes, actor or time. The target example must also follow target-language sentence capitalization: use normal sentence case where the language has it, and do not force capitalization in scripts/languages without sentence case.",
      target_example_naturalness:
        "Check that target_example is natural in the target language and does not literally copy helper words from semantic_scene. semantic_scene describes meaning, not required wording. Preserve the same target object/location/state/action, but use the target language's normal construction: zero-copula, case/postposition, adjective predicate, classifier, word order or omitted location verb are allowed when natural. For RU, locative examples may say either 'Тарелка на столе.' or 'Тарелка находится на столе.', but state/adjective examples must not say things like 'Кухонная раковина находится чистая.'; use 'Кухонная раковина чистая.' instead. If the example preserves meaning but sounds calqued, awkward, over-literal, or learner-unfriendly, return needs_review or fail.",
      target_example_lexical_anchor:
        "Check that target_example actually teaches the target entry: it should contain the target word/display form, a normal inflected form, compound form, classifier construction, or a clearly acceptable language-specific equivalent. Do not pass examples that preserve the scene but omit the target lexical item or replace it with a broader neighbor. Example blocker: for soap dispenser, a target example meaning only 'The soap is near the sink' fails because it teaches soap, not dispenser.",
      target_example_pedagogical_quality:
        "Check that target_example is useful as a learner-facing flashcard example, not merely semantically preserved and natural. It must teach the target item/action with a concrete, non-tautological scene and avoid weak category/self-container anchors such as 'The shower head is in the shower' or 'The kitchen shelf is in the kitchen'. Do not fail normal inflection or natural word order. If the example is natural but does not add useful learning contrast, return needs_review or fail.",
      regional_variant_quality:
        "Check region-sensitive vocabulary and example wording for EN-GB, ES-419 and PT-BR. The row must preserve the same meaning while using the target regional variant naturally. For EN-GB, avoid US-only words such as faucet/trash can/trash bag when British tap/rubbish bin/bin bag is expected. For ES-419, avoid Spain-only vocabulary when a broad Latin American form is expected. For PT-BR, avoid European Portuguese-only vocabulary/register when a Brazilian form is expected. If the regional form is shared or acceptable, pass with a concrete note; if uncertain, return needs_review.",
      entry_form:
        "Check that the target word/display form matches the English meaning and topic context, uses learner-helpful article/gender/marker only when the language uses it, keeps POS/base dictionary form policy, uses everyday household register for this deck, and is not artificial Title Case or initial-uppercase unless the language, proper noun, acronym, or standard dictionary form requires it.",
      entry_form_register:
        "Check everyday learner register and topic fit for the target entry. It must be a normal household/A1-A2 vocabulary form, not a technical, medical, beauty-salon, plumbing/repair, literary, archaic, or overly formal term unless the deck spec explicitly allows it. Return fail for confirmed wrong register or wrong domain; return needs_review if a regional/formality question requires native confirmation.",
      semantic_granularity:
        "Check that the target entry is not too broad or too narrow relative to nearby meanings in the same deck. Do not pass body wash as plain soap, washcloth as plain towel, bath mat as generic rug, shower head as shower, or soap dispenser as soap when the deck contains the broader item separately. Pass precise equivalents and legitimate language-specific compounds; use needs_review for uncertain synonym collisions.",
      article_gender_marker_consistency:
        "Check that native_word, learner display word, article_or_marker, gender and grammatical_number are internally consistent for the target language. For languages with article/gender conventions, display article and stored article/gender must agree when present. Do not invent articles for languages that do not use them. Return fail for confirmed mismatches, needs_review for missing but desirable learner metadata.",
      transcription_policy:
        "Check that transcription is exactly the single learner-facing transcription for the word, not the example, and follows the language policy. Native orthography must repeat the display word exactly. IPA must be in /.../ and not be the plain word. Romanization for non-Latin scripts must be Latin-script, not native script and not a copy of the display word. ZH must be Hanyu Pinyin with tone marks. TH and LO must use learner romanization with tone diacritics on vowels, not RTGS/BGN without tones and not parenthetical labels. MY must use practical romanization with tone/register notation, not Burmese script. EN and EN-GB verb display must be to + base verb.",
      pronunciation_accuracy:
        "Check the content accuracy of an IPA transcription against the target display/native word. This is not a shape check: /.../ alone is not enough. Fail or needs_review slash-wrapped orthography such as /pommeau douche/ or /le recipient alimentaire/. Pass only when the IPA is phonetically suitable for the displayed target entry; if exact IPA cannot be confirmed, return needs_review and name the source/reference needed.",
    },
    language_policy: languagePolicy(row.language_code),
    row,
    output_contract: {
      result: "pass | needs_review | fail",
      check_family: row.check_family,
      target_type: row.target_type,
      target_key: row.target_key,
      language_code: row.language_code,
      result_summary: "short concrete explanation",
      source_note: "policy/source basis used; if uncertain, say what must be checked",
      issues: ["array of issue codes or short issue labels"],
      confidence: "number from 0 to 1",
    },
  };
}

function buildGeminiPrompt(row) {
  const payload = buildPromptPayload(row);
  return [
    "You are a strict multilingual QA reviewer for LunaCards vocabulary flashcards.",
    "Return exactly one valid JSON object. Do not return markdown.",
    "If uncertain, use needs_review, not pass.",
    "A pass from Gemini is AI-assisted QA evidence only; it does not override deterministic gates, source policies, language-specific rules or native review status.",
    "Use the identity fields, pass_id and batch_id exactly as provided.",
    "",
    "Return this importable JSON shape:",
    JSON.stringify(
      {
        target_type: row.target_type,
        target_key: row.target_key,
        language_code: row.language_code,
        result: "pass | needs_review | fail",
        reviewer: `gemini-tools/${geminiModel}`,
        pass_id: row.pass_id,
        batch_id: row.batch_id,
        check_family: row.check_family,
        result_summary: "short concrete explanation",
        source_note: "policy/source basis used; if uncertain, say what must be checked",
        issues: ["array of issue codes or short issue labels"],
        confidence: "number from 0 to 1",
        evidence: {
          runner: "run-ai-qa",
          provider: "gemini-tools",
          model: geminiModel,
          checked_payload: "include or summarize the checked payload identity and key facts",
        },
      },
      null,
      2
    ),
    "",
    "Review payload:",
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const chunks = [];
  for (const output of data.output ?? []) {
    for (const content of output.content ?? []) {
      if (typeof content.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

function validateDecision(decision, row) {
  const allowedResults = new Set(["pass", "needs_review", "fail"]);
  if (!allowedResults.has(decision.result)) {
    throw new Error(`AI QA returned unsupported result for ${row.target_key}: ${decision.result}`);
  }
  for (const field of ["check_family", "target_type", "target_key", "language_code", "result_summary", "source_note"]) {
    if (typeof decision[field] !== "string" || decision[field].trim() === "") {
      throw new Error(`AI QA returned missing ${field} for ${row.target_key}`);
    }
  }
  if (
    decision.check_family !== row.check_family ||
    decision.target_type !== row.target_type ||
    decision.target_key !== row.target_key ||
    decision.language_code !== row.language_code
  ) {
    throw new Error(`AI QA returned mismatched identity for ${row.check_family} ${row.target_key} ${row.language_code}`);
  }
  if (!Array.isArray(decision.issues)) {
    throw new Error(`AI QA returned non-array issues for ${row.target_key}`);
  }
  if (typeof decision.confidence !== "number" || decision.confidence < 0 || decision.confidence > 1) {
    throw new Error(`AI QA returned invalid confidence for ${row.target_key}`);
  }
  return decision;
}

async function callOpenAi(row) {
  const provider = process.env.AI_QA_PROVIDER;
  const model = process.env.AI_QA_MODEL;
  const apiKey = process.env.OPENAI_API_KEY;
  const optionalProviderMessage =
    "Non-dry provider QA is optional. For normal agent-owned deck delivery, rerun with --dry-run, review the payload as Codex, write a separate checked JSONL, and import it with import-ai-qa-results.mjs. Do not ask the user for API keys.";

  if (provider !== "openai") {
    throw new Error(`AI_QA_PROVIDER=openai is required only for optional non-dry OpenAI QA. ${optionalProviderMessage}`);
  }
  if (!model) {
    throw new Error(`AI_QA_MODEL is required only for optional non-dry OpenAI QA. ${optionalProviderMessage}`);
  }
  if (!apiKey) {
    throw new Error(`OPENAI_API_KEY is required only for optional non-dry OpenAI QA. ${optionalProviderMessage}`);
  }

  const payload = buildPromptPayload(row);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      text: { format: { type: "json_object" } },
      input: [
        {
          role: "system",
          content:
            "You are a strict multilingual QA reviewer for vocabulary flashcards. Return only one valid JSON object matching the requested contract. If uncertain, use needs_review, not pass.",
        },
        {
          role: "user",
          content: JSON.stringify(payload),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI QA request failed: HTTP ${response.status} ${body}`);
  }

  const data = await response.json();
  const text = extractResponseText(data);
  if (!text) throw new Error(`OpenAI QA response had no text for ${row.target_key}`);
  return validateDecision(JSON.parse(text), row);
}

async function fetchRowsForCheck(checkFamily) {
  if (checkFamily === "word_selection_quality") return fetchWordSelectionRows();
  if (checkFamily === "base_example_alignment") return fetchBaseExampleRows();
  if (checkFamily === "example_quality") return fetchBaseExampleRows();
  if (checkFamily === "semantic_preservation") return fetchSemanticRows();
  if (checkFamily === "target_example_naturalness") return fetchSemanticRows();
  if (checkFamily === "target_example_lexical_anchor") return fetchSemanticRows();
  if (checkFamily === "target_example_pedagogical_quality") return fetchSemanticRows();
  if (checkFamily === "regional_variant_quality") return (await fetchSemanticRows()).filter(isRegionalVariantRisk);
  if (checkFamily === "entry_form") return fetchEntryRows();
  if (checkFamily === "entry_form_register") return fetchEntryRows();
  if (checkFamily === "semantic_granularity") return fetchEntryRows();
  if (checkFamily === "article_gender_marker_consistency") return fetchEntryRows();
  if (checkFamily === "transcription_policy") return fetchTranscriptionRows();
  if (checkFamily === "pronunciation_accuracy") {
    return (await fetchTranscriptionRows()).filter(
      (row) => String(languagePolicy(row.language_code).transcriptionFormat).toLowerCase() === "ipa"
    );
  }
  throw new Error(`Unsupported check family: ${checkFamily}`);
}

const qaRows = [];
for (const checkFamily of requestedCheckFamilies) {
  const rows = await fetchRowsForCheck(checkFamily);
  for (const row of rows) {
    qaRows.push({
      ...row,
      check_family: checkFamily,
      pass_id: passIdFor(checkFamily),
      batch_id: batchId,
    });
  }
}

if (geminiPack) {
  const outputDir = path.resolve("outputs/qa");
  const outputPath = path.join(outputDir, `gemini_qa_pack_${setId}_${timestamp}.jsonl`);
  const schemaDescription =
    "One JSON object per reviewed QA row with target_type, target_key, language_code, result, reviewer, pass_id, batch_id, check_family, result_summary, source_note, issues, confidence and evidence. result must be pass, needs_review or fail.";
  const packRows = qaRows.map((row, index) => ({
    provider: "gemini-tools",
    tool: "mcp__gemini_tools__.gemini_extract_json",
    model: geminiModel,
    model_tier: "quality",
    dry_run_required_before_live_call: true,
    max_output_tokens: 1600,
    schema_description: schemaDescription,
    target_type: row.target_type,
    target_key: row.target_key,
    language_code: row.language_code,
    check_family: row.check_family,
    pass_id: row.pass_id,
    batch_id: row.batch_id,
    row_index: index + 1,
    prompt: buildGeminiPrompt(row),
  }));
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, packRows.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");
  console.log(outputPath);
  console.log(
    `Gemini QA pack rows: ${packRows.length}; checks=${requestedCheckFamilies.join(",")}; languages=${languageCodes.join(",")}; model=${geminiModel}`
  );
  process.exit(0);
}

const reviewer = dryRun
  ? "ai-qa-runner:dry-run"
  : `ai-qa-runner:${process.env.AI_QA_PROVIDER}/${process.env.AI_QA_MODEL}`;

const results = [];
for (const [index, row] of qaRows.entries()) {
  const decision = dryRun ? dryRunDecision(row) : await callOpenAi(row);
  results.push({
    target_type: row.target_type,
    target_key: row.target_key,
    language_code: row.language_code,
    result: decision.result,
    reviewer,
    pass_id: row.pass_id,
    batch_id: row.batch_id,
    check_family: row.check_family,
    result_summary: decision.result_summary,
    source_note: decision.source_note,
    issues: decision.issues,
    confidence: decision.confidence,
    evidence: {
      runner: "run-ai-qa",
      dry_run: dryRun,
      set_id: setId,
      row_index: index + 1,
      language_policy: languagePolicy(row.language_code),
      checked_payload: row,
    },
  });
}

const outputDir = path.resolve("outputs/qa");
const outputPath = path.join(outputDir, `ai_qa_${setId}_${timestamp}.jsonl`);
const payload = results.map((row) => JSON.stringify(row)).join("\n") + (results.length ? "\n" : "");

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, payload, "utf8");

console.log(outputPath);
console.log(
  `AI QA ${dryRun ? "dry-run " : ""}rows: ${results.length}; checks=${requestedCheckFamilies.join(",")}; languages=${languageCodes.join(",")}`
);
