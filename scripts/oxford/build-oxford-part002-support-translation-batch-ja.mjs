#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "JA";
const BATCH_ID = "ja_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-ja.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;
const JAPANESE_RE = /[\u3040-\u30FF\u4E00-\u9FFF]/u;

const JA_TRANSLATIONS_TSV = `source_headword	JA	example_JA
clothes	服; 衣類	私の服は清潔です。
club	クラブ	彼女は音楽クラブに行きます。
coat	コート	私のコートは暖かいです。
coffee	コーヒー	朝にコーヒーを飲みます。
cold	寒い; 冷たい	水は冷たいです。
college	大学	姉は大学で勉強しています。
colour	色	私の好きな色は青です。
come	来る	ここに来てください。
common	よくある; 一般的な	この名前はよくあります。
company	会社	母は会社で働いています。
compare	比べる; 比較する	この二つの写真を比べてください。
complete	完全な; 完成する	フォームは完成しています。
computer	コンピューター	このコンピューターは新しいです。
concert	コンサート	今夜コンサートに行きます。
conversation	会話	短い会話をしました。
cook	料理する; 料理人	家で夕食を作ります。
cooking	料理	父と料理するのが好きです。
cool	涼しい; かっこいい	部屋は涼しいです。
correct	正しい; 直す	あなたの答えは正しいです。
cost	費用; かかる	これはいくらですか。
could modal	できた; できるかもしれない	手伝うことができます。
country	国	カナダは大きな国です。
course	講座; コース	英語の講座を受けています。
cousin	いとこ	いとこは近くに住んでいます。
cow	牛	牛は草を食べます。
cream	クリーム	コーヒーにクリームを入れます。
create	作る; 創造する	彼らは新しいゲームを作ります。
culture	文化	地域の文化を学びます。
cup	カップ; コップ	このカップは空です。
customer	客; 顧客	お客さんが質問します。
cut	切る	りんごを半分に切ります。
dad	お父さん	お父さんは仕事中です。
dance	踊る; ダンス	夕食の後で踊ります。
dancer	ダンサー	ダンサーは速く動きます。
dancing	ダンス; 踊ること	踊ることは楽しいです。
dangerous	危険な	この道は危険です。
dark	暗い; 濃い	部屋は暗いです。
date	日付	今日は何日ですか。
daughter	娘	彼女の娘は六歳です。
day	日; 一日	よい一日を過ごしてください。
dear	親愛なる	親愛なる友達、ありがとう。
December	十二月	私の誕生日は十二月です。
decide	決める	今決めてください。
delicious	おいしい	このスープはおいしいです。
describe	説明する; 描写する	あなたの部屋を説明してください。
description	説明	短い説明を読んでください。
design	デザイン; 設計する	カードに簡単なデザインを作ります。
desk	机	本は私の机の上にあります。
detail	細部; 詳細	一つ細部が足りません。
dialogue	対話; 会話	今この対話を読んでください。
dictionary	辞書	授業で辞書を使います。
die	死ぬ	花は水がないと枯れます。
diet	食事; 食生活	私の食事には果物が入っています。
difference	違い	違いが一つあります。
different	違う; 異なる	私たちは違う名前です。
difficult	難しい	この質問は難しいです。
dinner	夕食	夕食の準備ができています。
dirty	汚い	私の靴は汚いです。
discuss	話し合う	計画について話し合います。
dish	皿; 料理	この皿は熱いです。
do1	する	何をしていますか。
doctor	医者	医者は忙しいです。
dog	犬	犬は外で走ります。
dollar	ドル	これは一ドルです。
door	ドア; 戸	ドアを閉めてください。
down	下へ; 下に	ここに座ってください。
downstairs	階下に; 下の階	台所は階下にあります。
draw	描く	小さな家を描いてください。
dress	ドレス; 服を着る	彼女は赤いドレスを着ています。
drink	飲み物; 飲む	水を飲みます。
drive	運転する	仕事へ車で行きます。
driver	運転手	運転手はここで止まります。
during	〜の間に	飛行中に寝ます。
DVD	DVD; ディーブイディー	このDVDは古いです。
each	それぞれの; 各	それぞれの子どもが本を持っています。
ear	耳	耳が痛いです。
early	早い	早く起きます。
east	東	太陽は東から昇ります。
easy	簡単な	このテストは簡単です。
eat	食べる	一緒に昼食を食べます。
egg	卵	卵を一つ食べます。
eight	八	カードが八枚あります。
eighteen	十八	彼女は十八歳です。
eighty	八十	祖父は八十歳です。
elephant	象	象は大きいです。
eleven	十一	授業は十一時に始まります。
else	ほかの; ほかに	ほかに何が必要ですか。
email	メール	私にメールを送ってください。
end	終わり; 終える	これは終わりです。
enjoy	楽しむ	この歌を楽しみます。
enough	十分な	時間は十分あります。
euro	ユーロ	これは一ユーロです。
even	〜でさえ	弟でさえ知っています。
evening	夕方; 夜	今夜会いましょう。
event	イベント; 出来事	イベントは今日始まります。
ever	今までに	今までに料理したことがありますか。
every	毎; すべての	毎日勉強します。
everybody	みんな; 誰も	みんなここにいます。
everyone	みんな; 全員	みんな音楽が好きです。
everything	すべて	すべて準備できています。
exam	試験	試験はもうすぐ始まります。
example	例	これはよい例です。
excited	わくわくした	今日はわくわくしています。
exciting	わくわくする	その試合はわくわくします。
exercise	運動; 練習	朝食の前に運動します。
expensive	高い	このコートは高いです。
explain	説明する	この言葉を説明してください。
extra	余分な; 追加の	余分な時間が必要です。
eye	目	目が赤いです。
face	顔	顔を洗ってください。
fact	事実	この事実は大切です。
fall	落ちる; 秋	秋に葉が落ちます。
false	間違った; 偽の	この答えは間違いです。
family	家族	私の家族は小さいです。
famous	有名な	彼女は有名な歌手です。
fantastic	すばらしい	コンサートはすばらしかったです。
far	遠い	学校は遠いです。
farm	農場	彼らは農場に住んでいます。
farmer	農家; 農民	農家は食べ物を育てます。
fast	速い	この電車は速いです。
fat	太った	その猫は太っています。
father	父; お父さん	父は背が高いです。
favourite	お気に入りの; 一番好きな	これは私の一番好きな歌です。
February	二月	ここでは二月は寒いです。
feel	感じる	幸せに感じます。
feeling	気持ち	その気持ちはわかります。
festival	祭り; フェスティバル	祭りは明日始まります。
few	少しの; 少数の	ここには学生が少しいます。
fifteen	十五	私は十五歳です。
fifth	第五の	これは第五回の授業です。
fifty	五十	母は五十歳です。
fill	満たす; 記入する	カップを水で満たしてください。
film	映画	映画を見ます。
final	最後の; 最終の	これは最後の質問です。
find	見つける	鍵を見つけました。
fine	元気な; よい	今は元気です。
finish	終える	宿題を終えてください。
fire	火; 火事	火は熱いです。
first	第一の; 最初の	彼女は列の最初です。
fish	魚	夕食に魚を食べます。
five	五	本が五冊あります。
flat	アパート	私のアパートは小さいです。
flight	便; フライト	便は遅れています。
floor	床; 階	かばんは床にあります。
flower	花	この花は黄色です。
fly	飛ぶ; 飛行機で行く	鳥は空を飛びます。
follow	ついて行く; 従う	私について来てください。
food	食べ物	食べ物の準備ができています。
foot	足	足が痛いです。
football	サッカー	今日はサッカーをします。
for	〜のために; 〜へ	この贈り物はあなたへのものです。
forget	忘れる	鍵を忘れないでください。
form	用紙; 形	用紙に記入してください。
forty	四十	父は四十歳です。
four	四	鳥が四羽見えます。
fourteen	十四	彼女は十四歳です。
fourth	第四の	これは四階です。
free	無料の; 自由な	チケットは無料です。
Friday	金曜日	金曜日に会いましょう。
friend	友達	私の友達はここにいます。
friendly	友好的な; 親切な	先生は親切です。
from	〜から	私はここ出身です。
front	前; 正面	それは前にあります。
fruit	果物	毎日果物を食べます。
full	いっぱいの; 満腹の	ボトルはいっぱいです。
fun	楽しさ; 楽しい	このゲームは楽しいです。
funny	おもしろい	その映画はおもしろいです。
future	未来	自分の未来について考えてください。
game	ゲーム; 試合	ゲームは今始まります。
garden	庭	庭はきれいです。
geography	地理	学校で地理を勉強します。
get	得る; 着く	六時に家に着きます。
girl	女の子	女の子は笑っています。
girlfriend	彼女; ガールフレンド	彼の彼女は親切です。
give	あげる; 渡す	本を私にください。
glass	グラス; ガラス	グラスで水を飲みます。
go	行く	今家に帰ります。
good	よい	このコーヒーはよいです。
goodbye	さようなら	さようなら、また明日。
grandfather	祖父	祖父は年を取っています。
grandmother	祖母	祖母はスープを作ります。
grandparent	祖父母	祖父母の一人が一緒に住んでいます。
great	すばらしい; 大きな	それはすばらしい考えです。
green	緑の	ドアは緑です。
grey	灰色の	空は灰色です。
group	グループ; 集団	小さなグループで作業してください。
grow	育つ; 育てる	植物は庭で育ちます。
guess	推測する; 当てる	答えを当ててください。
guitar	ギター	彼はギターを弾きます。
gym	ジム	ジムに行きます。
hair	髪	彼女は長い髪です。
half	半分	ケーキを半分に切ってください。
hand	手	手を上げてください。
happen	起こる	次に何が起こりますか。
happy	幸せな; うれしい	今日はうれしいです。
hard	硬い; 難しい	この椅子は硬いです。
hat	帽子	私の帽子は黒いです。
hate	嫌う	冷たいお茶が嫌いです。
have	持つ; ある	車を持っています。
have to modal	〜しなければならない	勉強しなければなりません。
he	彼	彼は私の兄です。
head	頭	頭が痛いです。
health	健康	よい食べ物は健康に役立ちます。
healthy	健康的な	この料理は健康的です。
hear	聞こえる; 聞く	音楽が聞こえます。
hello	こんにちは	こんにちは、お会いできてうれしいです。
help	助ける; 助け	助けてください。
her	彼女の; 彼女を	これは彼女のかばんです。
here	ここ	今ここに来てください。
hey	ねえ; やあ	ねえ、待ってください。
hi	やあ; こんにちは	こんにちは、元気ですか。
high	高い	壁は高いです。
him	彼を; 彼に	彼を知っています。
his	彼の	彼のコートは青いです。
history	歴史	歴史を勉強します。
hobby	趣味	読書は私の趣味です。
holiday	休暇; 休日	七月に休暇に行きます。
home	家; 家へ	家にいます。
homework	宿題	今夜宿題をしてください。
hope	望む; 希望する	あなたが来ることを願っています。
horse	馬	馬は速く走ります。
hospital	病院	病院は近くにあります。
hot	熱い; 暑い	スープは熱いです。
hotel	ホテル	ホテルはきれいです。
hour	時間	一時間待ってください。
house	家	この家は古いです。
how	どのように; どう	元気ですか。
however	しかし; けれども	しかし、ここにいられます。
hundred	百	百人が来ました。
hungry	おなかがすいた	おなかがすいています。
husband	夫	彼女の夫は医者です。
I	私	お茶が好きです。
ice	氷	氷は冷たいです。
ice cream	アイスクリーム	アイスクリームが欲しいです。
idea	考え; アイデア	それはよい考えです。
if	もし; なら	助けが必要なら電話してください。
imagine	想像する	小さな家を想像してください。
important	重要な	この授業は重要です。
improve	よくする; 上達する	上達したいです。
in	〜の中に; 〜に	鍵はかばんの中にあります。
include	含む; 入れる	名前を入れてください。
information	情報	もっと情報が必要です。
interest	興味	彼女は芸術に興味があります。
interested	興味がある	音楽に興味があります。
interesting	おもしろい	この本はおもしろいです。
internet	インターネット	インターネットは遅いです。
interview	面接; インタビュー	今日は面接があります。
into	〜の中へ	本をかばんに入れてください。
introduce	紹介する	友達を紹介してください。
island	島	この島は小さいです。
it	それ	寒いです。
its	それの	犬は自分のベッドが好きです。
jacket	ジャケット	私のジャケットは新しいです。
January	一月	一月は一年の最初の月です。
jeans	ジーンズ	私のジーンズは青いです。
job	仕事	新しい仕事が必要です。
join	参加する; 加わる	今日私たちの授業に参加してください。
journey	旅	旅は長いです。
juice	ジュース	オレンジジュースを飲みます。
July	七月	七月に旅行します。
June	六月	学校は六月に終わります。
just	ただ; ちょうど	水だけ必要です。
keep	保つ; 取っておく	この鍵を取っておいてください。
key	鍵	鍵をなくしました。
kilometre	キロメートル	一キロメートル歩きます。
kind (type)	種類	どんな種類の音楽が好きですか。
kitchen	台所; キッチン	台所はきれいです。
know	知る; 知っている	答えを知っています。
land	陸; 土地	飛行機は陸にあります。
language	言語	英語は一つの言語です。
large	大きい	この部屋は大きいです。
last1 (final)	最後の	これは最後のページです。
late	遅い	バスは遅れています。
later	後で	また後で会いましょう。
laugh	笑う	一緒に笑います。
learn	学ぶ	英語を学びます。
leave	去る; 出る	今家を出ます。
left	左; 左の	ここで左に曲がってください。
leg	脚	脚が痛いです。
lesson	授業; レッスン	授業は今始まります。
let	させる; 許す	私に手伝わせてください。
letter	手紙; 文字	手紙を書きます。
library	図書館	図書館は九時に開きます。
lie1	横になる	ベッドに横になってください。
life	生活; 人生	都市の生活はにぎやかです。
like (similar)	似ている; 〜のような	これはゲームのようです。
like (find sb/sth pleasant)	好きである	この歌が好きです。
line	列; 線	列に並んでください。
lion	ライオン	ライオンは寝ています。
list	リスト; 一覧	買い物リストを作ってください。
listen	聞く	先生の話を聞いてください。
little	小さい; 少しの	お金が少しあります。
live1	住む	学校の近くに住んでいます。
local	地元の	これは地元の店です。
long1	長い	道は長いです。
look	見る; 〜に見える	写真を見てください。
lose	なくす; 失う	チケットをなくさないでください。
lot	たくさん; 多く	宿題がたくさんあります。
love	愛; 愛する	家族を愛しています。
lunch	昼食	昼食の準備ができています。`;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_002_300_v1_contract_v0.json",
    examples: "",
    outDir: "outputs/oxford-vocabulary/support-translations",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--")) continue;
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    index += 1;
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
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad JA example punctuation for ${sourceHeadword}`);
    }
    if (!JAPANESE_RE.test(display)) {
      throw new Error(`Bad JA display script for ${sourceHeadword}`);
    }
    if (!JAPANESE_RE.test(example)) {
      throw new Error(`Bad JA example script for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate JA translation key: ${sourceHeadword}`);
    }
    map.set(sourceHeadword, { display, example });
  }
  return map;
}

function validateTranslationMap(rows, translations) {
  if (rows.length !== 300) {
    throw new Error(`Expected exactly 300 English example rows, got ${rows.length}`);
  }
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
    reviewer: "codex_oxford_part002_support_translation_batch_ja_v1",
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
  contract.status = "support_language_batches_in_progress_not_delivery_ready";
  contract.latest_support_translation_batches = [
    ...existing.filter((item) => item.batch_id !== BATCH_ID),
    batch,
  ];
  contract.next_stage_options = [
    "Generate the next support-language batch in language order.",
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
    `# Oxford Part 002 Support Translation Batch ${BATCH_ID}: ${releaseId}`,
    "",
    `- Script version: \`${SCRIPT_VERSION}\``,
    `- Source rows: \`${examplesPath}\``,
    `- Rows: ${supportRows.length}`,
    `- Languages: ${LANGUAGE}`,
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: JA Japanese script for display and example cells",
    "- Japanese spacing policy: no artificial spaces between kanji/kana tokens, particles and verbs",
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
