#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "ID";
const BATCH_ID = "id_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-id.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-z]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const ID_TRANSLATIONS_TSV = `source_headword	ID	example_ID
take	mengambil; membawa	Ambil tiket ini.
talk	berbicara; percakapan	Kami berbicara setelah kelas.
tall	tinggi	Guru saya tinggi.
taxi	taksi	Taksi itu di luar.
tea	teh	Teh ini panas.
teach	mengajar	Saya mengajar bahasa Inggris.
teacher	guru	Guru itu tersenyum.
team	tim; regu	Tim kami menang hari ini.
teenager	remaja	Remaja itu membaca buku.
telephone	telepon; menelepon	Telepon itu di atas meja.
television	televisi	Televisi ini baru.
tell	memberi tahu; mengatakan	Beri tahu saya nama Anda.
ten	sepuluh	Saya punya sepuluh buku.
tennis	tenis	Kami bermain tenis hari ini.
terrible	buruk; mengerikan	Cuacanya sangat buruk.
test	tes; ujian	Tes dimulai sekarang.
text	pesan teks; mengirim pesan	Kirim pesan singkat.
than	daripada	Sepuluh lebih banyak daripada dua.
thank	berterima kasih	Berterima kasihlah kepada guru Anda.
thanks	terima kasih	Terima kasih atas bantuan Anda.
that	itu	Buku itu milik saya.
the	kata sandang tentu bahasa Inggris	Kata ini adalah artikel Inggris.
theatre	teater	Teater itu dekat stasiun.
their	milik mereka	Rumah mereka besar.
them	mereka	Saya mengenal mereka.
then	lalu; kemudian	Makan, lalu belajar.
there	di sana; ada	Ada kursi di sana.
they	mereka	Mereka berada di sekolah.
thing	benda; hal	Benda ini berguna.
think	berpikir; pikir	Saya berpikir tentang rumah.
third	ketiga; sepertiga	Ini pelajaran ketiga.
thirsty	haus	Saya haus.
thirteen	tiga belas	Dia berumur tiga belas tahun.
thirty	tiga puluh	Kakak saya berumur tiga puluh tahun.
this	ini	Tiket ini baru.
thousand	seribu	Seribu orang datang.
three	tiga	Saya melihat tiga burung.
through	melalui	Kami berjalan melalui taman.
Thursday	Kamis	Jumpa pada hari Kamis.
ticket	tiket	Saya perlu tiket.
time	waktu; pukul	Sekarang pukul berapa?
tired	lelah	Saya lelah.
title	judul	Baca judul itu.
to	ke; kepada; untuk	Saya pergi ke kelas.
today	hari ini	Hari ini cerah.
together	bersama-sama	Kami makan bersama-sama.
toilet	toilet; kamar kecil	Toilet itu bersih.
tomato	tomat	Tomat ini merah.
tomorrow	besok	Jumpa besok.
tonight	malam ini	Kami belajar malam ini.
too	juga; terlalu	Saya juga ingin teh.
tooth	gigi	Gigi saya sakit.
topic	topik; pokok bahasan	Pilih satu topik.
tourist	turis; wisatawan	Turis itu mengambil foto.
town	kota kecil	Kota kecil ini tenang.
traffic	lalu lintas	Lalu lintas lambat.
train	kereta; melatih	Kereta itu terlambat.
travel	bepergian; perjalanan	Kami bepergian dengan kereta.
tree	pohon	Pohon itu tinggi.
trip	perjalanan	Perjalanan dimulai besok.
trousers	celana panjang	Celana panjang saya hitam.
true	benar; nyata	Cerita itu benar.
try	mencoba	Coba teh ini.
T-shirt	kaus	Saya memakai kaus.
Tuesday	Selasa	Jumpa pada hari Selasa.
turn	berbelok; giliran	Belok kiri di sini.
TV	TV; televisi	Suara TV itu keras.
twelve	dua belas	Saya punya dua belas pena.
twenty	dua puluh	Ada dua puluh siswa di sini.
twice	dua kali	Saya berenang dua kali seminggu.
two	dua	Dua orang sedang menunggu.
type	jenis; tipe	Jenis musik apa ini?
umbrella	payung	Bawa payung.
uncle	paman	Paman saya baik hati.
under	di bawah	Tas itu di bawah meja.
understand	mengerti; memahami	Saya mengerti pertanyaan itu.
university	universitas	Universitas itu dekat.
until	sampai; hingga	Tunggu sampai pukul lima.
up	naik; ke atas	Berdirilah sekarang.
upstairs	di lantai atas	Kamar saya di lantai atas.
us	kami; kita	Tolong bantu kami.
use	menggunakan; memakai	Gunakan pena ini.
useful	berguna	Peta ini berguna.
usually	biasanya	Saya biasanya berjalan pulang.
vacation	liburan	Liburan kami dimulai besok.
vegetable	sayur	Wortel adalah sayur.
very	sangat	Ruangan itu sangat tenang.
video	video	Tonton video ini.
village	desa	Desa itu kecil.
visit	mengunjungi	Kami mengunjungi bibi.
visitor	pengunjung	Pengunjung menunggu di luar.
wait	menunggu	Tunggu di sini.
waiter	pelayan pria	Pelayan membawa teh.
wake	bangun; membangunkan	Saya bangun pagi.
walk	berjalan; jalan kaki	Kami berjalan ke sekolah.
wall	dinding	Dinding itu putih.
want	ingin; mau	Saya ingin air.
warm	hangat; menghangatkan	Ruangan itu hangat.
wash	mencuci	Cuci tangan Anda.
watch	menonton; jam tangan	Saya menonton TV.
water	air; menyiram	Minum sedikit air.
way	jalan; cara	Jalan ini pendek.
we	kami; kita	Kami belajar bahasa Inggris.
wear	memakai	Saya memakai jaket.
weather	cuaca	Cuaca dingin.
website	situs web	Situs web ini berguna.
Wednesday	Rabu	Kelas dimulai pada hari Rabu.
week	minggu	Minggu ini sibuk.
weekend	akhir pekan	Akhir pekan dimulai besok.
welcome	selamat datang	Selamat datang di kelas kami.
well	baik; dengan baik	Dia bernyanyi dengan baik.
west	barat	Matahari terbenam di barat.
what	apa	Apa itu?
when	kapan	Kapan Anda belajar?
where	di mana	Di mana stasiun?
which	yang mana; mana	Tas mana milik Anda?
white	putih	Dinding itu putih.
who	siapa	Siapa itu?
why	mengapa	Mengapa Anda terlambat?
wife	istri	Istrinya adalah guru.
will modal	akan	Saya akan membantu Anda.
win	menang	Tim kami bisa menang.
window	jendela	Buka jendela.
wine	anggur; wine	Wine ini merah.
winter	musim dingin	Musim dingin di sini dingin.
with	dengan	Datanglah dengan saya.
without	tanpa	Teh tanpa gula juga baik.
woman	wanita; perempuan	Wanita itu membaca buku.
wonderful	indah; luar biasa	Pemandangan itu indah.
word	kata	Tulis satu kata.
work	bekerja; pekerjaan	Saya bekerja di rumah.
worker	pekerja	Pekerja itu sibuk.
world	dunia	Dunia ini besar.
would modal	akan; ingin	Saya ingin minum teh.
write	menulis	Tulis nama Anda.
writer	penulis	Penulis itu tinggal di sini.
writing	tulisan; kegiatan menulis	Tulisannya jelas.
wrong	salah	Jawaban ini salah.
yeah	ya; iya	Ya, saya bisa datang.
year	tahun	Tahun ini baik.
yellow	kuning	Pisang itu kuning.
yes	ya	Ya, saya mengerti.
yesterday	kemarin	Saya menelepon kemarin.
you	Anda; kamu	Anda teman saya.
young	muda; anak-anak	Anak itu masih muda.
your	milik Anda	Tas Anda ada di sini.
yourself	diri Anda	Ambil teh sendiri.`;

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
  const lines = ID_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tID\texample_ID") {
    throw new Error("Unexpected ID translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad ID translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad ID translation row ${index + 2}: empty field`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad ID translation row ${index + 2}: display/example must contain Latin text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad ID translation row ${index + 2}: display/example contains non-Latin script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad ID example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate ID translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing ID translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`ID translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_id_v1",
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
    ID: translation.display,
    example_ID: translation.example,
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
    "Generate the next support-language batch in language order: PL.",
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
    "- Article display: not applicable for Indonesian",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: ID Latin-script display/example cells and no non-Latin script",
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
