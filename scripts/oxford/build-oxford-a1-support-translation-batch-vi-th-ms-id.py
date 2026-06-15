#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_VERSION = "2026-05-17.v1"
LANGUAGES = ["VI", "TH", "MS", "ID"]
SENTENCE_END_RE = re.compile(r"[.!?。！？]$")
THAI_RE = re.compile(r"[\u0E00-\u0E7F]")


TRANSLATIONS_TSV = """source_headword	VI	example_VI	TH	example_TH	MS	example_MS	ID	example_ID
a, an	mạo từ không xác định	Tôi có một cây bút.	คำนำหน้านามไม่ชี้เฉพาะ	ฉันมีปากกาหนึ่งด้าม.	kata sandang tak tentu	Saya ada sebatang pen.	kata sandang tak tentu	Saya punya sebuah pena.
about	về; khoảng	Chúng tôi nói về thức ăn.	เกี่ยวกับ; ประมาณ	เราคุยเกี่ยวกับอาหาร.	tentang; kira-kira	Kami bercakap tentang makanan.	tentang; sekitar	Kami berbicara tentang makanan.
above	ở trên; phía trên	Đồng hồ ở trên cửa.	เหนือ; ข้างบน	นาฬิกาอยู่เหนือประตู.	di atas	Jam itu di atas pintu.	di atas	Jam itu di atas pintu.
across	ở bên kia	Quán ở bên kia đường.	ฝั่งตรงข้าม; ข้าม	ร้านอยู่ฝั่งตรงข้ามถนน.	di seberang	Kedai itu di seberang jalan.	di seberang	Toko itu di seberang jalan.
action	hành động	Hành động của anh ấy giúp tôi.	การกระทำ	การกระทำของเขาช่วยฉัน.	tindakan	Tindakannya membantu saya.	tindakan	Tindakannya membantu saya.
activity	hoạt động	Bơi là một hoạt động vui.	กิจกรรม	การว่ายน้ำเป็นกิจกรรมที่สนุก.	aktiviti	Berenang ialah aktiviti yang menyeronokkan.	kegiatan; aktivitas	Berenang adalah kegiatan yang menyenangkan.
actor	nam diễn viên	Nam diễn viên ở trong phim.	นักแสดงชาย	นักแสดงชายอยู่ในภาพยนตร์.	pelakon lelaki	Pelakon itu dalam filem.	aktor	Aktor itu ada di film.
actress	nữ diễn viên	Nữ diễn viên mỉm cười với chúng tôi.	นักแสดงหญิง	นักแสดงหญิงยิ้มให้เรา.	pelakon wanita	Pelakon wanita itu tersenyum kepada kami.	aktris	Aktris itu tersenyum kepada kami.
add	thêm	Thêm tên của bạn vào đây.	เพิ่ม	เพิ่มชื่อของคุณที่นี่.	menambah	Tambah nama awak di sini.	menambahkan	Tambahkan namamu di sini.
address	địa chỉ	Địa chỉ của tôi ở trên thẻ này.	ที่อยู่	ที่อยู่ของฉันอยู่บนบัตรนี้.	alamat	Alamat saya ada pada kad ini.	alamat	Alamat saya ada di kartu ini.
adult	người lớn	Một người lớn ngồi gần cửa.	ผู้ใหญ่	ผู้ใหญ่นั่งใกล้ประตู.	orang dewasa	Seorang dewasa duduk dekat pintu.	orang dewasa	Seorang dewasa duduk dekat pintu.
advice	lời khuyên	Lời khuyên của cô ấy đơn giản.	คำแนะนำ	คำแนะนำของเธอง่าย.	nasihat	Nasihatnya mudah.	nasihat; saran	Sarannya sederhana.
afraid	sợ	Đứa trẻ đang sợ.	กลัว	เด็กคนนั้นกลัว.	takut	Kanak-kanak itu takut.	takut	Anak itu takut.
after	sau	Tôi ăn sau giờ học.	หลังจาก	ฉันกินหลังเลิกเรียน.	selepas	Saya makan selepas kelas.	setelah; sesudah	Saya makan setelah kelas.
afternoon	buổi chiều	Tôi học vào buổi chiều.	ตอนบ่าย	ฉันเรียนตอนบ่าย.	petang	Saya belajar pada waktu petang.	sore	Saya belajar pada sore hari.
again	lại; lần nữa	Vui lòng nói lại lần nữa.	อีกครั้ง	กรุณาพูดอีกครั้ง.	lagi; sekali lagi	Sila katakan sekali lagi.	lagi; sekali lagi	Tolong katakan sekali lagi.
age	tuổi	Bạn bao nhiêu tuổi?	อายุ	คุณอายุเท่าไร.	umur	Berapakah umur awak?	usia	Berapa usiamu?
ago	trước	Tôi đến đây hai ngày trước.	ที่แล้ว	ฉันมาที่นี่เมื่อสองวันที่แล้ว.	yang lalu	Saya datang ke sini dua hari yang lalu.	yang lalu	Saya datang ke sini dua hari yang lalu.
agree	đồng ý	Tôi đồng ý với bạn.	เห็นด้วย	ฉันเห็นด้วยกับคุณ.	bersetuju	Saya bersetuju dengan awak.	setuju	Saya setuju denganmu.
air	không khí	Không khí lạnh.	อากาศ	อากาศเย็น.	udara	Udara itu sejuk.	udara	Udaranya dingin.
airport	sân bay	Chúng tôi đang ở sân bay.	สนามบิน	เราอยู่ที่สนามบิน.	lapangan terbang	Kami berada di lapangan terbang.	bandara	Kami berada di bandara.
all	tất cả	Tất cả học sinh đều ở đây.	ทั้งหมด; ทุกคน	นักเรียนทุกคนอยู่ที่นี่.	semua	Semua pelajar ada di sini.	semua	Semua siswa ada di sini.
also	cũng	Tôi cũng thích trà.	ด้วย; ก็	ฉันชอบชาด้วย.	juga	Saya juga suka teh.	juga	Saya juga suka teh.
always	luôn luôn	Cô ấy luôn uống nước.	เสมอ; ตลอด	เธอดื่มน้ำเสมอ.	selalu	Dia selalu minum air.	selalu	Dia selalu minum air.
amazing	tuyệt vời	Khung cảnh thật tuyệt vời.	น่าทึ่ง	วิวนี้น่าทึ่ง.	menakjubkan	Pemandangan itu menakjubkan.	menakjubkan	Pemandangannya menakjubkan.
and	và	Tom và Anna là bạn.	และ	ทอมและแอนนาเป็นเพื่อนกัน.	dan	Tom dan Anna berkawan.	dan	Tom dan Anna berteman.
angry	tức giận	Bây giờ anh ấy đang tức giận.	โกรธ	ตอนนี้เขาโกรธ.	marah	Dia marah sekarang.	marah	Dia sedang marah sekarang.
animal	động vật	Chó là một động vật.	สัตว์	สุนัขเป็นสัตว์.	haiwan	Anjing ialah haiwan.	hewan	Anjing adalah hewan.
another	một cái khác	Tôi muốn một cái cốc khác.	อีกอันหนึ่ง; อีกคนหนึ่ง	ฉันอยากได้แก้วอีกใบ.	satu lagi; yang lain	Saya mahu satu cawan lagi.	satu lagi; yang lain	Saya mau satu cangkir lagi.
answer	câu trả lời	Viết câu trả lời ở đây.	คำตอบ	เขียนคำตอบตรงนี้.	jawapan	Tulis jawapan di sini.	jawaban	Tulis jawaban di sini.
any	bất kỳ; chút nào	Bạn có tiền không?	บ้าง; ใดๆ	คุณมีเงินบ้างไหม.	sebarang; sedikit	Adakah awak ada sedikit wang?	apa pun; sedikit	Apakah kamu punya sedikit uang?
anyone	bất kỳ ai; ai đó	Có ai cần giúp không?	ใครก็ตาม; ใครบางคน	มีใครต้องการความช่วยเหลือไหม.	sesiapa; seseorang	Adakah sesiapa perlukan bantuan?	siapa pun; seseorang	Apakah ada yang perlu bantuan?
anything	bất cứ thứ gì	Tôi không thể thấy gì cả.	อะไรเลย; สิ่งใดๆ	ฉันมองไม่เห็นอะไรเลย.	apa-apa	Saya tidak nampak apa-apa.	apa pun	Saya tidak bisa melihat apa pun.
apartment	căn hộ	Căn hộ của tôi nhỏ.	อะพาร์ตเมนต์	อะพาร์ตเมนต์ของฉันเล็ก.	pangsapuri	Pangsapuri saya kecil.	apartemen	Apartemen saya kecil.
apple	quả táo	Quả táo này màu đỏ.	แอปเปิล	แอปเปิลลูกนี้สีแดง.	epal	Epal ini merah.	apel	Apel ini merah.
April	tháng Tư	Sinh nhật của tôi vào tháng Tư.	เดือนเมษายน	วันเกิดของฉันอยู่ในเดือนเมษายน.	April	Hari lahir saya pada bulan April.	April	Ulang tahun saya pada bulan April.
area	khu vực	Khu vực này yên tĩnh.	พื้นที่; บริเวณ	พื้นที่นี้เงียบ.	kawasan	Kawasan ini sunyi.	wilayah; area	Wilayah ini tenang.
arm	cánh tay	Cánh tay của tôi đau.	แขน	แขนของฉันเจ็บ.	lengan	Lengan saya sakit.	lengan	Lengan saya sakit.
around	xung quanh	Chúng tôi đi bộ quanh công viên.	รอบๆ	เราเดินรอบสวนสาธารณะ.	sekitar; keliling	Kami berjalan di sekitar taman.	sekitar; keliling	Kami berjalan mengelilingi taman.
arrive	đến	Họ đến lúc sáu giờ.	มาถึง	พวกเขามาถึงตอนหกโมง.	tiba	Mereka tiba pada pukul enam.	tiba	Mereka tiba pukul enam.
art	nghệ thuật	Tôi thích nghệ thuật.	ศิลปะ	ฉันชอบศิลปะ.	seni	Saya suka seni.	seni	Saya suka seni.
article	bài báo	Tôi đọc một bài báo trực tuyến.	บทความ	ฉันอ่านบทความออนไลน์.	artikel	Saya membaca artikel dalam talian.	artikel	Saya membaca artikel daring.
artist	nghệ sĩ	Nghệ sĩ vẽ một khuôn mặt.	ศิลปิน	ศิลปินวาดใบหน้า.	seniman	Pelukis itu melukis wajah.	seniman	Seniman itu menggambar wajah.
as	như; với tư cách	Tôi làm việc như một giáo viên.	ในฐานะ; เป็น	ฉันทำงานเป็นครู.	sebagai	Saya bekerja sebagai guru.	sebagai	Saya bekerja sebagai guru.
ask	hỏi; yêu cầu	Hãy hỏi giáo viên bây giờ.	ถาม; ขอ	ถามครูตอนนี้.	bertanya; meminta	Tanya guru sekarang.	bertanya; meminta	Tanyakan kepada guru sekarang.
at	ở; tại	Tôi đang ở nhà.	ที่; ณ	ฉันอยู่ที่บ้าน.	di; pada	Saya berada di rumah.	di; pada	Saya ada di rumah.
August	tháng Tám	Chúng tôi đi du lịch vào tháng Tám.	เดือนสิงหาคม	เราเดินทางในเดือนสิงหาคม.	Ogos	Kami melancong pada bulan Ogos.	Agustus	Kami bepergian pada bulan Agustus.
aunt	cô; dì; bác gái	Dì của tôi sống ở đây.	ป้า; น้า	ป้าของฉันอยู่ที่นี่.	makcik; ibu saudara	Makcik saya tinggal di sini.	bibi; tante	Bibi saya tinggal di sini.
autumn	mùa thu	Lá rơi vào mùa thu.	ฤดูใบไม้ร่วง	ใบไม้ร่วงในฤดูใบไม้ร่วง.	musim luruh	Daun gugur pada musim luruh.	musim gugur	Daun jatuh pada musim gugur.
away	đi xa; rời đi	Xe buýt đi mất.	ออกไป; ไกล	รถบัสออกไปแล้ว.	pergi; jauh	Bas itu pergi.	pergi; jauh	Bus itu pergi.
baby	em bé	Em bé đang ngủ.	ทารก; เด็กอ่อน	ทารกกำลังนอนหลับ.	bayi	Bayi itu sedang tidur.	bayi	Bayi itu sedang tidur.
back	lưng	Lưng của tôi đau.	หลัง	หลังของฉันเจ็บ.	belakang	Bahagian belakang saya sakit.	punggung; belakang	Punggung saya sakit.
bad	xấu; hỏng	Sữa này bị hỏng.	แย่; เสีย	นมนี้เสียแล้ว.	buruk; rosak	Susu ini rosak.	buruk; basi	Susu ini basi.
bag	túi	Túi của bạn ở trên ghế.	กระเป๋า	กระเป๋าของคุณอยู่บนเก้าอี้.	beg	Beg awak di atas kerusi.	tas	Tasmu ada di atas kursi.
ball	quả bóng	Quả bóng ở dưới bàn.	ลูกบอล	ลูกบอลอยู่ใต้โต๊ะ.	bola	Bola itu di bawah meja.	bola	Bola itu di bawah meja.
banana	quả chuối	Tôi ăn một quả chuối.	กล้วย	ฉันกินกล้วยหนึ่งลูก.	pisang	Saya makan sebiji pisang.	pisang	Saya makan pisang.
band	ban nhạc	Ban nhạc chơi nhạc.	วงดนตรี	วงดนตรีเล่นเพลง.	kumpulan muzik	Kumpulan muzik itu bermain muzik.	grup musik	Grup musik itu memainkan musik.
bank (money)	ngân hàng	Ngân hàng mở cửa lúc chín giờ.	ธนาคาร	ธนาคารเปิดตอนเก้าโมง.	bank	Bank dibuka pada pukul sembilan.	bank	Bank buka pukul sembilan.
bath	bồn tắm; việc tắm	Tôi tắm vào buổi tối.	การอาบน้ำ; อ่างอาบน้ำ	ฉันอาบน้ำตอนกลางคืน.	mandi; tab mandi	Saya mandi pada waktu malam.	mandi; bak mandi	Saya mandi pada malam hari.
bathroom	phòng tắm	Phòng tắm sạch.	ห้องน้ำ	ห้องน้ำสะอาด.	bilik mandi	Bilik mandi itu bersih.	kamar mandi	Kamar mandi itu bersih.
be	là; ở	Tôi hạnh phúc.	เป็น; อยู่	ฉันมีความสุข.	menjadi; berada	Saya gembira.	menjadi; berada	Saya bahagia.
beach	bãi biển	Chúng tôi ngồi trên bãi biển.	ชายหาด	เรานั่งบนชายหาด.	pantai	Kami duduk di pantai.	pantai	Kami duduk di pantai.
beautiful	đẹp	Bông hoa đẹp.	สวย	ดอกไม้สวย.	cantik	Bunga itu cantik.	indah; cantik	Bunga itu indah.
because	bởi vì	Tôi ở nhà vì tôi bị ốm.	เพราะ	ฉันอยู่บ้านเพราะฉันป่วย.	kerana	Saya tinggal di rumah kerana saya sakit.	karena	Saya tinggal di rumah karena sakit.
become	trở thành	Trời có thể trở lạnh.	กลายเป็น	อากาศอาจเย็นลง.	menjadi	Cuaca boleh menjadi sejuk.	menjadi	Cuaca bisa menjadi dingin.
bed	giường	Cái giường lớn.	เตียง	เตียงใหญ่.	katil	Katil itu besar.	tempat tidur	Tempat tidurnya besar.
bedroom	phòng ngủ	Phòng ngủ của tôi yên tĩnh.	ห้องนอน	ห้องนอนของฉันเงียบ.	bilik tidur	Bilik tidur saya sunyi.	kamar tidur	Kamar tidur saya tenang.
beer	bia	Anh ấy uống bia với bữa tối.	เบียร์	เขาดื่มเบียร์กับอาหารเย็น.	bir	Dia minum bir semasa makan malam.	bir	Dia minum bir saat makan malam.
before	trước	Rửa tay trước bữa trưa.	ก่อน	ล้างมือก่อนอาหารกลางวัน.	sebelum	Basuh tangan sebelum makan tengah hari.	sebelum	Cuci tangan sebelum makan siang.
begin	bắt đầu	Bắt đầu bài kiểm tra bây giờ.	เริ่ม	เริ่มทำแบบทดสอบตอนนี้.	bermula; memulakan	Mulakan ujian sekarang.	mulai; memulai	Mulailah tes sekarang.
beginning	phần đầu; sự bắt đầu	Phần đầu thì dễ.	จุดเริ่มต้น	ตอนเริ่มต้นง่าย.	permulaan	Permulaan itu mudah.	awal; permulaan	Awalnya mudah.
behind	phía sau	Con mèo ở sau ghế sofa.	ข้างหลัง	แมวอยู่ข้างหลังโซฟา.	di belakang	Kucing itu di belakang sofa.	di belakang	Kucing itu di belakang sofa.
believe	tin	Tôi tin bạn.	เชื่อ	ฉันเชื่อคุณ.	percaya	Saya percaya kepada awak.	percaya	Saya percaya padamu.
below	bên dưới	Tên ở bên dưới bức tranh.	ข้างล่าง; ใต้	ชื่ออยู่ใต้รูปภาพ.	di bawah	Nama itu di bawah gambar.	di bawah	Nama itu di bawah gambar.
best	tốt nhất	Cô ấy là bạn thân nhất của tôi.	ดีที่สุด	เธอเป็นเพื่อนที่ดีที่สุดของฉัน.	terbaik	Dia kawan baik saya.	terbaik	Dia teman terbaik saya.
better	tốt hơn	Hôm nay tôi cảm thấy tốt hơn.	ดีกว่า	วันนี้ฉันรู้สึกดีขึ้น.	lebih baik	Saya rasa lebih baik hari ini.	lebih baik	Saya merasa lebih baik hari ini.
between	ở giữa	Quán cà phê ở giữa hai cửa hàng.	ระหว่าง	คาเฟ่อยู่ระหว่างร้านสองร้าน.	di antara	Kafe itu di antara dua kedai.	di antara	Kafe itu di antara dua toko.
bicycle	xe đạp	Xe đạp của tôi màu xanh dương.	จักรยาน	จักรยานของฉันสีฟ้า.	basikal	Basikal saya berwarna biru.	sepeda	Sepeda saya berwarna biru.
big	to; lớn	Cái hộp này lớn.	ใหญ่	กล่องนี้ใหญ่.	besar	Kotak ini besar.	besar	Kotak ini besar.
bike	xe đạp	Tôi đi xe đạp.	จักรยาน	ฉันขี่จักรยาน.	basikal	Saya menunggang basikal.	sepeda	Saya naik sepeda.
bill	hóa đơn	Hóa đơn ở trên bàn.	ใบเรียกเก็บเงิน	ใบเรียกเก็บเงินอยู่บนโต๊ะ.	bil	Bil itu di atas meja.	tagihan	Tagihan ada di atas meja.
bird	con chim	Một con chim ở trên cây.	นก	มีนกอยู่บนต้นไม้.	burung	Seekor burung ada di pokok.	burung	Seekor burung ada di pohon.
birthday	sinh nhật	Hôm nay là sinh nhật của tôi.	วันเกิด	วันนี้เป็นวันเกิดของฉัน.	hari lahir	Hari ini hari lahir saya.	ulang tahun	Hari ini ulang tahun saya.
black	màu đen	Túi của tôi màu đen.	สีดำ	กระเป๋าของฉันสีดำ.	hitam	Beg saya hitam.	hitam	Tas saya hitam.
blog	bài blog	Cô ấy viết bài blog.	บล็อก	เธอเขียนบล็อก.	blog	Dia menulis blog.	blog	Dia menulis blog.
blonde	tóc vàng	Anh ấy có tóc vàng.	ผมบลอนด์	เขามีผมบลอนด์.	berambut perang	Dia berambut perang.	berambut pirang	Dia berambut pirang.
blue	màu xanh dương	Bầu trời màu xanh dương.	สีฟ้า; สีน้ำเงิน	ท้องฟ้าเป็นสีฟ้า.	biru	Langit berwarna biru.	biru	Langit berwarna biru.
boat	thuyền	Con thuyền ở trên mặt nước.	เรือ	เรืออยู่บนน้ำ.	bot; perahu	Bot itu di atas air.	perahu; kapal kecil	Perahu itu di atas air.
body	cơ thể	Cơ thể tôi mệt.	ร่างกาย	ร่างกายของฉันเหนื่อย.	tubuh	Badan saya letih.	tubuh	Tubuh saya lelah.
book	sách	Tôi đọc một quyển sách.	หนังสือ	ฉันอ่านหนังสือ.	buku	Saya membaca buku.	buku	Saya membaca buku.
boot	ủng	Một chiếc ủng ở dưới giường.	รองเท้าบูต	รองเท้าบูตข้างหนึ่งอยู่ใต้เตียง.	but	Sebelah but berada di bawah katil.	sepatu bot	Satu sepatu bot ada di bawah tempat tidur.
bored	chán	Tôi thấy chán.	เบื่อ	ฉันเบื่อ.	bosan	Saya bosan.	bosan	Saya bosan.
boring	nhàm chán	Bộ phim này nhàm chán.	น่าเบื่อ	หนังเรื่องนี้น่าเบื่อ.	membosankan	Filem ini membosankan.	membosankan	Film ini membosankan.
born	sinh ra	Tôi sinh ra vào tháng Năm.	เกิด	ฉันเกิดในเดือนพฤษภาคม.	dilahirkan	Saya dilahirkan pada bulan Mei.	lahir	Saya lahir pada bulan Mei.
both	cả hai	Cả hai cô gái đều vui.	ทั้งสอง	เด็กผู้หญิงทั้งสองคนมีความสุข.	kedua-duanya	Kedua-dua gadis itu gembira.	keduanya	Kedua gadis itu bahagia.
bottle	chai	Cái chai đầy.	ขวด	ขวดเต็ม.	botol	Botol itu penuh.	botol	Botol itu penuh.
box	hộp	Cái hộp đang mở.	กล่อง	กล่องเปิดอยู่.	kotak	Kotak itu terbuka.	kotak	Kotak itu terbuka.
boy	cậu bé	Cậu bé chạy nhanh.	เด็กผู้ชาย	เด็กผู้ชายวิ่งเร็ว.	budak lelaki	Budak lelaki itu berlari laju.	anak laki-laki	Anak laki-laki itu berlari cepat.
boyfriend	bạn trai	Bạn trai của cô ấy tử tế.	แฟนหนุ่ม	แฟนหนุ่มของเธอใจดี.	teman lelaki	Teman lelakinya baik hati.	pacar laki-laki	Pacar laki-lakinya baik.
bread	bánh mì	Tôi muốn bánh mì.	ขนมปัง	ฉันอยากได้ขนมปัง.	roti	Saya mahu roti.	roti	Saya mau roti.
break	làm vỡ; làm hỏng	Đừng làm vỡ cái cốc.	ทำแตก; ทำเสีย	อย่าทำแก้วแตก.	memecahkan; merosakkan	Jangan pecahkan cawan itu.	memecahkan; merusak	Jangan pecahkan cangkir itu.
breakfast	bữa sáng	Bữa sáng đã sẵn sàng.	อาหารเช้า	อาหารเช้าพร้อมแล้ว.	sarapan	Sarapan sudah siap.	sarapan	Sarapan sudah siap.
bring	mang đến	Hãy mang sách của bạn đến.	นำมา; เอามา	เอาหนังสือของคุณมา.	membawa	Bawa buku awak.	membawa	Bawa bukumu.
brother	anh trai; em trai	Anh trai tôi cao.	พี่ชาย; น้องชาย	พี่ชายของฉันสูง.	abang; adik lelaki	Abang saya tinggi.	saudara laki-laki; kakak laki-laki	Kakak laki-laki saya tinggi.
brown	màu nâu	Con chó màu nâu.	สีน้ำตาล	สุนัขสีน้ำตาล.	coklat	Anjing itu berwarna coklat.	cokelat	Anjing itu berwarna cokelat.
build	xây	Họ xây một ngôi nhà.	สร้าง	พวกเขาสร้างบ้าน.	membina	Mereka membina rumah.	membangun	Mereka membangun rumah.
building	tòa nhà	Tòa nhà này cũ.	อาคาร	อาคารนี้เก่า.	bangunan	Bangunan ini lama.	gedung; bangunan	Bangunan ini tua.
bus	xe buýt	Xe buýt đến muộn.	รถบัส	รถบัสมาสาย.	bas	Bas itu lewat.	bus	Bus itu terlambat.
business	việc kinh doanh	Bố tôi có một doanh nghiệp.	ธุรกิจ	พ่อของฉันมีธุรกิจ.	perniagaan	Ayah saya ada perniagaan.	bisnis	Ayah saya punya bisnis.
busy	bận	Hôm nay tôi bận.	ยุ่ง	วันนี้ฉันยุ่ง.	sibuk	Saya sibuk hari ini.	sibuk	Saya sibuk hari ini.
but	nhưng	Tôi thích trà nhưng không thích cà phê.	แต่	ฉันชอบชาแต่ไม่ชอบกาแฟ.	tetapi	Saya suka teh, tetapi bukan kopi.	tetapi; tapi	Saya suka teh, tetapi tidak suka kopi.
butter	bơ	Phết bơ lên bánh mì.	เนย	ทาเนยบนขนมปัง.	mentega	Sapu mentega pada roti.	mentega	Oleskan mentega pada roti.
buy	mua	Tôi mua sữa.	ซื้อ	ฉันซื้อนม.	membeli	Saya membeli susu.	membeli	Saya membeli susu.
by	bên cạnh; bởi	Ngồi bên cửa sổ.	ข้าง; โดย	นั่งข้างหน้าต่าง.	di sebelah; oleh	Duduk di sebelah tingkap.	di sebelah; oleh	Duduk di sebelah jendela.
bye	tạm biệt	Tạm biệt, hẹn gặp ngày mai.	ลาก่อน	ลาก่อน เจอกันพรุ่งนี้.	selamat tinggal	Selamat tinggal, jumpa esok.	sampai jumpa	Sampai jumpa besok.
cafe	quán cà phê	Chúng tôi gặp nhau ở quán cà phê.	คาเฟ่	เราพบกันที่คาเฟ่.	kafe	Kami berjumpa di kafe.	kafe	Kami bertemu di kafe.
cake	bánh ngọt	Cái bánh ngọt.	เค้ก	เค้กหวาน.	kek	Kek itu manis.	kue	Kuenya manis.
call	gọi; gọi điện	Vui lòng gọi cho tôi.	โทร; เรียก	กรุณาโทรหาฉัน.	menelefon; memanggil	Sila telefon saya.	menelepon; memanggil	Tolong telepon saya.
camera	máy ảnh	Máy ảnh của tôi mới.	กล้องถ่ายรูป	กล้องของฉันใหม่.	kamera	Kamera saya baharu.	kamera	Kamera saya baru.
can1 modal	có thể	Tôi có thể bơi.	สามารถ	ฉันว่ายน้ำได้.	boleh; dapat	Saya boleh berenang.	bisa; dapat	Saya bisa berenang.
cannot	không thể	Hôm nay tôi không thể đến.	ไม่สามารถ	วันนี้ฉันมาไม่ได้.	tidak boleh	Saya tidak boleh datang hari ini.	tidak bisa	Saya tidak bisa datang hari ini.
capital	thủ đô	Paris là một thủ đô.	เมืองหลวง	ปารีสเป็นเมืองหลวง.	ibu negara	Paris ialah ibu negara.	ibu kota	Paris adalah ibu kota.
car	ô tô	Chiếc ô tô màu đỏ.	รถยนต์	รถยนต์สีแดง.	kereta	Kereta itu merah.	mobil	Mobil itu merah.
card	thẻ; thiệp	Tôi có một thiệp sinh nhật.	บัตร; การ์ด	ฉันมีการ์ดวันเกิด.	kad	Saya ada kad hari lahir.	kartu	Saya punya kartu ulang tahun.
career	sự nghiệp	Tôi muốn có sự nghiệp trong nghệ thuật.	อาชีพ; เส้นทางอาชีพ	ฉันอยากมีอาชีพด้านศิลปะ.	kerjaya	Saya mahukan kerjaya dalam seni.	karier	Saya ingin karier di bidang seni.
carrot	cà rốt	Củ cà rốt màu cam.	แครอท	แครอทสีส้ม.	lobak merah	Lobak merah itu berwarna oren.	wortel	Wortel itu berwarna oranye.
carry	mang; xách	Tôi xách túi của mình.	ถือ; แบก	ฉันถือกระเป๋าของฉัน.	membawa	Saya membawa beg saya.	membawa	Saya membawa tas saya.
cat	con mèo	Con mèo đang ngủ.	แมว	แมวนอนหลับ.	kucing	Kucing itu tidur.	kucing	Kucing itu tidur.
CD	đĩa CD	Đĩa CD này có nhạc.	ซีดี	ซีดีแผ่นนี้มีเพลง.	CD	CD ini ada muzik.	CD	CD ini berisi musik.
cent	xu	Một xu rất nhỏ.	เซนต์	หนึ่งเซนต์มีค่าน้อยมาก.	sen	Satu sen sangat kecil.	sen	Satu sen sangat kecil.
centre	trung tâm	Trung tâm thị trấn rất bận rộn.	ศูนย์กลาง; ใจกลาง	ใจกลางเมืองคึกคัก.	pusat	Pusat bandar itu sibuk.	pusat	Pusat kota itu ramai.
century	thế kỷ	Một thế kỷ là một trăm năm.	ศตวรรษ	หนึ่งศตวรรษคือหนึ่งร้อยปี.	abad	Satu abad ialah seratus tahun.	abad	Satu abad adalah seratus tahun.
chair	ghế	Ngồi trên ghế.	เก้าอี้	นั่งบนเก้าอี้.	kerusi	Duduk di atas kerusi.	kursi	Duduk di kursi.
change	thay đổi; thay	Tôi thay quần áo.	เปลี่ยน	ฉันเปลี่ยนเสื้อผ้า.	menukar; berubah	Saya menukar pakaian.	mengganti; berubah	Saya mengganti pakaian.
chart	biểu đồ	Nhìn vào biểu đồ này.	แผนภูมิ	ดูแผนภูมินี้.	carta	Lihat carta ini.	bagan; grafik	Lihat bagan ini.
cheap	rẻ	Chiếc áo này rẻ.	ถูก	เสื้อตัวนี้ราคาถูก.	murah	Baju ini murah.	murah	Kemeja ini murah.
check	kiểm tra	Kiểm tra câu trả lời của bạn.	ตรวจสอบ	ตรวจคำตอบของคุณ.	menyemak; memeriksa	Semak jawapan awak.	memeriksa; mengecek	Periksa jawabanmu.
cheese	phô mai	Tôi thích phô mai.	ชีส	ฉันชอบชีส.	keju	Saya suka keju.	keju	Saya suka keju.
chicken	thịt gà; con gà	Chúng tôi ăn thịt gà vào bữa tối.	ไก่; เนื้อไก่	เรากินไก่เป็นอาหารเย็น.	ayam	Kami makan ayam untuk makan malam.	ayam	Kami makan ayam untuk makan malam.
child	đứa trẻ	Đứa trẻ vui.	เด็ก	เด็กมีความสุข.	kanak-kanak; anak	Kanak-kanak itu gembira.	anak	Anak itu bahagia.
chocolate	sô cô la	Sô cô la ngọt.	ช็อกโกแลต	ช็อกโกแลตหวาน.	coklat	Coklat itu manis.	cokelat	Cokelat itu manis.
choose	chọn	Chọn một câu trả lời.	เลือก	เลือกคำตอบหนึ่งข้อ.	memilih	Pilih satu jawapan.	memilih	Pilih satu jawaban.
cinema	rạp chiếu phim	Chúng tôi đi đến rạp chiếu phim.	โรงภาพยนตร์	เราไปโรงภาพยนตร์.	pawagam	Kami pergi ke pawagam.	bioskop	Kami pergi ke bioskop.
city	thành phố	Thành phố này lớn.	เมือง	เมืองนี้ใหญ่.	bandar	Bandar itu besar.	kota	Kota itu besar.
class	lớp học	 Lớp học bắt đầu lúc chín giờ.	ชั้นเรียน; ห้องเรียน	ชั้นเรียนเริ่มตอนเก้าโมง.	kelas	Kelas bermula pada pukul sembilan.	kelas	Kelas mulai pukul sembilan.
classroom	phòng học	Phòng học yên tĩnh.	ห้องเรียน	ห้องเรียนเงียบ.	bilik darjah	Bilik darjah itu sunyi.	ruang kelas	Ruang kelas itu tenang.
clean	sạch; làm sạch	Căn phòng sạch.	สะอาด; ทำความสะอาด	ห้องสะอาด.	bersih; membersihkan	Bilik itu bersih.	bersih; membersihkan	Ruangan itu bersih.
climb	trèo; leo	Họ leo lên đồi.	ปีน	พวกเขาปีนขึ้นเนิน.	memanjat	Mereka memanjat bukit.	memanjat	Mereka memanjat bukit.
clock	đồng hồ	Đồng hồ ở trên tường.	นาฬิกา	นาฬิกาอยู่บนผนัง.	jam	Jam itu di dinding.	jam	Jam itu di dinding.
close1	đóng	Vui lòng đóng cửa.	ปิด	กรุณาปิดประตู.	menutup	Tutup pintu, sila.	menutup	Tolong tutup pintu.
"""


