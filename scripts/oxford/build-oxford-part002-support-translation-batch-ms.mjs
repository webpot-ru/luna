#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "MS";
const BATCH_ID = "ms_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-ms.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-z]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const MS_TRANSLATIONS_TSV = `source_headword	MS	example_MS
clothes	pakaian	Pakaian saya bersih.
club	kelab	Dia pergi ke kelab muzik.
coat	kot	Kot saya hangat.
coffee	kopi	Saya minum kopi pada waktu pagi.
cold	sejuk	Air itu sejuk.
college	kolej; universiti	Kakak saya belajar di universiti.
colour	warna	Warna kegemaran saya ialah biru.
come	datang	Sila datang ke sini.
common	biasa	Nama ini biasa.
company	syarikat	Ibu saya bekerja di sebuah syarikat.
compare	membandingkan	Bandingkan dua gambar ini.
complete	lengkap; menyiapkan	Borang itu sudah lengkap.
computer	komputer	Komputer ini baharu.
concert	konsert	Kami pergi ke konsert malam ini.
conversation	perbualan	Kami mempunyai perbualan pendek.
cook	memasak; tukang masak	Saya memasak makan malam di rumah.
cooking	masakan; aktiviti memasak	Saya suka memasak dengan ayah.
cool	sejuk; bergaya	Bilik itu sejuk.
correct	betul; membetulkan	Jawapan anda betul.
cost	kos; berharga	Berapakah harga ini?
could modal	boleh	Saya boleh membantu anda.
country	negara	Kanada ialah negara besar.
course	kursus	Saya mengikuti kursus bahasa Inggeris.
cousin	sepupu	Sepupu saya tinggal berdekatan.
cow	lembu	Lembu itu makan rumput.
cream	krim	Saya letak krim dalam kopi.
create	mencipta	Mereka mencipta permainan baharu.
culture	budaya	Kami belajar budaya tempatan.
cup	cawan	Cawan ini kosong.
customer	pelanggan	Pelanggan itu bertanya soalan.
cut	memotong	Potong epal itu separuh.
dad	ayah	Ayah sedang bekerja.
dance	menari; tarian	Kami menari selepas makan malam.
dancer	penari	Penari itu bergerak pantas.
dancing	tarian	Menari itu menyeronokkan.
dangerous	berbahaya	Jalan ini berbahaya.
dark	gelap	Bilik itu gelap.
date	tarikh	Apakah tarikh hari ini?
daughter	anak perempuan	Anak perempuannya berumur enam tahun.
day	hari	Semoga hari anda baik.
dear	yang dikasihi	Sahabat yang dikasihi, terima kasih.
December	Disember	Hari lahir saya pada bulan Disember.
decide	memutuskan	Sila putuskan sekarang.
delicious	sedap	Sup ini sedap.
describe	menerangkan	Terangkan bilik anda.
description	penerangan	Baca penerangan pendek itu.
design	reka bentuk; mereka bentuk	Saya buat reka bentuk mudah untuk kad.
desk	meja tulis	Buku itu di atas meja tulis saya.
detail	butiran	Satu butiran hilang.
dialogue	dialog	Baca dialog ini sekarang.
dictionary	kamus	Gunakan kamus di kelas.
die	mati	Bunga mati tanpa air.
diet	pemakanan	Diet saya ada buah.
difference	perbezaan	Ada satu perbezaan.
different	berbeza	Nama kami berbeza.
difficult	sukar	Soalan ini sukar.
dinner	makan malam	Makan malam sudah siap.
dirty	kotor	Kasut saya kotor.
discuss	membincangkan	Kami membincangkan rancangan itu.
dish	pinggan; hidangan	Pinggan ini panas.
do1	melakukan	Apakah yang anda lakukan?
doctor	doktor	Doktor itu sibuk.
dog	anjing	Anjing itu berlari di luar.
dollar	dolar	Ini berharga satu dolar.
door	pintu	Sila tutup pintu.
down	turun; bawah	Duduk di sini.
downstairs	tingkat bawah	Dapur berada di tingkat bawah.
draw	melukis	Lukis sebuah rumah kecil.
dress	pakaian wanita; berpakaian	Dia memakai pakaian merah.
drink	minuman; minum	Saya minum air.
drive	memandu	Saya memandu ke tempat kerja.
driver	pemandu	Pemandu itu berhenti di sini.
during	semasa	Saya tidur semasa penerbangan.
DVD	DVD	DVD ini lama.
each	setiap	Setiap kanak-kanak ada buku.
ear	telinga	Telinga saya sakit.
early	awal	Saya bangun awal.
east	timur	Matahari terbit di timur.
easy	mudah	Ujian ini mudah.
eat	makan	Kami makan tengah hari bersama.
egg	telur	Saya makan sebiji telur.
eight	lapan	Saya ada lapan kad.
eighteen	lapan belas	Dia berumur lapan belas tahun.
eighty	lapan puluh	Datuk saya berumur lapan puluh tahun.
elephant	gajah	Gajah itu besar.
eleven	sebelas	Kelas bermula pada pukul sebelas.
else	lain	Apa lagi yang anda perlukan?
email	e-mel	Hantar e-mel kepada saya.
end	akhir; tamat	Ini ialah pengakhiran.
enjoy	menikmati	Saya menikmati lagu ini.
enough	cukup	Kami ada masa yang cukup.
euro	euro	Ini berharga satu euro.
even	malah	Malah adik saya tahu.
evening	petang; malam	Jumpa anda malam ini.
event	acara	Acara itu bermula hari ini.
ever	pernah	Pernahkah anda memasak?
every	setiap	Saya belajar setiap hari.
everybody	semua orang	Semua orang ada di sini.
everyone	semua orang	Semua orang suka muzik.
everything	segala-galanya	Segala-galanya sudah siap.
exam	peperiksaan	Peperiksaan akan bermula tidak lama lagi.
example	contoh	Ini contoh yang baik.
excited	teruja	Saya teruja hari ini.
exciting	menarik	Permainan ini menarik.
exercise	senaman; latihan	Saya bersenam sebelum sarapan.
expensive	mahal	Kot ini mahal.
explain	menjelaskan	Sila jelaskan perkataan ini.
extra	tambahan	Saya perlukan masa tambahan.
eye	mata	Mata saya merah.
face	muka	Basuh muka anda.
fact	fakta	Fakta ini penting.
fall	jatuh; musim luruh	Daun jatuh pada musim luruh.
false	palsu; salah	Jawapan ini salah.
family	keluarga	Keluarga saya kecil.
famous	terkenal	Dia penyanyi terkenal.
fantastic	hebat	Konsert itu hebat.
far	jauh	Sekolah itu jauh.
farm	ladang	Mereka tinggal di ladang.
farmer	petani	Petani menanam makanan.
fast	laju	Kereta api ini laju.
fat	gemuk	Kucing itu gemuk.
father	bapa; ayah	Ayah saya tinggi.
favourite	kegemaran	Ini lagu kegemaran saya.
February	Februari	Di sini sejuk pada bulan Februari.
feel	berasa	Saya berasa gembira.
feeling	perasaan	Saya faham perasaan itu.
festival	festival	Festival bermula esok.
few	beberapa; sedikit	Ada sedikit pelajar di sini.
fifteen	lima belas	Saya berumur lima belas tahun.
fifth	kelima	Ini pelajaran kelima.
fifty	lima puluh	Ibu saya berumur lima puluh tahun.
fill	mengisi	Isi cawan dengan air.
film	filem	Kami menonton filem.
final	akhir	Ini soalan akhir.
find	menemui; mencari	Saya menemui kunci itu.
fine	baik	Saya baik sekarang.
finish	menyelesaikan	Habiskan kerja rumah anda.
fire	api	Api itu panas.
first	pertama	Dia orang pertama dalam barisan.
fish	ikan	Saya makan ikan untuk makan malam.
five	lima	Saya ada lima buku.
flat	pangsapuri	Pangsapuri saya kecil.
flight	penerbangan	Penerbangan itu lewat.
floor	lantai; tingkat	Beg itu di atas lantai.
flower	bunga	Bunga ini kuning.
fly	terbang	Burung terbang di langit.
follow	mengikuti	Ikut saya.
food	makanan	Makanan sudah siap.
foot	kaki	Kaki saya sakit.
football	bola sepak	Kami bermain bola sepak hari ini.
for	untuk	Hadiah ini untuk anda.
forget	lupa	Jangan lupa kunci.
form	borang	Isi borang itu.
forty	empat puluh	Ayah saya berumur empat puluh tahun.
four	empat	Saya nampak empat ekor burung.
fourteen	empat belas	Dia berumur empat belas tahun.
fourth	keempat	Ini tingkat keempat.
free	percuma; bebas	Tiket itu percuma.
Friday	Jumaat	Jumpa anda pada hari Jumaat.
friend	kawan	Kawan saya ada di sini.
friendly	mesra	Guru itu mesra.
from	dari	Saya dari sini.
front	depan	Ia berada di depan.
fruit	buah	Saya makan buah setiap hari.
full	penuh; kenyang	Botol itu penuh.
fun	seronok	Permainan ini seronok.
funny	lucu	Filem itu lucu.
future	masa depan	Fikirkan masa depan anda.
game	permainan	Permainan bermula sekarang.
garden	taman	Taman itu cantik.
geography	geografi	Saya belajar geografi di sekolah.
get	mendapat; tiba	Saya tiba di rumah pada pukul enam.
girl	budak perempuan	Budak perempuan itu tersenyum.
girlfriend	teman wanita	Teman wanitanya baik hati.
give	memberi	Beri saya buku itu.
glass	gelas; kaca	Saya minum air dari gelas.
go	pergi	Kami pulang sekarang.
good	baik	Kopi ini baik.
goodbye	selamat tinggal	Selamat tinggal, jumpa esok.
grandfather	datuk	Datuk saya sudah tua.
grandmother	nenek	Nenek saya memasak sup.
grandparent	datuk atau nenek	Datuk atau nenek saya tinggal bersama kami.
great	hebat; besar	Itu idea yang hebat.
green	hijau	Pintu itu hijau.
grey	kelabu	Langit kelabu.
group	kumpulan	Bekerja dalam kumpulan kecil.
grow	tumbuh; menanam	Tumbuhan tumbuh di taman.
guess	meneka	Teka jawapannya.
guitar	gitar	Dia bermain gitar.
gym	gim	Saya pergi ke gim.
hair	rambut	Rambutnya panjang.
half	separuh	Potong kek itu separuh.
hand	tangan	Angkat tangan anda.
happen	berlaku	Apa yang berlaku seterusnya?
happy	gembira	Saya gembira hari ini.
hard	keras; sukar	Kerusi ini keras.
hat	topi	Topi saya hitam.
hate	benci	Saya benci teh sejuk.
have	mempunyai	Saya mempunyai kereta.
have to modal	mesti	Saya mesti belajar.
he	dia	Dia abang saya.
head	kepala	Kepala saya sakit.
health	kesihatan	Makanan baik membantu kesihatan.
healthy	sihat	Hidangan ini sihat.
hear	mendengar	Saya mendengar muzik.
hello	helo	Helo, gembira bertemu anda.
help	membantu; bantuan	Tolong bantu saya.
her	dia; miliknya	Ini beg miliknya.
here	di sini	Datang ke sini sekarang.
hey	hei	Hei, tunggu saya.
hi	hai	Hai, apa khabar?
high	tinggi	Tembok itu tinggi.
him	dia	Saya kenal dia.
his	miliknya	Kot miliknya berwarna biru.
history	sejarah	Saya belajar sejarah.
hobby	hobi	Membaca ialah hobi saya.
holiday	percutian	Kami bercuti pada bulan Julai.
home	rumah	Saya berada di rumah.
homework	kerja rumah	Buat kerja rumah malam ini.
hope	berharap	Saya berharap anda datang.
horse	kuda	Kuda itu berlari laju.
hospital	hospital	Hospital itu berdekatan.
hot	panas	Sup itu panas.
hotel	hotel	Hotel itu bersih.
hour	jam	Tunggu satu jam.
house	rumah	Rumah ini lama.
how	bagaimana	Apa khabar?
however	namun	Namun, saya boleh tinggal di sini.
hundred	seratus	Seratus orang datang.
hungry	lapar	Saya lapar.
husband	suami	Suaminya seorang doktor.
I	saya	Saya suka teh.
ice	ais	Ais itu sejuk.
ice cream	aiskrim	Saya mahu aiskrim.
idea	idea	Ini idea yang baik.
if	jika	Telefon saya jika anda perlukan bantuan.
imagine	membayangkan	Bayangkan sebuah rumah kecil.
important	penting	Kelas ini penting.
improve	memperbaiki	Saya mahu memperbaiki diri.
in	dalam	Kunci ada dalam beg saya.
include	termasuk	Sertakan nama anda.
information	maklumat	Saya perlukan maklumat tambahan.
interest	minat	Dia berminat dengan seni.
interested	berminat	Saya berminat dengan muzik.
interesting	menarik	Buku ini menarik.
internet	internet	Internet lambat.
interview	temu duga	Saya ada temu duga hari ini.
into	ke dalam	Masukkan buku ke dalam beg.
introduce	memperkenalkan	Perkenalkan kawan anda.
island	pulau	Pulau ini kecil.
it	ia	Cuaca sejuk.
its	miliknya	Anjing itu suka katilnya.
jacket	jaket	Jaket saya baharu.
January	Januari	Januari ialah bulan pertama.
jeans	seluar jeans	Seluar jeans saya biru.
job	pekerjaan	Saya perlukan pekerjaan baharu.
join	menyertai	Sertai kelas kami hari ini.
journey	perjalanan	Perjalanan itu panjang.
juice	jus	Saya minum jus oren.
July	Julai	Kami melancong pada bulan Julai.
June	Jun	Sekolah tamat pada bulan Jun.
just	hanya; baru	Saya hanya perlukan air.
keep	menyimpan	Simpan kunci ini.
key	kunci	Saya kehilangan kunci.
kilometre	kilometer	Berjalan satu kilometer.
kind (type)	jenis	Apakah jenis muzik yang anda suka?
kitchen	dapur	Dapur itu bersih.
know	tahu	Saya tahu jawapannya.
land	tanah; darat	Pesawat berada di darat.
language	bahasa	Bahasa Inggeris ialah bahasa.
large	besar	Bilik ini besar.
last1 (final)	terakhir	Ini halaman terakhir.
late	lewat	Bas itu lewat.
later	kemudian	Jumpa anda kemudian.
laugh	ketawa	Kami ketawa bersama.
learn	belajar	Saya belajar bahasa Inggeris.
leave	meninggalkan	Saya meninggalkan rumah sekarang.
left	kiri	Belok kiri di sini.
leg	kaki	Kaki saya sakit.
lesson	pelajaran	Pelajaran bermula sekarang.
let	membenarkan; biarkan	Biarkan saya membantu anda.
letter	surat; huruf	Saya menulis surat.
library	perpustakaan	Perpustakaan dibuka pada pukul sembilan.
lie1	berbaring	Berbaring di atas katil.
life	kehidupan	Kehidupan di bandar sibuk.
like (similar)	seperti; serupa	Ini seperti permainan.
like (find sb/sth pleasant)	suka	Saya suka lagu ini.
line	barisan; garisan	Berdiri dalam barisan.
lion	singa	Singa itu sedang tidur.
list	senarai	Buat senarai beli-belah.
listen	mendengar	Dengar guru.
little	kecil; sedikit	Saya ada sedikit wang.
live1	tinggal	Saya tinggal dekat sekolah.
local	tempatan	Ini kedai tempatan.
long1	panjang	Jalan itu panjang.
look	melihat; kelihatan	Lihat gambar itu.
lose	kehilangan	Jangan hilangkan tiket.
lot	banyak	Saya ada banyak kerja rumah.
love	cinta; sayang	Saya sayang keluarga saya.
lunch	makan tengah hari	Makan tengah hari sudah siap.`;

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
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad MS example punctuation for ${sourceHeadword}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad MS Latin native orthography shape for ${sourceHeadword}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Bad MS non-Latin script leak for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate MS translation key: ${sourceHeadword}`);
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
    reviewer: "codex_oxford_part002_support_translation_batch_ms_v1",
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
    "- Script-aware validation: MS Latin native orthography, sentence punctuation and non-Latin script leak guard",
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
