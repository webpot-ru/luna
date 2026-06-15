#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "VI";
const BATCH_ID = "vi_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-vi.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;
const LATIN_RE = /[A-Za-zÀ-ỹĐđ]/u;
const VI_MARK_RE = /[À-ỹĐđ]/u;

const VI_TRANSLATIONS_TSV = `source_headword	VI	example_VI
clothes	quần áo	Quần áo của tôi sạch.
club	câu lạc bộ	Cô ấy đến câu lạc bộ âm nhạc.
coat	áo khoác	Áo khoác của tôi ấm.
coffee	cà phê	Tôi uống cà phê vào buổi sáng.
cold	lạnh; cái lạnh	Nước lạnh.
college	trường đại học; cao đẳng	Chị tôi học ở trường đại học.
colour	màu sắc	Màu yêu thích của tôi là xanh dương.
come	đến	Hãy đến đây.
common	phổ biến	Tên này phổ biến.
company	công ty	Mẹ tôi làm việc cho một công ty.
compare	so sánh	Hãy so sánh hai bức tranh này.
complete	hoàn chỉnh; hoàn thành	Mẫu đơn đã hoàn chỉnh.
computer	máy tính	Máy tính này mới.
concert	buổi hòa nhạc	Tối nay chúng tôi đi xem hòa nhạc.
conversation	cuộc trò chuyện	Chúng tôi đã có một cuộc trò chuyện ngắn.
cook	nấu ăn; đầu bếp	Tôi nấu bữa tối ở nhà.
cooking	việc nấu ăn	Tôi thích nấu ăn với bố.
cool	mát; ngầu	Căn phòng mát.
correct	đúng; sửa	Câu trả lời của bạn đúng.
cost	chi phí; tốn	Việc này tốn bao nhiêu?
could modal	có thể	Tôi có thể giúp bạn.
country	quốc gia	Canada là một quốc gia lớn.
course	khóa học	Tôi đang học một khóa tiếng Anh.
cousin	anh chị em họ	Anh họ tôi sống gần đây.
cow	con bò	Con bò ăn cỏ.
cream	kem; kem sữa	Tôi cho kem vào cà phê.
create	tạo ra	Họ tạo ra một trò chơi mới.
culture	văn hóa	Chúng tôi học văn hóa địa phương.
cup	cốc; tách	Cái cốc này trống.
customer	khách hàng	Khách hàng hỏi một câu.
cut	cắt	Hãy cắt quả táo làm đôi.
dad	bố	Bố đang làm việc.
dance	nhảy; điệu nhảy	Chúng tôi nhảy sau bữa tối.
dancer	vũ công	Vũ công di chuyển nhanh.
dancing	việc nhảy múa	Nhảy múa rất vui.
dangerous	nguy hiểm	Con đường này nguy hiểm.
dark	tối; sẫm màu	Căn phòng tối.
date	ngày tháng	Hôm nay là ngày mấy?
daughter	con gái	Con gái của cô ấy sáu tuổi.
day	ngày	Chúc bạn một ngày tốt lành.
dear	thân mến	Bạn thân mến, cảm ơn bạn.
December	tháng Mười Hai	Sinh nhật của tôi vào tháng Mười Hai.
decide	quyết định	Hãy quyết định ngay.
delicious	ngon; thơm ngon	Món súp này ngon.
describe	miêu tả	Hãy miêu tả căn phòng của bạn.
description	sự miêu tả	Hãy đọc phần miêu tả ngắn.
design	thiết kế	Tôi làm một thiết kế đơn giản cho thẻ.
desk	bàn học	Quyển sách ở trên bàn học của tôi.
detail	chi tiết	Còn thiếu một chi tiết.
dialogue	đoạn hội thoại	Hãy đọc đoạn hội thoại này ngay.
dictionary	từ điển	Hãy dùng từ điển trong lớp.
die	chết	Hoa chết khi không có nước.
diet	chế độ ăn	Chế độ ăn của tôi có trái cây.
difference	sự khác biệt	Có một sự khác biệt.
different	khác nhau	Chúng tôi có tên khác nhau.
difficult	khó	Câu hỏi này khó.
dinner	bữa tối	Bữa tối đã sẵn sàng.
dirty	bẩn	Giày của tôi bẩn.
discuss	thảo luận	Chúng tôi thảo luận về kế hoạch.
dish	cái đĩa; món ăn	Cái đĩa này nóng.
do1	làm	Bạn đang làm gì?
doctor	bác sĩ	Bác sĩ bận.
dog	con chó	Con chó chạy bên ngoài.
dollar	đô la	Cái này giá một đô la.
door	cửa	Hãy đóng cửa lại.
down	xuống; ở dưới	Hãy ngồi xuống đây.
downstairs	ở tầng dưới; xuống tầng dưới	Bếp ở tầng dưới.
draw	vẽ	Hãy vẽ một ngôi nhà nhỏ.
dress	váy; mặc quần áo	Cô ấy mặc một chiếc váy đỏ.
drink	đồ uống; uống	Tôi uống nước.
drive	lái xe	Tôi lái xe đi làm.
driver	tài xế	Tài xế dừng ở đây.
during	trong suốt	Tôi ngủ trong suốt chuyến bay.
DVD	đĩa DVD	Đĩa DVD này cũ.
each	mỗi	Mỗi đứa trẻ có một quyển sách.
ear	tai; cái tai	Tai tôi đau.
early	sớm	Tôi dậy sớm.
east	phía đông	Mặt trời mọc ở phía đông.
easy	dễ	Bài kiểm tra này dễ.
eat	ăn	Chúng tôi ăn trưa cùng nhau.
egg	trứng	Tôi ăn một quả trứng.
eight	tám	Tôi có tám tấm thẻ.
eighteen	mười tám	Cô ấy mười tám tuổi.
eighty	tám mươi	Ông tôi tám mươi tuổi.
elephant	con voi; loài voi	Con voi lớn.
eleven	mười một	Lớp học bắt đầu lúc mười một giờ.
else	khác; nữa	Bạn cần gì nữa?
email	email; thư điện tử	Hãy gửi email cho tôi.
end	kết thúc	Đây là phần kết thúc.
enjoy	thưởng thức; thích	Tôi thích bài hát này.
enough	đủ	Chúng tôi có đủ thời gian.
euro	đồng euro	Cái này giá một euro.
even	thậm chí	Thậm chí em trai tôi cũng biết.
evening	buổi tối	Hẹn gặp bạn tối nay.
event	sự kiện	Sự kiện bắt đầu hôm nay.
ever	đã từng	Bạn đã từng nấu ăn chưa?
every	mỗi	Tôi học mỗi ngày.
everybody	mọi người	Mọi người đều ở đây.
everyone	mọi người	Mọi người đều thích âm nhạc.
everything	mọi thứ	Mọi thứ đã sẵn sàng.
exam	kỳ thi	Kỳ thi sắp bắt đầu.
example	ví dụ	Đây là một ví dụ tốt.
excited	hào hứng	Hôm nay tôi hào hứng.
exciting	thú vị	Trận đấu này thú vị.
exercise	bài tập; tập thể dục	Tôi tập thể dục trước bữa sáng.
expensive	đắt	Chiếc áo khoác này đắt.
explain	giải thích	Hãy giải thích từ này.
extra	thêm; phụ	Tôi cần thêm thời gian.
eye	mắt	Mắt tôi đỏ.
face	khuôn mặt	Hãy rửa mặt.
fact	sự thật	Sự thật này quan trọng.
fall	rơi; mùa thu	Lá rơi vào mùa thu.
false	sai; giả	Câu trả lời này sai.
family	gia đình	Gia đình tôi nhỏ.
famous	nổi tiếng	Cô ấy là một ca sĩ nổi tiếng.
fantastic	tuyệt vời	Buổi hòa nhạc thật tuyệt vời.
far	xa; xa xôi	Trường học ở xa.
farm	nông trại	Họ sống ở một nông trại.
farmer	nông dân	Nông dân trồng thức ăn.
fast	nhanh; mau lẹ	Tàu này nhanh.
fat	béo	Con mèo đó béo.
father	cha; bố	Bố tôi cao.
favourite	yêu thích	Đây là bài hát yêu thích của tôi.
February	tháng Hai	Ở đây tháng Hai lạnh.
feel	cảm thấy	Tôi cảm thấy vui.
feeling	cảm giác	Tôi hiểu cảm giác đó.
festival	lễ hội	Lễ hội bắt đầu ngày mai.
few	một vài; ít	Ở đây có ít học sinh.
fifteen	mười lăm	Tôi mười lăm tuổi.
fifth	thứ năm	Đây là bài học thứ năm.
fifty	năm mươi	Mẹ tôi năm mươi tuổi.
fill	đổ đầy; điền	Hãy đổ đầy nước vào cốc.
film	phim; bộ phim	Chúng tôi xem một bộ phim.
final	cuối cùng	Đây là câu hỏi cuối cùng.
find	tìm thấy	Tôi tìm thấy chìa khóa.
fine	ổn; tốt	Bây giờ tôi ổn.
finish	kết thúc; hoàn thành	Hãy hoàn thành bài tập về nhà.
fire	lửa; đám cháy	Lửa nóng.
first	thứ nhất; đầu tiên	Cô ấy đứng đầu hàng.
fish	cá	Tôi ăn cá vào bữa tối.
five	năm	Tôi có năm quyển sách.
flat	căn hộ	Căn hộ của tôi nhỏ.
flight	chuyến bay	Chuyến bay bị trễ.
floor	sàn; tầng	Cái túi ở trên sàn.
flower	bông hoa	Bông hoa này màu vàng.
fly	bay; bay lên	Chim bay trên trời.
follow	theo; đi theo	Hãy đi theo tôi.
food	thức ăn	Thức ăn đã sẵn sàng.
foot	bàn chân	Bàn chân tôi đau.
football	bóng đá	Hôm nay chúng tôi chơi bóng đá.
for	cho; vì	Món quà này dành cho bạn.
forget	quên	Đừng quên chìa khóa.
form	mẫu đơn; hình thức	Hãy điền mẫu đơn.
forty	bốn mươi	Bố tôi bốn mươi tuổi.
four	bốn	Tôi thấy bốn con chim.
fourteen	mười bốn	Cô ấy mười bốn tuổi.
fourth	thứ tư	Đây là tầng thứ tư.
free	miễn phí; tự do	Vé này miễn phí.
Friday	thứ Sáu	Hẹn gặp bạn vào thứ Sáu.
friend	bạn	Bạn tôi ở đây.
friendly	thân thiện	Giáo viên rất thân thiện.
from	từ; đến từ	Tôi đến từ đây.
front	phía trước	Nó ở phía trước.
fruit	trái cây	Tôi ăn trái cây mỗi ngày.
full	đầy; no	Chai đầy.
fun	niềm vui; vui	Trò chơi này vui.
funny	hài hước; buồn cười	Bộ phim này buồn cười.
future	tương lai	Hãy nghĩ về tương lai của bạn.
game	trò chơi; trận đấu	Trò chơi bắt đầu bây giờ.
garden	khu vườn	Khu vườn đẹp.
geography	địa lý	Tôi học địa lý ở trường.
get	nhận; đến	Tôi về đến nhà lúc sáu giờ.
girl	cô gái	Cô gái mỉm cười.
girlfriend	bạn gái	Bạn gái của anh ấy thân thiện.
give	đưa; cho	Hãy đưa quyển sách cho tôi.
glass	cốc thủy tinh; kính	Tôi uống nước bằng cốc thủy tinh.
go	đi	Bây giờ chúng tôi về nhà.
good	tốt	Cà phê này ngon.
goodbye	tạm biệt	Tạm biệt, hẹn gặp ngày mai.
grandfather	ông	Ông tôi đã lớn tuổi.
grandmother	bà	Bà tôi nấu súp.
grandparent	ông bà	Một người ông bà của tôi sống cùng chúng tôi.
great	tuyệt; lớn	Đó là một ý tưởng tuyệt vời.
green	xanh lá cây	Cánh cửa màu xanh lá cây.
grey	màu xám	Bầu trời màu xám.
group	nhóm	Hãy làm việc trong một nhóm nhỏ.
grow	lớn lên; trồng	Cây lớn lên trong vườn.
guess	đoán	Hãy đoán câu trả lời.
guitar	đàn ghi-ta	Anh ấy chơi đàn ghi-ta.
gym	phòng gym; phòng tập	Tôi đi đến phòng gym.
hair	tóc	Cô ấy có mái tóc dài.
half	một nửa	Hãy cắt bánh làm đôi.
hand	bàn tay	Hãy giơ tay lên.
happen	xảy ra	Điều gì xảy ra tiếp theo?
happy	vui; hạnh phúc	Hôm nay tôi vui.
hard	cứng; khó	Cái ghế này cứng.
hat	mũ	Mũ của tôi màu đen.
hate	ghét	Tôi ghét trà lạnh.
have	có	Tôi có một chiếc xe.
have to modal	phải	Tôi phải học.
he	anh ấy; ông ấy	Anh ấy là anh trai tôi.
head	đầu	Đầu tôi đau.
health	sức khỏe	Thức ăn tốt giúp sức khỏe.
healthy	lành mạnh	Món ăn này lành mạnh.
hear	nghe; nghe thấy	Tôi nghe thấy âm nhạc.
hello	xin chào	Xin chào, rất vui được gặp bạn.
help	giúp; sự giúp đỡ	Hãy giúp tôi.
her	của cô ấy; cô ấy	Đây là túi của cô ấy.
here	ở đây	Hãy đến đây ngay.
hey	này; chào	Này, đợi tôi với.
hi	chào	Chào, bạn khỏe không?
high	cao; cao lớn	Bức tường cao.
him	anh ấy; ông ấy	Tôi biết anh ấy.
his	của anh ấy	Áo khoác của anh ấy màu xanh dương.
history	lịch sử	Tôi học lịch sử.
hobby	sở thích	Đọc sách là sở thích của tôi.
holiday	kỳ nghỉ	Chúng tôi đi nghỉ vào tháng Bảy.
home	nhà; về nhà	Tôi ở nhà.
homework	bài tập về nhà	Hãy làm bài tập về nhà tối nay.
hope	hy vọng	Tôi hy vọng bạn đến.
horse	con ngựa	Con ngựa chạy nhanh.
hospital	bệnh viện	Bệnh viện ở gần đây.
hot	nóng	Súp nóng.
hotel	khách sạn	Khách sạn sạch.
hour	giờ	Hãy đợi một giờ.
house	ngôi nhà	Ngôi nhà này cũ.
how	như thế nào	Bạn khỏe không?
however	tuy nhiên	Tuy nhiên, tôi có thể ở đây.
hundred	một trăm	Một trăm người đã đến.
hungry	đói	Tôi đói.
husband	chồng	Chồng của cô ấy là bác sĩ.
I	tôi	Tôi thích trà.
ice	đá	Đá lạnh.
ice cream	kem; kem lạnh	Tôi muốn một cây kem.
idea	ý tưởng	Đó là một ý tưởng hay.
if	nếu	Hãy gọi tôi nếu bạn cần giúp đỡ.
imagine	tưởng tượng	Hãy tưởng tượng một ngôi nhà nhỏ.
important	quan trọng	Lớp học này quan trọng.
improve	cải thiện	Tôi muốn cải thiện.
in	trong; ở	Chìa khóa ở trong túi của tôi.
include	bao gồm	Hãy ghi cả tên của bạn.
information	thông tin	Tôi cần thêm thông tin.
interest	sự quan tâm; sở thích	Cô ấy quan tâm đến nghệ thuật.
interested	quan tâm; thích thú	Tôi quan tâm đến âm nhạc.
interesting	thú vị	Quyển sách này thú vị.
internet	internet; mạng internet	Mạng internet chậm.
interview	cuộc phỏng vấn	Hôm nay tôi có một cuộc phỏng vấn.
into	vào; vào trong	Hãy bỏ sách vào túi.
introduce	giới thiệu	Hãy giới thiệu bạn của bạn.
island	hòn đảo	Hòn đảo này nhỏ.
it	nó	Trời lạnh.
its	của nó	Con chó thích giường của nó.
jacket	áo khoác nhẹ	Áo khoác của tôi mới.
January	tháng Một	Tháng Một là tháng đầu tiên.
jeans	quần jean	Quần jean của tôi màu xanh dương.
job	công việc	Tôi cần một công việc mới.
join	tham gia; gia nhập	Hãy tham gia lớp của chúng tôi hôm nay.
journey	chuyến đi	Chuyến đi dài.
juice	nước ép	Tôi uống nước ép cam.
July	tháng Bảy	Chúng tôi đi du lịch vào tháng Bảy.
June	tháng Sáu	Trường học kết thúc vào tháng Sáu.
just	chỉ; vừa	Tôi chỉ cần nước.
keep	giữ; cất	Hãy giữ chìa khóa này.
key	chìa khóa	Tôi làm mất chìa khóa.
kilometre	ki-lô-mét	Hãy đi bộ một ki-lô-mét.
kind (type)	loại	Bạn thích loại nhạc nào?
kitchen	nhà bếp	Nhà bếp sạch.
know	biết	Tôi biết câu trả lời.
land	đất liền; đất	Máy bay ở trên mặt đất.
language	ngôn ngữ	Tiếng Anh là một ngôn ngữ.
large	lớn	Căn phòng này lớn.
last1 (final)	cuối cùng	Đây là trang cuối cùng.
late	muộn	Xe buýt đến muộn.
later	sau; sau này	Hẹn gặp bạn sau.
laugh	cười	Chúng tôi cười cùng nhau.
learn	học	Tôi học tiếng Anh.
leave	rời đi; để lại	Bây giờ tôi rời khỏi nhà.
left	trái; bên trái	Hãy rẽ trái ở đây.
leg	chân	Chân tôi đau.
lesson	bài học; tiết học	Tiết học bắt đầu bây giờ.
let	để; cho phép	Hãy để tôi giúp bạn.
letter	thư; chữ cái	Tôi viết một lá thư.
library	thư viện	Thư viện mở cửa lúc chín giờ.
lie1	nằm	Hãy nằm trên giường.
life	cuộc sống	Cuộc sống ở thành phố sôi động.
like (similar)	giống; như	Cái này giống một trò chơi.
like (find sb/sth pleasant)	thích	Tôi thích bài hát này.
line	hàng; đường kẻ	Hãy đứng trong hàng.
lion	con sư tử	Con sư tử đang ngủ.
list	danh sách	Hãy lập danh sách mua sắm.
listen	nghe; lắng nghe	Hãy nghe giáo viên.
little	nhỏ; ít	Tôi có ít tiền.
live1	sống	Tôi sống gần trường.
local	địa phương	Đây là một cửa hàng địa phương.
long1	dài	Con đường dài.
look	nhìn; trông	Hãy nhìn bức tranh.
lose	mất	Đừng làm mất vé.
lot	nhiều	Tôi có nhiều bài tập về nhà.
love	tình yêu; yêu	Tôi yêu gia đình mình.
lunch	bữa trưa	Bữa trưa đã sẵn sàng.`;

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
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad VI example punctuation for ${sourceHeadword}`);
    }
    if (!LATIN_RE.test(display) || !LATIN_RE.test(example)) {
      throw new Error(`Bad VI Latin-script shape for ${sourceHeadword}`);
    }
    if (!VI_MARK_RE.test(display) || !VI_MARK_RE.test(example)) {
      throw new Error(`Bad VI tone-mark/native orthography shape for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate VI translation key: ${sourceHeadword}`);
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
    reviewer: "codex_oxford_part002_support_translation_batch_vi_v1",
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
    "- Script-aware validation: VI native Latin orthography with Vietnamese tone marks in display and example cells",
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
