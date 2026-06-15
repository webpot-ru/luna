#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const releaseId = args.get("release") ?? "english_core_3000_a1_a2_part_001_150_v1";
const inputPath = path.resolve(
  args.get("input") ??
    `outputs/english-core-3000/en-transcriptions/${releaseId}_en_transcriptions_v1.jsonl`
);
const outputDir = path.resolve(args.get("out-dir") ?? "outputs/english-core-3000/translation-batches");

const translations = {
  core3000_0001: { VI: ["mạo từ xác định", "Cánh cửa đang mở."], TH: ["คำนำหน้านามชี้เฉพาะ", "ประตูเปิดอยู่."], MS: ["kata sandang tentu", "Pintu itu terbuka."], ID: ["kata sandang tentu", "Pintu itu terbuka."] },
  core3000_0002: { VI: ["là; ở", "Tôi muốn sẵn sàng."], TH: ["เป็น; อยู่", "ฉันอยากพร้อม."], MS: ["menjadi; berada", "Saya mahu bersedia."], ID: ["menjadi; berada", "Saya ingin siap."] },
  core3000_0003: { VI: ["và", "Trà và nước ở trên bàn."], TH: ["และ", "ชาและน้ำอยู่บนโต๊ะ."], MS: ["dan", "Teh dan air ada di atas meja."], ID: ["dan", "Teh dan air ada di atas meja."] },
  core3000_0004: { VI: ["của", "Một tách trà thì nóng."], TH: ["ของ", "ชาหนึ่งถ้วยร้อน."], MS: ["daripada; milik", "Secawan teh itu panas."], ID: ["dari; milik", "Secangkir teh itu panas."] },
  core3000_0005: { VI: ["dấu hiệu động từ nguyên mẫu", "Tôi muốn về nhà."], TH: ["คำเชื่อมกริยารูปไม่ผัน", "ฉันอยากกลับบ้าน."], MS: ["penanda infinitif", "Saya mahu pulang ke rumah."], ID: ["penanda infinitif", "Saya ingin pulang ke rumah."] },
  core3000_0006: { VI: ["mạo từ không xác định", "Tôi có một quyển sách."], TH: ["คำนำหน้านามไม่ชี้เฉพาะ", "ฉันมีหนังสือหนึ่งเล่ม."], MS: ["kata sandang tak tentu", "Saya ada sebuah buku."], ID: ["kata sandang tak tentu", "Saya punya sebuah buku."] },
  core3000_0007: { VI: ["trong; ở", "Chìa khóa ở trong túi."], TH: ["ใน", "กุญแจอยู่ในกระเป๋า."], MS: ["di dalam; di", "Kunci itu ada di dalam beg."], ID: ["di dalam; di", "Kunci itu ada di dalam tas."] },
  core3000_0008: { VI: ["có", "Tôi có một chiếc điện thoại."], TH: ["มี", "ฉันมีโทรศัพท์หนึ่งเครื่อง."], MS: ["mempunyai; ada", "Saya ada telefon."], ID: ["memiliki; punya", "Saya punya ponsel."] },
  core3000_0009: { VI: ["nó; việc đó", "Nó ở trong túi."], TH: ["มัน; สิ่งนั้น", "มันอยู่ในกระเป๋า."], MS: ["ia; itu", "Ia ada di dalam beg."], ID: ["itu; dia", "Itu ada di dalam tas."] },
  core3000_0010: { VI: ["bạn", "Bạn là bạn tôi."], TH: ["คุณ; เธอ", "คุณเป็นเพื่อนของฉัน."], MS: ["awak; kamu", "Awak kawan saya."], ID: ["kamu; Anda", "Kamu adalah teman saya."] },
  core3000_0011: { VI: ["anh ấy; ông ấy", "Anh ấy đang ở trường."], TH: ["เขา", "เขาอยู่ที่โรงเรียน."], MS: ["dia lelaki", "Dia berada di sekolah."], ID: ["dia laki-laki", "Dia ada di sekolah."] },
  core3000_0012: { VI: ["cho; vì", "Món quà này dành cho bạn."], TH: ["สำหรับ; ให้", "ของขวัญนี้สำหรับคุณ."], MS: ["untuk", "Hadiah ini untuk awak."], ID: ["untuk", "Hadiah ini untukmu."] },
  core3000_0013: { VI: ["họ", "Họ đang ở nhà."], TH: ["พวกเขา", "พวกเขาอยู่บ้าน."], MS: ["mereka", "Mereka ada di rumah."], ID: ["mereka", "Mereka ada di rumah."] },
  core3000_0014: { VI: ["không", "Tôi không mệt."], TH: ["ไม่", "ฉันไม่เหนื่อย."], MS: ["tidak; bukan", "Saya tidak letih."], ID: ["tidak; bukan", "Saya tidak lelah."] },
  core3000_0015: { VI: ["đó; kia", "Quyển sách đó là của tôi."], TH: ["นั้น", "หนังสือเล่มนั้นเป็นของฉัน."], MS: ["itu", "Buku itu milik saya."], ID: ["itu", "Buku itu milik saya."] },
  core3000_0016: { VI: ["chúng tôi; chúng ta", "Chúng tôi đã sẵn sàng."], TH: ["เรา", "เราพร้อมแล้ว."], MS: ["kami; kita", "Kami sudah bersedia."], ID: ["kami; kita", "Kami sudah siap."] },
  core3000_0017: { VI: ["trên", "Cái cốc ở trên bàn."], TH: ["บน", "ถ้วยอยู่บนโต๊ะ."], MS: ["di atas", "Cawan itu ada di atas meja."], ID: ["di atas", "Cangkir itu ada di atas meja."] },
  core3000_0018: { VI: ["với", "Tôi đang ở cùng gia đình."], TH: ["กับ", "ฉันอยู่กับครอบครัว."], MS: ["dengan", "Saya bersama keluarga saya."], ID: ["dengan", "Saya bersama keluarga saya."] },
  core3000_0019: { VI: ["này", "Quyển sách này mới."], TH: ["นี้", "หนังสือเล่มนี้ใหม่."], MS: ["ini", "Buku ini baharu."], ID: ["ini", "Buku ini baru."] },
  core3000_0020: { VI: ["tôi", "Tôi đang ở nhà."], TH: ["ฉัน; ผม", "ฉันอยู่บ้าน."], MS: ["saya", "Saya ada di rumah."], ID: ["saya; aku", "Saya ada di rumah."] },
  core3000_0021: { VI: ["làm", "Tôi làm bài tập về nhà."], TH: ["ทำ", "ฉันทำการบ้าน."], MS: ["melakukan; membuat", "Saya membuat kerja rumah."], ID: ["melakukan; mengerjakan", "Saya mengerjakan pekerjaan rumah."] },
  core3000_0022: { VI: ["như; với tư cách", "Cô ấy làm việc như một giáo viên."], TH: ["ในฐานะ; เป็น", "เธอทำงานเป็นครู."], MS: ["sebagai", "Dia bekerja sebagai guru."], ID: ["sebagai", "Dia bekerja sebagai guru."] },
  core3000_0023: { VI: ["ở; tại", "Gặp tôi ở trường nhé."], TH: ["ที่", "เจอกันที่โรงเรียน."], MS: ["di; pada", "Jumpa saya di sekolah."], ID: ["di; pada", "Temui saya di sekolah."] },
  core3000_0024: { VI: ["cô ấy; bà ấy", "Cô ấy là chị gái của tôi."], TH: ["เธอ; เขา", "เธอเป็นพี่สาวของฉัน."], MS: ["dia perempuan", "Dia kakak perempuan saya."], ID: ["dia perempuan", "Dia kakak perempuan saya."] },
  core3000_0025: { VI: ["nhưng", "Tôi mệt, nhưng tôi vui."], TH: ["แต่", "ฉันเหนื่อยแต่มีความสุข."], MS: ["tetapi", "Saya letih, tetapi saya gembira."], ID: ["tetapi; tapi", "Saya lelah, tetapi saya senang."] },
  core3000_0026: { VI: ["từ", "Tôi đến từ Canada."], TH: ["จาก", "ฉันมาจากแคนาดา."], MS: ["dari", "Saya berasal dari Kanada."], ID: ["dari", "Saya berasal dari Kanada."] },
  core3000_0027: { VI: ["bên cạnh; bởi", "Cái túi ở bên cạnh cửa."], TH: ["ข้าง; โดย", "กระเป๋าอยู่ข้างประตู."], MS: ["di sebelah; oleh", "Beg itu di sebelah pintu."], ID: ["di sebelah; oleh", "Tas itu ada di sebelah pintu."] },
  core3000_0028: { VI: ["sẽ", "Tôi sẽ gọi cho bạn."], TH: ["จะ", "ฉันจะโทรหาคุณ."], MS: ["akan", "Saya akan menelefon awak."], ID: ["akan", "Saya akan meneleponmu."] },
  core3000_0029: { VI: ["hoặc", "Trà hay cà phê đều được."], TH: ["หรือ", "ชาหรือกาแฟก็ได้."], MS: ["atau", "Teh atau kopi pun boleh."], ID: ["atau", "Teh atau kopi, keduanya boleh."] },
  core3000_0030: { VI: ["nói", "Vui lòng nói tên của bạn."], TH: ["พูด; บอก", "กรุณาบอกชื่อของคุณ."], MS: ["mengatakan; berkata", "Sila sebut nama awak."], ID: ["mengatakan; berkata", "Tolong sebutkan namamu."] },
  core3000_0031: { VI: ["đi", "Tôi về nhà sau giờ học."], TH: ["ไป", "ฉันกลับบ้านหลังเลิกเรียน."], MS: ["pergi", "Saya pulang selepas sekolah."], ID: ["pergi", "Saya pulang setelah sekolah."] },
  core3000_0032: { VI: ["vì vậy; nên", "Muộn rồi, nên tôi về nhà."], TH: ["ดังนั้น; เลย", "ดึกแล้วฉันเลยกลับบ้าน."], MS: ["jadi; maka", "Sudah lewat, jadi saya pulang."], ID: ["jadi; maka", "Sudah larut, jadi saya pulang."] },
  core3000_0033: { VI: ["tất cả", "Tất cả học sinh đều ở đây."], TH: ["ทั้งหมด; ทุกคน", "นักเรียนทุกคนอยู่ที่นี่."], MS: ["semua", "Semua pelajar ada di sini."], ID: ["semua", "Semua siswa ada di sini."] },
  core3000_0034: { VI: ["ở đó", "Đặt cái túi ở đó."], TH: ["ที่นั่น; ตรงนั้น", "วางกระเป๋าไว้ตรงนั้น."], MS: ["di sana", "Letakkan beg itu di sana."], ID: ["di sana", "Taruh tas itu di sana."] },
  core3000_0035: { VI: ["biết", "Tôi biết câu trả lời."], TH: ["รู้; รู้จัก", "ฉันรู้คำตอบ."], MS: ["tahu; kenal", "Saya tahu jawapannya."], ID: ["tahu; kenal", "Saya tahu jawabannya."] },
  core3000_0036: { VI: ["nhận; lấy được", "Hôm nay tôi nhận được một quyển sách mới."], TH: ["ได้รับ; ได้มา", "วันนี้ฉันได้หนังสือเล่มใหม่."], MS: ["mendapat; menerima", "Hari ini saya mendapat buku baharu."], ID: ["mendapat; menerima", "Hari ini saya mendapat buku baru."] },
  core3000_0037: { VI: ["nghĩ; cho rằng", "Tôi nghĩ điều này đúng."], TH: ["คิดว่า", "ฉันคิดว่านี่ถูกต้อง."], MS: ["berfikir; rasa", "Saya rasa ini betul."], ID: ["berpikir; merasa", "Saya pikir ini benar."] },
  core3000_0038: { VI: ["làm; chuẩn bị", "Tôi nấu bữa trưa ở nhà."], TH: ["ทำ; สร้าง", "ฉันทำอาหารกลางวันที่บ้าน."], MS: ["membuat; menyediakan", "Saya menyediakan makan tengah hari di rumah."], ID: ["membuat; menyiapkan", "Saya membuat makan siang di rumah."] },
  core3000_0039: { VI: ["thời gian", "Thời gian rất quan trọng."], TH: ["เวลา", "เวลาสำคัญ."], MS: ["masa", "Masa penting."], ID: ["waktu; masa", "Waktu itu penting."] },
  core3000_0040: { VI: ["thấy; nhìn thấy", "Tôi thấy ngôi nhà."], TH: ["เห็น", "ฉันเห็นบ้านหลังนั้น."], MS: ["melihat", "Saya nampak rumah itu."], ID: ["melihat", "Saya melihat rumah itu."] },
  core3000_0041: { VI: ["ra ngoài", "Vui lòng ra ngoài bây giờ."], TH: ["ออกไป; ข้างนอก", "กรุณาออกไปตอนนี้."], MS: ["keluar", "Sila keluar sekarang."], ID: ["keluar", "Silakan keluar sekarang."] },
  core3000_0042: { VI: ["tốt; hay", "Hôm nay là một ngày tốt đẹp."], TH: ["ดี", "วันนี้เป็นวันที่ดี."], MS: ["baik; bagus", "Hari ini hari yang baik."], ID: ["baik; bagus", "Ini hari yang baik."] },
  core3000_0043: { VI: ["mọi người; người ta", "Có nhiều người ở đây."], TH: ["ผู้คน; คน", "มีคนมากมายอยู่ที่นี่."], MS: ["orang ramai", "Ramai orang ada di sini."], ID: ["orang-orang", "Banyak orang ada di sini."] },
  core3000_0044: { VI: ["năm", "Một năm có mười hai tháng."], TH: ["ปี", "หนึ่งปีมีสิบสองเดือน."], MS: ["tahun", "Setahun ada dua belas bulan."], ID: ["tahun", "Satu tahun ada dua belas bulan."] },
  core3000_0045: { VI: ["lấy; mang", "Vui lòng lấy cái túi này."], TH: ["เอา; ถือไป", "กรุณาเอากระเป๋าใบนี้ไป."], MS: ["ambil; bawa", "Sila ambil beg ini."], ID: ["mengambil; membawa", "Tolong ambil tas ini."] },
  core3000_0046: { VI: ["tốt; giỏi", "Cô ấy đọc tốt."], TH: ["ดี; อย่างดี", "เธออ่านได้ดี."], MS: ["dengan baik", "Dia membaca dengan baik."], ID: ["dengan baik", "Dia membaca dengan baik."] },
  core3000_0047: { VI: ["rất", "Căn phòng này rất nhỏ."], TH: ["มาก", "ห้องนี้เล็กมาก."], MS: ["sangat", "Bilik ini sangat kecil."], ID: ["sangat", "Kamar ini sangat kecil."] },
  core3000_0048: { VI: ["chỉ; vừa mới", "Tôi chỉ cần nước."], TH: ["แค่; เพิ่ง", "ฉันแค่ต้องการน้ำ."], MS: ["hanya; baru sahaja", "Saya hanya perlukan air."], ID: ["hanya; baru saja", "Saya hanya butuh air."] },
  core3000_0049: { VI: ["đến", "Vui lòng đến đây."], TH: ["มา", "กรุณามาที่นี่."], MS: ["datang", "Sila datang ke sini."], ID: ["datang", "Silakan datang ke sini."] },
  core3000_0050: { VI: ["làm việc", "Tôi làm việc ở một trường học."], TH: ["ทำงาน", "ฉันทำงานที่โรงเรียน."], MS: ["bekerja", "Saya bekerja di sekolah."], ID: ["bekerja", "Saya bekerja di sekolah."] },
  core3000_0051: { VI: ["dùng; sử dụng", "Tôi dùng điện thoại này mỗi ngày."], TH: ["ใช้", "ฉันใช้โทรศัพท์เครื่องนี้ทุกวัน."], MS: ["menggunakan; guna", "Saya menggunakan telefon ini setiap hari."], ID: ["menggunakan; memakai", "Saya menggunakan ponsel ini setiap hari."] },
  core3000_0052: { VI: ["sau đó; rồi", "Ăn sáng, rồi đi học."], TH: ["แล้ว; จากนั้น", "กินอาหารเช้าแล้วไปโรงเรียน."], MS: ["kemudian; selepas itu", "Bersarapan, kemudian pergi ke sekolah."], ID: ["lalu; kemudian", "Sarapan, lalu pergi ke sekolah."] },
  core3000_0053: { VI: ["cũng", "Tôi cũng nói tiếng Anh."], TH: ["ด้วย; ก็", "ฉันพูดภาษาอังกฤษด้วย."], MS: ["juga", "Saya juga bercakap bahasa Inggeris."], ID: ["juga", "Saya juga berbicara bahasa Inggris."] },
  core3000_0054: { VI: ["chỉ", "Tôi chỉ có một cây bút."], TH: ["แค่; เท่านั้น", "ฉันมีปากกาแค่ด้ามเดียว."], MS: ["hanya", "Saya hanya ada satu pen."], ID: ["hanya", "Saya hanya punya satu pena."] },
  core3000_0055: { VI: ["nhìn; xem", "Nhìn lên bảng đi."], TH: ["มอง; ดู", "ดูที่กระดาน."], MS: ["melihat; pandang", "Lihat papan itu."], ID: ["melihat; lihat", "Lihat papan itu."] },
  core3000_0056: { VI: ["muốn", "Tôi muốn một quyển sách mới."], TH: ["อยาก; ต้องการ", "ฉันอยากได้หนังสือเล่มใหม่."], MS: ["mahu; hendak", "Saya mahu buku baharu."], ID: ["ingin; mau", "Saya ingin buku baru."] },
  core3000_0057: { VI: ["đưa; cho", "Vui lòng đưa cây bút cho tôi."], TH: ["ให้", "กรุณาส่งปากกาให้ฉัน."], MS: ["memberi", "Sila beri saya pen itu."], ID: ["memberi", "Tolong beri saya pena itu."] },
  core3000_0058: { VI: ["đầu tiên; thứ nhất", "Đây là ngày đầu tiên của tôi."], TH: ["แรก; ที่หนึ่ง", "นี่เป็นวันแรกของฉัน."], MS: ["pertama", "Ini hari pertama saya."], ID: ["pertama", "Ini hari pertama saya."] },
  core3000_0059: { VI: ["mới", "Tôi có một chiếc điện thoại mới."], TH: ["ใหม่", "ฉันมีโทรศัพท์เครื่องใหม่."], MS: ["baharu; baru", "Saya ada telefon baharu."], ID: ["baru", "Saya punya ponsel baru."] },
  core3000_0060: { VI: ["cách; đường", "Đây là một cách học tốt."], TH: ["วิธี; ทาง", "นี่เป็นวิธีเรียนที่ดี."], MS: ["cara; jalan", "Ini cara yang baik untuk belajar."], ID: ["cara; jalan", "Ini cara yang baik untuk belajar."] },
  core3000_0061: { VI: ["tìm thấy", "Tôi tìm thấy chìa khóa trên bàn."], TH: ["หาเจอ; พบ", "ฉันเจอกุญแจบนโต๊ะ."], MS: ["menemui; mencari", "Saya menjumpai kunci saya di atas meja."], ID: ["menemukan; mencari", "Saya menemukan kunci saya di atas meja."] },
  core3000_0062: { VI: ["ngày", "Một ngày có thể rất bận."], TH: ["วัน", "วันหนึ่งอาจยุ่งมาก."], MS: ["hari", "Satu hari boleh jadi sangat sibuk."], ID: ["hari", "Satu hari bisa sangat sibuk."] },
  core3000_0063: { VI: ["đồ vật; việc", "Thứ này hữu ích."], TH: ["สิ่งของ; เรื่อง", "สิ่งนี้มีประโยชน์."], MS: ["benda; perkara", "Benda ini berguna."], ID: ["benda; hal", "Benda ini berguna."] },
  core3000_0064: { VI: ["đúng; bên phải", "Câu trả lời của bạn đúng."], TH: ["ถูก; ขวา", "คำตอบของคุณถูก."], MS: ["betul; kanan", "Jawapan awak betul."], ID: ["benar; kanan", "Jawabanmu benar."] },
  core3000_0065: { VI: ["như thế nào", "Tên của bạn đánh vần thế nào?"], TH: ["อย่างไร", "ชื่อของคุณสะกดยังไง."], MS: ["bagaimana", "Bagaimana ejaan nama awak?"], ID: ["bagaimana", "Bagaimana ejaan namamu?"] },
  core3000_0066: { VI: ["trở lại; phía sau", "Vui lòng quay lại sớm."], TH: ["กลับ; หลัง", "กรุณากลับมาเร็วๆ."], MS: ["kembali; belakang", "Sila kembali segera."], ID: ["kembali; belakang", "Tolong segera kembali."] },
  core3000_0067: { VI: ["có nghĩa là", "Từ này có nghĩa là gì?"], TH: ["หมายความว่า", "คำนี้หมายความว่าอะไร."], MS: ["bermaksud", "Apakah maksud perkataan ini?"], ID: ["berarti", "Apa arti kata ini?"] },
  core3000_0068: { VI: ["thậm chí", "Ngay cả một đứa trẻ cũng làm được việc này."], TH: ["แม้แต่", "แม้แต่เด็กก็ทำสิ่งนี้ได้."], MS: ["malah; bahkan", "Malah kanak-kanak pun boleh melakukannya."], ID: ["bahkan", "Bahkan anak kecil bisa melakukannya."] },
  core3000_0069: { VI: ["ở đây", "Vui lòng ngồi ở đây."], TH: ["ที่นี่", "กรุณานั่งตรงนี้."], MS: ["di sini", "Sila duduk di sini."], ID: ["di sini", "Silakan duduk di sini."] },
  core3000_0070: { VI: ["trẻ em; đứa trẻ", "Một đứa trẻ đang chơi bên ngoài."], TH: ["เด็ก", "เด็กคนหนึ่งกำลังเล่นอยู่ข้างนอก."], MS: ["kanak-kanak; anak", "Seorang kanak-kanak sedang bermain di luar."], ID: ["anak", "Seorang anak sedang bermain di luar."] },
  core3000_0071: { VI: ["nói; kể", "Vui lòng cho tôi biết tên của bạn."], TH: ["บอก; เล่า", "กรุณาบอกชื่อของคุณให้ฉันรู้."], MS: ["memberitahu; menceritakan", "Sila beritahu saya nama awak."], ID: ["memberi tahu; menceritakan", "Tolong beri tahu saya namamu."] },
  core3000_0072: { VI: ["thật sự", "Tôi thật sự thích quyển sách này."], TH: ["จริงๆ", "ฉันชอบหนังสือเล่มนี้จริงๆ."], MS: ["betul-betul; benar-benar", "Saya betul-betul suka buku ini."], ID: ["benar-benar", "Saya benar-benar suka buku ini."] },
  core3000_0073: { VI: ["gọi; gọi điện", "Tôi gọi điện cho mẹ mỗi ngày."], TH: ["โทร; เรียก", "ฉันโทรหาแม่ทุกวัน."], MS: ["menelefon; memanggil", "Saya menelefon ibu saya setiap hari."], ID: ["menelepon; memanggil", "Saya menelepon ibu saya setiap hari."] },
  core3000_0074: { VI: ["công ty", "Một công ty bán những chiếc điện thoại này."], TH: ["บริษัท", "บริษัทหนึ่งขายโทรศัพท์เหล่านี้."], MS: ["syarikat", "Sebuah syarikat menjual telefon ini."], ID: ["perusahaan", "Sebuah perusahaan menjual ponsel ini."] },
  core3000_0075: { VI: ["cho xem; trình bày", "Vui lòng cho tôi xem bản đồ."], TH: ["แสดง; ให้ดู", "กรุณาให้ฉันดูแผนที่."], MS: ["menunjukkan", "Sila tunjukkan peta itu kepada saya."], ID: ["menunjukkan", "Tolong tunjukkan peta itu kepada saya."] },
  core3000_0076: { VI: ["cuộc sống; sự sống", "Cuộc sống ở đây khác."], TH: ["ชีวิต", "ชีวิตที่นี่แตกต่าง."], MS: ["kehidupan; nyawa", "Kehidupan di sini berbeza."], ID: ["kehidupan; nyawa", "Kehidupan di sini berbeda."] },
  core3000_0077: { VI: ["người đàn ông", "Một người đàn ông đang đợi bên ngoài."], TH: ["ผู้ชาย", "ผู้ชายคนหนึ่งกำลังรออยู่ข้างนอก."], MS: ["lelaki", "Seorang lelaki sedang menunggu di luar."], ID: ["pria; laki-laki", "Seorang pria sedang menunggu di luar."] },
  core3000_0078: { VI: ["thay đổi", "Kế hoạch thay đổi nhanh chóng."], TH: ["เปลี่ยน", "แผนเปลี่ยนอย่างรวดเร็ว."], MS: ["berubah; menukar", "Rancangan berubah dengan cepat."], ID: ["berubah; mengubah", "Rencana berubah dengan cepat."] },
  core3000_0079: { VI: ["nơi; địa điểm", "Nơi này yên tĩnh."], TH: ["สถานที่; ที่", "ที่นี่เงียบ."], MS: ["tempat", "Tempat ini sunyi."], ID: ["tempat", "Tempat ini tenang."] },
  core3000_0080: { VI: ["dài", "Đây là một con đường dài."], TH: ["ยาว", "นี่เป็นถนนยาว."], MS: ["panjang", "Ini jalan yang panjang."], ID: ["panjang", "Ini jalan yang panjang."] },
  core3000_0081: { VI: ["cảm thấy", "Hôm nay tôi cảm thấy vui."], TH: ["รู้สึก", "วันนี้ฉันรู้สึกมีความสุข."], MS: ["berasa; merasa", "Hari ini saya berasa gembira."], ID: ["merasa", "Hari ini saya merasa senang."] },
  core3000_0082: { VI: ["quá; cũng", "Cái túi này quá nặng."], TH: ["เกินไป; ด้วย", "กระเป๋าใบนี้หนักเกินไป."], MS: ["terlalu; juga", "Beg ini terlalu berat."], ID: ["terlalu; juga", "Tas ini terlalu berat."] },
  core3000_0083: { VI: ["vẫn", "Tôi vẫn sống ở đây."], TH: ["ยัง", "ฉันยังอาศัยอยู่ที่นี่."], MS: ["masih", "Saya masih tinggal di sini."], ID: ["masih", "Saya masih tinggal di sini."] },
  core3000_0084: { VI: ["vấn đề", "Đây là một vấn đề nhỏ."], TH: ["ปัญหา", "นี่เป็นปัญหาเล็กๆ."], MS: ["masalah", "Ini masalah kecil."], ID: ["masalah", "Ini masalah kecil."] },
  core3000_0085: { VI: ["viết", "Vui lòng viết tên của bạn."], TH: ["เขียน", "กรุณาเขียนชื่อของคุณ."], MS: ["menulis", "Sila tulis nama awak."], ID: ["menulis", "Tolong tulis namamu."] },
  core3000_0086: { VI: ["tuyệt vời; lớn", "Đây là một ý tưởng tuyệt vời."], TH: ["ยอดเยี่ยม; ใหญ่", "นี่เป็นความคิดที่ยอดเยี่ยม."], MS: ["hebat; besar", "Ini idea yang hebat."], ID: ["hebat; besar", "Ini ide yang hebat."] },
  core3000_0087: { VI: ["cố gắng; thử", "Tôi cố gắng học mỗi ngày."], TH: ["พยายาม; ลอง", "ฉันพยายามเรียนทุกวัน."], MS: ["mencuba; berusaha", "Saya cuba belajar setiap hari."], ID: ["mencoba; berusaha", "Saya berusaha belajar setiap hari."] },
  core3000_0088: { VI: ["rời đi", "Chúng tôi rời đi lúc tám giờ."], TH: ["ออกไป; จากไป", "เราออกตอนแปดโมง."], MS: ["bertolak; meninggalkan", "Kami bertolak pada pukul lapan."], ID: ["berangkat; meninggalkan", "Kami berangkat pukul delapan."] },
  core3000_0089: { VI: ["con số; số", "Viết con số ở đây."], TH: ["ตัวเลข; หมายเลข", "เขียนตัวเลขตรงนี้."], MS: ["nombor", "Tulis nombor itu di sini."], ID: ["angka; nomor", "Tulis angka itu di sini."] },
  core3000_0090: { VI: ["phần", "Phần này quan trọng."], TH: ["ส่วน", "ส่วนนี้สำคัญ."], MS: ["bahagian", "Bahagian ini penting."], ID: ["bagian", "Bagian ini penting."] },
  core3000_0091: { VI: ["điểm; ý", "Điểm này rõ ràng."], TH: ["จุด; ประเด็น", "ประเด็นนี้ชัดเจน."], MS: ["titik; perkara", "Perkara ini jelas."], ID: ["titik; poin", "Poin ini jelas."] },
  core3000_0092: { VI: ["giúp", "Tôi giúp bạn của tôi."], TH: ["ช่วย", "ฉันช่วยเพื่อนของฉัน."], MS: ["membantu", "Saya membantu kawan saya."], ID: ["membantu", "Saya membantu teman saya."] },
  core3000_0093: { VI: ["hỏi; yêu cầu", "Vui lòng đặt một câu hỏi."], TH: ["ถาม; ขอ", "กรุณาถามคำถามหนึ่งข้อ."], MS: ["bertanya; meminta", "Sila ajukan soalan."], ID: ["bertanya; meminta", "Tolong ajukan pertanyaan."] },
  core3000_0094: { VI: ["gặp", "Chúng tôi gặp nhau ở trường."], TH: ["พบ; เจอ", "เราเจอกันที่โรงเรียน."], MS: ["bertemu", "Kami bertemu di sekolah."], ID: ["bertemu", "Kami bertemu di sekolah."] },
  core3000_0095: { VI: ["bắt đầu", "Các lớp học bắt đầu lúc chín giờ."], TH: ["เริ่ม", "ชั้นเรียนเริ่มตอนเก้าโมง."], MS: ["bermula; memulakan", "Kelas bermula pada pukul sembilan."], ID: ["mulai; memulai", "Kelas mulai pukul sembilan."] },
  core3000_0096: { VI: ["nói chuyện", "Tôi nói chuyện với giáo viên của mình."], TH: ["คุย; พูด", "ฉันคุยกับครูของฉัน."], MS: ["bercakap; berbual", "Saya bercakap dengan guru saya."], ID: ["berbicara; ngobrol", "Saya berbicara dengan guru saya."] },
  core3000_0097: { VI: ["đặt; để", "Đặt quyển sách lên bàn."], TH: ["วาง; ใส่", "วางหนังสือบนโต๊ะ."], MS: ["meletakkan", "Letakkan buku itu di atas meja."], ID: ["meletakkan; menaruh", "Taruh buku itu di atas meja."] },
  core3000_0098: { VI: ["trở thành", "Tôi muốn trở thành giáo viên."], TH: ["กลายเป็น; เป็น", "ฉันอยากเป็นครู."], MS: ["menjadi", "Saya mahu menjadi guru."], ID: ["menjadi", "Saya ingin menjadi guru."] },
  core3000_0099: { VI: ["sự quan tâm; hứng thú", "Cô ấy thể hiện sự quan tâm đến âm nhạc."], TH: ["ความสนใจ", "เธอแสดงความสนใจในดนตรี."], MS: ["minat", "Dia menunjukkan minat terhadap muzik."], ID: ["minat; ketertarikan", "Dia menunjukkan minat pada musik."] },
  core3000_0100: { VI: ["quốc gia; đất nước", "Canada là một quốc gia rộng lớn."], TH: ["ประเทศ", "แคนาดาเป็นประเทศใหญ่."], MS: ["negara", "Kanada ialah negara yang besar."], ID: ["negara", "Kanada adalah negara besar."] },
  core3000_0101: { VI: ["cũ; già", "Đây là một ngôi nhà cũ."], TH: ["เก่า; แก่", "นี่เป็นบ้านเก่า."], MS: ["lama; tua", "Ini rumah lama."], ID: ["lama; tua", "Ini rumah tua."] },
  core3000_0102: { VI: ["trường học", "Có một trường học gần nhà tôi."], TH: ["โรงเรียน", "มีโรงเรียนอยู่ใกล้บ้านฉัน."], MS: ["sekolah", "Ada sekolah berhampiran rumah saya."], ID: ["sekolah", "Ada sekolah di dekat rumah saya."] },
  core3000_0103: { VI: ["muộn; trễ", "Tôi đến lớp muộn."], TH: ["สาย; ช้า", "ฉันไปเรียนสาย."], MS: ["lewat; lambat", "Saya lambat ke kelas."], ID: ["terlambat; telat", "Saya terlambat masuk kelas."] },
  core3000_0104: { VI: ["cao", "Bức tường cao."], TH: ["สูง", "กำแพงสูง."], MS: ["tinggi", "Dinding itu tinggi."], ID: ["tinggi", "Tembok itu tinggi."] },
  core3000_0105: { VI: ["khác; khác nhau", "Hai quyển sách này khác nhau."], TH: ["แตกต่าง", "หนังสือสองเล่มนี้แตกต่างกัน."], MS: ["berbeza", "Dua buku ini berbeza."], ID: ["berbeda", "Dua buku ini berbeda."] },
  core3000_0106: { VI: ["phần cuối; kết thúc", "Phần cuối của câu chuyện buồn."], TH: ["ตอนจบ; จุดจบ", "ตอนจบของเรื่องเศร้า."], MS: ["akhir", "Akhir cerita itu sedih."], ID: ["akhir", "Akhir ceritanya sedih."] },
  core3000_0107: { VI: ["sống; ở", "Tôi sống ở một thị trấn nhỏ."], TH: ["อยู่; มีชีวิต", "ฉันอาศัยอยู่ในเมืองเล็กๆ."], MS: ["tinggal; hidup", "Saya tinggal di pekan kecil."], ID: ["tinggal; hidup", "Saya tinggal di kota kecil."] },
  core3000_0108: { VI: ["tại sao", "Tại sao bạn ở đây?"], TH: ["ทำไม", "ทำไมคุณถึงอยู่ที่นี่ล่ะ."], MS: ["mengapa; kenapa", "Mengapa awak di sini?"], ID: ["mengapa; kenapa", "Mengapa kamu di sini?"] },
  core3000_0109: { VI: ["thế giới", "Mọi người sống khắp thế giới."], TH: ["โลก", "ผู้คนอาศัยอยู่ทั่วโลก."], MS: ["dunia", "Manusia hidup di seluruh dunia."], ID: ["dunia", "Orang hidup di seluruh dunia."] },
  core3000_0110: { VI: ["tuần", "Một tuần có bảy ngày."], TH: ["สัปดาห์", "หนึ่งสัปดาห์มีเจ็ดวัน."], MS: ["minggu", "Seminggu ada tujuh hari."], ID: ["minggu", "Satu minggu ada tujuh hari."] },
  core3000_0111: { VI: ["chơi", "Trẻ em chơi trong công viên."], TH: ["เล่น", "เด็กๆเล่นในสวนสาธารณะ."], MS: ["bermain", "Kanak-kanak bermain di taman."], ID: ["bermain", "Anak-anak bermain di taman."] },
  core3000_0112: { VI: ["nhà; về nhà", "Tôi về nhà sau giờ làm."], TH: ["บ้าน; กลับบ้าน", "ฉันกลับบ้านหลังเลิกงาน."], MS: ["rumah; pulang", "Saya pulang ke rumah selepas kerja."], ID: ["rumah; pulang", "Saya pulang setelah bekerja."] },
  core3000_0113: { VI: ["không bao giờ", "Tôi không bao giờ ăn thịt."], TH: ["ไม่เคย", "ฉันไม่เคยกินเนื้อ."], MS: ["tidak pernah", "Saya tidak pernah makan daging."], ID: ["tidak pernah", "Saya tidak pernah makan daging."] },
  core3000_0114: { VI: ["bao gồm", "Giá này có thể bao gồm bữa sáng."], TH: ["รวม; รวมถึง", "ราคานี้อาจรวมอาหารเช้า."], MS: ["termasuk; memasukkan", "Harga ini mungkin termasuk sarapan."], ID: ["termasuk; mencakup", "Harga ini bisa termasuk sarapan."] },
  core3000_0115: { VI: ["khóa học", "Khóa học này bắt đầu hôm nay."], TH: ["หลักสูตร; คอร์ส", "คอร์สนี้เริ่มวันนี้."], MS: ["kursus", "Kursus ini bermula hari ini."], ID: ["kursus", "Kursus ini mulai hari ini."] },
  core3000_0116: { VI: ["ngôi nhà", "Có một ngôi nhà gần trường."], TH: ["บ้าน", "มีบ้านอยู่ใกล้โรงเรียน."], MS: ["rumah", "Ada rumah berhampiran sekolah."], ID: ["rumah", "Ada rumah di dekat sekolah."] },
  core3000_0117: { VI: ["báo cáo", "Bản báo cáo ngắn."], TH: ["รายงาน", "รายงานสั้น."], MS: ["laporan", "Laporan itu pendek."], ID: ["laporan", "Laporannya pendek."] },
  core3000_0118: { VI: ["nhóm", "Một nhóm học sinh đang đợi."], TH: ["กลุ่ม", "นักเรียนกลุ่มหนึ่งกำลังรอ."], MS: ["kumpulan", "Sekumpulan pelajar sedang menunggu."], ID: ["kelompok; grup", "Sekelompok siswa sedang menunggu."] },
  core3000_0119: { VI: ["trường hợp; vụ việc", "Trường hợp này khác."], TH: ["กรณี", "กรณีนี้แตกต่าง."], MS: ["kes; keadaan", "Kes ini berbeza."], ID: ["kasus; keadaan", "Kasus ini berbeda."] },
  core3000_0120: { VI: ["người phụ nữ", "Một người phụ nữ đang đợi bên ngoài."], TH: ["ผู้หญิง", "ผู้หญิงคนหนึ่งกำลังรออยู่ข้างนอก."], MS: ["wanita; perempuan", "Seorang wanita sedang menunggu di luar."], ID: ["wanita; perempuan", "Seorang wanita sedang menunggu di luar."] },
  core3000_0121: { VI: ["quyển sách", "Quyển sách này mới."], TH: ["หนังสือ", "หนังสือเล่มนี้ใหม่."], MS: ["buku", "Buku ini baharu."], ID: ["buku", "Buku ini baru."] },
  core3000_0122: { VI: ["gia đình", "Gia đình tôi đang ở nhà."], TH: ["ครอบครัว", "ครอบครัวของฉันอยู่บ้าน."], MS: ["keluarga", "Keluarga saya ada di rumah."], ID: ["keluarga", "Keluarga saya ada di rumah."] },
  core3000_0123: { VI: ["có vẻ", "Bạn có vẻ mệt."], TH: ["ดูเหมือน", "คุณดูเหนื่อย."], MS: ["nampak; kelihatan", "Awak nampak letih."], ID: ["tampak; kelihatan", "Kamu tampak lelah."] },
  core3000_0124: { VI: ["để; cho phép", "Để tôi giúp bạn nhé."], TH: ["ให้; อนุญาต", "ให้ฉันช่วยนะ."], MS: ["membiarkan; membenarkan", "Biar saya bantu awak."], ID: ["membiarkan; mengizinkan", "Biarkan saya membantumu."] },
  core3000_0125: { VI: ["lại; lần nữa", "Vui lòng nói lại lần nữa."], TH: ["อีกครั้ง", "กรุณาพูดอีกครั้ง."], MS: ["lagi; sekali lagi", "Sila katakan sekali lagi."], ID: ["lagi; sekali lagi", "Tolong katakan sekali lagi."] },
  core3000_0126: { VI: ["loại", "Loại trà này ngon."], TH: ["ชนิด; ประเภท", "ชาชนิดนี้ดี."], MS: ["jenis", "Teh jenis ini sedap."], ID: ["jenis", "Jenis teh ini enak."] },
  core3000_0127: { VI: ["giữ; để lại", "Để điện thoại của bạn ở đây."], TH: ["เก็บ; ปล่อยไว้", "วางโทรศัพท์ของคุณไว้ที่นี่."], MS: ["menyimpan; membiarkan", "Tinggalkan telefon awak di sini."], ID: ["menyimpan; membiarkan", "Tinggalkan ponselmu di sini."] },
  core3000_0128: { VI: ["nghe thấy", "Tôi nghe thấy nhạc bên ngoài."], TH: ["ได้ยิน", "ฉันได้ยินเสียงเพลงข้างนอก."], MS: ["mendengar", "Saya mendengar muzik di luar."], ID: ["mendengar", "Saya mendengar musik di luar."] },
  core3000_0129: { VI: ["hệ thống", "Hệ thống này đơn giản."], TH: ["ระบบ", "ระบบนี้ง่าย."], MS: ["sistem", "Sistem ini mudah."], ID: ["sistem", "Sistem ini sederhana."] },
  core3000_0130: { VI: ["câu hỏi", "Hãy đặt một câu hỏi ngay bây giờ."], TH: ["คำถาม", "ถามคำถามตอนนี้เลย."], MS: ["soalan", "Tanya satu soalan sekarang."], ID: ["pertanyaan", "Ajukan pertanyaan sekarang."] },
  core3000_0131: { VI: ["luôn luôn", "Cô ấy luôn đến sớm."], TH: ["เสมอ; ตลอด", "เธอมาถึงเช้าเสมอ."], MS: ["selalu", "Dia selalu tiba awal."], ID: ["selalu", "Dia selalu datang lebih awal."] },
  core3000_0132: { VI: ["to; lớn", "Đây là một căn phòng lớn."], TH: ["ใหญ่", "นี่เป็นห้องใหญ่."], MS: ["besar", "Ini bilik yang besar."], ID: ["besar", "Ini kamar yang besar."] },
  core3000_0133: { VI: ["bộ; tập hợp", "Bộ này có sáu chiếc cốc."], TH: ["ชุด", "ชุดนี้มีถ้วยหกใบ."], MS: ["set; kumpulan", "Set ini ada enam cawan."], ID: ["set; kumpulan", "Set ini berisi enam cangkir."] },
  core3000_0134: { VI: ["nhỏ", "Đây là một căn phòng nhỏ."], TH: ["เล็ก", "นี่เป็นห้องเล็ก."], MS: ["kecil", "Ini bilik yang kecil."], ID: ["kecil", "Ini kamar yang kecil."] },
  core3000_0135: { VI: ["học; nghiên cứu", "Tôi học tiếng Anh mỗi ngày."], TH: ["เรียน; ศึกษา", "ฉันเรียนภาษาอังกฤษทุกวัน."], MS: ["belajar; mengkaji", "Saya belajar bahasa Inggeris setiap hari."], ID: ["belajar; mengkaji", "Saya belajar bahasa Inggris setiap hari."] },
  core3000_0136: { VI: ["đi theo; tuân theo", "Vui lòng đi theo giáo viên."], TH: ["ตาม; ปฏิบัติตาม", "กรุณาเดินตามครู."], MS: ["mengikut; mengikuti", "Sila ikut guru itu."], ID: ["mengikuti", "Tolong ikuti guru itu."] },
  core3000_0137: { VI: ["bắt đầu", "Lớp học có thể bắt đầu bây giờ."], TH: ["เริ่ม", "ชั้นเรียนเริ่มได้แล้ว."], MS: ["bermula; memulakan", "Kelas boleh bermula sekarang."], ID: ["mulai; memulai", "Kelas bisa mulai sekarang."] },
  core3000_0138: { VI: ["quan trọng", "Câu hỏi này quan trọng."], TH: ["สำคัญ", "คำถามนี้สำคัญ."], MS: ["penting", "Soalan ini penting."], ID: ["penting", "Pertanyaan ini penting."] },
  core3000_0139: { VI: ["chạy", "Tôi chạy trong công viên."], TH: ["วิ่ง", "ฉันวิ่งในสวนสาธารณะ."], MS: ["berlari", "Saya berlari di taman."], ID: ["berlari", "Saya berlari di taman."] },
  core3000_0140: { VI: ["rẽ; quay", "Rẽ trái khi đến cửa."], TH: ["เลี้ยว; หมุน", "เลี้ยวซ้ายเมื่อถึงประตู."], MS: ["belok; pusing", "Belok kiri apabila sampai di pintu."], ID: ["belok; putar", "Belok kiri saat sampai di pintu."] },
  core3000_0141: { VI: ["mang đến", "Vui lòng mang sách của bạn theo."], TH: ["นำมา; เอามา", "กรุณาเอาหนังสือของคุณมา."], MS: ["membawa ke sini", "Sila bawa buku awak."], ID: ["membawa ke sini", "Tolong bawa bukumu."] },
  core3000_0142: { VI: ["sớm; sớm hơn", "Chúng ta cần bắt đầu sớm."], TH: ["เช้า; แต่เนิ่นๆ", "เราต้องเริ่มแต่เนิ่นๆ."], MS: ["awal", "Kita perlu bermula awal."], ID: ["awal", "Kita perlu mulai lebih awal."] },
  core3000_0143: { VI: ["bàn tay; tay", "Giơ tay lên."], TH: ["มือ", "ยกมือขึ้น."], MS: ["tangan", "Angkat tangan awak."], ID: ["tangan", "Angkat tanganmu."] },
  core3000_0144: { VI: ["bang", "California là một bang lớn."], TH: ["รัฐ", "แคลิฟอร์เนียเป็นรัฐใหญ่."], MS: ["negeri; negara bahagian", "California ialah negeri yang besar."], ID: ["negara bagian", "California adalah negara bagian yang besar."] },
  core3000_0145: { VI: ["di chuyển; chuyển", "Vui lòng chuyển cái ghế sang bên."], TH: ["ขยับ; ย้าย", "กรุณาขยับเก้าอี้."], MS: ["menggerakkan; memindahkan", "Sila alihkan kerusi itu."], ID: ["menggerakkan; memindahkan", "Tolong pindahkan kursi itu."] },
  core3000_0146: { VI: ["tiền", "Tôi cần tiền ăn trưa."], TH: ["เงิน", "ฉันต้องการเงินสำหรับอาหารกลางวัน."], MS: ["wang", "Saya perlukan wang untuk makan tengah hari."], ID: ["uang", "Saya butuh uang untuk makan siang."] },
  core3000_0147: { VI: ["sự thật; dữ kiện", "Sự thật này quan trọng."], TH: ["ข้อเท็จจริง", "ข้อเท็จจริงนี้สำคัญ."], MS: ["fakta", "Fakta ini penting."], ID: ["fakta", "Fakta ini penting."] },
  core3000_0148: { VI: ["tuy nhiên", "Muộn rồi; tuy nhiên, chúng ta có thể đợi."], TH: ["อย่างไรก็ตาม", "ดึกแล้วแต่เรารอได้."], MS: ["namun; walau bagaimanapun", "Sudah lewat, tetapi kita boleh menunggu."], ID: ["namun; bagaimanapun", "Sudah larut, tetapi kita bisa menunggu."] },
  core3000_0149: { VI: ["khu vực", "Khu vực này yên tĩnh."], TH: ["พื้นที่; บริเวณ", "พื้นที่นี้เงียบ."], MS: ["kawasan", "Kawasan ini sunyi."], ID: ["area; wilayah", "Area ini tenang."] },
  core3000_0150: { VI: ["cung cấp", "Trường học có thể cung cấp bữa trưa."], TH: ["จัดหา; ให้", "โรงเรียนสามารถจัดอาหารกลางวันให้ได้."], MS: ["menyediakan", "Sekolah boleh menyediakan makan tengah hari."], ID: ["menyediakan; memberikan", "Sekolah bisa menyediakan makan siang."] },
};

