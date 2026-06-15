#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_004_147_v1";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_ne_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_ne_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-ne.mjs";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "NE";
const BATCH_ID = "ne_v1";
const RELEASE_ENTRY_COUNT = 147;
const SENTENCE_END_RE = /[.!?।]$/u;
const DEVANAGARI_RE = /\p{Script=Devanagari}/u;
const LATIN_RE = /[A-Za-z]/u;
const UNEXPECTED_SCRIPT_RE =
  /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0EFF\u1000-\u109F\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const NE_TRANSLATIONS_TSV = `source_headword	NE	example_NE
take	लिनु;लैजानु	टिकट लिनुहोस्।
talk	कुरा गर्नु;कुराकानी	हामी कक्षापछि कुरा गर्छौँ।
tall	अग्लो	मेरो शिक्षक अग्लो हुनुहुन्छ।
taxi	ट्याक्सी	ट्याक्सी बाहिर छ।
tea	चिया	यो चिया तातो छ।
teach	पढाउनु;सिकाउनु	म अङ्ग्रेजी पढाउँछु।
teacher	शिक्षक;शिक्षिका	शिक्षिका मुस्कुराउनुहुन्छ।
team	टोली;समूह	हाम्रो टोली आज जित्छ।
teenager	किशोर;किशोरी	किशोरले किताब पढ्छ।
telephone	टेलिफोन;फोन गर्नु	फोन टेबलमा छ।
television	टेलिभिजन;टिभी	टेलिभिजन नयाँ छ।
tell	भन्नु;बताउनु	मलाई आफ्नो नाम बताउनुहोस्।
ten	दस	मसँग दस किताब छन्।
tennis	टेनिस	आज हामी टेनिस खेल्छौँ।
terrible	नराम्रो;भयानक	मौसम धेरै नराम्रो छ।
test	परीक्षा;परीक्षण	परीक्षा अहिले सुरु हुन्छ।
text	सन्देश;पाठ	छोटो सन्देश पठाउनुहोस्।
than	भन्दा	दस दुईभन्दा धेरै हो।
thank	धन्यवाद दिनु	आफ्नो शिक्षकलाई धन्यवाद दिनुहोस्।
thanks	धन्यवाद	मद्दतका लागि धन्यवाद।
that	त्यो	त्यो किताब मेरो हो।
the	अङ्ग्रेजी निश्चित आर्टिकल	चिया तातो छ।
theatre	नाटकघर;थिएटर	थिएटर स्टेशननजिक छ।
their	उनीहरूको	उनीहरूको घर ठूलो छ।
them	उनीहरूलाई	म उनीहरूलाई चिन्छु।
then	त्यसपछि;त्यति बेला	खानुहोस्, त्यसपछि पढ्नुहोस्।
there	त्यहाँ	त्यहाँ एउटा कुर्सी छ।
they	उनीहरू	उनीहरू विद्यालयमा छन्।
thing	चिज;वस्तु	यो चिज उपयोगी छ।
think	सोच्नु	म घरबारे सोच्छु।
third	तेस्रो;एक तिहाइ	यो तेस्रो पाठ हो।
thirsty	तिर्खाएको	म तिर्खाएको छु।
thirteen	तेह्र	ऊ तेह्र वर्षको छ।
thirty	तीस	मेरी दिदी तीस वर्षकी छिन्।
this	यो	यो टिकट नयाँ छ।
thousand	एक हजार	एक हजार मानिस आए।
three	तीन	म तीन चरा देख्छु।
through	हुँदै;मार्फत	हामी पार्क हुँदै हिँड्छौँ।
Thursday	बिहीबार	हामी बिहीबार भेट्छौँ।
ticket	टिकट	मलाई टिकट चाहिन्छ।
time	समय;बजे	अहिले कति बज्यो?
tired	थाकेको	म थाकेको छु।
title	शीर्षक	शीर्षक पढ्नुहोस्।
to	तिर;लाई;का लागि	म कक्षामा जान्छु।
today	आज	आज घाम लागेको छ।
together	सँगै	हामी सँगै खान्छौँ।
toilet	शौचालय	शौचालय सफा छ।
tomato	गोलभेडा	यो गोलभेडा रातो छ।
tomorrow	भोलि	भोलि भेटौँला।
tonight	आज राति	हामी आज राति पढ्छौँ।
too	पनि;धेरै	मलाई पनि चिया चाहिन्छ।
tooth	दाँत	मेरो दाँत दुख्छ।
topic	विषय	विषय छान्नुहोस्।
tourist	पर्यटक	पर्यटकले फोटो खिच्छ।
town	सानो सहर;सहर	यो सानो सहर शान्त छ।
traffic	यातायात	यातायात ढिलो छ।
train	रेल;रेलगााडी	रेल ढिला छ।
travel	यात्रा गर्नु;यात्रा	हामी रेलबाट यात्रा गर्छौँ।
tree	रूख	रूख अग्लो छ।
trip	यात्रा;घुमाइ	यात्रा भोलि सुरु हुन्छ।
trousers	पाइन्ट;सुरुवाल	मेरो पाइन्ट कालो छ।
true	साँचो;ठीक	यो कथा साँचो हो।
try	प्रयास गर्नु;कोसिस गर्नु	यो चिया चाख्नुहोस्।
T-shirt	टी-शर्ट	म टी-शर्ट लगाउँछु।
Tuesday	मङ्गलबार	हामी मङ्गलबार भेट्छौँ।
turn	मोड्नु;पालो	यहाँ बायाँ मोड्नुहोस्।
TV	टिभी;टेलिभिजन	टिभीको आवाज ठूलो छ।
twelve	बाह्र	मसँग बाह्र पेन्सिल छन्।
twenty	बीस	यहाँ बीस विद्यार्थी छन्।
twice	दुई पटक	म हप्तामा दुई पटक पौडी खेल्छु।
two	दुई	दुई जना पर्खिरहेका छन्।
type	प्रकार;टाइप गर्नु	तिमीलाई कस्तो संगीत मन पर्छ?
umbrella	छाता	छाता लिनुहोस्।
uncle	काका;मामा	मेरा काका दयालु हुनुहुन्छ।
under	मुनि	झोला टेबलमुनि छ।
understand	बुझ्नु	म प्रश्न बुझ्छु।
university	विश्वविद्यालय	विश्वविद्यालय नजिक छ।
until	सम्म	पाँच बजेसम्म पर्खनुहोस्।
up	माथि;उठ्नु	अहिले उठ्नुहोस्।
upstairs	माथिल्लो तलामा	मेरो कोठा माथिल्लो तलामा छ।
us	हामीलाई	कृपया हामीलाई मद्दत गर्नुहोस्।
use	प्रयोग गर्नु;प्रयोग	यो कलम प्रयोग गर्नुहोस्।
useful	उपयोगी	यो कार्ड उपयोगी छ।
usually	सामान्यतया	म सामान्यतया घरसम्म हिँड्छु।
vacation	बिदा;छुट्टी	हाम्रो बिदा भोलि सुरु हुन्छ।
vegetable	तरकारी	गाजर तरकारी हो।
very	धेरै	कोठा धेरै शान्त छ।
video	भिडियो	यो भिडियो हेर्नुहोस्।
village	गाउँ	गाउँ सानो छ।
visit	भेट्न जानु;घुम्न जानु	हामी काकीको घर जान्छौँ।
visitor	आगन्तुक	आगन्तुक बाहिर पर्खन्छ।
wait	पर्खनु	कृपया यहाँ पर्खनुहोस्।
waiter	वेटर;सेवक	वेटरले चिया ल्याउँछ।
wake	बिउँझनु;ब्युँझाउनु	म बिहान चाँडै बिउँझन्छु।
walk	हिँड्नु	हामी विद्यालयसम्म हिँड्छौँ।
wall	भित्ता	भित्ता सेतो छ।
want	चाहनु	मलाई पानी चाहिन्छ।
warm	न्यानो	कोठा न्यानो छ।
wash	धुनु	आफ्ना हात धुनुहोस्।
watch	हेर्नु;घडी	म टिभी हेर्छु।
water	पानी;पानी हाल्नु	अलिकति पानी पिउनुहोस्।
way	बाटो;तरिका	यो बाटो छोटो छ।
we	हामी	हामी अङ्ग्रेजी सिक्छौँ।
wear	लगाउनु	म कोट लगाउँछु।
weather	मौसम	मौसम चिसो छ।
website	वेबसाइट	यो वेबसाइट उपयोगी छ।
Wednesday	बुधबार	कक्षा बुधबार सुरु हुन्छ।
week	हप्ता;साता	यो हप्ता व्यस्त छ।
weekend	सप्ताहन्त	सप्ताहन्त भोलि सुरु हुन्छ।
welcome	स्वागत;स्वागत गर्नु	हाम्रो कक्षामा स्वागत छ।
well	राम्रोसँग	उनी राम्रोसँग गाउँछिन्।
west	पश्चिम	सूर्य पश्चिममा अस्ताउँछ।
what	के	त्यहाँ के छ?
when	कहिले	तिमी कहिले पढ्छौ?
where	कहाँ	स्टेशन कहाँ छ?
which	कुन	कुन झोला तिम्रो हो?
white	सेतो	भित्ता सेतो छ।
who	को	त्यहाँ को छ?
why	किन	तिमी किन ढिला छौ?
wife	श्रीमती;पत्नी	उनकी श्रीमती शिक्षिका हुन्।
will modal	नेछ;हुनेछ	म तिमीलाई मद्दत गर्नेछु।
win	जित्नु	हाम्रो टोली जित्न सक्छ।
window	झ्याल	झ्याल खोल्नुहोस्।
wine	वाइन;मदिरा	यो वाइन रातो छ।
winter	जाडो;हिउँद	यहाँ जाडो चिसो हुन्छ।
with	सँग	मसँग आउनुहोस्।
without	बिना	चिनीबिना चिया राम्रो हुन्छ।
woman	महिला;नारी	महिला किताब पढ्छिन्।
wonderful	अद्भुत;उत्कृष्ट	दृश्य अद्भुत छ।
word	शब्द	एउटा शब्द लेख्नुहोस्।
work	काम गर्नु;काम	म घरमा काम गर्छु।
worker	कामदार;कर्मचारी	कर्मचारी व्यस्त छ।
world	संसार;विश्व	संसार ठूलो छ।
would modal	नेथ्यो;चाहन्थेँ	म चिया चाहन्थेँ।
write	लेख्नु	आफ्नो नाम लेख्नुहोस्।
writer	लेखक;लेखिका	लेखक यहाँ बस्छन्।
writing	लेखन;हस्तलेखन	उनको हस्तलेखन स्पष्ट छ।
wrong	गलत	यो उत्तर गलत छ।
yeah	हो	हो, म आउन सक्छु।
year	वर्ष;साल	यो वर्ष राम्रो छ।
yellow	पहेंलो	केरा पहेंलो छ।
yes	हो	हो, म बुझ्छु।
yesterday	हिजो	मैले हिजो फोन गरेँ।
you	तिमी;तपाईं	तिमी मेरो साथी हौ।
young	युवा;सानो	बालक सानो छ।
your	तिम्रो;तपाईंको	तिम्रो झोला यहाँ छ।
yourself	आफैँ	आफैँ चिया लिनुहोस्।`;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_004_147_v1_contract_v0.json",
    examples: "",
    outDir: "outputs/oxford-vocabulary/support-translations",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw.startsWith("--")) continue;
    const [key, inlineValue] = raw.split("=", 2);
    const value = inlineValue ?? argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    if (inlineValue === undefined) index += 1;
    if (key === "--contract") args.contract = value;
    else if (key === "--examples") args.examples = value;
    else if (key === "--out-dir") args.outDir = value;
    else throw new Error(`Unknown argument: ${key}`);
  }
  return args;
}

