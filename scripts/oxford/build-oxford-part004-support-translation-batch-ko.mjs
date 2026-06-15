#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "KO";
const BATCH_ID = "ko_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-ko.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;
const HANGUL_RE = /[\uAC00-\uD7AF]/u;

const KO_TRANSLATIONS_TSV = `source_headword	KO	example_KO
take	가져가다;받다	표를 받아 가세요.
talk	말하다;대화	수업 후에 이야기해요.
tall	키가 큰	우리 선생님은 키가 커요.
taxi	택시	택시가 밖에 있어요.
tea	차	이 차는 따뜻해요.
teach	가르치다	나는 영어를 가르쳐요.
teacher	선생님;교사	선생님이 웃어요.
team	팀	우리 팀은 오늘 이겨요.
teenager	십대;청소년	그 십대는 책을 읽어요.
telephone	전화;전화하다	전화는 책상 위에 있어요.
television	텔레비전	텔레비전은 새것이에요.
tell	말하다;알리다	이름을 말해 주세요.
ten	열	나는 책 열 권이 있어요.
tennis	테니스	오늘 테니스를 쳐요.
terrible	끔찍한;형편없는	날씨가 형편없어요.
test	시험;검사	시험이 지금 시작해요.
text	문자 메시지;문자를 보내다	짧은 문자를 보내세요.
than	보다	열은 둘보다 많아요.
thank	감사하다	선생님께 감사하세요.
thanks	고마워요;감사	도와줘서 고마워요.
that	저것;그것	저 책은 내 것이에요.
the	영어 정관사	그 차는 따뜻해요.
theatre	극장	극장은 역 근처에 있어요.
their	그들의	그들의 집은 커요.
them	그들을;그들에게	나는 그들을 알아요.
then	그때;그다음에	먹고 그다음에 공부해요.
there	거기;거기에	거기에 의자가 있어요.
they	그들	그들은 학교에 있어요.
thing	물건;일	이 물건은 유용해요.
think	생각하다	나는 집을 생각해요.
third	세 번째;삼분의 일	이것은 세 번째 수업이에요.
thirsty	목마른	나는 목말라요.
thirteen	열셋	그녀는 열세 살이에요.
thirty	서른	내 언니는 서른 살이에요.
this	이것;이	이 표는 새것이에요.
thousand	천	천 명이 왔어요.
three	셋	새 세 마리를 봐요.
through	통해;지나서	우리는 공원을 지나가요.
Thursday	목요일	목요일에 만나요.
ticket	표;티켓	표가 필요해요.
time	시간;시각	지금 몇 시예요?
tired	피곤한	나는 피곤해요.
title	제목	제목을 읽어 주세요.
to	에;에게;하기 위해	나는 수업에 가요.
today	오늘	오늘은 맑아요.
together	함께	우리는 함께 먹어요.
toilet	화장실	화장실은 깨끗해요.
tomato	토마토	이 토마토는 빨간색이에요.
tomorrow	내일	내일 만나요.
tonight	오늘 밤	우리는 오늘 밤 공부해요.
too	또한;너무	나도 차를 원해요.
tooth	이;치아	이가 아파요.
topic	주제	주제를 고르세요.
tourist	관광객	관광객이 사진을 찍어요.
town	마을;소도시	이 마을은 조용해요.
traffic	교통	교통이 느려요.
train	기차;훈련하다	기차가 늦어요.
travel	여행하다;여행	우리는 기차로 여행해요.
tree	나무	그 나무는 높아요.
trip	여행	여행은 내일 시작해요.
trousers	바지	내 바지는 검은색이에요.
true	진짜의;맞는	그 이야기는 진짜예요.
try	시도하다;먹어 보다	이 차를 마셔 보세요.
T-shirt	티셔츠	나는 티셔츠를 입어요.
Tuesday	화요일	화요일에 만나요.
turn	돌다;차례	여기서 왼쪽으로 도세요.
TV	텔레비전;TV	텔레비전 소리가 커요.
twelve	열둘	나는 펜 열두 자루가 있어요.
twenty	스물	여기 학생 스무 명이 있어요.
twice	두 번	나는 일주일에 두 번 수영해요.
two	둘	두 사람이 기다려요.
type	종류;유형	어떤 종류의 음악이에요?
umbrella	우산	우산을 가져가세요.
uncle	삼촌;외삼촌	내 삼촌은 친절해요.
under	아래에	가방은 책상 아래에 있어요.
understand	이해하다	나는 질문을 이해해요.
university	대학교	대학교는 가까워요.
until	까지	다섯 시까지 기다리세요.
up	위로;일어나서	지금 일어나세요.
upstairs	위층에;위층	내 방은 위층에 있어요.
us	우리를;우리에게	우리를 도와주세요.
use	사용하다	이 펜을 사용하세요.
useful	유용한	이 지도는 유용해요.
usually	보통;대개	나는 보통 걸어서 집에 가요.
vacation	휴가	우리 휴가는 내일 시작해요.
vegetable	채소	당근은 채소예요.
very	매우	방이 매우 조용해요.
video	비디오;영상	이 영상을 보세요.
village	마을	그 마을은 작아요.
visit	방문하다	우리는 박물관을 방문해요.
visitor	방문객	방문객이 밖에서 기다려요.
wait	기다리다	여기서 기다리세요.
waiter	웨이터	웨이터가 차를 가져와요.
wake	깨다;깨우다	나는 일찍 일어나요.
walk	걷다;산책	우리는 학교까지 걸어요.
wall	벽	벽은 하얘요.
want	원하다	물을 원해요.
warm	따뜻한;데우다	방이 따뜻해요.
wash	씻다	손을 씻으세요.
watch	보다;시계	나는 텔레비전을 봐요.
water	물;물을 주다	물을 조금 마시세요.
way	길;방법	이 길은 짧아요.
we	우리	우리는 영어를 공부해요.
wear	입다;착용하다	나는 재킷을 입어요.
weather	날씨	날씨가 추워요.
website	웹사이트	이 웹사이트는 유용해요.
Wednesday	수요일	수업은 수요일에 시작해요.
week	주;일주일	이번 주는 바빠요.
weekend	주말	주말은 내일 시작해요.
welcome	환영하다;어서 오세요	우리 수업에 어서 오세요.
well	잘;건강한	그녀는 노래를 잘해요.
west	서쪽	해는 서쪽으로 져요.
what	무엇	저것은 무엇이에요?
when	언제	언제 공부해요?
where	어디	역은 어디예요?
which	어느;어떤	어느 가방이 당신 것이에요?
white	하얀;흰색	벽은 흰색이에요.
who	누구	저 사람은 누구예요?
why	왜	왜 늦었어요?
wife	아내	그의 아내는 선생님이에요.
will modal	미래 조동사;할 것이다	내가 도와줄 거예요.
win	이기다	우리 팀은 이길 수 있어요.
window	창문	창문을 열어 주세요.
wine	와인	이 와인은 빨간색이에요.
winter	겨울	여기 겨울은 추워요.
with	와;함께	나와 함께 오세요.
without	없이	설탕 없이 차도 괜찮아요.
woman	여자;여성	그 여자는 책을 읽어요.
wonderful	훌륭한;멋진	경치가 정말 멋져요.
word	단어;말	단어 하나를 쓰세요.
work	일하다;일	나는 집에서 일해요.
worker	노동자;일하는 사람	그 노동자는 바빠요.
world	세계	세계는 커요.
would modal	정중한 조동사;하고 싶다	차를 마시고 싶어요.
write	쓰다	이름을 쓰세요.
writer	작가	작가는 여기에 살아요.
writing	글쓰기;필체	그녀의 필체는 깨끗해요.
wrong	틀린;잘못된	이 답은 틀렸어요.
yeah	응;그래	응, 갈 수 있어요.
year	해;년	올해는 좋은 해예요.
yellow	노란색;노란	바나나는 노란색이에요.
yes	네	네, 이해해요.
yesterday	어제	어제 전화했어요.
you	너;당신	당신은 내 친구예요.
young	어린;젊은	그 아이는 어려요.
your	너의;당신의	당신의 가방은 여기 있어요.
yourself	너 자신;당신 자신	차를 직접 가져가세요.`;

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
  const lines = KO_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tKO\texample_KO") {
    throw new Error("Unexpected KO translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad KO translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad KO translation row ${index + 2}: empty field`);
    }
    if (!HANGUL_RE.test(display) || !HANGUL_RE.test(example)) {
      throw new Error(`Bad KO translation row ${index + 2}: display/example must contain Hangul`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad KO example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate KO translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing KO translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`KO translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_ko_v1",
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
    KO: translation.display,
    example_KO: translation.example,
  };
}

function updateContract(contract, batchPath, summaryPath, rows) {
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
    "Generate the next support-language batch in language order: VI.",
    "Run weak-language targeted review and source-backed support-language audits after all support languages are covered.",
    "Export US/UK workbooks only after all support-language gates pass.",
  ];
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
    "- Article display: not applicable for Korean",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Target-language transcriptions: not included",
    "- Postgres import: false",
    "- Google Sheet delivery: false",
    "",
    "This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.",
    "",
  ].join("\n"),
  "utf8"
);

const updatedContract = updateContract(contract, batchPath, summaryPath, supportRows);
updatedContract.updated_at = generatedAt;
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
    },
    null,
    2
  )
);