const languages = ["VI", "TH", "MS", "ID"];

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function writeJsonl(filePath, rows) {
  await fs.writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

const sourceRows = await readJsonl(inputPath);
const outputRows = sourceRows.map((row) => {
  const localized = translations[row.core_item_id];
  if (!localized) throw new Error(`Missing VI/TH/MS/ID translation for ${row.core_item_id}.`);
  const out = {
    release_id: releaseId,
    course_id: row.course_id,
    row_id: row.row_id,
    core_item_id: row.core_item_id,
    meaning_id: row.meaning_id,
    source_headword: row.source_headword,
    part_of_speech: row.part_of_speech,
    en_display: row.en_display,
    example_EN: row.example_EN,
    translation_batch: "vi_th_ms_id_v0",
    translation_status: "draft_native_style_qa_v2_checked",
    source_note: "Internal LunaCards draft translation layer; native-style QA v2 checked, final QA and source-assisted checks still required before delivery.",
  };
  for (const language of languages) {
    const [display, example] = localized[language] ?? [];
    out[language] = normalizeText(display);
    out[`example_${language}`] = normalizeText(example);
  }
  return out;
});

await fs.mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `${releaseId}_translation_batch_vi_th_ms_id_v0.jsonl`);
await writeJsonl(outputPath, outputRows);

const summaryPath = path.join(outputDir, `${releaseId}_translation_batch_vi_th_ms_id_v0_summary.md`);
await fs.writeFile(
  summaryPath,
  [
    `# Translation Batch VI/TH/MS/ID v0: ${releaseId}`,
    "",
    `- Rows: ${outputRows.length}`,
    "- Languages: VI, TH, MS, ID",
    "- Fields: display word plus translated example only",
    "- Target-language transcription fields: not generated",
    "- Status: draft_native_style_qa_v2_checked",
    "",
    "This artifact does not import Postgres rows and does not create a Google Sheet.",
    "Function words may use learner-facing glosses where a direct one-word target equivalent is misleading.",
    "Native-style QA v1 and v2 repaired obvious naturalness/copy issues during drafting; final QA evidence is still not created.",
    "",
  ].join("\n"),
  "utf8"
);

console.log(
  `English Core 3000 VI/TH/MS/ID translation batch written: ${path.relative(process.cwd(), outputPath)} rows=${outputRows.length}`
);
