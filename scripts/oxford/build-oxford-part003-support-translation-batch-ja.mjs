#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "JA";
const BATCH_ID = "ja_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-ja.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;
const JAPANESE_RE = /[\u3040-\u30FF\u3400-\u9FFF]/u;
const WHITESPACE_RE = /\s/u;

const JA_TRANSLATIONS_TSV = `source_headword	JA	example_JA
machine	機械;マシン	その機械はコーヒーを作ります。
magazine	雑誌	彼女は音楽雑誌を読みます。
main	主な;主要な	これは正面のドアです。
make	作る;する	私は家で昼食を作ります。
man	男の人	その男の人は私の先生です。
many	多くの;たくさんの	多くの学生がここにいます。
map	地図	地図を見てください。
March	三月	私の誕生日は三月です。
market	市場;マーケット	私たちは市場で果物を買います。
married	結婚している	私の姉は結婚しています。
May	五月	学校は五月に終わります。
maybe	たぶん;もしかすると	たぶん雨が降ります。
me	私を;私に	私を助けてください。
meal	食事	この食事は温かいです。
mean	意味する	この標識は何を意味しますか？
meaning	意味	意味は何ですか？
meat	肉	私は夕食に肉を食べます。
meet	会う	私たちは授業の後で会います。
meeting	会議;集まり	会議は今始まります。
member	メンバー;会員	彼女はクラブの会員です。
menu	メニュー	メニューを読んでください。
message	メッセージ	短いメッセージを送ります。
metre	メートル	一メートル前に歩いてください。
midnight	真夜中	電車は真夜中に出発します。
mile	マイル	私たちは一マイル歩きます。
milk	牛乳	私は朝食に牛乳を飲みます。
million	百万	ここに百万人が住んでいます。
minute1	分	一分待ってください。
miss	恋しく思う;逃す	私は古い学校が恋しいです。
mistake	間違い	この答えには間違いがあります。
model	模型;モデル	これは小さな模型です。
modern	現代的な	台所は現代的です。
moment	瞬間;少しの間	少し待ってください。
Monday	月曜日	私たちは月曜日に仕事を始めます。
money	お金	少しお金が必要です。
month	月;一か月	六月は暑い月です。
more	もっと;より多く	もっと時間が必要です。
morning	朝	私は朝に勉強します。
most	ほとんど;最も	ほとんどの学生は音楽が好きです。
mother	母	私の母は今日働きます。
mountain	山	その山は高いです。
mouse	ねずみ;マウス	ねずみが椅子の下にいます。
mouth	口	口を開けてください。
move	動かす;移動する	椅子をここに動かしてください。
movie	映画	私たちは今夜映画を見ます。
much	たくさん;いくら	これはいくらですか？
mum	ママ;母	ママは家にいます。
museum	博物館	博物館は十時に開きます。
music	音楽	私は音楽を聞きます。
must modal	しなければならない	ここで止まらなければなりません。
my	私の	これは私の本です。
name	名前;名付ける	ここに名前を書いてください。
natural	自然な	このジュースは自然です。
near	近い;近くに	銀行はこの近くです。
need	必要とする	ペンが必要です。
negative	否定的な;マイナスの	この答えは否定的です。
neighbour	隣人	私の隣人は親切です。
never	決してない	私は決してコーヒーを飲みません。
new	新しい	この電話は新しいです。
news	ニュース	今日のニュースは良いです。
newspaper	新聞	彼は新聞を読みます。
next	次の	次のバスは遅れています。
next to	隣に	私の隣に座ってください。
nice	よい;親切な	部屋は感じがよいです。
night	夜	私は夜に寝ます。
nine	九	九人の学生がここにいます。
nineteen	十九	彼女は十九歳です。
ninety	九十	私の祖父は九十歳です。
no	いいえ;ない	いいえ、結構です。
no one	誰もいない	部屋には誰もいません。
nobody	誰もいない	家には誰もいません。
north	北	駅はここから北にあります。
nose	鼻	私の鼻は冷たいです。
not	ない;ではない	私は疲れていません。
note	メモ;ノート	今メモを書いてください。
nothing	何もない	箱の中には何もありません。
November	十一月	私のコースは十一月に始まります。
now	今	今ここに来てください。
number	数;番号	ここに番号を書いてください。
nurse	看護師	看護師は親切です。
object	物;対象	その物をテーブルに置いてください。
o’clock	時	授業は九時に始まります。
October	十月	私たちは十月に旅行します。
of	の	これはお茶のカップです。
off	消えている;離れて	電気を消してください。
office	事務所;オフィス	私の事務所は小さいです。
often	よく;しばしば	私はよく歩いて学校へ行きます。
oh	ああ	ああ、今わかりました。
OK	大丈夫;オーケー	これは大丈夫ですか？
old	古い;年を取った	この家は古いです。
on	上に;ついている	本はテーブルの上にあります。
once	一度	私は週に一度電話します。
one	一	私には姉が一人います。
onion	玉ねぎ	玉ねぎを一つ切ってください。
online	オンライン	私はオンラインで勉強します。
only	だけ;ただ	私はかばんを一つだけ持っています。
open	開ける;開いている	窓を開けてください。
opinion	意見	あなたの意見は何ですか？
opposite	向かいの;反対の	店は銀行の向かいです。
or	または	お茶ですか、それともコーヒーですか？
orange	オレンジ;オレンジ色	このオレンジは甘いです。
order	注文する;注文	私はスープを注文します。
other	ほかの;別の	別のドアを使ってください。
our	私たちの	これは私たちの教室です。
out	外へ;外に	昼食の後で外へ出てください。
outside	外で;外側	子どもたちは外で遊びます。
over	上を;越えて	飛行機は町の上を飛びます。
own	自分の	私には自分の部屋があります。
page	ページ	十ページを開いてください。
paint	塗る;描く	壁を青く塗ってください。
painting	絵;絵画	この絵は美しいです。
pair	一組;一足	靴下が一足必要です。
paper	紙	この紙に書いてください。
paragraph	段落	最初の段落を読んでください。
parent	親	親が外で待っています。
park	駐車する;公園	駅の近くに駐車します。
part	部分	この部分は簡単です。
partner	相手;パートナー	パートナーと一緒に働いてください。
party	パーティー	パーティーは七時に始まります。
passport	パスポート	パスポートを見せてください。
past	過ぎた;過去の	六時半です。
pay	払う	カードで払います。
pen	ペン	このペンは青いです。
pencil	鉛筆	私は鉛筆で書きます。
people	人々	多くの人がここにいます。
pepper	こしょう	スープにこしょうを入れてください。
perfect	完璧な	あなたの答えは完璧です。
period	期間;授業時間	授業時間は短いです。
person	人	一人の人が待っています。
personal	個人の	これは私の個人用電話です。
phone	電話;携帯電話	私の携帯電話はかばんの中です。
photo	写真	ここで写真を撮ってください。
photograph	写真;写真を撮る	この写真は古いです。
phrase	句;フレーズ	そのフレーズを繰り返してください。
piano	ピアノ	彼女はピアノを弾きます。
picture	絵;写真	この絵を見てください。
piece	一切れ;一片	ケーキを一切れ取ってください。
pig	豚	豚は農場にいます。
pink	ピンクの	彼女のかばんはピンクです。
place	場所;置く	この場所は静かです。
plan	計画	私たちには計画が必要です。
plane	飛行機	飛行機は遅れています。
plant	植物;植える	今日植物に水をやってください。
play	遊ぶ;演奏する	子どもたちは公園で遊びます。
player	選手;プレーヤー	その選手は速く走ります。
please	お願いします;どうぞ	どうぞここに座ってください。
point	点;要点	この点は大切です。
police	警察	警察は外にいます。
policeman	警察官	その警察官は私たちを助けます。
pool	プール	プールは冷たいです。
poor	貧しい;かわいそうな	そのかわいそうな子はおなかがすいています。
popular	人気のある	この歌は人気があります。
positive	前向きな;肯定的な	これは前向きな結果です。
possible	可能な	今日は可能ですか？
post	投稿;郵便	彼女の投稿をオンラインで読みます。
potato	じゃがいも	私はじゃがいもを食べます。
pound	ポンド	それは一ポンドかかります。
practice	練習	練習は毎日役に立ちます。
practise	練習する	私は毎日英語を練習します。
prefer	より好む	私はお茶のほうが好きです。
prepare	準備する	今夜かばんを準備してください。
present	出席している;贈り物	彼女は今日出席しています。
pretty	かわいい;かなり	庭はきれいです。
price	価格;値段	値段は安いです。
probably	たぶん;おそらく	彼女はたぶん知っています。
problem	問題	この問題は小さいです。
product	製品	この製品は新しいです。
programme	番組;プログラム	番組は今始まります。
project	プロジェクト;計画	私たちのプロジェクトは準備できています。
purple	紫の	シャツは紫です。
put	置く	本をここに置いてください。
quarter	四分の一;十五分	二時十五分です。
question	質問	質問を一つしてください。
quick	速い	これは速いテストです。
quickly	速く	速く歩いてください。
quiet	静かな	図書館は静かです。
quite	かなり	この部屋はかなり小さいです。
radio	ラジオ	ラジオの音は大きいです。
rain	雨;雨が降る	雨が今降り始めます。
read	読む	この文を読んでください。
reader	読者	その読者は物語が好きです。
reading	読書;読むこと	読書は私の学習を助けます。
ready	準備できた	夕食は準備できています。
real	本当の;現実の	これは本当の問題です。
really	本当に	私はこの歌が本当に好きです。
reason	理由	理由を教えてください。
red	赤い	ドアは赤いです。
relax	くつろぐ	仕事の後でくつろいでください。
remember	覚えている;忘れない	パスポートを忘れないでください。
repeat	繰り返す	文を繰り返してください。
report	報告書;報告する	今夜報告書を読んでください。
restaurant	レストラン	レストランは混んでいます。
result	結果	結果は良いです。
return	返す;戻る	明日その本を返してください。
rice	ご飯;米	私は昼食にご飯を食べます。
rich	裕福な	その町は裕福です。
ride	乗る	私は自転車に乗ります。
right	右;正しい	ここで右に曲がってください。
river	川	その川は広いです。
road	道;道路	この道は長いです。
room	部屋	私の部屋はきれいです。
routine	日課	私の日課は早く始まります。
rule	規則	この規則は簡単です。
run	走る	私は毎朝走ります。
sad	悲しい	彼は今日悲しそうです。
salad	サラダ	このサラダは新鮮です。
salt	塩	少し塩を入れてください。
same	同じ	私たちは同じかばんを持っています。
sandwich	サンドイッチ	私はサンドイッチを食べます。
Saturday	土曜日	私たちは土曜日に会います。
say	言う	あなたの名前を言ってください。
school	学校	私の学校は近くにあります。
science	科学	私は科学を勉強します。
scientist	科学者	科学者が質問します。
sea	海	海は青いです。
second1 (unit of time)	秒	一秒待ってください。
section	部分;節	この部分を読んでください。
see	見る;会う	私は友だちを見ます。
sell	売る	彼らは新鮮な果物を売ります。
send	送る	今メッセージを送ってください。
sentence	文	文を一つ書いてください。
September	九月	学校は九月に始まります。
seven	七	七人がここにいます。
seventeen	十七	彼は十七歳です。
seventy	七十	私の祖母は七十歳です。
share	共有する;分ける	ケーキを分けてください。
she	彼女	彼女は私の姉です。
sheep	羊	羊は草を食べます。
shirt	シャツ	彼のシャツはきれいです。
shoe	靴	片方の靴がベッドの下にあります。
shop	店;買い物をする	店は早く閉まります。
shopping	買い物	今日は買い物が楽しいです。
short	短い	この物語は短いです。
should modal	すべき	今日は休むべきです。
show	見せる;ショー	チケットを見せてください。
shower	シャワー	私はシャワーを浴びます。
sick	病気の;気分が悪い	今日は気分が悪いです。
similar	似ている	私たちのかばんは似ています。
sing	歌う	私は授業で歌います。
singer	歌手	その歌手は有名です。
sister	姉妹;姉;妹	私の妹は若いです。
sit	座る	窓の近くに座ってください。
situation	状況	この状況は新しいです。
six	六	六冊の本があります。
sixteen	十六	彼女は十六歳です。
sixty	六十	私の父は六十歳です。
skill	技能;スキル	このスキルは役に立ちます。
skirt	スカート	彼女のスカートは青いです。
sleep	眠る;睡眠	私は八時間眠ります。
slow	遅い	バスは遅いです。
small	小さい	部屋は小さいです。
snake	へび	そのへびは長いです。
snow	雪;雪が降る	冬に雪が降ります。
so	だから;それで	私は疲れたので休みます。
some	いくつかの;少しの	少し水が必要です。
somebody	誰か	誰かがドアにいます。
someone	誰か	誰かがメッセージを残しました。
something	何か	何か飲む物が必要です。
sometimes	時々	私は時々歩いて学校へ行きます。
son	息子	彼女の息子は学校にいます。
song	歌	この歌は新しいです。
soon	すぐに	またすぐ会いましょう。
sorry	すみません;申し訳ない	すみません。
sound	音	音が大きいです。
soup	スープ	スープは熱いです。
south	南	ホテルはここから南にあります。
space	空間;場所	椅子一つ分の場所があります。
speak	話す	ゆっくり話してください。
special	特別な	今日は特別な日です。
spell	つづる	あなたの名前をつづってください。
spelling	つづり	つづりを確認してください。
spend	使う;過ごす	私は食べ物にお金を使います。
sport	スポーツ	サッカーは人気のスポーツです。
spring	春;跳ぶ	春に花が育ちます。
stand	立つ	ドアの近くに立ってください。
star	星	明るい星が見えます。
start	始める;始まり	今授業を始めてください。
statement	発言;文	この発言は本当です。
station	駅	駅は近くにあります。
stay	滞在する;いる	今日は家にいてください。
still	まだ	私はまだおなかがすいています。
stop	止まる;止める	角で止まってください。
story	物語	物語を話してください。
street	通り	この通りは静かです。
strong	強い	彼は強いです。
student	学生	学生が本を読みます。
study	勉強する;研究	私は英語を勉強します。
style	スタイル	私はこのスタイルが好きです。
subject	科目;主題	英語は私の主な科目です。
success	成功	成功には練習が必要です。
sugar	砂糖	お茶に砂糖を入れてください。
summer	夏	ここでは夏が暑いです。
sun	太陽	太陽は明るいです。
Sunday	日曜日	私たちは日曜日に休みます。
supermarket	スーパー;スーパーマーケット	スーパーは開いています。
sure	確かな	私は確かです。
sweater	セーター	私のセーターは暖かいです。
swim	泳ぐ	私は毎週泳ぎます。
swimming	水泳	水泳は良い運動です。
table	テーブル	鍵はテーブルの上にあります。`;

