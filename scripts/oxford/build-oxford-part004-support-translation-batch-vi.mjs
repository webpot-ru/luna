#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "VI";
const BATCH_ID = "vi_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-vi.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;
const VIETNAMESE_TEXT_RE = /[A-Za-zÀ-ỹĐđ]/u;

const VI_TRANSLATIONS_TSV = `source_headword	VI	example_VI
take	lấy; mang đi	Lấy vé này nhé.
talk	nói chuyện	Chúng tôi nói chuyện sau lớp.
tall	cao	Giáo viên của tôi cao.
taxi	xe taxi	Xe taxi ở bên ngoài.
tea	trà	Trà này nóng.
teach	dạy	Tôi dạy tiếng Anh.
teacher	giáo viên	Giáo viên mỉm cười.
team	đội; nhóm	Đội của chúng tôi thắng hôm nay.
teenager	thanh thiếu niên	Thanh thiếu niên đó đọc sách.
telephone	điện thoại; gọi điện	Điện thoại ở trên bàn.
television	ti vi; truyền hình	Cái ti vi này mới.
tell	nói; kể	Hãy nói tên của bạn.
ten	mười	Tôi có mười quyển sách.
tennis	quần vợt	Hôm nay chúng tôi chơi quần vợt.
terrible	tệ; khủng khiếp	Thời tiết thật tệ.
test	bài kiểm tra; kiểm tra	Bài kiểm tra bắt đầu bây giờ.
text	tin nhắn; nhắn tin	Hãy gửi một tin nhắn ngắn.
than	hơn	Mười nhiều hơn hai.
thank	cảm ơn	Hãy cảm ơn giáo viên.
thanks	cảm ơn	Cảm ơn vì đã giúp.
that	cái đó; kia	Quyển sách đó là của tôi.
the	mạo từ xác định tiếng Anh	Mạo từ này dùng trong tiếng Anh.
theatre	nhà hát	Nhà hát ở gần ga.
their	của họ	Nhà của họ lớn.
them	họ; họ đó	Tôi biết họ.
then	sau đó; lúc đó	Ăn rồi sau đó học.
there	ở đó; đó	Có một cái ghế ở đó.
they	họ	Họ ở trường.
thing	đồ vật; việc	Đồ vật này hữu ích.
think	nghĩ	Tôi nghĩ về nhà.
third	thứ ba; một phần ba	Đây là bài học thứ ba.
thirsty	khát	Tôi khát nước.
thirteen	mười ba	Cô ấy mười ba tuổi.
thirty	ba mươi	Chị tôi ba mươi tuổi.
this	cái này; này	Vé này mới.
thousand	một nghìn	Một nghìn người đã đến.
three	ba	Tôi thấy ba con chim.
through	qua; xuyên qua	Chúng tôi đi qua công viên.
Thursday	thứ Năm	Hẹn gặp vào thứ Năm.
ticket	vé	Tôi cần một vé.
time	thời gian; giờ	Bây giờ là mấy giờ?
tired	mệt	Tôi mệt.
title	tiêu đề	Hãy đọc tiêu đề.
to	đến; cho; để	Tôi đi đến lớp.
today	hôm nay	Hôm nay trời nắng.
together	cùng nhau	Chúng tôi ăn cùng nhau.
toilet	nhà vệ sinh	Nhà vệ sinh sạch.
tomato	cà chua	Quả cà chua này đỏ.
tomorrow	ngày mai	Hẹn gặp ngày mai.
tonight	tối nay	Chúng tôi học tối nay.
too	cũng; quá	Tôi cũng muốn trà.
tooth	răng	Răng của tôi đau.
topic	chủ đề	Hãy chọn một chủ đề.
tourist	khách du lịch	Khách du lịch chụp ảnh.
town	thị trấn	Thị trấn này yên tĩnh.
traffic	giao thông	Giao thông chậm.
train	tàu hỏa; huấn luyện	Tàu hỏa bị muộn.
travel	du lịch; đi lại	Chúng tôi đi du lịch bằng tàu.
tree	cây	Cái cây đó cao.
trip	chuyến đi	Chuyến đi bắt đầu ngày mai.
trousers	quần dài	Quần dài của tôi màu đen.
true	đúng; thật	Câu chuyện đó là thật.
try	thử	Hãy thử trà này.
T-shirt	áo phông	Tôi mặc áo phông.
Tuesday	thứ Ba	Hẹn gặp vào thứ Ba.
turn	rẽ; lượt	Rẽ trái ở đây.
TV	ti vi	Ti vi quá to.
twelve	mười hai	Tôi có mười hai cây bút.
twenty	hai mươi	Có hai mươi học sinh ở đây.
twice	hai lần	Tôi bơi hai lần mỗi tuần.
two	hai	Hai người đang đợi.
type	loại; kiểu	Bạn thích loại nhạc nào?
umbrella	ô; dù	Hãy mang ô.
uncle	chú; bác trai	Chú tôi rất tử tế.
under	dưới	Cái túi ở dưới bàn.
understand	hiểu	Tôi hiểu câu hỏi.
university	trường đại học	Trường đại học ở gần đây.
until	cho đến	Hãy đợi đến năm giờ.
up	lên; dậy	Đứng dậy ngay bây giờ.
upstairs	trên lầu; tầng trên	Phòng tôi ở trên lầu.
us	chúng tôi; chúng ta	Làm ơn giúp chúng tôi.
use	dùng; sử dụng	Hãy dùng cây bút này.
useful	hữu ích	Bản đồ này hữu ích.
usually	thường; thường thường	Tôi thường đi bộ về nhà.
vacation	kỳ nghỉ	Kỳ nghỉ của chúng tôi bắt đầu ngày mai.
vegetable	rau; rau củ	Cà rốt là một loại rau.
very	rất	Phòng rất yên tĩnh.
video	video; đoạn phim	Hãy xem đoạn phim này.
village	làng	Ngôi làng đó nhỏ.
visit	thăm; tham quan	Chúng tôi thăm cô.
visitor	khách; người thăm	Khách đang đợi bên ngoài.
wait	đợi	Hãy đợi ở đây.
waiter	nam phục vụ	Người phục vụ mang trà đến.
wake	thức dậy; đánh thức	Tôi thức dậy sớm.
walk	đi bộ; cuộc đi dạo	Chúng tôi đi bộ đến trường.
wall	tường	Bức tường màu trắng.
want	muốn	Tôi muốn nước.
warm	ấm; làm ấm	Căn phòng ấm.
wash	rửa	Hãy rửa tay.
watch	xem; đồng hồ	Tôi xem ti vi.
water	nước; tưới nước	Hãy uống một ít nước.
way	đường; cách	Con đường này ngắn.
we	chúng tôi; chúng ta	Chúng tôi học tiếng Anh.
wear	mặc; đeo	Tôi mặc áo khoác.
weather	thời tiết	Thời tiết lạnh.
website	trang web	Trang web này hữu ích.
Wednesday	thứ Tư	Lớp học bắt đầu vào thứ Tư.
week	tuần	Tuần này bận.
weekend	cuối tuần	Cuối tuần bắt đầu ngày mai.
welcome	chào mừng; hoan nghênh	Chào mừng đến lớp của chúng tôi.
well	tốt; giỏi	Cô ấy hát hay.
west	phía tây	Mặt trời lặn ở phía tây.
what	cái gì	Đó là cái gì?
when	khi nào	Khi nào bạn học?
where	ở đâu	Nhà ga ở đâu?
which	cái nào; nào	Cái túi nào là của bạn?
white	trắng	Bức tường màu trắng.
who	ai	Đó là ai?
why	tại sao	Tại sao bạn đến muộn?
wife	vợ	Vợ của anh ấy là giáo viên.
will modal	sẽ	Tôi sẽ giúp bạn.
win	thắng	Đội của chúng tôi có thể thắng.
window	cửa sổ	Hãy mở cửa sổ.
wine	rượu vang	Rượu vang này màu đỏ.
winter	mùa đông	Mùa đông ở đây lạnh.
with	với; cùng với	Hãy đi với tôi.
without	không có	Trà không đường cũng được.
woman	phụ nữ; người phụ nữ	Người phụ nữ đọc sách.
wonderful	tuyệt vời	Phong cảnh thật tuyệt vời.
word	từ; lời	Hãy viết một từ.
work	làm việc; công việc	Tôi làm việc ở nhà.
worker	người lao động; công nhân	Người công nhân bận.
world	thế giới	Thế giới rất lớn.
would modal	sẽ; muốn	Tôi muốn uống trà.
write	viết	Hãy viết tên của bạn.
writer	nhà văn	Nhà văn sống ở đây.
writing	chữ viết; việc viết	Chữ viết của cô ấy rõ.
wrong	sai	Câu trả lời này sai.
yeah	ừ; vâng	Ừ, tôi có thể đến.
year	năm	Năm nay là năm tốt.
yellow	màu vàng	Chuối màu vàng.
yes	vâng; có	Vâng, tôi hiểu.
yesterday	hôm qua	Tôi đã gọi điện hôm qua.
you	bạn; các bạn	Bạn là bạn của tôi.
young	trẻ	Đứa trẻ còn nhỏ.
your	của bạn	Túi của bạn ở đây.
yourself	chính bạn	Bạn tự lấy trà nhé.`;

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
  const lines = VI_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tVI\texample_VI") {
    throw new Error("Unexpected VI translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad VI translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad VI translation row ${index + 2}: empty field`);
    }
    if (!VIETNAMESE_TEXT_RE.test(display) || !VIETNAMESE_TEXT_RE.test(example)) {
      throw new Error(`Bad VI translation row ${index + 2}: display/example must contain Vietnamese text`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad VI example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate VI translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing VI translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`VI translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_vi_v1",
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
    VI: translation.display,
    example_VI: translation.example,
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
    "Generate the next support-language batch in language order: TH.",
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
    "- Article display: not applicable for Vietnamese",
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
    },
    null,
    2
  )
);
