#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "VI";
const BATCH_ID = "vi_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-vi.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;

const VI_TRANSLATIONS_TSV = `source_headword	VI	example_VI
machine	máy; thiết bị	Cái máy này pha cà phê.
magazine	tạp chí	Cô ấy đọc một tạp chí âm nhạc.
main	chính	Đây là cửa chính.
make	làm; chuẩn bị	Tôi làm bữa trưa ở nhà.
man	người đàn ông	Người đàn ông là giáo viên của tôi.
many	nhiều	Nhiều học sinh ở đây.
map	bản đồ	Hãy nhìn bản đồ.
March	tháng Ba	Sinh nhật của tôi vào tháng Ba.
market	chợ; thị trường	Chúng tôi mua trái cây ở chợ.
married	đã kết hôn	Chị tôi đã kết hôn.
May	tháng Năm	Trường học kết thúc vào tháng Năm.
maybe	có lẽ	Có lẽ trời sẽ mưa.
me	tôi; tôi đây	Làm ơn giúp tôi.
meal	bữa ăn	Bữa ăn này nóng.
mean	có nghĩa là	Biển báo này có nghĩa gì?
meaning	nghĩa; ý nghĩa	Nghĩa là gì?
meat	thịt	Tôi ăn thịt vào bữa tối.
meet	gặp	Chúng tôi gặp nhau sau giờ học.
meeting	cuộc họp	Cuộc họp bắt đầu bây giờ.
member	thành viên	Cô ấy là thành viên câu lạc bộ.
menu	thực đơn	Hãy đọc thực đơn.
message	tin nhắn	Tôi gửi một tin nhắn ngắn.
metre	mét	Đi về phía trước một mét.
midnight	nửa đêm	Tàu rời đi lúc nửa đêm.
mile	dặm	Chúng tôi đi bộ một dặm.
milk	sữa	Tôi uống sữa vào bữa sáng.
million	triệu	Một triệu người sống ở đây.
minute1	phút	Đợi một phút nhé.
miss	nhớ; lỡ	Tôi nhớ ngôi trường cũ.
mistake	lỗi; sai lầm	Câu trả lời này có một lỗi.
model	mô hình; người mẫu	Đây là một mô hình nhỏ.
modern	hiện đại	Nhà bếp hiện đại.
moment	khoảnh khắc; một lát	Đợi một lát nhé.
Monday	thứ Hai	Chúng tôi bắt đầu làm việc vào thứ Hai.
money	tiền	Tôi cần một ít tiền.
month	tháng	Tháng Sáu là một tháng nóng.
more	thêm; nhiều hơn	Tôi cần thêm thời gian.
morning	buổi sáng	Tôi học vào buổi sáng.
most	hầu hết; nhất	Hầu hết học sinh thích âm nhạc.
mother	mẹ	Mẹ tôi làm việc hôm nay.
mountain	núi	Ngọn núi rất cao.
mouse	chuột	Một con chuột ở dưới ghế.
mouth	miệng	Hãy mở miệng ra.
move	di chuyển; chuyển	Di chuyển ghế đến đây.
movie	phim	Chúng tôi xem phim tối nay.
much	nhiều; bao nhiêu	Cái này bao nhiêu tiền?
mum	mẹ	Mẹ ở nhà.
museum	bảo tàng	Bảo tàng mở cửa lúc mười giờ.
music	âm nhạc	Tôi nghe nhạc.
must modal	phải	Bạn phải dừng lại ở đây.
my	của tôi	Đây là sách của tôi.
name	tên; đặt tên	Hãy viết tên của bạn ở đây.
natural	tự nhiên	Nước ép này tự nhiên.
near	gần	Ngân hàng ở gần đây.
need	cần	Tôi cần một cây bút.
negative	phủ định; tiêu cực	Câu trả lời này là phủ định.
neighbour	hàng xóm	Hàng xóm của tôi thân thiện.
never	không bao giờ	Tôi không bao giờ uống cà phê.
new	mới	Điện thoại này mới.
news	tin tức	Tin tức hôm nay tốt.
newspaper	báo	Anh ấy đọc một tờ báo.
next	tiếp theo	Chuyến xe buýt tiếp theo bị muộn.
next to	bên cạnh	Ngồi bên cạnh tôi.
nice	tốt; dễ chịu	Căn phòng dễ chịu.
night	đêm	Tôi ngủ vào ban đêm.
nine	chín	Chín học sinh ở đây.
nineteen	mười chín	Cô ấy mười chín tuổi.
ninety	chín mươi	Ông tôi chín mươi tuổi.
no	không	Không, cảm ơn.
no one	không ai	Không ai ở trong phòng.
nobody	không ai	Không ai ở nhà.
north	phía bắc	Nhà ga ở phía bắc đây.
nose	mũi	Mũi tôi lạnh.
not	không	Tôi không mệt.
note	ghi chú	Hãy viết một ghi chú bây giờ.
nothing	không có gì	Không có gì trong hộp.
November	tháng Mười Một	Khóa học của tôi bắt đầu vào tháng Mười Một.
now	bây giờ	Đến đây ngay bây giờ.
number	số; số hiệu	Hãy viết số ở đây.
nurse	y tá	Y tá rất tử tế.
object	vật; đồ vật	Đặt đồ vật lên bàn.
o’clock	giờ	Lớp học bắt đầu lúc chín giờ.
October	tháng Mười	Chúng tôi đi du lịch vào tháng Mười.
of	của; bằng	Đây là một tách trà.
off	tắt; rời khỏi	Tắt đèn đi.
office	văn phòng	Văn phòng của tôi nhỏ.
often	thường	Tôi thường đi bộ đến trường.
oh	ồ	Ồ, bây giờ tôi hiểu.
OK	được; ổn	Như vậy ổn không?
old	cũ; già	Ngôi nhà này cũ.
on	trên; đang bật	Quyển sách ở trên bàn.
once	một lần	Tôi gọi điện mỗi tuần một lần.
one	một	Tôi có một chị gái.
onion	hành tây	Cắt một củ hành tây.
online	trực tuyến	Tôi học trực tuyến.
only	chỉ	Tôi chỉ có một cái túi.
open	mở; đang mở	Mở cửa sổ nhé.
opinion	ý kiến	Ý kiến của bạn là gì?
opposite	đối diện; ngược lại	Cửa hàng ở đối diện ngân hàng.
or	hoặc	Trà hay cà phê?
orange	cam; màu cam	Quả cam này ngọt.
order	gọi món; đặt hàng	Tôi gọi súp.
other	khác; cái khác	Dùng cánh cửa khác.
our	của chúng ta; của chúng tôi	Đây là lớp học của chúng tôi.
out	ra ngoài	Đi ra ngoài sau bữa trưa.
outside	bên ngoài	Bọn trẻ chơi bên ngoài.
over	trên; qua	Máy bay bay trên thành phố.
own	riêng	Tôi có phòng riêng.
page	trang	Mở trang mười.
paint	sơn; vẽ	Sơn tường màu xanh.
painting	bức tranh; hội họa	Bức tranh này đẹp.
pair	đôi; cặp	Tôi cần một đôi tất.
paper	giấy	Viết lên tờ giấy này.
paragraph	đoạn văn	Đọc đoạn văn đầu tiên.
parent	cha mẹ; phụ huynh	Một phụ huynh đang đợi bên ngoài.
park	đỗ xe; công viên	Chúng tôi đỗ xe gần nhà ga.
part	phần	Phần này dễ.
partner	bạn cùng làm; đối tác	Làm việc với một bạn cùng nhóm.
party	bữa tiệc	Bữa tiệc bắt đầu lúc bảy giờ.
passport	hộ chiếu	Hãy đưa hộ chiếu của bạn.
past	quá; quá khứ	Bây giờ là sáu giờ rưỡi.
pay	trả tiền	Tôi trả bằng thẻ.
pen	bút	Cây bút này màu xanh.
pencil	bút chì	Tôi viết bằng bút chì.
people	người; mọi người	Nhiều người ở đây.
pepper	hạt tiêu	Thêm hạt tiêu vào súp.
perfect	hoàn hảo	Câu trả lời của bạn hoàn hảo.
period	khoảng thời gian; tiết học	Tiết học này ngắn.
person	người	Một người đang đợi.
personal	cá nhân	Đây là điện thoại cá nhân của tôi.
phone	điện thoại	Điện thoại của tôi ở trong túi.
photo	ảnh; hình	Chụp một bức ảnh ở đây.
photograph	bức ảnh; chụp ảnh	Bức ảnh này cũ.
phrase	cụm từ	Lặp lại cụm từ này nhé.
piano	đàn piano	Cô ấy chơi đàn piano.
picture	bức tranh; hình ảnh	Nhìn bức tranh này.
piece	miếng; mảnh	Lấy một miếng bánh.
pig	lợn; heo	Con lợn ở trang trại.
pink	màu hồng	Túi của cô ấy màu hồng.
place	nơi; chỗ	Nơi này yên tĩnh.
plan	kế hoạch	Chúng tôi cần một kế hoạch.
plane	máy bay	Máy bay bị muộn.
plant	cây; trồng	Tưới cây hôm nay.
play	chơi; diễn	Trẻ em chơi trong công viên.
player	người chơi; cầu thủ	Người chơi chạy nhanh.
please	làm ơn; xin	Làm ơn ngồi ở đây.
point	điểm; ý chính	Điểm này quan trọng.
police	cảnh sát	Cảnh sát đang ở bên ngoài.
policeman	nam cảnh sát	Viên cảnh sát giúp chúng tôi.
pool	hồ bơi	Hồ bơi lạnh.
poor	nghèo; tội nghiệp	Đứa trẻ tội nghiệp đang đói.
popular	phổ biến; được yêu thích	Bài hát này được yêu thích.
positive	tích cực; dương	Đây là một kết quả tích cực.
possible	có thể	Hôm nay có thể không?
post	bài đăng; đăng	Tôi đọc bài đăng của cô ấy trực tuyến.
potato	khoai tây	Tôi ăn một củ khoai tây.
pound	bảng Anh	Nó giá một bảng Anh.
practice	sự luyện tập	Luyện tập giúp ích mỗi ngày.
practise	luyện tập	Tôi luyện tập tiếng Anh mỗi ngày.
prefer	thích hơn	Tôi thích trà hơn.
prepare	chuẩn bị	Chuẩn bị túi của bạn tối nay.
present	có mặt; hiện tại	Cô ấy có mặt hôm nay.
pretty	xinh; khá	Khu vườn xinh đẹp.
price	giá	Giá thấp.
probably	có lẽ	Cô ấy có lẽ biết.
problem	vấn đề	Vấn đề này nhỏ.
product	sản phẩm	Sản phẩm này mới.
programme	chương trình	Chương trình bắt đầu bây giờ.
project	dự án	Dự án của chúng tôi đã sẵn sàng.
purple	màu tím	Áo sơ mi màu tím.
put	đặt; để	Đặt quyển sách ở đây.
quarter	một phần tư; mười lăm phút	Bây giờ là hai giờ mười lăm.
question	câu hỏi	Hỏi một câu hỏi.
quick	nhanh	Đây là một bài kiểm tra nhanh.
quickly	nhanh chóng	Hãy đi nhanh lên.
quiet	yên tĩnh	Thư viện yên tĩnh.
quite	khá	Căn phòng này khá nhỏ.
radio	đài; radio	Đài phát thanh rất to.
rain	mưa	Mưa bắt đầu bây giờ.
read	đọc	Đọc câu này.
reader	người đọc	Người đọc thích câu chuyện.
reading	việc đọc	Việc đọc giúp tôi học.
ready	sẵn sàng	Bữa tối đã sẵn sàng.
real	thật; thực	Có một vấn đề thật.
really	thật sự	Tôi thật sự thích bài hát này.
reason	lý do	Nói cho tôi lý do.
red	màu đỏ	Cánh cửa màu đỏ.
relax	thư giãn	Thư giãn sau giờ làm.
remember	nhớ	Nhớ hộ chiếu của bạn.
repeat	lặp lại	Lặp lại câu này nhé.
report	báo cáo	Đọc báo cáo tối nay.
restaurant	nhà hàng	Nhà hàng đông khách.
result	kết quả	Kết quả tốt.
return	trả lại; trở về	Trả sách vào ngày mai.
rice	cơm; gạo	Tôi ăn cơm vào bữa trưa.
rich	giàu	Thành phố này giàu có.
ride	đi; cưỡi	Tôi đi xe đạp.
right	phải; đúng	Rẽ phải ở đây.
river	sông	Con sông rộng.
road	đường	Con đường này dài.
room	phòng	Phòng của tôi sạch.
routine	thói quen; lịch trình	Thói quen của tôi bắt đầu sớm.
rule	quy tắc	Quy tắc này đơn giản.
run	chạy	Tôi chạy mỗi buổi sáng.
sad	buồn	Hôm nay anh ấy buồn.
salad	sa lát	Món sa lát này tươi.
salt	muối	Thêm một ít muối.
same	cùng; giống nhau	Chúng tôi có cùng một cái túi.
sandwich	bánh sandwich	Tôi ăn một chiếc bánh sandwich.
Saturday	thứ Bảy	Chúng tôi gặp nhau vào thứ Bảy.
say	nói	Nói tên của bạn đi.
school	trường	Trường của tôi ở gần đây.
science	khoa học	Tôi học khoa học.
scientist	nhà khoa học	Nhà khoa học hỏi một câu hỏi.
sea	biển	Biển màu xanh.
second1 (unit of time)	giây	Đợi một giây.
section	phần; mục	Đọc phần này.
see	thấy; gặp	Tôi thấy bạn tôi.
sell	bán	Họ bán trái cây tươi.
send	gửi	Gửi tin nhắn bây giờ.
sentence	câu	Viết một câu.
September	tháng Chín	Trường học bắt đầu vào tháng Chín.
seven	bảy	Bảy người ở đây.
seventeen	mười bảy	Anh ấy mười bảy tuổi.
seventy	bảy mươi	Bà tôi bảy mươi tuổi.
share	chia sẻ; chia	Chia chiếc bánh.
she	cô ấy	Cô ấy là chị tôi.
sheep	cừu	Con cừu ăn cỏ.
shirt	áo sơ mi	Áo sơ mi của anh ấy sạch.
shoe	giày	Một chiếc giày ở dưới giường.
shop	cửa hàng; mua sắm	Cửa hàng đóng cửa sớm.
shopping	mua sắm	Hôm nay mua sắm vui.
short	ngắn	Câu chuyện này ngắn.
should modal	nên	Bạn nên nghỉ hôm nay.
show	cho xem; chương trình	Cho tôi xem vé của bạn.
shower	vòi sen; tắm	Tôi tắm vòi sen.
sick	ốm; bệnh	Hôm nay tôi thấy ốm.
similar	tương tự	Túi của chúng tôi tương tự.
sing	hát	Tôi hát trong lớp.
singer	ca sĩ	Ca sĩ đó nổi tiếng.
sister	chị; em gái	Em gái tôi còn trẻ.
sit	ngồi	Ngồi gần cửa sổ.
situation	tình huống	Tình huống này mới.
six	sáu	Sáu quyển sách ở đây.
sixteen	mười sáu	Cô ấy mười sáu tuổi.
sixty	sáu mươi	Bố tôi sáu mươi tuổi.
skill	kỹ năng	Kỹ năng này hữu ích.
skirt	váy	Chiếc váy của cô ấy màu xanh.
sleep	ngủ	Tôi ngủ tám giờ.
slow	chậm	Xe buýt chậm.
small	nhỏ	Căn phòng nhỏ.
snake	rắn	Con rắn dài.
snow	tuyết	Tuyết rơi vào mùa đông.
so	vì vậy; nên	Tôi mệt, nên tôi nghỉ.
some	một vài; một ít	Tôi cần một ít nước.
somebody	ai đó	Ai đó ở cửa.
someone	ai đó	Ai đó để lại tin nhắn.
something	điều gì đó; cái gì đó	Tôi cần cái gì đó để uống.
sometimes	thỉnh thoảng	Tôi thỉnh thoảng đi bộ đến trường.
son	con trai	Con trai cô ấy ở trường.
song	bài hát	Bài hát này mới.
soon	sớm	Hẹn gặp lại sớm.
sorry	xin lỗi	Tôi xin lỗi.
sound	âm thanh	Âm thanh to.
soup	súp	Món súp nóng.
south	phía nam	Khách sạn ở phía nam đây.
space	không gian; chỗ	Có chỗ cho một chiếc ghế.
speak	nói	Hãy nói chậm.
special	đặc biệt	Hôm nay là một ngày đặc biệt.
spell	đánh vần	Đánh vần tên của bạn.
spelling	chính tả	Kiểm tra chính tả của bạn.
spend	tiêu; dành	Tôi tiêu tiền cho đồ ăn.
sport	thể thao	Bóng đá là một môn thể thao phổ biến.
spring	mùa xuân; nhảy	Hoa mọc vào mùa xuân.
stand	đứng	Đứng gần cửa.
star	ngôi sao	Tôi thấy một ngôi sao sáng.
start	bắt đầu	Bắt đầu bài học bây giờ.
statement	câu nói; tuyên bố	Câu nói này đúng.
station	nhà ga; trạm	Nhà ga ở gần.
stay	ở lại	Ở nhà hôm nay.
still	vẫn	Tôi vẫn đói.
stop	dừng lại; trạm dừng	Dừng ở góc đường.
story	câu chuyện	Kể cho tôi một câu chuyện.
street	đường phố	Con phố này yên tĩnh.
strong	mạnh	Anh ấy mạnh.
student	học sinh; sinh viên	Học sinh đọc một quyển sách.
study	học; nghiên cứu	Tôi học tiếng Anh.
style	phong cách	Tôi thích phong cách này.
subject	môn học; chủ đề	Tiếng Anh là môn chính của tôi.
success	thành công	Thành công cần luyện tập.
sugar	đường	Cho đường vào trà.
summer	mùa hè	Mùa hè ở đây nóng.
sun	mặt trời	Mặt trời sáng.
Sunday	chủ nhật	Chúng tôi nghỉ vào Chủ nhật.
supermarket	siêu thị	Siêu thị đang mở cửa.
sure	chắc chắn	Tôi chắc chắn.
sweater	áo len	Áo len của tôi ấm.
swim	bơi	Tôi bơi mỗi tuần.
swimming	môn bơi; việc bơi	Bơi là bài tập tốt.
table	bàn	Chìa khóa ở trên bàn.`;

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
      throw new Error(`Vietnamese example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Vietnamese translation row for ${sourceHeadword}`);
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
    "Generate TH support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after TH.",
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
    throw new Error("Usage: node scripts/oxford/build-oxford-part003-support-translation-batch-vi.mjs --contract=<contract.json>");
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const outputPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_vi_v1.jsonl";
  const summaryPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_vi_v1_summary.md";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== "oxford_3000_core_a1_part_003_300_v1") {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(VI_TRANSLATIONS_TSV);

  if (rows.length !== 300) {
    throw new Error(`Expected 300 Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Vietnamese translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Vietnamese translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Vietnamese
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