function parseArgs() {
  const args = new Map();
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/u);
    if (match) args.set(match[1], match[2]);
  }
  return args;
}

function parseTsv(tsv) {
  const [headerLine, ...lines] = tsv.trim().split(/\r?\n/u);
  if (headerLine !== `source_headword\t${LANGUAGE}\texample_${LANGUAGE}`) {
    throw new Error(`Unexpected TSV header: ${headerLine}`);
  }
  const map = new Map();
  for (const [lineIndex, line] of lines.entries()) {
    const cells = line.split("\t");
    if (cells.length !== 3) {
      throw new Error(`Invalid TSV cell count at data line ${lineIndex + 2}: ${line}`);
    }
    const [sourceHeadword, display, example] = cells.map((cell) => cell.trim());
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Blank TSV value at data line ${lineIndex + 2}: ${line}`);
    }
    if (!JAPANESE_RE.test(display) || !JAPANESE_RE.test(example)) {
      throw new Error(`Japanese row must contain Japanese script for ${sourceHeadword}`);
    }
    if (WHITESPACE_RE.test(example)) {
      throw new Error(`Japanese example must not contain whitespace for ${sourceHeadword}: ${example}`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Japanese example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Japanese translation row for ${sourceHeadword}`);
    }
    map.set(sourceHeadword, { display, example });
  }
  return map;
}

