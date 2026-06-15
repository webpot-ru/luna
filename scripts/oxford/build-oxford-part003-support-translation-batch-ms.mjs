#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "MS";
const BATCH_ID = "ms_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-ms.mjs";
const SENTENCE_END_RE = /[.!?]$/u;
const LATIN_RE = /[A-Za-z]/u;
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const MS_TRANSLATIONS_TSV = `source_headword	MS	example_MS
machine	mesin; alat	Mesin ini membuat kopi.
magazine	majalah	Dia membaca majalah muzik.
main	utama	Ini pintu utama.
make	membuat; menyediakan	Saya membuat makan tengah hari di rumah.
man	lelaki	Lelaki itu guru saya.
many	banyak	Banyak pelajar ada di sini.
map	peta	Lihat peta itu.
March	Mac	Hari lahir saya pada bulan Mac.
market	pasar; pasaran	Kami membeli buah di pasar.
married	berkahwin	Kakak saya sudah berkahwin.
May	Mei	Sekolah tamat pada bulan Mei.
maybe	mungkin	Mungkin hujan akan turun.
me	saya	Tolong bantu saya.
meal	hidangan; makan	Makanan ini panas.
mean	bermaksud	Apakah maksud tanda ini?
meaning	makna	Apakah maknanya?
meat	daging	Saya makan daging untuk makan malam.
meet	berjumpa; bertemu	Kami berjumpa selepas sekolah.
meeting	mesyuarat	Mesyuarat bermula sekarang.
member	ahli	Dia ahli kelab.
menu	menu	Baca menu itu.
message	mesej	Saya menghantar mesej pendek.
metre	meter	Berjalan satu meter ke hadapan.
midnight	tengah malam	Kereta api bertolak pada tengah malam.
mile	batu	Kami berjalan satu batu.
milk	susu	Saya minum susu semasa sarapan.
million	juta	Satu juta orang tinggal di sini.
minute1	minit	Tunggu satu minit.
miss	rindu; terlepas	Saya rindu sekolah lama.
mistake	kesilapan	Jawapan ini ada satu kesilapan.
model	model	Ini model kecil.
modern	moden	Dapur itu moden.
moment	seketika; saat	Tunggu sebentar.
Monday	Isnin	Kami mula bekerja pada hari Isnin.
money	wang	Saya perlukan sedikit wang.
month	bulan	Jun ialah bulan yang panas.
more	lebih; lagi	Saya perlukan lebih masa.
morning	pagi	Saya belajar pada waktu pagi.
most	kebanyakan; paling	Kebanyakan pelajar suka muzik.
mother	ibu	Ibu saya bekerja hari ini.
mountain	gunung	Gunung itu sangat tinggi.
mouse	tikus	Ada tikus di bawah kerusi.
mouth	mulut	Buka mulut anda.
move	bergerak; memindahkan	Pindahkan kerusi ke sini.
movie	filem	Kami menonton filem malam ini.
much	banyak; berapa	Berapakah harga ini?
mum	ibu	Ibu ada di rumah.
museum	muzium	Muzium dibuka pada pukul sepuluh.
music	muzik	Saya mendengar muzik.
must modal	mesti	Anda mesti berhenti di sini.
my	saya; milik saya	Ini buku saya.
name	nama; menamakan	Tulis nama anda di sini.
natural	semula jadi	Jus ini semula jadi.
near	dekat	Bank itu dekat sini.
need	perlu; memerlukan	Saya perlukan pen.
negative	negatif; penafian	Jawapan ini negatif.
neighbour	jiran	Jiran saya mesra.
never	tidak pernah	Saya tidak pernah minum kopi.
new	baharu	Telefon ini baharu.
news	berita	Berita hari ini baik.
newspaper	surat khabar	Dia membaca surat khabar.
next	seterusnya; berikutnya	Bas seterusnya lewat.
next to	di sebelah	Duduk di sebelah saya.
nice	baik; menyenangkan	Bilik itu menyenangkan.
night	malam	Saya tidur pada waktu malam.
nine	sembilan	Sembilan pelajar ada di sini.
nineteen	sembilan belas	Dia berumur sembilan belas tahun.
ninety	sembilan puluh	Datuk saya berumur sembilan puluh tahun.
no	tidak; tiada	Tidak, terima kasih.
no one	tiada siapa	Tiada siapa di dalam bilik.
nobody	tiada siapa	Tiada siapa di rumah.
north	utara	Stesen berada di utara.
nose	hidung	Hidung saya sejuk.
not	tidak	Saya tidak letih.
note	nota; catatan	Tulis nota sekarang.
nothing	tiada apa-apa	Tiada apa-apa di dalam kotak.
November	November	Kursus saya bermula pada bulan November.
now	sekarang	Datang ke sini sekarang.
number	nombor; angka	Tulis nombor di sini.
nurse	jururawat	Jururawat itu baik hati.
object	objek; benda	Letakkan objek itu di atas meja.
o’clock	pukul	Kelas bermula pada pukul sembilan.
October	Oktober	Kami melancong pada bulan Oktober.
of	daripada; tentang	Ini secawan teh.
off	tutup; keluar	Tutup lampu.
office	pejabat	Pejabat saya kecil.
often	sering	Saya sering berjalan ke sekolah.
oh	oh	Oh, saya faham sekarang.
OK	okey	Adakah ini okey?
old	lama; tua	Rumah ini lama.
on	di atas; hidup	Buku itu di atas meja.
once	sekali	Saya menelefon sekali seminggu.
one	satu	Saya ada seorang kakak.
onion	bawang	Potong sebiji bawang.
online	dalam talian	Saya belajar dalam talian.
only	hanya	Saya hanya ada satu beg.
open	buka; terbuka	Buka tingkap.
opinion	pendapat	Apakah pendapat anda?
opposite	bertentangan	Kedai itu bertentangan dengan bank.
or	atau	Teh atau kopi?
orange	oren; warna jingga	Buah oren ini manis.
order	memesan; pesanan	Saya memesan sup.
other	lain	Gunakan pintu lain.
our	kami; kita	Ini kelas kami.
out	keluar	Pergi keluar selepas makan tengah hari.
outside	di luar	Kanak-kanak bermain di luar.
over	di atas; melintasi	Kapal terbang melintas di atas bandar.
own	sendiri; memiliki	Saya ada bilik sendiri.
page	halaman	Buka halaman sepuluh.
paint	cat; mengecat	Cat dinding itu biru.
painting	lukisan	Lukisan ini cantik.
pair	sepasang	Saya perlukan sepasang stoking.
paper	kertas	Tulis pada kertas ini.
paragraph	perenggan	Baca perenggan pertama.
parent	ibu bapa; penjaga	Seorang ibu bapa menunggu di luar.
park	taman; meletak kereta	Kami meletak kereta dekat stesen.
part	bahagian	Bahagian ini mudah.
partner	rakan; pasangan	Bekerja dengan rakan anda.
party	parti	Parti bermula pada pukul tujuh.
passport	pasport	Tunjukkan pasport anda.
past	lepas; lalu	Sekarang pukul enam setengah.
pay	membayar	Saya membayar dengan kad.
pen	pen	Pen ini biru.
pencil	pensel	Saya menulis dengan pensel.
people	orang	Banyak orang ada di sini.
pepper	lada	Tambah lada ke dalam sup.
perfect	sempurna	Jawapan anda sempurna.
period	tempoh; waktu pelajaran	Waktu pelajaran ini pendek.
person	orang	Seorang sedang menunggu.
personal	peribadi	Ini telefon peribadi saya.
phone	telefon; menelefon	Telefon saya di dalam beg.
photo	foto; gambar	Ambil foto di sini.
photograph	foto; mengambil gambar	Foto ini lama.
phrase	frasa	Ulang frasa ini.
piano	piano	Dia bermain piano.
picture	gambar	Lihat gambar ini.
piece	keping; potong	Ambil sepotong kek.
pig	babi	Babi itu di ladang.
pink	merah jambu	Begnya merah jambu.
place	tempat; meletakkan	Tempat ini sunyi.
plan	rancangan	Kami perlukan rancangan.
plane	kapal terbang	Kapal terbang itu lewat.
plant	tumbuhan; menanam	Siram tumbuhan hari ini.
play	bermain; lakonan	Kanak-kanak bermain di taman.
player	pemain	Pemain itu berlari laju.
please	sila; tolong	Sila duduk di sini.
point	titik; perkara	Perkara ini penting.
police	polis	Polis berada di luar.
policeman	anggota polis lelaki	Anggota polis itu membantu kami.
pool	kolam	Kolam itu sejuk.
poor	miskin; kasihan	Kanak-kanak miskin itu lapar.
popular	popular	Lagu ini popular.
positive	positif	Keputusan ini positif.
possible	mungkin; boleh	Adakah ini boleh hari ini?
post	siaran; menghantar	Saya membaca siarannya dalam talian.
potato	kentang	Saya makan sebiji kentang.
pound	paun	Harganya satu paun.
practice	latihan	Latihan membantu setiap hari.
practise	berlatih	Saya berlatih bahasa Inggeris setiap hari.
prefer	lebih suka	Saya lebih suka teh.
prepare	menyediakan; bersedia	Sediakan beg anda malam ini.
present	hadir; sekarang	Dia hadir hari ini.
pretty	cantik; agak	Taman itu cantik.
price	harga	Harganya rendah.
probably	mungkin	Dia mungkin tahu.
problem	masalah	Masalah ini kecil.
product	produk; keluaran	Produk ini baharu.
programme	program; rancangan	Program bermula sekarang.
project	projek	Projek kami sudah siap.
purple	ungu	Baju itu ungu.
put	meletakkan	Letakkan buku di sini.
quarter	suku; lima belas minit	Sekarang pukul dua suku.
question	soalan	Tanya satu soalan.
quick	cepat; ringkas	Ini ujian ringkas.
quickly	dengan cepat	Pergi dengan cepat.
quiet	senyap; tenang	Perpustakaan itu senyap.
quite	agak	Bilik ini agak kecil.
radio	radio	Radio itu sangat kuat.
rain	hujan	Hujan bermula sekarang.
read	membaca	Baca ayat ini.
reader	pembaca	Pembaca suka cerita itu.
reading	bacaan; membaca	Membaca membantu saya belajar.
ready	sedia	Makan malam sudah sedia.
real	nyata; sebenar	Ada masalah sebenar.
really	benar-benar	Saya benar-benar suka lagu ini.
reason	sebab	Beritahu saya sebabnya.
red	merah	Pintu itu merah.
relax	berehat; bersantai	Berehat selepas kerja.
remember	ingat	Ingat pasport anda.
repeat	mengulang; ulangan	Ulang ayat ini.
report	laporan	Baca laporan malam ini.
restaurant	restoran	Restoran itu sibuk.
result	keputusan	Keputusan itu baik.
return	kembali; memulangkan	Pulangkan buku esok.
rice	nasi; beras	Saya makan nasi untuk tengah hari.
rich	kaya	Bandar ini kaya.
ride	menunggang; menaiki	Saya menunggang basikal.
right	kanan; betul	Belok kanan di sini.
river	sungai	Sungai itu lebar.
road	jalan	Jalan ini panjang.
room	bilik	Bilik saya bersih.
routine	rutin	Rutin saya bermula awal.
rule	peraturan	Peraturan ini mudah.
run	berlari	Saya berlari setiap pagi.
sad	sedih	Dia sedih hari ini.
salad	salad	Salad ini segar.
salt	garam	Tambah sedikit garam.
same	sama	Kami ada beg yang sama.
sandwich	sandwic	Saya makan satu sandwic.
Saturday	Sabtu	Kami berjumpa pada hari Sabtu.
say	berkata; menyebut	Sebut nama anda.
school	sekolah	Sekolah saya dekat.
science	sains	Saya belajar sains.
scientist	saintis	Saintis itu bertanya soalan.
sea	laut	Laut itu biru.
second1 (unit of time)	saat	Tunggu satu saat.
section	bahagian	Baca bahagian ini.
see	melihat; berjumpa	Saya melihat kawan saya.
sell	menjual	Mereka menjual buah segar.
send	menghantar	Hantar mesej sekarang.
sentence	ayat	Tulis satu ayat.
September	September	Sekolah bermula pada bulan September.
seven	tujuh	Tujuh orang ada di sini.
seventeen	tujuh belas	Dia berumur tujuh belas tahun.
seventy	tujuh puluh	Nenek saya berumur tujuh puluh tahun.
share	berkongsi; membahagi	Bahagikan kek itu.
she	dia	Dia kakak saya.
sheep	kambing biri-biri	Kambing biri-biri makan rumput.
shirt	baju kemeja	Baju kemejanya bersih.
shoe	kasut	Sebelah kasut berada di bawah katil.
shop	kedai; membeli-belah	Kedai tutup awal.
shopping	membeli-belah	Membeli-belah hari ini menyeronokkan.
short	pendek	Cerita ini pendek.
should modal	patut	Anda patut berehat hari ini.
show	menunjukkan; rancangan	Tunjukkan tiket anda kepada saya.
shower	pancuran; mandi	Saya mandi dengan pancuran.
sick	sakit	Saya berasa sakit hari ini.
similar	serupa	Beg kami serupa.
sing	menyanyi	Saya menyanyi di kelas.
singer	penyanyi	Penyanyi itu terkenal.
sister	kakak; adik perempuan	Adik perempuan saya muda.
sit	duduk	Duduk dekat tingkap.
situation	situasi	Situasi ini baharu.
six	enam	Enam buku ada di sini.
sixteen	enam belas	Dia berumur enam belas tahun.
sixty	enam puluh	Ayah saya berumur enam puluh tahun.
skill	kemahiran	Kemahiran ini berguna.
skirt	skirt	Skirtnya biru.
sleep	tidur	Saya tidur lapan jam.
slow	perlahan	Bas itu perlahan.
small	kecil	Bilik itu kecil.
snake	ular	Ular itu panjang.
snow	salji	Salji turun pada musim sejuk.
so	jadi; sangat	Saya letih, jadi saya berehat.
some	beberapa; sedikit	Saya perlukan sedikit air.
somebody	seseorang	Seseorang ada di pintu.
someone	seseorang	Seseorang meninggalkan mesej.
something	sesuatu	Saya perlukan sesuatu untuk diminum.
sometimes	kadang-kadang	Saya kadang-kadang berjalan ke sekolah.
son	anak lelaki	Anak lelakinya di sekolah.
song	lagu	Lagu ini baharu.
soon	tidak lama lagi	Jumpa anda tidak lama lagi.
sorry	maaf	Saya minta maaf.
sound	bunyi; kedengaran	Bunyi itu kuat.
soup	sup	Sup itu panas.
south	selatan	Hotel itu berada di selatan.
space	ruang	Ada ruang untuk sebuah kerusi.
speak	bercakap	Sila bercakap perlahan-lahan.
special	istimewa	Hari ini hari istimewa.
spell	mengeja	Eja nama anda.
spelling	ejaan	Periksa ejaan anda.
spend	membelanjakan; menghabiskan	Saya membelanjakan wang untuk makanan.
sport	sukan	Bola sepak ialah sukan popular.
spring	musim bunga; melompat	Bunga tumbuh pada musim bunga.
stand	berdiri	Berdiri dekat pintu.
star	bintang	Saya melihat bintang yang terang.
start	mula	Mulakan pelajaran sekarang.
statement	kenyataan	Kenyataan ini betul.
station	stesen	Stesen itu dekat.
stay	tinggal; kekal	Tinggal di rumah hari ini.
still	masih	Saya masih lapar.
stop	berhenti; hentian	Berhenti di sudut jalan.
story	cerita	Beritahu saya satu cerita.
street	jalan	Jalan ini sunyi.
strong	kuat	Dia kuat.
student	pelajar	Pelajar itu membaca buku.
study	belajar; kajian	Saya belajar bahasa Inggeris.
style	gaya	Saya suka gaya ini.
subject	mata pelajaran; topik	Bahasa Inggeris mata pelajaran utama saya.
success	kejayaan	Kejayaan memerlukan latihan.
sugar	gula	Letakkan gula dalam teh.
summer	musim panas	Musim panas di sini panas.
sun	matahari	Matahari terang.
Sunday	Ahad	Kami berehat pada hari Ahad.
supermarket	pasar raya	Pasar raya itu buka.
sure	pasti	Saya pasti.
sweater	baju sejuk	Baju sejuk saya hangat.
swim	berenang	Saya berenang setiap minggu.
swimming	renang; berenang	Berenang ialah senaman baik.
table	meja	Kunci berada di atas meja.`;

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
      throw new Error(`Malay example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Malay display/example must contain Latin text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (NON_LATIN_SCRIPT_RE.test(display) || NON_LATIN_SCRIPT_RE.test(example)) {
      throw new Error(`Malay display/example contains non-Latin script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Malay translation row for ${sourceHeadword}`);
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
    "Generate ID support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after ID.",
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
    throw new Error("Usage: node scripts/oxford/build-oxford-part003-support-translation-batch-ms.mjs --contract=<contract.json>");
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const outputPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_ms_v1.jsonl";
  const summaryPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_ms_v1_summary.md";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== "oxford_3000_core_a1_part_003_300_v1") {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(MS_TRANSLATIONS_TSV);

  if (rows.length !== 300) {
    throw new Error(`Expected 300 Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Malay translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Malay translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Malay
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: MS Latin-script display/example cells and no non-Latin script leakage
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
