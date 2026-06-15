#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "ID";
const BATCH_ID = "id_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-id.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-z]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const ID_TRANSLATIONS_TSV = `source_headword	ID	example_ID
machine	mesin; alat	Mesin ini membuat kopi.
magazine	majalah	Dia membaca majalah musik.
main	utama	Ini pintu utama.
make	membuat; menyiapkan	Saya membuat makan siang di rumah.
man	pria; laki-laki	Pria itu guru saya.
many	banyak	Banyak siswa ada di sini.
map	peta	Lihat peta itu.
March	Maret	Ulang tahun saya pada bulan Maret.
market	pasar; pasar ekonomi	Kami membeli buah di pasar.
married	menikah	Kakak saya sudah menikah.
May	Mei	Sekolah selesai pada bulan Mei.
maybe	mungkin	Mungkin hujan akan turun.
me	saya	Tolong bantu saya.
meal	makanan; hidangan	Makanan ini panas.
mean	berarti	Apa arti tanda ini?
meaning	arti; makna	Apa artinya?
meat	daging	Saya makan daging untuk makan malam.
meet	bertemu; menemui	Kami bertemu setelah sekolah.
meeting	rapat; pertemuan	Rapat dimulai sekarang.
member	anggota	Dia anggota klub.
menu	menu	Baca menu itu.
message	pesan	Saya mengirim pesan singkat.
metre	meter	Berjalan satu meter ke depan.
midnight	tengah malam	Kereta berangkat tengah malam.
mile	mil	Kami berjalan satu mil.
milk	susu	Saya minum susu saat sarapan.
million	juta	Satu juta orang tinggal di sini.
minute1	menit	Tunggu satu menit.
miss	merindukan; melewatkan	Saya merindukan sekolah lama.
mistake	kesalahan	Jawaban ini punya satu kesalahan.
model	model; contoh	Ini model kecil.
modern	modern	Dapur itu modern.
moment	saat; sebentar	Tunggu sebentar.
Monday	Senin	Kami mulai bekerja pada hari Senin.
money	uang	Saya perlu sedikit uang.
month	bulan	Juni adalah bulan yang panas.
more	lebih; lagi	Saya perlu lebih banyak waktu.
morning	pagi	Saya belajar pada pagi hari.
most	kebanyakan; paling	Kebanyakan siswa suka musik.
mother	ibu	Ibu saya bekerja hari ini.
mountain	gunung	Gunung itu sangat tinggi.
mouse	tikus	Ada tikus di bawah kursi.
mouth	mulut	Buka mulut Anda.
move	bergerak; memindahkan	Pindahkan kursi ke sini.
movie	film	Kami menonton film malam ini.
much	banyak; berapa	Berapa harga ini?
mum	ibu	Ibu ada di rumah.
museum	museum	Museum buka pukul sepuluh.
music	musik	Saya mendengarkan musik.
must modal	harus	Anda harus berhenti di sini.
my	saya; milik saya	Ini buku saya.
name	nama; menamai	Tulis nama Anda di sini.
natural	alami	Jus ini alami.
near	dekat	Bank itu dekat sini.
need	perlu; membutuhkan	Saya perlu pena.
negative	negatif; penolakan	Jawaban ini negatif.
neighbour	tetangga	Tetangga saya ramah.
never	tidak pernah	Saya tidak pernah minum kopi.
new	baru	Telepon ini baru.
news	berita	Berita hari ini baik.
newspaper	koran	Dia membaca koran.
next	berikutnya; selanjutnya	Bus berikutnya terlambat.
next to	di sebelah	Duduk di sebelah saya.
nice	baik; menyenangkan	Ruangan itu menyenangkan.
night	malam	Saya tidur pada malam hari.
nine	sembilan	Sembilan siswa ada di sini.
nineteen	sembilan belas	Dia berumur sembilan belas tahun.
ninety	sembilan puluh	Kakek saya berumur sembilan puluh tahun.
no	tidak; bukan	Tidak, terima kasih.
no one	tidak ada seorang pun	Tidak ada seorang pun di kamar.
nobody	tidak ada orang	Tidak ada orang di rumah.
north	utara	Stasiun ada di utara.
nose	hidung	Hidung saya dingin.
not	tidak	Saya tidak lelah.
note	catatan; nota	Tulis catatan sekarang.
nothing	tidak ada apa-apa	Tidak ada apa-apa di kotak.
November	November	Kursus saya mulai pada bulan November.
now	sekarang	Datang ke sini sekarang.
number	nomor; angka	Tulis nomor di sini.
nurse	perawat	Perawat itu baik hati.
object	benda; objek	Letakkan benda itu di meja.
o’clock	pukul	Kelas mulai pukul sembilan.
October	Oktober	Kami bepergian pada bulan Oktober.
of	dari; tentang	Ini secangkir teh.
off	mati; lepas	Matikan lampu.
office	kantor	Kantor saya kecil.
often	sering	Saya sering berjalan ke sekolah.
oh	oh	Oh, saya mengerti sekarang.
OK	oke	Apakah ini oke?
old	lama; tua	Rumah ini tua.
on	di atas; menyala	Buku itu di atas meja.
once	sekali	Saya menelepon sekali seminggu.
one	satu	Saya punya satu kakak perempuan.
onion	bawang	Potong satu bawang.
online	daring; online	Saya belajar secara daring.
only	hanya	Saya hanya punya satu tas.
open	buka; terbuka	Buka jendela.
opinion	pendapat	Apa pendapat Anda?
opposite	berlawanan; di seberang	Toko itu di seberang bank.
or	atau	Teh atau kopi?
orange	jeruk; warna oranye	Jeruk ini manis.
order	memesan; pesanan	Saya memesan sup.
other	lain	Gunakan pintu lain.
our	kami; kita	Ini kelas kami.
out	keluar	Pergi keluar setelah makan siang.
outside	di luar	Anak-anak bermain di luar.
over	di atas; melintasi	Pesawat terbang di atas kota.
own	sendiri; memiliki	Saya punya kamar sendiri.
page	halaman	Buka halaman sepuluh.
paint	cat; mengecat	Cat dinding itu biru.
painting	lukisan	Lukisan ini indah.
pair	sepasang	Saya perlu sepasang kaus kaki.
paper	kertas	Tulis di kertas ini.
paragraph	paragraf	Baca paragraf pertama.
parent	orang tua	Seorang orang tua menunggu di luar.
park	taman; memarkir	Kami memarkir mobil dekat stasiun.
part	bagian	Bagian ini mudah.
partner	pasangan; rekan	Bekerjalah dengan rekan Anda.
party	pesta	Pesta dimulai pukul tujuh.
passport	paspor	Tunjukkan paspor Anda.
past	lalu; masa lalu	Sekarang pukul enam lewat tiga puluh.
pay	membayar	Saya membayar dengan kartu.
pen	pena	Pena ini biru.
pencil	pensil	Saya menulis dengan pensil.
people	orang	Banyak orang ada di sini.
pepper	lada	Tambahkan lada ke sup.
perfect	sempurna	Jawaban Anda sempurna.
period	periode; jam pelajaran	Jam pelajaran ini singkat.
person	orang	Satu orang sedang menunggu.
personal	pribadi	Ini telepon pribadi saya.
phone	telepon; menelepon	Telepon saya ada di tas.
photo	foto	Ambil foto di sini.
photograph	foto; memotret	Foto ini lama.
phrase	frasa	Ulangi frasa ini.
piano	piano	Dia bermain piano.
picture	gambar	Lihat gambar ini.
piece	potong; bagian	Ambil sepotong kue.
pig	babi	Babi itu ada di peternakan.
pink	merah muda	Tasnya merah muda.
place	tempat; menempatkan	Tempat ini tenang.
plan	rencana	Kami perlu rencana.
plane	pesawat	Pesawat itu terlambat.
plant	tanaman; menanam	Siram tanaman hari ini.
play	bermain; pertunjukan	Anak-anak bermain di taman.
player	pemain	Pemain itu berlari cepat.
please	tolong; silakan	Silakan duduk di sini.
point	titik; poin	Poin ini penting.
police	polisi	Polisi ada di luar.
policeman	polisi pria	Polisi pria itu membantu kami.
pool	kolam renang	Kolam renang itu dingin.
poor	miskin; kasihan	Anak miskin itu lapar.
popular	populer	Lagu ini populer.
positive	positif	Hasil ini positif.
possible	mungkin; memungkinkan	Apakah ini mungkin hari ini?
post	unggahan; mengirim	Saya membaca unggahannya secara daring.
potato	kentang	Saya makan satu kentang.
pound	pon	Harganya satu pon.
practice	latihan	Latihan membantu setiap hari.
practise	berlatih	Saya berlatih bahasa Inggris setiap hari.
prefer	lebih suka	Saya lebih suka teh.
prepare	menyiapkan; mempersiapkan	Siapkan tas Anda malam ini.
present	hadir; sekarang	Dia hadir hari ini.
pretty	cantik; cukup	Taman itu cantik.
price	harga	Harganya rendah.
probably	mungkin	Dia mungkin tahu.
problem	masalah	Masalah ini kecil.
product	produk; barang	Produk ini baru.
programme	program; acara	Program dimulai sekarang.
project	proyek	Proyek kami sudah siap.
purple	ungu	Kemeja itu ungu.
put	meletakkan	Letakkan buku di sini.
quarter	seperempat; lima belas menit	Sekarang pukul dua lewat lima belas.
question	pertanyaan	Ajukan satu pertanyaan.
quick	cepat; singkat	Ini tes singkat.
quickly	dengan cepat	Pergilah dengan cepat.
quiet	tenang; sunyi	Perpustakaan itu tenang.
quite	cukup	Ruangan ini cukup kecil.
radio	radio	Radio itu sangat keras.
rain	hujan	Hujan mulai sekarang.
read	membaca	Baca kalimat ini.
reader	pembaca	Pembaca menyukai cerita itu.
reading	membaca; bacaan	Membaca membantu saya belajar.
ready	siap	Makan malam sudah siap.
real	nyata; sungguh	Ada masalah nyata.
really	benar-benar	Saya benar-benar suka lagu ini.
reason	alasan	Beri tahu saya alasannya.
red	merah	Pintu itu merah.
relax	bersantai; rileks	Bersantailah setelah bekerja.
remember	ingat	Ingat paspor Anda.
repeat	mengulangi; ulangan	Ulangi kalimat ini.
report	laporan	Baca laporan malam ini.
restaurant	restoran	Restoran itu ramai.
result	hasil	Hasilnya baik.
return	kembali; mengembalikan	Kembalikan buku besok.
rice	nasi; beras	Saya makan nasi untuk makan siang.
rich	kaya	Kota ini kaya.
ride	naik; mengendarai	Saya mengendarai sepeda.
right	kanan; benar	Belok kanan di sini.
river	sungai	Sungai itu lebar.
road	jalan	Jalan ini panjang.
room	kamar; ruangan	Kamar saya bersih.
routine	rutinitas	Rutinitas saya mulai pagi.
rule	aturan	Aturan ini mudah.
run	berlari	Saya berlari setiap pagi.
sad	sedih	Dia sedih hari ini.
salad	salad	Salad ini segar.
salt	garam	Tambahkan sedikit garam.
same	sama	Kami punya tas yang sama.
sandwich	roti lapis	Saya makan satu roti lapis.
Saturday	Sabtu	Kami bertemu pada hari Sabtu.
say	mengatakan; menyebut	Sebutkan nama Anda.
school	sekolah	Sekolah saya dekat.
science	sains	Saya belajar sains.
scientist	ilmuwan	Ilmuwan itu mengajukan pertanyaan.
sea	laut	Laut itu biru.
second1 (unit of time)	detik	Tunggu satu detik.
section	bagian	Baca bagian ini.
see	melihat; bertemu	Saya melihat teman saya.
sell	menjual	Mereka menjual buah segar.
send	mengirim	Kirim pesan sekarang.
sentence	kalimat	Tulis satu kalimat.
September	September	Sekolah mulai pada bulan September.
seven	tujuh	Tujuh orang ada di sini.
seventeen	tujuh belas	Dia berumur tujuh belas tahun.
seventy	tujuh puluh	Nenek saya berumur tujuh puluh tahun.
share	berbagi; membagi	Bagikan kue itu.
she	dia	Dia kakak perempuan saya.
sheep	domba	Domba itu makan rumput.
shirt	kemeja	Kemejanya bersih.
shoe	sepatu	Satu sepatu ada di bawah tempat tidur.
shop	toko; berbelanja	Toko tutup lebih awal.
shopping	belanja; berbelanja	Belanja hari ini menyenangkan.
short	pendek	Cerita ini pendek.
should modal	sebaiknya; harus	Anda sebaiknya beristirahat hari ini.
show	menunjukkan; acara	Tunjukkan tiket Anda kepada saya.
shower	pancuran; mandi	Saya mandi dengan pancuran.
sick	sakit	Saya merasa sakit hari ini.
similar	mirip	Tas kami mirip.
sing	bernyanyi	Saya bernyanyi di kelas.
singer	penyanyi	Penyanyi itu terkenal.
sister	kakak perempuan; adik perempuan	Adik perempuan saya masih muda.
sit	duduk	Duduk dekat jendela.
situation	situasi	Situasi ini baru.
six	enam	Enam buku ada di sini.
sixteen	enam belas	Dia berumur enam belas tahun.
sixty	enam puluh	Ayah saya berumur enam puluh tahun.
skill	keterampilan	Keterampilan ini berguna.
skirt	rok	Roknya biru.
sleep	tidur	Saya tidur delapan jam.
slow	lambat	Bus itu lambat.
small	kecil	Ruangan itu kecil.
snake	ular	Ular itu panjang.
snow	salju	Salju turun pada musim dingin.
so	jadi; sangat	Saya lelah, jadi saya beristirahat.
some	beberapa; sedikit	Saya perlu sedikit air.
somebody	seseorang	Seseorang ada di pintu.
someone	seseorang	Seseorang meninggalkan pesan.
something	sesuatu	Saya perlu sesuatu untuk diminum.
sometimes	kadang-kadang	Saya kadang-kadang berjalan ke sekolah.
son	anak laki-laki	Anak laki-lakinya di sekolah.
song	lagu	Lagu ini baru.
soon	segera	Sampai jumpa segera.
sorry	maaf	Saya minta maaf.
sound	suara; terdengar	Suara itu keras.
soup	sup	Sup itu panas.
south	selatan	Hotel itu ada di selatan.
space	ruang	Ada ruang untuk kursi.
speak	berbicara	Tolong berbicara pelan-pelan.
special	istimewa	Hari ini hari istimewa.
spell	mengeja	Eja nama Anda.
spelling	ejaan	Periksa ejaan Anda.
spend	membelanjakan; menghabiskan	Saya membelanjakan uang untuk makanan.
sport	olahraga	Sepak bola adalah olahraga populer.
spring	musim semi; melompat	Bunga tumbuh pada musim semi.
stand	berdiri	Berdiri dekat pintu.
star	bintang	Saya melihat bintang yang terang.
start	mulai	Mulai pelajaran sekarang.
statement	pernyataan	Pernyataan ini benar.
station	stasiun	Stasiun itu dekat.
stay	tinggal; tetap	Tinggal di rumah hari ini.
still	masih	Saya masih lapar.
stop	berhenti; halte	Berhenti di sudut jalan.
story	cerita	Ceritakan satu cerita kepada saya.
street	jalan	Jalan ini tenang.
strong	kuat	Dia kuat.
student	siswa; mahasiswa	Siswa itu membaca buku.
study	belajar; studi	Saya belajar bahasa Inggris.
style	gaya	Saya suka gaya ini.
subject	mata pelajaran; topik	Bahasa Inggris adalah mata pelajaran utama saya.
success	keberhasilan	Keberhasilan perlu latihan.
sugar	gula	Taruh gula dalam teh.
summer	musim panas	Musim panas di sini panas.
sun	matahari	Matahari terang.
Sunday	Minggu	Kami beristirahat pada hari Minggu.
supermarket	supermarket	Supermarket itu buka.
sure	yakin	Saya yakin.
sweater	sweter	Sweter saya hangat.
swim	berenang	Saya berenang setiap minggu.
swimming	berenang; renang	Berenang adalah olahraga yang baik.
table	meja	Kunci ada di atas meja.`;

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
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Indonesian example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Indonesian display/example must contain Latin text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Indonesian display/example contains non-Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Indonesian translation row for ${sourceHeadword}`);
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
    "Generate PL support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after PL.",
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
    throw new Error("Usage: node scripts/oxford/build-oxford-part003-support-translation-batch-id.mjs --contract=<contract.json>");
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const outputPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_id_v1.jsonl";
  const summaryPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_id_v1_summary.md";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== "oxford_3000_core_a1_part_003_300_v1") {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(ID_TRANSLATIONS_TSV);

  if (rows.length !== 300) {
    throw new Error(`Expected 300 Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Indonesian translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Indonesian translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Indonesian
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: ID Latin-script display/example cells and no non-Latin script leakage
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
