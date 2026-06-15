#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "JA";
const BATCH_ID = "ja_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-ja.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;
const JAPANESE_RE = /[\u3040-\u30FF\u3400-\u9FFF]/u;

const JA_TRANSLATIONS_TSV = `source_headword	JA	example_JA
take	取る;持っていく	チケットを取ってください。
talk	話す;会話	授業の後で話します。
tall	背が高い	私の先生は背が高いです。
taxi	タクシー	タクシーは外にいます。
tea	お茶	このお茶は熱いです。
teach	教える	私は英語を教えます。
teacher	先生;教師	先生は笑います。
team	チーム	私たちのチームは今日勝ちます。
teenager	十代の若者	その十代の若者は本を読みます。
telephone	電話;電話する	電話は机の上にあります。
television	テレビ	テレビは新しいです。
tell	言う;伝える	あなたの名前を教えてください。
ten	十	私は本を十冊持っています。
tennis	テニス	私たちは今日テニスをします。
terrible	ひどい	天気はひどいです。
test	テスト;試験	テストは今始まります。
text	テキストメッセージ;短信	短いメッセージを送ってください。
than	より	十は二より多いです。
thank	感謝する	先生に感謝してください。
thanks	ありがとう	助けてくれてありがとう。
that	あの;それ	あの本は私のものです。
the	英語の定冠詞	そのお茶は温かいです。
theatre	劇場	劇場は駅の近くです。
their	彼らの;彼女らの	彼らの家は大きいです。
them	彼らを;彼女らを	私は彼らを知っています。
then	それから;その時	食べて、それから勉強します。
there	そこ;そこに	そこに椅子があります。
they	彼ら;彼女ら	彼らは学校にいます。
thing	物;こと	これは役に立つ物です。
think	考える;思う	私は家のことを考えます。
third	三番目;三分の一	これは三番目の授業です。
thirsty	のどが渇いた	私はのどが渇いています。
thirteen	十三	彼女は十三歳です。
thirty	三十	私の姉は三十歳です。
this	この;これ	このチケットは新しいです。
thousand	千	千人が来ました。
three	三	鳥を三羽見ます。
through	通って;通り抜けて	私たちは公園を通ります。
Thursday	木曜日	木曜日に会います。
ticket	チケット;切符	チケットが必要です。
time	時間;時刻	今何時ですか？
tired	疲れた	私は疲れています。
title	題名;タイトル	題名を読んでください。
to	へ;に;するために	私は授業へ行きます。
today	今日	今日は晴れです。
together	一緒に	私たちは一緒に食べます。
toilet	トイレ	トイレはきれいです。
tomato	トマト	このトマトは赤いです。
tomorrow	明日	また明日。
tonight	今夜	私たちは今夜勉強します。
too	も;あまりに	私もお茶が欲しいです。
tooth	歯	歯が痛いです。
topic	話題;テーマ	話題を選んでください。
tourist	観光客	観光客は写真を撮ります。
town	町	この町は静かです。
traffic	交通	交通は遅いです。
train	電車;訓練する	電車は遅れています。
travel	旅行する;旅行	私たちは電車で旅行します。
tree	木	その木は高いです。
trip	旅行;遠足	旅行は明日始まります。
trousers	ズボン	私のズボンは黒いです。
true	本当の;正しい	その話は本当です。
try	試す;やってみる	このお茶を試してください。
T-shirt	Tシャツ	私はTシャツを着ています。
Tuesday	火曜日	火曜日に会います。
turn	曲がる;順番	ここで左に曲がってください。
TV	テレビ	テレビの音は大きいです。
twelve	十二	私はペンを十二本持っています。
twenty	二十	ここに二十人の学生がいます。
twice	二回	私は週に二回泳ぎます。
two	二	二人が待っています。
type	種類;タイプ	どんな種類の音楽ですか？
umbrella	傘	傘を持っていってください。
uncle	おじ	私のおじは親切です。
under	下に	かばんはテーブルの下にあります。
understand	理解する;分かる	私は質問を理解します。
university	大学	大学は近くにあります。
until	まで	五時まで待ってください。
up	上に;起きて	今立ち上がってください。
upstairs	上の階	私の部屋は上の階です。
us	私たちを;私たちに	私たちを助けてください。
use	使う;使用	このペンを使ってください。
useful	役に立つ	この地図は役に立ちます。
usually	ふつう;たいてい	私はたいてい歩いて帰ります。
vacation	休暇	私たちの休暇は明日始まります。
vegetable	野菜	にんじんは野菜です。
very	とても	部屋はとても静かです。
video	動画;ビデオ	この動画を見てください。
village	村	その村は小さいです。
visit	訪問する;訪ねる	私たちはおばを訪ねます。
visitor	訪問者	訪問者は外で待っています。
wait	待つ	ここで待ってください。
waiter	ウェイター	ウェイターがお茶を持ってきます。
wake	起きる;起こす	私は早く起きます。
walk	歩く;散歩	私たちは学校へ歩きます。
wall	壁	壁は白いです。
want	欲しい;望む	水が欲しいです。
warm	暖かい;温める	部屋は暖かいです。
wash	洗う	手を洗ってください。
watch	見る;腕時計	私はテレビを見ます。
water	水;水をやる	水を少し飲んでください。
way	道;方法	この道は短いです。
we	私たち	私たちは英語を勉強します。
wear	着る;身に着ける	私はジャケットを着ています。
weather	天気	天気は寒いです。
website	ウェブサイト	このウェブサイトは役に立ちます。
Wednesday	水曜日	授業は水曜日に始まります。
week	週	今週は忙しいです。
weekend	週末	週末は明日始まります。
welcome	ようこそ;歓迎する	私たちの授業へようこそ。
well	よく;上手に	彼女は上手に歌います。
west	西	太陽は西に沈みます。
what	何	あれは何ですか？
when	いつ	いつ勉強しますか？
where	どこ	駅はどこですか？
which	どれ;どの	どのかばんがあなたのものですか？
white	白い	壁は白いです。
who	誰	あれは誰ですか？
why	なぜ	なぜ遅れましたか？
wife	妻	彼の妻は先生です。
will modal	未来を表す助動詞;でしょう	私はあなたを助けます。
win	勝つ	私たちのチームは勝てます。
window	窓	窓を開けてください。
wine	ワイン	このワインは赤いです。
winter	冬	ここでは冬は寒いです。
with	一緒に;と	私と一緒に来てください。
without	なしで	砂糖なしのお茶で大丈夫です。
woman	女の人;女性	その女の人は本を読みます。
wonderful	すばらしい	眺めはすばらしいです。
word	単語;言葉	単語を一つ書いてください。
work	働く;仕事	私は家で働きます。
worker	労働者;働く人	その労働者は忙しいです。
world	世界	世界は大きいです。
would modal	丁寧な助動詞;でしょう	お茶をいただきたいです。
write	書く	あなたの名前を書いてください。
writer	作家	作家はここに住んでいます。
writing	書くこと;筆跡	彼女の筆跡はきれいです。
wrong	間違った;違う	この答えは間違っています。
yeah	うん;そう	うん、来られます。
year	年	今年は良い年です。
yellow	黄色い	バナナは黄色いです。
yes	はい	はい、分かります。
yesterday	昨日	昨日電話しました。
you	あなた;あなたたち	あなたは私の友だちです。
young	若い	その子どもは若いです。
your	あなたの	あなたのかばんはここにあります。
yourself	あなた自身	お茶を自分で取ってください。`;

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
  const lines = JA_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tJA\texample_JA") {
    throw new Error("Unexpected JA translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad JA translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad JA translation row ${index + 2}: empty field`);
    }
    if (!JAPANESE_RE.test(display) || !JAPANESE_RE.test(example)) {
      throw new Error(`Bad JA translation row ${index + 2}: display/example must contain Japanese script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad JA example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate JA translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing JA translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`JA translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_ja_v1",
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
    JA: translation.display,
    example_JA: translation.example,
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
    "Generate the next support-language batch in language order: KO.",
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
    "- Article display: not applicable for Japanese",
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