async function readJsonl(filePath) {
  const raw = await readFile(filePath, "utf8");
  return raw
    .trim()
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function buildSupportRow(row, translation) {
  return {
    release_id: row.release_id,
    course_id: row.course_id,
    row_id: row.row_id,
    core_item_id: row.core_item_id,
    meaning_id: row.meaning_id,
    source_candidate_id: row.source_candidate_id,
    source_headword: row.source_headword,
    reviewed_display_headword: row.reviewed_display_headword,
    reviewed_part_of_speech: row.reviewed_part_of_speech,
    example_EN: row.example_EN,
    [LANGUAGE]: translation.display,
    [`example_${LANGUAGE}`]: translation.example,
    translation_status: "draft_native_style_needs_source_assisted_qa",
    example_translation_status: "draft_scene_preserving_needs_source_assisted_qa",
    target_language_transcription_status: "not_included_for_support_language",
    article_display_included: false,
    batch_id: BATCH_ID,
    batch_language: LANGUAGE,
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    generated_at: new Date().toISOString(),
  };
}

function updateContract(contract, outputPath, summaryPath, rows) {
  const batch = {
    batch_id: BATCH_ID,
    status: "draft_native_style_needs_source_assisted_qa_not_delivery_ready",
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    path: outputPath,
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

  const existing = Array.isArray(contract.latest_support_translation_batches)
    ? contract.latest_support_translation_batches.filter((item) => item.batch_id !== BATCH_ID)
    : [];
  contract.latest_support_translation_batches = [...existing, batch];
  contract.status = "support_language_batches_in_progress_not_delivery_ready";
  contract.next_stage_options = [
    "Generate KO support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after KO.",
    "Run weak-language targeted review and source-backed support-language audits after all support languages are covered.",
    "Export US/UK workbooks only after all support-language gates pass.",
  ];
  contract.updated_at = new Date().toISOString();
  return contract;
}

async function main() {
  const args = parseArgs();
  const contractPath = args.get("contract");
  if (!contractPath) {
    throw new Error("Usage: node scripts/oxford/build-oxford-part003-support-translation-batch-ja.mjs --contract=<contract.json>");
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const outputPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_ja_v1.jsonl";
  const summaryPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_ja_v1_summary.md";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== "oxford_3000_core_a1_part_003_300_v1") {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(JA_TRANSLATIONS_TSV);

  if (rows.length !== 300) {
    throw new Error(`Expected 300 Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Japanese translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Japanese translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Japanese
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Target-language transcriptions: not included
- Postgres import: false
- Google Sheet delivery: false

This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.
`;
  await writeFile(summaryPath, summary);

  const updatedContract = updateContract(contract, outputPath, summaryPath, outputRows);
  await writeFile(contractPath, `${JSON.stringify(updatedContract, null, 2)}\n`);

  console.log(JSON.stringify({
    release_id: releaseId,
    batch_id: BATCH_ID,
    languages: [LANGUAGE],
    rows: outputRows.length,
    display_cells: outputRows.length,
    example_cells: outputRows.length,
    path: outputPath,
    contract_updated: contractPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
