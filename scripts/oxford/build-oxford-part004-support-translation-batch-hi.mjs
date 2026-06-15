#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "HI";
const BATCH_ID = "hi_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-hi.mjs";
const SENTENCE_END_RE = /[.!?।]$/u;
const DEVANAGARI_RE = /\p{Script=Devanagari}/u;
const UNEXPECTED_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const HI_TRANSLATIONS_TSV = `source_headword	HI	example_HI
take	लेना; साथ ले जाना	टिकट ले लो।
talk	बात करना; बातचीत	हम कक्षा के बाद बात करते हैं।
tall	लंबा	मेरे शिक्षक लंबे हैं।
taxi	टैक्सी	टैक्सी बाहर है।
tea	चाय	यह चाय गरम है।
teach	पढ़ाना; सिखाना	मैं अंग्रेज़ी पढ़ाता हूँ।
teacher	शिक्षक; शिक्षिका	शिक्षिका मुस्कुराती है।
team	टीम; दल	हमारी टीम आज जीतती है।
teenager	किशोर; किशोरी	किशोर किताब पढ़ता है।
telephone	टेलीफोन; फ़ोन करना	फ़ोन मेज़ पर है।
television	टेलीविज़न; टीवी	टेलीविज़न नया है।
tell	कहना; बताना	मुझे अपना नाम बताओ।
ten	दस	मेरे पास दस किताबें हैं।
tennis	टेनिस	आज हम टेनिस खेलते हैं।
terrible	भयानक	मौसम भयानक है।
test	परीक्षा; टेस्ट	परीक्षा अभी शुरू होती है।
text	संदेश; पाठ	छोटा संदेश भेजो।
than	से	दस दो से ज़्यादा है।
thank	धन्यवाद देना	अपने शिक्षक को धन्यवाद दो।
thanks	धन्यवाद; शुक्रिया	मदद के लिए धन्यवाद।
that	वह; वो	वह किताब मेरी है।
the	अंग्रेज़ी निश्चित आर्टिकल	चाय गरम है।
theatre	रंगमंच; थिएटर	थिएटर स्टेशन के पास है।
their	उनका; उनकी	उनका घर बड़ा है।
them	उन्हें; उनको	मैं उन्हें जानता हूँ।
then	फिर; तब	खाओ, फिर पढ़ो।
there	वहाँ; है	वहाँ एक कुर्सी है।
they	वे; वो	वे स्कूल में हैं।
thing	चीज़; वस्तु	यह चीज़ उपयोगी है।
think	सोचना	मैं घर के बारे में सोचता हूँ।
third	तीसरा; एक तिहाई	यह तीसरा पाठ है।
thirsty	प्यासा	मैं प्यासा हूँ।
thirteen	तेरह	वह तेरह साल का है।
thirty	तीस	मेरी बहन तीस साल की है।
this	यह	यह टिकट नया है।
thousand	हज़ार	हज़ार लोग आए।
three	तीन	मैं तीन पक्षी देखता हूँ।
through	से होकर; के ज़रिए	हम पार्क से होकर चलते हैं।
Thursday	गुरुवार	हम गुरुवार को मिलते हैं।
ticket	टिकट	मुझे टिकट चाहिए।
time	समय; बजे	अभी कितने बजे हैं?
tired	थका हुआ	मैं थका हुआ हूँ।
title	शीर्षक	शीर्षक पढ़ो।
to	को; तक; के लिए	मैं कक्षा में जाता हूँ।
today	आज	आज धूप है।
together	साथ	हम साथ खाते हैं।
toilet	शौचालय	शौचालय साफ़ है।
tomato	टमाटर	यह टमाटर लाल है।
tomorrow	कल	कल मिलते हैं।
tonight	आज रात	हम आज रात पढ़ते हैं।
too	भी; बहुत	मुझे भी चाय चाहिए।
tooth	दाँत	मेरा दाँत दुखता है।
topic	विषय	विषय चुनो।
tourist	पर्यटक	पर्यटक फ़ोटो लेता है।
town	कस्बा; शहर	यह कस्बा शांत है।
traffic	यातायात	यातायात धीमा है।
train	रेल; ट्रेन	ट्रेन देर से है।
travel	यात्रा करना; यात्रा	हम ट्रेन से यात्रा करते हैं।
tree	पेड़	पेड़ लंबा है।
trip	यात्रा; सैर	सैर कल शुरू होती है।
trousers	पतलून	मेरी पतलून काली है।
true	सच्चा; सही	यह कहानी सच्ची है।
try	कोशिश करना	यह चाय आज़माओ।
T-shirt	टी-शर्ट	मैं टी-शर्ट पहनता हूँ।
Tuesday	मंगलवार	हम मंगलवार को मिलते हैं।
turn	मुड़ना; बारी	यहाँ बाएँ मुड़ो।
TV	टीवी	टीवी तेज़ है।
twelve	बारह	मेरे पास बारह पेंसिलें हैं।
twenty	बीस	यहाँ बीस छात्र हैं।
twice	दो बार	मैं हफ्ते में दो बार तैरता हूँ।
two	दो	दो लोग इंतज़ार कर रहे हैं।
type	प्रकार; टाइप करना	तुम्हें किस प्रकार का संगीत चाहिए?
umbrella	छाता	छाता ले लो।
uncle	चाचा; मामा	मेरे चाचा दयालु हैं।
under	नीचे	बैग मेज़ के नीचे है।
understand	समझना	मैं सवाल समझता हूँ।
university	विश्वविद्यालय	विश्वविद्यालय पास है।
until	तक	पाँच बजे तक इंतज़ार करो।
up	ऊपर	अब उठो।
upstairs	ऊपर; ऊपर की मंज़िल पर	मेरा कमरा ऊपर है।
us	हमें; हमको	कृपया हमारी मदद करो।
use	इस्तेमाल करना; उपयोग	यह पेन इस्तेमाल करो।
useful	उपयोगी	यह कार्ड उपयोगी है।
usually	आमतौर पर	मैं आमतौर पर पैदल घर जाता हूँ।
vacation	छुट्टी	हमारी छुट्टी कल शुरू होती है।
vegetable	सब्ज़ी	गाजर एक सब्ज़ी है।
very	बहुत	कमरा बहुत शांत है।
video	वीडियो	यह वीडियो देखो।
village	गाँव	गाँव छोटा है।
visit	मिलने जाना; देखना	हम बुआ से मिलने जाते हैं।
visitor	आगंतुक	आगंतुक बाहर इंतज़ार करता है।
wait	इंतज़ार करना	कृपया यहाँ इंतज़ार करो।
waiter	वेटर	वेटर चाय लाता है।
wake	जागना; जगाना	मैं जल्दी जागता हूँ।
walk	चलना; सैर	हम स्कूल तक चलते हैं।
wall	दीवार	दीवार सफ़ेद है।
want	चाहना	मुझे पानी चाहिए।
warm	गरम; गर्म	कमरा गरम है।
wash	धोना	अपने हाथ धोओ।
watch	देखना; घड़ी	मैं टीवी देखता हूँ।
water	पानी; पानी देना	थोड़ा पानी पियो।
way	रास्ता; तरीका	यह रास्ता छोटा है।
we	हम	हम अंग्रेज़ी सीखते हैं।
wear	पहनना	मैं कोट पहनता हूँ।
weather	मौसम	मौसम ठंडा है।
website	वेबसाइट	यह वेबसाइट उपयोगी है।
Wednesday	बुधवार	कक्षा बुधवार को शुरू होती है।
week	हफ्ता; सप्ताह	यह हफ्ता व्यस्त है।
weekend	सप्ताहांत	सप्ताहांत कल शुरू होता है।
welcome	स्वागत; स्वागत करना	हमारी कक्षा में आपका स्वागत है।
well	अच्छी तरह	वह अच्छी तरह गाती है।
west	पश्चिम	सूरज पश्चिम में डूबता है।
what	क्या	वहाँ क्या है?
when	कब	तुम कब पढ़ते हो?
where	कहाँ	स्टेशन कहाँ है?
which	कौन सा	कौन सा बैग तुम्हारा है?
white	सफ़ेद	दीवार सफ़ेद है।
who	कौन	वहाँ कौन है?
why	क्यों	तुम देर से क्यों हो?
wife	पत्नी	उसकी पत्नी शिक्षिका है।
will modal	गा; होगी	मैं तुम्हारी मदद करूँगा।
win	जीतना	हमारी टीम जीत सकती है।
window	खिड़की	खिड़की खोलो।
wine	वाइन	यह वाइन लाल है।
winter	सर्दी	यहाँ सर्दी ठंडी है।
with	के साथ	मेरे साथ आओ।
without	बिना	चीनी के बिना चाय अच्छी है।
woman	औरत; महिला	महिला किताब पढ़ती है।
wonderful	शानदार	दृश्य शानदार है।
word	शब्द	एक शब्द लिखो।
work	काम करना; काम	मैं घर पर काम करता हूँ।
worker	कर्मचारी; मज़दूर	कर्मचारी व्यस्त है।
world	दुनिया	दुनिया बड़ी है।
would modal	गा; चाहूँगा	मुझे चाय चाहिए होगी।
write	लिखना	अपना नाम लिखो।
writer	लेखक; लेखिका	लेखक यहाँ रहता है।
writing	लेखन; लिखावट	उसकी लिखावट साफ़ है।
wrong	गलत	यह जवाब गलत है।
yeah	हाँ	हाँ, मैं आ सकता हूँ।
year	साल; वर्ष	यह साल अच्छा है।
yellow	पीला	केला पीला है।
yes	हाँ	हाँ, मैं समझता हूँ।
yesterday	कल	मैंने कल फ़ोन किया।
you	तुम; आप	तुम मेरे दोस्त हो।
young	युवा; छोटा	बच्चा छोटा है।
your	तुम्हारा; आपका	तुम्हारा बैग यहाँ है।
yourself	खुद; अपने आप	खुद चाय ले लो।`;

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
  const lines = HI_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tHI\texample_HI") {
    throw new Error("Unexpected HI translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad HI translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad HI translation row ${index + 2}: empty field`);
    }
    if (!DEVANAGARI_RE.test(display) || !DEVANAGARI_RE.test(example)) {
      throw new Error(`Bad HI translation row ${index + 2}: display/example must contain Devanagari text`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Bad HI translation row ${index + 2}: display/example contains unexpected script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad HI example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate HI translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing HI translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`HI translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_hi_v1",
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
    HI: translation.display,
    example_HI: translation.example,
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
    "Generate the next support-language batch in language order: BN.",
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
const translations = parseTranslations();
validateTranslationMap(exampleRows, translations);

const releaseId = exampleRows[0].release_id;
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
    "- Article display: false; Hindi uses normal citation forms without artificial articles",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: HI Devanagari display/example cells and no unexpected script",
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
      next_language: "BN",
    },
    null,
    2
  )
);
