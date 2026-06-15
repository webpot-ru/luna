#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "ID";
const BATCH_ID = "id_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-id.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-z]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const ID_TRANSLATIONS_TSV = `source_headword	ID	example_ID
clothes	pakaian	Pakaian saya bersih.
club	klub	Dia pergi ke klub musik.
coat	mantel	Mantel saya hangat.
coffee	kopi	Saya minum kopi pada pagi hari.
cold	dingin	Air itu dingin.
college	perguruan tinggi; kampus	Kakak saya belajar di perguruan tinggi.
colour	warna	Warna favorit saya biru.
come	datang	Silakan datang ke sini.
common	umum	Nama ini umum.
company	perusahaan	Ibu saya bekerja di perusahaan.
compare	membandingkan	Bandingkan dua gambar ini.
complete	lengkap; menyelesaikan	Formulir itu sudah lengkap.
computer	komputer	Komputer ini baru.
concert	konser	Kami pergi ke konser malam ini.
conversation	percakapan	Kami melakukan percakapan singkat.
cook	memasak; juru masak	Saya memasak makan malam di rumah.
cooking	memasak	Saya suka memasak dengan ayah.
cool	sejuk; keren	Ruangan itu sejuk.
correct	benar; memperbaiki	Jawaban Anda benar.
cost	biaya; berharga	Berapa harganya?
could modal	bisa; dapat	Saya bisa membantu Anda.
country	negara	Kanada adalah negara besar.
course	kursus	Saya mengikuti kursus bahasa Inggris.
cousin	sepupu	Sepupu saya tinggal dekat.
cow	sapi	Sapi itu makan rumput.
cream	krim	Saya menaruh krim di kopi.
create	menciptakan	Mereka menciptakan permainan baru.
culture	budaya	Kami belajar budaya lokal.
cup	cangkir	Cangkir ini kosong.
customer	pelanggan	Pelanggan itu bertanya.
cut	memotong	Potong apel itu menjadi dua.
dad	ayah	Ayah sedang bekerja.
dance	menari; tarian	Kami menari setelah makan malam.
dancer	penari	Penari itu bergerak cepat.
dancing	menari	Menari itu menyenangkan.
dangerous	berbahaya	Jalan ini berbahaya.
dark	gelap	Ruangan itu gelap.
date	tanggal	Tanggal berapa hari ini?
daughter	anak perempuan	Anak perempuannya berumur enam tahun.
day	hari	Semoga harimu baik.
dear	yang terhormat	Teman yang terhormat, terima kasih.
December	Desember	Ulang tahun saya pada bulan Desember.
decide	memutuskan	Tolong putuskan sekarang.
delicious	enak	Sup ini enak.
describe	menggambarkan; menjelaskan	Jelaskan kamar Anda.
description	deskripsi	Baca deskripsi singkat itu.
design	desain; merancang	Saya membuat desain sederhana untuk kartu.
desk	meja tulis	Buku itu di atas meja tulis saya.
detail	detail	Satu detail hilang.
dialogue	dialog	Baca dialog ini sekarang.
dictionary	kamus	Gunakan kamus di kelas.
die	mati	Bunga mati tanpa air.
diet	pola makan	Pola makan saya berisi buah.
difference	perbedaan	Ada satu perbedaan.
different	berbeda	Nama kami berbeda.
difficult	sulit	Pertanyaan ini sulit.
dinner	makan malam	Makan malam sudah siap.
dirty	kotor	Sepatu saya kotor.
discuss	mendiskusikan	Kami mendiskusikan rencana itu.
dish	piring; hidangan	Piring ini panas.
do1	melakukan	Apa yang Anda lakukan?
doctor	dokter	Dokter itu sibuk.
dog	anjing	Anjing itu berlari di luar.
dollar	dolar	Ini berharga satu dolar.
door	pintu	Tolong tutup pintu.
down	turun; bawah	Duduklah di sini.
downstairs	lantai bawah	Dapur ada di lantai bawah.
draw	menggambar	Gambarlah rumah kecil.
dress	gaun; berpakaian	Dia memakai gaun merah.
drink	minuman; minum	Saya minum air.
drive	mengemudi	Saya mengemudi ke tempat kerja.
driver	pengemudi	Pengemudi itu berhenti di sini.
during	selama	Saya tidur selama penerbangan.
DVD	DVD	DVD ini lama.
each	setiap	Setiap anak punya buku.
ear	telinga	Telinga saya sakit.
early	awal	Saya bangun awal.
east	timur	Matahari terbit di timur.
easy	mudah	Tes ini mudah.
eat	makan	Kami makan siang bersama.
egg	telur	Saya makan satu telur.
eight	delapan	Saya punya delapan kartu.
eighteen	delapan belas	Dia berumur delapan belas tahun.
eighty	delapan puluh	Kakek saya berumur delapan puluh tahun.
elephant	gajah	Gajah itu besar.
eleven	sebelas	Kelas dimulai pukul sebelas.
else	lain	Apa lagi yang Anda butuhkan?
email	email	Kirim email kepada saya.
end	akhir; berakhir	Ini adalah akhir.
enjoy	menikmati	Saya menikmati lagu ini.
enough	cukup	Kami punya cukup waktu.
euro	euro	Ini berharga satu euro.
even	bahkan	Bahkan adik saya tahu.
evening	malam	Sampai jumpa malam ini.
event	acara	Acara itu dimulai hari ini.
ever	pernah	Pernahkah Anda memasak?
every	setiap	Saya belajar setiap hari.
everybody	semua orang	Semua orang ada di sini.
everyone	semua orang	Semua orang suka musik.
everything	semuanya	Semuanya sudah siap.
exam	ujian	Ujian akan segera dimulai.
example	contoh	Ini contoh yang baik.
excited	bersemangat	Saya bersemangat hari ini.
exciting	menarik	Permainan ini menarik.
exercise	olahraga; latihan	Saya berolahraga sebelum sarapan.
expensive	mahal	Mantel ini mahal.
explain	menjelaskan	Tolong jelaskan kata ini.
extra	tambahan	Saya butuh waktu tambahan.
eye	mata	Mata saya merah.
face	wajah	Cuci wajah Anda.
fact	fakta	Fakta ini penting.
fall	jatuh; musim gugur	Daun jatuh pada musim gugur.
false	salah; palsu	Jawaban ini salah.
family	keluarga	Keluarga saya kecil.
famous	terkenal	Dia penyanyi terkenal.
fantastic	fantastis	Konser itu fantastis.
far	jauh	Sekolah itu jauh.
farm	pertanian	Mereka tinggal di pertanian.
farmer	petani	Petani menanam makanan.
fast	cepat	Kereta ini cepat.
fat	gemuk	Kucing itu gemuk.
father	ayah; bapak	Ayah saya tinggi.
favourite	favorit	Ini lagu favorit saya.
February	Februari	Di sini dingin pada bulan Februari.
feel	merasa	Saya merasa senang.
feeling	perasaan	Saya memahami perasaan itu.
festival	festival	Festival dimulai besok.
few	beberapa; sedikit	Ada sedikit siswa di sini.
fifteen	lima belas	Saya berumur lima belas tahun.
fifth	kelima	Ini pelajaran kelima.
fifty	lima puluh	Ibu saya berumur lima puluh tahun.
fill	mengisi	Isi cangkir dengan air.
film	film	Kami menonton film.
final	akhir	Ini pertanyaan akhir.
find	menemukan; mencari	Saya menemukan kunci itu.
fine	baik	Saya baik sekarang.
finish	menyelesaikan	Selesaikan pekerjaan rumah Anda.
fire	api	Api itu panas.
first	pertama	Dia orang pertama dalam barisan.
fish	ikan	Saya makan ikan untuk makan malam.
five	lima	Saya punya lima buku.
flat	apartemen	Apartemen saya kecil.
flight	penerbangan	Penerbangan itu terlambat.
floor	lantai; tingkat	Tas itu di lantai.
flower	bunga	Bunga ini kuning.
fly	terbang	Burung terbang di langit.
follow	mengikuti	Ikuti saya.
food	makanan	Makanan sudah siap.
foot	kaki	Kaki saya sakit.
football	sepak bola	Kami bermain sepak bola hari ini.
for	untuk	Hadiah ini untuk Anda.
forget	lupa	Jangan lupa kunci.
form	formulir	Isi formulir itu.
forty	empat puluh	Ayah saya berumur empat puluh tahun.
four	empat	Saya melihat empat burung.
fourteen	empat belas	Dia berumur empat belas tahun.
fourth	keempat	Ini lantai keempat.
free	gratis; bebas	Tiket itu gratis.
Friday	Jumat	Sampai jumpa hari Jumat.
friend	teman	Teman saya ada di sini.
friendly	ramah	Guru itu ramah.
from	dari	Saya dari sini.
front	depan	Itu ada di depan.
fruit	buah	Saya makan buah setiap hari.
full	penuh; kenyang	Botol itu penuh.
fun	kesenangan; menyenangkan	Permainan ini menyenangkan.
funny	lucu	Film itu lucu.
future	masa depan	Pikirkan masa depan Anda.
game	permainan	Permainan dimulai sekarang.
garden	taman	Taman itu indah.
geography	geografi	Saya belajar geografi di sekolah.
get	mendapatkan; tiba	Saya tiba di rumah pukul enam.
girl	anak perempuan	Anak perempuan itu tersenyum.
girlfriend	pacar perempuan	Pacar perempuannya baik hati.
give	memberi	Beri saya buku itu.
glass	gelas; kaca	Saya minum air dari gelas.
go	pergi	Kami pulang sekarang.
good	baik	Kopi ini baik.
goodbye	selamat tinggal	Selamat tinggal, sampai besok.
grandfather	kakek	Kakek saya sudah tua.
grandmother	nenek	Nenek saya memasak sup.
grandparent	kakek atau nenek	Kakek atau nenek saya tinggal bersama kami.
great	hebat; besar	Itu ide yang hebat.
green	hijau	Pintu itu hijau.
grey	abu-abu	Langit abu-abu.
group	kelompok	Bekerjalah dalam kelompok kecil.
grow	tumbuh; menanam	Tanaman tumbuh di taman.
guess	menebak	Tebak jawabannya.
guitar	gitar	Dia bermain gitar.
gym	gim	Saya pergi ke gim.
hair	rambut	Rambutnya panjang.
half	setengah	Potong kue itu setengah.
hand	tangan	Angkat tangan Anda.
happen	terjadi	Apa yang terjadi selanjutnya?
happy	bahagia	Saya bahagia hari ini.
hard	keras; sulit	Kursi ini keras.
hat	topi	Topi saya hitam.
hate	benci	Saya benci teh dingin.
have	mempunyai; punya	Saya punya mobil.
have to modal	harus	Saya harus belajar.
he	dia	Dia kakak laki-laki saya.
head	kepala	Kepala saya sakit.
health	kesehatan	Makanan baik membantu kesehatan.
healthy	sehat	Hidangan ini sehat.
hear	mendengar	Saya mendengar musik.
hello	halo	Halo, senang bertemu Anda.
help	membantu; bantuan	Tolong bantu saya.
her	dia; miliknya	Ini tas miliknya.
here	di sini	Datang ke sini sekarang.
hey	hei	Hei, tunggu saya.
hi	hai	Hai, apa kabar?
high	tinggi	Tembok itu tinggi.
him	dia	Saya mengenal dia.
his	miliknya	Mantel miliknya berwarna biru.
history	sejarah	Saya belajar sejarah.
hobby	hobi	Membaca adalah hobi saya.
holiday	liburan	Kami pergi liburan pada bulan Juli.
home	rumah	Saya di rumah.
homework	pekerjaan rumah	Kerjakan pekerjaan rumah malam ini.
hope	berharap	Saya berharap Anda datang.
horse	kuda	Kuda itu berlari cepat.
hospital	rumah sakit	Rumah sakit itu dekat.
hot	panas	Sup itu panas.
hotel	hotel	Hotel itu bersih.
hour	jam	Tunggu satu jam.
house	rumah	Rumah ini tua.
how	bagaimana	Apa kabar?
however	namun	Namun, saya bisa tinggal di sini.
hundred	seratus	Seratus orang datang.
hungry	lapar	Saya lapar.
husband	suami	Suaminya dokter.
I	saya	Saya suka teh.
ice	es	Es itu dingin.
ice cream	es krim	Saya mau es krim.
idea	ide	Ini ide yang baik.
if	jika	Telepon saya jika Anda butuh bantuan.
imagine	membayangkan	Bayangkan rumah kecil.
important	penting	Kelas ini penting.
improve	meningkatkan	Saya ingin meningkatkan diri.
in	di dalam	Kunci ada di dalam tas saya.
include	menyertakan	Sertakan nama Anda.
information	informasi	Saya butuh informasi tambahan.
interest	minat	Dia berminat pada seni.
interested	tertarik	Saya tertarik pada musik.
interesting	menarik	Buku ini menarik.
internet	internet	Internet lambat.
interview	wawancara	Saya punya wawancara hari ini.
into	ke dalam	Masukkan buku ke dalam tas.
introduce	memperkenalkan	Perkenalkan teman Anda.
island	pulau	Pulau ini kecil.
it	itu	Cuaca dingin.
its	miliknya	Anjing itu suka tempat tidurnya.
jacket	jaket	Jaket saya baru.
January	Januari	Januari adalah bulan pertama.
jeans	celana jins	Celana jins saya biru.
job	pekerjaan	Saya butuh pekerjaan baru.
join	bergabung	Bergabunglah dengan kelas kami hari ini.
journey	perjalanan	Perjalanan itu panjang.
juice	jus	Saya minum jus jeruk.
July	Juli	Kami bepergian pada bulan Juli.
June	Juni	Sekolah berakhir pada bulan Juni.
just	hanya; baru	Saya hanya butuh air.
keep	menyimpan	Simpan kunci ini.
key	kunci	Saya kehilangan kunci.
kilometre	kilometer	Berjalanlah satu kilometer.
kind (type)	jenis	Jenis musik apa yang Anda suka?
kitchen	dapur	Dapur itu bersih.
know	tahu	Saya tahu jawabannya.
land	tanah; daratan	Pesawat berada di daratan.
language	bahasa	Bahasa Inggris adalah bahasa.
large	besar	Ruangan ini besar.
last1 (final)	terakhir	Ini halaman terakhir.
late	terlambat	Bus itu terlambat.
later	nanti	Sampai jumpa nanti.
laugh	tertawa	Kami tertawa bersama.
learn	belajar	Saya belajar bahasa Inggris.
leave	meninggalkan	Saya meninggalkan rumah sekarang.
left	kiri	Belok kiri di sini.
leg	kaki	Kaki saya sakit.
lesson	pelajaran	Pelajaran dimulai sekarang.
let	membiarkan; mengizinkan	Biarkan saya membantu Anda.
letter	surat; huruf	Saya menulis surat.
library	perpustakaan	Perpustakaan buka pukul sembilan.
lie1	berbaring	Berbaringlah di tempat tidur.
life	kehidupan	Kehidupan di kota sibuk.
like (similar)	seperti; mirip	Ini seperti permainan.
like (find sb/sth pleasant)	suka	Saya suka lagu ini.
line	barisan; garis	Berdirilah dalam barisan.
lion	singa	Singa itu sedang tidur.
list	daftar	Buat daftar belanja.
listen	mendengarkan	Dengarkan guru.
little	kecil; sedikit	Saya punya sedikit uang.
live1	tinggal	Saya tinggal dekat sekolah.
local	lokal	Ini toko lokal.
long1	panjang	Jalan itu panjang.
look	melihat; tampak	Lihat gambar itu.
lose	kehilangan	Jangan hilangkan tiket.
lot	banyak	Saya punya banyak pekerjaan rumah.
love	cinta; sayang	Saya sayang keluarga saya.
lunch	makan siang	Makan siang sudah siap.`;

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
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad ID example punctuation for ${sourceHeadword}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad ID Latin native orthography shape for ${sourceHeadword}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad ID non-Latin script leak for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate ID translation key: ${sourceHeadword}`);
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
    reviewer: "codex_oxford_part002_support_translation_batch_id_v1",
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
    "- Script-aware validation: ID Latin native orthography, sentence punctuation and non-Latin script leak guard",
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
