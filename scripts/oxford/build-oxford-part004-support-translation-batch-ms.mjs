#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "MS";
const BATCH_ID = "ms_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-ms.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-z]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const MS_TRANSLATIONS_TSV = `source_headword	MS	example_MS
take	ambil; membawa	Ambil tiket ini.
talk	bercakap; berbual	Kami berbual selepas kelas.
tall	tinggi	Guru saya tinggi.
taxi	teksi	Teksi itu di luar.
tea	teh	Teh ini panas.
teach	mengajar	Saya mengajar bahasa Inggeris.
teacher	guru; cikgu	Guru itu tersenyum.
team	pasukan	Pasukan kami menang hari ini.
teenager	remaja	Remaja itu membaca buku.
telephone	telefon; menelefon	Telefon itu di atas meja.
television	televisyen	Televisyen ini baharu.
tell	memberitahu; berkata	Beritahu saya nama anda.
ten	sepuluh	Saya ada sepuluh buku.
tennis	tenis	Kami bermain tenis hari ini.
terrible	teruk; mengerikan	Cuaca sangat teruk.
test	ujian; menguji	Ujian bermula sekarang.
text	mesej teks; menghantar mesej	Hantar mesej pendek.
than	daripada	Sepuluh lebih banyak daripada dua.
thank	berterima kasih	Ucap terima kasih kepada guru anda.
thanks	terima kasih	Terima kasih atas bantuan anda.
that	itu	Buku itu milik saya.
the	kata sandang tentu bahasa Inggeris	Perkataan ini ialah kata sandang Inggeris.
theatre	teater	Teater itu dekat stesen.
their	milik mereka	Rumah mereka besar.
them	mereka	Saya kenal mereka.
then	kemudian; selepas itu	Makan, kemudian belajar.
there	di sana; ada	Ada kerusi di sana.
they	mereka	Mereka berada di sekolah.
thing	benda; perkara	Benda ini berguna.
think	berfikir; fikir	Saya fikir tentang rumah.
third	ketiga; satu pertiga	Ini pelajaran ketiga.
thirsty	dahaga	Saya dahaga.
thirteen	tiga belas	Dia berumur tiga belas tahun.
thirty	tiga puluh	Kakak saya berumur tiga puluh tahun.
this	ini	Tiket ini baharu.
thousand	seribu	Seribu orang datang.
three	tiga	Saya melihat tiga burung.
through	melalui	Kami berjalan melalui taman.
Thursday	Khamis	Jumpa pada hari Khamis.
ticket	tiket	Saya perlukan tiket.
time	masa; waktu	Sekarang pukul berapa?
tired	letih	Saya letih.
title	tajuk	Baca tajuk itu.
to	ke; kepada; untuk	Saya pergi ke kelas.
today	hari ini	Hari ini cerah.
together	bersama-sama	Kami makan bersama-sama.
toilet	tandas	Tandas itu bersih.
tomato	tomato	Tomato ini merah.
tomorrow	esok	Jumpa esok.
tonight	malam ini	Kami belajar malam ini.
too	juga; terlalu	Saya juga mahu teh.
tooth	gigi	Gigi saya sakit.
topic	topik; tajuk	Pilih satu topik.
tourist	pelancong	Pelancong itu mengambil gambar.
town	pekan; bandar kecil	Pekan ini tenang.
traffic	lalu lintas	Lalu lintas perlahan.
train	kereta api; melatih	Kereta api lewat.
travel	melancong; perjalanan	Kami melancong dengan kereta api.
tree	pokok	Pokok itu tinggi.
trip	perjalanan; lawatan	Perjalanan bermula esok.
trousers	seluar panjang	Seluar panjang saya hitam.
true	benar; betul	Cerita itu benar.
try	mencuba	Cuba teh ini.
T-shirt	kemeja-T	Saya memakai kemeja-T.
Tuesday	Selasa	Jumpa pada hari Selasa.
turn	belok; giliran	Belok kiri di sini.
TV	TV; televisyen	Bunyi TV itu kuat.
twelve	dua belas	Saya ada dua belas pen.
twenty	dua puluh	Ada dua puluh pelajar di sini.
twice	dua kali	Saya berenang dua kali seminggu.
two	dua	Dua orang sedang menunggu.
type	jenis; taip	Jenis muzik apa ini?
umbrella	payung	Bawa payung.
uncle	pak cik; bapa saudara	Pak cik saya baik.
under	di bawah	Beg itu di bawah meja.
understand	faham	Saya faham soalan itu.
university	universiti	Universiti itu dekat.
until	hingga; sampai	Tunggu hingga pukul lima.
up	naik; ke atas	Berdiri sekarang.
upstairs	di tingkat atas	Bilik saya di tingkat atas.
us	kami; kita	Tolong bantu kami.
use	menggunakan; guna	Gunakan pen ini.
useful	berguna	Peta ini berguna.
usually	biasanya	Saya biasanya berjalan pulang.
vacation	percutian; cuti	Percutian kami bermula esok.
vegetable	sayur	Lobak merah ialah sayur.
very	sangat	Bilik itu sangat tenang.
video	video	Tonton video ini.
village	kampung	Kampung itu kecil.
visit	melawat	Kami melawat mak cik.
visitor	pelawat	Pelawat menunggu di luar.
wait	menunggu	Tunggu di sini.
waiter	pelayan lelaki	Pelayan membawa teh.
wake	bangun; membangunkan	Saya bangun awal.
walk	berjalan; jalan kaki	Kami berjalan ke sekolah.
wall	dinding	Dinding itu putih.
want	mahu; ingin	Saya mahu air.
warm	hangat; memanaskan	Bilik itu hangat.
wash	mencuci; membasuh	Basuh tangan anda.
watch	menonton; jam tangan	Saya menonton TV.
water	air; menyiram	Minum sedikit air.
way	jalan; cara	Jalan ini pendek.
we	kami; kita	Kami belajar bahasa Inggeris.
wear	memakai	Saya memakai jaket.
weather	cuaca	Cuaca sejuk.
website	laman web	Laman web ini berguna.
Wednesday	Rabu	Kelas bermula pada hari Rabu.
week	minggu	Minggu ini sibuk.
weekend	hujung minggu	Hujung minggu bermula esok.
welcome	selamat datang; mengalu-alukan	Selamat datang ke kelas kami.
well	baik; dengan baik	Dia menyanyi dengan baik.
west	barat	Matahari terbenam di barat.
what	apa	Apakah itu?
when	bila	Bila anda belajar?
where	di mana	Di mana stesen?
which	yang mana; mana	Beg mana milik anda?
white	putih	Dinding itu putih.
who	siapa	Siapa itu?
why	mengapa	Mengapa anda lewat?
wife	isteri	Isterinya seorang guru.
will modal	akan	Saya akan membantu anda.
win	menang	Pasukan kami boleh menang.
window	tingkap	Buka tingkap.
wine	wain	Wain ini merah.
winter	musim sejuk	Musim sejuk di sini sejuk.
with	dengan	Datang dengan saya.
without	tanpa	Teh tanpa gula juga baik.
woman	wanita; perempuan	Wanita itu membaca buku.
wonderful	indah; hebat	Pemandangan itu indah.
word	perkataan; kata	Tulis satu perkataan.
work	bekerja; kerja	Saya bekerja di rumah.
worker	pekerja	Pekerja itu sibuk.
world	dunia	Dunia ini besar.
would modal	akan; ingin	Saya ingin minum teh.
write	menulis	Tulis nama anda.
writer	penulis	Penulis itu tinggal di sini.
writing	penulisan; tulisan	Tulisan dia jelas.
wrong	salah	Jawapan ini salah.
yeah	ya; baik	Ya, saya boleh datang.
year	tahun	Tahun ini baik.
yellow	kuning	Pisang itu kuning.
yes	ya	Ya, saya faham.
yesterday	semalam	Saya menelefon semalam.
you	anda; kamu	Anda kawan saya.
young	muda	Kanak-kanak itu muda.
your	milik anda	Beg anda di sini.
yourself	diri anda	Ambil teh sendiri.`;

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
  const lines = MS_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tMS\texample_MS") {
    throw new Error("Unexpected MS translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad MS translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad MS translation row ${index + 2}: empty field`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad MS translation row ${index + 2}: display/example must contain Latin text`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad MS translation row ${index + 2}: display/example contains non-Latin script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad MS example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate MS translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing MS translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`MS translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_ms_v1",
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
    MS: translation.display,
    example_MS: translation.example,
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
    "Generate the next support-language batch in language order: ID.",
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
    "- Article display: not applicable for Malay",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: MS Latin-script display/example cells and no non-Latin script",
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