def normalize_text(value):
    return re.sub(r"\s+", " ", str(value or "").replace("\u00a0", " ")).strip()


def parse_translations():
    rows = [line.split("\t") for line in TRANSLATIONS_TSV.strip().splitlines()]
    header = rows[0]
    expected = ["source_headword"]
    for language in LANGUAGES:
        expected.extend([language, f"example_{language}"])
    if header != expected:
        raise ValueError(f"Unexpected translation header: {header}")
    translations = {}
    for row_number, row in enumerate(rows[1:], start=2):
        if len(row) != len(header):
            raise ValueError(f"Malformed translation row {row_number}: expected {len(header)} cells, got {len(row)}")
        source_headword = normalize_text(row[0])
        if source_headword in translations:
            raise ValueError(f"Duplicate translation row for {source_headword}")
        localized = {}
        for index, language in enumerate(LANGUAGES):
            display = normalize_text(row[1 + index * 2])
            example = normalize_text(row[2 + index * 2])
            localized[language] = [display, example]
        translations[source_headword] = localized
    return translations


TRANSLATIONS = parse_translations()


def read_jsonl(path):
    rows = []
    for index, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as error:
            raise ValueError(f"Invalid JSONL at {path}:{index}: {error}") from error
    return rows


def write_jsonl(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def has_required_script(language, value):
    if language == "TH":
        return bool(THAI_RE.search(value))
    return True


def validate_translation_map(source_rows):
    source_keys = {row["source_headword"] for row in source_rows}
    missing = sorted(source_keys - set(TRANSLATIONS))
    extra = sorted(set(TRANSLATIONS) - source_keys)
    if missing:
        raise ValueError(f"Missing translations for rows: {missing}")
    if extra:
        raise ValueError(f"Translation map has unused rows: {extra}")
    problems = []
    for source_headword, localized in TRANSLATIONS.items():
        for language in LANGUAGES:
            display, example = localized.get(language, ["", ""])
            if not normalize_text(display):
                problems.append(f"{source_headword}/{language}: missing display")
            if not normalize_text(example):
                problems.append(f"{source_headword}/{language}: missing example")
            if not SENTENCE_END_RE.search(example):
                problems.append(f"{source_headword}/{language}: example missing sentence punctuation")
            if not has_required_script(language, display):
                problems.append(f"{source_headword}/{language}: display has no required script")
            if not has_required_script(language, example):
                problems.append(f"{source_headword}/{language}: example has no required script")
    if problems:
        raise ValueError("Translation quality problems:\n" + "\n".join(problems))


def build_row(row, generated_at, batch_id):
    localized = TRANSLATIONS[row["source_headword"]]
    blockers = [
        blocker
        for blocker in row.get("remaining_blockers", [])
        if blocker not in {"support_translation_meaning_check", "support_example_scene_check"}
    ]
    out = {
        "release_id": row["release_id"],
        "course_id": row["course_id"],
        "row_id": row["row_id"],
        "core_item_id": row["core_item_id"],
        "meaning_id": row["meaning_id"],
        "source_candidate_id": row["source_candidate_id"],
        "source_headword": row["source_headword"],
        "reviewed_display_headword": row["reviewed_display_headword"],
        "reviewed_part_of_speech": row["reviewed_part_of_speech"],
        "meaning_note": row["meaning_note"],
        "example_EN": row["example_EN"],
        "support_translation_batch": batch_id,
        "support_translation_status": "draft_native_style_needs_source_assisted_qa",
        "support_example_status": "draft_scene_preserving_needs_source_assisted_qa",
        "source_note": "Internal LunaCards Oxford support-language draft; support aid for English learning, not ordinary polyglot final delivery.",
        "reviewer": f"codex_oxford_a1_support_translation_batch_{batch_id}",
        "reviewed_at": generated_at,
        "generation_ready": False,
        "remaining_blockers": blockers,
    }
    for language in LANGUAGES:
        display, example = localized[language]
        out[language] = normalize_text(display)
        out[f"example_{language}"] = normalize_text(example)
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--pronunciations",
        default="outputs/oxford-vocabulary/pronunciations/oxford_3000_core_a1_part_001_150_v1_en_us_pronunciations_v1.jsonl",
    )
    parser.add_argument("--out-dir", default="outputs/oxford-vocabulary/support-translations")
    parser.add_argument("--batch-id", default="vi_th_ms_id_v1")
    args = parser.parse_args()

    source_path = Path(args.pronunciations)
    source_rows = read_jsonl(source_path)
    if not source_rows:
        raise ValueError("Source pronunciation artifact is empty")
    validate_translation_map(source_rows)

    generated_at = datetime.now(timezone.utc).isoformat()
    rows = [build_row(row, generated_at, args.batch_id) for row in source_rows]
    release_id = source_rows[0]["release_id"]
    output_dir = Path(args.out_dir)
    batch_path = output_dir / f"{release_id}_support_translation_batch_{args.batch_id}.jsonl"
    summary_path = output_dir / f"{release_id}_support_translation_batch_{args.batch_id}_summary.md"
    write_jsonl(batch_path, rows)

    summary = [
        f"# Oxford A1 Support Translation Batch {args.batch_id}: {release_id}",
        "",
        f"- Script version: `{SCRIPT_VERSION}`",
        f"- Source rows: `{source_path}`",
        f"- Rows: {len(rows)}",
        f"- Languages: {', '.join(LANGUAGES)}",
        "- Translation status: `draft_native_style_needs_source_assisted_qa`",
        "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
        "- Script-aware validation: TH Thai script; VI/MS/ID non-empty Latin-native display/example cells",
        "- Target-language transcriptions: not included",
        "- Postgres import: false",
        "- Google Sheet delivery: false",
        "",
        "This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.",
        "",
    ]
    summary_path.write_text("\n".join(summary), encoding="utf-8")
    print(f"Oxford support translation batch built: rows={len(rows)} languages={','.join(LANGUAGES)} path={batch_path}")


if __name__ == "__main__":
    main()