function normalizeText(value) {
  return String(value ?? "").replace(/\u00a0/gu, " ").replace(/\s+/gu, " ").trim();
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSONL at ${filePath}:${index + 1}: ${error.message}`);
      }
    });
}

async function writeJsonl(filePath, rows) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function parseTranslations() {
  const lines = NE_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tNE\texample_NE") {
    throw new Error("Unexpected NE translation TSV header");
  }
  if (lines.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} NE translation rows, found ${lines.length}`);
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad NE translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad NE translation row ${index + 2}: empty field`);
    }
    if (!DEVANAGARI_RE.test(display) || !DEVANAGARI_RE.test(example)) {
      throw new Error(`Bad NE translation row ${index + 2}: display/example must contain Devanagari text`);
    }
    if (LATIN_RE.test(display) || LATIN_RE.test(example)) {
      throw new Error(`Bad NE translation row ${index + 2}: display/example contains Latin fallback text`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Bad NE translation row ${index + 2}: display/example contains unexpected script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad NE example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate NE translation key: ${sourceHeadword}`);
    }
    map.set(sourceHeadword, { display, example });
  }
  return map;
}

function validateTranslationMap(rows, translations) {
  const sourceKeys = rows.map((row) => row.source_headword);
  const rowKeySet = new Set(sourceKeys);
  const missing = sourceKeys.filter((key) => !translations.has(key));
  const extra = [...translations.keys()].filter((key) => !rowKeySet.has(key));
  if (missing.length) {
    throw new Error(`Missing NE translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`NE translation map has unused rows: ${extra.join(", ")}`);
  }
}

function buildSupportRow(exampleRow, translation, generatedAt) {
  return {
    release_id: exampleRow.release_id,
    course_id: exampleRow.course_id,
    row_id: exampleRow.row_id,
    core_item_id: exampleRow.core_item_id,
    meaning_id: exampleRow.meaning_id,
    source_candidate_id: exampleRow.source_candidate_id,
    source_headword: exampleRow.source_headword,
    reviewed_display_headword: exampleRow.reviewed_display_headword,
    reviewed_part_of_speech: exampleRow.reviewed_part_of_speech,
    meaning_note: exampleRow.meaning_note,
    example_EN: exampleRow.example_EN,
    support_translation_batch: BATCH_ID,
    support_translation_status: "draft_native_style_needs_source_assisted_qa",
    support_example_status: "draft_scene_preserving_needs_source_assisted_qa",
    source_note:
      "Internal LunaCards Oxford support-language draft; support aid for English learning, not ordinary polyglot final delivery.",
    reviewer: "codex_oxford_part004_support_translation_batch_ne_v1",
    reviewed_at: generatedAt,
    generation_ready: false,
    remaining_blockers: (exampleRow.remaining_blockers ?? []).filter(
      (blocker) =>
        ![
          "english_pronunciation_source_check",
          "english_example_quality_check",
          "support_translation_meaning_check",
          "support_example_scene_check",
        ].includes(blocker)
    ),
    NE: translation.display,
    example_NE: translation.example,
  };
}

function updateContract(contract, batchPath, summaryPath, rows, generatedAt) {
  const batch = {
    batch_id: BATCH_ID,
    status: "draft_native_style_needs_source_assisted_qa_not_delivery_ready",
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    path: batchPath,
    summary_path: summaryPath,
    languages: [LANGUAGE],
    rows: rows.length,
    display_cells: rows.length,
    example_cells: rows.length,
    target_language_transcriptions_included: false,
    article_display_included: false,
    closes_gate_layer: [],
    does_not_close: [
      "support_translation_meaning_check",
      "support_example_scene_check",
      "weak_language_targeted_review",
      "support_translation_sample_review",
      "support_translation_source_backed_audit",
      "support_example_quality_audit",
      "support_article_display_repair_check",
      "final_delivery_approval_check",
    ],
  };
  const existing = contract.latest_support_translation_batches ?? [];
  contract.latest_support_translation_batches = [
    ...existing.filter((item) => item.batch_id !== BATCH_ID),
    batch,
  ];
  contract.next_stage_options = [
    "Generate the next support-language batch in language order: SI.",
    "Run weak-language targeted review and source-backed support-language audits after all support languages are covered.",
    "Export US/UK workbooks only after all support-language gates pass.",
  ];
  contract.updated_at = generatedAt;
  return contract;
}

const args = parseArgs(process.argv.slice(2));
const contract = await readJson(args.contract);
const examplesPath = args.examples || contract.latest_english_examples?.path;
if (!examplesPath) {
  throw new Error("No examples path provided and contract.latest_english_examples.path is empty");
}
const exampleRows = await readJsonl(examplesPath);
if (!exampleRows.length) {
  throw new Error("English examples artifact is empty");
}
if (exampleRows.length !== RELEASE_ENTRY_COUNT) {
  throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Part 004 rows, found ${exampleRows.length}`);
}
const releaseId = exampleRows[0].release_id;
if (releaseId !== RELEASE_ID) {
  throw new Error(`Unexpected release_id: ${releaseId}`);
}
const translations = parseTranslations();
validateTranslationMap(exampleRows, translations);

const generatedAt = new Date().toISOString();
const supportRows = exampleRows.map((row) => buildSupportRow(row, translations.get(row.source_headword), generatedAt));
const batchPath = path.join(args.outDir, `${releaseId}_support_translation_batch_${BATCH_ID}.jsonl`);
const summaryPath = path.join(args.outDir, `${releaseId}_support_translation_batch_${BATCH_ID}_summary.md`);
await writeJsonl(batchPath, supportRows);
await mkdir(path.dirname(summaryPath), { recursive: true });
await writeFile(
  summaryPath,
  [
    `# Oxford Part 004 Support Translation Batch ${BATCH_ID}: ${releaseId}`,
    "",
    `- Script version: \`${SCRIPT_VERSION}\``,
    `- Source rows: \`${examplesPath}\``,
    `- Rows: ${supportRows.length}`,
    `- Languages: ${LANGUAGE}`,
    "- Article display: false; Nepali uses normal Devanagari-script citation/base forms without artificial articles",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: NE Devanagari display/example cells, sentence punctuation, no Latin fallback and no unexpected-script leakage",
    "- Target-language transcriptions: not included",
    "- Postgres import: false",
    "- Google Sheet delivery: false",
    "",
    "This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.",
    "",
  ].join("\n"),
  "utf8"
);

const updatedContract = updateContract(contract, batchPath, summaryPath, supportRows, generatedAt);
await writeFile(args.contract, `${JSON.stringify(updatedContract, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      release_id: releaseId,
      batch_id: BATCH_ID,
      languages: [LANGUAGE],
      rows: supportRows.length,
      display_cells: supportRows.length,
      example_cells: supportRows.length,
      path: batchPath,
      contract_updated: args.contract,
      next_language: "SI",
    },
    null,
    2
  )
);
