#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "TH";
const BATCH_ID = "th_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-th.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;
const THAI_RE = /[\u0E00-\u0E7F]/u;
const THAI_TOKENIZATION_SPACE_RE = /[\u0E00-\u0E7F]\s+[\u0E00-\u0E7F]/u;

const TH_TRANSLATIONS_TSV = `source_headword	TH	example_TH
machine	เครื่อง;เครื่องจักร	เครื่องนี้ชงกาแฟ.
magazine	นิตยสาร	เธออ่านนิตยสารดนตรี.
main	หลัก;สำคัญ	นี่คือประตูหลัก.
make	ทำ;เตรียม	ฉันทำอาหารกลางวันที่บ้าน.
man	ผู้ชาย	ผู้ชายคนนั้นเป็นครูของฉัน.
many	หลาย;มาก	มีนักเรียนหลายคนที่นี่.
map	แผนที่	ดูแผนที่นี้.
March	มีนาคม	วันเกิดของฉันอยู่เดือนมีนาคม.
market	ตลาด;ตลาดการเงิน	เราซื้อผลไม้ที่ตลาด.
married	แต่งงานแล้ว	พี่สาวของฉันแต่งงานแล้ว.
May	พฤษภาคม	โรงเรียนปิดเดือนพฤษภาคม.
maybe	บางที;อาจจะ	บางทีฝนอาจตก.
me	ฉัน;ผม	ช่วยฉันด้วย.
meal	มื้ออาหาร	มื้อนี้ร้อน.
mean	หมายความว่า	ป้ายนี้หมายความว่าอะไร?
meaning	ความหมาย	ความหมายคืออะไร?
meat	เนื้อสัตว์	ฉันกินเนื้อสัตว์มื้อเย็น.
meet	พบ;เจอ	เราเจอกันหลังเลิกเรียน.
meeting	การประชุม	การประชุมเริ่มตอนนี้.
member	สมาชิก	เธอเป็นสมาชิกชมรม.
menu	เมนู	อ่านเมนูก่อน.
message	ข้อความ	ฉันส่งข้อความสั้น.
metre	เมตร	เดินไปข้างหน้าหนึ่งเมตร.
midnight	เที่ยงคืน	รถไฟออกตอนเที่ยงคืน.
mile	ไมล์	เราเดินหนึ่งไมล์.
milk	นม	ฉันดื่มนมตอนเช้า.
million	ล้าน	มีคนหนึ่งล้านคนอยู่ที่นี่.
minute1	นาที	รอสักหนึ่งนาที.
miss	คิดถึง;พลาด	ฉันคิดถึงโรงเรียนเก่า.
mistake	ความผิดพลาด;ข้อผิดพลาด	คำตอบนี้มีข้อผิดพลาดหนึ่งข้อ.
model	แบบจำลอง;นางแบบ;นายแบบ	นี่เป็นแบบจำลองเล็ก.
modern	ทันสมัย	ครัวนี้ทันสมัย.
moment	ช่วงเวลา;สักครู่	รอสักครู่.
Monday	วันจันทร์	เราเริ่มงานวันจันทร์.
money	เงิน	ฉันต้องการเงินเล็กน้อย.
month	เดือน	มิถุนายนเป็นเดือนร้อน.
more	เพิ่ม;มากกว่า	ฉันต้องการเวลาเพิ่ม.
morning	ตอนเช้า	ฉันเรียนตอนเช้า.
most	ส่วนใหญ่;มากที่สุด	นักเรียนส่วนใหญ่ชอบดนตรี.
mother	แม่	แม่ของฉันทำงานวันนี้.
mountain	ภูเขา	ภูเขานั้นสูงมาก.
mouse	หนู	มีหนูอยู่ใต้เก้าอี้.
mouth	ปาก	เปิดปากของคุณ.
move	ย้าย;เคลื่อนที่	ย้ายเก้าอี้มาที่นี่.
movie	ภาพยนตร์	เราดูภาพยนตร์คืนนี้.
much	มาก;เท่าไร	ของนี้ราคาเท่าไร?
mum	แม่	แม่อยู่ที่บ้าน.
museum	พิพิธภัณฑ์	พิพิธภัณฑ์เปิดสิบโมง.
music	ดนตรี	ฉันฟังดนตรี.
must modal	ต้อง	คุณต้องหยุดตรงนี้.
my	ของฉัน	นี่คือหนังสือของฉัน.
name	ชื่อ;ตั้งชื่อ	เขียนชื่อของคุณที่นี่.
natural	ธรรมชาติ;เป็นธรรมชาติ	น้ำผลไม้นี้เป็นธรรมชาติ.
near	ใกล้	ธนาคารอยู่ใกล้ที่นี่.
need	ต้องการ;จำเป็น	ฉันต้องการปากกา.
negative	เชิงลบ;ปฏิเสธ	คำตอบนี้เป็นคำปฏิเสธ.
neighbour	เพื่อนบ้าน	เพื่อนบ้านของฉันเป็นมิตร.
never	ไม่เคย	ฉันไม่เคยดื่มกาแฟ.
new	ใหม่	โทรศัพท์นี้ใหม่.
news	ข่าว	ข่าววันนี้ดี.
newspaper	หนังสือพิมพ์	เขาอ่านหนังสือพิมพ์.
next	ถัดไป;ต่อไป	รถบัสคันถัดไปมาช้า.
next to	ข้าง;ติดกับ	นั่งข้างฉัน.
nice	ดี;น่าพอใจ	ห้องนี้น่าอยู่.
night	กลางคืน	ฉันนอนตอนกลางคืน.
nine	เก้า	มีนักเรียนเก้าคนที่นี่.
nineteen	สิบเก้า	เธออายุสิบเก้าปี.
ninety	เก้าสิบ	ปู่ของฉันอายุเก้าสิบปี.
no	ไม่;ไม่มี	ไม่ขอบคุณ.
no one	ไม่มีใคร	ไม่มีใครอยู่ในห้อง.
nobody	ไม่มีใคร	ไม่มีใครอยู่บ้าน.
north	ทิศเหนือ	สถานีอยู่ทางเหนือ.
nose	จมูก	จมูกของฉันเย็น.
not	ไม่	ฉันไม่เหนื่อย.
note	บันทึก;โน้ต	เขียนบันทึกตอนนี้.
nothing	ไม่มีอะไร	ไม่มีอะไรอยู่ในกล่อง.
November	พฤศจิกายน	คอร์สของฉันเริ่มเดือนพฤศจิกายน.
now	ตอนนี้	มาที่นี่ตอนนี้.
number	เลข;หมายเลข	เขียนหมายเลขที่นี่.
nurse	พยาบาล	พยาบาลใจดี.
object	วัตถุ;สิ่งของ	วางสิ่งของบนโต๊ะ.
o’clock	โมง	ชั้นเรียนเริ่มเก้าโมง.
October	ตุลาคม	เราเดินทางเดือนตุลาคม.
of	ของ;แห่ง	นี่คือชาหนึ่งถ้วย.
off	ปิด;ออก	ปิดไฟ.
office	สำนักงาน;ออฟฟิศ	ออฟฟิศของฉันเล็ก.
often	บ่อย	ฉันเดินไปโรงเรียนบ่อย.
oh	โอ้	โอ้ฉันเข้าใจแล้ว.
OK	โอเค	แบบนี้โอเคไหม?
old	เก่า;แก่	บ้านหลังนี้เก่า.
on	บน;เปิดอยู่	หนังสืออยู่บนโต๊ะ.
once	ครั้งหนึ่ง;หนึ่งครั้ง	ฉันโทรสัปดาห์ละครั้ง.
one	หนึ่ง	ฉันมีพี่สาวหนึ่งคน.
onion	หัวหอม	หั่นหัวหอมหนึ่งหัว.
online	ออนไลน์	ฉันเรียนออนไลน์.
only	เท่านั้น;แค่	ฉันมีกระเป๋าแค่ใบเดียว.
open	เปิด;เปิดอยู่	เปิดหน้าต่าง.
opinion	ความคิดเห็น	ความคิดเห็นของคุณคืออะไร?
opposite	ตรงข้าม;ด้านตรงข้าม	ร้านอยู่ตรงข้ามธนาคาร.
or	หรือ	ชาหรือกาแฟ?
orange	ส้ม;สีส้ม	ส้มลูกนี้หวาน.
order	สั่ง;คำสั่ง	ฉันสั่งซุป.
other	อื่น;อีก	ใช้ประตูอีกบาน.
our	ของเรา	นี่คือห้องเรียนของเรา.
out	ออก;ข้างนอก	ออกไปข้างนอกหลังอาหารกลางวัน.
outside	ข้างนอก	เด็กๆเล่นข้างนอก.
over	เหนือ;ข้าม	เครื่องบินบินเหนือเมือง.
own	ของตนเอง;เป็นเจ้าของ	ฉันมีห้องของตัวเอง.
page	หน้า	เปิดหน้าสิบ.
paint	ทาสี;วาดภาพ	ทาสีกำแพงเป็นสีฟ้า.
painting	ภาพวาด;การวาดภาพ	ภาพวาดนี้สวย.
pair	คู่	ฉันต้องการถุงเท้าหนึ่งคู่.
paper	กระดาษ	เขียนบนกระดาษนี้.
paragraph	ย่อหน้า	อ่านย่อหน้าแรก.
parent	พ่อแม่;ผู้ปกครอง	ผู้ปกครองคนหนึ่งรอข้างนอก.
park	สวนสาธารณะ;จอดรถ	เราจอดรถใกล้สถานี.
part	ส่วน	ส่วนนี้ง่าย.
partner	คู่ทำงาน;คู่ร่วมงาน	ทำงานกับคู่ของคุณ.
party	งานเลี้ยง	งานเลี้ยงเริ่มหนึ่งทุ่ม.
passport	หนังสือเดินทาง	แสดงหนังสือเดินทางของคุณ.
past	อดีต;ผ่านไป	ตอนนี้หกโมงครึ่ง.
pay	จ่ายเงิน	ฉันจ่ายด้วยบัตร.
pen	ปากกา	ปากกานี้สีฟ้า.
pencil	ดินสอ	ฉันเขียนด้วยดินสอ.
people	ผู้คน;คน	มีคนหลายคนที่นี่.
pepper	พริกไทย	เติมพริกไทยในซุป.
perfect	สมบูรณ์แบบ	คำตอบของคุณสมบูรณ์แบบ.
period	ช่วงเวลา;คาบเรียน	คาบเรียนนี้สั้น.
person	คน	มีคนหนึ่งรออยู่.
personal	ส่วนตัว	นี่คือโทรศัพท์ส่วนตัวของฉัน.
phone	โทรศัพท์;โทร	โทรศัพท์ของฉันอยู่ในกระเป๋า.
photo	รูปถ่าย	ถ่ายรูปที่นี่.
photograph	รูปถ่าย;ถ่ายรูป	รูปถ่ายนี้เก่า.
phrase	วลี	พูดวลีนี้ซ้ำ.
piano	เปียโน	เธอเล่นเปียโน.
picture	รูปภาพ;ภาพ	ดูรูปภาพนี้.
piece	ชิ้น	เอาเค้กหนึ่งชิ้น.
pig	หมู	หมูอยู่ที่ฟาร์ม.
pink	สีชมพู	กระเป๋าของเธอสีชมพู.
place	สถานที่;วาง	สถานที่นี้เงียบ.
plan	แผน	เราต้องการแผน.
plane	เครื่องบิน	เครื่องบินมาช้า.
plant	ต้นไม้;ปลูก	รดน้ำต้นไม้วันนี้.
play	เล่น;ละคร	เด็กๆเล่นในสวน.
player	ผู้เล่น;นักกีฬา	ผู้เล่นวิ่งเร็ว.
please	กรุณา;ได้โปรด	กรุณานั่งที่นี่.
point	จุด;ประเด็น	ประเด็นนี้สำคัญ.
police	ตำรวจ	ตำรวจอยู่ข้างนอก.
policeman	ตำรวจชาย	ตำรวจชายช่วยเรา.
pool	สระว่ายน้ำ	สระว่ายน้ำเย็น.
poor	ยากจน;น่าสงสาร	เด็กยากจนหิว.
popular	เป็นที่นิยม	เพลงนี้เป็นที่นิยม.
positive	เชิงบวก	ผลลัพธ์นี้เป็นเชิงบวก.
possible	เป็นไปได้	วันนี้เป็นไปได้ไหม?
post	โพสต์;จดหมาย	ฉันอ่านข้อความโพสต์ออนไลน์.
potato	มันฝรั่ง	ฉันกินมันฝรั่งหนึ่งหัว.
pound	ปอนด์	ของนี้ราคาหนึ่งปอนด์.
practice	การฝึกฝน	การฝึกฝนช่วยได้ทุกวัน.
practise	ฝึก	ฉันฝึกภาษาอังกฤษทุกวัน.
prefer	ชอบมากกว่า	ฉันชอบชามากกว่า.
prepare	เตรียม	เตรียมกระเป๋าของคุณคืนนี้.
present	อยู่;ปัจจุบัน	เธอมาเรียนวันนี้.
pretty	สวย;ค่อนข้าง	สวนนี้สวย.
price	ราคา	ราคาต่ำ.
probably	น่าจะ;อาจจะ	เธอน่าจะรู้.
problem	ปัญหา	ปัญหานี้เล็ก.
product	ผลิตภัณฑ์	ผลิตภัณฑ์นี้ใหม่.
programme	รายการ;โปรแกรม	รายการเริ่มตอนนี้.
project	โครงการ;โปรเจกต์	โครงการของเราพร้อมแล้ว.
purple	สีม่วง	เสื้อเชิ้ตสีม่วง.
put	วาง	วางหนังสือที่นี่.
quarter	หนึ่งในสี่;สิบห้านาที	ตอนนี้บ่ายสองโมงสิบห้านาที.
question	คำถาม	ถามคำถามหนึ่งข้อ.
quick	เร็ว;สั้น	นี่เป็นแบบทดสอบสั้น.
quickly	อย่างรวดเร็ว	ไปเร็วๆ.
quiet	เงียบ	ห้องสมุดเงียบ.
quite	ค่อนข้าง	ห้องนี้ค่อนข้างเล็ก.
radio	วิทยุ	วิทยุดังมาก.
rain	ฝน;ฝนตก	ฝนเริ่มตกแล้ว.
read	อ่าน	อ่านประโยคนี้.
reader	ผู้อ่าน	ผู้อ่านชอบเรื่องนี้.
reading	การอ่าน	การอ่านช่วยให้ฉันเรียนรู้.
ready	พร้อม	อาหารเย็นพร้อมแล้ว.
real	จริง	มีปัญหาจริง.
really	จริงๆ	ฉันชอบเพลงนี้จริงๆ.
reason	เหตุผล	บอกเหตุผลให้ฉัน.
red	สีแดง	ประตูสีแดง.
relax	ผ่อนคลาย	ผ่อนคลายหลังเลิกงาน.
remember	จำ	จำหนังสือเดินทางของคุณ.
repeat	ทำซ้ำ;พูดซ้ำ	พูดประโยคนี้ซ้ำ.
report	รายงาน	อ่านรายงานคืนนี้.
restaurant	ร้านอาหาร	ร้านอาหารคนเยอะ.
result	ผลลัพธ์	ผลลัพธ์ดี.
return	กลับ;คืน	คืนหนังสือพรุ่งนี้.
rice	ข้าว	ฉันกินข้าวมื้อกลางวัน.
rich	รวย	เมืองนี้ร่ำรวย.
ride	ขี่;นั่ง	ฉันขี่จักรยาน.
right	ขวา;ถูก	เลี้ยวขวาที่นี่.
river	แม่น้ำ	แม่น้ำกว้าง.
road	ถนน	ถนนนี้ยาว.
room	ห้อง	ห้องของฉันสะอาด.
routine	กิจวัตร;ประจำ	กิจวัตรของฉันเริ่มเช้า.
rule	กฎ	กฎนี้ง่าย.
run	วิ่ง	ฉันวิ่งทุกเช้า.
sad	เศร้า	วันนี้เขาเศร้า.
salad	สลัด	สลัดนี้สด.
salt	เกลือ	เติมเกลือนิดหน่อย.
same	เหมือนกัน;เดียวกัน	เรามีกระเป๋าเหมือนกัน.
sandwich	แซนด์วิช	ฉันกินแซนด์วิชหนึ่งชิ้น.
Saturday	วันเสาร์	เราเจอกันวันเสาร์.
say	พูด	พูดชื่อของคุณ.
school	โรงเรียน	โรงเรียนของฉันอยู่ใกล้.
science	วิทยาศาสตร์	ฉันเรียนวิทยาศาสตร์.
scientist	นักวิทยาศาสตร์	นักวิทยาศาสตร์ถามคำถาม.
sea	ทะเล	ทะเลสีฟ้า.
second1 (unit of time)	วินาที	รอสักหนึ่งวินาที.
section	ส่วน;หมวด	อ่านส่วนนี้.
see	เห็น;พบ	ฉันเห็นเพื่อนของฉัน.
sell	ขาย	พวกเขาขายผลไม้สด.
send	ส่ง	ส่งข้อความตอนนี้.
sentence	ประโยค	เขียนประโยคหนึ่งประโยค.
September	กันยายน	โรงเรียนเริ่มเดือนกันยายน.
seven	เจ็ด	มีคนเจ็ดคนที่นี่.
seventeen	สิบเจ็ด	เขาอายุสิบเจ็ดปี.
seventy	เจ็ดสิบ	ย่าของฉันอายุเจ็ดสิบปี.
share	แบ่งปัน;แบ่ง	แบ่งเค้ก.
she	เธอ	เธอเป็นพี่สาวของฉัน.
sheep	แกะ	แกะกินหญ้า.
shirt	เสื้อเชิ้ต	เสื้อเชิ้ตของเขาสะอาด.
shoe	รองเท้า	รองเท้าข้างหนึ่งอยู่ใต้เตียง.
shop	ร้านค้า;ซื้อของ	ร้านค้าปิดเร็ว.
shopping	การซื้อของ	การซื้อของวันนี้สนุก.
short	สั้น	เรื่องนี้สั้น.
should modal	ควร	คุณควรพักวันนี้.
show	แสดง;รายการ	แสดงตั๋วของคุณให้ฉัน.
shower	ฝักบัว;อาบน้ำ	ฉันอาบน้ำฝักบัว.
sick	ป่วย	วันนี้ฉันรู้สึกป่วย.
similar	คล้ายกัน	กระเป๋าของเราคล้ายกัน.
sing	ร้องเพลง	ฉันร้องเพลงในชั้นเรียน.
singer	นักร้อง	นักร้องคนนั้นมีชื่อเสียง.
sister	พี่สาว;น้องสาว	น้องสาวของฉันยังเด็ก.
sit	นั่ง	นั่งใกล้หน้าต่าง.
situation	สถานการณ์	สถานการณ์นี้ใหม่.
six	หก	มีหนังสือหกเล่มที่นี่.
sixteen	สิบหก	เธออายุสิบหกปี.
sixty	หกสิบ	พ่อของฉันอายุหกสิบปี.
skill	ทักษะ	ทักษะนี้มีประโยชน์.
skirt	กระโปรง	กระโปรงของเธอสีฟ้า.
sleep	นอน;การนอน	ฉันนอนแปดชั่วโมง.
slow	ช้า	รถบัสช้า.
small	เล็ก	ห้องนี้เล็ก.
snake	งู	งูตัวยาว.
snow	หิมะ;หิมะตก	หิมะตกในฤดูหนาว.
so	ดังนั้น;มาก	ฉันเหนื่อยดังนั้นฉันพัก.
some	บาง;เล็กน้อย	ฉันต้องการน้ำเล็กน้อย.
somebody	ใครบางคน	มีใครบางคนอยู่ที่ประตู.
someone	ใครบางคน	มีคนฝากข้อความไว้.
something	บางสิ่ง;อะไรบางอย่าง	ฉันต้องการอะไรบางอย่างดื่ม.
sometimes	บางครั้ง	ฉันเดินไปโรงเรียนบางครั้ง.
son	ลูกชาย	ลูกชายของเธออยู่ที่โรงเรียน.
song	เพลง	เพลงนี้ใหม่.
soon	เร็วๆนี้	พบกันเร็วๆนี้.
sorry	ขอโทษ	ฉันขอโทษ.
sound	เสียง;ฟังดู	เสียงดัง.
soup	ซุป	ซุปร้อน.
south	ทิศใต้	โรงแรมอยู่ทางใต้.
space	พื้นที่;ที่ว่าง	มีที่ว่างสำหรับเก้าอี้.
speak	พูด	กรุณาพูดช้าๆ.
special	พิเศษ	วันนี้เป็นวันพิเศษ.
spell	สะกด	สะกดชื่อของคุณ.
spelling	การสะกด	ตรวจการสะกดของคุณ.
spend	ใช้จ่าย;ใช้เวลา	ฉันใช้เงินซื้ออาหาร.
sport	กีฬา	ฟุตบอลเป็นกีฬายอดนิยม.
spring	ฤดูใบไม้ผลิ;กระโดด	ดอกไม้ขึ้นในฤดูใบไม้ผลิ.
stand	ยืน	ยืนใกล้ประตู.
star	ดาว	ฉันเห็นดาวสว่างหนึ่งดวง.
start	เริ่ม	เริ่มบทเรียนตอนนี้.
statement	ข้อความ;คำแถลง	ข้อความนี้ถูกต้อง.
station	สถานี	สถานีอยู่ใกล้.
stay	อยู่;พัก	อยู่บ้านวันนี้.
still	ยัง;นิ่ง	ฉันยังหิว.
stop	หยุด;ป้ายหยุด	หยุดที่มุมถนน.
story	เรื่องราว	เล่าเรื่องให้ฉันฟัง.
street	ถนน	ถนนนี้เงียบ.
strong	แข็งแรง	เขาแข็งแรง.
student	นักเรียน;นักศึกษา	นักเรียนอ่านหนังสือ.
study	เรียน;การศึกษา	ฉันเรียนภาษาอังกฤษ.
style	สไตล์;รูปแบบ	ฉันชอบสไตล์นี้.
subject	วิชา;หัวข้อ	ภาษาอังกฤษเป็นวิชาหลักของฉัน.
success	ความสำเร็จ	ความสำเร็จต้องฝึกฝน.
sugar	น้ำตาล	ใส่น้ำตาลในชา.
summer	ฤดูร้อน	ที่นี่ร้อนในฤดูร้อน.
sun	ดวงอาทิตย์	ดวงอาทิตย์สว่าง.
Sunday	วันอาทิตย์	เราพักวันอาทิตย์.
supermarket	ซูเปอร์มาร์เก็ต	ซูเปอร์มาร์เก็ตเปิดอยู่.
sure	แน่ใจ	ฉันแน่ใจ.
sweater	เสื้อกันหนาว	เสื้อกันหนาวของฉันอุ่น.
swim	ว่ายน้ำ	ฉันว่ายน้ำทุกสัปดาห์.
swimming	การว่ายน้ำ	การว่ายน้ำเป็นการออกกำลังกายที่ดี.
table	โต๊ะ	กุญแจอยู่บนโต๊ะ.`;

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
      throw new Error(`Thai example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!THAI_RE.test(display) || !THAI_RE.test(example)) {
      throw new Error(`Thai display/example must contain Thai script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (THAI_TOKENIZATION_SPACE_RE.test(example)) {
      throw new Error(`Thai example contains generated tokenization spaces for ${sourceHeadword}: ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Thai translation row for ${sourceHeadword}`);
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
    "Generate MS support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after MS.",
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
    throw new Error("Usage: node scripts/oxford/build-oxford-part003-support-translation-batch-th.mjs --contract=<contract.json>");
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const outputPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_th_v1.jsonl";
  const summaryPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_th_v1_summary.md";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== "oxford_3000_core_a1_part_003_300_v1") {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(TH_TRANSLATIONS_TSV);

  if (rows.length !== 300) {
    throw new Error(`Expected 300 Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Thai translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Thai translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Thai
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: TH Thai-script display/example cells and no generated Thai tokenization spaces in examples
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
