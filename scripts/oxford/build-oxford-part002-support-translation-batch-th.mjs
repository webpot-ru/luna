#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "TH";
const BATCH_ID = "th_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-th.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;
const THAI_RE = /[\u0E00-\u0E7F]/u;
const THAI_TOKENIZATION_SPACE_RE = /[\u0E00-\u0E7F]\s+[\u0E00-\u0E7F]/u;

const TH_TRANSLATIONS_TSV = `source_headword	TH	example_TH
clothes	เสื้อผ้า	เสื้อผ้าของฉันสะอาด.
club	ชมรม	เธอไปชมรมดนตรี.
coat	เสื้อโค้ต	เสื้อโค้ตของฉันอุ่น.
coffee	กาแฟ	ฉันดื่มกาแฟตอนเช้า.
cold	เย็น;หนาว	น้ำเย็น.
college	วิทยาลัย;มหาวิทยาลัย	พี่สาวของฉันเรียนที่มหาวิทยาลัย.
colour	สี	สีโปรดของฉันคือสีน้ำเงิน.
come	มา	กรุณามาที่นี่.
common	พบได้ทั่วไป	ชื่อนี้พบได้ทั่วไป.
company	บริษัท	แม่ของฉันทำงานที่บริษัท.
compare	เปรียบเทียบ	เปรียบเทียบรูปสองรูปนี้.
complete	ครบถ้วน;ทำให้เสร็จ	แบบฟอร์มครบถ้วนแล้ว.
computer	คอมพิวเตอร์	คอมพิวเตอร์เครื่องนี้ใหม่.
concert	คอนเสิร์ต	คืนนี้เราไปคอนเสิร์ต.
conversation	บทสนทนา	เรามีบทสนทนาสั้นๆ.
cook	ทำอาหาร;พ่อครัว	ฉันทำอาหารเย็นที่บ้าน.
cooking	การทำอาหาร	ฉันชอบทำอาหารกับพ่อ.
cool	เย็นสบาย;เท่	ห้องนี้เย็นสบาย.
correct	ถูกต้อง;แก้ไข	คำตอบของคุณถูกต้อง.
cost	ราคา;มีค่าใช้จ่าย	สิ่งนี้ราคาเท่าไร?
could modal	สามารถ;อาจจะ	ฉันสามารถช่วยคุณได้.
country	ประเทศ	แคนาดาเป็นประเทศใหญ่.
course	หลักสูตร	ฉันเรียนหลักสูตรภาษาอังกฤษ.
cousin	ลูกพี่ลูกน้อง	ลูกพี่ลูกน้องของฉันอยู่ใกล้ๆ.
cow	วัว	วัวกินหญ้า.
cream	ครีม	ฉันใส่ครีมในกาแฟ.
create	สร้าง	พวกเขาสร้างเกมใหม่.
culture	วัฒนธรรม	เราเรียนวัฒนธรรมท้องถิ่น.
cup	ถ้วย;แก้ว	ถ้วยใบนี้ว่าง.
customer	ลูกค้า	ลูกค้าถามคำถาม.
cut	ตัด	ตัดแอปเปิลครึ่งหนึ่ง.
dad	พ่อ	พ่อกำลังทำงาน.
dance	เต้น;การเต้น	เราเต้นหลังอาหารเย็น.
dancer	นักเต้น	นักเต้นเคลื่อนไหวเร็ว.
dancing	การเต้น	การเต้นสนุก.
dangerous	อันตราย	ถนนนี้อันตราย.
dark	มืด;สีเข้ม	ห้องมืด.
date	วันที่	วันนี้วันที่เท่าไร?
daughter	ลูกสาว	ลูกสาวของเธออายุหกขวบ.
day	วัน	ขอให้วันนี้เป็นวันที่ดี.
dear	ที่รัก	เพื่อนที่รักขอบคุณ.
December	ธันวาคม	วันเกิดของฉันอยู่ในเดือนธันวาคม.
decide	ตัดสินใจ	กรุณาตัดสินใจตอนนี้.
delicious	อร่อย	ซุปนี้อร่อย.
describe	อธิบาย;บรรยาย	อธิบายห้องของคุณ.
description	คำอธิบาย	อ่านคำอธิบายสั้นๆ.
design	ออกแบบ;การออกแบบ	ฉันทำการออกแบบง่ายๆสำหรับบัตร.
desk	โต๊ะทำงาน	หนังสืออยู่บนโต๊ะทำงานของฉัน.
detail	รายละเอียด	ขาดรายละเอียดหนึ่งอย่าง.
dialogue	บทสนทนา	อ่านบทสนทนานี้ตอนนี้.
dictionary	พจนานุกรม	ใช้พจนานุกรมในชั้นเรียน.
die	ตาย	ดอกไม้ตายถ้าไม่มีน้ำ.
diet	อาหาร;รูปแบบการกิน	อาหารของฉันมีผลไม้.
difference	ความแตกต่าง	มีความแตกต่างหนึ่งอย่าง.
different	แตกต่าง	เรามีชื่อต่างกัน.
difficult	ยาก	คำถามนี้ยาก.
dinner	อาหารเย็น	อาหารเย็นพร้อมแล้ว.
dirty	สกปรก	รองเท้าของฉันสกปรก.
discuss	อภิปราย;พูดคุย	เราพูดคุยเรื่องแผน.
dish	จาน;อาหาร	จานนี้ร้อน.
do1	ทำ	คุณกำลังทำอะไร?
doctor	หมอ	หมอยุ่ง.
dog	สุนัข	สุนัขวิ่งอยู่ข้างนอก.
dollar	ดอลลาร์	สิ่งนี้ราคาหนึ่งดอลลาร์.
door	ประตู	กรุณาปิดประตู.
down	ลง;ข้างล่าง	นั่งลงตรงนี้.
downstairs	ชั้นล่าง	ครัวอยู่ชั้นล่าง.
draw	วาด	วาดบ้านหลังเล็ก.
dress	ชุดกระโปรง;แต่งตัว	เธอสวมชุดกระโปรงสีแดง.
drink	เครื่องดื่ม;ดื่ม	ฉันดื่มน้ำ.
drive	ขับรถ	ฉันขับรถไปทำงาน.
driver	คนขับ	คนขับหยุดตรงนี้.
during	ระหว่าง	ฉันนอนระหว่างเที่ยวบิน.
DVD	ดีวีดี	ดีวีดีแผ่นนี้เก่า.
each	แต่ละ	เด็กแต่ละคนมีหนังสือ.
ear	หู	หูของฉันเจ็บ.
early	เช้า;เร็ว	ฉันตื่นเช้า.
east	ทิศตะวันออก	ดวงอาทิตย์ขึ้นทางทิศตะวันออก.
easy	ง่าย	แบบทดสอบนี้ง่าย.
eat	กิน	เรากินอาหารกลางวันด้วยกัน.
egg	ไข่	ฉันกินไข่หนึ่งฟอง.
eight	แปด	ฉันมีบัตรแปดใบ.
eighteen	สิบแปด	เธออายุสิบแปดปี.
eighty	แปดสิบ	ปู่ของฉันอายุแปดสิบปี.
elephant	ช้าง	ช้างตัวใหญ่.
eleven	สิบเอ็ด	ชั้นเรียนเริ่มตอนสิบเอ็ดโมง.
else	อื่น;อีก	คุณต้องการอะไรอีก?
email	อีเมล	ส่งอีเมลถึงฉัน.
end	จบ;ปลาย	นี่คือจุดจบ.
enjoy	เพลิดเพลิน;ชอบ	ฉันชอบเพลงนี้.
enough	พอ	เรามีเวลาพอ.
euro	ยูโร	สิ่งนี้ราคาหนึ่งยูโร.
even	แม้แต่	แม้แต่น้องชายของฉันก็รู้.
evening	ตอนเย็น	เจอกันคืนนี้.
event	งาน;เหตุการณ์	งานเริ่มวันนี้.
ever	เคย	คุณเคยทำอาหารไหม?
every	ทุก	ฉันเรียนทุกวัน.
everybody	ทุกคน	ทุกคนอยู่ที่นี่.
everyone	ทุกคน	ทุกคนชอบดนตรี.
everything	ทุกอย่าง	ทุกอย่างพร้อมแล้ว.
exam	การสอบ	การสอบจะเริ่มเร็วๆนี้.
example	ตัวอย่าง	นี่เป็นตัวอย่างที่ดี.
excited	ตื่นเต้น	วันนี้ฉันตื่นเต้น.
exciting	น่าตื่นเต้น	เกมนี้น่าตื่นเต้น.
exercise	การออกกำลังกาย;แบบฝึกหัด	ฉันออกกำลังกายก่อนอาหารเช้า.
expensive	แพง	เสื้อโค้ตตัวนี้แพง.
explain	อธิบาย	กรุณาอธิบายคำนี้.
extra	พิเศษ;เพิ่ม	ฉันต้องการเวลาเพิ่ม.
eye	ตา	ตาของฉันแดง.
face	หน้า	ล้างหน้า.
fact	ข้อเท็จจริง	ข้อเท็จจริงนี้สำคัญ.
fall	ตก;ฤดูใบไม้ร่วง	ใบไม้ตกในฤดูใบไม้ร่วง.
false	ผิด;เท็จ	คำตอบนี้ผิด.
family	ครอบครัว	ครอบครัวของฉันเล็ก.
famous	มีชื่อเสียง	เธอเป็นนักร้องที่มีชื่อเสียง.
fantastic	ยอดเยี่ยม	คอนเสิร์ตยอดเยี่ยม.
far	ไกล	โรงเรียนอยู่ไกล.
farm	ฟาร์ม	พวกเขาอยู่ที่ฟาร์ม.
farmer	ชาวนา;เกษตรกร	เกษตรกรปลูกอาหาร.
fast	เร็ว	รถไฟขบวนนี้เร็ว.
fat	อ้วน	แมวตัวนั้นอ้วน.
father	พ่อ	พ่อของฉันสูง.
favourite	ที่ชอบที่สุด	นี่คือเพลงที่ฉันชอบที่สุด.
February	กุมภาพันธ์	ที่นี่หนาวในเดือนกุมภาพันธ์.
feel	รู้สึก	ฉันรู้สึกมีความสุข.
feeling	ความรู้สึก	ฉันเข้าใจความรู้สึกนั้น.
festival	เทศกาล	เทศกาลเริ่มพรุ่งนี้.
few	ไม่กี่;น้อย	มีนักเรียนน้อยที่นี่.
fifteen	สิบห้า	ฉันอายุสิบห้าปี.
fifth	ที่ห้า	นี่คือบทเรียนที่ห้า.
fifty	ห้าสิบ	แม่ของฉันอายุห้าสิบปี.
fill	เติม;กรอก	เติมน้ำในถ้วย.
film	ภาพยนตร์	เราดูภาพยนตร์.
final	สุดท้าย	นี่คือคำถามสุดท้าย.
find	พบ;หาเจอ	ฉันพบกุญแจ.
fine	สบายดี;ดี	ตอนนี้ฉันสบายดี.
finish	ทำเสร็จ;จบ	ทำการบ้านให้เสร็จ.
fire	ไฟ;เพลิง	ไฟร้อน.
first	แรก;ที่หนึ่ง	เธออยู่คนแรกในแถว.
fish	ปลา	ฉันกินปลาเป็นอาหารเย็น.
five	ห้า	ฉันมีหนังสือห้าเล่ม.
flat	อพาร์ตเมนต์	อพาร์ตเมนต์ของฉันเล็ก.
flight	เที่ยวบิน	เที่ยวบินล่าช้า.
floor	พื้น;ชั้น	กระเป๋าอยู่บนพื้น.
flower	ดอกไม้	ดอกไม้นี้สีเหลือง.
fly	บิน	นกบินบนท้องฟ้า.
follow	ตาม	ตามฉันมา.
food	อาหาร	อาหารพร้อมแล้ว.
foot	เท้า	เท้าของฉันเจ็บ.
football	ฟุตบอล	วันนี้เราเล่นฟุตบอล.
for	เพื่อ;สำหรับ	ของขวัญนี้สำหรับคุณ.
forget	ลืม	อย่าลืมกุญแจ.
form	แบบฟอร์ม;รูปแบบ	กรอกแบบฟอร์ม.
forty	สี่สิบ	พ่อของฉันอายุสี่สิบปี.
four	สี่	ฉันเห็นนกสี่ตัว.
fourteen	สิบสี่	เธออายุสิบสี่ปี.
fourth	ที่สี่	นี่คือชั้นที่สี่.
free	ฟรี;ว่าง	ตั๋วฟรี.
Friday	วันศุกร์	เจอกันวันศุกร์.
friend	เพื่อน	เพื่อนของฉันอยู่ที่นี่.
friendly	เป็นมิตร	ครูเป็นมิตร.
from	จาก	ฉันมาจากที่นี่.
front	ด้านหน้า	มันอยู่ด้านหน้า.
fruit	ผลไม้	ฉันกินผลไม้ทุกวัน.
full	เต็ม;อิ่ม	ขวดเต็ม.
fun	ความสนุก;สนุก	เกมนี้สนุก.
funny	ตลก	ภาพยนตร์เรื่องนี้ตลก.
future	อนาคต	คิดถึงอนาคตของคุณ.
game	เกม	เกมเริ่มตอนนี้.
garden	สวน	สวนสวย.
geography	ภูมิศาสตร์	ฉันเรียนภูมิศาสตร์ที่โรงเรียน.
get	ได้;มาถึง	ฉันถึงบ้านตอนหกโมง.
girl	เด็กผู้หญิง	เด็กผู้หญิงยิ้ม.
girlfriend	แฟนสาว	แฟนสาวของเขาใจดี.
give	ให้	ให้หนังสือฉัน.
glass	แก้ว;กระจก	ฉันดื่มน้ำจากแก้ว.
go	ไป	ตอนนี้เรากลับบ้าน.
good	ดี	กาแฟนี้ดี.
goodbye	ลาก่อน	ลาก่อนเจอกันพรุ่งนี้.
grandfather	ปู่;ตา	ปู่ของฉันแก่.
grandmother	ย่า;ยาย	ยายของฉันทำซุป.
grandparent	ปู่ย่าตายาย	ปู่ย่าตายายคนหนึ่งอยู่กับเรา.
great	ยอดเยี่ยม;ใหญ่	นี่เป็นความคิดที่ยอดเยี่ยม.
green	สีเขียว	ประตูสีเขียว.
grey	สีเทา	ท้องฟ้าสีเทา.
group	กลุ่ม	ทำงานในกลุ่มเล็ก.
grow	เติบโต;ปลูก	พืชเติบโตในสวน.
guess	เดา	เดาคำตอบ.
guitar	กีตาร์	เขาเล่นกีตาร์.
gym	ยิม;โรงยิม	ฉันไปยิม.
hair	ผม	เธอมีผมยาว.
half	ครึ่ง	ตัดเค้กครึ่งหนึ่ง.
hand	มือ	ยกมือขึ้น.
happen	เกิดขึ้น	อะไรจะเกิดขึ้นต่อไป?
happy	มีความสุข	วันนี้ฉันมีความสุข.
hard	แข็ง;ยาก	เก้าอี้ตัวนี้แข็ง.
hat	หมวก	หมวกของฉันสีดำ.
hate	เกลียด	ฉันเกลียดชาเย็น.
have	มี	ฉันมีรถ.
have to modal	ต้อง	ฉันต้องเรียน.
he	เขา	เขาเป็นพี่ชายของฉัน.
head	หัว	หัวของฉันเจ็บ.
health	สุขภาพ	อาหารดีช่วยสุขภาพ.
healthy	ดีต่อสุขภาพ	อาหารจานนี้ดีต่อสุขภาพ.
hear	ได้ยิน	ฉันได้ยินดนตรี.
hello	สวัสดี	สวัสดียินดีที่ได้พบคุณ.
help	ช่วย;ความช่วยเหลือ	ช่วยฉันด้วย.
her	ของเธอ;เธอ	นี่คือกระเป๋าของเธอ.
here	ที่นี่	มาตรงนี้ตอนนี้.
hey	เฮ้;นี่	เฮ้รอฉันด้วย.
hi	สวัสดี	สวัสดีคุณสบายดีไหม?
high	สูง	กำแพงสูง.
him	เขา	ฉันรู้จักเขา.
his	ของเขา	เสื้อโค้ตของเขาสีน้ำเงิน.
history	ประวัติศาสตร์	ฉันเรียนประวัติศาสตร์.
hobby	งานอดิเรก	การอ่านเป็นงานอดิเรกของฉัน.
holiday	วันหยุด	เราไปเที่ยววันหยุดในเดือนกรกฎาคม.
home	บ้าน	ฉันอยู่บ้าน.
homework	การบ้าน	ทำการบ้านคืนนี้.
hope	หวัง	ฉันหวังว่าคุณจะมา.
horse	ม้า	ม้าวิ่งเร็ว.
hospital	โรงพยาบาล	โรงพยาบาลอยู่ใกล้.
hot	ร้อน	ซุปร้อน.
hotel	โรงแรม	โรงแรมสะอาด.
hour	ชั่วโมง	รอหนึ่งชั่วโมง.
house	บ้าน	บ้านหลังนี้เก่า.
how	อย่างไร	คุณสบายดีไหม?
however	อย่างไรก็ตาม	อย่างไรก็ตามฉันอยู่ที่นี่ได้.
hundred	หนึ่งร้อย	มีคนมาหนึ่งร้อยคน.
hungry	หิว	ฉันหิว.
husband	สามี	สามีของเธอเป็นหมอ.
I	ฉัน	ฉันชอบชา.
ice	น้ำแข็ง	น้ำแข็งเย็น.
ice cream	ไอศกรีม	ฉันอยากได้ไอศกรีม.
idea	ความคิด	นี่เป็นความคิดที่ดี.
if	ถ้า	โทรหาฉันถ้าคุณต้องการความช่วยเหลือ.
imagine	จินตนาการ	จินตนาการถึงบ้านหลังเล็ก.
important	สำคัญ	ชั้นเรียนนี้สำคัญ.
improve	ปรับปรุง;พัฒนา	ฉันอยากพัฒนา.
in	ใน	กุญแจอยู่ในกระเป๋าของฉัน.
include	รวม	ใส่ชื่อของคุณด้วย.
information	ข้อมูล	ฉันต้องการข้อมูลเพิ่ม.
interest	ความสนใจ	เธอสนใจศิลปะ.
interested	สนใจ	ฉันสนใจดนตรี.
interesting	น่าสนใจ	หนังสือเล่มนี้น่าสนใจ.
internet	อินเทอร์เน็ต	อินเทอร์เน็ตช้า.
interview	การสัมภาษณ์	วันนี้ฉันมีการสัมภาษณ์.
into	เข้าไปใน	ใส่หนังสือลงในกระเป๋า.
introduce	แนะนำ	แนะนำเพื่อนของคุณ.
island	เกาะ	เกาะนี้เล็ก.
it	มัน	อากาศหนาว.
its	ของมัน	สุนัขชอบเตียงของมัน.
jacket	แจ็กเก็ต	แจ็กเก็ตของฉันใหม่.
January	มกราคม	มกราคมเป็นเดือนแรก.
jeans	กางเกงยีนส์	กางเกงยีนส์ของฉันสีน้ำเงิน.
job	งาน	ฉันต้องการงานใหม่.
join	เข้าร่วม	เข้าร่วมชั้นเรียนของเราวันนี้.
journey	การเดินทาง	การเดินทางยาว.
juice	น้ำผลไม้	ฉันดื่มน้ำส้ม.
July	กรกฎาคม	เราเดินทางในเดือนกรกฎาคม.
June	มิถุนายน	โรงเรียนจบในเดือนมิถุนายน.
just	แค่;เพิ่ง	ฉันแค่ต้องการน้ำ.
keep	เก็บ;รักษา	เก็บกุญแจนี้ไว้.
key	กุญแจ	ฉันทำกุญแจหาย.
kilometre	กิโลเมตร	เดินหนึ่งกิโลเมตร.
kind (type)	ชนิด;ประเภท	คุณชอบดนตรีประเภทไหน?
kitchen	ครัว	ครัวสะอาด.
know	รู้	ฉันรู้คำตอบ.
land	แผ่นดิน;ที่ดิน	เครื่องบินอยู่บนพื้นดิน.
language	ภาษา	ภาษาอังกฤษเป็นภาษา.
large	ใหญ่	ห้องนี้ใหญ่.
last1 (final)	สุดท้าย	นี่คือหน้าสุดท้าย.
late	สาย;ช้า	รถบัสมาสาย.
later	ทีหลัง	เจอกันทีหลัง.
laugh	หัวเราะ	เราหัวเราะด้วยกัน.
learn	เรียนรู้	ฉันเรียนภาษาอังกฤษ.
leave	ออกจาก;ทิ้งไว้	ตอนนี้ฉันออกจากบ้าน.
left	ซ้าย	เลี้ยวซ้ายตรงนี้.
leg	ขา	ขาของฉันเจ็บ.
lesson	บทเรียน	บทเรียนเริ่มตอนนี้.
let	ให้;อนุญาต	ให้ฉันช่วยคุณ.
letter	จดหมาย;ตัวอักษร	ฉันเขียนจดหมาย.
library	ห้องสมุด	ห้องสมุดเปิดตอนเก้าโมง.
lie1	นอน	นอนบนเตียง.
life	ชีวิต	ชีวิตในเมืองคึกคัก.
like (similar)	เหมือน;คล้าย	นี่เหมือนเกม.
like (find sb/sth pleasant)	ชอบ	ฉันชอบเพลงนี้.
line	แถว;เส้น	ยืนในแถว.
lion	สิงโต	สิงโตกำลังนอน.
list	รายการ	ทำรายการซื้อของ.
listen	ฟัง	ฟังครู.
little	เล็ก;น้อย	ฉันมีเงินน้อย.
live1	อาศัย	ฉันอาศัยใกล้โรงเรียน.
local	ท้องถิ่น	นี่เป็นร้านท้องถิ่น.
long1	ยาว	ถนนยาว.
look	มอง;ดูเหมือน	มองรูปภาพ.
lose	สูญเสีย;ทำหาย	อย่าทำตั๋วหาย.
lot	มาก	ฉันมีการบ้านมาก.
love	ความรัก;รัก	ฉันรักครอบครัวของฉัน.
lunch	อาหารกลางวัน	อาหารกลางวันพร้อมแล้ว.`;

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
  const lines = TH_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tTH\texample_TH") {
    throw new Error("Unexpected TH translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad TH translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad TH translation row ${index + 2}: empty field`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad TH example punctuation for ${sourceHeadword}`);
    }
    if (!THAI_RE.test(display) || !THAI_RE.test(example)) {
      throw new Error(`Bad TH Thai-script shape for ${sourceHeadword}`);
    }
    if (THAI_TOKENIZATION_SPACE_RE.test(example)) {
      throw new Error(`Bad TH generated tokenization spaces in example for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate TH translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing TH translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`TH translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part002_support_translation_batch_th_v1",
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
    TH: translation.display,
    example_TH: translation.example,
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
    "- Script-aware validation: TH Thai-script display/example cells and no generated Thai tokenization spaces in examples",
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
